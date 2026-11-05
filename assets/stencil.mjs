/* Gzowo Labs wall stencils: the ready made cardboard stencils, the cutting board where visitors cut their own with a knife, a hole punch,
   glue and letters, and the tracing that turns a cut sheet into outlines the wall clips spray paint to. Outlines are normalized to 0..1. */

const N = 128, KEY = "gl-stencils", MAX = 24, CUT_PX = 320, FONT = '"Arial Black", Impact, "Helvetica Neue", sans-serif';
const PUNCH = [3, 6, 11], TEXT = [0.13, 0.2, 0.3];

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

function maskOf(cv) {
  const d = cv.getContext("2d").getImageData(0, 0, N, N).data, m = new Uint8Array(N * N);
  for (let i = 0; i < N * N; i++) m[i] = d[i * 4 + 3] > 127 ? 1 : 0;
  return m;
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

export function trace(mask, n = N) {
  const V = n + 1, out = new Map();
  const edge = (ax, ay, bx, by) => { const k = ay * V + ax; let l = out.get(k); if (!l) out.set(k, (l = [])); l.push([bx, by]); };
  const hole = (x, y) => x >= 0 && y >= 0 && x < n && y < n && mask[y * n + x] === 1;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    if (!hole(x, y)) continue;
    if (!hole(x, y - 1)) edge(x + 1, y, x, y);
    if (!hole(x, y + 1)) edge(x, y + 1, x + 1, y + 1);
    if (!hole(x - 1, y)) edge(x, y, x, y + 1);
    if (!hole(x + 1, y)) edge(x + 1, y + 1, x + 1, y);
  }
  const loops = [];
  for (const [k0, list0] of out) {
    while (list0.length) {
      const sx = k0 % V, sy = Math.floor(k0 / V), pts = [sx, sy];
      let px = sx, py = sy, [nx, ny] = list0.pop(), guard = 0;
      while ((nx !== sx || ny !== sy) && guard++ < 200000) {
        const dx = nx - px, dy = ny - py;
        pts.push(nx, ny);
        const l = out.get(ny * V + nx);
        if (!l || !l.length) break;
        let pick = 0;
        if (l.length > 1) { const left = [nx + dy, ny - dx]; pick = Math.max(0, l.findIndex(([a, b]) => a === left[0] && b === left[1])); }
        const [qx, qy] = l.splice(pick, 1)[0];
        px = nx; py = ny; nx = qx; ny = qy;
      }
      const corners = [];
      const m = pts.length / 2;
      for (let i = 0; i < m; i++) {
        const a = (i - 1 + m) % m, b = (i + 1) % m;
        const cross = (pts[i * 2] - pts[a * 2]) * (pts[b * 2 + 1] - pts[i * 2 + 1]) - (pts[i * 2 + 1] - pts[a * 2 + 1]) * (pts[b * 2] - pts[i * 2]);
        if (cross !== 0) corners.push(pts[i * 2], pts[i * 2 + 1]);
      }
      if (corners.length >= 6 && Math.abs(area(corners)) >= 3) loops.push(corners);
    }
  }
  let eps = 0.7, res = loops.map((l) => simplify(l, eps));
  while (res.reduce((s, l) => s + l.length, 0) > 700 && eps < 6) { eps *= 1.5; res = loops.map((l) => simplify(l, eps)); }
  return res.filter((l) => l.length >= 6).map((l) => Float64Array.from(l, (v) => v / n));
}

const cache = new Map();
function presetStencil([id, name, draw]) {
  const key = "p:" + id;
  if (cache.has(key)) return cache.get(key);
  const cv = document.createElement("canvas");
  cv.width = cv.height = N;
  const x = cv.getContext("2d");
  x.fillStyle = x.strokeStyle = "#000";
  draw(x, N);
  const st = { id: key, name, holes: trace(maskOf(cv)) };
  cache.set(key, st);
  return st;
}
export const presets = () => PRESETS.map(presetStencil);

const enc = (holes) => holes.map((h) => Array.from(h, (v) => Math.round(v * 1000)).join(",")).join(";");
const dec = (s) => String(s || "").split(";").map((q) => Float64Array.from(q.split(","), (v) => +v / 1000)).filter((h) => h.length >= 6 && h.every((v) => v >= 0 && v <= 1));
export function saved() {
  try { return (JSON.parse(localStorage.getItem(KEY)) || []).filter((s) => s && s.id && s.h).map((s) => ({ id: "u:" + s.id, name: String(s.n || "My stencil").slice(0, 20), holes: dec(s.h) })).filter((s) => s.holes.length); } catch (e) { return []; }
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

export function sheetThumb(cv, st, px = 48) {
  const dpr = Math.min(2, devicePixelRatio || 1);
  cv.width = cv.height = Math.round(px * dpr);
  const x = cv.getContext("2d"), s = cv.width;
  x.fillStyle = "#c49a5e"; x.fillRect(0, 0, s, s);
  x.strokeStyle = "rgba(90,60,25,.5)"; x.strokeRect(0.5, 0.5, s - 1, s - 1);
  x.globalCompositeOperation = "destination-out";
  x.beginPath();
  st.holes.forEach((h) => { for (let i = 0; i < h.length; i += 2) (i ? x.lineTo(h[i] * s, h[i + 1] * s) : x.moveTo(h[i] * s, h[i + 1] * s)); x.closePath(); });
  x.fill("evenodd");
  x.globalCompositeOperation = "source-over";
}

const ICON = {
  knife: '<path d="M2 14l8-8 2 2-8 8z" fill="#c0c0c0" stroke="#000"/><path d="M10 6l3-4 1 1-2 5z" fill="#7a4a1c" stroke="#000"/>',
  punch: '<circle cx="8" cy="8" r="5" fill="#fff" stroke="#000"/><circle cx="8" cy="8" r="2" fill="#000"/>',
  glue: '<rect x="5" y="2" width="6" height="12" fill="#fff" stroke="#000"/><rect x="5" y="2" width="6" height="3" fill="#e0a020"/>',
  text: '<path d="M3 3h10v3h-1l-1-1H9v8h2v1H5v-1h2V5H5L4 6H3z" fill="#000"/>',
};
const btnIcon = (k) => `<svg viewBox="0 0 16 16" width="16" height="16" shape-rendering="crispEdges" aria-hidden="true">${ICON[k]}</svg>`;

const esc = (s) => String(s).replace(/[<>&"]/g, "");

export function picker(host, { onPick, onCut, onClose }) {
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
      `<p class="pt-pick-a"><button class="btn" type="button" data-pk-cut>Cut your own...</button></p>`;
    el.querySelectorAll("[data-pk] canvas").forEach((cv, i) => sheetThumb(cv, all[i]));
    el._all = all;
  }
  el.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.hasAttribute("data-pk-x")) { close(); if (onClose) onClose(); return; }
    if (b.hasAttribute("data-pk-cut")) { close(); onCut(); return; }
    if (b.dataset.pkDel) { forget(b.dataset.pkDel); render(); return; }
    const st = (el._all || []).find((s) => s.id === b.dataset.pk);
    if (st) { close(); onPick(st); }
  });
  function open() { render(); el.hidden = false; }
  function close() { el.hidden = true; }
  return { open, close, toggle() { if (el.hidden) open(); else close(); }, get shown() { return !el.hidden; } };
}

export function cutter(host, { onSave }) {
  const box = document.createElement("div");
  box.className = "pt-cut";
  box.setAttribute("role", "dialog");
  box.setAttribute("aria-label", "Cut a stencil");
  box.innerHTML = `<div class="pt-cut-w"><header class="tb"><h2 class="tb-t">Cut a stencil</h2><span class="tb-btns"><button class="tb-x" type="button" data-cut-x aria-label="Close"></button></span></header>` +
    `<div class="pt-cut-b"><div class="pt-cut-tools">${["knife", "punch", "glue", "text"].map((k) => `<button type="button" class="pt-t" data-ct="${k}" title="${{ knife: "Knife: draw around a shape to cut it out", punch: "Hole punch: drag to cut a line", glue: "Glue: drag to stick cardboard back", text: "Letters: click where the word goes" }[k]}">${btnIcon(k)}</button>`).join("")}` +
    `<div class="pt-sizes">${PUNCH.map((_, i) => `<button type="button" class="pt-s" data-cs="${i}" aria-label="Size ${i + 1}"><i style="width:${[3, 6, 10][i]}px;height:${[3, 6, 10][i]}px"></i></button>`).join("")}</div></div>` +
    `<div class="pt-cut-board"><canvas width="${CUT_PX}" height="${CUT_PX}"></canvas></div>` +
    `<div class="pt-cut-side"><label>Word to cut<input type="text" data-cut-word maxlength="12" value="GZOWO" autocomplete="off"></label>` +
    `<p class="pt-cut-hint" data-cut-hint></p><p class="pt-cut-row"><button class="btn" type="button" data-cut-undo>Undo</button><button class="btn" type="button" data-cut-new>New sheet</button></p>` +
    `<label>Name<input type="text" data-cut-name maxlength="20" placeholder="My stencil" autocomplete="off"></label>` +
    `<p class="pt-cut-row"><button class="btn" type="button" data-cut-save>Save and use</button></p></div></div></div>`;
  host.append(box);
  const view = box.querySelector("canvas"), vx = view.getContext("2d"), sheet = document.createElement("canvas");
  sheet.width = sheet.height = N;
  const sx = sheet.getContext("2d"), undo = [];
  let tool = "knife", size = 1, lasso = null, last = null, drag = false;
  const hints = { knife: "Draw around a shape and let go: the inside falls out.", punch: "Drag to punch a line of holes through the sheet.", glue: "Drag over a hole to glue cardboard back in.", text: "Type a word on the right, then click the sheet where it goes." };

  function paint() {
    vx.globalCompositeOperation = "source-over";
    vx.fillStyle = "#c49a5e"; vx.fillRect(0, 0, CUT_PX, CUT_PX);
    vx.fillStyle = "rgba(120,80,30,.18)";
    for (let y = 0; y < CUT_PX; y += 4) vx.fillRect(0, y, CUT_PX, 1);
    vx.globalCompositeOperation = "destination-out";
    vx.imageSmoothingEnabled = false;
    vx.drawImage(sheet, 0, 0, CUT_PX, CUT_PX);
    vx.globalCompositeOperation = "source-over";
    if (lasso && lasso.length > 2) {
      vx.setLineDash([5, 4]); vx.lineWidth = 2; vx.strokeStyle = "#000";
      vx.beginPath(); lasso.forEach(([a, b], i) => (i ? vx.lineTo(a * (CUT_PX / N), b * (CUT_PX / N)) : vx.moveTo(a * (CUT_PX / N), b * (CUT_PX / N)))); vx.stroke();
      vx.setLineDash([]);
    }
  }
  function sync() {
    box.querySelectorAll("[data-ct]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.ct === tool)));
    box.querySelectorAll("[data-cs]").forEach((b) => b.setAttribute("aria-pressed", String(+b.dataset.cs === size)));
    box.querySelector("[data-cut-hint]").textContent = hints[tool];
    box.querySelector("[data-cut-undo]").disabled = !undo.length;
  }
  const snap = () => { undo.push(sx.getImageData(0, 0, N, N)); if (undo.length > 25) undo.shift(); };
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
    if (tool === "knife") { if (Math.hypot(p[0] - last[0], p[1] - last[1]) > 0.8) { lasso.push(p); last = p; } }
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
    if (b.dataset.ct) tool = b.dataset.ct;
    if (b.dataset.cs) size = +b.dataset.cs;
    if (b.hasAttribute("data-cut-undo") && undo.length) sx.putImageData(undo.pop(), 0, 0);
    if (b.hasAttribute("data-cut-new")) { snap(); sx.clearRect(0, 0, N, N); }
    if (b.hasAttribute("data-cut-save")) {
      const holes = trace(maskOf(sheet));
      if (!holes.length) { box.querySelector("[data-cut-hint]").textContent = "Cut something out first: the sheet has no holes yet."; return; }
      const name = (box.querySelector("[data-cut-name]").value || "").trim().slice(0, 20) || "My stencil";
      hide();
      onSave(keep(name, holes));
      return;
    }
    paint(); sync();
  });
  box.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.stopPropagation(); hide(); } });
  function hide() { box.hidden = true; lasso = null; drag = false; }
  box.hidden = true;
  return {
    open() { box.hidden = false; paint(); sync(); box.querySelector("[data-ct]").focus({ preventScroll: true }); },
    close: hide,
    get shown() { return !box.hidden; },
  };
}
