"""Microsoft Edge TTS provider for Macedonian."""

from __future__ import annotations

import io
import subprocess

import edge_tts
import imageio_ffmpeg

from pipecat.frames.frames import TTSAudioRawFrame
from pipecat.services.settings import TTSSettings
from pipecat.services.tts_service import TTSService


EDGE_VOICES = {
    "marija": "mk-MK-MarijaNeural",
    "aleksandar": "mk-MK-AleksandarNeural",
}


class EdgeTTSTTSService(TTSService):
    def __init__(
        self,
        *,
        voice: str = "marija",
        language: str = "mk",
        **kwargs,
    ):
        super().__init__(
            sample_rate=24000,
            settings=TTSSettings(
                model=None,
                voice=voice,
                language=language,
            ),
            **kwargs,
        )

        self.language = language
        self.voice = EDGE_VOICES.get(
            voice.lower(),
            EDGE_VOICES["marija"],
        )

    async def run_tts(
        self,
        text: str,
        context_id: str,
    ):
        if not text.strip():
            return

        try:
            communicate = edge_tts.Communicate(
                text,
                self.voice,
            )

            mp3_buffer = io.BytesIO()

            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    mp3_buffer.write(chunk["data"])

            mp3_buffer.seek(0)

            # Get the FFmpeg executable bundled inside the Python environment.
            ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()

            # Convert MP3 -> raw PCM:
            # 24 kHz, mono, signed 16-bit little-endian.
            result = subprocess.run(
                [
                    ffmpeg_exe,
                    "-i",
                    "pipe:0",
                    "-f",
                    "s16le",
                    "-ar",
                    "24000",
                    "-ac",
                    "1",
                    "pipe:1",
                ],
                input=mp3_buffer.getvalue(),
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                check=True,
            )

            pcm_audio = result.stdout

            chunk_size = 4096

            for start in range(0, len(pcm_audio), chunk_size):
                chunk = pcm_audio[start:start + chunk_size]

                if chunk:
                    yield TTSAudioRawFrame(
                        audio=chunk,
                        sample_rate=24000,
                        num_channels=1,
                        context_id=context_id,
                    )

        except Exception as e:
            print(f"Edge TTS error: {e}")
            return


def create_service(**kwargs):
    return EdgeTTSTTSService(**kwargs)