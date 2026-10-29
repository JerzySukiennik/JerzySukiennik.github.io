/* Gzowo Labs: the real visitor counter and the brick wall in the page margins (spray paint only).
   Both talk plain REST to one Realtime Database, no SDK. Localhost paints on /bricksDev. */

(function () {
  var DB = "https://raft-e8d47-default-rtdb.firebaseio.com";
  var LOCAL = ["localhost", "127.0.0.1", "0.0.0.0", "[::1]"];

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

  var WIDE = window.matchMedia("(min-width:1280px)");
  var DEV = LOCAL.indexOf(location.hostname) !== -1 || location.protocol === "file:";
  var PATH = DEV ? "bricksDev" : "bricks";
  var MAX_ITEMS = 1000;
  var QUERY = '.json?orderBy="$key"&limitToLast=' + MAX_ITEMS;
  var MAX_POINTS = 150;
  var MAX_POSTS = 300;

  var HUES = [
    ["red", "#ffb8b8", "#fb6a6a", "#ff0000", "#8e0b0b"],
    ["orange", "#ffd5b8", "#fba66a", "#ff6a00", "#8e420b"],
    ["gold", "#ffebb8", "#fbd26a", "#ffb700", "#8e690b"],
    ["yellow", "#fffbb8", "#fbf46a", "#fff200", "#8e870b"],
    ["lime", "#deffb8", "#b7fb6a", "#88ff00", "#518e0b"],
    ["green", "#b8ffc9", "#6afb8e", "#00ff40", "#0b8e2c"],
    ["teal", "#b8fff3", "#6afbe3", "#00ffd4", "#0b8e78"],
    ["cyan", "#b8f1ff", "#6adefb", "#00ccff", "#0b748e"],
    ["blue", "#b8cfff", "#6a9afb", "#0055ff", "#0b378e"],
    ["indigo", "#c1b8ff", "#7d6afb", "#2200ff", "#1d0b8e"],
    ["purple", "#e7b8ff", "#cb6afb", "#aa00ff", "#620b8e"],
    ["pink", "#ffb8e5", "#fb6ac6", "#ff00a1", "#8e0b5e"],
  ];
  var SHADES = ["pale ", "light ", "", "dark "];
  var NEUTRALS = [
    ["#ffffff", "white"], ["#d4d4d4", "light gray"], ["#a8a8a8", "gray"], ["#7c7c7c", "mid gray"],
    ["#505050", "dark gray"], ["#262626", "charcoal"], ["#000000", "black"], ["#ffe0c4", "peach"],
    ["#f0b98d", "tan"], ["#c98a5b", "caramel"], ["#8a5a36", "brown"], ["#4f3220", "dark brown"],
  ];
  var SIZES = [0.01, 0.02, 0.04, 0.07, 0.12];
  var DOTS = [3, 5, 8, 11, 15];
  var RAINBOW = ["#ff2d2d", "#ff8a00", "#ffe600", "#38e03b", "#00e5ff", "#2f6bff", "#b14bff"];
  var BAD = /(kurw|chuj|huj|pierdol|spierdal|wypierd|zajeb|jebac|jebi|jeban|jebn|pizd|fuck|shit|bitch|nigg|fagg|cunt|porn|hitler|nazi|cwel|kutas|szmat|dziwk)/;
  var LEET = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s", "!": "i" };

  var canvas, ctx, base, bctx, panel, tab, live = null, drawing = false;
  var items = [], byId = {}, pending = [], started = false, dirty = true, raf = 0;
  var color = "#ff0000", size = 2, cols = 0;
  var rainbow = false, posted = 0, flashTimer = 0, opened = false, dismissed = false;

  try { rainbow = localStorage.getItem("gl-rainbow") === "1"; } catch (e) {}

  function clean(s) {
    var t = String(s).toLowerCase().replace(/ł/g, "l").normalize("NFD").replace(/[̀-ͯ]/g, "");
    t = t.replace(/[0134578@$!]/g, function (c) { return LEET[c]; });
    return t.replace(/[^a-z]/g, "");
  }

  window.glBad = function (s) { return BAD.test(clean(s)); };

  function frameRect() {
    var el = document.querySelector(".frame");
    return el ? el.getBoundingClientRect() : null;
  }

  function sideAt(x, f) {
    if (x < f.left) return "l";
    if (x > f.right + 8) return "r";
    return null;
  }

  function unit(f) { return f.left; }

  function screenX(side, u, f) {
    var d = u / 1000 * unit(f);
    return side === "l" ? f.left - d : f.right + d;
  }

  function flash(msg) {
    var el = document.querySelector(".wall-flash");
    if (!el) {
      el = document.createElement("div");
      el.className = "wall-flash";
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.display = "";
    clearTimeout(flashTimer);
    flashTimer = setTimeout(function () { el.style.display = "none"; }, 2600);
  }

  function schedule() {
    if (!raf) raf = requestAnimationFrame(draw);
  }

  function refresh() {
    dirty = true;
    schedule();
  }

  function fitCanvas() {
    var ratio = window.devicePixelRatio || 1;
    [canvas, base].forEach(function (c) {
      c.width = Math.round(window.innerWidth * ratio);
      c.height = Math.round(window.innerHeight * ratio);
    });
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
    refresh();
  }

  function drawStroke(c, it, f, top, H) {
    var pts = it.d;
    var lw = Math.max(1.5, it.w / 1000 * unit(f));
    if (it.y1 - top < -lw - 40 || it.y0 - top > H + lw + 40) return;
    c.lineCap = "round";
    c.lineJoin = "round";
    if (it.c !== "rainbow") {
      c.beginPath();
      for (var i = 0; i < pts.length; i += 2) {
        var x = screenX(it.a, pts[i], f), y = pts[i + 1] - top;
        if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
      }
      c.globalAlpha = 0.2;
      c.strokeStyle = it.c;
      c.lineWidth = lw * 1.9;
      c.stroke();
      c.globalAlpha = 1;
      c.lineWidth = lw;
      c.stroke();
      return;
    }
    for (var j = 2; j < pts.length; j += 2) {
      c.beginPath();
      c.moveTo(screenX(it.a, pts[j - 2], f), pts[j - 1] - top);
      c.lineTo(screenX(it.a, pts[j], f), pts[j + 1] - top);
      c.strokeStyle = "hsl(" + ((j * 9) % 360) + ",95%,55%)";
      c.lineWidth = lw;
      c.stroke();
    }
  }

  function clipMargins(c, f, W, H) {
    c.beginPath();
    c.rect(0, 0, Math.max(0, f.left - 2), H);
    c.rect(f.right + 8, 0, Math.max(0, W - f.right - 8), H);
    c.clip();
  }

  function draw() {
    raf = 0;
    if (!ctx || !WIDE.matches) return;
    var f = frameRect();
    if (!f) return;
    var ratio = window.devicePixelRatio || 1;
    var W = window.innerWidth, H = window.innerHeight, top = window.scrollY;
    if (dirty) {
      dirty = false;
      bctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      bctx.clearRect(0, 0, W, H);
      bctx.save();
      clipMargins(bctx, f, W, H);
      items.forEach(function (it) { drawStroke(bctx, it, f, top, H); });
      bctx.restore();
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(base, 0, 0);
    if (live && live.d.length) {
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.save();
      clipMargins(ctx, f, W, H);
      drawStroke(ctx, live.d.length === 2 ? { a: live.a, d: live.d.concat(live.d), c: live.c, w: live.w, y0: 0, y1: 1e9 } : live, f, top, H);
      ctx.restore();
    }
  }

  function parse(id, v) {
    if (!v || typeof v !== "object" || v.k !== "d" || (v.a !== "l" && v.a !== "r")) return null;
    if (typeof v.c !== "string" || !(v.c === "rainbow" || /^#[0-9a-f]{6}$/.test(v.c))) return null;
    if (typeof v.d !== "string" || !/^[0-9,]+$/.test(v.d)) return null;
    var pts = v.d.split(",").map(Number);
    if (pts.length < 2 || pts.length % 2) return null;
    if (pts.length === 2) pts = pts.concat(pts);
    var y0 = Infinity, y1 = -Infinity;
    for (var i = 1; i < pts.length; i += 2) { y0 = Math.min(y0, pts[i]); y1 = Math.max(y1, pts[i]); }
    return { id: id, a: v.a, d: pts, c: v.c, w: Math.max(5, Math.min(200, v.w || 40)), y0: y0, y1: y1 };
  }

  function sig(a, d) { return a + "|" + d; }

  function keep(it) {
    items.push(it);
    if (items.length > MAX_ITEMS) items.shift();
    countUp();
    refresh();
  }

  function add(id, v) {
    if (byId[id] || !v) return;
    byId[id] = true;
    var p = pending.indexOf(sig(v.a, v.d));
    if (p !== -1) { pending.splice(p, 1); return; }
    var it = parse(id, v);
    if (it) keep(it);
  }

  function countUp() {
    var el = panel && panel.querySelector("[data-sp-count]");
    if (el) el.textContent = items.length;
  }

  function onMessage(e) {
    var msg;
    try { msg = JSON.parse(e.data || "{}"); } catch (err) { return; }
    if (!msg || typeof msg.path !== "string") return;
    if (msg.path === "/") Object.keys(msg.data || {}).forEach(function (k) { add(k, msg.data[k]); });
    else if (msg.data) add(msg.path.slice(1), msg.data);
  }

  function listen() {
    if (typeof EventSource === "undefined") {
      fetch(DB + "/" + PATH + QUERY).then(function (r) { return r.json(); }).then(function (d) {
        Object.keys(d || {}).forEach(function (k) { add(k, d[k]); });
      }).catch(function () {});
      return;
    }
    var source = new EventSource(DB + "/" + PATH + QUERY);
    source.addEventListener("put", onMessage);
    source.onerror = function () {};
  }

  function unpend(key) {
    var p = pending.indexOf(key);
    if (p !== -1) pending.splice(p, 1);
  }

  function send(it) {
    var d = it.d.join(",");
    var key = sig(it.a, d);
    pending.push(key);
    posted++;
    fetch(DB + "/" + PATH + ".json", {
      method: "POST",
      body: JSON.stringify({ k: "d", a: it.a, c: it.c, d: d, w: it.w, t: { ".sv": "timestamp" } }),
    })
      .then(function (r) { return r.json(); })
      .then(function (out) {
        unpend(key);
        if (out && out.name) { byId[out.name] = true; it.id = out.name; }
      })
      .catch(function () { unpend(key); });
  }

  function pagePoint(side, x, y, f) {
    var u = side === "l" ? f.left - x : x - f.right;
    return [Math.round(Math.max(0, Math.min(1000, u / unit(f) * 1000))), Math.round(y + window.scrollY)];
  }

  function flushStroke(keepLast) {
    if (!live) return;
    var done = live;
    live = keepLast ? { a: done.a, d: done.d.slice(-2), c: done.c, w: done.w, y0: 0, y1: 1e9 } : null;
    if (done.d.length < 2) return;
    if (posted >= MAX_POSTS) { flash("THAT IS ENOUGH ART FOR ONE VISIT"); return; }
    if (done.d.length === 2) done.d = done.d.concat(done.d);
    var ys = done.d.filter(function (_, i) { return i % 2; });
    done.y0 = Math.min.apply(null, ys);
    done.y1 = Math.max.apply(null, ys);
    done.id = "local" + Math.random().toString(36).slice(2);
    keep(done);
    send(done);
  }

  function extend(e) {
    var f = frameRect();
    if (!f || !live) return;
    var p = pagePoint(live.a, e.clientX, e.clientY, f);
    var n = live.d.length;
    if (n && Math.hypot(p[0] - live.d[n - 2], p[1] - live.d[n - 1]) < 4) return;
    live.d.push(p[0], p[1]);
    if (live.d.length >= MAX_POINTS * 2) flushStroke(true);
    schedule();
  }

  function onWall(e) {
    return e.target === document.body || e.target === document.documentElement;
  }

  function down(e) {
    if (!WIDE.matches || e.button !== 0 || !onWall(e)) return;
    var f = frameRect();
    if (!f) return;
    var side = sideAt(e.clientX, f);
    if (!side) return;
    e.preventDefault();
    if (!dismissed && !isOpen()) showPanel(true);
    drawing = true;
    live = { a: side, d: [], c: color, w: Math.round(SIZES[size] * 1000), y0: 0, y1: 1e9 };
    extend(e);
  }

  function move(e) {
    if (!drawing) return;
    var list = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
    (list.length ? list : [e]).forEach(extend);
  }

  function up() {
    if (!drawing) return;
    drawing = false;
    flushStroke(false);
    schedule();
  }

  function setCursor() {
    var root = document.documentElement;
    var f = frameRect();
    var d = Math.round(Math.max(6, Math.min(56, f ? SIZES[size] * unit(f) : 8)));
    var s = d + 4, c = s / 2;
    var fill = color === "rainbow" ? "url(#r)" : color;
    var defs = color === "rainbow"
      ? '<defs><linearGradient id="r">' + RAINBOW.map(function (h, i) {
          return '<stop offset="' + (i / (RAINBOW.length - 1)) + '" stop-color="' + h + '"/>';
        }).join("") + "</linearGradient></defs>"
      : "";
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + s + '" height="' + s + '">' + defs +
      '<circle cx="' + c + '" cy="' + c + '" r="' + d / 2 + '" fill="' + fill + '" stroke="#000"/>' +
      '<circle cx="' + c + '" cy="' + c + '" r="' + (d / 2 + 1) + '" fill="none" stroke="#fff"/></svg>';
    root.classList.add("wall-spray");
    root.style.setProperty("--wall-cursor",
      'url("data:image/svg+xml,' + encodeURIComponent(svg) + '") ' + Math.round(c) + " " + Math.round(c) + ", crosshair");
  }

  function swatchBg(hex) {
    return hex === "rainbow" ? "linear-gradient(135deg," + RAINBOW.join(",") + ")" : hex;
  }

  function swatch(hex, name, extra) {
    return '<button type="button" class="sp-sw' + (extra || "") + '" data-color="' + hex + '" aria-label="' + name +
      '" title="' + name + '" style="background:' + swatchBg(hex) + '"></button>';
  }

  function palette(n) {
    var out = [];
    for (var b = 0; b < HUES.length; b += n) {
      for (var s = 0; s < SHADES.length; s++) {
        HUES.slice(b, b + n).forEach(function (h) { out.push(swatch(h[s + 1], SHADES[s] + h[0])); });
      }
    }
    NEUTRALS.forEach(function (c) { out.push(swatch(c[0], c[1])); });
    return out.join("");
  }

  function layoutColors() {
    if (!panel) return;
    var n = panel.offsetWidth >= 180 ? 12 : 6;
    if (n === cols) return;
    cols = n;
    var box = panel.querySelector("[data-sp-colors]");
    box.style.setProperty("--cols", n);
    box.innerHTML = palette(n);
    sync();
  }

  function sync() {
    if (!panel) return;
    panel.querySelectorAll("[data-color]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.color === color)); });
    panel.querySelectorAll("[data-size]").forEach(function (b) { b.setAttribute("aria-pressed", String(+b.dataset.size === size)); });
    panel.querySelector("[data-sp-cur]").style.background = swatchBg(color);
    setCursor();
  }

  function buildPanel() {
    panel = document.createElement("aside");
    panel.className = "spray-panel";
    panel.setAttribute("aria-label", "Brick wall spray paint");
    panel.innerHTML =
      '<div class="sp-title">&#9998; THE WALL<button type="button" class="sp-close" data-close aria-label="Hide the paint box" title="Hide">&times;</button></div>' +
      '<div class="sp-colors" data-sp-colors></div>' +
      '<div class="sp-pick">' +
        '<span class="sp-cur" data-sp-cur title="Your color"></span>' +
        '<label class="sp-more" title="Any color you like"><b>+ MORE</b><input type="color" data-custom value="#ff0000" aria-label="Pick any color"></label>' +
        swatch("rainbow", "rainbow", " sp-rainbow").replace("<button ", "<button hidden ") +
      "</div>" +
      '<div class="sp-sizes">' + DOTS.map(function (px, i) {
        return '<button type="button" class="sp-btn sp-size" data-size="' + i + '" aria-label="Brush ' + (i + 1) + '" title="Brush ' + (i + 1) +
          '"><i style="width:' + px + "px;height:" + px + 'px"></i></button>';
      }).join("") + "</div>" +
      '<p class="sp-note">Click and drag on the bricks to spray. It stays <b>forever</b>. <span class="sp-count"><b data-sp-count>0</b> strokes on the wall.</span></p>';
    document.body.appendChild(panel);

    panel.addEventListener("click", function (e) {
      var b = e.target.closest("button");
      if (!b) return;
      if (b.hasAttribute("data-close")) { closePanel(); return; }
      if (b.dataset.color) color = b.dataset.color;
      if (b.dataset.size) size = +b.dataset.size;
      sync();
    });
    panel.querySelector("[data-custom]").addEventListener("input", function (e) {
      color = e.target.value.toLowerCase();
      sync();
    });

    tab = document.createElement("button");
    tab.type = "button";
    tab.className = "sp-tab";
    tab.innerHTML = "&#9998; THE WALL";
    tab.setAttribute("aria-label", "Show the paint box");
    tab.hidden = true;
    tab.addEventListener("click", function () { showPanel(true); });
    document.body.appendChild(tab);

    panel.setAttribute("aria-hidden", "true");
    if (rainbow) unlockRainbow(false);
    layoutColors();
    sync();
    countUp();
  }

  function isOpen() {
    return !!panel && panel.classList.contains("is-open");
  }

  function showPanel(on) {
    if (!panel) return;
    panel.classList.toggle("is-open", on);
    panel.setAttribute("aria-hidden", String(!on));
    if (on) {
      opened = true;
      dismissed = false;
      panel.classList.remove("is-pulse");
      void panel.offsetWidth;
      panel.classList.add("is-pulse");
    }
    tab.hidden = on || !opened;
  }

  function closePanel() {
    dismissed = true;
    showPanel(false);
  }

  function unlockRainbow(announce) {
    rainbow = true;
    try { localStorage.setItem("gl-rainbow", "1"); } catch (e) {}
    if (!panel) return;
    panel.querySelector(".sp-rainbow").hidden = false;
    if (announce) {
      color = "rainbow";
      flash("SECRET COLOR UNLOCKED: RAINBOW");
    }
    sync();
  }

  function start() {
    if (started || !WIDE.matches) return;
    started = true;
    canvas = document.createElement("canvas");
    canvas.className = "wall-canvas";
    canvas.setAttribute("aria-hidden", "true");
    document.body.appendChild(canvas);
    ctx = canvas.getContext("2d");
    base = document.createElement("canvas");
    bctx = base.getContext("2d");
    fitCanvas();
    buildPanel();
    listen();

    window.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    window.addEventListener("resize", function () { fitCanvas(); layoutColors(); setCursor(); });
    window.addEventListener("scroll", refresh, { passive: true });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && isOpen()) closePanel(); });
  }

  var hint = document.querySelector("[data-wall-hint]");
  if (hint) {
    hint.addEventListener("click", function (e) {
      e.preventDefault();
      if (!WIDE.matches) return;
      start();
      window.scrollTo({ top: 0, behavior: "smooth" });
      showPanel(true);
    });
  }

  var KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
  var progress = 0;

  document.addEventListener("keydown", function (e) {
    var tag = (e.target && e.target.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA" || (e.target && e.target.isContentEditable)) return;
    var key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    progress = key === KONAMI[progress] ? progress + 1 : (key === KONAMI[0] ? 1 : 0);
    if (progress === KONAMI.length) {
      progress = 0;
      if (WIDE.matches) { start(); unlockRainbow(true); showPanel(true); }
    }
  });

  function begin() {
    if (WIDE.matches) start();
    else if (WIDE.addEventListener) WIDE.addEventListener("change", start);
    else if (WIDE.addListener) WIDE.addListener(start);
    if (WIDE.addEventListener) WIDE.addEventListener("change", refresh);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", begin);
  else begin();
})();
