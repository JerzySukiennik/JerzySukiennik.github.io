/* js/shaders.js — OGL fragment-shader backgrounds. One shared shader family
   (2-octave value noise, single domain warp) with per-section uniforms:
   uTint, uSpeed, uVariant, uIntensity, uMouse, uTime. A single rAF loop
   renders only sections flagged visible by an IntersectionObserver and stops
   entirely while the tab is hidden or blurred. DPR is capped at 1.75 and
   canvases render at 0.66x resolution, upscaled by CSS. */

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
uniform vec3 uTint;
uniform float uSpeed;
uniform float uVariant;
uniform float uIntensity;
uniform vec2 uMouse;
uniform vec2 uRes;

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

void main() {
  vec2 p = (vUv - 0.5) * vec2(uRes.x / max(uRes.y, 1.0), 1.0);
  float v = uVariant;
  float t = uTime * uSpeed * 3.0;
  vec2 m = uMouse * 0.3;

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

  n += (hash(vUv * uRes + t) - 0.5) * grain;

  vec3 bg = vec3(0.039, 0.039, 0.047);
  float amt = clamp(n, 0.0, 1.0) * uIntensity;
  vec3 col = mix(bg, uTint, amt);
  col += uTint * fil * 0.9 * uIntensity;

  if (v > 4.5 && v < 5.5) col += uTint * 0.30 * exp(-dot(p, p) * 3.0);

  float vig = smoothstep(vigOuter, vigInner, length(p));
  col = mix(bg, col, vig);

  gl_FragColor = vec4(col, 1.0);
}
`;

function hexToVec3(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/* entries: [{ el, canvas, preset: { tint, speed, variant, intensity } }] */
export function initShaders(entries) {
  const instances = [];
  const mouse = { x: 0, y: 0 };
  const dpr = Math.min(window.devicePixelRatio || 1, 1.75) * 0.66;

  window.addEventListener("mousemove", (e) => {
    mouse.x = e.clientX / window.innerWidth - 0.5;
    mouse.y = 0.5 - e.clientY / window.innerHeight;
  }, { passive: true });

  for (const { el, canvas, preset } of entries) {
    let renderer;
    try {
      renderer = new Renderer({ canvas, dpr, alpha: false, antialias: false, depth: false, stencil: false });
    } catch (err) {
      console.warn("WebGL unavailable, skipping shader:", err);
      continue;
    }
    const gl = renderer.gl;
    const geometry = new Triangle(gl);
    const program = new Program(gl, {
      vertex: VERTEX,
      fragment: FRAGMENT,
      uniforms: {
        uTime: { value: Math.random() * 200 },
        uTint: { value: hexToVec3(preset.tint) },
        uSpeed: { value: preset.speed },
        uVariant: { value: preset.variant },
        uIntensity: { value: preset.intensity },
        uMouse: { value: [0, 0] },
        uRes: { value: [1, 1] },
      },
    });
    const mesh = new Mesh(gl, { geometry, program });
    const inst = { el, renderer, program, mesh, active: false, mx: 0, my: 0 };
    resize(inst);
    instances.push(inst);
  }

  function resize(inst) {
    const w = inst.el.clientWidth || window.innerWidth;
    const h = inst.el.clientHeight || window.innerHeight;
    inst.renderer.setSize(w, h);
    inst.program.uniforms.uRes.value = [w, h];
  }
  window.addEventListener("resize", () => instances.forEach(resize));

  const io = new IntersectionObserver((records) => {
    for (const r of records) {
      const inst = instances.find((i) => i.el === r.target);
      if (inst) inst.active = r.isIntersecting;
    }
  }, { rootMargin: "15%" });
  instances.forEach((i) => io.observe(i.el));

  let rafId = 0;
  let running = false;
  let last = performance.now();

  function loop(now) {
    rafId = requestAnimationFrame(loop);
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    for (const inst of instances) {
      if (!inst.active) continue;
      inst.mx += (mouse.x - inst.mx) * 0.05;
      inst.my += (mouse.y - inst.my) * 0.05;
      const u = inst.program.uniforms;
      u.uTime.value += dt;
      u.uMouse.value[0] = inst.mx;
      u.uMouse.value[1] = inst.my;
      inst.renderer.render({ scene: inst.mesh });
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
  window.addEventListener("blur", stop);
  window.addEventListener("focus", start);
  start();
}
