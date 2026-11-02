/* Gzowo Paint: the easel in the Gzowo Museum. A Windows 98 style paint program with every classic tool and a few new ones
   (rainbow, dither, sparkle, gradient, stamps, mirror), pixel perfect on its own buffer, with undo, a saved draft and hanging in the museum. */

import { api, ensure, toast } from "/assets/bank.mjs";
import { store, esc } from "/assets/folks.mjs";

const SIZES = [[160, 120], [240, 180], [320, 240]];
const PALETTE = ["#000000", "#808080", "#800000", "#808000", "#008000", "#008080", "#000080", "#800080", "#808040", "#004040", "#0080ff", "#004080", "#8000ff", "#804000",
  "#ffffff", "#c0c0c0", "#ff0000", "#ffff00", "#00ff00", "#00ffff", "#0000ff", "#ff00ff", "#ffff80", "#00ff80", "#80ffff", "#8080ff", "#ff0080", "#ff8040",
  "#ffe0bd", "#e0ac69", "#8d5524", "#5c3a21", "#69c04c", "#3a74d6", "#9ecff9", "#ffd23f", "#ff8c1a", "#ff7eb6", "#7d4cdb", "#2e9e44", "#1d2b6b", "#f4ecd8"];
const IC = {
  select: "kkk.kkk.kkk|k.........k|...........|k.........k|...........|k.........k|...........|k.........k|kkk.kkk.kkk",
  eraser: "....kkkkkk.|...kwwwwwk.|..kwwwwwkk.|.kwwwwwkgk.|kkkkkkkggk.|kgggggkgk..|kgggggkk...|kkkkkkk....",
  fill: "...kk......|..kwwk.....|.kwwwwk....|kwwwwwwk...|kwwwwwwwkb.|.kwwwwwk.bb|..kwwwk..bb|...kwk...b.|....k......",
  picker: ".......kkk.|......kkkkk|.....kkkkk.|....kwkkk..|...kwwk....|..kwwk.....|.kwwk......|kbbk.......|kkk........",
  zoom: "..kkkk.....|.k....k....|k..ww..k...|k.w....k...|k......k...|.k....k....|..kkkkkk...|......kkk..|.......kkk.|........kk.",
  pencil: "........kk.|.......kyyk|......kyyk.|.....kyyk..|....kyyk...|...kyyk....|..kwyk.....|..kwk......|.kkk.......|.k.........",
  brush: ".........kk|........kkk|.......kkk.|......kkk..|.....kgk...|...kkgk....|..kbbk.....|.kbbbk.....|kbbbk......|kkk........",
  spray: "..k.k.k....|...k.k.....|..k.k.k....|.kkkk......|.kwwk......|.kwwk......|.kwwk......|.kwwk......|.kkkk......",
  text: "kkkkkkkkk..|kk..k..kk..|k...k...k..|....k......|....k......|....k......|....k......|...kkk.....",
  line: "k..........|.k.........|..k........|...k.......|....k......|.....k.....|......k....|.......k...|........k..|.........k.",
  curve: "..kkk......|.k...k.....|k.....k....|k......k...|.......k...|........k..|........k..|.........k.|..........k",
  rect: "kkkkkkkkkkk|k.........k|k.........k|k.........k|k.........k|k.........k|kkkkkkkkkkk",
  poly: "...kkkkk...|..k.....k..|.k.......k.|k.........k|k........k.|.k......k..|..kkkkkkk..",
  ellipse: "...kkkkk...|.kk.....kk.|k.........k|k.........k|k.........k|.kk.....kk.|...kkkkk...",
  rrect: ".kkkkkkkkk.|k.........k|k.........k|k.........k|k.........k|k.........k|.kkkkkkkkk.",
  rainbow: ".kkkkkkk...|krrrrrrrk..|kryyyyyrrk.|kryggggyrk.|krygbbgyrk.|kryg..gyrk.|kryg...yrk.",
  gradient: "kkkkkkkkkkk|kbbbggwwwwk|kbbbggwwwwk|kbbbggwwwwk|kbbbggwwwwk|kkkkkkkkkkk",
  dither: "k.k.k.k.k.k|.k.k.k.k.k.|k.k.k.k.k.k|.k.k.k.k.k.|k.k.k.k.k.k|.k.k.k.k.k.|k.k.k.k.k.k",
  sparkle: ".....y.....|.....y.....|....yyy....|yyyyywyyyyy|....yyy....|.....y.....|.y...y...y.|...........|..y.....y..",
  stamp: ".....k.....|....kyk....|kkkkkyykkkk|.kyyyyyyyk.|..kyyyyyk..|..kyykyyk..|.kyk...kyk.|.kk.....kk.",
  replace: "kkkk...gggg|kbbk...gyyg|kbbk.k.gyyg|kkkk.kk.ggg|.....kkk...|.....kk....|.....k.....",
  mirror: ".....k.....|.kk..k..kk.|kbbk.k.kbbk|kbbbkkkbbbk|kbbk.k.kbbk|.kk..k..kk.|.....k.....",
};
const ICOL = { k: "#000", w: "#fff", g: "#808080", y: "#ffd23f", b: "#2f6fde", r: "#e5383b" };
const TOOLS = [["select", "Select and move"], ["eraser", "Eraser"], ["fill", "Fill with color"], ["picker", "Pick color"], ["zoom", "Magnifier"],
  ["pencil", "Pencil"], ["brush", "Brush"], ["spray", "Airbrush"], ["text", "Text"], ["line", "Line"], ["curve", "Curve"], ["rect", "Rectangle"],
  ["poly", "Polygon"], ["ellipse", "Ellipse"], ["rrect", "Rounded rectangle"], ["rainbow", "Rainbow brush"], ["gradient", "Gradient"],
  ["dither", "Dither brush"], ["sparkle", "Sparkle"], ["stamp", "Stamps"], ["replace", "Replace color"], ["mirror", "Mirror drawing"]];
const STAMPS = {
  star: ["....k....", "...kyk...", "kkkkyykkk", ".kyyyyyk.", "..kyyyk..", "..kykyk..", ".kyk.kyk.", ".kk...kk."],
  heart: [".kk...kk.", "kppk.kppk", "kpppkpppk", "kpppppppk", ".kpppppk.", "..kpppk..", "...kpk...", "....k...."],
  cone: ["...gg...", "..kkkk..", ".kbbkbk.", "kbkbbkbk", "kbbkbbbk", ".kbkkbk.", ".kbbbbk.", "..kbbk..", "...kk..."],
  rocket: ["...k...", "..kwk..", "..kwk..", "..kbk..", "..kwk..", ".kkwkk.", "kokwkok", "kk.o.kk", "...o..."],
  flower: ["..ppp..", ".ppppp.", "ppqqqpp", "ppqqqpp", ".ppppp.", "..pgp..", "...g...", ".ggg...", "...g..."],
  smile: ["..kkkkk..", ".kyyyyyk.", "kyykyykyk", "kyyyyyyyk", "kykyyykyk", "kyykkkyyk", ".kyyyyyk.", "..kkkkk.."],
};
const SCOL = { k: "#000000", y: "#ffd23f", p: "#ff7eb6", q: "#ffe14d", g: "#2e9e44", b: "#8d5524", w: "#ffffff", o: "#ff8c1a" };

const rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const u32 = (h) => { const [r, g, b] = rgb(h); return ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0; };
const hexOf = (v) => "#" + [v & 255, (v >> 8) & 255, (v >> 16) & 255].map((x) => x.toString(16).padStart(2, "0")).join("");
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

function iconSvg(name) {
  const rows = IC[name].split("|"), w = Math.max(...rows.map((r) => r.length)), h = rows.length;
  let out = "";
  rows.forEach((row, y) => [...row].forEach((ch, x) => { if (ICOL[ch]) out += `<rect x="${x}" y="${y}" width="1" height="1" fill="${ICOL[ch]}"/>`; }));
  return `<svg viewBox="0 0 ${w} ${h}" width="${w * 2}" height="${h * 2}" shape-rendering="crispEdges" aria-hidden="true">${out}</svg>`;
}

const P = { w: 320, h: 240, buf: null, undo: [], redo: [], tool: "pencil", size: 2, mode: 0, fg: "#000000", bg: "#ffffff", zoom: 2, mirror: false, grid: false, stamp: "star",
  sel: null, clip: null, curve: null, poly: null, text: null, hue: 0, win: null, cv: null, ov: null, last: null, down: false, start: null, spray: 0, saveT: 0 };

function fresh(w, h) {
  P.w = w; P.h = h;
  P.buf = new Uint32Array(w * h).fill(u32("#ffffff"));
  P.undo = []; P.redo = [];
  P.sel = null; P.poly = null; P.curve = null; P.text = null;
}

function loadDraft() {
  const d = store.get("gl-paint-draft", null);
  if (!d || !d.png) { fresh(320, 240); return Promise.resolve(); }
  return new Promise((res) => {
    const im = new Image();
    im.onload = () => {
      fresh(im.width, im.height);
      const c = document.createElement("canvas");
      c.width = im.width; c.height = im.height;
      const x = c.getContext("2d");
      x.drawImage(im, 0, 0);
      P.buf = new Uint32Array(x.getImageData(0, 0, im.width, im.height).data.buffer.slice(0));
      res();
    };
    im.onerror = () => { fresh(320, 240); res(); };
    im.src = d.png;
  });
}

function saveDraft() {
  clearTimeout(P.saveT);
  P.saveT = setTimeout(() => { try { store.set("gl-paint-draft", { png: P.cv.toDataURL("image/png") }); } catch (e) {} }, 600);
}

function show() {
  const c = P.cv.getContext("2d");
  c.putImageData(new ImageData(new Uint8ClampedArray(P.buf.buffer.slice(0)), P.w, P.h), 0, 0);
}

function push() {
  P.undo.push(P.buf.slice());
  if (P.undo.length > 30) P.undo.shift();
  P.redo = [];
}
const commit = () => { show(); saveDraft(); };

const inside = (x, y) => x >= 0 && y >= 0 && x < P.w && y < P.h;
function put(x, y, v, mirror = P.mirror) {
  x |= 0; y |= 0;
  if (inside(x, y)) P.buf[y * P.w + x] = v;
  if (mirror) { const mx = P.w - 1 - x; if (inside(mx, y)) P.buf[y * P.w + mx] = v; }
}
const get = (x, y) => (inside(x, y) ? P.buf[(y | 0) * P.w + (x | 0)] : 0);

function lineTo(x0, y0, x1, y1, plot) {
  x0 |= 0; y0 |= 0; x1 |= 0; y1 |= 0;
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let e = dx + dy;
  for (;;) {
    plot(x0, y0);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * e;
    if (e2 >= dy) { e += dy; x0 += sx; }
    if (e2 <= dx) { e += dx; y0 += sy; }
  }
}

function dab(x, y, v, size, round = true) {
  const r = size / 2, o = Math.floor((size - 1) / 2);
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
    if (round && size > 2) { const dx = i - (size - 1) / 2, dy = j - (size - 1) / 2; if (dx * dx + dy * dy > r * r) continue; }
    put(x - o + i, y - o + j, v);
  }
}

function rainbow() {
  P.hue = (P.hue + 3) % 360;
  const f = (n) => { const k = (n + P.hue / 30) % 12; return Math.round(255 * (0.55 - 0.45 * Math.max(-1, Math.min(k - 3, 9 - k, 1)))); };
  return ((255 << 24) | (f(4) << 16) | (f(8) << 8) | f(0)) >>> 0;
}

function brushAt(x, y) {
  const fg = u32(P.fg), bg = u32(P.bg), t = P.tool;
  if (t === "pencil") put(x, y, fg);
  else if (t === "brush") dab(x, y, fg, P.size + 1);
  else if (t === "eraser") dab(x, y, bg, P.size * 2 + 2, false);
  else if (t === "rainbow") dab(x, y, rainbow(), P.size + 1);
  else if (t === "dither") {
    const s = P.size * 2 + 2, o = Math.floor(s / 2);
    for (let j = 0; j < s; j++) for (let i = 0; i < s; i++) { const px = x - o + i, py = y - o + j; put(px, py, (px + py) % 2 ? fg : bg); }
  }
}

function sprayAt(x, y) {
  const fg = u32(P.fg), r = P.size * 3 + 3, n = P.tool === "sparkle" ? 3 : 10 + P.size * 4;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * r;
    if (P.tool === "sparkle") {
      const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d, v = Math.random() < 0.5 ? fg : u32("#ffffff");
      put(px, py, v); if (Math.random() < 0.35) { put(px + 1, py, v); put(px - 1, py, v); put(px, py + 1, v); put(px, py - 1, v); }
    } else put(x + Math.cos(a) * d, y + Math.sin(a) * d, fg);
  }
}

function flood(x, y, v) {
  const from = get(x, y);
  if (from === v || !inside(x, y)) return;
  const st = [[x | 0, y | 0]];
  while (st.length) {
    let [cx, cy] = st.pop();
    while (cx >= 0 && get(cx, cy) === from) cx--;
    cx++;
    let up = false, dn = false;
    while (cx < P.w && get(cx, cy) === from) {
      P.buf[cy * P.w + cx] = v;
      if (cy > 0) { if (get(cx, cy - 1) === from) { if (!up) { st.push([cx, cy - 1]); up = true; } } else up = false; }
      if (cy < P.h - 1) { if (get(cx, cy + 1) === from) { if (!dn) { st.push([cx, cy + 1]); dn = true; } } else dn = false; }
      cx++;
    }
  }
}

function shape(kind, a, b, plot, fillPlot) {
  const x0 = Math.min(a[0], b[0]), x1 = Math.max(a[0], b[0]), y0 = Math.min(a[1], b[1]), y1 = Math.max(a[1], b[1]);
  if (kind === "rect" || kind === "rrect") {
    const rr = kind === "rrect" ? Math.min(4 + P.size, (x1 - x0) / 2, (y1 - y0) / 2) | 0 : 0;
    const inCorner = (x, y) => {
      if (!rr) return true;
      const cx = x < x0 + rr ? x0 + rr : x > x1 - rr ? x1 - rr : x, cy = y < y0 + rr ? y0 + rr : y > y1 - rr ? y1 - rr : y;
      return (x - cx) ** 2 + (y - cy) ** 2 <= rr * rr + rr;
    };
    const edge = (x, y) => inCorner(x, y) && (!inCorner(x - 1, y) || !inCorner(x + 1, y) || !inCorner(x, y - 1) || !inCorner(x, y + 1) || x === x0 || x === x1 || y === y0 || y === y1);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (!inCorner(x, y)) continue;
      if (edge(x, y)) plot(x, y); else if (fillPlot) fillPlot(x, y);
    }
  } else if (kind === "ellipse") {
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, rx = Math.max(0.5, (x1 - x0) / 2), ry = Math.max(0.5, (y1 - y0) / 2);
    const inE = (x, y) => ((x - cx) / (rx + 0.5)) ** 2 + ((y - cy) / (ry + 0.5)) ** 2 <= 1;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (!inE(x, y)) continue;
      if (!inE(x - 1, y) || !inE(x + 1, y) || !inE(x, y - 1) || !inE(x, y + 1)) plot(x, y); else if (fillPlot) fillPlot(x, y);
    }
  }
}

function polyFill(pts, plot) {
  const ys = pts.map((p) => p[1]), y0 = Math.min(...ys), y1 = Math.max(...ys);
  for (let y = y0; y <= y1; y++) {
    const xs = [];
    for (let i = 0; i < pts.length; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
      if ((ay <= y && by > y) || (by <= y && ay > y)) xs.push(ax + ((y - ay) / (by - ay)) * (bx - ax));
    }
    xs.sort((m, n) => m - n);
    for (let i = 0; i + 1 < xs.length; i += 2) for (let x = Math.ceil(xs[i]); x <= Math.floor(xs[i + 1]); x++) plot(x, y);
  }
}

function curvePts(a, b, c) {
  const out = [];
  const n = Math.max(8, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) + Math.hypot(c[0] - a[0], c[1] - a[1])));
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    out.push([u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]);
  }
  return out;
}

function stroke(pts, v, size) {
  for (let i = 1; i < pts.length; i++) lineTo(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], (x, y) => dab(x, y, v, size));
  if (pts.length === 1) dab(pts[0][0], pts[0][1], v, size);
}

function drawShape(kind, a, b, extra) {
  const fg = u32(P.fg), bg = u32(P.bg), sz = P.size;
  const out = P.mode === 1 ? null : (x, y) => dab(x, y, fg, sz);
  const fill = P.mode === 0 ? null : (x, y) => put(x, y, P.mode === 1 ? fg : bg);
  if (kind === "line") stroke([a, b], fg, sz);
  else if (kind === "curve") stroke(curvePts(a, b, extra || [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]), fg, sz);
  else if (kind === "rect" || kind === "rrect" || kind === "ellipse") {
    if (fill) shape(kind, a, b, fill, fill);
    if (out) shape(kind, a, b, out, null);
  } else if (kind === "poly") {
    if (fill) polyFill(a, fill);
    if (out) stroke([...a, a[0]], fg, sz);
  } else if (kind === "gradient") {
    const A = rgb(P.fg), B = rgb(P.bg), dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy || 1;
    for (let y = 0; y < P.h; y++) for (let x = 0; x < P.w; x++) {
      if (P.sel && !(x >= P.sel.x && y >= P.sel.y && x < P.sel.x + P.sel.w && y < P.sel.y + P.sel.h)) continue;
      const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / L)), steps = 8, lv = t * steps, k = Math.floor(lv) + ((lv % 1) * 16 > BAYER[(y % 4) * 4 + (x % 4)] ? 1 : 0);
      const f = Math.min(steps, k) / steps, c = A.map((v, i) => Math.round(v + (B[i] - v) * f));
      P.buf[y * P.w + x] = ((255 << 24) | (c[2] << 16) | (c[1] << 8) | c[0]) >>> 0;
    }
  }
}

function stampAt(x, y) {
  const art = STAMPS[P.stamp], k = Math.max(1, Math.ceil(P.size / 2)), h = art.length * k, w = art[0].length * k;
  art.forEach((row, j) => [...row].forEach((ch, i) => {
    if (!SCOL[ch]) return;
    const v = u32(ch === "k" ? P.fg : SCOL[ch]);
    for (let b = 0; b < k; b++) for (let a = 0; a < k; a++) put(x - (w >> 1) + i * k + a, y - (h >> 1) + j * k + b, v);
  }));
}

function textPixels(t, x, y, plot) {
  const c = document.createElement("canvas"), size = [8, 12, 16, 24, 32][Math.min(4, P.size - 1)] || 12;
  const fam = { pixel: '"Lucida Console", Monaco, monospace', sans: "Tahoma, Verdana, sans-serif", serif: "Georgia, serif" }[P.text.font];
  c.width = P.w; c.height = P.h;
  const g = c.getContext("2d");
  g.font = `${P.text.bold ? "bold " : ""}${size}px ${fam}`;
  g.textBaseline = "top";
  g.fillStyle = "#000";
  t.split("\n").forEach((line, i) => g.fillText(line, x, y + i * size * 1.15));
  const d = g.getImageData(0, 0, P.w, P.h).data;
  for (let i = 3; i < d.length; i += 4) if (d[i] > 110) plot(((i - 3) / 4) % P.w, Math.floor((i - 3) / 4 / P.w));
}

function overlay() {
  const c = P.ov.getContext("2d");
  c.clearRect(0, 0, P.w, P.h);
  const save = P.buf;
  if (P.preview) {
    P.buf = new Uint32Array(P.w * P.h);
    P.preview();
    c.putImageData(new ImageData(new Uint8ClampedArray(P.buf.buffer), P.w, P.h), 0, 0);
    P.buf = save;
  }
  if (P.sel) {
    if (P.sel.data) {
      const d = document.createElement("canvas"); d.width = P.sel.w; d.height = P.sel.h;
      d.getContext("2d").putImageData(new ImageData(new Uint8ClampedArray(P.sel.data.buffer.slice(0)), P.sel.w, P.sel.h), 0, 0);
      c.drawImage(d, P.sel.x, P.sel.y);
    }
    c.save();
    c.setLineDash([2, 2]); c.strokeStyle = "#000"; c.lineWidth = 1;
    c.strokeRect(P.sel.x + 0.5, P.sel.y + 0.5, P.sel.w - 1, P.sel.h - 1);
    c.restore();
  }
}

function at(e) {
  const r = P.ov.getBoundingClientRect();
  return [Math.floor(((e.clientX - r.left) / r.width) * P.w), Math.floor(((e.clientY - r.top) / r.height) * P.h)];
}

function liftSel() {
  if (!P.sel || P.sel.data) return;
  const { x, y, w, h } = P.sel, data = new Uint32Array(w * h), bg = u32(P.bg);
  push();
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { data[j * w + i] = get(x + i, y + j); if (inside(x + i, y + j)) P.buf[(y + j) * P.w + x + i] = bg; }
  P.sel.data = data;
}
function dropSel() {
  if (!P.sel) return;
  if (P.sel.data) {
    const { x, y, w, h, data } = P.sel;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (inside(x + i, y + j)) P.buf[(y + j) * P.w + x + i] = data[j * w + i];
    commit();
  }
  P.sel = null;
  overlay();
}

function down(e) {
  if (e.button > 0 && e.pointerType === "mouse" && e.button !== 2) return;
  e.preventDefault();
  P.win.focus({ preventScroll: true });
  P.ov.setPointerCapture(e.pointerId);
  const p = at(e), t = P.tool, alt = e.button === 2 || e.altKey;
  P.down = true; P.start = p; P.last = p;
  if (alt && (t === "pencil" || t === "brush" || t === "fill")) [P.fg, P.bg] = [P.bg, P.fg];
  P.swapBack = alt && (t === "pencil" || t === "brush" || t === "fill");
  if (t === "picker") { P.fg = hexOf(get(...p)); P.tool = P.prevTool || "pencil"; P.down = false; ui(); return; }
  if (t === "zoom") { setZoom(alt ? P.zoom / 2 : P.zoom * 2); P.down = false; return; }
  if (t === "select") {
    if (P.sel && p[0] >= P.sel.x && p[1] >= P.sel.y && p[0] < P.sel.x + P.sel.w && p[1] < P.sel.y + P.sel.h) { liftSel(); P.moving = [p[0] - P.sel.x, p[1] - P.sel.y]; }
    else { dropSel(); P.moving = null; P.sel = { x: p[0], y: p[1], w: 1, h: 1 }; }
    overlay(); return;
  }
  if (P.sel && t !== "gradient") dropSel();
  if (t === "text") { placeText(p); P.down = false; return; }
  if (t === "poly") {
    if (!P.poly) P.poly = [p];
    else if (Math.hypot(p[0] - P.poly[0][0], p[1] - P.poly[0][1]) < 4 && P.poly.length > 2) { push(); drawShape("poly", P.poly); P.poly = null; P.preview = null; commit(); overlay(); P.down = false; return; }
    else P.poly.push(p);
    P.preview = () => stroke(P.poly, u32(P.fg), P.size);
    overlay(); return;
  }
  if (t === "curve" && P.curve) { P.curve.c = p; P.preview = () => drawShape("curve", P.curve.a, P.curve.b, P.curve.c); overlay(); return; }
  if (t === "fill") { push(); flood(p[0], p[1], u32(P.fg)); commit(); return; }
  if (t === "replace") { push(); const from = get(...p), v = u32(P.fg); for (let i = 0; i < P.buf.length; i++) if (P.buf[i] === from) P.buf[i] = v; commit(); return; }
  if (t === "stamp") { push(); stampAt(...p); commit(); return; }
  if (["pencil", "brush", "eraser", "rainbow", "dither"].includes(t)) { push(); brushAt(...p); show(); return; }
  if (t === "spray" || t === "sparkle") {
    push(); sprayAt(...p); show();
    clearInterval(P.spray);
    P.spray = setInterval(() => { if (P.down) { sprayAt(...P.last); show(); } }, 40);
  }
}

function move(e) {
  const p = at(e), t = P.tool;
  P.win.querySelector("[data-gp-pos]").textContent = inside(...p) ? `${p[0]}, ${p[1]}` : "";
  if (!P.down) {
    if (t === "poly" && P.poly) { P.preview = () => stroke([...P.poly, p], u32(P.fg), P.size); overlay(); }
    return;
  }
  if (t === "select") {
    if (P.moving) { P.sel.x = p[0] - P.moving[0]; P.sel.y = p[1] - P.moving[1]; }
    else { const s = P.start; P.sel = { x: Math.min(s[0], p[0]), y: Math.min(s[1], p[1]), w: Math.abs(p[0] - s[0]) + 1, h: Math.abs(p[1] - s[1]) + 1 }; }
    overlay(); return;
  }
  if (t === "curve" && P.curve) { P.curve.c = p; overlay(); return; }
  if (["pencil", "brush", "eraser", "rainbow", "dither"].includes(t)) { lineTo(P.last[0], P.last[1], p[0], p[1], (x, y) => brushAt(x, y)); show(); }
  if (["line", "curve", "rect", "ellipse", "rrect", "gradient"].includes(t)) {
    const a = P.start;
    P.preview = t === "gradient" ? () => stroke([a, p], u32(P.fg), 1) : () => drawShape(t, a, p);
    overlay();
  }
  P.last = p;
}

function up(e) {
  if (!P.down) return;
  P.down = false;
  clearInterval(P.spray);
  const p = at(e), t = P.tool;
  if (t === "select") { P.moving = null; if (P.sel && P.sel.w < 2 && P.sel.h < 2) { P.sel = null; overlay(); } return; }
  if (t === "curve") {
    if (!P.curve) { P.curve = { a: P.start, b: p, c: null }; P.preview = () => drawShape("curve", P.curve.a, P.curve.b, P.curve.c); overlay(); return; }
    push(); drawShape("curve", P.curve.a, P.curve.b, P.curve.c); P.curve = null; P.preview = null; overlay(); commit(); return;
  }
  if (["line", "rect", "ellipse", "rrect", "gradient"].includes(t)) { push(); drawShape(t, P.start, p); P.preview = null; overlay(); commit(); }
  if (["pencil", "brush", "eraser", "rainbow", "dither", "spray", "sparkle"].includes(t)) commit();
  if (P.swapBack) { [P.fg, P.bg] = [P.bg, P.fg]; P.swapBack = false; ui(); }
}

function placeText(p) {
  P.text = { x: p[0], y: p[1], value: P.text ? P.text.value : "", font: P.text ? P.text.font : "pixel", bold: P.text ? P.text.bold : false };
  options();
  const inp = P.win.querySelector("[data-gp-text]");
  if (inp) { inp.focus(); inp.select(); }
  previewText();
}
function previewText() {
  if (!P.text) return;
  const v = u32(P.fg);
  P.preview = () => textPixels(P.text.value || "Text", P.text.x, P.text.y, (x, y) => put(x, y, v, false));
  overlay();
}
function commitText() {
  if (!P.text || !P.text.value) return;
  push();
  const v = u32(P.fg);
  textPixels(P.text.value, P.text.x, P.text.y, (x, y) => put(x, y, v, false));
  P.text.value = "";
  P.preview = null;
  overlay(); commit(); options();
}

function op(name) {
  if (name === "undo" && P.undo.length) { P.redo.push(P.buf); P.buf = P.undo.pop(); P.sel = null; commit(); overlay(); }
  if (name === "redo" && P.redo.length) { P.undo.push(P.buf); P.buf = P.redo.pop(); commit(); overlay(); }
  const pixels = ["fliph", "flipv", "rot", "invert", "clear"];
  if (pixels.includes(name)) {
    dropSel();
    push();
    const b = P.buf.slice(), W = P.w, H = P.h;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (name === "fliph") P.buf[i] = b[y * W + (W - 1 - x)];
      if (name === "flipv") P.buf[i] = b[(H - 1 - y) * W + x];
      if (name === "rot") P.buf[i] = b[(H - 1 - y) * W + (W - 1 - x)];
      if (name === "invert") P.buf[i] = (b[i] & 0xff000000) | (~b[i] & 0x00ffffff);
      if (name === "clear") P.buf[i] = u32(P.bg);
    }
    commit();
  }
  if (name === "copy" && P.sel) {
    const { x, y, w, h, data } = P.sel;
    P.clip = { w, h, data: data ? data.slice() : Uint32Array.from({ length: w * h }, (_, i) => get(x + (i % w), y + Math.floor(i / w))) };
  }
  if (name === "paste" && P.clip) { dropSel(); push(); P.sel = { x: 4, y: 4, w: P.clip.w, h: P.clip.h, data: P.clip.data.slice() }; P.tool = "select"; ui(); overlay(); }
  if (name === "delete" && P.sel) { liftSel(); P.sel = null; commit(); overlay(); }
  if (name === "grid") { P.grid = !P.grid; ui(); }
  if (name === "zin") setZoom(P.zoom * 2);
  if (name === "zout") setZoom(P.zoom / 2);
  if (name === "swap") { [P.fg, P.bg] = [P.bg, P.fg]; ui(); }
  if (name === "new") newDialog();
  if (name === "hang") hangDialog();
  if (name === "save") { const a = document.createElement("a"); a.href = P.cv.toDataURL("image/png"); a.download = "gzowo-paint.png"; a.click(); }
}

function setZoom(z) {
  const area = P.win.querySelector(".gp-area"), f = Math.min((area.clientWidth - 16) / P.w, (area.clientHeight - 16) / P.h) || 1, fit = f >= 1 ? Math.floor(f) : Math.max(0.25, Math.floor(f * 100) / 100);
  P.zoom = Math.max(Math.min(1, fit), Math.min(16, z ? (z >= 1 ? Math.round(z) : z) : fit));
  const css = `${P.w * P.zoom}px`;
  [P.cv, P.ov].forEach((c) => { c.style.width = css; c.style.height = `${P.h * P.zoom}px`; });
  const g = P.win.querySelector(".gp-grid");
  g.style.width = css; g.style.height = `${P.h * P.zoom}px`; g.style.backgroundSize = `${P.zoom}px ${P.zoom}px`;
  ui();
}

function options() {
  const box = P.win.querySelector("[data-gp-opts]"), t = P.tool;
  let h = "";
  const sizes = (n) => `<p class="gp-ol">Size</p><div class="gp-sizes">${Array.from({ length: n }, (_, i) => `<button type="button" data-gp-size="${i + 1}" aria-label="Size ${i + 1}" aria-pressed="${P.size === i + 1}"><i style="width:${2 + i * 2}px;height:${2 + i * 2}px"></i></button>`).join("")}</div>`;
  if (["brush", "eraser", "rainbow", "dither", "spray", "sparkle", "line", "curve", "poly"].includes(t)) h += sizes(5);
  if (["rect", "ellipse", "rrect", "poly"].includes(t)) {
    if (t !== "poly") h += sizes(5);
    h += `<p class="gp-ol">Style</p><div class="gp-modes">${["Outline", "Filled", "Both"].map((m, i) => `<button type="button" data-gp-mode="${i}" aria-pressed="${P.mode === i}">${m}</button>`).join("")}</div>`;
  }
  if (t === "stamp") h += sizes(4) + `<p class="gp-ol">Stamp</p><div class="gp-stamps">${Object.keys(STAMPS).map((k) => `<button type="button" data-gp-stamp="${k}" aria-label="${k}" aria-pressed="${P.stamp === k}"><canvas data-stamp-art="${k}"></canvas></button>`).join("")}</div>`;
  if (t === "text") {
    h += sizes(5) + `<p class="gp-ol">Font</p><div class="gp-modes">${["pixel", "sans", "serif"].map((f) => `<button type="button" data-gp-font="${f}" aria-pressed="${(P.text ? P.text.font : "pixel") === f}">${f}</button>`).join("")}<button type="button" data-gp-bold aria-label="Bold" aria-pressed="${!!(P.text && P.text.bold)}"><b>B</b></button></div>`;
    h += P.text ? `<textarea data-gp-text rows="2" maxlength="80" placeholder="Type here">${esc(P.text.value)}</textarea><button class="btn" type="button" data-gp-place>Place text</button>` : `<p class="gp-hint">Click the picture where the text goes.</p>`;
  }
  if (t === "poly") h += `<p class="gp-hint">Click corners, click the first one to close.</p>`;
  if (t === "curve") h += `<p class="gp-hint">Drag a line, then drag to bend it.</p>`;
  if (t === "select") h += `<div class="gp-modes gp-col"><button type="button" data-gp-op="copy">Copy</button><button type="button" data-gp-op="paste">Paste</button><button type="button" data-gp-op="delete">Delete</button></div>`;
  if (t === "gradient") h += `<p class="gp-hint">Drag from the main color to the second one. Works inside a selection too.</p>`;
  if (t === "replace") h += `<p class="gp-hint">Click a color to swap all of it for the main color.</p>`;
  if (t === "zoom") h += `<div class="gp-modes gp-col">${[1, 2, 4, 8].map((z) => `<button type="button" data-gp-zoom="${z}" aria-pressed="${P.zoom === z}">${z}x</button>`).join("")}</div>`;
  box.innerHTML = h;
  box.querySelectorAll("[data-stamp-art]").forEach((c) => {
    const art = STAMPS[c.dataset.stampArt]; c.width = art[0].length; c.height = art.length;
    const g = c.getContext("2d");
    art.forEach((row, y) => [...row].forEach((ch, x) => { if (SCOL[ch]) { g.fillStyle = SCOL[ch]; g.fillRect(x, y, 1, 1); } }));
  });
}

function ui() {
  const w = P.win;
  w.querySelectorAll("[data-gp-tool]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.gpTool === P.tool || (b.dataset.gpTool === "mirror" && P.mirror))));
  w.querySelector("[data-gp-fg]").style.background = P.fg;
  w.querySelector("[data-gp-bg]").style.background = P.bg;
  w.querySelector(".gp-grid").hidden = !P.grid || P.zoom < 4;
  w.querySelector("[data-gp-size-l]").textContent = `${P.w} x ${P.h}  ${P.zoom < 1 ? Math.round(P.zoom * 100) + "%" : P.zoom + "x"}`;
  w.querySelector("[data-gp-ov]").dataset.tool = P.tool;
  options();
}

function newDialog() {
  const d = P.win.querySelector("[data-gp-dlg]");
  d.hidden = false;
  d.innerHTML = `<form class="gp-dlg" data-gp-new><p><b>New picture</b></p>${SIZES.map(([w, h], i) => `<label><input type="radio" name="s" value="${i}"${w === P.w && h === P.h ? " checked" : ""}> ${w} x ${h}</label>`).join("")}<p>The old picture goes away (Undo can't bring it back).</p><p class="bk-row"><button class="btn" type="submit">OK</button><button class="btn" type="button" data-gp-cancel>Cancel</button></p></form>`;
}

function hangDialog() {
  dropSel();
  const d = P.win.querySelector("[data-gp-dlg]");
  d.hidden = false;
  d.innerHTML = `<form class="gp-dlg gp-hang" data-gp-hang><p><b>Hang it in the Gzowo Museum</b></p><img alt="Your painting" src="${P.cv.toDataURL("image/png")}">
<label>Title<input name="title" maxlength="40" required></label><label>About it<textarea name="about" maxlength="200" rows="2"></textarea></label>
<label>Price in szyszki<input name="price" type="number" min="1" max="1000000" value="50" required></label><label class="gp-chk"><input type="checkbox" name="forsale" checked> For sale</label>
<p class="bk-note">Haiku, the museum critic, looks at every painting and pays up to 50 szyszki for a good one (three a day). You keep 10% every time it is sold again later.</p>
<p class="bk-row"><button class="btn go" type="submit">Hang it</button><button class="btn" type="button" data-gp-cancel>Cancel</button></p><p class="bk-note" data-note></p></form>`;
  d.querySelector("[name=title]").focus();
}

async function hang(f) {
  const note = f.querySelector("[data-note]"), btn = f.querySelector("[type=submit]");
  btn.disabled = true;
  note.textContent = "The critic is looking at it...";
  try {
    await ensure();
    const j = await api("/art", { title: f.title.value, about: f.about.value, price: +f.price.value, forsale: f.forsale.checked, img: P.cv.toDataURL("image/png") });
    f.closest("[data-gp-dlg]").innerHTML = `<div class="gp-dlg"><p><b>It's on the wall!</b></p><p class="gp-score">${j.score}/10</p><p>"${esc(j.comment)}"<br>- Haiku, museum critic</p><p>${j.paid ? `The critic paid you ${j.paid} szyszki.` : "No payout this time, but it hangs in the museum now."}</p><p class="bk-row"><button class="btn go" type="button" data-museum="${j.id}">See it in the museum</button><button class="btn" type="button" data-gp-cancel>Keep painting</button></p></div>`;
    if (j.paid) toast(`+${j.paid} from the museum critic (${j.score}/10)`);
    window.dispatchEvent(new CustomEvent("gz:art", { detail: j.id }));
  } catch (e) { note.textContent = e.message; btn.disabled = false; }
}

function body() {
  return `<div class="gp-menu">${[["new", "New"], ["undo", "Undo"], ["redo", "Redo"], ["fliph", "Flip ↔"], ["flipv", "Flip ↕"], ["rot", "Turn"], ["invert", "Invert"], ["clear", "Clear"], ["grid", "Grid"], ["zout", "-"], ["zin", "+"], ["save", "Save PNG"]].map(([k, l]) => `<button type="button" data-gp-op="${k}">${l}</button>`).join("")}<button class="btn go gp-hangb" type="button" data-gp-op="hang">Hang in the museum</button></div>
<div class="gp-main"><div class="gp-side"><div class="gp-tools">${TOOLS.map(([k, l]) => `<button type="button" data-gp-tool="${k}" title="${l}" aria-label="${l}">${iconSvg(k)}</button>`).join("")}</div><div class="gp-opts" data-gp-opts></div></div>
<div class="gp-area"><div class="gp-stage"><canvas class="gp-cv"></canvas><div class="gp-grid" hidden></div><canvas class="gp-ov" data-gp-ov></canvas></div></div><div data-gp-dlg hidden></div></div>
<div class="gp-pal"><div class="gp-cur"><button type="button" class="gp-bgc" data-gp-bg title="Second color"></button><button type="button" class="gp-fgc" data-gp-fg title="Main color"></button><button type="button" class="gp-swap" data-gp-op="swap" title="Swap colors">⇄</button></div>
<div class="gp-sw">${PALETTE.map((c) => `<button type="button" data-gp-c="${c}" style="background:${c}" aria-label="Color ${c}"></button>`).join("")}</div><label class="gp-pick" title="Any color"><input type="color" data-gp-custom value="#3a74d6"><span>More</span></label></div>`;
}

export async function openPaint() {
  const el = window.gzDesk.open({ id: "paint", title: "Gzowo Paint", icon: "frame", cls: "w-paint", body: "", status: `<span data-gp-pos></span><span data-gp-size-l></span><span>Left click main color, right click second color</span>` });
  P.win = el;
  if (el.dataset.ready) { setZoom(P.zoom); return; }
  el.dataset.ready = "1";
  el.querySelector(".wb").innerHTML = body();
  P.cv = el.querySelector(".gp-cv"); P.ov = el.querySelector(".gp-ov");
  await loadDraft();
  [P.cv, P.ov].forEach((c) => { c.width = P.w; c.height = P.h; });
  show();
  requestAnimationFrame(() => setZoom(0));
  P.ov.addEventListener("pointerdown", down);
  P.ov.addEventListener("pointermove", move);
  P.ov.addEventListener("pointerup", up);
  P.ov.addEventListener("pointercancel", up);
  P.ov.addEventListener("contextmenu", (e) => e.preventDefault());
  el.addEventListener("click", (e) => {
    const t = e.target;
    const tool = t.closest("[data-gp-tool]");
    if (tool) {
      const k = tool.dataset.gpTool;
      if (k === "mirror") { P.mirror = !P.mirror; ui(); return; }
      if (P.tool === "text" && k !== "text") commitText();
      if (k === "picker") P.prevTool = P.tool;
      if (P.tool === "select" && k !== "select") dropSel();
      P.tool = k; P.poly = null; P.curve = null; P.preview = null; if (k !== "text") P.text = null; overlay(); ui(); return;
    }
    const o = t.closest("[data-gp-op]"); if (o) { op(o.dataset.gpOp); return; }
    const sz = t.closest("[data-gp-size]"); if (sz) { P.size = +sz.dataset.gpSize; options(); previewText(); return; }
    const md = t.closest("[data-gp-mode]"); if (md) { P.mode = +md.dataset.gpMode; options(); return; }
    const st = t.closest("[data-gp-stamp]"); if (st) { P.stamp = st.dataset.gpStamp; options(); return; }
    const fo = t.closest("[data-gp-font]"); if (fo && P.text) { P.text.font = fo.dataset.gpFont; options(); previewText(); return; }
    if (t.closest("[data-gp-bold]") && P.text) { P.text.bold = !P.text.bold; options(); previewText(); return; }
    if (t.closest("[data-gp-place]")) { commitText(); return; }
    const z = t.closest("[data-gp-zoom]"); if (z) { setZoom(+z.dataset.gpZoom); return; }
    const c = t.closest("[data-gp-c]"); if (c) { P.fg = c.dataset.gpC; ui(); previewText(); return; }
    if (t.closest("[data-gp-cancel]")) { const d = el.querySelector("[data-gp-dlg]"); d.hidden = true; d.innerHTML = ""; }
  });
  el.addEventListener("contextmenu", (e) => { const c = e.target.closest("[data-gp-c]"); if (c) { e.preventDefault(); P.bg = c.dataset.gpC; ui(); } });
  el.addEventListener("input", (e) => {
    if (e.target.matches("[data-gp-custom]")) { P.fg = e.target.value; ui(); }
    if (e.target.matches("[data-gp-text]") && P.text) { P.text.value = e.target.value; previewText(); }
  });
  el.addEventListener("submit", (e) => {
    e.preventDefault();
    const f = e.target;
    if (f.matches("[data-gp-new]")) { const [w, h] = SIZES[+new FormData(f).get("s") || 0]; fresh(w, h); [P.cv, P.ov].forEach((c) => { c.width = w; c.height = h; }); commit(); overlay(); setZoom(0); f.closest("[data-gp-dlg]").hidden = true; }
    if (f.matches("[data-gp-hang]")) hang(f);
  });
  el.addEventListener("keydown", (e) => {
    if (e.target.closest("input, textarea")) { if (e.key === "Enter" && e.target.matches("[data-gp-text]") && !e.shiftKey) { e.preventDefault(); commitText(); } return; }
    const k = e.key.toLowerCase();
    if ((e.metaKey || e.ctrlKey) && k === "z") { e.preventDefault(); op(e.shiftKey ? "redo" : "undo"); }
    else if ((e.metaKey || e.ctrlKey) && k === "y") { e.preventDefault(); op("redo"); }
    else if ((e.metaKey || e.ctrlKey) && k === "c") op("copy");
    else if ((e.metaKey || e.ctrlKey) && k === "v") op("paste");
    else if (k === "delete" || k === "backspace") op("delete");
    else if (k === "x") op("swap");
  });
  el.tabIndex = -1;
  ui();
}

document.addEventListener("click", (e) => { if (e.target.closest("[data-paint]")) { e.preventDefault(); openPaint(); } });
