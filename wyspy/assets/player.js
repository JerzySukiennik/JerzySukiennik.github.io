// The walking character, the remote copies of it, and both control schemes.

import * as THREE from "three";
import { terrainAt } from "island/world";

const SPEED = 9.2;
const ACCEL = 12;
const PARTS = ["LegL", "LegR", "ArmL", "ArmR", "Torso", "Head"];

export function makeAvatar(lib, prefix, color) {
  const root = lib[prefix].clone(true);
  root.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = true;
    o.receiveShadow = true;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    const swapped = mats.map((m) => {
      if (color && m && m.name === "M_tee") {
        const c = m.clone();
        c.color.setHex(color);
        return c;
      }
      return m;
    });
    o.material = Array.isArray(o.material) ? swapped : swapped[0];
  });
  const parts = {};
  root.traverse((o) => {
    for (const p of PARTS) if (o.name === prefix + "_" + p) parts[p] = o;
  });
  return { root, parts };
}

export function animateAvatar(av, speed, phase) {
  const sw = Math.sin(phase) * Math.min(1, speed / SPEED) * 0.85;
  const bob = Math.abs(Math.cos(phase)) * Math.min(1, speed / SPEED) * 0.09;
  const P = av.parts;
  if (P.LegL) P.LegL.rotation.x = sw;
  if (P.LegR) P.LegR.rotation.x = -sw;
  if (P.ArmL) P.ArmL.rotation.x = -sw * 0.75;
  if (P.ArmR) P.ArmR.rotation.x = sw * 0.75;
  if (P.Torso) {
    if (av.baseTorso === undefined) av.baseTorso = P.Torso.position.y;
    P.Torso.position.y = av.baseTorso + bob;
    P.Torso.rotation.y = Math.sin(phase) * 0.07;
  }
  if (P.Head) {
    if (av.baseHead === undefined) av.baseHead = P.Head.position.y;
    P.Head.position.y = av.baseHead + bob * 1.1;
  }
}

export class Player {
  constructor(lib, prefix, color, world, terrain, blockers, start) {
    this.av = makeAvatar(lib, prefix, color);
    this.root = this.av.root;
    this.root.position.set(start[0], 1, start[1]);
    this.root.rotation.y = 0;
    world.add(this.root);
    this.terrain = terrain;
    this.blockers = blockers;
    this.vel = new THREE.Vector3();
    this.phase = 0;
    this.speed = 0;
  }

  get position() { return this.root.position; }

  canStand(x, z) {
    const k = terrainAt(this.terrain, x, z);
    if (k !== 1 && k !== 2) return false;
    for (const b of this.blockers) {
      const dx = x - b[0], dz = z - b[1];
      if (dx * dx + dz * dz < b[2] * b[2]) return false;
    }
    return true;
  }

  update(dt, dir) {
    const want = new THREE.Vector3(dir.x, 0, dir.z);
    const mag = Math.min(1, want.length());
    if (mag > 0.001) want.normalize().multiplyScalar(mag * SPEED);
    this.vel.lerp(want, Math.min(1, ACCEL * dt));
    if (this.vel.lengthSq() < 0.0004) this.vel.set(0, 0, 0);

    const p = this.root.position;
    const nx = p.x + this.vel.x * dt;
    const nz = p.z + this.vel.z * dt;
    if (this.canStand(nx, p.z)) p.x = nx; else this.vel.x *= 0.2;
    if (this.canStand(p.x, nz)) p.z = nz; else this.vel.z *= 0.2;

    this.speed = Math.hypot(this.vel.x, this.vel.z);
    if (this.speed > 0.25) {
      const target = Math.atan2(this.vel.x, this.vel.z) + Math.PI;
      let d = target - this.root.rotation.y;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      this.root.rotation.y += d * Math.min(1, dt * 14);
    }
    this.phase += this.speed * dt * 1.65;
    animateAvatar(this.av, this.speed, this.phase);
  }
}

export class Remote {
  constructor(lib, world, color) {
    this.av = makeAvatar(lib, "PL", color);
    this.root = this.av.root;
    this.root.position.set(0, 1, 0);
    world.add(this.root);
    this.target = new THREE.Vector3(0, 1, 0);
    this.targetYaw = 0;
    this.phase = 0;
    this.speed = 0;
    this.seen = 0;
  }

  set(x, z, ry) {
    this.target.set(x, 1, z);
    this.targetYaw = ry;
    this.seen = performance.now();
  }

  update(dt) {
    const p = this.root.position;
    const prev = p.clone();
    p.lerp(this.target, Math.min(1, dt * 9));
    this.speed = prev.distanceTo(p) / Math.max(dt, 0.0001);
    let d = this.targetYaw - this.root.rotation.y;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    this.root.rotation.y += d * Math.min(1, dt * 10);
    this.phase += this.speed * dt * 1.65;
    animateAvatar(this.av, this.speed, this.phase);
  }

  dispose(world) {
    world.remove(this.root);
  }
}

export class Controls {
  constructor(dom, camera, getPlayerPos, onTap) {
    this.keys = new Set();
    this.steer = null;
    this.camera = camera;
    this.dom = dom;
    this.getPlayerPos = getPlayerPos;
    this.onTap = onTap;
    this.enabled = true;

    const kd = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) {
        this.keys.add(k);
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", kd, { passive: false });
    window.addEventListener("keyup", (e) => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener("blur", () => this.keys.clear());

    let downAt = 0, downX = 0, downY = 0, moved = false, pid = null, isTouch = false;
    dom.addEventListener("pointerdown", (e) => {
      pid = e.pointerId;
      isTouch = e.pointerType !== "mouse";
      downAt = performance.now();
      downX = e.clientX; downY = e.clientY;
      moved = false;
      if (isTouch) this.steer = { x: e.clientX, y: e.clientY };
    });
    dom.addEventListener("pointermove", (e) => {
      if (e.pointerId !== pid) return;
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > 12) moved = true;
      if (this.steer) { this.steer.x = e.clientX; this.steer.y = e.clientY; }
    });
    const end = (e) => {
      if (e.pointerId !== pid) return;
      const held = performance.now() - downAt;
      this.steer = null;
      pid = null;
      if (!moved && held < 320) this.onTap(e.clientX, e.clientY);
    };
    dom.addEventListener("pointerup", end);
    dom.addEventListener("pointercancel", (e) => { if (e.pointerId === pid) { this.steer = null; pid = null; } });
  }

  direction() {
    const d = { x: 0, z: 0 };
    if (!this.enabled) return d;
    const k = this.keys;
    let ix = 0, iz = 0;
    if (k.has("w") || k.has("arrowup")) iz -= 1;
    if (k.has("s") || k.has("arrowdown")) iz += 1;
    if (k.has("a") || k.has("arrowleft")) ix -= 1;
    if (k.has("d") || k.has("arrowright")) ix += 1;
    const c = Math.SQRT1_2;
    if (ix || iz) {
      d.x = (ix + iz) * c;
      d.z = (iz - ix) * c;
      const len = Math.hypot(d.x, d.z);
      d.x /= len; d.z /= len;
      return d;
    }
    if (this.steer) {
      const p = this.getPlayerPos().clone().project(this.camera);
      const rect = this.dom.getBoundingClientRect();
      const sx = rect.left + (p.x * 0.5 + 0.5) * rect.width;
      const sy = rect.top + (-p.y * 0.5 + 0.5) * rect.height;
      const dx = this.steer.x - sx, dy = this.steer.y - sy;
      const dist = Math.hypot(dx, dy);
      if (dist < 26) return d;
      const mag = Math.min(1, (dist - 26) / 190 + 0.28);
      const ux = dx / dist, uy = dy / dist;
      d.x = (ux + uy) * c * mag;
      d.z = (uy - ux) * c * mag;
    }
    return d;
  }
}
