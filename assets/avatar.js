/* Gzowo Labs 1998 - a tiny PS1-style Jurek who wanders the page, walks to cards and doors and comments on them.
   He lives in page coordinates, so scrolling does not carry him along: he walks on his own and heads back into the
   viewport when he falls out of it. Loads after the page is idle; bails out under reduced motion, on ?avatar=off,
   or if the visitor switched him off with the button in the corner. */

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
const recent = [];
function fresh(list) {
  const pool = list.filter(l => !recent.includes(l));
  const line = pick(pool.length ? pool : list);
  recent.push(line); if (recent.length > 24) recent.shift();
  return line;
}

const LINES = {
  Game: ["That one's fun.", "I played this. Lost twice.", "Ten out of ten, would crash again.", "This one eats an afternoon.", "Press start. I dare you.", "I know a secret level in there.", "Warning: addictive.", "Best played with snacks.", "My high score is classified.", "Do not blame me if you miss dinner.", "One more round. I swear.", "Runs in the browser. No excuses.", "I rage quit this one. Twice.", "Okay, this one has a good soundtrack.", "Pro tip: it gets harder.", "I would play that right now.", "That game made my polygons sweat.", "Beginner friendly. Mostly.", "A real classic. Well, since last year.", "Go on, hit play."],
  Hardware: ["Real hardware! Do not lick it.", "Beep boop. It prints, it flies, it works.", "Smells like hot plastic. In a good way.", "Measure twice, print once.", "Hot glue is a lifestyle.", "That one has actual screws. Fancy.", "Built by hand. Mine are low poly.", "Please keep fingers away from the nozzle.", "Rockets, printers, lasers. My kind of place.", "If it works, do not touch it.", "Layer by layer. Very patient work."],
  "Web app": ["No install. Just click.", "Works in a browser. Magic.", "I use this one. Do not tell anyone.", "Bookmark it. Trust me.", "Small, fast, useful.", "No sign up. Refreshing.", "Handy little thing.", "I opened this one fifty times today."],
  Experiment: ["I do not know what this does either.", "Science happened here.", "Experimental. May contain bugs and joy.", "Do not ask what it is for.", "Weird in a good way.", "Probably should not work. It does.", "Lab coat not included.", "This one is a vibe."],
  "AI model": ["It was trained from scratch. I was impressed.", "It talks! Somewhat.", "Small brain, big dreams.", "No big cloud. Just a tiny brain.", "It learns. I wish I did.", "Trained on a free GPU, by hand.", "Ask it something easy first.", "It writes better than my homework."],
  building: ["Still under construction. Hard hat on!", "Not finished yet. Be nice.", "Coming soon. Sort of.", "Work in progress. Like me.", "Bricks are still being laid.", "Beta. Very beta.", "Wet paint. Do not touch.", "Check back later. Or now. It is fun anyway."],
  archive: ["Retired. Respect.", "A classic from the old days.", "Resting in peace. Still clickable.", "Hall of fame stuff."],
  door: ["Pick a door, any door.", "Behind this one: good stuff.", "I heard there are rockets in there.", "This door squeaks. Charming.", "Knock knock.", "Do not worry, the monster is friendly.", "That one leads somewhere cool.", "Choose wisely. Or randomly.", "Every door is a good door.", "I would go in. After you."],
  widget: ["Ooh, shiny.", "Is that a webring? Retro!", "Nobody reads these. I do.", "Vote early, vote often.", "I signed the guestbook. Twice.", "Best viewed in Netscape. Obviously.", "That counter is not fake. Probably.", "Look, a stamp of approval.", "Very official.", "Fancy. Someone put effort in.", "1998 called. It wants its widgets back."],
  button: ["Click it. You know you want to.", "Free download. Nothing suspicious. Probably.", "Big button. Press it.", "That button looks lonely.", "Go ahead. I will watch.", "Buttons are my favourite.", "Behold: a button.", "Click, then thank me."],
  title: ["Welcome to the best page of 1998.", "Nice title. Very glow.", "That title has more colours than I do.", "Letters with a tan. Impressive.", "WordArt never died. It just moved here."],
  idle: ["Nice page. Very 1998.", "I am only about 4000 triangles but I have feelings.", "Please scroll slower, I get dizzy.", "Ahem. Anyone want to play something?", "Click me. I dare you.", "Did you sign the guestbook?", "Is it lunch yet?", "I walk, therefore I am.", "My feet are made of pixels.", "I wonder what is on the next page.", "Just stretching my polygons.", "Somebody once rendered me in 8K. I got shy.", "Do these shoes look green to you?", "I have a very low frame rate. It is a feature.", "La la la. Walking.", "Life is good. Triangles are cheap.", "I think I hear a modem.", "Leaving a trail of crumbs. Sorry.", "Hello? Anyone there?", "Do not mind me. I live here.", "Whoever built this page has style.", "I wonder if the drawings on the side wave back.", "Counting pixels. Four.", "Still here. Still walking.", "I need a hobby. Maybe a rocket.", "This is my page. I just walk on it.", "Who put me here? Great job.", "I could do this all day.", "Sparkles! I love sparkles.", "Watch the cursor trail. Very 90s."],
  back: ["Wait for me!", "Do not scroll away, I am coming!", "Hey, where did everyone go?", "Hold on, I am catching up!", "Running! Running!", "Wait, I was reading that!"],
  fast: ["Whoa, slow down!", "Too fast! My triangles are spinning.", "Hey, I am not a speed reader.", "Easy on the wheel!", "Dizzy... dizzy..."],
  poke: ["Hey! Personal space.", "Boop.", "That tickles my polygons.", "I am not a button. Okay, maybe a little.", "Ow. Just kidding, I have no nerves.", "Stop that. Or do it again.", "Careful, I am low poly. I might break.", "You found me! Congrats.", "Do you do this to all mascots?", "Click rate: impressive.", "I accept tips in pixels.", "Okay okay, hello!", "That was a poke. Noted.", "Hands off the hoodie."],
  name: ["{n}? That one's fun.", "Ooh, {n}.", "{n}. Good pick.", "Everyone asks me about {n}.", "I heard {n} is great.", "Click {n}. Trust me.", "{n} is my favourite. Today.", "{n}? Say no more."]
};

const WEIGHT = [["card", 1], ["door", 1], ["btn90", 0.5], ["wordart", 0.25], ["widget", 0.1]];
const weightOf = el => { for (const [c, w] of WEIGHT) if (el.classList.contains(c)) return w; return 0.1; };

function describe(el) {
  if (el.classList.contains("card")) {
    const name = ((el.querySelector("h3") || {}).textContent || "this").trim();
    const cat = ((el.querySelector(".card-meta span") || {}).textContent || "").trim();
    const st = (el.getAttribute("data-status") || "").toLowerCase();
    if (st === "building" && Math.random() < 0.55) return fresh(LINES.building);
    if (st === "archive" && Math.random() < 0.55) return fresh(LINES.archive);
    if (Math.random() < 0.35) return fresh(LINES.name).replace("{n}", name);
    return fresh(LINES[cat] || LINES.Game);
  }
  if (el.classList.contains("door")) return fresh(LINES.door);
  if (el.classList.contains("btn90") || el.tagName === "BUTTON") return fresh(LINES.button);
  if (el.classList.contains("wordart")) return fresh(LINES.title);
  return fresh(LINES.widget);
}

const SELECTOR = ".card, .door, .widget, .btn90, .wordart";

async function start() {
  const THREE = await import("three");
  const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");

  const W = () => (small() ? 66 : 100), H = () => (small() ? 100 : 150), SCALE = 2;
  const layer = document.createElement("div");
  layer.style.cssText = "position:fixed;left:0;top:0;width:100%;height:100%;overflow:hidden;pointer-events:none;z-index:60";
  document.body.appendChild(layer);
  const wrap = document.createElement("div");
  wrap.id = "psx-jurek";
  wrap.setAttribute("aria-hidden", "true");
  wrap.style.cssText = "position:absolute;left:0;top:0;z-index:1;pointer-events:none;will-change:transform;opacity:0;transition:opacity .4s";
  const canvas = document.createElement("canvas");
  canvas.style.cssText = "display:block;image-rendering:pixelated;image-rendering:crisp-edges";
  wrap.appendChild(canvas);
  const bubble = document.createElement("div");
  bubble.style.cssText = "position:absolute;left:0;top:0;z-index:2;pointer-events:none;max-width:220px;padding:6px 9px;background:#ffff99;color:#000;border:3px outset #ff00ff;font:700 15px/1.2 'Comic Neue','Comic Sans MS',cursive;opacity:0;transition:opacity .15s;white-space:normal";
  const tail = document.createElement("div");
  const setTail = below => {
    tail.style.cssText = "position:absolute;left:18px;width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;" + (below ? "top:-14px;border-bottom:12px solid #ff00ff" : "bottom:-14px;border-top:12px solid #ff00ff");
  };
  setTail(false);
  bubble.appendChild(tail);
  const text = document.createElement("span");
  bubble.insertBefore(text, tail);
  const toggle = document.createElement("button");
  toggle.textContent = "Jurek: ON";
  toggle.style.cssText = "position:fixed;right:6px;bottom:6px;z-index:62;font:700 11px 'Comic Neue','Comic Sans MS',cursive;background:#c0c0c0;border:2px outset #fff;padding:1px 6px;opacity:.55;cursor:pointer";
  toggle.onmouseenter = () => { toggle.style.opacity = "1"; };
  toggle.onmouseleave = () => { toggle.style.opacity = ".55"; };
  layer.append(wrap, bubble); document.body.appendChild(toggle);

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
  renderer.setPixelRatio(1);
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const cam = new THREE.OrthographicCamera(-1, 1, 1.0, -1.0, 0.1, 20);
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
    const aspect = w / h; cam.left = -aspect; cam.right = aspect; cam.updateProjectionMatrix();
    U.uRes.value.set(w, h);
  }
  resize(); addEventListener("resize", resize);

  const vw = () => document.documentElement.clientWidth;
  const S = { x: scrollX + vw() * 0.5, y: scrollY + innerHeight - 8, tx: 0, ty: 0, yaw: 0, want: 0, state: "idle", until: performance.now() + 1800, target: null, say: "", shown: 0, hover: null, hoverAt: 0, last: null, lastScroll: 0, lastY: scrollY, returning: false, backAt: 0 };
  const canvasH = () => H() * SCALE;
  const headOffset = () => canvasH() * 0.94;

  const inView = () => S.y > scrollY + 90 && S.y < scrollY + innerHeight + 30 && S.x > scrollX + 20 && S.x < scrollX + vw() - 20;
  const clampView = (x, y) => [Math.min(Math.max(x, scrollX + 60), scrollX + vw() - 60), Math.min(Math.max(y, scrollY + Math.min(190, innerHeight * 0.4)), scrollY + innerHeight - 8)];

  function visibleTargets() {
    const out = [];
    for (const e of document.querySelectorAll(SELECTOR)) {
      const r = e.getBoundingClientRect();
      if (r.width < 40 || r.height < 18 || r.bottom < 100 || r.top > innerHeight - 30 || e === S.last) continue;
      const w = weightOf(e); for (let i = 0; i < Math.max(1, Math.round(w * 10)); i++) out.push(e);
    }
    return out;
  }
  function standPoint(el) {
    const r = el.getBoundingClientRect(), head = canvasH() * 0.85;
    const x = r.left + scrollX + Math.min(Math.max(r.width * (0.2 + 0.6 * Math.random()), 30), r.width - 30 > 30 ? r.width - 30 : r.width / 2);
    let y = r.top + scrollY + 8;
    if (r.top < head + 30) y = Math.min(scrollY + head + 40, r.bottom + scrollY - 6);
    return clampView(x, y);
  }
  function goto(el) { const [x, y] = standPoint(el); S.tx = x; S.ty = y; S.target = el; S.state = "walk"; S.returning = false; hide(); }
  function wander() { const [x, y] = clampView(S.x + R(-420, 420), S.y + R(-160, 160)); S.tx = x; S.ty = y; S.target = null; S.state = "walk"; S.returning = false; }
  function comeBack() {
    const [x, y] = clampView(S.x, S.y); S.tx = x; S.ty = y; S.target = null; S.state = "walk"; S.returning = true; hide();
    if (performance.now() - S.backAt > 15000 && Math.random() < 0.4) { S.backAt = performance.now(); S.pendingSay = fresh(LINES.back); }
  }
  function speak(line, ms) {
    S.say = line; S.shown = 0; S.state = "talk"; S.until = performance.now() + ms; text.textContent = ""; bubble.style.opacity = "1"; S.want = 0;
    play(Math.random() < 0.45 ? "wave" : "idle");
  }
  function hide() { bubble.style.opacity = "0"; }
  function place() {
    const h = canvasH(), w = W() * SCALE, headTop = S.y - h * 0.95 + h * 0.06 + h * 0.05;
    wrap.style.transform = `translate(${Math.round(S.x - w / 2 - scrollX)}px,${Math.round(S.y - h * 0.95 - scrollY)}px)`;
    const bw = bubble.offsetWidth || 160, bh = bubble.offsetHeight || 40;
    let bx = S.x - 22, by = headTop - bh - 14, below = false;
    if (by < scrollY + 8) { by = S.y + 10; below = true; }
    bx = Math.min(Math.max(bx, scrollX + 6), scrollX + vw() - bw - 6);
    bubble.style.transform = `translate(${Math.round(bx - scrollX)}px,${Math.round(by - scrollY)}px)`;
    setTail(below); tail.style.left = Math.min(Math.max(S.x - bx - 7, 8), bw - 22) + "px";
  }

  document.addEventListener("mouseover", e => {
    const el = e.target.closest && e.target.closest(SELECTOR);
    if (!el || el === S.hover) return;
    S.hover = el; S.hoverAt = performance.now();
    setTimeout(() => { if (S.hover === el && performance.now() - S.hoverAt >= 550) goto(el); }, 600);
  }, { passive: true });
  document.addEventListener("mouseout", e => { if (e.target.closest && e.target.closest(SELECTOR) === S.hover) S.hover = null; }, { passive: true });
  document.addEventListener("click", e => {
    const w = W() * SCALE, h = canvasH();
    if (e.pageX > S.x - w / 2 && e.pageX < S.x + w / 2 && e.pageY > S.y - h * 0.9 && e.pageY < S.y + 8 && !(e.target.closest && e.target.closest("a,button"))) speak(fresh(LINES.poke), 2600);
  });
  addEventListener("scroll", () => {
    const now = performance.now(), dt = Math.max(1, now - S.lastScroll), v = Math.abs(scrollY - S.lastY) / dt * 1000;
    S.lastY = scrollY; S.lastScroll = now;
    if (v > 4500 && S.state !== "talk" && inView() && performance.now() - S.backAt > 8000) { S.backAt = performance.now(); speak(fresh(LINES.fast), 1800); }
  }, { passive: true });
  toggle.onclick = () => { try { localStorage.setItem(OFF_KEY, "1"); } catch (e) {} layer.remove(); toggle.remove(); running = false; };

  let running = true, acc = 0, lastT = performance.now();
  wrap.style.opacity = "1";
  function frame(t) {
    if (!running) return;
    requestAnimationFrame(frame);
    if (document.hidden) { lastT = t; return; }
    const dt = Math.min(0.1, (t - lastT) / 1000); lastT = t; acc += dt;
    const speed = small() ? 95 : 150;
    if (!inView() && !S.returning) { if (S.state === "talk") hide(); comeBack(); }
    if (S.state === "walk") {
      if (S.returning) { const [x, y] = clampView(S.tx, S.ty); S.tx = x; S.ty = y; }
      const dx = S.tx - S.x, dy = S.ty - S.y, d = Math.hypot(dx, dy);
      if (d < 5) {
        S.x = S.tx; S.y = S.ty;
        if (S.pendingSay) { const l = S.pendingSay; S.pendingSay = null; S.returning = false; S.target = null; speak(l, 2400); }
        else if (S.target) { speak(describe(S.target), 2800 + Math.random() * 1200); S.last = S.target; S.returning = false; }
        else { S.returning = false; S.state = "idle"; S.until = t + R(2500, 6000); play("idle"); S.want = 0; }
      } else {
        const st = Math.min(d, speed * (d > 340 ? 1.6 : 1) * dt); S.x += dx / d * st; S.y += dy / d * st;
        play(d > 340 ? "run" : "walk");
        S.want = Math.abs(dx) > Math.abs(dy) * 0.8 ? (dx > 0 ? Math.PI / 2 : -Math.PI / 2) : (dy < 0 ? Math.PI : 0);
      }
    } else if (S.state === "talk") {
      if (S.shown < S.say.length) { S.shown = Math.min(S.say.length, S.shown + 45 * dt); text.textContent = S.say.slice(0, Math.floor(S.shown)); }
      if (t > S.until) { hide(); S.state = "idle"; S.until = t + R(1800, 5200); play("idle"); }
    } else {
      if (t > S.until) {
        const r = Math.random(), tg = visibleTargets();
        if (r < 0.72 && tg.length) goto(pick(tg)); else if (r < 0.86) speak(fresh(LINES.idle), 3200); else wander();
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
