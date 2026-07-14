import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js";
import { gsap } from "https://cdn.jsdelivr.net/npm/gsap@3.12.5/index.js";
import { ScrollTrigger } from "https://cdn.jsdelivr.net/npm/gsap@3.12.5/ScrollTrigger.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  collection,
  doc,
  getFirestore,
  increment,
  onSnapshot,
  query,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import {
  safeProjectImageUrl,
  safeProjectUrl,
  toMillis,
} from "./project-utils.js?v=relay-2";

gsap.registerPlugin(ScrollTrigger);

const firebaseConfig = {
  apiKey: "AIzaSyC7g3qGlm2gvn9be3q_62uB8pENTfjYO8E",
  authDomain: "jerzysukiennik-hub.firebaseapp.com",
  projectId: "jerzysukiennik-hub",
  messagingSenderId: "224427251535",
  appId: "1:224427251535:web:48e701ac5e6c006a36573a",
};

const db = getFirestore(initializeApp(firebaseConfig));
const grid = document.querySelector("#project-grid");
const feed = document.querySelector(".project-feed");
const statePanel = document.querySelector("#project-state");
const projectCount = document.querySelector("#project-count");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

let projects = [];
let activeFilter = "All";
let activeSort = "initial";
let renderSequence = 0;
let hasRendered = false;

function orderedProjects() {
  const visible = projects.filter((project) => !project.hidden && (activeFilter === "All" || project.category === activeFilter));
  return visible.sort((a, b) => {
    const pinDelta = Number(Boolean(b.pinned)) - Number(Boolean(a.pinned));
    if (pinDelta) return pinDelta;
    if (activeSort === "popular") return (Number(b.clicks) || 0) - (Number(a.clicks) || 0) || (Number(a.order) || 0) - (Number(b.order) || 0);
    if (activeSort === "newest") return toMillis(b.createdAt, b.year) - toMillis(a.createdAt, a.year) || (Number(a.order) || 0) - (Number(b.order) || 0);
    return (Number(a.order) || 0) - (Number(b.order) || 0);
  });
}

export function refreshCard(link, project) {
  const projectUrl = safeProjectUrl(project.url);
  const imageUrl = safeProjectImageUrl(project.imageUrl);

  link.dataset.id = project.id;
  link.dataset.projectUrl = projectUrl;
  if (projectUrl) {
    link.href = projectUrl;
    link.removeAttribute("aria-disabled");
  } else {
    link.removeAttribute("href");
    link.setAttribute("aria-disabled", "true");
  }
  link.target = "_blank";
  link.rel = "noopener";
  link.setAttribute("aria-label", `Open ${project.name || "project"} in a new tab`);
  link.classList.toggle("is-pinned", Boolean(project.pinned));

  const imageWrap = document.createElement("div");
  imageWrap.className = "card-image";
  if (imageUrl) {
    const image = document.createElement("img");
    image.src = imageUrl;
    image.alt = `${project.name || "Project"} project preview`;
    image.loading = project.pinned ? "eager" : "lazy";
    image.decoding = "async";
    image.addEventListener("error", () => {
      image.remove();
      imageWrap.classList.add("image-failed");
      imageWrap.textContent = "Image unavailable";
    }, { once: true });
    imageWrap.append(image);
  } else {
    imageWrap.classList.add("image-failed");
    imageWrap.textContent = "Image unavailable";
  }

  const copy = document.createElement("div");
  copy.className = "card-copy";
  const heading = document.createElement("h3");
  heading.textContent = project.name || "Untitled project";
  const description = document.createElement("p");
  description.textContent = project.description || "No description available.";
  copy.append(heading, description);
  link.replaceChildren(imageWrap, copy);
  return link;
}

export function makeCard(project) {
  const link = document.createElement("a");
  link.className = "project-card";

  link.addEventListener("click", (event) => {
    const projectUrl = safeProjectUrl(link.dataset.projectUrl);
    const projectId = link.dataset.id;
    if (!projectUrl || !projectId) {
      event.preventDefault();
      return;
    }
    updateDoc(doc(db, "projects", projectId), { clicks: increment(1) }).catch(() => {});
  });
  return refreshCard(link, project);
}

function showState(kind, title, message) {
  statePanel.hidden = false;
  statePanel.classList.toggle("is-error", kind === "error");
  statePanel.querySelector("strong").textContent = title;
  statePanel.querySelector("p").textContent = message;
  statePanel.querySelector(".state-pulse").hidden = kind === "empty";
}

function installCardReveals(cards) {
  if (reduceMotion.matches) return;
  cards.forEach((card, index) => {
    gsap.fromTo(card,
      { autoAlpha: 0, y: 28 },
      {
        autoAlpha: 1,
        y: 0,
        duration: .42,
        delay: Math.min(index % 4, 3) * .045,
        ease: "power2.out",
        clearProps: "visibility,opacity,transform",
        scrollTrigger: {
          id: `card-reveal-${card.dataset.id}`,
          trigger: card,
          start: "top 92%",
          once: true,
        },
      });
  });
}

function commitCards(next, previousRects, sequence) {
  if (sequence !== renderSequence) return;
  const oldCards = new Map([...grid.children].map((card) => [card.dataset.id, card]));
  const fragment = document.createDocumentFragment();
  next.forEach((project) => {
    const existingCard = oldCards.get(project.id);
    const card = existingCard ? refreshCard(existingCard, project) : makeCard(project);
    fragment.append(card);
  });
  grid.replaceChildren(fragment);
  projectCount.textContent = String(next.length).padStart(2, "0");
  feed.setAttribute("aria-busy", "false");

  if (!next.length) {
    showState("empty", "No projects on this channel", "Choose another filter to continue.");
    return;
  }
  statePanel.hidden = true;

  if (reduceMotion.matches || !previousRects.size) {
    if (!hasRendered) installCardReveals([...grid.children]);
    hasRendered = true;
    ScrollTrigger.refresh();
    return;
  }

  [...grid.children].forEach((card) => {
    const before = previousRects.get(card.dataset.id);
    if (!before) {
      gsap.fromTo(card, { autoAlpha: 0, scale: .96 }, { autoAlpha: 1, scale: 1, duration: .34, ease: "power2.out", clearProps: "visibility,opacity,transform" });
      return;
    }
    const after = card.getBoundingClientRect();
    gsap.fromTo(card,
      { x: before.left - after.left, y: before.top - after.top },
      { x: 0, y: 0, duration: .5, ease: "power3.inOut", clearProps: "transform", overwrite: true });
  });
  ScrollTrigger.refresh();
}

function renderProjects({ animate = true } = {}) {
  const sequence = ++renderSequence;
  const next = orderedProjects();
  const existing = [...grid.children];
  const previousRects = new Map(existing.map((card) => [card.dataset.id, card.getBoundingClientRect()]));
  const nextIds = new Set(next.map((project) => project.id));
  const outgoing = existing.filter((card) => !nextIds.has(card.dataset.id));

  if (animate && outgoing.length && !reduceMotion.matches) {
    gsap.to(outgoing, {
      autoAlpha: 0,
      y: 14,
      duration: .16,
      ease: "power1.in",
      stagger: .025,
      onComplete: () => commitCards(next, previousRects, sequence),
    });
  } else {
    commitCards(next, previousRects, sequence);
  }
}

document.querySelector("#filters").addEventListener("click", (event) => {
  const button = event.target.closest("[data-filter]");
  if (!button || button.dataset.filter === activeFilter) return;
  activeFilter = button.dataset.filter;
  document.querySelectorAll("[data-filter]").forEach((item) => {
    const active = item === button;
    item.classList.toggle("is-active", active);
    item.setAttribute("aria-pressed", String(active));
  });
  renderProjects();
});

document.querySelector("#sorts").addEventListener("click", (event) => {
  const button = event.target.closest("[data-sort]");
  if (!button) return;
  activeSort = button.dataset.sort;
  document.querySelectorAll("[data-sort]").forEach((item) => {
    const active = item === button;
    item.classList.toggle("is-active", active);
    item.setAttribute("aria-pressed", String(active));
  });
  renderProjects();
});

onSnapshot(query(collection(db, "projects")), (snapshot) => {
  projects = snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }));
  if (!projects.some((project) => !project.hidden)) {
    grid.replaceChildren();
    projectCount.textContent = "00";
    feed.setAttribute("aria-busy", "false");
    showState("empty", "No projects transmitted", "The live collection is currently empty.");
    return;
  }
  renderProjects({ animate: hasRendered });
}, (error) => {
  console.error("Firestore project feed failed:", error);
  grid.replaceChildren();
  projectCount.textContent = "ERR";
  feed.setAttribute("aria-busy", "false");
  showState("error", "Project relay offline", "The live Firestore feed could not be loaded. Refresh to try again.");
});

function initMotion() {
  const media = gsap.matchMedia();
  media.add({
    desktop: "(min-width: 761px)",
    mobile: "(max-width: 760px)",
    reduce: "(prefers-reduced-motion: reduce)",
  }, (context) => {
    const { desktop, reduce } = context.conditions;
    if (reduce) {
      gsap.set(".hero-enter", { autoAlpha: 1, x: 0, y: 0 });
      return;
    }

    gsap.timeline({ defaults: { ease: "power3.out" } })
      .fromTo(".hero-copy .hero-enter", { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: .4, stagger: .055 })
      .fromTo(".launch-rail", { autoAlpha: 0, x: desktop ? 22 : 0, y: desktop ? 0 : 12 }, { autoAlpha: 1, x: 0, y: 0, duration: .28 }, "<.12");

    gsap.to(".payload", {
      [desktop ? "y" : "x"]: desktop ? "68vh" : "72vw",
      ease: "none",
      scrollTrigger: {
        trigger: ".hero",
        start: "top top",
        end: "bottom top",
        scrub: .25,
        onUpdate: (self) => {
          document.querySelector("#hero-progress").textContent = String(Math.round(self.progress * 100)).padStart(3, "0");
        },
      },
    });

    gsap.to(".board-payload", {
      [desktop ? "y" : "x"]: () => desktop
        ? Math.max(0, document.querySelector(".board-rail-track").clientHeight - 58)
        : Math.max(0, document.querySelector(".board-rail-track").clientWidth - 48),
      ease: "none",
      scrollTrigger: {
        trigger: ".work-layout",
        start: "top 72%",
        end: "bottom 30%",
        scrub: .35,
        invalidateOnRefresh: true,
      },
    });

    gsap.fromTo(".board-head > *", { autoAlpha: 0, y: 32 }, {
      autoAlpha: 1,
      y: 0,
      duration: .5,
      stagger: .08,
      ease: "power2.out",
      scrollTrigger: { trigger: ".board-head", start: "top 86%", once: true },
    });
  });
}

function initDraftingField() {
  const canvas = document.querySelector("#drafting-field");
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const lowPower = coarse || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) || (navigator.deviceMemory && navigator.deviceMemory <= 4);
  const fps = lowPower ? 30 : 60;
  const frameInterval = 1000 / fps;
  let renderer;

  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, depth: false, stencil: false, powerPreference: "low-power" });
  } catch (error) {
    console.warn("WebGL background unavailable:", error);
    document.documentElement.classList.add("no-webgl");
    return;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse ? 1 : 1.25) * (lowPower ? .58 : .7));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  const scene = new THREE.Scene();
  const camera = new THREE.Camera();
  const geometry = new THREE.PlaneGeometry(2, 2);
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthTest: false,
    uniforms: {
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    },
    vertexShader: `
      void main() {
        gl_Position = vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      precision mediump float;
      uniform float uTime;
      uniform vec2 uResolution;

      void main() {
        vec2 uv = gl_FragCoord.xy / uResolution.xy;
        vec2 gridUv = uv * vec2(uResolution.x / uResolution.y, 1.0) * 18.0;
        vec2 lineDistance = min(fract(gridUv), 1.0 - fract(gridUv));
        float grid = 1.0 - step(0.035, min(lineDistance.x, lineDistance.y));
        float wideLine = 1.0 - step(0.018, min(abs(fract(gridUv.x * 0.2) - 0.5), abs(fract(gridUv.y * 0.2) - 0.5)));
        float bandA = step(0.53, fract(uv.y * 7.0 - uTime * 0.055));
        float bandB = step(0.72, fract(uv.x * 3.0 + uTime * 0.025));
        float oneBit = abs(bandA - bandB);
        vec3 ink = vec3(0.09, 0.075, 0.055);
        float alpha = grid * 0.24 + wideLine * 0.12 + oneBit * 0.035;
        gl_FragColor = vec4(ink, alpha);
      }
    `,
  });
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  let raf = 0;
  let running = true;
  let lastDraw = 0;
  let previousFrame = performance.now();
  let sampledFrames = 0;
  let sampledTime = 0;
  let fallbackStatic = false;

  function draw(now) {
    if (!running) return;
    raf = requestAnimationFrame(draw);
    const frameTime = now - previousFrame;
    previousFrame = now;
    if (sampledFrames < 36) {
      sampledFrames += 1;
      sampledTime += Math.min(frameTime, 100);
      if (sampledFrames === 36 && sampledTime / sampledFrames > (lowPower ? 45 : 28)) {
        fallbackStatic = true;
        document.documentElement.classList.add("webgl-static");
      }
    }
    if (now - lastDraw < frameInterval) return;
    lastDraw = now;
    material.uniforms.uTime.value = now * .001;
    renderer.render(scene, camera);
    if (fallbackStatic || reduceMotion.matches) {
      running = false;
      cancelAnimationFrame(raf);
    }
  }

  function resize() {
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    material.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
    renderer.render(scene, camera);
  }
  let resizeTimer = 0;
  window.addEventListener("resize", () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(resize, 160);
  }, { passive: true });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      running = false;
      cancelAnimationFrame(raf);
    } else if (!fallbackStatic && !reduceMotion.matches && !running) {
      running = true;
      previousFrame = performance.now();
      raf = requestAnimationFrame(draw);
    }
  });

  renderer.render(scene, camera);
  if (!reduceMotion.matches) raf = requestAnimationFrame(draw);
}

initMotion();
initDraftingField();
