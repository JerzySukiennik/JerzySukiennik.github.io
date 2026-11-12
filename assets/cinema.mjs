/* Gzowo Labs outdoor cinema: a screen on the plot that shows the reels and films of Gzowo Labs. Everyone sees the same programme, timed
   off the clock. The screen on the map plays a small silent copy; a click opens the cinema window with the real film and its sound.
   Folks sit down in front of the screen to watch. */

import { esc } from "/assets/folks.mjs";

const FILMS = [
  { id: "cube-breakers", name: "Cube Breakers", d: 24.6, tall: true, page: "/p/cube-breakers/" },
  { id: "gzofajfus-4", name: "Gzofajfus 4", d: 50, tall: true },
  { id: "arbuz-express", name: "Arbuz Express", d: 30.2, tall: true, page: "/p/arbuz-express/" },
  { id: "fajfuzzy", name: "Fajfuzzy", d: 90.8, tall: false },
  { id: "gzowo-glass", name: "Gzowo Glass", d: 60, tall: false, page: "/p/gzowo-glass/" },
  { id: "interstellar", name: "Interstellar", d: 137, tall: false, page: "/p/interstellar/" },
  { id: "wire-choir", name: "Wire Choir", d: 54, tall: true, page: "/p/wire-choir/" },
];
const TOTAL = FILMS.reduce((a, f) => a + f.d, 0);
const SCREEN = { x: 21 / 260, y: 40 / 216, w: 204 / 260, h: 121 / 216 };
const SEATS = [0.16, 0.32, 0.48, 0.64, 0.79];
const clock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

function onNow() {
  let t = (Date.now() / 1000) % TOTAL;
  const all = t;
  for (let i = 0; i < FILMS.length; i++) {
    if (t < FILMS[i].d) return { i, t, all };
    t -= FILMS[i].d;
  }
  return { i: 0, t: 0, all: 0 };
}

export function createCinema(world) {
  const spots = world.querySelector(".spots");
  const spot = document.createElement("button");
  spot.type = "button";
  spot.className = "spot spot-cinema";
  spot.dataset.place = "cinema";
  spot.dataset.cinema = "1";
  spot.setAttribute("aria-label", "Outdoor cinema, watch the films of Gzowo Labs");
  spot.innerHTML = `<img class="spr" src="/assets/map/cinema.webp" alt="" draggable="false"><span class="spot-l"><b>Cinema</b><em>now showing</em></span>`;
  spots.append(spot);
  const label = spot.querySelector(".spot-l em");
  const screen = document.createElement("video");
  screen.className = "cn-screen";
  screen.muted = true;
  screen.loop = true;
  screen.playsInline = true;
  screen.preload = "none";
  screen.setAttribute("muted", "");
  screen.setAttribute("playsinline", "");
  screen.setAttribute("aria-hidden", "true");
  screen.tabIndex = -1;
  world.append(screen);
  let g = null, seen = false, loaded = false, playing = -1, watched = 0, paid = false, tick = 0;

  function sync() {
    if (!loaded || !screen.duration) return;
    const want = (Date.now() / 1000) % screen.duration;
    if (Math.abs(screen.currentTime - want) > 1.2) screen.currentTime = want;
  }

  function run() {
    const want = seen && !document.hidden && !document.documentElement.classList.contains("lock");
    label.textContent = FILMS[onNow().i].name;
    if (want && !loaded) {
      loaded = true;
      screen.src = "/assets/cinema/program.mp4";
      screen.addEventListener("loadedmetadata", sync, { once: true });
    }
    if (!loaded) return;
    if (want) { sync(); screen.play().catch(() => {}); }
    else screen.pause();
  }
  new IntersectionObserver((list) => { seen = list[0].isIntersecting; run(); }, { rootMargin: "80px" }).observe(spot);
  document.addEventListener("visibilitychange", run);
  setInterval(() => { if (seen && !document.hidden) run(); }, 20000);

  function list(el) {
    const now = onNow().i;
    el.querySelector(".cn-list").innerHTML = FILMS.map((f, i) => `<li><button type="button" class="cn-film${i === playing ? " on" : ""}" data-cn-film="${i}"><img src="/assets/cinema/${f.id}.jpg" alt="" width="64" height="36" loading="lazy"><span><b>${esc(f.name)}</b><em>${clock(f.d)}${i === now ? ", on the big screen now" : ""}</em></span></button></li>`).join("");
    const f = FILMS[playing];
    el.querySelector(".cn-now").innerHTML = f ? `<b>${esc(f.name)}</b>${f.page ? ` <a href="${f.page}">Open the project</a>` : ""}` : "";
    el.querySelector(".stb").innerHTML = `<span>${f ? "Playing: " + esc(f.name) : "Pick a film"}</span><span>${FILMS.length} films, ${clock(TOTAL)} in all</span>`;
  }

  function play(el, i, at = 0) {
    const v = el.querySelector("video"), f = FILMS[i];
    playing = i;
    v.classList.toggle("tall", f.tall);
    v.poster = `/assets/cinema/${f.id}.jpg`;
    v.src = `/assets/cinema/${f.id}.mp4`;
    const go = () => { if (at > 0.5 && at < v.duration - 1) v.currentTime = at; v.play().catch(() => {}); };
    v.addEventListener("loadedmetadata", go, { once: true });
    list(el);
  }

  function open() {
    const old = window.gzDesk.find("cinema");
    if (old && !old.hidden) { window.gzDesk.open({ id: "cinema" }); return; }
    const el = window.gzDesk.open({ id: "cinema", title: "Gzowo Cinema", icon: "film", cls: "w-cinema", status: "<span></span>",
      body: `<div class="cn"><div class="cn-stage"><video controls playsinline preload="metadata"></video><p class="cn-now"></p></div><ul class="cn-list"></ul></div>` });
    const v = el.querySelector("video");
    if (!el.dataset.wired) {
      el.dataset.wired = "1";
      v.addEventListener("ended", () => play(el, (playing + 1) % FILMS.length));
      v.addEventListener("timeupdate", () => {
        const t = performance.now();
        if (!v.paused && tick && t - tick < 1500) watched += t - tick;
        tick = t;
        if (watched > 15000 && !paid) { paid = true; dispatchEvent(new CustomEvent("gz:film")); }
      });
      el.addEventListener("click", (e) => { const b = e.target.closest("[data-cn-film]"); if (b) play(el, +b.dataset.cnFilm); });
      new MutationObserver(() => { if (el.hidden || !el.isConnected) v.pause(); }).observe(el, { attributes: true, attributeFilter: ["hidden"] });
    }
    const now = onNow();
    play(el, now.i, now.t);
  }

  document.addEventListener("click", (e) => {
    if (!e.target.closest("[data-cinema]")) return;
    e.preventDefault();
    if (window.gzDesk.hideStart) window.gzDesk.hideStart();
    open();
  });
  if (location.hash === "#cinema") setTimeout(open, 500);

  return {
    layout(geo) {
      g = geo;
      const b = g.places.cinema;
      Object.assign(screen.style, { left: b.x + SCREEN.x * b.w + "px", top: b.y + SCREEN.y * b.h + "px", width: SCREEN.w * b.w + "px", height: SCREEN.h * b.h + "px" });
      dispatchEvent(new CustomEvent("gz:hub", { detail: { key: "cinema", on: true, pull: 0.1, seats: SEATS.map((x) => [b.x + x * b.w, b.y + b.h + Math.max(8, 10 * g.s)]) } }));
      run();
    },
  };
}
