"""YouTube Data API v3: upload (private, Made for Kids), schedule, thumbnail."""
from pathlib import Path

import httpx

from .config import YOUTUBE_CATEGORY, env

API = "https://www.googleapis.com/youtube/v3"
UPLOAD = "https://www.googleapis.com/upload/youtube/v3"


def _token() -> str:
    r = httpx.post("https://oauth2.googleapis.com/token", data={
        "client_id": env("YOUTUBE_CLIENT_ID"),
        "client_secret": env("YOUTUBE_CLIENT_SECRET"),
        "refresh_token": env("YOUTUBE_REFRESH_TOKEN"),
        "grant_type": "refresh_token",
    }, timeout=60)
    r.raise_for_status()
    return r.json()["access_token"]


def upload(video: Path, title: str, description: str, tags: list[str]) -> str:
    """Uploads as PRIVATE. Publishing happens later via schedule() after WhatsApp approval."""
    token = _token()
    meta = {
        "snippet": {"title": title[:100], "description": description[:4900], "tags": tags[:30],
                    "categoryId": YOUTUBE_CATEGORY, "defaultLanguage": "en", "defaultAudioLanguage": "en"},
        "status": {"privacyStatus": "private", "selfDeclaredMadeForKids": True,
                   "embeddable": True, "license": "youtube"},
    }
    with httpx.Client(timeout=900) as client:
        init = client.post(f"{UPLOAD}/videos", params={"uploadType": "resumable", "part": "snippet,status"},
                           headers={"Authorization": f"Bearer {token}",
                                    "X-Upload-Content-Type": "video/mp4"}, json=meta)
        init.raise_for_status()
        put = client.put(init.headers["Location"], content=video.read_bytes(),
                         headers={"Authorization": f"Bearer {token}", "Content-Type": "video/mp4"})
        put.raise_for_status()
        return put.json()["id"]


def schedule(video_id: str, publish_at_iso: str) -> dict:
    r = httpx.put(f"{API}/videos", params={"part": "status"},
                  headers={"Authorization": f"Bearer {_token()}"},
                  json={"id": video_id, "status": {"privacyStatus": "private", "publishAt": publish_at_iso,
                                                    "selfDeclaredMadeForKids": True}}, timeout=60)
    r.raise_for_status()
    return r.json()


def set_thumbnail(video_id: str, image: Path) -> None:
    r = httpx.post(f"{UPLOAD}/thumbnails/set", params={"videoId": video_id},
                   headers={"Authorization": f"Bearer {_token()}", "Content-Type": "image/jpeg"},
                   content=image.read_bytes(), timeout=120)
    r.raise_for_status()


def delete(video_id: str) -> None:
    httpx.delete(f"{API}/videos", params={"id": video_id},
                 headers={"Authorization": f"Bearer {_token()}"}, timeout=60).raise_for_status()
