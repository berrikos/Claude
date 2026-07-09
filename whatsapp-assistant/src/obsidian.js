import fs from 'fs';
import path from 'path';
import { config } from './config.js';

// Obsidian vault as the long-term brain. Everything is plain markdown the
// user can read and edit in Obsidian:
//
//   <vault>/<Assistant>/Facts.md            — one remembered fact per bullet
//   <vault>/<Assistant>/Chat Log/<date>.md  — daily conversation log
//
// Recall searches the ENTIRE vault (the user's own notes included), so the
// assistant can answer from knowledge the user wrote themselves.

let vaultDir;
let assistantDir;
let factsPath;
let chatLogDir;

// mtime-validated content cache so repeated recalls don't re-read the vault.
const fileCache = new Map(); // absPath -> { mtimeMs, content }
let fileList = [];
let fileListRefreshedAt = 0;
const FILE_LIST_TTL_MS = 60_000;
const MAX_FILE_BYTES = 512 * 1024; // skip giant notes
const SKIP_DIRS = new Set(['.obsidian', '.trash', '.git', 'node_modules']);

export function isObsidianEnabled() {
  return Boolean(config.obsidianVault);
}

export function initObsidian() {
  vaultDir = path.resolve(config.obsidianVault);
  if (!fs.existsSync(vaultDir)) {
    throw new Error(`OBSIDIAN_VAULT points to a non-existent path: ${vaultDir}`);
  }
  assistantDir = path.join(vaultDir, config.obsidianFolder);
  chatLogDir = path.join(assistantDir, 'Chat Log');
  factsPath = path.join(assistantDir, 'Facts.md');
  fs.mkdirSync(chatLogDir, { recursive: true });
  if (!fs.existsSync(factsPath)) {
    fs.writeFileSync(
      factsPath,
      '# Assistant Memory — Facts\n\n' +
        'One fact per bullet. The assistant reads and writes this file; feel free to edit it yourself.\n\n'
    );
  }
  return { vaultDir, factsPath };
}

// ---------- facts (stored in Facts.md) ----------

function readFactLines() {
  const content = fs.readFileSync(factsPath, 'utf8');
  return content.split('\n');
}

function factFromLine(line) {
  const m = line.match(/^\s*[-*]\s+(.*)$/);
  return m ? m[1].replace(/<!--.*?-->/g, '').trim() : null;
}

export function obsidianSaveFact(fact, source = 'user') {
  const clean = fact.trim();
  if (!clean) return false;
  const existing = readFactLines().map(factFromLine).filter(Boolean);
  const lc = clean.toLowerCase();
  if (existing.some((f) => f.toLowerCase() === lc)) return false;
  const stamp = new Date().toISOString().slice(0, 10);
  fs.appendFileSync(factsPath, `- ${clean} <!-- ${source} ${stamp} -->\n`);
  return true;
}

export function obsidianListFacts(limit = 200) {
  return readFactLines()
    .map(factFromLine)
    .filter(Boolean)
    .slice(-limit)
    .reverse()
    .map((fact) => ({ fact, source: 'vault', created_at: '' }));
}

export function obsidianForgetFacts(term) {
  const lines = readFactLines();
  const lc = term.toLowerCase();
  let removed = 0;
  const kept = lines.filter((line) => {
    const fact = factFromLine(line);
    if (fact && fact.toLowerCase().includes(lc)) {
      removed++;
      return false;
    }
    return true;
  });
  if (removed) fs.writeFileSync(factsPath, kept.join('\n'));
  return removed;
}

export function obsidianRecallFacts(terms, limit = 8) {
  const facts = readFactLines().map(factFromLine).filter(Boolean);
  if (!terms.length) return facts.slice(-limit).reverse();
  const scored = facts
    .map((fact) => {
      const lc = fact.toLowerCase();
      const score = terms.reduce((s, t) => s + (lc.includes(t) ? 1 : 0), 0);
      return { fact, score };
    })
    .filter((f) => f.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((f) => f.fact);
}

// ---------- chat log (daily notes) ----------

export function obsidianAppendChatLog(role, text) {
  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  const time = now.toTimeString().slice(0, 5);
  const file = path.join(chatLogDir, `${day}.md`);
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, `# Chat Log — ${day}\n\n`);
  }
  const who = role === 'user' ? 'You' : config.assistantName;
  const clean = text.replace(/\r/g, '').trim();
  fs.appendFileSync(file, `**${time} ${who}:** ${clean}\n\n`);
}

// ---------- whole-vault search ----------

function listVaultFiles() {
  const now = Date.now();
  if (fileList.length && now - fileListRefreshedAt < FILE_LIST_TTL_MS) return fileList;
  const out = [];
  const walk = (dir) => {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (e.name.startsWith('.') || SKIP_DIRS.has(e.name)) continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.isFile() && e.name.endsWith('.md')) out.push(p);
    }
  };
  walk(vaultDir);
  fileList = out;
  fileListRefreshedAt = now;
  return out;
}

function readCached(absPath) {
  let stat;
  try {
    stat = fs.statSync(absPath);
  } catch {
    return null;
  }
  if (stat.size > MAX_FILE_BYTES) return null;
  const cached = fileCache.get(absPath);
  if (cached && cached.mtimeMs === stat.mtimeMs) return cached.content;
  try {
    const content = fs.readFileSync(absPath, 'utf8');
    fileCache.set(absPath, { mtimeMs: stat.mtimeMs, content });
    return content;
  } catch {
    return null;
  }
}

// Search the vault for notes matching the query terms; return the best few
// as "note name + matched excerpt" snippets for the prompt.
export function obsidianSearchVault(terms, { noteLimit = 3, excerptChars = 280 } = {}) {
  if (!terms.length) return [];
  const chatLogPrefix = chatLogDir + path.sep;
  const results = [];

  for (const file of listVaultFiles()) {
    // The chat log is already covered by conversation recall; facts are
    // injected separately.
    if (file.startsWith(chatLogPrefix) || file === factsPath) continue;
    const content = readCached(file);
    if (!content) continue;
    const lc = content.toLowerCase();

    let score = 0;
    let firstHit = -1;
    for (const t of terms) {
      let idx = lc.indexOf(t);
      let hits = 0;
      while (idx !== -1 && hits < 20) {
        hits++;
        if (firstHit === -1 || idx < firstHit) firstHit = idx;
        idx = lc.indexOf(t, idx + t.length);
      }
      score += hits;
    }
    if (score === 0) continue;

    const start = Math.max(0, firstHit - 60);
    const excerpt = content
      .slice(start, start + excerptChars)
      .replace(/\s+/g, ' ')
      .trim();
    const name = path.relative(vaultDir, file).replace(/\.md$/, '');
    results.push({ name, score, excerpt });
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, noteLimit).map((r) => `[[${r.name}]]: ${r.excerpt}`);
}
