/* The drafting field: a grid of ink dots that ripples where the cursor passes.
   Canvas 2D on purpose — this has to hold 60fps on an iPhone XR and a 2019 Intel Mac,
   and a few thousand fillRect calls do that where a shader pipeline would not. */

const canvas = document.getElementById("field");
if (canvas) {
  const ctx = canvas.getContext("2d", { alpha: true });
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  const coarse = window.matchMedia("(pointer: coarse)");

  const INK = "23, 19, 14";
  const ORANGE = "237, 84, 36";

  let spacing = 0;
  let cols = 0;
  let rows = 0;
  let width = 0;
  let height = 0;
  let dpr = 1;

  // Pointer is tracked as a spring target so the ripple keeps moving after the
  // cursor stops — the wave decays instead of freezing mid-air.
  const pointer = { x: -9999, y: -9999, active: false };
  const eased = { x: -9999, y: -9999 };

  let raf = 0;
  let running = false;
  let last = 0;
  let frameBudget = 1000 / 60;

  function measure() {
    const touch = coarse.matches;
    spacing = touch ? 34 : 28;
    dpr = Math.min(window.devicePixelRatio || 1, touch ? 1 : 1.5);
    frameBudget = 1000 / (touch ? 30 : 60);

    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    cols = Math.ceil(width / spacing) + 1;
    rows = Math.ceil(height / spacing) + 1;
  }

  function draw(now) {
    if (!running) return;
    raf = requestAnimationFrame(draw);
    if (now - last < frameBudget) return;
    last = now;

    // Critically damped follow — no overshoot, so the ripple never wobbles.
    if (pointer.active) {
      eased.x += (pointer.x - eased.x) * 0.14;
      eased.y += (pointer.y - eased.y) * 0.14;
    }

    const t = now * 0.001;
    const radius = 190;
    const radiusSq = radius * radius;

    ctx.clearRect(0, 0, width, height);

    for (let row = 0; row < rows; row++) {
      const y = row * spacing;
      for (let col = 0; col < cols; col++) {
        const x = col * spacing;

        // Ambient swell: a slow diagonal wave so the sheet breathes when idle.
        const ambient = Math.sin(x * 0.012 + y * 0.009 - t * 0.7) * 0.5 + 0.5;
        let size = 1.1 + ambient * 0.5;
        let alpha = 0.16 + ambient * 0.07;
        let colour = INK;

        if (pointer.active) {
          const dx = x - eased.x;
          const dy = y - eased.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < radiusSq) {
            const fall = 1 - Math.sqrt(distSq) / radius;
            const lift = fall * fall;
            size += lift * 3.4;
            alpha += lift * 0.55;
            if (lift > 0.45) colour = ORANGE;
          }
        }

        ctx.fillStyle = `rgba(${colour}, ${alpha})`;
        ctx.fillRect(x - size / 2, y - size / 2, size, size);
      }
    }
  }

  function start() {
    if (running) return;
    running = true;
    last = 0;
    raf = requestAnimationFrame(draw);
  }

  function stop() {
    running = false;
    cancelAnimationFrame(raf);
  }

  function paintStill() {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = `rgba(${INK}, 0.2)`;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        ctx.fillRect(col * spacing - 0.7, row * spacing - 0.7, 1.4, 1.4);
      }
    }
  }

  function apply() {
    measure();
    if (reduce.matches) {
      stop();
      paintStill();
    } else {
      start();
    }
  }

  window.addEventListener("pointermove", (event) => {
    if (event.pointerType === "touch") return;
    if (!pointer.active) {
      eased.x = event.clientX;
      eased.y = event.clientY;
    }
    pointer.active = true;
    pointer.x = event.clientX;
    pointer.y = event.clientY;
  }, { passive: true });

  window.addEventListener("pointerleave", () => { pointer.active = false; }, { passive: true });

  let resizeTimer = 0;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(apply, 160);
  }, { passive: true });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else if (!reduce.matches) start();
  });

  reduce.addEventListener("change", apply);
  apply();
}
