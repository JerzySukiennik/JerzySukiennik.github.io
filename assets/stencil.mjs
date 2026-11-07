/* Gzowo Labs wall stencils: the ready made cardboard stencils, the cutting board where visitors cut their own with a knife, a hole punch,
   glue and letters, stencils cut automatically from a picture, and the tracing that turns a cut sheet into smooth outlines the wall
   clips spray paint to. A picture is cropped to what is in it and its background is flood filled from the edge so light parts inside an
   outline stay. In Colors mode the picture is split into color layers, each traced on its own and grown a pixel so neighbors overlap:
   on the wall the stencil shows one layer at a time, so painting every layer in its color gives back the whole picture, and with all
   layers open the overlaps cancel into thin cardboard bridges. Every hole remembers its color for its rim. Outlines are normalized 0..1. */

const N = 256, NI = 768, QI = NI / N, BG_TOL = 40, PIC_BUDGET = 2000, H_MAX = 29000, KEY = "gl-stencils", MAX = 24, VIEW_PX = 640, BUDGET = 1400, FONT = '"Arial Black", Impact, "Helvetica Neue", sans-serif';
const PUNCH = [6, 12, 22], TEXT = [0.13, 0.2, 0.3], CARD = "#c49a5e";
const DETAIL = { budget: [0.8, 1.6, 2.2, 2.6, 3], colors: [6, 10, 13, 16, 20], merge: [1.35, 1, 0.78, 0.62, 0.5], blur: [1.2, 1, 0.75, 0.55, 0.4], edge: [1, 1.8, 2.1, 2.4, 2.8], speck: [1.7, 1, 0.55, 0.32, 0.2], name: ["rough", "normal", "fine", "finer", "finest"], DET_KEY: "gl-imp-detail" };
const clampN = (v, a, b) => Math.min(b, Math.max(a, v));
const LIN = Float32Array.from({ length: 256 }, (_, i) => { const v = i / 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
const fL = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
function labOf(r, g, b, T) {
  const o = new Float32Array(T * 3);
  for (let i = 0; i < T; i++) {
    const R = LIN[r[i] | 0], G = LIN[g[i] | 0], B = LIN[b[i] | 0], y = fL(R * 0.2126 + G * 0.7152 + B * 0.0722);
    o[i * 3] = 116 * y - 16; o[i * 3 + 1] = 500 * (fL((R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047) - y); o[i * 3 + 2] = 200 * (y - fL((R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883));
  }
  return o;
}
function absorb(lab, n, min) {
  const T = NI * NI, seen = new Int32Array(T), q = new Int32Array(T), votes = new Int32Array(n);
  for (let pass = 0; pass < 2; pass++) {
    seen.fill(-1);
    for (let s0 = 0; s0 < T; s0++) {
      const k = lab[s0];
      if (k < 0 || seen[s0] >= 0) continue;
      let h = 0, t = 0;
      q[t++] = s0; seen[s0] = s0;
      votes.fill(0);
      while (h < t) {
        const i = q[h++], x = i % NI;
        for (const j of [x > 0 ? i - 1 : -1, x < NI - 1 ? i + 1 : -1, i >= NI ? i - NI : -1, i < T - NI ? i + NI : -1]) {
          if (j < 0) continue;
          const l = lab[j];
          if (l === k) { if (seen[j] < 0) { seen[j] = s0; q[t++] = j; } }
          else if (l >= 0) votes[l]++;
        }
      }
      if (t >= min) continue;
      let best = -1, bv = 0;
      for (let l = 0; l < n; l++) if (votes[l] > bv) { bv = votes[l]; best = l; }
      if (best >= 0) for (let m = 0; m < t; m++) lab[q[m]] = best;
    }
  }
}
function rgbOf([L, A, B]) {
  const fy = (L + 16) / 116, inv = (t) => (t ** 3 > 0.008856 ? t ** 3 : (t - 16 / 116) / 7.787), x = 0.95047 * inv(fy + A / 500), y = inv(fy), z = 1.08883 * inv(fy - B / 200);
  const gam = (v) => 255 * clampN(v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055, 0, 1);
  return [gam(3.2406 * x - 1.5372 * y - 0.4986 * z), gam(-0.9689 * x + 1.8758 * y + 0.0415 * z), gam(0.0557 * x - 0.204 * y + 1.057 * z)];
}
const PASTE = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || "") ? "⌘V" : "Ctrl+V";

function star(cx, cy, R, r, n) {
  const pts = [];
  for (let i = 0; i < n * 2; i++) { const a = -Math.PI / 2 + (i * Math.PI) / n, d = i % 2 ? r : R; pts.push([cx + Math.cos(a) * d, cy + Math.sin(a) * d]); }
  return pts;
}
function fillPts(x, pts) { x.beginPath(); pts.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b))); x.closePath(); x.fill(); }
function word(x, n, text, cy = 0.5) {
  let s = n * 0.34;
  x.font = `900 ${s}px ${FONT}`;
  const w = x.measureText(text).width;
  if (w > n * 0.84) { s *= (n * 0.84) / w; x.font = `900 ${s}px ${FONT}`; }
  x.textAlign = "center"; x.textBaseline = "middle";
  x.fillText(text, n / 2, n * cy);
}
const cut = (x, f) => { x.globalCompositeOperation = "destination-out"; f(); x.globalCompositeOperation = "source-over"; };

const PRESETS = [
  ["star", "Star", (x, n) => fillPts(x, star(n / 2, n * 0.53, n * 0.42, n * 0.17, 5))],
  ["heart", "Heart", (x, n) => {
    x.beginPath(); x.moveTo(n * 0.5, n * 0.86);
    x.bezierCurveTo(n * 0.1, n * 0.6, n * 0.06, n * 0.3, n * 0.27, n * 0.2); x.bezierCurveTo(n * 0.4, n * 0.14, n * 0.48, n * 0.22, n * 0.5, n * 0.31);
    x.bezierCurveTo(n * 0.52, n * 0.22, n * 0.6, n * 0.14, n * 0.73, n * 0.2); x.bezierCurveTo(n * 0.94, n * 0.3, n * 0.9, n * 0.6, n * 0.5, n * 0.86);
    x.fill();
  }],
  ["bolt", "Lightning", (x, n) => fillPts(x, [[0.58, 0.08], [0.24, 0.55], [0.47, 0.55], [0.38, 0.92], [0.77, 0.4], [0.53, 0.4], [0.66, 0.08]].map(([a, b]) => [a * n, b * n]))],
  ["rocket", "Rocket", (x, n) => {
    fillPts(x, [[0.5, 0.08], [0.6, 0.24], [0.6, 0.66], [0.4, 0.66], [0.4, 0.24]].map(([a, b]) => [a * n, b * n]));
    fillPts(x, [[0.38, 0.5], [0.24, 0.72], [0.38, 0.68]].map(([a, b]) => [a * n, b * n]));
    fillPts(x, [[0.62, 0.5], [0.76, 0.72], [0.62, 0.68]].map(([a, b]) => [a * n, b * n]));
    fillPts(x, [[0.43, 0.71], [0.5, 0.92], [0.57, 0.71]].map(([a, b]) => [a * n, b * n]));
    cut(x, () => { x.beginPath(); x.arc(n * 0.5, n * 0.36, n * 0.05, 0, Math.PI * 2); x.fill(); });
  }],
  ["cone", "Pine cone", (x, n) => {
    x.beginPath(); x.ellipse(n * 0.5, n * 0.56, n * 0.23, n * 0.33, 0, 0, Math.PI * 2); x.fill();
    x.fillRect(n * 0.47, n * 0.08, n * 0.06, n * 0.1);
    cut(x, () => {
      x.lineWidth = n * 0.026; x.lineCap = "round";
      for (let i = -3; i <= 3; i++) {
        x.beginPath(); x.moveTo(n * (0.5 + i * 0.09 - 0.25), n * 0.3); x.lineTo(n * (0.5 + i * 0.09 + 0.25), n * 0.86); x.stroke();
        x.beginPath(); x.moveTo(n * (0.5 + i * 0.09 + 0.25), n * 0.3); x.lineTo(n * (0.5 + i * 0.09 - 0.25), n * 0.86); x.stroke();
      }
    });
  }],
  ["crown", "Crown", (x, n) => {
    fillPts(x, [[0.12, 0.3], [0.32, 0.52], [0.5, 0.2], [0.68, 0.52], [0.88, 0.3], [0.8, 0.72], [0.2, 0.72]].map(([a, b]) => [a * n, b * n]));
    x.fillRect(n * 0.2, n * 0.76, n * 0.6, n * 0.08);
  }],
  ["arrow", "Arrow", (x, n) => fillPts(x, [[0.08, 0.4], [0.56, 0.4], [0.56, 0.22], [0.92, 0.5], [0.56, 0.78], [0.56, 0.6], [0.08, 0.6]].map(([a, b]) => [a * n, b * n]))],
  ["smile", "Smiley", (x, n) => {
    x.beginPath(); x.arc(n / 2, n / 2, n * 0.4, 0, Math.PI * 2); x.fill();
    cut(x, () => {
      x.beginPath(); x.ellipse(n * 0.37, n * 0.4, n * 0.055, n * 0.085, 0, 0, Math.PI * 2); x.ellipse(n * 0.63, n * 0.4, n * 0.055, n * 0.085, 0, 0, Math.PI * 2); x.fill();
      x.lineWidth = n * 0.07; x.lineCap = "round"; x.beginPath(); x.arc(n / 2, n * 0.5, n * 0.22, 0.2 * Math.PI, 0.8 * Math.PI); x.stroke();
    });
  }],
  ["circle", "Circle", (x, n) => { x.beginPath(); x.arc(n / 2, n / 2, n * 0.4, 0, Math.PI * 2); x.fill(); }],
  ["square", "Square", (x, n) => x.fillRect(n * 0.12, n * 0.12, n * 0.76, n * 0.76)],
  ["gzowo", "GZOWO", (x, n) => word(x, n, "GZOWO")],
  ["gsp", "GSP", (x, n) => word(x, n, "GSP")],
];

const ctx2d = (cv) => cv.getContext("2d", { willReadFrequently: true });

function fieldOf(cv) {
  const d = ctx2d(cv).getImageData(0, 0, N, N).data, f = new Float32Array(N * N);
  for (let i = 0; i < N * N; i++) f[i] = d[i * 4 + 3] / 255;
  return f;
}

export function simplify(pts, eps) {
  const n = pts.length / 2;
  if (n < 4) return pts;
  let far = 0, best = -1;
  for (let i = 1; i < n; i++) { const d = (pts[i * 2] - pts[0]) ** 2 + (pts[i * 2 + 1] - pts[1]) ** 2; if (d > best) { best = d; far = i; } }
  const chain = (a, b) => {
    const keep = [a], go = (i, j) => {
      const ax = pts[i * 2], ay = pts[i * 2 + 1], bx = pts[(j % n) * 2], by = pts[(j % n) * 2 + 1], L = Math.hypot(bx - ax, by - ay) || 1;
      let worst = 0, at = -1;
      for (let k = i + 1; k < j; k++) {
        const px = pts[(k % n) * 2], py = pts[(k % n) * 2 + 1], d = Math.abs((bx - ax) * (ay - py) - (ax - px) * (by - ay)) / L;
        if (d > worst) { worst = d; at = k; }
      }
      if (worst > eps) { go(i, at); keep.push(at); go(at, j); }
    };
    go(a, b);
    return keep;
  };
  const idx = [...chain(0, far), ...chain(far, n)].map((i) => i % n);
  const out = [];
  idx.forEach((i) => out.push(pts[i * 2], pts[i * 2 + 1]));
  return out;
}

function area(p) { let s = 0; for (let i = 0; i < p.length; i += 2) { const j = (i + 2) % p.length; s += p[i] * p[j + 1] - p[j] * p[i + 1]; } return s / 2; }

function loopsOf(f, n, speck) {
  const P = n + 2, ids = P * P * 2, adj = new Int32Array(ids * 2).fill(-1), xy = new Float32Array(ids * 2);
  const at = (x, y) => (x < 0 || y < 0 || x >= n || y >= n ? 0 : f[y * n + x]);
  const hid = (x, y) => ((y + 1) * P + x + 1) * 2, vid = (x, y) => ((y + 1) * P + x + 1) * 2 + 1;
  const t = (p, q) => (0.5 - p) / (q - p);
  const link = (i, j) => { adj[i * 2 + (adj[i * 2] === -1 ? 0 : 1)] = j; adj[j * 2 + (adj[j * 2] === -1 ? 0 : 1)] = i; };
  for (let y = -1; y < n; y++) for (let x = -1; x < n; x++) {
    const a = at(x, y), b = at(x + 1, y), c = at(x + 1, y + 1), d = at(x, y + 1);
    const ia = a >= 0.5, ib = b >= 0.5, ic = c >= 0.5, id = d >= 0.5, k = (ia ? 8 : 0) | (ib ? 4 : 0) | (ic ? 2 : 0) | (id ? 1 : 0);
    if (k === 0 || k === 15) continue;
    const T = hid(x, y), B = hid(x, y + 1), L = vid(x, y), R = vid(x + 1, y);
    if (ia !== ib) { xy[T * 2] = x + 0.5 + t(a, b); xy[T * 2 + 1] = y + 0.5; }
    if (id !== ic) { xy[B * 2] = x + 0.5 + t(d, c); xy[B * 2 + 1] = y + 1.5; }
    if (ia !== id) { xy[L * 2] = x + 0.5; xy[L * 2 + 1] = y + 0.5 + t(a, d); }
    if (ib !== ic) { xy[R * 2] = x + 1.5; xy[R * 2 + 1] = y + 0.5 + t(b, c); }
    const mid = (a + b + c + d) / 4 >= 0.5;
    switch (k) {
      case 1: case 14: link(L, B); break;
      case 2: case 13: link(B, R); break;
      case 3: case 12: link(L, R); break;
      case 4: case 11: link(T, R); break;
      case 6: case 9: link(T, B); break;
      case 7: case 8: link(T, L); break;
      case 5: if (mid) { link(T, L); link(B, R); } else { link(T, R); link(L, B); } break;
      case 10: if (mid) { link(T, R); link(L, B); } else { link(T, L); link(B, R); } break;
    }
  }
  const seen = new Uint8Array(ids), loops = [];
  for (let s = 0; s < ids; s++) {
    if (adj[s * 2] === -1 || seen[s]) continue;
    const pts = [];
    let prev = -1, cur = s, guard = 0;
    do {
      seen[cur] = 1;
      pts.push(xy[cur * 2], xy[cur * 2 + 1]);
      const nx = adj[cur * 2] !== prev ? adj[cur * 2] : adj[cur * 2 + 1];
      prev = cur; cur = nx;
    } while (cur !== s && cur !== -1 && guard++ < 1e6);
    if (pts.length >= 6 && Math.abs(area(pts)) >= speck) loops.push(pts);
  }
  return loops;
}

function fit(items, n, budget) {
  items.sort((p, q) => Math.abs(area(q.pts)) - Math.abs(area(p.pts)));
  const total = (r) => r.reduce((s, l) => s + l.pts.length, 0), at = (eps) => items.map((l) => ({ pts: simplify(l.pts, eps), tag: l.tag }));
  let eps = 0.3, res = at(eps);
  while (total(res) > budget && eps < 4 * (n / N)) { eps *= 1.35; res = at(eps); }
  res = res.filter((l) => l.pts.length >= 6);
  while (res.length > 1 && total(res) > budget) res.pop();
  const out = res.map((l) => ({ pts: Float64Array.from(l.pts, (v) => Math.min(1, Math.max(0, v / n))), tag: l.tag }));
  out.eps = eps; out.lost = items.length - res.length;
  return out;
}
function dilate(f, n, g) {
  let a = f;
  for (let pass = 0; pass < 2; pass++) {
    const st = pass ? n : 1, b = new Float32Array(n * n);
    for (let line = 0; line < n; line++) {
      const base = pass ? line : line * n;
      for (let x = 0; x < n; x++) {
        let m = 0;
        for (let k = Math.max(0, x - g), e = Math.min(n - 1, x + g); k <= e && m < 1; k++) { const v = a[base + k * st]; if (v > m) m = v; }
        b[base + x * st] = m;
      }
    }
    a = b;
  }
  return a;
}

export function trace(f, n = N, budget = BUDGET, speck = 2) {
  return fit(loopsOf(f, n, speck).map((pts) => ({ pts, tag: 0 })), n, budget).map((l) => l.pts);
}

const cache = new Map();
function presetStencil([id, name, draw]) {
  const key = "p:" + id;
  if (cache.has(key)) return cache.get(key);
  const cv = document.createElement("canvas");
  cv.width = cv.height = N;
  const x = ctx2d(cv);
  x.fillStyle = x.strokeStyle = "#000";
  draw(x, N);
  const st = { id: key, name, holes: trace(fieldOf(cv)) };
  cache.set(key, st);
  return st;
}
export const presets = () => PRESETS.map(presetStencil);

const old = (h) => h.every((v) => Math.abs(v * 128 - Math.round(v * 128)) < 0.07);
function soften(h) {
  let p = Array.from(h);
  for (let r = 0; r < 3; r++) {
    const o = [], m = p.length / 2;
    for (let i = 0; i < m; i++) {
      const j = (i + 1) % m, ax = p[i * 2], ay = p[i * 2 + 1], bx = p[j * 2], by = p[j * 2 + 1];
      o.push(ax * 0.75 + bx * 0.25, ay * 0.75 + by * 0.25, ax * 0.25 + bx * 0.75, ay * 0.25 + by * 0.75);
    }
    p = o;
  }
  return Float64Array.from(simplify(p, 0.0012));
}

const enc = (holes) => holes.map((h) => Array.from(h, (v) => Math.round(v * 1000)).join(",")).join(";");
function dec(h, c) {
  const cs = String(c || "").split(","), holes = [], colors = [];
  String(h || "").split(";").forEach((q, i) => {
    const p = Float64Array.from(q.split(","), (v) => +v / 1000);
    if (p.length < 6 || p.length % 2 || !p.every((v) => v >= 0 && v <= 1)) return;
    holes.push(p);
    colors.push(/^[0-9a-f]{6}$/.test(cs[i] || "") ? cs[i] : "");
  });
  return { holes, colors: colors.some(Boolean) ? colors : null };
}
export function saved() {
  try {
    return (JSON.parse(localStorage.getItem(KEY)) || []).filter((s) => s && s.id && s.h).map((s) => {
      const { holes, colors } = dec(s.h, s.c);
      return { id: "u:" + s.id, name: String(s.n || "My stencil").slice(0, 20), holes: holes.length && holes.every(old) ? holes.map(soften) : holes, colors };
    }).filter((s) => s.holes.length);
  } catch (e) { return []; }
}
function store(list) { try { localStorage.setItem(KEY, JSON.stringify(list.slice(-MAX))); } catch (e) {} }
function raw() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } }
function keep(name, holes, colors) {
  holes = holes.slice(); colors = colors ? colors.slice() : null;
  while (holes.length > 1 && enc(holes).length > H_MAX) {
    let k = 0;
    holes.forEach((h, i) => { if (Math.abs(area(h)) < Math.abs(area(holes[k]))) k = i; });
    holes.splice(k, 1);
    if (colors) colors.splice(k, 1);
  }
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 5), list = raw().filter((s) => s && s.id), c = colors && colors.some(Boolean) ? colors.join(",") : "";
  list.push(c ? { id, n: name, h: enc(holes), c } : { id, n: name, h: enc(holes) });
  store(list);
  return { id: "u:" + id, name, ...dec(enc(holes), c) };
}
function forget(id) { store(raw().filter((s) => "u:" + s.id !== id)); }

function cardboard(x, s) {
  x.globalCompositeOperation = "source-over";
  x.fillStyle = CARD; x.fillRect(0, 0, s, s);
  x.fillStyle = "rgba(120,80,30,.18)";
  const g = Math.max(2, Math.round(s / 80));
  for (let y = 0; y < s; y += g * 2) x.fillRect(0, y, s, g / 2);
}
function cutHoles(x, holes, s, colors) {
  const loop = (h) => { for (let i = 0; i < h.length; i += 2) (i ? x.lineTo(h[i] * s, h[i + 1] * s) : x.moveTo(h[i] * s, h[i + 1] * s)); x.closePath(); };
  x.globalCompositeOperation = "destination-out";
  x.fillStyle = "#000";
  x.beginPath();
  holes.forEach(loop);
  x.fill("evenodd");
  x.globalCompositeOperation = "source-over";
  if (!colors) return;
  x.lineWidth = Math.max(1, s / 220);
  x.lineJoin = "round";
  holes.forEach((h, i) => { if (!colors[i]) return; x.strokeStyle = "#" + colors[i]; x.beginPath(); loop(h); x.stroke(); });
}

function bricks(x, s) {
  x.globalCompositeOperation = "source-over";
  x.fillStyle = "#b4553c"; x.fillRect(0, 0, s, s);
  const bh = Math.max(6, Math.round(s / 22)), bw = Math.round(bh * 2.6), m = Math.max(1, Math.round(bh * 0.12));
  for (let r = 0, y = 0; y < s; r++, y += bh) {
    for (let k = 0, x0 = r % 2 ? -bw / 2 : 0; x0 < s; k++, x0 += bw) { x.fillStyle = (r * 7 + k * 3) % 5 === 0 ? "#a64a33" : (r + k * 5) % 7 === 0 ? "#c0634a" : "#b4553c"; x.fillRect(x0 + m, y + m, bw - m, bh - m); }
    x.fillStyle = "#d8b49a"; x.fillRect(0, y, s, m);
    for (let x0 = r % 2 ? -bw / 2 : 0; x0 < s; x0 += bw) x.fillRect(x0, y, m, bh);
  }
}
function paintLayers(x, holes, colors, layers, s) {
  layers.forEach((col) => {
    x.fillStyle = "#" + col;
    x.beginPath();
    holes.forEach((h, i) => { if (colors[i] !== col) return; for (let j = 0; j < h.length; j += 2) (j ? x.lineTo(h[j] * s, h[j + 1] * s) : x.moveTo(h[j] * s, h[j + 1] * s)); x.closePath(); });
    x.fill("evenodd");
  });
}
export function sheetThumb(cv, st, px = 48) {
  const dpr = Math.min(2, devicePixelRatio || 1);
  cv.width = cv.height = Math.round(px * dpr);
  const x = cv.getContext("2d"), s = cv.width;
  x.fillStyle = CARD; x.fillRect(0, 0, s, s);
  x.strokeStyle = "rgba(90,60,25,.5)"; x.strokeRect(0.5, 0.5, s - 1, s - 1);
  cutHoles(x, st.holes, s, st.colors);
}

const ICON = {
  knife: '<path d="M2 14l8-8 2 2-8 8z" fill="#c0c0c0" stroke="#000"/><path d="M10 6l3-4 1 1-2 5z" fill="#7a4a1c" stroke="#000"/>',
  punch: '<circle cx="8" cy="8" r="5" fill="#fff" stroke="#000"/><circle cx="8" cy="8" r="2" fill="#000"/>',
  glue: '<rect x="5" y="2" width="6" height="12" fill="#fff" stroke="#000"/><rect x="5" y="2" width="6" height="3" fill="#e0a020"/>',
  text: '<path d="M3 3h10v3h-1l-1-1H9v8h2v1H5v-1h2V5H5L4 6H3z" fill="#000"/>',
};
const btnIcon = (k) => `<svg viewBox="0 0 16 16" width="16" height="16" shape-rendering="crispEdges" aria-hidden="true">${ICON[k]}</svg>`;

const esc = (s) => String(s).replace(/[<>&"]/g, "");
const pastedImage = (e) => {
  const it = [...((e.clipboardData && e.clipboardData.items) || [])].find((i) => i.kind === "file" && /^image\//.test(i.type));
  return it ? it.getAsFile() : null;
};

export function picker(host, { onPick, onCut, onPicture, onDescribe, onClose }) {
  const el = document.createElement("div");
  el.className = "pt-pick";
  el.hidden = true;
  el.setAttribute("role", "dialog");
  el.setAttribute("aria-label", "Stencils");
  host.append(el);
  function render() {
    const mine = saved(), all = [...presets(), ...mine];
    el.innerHTML = `<header class="tb"><h2 class="tb-t">Stencils</h2><span class="tb-btns"><button class="tb-x" type="button" data-pk-x aria-label="Close"></button></span></header>` +
      `<div class="pt-pick-g">${all.map((s) => `<span class="pt-pk"><button type="button" data-pk="${s.id}" title="${esc(s.name)}"><canvas></canvas><span>${esc(s.name)}</span></button>${s.id.startsWith("u:") ? `<button type="button" class="pt-pk-del" data-pk-del="${s.id}" aria-label="Throw away ${esc(s.name)}" title="Throw away">x</button>` : ""}</span>`).join("")}</div>` +
      `<p class="pt-pick-a">${onDescribe ? '<button class="btn" type="button" data-pk-ai>Describe it...</button>' : ""}<button class="btn" type="button" data-pk-pic>From a picture...</button><button class="btn" type="button" data-pk-cut>Cut your own...</button></p>`;
    el.querySelectorAll("[data-pk] canvas").forEach((cv, i) => sheetThumb(cv, all[i]));
    el._all = all;
  }
  el.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.hasAttribute("data-pk-x")) { close(); if (onClose) onClose(); return; }
    if (b.hasAttribute("data-pk-cut")) { close(); onCut(); return; }
    if (b.hasAttribute("data-pk-pic")) { close(); onPicture(); return; }
    if (b.hasAttribute("data-pk-ai")) { close(); onDescribe(); return; }
    if (b.dataset.pkDel) { forget(b.dataset.pkDel); render(); return; }
    const st = (el._all || []).find((s) => s.id === b.dataset.pk);
    if (st) { close(); onPick(st); }
  });
  document.addEventListener("paste", (e) => {
    if (el.hidden) return;
    const f = pastedImage(e);
    if (!f) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    close();
    onPicture(f);
  });
  function open() { render(); el.hidden = false; }
  function close() { el.hidden = true; }
  return { open, close, toggle() { if (el.hidden) open(); else close(); }, get shown() { return !el.hidden; } };
}

function otsu(lum, al, bg) {
  const h = new Float64Array(256);
  let n = 0;
  for (let i = 0; i < lum.length; i++) if (al[i] >= 0.5 && !bg[i]) { h[Math.min(255, Math.max(0, Math.round(lum[i])))]++; n++; }
  if (!n) return 128;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * h[i];
  let wb = 0, sb = 0, best = -1, thr = 128;
  for (let i = 0; i < 256; i++) {
    wb += h[i];
    if (!wb) continue;
    const wf = n - wb;
    if (!wf) break;
    sb += i * h[i];
    const mb = sb / wb, mf = (sum - sb) / wf, v = wb * wf * (mb - mf) ** 2;
    if (v > best) { best = v; thr = i; }
  }
  return Math.min(254, Math.max(1, thr + 0.5));
}

function blur(f, r, n = NI) {
  if (!r) return f;
  let a = f, b = new Float32Array(n * n);
  const w = 2 * r + 1;
  for (let pass = 0; pass < 4; pass++) {
    const st = pass % 2 === 0 ? 1 : n;
    for (let line = 0; line < n; line++) {
      const base = st === 1 ? line * n : line;
      let s = 0;
      for (let k = 0; k <= r && k < n; k++) s += a[base + k * st];
      for (let x = 0; x < n; x++) {
        b[base + x * st] = s / w;
        if (x + r + 1 < n) s += a[base + (x + r + 1) * st];
        if (x - r >= 0) s -= a[base + (x - r) * st];
      }
    }
    [a, b] = [b, a];
  }
  return a;
}

function edgeColor(d, W, H) {
  const bins = new Map();
  let n = 0;
  const see = (i) => {
    n++;
    if (d[i * 4 + 3] < 128) return;
    const k = (d[i * 4] >> 4) * 256 + (d[i * 4 + 1] >> 4) * 16 + (d[i * 4 + 2] >> 4), e = bins.get(k) || [0, 0, 0, 0];
    e[0] += d[i * 4]; e[1] += d[i * 4 + 1]; e[2] += d[i * 4 + 2]; e[3]++;
    bins.set(k, e);
  };
  const ring = (f) => { for (let x = 0; x < W; x++) { f(x); if (H > 1) f((H - 1) * W + x); } for (let y = 1; y < H - 1; y++) { f(y * W); if (W > 1) f(y * W + W - 1); } };
  ring(see);
  let best = null;
  bins.forEach((e) => { if (!best || e[3] > best[3]) best = e; });
  if (!best || best[3] <= n * 0.3) return null;
  const c = [best[0] / best[3], best[1] / best[3], best[2] / best[3]];
  let sq = 0, k = 0;
  ring((i) => { if (d[i * 4 + 3] < 128) return; const e = Math.hypot(d[i * 4] - c[0], d[i * 4 + 1] - c[1], d[i * 4 + 2] - c[2]); if (e < BG_TOL) { sq += e * e; k++; } });
  return [...c, Math.min(BG_TOL, Math.max(6, 3 * Math.sqrt(sq / Math.max(1, k)) + 5))];
}

function flood(al, r, g, b, ring) {
  const T = NI * NI, bg = new Uint8Array(T), q = new Int32Array(T);
  const ok = (i) => al[i] < 0.5 || (!!ring && Math.hypot(r[i] - ring[0], g[i] - ring[1], b[i] - ring[2]) <= ring[3]);
  let h = 0, t = 0;
  const push = (i) => { if (!bg[i] && ok(i)) { bg[i] = 1; q[t++] = i; } };
  for (let x = 0; x < NI; x++) { push(x); push((NI - 1) * NI + x); }
  for (let y = 0; y < NI; y++) { push(y * NI); push(y * NI + NI - 1); }
  while (h < t) {
    const i = q[h++], x = i % NI;
    if (x > 0) push(i - 1);
    if (x < NI - 1) push(i + 1);
    if (i >= NI) push(i - NI);
    if (i < T - NI) push(i + NI);
  }
  return bg;
}

function erode(f) {
  const o = new Float32Array(NI * NI);
  for (let y = 0; y < NI; y++) for (let x = 0; x < NI; x++) {
    let m = 1;
    for (let dy = -1; dy <= 1 && m > 0; dy++) for (let dx = -1; dx <= 1; dx++) {
      const u = x + dx, v = y + dy;
      m = Math.min(m, u < 0 || v < 0 || u >= NI || v >= NI ? 0 : f[v * NI + u]);
    }
    o[y * NI + x] = m;
  }
  return o;
}

function grow(f, n = NI) {
  const o = new Float32Array(n * n);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    let m = 0;
    for (let dy = -1; dy <= 1 && m < 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const u = x + dx, v = y + dy;
      if (u >= 0 && v >= 0 && u < n && v < n && f[v * n + u] > m) m = f[v * n + u];
    }
    o[y * n + x] = m;
  }
  return o;
}

const hexOf = (c) => c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");

function shrink(f) {
  const o = new Float32Array(N * N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let s = 0;
    for (let dy = 0; dy < QI; dy++) for (let dx = 0; dx < QI; dx++) s += f[(y * QI + dy) * NI + x * QI + dx];
    o[y * N + x] = s / (QI * QI);
  }
  return o;
}

const NEAR = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1], [-2, -2], [0, -2], [2, -2], [-2, 0], [2, 0], [-2, 2], [0, 2], [2, 2]];

function importer(host, { onSave, onEdit }) {
  const box = document.createElement("div");
  box.className = "pt-cut";
  box.setAttribute("role", "dialog");
  box.setAttribute("aria-label", "Stencil from a picture");
  box.innerHTML = `<div class="pt-cut-w"><header class="tb"><h2 class="tb-t">Stencil from a picture</h2><span class="tb-btns"><button class="tb-x" type="button" data-imp-x aria-label="Close"></button></span></header>` +
    `<div class="pt-cut-b"><div class="pt-cut-board pt-imp-board"><canvas width="${VIEW_PX}" height="${VIEW_PX}"></canvas><span class="pt-imp-drop" data-imp-drop>Pick a picture, paste one with ${PASTE} or drop it here</span><p class="pt-imp-view" data-imp-views role="group" aria-label="Preview" hidden><button class="btn" type="button" data-imp-view="cut" title="The cut cardboard sheet">Stencil</button><button class="btn" type="button" data-imp-view="final" title="How it looks sprayed on the wall">Final</button></p></div>` +
    `<div class="pt-cut-side"><p class="pt-cut-row"><button class="btn" type="button" data-imp-file>Pick a file...</button><button class="btn" type="button" data-imp-paste>Paste</button></p>` +
    `<input type="file" accept="image/*" hidden data-imp-input>` +
    `<div class="pt-imp-f"><span>Cut out</span><p class="pt-cut-row pt-imp-mode"><button class="btn" type="button" data-imp-mode="colors" title="Every color becomes its own layer of the stencil">Colors</button><button class="btn" type="button" data-imp-mode="dark">Dark</button><button class="btn" type="button" data-imp-mode="light">Light</button><button class="btn" type="button" data-imp-mode="shape">Shape</button></p></div>` +
    `<p class="pt-cut-row pt-imp-bg" data-imp-bgrow hidden><span>Background</span><button class="btn" type="button" data-imp-bg="cut" title="Cut away the plain background around the picture">Cut</button><button class="btn" type="button" data-imp-bg="keep" title="Keep the whole picture, background too">Keep</button></p>` +
    `<label><span data-imp-thr-l>Threshold</span><input type="range" min="1" max="254" step="1" value="128" data-imp-thr></label>` +
    `<label><span>Detail <em class="pt-imp-det-n" data-imp-det-n></em></span><input type="range" min="0" max="4" step="1" value="1" data-imp-det aria-label="Detail"></label>` +
    `<label>Smoothing<input type="range" min="0" max="4" step="1" value="1" data-imp-soft></label>` +
    `<p class="pt-cut-hint" data-imp-hint></p><p class="pt-imp-lay" data-imp-lay hidden></p>` +
    `<label>Name<input type="text" data-imp-name maxlength="20" placeholder="My stencil" autocomplete="off"></label>` +
    `<p class="pt-cut-row"><button class="btn" type="button" data-imp-edit>Edit in cutter</button><button class="btn" type="button" data-imp-save>Save and use</button></p></div></div></div>`;
  host.append(box);
  box.hidden = true;
  const cv = box.querySelector("canvas"), x = cv.getContext("2d"), input = box.querySelector("[data-imp-input]"), board = box.querySelector(".pt-imp-board");
  const thrEl = box.querySelector("[data-imp-thr]"), softEl = box.querySelector("[data-imp-soft]"), nameEl = box.querySelector("[data-imp-name]"), detEl = box.querySelector("[data-imp-det]");
  try { const v = localStorage.getItem(DETAIL.DET_KEY); if (v !== null && +v >= 0 && +v <= 4) detEl.value = String(Math.round(+v)); } catch (e) {}
  const det = () => Math.round(clampN(+detEl.value, 0, 4));
  const detLabel = () => { box.querySelector("[data-imp-det-n]").textContent = DETAIL.name[det()]; };
  detLabel();
  let final = true, lastPre = null, bgPick = "auto";
  try { final = localStorage.getItem("gl-imp-final") !== "0"; } catch (e) {}
  let src = null, mode = "dark", holes = [], colors = null, layers = [], look = -1, raf = 0, busy = 0, levels = { dark: 128, light: 128, colors: 185 };
  const hint = (s) => { box.querySelector("[data-imp-hint]").textContent = s; };

  function gaps(thr) {
    const f = new Float32Array(NI * NI), { r, g, b, al, bg } = src;
    for (let y = 0; y < NI; y++) for (let x = 0; x < NI; x++) {
      const i = y * NI + x, a = al[i];
      if (a <= 0 || bg[i]) continue;
      let e = 0;
      for (const [dx, dy] of NEAR) {
        const u = x + dx, v = y + dy;
        if (u < 0 || v < 0 || u >= NI || v >= NI) continue;
        const j = v * NI + u;
        if (al[j] < 0.5 || bg[j]) continue;
        e = Math.max(e, Math.hypot(r[i] - r[j], g[i] - g[j], b[i] - b[j]));
      }
      f[i] = Math.min(1, a * 2) * Math.min(1, Math.max(0, 1.5 - e / thr));
    }
    return erode(f);
  }

  function field() {
    const soft = +softEl.value * QI;
    if (mode === "colors") return blur(gaps(255 - +thrEl.value), soft);
    const f = new Float32Array(NI * NI), thr = +thrEl.value;
    for (let i = 0; i < NI * NI; i++) {
      const a = src.al[i];
      if (a <= 0 || src.bg[i]) continue;
      if (mode === "shape") { f[i] = src.clear ? a : 1; continue; }
      const d = (thr - src.lum[i]) / 18, v = mode === "dark" ? 0.5 + d : 0.5 - d;
      f[i] = Math.min(1, Math.max(0, v)) * Math.min(1, a * 2);
    }
    return blur(f, soft);
  }

  function layered() {
    const dt = det(), D = ((255 - +thrEl.value) / 7) * DETAIL.merge[dt], { r, g, b, al, bg } = src, T = NI * NI, flat = new Map();
    const lab = src.lab || (src.lab = labOf(r, g, b, T)), dE = (i, c) => (lab[i * 3] - c[0]) ** 2 + (lab[i * 3 + 1] - c[1]) ** 2 + (lab[i * 3 + 2] - c[2]) ** 2;
    let fg = 0;
    for (let y = 1; y < NI - 1; y++) for (let x = 1; x < NI - 1; x++) {
      const i = y * NI + x;
      if (al[i] < 0.5 || bg[i]) continue;
      fg++;
      let e = 0;
      for (let k = 0; k < 8; k++) { const j = i + NEAR[k][1] * NI + NEAR[k][0]; e = Math.max(e, Math.abs(r[i] - r[j]) + Math.abs(g[i] - g[j]) + Math.abs(b[i] - b[j])); }
      if (e > 40) continue;
      const key = (r[i] >> 3) * 1024 + (g[i] >> 3) * 32 + (b[i] >> 3), q = flat.get(key) || [0, 0, 0, 0];
      q[0] += lab[i * 3]; q[1] += lab[i * 3 + 1]; q[2] += lab[i * 3 + 2]; q[3]++;
      flat.set(key, q);
    }
    const cap = DETAIL.colors[dt];
    let cl = [];
    [...flat.values()].sort((p, q) => q[3] - p[3]).forEach((q) => {
      const c = [q[0] / q[3], q[1] / q[3], q[2] / q[3]];
      let best = -1, bd = Infinity;
      cl.forEach((k, i) => { const d = Math.hypot(c[0] - k.c[0], c[1] - k.c[1], c[2] - k.c[2]); if (d < bd) { bd = d; best = i; } });
      if (best >= 0 && (bd < D || cl.length >= cap)) { const k = cl[best], w = k.n + q[3]; k.c = k.c.map((v, j) => (v * k.n + c[j] * q[3]) / w); k.n = w; }
      else cl.push({ c, n: q[3] });
    });
    cl = cl.filter((k) => k.n >= Math.max(24, fg * 0.004) * DETAIL.speck[dt]);
    if (!cl.length) return { holes: [], colors: null, layers: [] };
    const near = (i) => { let best = 0, bd = Infinity; for (let k = 0; k < cl.length; k++) { const d = dE(i, cl[k].c); if (d < bd) { bd = d; best = k; } } return best; };
    const minOdd = Math.max(12, fg * 0.0006 * DETAIL.speck[dt]), D2 = D * D;
    while (cl.length < cap) {
      const odd = new Map();
      for (let y = 1; y < NI - 1; y += 2) for (let x = 1; x < NI - 1; x += 2) {
        const i = y * NI + x;
        if (al[i] < 0.5 || bg[i] || dE(i, cl[near(i)].c) < D2 * 1.4) continue;
        let e = 0;
        for (let k = 0; k < 8; k++) { const j = i + NEAR[k][1] * NI + NEAR[k][0]; e = Math.max(e, Math.abs(r[i] - r[j]) + Math.abs(g[i] - g[j]) + Math.abs(b[i] - b[j])); }
        if (e > 40 * DETAIL.edge[dt]) continue;
        const key = Math.round(lab[i * 3] / 4) * 4096 + Math.round(lab[i * 3 + 1] / 4 + 32) * 64 + Math.round(lab[i * 3 + 2] / 4 + 32), q = odd.get(key) || [0, 0, 0, 0];
        q[0] += lab[i * 3]; q[1] += lab[i * 3 + 1]; q[2] += lab[i * 3 + 2]; q[3]++;
        odd.set(key, q);
      }
      let top = null;
      odd.forEach((q) => { if (!top || q[3] > top[3]) top = q; });
      if (!top || top[3] * 4 < minOdd) break;
      cl.push({ c: [top[0] / top[3], top[1] / top[3], top[2] / top[3]], n: top[3] * 4 });
    }
    for (let it = 0; it < 4; it++) {
      const sum = cl.map(() => [0, 0, 0, 0, 0, 0, 0]);
      for (let i = 0; i < T; i += 2) {
        if (al[i] < 0.5 || bg[i]) continue;
        const s = sum[near(i)];
        s[0] += lab[i * 3]; s[1] += lab[i * 3 + 1]; s[2] += lab[i * 3 + 2]; s[3] += r[i]; s[4] += g[i]; s[5] += b[i]; s[6]++;
      }
      cl.forEach((k, j) => { const s = sum[j]; if (s[6]) { k.c = [s[0] / s[6], s[1] / s[6], s[2] / s[6]]; k.rgb = [s[3] / s[6], s[4] / s[6], s[5] / s[6]]; } });
    }
    cl.forEach((k) => { if (!k.rgb) k.rgb = rgbOf(k.c); });
    const lbl = new Int8Array(T).fill(-1);
    for (let i = 0; i < T; i++) if (al[i] >= 0.5 && !bg[i]) lbl[i] = near(i);
    let out = Int8Array.from(lbl);
    const cnt = new Int16Array(cl.length), sizes = new Float64Array(cl.length);
    for (let pass = 0; pass < 2; pass++) {
      const src2 = out;
      out = Int8Array.from(src2);
      for (let y = 1; y < NI - 1; y++) for (let x = 1; x < NI - 1; x++) {
        const i = y * NI + x;
        if (src2[i] < 0) continue;
        cnt.fill(0);
        let top = src2[i], tn = 0;
        for (let k = 0; k < 8; k++) { const l = src2[i + NEAR[k][1] * NI + NEAR[k][0]]; if (l >= 0 && ++cnt[l] > tn) { tn = cnt[l]; top = l; } }
        if (tn >= 5) out[i] = top;
      }
    }
    const soft = Math.max(1, Math.round(+softEl.value * QI * DETAIL.blur[dt])), speck = (4 + +softEl.value * 6) * QI * QI * DETAIL.speck[dt], budget = PIC_BUDGET * DETAIL.budget[dt];
    const rank = new Int16Array(cl.length);
    const pass = (minA, g) => {
      absorb(out, cl.length, minA);
      sizes.fill(0);
      for (let i = 0; i < T; i++) if (out[i] >= 0) sizes[out[i]]++;
      const order = cl.map((_, k) => k).filter((k) => sizes[k] > 0).sort((p, q) => sizes[q] - sizes[p]), box = cl.map(() => [NI, NI, -1, -1]), items = [];
      rank.fill(-1);
      order.forEach((k, j) => { rank[k] = j; });
      for (let i = 0; i < T; i++) { const k = out[i]; if (k < 0) continue; const x = i % NI, y = (i / NI) | 0, q = box[k]; if (x < q[0]) q[0] = x; if (y < q[1]) q[1] = y; if (x > q[2]) q[2] = x; if (y > q[3]) q[3] = y; }
      order.forEach((k) => {
        const pad = soft * 3 + 3 + g, [bx0, by0, bx1, by1] = box[k], S = Math.min(NI, Math.max(bx1 - bx0, by1 - by0) + 1 + pad * 2);
        const ox = clampN(Math.round((bx0 + bx1) / 2 - S / 2), 0, NI - S), oy = clampN(Math.round((by0 + by1) / 2 - S / 2), 0, NI - S), m = new Float32Array(S * S);
        for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) if (out[(y + oy) * NI + x + ox] === k) m[y * S + x] = 1;
        const f = grow(m, S);
        if (g > 1) {
          const d = dilate(m, S, g), rk = rank[k];
          for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const i = y * S + x; if (d[i] && !f[i]) { const l = out[(y + oy) * NI + x + ox]; if (l >= 0 && rank[l] > rk) f[i] = 1; } }
        }
        loopsOf(blur(f, soft, S), S, speck * 0.5).forEach((pts) => { for (let j = 0; j < pts.length; j += 2) { pts[j] += ox; pts[j + 1] += oy; } items.push({ pts, tag: k }); });
      });
      return { order, res: fit(items, NI, budget) };
    };
    const minA = Math.max(6, speck * 1.5);
    let run = pass(minA, 1);
    if (run.res.lost > 0 || run.res.eps > 2) run = pass(Math.max(minA, (run.res.eps * 2.2) ** 2), Math.ceil(run.res.eps));
    const res = run.res, used = new Set(res.map((l) => l.tag));
    return { holes: res.map((l) => l.pts), colors: res.map((l) => hexOf(cl[l.tag].rgb)), layers: run.order.filter((k) => used.has(k)).map((k) => hexOf(cl[k].rgb)) };
  }

  function chips() {
    const el = box.querySelector("[data-imp-lay]");
    el.hidden = layers.length < 2;
    if (el.hidden) { el.innerHTML = ""; return; }
    el.innerHTML = `<span>${layers.length} layers</span>` + `<button type="button" class="pt-imp-chip pt-imp-all" data-imp-l="-1" title="All layers at once" aria-pressed="${look < 0}">All</button>` +
      layers.map((c, i) => `<button type="button" class="pt-imp-chip" data-imp-l="${i}" title="Only the #${c} layer" aria-pressed="${look === i}" style="background:#${c}"></button>`).join("");
  }

  function colorsOf(loops, f) {
    const at = (px, py) => { const u = Math.round(px - 0.5), v = Math.round(py - 0.5); return u < 0 || v < 0 || u >= NI || v >= NI ? -1 : v * NI + u; };
    const out = loops.map((h) => {
      const n = h.length / 2, step = Math.max(1, Math.floor(n / 90)), bins = new Map();
      for (let i = 0; i < n; i += step) {
        const j = (i + 1) % n, ax = h[i * 2] * NI, ay = h[i * 2 + 1] * NI, bx = h[j * 2] * NI, by = h[j * 2 + 1] * NI, L = Math.hypot(bx - ax, by - ay);
        if (L < 1e-6) continue;
        const nx = -(by - ay) / L, ny = (bx - ax) / L, mx = (ax + bx) / 2, my = (ay + by) / 2;
        const p1 = at(mx + nx * 1.5, my + ny * 1.5), p2 = at(mx - nx * 1.5, my - ny * 1.5), s = (p1 >= 0 ? f[p1] : 0) >= (p2 >= 0 ? f[p2] : 0) ? 1 : -1;
        for (const d of [3, 2, 4.5]) {
          const k = at(mx + nx * s * d, my + ny * s * d);
          if (k < 0 || src.al[k] < 0.5 || src.bg[k] || f[k] < 0.5) continue;
          const key = (src.r[k] >> 5) * 64 + (src.g[k] >> 5) * 8 + (src.b[k] >> 5), e = bins.get(key) || [0, 0, 0, 0];
          e[0] += src.r[k]; e[1] += src.g[k]; e[2] += src.b[k]; e[3]++;
          bins.set(key, e);
          break;
        }
      }
      let best = null;
      bins.forEach((e) => { if (!best || e[3] > best[3]) best = e; });
      return best ? [0, 1, 2].map((c) => Math.round(best[c] / best[3]).toString(16).padStart(2, "0")).join("") : "";
    });
    return out.some(Boolean) ? out : null;
  }

  function draw() {
    const s = cv.width, pick = look >= 0 && layers[look] ? layers[look] : null;
    box.querySelectorAll("[data-imp-view]").forEach((b) => b.setAttribute("aria-pressed", String((b.dataset.impView === "final") === final)));
    if (!holes.length || !final) {
      cardboard(x, s);
      if (!holes.length) return;
      if (pick) { const keepI = holes.map((_, i) => colors[i] === pick); cutHoles(x, holes.filter((_, i) => keepI[i]), s, colors.filter((_, i) => keepI[i])); }
      else cutHoles(x, holes, s, colors);
      return;
    }
    bricks(x, s);
    if (mode === "colors" && layers.length) { paintLayers(x, holes, colors, pick ? [pick] : layers, s); return; }
    x.fillStyle = "#" + ((colors && colors.find(Boolean)) || "1c1c1c");
    x.beginPath();
    holes.forEach((h) => { for (let j = 0; j < h.length; j += 2) (j ? x.lineTo(h[j] * s, h[j + 1] * s) : x.moveTo(h[j] * s, h[j + 1] * s)); x.closePath(); });
    x.fill("evenodd");
  }
  function rebuild() {
    raf = 0;
    if (!src) { holes = []; colors = null; layers = []; look = -1; chips(); draw(); return; }
    if (mode === "colors") ({ holes, colors, layers } = layered());
    else {
      const f = field(), c = (holes = trace(f, NI, PIC_BUDGET * DETAIL.budget[det()], (4 + +softEl.value * 6) * QI * QI * DETAIL.speck[det()])).length ? colorsOf(holes, f) : null, n = new Map();
      if (c) c.forEach((h) => { if (h) n.set(h, (n.get(h) || 0) + 1); });
      const top = [...n.entries()].sort((p, q) => q[1] - p[1])[0];
      colors = top ? holes.map(() => top[0]) : null;
      layers = [];
    }
    if (look >= layers.length) look = -1;
    chips();
    draw();
    hint(!holes.length ? "Nothing gets cut yet. Move the slider or switch what gets cut out." : mode === "colors" ? (layers.length > 1 ? `Every color is its own layer. On the wall the color square in the corner of the stencil opens one layer at a time and picks its color: spray them one by one and the whole picture comes out. Final shows the picture once every layer is sprayed, Stencil shows the cut sheet; click a color to see just that layer. More Detail means more colors and finer shapes, so more layers to spray.` : "Only one color here. Slide Color detail or Detail up to split the picture into more colors.") : "Final shows how it sprays on the wall, Stencil shows the cut sheet. Slide the threshold to cut more or less, then save it or fine-tune it in the cutter.");
  }
  const soon = () => { if (!raf) raf = requestAnimationFrame(rebuild); };
  function sync() {
    box.querySelectorAll("[data-imp-mode]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.impMode === mode)));
    box.querySelector('[data-imp-mode="shape"]').disabled = !(src && src.cutout);
    thrEl.disabled = !src || mode === "shape";
    if (levels[mode] !== undefined) thrEl.value = String(levels[mode]);
    box.querySelector("[data-imp-thr-l]").textContent = mode === "colors" ? "Color detail" : "Threshold";
    softEl.disabled = detEl.disabled = !src;
    box.querySelector("[data-imp-drop]").hidden = !!src;
    box.querySelector("[data-imp-views]").hidden = !src;
    box.querySelector("[data-imp-edit]").disabled = box.querySelector("[data-imp-save]").disabled = !src;
  }

  function prepare(keep) {
    const pre = lastPre, PW = pre.width, PH = pre.height, pd = ctx2d(pre).getImageData(0, 0, PW, PH).data, edge = edgeColor(pd, PW, PH), ring = keep ? null : edge;
    let cx0 = PW, cy0 = PH, cx1 = -1, cy1 = -1;
    for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) {
      const i = (y * PW + x) * 4;
      if (pd[i + 3] < 128 || (ring && Math.hypot(pd[i] - ring[0], pd[i + 1] - ring[1], pd[i + 2] - ring[2]) <= ring[3])) continue;
      if (x < cx0) cx0 = x; if (x > cx1) cx1 = x; if (y < cy0) cy0 = y; if (y > cy1) cy1 = y;
    }
    if (cx1 < 0) { cx0 = 0; cy0 = 0; cx1 = PW - 1; cy1 = PH - 1; }
    const pad = ring ? Math.round(Math.max(cx1 - cx0, cy1 - cy0) * 0.02) + 1 : 0;
    cx0 = Math.max(0, cx0 - pad); cy0 = Math.max(0, cy0 - pad); cx1 = Math.min(PW - 1, cx1 + pad); cy1 = Math.min(PH - 1, cy1 + pad);
    const cw = cx1 - cx0 + 1, ch = cy1 - cy0 + 1, m = NI * 0.04, k = Math.min((NI - 2 * m) / cw, (NI - 2 * m) / ch);
    const w = cw * k, h = ch * k, x0 = (NI - w) / 2, y0 = (NI - h) / 2, T = NI * NI, c = document.createElement("canvas");
    c.width = c.height = NI;
    const g = ctx2d(c);
    g.imageSmoothingQuality = "high";
    g.drawImage(pre, cx0, cy0, cw, ch, x0, y0, w, h);
    const d = g.getImageData(0, 0, NI, NI).data, lum = new Float32Array(T), al = new Float32Array(T);
    const r = new Float32Array(T), gr = new Float32Array(T), b = new Float32Array(T);
    let inside = 0, thin = 0;
    for (let i = 0; i < T; i++) {
      const a = d[i * 4 + 3] / 255, px = i % NI, py = (i / NI) | 0;
      al[i] = a;
      r[i] = d[i * 4]; gr[i] = d[i * 4 + 1]; b[i] = d[i * 4 + 2];
      lum[i] = a > 0 ? 0.299 * r[i] + 0.587 * gr[i] + 0.114 * b[i] : 255;
      if (px > x0 + 1 && px < x0 + w - 2 && py > y0 + 1 && py < y0 + h - 2) { inside++; if (a < 0.5) thin++; }
    }
    const bg = flood(al, r, gr, b, ring);
    let edgeN = 0, edgeD = 0;
    if (ring) for (let y = 4; y < NI - 4; y += 2) for (let x = 4; x < NI - 4; x += 2) {
      const i = y * NI + x;
      if (!bg[i]) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const j = i + dy * NI + dx;
        if (bg[j] || al[j] < 0.5) continue;
        const q = i + dy * 4 * NI + dx * 4;
        edgeN++; edgeD += Math.hypot(r[i] - r[q], gr[i] - gr[q], b[i] - b[q]);
        break;
      }
    }
    const dark = !!edge && 0.299 * edge[0] + 0.587 * edge[1] + 0.114 * edge[2] < 170;
    return { lum, al, r, g: gr, b, bg, clear: inside > 0 && thin / inside > 0.02, cutout: !!ring, edge: !!edge, soft: dark || (edgeN > 20 && edgeD / edgeN < 42) };
  }
  function pickSrc() {
    src = prepare(bgPick === "keep");
    if (bgPick === "auto" && src.cutout && src.soft) src = { ...prepare(true), edge: true };
    src.cutout = src.cutout || src.clear;
    box.querySelectorAll("[data-imp-bg]").forEach((bt) => bt.setAttribute("aria-pressed", String((bt.dataset.impBg === "cut") === src.cutout)));
    box.querySelector("[data-imp-bgrow]").hidden = !src.edge;
  }
  async function load(blob, name) {
    if (!blob || !/^image\//.test(blob.type || "")) { hint("That is not a picture. Try a PNG, JPG or GIF."); return; }
    const ticket = ++busy, url = URL.createObjectURL(blob);
    hint("Cutting...");
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      if (ticket !== busy) return;
      const kp = Math.min(1, 1024 / Math.max(img.naturalWidth, img.naturalHeight)), pre = document.createElement("canvas");
      pre.width = Math.max(1, Math.round(img.naturalWidth * kp)); pre.height = Math.max(1, Math.round(img.naturalHeight * kp));
      ctx2d(pre).drawImage(img, 0, 0, pre.width, pre.height);
      lastPre = pre;
      bgPick = "auto";
      pickSrc();
      const bins = new Map(), T = NI * NI;
      let solid = 0;
      for (let i = 0; i < T; i++) {
        if (src.al[i] < 0.5 || src.bg[i]) continue;
        solid++;
        const q = (src.r[i] >> 6) * 16 + (src.g[i] >> 6) * 4 + (src.b[i] >> 6);
        bins.set(q, (bins.get(q) || 0) + 1);
      }
      const colorful = [...bins.values()].filter((n) => n > solid * 0.015).length >= 3;
      mode = colorful ? "colors" : src.clear ? "shape" : "dark";
      const t = Math.round(otsu(src.lum, src.al, src.bg));
      levels = { dark: t, light: t, colors: 185 };
      const base = String(name || blob.name || "").replace(/\.[a-z0-9]+$/i, "").replace(/[_-]+/g, " ").trim();
      nameEl.value = (base && base.toLowerCase() !== "image" ? base : "My picture").slice(0, 20);
      sync();
      rebuild();
    } catch (e) {
      if (ticket === busy) hint("Could not read that picture. Try another one.");
    } finally {
      URL.revokeObjectURL(url);
    }
  }


  async function paste() {
    try {
      const items = await navigator.clipboard.read();
      for (const it of items) {
        const type = it.types.find((t) => t.startsWith("image/"));
        if (type) { load(await it.getType(type), "Pasted picture"); return; }
      }
      hint("There is no picture on the clipboard. Copy one first.");
    } catch (e) { hint(`Press ${PASTE} to paste a picture.`); }
  }

  box.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b || b.disabled) return;
    if (b.hasAttribute("data-imp-x")) { hide(); return; }
    if (b.hasAttribute("data-imp-file")) { input.click(); return; }
    if (b.hasAttribute("data-imp-paste")) { paste(); return; }
    if (b.dataset.impMode) { mode = b.dataset.impMode; look = -1; sync(); soon(); return; }
    if (b.dataset.impL !== undefined) { look = +b.dataset.impL; chips(); draw(); return; }
    if (b.dataset.impBg && lastPre) { bgPick = b.dataset.impBg; pickSrc(); if (mode === "shape" && !src.cutout) mode = "dark"; const t = Math.round(otsu(src.lum, src.al, src.bg)); levels.dark = levels.light = t; look = -1; sync(); soon(); return; }
    if (b.dataset.impView) { final = b.dataset.impView === "final"; try { localStorage.setItem("gl-imp-final", final ? "1" : "0"); } catch (e) {} draw(); return; }
    const name = (nameEl.value || "").trim().slice(0, 20) || "My stencil";
    if (b.hasAttribute("data-imp-edit") && src) { const f = shrink(field()); hide(); onEdit(f, name); return; }
    if (b.hasAttribute("data-imp-save")) {
      if (!holes.length) { hint("Nothing gets cut yet. Move the threshold first."); return; }
      hide();
      onSave(keep(name, holes, colors));
    }
  });
  input.addEventListener("change", () => { const f = input.files && input.files[0]; input.value = ""; if (f) load(f); });
  thrEl.addEventListener("input", () => { levels[mode] = +thrEl.value; soon(); });
  softEl.addEventListener("input", soon);
  detEl.addEventListener("input", () => { try { localStorage.setItem(DETAIL.DET_KEY, detEl.value); } catch (e) {} detLabel(); soon(); });
  board.addEventListener("dragover", (e) => { e.preventDefault(); board.classList.add("over"); });
  board.addEventListener("dragleave", () => board.classList.remove("over"));
  board.addEventListener("drop", (e) => {
    e.preventDefault();
    board.classList.remove("over");
    const f = [...((e.dataTransfer && e.dataTransfer.files) || [])].find((q) => /^image\//.test(q.type));
    if (f) load(f); else hint("Drop a picture file here.");
  });
  box.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.stopPropagation(); hide(); } });
  function hide() { box.hidden = true; }
  return {
    open(blob, name) {
      box.hidden = false;
      if (blob) load(blob, name || "Pasted picture");
      else if (!src) hint("Every color of the picture gets its own hole in the cardboard. Logos and drawings work best.");
      sync();
      draw();
      box.querySelector(src ? "[data-imp-save]" : "[data-imp-file]").focus({ preventScroll: true });
    },
    load,
    close: hide,
    get shown() { return !box.hidden; },
  };
}

const IDEAS = ["a cat in sunglasses", "a rocket taking off", "a fox astronaut", "a pine tree in the snow", "a skateboarding frog", "a smiling sun"];
function describer(host, { draw, onDrawn }) {
  const box = document.createElement("div");
  box.className = "pt-cut";
  box.setAttribute("role", "dialog");
  box.setAttribute("aria-label", "Stencil from words");
  box.innerHTML = `<div class="pt-cut-w pt-say"><header class="tb"><h2 class="tb-t">Stencil from words</h2><span class="tb-btns"><button class="tb-x" type="button" data-say-x aria-label="Close"></button></span></header>` +
    `<div class="pt-say-b"><label>What should Haiku draw?<input type="text" data-say-in maxlength="80" placeholder="a cat in sunglasses" autocomplete="off" spellcheck="false"></label>` +
    `<p class="pt-say-ideas">${IDEAS.map((t) => `<button type="button" class="pt-say-idea" data-say-idea="${t}">${t}</button>`).join("")}</p>` +
    `<p class="pt-cut-hint" data-say-hint></p><p class="pt-cut-row"><button class="btn go" type="button" data-say-go>Draw it</button></p></div></div>`;
  host.append(box);
  box.hidden = true;
  const input = box.querySelector("[data-say-in]"), go = box.querySelector("[data-say-go]"), hintEl = box.querySelector("[data-say-hint]");
  const DEFAULT = "Haiku draws it in a few flat colors. Every color becomes its own layer of the stencil, so you spray them one by one. Five a day.";
  let busy = 0, dots = 0;
  const hint = (t) => { hintEl.textContent = t; };
  async function run() {
    const text = input.value.trim();
    if (text.length < 2) { hint("Write what Haiku should draw, like a cat in sunglasses."); input.focus(); return; }
    const ticket = ++busy;
    go.disabled = input.disabled = true;
    box.querySelectorAll("[data-say-idea]").forEach((b) => { b.disabled = true; });
    let n = 0;
    hint("Haiku is drawing");
    clearInterval(dots);
    dots = setInterval(() => { n = (n + 1) % 4; hint("Haiku is drawing" + ".".repeat(n)); }, 400);
    try {
      const j = await draw(text);
      if (ticket !== busy) return;
      const blob = new Blob([j.svg], { type: "image/svg+xml" });
      box.hidden = true;
      onDrawn(blob, j.name || text.slice(0, 20), j.left);
    } catch (e) {
      if (ticket === busy) hint(e && e.message ? e.message : "Haiku couldn't draw that, try again.");
    } finally {
      if (ticket === busy) { clearInterval(dots); go.disabled = input.disabled = false; box.querySelectorAll("[data-say-idea]").forEach((b) => { b.disabled = false; }); }
    }
  }
  box.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b || b.disabled) return;
    if (b.hasAttribute("data-say-x")) { busy++; clearInterval(dots); box.hidden = true; return; }
    if (b.dataset.sayIdea) { input.value = b.dataset.sayIdea; input.focus(); return; }
    if (b.hasAttribute("data-say-go")) run();
  });
  input.addEventListener("keydown", (e) => { e.stopPropagation(); if (e.key === "Enter") { e.preventDefault(); run(); } if (e.key === "Escape") { busy++; clearInterval(dots); box.hidden = true; } });
  return {
    open() {
      box.hidden = false;
      go.disabled = input.disabled = false;
      box.querySelectorAll("[data-say-idea]").forEach((b) => { b.disabled = false; });
      hint(DEFAULT);
      input.focus({ preventScroll: true });
      input.select();
    },
    close() { busy++; clearInterval(dots); box.hidden = true; },
    get shown() { return !box.hidden; },
  };
}

export function cutter(host, { onSave, draw }) {
  const box = document.createElement("div");
  box.className = "pt-cut";
  box.setAttribute("role", "dialog");
  box.setAttribute("aria-label", "Cut a stencil");
  box.innerHTML = `<div class="pt-cut-w"><header class="tb"><h2 class="tb-t">Cut a stencil</h2><span class="tb-btns"><button class="tb-x" type="button" data-cut-x aria-label="Close"></button></span></header>` +
    `<div class="pt-cut-b"><div class="pt-cut-tools">${["knife", "punch", "glue", "text"].map((k) => `<button type="button" class="pt-t" data-ct="${k}" title="${{ knife: "Knife: draw around a shape to cut it out", punch: "Hole punch: drag to cut a line", glue: "Glue: drag to stick cardboard back", text: "Letters: click where the word goes" }[k]}">${btnIcon(k)}</button>`).join("")}` +
    `<div class="pt-sizes">${PUNCH.map((_, i) => `<button type="button" class="pt-s" data-cs="${i}" aria-label="Size ${i + 1}"><i style="width:${[3, 6, 10][i]}px;height:${[3, 6, 10][i]}px"></i></button>`).join("")}</div></div>` +
    `<div class="pt-cut-board"><canvas width="${VIEW_PX}" height="${VIEW_PX}"></canvas></div>` +
    `<div class="pt-cut-side"><label>Word to cut<input type="text" data-cut-word maxlength="12" value="GZOWO" autocomplete="off"></label>` +
    `<p class="pt-cut-hint" data-cut-hint></p><p class="pt-cut-row"><button class="btn" type="button" data-cut-undo>Undo</button><button class="btn" type="button" data-cut-new>New sheet</button></p>` +
    `<p class="pt-cut-row"><button class="btn" type="button" data-cut-pic>From a picture...</button></p>` +
    `<label>Name<input type="text" data-cut-name maxlength="20" placeholder="My stencil" autocomplete="off"></label>` +
    `<p class="pt-cut-row"><button class="btn" type="button" data-cut-save>Save and use</button></p></div></div></div>`;
  host.append(box);
  const view = box.querySelector("canvas"), vx = view.getContext("2d"), sheet = document.createElement("canvas");
  sheet.width = sheet.height = N;
  const sx = ctx2d(sheet), undo = [];
  let tool = "knife", size = 1, lasso = null, last = null, drag = false;
  const hints = { knife: "Draw around a shape and let go: the inside falls out.", punch: "Drag to punch a line of holes through the sheet.", glue: "Drag over a hole to glue cardboard back in.", text: "Type a word on the right, then click the sheet where it goes." };
  const imp = importer(host, {
    onSave,
    onEdit(f, name) {
      snap();
      const img = sx.createImageData(N, N);
      for (let i = 0; i < N * N; i++) img.data[i * 4 + 3] = Math.round(f[i] * 255);
      sx.putImageData(img, 0, 0);
      box.querySelector("[data-cut-name]").value = name;
      show();
    },
  });
  const say = draw ? describer(host, { draw, onDrawn: (blob, name) => imp.open(blob, name) }) : null;

  function paint() {
    const V = view.width, k = V / N;
    cardboard(vx, V);
    vx.globalCompositeOperation = "destination-out";
    vx.imageSmoothingEnabled = true;
    vx.imageSmoothingQuality = "high";
    vx.drawImage(sheet, 0, 0, V, V);
    vx.globalCompositeOperation = "source-over";
    if (lasso && lasso.length > 2) {
      vx.setLineDash([10, 8]); vx.lineWidth = 3; vx.strokeStyle = "#000";
      vx.beginPath(); lasso.forEach(([a, b], i) => (i ? vx.lineTo(a * k, b * k) : vx.moveTo(a * k, b * k))); vx.stroke();
      vx.setLineDash([]);
    }
  }
  function sync() {
    box.querySelectorAll("[data-ct]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.ct === tool)));
    box.querySelectorAll("[data-cs]").forEach((b) => b.setAttribute("aria-pressed", String(+b.dataset.cs === size)));
    box.querySelector("[data-cut-hint]").textContent = hints[tool];
    box.querySelector("[data-cut-undo]").disabled = !undo.length;
  }
  function snap() { undo.push(sx.getImageData(0, 0, N, N)); if (undo.length > 25) undo.shift(); }
  const pt = (e) => { const r = view.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * N, ((e.clientY - r.top) / r.height) * N]; };
  function line(a, b, erase) {
    sx.globalCompositeOperation = erase ? "destination-out" : "source-over";
    sx.strokeStyle = sx.fillStyle = "#000"; sx.lineCap = "round"; sx.lineWidth = PUNCH[size];
    sx.beginPath(); sx.moveTo(a[0], a[1]); sx.lineTo(b[0], b[1]); sx.stroke();
    sx.beginPath(); sx.arc(b[0], b[1], PUNCH[size] / 2, 0, Math.PI * 2); sx.fill();
    sx.globalCompositeOperation = "source-over";
  }
  view.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    try { view.setPointerCapture(e.pointerId); } catch (err) {}
    const p = pt(e);
    snap();
    if (tool === "text") {
      const w = (box.querySelector("[data-cut-word]").value || "").trim().toUpperCase();
      if (!w) { undo.pop(); return; }
      let s = N * TEXT[size];
      sx.font = `900 ${s}px ${FONT}`;
      const tw = sx.measureText(w).width;
      if (tw > N * 0.92) { s *= (N * 0.92) / tw; sx.font = `900 ${s}px ${FONT}`; }
      sx.fillStyle = "#000"; sx.textAlign = "center"; sx.textBaseline = "middle";
      sx.fillText(w, p[0], p[1]);
      paint(); sync();
      return;
    }
    drag = true; last = p;
    if (tool === "knife") lasso = [p];
    else line(p, p, tool === "glue");
    paint(); sync();
  });
  view.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const p = pt(e);
    if (tool === "knife") { if (Math.hypot(p[0] - last[0], p[1] - last[1]) > 1.6) { lasso.push(p); last = p; } }
    else { line(last, p, tool === "glue"); last = p; }
    paint();
  });
  const up = () => {
    if (!drag) return;
    drag = false;
    if (tool === "knife") {
      if (lasso.length > 2) { sx.fillStyle = "#000"; sx.beginPath(); lasso.forEach(([a, b], i) => (i ? sx.lineTo(a, b) : sx.moveTo(a, b))); sx.closePath(); sx.fill(); }
      else undo.pop();
      lasso = null;
    }
    paint(); sync();
  };
  view.addEventListener("pointerup", up);
  view.addEventListener("pointercancel", up);
  box.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.hasAttribute("data-cut-x")) { hide(); return; }
    if (b.hasAttribute("data-cut-pic")) { hide(); imp.open(); return; }
    if (b.dataset.ct) tool = b.dataset.ct;
    if (b.dataset.cs) size = +b.dataset.cs;
    if (b.hasAttribute("data-cut-undo") && undo.length) sx.putImageData(undo.pop(), 0, 0);
    if (b.hasAttribute("data-cut-new")) { snap(); sx.clearRect(0, 0, N, N); }
    if (b.hasAttribute("data-cut-save")) {
      const holes = trace(fieldOf(sheet));
      if (!holes.length) { box.querySelector("[data-cut-hint]").textContent = "Cut something out first: the sheet has no holes yet."; return; }
      const name = (box.querySelector("[data-cut-name]").value || "").trim().slice(0, 20) || "My stencil";
      hide();
      onSave(keep(name, holes));
      return;
    }
    paint(); sync();
  });
  box.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.stopPropagation(); hide(); } });
  document.addEventListener("paste", (e) => {
    if (box.hidden && !imp.shown) return;
    const f = pastedImage(e);
    if (!f) return;
    e.preventDefault();
    if (!imp.shown) { hide(); imp.open(f); } else imp.load(f, "Pasted picture");
  });
  function hide() { box.hidden = true; lasso = null; drag = false; }
  function show() { box.hidden = false; paint(); sync(); box.querySelector("[data-ct]").focus({ preventScroll: true }); }
  box.hidden = true;
  return {
    open: show,
    picture(blob) { hide(); imp.open(blob); },
    describe() { hide(); imp.close(); if (say) say.open(); },
    close() { hide(); imp.close(); if (say) say.close(); },
    get shown() { return !box.hidden || imp.shown || !!(say && say.shown); },
  };
}
