/* The Gzowo Guide: the chat in the "Gzowo Guide.exe" window. It talks to a Cloudflare Worker (address in data-chat on
   the script tag) that holds the API key and the limits; nothing secret lives here. */

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
  var log, input, send;

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
      a.setAttribute("data-nav", "");
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

  function build() {
    var box = document.querySelector("[data-chat-box]");
    if (!box) return;
    log = box.querySelector(".chat-log");
    input = box.querySelector("input");
    send = box.querySelector(".chat-send");

    bubble("bot", WELCOME);
    history.forEach(function (m) { bubble(m.role === "user" ? "user" : "bot", m.content); });
    if (!history.length) chips();

    box.querySelector("form").addEventListener("submit", function (e) {
      e.preventDefault();
      var v = input.value;
      input.value = "";
      ask(v);
    });
    window.addEventListener("gz:open", function (e) {
      if (e.detail === "guide") setTimeout(function () { input.focus(); }, 60);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build);
  else build();
})();
