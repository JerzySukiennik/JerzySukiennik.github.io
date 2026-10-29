/* Gzowo Labs map: the plot in Gzowo built from Jurek's pixel art sprites over a pixel background drawn in code.
   Wide screens get one street with the buildings behind it and small things in front, phones a path that winds down past every door.
   The brick wall is drawn pixel by pixel so it stays sharp when the camera flies in to paint. */

export const SPR = {
  arcade: [315, 341], workshop: [262, 166], lab: [248, 277], launchpad: [174, 424], billboard: [206, 267], signpost: [129, 199], mailbox: [51, 88],
  wall: [404, 147], cloud1: [141, 75], cloud2: [161, 77], cloud3: [194, 70], cloud4: [137, 64], sun: [85, 87], tree1: [98, 103], tree2: [72, 101],
  tree3: [82, 90], pine: [85, 118], bush: [64, 63], lamp: [24, 97], bench: [99, 49], flag: [50, 96], windsock: [50, 78], gull: [66, 82],
  dock: [200, 60], water: [491, 56],
};
export const FACE = { x: 2 / 404, y: 13 / 147, w: 400 / 404, h: 129 / 147 };
export const KAYAK = [120, 28];
export const PLACE_SPRITE = { rockets: "launchpad", printing: "workshop", games: "arcade", software: "lab", reviews: "billboard", guestbook: "mailbox", about: "signpost" };

const SKY = ["#3a74d6", "#4381dd", "#4e8ee3", "#5a9be8", "#68a8ee", "#78b5f2", "#8ac2f6", "#9ecff9"];
const GRASS = { top: "#69c04c", bottom: "#56ae3f", dark: "#47993a", darker: "#3c8a32", light: "#86d65f", bank: "#3f8f35" };
const PATH = { base: "#e9c98f", edge: "#c99f62", light: "#f4dcab", pebble: "#bf9661" };
const FLOWERS = ["#ffffff", "#ffe14d", "#ff9ed2", "#c9a2ff", "#ffffff", "#ffd1e8"];

let images = null;
export function loadSprites() {
  if (images) return images;
  const out = {};
  images = Promise.all(Object.keys(SPR).filter((n) => n !== "wall").map((n) => new Promise((res) => {
    const im = new Image();
    im.onload = () => { out[n] = im; res(); };
    im.onerror = () => res();
    im.src = `/assets/map/${n}.webp`;
  }))).then(() => out);
  return images;
}

function spline(points, steps) {
  const out = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)], p1 = points[i], p2 = points[i + 1], p3 = points[Math.min(points.length - 1, i + 2)];
    for (let s = 0; s < steps; s++) {
      const t = s / steps, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map((k) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)));
    }
  }
  out.push(points[points.length - 1]);
  return out;
}

function withLengths(pts) {
  const len = [0];
  for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return { pts, len, total: len[len.length - 1] };
}

function stationsFor(path, places, mural) {
  const doors = Object.keys(places).map((key) => ({ key, x: places[key].x + places[key].w / 2, y: places[key].y + places[key].h }));
  doors.push({ key: "mural", x: mural.x + mural.w / 2, y: mural.y });
  return doors.map((d) => {
    let best = 0, bd = Infinity;
    path.pts.forEach((q, i) => { const dd = Math.hypot(q[0] - d.x, q[1] - d.y); if (dd < bd) { bd = dd; best = i; } });
    return { key: d.key, s: path.len[best], x: path.pts[best][0], y: path.pts[best][1] };
  });
}

function sprite(name, cx, base, scale) {
  const [w, h] = SPR[name];
  return { sprite: name, x: cx - (w * scale) / 2, y: base - h * scale, w: w * scale, h: h * scale, k: scale };
}

function land(W, H) {
  const s = Math.min(H / 870, W / 1500);
  const at = (name, fx, fy, k = 1) => sprite(name, fx * W, fy * H, s * k);
  const places = {
    reviews: at("billboard", 0.105, 0.695, 0.9), printing: at("workshop", 0.28, 0.715, 0.92), games: at("arcade", 0.475, 0.715, 0.9),
    software: at("lab", 0.665, 0.715, 0.92), rockets: at("launchpad", 0.868, 0.72, 0.85), about: at("signpost", 0.052, 0.93, 0.78), guestbook: at("mailbox", 0.392, 0.88),
  };
  const wallW = Math.min(0.25 * W, 404 * s * 0.95), wall = sprite("wall", 0.71 * W, 0.928 * H, wallW / 404);
  const path = withLengths(spline([[-0.02, 0.742], [0.1, 0.74], [0.2, 0.737], [0.3, 0.741], [0.4, 0.743], [0.5, 0.739], [0.6, 0.742], [0.7, 0.74],
    [0.8, 0.743], [0.9, 0.744], [1.02, 0.746]].map(([x, y]) => [x * W, y * H]), 12));
  const props = [
    at("tree2", 0.012, 0.715, 0.8), at("flag", 0.778, 0.715, 0.8), at("windsock", 0.948, 0.72, 0.9), at("tree1", 0.997, 0.715, 0.9),
    at("bush", 0.118, 0.9, 0.8), at("bench", 0.19, 0.83, 0.85), at("tree1", 0.268, 0.905, 0.85), at("bush", 0.45, 0.85, 0.75), at("bench", 0.525, 0.83, 0.85),
    at("tree3", 0.555, 0.912, 0.8), at("pine", 0.885, 0.905, 0.75), at("bush", 0.95, 0.875, 0.8),
  ];
  return finish({
    mode: "land", W, H, s, k: Math.max(2, Math.round(3 * s)), horizon: 0.47 * H, river: [0.932 * H, H], places, mural: wall, path, pathWidth: 32 * s, props,
    sun: at("sun", 0.6, 0.2, 1.25), clouds: [at("cloud3", 0.43, 0.15), at("cloud2", 0.76, 0.27, 0.9), at("cloud4", 0.36, 0.33, 0.45), at("cloud1", 0.55, 0.36, 0.45),
      at("cloud1", 0.7, 0.4, 0.38)],
    river_props: [at("dock", 0.37, 0.975, 0.95)], gull: at("gull", 0.955, 0.99, 0.75), kayaks: [kayak(0.48 * W, 0.975 * H, s * 1.15), kayak(0.585 * W, 0.98 * H, s * 1.15)],
    spurAt: 0.343 * W, spurDown: [[0.343, 0.8], [0.336, 0.86], [0.326, 0.905]].map(([x, y]) => [x * W, y * H]), lane: [0.16 * W, 0.88 * W], person: 92 * s, speed: 120 * s,
  });
}

function tall(W) {
  const f = W / 390, s = 0.7 * f, X = (x) => x * f, Y = (y) => y * f;
  const at = (name, x, y, k = 1) => sprite(name, X(x), Y(y), s * k);
  const places = {
    about: at("signpost", 300, 610), rockets: at("launchpad", 80, 900), printing: at("workshop", 280, 1140), games: at("arcade", 118, 1440),
    software: at("lab", 285, 1720), reviews: at("billboard", 100, 1990), guestbook: at("mailbox", 300, 2110),
  };
  const wall = sprite("wall", X(175), Y(2330), X(320) / 404);
  const path = withLengths(spline([[195, 478], [186, 560], [186, 650], [200, 760], [204, 860], [188, 920], [140, 932], [90, 935], [64, 960], [62, 1040],
    [66, 1130], [90, 1166], [180, 1172], [280, 1172], [312, 1196], [318, 1300], [316, 1420], [290, 1466], [200, 1472], [100, 1472], [70, 1500], [64, 1600],
    [68, 1700], [92, 1746], [200, 1752], [282, 1752], [306, 1780], [310, 1880], [302, 1980], [270, 2018], [180, 2022], [100, 2024], [72, 2050], [76, 2110],
    [110, 2140], [200, 2146], [300, 2146], [360, 2150], [405, 2152]].map(([x, y]) => [X(x), Y(y)]), 10));
  const props = [
    at("flag", 330, 700, 0.8), at("tree2", 300, 850, 0.9), at("bush", 360, 900, 0.8), at("lamp", 150, 1015), at("windsock", 368, 1002, 0.9), at("lamp", 262, 1430), at("bush", 365, 1300, 0.7), at("tree3", 145, 1650, 0.8),
    at("lamp", 115, 1712), at("pine", 235, 1860, 0.8), at("bench", 230, 1940, 0.75), at("lamp", 360, 1930), at("bush", 180, 2110, 0.85), at("tree1", 240, 2100, 0.7),
  ];
  return finish({
    mode: "tall", W, H: Y(2430), s, k: 2, horizon: Y(478), river: [Y(2340), Y(2430)], places, mural: wall, path, pathWidth: 30 * s, props,
    sun: at("sun", 330, 410, 1.1), clouds: [at("cloud3", 92, 395, 0.7), at("cloud1", 250, 345, 0.6), at("cloud4", 330, 452, 0.4)],
    river_props: [at("dock", 318, 2398, 0.8)], gull: at("gull", 30, 2430, 0.6), kayaks: [kayak(X(200), Y(2414), s * 1.2), kayak(X(98), Y(2420), s * 1.2)],
    spurAt: X(362), spurDown: [[362, 2220], [360, 2290], [362, 2345]].map(([x, y]) => [X(x), Y(y)]), lane: [X(80), X(360)], person: 64 * f, speed: 80 * f,
  });
}

function kayak(cx, base, scale) {
  const [w, h] = KAYAK;
  return { x: cx - (w * scale) / 2, y: base - h * scale, w: w * scale, h: h * scale, k: scale };
}

function trip(g) {
  let best = 0;
  g.path.pts.forEach((q, i) => { if (Math.abs(q[0] - g.spurAt) < Math.abs(g.path.pts[best][0] - g.spurAt)) best = i; });
  const dock = g.river_props[0], deck = dock.y + dock.h * 0.38, near = g.mode === "tall" ? 0.92 : 0.08, far = 1 - near;
  const top = g.path.pts[best];
  const down = [top, ...g.spurDown, [dock.x + dock.w * near, deck]];
  g.trip = { s: g.path.len[best], down, walk: [[dock.x + dock.w * near, deck], [dock.x + dock.w * far, deck]], deck };
  g.spurs = [down];
}

function finish(g) {
  g.face = { x: g.mural.x + FACE.x * g.mural.w, y: g.mural.y + FACE.y * g.mural.h, w: FACE.w * g.mural.w, h: FACE.h * g.mural.h };
  g.stations = stationsFor(g.path, g.places, g.mural);
  g.u = g.person / 15;
  trip(g);
  return g;
}

export function geometry(mode, W, H) { return mode === "tall" ? tall(W) : land(W, H); }

function rng(seed) {
  return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
}

const shaded = new Map();
function darker(im, amount) {
  const key = im.src + amount;
  if (shaded.has(key)) return shaded.get(key);
  const c = document.createElement("canvas");
  c.width = im.naturalWidth; c.height = im.naturalHeight;
  const x = c.getContext("2d");
  x.drawImage(im, 0, 0);
  x.globalCompositeOperation = "source-atop";
  x.fillStyle = `rgba(16,56,48,${amount})`;
  x.fillRect(0, 0, c.width, c.height);
  shaded.set(key, c);
  return c;
}

function forest(c, g, img, r) {
  const names = ["tree1", "tree2", "tree3", "tree1", "pine", "tree3"];
  const rows = [[0.5, 0.42, 26], [0.62, 0.22, 34]];
  rows.forEach(([scale, shade, step], row) => {
    for (let x = -30 + row * 13; x < g.W + 40; x += (step + r() * 14) * g.s * 1.6) {
      const n = names[Math.floor(r() * names.length)], im = img[n];
      if (!im) continue;
      const k = g.s * scale * (0.85 + r() * 0.3), w = im.naturalWidth * k, h = im.naturalHeight * k;
      const base = g.horizon + (row ? 4 : -6) * g.s + r() * 6 * g.s;
      c.drawImage(darker(im, shade), x - w / 2, base - h, w, h);
    }
  });
}

function ground(c, g, r) {
  const k = g.k, top = Math.round(g.horizon), bot = Math.round(g.river[0]);
  const gr = c.createLinearGradient(0, top, 0, bot);
  gr.addColorStop(0, GRASS.top); gr.addColorStop(1, GRASS.bottom);
  c.fillStyle = gr;
  c.fillRect(0, top, g.W, bot - top + 1);
  const mask = document.createElement("canvas");
  mask.width = Math.ceil(g.W / k); mask.height = Math.ceil(g.H / k);
  const m = mask.getContext("2d");
  m.lineCap = "round"; m.lineJoin = "round";
  const lines = [[g.path.pts, 1], ...(g.spurs || []).map((sp) => [sp, 0.55])];
  const trace = (pts) => { m.beginPath(); pts.forEach(([x, y], i) => (i ? m.lineTo(x / k, y / k) : m.moveTo(x / k, y / k))); };
  lines.forEach(([pts, w]) => { trace(pts); m.strokeStyle = PATH.edge; m.lineWidth = (g.pathWidth * w + 4 * g.s) / k; m.stroke(); });
  lines.forEach(([pts, w]) => { trace(pts); m.strokeStyle = PATH.base; m.lineWidth = (g.pathWidth * w) / k; m.stroke(); });
  lines.forEach(([pts, w]) => { trace(pts); m.strokeStyle = PATH.light; m.lineWidth = (g.pathWidth * w * 0.35) / k; m.stroke(); });
  const md = m.getImageData(0, 0, mask.width, mask.height).data;
  const onPath = (x, y) => md[(Math.floor(y / k) * mask.width + Math.floor(x / k)) * 4 + 3] > 0;
  const px = (x, y, col, w = 1, h = 1) => { c.fillStyle = col; c.fillRect(Math.floor(x / k) * k, Math.floor(y / k) * k, w * k, h * k); };
  const area = g.W * (bot - top);
  for (let i = 0; i < area / (k * k * 26); i++) {
    const x = r() * g.W, y = top + 6 + r() * (bot - top - 6);
    if (onPath(x, y)) continue;
    const t = r();
    if (t < 0.55) { px(x, y, GRASS.dark, 1, 2); px(x + k, y + k, GRASS.dark); }
    else if (t < 0.85) px(x, y, GRASS.light, 1, 1);
    else px(x, y, GRASS.darker, 2, 1);
  }
  for (let i = 0; i < area / (k * k * 520); i++) {
    const x = r() * g.W, y = top + 14 + r() * (bot - top - 20);
    if (onPath(x, y) || onPath(x + 3 * k, y)) continue;
    const col = FLOWERS[Math.floor(r() * FLOWERS.length)];
    px(x - k, y, col); px(x + k, y, col); px(x, y - k, col); px(x, y + k, col); px(x, y, "#ffd23a"); px(x, y + 2 * k, GRASS.darker);
  }
  c.imageSmoothingEnabled = false;
  c.drawImage(mask, 0, 0, mask.width * k, mask.height * k);
  c.imageSmoothingEnabled = true;
  for (let i = 0; i < (g.path.total * 1.3) / (6 * k); i++) {
    const x = r() * g.W, y = top + r() * (bot - top);
    if (onPath(x, y) && onPath(x + 2 * k, y) && onPath(x - 2 * k, y)) px(x, y, r() < 0.7 ? PATH.pebble : PATH.light, r() < 0.5 ? 2 : 1, 1);
  }
}

function river(c, g, img, r) {
  const [top, bot] = g.river, h = bot - top, k = g.k;
  c.fillStyle = "#2f74d6";
  c.fillRect(0, top, g.W, h);
  const im = img.water;
  if (im) {
    const cut = 4, sw = im.naturalWidth - cut * 2, sc = h / im.naturalHeight, tw = sw * sc;
    for (let x = 0, i = 0; x < g.W; x += tw - 1, i++) {
      c.save();
      if (i % 2) { c.translate(x + tw, top); c.scale(-1, 1); c.drawImage(im, cut, 0, sw, im.naturalHeight, 0, 0, tw, h); }
      else c.drawImage(im, cut, 0, sw, im.naturalHeight, x, top, tw, h);
      c.restore();
    }
  }
  c.fillStyle = GRASS.bank;
  c.fillRect(0, top - k, g.W, k * 2);
  for (let x = -10; x < g.W + 10; x += (18 + r() * 34) * g.s) {
    const rw = (10 + r() * 16) * g.s, rh = rw * (0.45 + r() * 0.2), y = top + r() * 4 * g.s;
    c.fillStyle = "#6f757d"; c.beginPath(); c.ellipse(x, y, rw / 2, rh / 2, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#9aa1a9"; c.beginPath(); c.ellipse(x - rw * 0.08, y - rh * 0.12, rw * 0.38, rh * 0.32, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#c3c8ce"; c.fillRect(Math.floor((x - rw * 0.22) / k) * k, Math.floor((y - rh * 0.3) / k) * k, k, k);
    if (r() < 0.5) { c.fillStyle = GRASS.dark; c.fillRect(Math.floor((x + rw * 0.3) / k) * k, Math.floor((y - rh * 0.6) / k) * k, k, 2 * k); }
  }
}

export function drawMap(canvas, g, img) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(g.W * dpr); canvas.height = Math.round(g.H * dpr);
  canvas.style.width = g.W + "px"; canvas.style.height = g.H + "px";
  const c = canvas.getContext("2d", { willReadFrequently: false });
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.imageSmoothingQuality = "high";
  const r = rng(g.mode === "tall" ? 977 : 5381);
  const band = g.horizon / SKY.length;
  SKY.forEach((col, i) => { c.fillStyle = col; c.fillRect(0, Math.floor(i * band), g.W, Math.ceil(band) + 1); });
  const k = g.k;
  for (let i = 1; i < SKY.length; i++) {
    const y = Math.floor(i * band);
    c.fillStyle = SKY[i - 1];
    for (let x = (i % 2) * k; x < g.W; x += 2 * k) c.fillRect(x, y, k, k);
  }
  const draw = (o) => { const im = img[o.sprite]; if (im) c.drawImage(im, o.x, o.y, o.w, o.h); };
  draw(g.sun);
  c.fillStyle = "#7fb98a";
  c.beginPath(); c.moveTo(0, g.horizon);
  for (let x = 0; x <= g.W; x += 8) c.lineTo(x, g.horizon - (18 + Math.sin(x / g.W * 7) * 10 + Math.sin(x / g.W * 23) * 4) * g.s);
  c.lineTo(g.W, g.horizon); c.closePath(); c.fill();
  forest(c, g, img, r);
  ground(c, g, r);
  river(c, g, img, r);
  g.river_props.forEach(draw);
  g.props.slice().sort((a, b) => a.y + a.h - (b.y + b.h)).forEach(draw);
}

let wallArtCache = null;
function wallArt() {
  if (wallArtCache) return wallArtCache;
  const [W, H] = SPR.wall;
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const c = cv.getContext("2d"), im = c.createImageData(W, H), px = im.data;
  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const tone = (rgb, f) => rgb.map((v) => Math.max(0, Math.min(255, Math.round(f >= 0 ? v + (255 - v) * f : v * (1 + f)))));
  const noise = (x, y, k) => {
    let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(k, 1442695041);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  const put = (x, y, rgb, a = 255) => { const i = (y * W + x) * 4; px[i] = rgb[0]; px[i + 1] = rgb[1]; px[i + 2] = rgb[2]; px[i + 3] = a; };
  const get = (x, y) => { const i = (y * W + x) * 4; return [px[i], px[i + 1], px[i + 2]]; };
  const OUT = hex("#1d140f"), BRICKS = ["#b9472b", "#c4512f", "#ad4127", "#c95b36", "#b44a2c", "#bf4e2e", "#a63e26"].map(hex);
  const BURNT = hex("#8f3420"), PALE = hex("#cf6a45"), MORTAR = [hex("#d6a88a"), hex("#c79a7c"), hex("#e2b698")];
  const CAP = [hex("#8d8984"), hex("#9b9792"), hex("#7b7772")], CAP_ROWS = { 1: hex("#c9c5c0"), 2: hex("#a9a5a0"), 8: hex("#6e6a66"), 9: hex("#4a4542") };
  const CAP_JOINT = hex("#5c5854"), CAP_JHI = hex("#a8a49f");
  const PLINTH = [hex("#7a756f"), hex("#86817b"), hex("#6c6762")], PL_HI = hex("#9a958f"), PL_LOW = hex("#56524d"), PL_JOINT = hex("#4b4743"), PL_JHI = hex("#8e8983");

  const mortar = (x, y) => { const r = noise(x, y, 4); return r < 0.1 ? MORTAR[1] : r < 0.15 ? MORTAR[2] : MORTAR[0]; };
  const cap = (x, y) => {
    if (CAP_ROWS[y]) return CAP_ROWS[y];
    const j = (x - 1) % 50;
    if (j === 0) return CAP_JOINT;
    if (j === 1 && y < 8) return CAP_JHI;
    const r = noise(x, y, 1);
    return r < 0.08 ? CAP[1] : r < 0.18 ? CAP[2] : CAP[0];
  };
  const plinth = (x, y) => {
    const j = (x - 2) % 46;
    if (y === 138) return j === 0 ? PL_JOINT : PL_HI;
    if (y === 142) return PL_LOW;
    if (j === 0) return PL_JOINT;
    if (j === 1) return PL_JHI;
    const r = noise(x, y, 5);
    return r < 0.1 ? PLINTH[1] : r < 0.22 ? PLINTH[2] : PLINTH[0];
  };
  const brickwork = (x, y) => {
    const course = Math.floor((y - 11) / 9), row = (y - 11) % 9;
    if (row === 0 || course > 13) return mortar(x, y);
    const off = course % 2 ? 8 : 0, bx = (x - 2 + off) % 16, bi = Math.floor((x - 2 + off) / 16), by = row - 1;
    if (bx === 15) return mortar(x, y);
    if (by === 0 && bx < 2 && noise(bi, course, 10) < 0.18) return mortar(x, y);
    let base = BRICKS[Math.floor(noise(bi, course, 7) * BRICKS.length)];
    if (noise(bi, course, 8) < 0.05) base = BURNT;
    else if (noise(bi, course, 9) < 0.04) base = PALE;
    let f = by === 0 ? 0.16 : by === 7 ? -0.3 : 0;
    f += bx === 0 ? 0.06 : bx === 14 ? -0.14 : 0;
    const r = noise(x, y, 3);
    f += r < 0.07 ? 0.1 : r < 0.14 ? -0.1 : r < 0.16 ? -0.22 : 0;
    f -= Math.max(0, (y - 112) / 25) * 0.1;
    return tone(base, f);
  };

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (y === 0) { if (x >= 1 && x <= W - 2) put(x, y, OUT); continue; }
      if (y <= 10) { put(x, y, x === 0 || x === W - 1 || y === 10 ? OUT : cap(x, y)); continue; }
      if (y <= 143) {
        if (x === 0 || x === W - 1) continue;
        if (x === 1 || x === W - 2 || y === 143) { put(x, y, OUT); continue; }
        let col = y >= 138 ? plinth(x, y) : brickwork(x, y);
        if (y <= 13) col = tone(col, [-0.38, -0.24, -0.12][y - 11]);
        if (x === 2) col = tone(col, -0.1);
        else if (x === W - 3) col = tone(col, -0.16);
        put(x, y, col);
        continue;
      }
      if (y === 144 && x >= 2 && x <= W - 3) put(x, y, [0, 0, 0], 77);
      else if (y === 145 && x >= 4 && x <= W - 5) put(x, y, [0, 0, 0], 40);
    }
  }

  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const LIGHT = [255, 196, 110];
  const lamps = [58, W - 58];
  lamps.forEach((cx) => {
    const gy = 20, rx = 46, ry = 32;
    for (let y = 11; y <= 137; y++) {
      for (let x = Math.max(2, cx - rx); x <= Math.min(W - 3, cx + rx); x++) {
        const d = Math.hypot((x - cx) / rx, (y - gy) / ry) + (BAYER[(y & 3) * 4 + (x & 3)] / 16 - 0.47) * 0.12;
        const a = d < 0.26 ? 0.6 : d < 0.48 ? 0.4 : d < 0.7 ? 0.23 : d < 0.92 ? 0.1 : 0;
        if (!a) continue;
        put(x, y, get(x, y).map((v, i) => Math.round(v + (LIGHT[i] - v) * a)));
      }
    }
    const rows = [
      [11, -1, 1, "#2a2e35"], [12, -1, 1, "#3a3f47"], [13, -1, 1, "#3a3f47"], [14, -4, 4, "#3c424c"], [14, -3, -2, "#6b7581"], [15, -6, 6, "#4b5361"],
      [15, -5, -3, "#7d8895"], [15, 5, 6, "#2f343c"], [16, -8, 8, "#4b5361"], [16, -7, -5, "#7d8895"], [16, 6, 8, "#2f343c"], [17, -9, 9, "#22262d"],
      [18, -5, 5, "#ffd24a"], [18, -2, 2, "#fff3bf"], [19, -5, 5, "#ffc93d"], [19, -2, 1, "#fff8d8"], [20, -4, 4, "#ffc93d"], [20, -1, 1, "#ffefb0"],
      [21, -3, 3, "#f2a933"], [22, -1, 1, "#e0902a"],
    ];
    rows.forEach(([y, a, b, col]) => { for (let dx = a; dx <= b; dx++) put(cx + dx, y, hex(col)); });
  });

  const MOSS = ["#4e8a36", "#3f7430", "#6aa548"].map(hex);
  [24, 131, 247, 371].forEach((mx, i) => {
    for (let n = 0; n < 9; n++) {
      const x = mx + Math.floor(noise(i, n, 11) * 14) - 7, y = 136 + Math.floor(noise(i, n, 12) * 4);
      if (x > 2 && x < W - 3) put(x, y, MOSS[Math.floor(noise(i, n, 13) * MOSS.length)]);
    }
  });

  c.putImageData(im, 0, 0);
  return (wallArtCache = cv);
}

export function drawWall(canvas) {
  const art = wallArt(), k = 4;
  canvas.width = art.width * k;
  canvas.height = art.height * k;
  const c = canvas.getContext("2d");
  c.imageSmoothingEnabled = false;
  c.drawImage(art, 0, 0, canvas.width, canvas.height);
}

const KAYAK_COLORS = [["#ffb24d", "#f2801f", "#a8500f"], ["#5ad6cd", "#1fa39c", "#0f6c67"]];
const kayakCache = new Map();
function kayakArt(n, paddle) {
  const key = n + (paddle ? "p" : "");
  if (kayakCache.has(key)) return kayakCache.get(key);
  const [W, H] = KAYAK, cy = 13;
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const c = cv.getContext("2d"), im = c.createImageData(W, H), px = im.data;
  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const mix = (a, b, t) => a.map((v, j) => Math.round(v + (b[j] - v) * t));
  const put = (x, y, rgb) => { if (x < 0 || y < 0 || x >= W || y >= H) return; const i = (y * W + x) * 4; px[i] = rgb[0]; px[i + 1] = rgb[1]; px[i + 2] = rgb[2]; px[i + 3] = 255; };
  const noise = (x, y) => { let h = Math.imul(x, 374761393) + Math.imul(y, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const [deck, hull, dark] = KAYAK_COLORS[n].map(hex), OUT = hex("#1d1712"), WATER = hex("#2f74d6"), FOAM = hex("#eaf6ff"), WHITE = [255, 255, 255];
  const half = (x) => { const t = (x + 0.5 - W / 2) / (W / 2); return 9 * Math.pow(Math.max(0, 1 - t * t), 0.8); };
  for (let x = 0; x < W; x++) {
    const h = half(x);
    if (h < 0.7) continue;
    const top = Math.round(cy - h), bot = Math.round(cy + h);
    for (let y = top; y <= bot; y++) {
      let col;
      if (y === top || y === bot) col = OUT;
      else if (y <= cy) col = y === top + 1 ? mix(deck, WHITE, 0.4) : deck;
      else if (y === cy + 1) col = mix(hull, WHITE, 0.3);
      else col = mix(hull, dark, (y - cy - 2) / Math.max(1, bot - cy - 2));
      if (y >= cy + 5 && y !== bot) col = mix(col, WATER, 0.55);
      put(x, y, col);
    }
  }
  for (let y = cy - 6; y <= cy + 1; y++) {
    for (let x = 44; x <= 76; x++) {
      const e = ((x + 0.5 - 60) / 14) ** 2 + ((y + 0.5 - (cy - 2)) / 3.7) ** 2;
      if (e <= 1) put(x, y, e > 0.7 ? hex("#14181e") : y < cy - 3 ? hex("#262b33") : hex("#353b45"));
    }
  }
  const CORD = hex("#3b2a1c");
  [[20, 34], [86, 100]].forEach(([a, b]) => {
    for (let x = a; x <= b; x++) {
      const t = (x - a) / (b - a);
      put(x, Math.round(cy - 4 + t * 4), CORD);
      put(x, Math.round(cy - t * 4), CORD);
    }
  });
  if (paddle) {
    const BLADE = hex("#ffd84a"), SHAFT = hex("#20242a");
    for (let x = 30; x <= 90; x++) put(x, Math.round(cy - 4 + ((x - 30) / 60) * 3), SHAFT);
    [[27, cy - 4], [93, cy - 1]].forEach(([bx, by]) => {
      for (let dx = -4; dx <= 4; dx++) for (let dy = -1; dy <= 1; dy++) if (Math.abs(dx) + Math.abs(dy) * 2.5 <= 4.5) put(bx + dx, by + dy, dy < 0 ? mix(BLADE, WHITE, 0.3) : BLADE);
      put(bx - 5, by, OUT); put(bx + 5, by, OUT);
    });
  }
  for (let x = 0; x < W; x++) {
    const h = half(x), inside = h >= 0.7;
    if (inside && noise(x, 1) < 0.55) put(x, cy + 5, FOAM);
    if (!inside && Math.abs(x - W / 2) < W / 2 + 6 && noise(x, 2) < 0.35) put(x, cy + 4 + Math.floor(noise(x, 3) * 2), FOAM);
  }
  for (let x = 6; x < W - 6; x += 1) if (noise(x, 4) < 0.18) put(x, cy + 11 + Math.floor(noise(x, 5) * 3), mix(WATER, WHITE, 0.55));
  c.putImageData(im, 0, 0);
  kayakCache.set(key, cv);
  return cv;
}

export function drawKayak(canvas, n, paddle) {
  const art = kayakArt(n, paddle), k = 4;
  canvas.width = art.width * k;
  canvas.height = art.height * k;
  const c = canvas.getContext("2d");
  c.imageSmoothingEnabled = false;
  c.drawImage(art, 0, 0, canvas.width, canvas.height);
}
