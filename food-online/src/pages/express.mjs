import { page, photo, enquire, ctaBand, pageHero, icon } from '../layout.mjs';

const who = [
  ['cup', 'Cafés'],
  ['store', 'Takeaways'],
  ['cart', 'Convenience stores'],
  ['bolt', 'Fuel stations'],
];

const how = [
  ['vx-step-supply', 'snow', 'We supply it frozen', 'Made in our kitchens, delivered ready to store.', 'Frozen, ready-made products packed in a freezer'],
  ['vx-step-assemble', 'layers', 'Assemble', 'Step-by-step cards for every item.', 'A team member assembling an item using a step card'],
  ['vx-step-cook', 'pan', 'Cook', 'Grill or heat on order — minutes, not hours.', 'An item on a contact grill'],
  ['vx-step-serve', 'check', 'Serve', 'Same quality every order.', 'A finished item served on the counter'],
];

const benefits = [
  ['users', 'No chef needed', 'Any staff member — or a single fuel-station operator — can run it.'],
  ['tag', 'More food to sell', 'A proven menu. No recipes to develop.'],
  ['snow', 'Less headache', 'Ready-made with a long shelf life, so there’s little waste.'],
  ['star', 'Branding for your counter', 'Signs and menus so customers know what’s on offer.'],
];

export default function express() {
  const body = `
${pageHero({
  eyebrow: 'Food partner · Food Online Express',
  title: 'A ready-made food counter in any kitchen.',
  sub: 'We supply the food frozen and ready-made. Your team assembles, cooks and serves.',
  actions: `${enquire('express', 'Put Express in your store')}<a class="btn btn-ghost" href="#how">How it works</a>`,
  media: photo('vx-hero', { alt: 'A hot grilled item served at a convenience-store food counter', note: 'hot food counter with grilled items', ratio: '4/5', eager: true, icon: 'pan', sizes: '(min-width: 900px) 45vw, 100vw' }),
})}

<section class="section">
  <div class="wrap">
    <div class="section-head reveal">
      <p class="eyebrow">Who it’s for</p>
      <h2>Anywhere with a small team and hungry customers.</h2>
    </div>
    <ul class="who-row">
      ${who.map(([ic, t], i) => `<li class="reveal" style="--d:${i}">${icon(ic, 'ic who-ic')}<span>${t}</span></li>`).join('')}
    </ul>
  </div>
</section>

<section class="section section-alt" id="how">
  <div class="wrap">
    <div class="section-head reveal">
      <p class="eyebrow">How it works</p>
      <h2>From freezer to counter in four steps.</h2>
    </div>
    <ol class="how-cards">
      ${how.map(([slot, ic, t, d, alt], i) => `<li class="how-card reveal" style="--d:${i}">
        ${photo(slot, { alt, ratio: '4/3', icon: ic, tone: ['cream', 'warm', 'dark', 'gold'][i] })}
        <div class="how-body"><span class="step-n">${i + 1}</span><h3>${t}</h3><p>${d}</p></div>
      </li>`).join('')}
    </ol>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="section-head reveal">
      <p class="eyebrow">Benefits</p>
      <h2>More to sell, without the hard part.</h2>
    </div>
    <div class="grid-4">
      ${benefits.map(([ic, t, d], i) => `<article class="feature reveal" style="--d:${i}">${icon(ic, 'ic feature-ic')}<h3>${t}</h3><p>${d}</p></article>`).join('')}
    </div>
    <p class="note-line reveal">${icon('tag')} Pricing on request — tailored to your store.</p>
  </div>
</section>

${ctaBand({ title: 'Put Food Online Express in your store.', text: 'Tell us about your counter and your team. We’ll suggest a range to start with.', interest: 'express', button: 'Enquire now' })}
`;
  return page({
    path: '/express/',
    title: 'Food Online Express — ready-made food for your counter | Food Online',
    description: 'Ready-made, frozen food supply for cafés, takeaways, convenience stores and fuel stations. No chef needed — your team assembles, cooks and serves in minutes.',
    body,
  });
}
