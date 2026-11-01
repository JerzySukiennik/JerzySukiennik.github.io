/* Gzowo Labs claw machine: three tries a day. Steer the claw, drop it and hope it holds on; a prize capsule that reaches the chute
   is a wearable item for your folk. The grip is a little weak on purpose, like every real claw machine. */

import { ITEMS, itemOf, itemArt, addPrize, wardrobe, mine, store } from "/assets/folks.mjs";

const W = 120, H = 150, FLOOR = 138, RAIL = 12, CHUTE = 14, TRIES = 3, AIM = 20;
const CAPS = ["#ff7eb6", "#4cc3ff", "#ffd23f", "#8bd346", "#7d4cdb", "#ff8c1a", "#1fb5a8"];
const today = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
const used = () => { const s = store.get("gl-claw", {}); return s && s.d === today() ? s.n || 0 : 0; };

function pile() {
  const out = [];
  const rows = [[36, 7, FLOOR - 6], [42, 6, FLOOR - 16], [54, 3, FLOOR - 26]];
  rows.forEach(([x0, n, y]) => { for (let i = 0; i < n; i++) out.push({ x: x0 + i * 12 + Math.round(Math.random() * 2 - 1), y: y + Math.round(Math.random() * 2), c: CAPS[Math.floor(Math.random() * CAPS.length)] }); });
  return out;
}

function prize() {
  const have = new Set(wardrobe()), pool = ITEMS.filter((i) => !have.has(i[0])), list = pool.length ? pool : ITEMS;
  let r = Math.random() * list.reduce((a, i) => a + i[3], 0);
  return (list.find((i) => (r -= i[3]) < 0) || list[0])[0];
}

export function createClaw(world) {
  const spots = world.querySelector(".spots");
  const spot = document.createElement("button");
  spot.type = "button";
  spot.className = "spot spot-claw";
  spot.dataset.place = "claw";
  spot.setAttribute("aria-label", "Claw machine, win a prize for your folk");
  spot.innerHTML = `<img class="spr" src="/assets/map/claw.webp" alt="" draggable="false"><span class="spot-l"><b>Claw machine</b><em></em></span>`;
  spots.append(spot);
  const sub = spot.querySelector(".spot-l em");
  const label = () => { const n = TRIES - used(); sub.textContent = n > 0 ? `${n} ${n === 1 ? "try" : "tries"} left today` : "come back tomorrow"; };
  label();

  let el = null, cv = null, c = null, raf = 0, last = 0, S = null;

  function fresh() { return { state: "idle", x: CHUTE, y: RAIL + 8, open: 1, dir: 0, time: AIM, caps: S ? S.caps : pile(), held: null, slip: 0, a: 0, item: "" }; }

  let bg = null;
  function backdrop() {
    bg = document.createElement("canvas");
    bg.width = W; bg.height = H;
    const g = bg.getContext("2d");
    g.fillStyle = "#cfeef6"; g.fillRect(0, 0, W, H);
    g.fillStyle = "rgba(255,255,255,.35)";
    for (let i = -H; i < W; i += 22) for (let y = 0; y < H; y++) g.fillRect(i + y * 0.5, y, 2, 1);
    g.fillStyle = "#b6dbe6"; g.fillRect(0, FLOOR, W, H - FLOOR);
    g.fillStyle = "#e05fa0"; g.fillRect(0, FLOOR, W, 1);
    g.fillStyle = "#4a4a56"; g.fillRect(0, RAIL - 4, W, 4);
    g.fillStyle = "#6d6d7c"; g.fillRect(0, RAIL - 4, W, 1);
    g.fillStyle = "#2a2a33"; g.fillRect(0, 0, W, 4);
  }
  function chute() {
    c.fillStyle = "#3a3a46"; c.fillRect(2, FLOOR - 26, 24, 27);
    c.fillStyle = "#16161c"; c.fillRect(4, FLOOR - 24, 20, 25);
    c.fillStyle = "#ffd23f"; for (let x = 2; x < 26; x += 4) c.fillRect(x, FLOOR - 27, 2, 1);
  }

  function draw() {
    if (!bg) backdrop();
    c.drawImage(bg, 0, 0);
    chute();
    S.caps.forEach((p) => cap(p.x, p.y, p.c));
    const cx = Math.round(S.x), cy = Math.round(S.y);
    c.fillStyle = "#2a2a33"; c.fillRect(cx - 4, RAIL - 5, 9, 4);
    c.fillStyle = "#555"; c.fillRect(cx, RAIL - 1, 1, cy - RAIL + 1);
    if (S.held) cap(cx, cy + 9, S.held.c);
    c.fillStyle = "#8a8a99"; c.fillRect(cx - 3, cy, 7, 4);
    c.fillStyle = "#c4c4d2"; c.fillRect(cx - 3, cy, 7, 1);
    c.fillStyle = "#6f6f80";
    for (let i = 0; i < 6; i++) {
      const out = Math.round(S.open * i * 0.6) - (i >= 4 ? Math.round((1 - S.open) * (i - 3)) : 0);
      c.fillRect(cx - 3 - out, cy + 4 + i, 1, 1);
      c.fillRect(cx + 3 + out, cy + 4 + i, 1, 1);
    }
    if (S.fall) { cap(Math.round(S.fall.x), Math.round(S.fall.y), S.fall.c); if (S.state === "release") chute(); }
    for (let x = 3; x < W; x += 6) { c.fillStyle = (x / 6 + Math.floor(performance.now() / 400)) % 2 < 1 ? "#ffe680" : "#ff9ed2"; c.fillRect(x, 1, 2, 2); }
  }

  function cap(x, y, col) {
    for (let dy = -5; dy <= 5; dy++) {
      const half = Math.round(Math.sqrt(30 - dy * dy));
      c.fillStyle = dy < 0 ? "rgba(255,255,255,.75)" : col;
      c.fillRect(x - half, y + dy, half * 2 + 1, 1);
    }
    c.fillStyle = "rgba(0,0,0,.28)"; c.fillRect(x - 5, y, 11, 1);
    c.fillStyle = "#ffffff"; c.fillRect(x - 3, y - 3, 2, 1);
  }

  function ui() {
    if (!el) return;
    const n = TRIES - used(), st = S.state;
    el.querySelector("[data-tries]").textContent = String(n);
    el.querySelector("[data-time]").textContent = st === "aim" ? String(Math.ceil(S.time)) : "-";
    el.querySelector("[data-coin]").disabled = n <= 0 || (st !== "idle" && st !== "won" && st !== "lost");
    el.querySelectorAll("[data-move],[data-drop]").forEach((b) => { b.disabled = st !== "aim"; });
    label();
  }

  function msg(t) { if (el) el.querySelector("[data-msg]").innerHTML = t; }

  function coin() {
    if (used() >= TRIES || !(S.state === "idle" || S.state === "won" || S.state === "lost")) return;
    store.set("gl-claw", { d: today(), n: used() + 1 });
    if (S.caps.length < 8) S.caps = pile();
    S = { ...fresh(), caps: S.caps, state: "aim" };
    el.querySelector("[data-prize]").hidden = true;
    msg("Steer with &#9664; &#9654; (or the arrow keys), then drop!");
    go();
    ui();
  }

  function drop() {
    if (S.state !== "aim") return;
    S.state = "down"; S.dir = 0;
    const under = S.caps.filter((p) => Math.abs(p.x - S.x) < 8);
    S.stop = (under.length ? Math.min(...under.map((p) => p.y)) : FLOOR - 6) - 9;
    msg("Going down...");
    ui();
  }

  function step(dt) {
    if (S.state === "aim") {
      S.x = Math.max(CHUTE, Math.min(W - 10, S.x + S.dir * 42 * dt));
      S.time -= dt;
      if (S.time <= 0) drop();
      ui();
    } else if (S.state === "down") {
      S.y += 46 * dt;
      if (S.y >= S.stop) { S.y = S.stop; S.state = "grab"; S.t = 0; }
    } else if (S.state === "grab") {
      S.t += dt;
      S.open = Math.max(0, 1 - S.t / 0.45);
      if (S.t > 0.6) {
        const near = S.caps.filter((p) => Math.abs(p.x - S.x) < 7).sort((a, b) => a.y - b.y)[0];
        if (near) {
          S.a = 1 - Math.abs(near.x - S.x) / 7;
          if (Math.random() < 0.25 + 0.5 * S.a) {
            S.held = near;
            S.caps = S.caps.filter((p) => p !== near);
            S.slip = Math.random() < 0.15 + 0.3 * (1 - S.a) ? (Math.random() < 0.6 ? 0.25 + Math.random() * 0.6 : 1.5) : 2;
          }
        }
        S.state = "up";
      }
    } else if (S.state === "up") {
      S.y -= 34 * dt;
      if (S.held && S.slip < 1 && S.y < S.stop - (S.stop - RAIL - 8) * S.slip) { slip("It slipped! So close..."); return; }
      if (S.y <= RAIL + 8) {
        S.y = RAIL + 8;
        if (S.held) S.state = "home";
        else if (S.lostMsg) S.state = "home2";
        else { S.state = "lost"; end("The claw came up empty. Unlucky!"); }
      }
    } else if (S.state === "home") {
      S.x -= 40 * dt;
      if (S.held && S.slip >= 1 && S.slip < 2 && S.x < CHUTE + 30) slip("It fell off at the last moment!");
      if (S.x <= CHUTE) { S.x = CHUTE; S.state = "release"; S.t = 0; }
    } else if (S.state === "release") {
      S.t += dt;
      S.open = Math.min(1, S.t / 0.3);
      if (S.held && S.t > 0.2) { S.fall = { x: S.x, y: S.y + 9, c: S.held.c, v: 0 }; S.held = null; }
      if (S.fall) { S.fall.v += 300 * dt; S.fall.y += S.fall.v * dt; if (S.fall.y > FLOOR + 8) { S.fall = null; win(); } }
    } else if (S.state === "drop") {
      S.fall.v += 300 * dt; S.fall.y += S.fall.v * dt;
      const land = S.caps.filter((p) => Math.abs(p.x - S.fall.x) < 10).reduce((m, p) => Math.min(m, p.y - 11), FLOOR - 6);
      if (S.state === "drop" && S.prev === "up") S.y = Math.max(RAIL + 8, S.y - 34 * dt);
      if (S.fall.y >= land) { S.caps.push({ x: Math.round(S.fall.x), y: Math.round(land), c: S.fall.c }); S.fall = null; S.state = S.prev === "up" && S.y > RAIL + 8 ? "up" : "home2"; }
    } else if (S.state === "home2") {
      S.x -= 40 * dt;
      if (S.x <= CHUTE) { S.x = CHUTE; S.state = "lost"; S.open = 1; end(S.lostMsg); }
    }
  }

  function slip(text) {
    S.fall = { x: S.x, y: S.y + 9, c: S.held.c, v: 0 };
    S.held = null;
    S.lostMsg = text;
    S.prev = S.state;
    S.state = "drop";
    S.open = 0.6;
    msg(text);
  }

  function end(text) {
    S.open = 1;
    msg(`${text} ${used() < TRIES ? "Insert another coin?" : "No tries left today, come back tomorrow."}`);
    ui();
  }

  function win() {
    const id = prize(), it = itemOf(id);
    addPrize(id);
    S.state = "won"; S.item = id;
    const p = el.querySelector("[data-prize]");
    p.hidden = false;
    p.querySelector("b").textContent = it[1];
    itemArt(p.querySelector("canvas"), id, 5);
    p.querySelector("[data-folks]").dataset.folks = mine().length ? "index" : "make";
    p.querySelector("[data-folks]").textContent = mine().length ? "Dress up your folk" : "Make a folk to wear it";
    msg(`You won: <b>${it[1]}</b>! It is in your wardrobe now.`);
    dispatchEvent(new CustomEvent("gz:claw-win", { detail: id }));
    ui();
  }

  function frame(t) {
    raf = 0;
    if (!el || !el.isConnected) return;
    const dt = Math.min(0.05, (t - (last || t)) / 1000);
    last = t;
    step(dt);
    draw();
    if (!["idle", "won", "lost"].includes(S.state) || S.fall) raf = requestAnimationFrame(frame);
  }
  function go() { if (!raf) { last = 0; raf = requestAnimationFrame(frame); } }

  function open() {
    const D = window.gzDesk;
    if (!D) return;
    el = D.open({ id: "claw", title: "Claw Machine", icon: "claw", cls: "w-claw", body:
`<div class="cm"><canvas class="cm-cv" width="${W}" height="${H}" aria-label="Claw machine"></canvas><div class="cm-side">
<p class="cm-stat"><span>Tries today <b data-tries>3</b></span><span>Time <b data-time>-</b></span></p>
<div class="cm-pad"><button class="btn" type="button" data-move="-1" aria-label="Move left">&#9664;</button><button class="btn go" type="button" data-drop>Drop</button><button class="btn" type="button" data-move="1" aria-label="Move right">&#9654;</button></div>
<p class="cm-msg" data-msg role="status">Three tries a day. Win wearable prizes for your folk.</p>
<div class="cm-prize" data-prize hidden><canvas></canvas><b></b><button class="btn" type="button" data-folks="index">Dress up your folk</button></div>
<p><button class="btn go" type="button" data-coin>Insert coin</button></p></div></div>`,
      status: `<span>${ITEMS.length} prizes to collect</span><span data-own></span>` });
    el.querySelector("[data-own]").textContent = `You have ${wardrobe().length}`;
    if (!el.dataset.ready) {
      el.dataset.ready = "1";
      cv = el.querySelector(".cm-cv");
      c = cv.getContext("2d");
      if (!S || !["idle", "won", "lost"].includes(S.state)) S = fresh();
      const hold = (b, on) => { if (S.state === "aim") S.dir = on ? +b.dataset.move : 0; };
      el.querySelectorAll("[data-move]").forEach((b) => {
        b.addEventListener("pointerdown", (e) => { e.preventDefault(); hold(b, true); });
        ["pointerup", "pointerleave", "pointercancel"].forEach((ev) => b.addEventListener(ev, () => hold(b, false)));
      });
      el.addEventListener("click", (e) => {
        if (e.target.closest("[data-coin]")) coin();
        else if (e.target.closest("[data-drop]")) drop();
      });
    }
    ui();
    draw();
    if (S.state !== "idle" && S.state !== "won" && S.state !== "lost") go();
  }

  addEventListener("keydown", (e) => {
    if (!el || !el.isConnected || !S || S.state !== "aim" || el.classList.contains("is-min")) return;
    if (e.target.closest && e.target.closest("input, textarea")) return;
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") { S.dir = e.key === "ArrowLeft" ? -1 : 1; e.preventDefault(); e.stopPropagation(); }
    else if (e.key === " " || e.key === "ArrowDown" || e.key === "Enter") { drop(); e.preventDefault(); e.stopPropagation(); }
  }, true);
  addEventListener("keyup", (e) => { if (S && (e.key === "ArrowLeft" || e.key === "ArrowRight")) S.dir = 0; }, true);

  spot.addEventListener("click", (e) => { e.preventDefault(); open(); });
  document.addEventListener("click", (e) => { if (e.target.closest("[data-claw]")) { e.preventDefault(); open(); } });

  return { layout() { label(); }, open };
}
