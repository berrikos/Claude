"""Paths, model choices and credentials (all secrets come from environment variables)."""
import json
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent
EPISODES_DIR = ROOT / "episodes"
ASSETS_DIR = ROOT / "assets"
CHARACTER_DIR = ASSETS_DIR / "characters"
MUSIC_DIR = ASSETS_DIR / "music"
FONT_PATH = ASSETS_DIR / "fonts" / "Fredoka-SemiBold.ttf"
STATE_PATH = ROOT / "state.json"
MANIFEST_DIR = ROOT / "manifests"  # fal URLs of generated assets, so re-renders don't pay twice
WORK_DIR = Path(os.environ.get("KIDS_WORK_DIR", "/tmp/kids_channel_work"))

# fal.ai models (swap here when better/cheaper ones appear)
CHARACTER_SHEET_MODEL = os.environ.get("KIDS_CHARACTER_MODEL", "fal-ai/flux-pro/v1.1-ultra")
SCENE_IMAGE_MODEL = os.environ.get("KIDS_SCENE_MODEL", "fal-ai/flux-pro/kontext/max/multi")
SCENE_IMAGE_MODEL_NO_REF = os.environ.get("KIDS_SCENE_MODEL_NO_REF", "fal-ai/flux-pro/v1.1-ultra")
CLIP_MODEL = os.environ.get("KIDS_CLIP_MODEL", "fal-ai/kling-video/v2.1/standard/image-to-video")

TTS_MODEL = os.environ.get("KIDS_TTS_MODEL", "eleven_multilingual_v2")

FORMATS = {
    "long": {"w": 1920, "h": 1080, "aspect": "16:9"},
    "short": {"w": 1080, "h": 1920, "aspect": "9:16"},
}

# Publishing slots (UTC). 14:00 UTC = 10am New York / 3pm London.
PUBLISH_HOUR_UTC = int(os.environ.get("KIDS_PUBLISH_HOUR_UTC", "14"))
LONG_WEEKDAYS = {1, 4, 6}  # Tue, Fri, Sun
YOUTUBE_CATEGORY = "27"  # Education


def env(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise SystemExit(f"Missing environment variable {name}. Add it in the environment settings.")
    return value


def load_characters() -> dict:
    return json.loads((ROOT / "characters.json").read_text())
