# WhatsApp PC Assistant

A personal AI assistant you talk to on **WhatsApp** that can:

- 💬 **Answer any question** — using the right Claude model for the job
- 🖥️ **Perform tasks on your PC** — organise files, run commands, write scripts, open apps ("clean up my downloads folder", "write a python script that resizes my photos and run it")
- 🧠 **Remember everything locally** — full conversation history + auto-extracted long-term facts, stored in SQLite on your machine, searchable and private
- ⚡ **Route by complexity, escalate on failure** — cheap/fast models for easy things, powerful models for hard things, automatic one-step escalation when a model can't handle a task. No wasted time, no wasted money.

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

Everything is stored **locally** in `data/memory.db` (SQLite + FTS5 full-text search):

- Every message in/out is logged and searchable
- After each exchange, a background Haiku call distills durable facts ("user's dog is named Rex") — it never delays your reply
- On every new message, relevant facts + older conversation snippets are recalled by full-text search and injected into the prompt — so the assistant "remembers" without stuffing the whole history into every request

Manual controls from WhatsApp: `remember <fact>` · `forget <term>` · `memory` · `help`

## Setup

### Prerequisites

- Node.js 20+
- An [Anthropic API key](https://console.anthropic.com/)
- A phone with WhatsApp (you'll link the assistant as a companion device — a spare number/second phone for the assistant is nicest, but linking your own account works too; the assistant only answers whitelisted senders and ignores its own messages)

### Install

```bash
cd whatsapp-assistant
npm install
cp .env.example .env
# edit .env: set ANTHROPIC_API_KEY and ALLOWED_NUMBERS (your phone number)
```

### Run

```bash
npm start
```

On first start a **QR code** prints in the terminal. On the phone that hosts the assistant's WhatsApp account: **Settings → Linked Devices → Link a Device** → scan it. The session persists in `data/wa-auth/`, so this is one-time.

Then message that WhatsApp account from a whitelisted number and just talk:

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
    ├── index.js      # entry point / wiring
    ├── config.js     # env, model tiers, validation
    ├── whatsapp.js   # Baileys transport (QR pairing, reconnect, per-chat queueing)
    ├── router.js     # complexity classification: heuristics + Haiku structured output
    ├── brain.js      # orchestration: commands, routing, escalation, memory injection
    ├── agent.js      # PC task execution via Claude Agent SDK
    └── memory.js     # SQLite + FTS5: history, facts, recall, background extraction
```

## Troubleshooting

- **Logged out / QR loop** → `npm run reset-auth`, restart, re-scan.
- **No replies** → check the sender number is in `ALLOWED_NUMBERS` exactly as digits with country code (watch the startup log — it prints the last 4 digits of each whitelisted number).
- **PC tasks fail immediately** → the Claude Agent SDK uses your `ANTHROPIC_API_KEY`; make sure it's valid and has credit.
