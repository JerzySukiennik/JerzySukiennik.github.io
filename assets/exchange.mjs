/* Gzowo Labs exchange: the Gzowo Street Exchange building with a live LED ticker on its facade, and the trading floor window where
   GZM and GZF are bought and sold for szyszki, with the price chart and the real things that moved the price. */

import { TICKER } from "/assets/map.mjs";
import { api, ensure, me, pulse, cone } from "/assets/bank.mjs";
import { esc } from "/assets/folks.mjs";

const COIN = {
  gzm: { name: "Gzowium", tag: "GZM", about: "The main coin of Gzowo. Its price follows the real Narew at Pułtusk, how busy the plot is and how much Jurek builds, plus everyone's trades." },
  gzf: { name: "Gzofajfus", tag: "GZF", about: "The rocket coin. It climbs with rocket launches on the plot and falls when the wind in Gzowo is too strong to fly. Wilder than GZM." },
};
const FONT = {
  "0": "111101101101111", "1": "010110010010111", "2": "111001111100111", "3": "111001111001111", "4": "101101111001001", "5": "111100111001111",
  "6": "111100111101111", "7": "111001010010010", "8": "111101111101111", "9": "111101111001111", ".": "000000000000010", "%": "101001010100101",
  "+": "000010111010000", "-": "000000111000000", " ": "000000000000000", "^": "010111000000000", "v": "000000000111010", ":": "000010000010000",
  A: "010101111101101", B: "110101110101110", C: "011100100100011", D: "110101101101110", E: "111100110100111", F: "111100110100100", G: "011100101101011",
  H: "101101111101101", I: "111010010010111", J: "001001001101010", K: "101101110101101", L: "100100100100111", M: "101111111101101", N: "110101101101101",
  O: "010101101101010", P: "110101110100100", Q: "010101101110011", R: "110101110101101", S: "011100010001110", T: "111010010010010", U: "101101101101111",
  V: "101101101101010", W: "101101111111101", X: "101101010101101", Y: "101101010010010", Z: "111001010100111",
};
const UP = "#52ff7a", DOWN = "#ffb21e", FLAT = "#f4f4f4";

let state = { coin: "gzm", range: "day", market: null, side: "buy" };
const fmt = (n) => Math.floor(n).toLocaleString("en-US");
const pct = (v) => `${v > 0 ? "+" : ""}${v.toFixed(2)}%`;

export function createExchange(world) {
  const spots = world.querySelector(".spots");
  const spot = document.createElement("button");
  spot.type = "button";
  spot.className = "spot spot-exchange";
  spot.dataset.place = "exchange";
  spot.dataset.exchange = "1";
  spot.setAttribute("aria-label", "Gzowo Street Exchange, trade GZM and GZF");
  const T = TICKER;
  spot.innerHTML = `<img class="spr" src="/assets/map/exchange.webp" alt="" draggable="false"><canvas class="spr ex-led" style="left:${T.x * 100}%;top:${T.y * 100}%;width:${T.w * 100}%;height:${T.h * 100}%"></canvas><span class="spot-l"><b>Exchange</b><em>GZM and GZF</em></span>`;
  spots.append(spot);
  const led = spot.querySelector(".ex-led"), lc = led.getContext("2d");
  let strip = null, off = 0, timer = 0, seen = false;

  function message(p) {
    const part = (tag, v, ch) => [[`${tag} ${v.toFixed(2)} `, FLAT], [`${ch >= 0 ? "^" : "v"}${Math.abs(ch).toFixed(1)}%   `, ch > 0 ? UP : ch < 0 ? DOWN : FLAT]];
    if (!p) return [["GZOWO STREET EXCHANGE   OPENING SOON   ", FLAT]];
    return [["GZOWO ST   ", "#ffd23f"], ...part("GZM", p.gzm, p.chg.gzm), ...part("GZF", p.gzf, p.chg.gzf)];
  }

  function build(p) {
    const parts = message(p);
    const cols = parts.reduce((n, [t]) => n + t.length * 4, 0);
    strip = document.createElement("canvas");
    strip.width = cols; strip.height = 5;
    const c = strip.getContext("2d");
    let x = 0;
    for (const [text, col] of parts) {
      c.fillStyle = col;
      for (const ch of text.toUpperCase()) {
        const f = FONT[ch] || FONT[" "];
        for (let i = 0; i < 15; i++) if (f[i] === "1") c.fillRect(x + (i % 3), (i / 3) | 0, 1, 1);
        x += 4;
      }
    }
  }

  function draw() {
    if (!strip) return;
    const W = led.width, H = led.height, cell = H / 7;
    lc.fillStyle = "#070707";
    lc.fillRect(0, 0, W, H);
    lc.fillStyle = "#1a1a1a";
    for (let y = 1; y < 6; y++) for (let x = 0; x < W / cell; x++) lc.fillRect(x * cell + cell * 0.2, y * cell + cell * 0.2, cell * 0.6, cell * 0.6);
    const n = Math.ceil(W / cell), src = strip.getContext("2d").getImageData(0, 0, strip.width, 5).data;
    for (let x = 0; x < n; x++) {
      const sx = (x + off) % strip.width;
      for (let y = 0; y < 5; y++) {
        const i = (y * strip.width + sx) * 4;
        if (!src[i + 3]) continue;
        lc.fillStyle = `rgb(${src[i]},${src[i + 1]},${src[i + 2]})`;
        lc.fillRect(x * cell + cell * 0.1, (y + 1) * cell + cell * 0.1, cell * 0.8, cell * 0.8);
      }
    }
  }

  function step() {
    timer = 0;
    if (!seen || document.hidden) return;
    off = (off + 1) % (strip ? strip.width : 1);
    draw();
    timer = setTimeout(step, 110);
  }

  const io = new IntersectionObserver((es) => {
    seen = es.some((e) => e.isIntersecting);
    if (seen && !timer) step();
  });
  io.observe(spot);
  document.addEventListener("visibilitychange", () => { if (!document.hidden && seen && !timer) step(); });

  addEventListener("gz:pulse", (e) => {
    build(e.detail);
    draw();
    const win = window.gzDesk && window.gzDesk.find("exchange");
    if (win && !win.hidden) refreshPrices(win);
  });
  build(pulse());

  return {
    layout(geo) {
      const b = geo.places.exchange, dpr = Math.min(2, window.devicePixelRatio || 1);
      led.width = Math.round(b.w * TICKER.w * dpr);
      led.height = Math.round(b.h * TICKER.h * dpr);
      draw();
    },
  };
}

function chart(cv, hist, coin) {
  const dpr = Math.min(2, window.devicePixelRatio || 1), W = cv.clientWidth || 360, H = cv.clientHeight || 150;
  cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  const c = cv.getContext("2d");
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.fillStyle = "#fff"; c.fillRect(0, 0, W, H);
  const i = coin === "gzm" ? 1 : 2, now = Date.now(), from = now - (state.range === "day" ? 86400000 : 7 * 86400000);
  const pts = hist.filter((r) => r[0] >= from).map((r) => [r[0], r[i]]);
  c.font = "11px " + getComputedStyle(document.body).fontFamily;
  if (pts.length < 2) { c.fillStyle = "#808080"; c.fillText("The chart fills in every 15 minutes.", 10, H / 2); return; }
  let lo = Math.min(...pts.map((p) => p[1])), hi = Math.max(...pts.map((p) => p[1]));
  const pad = (hi - lo) * 0.15 || hi * 0.05 || 1;
  lo -= pad; hi += pad;
  const L = 40, R = 6, T = 8, B = 18;
  const X = (t) => L + ((t - from) / (now - from)) * (W - L - R), Y = (v) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  c.strokeStyle = "#e4e4e4"; c.fillStyle = "#808080"; c.lineWidth = 1;
  for (let k = 0; k <= 3; k++) {
    const v = lo + ((hi - lo) * k) / 3, y = Math.round(Y(v)) + 0.5;
    c.beginPath(); c.moveTo(L, y); c.lineTo(W - R, y); c.stroke();
    c.fillText(v.toFixed(2), 2, y + 4);
  }
  const marks = state.range === "day" ? [0, 6, 12, 18, 24].map((h) => now - h * 3600000) : [0, 2, 4, 6].map((d) => now - d * 86400000);
  marks.forEach((t) => {
    const d = new Date(t), label = state.range === "day" ? `${String(d.getHours()).padStart(2, "0")}:00` : d.toLocaleDateString("en-GB", { weekday: "short" });
    c.fillText(t === now ? "now" : label, Math.min(W - 30, Math.max(L, X(t) - 12)), H - 4);
  });
  c.beginPath();
  pts.forEach((p, k) => (k ? c.lineTo(X(p[0]), Y(p[1])) : c.moveTo(X(p[0]), Y(p[1]))));
  c.lineTo(X(pts[pts.length - 1][0]), H - B); c.lineTo(X(pts[0][0]), H - B); c.closePath();
  c.fillStyle = "rgba(0,0,128,.08)"; c.fill();
  c.beginPath();
  pts.forEach((p, k) => (k ? c.lineTo(X(p[0]), Y(p[1])) : c.moveTo(X(p[0]), Y(p[1]))));
  c.strokeStyle = "#000080"; c.lineWidth = 2; c.stroke();
}

function body() {
  const m = state.market, coin = state.coin, C = COIN[coin], p = pulse(), w = me();
  const price = m ? m.now[coin] : p ? p[coin] : 0, ch = p ? p.chg[coin] : 0;
  const why = m && m.why ? m.why[coin] : [];
  const held = w ? w[coin] : 0;
  return `<div class="ex-top"><div class="bk-tabs" role="tablist">${Object.keys(COIN).map((k) => `<button type="button" role="tab" data-ex-coin="${k}" aria-selected="${k === coin}">${COIN[k].tag} ${COIN[k].name}</button>`).join("")}<button type="button" role="tab" data-top aria-selected="false">Top 25</button></div></div>
<div class="ex-body"><div class="ex-head"><div><span class="ex-tag">${C.tag}</span><b class="ex-price" data-ex-price>${price.toFixed(2)}</b><span>szyszki</span><span class="ex-ch ${ch > 0 ? "up" : ch < 0 ? "down" : ""}" data-ex-ch>${pct(ch)} 24 h</span></div><p>${esc(C.about)}</p></div>
<div class="ex-chart"><div class="ex-range"><button type="button" class="btn${state.range === "day" ? " on" : ""}" data-ex-range="day">24 h</button><button type="button" class="btn${state.range === "week" ? " on" : ""}" data-ex-range="week">7 days</button></div><canvas data-ex-chart></canvas></div>
<div class="ex-cols"><div class="ex-why"><p class="bk-sub">Why the price is where it is</p><table><tbody>${why.map((r) => `<tr><td>${esc(r.label)}</td><td>${esc(r.value)}</td><td class="${r.pct > 0 ? "up" : r.pct < 0 ? "down" : ""}">${pct(r.pct)}</td></tr>`).join("") || "<tr><td>Measuring the Narew...</td></tr>"}</tbody></table>
<p class="bk-note">${m && m.at ? `Real data checked ${new Date(m.at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}, every 15 minutes. ` : ""}${m ? `${m.volume.trades} trades in 24 h, ${m.holders[coin] || 0} holders.` : ""}</p></div>
<form class="ex-trade" data-ex-form><div class="bk-tabs" role="tablist"><button type="button" role="tab" data-ex-side="buy" aria-selected="${state.side === "buy"}">Buy</button><button type="button" role="tab" data-ex-side="sell" aria-selected="${state.side === "sell"}">Sell</button></div>
<p>${w ? `You have ${cone(16)} ${fmt(w.szy)} and ${(+held).toFixed(3)} ${C.tag}` : "Open a wallet to trade. You get 50 szyszki to start."}</p>
${state.side === "buy" ? `<label>Spend szyszki<input name="amount" type="number" min="2" step="1" inputmode="numeric" required></label><p class="bk-row ex-quick"><button class="btn" type="button" data-ex-q="10">10</button><button class="btn" type="button" data-ex-q="50">50</button><button class="btn" type="button" data-ex-q="all">All</button></p>`
    : `<label>Sell ${C.tag}<input name="amount" type="number" min="0" step="0.001" inputmode="decimal" required></label><p class="bk-row ex-quick"><button class="btn" type="button" data-ex-q="half">Half</button><button class="btn" type="button" data-ex-q="all">All</button></p>`}
<p class="ex-est" data-ex-est></p><p class="bk-row"><button class="btn go" type="submit">${state.side === "buy" ? "Buy" : "Sell"} ${C.tag}</button></p><p class="bk-note" data-note>1% fee. Big trades move the price for everyone.</p></form></div></div>`;
}

function refreshPrices(win) {
  const p = pulse(), out = win.querySelector("[data-ex-price]"), ch = win.querySelector("[data-ex-ch]");
  if (!p || !out) return;
  out.textContent = p[state.coin].toFixed(2);
  ch.textContent = pct(p.chg[state.coin]) + " 24 h";
  ch.className = "ex-ch " + (p.chg[state.coin] > 0 ? "up" : p.chg[state.coin] < 0 ? "down" : "");
}

function render(win) {
  win.querySelector(".wb").innerHTML = body();
  const cv = win.querySelector("[data-ex-chart]");
  if (state.market) requestAnimationFrame(() => chart(cv, state.market.hist, state.coin));
  const p = pulse();
  win.querySelector(".stb").innerHTML = p ? `<span>GZM ${p.gzm.toFixed(2)}</span><span>GZF ${p.gzf.toFixed(2)}</span>` : "<span>Gzowo Street Exchange</span>";
  estimate(win);
}

function estimate(win) {
  const f = win.querySelector("[data-ex-form]"), out = win.querySelector("[data-ex-est]");
  if (!f || !out) return;
  const a = +f.amount.value, price = (state.market ? state.market.now[state.coin] : pulse() ? pulse()[state.coin] : 0) || 1;
  if (!(a > 0)) { out.textContent = ""; return; }
  out.textContent = state.side === "buy" ? `About ${((a * 0.99) / price).toFixed(3)} ${COIN[state.coin].tag}` : `About ${fmt(a * price * 0.99)} szyszki`;
}

async function load(win) {
  try { state.market = await api("/market"); } catch (e) { state.market = null; }
  if (win.isConnected && !win.hidden) render(win);
}

export function openExchange(coin) {
  if (coin) state.coin = coin;
  const win = window.gzDesk.open({ id: "exchange", title: "Gzowo Street Exchange", icon: "bank", cls: "w-exchange", body: "", status: "<span></span>" });
  render(win);
  load(win);
}

document.addEventListener("click", (e) => {
  const t = e.target;
  if (t.closest("[data-exchange]")) { e.preventDefault(); openExchange(); return; }
  const win = t.closest('.win[data-win="exchange"]');
  if (!win) return;
  const c = t.closest("[data-ex-coin]");
  if (c) { state.coin = c.dataset.exCoin; render(win); return; }
  const r = t.closest("[data-ex-range]");
  if (r) { state.range = r.dataset.exRange; render(win); return; }
  const s = t.closest("[data-ex-side]");
  if (s) { state.side = s.dataset.exSide; render(win); return; }
  const q = t.closest("[data-ex-q]");
  if (q) {
    const f = win.querySelector("[data-ex-form]"), w = me(), v = q.dataset.exQ;
    if (!w) return;
    const have = state.side === "buy" ? w.szy : w[state.coin];
    f.amount.value = v === "all" ? (state.side === "buy" ? have : have.toFixed(6)) : v === "half" ? (have / 2).toFixed(3) : Math.min(+v, have);
    estimate(win);
  }
});

document.addEventListener("input", (e) => {
  const win = e.target.closest('.win[data-win="exchange"]');
  if (win) estimate(win);
});

document.addEventListener("submit", async (e) => {
  const f = e.target.closest("[data-ex-form]");
  if (!f) return;
  e.preventDefault();
  const win = f.closest(".win"), note = f.querySelector("[data-note]"), btn = f.querySelector("[type=submit]");
  btn.disabled = true;
  try {
    await ensure();
    const w = me(), all = state.side === "sell" && Math.abs(+f.amount.value - w[state.coin]) < 1e-6;
    const j = await api("/trade", { coin: state.coin, side: state.side, amount: all ? "all" : +f.amount.value });
    note.textContent = state.side === "buy" ? `Bought ${j.coins.toFixed(3)} ${COIN[state.coin].tag} at ${j.price.toFixed(2)}.` : `Sold for ${fmt(j.szy)} szyszki at ${j.price.toFixed(2)}.`;
    await load(win);
    win.querySelector("[data-note]").textContent = note.textContent;
  } catch (err) { note.textContent = err.message; }
  if (btn.isConnected) btn.disabled = false;
});

addEventListener("gz:wallet", () => {
  const win = window.gzDesk && window.gzDesk.find("exchange");
  if (win && !win.hidden && !win.contains(document.activeElement)) render(win);
});
addEventListener("resize", () => {
  const win = window.gzDesk && window.gzDesk.find("exchange");
  if (win && !win.hidden && state.market) chart(win.querySelector("[data-ex-chart]"), state.market.hist, state.coin);
});
