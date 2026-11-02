/* Gzowo Bank: szyszki wallets, the GZM and GZF coins priced from real data (Narew at Pułtusk, plot activity, Jurek's GitHub pushes,
   Gzowo wind, rocket launches) and player trades, plus the shop, daily quests, the museum art market and Jurek's feedback inbox. */

const RTDB = "https://raft-e8d47-default-rtdb.firebaseio.com";
const MODEL = "claude-haiku-5-5";
const START = 50, DAILY = 20, FEE = 0.01, DAY = 86400000;
const COINS = { gzm: { base: 10, liq: 3000 }, gzf: { base: 3, liq: 1000 } };

const WORDS = ("acorn amber anchor apple arrow aspen badge baker banjo barn basil beach beacon bean beaver berry birch biscuit "
  + "bison blanket bloom boat bolt boot bottle branch bread breeze brick bridge brook broom bubble bucket bunny butter button "
  + "cabin cable cactus camel camp candle candy canoe canyon carrot castle cedar chalk cherry chess chimney cider clay cliff clock "
  + "cloud clover coast cocoa comet compass cookie copper coral corn cotton crane crayon cricket crown crystal cupcake daisy dawn "
  + "desk dock dolphin donut dragon drum dune eagle easel echo eel ember engine falcon feather fern ferry field finch flame "
  + "flask flute fog forest fossil fox frost garden garlic gecko ginger glacier globe goose grape gravel guitar hammer harbor hare "
  + "harp hawk hazel heron hill honey horizon island ivy jacket jelly jungle kayak kettle kite kiwi ladder lagoon lake "
  + "lantern laser lava leaf lemon lily lizard lotus magnet mango maple marble meadow melon meteor mint moose moss mountain "
  + "muffin nebula nest oak ocean olive onion orbit orchid otter owl paddle panda paper parrot pasta peach peanut pear pebble "
  + "pencil pepper piano pillow pine pixel pizza planet plum pocket pond popcorn poppy potato pumpkin puzzle quartz "
  + "rabbit radar radio rain raven reef ribbon river robin rocket rose sail salmon sand saturn scarf seal seed shell shovel signal "
  + "silver sky snail snow sparrow spider spoon spruce star stone stork storm sugar summit sun swan teapot tent "
  + "thunder tiger timber toast tomato torch tower trail tulip tunnel turtle valley velvet violin volcano waffle walnut wave whale "
  + "wheat willow window wizard wolf yogurt zebra").split(" ");

const EARN = {
  plant: { r: 3, cap: 5, proof: "garden", n: "planted in the garden" },
  fish: { r: 2, cap: 8, n: "caught a fish" },
  fishrec: { r: 10, cap: 3, proof: "fish", n: "fishing record" },
  folk: { r: 6, cap: 2, proof: "folks", n: "let out a new folk" },
  board: { r: 4, cap: 3, proof: "board", n: "pinned a card" },
  launch: { r: 3, cap: 4, n: "launched a rocket" },
  paint: { r: 2, cap: 5, n: "sprayed the wall" },
  claw: { r: 4, cap: 13, n: "claw machine prize" },
  hangar: { r: 1, cap: 2, n: "visited the hangar" },
  kayak: { r: 1, cap: 3, n: "kayak trip" },
};
const COUNT_ONLY = { trade: 300, ride: 50, art: 6, clawbuy: 10 };

const QUESTS = [
  ["plant", 2, 15, "Plant 2 flowers in the garden"],
  ["fish", 3, 20, "Catch 3 fish in the Narew"],
  ["launch", 1, 10, "Launch a rocket"],
  ["board", 1, 15, "Pin a card on the cork board"],
  ["paint", 2, 15, "Spray paint the wall twice"],
  ["claw", 1, 20, "Win a prize from the claw machine"],
  ["folk", 1, 25, "Let a new folk out on the plot"],
  ["hangar", 1, 10, "Open the GSP hangar"],
  ["trade", 2, 15, "Make 2 trades on Gzowo Street"],
  ["ride", 1, 20, "Ride the Gzowo Coaster"],
  ["art", 1, 25, "Hang a painting in the museum"],
  ["kayak", 1, 10, "Take a kayak out on the Narew"],
];

const ITEMS = {
  crown: 3, tophat: 8, helmet: 4, propeller: 10, party: 12, headphones: 10, shades: 12, monocle: 6, mustache: 10, bowtie: 12,
  medal: 6, scarf: 10, cape: 8, jetpack: 6, wings: 5,
};
const EXCLUSIVE = { cone: 150, halo: 220, pirate: 180, antenna: 160, parrot: 260, chain: 300 };
const itemPrice = (id) => EXCLUSIVE[id] || Math.round(360 / ITEMS[id] / 5) * 5;

const SHOP = {
  claw: { price: 15, name: "Claw machine try" },
  ride: { price: 12, name: "Coaster ticket" },
  fireworks: { price: 40, name: "Fireworks for everyone", live: 25000, max: 2 },
  balloon: { price: 30, name: "Your name on a balloon", live: 600000, max: 3 },
  banner: { price: 60, name: "Plane banner", live: 45000, max: 1, text: 40 },
  feedback: { price: 30, name: "Idea for Jurek", text: 500 },
};

const BAD = /(kurw|chuj|huj|pierdol|spierdal|wypierd|zajeb|jebac|jebi|jeban|jebn|pizd|fuck|shit|bitch|nigg|fagg|cunt|porn|hitler|nazi|cwel|kutas|szmat|dziwk)/;
const LEET = { 0: "o", 1: "i", 3: "e", 4: "a", 5: "s", 7: "t", 8: "b", "@": "a", $: "s", "!": "i" };
const bad = (s) => BAD.test(String(s).toLowerCase().replace(/ł/g, "l").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[0134578@$!]/g, (c) => LEET[c]).replace(/[^a-z]/g, ""));
const NAME_OK = /^[\p{L}\p{N} ._'-]+$/u;
const TEXT_OK = /^[\p{L}\p{N}\s.,!?'"():;+=&%#*/-]*$/u;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const r2 = (v) => Math.round(v * 100) / 100;
const r6 = (v) => Math.round(v * 1e6) / 1e6;
const today = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Warsaw" });

class Fail extends Error {
  constructor(msg, status = 400) { super(msg); this.status = status; }
}

function allowedOrigin(origin) {
  if (!origin) return null;
  try {
    const u = new URL(origin);
    if (u.hostname === "gzowo.fun" || u.hostname === "www.gzowo.fun") return origin;
    if (u.hostname === "localhost" || u.hostname === "127.0.0.1") return origin;
  } catch (e) {}
  return null;
}

async function sha(s) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

const words = (s) => String(s || "").toLowerCase().split(/[^a-z]+/).filter(Boolean);
async function walletId(code) {
  const w = words(code);
  if (w.length !== 12 || w.some((x) => !WORDS.includes(x))) return null;
  return (await sha("gzowo-bank:" + w.join(" "))).slice(0, 24);
}

function hash32(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

function questsFor(id, day) {
  let seed = hash32(id + day);
  const rnd = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const idx = QUESTS.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  return idx.slice(0, 3);
}

async function kvGet(env, keys) {
  const rows = (await env.DB.prepare(`SELECT k, v FROM kv WHERE k IN (${keys.map(() => "?").join(",")})`).bind(...keys).all()).results;
  const o = {};
  for (const r of rows) o[r.k] = r.v;
  return o;
}
const kvSet = (env, k, v) => env.DB.prepare("INSERT INTO kv (k, v) VALUES (?1, ?2) ON CONFLICT(k) DO UPDATE SET v = ?2").bind(k, v);

async function prices(env) {
  const kv = await kvGet(env, ["f_gzm", "f_gzf", "p_gzm", "p_gzf"]);
  const f = { gzm: kv.f_gzm || COINS.gzm.base, gzf: kv.f_gzf || COINS.gzf.base };
  const p = { gzm: kv.p_gzm || 1, gzf: kv.p_gzf || 1 };
  return { f, p, gzm: r2(f.gzm * p.gzm), gzf: r2(f.gzf * p.gzf) };
}

const ledger = (env, w, kind, szy, gzm, gzf, note) =>
  env.DB.prepare("INSERT INTO ledger (w, t, kind, szy, gzm, gzf, note) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(w, Date.now(), kind, szy, gzm, gzf, note || null);

async function credit(env, w, szy, kind, note) {
  await env.DB.batch([env.DB.prepare("UPDATE wallets SET szy = szy + ?1, seen = ?2 WHERE id = ?3").bind(szy, Date.now(), w), ledger(env, w, kind, szy, 0, 0, note)]);
}

async function debit(env, w, szy, kind, note) {
  const res = await env.DB.prepare("UPDATE wallets SET szy = szy - ?1, seen = ?2 WHERE id = ?3 AND szy >= ?1").bind(szy, Date.now(), w).run();
  if (!res.meta.changes) throw new Fail("Not enough szyszki", 402);
  await ledger(env, w, kind, -szy, 0, 0, note).run();
}

async function bump(env, w, kind, cap) {
  const res = await env.DB.prepare("INSERT INTO earns (w, day, kind, n) VALUES (?1, ?2, ?3, 1) ON CONFLICT(w, day, kind) DO UPDATE SET n = n + 1 WHERE n < ?4")
    .bind(w, today(), kind, cap).run();
  return res.meta.changes > 0;
}

async function ipLimit(env, req, kind, max) {
  const ip = req.headers.get("cf-connecting-ip") || "local";
  const key = (await sha(kind + ":" + ip)).slice(0, 20);
  const res = await env.DB.prepare("INSERT INTO ipday (ip, day, n) VALUES (?1, ?2, 1) ON CONFLICT(ip, day) DO UPDATE SET n = n + 1 WHERE n < ?3")
    .bind(key, today(), max).run();
  if (!res.meta.changes) throw new Fail("Too many from this network today, try tomorrow", 429);
}

const plotOf = (req) => {
  const o = req.headers.get("origin") || "";
  return /\/\/(localhost|127\.0\.0\.1)(:|$)/.test(o) ? "plotDev" : "plot";
};

const rtdb = (path) => fetch(`${RTDB}/${path}`, { cf: { cacheTtl: 0 } }).then((r) => (r.ok ? r.json() : null)).catch(() => null);

function cleanNick(s) {
  const n = String(s || "").trim().replace(/\s+/g, " ");
  if (!n) return null;
  if (n.length > 16 || !NAME_OK.test(n) || bad(n)) throw new Fail("That name won't work, try another");
  return n;
}

function cleanText(s, max, min = 1) {
  const t = String(s || "").trim().replace(/\s+/g, " ");
  if (t.length < min) throw new Fail("Write a bit more");
  if (t.length > max) throw new Fail(`Keep it under ${max} characters`);
  if (!TEXT_OK.test(t)) throw new Fail("Letters, numbers and simple punctuation only");
  if (bad(t)) throw new Fail("Let's keep it friendly");
  return t;
}

async function me(env, id) {
  const w = await env.DB.prepare("SELECT * FROM wallets WHERE id = ?").bind(id).first();
  if (!w) throw new Fail("Wallet not found", 404);
  return w;
}

async function view(env, w) {
  const day = today();
  const rows = (await env.DB.prepare("SELECT kind, n FROM earns WHERE w = ? AND day = ?").bind(w.id, day).all()).results;
  const n = {};
  for (const r of rows) n[r.kind] = r.n;
  const quests = questsFor(w.id, day).map((i, slot) => {
    const [kind, need, reward, text] = QUESTS[i];
    return { slot, kind, need, reward, text, have: Math.min(need, n[kind] || 0), done: !!n["q" + slot] };
  });
  const p = await prices(env);
  return {
    id: w.id.slice(0, 6), nick: w.nick, szy: w.szy, gzm: r6(w.gzm), gzf: r6(w.gzf), items: w.items ? w.items.split(",") : [],
    worth: Math.floor(w.szy + w.gzm * p.gzm + w.gzf * p.gzf), daily: !n.daily, clawExtra: n.clawbuy || 0,
    caps: Object.fromEntries(Object.entries(EARN).map(([k, e]) => [k, [n[k] || 0, e.cap]])), quests, price: { gzm: p.gzm, gzf: p.gzf },
  };
}

async function proofOk(env, req, w, kind, key) {
  const path = EARN[kind].proof;
  if (!path) return null;
  if (typeof key !== "string" || !/^[-_A-Za-z0-9]{8,32}$/.test(key)) throw new Fail("Missing proof");
  const plot = plotOf(req);
  const rec = await rtdb(`${plot}/${path}/${key}.json`);
  if (!rec || typeof rec.t !== "number" || Date.now() - rec.t > 15 * 60000) throw new Fail("Couldn't find that on the plot");
  const claim = await env.DB.prepare("INSERT OR IGNORE INTO proofs (k, w, t) VALUES (?, ?, ?)").bind(`${plot}:${path}:${key}`, w.id, Date.now()).run();
  if (!claim.meta.changes) throw new Fail("Already paid for that one");
  return rec;
}

async function earn(env, req, w, body) {
  const kind = String(body.kind || "");
  const cfg = EARN[kind];
  if (!cfg) throw new Fail("Unknown activity");
  let rec = null;
  if (cfg.proof) {
    const used = await env.DB.prepare("SELECT n FROM earns WHERE w = ? AND day = ? AND kind = ?").bind(w.id, today(), kind).first();
    if (used && used.n >= cfg.cap) return { ok: false, capped: true };
    rec = await proofOk(env, req, w, kind, body.proof);
  }
  if (!(await bump(env, w.id, kind, cfg.cap))) return { ok: false, capped: true };
  let got = cfg.r;
  const why = [];
  if (kind === "fish") got += Math.floor(clamp(+body.cm || 0, 0, 150) / 25);
  if (kind === "fishrec" && rec) {
    const cm = clamp(+rec.c || 0, 0, 250);
    why.push("top 10 catch");
    if (rec.s === "golden") { got += 25; why.push("golden fish"); }
    const kv = await kvGet(env, ["fish_rec"]);
    if (kv.fish_rec !== undefined && cm > kv.fish_rec) { got += 20; why.push("new plot record"); }
    if (kv.fish_rec === undefined || cm > kv.fish_rec) await kvSet(env, "fish_rec", Math.max(cm, kv.fish_rec || 0)).run();
  }
  if (kind === "claw") {
    const item = String(body.item || "");
    if (!ITEMS[item]) throw new Fail("Unknown prize");
    if (ITEMS[item] <= 5) { got += 12; why.push("rare prize"); }
    const items = new Set(w.items ? w.items.split(",") : []);
    items.add(item);
    await env.DB.prepare("UPDATE wallets SET items = ? WHERE id = ?").bind([...items].join(","), w.id).run();
  }
  await credit(env, w.id, got, "earn", cfg.n + (why.length ? ": " + why.join(", ") : ""));
  return { ok: true, got, why, me: await view(env, await me(env, w.id)) };
}

async function quest(env, w, body) {
  const slot = +body.slot;
  if (![0, 1, 2].includes(slot)) throw new Fail("Unknown quest");
  const v = await view(env, w);
  const q = v.quests[slot];
  if (q.done) throw new Fail("Already collected");
  if (q.have < q.need) throw new Fail("Not done yet");
  if (!(await bump(env, w.id, "q" + slot, 1))) throw new Fail("Already collected");
  await credit(env, w.id, q.reward, "quest", q.text);
  return { ok: true, got: q.reward, me: await view(env, await me(env, w.id)) };
}

async function daily(env, w) {
  if (!(await bump(env, w.id, "daily", 1))) return { ok: false, me: await view(env, w) };
  await credit(env, w.id, DAILY, "daily", "daily payout");
  return { ok: true, got: DAILY, me: await view(env, await me(env, w.id)) };
}

async function trade(env, w, body) {
  const coin = body.coin === "gzf" ? "gzf" : body.coin === "gzm" ? "gzm" : null;
  if (!coin) throw new Fail("Unknown coin");
  const { liq } = COINS[coin];
  const p = await prices(env);
  const f = p.f[coin], pr = p.p[coin];
  let res, szy, coins, newP;
  if (body.side === "buy") {
    szy = Math.floor(+body.amount);
    if (!(szy >= 2 && szy <= 1000000)) throw new Fail("Spend at least 2 szyszki");
    const fee = Math.max(1, Math.ceil(szy * FEE));
    newP = clamp(pr * Math.exp((szy - fee) / liq), 0.2, 5);
    coins = r6((szy - fee) / (f * newP));
    res = await env.DB.prepare(`UPDATE wallets SET szy = szy - ?1, ${coin} = ${coin} + ?2, seen = ?3 WHERE id = ?4 AND szy >= ?1`).bind(szy, coins, Date.now(), w.id).run();
    if (!res.meta.changes) throw new Fail("Not enough szyszki", 402);
    szy = -szy;
  } else if (body.side === "sell") {
    coins = body.amount === "all" ? w[coin] : r6(+body.amount);
    if (!(coins > 0) || coins > w[coin] + 1e-9) throw new Fail("You don't have that much");
    const value = coins * f * pr;
    newP = clamp(pr * Math.exp(-value / liq), 0.2, 5);
    szy = Math.floor(coins * f * newP * (1 - FEE));
    if (szy < 1) throw new Fail("Too small to sell");
    res = await env.DB.prepare(`UPDATE wallets SET ${coin} = MAX(0, ${coin} - ?1), szy = szy + ?2, seen = ?3 WHERE id = ?4 AND ${coin} >= ?1 - 0.000001`).bind(coins, szy, Date.now(), w.id).run();
    if (!res.meta.changes) throw new Fail("You don't have that much");
    coins = -coins;
  } else throw new Fail("Buy or sell?");
  await env.DB.batch([
    kvSet(env, "p_" + coin, newP),
    ledger(env, w.id, "trade", szy, coin === "gzm" ? coins : 0, coin === "gzf" ? coins : 0, `${body.side} ${coin.toUpperCase()} @ ${r2(f * newP)}`),
  ]);
  await bump(env, w.id, "trade", COUNT_ONLY.trade);
  return { ok: true, price: r2(f * newP), coins: Math.abs(coins), szy: Math.abs(szy), me: await view(env, await me(env, w.id)) };
}

async function buy(env, w, body) {
  const id = String(body.item || "");
  if (ITEMS[id] || EXCLUSIVE[id]) {
    const items = new Set(w.items ? w.items.split(",") : []);
    if (items.has(id)) throw new Fail("You already have it");
    const price = itemPrice(id);
    await debit(env, w.id, price, "shop", "outfit: " + id);
    items.add(id);
    await env.DB.prepare("UPDATE wallets SET items = ? WHERE id = ?").bind([...items].join(","), w.id).run();
    return { ok: true, me: await view(env, await me(env, w.id)) };
  }
  const s = SHOP[id];
  if (!s) throw new Fail("Not in the shop");
  let text = null;
  if (s.text) text = cleanText(body.text, s.text, id === "feedback" ? 5 : 1);
  if (id === "claw" && !(await bump(env, w.id, "clawbuy", COUNT_ONLY.clawbuy))) throw new Fail("That's all the extra tries for today");
  let start = Date.now();
  if (s.live) {
    const now = Date.now();
    const busy = (await env.DB.prepare("SELECT t, until FROM live WHERE kind = ? AND until > ? ORDER BY until DESC").bind(id, now).all()).results;
    if (busy.length >= s.max) start = Math.max(now, busy[0].until);
    if (start - now > 10 * 60000) throw new Fail("The sky is booked, try in a few minutes");
  }
  await debit(env, w.id, s.price, "shop", s.name);
  if (id === "ride") await bump(env, w.id, "ride", COUNT_ONLY.ride);
  if (id === "feedback") await env.DB.prepare("INSERT INTO feedback (w, nick, t, text) VALUES (?, ?, ?, ?)").bind(w.id, w.nick, Date.now(), text).run();
  if (s.live) {
    await env.DB.prepare("INSERT INTO live (kind, w, nick, data, t, until) VALUES (?, ?, ?, ?, ?, ?)")
      .bind(id, w.id, w.nick || "someone", text, start, start + s.live).run();
  }
  return { ok: true, start, me: await view(env, await me(env, w.id)) };
}

async function pulse(env) {
  const now = Date.now();
  const p = await prices(env);
  const old = await env.DB.prepare("SELECT gzm, gzf FROM prices WHERE t <= ? ORDER BY t DESC LIMIT 1").bind(now - DAY).first()
    || await env.DB.prepare("SELECT gzm, gzf FROM prices ORDER BY t ASC LIMIT 1").first();
  const live = (await env.DB.prepare("SELECT id, kind, nick, data, t, until FROM live WHERE until > ? AND t < ? ORDER BY t").bind(now, now + 120000).all()).results;
  return {
    t: now, gzm: p.gzm, gzf: p.gzf,
    chg: { gzm: old ? r2((p.gzm / old.gzm - 1) * 100) : 0, gzf: old ? r2((p.gzf / old.gzf - 1) * 100) : 0 },
    live: live.map((l) => ({ id: l.id, kind: l.kind, nick: l.nick, text: l.data, t: l.t, until: l.until })),
  };
}

async function market(env) {
  const now = Date.now();
  const rows = (await env.DB.prepare("SELECT t, gzm, gzf FROM prices WHERE t > ? ORDER BY t").bind(now - 7 * DAY).all()).results;
  const last = await env.DB.prepare("SELECT t, why FROM prices ORDER BY t DESC LIMIT 1").first();
  const p = await prices(env);
  const vol = await env.DB.prepare("SELECT COUNT(*) n, COALESCE(SUM(ABS(szy)), 0) v FROM ledger WHERE kind = 'trade' AND t > ?").bind(now - DAY).first();
  const holders = await env.DB.prepare("SELECT SUM(gzm > 0) gzm, SUM(gzf > 0) gzf, COUNT(*) wallets FROM wallets").first();
  return {
    now: { gzm: p.gzm, gzf: p.gzf, pressure: { gzm: r2(p.p.gzm), gzf: r2(p.p.gzf) } },
    hist: rows.map((r) => [r.t, r.gzm, r.gzf]),
    why: last ? JSON.parse(last.why) : null, at: last ? JSON.parse(last.why).at || last.t : null,
    volume: { trades: vol.n, szy: vol.v }, holders,
  };
}

async function top(env, id) {
  const p = await prices(env);
  const rows = (await env.DB.prepare("SELECT id, nick, szy, gzm, gzf, szy + gzm * ?1 + gzf * ?2 AS worth FROM wallets ORDER BY worth DESC LIMIT 25").bind(p.gzm, p.gzf).all()).results;
  const out = { rows: rows.map((r, i) => ({ rank: i + 1, me: r.id === id, name: r.nick || "anon " + r.id.slice(0, 4), worth: Math.floor(r.worth), gzm: r2(r.gzm), gzf: r2(r.gzf) })) };
  if (id) {
    const w = await env.DB.prepare("SELECT szy + gzm * ?1 + gzf * ?2 AS worth FROM wallets WHERE id = ?3").bind(p.gzm, p.gzf, id).first();
    if (w) out.mine = { worth: Math.floor(w.worth), rank: (await env.DB.prepare("SELECT COUNT(*) + 1 n FROM wallets WHERE szy + gzm * ?1 + gzf * ?2 > ?3").bind(p.gzm, p.gzf, w.worth).first()).n };
  }
  return out;
}

function pngSize(b64) {
  const bin = atob(b64.slice(0, 64));
  if (bin.slice(1, 4) !== "PNG") return null;
  const n = (o) => ((bin.charCodeAt(o) << 24) | (bin.charCodeAt(o + 1) << 16) | (bin.charCodeAt(o + 2) << 8) | bin.charCodeAt(o + 3)) >>> 0;
  return { w: n(16), h: n(20) };
}

function tidy(t, max) {
  t = t.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max), end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
  return end > max / 3 ? cut.slice(0, end + 1) : cut.slice(0, cut.lastIndexOf(" ")).replace(/[,;:]$/, "") + "...";
}

async function critic(env, b64, title, about) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: MODEL, max_tokens: 400, thinking: { type: "disabled" },
      system: "You are Haiku, the friendly art critic of the Gzowo Museum on gzowo.fun, a pixel-art website about a plot of land in Gzowo, Poland, by a 14-year-old maker. Visitors paint in a small MS Paint style editor. Judge effort, creativity, composition and colour on a 1 to 10 scale: 1-2 an accidental scribble or empty canvas, 3-4 a quick doodle, 5-6 a clear picture with some care, 7-8 a detailed and thoughtful picture, 9-10 genuinely impressive. Be honest but warm. Mark it unsafe if the picture, title or description shows sexual content, nudity, gore, hate symbols, slurs, bullying of a real person, or personal data like phone numbers or addresses.",
      tools: [{
        name: "review", description: "Record the review of the painting.",
        input_schema: {
          type: "object", additionalProperties: false, required: ["score", "safe", "comment"],
          properties: {
            score: { type: "integer", minimum: 1, maximum: 10 },
            safe: { type: "boolean" },
            comment: { type: "string", description: "One or two short playful sentences in English about this painting, at most 200 characters." },
          },
        },
      }],
      tool_choice: { type: "tool", name: "review" },
      messages: [{ role: "user", content: [
        { type: "image", source: { type: "base64", media_type: "image/png", data: b64 } },
        { type: "text", text: `Title: ${title}\nDescription: ${about || "(none)"}` },
      ] }],
    }),
  });
  if (!res.ok) throw new Fail("The critic is out for lunch, try again in a minute", 503);
  const data = await res.json();
  const use = (data.content || []).find((c) => c.type === "tool_use");
  if (!use) throw new Fail("The critic is out for lunch, try again in a minute", 503);
  return { score: clamp(Math.round(+use.input.score || 1), 1, 10), safe: use.input.safe !== false, comment: tidy(String(use.input.comment || ""), 240) };
}

async function hang(env, req, w, body) {
  const title = cleanText(body.title, 40);
  const about = body.about ? cleanText(body.about, 200, 0) : "";
  const price = Math.floor(+body.price);
  if (!(price >= 1 && price <= 1000000)) throw new Fail("Set a price between 1 and 1 000 000");
  const m = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(String(body.img || ""));
  if (!m) throw new Fail("The painting didn't arrive");
  const b64 = m[1];
  if (b64.length > 420000) throw new Fail("The painting is too big");
  const size = pngSize(b64);
  if (!size || size.w < 16 || size.h < 16 || size.w > 640 || size.h > 480) throw new Fail("The painting didn't arrive");
  await ipLimit(env, req, "art", 20);
  const used = await env.DB.prepare("SELECT n FROM earns WHERE w = ? AND day = ? AND kind = 'art'").bind(w.id, today()).first();
  const n = used ? used.n : 0;
  if (n >= COUNT_ONLY.art) throw new Fail("That's six paintings today, the museum walls need a rest");
  const review = await critic(env, b64, title, about);
  if (!review.safe) throw new Fail("The museum can't hang this one");
  await bump(env, w.id, "art", COUNT_ONLY.art);
  const id = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  const paid = n < 3 && review.score >= 3 ? review.score * 5 : 0;
  await env.DB.prepare("INSERT INTO art (id, author, owner, title, about, price, forsale, score, comment, t, img, w, h, sales) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)")
    .bind(id, w.id, w.id, title, about, price, body.forsale === false ? 0 : 1, review.score, review.comment, Date.now(), b64, size.w, size.h).run();
  await env.DB.prepare("INSERT INTO art_hist (art, t, seller, buyer, price) VALUES (?, ?, NULL, ?, 0)").bind(id, Date.now(), w.id).run();
  if (paid) await credit(env, w.id, paid, "art", `critic gave ${review.score}/10`);
  return { ok: true, id, score: review.score, comment: review.comment, paid, me: await view(env, await me(env, w.id)) };
}

const ART_COLS = "a.id, a.author, a.owner, a.title, a.about, a.price, a.forsale, a.score, a.comment, a.t, a.w, a.h, a.sales, au.nick an, ow.nick onick";
const artOut = (a, id) => ({
  id: a.id, title: a.title, about: a.about, price: a.price, forsale: !!a.forsale, score: a.score, comment: a.comment, t: a.t, w: a.w, h: a.h, sales: a.sales,
  author: a.an || "anon " + a.author.slice(0, 4), owner: a.onick || "anon " + a.owner.slice(0, 4), mine: a.owner === id, made: a.author === id,
});

async function gallery(env, id) {
  const rows = (await env.DB.prepare(`SELECT ${ART_COLS} FROM art a LEFT JOIN wallets au ON au.id = a.author LEFT JOIN wallets ow ON ow.id = a.owner ORDER BY a.t DESC LIMIT 300`).all()).results;
  return { art: rows.map((a) => artOut(a, id)) };
}

async function piece(env, artId, id) {
  const a = await env.DB.prepare(`SELECT ${ART_COLS} FROM art a LEFT JOIN wallets au ON au.id = a.author LEFT JOIN wallets ow ON ow.id = a.owner WHERE a.id = ?`).bind(artId).first();
  if (!a) throw new Fail("No such painting", 404);
  const hist = (await env.DB.prepare("SELECT h.t, h.price, h.seller, h.buyer, b.nick bn, s.nick sn FROM art_hist h LEFT JOIN wallets b ON b.id = h.buyer LEFT JOIN wallets s ON s.id = h.seller WHERE h.art = ? ORDER BY h.t")
    .bind(artId).all()).results;
  return {
    ...artOut(a, id),
    hist: hist.map((h) => ({ t: h.t, price: h.price, from: h.seller ? h.sn || "anon " + h.seller.slice(0, 4) : null, to: h.bn || "anon " + h.buyer.slice(0, 4) })),
  };
}

async function reprice(env, w, artId, body) {
  const price = Math.floor(+body.price);
  if (!(price >= 1 && price <= 1000000)) throw new Fail("Set a price between 1 and 1 000 000");
  const res = await env.DB.prepare("UPDATE art SET price = ?, forsale = ? WHERE id = ? AND owner = ?").bind(price, body.forsale ? 1 : 0, artId, w.id).run();
  if (!res.meta.changes) throw new Fail("That's not yours", 403);
  return { ok: true, art: await piece(env, artId, w.id) };
}

async function purchase(env, w, artId, body) {
  const a = await env.DB.prepare("SELECT id, author, owner, price, forsale, title FROM art WHERE id = ?").bind(artId).first();
  if (!a) throw new Fail("No such painting", 404);
  if (a.owner === w.id) throw new Fail("It's already yours");
  if (!a.forsale) throw new Fail("Not for sale");
  if (+body.price !== a.price) throw new Fail("The price just changed, have another look", 409);
  await debit(env, w.id, a.price, "art", `bought "${a.title}"`);
  const claim = await env.DB.prepare("UPDATE art SET owner = ?1, forsale = 0, sales = sales + 1 WHERE id = ?2 AND owner = ?3 AND forsale = 1 AND price = ?4")
    .bind(w.id, artId, a.owner, a.price).run();
  if (!claim.meta.changes) {
    await credit(env, w.id, a.price, "art", "refund");
    throw new Fail("Someone was faster", 409);
  }
  const royalty = a.owner === a.author ? 0 : Math.floor(a.price * 0.1);
  const ops = [
    env.DB.prepare("INSERT INTO art_hist (art, t, seller, buyer, price) VALUES (?, ?, ?, ?, ?)").bind(artId, Date.now(), a.owner, w.id, a.price),
    env.DB.prepare("UPDATE wallets SET szy = szy + ? WHERE id = ?").bind(a.price - royalty, a.owner),
    ledger(env, a.owner, "art", a.price - royalty, 0, 0, `sold "${a.title}"`),
  ];
  if (royalty) ops.push(env.DB.prepare("UPDATE wallets SET szy = szy + ? WHERE id = ?").bind(royalty, a.author), ledger(env, a.author, "art", royalty, 0, 0, `10% from resale of "${a.title}"`));
  await env.DB.batch(ops);
  return { ok: true, art: await piece(env, artId, w.id), me: await view(env, await me(env, w.id)) };
}

async function history(env, w) {
  const rows = (await env.DB.prepare("SELECT t, kind, szy, gzm, gzf, note FROM ledger WHERE w = ? ORDER BY id DESC LIMIT 40").bind(w.id).all()).results;
  return { rows };
}

async function count(path) {
  const v = await rtdb(path);
  if (typeof v === "number") return v;
  return v && typeof v === "object" ? Object.keys(v).length : null;
}

async function tick(env) {
  const now = Date.now(), slot = Math.floor(now / 900000) * 900000;
  const lock = await env.DB.prepare("INSERT INTO kv (k, v) VALUES ('tick', ?1) ON CONFLICT(k) DO UPDATE SET v = ?1 WHERE v < ?2").bind(now, slot).run();
  if (!lock.meta.changes) return;
  const kv = await kvGet(env, ["f_gzm", "f_gzf", "p_gzm", "p_gzf", "narew", "push7", "repos30", "wind", "rain"]);

  const [hydro, events, wx, ...tot] = await Promise.all([
    fetch("https://danepubliczne.imgw.pl/api/data/hydro/id/152210180").then((r) => r.json()).catch(() => null),
    fetch("https://api.github.com/users/JerzySukiennik/events/public?per_page=100", { headers: { "user-agent": "gzowo-bank", accept: "application/vnd.github+json" } })
      .then((r) => (r.ok ? r.json() : null)).catch(() => null),
    fetch("https://api.open-meteo.com/v1/forecast?latitude=52.67&longitude=21.12&current=wind_speed_10m,precipitation").then((r) => r.json()).catch(() => null),
    count("hits.json"), count("plot/launches.json"), count("plot/garden.json?shallow=true"), count("plot/fish.json?shallow=true"),
    count("plot/folks.json?shallow=true"), count("plot/board.json?shallow=true"), count("guestbook.json?shallow=true"), count("reviews.json?shallow=true"),
  ]);

  const st = Array.isArray(hydro) ? hydro[0] : hydro;
  const narew = st && +st.stan_wody > 0 ? +st.stan_wody : kv.narew || 200;
  let push7 = kv.push7 ?? 20, repos30 = kv.repos30 ?? 0;
  if (Array.isArray(events)) {
    const age = (e) => now - Date.parse(e.created_at);
    push7 = events.filter((e) => e.type === "PushEvent" && age(e) < 7 * DAY).length;
    repos30 = events.filter((e) => e.type === "CreateEvent" && e.payload && e.payload.ref_type === "repository" && age(e) < 30 * DAY).length;
  }
  const wind = wx && wx.current && typeof wx.current.wind_speed_10m === "number" ? wx.current.wind_speed_10m : kv.wind ?? 8;
  const rain = wx && wx.current && typeof wx.current.precipitation === "number" ? wx.current.precipitation : kv.rain ?? 0;

  const names = ["hits", "launches", "garden", "fish", "folks", "board", "guestbook", "reviews"];
  const totals = {};
  names.forEach((n, i) => { totals[n] = tot[i]; });
  const back = await env.DB.prepare("SELECT t, why FROM prices WHERE t <= ? ORDER BY t DESC LIMIT 1").bind(now - DAY).first()
    || await env.DB.prepare("SELECT t, why FROM prices ORDER BY t ASC LIMIT 1").first();
  const before = back ? JSON.parse(back.why).tot || {} : {};
  const span = back ? DAY / Math.max(3 * 3600000, now - back.t) : 0;
  const d = {};
  for (const n of names) {
    if (totals[n] === null) totals[n] = before[n] ?? 0;
    d[n] = Math.max(0, totals[n] - (before[n] ?? totals[n]));
  }
  const raw = d.hits + 2 * d.launches + 3 * d.garden + 3 * d.fish + 5 * d.folks + 5 * d.board + 4 * d.guestbook + 4 * d.reviews;
  const act = back ? Math.round(raw * Math.max(1, span)) : 40;
  const launches = back ? Math.round(d.launches * Math.max(1, span)) : 1;

  const fN = clamp(Math.pow(narew / 200, 0.6), 0.6, 1.6);
  const fA = clamp(Math.pow((act + 20) / 60, 0.3), 0.6, 1.8);
  const fW = clamp(Math.pow((push7 + 5 * repos30 + 10) / 35, 0.35), 0.6, 1.6);
  const fL = clamp(Math.pow((launches + 2) / 3, 0.5), 0.4, 2.5);
  const fWind = clamp(1.2 - wind / 50, 0.5, 1.25);
  const fRain = rain > 0.2 ? 0.9 : 1;

  const target = { gzm: COINS.gzm.base * fN * fA * fW, gzf: COINS.gzf.base * fL * fWind * fRain };
  const f = { gzm: kv.f_gzm ? kv.f_gzm * 0.5 + target.gzm * 0.5 : target.gzm, gzf: kv.f_gzf ? kv.f_gzf * 0.5 + target.gzf * 0.5 : target.gzf };
  const p = { gzm: Math.pow(kv.p_gzm || 1, 0.985), gzf: Math.pow(kv.p_gzf || 1, 0.985) };
  const pct = (x) => r2((x - 1) * 100);
  const why = {
    gzm: [
      { k: "narew", label: "Narew at Pułtusk", value: narew + " cm", pct: pct(fN) },
      { k: "act", label: "Plot activity, 24 h", value: act + " pts", pct: pct(fA) },
      { k: "work", label: "Jurek's pushes, 7 days", value: push7 + (repos30 ? ` + ${repos30} new repos` : ""), pct: pct(fW) },
      { k: "trade", label: "Player trading", value: r2(p.gzm) + "x", pct: pct(p.gzm) },
    ],
    gzf: [
      { k: "launch", label: "Rocket launches, 24 h", value: String(launches), pct: pct(fL) },
      { k: "wind", label: "Wind in Gzowo", value: r2(wind) + " km/h", pct: pct(fWind) },
      { k: "rain", label: "Rain in Gzowo", value: r2(rain) + " mm", pct: pct(fRain) },
      { k: "trade", label: "Player trading", value: r2(p.gzf) + "x", pct: pct(p.gzf) },
    ],
    parts: d, tot: totals, at: now,
  };
  await env.DB.batch([
    kvSet(env, "f_gzm", f.gzm), kvSet(env, "f_gzf", f.gzf), kvSet(env, "p_gzm", p.gzm), kvSet(env, "p_gzf", p.gzf),
    kvSet(env, "narew", narew), kvSet(env, "push7", push7), kvSet(env, "repos30", repos30), kvSet(env, "wind", wind), kvSet(env, "rain", rain),
    env.DB.prepare("INSERT INTO prices (t, gzm, gzf, why) VALUES (?1, ?2, ?3, ?4) ON CONFLICT(t) DO UPDATE SET gzm = ?2, gzf = ?3, why = ?4")
      .bind(slot, r2(f.gzm * p.gzm), r2(f.gzf * p.gzf), JSON.stringify(why)),
    env.DB.prepare("DELETE FROM prices WHERE t < ?").bind(now - 30 * DAY),
    env.DB.prepare("DELETE FROM live WHERE until < ?").bind(now - 60000),
    env.DB.prepare("DELETE FROM proofs WHERE t < ?").bind(now - 2 * DAY),
    env.DB.prepare("DELETE FROM earns WHERE day < ?").bind(new Date(now - 3 * DAY).toISOString().slice(0, 10)),
    env.DB.prepare("DELETE FROM ipday WHERE day < ?").bind(new Date(now - 3 * DAY).toISOString().slice(0, 10)),
    env.DB.prepare("DELETE FROM ledger WHERE t < ?").bind(now - 90 * DAY),
  ]);
}

async function route(req, env, ctx) {
  const url = new URL(req.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";
  const method = req.method;
  const body = method === "POST" ? await req.json().catch(() => ({})) : {};
  const bearer = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const id = bearer ? await walletId(bearer) : null;
  const admin = !!env.ADMIN_KEY && req.headers.get("x-admin") === env.ADMIN_KEY;
  const need = async () => {
    if (!id) throw new Fail("Wallet code missing", 401);
    return me(env, id);
  };

  if (method === "GET" && path === "/pulse") {
    const last = (await kvGet(env, ["tick"])).tick || 0;
    if (Date.now() - last > 20 * 60000) ctx.waitUntil(tick(env));
    return pulse(env);
  }
  if (method === "GET" && path === "/market") return market(env);
  if (method === "GET" && path === "/top") return top(env, id);
  if (method === "GET" && path === "/shop") {
    return {
      shop: Object.entries(SHOP).map(([k, s]) => ({ id: k, price: s.price, name: s.name, text: s.text || 0 })),
      items: [...Object.keys(ITEMS), ...Object.keys(EXCLUSIVE)].map((k) => ({ id: k, price: itemPrice(k), exclusive: !!EXCLUSIVE[k] })),
    };
  }

  if (method === "POST" && path === "/wallet") {
    const nick = cleanNick(body.nick);
    if (nick && /jurek|admin|gzowo/i.test(nick) && !admin) throw new Fail("That name is taken");
    await ipLimit(env, req, "wallet", 3);
    const pick = crypto.getRandomValues(new Uint8Array(12));
    const code = [...pick].map((b) => WORDS[b]).join(" ");
    const wid = await walletId(code);
    const now = Date.now();
    await env.DB.batch([
      env.DB.prepare("INSERT INTO wallets (id, nick, szy, made, seen) VALUES (?, ?, ?, ?, ?)").bind(wid, nick, START, now, now),
      ledger(env, wid, "start", START, 0, 0, "welcome to Gzowo"),
    ]);
    return { code, me: await view(env, await me(env, wid)) };
  }
  if (method === "GET" && path === "/me") return { me: await view(env, await need()) };
  if (method === "GET" && path === "/history") return history(env, await need());
  if (method === "POST" && path === "/nick") {
    const w = await need();
    const nick = cleanNick(body.nick);
    if (nick && /jurek|admin|gzowo/i.test(nick) && !admin) throw new Fail("That name is taken");
    await env.DB.prepare("UPDATE wallets SET nick = ? WHERE id = ?").bind(nick, w.id).run();
    return { me: await view(env, await me(env, w.id)) };
  }
  if (method === "POST" && path === "/daily") return daily(env, await need());
  if (method === "POST" && path === "/earn") return earn(env, req, await need(), body);
  if (method === "POST" && path === "/quest") return quest(env, await need(), body);
  if (method === "POST" && path === "/trade") return trade(env, await need(), body);
  if (method === "POST" && path === "/buy") return buy(env, await need(), body);

  if (method === "GET" && path === "/art") return gallery(env, id);
  if (method === "POST" && path === "/art") return hang(env, req, await need(), body);
  const art = /^\/art\/([a-f0-9]{16})(\/(img|price|buy))?$/.exec(path);
  if (art) {
    if (method === "GET" && art[3] === "img") {
      const a = await env.DB.prepare("SELECT img FROM art WHERE id = ?").bind(art[1]).first();
      if (!a) throw new Fail("No such painting", 404);
      return new Response(Uint8Array.from(atob(a.img), (c) => c.charCodeAt(0)), { headers: { "content-type": "image/png", "cache-control": "public, max-age=31536000, immutable" } });
    }
    if (method === "GET" && !art[3]) return piece(env, art[1], id);
    if (method === "POST" && art[3] === "price") return reprice(env, await need(), art[1], body);
    if (method === "POST" && art[3] === "buy") return purchase(env, await need(), art[1], body);
  }

  if (path === "/admin/feedback") {
    if (!admin) throw new Fail("Nope", 403);
    if (method === "POST") await env.DB.prepare("UPDATE feedback SET done = ? WHERE id = ?").bind(body.done ? 1 : 0, +body.id).run();
    const rows = (await env.DB.prepare("SELECT id, nick, t, text, done FROM feedback ORDER BY done, t DESC LIMIT 300").all()).results;
    return { rows };
  }
  throw new Fail("Not found", 404);
}

export default {
  async fetch(req, env, ctx) {
    const origin = allowedOrigin(req.headers.get("origin"));
    const cors = {
      "access-control-allow-methods": "GET, POST, OPTIONS",
      "access-control-allow-headers": "content-type, authorization, x-admin",
      "access-control-max-age": "86400",
      vary: "origin",
    };
    if (origin) cors["access-control-allow-origin"] = origin;
    if (req.method === "OPTIONS") return new Response(null, { status: origin ? 204 : 403, headers: cors });
    let out, status = 200;
    try {
      out = await route(req, env, ctx);
    } catch (e) {
      status = e instanceof Fail ? e.status : 500;
      out = { error: e instanceof Fail ? e.message : "Something broke in the bank" };
      if (!(e instanceof Fail)) console.error(e && e.stack ? e.stack : e);
    }
    if (out instanceof Response) {
      for (const [k, v] of Object.entries(cors)) out.headers.set(k, v);
      return out;
    }
    return new Response(JSON.stringify(out), { status, headers: { ...cors, "content-type": "application/json", "cache-control": "no-store" } });
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil(tick(env));
  },
};
