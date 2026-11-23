// Renders the favicon set and the Open Graph share image from the logo SVG,
// using the headless Chromium that Playwright provides. Output: src/static/.
// Run once after changing the logo or the headline: npm run icons
import { writeFileSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'src/static');
const { LOGO_MARK } = await import('../src/layout.mjs');

const svg = LOGO_MARK.replace(' aria-hidden="true" focusable="false"', '');
writeFileSync(join(OUT, 'favicon.svg'), svg + '\n');

const browser = await chromium.launch();
const shot = async (html, w, h, file) => {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><html><head><style>html,body{margin:0;width:${w}px;height:${h}px;overflow:hidden}</style>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,700&family=Jost:wght@500;600&display=block"></head><body>${html}</body></html>`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const buf = await page.screenshot({ type: 'png', omitBackground: file.includes('favicon') });
  writeFileSync(join(OUT, file), buf);
  await page.close();
  return buf;
};

const square = (size, pad = 0, bg = 'transparent') =>
  `<div style="width:${size}px;height:${size}px;background:${bg};display:grid;place-items:center">${svg.replace('<svg', `<svg width="${size - pad * 2}" height="${size - pad * 2}"`)}</div>`;

const fav32 = await shot(square(32), 32, 32, 'favicon-32.png');
await shot(square(180, 14, '#2A1D17'), 180, 180, 'apple-touch-icon.png');
await shot(square(192, 16, '#2A1D17'), 192, 192, 'icon-192.png');
await shot(square(512, 40, '#2A1D17'), 512, 512, 'icon-512.png');
await shot(square(512), 512, 512, 'logo.png');

// favicon.ico holding a single 32×32 PNG.
const header = Buffer.alloc(22);
header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(1, 4);
header.writeUInt8(32, 6); header.writeUInt8(32, 7); header.writeUInt8(0, 8); header.writeUInt8(0, 9);
header.writeUInt16LE(1, 10); header.writeUInt16LE(32, 12); header.writeUInt32LE(fav32.length, 14); header.writeUInt32LE(22, 18);
writeFileSync(join(OUT, 'favicon.ico'), Buffer.concat([header, fav32]));

// Open Graph image, 1200×630.
await shot(`<div style="position:relative;width:1200px;height:630px;background:#2A1D17;color:#F5EEE3;font-family:Jost,sans-serif;overflow:hidden">
  <div style="position:absolute;right:-180px;top:-220px;width:760px;height:760px;border-radius:50%;background:radial-gradient(circle,rgba(196,85,45,.55),rgba(196,85,45,0) 65%)"></div>
  <svg style="position:absolute;right:70px;top:70px;opacity:.9" width="260" height="260" viewBox="0 0 120 120"><path d="M67.7 30.4 A40 40 0 0 1 91.6 54.3" fill="none" stroke="#D4B06A" stroke-width="5" stroke-linecap="round"/><path d="M76 20.9 A52 52 0 0 1 101.1 46" fill="none" stroke="#D4B06A" stroke-width="5" stroke-linecap="round" opacity=".6"/></svg>
  <div style="position:absolute;left:80px;top:72px;display:flex;align-items:center;gap:18px">
    ${svg.replace('<svg', '<svg width="76" height="76"')}
    <span style="font:700 46px/1 Fraunces,serif">Food <span style="color:#D4B06A">Online</span></span>
  </div>
  <h1 style="position:absolute;left:80px;top:205px;margin:0;width:900px;font:700 78px/1.04 Fraunces,serif;letter-spacing:-1px">Grow your food business with one partner.</h1>
  <p style="position:absolute;left:80px;bottom:70px;margin:0;font:500 27px/1.3 Jost,sans-serif;color:#D9CBB6">Kitchen · Food · Point of sale · AI — built in real kitchens.</p>
  <div style="position:absolute;left:0;bottom:0;width:1200px;height:10px;background:#C4552D"></div>
</div>`, 1200, 630, 'og.png');

await browser.close();
console.log('Icons and og.png written to src/static/');
