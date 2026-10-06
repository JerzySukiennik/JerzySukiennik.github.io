/* Gzowo Labs 1998 - a tiny PS1-style Jurek who wanders the page, walks to cards and doors and comments on them.
   Loads after the page is idle, renders a 3 thousand triangle model at a chunky resolution, and bails out under
   reduced motion, on ?avatar=off, or if the visitor switched him off (the button in the corner). */

const OFF_KEY = "gzowoAvatarOff";
const calm = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const params = new URLSearchParams(location.search);
let disabled = false;
try { disabled = localStorage.getItem(OFF_KEY) === "1"; } catch (e) {}
if (params.get("avatar") === "off") disabled = true;
if (params.get("avatar") === "on") { disabled = false; try { localStorage.removeItem(OFF_KEY); } catch (e) {} }

const small = () => window.innerWidth < 700;
const R = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];

const LINES = {
  Game: ["That one's fun.", "I played this. Lost twice.", "Ten out of ten, would crash again.", "This one eats an afternoon.", "Press start. I dare you."],
  Hardware: ["Real hardware! Do not lick it.", "Beep boop. It prints, it flies, it works.", "Smells like hot plastic. In a good way."],
  "Web app": ["No install. Just click.", "Works in a browser. Magic.", "I use this one. Do not tell anyone."],
  Experiment: ["I do not know what this does either.", "Science happened here.", "Experimental. May contain bugs and joy."],
  "AI model": ["It was trained from scratch. I was impressed.", "It talks! Somewhat.", "Small brain, big dreams."],
  building: ["Still under construction. Hard hat on!", "Not finished yet. Be nice."],
  archive: ["Retired. Respect.", "A classic from the old days."],
  door: ["Pick a door, any door.", "Behind this one: good stuff.", "I heard there are rockets in there."],
  widget: ["Ooh, shiny.", "This page has so many widgets.", "Is that a webring? Retro!"],
  button: ["Click it. You know you want to.", "Free download. Nothing suspicious. Probably."],
  title: ["Welcome to the best page of 1998.", "Nice title. Very glow."],
  idle: ["Nice page. Very 1998.", "I am only about 4000 triangles but I have feelings.", "Please scroll slower, I get dizzy.", "Ahem. Anyone want to play something?", "Click me. I dare you.", "Did you sign the guestbook?"],
  fast: ["Whoa, slow down!", "Too fast! My triangles are spinning."],
  poke: ["Hey! Personal space.", "Boop.", "That tickles my polygons.", "I am not a button. Okay, maybe a little."],
};

function describe(el) {
  if (el.classList.contains("card")) {
    const name = (el.querySelector("h3") || {}).textContent || "this";
    const cat = ((el.querySelector(".card-meta span") || {}).textContent || "").trim();
    const st = (el.getAttribute("data-status") || "").toLowerCase();
    if (st === "building" && Math.random() < 0.6) return pick(LINES.building);
    if (st === "archive" && Math.random() < 0.6) return pick(LINES.archive);
    if (Math.random() < 0.3) return name.trim() + "? " + pick(["That one's fun.", "Good one.", "Go on, open it."]);
    return pick(LINES[cat] || LINES.Game);
  }
  if (el.classList.contains("door")) return pick(LINES.door);
  if (el.classList.contains("btn90") || el.tagName === "BUTTON") return pick(LINES.button);
  if (el.classList.contains("wordart")) return pick(LINES.title);
  return pick(LINES.widget);
}

const SELECTOR = ".card, .door, .widget, .btn90, .wordart";

async function start() {
  const THREE = await import("three");
  const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");

  const W = () => (small() ? 66 : 100), H = () => (small() ? 100 : 150), SCALE = 2;
  const wrap = document.createElement("div");
  wrap.id = "psx-jurek";
  wrap.setAttribute("aria-hidden", "true");
  wrap.style.cssText = "position:fixed;left:0;top:0;z-index:60;pointer-events:none;will-change:transform;opacity:0;transition:opacity .4s";
  const canvas = document.createElement("canvas");
  canvas.style.cssText = "display:block;image-rendering:pixelated;image-rendering:crisp-edges";
  wrap.appendChild(canvas);
  const bubble = document.createElement("div");
  bubble.style.cssText = "position:fixed;left:0;top:0;z-index:61;pointer-events:none;max-width:220px;padding:6px 9px;background:#ffff99;color:#000;border:3px outset #ff00ff;font:700 15px/1.2 'Comic Neue','Comic Sans MS',cursive;opacity:0;transition:opacity .15s;white-space:normal";
  const tail = document.createElement("div");
  tail.style.cssText = "position:absolute;left:18px;bottom:-14px;width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:12px solid #ff00ff";
  bubble.appendChild(tail);
  const text = document.createElement("span");
  bubble.insertBefore(text, tail);
  const toggle = document.createElement("button");
  toggle.textContent = "Jurek: ON";
  toggle.style.cssText = "position:fixed;right:6px;bottom:6px;z-index:62;font:700 11px 'Comic Neue','Comic Sans MS',cursive;background:#c0c0c0;border:2px outset #fff;padding:1px 6px;opacity:.55;cursor:pointer";
  toggle.onmouseenter = () => { toggle.style.opacity = "1"; };
  toggle.onmouseleave = () => { toggle.style.opacity = ".55"; };
  document.body.append(wrap, bubble, toggle);

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
  renderer.setPixelRatio(1);
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const cam = new THREE.OrthographicCamera(-1, 1, 1.95, -0.05, 0.1, 20);
  cam.position.set(0, 0.9, 6); cam.lookAt(0, 0.9, 0);
  const U = { uRes: { value: new THREE.Vector2(1, 1) }, uLight: { value: new THREE.Vector3(0.5, 0.8, 0.7).normalize() } };
  const vs = `uniform vec2 uRes; uniform vec3 uLight; varying vec2 vUv; varying float vW; varying float vShade;
#include <common>
#include <skinning_pars_vertex>
void main(){
  #include <beginnormal_vertex>
  #include <skinbase_vertex>
  #include <skinnormal_vertex>
  #include <defaultnormal_vertex>
  #include <begin_vertex>
  #include <skinning_vertex>
  vec4 mv = modelViewMatrix * vec4(transformed, 1.0);
  vec4 p = projectionMatrix * mv;
  vec3 n = normalize(normalMatrix * objectNormal);
  vec3 L = normalize((viewMatrix * vec4(uLight, 0.0)).xyz);
  vShade = 0.62 + 0.62 * max(dot(n, L), 0.0);
  vec2 g = uRes * 0.5; vec3 nd = p.xyz / p.w; nd.xy = floor(nd.xy * g + 0.5) / g; p.xyz = nd * p.w;
  gl_Position = p; vW = p.w; vUv = uv * vW;
}`;
  const fs = `uniform sampler2D map; uniform vec3 color; uniform float uHasMap; varying vec2 vUv; varying float vW; varying float vShade;
void main(){
  vec3 c = color; if (uHasMap > 0.5) c *= texture2D(map, vUv / vW).rgb;
  c = c * vShade * 1.55; c = c * 0.88 + 0.10; c = floor(c * 31.0 + 0.5) / 31.0;
  gl_FragColor = vec4(c, 1.0);
}`;
  const psxMat = m => {
    const tex = m.map || null;
    if (tex) { tex.minFilter = tex.magFilter = THREE.NearestFilter; tex.generateMipmaps = false; tex.needsUpdate = true; }
    return new THREE.ShaderMaterial({ uniforms: { ...U, map: { value: tex }, color: { value: (m.color || new THREE.Color(1, 1, 1)).clone() }, uHasMap: { value: tex ? 1 : 0 } }, vertexShader: vs, fragmentShader: fs });
  };

  const gltf = await new Promise((res, rej) => new GLTFLoader().load("/assets/avatar/jurek-psx.glb", res, undefined, rej));
  const model = gltf.scene;
  model.traverse(o => { if (o.isMesh) { o.material = [].concat(o.material).map(psxMat); if (o.material.length === 1) o.material = o.material[0]; o.frustumCulled = false; } });
  scene.add(model);
  const mixer = new THREE.AnimationMixer(model);
  const act = {};
  for (const c of gltf.animations) act[c.name] = mixer.clipAction(c);
  let cur = null;
  const play = n => { const a = act[n] || act.idle; if (!a || cur === a) return; if (cur) cur.fadeOut(0.15); a.reset().fadeIn(0.15).play(); cur = a; };
  play("idle");

  function resize() {
    const w = W(), h = H();
    renderer.setSize(w, h, false);
    canvas.style.width = w * SCALE + "px"; canvas.style.height = h * SCALE + "px";
    const aspect = w / h; cam.left = -2 * aspect / 2; cam.right = 2 * aspect / 2; cam.updateProjectionMatrix();
    U.uRes.value.set(w, h);
  }
  resize(); addEventListener("resize", resize);

  const S = { x: innerWidth * 0.5, y: innerHeight - 6, tx: null, ty: null, yaw: 0, want: 0, state: "idle", until: performance.now() + 1800, target: null, say: "", shown: 0, hover: null, hoverAt: 0, last: null, lastScroll: 0, scrollV: 0 };
  const FEET = () => (small() ? 0 : 0);

  const visibleTargets = () => [...document.querySelectorAll(SELECTOR)].filter(e => { const r = e.getBoundingClientRect(); return r.width > 40 && r.height > 18 && r.bottom > 80 && r.top < innerHeight - 20 && e !== S.last; });
  function standPoint(el) {
    const r = el.getBoundingClientRect();
    return [Math.min(Math.max(r.left + r.width / 2, 40), innerWidth - 40), Math.min(Math.max(r.bottom + 4, 170), innerHeight - 6)];
  }
  function goto(el) {
    const [x, y] = standPoint(el); S.tx = x; S.ty = y; S.target = el; S.state = "walk"; S.say = ""; hide();
  }
  function wander() {
    S.tx = R(60, innerWidth - 60); S.ty = Math.min(innerHeight - 6, Math.max(180, S.y + R(-140, 140))); S.target = null; S.state = "walk";
  }
  function speak(line, ms) {
    S.say = line; S.shown = 0; S.state = "talk"; S.until = performance.now() + ms; text.textContent = ""; bubble.style.opacity = "1"; S.want = 0;
    play(Math.random() < 0.45 ? "wave" : "idle");
  }
  function hide() { bubble.style.opacity = "0"; }
  function place() {
    const w = W() * SCALE, h = H() * SCALE;
    wrap.style.transform = `translate(${Math.round(S.x - w / 2)}px,${Math.round(S.y - h + 6)}px)`;
    const bw = bubble.offsetWidth || 160, bh = bubble.offsetHeight || 40;
    let bx = Math.round(S.x - 20), by = Math.round(S.y - h - bh + 4);
    bx = Math.min(Math.max(bx, 6), innerWidth - bw - 6); by = Math.max(by, 6);
    bubble.style.transform = `translate(${bx}px,${by}px)`;
    tail.style.left = Math.min(Math.max(S.x - bx - 7, 8), bw - 22) + "px";
  }

  document.addEventListener("mouseover", e => {
    const el = e.target.closest && e.target.closest(SELECTOR);
    if (!el || el === S.hover) return;
    S.hover = el; S.hoverAt = performance.now();
    setTimeout(() => { if (S.hover === el && performance.now() - S.hoverAt >= 550 && S.state !== "away") goto(el); }, 600);
  }, { passive: true });
  document.addEventListener("mouseout", e => { if (e.target.closest && e.target.closest(SELECTOR) === S.hover) S.hover = null; }, { passive: true });
  document.addEventListener("click", e => {
    const w = W() * SCALE, h = H() * SCALE;
    if (e.clientX > S.x - w / 2 && e.clientX < S.x + w / 2 && e.clientY > S.y - h && e.clientY < S.y + 8 && !(e.target.closest && e.target.closest("a,button"))) speak(pick(LINES.poke), 2600);
  });
  addEventListener("scroll", () => { const now = performance.now(), dt = Math.max(1, now - S.lastScroll); S.scrollV = Math.abs(scrollY - (S.lastY || 0)) / dt * 1000; S.lastY = scrollY; S.lastScroll = now; if (S.scrollV > 3500 && S.state !== "talk") speak(pick(LINES.fast), 1800); }, { passive: true });
  toggle.onclick = () => { try { localStorage.setItem(OFF_KEY, "1"); } catch (e) {} wrap.remove(); bubble.remove(); toggle.remove(); running = false; };

  let running = true, acc = 0, lastT = performance.now();
  wrap.style.opacity = "1";
  function frame(t) {
    if (!running) return;
    requestAnimationFrame(frame);
    if (document.hidden) { lastT = t; return; }
    const dt = Math.min(0.1, (t - lastT) / 1000); lastT = t; acc += dt;
    const speed = small() ? 95 : 150;
    if (S.state === "walk") {
      const dx = S.tx - S.x, dy = S.ty - S.y, d = Math.hypot(dx, dy);
      if (d < 5) {
        S.x = S.tx; S.y = S.ty;
        if (S.target) { speak(describe(S.target), 2800 + Math.random() * 1200); S.last = S.target; } else { S.state = "idle"; S.until = t + R(2500, 6000); play("idle"); S.want = 0; }
      } else {
        const st = Math.min(d, speed * dt); S.x += dx / d * st; S.y += dy / d * st;
        play(d > 340 ? "run" : "walk");
        S.want = Math.abs(dx) > Math.abs(dy) * 0.8 ? (dx > 0 ? Math.PI / 2 : -Math.PI / 2) : (dy < 0 ? Math.PI : 0);
      }
    } else if (S.state === "talk") {
      if (S.shown < S.say.length) { S.shown = Math.min(S.say.length, S.shown + 45 * dt); text.textContent = S.say.slice(0, Math.floor(S.shown)); }
      if (t > S.until) { hide(); S.state = "idle"; S.until = t + R(1800, 5200); play("idle"); }
    } else {
      if (t > S.until) {
        const r = Math.random(), tg = visibleTargets();
        if (r < 0.7 && tg.length) goto(pick(tg)); else if (r < 0.85) speak(pick(LINES.idle), 3200); else wander();
      }
    }
    let dy = S.want - S.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); S.yaw += dy * Math.min(1, dt * 9);
    model.rotation.y = S.yaw;
    if (acc >= 1 / 15) { mixer.update(acc); acc = 0; }
    place();
    renderer.render(scene, cam);
  }
  requestAnimationFrame(frame);
}

if (!disabled && !calm) {
  const go = () => start().catch(() => {});
  if (document.readyState === "complete") setTimeout(go, 1200);
  else addEventListener("load", () => setTimeout(go, 1200));
}
