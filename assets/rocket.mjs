/* Gzowo Labs launch: a little control desk beside the pad. Press START, count down from three, and the GSP rocket really leaves the
   tower, climbs out of sight on a trail of smoke and comes back down under a parachute onto the pad. Every launch on the site is counted. */

import { PUFF, FLAME } from "/assets/life.mjs";

const DB = "https://raft-e8d47-default-rtdb.firebaseio.com";
const LOCAL = ["localhost", "127.0.0.1", "0.0.0.0", "[::1]"];
const PLOT = LOCAL.includes(location.hostname) || location.protocol === "file:" ? "plotDev" : "plot";
const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const R = (a, b) => a + Math.random() * (b - a);
const FONT = {
  0: "111101101101111", 1: "010110010010111", 2: "111001111100111", 3: "111001111001111", 4: "101101111001001", 5: "111100111001111",
  6: "111100111101111", 7: "111001001001001", 8: "111101111101111", 9: "111101111001111", G: "111100101101111", O: "111101101101111",
  "!": "010010010000010", "-": "000000111000000", " ": "000000000000000",
};

function drawDesk(cv, text, pressed) {
  const k = 4;
  cv.width = 24 * k; cv.height = 26 * k;
  const c = cv.getContext("2d");
  const px = (x, y, col, w = 1, h = 1) => { c.fillStyle = col; c.fillRect(x * k, y * k, w * k, h * k); };
  px(4, 20, "#3a3f47", 2, 6); px(18, 20, "#3a3f47", 2, 6); px(3, 25, "#22262d", 4, 1); px(17, 25, "#22262d", 4, 1);
  px(2, 11, "#22262d", 20, 10); px(3, 12, "#7d8792", 18, 8); px(3, 12, "#9aa4af", 18, 1); px(3, 19, "#5d6670", 18, 1);
  px(1, 1, "#22262d", 22, 11); px(2, 2, "#b3bcc6", 20, 9); px(2, 2, "#d3dbe3", 20, 1);
  px(3, 3, "#06170a", 18, 7);
  [...text.padStart(4).slice(-4)].forEach((ch, i) => {
    const f = FONT[ch] || FONT[" "];
    for (let n = 0; n < 15; n++) if (f[n] === "1") px(4 + i * 4 + (n % 3), 4 + Math.floor(n / 3), "#49f06a");
  });
  for (let y = 12; y < 20; y++) for (let x = 8; x < 17; x++) {
    const d = Math.hypot(x + 0.5 - 12, y + 0.5 - 15.5);
    if (d <= 3.3) px(x, y, d > 2.6 ? "#14361d" : pressed ? "#1f8a33" : "#38d158");
  }
  if (!pressed) px(11, 14, "#b8f7c5");
  px(4, 14, "#ffd84a", 2, 2); px(18, 14, "#ffd84a", 2, 2);
}

function drawChute(cv) {
  const k = 4, W = 40, H = 24;
  cv.width = W * k; cv.height = H * k;
  const c = cv.getContext("2d");
  const px = (x, y, col) => { c.fillStyle = col; c.fillRect(x * k, y * k, k, k); };
  for (let y = 0; y < 12; y++) for (let x = 0; x < W; x++) {
    const dx = (x + 0.5 - W / 2) / (W / 2), dy = (12 - y - 0.5) / 12, r = Math.hypot(dx, dy);
    if (r > 1 || y > 10) continue;
    const gore = Math.floor(((Math.atan2(dy, dx) / Math.PI) * 6) % 6);
    px(x, y, r > 0.9 || y === 10 ? "#1b1f27" : gore % 2 ? "#1d3f8f" : "#ffd84a");
  }
  for (let i = 0; i <= 4; i++) {
    const x0 = 2 + i * 9, x1 = W / 2 - 0.5;
    for (let y = 11; y < H; y++) px(Math.round(x0 + ((x1 - x0) * (y - 11)) / (H - 11)), y, "#3a3f47");
  }
}

export function createLaunch(world) {
  const spots = world.querySelector(".spots");
  const btn = document.createElement("button"), cv = document.createElement("canvas");
  btn.type = "button";
  btn.className = "spot spot-console";
  btn.setAttribute("aria-label", "Launch control, press START to launch the rocket");
  cv.className = "spr";
  btn.append(cv);
  btn.insertAdjacentHTML("beforeend", `<span class="spot-l"><b>Launch control</b><em>press START</em></span>`);
  spots.append(btn);
  const label = btn.querySelector(".spot-l em");
  let g = null, busy = false, total = null, screen = "----";
  const paint = (pressed) => drawDesk(cv, screen, pressed);
  const idle = () => { screen = total === null ? "----" : String(Math.min(9999, total)); label.textContent = total === null ? "press START" : `${total} ${total === 1 ? "launch" : "launches"}, press START`; paint(false); };
  idle();
  fetch(`${DB}/${PLOT}/launches.json`).then((r) => r.json()).then((n) => { total = typeof n === "number" ? n : 0; if (!busy) idle(); }).catch(() => {});

  const art = (src) => { const im = new Image(); im.src = src; return im.decode().then(() => im, () => im); };

  function puff(x, y, fk, z, opts = {}) {
    const p = document.createElement("i");
    p.className = "rk-puff";
    p.style.cssText = `left:${x}px;top:${y}px;z-index:${z};--fk:${fk};--puff:${PUFF};--dx:${opts.dx || 0}px;--dy:${opts.dy || 0}px;--sc:${opts.sc || 2.4};--d:${opts.d || 1.6}s`;
    world.append(p);
    setTimeout(() => p.remove(), (opts.d || 1.6) * 1000 + 50);
  }

  async function launch() {
    busy = true;
    const pad = spots.querySelector('.spot[data-place="rockets"]'), img = pad && pad.querySelector("img.spr");
    if (!pad || !img || !g) { busy = false; return; }
    const [, empty] = await Promise.all([art("/assets/map/rocket.webp"), art("/assets/map/launchpad-empty.webp")]);
    for (const n of ["3", "2", "1"]) {
      screen = n; paint(true);
      dispatchEvent(new CustomEvent("gz:countdown", { detail: +n }));
      await wait(850);
    }
    screen = "GO!"; paint(false);
    const b = g.places.rockets, kk = b.w / 174, fk = 4 * b.k, z = Math.round(b.y + b.h) + 1;
    const el = document.createElement("div");
    el.className = "rk";
    el.style.cssText = `left:${b.x + 30 * kk}px;top:${b.y + 15 * kk}px;width:${91 * kk}px;height:${382 * kk}px;z-index:${z};--fk:${fk};--flame:${FLAME}`;
    el.innerHTML = `<img src="/assets/map/rocket.webp" alt=""><i class="rk-flame"></i><canvas class="rk-chute"></canvas>`;
    drawChute(el.querySelector("canvas"));
    world.append(el);
    const keep = img.src;
    pad.classList.add("is-flying");
    img.src = empty.src;
    el.classList.add("is-lit");
    dispatchEvent(new CustomEvent("gz:launch"));
    fetch(`${DB}/${PLOT}.json`, { method: "PATCH", body: JSON.stringify({ launches: { ".sv": { increment: 1 } } }) })
      .then((r) => r.json()).then((o) => { if (o && typeof o.launches === "number") total = o.launches; }).catch(() => {});
    const baseX = b.x + 30 * kk + (91 * kk) / 2, baseY = b.y + 397 * kk, h = 382 * kk;
    for (let i = 0; i < 14; i++) puff(baseX + R(-10, 10) * kk, baseY + R(-6, 4) * kk, fk, z + 1, { dx: (i % 2 ? 1 : -1) * R(40, 120) * kk, dy: R(-30, 0) * kk, sc: R(2, 3.4), d: R(1.4, 2.4) });
    const A = 420 * b.k + 120, t0 = performance.now();
    let lastPuff = 0, y = 0;
    await new Promise((done) => {
      const step = (now) => {
        const t = (now - t0) / 1000;
        if (t < 0.9) el.style.transform = `translate(${R(-1, 1).toFixed(1)}px,${R(-1, 1).toFixed(1)}px)`;
        else {
          y = -0.5 * A * (t - 0.9) ** 2;
          el.style.transform = `translateY(${y.toFixed(1)}px)`;
          el.style.zIndex = 4200;
          if (now - lastPuff > 55) { lastPuff = now; puff(baseX + R(-3, 3) * kk, baseY + y + 8 * kk, fk, 4199, { dx: R(-20, 20) * kk, dy: R(10, 40) * kk, sc: R(1.8, 2.8), d: R(1.2, 1.9) }); }
        }
        if (baseY + y < -40) { done(); return; }
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
    el.classList.remove("is-lit");
    el.style.visibility = "hidden";
    screen = "----"; paint(false);
    await wait(2400);
    const top = -(baseY + 60), dur = 5600, t1 = performance.now();
    el.style.visibility = "";
    el.classList.add("is-chute");
    await new Promise((done) => {
      const step = (now) => {
        const u = Math.min(1, (now - t1) / dur), e = 1 - (1 - u) * (1 - u);
        el.style.transform = `translate(${(Math.sin(u * 7) * 10 * kk * (1 - u)).toFixed(1)}px,${(top * (1 - e)).toFixed(1)}px) rotate(${(Math.sin(u * 7 + 1) * 3 * (1 - u)).toFixed(2)}deg)`;
        el.style.zIndex = u > 0.85 ? z : 4200;
        if (u < 1) requestAnimationFrame(step); else done();
      };
      requestAnimationFrame(step);
    });
    el.style.transform = "";
    for (let i = 0; i < 8; i++) puff(baseX + R(-12, 12) * kk, baseY, fk, z + 1, { dx: (i % 2 ? 1 : -1) * R(20, 60) * kk, dy: R(-10, 0) * kk, sc: R(1.4, 2.2), d: 1.2 });
    el.classList.add("is-down");
    dispatchEvent(new CustomEvent("gz:landed"));
    await wait(1100);
    img.src = keep;
    await wait(60);
    el.remove();
    pad.classList.remove("is-flying");
    busy = false;
    idle();
  }

  btn.addEventListener("click", (e) => {
    e.preventDefault();
    if (busy || !g) { btn.animate([{ translate: "0 0" }, { translate: "2px 0" }, { translate: "-2px 0" }, { translate: "0 0" }], { duration: 220 }); return; }
    if (calm) {
      fetch(`${DB}/${PLOT}.json`, { method: "PATCH", body: JSON.stringify({ launches: { ".sv": { increment: 1 } } }) })
        .then((r) => r.json()).then((o) => { if (o && typeof o.launches === "number") { total = o.launches; idle(); } }).catch(() => {});
      return;
    }
    launch();
  });

  return {
    layout(geo) {
      g = geo;
      const b = geo.console;
      Object.assign(btn.style, { left: b.x + "px", top: b.y + "px", width: b.w + "px", height: b.h + "px", zIndex: Math.round(b.y + b.h) });
      btn.style.setProperty("--s", (b.w / 40).toFixed(3));
    },
  };
}
