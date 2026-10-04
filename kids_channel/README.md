# Buttercup Hollow — kids learning-story YouTube channel

Short story videos for ages 2–6 (long episodes + Shorts), made with AI and run by a
scheduled Claude Code session. The owner approves everything over WhatsApp.

- `bible.md` — characters, style, formats, writing rules, curriculum
- `characters.json` — character looks, voices, art style
- `episodes/*.json` — one script per video (`long`, `short`, `compilation`)
- `RUNBOOK.md` — what the daily scheduled session does
- `pipeline.py` — `characters`, `make`, `send`, `approvals`, `status`

Flow: script → fal.ai images (character references for consistency) + a few Kling clips →
ElevenLabs voices → ffmpeg (gentle camera moves, big learning words, music) →
YouTube private upload → WhatsApp preview → **OK** → scheduled publish.

## Environment variables
`FAL_KEY`, `ELEVENLABS_API_KEY`, `WHAPI_TOKEN`, `WHAPI_GROUP_ID`,
`YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REFRESH_TOKEN`

Allowed network hosts: `queue.fal.run`, `fal.media`, `v3.fal.media`, `api.elevenlabs.io`,
`gate.whapi.cloud`, `www.googleapis.com`, `oauth2.googleapis.com`.

## Try it without keys
```bash
pip install -r kids_channel/requirements.txt
python -m kids_channel.pipeline make sh001 --dry   # placeholder images, silent audio
```

Music: drop royalty-free `.mp3` tracks (e.g. from the YouTube Audio Library) into
`assets/music/`; one is picked per video at low volume. Without tracks, videos have no music.
