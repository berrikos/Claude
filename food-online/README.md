# food-online.org

The marketing website for **Food Online**: home, the four offerings (Virtual
Kitchens, Food Online Express, All-in-one point of sale, AI Solutions), an
enquiry form, privacy and terms.

- Static HTML built by a ~200-line Node script — no framework, no client-side
  library. Mobile Lighthouse: 98–100 on performance, accessibility, best
  practices and SEO.
- Served by the Cloudflare Worker **`food-online`** (routes `food-online.org/*`
  and `www.food-online.org/*`). The Worker bundles the built pages
  (`src/worker/worker.js`) and runs the enquiry form (`functions/api/enquiry.js`).
- Fonts (Fraunces, Jost) are self-hosted in `src/static/fonts/`.

## Day-to-day

```bash
npm install          # once
npm run build        # → dist/
npm run dev          # build + local server with the form working, http://localhost:8788
npm run deploy       # build + deploy the Worker (needs CLOUDFLARE_API_TOKEN)
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

Then `npm run deploy`.

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

`npm run deploy` (`scripts/deploy.mjs`) talks to the Cloudflare API directly, so
the one API token is all it needs:

- bundles `dist/` into the Worker `food-online` and uploads it (bindings: KV
  `ENQUIRIES`; secrets set in the dashboard are kept across deploys);
- uploads photos and videos (`dist/img`, `dist/video`) to the R2 bucket
  `food-online-media`, which the Worker serves with range support for video;
- makes sure the routes `food-online.org/*` and `www.food-online.org/*` exist
  and both hostnames have a proxied DNS record. www answers with a 301 to the apex.

Token permissions: Account › Workers Scripts Edit, Workers KV Storage Edit,
Workers R2 Storage Edit; Zone (food-online.org) › Workers Routes Edit, DNS Edit.

Other things on the food-online.org zone (iCloud mail records, the tunnel
subdomains, the `food-online.org/masala-mex*` route) are not touched — the more
specific masala-mex route keeps winning for its paths.

**Analytics:** Cloudflare → Analytics & Logs → Web Analytics → add
food-online.org, then set `CF_ANALYTICS_TOKEN` to the site token and deploy.

**Email for enquiries:** in Cloudflare → Workers → food-online → Settings →
Variables, add the secret `RESEND_API_KEY`, then deploy with `ENQUIRY_TO=you@…`
set (or add it as a variable there too).

Security headers (CSP, HSTS, etc.) and caching are generated into `dist/_headers`
by `build.mjs` and applied by the Worker.

## Brand rules for anyone editing copy

- Brand is **Food Online** only. Never name a real restaurant or our delivery brands — categories only.
- No prices or percentages. "One simple fee" / "pricing on request".
- Nothing that reveals size or location (venue counts, suburbs, founding year, bios).
- The point of sale is **Servatto** (link https://servatto.com).
- Plain, short Australian English: kitchen words, not tech words.
