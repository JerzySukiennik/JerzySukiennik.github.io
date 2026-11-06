/* Gzowo Labs wall stencils: the ready made cardboard stencils, the cutting board where visitors cut their own with a knife, a hole punch,
   glue and letters, stencils cut automatically from a picture, and the tracing that turns a cut sheet into smooth outlines the wall
   clips spray paint to. Outlines are normalized to 0..1. */

const N = 256, KEY = "gl-stencils", MAX = 24, VIEW_PX = 640, BUDGET = 1400, FONT = '"Arial Black", Impact, "Helvetica Neue", sans-serif';
const PUNCH = [6, 12, 22], TEXT = [0.13, 0.2, 0.3], CARD = "#c49a5e";
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

export function trace(f, n = N, budget = BUDGET, speck = 2) {
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
  loops.sort((p, q) => Math.abs(area(q)) - Math.abs(area(p)));
  const total = (r) => r.reduce((s, l) => s + l.length, 0);
  let eps = 0.3, res = loops.map((l) => simplify(l, eps));
  while (total(res) > budget && eps < 2.5) { eps *= 1.35; res = loops.map((l) => simplify(l, eps)); }
  res = res.filter((l) => l.length >= 6);
  while (res.length > 1 && total(res) > budget) res.pop();
  return res.map((l) => Float64Array.from(l, (v) => Math.min(1, Math.max(0, v / n))));
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
const dec = (s) => String(s || "").split(";").map((q) => Float64Array.from(q.split(","), (v) => +v / 1000)).filter((h) => h.length >= 6 && h.every((v) => v >= 0 && v <= 1));
export function saved() {
  try {
    return (JSON.parse(localStorage.getItem(KEY)) || []).filter((s) => s && s.id && s.h).map((s) => {
      const holes = dec(s.h);
      return { id: "u:" + s.id, name: String(s.n || "My stencil").slice(0, 20), holes: holes.length && holes.every(old) ? holes.map(soften) : holes };
    }).filter((s) => s.holes.length);
  } catch (e) { return []; }
}
function store(list) { try { localStorage.setItem(KEY, JSON.stringify(list.slice(-MAX))); } catch (e) {} }
function raw() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } }
function keep(name, holes) {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 5), list = raw().filter((s) => s && s.id);
  list.push({ id, n: name, h: enc(holes) });
  store(list);
  return { id: "u:" + id, name, holes: dec(enc(holes)) };
}
function forget(id) { store(raw().filter((s) => "u:" + s.id !== id)); }

function cardboard(x, s) {
  x.globalCompositeOperation = "source-over";
  x.fillStyle = CARD; x.fillRect(0, 0, s, s);
  x.fillStyle = "rgba(120,80,30,.18)";
  const g = Math.max(2, Math.round(s / 80));
  for (let y = 0; y < s; y += g * 2) x.fillRect(0, y, s, g / 2);
}
function cutHoles(x, holes, s) {
  x.globalCompositeOperation = "destination-out";
  x.fillStyle = "#000";
  x.beginPath();
  holes.forEach((h) => { for (let i = 0; i < h.length; i += 2) (i ? x.lineTo(h[i] * s, h[i + 1] * s) : x.moveTo(h[i] * s, h[i + 1] * s)); x.closePath(); });
  x.fill("evenodd");
  x.globalCompositeOperation = "source-over";
}

export function sheetThumb(cv, st, px = 48) {
  const dpr = Math.min(2, devicePixelRatio || 1);
  cv.width = cv.height = Math.round(px * dpr);
  const x = cv.getContext("2d"), s = cv.width;
  x.fillStyle = CARD; x.fillRect(0, 0, s, s);
  x.strokeStyle = "rgba(90,60,25,.5)"; x.strokeRect(0.5, 0.5, s - 1, s - 1);
  cutHoles(x, st.holes, s);
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

export function picker(host, { onPick, onCut, onPicture, onClose }) {
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
      `<p class="pt-pick-a"><button class="btn" type="button" data-pk-pic>From a picture...</button><button class="btn" type="button" data-pk-cut>Cut your own...</button></p>`;
    el.querySelectorAll("[data-pk] canvas").forEach((cv, i) => sheetThumb(cv, all[i]));
    el._all = all;
  }
  el.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.hasAttribute("data-pk-x")) { close(); if (onClose) onClose(); return; }
    if (b.hasAttribute("data-pk-cut")) { close(); onCut(); return; }
    if (b.hasAttribute("data-pk-pic")) { close(); onPicture(); return; }
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

function otsu(lum, al) {
  const h = new Float64Array(256);
  let n = 0;
  for (let i = 0; i < lum.length; i++) if (al[i] >= 0.5) { h[Math.min(255, Math.max(0, Math.round(lum[i])))]++; n++; }
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

function blur(f, r) {
  if (!r) return f;
  let a = f, b = new Float32Array(N * N);
  for (let pass = 0; pass < 4; pass++) {
    const side = pass % 2 === 0;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      let s = 0;
      for (let k = -r; k <= r; k++) {
        const u = side ? x + k : x, v = side ? y : y + k;
        if (u >= 0 && v >= 0 && u < N && v < N) s += a[v * N + u];
      }
      b[y * N + x] = s / (2 * r + 1);
    }
    [a, b] = [b, a];
  }
  return a;
}

function importer(host, { onSave, onEdit }) {
  const box = document.createElement("div");
  box.className = "pt-cut";
  box.setAttribute("role", "dialog");
  box.setAttribute("aria-label", "Stencil from a picture");
  box.innerHTML = `<div class="pt-cut-w"><header class="tb"><h2 class="tb-t">Stencil from a picture</h2><span class="tb-btns"><button class="tb-x" type="button" data-imp-x aria-label="Close"></button></span></header>` +
    `<div class="pt-cut-b"><div class="pt-cut-board pt-imp-board"><canvas width="${VIEW_PX}" height="${VIEW_PX}"></canvas><span class="pt-imp-drop" data-imp-drop>Pick a picture, paste one with ${PASTE} or drop it here</span></div>` +
    `<div class="pt-cut-side"><p class="pt-cut-row"><button class="btn" type="button" data-imp-file>Pick a file...</button><button class="btn" type="button" data-imp-paste>Paste</button></p>` +
    `<input type="file" accept="image/*" hidden data-imp-input>` +
    `<div class="pt-imp-f"><span>Cut out</span><p class="pt-cut-row pt-imp-mode"><button class="btn" type="button" data-imp-mode="colors" title="Every color gets its own hole, with a cardboard gap where two colors meet">Colors</button><button class="btn" type="button" data-imp-mode="dark">Dark</button><button class="btn" type="button" data-imp-mode="light">Light</button><button class="btn" type="button" data-imp-mode="shape">Shape</button></p></div>` +
    `<label><span data-imp-thr-l>Threshold</span><input type="range" min="1" max="254" step="1" value="128" data-imp-thr></label>` +
    `<label>Smoothing<input type="range" min="0" max="4" step="1" value="1" data-imp-soft></label>` +
    `<p class="pt-cut-hint" data-imp-hint></p>` +
    `<label>Name<input type="text" data-imp-name maxlength="20" placeholder="My stencil" autocomplete="off"></label>` +
    `<p class="pt-cut-row"><button class="btn" type="button" data-imp-edit>Edit in cutter</button><button class="btn" type="button" data-imp-save>Save and use</button></p></div></div></div>`;
  host.append(box);
  box.hidden = true;
  const cv = box.querySelector("canvas"), x = cv.getContext("2d"), input = box.querySelector("[data-imp-input]"), board = box.querySelector(".pt-imp-board");
  const thrEl = box.querySelector("[data-imp-thr]"), softEl = box.querySelector("[data-imp-soft]"), nameEl = box.querySelector("[data-imp-name]");
  let src = null, mode = "dark", holes = [], raf = 0, busy = 0, levels = { dark: 128, light: 128, colors: 185 };
  const hint = (s) => { box.querySelector("[data-imp-hint]").textContent = s; };

  function gaps(thr) {
    const f = new Float32Array(N * N), { r, g, b, al, bg } = src;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const i = y * N + x, a = al[i];
      if (a <= 0) continue;
      if (bg && Math.hypot(r[i] - bg[0], g[i] - bg[1], b[i] - bg[2]) < thr * 0.8) continue;
      let e = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const u = x + dx, v = y + dy;
        if ((!dx && !dy) || u < 0 || v < 0 || u >= N || v >= N) continue;
        const j = v * N + u;
        if (al[j] < 0.5) continue;
        e = Math.max(e, Math.hypot(r[i] - r[j], g[i] - g[j], b[i] - b[j]));
      }
      f[i] = Math.min(1, a * 2) * Math.min(1, Math.max(0, 1.5 - e / thr));
    }
    const o = new Float32Array(N * N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      let m = 1;
      for (let dy = -1; dy <= 1 && m > 0; dy++) for (let dx = -1; dx <= 1; dx++) {
        const u = x + dx, v = y + dy;
        m = Math.min(m, u < 0 || v < 0 || u >= N || v >= N ? 0 : f[v * N + u]);
      }
      o[y * N + x] = m;
    }
    return o;
  }

  function field() {
    if (mode === "colors") return blur(gaps(255 - +thrEl.value), +softEl.value);
    const f = new Float32Array(N * N), thr = +thrEl.value;
    for (let i = 0; i < N * N; i++) {
      const a = src.al[i];
      if (a <= 0) continue;
      if (mode === "shape") { f[i] = a; continue; }
      const d = (thr - src.lum[i]) / 18, v = mode === "dark" ? 0.5 + d : 0.5 - d;
      f[i] = Math.min(1, Math.max(0, v)) * Math.min(1, a * 2);
    }
    return blur(f, +softEl.value);
  }
  function draw() {
    const s = cv.width;
    cardboard(x, s);
    if (holes.length) cutHoles(x, holes, s);
  }
  function rebuild() {
    raf = 0;
    if (!src) { holes = []; draw(); return; }
    holes = trace(field(), N, BUDGET, 4 + +softEl.value * 6);
    draw();
    hint(!holes.length ? "Nothing gets cut yet. Move the slider or switch what gets cut out." : mode === "colors" ? "Every color is its own hole, with a strip of cardboard where colors meet. More gaps cuts finer details apart." : "This is how the cut sheet looks. Slide the threshold to cut more or less, then save it or fine-tune it in the cutter.");
  }
  const soon = () => { if (!raf) raf = requestAnimationFrame(rebuild); };
  function sync() {
    box.querySelectorAll("[data-imp-mode]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.impMode === mode)));
    box.querySelector('[data-imp-mode="shape"]').disabled = !(src && src.clear);
    thrEl.disabled = !src || mode === "shape";
    if (levels[mode] !== undefined) thrEl.value = String(levels[mode]);
    box.querySelector("[data-imp-thr-l]").textContent = mode === "colors" ? "Color gaps" : "Threshold";
    softEl.disabled = !src;
    box.querySelector("[data-imp-drop]").hidden = !!src;
    box.querySelector("[data-imp-edit]").disabled = box.querySelector("[data-imp-save]").disabled = !src;
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
      const c = document.createElement("canvas");
      c.width = c.height = N;
      const g = ctx2d(c), m = N * 0.04, k = Math.min((N - 2 * m) / img.naturalWidth, (N - 2 * m) / img.naturalHeight);
      const w = img.naturalWidth * k, h = img.naturalHeight * k, x0 = (N - w) / 2, y0 = (N - h) / 2;
      g.imageSmoothingQuality = "high";
      g.drawImage(img, x0, y0, w, h);
      const d = g.getImageData(0, 0, N, N).data, lum = new Float32Array(N * N), al = new Float32Array(N * N);
      const r = new Float32Array(N * N), gr = new Float32Array(N * N), b = new Float32Array(N * N), bins = new Map(), ring = [0, 0, 0, 0];
      let inside = 0, thin = 0, solid = 0;
      for (let i = 0; i < N * N; i++) {
        const a = d[i * 4 + 3] / 255, px = i % N, py = (i / N) | 0;
        al[i] = a;
        r[i] = d[i * 4]; gr[i] = d[i * 4 + 1]; b[i] = d[i * 4 + 2];
        lum[i] = a > 0 ? 0.299 * r[i] + 0.587 * gr[i] + 0.114 * b[i] : 255;
        if (px > x0 + 1 && px < x0 + w - 2 && py > y0 + 1 && py < y0 + h - 2) { inside++; if (a < 0.5) thin++; }
        if (a >= 0.5) {
          solid++;
          const k = (r[i] >> 6) * 16 + (gr[i] >> 6) * 4 + (b[i] >> 6);
          bins.set(k, (bins.get(k) || 0) + 1);
          if (px < x0 + 2 || px > x0 + w - 3 || py < y0 + 2 || py > y0 + h - 3) { ring[0] += r[i]; ring[1] += gr[i]; ring[2] += b[i]; ring[3]++; }
        }
      }
      const clear = inside > 0 && thin / inside > 0.02, colorful = [...bins.values()].filter((n) => n > solid * 0.015).length >= 3;
      src = { lum, al, r, g: gr, b, clear, bg: clear || !ring[3] ? null : [ring[0] / ring[3], ring[1] / ring[3], ring[2] / ring[3]] };
      mode = colorful ? "colors" : clear ? "shape" : "dark";
      const t = Math.round(otsu(lum, al));
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
    if (b.dataset.impMode) { mode = b.dataset.impMode; sync(); soon(); return; }
    const name = (nameEl.value || "").trim().slice(0, 20) || "My stencil";
    if (b.hasAttribute("data-imp-edit") && src) { const f = field(); hide(); onEdit(f, name); return; }
    if (b.hasAttribute("data-imp-save")) {
      if (!holes.length) { hint("Nothing gets cut yet. Move the threshold first."); return; }
      hide();
      onSave(keep(name, holes));
    }
  });
  input.addEventListener("change", () => { const f = input.files && input.files[0]; input.value = ""; if (f) load(f); });
  thrEl.addEventListener("input", () => { levels[mode] = +thrEl.value; soon(); });
  softEl.addEventListener("input", soon);
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
    open(blob) {
      box.hidden = false;
      if (blob) load(blob, "Pasted picture");
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

export function cutter(host, { onSave }) {
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
    close() { hide(); imp.close(); },
    get shown() { return !box.hidden || imp.shown; },
  };
}
