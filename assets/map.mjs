/* Gzowo Labs map: the plot in Gzowo built from Jurek's pixel art sprites over a pixel background drawn in code.
   Wide screens get one street with the buildings behind it and small things in front, phones a path that winds down past every door.
   The brick wall is drawn pixel by pixel so it stays sharp when the camera flies in to paint. The third column is Gzowo Street,
   with the exchange, the museum, the store and the coaster station. */

export const TALL = 349, WALL_ROWS = 147 + TALL;
const UP_ROWS = 877 / (323 / 129);
export const SPR = {
  arcade: [315, 341], workshop: [262, 166], lab: [248, 277], launchpad: [174, 424], billboard: [206, 267], signpost: [129, 199], mailbox: [51, 88],
  wall: [404, WALL_ROWS], wallS: [404, 147], cloud1: [141, 75], cloud2: [161, 77], cloud3: [194, 70], cloud4: [137, 64], sun: [85, 87], tree1: [98, 103], tree2: [72, 101],
  tree3: [82, 90], pine: [85, 118], bush: [64, 63], lamp: [24, 97], bench: [99, 49], flag: [50, 96], windsock: [50, 78], gull: [66, 82],
  dock: [200, 60], water: [491, 56], hangar: [400, 267], board: [190, 173], claw: [92, 179], booth: [150, 145], dish: [249, 85], sailboat: [93, 104],
  exchange: [330, 323], museum: [380, 200], store: [190, 159], station: [72, 300],
};
export const TICKER = { x: 20 / 330, y: 135 / 323, w: 291 / 330, h: 21 / 323 };
const DOM = ["wall", "wallS", "hangar", "board", "claw", "booth", "sailboat", "exchange", "museum", "store", "station"];
export const HANGAR_DOOR = { x: 117 / 400, y: 147 / 267, w: 166 / 400, h: 116 / 267, floor: 251 / 267 };
export const FACE = { x: 2 / 404, y: (13 + TALL - UP_ROWS) / WALL_ROWS, w: 400 / 404, h: (129 + UP_ROWS) / WALL_ROWS };
const FACE_S = { x: 2 / 404, y: 13 / 147, w: 400 / 404, h: 129 / 147 };
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
  images = Promise.all(Object.keys(SPR).filter((n) => !DOM.includes(n)).map((n) => new Promise((res) => {
    const im = new Image();
    im.src = `/assets/map/${n}.webp`;
    im.decode().then(() => { out[n] = im; res(); }, () => res());
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

function land(V, H) {
  const W = 3 * V, s = Math.min(H / 870, V / 1500);
  const at = (name, fx, fy, k = 1) => sprite(name, fx * V, fy * H, s * k);
  const places = {
    reviews: at("billboard", 0.105, 0.928, 0.8), printing: at("workshop", 0.28, 0.928, 0.86), games: at("arcade", 0.475, 0.928, 0.82),
    software: at("lab", 0.665, 0.928, 0.86), rockets: at("launchpad", 0.872, 0.928, 0.8), about: at("signpost", 0.07, 0.716, 0.62), guestbook: at("mailbox", 0.19, 0.72),
    hangar: at("hangar", 1.25, 0.712, 0.95), board: at("board", 1.59, 0.712, 0.82), claw: at("claw", 1.715, 0.712, 0.95), booth: at("booth", 1.855, 0.712, 0.95),
    exchange: at("exchange", 2.2, 0.712, 0.95), museum: at("museum", 2.49, 0.712, 0.95), store: at("store", 2.725, 0.712, 0.9), coaster: at("station", 2.885, 0.712, 0.95),
  };
  const wallTop = 0.17 * H, wallBase = 0.585 * H, wk = (wallBase - wallTop) / WALL_ROWS;
  const wall = { sprite: "wall", x: 0.012 * V, y: wallTop, w: 404 * wk, h: WALL_ROWS * wk, k: wk };
  const path = withLengths(spline([[-0.02, 0.742], [0.1, 0.74], [0.2, 0.737], [0.3, 0.741], [0.4, 0.743], [0.5, 0.739], [0.6, 0.742], [0.7, 0.74],
    [0.8, 0.743], [0.9, 0.744], [1, 0.742], [1.1, 0.745], [1.2, 0.741], [1.3, 0.744], [1.4, 0.74], [1.5, 0.743], [1.6, 0.741], [1.7, 0.744], [1.8, 0.74],
    [1.9, 0.743], [2, 0.742], [2.1, 0.744], [2.2, 0.741], [2.3, 0.743], [2.4, 0.74], [2.5, 0.743], [2.6, 0.741], [2.7, 0.744], [2.8, 0.741], [2.9, 0.743],
    [3.02, 0.742]].map(([x, y]) => [x * V, y * H]), 12));
  const props = [
    at("windsock", 0.952, 0.93, 0.9), at("tree1", 0.99, 0.935, 0.9), at("tree2", 1.0, 0.716, 0.8), at("bush", 0.36, 0.938, 0.7),
    at("bush", 0.808, 0.938, 0.6), at("bench", 0.43, 0.716, 0.7),
    at("pine", 1.075, 0.712, 0.8), at("dish", 1.455, 0.704, 0.75), at("lamp", 1.655, 0.716), at("lamp", 1.778, 0.716),
    at("bush", 1.93, 0.714, 0.75), at("tree1", 1.975, 0.715, 0.9),
    at("pine", 2.035, 0.712, 0.75), at("lamp", 2.075, 0.716), at("lamp", 2.335, 0.716), at("bush", 2.355, 0.714, 0.6), at("lamp", 2.645, 0.716),
    at("lamp", 2.81, 0.716), at("tree3", 2.97, 0.714, 0.85),
  ];
  return finish({
    mode: "land", V, W, H, s, k: Math.max(2, Math.round(3 * s)), horizon: 0.47 * H, river: [0.932 * H, H], places, mural: wall, path, pathWidth: 32 * s, props,
    sun: at("sun", 0.6, 0.12, 1.1), clouds: [at("cloud3", 0.43, 0.15), at("cloud2", 0.78, 0.125, 0.8), at("cloud4", 0.2, 0.1, 0.5), at("cloud1", 0.62, 0.165, 0.45),
      at("cloud1", 0.97, 0.085, 0.4), at("cloud2", 1.18, 0.155, 0.85), at("cloud4", 1.5, 0.11, 0.5), at("cloud3", 1.78, 0.135, 0.9), at("cloud1", 1.95, 0.08, 0.4),
      at("cloud4", 2.15, 0.16, 0.45), at("cloud1", 2.7, 0.1, 0.4)],
    console: box(0.775 * V, 0.928 * H, 56 * s, 64 * s), garden: { x: 0.235 * V, y: 0.632 * H, w: 0.16 * V, h: 0.078 * H },
    river_props: [at("dock", 0.37, 0.975, 0.95)], boats: [at("sailboat", 1.52, 0.985, 0.8), at("sailboat", 2.62, 0.99, 0.65)], gull: at("gull", 0.955, 0.995, 0.64),
    kayaks: [kayak(0.48 * V, 0.975 * H, s * 1.15), kayak(0.585 * V, 0.98 * H, s * 1.15)],
    spurDown: [[0.372, 0.8], [0.371, 0.86], [0.37, 0.905]].map(([x, y]) => [x * V, y * H]), lane: [0.16 * V, 0.88 * V], person: 92 * s, speed: 120 * s,
    sky: { x: 2.02 * V, y: 0.045 * H, w: 0.96 * V, h: 0.37 * H },
  });
}

function tall(V) {
  const f = V / 390, s = 0.7 * f, X = (x) => x * f, Y = (y) => y * f;
  const at = (name, x, y, k = 1) => sprite(name, X(x), Y(y), s * k);
  const places = {
    about: at("signpost", 300, 610), rockets: at("launchpad", 80, 900), printing: at("workshop", 280, 1140), games: at("arcade", 118, 1440),
    software: at("lab", 285, 1720), reviews: at("billboard", 100, 1990), guestbook: at("mailbox", 300, 2110),
    hangar: at("hangar", 585, 800, 0.95), board: at("board", 505, 1100, 0.85), claw: at("claw", 662, 1400, 0.95), booth: at("booth", 522, 1700, 0.95),
    coaster: at("station", 1062, 585, 0.95), exchange: at("exchange", 960, 995, 0.95), museum: at("museum", 985, 1335, 0.95), store: at("store", 975, 1655, 0.95),
  };
  const wall = sprite("wallS", X(230), Y(2330), X(320) / 404);
  const path = withLengths(spline([[195, 478], [186, 560], [186, 650], [200, 760], [204, 860], [188, 920], [140, 932], [90, 935], [64, 960], [62, 1040],
    [66, 1130], [90, 1166], [180, 1172], [280, 1172], [312, 1196], [318, 1300], [316, 1420], [290, 1466], [200, 1472], [100, 1472], [70, 1500], [64, 1600],
    [68, 1700], [92, 1746], [200, 1752], [282, 1752], [306, 1780], [310, 1880], [302, 1980], [270, 2018], [180, 2022], [100, 2024], [72, 2050], [76, 2110],
    [110, 2140], [200, 2146], [300, 2146], [360, 2150], [405, 2152], [480, 2152], [600, 2150], [690, 2146], [714, 2120], [716, 2060], [700, 2028],
    [640, 2022], [540, 2022], [470, 2020], [440, 1995], [436, 1900], [436, 1790], [452, 1745], [520, 1733], [620, 1732], [690, 1730], [714, 1705],
    [716, 1600], [716, 1490], [700, 1445], [640, 1434], [540, 1432], [470, 1430], [440, 1405], [436, 1300], [436, 1190], [452, 1146], [520, 1134],
    [620, 1132], [690, 1130], [714, 1105], [716, 1000], [716, 890], [700, 846], [640, 834], [585, 832], [520, 832], [468, 834], [442, 800], [436, 700],
    [446, 618], [490, 590], [580, 584], [700, 584], [800, 586], [900, 592], [1000, 594], [1090, 600], [1128, 640], [1134, 760], [1130, 900], [1105, 992],
    [1000, 1002], [900, 1004], [842, 1030], [834, 1150], [836, 1290], [860, 1336], [960, 1342], [1060, 1342], [1118, 1370], [1126, 1500], [1124, 1610],
    [1100, 1656], [1000, 1662], [900, 1662], [846, 1690], [838, 1800], [840, 1930], [870, 1975], [980, 1982], [1080, 1984], [1130, 2000]].map(([x, y]) => [X(x), Y(y)]), 10));
  const props = [
    at("bush", 360, 900, 0.8), at("lamp", 150, 1015), at("windsock", 368, 1002, 0.9), at("lamp", 262, 1430), at("bush", 365, 1300, 0.7), at("tree3", 145, 1650, 0.8),
    at("lamp", 115, 1712), at("pine", 235, 1860, 0.8), at("bench", 230, 1940, 0.75), at("lamp", 360, 1930), at("bush", 180, 2110, 0.85), at("tree1", 240, 2100, 0.7),
    at("lamp", 452, 815), at("pine", 640, 1085, 0.8), at("lamp", 735, 1115), at("bench", 520, 1395, 0.7), at("lamp", 452, 1418), at("tree1", 655, 1700, 0.75),
    at("bush", 740, 1720, 0.6), at("dish", 640, 1995, 0.62), at("lamp", 452, 2008), at("bush", 520, 2120, 0.75), at("tree3", 650, 2115, 0.7),
    at("tree2", 760, 1300, 0.7),
    at("lamp", 820, 980), at("lamp", 1100, 1320), at("bush", 830, 1320, 0.7), at("pine", 1110, 1180, 0.75), at("lamp", 860, 1640), at("tree1", 1110, 1640, 0.75),
    at("bench", 960, 1960, 0.75), at("lamp", 1080, 1965), at("tree3", 880, 2120, 0.75), at("bush", 1050, 2140, 0.8), at("pine", 1120, 2232, 0.7),
  ];
  return finish({
    mode: "tall", V, W: 3 * V, H: Y(2430), s, k: 2, horizon: Y(478), river: [Y(2340), Y(2430)], places, mural: wall, path, pathWidth: 30 * s, props,
    sun: at("sun", 330, 410, 1.1), clouds: [at("cloud3", 92, 395, 0.7), at("cloud1", 250, 345, 0.6), at("cloud4", 330, 452, 0.4), at("cloud2", 500, 370, 0.6),
      at("cloud4", 700, 420, 0.45), at("cloud2", 1120, 455, 0.5)],
    console: box(X(154), Y(905), 36 * s, 42 * s), garden: { x: X(234), y: Y(690), w: X(148), h: Y(140) },
    river_props: [at("dock", 78, 2398, 0.8)], boats: [at("sailboat", 600, 2420, 0.6), at("sailboat", 1000, 2424, 0.5)], gull: at("gull", 372, 2432, 0.6),
    kayaks: [kayak(X(193), Y(2414), s * 1.2), kayak(X(302), Y(2420), s * 1.2)],
    spurDown: [[40, 2200], [37, 2290], [34, 2350]].map(([x, y]) => [X(x), Y(y)]), lane: [X(80), X(360)], person: 64 * f, speed: 80 * f,
    sky: { x: X(792), y: Y(40), w: X(372), h: Y(330) },
  });
}

function box(cx, base, w, h) { return { x: cx - w / 2, y: base - h, w, h, k: w / 40 }; }

function kayak(cx, base, scale) {
  const [w, h] = KAYAK;
  return { x: cx - (w * scale) / 2, y: base - h * scale, w: w * scale, h: h * scale, k: scale };
}

function trip(g) {
  let best = 0;
  const [sx, sy] = g.spurDown[0], dist = (q) => Math.hypot(q[0] - sx, q[1] - sy);
  g.path.pts.forEach((q, i) => { if (dist(q) < dist(g.path.pts[best])) best = i; });
  const dock = g.river_props[0], deck = dock.y + dock.h * 0.38, near = 0.08, far = 1 - near;
  const top = g.path.pts[best];
  const down = [top, ...g.spurDown, [dock.x + dock.w * near, deck]];
  g.trip = { s: g.path.len[best], down, walk: [[dock.x + dock.w * near, deck], [dock.x + dock.w * far, deck]], deck };
  const land = g.mode === "land", stand = land ? [dock.x + dock.w * near, deck] : [dock.x + dock.w * far, deck], side = land ? -1 : 1;
  g.fish = { stand, side, bob: [stand[0] + side * g.person * (land ? 1.35 : 0.95), land ? (g.river[0] + g.river[1]) / 2 + g.person * 0.08 : g.river[0] + (dock.y + dock.h * 0.3 - g.river[0]) * 0.7], route: land ? down : down.concat([[dock.x + dock.w * far, deck]]) };
  g.spurs = [down];
}

function finish(g) {
  const F = g.mural.sprite === "wallS" ? FACE_S : FACE;
  g.short = g.mural.sprite === "wallS";
  g.face = { x: g.mural.x + F.x * g.mural.w, y: g.mural.y + F.y * g.mural.h, w: F.w * g.mural.w, h: F.h * g.mural.h };
  g.run = { x: g.mural.x, y: g.mural.y, w: Math.max(g.mural.w, (g.runTo || g.W) - g.mural.x), h: g.mural.h, k: g.mural.k };
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

function plan(g, img) {
  if (g.plan) return g.plan;
  const r = rng(g.mode === "tall" ? 4421 : 8807), trees = [], rocks = [];
  const names = ["tree1", "tree2", "tree3", "tree1", "pine", "tree3"];
  [[0.5, 0.42, 26], [0.62, 0.22, 34]].forEach(([scale, shade, step], row) => {
    for (let x = -30 + row * 13; x < g.W + 40; x += (step + r() * 14) * g.s * 1.6) {
      const im = img[names[Math.floor(r() * names.length)]], k = g.s * scale * (0.85 + r() * 0.3), base = g.horizon + (row ? 4 : -6) * g.s + r() * 6 * g.s;
      if (!im) continue;
      const w = im.naturalWidth * k, h = im.naturalHeight * k;
      trees.push({ im: darker(im, shade), x: x - w / 2, y: base - h, w, h });
    }
  });
  for (let x = -10; x < g.W + 10; x += (18 + r() * 34) * g.s) {
    const rw = (10 + r() * 16) * g.s;
    rocks.push({ x, rw, rh: rw * (0.45 + r() * 0.2), y: g.river[0] + r() * 4 * g.s, moss: r() < 0.5 });
  }
  return (g.plan = { trees, rocks });
}

function ground(c, g, r, x0, x1) {
  const k = g.k, top = Math.round(g.horizon), bot = Math.round(g.river[0]), span = x1 - x0;
  const gr = c.createLinearGradient(0, top, 0, bot);
  gr.addColorStop(0, GRASS.top); gr.addColorStop(1, GRASS.bottom);
  c.fillStyle = gr;
  c.fillRect(x0, top, span, bot - top + 1);
  const mask = document.createElement("canvas");
  mask.width = Math.ceil(span / k) + 1; mask.height = Math.ceil(g.H / k);
  const m = mask.getContext("2d");
  m.lineCap = "round"; m.lineJoin = "round";
  const lines = [[g.path.pts, 1], ...(g.spurs || []).map((sp) => [sp, 0.55])];
  const trace = (pts) => { m.beginPath(); pts.forEach(([x, y], i) => (i ? m.lineTo((x - x0) / k, y / k) : m.moveTo((x - x0) / k, y / k))); };
  lines.forEach(([pts, w]) => { trace(pts); m.strokeStyle = PATH.edge; m.lineWidth = (g.pathWidth * w + 4 * g.s) / k; m.stroke(); });
  lines.forEach(([pts, w]) => { trace(pts); m.strokeStyle = PATH.base; m.lineWidth = (g.pathWidth * w) / k; m.stroke(); });
  lines.forEach(([pts, w]) => { trace(pts); m.strokeStyle = PATH.light; m.lineWidth = (g.pathWidth * w * 0.35) / k; m.stroke(); });
  const md = m.getImageData(0, 0, mask.width, mask.height).data;
  const onPath = (x, y) => md[(Math.floor(y / k) * mask.width + Math.floor((x - x0) / k)) * 4 + 3] > 0;
  const px = (x, y, col, w = 1, h = 1) => { c.fillStyle = col; c.fillRect(Math.floor(x / k) * k, Math.floor(y / k) * k, w * k, h * k); };
  const area = span * (bot - top);
  for (let i = 0; i < area / (k * k * 26); i++) {
    const x = x0 + r() * span, y = top + 6 + r() * (bot - top - 6);
    if (onPath(x, y)) continue;
    const t = r();
    if (t < 0.55) { px(x, y, GRASS.dark, 1, 2); px(x + k, y + k, GRASS.dark); }
    else if (t < 0.85) px(x, y, GRASS.light, 1, 1);
    else px(x, y, GRASS.darker, 2, 1);
  }
  for (let i = 0; i < area / (k * k * 520); i++) {
    const x = x0 + r() * span, y = top + 14 + r() * (bot - top - 20);
    if (onPath(x, y) || onPath(x + 3 * k, y)) continue;
    const col = FLOWERS[Math.floor(r() * FLOWERS.length)];
    px(x - k, y, col); px(x + k, y, col); px(x, y - k, col); px(x, y + k, col); px(x, y, "#ffd23a"); px(x, y + 2 * k, GRASS.darker);
  }
  c.imageSmoothingEnabled = false;
  c.drawImage(mask, x0, 0, mask.width * k, mask.height * k);
  c.imageSmoothingEnabled = true;
  for (let i = 0; i < (g.path.total * 1.3 * (span / g.W)) / (6 * k); i++) {
    const x = x0 + r() * span, y = top + r() * (bot - top);
    if (onPath(x, y) && onPath(x + 2 * k, y) && onPath(x - 2 * k, y)) px(x, y, r() < 0.7 ? PATH.pebble : PATH.light, r() < 0.5 ? 2 : 1, 1);
  }
}

function river(c, g, img, x0, x1) {
  const [top, bot] = g.river, h = bot - top, k = g.k;
  c.fillStyle = "#2f74d6";
  c.fillRect(x0, top, x1 - x0, h);
  const im = img.water;
  if (im) {
    const cut = 4, sw = im.naturalWidth - cut * 2, sc = h / im.naturalHeight, tw = sw * sc;
    for (let x = 0, i = 0; x < x1; x += tw - 1, i++) {
      if (x + tw < x0) continue;
      c.save();
      if (i % 2) { c.translate(x + tw, top); c.scale(-1, 1); c.drawImage(im, cut, 0, sw, im.naturalHeight, 0, 0, tw, h); }
      else c.drawImage(im, cut, 0, sw, im.naturalHeight, x, top, tw, h);
      c.restore();
    }
  }
  c.fillStyle = GRASS.bank;
  c.fillRect(x0, top - k, x1 - x0, k * 2);
  for (const { x, y, rw, rh, moss } of g.plan.rocks) {
    if (x + rw < x0 || x - rw > x1) continue;
    c.fillStyle = "#6f757d"; c.beginPath(); c.ellipse(x, y, rw / 2, rh / 2, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#9aa1a9"; c.beginPath(); c.ellipse(x - rw * 0.08, y - rh * 0.12, rw * 0.38, rh * 0.32, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#c3c8ce"; c.fillRect(Math.floor((x - rw * 0.22) / k) * k, Math.floor((y - rh * 0.3) / k) * k, k, k);
    if (moss) { c.fillStyle = GRASS.dark; c.fillRect(Math.floor((x + rw * 0.3) / k) * k, Math.floor((y - rh * 0.6) / k) * k, k, 2 * k); }
  }
}

async function paintHalf(g, img, half, dpr, pause) {
  const x0 = half * g.V, x1 = x0 + g.V, off = document.createElement("canvas");
  off.width = Math.round(g.V * dpr); off.height = Math.round(g.H * dpr);
  const c = off.getContext("2d");
  c.setTransform(dpr, 0, 0, dpr, -x0 * dpr, 0);
  c.imageSmoothingQuality = "high";
  const r = rng((g.mode === "tall" ? 977 : 5381) + half * 7919);
  const band = g.horizon / SKY.length;
  SKY.forEach((col, i) => { c.fillStyle = col; c.fillRect(x0, Math.floor(i * band), g.V, Math.ceil(band) + 1); });
  const k = g.k;
  for (let i = 1; i < SKY.length; i++) {
    const y = Math.floor(i * band);
    c.fillStyle = SKY[i - 1];
    for (let x = x0 + (i % 2) * k; x < x1; x += 2 * k) c.fillRect(x, y, k, k);
  }
  const hit = (o) => o.x < x1 && o.x + o.w > x0;
  const draw = (o) => { const im = img[o.sprite]; if (im && hit(o)) c.drawImage(im, o.x, o.y, o.w, o.h); };
  draw(g.sun);
  c.fillStyle = "#7fb98a";
  c.beginPath(); c.moveTo(x0, g.horizon);
  for (let x = x0; x <= x1 + 8; x += 8) c.lineTo(x, g.horizon - (18 + Math.sin(x / g.V * 7) * 10 + Math.sin(x / g.V * 23) * 4) * g.s);
  c.lineTo(x1 + 8, g.horizon); c.closePath(); c.fill();
  g.plan.trees.forEach((t) => { if (hit(t)) c.drawImage(t.im, t.x, t.y, t.w, t.h); });
  await pause();
  ground(c, g, r, x0, x1);
  await pause();
  river(c, g, img, x0, x1);
  g.river_props.forEach(draw);
  g.props.slice().sort((a, b) => a.y + a.h - (b.y + b.h)).forEach(draw);
  return off;
}

function commit(canvas, off, g, half) {
  canvas.width = off.width; canvas.height = off.height;
  canvas.style.width = g.V + "px"; canvas.style.height = g.H + "px";
  canvas.style.left = half * g.V + "px";
  canvas.getContext("2d").drawImage(off, 0, 0);
}

export async function drawMap(canvases, g, img, current = () => true) {
  const dpr = Math.min(2, window.devicePixelRatio || 1), pause = () => new Promise((r) => setTimeout(r));
  plan(g, img);
  const left = await paintHalf(g, img, 0, dpr, pause);
  if (!current()) return;
  commit(canvases[0], left, g, 0);
  const rest = async (half) => {
    if (!current() || !canvases[half]) return;
    const off = await paintHalf(g, img, half, dpr, pause);
    if (current()) commit(canvases[half], off, g, half);
    if (half < 2) (window.requestIdleCallback || ((f) => setTimeout(f, 200)))(() => rest(half + 1), { timeout: 900 });
  };
  (window.requestIdleCallback || ((f) => setTimeout(f, 200)))(() => rest(1), { timeout: 700 });
}

const WALL_H = 147;
const wallCache = new Map();

const hx = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const pal = (list) => list.map(hx);
const tn = (rgb, f) => rgb.map((v) => Math.max(0, Math.min(255, Math.round(f >= 0 ? v + (255 - v) * f : v * (1 + f)))));
const mixc = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const md = (n, m) => ((n % m) + m) % m;
const cl = (v, a, b) => Math.max(a, Math.min(b, v));
const nz = (x, y, k) => {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(k, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
const sn = (x, y, s, k) => {
  const fx = x / s, fy = y / s, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0, u = tx * tx * (3 - 2 * tx), v = ty * ty * (3 - 2 * ty);
  const a = nz(x0, y0, k), b = nz(x0 + 1, y0, k), c = nz(x0, y0 + 1, k), d = nz(x0 + 1, y0 + 1, k);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};
const fbm = (x, y, s, k) => sn(x, y, s, k) * 0.6 + sn(x, y, s / 2, k + 7) * 0.3 + sn(x, y, s / 4, k + 13) * 0.1;

function bricks(o) {
  const B = pal(o.bricks), Mo = pal(o.mortar), ch = o.chip ? pal(o.chip) : null;
  return (x, y) => {
    const course = Math.floor((y - 11) / o.h), row = md(y - 11, o.h);
    if (row === 0) return Mo[nz(x, y, 4) < 0.15 ? 1 : 0];
    const off = course % 2 ? o.w / 2 : 0, bx = md(x - 2 + off, o.w), bi = Math.floor((x - 2 + off) / o.w), by = row - 1;
    if (bx === o.w - 1) return Mo[nz(x, y, 4) < 0.15 ? 1 : 0];
    let base = B[Math.floor(nz(bi, course, o.k) * B.length)];
    if (ch && sn(x, y, 4, o.k + 1) > 0.83 && nz(bi, course, o.k + 2) < 0.3) base = ch[Math.floor(nz(x, y, 6) * ch.length)];
    let f = by === 0 ? 0.14 : by === o.h - 2 ? -0.22 : 0;
    f += bx === 0 ? 0.05 : bx === o.w - 2 ? -0.12 : 0;
    const r = nz(x, y, 3);
    f += r < 0.07 ? 0.07 : r < 0.14 ? -0.07 : 0;
    if (o.pits && nz(x, y, o.k + 3) < 0.07) f -= 0.2;
    return tn(base, f);
  };
}

function plaster(o) {
  const base = hx(o.base), crack = hx(o.crack), rim = hx(o.rim), under = bricks({ w: 16, h: 9, k: 7, bricks: ["#b9472b", "#c4512f", "#ad4127"], mortar: ["#d6a88a", "#c79a7c"] });
  return (x, y) => {
    const fall = fbm(x, y, 26, o.k);
    if (fall > o.fall + 0.03) return under(x, y);
    if (fall > o.fall) return rim;
    if (Math.abs(sn(x, y, 34, o.k + 1) - 0.5) < 0.016 && sn(x, y, 50, o.k + 2) > 0.62) return crack;
    return tn(base, (fbm(x, y, 10, o.k + 3) - 0.5) * o.tex + (nz(x, y, o.k + 4) - 0.5) * o.tex * 0.45);
  };
}

const MAT = {
  whitebrick: () => bricks({ w: 16, h: 9, k: 21, bricks: ["#ecebe5", "#f3f2ee", "#e3e1da", "#f7f6f2", "#e8e6df"], mortar: ["#c4c0b6", "#b3afa5"], chip: ["#b9472b", "#a63e26", "#c4512f"] }),
  darkbrick: () => bricks({ w: 18, h: 9, k: 31, bricks: ["#4b2d2b", "#5b3631", "#41292a", "#633c33", "#523129", "#3a2424"], mortar: ["#3b3633", "#2f2b29"] }),
  yellowbrick: () => bricks({ w: 16, h: 9, k: 41, bricks: ["#d6b26a", "#cca45c", "#e0bf7c", "#c39a52", "#d9b673"], mortar: ["#a99c88", "#988b77"] }),
  cinder: () => bricks({ w: 32, h: 16, k: 71, bricks: ["#b3b0aa", "#aaa7a1", "#bcb9b3", "#a5a29c"], mortar: ["#8d8a84", "#7f7c77"], pits: true }),
  concrete: () => {
    const base = hx("#a7a49e"), seam = hx("#7d7a75"), hole = hx("#4a4744"), stain = hx("#85827c");
    return (x, y) => {
      const px = md(x - 2, 80), py = md(y - 11, 42), pi = Math.floor((x - 2) / 80), pj = Math.floor((y - 11) / 42);
      if (px === 0 || py === 0) return seam;
      const tx = md(px, 20), ty = md(py, 21);
      if ((tx === 10 || tx === 11) && (ty === 10 || ty === 11)) return hole;
      let col = tn(base, (fbm(x, y, 16, 51) - 0.5) * 0.22 + (nz(x, y, 52) - 0.5) * 0.08 + (nz(pi, pj, 53) - 0.5) * 0.08 + (px === 1 || py === 1 ? 0.08 : 0));
      if (tx >= 9 && tx <= 12 && ty > 11 && nz(Math.floor((x - 2) / 20), Math.floor((y - 11) / 21), 54) < 0.45) col = mixc(col, stain, 0.4 * (1 - (ty - 11) / 10));
      return col;
    };
  },
  plaster: () => plaster({ base: "#e6dbc3", crack: "#8c7f66", rim: "#a8987a", fall: 0.73, tex: 0.16, k: 61 }),
  whitewall: () => plaster({ base: "#f4f3ef", crack: "#a9a7a1", rim: "#c9c6bf", fall: 0.8, tex: 0.06, k: 251 }),
  pinkwall: () => plaster({ base: "#e9b8b4", crack: "#9a6f6b", rim: "#c48e89", fall: 0.76, tex: 0.14, k: 261 }),
  stone: () => {
    const S = pal(["#8d8a84", "#a29d94", "#7f7b76", "#b2aa9c", "#968b7c", "#6f6c69", "#a89a86"]), mort = pal(["#bdb4a5", "#aaa192"]);
    return (x, y) => {
      const g = 13, gx = Math.floor(x / g), gy = Math.floor(y / g);
      let d1 = 1e9, d2 = 1e9, id = 0, ox = 0, oy = 0;
      for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
        const ix = gx + i, iy = gy + j, sx = (ix + 0.15 + nz(ix, iy, 81) * 0.7) * g, sy = (iy + 0.15 + nz(ix, iy, 82) * 0.7) * g, dx = x - sx, dy = (y - sy) * 1.25, d = dx * dx + dy * dy;
        if (d < d1) { d2 = d1; d1 = d; id = ix * 7919 + iy; ox = dx; oy = dy; } else if (d < d2) d2 = d;
      }
      const edge = Math.sqrt(d2) - Math.sqrt(d1);
      if (edge < 1.6) return mort[nz(x, y, 83) < 0.2 ? 1 : 0];
      return tn(S[Math.floor(nz(id, 0, 84) * S.length)], cl((-(ox + oy) / (g * 1.2)) * 0.18, -0.2, 0.15) + (edge < 2.6 ? -0.12 : 0) + (nz(x, y, 85) - 0.5) * 0.1);
    };
  },
  sandstone: () => {
    const P = pal(["#d9c08c", "#d1b57d", "#e0c898", "#c9ad74", "#dcc28e"]), mort = hx("#bfa97f");
    return (x, y) => {
      const w = 42, h = 21, j = Math.floor((y - 11) / h), ty = md(y - 11, h), off = j % 2 ? w / 2 : 0, tx = md(x - 2 + off, w), i = Math.floor((x - 2 + off) / w);
      if (ty === 0 || tx === 0) return mort;
      let f = Math.sin((y + sn(x, y, 30, 202) * 8) * 0.7) * 0.05 + (nz(x, y, 203) - 0.5) * 0.1;
      f += ty === 1 ? 0.1 : ty === h - 1 ? -0.15 : 0;
      f += tx === 1 ? 0.05 : tx === w - 1 ? -0.12 : 0;
      if (nz(x, y, 204) < 0.03) f -= 0.2;
      return tn(P[Math.floor(nz(i, j, 201) * P.length)], f);
    };
  },
  marble: () => {
    const base = hx("#ebe8e3"), vein = hx("#8e8c93"), vein2 = hx("#c6c3c3"), seam = hx("#a9a6a1");
    return (x, y) => {
      const sx = md(x - 2, 100), sy = md(y - 11, 63);
      if (sx === 0 || sy === 0) return seam;
      const i = Math.floor((x - 2) / 100), j = Math.floor((y - 11) / 63), t = fbm(x, y, 60, 161 + i * 3 + j) * 1.8 + (x * 0.45 + y) * 0.011, v1 = Math.abs(md(t, 1) - 0.5);
      const t2 = fbm(x, y, 30, 163) * 2.4 - (x - y) * 0.006, v2 = Math.abs(md(t2, 1) - 0.5);
      let col = tn(base, (sn(x, y, 25, 162) - 0.5) * 0.06);
      if (v2 < 0.035) col = mixc(col, vein2, cl(1 - v2 / 0.035, 0, 1) * 0.55);
      if (v1 < 0.045) col = mixc(col, vein, cl(1 - v1 / 0.045, 0, 1) * 0.75);
      return col;
    };
  },
  planks: () => {
    const P = pal(["#9b6a3e", "#a77446", "#8e5f37", "#b07c4c", "#976640"]), gap = hx("#2a1b10"), knot = hx("#5a3b20"), nail = hx("#3b3b3b");
    return (x, y) => {
      const w = 14, i = Math.floor((x - 2) / w), px = md(x - 2, w);
      if (px === 0) return gap;
      if ((y === 22 || y === 120) && (px === 4 || px === w - 4)) return nail;
      const kx = 3 + Math.floor(nz(i, 1, 92) * (w - 6)), ky = 24 + Math.floor(nz(i, 2, 93) * 96), kd = Math.hypot((px - kx) * 1.3, (y - ky) * 0.8);
      if (kd < 1.6) return knot;
      let f = (sn(px * 3 + i * 50, y, 6, 94) - 0.5) * 0.22 + (px === 1 ? 0.1 : px === w - 1 ? -0.18 : 0);
      if (md(px * 7 + Math.floor(sn(i * 40 + px, y, 30, 95) * 6), 5) === 0) f -= 0.1;
      if (kd < 4) f -= 0.12 * (1 - kd / 4);
      if (y < 18) f += 0.05;
      return tn(P[Math.floor(nz(i, 0, 91) * P.length)], f);
    };
  },
  plywood: () => {
    const base = hx("#cfaa72"), seam = hx("#6e5534"), screw = hx("#4c3c28");
    return (x, y) => {
      const px = md(x - 2, 96), i = Math.floor((x - 2) / 96);
      if (px === 0) return seam;
      if (px === 1) return tn(base, 0.12);
      if ((px === 4 || px === 92) && md(y - 15, 24) === 0) return screw;
      const band = Math.sin((y + sn(x, y, 22, 101 + i) * 26 + px * 0.05) / 3.1) * 0.5 + 0.5;
      return tn(base, (band - 0.5) * 0.14 + (sn(x, y, 40, 102) - 0.5) * 0.12 + (nz(x, y, 103) - 0.5) * 0.05 + (nz(i, 0, 104) - 0.5) * 0.08);
    };
  },
  logs: () => {
    const A = hx("#8b5a32"), B = hx("#9e6a3d"), chink = hx("#d9c9a8"), dark = hx("#3b2515");
    return (x, y) => {
      const h = 14, r = md(y - 11, h), j = Math.floor((y - 11) / h);
      if (r === 0) return chink;
      const sx = x + Math.floor(nz(j, 0, 112) * 90), kx = md(sx, 90), kd = Math.hypot((kx - 45) * 0.75, (r - h / 2) * 1.5);
      if (kd < 3.2 && nz(Math.floor(sx / 90), j, 113) < 0.6) return kd > 2 ? dark : tn(A, -0.3);
      const t = (r - 0.5) / (h - 1);
      const f = (Math.cos((t - 0.35) * Math.PI) - 0.6) * 0.35 + (r === 1 ? -0.25 : r === h - 1 ? -0.35 : 0) + (sn(x, y * 4, 9, 111 + j) - 0.5) * 0.18;
      return tn(mixc(A, B, nz(j, 1, 114)), f);
    };
  },
  corrugated: () => {
    const base = hx("#9aa3a8"), rust = pal(["#8a4a22", "#a65e2c", "#6e3a1b"]), PROF = [0.22, 0.12, 0.02, -0.06, -0.16, -0.24, -0.1, 0.06], rivet = hx("#5a5f63"), shine = hx("#d6dadc");
    return (x, y) => {
      const sx = md(x - 2, 120), si = Math.floor((x - 2) / 120), k = md(x - 2, 8), ridge = Math.floor((x - 2) / 8), on = k === 0 && md(ridge, 3) === 0, ry = md(y - 16, 40);
      if (on && ry === 0) return rivet;
      if (on && ry === 39) return shine;
      let col = tn(base, PROF[k] + (nz(si, 0, 121) - 0.5) * 0.08 + (sn(x, y, 14, 122) - 0.5) * 0.08);
      if (sx === 119) col = tn(base, -0.35);
      const rb = fbm(x, y, 18, 123);
      let ra = rb > 0.67 ? cl((rb - 0.67) * 4.5, 0, 0.7) : 0;
      if (md(ridge, 3) === 0 && k <= 1 && ry > 0 && ry < 6 + nz(ridge, Math.floor((y - 16) / 40), 124) * 22) ra = Math.max(ra, 0.55 * (1 - ry / 28));
      return ra > 0 ? mixc(col, tn(rust[Math.floor(nz(x, y, 125) * 3)], PROF[k] * 0.5), ra) : col;
    };
  },
  shutter: () => {
    const base = hx("#8e979b"), bar = hx("#6d7478"), ROWS = [0.2, 0.1, 0.02, 0, -0.08, -0.45], BAR = [0.18, 0.08, 0, -0.04, -0.08, -0.16, -0.26, -0.4, -0.5];
    return (x, y) => {
      if (y >= 129) { const h = md(x - 2, 400); return (h >= 188 && h <= 212 && y >= 131 && y <= 133) ? hx("#2f3437") : tn(bar, BAR[y - 129] + (nz(x, y, 134) - 0.5) * 0.05); }
      let col = tn(base, ROWS[md(y - 11, 6)] + (sn(x, y, 30, 131) - 0.5) * 0.08 + (nz(x, y, 132) - 0.5) * 0.04);
      if (fbm(x, y, 12, 133) > 0.7) col = tn(col, -0.12);
      return col;
    };
  },
  diamond: () => {
    const base = hx("#a9afb4"), seam = hx("#6c7175"), bolt = hx("#5c6165");
    return (x, y) => {
      const sx = md(x - 2, 130);
      if (sx === 0) return seam;
      if ((sx === 3 || sx === 127) && md(y - 14, 20) === 0) return bolt;
      const g = 10, cx = md(x - 2, g), cy = md(y - 11, g), odd = (Math.floor((x - 2) / g) + Math.floor((y - 11) / g)) % 2;
      const u = odd ? cx - cy : cx + cy - (g - 1), along = odd ? cx + cy - (g - 1) : cx - cy;
      let f = (sn(x, y, 20, 181) - 0.5) * 0.1 + (nz(x, y, 182) - 0.5) * 0.05;
      if (Math.abs(u) <= 1 && Math.abs(along) <= 4) f += u <= 0 ? 0.3 : -0.25;
      return tn(base, f);
    };
  },
  corten: () => {
    const P = pal(["#5e3119", "#743d1d", "#8b4a22", "#a3592a", "#b8693a"]), seam = hx("#3f2414");
    return (x, y) => {
      const sx = md(x - 2, 100), sy = md(y - 11, 63);
      if (sx === 0 || sy === 0) return seam;
      const k = cl(fbm(x, y, 16, 191) * 0.75 + fbm(x, y, 5, 192) * 0.45 - 0.1, 0, 0.999);
      let f = (nz(x, y, 193) - 0.5) * 0.12 + (sx === 1 || sy === 1 ? 0.12 : 0);
      if (sn(x, 0, 3, 194) > 0.7 && sy < 30 * sn(x, 0, 9, 195)) f -= 0.12;
      return tn(P[Math.floor(k * P.length)], f);
    };
  },
  tiles: () => {
    const base = hx("#f1f2ef"), grout = hx("#b8bbb9"), crack = hx("#8f9290");
    return (x, y) => {
      const s = 11, tx = md(x - 2, s), ty = md(y - 11, s), i = Math.floor((x - 2) / s), j = Math.floor((y - 11) / s);
      if (tx === s - 1 || ty === s - 1) return grout;
      if (nz(i, j, 142) < 0.012 && Math.abs(tx - ty) < 1) return crack;
      let f = (nz(i, j, 141) - 0.5) * 0.05 + (tx === 0 || ty === 0 ? 0.04 : 0) + (tx === s - 2 || ty === s - 2 ? -0.06 : 0) + (tx === 2 && ty === 2 ? 0.06 : 0);
      if (fbm(x, y, 20, 143) > 0.74) f -= 0.05;
      return tn(base, f);
    };
  },
  greentiles: () => {
    const P = pal(["#2f7d5b", "#2a7353", "#348663", "#2c7756"]), grout = hx("#d8d4c8");
    return (x, y) => {
      const w = 18, h = 9, j = Math.floor((y - 11) / h), ty = md(y - 11, h), off = j % 2 ? w / 2 : 0, tx = md(x - 2 + off, w), i = Math.floor((x - 2 + off) / w);
      if (ty === h - 1 || tx === w - 1) return grout;
      let f = ty === 0 ? 0.25 : ty === 1 ? 0.1 : ty === h - 2 ? -0.25 : 0;
      f += tx === 0 ? 0.15 : tx === w - 2 ? -0.18 : 0;
      if (ty === 2 && tx > 2 && tx < 7) f += 0.35;
      return tn(P[Math.floor(nz(i, j, 151) * P.length)], f + (nz(x, y, 152) - 0.5) * 0.04);
    };
  },
  glass: () => {
    const mort = hx("#d3d6d4"), base = hx("#a6c8d4");
    return (x, y) => {
      const s = 16, tx = md(x - 2, s), ty = md(y - 11, s);
      if (tx >= s - 2 || ty >= s - 2) return tn(mort, tx === s - 2 || ty === s - 2 ? -0.08 : 0);
      const cx = tx - 6.5, cy = ty - 6.5, r = Math.max(Math.abs(cx), Math.abs(cy));
      let f = (r > 6 ? 0.25 : r > 5 ? -0.1 : 0) + Math.sin((tx + ty) * 0.9) * 0.08 + Math.sin(tx * 1.7 - ty * 0.6) * 0.05;
      if (tx + ty < 6 && r > 3) f += 0.18;
      return tn(base, f);
    };
  },
  blackboard: () => {
    const base = hx("#2d4b3c"), frame = hx("#7a4e2a"), dust = hx("#6f8a7c");
    return (x, y) => {
      const px = md(x - 2, 400);
      if (y <= 15 || y >= 133 || px <= 3 || px >= 396) {
        const hi = y === 11 || px === 0 || (px === 396 && y > 15 && y < 133) || (y === 133 && px > 3 && px < 396), lo = y === 15 || y === 137 || px === 3 || px === 399;
        return tn(frame, hi ? 0.15 : lo ? -0.3 : (nz(x, y, 171) - 0.5) * 0.12);
      }
      const col = tn(base, (sn(x, y, 18, 172) - 0.5) * 0.12 + (nz(x, y, 173) - 0.5) * 0.05), s = fbm(x, y, 22, 174);
      return s > 0.66 ? mixc(col, dust, (s - 0.66) * 1.6) : col;
    };
  },
};
const MOSSY = new Set(["darkbrick", "yellowbrick", "cinder", "concrete", "stone", "sandstone", "planks", "logs"]);
export const WALL_KINDS = [
  ["brick", "Red brick"], ["whitebrick", "White brick"], ["darkbrick", "Dark brick"], ["yellowbrick", "Yellow brick"], ["cinder", "Cinder block"],
  ["concrete", "Concrete"], ["plaster", "Plaster"], ["whitewall", "White wall"], ["pinkwall", "Pink stucco"], ["stone", "Fieldstone"],
  ["sandstone", "Sandstone"], ["marble", "Marble"], ["planks", "Wood fence"], ["plywood", "Plywood"], ["logs", "Log wall"],
  ["corrugated", "Corrugated metal"], ["shutter", "Steel shutter"], ["diamond", "Diamond plate"], ["corten", "Rusty steel"],
  ["tiles", "White tiles"], ["greentiles", "Green tiles"], ["glass", "Glass blocks"], ["blackboard", "Blackboard"],
];
const matCache = new Map(), REDBRICK = bricks({ w: 16, h: 9, k: 7, bricks: ["#b9472b", "#c4512f", "#ad4127", "#c95b36", "#b44a2c", "#bf4e2e", "#a63e26"], mortar: ["#d6a88a", "#c79a7c"] });
const matOf = (id) => { if (!MAT[id]) return null; if (!matCache.has(id)) matCache.set(id, MAT[id]()); return matCache.get(id); };
let kinds = {}, mats = [], matsKey = "[]";
const kindAt = (x, y) => {
  if (y !== undefined) for (let i = mats.length - 1; i >= 0; i--) { const m = mats[i]; if (x >= m.x0 && x < m.x1 && y >= m.y0 && y < m.y1) return m.k === "brick" ? undefined : m.k; }
  return kinds[Math.max(0, Math.floor((x - 2) / 400))];
};
export function setWallMats(list) {
  const key = JSON.stringify(list);
  if (key === matsKey) return false;
  matsKey = key;
  mats = list.map((m) => ({ x0: 2 + m.x0 / 2.5, x1: 2 + m.x1 / 2.5, y0: 13 + m.y0 / (323 / 129), y1: 13 + m.y1 / (323 / 129), k: m.k }));
  wallCache.clear();
  artCache.clear();
  tallCache.clear();
  tallJobs.clear();
  try { dispatchEvent(new CustomEvent("gl-wall-kinds")); } catch (e) {}
  return true;
}

export function setWallKinds(next) {
  const changed = [];
  new Set([...Object.keys(kinds), ...Object.keys(next)]).forEach((k) => { if ((kinds[k] || "") !== (next[k] || "")) changed.push(+k); });
  if (!changed.length) return changed;
  kinds = { ...next };
  wallCache.clear();
  artCache.clear();
  tallCache.clear();
  tallJobs.clear();
  upperCache.clear();
  try { dispatchEvent(new CustomEvent("gl-wall-kinds")); } catch (e) {}
  return changed;
}

export function wallFace(x, y) { const m = matOf(kindAt(x, y)) || REDBRICK; return m(x, y); }
const tallCache = new Map(), tallJobs = new Map();
function extend(base, x0, ends) {
  const W = base.width, cv = document.createElement("canvas");
  cv.width = W; cv.height = base.height + TALL;
  const c = cv.getContext("2d");
  c.drawImage(base, 0, 0, W, 11, 0, 0, W, 11);
  c.drawImage(base, 0, 11, W, base.height - 11, 0, 11 + TALL, W, base.height - 11);
  return { cv, c, W, im: c.getImageData(0, 11, W, TALL + 3), row: 0, x0, l: !!ends.l, r: !!ends.r };
}
const upperCache = new Map();
function upperBlock(kind) {
  if (upperCache.has(kind)) return upperCache.get(kind);
  const f = matOf(kind) || REDBRICK, cv = document.createElement("canvas");
  cv.width = 400; cv.height = TALL;
  const c = cv.getContext("2d"), im = c.createImageData(400, TALL), d = im.data;
  for (let r = 0; r < TALL; r++) {
    const ay = 11 - TALL + r, sh = r < 3 ? [-0.38, -0.24, -0.12][r] : 0;
    for (let i = 0; i < 400; i++) { const col = f(2 + i, ay), k = (r * 400 + i) * 4; for (let q = 0; q < 3; q++) d[k + q] = sh ? Math.round(col[q] * (1 + sh)) : col[q]; d[k + 3] = 255; }
  }
  c.putImageData(im, 0, 0);
  upperCache.set(kind, cv);
  return cv;
}
function extendFast(base, ends) {
  const W = base.width, H = base.height + TALL, cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const c = cv.getContext("2d");
  c.drawImage(base, 0, 0, W, 11, 0, 0, W, 11);
  c.drawImage(base, 0, 11, W, base.height - 11, 0, 11 + TALL, W, base.height - 11);
  for (let p = 0; 2 + p * 400 < W; p++) c.drawImage(upperBlock(kinds[p] || "brick"), 2 + p * 400, 11);
  mats.forEach((m) => {
    const ax0 = Math.max(0, Math.floor(m.x0)), ax1 = Math.min(W, Math.ceil(m.x1)), ay0 = Math.max(11 - TALL, Math.floor(m.y0)), ay1 = Math.min(11, Math.ceil(m.y1));
    if (ax1 <= ax0 || ay1 <= ay0) return;
    const f = matOf(m.k === "brick" ? null : m.k) || REDBRICK, im = c.createImageData(ax1 - ax0, ay1 - ay0), d = im.data;
    for (let y = ay0; y < ay1; y++) for (let x = ax0; x < ax1; x++) { const col = f(x, y), r = y - (11 - TALL), sh = r < 3 ? [-0.38, -0.24, -0.12][r] : 0, k = ((y - ay0) * (ax1 - ax0) + x - ax0) * 4; for (let q = 0; q < 3; q++) d[k + q] = sh ? Math.round(col[q] * (1 + sh)) : col[q]; d[k + 3] = 255; }
    c.putImageData(im, ax0, ay0 - (11 - TALL) + 11);
  });
  if (ends.l) { c.clearRect(0, 11, 1, TALL); c.fillStyle = "#1d140f"; c.fillRect(1, 11, 1, TALL); }
  if (ends.r) { c.clearRect(W - 1, 11, 1, TALL); c.fillStyle = "#1d140f"; c.fillRect(W - 2, 11, 1, TALL); }
  const im = c.getImageData(0, 11 + TALL, W, 3), d = im.data;
  for (let r = 0; r < 3; r++) { const f = [-0.38, -0.24, -0.12][r]; for (let i = 0; i < W; i++) { const k = (r * W + i) * 4; if (d[k + 3]) for (let q = 0; q < 3; q++) d[k + q] = Math.min(255, Math.round(d[k + q] / (1 + f))); } }
  c.putImageData(im, 0, 11 + TALL);
  return cv;
}
function grow(j, until) {
  const d = j.im.data, OUT = [29, 20, 15];
  for (; j.row < TALL + 3; j.row++) {
    if (j.row % 16 === 0 && performance.now() > until) return false;
    const r = j.row;
    if (r >= TALL) {
      const f = [-0.38, -0.24, -0.12][r - TALL];
      for (let i = 0; i < j.W; i++) { const k = (r * j.W + i) * 4; if (d[k + 3]) for (let q = 0; q < 3; q++) d[k + q] = Math.min(255, Math.round(d[k + q] / (1 + f))); }
      continue;
    }
    const ay = 11 - TALL + r, f = r < 3 ? [-0.38, -0.24, -0.12][r] : 0;
    for (let i = 0; i < j.W; i++) {
      const k = (r * j.W + i) * 4;
      if ((j.l && i === 0) || (j.r && i === j.W - 1)) { d[k + 3] = 0; continue; }
      const col = (j.l && i === 1) || (j.r && i === j.W - 2) ? OUT : wallFace(j.x0 + i, ay), c = f ? col.map((v) => Math.round(v * (1 + f))) : col;
      d[k] = c[0]; d[k + 1] = c[1]; d[k + 2] = c[2]; d[k + 3] = 255;
    }
  }
  j.c.putImageData(j.im, 0, 11);
  return true;
}
export function wallTall(p, lamps = true, until = Infinity) {
  const key = p + (lamps ? "L" : "");
  if (tallCache.has(key)) return tallCache.get(key);
  let j = tallJobs.get(key);
  if (!j) {
    j = p ? extend(wallLayer(2 + 400 * p, 400, { l: false, lamps: false }), 2 + 400 * p, { l: false }) : extend(wallLayer(0, 402, { l: true, lamps: false }), 0, { l: true });
    j.lamps = lamps;
    tallJobs.set(key, j);
  }
  if (!grow(j, until)) return null;
  if (j.lamps) lampTop(j.cv, j.x0, { l: j.l, r: j.r });
  tallJobs.delete(key);
  tallCache.set(key, j.cv);
  if (tallCache.size > 48) tallCache.delete(tallCache.keys().next().value);
  return j.cv;
}

export function wallSwatch(cv, id, w = 40, h = 25) {
  cv.width = w; cv.height = h;
  const f = matOf(id) || REDBRICK, c = cv.getContext("2d"), im = c.createImageData(w, h), x0 = 2 + 400 * 11 + 30, y0 = 34;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const [r, g, b] = f(x0 + x, y0 + y), i = (y * w + x) * 4; im.data[i] = r; im.data[i + 1] = g; im.data[i + 2] = b; im.data[i + 3] = 255; }
  c.putImageData(im, 0, 0);
}

const LAMP = [
  [0, -1, 1, "#2a2e35"], [1, -1, 1, "#3a3f47"], [2, -1, 1, "#3a3f47"], [3, -4, 4, "#3c424c"], [3, -3, -2, "#6b7581"], [4, -6, 6, "#4b5361"],
  [4, -5, -3, "#7d8895"], [4, 5, 6, "#2f343c"], [5, -8, 8, "#4b5361"], [5, -7, -5, "#7d8895"], [5, 6, 8, "#2f343c"], [6, -9, 9, "#22262d"],
  [7, -5, 5, "#ffd24a"], [7, -2, 2, "#fff3bf"], [8, -5, 5, "#ffc93d"], [8, -2, 1, "#fff8d8"], [9, -4, 4, "#ffc93d"], [9, -1, 1, "#ffefb0"],
  [10, -3, 3, "#f2a933"], [11, -1, 1, "#e0902a"],
].map(([y, a, b, c]) => [y, a, b, hx(c)]);
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5], LIGHT = [255, 196, 110];
function lamps(px, W, x0, ends, top) {
  const get = (x, y) => { const i = (y * W + x - x0) * 4; return [px[i], px[i + 1], px[i + 2]]; };
  const put = (x, y, rgb) => { x -= x0; if (x < 0 || x >= W) return; const i = (y * W + x) * 4; px[i] = rgb[0]; px[i + 1] = rgb[1]; px[i + 2] = rgb[2]; px[i + 3] = 255; };
  const lo = ends.l ? Math.max(2, x0) : x0, hi = ends.r ? x0 + W - 3 : x0 + W - 1, rows = px.length / 4 / W;
  for (let cx = 58 + 288 * Math.floor((x0 - 110) / 288); cx <= x0 + W + 46; cx += 288) {
    const gy = top + 9, rx = 46, ry = 32;
    for (let y = top; y <= Math.min(rows - 1, top + 126); y++) {
      for (let x = Math.max(lo, cx - rx); x <= Math.min(hi, cx + rx); x++) {
        const d = Math.hypot((x - cx) / rx, (y - gy) / ry) + (BAYER[(y & 3) * 4 + (x & 3)] / 16 - 0.47) * 0.12;
        const a = d < 0.26 ? 0.6 : d < 0.48 ? 0.4 : d < 0.7 ? 0.23 : d < 0.92 ? 0.1 : 0;
        if (!a) continue;
        put(x, y, get(x, y).map((v, i) => Math.round(v + (LIGHT[i] - v) * a)));
      }
    }
    LAMP.forEach(([y, a, b, col]) => { for (let dx = a; dx <= b; dx++) put(cx + dx, top + y, col); });
  }
}
function lampTop(cv, x0, ends) {
  const c = cv.getContext("2d"), h = Math.min(cv.height, 11 + 60), im = c.getImageData(0, 0, cv.width, h);
  lamps(im.data, cv.width, x0, ends, 11);
  c.putImageData(im, 0, 0);
}

function wallLayer(x0, W, ends) {
  const H = WALL_H;
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const c = cv.getContext("2d"), im = c.createImageData(W, H), px = im.data;
  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const tone = (rgb, f) => rgb.map((v) => Math.max(0, Math.min(255, Math.round(f >= 0 ? v + (255 - v) * f : v * (1 + f)))));
  const mod = (n, m) => ((n % m) + m) % m;
  const noise = (x, y, k) => {
    let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(k, 1442695041);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  const put = (x, y, rgb, a = 255) => { x -= x0; if (x < 0 || x >= W) return; const i = (y * W + x) * 4; px[i] = rgb[0]; px[i + 1] = rgb[1]; px[i + 2] = rgb[2]; px[i + 3] = a; };
  const OUT = hex("#1d140f"), BRICKS = ["#b9472b", "#c4512f", "#ad4127", "#c95b36", "#b44a2c", "#bf4e2e", "#a63e26"].map(hex);
  const BURNT = hex("#8f3420"), PALE = hex("#cf6a45"), MORTAR = [hex("#d6a88a"), hex("#c79a7c"), hex("#e2b698")];
  const CAP = [hex("#8d8984"), hex("#9b9792"), hex("#7b7772")], CAP_ROWS = { 1: hex("#c9c5c0"), 2: hex("#a9a5a0"), 8: hex("#6e6a66"), 9: hex("#4a4542") };
  const CAP_JOINT = hex("#5c5854"), CAP_JHI = hex("#a8a49f");
  const PLINTH = [hex("#7a756f"), hex("#86817b"), hex("#6c6762")], PL_HI = hex("#9a958f"), PL_LOW = hex("#56524d"), PL_JOINT = hex("#4b4743"), PL_JHI = hex("#8e8983");

  const mortar = (x, y) => { const r = noise(x, y, 4); return r < 0.1 ? MORTAR[1] : r < 0.15 ? MORTAR[2] : MORTAR[0]; };
  const cap = (x, y) => {
    if (CAP_ROWS[y]) return CAP_ROWS[y];
    const j = mod(x - 1, 50);
    if (j === 0) return CAP_JOINT;
    if (j === 1 && y < 8) return CAP_JHI;
    const r = noise(x, y, 1);
    return r < 0.08 ? CAP[1] : r < 0.18 ? CAP[2] : CAP[0];
  };
  const plinth = (x, y) => {
    const j = mod(x - 2, 46);
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
    const off = course % 2 ? 8 : 0, bx = mod(x - 2 + off, 16), bi = Math.floor((x - 2 + off) / 16), by = row - 1;
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

  const face = (x, y) => { const m = matOf(kindAt(x, y)); return m ? m(x, y) : brickwork(x, y); };
  for (let y = 0; y < H; y++) {
    for (let x = x0; x < x0 + W; x++) {
      const edge = (ends.l && x === 0) || (ends.r && x === x0 + W - 1), rim = (ends.l && x === 1) || (ends.r && x === x0 + W - 2);
      if (y === 0) { if (!edge) put(x, y, OUT); continue; }
      if (y <= 10) { put(x, y, edge || y === 10 ? OUT : cap(x, y)); continue; }
      if (y <= 143) {
        if (edge) continue;
        if (rim || y === 143) { put(x, y, OUT); continue; }
        let col = y >= 138 ? plinth(x, y) : face(x, y);
        if (y <= 13) col = tone(col, [-0.38, -0.24, -0.12][y - 11]);
        if (ends.l && x === 2) col = tone(col, -0.1);
        else if (ends.r && x === x0 + W - 3) col = tone(col, -0.16);
        put(x, y, col);
        continue;
      }
      if (y === 144 && (!ends.l || x >= 2) && (!ends.r || x <= x0 + W - 3)) put(x, y, [0, 0, 0], 77);
      else if (y === 145 && (!ends.l || x >= 4) && (!ends.r || x <= x0 + W - 5)) put(x, y, [0, 0, 0], 40);
    }
  }

  if (ends.lamps !== false) lamps(px, W, x0, ends, 11);

  const MOSS = ["#4e8a36", "#3f7430", "#6aa548"].map(hex);
  for (let b = Math.floor((x0 - 2) / 400) - 1; b <= Math.floor((x0 + W - 2) / 400) + 1; b++) {
    [24, 131, 247, 371].forEach((mx, i) => {
      const s = i + b * 4;
      for (let n = 0; n < 9; n++) {
        const x = mx + b * 400 + Math.floor(noise(s, n, 11) * 14) - 7, y = 136 + Math.floor(noise(s, n, 12) * 4);
        const k = kindAt(x, y);
        if ((!ends.l || x > 2) && (!ends.r || x < x0 + W - 3) && (!k || MOSSY.has(k))) put(x, y, MOSS[Math.floor(noise(s, n, 13) * MOSS.length)]);
      }
    });
  }

  c.putImageData(im, 0, 0);
  return cv;
}

export function drawWall(canvas, w = SPR.wall[0], short = false, end = false) {
  const key = "map" + w + (short ? "s" : "t") + (end ? "e" : "");
  if (!wallCache.has(key)) {
    const ends = { l: true, r: end || w === SPR.wall[0] };
    if (short) wallCache.set(key, wallLayer(0, w, ends));
    else { const cv = extendFast(wallLayer(0, w, { ...ends, lamps: false }), ends); lampTop(cv, 0, ends); wallCache.set(key, cv); }
  }
  const art = wallCache.get(key), k = w > 3000 ? 1 : w > 1000 ? 2 : 4;
  canvas.width = art.width * k;
  canvas.height = art.height * k;
  const c = canvas.getContext("2d");
  c.imageSmoothingEnabled = false;
  c.drawImage(art, 0, 0, canvas.width, canvas.height);
}

export function drawWallPanel(canvas, p) {
  let art = wallCache.get(p);
  if (!art) {
    art = p ? wallLayer(2 + 400 * p, 400, { l: false }) : wallLayer(0, 402, { l: true });
    if (wallCache.size > 24) wallCache.delete([...wallCache.keys()].find((k) => typeof k === "number"));
    wallCache.set(p, art);
  }
  canvas.width = art.width; canvas.height = art.height;
  canvas.getContext("2d").drawImage(art, 0, 0);
}

function drawWallScene(canvas, p, rows, top) {
  canvas.width = 400; canvas.height = rows;
  const c = canvas.getContext("2d"), r = rng(90001 + (p + 1) * 7919);
  const px = (x, y, col, w = 1, h = 1) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
  const horizon = Math.max(8, top + 26), band = horizon / SKY.length;
  SKY.forEach((col, i) => px(0, Math.floor(i * band), col, 400, Math.ceil(band) + 1));
  for (let i = 1; i < SKY.length; i++) for (let x = i % 2; x < 400; x += 2) px(x, Math.floor(i * band), SKY[i - 1]);
  for (let x = 0; x < 400; x++) {
    const ax = x + p * 400, h = Math.round(10 + Math.sin(ax / 37) * 4 + Math.sin(ax / 13) * 2);
    px(x, horizon - h, "#7fb98a", 1, h);
  }
  const tree = (x, base, rad, dark, light, trunk) => {
    px(x - 1, base - rad, trunk, 2, rad);
    for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) {
      const d = Math.hypot(dx, dy * 1.1);
      if (d > rad + 0.3) continue;
      px(x + dx, base - rad * 1.6 + dy, d > rad - 1.2 ? "#1f4a2a" : dx + dy < -rad * 0.6 && r() < 0.7 ? light : dark);
    }
  };
  const g0 = horizon, gr = c.createLinearGradient(0, g0, 0, rows);
  gr.addColorStop(0, GRASS.top); gr.addColorStop(1, GRASS.bottom);
  c.fillStyle = gr;
  c.fillRect(0, g0, 400, rows - g0);
  for (let i = 0; i < ((rows - g0) * 400) / 22; i++) {
    const x = Math.floor(r() * 400), y = g0 + 1 + Math.floor(r() * (rows - g0)), t = r();
    if (t < 0.55) { px(x, y, GRASS.dark, 1, 2); px(x + 1, y + 1, GRASS.dark); } else if (t < 0.85) px(x, y, GRASS.light); else px(x, y, GRASS.darker, 2, 1);
  }
  for (let i = 0; i < ((rows - g0) * 400) / 520; i++) {
    const x = 2 + Math.floor(r() * 396), y = g0 + 4 + Math.floor(r() * Math.max(1, rows - g0 - 6)), col = FLOWERS[Math.floor(r() * FLOWERS.length)];
    px(x - 1, y, col); px(x + 1, y, col); px(x, y - 1, col); px(x, y + 1, col); px(x, y, "#ffd23a");
  }
  for (let x = -12 + r() * 10; x < 412; x += 16 + r() * 18) tree(Math.round(x), horizon + 2, Math.round(6 + r() * 4), "#3f7d4a", "#5c9b5c", "#4a3424");
  for (let x = -12 + r() * 14; x < 412; x += 22 + r() * 26) tree(Math.round(x), top + 18, Math.round(8 + r() * 5), "#3a8a3c", "#5fb050", "#5b3d22");
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

export const WALL_SM = 90, WALL_SKY = SKY[0], WALL_GRASS = GRASS.bottom;
const artCache = new Map();
export function wallArt(p) {
  if (artCache.has(p)) { const a = artCache.get(p); artCache.delete(p); artCache.set(p, a); return a; }
  const cv = document.createElement("canvas"), rows = 147 + TALL + 2 * WALL_SM;
  drawWallScene(cv, p, rows, WALL_SM + TALL);
  const c = cv.getContext("2d");
  if (p >= -1) c.drawImage(wallTall(p >= 0 ? p : 0), p > 0 ? 0 : p === 0 ? -2 : 398, WALL_SM);
  artCache.set(p, cv);
  if (artCache.size > 40) artCache.delete(artCache.keys().next().value);
  return cv;
}
