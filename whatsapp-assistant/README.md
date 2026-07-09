# WhatsApp PC Assistant

A personal AI assistant you talk to on **WhatsApp** that can:

- 💬 **Answer any question** — using the right Claude model for the job
- 🖥️ **Perform tasks on your PC** — organise files, run commands, write scripts, open apps ("clean up my downloads folder", "write a python script that resizes my photos and run it")
- 🧠 **Remember everything locally** — optionally with your **Obsidian vault as the brain**: facts and chat logs live as markdown notes you can read/edit in Obsidian, and recall searches your entire vault
- ⚡ **Route by complexity, escalate on failure** — cheap/fast models for easy things, powerful models for hard things, automatic one-step escalation when a model can't handle a task. No wasted time, no wasted money.

Two WhatsApp transports are supported: **Whapi** (whapi.cloud — hosted API, webhook-based, no QR pairing) and **Baileys** (free, direct WhatsApp Web protocol).

## How it routes (the efficiency core)

```
incoming message
      │
      ├── built-in command? (remember/forget/memory/help) ──▶ handled locally, 0 tokens
      │
      ├── obviously simple? (heuristics, 0 tokens) ──▶ Haiku 4.5
      │
      └── one tiny Haiku classifier call (~fraction of a cent, <1s)
                 │
                 ▼
        {complexity, is_pc_task}
                 │
   ┌─────────────┼──────────────┐
 simple       moderate       complex
 Haiku 4.5    Sonnet 5       Opus 4.8
 ($1/$5 MTok) ($3/$15 MTok)  ($5/$25 MTok)
                 │
                 ▼
   model signals "I can't do this well"
   (sentinel or failed agent run)
                 │
                 ▼
     escalate ONE tier and retry ONCE
     (bounded — fails fast, never loops)
```

- **Questions** are answered with a direct Claude API call (with adaptive thinking on the bigger tiers and prompt caching on the system prompt).
- **PC tasks** run through the **Claude Agent SDK** — the Claude Code engine as a library — giving the model real Bash/Read/Write/Edit/Glob/Grep tools on your machine, with a turn cap so nothing runs away.

## Memory

Two modes — both fully local and private:

**Obsidian mode** (recommended — set `OBSIDIAN_VAULT` in `.env`):

- **`<vault>/Assistant/Facts.md`** — remembered facts, one bullet each. Edit it in Obsidian and the assistant sees your edits; say "remember ..." on WhatsApp and the note updates.
- **`<vault>/Assistant/Chat Log/YYYY-MM-DD.md`** — every conversation logged as daily notes.
- **Whole-vault recall** — on every message, the assistant searches your *entire vault* for relevant notes and injects the best matches into the prompt. Ask "what did I decide about the kitchen reno?" and it answers from the note you wrote yourself.
- A small SQLite index (`data/memory.db`) is still kept for fast recent-history lookups.

**SQLite-only mode** (default when no vault is configured): history + facts in `data/memory.db` with FTS5 full-text search.

In both modes, after each exchange a background Haiku call distills durable facts ("user's dog is named Rex") — it never delays your reply.

Manual controls from WhatsApp: `remember <fact>` · `forget <term>` · `memory` · `help`

## Setup

### Prerequisites

- Node.js 20+
- An [Anthropic API key](https://console.anthropic.com/)
- A WhatsApp channel: a [Whapi](https://whapi.cloud/) subscription (recommended), **or** a phone with WhatsApp for QR pairing via Baileys

### Install

```bash
cd whatsapp-assistant
npm install
cp .env.example .env
# edit .env: set ANTHROPIC_API_KEY, ALLOWED_NUMBERS, and WHAPI_TOKEN (or leave
# WHAPI_TOKEN empty to use Baileys QR pairing). Set OBSIDIAN_VAULT to use your
# vault as the brain.
```

### Option A — Whapi (you have a subscription)

1. Put your channel token in `.env` as `WHAPI_TOKEN`. The app auto-selects Whapi when the token is set.
2. `npm start` — the app listens for Whapi webhooks on port `8088` (configurable).
3. Give Whapi a way to reach your PC, then set the webhook in the **Whapi dashboard → your channel → Settings → Webhooks**: URL `http://<your-address>:8088/webhook`, enable **messages** (POST) events.
   - PC directly reachable (static IP / port forward): use `http://<your-ip>:8088/webhook`
   - Otherwise run a tunnel and use its URL, e.g.:
     ```bash
     cloudflared tunnel --url http://localhost:8088     # or: ngrok http 8088
     ```

### Option B — Baileys (no subscription needed)

Leave `WHAPI_TOKEN` empty and `npm start`. A **QR code** prints in the terminal — on the phone hosting the assistant's WhatsApp account: **Settings → Linked Devices → Link a Device** → scan. The session persists in `data/wa-auth/`, one-time only.

### Talk to it

Message the assistant's WhatsApp number from a whitelisted number and just talk:

> **you:** what's the capital of mongolia — *(Haiku, instant)*
> **you:** draft a polite reply to this email: ... — *(Sonnet)*
> **you:** organise my downloads folder into subfolders by file type — *(Sonnet + Agent SDK acting on your PC)*
> **you:** remember my tax file number is with the blue folder — *(stored locally, free)*
> **you:** debug why my node server leaks memory, the repo is in ~/projects/api — *(Opus)*

### Keep it running

Any process manager works, e.g.:

```bash
npx pm2 start src/index.js --name wa-assistant
```

## Security

- **Whitelist-only**: messages from numbers not in `ALLOWED_NUMBERS` are dropped before any processing. With an empty whitelist the app refuses to start.
- **DMs only**: group messages and broadcasts are ignored.
- The agent is instructed never to run destructive commands unless explicitly and unambiguously asked, and every task has a hard turn cap (`MAX_AGENT_TURNS`).
- All memory stays on your machine; only the snippets needed for a given reply are sent to the API.

⚠️ Be clear-eyed: this gives your WhatsApp number the ability to execute commands on your PC. Keep the whitelist tight and your phone locked.

## Project structure

```
whatsapp-assistant/
├── package.json
├── .env.example
└── src/
    ├── index.js      # entry point / wiring (picks transport + brain)
    ├── config.js     # env, model tiers, validation
    ├── whapi.js      # Whapi transport (webhook server + REST send)
    ├── whatsapp.js   # Baileys transport (QR pairing, reconnect, per-chat queueing)
    ├── router.js     # complexity classification: heuristics + Haiku structured output
    ├── brain.js      # orchestration: commands, routing, escalation, memory injection
    ├── agent.js      # PC task execution via Claude Agent SDK
    ├── memory.js     # memory facade: SQLite history/FTS + optional Obsidian brain
    └── obsidian.js   # vault backend: Facts.md, daily chat logs, whole-vault search
```

## Troubleshooting

- **No replies (Whapi)** → check the webhook URL in the Whapi dashboard actually reaches your PC (`curl -X POST http://<your-address>:8088/webhook -d '{}'` should return `{"ok":true}`), and that **messages** events are enabled.
- **No replies (either transport)** → check the sender number is in `ALLOWED_NUMBERS` exactly as digits with country code (watch the startup log — it prints the last 4 digits of each whitelisted number).
- **Logged out / QR loop (Baileys)** → `npm run reset-auth`, restart, re-scan.
- **Vault notes not being found** → recall matches whole words from your message against note text; check `OBSIDIAN_VAULT` points at the vault root (the folder containing `.obsidian/`).
- **PC tasks fail immediately** → the Claude Agent SDK uses your `ANTHROPIC_API_KEY`; make sure it's valid and has credit.
