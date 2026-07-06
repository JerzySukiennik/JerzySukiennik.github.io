/* js/shaders.js — OGL fragment-shader backgrounds on ONE shared fixed canvas.
   A single WebGL context renders the visible section's preset (uTint, uSpeed,
   uVariant, uIntensity) and morphs between neighbouring presets near section
   boundaries (the scroll "wipe"). One rAF loop, stopped while the tab is
   hidden. DPR is capped at 1.75 and the canvas renders at 0.66x resolution,
   upscaled by CSS. initShaders() returns false if WebGL is unavailable. */

import { Renderer, Program, Mesh, Triangle } from "ogl";

const VERTEX = /* glsl */ `
attribute vec2 position;
attribute vec2 uv;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAGMENT = /* glsl */ `
precision highp float;

varying vec2 vUv;
uniform float uTime;
uniform vec2 uMouse;
uniform vec2 uRes;
uniform float uMix;
uniform float uVel;
uniform vec3 uTintA;
uniform float uSpeedA;
uniform float uVarA;
uniform float uIntA;
uniform vec3 uTintB;
uniform float uSpeedB;
uniform float uVarB;
uniform float uIntB;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y);
}

float fbm(vec2 p) {
  return noise(p) * 0.65 + noise(p * 2.03 + 17.3) * 0.35;
}

float field(vec2 p, float k, float t) {
  vec2 drift = vec2(t * 0.30, t * 0.17);
  float w = fbm(p * 1.9 + drift * 1.4);
  return fbm(p + drift + (w - 0.5) * 2.0 * k);
}

vec3 scene(float v, vec3 tint, float speed, float inten, vec2 p, vec2 m) {
  float t = uTime * speed * 3.0 + v * 43.7;

  vec2 sc = vec2(2.2);
  float k = 0.6;
  float grain = 0.0;
  float vigOuter = 1.25;
  float vigInner = 0.30;

  if (v < 0.5) {
    // hero / contact: calm drifting nebula
    k = 0.6;
  } else if (v < 1.5) {
    // bowling: rounder, blobbier warp at larger scale
    k = 0.9; sc = vec2(1.5);
  } else if (v < 2.5) {
    // gsp: near-mono horizontal streaks with fine grain
    k = 0.35; sc = vec2(0.9, 3.4); grain = 0.05;
  } else if (v < 3.5) {
    // modular: partially grid-quantized noise
    k = 0.55; sc = vec2(2.4);
  } else if (v < 4.5) {
    // backrooms: murky low-frequency drift, heavier vignette
    k = 0.5; sc = vec2(1.3); vigOuter = 0.95; vigInner = 0.18;
  } else if (v < 5.5) {
    // benejnej assistant: center glow + vertical drift
    k = 0.6; sc = vec2(2.0);
  } else {
    // galeria gzowo: sparse noise with thin filaments
    k = 0.5; sc = vec2(2.6);
  }

  // scroll velocity boosts warp and lifts intensity while moving fast
  k *= 1.0 + uVel * 0.5;
  inten *= 1.0 + uVel * 0.15;

  vec2 q = p * sc + m;
  if (v > 4.5 && v < 5.5) q.y += t * 0.6;

  float n = field(q, k, t);

  if (v > 2.5 && v < 3.5) {
    vec2 gq = (floor(p * 6.0) / 6.0) * sc + m;
    n = mix(n, field(gq, k, t), 0.4);
  }

  float fil = 0.0;
  if (v > 5.5) {
    fil = smoothstep(0.45, 0.50, n) - smoothstep(0.52, 0.57, n);
    n *= 0.55;
  }

  // fine global film grain; variant-specific grain (gsp) adds on top
  n += (hash(vUv * uRes + t) - 0.5) * (0.02 + grain);

  vec3 bg = vec3(0.039, 0.039, 0.047);
  float amt = clamp(n, 0.0, 1.0) * inten;
  vec3 col = mix(bg, tint, amt);
  col += tint * fil * 0.9 * inten;

  if (v > 4.5 && v < 5.5) col += tint * 0.30 * exp(-dot(p, p) * 3.0);

  float vig = 1.0 - smoothstep(vigInner, vigOuter, length(p));
  col = mix(bg, col, vig);
  return col;
}

void main() {
  vec2 p = (vUv - 0.5) * vec2(uRes.x / max(uRes.y, 1.0), 1.0);
  vec2 m = uMouse * 0.45;

  vec3 col;
  if (uMix < 0.004) {
    col = scene(uVarA, uTintA, uSpeedA, uIntA, p, m);
  } else if (uMix > 0.996) {
    col = scene(uVarB, uTintB, uSpeedB, uIntB, p, m);
  } else {
    col = mix(
      scene(uVarA, uTintA, uSpeedA, uIntA, p, m),
      scene(uVarB, uTintB, uSpeedB, uIntB, p, m),
      uMix);
  }
  gl_FragColor = vec4(col, 1.0);
}
`;

function hexToVec3(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/* entries: [{ el, preset: { tint, speed, variant, intensity } }] in DOM order */
export function initShaders(entries) {
  if (!entries.length) return false;

  const canvas = document.createElement("canvas");
  canvas.className = "bg-canvas";
  canvas.setAttribute("aria-hidden", "true");
  document.body.prepend(canvas);

  const dpr = Math.min(window.devicePixelRatio || 1, 1.75) * 0.66;
  let renderer;
  try {
    renderer = new Renderer({ canvas, dpr, alpha: false, antialias: false, depth: false, stencil: false });
  } catch (err) {
    console.warn("WebGL unavailable:", err);
    canvas.remove();
    return false;
  }

  const gl = renderer.gl;
  const program = new Program(gl, {
    vertex: VERTEX,
    fragment: FRAGMENT,
    uniforms: {
      uTime: { value: 0 },
      uMouse: { value: [0, 0] },
      uRes: { value: [1, 1] },
      uMix: { value: 0 },
      uVel: { value: 0 },
      uTintA: { value: [0, 0, 0] },
      uSpeedA: { value: 0 },
      uVarA: { value: 0 },
      uIntA: { value: 0 },
      uTintB: { value: [0, 0, 0] },
      uSpeedB: { value: 0 },
      uVarB: { value: 0 },
      uIntB: { value: 0 },
    },
  });
  const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });

  const presets = entries.map((e) => ({
    tint: hexToVec3(e.preset.tint),
    speed: e.preset.speed,
    variant: e.preset.variant,
    intensity: e.preset.intensity,
  }));
  let tops = [];

  function measure() {
    const y = window.scrollY;
    tops = entries.map((e) => e.el.getBoundingClientRect().top + y);
  }

  function resize() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    program.uniforms.uRes.value = [window.innerWidth, window.innerHeight];
    measure();
  }
  resize();

  let resizeTimer = 0;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 180);
  });

  const mouse = { x: 0, y: 0 };
  let mx = 0;
  let my = 0;
  window.addEventListener("mousemove", (e) => {
    mouse.x = e.clientX / window.innerWidth - 0.5;
    mouse.y = 0.5 - e.clientY / window.innerHeight;
  }, { passive: true });

  function setPreset(slot, p) {
    const u = program.uniforms;
    u["uTint" + slot].value = p.tint;
    u["uSpeed" + slot].value = p.speed;
    u["uVar" + slot].value = p.variant;
    u["uInt" + slot].value = p.intensity;
  }

  let rafId = 0;
  let running = false;
  let last = performance.now();
  let shown = false;
  let prevY = window.scrollY;
  let vel = 0;

  function loop(now) {
    rafId = requestAnimationFrame(loop);
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;

    mx += (mouse.x - mx) * 0.05;
    my += (mouse.y - my) * 0.05;

    const y = window.scrollY;
    const vh = window.innerHeight;

    /* smoothed |scroll velocity| 0..1 — fast attack, slow release */
    const inst = Math.min(1, Math.abs(y - prevY) / (vh * 0.045));
    prevY = y;
    vel += (inst - vel) * (inst > vel ? 0.15 : 0.05);
    let i = 0;
    for (let s = 0; s < tops.length; s++) if (tops[s] <= y + 1) i = s;
    let f = 0;
    if (i + 1 < tops.length) {
      const zone = vh * 0.7;
      f = Math.min(1, Math.max(0, (y - (tops[i + 1] - zone)) / zone));
      f = f * f * (3 - 2 * f);
    }
    setPreset("A", presets[i]);
    setPreset("B", presets[Math.min(i + 1, presets.length - 1)]);

    const u = program.uniforms;
    u.uMix.value = f;
    u.uVel.value = vel;
    u.uTime.value += dt;
    u.uMouse.value[0] = mx;
    u.uMouse.value[1] = my;
    renderer.render({ scene: mesh });

    if (!shown) {
      shown = true;
      canvas.classList.add("is-on");
    }
  }
  function start() {
    if (running) return;
    running = true;
    last = performance.now();
    rafId = requestAnimationFrame(loop);
  }
  function stop() {
    running = false;
    cancelAnimationFrame(rafId);
  }

  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
  start();
  return true;
}
