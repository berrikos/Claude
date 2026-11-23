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

  // Reveal on scroll — only what starts below the fold is hidden, so the first
  // screen is complete before any script runs.
  const canAnimate = 'IntersectionObserver' in window && !reduceMotion;
  if (canAnimate) root.classList.add('js-anim');
  const onView = (els, cb, opts = {}) => {
    if (!('IntersectionObserver' in window)) { els.forEach((el) => cb(el, true)); return; }
    const io = new IntersectionObserver((entries) => entries.forEach((e) => cb(e.target, e.isIntersecting, io)), opts);
    els.forEach((el) => io.observe(el));
  };
  if (canAnimate) {
    const pending = [...document.querySelectorAll('.reveal')].filter((el) => el.getBoundingClientRect().top > innerHeight * 0.92);
    pending.forEach((el) => el.classList.add('pending'));
    onView(pending, (el, vis, io) => { if (vis) { el.classList.remove('pending'); io.unobserve(el); } }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
  }
  onView(document.querySelectorAll('.scr-dash, .fronts'), (el, vis, io) => { if (vis) { el.classList.add('is-in'); io && io.unobserve(el); } }, { threshold: 0.3 });

  // Visibility flag on every live element, so loops only run while on screen.
  const live = document.querySelectorAll('[data-live-kds], [data-live-chat], .scr-board, .scr-kds, .tablets, .float-chip');
  onView(live, (el, vis) => { el.dataset.vis = vis ? '1' : ''; el.classList.toggle('paused', !vis); });
  const visible = (el) => el.dataset.vis === '1' && !document.hidden;

  if (!reduceMotion) {
    const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    // Ticket timers
    setInterval(() => {
      document.querySelectorAll('.scr-kds').forEach((scr) => {
        if (!visible(scr)) return;
        scr.querySelectorAll('.kds-grid .tk-time').forEach((t) => { const v = +t.dataset.t + 1; t.dataset.t = v; t.textContent = fmt(v); });
      });
    }, 1000);

    // Live kitchen screen: the oldest ticket is marked ready and a new one arrives.
    document.querySelectorAll('[data-live-kds]').forEach((scr) => {
      const grid = scr.querySelector('.kds-grid');
      const pool = [...scr.querySelector('template').content.children];
      let next = 8;
      setInterval(() => {
        if (!visible(scr)) return;
        const first = grid.firstElementChild;
        first.classList.add('is-done');
        first.querySelector('.tk-ready').textContent = 'Done ✓';
        setTimeout(() => {
          first.remove();
          const t = pool[next++ % pool.length].cloneNode(true);
          const time = t.querySelector('.tk-time'); time.dataset.t = Math.floor(Math.random() * 20); time.textContent = fmt(+time.dataset.t);
          t.classList.add('is-new');
          grid.append(t);
        }, 480);
      }, 3400);
    });

    // Order screen: numbers move from Preparing to Ready.
    document.querySelectorAll('.scr-board').forEach((scr) => {
      const prep = scr.querySelector('[data-board-prep]');
      const ready = scr.querySelector('[data-board-ready]');
      let n = 120;
      setInterval(() => {
        if (!visible(scr)) return;
        const moving = prep.firstElementChild;
        ready.prepend(moving);
        if (ready.children.length > 4) ready.lastElementChild.remove();
        const s = document.createElement('span'); s.textContent = String(n++); prep.append(s);
      }, 3000);
    });

    // AI chat: messages arrive one by one, then the conversation replays.
    document.querySelectorAll('[data-live-chat]').forEach((scr) => {
      const msgs = [...scr.querySelectorAll('.msg')];
      const feed = scr.querySelector('.chat-feed');
      const typing = document.createElement('li'); typing.className = 'typing'; typing.innerHTML = '<i></i><i></i><i></i>';
      let i = 0;
      const reset = () => { msgs.forEach((m, k) => m.classList.toggle('is-hidden', k > 2)); i = 3; };
      reset();
      const tick = () => {
        if (!visible(scr)) return setTimeout(tick, 800);
        if (i >= msgs.length) { setTimeout(() => { reset(); tick(); }, 5000); return; }
        const m = msgs[i];
        if (m.classList.contains('msg-in')) feed.insertBefore(typing, m);
        setTimeout(() => {
          typing.remove();
          m.classList.remove('is-hidden'); m.classList.add('is-new');
          i++; setTimeout(tick, 1500);
        }, m.classList.contains('msg-in') ? 1100 : 400);
      };
      setTimeout(tick, 1200);
    });
  }

  // Servatto tour: the sticky screen follows the step in the middle of the view.
  const steps = document.querySelectorAll('.tour-step');
  if (steps.length && 'IntersectionObserver' in window) {
    onView(steps, (el, vis) => {
      if (!vis) return;
      const tour = el.closest('.tour');
      const i = el.dataset.step;
      tour.querySelectorAll('.tour-step').forEach((s) => s.classList.toggle('is-active', s === el));
      tour.querySelectorAll('.tour-slide').forEach((s) => s.classList.toggle('is-on', s.dataset.slide === i));
    }, { rootMargin: '-45% 0px -45% 0px' });
  }

  // Videos: load when near the viewport, play only while visible.
  const vids = document.querySelectorAll('video.lazy-video');
  onView(vids, (v, vis) => {
    if (vis) { if (!v.src && v.dataset.src) v.src = v.dataset.src; if (!reduceMotion) v.play().catch(() => {}); }
    else if (!v.paused) v.pause();
  }, { rootMargin: '200px 0px', threshold: 0.01 });

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
