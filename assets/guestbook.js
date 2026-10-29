/* The guestbook in the "Guestbook.txt - Notepad" window: a name, a message and every signature ever left, over plain REST on the
   same Realtime Database. Entries can only be created; localhost signs a separate test book. */

(function () {
  var DB = "https://raft-e8d47-default-rtdb.firebaseio.com";
  var LOCAL = ["localhost", "127.0.0.1", "0.0.0.0", "[::1]"];
  var PATH = LOCAL.indexOf(location.hostname) !== -1 || location.protocol === "file:" ? "guestbookDev" : "guestbook";
  var COOLDOWN = 45 * 1000;
  var MAX_MSG = 300;
  var BAD = /(kurw|chuj|huj|pierdol|spierdal|wypierd|zajeb|jebac|jebi|jeban|jebn|pizd|fuck|shit|bitch|nigg|fagg|cunt|porn|hitler|nazi|cwel|kutas|szmat|dziwk)/;
  var LEET = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s", "!": "i" };

  var box = document.querySelector("[data-gb]");
  if (!box) return;
  var form = box.querySelector(".gb-form");
  var list = box.querySelector(".gb-list");
  var total = box.querySelector(".gb-total");
  var status = box.querySelector(".gb-status");
  var count = box.querySelector(".gb-count");
  var entries = [], loaded = false;

  function bad(s) {
    var t = String(s).toLowerCase().replace(/ł/g, "l").normalize("NFD").replace(/[̀-ͯ]/g, "");
    t = t.replace(/[0134578@$!]/g, function (c) { return LEET[c]; }).replace(/[^a-z]/g, "");
    return BAD.test(t);
  }

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
          return e && typeof e.n === "string" && typeof e.m === "string" && !bad(e.n) && !bad(e.m);
        });
        entries = entries.concat(fetched);
        render();
      })
      .catch(function () {
        loaded = false;
        total.textContent = "The book would not open. Try again in a moment.";
      });
  }

  function say(msg, isBad) {
    status.textContent = msg;
    status.classList.toggle("is-bad", !!isBad);
  }

  form.n.value = store("gl-gb-name") || "";
  form.m.addEventListener("input", function () { count.textContent = MAX_MSG - form.m.value.length; });
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var n = form.n.value.trim().replace(/\s+/g, " ");
    var m = form.m.value.trim();
    if (!n) { say("Write your name first.", true); form.n.focus(); return; }
    if (!m) { say("Write a few words in the message.", true); form.m.focus(); return; }
    if (bad(n) || bad(m)) { say("Please keep it friendly. That one cannot go in the book.", true); return; }
    var wait = COOLDOWN - (Date.now() - (parseInt(store("gl-gb-last"), 10) || 0));
    if (wait > 0) { say("One signature at a time. Try again in " + Math.ceil(wait / 1000) + " seconds.", true); return; }

    var btn = form.querySelector(".gb-sign");
    btn.disabled = true;
    say("Signing...");
    fetch(DB + "/" + PATH + ".json", { method: "POST", body: JSON.stringify({ n: n, m: m, t: { ".sv": "timestamp" } }) })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function () {
        store("gl-gb-last", String(Date.now()));
        store("gl-gb-name", n);
        entries.unshift({ n: n, m: m, t: Date.now() });
        render();
        form.m.value = "";
        count.textContent = MAX_MSG;
        say("Thank you, you are in the book.");
      })
      .catch(function () { say("That did not go through. Try again in a moment.", true); })
      .then(function () { btn.disabled = false; });
  });

  window.addEventListener("gz:open", function (e) {
    if (e.detail !== "guestbook") return;
    load();
    setTimeout(function () { (form.n.value ? form.m : form.n).focus(); }, 60);
  });
})();
