# food-online.org

The marketing website for **Food Online**: home, the four offerings (Virtual
Kitchens, Food Online Express, All-in-one point of sale, AI Solutions), an
enquiry form, privacy and terms.

- Static HTML built by a ~200-line Node script — no framework, no client-side
  library. Mobile Lighthouse: 98–100 on performance, accessibility, best
  practices and SEO.
- Hosted on **Cloudflare Pages**. The only server code is the enquiry form
  (`functions/api/enquiry.js`).
- Fonts (Fraunces, Jost) are self-hosted in `src/static/fonts/`.

## Day-to-day

```bash
npm install          # once
npm run build        # → dist/
npm run dev          # build + local server with the form working, http://localhost:8788
npm run deploy       # build + deploy to Cloudflare Pages (needs CLOUDFLARE_API_TOKEN)
```

## How to update content

| To change… | Edit |
|---|---|
| Words on a page | `src/pages/<page>.mjs` — the text is plain HTML inside each file |
| The home-page FAQ | the `faqs` list at the top of `src/pages/home.mjs` (also feeds the FAQ schema) |
| The four offerings' names / one-liners / order | `src/config.mjs` |
| Contact email and phone | set `CONTACT_EMAIL` and `CONTACT_PHONE` (Cloudflare Pages → Settings → Variables, or `.env` locally), then rebuild. Empty = hidden. |
| Colours, spacing, type | `src/assets/styles.css` (tokens at the top) |
| Header, footer, page `<head>` | `src/layout.mjs` |
| Logo, favicon, share image | logo SVG in `src/layout.mjs` (`LOGO_MARK`), then `npm run icons` |

Then `npm run deploy` (or push, if the Pages project is connected to Git).

## Photos and videos

Every image on the site is a named **slot**. Until a file is supplied the slot
shows a branded placeholder. `media/SLOTS.md` lists every slot, what to shoot,
and which are done — it is regenerated on each build.

- Photos: drop `media/photos/<slot>.jpg` (or .png/.webp/.avif, ideally ≥1600px
  wide). The build makes AVIF, WebP and JPEG at 480/960/1600px, lazy-loaded with
  responsive `srcset`.
- Videos: drop `media/videos/<slot>.mp4` and optionally `<slot>.jpg` as the
  poster. They're muted, inline, loaded only when scrolled near, and paused
  off-screen. Keep each under ~8 MB (H.264, 720×1280 for the vertical promos;
  the home hero is landscape, ~10–15 s loop).

## Enquiry form

`POST /api/enquiry` — works with or without JavaScript.

- **Stored** in the KV namespace `food-online-enquiries` (binding `ENQUIRIES`,
  see `wrangler.toml`). View them in Cloudflare → Storage & Databases → KV.
- **Emailed** via [Resend](https://resend.com) when `RESEND_API_KEY` (secret) and
  `ENQUIRY_TO` (variable) are set. Verify `food-online.org` in Resend first so
  `ENQUIRY_FROM` can send from it.
- **Spam protection:** hidden honeypot field, 5 enquiries per IP per hour, and
  Cloudflare Turnstile when `TURNSTILE_SITE_KEY` (build variable) and
  `TURNSTILE_SECRET_KEY` (secret) are set.
- Arriving from an offering page pre-ticks it: `/contact/?interest=express`
  (`virtual-kitchens`, `express`, `point-of-sale`, `ai`; comma-separate for more).

## Hosting, domain and analytics

First-time setup (safe to re-run):

```bash
CLOUDFLARE_API_TOKEN=… node scripts/cloudflare-setup.mjs
```

It creates the Pages project, deploys, attaches `food-online.org` and
`www.food-online.org`, creates the DNS records, adds a 301 from www to the
apex and turns on Always Use HTTPS. The domain must be a zone in the same
Cloudflare account (Websites → Add a site, then point the registrar's
nameservers at Cloudflare).

**Analytics:** Cloudflare → Workers & Pages → food-online → Metrics → enable
Web Analytics (cookie-free). Or set `CF_ANALYTICS_TOKEN` to a Web Analytics
site token and rebuild.

Security headers (CSP, HSTS, etc.) and caching are generated into `dist/_headers`
by `build.mjs`.

## Brand rules for anyone editing copy

- Brand is **Food Online** only. Never name a real restaurant or our delivery brands — categories only.
- No prices or percentages. "One simple fee" / "pricing on request".
- Nothing that reveals size or location (venue counts, suburbs, founding year, bios).
- The point of sale is **Servatto** (link https://servatto.com).
- Plain, short Australian English: kitchen words, not tech words.
