/* Two things that need a server, both on one Realtime Database and both spoken
   to over plain REST — no Firebase SDK, so the page stays dependency-free:

   1. The visitor counter. A real, global one: read /hits, and bump it once per
      browser session. The rules only accept +1, so the number cannot be faked
      from the page.
   2. The graffiti wall. A hidden canvas anyone can draw on in black, and what
      they draw stays. The rules allow creating a stroke and nothing else — no
      edits, no deletions, no reading the root. Drawing is confined to the
      margins around the page frame: the frame is punched out of both the clip
      region and the input test, so nobody can scribble over the content and
      the links underneath keep working while the mode is on.

   Strokes are stored as "x,y,x,y,…" normalised against the document WIDTH for
   both axes, so a drawing keeps its proportions on a narrower screen even
   though the page below it reflows. */

(function () {
  var DB = "https://raft-e8d47-default-rtdb.firebaseio.com";
  var MAX_POINTS = 300;     // one stroke, before it is cut
  var MAX_STROKES = 600;    // newest kept on screen
  var calm = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------- visitor counter ---------------- */

  var counter = document.querySelector("[data-counter]");

  function paint(n) {
    if (!counter) return;
    counter.textContent = "";
    String(n).padStart(8, "0").split("").forEach(function (d) {
      var cell = document.createElement("span");
      cell.textContent = d;
      counter.appendChild(cell);
    });
  }

  if (counter) {
    // A visit only counts from the real site. Otherwise every local preview and
    // every rebuild would inflate a number whose whole point is being honest.
    var LOCAL = ["localhost", "127.0.0.1", "0.0.0.0", "[::1]"];
    var counted = LOCAL.indexOf(location.hostname) !== -1;
    try { counted = counted || sessionStorage.getItem("gl-counted") === "1"; } catch (e) {}

    var work = counted
      ? fetch(DB + "/hits.json").then(function (r) { return r.json(); })
      : fetch(DB + "/.json", {
          method: "PATCH",
          body: JSON.stringify({ hits: { ".sv": { increment: 1 } } }),
        })
          .then(function (r) { return r.json(); })
          .then(function (out) {
            try { sessionStorage.setItem("gl-counted", "1"); } catch (e) {}
            return out && out.hits;
          });

    work
      .then(function (n) { paint(typeof n === "number" ? n : 0); })
      .catch(function () { paint(0); });
  }

  /* ---------------- graffiti wall ---------------- */

  var canvas, ctx, strokes = [], live = null, on = false, bar = null;
  var current = null;

  function docWidth() {
    return document.documentElement.clientWidth;
  }

  // The page frame, in viewport pixels — the one area that stays paint-free.
  function frame() {
    var el = document.querySelector(".frame");
    return el ? el.getBoundingClientRect() : null;
  }

  // Margins narrower than this are not worth offering; on a phone the frame
  // fills the window and there is genuinely nowhere to draw.
  var MIN_MARGIN = 40;

  function margin() {
    var f = frame();
    if (!f) return window.innerWidth;
    return Math.min(f.left, window.innerWidth - f.right);
  }

  function inFrame(x, y) {
    var f = frame();
    return !!f && x >= f.left && x <= f.right && y >= f.top && y <= f.bottom;
  }

  function draw() {
    if (!ctx) return;
    var w = canvas.width / (window.devicePixelRatio || 1);
    var scale = docWidth();
    var top = window.scrollY;
    ctx.setTransform(window.devicePixelRatio || 1, 0, 0, window.devicePixelRatio || 1, 0, 0);
    ctx.clearRect(0, 0, w, canvas.height);
    ctx.strokeStyle = "#000";
    ctx.lineWidth = Math.max(2, scale * 0.004);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Punch the frame out of the drawable area with an even-odd clip, so a
    // stroke that strays over the page is simply not painted there.
    var f = frame();
    ctx.save();
    if (f) {
      ctx.beginPath();
      ctx.rect(0, 0, w, canvas.height);
      ctx.rect(f.left, f.top, f.width, f.height);
      ctx.clip("evenodd");
    }

    var all = current ? strokes.concat([current]) : strokes;
    all.forEach(function (pts) {
      if (pts.length < 4) return;
      ctx.beginPath();
      for (var i = 0; i < pts.length; i += 2) {
        var x = pts[i] * scale;
        var y = pts[i + 1] * scale - top;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    });
    ctx.restore();
  }

  function fit() {
    var ratio = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * ratio;
    canvas.height = window.innerHeight * ratio;
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
    draw();
  }

  function decode(value) {
    if (!value || typeof value.d !== "string") return null;
    var nums = value.d.split(",").map(parseFloat);
    return nums.some(isNaN) ? null : nums;
  }

  function mount() {
    canvas = document.createElement("canvas");
    canvas.className = "wall-canvas";
    document.body.appendChild(canvas);
    ctx = canvas.getContext("2d");
    fit();

    addEventListener("resize", fit);
    var queued = false;
    addEventListener("scroll", function () {
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () { queued = false; draw(); });
    }, { passive: true });

    // Everything already on the wall, then a stream so a drawing made on
    // another screen shows up here without a reload.
    fetch(DB + '/wall.json?orderBy="$key"&limitToLast=' + MAX_STROKES)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        Object.keys(data || {}).forEach(function (k) {
          var pts = decode(data[k]);
          if (pts) strokes.push(pts);
        });
        draw();
        listen();
      })
      .catch(listen);
  }

  function listen() {
    if (live || typeof EventSource === "undefined") return;
    live = new EventSource(DB + "/wall.json");
    live.addEventListener("put", function (e) {
      var msg = JSON.parse(e.data || "{}");
      if (msg.path === "/") return; // the initial snapshot, already drawn
      var pts = decode(msg.data);
      if (!pts) return;
      strokes.push(pts);
      if (strokes.length > MAX_STROKES) strokes.shift();
      draw();
    });
    live.onerror = function () { /* the wall is decoration; a dead stream is fine */ };
  }

  function send(pts) {
    var rounded = pts.map(function (n) { return Math.round(n * 1e4) / 1e4; });
    var d = rounded.join(",");
    if (d.length > 3000) d = d.slice(0, d.lastIndexOf(",", 3000));
    fetch(DB + "/wall.json", {
      method: "POST",
      body: JSON.stringify({ d: d, t: { ".sv": "timestamp" } }),
    }).catch(function () {});
  }

  /* ---- drawing mode ---- */

  function point(e) {
    var scale = docWidth();
    return [e.clientX / scale, (e.clientY + window.scrollY) / scale];
  }

  function down(e) {
    if (!on || e.button === 2) return;
    if (inFrame(e.clientX, e.clientY)) return; // the page itself is off limits
    e.preventDefault();
    current = point(e);
  }

  function move(e) {
    if (!on || !current) return;
    if (inFrame(e.clientX, e.clientY)) return; // skip, do not break the stroke
    var p = point(e);
    var n = current.length;
    // Skip micro-movements: fewer points, smaller payload, same line.
    if (Math.hypot(p[0] - current[n - 2], p[1] - current[n - 1]) < 0.002) return;
    if (current.length < MAX_POINTS * 2) current.push(p[0], p[1]);
    draw();
  }

  function up() {
    if (!current) return;
    if (current.length >= 4) { strokes.push(current); send(current); }
    current = null;
    draw();
  }

  function toggle(state) {
    on = state;
    console.info("[wall] graffiti mode " + (on ? "ON — draw anywhere" : "off"));
    document.documentElement.classList.toggle("wall-on", on);
    if (on && !bar) {
      bar = document.createElement("div");
      bar.className = "wall-bar";
      bar.innerHTML =
        '<b>&#9998; GRAFFITI MODE</b> &mdash; draw in the <b>margins</b> beside the page; the page itself is ' +
        'off limits. Whatever you draw stays here <b>forever</b>, and everyone who visits sees it. ' +
        '<button type="button">DONE</button>';
      bar.querySelector("button").addEventListener("click", function () { toggle(false); });
      document.body.appendChild(bar);
    }
    if (bar) bar.style.display = on ? "" : "none";

    // A flash at the top, because the toolbar sits at the bottom of a long page
    // and turning the mode on has to be unmissable.
    if (on) {
      var roomy = margin() >= MIN_MARGIN;
      var flash = document.createElement("div");
      flash.className = "wall-flash";
      flash.textContent = roomy
        ? "GRAFFITI MODE ON — DRAW IN THE MARGINS"
        : "NO ROOM TO DRAW — WIDEN THE WINDOW";
      document.body.appendChild(flash);
      setTimeout(function () { flash.remove(); }, 2600);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  /* Two ways in: the Konami code for the people who try it, and the "secret"
     hint in the sidebar for everyone else — a keyboard-only trigger is
     unreachable on a phone and needs the page to already hold focus. */
  var hint = document.querySelector("[data-wall-hint]");
  if (hint) {
    hint.addEventListener("click", function (e) {
      e.preventDefault();
      toggle(!on);
    });
  }

  /* The way in: the Konami code, because of course it is. */
  var KONAMI = ["ArrowUp","ArrowUp","ArrowDown","ArrowDown","ArrowLeft","ArrowRight","ArrowLeft","ArrowRight","b","a"];
  var progress = 0;

  document.addEventListener("keydown", function (e) {
    var tag = (e.target && e.target.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA" || (e.target && e.target.isContentEditable)) return;
    var key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    progress = key === KONAMI[progress] ? progress + 1 : (key === KONAMI[0] ? 1 : 0);
    if (progress === KONAMI.length) { progress = 0; toggle(!on); }
    if (e.key === "Escape" && on) toggle(false);
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }

  function start() {
    mount();
    // On the window rather than the canvas: the canvas never takes pointer
    // events, so every link and button under it still works in graffiti mode.
    window.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    void calm;
  }
})();
