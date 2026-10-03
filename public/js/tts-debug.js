/* Sound check for the "read the word aloud" feature.
   Only loaded when the page is opened with ?tts in the address
   (e.g. koalastudymate.com/?tts). It shows what this phone's speech engine
   offers and what really happens when it is asked to speak, so a silent
   speaker can be diagnosed from a screenshot. */
(function () {
  "use strict";
  const t0 = Date.now();
  const stamp = () => ((Date.now() - t0) / 1000).toFixed(2) + "s";

  const root = document.createElement("div");
  root.style.cssText = "position:fixed;inset:0;z-index:2147483000;background:#fff;color:#1b2b27;overflow:auto;padding:12px 12px 40px;font:14px/1.45 system-ui,sans-serif;-webkit-overflow-scrolling:touch;";
  root.innerHTML =
    '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px">' +
    '<b style="font-size:17px">🔧 Sound check</b>' +
    '<button id="ttsd-close" style="font-size:15px;padding:6px 12px;border-radius:10px;border:1px solid #888;background:#f3f3f3">Close ✕</button></div>' +
    '<p style="margin:6px 0 10px">Tap each button, listen, then send a screenshot of this whole screen.</p>' +
    '<div id="ttsd-btns" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px"></div>' +
    '<pre id="ttsd-log" style="white-space:pre-wrap;word-break:break-word;font:12px/1.4 ui-monospace,monospace;background:#f2f6f4;border-radius:10px;padding:10px;margin:0;user-select:text"></pre>';
  document.body.appendChild(root);
  const logEl = root.querySelector("#ttsd-log");
  const btns = root.querySelector("#ttsd-btns");
  root.querySelector("#ttsd-close").onclick = () => root.remove();

  const lines = [];
  function log(msg) {
    lines.push("[" + stamp() + "] " + msg);
    logEl.textContent = lines.join("\n");
  }

  log("UA: " + navigator.userAgent);
  const synth = window.speechSynthesis;
  log("speechSynthesis in window: " + ("speechSynthesis" in window));
  log("SpeechSynthesisUtterance: " + (typeof window.SpeechSynthesisUtterance));
  log("userActivation: " + (navigator.userActivation ? JSON.stringify({ active: navigator.userActivation.isActive, hasBeenActive: navigator.userActivation.hasBeenActive }) : "n/a"));

  if (!synth) { log("=> This browser has no speech synthesis at all."); return; }

  function describeVoices() {
    const vs = synth.getVoices() || [];
    log("voices: " + vs.length + "  (speaking=" + synth.speaking + " pending=" + synth.pending + " paused=" + synth.paused + ")");
    vs.filter((v) => /^(en|ko)/i.test(v.lang || "")).slice(0, 30).forEach((v) => {
      log("  - " + v.name + " | " + v.lang + " | local=" + v.localService + (v.default ? " | default" : ""));
    });
    return vs;
  }

  // The voice list can arrive late.
  let voices = describeVoices();
  synth.onvoiceschanged = () => { log("voiceschanged event"); voices = describeVoices(); };

  function run(label, makeUtter) {
    log("--- " + label);
    let u;
    try { u = makeUtter(); } catch (e) { log("could not build utterance: " + e); return; }
    let started = false;
    u.onstart = () => { started = true; log("start"); };
    u.onend = () => log("end");
    u.onerror = (e) => log("ERROR: " + (e && e.error));
    u.onboundary = () => { if (!u._b) { u._b = 1; log("boundary (engine is producing speech)"); } };
    try { synth.cancel(); } catch (e) { /* ignore */ }
    try { synth.speak(u); log("speak() called (lang=" + u.lang + ", voice=" + (u.voice ? u.voice.name : "none") + ")"); }
    catch (e) { log("speak() threw: " + e); return; }
    setTimeout(() => { if (!started) log("!! no start event after 3s (speaking=" + synth.speaking + " pending=" + synth.pending + " paused=" + synth.paused + ")"); }, 3000);
  }

  function addBtn(label, fn) {
    const b = document.createElement("button");
    b.textContent = label;
    b.style.cssText = "font-size:15px;padding:9px 12px;border-radius:12px;border:1px solid #0e9c7d;background:#e4f7f0;color:#0b6b56";
    b.onclick = fn;
    btns.appendChild(b);
  }

  addBtn("1. Plain", () => run("Plain: no lang, no voice", () => new SpeechSynthesisUtterance("Hello. This is a sound check.")));
  addBtn("2. en-US", () => run("lang=en-US", () => { const u = new SpeechSynthesisUtterance("Hello. This is a sound check."); u.lang = "en-US"; return u; }));
  addBtn("3. en-AU", () => run("lang=en-AU", () => { const u = new SpeechSynthesisUtterance("Hello. This is a sound check."); u.lang = "en-AU"; return u; }));
  addBtn("4. First English voice", () => run("first English voice", () => {
    const v = (synth.getVoices() || []).find((x) => /^en/i.test(x.lang || ""));
    if (!v) throw new Error("no English voice in list");
    const u = new SpeechSynthesisUtterance("Hello. This is a sound check.");
    u.voice = v; u.lang = v.lang; return u;
  }));
  addBtn("5. App speak()", () => {
    log("--- the app's own speak()");
    if (typeof speak === "function") speak("vehicle", { onstart: () => log("app: start"), onend: () => log("app: end") });
    else log("speak() not available");
  });
  addBtn("Reset engine", () => { try { synth.cancel(); synth.resume(); log("cancel() + resume() sent"); } catch (e) { log("reset failed: " + e); } });
})();
