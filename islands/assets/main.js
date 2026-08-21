// Boot, render loop, camera, lighting, and the glue between world, player, cards and net.

import * as THREE from "three";
import { RoomEnvironment } from "room-env";
import { buildWorld, loadProps, firstMesh, labelSprite } from "island/world";
import { Player, Remote, Controls } from "island/player";
import { WorldCard } from "island/cards";
import { Net, pickColor } from "island/net";
import { ISLANDS, islandFromLocation, DISTRICTS } from "island/islands";

const ISLAND = ISLANDS[islandFromLocation()];
const canvas = document.getElementById("scene");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
const isCoarse = matchMedia("(pointer: coarse)").matches;
renderer.setPixelRatio(Math.min(devicePixelRatio, isCoarse ? 1.6 : 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.98;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xc2d6d6, 118, 232);

function skyTexture() {
  const c = document.createElement("canvas");
  c.width = 4; c.height = 256;
  const ctx = c.getContext("2d");
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, "#8fb6c9");
  g.addColorStop(0.55, "#c3d9d9");
  g.addColorStop(1, "#dbe6d6");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
scene.background = skyTexture();

const VIEW = 26;
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.5, 400);
const camOffset = new THREE.Vector3(62, 62, 62);

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  const aspect = w / h;
  const size = VIEW * (isCoarse ? 1.18 : 1) * (aspect < 0.85 ? 1.25 : 1);
  const halfH = size / 2, halfW = halfH * aspect;
  camera.left = -halfW; camera.right = halfW;
  camera.top = halfH; camera.bottom = -halfH;
  camera.updateProjectionMatrix();
}
addEventListener("resize", resize);
resize();

scene.add(new THREE.HemisphereLight(0xd3ecf7, 0x36452c, 0.62));
const sun = new THREE.DirectionalLight(0xfff2d4, 3.05);
sun.position.set(38, 56, 26);
sun.castShadow = true;
sun.shadow.mapSize.set(isCoarse ? 1024 : 2048, isCoarse ? 1024 : 2048);
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 190;
const S = 44;
sun.shadow.camera.left = -S; sun.shadow.camera.right = S;
sun.shadow.camera.top = S; sun.shadow.camera.bottom = -S;
sun.shadow.bias = -0.0012;
sun.shadow.normalBias = 0.035;
scene.add(sun, sun.target);

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.02).texture;
scene.environmentIntensity = 0.22;

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function clean(t) {
  return String(t == null ? "" : t).replace(/\s*—\s*/g, ", ").replace(/\s*–\s*/g, ", ");
}

async function loadEntries() {
  const cfg = await fetch(ISLAND.file, { cache: "no-cache" }).then((r) => r.json());
  if (cfg.source !== "labs") {
    return cfg.entries.map((e) => ({
      ...e,
      name: clean(e.name),
      blurb: clean(e.blurb),
      body: (e.body || []).map(clean)
    }));
  }
  const shelf = await fetch("/data/projects.json", { cache: "no-cache" }).then((r) => r.json());
  const bySlug = new Map(shelf.projects.map((p) => [p.slug, p]));
  return cfg.entries.map((ref) => {
    const p = bySlug.get(ref.slug);
    if (!p) return null;
    return {
      slug: p.slug,
      name: clean(p.name),
      category: ref.category || p.category,
      status: p.status,
      year: p.year,
      url: p.url,
      repo: p.repo,
      image: p.image ? "/project-images/" + p.image.split("/").pop() : "",
      blurb: clean(p.blurb),
      body: (p.body || []).map(clean)
    };
  }).filter(Boolean);
}

function chestTexture() {
  const c = document.createElement("canvas");
  c.width = 700; c.height = 250;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#eef0e8";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = "#15180f";
  ctx.textAlign = "center";
  ctx.font = "700 62px 'Fragment Mono', monospace";
  ctx.fillText("GZOWO", c.width / 2, 96);
  ctx.font = "500 34px 'Fragment Mono', monospace";
  ctx.fillText("BUILDS THINGS THAT FLY", c.width / 2, 156);
  ctx.font = "500 26px 'Fragment Mono', monospace";
  ctx.fillStyle = "rgba(21,24,15,0.55)";
  ctx.fillText("EST. GZOWO", c.width / 2, 206);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function qrTexture() {
  const N = 25, px = 16, pad = 24;
  const c = document.createElement("canvas");
  c.width = c.height = N * px + pad * 2;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#eef0e8";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = "#15180f";
  let seed = 20260821;
  const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  const finder = (gx, gy) => {
    for (let y = 0; y < 7; y++) {
      for (let x = 0; x < 7; x++) {
        const edge = x === 0 || y === 0 || x === 6 || y === 6;
        const core = x >= 2 && x <= 4 && y >= 2 && y <= 4;
        if (edge || core) ctx.fillRect(pad + (gx + x) * px, pad + (gy + y) * px, px, px);
      }
    }
  };
  const inFinder = (x, y) =>
    (x < 8 && y < 8) || (x > N - 9 && y < 8) || (x < 8 && y > N - 9);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      if (inFinder(x, y)) continue;
      if (rnd() > 0.52) ctx.fillRect(pad + x * px, pad + y * px, px, px);
    }
  }
  finder(0, 0); finder(N - 7, 0); finder(0, N - 7);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function decorate(lib) {
  const maps = { M_decal: chestTexture(), M_decalB: qrTexture() };
  lib["JK"].traverse((o) => {
    if (!o.isMesh) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) {
      if (m && maps[m.name]) {
        m.map = maps[m.name];
        m.color.setHex(0xffffff);
        m.needsUpdate = true;
      }
    }
  });
}

const hud = {
  count: document.getElementById("count"),
  bar: document.getElementById("count-bar"),
  mini: document.getElementById("mini"),
  peers: document.getElementById("peers"),
  hint: document.getElementById("hint"),
  name: document.getElementById("island-name")
};

let state = null;

async function boot() {
  hud.name.textContent = ISLAND.name;
  document.getElementById("veil-name").textContent = ISLAND.name;
  document.title = ISLAND.name + " island";

  const [lib, entries] = await Promise.all([
    loadProps("assets/props.glb"),
    loadEntries()
  ]);
  decorate(lib);

  const built = buildWorld(scene, entries, ISLAND.landmarks, lib);
  const beaconSrc = firstMesh(lib["Beacon"]);

  const hostAv = lib[ISLAND.avatar].clone(true);
  hostAv.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = true; o.receiveShadow = true;
    if (!ISLAND.avatarColor) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    o.material = (Array.isArray(o.material) ? mats : [mats[0]]).map((m) => {
      if (m && m.name === "M_tee") { const cl = m.clone(); cl.color.setHex(ISLAND.avatarColor); return cl; }
      return m;
    });
    if (!Array.isArray(o.material)) o.material = o.material[0];
  });
  hostAv.position.set(0, 1, -1);
  hostAv.rotation.y = Math.PI * 1.25;
  built.world.add(hostAv);
  const hostItem = {
    id: "host", type: "host", x: 0, z: -1, radius: 5.6,
    data: { label: ISLAND.name, lines: ISLAND.lines },
    label: null, beacon: null
  };

  const hl = labelSprite(ISLAND.name, "TALK TO ME", { size: 40, subSize: 22, unit: 74, accent: "#e6d08a" });
  hl.position.set(0, 4.9, -1);
  built.world.add(hl);
  hostItem.label = hl;
  const hb = new THREE.Mesh(beaconSrc.geometry, beaconSrc.material.clone());
  hb.position.set(0, 4.4, -1);
  hb.castShadow = false;
  built.world.add(hb);
  hostItem.beacon = hb;
  built.blockers.push([0, -1, 1.0]);
  built.interactables.push(hostItem);

  const color = pickColor();
  const player = new Player(lib, "PL", color, built.world, built.terrain, built.blockers, [0, 8]);

  const proxies = [];
  const proxyMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
  const PROXY = { project: [5.0, 6.6, 3.3], landmark: [4.4, 6.0, 3.0], host: [2.2, 3.2, 1.7] };
  for (const it of built.interactables) {
    const [w, h, y] = PROXY[it.type];
    const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), proxyMat);
    box.position.set(it.x, 1 + y, it.z);
    box.userData.item = it;
    scene.add(box);
    proxies.push(box);
    it.label.userData.item = it;
  }
  const labelProxies = built.interactables.map((it) => it.label);

  const card = new WorldCard(scene);
  const found = new Set(JSON.parse(localStorage.getItem("islands.found." + ISLAND.key) || "[]"));
  const total = built.interactables.length;

  function renderCount() {
    hud.count.textContent = String(found.size).padStart(2, "0") + " / " + total;
    hud.bar.style.transform = "scaleX(" + (found.size / total) + ")";
  }
  function discover(id) {
    if (found.has(id)) return;
    found.add(id);
    localStorage.setItem("islands.found." + ISLAND.key, JSON.stringify([...found]));
    renderCount();
  }
  renderCount();

  let talk = null;

  function openItem(it) {
    discover(it.id);
    const at = new THREE.Vector3(it.x + 2.6, 6.4, it.z + 2.6);
    if (it.type === "project") {
      talk = null;
      card.showProject(it.data, at);
      card.owner = it;
    } else {
      talk = { item: it, i: 0 };
      card.showSpeech(it.data.label, it.data.lines, 0, at);
      card.owner = it;
    }
  }

  function act(action) {
    if (!action) return;
    if (action.type === "link") {
      window.open(action.href, "_blank", "noopener");
    } else if (action.type === "close") {
      talk = null;
      card.close();
    } else if (action.type === "back") {
      if (!talk) return;
      if (talk.i === 0) { talk = null; card.close(); return; }
      talk.i--;
      card.showSpeech(talk.item.data.label, talk.item.data.lines, talk.i, card.anchor.clone());
    } else if (action.type === "next") {
      if (!talk) return;
      if (talk.i >= talk.item.data.lines.length - 1) { talk = null; card.close(); return; }
      talk.i++;
      card.showSpeech(talk.item.data.label, talk.item.data.lines, talk.i, card.anchor.clone());
    }
  }

  const controls = new Controls(canvas, camera, () => player.position, (cx, cy) => {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((cx - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((cy - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);

    const onCard = raycaster.intersectObjects(card.hitTargets(), false);
    if (onCard.length) { act(onCard[0].object.userData.button.action); return; }

    const tagged = raycaster.intersectObjects(labelProxies.filter((l) => l.visible), false);
    if (tagged.length) { openItem(tagged[0].object.userData.item); return; }

    const hits = raycaster.intersectObjects(proxies, false);
    if (hits.length) { openItem(hits[0].object.userData.item); return; }

    talk = null;
    card.close();
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { talk = null; card.close(); }
    else if (talk && (e.key === " " || e.key === "Enter")) { e.preventDefault(); act({ type: "next" }); }
    else if (talk && e.key === "Backspace") { e.preventDefault(); act({ type: "back" }); }
  });

  canvas.addEventListener("pointermove", (e) => {
    const targets = card.hitTargets();
    if (!targets.length) return;
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(targets, false);
    const on = hit.length ? hit[0].object.userData.button : null;
    for (const b of card.buttons) b.setHover(b === on);
    canvas.style.cursor = on ? "pointer" : "";
  });

  const net = new Net(ISLAND.key, color);
  const remotes = new Map();
  net.onJoin = (id, p) => {
    const r = new Remote(lib, built.world, p.c);
    r.root.position.set(p.x, 1, p.z);
    r.set(p.x, p.z, p.r);
    remotes.set(id, r);
    updatePeers();
  };
  net.onMove = (id, p) => {
    const r = remotes.get(id);
    if (r) r.set(p.x, p.z, p.r);
  };
  net.onLeave = (id) => {
    const r = remotes.get(id);
    if (r) { r.dispose(built.world); remotes.delete(id); }
    updatePeers();
  };
  net.onStatus = (s) => {
    hud.peers.dataset.state = s;
    updatePeers();
  };
  function updatePeers() {
    const n = remotes.size;
    hud.peers.textContent = net.failed ? "solo" : n === 0 ? "only you" : n === 1 ? "1 other here" : n + " others here";
  }
  updatePeers();
  net.start();

  const T = built.terrain;
  const MW = 180, MH = 154;
  hud.mini.width = MW * 2; hud.mini.height = MH * 2;
  const mctx = hud.mini.getContext("2d");
  mctx.scale(2, 2);
  const miniBase = document.createElement("canvas");
  miniBase.width = MW; miniBase.height = MH;
  const bctx = miniBase.getContext("2d");
  const sx = MW / T.GW, sz = MH / T.GH;
  for (let gz = 0; gz < T.GH; gz++) {
    for (let gx = 0; gx < T.GW; gx++) {
      const k = T.kind[gz * T.GW + gx];
      if (!k) continue;
      bctx.fillStyle = k === 2 ? "#d8dcd2" : k === 3 ? "#8a8352" : "#5c8a4a";
      bctx.fillRect(gx * sx, gz * sz, Math.ceil(sx), Math.ceil(sz));
    }
  }
  function drawMini() {
    mctx.clearRect(0, 0, MW, MH);
    mctx.drawImage(miniBase, 0, 0);
    for (const it of built.interactables) {
      const x = (it.x - T.X0) * sx, y = (it.z - T.Z0) * sz;
      const seen = found.has(it.id);
      mctx.fillStyle = seen ? (it.type === "project" ? "#17190f" : "#e08b2c") : "rgba(23,25,15,0.28)";
      mctx.beginPath();
      mctx.arc(x, y, seen ? 2.6 : 1.8, 0, 6.283);
      mctx.fill();
    }
    for (const r of remotes.values()) {
      mctx.fillStyle = "rgba(255,255,255,0.75)";
      mctx.beginPath();
      mctx.arc((r.root.position.x - T.X0) * sx, (r.root.position.z - T.Z0) * sz, 2.4, 0, 6.283);
      mctx.fill();
    }
    const px = (player.position.x - T.X0) * sx, py = (player.position.z - T.Z0) * sz;
    mctx.fillStyle = "#ffffff";
    mctx.strokeStyle = "#17190f";
    mctx.lineWidth = 1.4;
    mctx.beginPath();
    mctx.arc(px, py, 3.4, 0, 6.283);
    mctx.fill();
    mctx.stroke();
  }

  state = { built, player, controls, card, drawMini, discover, found, net, remotes, getTalk: () => talk };

  state.started = true;
  document.getElementById("veil").classList.add("gone");
  document.getElementById("hudbar").classList.add("on");
  hud.hint.textContent = isCoarse
    ? "Hold anywhere to walk, tap a board to open it"
    : "WASD or arrows to walk, click a board to open it";
  hud.hint.classList.add("on");
  setTimeout(() => hud.hint.classList.remove("on"), 6500);
  setTimeout(() => { document.getElementById("veil").style.display = "none"; }, 800);
}

const clock = new THREE.Clock();
const camTarget = new THREE.Vector3(0, 1, 8);

function tick() {
  requestAnimationFrame(tick);
  const dt = Math.min(0.05, clock.getDelta());
  const t = clock.elapsedTime;

  if (state) {
    const { player, controls, built, card, remotes, net } = state;
    player.update(dt, state.started ? controls.direction() : { x: 0, z: 0 });
    net.send(player.position.x, player.position.z, player.root.rotation.y);

    for (const r of remotes.values()) r.update(dt);

    camTarget.lerp(player.position, Math.min(1, dt * 6.5));
    camera.position.copy(camTarget).add(camOffset);
    camera.lookAt(camTarget);
    sun.position.copy(camTarget).add(new THREE.Vector3(38, 56, 26));
    sun.target.position.copy(camTarget);
    sun.target.updateMatrixWorld();

    for (const it of built.interactables) {
      const d = Math.hypot(it.x - player.position.x, it.z - player.position.z);
      const vis = d < 16;
      it.label.visible = vis;
      if (vis) it.label.material.opacity = Math.min(1, (16 - d) / 5);
      const seen = state.found.has(it.id);
      it.beacon.visible = !seen;
      if (!seen) {
        if (it.beaconY === undefined) it.beaconY = it.beacon.position.y;
        it.beacon.position.y = it.beaconY + Math.sin(t * 2.2 + it.x) * 0.22;
        it.beacon.rotation.y = t * 1.4;
      }
      if (state.started && d < it.radius) state.discover(it.id);
    }

    for (const dl of built.districtSigns) {
      const d = Math.hypot(dl.x - player.position.x, dl.z - player.position.z);
      const target = card.open || d <= 18 || d >= 86 ? 0 : 0.92;
      dl.sprite.material.opacity += (target - dl.sprite.material.opacity) * Math.min(1, dt * 4);
      dl.sprite.visible = dl.sprite.material.opacity > 0.01;
    }

    if (card.owner && card.open) {
      const d = Math.hypot(card.owner.x - player.position.x, card.owner.z - player.position.z);
      if (d > card.owner.radius * 2.6) card.close();
    }
    card.update(dt, camera);
    state.drawMini();
  }

  renderer.render(scene, camera);
}

boot().catch((err) => {
  console.error(err);
  document.getElementById("veil-note").textContent = "Something broke while loading. Reload?";
});
tick();
