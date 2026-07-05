/* js/main.js — fetches and parses projects.md at runtime, builds one section
   per project, then wires Lenis + GSAP ScrollTrigger, section snap, carousels,
   magnetic buttons, WebAudio SFX and the OGL shader backgrounds.
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

/* ---------- SFX (WebAudio synth, muted by default) ---------- */
const sfx = {
  ctx: null,
  master: null,
  muted: true,
  lastTick: 0,
  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.12;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") this.ctx.resume();
  },
  tone({ type, f0, f1 = 0, glide = 0, decay, gain = 1, at = 0 }) {
    const t = this.ctx.currentTime + at;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t);
    if (f1) osc.frequency.exponentialRampToValueAtTime(f1, t + glide);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.001);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + decay + 0.05);
  },
  tick() {
    if (this.muted || !this.ctx) return;
    const now = performance.now();
    if (now - this.lastTick < 60) return;
    this.lastTick = now;
    this.tone({ type: "triangle", f0: 1800, f1: 1200, glide: 0.04, decay: 0.06, gain: 0.5 });
  },
  blip() {
    if (this.muted || !this.ctx) return;
    this.tone({ type: "sine", f0: 520, f1: 880, glide: 0.09, decay: 0.14, gain: 0.9 });
    this.tone({ type: "square", f0: 520, f1: 880, glide: 0.09, decay: 0.14, gain: 0.03 });
  },
  confirm() {
    if (!this.ctx) return;
    this.tone({ type: "sine", f0: 660, decay: 0.07, gain: 0.8, at: 0 });
    this.tone({ type: "sine", f0: 990, decay: 0.07, gain: 0.8, at: 0.11 });
  },
};

function initSFX() {
  const btn = document.getElementById("mute-toggle");
  btn.addEventListener("click", () => {
    sfx.muted = !sfx.muted;
    btn.classList.toggle("muted", sfx.muted);
    btn.setAttribute("aria-pressed", String(!sfx.muted));
    btn.setAttribute("aria-label", sfx.muted ? "Unmute sound effects" : "Mute sound effects");
    if (!sfx.muted) {
      sfx.ensure();
      sfx.confirm();
    }
  });
  document.addEventListener("mouseover", (e) => {
    if (e.target.closest("a, button")) sfx.tick();
  });
  document.addEventListener("click", (e) => {
    const t = e.target.closest("a, button");
    if (t && t.id !== "mute-toggle") sfx.blip();
  });
}

/* ---------- DOM helpers ---------- */
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/* ---------- carousel ---------- */
function buildCarousel(project) {
  const wrap = el("div", "carousel");
  wrap.setAttribute("role", "group");
  wrap.setAttribute("aria-roledescription", "carousel");
  wrap.setAttribute("aria-label", `${project.name} images`);
  const track = el("div", "carousel-track");
  wrap.appendChild(track);

  const ready = discoverImages(project.folder).then((srcs) => {
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
      let paused = false;
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
          if (!paused && !document.hidden) goTo((current + 1) % imgs.length);
        }, 4000);
      }
      wrap.addEventListener("mouseenter", () => (paused = true));
      wrap.addEventListener("mouseleave", () => (paused = false));
      wrap.addEventListener("focusin", () => (paused = true));
      wrap.addEventListener("focusout", () => (paused = false));
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

  wrap.ready = ready;
  return wrap;
}

/* ---------- project section builder ---------- */
function buildProjectSection(project, i) {
  const preset = PRESETS.projects[i % PRESETS.projects.length];
  const sec = el("section", "section project");
  sec.style.setProperty("--tint", preset.tint);

  const canvas = document.createElement("canvas");
  canvas.className = "shader-canvas";
  canvas.setAttribute("aria-hidden", "true");
  sec.appendChild(canvas);

  const num = el("span", "section-num");
  num.setAttribute("aria-hidden", "true");
  sec.appendChild(num);

  const grid = el("div", "project-grid" + (i % 2 === 0 ? " alt" : ""));
  const carousel = buildCarousel(project);
  grid.appendChild(carousel);

  const info = el("div", "project-info");
  info.appendChild(el("h2", "project-title", project.name));
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
    a.appendChild(el("span", "magnetic-inner", "Explore →"));
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

  const text = name.textContent.trim();
  name.setAttribute("aria-label", text);
  name.textContent = "";
  const words = text.split(/\s+/);
  words.forEach((word, wi) => {
    const w = el("span", "word");
    w.setAttribute("aria-hidden", "true");
    for (const ch of word) w.appendChild(el("span", "char", ch));
    name.appendChild(w);
    if (wi < words.length - 1) name.appendChild(document.createTextNode(" "));
  });

  gsap.from(name.querySelectorAll(".char"), {
    yPercent: 110,
    duration: 1.1,
    ease: "expo.out",
    stagger: 0.04,
    delay: 0.15,
  });
  gsap.from([hero.querySelector(".hero-tagline"), hero.querySelector(".avatar")], {
    y: 30,
    opacity: 0,
    duration: 1.0,
    ease: "power3.out",
    stagger: 0.1,
    delay: 0.7,
  });

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

/* ---------- scroll motion (entry, drift, separators, canvas fades) ---------- */
function initSectionMotion(sections) {
  if (reduced) return;

  sections.forEach((sec, i) => {
    const isHero = i === 0;
    const isContact = i === sections.length - 1;

    /* shader canvas crossfade between sections (the "wipe" feel) */
    if (useShaders) {
      const canvas = sec.querySelector(".shader-canvas");
      if (canvas) {
        if (isHero) {
          gsap.to(canvas, { opacity: 1, duration: 1.6, ease: "power2.out", delay: 0.2 });
        } else {
          gsap.fromTo(canvas, { opacity: 0 }, {
            opacity: 1,
            ease: "none",
            scrollTrigger: { trigger: sec, start: "top bottom", end: "top 70%", scrub: true },
          });
        }
        if (!isContact) {
          gsap.fromTo(canvas, { opacity: 1 }, {
            opacity: 0,
            ease: "none",
            immediateRender: false,
            scrollTrigger: { trigger: sec, start: "bottom 30%", end: "bottom top", scrub: true },
          });
        }
      }
    }

    if (isHero) return;

    /* entry stagger */
    const entryEls = isContact
      ? [sec.querySelector(".eyebrow"), sec.querySelector(".contact-email"), sec.querySelector(".socials")]
      : [
          sec.querySelector(".project-title"),
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
      });
    }

    if (isContact) return;

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
function initSnap(lenis, sections) {
  const expoOut = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));
  let timer = null;
  let snapping = false;

  const cancel = () => {
    clearTimeout(timer);
    timer = null;
    snapping = false;
  };
  window.addEventListener("wheel", cancel, { passive: true });
  window.addEventListener("touchstart", cancel, { passive: true });
  window.addEventListener("keydown", cancel, { passive: true });

  lenis.on("scroll", (l) => {
    if (snapping) return;
    clearTimeout(timer);
    if (Math.abs(l.velocity) < 0.1) {
      timer = setTimeout(() => {
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
        if (best === null || bestDist < 2 || bestDist > window.innerHeight * 0.6) return;
        snapping = true;
        lenis.scrollTo(best, {
          duration: 0.9,
          easing: expoOut,
          lock: false,
          onComplete: () => (snapping = false),
        });
      }, 120);
    }
  });
}

/* ---------- magnetic elements (desktop only) ---------- */
function initMagnetic() {
  if (!finePointer || reduced) return;
  const items = [...document.querySelectorAll(".magnetic")].map((node) => ({
    el: node,
    inner: node.querySelector(".magnetic-inner"),
    strength: parseFloat(node.dataset.strength || "0.35"),
    active: false,
  }));

  window.addEventListener("mousemove", (e) => {
    for (const it of items) {
      const r = it.el.getBoundingClientRect();
      const curX = Number(gsap.getProperty(it.el, "x")) || 0;
      const curY = Number(gsap.getProperty(it.el, "y")) || 0;
      const dx = e.clientX - (r.left + r.width / 2 - curX);
      const dy = e.clientY - (r.top + r.height / 2 - curY);
      const dist = Math.hypot(dx, dy);
      const radius = Math.max(r.width, r.height) / 2 + 90;
      if (dist < radius) {
        it.active = true;
        gsap.to(it.el, {
          x: clamp(dx * it.strength, -24, 24),
          y: clamp(dy * it.strength, -24, 24),
          duration: 0.4,
          ease: "power3.out",
          overwrite: "auto",
        });
        if (it.inner) {
          gsap.to(it.inner, { x: dx * 0.15, y: dy * 0.15, duration: 0.4, ease: "power3.out", overwrite: "auto" });
        }
      } else if (it.active) {
        it.active = false;
        gsap.to(it.el, { x: 0, y: 0, duration: 0.7, ease: "elastic.out(1, 0.45)", overwrite: "auto" });
        if (it.inner) {
          gsap.to(it.inner, { x: 0, y: 0, duration: 0.7, ease: "elastic.out(1, 0.45)", overwrite: "auto" });
        }
      }
    }
  }, { passive: true });
}

/* ---------- boot ---------- */
async function boot() {
  if (!useShaders) document.documentElement.classList.add("static-bg");

  initHero();
  initSFX();

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
  const carousels = [];
  projects.forEach((p, i) => {
    const sec = buildProjectSection(p, i);
    carousels.push(sec.querySelector(".carousel"));
    root.appendChild(sec);
  });

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
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    if (snapEnabled) initSnap(lenis, sections);
  }

  initSectionMotion(sections);
  initMagnetic();
  ScrollTrigger.refresh();

  /* shaders (desktop, motion allowed only) */
  if (useShaders) {
    try {
      const { initShaders } = await import("./shaders.js");
      const entries = sections
        .map((sec, i) => ({
          el: sec,
          canvas: sec.querySelector(".shader-canvas"),
          preset:
            i === 0
              ? PRESETS.hero
              : i === sections.length - 1
                ? PRESETS.contact
                : PRESETS.projects[(i - 1) % PRESETS.projects.length],
        }))
        .filter((e) => e.canvas);
      initShaders(entries);
    } catch (err) {
      console.warn("Shaders failed to start, falling back to static backgrounds.", err);
      document.documentElement.classList.add("static-bg");
    }
  }

  /* re-measure once all carousels resolved their images */
  Promise.all(carousels.map((c) => c.ready)).then(() => ScrollTrigger.refresh());
}

boot();
