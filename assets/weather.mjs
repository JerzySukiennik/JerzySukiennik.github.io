/* Gzowo Labs weather: click a cloud and it rains on the plot. The sky goes grey, dark clouds roll in, pixel rain falls with splashes
   on the grass and rings on the Narew, drops stick to the screen, and when it stops a rainbow comes out. More clicks, heavier rain. */

import { SPR } from "/assets/map.mjs";
import { snapshot, softGL } from "/assets/boot.mjs";
import { createGlass } from "/assets/glass.mjs";

const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
const R = (a, b) => a + Math.random() * (b - a);
const rgba = (r, g, b, a) => ((a << 24) | (b << 16) | (g << 8) | r) >>> 0;
const RAIN = Array.from({ length: 16 }, (_, i) => rgba(206, 222, 246, Math.round((i * 255) / 15)));
const FOAM = Array.from({ length: 16 }, (_, i) => rgba(234, 243, 255, Math.round((i * 255) / 15)));
const BOW = ["#ff7a7a", "#ffad57", "#ffe46e", "#82dc7c", "#62b4f4", "#a084f2"];
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const AMOUNT = [0, 1, 1.75, 2.7], DIM = [0, 0.82, 0.92, 1], VOL = [0, 0.32, 0.44, 0.56];
const SLANT = 0.24, DENSITY = 1.5;
const STORM = {
  land: [["cloud3", 0.1, 0.02, 1.55], ["cloud2", 0.36, -0.03, 1.45], ["cloud2", 0.6, 0.04, 1.9], ["cloud3", 0.9, 0, 1.6]],
  tall: [["cloud3", 0.2, 318, 1.05], ["cloud2", 0.55, 290, 0.95], ["cloud4", 0.85, 336, 1.5]],
};

let soft = false;
softGL().then((v) => { soft = v; });

export function createWeather({ world, mapCanvas }) {
  const mk = (tag, cls) => { const e = document.createElement(tag); e.className = cls; e.setAttribute("aria-hidden", "true"); return e; };
  const bow = mk("canvas", "wx-bow"), dim = mk("div", "wx-dim"), rain = mk("canvas", "wx-rain");
  world.append(bow, dim, rain);
  const ctx = rain.getContext("2d");
  let g = null, p = 2, cw = 1, ch = 1, img = null, pix = null, band = [0, 0];
  let state = "clear", level = 0, until = 0, amount = 0, t0 = 0, src = null, raf = 0, last = 0, glass = null, shotT = 0, endT = 0, storm = [];
  const drops = [], splashes = [];
  const dispatch = (on, quiet) => dispatchEvent(new CustomEvent("gz:rain", { detail: { on, level, quiet: !!quiet } }));

  function layout(geo) {
    g = geo;
    p = Math.max(2, Math.round(2 * g.s));
    cw = Math.ceil(g.W / p); ch = Math.ceil(g.H / p);
    rain.width = cw; rain.height = ch;
    rain.style.width = cw * p + "px"; rain.style.height = ch * p + "px";
    img = ctx.createImageData(cw, ch);
    pix = new Uint32Array(img.data.buffer);
    band = [0, 0];
    drops.length = 0; splashes.length = 0;
    dim.style.height = g.H + "px";
    dim.style.background = sky().css;
    drawBow();
    if (glass) glass.resize();
    shotT = 0;
    if (state === "rain") { tint(true); storm.forEach((im) => im.remove()); storm = []; rollIn(); }
  }

  function sky() {
    const hz = g.horizon, stops = [[0, "rgba(34,44,60,.72)"], [hz, "rgba(54,66,82,.52)"], [hz + 2, "rgba(28,38,52,.26)"], [g.H, "rgba(28,38,52,.2)"]];
    return { stops, css: `linear-gradient(180deg,${stops.map(([y, c]) => `${c} ${y}px`).join(",")})` };
  }

  function drawBow() {
    const tall = g.mode === "tall", cx = (tall ? 0.5 : 0.29) * g.W, rad = tall ? 0.42 * g.W : Math.min(0.37 * g.H, 0.3 * g.W);
    const b = Math.max(2, Math.round(rad / p / 24)), outer = rad / p, inner = outer - b * BOW.length;
    const w = Math.ceil(outer * 2) + 2, h = Math.ceil(outer) + 1;
    bow.width = w; bow.height = h;
    bow.style.left = cx - (w / 2) * p + "px"; bow.style.top = g.horizon - h * p + "px";
    bow.style.width = w * p + "px"; bow.style.height = h * p + "px";
    const c = bow.getContext("2d"), im = c.createImageData(w, h), d = new Uint32Array(im.data.buffer);
    const cols = BOW.map((x) => rgba(...[1, 3, 5].map((i) => parseInt(x.slice(i, i + 2), 16)), 215));
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const dx = x + 0.5 - w / 2, dy = h - y - 0.5, r = Math.hypot(dx, dy);
        if (r > outer || r < inner) continue;
        const fade = Math.min(1, dy / (outer * 0.5));
        if (BAYER[(y & 3) * 4 + (x & 3)] >= fade * 16) continue;
        d[y * w + x] = cols[Math.min(BOW.length - 1, Math.floor((outer - r) / b))];
      }
    }
    c.putImageData(im, 0, 0);
  }

  function tint(on, from) {
    world.querySelectorAll(".life-cloud").forEach((c) => {
      const r = c.getBoundingClientRect(), d = from === undefined ? 0 : Math.abs(r.left + r.width / 2 - from);
      c.style.transitionDelay = (on ? Math.min(1.4, d / 900) : Math.random() * 0.8).toFixed(2) + "s";
      c.classList.toggle("is-storm", on);
    });
  }

  function rollIn() {
    if (storm.length || !g) return;
    const tall = g.mode === "tall", f = g.W / 390;
    storm = STORM[g.mode].map(([name, fx, fy, k], i) => {
      const im = mk("img", "wx-cloud");
      im.src = `/assets/map/${name}.webp`;
      im.alt = "";
      const w = SPR[name][0] * g.s * k, h = SPR[name][1] * g.s * k;
      im.style.cssText = `left:${fx * g.W - w / 2}px;top:${tall ? fy * f : fy * g.H}px;width:${w}px;height:${h}px;--from:${(fx < 0.5 ? -1 : 1) * (0.35 * g.W + w)}px;--dx:${(R(-0.05, 0.05) * g.W).toFixed(0)}px;transition-delay:${i * 0.22}s`;
      world.append(im);
      void im.offsetWidth;
      im.classList.add("on");
      return im;
    });
  }

  function rollOut() {
    const list = storm;
    storm = [];
    list.forEach((im) => im.classList.remove("on"));
    setTimeout(() => list.forEach((im) => im.remove()), 3600);
  }

  let ac = null, sbuf = null, sgain = null, loading = null, next = 0, playing = false;
  const IN = Float32Array.from({ length: 32 }, (_, i) => Math.sin(((i / 31) * Math.PI) / 2)), OUT = IN.slice().reverse();

  function hear() {
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === "suspended") ac.resume();
    } catch (e) { ac = null; }
    if (ac && !loading) {
      loading = fetch("/assets/sfx/rain.mp3").then((r) => r.arrayBuffer()).then((b) => ac.decodeAudioData(b))
        .then((b) => { sbuf = b; if (state === "rain") sound(level); }).catch(() => {});
    }
  }

  function queue() {
    if (!playing || !ac) return;
    const d = sbuf.duration, xf = Math.min(1.6, d / 4);
    while (next < ac.currentTime + 4) {
      const s = ac.createBufferSource(), fade = ac.createGain();
      s.buffer = sbuf;
      s.connect(fade).connect(sgain);
      fade.gain.setValueCurveAtTime(IN, next, xf);
      fade.gain.setValueCurveAtTime(OUT, next + d - xf, xf);
      s.start(next);
      s.stop(next + d);
      next += d - xf;
    }
    setTimeout(queue, 1000);
  }

  function sound(lv) {
    if (!ac || !sbuf) return;
    if (!sgain) { sgain = ac.createGain(); sgain.gain.value = 0; sgain.connect(ac.destination); }
    const now = ac.currentTime;
    sgain.gain.cancelScheduledValues(now);
    sgain.gain.setValueAtTime(sgain.gain.value, now);
    sgain.gain.linearRampToValueAtTime(VOL[lv], now + (lv ? 2.2 : 3.5));
    if (lv && !playing) { playing = true; next = Math.max(next, now + 0.05); queue(); }
    if (!lv) setTimeout(() => { if (state !== "rain") playing = false; }, 3600);
  }

  document.addEventListener("visibilitychange", () => {
    if (!ac) return;
    if (document.hidden) ac.suspend();
    else if (playing) ac.resume();
  });

  function start(c) {
    const now = performance.now();
    state = "rain"; level = 1; t0 = now; until = now + R(30000, 38000); src = c;
    clearTimeout(endT);
    bow.classList.remove("on");
    const r = c.getBoundingClientRect();
    tint(true, r.left + r.width / 2);
    dim.style.opacity = DIM[level];
    setTimeout(() => { if (state === "rain") rollIn(); }, 500);
    if (glass === null) glass = (!soft && createGlass(world)) || false;
    shotT = 0;
    setTimeout(() => { if (state === "rain" && glass) glass.rain(level); }, 1100);
    sound(level);
    dispatch(true);
    loop();
  }

  function heavier() {
    level = Math.min(3, level + 1);
    until = Math.min(performance.now() + 60000, until + 12000);
    dim.style.opacity = DIM[level];
    if (glass) glass.rain(level);
    sound(level);
    dispatch(true);
  }

  function end() {
    state = "ending";
    if (glass) glass.rain(0);
    sound(0);
    endT = setTimeout(() => {
      if (state !== "ending") return;
      dim.style.opacity = 0;
      tint(false);
      rollOut();
      bow.classList.remove("on");
      void bow.offsetWidth;
      bow.classList.add("on");
      dispatch(false);
      endT = setTimeout(() => { if (state === "ending") state = "clear"; }, 14000);
    }, 2400);
  }

  function stop() {
    if (state === "clear") return;
    state = "clear"; amount = 0;
    clearTimeout(endT);
    drops.length = 0; splashes.length = 0;
    dim.style.opacity = 0;
    tint(false);
    rollOut();
    bow.classList.remove("on");
    if (glass) glass.clear();
    sound(0);
    if (cw) ctx.clearRect(0, 0, cw, ch);
    band = [0, 0];
    dispatch(false, true);
    level = 0;
  }

  function poke(c) {
    if (c.animate) c.animate([{ scale: "1" }, { scale: "1.16 0.84" }, { scale: "0.93 1.08" }, { scale: "1.03 0.98" }, { scale: "1" }], { duration: 650, easing: "ease-out" });
    hear();
    if (state === "rain") heavier();
    else start(c);
  }

  function shoot(wr) {
    const k = 0.5, c = snapshot(world, mapCanvas, { x: wr.left, y: wr.top, w: wr.width, h: wr.height }, k);
    const x = c.getContext("2d");
    x.setTransform(k, 0, 0, k, 0, 0);
    world.querySelectorAll(".win.in-world").forEach((w) => {
      const r = w.getBoundingClientRect();
      x.fillStyle = "#c0c0c0"; x.fillRect(r.left - wr.left, r.top - wr.top, r.width, r.height);
      x.fillStyle = "#000080"; x.fillRect(r.left - wr.left + 3, r.top - wr.top + 3, r.width - 6, 30);
    });
    const gr = x.createLinearGradient(0, 0, 0, g.H);
    sky().stops.forEach(([y, col]) => gr.addColorStop(Math.min(1, y / g.H), col));
    x.globalAlpha = DIM[Math.max(1, level)] * 0.55;
    x.fillStyle = gr;
    x.fillRect(0, 0, wr.width, wr.height);
    glass.scene(c, wr.width, wr.height);
  }

  function step(dt, t, a, b, wr) {
    const tall = g.mode === "tall", hz = g.horizon / p, river = g.river[0] / p;
    let cl = 0, cr = cw, from = -1, shaft = null;
    if (src && state === "rain" && t - t0 < 4600) {
      const r = src.getBoundingClientRect();
      if (r.width) {
        shaft = [(r.left - wr.left + r.width * 0.16) / p, (r.right - wr.left - r.width * 0.16) / p];
        from = (r.top - wr.top + r.height * 0.7) / p;
        const e = Math.max(0, Math.min(1, (t - t0 - 1500) / 3000)), ee = e * e * (3 - 2 * e);
        cl = shaft[0] * (1 - ee); cr = shaft[1] + (cw - shaft[1]) * ee;
      }
    }
    const want = Math.round((amount * DENSITY * Math.max(0, cr - cl) * (b - a)) / 1000);
    for (let n = 0; drops.length < want && n < 60; n++) {
      const x = R(cl, cr), near = Math.random(), inCloud = shaft && x >= shaft[0] && x <= shaft[1];
      const gy = tall ? Math.max(hz, R(a, b)) : hz + (ch - hz) * near;
      const len = Math.round(3 + near * 6);
      const y = inCloud ? from : drops.length < want * 0.5 && !src ? R(a - len, gy) : Math.max(0, a) - len - R(0, 24);
      if (y >= gy) continue;
      drops.push({ x, y, gy, len, near, v: (170 + 330 * near) * R(0.9, 1.1), al: Math.round((0.32 + near * 0.58) * 15) });
    }
    if (src && t - t0 >= 4600) src = null;
    for (let i = drops.length - 1; i >= 0; i--) {
      const d = drops[i];
      d.y += d.v * dt; d.x += d.v * SLANT * dt;
      if (d.y < d.gy && d.x < cw + 10) continue;
      if (d.y >= d.gy && d.gy >= a && d.gy < b && d.near > 0.14) splashes.push({ x: d.x, y: d.gy, t: 0, ring: d.gy >= river - 1, k: 0.55 + d.near * 0.7 });
      drops[i] = drops[drops.length - 1];
      drops.pop();
    }
    for (let i = splashes.length - 1; i >= 0; i--) {
      const s = splashes[i];
      s.t += dt;
      if (s.t > (s.ring ? 0.5 : 0.24)) { splashes[i] = splashes[splashes.length - 1]; splashes.pop(); }
    }
  }

  function paint(a, b) {
    if (band[1] > band[0] && (band[0] !== a || band[1] !== b)) ctx.clearRect(0, band[0], cw, band[1] - band[0]);
    band = [a, b];
    pix.fill(0, a * cw, b * cw);
    const put = (x, y, c) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && x < cw && y >= a && y < b) pix[y * cw + x] = c; };
    for (const d of drops) {
      const y0 = Math.round(Math.min(d.y, d.gy)), x0 = d.x;
      for (let i = 0; i < d.len; i++) put(x0 - i * SLANT, y0 - i, RAIN[Math.max(1, d.al - ((i * 9) / d.len) | 0)]);
    }
    for (const s of splashes) {
      if (s.ring) {
        const u = s.t / 0.5, rx = (1 + u * 4.5) * s.k, ry = rx * 0.38, c = FOAM[Math.round((1 - u) * 11)], n = Math.max(8, Math.round(rx * 5));
        for (let j = 0; j < n; j++) { const an = (j / n) * Math.PI * 2; put(s.x + Math.cos(an) * rx, s.y + Math.sin(an) * ry, c); }
      } else {
        const u = s.t, h = (34 * u - 120 * u * u) * s.k, dx = (1 + 11 * u) * s.k, c = FOAM[Math.max(1, Math.round((1 - u / 0.24) * 12))];
        put(s.x - dx, s.y - h, c); put(s.x + dx, s.y - h, c);
        if (u < 0.06) put(s.x, s.y, FOAM[13]);
      }
    }
    ctx.putImageData(img, 0, 0, 0, a, cw, b - a);
  }

  function loop() {
    if (raf) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }

  function frame(t) {
    raf = 0;
    if (!g) return;
    const dt = Math.min(0.05, Math.max(0, (t - last) / 1000));
    last = t;
    if (state === "rain" && t > until) end();
    const target = state === "rain" ? AMOUNT[level] : 0;
    amount += (target - amount) * Math.min(1, dt * (target > amount ? 1.2 : 0.8));
    if (!target && amount < 0.02) amount = 0;
    const wr = world.getBoundingClientRect();
    const a = g.mode === "tall" ? Math.max(0, Math.floor(-wr.top / p) - 2) : 0;
    const b = g.mode === "tall" ? Math.min(ch, Math.ceil((innerHeight - wr.top) / p) + 2) : ch;
    if (!document.hidden) {
      step(dt, t, a, b, wr);
      paint(a, b);
    }
    let wet = false;
    if (glass) {
      if (state !== "clear" && t > shotT) { shotT = t + 4000; shoot(wr); }
      wet = glass.frame(dt, -wr.left, -wr.top);
    }
    if (amount > 0 || drops.length || splashes.length || wet || state === "rain") raf = requestAnimationFrame(frame);
    else { ctx.clearRect(0, 0, cw, ch); band = [0, 0]; }
  }

  if (!calm) {
    world.classList.add("wx-on");
    world.addEventListener("click", (e) => {
      const c = e.target.closest(".life-cloud, .wx-cloud");
      if (c && g && !document.documentElement.classList.contains("lock")) poke(c);
    });
  }

  return { layout, stop };
}
