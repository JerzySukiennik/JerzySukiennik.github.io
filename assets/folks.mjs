/* Gzowo Labs folks: visitors build a little pixel person from parts, recolor every layer and paint over any pixel, then let it out on the plot.
   Up to ten walk around at once, wave, greet each other, shake hands with Jurek and visit the attractions; every one ever made waits in the index. */

export const DB = "https://raft-e8d47-default-rtdb.firebaseio.com";
const LOCAL = ["localhost", "127.0.0.1", "0.0.0.0", "[::1]"];
export const PLOT = LOCAL.includes(location.hostname) || location.protocol === "file:" ? "plotDev" : "plot";
const BAD = /(kurw|chuj|huj|pierdol|spierdal|wypierd|zajeb|jebac|jebi|jeban|jebn|pizd|fuck|shit|bitch|nigg|fagg|cunt|porn|hitler|nazi|cwel|kutas|szmat|dziwk)/;
const LEET = { 0: "o", 1: "i", 3: "e", 4: "a", 5: "s", 7: "t", 8: "b", "@": "a", $: "s", "!": "i" };
export const bad = (s) => BAD.test(String(s).toLowerCase().replace(/ł/g, "l").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[0134578@$!]/g, (c) => LEET[c]).replace(/[^a-z]/g, ""));
export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
export const NAME_OK = /^[\p{L}\p{N} ._'-]+$/u;
export const TEXT_OK = /^[\p{L}\p{N}\s.,!?'"():;+=&%#*/-]*$/u;
const PUSH = "-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz";
export function pushId() {
  let now = Date.now(), id = "";
  for (let i = 0; i < 8; i++) { id = PUSH.charAt(now % 64) + id; now = Math.floor(now / 64); }
  for (let i = 0; i < 12; i++) id += PUSH.charAt(Math.floor(Math.random() * 64));
  return id;
}
export const get = (path) => fetch(`${DB}/${path}`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
export const put = (path, v) => fetch(`${DB}/${path}`, { method: "PUT", body: JSON.stringify(v) }).then((r) => { if (!r.ok) throw r.status; return r; });
export const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
};

export const COLORS = ["#ffe0bd", "#f1c27d", "#e0ac69", "#c68642", "#8d5524", "#5c3a21", "#111111", "#3a3a3a", "#7a7a7a", "#c8c8c8", "#ffffff",
  "#2b1d14", "#6b3e1f", "#b5651d", "#e8c15a", "#f4ecd8", "#e5383b", "#ff8c1a", "#ffd23f", "#8bd346", "#2e9e44", "#1fb5a8", "#4cc3ff", "#2f6fde",
  "#1d2b6b", "#7d4cdb", "#ff7eb6", "#d63fa8", "#7a4a2a", "#d9b07a", "#6b7a2e", "#a8f0c8"];
const CH = "0123456789abcdefghijklmnopqrstuv";
const GW = 16, GH = 24, FW = 18, FH = 26, N = GW * GH;
const OUT = "#1c1714", D = "#2a1d1a", MOUTH = "#8a3a3a", BLUSH = "#f29a9a", W = "#ffffff";
export const LAYERS = [
  ["skin", "Head", ["Round", "Square", "Wide"]],
  ["hair", "Hair", ["None", "Short", "Spiky", "Long", "Bob", "Mohawk", "Curly", "Ponytail", "Side part", "Buns"]],
  ["face", "Face", ["Smile", "Big eyes", "Happy", "Freckles", "Surprised", "Wink", "Grin", "Sleepy", "Brows"]],
  ["shirt", "Top", ["T-shirt", "Long sleeves", "Hoodie", "Stripes", "Jacket", "Dress", "Tank top", "GSP tee"]],
  ["pants", "Bottom", ["Trousers", "Shorts", "Skirt", "Overalls"]],
  ["shoes", "Shoes", ["Sneakers", "Boots", "Barefoot", "Sandals"]],
  ["hat", "Hat", ["None", "Cap", "Beanie", "Bucket hat", "Headband", "Bow"]],
];
export const ITEMS = [
  ["crown", "Crown", "head", 3], ["tophat", "Top hat", "head", 8], ["helmet", "Space helmet", "head", 4], ["propeller", "Propeller cap", "head", 10],
  ["party", "Party hat", "head", 12], ["headphones", "Headphones", "head", 10], ["shades", "Sunglasses", "face", 12], ["monocle", "Monocle", "face", 6],
  ["mustache", "Mustache", "face", 10], ["bowtie", "Bow tie", "neck", 12], ["medal", "GSP medal", "neck", 6], ["scarf", "Scarf", "neck", 10],
  ["cape", "Cape", "back", 8], ["jetpack", "Jetpack", "back", 6], ["wings", "Wings", "back", 5],
  ["cone", "Pine cone hat", "head", 0], ["halo", "Halo", "head", 0], ["pirate", "Pirate hat", "head", 0], ["antenna", "Alien antenna", "head", 0],
  ["parrot", "Parrot", "pet", 0], ["chain", "Gold chain", "neck", 0],
];
export const itemOf = (id) => ITEMS.find((i) => i[0] === id);
const SLEEVE = [1, 2, 2, 1, 2, 1, 0, 1];
const SKINS = [0, 1, 2, 3, 4, 5], HAIRS = [11, 12, 13, 14, 15, 6, 7, 9, 16, 17, 22, 25, 26], CLOTH = [6, 7, 8, 9, 10, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31];

const rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const hex = (a) => "#" + a.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
const shade = (h, f = 0.74) => hex(rgb(h).map((v) => v * f));
const tint = (h, f = 0.35) => hex(rgb(h).map((v) => v + (255 - v) * f));
const pick = (a) => a[Math.floor(Math.random() * a.length)];

export function parse(v) {
  const ok = (s, re, d) => (typeof s === "string" && re.test(s) ? s : d);
  return {
    n: typeof v.n === "string" ? v.n.slice(0, 16) : "Folk",
    l: typeof v.l === "string" ? v.l.slice(0, 60) : "",
    p: ok(v.p, /^[0-9a-v]{7}$/, "0110000"),
    c: ok(v.c, /^[0-9a-v]{7}$/, "1bnhoc7"),
    o: ok(v.o, /^[.x0-9a-v]{384}$/, ".".repeat(N)),
    t: Number.isFinite(v.t) ? v.t : 0,
    w: [],
  };
}
export const parseWear = (s) => (typeof s === "string" ? s.split(",").filter((x) => itemOf(x)).slice(0, 5) : []);

export function randomSpec() {
  const p = LAYERS.map(([k, , list]) => CH[Math.floor(Math.random() * (k === "hat" && Math.random() < 0.5 ? 1 : list.length))]).join("");
  const c = [pick(SKINS), pick(HAIRS), pick([6, 23, 20, 12, 24]), pick(CLOTH), pick(CLOTH), pick(CLOTH), pick(CLOTH)].map((i) => CH[i]).join("");
  return { n: "", l: "", p, c, o: ".".repeat(N), w: [] };
}

function body(spec) {
  const g = new Array(N).fill(null);
  const P = [...spec.p].map((ch) => CH.indexOf(ch)), C = [...spec.c].map((ch) => COLORS[CH.indexOf(ch)] || "#888888");
  const [head, hair, face, shirt, pants, shoes, hat] = P.map((v, i) => Math.min(v, LAYERS[i][2].length - 1));
  const [S, H, A, T, B, F, X] = C;
  const put = (x, y, col) => { if (x >= 0 && y >= 0 && x < GW && y < GH) g[y * GW + x] = col; };
  const r = (x0, y0, x1, y1, col) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) put(x, y, col); };
  const pts = (list, col) => list.forEach(([x, y]) => put(x, y, col));
  const wide = head === 2, lx = wide ? 4 : 5, rx = wide ? 11 : 10;
  const wear = new Set(spec.w || []);

  if (wear.has("cape")) { r(3, 12, 12, 16, "#7d4cdb"); r(2, 17, 13, 22, "#7d4cdb"); pts([[2, 22], [13, 22], [7, 22], [8, 22]], "#5b33a8"); }
  if (wear.has("wings")) { pts([[0, 10], [1, 10], [0, 11], [1, 11], [2, 11], [0, 12], [1, 12], [0, 13], [15, 10], [14, 10], [15, 11], [14, 11], [13, 11], [15, 12], [14, 12], [15, 13]], W); pts([[0, 13], [15, 13], [1, 12], [14, 12]], "#c8c8c8"); }
  if (wear.has("jetpack")) { r(0, 11, 1, 17, "#c8c8c8"); r(14, 11, 15, 17, "#c8c8c8"); pts([[1, 12], [1, 13], [14, 12], [14, 13]], W); r(0, 18, 1, 18, "#3a3a3a"); r(14, 18, 15, 18, "#3a3a3a"); pts([[0, 19], [1, 19], [14, 19], [15, 19]], "#ff8c1a"); pts([[1, 20], [14, 20]], "#ffd23f"); }

  if (hair === 3) { r(2, 6, 3, 14, H); r(12, 6, 13, 14, H); pts([[2, 14], [13, 14]], shade(H)); }

  if (head === 0) { r(5, 4, 10, 4, S); r(4, 5, 11, 5, S); r(3, 6, 12, 9, S); r(4, 10, 11, 10, S); r(5, 11, 10, 11, S); pts([[2, 8], [13, 8]], S); }
  else if (head === 1) { r(4, 4, 11, 4, S); r(3, 5, 12, 10, S); r(4, 11, 11, 11, S); pts([[2, 8], [13, 8]], S); }
  else { r(4, 5, 11, 5, S); r(2, 6, 13, 10, S); r(3, 11, 12, 11, S); }

  const eyes = (col, tall = true) => { pts([[lx, 8], [rx, 8]], col); if (tall) pts([[lx, 7], [rx, 7]], col); };
  const smile = () => pts([[6, 9], [9, 9], [7, 10], [8, 10]], D);
  if (face === 0) { eyes(A); smile(); }
  else if (face === 1) { r(lx - 1, 7, lx, 8, A); r(rx, 7, rx + 1, 8, A); pts([[lx - 1, 7], [rx, 7]], W); pts([[7, 10], [8, 10]], D); }
  else if (face === 2) { pts([[lx - 1, 8], [lx, 7], [lx + 1, 8], [rx - 1, 8], [rx, 7], [rx + 1, 8]], D); pts([[7, 10], [8, 10]], MOUTH); pts([[6, 9], [9, 9]], D); pts([[lx - 1, 9], [rx + 1, 9]], BLUSH); }
  else if (face === 3) { eyes(D); pts([[7, 10], [8, 10]], D); pts([[lx - 1, 9], [lx, 10], [rx, 10], [rx + 1, 9]], A); }
  else if (face === 4) { eyes(D); r(7, 9, 8, 10, MOUTH); }
  else if (face === 5) { pts([[lx - 1, 8], [lx, 8], [lx + 1, 8]], D); pts([[rx, 7], [rx, 8]], A); smile(); pts([[rx + 1, 9]], BLUSH); }
  else if (face === 6) { eyes(A); r(6, 9, 9, 9, D); r(6, 10, 9, 10, W); pts([[5, 10], [10, 10]], D); }
  else if (face === 7) { pts([[lx - 1, 8], [lx, 8], [rx, 8], [rx + 1, 8]], D); pts([[7, 10]], D); }
  else { eyes(A); pts([[lx - 1, 6], [lx, 6], [rx, 6], [rx + 1, 6]], D); smile(); }

  const hd = shade(H);
  const short = () => { r(5, 3, 10, 3, H); r(4, 4, 11, 4, H); r(3, 5, 12, 5, H); pts([[3, 6], [4, 6], [11, 6], [12, 6]], H); pts([[6, 4], [9, 3]], tint(H, 0.25)); };
  if (hair === 1) { short(); pts([[5, 6]], H); }
  else if (hair === 2) { short(); pts([[4, 2], [5, 2], [6, 1], [7, 2], [8, 2], [9, 1], [10, 2], [11, 2]], H); pts([[6, 1], [9, 1]], hd); }
  else if (hair === 3) { short(); pts([[5, 6]], H); }
  else if (hair === 4) { short(); r(2, 6, 3, 10, H); r(12, 6, 13, 10, H); r(3, 6, 12, 6, H); pts([[2, 10], [13, 10]], hd); }
  else if (hair === 5) { r(7, 0, 8, 5, H); pts([[7, 0], [8, 1], [7, 3]], hd); }
  else if (hair === 6) { r(4, 2, 5, 2, H); r(7, 2, 8, 2, H); r(10, 2, 11, 2, H); r(3, 3, 12, 3, H); r(2, 4, 13, 4, H); pts([[2, 5], [3, 5], [4, 5], [11, 5], [12, 5], [13, 5], [2, 6], [3, 6], [12, 6], [13, 6], [2, 7], [13, 7]], H); pts([[5, 3], [9, 4], [3, 5], [12, 4], [8, 3]], hd); }
  else if (hair === 7) { short(); r(13, 5, 14, 10, H); pts([[13, 6], [14, 11]], hd); pts([[13, 6]], "#ff7eb6"); }
  else if (hair === 8) { short(); r(3, 6, 8, 6, H); pts([[3, 7], [4, 7]], H); pts([[8, 6]], hd); }
  else if (hair === 9) { short(); r(3, 1, 5, 3, H); r(10, 1, 12, 3, H); pts([[3, 1], [12, 1]], null); pts([[4, 2], [11, 2]], hd); }

  const td = shade(X);
  if (hat === 1) { r(5, 2, 10, 2, X); r(4, 3, 11, 4, X); r(3, 5, 13, 5, td); pts([[7, 2], [8, 2]], tint(X)); }
  else if (hat === 2) { pts([[7, 0], [8, 0], [7, 1], [8, 1]], W); r(5, 2, 10, 2, X); r(4, 3, 11, 3, X); r(3, 4, 12, 4, X); r(3, 5, 12, 5, td); pts([[5, 3], [9, 3], [7, 4]], tint(X)); }
  else if (hat === 3) { r(5, 2, 10, 2, X); r(4, 3, 11, 4, X); r(2, 5, 13, 5, td); pts([[2, 6], [13, 6]], td); r(4, 4, 11, 4, shade(X, 0.9)); }
  else if (hat === 4) { r(3, 5, 12, 5, X); pts([[13, 5], [14, 4], [14, 6]], X); }
  else if (hat === 5) { pts([[9, 2], [10, 2], [13, 2], [14, 2], [9, 4], [10, 4], [13, 4], [14, 4]], X); r(9, 3, 14, 3, X); pts([[11, 3], [12, 3]], td); }

  const sd = shade(T);
  r(4, 12, 11, 17, T);
  if (shirt === 0 || shirt === 7) pts([[7, 12], [8, 12]], S);
  if (shirt === 1) pts([[7, 12], [8, 12]], sd);
  if (shirt === 2) { r(4, 12, 11, 12, sd); pts([[7, 12], [8, 12]], S); pts([[6, 13], [9, 13], [6, 14], [9, 14]], W); r(5, 15, 10, 16, sd); }
  if (shirt === 3) { r(4, 13, 11, 13, W); r(4, 15, 11, 15, W); r(4, 17, 11, 17, W); pts([[7, 12], [8, 12]], S); }
  if (shirt === 4) { r(7, 12, 8, 17, W); pts([[6, 12], [9, 12], [6, 13], [9, 13]], sd); pts([[6, 15], [6, 16]], tint(T)); }
  if (shirt === 6) { r(4, 12, 11, 12, S); pts([[5, 12], [10, 12]], T); }
  if (shirt === 7) { pts([[7, 13], [8, 13], [7, 14], [8, 14], [7, 15], [8, 15]], W); pts([[7, 13]], "#ffd23f"); pts([[6, 15], [9, 15]], sd); pts([[7, 16], [8, 16]], "#ff8c1a"); }

  const bd = shade(B);
  const legs = (y0, y1, col) => { r(4, y0, 6, y1, col); r(9, y0, 11, y1, col); };
  r(4, 18, 11, 19, B); legs(20, 21, B);
  if (pants === 1) { legs(21, 21, S); pts([[4, 20], [11, 20]], bd); }
  if (pants === 2) { r(3, 19, 12, 19, B); r(3, 20, 12, 20, bd); legs(21, 21, S); pts([[7, 20], [8, 20]], B); }
  if (pants === 3) { pts([[5, 12], [5, 13], [5, 14], [10, 12], [10, 13], [10, 14]], B); r(5, 15, 10, 17, B); pts([[5, 14], [10, 14]], "#ffd23f"); pts([[6, 16], [9, 16]], bd); }
  if (shirt === 5) { r(4, 18, 11, 18, T); r(3, 19, 12, 20, T); r(3, 20, 12, 20, sd); legs(21, 21, S); }

  const fd = shade(F);
  const feet = (col, y = 22) => { r(3, y, 6, y, col); r(9, y, 12, y, col); };
  if (shoes === 0) { feet(F); feet(W, 23); pts([[6, 22], [9, 22]], fd); }
  else if (shoes === 1) { legs(20, 21, F); feet(F); feet(fd, 23); pts([[4, 20], [11, 20]], tint(F)); }
  else if (shoes === 2) { r(4, 22, 6, 22, S); r(9, 22, 11, 22, S); feet(S, 23); pts([[3, 23], [12, 23]], shade(S, 0.85)); }
  else { r(4, 22, 6, 22, S); r(9, 22, 11, 22, S); pts([[5, 22], [10, 22]], F); feet(F, 23); }

  if (wear.has("crown")) { pts([[4, 1], [7, 1], [8, 1], [11, 1]], "#ffd23f"); r(4, 2, 5, 2, "#ffd23f"); r(7, 2, 8, 2, "#ffd23f"); r(10, 2, 11, 2, "#ffd23f"); r(4, 3, 11, 3, "#ffd23f"); r(4, 4, 11, 4, "#c99a1a"); pts([[6, 3]], "#2f6fde"); pts([[9, 3]], "#ff7eb6"); }
  if (wear.has("tophat")) { r(5, 0, 10, 3, "#1b1b1f"); r(5, 4, 10, 4, "#7d4cdb"); r(3, 5, 12, 5, "#1b1b1f"); pts([[6, 1]], "#3a3a3a"); }
  if (wear.has("helmet")) { r(5, 2, 10, 2, "#bfe8ff"); pts([[3, 3], [4, 3], [11, 3], [12, 3]], "#bfe8ff"); r(2, 4, 2, 10, "#bfe8ff"); r(13, 4, 13, 10, "#bfe8ff"); pts([[2, 11], [3, 11], [12, 11], [13, 11]], "#bfe8ff"); pts([[4, 4], [5, 3]], W); r(3, 12, 12, 12, "#c8c8c8"); }
  if (wear.has("propeller")) { r(5, 3, 10, 4, "#ffd23f"); pts([[5, 3], [6, 4], [9, 3], [10, 4]], "#2f6fde"); pts([[7, 2], [8, 2]], "#3a3a3a"); r(4, 1, 6, 1, "#4cc3ff"); r(9, 1, 11, 1, "#4cc3ff"); pts([[7, 1], [8, 1]], "#3a3a3a"); }
  if (wear.has("party")) { pts([[7, 0], [8, 0]], "#ffd23f"); r(7, 1, 8, 1, "#ff7eb6"); r(6, 2, 9, 2, "#1fb5a8"); r(6, 3, 9, 3, "#ff7eb6"); r(5, 4, 10, 4, "#1fb5a8"); }
  if (wear.has("headphones")) { r(4, 3, 11, 3, "#3a3a3a"); pts([[3, 4], [12, 4], [3, 5], [12, 5]], "#3a3a3a"); r(2, 6, 3, 9, "#7d4cdb"); r(12, 6, 13, 9, "#7d4cdb"); pts([[2, 6], [13, 6]], "#a98cf0"); }
  if (wear.has("shades")) { r(lx - 1, 7, lx + 1, 8, "#111111"); r(rx - 1, 7, rx + 1, 8, "#111111"); r(lx + 2, 7, rx - 2, 7, "#111111"); pts([[lx - 1, 7], [rx - 1, 7]], "#7a7a7a"); }
  if (wear.has("monocle")) { r(rx - 1, 6, rx + 1, 6, "#ffd23f"); pts([[rx - 1, 7], [rx + 1, 7], [rx - 1, 8], [rx + 1, 8]], "#ffd23f"); r(rx - 1, 9, rx + 1, 9, "#ffd23f"); pts([[rx + 1, 10], [rx + 2, 11]], "#c99a1a"); }
  if (wear.has("mustache")) { r(5, 9, 10, 9, "#2b1d14"); pts([[4, 10], [11, 10]], "#2b1d14"); }
  if (wear.has("bowtie")) { r(5, 12, 6, 13, "#2f6fde"); r(9, 12, 10, 13, "#2f6fde"); r(7, 12, 8, 13, "#1d2b6b"); }
  if (wear.has("medal")) { pts([[6, 12], [9, 12], [6, 13], [9, 13]], "#2f6fde"); r(7, 14, 8, 15, "#ffd23f"); pts([[8, 15]], "#c99a1a"); }
  if (wear.has("scarf")) { r(3, 12, 12, 12, "#ff8c1a"); r(9, 13, 10, 15, "#ff8c1a"); pts([[9, 14], [10, 12]], "#ffd23f"); }
  if (wear.has("chain")) { pts([[5, 12], [6, 13], [7, 14], [8, 14], [9, 13], [10, 12]], "#ffd23f"); pts([[7, 15], [8, 15]], "#8d5524"); pts([[7, 16]], "#5c3a21"); }
  if (wear.has("cone")) { r(7, 0, 8, 0, "#2e9e44"); r(6, 1, 9, 1, "#5c3a21"); r(5, 2, 10, 2, "#8d5524"); r(4, 3, 11, 3, "#5c3a21"); r(4, 4, 11, 4, "#8d5524"); pts([[6, 2], [9, 2], [5, 3], [8, 3], [11, 3], [6, 4], [9, 4]], "#b5651d"); }
  if (wear.has("halo")) { r(5, 0, 10, 0, "#ffd23f"); pts([[4, 1], [11, 1]], "#ffd23f"); r(5, 2, 10, 2, "#e8c15a"); pts([[6, 0]], "#fff6c2"); }
  if (wear.has("pirate")) { r(5, 1, 10, 1, "#1b1b1f"); r(3, 2, 12, 3, "#1b1b1f"); r(2, 4, 13, 4, "#1b1b1f"); r(3, 5, 12, 5, "#ffd23f"); pts([[7, 2], [8, 2], [7, 3]], "#ffffff"); pts([[2, 3], [13, 3]], "#1b1b1f"); }
  if (wear.has("antenna")) { pts([[4, 0], [11, 0]], "#8bd346"); pts([[5, 1], [10, 1], [5, 2], [10, 2]], "#3a3a3a"); r(4, 3, 11, 3, "#3a3a3a"); pts([[4, 0]], "#a8f0c8"); }
  if (wear.has("parrot")) { pts([[13, 10], [14, 10]], "#4cc3ff"); pts([[15, 11]], "#3a3a3a"); pts([[14, 11]], "#111111"); r(12, 11, 13, 13, "#2f6fde"); pts([[12, 12], [12, 13]], "#ffd23f"); pts([[13, 14], [13, 15]], "#1d4fae"); }
  return { g, S, T, sleeve: shirt === 6 ? 0 : SLEEVE[shirt] };
}

const ARMS = {
  down: { 12: "ss..", 13: "ss..", 14: "aa..", 15: "aa..", 16: "hh.." },
  back: { 12: "ss..", 13: "ss..", 14: "aa..", 15: "hh.." },
  up1: { 7: "..hh", 8: "..hh", 9: "..a.", 10: ".aa.", 11: ".ss.", 12: "ss.." },
  up2: { 7: ".hh.", 8: ".hh.", 9: ".a..", 10: ".a..", 11: ".ss.", 12: "ss.." },
  out: { 12: "ss..", 13: "ssa.", 14: "..ah", 15: "...h" },
};
const FRAMES = [["down", "down", 0], ["back", "down", 1], ["down", "back", 2], ["down", "up1", 0], ["down", "up2", 0], ["down", "out", 0], ["out", "down", 0], ["up1", "down", 0], ["up2", "down", 0]];
export const F_IDLE = 0, F_WALK = [1, 2], F_WAVE = { r: [3, 4], l: [7, 8] }, F_SHAKE = { r: 5, l: 6 };
const inArm = (x, y) => y >= 12 && y <= 16 && (x === 2 || x === 3 || x === 12 || x === 13);

function frame(b, spec, [L, R, lift]) {
  const g = b.g.slice(), o = spec.o;
  for (let i = 0; i < N; i++) {
    const ch = o[i], x = i % GW, y = (i / GW) | 0;
    if (ch === "." || inArm(x, y)) continue;
    g[i] = ch === "x" ? null : COLORS[CH.indexOf(ch)];
  }
  if (lift) {
    const x0 = lift === 1 ? 0 : 8, x1 = lift === 1 ? 7 : 15;
    for (let y = 20; y < GH; y++) for (let x = x0; x <= x1; x++) g[y * GW + x] = y < GH - 1 ? g[(y + 1) * GW + x] : null;
  }
  const arm = (pose, side) => {
    const t = ARMS[pose];
    Object.keys(t).forEach((yy) => {
      const row = t[yy], y = +yy;
      for (let d = 0; d < 4; d++) {
        const ch = row[d];
        if (ch === ".") continue;
        const x = side === "r" ? 12 + d : 3 - d;
        const col = ch === "h" ? b.S : ch === "s" ? (b.sleeve ? b.T : b.S) : b.sleeve === 2 ? b.T : b.S;
        g[y * GW + x] = col;
      }
    });
    if (pose !== "down" && pose !== "back") return;
    for (let y = 12; y <= (pose === "back" ? 15 : 16); y++) for (const x of side === "r" ? [12, 13] : [2, 3]) {
      const ch = o[y * GW + x];
      if (ch !== ".") g[y * GW + x] = ch === "x" ? null : COLORS[CH.indexOf(ch)];
    }
  };
  arm(L, "l");
  arm(R, "r");
  const f = new Array(FW * FH).fill(null);
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) f[(y + 1) * FW + x + 1] = g[y * GW + x];
  const out = f.slice();
  for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
    if (f[y * FW + x]) continue;
    if ((x > 0 && f[y * FW + x - 1]) || (x < FW - 1 && f[y * FW + x + 1]) || (y > 0 && f[(y - 1) * FW + x]) || (y < FH - 1 && f[(y + 1) * FW + x])) out[y * FW + x] = OUT;
  }
  return out;
}

export function sheet(spec) {
  const b = body(spec), cv = document.createElement("canvas");
  cv.width = FW * FRAMES.length; cv.height = FH;
  const c = cv.getContext("2d"), img = c.createImageData(cv.width, FH);
  FRAMES.forEach((fr, n) => {
    const f = frame(b, spec, fr);
    f.forEach((col, i) => {
      if (!col) return;
      const [rr, gg, bb] = rgb(col), x = n * FW + (i % FW), y = (i / FW) | 0, k = (y * cv.width + x) * 4;
      img.data[k] = rr; img.data[k + 1] = gg; img.data[k + 2] = bb; img.data[k + 3] = 255;
    });
  });
  c.putImageData(img, 0, 0);
  return cv;
}

export function paintFrame(cv, sh, n, k = 1) {
  if (cv.width !== FW * k) { cv.width = FW * k; cv.height = FH * k; }
  const c = cv.getContext("2d");
  c.imageSmoothingEnabled = false;
  c.clearRect(0, 0, cv.width, cv.height);
  c.drawImage(sh, n * FW, 0, FW, FH, 0, 0, FW * k, FH * k);
}

export function itemArt(cv, id, k = 2) {
  const spec = { p: "0000000", c: "0000000", o: ".".repeat(N), w: [id] };
  const b = body(spec), base = body({ ...spec, w: [] });
  cv.width = FW * k; cv.height = 14 * k;
  const c = cv.getContext("2d"), y0 = { back: 9, neck: 10, face: 4, pet: 6 }[itemOf(id)[2]] || 0;
  for (let i = 0; i < N; i++) {
    const x = i % GW, y = (i / GW) | 0;
    if (!b.g[i] || b.g[i] === base.g[i] || y < y0 || y >= y0 + 14) continue;
    c.fillStyle = b.g[i];
    c.fillRect((x + 1) * k, (y - y0) * k, k, k);
  }
}

export const wardrobe = () => store.get("gl-wardrobe", []).filter((x) => itemOf(x));
export function addPrize(id) {
  const w = wardrobe();
  if (!w.includes(id)) w.push(id);
  store.set("gl-wardrobe", w);
}
export const mine = () => store.get("gl-folks-mine", []).filter((x) => typeof x === "string");

const SAY = {
  hi: ["Hi!", "Hello!", "Hey there!", "Cześć!", "Yo!", "*waves*"],
  greet: ["Hi {n}!", "Hey {n}!", "Oh, {n}!", "Long time no see, {n}!", "Nice outfit, {n}!", "Hello, {n}."],
  hangar: ["Rockets!", "So many rockets.", "When is the next launch?", "That orange one!"],
  board: ["Reading the cork board...", "Ha, nice card.", "Who drew this?", "I should pin something."],
  claw: ["Come on, claw...", "I want the crown!", "Just one more try.", "Almost had it!"],
  booth: ["New outfit?", "Looking good.", "Changing booth!"],
  games: ["One more game.", "High score time!", "Pixels!"],
  printing: ["Smells like PLA.", "Brrr, the printer hums."],
  software: ["Beep boop.", "So many apps."],
  rockets: ["3, 2, 1...", "Liftoff!", "Big red button?"],
  reviews: ["Five stars!", "I should write a review."],
  guestbook: ["Signing the guestbook.", "Mail time!"],
  about: ["Gzowo 34, got it."],
  mural: ["Nice wall.", "Who painted that?", "I want to spray too."],
  idle: ["What a nice day.", "La la la.", "Hmm...", "I like it here.", "Where was I going?"],
  camp: ["Warm!", "Pass the sausages.", "I love a good fire.", "Look at the sparks!", "Who has marshmallows?", "Best seat on the plot."],
  cinema: ["Shh, the film!", "Popcorn?", "Great picture.", "I love this part.", "Front row!"],
  prints: ["What is it printing?", "Layer by layer...", "I want one of those."],
  kiosk: ["Any legendaries?", "One more pack..."],
  work: ["Busy, busy.", "On the clock!", "Almost done.", "Hard at work.", "This pays well.", "Back to it."],
};

export function createFolks(world) {
  const spots = world.querySelector(".spots");
  const booth = document.createElement("button");
  booth.type = "button";
  booth.className = "spot spot-booth";
  booth.dataset.place = "booth";
  booth.setAttribute("aria-label", "Changing booth, make your own folk");
  booth.innerHTML = `<img class="spr" src="/assets/map/booth.webp" alt="" draggable="false"><span class="spot-l"><b>Folks</b><em>make your own</em></span>`;
  spots.append(booth);
  const tag = document.createElement("span");
  tag.className = "fk-tag";
  tag.hidden = true;
  world.append(tag);

  const cache = new Map(), walkers = new Map(), hubs = new Map();
  let g = null, k = 2, paused = false, raf = 0, last = 0, first = true, card = null, jurekAt = 0, polling = null, draft = null;

  const pointAt = (s) => {
    const { pts, len, total } = g.path;
    s = Math.max(0, Math.min(total, s));
    let lo = 0, hi = len.length - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (len[mid] < s) lo = mid; else hi = mid; }
    const t = len[hi] === len[lo] ? 0 : (s - len[lo]) / (len[hi] - len[lo]);
    return [pts[lo][0] + (pts[hi][0] - pts[lo][0]) * t, pts[lo][1] + (pts[hi][1] - pts[lo][1]) * t];
  };
  const R = (a, b) => a + Math.random() * (b - a);
  const viewX = () => { const p = window.gzMap && window.gzMap.pan; return p ? p.scrollLeft : 0; };

  const nearS = ([x, y]) => {
    let best = 0, bd = Infinity;
    g.path.pts.forEach((q, i) => { const d = Math.hypot(q[0] - x, q[1] - y); if (d < bd) { bd = d; best = i; } });
    return g.path.len[best];
  };
  function jobS(F) {
    const key = F.job.key, st = g.stations.find((x) => x.key === key);
    const base = key === "fish" ? g.trip.s : key === "garden" ? nearS([g.garden.x + g.garden.w / 2, g.garden.y + g.garden.h]) : st ? st.s : F.s;
    let h = 0;
    for (let i = 0; i < F.id.length; i++) h = (h * 31 + F.id.charCodeAt(i)) >>> 0;
    return Math.max(0, Math.min(g.path.total, base + ((h % 7) - 3) * 0.3 * g.person));
  }
  function freeSeat(F) {
    const h = F.hub && hubs.get(F.hub.key);
    if (h && h.taken.get(F.hub.seat) === F.id) h.taken.delete(F.hub.seat);
    F.hub = null;
  }
  function leave(F) {
    freeSeat(F);
    F.sit = false; F.state = "back"; F.to = pointAt(F.s);
    hush(F);
  }
  function endJob(F, t) {
    F.job = null; F.toJob = false;
    if (F.extra) { drop(F); return; }
    F.state = "idle"; F.until = t + 900;
    say(F, "Shift over!", 2000);
  }

  function nearStation(x, y) {
    let best = null, bd = Infinity;
    (g.stations || []).forEach((st) => { const d = g.mode === "tall" ? Math.hypot(st.x - x, st.y - y) : Math.abs(st.x - x); if (d < bd) { bd = d; best = st; } });
    return best;
  }

  function say(F, line, ms = 2600) {
    if (!F.bub) {
      F.bub = document.createElement("div");
      F.bub.className = "psx-say fk-say";
      F.bub.setAttribute("aria-hidden", "true");
      F.bub.innerHTML = `<div class="psx-b"><span class="psx-t"></span></div>`;
      world.append(F.bub);
    }
    F.bub.querySelector(".psx-t").textContent = line;
    F.bub.classList.remove("on");
    void F.bub.offsetWidth;
    F.bub.classList.add("on");
    F.bw = F.bub.offsetWidth || 120;
    F.bh = F.bub.offsetHeight || 30;
    F.bubUntil = performance.now() + ms;
  }
  const hush = (F) => { if (F.bub) F.bub.classList.remove("on"); F.bubUntil = 0; };
  const line = (key, n) => pick(SAY[key] || SAY.idle).replace("{n}", n || "friend");

  function poof(x, y) {
    const e = document.createElement("i");
    e.className = "fk-poof";
    e.style.cssText = `left:${x}px;top:${y}px;--k:${k};z-index:${Math.round(y) + 2}`;
    world.append(e);
    setTimeout(() => e.remove(), 700);
  }

  function spawn(id, rec, where) {
    const F = { id, rec, sh: sheet(rec), el: document.createElement("canvas"), s: 0, x: 0, y: 0, state: "idle", until: performance.now() + R(400, 2500),
      target: 0, key: "", fr: -1, want: 0, side: "r", ph: 0, met: 0, greeted: new Map(), z: 0 };
    F.el.className = "fk";
    F.el.setAttribute("role", "button");
    F.el.tabIndex = 0;
    F.el.setAttribute("aria-label", `${rec.n}, a visitor's folk`);
    F.el.dataset.folk = id;
    if (where === "random" || !g) F.s = Math.random() * (g ? g.path.total : 0);
    else F.s = where;
    if (g) [F.x, F.y] = pointAt(F.s);
    world.append(F.el);
    walkers.set(id, F);
    paintFrame(F.el, F.sh, F_IDLE, k);
    F.fr = F_IDLE;
    place(F);
    return F;
  }

  function drop(F) {
    freeSeat(F);
    poof(F.x, F.y - FH * k * 0.4);
    F.el.remove();
    if (F.bub) F.bub.remove();
    walkers.delete(F.id);
  }

  function place(F) {
    const w = FW * k, h = FH * k;
    if (!!F.sit !== !!F.sat) { F.sat = !!F.sit; F.el.classList.toggle("is-sit", F.sat); }
    F.el.style.transform = `translate(${Math.round(F.x - w / 2)}px,${Math.round(F.y - h + k * (F.sit ? 6 : 2))}px)`;
    const z = Math.round(F.y);
    if (z !== F.z) { F.z = z; F.el.style.zIndex = z; }
    if (F.bub && F.bub.classList.contains("on")) {
      const bw = F.bw, bh = F.bh, right = F.x - 18 + bw > g.W - 4;
      const bx = right ? Math.max(4, F.x + 18 - bw) : Math.max(4, F.x - 18);
      F.bub.dataset.side = right ? "l" : "r";
      F.bub.style.transform = `translate(${Math.round(bx)}px,${Math.round(F.y - h - bh + k * 3)}px)`;
    }
  }

  function show(F, n) { if (F.fr !== n) { F.fr = n; paintFrame(F.el, F.sh, n, k); } }

  function next(F, t) {
    if (F.job) { F.toJob = true; F.key = ""; F.target = jobS(F); F.state = "walk"; hush(F); return; }
    if (F.hub) {
      const h = hubs.get(F.hub.key);
      if (h && h.on) { F.target = nearS(h.seats[F.hub.seat]); F.state = "walk"; return; }
      freeSeat(F);
    }
    const open = [...hubs.values()].filter((h) => h.on && Math.random() < h.pull && h.seats.some((_, i) => !h.taken.has(i)));
    if (open.length) {
      const h = open[Math.floor(Math.random() * open.length)], free = h.seats.map((_, i) => i).filter((i) => !h.taken.has(i)), i = free[Math.floor(Math.random() * free.length)];
      h.taken.set(i, F.id);
      F.hub = { key: h.key, seat: i };
      F.key = ""; F.target = nearS(h.seats[i]); F.state = "walk"; hush(F);
      return;
    }
    const roll = Math.random();
    if (roll < 0.58) {
      const near = g.stations.filter((st) => st.key !== F.key).sort((a, b) => Math.abs(a.s - F.s) - Math.abs(b.s - F.s));
      const st = near[Math.floor(Math.random() * Math.min(4, near.length))];
      if (st) { F.key = st.key; F.target = st.s + R(-0.6, 0.6) * g.person; F.state = "walk"; hush(F); return; }
    }
    if (roll < 0.72) { F.key = ""; F.target = Math.max(0, Math.min(g.path.total, F.s + R(-4, 4) * g.person)); F.state = "walk"; hush(F); return; }
    if (roll < 0.86) { F.state = "wave"; F.side = Math.random() < 0.5 ? "r" : "l"; F.until = t + 1700; if (Math.random() < 0.6) say(F, F.rec.l || line("hi"), 2200); return; }
    F.state = "idle"; F.until = t + R(1500, 4000);
    if (Math.random() < 0.5) say(F, F.rec.l && Math.random() < 0.6 ? F.rec.l : line("idle"), 2600);
  }

  function arrive(F, t) {
    if (F.toJob && F.job) { F.toJob = false; F.state = "work"; F.chat = t + R(2500, 7000); return; }
    if (F.hub) {
      const h = hubs.get(F.hub.key);
      if (h && h.on) { F.state = "go"; F.to = h.seats[F.hub.seat]; return; }
      freeSeat(F);
    }
    F.state = "idle";
    F.until = t + (F.key ? R(3000, 6500) : R(800, 2500));
    if (F.key && Math.random() < 0.55) say(F, line(F.key), 2600);
  }

  function meetings(t) {
    const list = [...walkers.values()].filter((F) => F.state === "walk" || F.state === "idle");
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
      const a = list[i], b = list[j], dx = b.x - a.x;
      if (Math.abs(dx) > g.person * 0.9 || Math.abs(dx) < g.person * 0.3 || Math.abs(b.y - a.y) > g.person * 0.3) continue;
      if (t - (a.greeted.get(b.id) || -1e9) < 90000 || Math.random() > 0.5) { a.greeted.set(b.id, t); b.greeted.set(a.id, t); continue; }
      a.greeted.set(b.id, t); b.greeted.set(a.id, t);
      a.state = b.state = "wave";
      a.side = dx > 0 ? "r" : "l"; b.side = dx > 0 ? "l" : "r";
      a.until = t + 2400; b.until = t + 2400;
      say(a, line("greet", b.rec.n), 2000);
      setTimeout(() => { if (walkers.has(b.id)) say(b, line("greet", a.rec.n), 1900); }, 900);
    }
    const J = window.gzJurek;
    if (!J || J.trip || t - jurekAt < 12000 || document.documentElement.classList.contains("lock")) return;
    for (const F of list) {
      const dx = J.x - F.x;
      if (Math.abs(dx) > g.person * 0.95 || Math.abs(dx) < g.person * 0.4 || Math.abs(J.y - F.y) > g.person * 0.35 || t - F.met < 60000) continue;
      F.met = jurekAt = t;
      F.state = "meet"; F.side = dx > 0 ? "r" : "l"; F.until = t + 2600;
      hush(F);
      dispatchEvent(new CustomEvent("gz:folk-meet", { detail: { x: F.x, name: F.rec.n } }));
      setTimeout(() => { if (walkers.has(F.id)) say(F, F.rec.l || pick(["Hi Jurek!", "Nice plot, Jurek!", "Jurek! Big fan.", "Cool rockets, Jurek!"]), 2200); }, 1000);
      break;
    }
  }

  function loop(t) {
    raf = 0;
    if (paused || !g || document.hidden || !walkers.size) return;
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.1, (t - (last || t)) / 1000);
    last = t;
    const speed = g.speed * 0.55;
    for (const F of walkers.values()) {
      F.ph += dt;
      if (F.state === "walk") {
        const d = F.target - F.s;
        F.s += Math.sign(d) * Math.min(Math.abs(d), speed * dt);
        [F.x, F.y] = pointAt(F.s);
        if (Math.abs(F.target - F.s) < 1) arrive(F, t);
        show(F, F_WALK[Math.floor(F.ph / 0.17) % 2]);
      } else if (F.state === "go" || F.state === "back") {
        const dx = F.to[0] - F.x, dy = F.to[1] - F.y, d = Math.hypot(dx, dy), st = speed * dt;
        if (d <= st) {
          F.x = F.to[0]; F.y = F.to[1];
          if (F.state === "go") {
            F.state = "sit"; F.sit = true; F.until = t + R(28000, 70000); F.chat = t + R(6000, 16000);
            if (Math.random() < 0.6) say(F, line(F.hub.key), 2600);
          } else { F.state = "idle"; F.until = t + R(400, 1400); }
        } else { F.x += (dx / d) * st; F.y += (dy / d) * st; }
        show(F, F.state === "sit" ? F_IDLE : F_WALK[Math.floor(F.ph / 0.17) % 2]);
      } else if (F.state === "sit") {
        const h = F.hub && hubs.get(F.hub.key);
        if (t > F.until || !h || !h.on || F.job) leave(F);
        else if (t > F.chat) { F.chat = t + R(9000, 22000); if (Math.random() < 0.5) say(F, line(F.hub.key), 2400); }
        show(F, F_IDLE);
      } else if (F.state === "work") {
        if (!F.job || Date.now() > F.job.until) endJob(F, t);
        else {
          show(F, F_WAVE[F.side][Math.floor(F.ph / 0.5) % 2]);
          if (t > F.chat) { F.chat = t + R(10000, 24000); say(F, line("work"), 2200); }
        }
      } else {
        if (t > F.until) next(F, t);
        if (F.state === "wave") show(F, F_WAVE[F.side][Math.floor(F.ph / 0.22) % 2]);
        else if (F.state === "meet") show(F, F.until - t < 1900 ? F_SHAKE[F.side] : F_IDLE);
        else if (F.state !== "walk") show(F, F_IDLE);
      }
      if (F.bubUntil && t > F.bubUntil) hush(F);
      place(F);
    }
    meetings(t);
  }
  const wake = () => { if (!raf && !paused && g && walkers.size && !document.hidden) { last = 0; raf = requestAnimationFrame(loop); } };

  async function poll() {
    if (document.hidden || paused) return;
    const on = await get(`${PLOT}/folksOn.json?orderBy="$value"&limitToLast=10`);
    if (!on || typeof on !== "object") return;
    const ids = Object.keys(on).filter((id) => Number.isFinite(on[id]));
    await Promise.all(ids.filter((id) => !cache.has(id) || cache.get(id).on !== on[id]).map(async (id) => {
      const [f, w] = await Promise.all([get(`${PLOT}/folks/${id}.json`), get(`${PLOT}/wear/${id}.json`)]);
      if (!f) return;
      const rec = parse(f);
      rec.w = parseWear(w);
      rec.on = on[id];
      cache.set(id, rec);
    }));
    if (!g) return;
    walkers.forEach((F) => { if (ids.includes(F.id)) F.extra = false; else if (F.job) F.extra = true; else drop(F); });
    ids.forEach((id) => {
      const rec = cache.get(id);
      if (!rec) return;
      const F = walkers.get(id);
      if (F && F.rec === rec) return;
      if (F) { F.rec = rec; F.sh = sheet(rec); F.fr = -1; show(F, F_IDLE); poof(F.x, F.y - FH * k * 0.4); say(F, line("hi"), 1800); return; }
      if (first && Date.now() - rec.on > 90000) { spawn(id, rec, "random"); return; }
      const bs = g.stations.find((st) => st.key === "booth"), br = booth.getBoundingClientRect();
      const st = bs && br.right > 0 && br.left < innerWidth && br.bottom > 0 && br.top < innerHeight ? bs : nearStation(viewX() + g.V / 2, scrollY + innerHeight / 2);
      const N2 = spawn(id, rec, st ? st.s : "random");
      poof(N2.x, N2.y - FH * k * 0.4);
      N2.until = performance.now() + 1500;
      say(N2, rec.l || line("hi"), 2400);
    });
    first = false;
    wake();
  }

  function hideTag() { tag.hidden = true; }
  world.addEventListener("pointerover", (e) => {
    const c = e.target.closest && e.target.closest(".fk");
    if (!c) return;
    const F = walkers.get(c.dataset.folk);
    if (!F) return;
    tag.textContent = F.rec.n + (F.job ? ", at work" : "");
    tag.hidden = false;
    tag.style.cssText = `left:${Math.round(F.x)}px;top:${Math.round(F.y + k * 2)}px;z-index:${F.z + 1}`;
  });
  world.addEventListener("pointerout", (e) => { if (e.target.closest && e.target.closest(".fk")) hideTag(); });

  function closeCard() { if (card) { card.remove(); card = null; } }
  function openCard(F, cx, cy) {
    closeCard();
    card = document.createElement("div");
    card.className = "fk-card";
    card.setAttribute("role", "dialog");
    card.setAttribute("aria-label", F.rec.n);
    const age = Math.max(0, Math.round((Date.now() - F.rec.t) / 86400000));
    card.innerHTML = `<header class="tb"><span class="tb-t">${esc(F.rec.n)}</span><span class="tb-btns"><button class="tb-x" type="button" data-fk-x aria-label="Close"></button></span></header>
<div class="fk-cb"><canvas></canvas><div><p class="fk-cn">${esc(F.rec.n)}</p>${F.rec.l ? `<p class="fk-cl">“${esc(F.rec.l)}”</p>` : ""}<p class="fk-cd">${age === 0 ? "Made today" : `Made ${age} day${age === 1 ? "" : "s"} ago`}${mine().includes(F.id) ? ", yours" : ""}</p></div></div>
<p class="fk-ca"><button class="btn" type="button" data-fk-hi>Say hi</button>${mine().includes(F.id) ? `<button class="btn" type="button" data-fk-work>Send to work</button>` : ""}<button class="btn" type="button" data-folks="make">Make your own</button><button class="btn" type="button" data-folks="index">All folks</button></p>`;
    paintFrame(card.querySelector("canvas"), F.sh, F_WAVE.r[0], 3);
    document.body.append(card);
    const r = card.getBoundingClientRect();
    card.style.left = Math.max(4, Math.min(innerWidth - r.width - 4, cx - r.width / 2)) + "px";
    card.style.top = Math.max(4, Math.min(innerHeight - r.height - 50, cy - r.height - 16)) + "px";
    card.addEventListener("click", (e) => {
      if (e.target.closest("[data-fk-x]")) closeCard();
      else if (e.target.closest("[data-fk-hi]")) { F.state = "wave"; F.side = "r"; F.until = performance.now() + 2000; say(F, F.rec.l || line("hi"), 2400); wake(); closeCard(); }
      else if (e.target.closest("[data-fk-work]")) workMenu(F);
      else if (e.target.closest("[data-fk-job]")) hire(F, e.target.closest("[data-fk-job]"));
    });
  }
  async function workMenu(F) {
    const box = card.querySelector(".fk-ca"), B = window.gzBank;
    box.innerHTML = `<span class="fk-wn">Asking around the plot...</span>`;
    try {
      await B.ensure();
      const j = await B.api("/work");
      if (!card || !box.isConnected) return;
      const mins = (ms) => { const m = Math.max(1, Math.ceil((ms - Date.now()) / 60000)); return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`; };
      if (j.job) {
        box.innerHTML = j.job.done ? `<span class="fk-wn">${esc(j.job.name)} is back from work.</span><button class="btn" type="button" data-work-collect>Collect the pay</button>`
          : `<span class="fk-wn">${esc(j.job.name)} is out ${esc(j.job.what.toLowerCase())}, back in ${mins(j.job.until)}. One shift at a time.</span>`;
        return;
      }
      const hrs = j.hours >= 1 ? `${Math.round(j.hours)} hours` : `${Math.round(j.hours * 3600)} seconds`;
      box.innerHTML = `<span class="fk-wn">A shift costs ${j.cost} szyszki and takes ${hrs}. ${esc(F.rec.n)} comes back with the pay: usually more than it cost, sometimes less.</span>` +
        Object.entries(j.jobs).map(([key, name]) => `<button class="btn" type="button" data-fk-job="${key}">${esc(name)}</button>`).join("");
    } catch (err) { if (box.isConnected) box.innerHTML = `<span class="fk-wn">${esc(err.message)}</span>`; }
  }

  async function hire(F, btn) {
    const B = window.gzBank, box = card.querySelector(".fk-ca");
    btn.disabled = true;
    try {
      await B.api("/work/hire", { folk: F.id, job: btn.dataset.fkJob });
      B.toast(`${F.rec.n} went to work. Come back later for the pay.`);
      closeCard();
      B.poll();
    } catch (err) { if (box.isConnected) box.insertAdjacentHTML("afterbegin", `<span class="fk-wn fk-err">${esc(err.message)}</span>`); btn.disabled = false; }
  }

  async function setJobs(list) {
    const jobs = Array.isArray(list) ? list : [], live = new Set(jobs.map((j) => j.folk));
    walkers.forEach((F) => { if (F.job && !live.has(F.id)) endJob(F, performance.now()); });
    if (!g) return;
    for (const j of jobs) {
      if (!walkers.has(j.folk)) {
        let rec = cache.get(j.folk);
        if (!rec) {
          const [f, w] = await Promise.all([get(`${PLOT}/folks/${j.folk}.json`), get(`${PLOT}/wear/${j.folk}.json`)]);
          if (!f) continue;
          rec = parse(f);
          rec.w = parseWear(w);
          rec.on = 0;
          cache.set(j.folk, rec);
        }
        if (!walkers.has(j.folk)) spawn(j.folk, rec, "random").extra = true;
      }
      const F = walkers.get(j.folk);
      if (F.job) { F.job.until = j.until; continue; }
      F.job = { key: j.job, until: j.until };
      if (F.state === "sit") leave(F);
      else if (F.state === "idle" || F.state === "wave") F.until = 0;
    }
    wake();
  }
  addEventListener("gz:pulse", (e) => { if (e.detail) setJobs(e.detail.jobs); });
  addEventListener("gz:hub", (e) => {
    const d = e.detail, h = hubs.get(d.key) || { key: d.key, taken: new Map() };
    h.on = !!d.on; h.seats = d.seats; h.pull = d.pull || 0.34;
    hubs.set(d.key, h);
    walkers.forEach((F) => {
      if (!F.hub || F.hub.key !== d.key) return;
      if (F.state === "sit") { if (h.on) { [F.x, F.y] = h.seats[F.hub.seat]; place(F); } else leave(F); }
      else if (F.state === "go") F.to = h.seats[F.hub.seat];
    });
    wake();
  });

  world.addEventListener("click", (e) => {
    const c = e.target.closest(".fk");
    if (!c) return;
    const F = walkers.get(c.dataset.folk);
    if (F) openCard(F, e.clientX, e.clientY);
  });
  world.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const c = e.target.closest && e.target.closest(".fk");
    if (!c) return;
    e.preventDefault();
    const F = walkers.get(c.dataset.folk), r = c.getBoundingClientRect();
    if (F) openCard(F, r.left + r.width / 2, r.top);
  });
  document.addEventListener("pointerdown", (e) => { if (card && !e.target.closest(".fk-card, .fk")) closeCard(); });

  booth.addEventListener("click", (e) => { e.preventDefault(); openEditor(); });
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-folks]");
    if (!b) return;
    e.preventDefault();
    closeCard();
    if (b.dataset.folks === "make") openEditor(); else openIndex();
  });

  function openEditor(seed) {
    const D2 = window.gzDesk;
    if (!D2) return;
    const el = D2.open({ id: "folk-make", title: "Folk Maker", icon: "person", cls: "w-folk", body: editorHtml(), status: `<span>16 x 24 pixels</span><span>Parts, colors and your own paint</span>` });
    if (!el.dataset.ready) { el.dataset.ready = "1"; wireEditor(el, seed); }
  }

  function editorHtml() {
    const rows = LAYERS.map(([key, label], i) => `<div class="fe-row" data-layer="${i}"><span class="fe-l">${label}</span><button class="fe-a" type="button" data-step="-1" aria-label="Previous ${label.toLowerCase()}">&#9664;</button><span class="fe-v" data-v></span><button class="fe-a" type="button" data-step="1" aria-label="Next ${label.toLowerCase()}">&#9654;</button><button class="fe-sw" type="button" data-sw aria-label="${label} color"></button></div>`).join("");
    const pal = COLORS.map((c, i) => `<button type="button" class="fe-c" data-c="${i}" style="background:${c}" aria-label="Color ${i + 1}"></button>`).join("");
    return `<div class="fe"><div class="fe-left"><canvas class="fe-cv" width="216" height="312" aria-label="Paint your folk, pixel by pixel"></canvas>
<div class="fe-tools" role="group" aria-label="Paint tools"><button class="btn on" type="button" data-tool="pen" aria-pressed="true">Pencil</button><button class="btn" type="button" data-tool="erase" aria-pressed="false">Eraser</button><button class="btn" type="button" data-tool="undo-paint" aria-pressed="false">Unpaint</button><button class="btn" type="button" data-tool="pick" aria-pressed="false">Picker</button></div>
<div class="fe-pal" role="group" aria-label="Paint color">${pal}</div>
<p class="fe-acts"><button class="btn" type="button" data-undo>Undo</button><button class="btn" type="button" data-clear>Clear paint</button></p></div>
<div class="fe-right"><div class="fe-prev"><canvas></canvas><canvas></canvas><canvas></canvas></div>${rows}
<div class="fe-wear" data-wear></div>
<label class="fe-f">Name <input name="n" maxlength="16" autocomplete="off" required></label>
<label class="fe-f">What does it say? <input name="l" maxlength="60" autocomplete="off" placeholder="Optional, it says this when it waves"></label>
<p class="fe-acts"><button class="btn" type="button" data-random>Random</button><button class="btn" type="button" data-folks="index">All folks</button><button class="btn go" type="button" data-out>Let it out!</button></p>
<p class="fe-note" role="status"></p></div><div class="fe-pop" hidden></div></div>`;
  }

  let typed = ["", ""];
  function wireEditor(el, seed) {
    let spec = seed ? { ...seed, w: [] } : draft || randomSpec(), tool = "pen", color = 10, layerPick = -1, undo = [], drag = null, sh = null;
    const cv = el.querySelector(".fe-cv"), cx = cv.getContext("2d"), pop = el.querySelector(".fe-pop"), note = el.querySelector(".fe-note");
    const prev = [...el.querySelectorAll(".fe-prev canvas")];
    const own = wardrobe();
    const owned = el.querySelector("[data-wear]"), fields = [el.querySelector("[name=n]"), el.querySelector("[name=l]")];
    fields.forEach((f, i) => { f.value = typed[i]; f.addEventListener("input", () => { typed[i] = f.value; }); });
    owned.innerHTML = own.length ? `<span class="fe-l">Prizes</span>` + own.map((id) => `<button type="button" class="fe-it" data-item="${id}" aria-pressed="false" title="${esc(itemOf(id)[1])}"><canvas></canvas></button>`).join("") : `<span class="fe-l">Prizes</span><em>Win wearable prizes in the claw machine.</em>`;
    owned.querySelectorAll("[data-item]").forEach((b) => itemArt(b.querySelector("canvas"), b.dataset.item, 2));

    function render() {
      draft = spec;
      sh = sheet(spec);
      const cell = 12;
      cx.imageSmoothingEnabled = false;
      for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) { cx.fillStyle = (x + y) % 2 ? "#e8e8e8" : "#f6f6f6"; cx.fillRect(x * cell, y * cell, cell, cell); }
      cx.drawImage(sh, 0, 0, FW, FH, 0, 0, FW * cell, FH * cell);
      cx.fillStyle = "rgba(0,0,0,.07)";
      for (let x = 1; x < FW; x++) cx.fillRect(x * cell, 0, 1, FH * cell);
      for (let y = 1; y < FH; y++) cx.fillRect(0, y * cell, FW * cell, 1);
      cx.strokeStyle = "rgba(0,0,128,.35)";
      cx.strokeRect(cell + 0.5, cell + 0.5, GW * cell - 1, GH * cell - 1);
      paintFrame(prev[0], sh, F_IDLE, 3); paintFrame(prev[1], sh, F_WALK[0], 3); paintFrame(prev[2], sh, F_WAVE.r[0], 3);
      el.querySelectorAll(".fe-row").forEach((row) => {
        const i = +row.dataset.layer, v = Math.min(CH.indexOf(spec.p[i]), LAYERS[i][2].length - 1);
        row.querySelector("[data-v]").textContent = LAYERS[i][2][v];
        row.querySelector("[data-sw]").style.background = COLORS[CH.indexOf(spec.c[i])];
        row.classList.toggle("on", layerPick === i);
      });
      el.querySelectorAll(".fe-c").forEach((b) => b.classList.toggle("on", +b.dataset.c === color));
      owned.querySelectorAll("[data-item]").forEach((b) => b.setAttribute("aria-pressed", String(spec.w.includes(b.dataset.item))));
    }

    const setO = (i, ch) => { spec.o = spec.o.slice(0, i) + ch + spec.o.slice(i + 1); };
    function cellAt(e) {
      const r = cv.getBoundingClientRect(), x = Math.floor(((e.clientX - r.left) / r.width) * FW) - 1, y = Math.floor(((e.clientY - r.top) / r.height) * FH) - 1;
      return x >= 0 && y >= 0 && x < GW && y < GH ? [x, y] : null;
    }
    function dab([x, y]) {
      const i = y * GW + x;
      if (tool === "pick") {
        const d = sh.getContext("2d").getImageData(x + 1, y + 1, 1, 1).data;
        if (d[3]) {
          let best = 0, bd = Infinity;
          COLORS.forEach((c, j) => { const [a, b2, c2] = rgb(c), dd = (a - d[0]) ** 2 + (b2 - d[1]) ** 2 + (c2 - d[2]) ** 2; if (dd < bd) { bd = dd; best = j; } });
          color = best;
        }
        setTool("pen");
        return;
      }
      setO(i, tool === "pen" ? CH[color] : tool === "erase" ? "x" : ".");
    }
    function line([x0, y0], [x1, y1]) {
      const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
      let err = dx + dy;
      for (;;) {
        dab([x0, y0]);
        if (x0 === x1 && y0 === y1) break;
        const e2 = 2 * err;
        if (e2 >= dy) { err += dy; x0 += sx; }
        if (e2 <= dx) { err += dx; y0 += sy; }
      }
    }
    function setTool(t) {
      tool = t;
      el.querySelectorAll("[data-tool]").forEach((b) => { const on = b.dataset.tool === t; b.classList.toggle("on", on); b.setAttribute("aria-pressed", String(on)); });
    }
    cv.addEventListener("pointerdown", (e) => {
      const c = cellAt(e);
      if (!c) return;
      e.preventDefault();
      cv.setPointerCapture(e.pointerId);
      undo.push(spec.o);
      if (undo.length > 40) undo.shift();
      drag = c;
      dab(c);
      render();
    });
    cv.addEventListener("pointermove", (e) => {
      if (!drag || tool === "pick") return;
      const c = cellAt(e);
      if (!c || (c[0] === drag[0] && c[1] === drag[1])) return;
      line(drag, c);
      drag = c;
      render();
    });
    const end = () => { drag = null; };
    cv.addEventListener("pointerup", end);
    cv.addEventListener("pointercancel", end);

    el.addEventListener("click", (e) => {
      const t = e.target;
      const step = t.closest("[data-step]");
      if (step) {
        const i = +step.closest(".fe-row").dataset.layer, n = LAYERS[i][2].length;
        const v = (Math.min(CH.indexOf(spec.p[i]), n - 1) + +step.dataset.step + n) % n;
        spec.p = spec.p.slice(0, i) + CH[v] + spec.p.slice(i + 1);
        render();
        return;
      }
      const sw = t.closest("[data-sw]");
      if (sw) {
        const i = +sw.closest(".fe-row").dataset.layer;
        if (layerPick === i && !pop.hidden) { pop.hidden = true; layerPick = -1; render(); return; }
        layerPick = i;
        pop.innerHTML = `<p>${LAYERS[i][1]} color</p>` + COLORS.map((c, j) => `<button type="button" data-lc="${j}" style="background:${c}" aria-label="Color ${j + 1}"></button>`).join("");
        pop.hidden = false;
        const r = sw.getBoundingClientRect(), br = el.querySelector(".fe").getBoundingClientRect();
        pop.style.left = Math.max(0, Math.min(br.width - 180, r.right - br.left - 180)) + "px";
        pop.style.top = r.bottom - br.top + 4 + "px";
        render();
        return;
      }
      const lc = t.closest("[data-lc]");
      if (lc && layerPick >= 0) {
        spec.c = spec.c.slice(0, layerPick) + CH[+lc.dataset.lc] + spec.c.slice(layerPick + 1);
        pop.hidden = true; layerPick = -1;
        render();
        return;
      }
      const pc = t.closest("[data-c]");
      if (pc) { color = +pc.dataset.c; if (tool !== "pen") setTool("pen"); render(); return; }
      const tb = t.closest("[data-tool]");
      if (tb) { setTool(tb.dataset.tool); return; }
      const it = t.closest("[data-item]");
      if (it) {
        const id = it.dataset.item, slot = itemOf(id)[2];
        spec.w = spec.w.includes(id) ? spec.w.filter((x) => x !== id) : spec.w.filter((x) => itemOf(x)[2] !== slot).concat(id);
        render();
        return;
      }
      if (t.closest("[data-undo]")) { if (undo.length) { spec.o = undo.pop(); render(); } return; }
      if (t.closest("[data-clear]")) { undo.push(spec.o); spec.o = ".".repeat(N); render(); return; }
      if (t.closest("[data-random]")) { const r = randomSpec(); undo.push(spec.o); spec = { ...spec, p: r.p, c: r.c }; render(); return; }
      if (t.closest("[data-out]")) { submit(); return; }
      if (!pop.hidden && !t.closest(".fe-pop")) { pop.hidden = true; layerPick = -1; render(); }
    });
    el.addEventListener("keydown", (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.target.closest("input")) { e.preventDefault(); if (undo.length) { spec.o = undo.pop(); render(); } }
    });

    async function submit() {
      const n = el.querySelector("[name=n]").value.trim().slice(0, 16), l = el.querySelector("[name=l]").value.trim().slice(0, 60);
      if (!n) { note.textContent = "Give your folk a name first."; el.querySelector("[name=n]").focus(); return; }
      if (bad(n) || !NAME_OK.test(n)) { note.textContent = "Pick a different name (letters, numbers, spaces)."; return; }
      if (l && (bad(l) || !TEXT_OK.test(l))) { note.textContent = "Say something a bit different."; return; }
      const wait = Math.ceil((120000 - (Date.now() - store.get("gl-folk-at", 0))) / 1000);
      if (wait > 0) { note.textContent = `The booth needs ${wait} s more before the next folk.`; return; }
      const btn = el.querySelector("[data-out]");
      btn.disabled = true;
      note.textContent = "Letting it out...";
      const id = pushId(), rec = { n, p: spec.p, c: spec.c, o: spec.o, t: { ".sv": "timestamp" } };
      if (l) rec.l = l;
      try {
        await put(`${PLOT}/folks/${id}.json`, rec);
        if (spec.w.length) await put(`${PLOT}/wear/${id}.json`, spec.w.join(","));
        await put(`${PLOT}/folksOn/${id}.json`, { ".sv": "timestamp" });
        store.set("gl-folk-at", Date.now());
        store.set("gl-folks-mine", mine().concat(id).slice(-50));
        draft = null;
        typed = ["", ""];
        window.gzDesk.close("folk-make");
        dispatchEvent(new CustomEvent("gz:folk-new", { detail: n }));
        dispatchEvent(new CustomEvent("gz:folk-made", { detail: { id } }));
        poll();
      } catch (err) {
        note.textContent = "The booth is offline, try again later.";
        btn.disabled = false;
      }
    }
    render();
  }

  async function openIndex() {
    const D2 = window.gzDesk;
    if (!D2) return;
    const el = D2.open({ id: "folks", title: "Folks", icon: "person", cls: "w-folks", body: `<div class="fx"><p class="fx-top"><button class="btn go" type="button" data-folks="make">Make a new folk</button><span>Up to 10 folks walk the plot at once. Letting one out sends home the one that has been out the longest.</span></p><div class="fx-grid" data-grid><p>Loading...</p></div><p class="fx-more" hidden><button class="btn" type="button" data-older>Show older</button></p></div>`,
      status: `<span data-count>...</span><span>Every folk ever made</span>` });
    if (el.dataset.ready) { fill(el, true); return; }
    el.dataset.ready = "1";
    el.addEventListener("click", async (e) => {
      const out = e.target.closest("[data-let]");
      if (out) {
        const wait = Math.ceil((15000 - (Date.now() - store.get("gl-let-at", 0))) / 1000);
        const msg = out.closest(".fx-c").querySelector(".fx-m");
        if (wait > 0) { msg.textContent = `Wait ${wait} s`; return; }
        out.disabled = true;
        try {
          await put(`${PLOT}/folksOn/${out.dataset.let}.json`, { ".sv": "timestamp" });
          store.set("gl-let-at", Date.now());
          msg.textContent = "Out on the plot!";
          await poll();
          fill(el, true);
        } catch (err) { msg.textContent = "Offline, try later"; out.disabled = false; }
        return;
      }
      const dress = e.target.closest("[data-dress]");
      if (dress) { dressUp(el, dress.dataset.dress); return; }
      const sv = e.target.closest("[data-wear-save]");
      if (sv) {
        const c = sv.closest(".fx-c"), id = c.dataset.id, w = [...c.querySelectorAll("[data-item][aria-pressed=true]")].map((b) => b.dataset.item);
        sv.disabled = true;
        try {
          await put(`${PLOT}/wear/${id}.json`, w.join(","));
          await put(`${PLOT}/folksOn/${id}.json`, { ".sv": "timestamp" });
          cache.delete(id);
          await poll();
          fill(el, true);
        } catch (err) { sv.disabled = false; c.querySelector(".fx-m").textContent = "Offline, try later"; }
        return;
      }
      const it = e.target.closest(".fx-dress [data-item]");
      if (it) {
        const slot = itemOf(it.dataset.item)[2], on = it.getAttribute("aria-pressed") !== "true";
        it.parentNode.querySelectorAll("[data-item]").forEach((b) => { if (itemOf(b.dataset.item)[2] === slot) b.setAttribute("aria-pressed", "false"); });
        it.setAttribute("aria-pressed", String(on));
        return;
      }
      if (e.target.closest("[data-older]")) fill(el, false);
    });
    fill(el, true);
  }

  let listed = [], oldest = "";
  async function fill(el, fresh) {
    const grid = el.querySelector("[data-grid]");
    if (fresh) { listed = []; oldest = ""; }
    const q = fresh ? 'orderBy="$key"&limitToLast=60' : `orderBy="$key"&endAt=${encodeURIComponent(JSON.stringify(oldest))}&limitToLast=61`;
    const [d, on] = await Promise.all([get(`${PLOT}/folks.json?${q}`), get(`${PLOT}/folksOn.json?orderBy="$value"&limitToLast=10`)]);
    if (!d && fresh) { grid.innerHTML = "<p>The folks are offline right now.</p>"; return; }
    const ids = Object.keys(d || {}).sort().filter((id) => id !== oldest);
    const got = ids.map((id) => ({ id, ...parse(d[id]) }));
    listed = listed.concat(got);
    if (got.length) oldest = ids[0];
    el.querySelector(".fx-more").hidden = got.length < 60;
    const live = new Set(Object.keys(on || {})), my = new Set(mine());
    const wears = await Promise.all(listed.filter((f) => my.has(f.id) || live.has(f.id)).map(async (f) => [f.id, parseWear(await get(`${PLOT}/wear/${f.id}.json`))]));
    const wm = new Map(wears);
    const list = listed.slice().sort((a, b) => (b.id > a.id ? 1 : -1));
    el.querySelector("[data-count]").textContent = `${list.length}${el.querySelector(".fx-more").hidden ? "" : "+"} folks`;
    if (!list.length) { grid.innerHTML = "<p>Nobody has made a folk yet. Be the first!</p>"; return; }
    grid.innerHTML = list.map((f) => `<div class="fx-c${live.has(f.id) ? " is-on" : ""}" data-id="${f.id}" data-w="${(wm.get(f.id) || []).join(",")}"><canvas></canvas><b>${esc(f.n)}</b>${f.l ? `<q>${esc(f.l)}</q>` : ""}
<span class="fx-b">${my.has(f.id) ? "<em>yours</em>" : ""}${live.has(f.id) ? "<em class=\"fx-on\">on the plot</em>" : ""}</span>
<span class="fx-a">${live.has(f.id) ? "" : `<button class="btn" type="button" data-let="${f.id}">Let out</button>`}${my.has(f.id) && wardrobe().length ? `<button class="btn" type="button" data-dress="${f.id}">Dress up</button>` : ""}</span><span class="fx-m" role="status"></span></div>`).join("");
    grid.querySelectorAll(".fx-c").forEach((c) => {
      const f = list.find((x) => x.id === c.dataset.id);
      f.w = wm.get(f.id) || [];
      paintFrame(c.querySelector("canvas"), sheet(f), F_IDLE, 3);
    });
  }

  function dressUp(el, id) {
    const c = el.querySelector(`.fx-c[data-id="${CSS.escape(id)}"]`);
    if (!c || c.querySelector(".fx-dress")) return;
    const cur = parseWear(c.dataset.w);
    const box = document.createElement("div");
    box.className = "fx-dress";
    box.innerHTML = wardrobe().map((it) => `<button type="button" class="fe-it" data-item="${it}" aria-pressed="${cur.includes(it)}" title="${esc(itemOf(it)[1])}"><canvas></canvas></button>`).join("") + `<button class="btn" type="button" data-wear-save>Wear</button>`;
    box.querySelectorAll("[data-item]").forEach((b) => itemArt(b.querySelector("canvas"), b.dataset.item, 2));
    c.append(box);
  }

  function start() {
    if (polling) return;
    poll();
    polling = setInterval(poll, 30000);
  }
  addEventListener("visibilitychange", () => { if (!document.hidden) { poll(); wake(); } });
  (window.requestIdleCallback || ((f) => setTimeout(f, 1200)))(start);

  return {
    layout(geo) {
      g = geo;
      k = Math.max(2, geo.k);
      tag.hidden = true;
      walkers.forEach((F) => {
        F.s = Math.min(F.s, g.path.total);
        F.target = Math.min(F.target, g.path.total);
        if (F.state === "sit" || F.state === "go" || F.state === "back") { freeSeat(F); F.sit = false; F.state = "idle"; F.until = 0; }
        [F.x, F.y] = pointAt(F.s);
        F.fr = -1;
        show(F, F_IDLE);
        place(F);
      });
      closeCard();
      wake();
    },
    pause(on) {
      paused = on;
      if (on) { if (raf) cancelAnimationFrame(raf); raf = 0; walkers.forEach(hush); closeCard(); }
      else { poll(); wake(); }
    },
    open: openEditor,
    index: openIndex,
    riders: () => [...walkers.values()].map((F) => ({ n: F.rec.n, sh: F.sh })),
  };
}
