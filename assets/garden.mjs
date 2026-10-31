/* Gzowo Labs garden: a fenced bed on the plot where every visitor can plant something, once a minute. Plants are drawn pixel by pixel and
   grow with real time, from a sprout to full bloom over a couple of days, so the garden slowly fills up with everyone who came by. */

const DB = "https://raft-e8d47-default-rtdb.firebaseio.com";
const LOCAL = ["localhost", "127.0.0.1", "0.0.0.0", "[::1]"];
const PLOT = LOCAL.includes(location.hostname) || location.protocol === "file:" ? "plotDev" : "plot";
const PUSH = "-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz";
const WAIT = 60000, TOP = 26;
const KINDS = [["tulip", "Tulip"], ["sunflower", "Sunflower"], ["daisy", "Daisy"], ["lavender", "Lavender"], ["bush", "Berry bush"], ["tree", "Little tree"], ["mushroom", "Mushroom"], ["pumpkin", "Pumpkin"]];
const TULIP = ["#ff7eb6", "#ffd84a", "#c9a2ff", "#ffffff", "#ff9a3c", "#ffb8d9"];
const G = "#3f9a3a", GL = "#6cc84f", GD = "#2c7a2e";

function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

function pushId() {
  let now = Date.now(), id = "";
  for (let i = 0; i < 8; i++) { id = PUSH.charAt(now % 64) + id; now = Math.floor(now / 64); }
  for (let i = 0; i < 12; i++) id += PUSH.charAt(Math.floor(Math.random() * 64));
  return id;
}

function stageOf(t) {
  const age = Date.now() - t;
  return age < 120000 ? 0 : age < 3600000 ? 1 : age < 86400000 ? 2 : age < 3 * 86400000 ? 3 : 4;
}

function plant(put, kind, st, seed) {
  const h = (n) => ((seed >>> n) & 255) / 255;
  const stem = (n, col = G) => { for (let i = 0; i < n; i++) put(0, -i, col); };
  const blob = (cx, cy, r, col, dark) => {
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
      const d = Math.hypot(x, y * 1.15);
      if (d <= r + 0.3) put(cx + x, cy + y, d > r - 0.8 && y > 0 ? dark : col);
    }
  };
  if (st === 0) { put(0, 0, G); put(0, -1, G); put(-1, -2, GL); put(1, -2, GL); return; }
  if (kind === "tulip") {
    const n = [0, 3, 5, 6, 6][st], col = TULIP[Math.floor(h(3) * TULIP.length)];
    stem(n); put(-1, -1, GL); put(1, -2, GL);
    if (st === 1) { put(0, -n, col); return; }
    for (let x = -1; x <= 1; x++) { put(x, -n, col); put(x, -n - 1, col); }
    put(-1, -n - 2, col); put(1, -n - 2, col);
  } else if (kind === "sunflower") {
    const n = [0, 4, 8, 11, 12][st];
    stem(n); put(-1, -3, GL); put(1, -5, GL); put(-2, -3, GL); put(2, -5, GL);
    if (st === 1) { put(0, -n, GL); return; }
    const r = st >= 3 ? 3 : 2;
    blob(0, -n - r, r, "#ffd84a", "#f2b42a");
    blob(0, -n - r, r - 1.5, "#6b3d1e", "#5a321a");
  } else if (kind === "daisy") {
    const n = [0, 2, 3, 4, 4][st];
    stem(n); put(1, -1, GL);
    if (st === 1) return;
    const y = -n - 1;
    [[0, -1], [0, 1], [-1, 0], [1, 0]].forEach(([x, dy]) => put(x, y + dy, "#ffffff"));
    if (st >= 3) [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([x, dy]) => put(x, y + dy, "#f2f2f2"));
    put(0, y, "#ffd23a");
  } else if (kind === "lavender") {
    const n = [0, 3, 5, 7, 8][st];
    [-1, 0, 1].forEach((x, i) => {
      const m = n - (i === 1 ? 0 : 1);
      for (let j = 0; j < m; j++) put(x, -j, j > m * 0.45 && st >= 2 ? (j % 2 ? "#9b6be0" : "#b58cf0") : G);
    });
  } else if (kind === "bush") {
    const r = [0, 2, 3, 4, 4.5][st];
    blob(0, -r, r, G, GD);
    if (st >= 2) for (let i = 0; i < 2 + st; i++) put(Math.round((h(i * 3) - 0.5) * r * 1.6), Math.round(-r + (h(i * 3 + 1) - 0.5) * r * 1.4), i % 2 ? "#5a6ee8" : "#7b4fd6");
  } else if (kind === "tree") {
    const n = [0, 3, 5, 7, 9][st], r = [0, 2, 3.5, 5, 6.5][st];
    stem(n, "#6b4a2e");
    blob(0, -n - r + 1, r, "#3f8f3a", "#2f6f2c");
    put(-1, -n - r, "#69c04c");
  } else if (kind === "mushroom") {
    const w = [0, 1, 2, 3, 3][st];
    put(0, 0, "#f3e6d0"); if (st >= 2) put(0, -1, "#f3e6d0");
    const y = st >= 2 ? -2 : -1;
    for (let x = -w; x <= w; x++) put(x, y, "#c8742c");
    for (let x = -w + 1; x < w; x++) put(x, y - 1, "#d98a3a");
    if (st >= 2) { put(-1, y, "#fff4e0"); put(1, y - 1, "#fff4e0"); }
  } else if (kind === "pumpkin") {
    put(-2, 0, GL); put(2, 0, GL); put(-3, -1, G); put(3, -1, G);
    if (st === 1) return;
    const w = st >= 3 ? 3 : 2, hgt = st >= 3 ? 3 : 2;
    for (let y = 0; y < hgt; y++) for (let x = -w; x <= w; x++) if (!(y === 0 || y === hgt - 1) || Math.abs(x) < w) put(x, -y, x % 2 ? "#f08c1e" : "#ffa53a");
    put(0, -hgt, "#4d7a2a");
  }
}

function soil(cv, W, H) {
  cv.width = W; cv.height = H;
  const c = cv.getContext("2d");
  const px = (x, y, col, w = 1, h = 1) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
  px(0, 0, "#6b4a2e", W, H);
  for (let y = 3; y < H - 2; y += 3) for (let x = 2; x < W - 2; x++) if ((x * 7 + y * 3) % 11) px(x, y, "#5a3d25");
  for (let i = 0; i < (W * H) / 30; i++) px(2 + ((i * 37) % (W - 4)), 2 + ((i * 53) % (H - 4)), "#7d5a3a");
  px(0, 0, "#8a5a36", W, 1); px(0, H - 1, "#8a5a36", W, 1); px(0, 0, "#8a5a36", 1, H); px(W - 1, 0, "#8a5a36", 1, H);
  for (let x = 0; x < W; x += 7) { px(x, 0, "#5b3a20", 2, 2); px(x, H - 2, "#5b3a20", 2, 2); }
  for (let y = 0; y < H; y += 7) { px(0, y, "#5b3a20", 2, 2); px(W - 2, y, "#5b3a20", 2, 2); }
}

export function createGarden(world) {
  const spots = world.querySelector(".spots");
  const bed = document.createElement("button"), back = document.createElement("canvas"), front = document.createElement("canvas");
  bed.type = "button";
  bed.className = "spot spot-garden";
  bed.setAttribute("aria-label", "Garden, plant something");
  back.className = front.className = "spr";
  bed.append(back, front);
  bed.insertAdjacentHTML("beforeend", `<span class="spot-l"><b>Garden</b><em>plant something</em></span>`);
  spots.append(bed);
  const label = bed.querySelector(".spot-l em");
  const plants = new Map();
  let g = null, p = 2, W = 1, H = 1, last = "", pick = null, at = null, flashT = 0;

  function render() {
    if (!g) return;
    const c = front.getContext("2d");
    c.clearRect(0, 0, W, H + TOP);
    const list = [...plants.values()].sort((a, b) => a.v - b.v);
    for (const it of list) {
      const x0 = Math.round(3 + (it.u / 1000) * (W - 6)), y0 = TOP + Math.round(4 + (it.v / 1000) * (H - 7));
      plant((dx, dy, col) => { const x = x0 + dx, y = y0 + dy; if (x >= 0 && y >= 0 && x < W && y < H + TOP) { c.fillStyle = col; c.fillRect(x, y, 1, 1); } }, it.k, stageOf(it.t), hash(it.id));
    }
    const n = plants.size;
    label.textContent = n ? `${n} ${n === 1 ? "plant" : "plants"}, plant something` : "plant something";
  }

  const ok = (v) => v && typeof v.k === "string" && KINDS.some(([k]) => k === v.k) && Number.isFinite(v.u) && Number.isFinite(v.v) && Number.isFinite(v.t);
  function take(data) {
    let added = false;
    Object.keys(data || {}).sort().forEach((id) => {
      const v = data[id];
      if (id > last) last = id;
      if (plants.has(id) || !ok(v)) return;
      plants.set(id, { id, k: v.k, u: v.u, v: v.v, t: v.t });
      added = true;
    });
    if (added) render();
  }

  function poll() {
    if (document.hidden) return;
    const q = last ? `orderBy="$key"&startAt=${encodeURIComponent(JSON.stringify(last))}` : 'orderBy="$key"&limitToLast=600';
    fetch(`${DB}/${PLOT}/garden.json?${q}`).then((r) => r.json()).then(take).catch(() => {});
  }
  poll();
  setInterval(poll, 30000);
  setInterval(render, 120000);
  addEventListener("visibilitychange", () => { if (!document.hidden) poll(); });

  function flash(msg) {
    label.textContent = msg;
    clearTimeout(flashT);
    flashT = setTimeout(render, 2600);
  }

  function close() { if (pick) { pick.remove(); pick = null; } }

  function open(u, v, x, y) {
    close();
    pick = document.createElement("div");
    pick.className = "gd-pick";
    pick.setAttribute("role", "menu");
    pick.innerHTML = `<p class="gd-t">Plant a...</p>` + KINDS.map(([k, name]) => `<button type="button" role="menuitem" data-kind="${k}"><canvas width="18" height="18"></canvas><span>${name}</span></button>`).join("");
    pick.querySelectorAll("canvas").forEach((cv, i) => {
      const c = cv.getContext("2d");
      plant((dx, dy, col) => { c.fillStyle = col; c.fillRect(9 + dx, 16 + dy, 1, 1); }, KINDS[i][0], 3, hash(KINDS[i][0]));
    });
    document.body.append(pick);
    const r = pick.getBoundingClientRect();
    pick.style.left = Math.max(4, Math.min(innerWidth - r.width - 4, x - r.width / 2)) + "px";
    pick.style.top = Math.max(4, Math.min(innerHeight - r.height - 40, y - r.height - 12)) + "px";
    at = [u, v];
    pick.addEventListener("click", (e) => {
      const b = e.target.closest("[data-kind]");
      if (b) { sow(b.dataset.kind); close(); }
    });
  }

  function sow(k) {
    const id = pushId(), [u, v] = at;
    plants.set(id, { id, k, u, v, t: Date.now() });
    if (id > last) last = id;
    try { localStorage.setItem("gl-plant", String(Date.now())); } catch (e) {}
    render();
    dispatchEvent(new CustomEvent("gz:plant", { detail: k }));
    fetch(`${DB}/${PLOT}/garden/${id}.json`, { method: "PUT", body: JSON.stringify({ k, u, v, t: { ".sv": "timestamp" } }) })
      .then((r) => { if (!r.ok) throw r.status; })
      .catch(() => { plants.delete(id); render(); flash("the garden is offline, try later"); });
  }

  bed.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    let lastAt = 0;
    try { lastAt = +localStorage.getItem("gl-plant") || 0; } catch (err) {}
    const left = Math.ceil((WAIT - (Date.now() - lastAt)) / 1000);
    if (left > 0) { flash(`seeds need ${left} s more`); return; }
    const r = bed.getBoundingClientRect();
    const u = Math.round(Math.max(20, Math.min(980, ((e.clientX - r.left) / r.width) * 1000)));
    const v = Math.round(Math.max(40, Math.min(990, ((e.clientY - r.top) / r.height) * 1000)));
    open(u, v, e.clientX, e.clientY);
  });
  document.addEventListener("click", (e) => { if (pick && !e.target.closest(".gd-pick, .spot-garden")) close(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });

  return {
    layout(geo) {
      g = geo;
      const b = geo.garden;
      p = Math.max(2, geo.k);
      W = Math.max(8, Math.round(b.w / p)); H = Math.max(8, Math.round(b.h / p));
      Object.assign(bed.style, { left: b.x + "px", top: b.y + "px", width: W * p + "px", height: H * p + "px", zIndex: Math.round(b.y + b.h) });
      soil(back, W, H);
      front.width = W; front.height = H + TOP;
      Object.assign(front.style, { top: -TOP * p + "px", height: (H + TOP) * p + "px" });
      close();
      render();
    },
  };
}
