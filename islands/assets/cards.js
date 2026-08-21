// Cards that open in world space: project sheets and speech, both with real 3D buttons.

import * as THREE from "three";

const INK = "#141710";
const PAPER = "#f4f6f0";
const MOSS = "#4b6b3d";

function canvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  return c;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function wrap(ctx, text, maxWidth) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = "";
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = w; }
    else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

function texture(c) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function plane(w, h, tex) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false })
  );
  m.renderOrder = 40;
  return m;
}

function buttonTexture(label, primary, hover) {
  const W = 520, H = 150;
  const c = canvas(W, H);
  const ctx = c.getContext("2d");
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = primary ? (hover ? "#2b3a22" : INK) : (hover ? "#e2e7d6" : PAPER);
  roundRect(ctx, 6, 6, W - 12, H - 12, (H - 12) / 2);
  ctx.fill();
  if (!primary) {
    ctx.strokeStyle = "rgba(20,23,16,0.26)";
    ctx.lineWidth = 4;
    ctx.stroke();
  }
  ctx.fillStyle = primary ? PAPER : INK;
  ctx.font = "600 52px 'IBM Plex Sans', system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, W / 2, H / 2 + 2);
  return texture(c);
}

class Button {
  constructor(label, primary, action, w) {
    this.label = label;
    this.primary = primary;
    this.action = action;
    this.normal = buttonTexture(label, primary, false);
    this.hovered = buttonTexture(label, primary, true);
    this.mesh = plane(w, w * 150 / 520, this.normal);
    this.mesh.userData.button = this;
    this.hover = false;
  }
  setHover(v) {
    if (v === this.hover) return;
    this.hover = v;
    this.mesh.material.map = v ? this.hovered : this.normal;
    this.mesh.material.needsUpdate = true;
  }
}

export class WorldCard {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.visible = false;
    this.group.renderOrder = 40;
    scene.add(this.group);
    this.buttons = [];
    this.open = false;
    this.t = 0;
    this.anchor = new THREE.Vector3();
    this.onAction = () => {};
  }

  clear() {
    for (const b of this.buttons) {
      this.group.remove(b.mesh);
      b.mesh.geometry.dispose();
      b.normal.dispose();
      b.hovered.dispose();
    }
    this.buttons = [];
    if (this.panel) {
      this.group.remove(this.panel);
      this.panel.geometry.dispose();
      if (this.panel.material.map) this.panel.material.map.dispose();
      this.panel = null;
    }
  }

  build(draw, width, height, buttons) {
    this.clear();
    const c = canvas(Math.round(width * 128), Math.round(height * 128));
    draw(c.getContext("2d"), c.width, c.height);
    this.panel = plane(width, height, texture(c));
    this.panel.position.set(0, height / 2, 0);
    this.group.add(this.panel);

    const bw = Math.min(3.6, (width - 0.8) / Math.max(1, buttons.length) - 0.35);
    const bh = bw * 150 / 520;
    const total = buttons.length * bw + (buttons.length - 1) * 0.35;
    buttons.forEach((b, i) => {
      const btn = new Button(b.label, !!b.primary, b.action, bw);
      btn.mesh.position.set(-total / 2 + bw / 2 + i * (bw + 0.35), -bh / 2 - 0.35, 0.02);
      this.group.add(btn.mesh);
      this.buttons.push(btn);
    });
    this.bottom = bh + 0.7;
  }

  showProject(entry, at) {
    const W = 12.6, H = 8.4;
    const body = (entry.body || []).slice(0, 2);
    this.build((ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = PAPER;
      roundRect(ctx, 0, 0, w, h, 46);
      ctx.fill();
      const pad = 62;
      let y = pad + 26;
      ctx.textAlign = "left";
      ctx.fillStyle = MOSS;
      ctx.font = "500 32px 'Fragment Mono', monospace";
      ctx.fillText(entry.category.toUpperCase() + "   " + String(entry.year || "").toUpperCase(), pad, y);
      y += 74;
      ctx.fillStyle = INK;
      ctx.font = "900 82px Anybody, system-ui, sans-serif";
      for (const line of wrap(ctx, entry.name, w - pad * 2).slice(0, 2)) {
        ctx.fillText(line, pad, y);
        y += 88;
      }
      y += 12;
      ctx.font = "400 44px 'IBM Plex Sans', system-ui, sans-serif";
      ctx.fillStyle = "rgba(20,23,16,0.82)";
      for (const line of wrap(ctx, entry.blurb, w - pad * 2).slice(0, 3)) {
        ctx.fillText(line, pad, y);
        y += 56;
      }
      y += 22;
      ctx.font = "400 36px 'IBM Plex Sans', system-ui, sans-serif";
      ctx.fillStyle = "rgba(20,23,16,0.62)";
      for (const p of body) {
        for (const line of wrap(ctx, p, w - pad * 2).slice(0, 3)) {
          if (y > h - pad) break;
          ctx.fillText(line, pad, y);
          y += 47;
        }
        y += 14;
        if (y > h - pad) break;
      }
    }, W, H, [
      entry.url ? { label: "Open it", primary: true, action: { type: "link", href: entry.url } } : null,
      entry.repo ? { label: "See code", action: { type: "link", href: entry.repo } } : null,
      { label: "Close", action: { type: "close" } }
    ].filter(Boolean));
    this.place(at, H);
  }

  showSpeech(name, lines, index, at) {
    const W = 10.2, H = 5.0;
    this.build((ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = PAPER;
      roundRect(ctx, 0, 0, w, h, 44);
      ctx.fill();
      const pad = 58;
      ctx.textAlign = "left";
      ctx.fillStyle = MOSS;
      ctx.font = "500 26px 'Fragment Mono', monospace";
      ctx.fillText(name.toUpperCase(), pad, pad + 20);
      ctx.fillStyle = INK;
      ctx.font = "400 46px 'IBM Plex Sans', system-ui, sans-serif";
      let y = pad + 104;
      for (const line of wrap(ctx, lines[index], w - pad * 2).slice(0, 6)) {
        ctx.fillText(line, pad, y);
        y += 62;
      }
      const dotY = h - pad + 4;
      lines.forEach((_, i) => {
        ctx.beginPath();
        ctx.arc(pad + 12 + i * 30, dotY, i === index ? 9 : 6, 0, 6.283);
        ctx.fillStyle = i === index ? MOSS : "rgba(20,23,16,0.22)";
        ctx.fill();
      });
    }, W, H, [
      { label: "Back", action: { type: "back" } },
      { label: index < lines.length - 1 ? "Next" : "Done", primary: true, action: { type: "next" } },
      { label: "Close", action: { type: "close" } }
    ]);
    this.place(at, H);
  }

  place(at, height) {
    this.anchor.set(at.x, at.y, at.z);
    this.group.position.copy(this.anchor);
    this.group.visible = true;
    if (!this.open) this.t = 0;
    this.open = true;
    this.height = height;
  }

  close() {
    this.open = false;
  }

  update(dt, camera) {
    if (camera) this.group.quaternion.copy(camera.quaternion);
    const target = this.open ? 1 : 0;
    this.t += (target - this.t) * Math.min(1, dt * 13);
    if (this.t < 0.01 && !this.open) {
      this.group.visible = false;
      return;
    }
    this.group.visible = true;
    const s = 0.86 + this.t * 0.14;
    this.group.scale.setScalar(s);
    const op = Math.max(0, Math.min(1, this.t * 1.25));
    if (this.panel) this.panel.material.opacity = op;
    for (const b of this.buttons) b.mesh.material.opacity = op;
    this.group.position.set(this.anchor.x, this.anchor.y + (1 - this.t) * 0.7, this.anchor.z);
  }

  hitTargets() {
    return this.open && this.t > 0.4 ? this.buttons.map((b) => b.mesh) : [];
  }
}
