/* Gzowo Labs wall: spray paint on the brick wall of the map. Click it and the camera zooms into a Paint-style frame where the wall runs on
   forever to the right of where it starts and zooms in forever: the wheel or a pinch zooms, A and D walk, W and S climb, two fingers on a phone.
   Every 1000 units of wall is a panel with its own log of strokes, replayed in order with seeded mist so every visitor sees the same paint.
   Brushes are spray with a box of swappable caps, chalk, neon and a rainbow can, plus an eraser anyone can use. Masking tape and cardboard
   stencils are shared: everyone sees them, everyone's paint stops at them and anyone can rip a strip off by its end or lift a stencil by its
   folded corner. Every stroke carries the outlines it was masked by and the ids of the tape and cardboard it landed on, so the paint on a
   strip shows for everyone and leaves the same crisp edge when it comes off. A stroke keeps the precision of the zoom it was drawn at, so whole
   pictures fit inside one brick. The view is drawn in tiles at many resolutions like a map, the timelapse replays the paint in view in the
   order it went on. The wall comes over one stream; while the wall is open a second small stream carries the tape, the stencils, the other
   painters' cursors and their strokes as they spray them. Undo deletes only your own strokes and copies them to the trash first. */

import { icon } from "/assets/views.mjs";
import { wallArt, WALL_SM, WALL_SKY, WALL_GRASS } from "/assets/map.mjs";
import { picker, cutter, simplify } from "/assets/stencil.mjs";
import { me as wallet } from "/assets/bank.mjs";

const DB = "https://raft-e8d47-default-rtdb.firebaseio.com";
const LOCAL = ["localhost", "127.0.0.1", "0.0.0.0", "[::1]"];
const DEV = LOCAL.includes(location.hostname) || location.protocol === "file:";
const FAR = DEV ? "muralWallDev" : "muralWall", FAR_BIN = DEV ? "muralWallTrashDev" : "muralWallTrash", LIVE = DEV ? "muralLiveDev" : "muralLive";
const pathOf = (p) => FAR + "/" + p, binOf = (p) => FAR_BIN + "/" + p;
const MINE_KEY = "gl-mural-mine-" + (DEV ? "muralDev" : "mural");
const TOUCH = matchMedia("(pointer: coarse)").matches;
const WX = 1000, WY = 323, SX = 2;
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
const TAPES = [8, 14, 22, 34, 52];
const RAINBOW = ["#ff2d2d", "#ff8a00", "#ffe600", "#38e03b", "#00e5ff", "#2f6bff", "#b14bff"];
const HEX = /^#[0-9a-f]{6}$/;
const TAPE = "#e6d49c", TAPE_HI = "#f5ebc8", TAPE_LO = "#d0bb7e", CARD = "#c49a5e";
const MAX_TAPES = 30, MAX_SHEETS = 8, M_MAX = 4000, S_MAX = 9000, Q_MAX = 1000, SHEET_M = 0.12;
const BRUSH = ["spray", "chalk", "neon", "bands"];
const HEADS = [
  ["std", "Standard", "The cap the can came with", 1],
  ["skinny", "Skinny", "Thin sharp lines for outlines and tags", 0.42],
  ["fat", "Fat", "A wide soft spray that fills big areas fast", 1.8],
  ["flat", "Flat", "Thick one way and thin the other, like a calligraphy pen", 1.15],
  ["splat", "Splatter", "Spits drops of paint all around the line", 1],
  ["drip", "Dripper", "Runny paint that drips as you go", 1],
  ["soft", "Airbrush", "No speckle, just a smooth soft haze", 1.4],
  ["dust", "Dust", "Only a fine speckle of dots", 1],
];
const HEAD_IDS = new Set(HEADS.slice(1).map((h) => h[0]));
const headSize = (h) => (HEADS.find((x) => x[0] === h) || HEADS[0])[3];
const HINTS = {
  paint: TOUCH ? "Two fingers walk and pinch to zoom in forever. Hold still and the paint drips." : `Wheel zooms in forever, A and D walk, W and S climb. Hold still and the paint drips, ${UNDO_KEY} takes back your strokes.`,
  tape: "Drag to lay a strip of masking tape, everyone's paint stops at its edge. Grab the end of a strip and pull to rip it off.",
  stencil: "Drag a stencil to move it, pull the corner with the arrow to turn and size it. Pull the folded corner to lift it off.",
};

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rgbOf = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const mix = (a, b, t) => { const B = rgbOf(b); return "#" + rgbOf(a).map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join(""); };
const DPR = () => Math.min(2, devicePixelRatio || 1);

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
const isMetal = (c) => c === "chrome" || c === "gold";

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

const glowCache = new Map();
function glow(color, q) {
  const key = color + q;
  let cv = glowCache.get(key);
  if (cv) return cv;
  const R = q * 1.9, D = Math.ceil(R * 2) + 4, m = D / 2, [cr, cg, cb] = rgbOf(color);
  cv = document.createElement("canvas");
  cv.width = cv.height = D;
  const x = cv.getContext("2d"), g = x.createRadialGradient(m, m, 0, m, m, R);
  [[0, 0.5], [0.22, 0.3], [0.5, 0.1], [0.78, 0.025], [1, 0]].forEach(([at, a]) => g.addColorStop(at, `rgba(${cr},${cg},${cb},${a})`));
  x.fillStyle = g;
  x.fillRect(0, 0, D, D);
  glowCache.set(key, cv);
  if (glowCache.size > 60) glowCache.delete(glowCache.keys().next().value);
  return cv;
}

const grainCache = new Map();
function grain(color, dens, seed) {
  const key = color + dens + seed;
  let cv = grainCache.get(key);
  if (cv) return cv;
  const G = 96, r = rng(seed), field = (n) => Float32Array.from({ length: n * n }, () => r());
  const a = field(12), b = field(24), vals = new Float32Array(G * G);
  const smooth = (g, n, x, y) => {
    const fx = (x / G) * n, fy = (y / G) * n, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0, at = (i, j) => g[(j % n) * n + (i % n)];
    return (at(x0, y0) * (1 - tx) + at(x0 + 1, y0) * tx) * (1 - ty) + (at(x0, y0 + 1) * (1 - tx) + at(x0 + 1, y0 + 1) * tx) * ty;
  };
  for (let y = 0; y < G; y++) for (let x = 0; x < G; x++) vals[y * G + x] = smooth(a, 12, x, y) * 0.35 + smooth(b, 24, x, y) * 0.3 + r() * 0.35;
  const cut = Float32Array.from(vals).sort()[Math.floor((1 - dens) * G * G)];
  cv = document.createElement("canvas");
  cv.width = cv.height = G;
  const x = cv.getContext("2d"), img = x.createImageData(G, G), [cr, cg, cb] = rgbOf(color);
  for (let i = 0; i < G * G; i++) { img.data[i * 4] = cr; img.data[i * 4 + 1] = cg; img.data[i * 4 + 2] = cb; img.data[i * 4 + 3] = vals[i] >= cut ? 255 : 0; }
  x.putImageData(img, 0, 0);
  grainCache.set(key, cv);
  if (grainCache.size > 60) grainCache.delete(grainCache.keys().next().value);
  return cv;
}

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

const softCache = new Map();
function softStamp(color, q) {
  const key = color + q;
  let cv = softCache.get(key);
  if (cv) return cv;
  const D = Math.ceil(q * 1.6) + 4, m = D / 2, [cr, cg, cb] = rgbOf(color);
  cv = document.createElement("canvas");
  cv.width = cv.height = D;
  const x = cv.getContext("2d"), g = x.createRadialGradient(m, m, 0, m, m, q * 0.8);
  [[0, 0.55], [0.35, 0.4], [0.7, 0.12], [1, 0]].forEach(([at, a]) => g.addColorStop(at, `rgba(${cr},${cg},${cb},${a})`));
  x.fillStyle = g;
  x.fillRect(0, 0, D, D);
  softCache.set(key, cv);
  if (softCache.size > 60) softCache.delete(softCache.keys().next().value);
  return cv;
}

const CAP = {
  std: { f: 1, a: 0.5, ah: 0.32, step: 0.2, jit: 0.08 },
  skinny: { f: 0.42, a: 0.8, ah: 0.55, step: 0.16, jit: 0.03 },
  fat: { f: 1.8, a: 0.24, ah: 0.16, step: 0.14, jit: 0.12 },
  flat: { f: 1.15, a: 0.55, ah: 0.36, step: 0.1, jit: 0.02 },
  splat: { f: 0.6, a: 0.6, ah: 0.4, step: 0.2, jit: 0.06 },
  drip: { f: 1, a: 0.55, ah: 0.36, step: 0.2, jit: 0.08 },
  soft: { f: 1.4, a: 0.2, ah: 0.14, step: 0.1, jit: 0.04 },
  dust: { f: 1, a: 0.85, ah: 0.85, step: 0.22, jit: 0 },
};

function sprayer(op, c, v) {
  const head = CAP[op.h] ? op.h : "std", cap = CAP[head];
  const r = rng(hash(op.id)), base = op.w * v.r, lw = base * cap.f, step = Math.max(0.5, lw * cap.step), W = c.canvas.width, H = c.canvas.height;
  const q = stampSize(lw), sc = lw / q, metal = SHINE[op.c], dripAt = head === "drip" ? 5 : DRIP;
  const tint = (run, y) => (op.c === "rainbow" ? RAINBOW_RUN[Math.floor(run / (base * 1.5)) % RAINBOW_RUN.length]
    : metal ? metal[Math.round(clamp((y / v.r + v.y0) / WY + Math.sin(run / (base * 3)) * 0.05, 0, 1) * 31)] : op.c);
  const drips = [];
  let px = null, py = null, left = step, run = 0, held = 0, hx = 0, hy = 0, next = base * 3;
  const dot = (x, y, s, col) => { c.fillStyle = col; c.beginPath(); c.arc(x, y, s, 0, Math.PI * 2); c.fill(); };
  const stamp = (x, y) => {
    const pick = r(), jit = lw * (cap.jit + Math.min(held, 45) * 0.005), ox = (r() - 0.5) * jit, oy = (r() - 0.5) * jit;
    const shine = metal && r() < 0.07 ? [r(), r(), r()] : null, extra = head === "splat" ? [r(), r(), r(), r(), r()] : head === "dust" ? Array.from({ length: 12 }, r) : null;
    const out = Math.max(lw * 1.6, base * 2.8) + 2;
    if (x + out < 0 || x - out > W || y + out < 0 || y - out > H) return;
    const col = tint(run, y), a = c.globalAlpha;
    if (head === "dust") {
      const s = Math.max(0.6, base * 0.05);
      c.globalAlpha = 0.85;
      for (let i = 0; i < 12; i += 2) { const ang = extra[i] * Math.PI * 2, d = Math.sqrt(extra[i + 1]) * lw * 0.75; dot(x + Math.cos(ang) * d, y + Math.sin(ang) * d, s * (0.6 + extra[(i + 3) % 12]), col); }
      c.globalAlpha = a;
      return;
    }
    if (lw > 1500) bigStamp(c, x + ox, y + oy, lw * 0.6, col, W, H);
    else if (head === "soft") { const img = softStamp(col, q), h = (img.width / 2) * sc; c.drawImage(img, x - h + ox, y - h + oy, img.width * sc, img.height * sc); }
    else {
      const set = stamps(col, q), img = set[Math.floor(pick * set.length)], h = (img.width / 2) * sc;
      if (head === "flat") { c.save(); c.translate(x + ox, y + oy); c.rotate(-Math.PI / 4); c.scale(1, 0.26); c.drawImage(img, -h, -h, img.width * sc, img.height * sc); c.restore(); }
      else c.drawImage(img, x - h + ox, y - h + oy, img.width * sc, img.height * sc);
    }
    if (extra && extra[0] < 0.4) {
      const ang = extra[1] * Math.PI * 2, d = base * (0.5 + extra[2] * 1.9), s = base * (0.03 + extra[3] * (extra[4] < 0.12 ? 0.2 : 0.09));
      c.globalAlpha = 0.92;
      dot(x + Math.cos(ang) * d, y + Math.sin(ang) * d, Math.max(0.5, s), col);
      c.globalAlpha = a;
    }
    if (shine) {
      const gx = x + (shine[0] - 0.5) * lw * 0.8, gy = y + (shine[1] - 0.5) * lw * 0.8, s = Math.max(3, lw * (0.25 + shine[2] * 0.3)), t = Math.max(1.2, lw * 0.04);
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
      c.globalAlpha = cap.a;
      if (px === null) {
        stamp(x, y); stamp(x, y);
        px = hx = x; py = hy = y; held = 1;
        return;
      }
      const dx = x - px, dy = y - py, len = Math.hypot(dx, dy);
      if (Math.hypot(x - hx, y - hy) <= base * 0.25) held++;
      else { if (held >= dripAt) drips.push([hx, hy, held, tint(run, hy)]); held = 1; hx = x; hy = y; }
      c.globalAlpha = held > 3 ? cap.ah : cap.a;
      if (len < 0.5 * Math.max(1, lw / 6)) stamp(x, y);
      else {
        let t = left;
        for (; t <= len; t += step) stamp(px + (dx * t) / len, py + (dy * t) / len);
        left = t - len; run += len; px = x; py = y;
        if (head === "drip") while (run >= next) { drips.push([x, y, dripAt + 20 + Math.floor(r() * 40), tint(run, y)]); next += base * (2 + r() * 3); }
      }
    },
    end() {
      if (held >= dripAt) drips.push([hx, hy, held, tint(run, hy)]);
      if (head === "dust" || head === "soft") drips.length = 0;
      const dw = head === "std" || head === "drip" || head === "flat" ? lw : base, long = head === "drip" ? 1.7 : 1;
      c.save();
      c.beginPath(); c.rect(-1e6, -1e6, 2e6 + W, 1e6 + (WY - v.y0) * v.r); c.clip();
      drips.forEach(([x, y, n, col]) => {
        const len = dw * Math.max(0.5, Math.min(5, 0.6 + (n - dripAt) * 0.07)) * (0.8 + r() * 0.4) * long;
        const a = r(), b = r() < 0.5, e = r(), f = r();
        if (lw > 1500 || x + dw * 2 < 0 || x - dw * 2 > W || y + len + dw < 0 || y - dw > H) return;
        drip(c, x + (a - 0.5) * dw * 0.3, y + dw * 0.15, dw, len, col, r);
        if (n > 40) drip(c, x + (b ? -1 : 1) * dw * (0.22 + e * 0.1), y + dw * 0.1, dw * 0.8, len * (0.4 + f * 0.25), col, r);
      });
      c.restore();
      drips.length = 0;
    },
  };
}

function bands(op, c, v) {
  const r = rng(hash(op.id)), lw = op.w * v.r, bw = lw / 7, sw = Math.max(1, bw * 1.8), q = stampSize(sw), sc = sw / q, step = Math.max(0.5, bw * 0.4);
  const W = c.canvas.width, H = c.canvas.height, big = sw > 1500, out = sw * 1.6 + 2, drips = [];
  let px = null, py = null, nx = 0, ny = 1, left = step, held = 0, hx = 0, hy = 0, first = null;
  const fan = (x, y) => {
    for (let i = 0; i < 7; i++) {
      const pick = r(), jx = (r() - 0.5) * bw * 0.45, jy = (r() - 0.5) * bw * 0.45, o = (i - 3) * bw, bx = x + nx * o + jx, by = y + ny * o + jy;
      if (bx + out < 0 || bx - out > W || by + out < 0 || by - out > H) continue;
      if (big) { bigStamp(c, bx, by, sw * 0.6, RAINBOW[i], W, H); continue; }
      const set = stamps(RAINBOW[i], q), img = set[Math.floor(pick * set.length)], h = (img.width / 2) * sc;
      c.drawImage(img, bx - h, by - h, img.width * sc, img.height * sc);
    }
  };
  const settle = () => { const a = c.globalAlpha; c.globalAlpha = 0.5; fan(first[0], first[1]); fan(first[0], first[1]); c.globalAlpha = a; first = null; };
  return {
    add(x, y) {
      c.globalCompositeOperation = "source-over";
      if (px === null) { px = hx = x; py = hy = y; held = 1; first = [x, y]; return; }
      const dx = x - px, dy = y - py, len = Math.hypot(dx, dy);
      if (Math.hypot(x - hx, y - hy) <= lw * 0.25) held++;
      else { if (held >= DRIP) drips.push([hx, hy, held, nx, ny]); held = 1; hx = x; hy = y; }
      c.globalAlpha = held > 3 ? 0.32 : 0.5;
      if (len < 0.5 * Math.max(1, lw / 6)) {
        if (first) { if (held > 3) settle(); }
        else fan(x, y);
        return;
      }
      const tx = -dy / len, ty = dx / len;
      if (first) { nx = tx; ny = ty; settle(); }
      else {
        const mx = nx * 0.6 + tx * 0.4, my = ny * 0.6 + ty * 0.4, l = Math.hypot(mx, my);
        if (l > 0.2) { nx = mx / l; ny = my / l; } else { nx = tx; ny = ty; }
      }
      let t = left;
      for (; t <= len; t += step) fan(px + (dx * t) / len, py + (dy * t) / len);
      left = t - len; px = x; py = y;
    },
    end() {
      c.globalCompositeOperation = "source-over";
      if (first) { settle(); c.globalAlpha = 0.32; for (let i = Math.min(24, held >> 1); i > 0; i--) fan(hx, hy); }
      if (held >= DRIP) drips.push([hx, hy, held, nx, ny]);
      c.save();
      c.beginPath(); c.rect(-1e6, -1e6, 2e6 + W, 1e6 + (WY - v.y0) * v.r); c.clip();
      drips.forEach(([x, y, n, ax, ay], k) => {
        const len = lw * Math.min(4, 0.5 + (n - DRIP) * 0.06);
        [1, 3, 5].forEach((i) => {
          const dr = rng(hash(op.id) + k * 7 + i), o = (i - 3) * bw, qx = x + ax * o + (dr() - 0.5) * bw * 0.6, qy = y + ay * o + bw * 0.5, l = len * (0.6 + dr() * 0.6);
          if (big || qx + lw < 0 || qx - lw > W || qy + l + lw < 0 || qy - lw > H) return;
          drip(c, qx, qy, bw * 2.4, l, RAINBOW[i], dr);
        });
      });
      c.restore();
      drips.length = 0;
    },
  };
}

function neon(op, c, v) {
  const hex = op.c.slice(1), lw = op.w * v.r, q = stampSize(lw), sc = lw / q, step = Math.max(0.6, lw * 0.28);
  const W = c.canvas.width, H = c.canvas.height, out = lw * 2 + 2, pts = [];
  const tubes = [[0.8, hex], [0.5, mix(hex, "#ffffff", 0.5)], [0.22, mix(hex, "#ffffff", 0.88)]];
  let px = null, py = null, left = step;
  const halo = (x, y) => {
    if (lw > 1500 || x + out < 0 || x - out > W || y + out < 0 || y - out > H) return;
    const img = glow(hex, q), h = (img.width / 2) * sc;
    c.drawImage(img, x - h, y - h, img.width * sc, img.height * sc);
  };
  const tube = (list) => {
    c.globalCompositeOperation = "source-over";
    c.globalAlpha = 1;
    c.lineCap = "round"; c.lineJoin = "round";
    for (const [f, col] of tubes) {
      c.fillStyle = c.strokeStyle = col;
      c.beginPath();
      if (list.length === 2) { c.arc(list[0], list[1], (lw * f) / 2, 0, Math.PI * 2); c.fill(); continue; }
      c.lineWidth = lw * f;
      c.moveTo(list[0], list[1]);
      for (let i = 2; i < list.length; i += 2) c.lineTo(list[i], list[i + 1]);
      c.stroke();
    }
  };
  const walk = (x, y) => {
    c.globalCompositeOperation = "lighter";
    c.globalAlpha = 0.55;
    if (px === null) { halo(x, y); px = x; py = y; pts.push(x, y); return true; }
    const dx = x - px, dy = y - py, len = Math.hypot(dx, dy);
    if (len < 0.5) return false;
    let t = left;
    for (; t <= len; t += step) halo(px + (dx * t) / len, py + (dy * t) / len);
    left = t - len; px = x; py = y; pts.push(x, y);
    return true;
  };
  return {
    add(x, y) { const n = pts.length; if (walk(x, y)) tube(n ? [pts[n - 2], pts[n - 1], x, y] : [x, y]); },
    line(list) { for (let i = 0; i < list.length; i += 2) walk(list[i], list[i + 1]); },
    end() { if (pts.length) tube(pts); },
  };
}

function chalk(op, c, v) {
  const r = rng(hash(op.id)), lw = op.w * v.r, W = c.canvas.width, H = c.canvas.height, jit = lw * 0.08, out = lw + 4;
  const [ox, oy] = at(op, 0, v), turn = r() * 360, px = lw / 18, smooth = px > 1.5;
  const pats = [[1.4, 0.07, 11], [1, 0.55, 23], [0.55, 0.5, 37]].map(([f, dens, seed]) => {
    const pt = c.createPattern(grain(op.c, dens, seed), "repeat");
    if (pt && pt.setTransform && typeof DOMMatrix !== "undefined") pt.setTransform(new DOMMatrix().translateSelf(ox, oy).rotateSelf(turn + seed * 13).scaleSelf(px));
    return [lw * f, pt];
  });
  let lx = null, ly = null;
  const jitter = (x, y) => [x + (r() - 0.5) * jit, y + (r() - 0.5) * jit];
  const draw = (list) => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let i = 0; i < list.length; i += 2) { x0 = Math.min(x0, list[i]); x1 = Math.max(x1, list[i]); y0 = Math.min(y0, list[i + 1]); y1 = Math.max(y1, list[i + 1]); }
    if (x1 + out < 0 || x0 - out > W || y1 + out < 0 || y0 - out > H) return;
    const was = c.imageSmoothingEnabled;
    c.globalCompositeOperation = "source-over";
    c.globalAlpha = 1;
    c.lineCap = "round"; c.lineJoin = "round";
    c.imageSmoothingEnabled = smooth;
    for (const [w, pt] of pats) {
      c.fillStyle = c.strokeStyle = pt;
      c.beginPath();
      if (list.length === 2) { c.arc(list[0], list[1], w / 2, 0, Math.PI * 2); c.fill(); continue; }
      c.lineWidth = w;
      c.moveTo(list[0], list[1]);
      for (let i = 2; i < list.length; i += 2) c.lineTo(list[i], list[i + 1]);
      c.stroke();
    }
    c.imageSmoothingEnabled = was;
  };
  return {
    add(x, y) { const [qx, qy] = jitter(x, y); draw(lx === null ? [qx, qy] : [lx, ly, qx, qy]); lx = qx; ly = qy; },
    line(list) { const pts = []; for (let i = 0; i < list.length; i += 2) pts.push(...jitter(list[i], list[i + 1])); draw(pts); },
    end() {},
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

function clipRect(p, x0, y0, x1, y1) {
  let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity;
  for (let i = 0; i < p.length; i += 2) { if (p[i] < a) a = p[i]; if (p[i] > c) c = p[i]; if (p[i + 1] < b) b = p[i + 1]; if (p[i + 1] > d) d = p[i + 1]; }
  if (c < x0 || a > x1 || d < y0 || b > y1) return null;
  if (a >= x0 && c <= x1 && b >= y0 && d <= y1) return p;
  let out = p;
  for (const [ax, lim, sg] of [[0, x0, 1], [0, x1, -1], [1, y0, 1], [1, y1, -1]]) {
    const inp = out, n = inp.length / 2;
    out = [];
    for (let i = 0; i < n; i++) {
      const j = (i + n - 1) % n, qx = inp[i * 2], qy = inp[i * 2 + 1], px = inp[j * 2], py = inp[j * 2 + 1];
      const qa = ax ? qy : qx, pa = ax ? py : px, qin = (qa - lim) * sg >= 0, pin = (pa - lim) * sg >= 0;
      if (qin !== pin) { const t = (lim - pa) / (qa - pa); out.push(px + (qx - px) * t, py + (qy - py) * t); }
      if (qin) out.push(qx, qy);
    }
    if (out.length < 6) return null;
  }
  return out;
}
const area = (p) => { let s = 0; for (let i = 0; i < p.length; i += 2) { const j = (i + 2) % p.length; s += p[i] * p[j + 1] - p[j] * p[i + 1]; } return s; };
const orient = (p) => { if (area(p) >= 0) return p; const o = []; for (let i = p.length - 2; i >= 0; i -= 2) o.push(p[i], p[i + 1]); return o; };
const trail = (c, p) => { c.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) c.lineTo(p[i], p[i + 1]); c.closePath(); };
function toCanvas(poly, v, Wc, Hc) {
  const o = new Array(poly.length);
  for (let i = 0; i < poly.length; i += 2) { o[i] = (poly[i] - v.x0) * v.r; o[i + 1] = (poly[i + 1] - v.y0) * v.r; }
  return clipRect(o, -40, -40, Wc + 40, Hc + 40);
}

function strip(a, b, w, teeth) {
  const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len, nx = (-uy * w) / 2, ny = (ux * w) / 2, k = w * 0.16;
  const pts = [a[0] + nx, a[1] + ny, b[0] + nx, b[1] + ny];
  for (let i = 1; i < 5; i++) { const f = 1 - (2 * i) / 5, o = (teeth[i - 1] - 0.35) * k; pts.push(b[0] + nx * f + ux * o, b[1] + ny * f + uy * o); }
  pts.push(b[0] - nx, b[1] - ny, a[0] - nx, a[1] - ny);
  for (let i = 1; i < 5; i++) { const f = -1 + (2 * i) / 5, o = (teeth[i + 3] - 0.35) * k; pts.push(a[0] + nx * f - ux * o, a[1] + ny * f - uy * o); }
  return orient(pts);
}

function maskIn(op, v, W, H, alive) {
  const b = op.p * WX, M = 6, T = (poly) => {
    const o = new Array(poly.length);
    for (let i = 0; i < poly.length; i += 2) { o[i] = (b + poly[i] - v.x0) * v.r; o[i + 1] = (poly[i + 1] - v.y0) * v.r; }
    return clipRect(o, -M, -M, W + M, H + M);
  };
  const mk = op.mask, tapes = [], sheets = [];
  mk.tapes.forEach((t, i) => { if (alive && !alive.t.has(mk.tapeIds[i])) return; const q = T(t); if (q) tapes.push(q); });
  mk.sheets.forEach((s) => { const sheet = T(s.sheet); if (sheet) sheets.push({ sheet, holes: s.holes.map(T).filter(Boolean), live: !alive || (!!s.key && alive.s.has(s.key)) }); });
  return { x0: -M, y0: -M, x1: W + M, y1: H + M, tapes, sheets };
}

function clipMask(c, mk, mode, only) {
  const box = () => { c.moveTo(mk.x0, mk.y0); c.lineTo(mk.x1, mk.y0); c.lineTo(mk.x1, mk.y1); c.lineTo(mk.x0, mk.y1); c.closePath(); };
  const card = (s, outer) => { c.beginPath(); if (outer) box(); trail(c, s.sheet); s.holes.forEach((h) => trail(c, h)); c.clip("evenodd"); };
  if (mode === "sheet") { const s = only || mk.sheets.find((q) => q.live); if (!s) return false; card(s, false); return true; }
  mk.sheets.forEach((s) => card(s, true));
  if (mode === "tape") {
    if (!mk.tapes.length) return false;
    c.beginPath();
    mk.tapes.forEach((t) => trail(c, orient(t)));
    c.clip();
    return true;
  }
  for (const t of mk.tapes) { c.beginPath(); box(); trail(c, t); c.clip("evenodd"); }
  return true;
}

const brushOf = (op) => (op.k === "e" ? rubber : op.k === "c" ? chalk : op.c === "bands" ? bands : op.c[0] === "n" ? neon : sprayer);
function painterFor(op, c, v, mode = "wall", alive) {
  const base = brushOf(op)(op, c, v);
  if (!op.mask) return base;
  const mk = maskIn(op, v, c.canvas.width, c.canvas.height, mode === "wall" ? null : alive), run = (f) => (x, y) => { c.save(); if (clipMask(c, mk, mode)) f(x, y); c.restore(); };
  return { add: run(base.add), end: run(base.end) };
}
const reset = (c) => { c.globalCompositeOperation = "source-over"; c.globalAlpha = 1; };
const at = (op, i, v) => [(op.p * WX + op.d[i] - v.x0) * v.r, (op.d[i + 1] - v.y0) * v.r];

function paintOp(op, c, v, mode = "wall", alive) {
  if (op.w * v.r < 0.25) return;
  if (!op.mask && mode !== "wall") return;
  const draw = () => {
    const p = brushOf(op)(op, c, v);
    if (p.line) { const pts = []; for (let i = 0; i < op.d.length; i += 2) pts.push(...at(op, i, v)); p.line(pts); }
    else for (let i = 0; i < op.d.length; i += 2) p.add(...at(op, i, v));
    p.end();
  };
  if (!op.mask) { draw(); reset(c); return; }
  const mk = maskIn(op, v, c.canvas.width, c.canvas.height, mode === "wall" ? null : alive);
  for (const only of mode === "sheet" ? mk.sheets.filter((s) => s.live) : [null]) { c.save(); if (clipMask(c, mk, mode, only)) draw(); c.restore(); }
  reset(c);
}
const older = (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
const hits = (op, x0, y0, x1, y1) => op.bb[0] < x1 && op.bb[2] > x0 && op.bb[1] < y1 && op.bb[3] > y0;
const dateOf = (id) => {
  let t = 0;
  for (let i = 0; i < 8; i++) t = t * 64 + PUSH.indexOf(id[i]);
  const d = new Date(t);
  return isNaN(d) ? "" : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) + ", " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
};

function frame(w, h) {
  const k = Math.min((h * 0.56) / WY, w / 460), a = (WX * k) / 400;
  return { k, top: Math.round(((h - WY * k) * 0.45) / a) * a, left: LEAD * k };
}

const T16 = (body) => `<svg viewBox="0 0 16 16" width="16" height="16" shape-rendering="crispEdges" aria-hidden="true">${body}</svg>`;
const ICONS = {
  spray: '<rect x="5" y="5" width="6" height="10" fill="#000080"/><rect x="6" y="6" width="4" height="8" fill="#5f8fff"/><rect x="6" y="3" width="4" height="2" fill="#000"/><rect x="7" y="1" width="2" height="2" fill="#808080"/><rect x="11" y="1" width="1" height="1"/><rect x="13" y="2" width="1" height="1"/><rect x="12" y="4" width="1" height="1"/><rect x="14" y="0" width="1" height="1"/>',
  chalk: '<path d="M3 11l7-7 3 3-7 7z" fill="#fff" stroke="#000"/><path d="M4 12l2 2" stroke="#c0c0c0"/><rect x="1" y="14" width="1" height="1" fill="#808080"/><rect x="0" y="11" width="1" height="1" fill="#808080"/><rect x="3" y="15" width="1" height="1" fill="#808080"/><rect x="1" y="9" width="1" height="1" fill="#c0c0c0"/>',
  neon: '<path d="M1 11l3-6 4 6 3-6 4 6" fill="none" stroke="#ff7ae6" stroke-width="3"/><path d="M1 11l3-6 4 6 3-6 4 6" fill="none" stroke="#fff"/>',
  bands: '<rect x="5" y="5" width="6" height="10" fill="#000"/>' + RAINBOW.map((c, i) => `<rect x="6" y="${6 + i}" width="4" height="${i === 6 ? 2 : 1}" fill="${c}"/>`).join("") +
    '<rect x="6" y="3" width="4" height="2" fill="#000"/><rect x="7" y="1" width="2" height="2" fill="#808080"/><rect x="11" y="1" width="1" height="1" fill="#ff2d2d"/><rect x="13" y="2" width="1" height="1" fill="#38e03b"/><rect x="12" y="4" width="1" height="1" fill="#2f6bff"/><rect x="14" y="0" width="1" height="1" fill="#ffe600"/>',
  eraser: '<path d="M2 10l6-6 6 6-3 3H5z" fill="#ff9ec7" stroke="#000"/><path d="M2 10l3 3h3l-3-3z" fill="#fff"/>',
  tape: '<circle cx="7" cy="7" r="5.5" fill="#e6d49c" stroke="#000"/><circle cx="7" cy="7" r="2" fill="#c0c0c0" stroke="#000"/><path d="M10 11h5v3h-6z" fill="#e6d49c" stroke="#000"/>',
  stencil: '<rect x="1" y="1" width="14" height="14" fill="#c49a5e" stroke="#000"/><path d="M8 3l1.4 3 3.3.3-2.5 2.2.8 3.3L8 10.1l-3 1.7.8-3.3-2.5-2.2 3.3-.3z" fill="#b5523b" stroke="#000"/>',
  lapse: '<circle cx="8" cy="8" r="6.5" fill="#fff" stroke="#000"/><path d="M8 4v4h3" fill="none" stroke="#000"/><path d="M1 1h4L1 5z" fill="#000080"/>',
  caps: '<rect x="5" y="8" width="9" height="7" fill="#e0e0e0" stroke="#000"/><rect x="7" y="5" width="5" height="3" fill="#fff" stroke="#000"/><rect x="6" y="6" width="1" height="1" fill="#000"/><rect x="1" y="3" width="1" height="1" fill="#ff2d2d"/><rect x="3" y="1" width="1" height="1" fill="#2f6bff"/><rect x="0" y="6" width="1" height="1" fill="#38e03b"/><rect x="3" y="5" width="1" height="1" fill="#ffb700"/>',
  cancur: '<path d="M1 1v9l2.5-2.5L5 11l1.5-.7L5 7h3.5z" fill="#fff" stroke="#000"/><rect x="10" y="7" width="5" height="8" fill="#ff0000" stroke="#000"/><rect x="11" y="5" width="3" height="2" fill="#fff" stroke="#000"/><rect x="11" y="10" width="3" height="2" fill="#fff"/>',
};
const TOOLS = [["spray", "Spray can"], ["chalk", "Chalk"], ["neon", "Neon"], ["bands", "Rainbow spray"], ["eraser", "Eraser, it rubs out any paint"], ["tape", "Masking tape"], ["stencil", "Stencils, ready made or cut your own"]];

export function createMural(el, opts) {
  const home = el.querySelector("canvas");
  const panels = new Map(), tiles = new Map(), lod = new Map(), keys = { a: 0, d: 0, w: 0, s: 0, q: 0, e: 0 }, touches = new Map();
  const mine = {}, minePanel = {}, order = [], redo = [], layers = [];
  let color = "#ff0000", hex = "#ff0000", tool = "spray", brush = "spray", size = 2, rainbow = false, posted = 0, lastT = 0, lastR = [], offlineSaid = false;
  let live = null, client = null, lastSample = 0, tick = 0, gesture = null, active = false, chrome = null, view = null, layer = null;
  let pumpRaf = 0, lodRaf = 0, flashTimer = 0, made = 0, said = "", walkRaf = 0, walkT = 0, stream = null;
  let W = 1, H = 1, k0 = 1, faceTop = 0, cx = 0, cy = 0, Z = 1, ytop = 0, ybot = 1, level = 0, shown = new Set(), pinch = null;
  const props = new Map(), alive = { t: new Set(), s: new Set() }, others = new Map(), ghosts = new Map();
  const SID = "w" + Date.now().toString(36) + Math.random().toString(36).slice(2, 9), outbox = { patch: {}, timer: 0, busy: false };
  let tapes = [], sheets = [], tapeDrag = null, sheetDrag = null, rip = null, liftDrag = null, peels = [], lifts = [], peelRaf = 0, hoverK = "", tipped = false;
  let lapse = null, lapseEl = null, pick = null, cut = null, caps = null, tapeL = null, sheetL = null, layRaf = 0, ovRaf = 0, hint = "", cardPat = null;
  let ink = null, who = null, inkRaf = 0, liveSrc = null, liveTree = {}, liveTimer = 0, head = "std", canCursor = true;
  function tile(p, cv) {
    const r = p < 2 ? SX : SX / 2;
    cv.width = Math.round(WX * r); cv.height = Math.round(WY * r);
    cv.style.setProperty("--p", p);
    if (!cv.parentNode) el.append(cv);
    const t = { p, r, cv, c: cv.getContext("2d"), job: null, last: "", dirty: false };
    tiles.set(p, t);
    return t;
  }
  tile(0, home);
  tile(1, document.createElement("canvas"));

  try {
    rainbow = localStorage.getItem("gl-rainbow") === "1";
    canCursor = localStorage.getItem("gl-wall-can") !== "0";
    const h = localStorage.getItem("gl-wall-cap");
    if (HEAD_IDS.has(h)) head = h;
  } catch (e) {}
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

  const mapView = (t) => ({ x0: t.p * WX, y0: 0, r: t.r });
  const nearMap = (op, f) => tiles.forEach((t) => { if (hits(op, t.p * WX, 0, (t.p + 1) * WX, WY)) f(t); });

  function redraw(t) {
    if (t.job) { t.dirty = true; return; }
    const back = document.createElement("canvas");
    back.width = t.cv.width; back.height = t.cv.height;
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

  const viewNow = () => { const ppu = k0 * Z; return { x0: cx - W / 2 / ppu, y0: cy - H / 2 / ppu, r: ppu * DPR() }; };

  function present() {
    if (!active) return;
    const ppu = k0 * Z, dpr = DPR();
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
    if (layers.length) { drawOverlays(); freshen(); }
    if (others.size) placeMates();
    if (others.size || ghosts.size) inkSoon();
  }

  function replayLive(t) {
    if (!live || !t.ready || (!t.mode && t.L !== level)) return;
    const pt = painterFor(live, t.c, t.v, t.mode || "wall", alive);
    for (let i = 0; i < live.d.length; i += 2) pt.add(...at(live, i, t.v));
    pt.n = live.d.length;
    reset(t.c);
    live.ps.set(t, pt);
  }

  function overlay(kind) {
    const cv = document.createElement("canvas");
    cv.className = "wv-ov";
    cv.hidden = true;
    view.append(cv);
    return { kind, cv, c: cv.getContext("2d"), cache: null, tile: null, job: null, timer: 0 };
  }
  const wants = (L, op) => !!op.mask && (L.kind === "tape" ? op.mask.tapeIds.some((id) => id && alive.t.has(id)) : op.mask.sheets.some((s) => s.key && alive.s.has(s.key)));
  const layerOn = (L) => (L.kind === "tape" ? tapes.length > 0 || !!tapeDrag || peels.length > 0 : sheets.length > 0 || lifts.length > 0);
  const inView = (q) => { const v = viewNow(), ppu = k0 * Z; return q.bb[2] >= v.x0 && q.bb[0] <= v.x0 + W / ppu && q.bb[3] >= v.y0 && q.bb[1] <= v.y0 + H / ppu; };

  function sizeLayers() {
    const w = Math.max(1, Math.round(W * DPR())), h = Math.max(1, Math.round(H * DPR()));
    [...layers.map((L) => L.cv), ink].forEach((cv) => { if (cv && (cv.width !== w || cv.height !== h)) { cv.width = w; cv.height = h; } });
  }

  function forgetLayer(L) {
    clearTimeout(L.timer);
    L.timer = 0; L.job = null;
    if (live && L.tile) live.ps.delete(L.tile);
    L.tile = null; L.cache = null;
  }

  function rerender(L, now) {
    clearTimeout(L.timer);
    L.timer = setTimeout(() => {
      L.timer = 0;
      if (!active || !layerOn(L)) return;
      const v = viewNow(), ppu = k0 * Z, m = 60 / ppu, back = document.createElement("canvas");
      back.width = L.cv.width; back.height = L.cv.height;
      const list = opsIn(v.x0 - m, v.y0 - m, v.x0 + W / ppu + m, v.y0 + H / ppu + m).filter((op) => wants(L, op));
      L.job = { list, i: 0, back, c: back.getContext("2d"), v };
      if (!layRaf) layRaf = requestAnimationFrame(layerPump);
    }, now ? 0 : 160);
  }

  function layerPump() {
    layRaf = 0;
    const t0 = performance.now();
    for (const L of layers) {
      const j = L.job;
      if (!j) continue;
      while (j.i < j.list.length && performance.now() - t0 < 8) paintOp(j.list[j.i++], j.c, j.v, L.kind, alive);
      if (j.i < j.list.length) break;
      L.job = null;
      if (live && L.tile) live.ps.delete(L.tile);
      L.cache = j.back;
      L.tile = { c: j.c, v: j.v, mode: L.kind, ready: true, layer: L };
      if (live && wants(L, live)) replayLive(L.tile);
      drawLayer(L);
    }
    if (layers.some((L) => L.job)) layRaf = requestAnimationFrame(layerPump);
  }

  function freshen() {
    const v = viewNow();
    layers.forEach((L) => {
      if (!layerOn(L) || (L === tapeL && peels.length)) return;
      const tv = L.tile && L.tile.v;
      if (!tv) { if (!L.job && !L.timer) rerender(L, true); return; }
      if (tv.x0 !== v.x0 || tv.y0 !== v.y0 || tv.r !== v.r || L.cache.width !== L.cv.width || L.cache.height !== L.cv.height) rerender(L);
    });
  }

  function drawOverlays() {
    if (ovRaf) { cancelAnimationFrame(ovRaf); ovRaf = 0; }
    layers.forEach(drawLayer);
  }
  function overlaysSoon() { if (!ovRaf) ovRaf = requestAnimationFrame(() => { ovRaf = 0; layers.forEach(drawLayer); }); }

  const drawCache = (c, cache, tv, v) => { const k = v.r / tv.r; c.drawImage(cache, (tv.x0 - v.x0) * v.r, (tv.y0 - v.y0) * v.r, cache.width * k, cache.height * k); };

  function drawLayer(L) {
    if (!active) return;
    if (!layerOn(L)) { if (!L.cv.hidden) L.cv.hidden = true; return; }
    L.cv.hidden = false;
    const c = L.c, v = viewNow(), Wc = L.cv.width, Hc = L.cv.height;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalAlpha = 1;
    c.globalCompositeOperation = "source-over";
    c.clearRect(0, 0, Wc, Hc);
    if (L === tapeL) drawTapes(L, c, v, Wc, Hc);
    else drawSheets(L, c, v, Wc, Hc);
  }

  function tapeFill(c, t, v, Wc, Hc, alpha) {
    const q = toCanvas(t.poly, v, Wc, Hc);
    if (!q) return null;
    const d = DPR(), dx = t.b[0] - t.a[0], dy = t.b[1] - t.a[1], len = Math.hypot(dx, dy) || 1, wp = t.w * v.r;
    const mx = ((t.a[0] + t.b[0]) / 2 - v.x0) * v.r, my = ((t.a[1] + t.b[1]) / 2 - v.y0) * v.r;
    c.globalAlpha = alpha;
    c.save(); c.translate(d, 1.5 * d); c.fillStyle = "rgba(60,40,0,.28)"; c.beginPath(); trail(c, q); c.fill(); c.restore();
    let fill = TAPE;
    if (wp < 5000 && Math.abs(mx) < 1e6 && Math.abs(my) < 1e6) {
      const nx = ((-dy / len) * wp) / 2, ny = ((dx / len) * wp) / 2, g = c.createLinearGradient(mx + nx, my + ny, mx - nx, my - ny);
      g.addColorStop(0, TAPE_LO); g.addColorStop(0.2, TAPE); g.addColorStop(0.55, TAPE_HI); g.addColorStop(0.85, TAPE); g.addColorStop(1, TAPE_LO);
      fill = g;
    }
    c.fillStyle = fill;
    c.beginPath(); trail(c, q); c.fill();
    c.strokeStyle = "rgba(120,92,36,.5)"; c.lineWidth = d; c.stroke();
    c.globalAlpha = 1;
    return q;
  }

  function tab(c, t, v) {
    const d = DPR(), dx = t.b[0] - t.a[0], dy = t.b[1] - t.a[1], len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len, hw = t.w / 2;
    const k = Math.min(t.w * 0.55, (TOUCH ? 16 : 11) / (k0 * Z), len * 0.3);
    const cxw = t.a[0] - uy * hw, cyw = t.a[1] + ux * hw, P = (x, y) => [(x - v.x0) * v.r, (y - v.y0) * v.r];
    const A = P(cxw, cyw), B = P(cxw + ux * k, cyw + uy * k), C = P(cxw + uy * k, cyw - ux * k), T = [B[0] + C[0] - A[0], B[1] + C[1] - A[1]];
    if ([A, B, C].some(([x, y]) => Math.abs(x) > 1e6 || Math.abs(y) > 1e6)) return;
    c.fillStyle = "rgba(60,40,0,.3)";
    c.beginPath(); c.moveTo(B[0] + d, B[1] + 2 * d); c.lineTo(T[0] + d, T[1] + 2 * d); c.lineTo(C[0] + d, C[1] + 2 * d); c.closePath(); c.fill();
    c.fillStyle = TAPE_HI;
    c.beginPath(); c.moveTo(B[0], B[1]); c.lineTo(T[0], T[1]); c.lineTo(C[0], C[1]); c.closePath(); c.fill();
    c.strokeStyle = "rgba(120,92,36,.7)"; c.lineWidth = d; c.stroke();
  }

  function drawTapes(L, c, v, Wc, Hc) {
    const qs = [], tv = L.tile && L.tile.v, ripping = (t) => (rip && rip.tape === t) || !!t.g;
    tapes.forEach((t) => { if (ripping(t)) return; const q = tapeFill(c, t, v, Wc, Hc, 1); if (q) qs.push(q); });
    if (qs.length && L.cache && tv) { c.save(); c.beginPath(); qs.forEach((q) => trail(c, orient(q))); c.clip(); drawCache(c, L.cache, tv, v); c.restore(); }
    tapes.forEach((t) => {
      if (rip && rip.tape === t) ripFrame(c, t, v, Wc, Hc, rip.p, rip.fromB, L.cache, tv, rip.hand, 1);
      else if (t.g) ripFrame(c, t, v, Wc, Hc, Math.abs(t.g), t.g < 0, L.cache, tv, null, 1);
      else if (tool === "tape" && !lapse) tab(c, t, v);
    });
    peels.forEach((P) => P.list.forEach((e) => { const s = peelAt(P, e); ripFrame(c, e.t, v, Wc, Hc, s.p, e.fromB, P.cache, P.v, s.hand, s.fade); }));
    if (tapeDrag) tapeFill(c, { ...tapeDrag, poly: strip(tapeDrag.a, tapeDrag.b, tapeDrag.w, tapeDrag.teeth) }, v, Wc, Hc, 0.85);
  }

  function ripFrame(c, t, v, Wc, Hc, p, fromB, cache, cv, hand, fade) {
    const d = DPR(), A = fromB ? t.b : t.a, B = fromB ? t.a : t.b;
    const dx = B[0] - A[0], dy = B[1] - A[1], len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len, nx = -uy, ny = ux;
    const px = A[0] + ux * len * p, py = A[1] + uy * len * p, big = len + t.w * 4, hw = t.w / 2;
    if (p < 1) {
      const half = toCanvas([px + nx * big, py + ny * big, px - nx * big, py - ny * big, px - nx * big + ux * big, py - ny * big + uy * big, px + nx * big + ux * big, py + ny * big + uy * big], v, Wc, Hc);
      if (half) {
        c.save(); c.beginPath(); trail(c, half); c.clip();
        const q = tapeFill(c, t, v, Wc, Hc, 1);
        if (q && cache && cv) { c.beginPath(); trail(c, q); c.clip(); drawCache(c, cache, cv, v); }
        c.restore();
      }
    }
    if (p <= 0 || fade <= 0) return;
    let flap;
    if (hand) {
      const fx = hand[0] - px, fy = hand[1] - py, fl = Math.hypot(fx, fy) || 1;
      let mx = (-fy / fl) * hw * 0.9, my = (fx / fl) * hw * 0.9;
      if (mx * nx + my * ny < 0) { mx = -mx; my = -my; }
      flap = [px + nx * hw, py + ny * hw, px - nx * hw, py - ny * hw, hand[0] - mx, hand[1] - my, hand[0] + mx, hand[1] + my];
    } else {
      const cl = Math.min(t.w * 0.9, len * p);
      flap = [px + nx * hw, py + ny * hw, px - nx * hw, py - ny * hw, px - ux * cl - nx * hw * 0.82, py - uy * cl - ny * hw * 0.82, px - ux * cl + nx * hw * 0.82, py - uy * cl + ny * hw * 0.82];
    }
    const q = toCanvas(flap, v, Wc, Hc);
    if (!q) return;
    c.globalAlpha = fade;
    c.save(); c.translate(2 * d, 3 * d); c.fillStyle = "rgba(40,25,0,.3)"; c.beginPath(); trail(c, q); c.fill(); c.restore();
    c.fillStyle = TAPE_HI; c.beginPath(); trail(c, q); c.fill();
    c.strokeStyle = "rgba(120,92,36,.6)"; c.lineWidth = d; c.stroke();
    c.globalAlpha = 1;
  }

  function peelAt(P, e) {
    const el = Math.max(0, performance.now() - P.t0 - e.delay), u = clamp(el / P.dur, 0, 1), p = e.p0 + (1 - e.p0) * u * u * (3 - 2 * u);
    if (!e.hand) return { p, fade: 1 - clamp((p - 0.85) / 0.15, 0, 1), hand: null };
    const k = el / 1000;
    return { p, fade: 1 - clamp((u - 0.55) / 0.45, 0, 1), hand: [e.hand[0] + e.dir[0] * k, e.hand[1] + e.dir[1] * k] };
  }

  function peelAway(list, hand, dir) {
    if (!list.length) return;
    peels.push({ t0: performance.now(), dur: hand ? 260 : 520, list: list.map((t, i) => ({ t, fromB: t.g < 0, p0: Math.abs(t.g || 0), delay: hand ? 0 : i * 70, hand, dir })), cache: tapeL.tile ? tapeL.cache : null, v: tapeL.tile && tapeL.tile.v });
    rerender(tapeL, true);
    if (!peelRaf) peelRaf = requestAnimationFrame(animate);
  }

  function liftAway(sh, off, vel, k) {
    lifts.push({ sh, t0: performance.now(), dur: 380, off, vel, k, cache: sheetL.tile ? sheetL.cache : null, v: sheetL.tile && sheetL.tile.v });
    rerender(sheetL, true);
    if (!peelRaf) peelRaf = requestAnimationFrame(animate);
  }

  function animate() {
    peelRaf = 0;
    const now = performance.now();
    peels = peels.filter((P) => now - P.t0 < P.dur + 70 * (P.list.length - 1) + 60);
    lifts = lifts.filter((F) => now - F.t0 < F.dur + 30);
    drawOverlays();
    if (peels.length || lifts.length) peelRaf = requestAnimationFrame(animate);
  }

  function cardFill(c, v, sh) {
    const per = (sh.s * v.r) / 34, ox = (sh.outline[0] - v.x0) * v.r, oy = (sh.outline[1] - v.y0) * v.r;
    if (per < 3 || per > 600 || Math.abs(ox) > 1e6 || Math.abs(oy) > 1e6 || typeof DOMMatrix === "undefined") return CARD;
    if (!cardPat) {
      cardPat = document.createElement("canvas");
      cardPat.width = 4; cardPat.height = 8;
      const x = cardPat.getContext("2d");
      x.fillStyle = CARD; x.fillRect(0, 0, 4, 8);
      x.fillStyle = "#b5884c"; x.fillRect(0, 0, 4, 2);
      x.fillStyle = "#d1aa70"; x.fillRect(0, 4, 4, 1);
    }
    const pt = c.createPattern(cardPat, "repeat");
    if (!pt || !pt.setTransform) return CARD;
    pt.setTransform(new DOMMatrix().translateSelf(ox, oy).rotateSelf((sh.a * 180) / Math.PI).scaleSelf(per / 8));
    return pt;
  }

  function drawSheets(L, c, v, Wc, Hc) {
    const tv = L.tile && L.tile.v;
    sheets.forEach((sh) => {
      const D = liftDrag && liftDrag.sheet === sh ? liftDrag : sh.bounce || null;
      drawSheet(c, sh, v, Wc, Hc, L.cache, tv, D ? D.k * 0.5 : 0, D ? D.off : null, !D, 1);
    });
    const now = performance.now();
    lifts.forEach((F) => {
      const u = clamp((now - F.t0) / F.dur, 0, 1), dt = (now - F.t0) / 1000, k = F.k + (1 - F.k) * u * (2 - u);
      drawSheet(c, F.sh, v, Wc, Hc, F.cache, F.v, k, [F.off[0] + F.vel[0] * dt, F.off[1] + F.vel[1] * dt], false, 1 - u);
    });
  }

  function drawSheet(c, sh, v, Wc, Hc, cache, cv, k, off, tools, fade) {
    const o = toCanvas(sh.outline, v, Wc, Hc);
    if (!o || fade <= 0) return;
    const hs = sh.holesW.map((h) => toCanvas(h, v, Wc, Hc)).filter(Boolean), d = DPR();
    const path = () => { c.beginPath(); trail(c, o); hs.forEach((h) => trail(c, h)); };
    c.save();
    c.globalAlpha = fade * (1 - 0.12 * k);
    if (off || k) {
      const mx = clamp((sh.x - v.x0) * v.r, -1e5, 1e5), my = clamp((sh.y - v.y0) * v.r, -1e5, 1e5), s = 1 + 0.07 * k;
      c.translate(mx + (off ? off[0] * d : 0), my + (off ? off[1] * d : 0)); c.scale(s, s); c.translate(-mx, -my);
    }
    c.save(); c.translate((3 + 18 * k) * d, (4 + 24 * k) * d); c.fillStyle = `rgba(0,0,0,${(0.32 - 0.1 * k).toFixed(3)})`; path(); c.fill("evenodd"); c.restore();
    c.fillStyle = cardFill(c, v, sh); path(); c.fill("evenodd");
    c.strokeStyle = "rgba(74,44,14,.75)"; c.lineWidth = d; c.stroke();
    if (cache && cv) { c.save(); path(); c.clip("evenodd"); drawCache(c, cache, cv, v); c.restore(); }
    if (tools && tool === "stencil" && !lapse) {
      const f = foldOf(sh, v), A = [f.x0 + f.u[0] * f.ts, f.y0 + f.u[1] * f.ts], B = [f.x0 + f.w[0] * f.ts, f.y0 + f.w[1] * f.ts], T = [A[0] + B[0] - f.x0, A[1] + B[1] - f.y0];
      c.fillStyle = "rgba(0,0,0,.28)";
      c.beginPath(); c.moveTo(A[0] + d, A[1] + 2 * d); c.lineTo(T[0] + 2 * d, T[1] + 3 * d); c.lineTo(B[0] + d, B[1] + 2 * d); c.closePath(); c.fill();
      c.fillStyle = "#e2bd84";
      c.beginPath(); c.moveTo(A[0], A[1]); c.lineTo(T[0], T[1]); c.lineTo(B[0], B[1]); c.closePath(); c.fill();
      c.strokeStyle = "rgba(74,44,14,.8)"; c.lineWidth = d; c.stroke();
      const [hx, hy] = handleAt(sh, v), s = (TOUCH ? 9 : 6) * d;
      c.fillStyle = "#fff"; c.strokeStyle = "#000"; c.lineWidth = d;
      c.fillRect(hx - s, hy - s, s * 2, s * 2); c.strokeRect(hx - s, hy - s, s * 2, s * 2);
      c.beginPath(); c.arc(hx, hy, s * 0.5, -Math.PI * 0.9, Math.PI * 0.4); c.stroke();
    }
    c.restore();
  }

  function foldOf(sh, v) {
    const d = DPR(), o = sh.outline, x0 = (o[0] - v.x0) * v.r, y0 = (o[1] - v.y0) * v.r;
    const e1 = [(o[2] - o[0]) * v.r, (o[3] - o[1]) * v.r], e2 = [(o[6] - o[0]) * v.r, (o[7] - o[1]) * v.r];
    const L1 = Math.hypot(e1[0], e1[1]) || 1, L2 = Math.hypot(e2[0], e2[1]) || 1;
    return { x0, y0, u: [e1[0] / L1, e1[1] / L1], w: [e2[0] / L2, e2[1] / L2], ts: Math.min((TOUCH ? 30 : 22) * d, L1 * 0.22, L2 * 0.22) };
  }

  function sheetAt(sh, u, w) {
    const ca = Math.cos(sh.a) * sh.s, sa = Math.sin(sh.a) * sh.s;
    return [sh.x + (u - 0.5) * ca - (w - 0.5) * sa, sh.y + (u - 0.5) * sa + (w - 0.5) * ca];
  }
  const boxOf = (p) => { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (let i = 0; i < p.length; i += 2) { x0 = Math.min(x0, p[i]); x1 = Math.max(x1, p[i]); y0 = Math.min(y0, p[i + 1]); y1 = Math.max(y1, p[i + 1]); } return [x0, y0, x1, y1]; };
  function shapeSheet(sh) {
    const M = SHEET_M;
    sh.outline = [...sheetAt(sh, -M, -M), ...sheetAt(sh, 1 + M, -M), ...sheetAt(sh, 1 + M, 1 + M), ...sheetAt(sh, -M, 1 + M)];
    sh.holesW = sh.st.holes.map((h) => {
      const o = new Array(h.length);
      for (let i = 0; i < h.length; i += 2) { const [x, y] = sheetAt(sh, h[i], h[i + 1]); o[i] = x; o[i + 1] = y; }
      return o;
    });
    sh.bb = boxOf(sh.outline);
  }
  function shapeTape(t) { t.poly = strip(t.a, t.b, t.w, t.teeth); t.bb = boxOf(t.poly); }
  const handleAt = (sh, v) => { const [x, y] = sheetAt(sh, 1 + SHEET_M, 1 + SHEET_M); return [(x - v.x0) * v.r, (y - v.y0) * v.r]; };
  const canvasPt = (e) => { const r = view.getBoundingClientRect(), d = DPR(); return [(e.clientX - r.left) * d, (e.clientY - r.top) * d]; };
  const onHandle = (sh, P, v) => { const [hx, hy] = handleAt(sh, v); return Math.hypot(P[0] - hx, P[1] - hy) <= (TOUCH ? 24 : 12) * DPR(); };
  function onFold(sh, P, v) {
    const f = foldOf(sh, v), rx = P[0] - f.x0, ry = P[1] - f.y0, a1 = rx * f.u[0] + ry * f.u[1], a2 = rx * f.w[0] + ry * f.w[1], m = 8 * DPR();
    return a1 > -m && a2 > -m && a1 + a2 < f.ts * 1.2 + m;
  }
  function inside(p, [x, y]) {
    let hit = false;
    for (let i = 0, j = p.length - 2; i < p.length; j = i, i += 2) if ((p[i + 1] > y) !== (p[j + 1] > y) && x < ((p[j] - p[i]) * (y - p[i + 1])) / (p[j + 1] - p[i + 1]) + p[i]) hit = !hit;
    return hit;
  }
  const vtag = () => Math.random().toString(36).slice(2, 8) || "v";
  const track = (m, e) => { m.push([performance.now(), e.clientX, e.clientY]); while (m.length > 6) m.shift(); };
  const speed = (m) => { if (m.length < 2) return [0, 0]; const a = m[0], b = m[m.length - 1], dt = Math.max(16, b[0] - a[0]) / 1000; return [(b[1] - a[1]) / dt, (b[2] - a[2]) / dt]; };

  function placeStencil(st) {
    if (sheets.filter(inView).length >= MAX_SHEETS) { flash("TOO MANY STENCILS HERE, LIFT ONE OFF FIRST"); return; }
    const ppu = k0 * Z, p = Math.max(0, Math.floor(cx / WX));
    const sh = { id: pushId(), kind: "s", p, x: cx, y: cy, s: (Math.min(W, H) * 0.5) / ppu, a: 0, v: vtag(), name: String(st.name || "").slice(0, 20), st: { holes: decHoles(encHoles(st.holes)) } };
    if (!sh.st.holes.length) return;
    shapeSheet(sh);
    props.set(sh.id, sh);
    reindex();
    rerender(sheetL, true);
    save("props/" + sh.id, wire(sh));
    tool = "stencil";
    sync();
    drawOverlays();
    flash("DRAG IT INTO PLACE AND PAINT OVER IT, THEN PULL THE FOLDED CORNER");
  }

  function grabSheet(e) {
    const P = canvasPt(e), v = viewNow(), w = wallPoint(e.clientX, e.clientY);
    for (let i = sheets.length - 1; i >= 0; i--) {
      if (onFold(sheets[i], P, v)) { startLift(e, sheets[i]); return; }
      if (onHandle(sheets[i], P, v)) { startDrag(e, sheets[i], true, w); return; }
    }
    for (let i = sheets.length - 1; i >= 0; i--) if (inside(sheets[i].outline, w)) { startDrag(e, sheets[i], false, w); return; }
    pick.open();
  }
  function startDrag(e, sh, turn, at) {
    try { view.setPointerCapture(e.pointerId); } catch (err) {}
    sheetDrag = { id: e.pointerId, sheet: sh, turn, at, x: sh.x, y: sh.y, moved: false };
  }
  function dragSheet(e) {
    const p = wallPoint(e.clientX, e.clientY), sd = sheetDrag, sh = sd.sheet;
    if (!sd.moved) { sd.moved = true; sh.v = vtag(); reindex(); forgetLayer(sheetL); rerender(sheetL, true); }
    if (sd.turn) {
      const dx = p[0] - sh.x, dy = p[1] - sh.y;
      sh.s = Math.max(36 / (k0 * Z), Math.hypot(dx, dy) / ((0.5 + SHEET_M) * Math.SQRT2));
      sh.a = Math.atan2(dy, dx) - Math.PI / 4;
    } else { sh.x = sd.x + p[0] - sd.at[0]; sh.y = sd.y + p[1] - sd.at[1]; }
    shapeSheet(sh);
    pushProp(sh, { x: sh.x - sh.p * WX, y: sh.y, s: sh.s, r: sh.a, v: sh.v });
    overlaysSoon();
  }
  function endDrag() {
    const sd = sheetDrag;
    sheetDrag = null;
    if (sd && sd.moved && props.has(sd.sheet.id)) flushProp(sd.sheet);
    drawOverlays();
  }

  function startLift(e, sh) {
    try { view.setPointerCapture(e.pointerId); } catch (err) {}
    sh.bounce = null;
    liftDrag = { id: e.pointerId, sheet: sh, start: [e.clientX, e.clientY], off: [0, 0], k: 0, m: [] };
    track(liftDrag.m, e);
    view.style.cursor = "grabbing";
    drawOverlays();
  }
  function moveLift(e) {
    const D = liftDrag;
    D.off = [e.clientX - D.start[0], e.clientY - D.start[1]];
    track(D.m, e);
    D.k = clamp(Math.hypot(D.off[0], D.off[1]) / Math.max(50, D.sheet.s * k0 * Z * 0.5), 0, 1);
    if (D.k >= 1) { endLift(false); return; }
    overlaysSoon();
  }
  function endLift(cancel) {
    const D = liftDrag;
    if (!D) return;
    liftDrag = null;
    const sh = D.sheet, [vx, vy] = speed(D.m), fast = Math.hypot(vx, vy) > 900;
    if (!cancel && props.has(sh.id) && (D.k >= 0.35 || (fast && D.k > 0.06))) {
      let vel = [vx, vy];
      if (Math.hypot(vx, vy) < 300) { const l = Math.hypot(D.off[0], D.off[1]) || 1; vel = [(D.off[0] / l) * 650, (D.off[1] / l) * 650 - 150]; }
      clearTimeout(sh.pt); sh.pend = null;
      props.delete(sh.id);
      reindex();
      liftAway(sh, D.off, vel, D.k * 0.5);
      save("props/" + sh.id, null, "DELETE");
    } else {
      const t0 = performance.now(), off = D.off, k = D.k;
      const back = () => {
        const u = clamp((performance.now() - t0) / 220, 0, 1), e2 = (1 - u) * (1 - u);
        sh.bounce = u < 1 ? { off: [off[0] * e2, off[1] * e2], k: k * e2 } : null;
        drawOverlays();
        if (u < 1) requestAnimationFrame(back);
      };
      requestAnimationFrame(back);
    }
    cursor();
    sync();
  }

  function ripAt(e) {
    const [x, y] = wallPoint(e.clientX, e.clientY), ppu = k0 * Z, reach = 10 / ppu;
    for (let i = tapes.length - 1; i >= 0; i--) {
      const t = tapes[i];
      for (const fromB of [false, true]) {
        const A = fromB ? t.b : t.a, B = fromB ? t.a : t.b, dx = B[0] - A[0], dy = B[1] - A[1], len = Math.hypot(dx, dy) || 1;
        const along = ((x - A[0]) * dx + (y - A[1]) * dy) / len, across = Math.abs((x - A[0]) * -dy + (y - A[1]) * dx) / len;
        if (along >= -reach && along <= Math.min(len * 0.45, Math.max(t.w * 1.2, 24 / ppu)) && across <= t.w / 2 + reach) return { tape: t, fromB };
      }
    }
    return null;
  }
  function startRip(e, hit) {
    try { view.setPointerCapture(e.pointerId); } catch (err) {}
    rip = { id: e.pointerId, tape: hit.tape, fromB: hit.fromB, p: Math.abs(hit.tape.g || 0), hand: wallPoint(e.clientX, e.clientY), m: [] };
    track(rip.m, e);
    view.style.cursor = "grabbing";
    drawOverlays();
  }
  function moveRip(e) {
    const R = rip, t = R.tape, A = R.fromB ? t.b : t.a, len = Math.hypot(t.b[0] - t.a[0], t.b[1] - t.a[1]) || 1;
    R.hand = wallPoint(e.clientX, e.clientY);
    track(R.m, e);
    R.far = Math.hypot(R.hand[0] - A[0], R.hand[1] - A[1]) * k0 * Z;
    R.p = Math.max(R.p, clamp((Math.hypot(R.hand[0] - A[0], R.hand[1] - A[1]) * 0.75) / len, 0, 1));
    t.g = R.fromB ? -R.p : R.p;
    pushProp(t, { g: Math.round(t.g * 1000) / 1000 });
    if (R.p >= 1) { endRip(false); return; }
    overlaysSoon();
  }
  function endRip(cancel) {
    const R = rip;
    if (!R) return;
    rip = null;
    const t = R.tape, [vx, vy] = speed(R.m), fast = Math.hypot(vx, vy) > 900;
    if (!cancel && props.has(t.id) && (R.p >= 0.4 || (R.far || 0) >= 110 || (fast && R.p > 0.06))) {
      const ppu = k0 * Z, A = R.fromB ? t.b : t.a;
      let dir = [vx / ppu, vy / ppu];
      if (Math.hypot(vx, vy) < 300) { const fx = R.hand[0] - A[0], fy = R.hand[1] - A[1], l = Math.hypot(fx, fy) || 1; dir = [((fx / l) * 700) / ppu, ((fy / l) * 700) / ppu]; }
      t.g = R.fromB ? -R.p : R.p;
      clearTimeout(t.pt); t.pend = null;
      props.delete(t.id);
      reindex();
      peelAway([t], R.hand, dir);
      save("props/" + t.id, null, "DELETE");
    } else {
      const t0 = performance.now(), p0 = R.p, sg = R.fromB ? -1 : 1;
      const back = () => {
        if (!props.has(t.id) || rip) return;
        const u = clamp((performance.now() - t0) / 180, 0, 1);
        t.g = u < 1 ? sg * p0 * (1 - u) * (1 - u) : 0;
        drawOverlays();
        if (u < 1) requestAnimationFrame(back);
      };
      requestAnimationFrame(back);
      pushProp(t, { g: 0 });
      flushProp(t);
    }
    cursor();
    sync();
  }

  function startTape(e) {
    const hit = ripAt(e);
    if (hit) { startRip(e, hit); return; }
    if (tapes.filter(inView).length >= MAX_TAPES) { flash("THAT IS A LOT OF TAPE HERE, RIP SOME OFF FIRST"); return; }
    try { view.setPointerCapture(e.pointerId); } catch (err) {}
    const a = wallPoint(e.clientX, e.clientY);
    tapeDrag = { id: e.pointerId, a, b: a, w: TAPES[size] / (k0 * Z), teeth: Array.from({ length: 8 }, () => Math.round(Math.random() * 9) / 9) };
    drawOverlays();
  }
  function layTape() {
    const t = tapeDrag;
    tapeDrag = null;
    if (Math.hypot(t.b[0] - t.a[0], t.b[1] - t.a[1]) * k0 * Z < 10) { flash("DRAG ACROSS THE WALL TO LAY A STRIP OF TAPE"); drawOverlays(); return; }
    const q = { id: pushId(), kind: "t", p: Math.max(0, Math.floor(Math.min(t.a[0], t.b[0]) / WX)), a: t.a, b: t.b, w: t.w, teeth: t.teeth, g: 0 };
    shapeTape(q);
    props.set(q.id, q);
    reindex();
    if (!tapeL.tile && !tapeL.job) rerender(tapeL, true);
    save("props/" + q.id, wire(q));
    if (!tipped) { tipped = true; flash("GRAB THE END OF A STRIP AND PULL TO RIP IT OFF"); }
    drawOverlays();
    sync();
  }

  function maskNow(p, z) {
    const near = (q) => q.bb[2] >= p * WX - 60 && q.bb[0] <= (p + 1) * WX + 60;
    const ts = tapes.filter(near), ss = sheets.filter(near);
    if (!ts.length && !ss.length) return null;
    const s = 2 ** z, b = p * WX, q = (poly) => poly.map((n, i) => Math.round((i % 2 ? n : n - b) * s) / s);
    return { tapes: ts.map((t) => q(t.poly)), tapeIds: ts.map((t) => t.id), sheets: ss.map((h) => ({ sheet: q(h.outline), holes: h.holesW.map(q), key: h.id + ":" + h.v })) };
  }

  function reindex() {
    tapes = []; sheets = [];
    alive.t.clear(); alive.s.clear();
    props.forEach((q) => { if (q.kind === "t") { tapes.push(q); alive.t.add(q.id); } else { sheets.push(q); alive.s.add(q.id + ":" + q.v); } });
    tapes.sort(older); sheets.sort(older);
  }

  const encHoles = (holes) => holes.map((h) => Array.from(h, (x) => Math.round(clamp(x, 0, 1) * 1000)).join(",")).join(";");
  const decHoles = (s) => String(s || "").split(";").map((q) => q.split(",").map((x) => +x / 1000)).filter((h) => h.length >= 6 && h.length % 2 === 0 && h.every((x) => x >= 0 && x <= 1));
  const isNum = (v) => typeof v === "number" && isFinite(v) && Math.abs(v) < 1e7;
  const SV = { ".sv": "timestamp" };

  function wire(q) {
    const b = q.p * WX;
    if (q.kind === "t") return { k: "t", p: q.p, ax: q.a[0] - b, ay: q.a[1], bx: q.b[0] - b, by: q.b[1], w: q.w, e: q.teeth.map((x) => Math.round(clamp(x, 0, 1) * 9)).join(""), t: SV };
    return { k: "s", p: q.p, x: q.x - b, y: q.y, s: q.s, r: q.a, h: encHoles(q.st.holes), v: q.v, n: q.name || "", t: SV };
  }
  function propOf(id, v) {
    if (!v || typeof v !== "object" || !/^[-_A-Za-z0-9]{1,24}$/.test(id) || !Number.isInteger(v.p) || v.p < 0) return null;
    const b = v.p * WX;
    if (v.k === "t") {
      if (![v.ax, v.ay, v.bx, v.by, v.w].every(isNum) || v.w <= 0 || typeof v.e !== "string" || !/^[0-9]{8}$/.test(v.e)) return null;
      const t = { id, kind: "t", p: v.p, a: [b + v.ax, v.ay], b: [b + v.bx, v.by], w: v.w, teeth: [...v.e].map((n) => +n / 9), g: isNum(v.g) ? clamp(v.g, -1, 1) : 0 };
      shapeTape(t);
      return t;
    }
    if (v.k === "s") {
      if (![v.x, v.y, v.s, v.r].every(isNum) || v.s <= 0 || typeof v.h !== "string" || typeof v.v !== "string") return null;
      const holes = decHoles(v.h);
      if (!holes.length) return null;
      const sh = { id, kind: "s", p: v.p, x: b + v.x, y: v.y, s: v.s, a: v.r, v: v.v, name: typeof v.n === "string" ? v.n.slice(0, 20) : "", st: { holes } };
      shapeSheet(sh);
      return sh;
    }
    return null;
  }

  const liveUrl = (path) => DB + "/" + LIVE + "/" + path + ".json";
  function save(path, data, method = "PUT", keep = false) {
    return fetch(liveUrl(path), { method, body: data === null ? undefined : JSON.stringify(data), keepalive: keep }).then((r) => { if (!r.ok) throw r.status; }).catch(() => {});
  }
  function pushProp(q, fields) {
    q.pend = { ...(q.pend || {}), ...fields };
    if (!q.pt) q.pt = setTimeout(() => flushProp(q), 120);
  }
  function flushProp(q) {
    clearTimeout(q.pt);
    q.pt = 0;
    const pend = q.pend;
    q.pend = null;
    if (pend && props.has(q.id)) save("props/" + q.id, { ...pend, t: SV }, "PATCH");
  }

  function upsert(id, raw) {
    const q = propOf(id, raw);
    if (!q) return;
    const old = props.get(id);
    if (old && old.kind !== q.kind) return;
    if (old && ((sheetDrag && sheetDrag.sheet === old) || (liftDrag && liftDrag.sheet === old) || (rip && rip.tape === old) || old.pend)) return;
    const moved = !!old && q.kind === "s" && old.v !== q.v;
    if (old) {
      ["p", "a", "b", "w", "teeth", "g", "x", "y", "s", "v", "name", "st"].forEach((k) => { if (k in q) old[k] = q[k]; });
      if (old.kind === "t") shapeTape(old); else shapeSheet(old);
    } else props.set(id, q);
    reindex();
    if (moved) forgetLayer(sheetL);
    layers.forEach((L) => { if (layerOn(L) && (moved || (!L.tile && !L.job))) rerender(L, true); });
    overlaysSoon();
  }
  function vanish(id) {
    const q = props.get(id);
    if (!q) return;
    if (rip && rip.tape === q) rip = null;
    if (sheetDrag && sheetDrag.sheet === q) sheetDrag = null;
    if (liftDrag && liftDrag.sheet === q) liftDrag = null;
    clearTimeout(q.pt);
    q.pend = null;
    props.delete(id);
    reindex();
    if (q.kind === "t") peelAway([q]);
    else liftAway(q, [0, 0], [30, -240], 0);
    sync();
  }

  function setIn(root, parts, value) {
    let o = root;
    for (let i = 0; i < parts.length - 1; i++) { if (!o[parts[i]] || typeof o[parts[i]] !== "object") o[parts[i]] = {}; o = o[parts[i]]; }
    const k = parts[parts.length - 1];
    if (value === null || value === undefined) delete o[k]; else o[k] = value;
  }
  function openLive() {
    if (liveSrc || !active || document.hidden || typeof EventSource === "undefined") return;
    liveTree = {};
    const src = (liveSrc = new EventSource(DB + "/" + LIVE + ".json"));
    src.addEventListener("put", (e) => { const m = message(e); if (m && typeof m.path === "string") liveEvent(m.path, m.data, false); });
    src.addEventListener("patch", (e) => { const m = message(e); if (m && typeof m.path === "string" && m.data && typeof m.data === "object") liveEvent(m.path, m.data, true); });
    src.onerror = () => {};
  }
  function closeLive() { if (liveSrc) { liveSrc.close(); liveSrc = null; } }
  function liveEvent(path, data, patch) {
    const parts = path.split("/").filter(Boolean), hit = { props: new Set(), who: new Set() }, all = { props: false, who: false };
    const mark = (segs) => {
      if (!segs.length) { all.props = all.who = true; return; }
      if (!(segs[0] in hit)) return;
      if (segs.length === 1) all[segs[0]] = true; else hit[segs[0]].add(segs[1]);
    };
    if (patch) Object.keys(data).forEach((k) => { const segs = [...parts, ...k.split("/").filter(Boolean)]; if (segs.length) setIn(liveTree, segs, data[k]); mark(segs); });
    else { if (!parts.length) liveTree = data && typeof data === "object" ? data : {}; else setIn(liveTree, parts, data); mark(parts); }
    if (all.props || hit.props.size) syncProps(all.props ? null : [...hit.props]);
    if (all.who || hit.who.size) syncWho(all.who ? null : [...hit.who], all.who);
  }
  function syncProps(ids) {
    const tree = liveTree.props && typeof liveTree.props === "object" ? liveTree.props : {};
    (ids || [...new Set([...props.keys(), ...Object.keys(tree)])]).forEach((id) => { if (tree[id] && typeof tree[id] === "object") upsert(id, tree[id]); else vanish(id); });
  }

  const panelHas = (op) => { const P = panels.get(op.p); return !!(P && P.seen[op.id]); };
  function syncWho(ids, snap) {
    const tree = liveTree.who && typeof liveTree.who === "object" ? liveTree.who : {}, now = Date.now();
    (ids || [...new Set([...others.keys(), ...Object.keys(tree)])]).forEach((sid) => {
      if (sid === SID) return;
      const raw = tree[sid], o = others.get(sid);
      if (!raw || typeof raw !== "object") { if (o) { o.el.remove(); others.delete(sid); if (o.op && !panelHas(o.op)) ghosts.set(o.op.id, { op: o.op, until: now + 6000 }); } return; }
      if (snap && !o) {
        const age = isNum(raw.t) || typeof raw.t === "number" ? now - raw.t : Infinity;
        if (age > 600000 && /^[A-Za-z0-9_-]{1,24}$/.test(sid)) save("who/" + sid, null, "DELETE");
        if (age > 15000) return;
      }
      const q = o || mate(sid);
      q.seen = performance.now();
      if (typeof raw.n === "string") q.name = raw.n.slice(0, 16);
      if (typeof raw.c === "string") q.c = raw.c.slice(0, 12);
      if (Number.isInteger(raw.p) && raw.p >= 0 && isNum(raw.x) && isNum(raw.y)) { q.p = raw.p; q.x = raw.x; q.y = raw.y; }
      const op = raw.s && typeof raw.s === "object" ? inkOp(raw.s) : null;
      if (q.op && (!op || op.id !== q.op.id) && !panelHas(q.op)) ghosts.set(q.op.id, { op: q.op, until: now + 6000 });
      q.op = op && !panelHas(op) ? op : null;
      placeMate(q);
    });
    inkSoon();
  }

  function mate(sid) {
    const el = document.createElement("div");
    el.className = "wv-mate";
    el.hidden = true;
    el.innerHTML = "<b></b><span></span>";
    who.append(el);
    const q = { sid, el, name: "", c: "", shownC: null, shownN: null, x: 0, y: 0, p: 0, seen: 0, op: null };
    others.set(sid, q);
    return q;
  }
  const mateBg = (c) => (c === "tape" ? TAPE : c === "card" ? CARD : c === "eraser" ? "#ff9ec7" : HEX.test(c) || c === "rainbow" || METAL[c] ? swatchBg(c) : "#fff");
  function placeMate(q) {
    if (!view || !active) return;
    const ppu = k0 * Z, sx = (q.p * WX + q.x - cx) * ppu + W / 2, sy = (q.y - cy) * ppu + H / 2;
    const on = performance.now() - q.seen < 8000 && sx > -30 && sy > -30 && sx < W + 30 && sy < H + 30;
    if (q.el.hidden === on) q.el.hidden = !on;
    if (!on) return;
    q.el.style.transform = `translate(${sx.toFixed(1)}px,${sy.toFixed(1)}px)`;
    if (q.shownC !== q.c) { q.shownC = q.c; q.el.firstChild.style.background = mateBg(q.c); }
    const n = q.name || "anon";
    if (q.shownN !== n) { q.shownN = n; q.el.lastChild.textContent = n; }
  }
  const placeMates = () => others.forEach(placeMate);

  function inkOp(s) {
    if (typeof s.id !== "string" || s.id.length > 24 || !Number.isInteger(s.p) || s.p < 0 || !isNum(s.w) || s.w <= 0 || !Number.isInteger(s.z) || s.z < 0 || s.z > 30) return null;
    if ((s.k !== "d" && s.k !== "c") || !okColor(s.k, s.c)) return null;
    const d = s.d && typeof s.d === "object" ? s.d : {}, sc = 2 ** -s.z, pts = [];
    Object.keys(d).filter((k) => /^c[0-9]{1,5}$/.test(k)).sort((a, b) => a.slice(1) - b.slice(1)).forEach((k) => { if (typeof d[k] === "string" && /^[0-9,]+$/.test(d[k])) d[k].split(",").forEach((n) => pts.push(+n * sc)); });
    if (pts.length % 2) pts.pop();
    if (pts.length < 2) return null;
    return { id: s.id, p: s.p, k: s.k, c: s.c, w: s.w, z: s.z, h: s.k === "d" && HEAD_IDS.has(s.h) ? s.h : undefined, d: pts, mask: null };
  }
  function drawInk() {
    inkRaf = 0;
    if (!ink) return;
    const c = ink.getContext("2d");
    c.setTransform(1, 0, 0, 1, 0, 0);
    reset(c);
    c.clearRect(0, 0, ink.width, ink.height);
    if (!active || lapse) return;
    const v = viewNow(), list = [];
    others.forEach((q) => { if (q.op) list.push(q.op); });
    ghosts.forEach((g) => list.push(g.op));
    list.sort(older).forEach((op) => paintOp(op, c, v));
  }
  const inkSoon = () => { if (!inkRaf && ink) inkRaf = requestAnimationFrame(drawInk); };
  function tidy() {
    const now = performance.now(), t = Date.now();
    let dirty = false;
    others.forEach((q) => { if (now - q.seen > 8000) { if (q.op) { q.op = null; dirty = true; } placeMate(q); } });
    ghosts.forEach((g, id) => { if (g.until < t) { ghosts.delete(id); dirty = true; } });
    if (dirty) inkSoon();
  }

  function pushLive(fields) {
    if (!active) return;
    Object.assign(outbox.patch, fields);
    if (!outbox.timer && !outbox.busy) outbox.timer = setTimeout(flushLive, 120);
  }
  function flushLive() {
    outbox.timer = 0;
    if (outbox.busy || !active) return;
    inkChunk();
    if (!Object.keys(outbox.patch).length) return;
    const data = { ...outbox.patch, t: SV };
    outbox.patch = {};
    outbox.busy = true;
    fetch(liveUrl("who/" + SID), { method: "PATCH", body: JSON.stringify(data) }).catch(() => {}).finally(() => {
      outbox.busy = false;
      if (active && (Object.keys(outbox.patch).length || (live && live.ink && live.ink.n < live.d.length))) outbox.timer = setTimeout(flushLive, 120);
    });
  }
  function inkChunk() {
    const op = live;
    if (!op || !op.ink || op.ink.n >= op.d.length) return;
    const s = 2 ** op.z, add = op.d.slice(op.ink.n).map((n) => Math.max(0, Math.round(n * s))).join(",");
    op.ink.n = op.d.length;
    const key = "c" + op.ink.c++, S = outbox.patch.s;
    if (S && typeof S === "object" && S.id === op.id) S.d[key] = add;
    else outbox.patch["s/d/" + key] = add;
  }
  const dropChunks = () => Object.keys(outbox.patch).forEach((k) => { if (k.startsWith("s/")) delete outbox.patch[k]; });
  function inkStart(op) {
    if (op.k === "e") return;
    op.ink = { n: 0, c: 0 };
    dropChunks();
    outbox.patch.s = { id: op.id, k: op.k, c: op.c, w: op.w, z: op.z, p: op.p, d: {} };
    if (op.h) outbox.patch.s.h = op.h;
    pushLive({});
  }
  function inkStop(op) {
    if (!op.ink) return;
    dropChunks();
    const S = outbox.patch.s;
    if (S && typeof S === "object" && S.id === op.id) { delete outbox.patch.s; return; }
    pushLive({ s: null });
  }
  function here(e) {
    if (!active || lapse) return;
    const [x, y] = wallPoint(e.clientX, e.clientY), p = Math.max(0, Math.floor(x / WX));
    pushLive({ p, x: x - p * WX, y, n: nick(), c: tintKey() });
  }
  const nick = () => { try { const m = wallet(); return m && typeof m.nick === "string" ? m.nick.slice(0, 16) : ""; } catch (e) { return ""; } };
  const tintKey = () => (tool === "tape" ? "tape" : tool === "stencil" ? "card" : tool === "eraser" ? "eraser" : tool === "bands" ? "rainbow" : tool === "spray" ? color : hex);
  function leaveLive() {
    clearTimeout(outbox.timer);
    outbox.timer = 0;
    outbox.patch = {};
    save("who/" + SID, null, "DELETE", true);
  }
  function hover(e) {
    if (lapse || e.buttons || !view) return;
    let k = "";
    if (tool === "tape") k = ripAt(e) ? "grab" : "";
    else if (tool === "stencil") {
      const P = canvasPt(e), v = viewNow(), w = wallPoint(e.clientX, e.clientY);
      k = sheets.some((sh) => onFold(sh, P, v)) ? "grab" : sheets.some((sh) => onHandle(sh, P, v)) ? "nwse-resize" : sheets.some((sh) => inside(sh.outline, w)) ? "move" : "pointer";
    }
    if (k === hoverK) return;
    if (k) { hoverK = k; view.style.cursor = k; } else cursor();
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
    if (ghosts.delete(op.id)) inkSoon();
    if (!painted && op.mask) layers.forEach((L) => { if (wants(L, op)) rerender(L); });
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
    layers.forEach((L) => { if (wants(L, it)) rerender(L, true); });
    where();
    return it;
  }
  const find = (id, p) => { const P = panels.get(p); return (P && P.ops.find((o) => o.id === id)) || null; };

  function bounds(op) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let i = 0; i < op.d.length; i += 2) { x0 = Math.min(x0, op.d[i]); x1 = Math.max(x1, op.d[i]); y0 = Math.min(y0, op.d[i + 1]); y1 = Math.max(y1, op.d[i + 1]); }
    const m = op.w * (op.c && op.c[0] === "n" ? 2.05 : op.h === "fat" ? 3.1 : op.h === "splat" ? 2.9 : op.h === "flat" ? 1.9 : 1.7), b = op.p * WX;
    op.bb = [b + x0 - m, y0 - m, b + x1 + m, y1 + m + op.w * (op.h === "drip" ? 11 : 6.5)];
    return op;
  }

  const okColor = (k, c) => typeof c === "string" && (HEX.test(c) || (k === "d" && (c === "rainbow" || c === "bands" || isMetal(c) || (c[0] === "n" && HEX.test(c.slice(1))))));
  function polys(str, sc, ox, oy, max) {
    if (str === undefined) return [];
    if (typeof str !== "string" || str.length > max || !/^[0-9,;-]+$/.test(str)) return null;
    const out = [];
    for (const q of str.split(";")) {
      const n = q.split(",").map(Number);
      if (n.length < 6 || n.length % 2 || n.some((x) => !Number.isInteger(x))) return null;
      out.push(n.map((x, i) => (x + (i % 2 ? oy : ox)) * sc));
    }
    return out;
  }
  function sheetsOf(str, sc, ox, oy) {
    if (str === undefined) return [];
    if (typeof str !== "string" || str.length > S_MAX || !/^[0-9,;|-]+$/.test(str)) return null;
    const out = [];
    for (const g of str.split("|")) { const ps = polys(g, sc, ox, oy, S_MAX); if (!ps || !ps.length) return null; out.push({ sheet: ps[0], holes: ps.slice(1), key: null }); }
    return out;
  }
  const idsOf = (q) => {
    if (typeof q !== "string" || q.length > Q_MAX || !/^[-_A-Za-z0-9,|:]*$/.test(q)) return { t: [], s: [] };
    const [t = "", h = ""] = q.split("|");
    return { t: t.split(","), s: h.split(",") };
  };

  function parse(id, v, p) {
    if (!v || typeof v !== "object" || (v.k !== "d" && v.k !== "e" && v.k !== "c")) return null;
    if (v.k !== "e" && !okColor(v.k, v.c)) return null;
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
    const tp = polys(v.m, sc, ox, oy, M_MAX), sh = sheetsOf(v.s, sc, ox, oy);
    if (!tp || !sh) return null;
    const d = pts.map((n, i) => (n + (i % 2 ? oy : ox)) * sc), ids = idsOf(v.q);
    sh.forEach((x, i) => { x.key = ids.s[i] || null; });
    const mask = tp.length || sh.length ? { tapes: tp, tapeIds: tp.map((_, i) => ids.t[i] || null), sheets: sh } : null;
    const h = v.k === "d" && HEAD_IDS.has(v.h) ? v.h : undefined;
    return bounds({ id, p, k: v.k, d, raw: v.d, c: v.k === "e" ? undefined : v.c, h, wr: clamp(v.w || 12, 3, 200), w: clamp(v.w || 12, 3, 200) * sc, z, o: z ? v.o : undefined, mask, m: v.m, s: v.s, q: mask ? v.q : undefined });
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
    if (ghosts.size) { P.ops.forEach((o) => ghosts.delete(o.id)); inkSoon(); }
    layers.forEach((L) => { if (layerOn(L)) rerender(L); });
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

  const body = (it) => {
    const b = { k: it.k, d: it.raw, w: it.wr };
    if (it.k !== "e") b.c = it.c;
    if (it.z) { b.z = it.z; b.o = it.o; }
    if (it.h) b.h = it.h;
    if (it.m) b.m = it.m;
    if (it.s) b.s = it.s;
    if (it.q) b.q = it.q;
    return b;
  };

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
    it.m = it.s = it.q = undefined;
    if (!it.mask) return;
    const b = it.p * WX, e = it.w * 2, [x0, y0, x1, y1] = it.bb;
    const cut = (poly) => {
      const q = clipRect(poly, x0 - b - e, y0 - e, x1 - b + e, y1 + e);
      if (!q) return null;
      const out = [];
      for (let i = 0; i < q.length; i += 2) {
        const a = Math.round(q[i] * s) - ox, c = Math.round(q[i + 1] * s) - oy;
        if (out.length && out[out.length - 2] === a && out[out.length - 1] === c) continue;
        out.push(a, c);
      }
      if (out.length > 4 && out[0] === out[out.length - 2] && out[1] === out[out.length - 1]) out.length -= 2;
      return out.length >= 6 ? out : null;
    };
    const join = (list) => list.map((p) => p.join(",")).join(";");
    const tp = [], tpIds = [], enc = (list) => list.map((x) => join([x.sheet, ...x.holes])).join("|");
    it.mask.tapes.forEach((t, i) => { const q = cut(t); if (q) { tp.push(q); tpIds.push(it.mask.tapeIds[i] || ""); } });
    let sh = [];
    it.mask.sheets.forEach((x) => { const sheet = cut(x.sheet); if (sheet) sh.push({ sheet, holes: x.holes.map(cut).filter(Boolean), key: x.key }); });
    for (let eps = 1; sh.length && enc(sh).length > S_MAX && eps < 1e9; eps *= 2) sh = sh.map((x) => ({ ...x, holes: x.holes.map((h) => simplify(h, eps)).filter((h) => h.length >= 6) }));
    if (enc(sh).length > S_MAX) sh = sh.map((x) => ({ ...x, holes: [] }));
    while (sh.length && enc(sh).length > S_MAX) sh.pop();
    while (tp.length && join(tp).length > M_MAX) { tp.pop(); tpIds.pop(); }
    if (tp.length) it.m = join(tp);
    if (sh.length) it.s = enc(sh);
    if (tp.length || sh.length) {
      const q = tpIds.join(",") + (sh.length ? "|" + sh.map((x) => x.key || "").join(",") : "");
      if (q.length <= Q_MAX) it.q = q;
    }
    const un = (p) => p.map((n, i) => (n + (i % 2 ? oy : ox)) / s);
    it.mask = tp.length || sh.length ? { tapes: tp.map(un), tapeIds: tpIds, sheets: sh.map((x) => ({ sheet: un(x.sheet), holes: x.holes.map(un), key: x.key })) } : null;
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

  const copyOf = (it) => ({ k: it.k, d: it.d.slice(), c: it.c, h: it.h, w: it.w, z: it.z, p: it.p, mask: it.mask });

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
    if (live || lapse) return;
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
    if (live || lapse) return;
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
    if (live.mask) layers.forEach((L) => { if (L.tile && wants(L, live) && !live.ps.has(L.tile)) replayLive(L.tile); });
    live.ps.forEach((pt, t) => {
      if (pt.n === live.d.length) return;
      pt.add(...at(live, i, t.v));
      pt.n = live.d.length;
      reset(t.c);
    });
    if (live.mask) overlaysSoon();
    if (live.ink) pushLive({});
    lastSample = performance.now();
  }

  function open(p, x, y, g) {
    const zl = Math.max(0, Math.ceil(Math.log2(Z) - 1e-9)), k = tool === "eraser" ? "e" : tool === "chalk" ? "c" : "d";
    const c = k === "e" ? undefined : k === "c" ? hex : tool === "neon" ? "n" + hex : tool === "bands" ? "bands" : color;
    const h = tool === "spray" && head !== "std" ? head : undefined;
    live = { id: pushId(), p, k, c, h, w: (k === "e" ? RUBS[size] : SIZES[size]) / Z, z: zl, d: [], g, ps: new Map(), mask: maskNow(p, zl) };
    panel(p).seen[live.id] = true;
    layers.forEach((L) => { if (wants(L, live) && !L.tile && !L.job) rerender(L, true); });
    inkStart(live);
    put(x, y);
  }

  function close() {
    const op = live;
    live = null;
    inkStop(op);
    op.ps.forEach((pt, t) => { pt.end(); reset(t.c); });
    op.drawn = new Set(op.ps.keys());
    delete op.ps;
    bounds(op);
    if (op.mask) { layers.forEach((L) => { if (wants(L, op) && (L.job || L.timer || !L.tile)) rerender(L, true); }); overlaysSoon(); }
    insert(op, true);
    send(op);
    if (op.k !== "e") made++;
  }

  function abort() {
    const op = live;
    live = null;
    inkStop(op);
    op.ps.forEach((_, t) => (t.mode ? rerender(t.layer, true) : render(t)));
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
    if (live.k === "d" && live.c[0] !== "n" && client && performance.now() - lastSample >= TICK) { const [ux, uy] = wallPoint(...client); sample(ux, uy); }
    tick = requestAnimationFrame(hold);
  }

  function startLapse() {
    if (lapse || live || !active) return;
    const v = viewNow(), ppu = k0 * Z, list = opsIn(v.x0, v.y0, v.x0 + W / ppu, v.y0 + H / ppu);
    if (!list.length) { flash("NOTHING HAS BEEN PAINTED HERE YET"); return; }
    if (pick) pick.close();
    const cv = document.createElement("canvas");
    cv.className = "wv-tl";
    cv.width = Math.max(1, Math.round(W * DPR())); cv.height = Math.max(1, Math.round(H * DPR()));
    view.append(cv);
    view.classList.add("tl");
    lapse = { cv, c: cv.getContext("2d"), list, i: 0, v, t0: performance.now(), T: clamp(list.length * 120, 6000, 18000), raf: 0, end: 0, date: null };
    lapseEl.hidden = false;
    lapse.raf = requestAnimationFrame(lapseStep);
    sync();
  }
  function lapseStep(now) {
    const L = lapse;
    if (!L) return;
    L.raf = 0;
    const want = Math.ceil(L.list.length * clamp((now - L.t0) / L.T, 0, 1)), t0 = performance.now();
    while (L.i < want && performance.now() - t0 < 10) paintOp(L.list[L.i++], L.c, L.v);
    const d = L.i ? dateOf(L.list[L.i - 1].id) : "";
    if (d !== L.date) { L.date = d; lapseEl.querySelector("[data-lapse-date]").textContent = d || "The bare wall"; }
    lapseEl.querySelector(".pt-bar i").style.width = ((100 * L.i) / L.list.length).toFixed(1) + "%";
    if (L.i < L.list.length) L.raf = requestAnimationFrame(lapseStep);
    else L.end = setTimeout(() => stopLapse(), 1500);
  }
  function stopLapse(quick) {
    const L = lapse;
    if (!L) return;
    lapse = null;
    cancelAnimationFrame(L.raf);
    clearTimeout(L.end);
    view.classList.remove("tl");
    lapseEl.hidden = true;
    if (quick) L.cv.remove();
    else { L.cv.classList.add("out"); setTimeout(() => L.cv.remove(), 650); }
    sync();
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
    if (lapse) stopLapse(true);
    sizeLayers();
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
    hoverK = "";
    if (lapse) { view.style.cursor = "progress"; return; }
    if (tool === "stencil") { view.style.cursor = "pointer"; return; }
    const tape = tool === "tape", base = tape ? TAPES[size] : (tool === "eraser" ? RUBS : SIZES)[size] * (tool === "spray" ? headSize(head) : 1);
    const d = Math.round(clamp(base * k0, 6, 64)), s = d + 4, c = s / 2;
    let svg;
    if (canCursor && (tool === "spray" || tool === "bands")) {
      const tint = tool === "bands" ? "rainbow" : color, stops = tint === "rainbow" ? RAINBOW.map((h, i) => [i / (RAINBOW.length - 1), h]) : METAL[tint];
      const fill = stops ? "url(#r)" : tint, ox = Math.round(c + d * 0.36 + 7), oy = Math.round(c + d * 0.36 + 3), w = ox + 20, h = oy + 36;
      const defs = stops ? '<defs><linearGradient id="r"' + (METAL[tint] ? ' x2="0" y2="1"' : "") + ">" + stops.map(([o, q]) => '<stop offset="' + o + '" stop-color="' + q + '"/>').join("") + "</linearGradient></defs>" : "";
      const mist = [0.32, 0.55, 0.74].map((t, i) => '<circle cx="' + (ox + 5 + (c - ox - 5) * t).toFixed(1) + '" cy="' + (oy + 2 + (c - oy - 2) * t).toFixed(1) + '" r="' + (1.4 - i * 0.3) + '" fill="' + fill + '" fill-opacity=".7"/>').join("");
      svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" shape-rendering="crispEdges">' + defs +
        '<circle cx="' + c + '" cy="' + c + '" r="' + d / 2 + '" fill="' + fill + '" fill-opacity=".35" stroke="#000" shape-rendering="auto"/><circle cx="' + c + '" cy="' + c + '" r="' + (d / 2 + 1) + '" fill="none" stroke="#fff" shape-rendering="auto"/>' + mist +
        '<rect x="' + (ox + 5) + '" y="' + oy + '" width="6" height="4" fill="#fff" stroke="#000"/><rect x="' + (ox + 4) + '" y="' + (oy + 1) + '" width="2" height="2" fill="#000"/>' +
        '<rect x="' + (ox + 1) + '" y="' + (oy + 4) + '" width="14" height="5" fill="' + fill + '" stroke="#000"/>' +
        '<rect x="' + ox + '" y="' + (oy + 9) + '" width="16" height="25" fill="' + fill + '" stroke="#000"/>' +
        '<rect x="' + (ox + 1) + '" y="' + (oy + 16) + '" width="14" height="8" fill="#fff" fill-opacity=".85"/><rect x="' + (ox + 3) + '" y="' + (oy + 18) + '" width="10" height="1" fill="#000"/><rect x="' + (ox + 3) + '" y="' + (oy + 21) + '" width="6" height="1" fill="#000"/>' +
        '<rect x="' + (ox + 3) + '" y="' + (oy + 10) + '" width="2" height="5" fill="#fff" fill-opacity=".6"/><rect x="' + (ox + 3) + '" y="' + (oy + 25) + '" width="2" height="7" fill="#fff" fill-opacity=".6"/>' +
        '<rect x="' + (ox + 1) + '" y="' + (oy + 32) + '" width="14" height="2" fill="#7c7c7c"/></svg>';
      view.style.cursor = 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '") ' + Math.round(c) + " " + Math.round(c) + ", crosshair";
      return;
    }
    if (tool === "eraser") {
      svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + s + '" height="' + s + '"><circle cx="' + c + '" cy="' + c + '" r="' + d / 2 + '" fill="#fff" fill-opacity=".45" stroke="#000"/><circle cx="' + c + '" cy="' + c + '" r="' + (d / 2 + 1) + '" fill="none" stroke="#fff"/></svg>';
    } else {
      const tint = tape ? TAPE : tool === "bands" ? "rainbow" : tool === "spray" ? color : hex;
      const stops = tint === "rainbow" ? RAINBOW.map((h, i) => [i / (RAINBOW.length - 1), h]) : METAL[tint];
      const fill = stops ? "url(#r)" : tint, ring = tool === "neon" ? '<circle cx="' + c + '" cy="' + c + '" r="' + (d / 2 - 1) + '" fill="none" stroke="#fff" stroke-width="2"/>' : "";
      const defs = stops ? '<defs><linearGradient id="r"' + (METAL[tint] ? ' x2="0" y2="1"' : "") + ">" + stops.map(([o, h]) => '<stop offset="' + o + '" stop-color="' + h + '"/>').join("") + "</linearGradient></defs>" : "";
      svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + s + '" height="' + s + '">' + defs + '<circle cx="' + c + '" cy="' + c + '" r="' + d / 2 + '" fill="' + fill + '" fill-opacity="' + (tape || tool === "chalk" ? ".75" : ".55") + '" stroke="#000"/>' + ring + '<circle cx="' + c + '" cy="' + c + '" r="' + (d / 2 + 1) + '" fill="none" stroke="#fff"/></svg>';
    }
    view.style.cursor = 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '") ' + Math.round(c) + " " + Math.round(c) + ", crosshair";
  }

  const swatchBg = (hex) => (hex === "rainbow" ? "linear-gradient(135deg," + RAINBOW.join(",") + ")" : METAL[hex] ? metalBg(hex) : hex);
  const swatch = (hex, name) => `<button type="button" class="pt-c" data-color="${hex}" aria-label="${name}" title="${name}" style="background:${swatchBg(hex)}"></button>`;
  const two = () => { const [a, b] = [...touches.values()]; return { x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2, d: Math.hypot(a[0] - b[0], a[1] - b[1]) || 1 }; };

  function pickColor(c) {
    color = c;
    if (HEX.test(c)) { hex = c; if (tool !== "spray" && tool !== "chalk" && tool !== "neon") tool = brush === "bands" ? "spray" : brush; }
    else tool = "spray";
    if (pick) pick.close();
  }

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
      TOOLS.map(([t, title]) => `<button type="button" class="pt-t" data-tool="${t}" title="${title}" aria-label="${title}">${T16(ICONS[t])}</button>`).join("") +
      `<button type="button" class="pt-t" data-caps title="Spray caps" aria-label="Spray caps">${T16(ICONS.caps)}</button>` +
      (TOUCH ? "" : `<button type="button" class="pt-t" data-cancur title="Spray can cursor" aria-label="Spray can cursor">${T16(ICONS.cancur)}</button>`) +
      `<button type="button" class="pt-t" data-lapse title="Timelapse: watch this part of the wall get painted" aria-label="Timelapse">${T16(ICONS.lapse)}</button>` +
      `<button type="button" class="pt-t" data-undo title="Take back your last stroke (${UNDO_KEY})">&#8630;</button>` +
      `<button type="button" class="pt-t" data-redo title="Put it back (Shift+${UNDO_KEY})">&#8631;</button>` +
      `<button type="button" class="pt-t" data-zoom="in" title="Zoom in (E or the wheel)">+</button>` +
      `<button type="button" class="pt-t" data-zoom="out" title="Zoom out (Q or the wheel)">&#8722;</button>` +
      `<div class="pt-sizes">${SIZES.map((_, i) => `<button type="button" class="pt-s" data-size="${i}" title="Size ${i + 1}" aria-label="Size ${i + 1}"><i style="width:${[2, 4, 6, 9, 12][i]}px;height:${[2, 4, 6, 9, 12][i]}px"></i></button>`).join("")}</div>` +
      `</div><div class="pt-hole">` +
      `<div class="pt-lapse" role="status" hidden><span class="pt-lapse-d" data-lapse-date></span><span class="pt-bar"><i></i></span><button class="btn" type="button" data-lapse-stop>Stop</button></div></div></div>` +
      `<div class="pt-pal"><span class="pt-cur" data-cur title="Your color"></span><div class="pt-metal">${swatch("chrome", "chrome")}${swatch("gold", "gold")}</div><div class="pt-cs">${colors.join("")}<button type="button" class="pt-c pt-rb" data-color="rainbow" aria-label="rainbow" title="rainbow" style="background:${swatchBg("rainbow")}" hidden></button></div>` +
      `<label class="btn pt-more" title="Any color you like">Edit colors...<input type="color" value="#ff0000" aria-label="Pick any color"></label></div>` +
      `<footer class="stb"><span data-where>The start of the wall</span><span data-hint>${HINTS.paint}</span><span class="stb-act"><button class="btn" type="button" data-pt-close>Back to the map</button></span></footer>`;
    document.body.appendChild(chrome);
    view = document.createElement("div");
    view.className = "wv";
    view.hidden = true;
    layer = document.createElement("div");
    layer.className = "wv-lod";
    view.append(layer);
    chrome.querySelector(".pt-hole").append(view);
    tapeL = overlay("tape");
    sheetL = overlay("sheet");
    layers.push(tapeL, sheetL);
    ink = document.createElement("canvas");
    ink.className = "wv-ink";
    view.append(ink);
    who = document.createElement("div");
    who.className = "wv-who";
    view.append(who);
    caps = document.createElement("div");
    caps.className = "pt-pick pt-caps";
    caps.hidden = true;
    caps.setAttribute("role", "dialog");
    caps.setAttribute("aria-label", "Spray caps");
    caps.innerHTML = `<header class="tb"><h2 class="tb-t">Spray caps</h2><span class="tb-btns"><button class="tb-x" type="button" data-cap-x aria-label="Close"></button></span></header>` +
      `<div class="pt-pick-g">${HEADS.map(([id, name, about]) => `<span class="pt-pk"><button type="button" data-cap="${id}" title="${about}"><canvas></canvas><span>${name}</span></button></span>`).join("")}</div>`;
    chrome.append(caps);
    caps.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      if (b.dataset.cap) {
        head = b.dataset.cap;
        try { localStorage.setItem("gl-wall-cap", head); } catch (err) {}
        if (tool !== "spray") { tool = "spray"; brush = "spray"; if (!HEX.test(color) && !METAL[color] && color !== "rainbow") color = hex; }
      }
      caps.hidden = true;
      sync();
    });
    lapseEl = chrome.querySelector(".pt-lapse");
    pick = picker(chrome, { onPick: placeStencil, onCut: () => cut.open(), onPicture: (f) => cut.picture(f) });
    cut = cutter(chrome, { onSave: placeStencil });
    chrome.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b || b.closest(".pt-pick,.pt-cut")) return;
      if (b.hasAttribute("data-pt-close")) { opts.onExit(); return; }
      if (b.hasAttribute("data-lapse") || b.hasAttribute("data-lapse-stop")) { if (lapse) stopLapse(); else startLapse(); return; }
      if (lapse) return;
      if (b.hasAttribute("data-undo")) { undo(); return; }
      if (b.hasAttribute("data-redo")) { redoLast(); return; }
      if (b.hasAttribute("data-caps")) { if (caps.hidden) openCaps(); else caps.hidden = true; pick.close(); sync(); return; }
      if (b.hasAttribute("data-cancur")) { canCursor = !canCursor; try { localStorage.setItem("gl-wall-can", canCursor ? "1" : "0"); } catch (err) {} sync(); return; }
      if (b.dataset.zoom) { const r = view.getBoundingClientRect(); zoomAt(b.dataset.zoom === "in" ? 2 : 0.5, r.left + W / 2, r.top + H / 2); return; }
      if (b.dataset.tool) {
        const t = b.dataset.tool;
        if (t === "stencil") { if (!sheets.some(inView) || tool === "stencil") pick.toggle(); }
        else pick.close();
        caps.hidden = true;
        tool = t;
        if (BRUSH.includes(t)) brush = t;
      }
      if (b.dataset.color) pickColor(b.dataset.color);
      if (b.dataset.size) size = +b.dataset.size;
      sync();
    });
    chrome.querySelector("input[type=color]").addEventListener("input", (e) => { pickColor(e.target.value.toLowerCase()); sync(); });
    if (rainbow) chrome.querySelector(".pt-rb").hidden = false;

    view.addEventListener("wheel", (e) => {
      if (!active) return;
      e.preventDefault();
      if (lapse) return;
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? H : 1;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && !e.ctrlKey) { cx += (e.deltaX * unit) / (k0 * Z); clampView(); present(); step(); return; }
      zoomAt(Math.exp(-e.deltaY * unit * (e.ctrlKey ? 0.012 : 0.0022)), e.clientX, e.clientY);
      step();
    }, { passive: false });

    view.addEventListener("pointerdown", (e) => {
      if (!active || lapse) return;
      if (e.pointerType === "touch") {
        touches.set(e.pointerId, [e.clientX, e.clientY]);
        if (touches.size >= 2) {
          if (live) { if (gesture && performance.now() - gesture.t0 < 350) abort(); else close(); }
          gesture = null;
          tapeDrag = null;
          if (sheetDrag) endDrag();
          if (rip) endRip(true);
          if (liftDrag) endLift(true);
          drawOverlays();
          if (tick) { cancelAnimationFrame(tick); tick = 0; }
          pinch = two();
          sync();
          return;
        }
      }
      if (e.button !== 0 || live || pinch || tapeDrag || sheetDrag || rip || liftDrag) return;
      e.preventDefault();
      if (pick.shown) pick.close();
      if (!caps.hidden) { caps.hidden = true; sync(); }
      here(e);
      if (tool === "tape") { startTape(e); return; }
      if (tool === "stencil") { grabSheet(e); return; }
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
      if (rip && e.pointerId === rip.id) { moveRip(e); here(e); return; }
      if (liftDrag && e.pointerId === liftDrag.id) { moveLift(e); here(e); return; }
      if (tapeDrag && e.pointerId === tapeDrag.id) { tapeDrag.b = wallPoint(e.clientX, e.clientY); overlaysSoon(); here(e); return; }
      if (sheetDrag && e.pointerId === sheetDrag.id) { dragSheet(e); here(e); return; }
      hover(e);
      if (e.pointerType !== "touch" || live) here(e);
      if (!gesture || !live || e.pointerId !== gesture.id) return;
      const list = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
      for (const ev of list.length ? list : [e]) { client = [ev.clientX, ev.clientY]; step(); }
    });
    const up = (e) => {
      touches.delete(e.pointerId);
      if (pinch) { if (!touches.size) pinch = null; else if (touches.size >= 2) pinch = two(); return; }
      if (rip && e.pointerId === rip.id) { endRip(e.type === "pointercancel"); return; }
      if (liftDrag && e.pointerId === liftDrag.id) { endLift(e.type === "pointercancel"); return; }
      if (tapeDrag && e.pointerId === tapeDrag.id) { if (e.type === "pointercancel") { tapeDrag = null; drawOverlays(); } else layTape(); return; }
      if (sheetDrag && e.pointerId === sheetDrag.id) { endDrag(); return; }
      if (!gesture || e.pointerId !== gesture.id) return;
      gesture = null;
      if (tick) { cancelAnimationFrame(tick); tick = 0; }
      if (live) close();
      sync();
    };
    view.addEventListener("pointerup", up);
    view.addEventListener("pointercancel", up);
    view.addEventListener("pointerleave", (e) => { if (e.pointerType !== "touch" && !live) pushLive({ x: -1e6 }); });
  }

  function openCaps() {
    const c0 = tool === "spray" ? color : hex, col = HEX.test(c0) || METAL[c0] || c0 === "rainbow" ? c0 : "#ffffff", d = DPR();
    caps.querySelectorAll("[data-cap]").forEach((b) => {
      const cv = b.querySelector("canvas"), id = b.dataset.cap, x = cv.getContext("2d");
      cv.width = Math.round(72 * d); cv.height = Math.round(40 * d);
      x.fillStyle = "#a4503a"; x.fillRect(0, 0, cv.width, cv.height);
      const pts = [];
      for (let i = 0; i <= 24; i++) pts.push(10 * d + (i / 24) * 52 * d, 20 * d + Math.sin((i / 24) * Math.PI * 2) * 9 * d);
      paintOp({ id: "-cap-" + id + col, p: 0, k: "d", c: col, h: id === "std" ? undefined : id, w: 6 * d, d: pts }, x, { x0: 0, y0: 0, r: 1 });
      b.setAttribute("aria-pressed", String(id === head));
    });
    caps.hidden = false;
  }

  function where() {
    if (!chrome || !active) return;
    const ppu = k0 * Z, x0 = cx - W / 2 / ppu, x1 = cx + W / 2 / ppu, y0 = cy - H / 2 / ppu, y1 = cy + H / 2 / ppu, m = Math.round((x0 + LEAD) / 100);
    let n = 0;
    for (let p = Math.max(0, Math.floor(x0 / WX)); p <= Math.floor(x1 / WX); p++) { const P = panels.get(p); if (P) for (const o of P.ops) if (o.k !== "e" && hits(o, x0, y0, x1, y1)) n++; }
    const zoom = Z < 1.05 ? "" : Z < 1000 ? `, zoom ${Z.toFixed(Z < 10 ? 1 : 0)}x` : `, zoom ${Z.toExponential(1).replace("e+", "e")}x`;
    const text = (m > 0 ? `${m} m from the start` : "The start of the wall") + zoom + `, ${n} ${n === 1 ? "stroke" : "strokes"} here`;
    if (text !== said) { said = text; chrome.querySelector("[data-where]").textContent = text; }
  }

  function sync() {
    if (!chrome) return;
    const brushy = tool === "spray" || tool === "chalk" || tool === "neon", cur = tool === "spray" ? color : hex;
    chrome.querySelectorAll("[data-color]").forEach((b) => b.setAttribute("aria-pressed", String(brushy && b.dataset.color === cur)));
    chrome.querySelectorAll("[data-size]").forEach((b) => b.setAttribute("aria-pressed", String(+b.dataset.size === size)));
    chrome.querySelectorAll("[data-tool]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.tool === tool)));
    chrome.querySelector("[data-lapse]").setAttribute("aria-pressed", String(!!lapse));
    chrome.querySelector("[data-cur]").style.background = swatchBg(tool === "bands" ? "rainbow" : tool === "chalk" || tool === "neon" ? hex : color);
    chrome.querySelector("[data-undo]").disabled = !mineHere() || !!lapse;
    chrome.querySelector("[data-redo]").disabled = !redo.length || !!lapse;
    const cb = chrome.querySelector("[data-caps]"), hn = (HEADS.find((x) => x[0] === head) || HEADS[0])[1];
    cb.setAttribute("aria-pressed", String(!caps.hidden));
    cb.title = `Spray caps: ${hn} cap on the can`;
    const cc = chrome.querySelector("[data-cancur]");
    if (cc) cc.setAttribute("aria-pressed", String(canCursor));
    const h = HINTS[tool] || HINTS.paint;
    if (h !== hint) { hint = h; chrome.querySelector("[data-hint]").textContent = h; }
    where();
    if (active) { cursor(); drawOverlays(); }
  }

  document.addEventListener("keydown", (e) => {
    if (!active) return;
    if (e.key === "Escape") {
      if (lapse) stopLapse();
      else if (cut && cut.shown) cut.close();
      else if (pick && pick.shown) pick.close();
      else if (caps && !caps.hidden) { caps.hidden = true; sync(); }
      else if (tapeDrag || sheetDrag || rip || liftDrag) { tapeDrag = null; if (sheetDrag) endDrag(); if (rip) endRip(true); if (liftDrag) endLift(true); drawOverlays(); }
      else opts.onExit();
      return;
    }
    if (lapse || (cut && cut.shown)) return;
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
    if (chrome) { chrome.querySelector(".pt-rb").hidden = false; color = "rainbow"; tool = "spray"; brush = "spray"; sync(); }
    flash("SECRET COLOR UNLOCKED: RAINBOW");
  });

  connect();
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { if (stream) { stream.close(); stream = null; } closeLive(); if (active) leaveLive(); }
    else { if (!stream) connect(); if (active) openLive(); }
  });
  addEventListener("pagehide", () => { if (active) leaveLive(); });

  return {
    enter(p = 0) {
      if (!chrome) build();
      chrome.hidden = false; active = true; made = 0; said = "";
      view.hidden = false;
      Z = 1; k0 = 0;
      place();
      cx = p * WX + W / 2 / k0 - LEAD;
      cy = (ytop + ybot) / 2;
      clampView();
      present();
      view.classList.remove("on");
      void view.offsetWidth;
      view.classList.add("on");
      sync();
      openLive();
      clearInterval(liveTimer);
      liveTimer = setInterval(tidy, 1000);
    },
    exit() {
      active = false;
      if (lapse) stopLapse(true);
      if (live) { gesture = null; close(); }
      if (tick) { cancelAnimationFrame(tick); tick = 0; }
      if (walkRaf) { cancelAnimationFrame(walkRaf); walkRaf = 0; }
      Object.keys(keys).forEach((k) => (keys[k] = 0));
      touches.clear(); pinch = null; tapeDrag = null;
      if (sheetDrag) endDrag();
      rip = null; liftDrag = null;
      props.forEach((q) => { if (q.pt) flushProp(q); });
      closeLive();
      clearInterval(liveTimer);
      leaveLive();
      others.forEach((q) => q.el.remove());
      others.clear(); ghosts.clear(); props.clear(); reindex();
      peels = []; lifts = [];
      if (ink) drawInk();
      if (pick) pick.close();
      if (cut) cut.close();
      if (caps) caps.hidden = true;
      if (chrome) chrome.hidden = true;
      if (view) { view.hidden = true; view.classList.remove("on"); view.style.cursor = ""; }
      shown.forEach((t) => t.el.remove());
      shown = new Set();
      lod.forEach((t) => { t.job = null; });
      lod.clear();
      layers.forEach((L) => { clearTimeout(L.timer); L.timer = 0; L.job = null; });
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
    span(n) { for (let p = tiles.size; p < Math.min(n, 24); p++) redraw(tile(p, document.createElement("canvas"))); },
    frame: (hole) => frame(hole.width, hole.height),
    made: () => made,
  };
}
