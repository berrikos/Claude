import { offerings } from '../config.mjs';
import { page, photo, video, enquire, ctaBand, steps, icon, esc } from '../layout.mjs';

export const faqs = [
  ['Do I need to buy new equipment?', 'Usually not. We match brands and the Express range to the kitchen you already have.'],
  ['Can I choose just one offering?', 'Yes — pick one, or combine them.'],
  ['Who runs the Uber Eats and DoorDash stores?', 'We do: menus, photos, promotions and changes. You cook and pack.'],
  ['Do my staff need training?', 'We train your team, with recipes, specs and step-by-step cards.'],
  ['What does it cost?', 'Each offering has one simple fee, tailored to your business. Enquire and we’ll walk you through it.'],
  ['Do I need to be technical for the point of sale or AI?', 'No. We set it up for you and keep it running.'],
];

const outcomes = [
  { slot: 'home-outcome-orders', title: 'More orders', text: 'Extra delivery brands from the kitchen you already run.', icon: 'burger', alt: 'Burgers being packed for delivery orders', href: '/virtual-kitchens/' },
  { slot: 'home-outcome-sell', title: 'More to sell', text: 'A ready-made food range any team member can serve.', icon: 'box', alt: 'A grilled melt served at a café counter', href: '/express/' },
  { slot: 'home-outcome-service', title: 'Smoother service', text: 'Every order from every app on one screen.', icon: 'screen', alt: 'A kitchen screen showing every order in one place', href: '/point-of-sale/' },
  { slot: 'home-outcome-admin', title: 'Less admin', text: 'An AI assistant that clears your daily jobs.', icon: 'chat', alt: 'An owner reading a morning sales summary on their phone', href: '/ai/' },
];

const videos = [
  ['promo-virtual-kitchens', 'Virtual Kitchens', 'Kitchen partner'],
  ['promo-express', 'Food Online Express', 'Food partner'],
  ['promo-point-of-sale', 'All-in-one point of sale', 'Technology partner'],
  ['promo-ai', 'AI Solutions', 'AI partner'],
];

const why = [
  ['kitchen', 'Built in real kitchens, not a boardroom', 'Everything we offer runs every day in busy kitchens before it reaches yours.'],
  ['layers', 'One partner for food, tech and AI', 'One team to call, one relationship, everything working together.'],
  ['wave', 'We do the setup and the running', 'You don’t become a tech or marketing expert. We handle it and keep it going.'],
  ['check', 'Pick one, or combine them', 'Start with what you need most. Add more when you’re ready.'],
];

export default function home() {
  const body = `
<section class="hero">
  <div class="hero-media" aria-hidden="true">${video('home-hero', { label: 'A busy café kitchen during service', note: 'busy café/kitchen loop, landscape', ratio: 'auto', cls: 'hero-video', posterIcon: 'kitchen' })}</div>
  <div class="wrap hero-in">
    <p class="eyebrow eyebrow-light">Kitchen · Food · Technology · AI</p>
    <h1>Grow your food business with one partner.</h1>
    <p class="lede">Food, kitchen, technology and AI — all built and proven in real kitchens.</p>
    <div class="btn-row">${enquire('', 'Enquire now')}<a class="btn btn-ghost-light" href="#what-we-do">See what we do</a></div>
    <ul class="hero-for" aria-label="Who we work with">
      <li>Cafés</li><li>Restaurants</li><li>Takeaways</li><li>Dark kitchens</li><li>Convenience stores</li><li>Fuel stations</li>
    </ul>
  </div>
</section>

<section class="section" id="what-we-do">
  <div class="wrap">
    <div class="section-head reveal">
      <p class="eyebrow">What we do for you</p>
      <h2>Sell more. Work less.</h2>
      <p class="lede">Four simple outcomes for busy food businesses.</p>
    </div>
    <div class="grid-4">
      ${outcomes.map((o, i) => `<a class="outcome reveal" style="--d:${i}" href="${o.href}">
        ${photo(o.slot, { alt: o.alt, ratio: '4/3', icon: o.icon, tone: ['warm', 'gold', 'dark', 'cream'][i] })}
        <div class="outcome-body"><h3>${o.title}</h3><p>${o.text}</p><span class="more">Find out how ${icon('arrow')}</span></div>
      </a>`).join('')}
    </div>
  </div>
</section>

<section class="section section-dark">
  <div class="wrap">
    <div class="section-head reveal">
      <p class="eyebrow eyebrow-gold">Four ways to partner</p>
      <h2>Choose the partner you need.</h2>
    </div>
    <div class="partner-grid">
      ${offerings.map((o, i) => `<a class="partner reveal" style="--d:${i}" href="${o.path}">
        <span class="partner-num">${o.num}</span>
        <p class="partner-role">${o.role}</p>
        <h3>${o.name}</h3>
        <p>${o.line}</p>
        <span class="more">Explore ${icon('arrow')}</span>
      </a>`).join('')}
    </div>
  </div>
</section>

<section class="section section-cream">
  <div class="wrap">
    <div class="section-head reveal">
      <p class="eyebrow">See it working</p>
      <h2>A minute on each.</h2>
      <p class="lede">Four short videos, filmed where the work happens.</p>
    </div>
    <div class="video-strip" tabindex="0" aria-label="Promo videos — scroll sideways for more">
      ${videos.map(([slot, title, role], i) => `<figure class="video-card reveal" style="--d:${i}">
        ${video(slot, { label: `${title} — promo video`, note: `${title}, vertical ~60s` })}
        <figcaption><span>${role}</span>${title}</figcaption>
      </figure>`).join('')}
    </div>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="section-head reveal">
      <p class="eyebrow">How we work</p>
      <h2>Three steps. We do the heavy lifting.</h2>
    </div>
    ${steps([
      ['Tell us about your business', 'Your kitchen, your team, your customers and what you want more of.'],
      ['We tailor the right mix', 'One offering or several — matched to what will work for you.'],
      ['We set it up and keep it running', 'Training, setup and the ongoing work, week after week.'],
    ], 'steps-3')}
  </div>
</section>

<section class="section section-cream">
  <div class="wrap split">
    <div class="split-media reveal">${photo('home-why', { alt: 'A chef working the pass in a busy kitchen', note: 'chef at the pass during service', ratio: '4/5', icon: 'kitchen', sizes: '(min-width: 900px) 45vw, 100vw' })}</div>
    <div class="split-copy">
      <div class="section-head reveal left"><p class="eyebrow">Why Food Online</p><h2>Practical help from people who cook.</h2></div>
      <ul class="why-list">
        ${why.map(([ic, t, d], i) => `<li class="reveal" style="--d:${i}">${icon(ic, 'ic why-ic')}<div><h3>${t}</h3><p>${d}</p></div></li>`).join('')}
      </ul>
    </div>
  </div>
</section>

<section class="section" id="faq">
  <div class="wrap narrow">
    <div class="section-head reveal"><p class="eyebrow">FAQ</p><h2>Good questions.</h2></div>
    <div class="faq">
      ${faqs.map(([q, a]) => `<details class="reveal"><summary>${esc(q)}<span class="faq-plus" aria-hidden="true"></span></summary><p>${esc(a)}</p></details>`).join('')}
    </div>
  </div>
</section>

${ctaBand({ title: 'Want to know what we could do for your business?', text: 'Tell us a little about you. We’ll come back with the right mix.' })}
`;

  return page({
    path: '/',
    title: 'Food Online — grow your food business with one partner',
    description: 'Virtual kitchen brands, a ready-made food range, an all-in-one point of sale and AI assistants for cafés, restaurants, takeaways, convenience stores and fuel stations. Built in real kitchens.',
    body,
    bodyClass: 'home',
    schema: [{
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
    }],
  });
}
