"""Default STT -> LLM -> TTS voice pipeline builder."""
from __future__ import annotations
import os
import uuid
from models.stt.remote_whisper import RemoteWhisperSTTService
from character_prompt import LANGUAGE_LEARNING_PAL_PROMPT
from loguru import logger
from models.db import ConversationLogger, get_similar_summaries
from models.llm import create_llm_service
from models.stt import create_stt_service
from models.tts import create_tts_service
from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.audio.vad.vad_analyzer import VADParams
from pipecat.processors.aggregators.llm_context import LLMContext
from pipecat.processors.aggregators.llm_response_universal import (
    LLMContextAggregatorPair,
    LLMUserAggregatorParams,
    UserTurnMessageAddedMessage,
)
from pipecat.frames.frames import (
     Frame,
    LLMFullResponseEndFrame,
    LLMFullResponseStartFrame,
    LLMTextFrame,
    OutputTransportMessageFrame,
    TranscriptionFrame,
)
from pipecat.processors.frame_processor import FrameDirection, FrameProcessor

class LiveUserTranscriptProcessor(FrameProcessor):
    """Send user transcripts to the browser."""

    async def process_frame(self, frame: Frame, direction: FrameDirection):
        await super().process_frame(frame, direction)

        if (
            direction is FrameDirection.DOWNSTREAM
            and isinstance(frame, TranscriptionFrame)
            and frame.text.strip()
        ):
            message = {
                "type": "server",
                "msg": "TRANSCRIPT",
                "role": "user",
                "text": frame.text.strip(),
            }

            logger.info(
                "📤 USER TRANSCRIPT SENT TO BROWSER: {}",
                message,
            )

            await self.push_frame(
                OutputTransportMessageFrame(message=message),
                direction,
            )

        await self.push_frame(frame, direction)


class LiveAssistantTranscriptProcessor(FrameProcessor):
    """Send the assistant response to the browser while it is being generated."""

    def __init__(self):
        super().__init__()
        self._assistant_text = ""
        self._message_id = None

    async def process_frame(self, frame: Frame, direction: FrameDirection):
        await super().process_frame(frame, direction)

        if direction is FrameDirection.DOWNSTREAM:

            if isinstance(frame, LLMFullResponseStartFrame):
                self._assistant_text = ""
                self._message_id = str(uuid.uuid4())

            elif isinstance(frame, LLMTextFrame):
                logger.info(
                    "LLM CHUNK: {!r} | ACCUMULATED: {!r}",
                    frame.text,
                    self._assistant_text,
                )
                self._assistant_text += frame.text

                if self._assistant_text.strip():
                    message = {
                        "type": "server",
                        "msg": "TRANSCRIPT",
                        "role": "assistant",
                        "text": self._assistant_text,
                        "live": True,
                        "message_id": self._message_id,
                    }

                    await self.push_frame(
                        OutputTransportMessageFrame(message=message),
                        direction,
                    )

            elif isinstance(frame, LLMFullResponseEndFrame):
                if self._assistant_text.strip():
                    message = {
                        "type": "server",
                        "msg": "TRANSCRIPT",
                        "role": "assistant",
                        "text": self._assistant_text.strip(),
                        "live": False,
                        "message_id": self._message_id,
                    }

                    await self.push_frame(
                        OutputTransportMessageFrame(message=message),
                        direction,
                    )

                self._assistant_text = ""
                self._message_id = None

        await self.push_frame(frame, direction)


def build_voice_pipeline(
    input_processor,
    context: LLMContext,
    elder_id: str | None = None,
    system_instruction: str = LANGUAGE_LEARNING_PAL_PROMPT,
    session_id: str | None = None
):
    stt_provider = os.getenv("CLASSIC_STT_PROVIDER", "deepgram")
    llm_provider = os.getenv("CLASSIC_LLM_PROVIDER", "openai")
    tts_provider = os.getenv("CLASSIC_TTS_PROVIDER", "elevenlabs")

    logger.info(
        "Building classic route with stt={} llm={} tts={}",
        stt_provider,
        llm_provider,
        tts_provider,
    )

    # stt = create_stt_service(stt_provider, model="small", language="mk")
    stt = RemoteWhisperSTTService(
        url=os.getenv("REMOTE_WHISPER_URL"),
        sample_rate=16000,
    )
    llm = create_llm_service(
        llm_provider,
        model="gpt-4o",
        system_instruction=system_instruction,
    )
    tts = create_tts_service(tts_provider)

    user_aggregator, assistant_aggregator = LLMContextAggregatorPair(
        context,
        user_params=LLMUserAggregatorParams(
            vad_analyzer=SileroVADAnalyzer(params=VADParams(stop_secs=1))
        ),
    )

    @user_aggregator.event_handler("on_user_turn_message_added")
    async def on_user_turn_message_added(
        aggregator,
        message: UserTurnMessageAddedMessage,
    ):
        if not elder_id:
            return

        similar_summaries = get_similar_summaries(
            elder_id,
            message.content,
            k=5,
        )

        logger.info(
            "Retrieved {} relevant memories for user turn",
            len(similar_summaries),
        )

        memory_text = "\n".join(
            f"- {item['summary_text']}"
            for item in similar_summaries
        )

        messages = context.get_messages()

        messages = [
            msg
            for msg in messages
            if not (
                msg.get("role") == "system"
                and isinstance(msg.get("content"), str)
                and msg["content"].startswith(
                    "Relevant memories from previous conversations:"
                )
            )
        ]

        if similar_summaries:
            messages.append(
                {
                    "role": "system",
                    "content": (
                        "Relevant memories from previous conversations:\n"
                        f"{memory_text}"
                    ),
                }
            )

        context.set_messages(messages)
    live_user_transcript = LiveUserTranscriptProcessor()
    live_assistant_transcript = LiveAssistantTranscriptProcessor()
    processors = [
        input_processor,
        stt,
        live_user_transcript,
        ConversationLogger(elder_id, session_id, context),  # captures the user's transcribed text
        user_aggregator,
        llm,
        live_assistant_transcript,
        tts,
        ConversationLogger(elder_id, session_id),  # captures the assistant's spoken text
    ]

    return processors, assistant_aggregator
