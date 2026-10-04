"""Sunny Hollow video pipeline.

  python -m kids_channel.pipeline characters [--variants 3] [--only bo]
  python -m kids_channel.pipeline make ep001 [--dry]      # render only
  python -m kids_channel.pipeline send ep001              # YouTube (private) + WhatsApp approval
  python -m kids_channel.pipeline approvals
  python -m kids_channel.pipeline status
"""
import argparse
import datetime as dt
import hashlib
import json
import re
import shutil
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from . import fal, render
from .config import (CHARACTER_DIR, CHARACTER_SHEET_MODEL, CLIP_MODEL, EPISODES_DIR, FONT_PATH, FORMATS,
                     LONG_WEEKDAYS, MANIFEST_DIR, PUBLISH_HOUR_UTC, ROOT, SCENE_IMAGE_MODEL,
                     SCENE_IMAGE_MODEL_NO_REF, STATE_PATH, WORK_DIR, load_characters)

APPROVE_WORDS = ("ok", "okay", "approve", "approved", "yes", "go", "publish", "👍", "✅")


# ---------- state ----------

def load_state() -> dict:
    if STATE_PATH.exists():
        return json.loads(STATE_PATH.read_text())
    return {"curriculum_done": [], "items": {}}


def save_state(state: dict) -> None:
    STATE_PATH.write_text(json.dumps(state, indent=2, ensure_ascii=False) + "\n")


def now_utc() -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc)


# ---------- characters ----------

def cmd_characters(args) -> None:
    cfg = load_characters()
    CHARACTER_DIR.mkdir(parents=True, exist_ok=True)
    for cid, ch in cfg["characters"].items():
        if not ch["look"] or (args.only and cid not in args.only):
            continue
        prompt = (f"Character design reference: full body, front three-quarter view of {ch['look']}, "
                  f"standing, friendly smile, centered, plain soft cream background, {cfg['style']}")
        for v in range(1, args.variants + 1):
            url = fal.image(CHARACTER_SHEET_MODEL, prompt, "1:1")
            name = f"{cid}.png" if args.variants == 1 else f"{cid}_v{v}.png"
            fal.download(url, CHARACTER_DIR / name)
            print(f"{cid}: {CHARACTER_DIR / name}")


# ---------- assets with manifest cache ----------

def _key(*parts) -> str:
    return hashlib.sha1(json.dumps(parts, sort_keys=True).encode()).hexdigest()[:16]


def _manifest(item_id: str) -> tuple[dict, Path]:
    path = MANIFEST_DIR / f"{item_id}.json"
    return (json.loads(path.read_text()) if path.exists() else {}), path


def _cached(manifest: dict, key: str, dest: Path) -> bool:
    url = manifest.get(key)
    if url and fal.url_alive(url):
        fal.download(url, dest)
        return True
    return False


def scene_prompt(scene: dict, cfg: dict) -> str:
    looks = "; ".join(f"{cfg['characters'][c]['name']} is {cfg['characters'][c]['look']}"
                      for c in scene.get("characters", []))
    parts = [scene["image_prompt"]]
    if looks:
        parts.append(f"Keep the characters exactly as in the reference images: {looks}")
    parts.append(f"Setting: {cfg['world']}")
    parts.append(cfg["style"])
    return ". ".join(parts)


def placeholder(dest: Path, w: int, h: int, label: str) -> Path:
    img = Image.new("RGB", (w, h), "#bfe7c8")
    d = ImageDraw.Draw(img)
    d.text((w * 0.05, h * 0.45), label[:60], font=ImageFont.truetype(str(FONT_PATH), int(h * 0.05)), fill="#335")
    img.save(dest)
    return dest


# ---------- make ----------

def validate(spec: dict, cfg: dict) -> None:
    assert spec["format"] in FORMATS, "format must be long or short"
    for i, s in enumerate(spec["scenes"]):
        for c in s.get("characters", []):
            assert c in cfg["characters"], f"scene {i}: unknown character {c}"
        assert s.get("lines"), f"scene {i}: needs lines"
        for ln in s["lines"]:
            assert ln["who"] in cfg["characters"], f"scene {i}: unknown speaker {ln['who']}"


def load_spec(ref: str) -> dict:
    path = Path(ref)
    if not path.exists():
        path = ROOT / ref if (ROOT / ref).exists() else EPISODES_DIR / f"{ref}.json"
    return json.loads(path.read_text())


def build(spec: dict, cfg: dict, dry: bool) -> tuple[Path, Path]:
    """Generate all assets for one episode/short and render it. Returns (final.mp4, work dir)."""
    validate(spec, cfg)
    item_id, fmt = spec["id"], FORMATS[spec["format"]]
    w, h = fmt["w"], fmt["h"]
    work = WORK_DIR / item_id
    if work.exists():
        shutil.rmtree(work)
    work.mkdir(parents=True)
    manifest, manifest_path = _manifest(item_id)
    MANIFEST_DIR.mkdir(exist_ok=True)

    segments = []
    for i, scene in enumerate(spec["scenes"]):
        sdir = work / f"s{i:02d}"
        sdir.mkdir()
        # 1) image
        img = sdir / "image.png"
        prompt = scene_prompt(scene, cfg)
        refs = [CHARACTER_DIR / f"{c}.png" for c in scene.get("characters", [])][:4]
        ikey = _key("img", prompt, fmt["aspect"], [r.name for r in refs])
        if dry:
            placeholder(img, w, h, f"{i}: {scene['image_prompt']}")
        elif not _cached(manifest, ikey, img):
            missing = [r for r in refs if not r.exists()]
            if missing:
                sys.exit(f"Missing character sheets {missing}; run the 'characters' command first.")
            model = SCENE_IMAGE_MODEL if refs else SCENE_IMAGE_MODEL_NO_REF
            manifest[ikey] = fal.image(model, prompt, fmt["aspect"], refs=refs or None)
            fal.download(manifest[ikey], img)
            manifest_path.write_text(json.dumps(manifest, indent=1))
        # 2) optional animated clip
        clip = None
        if scene.get("animate") and not dry:
            clip = sdir / "clip.mp4"
            ckey = _key("clip", ikey, scene.get("motion_prompt", ""))
            if not _cached(manifest, ckey, clip):
                motion = scene.get("motion_prompt") or "gentle natural movement, characters blink and smile"
                manifest[ckey] = fal.clip(CLIP_MODEL, img, motion + ", smooth, cute, slow camera")
                fal.download(manifest[ckey], clip)
                manifest_path.write_text(json.dumps(manifest, indent=1))
        # 3) voice
        wavs = []
        for j, line in enumerate(scene["lines"]):
            wav = sdir / f"line{j}.wav"
            if dry:
                render.silence_wav(max(1.2, len(line["text"].split()) / 2.4), wav)
            else:
                from . import tts
                ch = cfg["characters"][line["who"]]
                mp3 = tts.speak(line["text"], ch["voice_id"], ch["voice_settings"], sdir / f"line{j}.mp3")
                render.to_wav(mp3, wav)
            wavs.append(wav)
        audio = sdir / "audio.wav"
        duration = render.concat_wavs(wavs, audio)
        duration = max(duration, scene.get("min_seconds", 0))
        # 4) learning text + compose
        overlay = None
        if scene.get("big_text"):
            overlay = render.big_text_png(scene["big_text"], w, h, sdir / "text.png", color_seed=i,
                                         color=scene.get("big_text_color"))
        segments.append(render.scene_video(image=img, clip=clip, audio=audio, duration=duration, w=w, h=h,
                                           overlay=overlay, dst=sdir / "scene.mp4", index=i))
        print(f"scene {i + 1}/{len(spec['scenes'])} done ({duration:.1f}s)", flush=True)

    joined = render.concat(segments, work / "joined.mp4")
    return render.add_music(joined, work / "final.mp4", seed=item_id), work


def build_compilation(spec: dict, cfg: dict, dry: bool) -> tuple[Path, Path]:
    """Stitch existing long episodes into one long video (re-renders from cached images/clips)."""
    work = WORK_DIR / spec["id"]
    work.mkdir(parents=True, exist_ok=True)
    finals = []
    for ep in spec["episodes"]:
        ep_spec = load_spec(ep)
        assert ep_spec["format"] == "long", f"{ep} is not a long episode"
        finals.append(build(ep_spec, cfg, dry)[0])
    return render.concat(finals, work / "final.mp4"), work


def cmd_make(args) -> None:
    spec = load_spec(args.spec)
    cfg = load_characters()
    item_id = spec["id"]
    if spec["format"] == "compilation":
        final, work = build_compilation(spec, cfg, args.dry)
    else:
        final, work = build(spec, cfg, args.dry)
    prev = None if spec["format"] == "compilation" else render.preview(
        final, work / "preview.mp4", vertical=spec["format"] == "short")
    sheet = render.contact_sheet(final, work / "contact_sheet.jpg")
    thumb = make_thumbnail(spec, work, cfg, args.dry)
    total = render.probe_duration(final)
    print(json.dumps({"final": str(final), "preview": str(prev) if prev else None, "contact_sheet": str(sheet),
                      "thumbnail": str(thumb) if thumb else None, "seconds": round(total, 1)}, indent=1))
    if args.dry:
        return
    state = load_state()
    item = state["items"].setdefault(item_id, {})
    item.update({"format": spec["format"], "title": spec["title"], "topic": spec.get("topic"),
                 "status": "rendered", "rendered_at": now_utc().isoformat(), "seconds": round(total, 1)})
    save_state(state)
    print(f"Rendered. Check the contact sheet, then: python -m kids_channel.pipeline send {item_id}")


def cmd_send(args) -> None:
    """Upload the rendered video to YouTube (private) and post it to WhatsApp for approval."""
    from . import whatsapp, youtube
    spec = load_spec(args.id)
    item_id = spec["id"]
    work = WORK_DIR / item_id
    final, prev = work / "final.mp4", work / "preview.mp4"
    thumb, sheet = work / "thumbnail.jpg", work / "contact_sheet.jpg"
    if not final.exists():
        sys.exit(f"{final} not found; run make first (renders don't survive a new session).")
    state = load_state()
    item = state["items"].setdefault(item_id, {"format": spec["format"], "title": spec["title"]})
    total = render.probe_duration(final)
    if item.get("youtube_id"):
        try:
            youtube.delete(item["youtube_id"])  # replace the old private draft after a fix
        except Exception as e:  # noqa: BLE001
            print(f"warn: could not delete old draft: {e}")
    item["youtube_id"] = youtube.upload(final, spec["title"], spec["description"], spec.get("tags", []))
    save_state(state)
    if thumb.exists():
        try:
            youtube.set_thumbnail(item["youtube_id"], thumb)
        except Exception as e:  # noqa: BLE001 - needs a phone-verified channel
            print(f"warn: thumbnail not set: {e}")
    kind = {"long": "Episode", "short": "Short", "compilation": "Compilation"}[spec["format"]]
    caption = (f"🎬 *{kind} {item_id}* — {spec['title']}\n"
               f"Learns: {spec.get('lesson', '-')} · {total:.0f}s\n\n"
               f"Reply *OK {item_id}* to publish, or *FIX {item_id}: what to change*")
    if spec["format"] == "compilation":  # too big for WhatsApp; its episodes were already approved
        item["wa_message_id"] = whatsapp.send_image(thumb if thumb.exists() else sheet, caption)
    else:
        item["wa_message_id"] = whatsapp.send_video(prev, caption)
    item.update(status="sent", sent_at=now_utc().isoformat(), feedback=None)
    save_state(state)
    print(json.dumps({"id": item_id, "youtube_id": item["youtube_id"], "status": "sent"}))


def make_thumbnail(spec: dict, work: Path, cfg: dict, dry: bool) -> Path | None:
    if spec["format"] == "short":
        return None
    first = spec["episodes"][0] if spec["format"] == "compilation" else spec["id"]
    src = WORK_DIR / first / "s00" / "image.png"
    if spec.get("thumbnail_prompt") and not dry:
        chars = spec.get("thumbnail_characters", [])
        refs = [CHARACTER_DIR / f"{c}.png" for c in chars]
        p = scene_prompt({"image_prompt": spec["thumbnail_prompt"], "characters": chars}, cfg)
        model = SCENE_IMAGE_MODEL if refs else SCENE_IMAGE_MODEL_NO_REF
        src = fal.download(fal.image(model, p, "16:9", refs=refs or None), work / "thumb_src.png")
    base = Image.open(render.fit_image(src, 1280, 720, work / "thumb_fit.png")).convert("RGBA")
    text = spec.get("thumbnail_text")
    if text:
        overlay = Image.open(render.big_text_png(text, 1280, 720, work / "thumb_text.png", color_seed=2))
        base = Image.alpha_composite(base, overlay)
    out = work / "thumbnail.jpg"
    base.convert("RGB").save(out, quality=90)
    return out


# ---------- approvals ----------

def next_slot(state: dict, fmt: str) -> dt.datetime:
    taken = {it["publish_at"] for it in state["items"].values()
             if it.get("publish_at") and it.get("format") == fmt}
    hour = PUBLISH_HOUR_UTC + {"short": 0, "long": 3, "compilation": 5}[fmt]
    days = {"short": set(range(7)), "long": LONG_WEEKDAYS, "compilation": {5}}[fmt]
    day = now_utc().replace(hour=hour, minute=0, second=0, microsecond=0)
    if day < now_utc() + dt.timedelta(hours=2):
        day += dt.timedelta(days=1)
    while True:
        if day.weekday() in days and day.isoformat() not in taken:
            return day
        day += dt.timedelta(days=1)


def cmd_approvals(args) -> None:
    from . import whatsapp, youtube
    state = load_state()
    pending = {k: v for k, v in state["items"].items() if v.get("status") == "sent"}
    if not pending:
        print(json.dumps({"approved": [], "fix_requested": [], "note": "nothing pending"}))
        return
    msgs = sorted(whatsapp.recent_messages(), key=lambda m: m["ts"])
    by_msg = {v.get("wa_message_id"): k for k, v in pending.items()}
    result = {"approved": [], "fix_requested": [], "manual_publish": []}
    for m in msgs:
        if m["from_me"] or not m["text"]:
            continue
        text = m["text"].strip()
        targets = [k for k in pending if re.search(rf"\b{re.escape(k)}\b", text, re.I)]
        if not targets and m["quoted_id"] in by_msg:
            targets = [by_msg[m["quoted_id"]]]
        if not targets and re.fullmatch(r"(ok|okay|approve)\s+all", text, re.I):
            targets = list(pending)
        for k in targets:
            item = state["items"][k]
            sent_ts = dt.datetime.fromisoformat(item["sent_at"]).timestamp()
            if m["ts"] < sent_ts or item["status"] != "sent":
                continue
            first = re.sub(r"[^\w👍✅]", " ", text.lower()).split()[:1]
            if first and first[0] in APPROVE_WORDS:
                slot = next_slot(state, item["format"])
                try:
                    youtube.schedule(item["youtube_id"], slot.isoformat().replace("+00:00", "Z"))
                    item.update(status="scheduled", publish_at=slot.isoformat())
                    result["approved"].append({"id": k, "publish_at": slot.isoformat()})
                except Exception as e:  # noqa: BLE001 - e.g. API project not audited yet
                    item.update(status="approved_manual", error=str(e)[:300])
                    result["manual_publish"].append(k)
                    whatsapp.send_text(f"✅ {k} approved. YouTube API can't publish yet (audit pending) — "
                                       f"open YouTube Studio → Content → '{item['title']}' → set Public.")
                if item.get("topic") and item["topic"] not in state["curriculum_done"]:
                    state["curriculum_done"].append(item["topic"])
            else:
                feedback = re.sub(rf"^\W*(fix|change)?\W*{re.escape(k)}\W*", "", text, flags=re.I).strip() or text
                item.update(status="fix_requested", feedback=feedback)
                result["fix_requested"].append({"id": k, "feedback": feedback})
    save_state(state)
    if result["approved"]:
        lines = [f"• {a['id']} → {a['publish_at'][:16].replace('T', ' ')} UTC" for a in result["approved"]]
        whatsapp.send_text("📅 Scheduled:\n" + "\n".join(lines))
    print(json.dumps(result, indent=1))


def cmd_status(args) -> None:
    state = load_state()
    counts: dict = {}
    for it in state["items"].values():
        counts[it.get("status")] = counts.get(it.get("status"), 0) + 1
    upcoming = sorted((it["publish_at"], k) for k, it in state["items"].items()
                      if it.get("status") == "scheduled" and it["publish_at"] > now_utc().isoformat())
    ahead = {"short": 0, "long": 0, "compilation": 0}
    for _, k in upcoming:
        ahead[state["items"][k]["format"]] += 1
    print(json.dumps({"counts": counts, "scheduled_ahead": ahead, "upcoming": upcoming[:10],
                      "curriculum_done": state["curriculum_done"],
                      "existing_specs": sorted(p.stem for p in EPISODES_DIR.glob("*.json"))}, indent=1))


def main() -> None:
    p = argparse.ArgumentParser(prog="kids_channel")
    sub = p.add_subparsers(dest="cmd", required=True)
    c = sub.add_parser("characters")
    c.add_argument("--variants", type=int, default=1)
    c.add_argument("--only", nargs="*")
    m = sub.add_parser("make")
    m.add_argument("spec")
    m.add_argument("--dry", action="store_true", help="placeholder images + silent audio, no API calls")
    sd = sub.add_parser("send")
    sd.add_argument("id")
    sub.add_parser("approvals")
    sub.add_parser("status")
    args = p.parse_args()
    {"characters": cmd_characters, "make": cmd_make, "send": cmd_send, "approvals": cmd_approvals,
     "status": cmd_status}[args.cmd](args)


if __name__ == "__main__":
    main()
