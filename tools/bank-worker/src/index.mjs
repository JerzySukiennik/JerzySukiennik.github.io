/* Gzowo Bank: szyszki wallets, the GZM and GZF coins priced from real data (Narew at Pułtusk, plot activity, Jurek's GitHub pushes,
   Gzowo wind, rocket launches) and player trades, plus the shop, daily quests, the museum art market, Haiku buying drawings off the wall and Jurek's feedback inbox. */

const RTDB = "https://raft-e8d47-default-rtdb.firebaseio.com";
const MODEL = "claude-haiku-5-5";
const START = 50, DAILY = 20, FEE = 0.01, DAY = 86400000, HANG_PAY = 20;
const WALL_SELLS = 5, WALL_LOOKS = 25, WALL_INK = 50000, WALL_KEY = /^[a-z0-9]{24}$/, STROKE_ID = /^[-_A-Za-z0-9]{20}$/;
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
  const w = await kvGet(env, ["wx_t", "wx_code", "wx_cloud", "wx_rain", "wx_snow", "wx_day", "wx_at", "wind"]);
  return {
    t: now, gzm: p.gzm, gzf: p.gzf,
    wx: w.wx_at && now - w.wx_at < 3 * 3600000 ? { temp: w.wx_t, code: w.wx_code, cloud: w.wx_cloud, rain: w.wx_rain, snow: w.wx_snow, day: w.wx_day, wind: w.wind, at: w.wx_at } : null,
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

const MUSEUM = "You are Haiku, the friendly art critic of the Gzowo Museum on gzowo.fun, a pixel-art website about a plot of land in Gzowo, Poland, by a 14-year-old maker. Visitors paint in a small MS Paint style editor. Judge effort, creativity, composition and colour on a 1 to 10 scale: 1-2 an accidental scribble or empty canvas, 3-4 a quick doodle, 5-6 a clear picture with some care, 7-8 a detailed and thoughtful picture, 9-10 genuinely impressive. Be honest but warm. Mark it unsafe if the picture, title or description shows sexual content, nudity, gore, hate symbols, slurs, bullying of a real person, or personal data like phone numbers or addresses.";
const BUYER = "You are Haiku, the art buyer of the Gzowo wall on gzowo.fun, a pixel-art website about a plot of land in Gzowo, Poland, by a 14-year-old maker. Visitors spray paint on one long shared brick wall with spray cans, chalk, neon, masking tape and stencils. A visitor wants to sell you one drawing they made there; you see it cut out from the wall with the wall behind it. Judge effort, creativity, composition and colour on a 1 to 10 scale: 1-2 a random scribble or a few lines, 3-4 a quick doodle, 5-6 a clear picture or tag with some care, 7-8 a detailed and thoughtful piece, 9-10 genuinely impressive graffiti. Be honest but warm. Mark it unsafe if it shows sexual content, nudity, gore, hate symbols, slurs, bullying of a real person, or personal data like phone numbers or addresses.";

async function critic(env, system, b64, type, text) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: MODEL, max_tokens: 400, thinking: { type: "disabled" }, system,
      tools: [{
        name: "review", description: "Record the review of the picture.",
        input_schema: {
          type: "object", additionalProperties: false, required: ["score", "safe", "comment"],
          properties: {
            score: { type: "integer", minimum: 1, maximum: 10 },
            safe: { type: "boolean" },
            comment: { type: "string", description: "One or two short playful sentences in English about this picture, at most 200 characters." },
          },
        },
      }],
      tool_choice: { type: "tool", name: "review" },
      messages: [{ role: "user", content: [
        { type: "image", source: { type: "base64", media_type: type, data: b64 } },
        { type: "text", text },
      ] }],
    }),
  });
  if (!res.ok) throw new Fail("Haiku is out for lunch, try again in a minute", 503);
  const data = await res.json();
  const use = (data.content || []).find((c) => c.type === "tool_use");
  if (!use) throw new Fail("Haiku is out for lunch, try again in a minute", 503);
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
  const review = await critic(env, MUSEUM, b64, "image/png", `Title: ${title}\nDescription: ${about || "(none)"}`);
  if (!review.safe) throw new Fail("The museum can't hang this one");
  await bump(env, w.id, "art", COUNT_ONLY.art);
  const id = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  const paid = n < 3 && review.score >= 3 ? HANG_PAY : 0;
  await env.DB.prepare("INSERT INTO art (id, author, owner, title, about, price, forsale, score, comment, t, img, w, h, sales) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)")
    .bind(id, w.id, w.id, title, about, price, body.forsale === false ? 0 : 1, review.score, review.comment, Date.now(), b64, size.w, size.h).run();
  await env.DB.prepare("INSERT INTO art_hist (art, t, seller, buyer, price) VALUES (?, ?, NULL, ?, 0)").bind(id, Date.now(), w.id).run();
  if (paid) await credit(env, w.id, paid, "art", "hung a painting in the museum");
  return { ok: true, id, paid, me: await view(env, await me(env, w.id)) };
}

const ART_COLS = "a.id, a.author, a.owner, a.title, a.about, a.price, a.forsale, a.t, a.w, a.h, a.sales, au.nick an, ow.nick onick";
const artOut = (a, id) => ({
  id: a.id, title: a.title, about: a.about, price: a.price, forsale: !!a.forsale, t: a.t, w: a.w, h: a.h, sales: a.sales,
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

const wallOf = (req) => (plotOf(req) === "plotDev" ? ["muralWallDev", "muralWallTrashDev"] : ["muralWall", "muralWallTrash"]);
const tag12 = async (s) => (await sha(s)).slice(0, 12);

async function strokesOf(req, ids) {
  if (!Array.isArray(ids) || !ids.length || ids.length > 800) throw new Fail("That drawing didn't arrive");
  const seen = new Set(), list = [];
  for (const x of ids) {
    if (!Array.isArray(x) || !Number.isInteger(x[0]) || x[0] < 0 || x[0] >= 1e8 || typeof x[1] !== "string" || !STROKE_ID.test(x[1]) || seen.has(x[1])) throw new Fail("That drawing didn't arrive");
    seen.add(x[1]);
    list.push({ p: x[0], id: x[1] });
  }
  const ps = [...new Set(list.map((x) => x.p))];
  if (ps.length > 6) throw new Fail("That drawing is too spread out");
  const far = wallOf(req)[0], data = await Promise.all(ps.map((p) => rtdb(`${far}/${p}.json`)));
  const by = new Map(ps.map((p, i) => [p, data[i] && typeof data[i] === "object" ? data[i] : {}]));
  return list.map((x) => ({ ...x, v: by.get(x.p)[x.id] || null }));
}

async function owned(list, key, wid) {
  const a = WALL_KEY.test(String(key || "")) ? await tag12("gzowo-wall-a:" + key) : null, u = wid ? await tag12("gzowo-wall-u:" + wid) : null;
  for (const s of list) {
    if (!s.v || typeof s.v !== "object" || typeof s.v.d !== "string") throw new Fail("Part of that drawing is gone already", 409);
    if (!((a && s.v.a === a) || (u && s.v.u === u))) throw new Fail("Only the painter can sell that drawing", 403);
  }
  if (!list.some((s) => s.v.k !== "e")) throw new Fail("There's no paint in that one");
}

const sigOf = async (list) => sha(list.map((s) => [s.v.k, s.v.c, s.v.w, s.v.z, s.v.o, s.v.h, s.v.d].join("|")).sort().join("\n"));

function inkOf(v) {
  if (v.k === "e") return 0;
  const sc = 2 ** -(Number.isInteger(v.z) ? clamp(v.z, 0, 30) : 0), n = String(v.d).split(",").map(Number), w = clamp(+v.w || 12, 3, 200) * sc;
  let len = 0;
  for (let i = 2; i + 1 < n.length; i += 2) len += Math.hypot(n[i] - n[i - 2], n[i + 1] - n[i - 1]);
  return (len * sc + w) * w;
}

async function wallQuote(env, req, w, body) {
  const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(String(body.img || ""));
  if (!m || m[1].length > 700000) throw new Fail("The drawing didn't arrive");
  const sold = await env.DB.prepare("SELECT n FROM earns WHERE w = ? AND day = ? AND kind = 'wallsell'").bind(w.id, today()).first();
  if (sold && sold.n >= WALL_SELLS) throw new Fail("Haiku already bought five of your drawings today, come back tomorrow");
  const list = await strokesOf(req, body.ids);
  await owned(list, body.key, w.id);
  const sig = await sigOf(list);
  if (await env.DB.prepare("SELECT 1 FROM wall_sold WHERE sig = ?").bind(sig).first()) throw new Fail("Haiku already bought this one");
  await ipLimit(env, req, "wallq", 60);
  if (!(await bump(env, w.id, "wallq", WALL_LOOKS))) throw new Fail("Haiku has looked at enough of your drawings today, come back tomorrow");
  const r = await critic(env, BUYER, m[1], "image/jpeg", "Here is my drawing from the wall. How good is it?");
  if (!r.safe) throw new Fail("Haiku won't buy this one");
  const ink = list.reduce((s, x) => s + inkOf(x.v), 0);
  const szy = clamp(Math.round(r.score * 10 * clamp(Math.sqrt(ink / WALL_INK), 0.1, 1)), 1, 100);
  const id = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  await env.DB.prepare("INSERT INTO wall_quotes (id, w, wall, ids, sig, szy, t) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(id, w.id, wallOf(req)[0], JSON.stringify(list.map((x) => [x.p, x.id])), sig, szy, Date.now()).run();
  const p = await prices(env);
  return { quote: id, szy, score: r.score, comment: r.comment, gzm: r6(szy / p.gzm), gzf: r6(szy / p.gzf) };
}

async function wallSell(env, req, w, body) {
  const pay = ["szy", "gzm", "gzf"].includes(body.pay) ? body.pay : null;
  if (!pay) throw new Fail("Pick how Haiku pays you");
  const q = await env.DB.prepare("SELECT * FROM wall_quotes WHERE id = ? AND w = ?").bind(String(body.quote || ""), w.id).first();
  if (!q || Date.now() - q.t > 15 * 60000 || q.wall !== wallOf(req)[0]) throw new Fail("That offer ran out, ask Haiku again", 410);
  const list = await strokesOf(req, JSON.parse(q.ids));
  if (list.some((x) => !x.v)) throw new Fail("Part of that drawing is gone already", 409);
  if ((await sigOf(list)) !== q.sig) throw new Fail("The drawing changed, ask Haiku again", 409);
  const del = await env.DB.prepare("DELETE FROM wall_quotes WHERE id = ?").bind(q.id).run();
  if (!del.meta.changes) throw new Fail("Already sold", 409);
  if (!(await bump(env, w.id, "wallsell", WALL_SELLS))) throw new Fail("Haiku already bought five of your drawings today, come back tomorrow");
  const undo = () => env.DB.batch([
    env.DB.prepare("DELETE FROM wall_sold WHERE sig = ?").bind(q.sig),
    env.DB.prepare("UPDATE earns SET n = n - 1 WHERE w = ? AND day = ? AND kind = 'wallsell' AND n > 0").bind(w.id, today()),
  ]);
  const claim = await env.DB.prepare("INSERT OR IGNORE INTO wall_sold (sig, w, t) VALUES (?, ?, ?)").bind(q.sig, w.id, Date.now()).run();
  if (!claim.meta.changes) { await env.DB.prepare("UPDATE earns SET n = n - 1 WHERE w = ? AND day = ? AND kind = 'wallsell' AND n > 0").bind(w.id, today()).run(); throw new Fail("Haiku already bought this one"); }
  const [far, bin] = wallOf(req), patch = {};
  for (const x of list) {
    const { t, ...rest } = x.v;
    patch[`${far}/${x.p}/${x.id}`] = null;
    patch[`${bin}/${x.p}/${x.id}`] = { ...rest, e: { ".sv": "timestamp" } };
  }
  const res = await fetch(`${RTDB}/.json`, { method: "PATCH", body: JSON.stringify(patch) }).catch(() => null);
  if (!res || !res.ok) { await undo(); throw new Fail("The wall didn't let go of it, try again", 503); }
  let got;
  if (pay === "szy") {
    got = q.szy;
    await credit(env, w.id, got, "wall", "Haiku bought a drawing from the wall");
  } else {
    const p = await prices(env);
    got = r6(q.szy / p[pay]);
    await env.DB.batch([
      env.DB.prepare(`UPDATE wallets SET ${pay} = ${pay} + ?1, seen = ?2 WHERE id = ?3`).bind(got, Date.now(), w.id),
      ledger(env, w.id, "wall", 0, pay === "gzm" ? got : 0, pay === "gzf" ? got : 0, "Haiku bought a drawing from the wall"),
    ]);
  }
  return { ok: true, pay, got, me: await view(env, await me(env, w.id)) };
}

const WX = 1000, THEME_PRIZE = [60, 40, 25], THEME_TRIES = 3, STENCILS = 5, PUSH = "-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz";
const GAL = { zone: { x0: 0, x1: 2000, y0: -877, y1: -40 }, panels: 2, perPanel: 5 };
const THEME_FALLBACK = ["Rockets in the rain", "My dream treehouse", "Robots at the beach", "Space pizza", "The Narew at night", "Animals in sunglasses", "A city on a cloud",
  "Dragons and drones", "Underwater Gzowo", "Tiny worlds", "Retro arcade", "Snow day in Gzowo", "Fruit with faces", "Bikes of the future", "A friendly monster", "Launch day"];
const JUDGE = (th) => `You are Haiku, the judge of the weekly theme on the shared spray paint wall of gzowo.fun, a pixel-art website about a plot of land in Gzowo, Poland, by a 14-year-old maker. This week's theme is "${th.title}": ${th.about} Visitors paint on one long brick wall with spray cans, chalk, neon, paint rollers, masking tape and stencils; you see one drawing cut out from the wall with the wall behind it. Score how well it fits the theme and how good it is, 1 to 10: 1-2 off theme or a scribble, 3-4 a quick doodle that loosely fits, 5-6 clearly on theme with some care, 7-8 a detailed, creative take on the theme, 9-10 genuinely impressive and right on theme. Be honest but warm and say how it fits the theme. Mark it unsafe if it shows sexual content, nudity, gore, hate symbols, slurs, bullying of a real person, or personal data like phone numbers or addresses.`;
const STENCIL_SYS = `You design spray paint stencils for the shared wall on gzowo.fun, a pixel-art website by a 14-year-old maker in Gzowo, Poland. A visitor describes a picture and you draw it as one simple flat SVG. It gets cut out of cardboard layer by layer: every color becomes its own stencil layer that is sprayed in turn, so draw it like a bold sticker or a screen print.
Rules for the SVG:
- viewBox="0 0 256 256" and a transparent background: never draw a background rectangle, a frame or a ground plane.
- 2 to 5 solid colors written as 6 digit hex like #1b1b1b. No gradients, no opacity, no filters, no text, no images, no clip paths.
- Only path, circle, ellipse, rect, polygon, polyline, line and g elements.
- Big, simple, iconic shapes that fill most of the 256 by 256 box and read at a glance, like a good logo. Put a thick dark outline (#1b1b1b, stroke-width 6 to 10, round joins) around the main shapes, or a dark silhouette under the colored parts.
- Nothing thinner than 6 units: no hairlines and no tiny dots. At most about 60 elements.
- Draw back to front: later elements cover earlier ones. Never hide the main subject under a big shape: draw a helmet, glass or window as a ring or outline so the face inside shows.
Mark it unsafe if the description asks for sexual content, nudity, gore, weapons aimed at people, hate symbols, slurs, bullying of a real person or personal data.`;

function weekOf(ms = Date.now()) {
  const [y, m, d] = new Date(ms).toLocaleDateString("sv-SE", { timeZone: "Europe/Warsaw" }).split("-").map(Number), t = Date.UTC(y, m - 1, d);
  return new Date(t - ((new Date(t).getUTCDay() + 6) % 7) * DAY).toISOString().slice(0, 10);
}
function warsawMidnight(ymd) {
  const [y, m, d] = ymd.split("-").map(Number);
  for (const off of [1, 2]) {
    const t = Date.UTC(y, m - 1, d) - off * 3600000;
    if (new Date(t).toLocaleString("sv-SE", { timeZone: "Europe/Warsaw", hour12: false }).startsWith(ymd + " 00:00")) return t;
  }
  return Date.UTC(y, m - 1, d) - 3600000;
}
const weekEnd = (wk) => warsawMidnight(new Date(Date.parse(wk) + 7 * DAY + 3 * 3600000).toISOString().slice(0, 10));

async function haikuTool(env, system, tool, content, max = 400) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: MODEL, max_tokens: max, thinking: { type: "disabled" }, system, tools: [tool], tool_choice: { type: "tool", name: tool.name }, messages: [{ role: "user", content }] }),
  });
  if (!res.ok) throw new Fail("Haiku is out for lunch, try again in a minute", 503);
  const data = await res.json();
  if (data.stop_reason === "max_tokens") throw new Fail("Haiku's drawing came out too big, try a simpler idea", 503);
  const use = (data.content || []).find((c) => c.type === "tool_use");
  if (!use) throw new Fail("Haiku is out for lunch, try again in a minute", 503);
  return use.input;
}

async function themeOf(env, wk) {
  const have = await env.DB.prepare("SELECT week, title, about FROM themes WHERE week = ?").bind(wk).first();
  if (have) return have;
  const past = (await env.DB.prepare("SELECT title FROM themes ORDER BY week DESC LIMIT 24").all()).results.map((r) => r.title);
  let title = "", about = "";
  try {
    const month = new Date(Date.parse(wk) + 3 * DAY).toLocaleDateString("en-GB", { month: "long" });
    const r = await haikuTool(env, "You pick the weekly drawing theme for the shared spray paint wall on gzowo.fun, a pixel-art website by a 14-year-old maker about his family's plot of land in Gzowo, Poland, by the Narew river, with a rocket launch pad, a workshop with 3D printers, an arcade, kayaks and pine trees. Visitors are kids, teens and their parents. A good theme is fun, visual, open to many ideas and easy to paint with spray cans, chalk, rollers and stencils. Now and then it is about Gzowo, rockets, the river or the season. Never scary, violent, sad or political.",
      { name: "theme", description: "The theme for this week.", input_schema: { type: "object", additionalProperties: false, required: ["title", "about"], properties: {
        title: { type: "string", description: "The theme in English, 2 to 5 words, at most 32 characters, no quotes." },
        about: { type: "string", description: "One short inviting English sentence about what to paint, at most 110 characters." } } } },
      `The week starting ${wk} (${month}). Pick a fresh theme, different from these past ones: ${past.join("; ") || "none yet"}.`, 200);
    title = tidy(String(r.title || "").replace(/["“”]/g, ""), 32).replace(/\.\.\.$/, "");
    about = tidy(String(r.about || ""), 120);
    if (bad(title) || bad(about) || title.length < 3) title = "";
  } catch (e) { title = ""; }
  if (!title) { const n = Math.floor(Date.parse(wk) / (7 * DAY)); title = THEME_FALLBACK.filter((t) => !past.includes(t))[0] || THEME_FALLBACK[n % THEME_FALLBACK.length]; about = "Paint your own take on it anywhere on the wall, then enter it for Haiku to judge."; }
  await env.DB.prepare("INSERT OR IGNORE INTO themes (week, title, about, t) VALUES (?, ?, ?, ?)").bind(wk, title, about, Date.now()).run();
  return env.DB.prepare("SELECT week, title, about FROM themes WHERE week = ?").bind(wk).first();
}

function galCol(slot) {
  const P = Math.floor(slot / GAL.perPanel), j = slot % GAL.perPanel;
  if (slot < 0 || P >= GAL.panels) return null;
  const x0 = P * WX + 15 + j * 200;
  return { slot, title: [x0, -702, 170, 60], frames: [0, 1, 2].map((i) => ({ f: [x0, -632 + i * 184, 170, 140], plq: [x0 + 6, -632 + i * 184 + 144, 158, 26] })) };
}

async function bestOf(env, wk, wall) {
  return (await env.DB.prepare(`SELECT e.w, MAX(e.score) score, MIN(e.t) t, wl.nick FROM theme_entries e LEFT JOIN wallets wl ON wl.id = e.w
    WHERE e.week = ? AND e.wall = ? GROUP BY e.w ORDER BY score DESC, t ASC LIMIT 40`).bind(wk, wall).all()).results;
}

async function themeView(env, req, id) {
  const wk = weekOf(), th = await themeOf(env, wk), wall = wallOf(req)[0], rows = await bestOf(env, wk, wall);
  const mine = id ? await env.DB.prepare("SELECT COUNT(*) n, MAX(score) best FROM theme_entries WHERE week = ? AND wall = ? AND w = ?").bind(wk, wall, id).first() : null;
  const rank = id ? rows.findIndex((r) => r.w === id) + 1 : 0;
  return {
    week: wk, title: th.title, about: th.about, ends: weekEnd(wk), prizes: THEME_PRIZE, tries: THEME_TRIES,
    top: rows.slice(0, 5).map((r, i) => ({ rank: i + 1, nick: r.nick || "someone", score: r.score, me: r.w === id })),
    mine: mine ? { entered: mine.n, best: mine.best || 0, rank } : null,
  };
}

async function galleryView(env, req) {
  const wall = wallOf(req)[0], wk = weekOf(), th = await themeOf(env, wk);
  const rows = (await env.DB.prepare("SELECT week, slot, title, winners FROM gallery WHERE wall = ? AND slot >= 0 ORDER BY slot").bind(wall).all()).results;
  const next = galCol(rows.length);
  return {
    zone: GAL.zone, week: wk, title: th.title, ends: weekEnd(wk),
    header: { rect: [GAL.zone.x0 + 15, GAL.zone.y0 + 10, GAL.zone.x1 - GAL.zone.x0 - 30, 150], lines: ["THE WALL GALLERY", "THIS WEEK: " + th.title, "Enter your drawing with the Theme button in the wall painter"] },
    cols: rows.map((r) => ({ ...galCol(r.slot), week: r.week, theme: r.title, winners: JSON.parse(r.winners) })).filter((c) => c.frames),
    next: next ? { ...next, week: wk, theme: th.title, winners: [] } : null,
    future: Array.from({ length: GAL.panels * GAL.perPanel }, (_, i) => galCol(i)).filter((c) => c && c.slot > rows.length),
  };
}

async function themeEnter(env, req, w, body) {
  const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(String(body.img || ""));
  if (!m || m[1].length > 700000) throw new Fail("The drawing didn't arrive");
  const wk = weekOf(), th = await themeOf(env, wk), wall = wallOf(req)[0];
  const tries = (await env.DB.prepare("SELECT COUNT(*) n FROM theme_entries WHERE week = ? AND wall = ? AND w = ?").bind(wk, wall, w.id).first()).n;
  if (tries >= THEME_TRIES) throw new Fail(`You entered ${THEME_TRIES} drawings this week. A new theme comes on Monday!`);
  const list = await strokesOf(req, body.ids);
  if (list.length > 400) throw new Fail("That drawing has too many strokes for the gallery");
  await owned(list, body.key, w.id);
  const sig = await sigOf(list);
  if (await env.DB.prepare("SELECT 1 FROM theme_entries WHERE week = ? AND wall = ? AND sig = ?").bind(wk, wall, sig).first()) throw new Fail("That drawing is in this week's theme already");
  const ops = JSON.stringify(list.map((x) => ({ p: x.p, id: x.id, v: x.v })));
  if (ops.length > 900000) throw new Fail("That drawing is too big for the gallery");
  await ipLimit(env, req, "themeq", 40);
  const r = await critic(env, JUDGE(th), m[1], "image/jpeg", `Here is my drawing for this week's theme, "${th.title}". How well does it fit?`);
  if (!r.safe) throw new Fail("Haiku can't put this one in the gallery");
  const id = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  await env.DB.prepare("INSERT INTO theme_entries (id, week, wall, w, sig, score, comment, ops, t) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(id, wk, wall, w.id, sig, r.score, r.comment, ops, Date.now()).run();
  const rows = await bestOf(env, wk, wall);
  return { score: r.score, comment: r.comment, rank: rows.findIndex((x) => x.w === w.id) + 1, left: THEME_TRIES - tries - 1, title: th.title };
}

function pushIds(n) {
  let now = Date.now(), t = "";
  for (let i = 0; i < 8; i++) { t = PUSH[now % 64] + t; now = Math.floor(now / 64); }
  const base = [...crypto.getRandomValues(new Uint8Array(6))].map((b) => PUSH[b % 64]).join("");
  return Array.from({ length: n }, (_, i) => t + base + [3, 2, 1, 0].map((k) => PUSH[Math.floor(i / 64 ** k) % 64]).join("") + "zz");
}

function strokeWorld(x) {
  const v = x.v, z = Number.isInteger(v.z) ? v.z : 0, sc = 2 ** -z, [ox, oy] = v.o ? String(v.o).split(",").map(Number) : [0, 0], base = x.p * WX;
  const poly = (s) => { const n = String(s).split(",").map(Number), o = []; for (let i = 0; i + 1 < n.length; i += 2) o.push([base + (n[i] + ox) * sc, (n[i + 1] + oy) * sc]); return o; };
  return { v, z, sc, d: poly(v.d), m: v.m ? String(v.m).split(";").map(poly) : null, s: v.s ? String(v.s).split("|").map((g) => g.split(";").map(poly)) : null };
}

function copyInto(wall, ops, f) {
  const ws = ops.filter((o) => o.v && typeof o.v.d === "string").map(strokeWorld).filter((W) => W.d.length);
  if (!ws.length) return {};
  let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
  ws.forEach((W) => { const r = W.v.w * W.sc * (W.v.k === "e" ? 0.5 : 0.9); W.d.forEach(([x, y]) => { bx0 = Math.min(bx0, x - r); by0 = Math.min(by0, y - r); bx1 = Math.max(bx1, x + r); by1 = Math.max(by1, y + r); }); });
  const fx = f[0] + 12, fy = f[1] + 12, fw = f[2] - 24, fh = f[3] - 24, bw = Math.max(1, bx1 - bx0), bh = Math.max(1, by1 - by0);
  const S = Math.min(fw / bw, fh / bh, 3), ox = fx + (fw - bw * S) / 2, oy = fy + (fh - bh * S) / 2, P = Math.floor(f[0] / WX), base = P * WX, ids = pushIds(ws.length), patch = {};
  ws.forEach((W, i) => {
    const v = W.v, z2 = clamp(Math.round(W.z - Math.log2(S)), 0, 30), s2 = 2 ** z2;
    const ints = (pts) => pts.map(([X, Y]) => [Math.max(0, Math.round((ox + (X - bx0) * S - base) * s2)), Math.round((oy + (Y - by0) * S) * s2)]);
    const d = ints(W.d);
    let qx = 0, qy = 0;
    if (z2) { qx = Math.min(...d.map((q) => q[0])); qy = Math.min(...d.map((q) => q[1])); }
    const enc = (list) => list.map(([a, b]) => a - qx + "," + (b - qy)).join(",");
    const out = { k: v.k, d: enc(d), w: clamp(Math.round(v.w * S * 2 ** (z2 - W.z)), 3, 200), t: { ".sv": "timestamp" } };
    if (out.d.length > 3000) return;
    if (v.k !== "e") out.c = v.c;
    if (z2) { out.z = z2; out.o = qx + "," + qy; }
    if (v.h) out.h = v.h;
    if (Number.isInteger(v.r)) out.r = v.r;
    if (W.m) { const mm = W.m.map((p) => enc(ints(p))).join(";"); if (mm.length <= 4000) out.m = mm; }
    if (W.s) { const ss = W.s.map((g) => g.map((p) => enc(ints(p))).join(";")).join("|"); if (ss.length <= 9000) out.s = ss; }
    patch[`${wall}/${P}/${ids[i]}`] = out;
  });
  return patch;
}

async function closeWeek(env, wall, wk) {
  const th = await env.DB.prepare("SELECT title FROM themes WHERE week = ?").bind(wk).first(), title = th ? th.title : "";
  const top = (await bestOf(env, wk, wall)).slice(0, 3);
  const used = (await env.DB.prepare("SELECT COUNT(*) n FROM gallery WHERE wall = ? AND slot >= 0").bind(wall).first()).n;
  const col = top.length ? galCol(used) : null;
  const winners = top.map((r, i) => ({ rank: i + 1, nick: r.nick || "someone", score: r.score }));
  const lock = await env.DB.prepare("INSERT OR IGNORE INTO gallery (wall, week, slot, title, winners, t) VALUES (?, ?, ?, ?, ?, ?)").bind(wall, wk, col ? used : -1, title, JSON.stringify(winners), Date.now()).run();
  if (!lock.meta.changes) return;
  if (col) {
    const patch = {};
    for (const [i, r] of top.entries()) {
      const e = await env.DB.prepare("SELECT ops FROM theme_entries WHERE week = ? AND wall = ? AND w = ? ORDER BY score DESC, t ASC LIMIT 1").bind(wk, wall, r.w).first();
      if (e) Object.assign(patch, copyInto(wall, JSON.parse(e.ops), col.frames[i].f));
    }
    if (Object.keys(patch).length) await fetch(`${RTDB}/.json`, { method: "PATCH", body: JSON.stringify(patch) }).catch(() => null);
  }
  for (const [i, r] of top.entries()) await credit(env, r.w, THEME_PRIZE[i], "theme", `${["1st", "2nd", "3rd"][i]} place in the wall theme "${title}"`);
}

async function themeRoll(env, only) {
  const now = Date.now(), lock = await env.DB.prepare("INSERT INTO kv (k, v) VALUES ('themeroll', ?1) ON CONFLICT(k) DO UPDATE SET v = ?1 WHERE v < ?2").bind(now, now - 120000).run();
  if (!lock.meta.changes) return;
  try {
    const cur = weekOf();
    await themeOf(env, cur);
    const weeks = only ? [only] : (await env.DB.prepare("SELECT week FROM themes WHERE week < ? ORDER BY week").bind(cur).all()).results.map((r) => r.week);
    for (const wk of weeks) for (const wall of ["muralWall", "muralWallDev"]) {
      if (!(await env.DB.prepare("SELECT 1 FROM gallery WHERE wall = ? AND week = ?").bind(wall, wk).first())) await closeWeek(env, wall, wk);
    }
  } finally {
    await env.DB.prepare("UPDATE kv SET v = 0 WHERE k = 'themeroll'").run();
  }
}

const SVG_TAGS = new Set(["g", "path", "circle", "ellipse", "rect", "polygon", "polyline", "line"]);
const SVG_ATTR = new Set(["d", "fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin", "fill-rule", "cx", "cy", "r", "rx", "ry", "x", "y", "width", "height", "points", "x1", "y1", "x2", "y2", "transform"]);
function cleanSvg(src) {
  const s = String(src || "").slice(0, 60000), out = [], stack = [];
  const re = /<\s*(\/?)\s*([a-zA-Z][a-zA-Z0-9]*)([^>]*?)(\/?)\s*>/g;
  let m, shapes = 0;
  while ((m = re.exec(s)) && out.length < 800) {
    const [, close, raw, attrs, self] = m, tag = raw.toLowerCase();
    if (!SVG_TAGS.has(tag)) continue;
    if (close) { const i = stack.lastIndexOf(tag); if (i >= 0) { while (stack.length > i) out.push(`</${stack.pop()}>`); } continue; }
    const at = [];
    attrs.replace(/([a-zA-Z][a-zA-Z0-9-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g, (_, k, a, b) => {
      const key = k.toLowerCase(), val = String(a ?? b ?? "").trim();
      if (SVG_ATTR.has(key) && val.length <= 12000 && /^[-#0-9a-zA-Z.,\s()%]*$/.test(val) && !/url|script|expression/i.test(val)) at.push(`${key}="${val}"`);
      return "";
    });
    out.push(`<${tag}${at.length ? " " + at.join(" ") : ""}${self ? "/" : ""}>`);
    if (tag !== "g") shapes++;
    if (!self) stack.push(tag);
  }
  while (stack.length) out.push(`</${stack.pop()}>`);
  if (!shapes) return null;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="512" height="512">${out.join("")}</svg>`;
}

async function stencilDraw(env, req, w, body) {
  const text = cleanText(body.prompt, 80, 2);
  if (!(await bump(env, w.id, "stencil", STENCILS))) throw new Fail(`Haiku drew ${STENCILS} stencils for you today, come back tomorrow`);
  const refund = () => env.DB.prepare("UPDATE earns SET n = n - 1 WHERE w = ? AND day = ? AND kind = 'stencil' AND n > 0").bind(w.id, today()).run();
  try {
    await ipLimit(env, req, "stencil", 25);
    const r = await haikuTool(env, STENCIL_SYS, { name: "stencil", description: "The stencil drawing.", input_schema: { type: "object", additionalProperties: false, required: ["safe", "name", "svg"], properties: {
      safe: { type: "boolean" },
      name: { type: "string", description: "A short name for the stencil, at most 20 characters, in the same language as the description: English for an English description, Polish for a Polish one." },
      svg: { type: "string", description: "The whole SVG document with viewBox 0 0 256 256." } } } }, `Draw this stencil: ${text}`, 7000);
    if (r.safe === false) throw new Fail("Haiku won't draw that one");
    const svg = cleanSvg(r.svg);
    if (!svg) throw new Fail("Haiku's drawing didn't work out, try again", 503);
    const name = String(r.name || text).replace(/[<>"&]/g, "").trim().slice(0, 20) || "Stencil";
    const n = await env.DB.prepare("SELECT n FROM earns WHERE w = ? AND day = ? AND kind = 'stencil'").bind(w.id, today()).first();
    return { svg, name: bad(name) ? "Stencil" : name, left: Math.max(0, STENCILS - (n ? n.n : 0)) };
  } catch (e) {
    await refund();
    throw e;
  }
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
    fetch("https://api.open-meteo.com/v1/forecast?latitude=52.67&longitude=21.12&current=wind_speed_10m,precipitation,rain,showers,snowfall,temperature_2m,weather_code,cloud_cover,is_day&timezone=Europe%2FWarsaw").then((r) => r.json()).catch(() => null),
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
  const cur = wx && wx.current && typeof wx.current.weather_code === "number" ? wx.current : null, num = (v) => (typeof v === "number" && isFinite(v) ? v : 0);
  const sky = cur ? [kvSet(env, "wx_t", num(cur.temperature_2m)), kvSet(env, "wx_code", num(cur.weather_code)), kvSet(env, "wx_cloud", num(cur.cloud_cover)),
    kvSet(env, "wx_rain", num(cur.rain) + num(cur.showers)), kvSet(env, "wx_snow", num(cur.snowfall)), kvSet(env, "wx_day", num(cur.is_day)), kvSet(env, "wx_at", now)] : [];

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
    kvSet(env, "narew", narew), kvSet(env, "push7", push7), kvSet(env, "repos30", repos30), kvSet(env, "wind", wind), kvSet(env, "rain", rain), ...sky,
    env.DB.prepare("INSERT INTO prices (t, gzm, gzf, why) VALUES (?1, ?2, ?3, ?4) ON CONFLICT(t) DO UPDATE SET gzm = ?2, gzf = ?3, why = ?4")
      .bind(slot, r2(f.gzm * p.gzm), r2(f.gzf * p.gzf), JSON.stringify(why)),
    env.DB.prepare("DELETE FROM prices WHERE t < ?").bind(now - 30 * DAY),
    env.DB.prepare("DELETE FROM live WHERE until < ?").bind(now - 60000),
    env.DB.prepare("DELETE FROM proofs WHERE t < ?").bind(now - 2 * DAY),
    env.DB.prepare("DELETE FROM earns WHERE day < ?").bind(new Date(now - 3 * DAY).toISOString().slice(0, 10)),
    env.DB.prepare("DELETE FROM ipday WHERE day < ?").bind(new Date(now - 3 * DAY).toISOString().slice(0, 10)),
    env.DB.prepare("DELETE FROM ledger WHERE t < ?").bind(now - 90 * DAY),
    env.DB.prepare("DELETE FROM wall_quotes WHERE t < ?").bind(now - DAY),
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

  if (method === "POST" && path === "/wall/quote") return wallQuote(env, req, await need(), body);
  if (method === "POST" && path === "/wall/sell") return wallSell(env, req, await need(), body);
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

  if (method === "GET" && path === "/wall/theme") { ctx.waitUntil(themeRoll(env).catch(() => {})); return themeView(env, req, id); }
  if (method === "GET" && path === "/wall/gallery") return galleryView(env, req);
  if (method === "POST" && path === "/wall/theme/enter") return themeEnter(env, req, await need(), body);
  if (method === "POST" && path === "/wall/stencil") return stencilDraw(env, req, await need(), body);
  if (method === "POST" && path === "/admin/theme/roll") {
    if (!admin) throw new Fail("Nope", 403);
    await env.DB.prepare("UPDATE kv SET v = 0 WHERE k = 'themeroll'").run();
    await themeRoll(env, /^\d{4}-\d{2}-\d{2}$/.test(String(body.week || "")) ? body.week : undefined);
    return { ok: true };
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
    ctx.waitUntil(themeRoll(env).catch((e) => console.error(e && e.stack ? e.stack : e)));
  },
};
