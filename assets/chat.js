/* The Gzowo Guide: a small chat window that answers questions about the site.
   It talks to a Cloudflare Worker (the address comes from data-chat on the script
   tag) that holds the API key and the limits; nothing secret lives here. */

(function () {
  var tag = document.querySelector("script[data-chat]");
  var URL_CHAT = tag && tag.getAttribute("data-chat");
  if (!URL_CHAT) return;

  var MAX_HISTORY = 12;
  var MAX_INPUT = 300;
  var CHIPS = ["What should I play first?", "Tell me about the rockets", "What are the G models?"];
  var WELCOME = "Hi! I am the Gzowo Guide. Ask me what to play, how the rockets fly, or what is hidden on this site.";

  var history = [];
  var busy = false;
  var win, log, input, send, fab;

  try { history = JSON.parse(sessionStorage.getItem("gl-chat") || "[]").slice(-MAX_HISTORY); } catch (e) { history = []; }

  function save() {
    try { sessionStorage.setItem("gl-chat", JSON.stringify(history.slice(-MAX_HISTORY))); } catch (e) {}
  }

  function linkify(parent, text) {
    var re = /\[([^\]]+)\]\((https:\/\/gzowo\.fun[^)\s]*|\/[^)\s]*)\)|(https:\/\/gzowo\.fun\/[^\s)]*)/g;
    var last = 0, m;
    while ((m = re.exec(text))) {
      if (m.index > last) parent.appendChild(document.createTextNode(text.slice(last, m.index)));
      var href = m[2] || m[3];
      try { href = new URL(href, location.href).pathname; } catch (e) { href = "/"; }
      var a = document.createElement("a");
      a.href = href;
      a.textContent = m[1] || m[3].replace("https://gzowo.fun", "gzowo.fun");
      parent.appendChild(a);
      last = re.lastIndex;
    }
    if (last < text.length) parent.appendChild(document.createTextNode(text.slice(last)));
  }

  function bubble(who, text) {
    var el = document.createElement("div");
    el.className = "chat-msg is-" + who;
    if (who === "bot") linkify(el, text); else el.textContent = text;
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
    return el;
  }

  function chips() {
    var box = document.createElement("div");
    box.className = "chat-chips";
    CHIPS.forEach(function (c) {
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = c;
      b.addEventListener("click", function () { box.remove(); ask(c); });
      box.appendChild(b);
    });
    log.appendChild(box);
  }

  function setBusy(on) {
    busy = on;
    input.disabled = on;
    send.disabled = on;
  }

  function ask(text) {
    text = String(text).trim().slice(0, MAX_INPUT);
    if (!text || busy) return;
    var old = log.querySelector(".chat-chips");
    if (old) old.remove();
    bubble("user", text);
    history.push({ role: "user", content: text });
    setBusy(true);
    var typing = bubble("bot", "...");
    typing.classList.add("is-typing");

    fetch(URL_CHAT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messages: history.slice(-8) }),
    })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (res) {
        typing.remove();
        var answer = res.d && res.d.reply;
        if (res.ok && answer) {
          bubble("bot", answer);
          history.push({ role: "assistant", content: answer });
        } else {
          bubble("bot", answer || "Something went wrong. Try again in a moment.");
          history.pop();
        }
        save();
      })
      .catch(function () {
        typing.remove();
        history.pop();
        bubble("bot", "I could not reach my brain just now. Try again in a moment.");
      })
      .then(function () { setBusy(false); input.focus(); });
  }

  function toggle(open) {
    var show = open === undefined ? !win.classList.contains("is-open") : open;
    win.classList.toggle("is-open", show);
    win.setAttribute("aria-hidden", String(!show));
    fab.setAttribute("aria-expanded", String(show));
    if (show) setTimeout(function () { input.focus(); }, 60);
    else fab.focus();
  }

  function build() {
    fab = document.createElement("button");
    fab.type = "button";
    fab.className = "chat-fab";
    fab.setAttribute("aria-expanded", "false");
    fab.textContent = "? ASK THE GUIDE";
    document.body.appendChild(fab);

    win = document.createElement("section");
    win.className = "chat-win";
    win.setAttribute("role", "dialog");
    win.setAttribute("aria-label", "Gzowo Guide chat");
    win.setAttribute("aria-hidden", "true");
    win.innerHTML =
      '<div class="chat-bar"><span>Gzowo Guide.exe</span><button type="button" class="chat-x" aria-label="Close chat">&times;</button></div>' +
      '<div class="chat-log" aria-live="polite"></div>' +
      '<form class="chat-form"><input type="text" maxlength="' + MAX_INPUT + '" placeholder="Ask about the site..." aria-label="Your question" autocomplete="off">' +
      '<button type="submit" class="chat-send">SEND</button></form>' +
      '<p class="chat-note">AI guide. It can make mistakes.</p>';
    document.body.appendChild(win);

    log = win.querySelector(".chat-log");
    input = win.querySelector("input");
    send = win.querySelector(".chat-send");

    bubble("bot", WELCOME);
    history.forEach(function (m) { bubble(m.role === "user" ? "user" : "bot", m.content); });
    if (!history.length) chips();

    fab.addEventListener("click", function () { toggle(); });
    win.querySelector(".chat-x").addEventListener("click", function () { toggle(false); });
    win.addEventListener("keydown", function (e) { if (e.key === "Escape") toggle(false); });
    win.querySelector("form").addEventListener("submit", function (e) {
      e.preventDefault();
      var v = input.value;
      input.value = "";
      ask(v);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build);
  else build();
})();
