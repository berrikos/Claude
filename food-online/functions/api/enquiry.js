// POST /api/enquiry — Cloudflare Pages Function.
//
// Bindings / settings (Cloudflare Pages → Settings):
//   ENQUIRIES            KV namespace   — every enquiry is stored here (required)
//   ENQUIRY_TO           variable       — where enquiry emails go, e.g. hello@food-online.org
//   ENQUIRY_FROM         variable       — sender, e.g. "Food Online <enquiries@food-online.org>"
//   RESEND_API_KEY       secret         — email via resend.com (domain must be verified there)
//   TURNSTILE_SECRET_KEY secret         — optional; checked when set
//
// Works with and without JavaScript: fetch() with Accept: application/json gets
// JSON back; a plain form post gets redirected to the thank-you state.

const OFFERINGS = {
  'virtual-kitchens': 'Virtual Kitchens',
  express: 'Food Online Express',
  'point-of-sale': 'All-in-one point of sale',
  ai: 'AI Solutions',
};
const RATE_LIMIT = 5; // per IP per hour
const LIMITS = { name: 120, business: 160, email: 200, phone: 40, business_type: 40, locations: 20, message: 4000 };

export async function onRequestPost({ request, env }) {
  const wantsJson = (request.headers.get('accept') || '').includes('application/json');
  const reply = (ok, error, status = ok ? 200 : 400) => {
    if (wantsJson) return Response.json(ok ? { ok: true } : { ok: false, error }, { status });
    const url = new URL('/contact/', request.url);
    if (ok) url.searchParams.set('sent', '1'); else url.searchParams.set('error', error);
    url.hash = 'enquiry';
    return Response.redirect(url.toString(), 303);
  };

  let form;
  try {
    form = await request.formData();
  } catch {
    return reply(false, 'We couldn’t read that form. Please try again.');
  }
  const get = (k) => String(form.get(k) ?? '').trim().slice(0, LIMITS[k] ?? 200);

  // Honeypot: bots fill every field. Pretend it worked.
  if (get('website')) return reply(true);

  const data = {
    name: get('name'),
    business: get('business'),
    email: get('email'),
    phone: get('phone'),
    business_type: get('business_type'),
    locations: get('locations'),
    interests: form.getAll('interest').map(String).filter((k) => k in OFFERINGS),
    message: get('message'),
    consent: form.get('consent') === 'yes',
  };
  if (!data.name) return reply(false, 'Please add your name.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return reply(false, 'Please add a valid email address.');
  if (!data.consent) return reply(false, 'Please tick the box so we can contact you.');

  const ip = request.headers.get('cf-connecting-ip') || 'unknown';

  // Rate limit per IP (approximate — KV is eventually consistent, which is fine for spam).
  if (env.ENQUIRIES) {
    const key = `rl:${ip}`;
    const count = Number(await env.ENQUIRIES.get(key)) || 0;
    if (count >= RATE_LIMIT) return reply(false, 'Too many enquiries from this connection. Please try again later.', 429);
    await env.ENQUIRIES.put(key, String(count + 1), { expirationTtl: 3600 });
  }

  // Turnstile, when configured.
  if (env.TURNSTILE_SECRET_KEY) {
    const token = String(form.get('cf-turnstile-response') || '');
    const check = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY, response: token, remoteip: ip }),
    }).then((r) => r.json()).catch(() => ({ success: false }));
    if (!check.success) return reply(false, 'Please complete the spam check and try again.');
  }

  const id = crypto.randomUUID();
  const record = {
    id,
    received: new Date().toISOString(),
    ...data,
    interests: data.interests.map((k) => OFFERINGS[k]),
    page: request.headers.get('referer') || '',
    country: request.cf?.country || '',
  };

  let stored = false;
  if (env.ENQUIRIES) {
    await env.ENQUIRIES.put(`enquiry:${record.received}:${id}`, JSON.stringify(record), {
      metadata: { name: record.name, business: record.business, email: record.email },
    });
    stored = true;
  }

  let emailed = false;
  if (env.RESEND_API_KEY && env.ENQUIRY_TO) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: env.ENQUIRY_FROM || 'Food Online <enquiries@food-online.org>',
          to: env.ENQUIRY_TO.split(',').map((s) => s.trim()),
          reply_to: record.email,
          subject: `New enquiry: ${record.business || record.name}${record.interests.length ? ` — ${record.interests.join(', ')}` : ''}`,
          text: emailText(record),
        }),
      });
      emailed = res.ok;
      if (!res.ok) console.error('Resend failed', res.status, await res.text());
    } catch (err) {
      console.error('Resend error', err);
    }
  }

  if (!stored && !emailed) {
    console.error('Enquiry not stored or emailed — check ENQUIRIES binding and email settings', record);
    return reply(false, 'Sorry, we couldn’t send that just now. Please try again shortly.', 500);
  }
  return reply(true);
}

export const onRequest = () => new Response('Method not allowed', { status: 405, headers: { Allow: 'POST' } });

function emailText(r) {
  return [
    `New enquiry from food-online.org`,
    ``,
    `Name:          ${r.name}`,
    `Business:      ${r.business || '—'}`,
    `Email:         ${r.email}`,
    `Phone:         ${r.phone || '—'}`,
    `Business type: ${r.business_type || '—'}`,
    `Locations:     ${r.locations || '—'}`,
    `Interested in: ${r.interests.join(', ') || '—'}`,
    ``,
    `Message:`,
    r.message || '—',
    ``,
    `Received ${r.received} · ref ${r.id}`,
  ].join('\n');
}
