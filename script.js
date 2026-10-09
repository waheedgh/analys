(function () {
  'use strict';

  document.documentElement.classList.add('js');

  const start = performance.now();
  const seconds = () => Math.round((performance.now() - start) / 100) / 10;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const canObserve = 'IntersectionObserver' in window;

  const prose = document.querySelector('.prose');
  const sections = Array.from(document.querySelectorAll('.prose > section'));

  window.dataLayer = window.dataLayer || [];
  const logList = document.querySelector('[data-tracking-log]');
  const eventCount = document.querySelector('[data-event-count]');

  function track(event, details) {
    const entry = Object.assign({ event: event, t: seconds() }, details || {});
    window.dataLayer.push(entry);

    if (logList) {
      const li = document.createElement('li');
      const code = document.createElement('code');
      code.textContent = JSON.stringify(entry);
      li.appendChild(code);
      logList.prepend(li);
    }
    if (eventCount) eventCount.textContent = String(window.dataLayer.length);
  }

  track('page_view', { page: document.title });

  const WORDS_PER_MINUTE = 200;

  function countWords() {
    if (!prose) return 0;
    const copy = prose.cloneNode(true);
    copy.querySelectorAll('h2, h3, figure, pre')
      .forEach(function (el) { el.remove(); });
    const text = copy.textContent.trim();
    if (!text) return 0;
    return text.split(/\s+/).filter(function (w) { return /[\p{L}\p{N}]/u.test(w); }).length;
  }

  const words = countWords();
  const wordEl = document.querySelector('[data-wordcount]');
  const timeEl = document.querySelector('[data-readtime]');
  if (wordEl) wordEl.textContent = words.toLocaleString('sv-SE');
  if (timeEl) timeEl.textContent = String(Math.max(1, Math.ceil(words / WORDS_PER_MINUTE)));

  const tocLinks = Array.from(document.querySelectorAll('.toc a'));
  const seen = new Set();

  function setCurrent(id) {
    tocLinks.forEach(function (a) {
      if (a.getAttribute('href') === '#' + id) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
  }

  if (canObserve && sections.length) {
    const sectionObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        const id = entry.target.id;
        setCurrent(id);
        entry.target.classList.add('is-seen');
        if (!seen.has(id)) {
          seen.add(id);
          const h2 = entry.target.querySelector('h2');
          track('section_view', { section: id, title: h2 ? h2.textContent.replace(/^\d+\s*/, '').trim() : id });
        }
      });
    }, {
      rootMargin: '-35% 0px -55% 0px'
    });
    sections.forEach(function (s) { sectionObserver.observe(s); });

    const headingObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.closest('section').classList.add('is-seen');
          headingObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 1 });
    sections.forEach(function (s) {
      const h2 = s.querySelector('h2');
      if (h2) headingObserver.observe(h2);
    });
  } else {
    sections.forEach(function (s) { s.classList.add('is-seen'); });
  }

  tocLinks.forEach(function (a) {
    a.addEventListener('click', function () {
      track('toc_click', { target: a.getAttribute('href').slice(1) });
    });
  });

  if (canObserve && prose) {
    prose.style.position = 'relative';
    const depthObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          track('scroll_depth', { percent: Number(entry.target.dataset.depth) });
          depthObserver.unobserve(entry.target);
        }
      });
    });
    [25, 50, 75, 100].forEach(function (pct) {
      const marker = document.createElement('div');
      marker.setAttribute('aria-hidden', 'true');
      marker.dataset.depth = String(pct);
      marker.style.cssText = 'position:absolute;left:0;width:1px;height:1px;pointer-events:none;top:calc(' + pct + '% - 1px)';
      prose.appendChild(marker);
      depthObserver.observe(marker);
    });
  }

  const flow = document.querySelector('[data-flow]');
  if (flow && canObserve && !reducedMotion) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        flow.classList.toggle('is-live', entry.isIntersecting);
      });
    }, { threshold: 0.4 }).observe(flow);
  }

  const KONAMI = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a'];
  let lastKeys = [];
  const toast = document.querySelector('[data-toast]');
  let toastTimer = null;

  function hideToast() {
    if (!toast) return;
    toast.hidden = true;
    toast.textContent = '';
    clearTimeout(toastTimer);
  }

  function showToast() {
    if (!toast) return;
    toast.textContent = '';
    const title = document.createElement('strong');
    title.textContent = 'ACHIEVEMENT UNLOCKED';
    const text = document.createElement('span');
    text.textContent = 'Du hittade lager 3. Ingen poäng, men respekt.';
    const close = document.createElement('button');
    close.type = 'button';
    close.textContent = 'Stäng (Esc)';
    close.addEventListener('click', hideToast);
    toast.append(title, text, document.createElement('br'), close);
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, 9000);
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { hideToast(); return; }

    const key = (e.key || '').toLowerCase();
    lastKeys.push(key);
    if (lastKeys.length > KONAMI.length) lastKeys.shift();

    if (lastKeys.join(',') === KONAMI.join(',')) {
      lastKeys = [];
      showToast();
      track('konami_unlocked');
      console.log('%c↑ ↑ ↓ ↓ ← → ← → B A', 'color:#7fe08e;font-family:monospace;font-size:14px');
    }
  });

  const ascii = [
    '  _          _ _                             _     _ _ _ ',
    ' | |__   ___| | | ___    __      _____  _ __| | __| | | |',
    " | '_ \\ / _ \\ | |/ _ \\   \\ \\ /\\ / / _ \\| '__| |/ _` | | |",
    ' | | | |  __/ | | (_) |   \\ V  V / (_) | |  | | (_| |_|_|',
    ' |_| |_|\\___|_|_|\\___( )   \\_/\\_/ \\___/|_|  |_|\\__,_(_|_)',
    '                     |/                                  '
  ].join('\n');

  console.log('%c' + ascii, 'color:#7fe08e;background:#0b0f0c;font-family:monospace;font-size:11px;line-height:1.2;padding:8px 12px');
  console.log(
    '%cHej! Om du läser det här har du öppnat utvecklarverktygen.\n' +
    'Skriv dataLayer och tryck Enter för att se allt den simulerade trackingen har "samlat in".\n' +
    'Inget av det har lämnat din dator.',
    'font-family:system-ui,sans-serif;font-size:13px;line-height:1.5'
  );
})();
