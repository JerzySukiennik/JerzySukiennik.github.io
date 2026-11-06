/* Gzowo Labs blimps: the Welcome and News notes that used to pop up as windows now ride across the whole plot on two pixel airships,
   drifting slowly between random spots, turning around and bobbing. Each hull is drawn to fit the note on its side. Click one and it
   bursts into pixels; it stays gone until the page is loaded again. */

const OUT = [29, 20, 15];
const PALS = {
  welcome: { hi: "#ffffff", light: "#eef1f6", base: "#d9dee7", dark: "#a9b1bf", accent: "#000080", accent2: "#1084d0", cab: "#c0c0c0", win: "#9fd3ff" },
  news: { hi: "#fff8d6", light: "#ffe98a", base: "#ffd23f", dark: "#d9a21c", accent: "#008080", accent2: "#20b2aa", cab: "#c0c0c0", win: "#9fd3ff" },
};
const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

function drawHull(cv, L, H, finTop, gondH, palName) {
  const pal = Object.fromEntries(Object.entries(PALS[palName]).map(([k, v]) => [k, hexRgb(v)]));
  const cw = L + 2, ch = finTop + H + gondH + 3, cy = finTop + 1 + H / 2;
  cv.width = cw; cv.height = ch;
  const c = cv.getContext("2d"), im = c.createImageData(cw, ch), d = im.data;
  const put = (x, y, col) => { if (x < 0 || y < 0 || x >= cw || y >= ch) return; const i = (y * cw + x) * 4; d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255; };
  const half = (x) => {
    const t = (x + 0.5 - 1) / L, p = 0.58, k = t < 0 || t > 1 ? 0 : t < p ? 1 - Math.pow((p - t) / p, 2.6) : 1 - Math.pow((t - p) / (1 - p), 2);
    return k <= 0 ? 0 : (H / 2) * Math.sqrt(k);
  };
  const tail = Math.round(L * 0.24);
  for (let x = 1; x <= tail; x++) {
    const f = Math.round(finTop * (1 - (x - 1) / tail) + 1), h = half(x);
    for (let k = 0; k < f; k++) {
      const top = Math.floor(cy - h) - k, bot = Math.ceil(cy + h) + k;
      const edge = k === f - 1 || x === 1 || x === tail;
      put(x, top, edge ? OUT : k < f / 2 ? pal.accent : pal.accent2);
      put(x, bot, edge ? OUT : k < f / 2 ? pal.accent : pal.accent2);
    }
  }
  for (let x = 1; x <= L; x++) {
    const h = half(x);
    if (h <= 0.3) continue;
    for (let y = Math.floor(cy - h); y <= Math.ceil(cy + h); y++) {
      const v = (y + 0.5 - cy) / h;
      if (Math.abs(v) > 1) continue;
      let col = v < -0.72 ? pal.hi : v < -0.28 ? pal.light : v < 0.42 ? pal.base : pal.dark;
      if (v > 0.5 && v < 0.68) col = pal.accent;
      if (x % 11 === 0 && Math.abs(v) < 0.9) col = col.map((n) => Math.round(n * 0.93));
      if (x > L * 0.86 && v < -0.2 && v > -0.6) col = pal.hi;
      put(x, y, col);
    }
  }
  for (let x = 2; x <= Math.round(L * 0.17); x++) for (let k = -1; k <= 1; k++) put(x, Math.round(cy) + k, k === 0 ? pal.accent2 : pal.accent);
  const g0 = Math.round(cw / 2 - L * 0.11), g1 = Math.round(cw / 2 + L * 0.11), gy = Math.round(cy + half(Math.round(cw / 2))) - 1;
  for (let x = g0; x <= g1; x++) for (let y = gy; y < gy + gondH; y++) {
    const corner = (x === g0 || x === g1) && y === gy + gondH - 1;
    if (corner) continue;
    const edge = x === g0 || x === g1 || y === gy + gondH - 1;
    put(x, y, edge ? OUT : (y - gy) % 4 === 1 && (x - g0) % 3 === 1 && y < gy + gondH - 2 ? pal.win : pal.cab);
  }
  const copy = new Uint8ClampedArray(d);
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
    const i = (y * cw + x) * 4;
    if (copy[i + 3] === 0) continue;
    const out = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const u = x + dx, w = y + dy; return u < 0 || w < 0 || u >= cw || w >= ch || copy[(w * cw + u) * 4 + 3] === 0; });
    if (out) { d[i] = OUT[0]; d[i + 1] = OUT[1]; d[i + 2] = OUT[2]; }
  }
  c.putImageData(im, 0, 0);
  return { cw, ch, cy };
}

export function createBlimps(world, { calm = false } = {}) {
  const list = [], hidden = () => document.hidden;
  let geo = null, raf = 0, last = 0, paused = false, notes = null;

  function make(kind, html, label) {
    const el = document.createElement("div");
    el.className = "blimp blimp-" + kind;
    el.setAttribute("role", "button");
    el.tabIndex = 0;
    el.setAttribute("aria-label", label + ". Click to pop it.");
    el.title = "Pop!";
    el.innerHTML = `<div class="bl-body"><canvas class="bl-hull"></canvas><i class="bl-prop"></i></div><div class="bl-panel">${html}</div>`;
    el.querySelectorAll("a").forEach((a) => { const s = document.createElement("span"); s.className = "bl-it"; s.innerHTML = a.innerHTML; a.replaceWith(s); });
    world.append(el);
    const b = { kind, el, body: el.firstChild, hull: el.querySelector(".bl-hull"), prop: el.querySelector(".bl-prop"), panel: el.querySelector(".bl-panel"), x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, face: 1, seed: Math.random() * 10, w: 0, h: 0, gone: false };
    const pop = (e) => { e.preventDefault(); e.stopPropagation(); burst(b); };
    el.addEventListener("click", pop);
    el.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") pop(e); });
    list.push(b);
    return b;
  }

  function fit(b) {
    if (!geo || b.gone) return;
    const u = geo.k, pw = b.panel.offsetWidth, ph = b.panel.offsetHeight;
    const H = Math.max(16, Math.ceil(ph / u / 0.8) + 2), L = Math.max(Math.round(H * 3), Math.ceil(pw / u / 0.62) + 2) & ~1, finTop = Math.round(H * 0.34), gondH = Math.max(5, Math.round(H * 0.26));
    const art = drawHull(b.hull, L, H, finTop, gondH, b.kind);
    b.u = u; b.w = art.cw * u; b.h = art.ch * u;
    b.hull.style.width = b.w + "px"; b.hull.style.height = b.h + "px";
    b.el.style.width = b.w + "px"; b.el.style.height = b.h + "px";
    b.panel.style.left = Math.round((b.w - pw) / 2) + "px";
    b.panel.style.top = Math.round(art.cy * u - ph / 2) + "px";
    b.prop.style.left = "0px";
    b.prop.style.top = Math.round((art.cy - 3.5) * u) + "px";
    b.prop.style.width = u + "px"; b.prop.style.height = 7 * u + "px";
    b.art = art;
  }

  const band = () => ({ x0: 0, x1: geo.W, y0: Math.round(geo.H * 0.03), y1: Math.round(Math.min(geo.H * 0.72, geo.river ? geo.river[0] - 40 : geo.H * 0.72)) });
  function aim(b, far) {
    const r = band(), span = Math.max(1, r.x1 - r.x0 - b.w);
    let tx = r.x0 + Math.random() * span;
    if (far && Math.abs(tx - b.x) < span * 0.3) tx = b.x + (b.x - r.x0 > span / 2 ? -1 : 1) * span * (0.3 + Math.random() * 0.4);
    b.tx = Math.max(r.x0, Math.min(r.x1 - b.w, tx));
    b.ty = r.y0 + Math.random() * Math.max(1, r.y1 - r.y0 - b.h);
  }
  function place(b) {
    b.el.style.transform = `translate(${Math.round(b.x)}px,${Math.round(b.y + (calm ? 0 : Math.sin(performance.now() / 1400 + b.seed) * b.u * 1.6))}px)`;
    b.body.style.transform = `scaleX(${b.face.toFixed(3)})`;
  }

  function tick(t) {
    raf = 0;
    if (paused || hidden() || !geo) return;
    const dt = Math.min(0.1, (t - (last || t)) / 1000);
    last = t;
    const speed = Math.max(12, geo.V * 0.011);
    list.forEach((b) => {
      if (b.gone) return;
      if (!calm) {
        const dx = b.tx - b.x, dy = b.ty - b.y, dd = Math.hypot(dx, dy);
        if (dd < speed * 0.8) aim(b, true);
        const k = Math.min(1, dt * 0.35), wx = dd ? (dx / dd) * speed : 0, wy = dd ? (dy / dd) * speed * 0.5 : 0;
        b.vx += (wx - b.vx) * k; b.vy += (wy - b.vy) * k;
        b.x += b.vx * dt; b.y += b.vy * dt;
        const want = b.vx > 2 ? 1 : b.vx < -2 ? -1 : Math.sign(b.face) || 1;
        b.face += Math.max(-dt * 2.4, Math.min(dt * 2.4, want - b.face));
      }
      place(b);
    });
    if (!calm && list.some((b) => !b.gone)) raf = requestAnimationFrame(tick);
  }
  const run = () => { if (!raf && !paused && !hidden()) { last = 0; raf = requestAnimationFrame(tick); } };

  function burst(b) {
    if (b.gone) return;
    b.gone = true;
    const u = b.u, x0 = b.x, y0 = b.y, art = b.art, cv = b.hull, ctx = cv.getContext("2d"), px = ctx.getImageData(0, 0, cv.width, cv.height).data;
    b.el.classList.add("bl-pop");
    const bits = document.createElement("div");
    bits.className = "bl-bits";
    bits.style.transform = `translate(${Math.round(x0)}px,${Math.round(y0)}px)`;
    world.append(bits);
    const cx = cv.width / 2, cy = art.cy, n = 46, made = [];
    for (let i = 0; i < n * 6 && made.length < n; i++) {
      const gx = Math.floor(Math.random() * cv.width), gy = Math.floor(Math.random() * cv.height), j = (gy * cv.width + gx) * 4;
      if (px[j + 3] === 0) continue;
      const s = document.createElement("i"), size = u * (1 + Math.floor(Math.random() * 3));
      s.style.cssText = `left:${(b.face < 0 ? cv.width - gx : gx) * u}px;top:${gy * u}px;width:${size}px;height:${size}px;background:rgb(${px[j]},${px[j + 1]},${px[j + 2]})`;
      bits.append(s);
      const ang = Math.atan2(gy - cy, gx - cx) + (Math.random() - 0.5) * 0.9, v = (60 + Math.random() * 140) * (u / 3);
      made.push(s.animate([{ transform: "translate(0,0) rotate(0)", opacity: 1 }, { transform: `translate(${Math.cos(ang) * v}px,${Math.sin(ang) * v + 160 * (u / 3)}px) rotate(${(Math.random() - 0.5) * 720}deg)`, opacity: 0 }], { duration: 700 + Math.random() * 500, easing: "cubic-bezier(.2,.7,.4,1)", fill: "forwards" }));
    }
    const word = document.createElement("b");
    word.className = "bl-word";
    word.textContent = "POP!";
    word.style.left = Math.round(b.w / 2) + "px";
    word.style.top = Math.round(cy * u) + "px";
    bits.append(word);
    word.animate([{ transform: "translate(-50%,-50%) scale(.3)", opacity: 1 }, { transform: "translate(-50%,-50%) scale(1.25)", opacity: 1, offset: 0.25 }, { transform: "translate(-50%,-90%) scale(1)", opacity: 0 }], { duration: 900, easing: "ease-out", fill: "forwards" });
    b.panel.animate([{ transform: "translate(0,0) rotate(0)", opacity: 1 }, { transform: `translate(${(Math.random() - 0.5) * 60}px,${180 * (u / 3)}px) rotate(${(Math.random() - 0.5) * 50}deg)`, opacity: 0 }], { duration: 1000, easing: "cubic-bezier(.5,0,.9,.6)", fill: "forwards" });
    b.body.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 60, fill: "forwards" });
    setTimeout(() => { b.el.remove(); bits.remove(); }, 1300);
  }

  function start() {
    if (!geo || !notes) return;
    if (!list.length) {
      const w = make("welcome", notes.welcome, "Blimp: Welcome to Gzowo Labs"), n = make("news", notes.news, "Blimp: News");
      list.forEach(fit);
      const V = geo.V;
      w.x = Math.round(V * 0.04); w.y = Math.round(geo.H * 0.05);
      n.x = Math.round(Math.max(V * 0.04, Math.min(V * 0.5, V - n.w - V * 0.04))); n.y = Math.round(geo.H * (geo.mode === "tall" ? 0.11 : 0.14));
      list.forEach((b) => { aim(b, true); b.face = b.tx >= b.x ? 1 : -1; place(b); requestAnimationFrame(() => b.el.classList.add("bl-on")); });
    }
    run();
  }

  document.addEventListener("visibilitychange", () => { if (!document.hidden) run(); });

  return {
    layout(g) {
      geo = g;
      if (!list.length) { start(); return; }
      list.forEach((b) => {
        if (b.gone) return;
        fit(b);
        const r = band();
        b.x = Math.max(r.x0, Math.min(r.x1 - b.w, b.x));
        b.y = Math.max(r.y0, Math.min(r.y1 - b.h, b.y));
        aim(b, false);
        place(b);
      });
      run();
    },
    notes(n) { notes = n; start(); },
    pause(on) { paused = on; if (!on) run(); },
  };
}
