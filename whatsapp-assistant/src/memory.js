import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import Anthropic from '@anthropic-ai/sdk';
import { DB_PATH, DATA_DIR, MODELS, config } from './config.js';

// Local, private memory: full conversation log + distilled long-term facts,
// both searchable via SQLite FTS5. Nothing ever leaves the machine except
// the snippets injected into model prompts.

let db;
let anthropic;

export function initMemory() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chat_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_messages_chat ON messages(chat_id, id);

    CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
      content, content='messages', content_rowid='id'
    );
    CREATE TRIGGER IF NOT EXISTS messages_ai AFTER INSERT ON messages BEGIN
      INSERT INTO messages_fts(rowid, content) VALUES (new.id, new.content);
    END;

    CREATE TABLE IF NOT EXISTS facts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fact TEXT NOT NULL UNIQUE,
      source TEXT NOT NULL DEFAULT 'auto',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS facts_fts USING fts5(
      fact, content='facts', content_rowid='id'
    );
    CREATE TRIGGER IF NOT EXISTS facts_ai AFTER INSERT ON facts BEGIN
      INSERT INTO facts_fts(rowid, fact) VALUES (new.id, new.fact);
    END;
    CREATE TRIGGER IF NOT EXISTS facts_ad AFTER DELETE ON facts BEGIN
      INSERT INTO facts_fts(facts_fts, rowid, fact) VALUES ('delete', old.id, old.fact);
    END;
  `);

  anthropic = new Anthropic({ apiKey: config.anthropicApiKey });
  return db;
}

export function saveMessage(chatId, role, content) {
  db.prepare('INSERT INTO messages (chat_id, role, content) VALUES (?, ?, ?)').run(
    chatId,
    role,
    content
  );
}

export function getRecentHistory(chatId, limit = config.historyWindow) {
  const rows = db
    .prepare('SELECT role, content FROM messages WHERE chat_id = ? ORDER BY id DESC LIMIT ?')
    .all(chatId, limit)
    .reverse();

  // The API requires the first message to be a user turn and roles to make
  // sense as a conversation; drop leading assistant turns after the cut.
  while (rows.length && rows[0].role !== 'user') rows.shift();
  return rows;
}

export function saveFact(fact, source = 'user') {
  const clean = fact.trim();
  if (!clean) return false;
  const res = db
    .prepare('INSERT OR IGNORE INTO facts (fact, source) VALUES (?, ?)')
    .run(clean, source);
  return res.changes > 0;
}

export function listFacts(limit = 200) {
  return db
    .prepare('SELECT fact, source, created_at FROM facts ORDER BY id DESC LIMIT ?')
    .all(limit);
}

export function forgetFacts(term) {
  const res = db.prepare('DELETE FROM facts WHERE fact LIKE ?').run(`%${term}%`);
  return res.changes;
}

function ftsQuery(text) {
  // Turn free text into a safe OR-of-terms FTS5 query.
  const terms = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .slice(0, 12);
  if (!terms.length) return null;
  return terms.map((t) => `"${t}"`).join(' OR ');
}

// Retrieve memory relevant to the incoming message: matching long-term facts
// plus a few older conversation snippets outside the recent-history window.
export function recallRelevant(chatId, text, { factLimit = 8, snippetLimit = 3 } = {}) {
  const q = ftsQuery(text);
  const result = { facts: [], snippets: [] };
  if (!q) {
    result.facts = db.prepare('SELECT fact FROM facts ORDER BY id DESC LIMIT ?').all(factLimit)
      .map((r) => r.fact);
    return result;
  }

  try {
    result.facts = db
      .prepare(
        `SELECT f.fact FROM facts_fts ft JOIN facts f ON f.id = ft.rowid
         WHERE facts_fts MATCH ? ORDER BY rank LIMIT ?`
      )
      .all(q, factLimit)
      .map((r) => r.fact);

    const cutoff = db
      .prepare('SELECT COALESCE(MIN(id), 0) AS min_id FROM (SELECT id FROM messages WHERE chat_id = ? ORDER BY id DESC LIMIT ?)')
      .get(chatId, config.historyWindow).min_id;

    result.snippets = db
      .prepare(
        `SELECT m.role, m.content, m.created_at FROM messages_fts mf
         JOIN messages m ON m.id = mf.rowid
         WHERE messages_fts MATCH ? AND m.chat_id = ? AND m.id < ?
         ORDER BY rank LIMIT ?`
      )
      .all(q, chatId, cutoff, snippetLimit)
      .map((r) => `[${r.created_at}] ${r.role}: ${r.content.slice(0, 300)}`);
  } catch {
    // FTS syntax edge case — fall back to recent facts only.
    result.facts = db.prepare('SELECT fact FROM facts ORDER BY id DESC LIMIT ?').all(factLimit)
      .map((r) => r.fact);
  }
  return result;
}

// Fire-and-forget background fact extraction with the cheapest model.
// Never blocks a reply; failures are logged and dropped.
export function extractFactsInBackground(userMessage, assistantReply, log) {
  const exchange = `User: ${userMessage}\nAssistant: ${assistantReply}`;
  anthropic.messages
    .create({
      model: MODELS.classifier,
      max_tokens: 300,
      system:
        'You extract durable personal facts worth remembering long-term from a chat exchange: ' +
        'preferences, names, dates, projects, locations, recurring commitments, decisions. ' +
        'Ignore small talk, one-off task details, and anything transient. ' +
        'Return a JSON array of short standalone fact strings (empty array if nothing is worth keeping). ' +
        'Each fact must make sense on its own, e.g. "User\'s dog is named Rex".',
      messages: [{ role: 'user', content: exchange }],
      output_config: {
        format: {
          type: 'json_schema',
          schema: {
            type: 'object',
            properties: {
              facts: { type: 'array', items: { type: 'string' } },
            },
            required: ['facts'],
            additionalProperties: false,
          },
        },
      },
    })
    .then((res) => {
      const text = res.content.find((b) => b.type === 'text')?.text || '{"facts":[]}';
      const { facts } = JSON.parse(text);
      let added = 0;
      for (const f of facts.slice(0, 5)) if (saveFact(f, 'auto')) added++;
      if (added && log) log.info({ added }, 'memory: extracted new facts');
    })
    .catch((err) => log?.warn({ err: err.message }, 'memory: fact extraction failed'));
}
