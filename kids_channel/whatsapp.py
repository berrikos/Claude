"""Whapi.cloud WhatsApp group messaging: send previews, read replies."""
from pathlib import Path

import httpx

from .config import env

API = "https://gate.whapi.cloud"


def _headers() -> dict:
    return {"Authorization": f"Bearer {env('WHAPI_TOKEN')}"}


def group() -> str:
    return env("WHAPI_GROUP_ID")


def send_text(text: str) -> str:
    r = httpx.post(f"{API}/messages/text", headers=_headers(), json={"to": group(), "body": text}, timeout=60)
    r.raise_for_status()
    return r.json().get("message", {}).get("id", "")


def send_video(path: Path, caption: str) -> str:
    with httpx.Client(timeout=600) as client:
        up = client.post(f"{API}/media", headers={**_headers(), "Content-Type": "video/mp4"},
                         content=path.read_bytes())
        up.raise_for_status()
        media_id = up.json()["media"][0]["id"]
        r = client.post(f"{API}/messages/video", headers=_headers(),
                        json={"to": group(), "media": media_id, "caption": caption})
        r.raise_for_status()
        return r.json().get("message", {}).get("id", "")


def send_image(path: Path, caption: str) -> str:
    with httpx.Client(timeout=300) as client:
        up = client.post(f"{API}/media", headers={**_headers(), "Content-Type": "image/jpeg"},
                         content=path.read_bytes())
        up.raise_for_status()
        media_id = up.json()["media"][0]["id"]
        r = client.post(f"{API}/messages/image", headers=_headers(),
                        json={"to": group(), "media": media_id, "caption": caption})
        r.raise_for_status()
        return r.json().get("message", {}).get("id", "")


def recent_messages(count: int = 100) -> list[dict]:
    """Newest-first messages from the group, as {id, from_me, text, ts, quoted_id}."""
    r = httpx.get(f"{API}/messages/list/{group()}", headers=_headers(), params={"count": count}, timeout=60)
    r.raise_for_status()
    out = []
    for m in r.json().get("messages", []):
        text = (m.get("text") or {}).get("body") or m.get("caption") or ""
        quoted = (m.get("context") or {}).get("quoted_id")
        out.append({"id": m.get("id"), "from_me": m.get("from_me", False), "text": text,
                    "ts": m.get("timestamp", 0), "quoted_id": quoted})
    return out
