import { page, enquire, ctaBand, pageHero, steps, icon } from '../layout.mjs';
import { phone, chatPhone } from '../ui-mocks.mjs';

const jobs = [
  ['mail', 'Email', 'An hour a day in the inbox.', 'Urgent mail flagged, replies drafted for your OK.'],
  ['cart', 'Ordering', 'Counting stock, calling suppliers.', 'Orders placed and tracked. You’re told when they land.'],
  ['calendar', 'Calendar', 'Back and forth to book one meeting.', 'It finds a time, books it and reminds you.'],
  ['star', 'Customers', 'Messages and reviews left waiting.', 'Every one answered, in your voice.'],
  ['report', 'Reports', 'Logging into five apps for numbers.', 'A sales summary on your phone each morning.'],
  ['routine', 'Your routine', 'Jobs only you know how to do.', 'We teach it your routine, so it runs without you.'],
];

export default function ai() {
  const feedHtml = `<div class="ai-phone" role="img" aria-label="Example: the assistant reporting a morning of finished jobs on WhatsApp">${phone(chatPhone())}</div>`;

  const body = `
${pageHero({
  eyebrow: 'AI partner · AI Solutions',
  title: 'Not a chatbot. It does the work.',
  sub: 'Most AI only chats. Ours acts: it reads your email, places orders, books meetings and reports back. You just message it on WhatsApp, like a staff member.',
  actions: `${enquire('ai', 'Get your own assistant')}<a class="btn btn-ghost" href="#jobs">What it does</a>`,
  media: feedHtml,
  cls: 'dark',
})}

<section class="section" id="jobs">
  <div class="wrap">
    <div class="section-head reveal">
      <p class="eyebrow">The jobs it takes off your plate</p>
      <h2>Before, and now.</h2>
    </div>
    <div class="grid-3 jobs">
      ${jobs.map(([ic, t, before, now], i) => `<article class="job reveal" style="--d:${i % 3}">
        <h3>${icon(ic, 'ic job-ic')}${t}</h3>
        <p class="job-before"><span>Before</span><s>${before}</s></p>
        <p class="job-now"><span>Now</span>${now}</p>
      </article>`).join('')}
    </div>
  </div>
</section>

<section class="section section-alt">
  <div class="wrap">
    <div class="section-head reveal">
      <p class="eyebrow">How we set it up</p>
      <h2>Built around how you work.</h2>
    </div>
    ${steps([
      ['Learn your business', 'We sit down with you and list the jobs that eat your day.'],
      ['Build around your tasks', 'Your suppliers, your reports, your way of replying.'],
      ['Connect your tools', 'Your email, messaging and the apps you already use.'],
      ['Keep improving', 'New jobs added as you think of them.'],
    ], 'steps-4')}
  </div>
</section>

<section class="section">
  <div class="wrap narrow center reveal">
    <p class="eyebrow">Not only for food</p>
    <h2>Works for any business.</h2>
    <p class="lede">If your days are full of email, ordering, bookings and reports, it can help. Pricing on request.</p>
    <div class="btn-row center">${enquire('ai', 'Talk to us about AI')}</div>
  </div>
</section>

${ctaBand({ title: 'Get your own assistant.', text: 'Tell us the jobs you’d hand over first.', interest: 'ai', button: 'Enquire now' })}
`;
  return page({
    path: '/ai/',
    title: 'AI assistant for small business — it does the work | Food Online',
    description: 'Not a chatbot. An AI assistant for small business that reads your email, places orders, books meetings and reports back — you just message it on WhatsApp.',
    body,
  });
}
