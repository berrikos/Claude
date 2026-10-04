"""ffmpeg composition: stills (slow zoom) or AI clips + voice + big learning text + music."""
import random
import re
import subprocess
import wave
from pathlib import Path

import imageio_ffmpeg
from PIL import Image, ImageDraw, ImageFont

from .config import FONT_PATH, MUSIC_DIR

FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
FPS = 30
TEXT_COLORS = ["#FF5A5F", "#2EA8FF", "#FFB400", "#7A5CFF", "#22C55E", "#FF7A00"]
VIDEO_ARGS = ["-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p", "-r", str(FPS)]
AUDIO_ARGS = ["-c:a", "aac", "-b:a", "192k", "-ar", "44100", "-ac", "2"]


def ffmpeg(*args: str) -> None:
    proc = subprocess.run([FFMPEG, "-y", "-hide_banner", "-loglevel", "error", *args],
                          capture_output=True, text=True)
    if proc.returncode != 0:
        raise RuntimeError(f"ffmpeg failed: {proc.stderr[-2000:]}")


def probe_duration(path: Path) -> float:
    out = subprocess.run([FFMPEG, "-hide_banner", "-i", str(path)], capture_output=True, text=True).stderr
    h, m, s = re.search(r"Duration: (\d+):(\d+):([\d.]+)", out).groups()
    return int(h) * 3600 + int(m) * 60 + float(s)


def to_wav(src: Path, dst: Path) -> Path:
    ffmpeg("-i", str(src), "-ar", "44100", "-ac", "1", "-sample_fmt", "s16", str(dst))
    return dst


def silence_wav(seconds: float, dst: Path) -> Path:
    with wave.open(str(dst), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(44100)
        w.writeframes(b"\x00\x00" * int(44100 * seconds))
    return dst


def concat_wavs(parts: list[Path], dst: Path, gap: float = 0.35, lead: float = 0.4, tail: float = 0.7) -> float:
    """Join line audio with small pauses; returns total seconds."""
    def pad(sec: float) -> bytes:
        return b"\x00\x00" * int(44100 * sec)

    frames = [pad(lead)]
    for i, p in enumerate(parts):
        with wave.open(str(p), "rb") as w:
            frames.append(w.readframes(w.getnframes()))
        frames.append(pad(gap if i < len(parts) - 1 else tail))
    data = b"".join(frames)
    with wave.open(str(dst), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(44100)
        w.writeframes(data)
    return len(data) / 2 / 44100


def big_text_png(text: str, w: int, h: int, dst: Path, color_seed: int = 0, color: str | None = None) -> Path:
    """Transparent full-frame PNG with a big, bold learning word near the top."""
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    size = int(min(w, h) * (0.32 if len(text) <= 3 else 0.16))
    font = ImageFont.truetype(str(FONT_PATH), size)
    while draw.textlength(text, font=font) > w * 0.86 and size > 40:
        size -= 6
        font = ImageFont.truetype(str(FONT_PATH), size)
    stroke = max(6, size // 10)
    tw = draw.textlength(text, font=font)
    y = int(h * (0.08 if h > w else 0.06))
    draw.text(((w - tw) / 2, y), text, font=font, fill="white",
              stroke_width=stroke, stroke_fill=color or TEXT_COLORS[color_seed % len(TEXT_COLORS)])
    img.save(dst)
    return dst


def fit_image(src: Path, w: int, h: int, dst: Path) -> Path:
    img = Image.open(src).convert("RGB")
    scale = max(w / img.width, h / img.height)
    img = img.resize((round(img.width * scale), round(img.height * scale)), Image.LANCZOS)
    left, top = (img.width - w) // 2, (img.height - h) // 2
    img.crop((left, top, left + w, top + h)).save(dst)
    return dst


def scene_video(*, image: Path, clip: Path | None, audio: Path, duration: float, w: int, h: int,
                overlay: Path | None, dst: Path, index: int) -> Path:
    frames = int(duration * FPS) + 1
    if clip:
        clip_len = probe_duration(clip)
        stretch = min(duration / clip_len, 1.5)
        vf = (f"[0:v]scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h},"
              f"setpts={stretch:.3f}*PTS,fps={FPS},tpad=stop_mode=clone:stop_duration={duration:.2f}[base]")
        inputs = ["-i", str(clip)]
    else:
        fitted = fit_image(image, w, h, dst.with_suffix(".fit.png"))
        moves = [  # alternate gentle camera moves so stills feel alive
            "z='min(zoom+0.0007,1.15)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'",
            "z='if(eq(on,0),1.15,max(zoom-0.0007,1.0))':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'",
            f"z=1.12:x='(iw-iw/zoom)*on/{frames}':y='ih/2-(ih/zoom/2)'",
            f"z=1.12:x='(iw-iw/zoom)*(1-on/{frames})':y='ih/2-(ih/zoom/2)'",
        ]
        vf = (f"[0:v]scale={w * 2}:{h * 2},zoompan={moves[index % len(moves)]}:d={frames}:s={w}x{h}:fps={FPS}[base]")
        inputs = ["-i", str(fitted)]
    inputs += ["-i", str(audio)]
    if overlay:
        inputs += ["-loop", "1", "-i", str(overlay)]
        vf += (";[2:v]format=rgba,fade=in:st=0.5:d=0.35:alpha=1[ov];"
               "[base][ov]overlay=0:0:shortest=1[v]")
    else:
        vf += ";[base]null[v]"
    ffmpeg(*inputs, "-filter_complex", vf, "-map", "[v]", "-map", "1:a",
           "-t", f"{duration:.3f}", *VIDEO_ARGS, *AUDIO_ARGS, str(dst))
    return dst


def concat(parts: list[Path], dst: Path) -> Path:
    listing = dst.with_suffix(".txt")
    listing.write_text("".join(f"file '{p}'\n" for p in parts))
    ffmpeg("-f", "concat", "-safe", "0", "-i", str(listing), "-c", "copy", str(dst))
    return dst


def add_music(video: Path, dst: Path, seed: str) -> Path:
    tracks = sorted(MUSIC_DIR.glob("*.mp3")) + sorted(MUSIC_DIR.glob("*.m4a"))
    if not tracks:
        video.replace(dst)
        return dst
    track = random.Random(seed).choice(tracks)
    total = probe_duration(video)
    fade_start = max(0.0, total - 2.5)
    ffmpeg("-i", str(video), "-stream_loop", "-1", "-i", str(track), "-filter_complex",
           f"[1:a]volume=0.10,afade=t=in:d=1.5,afade=t=out:st={fade_start:.2f}:d=2.5[m];"
           f"[0:a][m]amix=inputs=2:duration=first:normalize=0[a]",
           "-map", "0:v", "-map", "[a]", "-c:v", "copy", *AUDIO_ARGS, "-t", f"{total:.3f}", str(dst))
    return dst


def preview(video: Path, dst: Path, vertical: bool) -> Path:
    """Small copy for WhatsApp (keeps it under ~16 MB for typical lengths)."""
    scale = "scale=540:-2" if vertical else "scale=854:-2"
    ffmpeg("-i", str(video), "-vf", scale, "-c:v", "libx264", "-preset", "veryfast", "-crf", "30",
           "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart", str(dst))
    return dst


def contact_sheet(video: Path, dst: Path, count: int = 6) -> Path:
    """Grid of frames so the reviewing agent can eyeball quality before sending."""
    total = probe_duration(video)
    frames = []
    for i in range(count):
        f = dst.parent / f"_frame{i}.jpg"
        ffmpeg("-ss", f"{total * (i + 0.5) / count:.2f}", "-i", str(video), "-frames:v", "1",
               "-vf", "scale=480:-2", str(f))
        frames.append(Image.open(f))
    cols = 3
    fw, fh = frames[0].size
    sheet = Image.new("RGB", (fw * cols, fh * ((count + cols - 1) // cols)), "white")
    for i, fr in enumerate(frames):
        sheet.paste(fr, ((i % cols) * fw, (i // cols) * fh))
    sheet.save(dst, quality=85)
    return dst
