/* js/main.js — fetches and parses projects.md at runtime, builds one section
   per project, then wires Lenis + GSAP ScrollTrigger, section snap, progress
   dots, carousels, magnetic buttons and the OGL shader backgrounds.
   Project images live in projectimages/<folder>/N.jpg (N = 1..3, numeric
   names, .jpg only); they are discovered at runtime with the Image() API. */

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger);

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = window.matchMedia("(pointer: fine)").matches;
const isMobile = window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 768;
const useShaders = !reduced && !isMobile;
const snapEnabled = !reduced && finePointer && window.innerWidth >= 900;

/* Per-section shader presets (tint also feeds the static gradient fallback) */
const PRESETS = {
  hero: { tint: "#123a4a", speed: 0.04, variant: 0, intensity: 1.0 },
  contact: { tint: "#0b1013", speed: 0.02, variant: 0, intensity: 0.5 },
  projects: [
    { tint: "#2c1a4a", speed: 0.04, variant: 1, intensity: 0.9 }, // deep violet
    { tint: "#16181d", speed: 0.04, variant: 2, intensity: 1.0 }, // graphite
    { tint: "#12301f", speed: 0.04, variant: 3, intensity: 0.9 }, // forest green
    { tint: "#33290e", speed: 0.02, variant: 4, intensity: 0.9 }, // murky ochre
    { tint: "#10254d", speed: 0.04, variant: 5, intensity: 0.9 }, // deep blue
    { tint: "#101720", speed: 0.03, variant: 6, intensity: 1.0 }, // cold slate
  ],
};

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const pad2 = (n) => String(n).padStart(2, "0");

/* ---------- projects.md parser ---------- */
/* Blocks start at lines matching "## <digits>"; only "- key: value" lines are
   read inside a block; blocks with an empty name are spare templates. */
function parseProjects(md) {
  const projects = [];
  let cur = null;
  const commit = () => {
    if (cur && cur.name && cur.name.trim()) projects.push(cur);
    cur = null;
  };
  for (const raw of md.split(/\r?\n/)) {
    const line = raw.trim();
    if (/^##\s+\d+$/.test(line)) {
      commit();
      cur = {};
      continue;
    }
    if (/^#{1,6}\s/.test(line)) { commit(); continue; }
    if (cur) {
      const m = line.match(/^-\s*([A-Za-z]+)\s*:\s*(.*)$/);
      if (m) cur[m[1].toLowerCase()] = m[2].trim();
    }
  }
  commit();
  return projects;
}

/* ---------- image discovery (N.jpg, 1..3) ---------- */
function discoverImages(folder) {
  const base = `projectimages/${encodeURIComponent(folder || "")}/`;
  return Promise.all(
    [1, 2, 3].map(
      (n) =>
        new Promise((resolve) => {
          const img = new Image();
          img.onload = () => resolve(base + n + ".jpg");
          img.onerror = () => resolve(null);
          img.src = base + n + ".jpg";
        })
    )
  ).then((list) => list.filter(Boolean));
}

/* ---------- DOM helpers ---------- */
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/* Split a node's text into .word > .char spans (aria-label keeps the text
   accessible). Used by the hero name lines and project titles. */
function splitChars(node) {
  const text = node.textContent.trim();
  node.setAttribute("aria-label", text);
  node.textContent = "";
  const words = text.split(/\s+/);
  words.forEach((word, wi) => {
    const w = el("span", "word");
    w.setAttribute("aria-hidden", "true");
    for (const ch of word) w.appendChild(el("span", "char", ch));
    node.appendChild(w);
    if (wi < words.length - 1) node.appendChild(document.createTextNode(" "));
  });
}

/* ---------- carousel ---------- */
/* Image discovery is deferred until the section approaches the viewport, and
   auto-advance only runs while the carousel is actually near the screen. */
const lazyIO = new IntersectionObserver((records) => {
  for (const r of records) {
    if (r.isIntersecting && r.target._load) {
      r.target._load();
      r.target._load = null;
      lazyIO.unobserve(r.target);
    }
  }
}, { rootMargin: "150%" });

const viewIO = new IntersectionObserver((records) => {
  for (const r of records) {
    if (r.target._state) r.target._state.inView = r.isIntersecting;
  }
});

function buildCarousel(project) {
  const wrap = el("div", "carousel");
  wrap.setAttribute("role", "group");
  wrap.setAttribute("aria-roledescription", "carousel");
  wrap.setAttribute("aria-label", `${project.name} images`);
  const track = el("div", "carousel-track");
  wrap.appendChild(track);

  const state = { paused: false, inView: false };
  wrap._state = state;
  viewIO.observe(wrap);

  wrap._load = () => discoverImages(project.folder).then((srcs) => {
    if (!srcs.length) {
      const ph = el("div", "carousel-placeholder", (project.name || "?").trim().charAt(0).toUpperCase());
      track.appendChild(ph);
      return;
    }
    const imgs = srcs.map((src, i) => {
      const img = new Image();
      img.src = src;
      img.alt = project.name;
      img.loading = "lazy";
      img.decoding = "async";
      img.draggable = false;
      img.className = "carousel-img";
      img.style.opacity = i === 0 ? "1" : "0";
      track.appendChild(img);
      return img;
    });

    /* dots + auto-advance only with 2+ images */
    if (imgs.length > 1) {
      let current = 0;
      const dots = el("div", "carousel-dots");
      const dotBtns = imgs.map((_, i) => {
        const b = el("button", i === 0 ? "is-active" : "");
        b.type = "button";
        b.setAttribute("aria-label", `Image ${i + 1} of ${imgs.length}`);
        if (i === 0) b.setAttribute("aria-current", "true");
        b.addEventListener("click", () => goTo(i));
        dots.appendChild(b);
        return b;
      });
      wrap.appendChild(dots);

      function goTo(i) {
        if (i === current) return;
        const dur = reduced ? 0 : 0.8;
        gsap.to(imgs[current], { opacity: 0, duration: dur, ease: "power2.inOut" });
        gsap.to(imgs[i], { opacity: 1, duration: dur, ease: "power2.inOut" });
        dotBtns[current].classList.remove("is-active");
        dotBtns[current].removeAttribute("aria-current");
        dotBtns[i].classList.add("is-active");
        dotBtns[i].setAttribute("aria-current", "true");
        current = i;
      }

      if (!reduced) {
        setInterval(() => {
          if (state.inView && !state.paused && !document.hidden) goTo((current + 1) % imgs.length);
        }, 4000);
      }
      wrap.addEventListener("mouseenter", () => (state.paused = true));
      wrap.addEventListener("mouseleave", () => (state.paused = false));
      wrap.addEventListener("focusin", () => (state.paused = true));
      wrap.addEventListener("focusout", () => (state.paused = false));
    }

    /* hover parallax on the whole track (transform only) */
    if (finePointer && !reduced) {
      const xTo = gsap.quickTo(track, "x", { duration: 0.6, ease: "power3.out" });
      const yTo = gsap.quickTo(track, "y", { duration: 0.6, ease: "power3.out" });
      const sTo = gsap.quickTo(track, "scale", { duration: 0.6, ease: "power3.out" });
      wrap.addEventListener("mousemove", (e) => {
        const r = wrap.getBoundingClientRect();
        const nx = (e.clientX - r.left) / r.width - 0.5;
        const ny = (e.clientY - r.top) / r.height - 0.5;
        xTo(clamp(nx * 20, -10, 10));
        yTo(clamp(ny * 20, -10, 10));
        sTo(1.04);
      });
      wrap.addEventListener("mouseleave", () => {
        xTo(0);
        yTo(0);
        sTo(1);
      });
    }
  });

  lazyIO.observe(wrap);
  return wrap;
}

/* ---------- project section builder ---------- */
function buildProjectSection(project, i) {
  const preset = PRESETS.projects[i % PRESETS.projects.length];
  const sec = el("section", "section project");
  sec.style.setProperty("--tint", preset.tint);

  const num = el("span", "section-num");
  num.setAttribute("aria-hidden", "true");
  sec.appendChild(num);

  const grid = el("div", "project-grid" + (i % 2 === 0 ? " alt" : ""));
  const carousel = buildCarousel(project);
  grid.appendChild(carousel);

  const info = el("div", "project-info");
  const title = el("h2", "project-title", project.name);
  if (!reduced) splitChars(title);
  info.appendChild(title);
  if (project.tagline) info.appendChild(el("p", "project-tagline", project.tagline));

  const meta = el("dl", "meta");
  for (const [label, key] of [["Year", "year"], ["Category", "category"], ["Status", "status"], ["Stack", "stack"]]) {
    if (!project[key]) continue;
    meta.appendChild(el("dt", "", label));
    meta.appendChild(el("dd", "", project[key]));
  }
  info.appendChild(meta);

  if (project.url) {
    const a = el("a", "explore magnetic");
    a.href = project.url;
    a.target = "_blank";
    a.rel = "noopener";
    const inner = el("span", "magnetic-inner", "Explore");
    inner.appendChild(el("span", "arrow", "→"));
    a.appendChild(inner);
    info.appendChild(a);
  }
  grid.appendChild(info);
  sec.appendChild(grid);

  /* diagonal separator */
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("class", "separator");
  svg.setAttribute("viewBox", "0 0 100 4");
  svg.setAttribute("preserveAspectRatio", "none");
  svg.setAttribute("aria-hidden", "true");
  svg.innerHTML =
    `<defs><linearGradient id="sep-${i}" x1="0" y1="0" x2="1" y2="0">` +
    `<stop offset="0" stop-color="rgba(242,241,236,0.14)"/>` +
    `<stop offset="0.78" stop-color="rgba(242,241,236,0.14)"/>` +
    `<stop offset="1" stop-color="rgba(55,230,255,0.3)"/>` +
    `</linearGradient></defs>` +
    `<line x1="0" y1="2" x2="100" y2="2" stroke="url(#sep-${i})" stroke-width="1.5"/>`;
  sec.appendChild(svg);

  return sec;
}

/* ---------- hero intro ---------- */
function initHero() {
  const hero = document.querySelector(".hero");
  const name = hero.querySelector(".hero-name");
  if (reduced) return;

  /* char-split each name line (one .word per line keeps the stacked layout) */
  const lines = [...name.querySelectorAll(".hero-line")];
  name.setAttribute("aria-label", lines.map((l) => l.textContent.trim()).join(" "));
  for (const line of lines) {
    const text = line.textContent.trim();
    line.textContent = "";
    line.setAttribute("aria-hidden", "true");
    const w = el("span", "word");
    for (const ch of text) w.appendChild(el("span", "char", ch));
    line.appendChild(w);
  }

  gsap.from(name.querySelectorAll(".char"), {
    yPercent: 110,
    duration: 1.1,
    ease: "expo.out",
    stagger: 0.04,
    delay: 0.15,
  });
  gsap.from(hero.querySelector(".hero-tagline"), {
    y: 30,
    opacity: 0,
    duration: 1.0,
    ease: "power3.out",
    delay: 0.7,
  });
  /* avatar fades in without transform to avoid an edge-blend seam flash */
  const avatar = hero.querySelector(".hero-avatar");
  gsap.from(avatar, { opacity: 0, duration: 1.0, ease: "power3.out", delay: 0.7 });
  gsap.to(avatar.querySelector("img"), {
    scale: 1.035,
    duration: 9,
    ease: "sine.inOut",
    yoyo: true,
    repeat: -1,
  });
  const glow = hero.querySelector(".hero-glow");
  if (glow) {
    gsap.fromTo(glow, { opacity: 0.5 }, {
      opacity: 1,
      duration: 6,
      ease: "sine.inOut",
      yoyo: true,
      repeat: -1,
    });
  }

  const hint = hero.querySelector(".scroll-hint");
  const path = hero.querySelector(".hint-path");
  if (path && hint) {
    const len = path.getTotalLength();
    gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
    gsap
      .timeline({ delay: 1.2 })
      .to(path, { strokeDashoffset: 0, duration: 1.0, ease: "power2.out" })
      .to(hint, { y: 8, duration: 1, ease: "sine.inOut", repeat: -1, yoyo: true });
  }
}

/* ---------- scroll motion (entry, drift, separators) ---------- */
/* Section-to-section background morphing lives in shaders.js (single canvas). */
function initSectionMotion(sections) {
  if (reduced) return;

  sections.forEach((sec, i) => {
    const isHero = i === 0;
    const isContact = i === sections.length - 1;

    if (isHero) return;

    /* entry stagger (title is excluded — it gets its own char reveal) */
    const entryEls = isContact
      ? [sec.querySelector(".eyebrow"), sec.querySelector(".contact-email"), sec.querySelector(".socials")]
      : [
          sec.querySelector(".project-tagline"),
          sec.querySelector(".meta"),
          sec.querySelector(".explore"),
        ];
    const els = entryEls.filter(Boolean);
    if (els.length) {
      gsap.set(els, { y: 40, opacity: 0 });
      gsap.to(els, {
        y: 0,
        opacity: 1,
        duration: 1.0,
        ease: "power3.out",
        stagger: 0.08,
        scrollTrigger: { trigger: sec, start: "top 70%", toggleActions: "play none none reverse" },
        onComplete: () => remeasureMagnetic && remeasureMagnetic(),
      });
    }

    if (isContact) return;

    /* title char reveal on section enter */
    const titleChars = sec.querySelectorAll(".project-title .char");
    if (titleChars.length) {
      gsap.from(titleChars, {
        yPercent: 110,
        duration: 0.9,
        ease: "expo.out",
        stagger: 0.03,
        scrollTrigger: { trigger: sec, start: "top 70%", toggleActions: "play none none reverse" },
      });
    }

    /* subtle scrub parallax on the carousel wrapper (track is owned by hover) */
    const carousel = sec.querySelector(".carousel");
    if (carousel) {
      gsap.fromTo(carousel, { yPercent: 3.5 }, {
        yPercent: -3.5,
        ease: "none",
        scrollTrigger: { trigger: sec, start: "top bottom", end: "bottom top", scrub: true },
      });
    }

    /* horizontal-on-vertical drift: title one way, meta the other */
    const title = sec.querySelector(".project-title");
    const meta = sec.querySelector(".meta");
    if (title) {
      gsap.fromTo(title, { x: "6vw" }, {
        x: "-6vw",
        ease: "none",
        scrollTrigger: { trigger: sec, start: "top bottom", end: "bottom top", scrub: true },
      });
    }
    if (meta) {
      gsap.fromTo(meta, { x: "-3vw" }, {
        x: "3vw",
        ease: "none",
        scrollTrigger: { trigger: sec, start: "top bottom", end: "bottom top", scrub: true },
      });
    }

    /* diagonal separator draw-in */
    const sep = sec.querySelector(".separator");
    if (sep) {
      gsap.set(sep, { scaleX: 0, rotation: -4, transformOrigin: "left center" });
      gsap.to(sep, {
        scaleX: 1,
        duration: 1.2,
        ease: "expo.out",
        scrollTrigger: { trigger: sec, start: "top 40%", toggleActions: "play none none reverse" },
      });
    }
  });
}

/* ---------- section snap (desktop, fine pointer only) ---------- */
const expoOut = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

/* Returns shared state so programmatic scrolls (progress dots) can suppress
   the snap while they run. Every Lenis scroll event resets a 140ms settle
   timer; when it fires with no user input in the last 150ms, snap to the
   nearest section top (sections are 100vh, so it is always <= 50vh away). */
function initSnap(lenis, sections) {
  const state = {
    snapping: false,
    since: 0,
    lock() {
      this.snapping = true;
      this.since = performance.now();
    },
  };
  let timer = null;
  let lastInput = 0;

  const onInput = () => {
    lastInput = performance.now();
    clearTimeout(timer);
    timer = null;
    state.snapping = false;
  };
  window.addEventListener("wheel", onInput, { passive: true });
  window.addEventListener("touchstart", onInput, { passive: true });
  window.addEventListener("keydown", onInput, { passive: true });

  lenis.on("scroll", () => {
    if (state.snapping) {
      /* recover from a snap animation that was interrupted without
         onComplete ever firing (e.g. superseded scrollTo, hidden tab) */
      if (performance.now() - state.since < 2500) return;
      state.snapping = false;
    }
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (state.snapping || performance.now() - lastInput < 150) return;
      const y = window.scrollY;
      let best = null;
      let bestDist = Infinity;
      for (const s of sections) {
        const top = s.getBoundingClientRect().top + y;
        const d = Math.abs(top - y);
        if (d < bestDist) {
          bestDist = d;
          best = top;
        }
      }
      if (best === null || bestDist < 2) return;
      state.lock();
      lenis.scrollTo(best, {
        duration: 0.9,
        easing: expoOut,
        lock: false,
        onComplete: () => (state.snapping = false),
      });
    }, 140);
  });

  return state;
}

/* ---------- section progress dots (desktop only) ---------- */
function initDots(lenis, sections, names, snapState) {
  const nav = el("nav", "progress-dots");
  nav.setAttribute("aria-label", "Sections");
  const btns = sections.map((sec, i) => {
    const b = el("button", i === 0 ? "is-active" : "");
    b.type = "button";
    b.setAttribute("aria-label", `Section ${i + 1}: ${names[i]}`);
    b.addEventListener("click", () => {
      const top = sec.getBoundingClientRect().top + window.scrollY;
      if (snapState) snapState.lock();
      lenis.scrollTo(top, {
        duration: 1.1,
        easing: expoOut,
        lock: false,
        onComplete: () => {
          if (snapState) snapState.snapping = false;
        },
      });
    });
    nav.appendChild(b);
    return b;
  });
  document.body.appendChild(nav);

  let active = 0;
  lenis.on("scroll", () => {
    const i = clamp(Math.round(window.scrollY / window.innerHeight), 0, sections.length - 1);
    if (i === active) return;
    btns[active].classList.remove("is-active");
    btns[i].classList.add("is-active");
    active = i;
  });
}

/* ---------- magnetic elements (desktop only) ---------- */
/* Element centers are cached (recomputed on resize / ScrollTrigger refresh /
   entry-animation completion) and all work is coalesced into one gsap.ticker
   callback — no getBoundingClientRect or tween spawning per mousemove event. */
let remeasureMagnetic = null;

function initMagnetic() {
  if (!finePointer || reduced) return;
  const items = [...document.querySelectorAll(".magnetic")].map((node) => {
    const inner = node.querySelector(".magnetic-inner");
    return {
      el: node,
      strength: parseFloat(node.dataset.strength || "0.35"),
      active: false,
      fixed: getComputedStyle(node).position === "fixed",
      cx: 0,
      cy: 0,
      radius: 0,
      qx: gsap.quickTo(node, "x", { duration: 0.4, ease: "power3.out" }),
      qy: gsap.quickTo(node, "y", { duration: 0.4, ease: "power3.out" }),
      inner,
      ix: inner ? gsap.quickTo(inner, "x", { duration: 0.4, ease: "power3.out" }) : null,
      iy: inner ? gsap.quickTo(inner, "y", { duration: 0.4, ease: "power3.out" }) : null,
    };
  });

  function measure() {
    const sx = window.scrollX;
    const sy = window.scrollY;
    for (const it of items) {
      const r = it.el.getBoundingClientRect();
      const tx = Number(gsap.getProperty(it.el, "x")) || 0;
      const ty = Number(gsap.getProperty(it.el, "y")) || 0;
      it.cx = r.left + r.width / 2 - tx + (it.fixed ? 0 : sx);
      it.cy = r.top + r.height / 2 - ty + (it.fixed ? 0 : sy);
      it.radius = Math.max(r.width, r.height) / 2 + 90;
    }
  }
  measure();
  remeasureMagnetic = measure;
  ScrollTrigger.addEventListener("refresh", measure);
  let resizeTimer = 0;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(measure, 180);
  });

  let mx = -1e5;
  let my = -1e5;
  let dirty = false;
  window.addEventListener("mousemove", (e) => {
    mx = e.clientX;
    my = e.clientY;
    dirty = true;
  }, { passive: true });

  gsap.ticker.add(() => {
    if (!dirty) return;
    dirty = false;
    const sx = window.scrollX;
    const sy = window.scrollY;
    for (const it of items) {
      const dx = mx - (it.fixed ? it.cx : it.cx - sx);
      const dy = my - (it.fixed ? it.cy : it.cy - sy);
      if (Math.hypot(dx, dy) < it.radius) {
        it.active = true;
        it.qx(clamp(dx * it.strength, -24, 24));
        it.qy(clamp(dy * it.strength, -24, 24));
        if (it.ix) {
          it.ix(dx * 0.15);
          it.iy(dy * 0.15);
        }
      } else if (it.active) {
        it.active = false;
        gsap.to(it.el, { x: 0, y: 0, duration: 0.7, ease: "elastic.out(1, 0.45)", overwrite: "auto" });
        if (it.inner) {
          gsap.to(it.inner, { x: 0, y: 0, duration: 0.7, ease: "elastic.out(1, 0.45)", overwrite: "auto" });
        }
      }
    }
  });
}

/* ---------- boot ---------- */
async function boot() {
  if (!useShaders) document.documentElement.classList.add("static-bg");

  initHero();

  /* load + render project sections */
  let projects = [];
  try {
    const res = await fetch("projects.md");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    projects = parseProjects(await res.text());
  } catch (err) {
    console.warn("Could not load projects.md — rendering hero and contact only.", err);
  }

  const root = document.getElementById("projects-root");
  projects.forEach((p, i) => root.appendChild(buildProjectSection(p, i)));

  /* section numbering: hero = 01, contact = last */
  const sections = [...document.querySelectorAll(".section")];
  const total = sections.length;
  sections.forEach((sec, i) => {
    const num = sec.querySelector(".section-num");
    if (num) num.textContent = `${pad2(i + 1)} / ${pad2(total)}`;
  });

  /* smooth scroll */
  let lenis = null;
  if (!reduced) {
    lenis = new Lenis();
    window.__lenis = lenis;
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    if (snapEnabled) {
      const snapState = initSnap(lenis, sections);
      const names = ["Intro", ...projects.map((p) => p.name), "Contact"];
      initDots(lenis, sections, names, snapState);
    }
  }

  initSectionMotion(sections);
  initMagnetic();
  ScrollTrigger.refresh();

  /* shaders (desktop, motion allowed only) — one shared canvas */
  if (useShaders) {
    try {
      const { initShaders } = await import("./shaders.js?v=22");
      const entries = sections.map((sec, i) => ({
        el: sec,
        preset:
          i === 0
            ? PRESETS.hero
            : i === sections.length - 1
              ? PRESETS.contact
              : PRESETS.projects[(i - 1) % PRESETS.projects.length],
      }));
      if (!initShaders(entries)) document.documentElement.classList.add("static-bg");
    } catch (err) {
      console.warn("Shaders failed to start, falling back to static backgrounds.", err);
      document.documentElement.classList.add("static-bg");
    }
  }
}

boot();
