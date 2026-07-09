import 'dotenv/config';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const ROOT_DIR = path.resolve(__dirname, '..');
export const DATA_DIR = path.join(ROOT_DIR, 'data');
export const WA_AUTH_DIR = path.join(DATA_DIR, 'wa-auth');
export const DB_PATH = path.join(DATA_DIR, 'memory.db');

// Model tiers, cheapest/fastest first. The router picks a tier by task
// complexity; escalation walks one step up this chain on failure.
export const MODEL_TIERS = ['simple', 'moderate', 'complex'];

export const MODELS = {
  classifier: 'claude-haiku-4-5', // routing + fact extraction — cheap and fast
  simple: 'claude-haiku-4-5',     // $1/$5 per MTok
  moderate: 'claude-sonnet-5',    // $3/$15 per MTok
  complex: 'claude-opus-4-8',     // $5/$25 per MTok
};

export const config = {
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,

  // WhatsApp transport: 'whapi' (cloud API, webhook-based — no QR pairing) or
  // 'baileys' (direct WhatsApp Web protocol). Auto-selects whapi when a token
  // is present.
  waProvider: process.env.WA_PROVIDER || (process.env.WHAPI_TOKEN ? 'whapi' : 'baileys'),
  whapiToken: process.env.WHAPI_TOKEN || '',
  whapiApiUrl: (process.env.WHAPI_API_URL || 'https://gate.whapi.cloud').replace(/\/$/, ''),
  webhookPort: parseInt(process.env.WEBHOOK_PORT || '8088', 10),
  webhookPath: process.env.WEBHOOK_PATH || '/webhook',

  // Path to an Obsidian vault. When set, the vault becomes the long-term
  // brain: facts live in a markdown note, chats are logged as daily notes,
  // and memory recall searches the whole vault (your own notes included).
  obsidianVault: process.env.OBSIDIAN_VAULT || null,
  // Subfolder inside the vault for assistant-managed notes.
  obsidianFolder: process.env.OBSIDIAN_FOLDER || 'Assistant',

  // Comma-separated phone numbers (digits only, country code, no +) allowed
  // to command this assistant. Empty = reject everyone (safe default, since
  // this thing can run commands on your PC).
  allowedNumbers: (process.env.ALLOWED_NUMBERS || '')
    .split(',')
    .map((n) => n.trim().replace(/[^0-9]/g, ''))
    .filter(Boolean),

  // Where PC tasks run. Defaults to your home directory.
  workDir: process.env.ASSISTANT_WORK_DIR || os.homedir(),

  assistantName: process.env.ASSISTANT_NAME || 'Assistant',

  // Max conversation turns kept in the prompt (memory recall covers the rest).
  historyWindow: parseInt(process.env.HISTORY_WINDOW || '20', 10),

  // Hard cap on agent loop turns for PC tasks so a runaway task can't spin.
  maxAgentTurns: parseInt(process.env.MAX_AGENT_TURNS || '40', 10),
};

export function validateConfig() {
  const problems = [];
  if (!config.anthropicApiKey) {
    problems.push('ANTHROPIC_API_KEY is not set. Copy .env.example to .env and fill it in.');
  }
  if (config.allowedNumbers.length === 0) {
    problems.push(
      'ALLOWED_NUMBERS is empty. Set it to your own WhatsApp number (e.g. 61412345678) — ' +
        'otherwise every message is ignored, since this assistant can run commands on your PC.'
    );
  }
  if (config.waProvider === 'whapi' && !config.whapiToken) {
    problems.push('WA_PROVIDER=whapi but WHAPI_TOKEN is not set.');
  }
  if (!['whapi', 'baileys'].includes(config.waProvider)) {
    problems.push(`Unknown WA_PROVIDER "${config.waProvider}" (use "whapi" or "baileys").`);
  }
  return problems;
}
