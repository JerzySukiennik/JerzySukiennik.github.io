/* Gzowo Labs fishing: click the dock and Jurek walks down with a rod, casts into the Narew and waits. When the float dips, click quickly
   to hook the fish. Eleven river fish, an old boot and a very rare golden fish, each with a size, and the biggest catches go into a records table. */

import { pix } from "/assets/life.mjs";

const DB = "https://raft-e8d47-default-rtdb.firebaseio.com";
const LOCAL = ["localhost", "127.0.0.1", "0.0.0.0", "[::1]"];
const PLOT = LOCAL.includes(location.hostname) || location.protocol === "file:" ? "plotDev" : "plot";
const R = (a, b) => a + Math.random() * (b - a);
const BAD = /(kurw|chuj|huj|pierdol|spierdal|wypierd|zajeb|jebac|jebi|jeban|jebn|pizd|fuck|shit|bitch|nigg|fagg|cunt|porn|hitler|nazi|cwel|kutas|szmat|dziwk)/;
const LEET = { 0: "o", 1: "i", 3: "e", 4: "a", 5: "s", 7: "t", 8: "b", "@": "a", $: "s", "!": "i" };
const bad = (s) => BAD.test(String(s).toLowerCase().replace(/ł/g, "l").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[0134578@$!]/g, (c) => LEET[c]).replace(/[^a-z]/g, ""));
const SPECIES = [
  ["roach", "Roach", 30, 12, 35, "#aeb8c2", "#eef2f5", "#e3843a", "", 2.7],
  ["perch", "Perch", 24, 10, 45, "#9bb05a", "#e6e2b0", "#f09a3a", "stripes", 2.4],
  ["bream", "Bream", 12, 25, 70, "#b39256", "#e2d1a2", "#6b5a3a", "", 2.0],
  ["chub", "Chub", 10, 20, 60, "#8f9a8a", "#dfe3d8", "#c8873e", "", 2.9],
  ["crucian", "Crucian carp", 10, 10, 35, "#d6a23a", "#f1d68a", "#a8742a", "", 2.1],
  ["ide", "Ide", 6, 25, 70, "#b8a36a", "#efe4c2", "#d9873a", "", 2.7],
  ["pike", "Pike", 7, 40, 130, "#5d7f3a", "#d8e0b0", "#7a8a3a", "spots", 4.3],
  ["zander", "Zander", 5, 35, 90, "#8a9a86", "#e2e6d8", "#6f7a6a", "stripes", 3.7],
  ["asp", "Asp", 4, 40, 90, "#a9b6c2", "#eef2f6", "#7d8a96", "", 3.4],
  ["eel", "Eel", 3, 40, 120, "#4d5a3a", "#b8b088", "#3f4a2e", "", 9],
  ["catfish", "Catfish", 2, 60, 220, "#4a4f55", "#a8a39a", "#3a3f44", "whiskers", 4.6],
  ["boot", "Old boot", 4, 28, 30, "#5b3a20", "#3a2412", "#8a5a36", "boot", 1],
  ["golden", "Golden fish", 0.7, 15, 30, "#ffd84a", "#fff2a8", "#f0a81e", "shine", 2.4],
];
const BOB = pix([[".W.", "WWW", "OOO", ".O."]], { W: "#ffffff", O: "#ff9a1f" });

function fishArt(cv, sp) {
  const [, , , , , body, belly, fin, mark, shape] = sp, k = 6, W = 40, H = 18;
  cv.width = W * k; cv.height = H * k;
  const c = cv.getContext("2d");
  const px = (x, y, col) => { c.fillStyle = col; c.fillRect(Math.round(x) * k, Math.round(y) * k, k, k); };
  if (mark === "boot") {
    for (let y = 2; y < 16; y++) for (let x = 12; x < 22; x++) px(x, y, y < 4 ? fin : body);
    for (let y = 11; y < 16; y++) for (let x = 6; x < 22; x++) px(x, y, y === 15 ? belly : body);
    for (let x = 6; x < 22; x += 3) px(x, 15, "#1d140f");
    px(14, 6, "#d8c6a8"); px(16, 8, "#d8c6a8"); px(14, 10, "#d8c6a8");
    return;
  }
  const L = 30, h = Math.max(3, L / shape), cy = H / 2, x0 = 3;
  for (let x = 0; x < L; x++) {
    const t = x / L, half = (h / 2) * Math.sqrt(Math.max(0, Math.sin(Math.PI * Math.min(1, t * 1.05)))) * (t > 0.82 ? 1 - (t - 0.82) * 2.6 : 1);
    for (let y = -half; y <= half; y += 1) {
      const yy = cy + y;
      let col = y > half * 0.2 ? belly : body;
      if (mark === "stripes" && Math.floor(x / 4) % 2 === 0 && y < half * 0.2 && x > 4) col = "#3d4a2e";
      if (mark === "spots" && y < half * 0.3 && (x * 7 + Math.round(y) * 13) % 9 === 0) col = belly;
      if (Math.abs(y) > half - 1) col = "#1d2a35";
      px(x0 + x, yy, col);
    }
  }
  const tx = x0 + L - 1;
  for (let i = 0; i < 6; i++) for (let y = -i; y <= i; y++) px(tx + i, cy + y * 0.9, i === 5 || Math.abs(y) === i ? "#1d2a35" : fin);
  for (let i = 0; i < 6; i++) px(x0 + L * 0.4 + i, cy - h / 2 - Math.min(i, 5 - i) * 0.6 - 0.5, fin);
  px(x0 + L * 0.45, cy + h / 2 + 0.5, fin); px(x0 + L * 0.5, cy + h / 2 + 0.5, fin);
  px(x0 + 3, cy - h * 0.15, "#ffffff"); px(x0 + 3, cy - h * 0.15 + 0.01, "#ffffff");
  px(x0 + 4, cy - h * 0.15, "#111111");
  if (mark === "whiskers") for (let i = 0; i < 5; i++) { px(x0 - i, cy + 1 + i * 0.5, "#2a2e33"); px(x0 - i, cy - 0.5 - i * 0.3, "#2a2e33"); }
  if (mark === "shine") [[8, -1], [16, 1], [22, -2], [12, 2]].forEach(([x, y]) => px(x0 + x, cy + y, "#ffffff"));
}

function pickFish() {
  const total = SPECIES.reduce((a, s) => a + s[2], 0);
  let r = Math.random() * total;
  const sp = SPECIES.find((s) => (r -= s[2]) < 0) || SPECIES[0];
  const cm = Math.round(sp[3] + (sp[4] - sp[3]) * Math.random() ** 2.2);
  return { sp, cm };
}

export function createFishing(world) {
  const spots = world.querySelector(".spots");
  const dock = document.createElement("button");
  dock.type = "button";
  dock.className = "spot spot-dock";
  dock.setAttribute("aria-label", "Dock, go fishing");
  dock.innerHTML = `<span class="spot-l"><b>Fishing</b><em>click the dock</em></span>`;
  spots.append(dock);
  let g = null, state = "idle", tip = null, bob = null, line = null, raf = 0, timers = [], box = null, readyT = 0, at = [0, 0];

  const later = (f, ms) => timers.push(setTimeout(f, ms));
  const clear = () => { timers.forEach(clearTimeout); timers = []; };

  function fallbackTip() { const [x, y] = g.fish.stand; return [x + g.fish.side * g.person * 0.55, y - g.person * 0.75]; }

  function draw() {
    raf = 0;
    if (!bob) return;
    const [tx, ty] = (tip && tip()) || fallbackTip(), dx = at[0] - tx, dy = at[1] - ty, len = Math.hypot(dx, dy);
    line.style.cssText = `left:${tx}px;top:${ty}px;width:${len}px;transform:rotate(${Math.atan2(dy, dx)}rad);z-index:${Math.round(g.fish.stand[1]) + 5}`;
    bob.style.transform = `translate(${at[0]}px,${at[1]}px)`;
    raf = requestAnimationFrame(draw);
  }

  function ring(x, y, w) {
    const e = document.createElement("i");
    const k = Math.max(1.6, 2.2 * g.s);
    e.className = "life-splash";
    e.style.cssText = `position:absolute;left:${x - w / 2}px;top:${y - w * 0.18}px;width:${w}px;height:${w * 0.36}px;z-index:${Math.round(g.river[0]) + 2};--k:${k.toFixed(2)}`;
    world.append(e);
    setTimeout(() => e.remove(), 800);
  }

  function start() {
    if (!g) return;
    clear();
    closeBox();
    state = "walking";
    tip = null;
    dispatchEvent(new CustomEvent("gz:fish-go"));
    readyT = setTimeout(() => ready(null), 450);
  }

  function ready(fn) {
    if (state !== "walking") return;
    clearTimeout(readyT);
    tip = fn;
    state = "casting";
    const [tx, ty] = (tip && tip()) || fallbackTip(), to = [g.fish.bob[0] + R(-0.15, 0.15) * g.person, g.fish.bob[1] + R(-0.05, 0.05) * g.person];
    bob = document.createElement("i");
    bob.className = "fish-bob";
    bob.style.setProperty("--bob", BOB);
    bob.style.setProperty("--k", Math.max(2, 2.4 * g.s).toFixed(2));
    bob.style.zIndex = Math.round(to[1]) + 1;
    line = document.createElement("i");
    line.className = "fish-line";
    world.append(line, bob);
    const t0 = performance.now();
    const fly = (now) => {
      const u = Math.min(1, (now - t0) / 520);
      at = [tx + (to[0] - tx) * u, ty + (to[1] - ty) * u - Math.sin(Math.PI * u) * g.person * 0.6];
      if (u < 1) requestAnimationFrame(fly);
      else { ring(to[0], to[1], g.person * 0.35); wait(); }
    };
    requestAnimationFrame(fly);
    if (!raf) raf = requestAnimationFrame(draw);
  }

  function wait() {
    state = "waiting";
    const bite = R(2600, 7500);
    for (let t = R(700, 1600); t < bite - 500; t += R(900, 1800)) later(() => { if (state === "waiting" && bob) { bob.classList.remove("is-nibble"); void bob.offsetWidth; bob.classList.add("is-nibble"); } }, t);
    later(() => {
      if (state !== "waiting") return;
      state = "bite";
      bob.classList.add("is-bite");
      ring(at[0], at[1], g.person * 0.5);
      dispatchEvent(new CustomEvent("gz:fish-bite"));
      later(() => { if (state === "bite") miss(); }, 1150);
    }, bite);
  }

  function hook() {
    clear();
    state = "reeling";
    const from = at.slice(), t0 = performance.now(), catchIt = pickFish();
    const reel = (now) => {
      const u = Math.min(1, (now - t0) / 450), [tx, ty] = (tip && tip()) || fallbackTip();
      at = [from[0] + (tx - from[0]) * u, from[1] + (ty - from[1]) * u];
      if (u < 1) requestAnimationFrame(reel); else { finish(); show(catchIt); }
    };
    requestAnimationFrame(reel);
    ring(from[0], from[1], g.person * 0.6);
  }

  function miss() {
    clear();
    finish();
    dispatchEvent(new CustomEvent("gz:fish-done", { detail: { miss: true } }));
    say(`<p class="fish-big">It got away!</p><p>Click as soon as the float dips.</p>`, `<button class="btn" type="button" data-fish-again>Try again</button>`);
  }

  function finish() {
    if (bob) bob.remove();
    if (line) line.remove();
    bob = line = null;
    state = "idle";
  }

  function closeBox() { if (box) { box.remove(); box = null; } }

  function say(body, actions) {
    closeBox();
    box = document.createElement("section");
    box.className = "win fishbox";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-label", "Fishing");
    box.innerHTML = `<header class="tb"><span class="tb-t">Gone fishing</span><span class="tb-btns"><button class="tb-x" type="button" data-fish-close aria-label="Close"></button></span></header><div class="fish-b">${body}</div><p class="fish-act">${actions}<button class="btn" type="button" data-fish-top>Records</button><button class="btn" type="button" data-fish-close>Close</button></p>`;
    document.body.append(box);
    return box;
  }

  async function top() {
    try {
      const d = await (await fetch(`${DB}/${PLOT}/fish.json?orderBy="c"&limitToLast=10`)).json();
      return Object.values(d || {}).filter((v) => v && typeof v.c === "number").sort((a, b) => b.c - a.c);
    } catch (e) { return null; }
  }

  async function show({ sp, cm }) {
    dispatchEvent(new CustomEvent("gz:fish-done", { detail: { name: sp[1], cm, key: sp[0] } }));
    const what = sp[0] === "boot" ? "an old boot" : sp[0] === "golden" ? "the golden fish!" : `${/^[aeiou]/i.test(sp[1]) ? "an" : "a"} ${sp[1].toLowerCase()}`;
    const b = say(`<canvas class="fish-art"></canvas><p class="fish-big">You caught ${what}</p><p>${sp[0] === "boot" ? "Size 44. Somebody is missing a boot." : `${cm} cm`}</p><div data-fish-rec></div>`, `<button class="btn" type="button" data-fish-again>Fish again</button>`);
    fishArt(b.querySelector("canvas"), sp);
    if (sp[0] === "boot") return;
    const list = await top();
    if (!list || !box || box !== b) return;
    if (list.length >= 10 && cm <= list[list.length - 1].c) return;
    const rec = b.querySelector("[data-fish-rec]");
    rec.innerHTML = `<form class="fish-form"><p><b>That is a top 10 catch!</b> Your name for the records:</p><p><input name="n" maxlength="16" required autocomplete="nickname" aria-label="Your name"> <button class="btn" type="submit">Save</button></p><p class="fish-note"></p></form>`;
    rec.querySelector("form").addEventListener("submit", (e) => {
      e.preventDefault();
      const n = String(new FormData(e.target).get("n") || "").trim().slice(0, 16), note = rec.querySelector(".fish-note");
      if (!n || bad(n) || !/^[\p{L}\p{N} ._'-]+$/u.test(n)) { note.textContent = "Pick a different name."; return; }
      e.target.querySelector("button").disabled = true;
      fetch(`${DB}/${PLOT}/fish.json`, { method: "POST", body: JSON.stringify({ n, s: sp[0], c: cm, t: { ".sv": "timestamp" } }) })
        .then((r) => { if (!r.ok) throw r.status; return records(); })
        .catch(() => { note.textContent = "The records are offline, try later."; e.target.querySelector("button").disabled = false; });
    });
  }

  async function records() {
    const b = say(`<p class="fish-big">Biggest catches</p><table class="fish-top"><tbody><tr><td>Loading...</td></tr></tbody></table>`, `<button class="btn" type="button" data-fish-again>Go fishing</button>`);
    const list = await top();
    if (box !== b) return;
    const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
    const name = (k) => (SPECIES.find((s) => s[0] === k) || [k, k])[1];
    b.querySelector("tbody").innerHTML = !list ? "<tr><td>The records are offline.</td></tr>" : !list.length ? "<tr><td>Nobody has caught anything yet. Be the first!</td></tr>"
      : list.map((v, i) => `<tr><td>${i + 1}.</td><td>${esc(v.n)}</td><td>${esc(name(v.s))}</td><td>${v.c} cm</td></tr>`).join("");
  }

  dock.addEventListener("click", (e) => {
    e.preventDefault();
    if (state === "bite") { hook(); return; }
    if (state === "idle") start();
  });
  document.addEventListener("pointerdown", (e) => {
    if (state === "bite" && !e.target.closest(".win, .paint, .start-m, .taskbar")) { e.preventDefault(); hook(); }
  }, true);
  document.addEventListener("click", (e) => {
    if (!box || !box.contains(e.target)) return;
    if (e.target.closest("[data-fish-close]")) { closeBox(); dispatchEvent(new CustomEvent("gz:fish-leave")); }
    else if (e.target.closest("[data-fish-again]")) start();
    else if (e.target.closest("[data-fish-top]")) records();
  });
  addEventListener("gz:fish-ready", (e) => ready(e.detail && e.detail.tip));
  addEventListener("gz:fish-ack", () => { clearTimeout(readyT); readyT = setTimeout(() => ready(null), 20000); });

  return {
    layout(geo) {
      g = geo;
      const d = geo.river_props[0];
      Object.assign(dock.style, { left: d.x + "px", top: d.y + "px", width: d.w + "px", height: d.h + "px", zIndex: Math.round(d.y + d.h) });
      if (state !== "idle") { clear(); finish(); }
    },
  };
}
