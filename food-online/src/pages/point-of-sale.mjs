import { site } from '../config.mjs';
import { page, photoOr, enquire, ctaBand, icon } from '../layout.mjs';
import { tablet, phone, tv, kiosk, kdsScreen, tillScreen, dashScreen, boardScreen, kioskScreen } from '../ui-mocks.mjs';
import { tourSection } from './home.mjs';

const ins = [['Uber Eats', 'ch-ue'], ['DoorDash', 'ch-dd'], ['Your website', 'ch-web'], ['Self-order kiosk', 'ch-kiosk'], ['Counter till', 'ch-till']];
const outs = [
  ['Kitchen screen', 'screen', 'Every order, in the order it needs cooking.'],
  ['Order screen', 'tv', 'Customers see when it’s ready. Doubles as a menu board.'],
  ['Live dashboard', 'chart', 'Sales, orders and staff on your phone.'],
  ['Menu and kiosk', 'tag', 'Change once, updates everywhere.'],
];
const parts = [
  ['pos-part-till', 'Till', 'Fast counter sales, built for a rush.', () => tablet(tillScreen())],
  ['pos-part-kitchen', 'Kitchen screen', 'Every ticket from every channel, timed.', () => tablet(kdsScreen(false))],
  ['pos-part-kiosk', 'Self-order kiosk', 'Customers order and pay themselves.', () => kiosk(kioskScreen())],
  ['pos-part-tv', 'Order screen (TV)', 'Ready calls and a menu board in one.', () => tv(boardScreen())],
  ['pos-part-office', 'Back office', 'Menus, prices, staff and reports — one login, every location.', () => tablet(dashScreen())],
  ['pos-part-app', 'Owner’s phone app', 'Your business, live, wherever you are.', () => phone(dashScreen())],
];

export default function pointOfSale() {
  const body = `
<section class="page-hero dark">
  <div class="wrap page-hero-grid">
    <div>
      <p class="eyebrow">Technology partner · Servatto</p>
      <h1>All-in-one point of sale.</h1>
      <p class="lede">One system runs every order: counter, kiosk, website, Uber Eats and DoorDash. Built in real kitchens, used every day.</p>
      <div class="btn-row">${enquire('point-of-sale', 'Book a demo')}<a class="btn btn-ghost" href="${site.servattoUrl}" rel="noopener">Visit servatto.com</a></div>
    </div>
    <div class="hero-devices" role="img" aria-label="Example: the Servatto till on a tablet and the owner's dashboard on a phone">
      ${tablet(tillScreen())}
      ${phone(dashScreen())}
      <span class="float-chip fc-1">${icon('bolt')}New order · Uber Eats</span>
    </div>
  </div>
</section>

<section class="section">
  <div class="wrap split split-center">
    <div class="section-head left reveal">
      <p class="eyebrow">The problem</p>
      <h2>Too many tablets. Not enough hands.</h2>
      <p class="lede">One tablet for Uber Eats, one for DoorDash, one for the counter. Orders get missed, drivers wait, and staff juggle screens instead of cooking.</p>
    </div>
    <div class="tablets reveal" aria-hidden="true">
      <div class="tablet t1"><span>Uber Eats</span><i></i></div>
      <div class="tablet t2"><span>DoorDash</span><i></i></div>
      <div class="tablet t3"><span>Counter</span><i></i></div>
      <div class="tablet t4"><span>Website</span><i></i></div>
    </div>
  </div>
</section>

<section class="section dark night">
  <div class="wrap">
    <div class="section-head reveal">
      <p class="eyebrow">Kitchen display</p>
      <h2>Every order. One screen.</h2>
      <p class="lede">This screen is live — watch the tickets come in and go out.</p>
    </div>
    <div class="reveal" role="img" aria-label="Example kitchen screen with orders arriving from several channels">${tablet(kdsScreen())}</div>
    <ul class="grid-4 kds-points">
      ${[['layers', 'All channels together, in one queue'], ['clock', 'Timers show what’s running late'], ['pin', 'Driver arrival and pickup PIN on the ticket'], ['check', 'One tap marks it ready']].map(([ic, t], i) => `<li class="reveal" style="--d:${i}">${icon(ic)}<span>${t}</span></li>`).join('')}
    </ul>
  </div>
</section>

${tourSection({ eyebrow: 'The parts, working together', title: 'From the counter to your phone.', sub: 'Each part is good on its own. Together, nothing falls through the gaps.', link: false })}

<section class="section">
  <div class="wrap">
    <div class="section-head reveal">
      <p class="eyebrow">One dashboard for your whole business</p>
      <h2>Orders in. Everything out.</h2>
      <p class="lede">One login, every location.</p>
    </div>
    <div class="flow reveal">
      <div class="flow-col flow-in">
        <p class="flow-h">Orders in</p>
        <ul>${ins.map(([t, c]) => `<li><i class="${c}"></i>${t}</li>`).join('')}</ul>
      </div>
      <div class="flow-hub">
        <div class="hub-in"><span class="hub-mark">S</span><strong>Servatto</strong><small>All-in-one point of sale</small></div>
      </div>
      <div class="flow-col">
        <p class="flow-h">Everything out</p>
        <ul class="flow-out">${outs.map(([t, ic, d]) => `<li>${icon(ic)}<span><b>${t}</b>${d}</span></li>`).join('')}</ul>
      </div>
    </div>
  </div>
</section>

<section class="section section-alt">
  <div class="wrap">
    <div class="section-head reveal">
      <p class="eyebrow">The parts</p>
      <h2>Everything a busy counter needs.</h2>
    </div>
    <div class="parts">
      ${parts.map(([slot, t, d, dev], i) => `<article class="part reveal" style="--d:${i % 3}">
        <div class="part-vis">${photoOr(slot, dev(), { alt: `Servatto ${t.toLowerCase()} in use`, note: `Servatto ${t.toLowerCase()} photo`, ratio: '16/11', icon: 'screen' })}</div>
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
