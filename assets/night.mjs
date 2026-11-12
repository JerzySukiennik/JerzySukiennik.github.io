/* Gzowo Labs day and night: the plot follows the real sun over Gzowo (52.67 N, 21.12 E). At dusk the light turns warm, then a dark blue veil
   comes down, the lamps and windows light up, stars come out and the moon shows its real phase. ?time=21:30 previews an hour, ?time=now clears it. */

import { SEASON } from "/assets/season.mjs";

const LAT = 52.67, LON = 21.12, RAD = Math.PI / 180, MONTH = 29.530588853;
const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
const WARM = ["lab", "hangar", "museum", "workshop", "booth", "store"];
const OWN = ["arcade", "starnet", "claw", "kiosk", "billboard", "cinema"];
const TUNE = { lab: { dl: 40, h: [195, 219] }, claw: { dl: 40 }, starnet: { dl: 40 }, hangar: { h: [200, 230] }, arcade: { dl: 100 } };

const FAKE = (() => {
  try {
    const q = new URLSearchParams(location.search).get("time");
    if (q === "now") sessionStorage.removeItem("gl-time");
    else if (/^\d{1,2}:\d{2}$/.test(q || "")) sessionStorage.setItem("gl-time", q);
    return sessionStorage.getItem("gl-time");
  } catch (e) { return null; }
})();

function clock() {
  const d = new Date();
  if (!FAKE) return d;
  const [h, m] = FAKE.split(":").map(Number);
  const off = (new Date(d.toLocaleString("en-US", { timeZone: "Europe/Warsaw" })) - new Date(d.toLocaleString("en-US", { timeZone: "UTC" }))) / 60000;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) + (h * 60 + m - off) * 60000);
}

function sunAlt(d) {
  const day = Math.floor((d - Date.UTC(d.getUTCFullYear(), 0, 0)) / 86400000), hour = d.getUTCHours() + d.getUTCMinutes() / 60;
  const y = ((2 * Math.PI) / 365) * (day - 1 + (hour - 12) / 24);
  const eq = 229.18 * (0.000075 + 0.001868 * Math.cos(y) - 0.032077 * Math.sin(y) - 0.014615 * Math.cos(2 * y) - 0.040849 * Math.sin(2 * y));
  const dec = 0.006918 - 0.399912 * Math.cos(y) + 0.070257 * Math.sin(y) - 0.006758 * Math.cos(2 * y) + 0.000907 * Math.sin(2 * y) - 0.002697 * Math.cos(3 * y) + 0.00148 * Math.sin(3 * y);
  const ha = ((hour * 60 + eq + 4 * LON) / 4 - 180) * RAD;
  return Math.asin(Math.sin(LAT * RAD) * Math.sin(dec) + Math.cos(LAT * RAD) * Math.cos(dec) * Math.cos(ha)) / RAD;
}

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };

export function sky() {
  const d = clock(), alt = sunAlt(d);
  const nt = 1 - smooth(-7, 5, alt), warm = clamp(1 - Math.abs(alt - 1) / 8);
  return { alt, nt, warm, night: nt > 0.6, phase: ((((d / 86400000 - 10962.76) % MONTH) + MONTH) % MONTH) / MONTH };
}

function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

function drawMoon(cv, p) {
  const N = 17, c = cv.getContext("2d"), R = N / 2, k = Math.cos(2 * Math.PI * p);
  cv.width = cv.height = N;
  const craters = [[5, 5, 1.6], [10, 8, 2.1], [6, 11, 1.3], [11, 4, 1]];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const nx = (x + 0.5 - R) / R, ny = (y + 0.5 - R) / R;
    if (nx * nx + ny * ny > 1) continue;
    const limb = Math.sqrt(1 - ny * ny), lit = p < 0.5 ? nx > k * limb : nx < -k * limb;
    const pit = craters.some(([cx, cy, r]) => Math.hypot(x - cx, y - cy) < r);
    c.fillStyle = lit ? (pit ? "#d6d1b4" : nx * nx + ny * ny > 0.78 ? "#e9e5cc" : "#f6f3de") : "rgba(190,205,255,.13)";
    c.fillRect(x, y, 1, 1);
  }
}

const lit = new Map();
function litMask(name) {
  if (lit.has(name)) return lit.get(name);
  const job = new Promise((res) => {
    const im = new Image();
    im.onload = () => {
      const cv = document.createElement("canvas"), W = (cv.width = im.naturalWidth), H = (cv.height = im.naturalHeight);
      const c = cv.getContext("2d", { willReadFrequently: true });
      c.drawImage(im, 0, 0);
      const d = c.getImageData(0, 0, W, H), px = d.data, own = OWN.includes(name), T = { dl: 56, h: [185, 222], ...TUNE[name] };
      let n = 0;
      for (let i = 0; i < px.length; i += 4) {
        const r = px[i], g = px[i + 1], b = px[i + 2], a = px[i + 3];
        const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 510, dl = mx - mn;
        let h = 0;
        if (dl) h = mx === r ? ((g - b) / dl) % 6 : mx === g ? (b - r) / dl + 2 : (r - g) / dl + 4;
        h = (h * 60 + 360) % 360;
        const glass = a > 200 && h >= T.h[0] && h <= T.h[1] && dl >= T.dl && l >= 0.55 && l <= 0.93;
        const lamp = a > 200 && h >= 28 && h <= 62 && dl >= 100 && l >= 0.5 && l <= 0.92;
        if (glass && !own) { px[i] = 255; px[i + 1] = 214 - Math.round((0.93 - l) * 90); px[i + 2] = 118; px[i + 3] = 235; n++; }
        else if (lamp || (glass && own)) { px[i] = Math.min(255, r + 26); px[i + 1] = Math.min(255, g + 26); px[i + 2] = Math.min(255, b + 26); px[i + 3] = 255; n++; }
        else px[i + 3] = 0;
      }
      if (n < 6) { res(null); return; }
      c.putImageData(d, 0, 0);
      res(cv);
    };
    im.onerror = () => res(null);
    im.src = `/assets/map/${name}.webp`;
  });
  lit.set(name, job);
  return job;
}

export function createNight(world) {
  const mk = (tag, cls) => { const e = document.createElement(tag); e.className = cls; e.setAttribute("aria-hidden", "true"); return e; };
  const sun = mk("img", "nt-sun"), warm = mk("i", "nt-warm"), veil = mk("i", "nt-veil"), stars = mk("div", "nt-sky"), moon = mk("canvas", "nt-moon"), lights = mk("div", "nt-lights"), bugs = mk("div", "nt-bugs");
  sun.src = "/assets/map/sun.webp";
  sun.alt = "";
  const sa = mk("canvas", "nt-stars"), sb = mk("canvas", "nt-stars nt-tw lv");
  stars.append(sa, sb);
  world.append(sun, warm, veil, stars, moon, lights, bugs);
  let g = null, state = null, built = false, phase = -1;

  function paintStars() {
    const k = g.k, top = g.mode === "tall" ? g.horizon - 30 * g.s : g.mural.y - 2 * g.s, W = Math.ceil(g.W / k), H = Math.max(4, Math.floor(top / k)), r = rng(90210 + W);
    [sa, sb].forEach((cv, n) => {
      cv.width = W; cv.height = H;
      cv.style.width = W * k + "px"; cv.style.height = H * k + "px";
      const c = cv.getContext("2d");
      const count = Math.round((W * H) / (n ? 520 : 300));
      for (let i = 0; i < count; i++) {
        const x = Math.floor(r() * W), y = Math.floor(r() * r() * H), t = r();
        c.fillStyle = t < 0.12 ? "#ffe9b0" : t < 0.24 ? "#bcd4ff" : "#ffffff";
        c.globalAlpha = 0.45 + r() * 0.55;
        c.fillRect(x, y, 1, 1);
        if (n && t > 0.9) { c.globalAlpha = 0.5; c.fillRect(x - 1, y, 3, 1); c.fillRect(x, y - 1, 1, 3); }
      }
    });
  }

  function build() {
    built = true;
    lights.textContent = "";
    const s = g.s, glow = (cx, cy, d, cls = "nt-glow") => {
      const e = mk("i", cls);
      e.style.cssText = `left:${(cx - d / 2).toFixed(0)}px;top:${(cy - d / 2).toFixed(0)}px;width:${d.toFixed(0)}px;height:${d.toFixed(0)}px`;
      lights.append(e);
      return e;
    };
    (g.props || []).filter((o) => o.sprite === "lamp").forEach((o) => {
      glow(o.x + o.w / 2, o.y + o.h * 0.16, 150 * s);
      const p = glow(o.x + o.w / 2, o.y + o.h, 170 * s, "nt-pool");
      p.style.height = 46 * s + "px";
      p.style.top = o.y + o.h - 23 * s + "px";
    });
    Object.entries(g.places).forEach(([key, b], i) => {
      const name = b.sprite;
      if (name === "exchange") { glow(b.x + b.w / 2, b.y + b.h * 0.74, b.w * 0.62, "nt-glow nt-soft"); glow(b.x + b.w / 2, b.y + b.h * 0.8, b.w * 0.22); return; }
      if (!WARM.includes(name) && !OWN.includes(name)) return;
      litMask(name).then((cv) => {
        if (!cv || !lights.isConnected || b !== g.places[key]) return;
        const el = mk("canvas", "nt-win");
        el.width = cv.width; el.height = cv.height;
        el.getContext("2d").drawImage(cv, 0, 0);
        el.style.cssText = `left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.h}px;transition-delay:${((i * 7) % 11) * 0.35}s`;
        lights.append(el);
        if (name !== "billboard" && name !== "claw") glow(b.x + b.w / 2, b.y + b.h * 0.72, Math.min(b.w, b.h) * 1.25, "nt-glow nt-soft");
      });
    });
    bugs.textContent = "";
    if ((SEASON === "summer" || SEASON === "spring") && !calm) {
      const r = rng(4477), top = g.horizon + 40 * s, bot = g.river[0] - 20 * s;
      for (let i = 0; i < Math.round(g.W / 190); i++) {
        const e = mk("i", "nt-bug lv");
        e.style.cssText = `left:${(r() * g.W).toFixed(0)}px;top:${(top + r() * (bot - top)).toFixed(0)}px;--d:${(5 + r() * 6).toFixed(1)}s;--dl:${(-r() * 9).toFixed(1)}s;--dx:${((r() - 0.5) * 90 * s).toFixed(0)}px;--dy:${((r() - 0.5) * 50 * s).toFixed(0)}px`;
        bugs.append(e);
      }
    }
  }

  function apply() {
    const was = state && state.night;
    state = sky();
    window.gzNight = state;
    world.style.setProperty("--nt", state.nt.toFixed(3));
    world.style.setProperty("--warm", state.warm.toFixed(3));
    world.classList.toggle("is-night", state.night);
    world.classList.toggle("is-dusk", state.nt > 0.3);
    if (g) {
      const sink = clamp((6 - state.alt) / 12);
      sun.style.transform = `translateY(${(sink * g.sun.h * 1.7).toFixed(0)}px)`;
      sun.style.opacity = (1 - smooth(0.55, 1, sink)).toFixed(2);
      if (state.nt > 0.25 && !built) build();
      if (Math.abs(state.phase - phase) > 0.01) { phase = state.phase; drawMoon(moon, phase); }
    }
    if (was !== state.night) dispatchEvent(new CustomEvent("gz:night", { detail: state }));
  }

  setInterval(() => { if (!document.hidden) apply(); }, 60000);
  addEventListener("visibilitychange", () => { if (!document.hidden) apply(); });
  addEventListener("gz:rain", (e) => world.classList.toggle("nt-rain", !!(e.detail && e.detail.on)));
  apply();

  return {
    layout(geo) {
      g = geo;
      built = false;
      const o = g.sun, m = o.w * 0.72;
      Object.assign(sun.style, { left: o.x + "px", top: o.y + "px", width: o.w + "px", height: o.h + "px" });
      Object.assign(moon.style, { left: o.x + (o.w - m) / 2 + "px", top: o.y + (o.h - m) / 2 + "px", width: m + "px", height: m + "px" });
      paintStars();
      apply();
    },
    state: () => state,
  };
}
