/* Gzowo Labs — the wordmark.
   Two stacked copies of the same text: black underneath, colour on top. The colour
   letter under the cursor fades in as a whole. The smoothness lives in a critically
   damped spring per letter, not in a soft neighbourhood: colour at half opacity over
   a black letter is mud, so the target is binary and time does the blending. */

window.GzowoWordmark = (function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const RAMP = ['#3F7A2A', '#8FC13F', '#F4C534'];

  function hexToRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function rampAt(t) {
    const stops = RAMP.map(hexToRgb);
    const k = Math.max(0, Math.min(t, 1)) * (stops.length - 1);
    const i = Math.min(Math.floor(k), stops.length - 2);
    const f = k - i;
    return 'rgb(' + stops[i].map((v, j) => Math.round(v + (stops[i + 1][j] - v) * f)).join(',') + ')';
  }

  function Spring(value, response) {
    this.x = value; this.v = 0; this.target = value;
    this.omega = (2 * Math.PI) / response;
  }
  Spring.prototype.step = function (dt) {
    const w = this.omega;
    const dx = this.x - this.target;
    const e = Math.exp(-w * dt);
    const nx = this.target + (dx + (this.v + w * dx) * dt) * e;
    this.v = (this.v - (this.v + w * dx) * w * dt) * e;
    this.x = nx;
    return this.x;
  };

  function init(mark, options) {
    const opts = options || {};
    const lines = opts.lines || null;      // when given, rebuilds the layers
    const heightBudget = opts.heightBudget || 0.50;
    const base = mark.querySelector('.mark__base');
    const flood = mark.querySelector('.mark__flood');
    if (!base || !flood) return null;

    if (lines) {
      const html = lines.map((l) => '<span class="w"></span>').join('');
      base.innerHTML = html;
      flood.innerHTML = html;
      lines.forEach((text, i) => {
        base.children[i].textContent = text;
        flood.children[i].textContent = text;
      });
    }

    const words = base.querySelectorAll('.w');
    const letters = [];

    function split() {
      letters.length = 0;
      mark.querySelectorAll('.w').forEach((w) => {
        const text = w.dataset.text || w.textContent;
        w.dataset.text = text;
        w.textContent = '';
        [...text].forEach((chr) => {
          const s = document.createElement('span');
          s.className = 'ch';
          s.textContent = chr === ' ' ? ' ' : chr;
          w.appendChild(s);
        });
      });
      const baseChars = base.querySelectorAll('.ch');
      const litChars = flood.querySelectorAll('.ch');
      const total = Math.max(1, baseChars.length - 1);
      baseChars.forEach((b, i) => {
        litChars[i].style.color = rampAt(i / total);
        letters.push({ base: b, lit: litChars[i], spring: new Spring(0, 0.30), left: 0, right: 0, top: 0, bottom: 0 });
      });
    }

    /* each line is measured and scaled to the same width, with a shared height
       budget — so a different typeface would change the texture, never the footprint */
    function fit() {
      const box = mark.clientWidth;
      if (!box) return;
      const range = document.createRange();
      const sizes = [];
      words.forEach((w, i) => {
        mark.style.setProperty('--fit' + (i + 1), '100px');
        range.selectNodeContents(w);
        const natural = range.getBoundingClientRect().width;
        sizes.push(natural ? (box / natural) * 100 : 100);
      });
      const lh = 0.86;
      const budget = window.innerHeight * heightBudget;
      const total = sizes.reduce((a, b) => a + b, 0) * lh;
      const k = total > budget ? budget / total : 1;
      sizes.forEach((s, i) => {
        mark.style.setProperty('--fit' + (i + 1), Math.max(20, s * k).toFixed(2) + 'px');
      });
    }

    let rect = mark.getBoundingClientRect();
    function measure() {
      rect = mark.getBoundingClientRect();
      letters.forEach((L) => {
        const r = L.base.getBoundingClientRect();
        L.left = r.left - rect.left - 4;
        L.right = r.right - rect.left + 4;
        L.top = r.top - rect.top - 4;
        L.bottom = r.bottom - rect.top + 4;
      });
    }

    let px = -9999, py = -9999, live = false;
    let pointerFine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    let ambient = !pointerFine;
    let introUntil = 0;
    let clock = 0;

    function refresh() { fit(); measure(); }

    function startIntro() {
      refresh();
      if (reduceMotion) { px = rect.width * 0.12; py = rect.height * 0.25; live = true; return; }
      introUntil = performance.now() + 2400;
    }

    window.addEventListener('resize', refresh);
    window.addEventListener('scroll', () => { rect = mark.getBoundingClientRect(); measure(); }, { passive: true });

    window.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') { pointerFine = false; return; }
      pointerFine = true;
      ambient = false;
      introUntil = 0;
      live = true;
      rect = mark.getBoundingClientRect();
      px = e.clientX - rect.left;
      py = e.clientY - rect.top;
    }, { passive: true });

    window.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse') return;
      rect = mark.getBoundingClientRect();
      ambient = false;
      live = true;
      px = e.clientX - rect.left;
      py = e.clientY - rect.top;
    }, { passive: true });

    let last = performance.now();
    function frame(now) {
      const dt = Math.min((now - last) / 1000, 1 / 20);
      last = now;
      if (!reduceMotion) clock += dt;

      if (introUntil > now) {
        const k = 1 - (introUntil - now) / 2400;
        const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        px = rect.width * (-0.08 + 1.16 * e);
        py = rect.height * (0.28 + 0.44 * e);
        live = true;
      } else if (introUntil !== 0 && introUntil <= now) {
        introUntil = 0;
        live = false;
      }

      if (ambient && !reduceMotion) {
        const t = clock * 0.30;
        px = rect.width * (0.5 + 0.55 * Math.sin(t));
        py = rect.height * (0.5 + 0.34 * Math.sin(t * 1.31 + 1.1));
        live = true;
      }

      for (let i = 0; i < letters.length; i++) {
        const L = letters[i];
        const inside = live && px >= L.left && px <= L.right && py >= L.top && py <= L.bottom;
        L.spring.target = inside ? 1 : 0;
        L.lit.style.setProperty('--l', L.spring.step(dt).toFixed(3));
      }
      requestAnimationFrame(frame);
    }

    split();
    refresh();
    startIntro();
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => { refresh(); startIntro(); });
    }
    requestAnimationFrame(frame);

    return { refresh };
  }

  return { init, rampAt };
})();
