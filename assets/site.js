/* Gzowo Labs 1998 — the tiny pile of scripts every homepage of that era had.
   No libraries: a sparkle trail, a hit counter, today's date, and a MIDI-ish
   theme you have to press play on. Everything bails out under reduced motion. */

(function () {
  var calm = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- today's date, the way every GeoCities page announced it ---- */
  var stamp = document.querySelector("[data-today]");
  if (stamp) {
    stamp.textContent = new Date().toLocaleDateString("en-US", {
      weekday: "long", year: "numeric", month: "long", day: "numeric"
    });
  }

  /* ---- hit counter. It only counts this browser, which is exactly as
     honest as the CGI counters it imitates. ---- */
  var counter = document.querySelector("[data-counter]");
  if (counter) {
    var hits = 4233851;
    try {
      hits = parseInt(localStorage.getItem("gl-hits") || "0", 10) || 4233851;
      hits += 1;
      localStorage.setItem("gl-hits", String(hits));
    } catch (e) { /* private mode: show the seed */ }
    String(hits).padStart(8, "0").split("").forEach(function (d) {
      var cell = document.createElement("span");
      cell.textContent = d;
      counter.appendChild(cell);
    });
  }

  /* ---- sparkle cursor trail ---- */
  if (!calm && window.matchMedia("(pointer: fine)").matches) {
    var last = 0;
    document.addEventListener("mousemove", function (e) {
      var now = e.timeStamp;
      if (now - last < 40) return;
      last = now;
      var s = document.createElement("div");
      s.className = "sparkle";
      s.style.left = e.clientX - 4 + "px";
      s.style.top = e.clientY - 4 + "px";
      document.body.appendChild(s);
      setTimeout(function () { s.remove(); }, 700);
    }, { passive: true });
  }

  /* ---- the background music button. Square waves, no audio file, and it
     never autoplays — the one 1998 habit worth dropping. ---- */
  var midi = document.querySelector("[data-midi]");
  if (midi) {
    var ctx = null, timer = null, step = 0;
    var notes = [523, 659, 784, 659, 587, 494, 587, 523, 440, 523, 659, 523];
    function stop() {
      clearInterval(timer); timer = null;
      midi.textContent = "♪ PLAY MIDI ♪";
    }
    midi.addEventListener("click", function () {
      if (timer) { stop(); return; }
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      ctx.resume();
      midi.textContent = "■ STOP MIDI";
      step = 0;
      var beat = function () {
        var osc = ctx.createOscillator(), gain = ctx.createGain();
        osc.type = "square";
        osc.frequency.value = notes[step % notes.length];
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
        osc.connect(gain).connect(ctx.destination);
        osc.start(); osc.stop(ctx.currentTime + 0.24);
        step++;
      };
      beat();
      timer = setInterval(beat, 250);
    });
  }
})();
