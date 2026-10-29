/* Gzowo Labs map life: drifting clouds, birds, glinting water, a gull, butterflies and jumping fish, blinking lab lights, the buzzing arcade sign,
   a busy 3D printer, a rocket that test-fires now and then, and two kayaks at the dock that take Jurek out on the Narew. */

import { drawKayak } from "/assets/map.mjs";

const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
const R = (a, b) => a + Math.random() * (b - a);

function pix(frames, pal) {
  const w = frames[0][0].length, h = frames[0].length;
  let body = "";
  frames.forEach((rows, f) => rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const col = pal[row[x]];
      if (!col) continue;
      let run = 1;
      while (x + run < row.length && row[x + run] === row[x]) run++;
      body += `<rect x="${x + f * w}" y="${y}" width="${run}" height="1" fill="${col}"/>`;
      x += run - 1;
    }
  }));
  return `url('data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${w * frames.length}" height="${h}" viewBox="0 0 ${w * frames.length} ${h}" preserveAspectRatio="none" shape-rendering="crispEdges">${body}</svg>`)}')`;
}

const BIRD = pix([
  ["X.........X", ".X.......X.", "..XX...XX..", "....XXX....", ".....X.....", "..........."],
  ["...........", "...........", "....XXX....", "..XX.X.XX..", ".X.......X.", "X.........X"],
], { X: "#22303b" });
const FLY = (wing, edge) => pix([
  ["AE...EA", "AAA.AAA", ".AABAA.", "..ABA..", ".AA.AA.", "......."],
  ["...E...", "..AAA..", "...B...", "..ABA..", "...A...", "......."],
], { A: wing, E: edge, B: "#2b2b2b" });
const FISH = pix([["..LLLL...", ".XXXXXE.T", "XXXXXXXTT", ".DDDDDD.T", "..DDDD..."]], { L: "#d9eefc", X: "#9ec7e6", D: "#6f9fc4", E: "#1d2a35", T: "#7fb0d6" });
const PUFF = pix([["...WWWW...", ".WWWWWWWW.", "WWWWWWWWWW", "WWWWWWWWWW", "WWWWWWWWGG", ".WWWWWGGG.", "..GGGGGG..", ".........."]], { W: "#f6f8fa", G: "#c7cdd4" });
const FLAME = pix([
  [".WWWWWWW.", ".WYYYYYW.", "..YYWYY..", "..YYYYY..", "..YOYOY..", "...OYO...", "...OOO...", "...OOO...", "....O....", "....O....", ".........", ".........", ".........", "........."],
  ["WWWWWWWWW", ".WYYWYYW.", ".WYYYYYW.", "..YYYYY..", "..YOYOY..", "..OOYOO..", "...OOO...", "...OOO...", "...OOO...", "....O....", "....O....", "....O....", ".........", "........."],
  [".WWWWWWW.", "..WYYYW..", "..YYWYY..", "..YYYYY..", "...YOY...", "...OOO...", "...OOO...", "....O....", "....O....", ".........", ".........", ".........", ".........", "........."],
], { W: "#fffbe6", Y: "#ffd84a", O: "#ff9a1f" });

const LEDS = [[0.145, 0.783, 0.036, 0.033], [0.298, 0.783, 0.029, 0.029], [0.149, 0.859, 0.032, 0.029], [0.222, 0.859, 0.032, 0.029], [0.294, 0.859, 0.037, 0.029], [0.306, 0.935, 0.013, 0.014]];

export function createLife(world) {
  const root = document.createElement("div");
  root.className = "life";
  root.setAttribute("aria-hidden", "true");
  world.append(root);
  const spots = world.querySelector(".spots");
  let g = null, paused = false, fireT = 0, fishT = 0;

  const kayaks = [0, 1].map((n) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "spot spot-kayak";
    b.dataset.kayak = String(n);
    b.setAttribute("aria-label", (n ? "Teal" : "Orange") + " kayak, take Jurek out on the river");
    b.innerHTML = `<span class="bob lv"><canvas class="spr"></canvas></span>` + (n ? "" : `<span class="spot-l"><b>Kayaks</b><em>paddle the Narew</em></span>`);
    drawKayak(b.querySelector("canvas"), n, true);
    b.addEventListener("click", (e) => {
      e.preventDefault();
      b.classList.remove("is-poked");
      void b.offsetWidth;
      b.classList.add("is-poked");
      dispatchEvent(new CustomEvent("gz:kayak", { detail: n }));
    });
    spots.append(b);
    return b;
  });

  function fx(place, html) {
    const s = spots.querySelector(`.spot[data-place="${place}"]`);
    if (!s || s.querySelector(".fx")) return;
    s.insertAdjacentHTML("beforeend", html);
  }
  fx("rockets", `<span class="fx fx-fire lv" style="--flame:${FLAME}"><i class="fx-flame"></i>` +
    [-1, 1, -1, 1, -1, 1, -1, 1, -1, 1].map((d, i) => `<i class="fx-puff" style="--puff:${PUFF};--dx:calc(${d * (7 + i * 3.5)}px * var(--fk));--dl:${(i * 0.1).toFixed(2)}s"></i>`).join("") +
    `</span><span class="fx fx-steam lv">` + [0, 1].map((i) => `<i class="fx-puff" style="--puff:${PUFF};--dl:${i * 4.6}s"></i>`).join("") + `</span>`);
  fx("software", LEDS.map(([x, y, w, h], i) => `<i class="fx fx-led lv" style="left:${x * 100}%;top:${y * 100}%;width:${w * 100}%;height:${h * 100}%;--d:${R(0.9, 3.2).toFixed(2)}s;--dl:${(-R(0, 3)).toFixed(2)}s"></i>`).join(""));
  fx("games", `<i class="fx fx-neon lv"></i>`);
  fx("printing", `<i class="fx fx-print lv"></i><i class="fx fx-head lv"></i>`);

  const make = (cls, css, html = "") => {
    const e = document.createElement("i");
    e.className = cls + " lv";
    e.style.cssText = css;
    if (html) e.innerHTML = html;
    root.append(e);
    return e;
  };

  function layout(geo) {
    g = geo;
    root.textContent = "";
    const k = Math.max(1.6, 2.2 * g.s);
    root.style.setProperty("--k", k.toFixed(2));
    g.clouds.forEach((c, i) => {
      const travel = g.W + c.w, T = travel / ((5 + (i % 3) * 2.5) * g.s);
      const im = new Image();
      im.src = `/assets/map/${c.sprite}.webp`;
      im.alt = "";
      im.className = "life-cloud lv";
      im.style.cssText = `left:${-c.w}px;top:${c.y}px;width:${c.w}px;height:${c.h}px;transform:translateX(${c.x + c.w}px);--b:${travel}px;animation-duration:${T.toFixed(1)}s;animation-delay:${(-T * ((c.x + c.w) / travel)).toFixed(1)}s`;
      root.append(im);
    });
    const flock = make("life-birds", `top:${g.horizon * (g.mode === "tall" ? 0.8 : 0.3)}px;--a:${-140 * g.s}px;--b:${g.W + 60}px;--bird:${BIRD}`);
    [[0, 0], [18, 10], [36, -4], [-16, 14], [54, 12]].forEach(([x, y], i) => {
      const b = document.createElement("i");
      b.className = "life-bird";
      b.style.cssText = `left:${x * g.s}px;top:${y * g.s}px;animation-delay:${(-i * 0.11).toFixed(2)}s,${(-i * 0.37).toFixed(2)}s`;
      flock.append(b);
    });
    const [top, bot] = g.river, rh = bot - top;
    for (let i = 0; i < Math.round(g.W / 90); i++) {
      make("life-glint", `left:${R(0, g.W).toFixed(0)}px;top:${(top + rh * R(0.25, 0.85)).toFixed(0)}px;width:${(R(5, 12) * k).toFixed(0)}px;z-index:${Math.round(top)};--d:${R(2.6, 5).toFixed(2)}s;--dl:${(-R(0, 5)).toFixed(2)}s`);
    }
    const gl = g.gull;
    const gull = make("life-gull", `left:${gl.x}px;top:${gl.y}px;width:${gl.w}px;height:${gl.h}px;z-index:${Math.round(gl.y + gl.h)}`);
    gull.style.background = "url(/assets/map/gull.webp) center/100% 100%";
    const fl = g.mode === "tall" ? [[250, 1075], [150, 2075]].map(([x, y]) => [x * g.W / 390, y * g.W / 390]) : [[0.205 * g.W, 0.875 * g.H], [0.49 * g.W, 0.905 * g.H]];
    fl.forEach(([x, y], i) => make("life-fly", `left:${x}px;top:${y}px;z-index:${Math.round(y)};--d:${11 + i * 4}s;--dl:${-i * 3}s;--fly:${i ? FLY("#ffd84a", "#c98a12") : FLY("#ffffff", "#9aa6b2")}`, "<i></i>"));
    g.kayaks.forEach((kb, n) => {
      const b = kayaks[n];
      if (b.classList.contains("is-afloat")) return;
      b.style.left = kb.x + "px"; b.style.top = kb.y + "px";
      b.style.width = kb.w + "px"; b.style.height = kb.h + "px";
      b.style.zIndex = Math.round(kb.y + kb.h);
      b.style.setProperty("--s", kb.k.toFixed(3));
    });
  }

  function visible(el) {
    const r = el.getBoundingClientRect();
    return r.bottom > 0 && r.top < innerHeight;
  }

  function fish() {
    fishT = setTimeout(fish, R(7000, 16000));
    if (paused || document.hidden || !g) return;
    const [top, bot] = g.river, dock = g.river_props[0];
    let x = 0;
    for (let i = 0; i < 6; i++) {
      x = R(0.05, 0.9) * g.W;
      const clear = (x < dock.x - 30 || x > dock.x + dock.w + 30) && g.kayaks.every((kb) => x < kb.x - 30 || x > kb.x + kb.w + 30) && (x < g.gull.x - 30 || x > g.gull.x + g.gull.w + 30);
      if (clear) break;
    }
    const y = top + (bot - top) * 0.55;
    if (g.mode === "tall" && (y - scrollY > innerHeight || y - scrollY < 0)) return;
    const k = parseFloat(root.style.getPropertyValue("--k")) || 2;
    const z = `z-index:${Math.round(top) + 1}`;
    const a = make("life-fish", `left:${x}px;top:${y - 3 * k}px;--fish:${FISH};${z}`);
    const s1 = make("life-splash", `left:${x - 4 * k}px;top:${y - 2 * k}px;width:${14 * k}px;height:${5 * k}px;${z}`);
    const s2 = make("life-splash", `left:${x + 18 * k}px;top:${y - 2 * k}px;width:${14 * k}px;height:${5 * k}px;animation-delay:.75s;opacity:0;${z}`);
    setTimeout(() => { a.remove(); s1.remove(); s2.remove(); }, 1700);
  }

  function fire() {
    fireT = setTimeout(fire, R(38000, 75000));
    const s = spots.querySelector('.spot[data-place="rockets"]');
    if (paused || document.hidden || !s || !visible(s)) return;
    s.classList.add("is-firing");
    dispatchEvent(new CustomEvent("gz:fire"));
    setTimeout(() => s.classList.remove("is-firing"), 3600);
  }

  if (!calm) {
    fishT = setTimeout(fish, 4000);
    fireT = setTimeout(fire, R(12000, 22000));
  }

  return {
    layout,
    kayak: (n) => kayaks[n],
    pause(on) { paused = on; },
    stop() { clearTimeout(fishT); clearTimeout(fireT); },
  };
}
