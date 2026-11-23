// Builds nothing — run `npm run build` first (or use `npm run deploy`, which does both).
// Uploads dist/ to Cloudflare as the Worker "food-online" through the Cloudflare API,
// and on first run wires food-online.org and www.food-online.org to it.
//
//   CLOUDFLARE_API_TOKEN=… node scripts/deploy.mjs
//
// Why a Worker and not wrangler/Pages: everything goes through plain API calls
// authenticated by the one API token, so it works from any machine — including
// cloud sessions whose proxy injects the token. Photos and videos (dist/img,
// dist/video) go to the R2 bucket "food-online-media"; everything else is bundled
// into the Worker itself (a few hundred KB).
//
// Token permissions: Account › Workers Scripts: Edit, Workers KV Storage: Edit,
// Workers R2 Storage: Edit; Zone (food-online.org) › Workers Routes: Edit, DNS: Edit.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const ACCOUNT = process.env.CLOUDFLARE_ACCOUNT_ID || '9d9bca1054805607496483574408d28d';
const SCRIPT = 'food-online';
const APEX = 'food-online.org';
const KV_ID = '7a5d073bb5384568bdcdef94380ec8ea'; // "food-online-enquiries"
const BUCKET = 'food-online-media';
const COMPAT = '2026-11-01';
const OUT = process.argv.includes('--out') ? process.argv[process.argv.indexOf('--out') + 1] : null; // write the bundle locally instead of deploying
if (!TOKEN && !OUT) throw new Error('Set CLOUDFLARE_API_TOKEN');
if (!existsSync(join(DIST, 'index.html'))) throw new Error('Run npm run build first');

const api = async (path, init = {}) => {
  const res = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${TOKEN}`, ...(init.body && !(init.body instanceof FormData) && typeof init.body === 'string' ? { 'Content-Type': 'application/json' } : {}), ...init.headers },
  });
  const text = await res.text();
  let body; try { body = JSON.parse(text); } catch { body = { raw: text }; }
  return { ok: res.ok && body.success !== false, status: res.status, body };
};
const must = (r, what) => { if (!r.ok) throw new Error(`${what} failed (${r.status}): ${JSON.stringify(r.body.errors || r.body.raw || r.body).slice(0, 400)}`); return r.body.result; };
const step = (s) => console.log(`\n▸ ${s}`);

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.woff2': 'font/woff2', '.mp4': 'video/mp4',
};
const walk = (dir, base = '') => readdirSync(dir).flatMap((n) => {
  const p = join(dir, n);
  return statSync(p).isDirectory() ? walk(p, `${base}/${n}`) : [`${base}/${n}`];
});

// ---- Collect files
const files = walk(DIST);
const media = files.filter((f) => f.startsWith('/img/') || f.startsWith('/video/'));
const site = files.filter((f) => !media.includes(f) && !['/_headers', '/_redirects'].includes(f));

const assets = {};
for (const f of site) {
  const buf = readFileSync(join(DIST, f));
  assets[f] = [TYPES[extname(f)] || 'application/octet-stream', buf.toString('base64'), createHash('sha1').update(buf).digest('hex').slice(0, 16)];
}

// _headers → [[prefix, {header: value}]]; _redirects → {from: [to, status]}
const headers = [];
let cur = null;
for (const line of readFileSync(join(DIST, '_headers'), 'utf8').split('\n')) {
  if (!line.trim()) continue;
  if (!/^\s/.test(line)) { cur = {}; headers.push([line.trim().replace(/\*$/, '') || '/*', cur]); if (line.trim() === '/*') headers[headers.length - 1][0] = '/*'; continue; }
  const i = line.indexOf(':');
  cur[line.slice(0, i).trim()] = line.slice(i + 1).trim();
}
const redirects = {};
if (existsSync(join(DIST, '_redirects'))) {
  for (const line of readFileSync(join(DIST, '_redirects'), 'utf8').split('\n')) {
    const [from, to, status] = line.trim().split(/\s+/);
    if (from && to) redirects[from] = [to, Number(status) || 301];
  }
}

if (OUT) {
  const { mkdirSync, writeFileSync } = await import('node:fs');
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, 'worker.js'), readFileSync(join(ROOT, 'src/worker/worker.js')));
  writeFileSync(join(OUT, 'enquiry.js'), readFileSync(join(ROOT, 'functions/api/enquiry.js')));
  writeFileSync(join(OUT, 'config.js'), `export default ${JSON.stringify({ headers, redirects })};`);
  writeFileSync(join(OUT, 'assets.js'), `export default ${JSON.stringify(assets)};`);
  console.log(`Bundle written to ${OUT}`);
  process.exit(0);
}

// ---- Media → R2
if (media.length) {
  step(`Photos and videos → R2 bucket "${BUCKET}" (${media.length} files)`);
  const b = await api(`/accounts/${ACCOUNT}/r2/buckets/${BUCKET}`);
  if (!b.ok) must(await api(`/accounts/${ACCOUNT}/r2/buckets`, { method: 'POST', body: JSON.stringify({ name: BUCKET }) }), 'Create bucket');
  for (const f of media) {
    const r = await api(`/accounts/${ACCOUNT}/r2/buckets/${BUCKET}/objects/${encodeURIComponent(f.slice(1))}`, {
      method: 'PUT', body: readFileSync(join(DIST, f)), headers: { 'Content-Type': TYPES[extname(f)] || 'application/octet-stream' },
    });
    must(r, `Upload ${f}`);
  }
  console.log('  uploaded');
}

// ---- Worker
step(`Worker "${SCRIPT}" (${site.length} files bundled)`);
const form = new FormData();
const mod = (name, code) => form.append(name, new Blob([code], { type: 'application/javascript+module' }), name);
const bindings = [{ type: 'kv_namespace', name: 'ENQUIRIES', namespace_id: KV_ID }];
if (media.length) bindings.push({ type: 'r2_bucket', name: 'MEDIA', bucket_name: BUCKET });
for (const [k, v] of Object.entries({ ENQUIRY_FROM: process.env.ENQUIRY_FROM || 'Food Online <enquiries@food-online.org>', ENQUIRY_TO: process.env.ENQUIRY_TO || '' })) {
  if (v) bindings.push({ type: 'plain_text', name: k, text: v });
}
form.append('metadata', new Blob([JSON.stringify({
  main_module: 'worker.js',
  compatibility_date: COMPAT,
  bindings,
  keep_bindings: ['secret_text'], // RESEND_API_KEY / TURNSTILE_SECRET_KEY set in the dashboard survive redeploys
  observability: { enabled: true },
})], { type: 'application/json' }));
mod('worker.js', readFileSync(join(ROOT, 'src/worker/worker.js'), 'utf8'));
mod('enquiry.js', readFileSync(join(ROOT, 'functions/api/enquiry.js'), 'utf8'));
mod('config.js', `export default ${JSON.stringify({ headers, redirects })};`);
mod('assets.js', `export default ${JSON.stringify(assets)};`);
const up = must(await api(`/accounts/${ACCOUNT}/workers/scripts/${SCRIPT}`, { method: 'PUT', body: form }), 'Upload worker');
console.log(`  deployed (etag ${String(up?.etag || '').slice(0, 12)})`);

// ---- Domain wiring (idempotent)
step('Domain');
const zone = must(await api(`/zones?name=${APEX}`), 'Find zone')[0];
if (!zone) throw new Error(`${APEX} is not a zone in this account`);
const routes = must(await api(`/zones/${zone.id}/workers/routes`), 'List routes');
for (const pattern of [`${APEX}/*`, `www.${APEX}/*`]) {
  const existing = routes.find((r) => r.pattern === pattern);
  if (existing?.script === SCRIPT) { console.log(`  route ${pattern}: ok`); continue; }
  if (existing) { console.log(`  route ${pattern}: points at "${existing.script}" — left alone, please check`); continue; }
  must(await api(`/zones/${zone.id}/workers/routes`, { method: 'POST', body: JSON.stringify({ pattern, script: SCRIPT }) }), `Add route ${pattern}`);
  console.log(`  route ${pattern}: added`);
}
// The apex needs a proxied DNS record for the route to run; www gets a placeholder (the Worker answers it).
for (const name of [APEX, `www.${APEX}`]) {
  const recs = must(await api(`/zones/${zone.id}/dns_records?name=${name}`), 'List DNS');
  const web = recs.filter((r) => ['A', 'AAAA', 'CNAME'].includes(r.type));
  if (web.some((r) => r.proxied)) { console.log(`  DNS ${name}: ok (proxied)`); continue; }
  if (web.length) { console.log(`  DNS ${name}: exists but not proxied — please turn on the orange cloud`); continue; }
  must(await api(`/zones/${zone.id}/dns_records`, { method: 'POST', body: JSON.stringify({ type: 'AAAA', name, content: '100::', proxied: true, ttl: 1, comment: 'Served by the food-online Worker' }) }), `Add DNS ${name}`);
  console.log(`  DNS ${name}: added`);
}

console.log(`\nLive: https://${APEX}  (www.${APEX} → 301 to the apex)`);
