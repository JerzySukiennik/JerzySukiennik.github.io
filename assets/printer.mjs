/* Gzowo Labs guest printer: anyone designs a small figure from 8 x 8 x 8 blocks, layer by layer, in twelve filament colours.
   The printer on the plot prints the queue for everybody, one figure every two and a half minutes, and the finished ones go on the shelf.
   Figures are drawn as isometric pixel cubes; every canvas is painted only when something changes. */

import { esc, store } from "/assets/folks.mjs";
import { api, toast, me } from "/assets/bank.mjs";

const N = 8, CH = "0123456789abc";
const FIL = [null, "#f4f1ea", "#9aa3ad", "#2d2d33", "#f2792b", "#f4c430", "#3fa34d", "#2e9e96", "#3a74d6", "#8fd0f2", "#8e5bd8", "#ef7fb3", "#8a5a34"];
const NAMES = ["Eraser", "White", "Grey", "Black", "Orange", "Yellow", "Green", "Teal", "Blue", "Sky blue", "Purple", "Pink", "Brown"];
const BED = { x: 44 / 190, y: 94 / 164, w: 16 / 190, h: 16 / 164 };
const SHELF = [109, 127, 145].map((x) => ({ x: x / 190, y: 97 / 164, w: 16 / 190, h: 16 / 164 }));
const CELL = 30;

const masks = new Map();
function mask(u) {
  if (masks.has(u)) return masks.get(u);
  const m = new Uint8Array(4 * u * u);
  for (let j = 0; j < 2 * u; j++) for (let i = 0; i < 2 * u; i++) {
    const cx = i + 0.5, cy = j + 0.5, d = cx < u ? cx : 2 * u - cx, a = u / 2 - d / 2, b = u / 2 + d / 2;
    m[j * 2 * u + i] = cy >= a && cy < b ? 1 : cy >= b && cy < b + u ? (cx < u ? 2 : 3) : 0;
  }
  masks.set(u, m);
  return m;
}
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const tone = (c, f) => c.map((v) => Math.max(0, Math.min(255, Math.round(f > 0 ? v + (255 - v) * f : v * (1 + f)))));
const TONES = FIL.map((h) => (h ? [null, tone(hex(h), 0.24), hex(h), tone(hex(h), -0.26)] : null));

export function iso(cv, vox, u = 2, layers = N, turn = 0) {
  const S = 16 * u, m = mask(u);
  cv.width = cv.height = S;
  const c = cv.getContext("2d"), img = c.createImageData(S, S), px = img.data;
  for (let z = 0; z < Math.min(N, layers); z++) for (let s = 0; s <= 14; s++) for (let x = Math.max(0, s - 7); x <= Math.min(7, s); x++) {
    const y = s - x;
    let ax = x, ay = y;
    for (let t = 0; t < turn; t++) [ax, ay] = [ay, 7 - ax];
    const v = typeof vox === "string" ? CH.indexOf(vox[ax + ay * 8 + z * 64]) : vox[ax + ay * 8 + z * 64];
    if (!(v > 0)) continue;
    const cols = TONES[v], ox = (x - y + 7) * u, oy = Math.floor(((x + y) * u) / 2) + (7 - z) * u;
    for (let j = 0; j < 2 * u; j++) for (let i = 0; i < 2 * u; i++) {
      const f = m[j * 2 * u + i];
      if (!f) continue;
      const k = ((oy + j) * S + ox + i) * 4, col = cols[f];
      px[k] = col[0]; px[k + 1] = col[1]; px[k + 2] = col[2]; px[k + 3] = 255;
    }
  }
  c.putImageData(img, 0, 0);
}

export function createPrinter(world) {
  const spots = world.querySelector(".spots");
  const spot = document.createElement("button");
  spot.type = "button";
  spot.className = "spot spot-prints";
  spot.dataset.place = "prints";
  spot.dataset.printer = "1";
  spot.setAttribute("aria-label", "Guest printer, design a figure and print it");
  spot.innerHTML = `<img class="spr" src="/assets/map/prints.webp" alt="" draggable="false"><canvas class="pr-bed"></canvas><i class="pr-head lv"></i>${SHELF.map(() => `<canvas class="pr-mini"></canvas>`).join("")}<span class="pr-show"><canvas></canvas></span><span class="spot-l"><b>Guest printer</b><em>print your own</em></span>`;
  spots.append(spot);
  const label = spot.querySelector(".spot-l em"), bed = spot.querySelector(".pr-bed"), head = spot.querySelector(".pr-head"), minis = [...spot.querySelectorAll(".pr-mini")], show = spot.querySelector(".pr-show canvas");
  const put = (el, r) => Object.assign(el.style, { left: r.x * 100 + "%", top: r.y * 100 + "%", width: r.w * 100 + "%", height: r.h * 100 + "%" });
  put(bed, BED);
  minis.forEach((m, i) => put(m, SHELF[i]));
  Object.assign(head.style, { left: (BED.x + BED.w * 0.25) * 100 + "%", top: (BED.y - 0.03) * 100 + "%", width: BED.w * 50 + "%", height: "2.4%" });

  const S = { list: [], skew: 0, dur: 150000, seen: false, at: 0, tab: "design", timer: 0, layers: -1, cur: "" };
  const D = { vox: new Uint8Array(512), z: 0, col: 4, turn: 0, mirror: false, drag: null };
  try {
    const d = store.get("gl-print-draft", "");
    if (typeof d === "string" && d.length === 512) for (let i = 0; i < 512; i++) D.vox[i] = Math.max(0, CH.indexOf(d[i]));
  } catch (e) {}
  const text = () => Array.from(D.vox, (v) => CH[v]).join("");
  const now = () => Date.now() + S.skew;
  const split = () => {
    const t = now(), done = [], queue = [];
    let cur = null;
    S.list.forEach((p) => { if (p.start + S.dur <= t) done.push(p); else if (p.start <= t) cur = p; else queue.push(p); });
    return { cur, done, queue: queue.reverse() };
  };

  function map() {
    const { cur, done } = split();
    clearTimeout(S.timer);
    spot.classList.toggle("is-printing", !!cur);
    if (cur) {
      const f = (now() - cur.start) / S.dur, layers = Math.min(N, Math.floor(f * N) + 1);
      if (cur.id !== S.cur || layers !== S.layers) { S.cur = cur.id; S.layers = layers; iso(bed, cur.vox, 2, layers); }
      label.textContent = `printing ${cur.name}, ${Math.round(f * 100)}%`;
      S.timer = setTimeout(map, 4000);
    } else {
      S.cur = ""; S.layers = -1;
      bed.width = bed.height = 1;
      label.textContent = done.length ? "print your own" : "print the first figure";
    }
    minis.forEach((m, i) => { const p = done[i + 1]; if (p) iso(m, p.vox, 2); else m.width = m.height = 1; });
    if (done[0]) iso(show, done[0].vox, 3); else show.width = show.height = 1;
    spot.classList.toggle("has-show", !!done[0]);
    const el = window.gzDesk && window.gzDesk.find("printer");
    if (el && !el.hidden && S.tab === "shelf") shelf(el);
  }

  async function load() {
    S.at = Date.now();
    try {
      const j = await api("/prints");
      S.skew = j.now - Date.now();
      S.dur = j.dur;
      S.list = j.prints;
      map();
    } catch (e) {}
  }
  new IntersectionObserver((list) => { S.seen = list[0].isIntersecting; if (S.seen && Date.now() - S.at > 40000) load(); }, { rootMargin: "120px" }).observe(spot);
  setInterval(() => { if (S.seen && !document.hidden && Date.now() - S.at > 45000) load(); }, 15000);

  function grid(el) {
    const cv = el.querySelector(".pr-grid"), c = cv.getContext("2d"), dpr = Math.min(2, devicePixelRatio || 1), W = N * CELL;
    if (cv.width !== W * dpr) { cv.width = cv.height = W * dpr; cv.style.width = cv.style.height = W + "px"; }
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.fillStyle = "#fff";
    c.fillRect(0, 0, W, W);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const v = D.vox[x + y * 8 + D.z * 64], under = D.z ? D.vox[x + y * 8 + (D.z - 1) * 64] : 0;
      if (v) { c.fillStyle = FIL[v]; c.fillRect(x * CELL, y * CELL, CELL, CELL); }
      else if (under) { c.globalAlpha = 0.28; c.fillStyle = FIL[under]; c.fillRect(x * CELL, y * CELL, CELL, CELL); c.globalAlpha = 1; }
      else if (!D.z) { c.fillStyle = (x + y) % 2 ? "#eef1f4" : "#f7f8fa"; c.fillRect(x * CELL, y * CELL, CELL, CELL); }
    }
    c.strokeStyle = "rgba(0,0,0,.22)";
    c.lineWidth = 1;
    c.beginPath();
    for (let i = 0; i <= N; i++) { c.moveTo(i * CELL + 0.5 * (i < N ? 1 : -1), 0); c.lineTo(i * CELL + 0.5 * (i < N ? 1 : -1), W); c.moveTo(0, i * CELL + 0.5 * (i < N ? 1 : -1)); c.lineTo(W, i * CELL + 0.5 * (i < N ? 1 : -1)); }
    c.stroke();
    if (D.mirror) { c.strokeStyle = "#000080"; c.setLineDash([4, 3]); c.beginPath(); c.moveTo(W / 2, 0); c.lineTo(W / 2, W); c.stroke(); c.setLineDash([]); }
  }

  function paint(el) {
    grid(el);
    iso(el.querySelector(".pr-view"), D.vox, 10, N, D.turn);
    const n = D.vox.reduce((a, v) => a + (v ? 1 : 0), 0);
    el.querySelector("[data-pr-z]").textContent = `Layer ${D.z + 1} of ${N}`;
    el.querySelector("[data-pr-count]").textContent = `${n} block${n === 1 ? "" : "s"}`;
    el.querySelectorAll("[data-pr-col]").forEach((b) => b.setAttribute("aria-pressed", String(+b.dataset.prCol === D.col)));
    el.querySelector('[data-pr="mirror"]').setAttribute("aria-pressed", String(D.mirror));
    el.querySelector('[data-pr="down"]').disabled = D.z === 0;
    el.querySelector('[data-pr="up"]').disabled = D.z === N - 1;
    el.querySelector('[data-pr="copy"]').disabled = D.z === 0;
    store.set("gl-print-draft", text());
  }

  function cell(el, e) {
    const r = el.querySelector(".pr-grid").getBoundingClientRect(), x = Math.floor(((e.clientX - r.left) / r.width) * N), y = Math.floor(((e.clientY - r.top) / r.height) * N);
    if (x < 0 || y < 0 || x >= N || y >= N) return;
    const i = x + y * 8 + D.z * 64;
    if (D.drag === null) D.drag = D.vox[i] === D.col ? 0 : D.col;
    if (D.vox[i] === D.drag && (!D.mirror || D.vox[7 - x + y * 8 + D.z * 64] === D.drag)) return;
    D.vox[i] = D.drag;
    if (D.mirror) D.vox[7 - x + y * 8 + D.z * 64] = D.drag;
    paint(el);
  }

  function design() {
    return `<div class="pr"><div class="pr-left"><p class="pr-bar"><button class="btn" type="button" data-pr="down" aria-label="Layer down">&#9660;</button><b data-pr-z></b><button class="btn" type="button" data-pr="up" aria-label="Layer up">&#9650;</button></p>
<canvas class="pr-grid" aria-label="The layer you are drawing, 8 by 8 blocks"></canvas>
<p class="pr-pal">${FIL.map((h, i) => `<button type="button" class="pr-sw${i ? "" : " er"}" data-pr-col="${i}" title="${NAMES[i]}" aria-label="${NAMES[i]}" aria-pressed="false"${i ? ` style="background:${h}"` : ""}></button>`).join("")}</p>
<p class="pr-bar"><button class="btn" type="button" data-pr="fill">Fill layer</button><button class="btn" type="button" data-pr="copy">Copy layer below</button><button class="btn" type="button" data-pr="wipe">Clear layer</button><button class="btn" type="button" data-pr="mirror" aria-pressed="false">Mirror</button></p></div>
<div class="pr-right"><canvas class="pr-view" aria-label="Preview of your figure"></canvas><p class="pr-bar"><button class="btn" type="button" data-pr="turn">Turn</button><span data-pr-count></span><button class="btn" type="button" data-pr="new">Start over</button></p>
<form class="pr-form" data-pr-form><label>Name your figure<input name="name" maxlength="20" minlength="2" required autocomplete="off" placeholder="Tiny rocket"></label><button class="btn go" type="submit">Print it</button><p class="bk-note" data-note>Draw the bottom layer first, then go up. Three prints a day.</p></form></div></div>`;
  }

  function shelf(el) {
    const { cur, done, queue } = split(), box = el.querySelector(".pr-shelf");
    if (!box) return;
    const one = (p, note, layers = N) => `<li><canvas data-pr-vox="${p.id}" data-layers="${layers}"></canvas><b>${esc(p.name)}</b><em>${esc(p.nick || "a visitor")}${note ? ", " + note : ""}</em></li>`;
    const f = cur ? (now() - cur.start) / S.dur : 0;
    box.innerHTML = (cur ? one(cur, `printing, ${Math.round(f * 100)}%`, Math.min(N, Math.floor(f * N) + 1)) : "") + queue.map((p, i) => one(p, `in the queue, number ${i + 1}`, 0)).join("") + done.map((p) => one(p, "")).join("") || `<li class="pr-none">Nothing printed yet. Be the first.</li>`;
    box.querySelectorAll("[data-pr-vox]").forEach((cv) => { const p = S.list.find((x) => x.id === cv.dataset.prVox); if (p) iso(cv, p.vox, 5, +cv.dataset.layers); });
    el.querySelector(".stb").innerHTML = `<span>${done.length} on the shelf</span><span>${cur ? "Printing " + esc(cur.name) : "The printer is free"}${queue.length ? `, ${queue.length} waiting` : ""}</span>`;
  }

  function render(el) {
    el.querySelector(".wb").innerHTML = `<div class="bk-tabs" role="tablist">${[["design", "Design"], ["shelf", "Shelf"]].map(([k, n]) => `<button type="button" role="tab" data-pr-tab="${k}" aria-selected="${k === S.tab}">${n}</button>`).join("")}</div>` +
      (S.tab === "design" ? design() : `<ul class="pr-shelf"></ul>`);
    if (S.tab === "design") { paint(el); el.querySelector(".stb").innerHTML = `<span>8 x 8 x 8 blocks</span><span>Free, three prints a day</span>`; }
    else shelf(el);
  }

  function open(tab) {
    if (tab) S.tab = tab;
    const el = window.gzDesk.open({ id: "printer", title: "Guest Printer", icon: "printer", cls: "w-printer", body: "", status: "<span></span>" });
    render(el);
    if (Date.now() - S.at > 8000) load();
    if (el.dataset.wired) return;
    el.dataset.wired = "1";
    el.addEventListener("pointerdown", (e) => {
      if (!e.target.closest(".pr-grid")) return;
      e.preventDefault();
      D.drag = null;
      e.target.setPointerCapture(e.pointerId);
      cell(el, e);
    });
    el.addEventListener("pointermove", (e) => { if (D.drag !== null && e.buttons && e.target.closest(".pr-grid")) cell(el, e); });
    el.addEventListener("pointerup", () => { D.drag = null; });
    el.addEventListener("click", (e) => {
      const t = e.target.closest("[data-pr-tab]");
      if (t) { S.tab = t.dataset.prTab; render(el); return; }
      const c = e.target.closest("[data-pr-col]");
      if (c) { D.col = +c.dataset.prCol; paint(el); return; }
      const b = e.target.closest("[data-pr]");
      if (!b) return;
      const a = b.dataset.pr, o = D.z * 64;
      if (a === "up" && D.z < N - 1) D.z++;
      if (a === "down" && D.z > 0) D.z--;
      if (a === "fill") for (let i = 0; i < 64; i++) D.vox[o + i] = D.col;
      if (a === "wipe") for (let i = 0; i < 64; i++) D.vox[o + i] = 0;
      if (a === "copy" && D.z) for (let i = 0; i < 64; i++) D.vox[o + i] = D.vox[o - 64 + i];
      if (a === "mirror") D.mirror = !D.mirror;
      if (a === "turn") D.turn = (D.turn + 1) % 4;
      if (a === "new") { D.vox.fill(0); D.z = 0; }
      paint(el);
    });
    el.addEventListener("submit", async (e) => {
      const f = e.target.closest("[data-pr-form]");
      if (!f) return;
      e.preventDefault();
      const note = f.querySelector("[data-note]"), btn = f.querySelector("[type=submit]");
      btn.disabled = true;
      try {
        const j = await api("/prints", { vox: text(), name: f.elements.name.value });
        const wait = Math.round(j.wait / 1000);
        toast(wait > 5 ? `Sent to the printer. It starts in ${wait > 90 ? Math.round(wait / 60) + " min" : wait + " s"}.` : `The printer is on it. Two and a half minutes and it's on the shelf.${j.got ? ` +${j.got} szyszki.` : ""}`);
        dispatchEvent(new CustomEvent("gz:printed"));
        S.tab = "shelf";
        await load();
        render(el);
      } catch (err) { note.textContent = err.message; }
      if (btn.isConnected) btn.disabled = false;
    });
  }

  document.addEventListener("click", (e) => {
    if (!e.target.closest("[data-printer]")) return;
    e.preventDefault();
    if (window.gzDesk.hideStart) window.gzDesk.hideStart();
    open(me() || split().done.length === 0 ? "design" : S.tab);
  });
  if (location.hash === "#printer") setTimeout(() => open("design"), 500);

  return { layout() { map(); } };
}
