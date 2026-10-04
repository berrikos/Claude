"""Minimal fal.ai queue client: submit, poll, fetch result, download."""
import base64
import mimetypes
import time
from pathlib import Path

import httpx

from .config import env

QUEUE = "https://queue.fal.run"


def _headers() -> dict:
    return {"Authorization": f"Key {env('FAL_KEY')}"}


def data_uri(path: Path) -> str:
    mime = mimetypes.guess_type(str(path))[0] or "image/png"
    return f"data:{mime};base64,{base64.b64encode(path.read_bytes()).decode()}"


def run(model: str, payload: dict, timeout_s: int = 900) -> dict:
    with httpx.Client(timeout=120) as client:
        r = client.post(f"{QUEUE}/{model}", json=payload, headers=_headers())
        r.raise_for_status()
        job = r.json()
        deadline = time.time() + timeout_s
        while time.time() < deadline:
            s = client.get(job["status_url"], headers=_headers())
            s.raise_for_status()
            status = s.json().get("status")
            if status == "COMPLETED":
                res = client.get(job["response_url"], headers=_headers())
                res.raise_for_status()
                return res.json()
            if status not in ("IN_QUEUE", "IN_PROGRESS"):
                raise RuntimeError(f"fal job failed: {s.text[:500]}")
            time.sleep(4)
    raise TimeoutError(f"fal job for {model} timed out")


def download(url: str, dest: Path) -> Path:
    dest.parent.mkdir(parents=True, exist_ok=True)
    with httpx.Client(timeout=300, follow_redirects=True) as client:
        r = client.get(url)
        r.raise_for_status()
        dest.write_bytes(r.content)
    return dest


def url_alive(url: str) -> bool:
    try:
        with httpx.Client(timeout=30, follow_redirects=True) as client:
            return client.head(url).status_code == 200
    except httpx.HTTPError:
        return False


def image(model: str, prompt: str, aspect: str, refs: list[Path] | None = None, seed: int | None = None) -> str:
    payload = {"prompt": prompt, "aspect_ratio": aspect, "num_images": 1,
               "output_format": "png", "safety_tolerance": "2"}
    if refs:
        payload["image_urls"] = [data_uri(p) for p in refs]
    if seed is not None:
        payload["seed"] = seed
    return run(model, payload)["images"][0]["url"]


def clip(model: str, image_path: Path, motion_prompt: str) -> str:
    payload = {
        "prompt": motion_prompt,
        "image_url": data_uri(image_path),
        "duration": "5",
        "negative_prompt": "blur, distort, low quality, morphing, extra limbs, text, scary",
        "cfg_scale": 0.5,
    }
    return run(model, payload)["video"]["url"]
