/* The Big Wall at gzowo.fun/wall/: the shared spray wall of the plot as a 3D pixel world. The bottom 3.2 m are the same strokes,
   tape and stencils as the 2D wall, above it the wall rises to 12 m. A scissor lift reaches the top, a drone flies back for a photo
   and a boombox plays CC0 songs. Painting runs through the 2D wall's own core, attached as a host with a virtual camera. */

import * as THREE from "three";
import { createMural, paintOp, wallIcon } from "/assets/mural.mjs";
import { wallFace, wallTall } from "/assets/map.mjs";
import { picker, cutter } from "/assets/stencil.mjs";
import { PAL, FROZEN, seasonal } from "/assets/season.mjs";
import { me as wallet, code as walletCode, api as bank, ensure } from "/assets/bank.mjs";

const U = 0.01, WX = 1000, WY = 323, UPH = 877, ARTY = 323 / 129, TW = 250, TH = 300, RF = 0.5, RN = 2.4;
const WALL_H = (WY + UPH) * U, THICK = 0.4, EYE = 1.65, RAD = 0.28;
const X = (ux) => ux * U, Y = (uy) => (WY - uy) * U;
const SND = "/assets/wall3d/", SPR = "/assets/map/";
const TOOLS = [["spray", "Spray"], ["chalk", "Chalk"], ["neon", "Neon"], ["bands", "Rainbow"], ["roller", "Roller"], ["eraser", "Eraser"], ["wipe", "Wipe"], ["tape", "Tape"], ["stencil", "Stencil"]];
const REACH = { spray: 3.2, bands: 3.2, neon: 3.2, roller: 1.15, wipe: 1.15, chalk: 1.05, eraser: 1.05, tape: 2.4, stencil: 2.8 };
const SKY = PAL.sky || ["#3a74d6", "#4381dd", "#4e8ee3", "#5a9be8", "#68a8ee", "#78b5f2", "#8ac2f6", "#9ecff9"];
const GRASS = [PAL.grass.top, PAL.grass.bottom, PAL.grass.dark, PAL.grass.darker, PAL.grass.light, PAL.grass.bottom];
const FLOWERS = PAL.flowerCols.length ? (PAL.leaves ? [...PAL.flowerCols, ...PAL.leaves, ...PAL.leaves] : PAL.flowerCols) : ["#ffffff", "#e8f0f8"];
const RAINBOW = ["#ff2d2d", "#ff8a00", "#ffe600", "#38e03b", "#00e5ff", "#2f6bff", "#b14bff"];
const SONGS = [["song1.mp3", "Peaceful Hip Hop", "shortiefoeva2"], ["song2.mp3", "Easy Going", "Seth_Makes_Sounds"], ["song3.mp3", "Dayum", "loveless1017"]];
const LIFT = { len: 2.6, dep: 1.2, deck: 1.0, max: 10.4, speed: 0.85, drive: 1.6 };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const hex3 = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const toHex = (c) => "#" + c.map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, "0")).join("");
const hsv2rgb = (h, s, v) => { const f = (n) => { const k = (n + h / 60) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)); }; return [f(5), f(3), f(1)].map((x) => Math.round(x * 255)); };
const rgb2hsv = ([r, g, b]) => { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), d = mx - Math.min(r, g, b); let h = 0; if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return [(h * 60 + 360) % 360, mx ? d / mx : 0, mx]; };
const mixHex = (a, b, t) => toHex(hex3(a).map((v, i) => v + (hex3(b)[i] - v) * t));
const tone = (rgb, f) => rgb.map((v) => clamp(Math.round(f >= 0 ? v + (255 - v) * f : v * (1 + f)), 0, 255));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
function hash(a, b, k = 0) {
  let h = Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) + Math.imul(k | 0, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
const TOUCH_ONLY = matchMedia("(pointer: coarse)").matches && !matchMedia("(any-pointer: fine)").matches;

const root = document.getElementById("w3");
if (TOUCH_ONLY) {
  root.innerHTML = `<div class="w3-phone"><div class="w3-card"><header class="tb"><h2 class="tb-t">The Big Wall</h2></header><div class="w3-pad"><p><b>The big wall needs a computer.</b> You walk with the keyboard and look and spray with the mouse.</p><p>On a phone you can paint the same wall on the map.</p><p><a class="btn" href="/">Back to the map</a></p></div></div></div>`;
} else start();

function start() {
  const cv = root.querySelector(".w3-cv");
  const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.autoClear = false;
  const MAXA = Math.min(4, renderer.capabilities.getMaxAnisotropy());

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(SKY[7], 45, 200);
  let ui = null;
  const camera = new THREE.PerspectiveCamera(70, 1, 0.08, 700);
  camera.rotation.order = "YXZ";
  const hud = new THREE.Scene(), hudCam = new THREE.PerspectiveCamera(55, 1, 0.01, 10);
  hud.add(new THREE.HemisphereLight(0xffffff, 0x6a7a8a, 1.7));
  const sunL = new THREE.DirectionalLight(0xffffff, 1.2);
  sunL.position.set(-0.5, 1, 0.6);
  hud.add(sunL);
  let DPRX = Math.min(1.5, devicePixelRatio || 1), slow = 0;
  function resize() {
    renderer.setPixelRatio(DPRX);
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = hudCam.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    hudCam.updateProjectionMatrix();
  }
  resize();
  addEventListener("resize", resize);

  const pix = (t, rep) => {
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestMipmapLinearFilter;
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = MAXA;
    if (rep) t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  };
  const canvas = (w, h) => Object.assign(document.createElement("canvas"), { width: w, height: h });
  function texOf(w, h, draw, rep) { const c = canvas(w, h), x = c.getContext("2d"); draw(x, w, h); return pix(new THREE.CanvasTexture(c), rep); }
  function dots(x, w, h, cols, k, n) { for (let i = 0; i < n; i++) { x.fillStyle = cols[Math.floor(hash(i, k, 1) * cols.length)]; x.fillRect(Math.floor(hash(i, k, 2) * w), Math.floor(hash(i, k, 3) * h), 1, 1); } }
  const loader = new THREE.TextureLoader(), sprites = {};
  ["tree1", "tree2", "tree3", "pine", "bush", "lamp", "cloud1", "cloud2", "cloud3", "cloud4", "sun", "bench"].forEach((k) => {
    if (!/^cloud|^sun/.test(k)) {
      const tex = pix(new THREE.Texture()), im = new Image();
      im.src = SPR + k + ".webp";
      im.decode().then(() => { tex.image = seasonal(im, k); tex.needsUpdate = true; }, () => {});
      sprites[k] = tex;
    } else sprites[k] = pix(loader.load(SPR + k + ".webp"));
  });
  const SIZE = { tree1: [98, 103], tree2: [72, 101], tree3: [82, 90], pine: [85, 118], bush: [64, 63], lamp: [24, 97], cloud1: [141, 75], cloud2: [161, 77], cloud3: [194, 70], cloud4: [137, 64], sun: [85, 87], bench: [99, 49] };
  const spriteMats = {};
  function sprite(k, h, fog = true) {
    if (!spriteMats[k + fog]) spriteMats[k + fog] = new THREE.SpriteMaterial({ map: sprites[k], alphaTest: 0.5, fog });
    const s = new THREE.Sprite(spriteMats[k + fog]), [w, hh] = SIZE[k];
    s.scale.set((h * w) / hh, h, 1);
    s.center.set(0.5, 0);
    return s;
  }

  const sky = new THREE.Group();
  scene.add(sky);
  {
    const t = texOf(4, 256, (x, w, h) => {
      for (let y = 0; y < h; y++) {
        const v = 1 - y / h, k = clamp((v - 0.5) / 0.42, 0, 1), f = k * 7.99, i = Math.floor(f), dith = (f - i) > ((y * 7 + 3) % 4) / 4;
        x.fillStyle = SKY[clamp(7 - i - (dith ? 1 : 0), 0, 7)];
        x.fillRect(0, y, w, 1);
      }
    });
    t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
    sky.add(new THREE.Mesh(new THREE.SphereGeometry(600, 24, 16), new THREE.MeshBasicMaterial({ map: t, side: THREE.BackSide, fog: false, depthWrite: false })));
    const sun = sprite("sun", 42, false);
    sun.center.set(0.5, 0.5);
    sun.position.set(-160, 260, 420);
    sky.add(sun);
  }
  const clouds = [];
  for (let i = 0; i < 14; i++) {
    const c = sprite("cloud" + (1 + (i % 4)), 18 + hash(i, 9) * 18, false);
    c.center.set(0.5, 0.5);
    c.userData = { a: hash(i, 3) * Math.PI * 2, r: 330 + hash(i, 4) * 120, y: 90 + hash(i, 5) * 110, s: 0.004 + hash(i, 6) * 0.006 };
    sky.add(c);
    clouds.push(c);
  }

  const groundMat = new THREE.MeshBasicMaterial({ map: texOf(64, 64, (x, w, h) => { x.fillStyle = GRASS[1]; x.fillRect(0, 0, w, h); dots(x, w, h, GRASS, 1, 900); for (let i = 0; i < 40; i++) { const gx = Math.floor(hash(i, 7) * w), gy = Math.floor(hash(i, 8) * h); x.fillStyle = GRASS[4]; x.fillRect(gx, gy, 1, 2); x.fillStyle = GRASS[3]; x.fillRect(gx, gy + 2, 1, 1); } }, true) });
  groundMat.map.repeat.set(150, 80);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 320), groundMat);
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);
  const gravel = new THREE.Mesh(new THREE.PlaneGeometry(600, 0.7), new THREE.MeshBasicMaterial({ map: texOf(32, 8, (x, w, h) => { x.fillStyle = "#c9b089"; x.fillRect(0, 0, w, h); dots(x, w, h, ["#a98f67", "#e2cfa8", "#8d7756", "#d6c09a"], 2, 120); x.fillStyle = "rgba(0,0,0,.25)"; x.fillRect(0, 0, w, 1); }, true), polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }));
  gravel.material.map.repeat.set(300, 1);
  gravel.rotation.x = -Math.PI / 2;
  scene.add(gravel);
  const waterTex = texOf(64, 32, (x, w, h) => {
    x.fillStyle = FROZEN ? "#cfe2f0" : "#3b86c9"; x.fillRect(0, 0, w, h);
    dots(x, w, h, FROZEN ? ["#e6f1f9", "#bcd6ea", "#f4f8fc"] : ["#2f74b5", "#4a97d8", "#2a6aa8"], 3, 300);
    for (let i = 0; i < 26; i++) { const gx = Math.floor(hash(i, 11) * w), gy = Math.floor(hash(i, 12) * h); x.fillStyle = FROZEN ? (i % 3 ? "#9dbfd6" : "#ffffff") : i % 3 ? "#8cc8f2" : "#ffffff"; x.fillRect(gx, gy, 3 + Math.floor(hash(i, 13) * 4), 1); }
  }, true);
  waterTex.repeat.set(120, 3);
  const river = new THREE.Mesh(new THREE.PlaneGeometry(600, 10), new THREE.MeshBasicMaterial({ map: waterTex, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }));
  river.rotation.x = -Math.PI / 2;
  scene.add(river);
  const bankMat = new THREE.MeshBasicMaterial({ map: texOf(16, 4, (x, w, h) => { x.fillStyle = "#3f8f35"; x.fillRect(0, 0, w, h); dots(x, w, h, ["#2f7a28", "#4fa043", "#8d7756"], 4, 20); }, true), polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 });
  bankMat.map.repeat.set(600, 1);
  const banks = [11.75, 22.25].map((z) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(600, 0.5), bankMat); m.rotation.x = -Math.PI / 2; m.position.z = z; scene.add(m); return m; });
  function followGround(px) {
    const s = Math.round(px / 4) * 4;
    ground.position.set(s, 0, -40);
    gravel.position.set(Math.round(px / 2) * 2, 0.004, 0.35);
    river.position.set(Math.round(px / 5) * 5, 0.006, 17);
    banks.forEach((b) => { b.position.x = Math.round(px / 1) * 1; b.position.y = 0.008; });
  }

  const flowerMat = new THREE.PointsMaterial({ size: 0.07, vertexColors: true, sizeAttenuation: true });
  const chunks = new Map(), CH = 24;
  function chunk(c) {
    const g = new THREE.Group(), r = (i, k) => hash(c * 97 + i, k, 77);
    const trees = ["tree1", "tree2", "tree3", "pine"];
    for (let i = 0; i < 7; i++) { const s = sprite(trees[Math.floor(r(i, 1) * 4)], 6 + r(i, 2) * 5); s.position.set(c * CH + r(i, 3) * CH, 0, 24 + r(i, 4) * 26); g.add(s); }
    for (let i = 0; i < 4; i++) { const s = sprite("bush", 0.8 + r(i, 5) * 0.6); s.position.set(c * CH + r(i, 6) * CH, 0, 11.15 + r(i, 7) * 0.35); g.add(s); }
    for (let i = 0; i < 5; i++) { const s = sprite(trees[Math.floor(r(i, 8) * 4)], 7 + r(i, 9) * 5); s.position.set(c * CH + r(i, 10) * CH, 0, -4 - r(i, 11) * 26); g.add(s); }
    if (c < 0) for (let i = 0; i < 6; i++) { const s = sprite(trees[Math.floor(r(i, 12) * 4)], 6 + r(i, 13) * 5); s.position.set(c * CH + r(i, 14) * CH, 0, -2 + r(i, 15) * 11); if (s.position.x < -3) g.add(s); }
    const lamp = sprite("lamp", 3.4);
    lamp.position.set(c * CH + 12, 0, 10.9);
    g.add(lamp);
    if (r(0, 20) < 0.45) { const b = sprite("bench", 0.9); b.position.set(c * CH + 5 + r(0, 21) * 12, 0, 10.6); g.add(b); }
    const n = 140, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), tmp = new THREE.Color();
    for (let i = 0; i < n; i++) {
      pos[i * 3] = c * CH + r(i, 30) * CH; pos[i * 3 + 1] = 0.04; pos[i * 3 + 2] = 0.9 + r(i, 31) * 10.2;
      tmp.set(FLOWERS[Math.floor(r(i, 32) * FLOWERS.length)]).convertSRGBToLinear();
      col[i * 3] = tmp.r; col[i * 3 + 1] = tmp.g; col[i * 3 + 2] = tmp.b;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    g.add(new THREE.Points(geo, flowerMat));
    scene.add(g);
    return g;
  }
  function followChunks(px) {
    const c0 = Math.floor(px / CH);
    for (let c = c0 - 5; c <= c0 + 6; c++) if (!chunks.has(c)) chunks.set(c, chunk(c));
    chunks.forEach((g, c) => { if (c < c0 - 6 || c > c0 + 7) { g.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); scene.remove(g); chunks.delete(c); } });
  }

  const brickBack = texOf(400, 160, (x, w, h) => {
    const im = x.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let i = 0; i < w; i++) { const [r, g, b] = wallFace(2 + 400 * 999983 + i, 20 + y), k = (y * w + i) * 4; im.data[k] = r; im.data[k + 1] = g; im.data[k + 2] = b; im.data[k + 3] = 255; }
    x.putImageData(im, 0, 0);
  }, true);
  brickBack.repeat.set(1, WALL_H / (160 * ARTY * U));
  const backMat = new THREE.MeshBasicMaterial({ map: brickBack });
  const capTex = texOf(50, 10, (x, w, h) => {
    const C = ["#8d8984", "#9b9792", "#7b7772"];
    for (let y = 0; y < h; y++) for (let i = 0; i < w; i++) { x.fillStyle = y === 0 ? "#c9c5c0" : y === 1 ? "#a9a5a0" : y >= h - 2 ? "#5c5854" : i === 0 ? "#5c5854" : C[Math.floor(hash(i, y, 5) * 3)]; x.fillRect(i, y, 1, 1); }
  }, true);
  capTex.repeat.set(8, 1);
  const capMat = new THREE.MeshBasicMaterial({ map: capTex });
  const lampMat = { arm: new THREE.MeshBasicMaterial({ color: 0x2a2e35 }), shade: new THREE.MeshBasicMaterial({ color: 0x3c424c }), bulb: new THREE.MeshBasicMaterial({ color: 0xffd76a }) };
  const lampGlow = new THREE.SpriteMaterial({ map: texOf(32, 32, (x) => { const g = x.createRadialGradient(16, 16, 0, 16, 16, 16); g.addColorStop(0, "rgba(255,220,140,.75)"); g.addColorStop(1, "rgba(255,200,110,0)"); x.fillStyle = g; x.fillRect(0, 0, 32, 32); }), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  function box(w, h, d, mat, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(boxGeo, mat); m.scale.set(w, h, d); m.position.set(x, y, z); return m; }

  const W3 = { panels: new Map(), tiles: new Set(), jobs: new Set(), bgq: [], propsKey: "", inkV: -1, liveKey: "", inkTiles: new Set(), propTiles: new Set() };
  const holder = document.createElement("div");
  const core = createMural(holder, { headless: true, onExit() {} });
  let aim = null, pickOpen = false;
  const api = core.attach({
    aim: () => aim,
    pick() { openPicker(); },
    sync() { if (ui) hudSync(); },
    roll(q) { rollLv(q); },
  });
  if (walletCode()) bank("/me").catch(() => {});

  function bgPaint(P, until) {
    const art = wallTall(P.p, false, until);
    if (!art) return false;
    P.bgCx.drawImage(art, P.p ? 0 : 2, 11, 400, 481, 0, 0, 400, 481);
    P.bgTex.needsUpdate = true;
    return true;
  }
  addEventListener("gl-wall-kinds", () => W3.panels.forEach((P) => { if (!W3.bgq.includes(P)) W3.bgq.push(P); }));

  function makePanel(p) {
    const g = new THREE.Group(), bgCv = canvas(400, 481), top = Y(-351 * ARTY), bot = Y(130 * ARTY), P = { p, g, tiles: [], bgCv, bgCx: bgCv.getContext("2d") };
    P.bgCx.fillStyle = "#b9472b"; P.bgCx.fillRect(0, 0, 400, 481);
    P.bgTex = pix(new THREE.CanvasTexture(bgCv));
    P.bgMat = new THREE.MeshBasicMaterial({ map: P.bgTex });
    const bg = new THREE.Mesh(new THREE.PlaneGeometry(10, top - bot), P.bgMat);
    bg.position.set(p * 10 + 5, (top + bot) / 2, 0);
    g.add(bg);
    const back = new THREE.Mesh(new THREE.PlaneGeometry(10, WALL_H), backMat);
    back.rotation.y = Math.PI;
    back.position.set(p * 10 + 5, WALL_H / 2, -THICK);
    g.add(back);
    g.add(box(10, 0.24, THICK + 0.12, capMat, p * 10 + 5, top + 0.12, -THICK / 2));
    if (p === 0) { const end = new THREE.Mesh(new THREE.PlaneGeometry(THICK, WALL_H), backMat); end.rotation.y = -Math.PI / 2; end.position.set(0, WALL_H / 2, -THICK / 2); g.add(end); g.add(box(0.12, 0.24, THICK + 0.12, capMat, -0.04, top + 0.12, -THICK / 2)); }
    for (let x = 1.4 + 7.2 * Math.ceil((p * 10 - 1.4) / 7.2); x < p * 10 + 10; x += 7.2) {
      const ly = top - 0.12;
      g.add(box(0.05, 0.05, 0.22, lampMat.arm, x, ly, 0.11), box(0.22, 0.07, 0.16, lampMat.shade, x, ly - 0.06, 0.2), box(0.14, 0.03, 0.1, lampMat.bulb, x, ly - 0.105, 0.2));
      const gl = new THREE.Sprite(lampGlow); gl.scale.set(0.9, 0.9, 1); gl.position.set(x, ly - 0.23, 0.12); g.add(gl);
    }
    scene.add(g);
    W3.bgq.push(P);
    W3.panels.set(p, P);
    return P;
  }
  function addTiles(P) {
    if (P.tiles.length) return;
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      const ux0 = P.p * WX + i * TW, uy0 = -UPH + j * TH, c = canvas(TW * RF, TH * RF), tex = pix(new THREE.CanvasTexture(c));
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(TW * U, TH * U), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4 }));
      mesh.position.set(X(ux0 + TW / 2), Y(uy0 + TH / 2), 0.002);
      mesh.visible = false;
      mesh.renderOrder = 1;
      P.g.add(mesh);
      const t = { ext: true, mode: "wall", ready: true, c: c.getContext("2d"), cv: c, v: { x0: ux0, y0: uy0, r: RF }, x1: ux0 + TW, y1: uy0 + TH, last: "", dirty: false, job: null, again: false, tex, mesh, P, ov: null, redraw() { queueTile(t); } };
      P.tiles.push(t);
      W3.tiles.add(t);
      api.tiles.add(t);
      queueTile(t);
    }
  }
  function dropTiles(P) {
    P.tiles.forEach((t) => { api.tiles.delete(t); W3.tiles.delete(t); W3.jobs.delete(t); W3.inkTiles.delete(t); W3.propTiles.delete(t); t.tex.dispose(); t.mesh.geometry.dispose(); t.mesh.material.dispose(); P.g.remove(t.mesh); if (t.ov) { t.ov.tex.dispose(); t.ov.mesh.geometry.dispose(); t.ov.mesh.material.dispose(); P.g.remove(t.ov.mesh); } });
    P.tiles = [];
  }
  function dropPanel(P) {
    dropTiles(P);
    P.g.traverse((o) => { if (o.geometry && o.geometry !== boxGeo) o.geometry.dispose(); });
    P.bgTex.dispose();
    P.bgMat.dispose();
    scene.remove(P.g);
    W3.panels.delete(P.p);
    const i = W3.bgq.indexOf(P);
    if (i >= 0) W3.bgq.splice(i, 1);
  }
  function queueTile(t) {
    if (t.job) { t.again = true; return; }
    const r = t.want || t.v.r, back = canvas(Math.round(TW * r), Math.round(TH * r));
    t.job = { list: api.ops(t.v.x0 - 1, t.v.y0 - 1, t.x1 + 1, t.y1 + 1), i: 0, back, c: back.getContext("2d"), v: { x0: t.v.x0, y0: t.v.y0, r } };
    W3.jobs.add(t);
  }
  function pump(budget) {
    const t0 = performance.now();
    if (W3.jobs.size) {
      const px = me.x / U, py = WY - (me.y + EYE) / U, dist = (t) => Math.hypot((t.v.x0 + t.x1) / 2 - px, (t.v.y0 + t.y1) / 2 - py);
      for (const t of [...W3.jobs].sort((a, b) => dist(a) - dist(b))) {
        const j = t.job;
        while (j.i < j.list.length && performance.now() - t0 < budget) paintOp(j.list[j.i++], j.c, j.v);
        if (j.i < j.list.length) break;
        if (j.v.r !== t.v.r) {
          t.cv = j.back; t.c = j.c; t.v = j.v;
          const old = t.tex;
          t.tex = pix(new THREE.CanvasTexture(j.back));
          t.mesh.material.map = t.tex;
          old.dispose();
        } else {
          t.c.globalCompositeOperation = "copy";
          t.c.drawImage(j.back, 0, 0);
          t.c.globalCompositeOperation = "source-over";
          t.c.globalAlpha = 1;
        }
        t.last = j.list.length ? j.list[j.list.length - 1].id : "";
        t.job = null;
        W3.jobs.delete(t);
        t.mesh.visible = j.list.length > 0;
        t.tex.needsUpdate = true;
        if (api.painting()) t.stale = true;
        if (t.again) { t.again = false; queueTile(t); }
      }
    }
    if (W3.bgq.length) {
      W3.bgq.sort((a, b) => Math.abs(a.p * 10 + 5 - me.x) - Math.abs(b.p * 10 + 5 - me.x));
      while (W3.bgq.length && performance.now() - t0 < budget + 3) { if (bgPaint(W3.bgq[0], t0 + budget + 3)) W3.bgq.shift(); else break; }
    }
  }
  function followWall(px) {
    const p0 = Math.max(0, Math.floor((px - 150) / 10)), p1 = Math.max(0, Math.floor((px + 160) / 10));
    let made = 0;
    const order = [];
    for (let p = p0; p <= p1; p++) if (!W3.panels.has(p)) order.push(p);
    order.sort((a, b) => Math.abs(a * 10 + 5 - px) - Math.abs(b * 10 + 5 - px)).slice(0, 2).forEach((p) => { makePanel(p); made++; });
    W3.panels.forEach((P) => {
      if (P.p < p0 - 2 || P.p > p1 + 2) { dropPanel(P); return; }
      const near = Math.abs(P.p * 10 + 5 - px) < 70;
      if (near && !P.tiles.length && made < 3) { addTiles(P); made++; }
      else if (!near && P.tiles.length && Math.abs(P.p * 10 + 5 - px) > 90) dropTiles(P);
    });
  }
  function detail() {
    const cx = camera.position.x / U, cy = WY - camera.position.y / U, cz = camera.position.z / U;
    W3.tiles.forEach((t) => {
      const dx = Math.max(t.v.x0 - cx, 0, cx - t.x1), dy = Math.max(t.v.y0 - cy, 0, cy - t.y1), d = Math.hypot(dx, dy, cz) * U, cur = t.want || t.v.r;
      const r = d < 6 ? RN : d > 9 ? RF : cur;
      if (r !== cur) { t.want = r; if (t.job) t.again = true; else queueTile(t); }
    });
  }
  function uploads() {
    W3.tiles.forEach((t) => {
      if (!t.dirty) return;
      t.dirty = false;
      t.tex.needsUpdate = true;
      t.mesh.visible = true;
    });
  }
  function overlayOf(t) {
    if (t.ov) return t.ov;
    const c = canvas(TW * RN, TH * RN), tex = pix(new THREE.CanvasTexture(c));
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(TW * U, TH * U), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -8 }));
    mesh.position.set(X(t.v.x0 + TW / 2), Y(t.v.y0 + TH / 2), 0.004);
    mesh.renderOrder = 2;
    mesh.visible = false;
    t.P.g.add(mesh);
    t.ov = { c: c.getContext("2d"), cv: c, tex, mesh, v: { x0: t.v.x0, y0: t.v.y0, r: RN }, used: false };
    return t.ov;
  }
  const meets = (bb, t, m = 30) => bb[2] + m > t.v.x0 && bb[0] - m < t.x1 && bb[3] + m > t.v.y0 && bb[1] - m < t.y1;
  function withLive(t) {
    const ov = t.ov, id = W3.liveKey.split(":")[0];
    if (ov.liveId !== id) {
      if (!ov.base) ov.base = canvas(ov.cv.width, ov.cv.height);
      const b = ov.base.getContext("2d");
      b.globalCompositeOperation = "copy";
      b.drawImage(ov.cv, 0, 0);
      b.globalCompositeOperation = "source-over";
      ov.liveId = id;
    } else {
      ov.c.setTransform(1, 0, 0, 1, 0, 0);
      ov.c.globalAlpha = 1;
      ov.c.globalCompositeOperation = "copy";
      ov.c.drawImage(ov.base, 0, 0);
      ov.c.globalCompositeOperation = "source-over";
    }
    api.drawLive(ov.c, ov.v, ov.cv.width, ov.cv.height, 1.4);
    ov.tex.needsUpdate = true;
  }
  function overlays() {
    const key = api.propsKey(), iv = api.inkV(), lk = api.liveKey();
    const full = key !== W3.propsKey || iv !== W3.inkV || (!!W3.liveKey && !lk);
    if (!full && lk === W3.liveKey) return;
    W3.liveKey = lk;
    const lb = lk ? api.liveBox() : null;
    if (!full) {
      if (lb) W3.propTiles.forEach((t) => { if (t.ov && t.ov.mesh.visible && meets(lb, t, 0)) withLive(t); });
      return;
    }
    W3.propsKey = key; W3.inkV = iv;
    const boxes = api.propBoxes(), inks = api.inks(), want = new Set();
    W3.tiles.forEach((t) => { if (boxes.some((b) => meets(b, t)) || inks.some((o) => o.bb && meets(o.bb, t, 10))) want.add(t); });
    W3.propTiles.forEach((t) => want.add(t));
    W3.propTiles = new Set();
    want.forEach((t) => {
      if (!W3.tiles.has(t)) return;
      const has = boxes.some((b) => meets(b, t)) || inks.some((o) => o.bb && meets(o.bb, t, 10));
      if (!has && !t.ov) return;
      const ov = overlayOf(t), c = ov.c;
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.globalAlpha = 1;
      c.globalCompositeOperation = "source-over";
      c.clearRect(0, 0, ov.cv.width, ov.cv.height);
      ov.liveId = "";
      if (has) {
        api.drawProps(c, ov.v, ov.cv.width, ov.cv.height, 1.4);
        inks.forEach((o) => { if (o.bb && meets(o.bb, t, 10)) paintOp(o, c, ov.v); });
        W3.propTiles.add(t);
      }
      ov.mesh.visible = has;
      ov.tex.needsUpdate = true;
      if (has && lb && meets(lb, t, 0)) withLive(t);
    });
  }

  const me = { x: 3, y: 0, z: 2.1, yaw: 0, pitch: 0, walk: 0, speed: 0, lift: false, climb: 0 };
  const q = new URLSearchParams(location.search), qx = +q.get("x"), qy = +q.get("y");
  if (isFinite(qx) && qx > 0) me.x = clamp(qx * U, 0.5, 1e6);
  {
    const ty = isFinite(qy) && q.has("y") ? Y(clamp(qy, -UPH, WY)) : 1.6;
    me.pitch = clamp(Math.atan2(ty - EYE, me.z), -0.6, 0.6);
  }

  const lift = { x: me.x + 3.6, z: 1.5, h: 0, vh: 0, moving: 0, g: new THREE.Group(), arms: [], deck: null };
  {
    const yellow = new THREE.MeshLambertMaterial({ color: 0xf2a900 }), dark = new THREE.MeshLambertMaterial({ color: 0x2b2b2b }), grey = new THREE.MeshLambertMaterial({ color: 0x7d7a75 });
    const stripe = pix(new THREE.CanvasTexture(Object.assign(canvas(16, 4), {})));
    {
      const c = stripe.image.getContext("2d");
      for (let i = 0; i < 16; i++) { c.fillStyle = Math.floor(i / 2) % 2 ? "#f2a900" : "#1d1d1d"; c.fillRect(i, 0, 1, 4); }
    }
    stripe.wrapS = THREE.RepeatWrapping; stripe.repeat.set(6, 1);
    const stripeMat = new THREE.MeshBasicMaterial({ map: stripe });
    const plate = texOf(16, 16, (x, w, h) => { x.fillStyle = "#9a9a96"; x.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 4) for (let i = (y / 4) % 2 ? 2 : 0; i < w; i += 4) { x.fillStyle = "#c9c9c4"; x.fillRect(i, y, 2, 1); x.fillStyle = "#6f6f6b"; x.fillRect(i + 1, y + 1, 2, 1); } }, true);
    plate.repeat.set(6, 3);
    const deckMat = new THREE.MeshLambertMaterial({ map: plate });
    const g = lift.g;
    g.add(box(LIFT.len - 0.1, 0.45, LIFT.dep - 0.1, yellow, 0, 0.42, 0));
    g.add(box(LIFT.len - 0.08, 0.1, 0.02, stripeMat, 0, 0.56, LIFT.dep / 2 - 0.04));
    [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.16, 10), dark); w.rotation.x = Math.PI / 2; w.position.set(sx * (LIFT.len / 2 - 0.35), 0.2, sz * (LIFT.dep / 2 - 0.05)); g.add(w); }));
    g.add(box(0.3, 0.25, 0.25, grey, LIFT.len / 2 - 0.3, 0.75, 0));
    for (let k = 0; k < 5; k++) [-1, 1].forEach((sz) => [-1, 1].forEach((d) => { const a = box(2.2, 0.06, 0.05, dark); a.userData = { k, d }; a.position.z = sz * 0.42; g.add(a); lift.arms.push(a); }));
    const deck = new THREE.Group();
    deck.add(box(LIFT.len + 0.1, 0.08, LIFT.dep, deckMat, 0, 0, 0));
    const rail = (w, x, z, y, d = 0.04) => deck.add(box(w, 0.04, d, yellow, x, y, z));
    [1.05, 0.55].forEach((y) => { rail(LIFT.len + 0.1, 0, LIFT.dep / 2 - 0.02, y); rail(LIFT.len + 0.1, 0, -LIFT.dep / 2 + 0.02, y); deck.add(box(0.04, 0.04, LIFT.dep, yellow, LIFT.len / 2 + 0.03, y, 0)); deck.add(box(0.04, 0.04, LIFT.dep, yellow, -LIFT.len / 2 - 0.03, y, 0)); });
    [-1, 0, 1].forEach((sx) => [-1, 1].forEach((sz) => deck.add(box(0.04, 1.05, 0.04, yellow, sx * (LIFT.len / 2 + 0.03), 0.52, sz * (LIFT.dep / 2 - 0.02)))));
    deck.add(box(LIFT.len + 0.1, 0.12, 0.02, stripeMat, 0, 0.1, LIFT.dep / 2 - 0.01));
    deck.add(box(0.28, 0.2, 0.14, grey, LIFT.len / 2 - 0.35, 1.0, LIFT.dep / 2 - 0.12));
    lift.deck = deck;
    g.add(deck);
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(LIFT.len + 0.4, LIFT.dep + 0.4), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.012;
    g.add(shadow);
    scene.add(g);
  }
  function placeLift() {
    const g = lift.g, top = 0.66 + 0.4 + lift.h, span = top - 0.66, N = 5, sh = span / N, A = 2.2, th = Math.asin(clamp(sh / A, 0.02, 0.999));
    g.position.set(lift.x, 0, lift.z);
    lift.arms.forEach((a) => { a.position.x = 0; a.position.y = 0.66 + sh * (a.userData.k + 0.5); a.rotation.z = a.userData.d * th; a.scale.x = A; });
    lift.deck.position.y = top;
  }
  const deckY = () => 0.66 + 0.4 + lift.h + 0.04;

  const person = (c1) => {
    const c = canvas(16, 32), x = c.getContext("2d");
    const body = c1 === "rainbow" ? null : /^#[0-9a-f]{6}$/.test(c1 || "") ? c1 : c1 === "tape" ? "#e6d49c" : c1 === "card" ? "#c49a5e" : c1 === "eraser" ? "#ff9ec7" : "#3b5bdb";
    const P = (col, rx, ry, rw, rh) => { x.fillStyle = col; x.fillRect(rx, ry, rw, rh); };
    P("#1d140f", 5, 2, 6, 1); P("#5a3a22", 5, 3, 6, 2); P("#f0c8a0", 5, 5, 6, 5); P("#1d140f", 6, 7, 1, 1); P("#1d140f", 9, 7, 1, 1);
    if (body) P(body, 4, 10, 8, 9); else RAINBOW.forEach((r, i) => P(r, 4, 10 + i, 8, 2));
    P("rgba(0,0,0,.25)", 4, 17, 8, 2); P(body || "#2f6bff", 2, 11, 2, 7); P(body || "#2f6bff", 12, 11, 2, 6); P("#f0c8a0", 2, 18, 2, 2); P("#f0c8a0", 12, 17, 2, 2);
    P("#b0b0b0", 12, 13, 2, 4); P("#2b3a67", 5, 19, 6, 9); P("#1d2747", 7, 22, 2, 6); P("#1d140f", 4, 28, 3, 2); P("#1d140f", 9, 28, 3, 2);
    return pix(new THREE.CanvasTexture(c));
  };
  function nameTag(text) {
    const c = canvas(128, 20), x = c.getContext("2d");
    x.font = "bold 13px Tahoma, Verdana, sans-serif";
    const w = Math.min(124, Math.ceil(x.measureText(text).width) + 10);
    x.fillStyle = "#ffffe1"; x.fillRect((128 - w) / 2, 2, w, 16);
    x.strokeStyle = "#000"; x.strokeRect((128 - w) / 2 + 0.5, 2.5, w - 1, 15);
    x.fillStyle = "#000"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(text, 64, 10.5);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: true, transparent: true }));
    s.scale.set(1.28, 0.2, 1);
    return s;
  }
  const selfFig = new THREE.Sprite(new THREE.SpriteMaterial({ map: person("#3b5bdb"), alphaTest: 0.5 }));
  selfFig.scale.set(0.9, 1.8, 1); selfFig.center.set(0.5, 0); selfFig.visible = false;
  scene.add(selfFig);
  const mates = new Map(), ghostLiftMat = new THREE.MeshLambertMaterial({ color: 0xf2a900 });
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 1.8));
  { const d = new THREE.DirectionalLight(0xffffff, 1.1); d.position.set(-0.4, 1, 0.8); scene.add(d); }
  function syncMates(dt) {
    const list = api.others(), seen = new Set();
    list.forEach((o) => {
      seen.add(o.sid);
      let m = mates.get(o.sid);
      if (!m) {
        const fig = new THREE.Sprite(new THREE.SpriteMaterial({ map: person(o.c), alphaTest: 0.5 }));
        fig.scale.set(0.9, 1.8, 1); fig.center.set(0.5, 0);
        const tag = nameTag(o.name), stand = new THREE.Group();
        stand.add(box(1.4, 0.07, 0.8, ghostLiftMat, 0, -0.04, 0));
        const col = box(0.12, 1, 0.12, new THREE.MeshLambertMaterial({ color: 0x2b2b2b }), 0, 0, 0);
        stand.add(col);
        stand.userData.col = col;
        const g = new THREE.Group();
        g.add(fig, tag, stand);
        scene.add(g);
        m = { g, fig, tag, stand, c: o.c, name: o.name, x: X(o.x), y: 0, tx: 0, ty: 0 };
        mates.set(o.sid, m);
      }
      if (m.c !== o.c) { m.c = o.c; m.fig.material.map.dispose(); m.fig.material.map = person(o.c); }
      if (m.name !== o.name) { m.name = o.name; m.g.remove(m.tag); m.tag.material.map.dispose(); m.tag = nameTag(o.name); m.g.add(m.tag); }
      const cy = Y(o.y);
      m.tx = X(o.x) - 0.25;
      m.ty = cy > 2.3 ? Math.max(1.06, cy - 1.45) : 0;
      m.live = o.live;
      m.aim = [X(o.x), cy];
    });
    mates.forEach((m, sid) => {
      if (!seen.has(sid)) { scene.remove(m.g); m.fig.material.map.dispose(); m.tag.material.map.dispose(); mates.delete(sid); return; }
      const k = 1 - Math.exp(-dt * 6);
      m.x = lerp(m.x, m.tx, k); m.y = lerp(m.y, m.ty, k);
      m.g.position.set(m.x, m.y, 0.85);
      m.fig.position.set(0, 0, 0);
      m.tag.position.set(0, 2.05, 0);
      m.stand.visible = m.y > 0.5;
      m.stand.userData.col.scale.y = Math.max(0.01, m.y - 0.08);
      m.stand.userData.col.position.y = -m.y / 2 - 0.04;
    });
  }

  const hand = new THREE.Group();
  hudCam.add(hand);
  hud.add(hudCam);
  const skin = new THREE.MeshLambertMaterial({ color: 0xf0c8a0 }), sleeve = new THREE.MeshLambertMaterial({ color: 0x3b5bdb });
  const labelCv = canvas(32, 16), labelTex = pix(new THREE.CanvasTexture(labelCv));
  labelTex.minFilter = THREE.NearestFilter; labelTex.generateMipmaps = false;
  const canGrp = new THREE.Group(), canBody = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.17, 12), new THREE.MeshLambertMaterial({ map: labelTex }));
  canGrp.add(canBody);
  canGrp.add(box(0.05, 0.03, 0.05, new THREE.MeshLambertMaterial({ color: 0xeeeeee }), 0, 0.1, 0));
  canGrp.add(box(0.018, 0.022, 0.018, new THREE.MeshLambertMaterial({ color: 0x111111 }), 0, 0.124, 0));
  const finger = box(0.022, 0.022, 0.06, skin, 0, 0.142, 0.01);
  const fist = new THREE.Group();
  fist.add(box(0.09, 0.07, 0.08, skin, 0, -0.02, 0.0), box(0.075, 0.08, 0.12, sleeve, 0, -0.06, 0.09), finger);
  const tools3 = {
    spray: canGrp,
    chalk: box(0.016, 0.1, 0.016, new THREE.MeshLambertMaterial({ color: 0xffffff }), 0, 0.06, 0),
    eraser: box(0.09, 0.05, 0.06, new THREE.MeshLambertMaterial({ color: 0xff9ec7 }), 0, 0.04, 0),
    tape: new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.018, 6, 14), new THREE.MeshLambertMaterial({ color: 0xe6d49c })),
    stencil: box(0.17, 0.13, 0.006, new THREE.MeshLambertMaterial({ color: 0xc49a5e }), 0, 0.08, 0),
    roller: new THREE.Group(),
    wipe: new THREE.Group(),
  };
  const napMat = new THREE.MeshLambertMaterial({ color: 0x2fb36b }), wire = new THREE.MeshLambertMaterial({ color: 0x9aa3ab });
  const nap = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.2, 14), napMat);
  nap.rotation.z = Math.PI / 2; nap.position.set(0, 0.2, 0);
  tools3.roller.add(nap, box(0.008, 0.008, 0.008, wire, 0.104, 0.2, 0), box(0.006, 0.09, 0.006, wire, 0.106, 0.155, 0), box(0.1, 0.006, 0.006, wire, 0.056, 0.11, 0), box(0.026, 0.13, 0.026, new THREE.MeshLambertMaterial({ color: 0x8a5a36 }), 0.006, 0.04, 0));
  tools3.roller.children.slice(1).forEach((o) => tools3.wipe.add(o.clone()));
  const rub = nap.clone();
  rub.material = new THREE.MeshLambertMaterial({ color: 0xff9ec7 });
  tools3.wipe.add(rub);
  tools3.tape.position.y = 0.05;
  const held = new THREE.Group();
  held.add(fist);
  Object.values(tools3).forEach((o) => { o.visible = false; held.add(o); });
  hand.add(held);
  const handBase = new THREE.Vector3(0.25, -0.25, -0.62);
  hand.scale.setScalar(0.8);
  const anim = { dip: 0, shake: 0, spray: 0, bob: 0, swap: null };
  function paintLabel(c) {
    const x = labelCv.getContext("2d");
    x.clearRect(0, 0, 32, 16);
    if (c === "rainbow") RAINBOW.forEach((r, i) => { x.fillStyle = r; x.fillRect(0, i * 2 + 1, 32, 2); });
    else if (c === "chrome" || c === "gold") { const st = c === "gold" ? ["#fff3b0", "#e2b13c", "#9a6a12", "#f5d36b"] : ["#ffffff", "#b8c4cc", "#5b6670", "#dfe6ea"]; st.forEach((s, i) => { x.fillStyle = s; x.fillRect(0, i * 4, 32, 4); }); }
    else { x.fillStyle = /^#/.test(c) ? c : "#ff0000"; x.fillRect(0, 0, 32, 16); }
    x.fillStyle = "rgba(255,255,255,.85)"; x.fillRect(0, 6, 32, 4);
    x.fillStyle = "#000"; x.fillRect(4, 7, 14, 1); x.fillRect(4, 9, 8, 1);
    x.fillStyle = "rgba(255,255,255,.35)"; x.fillRect(5, 0, 2, 16);
    labelTex.needsUpdate = true;
  }
  function showTool(t) {
    const k = t === "bands" || t === "neon" ? "spray" : t;
    Object.entries(tools3).forEach(([n, o]) => { o.visible = n === k; });
    finger.visible = k === "spray";
    const st = api.get();
    paintLabel(t === "bands" ? "rainbow" : t === "neon" ? st.hex : st.color);
    napMat.color.set(/^#/.test(st.color) ? st.color : st.color === "gold" ? "#d9a43a" : st.color === "chrome" ? "#c4ccd4" : "#ff8a00");
  }

  const MIST = 220, mist = { pos: new Float32Array(MIST * 3), col: new Float32Array(MIST * 3), vel: new Float32Array(MIST * 3), life: new Float32Array(MIST), i: 0, acc: 0 };
  const mistGeo = new THREE.BufferGeometry();
  mistGeo.setAttribute("position", new THREE.BufferAttribute(mist.pos, 3));
  mistGeo.setAttribute("color", new THREE.BufferAttribute(mist.col, 3));
  const mistPts = new THREE.Points(mistGeo, new THREE.PointsMaterial({ size: 0.012, vertexColors: true, sizeAttenuation: true, transparent: true, opacity: 0.85, depthWrite: false }));
  mistPts.frustumCulled = false;
  scene.add(mistPts);
  for (let i = 0; i < MIST; i++) mist.pos[i * 3 + 1] = -100;
  const tmpC = new THREE.Color(), tmpV = new THREE.Vector3(), tmpV2 = new THREE.Vector3();
  function mistColor(c) {
    if (c === "rainbow") return RAINBOW[Math.floor(Math.random() * RAINBOW.length)];
    if (c === "chrome") return Math.random() < 0.5 ? "#dfe6ea" : "#8a96a0";
    if (c === "gold") return Math.random() < 0.5 ? "#f5d36b" : "#c08a1e";
    if (c && c[0] === "n") return c.slice(1);
    return /^#/.test(c) ? c : "#ffffff";
  }
  function emit(from, to, color, n, spread, speed, gravity) {
    for (let k = 0; k < n; k++) {
      const i = mist.i, d = tmpV.copy(to).sub(from), len = d.length() || 1;
      mist.i = (mist.i + 1) % MIST;
      d.normalize();
      d.x += (Math.random() - 0.5) * spread; d.y += (Math.random() - 0.5) * spread; d.z += (Math.random() - 0.5) * spread * 0.3;
      d.normalize().multiplyScalar(speed * (0.75 + Math.random() * 0.5));
      mist.pos[i * 3] = from.x; mist.pos[i * 3 + 1] = from.y; mist.pos[i * 3 + 2] = from.z;
      mist.vel[i * 3] = d.x; mist.vel[i * 3 + 1] = d.y; mist.vel[i * 3 + 2] = d.z;
      mist.life[i] = gravity ? 0.6 + Math.random() * 0.4 : (len / speed) * (0.9 + Math.random() * 0.3);
      tmpC.set(mistColor(color)).convertSRGBToLinear();
      mist.col[i * 3] = tmpC.r; mist.col[i * 3 + 1] = tmpC.g; mist.col[i * 3 + 2] = tmpC.b;
      mist.vel[i * 3 + 1] -= gravity ? 0.4 : 0;
    }
  }
  function stepMist(dt) {
    for (let i = 0; i < MIST; i++) {
      if (mist.life[i] <= 0) continue;
      mist.life[i] -= dt;
      mist.pos[i * 3] += mist.vel[i * 3] * dt; mist.pos[i * 3 + 1] += mist.vel[i * 3 + 1] * dt; mist.pos[i * 3 + 2] += mist.vel[i * 3 + 2] * dt;
      mist.vel[i * 3 + 1] -= dt * 1.2;
      if (mist.life[i] <= 0 || mist.pos[i * 3 + 2] < 0.004) { mist.life[i] = 0; mist.pos[i * 3 + 1] = -100; }
    }
    mistGeo.attributes.position.needsUpdate = true;
    mistGeo.attributes.color.needsUpdate = true;
  }

  const ringGrp = new THREE.Group();
  {
    const g = new THREE.RingGeometry(0.46, 0.5, 40), mk = (color, s) => { const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -16 })); m.scale.setScalar(s); m.renderOrder = 3; return m; };
    ringGrp.add(mk(0x000000, 1.08), mk(0xffffff, 1));
    ringGrp.visible = false;
    scene.add(ringGrp);
  }

  const AC = { ctx: null, buf: {}, loops: {}, out: null, song: null, el: null, boom: null, an: null };
  const listener = new THREE.AudioListener();
  camera.add(listener);
  scene.add(camera);
  AC.ctx = listener.context;
  const LOOPS = ["spray", "chalk", "eraser", "roll", "lift", "drone", "steps", "meadow", "creek"], SHOTS = ["pssht", "shake", "tape", "rip", "peel", "shutter", "click", "dip"];
  const audioLoader = new THREE.AudioLoader();
  [...LOOPS.map((k) => [k, k + (k === "roll" ? ".mp3" : ".wav")]), ...SHOTS.map((k) => [k, k + ".mp3"])].forEach(([k, f]) => audioLoader.load(SND + f, (b) => { AC.buf[k] = b; if (LOOPS.includes(k)) loopNode(k); }, undefined, () => {}));
  function loopNode(k) {
    const a = new THREE.Audio(listener);
    a.setBuffer(AC.buf[k]);
    a.setLoop(true);
    a.setVolume(0);
    AC.loops[k] = { a, v: 0, want: 0, rate: 1, started: false };
  }
  function loop(k, vol, rate = 1) {
    const L = AC.loops[k];
    if (!L) return;
    L.want = vol;
    L.rate = rate;
  }
  function stepAudio(dt) {
    if (AC.ctx.state !== "running") return;
    Object.entries(AC.loops).forEach(([k, L]) => {
      const fast = k === "spray" || k === "chalk" || k === "eraser" || k === "roll" ? 24 : 6;
      L.v = lerp(L.v, L.want, 1 - Math.exp(-dt * fast));
      if (L.v > 0.002 && !L.started) { L.a.offset = Math.random() * (AC.buf[k].duration * 0.8); L.a.play(); L.started = true; }
      if (L.started) { L.a.setVolume(L.v); if (L.a.source && Math.abs(L.a.playbackRate - L.rate) > 0.01) L.a.setPlaybackRate(L.rate); }
      if (L.started && L.v < 0.001 && L.want === 0 && k !== "meadow" && k !== "creek") { L.a.stop(); L.started = false; }
      L.want = k === "meadow" || k === "creek" ? L.want : 0;
    });
  }
  function shot(k, vol = 0.7, rate = 1) {
    if (!AC.buf[k] || AC.ctx.state !== "running") return;
    const a = new THREE.Audio(listener);
    a.setBuffer(AC.buf[k]);
    a.setVolume(vol);
    a.setPlaybackRate(rate);
    a.play();
  }

  const drone = { on: false, t: 0, phase: "", from: null, to: null, q0: null, q1: null, cam: new THREE.PerspectiveCamera(54, 16 / 9, 0.1, 700), mesh: new THREE.Group() };
  {
    const d = drone.mesh, mat = new THREE.MeshLambertMaterial({ color: 0x2b2b2b }), red = new THREE.MeshBasicMaterial({ color: 0xff3030 });
    d.add(box(0.22, 0.06, 0.22, mat), box(0.5, 0.02, 0.03, mat), box(0.03, 0.02, 0.5, mat), box(0.04, 0.04, 0.04, red, 0, -0.04, 0.11));
    drone.rotors = [[-0.25, 0], [0.25, 0], [0, -0.25], [0, 0.25]].map(([x, z]) => { const r = box(0.2, 0.005, 0.03, new THREE.MeshLambertMaterial({ color: 0xbbbbbb }), x, 0.03, z); d.add(r); return r; });
    d.visible = false;
    scene.add(d);
  }
  const boom = { on: false, x: 0, z: 0, onLift: false, mesh: new THREE.Group(), song: -1, cones: [] };
  {
    const b = boom.mesh, front = texOf(32, 16, (x) => {
      x.fillStyle = "#2b2b2b"; x.fillRect(0, 0, 32, 16);
      [[7, 9], [25, 9]].forEach(([cx, cy]) => { x.fillStyle = "#555"; x.fillRect(cx - 5, cy - 5, 10, 10); x.fillStyle = "#111"; x.fillRect(cx - 4, cy - 4, 8, 8); x.fillStyle = "#777"; x.fillRect(cx - 1, cy - 1, 2, 2); });
      x.fillStyle = "#9ecff9"; x.fillRect(13, 3, 6, 4); x.fillStyle = "#c0c0c0"; x.fillRect(13, 10, 6, 3); x.fillStyle = "#ff3030"; x.fillRect(14, 11, 1, 1);
      x.fillStyle = "#e0e0e0"; [12, 15, 18].forEach((i) => x.fillRect(i, 1, 2, 1));
    });
    const mats = [0x333333, 0x333333, 0x444444, 0x222222].map((c) => new THREE.MeshLambertMaterial({ color: c }));
    b.add(new THREE.Mesh(boxGeo, [mats[0], mats[1], mats[2], mats[3], new THREE.MeshLambertMaterial({ map: front }), mats[0]]));
    b.children[0].scale.set(0.46, 0.24, 0.12);
    b.children[0].position.y = 0.12;
    b.add(box(0.3, 0.025, 0.03, new THREE.MeshLambertMaterial({ color: 0xaaaaaa }), 0, 0.27, 0), box(0.025, 0.04, 0.025, mats[2], -0.14, 0.25, 0), box(0.025, 0.04, 0.025, mats[2], 0.14, 0.25, 0));
    [-0.14, 0.14].forEach((x) => { const c = new THREE.Mesh(new THREE.CircleGeometry(0.07, 10), new THREE.MeshBasicMaterial({ color: 0x0d0d0d })); c.position.set(x, 0.11, 0.062); b.add(c); boom.cones.push(c); });
    b.visible = false;
    scene.add(b);
  }

  ui = buildUi();
  let locked = false, mouseDown = false, rightDown = false, lastHover = 0, painted = 0, earned = 0, lastSheets = 0, lastTapes = 0, hintT = "", started = false;
  const keys = new Set();

  function openPicker() {
    if (!ui.pick) {
      ui.pick = picker(ui.dlg, { onPick: (st) => placeFromPicker(st), onCut: () => { ui.cut.open(); }, onPicture: (f) => ui.cut.picture(f), onDescribe: () => ui.cut.describe() });
      ui.cut = cutter(ui.dlg, { onSave: (st) => placeFromPicker(st), draw: (prompt) => ensure().then(() => bank("/wall/stencil", { prompt })) });
    }
    pickOpen = true;
    if (document.pointerLockElement) document.exitPointerLock();
    ui.pick.open();
  }
  function placeFromPicker(st) {
    if (ui.pick) ui.pick.close();
    pickOpen = false;
    if (!aim) {
      const d = clamp(camera.position.z, 0.5, 2.4);
      aim = { x: Math.max(30, camera.position.x / U), y: WY - clamp(camera.position.y, 0.5, WALL_H - 0.5) / U, ppu: (innerHeight / 2 / (Math.tan((camera.fov * Math.PI) / 360) * d)) * U };
    }
    api.stencil(st);
    lock();
  }
  function lock() { if (drone.on) return; try { const r = cv.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (e) {} }
  document.addEventListener("pointerlockchange", () => {
    locked = document.pointerLockElement === cv;
    if (locked) { started = true; if (AC.ctx.state !== "running") AC.ctx.resume(); }
    if (!locked && mouseDown) { mouseDown = false; api.up(); }
    ui.menu.hidden = locked || pickOpen || drone.on || !started;
    ui.start.hidden = locked || started || drone.on;
    ui.root.classList.toggle("w3-locked", locked);
    if (!locked) hudSync();
  });
  cv.addEventListener("click", () => { if (!locked) lock(); });
  cv.addEventListener("contextmenu", (e) => e.preventDefault());
  cv.addEventListener("mousedown", (e) => {
    if (!locked) return;
    if (e.button === 0) { mouseDown = true; strokeT = 0; }
    if (e.button === 2) { rightDown = true; dropper(); }
  });
  addEventListener("mouseup", (e) => {
    if (e.button === 0 && mouseDown) { mouseDown = false; api.up(); afterStroke(); }
    if (e.button === 2) rightDown = false;
  });
  addEventListener("mousemove", (e) => {
    if (!locked || drone.on) return;
    me.yaw -= e.movementX * 0.0022;
    me.pitch = clamp(me.pitch - e.movementY * 0.0022, -1.45, 1.45);
  });
  addEventListener("wheel", (e) => {
    if (!locked) return;
    const st = api.get();
    api.set({ size: clamp(st.size - Math.sign(e.deltaY) * 0.25, 0, 4) });
    hudSync();
  }, { passive: true });
  addEventListener("keydown", (e) => {
    const tag = (e.target && e.target.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    const k = e.key.toLowerCase();
    if (k === "tab") { e.preventDefault(); if (locked) document.exitPointerLock(); else if (started) lock(); return; }
    if (!locked) return;
    if (e.code === "Space") e.preventDefault();
    keys.add(e.code);
    if (/^Digit[1-9]$/.test(e.code)) { pickTool(TOOLS[+e.code.slice(5) - 1][0]); return; }
    if ((e.ctrlKey || e.metaKey) && k === "z") { e.preventDefault(); if (e.shiftKey) api.redo(); else api.undo(); return; }
    if ((e.ctrlKey || e.metaKey) && k === "y") { e.preventDefault(); api.redo(); return; }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (k === "z") { if (e.shiftKey) api.redo(); else api.undo(); return; }
    if (k === "e") { useKey(); return; }
    if (k === "c") { nextCap(); return; }
    if (k === "x") { nextColor(); return; }
    if (k === "f") { startDrone(); return; }
    if (k === "b") { boomKey(); return; }
    if (k === "[" || k === "]") { const st = api.get(); api.set({ size: clamp(st.size + (k === "]" ? 0.25 : -0.25), 0, 4) }); hudSync(); }
  });
  addEventListener("keyup", (e) => keys.delete(e.code));
  addEventListener("blur", () => { keys.clear(); if (mouseDown) { mouseDown = false; api.up(); } });

  function pickTool(t) {
    if (api.busy()) return;
    const was = api.get().tool;
    api.set({ tool: t });
    if (t !== was) { anim.swap = { t: 0, to: t }; shot("click", 0.35); }
    if (t === "stencil" && !api.get().sheets) openPicker();
    hudSync();
  }
  function nextCap() {
    const st = api.get(), ids = ["std", ...st.heads.map((h) => h.id).filter((id) => id !== "std")], i = ids.indexOf(st.head);
    api.set({ head: ids[(i + 1) % ids.length], tool: st.tool === "spray" ? "spray" : st.tool });
    shot("click", 0.3);
    hudSync();
    api.flash("CAP: " + (st.heads.find((h) => h.id === ids[(i + 1) % ids.length]) || { name: "Standard" }).name.toUpperCase());
  }
  function nextColor() {
    const st = api.get(), list = st.recent, i = list.indexOf(st.cur);
    setColor(list[(i + 1) % list.length]);
  }
  function setColor(c) {
    const st = api.get();
    if (!c || api.busy()) return;
    api.set({ color: c, keep: c });
    if (st.tool === "neon" && /^#/.test(c)) api.set({ tool: "neon" });
    if (st.tool === "chalk" && /^#/.test(c)) api.set({ tool: "chalk" });
    anim.shake = 0.5;
    shot("shake", 0.55, 0.95 + Math.random() * 0.1);
    hudSync();
  }
  function dropper() {
    if (!aim) return;
    const tl = [...W3.tiles].find((t) => aim.x >= t.v.x0 && aim.x < t.x1 && aim.y >= t.v.y0 && aim.y < t.y1);
    let col = null;
    if (tl) { const d = tl.c.getImageData(Math.floor((aim.x - tl.v.x0) * tl.v.r), Math.floor((aim.y - tl.v.y0) * tl.v.r), 1, 1).data; if (d[3] > 60) col = toHex([d[0], d[1], d[2]]); }
    if (!col) {
      const P = W3.panels.get(Math.floor(aim.x / WX));
      if (P) { const ay = 13 + aim.y / ARTY, j = Math.floor(ay + 338), i = Math.floor((aim.x - P.p * WX) / 2.5); const d = P.bgCx.getImageData(clamp(i, 0, 399), clamp(j, 0, 480), 1, 1).data; col = toHex([d[0], d[1], d[2]]); }
    }
    if (col) { setColor(col); api.flash("COLOR FROM THE WALL: " + col.toUpperCase()); }
  }

  function useKey() {
    if (me.lift) {
      if (lift.h > 0.15) { api.flash("LOWER THE LIFT FIRST (HOLD SHIFT)"); return; }
      me.lift = false;
      me.x = lift.x; me.z = lift.z + LIFT.dep / 2 + 0.55; me.y = 0;
      shot("click", 0.4);
      return;
    }
    if (boom.on && !boom.onLift && Math.hypot(me.x - boom.x, me.z - boom.z) < 1.6 && !nearLift()) { boomKey(); return; }
    if (nearLift()) {
      if (lift.h > 0.15) { api.flash("THE LIFT IS UP, LOWER IT FROM THE PLATFORM"); return; }
      me.lift = true; me.climb = 0.35;
      me.lx = clamp(me.x - lift.x, -LIFT.len / 2 + 0.4, LIFT.len / 2 - 0.4);
      shot("click", 0.4);
    }
  }
  const nearLift = () => Math.abs(me.x - lift.x) < LIFT.len / 2 + 0.9 && Math.abs(me.z - lift.z) < LIFT.dep / 2 + 0.9;

  function boomKey() {
    if (!boom.on) {
      boom.on = true;
      boom.onLift = me.lift;
      const f = [-Math.sin(me.yaw), -Math.cos(me.yaw)];
      if (boom.onLift) { boom.lx = clamp(me.lx + 0.6, -LIFT.len / 2 + 0.3, LIFT.len / 2 - 0.3); boom.lz = 0.3; }
      else { boom.x = me.x + f[0] * 1.1; boom.z = clamp(me.z + f[1] * 1.1, 0.5, 11); }
      boom.mesh.visible = true;
      boom.song = -1;
      nextSong();
      return;
    }
    const bx = boom.onLift ? lift.x + boom.lx : boom.x, bz = boom.onLift ? lift.z + boom.lz : boom.z;
    if (!boom.onLift && Math.hypot(me.x - bx, me.z - bz) > 3) { api.flash(`WALK TO YOUR BOOMBOX TO CHANGE THE SONG, IT IS ${Math.round(Math.hypot(me.x - bx, me.z - bz))} M AWAY`); return; }
    nextSong();
  }
  function nextSong() {
    shot("click", 0.6);
    boom.song++;
    if (AC.el) { AC.el.pause(); }
    if (boom.song >= SONGS.length) {
      boom.on = false; boom.mesh.visible = false; boom.song = -1;
      api.flash("BOOMBOX OFF, PRESS B TO PUT IT DOWN AGAIN");
      hudSync();
      return;
    }
    const [file, name, by] = SONGS[boom.song];
    if (!AC.el) {
      AC.el = new Audio();
      AC.el.crossOrigin = "anonymous";
      AC.el.loop = true;
      AC.song = new THREE.PositionalAudio(listener);
      AC.song.setMediaElementSource(AC.el);
      AC.song.setRefDistance(2.2);
      AC.song.setRolloffFactor(1.4);
      AC.song.setVolume(0.9);
      boom.mesh.add(AC.song);
      AC.an = new THREE.AudioAnalyser(AC.song, 64);
    }
    AC.el.src = SND + file;
    AC.el.play().catch(() => {});
    api.flash(`NOW PLAYING: ${name.toUpperCase()} BY ${by.toUpperCase()} (CC0)`);
    hudSync();
  }

  const shotSize = [1600, 900];
  function startDrone() {
    if (drone.on || api.busy()) return;
    drone.on = true;
    drone.phase = "out";
    drone.t = 0;
    drone.from = camera.position.clone();
    drone.q0 = camera.quaternion.clone();
    const cxm = clamp(me.x, 4, 1e6);
    drone.to = new THREE.Vector3(cxm, 6.3, 12.6);
    drone.cam.position.copy(drone.to);
    drone.cam.lookAt(cxm, 6.0, 0);
    drone.q1 = drone.cam.quaternion.clone();
    drone.mesh.visible = true;
    ui.root.classList.add("w3-flying");
    if (document.pointerLockElement) document.exitPointerLock();
    ui.menu.hidden = true;
  }
  function droneStep(dt) {
    drone.t += dt;
    loop("drone", 0.45, 1 + Math.sin(drone.t * 3) * 0.03);
    drone.rotors.forEach((r, i) => { r.rotation.y += dt * 40 * (i % 2 ? 1 : -1); });
    if (drone.phase === "out") {
      const u = clamp(drone.t / 2.6, 0, 1), e = ease(u);
      camera.position.lerpVectors(drone.from, drone.to, e);
      camera.position.y += Math.sin(u * Math.PI) * 1.2;
      camera.quaternion.slerpQuaternions(drone.q0, drone.q1, ease(clamp(u * 1.3, 0, 1)));
      drone.mesh.position.copy(camera.position).add(tmpV.set(0, 0.25, -0.6).applyQuaternion(camera.quaternion));
      drone.mesh.visible = u < 0.15;
      if (u >= 1) { drone.phase = "count"; drone.t = 0; ui.count.hidden = false; }
    } else if (drone.phase === "count") {
      const n = 3 - Math.floor(drone.t / 0.6);
      ui.count.textContent = n > 0 ? String(n) : "";
      camera.position.y = drone.to.y + Math.sin(drone.t * 2.2) * 0.04;
      if (drone.t >= 1.8) { ui.count.hidden = true; takePhoto(); drone.phase = "photo"; drone.t = 0; }
    } else if (drone.phase === "back") {
      const u = clamp(drone.t / 1.8, 0, 1), e = ease(u);
      camera.position.lerpVectors(drone.to, eyePos(), e);
      camera.quaternion.slerpQuaternions(drone.q1, eyeQuat(), e);
      if (u >= 1) { drone.on = false; drone.phase = ""; drone.mesh.visible = false; ui.root.classList.remove("w3-flying"); ui.menu.hidden = locked; }
    }
  }
  function takePhoto() {
    shot("shutter", 0.9);
    ui.flashEl.classList.remove("on"); void ui.flashEl.offsetWidth; ui.flashEl.classList.add("on");
    const w = shotSize[0] / 2, h = shotSize[1] / 2, rt = new THREE.WebGLRenderTarget(w, h, { colorSpace: THREE.SRGBColorSpace });
    drone.cam.aspect = w / h; drone.cam.updateProjectionMatrix();
    drone.cam.position.copy(camera.position); drone.cam.quaternion.copy(camera.quaternion);
    ringGrp.visible = false;
    const was = selfFig.visible;
    selfFig.visible = true;
    renderer.setRenderTarget(rt);
    renderer.clear();
    renderer.render(scene, drone.cam);
    const px = new Uint8Array(w * h * 4);
    renderer.readRenderTargetPixels(rt, 0, 0, w, h, px);
    renderer.setRenderTarget(null);
    rt.dispose();
    selfFig.visible = was;
    const small = canvas(w, h), sx = small.getContext("2d"), im = sx.createImageData(w, h);
    for (let y = 0; y < h; y++) im.data.set(px.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4);
    sx.putImageData(im, 0, 0);
    const big = canvas(shotSize[0], shotSize[1]), bx = big.getContext("2d");
    bx.imageSmoothingEnabled = false;
    bx.drawImage(small, 0, 0, shotSize[0], shotSize[1]);
    bx.font = "bold 22px Tahoma, Verdana, sans-serif";
    const tag = "gzowo.fun/wall", tw = bx.measureText(tag).width;
    bx.fillStyle = "rgba(0,0,0,.45)"; bx.fillRect(shotSize[0] - tw - 34, shotSize[1] - 46, tw + 22, 32);
    bx.fillStyle = "#fff"; bx.fillText(tag, shotSize[0] - tw - 23, shotSize[1] - 22);
    const d = new Date(), name = `gzowo-wall-${d.toISOString().slice(0, 10)}-${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}.png`;
    ui.photoImg.src = big.toDataURL("image/png");
    ui.photoSave.download = name;
    ui.photoSave.href = ui.photoImg.src;
    ui.photo.hidden = false;
    try { ui.photoSave.click(); ui.photoNote.textContent = "Saved to your downloads as " + name + "."; } catch (e) { ui.photoNote.textContent = "Press Save to keep it."; }
  }
  function photoDone() {
    ui.photo.hidden = true;
    drone.phase = "back";
    drone.t = 0;
  }

  const eyePos = () => (me.lift ? tmpV2.set(lift.x + me.lx, deckY() + 1.6, lift.z - LIFT.dep / 2 + 0.28) : tmpV2.set(me.x, me.y + EYE, me.z)).clone();
  const eyeQuat = () => new THREE.Quaternion().setFromEuler(new THREE.Euler(me.pitch, me.yaw, 0, "YXZ"));

  function push(px, pz, x0, x1, z0, z1) {
    const cx = clamp(px, x0, x1), cz = clamp(pz, z0, z1), dx = px - cx, dz = pz - cz, d = Math.hypot(dx, dz);
    if (d >= RAD) return null;
    if (d < 1e-6) {
      const o = [[px - x0, -1, 0], [x1 - px, 1, 0], [pz - z0, 0, -1], [z1 - pz, 0, 1]].sort((a, b) => a[0] - b[0])[0];
      return [px + o[1] * (o[0] + RAD), pz + o[2] * (o[0] + RAD)];
    }
    return [cx + (dx / d) * RAD, cz + (dz / d) * RAD];
  }
  function collide(px, pz) {
    let p = [px, pz];
    const boxes = [[0, 1e7, -THICK, 0]];
    if (!me.lift) boxes.push([lift.x - LIFT.len / 2, lift.x + LIFT.len / 2, lift.z - LIFT.dep / 2, lift.z + LIFT.dep / 2]);
    if (boom.on && !boom.onLift) boxes.push([boom.x - 0.23, boom.x + 0.23, boom.z - 0.06, boom.z + 0.06]);
    boxes.forEach((b) => { const r = push(p[0], p[1], ...b); if (r) p = r; });
    return [clamp(p[0], -60, 1e7), clamp(p[1], -60, 11.55)];
  }

  function move(dt) {
    let fx = 0, fz = 0;
    if (keys.has("KeyW") || keys.has("ArrowUp")) fz -= 1;
    if (keys.has("KeyS") || keys.has("ArrowDown")) fz += 1;
    if (keys.has("KeyA") || keys.has("ArrowLeft")) fx -= 1;
    if (keys.has("KeyD") || keys.has("ArrowRight")) fx += 1;
    const len = Math.hypot(fx, fz) || 1, s = Math.sin(me.yaw), c = Math.cos(me.yaw);
    const dx = ((fx * c + fz * s) / len), dz = ((-fx * s + fz * c) / len), moving = fx || fz;
    if (me.lift) {
      const sp = LIFT.drive * (1 - (lift.h / LIFT.max) * 0.6), up = keys.has("Space") ? 1 : keys.has("ShiftLeft") || keys.has("ShiftRight") ? -1 : 0;
      lift.vh = lerp(lift.vh, up * LIFT.speed, 1 - Math.exp(-dt * 8));
      const h0 = lift.h;
      lift.h = clamp(lift.h + lift.vh * dt, 0, LIFT.max);
      if (lift.h === 0 || lift.h === LIFT.max) lift.vh = 0;
      if (moving) { lift.x = clamp(lift.x + dx * sp * dt, -50, 1e7); lift.z = clamp(lift.z + dz * sp * dt, LIFT.dep / 2 + 0.04, 10.8); }
      const work = Math.abs(lift.h - h0) / dt;
      loop("lift", clamp(work * 0.6 + (moving ? 0.25 : 0), 0, 0.55), 0.85 + (lift.vh > 0 ? 0.15 : 0) + (moving && !work ? -0.15 : 0));
      me.speed = 0;
    } else {
      const sp = keys.has("ShiftLeft") || keys.has("ShiftRight") ? 6 : 3.4;
      me.speed = lerp(me.speed, moving ? sp : 0, 1 - Math.exp(-dt * 10));
      if (moving) { me.vx = dx; me.vz = dz; }
      if (me.speed > 0.02) {
        const [nx, nz] = collide(me.x + (me.vx || 0) * me.speed * dt, me.z + (me.vz || 0) * me.speed * dt);
        me.walk += Math.hypot(nx - me.x, nz - me.z);
        me.x = nx; me.z = nz;
      }
      loop("steps", clamp(me.speed / 3.4, 0, 1.3) * 0.5, me.speed > 4 ? 1.35 : 1);
    }
    placeLift();
  }

  function computeAim() {
    aim = null;
    if (drone.on) return null;
    const dir = camera.getWorldDirection(tmpV), o = camera.position, st = api.get();
    if (dir.z >= -0.02) return null;
    const t = -o.z / dir.z, hx = o.x + dir.x * t, hy = o.y + dir.y * t;
    if (hx < 0 || hy < 0 || hy > WALL_H || t > (REACH[st.tool] || 2.6)) return { far: t, hx, hy };
    const ppu = (innerHeight / 2 / (Math.tan((camera.fov * Math.PI) / 360) * t)) * U;
    aim = { x: hx / U, y: WY - hy / U, ppu };
    return { t, hx, hy };
  }

  function hudSync() {
    const st = api.get();
    ui.slots.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.t === st.tool)));
    const cur = st.cur;
    ui.swatch.style.background = cur === "rainbow" ? `linear-gradient(135deg,${RAINBOW.join(",")})` : cur === "chrome" ? "linear-gradient(#fff,#8a96a0,#dfe6ea)" : cur === "gold" ? "linear-gradient(#fff3b0,#c08a1e,#f5d36b)" : cur;
    ui.cap.textContent = (st.heads.find((h) => h.id === st.head) || { name: "Standard" }).name;
    ui.size.value = String(st.size);
    ui.sizeIn.value = String(st.size);
    ui.recent.innerHTML = st.recent.map((c) => `<button type="button" data-c="${esc(c)}" title="${esc(c)}" style="background:${c === "rainbow" ? `linear-gradient(135deg,${RAINBOW.join(",")})` : c === "chrome" ? "linear-gradient(#fff,#8a96a0)" : c === "gold" ? "linear-gradient(#fff3b0,#c08a1e)" : esc(c)}"${c === cur ? ' aria-pressed="true"' : ""}></button>`).join("");
    ui.undo.disabled = !api.mine();
    ui.redo.disabled = !st.redo;
    ui.boomBtn.textContent = boom.on ? "Next song (B)" : "Boombox (B)";
    ui.caps.querySelectorAll("[data-cap]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.cap === st.head)));
    if (/^#[0-9a-f]{6}$/.test(st.cur) && !ui.cpDrag) { ui.hsv = rgb2hsv(hex3(st.cur)); cpPaint(); }
    ui.hexIn.value = /^#/.test(cur) ? cur : cur;
    showTool(st.tool);
  }
  function cpPaint() {
    const [h, s, v] = ui.hsv, sv = ui.sv.getContext("2d"), W = ui.sv.width, H = ui.sv.height;
    sv.fillStyle = toHex(hsv2rgb(h, 1, 1)); sv.fillRect(0, 0, W, H);
    let g = sv.createLinearGradient(0, 0, W, 0); g.addColorStop(0, "#fff"); g.addColorStop(1, "rgba(255,255,255,0)"); sv.fillStyle = g; sv.fillRect(0, 0, W, H);
    g = sv.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "#000"); sv.fillStyle = g; sv.fillRect(0, 0, W, H);
    sv.strokeStyle = v > 0.5 ? "#000" : "#fff"; sv.lineWidth = 1.5; sv.beginPath(); sv.arc(s * W, (1 - v) * H, 4, 0, Math.PI * 2); sv.stroke();
    const hu = ui.hu.getContext("2d"), HW = ui.hu.width, HH = ui.hu.height;
    for (let i = 0; i < HW; i++) { hu.fillStyle = toHex(hsv2rgb((i / HW) * 360, 1, 1)); hu.fillRect(i, 0, 1, HH); }
    hu.fillStyle = "#000"; hu.fillRect(Math.round((h / 360) * HW) - 1, 0, 3, HH); hu.fillStyle = "#fff"; hu.fillRect(Math.round((h / 360) * HW), 0, 1, HH);
    const cur = toHex(hsv2rgb(h, s, v));
    ui.shades.innerHTML = [0.6, 0.35, 0.15].map((t) => mixHex(cur, "#ffffff", t)).concat([cur], [0.25, 0.5, 0.75].map((t) => mixHex(cur, "#000000", t))).map((c) => `<button type="button" data-c="${c}" style="background:${c}" title="${c}"></button>`).join("");
  }

  function buildUi() {
    const el = document.createElement("div");
    el.className = "w3-ui";
    const slot = ([t, name], i) => `<button type="button" class="w3-slot" data-t="${t}" title="${name} (${i + 1})">${wallIcon(t, 32)}<b>${i + 1}</b><span>${name}</span>${t === "roller" ? '<i class="rb-lv" aria-hidden="true"><b data-roll-lv></b></i>' : ""}</button>`;
    el.innerHTML = `<div class="w3-cross" aria-hidden="true"><i></i></div>
<div class="w3-info"><b>The Big Wall</b><span data-where></span></div>
<div class="w3-hint" data-hint hidden></div>
<div class="w3-bar">${TOOLS.map(slot).join("")}<span class="w3-cur"><i data-sw></i><span><b data-cap>Standard</b><input type="range" min="0" max="4" step="0.05" data-size-bar aria-label="Size" tabindex="-1"></span></span></div>
<div class="w3-count" hidden></div>
<div class="w3-flashlight" aria-hidden="true"></div>
<div class="w3-start w3-card" role="dialog" aria-label="The Big Wall"><header class="tb"><span class="tb-t">The Big Wall</span></header><div class="w3-pad">
<p><b>The same wall as on the map, only twelve meters tall.</b> The bottom 3.2 m is everything painted so far; above it the wall is fresh. Everyone painting right now is here with you.</p>
<table class="w3-keys"><tr><td>Mouse</td><td>look, hold the left button to spray</td></tr><tr><td>W A S D</td><td>walk (Shift runs)</td></tr><tr><td>1 to 9</td><td>spray, chalk, neon, rainbow, roller, eraser, roller eraser, tape, stencil</td></tr><tr><td>Wheel</td><td>size; closer to the wall sprays thinner</td></tr><tr><td>C, X</td><td>next spray cap, next color</td></tr><tr><td>Right button</td><td>take a color from the wall</td></tr><tr><td>E</td><td>get on or off the scissor lift; on it, Space goes up and Shift down</td></tr><tr><td>F</td><td>photo drone</td></tr><tr><td>B</td><td>boombox, again for the next song</td></tr><tr><td>Z</td><td>undo (Shift+Z redo)</td></tr><tr><td>Tab or Esc</td><td>menu and colors</td></tr></table>
<p class="w3-row"><button class="btn go" type="button" data-play>Play</button><a class="btn" href="/">Back to the map</a></p></div></div>
<div class="w3-menu w3-card" role="dialog" aria-label="Paused" hidden><header class="tb"><span class="tb-t">The Big Wall - Paused</span><span class="tb-btns"><button class="tb-x" type="button" data-play aria-label="Back to the wall"></button></span></header><div class="w3-pad w3-cols">
<section><h3>Color</h3><canvas class="w3-sv" width="200" height="120" data-sv></canvas><canvas class="w3-hu" width="200" height="14" data-hu></canvas>
<p class="w3-row"><input type="text" maxlength="7" data-hex spellcheck="false" aria-label="Color code"><button class="btn" type="button" data-metal="chrome">Chrome</button><button class="btn" type="button" data-metal="gold">Gold</button></p>
<div class="w3-sw" data-shades></div><h4>Recent</h4><div class="w3-sw" data-recent></div></section>
<section><h3>Spray cap</h3><div class="w3-caps" data-caps></div><h3>Size</h3><input type="range" min="0" max="4" step="0.05" data-size aria-label="Size"><p class="w3-note">Closer to the wall sprays thinner and sharper, farther away wider.</p></section>
<section><h3>Wall</h3><p class="w3-row"><button class="btn" type="button" data-undo>Undo (Z)</button><button class="btn" type="button" data-redo>Redo</button></p><p class="w3-row"><button class="btn" type="button" data-stencils>Stencils...</button></p>
<p class="w3-row"><button class="btn" type="button" data-drone>Photo drone (F)</button><button class="btn" type="button" data-boom>Boombox (B)</button></p>
<p class="w3-note">Songs on the boombox are free CC0 tracks from freesound.org.</p>
<p class="w3-row"><button class="btn go" type="button" data-play>Back to the wall</button><a class="btn" href="/">Back to the map</a></p></section></div></div>
<div class="w3-photo w3-card" role="dialog" aria-label="Drone photo" hidden><header class="tb"><span class="tb-t">Drone photo</span></header><div class="w3-pad"><img alt="Photo of the wall taken by the drone" data-photo-img><p class="w3-note" data-photo-note></p><p class="w3-row"><a class="btn" data-photo-save>Save again</a><button class="btn go" type="button" data-photo-ok>Fly back</button></p></div></div>
<div class="w3-dlg" data-dlg></div>`;
    root.append(el);
    const $ = (s) => el.querySelector(s);
    const u = {
      root: el, slots: [...el.querySelectorAll(".w3-slot")], swatch: $("[data-sw]"), cap: $("[data-cap]"), sizeIn: $("[data-size-bar]"), size: $("[data-size]"),
      recent: $("[data-recent]"), shades: $("[data-shades]"), sv: $("[data-sv]"), hu: $("[data-hu]"), hexIn: $("[data-hex]"), caps: $("[data-caps]"), undo: $("[data-undo]"), redo: $("[data-redo]"),
      boomBtn: $("[data-boom]"), menu: $(".w3-menu"), start: $(".w3-start"), hint: $("[data-hint]"), where: $("[data-where]"), count: $(".w3-count"), flashEl: $(".w3-flashlight"),
      photo: $(".w3-photo"), photoImg: $("[data-photo-img]"), photoSave: $("[data-photo-save]"), photoNote: $("[data-photo-note]"), dlg: $("[data-dlg]"), hsv: [0, 1, 1], cpDrag: false,
    };
    const st = api.get();
    u.caps.innerHTML = [{ id: "std", name: "Standard" }, ...st.heads.filter((h) => h.id !== "std")].map((h) => `<button type="button" data-cap="${h.id}" title="${esc(h.about || h.name)}"><canvas width="72" height="36"></canvas><span>${esc(h.name)}</span></button>`).join("");
    u.caps.querySelectorAll("[data-cap]").forEach((b) => {
      const c = b.querySelector("canvas").getContext("2d"), pts = [];
      c.fillStyle = "#a4503a"; c.fillRect(0, 0, 72, 36);
      for (let i = 0; i <= 24; i++) pts.push(10 + (i / 24) * 52, 18 + Math.sin((i / 24) * Math.PI * 2) * 8);
      paintOp({ id: "-cap3-" + b.dataset.cap, p: 0, k: "d", c: "#ffffff", h: b.dataset.cap === "std" ? undefined : b.dataset.cap, w: 5, d: pts }, c, { x0: 0, y0: 0, r: 1 });
    });
    el.addEventListener("click", (e) => {
      const b = e.target.closest("button, a");
      if (!b) return;
      if (b.hasAttribute("data-play")) { lock(); return; }
      if (b.dataset.t) { pickTool(b.dataset.t); return; }
      if (b.dataset.c) { setColor(b.dataset.c); return; }
      if (b.dataset.metal) { setColor(b.dataset.metal); return; }
      if (b.dataset.cap) { api.set({ head: b.dataset.cap, tool: "spray" }); hudSync(); return; }
      if (b.hasAttribute("data-undo")) { api.undo(); return; }
      if (b.hasAttribute("data-redo")) { api.redo(); return; }
      if (b.hasAttribute("data-stencils")) { api.set({ tool: "stencil" }); openPicker(); return; }
      if (b.hasAttribute("data-drone")) { startDrone(); return; }
      if (b.hasAttribute("data-boom")) { boomKey(); return; }
      if (b.hasAttribute("data-photo-ok")) { photoDone(); try { const r = cv.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (err) {} }
    });
    const sz = (e) => { api.set({ size: +e.target.value }); hudSync(); };
    u.size.addEventListener("input", sz);
    const pickSV = (e) => { const r = u.sv.getBoundingClientRect(); u.hsv[1] = clamp((e.clientX - r.left) / r.width, 0, 1); u.hsv[2] = 1 - clamp((e.clientY - r.top) / r.height, 0, 1); cpPaint(); };
    const pickHU = (e) => { const r = u.hu.getBoundingClientRect(); u.hsv[0] = clamp((e.clientX - r.left) / r.width, 0, 0.999) * 360; cpPaint(); };
    [[u.sv, pickSV], [u.hu, pickHU]].forEach(([c, f]) => {
      c.addEventListener("pointerdown", (e) => { u.cpDrag = true; c.setPointerCapture(e.pointerId); f(e); });
      c.addEventListener("pointermove", (e) => { if (u.cpDrag) f(e); });
      c.addEventListener("pointerup", () => { u.cpDrag = false; setColor(toHex(hsv2rgb(...u.hsv))); });
    });
    u.hexIn.addEventListener("change", () => { const v = u.hexIn.value.trim().toLowerCase(); if (/^#[0-9a-f]{6}$/.test(v)) setColor(v); });
    return u;
  }

  function hint(text) {
    if (text === hintT) return;
    hintT = text;
    ui.hint.hidden = !text;
    ui.hint.textContent = text;
  }
  function info(res) {
    const m = Math.max(0, Math.round(me.lift ? lift.x : me.x)), h = me.lift ? deckY() + 1.6 : EYE, n = api.others().length;
    const w = wallet();
    ui.where.textContent = `${m} m from the start, eyes ${h.toFixed(1)} m up${n ? `, ${n} painting with you` : ""}${w ? `, ${Math.floor(w.szy)} szyszki` : ""}`;
    const st = api.get();
    let t = "";
    if (drone.on) t = "";
    else if (me.lift) t = lift.h < 0.15 ? "Space up, Shift down, W A S D drive, E get off" : `Lift at ${lift.h.toFixed(1)} m: Space up, Shift down, W A S D drive`;
    else if (nearLift()) t = "E: get on the scissor lift";
    else if (res && res.far && res.hy > WALL_H) t = "That is above the wall";
    else if (res && res.far && res.hx >= 0 && res.hy >= 0) t = st.tool === "chalk" || st.tool === "eraser" || st.tool === "roller" || st.tool === "wipe" ? "Walk up to the wall to touch it" : "Too far from the wall, walk closer";
    else if (res && res.hy > EYE + 1.6 && !me.lift) t = "Take the scissor lift to reach up there (E next to it)";
    hint(t);
  }

  let rollQ = 1;
  function rollLv(q) {
    if (q >= 1 && rollQ < 0.97) { shot("dip", 0.55, 0.92 + Math.random() * 0.16); if (!anim.swap) anim.swap = { t: 0, to: "roller" }; }
    rollQ = q;
    const el = ui && ui.root.querySelector("[data-roll-lv]");
    if (!el) return;
    el.style.transition = q >= 1 ? "transform .6s cubic-bezier(.2,.8,.3,1)" : "transform .1s linear";
    el.style.transform = `scaleY(${q})`;
    el.parentNode.classList.toggle("dry", q < 0.35);
  }

  function afterStroke() {
    W3.tiles.forEach((t) => { if (t.stale) { t.stale = false; queueTile(t); } });
    const m = api.made();
    if (m > painted) {
      painted = m;
      const marks = [3, 25, 60, 120, 200];
      while (earned < marks.length && painted >= marks[earned]) { earned++; dispatchEvent(new CustomEvent("gz:painted")); }
    }
  }

  let strokeT = 0, last = performance.now(), frame = 0;
  function tick(now) {
    requestAnimationFrame(tick);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    frame++;
    if (locked && !drone.on) move(dt);
    else { me.speed = 0; if (!me.lift) loop("steps", 0); placeLift(); }
    if (me.climb > 0) me.climb = Math.max(0, me.climb - dt);
    if (!drone.on) {
      camera.position.copy(eyePos());
      if (me.climb > 0) camera.position.y -= me.climb * 2.5;
      camera.rotation.set(me.pitch, me.yaw, 0);
    } else droneStep(dt);
    camera.updateMatrixWorld();
    const cx = camera.position.x;
    sky.position.set(cx, 0, camera.position.z);
    clouds.forEach((c) => { const d = c.userData; d.a += d.s * dt * 0.05; c.position.set(Math.cos(d.a) * d.r, d.y, Math.sin(d.a) * d.r); });
    followGround(cx);
    if (frame % 10 === 1) { followChunks(cx); followWall(cx); }
    if (frame % 10 === 6) detail();
    if (dt > 0.026) slow++; else slow = Math.max(0, slow - 1);
    if (slow > 90 && DPRX > 1) { DPRX = 1; slow = 0; resize(); }
    if (!FROZEN) { waterTex.offset.x = (now / 1000) * 0.02; waterTex.offset.y = Math.sin(now / 1700) * 0.04; }

    const res = computeAim(), st = api.get();
    if (mouseDown && locked && !drone.on) {
      if (aim) {
        if (!api.busy() && strokeT === 0) { api.down(); strokeT = now; if (st.tool === "tape") shot("tape", 0.5); else if (st.tool === "spray" || st.tool === "bands" || st.tool === "neon") shot("pssht", 0.35); }
        else if (!api.busy() && st.tool !== "tape" && st.tool !== "stencil" && now - strokeT > 60) { api.down(); strokeT = now; }
        else api.move();
      } else if (api.painting()) { api.up(); afterStroke(); }
    } else if (aim && now - lastHover > 120 && !api.busy()) { lastHover = now; api.hover(); }
    if (st.sheets < lastSheets) shot("peel", 0.6);
    if (st.tapes < lastTapes) shot("rip", 0.6);
    lastSheets = st.sheets; lastTapes = st.tapes;

    const spraying = api.painting() && (st.tool === "spray" || st.tool === "bands" || st.tool === "neon");
    const rate = st.head === "skinny" ? 1.18 : st.head === "fat" || st.head === "splat" ? 0.86 : st.head === "soft" || st.head === "dust" ? 1.06 : 1;
    loop("spray", spraying ? (st.head === "brush" ? 0.22 : 0.5) : 0, rate);
    loop("chalk", api.painting() && st.tool === "chalk" ? 0.55 : 0, 1);
    loop("eraser", api.painting() && st.tool === "eraser" ? 0.5 : 0, 1);
    loop("roll", api.painting() && (st.tool === "roller" || st.tool === "wipe") ? 0.75 : 0, 1);
    loop("meadow", 0.32);
    loop("creek", clamp(1 - Math.abs(camera.position.z - 14) / 22, 0.05, 0.5) * 0.6);
    if (!me.lift) loop("lift", 0);
    stepAudio(dt);

    if (aim && !drone.on && st.tool !== "stencil") {
      const w = api.width() * U;
      ringGrp.visible = true;
      ringGrp.position.set(aim.x * U, Y(aim.y), 0.006);
      ringGrp.scale.setScalar(Math.max(0.01, w));
    } else ringGrp.visible = false;

    anim.dip = anim.swap ? Math.sin(Math.min(1, anim.swap.t / 0.3) * Math.PI) : 0;
    if (anim.swap) { anim.swap.t += dt; if (anim.swap.t > 0.15 && !anim.swap.done) { anim.swap.done = true; showTool(anim.swap.to); } if (anim.swap.t > 0.3) anim.swap = null; }
    anim.shake = Math.max(0, anim.shake - dt);
    anim.spray = lerp(anim.spray, api.painting() ? 1 : 0, 1 - Math.exp(-dt * 14));
    const bob = Math.sin(me.walk * 3.2) * 0.012 * clamp(me.speed / 3.4, 0, 1);
    hand.position.set(handBase.x + Math.cos(me.walk * 1.6) * 0.008 * clamp(me.speed / 3.4, 0, 1), handBase.y + bob - anim.dip * 0.28 + Math.sin(anim.shake * 40) * 0.035 * (anim.shake > 0 ? 1 : 0), handBase.z - anim.spray * 0.05);
    hand.rotation.set(-0.25 + anim.spray * 0.35 + (anim.spray > 0.5 ? (Math.random() - 0.5) * 0.02 : 0), -0.35, 0.08);
    finger.position.y = 0.142 - anim.spray * 0.012;
    hand.visible = !drone.on;

    if (api.painting() && aim && (st.tool === "spray" || st.tool === "bands" || st.tool === "neon") && st.head !== "brush") {
      const nozzle = tmpV2.set(0.22, -0.13, -0.4).applyMatrix4(camera.matrixWorld), target = new THREE.Vector3(aim.x * U, Y(aim.y), 0);
      const color = st.tool === "bands" ? "rainbow" : st.tool === "neon" ? "n" + st.hex : st.color;
      mist.acc += dt * (st.head === "fat" || st.head === "splat" ? 260 : st.head === "skinny" ? 110 : 180);
      const n = Math.floor(mist.acc);
      mist.acc -= n;
      emit(nozzle.clone(), target, color, n, st.head === "fat" ? 0.22 : st.head === "skinny" ? 0.06 : 0.14, 5.5, false);
    } else if (api.painting() && aim && (st.tool === "chalk" || st.tool === "eraser") && Math.random() < dt * 14) {
      const at = new THREE.Vector3(aim.x * U, Y(aim.y), 0.01);
      emit(at, at.clone().add(tmpV.set(0, -1, 0.2)), st.tool === "chalk" ? st.hex : Math.random() < 0.5 ? "#ff9ec7" : "#bdbdbd", 2, 0.6, 0.3, true);
    }
    stepMist(dt);

    selfFig.visible = drone.on;
    if (drone.on) { const e = eyePos(); selfFig.position.set(e.x, e.y - 1.65, e.z); }
    if (boom.on) {
      if (boom.onLift) boom.mesh.position.set(lift.x + boom.lx, deckY(), lift.z + boom.lz);
      else boom.mesh.position.set(boom.x, 0, boom.z);
      const lv = AC.an ? AC.an.getAverageFrequency() / 255 : 0;
      boom.cones.forEach((c) => c.scale.setScalar(1 + lv * 0.5));
    }
    if (frame % 4 === 0) syncMates(dt * 4);
    mates.forEach((m) => { if (m.live && m.aim && Math.random() < dt * 30) emit(new THREE.Vector3(m.x + 0.25, m.y + 1.25, 0.62), new THREE.Vector3(m.aim[0], m.aim[1], 0), m.c && /^#/.test(m.c) ? m.c : "#ffffff", 2, 0.12, 4.5, false); });

    pump(5);
    uploads();
    if (frame % 2 === 0 || api.busy()) overlays();
    if (frame % 15 === 0) info(res);

    renderer.setRenderTarget(null);
    renderer.clear();
    renderer.render(scene, camera);
    if (!drone.on) { renderer.clearDepth(); renderer.render(hud, hudCam); }
  }

  ui.start.hidden = false;
  ui.menu.hidden = true;
  placeLift();
  followGround(me.x);
  followChunks(me.x);
  for (let i = 0; i < 4; i++) followWall(me.x);
  hudSync();
  requestAnimationFrame(tick);
}
