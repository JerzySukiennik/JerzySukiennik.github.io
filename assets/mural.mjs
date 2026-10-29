/* Gzowo Labs wall: spray paint on the brick wall of the map, shown in a Paint-style frame when the camera zooms in.
   The wall is a log of strokes in wall coordinates (0..1000 x 0..323), spray and eraser alike, replayed in order with seeded mist so every visitor sees the same paint.
   Anyone can rub out anything with the eraser. Undo deletes only your own strokes and copies them to muralTrash first. */

import { icon } from "/assets/views.mjs";

const DB = "https://raft-e8d47-default-rtdb.firebaseio.com";
const LOCAL = ["localhost", "127.0.0.1", "0.0.0.0", "[::1]"];
const DEV = LOCAL.includes(location.hostname) || location.protocol === "file:";
const PATH = DEV ? "muralDev" : "mural", TRASH = DEV ? "muralTrashDev" : "muralTrash";
const MINE_KEY = "gl-mural-mine-" + PATH;
const RES_W = 2000, WX = 1000, WY = 323, RES_H = Math.round((RES_W * WY) / WX), SX = RES_W / WX;
const MAX_POINTS = 150, MAX_POSTS = 400, MAX_MINE = 600, TICK = 33, DRIP = 14;
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

const stampCache = new Map();
function stamps(color, lw) {
  const key = color + lw;
  if (stampCache.has(key)) return stampCache.get(key);
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
  return list;
}

function drip(c, x, y, lw, len, color, r) {
  const w = Math.max(1.6, lw * 0.16), n = Math.max(3, Math.round(len / (w * 1.6))), left = [], right = [];
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

function sprayer(op, c) {
  const r = rng(hash(op.id)), lw = Math.max(4, op.w * SX), step = Math.max(1, lw * 0.2);
  const tint = (run) => (op.c === "rainbow" ? RAINBOW_RUN[Math.floor(run / (lw * 1.5)) % RAINBOW_RUN.length] : op.c);
  const drips = [];
  let px = null, py = null, left = step, run = 0, held = 0, hx = 0, hy = 0;
  const stamp = (x, y) => {
    const set = stamps(tint(run), lw), v = set[Math.floor(r() * set.length)], h = v.width / 2, jit = lw * (0.08 + Math.min(held, 45) * 0.005);
    c.drawImage(v, x - h + (r() - 0.5) * jit, y - h + (r() - 0.5) * jit);
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
      else { if (held >= DRIP) drips.push([hx, hy, held, tint(run)]); held = 1; hx = x; hy = y; }
      c.globalAlpha = held > 3 ? 0.32 : 0.5;
      if (len < 0.5) stamp(x, y);
      else {
        let t = left;
        for (; t <= len; t += step) stamp(px + (dx * t) / len, py + (dy * t) / len);
        left = t - len; run += len; px = x; py = y;
      }
    },
    end() {
      if (held >= DRIP) drips.push([hx, hy, held, tint(run)]);
      drips.forEach(([x, y, n, col]) => {
        const len = lw * Math.min(5, 0.6 + (n - DRIP) * 0.07) * (0.8 + r() * 0.4);
        drip(c, x + (r() - 0.5) * lw * 0.3, y + lw * 0.15, lw, len, col, r);
        if (n > 40) drip(c, x + (r() < 0.5 ? -1 : 1) * lw * (0.22 + r() * 0.1), y + lw * 0.1, lw * 0.8, len * (0.4 + r() * 0.25), col, r);
      });
      drips.length = 0;
    },
  };
}

function rubber(op, c) {
  const lw = Math.max(4, op.w * SX);
  let px = null, py = null;
  return {
    add(x, y) {
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

const painterFor = (op, c) => (op.k === "e" ? rubber : sprayer)(op, c);
const reset = (c) => { c.globalCompositeOperation = "source-over"; c.globalAlpha = 1; };

function paintOp(op, c) {
  const p = painterFor(op, c);
  for (let i = 0; i < op.d.length; i += 2) p.add(op.d[i] * SX, op.d[i + 1] * SX);
  p.end();
  reset(c);
}

export function createMural(el, opts) {
  const canvas = el.querySelector("canvas");
  canvas.width = RES_W; canvas.height = RES_H;
  const ctx = canvas.getContext("2d");
  const back = document.createElement("canvas");
  back.width = RES_W; back.height = RES_H;
  const bctx = back.getContext("2d");
  let items = [], byId = {}, mine = {}, order = [], redo = [];
  let color = "#ff0000", size = 2, erasing = false, rainbow = false, posted = 0, lastT = 0, lastR = [], offlineSaid = false;
  let live = null, cur = null, lastSample = 0, tick = 0, gesture = null, active = false, chrome = null, job = null, jobRaf = 0, flashTimer = 0, made = 0;

  try { rainbow = localStorage.getItem("gl-rainbow") === "1"; } catch (e) {}
  try {
    (JSON.parse(localStorage.getItem(MINE_KEY)) || []).forEach((m) => {
      if (Array.isArray(m) && typeof m[0] === "string" && !(m[0] in mine)) { mine[m[0]] = m[1] || m[0]; order.push(m[0]); }
    });
  } catch (e) {}

  const saveMine = () => { try { localStorage.setItem(MINE_KEY, JSON.stringify(order.slice(-MAX_MINE).map((id) => [id, mine[id]]))); } catch (e) {} };
  const remember = (id, g) => { if (!(id in mine)) order.push(id); mine[id] = g; saveMine(); };
  const forget = (id) => { if (!(id in mine)) return; delete mine[id]; const i = order.indexOf(id); if (i !== -1) order.splice(i, 1); saveMine(); };

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

  function replayLive() {
    if (!live) return;
    live.p = painterFor(live, ctx);
    for (let i = 0; i < live.d.length; i += 2) live.p.add(live.d[i] * SX, live.d[i + 1] * SX);
    reset(ctx);
  }

  function pump() {
    jobRaf = 0;
    if (!job) return;
    const t0 = performance.now();
    while (job.i < items.length && performance.now() - t0 < 8) paintOp(items[job.i++], bctx);
    if (job.i < items.length) { jobRaf = requestAnimationFrame(pump); return; }
    job = null;
    ctx.globalCompositeOperation = "copy";
    ctx.drawImage(back, 0, 0);
    reset(ctx);
    replayLive();
  }

  function redrawAll() {
    job = { i: 0 };
    bctx.clearRect(0, 0, RES_W, RES_H);
    if (!jobRaf) jobRaf = requestAnimationFrame(pump);
  }

  function insert(op, painted) {
    const last = items[items.length - 1];
    if (!last || op.id > last.id) {
      items.push(op);
      if (!painted && !job) paintOp(op, ctx);
    } else {
      let i = items.length;
      while (i > 0 && items[i - 1].id > op.id) i--;
      items.splice(i, 0, op);
      redrawAll();
    }
    count();
  }

  function drop(id) {
    for (let i = items.length - 1; i >= 0; i--) if (items[i].id === id) { const it = items.splice(i, 1)[0]; redrawAll(); count(); return it; }
    return null;
  }
  const find = (id) => { for (let i = items.length - 1; i >= 0; i--) if (items[i].id === id) return items[i]; return null; };

  function parse(id, v) {
    if (!v || typeof v !== "object" || (v.k !== "d" && v.k !== "e")) return null;
    if (v.k === "d" && (typeof v.c !== "string" || !(v.c === "rainbow" || /^#[0-9a-f]{6}$/.test(v.c)))) return null;
    if (typeof v.d !== "string" || !/^[0-9,]+$/.test(v.d)) return null;
    const pts = v.d.split(",").map(Number);
    if (pts.length < 2 || pts.length % 2) return null;
    return { id, k: v.k, d: pts, raw: v.d, c: v.k === "d" ? v.c : undefined, w: clamp(v.w || 12, 3, 200) };
  }

  function add(id, v, batch) {
    if (byId[id] || !v) return;
    byId[id] = true;
    const it = parse(id, v);
    if (!it) return;
    if (batch) items.push(it);
    else insert(it, false);
  }
  function gone(id) { byId[id] = true; if (drop(id)) sync(); }

  function loadAll(data) {
    Object.keys(data || {}).sort().forEach((k) => add(k, data[k], true));
    items.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    redrawAll();
    sync();
  }

  const message = (e) => { try { return JSON.parse(e.data || "null"); } catch (err) { return null; } };
  function listen() {
    const q = DB + "/" + PATH + '.json?orderBy="$key"&limitToLast=1500';
    if (typeof EventSource === "undefined") {
      fetch(q).then((r) => r.json()).then(loadAll).catch(() => {});
      return;
    }
    const src = new EventSource(q);
    src.addEventListener("put", (e) => {
      const msg = message(e);
      if (!msg || typeof msg.path !== "string") return;
      if (msg.path === "/") { loadAll(msg.data); return; }
      const parts = msg.path.slice(1).split("/");
      if (parts.length !== 1) return;
      if (msg.data === null) gone(parts[0]); else add(parts[0], msg.data);
    });
    src.addEventListener("patch", (e) => {
      const msg = message(e);
      if (!msg || msg.path !== "/" || !msg.data) return;
      Object.keys(msg.data).forEach((k) => (msg.data[k] === null ? gone(k) : add(k, msg.data[k])));
    });
    src.onerror = () => {};
  }

  const body = (it) => { const b = { k: it.k, d: it.raw, w: it.w }; if (it.k === "d") b.c = it.c; return b; };

  function send(it) {
    it.raw = it.d.join(",");
    remember(it.id, it.g || it.id);
    posted++;
    it.saved = fetch(DB + "/" + PATH + "/" + it.id + ".json", { method: "PUT", body: JSON.stringify({ ...body(it), t: { ".sv": "timestamp" } }) })
      .then((r) => { if (!r.ok) throw r.status; })
      .catch(() => {
        it.local = true;
        if (!offlineSaid) { offlineSaid = true; flash("THE WALL IS OFFLINE, YOUR PAINT WAS NOT SAVED"); }
      });
  }

  const copyOf = (it) => ({ k: it.k, d: it.d.slice(), c: it.c, w: it.w });

  function remove(it) {
    const id = it.id, g = mine[id];
    drop(id);
    forget(id);
    if (it.local) return;
    const patch = {};
    patch[PATH + "/" + id] = null;
    patch[TRASH + "/" + id] = { ...body(it), e: { ".sv": "timestamp" } };
    (it.saved || Promise.resolve())
      .then(() => { if (it.local) return { ok: true }; return fetch(DB + "/.json", { method: "PATCH", body: JSON.stringify(patch) }); })
      .then((r) => { if (!r.ok) throw r.status; })
      .catch(() => { if (g) remember(id, g); insert(it, false); sync(); flash("COULD NOT UNDO THAT, TRY AGAIN"); });
  }

  function undo() {
    if (live) return;
    let last = null;
    for (let i = order.length - 1; i >= 0 && !last; i--) last = find(order[i]);
    if (!last) { flash("NOTHING OF YOURS LEFT TO UNDO"); return; }
    const g = mine[last.id], batch = items.filter((it) => mine[it.id] === g);
    redo.push(batch.map(copyOf));
    batch.forEach(remove);
    sync();
  }

  function redoLast() {
    if (live) return;
    const group = redo.pop();
    if (!group) return;
    const g = newGroup();
    group.forEach((c) => {
      if (posted >= MAX_POSTS) return;
      const it = { ...c, d: c.d.slice(), id: pushId(), g };
      byId[it.id] = true;
      insert(it, false);
      send(it);
    });
    sync();
  }

  function wallPoint(e) {
    const r = el.getBoundingClientRect();
    return [Math.round(clamp((e.clientX - r.left) / r.width, 0, 1) * WX), Math.round(clamp((e.clientY - r.top) / r.height, 0, 1) * WY)];
  }

  function open(x, y, g) {
    live = { id: pushId(), k: erasing ? "e" : "d", c: erasing ? undefined : color, w: erasing ? RUBS[size] : SIZES[size], d: [], g };
    byId[live.id] = true;
    live.p = painterFor(live, ctx);
    sample(x, y);
  }

  function close() {
    const op = live;
    live = null;
    op.p.end();
    reset(ctx);
    delete op.p;
    insert(op, true);
    send(op);
    if (op.k === "d") made++;
  }

  function sample(x, y) {
    live.d.push(x, y);
    live.p.add(x * SX, y * SX);
    reset(ctx);
    lastSample = performance.now();
    if (live.d.length >= MAX_POINTS * 2) { const g = live.g; close(); open(x, y, g); }
  }

  function hold() {
    tick = 0;
    if (!live) return;
    if (live.k === "d" && cur && performance.now() - lastSample >= TICK) sample(cur[0], cur[1]);
    tick = requestAnimationFrame(hold);
  }

  el.addEventListener("pointerdown", (e) => {
    if (!active || e.button !== 0 || live) return;
    e.preventDefault();
    if (posted >= MAX_POSTS) { flash("THAT IS ENOUGH ART FOR ONE VISIT"); return; }
    try { el.setPointerCapture(e.pointerId); } catch (err) {}
    gesture = { id: e.pointerId };
    redo.length = 0;
    cur = wallPoint(e);
    open(cur[0], cur[1], newGroup());
    if (!tick) tick = requestAnimationFrame(hold);
  });
  el.addEventListener("pointermove", (e) => {
    if (!gesture || !live || e.pointerId !== gesture.id) return;
    const list = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
    for (const ev of list.length ? list : [e]) {
      cur = wallPoint(ev);
      const n = live.d.length;
      if (Math.hypot(cur[0] - live.d[n - 2], cur[1] - live.d[n - 1]) >= 2) sample(cur[0], cur[1]);
    }
  });
  const up = (e) => {
    if (!gesture || e.pointerId !== gesture.id) return;
    gesture = null;
    if (tick) { cancelAnimationFrame(tick); tick = 0; }
    if (live) close();
    sync();
  };
  el.addEventListener("pointerup", up);
  el.addEventListener("pointercancel", up);

  function cursor() {
    const r = el.getBoundingClientRect();
    const d = Math.round(clamp(((erasing ? RUBS : SIZES)[size] / WX) * r.width, 6, 64)), s = d + 4, c = s / 2;
    let svg;
    if (erasing) {
      svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + s + '" height="' + s + '"><circle cx="' + c + '" cy="' + c + '" r="' + d / 2 + '" fill="#fff" fill-opacity=".45" stroke="#000"/><circle cx="' + c + '" cy="' + c + '" r="' + (d / 2 + 1) + '" fill="none" stroke="#fff"/></svg>';
    } else {
      const fill = color === "rainbow" ? "url(#r)" : color;
      const defs = color === "rainbow" ? '<defs><linearGradient id="r">' + RAINBOW.map((h, i) => '<stop offset="' + i / (RAINBOW.length - 1) + '" stop-color="' + h + '"/>').join("") + "</linearGradient></defs>" : "";
      svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + s + '" height="' + s + '">' + defs + '<circle cx="' + c + '" cy="' + c + '" r="' + d / 2 + '" fill="' + fill + '" fill-opacity=".55" stroke="#000"/><circle cx="' + c + '" cy="' + c + '" r="' + (d / 2 + 1) + '" fill="none" stroke="#fff"/></svg>';
    }
    el.style.cursor = 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '") ' + Math.round(c) + " " + Math.round(c) + ", crosshair";
  }

  const swatchBg = (hex) => (hex === "rainbow" ? "linear-gradient(135deg," + RAINBOW.join(",") + ")" : hex);
  const swatch = (hex, name) => `<button type="button" class="pt-c" data-color="${hex}" aria-label="${name}" title="${name}" style="background:${swatchBg(hex)}"></button>`;

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
      `<div class="pt-sizes">${SIZES.map((_, i) => `<button type="button" class="pt-s" data-size="${i}" title="Size ${i + 1}" aria-label="Size ${i + 1}"><i style="width:${[2, 4, 6, 9, 12][i]}px;height:${[2, 4, 6, 9, 12][i]}px"></i></button>`).join("")}</div>` +
      `</div><div class="pt-hole"></div></div>` +
      `<div class="pt-pal"><span class="pt-cur" data-cur title="Your color"></span><div class="pt-cs">${colors.join("")}<button type="button" class="pt-c pt-rb" data-color="rainbow" aria-label="rainbow" title="rainbow" style="background:${swatchBg("rainbow")}" hidden></button></div>` +
      `<label class="btn pt-more" title="Any color you like">Edit colors...<input type="color" value="#ff0000" aria-label="Pick any color"></label></div>` +
      `<footer class="stb"><span data-count>0 strokes on the wall</span><span>Hold still and the paint drips. ${UNDO_KEY} takes back your strokes, the eraser rubs out anything.</span><span class="stb-act"><button class="btn" type="button" data-pt-close>Back to the map</button></span></footer>`;
    document.body.appendChild(chrome);
    chrome.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      if (b.hasAttribute("data-pt-close")) { opts.onExit(); return; }
      if (b.hasAttribute("data-undo")) { undo(); return; }
      if (b.hasAttribute("data-redo")) { redoLast(); return; }
      if (b.dataset.tool) erasing = b.dataset.tool === "eraser";
      if (b.dataset.color) { color = b.dataset.color; erasing = false; }
      if (b.dataset.size) size = +b.dataset.size;
      sync();
    });
    chrome.querySelector("input[type=color]").addEventListener("input", (e) => { color = e.target.value.toLowerCase(); erasing = false; sync(); });
    if (rainbow) chrome.querySelector(".pt-rb").hidden = false;
  }

  function count() {
    const c = chrome && chrome.querySelector("[data-count]");
    if (!c) return;
    const n = items.reduce((a, it) => a + (it.k === "d" ? 1 : 0), 0);
    c.textContent = n + (n === 1 ? " stroke" : " strokes") + " on the wall";
  }

  function sync() {
    if (!chrome) return;
    chrome.querySelectorAll("[data-color]").forEach((b) => b.setAttribute("aria-pressed", String(!erasing && b.dataset.color === color)));
    chrome.querySelectorAll("[data-size]").forEach((b) => b.setAttribute("aria-pressed", String(+b.dataset.size === size)));
    chrome.querySelectorAll("[data-tool]").forEach((b) => b.setAttribute("aria-pressed", String((b.dataset.tool === "eraser") === erasing)));
    chrome.querySelector("[data-cur]").style.background = swatchBg(color);
    chrome.querySelector("[data-undo]").disabled = !items.some((it) => it.id in mine);
    chrome.querySelector("[data-redo]").disabled = !redo.length;
    count();
    if (active) cursor();
  }

  document.addEventListener("keydown", (e) => {
    if (!active) return;
    if (e.key === "Escape") { opts.onExit(); return; }
    if (!(e.metaKey || e.ctrlKey) || e.altKey) return;
    const k = e.key.toLowerCase();
    if (k === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
    else if ((k === "z" && e.shiftKey) || (k === "y" && e.ctrlKey)) { e.preventDefault(); redoLast(); }
  });

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

  listen();

  return {
    enter() {
      if (!chrome) build();
      chrome.hidden = false; active = true; made = 0;
      el.classList.add("is-live");
      sync();
    },
    exit() {
      active = false;
      if (live) { gesture = null; close(); }
      if (chrome) chrome.hidden = true;
      el.classList.remove("is-live");
      el.style.cursor = "";
    },
    hole() {
      if (!chrome) build();
      const was = chrome.hidden;
      chrome.hidden = false;
      const r = chrome.querySelector(".pt-hole").getBoundingClientRect();
      chrome.hidden = was;
      return r;
    },
    resize() { if (active) cursor(); },
    made: () => made,
  };
}
