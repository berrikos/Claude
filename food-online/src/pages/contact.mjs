import { site, offerings } from '../config.mjs';
import { page, esc, icon } from '../layout.mjs';

const types = ['Café', 'Restaurant', 'Takeaway', 'Dark kitchen', 'Convenience store', 'Fuel station', 'Other'];
const locations = ['1', '2–3', '4–10', 'More than 10'];

export default function contact() {
  const contactLines = [
    site.email && `<li>${icon('mail')}<a href="mailto:${esc(site.email)}">${esc(site.email)}</a></li>`,
    site.phone && `<li>${icon('phone')}<a href="tel:${esc(site.phone.replace(/\s+/g, ''))}">${esc(site.phone)}</a></li>`,
  ].filter(Boolean).join('');

  const turnstile = site.turnstileSiteKey
    ? `<div class="cf-turnstile" data-sitekey="${esc(site.turnstileSiteKey)}" data-theme="light"></div>
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>` : '';

  const body = `
<section class="page-hero contact-hero"><div class="wrap">
  <p class="eyebrow">Enquire</p>
  <h1>Tell us about your business.</h1>
  <p class="lede">We’ll come back with the right mix for you.</p>
</div></section>

<section class="section contact-section" id="enquiry">
  <div class="wrap contact-grid">
    <form class="enquiry" id="enquiry-form" method="post" action="/api/enquiry" novalidate>
      <div class="form-alert" id="form-alert" role="alert" hidden></div>
      <div class="field-row">
        <div class="field"><label for="f-name">Name <span class="req">*</span></label><input id="f-name" name="name" autocomplete="name" required maxlength="120"></div>
        <div class="field"><label for="f-business">Business name</label><input id="f-business" name="business" autocomplete="organization" maxlength="160"></div>
      </div>
      <div class="field-row">
        <div class="field"><label for="f-email">Email <span class="req">*</span></label><input id="f-email" name="email" type="email" autocomplete="email" required maxlength="200"></div>
        <div class="field"><label for="f-phone">Phone</label><input id="f-phone" name="phone" type="tel" autocomplete="tel" maxlength="40"></div>
      </div>
      <div class="field-row">
        <div class="field"><label for="f-type">Business type</label>
          <select id="f-type" name="business_type"><option value="">Choose one</option>${types.map((t) => `<option>${t}</option>`).join('')}</select></div>
        <div class="field"><label for="f-locations">Number of locations</label>
          <select id="f-locations" name="locations"><option value="">Choose one</option>${locations.map((t) => `<option>${t}</option>`).join('')}</select></div>
      </div>
      <fieldset class="field interests">
        <legend>Interested in</legend>
        <div class="check-grid">
          ${offerings.map((o) => `<label class="check"><input type="checkbox" name="interest" value="${o.key}"><span>${o.name}</span></label>`).join('')}
        </div>
      </fieldset>
      <div class="field"><label for="f-message">Message</label><textarea id="f-message" name="message" rows="5" maxlength="4000" placeholder="Tell us a little about your kitchen, your team and what you’d like more of."></textarea></div>
      <div class="hp" aria-hidden="true"><label for="f-website">Leave this empty</label><input id="f-website" name="website" tabindex="-1" autocomplete="off"></div>
      <label class="check consent"><input type="checkbox" name="consent" value="yes" required><span>I’m happy for Food Online to contact me about my enquiry. See our <a href="/privacy/">privacy policy</a>. <span class="req">*</span></span></label>
      ${turnstile}
      <button class="btn btn-primary btn-lg" type="submit">Send enquiry${icon('arrow', 'ic btn-ic')}</button>
    </form>

    <div class="thanks" id="thanks" tabindex="-1" hidden>
      <span class="thanks-ic">${icon('check')}</span>
      <h2>Thanks — we’ve got it.</h2>
      <p>We’ll look at your business and come back to you with the right mix. Keep an eye on your inbox.</p>
      <a class="btn btn-ghost" href="/">Back to home</a>
    </div>

    <aside class="contact-aside">
      <h2>What happens next</h2>
      <ol class="mini-steps">
        <li><b>We read your enquiry</b>and look at what would suit your business.</li>
        <li><b>We get in touch</b>for a quick chat about your kitchen and your goals.</li>
        <li><b>We tailor the right mix</b>and walk you through how it works and what it costs.</li>
      </ol>
      ${contactLines ? `<h2>Prefer to talk?</h2><ul class="contact-lines">${contactLines}</ul>` : ''}
    </aside>
  </div>
</section>
`;
  return page({
    path: '/contact/',
    title: 'Enquire — tell us about your business | Food Online',
    description: 'Tell us about your food business and we’ll come back with the right mix: virtual kitchen brands, ready-made food, an all-in-one point of sale or AI.',
    body,
    bodyClass: 'contact',
  });
}
