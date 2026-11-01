/* Gzowo Labs hangar: the GSP hangar on the right half of the plot. Click it and the corrugated doors slide open on the whole fleet,
   every rocket drawn pixel by pixel in its real colors; click one to open its window. The doors roll shut again after a while. */

import { HANGAR_DOOR } from "/assets/map.mjs";

const CW = 83, CH = 58, FLOOR = 52;
const LOOK = {
  "gzofajfus-mini-mk1": { h: 24, w: 4, nose: "#2f6fde", body: [[0, "#2f6fde"]], fin: "#1d4fae" },
  "gzofajfus-classic-mk2": { h: 40, w: 4, nose: "#151515", body: [[0, "#a3a3a3"], [0.42, "#ffd23f"]], fin: "#f0b81e" },
  "gzofajfus-classic-mk3": { h: 43, w: 4, nose: "#2e9e44", body: [[0, "#2e9e44"], [0.68, "#8f8f8f"]], fin: "#7a7a7a" },
  "the-orange-beauty": { h: 36, w: 5, nose: "#151515", body: [[0, "#1d1d1d"], [0.4, "#ff6a1a"]], fin: "#e0551a" },
  "tbh-mk1": { h: 38, w: 4, nose: "#151515", body: [[0, "#1d1d1d"]], fin: "#101010" },
};
const SPARE = ["#4cc3ff", "#8bd346", "#ff7eb6", "#ffd23f", "#7d4cdb"];
const FALLBACK = Object.keys(LOOK).map((id) => ({ id, name: id.replace(/-/g, " "), state: "flown" }));

const rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const hex = (a) => "#" + a.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
const tint = (h, f) => hex(rgb(h).map((v) => v + (255 - v) * f));
const shade = (h, f) => hex(rgb(h).map((v) => v * f));

function rocket(put, cx, look, planned) {
  const { h, w, nose, body, fin } = look, top = FLOOR - 1 - h, x0 = cx - Math.floor(w / 2), x1 = x0 + w - 1;
  const at = (y) => { let col = body[0][1]; body.forEach(([f, c]) => { if ((y - top) / h >= f) col = c; }); return col; };
  for (let y = top; y < FLOOR - 1; y++) {
    const i = y - top;
    let a = x0, b = x1;
    if (i === 0) { a = w % 2 ? cx : cx - 1; b = cx; }
    else if (i === 1) { a = cx - 1; b = w % 2 ? cx + 1 : cx; }
    const col = i < 4 ? nose : at(y);
    for (let x = a; x <= b; x++) put(x, y, col);
    if (i >= 4) { put(a, y, tint(col, 0.3)); put(b, y, shade(col, 0.7)); }
  }
  for (let j = 0; j < 5; j++) {
    const y = FLOOR - 2 - j, reach = j < 2 ? 2 : 1;
    for (let r = 1; r <= reach; r++) { put(x0 - r, y, fin); put(x1 + r, y, shade(fin, 0.8)); }
  }
  put(cx, FLOOR - 1, "#2a2a2a");
  if (w > 4) put(cx - 1, FLOOR - 1, "#2a2a2a");
  if (planned) {
    for (let y = FLOOR - h - 2; y < FLOOR; y++) { put(x1 + 4, y, "#c9a24a"); put(x1 + 7, y, "#c9a24a"); }
    for (let y = FLOOR - h; y < FLOOR; y += 6) for (let x = x1 + 4; x <= x1 + 7; x++) put(x, y, "#e2bd5e");
  }
}

function outline(px) {
  const out = px.slice();
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
    if (px[y * CW + x]) continue;
    const n = (xx, yy) => xx >= 0 && yy >= 0 && xx < CW && yy < CH && px[yy * CW + xx];
    if (n(x - 1, y) || n(x + 1, y) || n(x, y - 1) || n(x, y + 1)) out[y * CW + x] = "#141414";
  }
  return out;
}

export function createHangar(world) {
  const spots = world.querySelector(".spots");
  const spot = document.createElement("div");
  spot.className = "spot spot-hangar";
  spot.dataset.place = "hangar";
  const D = HANGAR_DOOR;
  spot.innerHTML = `<img class="spr" src="/assets/map/hangar.webp" alt="" draggable="false"><canvas class="spr hg-in" width="${CW}" height="${CH}" style="left:${D.x * 100}%;top:${D.y * 100}%;width:${D.w * 100}%;height:${D.h * 100}%"></canvas>
<button class="hg-hit" type="button" aria-expanded="false" aria-label="GSP hangar, open the doors"></button><span class="hg-rk"></span><span class="spot-l"><b>Hangar</b><em>GSP fleet</em></span>`;
  spots.append(spot);
  const cv = spot.querySelector(".hg-in"), cx = cv.getContext("2d"), hit = spot.querySelector(".hg-hit"), rk = spot.querySelector(".hg-rk"), sub = spot.querySelector(".spot-l em");
  let fleet = FALLBACK, open = 0, want = 0, raf = 0, t0 = 0, from = 0, shutT = 0, scene = null;

  function slots() {
    const n = fleet.length, gap = CW / (n + 0.4);
    return fleet.map((r, i) => ({ r, cx: Math.round(gap * (i + 0.7)), look: LOOK[r.id] || { h: 30 + (i % 3) * 5, w: 4, nose: "#151515", body: [[0, SPARE[i % SPARE.length]]], fin: shade(SPARE[i % SPARE.length], 0.75) } }));
  }

  function build() {
    const px = new Array(CW * CH).fill(null), put = (x, y, c) => { if (x >= 0 && y >= 0 && x < CW && y < CH) px[y * CW + x] = c; };
    slots().forEach((s) => rocket(put, s.cx, s.look, s.r.state === "planned"));
    const ol = outline(px);
    const c = document.createElement("canvas");
    c.width = CW; c.height = CH;
    const g = c.getContext("2d");
    for (let y = 0; y < CH; y++) {
      const v = y / CH;
      g.fillStyle = y >= FLOOR ? (y % 2 ? "#8c929b" : "#959ba4") : hex([82 + v * 26, 94 + v * 24, 116 + v * 18]);
      g.fillRect(0, y, CW, 1);
    }
    for (let x = 3; x < CW; x += 8) { g.fillStyle = "rgba(0,0,0,.12)"; g.fillRect(x, 0, 1, FLOOR); }
    [16, 41, 66].forEach((x) => { g.fillStyle = "#fff6c8"; g.fillRect(x - 2, 1, 5, 1); g.fillStyle = "rgba(255,246,200,.16)"; g.fillRect(x - 6, 2, 13, FLOOR - 2); });
    g.fillStyle = "rgba(0,0,0,.18)"; g.fillRect(0, FLOOR, CW, 1);
    slots().forEach((s) => { g.fillStyle = "rgba(0,0,0,.22)"; g.fillRect(s.cx - 4, FLOOR, 9, 1); });
    ol.forEach((col, i) => { if (col) { g.fillStyle = col; g.fillRect(i % CW, (i / CW) | 0, 1, 1); } });
    scene = c;
  }

  function doors(f) {
    const half = Math.ceil(CW / 2), off = Math.round(f * (half + 1));
    const door = (x0, x1) => {
      for (let x = x0; x <= x1; x++) {
        if (x < 0 || x >= CW) continue;
        cx.fillStyle = (x - x0) % 3 === 0 ? "#7f8b99" : (x - x0) % 3 === 1 ? "#b3bdc9" : "#9ea9b6";
        cx.fillRect(x, 0, 1, CH);
      }
      cx.fillStyle = "#6c7785";
      for (let y = 9; y < CH; y += 12) cx.fillRect(Math.max(0, x0), y, Math.min(CW, x1 + 1) - Math.max(0, x0), 1);
    };
    door(-off, half - 1 - off);
    door(half + off, CW - 1 + off);
    if (off < 2) { cx.fillStyle = "#4f5966"; cx.fillRect(half - 1, 0, 1, CH); cx.fillStyle = "#3a3a3a"; cx.fillRect(half - 4, 30, 2, 5); cx.fillRect(half + 2, 30, 2, 5); }
    cx.fillStyle = "rgba(0,0,0,.25)";
    cx.fillRect(0, 0, CW, 2);
  }

  function draw() {
    if (!scene) build();
    cx.clearRect(0, 0, CW, CH);
    if (open > 0) cx.drawImage(scene, 0, 0);
    if (open < 1) doors(open);
  }

  function tick(t) {
    raf = 0;
    const u = Math.min(1, (t - t0) / 900), e = u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2;
    open = from + (want - from) * e;
    draw();
    if (u < 1) raf = requestAnimationFrame(tick);
    else spot.classList.toggle("is-open", want === 1);
  }

  function set(v) {
    if (want === v) return;
    want = v; from = open; t0 = performance.now();
    hit.setAttribute("aria-expanded", String(v === 1));
    hit.setAttribute("aria-label", v ? "GSP hangar, close the doors" : "GSP hangar, open the doors");
    if (!v) spot.classList.remove("is-open");
    if (!raf) raf = requestAnimationFrame(tick);
    clearTimeout(shutT);
    if (v) { shutT = setTimeout(() => set(0), 40000); dispatchEvent(new CustomEvent("gz:hangar")); }
  }

  function buttons() {
    rk.innerHTML = slots().map((s) => {
      const top = FLOOR - 2 - s.look.h, l = D.x + ((s.cx - 5) / CW) * D.w, w = (11 / CW) * D.w;
      return `<button class="hg-r" type="button" data-rocket="${s.r.id}" style="left:${l * 100}%;top:${(D.y + (top / CH) * D.h) * 100}%;width:${w * 100}%;height:${((s.look.h + 3) / CH) * D.h * 100}%" aria-label="${s.r.name.replace(/"/g, "")}" tabindex="-1"><span class="hg-tip">${s.r.name.replace(/[<>&"]/g, "")}</span></button>`;
    }).join("");
    sub.textContent = `GSP fleet, ${fleet.length} rockets`;
  }

  hit.addEventListener("click", (e) => { e.preventDefault(); set(want ? 0 : 1); });
  spot.addEventListener("pointerover", () => { if (want) { clearTimeout(shutT); shutT = setTimeout(() => set(0), 40000); } });
  const obs = new MutationObserver(() => rk.querySelectorAll(".hg-r").forEach((b) => { b.tabIndex = spot.classList.contains("is-open") ? 0 : -1; }));
  obs.observe(spot, { attributes: true, attributeFilter: ["class"] });

  const src = document.getElementById("desk").dataset.src;
  fetch(src).then((r) => r.json()).then((d) => {
    if (d && d.rockets && Array.isArray(d.rockets.fleet) && d.rockets.fleet.length) { fleet = d.rockets.fleet.map((r) => ({ id: r.id, name: r.name, state: r.state })); scene = null; buttons(); draw(); }
  }).catch(() => {});
  buttons();
  draw();

  return {
    layout() { draw(); },
  };
}
