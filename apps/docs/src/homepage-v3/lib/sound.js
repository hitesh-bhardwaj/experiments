/**
 * Sound engine: "tide". Everything is synthesised with the Web Audio API; there are no audio files.
 *
 *   Music bed : an ocean swell (filtered noise), soft FM electric-piano chords every 8s,
 *               distant water droplets on a pentatonic scale.
 *   UI        : droplet on hover (pitched by x position), click, keystroke tick,
 *               a liquid swish that follows pointer speed.
 *   Moments   : hold charge (rising filtered noise + tone), ready ping, release payoff
 *               ('shatter' = sparkle rain, 'signal' = three sonar pings) with a resolving chord,
 *               reform chord, pillar notes, whoosh.
 *
 * Browsers only allow audio after a user gesture, so call `sound.set(true)` from a click
 * (an "Enter with sound" button or a sound toggle).
 *
 *   import { createSound, wireSoundUI } from './sound.js';
 *   const sound = createSound();
 *   button.onclick = () => sound.set(!sound.on);
 *   wireSoundUI(sound);            // hover / click / swish on the whole page
 */

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function createSound() {
  const AC = window.AudioContext || window.webkitAudioContext;
  let ctx = null, master, music, sfx, on = false, noise = null, chordT = null, dropT = null, ci = 0, lastHover = 0, swish = null, hold = null, thV = null;
  const listeners = new Set();

  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  function pan(v) { if (ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = clamp(v, -1, 1); return p; } return ctx.createGain(); }
  function impulse(sec, dec) { /* synthetic reverb tail */
    const r = ctx.sampleRate, n = Math.floor(r * sec), b = ctx.createBuffer(2, n, r);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, dec); }
    return b;
  }
  const onVis = () => { if (!ctx) return; if (document.hidden) ctx.suspend(); else if (on) ctx.resume(); };

  function init() {
    if (ctx) return true; if (!AC) return false;
    try { ctx = new AC(); } catch (e) { return false; }
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -20; comp.ratio.value = 2.5; comp.connect(ctx.destination);
    master = ctx.createGain(); master.gain.value = 0.8; master.connect(comp);
    const rev = ctx.createConvolver(); rev.buffer = impulse(6.5, 2.2); const rg = ctx.createGain(); rg.gain.value = 0.7; rev.connect(rg); rg.connect(master);
    music = ctx.createGain(); music.gain.value = 0; music.connect(master); const ms = ctx.createGain(); ms.gain.value = 0.6; music.connect(ms); ms.connect(rev);
    sfx = ctx.createGain(); sfx.gain.value = 0; sfx.connect(master); const ss = ctx.createGain(); ss.gain.value = 0.45; sfx.connect(ss); ss.connect(rev);
    /* brown-ish noise buffer, reused by the ocean, swish, hold and whoosh */
    noise = ctx.createBuffer(2, ctx.sampleRate * 4, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const nd = noise.getChannelData(c); let last = 0; for (let i = 0; i < nd.length; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; nd[i] = last * 3.2; } }
    /* ocean: two offset swells, stereo */
    [[-0.6, 0.083], [0.6, 0.061]].forEach(([p0, rate]) => {
      const s = ctx.createBufferSource(); s.buffer = noise; s.loop = true;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500; lp.Q.value = 0.3;
      const g = ctx.createGain(); g.gain.value = 0.035;
      const l1 = ctx.createOscillator(); l1.frequency.value = rate; const l1g = ctx.createGain(); l1g.gain.value = 0.03; l1.connect(l1g); l1g.connect(g.gain);
      const l2 = ctx.createOscillator(); l2.frequency.value = rate; const l2g = ctx.createGain(); l2g.gain.value = 420; l2.connect(l2g); l2g.connect(lp.frequency);
      const p = pan(p0); s.connect(lp); lp.connect(g); g.connect(p); p.connect(music); s.start(0, Math.random() * 3); l1.start(); l2.start();
    });
    /* liquid swish, driven by pointer speed */
    const sw = ctx.createBufferSource(); sw.buffer = noise; sw.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.1; bp.frequency.value = 600;
    const sg = ctx.createGain(); sg.gain.value = 0; sw.connect(bp); bp.connect(sg); sg.connect(sfx); sw.start(); swish = { g: sg, f: bp };
    document.addEventListener('visibilitychange', onVis);
    return true;
  }

  /* FM electric piano voice */
  function ep(m, t, vel, dest, p, len = 5) {
    const f = mtof(m), car = ctx.createOscillator(), mod = ctx.createOscillator(), mg = ctx.createGain(), g = ctx.createGain(), tr = ctx.createOscillator(), tg = ctx.createGain();
    car.frequency.value = f; mod.frequency.value = f;
    mg.gain.setValueAtTime(f * 2.2, t); mg.gain.exponentialRampToValueAtTime(f * 0.25, t + 1.2); mod.connect(mg); mg.connect(car.frequency);
    tr.frequency.value = 4.2; tg.gain.value = vel * 0.18; tr.connect(tg); tg.connect(g.gain);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel, t + 0.012); g.gain.exponentialRampToValueAtTime(vel * 0.35, t + 1.4); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    const pn = pan(p || 0); car.connect(g); g.connect(pn); pn.connect(dest);
    [car, mod, tr].forEach((o) => { o.start(t); o.stop(t + len + 0.1); });
  }
  const CH = [[41, 53, 57, 60, 64, 67], [40, 52, 55, 59, 62, 66], [38, 50, 53, 57, 60, 64], [36, 48, 52, 55, 59, 62]];
  const PENTA = [72, 74, 77, 79, 81, 84, 86, 89];
  function emitPulse(v) { listeners.forEach((fn) => { try { fn(v); } catch (e) { /* ignore */ } }); }
  function chord() {
    if (!on) return; const t = ctx.currentTime + 0.05, c = CH[ci++ % CH.length]; emitPulse(1);
    c.forEach((m, k) => ep(m, t + k * 0.09 + Math.random() * 0.03, k === 0 ? 0.05 : 0.028, music, (k / (c.length - 1) - 0.5) * 0.8, 7));
    const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = mtof(c[0] - 12);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.05, t + 2); g.gain.linearRampToValueAtTime(0, t + 8); o.connect(g); g.connect(music); o.start(t); o.stop(t + 8.2);
  }
  /* kalimba: struck partials with fast decay (Theremin's hover voice for buttons, nav and cards) */
  function kal(m, t, vol, dest, p) {
    const f = mtof(m);
    [[1, 1, 0.9], [2.99, 0.28, 0.25], [5.4, 0.1, 0.12]].forEach(([ratio, amp, len]) => {
      const o = ctx.createOscillator(), g = ctx.createGain(), pn = pan(p || 0);
      o.frequency.value = f * ratio;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol * amp, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + len * 2.2);
      o.connect(g); g.connect(pn); pn.connect(dest); o.start(t); o.stop(t + len * 2.2 + 0.05);
    });
  }
  /* small glass bell (Theremin's primary-button hover) */
  function bellG(m, vol, p) {
    const t = ctx.currentTime, f = mtof(m);
    [[1, 1], [2.756, 0.3], [5.404, 0.1]].forEach(([ratio, amp]) => {
      const o = ctx.createOscillator(), g = ctx.createGain(), pn = pan(p || 0);
      o.frequency.value = f * ratio;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol * amp, t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4 / Math.sqrt(ratio));
      o.connect(g); g.connect(pn); pn.connect(sfx); o.start(t); o.stop(t + 1.5);
    });
  }
  function droplet(m, vol, dest, p, t0) {
    const t = t0 || ctx.currentTime, f = mtof(m), o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine';
    o.frequency.setValueAtTime(f * 0.62, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.045);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
    const pn = pan(p || 0); o.connect(g); g.connect(pn); pn.connect(dest); o.start(t); o.stop(t + 0.36);
  }
  function drops() {
    if (!on) return; const m = PENTA[(Math.random() * PENTA.length) | 0]; emitPulse(0.4);
    droplet(m + 12, 0.02, music, (Math.random() - 0.5) * 1.6);
    if (Math.random() < 0.4) droplet(m + 7 + 12, 0.014, music, (Math.random() - 0.5) * 1.6, ctx.currentTime + 0.18);
    dropT = setTimeout(drops, 3500 + Math.random() * 6000);
  }

  const api = {
    get on() { return on; },
    /** turn sound on/off. Must be called from a user gesture the first time. Returns the new state */
    set(v) {
      if (v && !init()) return false;
      on = !!v; if (!ctx) return on;
      const t = ctx.currentTime; music.gain.cancelScheduledValues(t); music.gain.setValueAtTime(music.gain.value, t);
      if (on) {
        if (ctx.state === 'suspended') ctx.resume();
        music.gain.linearRampToValueAtTime(1, t + 4); sfx.gain.setValueAtTime(1, t);
        clearInterval(chordT); clearTimeout(dropT); chord(); chordT = setInterval(chord, 8000); dropT = setTimeout(drops, 3000);
      } else {
        music.gain.linearRampToValueAtTime(0, t + 1.5); sfx.gain.setValueAtTime(0, t + 0.05); clearInterval(chordT); clearTimeout(dropT);
      }
      return on;
    },
    /** subscribe to musical pulses (1 = chord, 0.4 = droplet) to drive visuals. Returns an unsubscribe fn */
    onPulse(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    /**
     * hover sound, as on the Theremin homepage: x = 0..1 horizontal position picks the pitch, and
     * `kind` the voice - 'nav' (filtered tick + low kalimba), 'primary' (bell), 'secondary'
     * (kalimba), 'card' (two-note kalimba), 'link' (high droplet), anything else a droplet
     */
    hover(x = 0.5, kind = '') {
      if (!on) return;
      const n = performance.now(); if (n - lastHover < 80) return; lastHover = n;
      const i = clamp(Math.floor(x * PENTA.length), 0, PENTA.length - 1), m = PENTA[i], p = clamp(x * 2 - 1, -0.8, 0.8), t = ctx.currentTime;
      if (kind === 'nav') {
        const s2 = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
        s2.buffer = noise; bp.type = 'bandpass'; bp.frequency.value = 1800 + i * 120; bp.Q.value = 6;
        g.gain.setValueAtTime(0.09, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
        s2.connect(bp); bp.connect(g); g.connect(sfx); s2.start(t, Math.random() * 3); s2.stop(t + 0.08);
        kal(m - 12, t, 0.018, sfx, p);
      } else if (kind === 'primary') bellG(m, 0.04, p);
      else if (kind === 'secondary') kal(m, t, 0.04, sfx, p);
      else if (kind === 'card') { kal(m - 12, t, 0.045, sfx, p); kal(m - 5, t + 0.07, 0.02, sfx, p); }
      else if (kind === 'link') droplet(m + 12, 0.025, sfx, p);
      else droplet(m, 0.045, sfx, p);
    },
    click() { if (!on) return; const t = ctx.currentTime; droplet(62, 0.07, sfx, 0); ep(74, t + 0.02, 0.03, sfx, 0, 2.5); },
    /** soft piano note, i = 0..4 (e.g. per tab or panel) */
    note(i) { if (!on) return; ep([69, 72, 76, 79, 81][i % 5], ctx.currentTime, 0.035, sfx, ((i % 5) - 2) * 0.25, 3.5); },
    /** keystroke tick (typing effects) */
    key() { if (!on) return; const t = ctx.currentTime, s = ctx.createBufferSource(); s.buffer = noise; const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 3500; const g = ctx.createGain(); g.gain.setValueAtTime(0.025, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03); s.connect(f); f.connect(g); g.connect(sfx); s.start(t, Math.random() * 3); s.stop(t + 0.04); },
    /** liquid swish level, speed = 0..1 */
    flow(speed) { if (!on || !swish) return; const t = ctx.currentTime, s = clamp(speed, 0, 1); swish.g.gain.setTargetAtTime(s * 0.07, t, 0.12); swish.f.frequency.setTargetAtTime(380 + s * 1400, t, 0.15); },
    holdStart() {
      if (!on) return; const t = ctx.currentTime, s = ctx.createBufferSource(); s.buffer = noise; s.loop = true;
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 3; f.frequency.setValueAtTime(250, t); f.frequency.exponentialRampToValueAtTime(2200, t + 1.4);
      const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.12, t + 1.3); s.connect(f); f.connect(g); g.connect(sfx); s.start(t);
      const o = ctx.createOscillator(), og = ctx.createGain(); o.frequency.setValueAtTime(mtof(50), t); o.frequency.exponentialRampToValueAtTime(mtof(62), t + 1.4);
      og.gain.setValueAtTime(0, t); og.gain.linearRampToValueAtTime(0.05, t + 1.2); o.connect(og); og.connect(sfx); o.start(t); hold = { s, g, o, og };
    },
    /** stop the hold sound; full=false plays a small "let go" droplet */
    holdEnd(full) {
      if (!ctx) return; const t = ctx.currentTime;
      if (hold) {
        hold.g.gain.cancelScheduledValues(t); hold.g.gain.setValueAtTime(hold.g.gain.value, t); hold.g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
        hold.og.gain.cancelScheduledValues(t); hold.og.gain.setValueAtTime(hold.og.gain.value, t); hold.og.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
        hold.s.stop(t + 0.7); hold.o.stop(t + 0.9); hold = null;
      }
      if (!on) return; if (!full) droplet(67, 0.05, sfx, 0);
    },
    /** fully charged ping */
    ready() { if (!on) return; const t = ctx.currentTime; droplet(84, 0.04, sfx, -0.2); droplet(91, 0.03, sfx, 0.2, t + 0.06); },
    /** quick tap on an interactive scene */
    tap() { if (!on) return; const t = ctx.currentTime; droplet(79, 0.06, sfx, 0); droplet(86, 0.03, sfx, 0.3, t + 0.07); ep(67, t + 0.02, 0.025, sfx, 0, 2.2); },
    /** the payoff: impact → 'shatter' sparkle rain or 'signal' sonar pings → reverse swell → resolving chord */
    release(kind) {
      if (!on) return; const t = ctx.currentTime;
      const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(28, t + 1.4); g.gain.setValueAtTime(0.42, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6); o.connect(g); g.connect(sfx); o.start(t); o.stop(t + 1.7);
      const n = ctx.createBufferSource(); n.buffer = noise; const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(3000, t); lp.frequency.exponentialRampToValueAtTime(200, t + 0.9); const ng = ctx.createGain(); ng.gain.setValueAtTime(0.3, t); ng.gain.exponentialRampToValueAtTime(0.0001, t + 1); n.connect(lp); lp.connect(ng); ng.connect(sfx); n.start(t); n.stop(t + 1.1);
      if (kind === 'signal') {
        [0, 0.55, 1.1].forEach((d, k) => { const so = ctx.createOscillator(), sg = ctx.createGain(); so.frequency.value = mtof(81 - k * 5); sg.gain.setValueAtTime(0, t + d); sg.gain.linearRampToValueAtTime(0.07, t + d + 0.01); sg.gain.exponentialRampToValueAtTime(0.0001, t + d + 2.2); const pn = pan((k - 1) * 0.6); so.connect(sg); sg.connect(pn); pn.connect(sfx); so.start(t + d); so.stop(t + d + 2.3); });
      } else {
        for (let i = 0; i < 34; i++) { const m = PENTA[(Math.random() * PENTA.length) | 0] + 12 * (Math.random() < 0.5 ? 1 : 2); droplet(m, 0.012 + Math.random() * 0.02, sfx, (Math.random() - 0.5) * 1.8, t + 0.03 + Math.pow(Math.random(), 1.6) * 1.1); }
      }
      const r = ctx.createBufferSource(); r.buffer = noise; r.loop = true; const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.6; bp.frequency.setValueAtTime(260, t + 1.6); bp.frequency.exponentialRampToValueAtTime(2600, t + 3.3); const rg = ctx.createGain(); rg.gain.setValueAtTime(0, t + 1.6); rg.gain.linearRampToValueAtTime(0.09, t + 3.2); rg.gain.linearRampToValueAtTime(0, t + 3.45); r.connect(bp); bp.connect(rg); rg.connect(sfx); r.start(t + 1.6); r.stop(t + 3.6);
      [53, 60, 64, 67, 69, 72, 76].forEach((m, k) => ep(m, t + 3.4 + k * 0.06, k === 0 ? 0.06 : 0.035, sfx, (k / 6 - 0.5) * 0.9, 7));
      [84, 88, 91, 96].forEach((m, k) => droplet(m, 0.025, sfx, (k - 1.5) * 0.4, t + 3.55 + k * 0.12));
    },
    /** gentle chord when something re-forms / arrives */
    reform() { if (!on) return; const t = ctx.currentTime; [64, 69, 71, 76].forEach((m, k) => ep(m, t + k * 0.12, 0.03, sfx, (k - 1.5) * 0.3, 4)); droplet(88, 0.025, sfx, 0, t + 0.5); },
    /** marimba-like note for the pillar field; x,z = 0..1 position on the grid */
    pillar(x, z) {
      if (!on) return; const sc = [57, 60, 62, 64, 67, 69, 72, 74, 76, 79, 81, 84], m = sc[Math.min(sc.length - 1, Math.floor(x * sc.length))] + (z > 0.6 ? 12 : 0), t = ctx.currentTime, f = mtof(m);
      [[1, 0.05, 0.9], [4, 0.012, 0.18], [10, 0.004, 0.06]].forEach(([mul, vol, dur]) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = f * mul; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); const pn = pan(x * 1.6 - 0.8); o.connect(g); g.connect(pn); pn.connect(sfx); o.start(t); o.stop(t + dur + 0.05); });
    },
    /** theremin tone for the wave: level 0..1 (volume), y 0..1 (pitch, 0 = top/high), bright 0..1 (filter) */
    theremin(level, y, bright) {
      if (!ctx || !sfx) return; const t = ctx.currentTime;
      if (!thV) {
        const o = ctx.createOscillator(), o2 = ctx.createOscillator(), vib = ctx.createOscillator(), vg = ctx.createGain(), f = ctx.createBiquadFilter(), g = ctx.createGain(), g2 = ctx.createGain();
        o.type = 'sine'; o2.type = 'triangle'; g2.gain.value = 0.25; vib.frequency.value = 5.2; vg.gain.value = 0; vib.connect(vg); vg.connect(o.frequency); vg.connect(o2.frequency);
        o.connect(f); o2.connect(g2); g2.connect(f); f.type = 'lowpass'; f.frequency.value = 1600; g.gain.value = 0; f.connect(g); g.connect(sfx);
        [o, o2, vib].forEach((n) => n.start()); thV = { o, o2, vg, f, g };
      }
      const sc = [57, 60, 62, 64, 67, 69, 72, 74, 76, 79, 81], fr = mtof(sc[clamp(Math.round((1 - (y ?? 0.5)) * (sc.length - 1)), 0, sc.length - 1)]);
      thV.o.frequency.setTargetAtTime(fr, t, 0.06); thV.o2.frequency.setTargetAtTime(fr, t, 0.06); thV.vg.gain.setTargetAtTime(fr * 0.012 * Math.min(1, level * 2), t, 0.3);
      thV.g.gain.setTargetAtTime(on ? clamp(level, 0, 1) * 0.06 : 0, t, 0.12); thV.f.frequency.setTargetAtTime(900 + (bright || 0) * 2400, t, 0.2);
    },
    /** pluck of the wave string at height y (0 = top) */
    pluckString(y, amt = 1) {
      if (!on) return; const t = ctx.currentTime, sc = [57, 60, 62, 64, 67, 69, 72, 74, 76], m = sc[clamp(Math.round((1 - (y ?? 0.5)) * (sc.length - 1)), 0, sc.length - 1)];
      ep(m, t, 0.04 * amt, sfx, 0, 3); droplet(m + 12, 0.02 * amt, sfx, 0);
    },
    /** "Ship at 60" game sounds: catch (pitched by combo), bug, level, power, over, open */
    gameSfx(ev, combo) {
      if (!on) return; const t = ctx.currentTime;
      if (ev === 'catch') { const m = PENTA[Math.min(PENTA.length - 1, (combo || 1) % PENTA.length)] + ((combo || 0) >= PENTA.length ? 12 : 0); droplet(m, 0.05, sfx, (Math.random() - 0.5) * 0.6); }
      else if (ev === 'bug') { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.3); g.gain.setValueAtTime(0.18, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35); o.connect(g); g.connect(sfx); o.start(t); o.stop(t + 0.4); }
      else if (ev === 'level') [60, 64, 67, 72].forEach((m, k) => ep(m, t + k * 0.07, 0.035, sfx, (k - 1.5) * 0.3, 3));
      else if (ev === 'power') [84, 88, 91].forEach((m, k) => droplet(m, 0.03, sfx, (k - 1) * 0.4, t + k * 0.06));
      else if (ev === 'over') [67, 64, 60, 55].forEach((m, k) => ep(m, t + k * 0.16, 0.035, sfx, 0, 3));
      else if (ev === 'open') [72, 79, 84, 91].forEach((m, k) => droplet(m, 0.035, sfx, (k - 1.5) * 0.4, t + k * 0.09));
    },
    /** page / overlay transition swoosh */
    whoosh() {
      if (!on) return; const t = ctx.currentTime, s = ctx.createBufferSource(); s.buffer = noise;
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(1800, t + 0.8); f.frequency.exponentialRampToValueAtTime(300, t + 1.8);
      const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.12, t + 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + 2); s.connect(f); f.connect(g); g.connect(sfx); s.start(t); s.stop(t + 2.1);
    },
    /** close the audio context entirely (SPA teardown) */
    destroy() { api.set(false); clearInterval(chordT); clearTimeout(dropT); listeners.clear(); document.removeEventListener('visibilitychange', onVis); thV = null; if (ctx) ctx.close(); ctx = null; },
  };
  return api;
}

/**
 * Which hover voice an element gets (see sound.hover). An explicit `data-sound-kind` wins
 * (ButtonV3 sets primary / secondary); otherwise it goes by where the element sits.
 */
function hoverKind(t) {
  const explicit = t.closest('[data-sound-kind]');
  if (explicit) return explicit.dataset.soundKind;
  if (t.closest('header, nav, [role=dialog][aria-label*="menu" i]')) return 'nav';
  if (t.closest('[role=tab], [role=tablist], article')) return 'card';
  if (t.closest('footer, #faq, details')) return 'link';
  return '';
}

/**
 * Site-wide UI sounds: hover sound on interactive elements (voiced by kind, as on the Theremin
 * homepage), click on buttons/links, and the swish that follows pointer speed. Returns an unwire function.
 */
export function wireSoundUI(sound, { root = document, hover = 'a,button,[role=tab],input[type=range],[data-sound-hover]', click = 'a,button,[data-sound-click]' } = {}) {
  const onOver = (e) => { const t = e.target.closest && e.target.closest(hover); if (t && !t.contains(e.relatedTarget)) sound.hover(e.clientX / innerWidth, hoverKind(t)); };
  const onClick = (e) => { if (e.target.closest && e.target.closest(click)) sound.click(); };
  let lx = -1, ly = -1, raf = 0, speed = 0;
  const onMove = (e) => { if (lx >= 0) speed = Math.max(speed, Math.hypot(e.clientX - lx, e.clientY - ly)); lx = e.clientX; ly = e.clientY; };
  const tick = () => { raf = requestAnimationFrame(tick); sound.flow(speed / 55); speed *= 0.8; };
  root.addEventListener('pointerover', onOver);
  root.addEventListener('click', onClick, true);
  addEventListener('pointermove', onMove, { passive: true });
  raf = requestAnimationFrame(tick);
  return () => { root.removeEventListener('pointerover', onOver); root.removeEventListener('click', onClick, true); removeEventListener('pointermove', onMove); cancelAnimationFrame(raf); };
}
