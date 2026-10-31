/* Gzowo Labs desktop: the map of the plot, Windows 98 windows over it, the taskbar with Start, tray and clock, and the camera that flies to the wall. */

import * as V from "/assets/views.mjs";
import { geometry, drawMap, drawWall, loadSprites } from "/assets/map.mjs";
import { createMural } from "/assets/mural.mjs";
import { createLife } from "/assets/life.mjs";
import { createWeather } from "/assets/weather.mjs";
import { createLaunch } from "/assets/rocket.mjs";
import { createGarden } from "/assets/garden.mjs";
import { createFishing } from "/assets/fishing.mjs";
import { playBoot } from "/assets/boot.mjs";

const DB = "https://raft-e8d47-default-rtdb.firebaseio.com";
const LOCAL = ["localhost", "127.0.0.1", "0.0.0.0", "[::1]"];
const root = document.documentElement;
const desk = document.getElementById("desk");
const world = document.getElementById("world");
const wins = document.getElementById("wins");
const mapCanvas = world.querySelector("canvas.map");
const muralEl = world.querySelector("[data-mural]");
const startBtn = desk.querySelector("[data-start]");
const startMenu = document.getElementById("start-menu");
const tasks = desk.querySelector("[data-tasks]");
const clock = desk.querySelector("[data-clock]");
const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
const HOME_TITLE = desk.dataset.title || document.title;

let ctx = null, ctxP = null, geo = null, mode = "", z = 20, cascade = 0, painting = false, resizeT = 0, mapReady = null;

function data() {
  if (ctx) return Promise.resolve(ctx);
  return ctxP || (ctxP = fetch(desk.dataset.src).then((r) => r.json()).then((d) => (ctx = d)));
}

const winById = (id) => document.querySelector(`.win[data-win="${CSS.escape(id)}"]`);
const tbH = () => desk.querySelector(".taskbar").offsetHeight;
const areaH = () => innerHeight - tbH();
const clampX = (x, w) => Math.round(Math.max(60 - w, Math.min(innerWidth - 60, x)));
const clampY = (y) => Math.round(Math.max(0, Math.min(areaH() - 26, y)));

function isTall() { return innerWidth < 760 || (innerWidth < innerHeight && innerWidth < 1000); }

function placeBox(el, r) {
  el.style.left = r.x + "px"; el.style.top = r.y + "px";
  el.style.width = r.w + "px"; el.style.height = r.h + "px";
}

function placeWelcome() {
  const w = winById("welcome");
  if (!w) return;
  if (mode === "tall") { w.classList.add("in-world"); world.appendChild(w); }
  else { w.classList.remove("in-world"); wins.appendChild(w); delete w.dataset.placed; if (!w.hidden) position(w); }
}

function layout() {
  const m = isTall() ? "tall" : "land";
  if (m !== mode) {
    mode = m;
    root.classList.toggle("tall", m === "tall");
    desk.classList.toggle("is-tall", m === "tall");
    desk.classList.toggle("is-land", m === "land");
    placeWelcome();
    lockForWindows();
    renderTasks();
  }
  const W = world.clientWidth;
  geo = geometry(mode, W, mode === "tall" ? 0 : world.clientHeight);
  world.style.height = mode === "tall" ? geo.H + "px" : "";
  world.style.setProperty("--s", geo.s.toFixed(3));
  world.querySelectorAll(".spot").forEach((s) => {
    const b = s.dataset.place === "mural" ? geo.run : geo.places[s.dataset.place];
    if (!b) return;
    placeBox(s, b);
    s.style.zIndex = Math.round(b.y + b.h);
    s.style.setProperty("--s", b.k.toFixed(3));
  });
  life.layout(geo);
  weather.layout(geo);
  launch.layout(geo);
  garden.layout(geo);
  fishing.layout(geo);
  const art = world.querySelector("[data-wall-art]");
  art.parentNode.style.setProperty("--lx", (geo.mural.w / 2).toFixed(1) + "px");
  drawWall(art, Math.ceil(geo.run.w / geo.run.k));
  placeBox(muralEl, { x: geo.face.x, y: geo.face.y, w: geo.run.x + geo.run.w - geo.face.x, h: geo.face.h });
  muralEl.style.setProperty("--fw", geo.face.w.toFixed(2) + "px");
  muralEl.style.zIndex = Math.round(geo.mural.y + geo.mural.h) + 1;
  mural.resize();
  const g = geo;
  mapReady = loadSprites().then((img) => (g === geo ? drawMap(mapCanvas, g, img, () => g === geo) : null));
  if (mode === "land") wins.querySelectorAll(".win:not([hidden])").forEach(keepInside);
  window.gzMap = { geo, world };
  window.dispatchEvent(new CustomEvent("gz:map", { detail: { geo, world } }));
}

function position(el) {
  if (mode !== "land" || el.classList.contains("in-world")) return;
  if (el.dataset.placed) { keepInside(el); return; }
  el.dataset.placed = "1";
  const r = el.getBoundingClientRect();
  let x, y;
  if (el.dataset.win === "welcome") { x = 16; y = 14; }
  else if (el.dataset.win === "news") { x = innerWidth - r.width - 14; y = 14; }
  else {
    const off = (cascade++ % 6) - 2;
    x = (innerWidth - r.width) / 2 + off * 26;
    y = Math.max(12, (areaH() - r.height) / 2 - 30) + off * 22;
  }
  el.style.left = clampX(x, r.width) + "px";
  el.style.top = clampY(y) + "px";
}

function keepInside(el) {
  if (el.classList.contains("in-world") || !el.dataset.placed) return;
  const r = el.getBoundingClientRect();
  el.style.left = clampX(r.left, r.width) + "px";
  el.style.top = clampY(r.top) + "px";
}

function focus(el) {
  wins.querySelectorAll(".win.on").forEach((w) => { if (w !== el) w.classList.remove("on"); });
  el.classList.add("on");
  if (!el.classList.contains("in-world")) el.style.zIndex = ++z;
  renderTasks();
}

const drawn = (w) => w.getClientRects().length > 0;

function lockForWindows() {
  const open = mode === "tall" && [...wins.querySelectorAll(".win:not([hidden])")].some((w) => !w.classList.contains("is-min") && drawn(w));
  root.classList.toggle("wlock", open);
}

function show(el) {
  el.hidden = false;
  el.classList.remove("is-min");
  position(el);
  focus(el);
  lockForWindows();
  if (mode === "tall" && el.classList.contains("in-world")) scrollTo({ top: 0, behavior: calm ? "auto" : "smooth" });
  window.dispatchEvent(new CustomEvent("gz:open", { detail: el.dataset.win }));
}

function topRouteWin() {
  let best = null;
  wins.querySelectorAll(".win[data-route]:not([hidden])").forEach((w) => {
    if (w.dataset.route === "/" || w.classList.contains("is-min")) return;
    if (!best || (+w.style.zIndex || 0) > (+best.style.zIndex || 0)) best = w;
  });
  return best;
}

function setTitle(el) { document.title = el && el.dataset.route && el.dataset.route !== "/" ? el.getAttribute("aria-label") + " | Gzowo Labs" : HOME_TITLE; }

function close(el) {
  const route = el.dataset.route;
  el.querySelectorAll("video").forEach((v) => v.pause());
  if (el.dataset.dynamic) el.remove(); else el.hidden = true;
  el.classList.remove("on");
  if (route && route !== "/" && location.pathname === route) {
    const next = topRouteWin();
    history.pushState({}, "", next ? next.dataset.route : "/");
    setTitle(next);
  }
  renderTasks();
  lockForWindows();
}

function create(spec, dynamic = true) {
  const t = document.createElement("template");
  t.innerHTML = V.win(spec).trim();
  const el = t.content.firstElementChild;
  if (dynamic) el.dataset.dynamic = "1";
  wins.appendChild(el);
  return el;
}

function idFor(path) {
  const m = path.match(/^\/p\/([a-z0-9-]+)\/$/);
  if (m) return "p-" + m[1];
  const s = path.match(/^\/(rockets|printing|games|software)\/$/);
  return s ? "sec-" + s[1] : "welcome";
}

async function go(path, push = true) {
  closeStart();
  if (painting) exitWall();
  let el = winById(idFor(path));
  if (!el) {
    const d = await data();
    const spec = V.routeWindow(d, path);
    if (!spec) { location.href = path; return; }
    el = create(spec, path !== "/");
    if (path === "/") placeWelcome();
  }
  show(el);
  if (push && location.pathname !== path) history.pushState({}, "", path);
  setTitle(path === "/" ? null : el);
}

addEventListener("popstate", () => {
  const path = location.pathname;
  wins.querySelectorAll(".win[data-route]").forEach((w) => {
    if (w.dataset.route !== "/" && w.dataset.route !== path && !w.hidden) { if (w.dataset.dynamic) w.remove(); else w.hidden = true; }
  });
  renderTasks();
  lockForWindows();
  go(path, false);
});

function renderTasks() {
  const list = [...wins.querySelectorAll(".win:not([hidden])")].filter((w) => w.classList.contains("is-min") || drawn(w));
  tasks.innerHTML = list.map((w) =>
    `<button class="task${w.classList.contains("on") && !w.classList.contains("is-min") ? " on" : ""}" type="button" data-task="${V.esc(w.dataset.win)}">${w.querySelector(".tb-i").innerHTML}<span>${V.esc(w.getAttribute("aria-label"))}</span></button>`).join("");
}

function toggleStart(force) {
  const open = force === undefined ? startMenu.hidden : force;
  startMenu.hidden = !open;
  startBtn.setAttribute("aria-expanded", String(open));
  startBtn.classList.toggle("on", open);
  const m = startMenu.querySelector("[data-mascot] span");
  if (m) { let off = false; try { off = localStorage.getItem("gzowoAvatarOff") === "1"; } catch (e) {} m.textContent = "Walking Jurek: " + (off ? "off" : "on"); }
}
const closeStart = () => { if (!startMenu.hidden) toggleStart(false); };

async function openExtra(id) {
  closeStart();
  if (painting) exitWall();
  let el = winById(id);
  if (!el && id === "newest") {
    const d = await data();
    el = create({ id, title: "What is new", icon: "folder", cls: "w-newest", body: V.newestBody(d), status: `<span>${d.projects.length} projects in total</span>` });
  }
  if (!el && id === "shutdown") {
    el = create({ id, title: "Shut Down Gzowo Labs", icon: "computer", cls: "w-dialog", body:
      `<form class="dlg" data-shutdown><p>What do you want the computer to do?</p><label><input type="radio" name="d" value="off" checked> Shut down</label><label><input type="radio" name="d" value="restart"> Restart</label><label><input type="radio" name="d" value="map"> Close every window and show the map</label><p class="dlg-b"><button class="btn" type="submit">OK</button><button class="btn" type="button" data-close>Cancel</button></p></form>` });
  }
  if (el) show(el);
}

async function openRocket(id) {
  const d = await data();
  const r = d.rockets.fleet.find((x) => x.id === id);
  if (!r) return;
  show(winById("rocket-" + id) || create({ id: "rocket-" + id, title: r.name, icon: "rocket", cls: "w-rocket", body: V.rocketBody(d, id),
    status: `<span>${V.esc(V.STATUS[r.state] || r.state)}</span><span>${V.esc(r.line)}</span>` }));
}

function shutDown(choice) {
  if (choice === "restart") { location.href = "/"; return; }
  if (choice === "map") {
    wins.querySelectorAll(".win:not([hidden])").forEach((w) => close(w));
    history.pushState({}, "", "/");
    setTitle(null);
    return;
  }
  const s = document.createElement("div");
  s.className = "safe";
  s.innerHTML = "<p>It's now safe to turn off<br>your computer.</p><small>Click anywhere to turn it back on.</small>";
  s.addEventListener("click", () => s.remove());
  document.body.appendChild(s);
}

document.addEventListener("submit", (e) => {
  const f = e.target.closest("[data-shutdown]");
  if (!f) return;
  e.preventDefault();
  const choice = new FormData(f).get("d");
  close(f.closest(".win"));
  shutDown(choice);
});

document.addEventListener("click", (e) => {
  const t = e.target;
  if (!startMenu.hidden && !t.closest("#start-menu") && !t.closest("[data-start]")) closeStart();
  const a = t.closest("a[data-nav]");
  if (a && a.origin === location.origin && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey && e.button === 0) {
    e.preventDefault();
    if (a.dataset.ring) { const ring = JSON.parse(a.dataset.ring); go("/p/" + ring[Math.floor(Math.random() * ring.length)] + "/"); return; }
    go(a.pathname);
    return;
  }
  const o = t.closest("[data-open]");
  if (o) { e.preventDefault(); openExtra(o.dataset.open); return; }
  if (t.closest("[data-wall]")) { e.preventDefault(); enterWall(); return; }
  if (t.closest("[data-start]")) { toggleStart(); return; }
  const rk = t.closest("[data-rocket]");
  if (rk) { openRocket(rk.dataset.rocket); return; }
  const w = t.closest(".win");
  if (w && t.closest("[data-close]")) { close(w); return; }
  if (w && t.closest("[data-min]")) { w.classList.add("is-min"); w.classList.remove("on"); renderTasks(); lockForWindows(); return; }
  if (w && t.closest("[data-max]")) { w.classList.toggle("is-max"); return; }
  const task = t.closest("[data-task]");
  if (task) {
    const tw = winById(task.dataset.task);
    if (!tw) return;
    if (tw.classList.contains("on") && !tw.classList.contains("is-min")) { tw.classList.add("is-min"); tw.classList.remove("on"); renderTasks(); lockForWindows(); }
    else show(tw);
    return;
  }
  if (t.closest("[data-midi]")) { toggleMidi(); return; }
  if (t.closest("[data-mascot]")) {
    e.preventDefault();
    let off = false;
    try { off = localStorage.getItem("gzowoAvatarOff") === "1"; localStorage.setItem("gzowoAvatarOff", off ? "0" : "1"); } catch (err) {}
    window.dispatchEvent(new CustomEvent("gz:mascot", { detail: off }));
    closeStart();
  }
});

wins.addEventListener("pointerdown", (e) => {
  const w = e.target.closest(".win");
  if (!w) return;
  focus(w);
  if (mode !== "land" || w.classList.contains("is-max")) return;
  const tb = e.target.closest(".tb");
  if (!tb || tb.parentNode !== w || e.target.closest("button")) return;
  e.preventDefault();
  const r = w.getBoundingClientRect(), ox = e.clientX - r.left, oy = e.clientY - r.top;
  const mv = (ev) => { w.style.left = clampX(ev.clientX - ox, r.width) + "px"; w.style.top = clampY(ev.clientY - oy) + "px"; };
  const done = () => { removeEventListener("pointermove", mv); removeEventListener("pointerup", done); };
  addEventListener("pointermove", mv);
  addEventListener("pointerup", done);
});

document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape" || painting) return;
  if (!startMenu.hidden) { closeStart(); return; }
  const top = [...wins.querySelectorAll(".win.on:not([hidden])")][0];
  if (top && !e.target.closest("input, textarea")) close(top);
});

const mural = createMural(muralEl, { onExit: () => exitWall() });
const life = createLife(world);
const weather = createWeather({ world, mapCanvas });
const launch = createLaunch(world), garden = createGarden(world), fishing = createFishing(world);

function aim() {
  if (mode === "tall") return;
  const hole = mural.hole(), m = geo.face;
  world.style.transition = "none";
  world.style.transform = "none";
  const wr = world.getBoundingClientRect();
  const f = mural.frame(hole), s = (f.k * 1000) / m.w;
  const tx = hole.left + f.left - wr.left - m.x * s;
  const ty = hole.top + f.top - wr.top - m.y * s;
  void world.offsetWidth;
  world.style.transition = calm ? "none" : "";
  world.style.transform = `translate(${tx}px,${ty}px) scale(${s})`;
}

function enterWall() {
  if (painting) return;
  closeStart();
  painting = true;
  root.classList.add("lock");
  desk.classList.add("is-painting");
  life.pause(true);
  weather.stop();
  aim();
  setTimeout(() => { if (painting) { mural.enter(); mural.resize(); } }, calm ? 0 : 680);
}

function exitWall() {
  if (!painting) return;
  painting = false;
  mural.exit();
  life.pause(false);
  if (mural.made()) setTimeout(() => window.dispatchEvent(new CustomEvent("gz:painted")), 900);
  world.style.transform = "";
  desk.classList.remove("is-painting");
  root.classList.remove("lock");
  setTimeout(() => mural.resize(), 700);
}

function tick() {
  const d = new Date(), h = d.getHours(), m = String(d.getMinutes()).padStart(2, "0");
  clock.textContent = ((h % 12) || 12) + ":" + m + " " + (h < 12 ? "AM" : "PM");
  clock.title = d.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

function counter() {
  const out = desk.querySelector("[data-counter]");
  const paint = (n) => { out.textContent = String(typeof n === "number" ? n : 0).padStart(8, "0"); out.title = "You are visitor number " + n; };
  let counted = LOCAL.includes(location.hostname);
  try { counted = counted || sessionStorage.getItem("gl-counted") === "1"; } catch (e) {}
  const work = counted
    ? fetch(DB + "/hits.json").then((r) => r.json())
    : fetch(DB + "/.json", { method: "PATCH", body: JSON.stringify({ hits: { ".sv": { increment: 1 } } }) })
      .then((r) => r.json())
      .then((o) => { try { sessionStorage.setItem("gl-counted", "1"); } catch (e) {} return o && o.hits; });
  work.then(paint).catch(() => paint(0));
}

let audio = null, beat = 0, step = 0;
const NOTES = [523, 659, 784, 659, 587, 494, 587, 523, 440, 523, 659, 523];
function toggleMidi() {
  const b = desk.querySelector("[data-midi]");
  if (beat) { clearInterval(beat); beat = 0; b.setAttribute("aria-pressed", "false"); return; }
  audio = audio || new (window.AudioContext || window.webkitAudioContext)();
  audio.resume();
  b.setAttribute("aria-pressed", "true");
  step = 0;
  const note = () => {
    const o = audio.createOscillator(), g = audio.createGain();
    o.type = "square"; o.frequency.value = NOTES[step++ % NOTES.length];
    g.gain.setValueAtTime(0.05, audio.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.22);
    o.connect(g).connect(audio.destination);
    o.start(); o.stop(audio.currentTime + 0.24);
  };
  note();
  beat = setInterval(note, 250);
}

function billboard() {
  const q = world.querySelector("[data-bb]");
  if (!q) return;
  fetch(DB + "/reviews.json").then((r) => r.json()).then((d) => {
    const plain = /^[\p{L}\p{N}\s.,!?'"():;-]+$/u;
    const list = Object.entries(d || {}).filter(([, v]) => v && v.s >= 4 && typeof v.m === "string" && v.m.trim().length >= 4 && v.m.length <= 60 &&
      !/^\s*test\s*$/i.test(v.m) && plain.test(v.m) && (!v.n || (v.n.length <= 24 && plain.test(v.n))));
    if (!list.length) return;
    let last = "";
    try { last = localStorage.getItem("gl-bb") || ""; } catch (e) {}
    const pool = list.length > 1 ? list.filter(([k]) => k !== last) : list;
    const [key, pick] = pool[Math.floor(Math.random() * pool.length)];
    try { localStorage.setItem("gl-bb", key); } catch (e) {}
    q.textContent = "\u201C" + pick.m.trim() + "\u201D - " + (pick.n || "a web surfer");
    q.classList.toggle("is-long", pick.m.length > 30);
  }).catch(() => {});
}

function init() {
  layout();
  playBoot({ world, mapCanvas, ready: mapReady, desk });
  billboard();
  wins.querySelectorAll(".win:not([hidden])").forEach((w) => { position(w); focus(w); });
  const main = wins.querySelector(".win[data-route]:not([hidden])");
  if (main) focus(main);
  lockForWindows();
  renderTasks();
  tick();
  setInterval(tick, 15000);
  counter();
  if (location.hash === "#guestbook") openExtra("guestbook");
  addEventListener("resize", () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => { layout(); if (painting) aim(); }, 120);
  });
  (window.requestIdleCallback || ((f) => setTimeout(f, 1500)))(() => data());
  desk.classList.add("is-ready");
}

init();
