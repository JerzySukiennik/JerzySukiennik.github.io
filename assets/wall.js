/* Two things that need a server, both on one Realtime Database and both spoken
   to over plain REST, no Firebase SDK, so the page stays dependency-free:

   1. The visitor counter. A real, global one: read /hits, and bump it once per
      browser session. The rules only accept +1, so the number cannot be faked.
   2. The brick wall. On screens wide enough to have margins (1280px and up) the
      margins are a brick wall anyone can write or spray on, in a graffiti font and
      a colour of their choice. Pieces stay forever and show up live for everyone.
      The rules allow creating a piece and nothing else, no edits, no deletions.

   A piece is stored against the edge of the page frame, not the screen: side
   ("l"/"r"), distance outward from the frame and size both in thousandths of the
   margin width, and page y in px. So a piece scales with the wall and fits on every
   wide screen, from a 1280px laptop to a big monitor.
   Localhost writes to a separate path so local testing never touches the real wall. */

(function () {
  var DB = "https://raft-e8d47-default-rtdb.firebaseio.com";
  var LOCAL = ["localhost", "127.0.0.1", "0.0.0.0", "[::1]"];

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

  /* ---------------- brick wall ---------------- */

  var WIDE = window.matchMedia("(min-width:1280px)");
  var DEV = LOCAL.indexOf(location.hostname) !== -1 || location.protocol === "file:";
  var PATH = DEV ? "bricksDev" : "bricks";
  var QUERY = '.json?orderBy="$key"&limitToLast=500';
  var MAX_ITEMS = 500;
  var MAX_LEN = 24;
  var MAX_POINTS = 150;
  var MAX_POSTS = 60;
  var COOLDOWN = 2500;
  var REVEAL = 500;
  var DRIPS = 1300;

  var FONTS = [
    { key: "sedgwick", label: "Tag" },
    { key: "spray", label: "Spray" },
    { key: "drip", label: "Drip" },
    { key: "brush", label: "Brush" },
  ];
  var COLORS = [
    ["#ff2d2d", "red"], ["#ff8a00", "orange"], ["#ffe600", "yellow"], ["#38e03b", "green"],
    ["#00e5ff", "cyan"], ["#2f6bff", "blue"], ["#b14bff", "purple"], ["#ff4fd8", "pink"],
    ["#ffffff", "white"], ["#111111", "black"],
  ];
  var SIZES = [
    { label: "S", text: 0.12, line: 0.018 },
    { label: "M", text: 0.18, line: 0.036 },
    { label: "L", text: 0.27, line: 0.064 },
  ];
  var ALLOWED = /^[A-Za-z0-9À-ÖØ-öø-ÿĀ-ž !?.,:;'"+*&#()@\/_=<>-]{1,24}$/;
  var BAD = /(kurw|chuj|huj|pierdol|spierdal|wypierd|zajeb|jebac|jebi|jeban|jebn|pizd|fuck|shit|bitch|nigg|fagg|cunt|porn|hitler|nazi|cwel|kutas|szmat|dziwk)/;
  var LEET = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s", "!": "i" };

  var canvas, ctx, panel, editor = null, gesture = null, live = null, source = null;
  var items = [], legacy = [], byId = {}, pending = [], started = false, settled = false, raf = 0;
  var tool = "write", color = COLORS[0][0], font = 0, size = 1;
  var rainbow = false, posted = 0, lastPost = 0, flashTimer = 0, tagCount = 0;
  var probe = document.createElement("canvas").getContext("2d");

  try { rainbow = localStorage.getItem("gl-rainbow") === "1"; } catch (e) {}

  function frameRect() {
    var el = document.querySelector(".frame");
    return el ? el.getBoundingClientRect() : null;
  }

  function viewW() { return document.documentElement.clientWidth; }

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

  function bounds(side, f) {
    return side === "l" ? [6, f.left - 6] : [f.right + 14, viewW() - 6];
  }

  function fontStr(idx, px) {
    return px + 'px "GL ' + FONTS[idx].key + '", Impact, sans-serif';
  }

  function measure(text, idx, px) {
    probe.font = fontStr(idx, px);
    return probe.measureText(text).width;
  }

  function clean(s) {
    var t = String(s).toLowerCase().replace(/ł/g, "l").normalize("NFD").replace(/[̀-ͯ]/g, "");
    t = t.replace(/[0134578@$!]/g, function (c) { return LEET[c]; });
    return t.replace(/[^a-z]/g, "");
  }

  function allowed(s) {
    return ALLOWED.test(s) && !BAD.test(clean(s));
  }

  function hash(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  function rng(seed) {
    var a = seed;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function dark(hex) {
    var n = parseInt(hex.slice(1), 16);
    var lum = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
    return lum < 0.28;
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

  /* ---- rendering ---- */

  function schedule() {
    if (!raf) raf = requestAnimationFrame(draw);
  }

  function fitCanvas() {
    var ratio = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * ratio;
    canvas.height = window.innerHeight * ratio;
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
    schedule();
  }

  function paintFor(c, col, w) {
    if (col !== "rainbow") return col;
    var g = c.createLinearGradient(-w / 2, 0, w / 2, 0);
    ["#ff2d2d", "#ff8a00", "#ffe600", "#38e03b", "#00e5ff", "#2f6bff", "#b14bff"].forEach(function (s, i) {
      g.addColorStop(i / 6, s);
    });
    return g;
  }

  function drawText(c, it, f, top, H, now) {
    var cy = it.y - top;
    var z = it.z / 1000 * unit(f);
    if (cy < -160 || cy > H + 160) return;
    var age = it.born ? now - it.born : DRIPS + 1;
    var reveal = Math.min(1, age / REVEAL);
    var dripP = Math.max(0, Math.min(1, (age - 250) / (DRIPS - 250)));
    dripP = 1 - Math.pow(1 - dripP, 3);

    c.save();
    c.translate(screenX(it.a, it.x, f), cy);
    c.rotate((it.r || 0) * Math.PI / 180);
    c.font = fontStr(it.f, z);
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.lineJoin = "round";
    c.lineCap = "round";
    var w = c.measureText(it.s).width;

    if (reveal < 1) {
      c.beginPath();
      c.rect(-w / 2 - 12, -z, (w + 24) * reveal, z * 3);
      c.clip();
    }

    var paintCol = paintFor(c, it.c, w);
    c.globalAlpha = 0.22;
    c.strokeStyle = paintCol;
    c.lineWidth = z * 0.32;
    c.strokeText(it.s, 0, 0);
    c.globalAlpha = 1;
    c.strokeStyle = it.c !== "rainbow" && dark(it.c) ? "#ffffff" : "#111111";
    c.lineWidth = Math.max(3, z * 0.15);
    c.strokeText(it.s, 0, 0);
    c.fillStyle = paintCol;
    c.fillText(it.s, 0, 0);

    if (z >= 30 && dripP > 0) {
      var rnd = rng(hash(it.id));
      var n = 1 + Math.floor(rnd() * 3);
      for (var i = 0; i < n; i++) {
        var dx = (rnd() - 0.5) * w * 0.8;
        var len = z * (0.25 + rnd() * 0.75) * dripP;
        c.strokeStyle = it.c === "rainbow" ? "hsl(" + Math.round(((dx / w) + 0.5) * 300) + ",90%,55%)" : it.c;
        c.lineWidth = Math.max(2, z * 0.07);
        c.beginPath();
        c.moveTo(dx, z * 0.3);
        c.lineTo(dx, z * 0.3 + len);
        c.stroke();
      }
    }
    c.restore();
  }

  function drawStroke(c, it, f, top, H) {
    var pts = it.d;
    var lw = it.w / 1000 * unit(f);
    if (it.y1 - top < -40 || it.y0 - top > H + 40) return;
    c.lineCap = "round";
    c.lineJoin = "round";
    var rain = it.c === "rainbow";
    if (!rain) {
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
    for (var j = 2; j < pts.length + (pts.length === 2 ? 2 : 0); j += 2) {
      var a = j - 2, b = Math.min(j, pts.length - 2);
      c.beginPath();
      c.moveTo(screenX(it.a, pts[a], f), pts[a + 1] - top);
      c.lineTo(screenX(it.a, pts[b], f), pts[b + 1] - top);
      c.strokeStyle = "hsl(" + ((j * 9) % 360) + ",95%,55%)";
      c.lineWidth = lw;
      c.stroke();
    }
  }

  function drawLegacy(c, top) {
    var scale = viewW();
    c.strokeStyle = "#000";
    c.lineWidth = Math.max(2, scale * 0.004);
    c.lineCap = "round";
    c.lineJoin = "round";
    legacy.forEach(function (pts) {
      c.beginPath();
      for (var i = 0; i < pts.length; i += 2) {
        var x = pts[i] * scale, y = pts[i + 1] * scale - top;
        if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
      }
      c.stroke();
    });
  }

  function draw() {
    raf = 0;
    if (!ctx || !WIDE.matches) return;
    var f = frameRect();
    if (!f) return;
    var ratio = window.devicePixelRatio || 1;
    var W = window.innerWidth, H = window.innerHeight, top = window.scrollY;
    var now = performance.now(), animating = false;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, Math.max(0, f.left - 2), H);
    ctx.rect(f.right + 8, 0, Math.max(0, W - f.right - 8), H);
    ctx.clip();

    drawLegacy(ctx, top);
    items.forEach(function (it) {
      if (it.born && now - it.born < DRIPS) animating = true;
      if (it.k === "t") drawText(ctx, it, f, top, H, now);
      else drawStroke(ctx, it, f, top, H);
    });
    if (live) drawStroke(ctx, live, f, top, H);
    ctx.restore();
    if (animating) schedule();
  }

  /* ---- data ---- */

  function parse(id, v) {
    if (!v || typeof v !== "object" || (v.a !== "l" && v.a !== "r")) return null;
    var col = typeof v.c === "string" && (v.c === "rainbow" || /^#[0-9a-f]{6}$/.test(v.c)) ? v.c : null;
    if (!col) return null;
    if (v.k === "t") {
      if (typeof v.s !== "string" || !allowed(v.s) || typeof v.x !== "number" || typeof v.y !== "number") return null;
      var fi = v.f >= 0 && v.f < FONTS.length ? v.f | 0 : 0;
      return { id: id, k: "t", a: v.a, x: v.x, y: v.y, s: v.s, c: col, f: fi, z: Math.max(20, Math.min(700, v.z || 180)), r: v.r || 0 };
    }
    if (v.k === "d" && typeof v.d === "string" && /^[0-9,]+$/.test(v.d)) {
      var pts = v.d.split(",").map(Number);
      if (pts.length < 2 || pts.length % 2) return null;
      var y0 = Infinity, y1 = -Infinity;
      for (var i = 1; i < pts.length; i += 2) { y0 = Math.min(y0, pts[i]); y1 = Math.max(y1, pts[i]); }
      return { id: id, k: "d", a: v.a, d: pts, c: col, w: Math.max(5, Math.min(200, v.w || 36)), y0: y0, y1: y1 };
    }
    return null;
  }

  function sig(v) {
    return [v.k, v.s || v.d, v.x, v.y, v.a].join("|");
  }

  function ensureFonts(list) {
    if (!document.fonts || !document.fonts.load) return;
    var text = {};
    list.forEach(function (it) { if (it.k === "t") text[it.f] = (text[it.f] || "") + it.s; });
    Object.keys(text).forEach(function (k) {
      document.fonts.load(fontStr(+k, 32), text[k]).then(schedule, schedule);
    });
  }

  function add(id, v) {
    if (byId[id]) return;
    byId[id] = true;
    var p = pending.indexOf(sig(v));
    if (p !== -1) { pending.splice(p, 1); return; }
    var it = parse(id, v);
    if (!it) return;
    if (settled) it.born = performance.now();
    items.push(it);
    if (items.length > MAX_ITEMS) items.shift();
    countUp();
  }

  function countUp() {
    var el = panel && panel.querySelector("[data-sp-count]");
    if (el) el.textContent = items.length;
  }

  function onMessage(e) {
    var msg;
    try { msg = JSON.parse(e.data || "{}"); } catch (err) { return; }
    if (msg.path === "/") {
      Object.keys(msg.data || {}).forEach(function (k) { add(k, msg.data[k]); });
      settled = true;
    } else if (msg.data) {
      add(msg.path.slice(1), msg.data);
    }
    ensureFonts(items);
    schedule();
  }

  function listen() {
    if (typeof EventSource === "undefined") {
      fetch(DB + "/" + PATH + QUERY).then(function (r) { return r.json(); }).then(function (d) {
        Object.keys(d || {}).forEach(function (k) { add(k, d[k]); });
        settled = true;
        ensureFonts(items);
        schedule();
      }).catch(function () {});
      return;
    }
    source = new EventSource(DB + "/" + PATH + QUERY);
    source.addEventListener("put", onMessage);
    source.onerror = function () {};
  }

  function loadLegacy() {
    fetch(DB + '/wall.json?orderBy="$key"&limitToLast=600')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        Object.keys(data || {}).forEach(function (k) {
          var v = data[k];
          if (!v || typeof v.d !== "string") return;
          var nums = v.d.split(",").map(parseFloat);
          if (!nums.some(isNaN) && nums.length >= 4) legacy.push(nums);
        });
        schedule();
      })
      .catch(function () {});
  }

  function send(it) {
    var body = { k: it.k, a: it.a, c: it.c, t: { ".sv": "timestamp" } };
    if (it.k === "t") {
      body.x = it.x; body.y = it.y; body.s = it.s; body.f = it.f; body.z = it.z; body.r = it.r;
    } else {
      var d = it.d.join(",");
      if (d.length > 3000) d = d.slice(0, d.lastIndexOf(",", 3000));
      body.d = d; body.w = it.w;
    }
    var key = sig({ k: it.k, s: body.s, d: body.d, x: body.x, y: body.y, a: it.a });
    pending.push(key);
    posted++;
    fetch(DB + "/" + PATH + ".json", { method: "POST", body: JSON.stringify(body) })
      .then(function (r) { return r.json(); })
      .then(function (out) {
        var p = pending.indexOf(key);
        if (p !== -1) pending.splice(p, 1);
        if (out && out.name) { byId[out.name] = true; it.id = out.name; }
      })
      .catch(function () {
        var p = pending.indexOf(key);
        if (p !== -1) pending.splice(p, 1);
      });
  }

  function place(it) {
    it.id = it.id || "local" + Math.random().toString(36).slice(2);
    it.born = performance.now();
    items.push(it);
    if (items.length > MAX_ITEMS) items.shift();
    countUp();
    schedule();
    send(it);
  }

  /* ---- writing ---- */

  function pagePoint(side, x, y, f) {
    var u = side === "l" ? f.left - x : x - f.right;
    return [Math.round(Math.max(0, Math.min(1000, u / unit(f) * 1000))), Math.round(y + window.scrollY)];
  }

  function layoutEditor() {
    var f = frameRect();
    if (!editor || !f) return;
    var inp = editor.el, b = bounds(editor.side, f);
    var avail = b[1] - b[0] - 28;
    var base = Math.round(SIZES[size].text * unit(f));
    var text = inp.value || "WRITE";
    var w = measure(text, font, base);
    var z = w > avail ? Math.floor(base * avail / w) : base;
    if (z < 12 && inp.value) {
      inp.value = inp.value.slice(0, -1);
      return layoutEditor();
    }
    editor.z = z;
    var box = measure(text, font, z) + 28;
    var left = Math.max(b[0], Math.min(b[1] - box, editor.x - box / 2));
    editor.cx = left + box / 2;
    inp.style.font = fontStr(font, z);
    inp.style.color = color === "rainbow" ? "#fff" : color;
    inp.style.width = box + "px";
    inp.style.left = left + "px";
    inp.style.top = (editor.pageY - window.scrollY - z * 0.62) + "px";
    inp.style.setProperty("--wall-outline", color !== "rainbow" && dark(color) ? "#fff" : "#111");
  }

  function openEditor(side, x, y) {
    var inp = document.createElement("input");
    inp.className = "wall-input";
    inp.type = "text";
    inp.maxLength = MAX_LEN;
    inp.placeholder = "WRITE";
    inp.setAttribute("autocomplete", "off");
    inp.setAttribute("spellcheck", "false");
    inp.setAttribute("aria-label", "Write on the wall");
    editor = { el: inp, side: side, x: x, pageY: y + window.scrollY, z: 30, cx: x };
    document.body.appendChild(inp);
    ensureFonts([{ k: "t", f: font, s: "Aaąęłóż" }]);
    layoutEditor();
    inp.focus();
    inp.addEventListener("input", function () {
      var v = inp.value.replace(/[^A-Za-z0-9À-ÖØ-öø-ÿĀ-ž !?.,:;'"+*&#()@\/_=<>-]/g, "");
      if (v !== inp.value) inp.value = v;
      layoutEditor();
    });
    inp.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); commit(); }
      else if (e.key === "Escape") { e.preventDefault(); closeEditor(); }
    });
  }

  function closeEditor() {
    if (!editor) return;
    editor.el.remove();
    editor = null;
  }

  function commit() {
    if (!editor) return;
    var ed = editor;
    var text = ed.el.value.trim().replace(/\s+/g, " ");
    closeEditor();
    if (!text) return;
    if (!allowed(text)) { flash("THAT WORD CANNOT GO ON THIS WALL"); return; }
    if (posted >= MAX_POSTS) { flash("THAT IS ENOUGH ART FOR ONE VISIT"); return; }
    var now = Date.now();
    if (now - lastPost < COOLDOWN) { flash("EASY, WAIT A SECOND BETWEEN TAGS"); return; }
    lastPost = now;
    var f = frameRect();
    if (!f) return;
    var u = ed.side === "l" ? f.left - ed.cx : ed.cx - f.right;
    place({
      k: "t", a: ed.side, x: Math.round(u / unit(f) * 1000), y: Math.round(ed.pageY), s: text,
      c: color, f: font, z: Math.round(ed.z / unit(f) * 1000), r: Math.round((Math.random() * 14 - 7) * 10) / 10,
    });
  }

  /* ---- spraying ---- */

  function flushStroke(keepLast) {
    if (!live) return;
    if (live.d.length >= 2 && posted < MAX_POSTS) {
      if (live.d.length === 2) live.d = live.d.concat(live.d);
      var done = live;
      var ys = done.d.filter(function (_, i) { return i % 2; });
      done.y0 = Math.min.apply(null, ys);
      done.y1 = Math.max.apply(null, ys);
      done.id = "local" + Math.random().toString(36).slice(2);
      items.push(done);
      if (items.length > MAX_ITEMS) items.shift();
      countUp();
      send(done);
    }
    live = keepLast ? { k: "d", a: live.a, d: live.d.slice(-2), c: live.c, w: live.w, y0: 0, y1: 1e9 } : null;
  }

  function extend(e) {
    var f = frameRect();
    if (!f || !live) return;
    var p = pagePoint(live.a, e.clientX, e.clientY, f);
    var n = live.d.length;
    if (n && Math.hypot(p[0] - live.d[n - 2], p[1] - live.d[n - 1]) < 4) return;
    live.d.push(p[0], p[1]);
    live.y0 = 0;
    live.y1 = 1e9;
    if (live.d.length >= MAX_POINTS * 2) flushStroke(true);
    schedule();
  }

  /* ---- pointer plumbing ---- */

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
    if (editor) commit();
    if (!panel.classList.contains("is-open")) showPanel(true);
    gesture = { side: side, x: e.clientX, y: e.clientY, moved: false };
    if (tool === "spray") {
      live = { k: "d", a: side, d: [], c: color, w: Math.round(SIZES[size].line * 1000), y0: 0, y1: 1e9 };
      extend(e);
    }
  }

  function move(e) {
    if (!gesture) return;
    if (Math.hypot(e.clientX - gesture.x, e.clientY - gesture.y) > 6) gesture.moved = true;
    if (tool === "spray") extend(e);
  }

  function up() {
    if (!gesture) return;
    var g = gesture;
    gesture = null;
    if (tool === "spray") {
      flushStroke(false);
      schedule();
    } else if (!g.moved) {
      openEditor(g.side, g.x, g.y);
    }
  }

  function setCursor() {
    var root = document.documentElement;
    root.classList.toggle("wall-write", tool === "write");
    root.classList.toggle("wall-spray", tool === "spray");
  }

  /* ---- tool panel ---- */

  function sync() {
    if (!panel) return;
    panel.querySelectorAll("[data-tool]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.tool === tool)); });
    panel.querySelectorAll("[data-color]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.color === color)); });
    panel.querySelectorAll("[data-font]").forEach(function (b) { b.setAttribute("aria-pressed", String(+b.dataset.font === font)); });
    panel.querySelectorAll("[data-size]").forEach(function (b) { b.setAttribute("aria-pressed", String(+b.dataset.size === size)); });
    panel.querySelector("[data-sp-fonts]").hidden = tool !== "write";
    setCursor();
    if (editor) layoutEditor();
  }

  function swatch(hex, name) {
    var bg = hex === "rainbow"
      ? "linear-gradient(135deg,#ff2d2d,#ffe600,#38e03b,#00e5ff,#b14bff)"
      : hex;
    return '<button type="button" class="sp-sw" data-color="' + hex + '" aria-label="' + name + '" title="' + name +
      '" style="background:' + bg + '"></button>';
  }

  function buildPanel() {
    panel = document.createElement("aside");
    panel.className = "spray-panel";
    panel.setAttribute("aria-label", "Brick wall tools");
    panel.innerHTML =
      '<div class="sp-title">&#9998; THE WALL<button type="button" class="sp-close" data-close aria-label="Hide the tools">&times;</button></div>' +
      '<div class="sp-tools">' +
        '<button type="button" class="sp-btn" data-tool="write">WRITE</button>' +
        '<button type="button" class="sp-btn" data-tool="spray">SPRAY</button>' +
      '</div>' +
      '<div class="sp-colors" data-sp-colors>' + COLORS.map(function (c) { return swatch(c[0], c[1]); }).join("") + '</div>' +
      '<div class="sp-fonts" data-sp-fonts>' + FONTS.map(function (f, i) {
        return '<button type="button" class="sp-btn sp-font" data-font="' + i + '" style="font-family:\'GL ' + f.key + '\',Impact,sans-serif">' + f.label + '</button>';
      }).join("") + '</div>' +
      '<div class="sp-sizes">' + SIZES.map(function (s, i) {
        return '<button type="button" class="sp-btn" data-size="' + i + '">' + s.label + '</button>';
      }).join("") + '</div>' +
      '<p class="sp-note">Click the wall and type, Enter to spray. It stays <b>forever</b>. <span class="sp-count"><b data-sp-count>0</b> tags so far.</span></p>';
    document.body.appendChild(panel);

    panel.addEventListener("click", function (e) {
      var b = e.target.closest("button");
      if (!b) return;
      if (b.dataset.close) { showPanel(false); return; }
      if (b.dataset.tool) tool = b.dataset.tool;
      if (b.dataset.color) color = b.dataset.color;
      if (b.dataset.font) font = +b.dataset.font;
      if (b.dataset.size) size = +b.dataset.size;
      sync();
    });
    panel.addEventListener("pointerdown", function (e) { if (editor && e.target.closest("button")) e.preventDefault(); });
    if (rainbow) unlockRainbow(false);
    panel.setAttribute("aria-hidden", "true");
    sync();
    countUp();
  }

  function showPanel(on) {
    if (!panel) return;
    panel.classList.toggle("is-open", on);
    panel.setAttribute("aria-hidden", String(!on));
    if (on) {
      panel.classList.remove("is-pulse");
      void panel.offsetWidth;
      panel.classList.add("is-pulse");
    }
  }

  function unlockRainbow(announce) {
    rainbow = true;
    try { localStorage.setItem("gl-rainbow", "1"); } catch (e) {}
    if (!panel) return;
    var box = panel.querySelector("[data-sp-colors]");
    if (!box.querySelector('[data-color="rainbow"]')) box.insertAdjacentHTML("beforeend", swatch("rainbow", "rainbow"));
    if (announce) {
      color = "rainbow";
      flash("SECRET COLOR UNLOCKED: RAINBOW");
    }
    sync();
  }

  /* ---- start ---- */

  function start() {
    if (started || !WIDE.matches) return;
    started = true;
    canvas = document.createElement("canvas");
    canvas.className = "wall-canvas";
    canvas.setAttribute("aria-hidden", "true");
    document.body.appendChild(canvas);
    ctx = canvas.getContext("2d");
    fitCanvas();
    buildPanel();
    loadLegacy();
    listen();

    window.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    window.addEventListener("resize", function () { fitCanvas(); if (editor) layoutEditor(); });
    window.addEventListener("scroll", function () { schedule(); if (editor) layoutEditor(); }, { passive: true });
  }

  var hint = document.querySelector("[data-wall-hint]");
  if (hint) {
    hint.addEventListener("click", function (e) {
      e.preventDefault();
      if (!WIDE.matches) return;
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
    if (WIDE.addEventListener) WIDE.addEventListener("change", schedule);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", begin);
  else begin();
})();
