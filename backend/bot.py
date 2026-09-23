#
# Copyright (c) 2024-2026, Daily
#
# SPDX-License-Identifier: BSD 2-Clause License
#

"""Shared Pipecat bot logic for the local multi-transport server."""

import os
import time
from typing import Literal

from voice_pipeline import build_voice_pipeline
from dotenv import load_dotenv
from gem_live_route import build_gem_live_route
from grok_route import build_grok_route
from loguru import logger
from pipecat.frames.frames import (
    AggregatedTextFrame,
    BotStartedSpeakingFrame,
)
import asyncio
import uuid
from models.db import get_elder, create_system_prompt, create_first_message, summarize_session
logger.info("Loading Silero VAD model...")

logger.info("Silero VAD model loaded")

from pipecat.frames.frames import (
    BotStartedSpeakingFrame,
    BotStoppedSpeakingFrame,
    ErrorFrame,
    Frame,
    InputTransportMessageFrame,
    InterruptionFrame,
    LLMContextFrame,
    LLMRunFrame,
    OutputAudioRawFrame,
    OutputTransportMessageFrame,
    STTMuteFrame,
    TTSStoppedFrame,
    UserStoppedSpeakingFrame,
    VADUserStoppedSpeakingFrame,
    TranscriptionFrame,
    TextFrame,
    TTSTextFrame,
    TTSSpeakFrame,
    TTSStoppedFrame
)
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineParams, PipelineTask
from pipecat.processors.aggregators.llm_context import LLMContext
from pipecat.processors.frame_processor import FrameDirection, FrameProcessor
from pipecat.transports.base_transport import BaseTransport

logger.info("All components loaded successfully")

load_dotenv(override=True)
CURRENT_VOICE_ROUTE = os.getenv("CURRENT_VOICE_ROUTE", "classic").strip().lower()
AUDIO_IN_SAMPLE_RATE = int(os.getenv("PIPELINE_AUDIO_IN_SAMPLE_RATE", "16000"))
AUDIO_OUT_SAMPLE_RATE = int(os.getenv("PIPELINE_AUDIO_OUT_SAMPLE_RATE", "24000"))

active_sessions: dict[str, PipelineTask] = {}

device_observers: dict[str, set] = {}
async def broadcast_device_message(elder_id: str | None, message: dict):
    if not elder_id:
        return

    observers = device_observers.get(elder_id, set())

    disconnected = set()

    for websocket in observers:
        try:
            await websocket.send_json(message)
        except Exception:
            disconnected.add(websocket)

    observers.difference_update(disconnected)

class RealtimeInputControlProcessor(FrameProcessor):
    """Bridge incoming websocket control messages into Pipecat frames."""

    def __init__(self, voice_route: str):
        super().__init__()
        self._voice_route = voice_route
        self.user_stopped_at: float | None = None
        self.on_start_conversation = None
        self._conversation_started = False

    async def process_frame(self, frame: Frame, direction: FrameDirection):

        await super().process_frame(frame, direction)

        if isinstance(frame, InputTransportMessageFrame):
            message = frame.message if isinstance(frame.message, dict) else {}
            msg_type = message.get("type")
            msg = message.get("msg")

            if msg_type == "instruction" and msg == "start_conversation" and not self._conversation_started:
                self._conversation_started = True
                if self.on_start_conversation:
                    await self.on_start_conversation()
                return

            if msg_type == "instruction" and msg == "end_of_speech":
                self.user_stopped_at = time.perf_counter()

                logger.info(
                    "[LATENCY] 🛑 USER STOPPED SPEAKING"
                )

                if self._voice_route == "gem_live":
                    await self.push_frame(
                        VADUserStoppedSpeakingFrame(),
                        FrameDirection.DOWNSTREAM,
                    )
                else:
                    await self.push_frame(
                        UserStoppedSpeakingFrame(),
                        FrameDirection.DOWNSTREAM,
                    )
                    await self.push_frame(
                        STTMuteFrame(mute=True),
                        FrameDirection.DOWNSTREAM,
                    )

            if msg_type == "instruction" and msg == "INTERRUPT":
                await self.push_frame(
                    InterruptionFrame(),
                    FrameDirection.DOWNSTREAM,
                )

                if self._voice_route != "gem_live":
                    await self.push_frame(
                        STTMuteFrame(mute=False),
                        FrameDirection.DOWNSTREAM,
                    )

                return

        await self.push_frame(frame, direction)

class RealtimeOutputControlProcessor(FrameProcessor):
    """Translate pipeline state changes into the old websocket control protocol."""

    def __init__(self):
        super().__init__()
        self._response_started = False

    async def process_frame(self, frame: Frame, direction: FrameDirection):
        await super().process_frame(frame, direction)

        if direction is FrameDirection.DOWNSTREAM:
            if isinstance(frame, (UserStoppedSpeakingFrame, VADUserStoppedSpeakingFrame)):
                await self.push_frame(
                    OutputTransportMessageFrame(message={"type": "server", "msg": "AUDIO.COMMITTED"}),
                    direction,
                )
            elif isinstance(frame, OutputAudioRawFrame) and not self._response_started:
                self._response_started = True
                logger.debug("Sending RESPONSE.CREATED before first audio packet")
                await self.push_frame(STTMuteFrame(mute=True), direction)
                await self.push_frame(
                    OutputTransportMessageFrame(message={"type": "server", "msg": "RESPONSE.CREATED"}),
                    direction,
                )
            elif isinstance(frame, (TTSStoppedFrame, BotStoppedSpeakingFrame)):
                self._response_started = False
                logger.info("Sending RESPONSE.COMPLETE after TTS stop")
                await self.push_frame(STTMuteFrame(mute=False), direction)
                await self.push_frame(frame, direction)
                await self.push_frame(
                    OutputTransportMessageFrame(message={"type": "server", "msg": "RESPONSE.COMPLETE"}),
                    direction,
                )
                return
            elif isinstance(frame, ErrorFrame):
                self._response_started = False
                await self.push_frame(STTMuteFrame(mute=False), direction)
                await self.push_frame(
                    OutputTransportMessageFrame(message={"type": "server", "msg": "RESPONSE.ERROR"}),
                    direction,
                )

        await self.push_frame(frame, direction)

# class LiveTranscriptProcessor(FrameProcessor):
#     """Send user and assistant text to the browser for live transcript updates."""

#     def __init__(self, elder_id: str | None = None):
#         super().__init__()
#         self.elder_id = elder_id
#         self._assistant_text = ""

#     async def process_frame(self, frame: Frame, direction: FrameDirection):
#         await super().process_frame(frame, direction)

#         if direction is FrameDirection.DOWNSTREAM:

#             # User's speech after STT
#             # if isinstance(frame, TranscriptionFrame) and frame.text.strip():
#             #     message = {
#             #         "type": "server",
#             #         "msg": "TRANSCRIPT",
#             #         "role": "user",
#             #         "text": frame.text,
#             #     }

#             #     await broadcast_device_message(self.elder_id, message)

#             #     await self.push_frame(
#             #         OutputTransportMessageFrame(message=message),
#             #         direction,
#             #     )

#             # Collect the assistant's actual TTS text
#             if isinstance(frame, TTSTextFrame) and frame.text.strip():
#                 self._assistant_text = frame.text.strip()

#             # The moment the assistant's audio starts,
#             # send the already-known text to the browser.
#             elif isinstance(frame, OutputAudioRawFrame):
#                 if self._assistant_text:
#                     message = {
#                         "type": "server",
#                         "msg": "TRANSCRIPT",
#                         "role": "assistant",
#                         "text": self._assistant_text,
#                     }

#                     logger.info(
#                         "📤 ASSISTANT TRANSCRIPT SENT TO BROWSER: {}",
#                         message,
#                     )

#                     await broadcast_device_message(
#                         self.elder_id,
#                         message,
#                     )

#                     await self.push_frame(
#                         OutputTransportMessageFrame(message=message),
#                         direction,
#                     )

#                     self._assistant_text = ""

#         await self.push_frame(frame, direction)

def create_esp32_auth_message() -> dict:
    return {
        "type": "auth",
        "volume_control": int(os.getenv("ESP32_DEFAULT_VOLUME", "100")),
        "pitch_factor": float(os.getenv("ESP32_DEFAULT_PITCH_FACTOR", "1.0")),
        "is_ota": False,
        "is_reset": False,
    }

async def _summarize_safely(elder_id: str, session_id: str):
    try:
        summarize_session(elder_id, session_id)
    except Exception:
        logger.exception("Failed to summarize session {}", session_id)
        
async def run_bot_session(
    transport: BaseTransport,
    transport_kind: Literal["browser", "esp32"],
    handle_sigint: bool = False,
    elder_id: str | None = None,
):
    voice_route = CURRENT_VOICE_ROUTE
    session_id = str(uuid.uuid4())
    logger.info(f"Starting bot session for {transport_kind} via route={voice_route}, elder_id={elder_id}")

    elder = get_elder(elder_id) if elder_id else None
    if elder:
        # summaries = get_recent_summaries(elder_id)
        system_prompt = create_system_prompt(elder)
        first_message = create_first_message(elder)
    else:
        system_prompt = None
        first_message = "Say hello and briefly introduce yourself."

    context = LLMContext()
    input_processor = RealtimeInputControlProcessor(voice_route)
    if voice_route == "gem_live":
        route_processors, assistant_aggregator = build_gem_live_route(input_processor, context)
    elif voice_route == "grok":
        route_processors, assistant_aggregator = build_grok_route(input_processor, context)
    else:
        route_processors, assistant_aggregator = build_voice_pipeline(
        input_processor,
        context,
        elder_id=elder_id,
        session_id=session_id,
        **({"system_instruction": system_prompt} if system_prompt else {}),
    )
        
    # latency_logger = LatencyLoggerProcessor(input_processor)

    processors = [transport.input(), *route_processors]

    if transport_kind in {"esp32", "browser"}:
        # processors.append(latency_logger)
        # processors.append(LiveTranscriptProcessor(elder_id))
        processors.append(RealtimeOutputControlProcessor())

    processors.append(transport.output())
    processors.append(assistant_aggregator)

    pipeline = Pipeline(processors)

    task = PipelineTask(
        pipeline,
        params=PipelineParams(
            enable_metrics=True,
            enable_usage_metrics=True,
            audio_in_sample_rate=AUDIO_IN_SAMPLE_RATE,
            audio_out_sample_rate=AUDIO_OUT_SAMPLE_RATE,
        ),
    )

    async def start_conversation():
        context.add_message({
            "role": "user",
            "content": first_message,
        })

        await task.queue_frames([
            LLMContextFrame(context=context)
        ])

    input_processor.on_start_conversation = start_conversation

    @transport.event_handler("on_client_connected")
    async def on_client_connected(transport, client):
        logger.info(f"{transport_kind} client connected")
        if elder_id:
            active_sessions[elder_id] = task

    @transport.event_handler("on_client_disconnected")
    async def on_client_disconnected(transport, client):
        logger.info(f"{transport_kind} client disconnected")
        await task.cancel()
        if elder_id:
            asyncio.create_task(_summarize_safely(elder_id, session_id))

    runner = PipelineRunner(handle_sigint=handle_sigint)
    await runner.run(task)

# Module level, alongside active_sessions

async def speak_to_elder(elder_id: str, text: str) -> bool:
    """Push a direct spoken reminder + an in-app notification into an elder's live session."""
    task = active_sessions.get(elder_id)
    if not task:
        logger.warning("Cannot deliver reminder — elder {} not connected", elder_id)
        return False

    _pending_reminder_texts.setdefault(elder_id, set()).add(text)

    await task.queue_frames([
        OutputTransportMessageFrame(
            message={"type": "server", "msg": "REMINDER", "text": text}
        ),
        TTSSpeakFrame(text=text),
    ])
    return True