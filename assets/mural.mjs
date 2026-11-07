/* Gzowo Labs wall: spray paint on the brick wall of the map. Click it and the camera zooms into a Paint-style frame where the wall runs on
   forever to the right of where it starts and zooms in forever: the wheel or a pinch zooms, A and D walk, W and S climb, two fingers on a phone.
   Every 1000 units of wall is a panel with its own log of strokes, replayed in order with seeded mist so every visitor sees the same paint.
   Brushes are spray with a box of swappable caps, chalk, neon and a rainbow can, plus an eraser anyone can use. Masking tape and cardboard
   stencils are shared: everyone sees them, everyone's paint stops at them and anyone peels them off like stickers, a strip by its end and a
   stencil by its folded corner; let go halfway and the peeled part stays folded back, masking and taking paint on its back. A stencil
   cut from a picture is a stack of color layers: the color square in its corner opens one layer at a time and loads that color, so
   painting them in turn gives back the picture, and each hole's rim is drawn in its color. Overlays keep their cardboard and tape in a
   cached picture and only redraw the paint while someone sprays, and masks are built once per stroke. A piece of wall nobody has painted yet can be switched to another surface with the button above it. Every stroke carries the outlines it was masked by and the ids of the tape and cardboard it landed on, so the paint on a
   strip shows for everyone and leaves the same crisp edge when it comes off. A stroke keeps the precision of the zoom it was drawn at, so whole
   pictures fit inside one brick. The view is drawn in tiles at many resolutions like a map, the timelapse replays the paint in view in the
   order it went on. The wall comes over one stream; while the wall is open a second small stream carries the tape, the stencils, the other
   painters' cursors and their strokes as they spray them. Undo deletes only your own strokes and copies them to the trash first. */

import { icon } from "/assets/views.mjs";
import { wallArt, WALL_SM, WALL_SKY, WALL_GRASS, WALL_KINDS, setWallKinds, setWallMats, setWallGallery, wallSwatch, TALL } from "/assets/map.mjs";
import { picker, cutter, simplify } from "/assets/stencil.mjs";
import { me as wallet, code as walletCode, api, ensure, toast, cone } from "/assets/bank.mjs";

const DB = "https://raft-e8d47-default-rtdb.firebaseio.com";
const LOCAL = ["localhost", "127.0.0.1", "0.0.0.0", "[::1]"];
const DEV = LOCAL.includes(location.hostname) || location.protocol === "file:";
const FAR = DEV ? "muralWallDev" : "muralWall", FAR_BIN = DEV ? "muralWallTrashDev" : "muralWallTrash", LIVE = DEV ? "muralLiveDev" : "muralLive";
const pathOf = (p) => FAR + "/" + p, binOf = (p) => FAR_BIN + "/" + p;
const MINE_KEY = "gl-mural-mine-" + (DEV ? "muralDev" : "mural");
const TOUCH = matchMedia("(pointer: coarse)").matches;
const WX = 1000, WY = 323, SX = 2, UPH = 877, HOST_K = 6;
const MAX_POINTS = 150, MAX_POSTS = 400, MAX_MINE = 600, TICK = 33, DRIP = 14, SPEED = 1100, LEAD = 110, BACK = 150;
const RB = 2, TS = 512, MAXZ = 2 ** 30, MINZ = 0.2, ART = 2.5, ARTY = 323 / 129;
const UNDO_KEY = /Mac|iPhone|iPad/.test(navigator.platform || "") ? "⌘Z" : "Ctrl+Z";
let GZONE = { x0: 0, x1: 2000, y0: -877, y1: -40 }, galleryJob = null;
const inZone = (x, y) => x >= GZONE.x0 && x < GZONE.x1 && y >= GZONE.y0 && y < GZONE.y1;
function loadGallery() {
  if (!galleryJob) galleryJob = api("/wall/gallery").then((j) => { if (j && j.zone) GZONE = j.zone; setWallGallery(j); return j; }).catch(() => { galleryJob = null; return null; });
  return galleryJob;
}
const PUSH = "-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz";
const SIZES = [3, 6, 12, 22, 40, 90, 200, 450];
const RUBS = [6, 12, 22, 40, 70, 150, 330, 700];
const TAPES = [8, 14, 22, 34, 52, 90, 150, 240];
export const SIZE_TOP = SIZES.length - 1;
const W_MAX = 4000;
const marginOf = (c, h) => (c && c[0] === "n" ? 2.05 : h === "fat" ? 3.1 : h === "splat" ? 2.9 : h === "flat" ? 1.9 : h === "brush" ? 0.7 : h === "roller" ? 0.62 : 1.7);
const SPAN = 4, spanOf = (c, h) => Math.floor((SPAN * WX - 2) / marginOf(c, h));
const RAINBOW = ["#ff2d2d", "#ff8a00", "#ffe600", "#38e03b", "#00e5ff", "#2f6bff", "#b14bff"];
const HEX = /^#[0-9a-f]{6}$/, TAG = /^[0-9a-f]{12}$/;
const sha = async (s) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s))), (x) => x.toString(16).padStart(2, "0")).join("");
const TAPE = "#e6d49c", TAPE_HI = "#f5ebc8", TAPE_LO = "#d0bb7e", CARD = "#c49a5e";
const MAX_TAPES = 30, MAX_SHEETS = 8, M_MAX = 4000, S_MAX = 30000, Q_MAX = 1000, SHEET_M = 0.12;
const BRUSH = ["spray", "chalk", "neon", "bands", "roller"];
const HEADS = [
  ["std", "Standard", "The cap the can came with", 1],
  ["skinny", "Skinny", "Thin sharp lines for outlines and tags", 0.42],
  ["fat", "Fat", "A wide soft spray that fills big areas fast", 1.8],
  ["flat", "Flat", "Thick one way and thin the other, like a calligraphy pen", 1.15],
  ["splat", "Splatter", "Spits drops of paint all around the line", 1],
  ["drip", "Dripper", "Runny paint that drips as you go", 1],
  ["soft", "Airbrush", "No speckle, just a smooth soft haze", 1.4],
  ["dust", "Dust", "Only a fine speckle of dots", 1],
  ["brush", "Brush", "A clean solid line like a paintbrush: no mist, no drips, no dots", 0.8],
];
const HEAD_IDS = new Set(HEADS.slice(1).map((h) => h[0])), H_OK = new Set([...HEAD_IDS, "roller"]);
const headSize = (h) => (HEADS.find((x) => x[0] === h) || HEADS[0])[3];
const HINTS = {
  paint: TOUCH ? "Two fingers walk and pinch to zoom in forever. Hold still and the paint drips." : `Wheel zooms in forever, A and D walk, W and S climb. Hold still and the paint drips, ${UNDO_KEY} takes back your strokes.`,
  wipe: "Roller eraser: wipes off any paint in a wide flat band, it never runs dry.",
  roller: "Roll wide flat paint. After a few roller lengths it runs dry and leaves streaks: let go and it dips itself in the bucket.",
  tape: "Drag to lay a strip of masking tape, everyone's paint stops at its edge. Grab the end and peel it like a sticker, let go halfway and it stays.",
  stencil: "Drag a stencil to move it, the arrow corner turns and sizes it. A picture stencil has a color square: click it to open one color layer at a time. Peel the folded corner like a sticker.",
};
const RECENT0 = ["#ff0000", "#000000", "#ffffff", "#ffe600", "#0055ff", "#00ff40", "#ff00a1", "#ff6a00", "#8a5a36", "chrome"];
const toHex = (c) => "#" + c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
const hsv2rgb = (h, s, v) => { const f = (n) => { const k = (n + h / 60) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)); }; return [f(5), f(3), f(1)].map((x) => Math.round(x * 255)); };
const rgb2hsv = ([r, g, b]) => { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), d = mx - Math.min(r, g, b); let h = 0; if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return [(h * 60 + 360) % 360, mx ? d / mx : 0, mx]; };
const shadesOf = (c) => [0.75, 0.5, 0.25].map((t) => mix(c, "#ffffff", t)).concat([c], [0.2, 0.4, 0.6, 0.8].map((t) => mix(c, "#000000", t)));
const FLIP_MS = 320, KIND_IDS = new Set(WALL_KINDS.slice(1).map((k) => k[0]));
const kindName = (id) => (WALL_KINDS.find((k) => k[0] === id) || WALL_KINDS[0])[1];

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rgbOf = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const mix = (a, b, t) => { const B = rgbOf(b); return "#" + rgbOf(a).map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join(""); };
let DPR_OV = 0;
const DPR = () => DPR_OV || Math.min(2, devicePixelRatio || 1);

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

function capsules(c, pts, lw) {
  const h = lw / 2;
  c.beginPath();
  if (pts.length < 4) { c.arc(pts[0], pts[1], h, Math.PI * 2, 0, true); return; }
  for (let i = 2; i < pts.length; i += 2) {
    const ax = pts[i - 2], ay = pts[i - 1], bx = pts[i], by = pts[i + 1];
    if (ax === bx && ay === by) { c.moveTo(ax + h, ay); c.arc(ax, ay, h, Math.PI * 2, 0, true); continue; }
    const a = Math.atan2(by - ay, bx - ax), nx = -Math.sin(a) * h, ny = Math.cos(a) * h;
    c.moveTo(ax + nx, ay + ny);
    c.lineTo(bx + nx, by + ny);
    c.arc(bx, by, h, a + Math.PI / 2, a - Math.PI / 2, true);
    c.lineTo(ax - nx, ay - ny);
    c.arc(ax, ay, h, a - Math.PI / 2, a + Math.PI / 2, true);
    c.closePath();
  }
}

function brushLine(op, c, v, tint) {
  const lw = op.w * v.r * 0.8, W = c.canvas.width, H = c.canvas.height, half = Math.hypot(W, H) / 2;
  let px = null, py = null, run = 0;
  const gapOf = (ax, ay, bx, by) => {
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy, t = l2 ? clamp(((W / 2 - ax) * dx + (H / 2 - ay) * dy) / l2, 0, 1) : 0;
    return Math.hypot(ax + dx * t - W / 2, ay + dy * t - H / 2);
  };
  const seg = (ax, ay, bx, by, col) => {
    const gap = gapOf(ax, ay, bx, by);
    if (gap > lw / 2 + half) return;
    c.fillStyle = col;
    if (lw > 20000) { if (gap < lw / 2 - half) c.fillRect(0, 0, W, H); return; }
    capsules(c, ax === bx && ay === by ? [ax, ay] : [ax, ay, bx, by], lw);
    c.fill();
  };
  const me = {
    add(x, y) {
      c.globalCompositeOperation = "source-over";
      c.globalAlpha = 1;
      if (px === null) { seg(x, y, x, y, tint(0, y)); px = x; py = y; return; }
      const len = Math.hypot(x - px, y - py);
      if (len < 0.25) return;
      seg(px, py, x, y, tint(run, y));
      run += len; px = x; py = y;
    },
    line(list) {
      if (lw > 20000) { for (let i = 0; i < list.length; i += 2) me.add(list[i], list[i + 1]); return; }
      c.globalCompositeOperation = "source-over";
      c.globalAlpha = 1;
      let ax = list[0], ay = list[1], col = tint(0, ay), pts = [ax, ay];
      const flush = () => { if (pts.length) { c.fillStyle = col; capsules(c, pts, lw); c.fill(); } pts = []; };
      for (let i = 2; i < list.length; i += 2) {
        const x = list[i], y = list[i + 1], len = Math.hypot(x - ax, y - ay);
        if (len < 0.25) continue;
        if (gapOf(ax, ay, x, y) <= lw / 2 + half) {
          const k = tint(run, y);
          if (k !== col) { flush(); col = k; }
          if (!pts.length) pts.push(ax, ay);
          pts.push(x, y);
        } else flush();
        run += len; ax = x; ay = y;
      }
      flush();
      px = ax; py = ay;
    },
    end() {},
  };
  return me;
}

const ROLL_K = 2.4, ROLL_LANES = 28, ROLL_WET = 8, ROLL_DRY = 18, ROLL_END = 30;
const rollCover = (u) => (u < ROLL_WET ? 1 : u < ROLL_DRY ? 1 - (0.7 * (u - ROLL_WET)) / (ROLL_DRY - ROLL_WET) : Math.max(0.1, 0.3 - (0.2 * (u - ROLL_DRY)) / (ROLL_END - ROLL_DRY)));
const rollLevel = (u) => clamp(1 - u / ROLL_DRY, 0, 1);
const rollPack = (run, ang) => Math.min(99999, Math.round(run * 100)) * 1000 + Math.round((((ang % Math.PI) + Math.PI) % Math.PI) / Math.PI * 999);
const h01 = (a, b, c) => { let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35) ^ Math.imul(c + 0x27d4eb2f, 0x165667b1); h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d); h ^= h >>> 12; return (h >>> 0) / 4294967296; };

function roller(op, c, v) {
  const lw = op.w * v.r, half = lw / 2, seed = hash(op.id), metal = SHINE[op.c], rainbow = op.c === "rainbow", N = ROLL_LANES;
  const erase = op.k === "e", base = erase ? "#000" : rainbow || metal ? null : op.c;
  const bias = Array.from({ length: N }, (_, i) => (h01(seed, i, 7) - 0.5) * 0.4);
  const laneCol = (i) => (rainbow ? RAINBOW[Math.min(RAINBOW.length - 1, Math.floor((i * RAINBOW.length) / N))]
    : metal ? metal[Math.round((i / (N - 1)) * 31)] : base);
  const noise = (i, t) => { const f = Math.floor(t), u = t - f, s = u * u * (3 - 2 * u); return h01(seed, i, f) * (1 - s) + h01(seed, i, f + 1) * s; };
  const r0 = op.r || 0, carried = r0 > 0;
  let px = null, py = null, dx = 0, dy = 1, run = (Math.floor(r0 / 1000) / 100) * lw, a0 = null, b0 = null, n = 0;
  if (carried) { const an = ((r0 % 1000) / 999) * Math.PI; dx = Math.cos(an); dy = Math.sin(an); }
  const quad = (a, b, A, B, t0, t1, col) => {
    const e = 0.6 / Math.max(1, lw), s0 = Math.max(0, t0 - e), s1 = Math.min(1, t1 + e);
    const mx = (A[0] + B[0] - a[0] - b[0]) / 2, my = (A[1] + B[1] - a[1] - b[1]) / 2, ml = Math.hypot(mx, my) || 1, ox = (mx / ml) * 0.7, oy = (my / ml) * 0.7;
    const L = (p, q, t, k) => [p[0] + (q[0] - p[0]) * t - ox * k, p[1] + (q[1] - p[1]) * t - oy * k];
    const p0 = L(a, b, s0, 1), p1 = L(a, b, s1, 1), p2 = L(A, B, s1, 0), p3 = L(A, B, s0, 0);
    c.fillStyle = col;
    c.beginPath(); c.moveTo(p0[0], p0[1]); c.lineTo(p1[0], p1[1]); c.lineTo(p2[0], p2[1]); c.lineTo(p3[0], p3[1]); c.closePath(); c.fill();
  };
  const band = (a, b, A, B, u) => {
    const cov = erase ? 1 : rollCover(u);
    if (cov >= 1 && base) { quad(a, b, A, B, 0, 1, base); return; }
    let from = -1, col = null;
    for (let i = 0; i <= N; i++) {
      const on = i < N && (cov >= 1 || noise(i, u / 1.6) * 0.92 + h01(seed, i, Math.floor(u / 0.25)) * 0.08 < cov + bias[i] * Math.min(1, (1 - cov) * 3));
      const ci = on ? laneCol(i) : null;
      if (from >= 0 && (!on || ci !== col)) { quad(a, b, A, B, from / N, i / N, col); from = -1; }
      if (on && from < 0) { from = i; col = ci; }
    }
  };
  const ends = (x, y) => [[x - dy * half, y + dx * half], [x + dy * half, y - dx * half]];
  return {
    add(x, y) {
      c.globalCompositeOperation = erase ? "destination-out" : "source-over";
      c.globalAlpha = 1;
      n++;
      if (px === null) { px = x; py = y; return; }
      const sx = x - px, sy = y - py, len = Math.hypot(sx, sy);
      if (len < 0.5) return;
      let ux = sx / len, uy = sy / len;
      if (a0 === null) { if (!carried) { dx = ux; dy = uy; } [a0, b0] = ends(px, py); }
      if (ux * dx + uy * dy < 0) { ux = -ux; uy = -uy; }
      const k = 1 - Math.exp(-len / (lw * 0.6)), nx = dx + (ux - dx) * k, ny = dy + (uy - dy) * k, nl = Math.hypot(nx, ny) || 1;
      dx = nx / nl; dy = ny / nl;
      const [a1, b1] = ends(x, y), cell = Math.max(0.75, lw * 0.05), steps = (erase || rollCover((run + len) / lw) >= 1) && base ? 1 : Math.min(400, Math.ceil(len / cell));
      for (let j = 0; j < steps; j++) {
        const t0 = j / steps, t1 = (j + 1) / steps, L = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
        band(L(a0, a1, t0), L(b0, b1, t0), L(a0, a1, t1), L(b0, b1, t1), (run + len * (t0 + t1) * 0.5) / lw);
      }
      run += len; px = x; py = y; a0 = a1; b0 = b1;
    },
    end() {
      if (n !== 1 || px === null || carried) return;
      c.globalCompositeOperation = erase ? "destination-out" : "source-over";
      const h = lw * 0.11;
      band([px - half, py - h], [px + half, py - h], [px - half, py + h], [px + half, py + h], 0);
    },
  };
}
export function rollerState(op) {
  let len = 0, dx = 0, dy = 1, set = false;
  const r0 = op.r || 0;
  if (r0 > 0) { const an = ((r0 % 1000) / 999) * Math.PI; dx = Math.cos(an); dy = Math.sin(an); set = true; }
  for (let i = 2; i + 1 < op.d.length; i += 2) {
    const sx = op.d[i] - op.d[i - 2], sy = op.d[i + 1] - op.d[i - 1], l = Math.hypot(sx, sy);
    if (l * 1e9 < 1) continue;
    let ux = sx / l, uy = sy / l;
    if (!set) { dx = ux; dy = uy; set = true; }
    if (ux * dx + uy * dy < 0) { ux = -ux; uy = -uy; }
    const k = 1 - Math.exp(-l / (op.w * 0.6)), nx = dx + (ux - dx) * k, ny = dy + (uy - dy) * k, nl = Math.hypot(nx, ny) || 1;
    dx = nx / nl; dy = ny / nl;
    len += l;
  }
  return { run: Math.floor(r0 / 1000) / 100 + len / op.w, ang: Math.atan2(dy, dx) };
}

function sprayer(op, c, v) {
  if (op.h === "roller") return roller(op, c, v);
  if (op.h === "brush") {
    const base = op.w * v.r, metal = SHINE[op.c];
    return brushLine(op, c, v, (run, y) => (op.c === "rainbow" ? RAINBOW_RUN[Math.floor(run / (base * 1.5)) % RAINBOW_RUN.length]
      : metal ? metal[Math.round(clamp((y / v.r + v.y0) / WY + Math.sin(run / (base * 3)) * 0.05, 0, 1) * 31)] : op.c));
  }
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
    for (const [f, col] of tubes) {
      c.fillStyle = col;
      capsules(c, list, lw * f);
      c.fill();
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
    c.imageSmoothingEnabled = smooth;
    for (const [w, pt] of pats) {
      c.fillStyle = pt;
      capsules(c, list, w);
      c.fill();
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
  const me = {
    line(list) {
      if (lw > 1500) { for (let i = 0; i < list.length; i += 2) me.add(list[i], list[i + 1]); return; }
      c.globalCompositeOperation = "destination-out";
      c.globalAlpha = 1;
      c.fillStyle = "#000";
      capsules(c, list, lw);
      c.fill();
    },
    add(x, y) {
      if (lw > 1500) {
        const ax = px === null ? x : px, ay = px === null ? y : py, corners = [[0, 0], [W, 0], [0, H], [W, H]].map(([qx, qy]) => seg(ax, ay, x, y, qx, qy));
        if (corners.every((dd) => dd < lw / 2)) c.clearRect(0, 0, W, H);
        px = x; py = y;
        return;
      }
      c.globalCompositeOperation = "destination-out";
      c.globalAlpha = 1;
      c.fillStyle = "#000";
      if (px === null) { capsules(c, [x, y], lw); c.fill(); }
      else if (x !== px || y !== py) { capsules(c, [px, py, x, y], lw); c.fill(); }
      px = x; py = y;
    },
    end() {},
  };
  return me;
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

function cutHalf(p, nx, ny, d, keep) {
  const out = [], n = p.length / 2, s = keep ? 1 : -1;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n, ax = p[i * 2], ay = p[i * 2 + 1], bx = p[j * 2], by = p[j * 2 + 1];
    const da = s * (ax * nx + ay * ny - d), db = s * (bx * nx + by * ny - d);
    if (da >= 0) out.push(ax, ay);
    if (da >= 0 !== db >= 0) { const t = da / (da - db); out.push(ax + (bx - ax) * t, ay + (by - ay) * t); }
  }
  return out.length >= 6 ? out : null;
}
function mirror(p, nx, ny, d) {
  const o = new Array(p.length);
  for (let i = 0; i < p.length; i += 2) { const k = 2 * (d - p[i] * nx - p[i + 1] * ny); o[i] = p[i] + k * nx; o[i + 1] = p[i + 1] + k * ny; }
  return o;
}
function peelOf(F) {
  const C = -SHEET_M, dx = F[0] - C, dy = F[1] - C, len = Math.hypot(dx, dy);
  if (!(len > 1e-4)) return null;
  let a = Math.atan2(dy, dx);
  if (a < -Math.PI / 2) a = Math.PI / 4;
  a = clamp(a, 0.06, Math.PI / 2 - 0.06);
  return [C + Math.cos(a) * len, C + Math.sin(a) * len];
}
const peelP = (F) => { if (!F) return 0; const C = -SHEET_M, dx = F[0] - C, dy = F[1] - C, len = Math.hypot(dx, dy) || 1; return len / (2 * (1 + 2 * SHEET_M) * ((dx + dy) / len)); };
function layerize(cols, holes) {
  if (!cols) return { layers: [], hl: null };
  const L = [], hl = cols.map((c) => {
    if (!c) return -1;
    const rgb = [0, 2, 4].map((i) => parseInt(c.slice(i, i + 2), 16));
    let k = L.findIndex((q) => Math.hypot(q.rgb[0] - rgb[0], q.rgb[1] - rgb[1], q.rgb[2] - rgb[2]) < 6);
    if (k < 0) { L.push({ hex: c, rgb, a: 0 }); k = L.length - 1; }
    return k;
  });
  holes.forEach((h, i) => { if (hl[i] >= 0) L[hl[i]].a += Math.abs(area(h)); });
  const order = L.map((_, i) => i).sort((a, b) => L[b].a - L[a].a || a - b), at = [];
  order.forEach((o, i) => (at[o] = i));
  return { layers: order.map((o) => L[o].hex), hl: hl.map((k) => (k < 0 ? -1 : at[k])) };
}
const tFlap = (id) => !!id && id.includes(":");
const sFlap = (key) => !!key && key.indexOf(":") !== key.lastIndexOf(":");

function maskIn(op, v, W, H, alive) {
  const b = op.p * WX, M = 6;
  let rx0 = -M, ry0 = -M, rx1 = W + M, ry1 = H + M;
  if (op.bb) { rx0 = Math.max(rx0, (op.bb[0] - v.x0) * v.r - M); ry0 = Math.max(ry0, (op.bb[1] - v.y0) * v.r - M); rx1 = Math.min(rx1, (op.bb[2] - v.x0) * v.r + M); ry1 = Math.min(ry1, (op.bb[3] - v.y0) * v.r + M); }
  const T = (poly) => {
    if (rx1 <= rx0 || ry1 <= ry0) return null;
    const o = new Array(poly.length);
    for (let i = 0; i < poly.length; i += 2) { o[i] = (b + poly[i] - v.x0) * v.r; o[i + 1] = (poly[i + 1] - v.y0) * v.r; }
    return clipRect(o, rx0, ry0, rx1, ry1);
  };
  const mk = op.mask, tapes = [], sheets = [];
  mk.tapes.forEach((t, i) => { const poly = T(t), id = mk.tapeIds[i]; if (poly) tapes.push({ poly, flap: tFlap(id), live: !alive || (!!id && alive.t.has(id)) }); });
  mk.sheets.forEach((s) => { const sheet = T(s.sheet); if (sheet) sheets.push({ sheet, holes: s.holes.map(T).filter(Boolean), flap: sFlap(s.key), live: !alive || (!!s.key && alive.s.has(s.key)) }); });
  return { x0: -M, y0: -M, x1: W + M, y1: H + M, tapes, sheets };
}

function clips(mk, mode) {
  const path = (polys) => { const p = new Path2D(); polys.forEach((q) => { p.moveTo(q[0], q[1]); for (let i = 2; i < q.length; i += 2) p.lineTo(q[i], q[i + 1]); p.closePath(); }); return p; };
  const box = [mk.x0, mk.y0, mk.x1, mk.y0, mk.x1, mk.y1, mk.x0, mk.y1];
  const inner = (s) => s.pi || (s.pi = path([s.sheet, ...s.holes])), outer = (s) => s.po || (s.po = path([box, s.sheet, ...s.holes])), off = (t) => t.po || (t.po = path([box, t.poly]));
  const all = (c, list) => list.forEach((p) => c.clip(p, "evenodd"));
  if (mode === "wall") { const list = [...mk.sheets.map(outer), ...mk.tapes.map(off)]; return [(c) => all(c, list)]; }
  const flaps = [...mk.tapes.filter((t) => t.flap).map(off), ...mk.sheets.filter((s) => s.flap).map(outer)];
  if (mode === "tape") {
    const stuck = mk.tapes.filter((t) => !t.flap && t.live);
    if (!stuck.length) return [];
    const u = path(stuck.map((t) => orient(t.poly))), list = [...mk.sheets.filter((s) => !s.flap).map(outer), ...flaps];
    return [(c) => { all(c, list); c.clip(u); }];
  }
  if (mode === "sheet") {
    return mk.sheets.map((s, i) => {
      if (s.flap || !s.live) return null;
      const list = [mk.sheets.slice(i + 1).filter((q) => !q.flap).map(outer), flaps].flat(), me = inner(s);
      return (c) => { c.clip(me, "evenodd"); all(c, list); };
    }).filter(Boolean);
  }
  const out = [];
  mk.tapes.forEach((t) => { if (t.flap && t.live) { const p = path([t.poly]); out.push((c) => c.clip(p)); } });
  mk.sheets.forEach((s) => { if (s.flap && s.live) { const p = inner(s); out.push((c) => c.clip(p, "evenodd")); } });
  return out;
}

function wallClip(op, v) {
  if (!op.wc) {
    const b = op.p * WX, M = 2, x0 = op.bb[0] - b - M, y0 = op.bb[1] - M, x1 = op.bb[2] - b + M, y1 = op.bb[3] + M, box = [x0, y0, x1, y0, x1, y1, x0, y1], list = [];
    const path = (polys) => { const p = new Path2D(); polys.forEach((q) => { p.moveTo(q[0], q[1]); for (let i = 2; i < q.length; i += 2) p.lineTo(q[i], q[i + 1]); p.closePath(); }); return p; };
    op.mask.sheets.forEach((sh) => { const q = clipRect(sh.sheet, x0, y0, x1, y1); if (q) list.push(path([box, q, ...sh.holes.map((h) => clipRect(h, x0, y0, x1, y1)).filter(Boolean)])); });
    op.mask.tapes.forEach((t) => { const q = clipRect(t, x0, y0, x1, y1); if (q) list.push(path([box, q])); });
    op.wc = list;
  }
  const r = v.r, tx = (op.p * WX - v.x0) * r, ty = -v.y0 * r, list = op.wc;
  return [(c) => { const m = c.getTransform(); c.transform(r, 0, 0, r, tx, ty); list.forEach((p) => c.clip(p, "evenodd")); c.setTransform(m); }];
}

const brushOf = (op) => (op.k === "e" ? (op.h === "roller" ? roller : rubber) : op.k === "c" ? chalk : op.c === "bands" ? bands : op.c[0] === "n" ? neon : sprayer);
const reachOf = (op, v) => op.w * v.r * (op.k === "e" ? 0.6 : op.c === "bands" || (op.c && op.c[0] === "n") ? 4.5 : 3.4) + 6;
function wallRect(c, v) {
  const W = c.canvas.width, H = c.canvas.height, L = clamp(-v.x0 * v.r, -2, W + 2), T = clamp((-UPH - v.y0) * v.r, -2, H + 2), B = clamp((WY - v.y0) * v.r, -2, H + 2);
  c.beginPath(); c.rect(L, T, W + 2 - L, B - T); c.clip();
}
function painterFor(op, c, v, mode = "wall", alive) {
  const inner = innerPainter(op, c, v, mode, alive);
  return {
    add(x, y) { c.save(); wallRect(c, v); inner.add(x, y); c.restore(); },
    end() { c.save(); wallRect(c, v); inner.end(); c.restore(); },
  };
}
function innerPainter(op, c, v, mode, alive) {
  if (!op.mask) return brushOf(op)(op, c, v);
  const fs = clips(maskIn(op, v, c.canvas.width, c.canvas.height, mode === "wall" ? null : alive), mode), ps = fs.map(() => brushOf(op)(op, c, v)), R = reachOf(op, v);
  let lx = null, ly = null;
  return {
    add(x, y) {
      const ax = lx === null ? x : lx, ay = lx === null ? y : ly, W = c.canvas.width, H = c.canvas.height;
      lx = x; ly = y;
      if (Math.max(ax, x) + R < 0 || Math.max(ay, y) + R < 0 || Math.min(ax, x) - R > W || Math.min(ay, y) - R > H) { ps.forEach((p) => p.add(x, y)); return; }
      fs.forEach((f, i) => {
        c.save();
        c.beginPath(); c.rect(Math.min(ax, x) - R, Math.min(ay, y) - R, Math.abs(x - ax) + 2 * R, Math.abs(y - ay) + 2 * R); c.clip();
        f(c); ps[i].add(x, y);
        c.restore();
      });
    },
    end() { fs.forEach((f, i) => { c.save(); f(c); ps[i].end(); c.restore(); }); },
  };
}
const reset = (c) => { c.globalCompositeOperation = "source-over"; c.globalAlpha = 1; };
const at = (op, i, v) => [(op.p * WX + op.d[i] - v.x0) * v.r, (op.d[i + 1] - v.y0) * v.r];

export function paintOp(op, c, v, mode = "wall", alive) {
  if (op.w * v.r < 0.25) return;
  if (!op.mask && mode !== "wall") return;
  if (!op.bb || op.bb[0] < 0 || op.bb[1] < -UPH || op.bb[3] > WY) { c.save(); wallRect(c, v); paintIn(op, c, v, mode, alive); c.restore(); reset(c); return; }
  paintIn(op, c, v, mode, alive);
}
function paintIn(op, c, v, mode, alive) {
  const draw = () => {
    const p = brushOf(op)(op, c, v);
    if (p.line) { const pts = []; for (let i = 0; i < op.d.length; i += 2) pts.push(...at(op, i, v)); p.line(pts); }
    else for (let i = 0; i < op.d.length; i += 2) p.add(...at(op, i, v));
    p.end();
  };
  if (!op.mask) { draw(); reset(c); return; }
  const bb = op.bb ? [(op.bb[0] - v.x0) * v.r - 2, (op.bb[1] - v.y0) * v.r - 2, (op.bb[2] - op.bb[0]) * v.r + 4, (op.bb[3] - op.bb[1]) * v.r + 4] : null;
  for (const f of mode === "wall" && v.r <= 16 && op.bb ? wallClip(op, v) : clips(maskIn(op, v, c.canvas.width, c.canvas.height, mode === "wall" ? null : alive), mode)) {
    c.save();
    if (bb) { c.beginPath(); c.rect(bb[0], bb[1], bb[2], bb[3]); c.clip(); }
    f(c); draw();
    c.restore();
  }
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
  const T = WY + UPH, k = Math.min((h * 0.8) / T, w / 460), a = (WX * k) / 400;
  return { k, top: Math.round(((h - T * k) * 0.45) / a) * a, left: LEAD * k };
}

export const wallIcon = (k, n = 16) => `<svg viewBox="0 0 16 16" width="${n}" height="${n}" shape-rendering="crispEdges" aria-hidden="true">${ICONS[k] || ""}</svg>`;
const T16 = (body) => `<svg viewBox="0 0 16 16" width="16" height="16" shape-rendering="crispEdges" aria-hidden="true">${body}</svg>`;
const ICONS = {
  spray: '<rect x="5" y="5" width="6" height="10" fill="#000080"/><rect x="6" y="6" width="4" height="8" fill="#5f8fff"/><rect x="6" y="3" width="4" height="2" fill="#000"/><rect x="7" y="1" width="2" height="2" fill="#808080"/><rect x="11" y="1" width="1" height="1"/><rect x="13" y="2" width="1" height="1"/><rect x="12" y="4" width="1" height="1"/><rect x="14" y="0" width="1" height="1"/>',
  chalk: '<path d="M3 11l7-7 3 3-7 7z" fill="#fff" stroke="#000"/><path d="M4 12l2 2" stroke="#c0c0c0"/><rect x="1" y="14" width="1" height="1" fill="#808080"/><rect x="0" y="11" width="1" height="1" fill="#808080"/><rect x="3" y="15" width="1" height="1" fill="#808080"/><rect x="1" y="9" width="1" height="1" fill="#c0c0c0"/>',
  neon: '<path d="M1 11l3-6 4 6 3-6 4 6" fill="none" stroke="#ff7ae6" stroke-width="3"/><path d="M1 11l3-6 4 6 3-6 4 6" fill="none" stroke="#fff"/>',
  bands: '<rect x="5" y="5" width="6" height="10" fill="#000"/>' + RAINBOW.map((c, i) => `<rect x="6" y="${6 + i}" width="4" height="${i === 6 ? 2 : 1}" fill="${c}"/>`).join("") +
    '<rect x="6" y="3" width="4" height="2" fill="#000"/><rect x="7" y="1" width="2" height="2" fill="#808080"/><rect x="11" y="1" width="1" height="1" fill="#ff2d2d"/><rect x="13" y="2" width="1" height="1" fill="#38e03b"/><rect x="12" y="4" width="1" height="1" fill="#2f6bff"/><rect x="14" y="0" width="1" height="1" fill="#ffe600"/>',
  roller: '<rect x="1" y="1" width="11" height="5" fill="#2fb36b" stroke="#000"/><rect x="2" y="2" width="9" height="1" fill="#9be8bd"/><path d="M12.5 3.5h2v4h-6v2.5" fill="none" stroke="#000"/><rect x="7" y="10" width="3" height="5" fill="#8a5a36" stroke="#000"/>',
  wipe: '<rect x="1" y="1" width="11" height="5" fill="#ff9ec7" stroke="#000"/><rect x="2" y="2" width="9" height="1" fill="#ffd6e7"/><path d="M12.5 3.5h2v4h-6v2.5" fill="none" stroke="#000"/><rect x="7" y="10" width="3" height="5" fill="#8a5a36" stroke="#000"/>',
  eraser: '<path d="M2 10l6-6 6 6-3 3H5z" fill="#ff9ec7" stroke="#000"/><path d="M2 10l3 3h3l-3-3z" fill="#fff"/>',
  tape: '<circle cx="7" cy="7" r="5.5" fill="#e6d49c" stroke="#000"/><circle cx="7" cy="7" r="2" fill="#c0c0c0" stroke="#000"/><path d="M10 11h5v3h-6z" fill="#e6d49c" stroke="#000"/>',
  stencil: '<rect x="1" y="1" width="14" height="14" fill="#c49a5e" stroke="#000"/><path d="M8 3l1.4 3 3.3.3-2.5 2.2.8 3.3L8 10.1l-3 1.7.8-3.3-2.5-2.2 3.3-.3z" fill="#b5523b" stroke="#000"/>',
  lapse: '<circle cx="8" cy="8" r="6.5" fill="#fff" stroke="#000"/><path d="M8 4v4h3" fill="none" stroke="#000"/><path d="M1 1h4L1 5z" fill="#000080"/>',
  caps: '<rect x="5" y="8" width="9" height="7" fill="#e0e0e0" stroke="#000"/><rect x="7" y="5" width="5" height="3" fill="#fff" stroke="#000"/><rect x="6" y="6" width="1" height="1" fill="#000"/><rect x="1" y="3" width="1" height="1" fill="#ff2d2d"/><rect x="3" y="1" width="1" height="1" fill="#2f6bff"/><rect x="0" y="6" width="1" height="1" fill="#38e03b"/><rect x="3" y="5" width="1" height="1" fill="#ffb700"/>',
  wallk: '<rect x="1" y="4" width="14" height="10" fill="#b9472b"/><path d="M1 7.5h14M1 10.5h14M5 4v3.5M11 4v3.5M8 7.5v3M3 10.5v3.5M13 10.5v3.5" stroke="#e2b698"/><rect x="1" y="4" width="14" height="10" fill="none" stroke="#000"/><path d="M4 1h8l-2-1M12 1l-2 2" fill="none" stroke="#000"/>',
  undo: '<path d="M6 2v3h4a4.5 4.5 0 0 1 0 9H6v-2h4a2.5 2.5 0 0 0 0-5H6v3L1 6z" fill="#000080" stroke="#000" stroke-width=".5"/>',
  redo: '<path d="M10 2v3H6a4.5 4.5 0 0 0 0 9h4v-2H6a2.5 2.5 0 0 1 0-5h4v3l5-4z" fill="#000080" stroke="#000" stroke-width=".5"/>',
  zin: '<circle cx="6.5" cy="6.5" r="4.8" fill="#fff" stroke="#000"/><path d="M10 10l4.5 4.5" stroke="#000" stroke-width="2.4"/><path d="M4 6.5h5M6.5 4v5" stroke="#000" stroke-width="1.4"/>',
  zout: '<circle cx="6.5" cy="6.5" r="4.8" fill="#fff" stroke="#000"/><path d="M10 10l4.5 4.5" stroke="#000" stroke-width="2.4"/><path d="M4 6.5h5" stroke="#000" stroke-width="1.4"/>',
  drop: '<path d="M10.5 1.5l4 4-2 2-.8-.8-5.7 5.7-2.5.6.6-2.5 5.7-5.7-.8-.8z" fill="#fff" stroke="#000"/><path d="M2.5 13.5L1 15" stroke="#000"/><path d="M11 2l3 3" stroke="#808080"/>',
  cancur: '<path d="M1 1v9l2.5-2.5L5 11l1.5-.7L5 7h3.5z" fill="#fff" stroke="#000"/><rect x="10" y="7" width="5" height="8" fill="#ff0000" stroke="#000"/><rect x="11" y="5" width="3" height="2" fill="#fff" stroke="#000"/><rect x="11" y="10" width="3" height="2" fill="#fff"/>',
  theme: '<path d="M4 1h8v4a4 4 0 0 1-8 0z" fill="#ffd43b" stroke="#000"/><path d="M4 2.5H1.5v1.5a2.5 2.5 0 0 0 2.5 2.5M12 2.5h2.5v1.5a2.5 2.5 0 0 1-2.5 2.5" fill="none" stroke="#000"/><rect x="7" y="9" width="2" height="3" fill="#c8962f"/><rect x="4" y="12" width="8" height="3" fill="#8a6620" stroke="#000"/><rect x="6" y="2" width="1" height="3" fill="#fff6c4"/>',
  sell: '<ellipse cx="7" cy="6" rx="6" ry="4.5" fill="#fff" stroke="#000" stroke-dasharray="2 1.5"/><path d="M4 10l-2 5" stroke="#000"/><circle cx="11.5" cy="11.5" r="3.5" fill="#ffd43b" stroke="#000"/><path d="M11.5 9.5v4" stroke="#8a5a00"/>',
  play: '<rect x="0" y="9" width="16" height="7" fill="#b9472b"/><path d="M0 11.5h16M0 14h16M4 9v2.5M12 9v2.5M8 11.5V14M2 14v2M14 14v2" stroke="#e2b698"/><path d="M5 1v7l6-3.5z" fill="#00a000" stroke="#000"/>',
};
const TOOLS = [["spray", "Spray can"], ["chalk", "Chalk"], ["neon", "Neon"], ["bands", "Rainbow spray"], ["roller", "Paint roller, wide flat paint from a bucket"], ["eraser", "Eraser, it rubs out any paint"], ["wipe", "Roller eraser, wipes paint off in a wide flat band"], ["tape", "Masking tape"], ["stencil", "Stencils, ready made or cut your own"]];

export function createMural(el, opts) {
  loadGallery();
  const home = el && el.querySelector("canvas"), headless = !!(opts && opts.headless);
  let spill = 1;
  const panels = new Map(), tiles = new Map(), lod = new Map(), keys = { a: 0, d: 0, w: 0, s: 0, q: 0, e: 0 }, touches = new Map();
  const mine = {}, minePanel = {}, order = [], redo = [], layers = [];
  let color = "#ff0000", hex = "#ff0000", tool = "spray", brush = "spray", size = 2, rainbow = false, posted = 0, lastT = 0, lastR = [], offlineSaid = false;
  let live = null, client = null, lastSample = 0, tick = 0, gesture = null, active = false, chrome = null, view = null, layer = null;
  let pumpRaf = 0, lodRaf = 0, flashTimer = 0, made = 0, said = "", walkRaf = 0, walkT = 0, stream = null;
  let W = 1, H = 1, k0 = 1, faceTop = 0, cx = 0, cy = 0, Z = 1, ytop = 0, ybot = 1, level = 0, shown = new Set(), pinch = null;
  const props = new Map(), alive = { t: new Set(), s: new Set() }, others = new Map(), ghosts = new Map(), ext = new Set();
  let host = null, inkV = 0;
  const SID = "w" + Date.now().toString(36) + Math.random().toString(36).slice(2, 9), outbox = { patch: {}, timer: 0, busy: false };
  let tapes = [], sheets = [], tapeDrag = null, sheetDrag = null, rip = null, liftDrag = null, peels = [], lifts = [], peelRaf = 0, hoverK = "", tipped = false;
  let lapse = null, lapseEl = null, pick = null, cut = null, caps = null, tapeL = null, sheetL = null, flapL = null, layRaf = 0, ovRaf = 0, hint = "", cardPat = null;
  let geoV = 0, ovDirty = new Set(), ring = null, ringD = 0, ringOk = false, viewBox = null;
  let ink = null, who = null, inkRaf = 0, liveSrc = null, liveTree = {}, liveTimer = 0, head = "std", canCursor = true;
  let wallKinds = {}, wallMats = {}, kindPick = null, matBox = null, matEl = null, colPop = null, recent = RECENT0.slice(), recentKey = "", sampling = false, cpHsv = [0, 1, 1], cpOld = "#ff0000", sv = null, hu = null, hexIn = null;
  let tagA = "", tagU = "", tagCode = null, wallKey = "", sellPop = null, selling = null, sellMode = false, lasso = null, lassoDrag = false, selCv = null, selTmp = null, lassoFor = "sell", themeRun = 0;
  function tile(p, cv) {
    const r = p < 2 ? 1 : 0.5;
    cv.width = Math.round(WX * r); cv.height = Math.round((WY + UPH) * r);
    cv.style.setProperty("--p", p);
    if (!cv.parentNode) el.append(cv);
    const t = { p, r, cv, c: cv.getContext("2d"), job: null, last: "", dirty: false };
    tiles.set(p, t);
    return t;
  }
  if (!headless) { tile(0, home); tile(1, document.createElement("canvas")); }

  try {
    rainbow = localStorage.getItem("gl-rainbow") === "1";
    canCursor = localStorage.getItem("gl-wall-can") !== "0";
    const h = localStorage.getItem("gl-wall-cap");
    if (HEAD_IDS.has(h)) head = h;
    const sz = localStorage.getItem("gl-wall-size");
    if (sz !== null && +sz >= 0 && +sz <= SIZE_TOP) size = +sz;
    const rc = JSON.parse(localStorage.getItem("gl-wall-recent") || "null");
    if (Array.isArray(rc)) { const ok = rc.filter((c) => typeof c === "string" && (HEX.test(c) || METAL[c] || (c === "rainbow" && rainbow))).slice(0, 10); recent = [...ok, ...RECENT0.filter((c) => !ok.includes(c))].slice(0, 10); }
  } catch (e) {}
  try {
    (JSON.parse(localStorage.getItem(MINE_KEY)) || []).forEach((m) => {
      if (Array.isArray(m) && typeof m[0] === "string" && !(m[0] in mine)) { mine[m[0]] = m[1] || m[0]; minePanel[m[0]] = Number.isInteger(m[2]) ? m[2] : 0; order.push(m[0]); }
    });
  } catch (e) {}

  async function tags() {
    const code = String(walletCode() || "");
    if (tagCode === code && tagA) return;
    tagCode = code;
    try {
      let k = localStorage.getItem("gl-wall-key");
      if (!k || !/^[a-z0-9]{24}$/.test(k)) { k = Array.from(crypto.getRandomValues(new Uint8Array(24)), (b) => (b % 36).toString(36)).join(""); localStorage.setItem("gl-wall-key", k); }
      wallKey = k;
      tagA = (await sha("gzowo-wall-a:" + k)).slice(0, 12);
    } catch (e) {}
    try {
      const w = code.toLowerCase().split(/[^a-z]+/).filter(Boolean);
      tagU = w.length === 12 ? (await sha("gzowo-wall-u:" + (await sha("gzowo-bank:" + w.join(" "))).slice(0, 24))).slice(0, 12) : "";
    } catch (e) { tagU = ""; }
  }
  tags();
  addEventListener("gz:wallet", () => tags());

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
    const rb = active && chrome && chrome.querySelector("[data-rb]");
    f.style.top = rb ? Math.round(rb.getBoundingClientRect().bottom + 10) + "px" : "";
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
    for (let p = Math.max(0, Math.floor(x0 / WX) - spill); p <= Math.floor(x1 / WX) + spill; p++) {
      const P = panels.get(p);
      if (P) for (const op of P.ops) if (hits(op, x0, y0, x1, y1)) list.push(op);
    }
    return list.sort(older);
  }

  const mapView = (t) => ({ x0: t.p * WX, y0: -UPH, r: t.r });
  const nearMap = (op, f) => tiles.forEach((t) => { if (hits(op, t.p * WX, -UPH, (t.p + 1) * WX, WY)) f(t); });

  function redraw(t) {
    if (t.job) { t.dirty = true; return; }
    const back = document.createElement("canvas");
    back.width = t.cv.width; back.height = t.cv.height;
    t.job = { list: opsIn(t.p * WX, -UPH, (t.p + 1) * WX, WY), i: 0, back, c: back.getContext("2d") };
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
    const top = -(WALL_SM + 13 + TALL) * ARTY, bot = (134 + WALL_SM) * ARTY;
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

  function covered(t) {
    const mx = (t.v.x0 + t.x1) / 2, my = (t.v.y0 + t.y1) / 2;
    for (let L = t.L - 1; L >= t.L - 4; L--) { const S = span(L), o = lod.get(L + ":" + Math.floor(mx / S) + ":" + Math.floor(my / S)); if (o && o.ready) return true; }
    return false;
  }
  function render(t) {
    if (t.job) { t.dirty = true; return; }
    const list = opsIn(t.v.x0, t.v.y0, t.x1, t.y1);
    if (!t.ready && !covered(t)) {
      t.c.setTransform(1, 0, 0, 1, 0, 0);
      t.c.clearRect(0, 0, TS, TS);
      t.job = { list, i: 0, back: null, c: t.c, front: true };
    } else {
      const back = document.createElement("canvas");
      back.width = back.height = TS;
      t.job = { list, i: 0, back, c: back.getContext("2d") };
    }
    t.dirty = false;
    lodLoop();
  }

  function finish(t) {
    const j = t.job;
    t.job = null;
    if (j.back) { t.cv.replaceWith(j.back); t.cv = j.back; t.c = j.c; }
    t.ready = true;
    t.last = j.list.length ? j.list[j.list.length - 1].id : "";
    if (t.dirty) render(t);
    else replayLive(t);
  }
  function lodLoop() { if (!lodRaf) lodRaf = requestAnimationFrame(lodPump); }
  function lodPump() {
    lodRaf = 0;
    const t0 = performance.now(), queue = [...lod.values()].filter((t) => t.job && shown.has(t)), front = queue.filter((t) => t.job.front);
    let done = false;
    for (let i = front.length - 1; i >= 0; i--) if (!front[i].job.list.length) { finish(front[i]); front.splice(i, 1); done = true; }
    while (front.length && performance.now() - t0 < 8) {
      let best = null;
      for (const t of front) if (!best || t.job.list[t.job.i].id < best.job.list[best.job.i].id) best = t;
      const j = best.job;
      paintOp(j.list[j.i++], j.c, best.v);
      if (j.i >= j.list.length) { front.splice(front.indexOf(best), 1); finish(best); done = true; }
    }
    for (const t of queue.filter((q) => q.job && !q.job.front).sort((a, b) => b.L - a.L)) {
      const j = t.job;
      while (j.i < j.list.length && performance.now() - t0 < 8) paintOp(j.list[j.i++], j.c, t.v);
      if (j.i < j.list.length) break;
      finish(t);
      done = true;
    }
    if (done) present();
    if ([...lod.values()].some((t) => t.job && shown.has(t))) lodLoop();
  }

  const viewNow = () => { const ppu = k0 * Z; return { x0: cx - W / 2 / ppu, y0: cy - H / 2 / ppu, r: ppu * DPR() }; };

  function present() {
    if (!active) return;
    const ppu = k0 * Z, dpr = DPR();
    level = clamp(Math.ceil(Math.log2((ppu * dpr) / RB) - 0.25), -3, 40);
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
      const s = (span(t.L) * ppu) / TS;
      t.el.style.zIndex = t.ready || (t.job && t.job.front) ? 50 + t.L - level : 40;
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
  const wants = (L, op) => {
    const mk = op.mask;
    if (!mk) return false;
    if (L.kind === "tape") return mk.tapeIds.some((id) => id && !tFlap(id) && alive.t.has(id));
    if (L.kind === "sheet") return mk.sheets.some((s) => s.key && !sFlap(s.key) && alive.s.has(s.key));
    return mk.tapeIds.some((id) => tFlap(id) && alive.t.has(id)) || mk.sheets.some((s) => sFlap(s.key) && alive.s.has(s.key));
  };
  const layerOn = (L) => (L.kind === "tape" ? tapes.length > 0 || !!tapeDrag || peels.length > 0
    : L.kind === "sheet" ? sheets.length > 0 || lifts.length > 0
    : !!rip || tapes.some((t) => t.flap) || sheets.some((sh) => sh.flapP));
  const inView = (q) => { const v = viewNow(), ppu = k0 * Z; return q.bb[2] >= v.x0 && q.bb[0] <= v.x0 + W / ppu && q.bb[3] >= v.y0 && q.bb[1] <= v.y0 + H / ppu; };

  function sizeLayers() {
    const w = Math.max(1, Math.round(W * DPR())), h = Math.max(1, Math.round(H * DPR()));
    [...layers.map((L) => L.cv), ink].forEach((cv) => { if (cv && (cv.width !== w || cv.height !== h)) { cv.width = w; cv.height = h; } });
  }

  function forgetLayer(L) {
    if (!L) return;
    clearTimeout(L.timer);
    L.timer = 0; L.job = null;
    if (live && L.tile) live.ps.delete(L.tile);
    L.tile = null; L.cache = null;
  }

  function rerender(L, now) {
    if (!L) return;
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
      L.full = true;
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
    ovDirty.clear();
    layers.forEach((L) => { L.full = true; drawLayer(L); });
  }
  function overlaysSoon(list) {
    if (!list) layers.forEach((L) => { L.full = true; ovDirty.add(L); });
    else list.forEach((L) => ovDirty.add(L));
    if (!ovRaf) ovRaf = requestAnimationFrame(() => { ovRaf = 0; const d = [...ovDirty]; ovDirty.clear(); d.forEach(drawLayer); });
  }

  const drawCache = (c, cache, tv, v) => { const k = v.r / tv.r; c.drawImage(cache, (tv.x0 - v.x0) * v.r, (tv.y0 - v.y0) * v.r, cache.width * k, cache.height * k); };
  const px = (p, v) => [(p[0] - v.x0) * v.r, (p[1] - v.y0) * v.r];
  const far = (...n) => n.some((x) => !(Math.abs(x) < 1e6));
  function paintIn(c, sink, polys, rule, cache, cv, v) {
    if (sink) { const p = new Path2D(); polys.forEach((q) => { p.moveTo(q[0], q[1]); for (let i = 2; i < q.length; i += 2) p.lineTo(q[i], q[i + 1]); p.closePath(); }); sink.push({ path: p, rule }); return; }
    if (!cache || !cv) return;
    c.save(); c.beginPath(); polys.forEach((q) => trail(c, q)); c.clip(rule); drawCache(c, cache, cv, v); c.restore();
  }
  const still = (L) => (L === tapeL ? !tapeDrag && !rip && !peels.length : L === sheetL ? !lifts.length && !sheetDrag && !liftDrag && !sheets.some((sh) => sh.flip) : !rip && !liftDrag && !sheetDrag);

  function drawLayer(L) {
    const rect = !L.full && L.dirty;
    L.full = false; L.dirty = null;
    if (!active) return;
    if (!layerOn(L)) { if (!L.cv.hidden) L.cv.hidden = true; L.base = null; return; }
    L.cv.hidden = false;
    const c = L.c, v = viewNow(), Wc = L.cv.width, Hc = L.cv.height, tv = L.tile && L.tile.v, draw = L === tapeL ? drawTapes : L === sheetL ? drawSheets : drawFlaps;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalAlpha = 1;
    c.globalCompositeOperation = "source-over";
    const key = [v.x0, v.y0, v.r, Wc, Hc, geoV, tool, !!lapse].join();
    if (rect && still(L) && L.base && L.baseKey === key) {
      const x0 = Math.max(0, Math.floor(rect[0])), y0 = Math.max(0, Math.floor(rect[1])), x1 = Math.min(Wc, Math.ceil(rect[2])), y1 = Math.min(Hc, Math.ceil(rect[3]));
      if (x1 <= x0 || y1 <= y0) return;
      c.save();
      c.beginPath(); c.rect(x0, y0, x1 - x0, y1 - y0); c.clip();
      c.clearRect(x0, y0, x1 - x0, y1 - y0);
      c.drawImage(L.base, x0, y0, x1 - x0, y1 - y0, x0, y0, x1 - x0, y1 - y0);
      if (L.cache && tv) L.sink.forEach((p) => { c.save(); c.clip(p.path, p.rule); drawCache(c, L.cache, tv, v); c.restore(); });
      if (L === sheetL && !lapse) sheets.forEach((sh) => { if (tool === "stencil") sheetTools(c, sh, v); layerBtn(c, sh, v); });
      c.restore();
      return;
    }
    c.clearRect(0, 0, Wc, Hc);
    if (!still(L)) { L.base = null; draw(L, c, v, Wc, Hc, null); return; }
    if (!L.base || L.baseKey !== key) {
      const b = L.base && L.base.width === Wc && L.base.height === Hc ? L.base : Object.assign(document.createElement("canvas"), { width: Wc, height: Hc }), x = b.getContext("2d");
      x.setTransform(1, 0, 0, 1, 0, 0);
      x.globalAlpha = 1;
      x.globalCompositeOperation = "source-over";
      x.clearRect(0, 0, Wc, Hc);
      L.sink = [];
      draw(L, x, v, Wc, Hc, L.sink);
      L.base = b; L.baseKey = key;
    }
    c.drawImage(L.base, 0, 0);
    if (L.cache && tv) L.sink.forEach((p) => { c.save(); c.clip(p.path, p.rule); drawCache(c, L.cache, tv, v); c.restore(); });
    if (L === sheetL && !lapse) sheets.forEach((sh) => { if (tool === "stencil") sheetTools(c, sh, v); layerBtn(c, sh, v); });
  }

  function tapeFill(c, t, v, Wc, Hc, alpha, poly = t.poly) {
    const q = toCanvas(poly, v, Wc, Hc);
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

  function drawTapes(L, c, v, Wc, Hc, sink) {
    const qs = [], tv = L.tile && L.tile.v;
    tapes.forEach((t) => { if (!t.stuck) return; const q = tapeFill(c, t, v, Wc, Hc, 1, t.stuck); if (q) qs.push(orient(q)); });
    if (qs.length) paintIn(c, sink, qs, "nonzero", L.cache, tv, v);
    if (tool === "tape" && !lapse) tapes.forEach((t) => { if (!t.g && !(rip && rip.tape === t)) tab(c, t, v); });
    peels.forEach((P) => P.list.forEach((e) => { const s = peelAt(P, e); ripFrame(c, e.t, v, Wc, Hc, s.p, e.fromB, P.cache, P.v, s.hand, s.fade); }));
    if (tapeDrag) tapeFill(c, { ...tapeDrag, poly: strip(tapeDrag.a, tapeDrag.b, tapeDrag.w, tapeDrag.teeth) }, v, Wc, Hc, 0.85);
  }

  function flapShape(c, q, fade, fill) {
    const d = DPR();
    c.globalAlpha = fade;
    c.save(); c.translate(2 * d, 3 * d); c.fillStyle = "rgba(40,25,0,.3)"; c.beginPath(); trail(c, q); c.fill(); c.restore();
    c.fillStyle = fill || TAPE_HI; c.beginPath(); trail(c, q); c.fill();
    c.strokeStyle = "rgba(120,92,36,.6)"; c.lineWidth = d; c.stroke();
    c.globalAlpha = 1;
  }

  function handFlap(c, t, v, Wc, Hc, p, fromB, hand, fade) {
    if (p <= 0 || fade <= 0) return;
    const A = fromB ? t.b : t.a, B = fromB ? t.a : t.b, dx = B[0] - A[0], dy = B[1] - A[1], len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len, nx = -uy, ny = ux;
    const px0 = A[0] + ux * len * p, py0 = A[1] + uy * len * p, hw = t.w / 2, fx = hand[0] - px0, fy = hand[1] - py0, fl = Math.hypot(fx, fy) || 1;
    let mx = (-fy / fl) * hw * 0.9, my = (fx / fl) * hw * 0.9;
    if (mx * nx + my * ny < 0) { mx = -mx; my = -my; }
    const q = toCanvas([px0 + nx * hw, py0 + ny * hw, px0 - nx * hw, py0 - ny * hw, hand[0] - mx, hand[1] - my, hand[0] + mx, hand[1] + my], v, Wc, Hc);
    if (q) flapShape(c, q, fade);
  }

  function ripFrame(c, t, v, Wc, Hc, p, fromB, cache, cv, hand, fade) {
    const A = fromB ? t.b : t.a, B = fromB ? t.a : t.b;
    const dx = B[0] - A[0], dy = B[1] - A[1], len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len, nx = -uy, ny = ux;
    const px0 = A[0] + ux * len * p, py0 = A[1] + uy * len * p, big = len + t.w * 4, hw = t.w / 2;
    if (p < 1) {
      const half = toCanvas([px0 + nx * big, py0 + ny * big, px0 - nx * big, py0 - ny * big, px0 - nx * big + ux * big, py0 - ny * big + uy * big, px0 + nx * big + ux * big, py0 + ny * big + uy * big], v, Wc, Hc);
      if (half) {
        c.save(); c.beginPath(); trail(c, half); c.clip();
        const q = tapeFill(c, t, v, Wc, Hc, 1);
        if (q && cache && cv) { c.beginPath(); trail(c, q); c.clip(); drawCache(c, cache, cv, v); }
        c.restore();
      }
    }
    if (p <= 0 || fade <= 0) return;
    if (hand) { handFlap(c, t, v, Wc, Hc, p, fromB, hand, fade); return; }
    const cl = Math.min(t.w * 0.9, len * p);
    const q = toCanvas([px0 + nx * hw, py0 + ny * hw, px0 - nx * hw, py0 - ny * hw, px0 - ux * cl - nx * hw * 0.82, py0 - uy * cl - ny * hw * 0.82, px0 - ux * cl + nx * hw * 0.82, py0 - uy * cl + ny * hw * 0.82], v, Wc, Hc);
    if (q) flapShape(c, q, fade);
  }

  function tapeFlap(c, t, v, Wc, Hc, cache, cv, sink) {
    const q = toCanvas(t.flap, v, Wc, Hc);
    if (!q) return;
    const d = DPR(), P = px(t.foldAt, v), E = px(t.tip, v), L = Math.hypot(E[0] - P[0], E[1] - P[1]);
    let fill = TAPE_HI;
    if (!far(...P, ...E) && L > 0.5) {
      const g = c.createLinearGradient(P[0], P[1], E[0], E[1]);
      g.addColorStop(0, "#fffdf2"); g.addColorStop(clamp((3 * d) / L, 0.02, 0.45), TAPE_HI); g.addColorStop(1, TAPE);
      fill = g;
    }
    flapShape(c, q, 1, fill);
    paintIn(c, sink, [q], "nonzero", cache, cv, v);
  }

  function peelAt(P, e) {
    const el = Math.max(0, performance.now() - P.t0 - e.delay), u = clamp(el / P.dur, 0, 1), p = e.p0 + (1 - e.p0) * u * u * (3 - 2 * u);
    if (!e.hand) return { p, fade: 1 - clamp((p - 0.85) / 0.15, 0, 1), hand: null };
    const k = el / 1000;
    return { p, fade: 1 - clamp((u - 0.55) / 0.45, 0, 1), hand: [e.hand[0] + e.dir[0] * k, e.hand[1] + e.dir[1] * k] };
  }

  const loop = () => { if (!peelRaf) peelRaf = requestAnimationFrame(animate); };
  function peelAway(list, hand, dir) {
    if (!list.length) return;
    peels.push({ t0: performance.now(), dur: hand ? 260 : 520, list: list.map((t, i) => ({ t, fromB: t.g < 0, p0: Math.abs(t.g || 0), delay: hand ? 0 : i * 70, hand, dir })), cache: tapeL.tile ? tapeL.cache : null, v: tapeL.tile && tapeL.tile.v });
    rerender(tapeL, true);
    rerender(flapL, true);
    loop();
  }

  function liftAway(sh, vel) {
    lifts.push({ g: { ...sh }, t0: performance.now(), dur: 420, vel, cache: sheetL.tile ? sheetL.cache : null, v: sheetL.tile && sheetL.tile.v });
    rerender(sheetL, true);
    rerender(flapL, true);
    loop();
  }

  function animate() {
    peelRaf = 0;
    const now = performance.now();
    peels = peels.filter((P) => now - P.t0 < P.dur + 70 * (P.list.length - 1) + 60);
    lifts = lifts.filter((F) => now - F.t0 < F.dur + 30);
    sheets.forEach((sh) => { if (sh.flip && now - sh.flip.t0 > FLIP_MS) sh.flip = null; });
    drawOverlays();
    if (peels.length || lifts.length || sheets.some((sh) => sh.flip)) peelRaf = requestAnimationFrame(animate);
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

  function squish(c, sh, v, s) {
    const mx = clamp((sh.x - v.x0) * v.r, -1e5, 1e5), my = clamp((sh.y - v.y0) * v.r, -1e5, 1e5);
    c.translate(mx, my); c.rotate(sh.a); c.scale(Math.max(0.03, s), 1); c.rotate(-sh.a); c.translate(-mx, -my);
  }

  function drawSheets(L, c, v, Wc, Hc, sink) {
    const tv = L.tile && L.tile.v, now = performance.now(), tools = tool === "stencil" && !lapse;
    sheets.forEach((sh) => {
      if (sh.flip) {
        const u = clamp((now - sh.flip.t0) / FLIP_MS, 0, 1), G = u < 0.5 ? sh.flip.old : sh, s = Math.abs(Math.cos(Math.PI * u));
        c.save();
        squish(c, sh, v, s);
        drawFront(c, G, v, Wc, Hc, null, null, 1 - s, null);
        if (G.flapP) sheetFlap(c, G, v, Wc, Hc, null, null, null);
        c.restore();
        if (!lapse) layerBtn(c, sh, v);
        return;
      }
      drawFront(c, sh, v, Wc, Hc, L.cache, tv, 0, sink);
      if (!sink) { if (tools) sheetTools(c, sh, v); if (!lapse) layerBtn(c, sh, v); }
    });
    lifts.forEach((F) => {
      const u = clamp((now - F.t0) / F.dur, 0, 1), dt = (now - F.t0) / 1000, d = DPR(), G = F.g, s = 1 + 0.08 * u;
      const mx = clamp((G.x - v.x0) * v.r, -1e5, 1e5), my = clamp((G.y - v.y0) * v.r, -1e5, 1e5);
      c.save();
      c.globalAlpha = 1 - u;
      c.translate(mx + F.vel[0] * dt * d, my + F.vel[1] * dt * d); c.scale(s, s); c.translate(-mx, -my);
      drawFront(c, G, v, Wc, Hc, F.cache, F.v, 0, null);
      if (G.flapP) sheetFlap(c, G, v, Wc, Hc, null, null, null);
      c.restore();
    });
  }

  function rims(c, holes, cols, open, v, Wc, Hc, path, d) {
    if (!holes || !holes.length) return;
    c.save(); path(); c.clip("evenodd");
    c.lineJoin = "round";
    holes.forEach((h, i) => {
      const q = toCanvas(h, v, Wc, Hc), col = cols && cols[i], shut = open && !open[i];
      if (!q) return;
      c.strokeStyle = shut ? "rgba(74,44,14,.3)" : col ? "#" + col : "rgba(74,44,14,.8)";
      c.lineWidth = (shut ? 1 : col ? 3.4 : 2) * d;
      c.beginPath(); trail(c, q); c.stroke();
    });
    c.restore();
  }

  function drawFront(c, G, v, Wc, Hc, cache, cv, dim, sink) {
    if (!G.stuck) return;
    const o = toCanvas(G.stuck.poly, v, Wc, Hc);
    if (!o) return;
    const hs = G.stuck.holes.map((h) => toCanvas(h, v, Wc, Hc)).filter(Boolean), d = DPR();
    const path = () => { c.beginPath(); trail(c, o); hs.forEach((h) => trail(c, h)); };
    c.save(); c.translate(3 * d, 4 * d); c.fillStyle = "rgba(0,0,0,.32)"; path(); c.fill("evenodd"); c.restore();
    c.fillStyle = cardFill(c, v, G); path(); c.fill("evenodd");
    c.strokeStyle = "rgba(74,44,14,.75)"; c.lineWidth = d; c.beginPath(); trail(c, o); c.stroke();
    rims(c, G.holesW, G.cols, G.open, v, Wc, Hc, path, d);
    paintIn(c, sink, [o, ...hs], "evenodd", cache, cv, v);
    if (dim > 0.02) { c.fillStyle = `rgba(40,20,0,${(dim * 0.35).toFixed(3)})`; path(); c.fill("evenodd"); }
  }

  function sheetFlap(c, G, v, Wc, Hc, cache, cv, sink) {
    const F = G.flapP, o = toCanvas(F.poly, v, Wc, Hc);
    if (!o) return;
    const hs = F.holes.map((h) => toCanvas(h, v, Wc, Hc)).filter(Boolean), d = DPR();
    const path = () => { c.beginPath(); trail(c, o); hs.forEach((h) => trail(c, h)); };
    c.save(); c.translate(5 * d, 7 * d); c.fillStyle = "rgba(0,0,0,.26)"; path(); c.fill("evenodd"); c.restore();
    const P = px(G.foldMid, v), E = px(G.foldTip, v), L = Math.hypot(E[0] - P[0], E[1] - P[1]);
    let fill = "#d8b47a";
    if (!far(...P, ...E) && L > 1) {
      const g = c.createLinearGradient(P[0], P[1], E[0], E[1]);
      g.addColorStop(0, "#f6e2b8"); g.addColorStop(clamp((5 * d) / L, 0.01, 0.4), "#e2c28c"); g.addColorStop(1, "#c79f66");
      fill = g;
    }
    c.fillStyle = fill; path(); c.fill("evenodd");
    c.strokeStyle = "rgba(74,44,14,.75)"; c.lineWidth = d; c.beginPath(); trail(c, o); c.stroke();
    rims(c, G.holesF, null, G.open, v, Wc, Hc, path, d);
    paintIn(c, sink, [o, ...hs], "evenodd", cache, cv, v);
  }

  function drawFlaps(L, c, v, Wc, Hc, sink) {
    const tv = L.tile && L.tile.v;
    tapes.forEach((t) => {
      if (rip && rip.tape === t) handFlap(c, t, v, Wc, Hc, rip.p, rip.fromB, rip.hand, 1);
      else if (t.flap) tapeFlap(c, t, v, Wc, Hc, L.cache, tv, sink);
    });
    sheets.forEach((sh) => { if (sh.flapP && !sh.flip) sheetFlap(c, sh, v, Wc, Hc, liftDrag && liftDrag.sheet === sh ? null : L.cache, tv, sink); });
  }

  const stuckAt = (sh, u, w) => !sh.fold || sh.fold[0] * u + sh.fold[1] * w >= sh.fold[2];
  function sheetTools(c, sh, v) {
    const d = DPR(), s = (TOUCH ? 9 : 6) * d, M = SHEET_M;
    if (!sh.f) {
      const f = foldOf(sh, v), A = [f.x0 + f.u[0] * f.ts, f.y0 + f.u[1] * f.ts], B = [f.x0 + f.w[0] * f.ts, f.y0 + f.w[1] * f.ts], T = [A[0] + B[0] - f.x0, A[1] + B[1] - f.y0];
      c.fillStyle = "rgba(0,0,0,.28)";
      c.beginPath(); c.moveTo(A[0] + d, A[1] + 2 * d); c.lineTo(T[0] + 2 * d, T[1] + 3 * d); c.lineTo(B[0] + d, B[1] + 2 * d); c.closePath(); c.fill();
      c.fillStyle = "#e2bd84";
      c.beginPath(); c.moveTo(A[0], A[1]); c.lineTo(T[0], T[1]); c.lineTo(B[0], B[1]); c.closePath(); c.fill();
      c.strokeStyle = "rgba(74,44,14,.8)"; c.lineWidth = d; c.stroke();
    }
    c.lineWidth = d;
    if (stuckAt(sh, 1 + M, 1 + M)) {
      const [hx, hy] = handleAt(sh, v);
      c.fillStyle = "#fff"; c.strokeStyle = "#000";
      c.fillRect(hx - s, hy - s, s * 2, s * 2); c.strokeRect(hx - s, hy - s, s * 2, s * 2);
      c.beginPath(); c.arc(hx, hy, s * 0.5, -Math.PI * 0.9, Math.PI * 0.4); c.stroke();
    }
  }

  function layerBtn(c, sh, v) {
    if (!sh.layers || sh.layers.length < 2 || !stuckAt(sh, 1 + SHEET_M, -SHEET_M)) return;
    const d = DPR(), s = (TOUCH ? 11 : 8) * d, [bx, by] = flipAt(sh, v);
    if (far(bx, by)) return;
    c.fillStyle = "rgba(0,0,0,.3)"; c.fillRect(bx - s + d, by - s + 2 * d, s * 2, s * 2);
    if (sh.lay >= 0) { c.fillStyle = "#" + sh.layers[sh.lay]; c.fillRect(bx - s, by - s, s * 2, s * 2); }
    else { const all = sh.layers.slice(0, 5), w = (s * 2) / all.length; all.forEach((col, i) => { c.fillStyle = "#" + col; c.fillRect(bx - s + i * w, by - s, w + 0.5, s * 2); }); }
    c.strokeStyle = "#fff"; c.lineWidth = d; c.strokeRect(bx - s + d, by - s + d, s * 2 - 2 * d, s * 2 - 2 * d);
    c.strokeStyle = "#000"; c.strokeRect(bx - s, by - s, s * 2, s * 2);
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
  function local(sh, [x, y]) {
    const dx = x - sh.x, dy = y - sh.y, ca = Math.cos(sh.a), sa = Math.sin(sh.a);
    return [(dx * ca + dy * sa) / sh.s + 0.5, (-dx * sa + dy * ca) / sh.s + 0.5];
  }
  const boxOf = (p) => { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (let i = 0; i < p.length; i += 2) { x0 = Math.min(x0, p[i]); x1 = Math.max(x1, p[i]); y0 = Math.min(y0, p[i + 1]); y1 = Math.max(y1, p[i + 1]); } return [x0, y0, x1, y1]; };
  function shapeSheet(sh) {
    const M = SHEET_M, C = -M, L = [-M, -M, 1 + M, -M, 1 + M, 1 + M, -M, 1 + M];
    const toW = (p) => { const o = new Array(p.length); for (let i = 0; i < p.length; i += 2) { const [x, y] = sheetAt(sh, p[i], p[i + 1]); o[i] = x; o[i + 1] = y; } return o; };
    sh.open = sh.lay >= 0 && sh.hl ? sh.hl.map((k) => k < 0 || k === sh.lay) : null;
    const eff = sh.open ? sh.st.holes.filter((_, i) => sh.open[i]) : sh.st.holes;
    geoV++;
    sh.outline = toW(L);
    sh.holesW = sh.st.holes.map(toW);
    sh.stuck = { poly: sh.outline, holes: eff.map(toW) };
    sh.flapP = null; sh.holesF = null; sh.fold = null; sh.tag = null;
    const f = sh.f, len = f ? Math.hypot(f[0] - C, f[1] - C) : 0;
    if (f && len > 1e-4) {
      const nx = (f[0] - C) / len, ny = (f[1] - C) / len, d = nx * C + ny * C + len / 2, R = (p) => toW(mirror(p, nx, ny, d));
      const so = cutHalf(L, nx, ny, d, true), po = cutHalf(L, nx, ny, d, false);
      sh.stuck = so ? { poly: toW(so), holes: eff.map((h) => cutHalf(h, nx, ny, d, true)).filter(Boolean).map(toW) } : null;
      if (po) {
        sh.flapP = { poly: R(po), holes: eff.map((h) => cutHalf(h, nx, ny, d, false)).filter(Boolean).map(R) };
        sh.holesF = sh.st.holes.map(R);
      }
      sh.fold = [nx, ny, d];
      sh.foldMid = sheetAt(sh, C + (nx * len) / 2, C + (ny * len) / 2);
      sh.foldTip = sheetAt(sh, f[0], f[1]);
      sh.tag = Math.round(f[0] * 1000) + "_" + Math.round(f[1] * 1000);
    }
    sh.bb = boxOf(sh.flapP ? [...sh.outline, ...sh.flapP.poly] : sh.outline);
  }
  function shapeTape(t) {
    geoV++;
    t.poly = strip(t.a, t.b, t.w, t.teeth);
    t.stuck = t.poly; t.flap = null; t.tag = null;
    const g = Math.abs(t.g || 0);
    if (g > 0) {
      const A = t.g < 0 ? t.b : t.a, B = t.g < 0 ? t.a : t.b, len = Math.hypot(B[0] - A[0], B[1] - A[1]) || 1, ux = (B[0] - A[0]) / len, uy = (B[1] - A[1]) / len;
      const P = [A[0] + ux * len * g, A[1] + uy * len * g], d = P[0] * ux + P[1] * uy, pe = cutHalf(t.poly, ux, uy, d, false);
      t.stuck = g < 1 ? cutHalf(t.poly, ux, uy, d, true) : null;
      t.flap = pe ? mirror(pe, ux, uy, d) : null;
      t.foldAt = P;
      t.tip = [2 * P[0] - A[0], 2 * P[1] - A[1]];
      t.tag = t.id + ":" + Math.round(t.g * 1000);
    }
    t.bb = boxOf(t.flap ? [...t.poly, ...t.flap] : t.poly);
  }
  const handleAt = (sh, v) => px(sheetAt(sh, 1 + SHEET_M, 1 + SHEET_M), v);
  const flipAt = (sh, v) => px(sheetAt(sh, 1 + SHEET_M, -SHEET_M), v);
  const canvasPt = (e) => { const r = view.getBoundingClientRect(), d = DPR(); return [(e.clientX - r.left) * d, (e.clientY - r.top) * d]; };
  const reachPx = () => (host ? 34 : TOUCH ? 24 : 12) * DPR();
  const onHandle = (sh, P, v) => { if (!stuckAt(sh, 1 + SHEET_M, 1 + SHEET_M)) return false; const [hx, hy] = handleAt(sh, v); return Math.hypot(P[0] - hx, P[1] - hy) <= reachPx(); };
  const onLayer = (sh, P, v) => { if (!sh.layers || sh.layers.length < 2 || sh.flip || !stuckAt(sh, 1 + SHEET_M, -SHEET_M)) return false; const [bx, by] = flipAt(sh, v); return Math.hypot(P[0] - bx, P[1] - by) <= reachPx() * 1.15; };
  function onFold(sh, P, v) {
    const f = foldOf(sh, v), rx = P[0] - f.x0, ry = P[1] - f.y0, a1 = rx * f.u[0] + ry * f.u[1], a2 = rx * f.w[0] + ry * f.w[1], m = 8 * DPR();
    return a1 > -m && a2 > -m && a1 + a2 < f.ts * 1.2 + m;
  }
  function onPeel(sh, P, w, v) {
    if (!sh.f) return onFold(sh, P, v);
    if (sh.flapP && inside(sh.flapP.poly, w)) return true;
    const T = px(sh.foldTip, v);
    return Math.hypot(P[0] - T[0], P[1] - T[1]) <= reachPx() * 1.2;
  }
  function inside(p, [x, y]) {
    let hit = false;
    for (let i = 0, j = p.length - 2; i < p.length; j = i, i += 2) if ((p[i + 1] > y) !== (p[j + 1] > y) && x < ((p[j] - p[i]) * (y - p[i + 1])) / (p[j + 1] - p[i + 1]) + p[i]) hit = !hit;
    return hit;
  }
  const vtag = () => Math.random().toString(36).slice(2, 8) || "v";
  const track = (m, e) => { m.push([performance.now(), e.clientX, e.clientY]); while (m.length > 6) m.shift(); };
  const speed = (m) => { if (m.length < 2) return [0, 0]; const a = m[0], b = m[m.length - 1], dt = Math.max(16, b[0] - a[0]) / 1000; return [(b[1] - a[1]) / dt, (b[2] - a[2]) / dt]; };
  const r4 = (n) => Math.round(n * 10000) / 10000;
  const peelFields = (sh) => (sh.f ? { fu: r4(sh.f[0]), fw: r4(sh.f[1]) } : { fu: null, fw: null });

  function placeStencil(st) {
    if (sheets.filter(inView).length >= MAX_SHEETS) { flash("TOO MANY STENCILS HERE, PEEL ONE OFF FIRST"); return; }
    const ppu = k0 * Z, p = Math.max(0, Math.floor(cx / WX)), { holes, cols } = decHoles(encHoles(st.holes), st.colors ? st.colors.join(",") : "");
    if (!holes.length) return;
    const sh = { id: pushId(), kind: "s", p, x: cx, y: cy, s: (Math.min(W, H) * 0.5) / ppu, a: 0, v: vtag(), name: String(st.name || "").slice(0, 20), st: { holes }, cols, ...layerize(cols, holes), lay: -1, f: null };
    shapeSheet(sh);
    props.set(sh.id, sh);
    reindex();
    rerender(sheetL, true);
    save("props/" + sh.id, wire(sh));
    tool = "stencil";
    sync();
    drawOverlays();
    flash("DRAG IT INTO PLACE, PAINT OVER IT, THEN PEEL IT OFF BY THE FOLDED CORNER");
  }

  function grabSheet(e) {
    const P = canvasPt(e), v = viewNow(), w = wallPoint(e.clientX, e.clientY);
    for (let i = sheets.length - 1; i >= 0; i--) {
      const sh = sheets[i];
      if (sh.flip) continue;
      if (onPeel(sh, P, w, v)) { startLift(e, sh); return; }
      if (onHandle(sh, P, v)) { startDrag(e, sh, true, w); return; }
    }
    for (let i = sheets.length - 1; i >= 0; i--) if (sheets[i].stuck && inside(sheets[i].stuck.poly, w)) { startDrag(e, sheets[i], false, w); return; }
    closeSell();
    if (pick) pick.open(); else if (host && host.pick) host.pick();
  }
  function startDrag(e, sh, turn, at) {
    try { view.setPointerCapture(e.pointerId); } catch (err) {}
    sheetDrag = { id: e.pointerId, sheet: sh, turn, at, x: sh.x, y: sh.y, moved: false };
  }
  function dragSheet(e) {
    const p = wallPoint(e.clientX, e.clientY), sd = sheetDrag, sh = sd.sheet;
    if (!sd.moved) { sd.moved = true; sh.v = vtag(); reindex(); forgetLayer(sheetL); forgetLayer(flapL); rerender(sheetL, true); rerender(flapL, true); }
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
    if (sd && sd.moved && props.has(sd.sheet.id)) { flushProp(sd.sheet); reindex(); }
    drawOverlays();
  }

  function nextLayer(sh) {
    if (!sh.layers || sh.layers.length < 2) return;
    sh.flip = { t0: performance.now(), old: { ...sh } };
    sh.lay = sh.lay + 1 < sh.layers.length ? sh.lay + 1 : -1;
    sh.f = null; sh.v = vtag();
    shapeSheet(sh);
    reindex();
    forgetLayer(sheetL); forgetLayer(flapL);
    rerender(sheetL, true); rerender(flapL, true);
    pushProp(sh, { l: sh.lay >= 0 ? sh.lay : null, v: sh.v, fu: null, fw: null });
    flushProp(sh);
    if (sh.lay >= 0) { pickColor("#" + sh.layers[sh.lay]); sync(); }
    flash(sh.lay >= 0 ? `LAYER ${sh.lay + 1} OF ${sh.layers.length}: SPRAY IT IN THIS COLOR, THEN CLICK THE SQUARE FOR THE NEXT ONE` : "ALL LAYERS OPEN AGAIN");
    loop();
    drawOverlays();
  }

  function startLift(e, sh) {
    try { view.setPointerCapture(e.pointerId); } catch (err) {}
    const v = viewNow(), h = local(sh, wallPoint(e.clientX, e.clientY)), k = foldOf(sh, v).ts / Math.max(1e-9, sh.s * v.r);
    const F0 = sh.f || [-SHEET_M + k, -SHEET_M + k], f0 = sh.f;
    sh.f = peelOf(F0);
    shapeSheet(sh);
    liftDrag = { id: e.pointerId, sheet: sh, f0, pd: f0 ? 0.004 : peelP(sh.f), off: [F0[0] - h[0], F0[1] - h[1]], m: [] };
    track(liftDrag.m, e);
    view.style.cursor = "grabbing";
    drawOverlays();
  }
  function moveLift(e) {
    const D = liftDrag, sh = D.sheet, h = local(sh, wallPoint(e.clientX, e.clientY));
    track(D.m, e);
    sh.f = peelOf([h[0] + D.off[0], h[1] + D.off[1]]);
    shapeSheet(sh);
    if (!sh.stuck) { endLift(false, true); return; }
    pushProp(sh, peelFields(sh));
    overlaysSoon();
  }
  function endLift(cancel, done) {
    const D = liftDrag;
    if (!D) return;
    liftDrag = null;
    const sh = D.sheet, [vx, vy] = speed(D.m), fast = Math.hypot(vx, vy) > 900, p = peelP(sh.f);
    const n = sh.fold ? [sh.fold[0] * Math.cos(sh.a) - sh.fold[1] * Math.sin(sh.a), sh.fold[0] * Math.sin(sh.a) + sh.fold[1] * Math.cos(sh.a)] : [Math.SQRT1_2, Math.SQRT1_2];
    if (!cancel && props.has(sh.id) && (done || p >= 0.9 || (fast && p > 0.05 && vx * n[0] + vy * n[1] > 0))) {
      let vel = [vx, vy];
      if (Math.hypot(vx, vy) < 300) vel = [n[0] * 650, n[1] * 650 - 150];
      clearTimeout(sh.pt); sh.pend = null;
      props.delete(sh.id);
      reindex();
      liftAway(sh, vel);
      save("props/" + sh.id, null, "DELETE");
    } else {
      if (cancel) sh.f = D.f0;
      else if (p <= D.pd + 0.015) sh.f = null;
      shapeSheet(sh);
      if (props.has(sh.id)) { pushProp(sh, peelFields(sh)); flushProp(sh); }
      reindex();
      forgetLayer(flapL);
      rerender(flapL, true);
    }
    cursor();
    sync();
    drawOverlays();
  }

  function ripAt(e) {
    const [x, y] = wallPoint(e.clientX, e.clientY), ppu = k0 * Z, reach = (host ? 26 : 10) / ppu;
    for (let i = tapes.length - 1; i >= 0; i--) {
      const t = tapes[i];
      if (t.g) {
        if ((t.flap && inside(t.flap, [x, y])) || Math.hypot(x - t.foldAt[0], y - t.foldAt[1]) <= t.w / 2 + reach) return { tape: t, fromB: t.g < 0 };
        continue;
      }
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
    const t = hit.tape, A = hit.fromB ? t.b : t.a, len = Math.hypot(t.b[0] - t.a[0], t.b[1] - t.a[1]) || 1, hand = wallPoint(e.clientX, e.clientY), p0 = Math.abs(t.g || 0);
    rip = { id: e.pointerId, tape: t, fromB: hit.fromB, p: p0, g0: t.g || 0, k: p0 - (Math.hypot(hand[0] - A[0], hand[1] - A[1]) * 0.75) / len, hand, m: [] };
    track(rip.m, e);
    view.style.cursor = "grabbing";
    drawOverlays();
  }
  function moveRip(e) {
    const R = rip, t = R.tape, A = R.fromB ? t.b : t.a, len = Math.hypot(t.b[0] - t.a[0], t.b[1] - t.a[1]) || 1;
    R.hand = wallPoint(e.clientX, e.clientY);
    track(R.m, e);
    R.p = clamp((Math.hypot(R.hand[0] - A[0], R.hand[1] - A[1]) * 0.75) / len + R.k, 0, 1);
    t.g = Math.round((R.fromB ? -R.p : R.p) * 1000) / 1000;
    shapeTape(t);
    if (R.p >= 1) { endRip(false, true); return; }
    pushProp(t, { g: t.g });
    overlaysSoon();
  }
  function endRip(cancel, done) {
    const R = rip;
    if (!R) return;
    rip = null;
    const t = R.tape, [vx, vy] = speed(R.m), fast = Math.hypot(vx, vy) > 900, A = R.fromB ? t.b : t.a, pull = vx * (R.hand[0] - A[0]) + vy * (R.hand[1] - A[1]) > 0;
    if (!cancel && props.has(t.id) && (done || R.p >= 0.9 || (fast && R.p > 0.05 && pull))) {
      const ppu = k0 * Z;
      let dir = [vx / ppu, vy / ppu];
      if (Math.hypot(vx, vy) < 300) { const fx = R.hand[0] - A[0], fy = R.hand[1] - A[1], l = Math.hypot(fx, fy) || 1; dir = [((fx / l) * 700) / ppu, ((fy / l) * 700) / ppu]; }
      t.g = R.fromB ? -R.p : R.p;
      clearTimeout(t.pt); t.pend = null;
      props.delete(t.id);
      reindex();
      peelAway([t], R.hand, dir);
      save("props/" + t.id, null, "DELETE");
    } else {
      t.g = cancel ? R.g0 : R.p < 0.03 ? 0 : t.g;
      shapeTape(t);
      if (props.has(t.id)) { pushProp(t, { g: t.g }); flushProp(t); }
      reindex();
      forgetLayer(flapL);
      rerender(flapL, true);
      drawOverlays();
    }
    cursor();
    sync();
  }

  function startTape(e) {
    const hit = ripAt(e);
    if (hit) { startRip(e, hit); return; }
    if (tapes.filter(inView).length >= MAX_TAPES) { flash("THAT IS A LOT OF TAPE HERE, PEEL SOME OFF FIRST"); return; }
    try { view.setPointerCapture(e.pointerId); } catch (err) {}
    const a = wallPoint(e.clientX, e.clientY);
    tapeDrag = { id: e.pointerId, a, b: a, w: (sizeOf(TAPES) / (k0 * Z)) * (host ? 2.2 : 1), teeth: Array.from({ length: 8 }, () => Math.round(Math.random() * 9) / 9) };
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
    if (!tipped) { tipped = true; flash("GRAB THE END OF A STRIP AND PEEL IT, LET GO HALFWAY AND IT STAYS"); }
    drawOverlays();
    sync();
  }

  function maskNow(p, z, reach = 0) {
    const e = Math.max(60, reach), near = (q) => q.bb[2] >= p * WX - e && q.bb[0] <= (p + 1) * WX + e;
    const ts = tapes.filter(near), ss = sheets.filter(near), gz = GZONE.x1 >= p * WX - e && GZONE.x0 <= (p + 1) * WX + e;
    if (!ts.length && !ss.length && !gz) return null;
    const s = 2 ** z, b = p * WX, q = (poly) => poly.map((n, i) => Math.round((i % 2 ? n : n - b) * s) / s), tp = [], ids = [], sh = [];
    if (gz) { tp.push(q([GZONE.x0, GZONE.y0, GZONE.x1, GZONE.y0, GZONE.x1, GZONE.y1, GZONE.x0, GZONE.y1])); ids.push(""); }
    ts.forEach((t) => { if (t.stuck) { tp.push(q(t.stuck)); ids.push(t.id); } });
    ts.forEach((t) => { if (t.flap) { tp.push(q(t.flap)); ids.push(t.tag); } });
    ss.forEach((h) => { if (h.stuck) sh.push({ sheet: q(h.stuck.poly), holes: h.stuck.holes.map(q), key: h.id + ":" + h.v }); });
    ss.forEach((h) => { if (h.flapP) sh.push({ sheet: q(h.flapP.poly), holes: h.flapP.holes.map(q), key: h.id + ":" + h.v + ":" + h.tag }); });
    return tp.length || sh.length ? { tapes: tp, tapeIds: ids, sheets: sh } : null;
  }

  function reindex() {
    geoV++;
    tapes = []; sheets = [];
    alive.t.clear(); alive.s.clear();
    props.forEach((q) => {
      if (q.kind === "t") { tapes.push(q); alive.t.add(q.id); if (q.flap) alive.t.add(q.tag); }
      else { sheets.push(q); alive.s.add(q.id + ":" + q.v); if (q.flapP) alive.s.add(q.id + ":" + q.v + ":" + q.tag); }
    });
    tapes.sort(older); sheets.sort(older);
  }

  const encHoles = (holes) => holes.map((h) => Array.from(h, (x) => Math.round(clamp(x, 0, 1) * 1000)).join(",")).join(";");
  function decHoles(s, c) {
    const cs = String(c || "").split(","), holes = [], cols = [];
    String(s || "").split(";").forEach((q, i) => {
      const h = q.split(",").map((x) => +x / 1000);
      if (h.length < 6 || h.length % 2 || !h.every((x) => x >= 0 && x <= 1)) return;
      holes.push(h);
      cols.push(/^[0-9a-f]{6}$/.test(cs[i] || "") ? cs[i] : "");
    });
    return { holes, cols: cols.some(Boolean) ? cols : null };
  }
  const isNum = (v) => typeof v === "number" && isFinite(v) && Math.abs(v) < 1e7;
  const SV = { ".sv": "timestamp" };

  function wire(q) {
    const b = q.p * WX;
    if (q.kind === "t") return { k: "t", p: q.p, ax: q.a[0] - b, ay: q.a[1], bx: q.b[0] - b, by: q.b[1], w: q.w, e: q.teeth.map((x) => Math.round(clamp(x, 0, 1) * 9)).join(""), ...(q.g ? { g: q.g } : {}), t: SV };
    return { k: "s", p: q.p, x: q.x - b, y: q.y, s: q.s, r: q.a, h: encHoles(q.st.holes), v: q.v, n: q.name || "", ...(q.cols ? { c: q.cols.join(",") } : {}), ...(q.lay >= 0 ? { l: q.lay } : {}), ...(q.f ? peelFields(q) : {}), t: SV };
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
      const { holes, cols } = decHoles(v.h, typeof v.c === "string" ? v.c : "");
      if (!holes.length) return null;
      const lz = layerize(cols, holes);
      const sh = { id, kind: "s", p: v.p, x: b + v.x, y: v.y, s: v.s, a: v.r, v: v.v, name: typeof v.n === "string" ? v.n.slice(0, 20) : "", st: { holes }, cols, ...lz, lay: Number.isInteger(v.l) && v.l >= 0 && v.l < lz.layers.length ? v.l : -1, f: isNum(v.fu) && isNum(v.fw) ? peelOf([v.fu, v.fw]) : null };
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

  const same = (a, b) => (!a && !b) || (!!a && !!b && a[0] === b[0] && a[1] === b[1]);
  const held = (q) => (sheetDrag && sheetDrag.sheet === q) || (liftDrag && liftDrag.sheet === q) || (rip && rip.tape === q);
  function upsert(id, raw) {
    const q = propOf(id, raw);
    if (!q) return;
    const old = props.get(id);
    if (old && old.kind !== q.kind) return;
    if (old && (held(old) || old.pend)) return;
    const moved = !!old && q.kind === "s" && (old.v !== q.v || old.lay !== q.lay), folded = !!old && (q.kind === "t" ? old.g !== q.g : !same(old.f, q.f));
    if (old) {
      if (q.kind === "s" && old.lay !== q.lay) { old.flip = { t0: performance.now(), old: { ...old } }; loop(); }
      ["p", "a", "b", "w", "teeth", "g", "x", "y", "s", "v", "name", "st", "cols", "layers", "hl", "lay", "f"].forEach((k) => { if (k in q) old[k] = q[k]; });
      if (old.kind === "t") shapeTape(old); else shapeSheet(old);
    } else props.set(id, q);
    reindex();
    if (moved) { forgetLayer(sheetL); forgetLayer(flapL); }
    else if (folded) forgetLayer(flapL);
    layers.forEach((L) => { if (layerOn(L) && (moved || (L === flapL && folded) || (!L.tile && !L.job))) rerender(L, true); });
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
    else liftAway(q, [30, -240]);
    sync();
  }

  function setIn(root, parts, value) {
    let o = root;
    for (let i = 0; i < parts.length - 1; i++) { if (!o[parts[i]] || typeof o[parts[i]] !== "object") o[parts[i]] = {}; o = o[parts[i]]; }
    const k = parts[parts.length - 1];
    if (value === null || value === undefined) delete o[k]; else o[k] = value;
  }
  function openLive() {
    if (liveSrc || !(active || host) || document.hidden || typeof EventSource === "undefined") return;
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
    if (who) who.append(el);
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
    Object.keys(d).filter((k) => /^c[0-9]{1,5}$/.test(k)).sort((a, b) => a.slice(1) - b.slice(1)).forEach((k) => { if (typeof d[k] === "string" && /^[-0-9,]+$/.test(d[k])) d[k].split(",").forEach((n) => pts.push(+n * sc)); });
    if (pts.length % 2) pts.pop();
    if (pts.length < 2 || pts.some((n) => !isFinite(n))) return null;
    const h = s.k === "d" && H_OK.has(s.h) ? s.h : undefined;
    return bounds({ id: s.id, p: s.p, k: s.k, c: s.c, w: Math.min(s.w, spanOf(s.c, h)), z: s.z, h, r: h === "roller" && Number.isInteger(s.r) && s.r > 0 && s.r <= 1e8 ? s.r : undefined, d: pts, mask: null, up: pts.some((n, i) => i % 2 === 1 && n < 0) });
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
  const inkSoon = () => { inkV++; if (!inkRaf && ink) inkRaf = requestAnimationFrame(drawInk); };
  function tidy() {
    const now = performance.now(), t = Date.now();
    let dirty = false;
    others.forEach((q) => { if (now - q.seen > 8000) { if (q.op) { q.op = null; dirty = true; } placeMate(q); } });
    ghosts.forEach((g, id) => { if (g.until < t) { ghosts.delete(id); dirty = true; } });
    if (dirty) inkSoon();
  }

  function pushLive(fields) {
    if (!(active || host)) return;
    Object.assign(outbox.patch, fields);
    if (!outbox.timer && !outbox.busy) outbox.timer = setTimeout(flushLive, 120);
  }
  function flushLive() {
    outbox.timer = 0;
    if (outbox.busy || !(active || host)) return;
    inkChunk();
    if (!Object.keys(outbox.patch).length) return;
    const data = { ...outbox.patch, t: SV };
    outbox.patch = {};
    outbox.busy = true;
    fetch(liveUrl("who/" + SID), { method: "PATCH", body: JSON.stringify(data) }).catch(() => {}).finally(() => {
      outbox.busy = false;
      if ((active || host) && (Object.keys(outbox.patch).length || (live && live.ink && live.ink.n < live.d.length))) outbox.timer = setTimeout(flushLive, 120);
    });
  }
  function inkChunk() {
    const op = live;
    if (!op || !op.ink || op.ink.n >= op.d.length) return;
    const s = 2 ** op.z, add = op.d.slice(op.ink.n).map((n, i) => ((op.ink.n + i) % 2 ? Math.round(n * s) : Math.max(0, Math.round(n * s)))).join(",");
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
    if (op.r) outbox.patch.s.r = op.r;
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
    if (!(active || host) || lapse) return;
    const [x, y] = wallPoint(e.clientX, e.clientY), p = Math.max(0, Math.floor(x / WX));
    pushLive({ p, x: x - p * WX, y, n: nick(), c: tintKey() });
  }
  const nick = () => { try { const m = wallet(); return m && typeof m.nick === "string" ? m.nick.slice(0, 16) : ""; } catch (e) { return ""; } };
  const tintKey = () => (tool === "tape" ? "tape" : tool === "stencil" ? "card" : tool === "eraser" || tool === "wipe" ? "eraser" : tool === "bands" ? "rainbow" : tool === "spray" || tool === "roller" ? color : hex);
  function leaveLive() {
    clearTimeout(outbox.timer);
    outbox.timer = 0;
    outbox.patch = {};
    save("who/" + SID, null, "DELETE", true);
  }
  function hover(e) {
    if (lapse || e.buttons || !view) return;
    let k = "";
    const P = canvasPt(e), v = viewNow();
    if (sheets.some((sh) => onLayer(sh, P, v))) k = "pointer";
    else if (tool === "tape") k = ripAt(e) ? "grab" : "";
    else if (tool === "stencil") {
      const w = wallPoint(e.clientX, e.clientY);
      k = sheets.some((sh) => onPeel(sh, P, w, v)) ? "grab" : sheets.some((sh) => onHandle(sh, P, v)) ? "nwse-resize" : sheets.some((sh) => sh.stuck && inside(sh.stuck.poly, w)) ? "move" : "pointer";
    }
    if (k === hoverK) return;
    if (k) { hoverK = k; view.style.cursor = k; if (ring) ring.hidden = true; } else cursor();
  }

  function touchOp(op, painted) {
    ext.forEach((t) => {
      if (!hits(op, t.v.x0, t.v.y0, t.x1, t.y1)) return;
      if (painted && op.drawn && op.drawn.has(t)) { if (op.id > t.last) t.last = op.id; return; }
      if (op.id > t.last && !t.job) { paintOp(op, t.c, t.v); t.last = op.id; t.dirty = true; return; }
      t.redraw();
    });
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
    ext.forEach((t) => { if (hits(it, t.v.x0, t.v.y0, t.x1, t.y1)) t.redraw(); });
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
    const m = op.w * marginOf(op.c, op.h), b = op.p * WX, reach = Math.ceil((m + 2) / WX);
    if (reach > spill) spill = Math.min(SPAN, reach);
    op.bb = [b + x0 - m, y0 - m, b + x1 + m, y1 + m + op.w * (op.h === "drip" ? 11 : op.h === "brush" || op.h === "roller" ? 0 : 6.5)];
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
    if (typeof v.d !== "string" || !/^[-0-9,]+$/.test(v.d)) return null;
    const pts = v.d.split(",").map(Number);
    if (pts.length < 2 || pts.length % 2 || pts.some((n, i) => !Number.isInteger(n) || (i % 2 === 0 && n < 0))) return null;
    const z = Number.isInteger(v.z) && v.z > 0 && v.z <= 30 ? v.z : 0, sc = 2 ** -z;
    let ox = 0, oy = 0;
    if (z) {
      const o = typeof v.o === "string" && v.o.match(/^([0-9]+),(-?[0-9]+)$/);
      if (!o) return null;
      ox = +o[1]; oy = +o[2];
    }
    const tp = polys(v.m, sc, ox, oy, M_MAX), sh = sheetsOf(v.s, sc, ox, oy);
    if (!tp || !sh) return null;
    const d = pts.map((n, i) => (n + (i % 2 ? oy : ox)) * sc), ids = idsOf(v.q);
    sh.forEach((x, i) => { x.key = ids.s[i] || null; });
    const mask = tp.length || sh.length ? { tapes: tp, tapeIds: tp.map((_, i) => ids.t[i] || null), sheets: sh } : null;
    const h = (v.k === "d" && H_OK.has(v.h)) || (v.k === "e" && v.h === "roller") ? v.h : undefined, a = TAG.test(v.a) ? v.a : undefined, u = TAG.test(v.u) ? v.u : undefined;
    const r = h === "roller" && Number.isInteger(v.r) && v.r > 0 && v.r <= 1e8 ? v.r : undefined;
    return bounds({ id, p, k: v.k, d, raw: v.d, c: v.k === "e" ? undefined : v.c, h, r, wr: clamp(v.w || 12, 3, W_MAX), w: Math.min(clamp(v.w || 12, 3, W_MAX) * sc, spanOf(v.c, h)), z, o: z ? v.o : undefined, mask, m: v.m, s: v.s, q: mask ? v.q : undefined, a, u, up: d.some((n, i) => i % 2 === 1 && n < 0) });
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
    ext.forEach((t) => { if (t.x1 >= P.p * WX - 100 && t.v.x0 <= (P.p + 1) * WX + 100) t.redraw(); });
    lod.forEach((t) => { if (t.x1 >= P.p * WX - 100 && t.v.x0 <= (P.p + 1) * WX + 100) { if (shown.has(t)) render(t); else { t.el.remove(); lod.delete(t.key); } } });
    sync();
  }

  const message = (e) => { try { return JSON.parse(e.data || "null"); } catch (err) { return null; } };
  const num = (k) => (/^(0|[1-9][0-9]*)$/.test(k) ? +k : -1);
  function ingest(path, data) {
    const parts = path.split("/").filter(Boolean);
    if (!parts.length) {
      kindsIn(data && data.kinds, true);
      matsIn(data && data.mats, true);
      Object.keys(data || {}).forEach((k) => { if (num(k) >= 0 && data[k]) loadAll(panel(num(k)), data[k]); });
      return;
    }
    if (parts[0] === "kinds") { if (parts.length === 1) kindsIn(data, true); else if (parts.length === 2) kindsIn({ [parts[1]]: data }, false); return; }
    if (parts[0] === "mats") { if (parts.length === 1) matsIn(data, true); else if (parts.length === 2) matsIn({ [parts[1]]: data }, false); return; }
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

  function kindsIn(obj, whole) {
    const next = whole ? {} : { ...wallKinds };
    Object.keys(obj && typeof obj === "object" ? obj : {}).forEach((k) => {
      const p = num(k);
      if (p < 0) return;
      if (typeof obj[k] === "string" && KIND_IDS.has(obj[k])) next[p] = obj[k]; else delete next[p];
    });
    applyKinds(next);
  }
  function applyKinds(next) {
    wallKinds = next;
    setWallKinds(next).forEach((p) => lod.forEach((t) => { if (t.x1 > p * WX && t.v.x0 < (p + 1) * WX) backdrop(t.bg.getContext("2d"), t.v, t.x1, t.y1); }));
    if (kindPick && !kindPick.hidden) markKinds();
  }
  function matsIn(obj, whole) {
    if (whole) wallMats = {};
    Object.keys(obj && typeof obj === "object" ? obj : {}).forEach((id) => {
      const m = obj[id];
      if (m && typeof m === "object" && [m.x0, m.y0, m.x1, m.y1].every(isNum) && m.x1 > m.x0 && m.y1 > m.y0 && (m.k === "brick" || KIND_IDS.has(m.k))) wallMats[id] = { x0: m.x0, y0: m.y0, x1: m.x1, y1: m.y1, k: m.k, t: typeof m.t === "number" ? m.t : 0 };
      else delete wallMats[id];
    });
    const list = Object.entries(wallMats).sort((x, y) => x[1].t - y[1].t || (x[0] < y[0] ? -1 : 1)).map(([, m]) => ({ x0: m.x0, y0: m.y0, x1: m.x1, y1: m.y1, k: m.k }));
    if (setWallMats(list)) lod.forEach((t) => backdrop(t.bg.getContext("2d"), t.v, t.x1, t.y1));
  }

  function markKinds() { kindPick.querySelectorAll("[data-kind]").forEach((b) => b.setAttribute("aria-pressed", String(!!matBox && b.dataset.kind === matBox.k))); }
  function openMats() {
    kindPick.querySelectorAll("[data-kind] canvas").forEach((cv) => { if (!cv.width || cv.width === 300) wallSwatch(cv, cv.parentNode.dataset.kind); });
    markKinds();
    if (pick) pick.close();
    if (caps) caps.hidden = true;
    if (colPop) colPop.hidden = true;
    closeSell();
    kindPick.hidden = false;
  }
  function startBox(k) {
    const ppu = k0 * Z, vw = W / ppu, vh = H / ppu, w = Math.min(vw * 0.3, 700), h = Math.min(vh * 0.3, 500);
    const x0 = Math.max(0, cx - w / 2), y0 = clamp(cy - h / 2, -UPH, WY - h);
    matBox = { k, x0, y0, x1: x0 + w, y1: y0 + h, drag: null };
    if (!matEl) {
      matEl = document.createElement("div");
      matEl.className = "wv-mat";
      matEl.innerHTML = `<i data-mh="nw"></i><i data-mh="ne"></i><i data-mh="sw"></i><i data-mh="se"></i><div class="wv-mat-bar"><button class="btn go" type="button" data-mat-ok></button><button class="btn" type="button" data-mat-x>Cancel</button></div>`;
      view.append(matEl);
      matEl.addEventListener("pointerdown", (e) => {
        e.stopPropagation();
        if (e.target.closest("button")) return;
        e.preventDefault();
        const h = e.target.dataset.mh || "move", [ux, uy] = wallPoint(e.clientX, e.clientY);
        matBox.drag = { h, ux, uy, b: [matBox.x0, matBox.y0, matBox.x1, matBox.y1], id: e.pointerId };
        try { matEl.setPointerCapture(e.pointerId); } catch (err) {}
      });
      matEl.addEventListener("pointermove", (e) => {
        const D = matBox && matBox.drag;
        if (!D || e.pointerId !== D.id) return;
        const [ux, uy] = wallPoint(e.clientX, e.clientY), dx = ux - D.ux, dy = uy - D.uy, min = 24 / (k0 * Z), [a, b, c2, d] = D.b;
        let [x0, y0, x1, y1] = D.b;
        if (D.h === "move") { const w = c2 - a, h = d - b; x0 = Math.max(0, a + dx); y0 = clamp(b + dy, -UPH, WY - h); x1 = x0 + w; y1 = y0 + h; }
        else {
          if (D.h[1] === "w") x0 = clamp(a + dx, 0, c2 - min); else x1 = Math.max(a + min, c2 + dx);
          if (D.h[0] === "n") y0 = clamp(b + dy, -UPH, d - min); else y1 = clamp(d + dy, b + min, WY);
        }
        Object.assign(matBox, { x0, y0, x1, y1 });
        placeMat();
      });
      const end = (e) => { if (matBox && matBox.drag && e.pointerId === matBox.drag.id) matBox.drag = null; };
      matEl.addEventListener("pointerup", end);
      matEl.addEventListener("pointercancel", end);
      matEl.addEventListener("click", (e) => {
        if (e.target.closest("[data-mat-x]")) closeBox();
        else if (e.target.closest("[data-mat-ok]")) useBox();
      });
    }
    const sw = document.createElement("canvas");
    wallSwatch(sw, k, 160, 90);
    matEl.style.setProperty("--mat", `url(${sw.toDataURL()})`);
    matEl.querySelector("[data-mat-ok]").textContent = "Use " + kindName(k);
    matEl.hidden = false;
    placeMat();
    flash("DRAG THE BOX AND ITS CORNERS OVER BARE WALL, THEN PRESS USE");
  }
  function placeMat() {
    if (!matEl || !matBox) return;
    const ppu = k0 * Z, x = (matBox.x0 - cx) * ppu + W / 2, y = (matBox.y0 - cy) * ppu + H / 2;
    matEl.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`;
    matEl.style.width = ((matBox.x1 - matBox.x0) * ppu).toFixed(1) + "px";
    matEl.style.height = ((matBox.y1 - matBox.y0) * ppu).toFixed(1) + "px";
    matEl.style.backgroundSize = `${(160 * ART * ppu).toFixed(1)}px ${(90 * ARTY * ppu).toFixed(1)}px`;
    const bot = (matBox.y1 - cy) * ppu + H / 2;
    matEl.classList.toggle("up", bot + 52 > H && y > 52);
    matEl.classList.toggle("in", bot + 52 > H && y <= 52);
  }
  function closeBox() {
    matBox = null;
    if (matEl) matEl.hidden = true;
  }
  function inkInBox(x0, y0, x1, y1) {
    const list = opsIn(x0, y0, x1, y1);
    if (!list.length || !list.some((o) => o.k !== "e")) return false;
    const r = Math.min(2, 360 / Math.max(x1 - x0, y1 - y0)), cv = document.createElement("canvas"), v = { x0, y0, r };
    cv.width = Math.max(1, Math.ceil((x1 - x0) * r)); cv.height = Math.max(1, Math.ceil((y1 - y0) * r));
    const c = cv.getContext("2d", { willReadFrequently: true });
    list.forEach((op) => paintOp(op, c, v));
    reset(c);
    const px = c.getImageData(0, 0, cv.width, cv.height).data, most = Math.max(4, (px.length / 4) * 0.002);
    let n = 0;
    for (let i = 3; i < px.length && n <= most; i += 4) if (px[i] > 90) n++;
    return n > most;
  }
  function useBox() {
    const b = matBox;
    if (!b) return;
    const box = { x0: Math.round(b.x0), y0: Math.round(b.y0), x1: Math.round(b.x1), y1: Math.round(b.y1), k: b.k };
    if (inkInBox(box.x0, box.y0, box.x1, box.y1)) { flash("THERE IS PAINT IN THE BOX, MOVE IT OR MAKE IT SMALLER"); return; }
    const id = pushId();
    closeBox();
    matsIn({ [id]: { ...box, t: Date.now() } }, false);
    fetch(DB + "/" + FAR + "/mats/" + id + ".json", { method: "PUT", body: JSON.stringify({ ...box, t: SV }) })
      .then((r) => { if (!r.ok) throw r.status; })
      .catch(() => { matsIn({ [id]: null }, false); flash("COULD NOT CHANGE THE WALL, TRY AGAIN"); });
  }

  const owns = (o) => !o.local && ((!!tagA && o.a === tagA) || (!!tagU && o.u === tagU));
  function inPoly(poly, x, y) {
    let c = false;
    for (let i = 0, j = poly.length - 2; i < poly.length; j = i, i += 2) {
      const xi = poly[i], yi = poly[i + 1], xj = poly[j], yj = poly[j + 1];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi || 1e-9) + xi) c = !c;
    }
    return c;
  }
  function picked(poly) {
    let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
    for (let i = 0; i < poly.length; i += 2) { bx0 = Math.min(bx0, poly[i]); bx1 = Math.max(bx1, poly[i]); by0 = Math.min(by0, poly[i + 1]); by1 = Math.max(by1, poly[i + 1]); }
    const ops = opsIn(bx0, by0, bx1, by1).filter((o) => {
      if (!owns(o)) return false;
      const n = o.d.length / 2, step = Math.max(1, Math.floor(n / 24));
      let inside = 0, all = 0;
      for (let i = 0; i < n; i += step) { all++; if (inPoly(poly, o.p * WX + o.d[i * 2], o.d[i * 2 + 1])) inside++; }
      return inside / all >= 0.6;
    });
    if (!ops.some((o) => o.k !== "e")) return null;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    ops.forEach((o) => { x0 = Math.min(x0, o.bb[0]); y0 = Math.min(y0, o.bb[1]); x1 = Math.max(x1, o.bb[2]); y1 = Math.max(y1, o.bb[3]); });
    return { ops: ops.sort(older), bb: [x0, y0, x1, y1] };
  }
  function drawSel() {
    if (!selCv) return;
    const w = Math.max(1, Math.round(W * DPR())), h = Math.max(1, Math.round(H * DPR()));
    if (selCv.width !== w || selCv.height !== h) { selCv.width = w; selCv.height = h; }
    const c = selCv.getContext("2d");
    c.setTransform(1, 0, 0, 1, 0, 0);
    reset(c);
    c.clearRect(0, 0, w, h);
    selCv.hidden = !sellMode;
    if (!sellMode || (!lasso && !(selling && selling.g))) return;
    const v = viewNow(), d = DPR();
    c.fillStyle = "rgba(0,0,20,.62)";
    c.fillRect(0, 0, w, h);
    if (selling && selling.g) {
      if (!selTmp) selTmp = document.createElement("canvas");
      if (selTmp.width !== w || selTmp.height !== h) { selTmp.width = w; selTmp.height = h; }
      const q = selTmp.getContext("2d");
      q.clearRect(0, 0, w, h);
      selling.g.ops.forEach((op) => paintOp(op, q, v));
      reset(q);
      c.save();
      c.shadowColor = "#fff"; c.shadowBlur = 7 * d;
      c.drawImage(selTmp, 0, 0);
      c.shadowColor = "#fff"; c.shadowBlur = 2 * d;
      c.drawImage(selTmp, 0, 0);
      c.restore();
    }
    if (lasso && lasso.length >= 4) {
      c.beginPath();
      for (let i = 0; i < lasso.length; i += 2) { const x = (lasso[i] - v.x0) * v.r, y = (lasso[i + 1] - v.y0) * v.r; if (i) c.lineTo(x, y); else c.moveTo(x, y); }
      if (!lassoDrag) c.closePath();
      c.lineWidth = 3 * DPR(); c.strokeStyle = "#000"; c.setLineDash([]); c.stroke();
      c.lineWidth = 1.5 * DPR(); c.strokeStyle = "#fff"; c.setLineDash([6 * DPR(), 4 * DPR()]); c.stroke();
      c.setLineDash([]);
    }
  }
  function snap(g) {
    const x0 = g.bb[0] - 8, y0 = Math.max(-UPH - 12 * ARTY, g.bb[1] - 8), x1 = g.bb[2] + 8, y1 = Math.max(y0 + 10, Math.min(WY + 30, g.bb[3] + 8));
    const s = Math.min(2, TS / Math.max(x1 - x0, y1 - y0)), v = { x0, y0, r: s };
    const cv = document.createElement("canvas"), pc = document.createElement("canvas");
    cv.width = pc.width = Math.max(16, Math.ceil((x1 - x0) * s));
    cv.height = pc.height = Math.max(16, Math.ceil((y1 - y0) * s));
    const c = cv.getContext("2d"), q = pc.getContext("2d");
    backdrop(c, v, x1, y1);
    g.ops.forEach((op) => paintOp(op, q, v));
    reset(q);
    c.drawImage(pc, 0, 0);
    g.fly = pc; g.flyRect = [x0, y0, x0 + pc.width / s, y0 + pc.height / s];
    return cv.toDataURL("image/jpeg", 0.86);
  }

  const n3 = (n) => (Math.round(n * 1000) / 1000).toLocaleString("en-US", { maximumFractionDigits: 3 });
  function sellText(html, msg) {
    const b = sellPop.querySelector("[data-sell-b]");
    b.innerHTML = html;
    if (msg !== undefined) b.querySelector("[data-sell-msg]").textContent = msg;
    return b;
  }
  function popTitle(t) { const h = sellPop.querySelector(".tb-t"); h.textContent = t; sellPop.setAttribute("aria-label", t); }
  const when = (ms) => { const d = Math.max(0, ms - Date.now()), h = Math.round(d / 3600000); return h >= 36 ? `${Math.round(h / 24)} days` : h >= 2 ? `${h} hours` : "less than two hours"; };
  const escT = (t) => String(t).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]);
  async function openTheme() {
    if (sellMode) closeSell();
    if (pick) pick.close();
    if (caps) caps.hidden = true;
    if (kindPick) kindPick.hidden = true;
    if (colPop) colPop.hidden = true;
    closeBox();
    lassoFor = "theme";
    galleryJob = null;
    loadGallery();
    popTitle("Theme of the week");
    sellPop.hidden = false;
    const run = ++themeRun;
    sellText(`<p data-sell-msg></p>`, "Asking Haiku for this week's theme...");
    try {
      const j = await api("/wall/theme");
      if (run !== themeRun || sellPop.hidden) return;
      const top = j.top.length ? `<ol class="pt-theme-top">${j.top.map((r) => `<li${r.me ? ' class="me"' : ""}><b>${r.score}/10</b> ${escT(r.nick)}</li>`).join("")}</ol>` : `<p class="pt-sell-n">Nobody entered yet. Be the first!</p>`;
      const mine = j.mine && j.mine.entered ? `<p class="pt-sell-n">You entered ${j.mine.entered} of ${j.tries}, your best is ${j.mine.best}/10${j.mine.rank ? `, place ${j.mine.rank}` : ""}.</p>` : `<p class="pt-sell-n">You can enter up to ${j.tries} drawings this week.</p>`;
      sellText(`<p class="pt-theme-t">${escT(j.title)}</p><p data-sell-msg></p><p class="pt-sell-n">Ends in ${when(j.ends)}. The top three move into the gold frames of the Wall Gallery at the top of the wall's start right away, and whoever is still there on Monday wins ${j.prizes.join(", ")} szyszki.</p>${top}${mine}
<p class="bk-row"><button class="btn go" type="button" data-theme-enter${j.mine && j.mine.entered >= j.tries ? " disabled" : ""}>Enter a drawing</button><button class="btn" type="button" data-theme-gal>See the gallery</button><button class="btn" type="button" data-sell-x>Close</button></p>`, j.about);
    } catch (e) {
      if (run === themeRun) sellText(`<p data-sell-msg></p><p class="bk-row"><button class="btn" type="button" data-sell-x>OK</button></p>`, e.message);
    }
  }
  function fly(g, to) {
    if (!view || !g || !g.fly || !g.flyRect || !to) return;
    const from = g.flyRect, ux0 = Math.min(from[0], to[0]), ux1 = Math.max(from[2], to[2]), uy0 = Math.min(from[1], to[1]), uy1 = Math.max(from[3], to[3]);
    sellPop.classList.add("right");
    const vr = view.getBoundingClientRect(), pr = sellPop.hidden ? null : sellPop.getBoundingClientRect(), R = pr ? Math.max(0, vr.right - pr.left + 12) : 0, UW = Math.max(120, W - R);
    Z = clamp(Math.min(UW / ((ux1 - ux0) * 1.3), H / ((uy1 - uy0) * 1.3)) / k0, MINZ, MAXZ);
    cx = (ux0 + ux1) / 2 + R / 2 / (k0 * Z); cy = (uy0 + uy1) / 2;
    clampView(); present(); cursor();
    const ppu = k0 * Z, sx = (x) => W / 2 + (x - cx) * ppu, sy = (y) => H / 2 + (y - cy) * ppu;
    const a = [sx(from[0]), sy(from[1]), Math.max(1, (from[2] - from[0]) * ppu), Math.max(1, (from[3] - from[1]) * ppu)];
    const b = [sx(to[0]), sy(to[1]), Math.max(1, (to[2] - to[0]) * ppu), Math.max(1, (to[3] - to[1]) * ppu)];
    const el = g.fly;
    el.className = "wv-fly";
    el.style.cssText = `left:${a[0].toFixed(1)}px;top:${a[1].toFixed(1)}px;width:${a[2].toFixed(1)}px;height:${a[3].toFixed(1)}px`;
    view.append(el);
    const end = `translate(${(b[0] - a[0]).toFixed(1)}px,${(b[1] - a[1]).toFixed(1)}px) scale(${(b[2] / a[2]).toFixed(4)},${(b[3] / a[3]).toFixed(4)})`;
    const lift = `translate(${((b[0] - a[0]) * 0.18).toFixed(1)}px,${((b[1] - a[1]) * 0.18 - 24).toFixed(1)}px) scale(${(1 + (b[2] / a[2] - 1) * 0.1).toFixed(4)})`;
    const anim = el.animate ? el.animate([{ transform: "none", offset: 0 }, { transform: lift, offset: 0.22 }, { transform: end, offset: 1 }], { duration: 1400, easing: "cubic-bezier(.45,0,.2,1)", fill: "forwards" }) : null;
    const done = () => { if (el.animate) el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500, fill: "forwards" }); setTimeout(() => el.remove(), 520); };
    if (anim) anim.onfinish = () => setTimeout(done, 900); else setTimeout(() => el.remove(), 1500);
  }
  function toGallery() {
    closeSell();
    const r = view.getBoundingClientRect();
    cx = (GZONE.x0 + GZONE.x1) / 2; cy = (GZONE.y0 + GZONE.y1) / 2;
    const want = Math.min(W / ((GZONE.x1 - GZONE.x0) * 1.05), H / ((GZONE.y1 - GZONE.y0) * 1.1)) / k0;
    zoomAt(want / Z, r.left + W / 2, r.top + H / 2);
    sync();
  }
  function startLasso(kind) {
    if (kind) lassoFor = kind;
    if (!tagA && !tagU) { if (lassoFor === "theme") { sellText(`<p data-sell-msg></p><p class="bk-row"><button class="btn" type="button" data-sell-x>OK</button></p>`, "Paint something on the wall first, then come back and draw a loop around it."); } return; }
    if (pick) pick.close();
    if (caps) caps.hidden = true;
    if (kindPick) kindPick.hidden = true;
    if (colPop) colPop.hidden = true;
    closeBox();
    sellMode = true;
    lasso = null; lassoDrag = false;
    selling = { g: null, quote: null };
    sellPop.hidden = false;
    popTitle(lassoFor === "theme" ? "Theme of the week" : "Sell to Haiku");
    sellText(`<p data-sell-msg></p><p class="bk-row"><button class="btn" type="button" data-sell-x>Cancel</button></p>`, lassoFor === "theme" ? "Draw a loop around the drawing you want to enter. Only your own strokes count, everything Haiku will judge lights up." : "Draw a loop around the drawing you want to sell. Only your own strokes count, everything that will be sold lights up.");
    cursor();
    drawSel();
  }
  function lassoDone() {
    lassoDrag = false;
    const g = lasso && lasso.length >= 6 ? picked(lasso) : null;
    if (!g) {
      selling.g = null;
      sellText(`<p data-sell-msg></p><p class="bk-row"><button class="btn" type="button" data-sell-x>Cancel</button></p>`, "None of your own paint is inside that loop. Draw around something you painted yourself.");
      drawSel();
      return;
    }
    selling = { g, quote: null };
    const n = g.ops.filter((o) => o.k !== "e").length;
    sellText(`<p data-sell-msg></p><p class="bk-row"><button class="btn go" type="button" data-sell-ask>${lassoFor === "theme" ? "Enter it" : "Show it to Haiku"}</button><button class="btn" type="button" data-sell-again>Draw again</button><button class="btn" type="button" data-sell-x>Cancel</button></p>`, `${n} ${n === 1 ? "stroke" : "strokes"} of yours light up. Only these go to Haiku.`);
    drawSel();
  }
  function closeSell() {
    themeRun++;
    if (sellPop) sellPop.classList.remove("right");
    sellMode = false; lasso = null; lassoDrag = false;
    selling = null;
    if (sellPop) sellPop.hidden = true;
    drawSel();
    if (view) cursor();
  }
  async function askHaiku() {
    const run = selling;
    if (!run || !run.g) return;
    const g = run.g, img = snap(g);
    run.busy = true;
    sellText(`<p class="pt-sell-i"><img alt="Your drawing" src="${img}"></p><p data-sell-msg></p>`, "Haiku is looking at your drawing...");
    if (lassoFor === "theme") {
      try {
        await ensure();
        const j = await api("/wall/theme/enter", { ids: g.ops.map((o) => [o.p, o.id]), key: wallKey, img });
        if (selling !== run) return;
        run.busy = false;
        const place = j.rank ? ["1st", "2nd", "3rd"][j.rank - 1] || j.rank + "th" : "";
        if (j.moved) {
          g.ops.forEach((o) => { const P = panels.get(o.p); if (P) P.seen[o.id] = true; drop(o.p, o.id); forget(o.id); });
          sellMode = false; lasso = null; lassoDrag = false;
          drawSel();
          sync();
          fly(g, j.to);
          galleryJob = null;
          setTimeout(loadGallery, 1500);
        }
        sellText(`<p class="pt-sell-i"><img alt="Your drawing" src="${img}"></p><p class="pt-sell-c" data-sell-msg></p>
<p>Haiku gives it <b>${j.score}/10</b> for "${escT(j.title)}".${place ? ` You are <b>${place}</b> this week so far.` : ""}</p>
<p class="pt-sell-n">${j.moved ? `It moved into frame <b>#${j.rank}</b> of the Wall Gallery. If someone beats it out of the top three, it goes back where you painted it.` : "It is not in the top three, so it stays where you painted it."} ${j.left ? `You can enter ${j.left} more this week, your best one counts.` : "That was your last entry this week."}</p>
<p class="bk-row">${j.moved ? '<button class="btn" type="button" data-theme-gal>See it</button>' : ""}${j.left ? '<button class="btn" type="button" data-sell-again>Enter another</button>' : ""}<button class="btn go" type="button" data-sell-x>Done</button></p>`, `"${j.comment}"`);
      } catch (e) {
        if (selling !== run) return;
        run.busy = false;
        sellText(`<p class="pt-sell-i"><img alt="Your drawing" src="${img}"></p><p data-sell-msg></p><p class="bk-row"><button class="btn" type="button" data-sell-again>Draw again</button><button class="btn" type="button" data-sell-x>Close</button></p>`, e.message);
      }
      return;
    }
    try {
      await ensure();
      const j = await api("/wall/quote", { ids: g.ops.map((o) => [o.p, o.id]), key: wallKey, img });
      if (selling !== run) return;
      run.busy = false; run.quote = j; run.img = img;
      offer(run);
    } catch (e) {
      if (selling !== run) return;
      run.busy = false;
      sellText(`<p class="pt-sell-i"><img alt="Your drawing" src="${img}"></p><p data-sell-msg></p><p class="bk-row"><button class="btn" type="button" data-sell-again>Draw again</button><button class="btn" type="button" data-sell-x>Close</button></p>`, e.message);
    }
  }
  function offer(run) {
    const j = run.quote;
    const b = sellText(`<p class="pt-sell-i"><img alt="Your drawing" src="${run.img}"></p><p class="pt-sell-c" data-sell-msg></p>
<p>Haiku gives it <b>${j.score}/10</b> and offers you:</p>
<p class="pt-sell-pay"><button class="btn go" type="button" data-sell-pay="szy">${cone(14)} ${j.szy} szyszki</button><button class="btn" type="button" data-sell-pay="gzm">${n3(j.gzm)} GZM</button><button class="btn" type="button" data-sell-pay="gzf">${n3(j.gzf)} GZF</button></p>
<p class="pt-sell-n">Pick how you want to be paid. Haiku buys up to five drawings a day from each wallet.</p>
<p class="bk-row"><button class="btn" type="button" data-sell-x>Keep it</button></p>`, `"${j.comment}"`);
    b.querySelector("[data-sell-pay]").focus();
  }
  function confirmSell(pay) {
    const run = selling;
    if (!run || !run.quote) return;
    run.pay = pay;
    const j = run.quote, price = pay === "szy" ? `${j.szy} szyszki` : `${n3(j[pay])} ${pay.toUpperCase()}`;
    const b = sellText(`<p class="pt-sell-i"><img alt="Your drawing" src="${run.img}"></p><p data-sell-msg></p>
<p class="bk-row"><button class="btn go" type="button" data-sell-yes>Yes, sell it</button><button class="btn" type="button" data-sell-back>No, go back</button></p>`, `Sell the lit up paint to Haiku for ${price}? It disappears from the wall for good.`);
    b.querySelector("[data-sell-yes]").focus();
  }
  async function finishSell(btn) {
    const run = selling;
    if (!run || !run.quote || !run.pay) return;
    const pay = run.pay;
    sellPop.querySelectorAll("[data-sell-yes],[data-sell-back]").forEach((b) => { b.disabled = true; });
    btn.textContent = "Selling...";
    try {
      const j = await api("/wall/sell", { quote: run.quote.quote, pay });
      run.g.ops.forEach((o) => { const P = panels.get(o.p); if (P) P.seen[o.id] = true; drop(o.p, o.id); forget(o.id); });
      sync();
      if (selling === run) closeSell();
      toast(`Haiku bought your drawing: +${pay === "szy" ? j.got + " szyszki" : n3(j.got) + " " + pay.toUpperCase()}`);
    } catch (e) {
      if (selling !== run) return;
      sellText(`<p data-sell-msg></p><p class="bk-row"><button class="btn" type="button" data-sell-x>OK</button></p>`, e.message);
    }
  }

  const body = (it) => {
    const b = { k: it.k, d: it.raw, w: it.wr };
    if (it.k !== "e") b.c = it.c;
    if (it.z) { b.z = it.z; b.o = it.o; }
    if (it.h) b.h = it.h;
    if (it.r) b.r = it.r;
    if (it.m) b.m = it.m;
    if (it.s) b.s = it.s;
    if (it.q) b.q = it.q;
    if (it.a) b.a = it.a;
    if (it.u) b.u = it.u;
    return b;
  };

  function pack(it) {
    const s = 2 ** it.z, ints = it.d.map((n, i) => (i % 2 ? Math.round(n * s) : Math.max(0, Math.round(n * s))));
    let ox = 0, oy = 0;
    if (it.z) {
      ox = Infinity; oy = Infinity;
      for (let i = 0; i < ints.length; i += 2) { ox = Math.min(ox, ints[i]); oy = Math.min(oy, ints[i + 1]); }
      it.o = ox + "," + oy;
    }
    it.raw = ints.map((n, i) => n - (i % 2 ? oy : ox)).join(",");
    it.wr = clamp(Math.round(it.w * s), 3, W_MAX);
    it.m = it.s = it.q = undefined;
    it.wc = null;
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
    if (!it.a && tagA) it.a = tagA;
    if (!it.u && tagU) it.u = tagU;
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

  const copyOf = (it) => ({ k: it.k, d: it.d.slice(), c: it.c, h: it.h, r: it.r, w: it.w, z: it.z, p: it.p, mask: it.mask });

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
    if (host) aimNow();
    const r = view.getBoundingClientRect(), ppu = k0 * Z;
    return [cx + (x - r.left - W / 2) / ppu, cy + (y - r.top - H / 2) / ppu];
  }

  function put(x, y) {
    live.d.push(x, y);
    const i = live.d.length - 2;
    shown.forEach((t) => { if (t.ready && t.L === level && !live.ps.has(t)) replayLive(t); });
    if (ext.size) {
      const gx = live.p * WX + x, R = live.w * 4.5 + 8;
      ext.forEach((t) => { if (!live.ps.has(t) && gx + R > t.v.x0 && gx - R < t.x1 && y + R > t.v.y0 && y - R < t.y1) replayLive(t); });
    }
    if (live.mask) layers.forEach((L) => { if (L.tile && wants(L, live) && !live.ps.has(L.tile)) { replayLive(L.tile); L.full = true; } });
    live.ps.forEach((pt, t) => {
      if (pt.n === live.d.length) return;
      pt.add(...at(live, i, t.v));
      pt.n = live.d.length;
      reset(t.c);
      if (t.ext) t.dirty = true;
    });
    if (live.mask) {
      const v = viewNow(), ov = [];
      layers.forEach((L) => {
        if (!L.tile || !live.ps.has(L.tile)) return;
        const tv = L.tile.v, R = reachOf(live, tv), [x1, y1] = at(live, i, tv), [x0, y0] = i >= 2 ? at(live, i - 2, tv) : [x1, y1], k = v.r / tv.r, ox = (tv.x0 - v.x0) * v.r, oy = (tv.y0 - v.y0) * v.r;
        const r = [ox + (Math.min(x0, x1) - R) * k, oy + (Math.min(y0, y1) - R) * k, ox + (Math.max(x0, x1) + R) * k, oy + (Math.max(y0, y1) + R) * k];
        L.dirty = L.dirty ? [Math.min(L.dirty[0], r[0]), Math.min(L.dirty[1], r[1]), Math.max(L.dirty[2], r[2]), Math.max(L.dirty[3], r[3])] : r;
        ov.push(L);
      });
      if (ov.length) overlaysSoon(ov);
    }
    if (live.ink) pushLive({});
    lastSample = performance.now();
    if (live.h === "roller" && live.k !== "e") rollGauge();
  }

  function open(p, x, y, g, carry) {
    const zm = zoomNow(), zl = zm.zl, sk = strokeKind(), { k, c, h } = sk, w = strokeW(sk, zm);
    live = { id: pushId(), p, k, c, h, w, z: zl, d: [], g, ps: new Map(), mask: maskNow(p, zl, w * marginOf(c, h)), a: tagA || undefined, u: tagU || undefined, ppu0: Z, r: h === "roller" && carry ? carry : undefined };
    if (c && c !== "bands") keepColor(c[0] === "n" ? c.slice(1) : c);
    panel(p).seen[live.id] = true;
    layers.forEach((L) => { if (wants(L, live) && !L.tile && !L.job) rerender(L, true); });
    inkStart(live);
    put(x, y);
  }

  function close() {
    const op = live;
    live = null;
    if (op.h === "roller") rollGauge();
    inkStop(op);
    op.ps.forEach((pt, t) => { pt.end(); reset(t.c); if (t.ext) t.dirty = true; });
    op.drawn = new Set(op.ps.keys());
    delete op.ps;
    op.up = op.d.some((n, i) => i % 2 === 1 && n < 0);
    bounds(op);
    if (op.mask) { layers.forEach((L) => { if (wants(L, op) && (L.job || L.timer || !L.tile)) rerender(L, true); }); overlaysSoon(); }
    insert(op, true);
    send(op);
    if (op.k !== "e") made++;
  }

  const rollRun = (op) => rollerState(op).run;
  const rollCarry = (op) => { if (op.h !== "roller") return undefined; const st = rollerState(op); return rollPack(st.run, st.ang) || undefined; };
  let rollShown = -1;
  function rollGauge() {
    const lv = live && live.h === "roller" && live.k !== "e" ? rollLevel(rollRun(live)) : 1, q = Math.round(lv * 40) / 40;
    if (q === rollShown) return;
    rollShown = q;
    const el = chrome && chrome.querySelector("[data-roll-lv]");
    if (el) { el.style.transition = q >= 1 ? "transform .6s cubic-bezier(.2,.8,.3,1)" : "transform .1s linear"; el.style.transform = `scaleY(${q})`; el.parentNode.classList.toggle("dry", q < 0.35); }
    if (host && host.roll) host.roll(q);
  }

  function abort() {
    const op = live;
    live = null;
    inkStop(op);
    op.ps.forEach((_, t) => (t.ext ? t.redraw() : t.mode ? rerender(t.layer, true) : render(t)));
  }

  function sample(ux, uy) {
    const x = live.p ? ux - live.p * WX : Math.max(0, ux), y = clamp(uy, -UPH, WY);
    if (x < 0 || x > WX) {
      const n = live.d.length, px = live.d[n - 2], py = live.d[n - 1], edge = x < 0 ? 0 : WX;
      const ey = py + ((y - py) * (edge - px)) / (x - px);
      if (px !== edge) put(edge, ey);
      const g = live.g, np = live.p + (x < 0 ? -1 : 1), rr = rollCarry(live);
      close();
      open(np, x < 0 ? WX : 0, ey, g, rr);
      sample(ux, uy);
      return;
    }
    put(x, y);
    if (live.d.length >= MAX_POINTS * 2) { const g = live.g, p = live.p, rr = rollCarry(live); close(); open(p, x, y, g, rr); }
  }

  function step() {
    if (!live || !client) return;
    const [ux, uy] = wallPoint(...client), n = live.d.length;
    if (Math.hypot(ux - live.p * WX - live.d[n - 2], clamp(uy, -UPH, WY) - live.d[n - 1]) >= 2 / Z) sample(ux, uy);
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
    closeSell();
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
    viewBox = null;
    const rb = chrome.querySelector("[data-rb]");
    if (rb) chrome.style.setProperty("--rbb", Math.round(rb.getBoundingClientRect().bottom - chrome.getBoundingClientRect().top) + "px");
    const r = view.parentNode.getBoundingClientRect(), f = frame(r.width, r.height);
    W = r.width; H = r.height; k0 = f.k; faceTop = f.top;
    ytop = -UPH - faceTop / k0; ybot = ytop + H / k0;
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

  const sizeOf = (arr) => { const v = clamp(size, 0, arr.length - 1), i = Math.min(arr.length - 2, Math.floor(v)); return arr[i] * Math.pow(arr[i + 1] / arr[i], v - i); };
  const strokeKind = () => {
    const k = tool === "eraser" || tool === "wipe" ? "e" : tool === "chalk" ? "c" : "d";
    const c = k === "e" ? undefined : k === "c" ? hex : tool === "neon" ? "n" + hex : tool === "bands" ? "bands" : color;
    const h = tool === "roller" || tool === "wipe" ? "roller" : tool === "spray" && head !== "std" ? head : undefined;
    return { k, c, h };
  };
  const zoomNow = () => { const zz = host ? Z / HOST_K : (k0 * Z) / 1.15; return { zz, zl: Math.max(0, Math.ceil(Math.log2(zz) - 1e-9)) }; };
  const baseW = (k, h) => (k === "e" && h !== "roller" ? sizeOf(RUBS) : sizeOf(SIZES) * (h === "roller" ? ROLL_K : 1));
  const strokeW = ({ k, c, h }, { zz, zl }) => Math.min(W_MAX / 2 ** zl, spanOf(c, h), baseW(k, h) / zz);
  const fitRatio = () => { if (tool === "tape" || tool === "stencil") return 1; const sk = strokeKind(), zm = zoomNow(); return strokeW(sk, zm) / (baseW(sk.k, sk.h) / zm.zz); };
  const brushPx = () => (tool === "tape" ? sizeOf(TAPES) : (tool === "eraser" ? sizeOf(RUBS) * 1.15 : sizeOf(SIZES) * 1.15 * (tool === "spray" ? headSize(head) : tool === "roller" || tool === "wipe" ? ROLL_K / 1.15 : 1)) * fitRatio());
  const ringFor = () => (TOUCH || lapse || sampling || tool === "stencil" ? 0 : brushPx());
  function placeRing(e) {
    if (!ring || e.pointerType === "touch") return;
    const r = viewBox || (viewBox = view.getBoundingClientRect());
    ring.style.transform = `translate(${(e.clientX - r.left - ringD / 2).toFixed(1)}px,${(e.clientY - r.top - ringD / 2).toFixed(1)}px)`;
    const on = !hoverK && !sellMode && ringFor() > 0;
    if (ring.hidden === on) ring.hidden = !on;
  }
  function cursor() {
    if (!view) return;
    hoverK = "";
    const d = ringFor();
    ringD = Math.max(4, Math.round(d));
    if (ring) {
      ring.style.width = ring.style.height = ringD + "px";
      ring.classList.toggle("roll", tool === "roller" || tool === "wipe");
      ring.firstChild.style.background = swatchBg(tool === "tape" ? TAPE : tool === "eraser" || tool === "wipe" ? "#ffffff" : tool === "bands" ? "rainbow" : tool === "spray" || tool === "roller" ? color : hex);
      if (!d) ring.hidden = true;
    }
    if (lapse) { view.style.cursor = "progress"; return; }
    if (sellMode) { view.style.cursor = "crosshair"; if (ring) ring.hidden = true; return; }
    if (sampling) { view.style.cursor = "crosshair"; return; }
    if (tool === "stencil") { view.style.cursor = "pointer"; return; }
    if (TOUCH) return;
    if (canCursor && (tool === "spray" || tool === "bands")) {
      const tint = tool === "bands" ? "rainbow" : color, stops = tint === "rainbow" ? RAINBOW.map((h, i) => [i / (RAINBOW.length - 1), h]) : METAL[tint];
      const fill = stops ? "url(#r)" : tint, g = Math.min(ringD, 84) / 2, ox = Math.round(2 + g * 0.72 + 7), oy = Math.round(2 + g * 0.72 + 3), w = ox + 20, h = oy + 36;
      const defs = stops ? '<defs><linearGradient id="r"' + (METAL[tint] ? ' x2="0" y2="1"' : "") + ">" + stops.map(([o, q]) => '<stop offset="' + o + '" stop-color="' + q + '"/>').join("") + "</linearGradient></defs>" : "";
      const mist = [0.32, 0.55, 0.74].map((t, i) => '<circle cx="' + (ox + 5 + (2 - ox - 5) * t).toFixed(1) + '" cy="' + (oy + 2 + (2 - oy - 2) * t).toFixed(1) + '" r="' + (1.4 - i * 0.3) + '" fill="' + fill + '" fill-opacity=".7"/>').join("");
      const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" shape-rendering="crispEdges">' + defs + mist +
        '<rect x="' + (ox + 5) + '" y="' + oy + '" width="6" height="4" fill="#fff" stroke="#000"/><rect x="' + (ox + 4) + '" y="' + (oy + 1) + '" width="2" height="2" fill="#000"/>' +
        '<rect x="' + (ox + 1) + '" y="' + (oy + 4) + '" width="14" height="5" fill="' + fill + '" stroke="#000"/>' +
        '<rect x="' + ox + '" y="' + (oy + 9) + '" width="16" height="25" fill="' + fill + '" stroke="#000"/>' +
        '<rect x="' + (ox + 1) + '" y="' + (oy + 16) + '" width="14" height="8" fill="#fff" fill-opacity=".85"/><rect x="' + (ox + 3) + '" y="' + (oy + 18) + '" width="10" height="1" fill="#000"/><rect x="' + (ox + 3) + '" y="' + (oy + 21) + '" width="6" height="1" fill="#000"/>' +
        '<rect x="' + (ox + 3) + '" y="' + (oy + 10) + '" width="2" height="5" fill="#fff" fill-opacity=".6"/><rect x="' + (ox + 3) + '" y="' + (oy + 25) + '" width="2" height="7" fill="#fff" fill-opacity=".6"/>' +
        '<rect x="' + (ox + 1) + '" y="' + (oy + 32) + '" width="14" height="2" fill="#7c7c7c"/></svg>';
      view.style.cursor = 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '") 2 2, crosshair';
      return;
    }
    view.style.cursor = "none";
  }


  const swatchBg = (hex) => (hex === "rainbow" ? "linear-gradient(135deg," + RAINBOW.join(",") + ")" : METAL[hex] ? metalBg(hex) : hex);
  const two = () => { const [a, b] = [...touches.values()]; return { x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2, d: Math.hypot(a[0] - b[0], a[1] - b[1]) || 1 }; };

  function pickColor(c) {
    color = c;
    if (HEX.test(c)) { hex = c; if (tool !== "spray" && tool !== "chalk" && tool !== "neon" && tool !== "roller") tool = brush === "bands" ? "spray" : brush; }
    else if (tool !== "roller") tool = "spray";
    if (pick) pick.close();
  }

  function build() {
    chrome = document.createElement("div");
    chrome.className = "paint";
    chrome.setAttribute("role", "dialog");
    chrome.setAttribute("aria-label", "The Wall, spray paint");
    chrome.hidden = true;
    const rbB = (attrs, ico, label, title) => `<button type="button" class="rb-b" ${attrs} title="${title || label}">${T16(ico)}<span>${label}</span></button>`;
    const grp = (name, body, cls = "") => `<div class="rb-g${cls}"><div class="rb-t">${body}</div><div class="rb-n">${name}</div></div>`;
    const tl = (list) => list.map(([t, title]) => rbB(`data-tool="${t}"`, ICONS[t], { bands: "Rainbow", roller: "Roller", wipe: "Wipe" }[t] || title.split(",")[0].replace("Spray can", "Spray").replace("Masking tape", "Tape").replace("Stencils", "Stencil"), title)).join("").replace('data-tool="roller" title', 'data-tool="roller" style="position:relative" title').replace(/(data-tool="roller"[^>]*>)/, '$1<i class="rb-lv" aria-hidden="true"><b data-roll-lv></b></i>');
    chrome.innerHTML =
      `<header class="tb"><span class="tb-i">${icon("bricks")}</span><h2 class="tb-t">The Wall - Paint</h2><span class="tb-btns"><button class="tb-x" type="button" data-pt-close aria-label="Back to the map"></button></span></header>` +
      `<div class="rb" data-rb>` +
      grp("Paint", tl(TOOLS.slice(0, 5))) + grp("Cover", tl(TOOLS.slice(5))) +
      grp("Wall", rbB("data-mat", ICONS.wallk, "Material", "Change the wall material: place a box, size it, then use it") + rbB("data-sellmode", ICONS.sell, "Sell", "Sell your own drawing to Haiku: draw a loop around it") + rbB("data-theme", ICONS.theme, "Theme", "Theme of the week: enter a drawing, Haiku's best three go to the wall gallery")) +
      grp("Cap", rbB("data-caps", ICONS.caps, "Standard ▾", "Spray caps")) +
      grp("Size", `<input type="range" min="0" max="${SIZE_TOP}" step="0.05" data-size aria-label="Brush size"><span class="rb-dot"><i data-dot></i></span>`, " rb-size") +
      grp("Color", `<button type="button" class="rb-b rb-cur" data-colbtn title="Pick any color"><i data-cur></i><span>Color ▾</span></button><span class="rb-rec" data-recent></span>`) +
      grp("History", rbB("data-undo", ICONS.undo, "Undo", `Take back your last stroke (${UNDO_KEY})`) + rbB("data-redo", ICONS.redo, "Redo", `Put it back (Shift+${UNDO_KEY})`) + rbB("data-lapse", ICONS.lapse, "Replay", "Timelapse: watch this part of the wall get painted")) +
      grp("View", rbB('data-zoom="in"', ICONS.zin, "Zoom in", "Zoom in (E or the wheel)") + rbB('data-zoom="out"', ICONS.zout, "Zoom out", "Zoom out (Q or the wheel)") + (TOUCH ? "" : rbB("data-big", ICONS.play, "Big wall", "Play: walk up to the wall in 3D, with a scissor lift up to 12 meters") + rbB("data-cancur", ICONS.cancur, "Can cursor", "Show a spray can next to the brush"))) +
      `</div><div class="pt-mid"><div class="pt-hole">` +
      `<div class="pt-lapse" role="status" hidden><span class="pt-lapse-d" data-lapse-date></span><span class="pt-bar"><i></i></span><button class="btn" type="button" data-lapse-stop>Stop</button></div></div></div>` +
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
    flapL = overlay("flap");
    layers.push(tapeL, sheetL, flapL);
    ink = document.createElement("canvas");
    ink.className = "wv-ink";
    view.append(ink);
    who = document.createElement("div");
    who.className = "wv-who";
    view.append(who);
    ring = document.createElement("div");
    ring.className = "wv-ring";
    ring.hidden = true;
    ring.innerHTML = "<i></i>";
    view.append(ring);
    selCv = document.createElement("canvas");
    selCv.className = "wv-sel";
    selCv.hidden = true;
    view.append(selCv);
    kindPick = document.createElement("div");
    kindPick.className = "pt-pick pt-kinds";
    kindPick.hidden = true;
    kindPick.setAttribute("role", "dialog");
    kindPick.setAttribute("aria-label", "Wall material");
    kindPick.innerHTML = `<header class="tb"><h2 class="tb-t">Wall material</h2><span class="tb-btns"><button class="tb-x" type="button" data-kind-x aria-label="Close"></button></span></header>` +
      `<div class="pt-pick-g">${WALL_KINDS.map(([id, name]) => `<span class="pt-pk"><button type="button" data-kind="${id}" title="${name}"><canvas></canvas><span>${name}</span></button></span>`).join("")}</div>` +
      `<p class="pt-kinds-n">Pick a material, then drag the box over bare wall and pull its corners to size it. Press Use and the wall inside the box changes. There must be no paint inside.</p>`;
    chrome.append(kindPick);
    kindPick.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      kindPick.hidden = true;
      if (b.dataset.kind) startBox(b.dataset.kind);
    });
    sellPop = document.createElement("div");
    sellPop.className = "pt-pick pt-sell";
    sellPop.hidden = true;
    sellPop.setAttribute("role", "dialog");
    sellPop.setAttribute("aria-label", "Sell to Haiku");
    sellPop.innerHTML = `<header class="tb"><h2 class="tb-t">Sell to Haiku</h2><span class="tb-btns"><button class="tb-x" type="button" data-sell-x aria-label="Close"></button></span></header><div class="pt-sell-b" data-sell-b></div>`;
    chrome.append(sellPop);
    sellPop.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b || b.disabled) return;
      if (b.hasAttribute("data-sell-x")) closeSell();
      else if (b.hasAttribute("data-sell-ask")) askHaiku();
      else if (b.hasAttribute("data-sell-again")) startLasso();
      else if (b.hasAttribute("data-theme-enter")) startLasso("theme");
      else if (b.hasAttribute("data-theme-gal")) toGallery();
      else if (b.dataset.sellPay) confirmSell(b.dataset.sellPay);
      else if (b.hasAttribute("data-sell-yes")) finishSell(b);
      else if (b.hasAttribute("data-sell-back") && selling && selling.quote) offer(selling);
    });
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
    colPop = document.createElement("div");
    colPop.className = "pt-pick rb-pop";
    colPop.hidden = true;
    colPop.setAttribute("role", "dialog");
    colPop.setAttribute("aria-label", "Color");
    colPop.innerHTML = `<header class="tb"><h2 class="tb-t">Color</h2><span class="tb-btns"><button class="tb-x" type="button" data-cp-x aria-label="Close"></button></span></header>` +
      `<div class="cp"><div class="cp-top"><canvas class="cp-sv"></canvas><canvas class="cp-hue"></canvas></div>` +
      `<div class="cp-row"><span class="cp-cmp" title="Before and now"><i data-cp-old></i><i data-cp-new></i></span><input class="cp-hex" maxlength="7" spellcheck="false" autocomplete="off" aria-label="Color code"><button class="btn cp-drop" type="button" data-cp-drop title="Then click the wall to take a color from it">${T16(ICONS.drop)}From the wall</button></div>` +
      `<div class="cp-lab">Lighter or darker</div><div class="cp-line" data-cp-sh></div><div class="cp-lab">Recent</div><div class="cp-line" data-cp-re></div>` +
      `<div class="cp-sp"><button class="btn" type="button" data-color="chrome">Chrome</button><button class="btn" type="button" data-color="gold">Gold</button><button class="btn" type="button" data-color="rainbow" data-cp-rb hidden>Rainbow</button></div></div>`;
    chrome.append(colPop);
    sv = colPop.querySelector(".cp-sv"); hu = colPop.querySelector(".cp-hue"); hexIn = colPop.querySelector(".cp-hex");
    const dragOn = (cv, f) => {
      const go = (e) => { const r = cv.getBoundingClientRect(); f(clamp((e.clientX - r.left) / r.width, 0, 1), clamp((e.clientY - r.top) / r.height, 0, 1)); };
      const end = () => { if (!cv.onpointermove) return; cv.onpointermove = null; cpSet(curColor(), true); };
      cv.addEventListener("pointerdown", (e) => { e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (err) {} go(e); cv.onpointermove = go; });
      cv.addEventListener("pointerup", end);
      cv.addEventListener("pointercancel", end);
    };
    dragOn(sv, (x, y) => { cpHsv = [cpHsv[0], x, 1 - y]; cpSet(toHex(hsv2rgb(...cpHsv)), false); });
    dragOn(hu, (x, y) => { cpHsv = [Math.min(359.9, y * 360), cpHsv[1] || 1, cpHsv[2] || 1]; cpSet(toHex(hsv2rgb(...cpHsv)), false); });
    hexIn.addEventListener("input", () => { const v = hexIn.value.trim().toLowerCase(), c = v[0] === "#" ? v : "#" + v; if (HEX.test(c)) { cpHsv = rgb2hsv(rgbOf(c)); cpSet(c, false); } });
    hexIn.addEventListener("change", () => cpSet(curColor(), true));
    hexIn.addEventListener("keydown", (e) => e.stopPropagation());
    colPop.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      if (b.hasAttribute("data-cp-x")) { colPop.hidden = true; sampling = false; sync(); return; }
      if (b.hasAttribute("data-cp-drop")) { sampling = !sampling; if (sampling) flash("CLICK THE WALL TO TAKE ITS COLOR"); sync(); return; }
      if (b.dataset.color) { const c = b.dataset.color; if (HEX.test(c)) cpHsv = rgb2hsv(rgbOf(c)); cpSet(c, true); }
    });
    lapseEl = chrome.querySelector(".pt-lapse");
    pick = picker(chrome, { onPick: placeStencil, onCut: () => cut.open(), onPicture: (f) => cut.picture(f), onDescribe: () => cut.describe() });
    cut = cutter(chrome, { onSave: placeStencil, draw: (prompt) => ensure().then(() => api("/wall/stencil", { prompt })) });
    chrome.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b || b.closest(".pt-pick,.pt-cut")) return;
      if (b.hasAttribute("data-pt-close")) { opts.onExit(); return; }
      if (b.hasAttribute("data-lapse") || b.hasAttribute("data-lapse-stop")) { if (lapse) stopLapse(); else startLapse(); return; }
      if (lapse) return;
      if (b.hasAttribute("data-undo")) { undo(); return; }
      if (b.hasAttribute("data-redo")) { redoLast(); return; }
      if (b.hasAttribute("data-caps")) { if (caps.hidden) openCaps(); else caps.hidden = true; pick.close(); colPop.hidden = true; sampling = false; sync(); return; }
      if (b.hasAttribute("data-mat")) { if (kindPick.hidden) openMats(); else kindPick.hidden = true; return; }
      if (b.hasAttribute("data-sellmode")) { if (sellMode && lassoFor === "sell") closeSell(); else if (!tagA && !tagU) flash("NOTHING HERE IS YOURS TO SELL YET"); else startLasso("sell"); sync(); return; }
      if (b.hasAttribute("data-theme")) { if (sellPop && !sellPop.hidden && lassoFor === "theme") closeSell(); else openTheme(); sync(); return; }
      if (b.hasAttribute("data-big")) { location.href = `/wall/?x=${Math.round(cx)}&y=${Math.round(clamp(cy, 0, WY))}`; return; }
      if (b.hasAttribute("data-cancur")) { canCursor = !canCursor; try { localStorage.setItem("gl-wall-can", canCursor ? "1" : "0"); } catch (err) {} sync(); return; }
      if (b.dataset.zoom) { const r = view.getBoundingClientRect(); zoomAt(b.dataset.zoom === "in" ? 2 : 0.5, r.left + W / 2, r.top + H / 2); return; }
      if (b.dataset.tool) {
        const t = b.dataset.tool;
        if (t === "stencil") { if (!sheets.some(inView) || tool === "stencil") { pick.toggle(); if (pick.shown) { colPop.hidden = true; sampling = false; } } }
        else pick.close();
        caps.hidden = true;
        if (sellMode) closeSell();
        tool = t;
        if (BRUSH.includes(t)) brush = t;
      }
      if (b.hasAttribute("data-colbtn")) { if (colPop.hidden) openColor(); else { colPop.hidden = true; sampling = false; } sync(); return; }
      if (b.dataset.color) { const c = b.dataset.color; pickColor(c); if (HEX.test(c)) cpHsv = rgb2hsv(rgbOf(c)); }
      sync();
    });
    chrome.querySelector("[data-size]").addEventListener("input", (e) => { size = +e.target.value; try { localStorage.setItem("gl-wall-size", String(size)); } catch (err) {} sync(); });

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
          if (lassoDrag) { lassoDrag = false; lasso = null; drawSel(); }
          drawOverlays();
          if (tick) { cancelAnimationFrame(tick); tick = 0; }
          pinch = two();
          sync();
          return;
        }
      }
      if (e.button !== 0 || live || pinch || tapeDrag || sheetDrag || rip || liftDrag) return;
      e.preventDefault();
      if (sampling) { sampleAt(e); return; }
      if (sellMode) {
        if (selling && (selling.busy || selling.quote)) return;
        lasso = wallPoint(e.clientX, e.clientY);
        lassoDrag = { id: e.pointerId };
        selling = { g: null, quote: null };
        try { view.setPointerCapture(e.pointerId); } catch (err) {}
        drawSel();
        return;
      }
      if (!colPop.hidden) { colPop.hidden = true; sync(); }
      if (pick.shown) pick.close();
      if (!caps.hidden) { caps.hidden = true; sync(); }
      if (!kindPick.hidden) kindPick.hidden = true;
      here(e);
      placeRing(e);
      {
        const P = canvasPt(e), v = viewNow(), hit = sheets.slice().reverse().find((sh) => onLayer(sh, P, v));
        if (hit) { nextLayer(hit); return; }
      }
      if (tool === "tape") { startTape(e); return; }
      if (tool === "stencil") { grabSheet(e); return; }
      if (posted >= MAX_POSTS) { flash("THAT IS ENOUGH ART FOR ONE VISIT"); return; }
      const [ux, uy] = wallPoint(e.clientX, e.clientY);
      if (ux < 0 || uy < -UPH || uy > WY) return;
      if (inZone(ux, uy)) { flash("THIS IS THE WALL GALLERY, PAINT BELOW IT"); return; }
      try { view.setPointerCapture(e.pointerId); } catch (err) {}
      gesture = { id: e.pointerId, t0: performance.now() };
      redo.length = 0;
      client = [e.clientX, e.clientY];
      const p = Math.floor(ux / WX);
      open(p, ux - p * WX, uy, newGroup());
      if (!tick) tick = requestAnimationFrame(hold);
    });
    view.addEventListener("pointermove", (e) => {
      placeRing(e);
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
      if (lassoDrag && e.pointerId === lassoDrag.id) {
        const list = e.getCoalescedEvents ? e.getCoalescedEvents() : [], ppu = k0 * Z;
        for (const ev of list.length ? list : [e]) {
          const [ux, uy] = wallPoint(ev.clientX, ev.clientY), n = lasso.length;
          if (n < 4000 && Math.hypot(ux - lasso[n - 2], uy - lasso[n - 1]) * ppu > 3) lasso.push(ux, uy);
        }
        drawSel();
        return;
      }
      if (sellMode) return;
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
      if (lassoDrag && e.pointerId === lassoDrag.id) { if (e.type === "pointercancel") { lassoDrag = false; lasso = null; drawSel(); } else lassoDone(); return; }
      if (!gesture || e.pointerId !== gesture.id) return;
      gesture = null;
      if (tick) { cancelAnimationFrame(tick); tick = 0; }
      if (live) close();
      sync();
    };
    view.addEventListener("pointerup", up);
    view.addEventListener("pointercancel", up);
    view.addEventListener("pointerleave", (e) => { if (ring) ring.hidden = true; if (e.pointerType !== "touch" && !live) pushLive({ x: -1e6 }); });
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
    closeSell();
    caps.hidden = false;
  }

  function where() {
    if (!chrome || !active) return;
    const ppu = k0 * Z, x0 = cx - W / 2 / ppu, x1 = cx + W / 2 / ppu, y0 = cy - H / 2 / ppu, y1 = cy + H / 2 / ppu, m = Math.round((x0 + LEAD) / 100);
    let n = 0;
    for (let p = Math.max(0, Math.floor(x0 / WX)); p <= Math.floor(x1 / WX); p++) { const P = panels.get(p); if (P) for (const o of P.ops) if (o.k !== "e" && hits(o, x0, y0, x1, y1)) n++; }
    const zoom = Z < 1.05 ? "" : Z < 1000 ? `, zoom ${Z.toFixed(Z < 10 ? 1 : 0)}x` : `, zoom ${Z.toExponential(1).replace("e+", "e")}x`;
    const up = (WY - clamp(cy, -UPH, WY)) / 100, high = y1 < WY - 40 ? `, ${up.toFixed(1)} m up` : "";
    const text = (m > 0 ? `${m} m from the start` : "The start of the wall") + high + zoom + `, ${n} ${n === 1 ? "stroke" : "strokes"} here`;
    if (text !== said) { said = text; chrome.querySelector("[data-where]").textContent = text; }
    placeMat();
    if (sellMode) drawSel();
  }

  const curColor = () => (tool === "bands" ? "rainbow" : tool === "chalk" || tool === "neon" ? hex : color);
  function keepColor(c) {
    if (!c || recent[0] === c) return;
    recent = [c, ...recent.filter((x) => x !== c)].slice(0, 10);
    try { localStorage.setItem("gl-wall-recent", JSON.stringify(recent)); } catch (e) {}
  }
  function openColor() {
    cpOld = curColor();
    cpHsv = rgb2hsv(rgbOf(HEX.test(cpOld) ? cpOld : hex));
    const g = chrome.querySelector("[data-colbtn]").closest(".rb-g"), r = g.getBoundingClientRect(), cr = chrome.getBoundingClientRect();
    colPop.style.left = Math.round(clamp(r.left - cr.left, 8, cr.width - 290)) + "px";
    if (pick) pick.close();
    caps.hidden = true;
    if (kindPick) kindPick.hidden = true;
    closeSell();
    colPop.hidden = false;
  }
  function cpSet(c, commit) {
    if (commit) { pickColor(c); keepColor(c); sync(); return; }
    color = c;
    if (HEX.test(c)) hex = c;
    chrome.querySelector("[data-cur]").style.background = swatchBg(curColor());
    cursor();
    cpShow();
  }
  function cpPaint() {
    const d = DPR();
    [sv, hu].forEach((cv) => { const w = Math.round(cv.clientWidth * d), h = Math.round(cv.clientHeight * d); if (w && cv.width !== w) cv.width = w; if (h && cv.height !== h) cv.height = h; });
    const x = sv.getContext("2d"), w = sv.width, h = sv.height, y = hu.getContext("2d"), hw = hu.width, hh = hu.height;
    x.fillStyle = toHex(hsv2rgb(cpHsv[0], 1, 1)); x.fillRect(0, 0, w, h);
    let g = x.createLinearGradient(0, 0, w, 0); g.addColorStop(0, "#fff"); g.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = g; x.fillRect(0, 0, w, h);
    g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "#000"); x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.lineWidth = 1.5 * d; x.strokeStyle = cpHsv[2] > 0.6 && cpHsv[1] < 0.5 ? "#000" : "#fff";
    x.beginPath(); x.arc(cpHsv[1] * w, (1 - cpHsv[2]) * h, 5 * d, 0, Math.PI * 2); x.stroke();
    const hg = y.createLinearGradient(0, 0, 0, hh);
    for (let i = 0; i <= 6; i++) hg.addColorStop(i / 6, toHex(hsv2rgb(i * 60, 1, 1)));
    y.fillStyle = hg; y.fillRect(0, 0, hw, hh);
    const yy = (cpHsv[0] / 360) * hh;
    y.fillStyle = "#000"; y.fillRect(0, yy - 1.5 * d, hw, 3 * d); y.fillStyle = "#fff"; y.fillRect(0, yy - 0.5 * d, hw, d);
  }
  function cpShow() {
    if (!colPop || colPop.hidden) return;
    const c = curColor(), sw = (h) => `<button type="button" class="cp-sw${h === c ? " on" : ""}" data-color="${h}" title="${h}" style="background:${swatchBg(h)}"></button>`;
    colPop.querySelector("[data-cp-new]").style.background = swatchBg(c);
    colPop.querySelector("[data-cp-old]").style.background = swatchBg(cpOld);
    if (document.activeElement !== hexIn) hexIn.value = HEX.test(c) ? c : c === "rainbow" ? "rainbow" : c;
    colPop.querySelector("[data-cp-sh]").innerHTML = shadesOf(HEX.test(c) ? c : hex).map(sw).join("");
    colPop.querySelector("[data-cp-re]").innerHTML = recent.map(sw).join("");
    colPop.querySelector("[data-cp-rb]").hidden = !rainbow;
    colPop.querySelector("[data-cp-drop]").setAttribute("aria-pressed", String(sampling));
    cpPaint();
  }
  function sampleAt(e) {
    sampling = false;
    const r = view.getBoundingClientRect(), d = DPR(), sx = (e.clientX - r.left) * d, sy = (e.clientY - r.top) * d, [wx, wy] = wallPoint(e.clientX, e.clientY);
    const cv = document.createElement("canvas");
    cv.width = cv.height = 1;
    const x = cv.getContext("2d"), t = [...shown].filter((q) => q.ready && wx >= q.v.x0 && wy >= q.v.y0 && wx < q.x1 && wy < q.y1).sort((a, b) => b.L - a.L)[0];
    x.fillStyle = WALL_SKY; x.fillRect(0, 0, 1, 1);
    if (t) { const px = (wx - t.v.x0) * t.v.r, py = (wy - t.v.y0) * t.v.r; x.drawImage(t.bg, px, py, 1, 1, 0, 0, 1, 1); x.drawImage(t.cv, px, py, 1, 1, 0, 0, 1, 1); }
    layers.forEach((L) => { if (!L.cv.hidden) x.drawImage(L.cv, sx, sy, 1, 1, 0, 0, 1, 1); });
    const px = x.getImageData(0, 0, 1, 1).data, c = toHex([px[0], px[1], px[2]]);
    cpHsv = rgb2hsv([px[0], px[1], px[2]]);
    cpSet(c, true);
    flash("GOT THE COLOR " + c.toUpperCase());
  }

  function sync() {
    if (!chrome) { if (host && host.sync) host.sync(); return; }
    const cur = curColor();
    chrome.querySelectorAll("[data-tool]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.tool === tool)));
    chrome.querySelector("[data-lapse]").setAttribute("aria-pressed", String(!!lapse));
    chrome.querySelector("[data-cur]").style.background = swatchBg(cur);
    chrome.querySelector("[data-colbtn]").setAttribute("aria-pressed", String(!colPop.hidden));
    chrome.querySelector("[data-undo]").disabled = !mineHere() || !!lapse;
    chrome.querySelector("[data-redo]").disabled = !redo.length || !!lapse;
    const cb = chrome.querySelector("[data-caps]"), hn = (HEADS.find((x) => x[0] === head) || HEADS[0])[1];
    cb.setAttribute("aria-pressed", String(!caps.hidden));
    cb.title = `Spray caps: ${hn} cap on the can`;
    cb.querySelector("span").textContent = hn + " ▾";
    const cc = chrome.querySelector("[data-cancur]");
    if (cc) cc.setAttribute("aria-pressed", String(canCursor));
    const si = chrome.querySelector("[data-size]"), dot = chrome.querySelector("[data-dot]"), dd = Math.max(2, Math.min(40, brushPx()));
    if (document.activeElement !== si) si.value = String(size);
    dot.style.width = dot.style.height = dd.toFixed(1) + "px";
    dot.style.background = swatchBg(tool === "tape" ? TAPE : tool === "eraser" || tool === "wipe" ? "#ffffff" : cur);
    dot.style.boxShadow = tool === "eraser" || tool === "wipe" ? "0 0 0 1px #000" : "";
    const key = recent.join() + "|" + cur;
    if (key !== recentKey) { recentKey = key; chrome.querySelector("[data-recent]").innerHTML = recent.map((h) => `<button type="button" data-color="${h}" title="${h}" aria-pressed="${h === cur}" style="background:${swatchBg(h)}"></button>`).join(""); }
    const h = HINTS[tool] || HINTS.paint;
    if (h !== hint) { hint = h; chrome.querySelector("[data-hint]").textContent = h; }
    where();
    if (active) { cursor(); drawOverlays(); }
    cpShow();
  }

  document.addEventListener("keydown", (e) => {
    if (!active) return;
    if (e.key === "Escape") {
      if (lapse) stopLapse();
      else if (cut && cut.shown) cut.close();
      else if (pick && pick.shown) pick.close();
      else if (caps && !caps.hidden) { caps.hidden = true; sync(); }
      else if (kindPick && !kindPick.hidden) kindPick.hidden = true;
      else if (colPop && !colPop.hidden) { colPop.hidden = true; sampling = false; sync(); }
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
    if (chrome) { color = "rainbow"; tool = "spray"; brush = "spray"; keepColor("rainbow"); sync(); }
    flash("SECRET COLOR UNLOCKED: RAINBOW");
  });

  function aimNow() {
    const a = host && host.aim();
    if (!a) return false;
    cx = a.x; cy = a.y; Z = Math.max(1e-3, a.ppu); k0 = 1;
    return true;
  }
  const hostEv = (type) => ({ type: type || "pointermove", clientX: W / 2, clientY: H / 2, pointerId: 7, pointerType: "mouse", button: 0, preventDefault() {} });
  function hostDown() {
    if (!aimNow() || live || tapeDrag || sheetDrag || rip || liftDrag) return;
    const e = hostEv("pointerdown");
    here(e);
    const P = canvasPt(e), v = viewNow(), hit = sheets.slice().reverse().find((sh) => onLayer(sh, P, v));
    if (hit) { nextLayer(hit); return; }
    if (tool === "tape") { startTape(e); return; }
    if (tool === "stencil") { grabSheet(e); return; }
    if (posted >= MAX_POSTS * 5) { flash("THAT IS ENOUGH ART FOR ONE VISIT"); return; }
    const [ux, uy] = wallPoint(e.clientX, e.clientY);
    if (ux < 0 || uy < -UPH || uy > WY) return;
    if (inZone(ux, uy)) { flash("THIS IS THE WALL GALLERY, PAINT BELOW IT"); return; }
    gesture = { id: e.pointerId, t0: performance.now() };
    redo.length = 0;
    client = [e.clientX, e.clientY];
    const p = Math.floor(ux / WX);
    open(p, ux - p * WX, uy, newGroup());
    if (!tick) tick = requestAnimationFrame(hold);
  }
  function hostMove() {
    if (!aimNow()) return;
    const e = hostEv();
    if (rip) { moveRip(e); here(e); return; }
    if (liftDrag) { moveLift(e); here(e); return; }
    if (tapeDrag) { tapeDrag.b = wallPoint(e.clientX, e.clientY); here(e); return; }
    if (sheetDrag) { dragSheet(e); here(e); return; }
    here(e);
    if (!live || !gesture) return;
    client = [e.clientX, e.clientY];
    if (Math.abs(Z / live.ppu0 - 1) > 0.3) {
      const [ux, uy] = wallPoint(e.clientX, e.clientY);
      sample(ux, uy);
      const q = live, n = q.d.length;
      close();
      open(q.p, q.d[n - 2], q.d[n - 1], q.g);
      return;
    }
    step();
  }
  function hostUp(cancel) {
    const e = hostEv(cancel ? "pointercancel" : "pointerup");
    if (rip) { endRip(!!cancel); return; }
    if (liftDrag) { endLift(!!cancel); return; }
    if (tapeDrag) { if (cancel) tapeDrag = null; else layTape(); return; }
    if (sheetDrag) { endDrag(); return; }
    if (!gesture) return;
    gesture = null;
    if (tick) { cancelAnimationFrame(tick); tick = 0; }
    if (live) { if (cancel) abort(); else close(); }
    sync();
    return e;
  }
  function propsInto(c, v, Wc, Hc, d) {
    DPR_OV = d || 0;
    [["tape", drawTapes], ["sheet", drawSheets], ["flap", drawFlaps]].forEach(([kind, draw]) => {
      const L = { kind, cache: null, tile: null }, sink = [];
      if (!layerOn(L)) return;
      reset(c);
      draw(L, c, v, Wc, Hc, sink);
      if (sink.length) {
        const list = opsIn(v.x0, v.y0, v.x0 + Wc / v.r, v.y0 + Hc / v.r).filter((op) => wants(L, op));
        if (list.length) {
          const pc = Object.assign(document.createElement("canvas"), { width: Wc, height: Hc }), q = pc.getContext("2d");
          list.forEach((op) => paintOp(op, q, v, kind, alive));
          sink.forEach((p) => { c.save(); c.clip(p.path, p.rule); c.drawImage(pc, 0, 0); c.restore(); });
        }
      }
      if (kind === "sheet") sheets.forEach((sh) => { if (tool === "stencil") sheetTools(c, sh, v); layerBtn(c, sh, v); });
    });
    DPR_OV = 0;
    reset(c);
  }
  let liveCv = null, nullCtx = null;
  function liveInto(c, v, Wc, Hc, d) {
    if (!live || !live.mask || !live.d.length) return;
    DPR_OV = d || 0;
    if (!nullCtx) nullCtx = Object.assign(document.createElement("canvas"), { width: 1, height: 1 }).getContext("2d");
    [["tape", drawTapes], ["sheet", drawSheets], ["flap", drawFlaps]].forEach(([kind, draw]) => {
      const L = { kind, cache: null, tile: null }, sink = [];
      if (!layerOn(L) || !wants(L, live)) return;
      draw(L, nullCtx, v, Wc, Hc, sink);
      reset(nullCtx);
      if (!sink.length) return;
      if (!liveCv) liveCv = document.createElement("canvas");
      if (liveCv.width !== Wc || liveCv.height !== Hc) { liveCv.width = Wc; liveCv.height = Hc; }
      const q = liveCv.getContext("2d");
      q.setTransform(1, 0, 0, 1, 0, 0);
      reset(q);
      q.clearRect(0, 0, Wc, Hc);
      paintOp(live, q, v, kind, alive);
      reset(q);
      sink.forEach((p) => { c.save(); c.clip(p.path, p.rule); c.drawImage(liveCv, 0, 0); c.restore(); });
    });
    DPR_OV = 0;
    reset(c);
  }
  function liveBox() {
    if (!live || !live.mask || !live.d.length) return null;
    const b = live.p * WX, R = live.w * 4.5 + 8;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let i = 0; i < live.d.length; i += 2) { x0 = Math.min(x0, live.d[i]); x1 = Math.max(x1, live.d[i]); y0 = Math.min(y0, live.d[i + 1]); y1 = Math.max(y1, live.d[i + 1]); }
    return [b + x0 - R, y0 - R, b + x1 + R, y1 + R];
  }
  const moving = () => !!(peels.length || lifts.length || tapeDrag || sheetDrag || rip || liftDrag || sheets.some((sh) => sh.flip));
  function propBoxes() {
    const out = [...tapes, ...sheets].map((q) => q.bb);
    peels.forEach((P) => P.list.forEach((e) => { if (e.t.bb) out.push(e.t.bb); }));
    lifts.forEach((F) => { if (F.g.bb) out.push(F.g.bb); });
    if (tapeDrag) out.push([Math.min(tapeDrag.a[0], tapeDrag.b[0]) - tapeDrag.w * 2, Math.min(tapeDrag.a[1], tapeDrag.b[1]) - tapeDrag.w * 2, Math.max(tapeDrag.a[0], tapeDrag.b[0]) + tapeDrag.w * 2, Math.max(tapeDrag.a[1], tapeDrag.b[1]) + tapeDrag.w * 2]);
    return out;
  }
  function attach(h) {
    if (host) return hostApi;
    host = h;
    view = document.createElement("div");
    W = H = 600; k0 = 1; Z = 4;
    tapeL = overlay("tape"); sheetL = overlay("sheet"); flapL = overlay("flap");
    openLive();
    clearInterval(liveTimer);
    liveTimer = setInterval(tidy, 1000);
    return hostApi;
  }
  const hostApi = {
    down: hostDown, move: hostMove, up: hostUp,
    hover() { if (aimNow()) here(hostEv()); },
    busy: () => !!(live || tapeDrag || sheetDrag || rip || liftDrag),
    painting: () => !!live,
    get: () => ({ tool, color, hex, head, size, rainbow, recent: recent.slice(), cur: curColor(), heads: HEADS.map(([id, name, about]) => ({ id, name, about })), sheets: sheets.length, tapes: tapes.length, redo: redo.length > 0 }),
    mine: mineHere,
    set(o) {
      if (live) return;
      if (o.tool) { tool = o.tool; if (BRUSH.includes(tool)) brush = tool; }
      if (o.color) pickColor(o.color);
      if (o.head && (o.head === "std" || HEAD_IDS.has(o.head))) { head = o.head; try { localStorage.setItem("gl-wall-cap", head); } catch (e) {} }
      if (typeof o.size === "number") { size = clamp(o.size, 0, SIZE_TOP); try { localStorage.setItem("gl-wall-size", String(size)); } catch (e) {} }
      if (o.keep) keepColor(o.keep);
      sync();
    },
    width() { aimNow(); const zz = Z / HOST_K; return tool === "tape" ? (sizeOf(TAPES) / Z) * 2.2 : ((tool === "eraser" ? sizeOf(RUBS) : sizeOf(SIZES) * (tool === "spray" ? headSize(head) : tool === "roller" || tool === "wipe" ? ROLL_K : 1)) / zz) * fitRatio(); },
    undo, redo: redoLast,
    stencil(st) { if (aimNow()) placeStencil(st); },
    tiles: ext,
    ops: (x0, y0, x1, y1) => opsIn(x0, y0, x1, y1),
    drawProps: propsInto,
    drawLive: liveInto,
    liveBox,
    liveKey: () => (live && live.mask ? live.id + ":" + live.d.length : ""),
    propsKey: () => geoV + ":" + (moving() ? performance.now().toFixed(0) : "0") + ":" + tool,
    propBoxes,
    inkV: () => inkV,
    inks() { const list = []; others.forEach((q) => { if (q.op) list.push(q.op); }); ghosts.forEach((g) => list.push(g.op)); return list.sort(older); },
    others() { const now = performance.now(), out = []; others.forEach((q) => { if (now - q.seen < 8000) out.push({ sid: q.sid, x: q.p * WX + q.x, y: q.y, name: q.name || "anon", c: q.c, live: !!q.op }); }); return out; },
    kinds: () => wallKinds,
    made: () => made,
    leave() { leaveLive(); },
    flash,
  };

  connect();
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { if (stream) { stream.close(); stream = null; } closeLive(); if (active || host) leaveLive(); }
    else { if (!stream) connect(); if (active || host) openLive(); }
  });
  addEventListener("pagehide", () => { if (active || host) leaveLive(); });

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
      if (kindPick) kindPick.hidden = true;
      if (colPop) colPop.hidden = true;
      sampling = false;
      closeBox();
      closeSell();
      if (chrome) chrome.hidden = true;
      if (view) { view.hidden = true; view.classList.remove("on"); view.style.cursor = ""; }
      shown.forEach((t) => t.el.remove());
      lod.forEach((t, k) => { const keep = shown.has(t) && t.ready && !t.job && !t.dirty; t.job = null; if (!keep) { t.ready = false; lod.delete(k); } });
      shown = new Set();
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
    view3d: () => ({ x: cx, y: cy }),
    loading: () => [...lod.values()].some((t) => t.job && shown.has(t)),
    attach,
  };
}
