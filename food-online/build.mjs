// Builds the static site into dist/. No framework: pages are plain functions
// returning HTML (src/pages/*.mjs). Run: npm run build
import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync, copyFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname, extname, basename } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const DIST = join(ROOT, 'dist');

// Minimal .env loader (KEY=value lines) so local builds can carry contact details.
const envFile = join(ROOT, '.env');
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}

const { site } = await import('./src/config.mjs');
const layout = await import('./src/layout.mjs');

const write = (rel, content) => {
  const file = join(DIST, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
};
const copyDir = (from, to) => {
  if (!existsSync(from)) return;
  for (const name of readdirSync(from)) {
    const src = join(from, name);
    const dst = join(to, name);
    if (statSync(src).isDirectory()) { mkdirSync(dst, { recursive: true }); copyDir(src, dst); } else copyFileSync(src, dst);
  }
};

rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });

// ---- Photos: media/photos/<slot>.(jpg|jpeg|png|webp|avif) → responsive AVIF/WebP/JPEG
const PHOTO_DIR = join(ROOT, 'media/photos');
const VIDEO_DIR = join(ROOT, 'media/videos');
const media = { photos: {}, videos: {} };
let sharp = null;
try { sharp = (await import('sharp')).default; } catch { /* optional */ }

const photoFiles = existsSync(PHOTO_DIR) ? readdirSync(PHOTO_DIR).filter((f) => /\.(jpe?g|png|webp|avif)$/i.test(f)) : [];
if (photoFiles.length && !sharp) {
  console.warn('! sharp is not installed — run `npm install` to process photos. Photos will be skipped.');
}
if (sharp) {
  mkdirSync(join(DIST, 'img'), { recursive: true });
  for (const file of photoFiles) {
    const slot = basename(file, extname(file));
    const src = join(PHOTO_DIR, file);
    const meta = await sharp(src).rotate().metadata();
    const w0 = meta.autoOrient?.width ?? meta.width;
    const h0 = meta.autoOrient?.height ?? meta.height;
    const widths = [480, 960, 1600].filter((w) => w <= w0);
    if (!widths.length) widths.push(w0);
    for (const w of widths) {
      const base = sharp(src).rotate().resize({ width: w, withoutEnlargement: true });
      await base.clone().avif({ quality: 55, effort: 4 }).toFile(join(DIST, 'img', `${slot}-${w}.avif`));
      await base.clone().webp({ quality: 74 }).toFile(join(DIST, 'img', `${slot}-${w}.webp`));
      await base.clone().jpeg({ quality: 78, mozjpeg: true }).toFile(join(DIST, 'img', `${slot}-${w}.jpg`));
    }
    media.photos[slot] = { widths, formats: ['avif', 'webp', 'jpg'], width: w0, height: h0 };
  }
}

// ---- Videos: media/videos/<slot>.mp4 (+ optional <slot>.jpg poster)
if (existsSync(VIDEO_DIR)) {
  for (const file of readdirSync(VIDEO_DIR).filter((f) => f.toLowerCase().endsWith('.mp4'))) {
    const slot = basename(file, '.mp4');
    mkdirSync(join(DIST, 'video'), { recursive: true });
    copyFileSync(join(VIDEO_DIR, file), join(DIST, 'video', file));
    const poster = join(VIDEO_DIR, `${slot}.jpg`);
    if (existsSync(poster)) copyFileSync(poster, join(DIST, 'video', `${slot}.jpg`));
    media.videos[slot] = { poster: existsSync(poster) };
  }
}
layout.setMedia(media);

// ---- Assets (cache-busted by content hash)
const css = readFileSync(join(ROOT, 'src/assets/fonts.css'), 'utf8') + readFileSync(join(ROOT, 'src/assets/styles.css'), 'utf8');
const js = readFileSync(join(ROOT, 'src/assets/main.js'), 'utf8');
const V = createHash('sha256').update(css + js).digest('hex').slice(0, 10);
write('assets/styles.css', css);
write('assets/main.js', js);
copyDir(join(ROOT, 'src/static'), DIST);

// ---- Pages
const pages = [
  ['index.html', '/', (await import('./src/pages/home.mjs')).default],
  ['virtual-kitchens/index.html', '/virtual-kitchens/', (await import('./src/pages/virtual-kitchens.mjs')).default],
  ['express/index.html', '/express/', (await import('./src/pages/express.mjs')).default],
  ['point-of-sale/index.html', '/point-of-sale/', (await import('./src/pages/point-of-sale.mjs')).default],
  ['ai/index.html', '/ai/', (await import('./src/pages/ai.mjs')).default],
  ['contact/index.html', '/contact/', (await import('./src/pages/contact.mjs')).default],
];
const legal = await import('./src/pages/legal.mjs');
pages.push(['privacy/index.html', '/privacy/', legal.privacy], ['terms/index.html', '/terms/', legal.terms], ['404.html', null, legal.notFound]);

const inlineScripts = new Set();
for (const [file, , render] of pages) {
  const html = render().replaceAll('__V__', V);
  for (const m of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) inlineScripts.add(m[1]);
  write(file, html);
}

// ---- sitemap.xml + robots.txt
const today = new Date().toISOString().slice(0, 10);
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.filter(([, p]) => p).map(([, p]) => `  <url><loc>${site.url}${p}</loc><lastmod>${today}</lastmod><priority>${p === '/' ? '1.0' : p.match(/privacy|terms/) ? '0.3' : '0.8'}</priority></url>`).join('\n')}
</urlset>
`);
write('robots.txt', `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${site.url}/sitemap.xml\n`);

// ---- Security + caching headers (Cloudflare Pages _headers)
const hashes = [...inlineScripts].map((s) => `'sha256-${createHash('sha256').update(s).digest('base64')}'`).join(' ');
const csp = [
  "default-src 'self'",
  `script-src 'self' ${hashes} https://challenges.cloudflare.com https://static.cloudflareinsights.com`,
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "img-src 'self' data:",
  "media-src 'self'",
  "connect-src 'self' https://cloudflareinsights.com",
  'frame-src https://challenges.cloudflare.com',
  "form-action 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
].join('; ');
write('_headers', `/*
  Content-Security-Policy: ${csp}
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()
  Strict-Transport-Security: max-age=31536000
  X-Frame-Options: DENY

/assets/*
  Cache-Control: public, max-age=31536000, immutable

/fonts/*
  Cache-Control: public, max-age=31536000, immutable

/img/*
  Cache-Control: public, max-age=2592000

/video/*
  Cache-Control: public, max-age=2592000
`);

// ---- Media checklist (for whoever supplies photos and videos)
const row = (kind, slot, note) => `| \`${slot}\` | ${note} | ${(kind === 'photos' ? media.photos : media.videos)[slot] ? '✅ supplied' : '⏳ placeholder'} |`;
writeFileSync(join(ROOT, 'media/SLOTS.md'), `# Photo and video slots

Generated by \`npm run build\` — do not edit by hand.

Drop a file named after the slot into \`media/photos/\` (any of .jpg .jpeg .png
.webp .avif, at least 1600px wide is ideal) or \`media/videos/\` (.mp4, plus an
optional .jpg poster with the same name), then rebuild and deploy. Nothing else
needs changing.

## Photos (${Object.keys(media.photos).length}/${layout.usedSlots.photos.size} supplied)

| Slot | What to shoot | Status |
|---|---|---|
${[...layout.usedSlots.photos].map(([s, n]) => row('photos', s, n)).join('\n')}

## Videos (${Object.keys(media.videos).length}/${layout.usedSlots.videos.size} supplied)

| Slot | What | Status |
|---|---|---|
${[...layout.usedSlots.videos].map(([s, n]) => row('videos', s, n)).join('\n')}
`);

console.log(`Built ${pages.length} pages → dist/  (assets v=${V}; photos ${Object.keys(media.photos).length}/${layout.usedSlots.photos.size}, videos ${Object.keys(media.videos).length}/${layout.usedSlots.videos.size})`);
