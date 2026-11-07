/* Gzowo Labs weather: the real weather in Gzowo, read by the bank from Open-Meteo every 15 minutes, and rain on demand. When it really
   rains or snows in Gzowo it does on the map too, fog drifts over the plot in real fog and a thunderstorm flashes. Click a cloud and it
   rains (in winter it snows): the sky goes grey, dark clouds roll in, pixel rain falls with splashes on the grass and rings on the Narew,
   drops stick to the screen, and when it stops a rainbow comes out. More clicks, heavier rain. The tray shows the weather in Gzowo now. */

import { SPR } from "/assets/map.mjs";
import { snapshot, softGL } from "/assets/boot.mjs";
import { createGlass } from "/assets/glass.mjs";
import { FROZEN } from "/assets/season.mjs";

const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
const R = (a, b) => a + Math.random() * (b - a);
const rgba = (r, g, b, a) => ((a << 24) | (b << 16) | (g << 8) | r) >>> 0;
const RAIN = Array.from({ length: 16 }, (_, i) => rgba(206, 222, 246, Math.round((i * 255) / 15)));
const FOAM = Array.from({ length: 16 }, (_, i) => rgba(234, 243, 255, Math.round((i * 255) / 15)));
const FLAKE = Array.from({ length: 16 }, (_, i) => rgba(255, 255, 255, Math.round((i * 255) / 15)));
const WXI = {
  sun: '<rect x="6" y="1" width="4" height="2" fill="#f2b200"/><rect x="6" y="13" width="4" height="2" fill="#f2b200"/><rect x="1" y="6" width="2" height="4" fill="#f2b200"/><rect x="13" y="6" width="2" height="4" fill="#f2b200"/><rect x="4" y="4" width="8" height="8" fill="#ffd84a"/><rect x="5" y="4" width="6" height="1" fill="#fff3b0"/>',
  moon: '<rect x="6" y="2" width="5" height="12" fill="#f3e6bd"/><rect x="4" y="4" width="2" height="8" fill="#f3e6bd"/><rect x="9" y="4" width="4" height="7" fill="#c0c0c0"/>',
  cloud: '<rect x="3" y="6" width="10" height="6" fill="#ffffff"/><rect x="5" y="4" width="5" height="2" fill="#ffffff"/><rect x="2" y="8" width="1" height="3" fill="#ffffff"/><rect x="3" y="11" width="10" height="1" fill="#8a96a8"/>',
  rain: '<rect x="3" y="3" width="10" height="5" fill="#9aa6b8"/><rect x="5" y="2" width="5" height="1" fill="#9aa6b8"/><rect x="4" y="10" width="1" height="3" fill="#2f74d6"/><rect x="8" y="9" width="1" height="3" fill="#2f74d6"/><rect x="11" y="10" width="1" height="3" fill="#2f74d6"/>',
  snow: '<rect x="3" y="3" width="10" height="5" fill="#9aa6b8"/><rect x="5" y="2" width="5" height="1" fill="#9aa6b8"/><rect x="4" y="10" width="2" height="2" fill="#ffffff"/><rect x="8" y="12" width="2" height="2" fill="#ffffff"/><rect x="11" y="9" width="2" height="2" fill="#ffffff"/>',
  fog: '<rect x="2" y="4" width="12" height="2" fill="#c8ccd2"/><rect x="1" y="8" width="12" height="2" fill="#dde0e4"/><rect x="3" y="12" width="12" height="2" fill="#c8ccd2"/>',
  storm: '<rect x="3" y="2" width="10" height="5" fill="#6f7a8c"/><rect x="7" y="7" width="3" height="2" fill="#ffd84a"/><rect x="6" y="9" width="3" height="2" fill="#ffd84a"/><rect x="7" y="11" width="2" height="3" fill="#ffd84a"/>',
};
const WX_WORDS = { 0: "clear", 1: "mostly clear", 2: "partly cloudy", 3: "overcast", 45: "fog", 48: "frosty fog", 51: "light drizzle", 53: "drizzle", 55: "heavy drizzle",
  56: "freezing drizzle", 57: "freezing drizzle", 61: "light rain", 63: "rain", 65: "heavy rain", 66: "freezing rain", 67: "freezing rain", 71: "light snow", 73: "snow",
  75: "heavy snow", 77: "snow grains", 80: "rain showers", 81: "rain showers", 82: "heavy showers", 85: "snow showers", 86: "heavy snow showers", 95: "thunderstorm", 96: "thunderstorm with hail", 99: "thunderstorm with hail" };
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
  const bow = mk("canvas", "wx-bow"), dim = mk("div", "wx-dim"), rain = mk("canvas", "wx-rain"), fog = mk("div", "wx-fog"), flashEl = mk("div", "wx-flash");
  world.append(bow, dim, rain, fog, flashEl);
  const trayEl = document.querySelector("[data-wx]");
  let kind = FROZEN ? "snow" : "rain", real = null, realOn = false, stormT = 0;
  const ctx = rain.getContext("2d");
  let g = null, p = 2, cw = 1, ch = 1, img = null, pix = null, band = [0, 0];
  let state = "clear", level = 0, until = 0, amount = 0, t0 = 0, src = null, raf = 0, last = 0, glass = null, shotT = 0, endT = 0, storm = [];
  const drops = [], splashes = [];
  const dispatch = (on, quiet) => dispatchEvent(new CustomEvent("gz:rain", { detail: { on, level, quiet: !!quiet, snow: kind === "snow" } }));

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
    dim.style.height = fog.style.height = flashEl.style.height = g.H + "px";
    dim.style.background = sky().css;
    drawBow();
    if (glass) glass.resize();
    shotT = 0;
    if (state === "rain") { tint(true); storm.forEach((im) => im.remove()); storm = []; rollIn(); }
    else if (real && real.level && !calm) start(null, "real");
  }

  function sky() {
    const hz = g.horizon, stops = [[0, "rgba(34,44,60,.72)"], [hz, "rgba(54,66,82,.52)"], [hz + 2, "rgba(28,38,52,.26)"], [g.H, "rgba(28,38,52,.2)"]];
    return { stops, css: `linear-gradient(180deg,${stops.map(([y, c]) => `${c} ${y}px`).join(",")})` };
  }

  const vx = () => (world.parentNode && world.parentNode.scrollLeft) || 0;

  function drawBow() {
    const tall = g.mode === "tall", cx = (tall ? 0.5 : 0.29) * g.V, rad = tall ? 0.42 * g.V : Math.min(g.horizon - 0.025 * g.H, 0.42 * g.V);
    const b = Math.max(2, Math.round(rad / p / 24)), outer = rad / p, inner = outer - b * BOW.length;
    const w = Math.ceil(outer * 2) + 2, h = Math.ceil(outer) + 1;
    bow.width = w; bow.height = h;
    bow.dataset.x = cx - (w / 2) * p;
    bow.style.left = bow.dataset.x + "px"; bow.style.top = g.horizon - h * p + "px";
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
    const tall = g.mode === "tall", f = g.V / 390, x0 = vx();
    storm = STORM[g.mode].map(([name, fx, fy, k], i) => {
      const im = mk("img", "wx-cloud");
      im.src = `/assets/map/${name}.webp`;
      im.alt = "";
      const w = SPR[name][0] * g.s * k, h = SPR[name][1] * g.s * k;
      im.style.cssText = `left:${x0 + fx * g.V - w / 2}px;top:${tall ? fy * f : fy * g.H}px;width:${w}px;height:${h}px;--from:${(fx < 0.5 ? -1 : 1) * (0.35 * g.V + w)}px;--dx:${(R(-0.05, 0.05) * g.V).toFixed(0)}px;transition-delay:${i * 0.22}s`;
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

  function wetGlass() {
    if (kind !== "rain") return;
    if (glass === null) glass = (!soft && createGlass(world)) || false;
    shotT = 0;
    setTimeout(() => { if (state === "rain" && glass && kind === "rain") glass.rain(level); }, 1100);
  }

  function start(c, how) {
    const now = performance.now(), isReal = how === "real";
    state = "rain"; t0 = now; src = c || null; realOn = isReal;
    if (isReal) { kind = real.kind; level = real.level; until = Infinity; }
    else { kind = FROZEN ? "snow" : "rain"; level = 1; until = now + R(30000, 38000); }
    clearTimeout(endT);
    bow.classList.remove("on");
    if (c) { const r = c.getBoundingClientRect(); tint(true, r.left + r.width / 2); } else tint(true);
    dim.style.opacity = DIM[level] * (isReal ? 0.7 : 1) * (kind === "snow" ? 0.55 : 1);
    setTimeout(() => { if (state === "rain") rollIn(); }, isReal ? 50 : 500);
    if (!isReal) { wetGlass(); if (kind === "rain") sound(level); }
    dispatch(true);
    loop();
  }

  function heavier() {
    const now = performance.now();
    level = Math.min(3, level + 1);
    until = until === Infinity ? now + 30000 : Math.min(now + 60000, until + 12000);
    dim.style.opacity = DIM[level] * (kind === "snow" ? 0.55 : 1);
    if (kind === "rain") { if (glass) glass.rain(level); else wetGlass(); sound(level); }
    dispatch(true);
  }

  function settle() {
    level = real.level; kind = real.kind; until = Infinity;
    dim.style.opacity = DIM[level] * 0.7 * (kind === "snow" ? 0.55 : 1);
    if (glass) glass.rain(0);
    sound(0);
    dispatch(true);
  }

  function end() {
    state = "ending";
    const wasReal = realOn, wasKind = kind;
    realOn = false;
    if (glass) glass.rain(0);
    sound(0);
    endT = setTimeout(() => {
      if (state !== "ending") return;
      dim.style.opacity = 0;
      tint(false);
      rollOut();
      bow.classList.remove("on");
      bow.style.left = vx() + +bow.dataset.x + "px";
      void bow.offsetWidth;
      if (wasKind === "rain" && (!wasReal || !real || real.day)) bow.classList.add("on");
      dispatch(false);
      endT = setTimeout(() => { if (state === "ending") state = "clear"; }, 14000);
    }, 2400);
  }

  function stop() {
    if (state === "clear") return;
    state = "clear"; amount = 0; realOn = false;
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
    const tall = g.mode === "tall", hz = (tall || !g.mural ? g.horizon : Math.max(g.horizon, g.mural.y + g.mural.h)) / p, river = g.river[0] / p, seen = -wr.left / p;
    let cl = Math.max(0, seen - 30), cr = Math.min(cw, seen + innerWidth / p + 10), from = -1, shaft = null;
    if (src && state === "rain" && t - t0 < 4600) {
      const r = src.getBoundingClientRect();
      if (r.width) {
        shaft = [(r.left - wr.left + r.width * 0.16) / p, (r.right - wr.left - r.width * 0.16) / p];
        from = (r.top - wr.top + r.height * 0.7) / p;
        const e = Math.max(0, Math.min(1, (t - t0 - 1500) / 3000)), ee = e * e * (3 - 2 * e);
        const L = Math.max(0, seen - 30), Rr = Math.min(cw, seen + innerWidth / p + 10);
        cl = shaft[0] + (L - shaft[0]) * ee; cr = shaft[1] + (Rr - shaft[1]) * ee;
      }
    }
    const want = Math.round((amount * DENSITY * Math.max(0, cr - cl) * (b - a)) / 1000);
    for (let n = 0; drops.length < want && n < 60; n++) {
      const x = R(cl, cr), near = Math.random(), inCloud = shaft && x >= shaft[0] && x <= shaft[1];
      const gy = tall ? Math.max(hz, R(a, b)) : hz + (ch - hz) * near, snow = kind === "snow";
      const len = snow ? 1 : Math.round(3 + near * 6);
      const y = inCloud ? from : drops.length < want * 0.5 && !src ? R(a - len, gy) : Math.max(0, a) - len - R(0, 24);
      if (y >= gy) continue;
      drops.push({ x, y, gy, len, near, snow, ph: R(0, 6.3), v: snow ? (16 + 26 * near) * R(0.8, 1.2) : (170 + 330 * near) * R(0.9, 1.1), al: Math.round((snow ? 0.55 + near * 0.45 : 0.32 + near * 0.58) * 15) });
    }
    if (src && t - t0 >= 4600) src = null;
    for (let i = drops.length - 1; i >= 0; i--) {
      const d = drops[i];
      d.y += d.v * dt;
      d.x += d.snow ? (Math.sin(t / 700 + d.ph) * (3 + 5 * d.near) + 3) * dt : d.v * SLANT * dt;
      if (d.y < d.gy && d.x < cw + 10) continue;
      if (!d.snow && d.y >= d.gy && d.gy >= a && d.gy < b && d.near > 0.14) splashes.push({ x: d.x, y: d.gy, t: 0, ring: !FROZEN && d.gy >= river - 1, k: 0.55 + d.near * 0.7 });
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
      if (d.snow) {
        const c = FLAKE[d.al], x = d.x, y = Math.min(d.y, d.gy);
        put(x, y, c);
        if (d.near > 0.55) { put(x + 1, y, c); put(x, y + 1, c); put(x + 1, y + 1, FLAKE[Math.max(1, d.al - 5)]); }
        continue;
      }
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
    if (state === "rain" && t > until) { if (realOn && real) settle(); else end(); }
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

  function flash() {
    clearTimeout(stormT);
    if (!real || !real.storm || calm) return;
    stormT = setTimeout(() => {
      if (!document.hidden) { flashEl.classList.remove("on"); void flashEl.offsetWidth; flashEl.classList.add("on"); }
      flash();
    }, R(6000, 17000));
  }

  function tray(wx) {
    if (!trayEl) return;
    if (!wx) { trayEl.hidden = true; return; }
    const c = wx.code | 0, icon = c >= 95 ? "storm" : c === 45 || c === 48 ? "fog" : (c >= 71 && c <= 77) || c === 85 || c === 86 ? "snow" : (c >= 51 && c <= 67) || (c >= 80 && c <= 82) ? "rain" : c >= 2 ? "cloud" : wx.day ? "sun" : "moon";
    const t = Math.round(wx.temp);
    trayEl.hidden = false;
    trayEl.innerHTML = `<svg viewBox="0 0 16 16" width="16" height="16" shape-rendering="crispEdges" aria-hidden="true">${WXI[icon]}</svg><span>${t}°</span>`;
    trayEl.title = `Gzowo right now: ${t}°C, ${WX_WORDS[c] || "cloudy"}${wx.wind ? `, wind ${Math.round(wx.wind)} km/h` : ""}. The map shows the real weather.`;
  }

  function applyReal(wx) {
    tray(wx);
    if (!wx || calm) { real = null; return; }
    const c = wx.code | 0, snowy = wx.snow > 0 || (c >= 71 && c <= 77) || c === 85 || c === 86;
    const wet = snowy || wx.rain > 0.05 || (c >= 51 && c <= 67) || (c >= 80 && c <= 82) || c >= 95, amt = snowy ? wx.snow * 7 : wx.rain;
    const lv = !wet ? 0 : c === 65 || c === 75 || c === 82 || c === 86 || c >= 95 || amt >= 2.5 ? 3 : c === 63 || c === 73 || c === 81 || amt >= 0.6 ? 2 : 1;
    real = { kind: snowy ? "snow" : "rain", level: lv, day: !!wx.day, storm: c >= 95, fog: c === 45 || c === 48, grey: !lv && wx.cloud >= 88 };
    fog.classList.toggle("on", real.fog);
    world.classList.toggle("wx-grey", real.grey);
    flash();
    if (!g) return;
    if (lv) {
      if (state !== "rain") start(null, "real");
      else if (realOn && until === Infinity && (level !== lv || kind !== real.kind)) settle();
      else if (!realOn) realOn = true;
    } else if (state === "rain" && realOn && until === Infinity) end();
  }
  addEventListener("gz:pulse", (e) => applyReal(e.detail && e.detail.wx));

  if (!calm) {
    world.classList.add("wx-on");
    world.addEventListener("click", (e) => {
      const c = e.target.closest(".life-cloud, .wx-cloud");
      if (c && g && !document.documentElement.classList.contains("lock")) poke(c);
    });
  }

  return { layout, stop, real: () => real };
}
