// Terrain generation and placement of the Blender authored props.

import * as THREE from "three";
import { GLTFLoader } from "gltf-loader";
import { PAL, DISTRICTS, CORRIDORS } from "island/islands";

const GW = 108, GH = 92, X0 = -54, Z0 = -46;

function hash2(x, z) {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function noise2(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z);
  const xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  const a = hash2(xi, zi), b = hash2(xi + 1, zi);
  const c = hash2(xi, zi + 1), d = hash2(xi + 1, zi + 1);
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
}

function rectDist(px, pz, r) {
  const dx = Math.max(r[0] - px, 0, px - r[2]);
  const dz = Math.max(r[1] - pz, 0, pz - r[3]);
  return Math.hypot(dx, dz);
}

function segDist(px, pz, s) {
  const vx = s[2] - s[0], vz = s[3] - s[1];
  const len2 = vx * vx + vz * vz || 1;
  let t = ((px - s[0]) * vx + (pz - s[1]) * vz) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (s[0] + vx * t), pz - (s[1] + vz * t));
}

export function makeTerrain() {
  const kind = new Uint8Array(GW * GH);
  const region = new Int8Array(GW * GH).fill(-1);
  const height = new Float32Array(GW * GH);
  for (let gz = 0; gz < GH; gz++) {
    for (let gx = 0; gx < GW; gx++) {
      const i = gz * GW + gx;
      const wx = X0 + gx + 0.5, wz = Z0 + gz + 0.5;
      const wob = (noise2(wx * 0.16, wz * 0.16) - 0.5) * 6;
      let best = Infinity, bestR = -1;
      for (let d = 0; d < DISTRICTS.length; d++) {
        const dist = rectDist(wx, wz, DISTRICTS[d].rect) - 2.5 - wob;
        if (dist < best) { best = dist; bestR = d; }
      }
      let pathDist = Infinity;
      for (const s of CORRIDORS) pathDist = Math.min(pathDist, segDist(wx, wz, s) - s[4] * 0.5);
      if (pathDist <= 0) { kind[i] = 2; region[i] = bestR; height[i] = 1; }
      else if (best <= 0) { kind[i] = 1; region[i] = bestR; height[i] = 1; }
      else {
        const edge = Math.min(best, pathDist);
        if (edge < 3.4) { kind[i] = 3; height[i] = 1 - (edge / 3.4) * 0.7; }
        else { kind[i] = 0; height[i] = 0; }
      }
    }
  }
  return { kind, region, height, GW, GH, X0, Z0 };
}

export function terrainAt(t, wx, wz) {
  const gx = Math.floor(wx - t.X0), gz = Math.floor(wz - t.Z0);
  if (gx < 0 || gz < 0 || gx >= t.GW || gz >= t.GH) return 0;
  return t.kind[gz * t.GW + gx];
}

function tint(hex, amount) {
  const c = new THREE.Color(hex);
  const hsl = {};
  c.getHSL(hsl);
  c.setHSL(hsl.h, Math.min(1, hsl.s * (1 + amount * 0.6)), Math.min(0.96, Math.max(0.03, hsl.l + amount)));
  return c;
}

function buildGround(t) {
  let count = 0;
  for (let i = 0; i < t.kind.length; i++) if (t.kind[i]) count++;
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.92, metalness: 0 });
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mat, count);
  mesh.receiveShadow = true;
  const m = new THREE.Matrix4();
  let n = 0;
  for (let gz = 0; gz < t.GH; gz++) {
    for (let gx = 0; gx < t.GW; gx++) {
      const i = gz * t.GW + gx;
      if (!t.kind[i]) continue;
      const wx = t.X0 + gx + 0.5, wz = t.Z0 + gz + 0.5;
      const h = t.height[i] + 2.2;
      m.makeScale(1.002, h, 1.002);
      m.setPosition(wx, h * 0.5 - 2.2, wz);
      mesh.setMatrixAt(n, m);
      let base;
      if (t.kind[i] === 2) base = PAL.path;
      else if (t.kind[i] === 3) base = PAL.shore;
      else base = DISTRICTS[t.region[i]] ? DISTRICTS[t.region[i]].color : PAL.grassA;
      mesh.setColorAt(n, tint(base, (hash2(gx * 3.1, gz * 7.7) - 0.5) * 0.08));
      n++;
    }
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  return mesh;
}

export function labelSprite(text, sub, opts) {
  const o = opts || {};
  const dpr = 2;
  const fs = (o.size || 40) * dpr, sfs = (o.subSize || 24) * dpr, pad = (o.pad || 22) * dpr;
  const probe = document.createElement("canvas").getContext("2d");
  probe.font = "800 " + fs + "px Anybody, system-ui, sans-serif";
  const w1 = probe.measureText(text).width;
  probe.font = "500 " + sfs + "px 'Fragment Mono', monospace";
  const w2 = sub ? probe.measureText(sub).width : 0;
  const c = document.createElement("canvas");
  c.width = Math.ceil(Math.max(w1, w2) + pad * 2);
  c.height = Math.ceil((sub ? fs * 1.06 + sfs * 1.5 : fs * 1.06) + pad * 2);
  const ctx = c.getContext("2d");
  const r = Math.min(c.height / 2, 22 * dpr);
  ctx.fillStyle = o.bg || "rgba(18,21,16,0.92)";
  ctx.beginPath();
  ctx.roundRect(0, 0, c.width, c.height, r);
  ctx.fill();
  if (o.ring) {
    ctx.strokeStyle = o.ring;
    ctx.lineWidth = 3 * dpr;
    ctx.beginPath();
    ctx.roundRect(1.5 * dpr, 1.5 * dpr, c.width - 3 * dpr, c.height - 3 * dpr, r - 1.5 * dpr);
    ctx.stroke();
  }
  ctx.fillStyle = o.fg || "#f2f3ef";
  ctx.font = "800 " + fs + "px Anybody, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(text, c.width / 2, pad + fs * 0.8);
  if (sub) {
    ctx.fillStyle = o.accent || "#9ec48b";
    ctx.font = "500 " + sfs + "px 'Fragment Mono', monospace";
    ctx.fillText(sub, c.width / 2, pad + fs * 0.8 + sfs * 1.4);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  const unit = (o.unit || 74) * dpr;
  sprite.scale.set(c.width / unit, c.height / unit, 1);
  sprite.renderOrder = 20;
  return sprite;
}

function orient(tex) {
  tex.center.set(0.5, 0.5);
  tex.rotation = Math.PI;
  return tex;
}

function plateTexture(title) {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 348;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#3f5340";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = "rgba(242,243,239,0.13)";
  ctx.lineWidth = 2;
  for (let x = 0; x < c.width; x += 26) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, c.height); ctx.stroke(); }
  for (let y = 0; y < c.height; y += 26) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(c.width, y); ctx.stroke(); }
  ctx.fillStyle = "rgba(242,243,239,0.75)";
  ctx.font = "500 30px 'Fragment Mono', monospace";
  ctx.textAlign = "center";
  ctx.fillText("no shot yet", c.width / 2, c.height / 2 + 4);
  ctx.fillStyle = "rgba(242,243,239,0.38)";
  ctx.font = "500 21px 'Fragment Mono', monospace";
  ctx.fillText(title.toUpperCase(), c.width / 2, c.height / 2 + 44);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return orient(tex);
}

export function loadProps(url) {
  return new Promise((resolve, reject) => {
    new GLTFLoader().load(url, (gltf) => {
      const lib = {};
      const dim = { M_chalk: 0x8e967f, M_stone: 0x6d7367, M_stoneDark: 0x6b7163 };
      gltf.scene.updateMatrixWorld(true);
      gltf.scene.traverse((o) => {
        if (o.name) lib[o.name] = o;
        if (o.isMesh) {
          o.castShadow = true;
          o.receiveShadow = true;
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          for (const mm of mats) {
            if (!mm) continue;
            mm.roughness = Math.min(1, (mm.roughness ?? 0.7) + 0.05);
            if (dim[mm.name] !== undefined) mm.color.setHex(dim[mm.name]);
          }
        }
      });
      resolve(lib);
    }, undefined, reject);
  });
}

export function firstMesh(node) {
  let found = null;
  node.traverse((o) => { if (!found && o.isMesh) found = o; });
  return found;
}

function instanced(sourceMesh, count) {
  const im = new THREE.InstancedMesh(sourceMesh.geometry, sourceMesh.material, count);
  im.castShadow = true;
  im.receiveShadow = true;
  im.frustumCulled = false;
  return im;
}

function scatter(t, taken) {
  const trees = [], rocks = [], bushes = [], tufts = [];
  for (let gz = 0; gz < t.GH; gz++) {
    for (let gx = 0; gx < t.GW; gx++) {
      const i = gz * t.GW + gx;
      const k = t.kind[i];
      if (!k || k === 2) continue;
      const wx = t.X0 + gx + 0.5, wz = t.Z0 + gz + 0.5;
      const h = hash2(gx * 1.7 + 4.2, gz * 2.3 + 9.1);
      if (k === 3) {
        if (h > 0.94) rocks.push([wx, t.height[i], wz, 0.55 + h * 0.8]);
        continue;
      }
      let near = false;
      for (const p of taken) { if (Math.abs(p[0] - wx) < 5.5 && Math.abs(p[1] - wz) < 5.5) { near = true; break; } }
      if (near) continue;
      let pathNear = Infinity;
      for (const s of CORRIDORS) pathNear = Math.min(pathNear, segDist(wx, wz, s));
      if (pathNear < 4.4) continue;
      if (h > 0.962) trees.push([wx, wz, 0.85 + hash2(gz, gx) * 0.55, hash2(gx, gz * 2) > 0.45 ? 0 : 1]);
      else if (h > 0.948) bushes.push([wx, wz, 0.8 + hash2(gz + 3, gx) * 0.6]);
      else if (h > 0.90) tufts.push([wx, wz, 0.7 + hash2(gz + 9, gx) * 0.7]);
      else if (h > 0.934) rocks.push([wx, 1, wz, 0.45 + hash2(gz + 5, gx) * 0.4]);
    }
  }
  return { trees, rocks, bushes, tufts };
}

export function buildWorld(scene, entries, landmarks, lib) {
  const t = makeTerrain();
  const world = new THREE.Group();
  scene.add(world);
  world.add(buildGround(t));

  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(520, 520),
    new THREE.MeshStandardMaterial({ color: PAL.water, roughness: 0.22, metalness: 0.1 })
  );
  water.rotation.x = -Math.PI / 2;
  water.position.y = 0.3;
  scene.add(water);

  const texLoader = new THREE.TextureLoader();
  const interactables = [];
  const taken = [];
  const blockers = [];

  const byCategory = new Map();
  for (const e of entries) {
    const d = DISTRICTS.find((x) => x.category === e.category) || DISTRICTS[1];
    if (!byCategory.has(d.id)) byCategory.set(d.id, []);
    byCategory.get(d.id).push(e);
  }

  const placed = [];
  for (const d of DISTRICTS) {
    const list = byCategory.get(d.id) || [];
    if (!list.length) continue;
    const [x1, z1, x2, z2] = d.rect;
    const cols = Math.max(1, Math.round(Math.sqrt(list.length * (x2 - x1) / (z2 - z1))));
    const rows = Math.ceil(list.length / cols);
    const cw = (x2 - x1) / cols, ch = (z2 - z1) / rows;
    list.forEach((e, idx) => {
      const cx = x1 + cw * (idx % cols) + cw / 2;
      const cz = z1 + ch * Math.floor(idx / cols) + ch / 2;
      placed.push({ e, cx, cz, district: d });
      taken.push([cx, cz]);
      blockers.push([cx, cz, 2.1]);
    });
  }

  const mat4 = new THREE.Matrix4();
  const quat = new THREE.Quaternion();
  const vec = new THREE.Vector3();
  const yAxis = new THREE.Vector3(0, 1, 0);
  const KS = 0.8;
  const beaconSrc = firstMesh(lib["Beacon"]);

  placed.forEach((k) => {
    const node = lib["Kiosk"].clone(true);
    node.position.set(k.cx, 1, k.cz);
    node.rotation.y = Math.PI * 0.25;
    node.scale.setScalar(KS);
    let screen = null;
    node.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = true;
      o.receiveShadow = true;
      if (o.name.indexOf("Kiosk_Screen") === 0) screen = o;
    });
    if (screen) {
      screen.material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.88, metalness: 0 });
      screen.castShadow = false;
      if (k.e.image) {
        texLoader.load(k.e.image, (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.anisotropy = 4;
          screen.material.map = orient(tex);
          screen.material.needsUpdate = true;
        }, undefined, () => {
          screen.material.map = plateTexture(k.e.name);
          screen.material.needsUpdate = true;
        });
      } else {
        screen.material.map = plateTexture(k.e.name);
      }
    }
    world.add(node);

    const label = labelSprite(k.e.name, k.e.category.toUpperCase(), { size: 40, subSize: 22, unit: 74 });
    label.position.set(k.cx, 4.7, k.cz);
    world.add(label);

    const beacon = new THREE.Mesh(beaconSrc.geometry, beaconSrc.material.clone());
    beacon.position.set(k.cx, 4.2, k.cz);
    beacon.castShadow = false;
    world.add(beacon);

    interactables.push({
      id: "p:" + k.e.slug, type: "project", x: k.cx, z: k.cz, radius: 5.4,
      data: k.e, district: k.district, label, beacon
    });
  });

  for (const lm of landmarks) {
    const src = lib[lm.model];
    if (!src) continue;
    const node = src.clone(true);
    node.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    node.position.set(lm.pos[0], 1, lm.pos[1]);
    node.rotation.y = Math.PI * 0.25;
    world.add(node);
    const tall = lm.model === "LM_pad";
    const label = labelSprite(lm.label, "ABOUT", { size: 40, subSize: 22, unit: 74, accent: "#e6d08a" });
    label.position.set(lm.pos[0], tall ? 7.4 : 5.2, lm.pos[1]);
    world.add(label);
    const beacon = new THREE.Mesh(beaconSrc.geometry, beaconSrc.material.clone());
    beacon.position.set(lm.pos[0], tall ? 6.9 : 4.7, lm.pos[1]);
    beacon.castShadow = false;
    world.add(beacon);
    taken.push(lm.pos);
    blockers.push([lm.pos[0], lm.pos[1], 2.2]);
    interactables.push({
      id: "l:" + lm.id, type: "landmark", x: lm.pos[0], z: lm.pos[1], radius: 5.0,
      data: lm, label, beacon
    });
  }

  const districtSigns = DISTRICTS.filter((d) => (byCategory.get(d.id) || []).length || d.id === "clearing")
    .map((d) => {
      const cx = (d.rect[0] + d.rect[2]) / 2, cz = (d.rect[1] + d.rect[3]) / 2;
      const s = labelSprite(d.name.toUpperCase(), d.category ? d.category.toUpperCase() : null, {
        size: 56, subSize: 26, unit: 46, pad: 30,
        bg: "rgba(244,246,240,0.94)", fg: "#141710", accent: "#4b6b3d",
        ring: "rgba(20,23,16,0.18)"
      });
      s.material.opacity = 0;
      s.position.set(cx, 13.5, cz);
      scene.add(s);
      return { sprite: s, x: cx, z: cz };
    });

  const s = scatter(t, taken);
  const packs = [
    ["Tree_A", s.trees.filter((x) => x[3] === 0)],
    ["Tree_B", s.trees.filter((x) => x[3] === 1)],
    ["Bush", s.bushes],
    ["Tuft", s.tufts]
  ];
  for (const [name, list] of packs) {
    if (!list.length || !lib[name]) continue;
    const im = instanced(firstMesh(lib[name]), list.length);
    list.forEach((it, i) => {
      const sc = it[2];
      quat.setFromAxisAngle(yAxis, hash2(i, 3) * 6.2832);
      vec.set(it[0], 1, it[1]);
      im.setMatrixAt(i, mat4.compose(vec, quat, new THREE.Vector3(sc, sc, sc)));
      if (name.startsWith("Tree")) blockers.push([it[0], it[1], 0.75]);
    });
    im.instanceMatrix.needsUpdate = true;
    world.add(im);
  }

  const rockMesh = instanced(firstMesh(lib["Rock"]), s.rocks.length);
  s.rocks.forEach((r, i) => {
    const sc = r[3];
    quat.setFromAxisAngle(yAxis, hash2(i, 5) * 6.2832);
    vec.set(r[0], r[1], r[2]);
    rockMesh.setMatrixAt(i, mat4.compose(vec, quat, new THREE.Vector3(sc, sc * 0.8, sc)));
  });
  rockMesh.instanceMatrix.needsUpdate = true;
  world.add(rockMesh);

  return { terrain: t, interactables, blockers, world, districtSigns };
}
