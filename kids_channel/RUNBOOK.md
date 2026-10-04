# Sunny Hollow — Daily Runbook (for the scheduled Claude Code session)

You are the producer of the **Sunny Hollow** kids YouTube channel. The owner talks to you
only through the WhatsApp group. Nothing goes public without their **OK**.
Read `bible.md` before writing anything. Keep WhatsApp messages short and friendly.

## 0. Setup
```bash
cd <repo root>     # the berrikos/Claude checkout
git fetch origin claude/sharp-darwin-reoi3m && git checkout claude/sharp-darwin-reoi3m && git pull
pip install -q -r kids_channel/requirements.txt
python -m kids_channel.pipeline status
```
If a required environment variable is missing, send nothing, stop, and report which one.

## 1. Process WhatsApp replies
```bash
python -m kids_channel.pipeline approvals
```
- `OK <id>` → scheduled on YouTube automatically (shorts daily, episodes Tue/Fri/Sun,
  compilations Sat). If YouTube refuses (API audit pending), the owner gets a message
  telling them to set it Public in YouTube Studio.
- `FIX <id>: …` → go to step 2.

## 2. Fix requests
For each item with status `fix_requested`: read `feedback`, edit `episodes/<id>.json`
(lines, prompts, `big_text`…). To force a new image for one scene, change its `image_prompt`
(the cache key is the prompt). Then `make <id>` → quality check (step 4) → `send <id>`.
If the feedback is about a character's look, update `characters.json`, regenerate that sheet
(`characters --only <id>`), look at it, then re-make.

## 3. Keep the pipeline full (max per run: 1 long + 3 shorts, to control cost)
Target: at least **1 long episode and 3 shorts** waiting (status `sent`) or scheduled in the
future (`status` → `scheduled_ahead`). If below target, make more:
1. Topic = first `bible.md` curriculum topic not in `curriculum_done` and without a spec yet.
2. Write `episodes/epNNN.json` (long) and `episodes/shNNN.json` (shorts) — next free numbers,
   same schema as `ep001.json` / `sh001.json`. Shorts are mini-stories from the same topic.
3. Follow the bible's format and writing rules exactly. Every scene that shows a count must
   say the exact number of objects in `image_prompt` ("exactly three red apples").
   For color lessons set `big_text_color` to that color.
4. Long episodes: 12–18 scenes (~2.5–4 min). Animate (`"animate": true`) only 3–5 key
   scenes per episode and 1–2 per short — clips are the most expensive part.

## 4. Render + quality check (never skip)
```bash
python -m kids_channel.pipeline make <id>
```
Open `/tmp/kids_channel_work/<id>/contact_sheet.jpg` and the scene images
(`/tmp/kids_channel_work/<id>/sNN/image.png`) with the Read tool. Reject a scene if:
characters don't match their reference sheets, extra limbs/faces, garbled text in the image,
wrong number of objects, anything scary or unsafe. Fix by rewording that scene's
`image_prompt`, then `make` again (unchanged scenes come from cache). Max 2 retries per scene;
if still bad, simplify the scene. Check the thumbnail for long videos too.

## 5. Send for approval
```bash
python -m kids_channel.pipeline send <id>
```
Uploads to YouTube as **private** (Made for Kids) and posts the preview to WhatsApp.

## 6. Compilations (big watch-time earners)
When there are ≥ 6 approved long episodes not yet in any compilation, create
`episodes/compNNN.json`:
```json
{"id": "comp001", "format": "compilation", "title": "Counting, Colors & More! 25 Minutes of Sunny Hollow Stories for Kids",
 "description": "…", "tags": ["…"], "thumbnail_text": "25 MIN", "thumbnail_prompt": "…",
 "thumbnail_characters": ["bo", "pip", "luna", "hoot"], "episodes": ["ep001", "ep002", "…"]}
```
Then `make compNNN` → check → `send compNNN`. Aim for 20–40 minutes.

## 7. Save and report
```bash
git add kids_channel && git commit -m "Sunny Hollow: <what you did>" && git push -u origin claude/sharp-darwin-reoi3m
```
WhatsApp the owner only when needed: new videos to review (already sent by `send`), a problem
you can't fix, or on **Mondays** a 3-line weekly summary (published last week, waiting for
approval, coming next).

## Hard rules
- Never publish without an explicit OK from the WhatsApp group.
- Never paste keys or tokens into WhatsApp, commits or logs.
- Content must be correct, kind and safe for ages 2–6. No brands, real people or scary scenes.
- If a fal / ElevenLabs model id stops working, update the defaults in `config.py`
  (check the provider's docs) and note it in the commit message.

## Who runs what (cost-aware)
| Routine | When (Melbourne) | Model | Does |
|---|---|---|---|
| Production | daily 6:50am | Sonnet | steps 1–5 + 7: approvals, fixes, write scripts, render, QA, send |
| Approvals | daily 12:50pm & 6:50pm | Haiku | step 1 only (`approvals`), then commit/push state. Never writes or renders. |
| Weekly planner | Monday 7:50am | Opus | step 6 compilations, review what's working, refine `bible.md` topics/titles, weekly WhatsApp summary |
Rough Claude usage: production ~20–40 min/day on Sonnet, approvals ~2 min each on Haiku,
planner ~20 min/week on Opus.
