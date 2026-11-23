import { page, enquire } from '../layout.mjs';

const wrapLegal = (title, updated, inner) => `
<section class="page-hero legal-hero"><div class="wrap narrow">
  <p class="eyebrow">The fine print</p>
  <h1>${title}</h1>
  <p class="lede">Plain English. Last updated ${updated}.</p>
</div></section>
<section class="section"><div class="wrap narrow prose">${inner}</div></section>`;

const UPDATED = '23 November 2026';

export function privacy() {
  const body = wrapLegal('Privacy', UPDATED, `
<h2>The short version</h2>
<p>We only collect what we need to answer your enquiry and work with you. We don’t sell your details. You can ask us to see, fix or delete them at any time.</p>

<h2>What we collect</h2>
<ul>
  <li><b>What you tell us</b> in the enquiry form: your name, business name, email, phone, business type, number of locations, what you’re interested in and your message.</li>
  <li><b>Basic, anonymous visit data</b> — which pages are popular and roughly where visitors come from. We use privacy-friendly analytics that don’t use cookies or track you across other websites.</li>
  <li><b>Security data</b>, such as your IP address, used briefly to block spam and abuse of the form.</li>
</ul>

<h2>How we use it</h2>
<ul>
  <li>To reply to your enquiry and talk with you about our services.</li>
  <li>To set up and run the services you choose, if you become a partner.</li>
  <li>To keep the website safe and working well.</li>
</ul>
<p>We won’t add you to a marketing list unless you ask us to.</p>

<h2>Who we share it with</h2>
<p>Only the service providers that help us run this website and answer you — for example our website host and email provider. They may store data outside Australia, and they may only use it to provide their service to us. We don’t sell or rent your details to anyone.</p>

<h2>How long we keep it</h2>
<p>We keep enquiries for as long as we need them to work with you, then delete them. You can ask us to delete yours sooner.</p>

<h2>Your choices</h2>
<p>You can ask to see the details we hold about you, correct them, or have them deleted. We handle personal information in line with the Australian Privacy Principles. If you’re unhappy with how we’ve handled your details, tell us and we’ll fix it. You can also contact the Office of the Australian Information Commissioner (oaic.gov.au).</p>

<h2>Contact us</h2>
<p>Send us a message through the <a href="/contact/#enquiry">enquiry form</a> and mention “privacy”.</p>
`);
  return page({ path: '/privacy/', title: 'Privacy | Food Online', description: 'How Food Online collects, uses and protects your information — in plain English.', body });
}

export function terms() {
  const body = wrapLegal('Terms', UPDATED, `
<h2>Using this website</h2>
<p>This website tells you about Food Online and lets you send us an enquiry. By using it, you agree to these terms.</p>

<h2>The information on this site</h2>
<p>We work to keep everything here accurate and up to date, but it’s general information, not an offer or a quote. What we provide, and what it costs, is set out in a written agreement made with you. Results vary from business to business.</p>

<h2>Examples</h2>
<p>Some content shows examples — like the assistant’s “done for you today” list or the kitchen screen. They show how things work, not the results of any particular business.</p>

<h2>Our content</h2>
<p>The words, photos, videos, logos and designs on this site belong to Food Online or the people who licensed them to us. Please don’t copy them without asking. Servatto is our point-of-sale product. Uber Eats, DoorDash, WhatsApp and Google are trademarks of their owners; we mention them only to explain what our services work with.</p>

<h2>Links to other sites</h2>
<p>We link to a few other websites, such as servatto.com. We’re not responsible for websites we don’t run.</p>

<h2>Please be fair</h2>
<p>Don’t misuse the website or the enquiry form — no spam, no attempts to break or overload it.</p>

<h2>Liability</h2>
<p>Nothing in these terms limits your rights under the Australian Consumer Law. Beyond that, we’re not liable for loss caused by relying on general information on this website.</p>

<h2>Changes and law</h2>
<p>We may update these terms from time to time; the date at the top shows the latest version. These terms are governed by Australian law.</p>

<h2>Questions</h2>
<p>Ask us anything through the <a href="/contact/#enquiry">enquiry form</a>.</p>
`);
  return page({ path: '/terms/', title: 'Terms | Food Online', description: 'The terms for using the Food Online website — in plain English.', body });
}

export function notFound() {
  const body = `<section class="page-hero"><div class="wrap narrow center">
  <p class="eyebrow">Page not found</p>
  <h1>That page isn’t on the menu.</h1>
  <p class="lede">It may have moved. Try one of these instead.</p>
  <div class="btn-row center"><a class="btn btn-ghost" href="/">Home</a>${enquire('', 'Enquire now')}</div>
</div></section>`;
  return page({ path: '/404', title: 'Page not found | Food Online', description: 'This page could not be found.', body, noindex: true });
}
