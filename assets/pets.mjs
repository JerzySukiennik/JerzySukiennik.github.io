/* Gzowo Labs pets: the animals of Gzowo walk the plot. Beethoven the deaf white cat naps by the wall and comes running when a fish is caught,
   Dropsik follows Jurek around, Kropka guards the hangar and the goat grazes on Gzowo Street. Click one to pet it; at night they sleep.
   Drawn as pixel frames in code and moved with plain CSS transitions, so nothing runs every frame. */

import { pix } from "/assets/life.mjs";

const ART = {
  cat: { pal: {K: "#3a3340", W: "#f7f5ef", S: "#d2ccc0", P: "#f2a3b3", E: "#4a7fe0"}, frames: [
    ["............K.K.", "...........KWKWK", ".K.........KWWWK", "KWK........KEWEK", "KWK..KKKKKKKWPWK", ".KWKKWWWWWWWWWK.", "..KWWWWWWWWWWK..", "..KWWWWWWWWWSK..", "..KWSKKKKKWSK...", "..KWK....KWK....", "..KK.....KK....."],
    ["............K.K.", "...........KWKWK", "...........KWWWK", ".KK........KEWEK", "KWWK.KKKKKKKWPWK", ".KWKKWWWWWWWWWK.", "..KWWWWWWWWWWK..", "..KWWWWWWWWWSK..", ".KWSKKKKKKKWSK..", "KWK.......KWK...", "KK.........KK..."],
    ["............K.K.", "...........KWKWK", "...........KWWWK", "...........KEWEK", "..........KWWPWK", ".........KWWWWK.", "........KWWWWWK.", "........KWWWWWK.", "........KWWSWWK.", ".....KKKKWWSWWK.", "....KWWWKKKKKKK."],
    ["................", "................", "................", "................", "................", ".....KKKKKK.....", "...KKWWWWWWKK.K.", "..KWWWWWWWWWWKWK", ".KWWSSWWWWWWKWWK", ".KWWWWSSSSWWWKK.", "..KKKKKKKKKKKK.."],
  ] },
  dropsik: { pal: {K: "#2a2020", T: "#c98a4b", D: "#4a3a30", L: "#e6bd86", N: "#151010"}, frames: [
    ["..............KK..", ".K...........KTTK.", "KDK.........KTTTTK", "KDK.........KTKTTK", ".KDKKKKKKKKKKTTTNK", "..KDDDDDDDDDTTLLK.", "..KDDDDDDDDDTTLK..", "..KTDDDDDDDTTTK...", "..KTTTTTTTTTTTK...", "..KTKKKKKKKKTTK...", "..KTK......KTK....", "..KLK......KLK....", "..KK.......KK....."],
    ["..............KK..", ".............KTTK.", ".KK.........KTTTTK", "KDDK........KTKTTK", ".KDKKKKKKKKKKTTTNK", "..KDDDDDDDDDTTLLK.", "..KDDDDDDDDDTTLK..", "..KTDDDDDDDTTTK...", "..KTTTTTTTTTTTK...", ".KTTKKKKKKKKTTTK..", ".KTK........KTK...", "KLK..........KLK..", "KK............KK.."],
    ["..............KK..", ".............KTTK.", "............KTTTTK", "............KTKTTK", "............KTTTNK", "...........KDTLLK.", "..........KDDTLK..", ".........KDDDTTK..", ".........KDDTTTK..", ".........KDDTTTK..", ".......KKKDTTKTK..", "......KDDDKTTKLK..", "......KKKKKKKKKK.."],
    ["..................", "..................", "..................", "..................", "..................", "..................", "........KKKKKK....", "......KKDDDDDDKK..", "....KKDDDDDDDDDDK.", "..KKTTDDDDDDDDTTK.", ".KTTTTTTDDDDTTTTK.", "KNTTKTTTTTTTTTTK..", ".KKKKKKKKKKKKKK..."],
  ] },
  kropka: { pal: {K: "#2a2020", C: "#f0dcb4", B: "#8a5a34", N: "#151010"}, frames: [
    ["..........K.K.", ".K.......KBKBK", "KCK......KCCCK", ".KCK.....KKCKK", "..KCKKKKKKCCNK", "..KCCBBCCCCCK.", "..KCCBBCCCCK..", "..KCCCCCCCCK..", "..KCKKKKKKCK..", "..KK.....KK..."],
    ["..........K.K.", ".........KBKBK", ".KK......KCCCK", "KCCK.....KKCKK", ".KCCKKKKKKCCNK", "..KCCBBCCCCCK.", "..KCCBBCCCCK..", "..KCCCCCCCCK..", ".KCKKKKKKKKCK.", ".KK.......KK.."],
    ["..........K.K.", ".........KBKBK", ".........KCCCK", ".........KKCKK", ".........KCCNK", "........KCCCK.", ".......KCBBCK.", ".......KCBBCK.", ".....KKKCCKCK.", "....KCCKKKKKK."],
    ["..............", "..............", "..............", "..............", "..............", "....KKKKKK....", "..KKCCBBCCKKK.", ".KCCCCBBCCCBBK", "KNCKCCCCCCCCK.", ".KKKKKKKKKKK.."],
  ] },
  goat: { pal: {K: "#2a2020", W: "#f4f1e8", B: "#9a5a2c", H: "#d9c9a5", N: "#3a2a24"}, frames: [
    ["...............H.H..", "...............KHKH.", "..............KBBBK.", ".K............KBKBBK", "KWK..........KBBBBBK", "KWKKKKKKKKKKKKBBBWNK", ".KBBBWWWWWWWWWBBWWK.", ".KBBBWWWWWWWWWWWKWK.", ".KBBWWWWWWWWWWWWK.K.", ".KWWWWWWWWWWWWWK....", ".KWWKKKKKKKKWWWK....", ".KWK.KWK..KWKKWK....", ".KWK.KWK..KWK.KWK...", ".KKK.KKK..KKK.KKK..."],
    ["...............H.H..", "...............KHKH.", "..............KBBBK.", "..............KBKBBK", ".KK..........KBBBBBK", "KWWKKKKKKKKKKKBBBWNK", ".KBBBWWWWWWWWWBBWWK.", ".KBBBWWWWWWWWWWWKWK.", ".KBBWWWWWWWWWWWWK.K.", ".KWWWWWWWWWWWWWK....", ".KWWKKKKKKKKWWWK....", "KWK.KWK...KWK.KWK...", "KWK..KWK.KWK...KWK..", "KKK..KKK.KKK...KKK.."],
    ["....................", "....................", "....................", ".K..................", "KWK.................", "KWKKKKKKKKKKKKK.....", ".KBBBWWWWWWWWWBK....", ".KBBBWWWWWWWWWBBK...", ".KBBWWWWWWWWWWBBBK..", ".KWWWWWWWWWWWKBBBKH.", ".KWWKKKKKKKKWWKBBBKH", ".KWK.KWK..KWKKWKBBNK", ".KWK.KWK..KWK.KWKKK.", ".KKK.KKK..KKK.KKK..."],
    ["....................", "....................", "....................", "....................", "....................", "..............H.H...", "..............KHKH..", ".............KBBBK..", ".............KBKBBK.", "...KKKKKKKKKKBBBBNK.", "..KBBWWWWWWWWWBBWK..", ".KBBBWWWWWWWWWWWWK..", ".KWWWWWWWWWWWWWWK...", ".KKKKKKKKKKKKKKK...."],
  ] },
};
const HEART = pix([[".KK.KK.", "KRRKRRK", "KRRRRRK", "KRRRRRK", ".KRRRK.", "..KRK..", "...K..."]], { K: "#2a1418", R: "#f0506e" });
const ZED = pix([["KKKK...", "..K....", ".K..KKK", "KKKK.K.", "....KKK"]], { K: "#e8eeff" });
const BANG = pix([["..KKK..", "..KYK..", "..KYK..", "..KYK..", "..KKK..", "..KYK..", "..KKK.."]], { K: "#2a2020", Y: "#ffd84a" });
const PETS = [
  { key: "cat", name: "Beethoven", about: "Beethoven, the deaf white cat", sound: "meow", speed: 0.5, says: ["Meow.", "Mrrr.", "...", "Purr."] },
  { key: "dropsik", name: "Dropsik", about: "Dropsik, Jurek's dog", sound: "bark", speed: 1.15, says: ["Woof!", "Hau hau!", "*wags tail*"] },
  { key: "kropka", name: "Kropka", about: "Kropka, the hangar guard dog", sound: "woof", speed: 0.9, says: ["Wuf!", "Grr. Just kidding.", "*guards the hangar*"] },
  { key: "goat", name: "Koza", about: "The goat from the Narew", sound: "baa", speed: 0.4, says: ["Meee!", "Mee.", "*chews*"] },
];
const R = (a, b) => a + Math.random() * (b - a);
const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;

export function createPets(world) {
  let g = null, k = 2, night = false, heard = false, followT = 0;
  const sounds = {};
  const list = PETS.map((def) => {
    const art = ART[def.key], w = art.frames[0][0].length, h = art.frames[0].length;
    const el = document.createElement("button");
    el.type = "button";
    el.className = "pet pet-" + def.key;
    el.setAttribute("aria-label", def.about + ", pet it");
    el.style.setProperty("--art", pix(art.frames, art.pal));
    el.innerHTML = `<i class="pet-a lv"></i><i class="pet-e"></i>`;
    world.append(el);
    return { ...def, el, w, h, x: 0, y: 0, dir: 1, mode: "idle", t: 0, zone: null, home: null, busy: false, bub: null };
  });
  const byKey = Object.fromEntries(list.map((P) => [P.key, P]));
  const tag = document.createElement("span");
  tag.className = "fk-tag";
  tag.hidden = true;
  world.append(tag);

  function place(P) {
    P.el.style.transform = `translate(${Math.round(P.x - (P.w * k) / 2)}px,${Math.round(P.y - P.h * k)}px)`;
    P.el.style.zIndex = Math.round(P.y);
  }
  function pose(P, mode) {
    P.mode = mode;
    P.el.dataset.pose = mode;
    P.el.classList.toggle("is-left", P.dir < 0);
  }
  function emote(P, art, ms = 1500) {
    const e = P.el.querySelector(".pet-e");
    e.style.setProperty("--e", art);
    e.classList.remove("on");
    void e.offsetWidth;
    e.classList.add("on");
    clearTimeout(P.et);
    if (ms) P.et = setTimeout(() => e.classList.remove("on"), ms);
  }
  function say(P, line, ms = 2000) {
    if (!P.bub) {
      P.bub = document.createElement("div");
      P.bub.className = "psx-say fk-say";
      P.bub.setAttribute("aria-hidden", "true");
      P.bub.innerHTML = `<div class="psx-b"><span class="psx-t"></span></div>`;
      world.append(P.bub);
    }
    P.bub.querySelector(".psx-t").textContent = line;
    P.bub.classList.remove("on");
    void P.bub.offsetWidth;
    P.bub.classList.add("on");
    const bw = P.bub.offsetWidth || 90, bh = P.bub.offsetHeight || 28, right = P.x - 14 + bw > g.W - 4;
    P.bub.dataset.side = right ? "l" : "r";
    P.bub.style.transform = `translate(${Math.round(right ? Math.max(4, P.x + 14 - bw) : Math.max(4, P.x - 14))}px,${Math.round(P.y - P.h * k - bh - 2)}px)`;
    clearTimeout(P.bt);
    P.bt = setTimeout(() => P.bub.classList.remove("on"), ms);
  }
  function voice(P) {
    if (!heard) return;
    try {
      const a = sounds[P.sound] || (sounds[P.sound] = new Audio(`/assets/sfx/pets/${P.sound}.mp3`));
      a.volume = 0.5;
      a.currentTime = 0;
      a.play().catch(() => {});
    } catch (e) {}
  }

  function go(P, x, y, then, fast = 1) {
    clearTimeout(P.t);
    const d = Math.hypot(x - P.x, y - P.y), T = Math.max(0.05, d / (g.speed * P.speed * fast));
    if (Math.abs(x - P.x) > 1) P.dir = x > P.x ? 1 : -1;
    P.el.style.transitionDuration = (calm ? 0 : T) + "s";
    pose(P, "walk");
    P.x = x; P.y = y;
    place(P);
    P.t = setTimeout(() => { pose(P, "idle"); if (then) then(); }, (calm ? 0.05 : T) * 1000 + 40);
  }
  function route(P, pts, then, fast = 1) {
    const [p, ...rest] = pts;
    if (!p) { if (then) then(); return; }
    go(P, p[0], p[1], () => route(P, rest, then, fast), fast);
  }
  const spot = (z) => [R(z.x0, z.x1), R(z.y0, z.y1)];

  function idle(P) {
    clearTimeout(P.t);
    if (!g || P.busy) return;
    if (night) {
      if (Math.hypot(P.home[0] - P.x, P.home[1] - P.y) > 4) { go(P, P.home[0], P.home[1], () => idle(P)); return; }
      pose(P, "sleep");
      emote(P, ZED, 0);
      P.t = setTimeout(() => idle(P), 30000);
      return;
    }
    P.el.querySelector(".pet-e").classList.remove("on");
    if (P.key === "dropsik" && follow(P)) return;
    const roll = Math.random();
    if (roll < 0.5) { const [x, y] = spot(P.zone); go(P, x, y, () => { pose(P, "idle"); P.t = setTimeout(() => idle(P), R(900, 3500)); }); }
    else if (roll < 0.86) { pose(P, "sit"); P.t = setTimeout(() => idle(P), R(5000, 14000)); }
    else { pose(P, "sleep"); P.t = setTimeout(() => idle(P), R(9000, 20000)); }
  }

  function follow(P) {
    const J = window.gzJurek;
    if (!J || !Number.isFinite(J.x)) return false;
    if (J.trip) { pose(P, "sit"); P.t = setTimeout(() => idle(P), 1500); return true; }
    const side = P.x <= J.x ? -1 : 1, tx = J.x + side * g.person * 0.75, ty = J.y + 2, d = Math.hypot(tx - P.x, ty - P.y);
    if (d > g.person * 0.45) { go(P, tx, ty, () => idle(P), d > g.person * 4 ? 2.2 : 1); return true; }
    P.dir = J.x >= P.x ? 1 : -1;
    pose(P, J.busy ? "idle" : "sit");
    P.t = setTimeout(() => idle(P), 700);
    return true;
  }

  function pet(P) {
    heard = true;
    voice(P);
    P.el.classList.remove("is-hop");
    void P.el.offsetWidth;
    P.el.classList.add("is-hop");
    if (P.mode === "sleep" && !night) pose(P, "sit");
    if (P.key === "cat" && Math.random() < 0.5) { say(P, "...", 900); setTimeout(() => { emote(P, HEART); say(P, "Oh! Purr.", 1700); }, 950); }
    else { emote(P, HEART); say(P, P.says[Math.floor(Math.random() * P.says.length)], 1800); }
    dispatchEvent(new CustomEvent("gz:pet", { detail: P.key }));
  }

  world.addEventListener("click", (e) => {
    const b = e.target.closest(".pet");
    if (!b) return;
    e.preventDefault();
    e.stopPropagation();
    const P = list.find((x) => x.el === b);
    if (P) pet(P);
  });
  world.addEventListener("pointerover", (e) => {
    const b = e.target.closest && e.target.closest(".pet");
    if (!b) return;
    const P = list.find((x) => x.el === b);
    tag.textContent = P.name;
    tag.hidden = false;
    tag.style.cssText = `left:${Math.round(P.x)}px;top:${Math.round(P.y + 2)}px;z-index:${Math.round(P.y) + 1}`;
  });
  world.addEventListener("pointerout", (e) => { if (e.target.closest && e.target.closest(".pet")) tag.hidden = true; });
  addEventListener("pointerdown", () => { heard = true; }, { once: true });

  addEventListener("gz:night", (e) => { night = !!(e.detail && e.detail.night); list.forEach((P) => { if (!P.busy) idle(P); }); });
  addEventListener("gz:fish-done", (e) => {
    const d = e.detail || {}, P = byKey.cat;
    if (d.miss || d.key === "boot" || !g || night || P.busy) return;
    P.busy = true;
    const dock = g.fish.stand, top = g.trip.down[0];
    route(P, [[P.x, top[1]], top, [dock[0] - g.fish.side * g.person * 0.5, dock[1]]], () => {
      pose(P, "sit");
      emote(P, HEART, 2600);
      say(P, "Meow! Fish?", 2400);
      voice(P);
      P.t = setTimeout(() => route(P, [top, [P.home[0], top[1]], P.home], () => { P.busy = false; idle(P); }), 6000);
    }, 2.4);
  });
  addEventListener("gz:hangar", () => {
    const P = byKey.kropka;
    if (!g || night || P.busy) return;
    P.busy = true;
    emote(P, BANG, 1400);
    say(P, "Wuf! Wuf!", 1600);
    voice(P);
    const z = P.zone;
    route(P, [[z.x0, P.y], [z.x1, P.y], [(z.x0 + z.x1) / 2, P.y]], () => { P.busy = false; idle(P); }, 2);
  });
  addEventListener("gz:camp", () => {
    const P = byKey.dropsik;
    if (g && !night && !P.busy && Math.random() < 0.6) say(P, "Woof! Fire!", 1600);
  });

  return {
    layout(geo) {
      g = geo;
      k = Math.max(2, geo.k);
      const s = g.s, V = g.V, H = g.H, f = V / 390, P = g.places, tallZ = (x0, x1, y0, y1) => ({ x0: x0 * f, x1: x1 * f, y0: y0 * f, y1: y1 * f });
      const zones = g.mode === "tall" ? {
        cat: tallZ(225, 295, 1250, 1390), dropsik: tallZ(90, 180, 2060, 2090), kropka: tallZ(500, 680, 808, 820), goat: tallZ(870, 1050, 1100, 1175),
      } : {
        cat: { x0: 0.47 * V, x1: 0.94 * V, y0: 0.63 * H, y1: 0.7 * H }, dropsik: { x0: 1.05 * V, x1: 1.34 * V, y0: 0.79 * H, y1: 0.82 * H },
        kropka: { x0: P.hangar.x + P.hangar.w * 0.18, x1: P.hangar.x + P.hangar.w * 0.82, y0: P.hangar.y + P.hangar.h + 3 * s, y1: P.hangar.y + P.hangar.h + 9 * s },
        goat: { x0: 2.73 * V, x1: 2.96 * V, y0: 0.8 * H, y1: 0.9 * H },
      };
      night = !!(window.gzNight && window.gzNight.night);
      list.forEach((p) => {
        clearTimeout(p.t);
        p.busy = false;
        p.zone = zones[p.key];
        p.home = [(p.zone.x0 + p.zone.x1) / 2 + (p.key === "kropka" ? p.zone.x1 - p.zone.x0 : 0) * 0.3, p.zone.y1];
        Object.assign(p.el.style, { width: p.w * k + "px", height: p.h * k + "px", transitionDuration: "0s" });
        p.el.style.setProperty("--k", k);
        [p.x, p.y] = night ? p.home : spot(p.zone);
        place(p);
        pose(p, "idle");
        p.t = setTimeout(() => idle(p), R(300, 2500));
      });
      clearInterval(followT);
      followT = setInterval(() => { const D = byKey.dropsik; if (!document.hidden && !night && !D.busy && D.mode !== "walk") idle(D); }, 2500);
    },
  };
}
