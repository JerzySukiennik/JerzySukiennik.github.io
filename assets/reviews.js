/* The guestbook: five stars, a note, and every review ever left, on the same
   Realtime Database as the counter and the wall and over the same plain REST.

   Layout differs by screen and the markup does not: on a desktop the widget
   sits in the right rail with the list running down under it, and on a phone
   the very same node becomes a full-screen panel with its own scroll, so the
   page underneath does not grow by a hundred reviews. */

(function () {
  var DB = "https://raft-e8d47-default-rtdb.firebaseio.com";
  var COOLDOWN = 60 * 1000; // one post a minute, per browser

  var box = document.querySelector("[data-rev]");
  if (!box) return;

  var scoreEl = box.querySelector("[data-rev-score]");
  var listEl = box.querySelector("[data-rev-list]");
  var starsEl = box.querySelector("[data-rev-stars]");
  var form = box.querySelector("[data-rev-form]");
  var note = box.querySelector("[data-rev-note]");
  var picked = 0;
  var reviews = [];

  /* ---- stars ---- */

  function paintStars(value) {
    [].forEach.call(starsEl.children, function (b, i) {
      b.classList.toggle("is-lit", i < value);
      b.setAttribute("aria-pressed", String(i < value));
    });
  }

  [].forEach.call(starsEl.children, function (b, i) {
    b.addEventListener("click", function () { picked = i + 1; paintStars(picked); });
    b.addEventListener("mouseenter", function () { paintStars(i + 1); });
  });
  starsEl.addEventListener("mouseleave", function () { paintStars(picked); });

  /* ---- rendering ---- */

  function stars(n) {
    return "★".repeat(n) + "☆".repeat(5 - n);
  }

  function when(t) {
    var d = new Date(t);
    return isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  }

  function render() {
    reviews.sort(function (a, b) { return b.t - a.t; });

    if (!reviews.length) {
      scoreEl.textContent = "No reviews yet. Be the first !!!";
      listEl.innerHTML = "";
      return;
    }

    var total = reviews.reduce(function (sum, r) { return sum + r.s; }, 0);
    var avg = Math.round((total / reviews.length) * 10) / 10;
    scoreEl.innerHTML =
      '<b>' + avg.toFixed(1) + '</b> ' + stars(Math.round(avg)) +
      '<br>from ' + reviews.length + ' web surfer' + (reviews.length === 1 ? "" : "s") + ' ~*~';

    listEl.innerHTML = "";
    reviews.forEach(function (r) {
      var item = document.createElement("div");
      item.className = "rev-item";
      var head = document.createElement("p");
      head.className = "rev-stars-out";
      head.textContent = stars(r.s);
      var body = document.createElement("p");
      body.className = "rev-msg";
      body.textContent = r.m;               // textContent: nobody gets to inject markup
      var sign = document.createElement("p");
      sign.className = "rev-sign";
      sign.textContent = "~ " + (r.n || "Anonymous Web Surfer") + ", " + when(r.t);
      item.appendChild(head);
      item.appendChild(body);
      item.appendChild(sign);
      listEl.appendChild(item);
    });
  }

  function decode(value) {
    if (!value || typeof value.m !== "string" || typeof value.s !== "number") return null;
    return { s: value.s, m: value.m, n: typeof value.n === "string" ? value.n : "", t: value.t || 0 };
  }

  fetch(DB + "/reviews.json")
    .then(function (r) { return r.json(); })
    .then(function (data) {
      Object.keys(data || {}).forEach(function (k) {
        var r = decode(data[k]);
        if (r) { r.id = k; reviews.push(r); }
      });
      render();
      listen();
    })
    .catch(function () {
      scoreEl.textContent = "Reviews are offline right now.";
    });

  function listen() {
    if (typeof EventSource === "undefined") return;
    var live = new EventSource(DB + "/reviews.json");
    live.addEventListener("put", function (e) {
      var msg = JSON.parse(e.data || "{}");
      if (msg.path === "/") return;
      var r = decode(msg.data);
      var id = msg.path.replace("/", "");
      if (!r || reviews.some(function (x) { return x.id === id; })) return;
      r.id = id;
      reviews.push(r);
      render();
    });
    live.onerror = function () {};
  }

  /* ---- posting ---- */

  function say(text, bad) {
    note.textContent = text;
    note.classList.toggle("is-bad", !!bad);
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var message = form.elements.m.value.trim();
    var name = form.elements.n.value.trim().slice(0, 30);

    if (!picked) return say("Pick some stars first !!!", true);
    if (!message) return say("Say something, anything !!!", true);

    var last = 0;
    try { last = parseInt(localStorage.getItem("gl-rev-last") || "0", 10); } catch (err) {}
    if (Date.now() - last < COOLDOWN) return say("Slow down !!! One review a minute.", true);

    var btn = form.querySelector("button[type=submit]");
    btn.disabled = true;
    say("Posting...");

    var payload = { s: picked, m: message.slice(0, 400), t: { ".sv": "timestamp" } };
    if (name) payload.n = name;

    fetch(DB + "/reviews.json", { method: "POST", body: JSON.stringify(payload) })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error("refused")); })
      .then(function (out) {
        try { localStorage.setItem("gl-rev-last", String(Date.now())); } catch (err) {}
        // Show it immediately; the stream would bring it anyway, a beat later.
        if (!reviews.some(function (x) { return x.id === out.name; })) {
          reviews.push({ id: out.name, s: picked, m: message, n: name, t: Date.now() });
          render();
        }
        form.reset();
        picked = 0;
        paintStars(0);
        say("THANK YOU FOR SIGNING !!! ~*~*~");
      })
      .catch(function () { say("It did not go through. Try again !!!", true); })
      .then(function () { btn.disabled = false; });
  });

  /* ---- the phone gets its own screen ---- */

  var opener = document.querySelector("[data-rev-open]");
  var closer = box.querySelector("[data-rev-close]");
  var root = document.documentElement;

  function open(state) {
    root.classList.toggle("rev-screen", state);
    if (state) box.scrollTop = 0;
  }

  if (opener) {
    opener.addEventListener("click", function (e) {
      e.preventDefault();
      // Narrow screens get the panel; on a desktop the same button just walks
      // down to the widget sitting in the rail.
      if (window.matchMedia("(max-width: 860px)").matches) open(true);
      else box.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }
  if (closer) closer.addEventListener("click", function () { open(false); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") open(false);
  });
})();
