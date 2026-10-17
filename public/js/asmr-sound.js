// Koala Study Mate — ASMR toy sounds.
//
// Every sound is synthesised on the fly with the Web Audio API (nothing to download): short bursts of
// filtered noise and tiny sine "bodies" laid out in a pattern, the way a squeezed squishy, a clicky pen
// or a sheet of bubble wrap sounds. A recipe is a function (ctx, out, rnd) that schedules its events
// and returns how long the sound lasts. Recipes can run on a live AudioContext (play) or an
// OfflineAudioContext (render, used by the tests to check that every sound is audible and not too loud).
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ASMR = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // The categories (a toy box groups its toys by these) and the toys in each.
  const GROUPS = {
    squishy: { ko: "말랑이", en: "Squishies", icon: "🫧" },
    clicky: { ko: "딸깍이", en: "Clickers", icon: "🖱️" },
    popit: { ko: "뽁뽁이", en: "Poppers", icon: "💥" },
    crunch: { ko: "사각사각", en: "Crunchy", icon: "🧂" },
  };

  // small seeded random generator: the same toy always plays the same pattern
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

  /* ---------------- building blocks ---------------- */
  let BASE = 0;   // start time of the sound being scheduled (seconds on the context's clock)
  const noiseCache = new WeakMap();
  function noise(ctx) {
    let b = noiseCache.get(ctx);
    if (!b) {
      const n = Math.floor(ctx.sampleRate * 2), r = rng(7);
      b = ctx.createBuffer(1, n, ctx.sampleRate);
      const d = b.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = r() * 2 - 1;
      noiseCache.set(ctx, b);
    }
    return b;
  }
  // a burst of filtered noise. o: { f, f2 (sweep to), q, type, dur, g, atk, off (start offset into the noise) }
  function burst(ctx, out, t, o) {
    t += BASE;
    const src = ctx.createBufferSource();
    src.buffer = noise(ctx);
    const flt = ctx.createBiquadFilter();
    flt.type = o.type || "bandpass";
    flt.Q.value = o.q == null ? 1 : o.q;
    flt.frequency.setValueAtTime(o.f, t);
    if (o.f2) flt.frequency.exponentialRampToValueAtTime(o.f2, t + o.dur);
    const g = ctx.createGain(), atk = Math.max(0.001, o.atk || 0.002), peak = o.g;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + atk);
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(o.dur, atk + 0.004));
    src.connect(flt); flt.connect(g); g.connect(out);
    src.start(t, o.off || 0, o.dur + 0.05);
    src.stop(t + o.dur + 0.06);
  }
  // a short tone with a pitch glide. o: { f, f2, dur, g, type, atk }
  function tone(ctx, out, t, o) {
    t += BASE;
    const osc = ctx.createOscillator();
    osc.type = o.type || "sine";
    osc.frequency.setValueAtTime(o.f, t);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, t + o.dur);
    const g = ctx.createGain(), atk = Math.max(0.001, o.atk || 0.002);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(o.g, t + atk);
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(o.dur, atk + 0.004));
    osc.connect(g); g.connect(out);
    osc.start(t); osc.stop(t + o.dur + 0.03);
  }
  const between = (r, a, b) => a + (b - a) * r();

  /* ---------------- the recipes ---------------- */
  // Squeeze: a soft low "mmm" of air and a body that sinks, then springs back with a little puff.
  function squeeze(ctx, out, t, r, o) {
    const len = o.len || 0.5;
    burst(ctx, out, t, { type: "lowpass", f: o.f || 520, f2: (o.f || 520) * 0.4, q: 0.6, dur: len, atk: len * 0.35, g: 0.34 });
    tone(ctx, out, t, { f: o.body || 150, f2: (o.body || 150) * 0.6, dur: len, atk: len * 0.3, g: 0.16 });
    const t2 = t + len;   // let go
    tone(ctx, out, t2, { f: (o.body || 150) * 0.7, f2: (o.body || 150) * 1.25, dur: 0.12, g: 0.13 });
    burst(ctx, out, t2, { type: "bandpass", f: 1400, f2: 700, q: 0.9, dur: 0.18, atk: 0.01, g: 0.12 });
  }
  const RECIPES = {
    // ---- squishies ----
    mochi(ctx, out, r) {
      let t = 0.15;
      for (let i = 0; i < 5; i++) { squeeze(ctx, out, t, r, { len: between(r, 0.35, 0.6), f: 520, body: 160 }); t += between(r, 1.0, 1.25); }
      return t + 0.3;
    },
    slime(ctx, out, r) {
      let t = 0.1;
      for (let i = 0; i < 16; i++) {
        const f = between(r, 260, 760);
        tone(ctx, out, t, { f, f2: f * between(r, 1.6, 2.4), dur: between(r, 0.04, 0.09), g: between(r, 0.08, 0.17) });
        if (r() < 0.55) burst(ctx, out, t, { type: "bandpass", f: between(r, 500, 900), f2: between(r, 250, 500), q: 3, dur: between(r, 0.08, 0.2), g: 0.12 });
        if (i % 5 === 4) burst(ctx, out, t + 0.05, { type: "bandpass", f: 400, f2: 1200, q: 2.5, dur: 0.45, atk: 0.12, g: 0.1 });   // a stretchy pull
        t += between(r, 0.12, 0.42);
      }
      return t + 0.4;
    },
    tofu(ctx, out, r) {
      let t = 0.2;
      for (let i = 0; i < 12; i++) {
        tone(ctx, out, t, { f: 130, f2: 70, dur: 0.1, g: 0.28 });
        burst(ctx, out, t, { type: "lowpass", f: 500, q: 0.5, dur: 0.07, g: 0.2 });
        if (i % 4 === 3) { tone(ctx, out, t + 0.06, { f: 210, f2: 150, dur: 0.35, g: 0.07, atk: 0.05 }); t += 0.55; } else t += between(r, 0.28, 0.4);
      }
      return t + 0.4;
    },
    jelly(ctx, out, r) {
      let t = 0.15;
      for (let i = 0; i < 6; i++) {
        burst(ctx, out, t, { type: "bandpass", f: 950, f2: 380, q: 2, dur: 0.35, atk: 0.06, g: 0.22 });
        tone(ctx, out, t, { f: 230, f2: 140, dur: 0.3, atk: 0.05, g: 0.1, type: "triangle" });
        for (let k = 0; k < 3; k++) tone(ctx, out, t + 0.32 + k * 0.09, { f: 190 - k * 25, f2: 170 - k * 25, dur: 0.1, g: 0.07 - k * 0.015, type: "triangle" });   // the jiggle
        t += between(r, 0.85, 1.05);
      }
      return t + 0.3;
    },
    // ---- clickers ----
    clickPen(ctx, out, r) {
      let t = 0.2;
      for (let i = 0; i < 7; i++) {
        burst(ctx, out, t, { f: 3400, q: 7, dur: 0.02, g: 0.4 });
        tone(ctx, out, t, { f: 2300, f2: 1400, dur: 0.012, g: 0.18, type: "square" });
        tone(ctx, out, t + 0.002, { f: 380, f2: 260, dur: 0.04, g: 0.22 });
        const t2 = t + between(r, 0.075, 0.1);   // the spring lets go
        burst(ctx, out, t2, { f: 2600, q: 6, dur: 0.018, g: 0.26 });
        tone(ctx, out, t2, { f: 5200, dur: 0.07, g: 0.025 });
        t += i % 2 ? between(r, 0.7, 0.9) : between(r, 0.28, 0.4);
      }
      return t + 0.3;
    },
    keySwitch(ctx, out, r) {
      let t = 0.2;
      for (let burstN = 0; burstN < 4; burstN++) {
        const keys = 4 + Math.floor(r() * 3);
        for (let i = 0; i < keys; i++) {
          const v = between(r, 0.8, 1.15);
          tone(ctx, out, t, { f: 230 * v, f2: 120 * v, dur: 0.06, g: 0.3 });
          burst(ctx, out, t, { type: "lowpass", f: 1000, q: 0.7, dur: 0.035, g: 0.25 });
          burst(ctx, out, t + 0.004, { f: 2700 * v, q: 3, dur: 0.012, g: 0.17 });   // the clack on top
          burst(ctx, out, t + 0.07, { f: 1800, q: 3, dur: 0.01, g: 0.06 });         // the key coming back up
          t += between(r, 0.1, 0.19);
        }
        t += between(r, 0.5, 0.8);
      }
      return t + 0.2;
    },
    fidget(ctx, out, r) {
      let t = 0.2;
      const click = (f, g) => { burst(ctx, out, t, { f, q: 4, dur: 0.02, g }); tone(ctx, out, t, { f: f / 5, f2: f / 8, dur: 0.03, g: g * 0.5 }); };
      for (let round = 0; round < 3; round++) {
        for (let i = 0; i < 4; i++) { click(between(r, 1500, 2100), 0.32); t += between(r, 0.11, 0.17); }   // gear clicks
        t += 0.25;
        for (let i = 0; i < 12; i++) { click(1100 + i * 40, 0.17); t += 0.03 + i * 0.004; }               // the roller "brrr"
        t += 0.3;
        click(750, 0.4); t += 0.18; click(980, 0.34); t += 0.5;                                              // the switch
      }
      return t;
    },
    clicker(ctx, out, r) {
      let t = 0.2;
      for (let i = 0; i < 9; i++) {
        tone(ctx, out, t, { f: 1900, f2: 900, dur: 0.012, g: 0.2, type: "triangle" });
        burst(ctx, out, t, { f: 4200, q: 4, dur: 0.012, g: 0.3 });
        tone(ctx, out, t, { f: 420, f2: 260, dur: 0.035, g: 0.26 });
        burst(ctx, out, t + 0.06, { f: 3000, q: 4, dur: 0.01, g: 0.16 });
        t += between(r, 0.38, 0.62);
      }
      return t + 0.2;
    },
    // ---- poppers ----
    bubbleWrap(ctx, out, r) {
      let t = 0.15;
      for (let n = 0; n < 6; n++) {
        const run = 1 + Math.floor(r() * 4);
        for (let i = 0; i < run; i++) {
          burst(ctx, out, t, { type: "highpass", f: 1400, q: 0.5, dur: 0.02, g: 0.45 });
          burst(ctx, out, t, { f: between(r, 2400, 3800), q: 3, dur: 0.03, g: 0.3 });
          tone(ctx, out, t, { f: between(r, 380, 560), f2: 140, dur: 0.03, g: 0.22 });
          t += between(r, 0.07, 0.12);
        }
        t += between(r, 0.35, 0.65);
      }
      return t + 0.2;
    },
    pushPop(ctx, out, r) {
      let t = 0.2;
      for (let i = 0; i < 12; i++) {
        const base = between(r, 480, 640);
        if (i % 2 === 0) { tone(ctx, out, t, { f: base, f2: base * 0.42, dur: 0.07, g: 0.36 }); burst(ctx, out, t, { f: 2200, q: 2, dur: 0.018, g: 0.18 }); }   // push in: "pop!"
        else { tone(ctx, out, t, { f: base * 0.5, f2: base * 1.15, dur: 0.07, g: 0.3 }); burst(ctx, out, t, { f: 1800, q: 2, dur: 0.016, g: 0.14 }); }              // flip back
        t += between(r, 0.17, 0.3);
        if (i % 4 === 3) t += 0.3;
      }
      return t + 0.2;
    },
    popBoba(ctx, out, r) {
      let t = 0.15;
      for (let i = 0; i < 14; i++) {
        burst(ctx, out, t, { f: between(r, 1500, 2300), q: 1.8, dur: 0.035, g: 0.34 });
        burst(ctx, out, t + 0.01, { type: "lowpass", f: 700, q: 0.6, dur: 0.07, g: 0.22 });   // the juicy squirt
        tone(ctx, out, t, { f: between(r, 500, 800), f2: 230, dur: 0.04, g: 0.12 });
        t += between(r, 0.15, 0.5);
      }
      return t + 0.3;
    },
    waterBeads(ctx, out, r) {
      let t = 0.1;
      for (let i = 0; i < 30; i++) {
        const f = between(r, 380, 900);
        tone(ctx, out, t, { f, f2: f * 0.5, dur: 0.035, g: between(r, 0.07, 0.17) });
        burst(ctx, out, t, { type: "lowpass", f: between(r, 600, 1100), q: 0.5, dur: 0.045, g: 0.15 });
        t += between(r, 0.05, 0.28);
      }
      return t + 0.3;
    },
    // ---- crunchy ----
    kineticSand(ctx, out, r) {
      let t = 0.15;
      for (let n = 0; n < 5; n++) {
        const len = between(r, 0.6, 0.95);   // a slice through the sand: a swell of "shhh" made of tiny grains
        burst(ctx, out, t, { f: 2800, f2: between(r, 1800, 4200), q: 0.7, dur: len, atk: len * 0.4, g: 0.2 });
        for (let k = 0; k < len * 60; k++) burst(ctx, out, t + r() * len, { f: between(r, 2500, 6500), q: 1.2, dur: 0.012, g: between(r, 0.03, 0.09), off: r() * 1.5 });
        tone(ctx, out, t + len, { f: 120, f2: 80, dur: 0.12, g: 0.14 });   // the crumbly lump landing
        t += len + between(r, 0.3, 0.55);
      }
      return t + 0.2;
    },
    soapCut(ctx, out, r) {
      let t = 0.2;
      for (let i = 0; i < 7; i++) {
        const len = between(r, 0.12, 0.2);
        for (let k = 0; k < 9; k++) burst(ctx, out, t + (k / 9) * len, { type: "highpass", f: between(r, 1400, 2600), q: 0.7, dur: 0.016, g: between(r, 0.12, 0.3), off: r() * 1.5 });
        burst(ctx, out, t, { type: "lowpass", f: 900, q: 0.5, dur: len, g: 0.1 });
        tone(ctx, out, t + len, { f: 210, f2: 120, dur: 0.05, g: 0.2 });   // the slice drops
        t += len + between(r, 0.4, 0.65);
      }
      return t + 0.2;
    },
    ice(ctx, out, r) {
      let t = 0.15;
      for (let n = 0; n < 6; n++) {
        const bits = 5 + Math.floor(r() * 5);
        for (let k = 0; k < bits; k++) {
          burst(ctx, out, t, { f: between(r, 2300, 5200), q: 3, dur: between(r, 0.006, 0.014), g: between(r, 0.2, 0.42) * (1 - k / (bits + 2)), off: r() * 1.5 });
          if (r() < 0.4) tone(ctx, out, t, { f: between(r, 3500, 6500), dur: 0.07, g: 0.025 });   // a little crystal tinkle
          t += between(r, 0.012, 0.045);
        }
        tone(ctx, out, t, { f: 170, f2: 110, dur: 0.06, g: 0.16 });
        t += between(r, 0.45, 0.8);
      }
      return t + 0.2;
    },
    scratch(ctx, out, r) {
      let t = 0.15, up = true;
      for (let i = 0; i < 8; i++) {
        const len = between(r, 0.18, 0.32), a = up ? 2300 : 4300, b = up ? 4300 : 2300;
        burst(ctx, out, t, { f: a, f2: b, q: 5, dur: len, atk: 0.03, g: 0.26 });
        for (let k = 0; k < len * 55; k++) burst(ctx, out, t + r() * len, { f: between(r, 3000, 7000), q: 2, dur: 0.008, g: between(r, 0.03, 0.1), off: r() * 1.5 });
        up = !up;
        t += len + between(r, 0.08, 0.3);
      }
      return t + 0.2;
    },
  };

  // sound id (the toy's id in koala-core's SUB_ITEMS) -> recipe + a gain trim so the toys play about equally loud
  const TOYS = {
    mochiSquish: { recipe: "mochi", group: "squishy", trim: 1.32 },
    slimeSquish: { recipe: "slime", group: "squishy", trim: 3.16 },
    tofuSquish: { recipe: "tofu", group: "squishy", trim: 1.6 },
    jellySquish: { recipe: "jelly", group: "squishy", trim: 3.16 },
    clickPen: { recipe: "clickPen", group: "clicky", trim: 2.88 },
    keySwitch: { recipe: "keySwitch", group: "clicky", trim: 1.58 },
    fidgetCube: { recipe: "fidget", group: "clicky", trim: 3.2 },
    clickerBtn: { recipe: "clicker", group: "clicky", trim: 2.0 },
    bubbleWrap: { recipe: "bubbleWrap", group: "popit", trim: 1.58 },
    pushPop: { recipe: "pushPop", group: "popit", trim: 1.53 },
    popBoba: { recipe: "popBoba", group: "popit", trim: 3.72 },
    waterBeads: { recipe: "waterBeads", group: "popit", trim: 3.27 },
    kineticSand: { recipe: "kineticSand", group: "crunch", trim: 2.09 },
    soapCut: { recipe: "soapCut", group: "crunch", trim: 2.4 },
    iceCrunch: { recipe: "ice", group: "crunch", trim: 3.63 },
    scratchPad: { recipe: "scratch", group: "crunch", trim: 5.89 },
  };

  // Put the recipe's events on ctx, going to dest, starting at "when" (seconds on ctx's clock). Returns the length in seconds.
  function schedule(ctx, dest, id, when) {
    const toy = TOYS[id];
    if (!toy) return 0;
    const bus = ctx.createGain();
    bus.gain.value = toy.trim;
    bus.connect(dest);
    BASE = when || 0;
    try { return RECIPES[toy.recipe](ctx, bus, rng(hash(id))); } finally { BASE = 0; }
  }

  /* ---------------- playing on the page ---------------- */
  // master volume + a compressor, so that a sudden loud click can never hurt ears in earphones
  function bus(ctx) {
    const master = ctx.createGain(); master.gain.value = 0.55;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -20; comp.knee.value = 12; comp.ratio.value = 6; comp.attack.value = 0.002; comp.release.value = 0.12;
    master.connect(comp); comp.connect(ctx.destination);
    return master;
  }
  let live = null;     // { ctx, master, playing: id|null, timer }
  function ensure() {
    if (typeof window === "undefined") return null;
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch (e) { /* not supported */ }
    if (!live) { const ctx = new C(); live = { ctx, master: bus(ctx), playing: null, timer: 0 }; }
    if (live.ctx.state !== "running") live.ctx.resume().catch(() => {});
    return live;
  }
  const listeners = [];
  const emit = () => listeners.slice().forEach((f) => { try { f(live ? live.playing : null); } catch (e) { /* a listener must not break the sound */ } });
  function stop() {
    if (!live) return;
    clearTimeout(live.timer);
    live.playing = null;
    // drop everything that is still scheduled: swap the master bus for a fresh one
    try { live.master.disconnect(); } catch (e) { /* already gone */ }
    live.master = bus(live.ctx);
    emit();
  }
  // Start a toy's sound (stops whatever was playing). Must be called from a tap so that phones let it play.
  function play(id) {
    if (!TOYS[id]) return false;
    const L = ensure();
    if (!L) return false;
    stop();
    const len = schedule(L.ctx, L.master, id, L.ctx.currentTime + 0.06);   // not at 0: the clock keeps running, so a later play would otherwise be scheduled in the past (silent)
    L.playing = id;
    L.timer = setTimeout(() => { if (live && live.playing === id) { live.playing = null; emit(); } }, Math.ceil(len * 1000) + 150);
    emit();
    return true;
  }
  const toggle = (id) => (live && live.playing === id ? (stop(), false) : play(id));
  const isPlaying = (id) => !!live && live.playing === id;
  const onChange = (f) => { listeners.push(f); return () => { const i = listeners.indexOf(f); if (i >= 0) listeners.splice(i, 1); }; };
  const has = (id) => !!TOYS[id];

  return { GROUPS, TOYS, RECIPES, bus, schedule, play, stop, toggle, isPlaying, onChange, has };
});
