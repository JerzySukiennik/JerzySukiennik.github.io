/* Gzowo Coaster on Gzowo Street: a pixel roller coaster floating over the plot with a station tower and a train of folks and Jurek
   on real physics (chain lift, drop, vertical loop, camelbacks, brakes), a paid ride from the front seat, and the sky shows people buy. */

import { sheet, randomSpec, esc } from "/assets/folks.mjs";
import { snapshot } from "/assets/boot.mjs";
import { buy, toast, cone } from "/assets/bank.mjs";

const FW = 18, CARS = 3, GAP = 17, G = 1.1, VB = 0.6, VL = 0.32, BRAKE = 1.4;
const TYPES = ["station", "boost", "lift", "free", "brake"];
const JUREK = { n: "Jurek", p: "0107000", c: "0ccnoa6", o: ".".repeat(384), w: [] };
const CAR_COL = [["#ffd23f", "#fff0a0"], ["#1fb5a8", "#7fe3d8"], ["#ff8c1a", "#ffc27a"]];
const OUTL = "#1c1714", SKY = "#9ecff9";
const FIRE = ["#ffd23f", "#ff7eb6", "#4cc3ff", "#8bd346", "#ffffff", "#ff8c1a", "#7d4cdb", "#a8f0c8"];
const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;

const C = { world: null, geo: null, mode: "", el: null, cv: null, tv: null, spot: null, ox: 0, oy: 0, u: 2, h: 1, trk: null, train: null,
  vis: false, raf: 0, last: 0, riders: () => [], fill: [], jurek: null, pov: null, indoor: false, price: 12 };

function seg(p0, p1, p2, p3, m, out) {
  const d = (a, b) => Math.sqrt(Math.hypot(b.x - a.x, b.y - a.y)) || 1e-4;
  const t1 = d(p0, p1), t2 = t1 + d(p1, p2), t3 = t2 + d(p2, p3);
  const L = (a, b, ta, tb, t) => ({ x: ((tb - t) * a.x + (t - ta) * b.x) / (tb - ta), y: ((tb - t) * a.y + (t - ta) * b.y) / (tb - ta) });
  for (let i = 0; i < m; i++) {
    const t = t1 + ((t2 - t1) * i) / m;
    const A1 = L(p0, p1, 0, t1, t), A2 = L(p1, p2, t1, t2, t), A3 = L(p2, p3, t2, t3, t);
    const B1 = L(A1, A2, 0, t2, t), B2 = L(A2, A3, t1, t3, t), q = L(B1, B2, t1, t2, t);
    out.push({ x: q.x, y: q.y, t: p1.t, l: p1.l });
  }
}

const loop = (cx, cy, r) => [[cx - 1.4 * r, cy + 0.95 * r], [cx + 0.55 * r, cy + 0.85 * r], [cx + r, cy], [cx, cy - r], [cx - r, cy], [cx - 0.55 * r, cy + 0.85 * r]]
  .map(([x, y]) => [x, y, "free", 1]).concat([[cx + 1.4 * r, cy + 0.95 * r, "free", 0]]);

function plan(geo, mode, u) {
  const k = geo.sky, A = k.w / k.h, st = geo.places.coaster, sx = (st.x + st.w / 2 - k.x) / k.h, ss = sx - (0.55 * (2 * GAP + 16) * u) / k.h;
  let P;
  if (mode === "tall") {
    const yb = 0.93;
    P = [[ss, yb, "station"], [Math.min(0.62, ss - 0.06), yb + 0.005, "boost"], [0.42, yb - 0.03, "lift"], [0.13, 0.15, "lift"], [0.07, 0.07, "lift"], [0.13, 0.03, "free"], [0.22, 0.035, "free"],
      [0.5, 0.55, "free"], ...loop(0.8, 0.5, 0.17), [Math.min(1.1, A - 0.03), 0.76, "brake"], [Math.min(1.06, A - 0.06), 0.9, "brake"]];
  } else {
    const yb = 0.86, x0 = 1.75, x1 = sx - 0.25, n = Math.max(1, Math.round((x1 - x0) / 1.1)), w = (x1 - x0) / n, hills = [];
    for (let i = 0; i < n; i++) hills.push([x0 + w * (i + 0.4), 0.28 + (n > 1 ? (0.14 * i) / (n - 1) : 0.06), "free"], [x0 + w * (i + 0.88), 0.66, "free"]);
    P = [[ss, yb, "station"], [sx - 0.5, yb + 0.005, "boost"], [(sx + 0.95) / 2, yb + 0.01, "boost"], [0.95, yb, "boost"], [0.75, yb - 0.04, "lift"], [0.25, 0.12, "lift"],
      [0.16, 0.05, "lift"], [0.22, 0.02, "free"], [0.36, 0.03, "free"], [0.47, 0.1, "free"], [0.7, 0.42, "free"], ...loop(1.3, 0.5, 0.21), ...hills,
      [sx + 0.1, 0.58, "free"], [Math.min(sx + 0.3, A - 0.05), 0.72, "brake"], [Math.min(sx + 0.22, A - 0.1), yb - 0.01, "brake"]];
  }
  return P.map(([x, y, t, l]) => ({ x: k.x + x * k.h, y: k.y + y * k.h, t, l: !!l }));
}

function build(geo, mode) {
  const P = plan(geo, mode, C.u), n = P.length, raw = [];
  for (let i = 0; i < n; i++) {
    const p1 = P[i], p2 = P[(i + 1) % n];
    seg(P[(i - 1 + n) % n], p1, p2, P[(i + 2) % n], Math.max(6, Math.ceil(Math.hypot(p2.x - p1.x, p2.y - p1.y) / 2)), raw);
  }
  const cum = [0];
  for (let i = 1; i < raw.length; i++) cum.push(cum[i - 1] + Math.hypot(raw[i].x - raw[i - 1].x, raw[i].y - raw[i - 1].y));
  const L = cum[cum.length - 1] + Math.hypot(raw[0].x - raw[raw.length - 1].x, raw[0].y - raw[raw.length - 1].y), N = Math.ceil(L);
  const T = { L, N, step: L / N, xs: new Float32Array(N), ys: new Float32Array(N), dx: new Float32Array(N), dy: new Float32Array(N), ty: new Uint8Array(N), lp: new Uint8Array(N), top: Infinity, bot: -Infinity };
  let j = 0;
  for (let i = 0; i < N; i++) {
    const s = i * T.step;
    while (j < raw.length - 1 && cum[j + 1] < s) j++;
    const a = raw[j], b = raw[(j + 1) % raw.length], len = (j + 1 < raw.length ? cum[j + 1] : L) - cum[j], f = len ? (s - cum[j]) / len : 0;
    T.xs[i] = a.x + (b.x - a.x) * f;
    T.ys[i] = a.y + (b.y - a.y) * f;
    T.ty[i] = TYPES.indexOf(a.t);
    T.lp[i] = a.l ? 1 : 0;
    T.top = Math.min(T.top, T.ys[i]);
    T.bot = Math.max(T.bot, T.ys[i]);
  }
  for (let i = 0; i < N; i++) {
    const a = (i - 2 + N) % N, b = (i + 2) % N, dx = T.xs[b] - T.xs[a], dy = T.ys[b] - T.ys[a], m = Math.hypot(dx, dy) || 1;
    T.dx[i] = dx / m; T.dy[i] = dy / m;
  }
  return T;
}

function pose(s) {
  const T = C.trk, q = ((((s % T.L) + T.L) % T.L) / T.step), i = Math.floor(q) % T.N, j = (i + 1) % T.N, f = q - Math.floor(q);
  const dx = T.dx[i], dy = T.dy[i], lp = T.lp[i];
  let ux, uy, ys = 1;
  if (lp || dx >= 0) { ux = dy; uy = -dx; } else { ux = -dy; uy = dx; }
  if (!lp) ys = Math.min(1, Math.max(0.1, Math.abs(dx) / 0.3));
  return { x: T.xs[i] + (T.xs[j] - T.xs[i]) * f, y: T.ys[i] + (T.ys[j] - T.ys[i]) * f, dx, dy, ux, uy, ys, loop: lp, type: TYPES[T.ty[i]] };
}

function train(dwell) {
  return { s: 0, v: 0, state: "dwell", wait: dwell, dwell, laps: 0, riders: [], wave: false, onStop: null };
}

function step(tr, dt) {
  if (tr.state === "dwell") {
    tr.v = 0;
    tr.wave = false;
    tr.wait -= dt;
    if (tr.wait <= 0) tr.state = "run";
    return;
  }
  const T = C.trk, h = C.h, fr = pose(tr.s);
  let v = tr.v;
  const toward = (target, rate) => { v += Math.sign(target - v) * Math.min(Math.abs(target - v), rate * dt); };
  if (fr.type === "station" || fr.type === "boost") toward(VB * h, 0.9 * h);
  else if (fr.type === "lift") toward(VL * h, 1.2 * h);
  else if (fr.type === "brake") v = Math.min(Math.max(v, 0.2 * h), Math.sqrt(2 * BRAKE * h * Math.max(0, T.L - tr.s)) + 0.03 * h);
  else {
    let sl = 0;
    for (let c = 0; c < CARS; c++) sl += pose(tr.s - c * GAP * C.u).dy;
    v += (G * h * (sl / CARS) - 0.035 * v - (0.015 * v * v) / h) * dt;
    v = Math.max(v, 0.22 * h);
  }
  tr.v = v;
  tr.s += v * dt;
  tr.wave = v > 0.85 * h && (fr.dy > 0.25 || fr.loop);
  if (tr.s >= T.L - 0.5) {
    tr.s = 0;
    tr.state = "dwell";
    tr.wait = tr.dwell;
    tr.laps++;
    if (tr.onStop) tr.onStop(tr);
  }
}

function car(ctx, i, tr, own) {
  const [col, hi] = CAR_COL[i];
  for (let k = 0; k < 2; k++) {
    const sx = k ? -4 : 2.5, r = tr.riders[i * 2 + k];
    if (own && i === 0 && k === 0) {
      ctx.fillStyle = "#f1c27d";
      if (tr.wave) { ctx.fillRect(0, -13, 1, 3); ctx.fillRect(5, -13, 1, 3); ctx.fillStyle = OUTL; ctx.fillRect(0, -14, 1, 1); ctx.fillRect(5, -14, 1, 1); }
      else { ctx.fillRect(4, -8, 1, 1); ctx.fillRect(6, -8, 1, 1); }
      continue;
    }
    if (r) ctx.drawImage(r, (tr.wave ? ((i + k) % 2 ? 4 : 8) : 0) * FW, 1, FW, 14, sx - 4.5, -12.5, 9, 7);
  }
  ctx.fillStyle = OUTL;
  ctx.fillRect(-8, -7, 16, 5);
  ctx.fillRect(5, -9, 1, 2);
  ctx.fillStyle = col;
  ctx.fillRect(-7, -6, 14, 3);
  ctx.fillStyle = hi;
  ctx.fillRect(-7, -6, 14, 1);
  ctx.fillStyle = OUTL;
  ctx.fillRect(-6, -2, 3, 1);
  ctx.fillRect(3, -2, 3, 1);
  if (i === 0) { ctx.fillStyle = "#fff6c8"; ctx.fillRect(8, -5, 1, 1); }
}

function drawTrain(ctx, tr, base, own) {
  const u = C.u;
  for (let i = CARS - 1; i >= 0; i--) {
    const p = pose(tr.s - i * GAP * u);
    ctx.setTransform(base.multiply(new DOMMatrix([p.dx * u, p.dy * u, -p.ux * p.ys * u, -p.uy * p.ys * u, p.x, p.y])));
    car(ctx, i, tr, own);
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

function px(c, x, y, col) { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), 1, 1); }

function line(c, x0, y0, x1, y1, col) {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let e = dx + dy;
  c.fillStyle = col;
  for (;;) {
    c.fillRect(x0, y0, 1, 1);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * e;
    if (e2 >= dy) { e += dy; x0 += sx; }
    if (e2 <= dx) { e += dx; y0 += sy; }
  }
}

function drawTrack() {
  const T = C.trk, u = C.u, c = C.tv.getContext("2d"), geo = C.geo, st = geo.places.coaster;
  c.clearRect(0, 0, C.tv.width, C.tv.height);
  const at = (x, y) => [(x - C.ox) / u, (y - C.oy) / u];
  const tx = (st.x + st.w / 2 - C.ox) / u, base = (st.y + st.h - C.oy) / u, [sx, sy] = at(T.xs[0], T.ys[0]);
  const top = Math.round(sy + 3), bot = Math.round(base);
  for (let y = top; y < bot; y++) {
    px(c, tx - 6, y, "#3a3a3a"); px(c, tx - 5, y, "#7a7a7a"); px(c, tx + 5, y, "#3a3a3a"); px(c, tx + 4, y, "#7a7a7a");
    if ((y - top) % 12 === 0) for (let x = -4; x <= 3; x++) px(c, tx + x, y, "#5a5f68");
  }
  for (let y = top; y + 12 <= bot; y += 12) { line(c, tx - 4, y, tx + 3, y + 12, "#9aa0aa"); line(c, tx + 3, y, tx - 4, y + 12, "#9aa0aa"); }
  for (let y = top + 3; y < bot - 2; y += 6) { const o = ((y - top) / 6) % 2 ? -3 : 1; c.fillStyle = "#c08a4a"; c.fillRect(Math.round(tx + o), y, 3, 1); }
  const sign = Math.round((top + bot) / 2) - 4;
  c.fillStyle = OUTL; c.fillRect(Math.round(tx - 9), sign - 1, 19, 8);
  c.fillStyle = "#ffd23f"; c.fillRect(Math.round(tx - 8), sign, 17, 6);
  c.fillStyle = OUTL;
  [[-6, 3], [-5, 2], [-4, 1], [-3, 2], [-2, 3], [-1, 4], [0, 3], [1, 2], [2, 1], [3, 2], [4, 3], [5, 4], [6, 3]].forEach(([x, y]) => c.fillRect(Math.round(tx + x), sign + y, 1, 1));
  const len = 2 * GAP + 16, pw = len + 14, pl = Math.round(T.dx[0] < 0 ? sx - 10 : sx - len - 4);
  c.fillStyle = "#8d5524"; c.fillRect(pl, Math.round(sy + 3), pw, 2);
  c.fillStyle = "#5c3a21"; c.fillRect(pl, Math.round(sy + 5), pw, 1);
  const rx = pl - 1, ry = Math.round(sy - 21);
  c.fillStyle = OUTL; c.fillRect(rx, ry, pw + 2, 4);
  c.fillStyle = "#1fb5a8"; c.fillRect(rx + 1, ry + 1, pw, 2);
  c.fillStyle = "#7fe3d8"; c.fillRect(rx + 1, ry + 1, pw, 1);
  c.fillStyle = OUTL; c.fillRect(rx + 2, ry + 4, 1, 20); c.fillRect(rx + pw - 1, ry + 4, 1, 20);
  c.fillStyle = "#ffd23f"; c.fillRect(rx + 3, ry - 4, 3, 2); c.fillRect(rx + pw - 4, ry - 4, 3, 2);
  c.fillStyle = OUTL; c.fillRect(rx + 2, ry - 4, 1, 4); c.fillRect(rx + pw - 1, ry - 4, 1, 4);
  const step = 0.5 * u;
  for (let pass = 0; pass < 3; pass++) {
    for (let s = 0; s < T.L; s += step) {
      const p = pose(s), [x, y] = at(p.x, p.y), nx = -p.dy, ny = p.dx;
      if (pass === 0) { px(c, x + nx * 2, y + ny * 2, "#22324f"); px(c, x - nx * 2, y - ny * 2, "#22324f"); }
      else if (pass === 1) { if (Math.floor(s / u) % 3 === 0) { px(c, x, y, "#6a7a90"); } }
      else { px(c, x + nx, y + ny, "#eef2f7"); px(c, x - nx, y - ny, "#eef2f7"); }
    }
  }
}

function drawMap() {
  const c = C.cv.getContext("2d");
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, C.cv.width, C.cv.height);
  c.imageSmoothingEnabled = false;
  drawTrain(c, C.train, new DOMMatrix([1 / C.u, 0, 0, 1 / C.u, -C.ox / C.u, -C.oy / C.u]), false);
}

function frame(t) {
  C.raf = 0;
  if (!C.vis || C.indoor || C.pov || document.hidden || !C.trk) return;
  const dt = Math.min(0.05, (t - C.last) / 1000 || 0.016);
  C.last = t;
  step(C.train, dt);
  drawMap();
  C.raf = requestAnimationFrame(frame);
}

function run() {
  if (C.raf || calm || !C.vis || C.indoor || C.pov || document.hidden || !C.trk) return;
  C.last = performance.now();
  C.raf = requestAnimationFrame(frame);
}

const jurekSheet = () => C.jurek || (C.jurek = sheet(JUREK));
const fillSheet = (i) => C.fill[i] || (C.fill[i] = sheet(randomSpec()));

function board(tr, pov) {
  const folks = (C.riders() || []).map((r) => r.sh).filter(Boolean).sort(() => Math.random() - 0.5);
  const J = window.gzJurek, near = J && C.geo && J.x > C.geo.sky.x - C.geo.V * 0.2, seats = [];
  if (pov) seats.push(null, jurekSheet());
  else if (!near) seats.push(jurekSheet());
  while (seats.length < CARS * 2 && folks.length) seats.push(folks.pop());
  while (seats.length < CARS * 2) seats.push(fillSheet(seats.length));
  tr.riders = seats;
}

function riderNames() {
  const names = (C.riders() || []).map((r) => r.n).filter(Boolean).slice(0, 5);
  return names.length ? names.map(esc).join(", ") : "visitors from all over";
}

function openTicket() {
  const el = window.gzDesk.open({ id: "coaster", title: "Gzowo Coaster", icon: "coaster", cls: "w-coaster", status: `<span>Laps since you came: ${C.train ? C.train.laps : 0}</span>`,
    body: `<div class="bk-pad co-tk"><p class="bk-big">The Gzowo Coaster</p><p>A pixel coaster floating over Gzowo Street: a 40 m chain lift, a steep drop, a full vertical loop and camelback hills, back to the station in about fifteen seconds.</p>
<p>Watching is free. A ticket puts you in the front seat next to Jurek and shows the whole ride from the car.</p><p class="bk-row"><button class="btn go" type="button" data-co-ride>${cone(16)} Ride for ${C.price}</button></p><p class="bk-note" data-co-note></p>
<p class="bk-note">Often on board: ${riderNames()}.</p></div>` });
  return el;
}

async function ticket(btn) {
  const note = btn.closest(".wb").querySelector("[data-co-note]");
  btn.disabled = true;
  note.textContent = "";
  try {
    await buy("ride");
    window.gzDesk.close("coaster");
    startPov();
  } catch (e) { note.textContent = e.message; btn.disabled = false; }
}

function startPov() {
  if (C.pov || !C.trk) return;
  const r = C.el.getBoundingClientRect(), pad = Math.round(C.h * 0.7);
  const snap = snapshot(C.world, null, { x: r.left - pad, y: r.top - pad, w: r.width + pad * 2, h: r.height + pad * 2 }, 1, false, null);
  const map = C.world.querySelector("canvas.map"), my = map ? Math.round(map.getBoundingClientRect().top - (r.top - pad)) : 0;
  let bg = SKY;
  try { const d = snap.getContext("2d").getImageData(Math.round(snap.width / 2), Math.max(0, Math.min(snap.height - 1, my + 1)), 1, 1).data; if (d[3]) bg = `rgb(${d[0]},${d[1]},${d[2]})`; } catch (e) {}
  const el = document.createElement("div");
  el.className = "co-pov";
  el.setAttribute("role", "dialog");
  el.setAttribute("aria-label", "Coaster ride");
  el.innerHTML = `<canvas class="co-pv"></canvas><div class="co-hud"><b data-co-sp>0 km/h</b><span data-co-ht>0 m</span></div><button class="btn co-off" type="button" data-co-off>Get off</button>
<div class="co-end" hidden><p><b>What a ride!</b></p><p class="bk-row"><button class="btn go" type="button" data-co-again>${cone(16)} Again for ${C.price}</button><button class="btn" type="button" data-co-off>Get off</button></p><p class="bk-note" data-co-note></p></div>`;
  document.body.append(el);
  document.documentElement.classList.add("co-riding");
  const cv = el.querySelector("canvas");
  C.pov = { el, cv, ctx: cv.getContext("2d"), snap, bg, sx: C.ox - pad, sy: C.oy - pad, m: 1, th: 0, raf: 0, last: performance.now(), n: 0, lines: [], tr: null, done: false };
  sizePov();
  ride();
  C.pov.el.addEventListener("click", (e) => {
    if (e.target.closest("[data-co-off]")) stopPov();
    const a = e.target.closest("[data-co-again]");
    if (a) again(a);
  });
}

function ride() {
  const P = C.pov, tr = train(1.4);
  tr.dwell = 999;
  board(tr, true);
  tr.left = C.mode === "tall" ? 2 : 1;
  tr.onStop = () => {
    if (--tr.left > 0) { tr.wait = 0.3; return; }
    P.done = true;
    P.el.querySelector("[data-co-sp]").textContent = "0 km/h";
    P.el.querySelector(".co-end").hidden = false;
  };
  P.tr = tr;
  P.done = false;
  P.el.querySelector(".co-end").hidden = true;
  P.last = performance.now();
  if (!P.raf) P.raf = requestAnimationFrame(povFrame);
}

async function again(btn) {
  const note = C.pov.el.querySelector("[data-co-note]");
  btn.disabled = true;
  try { await buy("ride"); ride(); } catch (e) { note.textContent = e.message; }
  btn.disabled = false;
}

function stopPov() {
  const P = C.pov;
  if (!P) return;
  cancelAnimationFrame(P.raf);
  P.el.remove();
  C.pov = null;
  document.documentElement.classList.remove("co-riding");
  run();
}

function sizePov() {
  const P = C.pov;
  if (!P) return;
  P.cv.width = P.cv.clientWidth || innerWidth;
  P.cv.height = P.cv.clientHeight || innerHeight;
}

const wrapA = (a) => Math.atan2(Math.sin(a), Math.cos(a));

function povFrame(t) {
  const P = C.pov;
  if (!P) return;
  P.raf = 0;
  const dt = Math.min(0.05, (t - P.last) / 1000 || 0.016);
  P.last = t;
  if (!P.done) step(P.tr, dt);
  const ctx = P.ctx, W = P.cv.width, H = P.cv.height, h = C.h, u = C.u, p = pose(P.tr.s);
  const mt = p.loop || p.dx >= 0 ? 1 : -1;
  P.m += Math.sign(mt - P.m) * Math.min(Math.abs(mt - P.m), dt * 5);
  const th = p.loop ? Math.atan2(p.dy, p.dx) : Math.atan2(p.dy, Math.abs(p.dx)) * 0.9;
  P.th += wrapA(th - P.th) * Math.min(1, dt * 9);
  const ax = W < H ? 0.75 : 0.5, Z = Math.max(2, Math.min(H / (0.55 * h), (ax * W - 12) / (0.1 * h + 52 * u))), cam = { x: p.x + p.ux * 9 * u + p.dx * 0.1 * h, y: p.y + p.uy * 9 * u + p.dy * 0.1 * h };
  const m = Math.abs(P.m) < 0.04 ? 0.04 * (P.m < 0 ? -1 : 1) : P.m;
  const M = new DOMMatrix().translate(W * ax, H * 0.56).scale(Z, Z).rotate((-P.th * 180) / Math.PI).scale(m, 1).translate(-cam.x, -cam.y);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = P.bg;
  ctx.fillRect(0, 0, W, H);
  ctx.imageSmoothingEnabled = false;
  ctx.setTransform(M);
  ctx.drawImage(P.snap, P.sx, P.sy);
  drawTrain(ctx, P.tr, M, true);
  const sp = P.tr.v / h;
  if (sp > 0.75) {
    if (P.lines.length < 16) P.lines.push({ x: Math.random() * W, y: Math.random() * H, l: 40 + Math.random() * 120 });
    ctx.fillStyle = `rgba(255,255,255,${Math.min(0.5, (sp - 0.75) * 0.9)})`;
    P.lines.forEach((ln) => { ln.x -= sp * 2200 * dt; if (ln.x + ln.l < 0) { ln.x = W + Math.random() * 200; ln.y = Math.random() * H; } ctx.fillRect(ln.x, ln.y, ln.l, 2); });
  } else P.lines.length = 0;
  if (P.n++ % 5 === 0) {
    P.el.querySelector("[data-co-sp]").textContent = `${Math.round(sp * 87)} km/h`;
    P.el.querySelector("[data-co-ht]").textContent = `${Math.max(0, Math.round(((C.trk.bot - p.y) / h) * 48))} m up`;
  }
  if (!P.done) P.raf = requestAnimationFrame(povFrame);
}

function layout(geo) {
  if (!C.el) return;
  C.geo = geo;
  C.mode = document.documentElement.classList.contains("tall") ? "tall" : "land";
  const k = geo.sky, st = geo.places.coaster;
  C.h = k.h;
  C.u = Math.max(1.5, geo.s * 2);
  const pad = 14 * C.u;
  C.ox = Math.floor(k.x - pad);
  C.oy = Math.floor(k.y - pad);
  const w = Math.ceil(k.w + pad * 2), hh = Math.ceil(st.y + st.h - C.oy + 2);
  Object.assign(C.el.style, { left: C.ox + "px", top: C.oy + "px", width: w + "px", height: hh + "px", zIndex: Math.round(st.y + st.h) });
  [C.tv, C.cv].forEach((c) => { c.width = Math.ceil(w / C.u); c.height = Math.ceil(hh / C.u); c.style.width = c.width * C.u + "px"; c.style.height = c.height * C.u + "px"; });
  C.trk = build(geo, C.mode);
  const keep = C.train;
  C.train = train(3.5);
  if (keep) { C.train.laps = keep.laps; C.train.riders = keep.riders; }
  else board(C.train);
  C.train.onStop = (tr) => board(tr);
  drawTrack();
  drawMap();
  run();
}

const SK = { el: null, cv: null, ctx: null, u: 3, W: 0, H: 0, items: new Map(), raf: 0, last: 0, drawn: 0, t: 0 };

function hash(s) { let h = 7; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; }

function layer() {
  if (SK.el) return;
  SK.el = document.createElement("div");
  SK.el.className = "co-show";
  SK.el.setAttribute("aria-hidden", "true");
  SK.el.innerHTML = "<canvas></canvas>";
  document.getElementById("wins").before(SK.el);
  SK.cv = SK.el.querySelector("canvas");
  SK.ctx = SK.cv.getContext("2d");
}

function sizeSky() {
  const w = Math.ceil(SK.el.clientWidth / SK.u), h = Math.ceil(SK.el.clientHeight / SK.u);
  if (w !== SK.W || h !== SK.H) { SK.W = SK.cv.width = w; SK.H = SK.cv.height = h; SK.cv.style.width = w * SK.u + "px"; SK.cv.style.height = h * SK.u + "px"; }
}

function shows(p) {
  if (!p || !p.live) return;
  const off = p.t - Date.now();
  p.live.forEach((l) => { if (!SK.items.has(l.id)) SK.items.set(l.id, { ...l, a: l.t - off, b: l.until - off, seed: hash(l.id + l.nick), parts: [], next: 0, tag: null, told: false }); });
  kick();
}

function kick() {
  clearTimeout(SK.t);
  const now = Date.now();
  let soon = Infinity, any = false;
  SK.items.forEach((it, id) => {
    if (now > it.b) { if (it.tag) it.tag.remove(); SK.items.delete(id); }
    else if (now >= it.a) any = true;
    else soon = Math.min(soon, it.a);
  });
  if (any) { layer(); if (!SK.raf) { SK.last = performance.now(); SK.raf = requestAnimationFrame(sky); } }
  else if (soon < Infinity) SK.t = setTimeout(kick, soon - now + 30);
}

function tag(it, html, x, y) {
  if (!it.tag) { it.tag = document.createElement("span"); it.tag.className = `co-tag co-${it.kind}`; it.tag.innerHTML = html; SK.el.append(it.tag); }
  it.tag.style.transform = `translate(${Math.round(x)}px,${Math.round(y)}px)`;
}

function fireworks(it, now, dt) {
  const c = SK.ctx, W = SK.W, H = SK.H;
  if (now >= it.next && now < it.b - 1600) {
    it.next = now + 450 + Math.random() * 650;
    it.parts.push({ x: W * (0.12 + Math.random() * 0.76), y: H, vx: (Math.random() - 0.5) * 8, vy: -H * (0.95 + Math.random() * 0.3), fuse: 0.7 + Math.random() * 0.3, life: 0, rocket: 1 });
  }
  const out = [];
  it.parts.forEach((p) => {
    p.life += dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.rocket) {
      p.vy += H * 0.6 * dt;
      px(c, p.x, p.y, "#fff6c8"); px(c, p.x, p.y + 1, "#ff8c1a");
      if (p.life >= p.fuse) {
        const a = FIRE[Math.floor(Math.random() * FIRE.length)], b = FIRE[Math.floor(Math.random() * FIRE.length)], n = 44 + Math.floor(Math.random() * 14), sp = H * (0.24 + Math.random() * 0.14);
        out.push({ x: p.x, y: p.y, vx: 0, vy: 0, life: 0, max: 0.2, flash: 1 });
        for (let i = 0; i < n; i++) {
          const ang = (i / n) * Math.PI * 2 + Math.random() * 0.2, v = sp * (0.65 + Math.random() * 0.35);
          out.push({ x: p.x, y: p.y, ox: p.x, oy: p.y, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v, life: 0, max: 1.3 + Math.random() * 0.7, col: i % 2 ? a : b });
        }
      } else out.push(p);
      return;
    }
    if (p.flash) {
      if (p.life < p.max) { const r = 3 + (p.life / p.max) * 5; c.fillStyle = "#ffffff"; c.globalAlpha = 1 - p.life / p.max; c.beginPath(); c.arc(Math.round(p.x), Math.round(p.y), r, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1; out.push(p); }
      return;
    }
    p.vy += H * 0.12 * dt;
    p.vx *= 1 - 1.4 * dt;
    p.vy *= 1 - 1.4 * dt;
    if (p.life < p.max) {
      const k = p.life / p.max;
      c.globalAlpha = Math.max(0, 1 - k * k);
      if (k < 0.75 || Math.random() < 0.55) {
        line(c, p.ox, p.oy, p.x, p.y, p.col);
        c.fillStyle = k < 0.45 ? "#ffffff" : p.col;
        c.fillRect(Math.round(p.x), Math.round(p.y), k < 0.6 ? 2 : 1, k < 0.6 ? 2 : 1);
      }
      c.globalAlpha = 1;
      p.ox = p.x; p.oy = p.y;
      out.push(p);
    }
  });
  it.parts = out;
  tag(it, `Fireworks from <b>${esc(it.nick)}</b>`, (SK.el.clientWidth - (it.tag ? it.tag.offsetWidth : 180)) / 2, 10);
}

function balloonArt(c, x, y, seed) {
  const pair = [["#ffd23f", "#ff7eb6"], ["#4cc3ff", "#ffffff"], ["#8bd346", "#ffd23f"], ["#7d4cdb", "#ffc27a"], ["#1fb5a8", "#fff0a0"]][seed % 5];
  const inside = (i, j) => { const ry = j < 0 ? 8.5 : 8.5 - j * 0.35; return (i / 7.5) ** 2 + (j / ry) ** 2 <= 1; };
  for (let j = -9; j <= 9; j++) for (let i = -8; i <= 8; i++) {
    if (!inside(i, j)) continue;
    const edge = !inside(i - 1, j) || !inside(i + 1, j) || !inside(i, j - 1) || !inside(i, j + 1);
    px(c, x + i, y + j, edge ? OUTL : Math.floor((i + 8) / 3) % 2 ? pair[0] : pair[1]);
  }
  line(c, x - 3, y + 8, x - 2, y + 12, OUTL);
  line(c, x + 3, y + 8, x + 2, y + 12, OUTL);
  c.fillStyle = OUTL; c.fillRect(Math.round(x - 3), Math.round(y + 12), 7, 4);
  c.fillStyle = "#8d5524"; c.fillRect(Math.round(x - 2), Math.round(y + 13), 5, 2);
}

function balloon(it, now) {
  const W = SK.W, H = SK.H, k = (now - it.a) / (it.b - it.a), dir = it.seed % 2 ? 1 : -1;
  const x = dir > 0 ? -12 + (W + 24) * k : W + 12 - (W + 24) * k, y = H * 0.17 + Math.sin(now / 1700 + it.seed) * 2.5;
  balloonArt(SK.ctx, x, y, it.seed);
  tag(it, esc(it.nick), x * SK.u - 40, (y + 17) * SK.u);
}

function planeArt(c, x, y, dir) {
  const rows = ["....kk........", "...kwwk.......", "kkkwwwwkkkkkk.", "kyywwwwwwwwwwk", "kkkwwwwwwwkkk.", "......kk......"];
  const col = { k: OUTL, w: "#eef2f7", y: "#ffd23f" };
  rows.forEach((r, j) => [...r].forEach((ch, i) => { if (col[ch]) px(c, dir < 0 ? x + i : x - i, y + j, col[ch]); }));
}

function banner(it, now) {
  const W = SK.W, H = SK.H, pass = 15000, n = Math.floor((now - it.a) / pass), k = ((now - it.a) % pass) / pass, dir = n % 2 ? 1 : -1;
  tag(it, esc(it.text || "Hi from Gzowo"), -999, -999);
  const bw = Math.ceil(it.tag.offsetWidth / SK.u) + 2, total = 14 + 8 + bw, y = Math.round(H * 0.08 + Math.sin(now / 900) * 1.5);
  const head = dir < 0 ? W + 2 - (W + total + 4) * k : -2 + (W + total + 4) * k;
  planeArt(SK.ctx, head, y, dir);
  const ropeA = dir < 0 ? head + 14 : head - 14, ropeB = dir < 0 ? ropeA + 8 : ropeA - 8;
  line(SK.ctx, ropeA, y + 3, ropeB, y + 4, OUTL);
  const left = dir < 0 ? ropeB : ropeB - bw;
  it.tag.style.transform = `translate(${Math.round(left * SK.u)}px,${Math.round((y + 1) * SK.u)}px)`;
}

const DRAW = { fireworks, balloon, banner };
const TOLD = {
  fireworks: (n) => `${n} lit fireworks over the plot`,
  balloon: (n) => `${n} sent a balloon up over Gzowo`,
  banner: (n) => `A plane from ${n} is flying over`,
};

function sky(t) {
  SK.raf = 0;
  const now = Date.now(), act = [...SK.items.values()].filter((it) => now >= it.a && now <= it.b);
  if (!act.length) { if (SK.ctx) SK.ctx.clearRect(0, 0, SK.W, SK.H); kick(); return; }
  const fast = act.some((it) => it.kind !== "balloon");
  if (fast || t - SK.drawn > 120) {
    const dt = Math.min(0.12, (t - SK.last) / 1000 || 0.016);
    SK.last = SK.drawn = t;
    sizeSky();
    SK.ctx.clearRect(0, 0, SK.W, SK.H);
    act.forEach((it) => {
      if (!it.told) { it.told = true; toast(TOLD[it.kind](it.nick)); }
      if (DRAW[it.kind]) DRAW[it.kind](it, now, dt);
    });
    SK.items.forEach((it) => { if (it.tag && !act.includes(it)) { it.tag.remove(); it.tag = null; } });
  }
  SK.raf = requestAnimationFrame(sky);
}

function preview(cv, kind) {
  const c = cv.getContext("2d"), W = cv.width, H = cv.height;
  c.imageSmoothingEnabled = false;
  c.fillStyle = kind === "fireworks" ? "#1d2b6b" : SKY;
  c.fillRect(0, 0, W, H);
  if (kind === "fireworks") {
    [[14, 12, "#ffd23f", 8], [34, 10, "#ff7eb6", 7], [25, 22, "#4cc3ff", 5]].forEach(([x, y, col, r]) => {
      for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; px(c, x + Math.cos(a) * r, y + Math.sin(a) * r, col); px(c, x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55, "#ffffff"); }
    });
  } else if (kind === "balloon") balloonArt(c, 24, 12, 0);
  else {
    planeArt(c, 4, 8, -1);
    line(c, 18, 11, 23, 12, OUTL);
    c.fillStyle = OUTL; c.fillRect(23, 8, 23, 8);
    c.fillStyle = "#fff6c8"; c.fillRect(24, 9, 21, 6);
    c.fillStyle = "#2f6fde"; [26, 29, 32, 35, 38, 41].forEach((x) => c.fillRect(x, 11, 2, 2));
  }
}

export function createCoaster(world, opts = {}) {
  C.world = world;
  if (opts.riders) C.riders = opts.riders;
  const spots = world.querySelector(".spots");
  C.el = document.createElement("div");
  C.el.className = "spot spot-sky";
  C.el.setAttribute("aria-hidden", "true");
  C.el.innerHTML = `<canvas class="spr co-track"></canvas><canvas class="co-train"></canvas>`;
  C.tv = C.el.querySelector(".co-track");
  C.cv = C.el.querySelector(".co-train");
  spots.append(C.el);
  C.spot = document.createElement("button");
  C.spot.type = "button";
  C.spot.className = "spot spot-coaster";
  C.spot.dataset.place = "coaster";
  C.spot.dataset.coaster = "1";
  C.spot.setAttribute("aria-label", "Gzowo Coaster, ride from the front seat");
  C.spot.innerHTML = `<span class="spot-l"><b>Coaster</b><em>ride for ${C.price}</em></span>`;
  spots.append(C.spot);
  new IntersectionObserver((es) => { C.vis = es[es.length - 1].isIntersecting; run(); }, { rootMargin: "80px" }).observe(C.el);
  document.addEventListener("visibilitychange", run);
  addEventListener("gz:museum", (e) => { C.indoor = !!e.detail; run(); });
  addEventListener("gz:ride", () => startPov());
  addEventListener("gz:pulse", (e) => shows(e.detail));
  addEventListener("gz:preview", (e) => { if (e.detail && e.detail.canvas) preview(e.detail.canvas, e.detail.kind); });
  addEventListener("resize", () => { if (C.pov) sizePov(); });
  return { layout };
}

document.addEventListener("click", (e) => {
  if (e.target.closest("[data-co-ride]")) { ticket(e.target.closest("[data-co-ride]")); return; }
  const c = e.target.closest("[data-coaster]");
  if (!c) return;
  e.preventDefault();
  openTicket();
});

document.addEventListener("keydown", (e) => { if (e.key === "Escape" && C.pov) { e.stopPropagation(); stopPov(); } }, true);
