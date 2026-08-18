/* Motion for Gzowo Labs. Three jobs: the assembly sequence, the hero reveal,
   and the rail — which is not decoration, it reports which project you are on. */

const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
const hasGsap = typeof window.gsap !== "undefined";

if (hasGsap) {
  gsap.registerPlugin(ScrollTrigger);
  gsap.defaults({ ease: "power3.out" });
}

/* ---- Smooth scroll, handed to ScrollTrigger so both read one clock ---- */

let lenis = null;

function initScroll() {
  if (!hasGsap || reduce.matches || typeof Lenis === "undefined") return;
  if (window.matchMedia("(pointer: coarse)").matches) return; // native scroll wins on phones

  lenis = new Lenis({ duration: 1.05, smoothWheel: true });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  // Anchor jumps bypass Lenis' own events, which leaves every ScrollTrigger
  // reading a stale position — the rail would freeze after one click.
  window.addEventListener("scroll", ScrollTrigger.update, { passive: true });
}

function initAnchors() {
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      const target = document.querySelector(link.getAttribute("href"));
      if (!target || !lenis) return;
      event.preventDefault();
      lenis.scrollTo(target, { offset: -20 });
    });
  });
}

/* ---- Fit the wordmark: both words measured and scaled to one width, so
   changing the type changes the texture of the name, never its footprint. ---- */

function fitWords() {
  const heading = document.querySelector(".hero h1");
  if (!heading) return;
  const words = Array.from(heading.querySelectorAll(".word > i"));
  if (!words.length) return;

  const column = heading.clientWidth;
  if (!column) return;

  // Converging fit. A single ratio is not enough: the first measurement often
  // happens on the fallback face, and Anybody is a variable font whose rendered
  // width does not track font-size perfectly. Each pass corrects the last.
  function fitTo(target) {
    words.forEach((word) => { word.style.fontSize = ""; });
    for (let pass = 0; pass < 4; pass++) {
      let worst = 0;
      words.forEach((word) => {
        const natural = word.getBoundingClientRect().width;
        if (!natural) return;
        const current = parseFloat(getComputedStyle(word).fontSize);
        const ratio = target / natural;
        worst = Math.max(worst, Math.abs(1 - ratio));
        word.style.fontSize = `${current * ratio}px`;
      });
      if (worst < 0.005) break;
    }
  }

  // Height budget: filling the column can crowd out the rest of the hero, so the
  // block narrows and re-fits — both words stay equal at every size.
  const budget = window.innerHeight * 0.46;
  let target = column * 0.995;
  for (let pass = 0; pass < 3; pass++) {
    fitTo(target);
    const height = heading.getBoundingClientRect().height;
    if (height <= budget) break;
    target *= budget / height;
  }
}

/* ---- Assembly sequence: once per session, then it gets out of the way ---- */

function revealHero() {
  const root = document.documentElement;
  root.classList.add("is-ready");

  // Release the clipping frame as soon as the last word lands.
  const words = document.querySelectorAll(".word > i");
  const last = words[words.length - 1];
  if (last) last.addEventListener("animationend", () => root.classList.add("is-done"), { once: true });
  setTimeout(() => root.classList.add("is-done"), 1600);
}

function initLoader() {
  const loader = document.querySelector(".loader");
  if (!loader) { revealHero(); return; }

  const seen = sessionStorage.getItem("gzowo-labs-assembled");
  if (seen || reduce.matches || !hasGsap) {
    loader.hidden = true;
    revealHero();
    return;
  }

  document.body.style.overflow = "hidden";
  const count = loader.querySelector(".loader-count");
  const readout = { value: 0 };

  gsap.timeline({
    onComplete() {
      loader.hidden = true;
      document.body.style.overflow = "";
      sessionStorage.setItem("gzowo-labs-assembled", "1");
    },
  })
    .to(".loader-fill", { scaleX: 1, duration: 0.8, ease: "power2.inOut" })
    .to(readout, {
      value: 100,
      duration: 0.8,
      ease: "power2.inOut",
      onUpdate() { count.textContent = String(Math.round(readout.value)).padStart(3, "0"); },
    }, 0)
    .to(loader, { yPercent: -100, duration: 0.6, ease: "power4.inOut" }, ">-0.05")
    .add(revealHero, "<0.1");
}

/* ---- The rail ---- */

function initRail() {
  const rail = document.querySelector(".rail");
  if (!rail || !hasGsap) return;

  const payload = rail.querySelector(".rail-payload");
  const track = rail.querySelector(".rail-track");
  const indexOut = rail.querySelector("[data-rail-index]");
  const statusOut = rail.querySelector("[data-rail-status]");
  const cards = gsap.utils.toArray(".card");
  if (!payload || !track) return;

  const horizontal = () => window.matchMedia("(max-width: 760px)").matches;

  function travel() {
    return horizontal()
      ? Math.max(0, track.clientWidth - payload.offsetWidth - 14)
      : Math.max(0, track.clientHeight - payload.offsetHeight - 16);
  }

  // The payload's position is the page's scroll progress, scrubbed 1:1.
  ScrollTrigger.create({
    start: 0,
    end: () => ScrollTrigger.maxScroll(window),
    onUpdate(self) {
      const distance = travel() * self.progress;
      gsap.set(payload, horizontal() ? { x: distance, y: 0 } : { y: distance, x: 0 });
    },
    invalidateOnRefresh: true,
  });

  // The readout names the project crossing the middle of the screen.
  if (indexOut && cards.length) {
    cards.forEach((card, i) => {
      ScrollTrigger.create({
        trigger: card,
        start: "top 60%",
        end: "bottom 40%",
        onToggle(self) {
          if (!self.isActive) return;
          indexOut.textContent = String(i + 1).padStart(2, "0");
          if (statusOut) statusOut.textContent = card.dataset.status || "live";
        },
      });
    });
  }
}

/* ---- Feed reveals ---- */

function initFeed() {
  if (!hasGsap || reduce.matches) return;

  gsap.from(".feed-head > *", {
    autoAlpha: 0,
    y: 26,
    duration: 0.6,
    stagger: 0.08,
    scrollTrigger: { trigger: ".feed-head", start: "top 85%", once: true },
  });

  ScrollTrigger.batch(".card", {
    start: "top 92%",
    once: true,
    onEnter(batch) {
      gsap.from(batch, {
        autoAlpha: 0,
        y: 40,
        duration: 0.65,
        stagger: 0.07,
        overwrite: true,
      });
    },
  });
}

/* ---- Project page ----
   Deliberately no ScrollTrigger here. A missed trigger on the home page costs an
   animation; on a project page it would leave the description invisible, which is
   worse than no motion at all. CSS runs it on load and cannot fail silently. */

function watchFit() {
  fitWords();
  let timer = 0;
  window.addEventListener("resize", () => {
    clearTimeout(timer);
    timer = setTimeout(fitWords, 120);
  }, { passive: true });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitWords);
}

// Images and webfonts change the page height after the triggers are measured;
// without a refresh a card can sit past its own start and never reveal.
if (hasGsap) window.addEventListener("load", () => ScrollTrigger.refresh());

initScroll();
initAnchors();
watchFit();
initLoader();
initRail();
initFeed();
