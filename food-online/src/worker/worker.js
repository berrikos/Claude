// Cloudflare Worker that serves food-online.org.
// The built site (dist/) is bundled into ./assets.js by scripts/deploy.mjs;
// photos and videos are served from the R2 bucket bound as MEDIA.
import ASSETS from './assets.js';
import CONFIG from './config.js';
import { onRequestPost as enquiry } from './enquiry.js';

const APEX = 'food-online.org';
const decoded = new Map();
const bytes = (key) => {
  if (!decoded.has(key)) {
    const bin = atob(ASSETS[key][1]);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    decoded.set(key, out);
  }
  return decoded.get(key);
};

function headersFor(path, type) {
  const h = new Headers({ 'Content-Type': type });
  for (const [prefix, set] of CONFIG.headers) {
    if (prefix === '/*' || path.startsWith(prefix)) for (const [k, v] of Object.entries(set)) h.set(k, v);
  }
  if (!h.has('Cache-Control')) h.set('Cache-Control', type.startsWith('text/html') ? 'public, max-age=0, must-revalidate' : 'public, max-age=3600');
  return h;
}

function serveAsset(request, key, status = 200) {
  const [type, , etag] = ASSETS[key];
  const h = headersFor(key, type);
  h.set('ETag', `"${etag}"`);
  if (status === 200 && request.headers.get('If-None-Match') === `"${etag}"`) return new Response(null, { status: 304, headers: h });
  return new Response(request.method === 'HEAD' ? null : bytes(key), { status, headers: h });
}

async function serveMedia(request, env, key) {
  if (!env.MEDIA) return null;
  const obj = await env.MEDIA.get(key, { range: request.headers, onlyIf: request.headers });
  if (!obj) return null;
  const h = headersFor('/' + key, obj.httpMetadata?.contentType || 'application/octet-stream');
  obj.writeHttpMetadata(h);
  h.set('ETag', obj.httpEtag);
  h.set('Accept-Ranges', 'bytes');
  if (!('body' in obj)) return new Response(null, { status: 304, headers: h });
  if (obj.range) {
    const { offset = 0, length = obj.size - offset } = obj.range;
    h.set('Content-Range', `bytes ${offset}-${offset + length - 1}/${obj.size}`);
    h.set('Content-Length', String(length));
    return new Response(obj.body, { status: 206, headers: h });
  }
  return new Response(request.method === 'HEAD' ? null : obj.body, { headers: h });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname === `www.${APEX}`) return Response.redirect(`https://${APEX}${url.pathname}${url.search}`, 301);
    if (url.protocol === 'http:') { url.protocol = 'https:'; return Response.redirect(url.toString(), 301); }

    if (url.pathname === '/api/enquiry') {
      if (request.method === 'POST') return enquiry({ request, env });
      return new Response('Method not allowed', { status: 405, headers: { Allow: 'POST' } });
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });

    const redirect = CONFIG.redirects[url.pathname];
    if (redirect) return Response.redirect(new URL(redirect[0], url).toString(), redirect[1]);

    let path;
    try { path = decodeURIComponent(url.pathname); } catch { path = url.pathname; }

    if (path.startsWith('/img/') || path.startsWith('/video/')) {
      const res = await serveMedia(request, env, path.slice(1));
      if (res) return res;
    }

    if (path.endsWith('/index.html')) return Response.redirect(url.origin + path.slice(0, -10) + url.search, 301);
    const key = path.endsWith('/') ? `${path}index.html` : path;
    if (ASSETS[key]) return serveAsset(request, key);
    if (ASSETS[`${path}/index.html`]) return Response.redirect(`${url.origin}${path}/${url.search}`, 301);
    return serveAsset(request, '/404.html', 404);
  },
};
