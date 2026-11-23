import { offerings } from '../config.mjs';
import { page, photo, video, enquire, ctaBand, steps, icon, esc } from '../layout.mjs';
import { tablet, phone, kdsScreen, chatPhone, storefronts, TOUR } from '../ui-mocks.mjs';

export const faqs = [
  ['Do I need to buy new equipment?', 'Usually not. We match brands and the Express range to the kitchen you already have.'],
  ['Can I choose just one offering?', 'Yes — pick one, or combine them.'],
  ['Who runs the Uber Eats and DoorDash stores?', 'We do: menus, photos, promotions and changes. You cook and pack.'],
  ['Do my staff need training?', 'We train your team, with recipes, specs and step-by-step cards.'],
  ['What does it cost?', 'Each offering has one simple fee, tailored to your business. Enquire and we’ll walk you through it.'],
  ['Do I need to be technical for the point of sale or AI?', 'No. We set it up for you and keep it running.'],
];

const videos = [
  ['promo-virtual-kitchens', 'Virtual Kitchens', 'Kitchen partner'],
  ['promo-express', 'Food Online Express', 'Food partner'],
  ['promo-point-of-sale', 'All-in-one point of sale', 'Technology partner'],
  ['promo-ai', 'AI Solutions', 'AI partner'],
];

const why = [
  ['kitchen', 'Built in real kitchens, not a boardroom', 'Everything we offer runs every day in busy kitchens before it reaches yours.'],
  ['layers', 'One partner for food, tech and AI', 'One team to call. Everything works together.'],
  ['wave', 'We do the setup and the running', 'You don’t need to become a tech or marketing expert. We handle it and keep it going.'],
  ['check', 'Pick one, or combine them', 'Start with what you need most. Add more when you’re ready.'],
];

// The Servatto tour, shared with the point-of-sale page.
export function tourSection({ eyebrow = 'Technology partner · Servatto', title = 'One system runs every order.', sub = 'Counter, kiosk, website, Uber Eats and DoorDash — in one place, from the till to the kitchen to your phone.', link = true } = {}) {
  return `<section class="section dark tour" id="servatto">
  <div class="wrap">
    <div class="tour-head reveal">
      <p class="eyebrow">${eyebrow}</p>
      <h2>${title}</h2>
      <p class="lede">${sub}</p>
      ${link ? `<a class="link-arrow" href="/point-of-sale/">See the point of sale ${icon('arrow')}</a>` : ''}
    </div>
    <div class="tour-grid">
      <ol class="tour-steps">
        ${TOUR.map((s, i) => `<li class="tour-step${i ? '' : ' is-active'}" data-step="${i}">
          <h3><small>0${i + 1}</small>${s.title}</h3>
          <p>${s.text}</p>
          <div class="tour-dev-m">${s.dev()}</div>
        </li>`).join('')}
      </ol>
      <div class="tour-stage" aria-hidden="true">
        ${TOUR.map((s, i) => `<div class="tour-slide${i ? '' : ' is-on'}" data-slide="${i}">${s.dev()}</div>`).join('')}
      </div>
    </div>
  </div>
</section>`;
}

export default function home() {
  const [vk, vx, pos, ai] = offerings;
  const body = `
<section class="hero dark">
  <div class="hero-bg" aria-hidden="true">${video('home-hero', { label: 'A busy café kitchen during service', note: 'busy café/kitchen loop, landscape, 10–15s', ratio: 'auto', posterIcon: 'kitchen' })}</div>
  <div class="wrap hero-grid">
    <div class="hero-copy">
      <p class="eyebrow">Kitchen · Food · Technology · AI</p>
      <h1>Grow your food business with one partner.</h1>
      <p class="lede">Food, kitchen, technology and AI — all built and proven in real kitchens.</p>
      <div class="btn-row">${enquire('', 'Enquire now')}<a class="btn btn-ghost" href="#what-we-do">See what we do</a></div>
      <ul class="hero-for" aria-label="Who we work with">
        <li>Cafés</li><li>Restaurants</li><li>Takeaways</li><li>Dark kitchens</li><li>Convenience stores</li><li>Fuel stations</li>
      </ul>
    </div>
    <div class="hero-devices" role="img" aria-label="Example: a kitchen screen showing orders from every app, and the AI assistant reporting on a phone">
      ${tablet(kdsScreen())}
      ${phone(chatPhone())}
      <span class="float-chip fc-1">${icon('bolt')}New order · DoorDash</span>
      <span class="float-chip fc-2">${icon('check')}Ready · #118</span>
    </div>
  </div>
</section>

<section class="section" id="what-we-do">
  <div class="wrap">
    <div class="section-head reveal">
      <p class="eyebrow">What we do for you</p>
      <h2>Sell more. Work less.</h2>
      <p class="lede">Four simple outcomes for busy food businesses.</p>
    </div>
    <div class="bento">
      <a class="tile dark b-1 reveal" href="${pos.path}">
        <div class="tile-copy"><p class="eyebrow">Smoother service</p><h3>Every order from every app on one screen.</h3><span class="link-arrow">All-in-one point of sale ${icon('arrow')}</span></div>
        <div class="tile-vis">${tablet(kdsScreen(false))}</div>
      </a>
      <a class="tile b-2 reveal" style="--d:1" href="${vk.path}">
        <div class="tile-copy"><p class="eyebrow">More orders</p><h3>Extra delivery brands from the kitchen you already run.</h3><span class="link-arrow">Virtual Kitchens ${icon('arrow')}</span></div>
        <div class="tile-vis">${storefronts()}</div>
      </a>
      <a class="tile tile-photo b-3 reveal" href="${vx.path}">
        <div class="tile-copy"><p class="eyebrow">More to sell</p><h3>A ready-made food range any team member can serve.</h3><span class="link-arrow">Food Online Express ${icon('arrow')}</span></div>
        <div class="tile-vis">${photo('home-outcome-sell', { alt: 'A hot grilled melt served at a café counter', note: 'grilled melt on the counter, landscape', ratio: '16/9', icon: 'pan', tone: 'warm', sizes: '(min-width: 760px) 50vw, 100vw' })}</div>
      </a>
      <a class="tile dark b-4 reveal" style="--d:1" href="${ai.path}">
        <div class="tile-copy"><p class="eyebrow">Less admin</p><h3>An AI assistant that clears your daily jobs.</h3><span class="link-arrow">AI Solutions ${icon('arrow')}</span></div>
        <div class="tile-vis">${phone(chatPhone(false))}</div>
      </a>
    </div>
  </div>
</section>

<section class="section dark">
  <div class="wrap">
    <div class="section-head left reveal">
      <p class="eyebrow">Four ways to partner</p>
      <h2>Choose the partner you need.</h2>
    </div>
    <div class="partners">
      ${offerings.map((o, i) => `<a class="partner reveal" style="--d:${i}" href="${o.path}">
        <span class="partner-num">${o.num}</span>
        <div class="partner-main"><span class="partner-role">${o.role}</span><h3>${o.name}</h3><p>${o.line}</p></div>
        <span class="partner-go" aria-hidden="true">${icon('arrow')}</span>
      </a>`).join('')}
    </div>
  </div>
</section>

${tourSection()}

<section class="section section-alt">
  <div class="wrap">
    <div class="section-head reveal">
      <p class="eyebrow">See it working</p>
      <h2>A minute on each.</h2>
      <p class="lede">Four short films, shot where the work happens.</p>
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
      ['We tailor the right mix', 'One offering or several, matched to what will work for you.'],
      ['We set it up and keep it running', 'Training, setup and the ongoing work, week after week.'],
    ], 'steps-3')}
  </div>
</section>

<section class="section section-alt">
  <div class="wrap split">
    <div class="split-media sticky reveal">${photo('home-why', { alt: 'A chef working the pass in a busy kitchen', note: 'chef at the pass during service', ratio: '4/5', icon: 'kitchen', sizes: '(min-width: 900px) 45vw, 100vw' })}</div>
    <div>
      <div class="section-head left reveal"><p class="eyebrow">Why Food Online</p><h2>Practical help from people who cook.</h2></div>
      <ul class="why-list">
        ${why.map(([ic, t, d], i) => `<li class="reveal" style="--d:${i}">${icon(ic, 'ic why-ic')}<div><h3>${t}</h3><p>${d}</p></div></li>`).join('')}
      </ul>
    </div>
  </div>
</section>

<section class="section" id="faq">
  <div class="wrap narrow">
    <div class="section-head reveal"><p class="eyebrow">FAQ</p><h2>Good questions.</h2></div>
    <div class="faq reveal">
      ${faqs.map(([q, a]) => `<details><summary>${esc(q)}<span class="faq-plus" aria-hidden="true"></span></summary><p>${esc(a)}</p></details>`).join('')}
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
