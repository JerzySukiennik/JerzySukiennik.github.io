/* Gzowo Cards: the card kiosk on the plot. Foil packs bought with szyszki and torn open by hand, cards flipped one by one
   with a moment for every rarity, holographic finishes, and an album to fill, all backed by the gzowo-bank worker.
   Drawings sold on the wall and paintings sold in the museum come back as Gallery cards. */

import { api, ensure, me, toast, cone, BANK } from "/assets/bank.mjs";
import { esc, store } from "/assets/folks.mjs";
import { icon } from "/assets/views.mjs";

const RAR = ["common", "rare", "epic", "legendary"], RANK = Object.fromEntries(RAR.map((r, i) => [r, i]));
const RNAME = { common: "Common", rare: "Rare", epic: "Epic", legendary: "Legendary" };
const RCOL = { common: "#eef2fb", rare: "#58b4ff", epic: "#c77bff", legendary: "#ffc21f" };
const SETS = [["labs", "Labs"], ["gzowo", "Gzowo"], ["map", "The Map"], ["gallery", "Gallery"]];
const PACK = {
  labs: { art: '<img src="/assets/map/lab.webp" alt="" draggable="false">', line: "Games, apps and AI from the Labs" },
  gzowo: { art: '<img class="ph" src="/assets/cards/g-osmiornica.jpg" alt="" draggable="false">', line: "Real photos from the plot in Gzowo" },
  map: { art: '<img src="/assets/map/arcade.webp" alt="" draggable="false">', line: "Pixel things from this map" },
  gallery: { art: icon("frame", 64), line: "Art that players sold" },
  gold: { art: icon("cone", 64), line: "All three sets, one Epic or better" },
  free: { art: icon("cards", 64), line: "One free card every day" },
};
const SOUNDS = ["tear", "rip", "crinkle", "flip", "deal", "deal2", "shuffle", "whoosh", "thud", "cone", "crunch", "rare", "epic", "charge", "legend", "ding"];
const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
const C = { cat: null, base: null, list: [], packs: null, sell: {}, owned: {}, tab: "packs", fresh: new Set(), busy: false, stage: null, loading: null };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
const rnd = (a, b) => a + Math.random() * (b - a);
const win = () => window.gzDesk && window.gzDesk.find("cards");
const root = document.documentElement;
function backstage(on) {
  root.classList.toggle("gk-on", on);
  if (!root.classList.contains("in-museum")) dispatchEvent(new CustomEvent("gz:museum", { detail: on }));
}

let ac = null, sfx = null;
const muted = () => store.get("gl-cards-mute", false);
function audio() {
  ac = ac || new (window.AudioContext || window.webkitAudioContext)();
  if (ac.state === "suspended") ac.resume();
  return ac;
}
function loadSfx() {
  if (sfx) { audio(); return; }
  sfx = {};
  const a = audio();
  SOUNDS.forEach((n) => fetch(`/assets/sfx/cards/${n}.mp3`).then((r) => r.arrayBuffer()).then((b) => a.decodeAudioData(b)).then((buf) => { sfx[n] = buf; }).catch(() => {}));
}
function play(name, o = {}) {
  if (muted() || !sfx || !sfx[name]) return;
  const a = audio(), src = a.createBufferSource(), g = a.createGain(), t0 = a.currentTime + (o.delay || 0), vol = o.gain == null ? 1 : o.gain;
  src.buffer = sfx[name];
  src.playbackRate.value = o.rate || 1;
  if (o.dur) {
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.012);
    g.gain.setValueAtTime(vol, t0 + o.dur - 0.03);
    g.gain.linearRampToValueAtTime(0, t0 + o.dur);
  } else g.gain.value = vol;
  src.connect(g).connect(a.destination);
  if (o.dur) src.start(t0, o.at || 0, o.dur + 0.02); else src.start(t0, o.at || 0);
}

function load(force) {
  if (C.loading && !force) return C.loading;
  C.loading = (async () => {
    if (!C.base || force) C.base = (await fetch("/assets/cards.json" + (force ? "?t=" + Date.now() : "")).then((r) => r.json())).cards;
    const v = await api("/cards");
    C.list = [...C.base, ...(v.art || []).map((c) => ({ ...c, img: BANK + c.img }))];
    C.cat = new Map(C.list.map((c) => [c.id, c]));
    C.packs = v.packs;
    C.sell = v.sell;
    C.owned = v.owned || {};
    C.goals = v.goals || {};
    C.claims = new Set(v.claims || []);
    C.free = v.free !== false;
  })().finally(() => { C.loading = null; });
  return C.loading;
}

function cardHTML(c, cls = "") {
  const art = c.set === "map"
    ? `<span class="gk-art gk-bg-${c.bg}">${c.icon ? icon(c.icon, 64) : `<img src="${c.sprite}" alt="" draggable="false">`}<i class="gk-holo"></i></span>`
    : `<span class="gk-art${c.set === "gallery" ? " gk-fit gk-bg-" + c.bg : ""}"><img src="${c.img}" alt="" draggable="false" decoding="async"><i class="gk-holo"></i></span>`;
  return `<span class="gk gk-${c.set} gk-${c.rarity}${c.full ? " gk-full" : ""}${cls ? " " + cls : ""}">` +
    `<span class="gk-in">${art}<b class="gk-name">${esc(c.name)}</b><span class="gk-tag"><i class="gk-gem"></i>${esc(c.tag)}</span><span class="gk-txt">${esc(c.text)}</span><span class="gk-foot"><span>${SETS.find((x) => x[0] === c.set)[1]}</span><span>${RNAME[c.rarity]}</span></span></span>` +
    `<i class="gk-glare"></i></span>`;
}

function packHTML(kind, name, n, cls = "") {
  let seed = (kind.charCodeAt(0) * 131 + kind.length * 17) % 233280;
  const r = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  const jag = Array.from({ length: 15 }, (_, i) => [i / 14 * 100, i === 0 || i === 14 ? 12 : 11.1 + r() * 1.8]);
  const strip = [...Array.from({ length: 23 }, (_, i) => `${(i / 22 * 100).toFixed(1)}% ${i % 2 ? 0 : 20}%`), ...jag.slice().reverse().map(([x, y]) => `${x.toFixed(1)}% ${(y / 13 * 100).toFixed(1)}%`)].join(",");
  const body = [...jag.map(([x, y]) => `${x.toFixed(1)}% ${Math.max(0, (y - 11.25) / 89 * 100).toFixed(2)}%`), ...Array.from({ length: 23 }, (_, i) => `${(100 - i / 22 * 100).toFixed(1)}% ${i % 2 ? 100 : 97.6}%`)].join(",");
  const p = PACK[kind], top = `<span class="gk-pk-cut"><span class="gk-pk-strip" style="clip-path:polygon(${strip})"></span></span>`;
  return `<span class="gk-pack gk-pk-${kind}${cls ? " " + cls : ""}"><span class="gk-pk-in"><i></i><i></i><i></i></span>` +
    `<span class="gk-pk-body" style="clip-path:polygon(${body})"><span class="gk-pk-face"><em>Gzowo Cards</em><span class="gk-pk-art">${p.art}</span><b>${esc(name)}</b><small>${n} ${n === 1 ? "card" : "cards"}</small></span><i class="gk-pk-crimp"></i><i class="gk-pk-shine"></i></span>` +
    `<span class="gk-pk-top"><span class="gk-pk-sa">${top}</span><span class="gk-pk-sd">${top}</span></span><i class="gk-pk-glow"></i></span>`;
}

const FREE = { id: "free", name: "Daily Card", n: 1, price: 0 };
const have = (set) => C.list.filter((c) => (!set || c.set === set) && C.owned[c.id]).length;
const total = (set) => C.list.filter((c) => !set || c.set === set).length;
function extras() {
  let n = 0, szy = 0;
  for (const c of C.list) { const k = (C.owned[c.id] || 0) - 1; if (k > 0) { n += k; szy += k * (C.sell[c.rarity] || 0); } }
  return { n, szy };
}

function packsView() {
  if (!C.packs) return `<p class="bk-pad">Opening the kiosk...</p>`;
  const szy = me() ? me().szy : null;
  const odds = C.packs.map((p) => `<tr><th>${esc(p.name)}</th>${p.odds[0].map((v) => `<td>${v}%</td>`).join("")}<td>${p.odds[1].map((v, i) => (v ? `${RNAME[RAR[i]]} ${v}%` : "")).filter(Boolean).join(", ")}</td></tr>`).join("");
  return `<form class="gk-daily" data-gk-free><button class="gk-slot-b" type="button" data-gk-peek aria-label="Daily card">${packHTML("free", FREE.name, 1, "is-idle")}</button><p><b>Daily card</b><span>One free card every day, from any set. Come back tomorrow for the next one.</span><span class="bk-note" data-note></span></p>
<button class="btn go" type="submit"${C.free ? "" : " disabled"}>${C.free ? "Take it" : "Taken today"}</button></form>
<div class="gk-rack">${C.packs.map((p) => `<form class="gk-slot" data-gk-buy="${p.id}"><button class="gk-slot-b" type="button" data-gk-peek aria-label="${esc(p.name)}">${packHTML(p.id, p.name, p.n, "is-idle")}</button>
<b>${esc(p.name)}</b><span>${PACK[p.id].line}</span><button class="btn go" type="submit"${p.ready === false || (szy !== null && szy < p.price) ? " disabled" : ""}>${cone(16)} ${p.price}</button><span class="bk-note" data-note>${p.ready === false ? `Opens after ${p.n} sold drawings, ${total("gallery")} so far` : szy !== null && szy < p.price ? `${p.price - Math.floor(szy)} more to go` : ""}</span></form>`).join("")}</div>
<details class="gk-info"><summary>${C.packs[0].n} cards in every pack. The last one is always Rare or better.</summary><table><tr><th>Cards 1 to ${C.packs[0].n - 1}</th>${RAR.map((r) => `<th>${RNAME[r]}</th>`).join("")}<th>Last card</th></tr>${odds}</table>
<p>Extra copies of a card can be traded back in at the album: ${RAR.map((r) => `${RNAME[r]} ${C.sell[r]}`).join(", ")} szyszki each.</p>
<p>Sell a drawing from the wall to Haiku, or a painting in the museum, and it becomes a Gallery card. You get the first copy, everyone else can pull it from a Gallery Pack or a Golden Pack. The score Haiku gives sets how rare it is.</p></details>`;
}

function albumView() {
  if (!C.cat) return `<p class="bk-pad">Opening the album...</p>`;
  const ex = extras();
  return `<div class="gk-album">${SETS.map(([set, label]) => {
    const list = C.list.filter((c) => c.set === set).sort((a, b) => RANK[b.rarity] - RANK[a.rarity] || a.name.localeCompare(b.name));
    if (!list.length) return `<h3 class="gk-set">${label}<span>0 / 0</span></h3><p class="gk-none">No drawings sold yet. Sell one from the wall to Haiku, or a painting in the museum, and it shows up here as a card.</p>`;
    const got = have(set), goals = set === "gallery" ? "" : `<p class="gk-goals">${Object.entries(C.goals || {}).map(([pct, prize]) => {
      const need = Math.ceil((list.length * pct) / 100), done = C.claims.has(`${set}:${pct}`);
      return done ? `<span class="gk-goal is-done">${pct}% collected</span>` : got >= need ? `<button class="btn go gk-goal" type="button" data-gk-goal="${set}:${pct}">${pct}%: collect ${cone(16)} ${prize}</button>` : `<span class="gk-goal">${pct}%: ${cone(16)} ${prize}, ${need - got} to go</span>`;
    }).join("")}</p>`;
    return `<h3 class="gk-set">${label}<span>${have(set)} / ${list.length}</span></h3><div class="gk-prog"><i style="width:${list.length ? have(set) / list.length * 100 : 0}%"></i></div>${goals}<div class="gk-grid">${list.map((c) => {
      const n = C.owned[c.id] || 0;
      return n ? `<button class="gk-cell${C.fresh.has(c.id) ? " is-fresh" : ""}" type="button" data-gk-card="${c.id}" title="${esc(c.name)}" aria-label="${esc(c.name)}, ${RNAME[c.rarity]}">${cardHTML(c, "gk-mini")}${n > 1 ? `<i class="gk-n">x${n}</i>` : ""}</button>`
        : `<button class="gk-cell" type="button" disabled aria-label="Missing ${RNAME[c.rarity]} card"><span class="gk gk-miss gk-${c.rarity}"><b>?</b><i class="gk-gem"></i></span></button>`;
    }).join("")}</div>`;
  }).join("")}${ex.n ? `<div class="gk-trade"><p>You have ${ex.n} extra ${ex.n === 1 ? "copy" : "copies"}.</p><button class="btn" type="button" data-gk-sell>Trade them in for ${cone(16)} ${ex.szy}</button></div>` : ""}</div>`;
}

function render() {
  const el = win();
  if (!el || el.hidden) return;
  const view = el.querySelector(".gk-view"), top = view ? view.scrollTop : 0, t = C.tab;
  el.querySelector(".wb").innerHTML = `<div class="bk-tabs" role="tablist">${[["packs", "Packs"], ["album", C.cat ? `Album ${have()} / ${total()}` : "Album"]].map(([k, l]) => `<button type="button" role="tab" data-gk-tab="${k}" aria-selected="${k === t}">${l}</button>`).join("")}</div><div class="gk-view">${t === "packs" ? packsView() : albumView()}</div>`;
  el.querySelector(".gk-view").scrollTop = top;
  el.querySelector(".stb").innerHTML = `<span>${me() ? Math.floor(me().szy).toLocaleString("en-US") + " szyszki" : "No wallet yet, the first pack opens one"}</span><span>Card Kiosk, Gzowo Street</span>`;
}

export function openKiosk(tab) {
  if (tab) C.tab = tab;
  loadSfx();
  window.gzDesk.open({ id: "cards", title: "Card Kiosk", icon: "cards", cls: "w-cards", body: "", status: "<span></span>" });
  render();
  load().then(render).catch((e) => { const v = win() && win().querySelector(".gk-view"); if (v) v.innerHTML = `<p class="bk-pad">${esc(e.message || "The kiosk is closed, try again in a minute.")}</p>`; });
}

function look(id) {
  const c = C.cat.get(id), n = C.owned[id] || 0;
  if (!c || !n) return;
  C.fresh.delete(id);
  const el = document.createElement("div");
  el.className = "gk-look";
  el.innerHTML = `<div class="gk-look-c">${cardHTML(c, "is-live")}</div><div class="gk-look-s"><p><b>${esc(c.name)}</b>, ${RNAME[c.rarity]}. You have ${n}.</p><p class="bk-row">${c.href ? `<a class="btn" href="${c.href}" data-nav>Open the project</a>` : ""}${n > 1 ? `<button class="btn" type="button" data-gk-sell="${id}">Trade in ${n - 1} for ${cone(16)} ${(n - 1) * C.sell[c.rarity]}</button>` : ""}<button class="btn go" type="button" data-gk-shut>Close</button></p></div>`;
  document.body.append(el);
  const card = el.querySelector(".gk");
  el.addEventListener("pointermove", (e) => tilt(card, card, e, 15));
  el.addEventListener("pointerleave", () => untilt(card, card));
  const shut = () => { removeEventListener("keydown", key, true); el.remove(); render(); };
  const key = (e) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); shut(); } };
  addEventListener("keydown", key, true);
  el.addEventListener("click", (e) => { if (e.target === el || e.target.closest("[data-gk-shut],[data-nav]")) shut(); });
  play("deal");
}

function tilt(card, target, e, max) {
  const r = card.getBoundingClientRect(), x = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), y = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
  card.classList.remove("is-live");
  card.style.setProperty("--mx", x.toFixed(3));
  card.style.setProperty("--my", y.toFixed(3));
  target.style.setProperty("--ry", ((x - 0.5) * 2 * max).toFixed(1) + "deg");
  target.style.setProperty("--rx", ((0.5 - y) * 2 * max).toFixed(1) + "deg");
}
function untilt(card, target) {
  target.style.setProperty("--ry", "0deg");
  target.style.setProperty("--rx", "0deg");
}

async function sell(id) {
  try {
    const j = await api("/cards/sell", id ? { card: id } : {});
    C.owned = j.owned;
    play("crunch");
    toast(`+${j.got} for ${j.count} extra ${j.count === 1 ? "card" : "cards"}`);
    document.querySelectorAll(".gk-look [data-gk-shut]").forEach((n) => n.click());
  } catch (e) { toast(e.message); }
  render();
}

function flyCones(from, to, n) {
  if (calm) return;
  for (let i = 0; i < n; i++) {
    const el = document.createElement("i");
    el.className = "gk-cone";
    el.innerHTML = icon("cone", 20);
    document.body.append(el);
    const mx = (from.x + to.x) / 2 + rnd(-70, 70), my = Math.min(from.y, to.y) - rnd(70, 150);
    const a = el.animate([
      { transform: `translate(${from.x}px,${from.y}px) rotate(0deg) scale(.6)`, opacity: 0 },
      { transform: `translate(${(from.x + mx) / 2}px,${(from.y + my) / 2}px) rotate(90deg) scale(1)`, opacity: 1, offset: 0.2 },
      { transform: `translate(${mx}px,${my}px) rotate(200deg) scale(1.2)`, opacity: 1, offset: 0.55 },
      { transform: `translate(${to.x}px,${to.y}px) rotate(360deg) scale(.7)`, opacity: 1 },
    ], { duration: 560, delay: i * 60, easing: "cubic-bezier(.35,0,.55,1)", fill: "both" });
    a.onfinish = () => { el.remove(); play("cone", { rate: rnd(0.85, 1.3), gain: 0.7 }); };
  }
}

async function buy(kind, slot) {
  if (C.busy) return;
  C.busy = true;
  loadSfx();
  const note = slot && slot.querySelector("[data-note]"), btn = slot && slot.querySelector("[type=submit]"), pk = slot && slot.querySelector(".gk-pack"), from = pk ? pk.getBoundingClientRect() : null;
  if (note) note.textContent = "";
  if (btn) btn.disabled = true;
  try {
    await ensure();
    if (!C.packs) await load();
    const res = await api(kind === "free" ? "/cards/free" : "/cards/buy", kind === "free" ? {} : { pack: kind });
    if (kind === "free") C.free = false;
    C.owned = res.owned;
    if (res.cards.some((c) => !C.cat.has(c.id))) await load(true).catch(() => {});
    res.cards.forEach((c) => { if (c.fresh) C.fresh.add(c.id); });
    const tray = document.querySelector(".tray-w");
    if (from && tray && kind !== "free") { const t = tray.getBoundingClientRect(); flyCones({ x: t.left + t.width / 2, y: t.top }, { x: from.left + from.width / 2, y: from.top + from.height / 2 }, 7); await wait(calm ? 0 : 620); }
    await openStage(kind, res, from);
  } catch (e) {
    const live = win() && win().querySelector(kind === "free" ? "[data-gk-free] [data-note]" : `[data-gk-buy="${kind}"] [data-note]`);
    if (kind === "free" && e.status === 409) { C.free = false; render(); }
    if (slot && live) live.textContent = e.message; else toast(e.message);
  }
  C.busy = false;
}

function mv(el, o) {
  for (const k of ["x", "y"]) if (o[k] != null) el.style.setProperty("--" + k, o[k].toFixed(1) + "px");
  if (o.r != null) el.style.setProperty("--r", o.r + "deg");
  if (o.s != null) el.style.setProperty("--s", o.s.toFixed(4));
  if (o.z != null) el.style.setProperty("--z", o.z);
  el.style.setProperty("--ms", (o.ms == null ? 450 : o.ms) + "ms");
  el.style.setProperty("--ez", o.ez || "cubic-bezier(.2,1.15,.35,1)");
}

function fxOf(stage) {
  const cv = stage.querySelector(".gk-fx"), ctx = cv.getContext("2d");
  let parts = [], raf = 0, last = 0, k = 1;
  const size = () => { k = Math.min(devicePixelRatio || 1, 1.5); cv.width = Math.round(innerWidth * k); cv.height = Math.round(innerHeight * k); };
  size();
  function step(now) {
    const dt = Math.min(0.04, (now - last) / 1000 || 0.016);
    last = now;
    ctx.clearRect(0, 0, cv.width, cv.height);
    parts = parts.filter((p) => {
      p.life += dt;
      if (p.life >= p.max) return false;
      p.vy += p.g * dt;
      p.vx *= 1 - 1.4 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      const f = p.life / p.max, a = f > 0.7 ? (1 - f) / 0.3 : 1, s = Math.max(1, Math.round(p.size * k * (p.plus ? 0.6 + Math.abs(Math.sin(p.life * 14 + p.rot)) : 1)));
      ctx.globalAlpha = a;
      ctx.fillStyle = p.col;
      if (p.plus) {
        ctx.fillRect(Math.round(p.x * k - s * 1.5), Math.round(p.y * k - s / 2), s * 3, s);
        ctx.fillRect(Math.round(p.x * k - s / 2), Math.round(p.y * k - s * 1.5), s, s * 3);
      } else {
        ctx.save();
        ctx.translate(p.x * k, p.y * k);
        ctx.rotate(p.rot);
        ctx.fillRect(-s / 2, -s / 2, s, s * (p.long ? 2.2 : 1));
        ctx.restore();
      }
      return true;
    });
    ctx.globalAlpha = 1;
    raf = parts.length ? requestAnimationFrame(step) : 0;
  }
  function burst(x, y, n, cols, o = {}) {
    if (calm) return;
    for (let i = 0; i < n; i++) {
      const a = o.arc ? rnd(o.arc[0], o.arc[1]) : rnd(0, Math.PI * 2), sp = rnd(o.speed ? o.speed * 0.35 : 90, o.speed || 320);
      parts.push({ x: x + rnd(-1, 1) * (o.spread || 0), y: y + rnd(-1, 1) * (o.spreadY || 0), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (o.up || 0), g: o.g == null ? 700 : o.g, life: 0, max: rnd(0.45, o.life || 1.1),
        size: rnd(2.5, o.size || 6), rot: rnd(0, 6.28), vr: rnd(-10, 10), col: cols[i % cols.length], plus: !!o.plus && i % 2 === 0, long: !!o.long });
    }
    if (parts.length > 260) parts.splice(0, parts.length - 260);
    if (!raf) { last = performance.now(); raf = requestAnimationFrame(step); }
  }
  return { burst, size, stop() { cancelAnimationFrame(raf); parts = []; } };
}

function layout(S) {
  const vw = innerWidth, vh = innerHeight, port = vh > vw * 1.05, n = S.items.length, gap = port ? 8 : 14;
  S.cw = Math.round(Math.min(vw * (port ? 0.66 : 0.3), vh * 0.5 / 1.4, 340));
  S.pw = Math.round(Math.min(vw * (port ? 0.56 : 0.24), vh * 0.52 / 1.5, 300));
  S.stage.style.setProperty("--cw", S.cw + "px");
  S.stage.style.setProperty("--pw", S.pw + "px");
  S.heroY = -vh * 0.02;
  S.trayS = Math.min(0.3, (vw - 24) / n / S.cw * 0.9);
  S.trayY = vh * 0.44 - S.cw * 1.4 * S.trayS * 0.5;
  const rows = port ? [Math.ceil(n / 2), Math.floor(n / 2)].filter(Boolean) : [n];
  const w = Math.min((vw - 28 - gap * (rows[0] - 1)) / rows[0], (vh * (port ? 0.68 : 0.56) - gap * (rows.length - 1)) / rows.length / 1.4, 250);
  S.rowS = w / S.cw;
  S.slots = [];
  rows.forEach((count, ri) => {
    for (let i = 0; i < count; i++) S.slots.push({ x: (i - (count - 1) / 2) * (w + gap), y: (ri - (rows.length - 1) / 2) * (w * 1.4 + gap) - vh * (port ? 0.045 : 0.03) });
  });
}

async function openStage(kind, res, from) {
  if (C.stage) closeStage(true);
  const pack = C.packs.find((p) => p.id === kind) || FREE;
  const items = res.cards.map((c) => ({ ...c, card: C.cat.get(c.id) })).filter((c) => c.card).sort((a, b) => RANK[a.card.rarity] - RANK[b.card.rarity]);
  const best = items.length ? items[items.length - 1].card.rarity : "common";
  items.forEach((it) => { if (it.card.img) new Image().src = it.card.img; });
  const stage = document.createElement("div");
  stage.className = "gk-stage";
  stage.setAttribute("role", "dialog");
  stage.setAttribute("aria-label", "Opening a " + pack.name);
  stage.innerHTML = `<i class="gk-rays"></i><i class="gk-dim"></i><div class="gk-mid"><div class="gk-pkw">${packHTML(kind, pack.name, pack.n)}</div>${items.map((it, i) =>
    `<div class="gk-sc" style="--z:${20 - i}"><div class="gk-fl">${cardHTML(it.card)}<span class="gk-back">${icon("cone", 64)}</span></div><b class="gk-new">NEW</b></div>`).join("")}</div>
<canvas class="gk-fx"></canvas><i class="gk-flash"></i><b class="gk-call"></b><span class="gk-count"></span><p class="gk-hint"></p>
<div class="gk-top"><button class="btn" type="button" data-gk-mute>${muted() ? "Sound off" : "Sound on"}</button><button class="btn" type="button" data-gk-skip>Skip</button></div>
<div class="gk-bar"><p></p><div><button class="btn go" type="button" data-gk-keep>Put in the album</button>${kind === "free" ? "" : `<button class="btn" type="button" data-gk-again>Open another, ${cone(16)} ${pack.price}</button>`}</div></div>`;
  document.body.append(stage);
  const q = (s) => stage.querySelector(s);
  const S = C.stage = { stage, kind, pack, items, best, phase: "arrive", k: 0, hero: null, lock: false, fx: fxOf(stage), pkw: q(".gk-pkw"), pk: q(".gk-pack"), hint: q(".gk-hint"), rays: q(".gk-rays"), dim: q(".gk-dim"),
    flash: q(".gk-flash"), call: q(".gk-call"), bar: q(".gk-bar"), count: q(".gk-count"), tear: { t: 0, last: 0, dir: 1, down: null, done: false } };
  [...stage.querySelectorAll(".gk-sc")].forEach((el, i) => { items[i].el = el; });
  S.pk.style.setProperty("--glow", RCOL[best]);
  layout(S);
  S.onResize = () => { S.fx.size(); layout(S); if (S.phase === "done") fan(S, true); };
  S.onKey = (e) => {
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); if (S.phase === "done") keep(S); else skip(S); }
    if ((e.key === "Enter" || e.key === " ") && !e.target.closest("button")) { e.preventDefault(); e.stopPropagation(); tap(S); }
  };
  addEventListener("resize", S.onResize);
  addEventListener("keydown", S.onKey, true);
  stage.addEventListener("pointerup", (e) => { if (!e.target.closest("button,.gk-pkw")) tap(S); });
  stage.addEventListener("pointermove", (e) => hover(S, e));
  stage.addEventListener("click", (e) => {
    const t = e.target;
    if (t.closest("[data-gk-skip]")) skip(S);
    else if (t.closest("[data-gk-keep]")) keep(S);
    else if (t.closest("[data-gk-again]")) { closeStage(true); buy(kind, null); }
    else if (t.closest("[data-gk-mute]")) { store.set("gl-cards-mute", !muted()); t.closest("[data-gk-mute]").textContent = muted() ? "Sound off" : "Sound on"; }
  });
  items.forEach((it) => mv(it.el, { x: 0, y: innerHeight, s: 0.6, ms: 0 }));
  setTimeout(() => { if (C.stage === S) backstage(true); }, 320);
  if (calm) { S.pkw.remove(); stage.classList.add("on"); items.forEach((it) => it.el.classList.add("is-up")); fan(S, true); return; }
  const mid = q(".gk-mid").getBoundingClientRect();
  if (from) mv(S.pkw, { x: from.left + from.width / 2 - mid.left, y: from.top + from.height / 2 - mid.top, s: from.width / S.pw, r: -4, ms: 0 });
  else mv(S.pkw, { x: 0, y: innerHeight * 0.75, s: 0.7, r: 14, ms: 0 });
  await frame();
  stage.classList.add("on");
  play("whoosh", { gain: 0.8 });
  mv(S.pkw, { x: 0, y: 0, s: 1, r: 0, ms: 620, ez: "cubic-bezier(.2,1.25,.3,1)" });
  await wait(430);
  if (C.stage !== S || S.phase !== "arrive") return;
  play("thud", { gain: 0.9 });
  S.fx.burst(innerWidth / 2, innerHeight * 0.46 + S.pw * 0.74, 14, ["#c9d2ee", "#8f9bc4"], { arc: [Math.PI, Math.PI * 2], speed: 260, g: 500, size: 4, life: 0.7, spread: S.pw * 0.4 });
  S.pk.classList.add("is-idle");
  items.forEach((it, i) => mv(it.el, { x: 0, y: S.pw * 0.14, s: S.pw * 0.84 / S.cw, r: 0, ms: 0, z: 20 - i }));
  S.phase = "tear";
  S.hint.textContent = "Swipe across the top to tear it open";
  armTear(S);
}

function armTear(S) {
  const T = S.tear, el = S.pkw;
  const set = (v) => {
    T.t = Math.max(T.t, Math.min(1, v));
    S.pk.style.setProperty("--t", T.t.toFixed(3));
    S.pk.style.setProperty("--lift", (T.t > 0 ? 7 + T.t * 20 : 0).toFixed(1));
    if (T.t - T.last > 0.05) {
      T.last = T.t;
      play("tear", { at: T.t * 1.1, dur: 0.13, rate: rnd(0.9, 1.15), gain: 0.9 });
      const r = S.pk.getBoundingClientRect(), x = T.dir > 0 ? r.left + r.width * T.t : r.right - r.width * T.t;
      S.fx.burst(x, r.top + r.height * 0.12, 5, ["#fff", RCOL[S.best], "#dfe6ff"], { speed: 190, up: 120, size: 4, life: 0.7, long: true });
    }
    if (T.t >= 0.9 && !T.done) torn(S);
  };
  T.set = set;
  el.addEventListener("pointerdown", (e) => {
    if (T.done || S.phase !== "tear") return;
    T.down = { x: e.clientX, moved: false, base: T.t };
    try { el.setPointerCapture(e.pointerId); } catch (err) {}
    el.classList.add("is-held");
    S.pk.classList.remove("is-idle");
    mv(el, { s: 1.04, ms: 160 });
    play("crinkle", { gain: 0.8 });
  });
  el.addEventListener("pointermove", (e) => {
    const d = T.down;
    if (!d || T.done) return;
    const dx = e.clientX - d.x;
    if (!d.moved && Math.abs(dx) > 7) {
      d.moved = true;
      if (T.t === 0) { T.dir = dx > 0 ? 1 : -1; S.pk.classList.toggle("is-rev", T.dir < 0); }
      S.hint.style.opacity = 0;
    }
    if (d.moved) set(d.base + Math.max(0, dx * T.dir) / (S.pw * 0.92));
  });
  const up = () => {
    const d = T.down;
    T.down = null;
    el.classList.remove("is-held");
    if (!d || T.done) return;
    mv(el, { s: 1, ms: 200 });
    if (!d.moved) autoTear(S);
  };
  el.addEventListener("pointerup", up);
  el.addEventListener("pointercancel", up);
}

function autoTear(S) {
  const T = S.tear, from = T.t, t0 = performance.now();
  if (T.auto || T.done) return;
  T.auto = true;
  S.hint.style.opacity = 0;
  const step = (now) => {
    if (T.done || C.stage !== S) return;
    const f = Math.min(1, (now - t0) / 460);
    T.set(from + (1 - from) * f * f);
    if (f < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

async function torn(S) {
  const T = S.tear, tier = RANK[S.best];
  T.done = true;
  S.phase = "rise";
  S.hint.style.opacity = 0;
  S.pk.style.setProperty("--t", 1);
  play("rip");
  play("whoosh", { gain: 0.5, rate: 1.25, delay: 0.05 });
  const r = S.pk.getBoundingClientRect(), sd = S.pk.querySelector(".gk-pk-sd");
  S.pk.querySelector(".gk-pk-sa").style.display = "none";
  sd.animate([{ transform: "rotate(-27deg)", opacity: 1 }, { transform: "translate(55%,-420%) rotate(-150deg)", opacity: 0 }], { duration: 620, easing: "cubic-bezier(.2,.7,.4,1)", fill: "forwards" });
  S.fx.burst(r.left + r.width / 2, r.top + r.height * 0.12, 26, ["#fff", RCOL[S.best], "#dfe6ff"], { speed: 360, up: 160, size: 5, long: true, spread: r.width * 0.4 });
  S.pk.classList.add("is-open");
  S.stage.style.setProperty("--rc", RCOL[S.best]);
  if (tier > 0) S.rays.classList.add("on");
  mv(S.pkw, { s: 1.06, ms: 120 });
  const ps = S.pw * 0.84 / S.cw;
  await wait(150);
  mv(S.pkw, { s: 1, ms: 220 });
  S.items.forEach((it, i) => { mv(it.el, { x: 0, y: -S.pw * 0.62 - i * 5, s: ps, r: (i - 2) * 1.2, ms: 520 + i * 40, z: 20 - i }); });
  play("deal2", { gain: 0.8 });
  play("deal", { gain: 0.6, delay: 0.09, rate: 1.1 });
  await wait(620);
  if (C.stage !== S || S.phase !== "rise") return;
  S.pkw.classList.add("is-gone");
  mv(S.pkw, { y: innerHeight, r: 9, ms: 550, ez: "cubic-bezier(.5,0,.9,.4)" });
  pile(S, 520);
  await wait(520);
  if (C.stage !== S || S.phase !== "rise") return;
  S.rays.classList.remove("on");
  S.phase = "reveal";
  S.hint.textContent = "Tap to flip";
  S.hint.style.opacity = 1;
  counter(S);
}

function pile(S, ms) {
  const n = S.items.length;
  S.items.forEach((it, i) => { if (i >= S.k) mv(it.el, { x: (i - S.k) * 3, y: S.heroY - (i - S.k) * 4, s: 0.88, r: (i - S.k) * 1.5 * (i % 2 ? 1 : -1), ms, z: 20 + n - i }); });
}

const counter = (S) => { S.count.textContent = S.phase === "reveal" ? `${S.k} / ${S.items.length}` : ""; };

function toTray(S, it) {
  const i = S.items.indexOf(it), n = S.items.length, w = S.cw * S.trayS + 8;
  it.el.classList.remove("is-punch");
  untilt(it.el.querySelector(".gk"), it.el);
  mv(it.el, { x: (i - (n - 1) / 2) * w, y: S.trayY, s: S.trayS, r: 0, ms: 420, z: 5 + i });
  play("whoosh", { gain: 0.3, rate: 1.5 });
}

function shout(S, text, col) {
  S.stage.style.setProperty("--rc", col);
  S.call.textContent = text;
  S.call.classList.remove("on");
  void S.call.offsetWidth;
  S.call.classList.add("on");
}

function flash(S, peak, ms) {
  S.flash.animate([{ opacity: peak }, { opacity: 0 }], { duration: ms, easing: "ease-out" });
}

async function reveal(S) {
  if (S.lock || S.phase !== "reveal") return;
  S.lock = true;
  if (S.hero) {
    toTray(S, S.hero);
    S.hero = null;
    S.rays.classList.remove("on");
    S.dim.style.opacity = 0;
  }
  const it = S.items[S.k];
  if (!it) { S.lock = false; fan(S); return; }
  const el = it.el, r = it.card.rarity, tier = RANK[r], cx = innerWidth / 2, cy = innerHeight * 0.46 + S.heroY, col = RCOL[r];
  S.hint.style.opacity = 0;
  el.style.setProperty("--rc", col);
  mv(el, { x: 0, y: S.heroY, s: 1, r: 0, ms: 360, z: 60 });
  play("deal", { rate: 1 + tier * 0.05 });
  if (tier === 3) {
    S.dim.style.opacity = 0.6;
    el.classList.add("is-hot");
    play("charge");
    await wait(520);
    el.classList.add("is-hotter");
    S.fx.burst(cx, cy, 30, [col, "#fff"], { speed: 240, g: -120, size: 4, life: 0.9, plus: true, spread: S.cw * 0.5, spreadY: S.cw * 0.7 });
    await wait(650);
  } else if (tier) {
    el.classList.add("is-hot");
    await wait(tier === 2 ? 560 : 300);
  } else await wait(170);
  if (C.stage !== S) return;
  el.classList.remove("is-hot", "is-hotter");
  el.style.setProperty("--fms", tier === 3 ? ".8s" : tier === 2 ? ".56s" : ".42s");
  el.classList.add("is-up");
  el.querySelector(".gk").classList.add("is-live");
  play("flip", { rate: tier === 3 ? 0.82 : 1 });
  await wait(tier === 3 ? 360 : tier === 2 ? 250 : 190);
  if (C.stage !== S) return;
  el.classList.add("is-punch");
  if (tier === 0) S.fx.burst(cx, cy, 12, ["#fff", "#cfd8f5"], { speed: 300, size: 4, life: 0.7 });
  if (tier === 1) {
    S.fx.burst(cx, cy, 34, [col, "#fff", "#bfe2ff"], { speed: 460, size: 5, plus: true });
    play("rare", { gain: 0.9 });
    shout(S, "RARE", col);
    S.rays.classList.add("on");
    setTimeout(() => { if (S.hero === it) S.rays.classList.remove("on"); }, 1300);
  }
  if (tier === 2) {
    flash(S, 0.35, 260);
    S.fx.burst(cx, cy, 70, [col, "#fff", "#ff9be8", "#9be8ff"], { speed: 600, size: 6, plus: true, life: 1.3 });
    play("epic");
    shout(S, "EPIC", col);
    S.rays.classList.add("on");
  }
  if (tier === 3) {
    flash(S, 0.95, 520);
    S.stage.classList.remove("is-quake");
    void S.stage.offsetWidth;
    S.stage.classList.add("is-quake");
    S.dim.style.opacity = 0.25;
    S.fx.burst(cx, cy, 120, [col, "#fff", "#ffe58a", "#ff9a1f"], { speed: 760, size: 7, plus: true, life: 1.6 });
    setTimeout(() => S.fx.burst(cx, cy - S.cw * 0.3, 70, [col, "#fff3b8"], { speed: 420, up: 380, g: 900, size: 6, life: 1.8, long: true, spread: S.cw * 0.5 }), 220);
    play("legend");
    shout(S, "LEGENDARY", col);
    S.rays.classList.add("on");
  }
  if (it.fresh) setTimeout(() => { if (C.stage === S) { el.classList.add("is-new"); play("ding", { gain: 0.7 }); } }, tier === 3 ? 700 : 380);
  S.k++;
  S.hero = it;
  counter(S);
  await wait(tier === 3 ? 900 : tier === 2 ? 520 : 260);
  if (C.stage !== S || S.phase !== "reveal") return;
  S.hint.textContent = S.k === S.items.length ? "Tap to see them all" : "Tap for the next card";
  S.hint.style.opacity = 1;
  S.lock = false;
}

function fan(S, now) {
  S.phase = "done";
  S.hero = null;
  S.lock = false;
  S.hint.style.opacity = 0;
  S.rays.classList.remove("on");
  S.dim.style.opacity = 0;
  counter(S);
  S.items.forEach((it, i) => {
    const p = S.slots[i];
    it.el.classList.remove("is-punch", "is-hot", "is-hotter");
    if (it.fresh) it.el.classList.add("is-new");
    setTimeout(() => { if (C.stage === S) mv(it.el, { x: p.x, y: p.y, s: S.rowS, r: 0, ms: now ? 0 : 520, z: 10 + i }); }, now ? 0 : i * 70);
  });
  if (!now) play("shuffle", { gain: 0.8 });
  const fresh = S.items.filter((it) => it.fresh).length;
  S.bar.querySelector("p").textContent = fresh ? `${fresh} new ${fresh === 1 ? "card" : "cards"} for the album.` : "No new cards this time. Trade the extra copies in at the album.";
  const again = S.bar.querySelector("[data-gk-again]");
  if (again) again.disabled = !me() || me().szy < S.pack.price;
  S.bar.classList.add("on");
}

function skip(S) {
  if (S.phase === "done") return;
  S.pkw.classList.add("is-gone");
  S.items.forEach((it) => { if (!it.el.classList.contains("is-up")) { it.el.style.setProperty("--fms", ".3s"); it.el.classList.add("is-up"); } });
  S.k = S.items.length;
  fan(S);
}

function tap(S) {
  if (S.phase === "tear") autoTear(S);
  else if (S.phase === "reveal") reveal(S);
}

function hover(S, e) {
  const on = S.phase === "done" ? S.items.find((it) => it.el.contains(e.target)) : S.phase === "reveal" && !S.lock ? S.hero : null;
  if (S.over && S.over !== on) untilt(S.over.el.querySelector(".gk"), S.over.el);
  S.over = on || null;
  if (on && e.pointerType !== "touch") tilt(on.el.querySelector(".gk"), on.el, e, S.phase === "done" ? 12 : 9);
}

function closeStage(now) {
  const S = C.stage;
  if (!S) return;
  C.stage = null;
  backstage(false);
  removeEventListener("resize", S.onResize);
  removeEventListener("keydown", S.onKey, true);
  S.fx.stop();
  S.stage.classList.remove("on");
  if (now) S.stage.remove(); else setTimeout(() => S.stage.remove(), 280);
}

function keep(S) {
  const el = win(), to = el && !el.hidden ? el.getBoundingClientRect() : null, mid = S.stage.querySelector(".gk-mid").getBoundingClientRect();
  S.bar.classList.remove("on");
  S.items.forEach((it, i) => mv(it.el, { x: to ? to.left + to.width / 2 - mid.left : 0, y: to ? to.top + 40 - mid.top : innerHeight, s: 0.12, r: rnd(-20, 20), ms: 420 + i * 40, ez: "cubic-bezier(.5,0,.6,1)" }));
  play("shuffle", { gain: 0.6, rate: 1.2 });
  C.tab = "album";
  setTimeout(() => {
    closeStage();
    render();
    const f = win() && win().querySelector(".gk-cell.is-fresh");
    if (f) f.scrollIntoView({ block: "center", behavior: calm ? "auto" : "smooth" });
  }, calm ? 0 : 420);
}

document.addEventListener("click", (e) => {
  const t = e.target;
  if (t.closest("[data-cards]")) { e.preventDefault(); openKiosk(); return; }
  const tab = t.closest("[data-gk-tab]");
  if (tab) { C.tab = tab.dataset.gkTab; render(); return; }
  const peek = t.closest("[data-gk-peek]");
  if (peek) { peek.classList.remove("is-wig"); void peek.offsetWidth; peek.classList.add("is-wig"); loadSfx(); play("crinkle", { gain: 0.7, rate: rnd(0.9, 1.15) }); return; }
  const cell = t.closest("[data-gk-card]");
  if (cell) { loadSfx(); look(cell.dataset.gkCard); return; }
  const s = t.closest("[data-gk-sell]");
  if (s) { sell(s.dataset.gkSell || null); return; }
  const goal = t.closest("[data-gk-goal]");
  if (goal) { claim(goal); return; }
  const show = t.closest("[data-gk-show]");
  if (show) { loadSfx(); openKiosk("album"); load().then(() => { render(); look(show.dataset.gkShow); }).catch(() => {}); }
});
document.addEventListener("submit", (e) => {
  const f = e.target.closest("[data-gk-buy], [data-gk-free]");
  if (!f) return;
  e.preventDefault();
  buy(f.dataset.gkBuy || "free", f);
});

async function claim(btn) {
  const [set, pct] = btn.dataset.gkGoal.split(":");
  btn.disabled = true;
  try {
    const j = await api("/cards/claim", { set, pct: +pct });
    C.claims = new Set(j.claims);
    loadSfx();
    play("ding");
    const tray = document.querySelector(".tray-w"), r = btn.getBoundingClientRect();
    if (tray) { const t = tray.getBoundingClientRect(); flyCones({ x: r.left + r.width / 2, y: r.top }, { x: t.left + t.width / 2, y: t.top }, Math.min(12, 3 + Math.round(j.got / 15))); }
    toast(`+${j.got} for ${pct}% of the ${SETS.find((x) => x[0] === set)[1].replace(/^The /, "")} set.${+pct === 100 ? " A full set, it shows next to your name in the Top 25." : ""}`);
  } catch (e) { toast(e.message); }
  render();
}
addEventListener("gz:wallet", () => { if (!C.stage && !document.querySelector(".gk-look")) render(); });
addEventListener("gz:card", (e) => {
  const d = e.detail || {};
  if (!d.id || !RNAME[d.rarity]) return;
  C.fresh.add(d.id);
  toast(`Your drawing is now ${d.rarity === "epic" ? "an" : "a"} ${RNAME[d.rarity]} card.`, `<button class="btn" type="button" data-gk-show="${esc(d.id)}">See the card</button>`);
  load().then(render).catch(() => {});
});

export function createCards(world) {
  const spot = document.createElement("button");
  spot.type = "button";
  spot.className = "spot spot-kiosk";
  spot.dataset.place = "kiosk";
  spot.dataset.cards = "";
  spot.setAttribute("aria-label", "Card Kiosk, open a pack of Gzowo cards");
  spot.innerHTML = `<img class="spr" src="/assets/map/kiosk.webp" alt="" draggable="false"><span class="spot-l"><b>Cards</b><em>open a pack</em></span>`;
  world.querySelector(".spots").append(spot);
  if (location.hash === "#cards") setTimeout(openKiosk, 500);
  addEventListener("hashchange", () => { if (location.hash === "#cards") openKiosk(); });
  return { layout() {} };
}
