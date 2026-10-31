/* Gzowo Labs: a tiny PS1-style Jurek who walks the path on the map, talks and thinks in comic bubbles, reacts to what happens around him,
   opens an umbrella when it rains, and takes a kayak out on the Narew when you click one. Starts after the page is idle; stays off under reduced motion, on ?avatar=off,
   or when switched off in the Start menu. */

const OFF_KEY = "gzowoAvatarOff";
const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
const params = new URLSearchParams(location.search);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const R = (a, b) => a + Math.random() * (b - a);
const recent = [];
function fresh(list) {
  const pool = list.filter((l) => !recent.includes(l));
  const line = pick(pool.length ? pool : list);
  recent.push(line);
  if (recent.length > 30) recent.shift();
  return line;
}

const LINES = {
  rockets: ["Real rockets. They really fly.", "The Orange Beauty lives here.", "Countdown starts when the wind calms down.", "Parachutes: usually.", "Stand back, this is rocket science.", "Five rockets and counting.", "Gzowo Space Program. Very official."],
  printing: ["Smells like hot plastic. In a good way.", "Measure twice, print once.", "Layer by layer. Very patient work.", "Please keep fingers away from the nozzle.", "If it works, do not touch it."],
  games: ["Thirty seven games in there.", "Press start. I dare you.", "One more round. I swear.", "Runs in the browser. No excuses.", "My high score is classified.", "I rage quit one of these. Twice."],
  software: ["It was trained from scratch. I was impressed.", "Small brain, big dreams.", "It learns. I wish I did.", "Science happened here.", "No sign up. Refreshing."],
  reviews: ["Leave a review. My mum reads them.", "Five stars, obviously.", "Very official billboard."],
  guestbook: ["Did you sign the guestbook?", "Write something nice in the book.", "I signed it twice."],
  about: ["Welcome to Gzowo 34.", "This is our plot. Nice, huh?", "Est. 2025. Very old.", "Everything here is built by hand."],
  mural: ["Grab a spray can.", "This wall needs more colour.", "Hold the spray still and it drips. Art!", "Sixty colours. I counted."],
  think: ["Should the next rocket have two stages?", "I bet that cloud is full of rain.", "What if the wall had a dragon on it...", "Pizza or pierogi. Tough one.", "Do fish like rockets?", "Note to self: buy more filament.", "Maybe I should train a bigger model.", "What rhymes with Gzowo?", "If I print a printer, is it my child?", "Ten more minutes of coding. Then sleep.", "Do pixels dream of electric sheep?", "I could make a game about this map.", "Is the Narew warm yet?"],
  idea: ["Idea! A rocket that lands itself.", "I know! A kayak racing game.", "Eureka! Or I am just hungry."],
  poke: ["Hey! Personal space!", "Boop!", "That tickles my polygons!", "I am not a button!", "Careful, I am low poly!", "Hands off the hoodie!"],
  back: ["Wait for me!", "Running! Running!"],
  kayakGo: ["Paddle time!", "Kayak? Say no more!", "To the river!"],
  kayak: ["The Narew is cold today!", "Wheee!", "Paddle, paddle, paddle.", "I can see a fish!", "Best office in Gzowo.", "Do not tell my mum I skipped homework."],
  kayakBack: ["Back to work.", "That was refreshing.", "My arms are noodles now."],
  busy: ["I am already on the river!", "One kayak at a time!"],
  fire: ["Static fire! Whoa!", "Hear that? Engine test!", "Cover your ears!"],
  morning: ["Good morning! Juice first, rockets later.", "Early bird gets the rocket."],
  evening: ["Good evening! Nice night for a launch.", "Should I be asleep? Probably."],
  night: ["It is late. Like, really late.", "Shh, the rockets are sleeping."],
  painted: ["Nice art!", "The wall looks better already.", "Picasso who?"],
  open: { games: ["Good pick! Have fun.", "Press start!"], rockets: ["Those really fly!", "Real launches, real smoke."], printing: ["Printed with love and PLA."], software: ["Science!"], reviews: ["Five stars? Five stars."], guestbook: ["Sign it! Sign it!"], project: ["Ooh, good one.", "Have fun!", "I made that!"] },
  wake: ["Huh? Oh, hi!", "I was not sleeping. I was buffering."],
  rain: ["Rain! Who poked the cloud?", "Umbrella time!", "Great. Wet pixels.", "It is raining in Gzowo!", "Did you just squeeze a cloud?"],
  rainMore: ["It is pouring now!", "OK, that is a lot of rain.", "Stop squeezing the clouds!", "The Narew will flood!"],
  wet: ["I love the sound of rain.", "Perfect weather for coding.", "No launch today. Weather hold.", "The river is getting bigger.", "Rain on the window. So cozy.", "My shoes are full of water."],
  rainKayak: ["Rain? I am wet anyway!", "Paddling in the rain. Epic."],
  rainbow: ["Rainbow!", "Look, a rainbow!", "The sun is back!", "Is there gold at the end of it?"],
  scrub: ["Launch scrubbed. Weather.", "No engine test in the rain."],
  zzz: ["Zzz...", "Zzz... rockets...", "Zzz... one more level..."],
};

const EMOTES = {
  idea: ["..XXXXX..", ".XYYYYYX.", "XYYWYYYYX", "XYYYYYYYX", "XYYYYYYYX", ".XYYYYYX.", "..XYYYX..", "..XGGGX..", "...XXX..."],
  note: [".....XX..", ".....XXX.", ".....X.XX", ".....X..X", ".....X...", "..XXXX...", ".XXXXX...", ".XXXX....", "........."],
  heart: [".XX...XX.", "XPPX.XPPX", "XPWPXPPPX", "XPPPPPPPX", ".XPPPPPX.", "..XPPPX..", "...XPX...", "....X....", "........."],
  alert: ["...XXX...", "...XYX...", "...XYX...", "...XYX...", "...XYX...", "...XXX...", "...XYX...", "...XXX...", "........."],
  zzz: ["XXXXX....", "...X.....", "..X......", ".X.......", "XXXXX.XXX", "........X", "......X..", ".....X...", ".....XXXX"],
  sweat: ["....B....", "...BB....", "..BBWB...", "..BBBB...", "...BB....", ".........", ".........", ".........", "........."],
};
const EPAL = { X: "#111111", Y: "#ffd84a", W: "#ffffff", G: "#9aa3ad", P: "#ff6fae", B: "#5ab8ff" };
function emoteUrl(rows) {
  let body = "";
  rows.forEach((row, y) => { for (let x = 0; x < row.length; x++) if (EPAL[row[x]]) body += `<rect x="${x}" y="${y}" width="1" height="1" fill="${EPAL[row[x]]}"/>`; });
  return `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" shape-rendering="crispEdges">${body}</svg>`)}")`;
}

let disabled = false;
try { disabled = localStorage.getItem(OFF_KEY) === "1"; } catch (e) {}
if (params.get("avatar") === "off") disabled = true;

let G = null, world = null, running = false, booted = false, api = null;
if (window.gzMap) { G = window.gzMap.geo; world = window.gzMap.world; }
addEventListener("gz:map", (e) => { G = e.detail.geo; world = e.detail.world; if (api) api.relayout(); });
addEventListener("gz:mascot", (e) => {
  const on = e.detail;
  if (on) { disabled = false; if (api) api.resume(); else boot(); }
  else { disabled = true; if (api) api.pause(); }
});

function pointAt(s) {
  const { pts, len, total } = G.path;
  s = Math.max(0, Math.min(total, s));
  let lo = 0, hi = len.length - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (len[mid] < s) lo = mid; else hi = mid; }
  const t = len[hi] === len[lo] ? 0 : (s - len[lo]) / (len[hi] - len[lo]);
  return [pts[lo][0] + (pts[hi][0] - pts[lo][0]) * t, pts[lo][1] + (pts[hi][1] - pts[lo][1]) * t];
}

async function start() {
  const THREE = await import("three");
  const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
  const { drawKayak } = await import("/assets/map.mjs");
  const SCALE = 2;
  const el = (tag, cls) => { const e = document.createElement(tag); e.className = cls; return e; };
  const wrap = el("div", "psx");
  wrap.setAttribute("aria-hidden", "true");
  const canvas = document.createElement("canvas");
  const bubble = el("div", "psx-say"), box = el("div", "psx-b"), text = el("span", "psx-t");
  const emote = el("div", "psx-emote");
  bubble.setAttribute("aria-hidden", "true");
  emote.setAttribute("aria-hidden", "true");
  box.append(text);
  bubble.append(box);
  wrap.append(canvas);
  world.append(wrap, bubble, emote);

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
  renderer.setPixelRatio(1);
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 20);
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
  const psxMat = (m) => {
    const tex = m.map || null;
    if (tex) { tex.minFilter = tex.magFilter = THREE.NearestFilter; tex.generateMipmaps = false; tex.needsUpdate = true; }
    return new THREE.ShaderMaterial({ uniforms: { ...U, map: { value: tex }, color: { value: (m.color || new THREE.Color(1, 1, 1)).clone() }, uHasMap: { value: tex ? 1 : 0 } }, vertexShader: vs, fragmentShader: fs });
  };
  const gltf = await new Promise((res, rej) => new GLTFLoader().load("/assets/avatar/jurek-psx.glb", res, undefined, rej));
  const model = gltf.scene;
  model.traverse((o) => { if (o.isMesh) { o.material = [].concat(o.material).map(psxMat); if (o.material.length === 1) o.material = o.material[0]; o.frustumCulled = false; } });
  scene.add(model);
  const mixer = new THREE.AnimationMixer(model);
  const act = {};
  for (const c of gltf.animations) act[c.name] = mixer.clipAction(c);
  let cur = null;
  const play = (n) => { const a = act[n] || act.idle; if (!a || cur === a) return; if (cur) cur.fadeOut(0.15); a.reset().fadeIn(0.15).play(); cur = a; };
  play("idle");

  const V = () => new THREE.Vector3(), Q = () => new THREE.Quaternion(), UP = new THREE.Vector3(0, 1, 0);
  const bone = (n) => model.getObjectByName(n);
  const B = { hips: bone("Hips"), spine: bone("Spine1"), chest: bone("Spine2"), la: bone("LeftArm"), lf: bone("LeftForeArm"), lh: bone("LeftHand"), ra: bone("RightArm"), rf: bone("RightForeArm"), rh: bone("RightHand") };
  const rig = Object.values(B).every(Boolean);
  mixer.update(0.01);
  model.updateMatrixWorld(true);
  const local = (b) => model.worldToLocal(b.getWorldPosition(V()));
  const hipY = rig ? local(B.hips).y : 0.95, chestY = rig ? local(B.chest).y : 1.3;
  const headTop = new THREE.Box3().setFromObject(model).max.y || 1.85;

  const paddle = new THREE.Group();
  const pm = (hex) => psxMat({ color: new THREE.Color(hex) });
  const blade = new THREE.BoxGeometry(0.36, 0.17, 0.03);
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.04, 0.04), pm(0x262a30));
  const b1 = new THREE.Mesh(blade, pm(0xffd84a)), b2 = new THREE.Mesh(blade, pm(0xffd84a));
  b1.position.x = 1.0; b2.position.x = -1.0;
  paddle.add(shaft, b1, b2);
  paddle.visible = false;
  model.add(paddle);

  const umb = new THREE.Group(), canopy = new THREE.Group();
  for (let i = 0; i < 8; i++) {
    const m = pm(i % 2 ? 0x1d3f8f : 0xffd84a);
    m.side = THREE.DoubleSide;
    canopy.add(new THREE.Mesh(new THREE.ConeGeometry(0.6, 0.28, 2, 1, true, (i * Math.PI) / 4, Math.PI / 4), m));
  }
  canopy.position.y = 0.74;
  const stick = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.9, 0.035), pm(0x262a30)), tip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.09, 0.05), pm(0x262a30));
  stick.position.y = 0.45; tip.position.y = 0.92;
  umb.add(stick, canopy, tip);
  umb.position.set(-0.2, chestY + 0.1, 0.18);
  umb.rotation.z = -0.17;
  umb.visible = false;
  model.add(umb);
  const U2 = { want: false, k: 0, framed: false };

  function rotWorld(b, q) {
    const wq = b.getWorldQuaternion(Q()), pq = b.parent.getWorldQuaternion(Q());
    b.quaternion.copy(pq.invert().multiply(q.multiply(wq)));
    b.updateMatrixWorld(true);
  }
  function aim(b, child, target) {
    const P = b.getWorldPosition(V()), from = child.getWorldPosition(V()).sub(P).normalize(), to = target.clone().sub(P).normalize();
    rotWorld(b, Q().setFromUnitVectors(from, to));
  }
  function reach(arm, fore, hand, target, pole) {
    const S0 = arm.getWorldPosition(V()), E = fore.getWorldPosition(V()), H = hand.getWorldPosition(V());
    const a = S0.distanceTo(E), b = E.distanceTo(H);
    const d = Math.min(a + b - 1e-3, Math.max(Math.abs(a - b) + 1e-3, S0.distanceTo(target)));
    const dir = target.clone().sub(S0).normalize();
    const cos = (a * a + d * d - b * b) / (2 * a * d), sin = Math.sqrt(Math.max(0, 1 - cos * cos));
    const p = pole.clone().sub(dir.clone().multiplyScalar(pole.dot(dir))).normalize();
    aim(arm, fore, S0.clone().addScaledVector(dir, cos * a).addScaledVector(p, sin * a));
    aim(fore, hand, target);
  }
  function rowPose(phase) {
    const roll = Math.sin(phase) * 0.5, sweep = Math.cos(phase) * 0.34;
    paddle.position.set(0, chestY + 0.04, 0.36);
    paddle.rotation.set(0, sweep, roll);
    model.updateMatrixWorld(true);
    if (!rig) return;
    rotWorld(B.spine, Q().setFromAxisAngle(UP, sweep * 0.6));
    const mq = model.getWorldQuaternion(Q());
    reach(B.la, B.lf, B.lh, paddle.localToWorld(V().set(0.36, 0, 0)), V().set(1, -0.7, -0.5).applyQuaternion(mq));
    reach(B.ra, B.rf, B.rh, paddle.localToWorld(V().set(-0.36, 0, 0)), V().set(-1, -0.7, -0.5).applyQuaternion(mq));
  }

  const S = { s: 0, target: 0, key: null, state: "idle", until: performance.now() + 1500, yaw: 0, want: 0, x: 0, y: 0, h: 100, w: 66, lift: 0, lost: 0, backAt: 0, mode: "walk", trip: null, kw: 0, kh: 0, z: 0 };
  const B2 = { line: "", shown: 0, until: 0, kind: "say", wait: 0 };
  let emoteUntil = 0, lastInput = performance.now(), dozing = false, wet = false;

  function size() {
    S.h = Math.round(G.person);
    S.w = Math.round(S.h * (U2.framed ? 0.8 : 0.66));
    S.lift = U2.framed ? Math.round(S.h * 0.31) : 0;
    const ppu = S.h / 2;
    if (S.mode === "kayak") {
      const bottom = hipY + 0.02, top = headTop + 0.1, half = 1.2;
      S.kw = Math.round(half * 2 * ppu); S.kh = Math.round((top - bottom) * ppu);
      const rh = Math.max(20, Math.round(S.kh / SCALE)), rw = Math.max(20, Math.round(S.kw / SCALE));
      renderer.setSize(rw, rh, false);
      canvas.style.width = S.kw + "px"; canvas.style.height = S.kh + "px";
      cam.left = -half; cam.right = half; cam.top = (top - bottom) / 2; cam.bottom = -(top - bottom) / 2;
      cam.position.set(0, (top + bottom) / 2, 6); cam.lookAt(0, (top + bottom) / 2, 0);
      U.uRes.value.set(rw, rh);
    } else {
      const base = Math.max(40, Math.round(S.h / SCALE)), half = S.w / S.h, rw = Math.max(26, Math.round(base * half)), rh = base + Math.round((base * S.lift) / S.h);
      renderer.setSize(rw, rh, false);
      canvas.style.width = S.w + "px"; canvas.style.height = S.h + S.lift + "px";
      const aspect = rw / base;
      cam.left = -aspect; cam.right = aspect; cam.top = 1 + (2 * (rh - base)) / base; cam.bottom = -1;
      cam.position.set(0, 0.9, 6); cam.lookAt(0, 0.9, 0);
      U.uRes.value.set(rw, rh);
    }
    cam.updateProjectionMatrix();
  }

  function setMode(m) {
    if (S.mode === m) return;
    S.mode = m;
    paddle.visible = m === "kayak";
    wrap.classList.toggle("is-rowing", m === "kayak");
    if (m === "kayak") { U2.want = false; U2.k = 0; U2.framed = false; umb.visible = false; }
    else U2.want = wet;
    size();
  }

  function headTopY() { return S.mode === "kayak" ? S.y - S.kh : S.y - S.h * 0.95 - S.lift * U2.k; }

  function holdPose() {
    model.updateMatrixWorld(true);
    const mq = model.getWorldQuaternion(Q());
    reach(B.ra, B.rf, B.rh, umb.localToWorld(V().set(0, 0.03, 0)), V().set(-1, -0.6, -0.5).applyQuaternion(mq));
  }

  function umbrellaStep(dt) {
    if (U2.want && !U2.framed && S.mode === "walk") { U2.framed = true; size(); }
    U2.k += ((U2.want ? 1 : 0) - U2.k) * Math.min(1, dt * (U2.want ? 7 : 9));
    if (!U2.want && U2.k < 0.03) { U2.k = 0; if (U2.framed) { U2.framed = false; size(); } }
    umb.visible = U2.k > 0.03 && S.mode === "walk";
    const o = Math.min(1, U2.k * 1.15);
    canopy.scale.set(0.12 + 0.88 * o, 0.5 + 0.5 * o, 0.12 + 0.88 * o);
    canopy.position.y = 0.74 + (1 - o) * -0.18;
  }

  function say(line, kind = "say", ms = 2600) {
    B2.line = line; B2.kind = kind; B2.shown = 0;
    B2.wait = kind === "think" ? performance.now() + 700 : 0;
    B2.until = performance.now() + (kind === "think" ? 700 : 0) + ms;
    bubble.dataset.kind = kind;
    text.textContent = "";
    bubble.classList.toggle("is-dots", kind === "think");
    bubble.classList.remove("on");
    void bubble.offsetWidth;
    bubble.classList.add("on");
  }
  function hush() { bubble.classList.remove("on", "is-dots"); B2.until = 0; }
  function pop(kind, ms = 1500) {
    if (!EMOTES[kind]) return;
    emote.style.setProperty("--e", emoteUrl(EMOTES[kind]));
    emote.classList.remove("on");
    void emote.offsetWidth;
    emote.classList.add("on");
    emoteUntil = performance.now() + ms;
  }
  function stop(line, kind, ms) {
    say(line, kind, ms);
    S.state = "talk"; S.until = performance.now() + (kind === "think" ? 700 : 0) + ms;
    play(kind === "say" && Math.random() < 0.45 ? "wave" : "idle");
    S.want = 0;
  }

  function placeDom() {
    if (S.mode === "kayak") {
      wrap.style.transform = `translate(${Math.round(S.x - S.kw / 2)}px,${Math.round(S.y - S.kh)}px)`;
      wrap.style.zIndex = S.z;
    } else {
      wrap.style.transform = `translate(${Math.round(S.x - S.w / 2)}px,${Math.round(S.y - S.h * 0.95 - S.lift)}px)`;
      wrap.style.zIndex = S.trip && S.trip.phase !== "go" ? Math.max(Math.round(S.y), S.z - 1) : Math.round(S.y);
    }
    const head = headTopY();
    if (bubble.classList.contains("on")) {
      const bw = bubble.offsetWidth || 160, bh = bubble.offsetHeight || 40;
      const right = S.x - 24 + bw > G.W - 4;
      const bx = right ? Math.max(4, S.x + 24 - bw) : Math.max(4, S.x - 24);
      bubble.dataset.side = right ? "l" : "r";
      bubble.style.transform = `translate(${Math.round(bx)}px,${Math.round(head - bh - 10)}px)`;
    }
    if (emote.classList.contains("on")) emote.style.transform = `translate(${Math.round(S.x + S.h * 0.2)}px,${Math.round(head - S.h * 0.05)}px)`;
  }

  function onScreen() {
    const r = wrap.getBoundingClientRect();
    return r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
  }

  function nextStation() {
    const list = G.stations.filter((st) => st.key !== S.key);
    if (G.mode === "tall") {
      const mid = scrollY + innerHeight / 2;
      list.sort((a, b) => Math.abs(a.y - mid) - Math.abs(b.y - mid));
      return list[Math.floor(Math.random() * Math.min(3, list.length))];
    }
    return pick(list);
  }

  function catchUp() {
    hush();
    const mid = scrollY + innerHeight * 0.6;
    let best = 0, bd = Infinity;
    G.path.pts.forEach((p, i) => { const d = Math.abs(p[1] - mid); if (d < bd) { bd = d; best = i; } });
    S.s = G.path.len[best];
    S.state = "idle"; S.until = performance.now() + 600;
    if (performance.now() - S.backAt > 15000) { S.backAt = performance.now(); say(fresh(LINES.back), "say", 1800); }
  }

  const kayakEl = (n) => document.querySelector(`[data-kayak="${n}"]`);
  function moor(T) {
    T.el.classList.remove("is-afloat");
    T.el.style.transform = "";
    T.el.style.zIndex = Math.round(T.kb.y + T.kb.h);
    drawKayak(T.el.querySelector("canvas"), T.n, true);
  }
  function endTrip(silent) {
    const T = S.trip;
    if (!T) return;
    if (T.afloat) moor(T);
    setMode("walk");
    S.trip = null;
    S.s = G.trip.s;
    S.state = "idle"; S.until = performance.now() + (silent ? 600 : 2600);
    if (!silent) { say(fresh(LINES.kayakBack), "say", 2400); play("wave"); }
  }

  function startTrip(n) {
    if (!G.kayaks || !G.kayaks[n] || !kayakEl(n)) return;
    if (S.trip) { say(fresh(LINES.busy), "shout", 1600); pop("alert"); return; }
    const T = { n, el: kayakEl(n), kb: G.kayaks[n], phase: "go", i: 0, p: null, t0: 0, afloat: false };
    S.trip = T;
    S.state = "trip";
    const jy = pointAt(G.trip.s)[1];
    if (!onScreen() || Math.abs(S.s - G.trip.s) > G.W * 1.4 || (G.mode === "tall" && Math.abs(jy - S.y) > innerHeight)) {
      S.s = G.trip.s + (S.s > G.trip.s ? 1 : -1) * Math.min(Math.abs(S.s - G.trip.s), G.speed * 1.5);
    }
    say(fresh(LINES.kayakGo), "say", 1800);
    pop("note", 1200);
  }

  function splash(x, y, w) {
    const k = Math.max(1.6, 2.2 * G.s);
    const e = el("i", "life-splash lv");
    e.style.cssText = `position:absolute;left:${x - w / 2}px;top:${y - w * 0.18}px;width:${w}px;height:${w * 0.36}px;z-index:${Math.round(G.river[0]) + 2};--k:${k.toFixed(2)}`;
    world.append(e);
    setTimeout(() => e.remove(), 800);
  }

  function tripStep(dt, t) {
    const T = S.trip, R0 = G.trip;
    if (T.phase === "go") {
      const d = R0.s - S.s, step = Math.sign(d) * Math.min(Math.abs(d), G.speed * 2.1 * dt);
      const before = pointAt(S.s);
      S.s += step;
      [S.x, S.y] = pointAt(S.s);
      play("run");
      if (Math.abs(S.x - before[0]) + Math.abs(S.y - before[1]) > 0.01) S.want = Math.abs(S.x - before[0]) > Math.abs(S.y - before[1]) * 0.8 ? (S.x > before[0] ? Math.PI / 2 : -Math.PI / 2) : (S.y < before[1] ? Math.PI : 0);
      if (Math.abs(d) < 2) { T.phase = "down"; T.route = R0.down.concat(R0.walk.slice(1)); T.i = 1; }
      return;
    }
    if (T.phase === "down" || T.phase === "up") {
      const route = T.route, target = route[T.i];
      const dx = target[0] - S.x, dy = target[1] - S.y, dist = Math.hypot(dx, dy), step = G.speed * dt;
      play("walk");
      if (dist > 0.5) S.want = Math.abs(dx) > Math.abs(dy) * 0.8 ? (dx > 0 ? Math.PI / 2 : -Math.PI / 2) : (dy < 0 ? Math.PI : 0);
      if (dist <= step) {
        S.x = target[0]; S.y = target[1]; T.i++;
        if (T.i >= route.length) {
          if (T.phase === "down") {
            const kb = T.kb, seat = [kb.x + kb.w / 2, kb.y + kb.h * (11.5 / 28)];
            T.phase = "jump"; T.from = [S.x, S.y]; T.to = seat; T.t0 = t; T.dur = 560;
          } else endTrip(false);
        }
      } else { S.x += (dx / dist) * step; S.y += (dy / dist) * step; }
      return;
    }
    if (T.phase === "jump" || T.phase === "hop") {
      const u = Math.min(1, (t - T.t0) / T.dur), e = u * u * (3 - 2 * u);
      S.x = T.from[0] + (T.to[0] - T.from[0]) * e;
      S.y = T.from[1] + (T.to[1] - T.from[1]) * e - Math.sin(Math.PI * u) * G.person * 0.42;
      S.want = T.to[0] > T.from[0] ? Math.PI / 2 : -Math.PI / 2;
      play("run");
      if (u >= 1) {
        if (T.phase === "jump") {
          T.afloat = true;
          T.el.classList.add("is-afloat");
          drawKayak(T.el.querySelector("canvas"), T.n, false);
          S.z = Math.round(T.kb.y + T.kb.h) + 1;
          setMode("kayak");
          play("idle");
          const [l0, l1] = G.lane, home = T.kb.x + T.kb.w / 2, room = [home - l0, l1 - home];
          const dir = room[1] >= room[0] ? 1 : -1, span = Math.max(room[0], room[1]);
          T.home = home; T.dir = dir; T.out = home + dir * span * R(0.55, 0.95);
          const total = R(10000, 20000), turn = 900, leg = (total - turn) / 2;
          T.t0 = t; T.legs = [leg, turn, leg]; T.phase = "row"; T.said = false; T.lastSplash = 0; T.lastWake = 0;
          splash(S.x, T.kb.y + T.kb.h * 0.62, T.kb.w * 0.9);
          say(fresh(LINES.kayak), "say", 2200);
        } else {
          S.x = T.to[0]; S.y = T.to[1];
          T.phase = "up"; T.route = T.route.slice().reverse(); T.i = 1;
        }
      }
      return;
    }
    if (T.phase === "row") {
      const el0 = t - T.t0, [a, b, c] = T.legs;
      let x, face;
      if (el0 < a) { const u = el0 / a; x = T.home + (T.out - T.home) * (u * u * (3 - 2 * u)); face = T.dir; }
      else if (el0 < a + b) { x = T.out; face = (el0 - a) / b < 0.5 ? T.dir : -T.dir; }
      else if (el0 < a + b + c) { const u = (el0 - a - b) / c; x = T.out + (T.home - T.out) * (u * u * (3 - 2 * u)); face = -T.dir; }
      else {
        x = T.home; face = -T.dir;
        moor(T); T.afloat = false;
        setMode("walk");
        const end = T.route ? T.route[T.route.length - 1] : G.trip.walk[1];
        T.phase = "hop"; T.from = [x, T.kb.y + T.kb.h * 0.2]; T.to = end; T.t0 = t; T.dur = 560;
        T.route = G.trip.down.concat(G.trip.walk.slice(1));
        return;
      }
      const bob = Math.sin(t / 420) * 1.3 * G.s, tilt = Math.sin(t / 530) * 1.2;
      const ease = Math.min(1, el0 / 900, Math.max(0, (a + b + c - el0) / 900)), drop = T.kb.h * 0.5 * ease * ease * (3 - 2 * ease);
      T.el.style.zIndex = Math.round(T.kb.y + T.kb.h + drop) + 3;
      S.z = Math.round(T.kb.y + T.kb.h + drop) + 4;
      S.x = x; S.y = T.kb.y + T.kb.h * (11.5 / 28) + bob + drop;
      S.want = face * 1.05;
      T.el.style.transform = `translate(${(x - T.home).toFixed(1)}px,${(bob + drop).toFixed(1)}px) rotate(${tilt.toFixed(2)}deg) scaleX(${face})`;
      const moving = el0 < a || (el0 > a + b && el0 < a + b + c);
      T.phase2 = (T.phase2 || 0) + dt * (moving ? 3.4 : 1.2);
      if (moving && Math.abs(Math.sin(T.phase2)) > 0.97 && t - T.lastSplash > 420) {
        T.lastSplash = t;
        splash(x + face * Math.sign(Math.sin(T.phase2)) * T.kb.w * 0.05 + face * T.kb.w * 0.32, T.kb.y + T.kb.h * 0.62 + drop, T.kb.w * 0.2);
      }
      if (moving && t - T.lastWake > 380) { T.lastWake = t; splash(x - face * T.kb.w * 0.55, T.kb.y + T.kb.h * 0.7 + drop, T.kb.w * 0.3); }
      if (!T.said && el0 > a * 0.6) { T.said = true; say(fresh(LINES.kayak), Math.random() < 0.3 ? "think" : "say", 2400); if (Math.random() < 0.5) pop(pick(["sweat", "note", "heart"])); }
    }
  }

  document.addEventListener("click", (e) => {
    if (!running || e.target.closest("a,button,.win")) return;
    const r = wrap.getBoundingClientRect();
    if (e.clientX > r.left && e.clientX < r.right && e.clientY > r.top && e.clientY < r.bottom) {
      say(fresh(LINES.poke), "shout", 1800); pop("alert", 1100);
      if (S.state !== "trip") { S.state = "talk"; S.until = performance.now() + 1800; play("wave"); S.want = 0; }
    }
  });
  addEventListener("gz:kayak", (e) => { if (running) startTrip(e.detail); });
  addEventListener("gz:fire", () => { if (running && onScreen() && S.state !== "trip") { say(fresh(LINES.fire), "shout", 2000); pop("alert", 1200); } });
  addEventListener("gz:painted", () => { if (running && S.state !== "trip") { say(fresh(LINES.painted), "say", 2400); pop("heart"); } });
  addEventListener("gz:rain", (e) => {
    const { on, quiet } = e.detail, was = wet;
    wet = on;
    if (S.mode === "walk") U2.want = on;
    if (!running || dozing) return;
    if (on && !was) {
      if (S.state === "trip") { say(fresh(LINES.rainKayak), "say", 2200); return; }
      stop(fresh(LINES.rain), "shout", 2000);
      pop("sweat", 1400);
    } else if (on) {
      if (S.state !== "trip" && onScreen()) { say(fresh(LINES.rainMore), "shout", 1800); pop("alert", 1000); }
    } else if (was && !quiet && S.state !== "trip" && onScreen()) {
      setTimeout(() => { if (running && S.state !== "trip" && !wet) { stop(fresh(LINES.rainbow), "say", 2600); pop("heart"); } }, 700);
    }
  });
  addEventListener("gz:scrub", () => { if (running && S.state !== "trip" && onScreen()) say(fresh(LINES.scrub), "say", 2200); });
  addEventListener("gz:open", (e) => {
    const id = String(e.detail || ""), list = LINES.open[id.startsWith("sec-") ? id.slice(4) : id] || (id.startsWith("p-") ? LINES.open.project : null);
    if (running && list && S.state !== "trip" && onScreen() && Math.random() < 0.6) say(fresh(list), "say", 2200);
  });
  const touch = () => {
    lastInput = performance.now();
    if (dozing) { dozing = false; if (running && S.state !== "trip") { say(fresh(LINES.wake), "say", 2000); pop("alert", 900); S.state = "talk"; S.until = performance.now() + 2000; } }
  };
  ["pointermove", "keydown", "scroll", "touchstart"].forEach((ev) => addEventListener(ev, touch, { passive: true }));

  size();
  S.s = G.stations.length ? G.stations[Math.floor(Math.random() * G.stations.length)].s : 0;
  [S.x, S.y] = pointAt(S.s);
  const hr = new Date().getHours();
  const hello = hr >= 5 && hr < 11 ? LINES.morning : hr >= 18 && hr < 22 ? LINES.evening : hr >= 22 || hr < 5 ? LINES.night : null;
  if (hello) setTimeout(() => { if (running && S.state !== "trip") stop(fresh(hello), "say", 2800); }, 900);

  let acc = 0, lastT = performance.now();
  function frame(t) {
    if (!running) return;
    requestAnimationFrame(frame);
    if (document.hidden) { lastT = t; return; }
    const dt = Math.min(0.1, (t - lastT) / 1000);
    lastT = t; acc += dt;
    if (G.mode === "tall" && S.state !== "trip" && !document.documentElement.classList.contains("lock")) {
      if (!onScreen()) { S.lost += dt; if (S.lost > 1.2) { S.lost = 0; catchUp(); } } else S.lost = 0;
    }
    if (!dozing && S.state !== "trip" && t - lastInput > 60000) {
      dozing = true; S.state = "talk"; S.until = Infinity; play("idle"); S.want = 0;
      say(fresh(LINES.zzz), "think", 600000); pop("zzz", 600000);
    }
    if (S.state === "trip") tripStep(dt, t);
    else if (S.state === "walk") {
      const d = S.target - S.s, step = Math.sign(d) * Math.min(Math.abs(d), G.speed * dt);
      const before = pointAt(S.s);
      S.s += step;
      const after = pointAt(S.s), dx = after[0] - before[0], dy = after[1] - before[1];
      if (Math.abs(d) < 2) {
        S.s = S.target;
        const lines = LINES[S.key] || LINES.think;
        stop(fresh(lines), Math.random() < 0.25 ? "think" : "say", 2600 + Math.random() * 1200);
      } else {
        play("walk");
        if (Math.abs(dx) + Math.abs(dy) > 0.01) S.want = Math.abs(dx) > Math.abs(dy) * 0.8 ? (dx > 0 ? Math.PI / 2 : -Math.PI / 2) : (dy < 0 ? Math.PI : 0);
      }
    } else if (S.state === "talk") {
      if (t > S.until) { S.state = "idle"; S.until = t + R(1500, 4500); play("idle"); }
    } else if (t > S.until) {
      const roll = Math.random();
      if (roll < 0.14) stop(fresh(wet ? LINES.wet : LINES.think), "think", 3200);
      else if (roll < 0.19) { pop("idea", 1400); setTimeout(() => { if (running && S.state !== "trip") stop(fresh(LINES.idea), "say", 2800); }, 900); S.state = "talk"; S.until = t + 1000; }
      else { const st = nextStation(); if (st) { hush(); S.key = st.key; S.target = st.s; S.state = "walk"; if (Math.random() < 0.25) pop("note", 1300); } }
    }
    if (bubble.classList.contains("on")) {
      if (B2.wait && t > B2.wait) { B2.wait = 0; bubble.classList.remove("is-dots"); }
      if (!B2.wait && B2.shown < B2.line.length) {
        B2.shown = Math.min(B2.line.length, B2.shown + (B2.kind === "think" ? 26 : B2.kind === "shout" ? 400 : 42) * dt);
        text.textContent = B2.line.slice(0, Math.floor(B2.shown));
      }
      if (t > B2.until) hush();
    }
    if (emote.classList.contains("on") && t > emoteUntil) emote.classList.remove("on");
    let dyaw = S.want - S.yaw; dyaw = Math.atan2(Math.sin(dyaw), Math.cos(dyaw)); S.yaw += dyaw * Math.min(1, dt * 9);
    model.rotation.y = S.yaw;
    if (S.state !== "trip") [S.x, S.y] = pointAt(S.s);
    umbrellaStep(dt);
    if (acc >= 1 / 15) {
      mixer.update(acc); acc = 0;
      if (S.mode === "kayak") rowPose((S.trip && S.trip.phase2) || 0);
      else if (rig && umb.visible) holdPose();
    }
    placeDom();
    renderer.render(scene, cam);
  }

  running = true;
  wrap.classList.add("on");
  requestAnimationFrame(frame);
  return {
    relayout() {
      if (S.trip) endTrip(true);
      if (world && wrap.parentNode !== world) world.append(wrap, bubble, emote);
      size(); S.s = Math.min(S.s, G.path.total); S.target = Math.min(S.target, G.path.total);
    },
    pause() { if (S.trip) endTrip(true); running = false; wrap.remove(); bubble.remove(); emote.remove(); },
    resume() { if (running) return; world.append(wrap, bubble, emote); running = true; lastT = performance.now(); requestAnimationFrame(frame); },
  };
}

async function boot() {
  if (booted || disabled || calm) return;
  booted = true;
  const { softGL } = await import("/assets/boot.mjs");
  if (await softGL()) return;
  const go = () => {
    if (!G && window.gzMap) { G = window.gzMap.geo; world = window.gzMap.world; }
    if (!G) { addEventListener("gz:map", go, { once: true }); return; }
    start().then((a) => { api = a; }).catch(() => { booted = false; });
  };
  if (document.readyState === "complete") setTimeout(go, 1200);
  else addEventListener("load", () => setTimeout(go, 1200));
}

boot();
