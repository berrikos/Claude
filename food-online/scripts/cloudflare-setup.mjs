// One-time (and safe to re-run) Cloudflare setup + deploy for food-online.org.
//
//   CLOUDFLARE_API_TOKEN=… CLOUDFLARE_ACCOUNT_ID=… node scripts/cloudflare-setup.mjs
//
// Token permissions: Account › Cloudflare Pages: Edit, Account › Workers KV Storage: Edit,
// Zone › DNS: Edit, Zone › Single Redirect (Dynamic Redirect): Edit, Zone › Zone: Read
// (zone permissions for food-online.org).
//
// It: creates the Pages project → builds and deploys dist/ → attaches food-online.org
// and www.food-online.org → makes sure both DNS records point at Pages → adds a
// 301 redirect from www to the apex. HTTPS certificates are issued by Cloudflare.
import { execSync } from 'node:child_process';

const TOKEN = process.env.CLOUDFLARE_API_TOKEN;
let ACCOUNT = process.env.CLOUDFLARE_ACCOUNT_ID;
const PROJECT = 'food-online';
const APEX = 'food-online.org';
const WWW = `www.${APEX}`;
if (!TOKEN) throw new Error('Set CLOUDFLARE_API_TOKEN');

const api = async (path, init = {}) => {
  const res = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json', ...init.headers },
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok && body.success !== false, status: res.status, body };
};
const step = (s) => console.log(`\n▸ ${s}`);

if (!ACCOUNT) {
  const r = await api('/accounts');
  ACCOUNT = r.body.result?.[0]?.id;
  if (!ACCOUNT) throw new Error('Could not find the account id; set CLOUDFLARE_ACCOUNT_ID');
}

step(`Pages project "${PROJECT}"`);
const existing = await api(`/accounts/${ACCOUNT}/pages/projects/${PROJECT}`);
if (existing.ok) console.log('  exists');
else {
  const c = await api(`/accounts/${ACCOUNT}/pages/projects`, { method: 'POST', body: JSON.stringify({ name: PROJECT, production_branch: 'main' }) });
  if (!c.ok) throw new Error(`Create project failed: ${JSON.stringify(c.body.errors)}`);
  console.log('  created');
}

step('Build and deploy');
execSync(`npx wrangler pages deploy dist --project-name ${PROJECT} --branch main --commit-dirty=true`, {
  stdio: 'inherit',
  env: { ...process.env, CLOUDFLARE_ACCOUNT_ID: ACCOUNT },
});

step('Custom domains');
for (const name of [APEX, WWW]) {
  const r = await api(`/accounts/${ACCOUNT}/pages/projects/${PROJECT}/domains`, { method: 'POST', body: JSON.stringify({ name }) });
  console.log(`  ${name}: ${r.ok ? 'added' : (r.body.errors?.[0]?.message || r.status)}`);
}

step(`Zone ${APEX}`);
const z = await api(`/zones?name=${APEX}`);
const zone = z.body.result?.[0];
if (!zone) {
  console.log(`  ${APEX} is not a zone in this Cloudflare account (or the token can't see it).
  Add the domain in Cloudflare (Websites → Add a site), switch the registrar's nameservers
  to the two Cloudflare gives you, then re-run this script.`);
  process.exit(0);
}
console.log(`  status: ${zone.status}${zone.status !== 'active' ? ' — nameservers: ' + zone.name_servers.join(', ') : ''}`);

for (const name of [APEX, WWW]) {
  const list = await api(`/zones/${zone.id}/dns_records?name=${name}`);
  const recs = list.body.result || [];
  const target = `${PROJECT}.pages.dev`;
  if (recs.some((r) => r.type === 'CNAME' && r.content === target)) { console.log(`  DNS ${name}: ok`); continue; }
  if (recs.length) { console.log(`  DNS ${name}: has other records (${recs.map((r) => `${r.type} ${r.content}`).join(', ')}) — left alone, please check`); continue; }
  const r = await api(`/zones/${zone.id}/dns_records`, { method: 'POST', body: JSON.stringify({ type: 'CNAME', name, content: target, proxied: true, ttl: 1 }) });
  console.log(`  DNS ${name}: ${r.ok ? 'created' : JSON.stringify(r.body.errors)}`);
}

step('Redirect www → apex (301)');
const rule = {
  description: 'www.food-online.org → food-online.org',
  expression: `(http.host eq "${WWW}")`,
  action: 'redirect',
  action_parameters: { from_value: { status_code: 301, preserve_query_string: true, target_url: { expression: `concat("https://${APEX}", http.request.uri.path)` } } },
};
const ep = await api(`/zones/${zone.id}/rulesets/phases/http_request_dynamic_redirect/entrypoint`);
const rules = (ep.body.result?.rules || []).filter((r) => r.description !== rule.description).map(({ id, version, last_updated, ref, ...r }) => r);
const put = await api(`/zones/${zone.id}/rulesets/phases/http_request_dynamic_redirect/entrypoint`, { method: 'PUT', body: JSON.stringify({ rules: [...rules, rule] }) });
console.log(`  ${put.ok ? 'in place' : JSON.stringify(put.body.errors)}`);

step('Always use HTTPS');
const https = await api(`/zones/${zone.id}/settings/always_use_https`, { method: 'PATCH', body: JSON.stringify({ value: 'on' }) });
console.log(`  ${https.ok ? 'on' : JSON.stringify(https.body.errors)}`);

console.log(`\nDone. Preview: https://${PROJECT}.pages.dev — live: https://${APEX} once DNS is active and the certificate is issued (usually minutes).`);
