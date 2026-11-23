// Site-wide settings. Contact details and keys are read from the environment
// at build time so the live site can be updated without editing code
// (set them in Cloudflare Pages → Settings → Environment variables, or in .env).

const env = process.env;

export const site = {
  name: 'Food Online',
  url: (env.SITE_URL || 'https://food-online.org').replace(/\/$/, ''),
  // Shown in the contact block and footer only once confirmed. Empty = hidden.
  email: env.CONTACT_EMAIL || '',
  phone: env.CONTACT_PHONE || '',
  servattoUrl: 'https://servatto.com',
  // Cloudflare Turnstile site key (public). Empty = widget not shown.
  turnstileSiteKey: env.TURNSTILE_SITE_KEY || '',
  // Cloudflare Web Analytics beacon token. Empty = no analytics script.
  // (Alternatively switch Web Analytics on for the Pages project in the dashboard.)
  analyticsToken: env.CF_ANALYTICS_TOKEN || '',
};

// The four offerings, in the order the brief gives them.
export const offerings = [
  {
    key: 'virtual-kitchens',
    num: '01',
    path: '/virtual-kitchens/',
    nav: 'Virtual Kitchens',
    name: 'Virtual Kitchens',
    role: 'Kitchen partner',
    line: 'Cook our proven delivery brands in the kitchen you already run. We run the stores.',
  },
  {
    key: 'express',
    num: '02',
    path: '/express/',
    nav: 'Express',
    name: 'Food Online Express',
    role: 'Food partner',
    line: 'A ready-made food range, supplied frozen, that any team member can serve.',
  },
  {
    key: 'point-of-sale',
    num: '03',
    path: '/point-of-sale/',
    nav: 'Point of sale',
    name: 'All-in-one point of sale',
    role: 'Technology partner',
    line: 'Every order from every app, the counter and the kiosk on one system — Servatto.',
  },
  {
    key: 'ai',
    num: '04',
    path: '/ai/',
    nav: 'AI',
    name: 'AI Solutions',
    role: 'AI partner',
    line: 'An AI assistant that does the work: email, ordering, bookings and reports.',
  },
];
