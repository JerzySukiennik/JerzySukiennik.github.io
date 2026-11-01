/* Gzowo Labs cork board: anyone can pin a card with a short note, a tiny drawing or both. Cards stay up for a week, then fall off.
   The board on the map shows the newest cards as little paper squares with their real drawings; click it to read them all and pin your own. */

import { PLOT, DB, bad, esc, get, store, NAME_OK, TEXT_OK } from "/assets/folks.mjs";

const WEEK = 7 * 86400000, DW = 32, DH = 24, WAIT = 90000;
const INK = ["#111111", "#2f6fde", "#2e9e44", "#ff8c1a", "#7d4cdb", "#ff7eb6", "#7a4a2a", "#1fb5a8"];
const PAPER = ["#fff59a", "#ffc8e0", "#c8e6ff", "#d2f5c4", "#ffffff"];
const CORK = { x: 16 / 190, y: 38 / 173, w: 158 / 190, h: 82 / 173 }, MW = 79, MH = 41;

function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

function drawPic(cv, d, k) {
  cv.width = DW * k; cv.height = DH * k;
  const c = cv.getContext("2d");
  for (let i = 0; i < DW * DH; i++) {
    const ch = d[i];
    if (!ch || ch === ".") continue;
    c.fillStyle = INK[+ch];
    c.fillRect((i % DW) * k, ((i / DW) | 0) * k, k, k);
  }
}

const ago = (t) => {
  const h = Math.max(0, (Date.now() - t) / 3600000);
  return h < 1 ? "just now" : h < 24 ? `${Math.floor(h)} h ago` : `${Math.floor(h / 24)} day${Math.floor(h / 24) === 1 ? "" : "s"} ago`;
};
const left = (t) => {
  const d = Math.ceil((t + WEEK - Date.now()) / 86400000);
  return d <= 1 ? "falls off today" : `${d} days left`;
};

export function createBoard(world) {
  const spots = world.querySelector(".spots");
  const spot = document.createElement("button");
  spot.type = "button";
  spot.className = "spot spot-board";
  spot.dataset.place = "board";
  spot.setAttribute("aria-label", "Cork board, read and pin cards");
  spot.innerHTML = `<img class="spr" src="/assets/map/board.webp" alt="" draggable="false"><canvas class="spr bd-mini" width="${MW}" height="${MH}" style="left:${CORK.x * 100}%;top:${CORK.y * 100}%;width:${CORK.w * 100}%;height:${CORK.h * 100}%"></canvas><span class="spot-l"><b>Cork board</b><em>pin a card</em></span>`;
  spots.append(spot);
  const mini = spot.querySelector(".bd-mini"), sub = spot.querySelector(".spot-l em");
  let cards = [], loaded = null;

  const ok = (v) => v && typeof v.x === "string" && typeof v.d === "string" && Number.isFinite(v.t) && Number.isFinite(v.c) && /^([.0-7]{768})?$/.test(v.d) && Date.now() - v.t < WEEK;
  function load() {
    loaded = get(`${PLOT}/board.json?orderBy="t"&startAt=${Date.now() - WEEK}`).then((d) => {
      if (!d || typeof d !== "object") return cards;
      cards = Object.keys(d).filter((id) => ok(d[id])).map((id) => ({ id, ...d[id] })).sort((a, b) => b.t - a.t);
      paintMini();
      return cards;
    });
    return loaded;
  }

  function paintMini() {
    const c = mini.getContext("2d");
    c.clearRect(0, 0, MW, MH);
    cards.slice(0, 10).forEach((cd, i) => {
      const h = hash(cd.id), col = i % 5, row = Math.floor(i / 5);
      const x = 2 + col * 15 + (h % 3), y = 2 + row * 19 + ((h >> 3) % 3), w = 12, hh = 15;
      c.fillStyle = "rgba(0,0,0,.25)"; c.fillRect(x + 1, y + 1, w, hh);
      c.fillStyle = PAPER[cd.c] || PAPER[0]; c.fillRect(x, y, w, hh);
      if (cd.d) {
        for (let py = 0; py < 8; py++) for (let px = 0; px < 10; px++) {
          const ch = cd.d[Math.floor(py * 3) * DW + Math.floor(px * 3.2)];
          if (ch && ch !== ".") { c.fillStyle = INK[+ch]; c.fillRect(x + 1 + px, y + 3 + py, 1, 1); }
        }
      }
      if (cd.x) {
        c.fillStyle = "rgba(40,40,60,.6)";
        const lines = cd.d ? 1 : 3;
        for (let l = 0; l < lines; l++) c.fillRect(x + 2, y + (cd.d ? 12 : 4) + l * 3, 8 - ((h >> (l * 2)) % 4), 1);
      }
      c.fillStyle = (h >> 5) % 2 ? "#2f6fde" : "#ffd23f";
      c.fillRect(x + 5, y, 2, 2);
    });
    sub.textContent = cards.length ? `${cards.length} card${cards.length === 1 ? "" : "s"} this week` : "pin a card";
  }

  function cardHtml(cd) {
    const h = hash(cd.id);
    return `<article class="bd-c" style="--rot:${((h % 7) - 3) * 0.6}deg;background:${PAPER[cd.c] || PAPER[0]}"><i class="bd-pin" style="background:${(h >> 5) % 2 ? "#2f6fde" : "#ffd23f"}"></i>${cd.d ? `<canvas data-pic="${cd.id}"></canvas>` : ""}${cd.x ? `<p>${esc(cd.x)}</p>` : ""}<footer><b>${esc(cd.n || "someone")}</b><span>${ago(cd.t)}, ${left(cd.t)}</span></footer></article>`;
  }

  function open() {
    const D = window.gzDesk;
    if (!D) return;
    const el = D.open({ id: "board", title: "Cork Board", icon: "pin", cls: "w-board", body: formHtml() + `<div class="bd-wall" data-cards><p class="bd-empty">Loading...</p></div>`,
      status: `<span data-n>...</span><span>Cards fall off after a week</span>` });
    if (!el.dataset.ready) { el.dataset.ready = "1"; wire(el); }
    load().then(() => list(el));
  }

  function list(el) {
    const box = el.querySelector("[data-cards]");
    if (!box) return;
    el.querySelector("[data-n]").textContent = `${cards.length} card${cards.length === 1 ? "" : "s"}`;
    box.innerHTML = cards.length ? cards.map(cardHtml).join("") : `<p class="bd-empty">The board is empty. Pin the first card!</p>`;
    box.querySelectorAll("[data-pic]").forEach((cv) => { const cd = cards.find((x) => x.id === cv.dataset.pic); if (cd) drawPic(cv, cd.d, 3); });
  }

  function formHtml() {
    return `<form class="bd-form" novalidate><div class="bd-draw"><canvas class="bd-pad" width="${DW * 6}" height="${DH * 6}" aria-label="Draw on your card"></canvas>
<div class="bd-ink" role="group" aria-label="Pen color">${INK.map((c, i) => `<button type="button" data-ink="${i}" style="background:${c}" aria-label="Color ${i + 1}"${i === 0 ? ' class="on"' : ""}></button>`).join("")}<button type="button" data-ink="-1" class="bd-er" aria-label="Eraser">&#9003;</button><button type="button" class="btn" data-wipe>Clear</button></div></div>
<div class="bd-side"><textarea name="x" maxlength="120" rows="3" placeholder="Write something nice, or just draw"></textarea>
<div class="bd-paper" role="group" aria-label="Card color">${PAPER.map((c, i) => `<button type="button" data-paper="${i}" style="background:${c}" aria-label="Card color ${i + 1}"${i === 0 ? ' class="on"' : ""}></button>`).join("")}</div>
<input name="n" maxlength="16" autocomplete="nickname" placeholder="Your name (optional)">
<p class="bd-acts"><button class="btn go" type="submit">Pin it</button><span class="bd-count">120</span></p><p class="bd-note" role="status"></p></div></form>`;
  }

  function wire(el) {
    const pad = el.querySelector(".bd-pad"), pc = pad.getContext("2d"), form = el.querySelector(".bd-form"), note = el.querySelector(".bd-note");
    let pic = store.get("gl-board-draft", ".".repeat(DW * DH)), ink = 0, paper = 0, last = null;
    if (typeof pic !== "string" || pic.length !== DW * DH) pic = ".".repeat(DW * DH);
    function render() {
      for (let y = 0; y < DH; y++) for (let x = 0; x < DW; x++) {
        const ch = pic[y * DW + x];
        pc.fillStyle = ch === "." ? PAPER[paper] : INK[+ch];
        pc.fillRect(x * 6, y * 6, 6, 6);
      }
      pc.fillStyle = "rgba(0,0,0,.05)";
      for (let x = 1; x < DW; x++) pc.fillRect(x * 6, 0, 1, DH * 6);
      for (let y = 1; y < DH; y++) pc.fillRect(0, y * 6, DW * 6, 1);
    }
    const cell = (e) => {
      const r = pad.getBoundingClientRect(), x = Math.floor(((e.clientX - r.left) / r.width) * DW), y = Math.floor(((e.clientY - r.top) / r.height) * DH);
      return x >= 0 && y >= 0 && x < DW && y < DH ? [x, y] : null;
    };
    const dot = ([x, y]) => { const i = y * DW + x; pic = pic.slice(0, i) + (ink < 0 ? "." : String(ink)) + pic.slice(i + 1); };
    function stroke(a, b) {
      let [x0, y0] = a;
      const [x1, y1] = b, dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
      let err = dx + dy;
      for (;;) {
        dot([x0, y0]);
        if (x0 === x1 && y0 === y1) break;
        const e2 = 2 * err;
        if (e2 >= dy) { err += dy; x0 += sx; }
        if (e2 <= dx) { err += dx; y0 += sy; }
      }
    }
    pad.addEventListener("pointerdown", (e) => { const c = cell(e); if (!c) return; e.preventDefault(); pad.setPointerCapture(e.pointerId); last = c; dot(c); render(); });
    pad.addEventListener("pointermove", (e) => { if (!last) return; const c = cell(e); if (!c || (c[0] === last[0] && c[1] === last[1])) return; stroke(last, c); last = c; render(); });
    const up = () => { if (last) store.set("gl-board-draft", pic); last = null; };
    pad.addEventListener("pointerup", up);
    pad.addEventListener("pointercancel", up);
    const ta = form.querySelector("textarea"), count = form.querySelector(".bd-count");
    ta.addEventListener("input", () => { count.textContent = String(120 - ta.value.length); });
    el.addEventListener("click", (e) => {
      const i = e.target.closest("[data-ink]");
      if (i) { ink = +i.dataset.ink; el.querySelectorAll("[data-ink]").forEach((b) => b.classList.toggle("on", b === i)); return; }
      const p = e.target.closest("[data-paper]");
      if (p) { paper = +p.dataset.paper; el.querySelectorAll("[data-paper]").forEach((b) => b.classList.toggle("on", b === p)); render(); return; }
      if (e.target.closest("[data-wipe]")) { pic = ".".repeat(DW * DH); store.set("gl-board-draft", pic); render(); }
    });
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const x = ta.value.trim().slice(0, 120), n = form.querySelector("[name=n]").value.trim().slice(0, 16), drawn = /[0-7]/.test(pic);
      if (!x && !drawn) { note.textContent = "Write or draw something first."; return; }
      if (x && (bad(x) || !TEXT_OK.test(x))) { note.textContent = "Try different words."; return; }
      if (n && (bad(n) || !NAME_OK.test(n))) { note.textContent = "Pick a different name."; return; }
      const wait = Math.ceil((WAIT - (Date.now() - store.get("gl-board-at", 0))) / 1000);
      if (wait > 0) { note.textContent = `The pins need ${wait} s more.`; return; }
      const btn = form.querySelector("[type=submit]");
      btn.disabled = true;
      note.textContent = "Pinning...";
      const rec = { x, d: drawn ? pic : "", c: paper, t: { ".sv": "timestamp" } };
      if (n) rec.n = n;
      try {
        const r = await fetch(`${DB}/${PLOT}/board.json`, { method: "POST", body: JSON.stringify(rec) });
        if (!r.ok) throw r.status;
        store.set("gl-board-at", Date.now());
        pic = ".".repeat(DW * DH);
        store.set("gl-board-draft", pic);
        ta.value = ""; count.textContent = "120";
        note.textContent = "Pinned! It stays up for a week.";
        render();
        dispatchEvent(new CustomEvent("gz:pinned"));
        await load();
        list(el);
      } catch (err) { note.textContent = "The board is offline, try later."; }
      btn.disabled = false;
    });
    render();
  }

  spot.addEventListener("click", (e) => { e.preventDefault(); open(); });
  document.addEventListener("click", (e) => { if (e.target.closest("[data-board]")) { e.preventDefault(); open(); } });
  (window.requestIdleCallback || ((f) => setTimeout(f, 1500)))(() => load());
  setInterval(() => { if (!document.hidden) load(); }, 180000);

  return { layout() {}, open };
}
