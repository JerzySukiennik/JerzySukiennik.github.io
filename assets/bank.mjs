/* Gzowo Labs bank: szyszki, the pine cone money of the plot. The tray wallet, daily quests and payouts, the Gzowo Store on Gzowo Street,
   the top 25 and Jurek's idea inbox, all backed by the gzowo-bank worker. Things done on the plot pay out through here. */

import { esc, store, ITEMS, itemOf, itemArt, addPrize } from "/assets/folks.mjs";
import { icon } from "/assets/views.mjs";

const LOCAL = ["localhost", "127.0.0.1", "0.0.0.0", "[::1]"];
export const BANK = LOCAL.includes(location.hostname) || location.protocol === "file:" ? "http://127.0.0.1:8787" : "https://gzowo-bank.kalakasanyt.workers.dev";

const LABEL = {
  plant: "Planted a flower", fish: "Caught a fish", fishrec: "Top 10 catch", folk: "Let a folk out", board: "Pinned a card", launch: "Launched a rocket",
  paint: "Sprayed the wall", claw: "Claw machine prize", hangar: "Opened the hangar", kayak: "Took a kayak out",
};
const SHOWS = {
  fireworks: "Fireworks over the plot. Everyone on the site sees them, with your name.",
  balloon: "A hot air balloon with your name floats over the plot for 10 minutes.",
  banner: "A little plane flies across the sky for everyone with your message on a banner.",
};

const S = { code: store.get("gl-wallet", ""), me: null, pulse: null, shop: null, making: null, tab: "wallet", storeTab: "shows", seen: new Set() };
const fire = (name, detail) => dispatchEvent(new CustomEvent(name, { detail }));
const fmt = (n) => Math.floor(n).toLocaleString("en-US");
const coins = (n) => (Math.round(n * 1000) / 1000).toLocaleString("en-US", { maximumFractionDigits: 3 });
export const cone = (size = 16) => icon("cone", size);
export const me = () => S.me;
export const code = () => S.code;
export const pulse = () => S.pulse;

export async function api(path, body, opts = {}) {
  const headers = { "content-type": "application/json" };
  const code = opts.code || S.code;
  if (code) headers.authorization = "Bearer " + code;
  if (path.startsWith("/admin") || path === "/nick") headers["x-admin"] = store.get("gl-admin", "");
  let r, j;
  try {
    r = await fetch(BANK + path, { method: body ? "POST" : "GET", headers, body: body ? JSON.stringify(body) : undefined });
    j = await r.json();
  } catch (e) { throw new Error("The bank is offline, try again in a minute."); }
  if (!r.ok || j.error) { const e = new Error(j.error || "The bank is offline, try again in a minute."); e.status = r.status; throw e; }
  if (j.me && !opts.code) setMe(j.me);
  return j;
}

function setMe(m) {
  const first = !S.me;
  S.me = m;
  m.items.forEach((id) => { if (itemOf(id)) addPrize(id); });
  tray();
  fire("gz:wallet", m);
  if (first && m.daily) daily();
  m.quests.forEach((q) => {
    const k = m.id + q.slot + q.kind;
    if (q.have >= q.need && !q.done && !S.seen.has(k)) { S.seen.add(k); toast(`Quest done: ${q.text}`, `<button class="btn" type="button" data-quest="${q.slot}">Collect ${q.reward}</button>`); }
  });
  refresh();
}

export function ensure() {
  if (S.me) return Promise.resolve(S.me);
  if (S.making) return S.making;
  S.making = (S.code ? api("/me") : api("/wallet", {}).then((j) => {
    S.code = j.code;
    store.set("gl-wallet", j.code);
    store.set("gl-wallet-saved", false);
    toast("You got a wallet with 50 szyszki to start. Open it to save your code.", `<button class="btn" type="button" data-wallet>Open wallet</button>`);
    return j;
  })).then(() => S.me).finally(() => { S.making = null; });
  return S.making;
}

async function earn(kind, extra = {}) {
  try {
    await ensure();
    const j = await api("/earn", { kind, ...extra });
    if (j.ok) toast(`+${j.got} ${LABEL[kind] || ""}${j.why && j.why.length ? " (" + j.why.join(", ") + ")" : ""}`);
  } catch (e) {}
}

async function daily() {
  try {
    const j = await api("/daily", {});
    if (j.ok) toast(`+${j.got} daily payout. Come back tomorrow for more.`);
  } catch (e) {}
}

export async function buy(item, text) {
  await ensure();
  return api("/buy", { item, text });
}

let toasts = null;
export function toast(text, actions = "") {
  if (!toasts) { toasts = document.createElement("div"); toasts.className = "bk-toasts"; document.body.append(toasts); }
  const t = document.createElement("div");
  t.className = "bk-toast";
  t.innerHTML = `<span class="bk-t-i">${cone(16)}</span><p>${esc(text)}</p>${actions ? `<span class="bk-t-a">${actions}</span>` : ""}`;
  toasts.append(t);
  while (toasts.children.length > 3) toasts.firstChild.remove();
  setTimeout(() => t.classList.add("out"), actions ? 9000 : 4200);
  setTimeout(() => t.remove(), actions ? 9600 : 4800);
  const w = document.querySelector(".tray-w");
  if (w) { w.classList.remove("is-bump"); void w.offsetWidth; w.classList.add("is-bump"); }
}

function tray() {
  const out = document.querySelector("[data-szy]");
  if (!out) return;
  out.textContent = S.me ? fmt(S.me.szy) : "Wallet";
  const b = out.closest(".tray-w");
  b.title = S.me ? `${fmt(S.me.szy)} szyszki, worth ${fmt(S.me.worth)} with coins` : "Open a wallet";
  b.classList.toggle("is-warn", !!S.me && !store.get("gl-wallet-saved", true));
}

const tabs = (list, on, attr) => `<div class="bk-tabs" role="tablist">${list.map(([k, label]) => `<button type="button" role="tab" ${attr}="${k}" aria-selected="${k === on}">${label}</button>`).join("")}</div>`;

function noWallet() {
  return `<div class="bk-pad"><p class="bk-big">${cone(32)} Szyszki</p>
<p>Szyszki are the pine cone money of Gzowo. You earn them on the plot: plant flowers, fish, launch rockets, pin cards, spray the wall, win at the claw machine, and every day you get a free payout and three quests.</p>
<p>Spend them on Gzowo Street: trade the GZM and GZF coins at the exchange, buy fireworks and outfits at the store, ride the coaster, or buy paintings in the museum.</p>
<p class="bk-row"><button class="btn go" type="button" data-bk="open">Open a wallet</button><button class="btn" type="button" data-bk="restore">I have a code</button></p>
<p class="bk-note">No sign up. You get a 12 word code that is the key to your wallet.</p><div data-bk-restore></div></div>`;
}

function restoreForm() {
  return `<form class="bk-form" data-bk-form="restore"><label>Your 12 words<textarea name="code" rows="3" required spellcheck="false" autocapitalize="off" autocomplete="off"></textarea></label><p class="bk-row"><button class="btn" type="submit">Open this wallet</button></p><p class="bk-note" data-note></p></form>`;
}

function walletTab(m) {
  const p = m.price;
  const items = m.items.filter((id) => itemOf(id));
  return `<div class="bk-pad"><div class="bk-bal">${cone(32)}<b>${fmt(m.szy)}</b><span>szyszki</span></div>
<table class="bk-hold"><tbody>
<tr><td><b>GZM</b> Gzowium</td><td>${coins(m.gzm)}</td><td>${fmt(m.gzm * p.gzm)} szyszki</td></tr>
<tr><td><b>GZF</b> Gzofajfus</td><td>${coins(m.gzf)}</td><td>${fmt(m.gzf * p.gzf)} szyszki</td></tr>
<tr><td>Worth in total</td><td></td><td><b>${fmt(m.worth)}</b></td></tr></tbody></table>
<form class="bk-form bk-nick" data-bk-form="nick"><label>Your name on Gzowo Street<input name="nick" maxlength="16" value="${esc(m.nick || "")}" placeholder="anon ${esc(m.id.slice(0, 4))}" autocomplete="nickname"></label><button class="btn" type="submit">Save</button><p class="bk-note" data-note></p></form>
<p class="bk-row"><button class="btn" type="button" data-exchange>${icon("bank")} Exchange</button><button class="btn" type="button" data-store>${icon("store")} Store</button><button class="btn" type="button" data-top>Top 25</button></p>
${items.length ? `<p class="bk-sub">Wardrobe</p><div class="bk-items">${items.map((id) => `<span title="${esc(itemOf(id)[1])}"><canvas data-item-art="${id}"></canvas></span>`).join("")}</div>` : ""}</div>`;
}

function todayTab(m) {
  const caps = Object.entries(m.caps).filter(([k]) => LABEL[k]);
  return `<div class="bk-pad"><p class="bk-sub">Daily payout</p><p>${m.daily ? `<button class="btn go" type="button" data-bk="daily">Collect 20 szyszki</button>` : "Collected today. The next one is tomorrow."}</p>
<p class="bk-sub">Quests for today</p><ul class="bk-quests">${m.quests.map((q) => `<li><span>${esc(q.text)}</span><span class="bk-bar"><i style="width:${(100 * q.have) / q.need}%"></i></span><span>${q.have}/${q.need}</span>${q.done ? "<em>done</em>" : q.have >= q.need ? `<button class="btn go" type="button" data-quest="${q.slot}">+${q.reward}</button>` : `<em>+${q.reward}</em>`}</li>`).join("")}</ul>
<p class="bk-sub">Ways to earn today</p><table class="bk-caps"><tbody>${caps.map(([k, [n, cap]]) => `<tr><td>${esc(LABEL[k])}</td><td>${n}/${cap}</td></tr>`).join("")}
<tr><td>Painting hung in the museum</td><td>20 each, three a day</td></tr>
<tr><td>Drawing sold to Haiku from the wall</td><td>up to 100, five a day</td></tr></tbody></table></div>`;
}

async function historyTab(el) {
  const box = el.querySelector("[data-bk-hist]");
  try {
    const { rows } = await api("/history");
    box.innerHTML = rows.length ? `<table class="bk-hist"><tbody>${rows.map((r) => `<tr><td>${new Date(r.t).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</td><td>${esc((r.note || r.kind).replace(/^./, (c) => c.toUpperCase()))}</td><td class="${r.szy >= 0 ? "up" : ""}">${r.szy > 0 ? "+" : ""}${r.szy}</td></tr>`).join("")}</tbody></table>` : "<p>Nothing yet.</p>";
  } catch (e) { box.textContent = e.message; }
}

function codeTab() {
  const words = S.code.split(" ");
  return `<div class="bk-pad"><p>These 12 words are your wallet. Write them down: with them you can open the same wallet on another phone or computer. Anyone who has them can spend your szyszki, so keep them to yourself.</p>
<ol class="bk-words" data-words hidden>${words.map((w) => `<li>${esc(w)}</li>`).join("")}</ol>
<p class="bk-row"><button class="btn" type="button" data-bk="show">Show the words</button><button class="btn" type="button" data-bk="copy">Copy</button><button class="btn" type="button" data-bk="saved">I wrote them down</button></p>
<p class="bk-note" data-note></p><p class="bk-sub">Another wallet</p><p class="bk-row"><button class="btn" type="button" data-bk="restore">Open a different wallet</button><button class="btn" type="button" data-bk="forget">Forget it on this device</button></p><div data-bk-restore></div></div>`;
}

function renderWallet(el) {
  const m = S.me, body = el.querySelector(".wb");
  if (!m) { body.innerHTML = noWallet(); el.querySelector(".stb").innerHTML = "<span>No wallet yet</span>"; return; }
  const list = [["wallet", "Wallet"], ["today", "Today"], ["history", "History"], ["code", "Code"]];
  body.innerHTML = tabs(list, S.tab, "data-bk-tab") + (S.tab === "wallet" ? walletTab(m) : S.tab === "today" ? todayTab(m) : S.tab === "history" ? `<div class="bk-pad" data-bk-hist>Loading...</div>` : codeTab());
  body.querySelectorAll("[data-item-art]").forEach((c) => itemArt(c, c.dataset.itemArt, 2));
  if (S.tab === "history") historyTab(el);
  const open = m.quests.filter((q) => !q.done).length;
  el.querySelector(".stb").innerHTML = `<span>${fmt(m.szy)} szyszki</span><span>${open ? `${open} quest${open > 1 ? "s" : ""} left today` : "All quests done"}</span>`;
}

export function openWallet(tab) {
  if (tab) S.tab = tab;
  const el = window.gzDesk.open({ id: "wallet", title: "Wallet", icon: "cone", cls: "w-wallet", body: "", status: "<span></span>" });
  renderWallet(el);
  if (S.code && !S.me) ensure().catch(() => {});
}

function storeShows() {
  const sh = S.shop ? S.shop.shop : [];
  const one = (id) => sh.find((x) => x.id === id) || { price: "?" };
  return `<div class="bk-pad bk-cards">${["fireworks", "balloon", "banner"].map((id) => `<form class="bk-card" data-bk-form="buy" data-item="${id}"><canvas class="bk-prev" data-prev="${id}" width="48" height="32"></canvas><div><b>${esc(one(id).name || id)}</b><p>${esc(SHOWS[id])}</p>
${id === "banner" ? `<input name="text" maxlength="40" required placeholder="Your message, 40 letters">` : ""}<p class="bk-row"><button class="btn" type="submit">${cone(16)} ${one(id).price}</button></p><p class="bk-note" data-note></p></div></form>`).join("")}</div>`;
}

function storePasses() {
  const sh = S.shop ? S.shop.shop : [];
  const one = (id) => sh.find((x) => x.id === id) || { price: "?" };
  const extra = S.me ? S.me.clawExtra : 0;
  return `<div class="bk-pad bk-cards"><form class="bk-card" data-bk-form="buy" data-item="claw">${icon("claw", 32)}<div><b>Claw machine try</b><p>One more go at the claw machine today, on top of the three free ones. Up to 10 a day (${extra}/10 bought today).</p><p class="bk-row"><button class="btn" type="submit">${cone(16)} ${one("claw").price}</button></p><p class="bk-note" data-note></p></div></form>
<form class="bk-card" data-bk-form="buy" data-item="ride">${icon("coaster", 32)}<div><b>Coaster ticket</b><p>A ride on the Gzowo Coaster in the clouds over Gzowo Street, seen from the front car: the lift hill, the drop and the loop.</p><p class="bk-row"><button class="btn" type="submit">${cone(16)} ${one("ride").price}</button></p><p class="bk-note" data-note></p></div></form></div>`;
}

function storeWardrobe() {
  const owned = new Set(S.me ? S.me.items : []);
  const price = new Map((S.shop ? S.shop.items : []).map((i) => [i.id, i]));
  return `<div class="bk-pad"><p>Outfits for your folks. Put them on in the Folk Maker with Dress up. The last six are only sold here.</p><div class="bk-ward">${ITEMS.map(([id, name]) => {
    const p = price.get(id);
    return `<form class="bk-wi${p && p.exclusive ? " ex" : ""}" data-bk-form="buy" data-item="${id}"><canvas data-item-art="${id}"></canvas><b>${esc(name)}</b>${owned.has(id) ? "<em>yours</em>" : `<button class="btn" type="submit">${cone(16)} ${p ? p.price : "?"}</button>`}<span class="bk-note" data-note></span></form>`;
  }).join("")}</div></div>`;
}

function storeIdeas() {
  return `<div class="bk-pad"><form class="bk-form" data-bk-form="buy" data-item="feedback"><p>Have an idea for Gzowo Labs? A game, a building for the plot, something to fix? Send it straight to Jurek. He reads every one and ticks it off when it's done.</p>
<label>Your idea<textarea name="text" rows="5" maxlength="500" minlength="5" required></textarea></label><p class="bk-row"><button class="btn go" type="submit">Send for ${cone(16)} 30</button></p><p class="bk-note" data-note></p></form></div>`;
}

function renderStore(el) {
  const list = [["shows", "Sky shows"], ["passes", "Passes"], ["wardrobe", "Wardrobe"], ["ideas", "Ideas for Jurek"]];
  const t = S.storeTab;
  el.querySelector(".wb").innerHTML = tabs(list, t, "data-store-tab") + (t === "shows" ? storeShows() : t === "passes" ? storePasses() : t === "wardrobe" ? storeWardrobe() : storeIdeas());
  el.querySelectorAll("[data-item-art]").forEach((c) => itemArt(c, c.dataset.itemArt, 3));
  el.querySelectorAll("[data-prev]").forEach((c) => fire("gz:preview", { canvas: c, kind: c.dataset.prev }));
  el.querySelector(".stb").innerHTML = `<span>${S.me ? fmt(S.me.szy) + " szyszki" : "No wallet yet"}</span><span>Gzowo Store, Gzowo Street</span>`;
}

export async function openStore(tab) {
  if (tab) S.storeTab = tab;
  const el = window.gzDesk.open({ id: "store", title: "Gzowo Store", icon: "store", cls: "w-store", body: "", status: "<span></span>" });
  renderStore(el);
  if (!S.shop) { try { S.shop = await api("/shop"); renderStore(el); } catch (e) {} }
}

export async function openTop() {
  const el = window.gzDesk.open({ id: "top", title: "Gzowo Street Top 25", icon: "bank", cls: "w-top", body: "<p class=\"bk-pad\">Loading...</p>", status: "<span>Richest wallets on the plot</span>" });
  try {
    const { rows, mine } = await api("/top");
    el.querySelector(".wb").innerHTML = `<table class="bk-top"><thead><tr><th>#</th><th>Name</th><th>Worth</th><th>GZM</th><th>GZF</th></tr></thead><tbody>${rows.map((r) => `<tr class="${r.me ? "me" : ""}"><td>${r.rank}</td><td>${esc(r.name)}</td><td>${fmt(r.worth)}</td><td>${coins(r.gzm)}</td><td>${coins(r.gzf)}</td></tr>`).join("") || "<tr><td colspan=5>Nobody yet.</td></tr>"}</tbody></table>`;
    el.querySelector(".stb").innerHTML = mine ? `<span>You are number ${mine.rank}</span><span>Worth ${fmt(mine.worth)} szyszki</span>` : "<span>Open a wallet to join</span>";
  } catch (e) { el.querySelector(".wb").innerHTML = `<p class="bk-pad">${esc(e.message)}</p>`; }
}

async function openInbox() {
  const el = window.gzDesk.open({ id: "inbox", title: "Idea inbox", icon: "mail", cls: "w-inbox", body: "", status: "<span>Only for Jurek</span>" });
  const body = el.querySelector(".wb");
  if (!store.get("gl-admin", "")) {
    body.innerHTML = `<form class="bk-form bk-pad" data-bk-form="admin"><label>Jurek's key<input name="key" type="password" required autocomplete="off"></label><button class="btn" type="submit">Open</button><p class="bk-note" data-note></p></form>`;
    return;
  }
  try {
    const { rows } = await api("/admin/feedback");
    const open = rows.filter((r) => !r.done).length;
    body.innerHTML = `<ul class="bk-inbox">${rows.map((r) => `<li class="${r.done ? "done" : ""}"><label><input type="checkbox" data-done="${r.id}"${r.done ? " checked" : ""}><span><b>${esc(r.nick || "anon")}</b> <em>${new Date(r.t).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</em><br>${esc(r.text)}</span></label></li>`).join("") || "<li>No ideas yet.</li>"}</ul>`;
    el.querySelector(".stb").innerHTML = `<span>${open} to do</span><span>${rows.length - open} done</span>`;
  } catch (e) {
    if (e.status === 403) store.set("gl-admin", "");
    body.innerHTML = `<p class="bk-pad">${esc(e.message)}</p>`;
  }
}

const typing = (el) => { const a = document.activeElement; return !!a && el.contains(a) && /^(INPUT|TEXTAREA)$/.test(a.tagName); };

function refresh() {
  const w = window.gzDesk && window.gzDesk.find("wallet");
  if (w && !w.hidden && !typing(w)) renderWallet(w);
  const s = window.gzDesk && window.gzDesk.find("store");
  if (s && !s.hidden && !s.contains(document.activeElement)) renderStore(s);
}

async function submit(form) {
  const note = form.querySelector("[data-note]"), kind = form.dataset.bkForm, btn = form.querySelector("[type=submit]");
  const say = (t) => { if (note) note.textContent = t; };
  const data = Object.fromEntries(new FormData(form));
  if (btn) btn.disabled = true;
  try {
    if (kind === "restore") {
      const code = String(data.code || "").toLowerCase().split(/[^a-z]+/).filter(Boolean).join(" ");
      const j = await api("/me", null, { code });
      S.code = code; store.set("gl-wallet", code); store.set("gl-wallet-saved", true);
      S.me = null; S.tab = "wallet";
      setMe(j.me);
      toast("Wallet opened on this device.");
    } else if (kind === "nick") {
      await ensure();
      const j = await api("/nick", { nick: data.nick });
      const n = document.querySelector('[data-bk-form="nick"] [data-note]');
      if (n) n.textContent = j.me && j.me.nick ? `Saved. You are ${j.me.nick} now.` : "Saved. Your name is cleared.";
    } else if (kind === "admin") {
      store.set("gl-admin", String(data.key || ""));
      openInbox();
    } else if (kind === "buy") {
      const item = form.dataset.item;
      const j = await buy(item, data.text);
      if (item === "ride") { fire("gz:ride", {}); window.gzDesk.close("store"); }
      else if (item === "claw") { toast("One more claw try for today."); fire("gz:claw-extra", {}); }
      else if (item === "feedback") { form.reset(); say("Sent to Jurek. Thank you!"); }
      else if (SHOWS[item]) { const wait = Math.round((j.start - Date.now()) / 1000); say(wait > 3 ? `Booked, it starts in ${wait} s.` : "Look up!"); poll(); }
      else { toast(`${itemOf(item)[1]} is yours. Put it on in the Folk Maker.`); refresh(); }
    }
  } catch (e) { say(e.message); }
  if (btn && btn.isConnected) btn.disabled = false;
}

document.addEventListener("submit", (e) => {
  const f = e.target.closest("[data-bk-form]");
  if (!f) return;
  e.preventDefault();
  submit(f);
});

document.addEventListener("change", async (e) => {
  const c = e.target.closest("[data-done]");
  if (!c) return;
  try { await api("/admin/feedback", { id: +c.dataset.done, done: c.checked }); c.closest("li").classList.toggle("done", c.checked); } catch (err) { c.checked = !c.checked; }
});

document.addEventListener("click", async (e) => {
  const t = e.target;
  if (t.closest("[data-wallet]")) { e.preventDefault(); openWallet(); return; }
  if (t.closest("[data-store]")) { e.preventDefault(); openStore(); return; }
  if (t.closest("[data-top]")) { e.preventDefault(); openTop(); return; }
  const tab = t.closest("[data-bk-tab]");
  if (tab) { S.tab = tab.dataset.bkTab; renderWallet(tab.closest(".win")); return; }
  const st = t.closest("[data-store-tab]");
  if (st) { S.storeTab = st.dataset.storeTab; renderStore(st.closest(".win")); return; }
  const q = t.closest("[data-quest]");
  if (q) {
    q.disabled = true;
    try { const j = await api("/quest", { slot: +q.dataset.quest }); toast(`+${j.got} for a finished quest.`); q.closest(".bk-toast") && q.closest(".bk-toast").remove(); } catch (err) { toast(err.message); }
    return;
  }
  const b = t.closest("[data-bk]");
  if (!b) return;
  const el = b.closest(".win"), act = b.dataset.bk, note = el && el.querySelector("[data-note]");
  if (act === "open") { b.disabled = true; try { await ensure(); S.tab = "code"; renderWallet(el); } catch (err) { b.disabled = false; toast(err.message); } }
  if (act === "restore") { el.querySelector("[data-bk-restore]").innerHTML = restoreForm(); el.querySelector("[data-bk-restore] textarea").focus(); }
  if (act === "daily") daily();
  if (act === "show") { const w = el.querySelector("[data-words]"); w.hidden = !w.hidden; b.textContent = w.hidden ? "Show the words" : "Hide the words"; }
  if (act === "copy") { try { await navigator.clipboard.writeText(S.code); note.textContent = "Copied. Paste it somewhere safe."; } catch (err) { note.textContent = "Couldn't copy, show the words and write them down."; } }
  if (act === "saved") { store.set("gl-wallet-saved", true); tray(); note.textContent = "Great. Keep them safe."; }
  if (act === "forget") {
    if (!store.get("gl-wallet-saved", true)) { note.textContent = "Write the words down first, or this wallet is gone for good."; store.set("gl-wallet-saved", true); return; }
    S.code = ""; S.me = null; store.set("gl-wallet", ""); tray(); renderWallet(el); fire("gz:wallet", null);
  }
});

let pollT = 0;
export async function poll() {
  clearTimeout(pollT);
  pollT = setTimeout(poll, 60000);
  if (document.hidden) return;
  try {
    S.pulse = await api("/pulse");
    fire("gz:pulse", S.pulse);
  } catch (e) {}
}
document.addEventListener("visibilitychange", () => { if (!document.hidden && (!S.pulse || Date.now() - S.pulse.t > 50000)) poll(); });

addEventListener("gz:planted", (e) => earn("plant", { proof: e.detail.id }));
addEventListener("gz:fish-done", (e) => { const d = e.detail || {}; if (!d.miss && d.key !== "boot") earn("fish", { cm: d.cm }); });
addEventListener("gz:fish-saved", (e) => earn("fishrec", { proof: e.detail.id }));
addEventListener("gz:folk-made", (e) => earn("folk", { proof: e.detail.id }));
addEventListener("gz:pinned", (e) => { if (e.detail && e.detail.id) earn("board", { proof: e.detail.id }); });
addEventListener("gz:launch", () => earn("launch"));
addEventListener("gz:painted", () => earn("paint"));
addEventListener("gz:claw-win", (e) => earn("claw", { item: e.detail }));
addEventListener("gz:hangar", () => earn("hangar"));
addEventListener("gz:kayak", () => earn("kayak"));

export function createBank(world) {
  const spots = world.querySelector(".spots");
  const spot = document.createElement("button");
  spot.type = "button";
  spot.className = "spot spot-store";
  spot.dataset.place = "store";
  spot.dataset.store = "1";
  spot.setAttribute("aria-label", "Gzowo Store, spend your szyszki");
  spot.innerHTML = `<img class="spr" src="/assets/map/store.webp" alt="" draggable="false"><span class="spot-l"><b>Store</b><em>spend szyszki</em></span>`;
  spots.append(spot);
  tray();
  if (S.code) ensure().catch(() => {});
  poll();
  if (location.hash === "#inbox") setTimeout(openInbox, 400);
  addEventListener("hashchange", () => { if (location.hash === "#inbox") openInbox(); });
  window.gzBank = { me: () => S.me, buy, ensure, toast, openWallet, openStore };
  return { layout() {} };
}
