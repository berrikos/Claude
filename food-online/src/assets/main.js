// Food Online — small, dependency-free progressive enhancement.
(() => {
  const root = document.documentElement;
  root.classList.add('js-ready');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Mobile menu
  const toggle = document.querySelector('.nav-toggle');
  if (toggle) {
    const setOpen = (open) => {
      document.body.classList.toggle('nav-open', open);
      toggle.setAttribute('aria-expanded', String(open));
    };
    toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
    document.querySelectorAll('.main-nav a').forEach((a) => a.addEventListener('click', () => setOpen(false)));
  }

  // Reveal on scroll
  const reveals = document.querySelectorAll('.reveal, .wa');
  if ('IntersectionObserver' in window && !reduceMotion) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add('is-in'));
  }

  // Videos: load when near the viewport, play only while visible.
  const vids = document.querySelectorAll('video.lazy-video');
  if (vids.length && 'IntersectionObserver' in window) {
    const vio = new IntersectionObserver((entries) => {
      entries.forEach(({ target: v, isIntersecting }) => {
        if (isIntersecting) {
          if (!v.src && v.dataset.src) { v.src = v.dataset.src; }
          if (!reduceMotion) v.play().catch(() => {});
        } else if (!v.paused) {
          v.pause();
        }
      });
    }, { rootMargin: '200px 0px', threshold: 0.01 });
    vids.forEach((v) => vio.observe(v));
  }

  // Pause decorative CSS animations while off-screen.
  const anim = document.querySelectorAll('.tablets');
  if (anim.length && 'IntersectionObserver' in window) {
    const aio = new IntersectionObserver((entries) => {
      entries.forEach((e) => e.target.classList.toggle('paused', !e.isIntersecting));
    });
    anim.forEach((el) => aio.observe(el));
  }

  // Enquiry form
  const form = document.getElementById('enquiry-form');
  if (!form) return;
  const params = new URLSearchParams(location.search);
  const thanks = document.getElementById('thanks');
  const alertBox = document.getElementById('form-alert');

  params.getAll('interest').flatMap((v) => v.split(',')).forEach((key) => {
    const box = form.querySelector(`input[name="interest"][value="${CSS.escape(key)}"]`);
    if (box) box.checked = true;
  });

  const showThanks = () => {
    form.hidden = true;
    thanks.hidden = false;
    thanks.focus();
    thanks.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
  };
  const showError = (msg) => {
    alertBox.textContent = msg;
    alertBox.hidden = false;
    alertBox.scrollIntoView({ block: 'center' });
  };

  if (params.get('sent') === '1') showThanks();
  if (params.get('error')) showError(params.get('error'));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    alertBox.hidden = true;
    form.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));

    const bad = [];
    const name = form.elements.name;
    const email = form.elements.email;
    const consent = form.elements.consent;
    if (!name.value.trim()) bad.push([name, 'your name']);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) bad.push([email, 'a valid email']);
    if (!consent.checked) bad.push([consent, 'your OK to contact you']);
    if (bad.length) {
      bad.forEach(([el]) => el.setAttribute('aria-invalid', 'true'));
      showError(`Please add ${bad.map((b) => b[1]).join(', ')}.`);
      bad[0][0].focus();
      return;
    }

    const btn = form.querySelector('button[type="submit"]');
    const label = btn.innerHTML;
    btn.disabled = true;
    btn.textContent = 'Sending…';
    try {
      const res = await fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
      showThanks();
    } catch (err) {
      showError(err.message || 'Something went wrong. Please try again.');
      if (window.turnstile) window.turnstile.reset();
    } finally {
      btn.disabled = false;
      btn.innerHTML = label;
    }
  });
})();
