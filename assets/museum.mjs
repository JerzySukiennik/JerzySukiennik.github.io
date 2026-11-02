/* Gzowo Museum on Gzowo Street: a full screen hall of visitor paintings with plaques, spotlights and benches,
   the easel into Gzowo Paint, and a detail window to buy, resell and follow every painting's history. */

import { api, ensure, cone, toast, BANK } from "/assets/bank.mjs";
import { esc } from "/assets/folks.mjs";

const PIX = {
  easel: { k: "#3a2416", b: "#9ecff9", y: "#ffd23f", g: "#69c04c", o: "#ff8c1a", d: "#5c3a21", w: "#8d5524" },
  bench: { w: "#a8703f", d: "#6b4423", k: "#2a2a2a" },
  plant: { g: "#2e9e44", l: "#69c04c", p: "#9b4f25", q: "#c0652e" },
};
const ART = {
  easel: ["..........dd..........", "..........dd..........", "..kkkkkkkkkkkkkkkkkk..", "..kbbbbbbbbbbbbbbbbk..", "..kbbbbbbbbbbbyybbbk..", "..kbbbbbbbbbbbyybbbk..",
    "..kbbbbbbbbbbbbbbbbk..", "..kbbbbbggbbbbbbbbbk..", "..kbbbbggggbbbbggbbk..", "..kbbggggggggbggggbk..", "..kggggggggggggggggk..", "..kgggoggggggggggggk..",
    "..kggggggggggggggggk..", "..kkkkkkkkkkkkkkkkkk..", ".dddddddddddddddddddd.", "....dw..........wd....", "....dw....dw....wd....", "...dw.....dw.....wd...",
    "...dw.....dw.....wd...", "..dw......dw......wd..", "..dw......dw......wd..", ".dw.......dw.......wd.", ".dw.......dw.......wd.", "dw........dw........wd"],
  bench: ["wwwwwwwwwwwwwwwwwwwwwwww", "dddddddddddddddddddddddd", ".kk..................kk.", ".kk..................kk.", ".kk..................kk.", ".kk..................kk."],
  plant: [".....gg.....", "..g.glg..g..", ".glgglggglg.", "glgglgglgglg", ".glgglgglgl.", "..gglgglgg..", "....glg.....", ".....g......", "..pppppppp..",
    "..pqqqqqqp..", "...pqqqqp...", "...pqqqqp...", "....pppp...."],
};
const FILTERS = [["all", "All"], ["sale", "For sale"], ["top", "Top rated"], ["mine", "Mine"]];

const M = { el: null, hall: null, list: [], filter: "all", loading: null, io: null, spot: null, detail: null };
const fmt = (n) => Math.floor(n).toLocaleString("en-US");
const day = (t) => new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const img = (id) => `${BANK}/art/${id}/img`;

function pix(name, k) {
  const rows = ART[name], pal = PIX[name], w = rows[0].length, h = rows.length;
  let out = "";
  rows.forEach((row, y) => [...row].forEach((ch, x) => { if (pal[ch]) out += `<rect x="${x}" y="${y}" width="1" height="1" fill="${pal[ch]}"/>`; }));
  return `<svg class="mu-pix" viewBox="0 0 ${w} ${h}" width="${w * k}" height="${h * k}" shape-rendering="crispEdges" aria-hidden="true">${out}</svg>`;
}

function fit(w, h, mw, mh, cap = 4) {
  const s = Math.min(mw / w, mh / h);
  const k = s >= 1 ? Math.min(cap, Math.floor(s)) : s;
  return [Math.round(w * k), Math.round(h * k)];
}

function shown() {
  let l = M.list.slice();
  if (M.filter === "sale") l = l.filter((a) => a.forsale && !a.mine);
  if (M.filter === "mine") l = l.filter((a) => a.mine || a.made);
  if (M.filter === "top") l.sort((a, b) => b.score - a.score || b.t - a.t);
  return l;
}

function frameCls(a) { return a.score >= 8 ? "gold" : a.score >= 5 ? "wood" : "plain"; }

function piece(a, i, mw, mh) {
  const [w, h] = fit(a.w, a.h, mw, mh);
  const owner = a.owner !== a.author ? `<span class="mu-own">owned by ${esc(a.owner)}</span>` : "";
  const price = a.forsale ? `<span class="mu-price">${cone(14)}${fmt(a.price)}</span>` : `<span class="mu-price no">Not for sale</span>`;
  const deco = i % 5 === 3 ? pix("plant", 4) : i % 3 === 1 ? pix("bench", 5) : "";
  return `<div class="mu-p" style="--pw:${w}px"><div class="mu-sp"></div><div class="mu-w">
<div class="mu-plq"><b class="mu-tt">${esc(a.title)}</b><span class="mu-by">by ${esc(a.author)}</span>${owner}${a.about ? `<span class="mu-ab">${esc(a.about)}</span>` : ""}<span class="mu-row">${price}<span class="mu-sc" title="Museum critic score">${a.score}/10</span></span></div>
<button class="mu-fr ${frameCls(a)}" type="button" data-art="${a.id}" aria-label="${esc(a.title)} by ${esc(a.author)}"><img data-src="${img(a.id)}" width="${w}" height="${h}" alt=""></button>
</div><div class="mu-fl">${deco}</div></div>`;
}

function render() {
  if (!M.el) return;
  const hall = M.hall, H = hall.clientHeight || innerHeight - 80, vw = innerWidth;
  const mh = Math.max(80, H * 0.65 - 150), mw = Math.max(120, Math.min(vw - 110, 640));
  const l = shown();
  M.el.querySelectorAll("[data-mu-f]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.muF === M.filter)));
  M.el.querySelector("[data-mu-n]").textContent = M.loading && !M.list.length ? "Opening the doors..." : `${l.length} painting${l.length === 1 ? "" : "s"}`;
  const empty = !M.loading && !l.length
    ? `<div class="mu-p mu-empty"><div class="mu-sp"></div><div class="mu-w"><p class="mu-plq"><b>${M.filter === "mine" ? "Nothing of yours here yet" : M.filter === "sale" ? "Nothing for sale right now" : "The walls are empty"}</b><span>Paint something at the easel and hang it here.</span></p></div><div class="mu-fl"></div></div>` : "";
  hall.querySelector(".mu-strip").innerHTML = `<div class="mu-p mu-door"><div class="mu-sp"></div><div class="mu-w mu-ez"><button class="mu-easel" type="button" data-paint>${pix("easel", Math.max(4, Math.min(7, Math.floor(H / 90))))}<span class="mu-plq"><b>Paint your own</b><span>Gzowo Paint, 22 tools. The critic pays up to 50 szyszki for a good one and you get 10% of every resale.</span></span></button></div><div class="mu-fl"></div></div>${l.map((a, i) => piece(a, i, mw, mh)).join("")}${empty}`;
  watch();
}

function watch() {
  if (M.io) M.io.disconnect();
  M.io = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    const im = e.target;
    im.src = im.dataset.src;
    im.removeAttribute("data-src");
    M.io.unobserve(im);
  }), { root: M.hall, rootMargin: "0px 700px" });
  M.hall.querySelectorAll("img[data-src]").forEach((im) => M.io.observe(im));
}

async function load() {
  M.loading = api("/art").then((j) => { M.list = j.art || []; }).catch((e) => { M.err = e.message; }).finally(() => { M.loading = null; });
  render();
  await M.loading;
  if (M.err && !M.list.length) M.el.querySelector("[data-mu-n]").textContent = M.err;
  M.err = null;
  render();
  label();
}

function label() {
  if (M.spot && M.list.length) M.spot.querySelector(".spot-l em").textContent = `${M.list.length} painting${M.list.length === 1 ? "" : "s"}`;
}

function build() {
  const el = document.createElement("section");
  el.className = "mu";
  el.hidden = true;
  el.setAttribute("aria-label", "Gzowo Museum");
  el.innerHTML = `<header class="mu-top"><button class="btn" type="button" data-mu-leave>&#9664; Leave</button><h2 class="mu-sign">Gzowo Museum</h2>
<nav class="mu-f">${FILTERS.map(([k, l]) => `<button type="button" data-mu-f="${k}" aria-pressed="false">${l}</button>`).join("")}</nav><span class="mu-n" data-mu-n></span></header>
<div class="mu-hall" tabindex="-1"><div class="mu-strip"></div></div>`;
  document.getElementById("wins").before(el);
  M.el = el;
  M.hall = el.querySelector(".mu-hall");
  el.addEventListener("click", (e) => {
    if (e.target.closest("[data-mu-leave]")) { leave(); return; }
    const f = e.target.closest("[data-mu-f]");
    if (f) { M.filter = f.dataset.muF; render(); M.hall.scrollLeft = 0; return; }
    const a = e.target.closest("[data-art]");
    if (a) openArt(a.dataset.art);
  });
  M.hall.addEventListener("wheel", (e) => {
    if (e.ctrlKey || Math.abs(e.deltaX) >= Math.abs(e.deltaY)) return;
    e.preventDefault();
    M.hall.scrollLeft += e.deltaY * (e.deltaMode === 1 ? 32 : 1);
  }, { passive: false });
  let rt = 0;
  addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { if (!el.hidden) render(); }, 200); });
}

export function openMuseum(artId) {
  if (window.gzDesk && window.gzDesk.hideStart) window.gzDesk.hideStart();
  if (!M.el) build();
  const was = M.el.hidden;
  M.el.hidden = false;
  document.documentElement.classList.add("in-museum");
  if (was) {
    M.el.classList.remove("is-in");
    void M.el.offsetWidth;
    M.el.classList.add("is-in");
    M.hall.focus({ preventScroll: true });
    window.dispatchEvent(new CustomEvent("gz:museum", { detail: true }));
  }
  if (was || !M.list.length) load();
  if (artId) openArt(artId);
}

function leave() {
  if (!M.el || M.el.hidden) return;
  M.el.hidden = true;
  document.documentElement.classList.remove("in-museum");
  if (M.io) M.io.disconnect();
  window.gzDesk.close("art");
  window.dispatchEvent(new CustomEvent("gz:museum", { detail: false }));
}

function histLine(h) {
  if (!h.from) return `<li><span>${day(h.t)}</span> Painted by <b>${esc(h.to)}</b></li>`;
  return `<li><span>${day(h.t)}</span> <b>${esc(h.from)}</b> sold it to <b>${esc(h.to)}</b> for ${cone(12)}${fmt(h.price)}</li>`;
}

function detailBody(a) {
  const vw = Math.min(innerWidth - 40, 520);
  const [w, h] = fit(a.w, a.h, vw, Math.min(innerHeight * 0.45, 360));
  let act;
  if (a.mine) {
    act = `<form class="mu-d-own" data-mu-price><label>Price ${cone(12)}<input name="price" type="number" min="1" max="1000000" value="${a.price}" required></label><label class="gp-chk"><input type="checkbox" name="forsale"${a.forsale ? " checked" : ""}> For sale</label><button class="btn" type="submit">Save</button></form>
<p class="bk-note">${a.made ? "You painted this one." : "It's yours. The painter gets 10% when you sell it on."}</p>`;
  } else if (a.forsale) {
    act = `<p class="bk-row"><button class="btn go" type="button" data-mu-buy="${a.id}" data-price="${a.price}">Buy for ${cone(12)}${fmt(a.price)}</button></p><p class="bk-note">${a.made ? "You painted this one, you get 10% of every sale after the first." : "The painter gets 10% every time it is sold again."}</p>`;
  } else act = `<p class="bk-note">Not for sale right now. The owner can put it up again any time.</p>`;
  return `<div class="mu-d"><div class="mu-d-img"><div class="mu-fr ${frameCls(a)}"><img src="${img(a.id)}" width="${w}" height="${h}" alt="${esc(a.title)}"></div></div>
<div class="mu-d-info"><h3>${esc(a.title)}</h3><p>by <b>${esc(a.author)}</b>${a.owner !== a.author ? `, owned by <b>${esc(a.owner)}</b>` : ""}</p>${a.about ? `<p class="mu-d-ab">${esc(a.about)}</p>` : ""}
<div class="mu-d-crit"><span class="mu-sc big">${a.score}/10</span><p>"${esc(a.comment || "...")}"<br><em>Haiku, museum critic</em></p></div>
<p class="mu-d-price">${a.forsale ? `${cone(16)}<b>${fmt(a.price)}</b>` : "<b>Not for sale</b>"}</p>${act}<p class="bk-note" data-mu-note></p>
<h4>History</h4><ol class="mu-d-hist">${(a.hist || []).map(histLine).join("")}</ol></div></div>`;
}

async function openArt(id) {
  const el = window.gzDesk.open({ id: "art", title: "Painting", icon: "frame", cls: "w-art", body: "<p class=\"bk-pad\">Taking it off the wall...</p>", status: "<span data-mu-st></span>" });
  M.detail = id;
  if (!el.dataset.ready) {
    el.dataset.ready = "1";
    el.addEventListener("click", (e) => { const b = e.target.closest("[data-mu-buy]"); if (b) buyArt(el, b); });
    el.addEventListener("submit", (e) => { if (e.target.matches("[data-mu-price]")) { e.preventDefault(); reprice(el, e.target); } });
  }
  const wb = el.querySelector(".wb");
  try {
    const a = await api(`/art/${id}`);
    if (M.detail !== id) return;
    show(el, a);
  } catch (e) { wb.innerHTML = `<p class="bk-pad">${esc(e.message)}</p>`; }
}

function show(el, a) {
  el.querySelector(".wb").innerHTML = detailBody(a);
  el.querySelector(".tb-t").textContent = a.title;
  el.querySelector("[data-mu-st]").textContent = `Hung ${day(a.t)}, sold ${a.sales} time${a.sales === 1 ? "" : "s"}`;
  const i = M.list.findIndex((x) => x.id === a.id);
  if (i >= 0) { const { hist, ...rest } = a; M.list[i] = rest; }
}

async function buyArt(el, b) {
  const note = el.querySelector("[data-mu-note]");
  b.disabled = true;
  note.textContent = "";
  try {
    await ensure();
    const j = await api(`/art/${b.dataset.muBuy}/buy`, { price: +b.dataset.price });
    show(el, j.art);
    toast(`"${j.art.title}" is yours now`);
    if (M.el && !M.el.hidden) render();
  } catch (e) {
    note.textContent = e.message;
    b.disabled = false;
    if (e.status === 409) openArt(b.dataset.muBuy);
  }
}

async function reprice(el, f) {
  const note = el.querySelector("[data-mu-note]"), btn = f.querySelector("[type=submit]");
  btn.disabled = true;
  try {
    const j = await api(`/art/${M.detail}/price`, { price: +f.price.value, forsale: f.forsale.checked });
    show(el, j.art);
    el.querySelector("[data-mu-note]").textContent = j.art.forsale ? "Saved, it's on sale." : "Saved, it stays on your wall.";
    if (M.el && !M.el.hidden) render();
  } catch (e) { note.textContent = e.message; btn.disabled = false; }
}

export function createMuseum(world) {
  const spot = document.createElement("button");
  spot.type = "button";
  spot.className = "spot spot-museum";
  spot.dataset.place = "museum";
  spot.dataset.museum = "";
  spot.setAttribute("aria-label", "Gzowo Museum, paintings by visitors");
  spot.innerHTML = `<img class="spr" src="/assets/map/museum.webp" alt="" draggable="false"><span class="spot-l"><b>Museum</b><em>paint and sell</em></span>`;
  world.querySelector(".spots").append(spot);
  M.spot = spot;
  api("/art").then((j) => { if (!M.list.length) M.list = j.art || []; label(); }).catch(() => {});
  addEventListener("gz:art", () => { if (M.el && !M.el.hidden) load(); else M.list = []; });
  return { layout() {} };
}

document.addEventListener("click", (e) => {
  const m = e.target.closest("[data-museum]");
  if (!m) return;
  e.preventDefault();
  const id = /^[a-f0-9]{16}$/.test(m.dataset.museum) ? m.dataset.museum : null;
  if (id) window.gzDesk.close("paint");
  openMuseum(id);
});

document.addEventListener("keydown", (e) => {
  if (!M.el || M.el.hidden || e.metaKey || e.ctrlKey || e.altKey) return;
  if (document.querySelector("#wins .win.on:not([hidden])") || (e.target.closest && e.target.closest("input, textarea, select"))) return;
  if (e.key === "Escape") leave();
  if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); M.hall.scrollBy({ left: (e.key === "ArrowRight" ? 1 : -1) * innerWidth * 0.5, behavior: "smooth" }); }
});
