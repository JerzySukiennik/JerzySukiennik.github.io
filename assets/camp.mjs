/* Gzowo Labs campfire: a fire ring on the plot that anyone can light. It burns for everyone for ten minutes and a click adds a log.
   Folks come and sit on the logs, smoke rises by day, sparks fly at night and a real recorded fire crackles while it is on screen. */

import { pix, PUFF } from "/assets/life.mjs";
import { api } from "/assets/bank.mjs";

const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
const FIRE = pix([
  ["......R......", ".....RR......", ".....ROR.....", "....RROR.....", "....ROORR....", "...RROYOR....", "...ROYYORR...", "..RROYYYOR...", "..ROYYWYOR...", "..ROYWWYORR..",
    ".RROYWWWYOR..", ".ROYYWWWYOR..", ".ROOYWWYYOR..", "..ROOYYYOR...", "...RROOORR...", "....RRRRR...."],
  [".......R.....", ".......RR....", "......ROR....", ".....RROR....", ".....ROORR...", "....RROYOR...", "...RROYYOR...", "...ROYYYORR..", "..RROYWYYOR..", "..ROYYWWYOR..",
    "..ROYWWWYORR.", ".RROYWWWYYOR.", ".ROOYWWYYOOR.", "..ROOYYYOOR..", "...RROOORR...", "....RRRRR...."],
  [".............", "......R......", ".....RR......", "....RROR.....", "....ROORR....", "...RROYOR....", "..RROYYORR...", "..ROYYYYOR...", ".RROYWWYOR...", ".ROYYWWYORR..",
    ".ROYWWWWYOR..", "RROYWWWWYOR..", "ROOYYWWYYOR..", ".ROOYYYYOOR..", "..RROOOORR...", "....RRRRR...."],
], { R: "#ef5a1c", O: "#ff9a1f", Y: "#ffd84a", W: "#fffbe6" });
const SEATS = [[0.14, 0.33], [0.87, 0.35], [0.17, 0.83], [0.68, 1.02], [0.36, 1.05]];
const CENTER = [0.495, 0.56];

export function createCamp(world) {
  const spots = world.querySelector(".spots");
  const spot = document.createElement("button");
  spot.type = "button";
  spot.className = "spot spot-camp";
  spot.dataset.place = "camp";
  spot.innerHTML = `<img class="spr" src="/assets/map/camp.webp" alt="" draggable="false"><span class="spot-l"><b>Campfire</b><em>light it</em></span>`;
  spots.append(spot);
  const label = spot.querySelector(".spot-l em");
  const mk = (cls, html = "") => { const e = document.createElement("i"); e.className = cls; e.setAttribute("aria-hidden", "true"); e.innerHTML = html; world.append(e); return e; };
  const glow = mk("cf-glow lv"), fire = mk("cf-fire lv");
  const air = mk("cf-air", [0, 1, 2].map((i) => `<i class="cf-puff lv" style="--puff:${PUFF};--dl:${i * 1.5}s"></i>`).join("") +
    [0, 1, 2, 3, 4, 5, 6].map((i) => `<i class="cf-spark lv" style="--dx:${[-26, 18, -8, 30, -34, 6, 22][i]}px;--dl:${(i * 0.47).toFixed(2)}s;--d:${(2.4 + (i % 3) * 0.6).toFixed(1)}s"></i>`).join(""));
  fire.style.setProperty("--fire", FIRE);
  let g = null, until = 0, timer = 0, busy = false, audio = null, seen = false, heard = false;

  const lit = () => until > Date.now();
  const hub = () => {
    if (!g) return;
    const b = g.places.camp;
    dispatchEvent(new CustomEvent("gz:hub", { detail: { key: "camp", on: lit(), seats: SEATS.map(([x, y]) => [b.x + x * b.w, b.y + y * b.h]) } }));
  };

  function sound() {
    const want = lit() && seen && heard && !document.hidden && !document.documentElement.classList.contains("lock");
    if (want && !audio) {
      audio = new Audio("/assets/sfx/camp/fire.mp3");
      audio.loop = true;
      audio.volume = 0.32;
    }
    if (!audio) return;
    if (want) audio.play().catch(() => {});
    else audio.pause();
  }

  function show() {
    const on = lit();
    [spot, fire, glow, air].forEach((e) => e.classList.toggle("is-lit", on));
    const left = Math.max(1, Math.ceil((until - Date.now()) / 60000));
    label.textContent = on ? `add a log, ${left} min left` : "light it";
    spot.setAttribute("aria-label", on ? `Campfire, burning for ${left} more minutes, add a log` : "Campfire, light it");
    clearTimeout(timer);
    if (on) timer = setTimeout(show, Math.min(60000, until - Date.now() + 200));
    hub();
    sound();
  }

  function set(t) {
    const was = lit();
    until = t || 0;
    show();
    if (lit() && !was) dispatchEvent(new CustomEvent("gz:camp", { detail: { until } }));
  }

  spot.addEventListener("click", async (e) => {
    e.preventDefault();
    heard = true;
    if (busy) return;
    busy = true;
    spot.classList.remove("is-poked");
    void spot.offsetWidth;
    spot.classList.add("is-poked");
    try {
      const j = await api("/camp", {});
      set(j.camp);
      dispatchEvent(new CustomEvent("gz:camp-sit"));
    } catch (err) { label.textContent = "the matches are wet, try later"; }
    busy = false;
  });
  addEventListener("gz:pulse", (e) => { if (e.detail) set(e.detail.camp); });
  addEventListener("pointerdown", () => { heard = true; sound(); }, { once: true });
  document.addEventListener("visibilitychange", sound);
  new IntersectionObserver((list) => { seen = list[0].isIntersecting; sound(); }).observe(spot);

  return {
    layout(geo) {
      g = geo;
      const b = g.places.camp, k = Math.max(2, Math.round(b.k * 5.4)), cx = b.x + CENTER[0] * b.w, cy = b.y + CENTER[1] * b.h;
      spot.style.zIndex = Math.round(b.y + b.h * 0.22);
      Object.assign(fire.style, { left: cx - 6.5 * k + "px", top: cy - 15 * k + "px", width: 13 * k + "px", height: 16 * k + "px" });
      const d = b.w * 2.1;
      Object.assign(glow.style, { left: cx - d / 2 + "px", top: cy - d * 0.42 + "px", width: d + "px", height: d * 0.8 + "px" });
      Object.assign(air.style, { left: cx + "px", top: cy - 13 * k + "px" });
      air.style.setProperty("--k", k);
      if (calm) air.hidden = true;
      show();
    },
  };
}
