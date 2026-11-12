// Original synthwave score and sound effects for the teaser trailer, made live with Web Audio.
// Driven by the trailer clock: update(t) is called every frame with the trailer time in seconds.
window.TeaserAudio = (() => {
  let ac = null, master, comp, verb, delay, delayFb, on = false, lastT = 0, lastStep = -1;
  const fired = new Set();
  const STEP = 60 / 108 / 4;                                // 16th notes at 108 bpm
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  // D minor: Dm, Bb, Gm, A (the A major chord gives the turnaround its tension)
  const CHORDS = [[50, 53, 57], [46, 50, 53], [43, 46, 50], [45, 49, 52]];
  const ARP = [0, 2, 1, 2, 4, 2, 1, 2, 0, 2, 1, 2, 5, 4, 3, 2];  // indexes into an extended chord
  const ext = ch => [ch[0], ch[1], ch[2], ch[0] + 12, ch[1] + 12, ch[2] + 12];

  function init() {
    ac = new (window.AudioContext || window.webkitAudioContext)();
    comp = ac.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 12; comp.knee.value = 6; comp.attack.value = 0.002;
    master = ac.createGain(); master.gain.value = 0.72; master.connect(comp); comp.connect(ac.destination);
    // a long dark reverb from a decaying noise burst
    verb = ac.createConvolver();
    const len = ac.sampleRate * 3, ir = ac.createBuffer(2, len, ac.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
    verb.buffer = ir; const vg = ac.createGain(); vg.gain.value = 0.45; verb.connect(vg); vg.connect(master);
    // ping-pong-ish echo for the arpeggio
    delay = ac.createDelay(1); delay.delayTime.value = STEP * 3; delayFb = ac.createGain(); delayFb.gain.value = 0.38;
    const dg = ac.createGain(); dg.gain.value = 0.35; delay.connect(delayFb); delayFb.connect(delay); delay.connect(dg); dg.connect(master);
  }
  const now = () => ac.currentTime + 0.01;
  function out(node, { dry = 1, rev = 0, echo = 0 } = {}) {
    if (dry) { const g = ac.createGain(); g.gain.value = dry; node.connect(g); g.connect(master); }
    if (rev) { const g = ac.createGain(); g.gain.value = rev; node.connect(g); g.connect(verb); }
    if (echo) { const g = ac.createGain(); g.gain.value = echo; node.connect(g); g.connect(delay); }
  }
  function env(g, t, a, peak, dec, sus, rel, len) {
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.linearRampToValueAtTime(peak * sus, t + a + dec); g.gain.setValueAtTime(peak * sus, t + len);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len + rel);
  }
  function synth({ freq, type = 'sawtooth', len = 0.2, vol = 0.2, a = 0.005, d = 0.1, s = 0.5, r = 0.15, cutoff = 1200, q = 4, detune = 0, sweepTo, ...route }) {
    const t = now(), o = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t); o.detune.value = detune;
    if (sweepTo) o.frequency.exponentialRampToValueAtTime(sweepTo, t + len + r);
    f.type = 'lowpass'; f.frequency.value = cutoff; f.Q.value = q;
    o.connect(f); f.connect(g); env(g, t, a, vol, d, s, r, len);
    o.start(t); o.stop(t + len + r + 0.05); out(g, route);
    return f;
  }
  function noise({ len = 0.3, vol = 0.3, type = 'lowpass', freq = 800, freqTo, q = 1, a = 0.005, r = 0.2, ...route }) {
    const t = now(), n = ac.createBufferSource(), buf = ac.createBuffer(1, ac.sampleRate * (len + r + 0.1), ac.sampleRate);
    const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    n.buffer = buf; const f = ac.createBiquadFilter(), g = ac.createGain();
    f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (freqTo) f.frequency.exponentialRampToValueAtTime(freqTo, t + len);
    n.connect(f); f.connect(g); env(g, t, a, vol, len * 0.3, 0.6, r, len);
    n.start(t); n.stop(t + len + r + 0.1); out(g, route);
  }

  // ---- instruments ----
  const kick = (vol = 0.9) => synth({ freq: 130, sweepTo: 38, type: 'sine', len: 0.12, vol, d: 0.1, s: 0.3, r: 0.2, cutoff: 800, q: 0 });
  const snare = () => { noise({ len: 0.08, vol: 0.25, type: 'bandpass', freq: 1800, q: 0.8, r: 0.12, rev: 0.4 }); synth({ freq: 190, type: 'triangle', len: 0.05, vol: 0.15, r: 0.08 }); };
  const hat = () => noise({ len: 0.02, vol: 0.07, type: 'highpass', freq: 7000, r: 0.03 });
  const arp = (m, bright) => synth({ freq: mtof(m), type: 'square', len: STEP * 0.6, vol: 0.07, d: 0.06, s: 0.4, r: 0.08, cutoff: bright, q: 6, echo: 0.8, rev: 0.15 });
  const bass = m => synth({ freq: mtof(m - 12), len: STEP * 1.6, vol: 0.18, d: 0.12, s: 0.6, r: 0.06, cutoff: 420, q: 8 });
  const pad = (ch, len, vol = 0.05, cutoff = 900) => ch.forEach(m => [-9, 9].forEach(dt =>
    synth({ freq: mtof(m), len, vol, a: 0.6, d: 0.4, s: 0.8, r: 1.2, cutoff, q: 1, detune: dt, dry: 0.7, rev: 0.6 })));
  const drone = () => { synth({ freq: mtof(26), len: 2.2, vol: 0.2, a: 0.8, d: 0.5, s: 0.9, r: 1.5, cutoff: 260, q: 10, rev: 0.4 }); synth({ freq: mtof(33), type: 'square', len: 2.2, vol: 0.05, a: 1, r: 1.5, cutoff: 300, rev: 0.6 }); };

  // ---- sound effects ----
  const SFX = {
    tape() { noise({ len: 0.05, vol: 0.25, type: 'bandpass', freq: 2500, q: 2, r: 0.02 }); noise({ len: 2.6, vol: 0.025, type: 'highpass', freq: 4000, r: 0.4 }); },
    buzz() { synth({ freq: 60, type: 'square', len: 0.35, vol: 0.06, cutoff: 900, q: 2, r: 0.05 }); noise({ len: 0.08, vol: 0.12, type: 'bandpass', freq: 3200, q: 3, r: 0.02 }); },
    thunder() { noise({ len: 0.2, vol: 0.5, type: 'lowpass', freq: 3000, freqTo: 300, r: 2.4, rev: 0.8 }); synth({ freq: 55, sweepTo: 30, type: 'sine', len: 0.5, vol: 0.5, r: 1.6, cutoff: 200, q: 0 }); },
    rift() { noise({ len: 1.2, vol: 0.28, type: 'bandpass', freq: 200, freqTo: 3200, q: 4, a: 0.6, r: 0.8, rev: 0.7 }); synth({ freq: 40, sweepTo: 90, type: 'sawtooth', len: 1.2, vol: 0.18, a: 0.4, r: 1, cutoff: 300, q: 6, rev: 0.5 }); },
    rise() { synth({ freq: 70, sweepTo: 45, type: 'sawtooth', len: 1.5, vol: 0.14, a: 0.3, r: 0.6, cutoff: 500, q: 10, rev: 0.6 }); noise({ len: 1.4, vol: 0.08, type: 'lowpass', freq: 600, r: 0.5 }); },
    roar() {
      const f = synth({ freq: 110, sweepTo: 55, type: 'sawtooth', len: 1.3, vol: 0.35, a: 0.05, d: 0.3, s: 0.8, r: 0.6, cutoff: 1400, q: 6, rev: 0.6 });
      f.frequency.setValueAtTime(1600, now()); f.frequency.exponentialRampToValueAtTime(300, now() + 1.6);
      synth({ freq: 82, sweepTo: 41, type: 'square', len: 1.3, vol: 0.15, detune: 30, cutoff: 900, r: 0.6, rev: 0.4 });
      noise({ len: 1.3, vol: 0.3, type: 'bandpass', freq: 900, freqTo: 250, q: 1.5, r: 0.6, rev: 0.5 });
    },
    thud() { synth({ freq: 90, sweepTo: 30, type: 'sine', len: 0.15, vol: 0.5, r: 0.3, cutoff: 400, q: 0 }); noise({ len: 0.1, vol: 0.25, type: 'lowpass', freq: 700, r: 0.25 }); },
    twang() { synth({ freq: 520, sweepTo: 300, type: 'triangle', len: 0.06, vol: 0.18, r: 0.12, cutoff: 3000 }); noise({ len: 0.03, vol: 0.1, type: 'highpass', freq: 3000, r: 0.03 }); },
    hit() { noise({ len: 0.04, vol: 0.25, type: 'bandpass', freq: 1200, q: 3, r: 0.05 }); synth({ freq: 300, sweepTo: 180, type: 'square', len: 0.04, vol: 0.08, r: 0.05, cutoff: 1500 }); },
    yelp() { synth({ freq: 900, sweepTo: 1400, type: 'triangle', len: 0.08, vol: 0.12, r: 0.06 }); },
    flee() { noise({ len: 0.9, vol: 0.14, type: 'bandpass', freq: 2800, freqTo: 150, q: 3, r: 0.6, rev: 0.6 }); synth({ freq: 120, sweepTo: 40, type: 'sawtooth', len: 0.9, vol: 0.18, r: 0.6, cutoff: 600, rev: 0.5 }); },
    cheer() { [62, 66, 69, 74].forEach((m, i) => setTimeout(() => on && synth({ freq: mtof(m), type: 'square', len: 0.09, vol: 0.08, r: 0.1, cutoff: 2600, echo: 0.6 }), i * 90)); },
    squelch() { synth({ freq: 180, sweepTo: 60, type: 'sine', len: 0.25, vol: 0.3, r: 0.2, cutoff: 600, q: 0 }); synth({ freq: 240, sweepTo: 120, type: 'triangle', len: 0.15, vol: 0.15, r: 0.15 }); },
    boom() { synth({ freq: 60, sweepTo: 28, type: 'sine', len: 0.6, vol: 0.9, r: 2.2, cutoff: 300, q: 0, rev: 0.6 }); noise({ len: 0.3, vol: 0.3, type: 'lowpass', freq: 2000, freqTo: 200, r: 1.8, rev: 0.9 }); },
    swell() { noise({ len: 1.4, vol: 0.18, type: 'highpass', freq: 400, freqTo: 6000, a: 1.3, r: 0.05, rev: 0.4 }); },
    skid() { noise({ len: 0.35, vol: 0.16, type: 'bandpass', freq: 2400, freqTo: 900, q: 2, r: 0.15 }); },
    whoosh() { noise({ len: 1.5, vol: 0.3, type: 'bandpass', freq: 300, freqTo: 5000, q: 1.2, a: 1.2, r: 0.2, rev: 0.6 }); synth({ freq: 50, sweepTo: 200, type: 'sawtooth', len: 1.5, vol: 0.12, a: 1, r: 0.3, cutoff: 600, q: 8, rev: 0.5 }); },
    hollow() { [38, 45, 50].forEach((m, i) => synth({ freq: mtof(m), type: 'sine', len: 2.4, vol: 0.12, a: 0.5, s: 0.9, r: 1.2, detune: (i - 1) * 14, cutoff: 900, q: 0, rev: 0.9 })); noise({ len: 2.4, vol: 0.05, type: 'bandpass', freq: 700, q: 6, a: 0.8, r: 1, rev: 0.9 }); },
    eye() { synth({ freq: 1760, sweepTo: 1700, type: 'sine', len: 1, vol: 0.09, a: 0.02, r: 0.5, cutoff: 6000, q: 0, rev: 0.8 }); synth({ freq: 46, type: 'sawtooth', len: 1, vol: 0.3, a: 0.05, r: 0.6, cutoff: 400, q: 6, rev: 0.6 }); noise({ len: 0.8, vol: 0.2, type: 'highpass', freq: 800, freqTo: 6000, a: 0.7, r: 0.05 }); },
    jump() { synth({ freq: 300, sweepTo: 900, type: 'square', len: 0.25, vol: 0.08, r: 0.1, cutoff: 2400, echo: 0.4 }); noise({ len: 0.2, vol: 0.12, type: 'bandpass', freq: 1500, q: 2, r: 0.1 }); },
    shock() { synth({ freq: 70, sweepTo: 25, type: 'sine', len: 0.5, vol: 0.85, r: 1.4, cutoff: 300, q: 0, rev: 0.7 }); noise({ len: 0.6, vol: 0.3, type: 'bandpass', freq: 3000, freqTo: 200, q: 1, r: 1.2, rev: 0.8 }); },
    glitch() { for (let i = 0; i < 5; i++) setTimeout(() => on && noise({ len: 0.03, vol: 0.16, type: 'bandpass', freq: 800 + i * 900, q: 4, r: 0.02 }), i * 45); synth({ freq: 220, sweepTo: 110, type: 'square', len: 0.12, vol: 0.06, r: 0.05, cutoff: 1800 }); }
  };
  const CUES = [[0.05, 'tape'], [4.15, 'skid'], [6.6, 'buzz'], [7.2, 'buzz'], [7.9, 'buzz'], [8.45, 'thunder'], [8.8, 'rift'],
    [10.05, 'whoosh'], [11.6, 'hollow'], [13.05, 'eye'], [14.1, 'boom'], [14.25, 'roar'], [15.3, 'yelp'], [18.2, 'thud'], [18.25, 'yelp'],
    [18.6, 'twang'], [18.9, 'hit'], [19.25, 'twang'], [19.55, 'jump'], [19.7, 'hit'], [20.1, 'twang'], [20.35, 'hit'], [20.4, 'thunder'],
    [21.0, 'flee'], [21.85, 'shock'], [22.35, 'cheer'], [23.4, 'rift'], [23.6, 'swell'], [24.1, 'squelch'], [26.0, 'boom'], [26.05, 'glitch'], [27.4, 'glitch']];

  // ---- the score, section by section ----
  function step(i, t) {
    const bar = Math.floor(i / 16), s = i % 16, ch = CHORDS[bar % 4], notes = ext(ch);
    const sect = t < 2.6 ? 'intro' : t < 6.5 ? 'town' : t < 8.8 ? 'flicker' : t < 11.6 ? 'rift' : t < 14.2 ? 'hollow' : t < 17.9 ? 'stalk' : t < 21.3 ? 'fight' : t < 26 ? 'after' : 'title';
    if (s === 0 && ['intro', 'town', 'stalk', 'after', 'title'].includes(sect)) pad(ch, STEP * 16, sect === 'title' ? 0.08 : sect === 'intro' || sect === 'town' ? 0.075 : 0.05, sect === 'title' ? 1600 : 800);
    if (s === 0 && ['rift', 'hollow', 'stalk'].includes(sect)) drone();
    if (sect === 'hollow' && (s === 0 || s === 3 || s === 8 || s === 11)) kick(0.7);          // a racing heartbeat on the other side
    const arpOn = { town: 900, flicker: 1100, fight: 2600, after: 700, title: 3000 }[sect];
    if (arpOn && !(sect === 'flicker' && Math.random() < 0.45) && !(sect === 'after' && s % 2)) arp(notes[ARP[s]] + 12, arpOn);
    if (['stalk', 'fight'].includes(sect) && s % 2 === 0) bass(ch[0] + (s % 8 === 6 ? 12 : 0));
    if (sect === 'stalk' && (s === 0 || s === 3)) kick(0.6);                     // heartbeat
    if (sect === 'fight') { if (s % 4 === 0) kick(); if (s === 4 || s === 12) snare(); if (s % 2) hat(); }
    if (sect === 'title' && s % 8 === 0) bass(ch[0]);
  }

  function update(t) {
    if (!on || !ac || !(t >= 0)) { lastT = Math.max(0, t || 0); return; }
    if (t < lastT) { fired.clear(); lastStep = -1; }                 // the trailer looped
    for (const [at, name] of CUES) if (t >= at && !fired.has(at)) { fired.add(at); if (t - at < 0.5) SFX[name](); }
    const cur = Math.floor(t / STEP);
    if (lastStep < 0) lastStep = cur - 1;
    for (let i = lastStep + 1; i <= cur && i - lastStep < 4; i++) step(i, t);
    lastStep = cur; lastT = t;
  }
  function setOn(v, t = 0, changed) {
    on = v;
    if (on) {
      if (!ac) init();
      fired.clear(); for (const [at] of CUES) if (at < t - 0.3) fired.add(at); lastStep = -1;
      ac.resume().then(() => changed && changed(), () => changed && changed());
      if (changed) ac.onstatechange = () => changed();
    } else if (ac) ac.suspend().then(() => changed && changed());
  }
  // For recording the trailer with its soundtrack.
  function stream() { if (!ac) init(); const d = ac.createMediaStreamDestination(); comp.connect(d); return d.stream; }
  return { update, setOn, stream, get on() { return on; }, get running() { return !!ac && on && ac.state === 'running'; } };
})();
