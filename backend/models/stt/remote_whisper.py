import os
import httpx

from collections.abc import AsyncGenerator
from pipecat.frames.frames import Frame, TranscriptionFrame
from pipecat.services.stt_service import SegmentedSTTService
from datetime import datetime, timezone

class RemoteWhisperSTTService(SegmentedSTTService):
    def __init__(
        self,
        url: str,
        sample_rate: int = 16000,
        **kwargs,
    ):
        super().__init__(
            sample_rate=sample_rate,
            model="whisper_colab",
            language="mk",
            **kwargs,
        )

        self.url = url

    @property
    def wants_wav_segments(self) -> bool:
        return False

    async def run_stt(
        self,
        audio: bytes,
    ) -> AsyncGenerator[Frame | None, None]:

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                self.url,
                content=audio,
                headers={
                    "Content-Type": "application/octet-stream"
                },
            )

        response.raise_for_status()

        text = response.json()["text"].strip()

        if text:
            yield TranscriptionFrame(
                text=text,
                user_id=getattr(self, "_user_id", ""),
                timestamp=datetime.now(timezone.utc).isoformat(),
            )