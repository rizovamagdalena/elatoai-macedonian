"""Remote Whisper STT provider using a Colab HTTP endpoint."""

from __future__ import annotations

import io
import os
import wave

import httpx

from pipecat.frames.frames import (
    Frame,
    InterruptionFrame,
    TranscriptionFrame,
    VADUserStartedSpeakingFrame,
    VADUserStoppedSpeakingFrame,
)
from pipecat.processors.frame_processor import FrameDirection
from pipecat.services.settings import STTSettings
from pipecat.services.stt_service import STTService
from pipecat.utils.time import time_now_iso8601


class WhisperColabSTTService(STTService):
    def __init__(
        self,
        *,
        colab_url: str | None = None,
        language: str = "mk",
        **kwargs,
    ):
        # Give Pipecat explicit settings instead of leaving
        # model/language as NOT_GIVEN.
        settings = kwargs.pop(
            "settings",
            STTSettings(
                model=None,
                language=language,
            ),
        )

        super().__init__(
            settings=settings,
            **kwargs,
        )

        self.colab_url = colab_url or os.getenv("WHISPER_COLAB_URL")

        if not self.colab_url:
            raise ValueError("WHISPER_COLAB_URL is not set.")

        self.language = language

        # Pipecat gives us many small AudioRawFrame chunks.
        # We collect them until VAD tells us the user stopped speaking.
        self._audio_buffer = bytearray()

    async def process_frame(
        self,
        frame: Frame,
        direction: FrameDirection,
    ):
        # User started speaking -> start a fresh utterance.
        if isinstance(frame, VADUserStartedSpeakingFrame):
            self._audio_buffer.clear()

        # Let STTService handle the normal frame processing first.
        await super().process_frame(frame, direction)

        # User stopped speaking -> now send the complete utterance
        # to the remote Whisper service.
        if isinstance(frame, VADUserStoppedSpeakingFrame):
            await self._transcribe_buffer()

        # Interruption -> throw away anything collected so far.
        if isinstance(frame, InterruptionFrame):
            self._audio_buffer.clear()

    async def run_stt(self, audio: bytes):
        """
        Pipecat calls this for every small AudioRawFrame.

        We do NOT send the audio to Colab here.
        We only accumulate it.

        The complete utterance is sent when
        VADUserStoppedSpeakingFrame arrives.
        """
        if audio:
            self._audio_buffer.extend(audio)

        # No transcription yet.
        # _transcribe_buffer() is called after VAD says the user stopped.
        return
        yield

    async def _transcribe_buffer(self):
        """Send the complete accumulated utterance to Colab Whisper."""

        if not self._audio_buffer:
            return

        audio = bytes(self._audio_buffer)

        # Clear immediately so the next utterance starts fresh.
        self._audio_buffer.clear()

        wav_buffer = io.BytesIO()

        with wave.open(wav_buffer, "wb") as wav:
            wav.setnchannels(1)
            wav.setsampwidth(2)
            wav.setframerate(self.sample_rate)
            wav.writeframes(audio)

        wav_buffer.seek(0)

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                self.colab_url,
                files={
                    "audio": (
                        "audio.wav",
                        wav_buffer,
                        "audio/wav",
                    )
                },
            )

            response.raise_for_status()

            result = response.json()

        text = result.get("text", "").strip()

        if not text:
            return

        

        yield_frame = TranscriptionFrame(
            text,
            self._user_id,
            time_now_iso8601(),
            self.language,
        )

        await self.push_frame(
            yield_frame,
            FrameDirection.DOWNSTREAM,
        )


def create_service(**kwargs):
    return WhisperColabSTTService(**kwargs)