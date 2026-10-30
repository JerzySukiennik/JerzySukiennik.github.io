/* Gzowo Labs wall: spray paint on the brick wall of the map. Click it and the camera zooms into a Paint-style frame where the wall runs on
   forever to the right of where it starts and zooms in forever: the wheel or a pinch zooms, A and D walk, W and S climb, two fingers on a phone.
   Every 1000 units of wall is a panel with its own log of strokes, spray and eraser alike, replayed in order with seeded mist so every visitor
   sees the same paint. A stroke keeps the precision of the zoom it was drawn at, so whole pictures fit inside one brick. The view is drawn in
   tiles at many resolutions like a map. The whole wall comes over one stream, because the database speaks HTTP/1.1 and a browser only keeps six
   connections per host. Anyone can rub out anything with the eraser. Undo deletes only your own strokes and copies them to the trash first. */

import { icon } from "/assets/views.mjs";
import { wallArt, WALL_SM, WALL_SKY, WALL_GRASS } from "/assets/map.mjs";

const DB = "https://raft-e8d47-default-rtdb.firebaseio.com";
const LOCAL = ["localhost", "127.0.0.1", "0.0.0.0", "[::1]"];
const DEV = LOCAL.includes(location.hostname) || location.protocol === "file:";
const FAR = DEV ? "muralWallDev" : "muralWall", FAR_BIN = DEV ? "muralWallTrashDev" : "muralWallTrash";
const pathOf = (p) => FAR + "/" + p, binOf = (p) => FAR_BIN + "/" + p;
const MINE_KEY = "gl-mural-mine-" + (DEV ? "muralDev" : "mural");
const TOUCH = matchMedia("(pointer: coarse)").matches;
const RES_W = 2000, WX = 1000, WY = 323, RES_H = Math.round((RES_W * WY) / WX), SX = RES_W / WX;
const MAX_POINTS = 150, MAX_POSTS = 400, MAX_MINE = 600, TICK = 33, DRIP = 14, SPEED = 1100, LEAD = 110, BACK = 150;
const RB = 2, TS = 512, MAXZ = 2 ** 30, MINZ = 0.45, ART = 2.5, ARTY = 323 / 129;
const UNDO_KEY = /Mac|iPhone|iPad/.test(navigator.platform || "") ? "⌘Z" : "Ctrl+Z";
const PUSH = "-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz";
const HUES = [
  ["red", "#ffb8b8", "#fb6a6a", "#ff0000", "#8e0b0b"], ["orange", "#ffd5b8", "#fba66a", "#ff6a00", "#8e420b"], ["gold", "#ffebb8", "#fbd26a", "#ffb700", "#8e690b"],
  ["yellow", "#fffbb8", "#fbf46a", "#fff200", "#8e870b"], ["lime", "#deffb8", "#b7fb6a", "#88ff00", "#518e0b"], ["green", "#b8ffc9", "#6afb8e", "#00ff40", "#0b8e2c"],
  ["teal", "#b8fff3", "#6afbe3", "#00ffd4", "#0b8e78"], ["cyan", "#b8f1ff", "#6adefb", "#00ccff", "#0b748e"], ["blue", "#b8cfff", "#6a9afb", "#0055ff", "#0b378e"],
  ["indigo", "#c1b8ff", "#7d6afb", "#2200ff", "#1d0b8e"], ["purple", "#e7b8ff", "#cb6afb", "#aa00ff", "#620b8e"], ["pink", "#ffb8e5", "#fb6ac6", "#ff00a1", "#8e0b5e"],
];
const SHADES = ["pale ", "light ", "", "dark "];
const NEUTRALS = [["#ffffff", "white"], ["#d4d4d4", "light gray"], ["#a8a8a8", "gray"], ["#7c7c7c", "mid gray"], ["#505050", "dark gray"], ["#262626", "charcoal"],
  ["#000000", "black"], ["#ffe0c4", "peach"], ["#f0b98d", "tan"], ["#c98a5b", "caramel"], ["#8a5a36", "brown"], ["#4f3220", "dark brown"]];
const SIZES = [3, 6, 12, 22, 40];
const RUBS = [6, 12, 22, 40, 70];
const RAINBOW = ["#ff2d2d", "#ff8a00", "#ffe600", "#38e03b", "#00e5ff", "#2f6bff", "#b14bff"];

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

function rng(seed) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hsl(h, s, l) {
  const a = s * Math.min(l, 1 - l), k = (n) => (n + h / 30) % 12;
  const f = (n) => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))));
  return "#" + [f(0), f(8), f(4)].map((v) => v.toString(16).padStart(2, "0")).join("");
}
const RAINBOW_RUN = Array.from({ length: 24 }, (_, i) => hsl(i * 15, 0.95, 0.55));
const METAL = {
  chrome: [[0, "#f7faff"], [0.3, "#b9c4d4"], [0.46, "#4b5464"], [0.5, "#1e2430"], [0.54, "#e6edf8"], [0.76, "#9ba6b7"], [1, "#f3f6fb"]],
  gold: [[0, "#fff7d2"], [0.3, "#f0c357"], [0.46, "#8c5615"], [0.5, "#5b3308"], [0.54, "#ffeaa2"], [0.76, "#d2932b"], [1, "#fff3c2"]],
};
const SHINE = {};
Object.entries(METAL).forEach(([name, stops]) => {
  const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  SHINE[name] = Array.from({ length: 32 }, (_, i) => {
    const t = i / 31, j = Math.max(1, stops.findIndex(([at]) => at >= t)), [a0, c0] = stops[j - 1], [a1, c1] = stops[j], u = (t - a0) / (a1 - a0 || 1);
    return "#" + rgb(c0).map((v, n) => Math.round(v + (rgb(c1)[n] - v) * u).toString(16).padStart(2, "0")).join("");
  });
});
const metalBg = (name) => "linear-gradient(180deg," + METAL[name].map(([at, c]) => `${c} ${at * 100}%`).join(",") + ")";

const stampCache = new Map();
function stamps(color, lw) {
  const key = color + lw;
  if (stampCache.has(key)) { const hit = stampCache.get(key); stampCache.delete(key); stampCache.set(key, hit); return hit; }
  const r = rng(hash(key)), core = lw * 0.6, D = Math.ceil(lw * 3) + 8, m = D / 2;
  const [cr, cg, cb] = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));
  const list = [];
  for (let v = 0; v < 6; v++) {
    const cv = document.createElement("canvas");
    cv.width = cv.height = D;
    const x = cv.getContext("2d");
    const g = x.createRadialGradient(m, m, 0, m, m, core);
    g.addColorStop(0, `rgba(${cr},${cg},${cb},1)`);
    g.addColorStop(0.45, `rgba(${cr},${cg},${cb},0.95)`);
    g.addColorStop(0.75, `rgba(${cr},${cg},${cb},0.55)`);
    g.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
    x.fillStyle = g;
    x.fillRect(0, 0, D, D);
    x.fillStyle = color;
    const n = Math.round(14 + lw * 1.1);
    for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2, d = core * (0.75 + Math.abs(r() + r() + r() - 1.5) * 1.05), s = 1.1 + r() * Math.max(1.2, lw * 0.045);
      x.globalAlpha = 0.35 + r() * 0.55;
      x.beginPath();
      x.arc(m + Math.cos(a) * d, m + Math.sin(a) * d, s / 2, 0, Math.PI * 2);
      x.fill();
    }
    list.push(cv);
  }
  stampCache.set(key, list);
  if (stampCache.size > 90) stampCache.delete(stampCache.keys().next().value);
  return list;
}
const stampSize = (lw) => (Number.isInteger(lw) && lw >= 4 && lw <= 80 ? lw : Math.min(64, Math.max(4, 2 ** (Math.ceil(Math.log2(lw) * 3) / 3))));

function drip(c, x, y, lw, len, color, r) {
  const w = Math.max(1.6, lw * 0.16), n = Math.max(3, Math.min(60, Math.round(len / (w * 1.6)))), left = [], right = [];
  let px = x;
  for (let i = 0; i <= n; i++) {
    const t = i / n, half = (w * (1.3 - 0.5 * t)) / 2;
    if (i) px += (r() - 0.5) * w * 0.4;
    left.push([px - half, y + len * t]);
    right.push([px + half, y + len * t]);
  }
  c.globalCompositeOperation = "source-over";
  c.globalAlpha = 0.95;
  c.fillStyle = color;
  c.beginPath();
  left.forEach(([a, b], i) => (i ? c.lineTo(a, b) : c.moveTo(a, b)));
  right.reverse().forEach(([a, b]) => c.lineTo(a, b));
  c.closePath();
  c.fill();
  c.beginPath();
  c.arc(px, y + len, w * 0.62, 0, Math.PI * 2);
  c.fill();
}

const PROFILE = [[0, 1], [0.45, 0.95], [0.75, 0.55], [1, 0]];
const profile = (t) => { if (t <= 0) return 1; if (t >= 1) return 0; let i = 1; while (PROFILE[i][0] < t) i++; const [a0, v0] = PROFILE[i - 1], [a1, v1] = PROFILE[i]; return v0 + ((v1 - v0) * (t - a0)) / (a1 - a0); };
function bigStamp(c, x, y, R, color, W, H) {
  const tx = W / 2 - x, ty = H / 2 - y, d = Math.hypot(tx, ty) || 1, ux = tx / d, uy = ty / d, half = Math.hypot(W, H) / 2, d0 = d - half, d1 = d + half;
  if (d0 > R) return;
  const [cr, cg, cb] = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));
  const g = c.createLinearGradient(W / 2 - ux * half, H / 2 - uy * half, W / 2 + ux * half, H / 2 + uy * half);
  for (let i = 0; i <= 8; i++) g.addColorStop(i / 8, `rgba(${cr},${cg},${cb},${profile((d0 + ((d1 - d0) * i) / 8) / R).toFixed(3)})`);
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
}

function sprayer(op, c, v) {
  const r = rng(hash(op.id)), lw = op.w * v.r, step = Math.max(0.5, lw * 0.2), W = c.canvas.width, H = c.canvas.height;
  const q = stampSize(lw), sc = lw / q, metal = SHINE[op.c];
  const tint = (run, y) => (op.c === "rainbow" ? RAINBOW_RUN[Math.floor(run / (lw * 1.5)) % RAINBOW_RUN.length]
    : metal ? metal[Math.round(clamp((y / v.r + v.y0) / WY + Math.sin(run / (lw * 3)) * 0.05, 0, 1) * 31)] : op.c);
  const drips = [];
  let px = null, py = null, left = step, run = 0, held = 0, hx = 0, hy = 0;
  const stamp = (x, y) => {
    const pick = r(), jit = lw * (0.08 + Math.min(held, 45) * 0.005), ox = (r() - 0.5) * jit, oy = (r() - 0.5) * jit;
    const shine = metal && r() < 0.07 ? [r(), r(), r()] : null, out = lw * 1.6 + 2;
    if (x + out < 0 || x - out > W || y + out < 0 || y - out > H) return;
    if (lw > 1500) bigStamp(c, x + ox, y + oy, lw * 0.6, tint(run, y), W, H);
    else {
      const set = stamps(tint(run, y), q), img = set[Math.floor(pick * set.length)], h = (img.width / 2) * sc;
      c.drawImage(img, x - h + ox, y - h + oy, img.width * sc, img.height * sc);
    }
    if (shine) {
      const gx = x + (shine[0] - 0.5) * lw * 0.8, gy = y + (shine[1] - 0.5) * lw * 0.8, s = Math.max(3, lw * (0.25 + shine[2] * 0.3)), a = c.globalAlpha, t = Math.max(1.2, lw * 0.04);
      c.globalAlpha = 0.95;
      c.fillStyle = "#ffffff";
      c.fillRect(gx - s, gy - t / 2, s * 2, t);
      c.fillRect(gx - t / 2, gy - s, t, s * 2);
      c.beginPath(); c.arc(gx, gy, Math.max(1, s * 0.22), 0, Math.PI * 2); c.fill();
      c.globalAlpha = a;
    }
  };
  return {
    add(x, y) {
      c.globalCompositeOperation = "source-over";
      c.globalAlpha = 0.5;
      if (px === null) {
        stamp(x, y); stamp(x, y);
        px = hx = x; py = hy = y; held = 1;
        return;
      }
      const dx = x - px, dy = y - py, len = Math.hypot(dx, dy);
      if (Math.hypot(x - hx, y - hy) <= lw * 0.25) held++;
      else { if (held >= DRIP) drips.push([hx, hy, held, tint(run, hy)]); held = 1; hx = x; hy = y; }
      c.globalAlpha = held > 3 ? 0.32 : 0.5;
      if (len < 0.5 * Math.max(1, lw / 6)) stamp(x, y);
      else {
        let t = left;
        for (; t <= len; t += step) stamp(px + (dx * t) / len, py + (dy * t) / len);
        left = t - len; run += len; px = x; py = y;
      }
    },
    end() {
      if (held >= DRIP) drips.push([hx, hy, held, tint(run, hy)]);
      drips.forEach(([x, y, n, col]) => {
        const len = lw * Math.min(5, 0.6 + (n - DRIP) * 0.07) * (0.8 + r() * 0.4);
        const a = r(), b = r() < 0.5, e = r(), f = r();
        if (lw > 1500 || x + lw * 2 < 0 || x - lw * 2 > W || y + len + lw < 0 || y - lw > H) return;
        drip(c, x + (a - 0.5) * lw * 0.3, y + lw * 0.15, lw, len, col, r);
        if (n > 40) drip(c, x + (b ? -1 : 1) * lw * (0.22 + e * 0.1), y + lw * 0.1, lw * 0.8, len * (0.4 + f * 0.25), col, r);
      });
      drips.length = 0;
    },
  };
}

function rubber(op, c, v) {
  const lw = Math.max(0.5, op.w * v.r), W = c.canvas.width, H = c.canvas.height;
  let px = null, py = null;
  const seg = (ax, ay, bx, by, qx, qy) => { const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy, t = l ? clamp(((qx - ax) * dx + (qy - ay) * dy) / l, 0, 1) : 0; return Math.hypot(ax + dx * t - qx, ay + dy * t - qy); };
  return {
    add(x, y) {
      if (lw > 1500) {
        const ax = px === null ? x : px, ay = px === null ? y : py, corners = [[0, 0], [W, 0], [0, H], [W, H]].map(([qx, qy]) => seg(ax, ay, x, y, qx, qy));
        if (corners.every((dd) => dd < lw / 2)) c.clearRect(0, 0, W, H);
        px = x; py = y;
        return;
      }
      c.globalCompositeOperation = "destination-out";
      c.globalAlpha = 1;
      c.fillStyle = c.strokeStyle = "#000";
      c.lineCap = "round"; c.lineJoin = "round"; c.lineWidth = lw;
      if (px === null) { c.beginPath(); c.arc(x, y, lw / 2, 0, Math.PI * 2); c.fill(); }
      else if (x !== px || y !== py) { c.beginPath(); c.moveTo(px, py); c.lineTo(x, y); c.stroke(); }
      px = x; py = y;
    },
    end() {},
  };
}

const painterFor = (op, c, v) => (op.k === "e" ? rubber : sprayer)(op, c, v);
const reset = (c) => { c.globalCompositeOperation = "source-over"; c.globalAlpha = 1; };
const at = (op, i, v) => [(op.p * WX + op.d[i] - v.x0) * v.r, (op.d[i + 1] - v.y0) * v.r];

function paintOp(op, c, v) {
  if (op.w * v.r < 0.25) return;
  const p = painterFor(op, c, v);
  for (let i = 0; i < op.d.length; i += 2) p.add(...at(op, i, v));
  p.end();
  reset(c);
}
const older = (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
const hits = (op, x0, y0, x1, y1) => op.bb[0] < x1 && op.bb[2] > x0 && op.bb[1] < y1 && op.bb[3] > y0;

function frame(w, h) {
  const k = Math.min((h * 0.56) / WY, w / 460), a = (WX * k) / 400;
  return { k, top: Math.round(((h - WY * k) * 0.45) / a) * a, left: LEAD * k };
}

export function createMural(el, opts) {
  const home = el.querySelector("canvas"), next = document.createElement("canvas");
  home.width = next.width = RES_W; home.height = next.height = RES_H;
  el.append(next);
  const panels = new Map(), tiles = new Map(), lod = new Map(), keys = { a: 0, d: 0, w: 0, s: 0, q: 0, e: 0 }, touches = new Map();
  const mine = {}, minePanel = {}, order = [], redo = [];
  let color = "#ff0000", size = 2, erasing = false, rainbow = false, posted = 0, lastT = 0, lastR = [], offlineSaid = false;
  let live = null, client = null, lastSample = 0, tick = 0, gesture = null, active = false, chrome = null, view = null, layer = null;
  let pumpRaf = 0, lodRaf = 0, flashTimer = 0, made = 0, said = "", walkRaf = 0, walkT = 0, stream = null;
  let W = 1, H = 1, k0 = 1, faceTop = 0, cx = 0, cy = 0, Z = 1, ytop = 0, ybot = 1, level = 0, shown = new Set(), pinch = null;
  [home, next].forEach((cv, p) => tiles.set(p, { p, cv, c: cv.getContext("2d"), job: null, last: "", dirty: false }));

  try { rainbow = localStorage.getItem("gl-rainbow") === "1"; } catch (e) {}
  try {
    (JSON.parse(localStorage.getItem(MINE_KEY)) || []).forEach((m) => {
      if (Array.isArray(m) && typeof m[0] === "string" && !(m[0] in mine)) { mine[m[0]] = m[1] || m[0]; minePanel[m[0]] = Number.isInteger(m[2]) ? m[2] : 0; order.push(m[0]); }
    });
  } catch (e) {}

  const saveMine = () => { try { localStorage.setItem(MINE_KEY, JSON.stringify(order.slice(-MAX_MINE).map((id) => [id, mine[id], minePanel[id]]))); } catch (e) {} };
  const remember = (id, g, p) => { if (!(id in mine)) order.push(id); mine[id] = g; minePanel[id] = p; saveMine(); };
  const forget = (id) => { if (!(id in mine)) return; delete mine[id]; delete minePanel[id]; const i = order.indexOf(id); if (i !== -1) order.splice(i, 1); saveMine(); };

  function pushId() {
    let now = Date.now(), i;
    const dup = now === lastT, t = [];
    lastT = now;
    for (i = 7; i >= 0; i--) { t[i] = PUSH.charAt(now % 64); now = Math.floor(now / 64); }
    let id = t.join("");
    if (!dup) for (i = 0; i < 12; i++) lastR[i] = Math.floor(Math.random() * 64);
    else { for (i = 11; i >= 0 && lastR[i] === 63; i--) lastR[i] = 0; if (i >= 0) lastR[i]++; }
    for (i = 0; i < 12; i++) id += PUSH.charAt(lastR[i]);
    return id;
  }
  const newGroup = () => "g" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  function flash(msg) {
    let f = document.querySelector(".wall-flash");
    if (!f) { f = document.createElement("div"); f.className = "wall-flash"; f.setAttribute("role", "status"); document.body.appendChild(f); }
    f.textContent = msg; f.hidden = false;
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => { f.hidden = true; }, 2600);
  }

  function panel(p) {
    let P = panels.get(p);
    if (!P) { P = { p, ops: [], seen: {} }; panels.set(p, P); }
    return P;
  }
  function opsIn(x0, y0, x1, y1) {
    const list = [];
    for (let p = Math.max(0, Math.floor(x0 / WX) - 1); p <= Math.floor(x1 / WX) + 1; p++) {
      const P = panels.get(p);
      if (P) for (const op of P.ops) if (hits(op, x0, y0, x1, y1)) list.push(op);
    }
    return list.sort(older);
  }

  const mapView = (t) => ({ x0: t.p * WX, y0: 0, r: SX });
  const nearMap = (op, f) => tiles.forEach((t) => { if (hits(op, t.p * WX, 0, (t.p + 1) * WX, WY)) f(t); });

  function redraw(t) {
    if (t.job) { t.dirty = true; return; }
    const back = document.createElement("canvas");
    back.width = RES_W; back.height = RES_H;
    t.job = { list: opsIn(t.p * WX, 0, (t.p + 1) * WX, WY), i: 0, back, c: back.getContext("2d") };
    t.dirty = false;
    if (!pumpRaf) pumpRaf = requestAnimationFrame(pump);
  }

  function pump() {
    pumpRaf = -1;
    const t0 = performance.now();
    let busy = false;
    for (const t of tiles.values()) {
      const j = t.job;
      if (!j) continue;
      while (j.i < j.list.length && performance.now() - t0 < 6) paintOp(j.list[j.i++], j.c, mapView(t));
      if (j.i < j.list.length) { busy = true; break; }
      t.job = null;
      t.c.globalCompositeOperation = "copy";
      t.c.drawImage(j.back, 0, 0);
      reset(t.c);
      t.last = j.list.length ? j.list[j.list.length - 1].id : "";
      if (t.dirty) redraw(t);
    }
    pumpRaf = busy || [...tiles.values()].some((t) => t.job) ? requestAnimationFrame(pump) : 0;
  }

  const span = (L) => TS / (RB * 2 ** L);
  function lodTile(L, tx, ty) {
    const key = L + ":" + tx + ":" + ty;
    let t = lod.get(key);
    if (t) { lod.delete(key); lod.set(key, t); return t; }
    const el = document.createElement("div"), bg = document.createElement("canvas"), cv = document.createElement("canvas");
    el.className = "wv-l";
    bg.width = bg.height = cv.width = cv.height = TS;
    el.append(bg, cv);
    const S = span(L);
    t = { key, L, el, bg, cv, c: cv.getContext("2d"), v: { x0: tx * S, y0: ty * S, r: RB * 2 ** L }, x1: (tx + 1) * S, y1: (ty + 1) * S, ready: false, job: null, last: "", dirty: false };
    backdrop(bg.getContext("2d"), t.v, t.x1, t.y1);
    lod.set(key, t);
    for (const [k, old] of lod) {
      if (lod.size <= 160) break;
      if (shown.has(old)) continue;
      old.el.remove();
      lod.delete(k);
    }
    return t;
  }

  function backdrop(c, v, x1, y1) {
    const top = -(WALL_SM + 13) * ARTY, bot = (134 + WALL_SM) * ARTY;
    c.imageSmoothingEnabled = false;
    c.fillStyle = WALL_SKY;
    c.fillRect(0, 0, TS, TS);
    if (y1 > bot) { c.fillStyle = WALL_GRASS; const y = Math.max(0, (bot - v.y0) * v.r); c.fillRect(0, y, TS, TS - y); }
    const uy0 = Math.max(v.y0, top), uy1 = Math.min(y1, bot);
    if (uy1 <= uy0) return;
    for (let p = Math.floor(v.x0 / WX); p <= Math.floor((x1 - 1e-9) / WX); p++) {
      const ux0 = Math.max(v.x0, p * WX), ux1 = Math.min(x1, (p + 1) * WX);
      if (ux1 <= ux0) continue;
      const art = wallArt(Math.max(-2, p));
      c.drawImage(art, (ux0 - p * WX) / ART, (uy0 - top) / ARTY, (ux1 - ux0) / ART, (uy1 - uy0) / ARTY,
        (ux0 - v.x0) * v.r, (uy0 - v.y0) * v.r, (ux1 - ux0) * v.r, (uy1 - uy0) * v.r);
    }
  }

  function render(t) {
    if (t.job) { t.dirty = true; return; }
    const back = document.createElement("canvas");
    back.width = back.height = TS;
    const c = back.getContext("2d");
    t.job = { list: opsIn(t.v.x0, t.v.y0, t.x1, t.y1), i: 0, back, c };
    t.dirty = false;
    lodLoop();
  }

  function lodLoop() { if (!lodRaf) lodRaf = requestAnimationFrame(lodPump); }
  function lodPump() {
    lodRaf = 0;
    const t0 = performance.now(), queue = [...lod.values()].filter((t) => t.job && shown.has(t));
    queue.sort((a, b) => b.L - a.L);
    for (const t of queue) {
      const j = t.job;
      while (j.i < j.list.length && performance.now() - t0 < 8) paintOp(j.list[j.i++], j.c, t.v);
      if (j.i < j.list.length) break;
      t.job = null;
      t.cv.replaceWith(j.back);
      t.cv = j.back;
      t.c = j.c;
      t.ready = true;
      t.last = j.list.length ? j.list[j.list.length - 1].id : "";
      if (t.dirty) render(t);
      else replayLive(t);
      present();
    }
    if ([...lod.values()].some((t) => t.job && shown.has(t))) lodLoop();
  }

  function present() {
    if (!active) return;
    const ppu = k0 * Z, dpr = Math.min(2, devicePixelRatio || 1);
    level = clamp(Math.ceil(Math.log2((ppu * dpr) / RB)), -3, 40);
    const vx0 = cx - W / 2 / ppu, vx1 = cx + W / 2 / ppu, vy0 = cy - H / 2 / ppu, vy1 = cy + H / 2 / ppu, now = new Set();
    for (let L = level; L >= level - 4; L--) {
      const S = span(L);
      for (let tx = Math.floor(vx0 / S); tx <= Math.floor(vx1 / S); tx++) {
        for (let ty = Math.floor(vy0 / S); ty <= Math.floor(vy1 / S); ty++) {
          if (L < level && !lod.has(L + ":" + tx + ":" + ty)) continue;
          const t = lodTile(L, tx, ty);
          if (L === level && !t.ready && !t.job) { now.add(t); render(t); }
          if (t.ready || L === level) now.add(t);
        }
      }
    }
    shown.forEach((t) => { if (!now.has(t)) t.el.remove(); });
    shown = now;
    now.forEach((t) => {
      if (!t.ready) return;
      const s = (span(t.L) * ppu) / TS;
      t.el.style.zIndex = 50 + t.L - level;
      t.el.style.transform = `translate3d(${((t.v.x0 - cx) * ppu + W / 2).toFixed(2)}px,${((t.v.y0 - cy) * ppu + H / 2).toFixed(2)}px,0) scale(${s.toFixed(6)})`;
      if (t.el.parentNode !== layer) layer.append(t.el);
    });
    where();
  }

  function replayLive(t) {
    if (!live || !t.ready || t.L !== level) return;
    const pt = painterFor(live, t.c, t.v);
    for (let i = 0; i < live.d.length; i += 2) pt.add(...at(live, i, t.v));
    pt.n = live.d.length;
    reset(t.c);
    live.ps.set(t, pt);
  }

  function touchOp(op, painted) {
    nearMap(op, (t) => {
      if (t.job) { t.dirty = true; return; }
      if (op.id > t.last) { if (!painted) paintOp(op, t.c, mapView(t)); t.last = op.id; }
      else if (!painted) redraw(t);
    });
    lod.forEach((t) => {
      if (!hits(op, t.v.x0, t.v.y0, t.x1, t.y1)) return;
      if (t.job) { t.dirty = true; return; }
      if (!t.ready) return;
      if (painted && op.drawn && op.drawn.has(t)) { if (op.id > t.last) t.last = op.id; return; }
      if (op.id > t.last && !painted) { paintOp(op, t.c, t.v); t.last = op.id; return; }
      if (shown.has(t)) render(t);
      else { t.el.remove(); lod.delete(t.key); }
    });
  }

  function insert(op, painted) {
    const list = panel(op.p).ops;
    if (!list.length || op.id > list[list.length - 1].id) list.push(op);
    else { let i = list.length; while (i > 0 && list[i - 1].id > op.id) i--; list.splice(i, 0, op); }
    touchOp(op, painted);
    where();
  }

  function drop(p, id) {
    const P = panels.get(p), i = P ? P.ops.findIndex((o) => o.id === id) : -1;
    if (i === -1) return null;
    const it = P.ops.splice(i, 1)[0];
    nearMap(it, redraw);
    lod.forEach((t) => {
      if (!hits(it, t.v.x0, t.v.y0, t.x1, t.y1)) return;
      if (shown.has(t)) render(t);
      else { t.el.remove(); lod.delete(t.key); }
    });
    where();
    return it;
  }
  const find = (id, p) => { const P = panels.get(p); return (P && P.ops.find((o) => o.id === id)) || null; };

  function bounds(op) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let i = 0; i < op.d.length; i += 2) { x0 = Math.min(x0, op.d[i]); x1 = Math.max(x1, op.d[i]); y0 = Math.min(y0, op.d[i + 1]); y1 = Math.max(y1, op.d[i + 1]); }
    const m = op.w * 1.7, b = op.p * WX;
    op.bb = [b + x0 - m, y0 - m, b + x1 + m, y1 + m + op.w * 6.5];
    return op;
  }

  function parse(id, v, p) {
    if (!v || typeof v !== "object" || (v.k !== "d" && v.k !== "e")) return null;
    if (v.k === "d" && (typeof v.c !== "string" || !(v.c === "rainbow" || v.c in METAL || /^#[0-9a-f]{6}$/.test(v.c)))) return null;
    if (typeof v.d !== "string" || !/^[0-9,]+$/.test(v.d)) return null;
    const pts = v.d.split(",").map(Number);
    if (pts.length < 2 || pts.length % 2) return null;
    const z = Number.isInteger(v.z) && v.z > 0 && v.z <= 30 ? v.z : 0, sc = 2 ** -z;
    let ox = 0, oy = 0;
    if (z) {
      const o = typeof v.o === "string" && v.o.match(/^([0-9]+),([0-9]+)$/);
      if (!o) return null;
      ox = +o[1]; oy = +o[2];
    }
    const d = pts.map((n, i) => (n + (i % 2 ? oy : ox)) * sc);
    return bounds({ id, p, k: v.k, d, raw: v.d, c: v.k === "d" ? v.c : undefined, wr: clamp(v.w || 12, 3, 200), w: clamp(v.w || 12, 3, 200) * sc, z, o: z ? v.o : undefined });
  }

  function add(P, id, v) {
    if (P.seen[id] || !v) return;
    P.seen[id] = true;
    const it = parse(id, v, P.p);
    if (it) insert(it, false);
  }
  function gone(P, id) { P.seen[id] = true; if (drop(P.p, id)) sync(); }

  function loadAll(P, data) {
    Object.keys(data || {}).forEach((id) => {
      if (P.seen[id]) return;
      P.seen[id] = true;
      const it = parse(id, data[id], P.p);
      if (it) P.ops.push(it);
    });
    P.ops.sort(older);
    tiles.forEach((t) => { if (Math.abs(t.p - P.p) <= 1) redraw(t); });
    lod.forEach((t) => { if (t.x1 >= P.p * WX - 100 && t.v.x0 <= (P.p + 1) * WX + 100) { if (shown.has(t)) render(t); else { t.el.remove(); lod.delete(t.key); } } });
    sync();
  }

  const message = (e) => { try { return JSON.parse(e.data || "null"); } catch (err) { return null; } };
  const num = (k) => (/^(0|[1-9][0-9]*)$/.test(k) ? +k : -1);
  function ingest(path, data) {
    const parts = path.split("/").filter(Boolean);
    if (!parts.length) { Object.keys(data || {}).forEach((k) => { if (num(k) >= 0 && data[k]) loadAll(panel(num(k)), data[k]); }); return; }
    const p = num(parts[0]);
    if (p < 0) return;
    const P = panel(p);
    if (parts.length === 1) { if (data) loadAll(P, data); return; }
    if (parts.length === 2) { if (data === null) gone(P, parts[1]); else add(P, parts[1], data); }
  }

  function connect() {
    const q = DB + "/" + FAR + ".json";
    if (typeof EventSource === "undefined") { fetch(q).then((r) => r.json()).then((d) => ingest("/", d)).catch(() => {}); return; }
    const src = (stream = new EventSource(q));
    src.addEventListener("put", (e) => { const msg = message(e); if (msg && typeof msg.path === "string") ingest(msg.path, msg.data); });
    src.addEventListener("patch", (e) => {
      const msg = message(e);
      if (!msg || typeof msg.path !== "string" || !msg.data) return;
      Object.keys(msg.data).forEach((k) => ingest(msg.path.replace(/\/$/, "") + "/" + k, msg.data[k]));
    });
    src.onerror = () => {};
  }

  const body = (it) => { const b = { k: it.k, d: it.raw, w: it.wr }; if (it.k === "d") b.c = it.c; if (it.z) { b.z = it.z; b.o = it.o; } return b; };

  function pack(it) {
    const s = 2 ** it.z, ints = it.d.map((n) => Math.max(0, Math.round(n * s)));
    let ox = 0, oy = 0;
    if (it.z) {
      ox = Infinity; oy = Infinity;
      for (let i = 0; i < ints.length; i += 2) { ox = Math.min(ox, ints[i]); oy = Math.min(oy, ints[i + 1]); }
      it.o = ox + "," + oy;
    }
    it.raw = ints.map((n, i) => n - (i % 2 ? oy : ox)).join(",");
    it.wr = clamp(Math.round(it.w * s), 3, 200);
  }

  function send(it) {
    pack(it);
    remember(it.id, it.g || it.id, it.p);
    posted++;
    it.saved = fetch(DB + "/" + pathOf(it.p) + "/" + it.id + ".json", { method: "PUT", body: JSON.stringify({ ...body(it), t: { ".sv": "timestamp" } }) })
      .then((r) => { if (!r.ok) throw r.status; })
      .catch(() => {
        it.local = true;
        if (!offlineSaid) { offlineSaid = true; flash("THE WALL IS OFFLINE, YOUR PAINT WAS NOT SAVED"); }
      });
  }

  const copyOf = (it) => ({ k: it.k, d: it.d.slice(), c: it.c, w: it.w, z: it.z, p: it.p });

  function remove(it) {
    const id = it.id, g = mine[id];
    drop(it.p, id);
    forget(id);
    if (it.local) return;
    const patch = {};
    patch[pathOf(it.p) + "/" + id] = null;
    patch[binOf(it.p) + "/" + id] = { ...body(it), e: { ".sv": "timestamp" } };
    (it.saved || Promise.resolve())
      .then(() => { if (it.local) return { ok: true }; return fetch(DB + "/.json", { method: "PATCH", body: JSON.stringify(patch) }); })
      .then((r) => { if (!r.ok) throw r.status; })
      .catch(() => { if (g) remember(id, g, it.p); insert(it, false); sync(); flash("COULD NOT UNDO THAT, TRY AGAIN"); });
  }

  function mineHere() {
    for (const P of panels.values()) if (P.ops.some((it) => it.id in mine)) return true;
    return false;
  }

  function undo() {
    if (live) return;
    let last = null;
    for (let i = order.length - 1; i >= 0 && !last; i--) last = find(order[i], minePanel[order[i]] || 0);
    if (!last) { flash("NOTHING OF YOURS LEFT TO UNDO"); return; }
    const g = mine[last.id], batch = [];
    panels.forEach((P) => P.ops.forEach((it) => { if (mine[it.id] === g) batch.push(it); }));
    redo.push(batch.map(copyOf));
    batch.forEach((it) => remove(it));
    sync();
  }

  function redoLast() {
    if (live) return;
    const group = redo.pop();
    if (!group) return;
    const g = newGroup();
    group.forEach((c) => {
      if (posted >= MAX_POSTS) return;
      const it = bounds({ ...c, d: c.d.slice(), id: pushId(), g });
      panel(it.p).seen[it.id] = true;
      insert(it, false);
      send(it);
    });
    sync();
  }

  function wallPoint(x, y) {
    const r = view.getBoundingClientRect(), ppu = k0 * Z;
    return [cx + (x - r.left - W / 2) / ppu, cy + (y - r.top - H / 2) / ppu];
  }

  function put(x, y) {
    live.d.push(x, y);
    const i = live.d.length - 2;
    shown.forEach((t) => { if (t.ready && t.L === level && !live.ps.has(t)) replayLive(t); });
    live.ps.forEach((pt, t) => {
      if (pt.n === live.d.length) return;
      pt.add(...at(live, i, t.v));
      pt.n = live.d.length;
      reset(t.c);
    });
    lastSample = performance.now();
  }

  function open(p, x, y, g) {
    const zl = Math.max(0, Math.ceil(Math.log2(Z) - 1e-9));
    live = { id: pushId(), p, k: erasing ? "e" : "d", c: erasing ? undefined : color, w: (erasing ? RUBS[size] : SIZES[size]) / Z, z: zl, d: [], g, ps: new Map() };
    panel(p).seen[live.id] = true;
    put(x, y);
  }

  function close() {
    const op = live;
    live = null;
    op.ps.forEach((pt, t) => { pt.end(); reset(t.c); });
    op.drawn = new Set(op.ps.keys());
    delete op.ps;
    bounds(op);
    insert(op, true);
    send(op);
    if (op.k === "d") made++;
  }

  function abort() {
    const op = live;
    live = null;
    op.ps.forEach((_, t) => render(t));
  }

  function sample(ux, uy) {
    const x = live.p ? ux - live.p * WX : Math.max(0, ux), y = clamp(uy, 0, WY);
    if (x < 0 || x > WX) {
      const n = live.d.length, px = live.d[n - 2], py = live.d[n - 1], edge = x < 0 ? 0 : WX;
      const ey = py + ((y - py) * (edge - px)) / (x - px);
      if (px !== edge) put(edge, ey);
      const g = live.g, np = live.p + (x < 0 ? -1 : 1);
      close();
      open(np, x < 0 ? WX : 0, ey, g);
      sample(ux, uy);
      return;
    }
    put(x, y);
    if (live.d.length >= MAX_POINTS * 2) { const g = live.g, p = live.p; close(); open(p, x, y, g); }
  }

  function step() {
    if (!live || !client) return;
    const [ux, uy] = wallPoint(...client), n = live.d.length;
    if (Math.hypot(ux - live.p * WX - live.d[n - 2], clamp(uy, 0, WY) - live.d[n - 1]) >= 2 / Z) sample(ux, uy);
  }

  function hold() {
    tick = 0;
    if (!live) return;
    if (live.k === "d" && client && performance.now() - lastSample >= TICK) { const [ux, uy] = wallPoint(...client); sample(ux, uy); }
    tick = requestAnimationFrame(hold);
  }

  function clampView() {
    Z = clamp(Z, MINZ, MAXZ);
    const ppu = k0 * Z, hw = W / 2 / ppu, hh = H / 2 / ppu;
    cx = Math.max(cx, hw - BACK);
    cy = ybot - ytop <= 2 * hh ? (ytop + ybot) / 2 : clamp(cy, ytop + hh, ybot - hh);
  }

  function zoomAt(f, sx, sy) {
    const r = view.getBoundingClientRect(), [ux, uy] = wallPoint(sx, sy);
    Z = clamp(Z * f, MINZ, MAXZ);
    const ppu = k0 * Z;
    cx = ux - (sx - r.left - W / 2) / ppu;
    cy = uy - (sy - r.top - H / 2) / ppu;
    clampView();
    present();
    cursor();
  }

  function place() {
    const r = view.parentNode.getBoundingClientRect(), f = frame(r.width, r.height);
    W = r.width; H = r.height; k0 = f.k; faceTop = f.top;
    ytop = -faceTop / k0; ybot = ytop + H / k0;
    clampView();
    present();
    cursor();
  }

  function stride(t) {
    const dt = Math.min(0.05, Math.max(0, (t - walkT) / 1000)), dx = keys.d - keys.a, dy = keys.s - keys.w, dz = keys.e - keys.q;
    walkT = t;
    if (!dx && !dy && !dz) { walkRaf = 0; return; }
    const r = view.getBoundingClientRect();
    if (dz) zoomAt(Math.pow(2.6, dz * dt), r.left + W / 2, r.top + H / 2);
    cx += (dx * SPEED * dt) / Z;
    cy += (dy * SPEED * 0.6 * dt) / Z;
    clampView();
    present();
    step();
    walkRaf = requestAnimationFrame(stride);
  }
  function walk() {
    if (walkRaf || !active) return;
    walkT = performance.now();
    walkRaf = requestAnimationFrame(stride);
  }

  function cursor() {
    if (!view) return;
    const d = Math.round(clamp((erasing ? RUBS : SIZES)[size] * k0, 6, 64)), s = d + 4, c = s / 2;
    let svg;
    if (erasing) {
      svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + s + '" height="' + s + '"><circle cx="' + c + '" cy="' + c + '" r="' + d / 2 + '" fill="#fff" fill-opacity=".45" stroke="#000"/><circle cx="' + c + '" cy="' + c + '" r="' + (d / 2 + 1) + '" fill="none" stroke="#fff"/></svg>';
    } else {
      const stops = color === "rainbow" ? RAINBOW.map((h, i) => [i / (RAINBOW.length - 1), h]) : METAL[color];
      const fill = stops ? "url(#r)" : color;
      const defs = stops ? '<defs><linearGradient id="r"' + (METAL[color] ? ' x2="0" y2="1"' : "") + ">" + stops.map(([o, h]) => '<stop offset="' + o + '" stop-color="' + h + '"/>').join("") + "</linearGradient></defs>" : "";
      svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + s + '" height="' + s + '">' + defs + '<circle cx="' + c + '" cy="' + c + '" r="' + d / 2 + '" fill="' + fill + '" fill-opacity=".55" stroke="#000"/><circle cx="' + c + '" cy="' + c + '" r="' + (d / 2 + 1) + '" fill="none" stroke="#fff"/></svg>';
    }
    view.style.cursor = 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '") ' + Math.round(c) + " " + Math.round(c) + ", crosshair";
  }

  const swatchBg = (hex) => (hex === "rainbow" ? "linear-gradient(135deg," + RAINBOW.join(",") + ")" : METAL[hex] ? metalBg(hex) : hex);
  const swatch = (hex, name) => `<button type="button" class="pt-c" data-color="${hex}" aria-label="${name}" title="${name}" style="background:${swatchBg(hex)}"></button>`;
  const two = () => { const [a, b] = [...touches.values()]; return { x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2, d: Math.hypot(a[0] - b[0], a[1] - b[1]) || 1 }; };

  function build() {
    const colors = [];
    for (let s = 0; s < 4; s++) HUES.forEach((h) => colors.push(swatch(h[s + 1], SHADES[s] + h[0])));
    NEUTRALS.forEach((n) => colors.push(swatch(n[0], n[1])));
    chrome = document.createElement("div");
    chrome.className = "paint";
    chrome.setAttribute("role", "dialog");
    chrome.setAttribute("aria-label", "The Wall, spray paint");
    chrome.hidden = true;
    chrome.innerHTML =
      `<header class="tb"><span class="tb-i">${icon("bricks")}</span><h2 class="tb-t">The Wall - Paint</h2><span class="tb-btns"><button class="tb-x" type="button" data-pt-close aria-label="Back to the map"></button></span></header>` +
      `<nav class="mb" aria-hidden="true"><span><u>F</u>ile</span><span><u>E</u>dit</span><span><u>V</u>iew</span><span><u>I</u>mage</span><span><u>C</u>olors</span><span><u>H</u>elp</span></nav>` +
      `<div class="pt-mid"><div class="pt-tools">` +
      `<button type="button" class="pt-t" data-tool="spray" title="Spray can"><svg viewBox="0 0 16 16" width="16" height="16" shape-rendering="crispEdges" aria-hidden="true"><rect x="5" y="5" width="6" height="10" fill="#000080"/><rect x="6" y="6" width="4" height="8" fill="#5f8fff"/><rect x="6" y="3" width="4" height="2" fill="#000"/><rect x="7" y="1" width="2" height="2" fill="#808080"/><rect x="11" y="1" width="1" height="1"/><rect x="13" y="2" width="1" height="1"/><rect x="12" y="4" width="1" height="1"/><rect x="14" y="0" width="1" height="1"/></svg></button>` +
      `<button type="button" class="pt-t" data-tool="eraser" title="Eraser, it rubs out any paint"><svg viewBox="0 0 16 16" width="16" height="16" shape-rendering="crispEdges" aria-hidden="true"><path d="M2 10l6-6 6 6-3 3H5z" fill="#ff9ec7" stroke="#000"/><path d="M2 10l3 3h3l-3-3z" fill="#fff"/></svg></button>` +
      `<button type="button" class="pt-t" data-undo title="Take back your last stroke (${UNDO_KEY})">&#8630;</button>` +
      `<button type="button" class="pt-t" data-redo title="Put it back (Shift+${UNDO_KEY})">&#8631;</button>` +
      `<button type="button" class="pt-t" data-zoom="in" title="Zoom in (E or the wheel)">+</button>` +
      `<button type="button" class="pt-t" data-zoom="out" title="Zoom out (Q or the wheel)">&#8722;</button>` +
      `<div class="pt-sizes">${SIZES.map((_, i) => `<button type="button" class="pt-s" data-size="${i}" title="Size ${i + 1}" aria-label="Size ${i + 1}"><i style="width:${[2, 4, 6, 9, 12][i]}px;height:${[2, 4, 6, 9, 12][i]}px"></i></button>`).join("")}</div>` +
      `</div><div class="pt-hole"></div></div>` +
      `<div class="pt-pal"><span class="pt-cur" data-cur title="Your color"></span><div class="pt-metal">${swatch("chrome", "chrome")}${swatch("gold", "gold")}</div><div class="pt-cs">${colors.join("")}<button type="button" class="pt-c pt-rb" data-color="rainbow" aria-label="rainbow" title="rainbow" style="background:${swatchBg("rainbow")}" hidden></button></div>` +
      `<label class="btn pt-more" title="Any color you like">Edit colors...<input type="color" value="#ff0000" aria-label="Pick any color"></label></div>` +
      `<footer class="stb"><span data-where>The start of the wall</span><span>${TOUCH ? "Two fingers walk and pinch to zoom in forever. Hold still and the paint drips." : `Wheel zooms in forever, A and D walk, W and S climb. Hold still and the paint drips, ${UNDO_KEY} takes back your strokes.`}</span><span class="stb-act"><button class="btn" type="button" data-pt-close>Back to the map</button></span></footer>`;
    document.body.appendChild(chrome);
    view = document.createElement("div");
    view.className = "wv";
    view.hidden = true;
    layer = document.createElement("div");
    layer.className = "wv-lod";
    view.append(layer);
    chrome.querySelector(".pt-hole").append(view);
    chrome.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      if (b.hasAttribute("data-pt-close")) { opts.onExit(); return; }
      if (b.hasAttribute("data-undo")) { undo(); return; }
      if (b.hasAttribute("data-redo")) { redoLast(); return; }
      if (b.dataset.zoom) { const r = view.getBoundingClientRect(); zoomAt(b.dataset.zoom === "in" ? 2 : 0.5, r.left + W / 2, r.top + H / 2); return; }
      if (b.dataset.tool) erasing = b.dataset.tool === "eraser";
      if (b.dataset.color) { color = b.dataset.color; erasing = false; }
      if (b.dataset.size) size = +b.dataset.size;
      sync();
    });
    chrome.querySelector("input[type=color]").addEventListener("input", (e) => { color = e.target.value.toLowerCase(); erasing = false; sync(); });
    if (rainbow) chrome.querySelector(".pt-rb").hidden = false;

    view.addEventListener("wheel", (e) => {
      if (!active) return;
      e.preventDefault();
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? H : 1;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && !e.ctrlKey) { cx += (e.deltaX * unit) / (k0 * Z); clampView(); present(); step(); return; }
      zoomAt(Math.exp(-e.deltaY * unit * (e.ctrlKey ? 0.012 : 0.0022)), e.clientX, e.clientY);
      step();
    }, { passive: false });

    view.addEventListener("pointerdown", (e) => {
      if (!active) return;
      if (e.pointerType === "touch") {
        touches.set(e.pointerId, [e.clientX, e.clientY]);
        if (touches.size >= 2) {
          if (live) { if (gesture && performance.now() - gesture.t0 < 350) abort(); else close(); }
          gesture = null;
          if (tick) { cancelAnimationFrame(tick); tick = 0; }
          pinch = two();
          sync();
          return;
        }
      }
      if (e.button !== 0 || live || pinch) return;
      e.preventDefault();
      if (posted >= MAX_POSTS) { flash("THAT IS ENOUGH ART FOR ONE VISIT"); return; }
      const [ux, uy] = wallPoint(e.clientX, e.clientY);
      if (ux < 0 || uy < 0 || uy > WY) return;
      try { view.setPointerCapture(e.pointerId); } catch (err) {}
      gesture = { id: e.pointerId, t0: performance.now() };
      redo.length = 0;
      client = [e.clientX, e.clientY];
      const p = Math.floor(ux / WX);
      open(p, ux - p * WX, uy, newGroup());
      if (!tick) tick = requestAnimationFrame(hold);
    });
    view.addEventListener("pointermove", (e) => {
      if (touches.has(e.pointerId)) touches.set(e.pointerId, [e.clientX, e.clientY]);
      if (pinch) {
        if (touches.size < 2) return;
        const now = two(), r = view.getBoundingClientRect(), [ux, uy] = wallPoint(pinch.x, pinch.y);
        Z = clamp((Z * now.d) / pinch.d, MINZ, MAXZ);
        const ppu = k0 * Z;
        cx = ux - (now.x - r.left - W / 2) / ppu;
        cy = uy - (now.y - r.top - H / 2) / ppu;
        pinch = now;
        clampView();
        present();
        return;
      }
      if (!gesture || !live || e.pointerId !== gesture.id) return;
      const list = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
      for (const ev of list.length ? list : [e]) { client = [ev.clientX, ev.clientY]; step(); }
    });
    const up = (e) => {
      touches.delete(e.pointerId);
      if (pinch) { if (!touches.size) pinch = null; else if (touches.size >= 2) pinch = two(); return; }
      if (!gesture || e.pointerId !== gesture.id) return;
      gesture = null;
      if (tick) { cancelAnimationFrame(tick); tick = 0; }
      if (live) close();
      sync();
    };
    view.addEventListener("pointerup", up);
    view.addEventListener("pointercancel", up);
  }

  function where() {
    if (!chrome || !active) return;
    const ppu = k0 * Z, x0 = cx - W / 2 / ppu, x1 = cx + W / 2 / ppu, y0 = cy - H / 2 / ppu, y1 = cy + H / 2 / ppu, m = Math.round((x0 + LEAD) / 100);
    let n = 0;
    for (let p = Math.max(0, Math.floor(x0 / WX)); p <= Math.floor(x1 / WX); p++) { const P = panels.get(p); if (P) for (const o of P.ops) if (o.k === "d" && hits(o, x0, y0, x1, y1)) n++; }
    const zoom = Z < 1.05 ? "" : Z < 1000 ? `, zoom ${Z.toFixed(Z < 10 ? 1 : 0)}x` : `, zoom ${Z.toExponential(1).replace("e+", "e")}x`;
    const text = (m > 0 ? `${m} m from the start` : "The start of the wall") + zoom + `, ${n} ${n === 1 ? "stroke" : "strokes"} here`;
    if (text !== said) { said = text; chrome.querySelector("[data-where]").textContent = text; }
  }

  function sync() {
    if (!chrome) return;
    chrome.querySelectorAll("[data-color]").forEach((b) => b.setAttribute("aria-pressed", String(!erasing && b.dataset.color === color)));
    chrome.querySelectorAll("[data-size]").forEach((b) => b.setAttribute("aria-pressed", String(+b.dataset.size === size)));
    chrome.querySelectorAll("[data-tool]").forEach((b) => b.setAttribute("aria-pressed", String((b.dataset.tool === "eraser") === erasing)));
    chrome.querySelector("[data-cur]").style.background = swatchBg(color);
    chrome.querySelector("[data-undo]").disabled = !mineHere();
    chrome.querySelector("[data-redo]").disabled = !redo.length;
    where();
    if (active) cursor();
  }

  document.addEventListener("keydown", (e) => {
    if (!active) return;
    if (e.key === "Escape") { opts.onExit(); return; }
    const key = e.key.toLowerCase(), tag = (e.target && e.target.tagName) || "";
    if (key in keys && !e.metaKey && !e.ctrlKey && !e.altKey && tag !== "INPUT" && tag !== "TEXTAREA") {
      e.preventDefault();
      keys[key] = 1;
      walk();
      return;
    }
    if (!(e.metaKey || e.ctrlKey) || e.altKey) return;
    if (key === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
    else if ((key === "z" && e.shiftKey) || (key === "y" && e.ctrlKey)) { e.preventDefault(); redoLast(); }
  });
  document.addEventListener("keyup", (e) => { const key = e.key.toLowerCase(); if (key in keys) keys[key] = 0; });
  addEventListener("blur", () => { Object.keys(keys).forEach((k) => (keys[k] = 0)); });

  const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
  let progress = 0;
  document.addEventListener("keydown", (e) => {
    const tag = (e.target && e.target.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    progress = key === KONAMI[progress] ? progress + 1 : key === KONAMI[0] ? 1 : 0;
    if (progress < KONAMI.length) return;
    progress = 0; rainbow = true;
    try { localStorage.setItem("gl-rainbow", "1"); } catch (err) {}
    if (chrome) { chrome.querySelector(".pt-rb").hidden = false; color = "rainbow"; erasing = false; sync(); }
    flash("SECRET COLOR UNLOCKED: RAINBOW");
  });

  connect();
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { if (stream) { stream.close(); stream = null; } }
    else if (!stream) connect();
  });

  return {
    enter() {
      if (!chrome) build();
      chrome.hidden = false; active = true; made = 0; said = "";
      view.hidden = false;
      Z = 1; k0 = 0;
      place();
      cx = W / 2 / k0 - LEAD;
      cy = (ytop + ybot) / 2;
      clampView();
      present();
      view.classList.remove("on");
      void view.offsetWidth;
      view.classList.add("on");
      sync();
    },
    exit() {
      active = false;
      if (live) { gesture = null; close(); }
      if (tick) { cancelAnimationFrame(tick); tick = 0; }
      if (walkRaf) { cancelAnimationFrame(walkRaf); walkRaf = 0; }
      Object.keys(keys).forEach((k) => (keys[k] = 0));
      touches.clear(); pinch = null;
      if (chrome) chrome.hidden = true;
      if (view) { view.hidden = true; view.classList.remove("on"); view.style.cursor = ""; }
      shown.forEach((t) => t.el.remove());
      shown = new Set();
      lod.forEach((t) => { t.job = null; });
      lod.clear();
    },
    hole() {
      if (!chrome) build();
      const was = chrome.hidden;
      chrome.hidden = false;
      const r = chrome.querySelector(".pt-hole").getBoundingClientRect();
      chrome.hidden = was;
      return r;
    },
    resize() { if (active) place(); },
    frame: (hole) => frame(hole.width, hole.height),
    made: () => made,
  };
}
