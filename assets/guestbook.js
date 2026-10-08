/* The guestbook: a sheet of paper that opens over the page, a name and a message,
   and every signature ever left. Same Realtime Database as the counter and the
   wall, over plain REST. Pieces can be created and nothing else. Localhost writes
   to a separate path so testing never signs the real book. */

(function () {
  var DB = "https://raft-e8d47-default-rtdb.firebaseio.com";
  var LOCAL = ["localhost", "127.0.0.1", "0.0.0.0", "[::1]"];
  var PATH = LOCAL.indexOf(location.hostname) !== -1 || location.protocol === "file:" ? "guestbookDev" : "guestbook";
  var COOLDOWN = 45 * 1000;
  var MAX_NAME = 30;
  var MAX_MSG = 300;

  var triggers = document.querySelectorAll("[data-guestbook]");
  if (!triggers.length) return;

  var overlay, form, list, total, status, count, entries = [], loaded = false, lastFocus = null;

  function store(key, value) {
    try {
      if (value === undefined) return localStorage.getItem(key);
      localStorage.setItem(key, value);
    } catch (e) {}
    return null;
  }

  function when(ts) {
    var d = new Date(ts);
    return isNaN(d) ? "" : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }

  function entry(e) {
    var li = document.createElement("li");
    var text = document.createElement("p");
    text.className = "gb-text";
    text.textContent = e.m;
    var by = document.createElement("p");
    by.className = "gb-by";
    by.textContent = "- " + e.n + (e.t ? ", " + when(e.t) : "");
    li.appendChild(text);
    li.appendChild(by);
    return li;
  }

  function render() {
    list.textContent = "";
    entries.forEach(function (e) { list.appendChild(entry(e)); });
    total.textContent = entries.length
      ? entries.length + (entries.length === 1 ? " signature" : " signatures") + ", newest first"
      : "Nobody has signed yet. Be the first.";
  }

  function load() {
    if (loaded) return;
    loaded = true;
    total.textContent = "Opening the book...";
    fetch(DB + "/" + PATH + '.json?orderBy="$key"&limitToLast=200')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var fetched = Object.keys(data || {}).reverse().map(function (k) { return data[k]; }).filter(function (e) {
          return e && typeof e.n === "string" && typeof e.m === "string" && !(window.glBad && (window.glBad(e.n) || window.glBad(e.m)));
        });
        entries = entries.concat(fetched);
        render();
      })
      .catch(function () {
        loaded = false;
        total.textContent = "The book would not open. Try again in a moment.";
      });
  }

  function build() {
    overlay = document.createElement("div");
    overlay.className = "gb-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Guestbook");
    overlay.innerHTML =
      '<div class="gb-sheet">' +
        '<button type="button" class="gb-close" aria-label="Close the guestbook">&times;</button>' +
        '<h2 class="gb-title">Guestbook</h2>' +
        '<p class="gb-sub">Sign it. Everyone who visits can read it.</p>' +
        '<form class="gb-form" novalidate>' +
          '<label>Your name<input name="n" maxlength="' + MAX_NAME + '" autocomplete="nickname" required></label>' +
          '<label>Message<textarea name="m" rows="3" maxlength="' + MAX_MSG + '" required></textarea></label>' +
          '<div class="gb-row"><span class="gb-count" aria-hidden="true">' + MAX_MSG + '</span>' +
          '<button type="submit" class="gb-sign">Sign the book</button></div>' +
          '<p class="gb-status" role="status"></p>' +
        '</form>' +
        '<p class="gb-total"></p>' +
        '<ol class="gb-list"></ol>' +
      '</div>';
    document.body.appendChild(overlay);

    form = overlay.querySelector(".gb-form");
    list = overlay.querySelector(".gb-list");
    total = overlay.querySelector(".gb-total");
    status = overlay.querySelector(".gb-status");
    count = overlay.querySelector(".gb-count");
    form.n.value = store("gl-gb-name") || "";

    form.m.addEventListener("input", function () { count.textContent = MAX_MSG - form.m.value.length; });
    form.addEventListener("submit", submit);
    overlay.querySelector(".gb-close").addEventListener("click", close);
    overlay.addEventListener("pointerdown", function (e) { if (e.target === overlay) close(); });
    overlay.addEventListener("keydown", trap);
  }

  function trap(e) {
    if (e.key === "Escape") { e.preventDefault(); close(); return; }
    if (e.key !== "Tab") return;
    var f = [].filter.call(overlay.querySelectorAll("button,input,textarea"), function (el) { return !el.disabled; });
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function say(msg, bad) {
    status.textContent = msg;
    status.classList.toggle("is-bad", !!bad);
  }

  function submit(e) {
    e.preventDefault();
    var n = form.n.value.trim().replace(/\s+/g, " ");
    var m = form.m.value.trim();
    if (!n) { say("Write your name first.", true); form.n.focus(); return; }
    if (!m) { say("Write a few words in the message.", true); form.m.focus(); return; }
    if (window.glBad && (window.glBad(n) || window.glBad(m))) { say("Please keep it friendly. That one cannot go in the book.", true); return; }
    var wait = COOLDOWN - (Date.now() - (parseInt(store("gl-gb-last"), 10) || 0));
    if (wait > 0) { say("One signature at a time. Try again in " + Math.ceil(wait / 1000) + " seconds.", true); return; }

    var btn = form.querySelector(".gb-sign");
    btn.disabled = true;
    say("Signing...");
    fetch(DB + "/" + PATH + ".json", {
      method: "POST",
      body: JSON.stringify({ n: n, m: m, t: { ".sv": "timestamp" } }),
    })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function () {
        store("gl-gb-last", String(Date.now()));
        store("gl-gb-name", n);
        entries.unshift({ n: n, m: m, t: Date.now() });
        render();
        form.m.value = "";
        count.textContent = MAX_MSG;
        say("Thank you, you are in the book.");
        list.scrollIntoView({ block: "nearest" });
        overlay.querySelector(".gb-sheet").scrollTo({ top: 0, behavior: "smooth" });
      })
      .catch(function () { say("That did not go through. Try again in a moment.", true); })
      .then(function () { btn.disabled = false; });
  }

  function open() {
    if (!overlay) build();
    lastFocus = document.activeElement;
    overlay.classList.add("is-open");
    document.documentElement.classList.add("gb-lock");
    load();
    setTimeout(function () { (form.n.value ? form.m : form.n).focus(); }, 60);
    if (location.hash !== "#guestbook") history.replaceState(null, "", "#guestbook");
  }

  function close() {
    if (!overlay) return;
    overlay.classList.remove("is-open");
    document.documentElement.classList.remove("gb-lock");
    if (location.hash === "#guestbook") history.replaceState(null, "", location.pathname + location.search);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  [].forEach.call(triggers, function (a) {
    a.addEventListener("click", function (e) { e.preventDefault(); open(); });
  });

  if (location.hash === "#guestbook") {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", open);
    else open();
  }
})();
