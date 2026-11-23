import { page, photo, enquire, ctaBand, steps, pageHero, icon } from '../layout.mjs';

const categories = [
  ['vk-cat-melts', 'Grilled sandwiches & melts', 'A golden grilled melt, cut to show the cheese pull', 'pan'],
  ['vk-cat-burgers', 'Burgers', 'A stacked burger with fries', 'burger'],
  ['vk-cat-kebabs', 'Kebabs & wraps', 'A loaded kebab wrap, cut in half', 'kitchen'],
  ['vk-cat-breakfast', 'Breakfast', 'A breakfast plate with eggs and toast', 'cup'],
  ['vk-cat-desserts', 'Desserts', 'A dessert box ready for delivery', 'star'],
];

const included = [
  ['Stores run daily', 'clock'],
  ['Menus, prices and photos', 'tag'],
  ['Menu changes and sold-out items', 'routine'],
  ['Promotions and marketing', 'spark'],
  ['Recipes, training and new items', 'kitchen'],
];

export default function virtualKitchens() {
  const body = `
${pageHero({
  eyebrow: 'Kitchen partner · Virtual Kitchens',
  title: 'Your kitchen. Our brands. More profit.',
  sub: 'Cook our proven delivery brands with the kitchen and staff you already have. We run the Uber Eats and DoorDash stores for you.',
  actions: `${enquire('virtual-kitchens', 'Find out what your kitchen could earn')}<a class="btn btn-ghost" href="#how">How it works</a>`,
  media: photo('vk-hero', { alt: 'Several delivery orders bagged and ready on a kitchen pass', note: 'delivery bags lined up on the pass', ratio: '4/5', eager: true, icon: 'burger', sizes: '(min-width: 900px) 45vw, 100vw' }),
})}

<section class="section">
  <div class="wrap">
    <div class="section-head reveal">
      <p class="eyebrow">Why it works</p>
      <h2>Same kitchen, same staff, more turnover.</h2>
    </div>
    <div class="grid-3 feature-grid">
      <article class="feature reveal">${icon('chart', 'ic feature-ic')}<h3>More turnover</h3><p>Your kitchen sells several extra brands, using hours and staff you already pay for.</p></article>
      <article class="feature reveal" style="--d:1">${icon('tag', 'ic feature-ic')}<h3>Higher profit</h3><p>No new rent, fit-out or hires — extra sales on costs you already carry.</p></article>
      <article class="feature reveal" style="--d:2">${icon('wave', 'ic feature-ic')}<h3>We take the headache</h3><p>We run the Uber Eats and DoorDash back end — menus, item and ingredient photos, options, promotions and every change.</p></article>
    </div>
  </div>
</section>

<section class="section section-dark">
  <div class="wrap">
    <div class="section-head reveal">
      <p class="eyebrow eyebrow-gold">One kitchen. Multiple brands.</p>
      <h2>Proven food people already order.</h2>
      <p class="lede">Each brand is matched to your kitchen, your equipment and your area.</p>
    </div>
    <div class="cat-grid">
      ${categories.map(([slot, name, alt, ic], i) => `<figure class="cat reveal" style="--d:${i}">${photo(slot, { alt, ratio: '1/1', icon: ic, tone: 'dark', sizes: '(min-width: 1100px) 20vw, (min-width: 700px) 33vw, 50vw' })}<figcaption>${name}</figcaption></figure>`).join('')}
    </div>
  </div>
</section>

<section class="section section-cream">
  <div class="wrap split">
    <div class="split-copy">
      <div class="section-head reveal left">
        <p class="eyebrow">The detail that sells</p>
        <h2>Customers see exactly what they get.</h2>
        <p class="lede">Every ingredient and option is pre-selected and photographed. Customers see exactly what they’re ordering, add more, and come back to order again.</p>
      </div>
      <ul class="tick-list reveal">
        <li>${icon('check')}Every item photographed</li>
        <li>${icon('check')}Every ingredient and add-on shown</li>
        <li>${icon('check')}Options set up to lift the order value</li>
      </ul>
    </div>
    <div class="phones reveal" aria-label="Example delivery-app menu screens">
      <div class="phone">${photo('vk-app-menu', { alt: 'Delivery-app menu screen showing a brand’s items with photos', note: 'screenshot — delivery app menu', ratio: '9/19.5', icon: 'phone', tone: 'cream', sizes: '220px' })}</div>
      <div class="phone phone-2">${photo('vk-app-options', { alt: 'Delivery-app item screen showing photographed ingredients and add-ons', note: 'screenshot — item with photographed options', ratio: '9/19.5', icon: 'phone', tone: 'warm', sizes: '220px' })}</div>
    </div>
  </div>
</section>

<section class="section" id="how">
  <div class="wrap">
    <div class="section-head reveal">
      <p class="eyebrow">How it works</p>
      <h2>Five steps. You cook. We do the rest.</h2>
    </div>
    ${steps([
      ['We add extra brands', 'Chosen to suit your kitchen, equipment and area.'],
      ['We train your team', 'Recipes, specs and plating, so every order looks right.'],
      ['We build the stores', 'Uber Eats and DoorDash accounts, menus and photos.'],
      ['You cook and pack', 'Orders arrive. Your team makes them and hands them over.'],
      ['We grow it', 'Promotions, new items and menu changes, every week.'],
    ], 'steps-5')}
  </div>
</section>

<section class="section section-cream">
  <div class="wrap fee">
    <div class="section-head reveal left">
      <p class="eyebrow">One simple fee</p>
      <h2>One simple fee. Less headache.</h2>
      <p class="lede">Everything below is included. Pricing on request, tailored to your kitchen.</p>
      ${enquire('virtual-kitchens', 'Ask about pricing')}
    </div>
    <ul class="included reveal">
      ${included.map(([t, ic]) => `<li>${icon(ic)}<span>${t}</span></li>`).join('')}
    </ul>
  </div>
</section>

${ctaBand({ title: 'Find out what your kitchen could earn.', text: 'Tell us about your kitchen. We’ll tell you which brands would suit it.', interest: 'virtual-kitchens', button: 'Enquire now' })}
`;
  return page({
    path: '/virtual-kitchens/',
    title: 'Virtual Kitchens — delivery brands for your kitchen | Food Online',
    description: 'Your virtual kitchen partner. Cook proven delivery brands with the kitchen and staff you already have — we run your Uber Eats and DoorDash stores for you.',
    body,
  });
}
