import { site, offerings } from './config.mjs';

// ---------------------------------------------------------------------------
// Media registry — filled by build.mjs from media/photos and media/videos.
// A slot with no file renders a branded placeholder, so the site is complete
// before the photos arrive and nothing changes in the markup when they do.
// ---------------------------------------------------------------------------
let media = { photos: {}, videos: {} };
export const usedSlots = { photos: new Map(), videos: new Map() };
export function setMedia(m) { media = m; }
export const hasVideo = (slot) => Boolean(media.videos[slot]);

export const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const LOGO_MARK = `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><rect width="120" height="120" rx="30" fill="#C4552D"/><circle cx="54" cy="68" r="27" fill="none" stroke="#F5EEE3" stroke-width="11"/><path d="M67.7 30.4 A40 40 0 0 1 91.6 54.3" fill="none" stroke="#D4B06A" stroke-width="8" stroke-linecap="round"/><path d="M76 20.9 A52 52 0 0 1 101.1 46" fill="none" stroke="#D4B06A" stroke-width="8" stroke-linecap="round"/></svg>`;

export const logo = (cls = '') =>
  `<a class="logo ${cls}" href="/" aria-label="Food Online — home">${LOGO_MARK}<span class="logo-word">Food <b>Online</b></span></a>`;

// Simple line icons (24×24, stroke = currentColor).
const ICONS = {
  burger: '<path d="M4 10c0-3.3 3.6-6 8-6s8 2.7 8 6z"/><path d="M3 14h18"/><path d="M4 17.5h16a0 0 0 0 1 0 0c0 1.4-1.1 2.5-2.5 2.5h-11C5.1 20 4 18.9 4 17.5z"/>',
  cup: '<path d="M4 8h13v5a6 6 0 0 1-6 6h-1a6 6 0 0 1-6-6z"/><path d="M17 10h1.5a2.5 2.5 0 0 1 0 5H17"/><path d="M8 3c0 1 1 1.5 1 2.5M12 3c0 1 1 1.5 1 2.5"/>',
  phone: '<rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M10.5 18.5h3"/>',
  screen: '<rect x="2.5" y="4" width="19" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9.5h8M8 12.5h5"/>',
  box: '<path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z"/><path d="M3 7.5 12 12l9-4.5M12 12v9"/>',
  snow: '<path d="M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7"/><path d="m9 4 3 2 3-2M9 20l3-2 3 2"/>',
  pan: '<path d="M3 10.5C3 7 7 5 12 5s9 2 9 5.5V12H3z"/><path d="M3 15h18"/><path d="M4 18.5h16"/><path d="M7 12c.8 1.3 1.6 1.3 2.4 0s1.6-1.3 2.4 0 1.6 1.3 2.4 0 1.6-1.3 2.4 0"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
  store: '<path d="M3 9 5 4h14l2 5"/><path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/><path d="M5 12v8h14v-8M10 20v-5h4v5"/>',
  kitchen: '<path d="M6 3v7a3 3 0 0 0 6 0V3M9 3v18"/><path d="M17 3c-2 2-2 6 0 8v10"/>',
  play: '<path d="M8 5v14l11-7z"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 6 8.5 7 8.5-7"/>',
  cart: '<path d="M3 4h2l2.5 11h11L21 7H6.2"/><circle cx="9" cy="19.5" r="1.3"/><circle cx="17" cy="19.5" r="1.3"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/>',
  report: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h5"/>',
  routine: '<path d="M4 12a8 8 0 0 1 14-5.3L20 9"/><path d="M20 4v5h-5M20 12a8 8 0 0 1-14 5.3L4 15"/><path d="M4 20v-5h5"/>',
  till: '<rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V5h10v6M7 15h2M11 15h2M15 15h2M7 18h10"/>',
  tv: '<rect x="2" y="4" width="20" height="13" rx="2"/><path d="M7 21h10"/><path d="M6 8h5M6 11h8"/>',
  office: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>',
  pin: '<path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  wave: '<path d="M7 11V6a1.5 1.5 0 0 1 3 0v5M10 10V4.5a1.5 1.5 0 0 1 3 0V10M13 10V5.5a1.5 1.5 0 0 1 3 0V12"/><path d="M16 9a1.5 1.5 0 0 1 3 0v4a8 8 0 0 1-8 8h-.5A6.5 6.5 0 0 1 5 17.6L3.4 14a1.5 1.5 0 0 1 2.6-1.5L7 14"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6"/>',
  bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  tag: '<path d="M3 12V3h9l9 9-9 9z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
};
export const icon = (name, cls = 'ic') =>
  `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICONS[name] || ''}</svg>`;

// ---------------------------------------------------------------------------
// Photo slot. `slot` is the file name to drop into media/photos/ (any of
// .jpg .jpeg .png .webp .avif). `note` describes the shot wanted.
// ---------------------------------------------------------------------------
export function photo(slot, { alt, note = alt, ratio = '4/3', sizes = '(min-width: 1100px) 33vw, (min-width: 700px) 50vw, 100vw', eager = false, icon: ic = 'pan', tone = 'warm', cls = '' } = {}) {
  usedSlots.photos.set(slot, note);
  const style = `style="aspect-ratio:${ratio}"`;
  const p = media.photos[slot];
  if (p) {
    const load = eager ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"';
    const srcset = (fmt) => p.widths.map((w) => `/img/${slot}-${w}.${fmt} ${w}w`).join(', ');
    const fallbackW = p.widths[Math.min(1, p.widths.length - 1)];
    return `<picture class="media ${cls}" ${style}>`
      + p.formats.filter((f) => f !== 'jpg').map((f) => `<source type="image/${f}" srcset="${srcset(f)}" sizes="${sizes}">`).join('')
      + `<img src="/img/${slot}-${fallbackW}.jpg" srcset="${srcset('jpg')}" sizes="${sizes}" width="${p.width}" height="${p.height}" alt="${esc(alt)}" ${load} decoding="async"></picture>`;
  }
  return `<div class="media ph ph-${tone} ${cls}" ${style} role="img" aria-label="${esc(alt)}" data-slot="${esc(slot)}"><span class="ph-badge">${icon(ic, 'ph-ic')}</span></div>`;
}

// Video slot. Drop media/videos/<slot>.mp4 (and optionally <slot>.jpg as the
// poster). Videos are muted, inline, loaded only when scrolled near and paused
// when off-screen (see main.js).
export function video(slot, { label, note = label, ratio = '9/16', cls = '', posterIcon = 'play' } = {}) {
  usedSlots.videos.set(slot, note);
  const v = media.videos[slot];
  const style = `style="aspect-ratio:${ratio}"`;
  if (v) {
    const poster = v.poster ? `poster="/video/${slot}.jpg"` : '';
    return `<video class="media lazy-video ${cls}" ${style} muted playsinline loop preload="none" ${poster} data-src="/video/${slot}.mp4" aria-label="${esc(label)}"></video>`;
  }
  return `<div class="media ph ph-video ${cls}" ${style} role="img" aria-label="${esc(label)}" data-slot="${esc(slot)}"><span class="ph-badge">${icon(posterIcon, 'ph-ic')}</span></div>`;
}

// A photo slot that shows a built-in product screen until a real photo is supplied.
export function photoOr(slot, fallback, opts = {}) {
  if (media.photos[slot]) return photo(slot, opts);
  usedSlots.photos.set(slot, `${opts.note || opts.alt} (optional — a drawn screen or illustration shows until supplied)`);
  return fallback;
}
export const hasPhoto = (slot) => Boolean(media.photos[slot]);

export const enquire = (interest, label = 'Enquire now', cls = 'btn btn-primary') =>
  `<a class="${cls}" href="/contact/${interest ? `?interest=${interest}` : ''}#enquiry">${esc(label)}${icon('arrow', 'ic btn-ic')}</a>`;

export function ctaBand({ title, text = '', interest = '', button = 'Enquire now', extra = '' }) {
  return `<section class="cta-band"><div class="wrap reveal">
    <h2>${title}</h2>${text ? `<p>${text}</p>` : ''}
    <div class="btn-row">${enquire(interest, button)}${extra}</div>
  </div></section>`;
}

export function steps(list, cls = '') {
  return `<ol class="steps ${cls}">${list.map(([t, d], i) => `<li class="step reveal" style="--d:${i}"><span class="step-n">${i + 1}</span><h3>${t}</h3>${d ? `<p>${d}</p>` : ''}</li>`).join('')}</ol>`;
}

export function pageHero({ eyebrow, title, sub, media: m = '', actions = '', cls = '' }) {
  return `<section class="page-hero ${cls}"><div class="wrap page-hero-grid">
    <div class="page-hero-copy">
      ${eyebrow ? `<p class="eyebrow">${eyebrow}</p>` : ''}
      <h1>${title}</h1>
      <p class="lede">${sub}</p>
      <div class="btn-row">${actions}</div>
    </div>
    ${m ? `<div class="page-hero-media">${m}</div>` : ''}
  </div></section>`;
}

// ---------------------------------------------------------------------------
// Page shell
// ---------------------------------------------------------------------------
const nav = () => offerings.map((o) => `<li><a href="${o.path}">${o.nav}</a></li>`).join('');

function header(path) {
  return `<header class="site-header" id="top">
  <div class="wrap header-in">
    ${logo()}
    <nav class="main-nav" id="main-nav" aria-label="Main">
      <ul>${nav().replace(`href="${path}"`, `href="${path}" aria-current="page"`)}</ul>
      <a class="btn btn-primary btn-sm nav-cta" href="/contact/#enquiry">Enquire</a>
    </nav>
    <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="main-nav"><span class="sr-only">Menu</span><span class="bars" aria-hidden="true"></span></button>
  </div>
</header>`;
}

function footer() {
  const contact = [
    site.email && `<li><a href="mailto:${esc(site.email)}">${esc(site.email)}</a></li>`,
    site.phone && `<li><a href="tel:${esc(site.phone.replace(/\s+/g, ''))}">${esc(site.phone)}</a></li>`,
    '<li><a href="/contact/#enquiry">Send an enquiry</a></li>',
  ].filter(Boolean).join('');
  return `<footer class="site-footer">
  <div class="wrap footer-grid">
    <div class="footer-brand">
      ${logo('logo-dark')}
      <p>One partner for food, kitchen, technology and AI. Built and proven in real kitchens.</p>
    </div>
    <div>
      <h2 class="footer-h">What we do</h2>
      <ul>${offerings.map((o) => `<li><a href="${o.path}">${o.name}</a></li>`).join('')}</ul>
    </div>
    <div>
      <h2 class="footer-h">Contact</h2>
      <ul>${contact}</ul>
    </div>
    <div>
      <h2 class="footer-h">The fine print</h2>
      <ul><li><a href="/privacy/">Privacy</a></li><li><a href="/terms/">Terms</a></li><li><a href="${site.servattoUrl}" rel="noopener">servatto.com</a></li></ul>
    </div>
  </div>
  <div class="wrap footer-base"><p>© Food Online</p><a href="#top" class="to-top">Back to top ↑</a></div>
</footer>`;
}

const orgSchema = () => ({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: site.name,
  url: site.url + '/',
  logo: site.url + '/logo.png',
  description: 'Food Online helps cafés, restaurants, takeaways, dark kitchens, convenience stores and fuel stations sell more and work less — with virtual kitchen brands, a ready-made food range, an all-in-one point of sale and AI assistants.',
  ...(site.email || site.phone ? { contactPoint: { '@type': 'ContactPoint', contactType: 'sales', ...(site.email && { email: site.email }), ...(site.phone && { telephone: site.phone }), areaServed: 'AU' } } : {}),
});

export function page({ path, title, description, body, schema = [], bodyClass = '', noindex = false }) {
  const url = site.url + path;
  const ld = [orgSchema(), ...schema].map((s) => `<script type="application/ld+json">${JSON.stringify(s).replace(/</g, '\\u003c')}</script>`).join('\n');
  const analytics = site.analyticsToken
    ? `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='${JSON.stringify({ token: site.analyticsToken })}'></script>` : '';
  return `<!doctype html>
<html lang="en-AU">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${url}">
${noindex ? '<meta name="robots" content="noindex">' : ''}
<meta name="theme-color" content="#2A1D17">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Food Online">
<meta property="og:locale" content="en_AU">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${site.url}/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Food Online — grow your food business with one partner">
<meta name="twitter:card" content="summary_large_image">
<link rel="preload" href="/fonts/fraunces-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/jost-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/styles.css?v=__V__">
<script defer src="/assets/main.js?v=__V__"></script>
${ld}
</head>
<body class="${bodyClass}">
<a class="skip" href="#main">Skip to content</a>
${header(path)}
<main id="main">
${body}
</main>
${footer()}
${analytics}
</body>
</html>`;
}
