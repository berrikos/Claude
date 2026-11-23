import { site } from '../config.mjs';
import { page, photo, enquire, ctaBand, pageHero, icon } from '../layout.mjs';

const ins = [['Uber Eats', 'bolt'], ['DoorDash', 'bolt'], ['Your website', 'screen'], ['Self-order kiosk', 'wave'], ['Counter till', 'till']];
const outs = [
  ['Kitchen screen', 'screen', 'Every order, in the order it needs cooking.'],
  ['Order screen', 'tv', 'Customers see when it’s ready. Doubles as a menu board.'],
  ['Live dashboard', 'chart', 'Sales, orders and staff on your phone.'],
  ['Menu and kiosk', 'tag', 'Change once, updates everywhere.'],
];
const parts = [
  ['pos-part-till', 'till', 'Till', 'Fast counter sales, built for a rush.'],
  ['pos-part-kitchen', 'screen', 'Kitchen screen', 'Every ticket from every channel, timed.'],
  ['pos-part-kiosk', 'wave', 'Self-order kiosk', 'Customers order and pay themselves.'],
  ['pos-part-tv', 'tv', 'Order screen (TV)', 'Ready calls and a menu board in one.'],
  ['pos-part-office', 'office', 'Back office', 'Menus, prices, staff and reports.'],
  ['pos-part-app', 'phone', 'Owner’s phone app', 'Your business, live, wherever you are.'],
];

// A kitchen ticket drawn in HTML, so the page shows the idea before screenshots arrive.
const ticket = (ch, cls, num, time, items, extra = '') => `<div class="tk ${cls}">
  <div class="tk-top"><span class="tk-ch">${ch}</span><span class="tk-time">${icon('clock')}${time}</span></div>
  <p class="tk-num">${num}</p>
  <ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul>
  ${extra}
  <span class="tk-ready">Ready ${icon('check')}</span>
</div>`;

export default function pointOfSale() {
  const body = `
${pageHero({
  eyebrow: 'Technology partner · Servatto',
  title: 'All-in-one point of sale.',
  sub: 'One system runs every order: counter, kiosk, website, Uber Eats and DoorDash. Built in real kitchens, used every day.',
  actions: `${enquire('point-of-sale', 'Book a demo')}<a class="btn btn-ghost" href="${site.servattoUrl}" rel="noopener">Visit servatto.com</a>`,
  media: photo('pos-hero', { alt: 'Servatto till and kitchen screen on a café counter', note: 'Servatto till + kitchen screen on the counter', ratio: '4/3', eager: true, icon: 'till', tone: 'dark', sizes: '(min-width: 900px) 45vw, 100vw' }),
})}

<section class="section section-cream">
  <div class="wrap split split-center">
    <div class="split-copy">
      <div class="section-head reveal left">
        <p class="eyebrow">The problem</p>
        <h2>Too many tablets. Not enough hands.</h2>
        <p class="lede">One tablet for Uber Eats, one for DoorDash, one for the counter. Orders get missed, drivers wait, and staff juggle screens instead of cooking.</p>
      </div>
    </div>
    <div class="tablets reveal" aria-hidden="true">
      <div class="tablet t1"><span>Uber Eats</span><i></i></div>
      <div class="tablet t2"><span>DoorDash</span><i></i></div>
      <div class="tablet t3"><span>Counter</span><i></i></div>
      <div class="tablet t4"><span>Website</span><i></i></div>
    </div>
  </div>
</section>

<section class="section section-dark">
  <div class="wrap split split-center">
    <div class="split-copy">
      <div class="section-head reveal left">
        <p class="eyebrow eyebrow-gold">Kitchen display</p>
        <h2>Every order. One screen.</h2>
      </div>
      <ul class="tick-list tick-light reveal">
        <li>${icon('check')}All channels together, in one queue</li>
        <li>${icon('check')}Timers show what’s running late</li>
        <li>${icon('check')}Driver arrival and pickup PIN on the ticket</li>
        <li>${icon('check')}One tap marks it ready</li>
      </ul>
    </div>
    <div class="kds reveal" role="img" aria-label="Example kitchen screen with orders from several channels">
      ${ticket('Uber Eats', 'tk-ue', '#A41', '04:12', ['2 × Burger', '1 × Fries'], '<p class="tk-driver">Driver arriving · PIN 4821</p>')}
      ${ticket('Counter', 'tk-pos', '#118', '01:47', ['1 × Melt', '2 × Flat white'])}
      ${ticket('DoorDash', 'tk-dd', '#7F2', '09:30', ['1 × Wrap', '1 × Dessert'], '<p class="tk-late">Running late</p>')}
      ${ticket('Kiosk', 'tk-kiosk', '#K09', '00:38', ['1 × Breakfast roll'])}
    </div>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="section-head reveal">
      <p class="eyebrow">One dashboard for your whole business</p>
      <h2>Orders in. Everything out.</h2>
      <p class="lede">One login, every location.</p>
    </div>
    <div class="flow reveal">
      <div class="flow-col">
        <p class="flow-h">Orders in</p>
        <ul>${ins.map(([t, ic]) => `<li>${icon(ic)}${t}</li>`).join('')}</ul>
      </div>
      <div class="flow-hub" aria-label="Servatto">
        <div class="hub-in"><span class="hub-mark">S</span><strong>Servatto</strong><small>All-in-one point of sale</small></div>
      </div>
      <div class="flow-col">
        <p class="flow-h">Everything out</p>
        <ul class="flow-out">${outs.map(([t, ic, d]) => `<li>${icon(ic)}<span><b>${t}</b>${d}</span></li>`).join('')}</ul>
      </div>
    </div>
  </div>
</section>

<section class="section section-cream">
  <div class="wrap">
    <div class="section-head reveal">
      <p class="eyebrow">The parts</p>
      <h2>Everything a busy counter needs.</h2>
    </div>
    <div class="grid-3 parts">
      ${parts.map(([slot, ic, t, d], i) => `<article class="part reveal" style="--d:${i % 3}">
        ${photo(slot, { alt: `Servatto ${t.toLowerCase()} in use`, note: `Servatto screenshot — ${t.toLowerCase()}`, ratio: '16/10', icon: ic, tone: ['dark', 'warm', 'cream'][i % 3] })}
        <div class="part-body"><h3>${t}</h3><p>${d}</p></div>
      </article>`).join('')}
    </div>
    <p class="note-line reveal">${icon('tag')} Pricing on request.</p>
  </div>
</section>

${ctaBand({ title: 'See it in action.', text: 'Book a demo and we’ll show you a real day of orders, start to finish.', interest: 'point-of-sale', button: 'Book a demo', extra: `<a class="btn btn-ghost-light" href="${site.servattoUrl}" rel="noopener">Visit servatto.com</a>` })}
`;
  return page({
    path: '/point-of-sale/',
    title: 'All-in-one point of sale for restaurants — Servatto | Food Online',
    description: 'Servatto is the all-in-one restaurant POS: counter, kiosk, website, Uber Eats and DoorDash orders on one kitchen display system. Built in real kitchens.',
    body,
  });
}
