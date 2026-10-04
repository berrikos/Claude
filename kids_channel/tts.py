"""ElevenLabs text-to-speech, one file per dialogue line."""
from pathlib import Path

import httpx

from .config import TTS_MODEL, env


def speak(text: str, voice_id: str, settings: dict, dest: Path) -> Path:
    dest.parent.mkdir(parents=True, exist_ok=True)
    r = httpx.post(
        f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}",
        params={"output_format": "mp3_44100_128"},
        headers={"xi-api-key": env("ELEVENLABS_API_KEY")},
        json={"text": text, "model_id": TTS_MODEL, "voice_settings": settings},
        timeout=120,
    )
    r.raise_for_status()
    dest.write_bytes(r.content)
    return dest
