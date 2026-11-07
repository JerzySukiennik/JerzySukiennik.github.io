/* Gzowo Labs seasons: the season in Gzowo from the real date (?season=spring|summer|autumn|winter previews one), its palettes for the map,
   and pixel passes over Jurek's summer sprites: fresh green and blossom in spring, rust and gold leaves in autumn, bare branches and
   snow on every roof, sign and lamp in winter, when the Narew freezes over. */

const NAMES = ["spring", "summer", "autumn", "winter"];
export const SEASON = (() => {
  try {
    const q = new URLSearchParams(location.search).get("season");
    if (NAMES.includes(q)) { sessionStorage.setItem("gl-season", q); return q; }
    const kept = sessionStorage.getItem("gl-season");
    if (NAMES.includes(kept)) return kept;
  } catch (e) {}
  const m = +new Date().toLocaleDateString("en-GB", { timeZone: "Europe/Warsaw", month: "numeric" });
  return m === 12 || m <= 2 ? "winter" : m <= 5 ? "spring" : m <= 8 ? "summer" : "autumn";
})();
export const FROZEN = SEASON === "winter";
try { document.documentElement.classList.add("season-" + SEASON); } catch (e) {}

const SUMMER_GRASS = { top: "#69c04c", bottom: "#56ae3f", dark: "#47993a", darker: "#3c8a32", light: "#86d65f", bank: "#3f8f35" };
export const PAL = {
  spring: {
    grass: { top: "#71c94f", bottom: "#5bb543", dark: "#4aa13b", darker: "#3e9133", light: "#98e36b", bank: "#42963a" }, hills: "#87c690", flowers: 2.4,
    flowerCols: ["#ffffff", "#ffe14d", "#ffb3d6", "#d7b8ff", "#ffffff", "#ffd1e8", "#ffe14d"],
  },
  summer: { grass: SUMMER_GRASS, hills: "#7fb98a", flowers: 1, flowerCols: ["#ffffff", "#ffe14d", "#ff9ed2", "#c9a2ff", "#ffffff", "#ffd1e8"] },
  autumn: {
    grass: { top: "#8aba4b", bottom: "#76a641", dark: "#658f39", darker: "#587f32", light: "#a6c95c", bank: "#5c8a37" }, hills: "#a2a46a", flowers: 0.15,
    flowerCols: ["#ffe14d", "#ffffff"], leaves: ["#d97b35", "#b85a26", "#e3b82e", "#c98a2a", "#8f5a2a"],
  },
  winter: {
    grass: { top: "#f2f6fa", bottom: "#e3ebf3", dark: "#cfdbe8", darker: "#bfcfe0", light: "#ffffff", bank: "#d6e1ec" }, hills: "#dbe5ee", flowers: 0, flowerCols: [],
    path: { base: "#e8e2d6", edge: "#cdc3b1", light: "#f4f0e9", pebble: "#bcb1a0" },
    sky: ["#5d88c9", "#6892cf", "#749dd5", "#81a8db", "#8fb4e1", "#9ec0e7", "#aecdee", "#c0d9f4"], tufts: "#8b9a7c",
  },
}[SEASON];

const EVERGREEN = new Set(["pine"]);
const TREES = new Set(["tree1", "tree2", "tree3", "pine", "bush"]);
const SNOWY = new Set(["arcade", "workshop", "lab", "launchpad", "billboard", "signpost", "mailbox", "lamp", "bench", "flag", "windsock", "dock", "hangar", "board", "claw", "booth",
  "dish", "sailboat", "exchange", "museum", "store", "station", "launchpad-empty"]);
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const RAMPS = {
  rust: ["#5e2a14", "#8f3f1c", "#b85a26", "#d97b35", "#ef9a4a"].map(hex),
  gold: ["#6e5212", "#a5801c", "#d2a72a", "#ecc94a", "#f8e07a"].map(hex),
  amber: ["#64360f", "#9a5718", "#c97b22", "#e6a033", "#f5c25a"].map(hex),
  twig: ["#3f322a", "#54453a", "#6b5a4b"].map(hex),
  pine: ["#1f4a33", "#2a5c3f", "#367050", "#46845e", "#5a9a70"].map(hex),
};
const AUTUMN_PICK = { tree1: "amber", tree2: "gold", tree3: "rust", bush: "rust" };

function hsv(r, g, b) {
  const mx = Math.max(r, g, b), d = mx - Math.min(r, g, b);
  let h = 0;
  if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(h * 60 + 360) % 360, mx ? d / mx : 0, mx / 255];
}
const isLeaf = (r, g, b) => { const [h, s, v] = hsv(r, g, b); return h >= 55 && h <= 175 && s > 0.18 && v > 0.12; };
const ramp = (R, v) => R[Math.max(0, Math.min(R.length - 1, Math.floor(v * R.length)))];
const noise = (x, y, k) => { let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(k, 1442695041); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

function snowCap(d, w, h, depth, seed) {
  const op = (x, y) => { const i = (y * w + x) * 4; return d[i + 3] >= 128 && !(d[i] > 222 && d[i + 1] > 222 && d[i + 2] > 222); };
  const mark = new Uint8Array(w * h), topY = new Int32Array(w).fill(-1), run = new Int32Array(w);
  for (let x = 0; x < w; x++) for (let y = 0; y < h; y++) if (op(x, y)) { topY[x] = y; break; }
  for (let x = 0; x < w;) {
    if (topY[x] < 0) { x++; continue; }
    let e = x;
    while (e + 1 < w && topY[e + 1] >= 0 && Math.abs(topY[e + 1] - topY[e]) <= 2) e++;
    for (let k = x; k <= e; k++) run[k] = e - x + 1;
    x = e + 1;
  }
  const lay = (x, y, dd) => { for (let k = 0; k < dd && y + k < h; k++) if (op(x, y + k)) mark[(y + k) * w + x] = Math.max(mark[(y + k) * w + x], k === 0 ? 3 : k === dd - 1 ? 1 : 2); };
  for (let x = 0; x < w; x++) {
    if (topY[x] < 0) continue;
    const wide = run[x] >= 10 ? depth : run[x] >= 5 ? Math.ceil(depth / 2) : 2;
    lay(x, topY[x], wide + (noise(x >> 1, 0, seed) < 0.35 ? 1 : 0));
  }
  for (let y = 1; y < h; y++) for (let x = 1; x < w - 1; x++) {
    if (!op(x, y) || op(x, y - 1) || y === topY[x]) continue;
    if (!op(x - 1, y) && !op(x + 1, y)) continue;
    lay(x, y, 2);
  }
  for (let p = 0; p < w * h; p++) {
    const m = mark[p];
    if (!m) continue;
    const i = p * 4, c = m === 3 ? [255, 255, 255] : m === 2 ? [241, 246, 252] : [212, 226, 241];
    d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2];
  }
}

const cache = new Map();
export function seasonal(im, name) {
  if (!im || SEASON === "summer") return im;
  const key = name + ":" + SEASON;
  if (cache.has(key)) return cache.get(key);
  const tree = TREES.has(name), snowy = SNOWY.has(name);
  if (!tree && !(FROZEN && snowy)) { cache.set(key, im); return im; }
  const w = im.naturalWidth || im.width, h = im.naturalHeight || im.height, cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const c = cv.getContext("2d", { willReadFrequently: true });
  c.drawImage(im, 0, 0);
  const data = c.getImageData(0, 0, w, h), d = data.data, seed = name.length * 97 + name.charCodeAt(0);
  if (tree) {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (d[i + 3] < 40 || !isLeaf(d[i], d[i + 1], d[i + 2])) continue;
      const v = hsv(d[i], d[i + 1], d[i + 2])[2], b = BAYER[(y & 3) * 4 + (x & 3)];
      let col;
      if (SEASON === "spring") {
        const blossom = (name === "tree1" || name === "bush") && noise(x >> 1, y >> 1, seed) < 0.16 && v > 0.35;
        col = blossom ? (noise(x, y, seed + 1) < 0.5 ? [255, 196, 220] : [255, 240, 246]) : [Math.min(255, d[i] * 1.02 + 6), Math.min(255, d[i + 1] * 1.08 + 8), Math.min(255, d[i + 2] * 0.95)];
      } else if (SEASON === "autumn") {
        if (EVERGREEN.has(name)) col = ramp(RAMPS.pine, v * 0.95);
        else if (noise(x >> 1, y >> 1, seed + 3) < 0.12) { d[i + 3] = 0; continue; }
        else col = ramp(RAMPS[AUTUMN_PICK[name] || "amber"], Math.min(0.999, v * 1.05 + (noise(x, y, seed) - 0.5) * 0.15));
      } else {
        if (EVERGREEN.has(name)) col = ramp(RAMPS.pine, v * 0.85);
        else if (b < 5 || noise(x, y >> 1, seed + 5) < 0.06) col = ramp(RAMPS.twig, v);
        else { d[i + 3] = 0; continue; }
      }
      d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2];
    }
  }
  if (FROZEN) snowCap(d, w, h, Math.min(12, Math.max(3, Math.round(h / 14))), seed);
  c.putImageData(data, 0, 0);
  cv.src = (im.src || name) + "#" + SEASON;
  cv.naturalWidth = w; cv.naturalHeight = h;
  cache.set(key, cv);
  return cv;
}

export function seasonalAll(img) {
  if (SEASON === "summer") return img;
  const out = {};
  Object.entries(img).forEach(([k, v]) => { out[k] = seasonal(v, k); });
  return out;
}

const urls = new Map();
function snowUrl(name, src) {
  if (urls.has(name)) return urls.get(name);
  const job = new Promise((res) => {
    const im = new Image();
    im.src = src;
    im.decode().then(() => {
      const cv = seasonal(im, name);
      if (cv === im) { res(null); return; }
      cv.toBlob((b) => res(b ? URL.createObjectURL(b) : null), "image/png");
    }, () => res(null));
  });
  urls.set(name, job);
  return job;
}

export function seasonDom(root) {
  if (!FROZEN || !root) return;
  root.querySelectorAll("img").forEach((el) => {
    if (el.dataset.season) return;
    const m = /\/assets\/map\/([a-z0-9-]+)\.webp(\?|$)/.exec(el.getAttribute("src") || "");
    if (!m || !SNOWY.has(m[1])) return;
    el.dataset.season = "1";
    snowUrl(m[1], el.src).then((u) => { if (u) el.src = u; });
  });
}
