// Little looping trailers for the coming-soon packs, drawn with the real pack sprites.
(() => {
  const PX = window.BBPixel;
  const PACKS = {};
  for (const p of window.BBPacks || []) PACKS[p.id] = p;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = t => t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t);
  const lerp = (a, b, t) => a + (b - a) * ease(t);
  const span = (t, a, b) => (t - a) / (b - a);

  const cache = new Map();
  function sprite(packId, key, st) {
    const def = PX.withDefaults(PACKS[packId].items[key]);
    const id = [packId, key, st.pose, st.frame, st.blink ? 1 : 0, st.flip ? 1 : 0].join('|');
    let c = cache.get(id);
    if (!c) {
      let g = PX.drawItem(def, st);
      if (st.flip) g = g.map(r => r.slice().reverse());
      c = document.createElement('canvas'); c.width = def.w; c.height = def.h;
      const x = c.getContext('2d');
      g.forEach((row, y) => row.forEach((col, i) => { if (col) { x.fillStyle = col; x.fillRect(i, y, 1, 1); } }));
      c.def = def; cache.set(id, c);
    }
    return c;
  }

  function trailer(canvas, length, scene, size = {}) {
    const ctx = canvas.getContext('2d');
    const W = size.W || 240, H = size.H || 90;  // scene size in sprite pixels
    let S = 3, start = performance.now(), playing = !reduced, pausedAt = 0, state = {};
    function fit() {
      const w = canvas.clientWidth || 600;
      S = Math.max(1, w / W);
      canvas.width = Math.round(W * S * devicePixelRatio); canvas.height = Math.round(H * S * devicePixelRatio);
      ctx.setTransform(devicePixelRatio * S, 0, 0, devicePixelRatio * S, 0, 0);
      ctx.imageSmoothingEnabled = false;
    }
    const api = {
      W, H, ctx,
      put(packId, key, x, feet, st = {}) {                  // x = centre, feet = ground line
        const c = sprite(packId, key, { pose: 'idle', frame: 0, blink: false, ...st });
        ctx.drawImage(c, Math.round(x - c.def.w / 2), Math.round(feet - c.def.feet), c.def.w, c.def.h);
        return c.def;
      },
      rect(x, y, w, h, col) { ctx.fillStyle = col; ctx.fillRect(Math.round(x), Math.round(y), w, h); },
      text(str, x, y, px, col, glow, align = 'center') {          // crisp text, sized in scene pixels
        ctx.save();
        ctx.font = `700 ${px}px "Pixelify Sans", ui-monospace, monospace`;
        ctx.textAlign = align; ctx.textBaseline = 'middle';
        if (glow) { ctx.shadowColor = glow; ctx.shadowBlur = px * S * devicePixelRatio * 0.5; }
        ctx.fillStyle = col; ctx.fillText(str, x, y);
        if (glow) { ctx.shadowBlur = 0; ctx.fillText(str, x, y); }
        ctx.restore();
      }
    };
    function frame(now) {
      if (playing) {
        const t = ((now - start) / 1000) % length;
        if (t < api.last) state = {};
        api.last = t; api.frame = Math.floor(now / 220) % 2; api.state = state; api.dt = 1 / 60;
        ctx.save(); scene(api, t); ctx.restore();
      }
      requestAnimationFrame(frame);
    }
    fit(); addEventListener('resize', fit);
    if (!playing) { api.frame = 0; api.state = state; api.last = 0; scene(api, length * 0.5); }
    const btn = canvas.parentElement.querySelector('.trailer-toggle');
    if (btn) {
      const label = () => { btn.textContent = playing ? 'Pause' : 'Play'; btn.setAttribute('aria-pressed', String(playing)); };
      btn.addEventListener('click', () => {
        if (playing) pausedAt = performance.now(); else start += performance.now() - pausedAt;
        playing = !playing; label();
      });
      label();
    }
    requestAnimationFrame(frame);
  }

  // ---------- secret pack teaser ----------
  const nightBox = document.querySelector('[data-trailer="teaser"]');
  if (nightBox && PACKS.teaser) {
    const SW = 256, SH = 144, G = 122;
    const stars = Array.from({ length: 70 }, () => [rand(0, SW), rand(0, 80), Math.random()]);
    const vine = (x, y, dx, dy, n) => {                       // a twisting shadow-vine from a screen edge
      const pts = []; let px = x, py = y;
      for (let i = 0; i < n; i++) { pts.push([px, py, Math.random() < 0.15]); px += dx + (dy ? (Math.random() < 0.4 ? (Math.random() < 0.5 ? -1 : 1) : 0) : 0); py += dy + (dx ? (Math.random() < 0.4 ? (Math.random() < 0.5 ? -1 : 1) : 0) : 0); }
      return pts;
    };
    const vines = [vine(0, G, 0, -1, 70), vine(3, G, 0, -1, 45), vine(SW - 1, G, 0, -1, 75), vine(SW - 4, G, 0, -1, 50),
      vine(0, 30, 1, 0, 26), vine(SW - 1, 50, -1, 0, 30), vine(60, 0, 0, 1, 22), vine(190, 0, 0, 1, 28)];
    const embers = Array.from({ length: 30 }, (_, i) => ({ x: rand(0, SW), s: rand(0, 1), v: rand(0.05, 0.12), c: i % 3 ? '#FF8A3C' : '#FFC46A' }));

    // sound: off until the viewer asks for it (browsers block autoplaying audio anyway)
    // Sound is on by default. Browsers only allow audio after the visitor clicks, taps or
    // presses a key on the page, so it starts then (or straight away if the browser allows it).
    let lastTeaserT = 0, soundWanted = true;
    const soundBtn = nightBox.parentElement.querySelector('.trailer-sound');
    const pauseBtn = nightBox.parentElement.querySelector('.trailer-toggle');
    const playing = () => !pauseBtn || pauseBtn.getAttribute('aria-pressed') !== 'false';
    const label = () => {
      const blocked = soundWanted && !TeaserAudio.running;
      soundBtn.textContent = !soundWanted ? '🔊 Sound on' : blocked ? '🔊 Tap for sound' : '🔇 Mute';
      soundBtn.setAttribute('aria-pressed', String(soundWanted));
    };
    if (soundBtn && window.TeaserAudio) {
      soundBtn.hidden = false;
      TeaserAudio.setOn(playing(), lastTeaserT, () => label());
      const unlock = e => {
        if (e.target === soundBtn) return;                           // the button handles itself
        if (soundWanted && playing()) TeaserAudio.setOn(true, lastTeaserT, () => label());
        if (TeaserAudio.running) ['pointerdown', 'keydown'].forEach(t => removeEventListener(t, unlock, true));
      };
      ['pointerdown', 'keydown'].forEach(t => addEventListener(t, unlock, true));
      soundBtn.addEventListener('click', () => {
        soundWanted = TeaserAudio.running ? !soundWanted : true;      // a first tap on the button turns sound on
        TeaserAudio.setOn(soundWanted && playing(), lastTeaserT, () => label()); label();
      });
      pauseBtn && pauseBtn.addEventListener('click', () => { if (soundWanted) TeaserAudio.setOn(playing(), lastTeaserT, () => label()); });
      label();
    }

    trailer(nightBox, 28, (a, t) => {
      const { ctx, frame } = a;
      lastTeaserT = t;
      if (window.TeaserAudio) TeaserAudio.update(t);
      const seg = (x, y) => span(t, x, y);
      const fadeIn = (x, y) => clamp(seg(x, y), 0, 1);
      const scenePart = t >= 3 && t < 24.6;

      // ---- camera: gentle pan, then a punch-in on the roar ----
      let zoom = 1, cx = SW / 2, cy = SH / 2;
      if (t < 8) cx = lerp(100, 128, seg(3, 8));
      if (t >= 14 && t < 16.2) { const k = t < 15.7 ? ease(seg(14, 14.6)) : 1 - ease(seg(15.7, 16.2)); zoom = 1 + 1.6 * k; cx = lerp(128, 176, k); cy = lerp(72, 92, k); }
      let shake = 0;
      if (t > 10.4 && t < 11.6) shake = 1.5;
      if (t > 14.6 && t < 15.8) shake = 2.5;
      if (t > 17.7 && t < 18) shake = 2;

      ctx.save();
      ctx.fillStyle = '#05030C'; ctx.fillRect(0, 0, SW, SH);
      if (scenePart) {
        ctx.translate(SW / 2 + rand(-1, 1) * shake, SH / 2 + rand(-1, 1) * shake * 0.6); ctx.scale(zoom, zoom); ctx.translate(-cx, -cy);

        // sky: calm purple, turning stormy once the rift opens
        const storm = fadeIn(9.5, 12);
        const sky = ctx.createLinearGradient(0, 0, 0, SH);
        sky.addColorStop(0, storm ? `rgb(${18 + 20 * storm},${12},${42 + 10 * storm})` : '#120C2A'); sky.addColorStop(1, '#2C1E4A');
        ctx.fillStyle = sky; ctx.fillRect(-20, -20, SW + 40, SH + 40);
        stars.forEach(([x, y, k]) => a.rect(x, y, 1, 1, `rgba(255,255,255,${(0.35 + 0.5 * Math.abs(Math.sin(t * 1.5 + k * 9))) * (1 - storm * 0.7)})`));
        // storm clouds roll in
        if (storm > 0) for (let i = 0; i < 7; i++) { const x = ((i * 47 + t * 6) % (SW + 60)) - 30; a.rect(x, 6 + (i % 3) * 7, 40, 6, `rgba(40,28,64,${0.85 * storm})`); a.rect(x + 6, 3 + (i % 3) * 7, 26, 4, `rgba(52,38,80,${0.85 * storm})`); }
        // moon, hidden by the storm
        a.rect(214, 14, 12, 12, `rgba(232,226,208,${1 - storm * 0.8})`);
        // houses on the horizon with lit windows that flicker
        const flick = t > 8 && t < 10.3 ? (Math.sin(t * 37) > 0.2 ? 1 : 0.15) : t >= 10.3 && t < 22 ? 0.25 : 1;
        [[8, 28, 22], [40, 34, 18], [196, 30, 24], [226, 36, 22]].forEach(([x, w, h]) => {
          a.rect(x, G - h, w, h, '#1A1230'); a.rect(x - 2, G - h - 3, w + 4, 3, '#140E26');
          for (let wx = x + 4; wx < x + w - 4; wx += 8) a.rect(wx, G - h + 6, 4, 4, `rgba(255,216,107,${0.85 * flick})`);
        });
        // street lamp
        a.rect(150, G - 34, 2, 34, '#2A2440'); a.rect(146, G - 36, 8, 3, '#2A2440');
        if (flick > 0.5) { const lg = ctx.createRadialGradient(150, G - 30, 0, 150, G - 30, 40); lg.addColorStop(0, 'rgba(255,220,140,0.35)'); lg.addColorStop(1, 'rgba(255,220,140,0)'); ctx.fillStyle = lg; ctx.fillRect(110, G - 70, 80, 80); a.rect(147, G - 33, 6, 2, '#FFE7A0'); }
        // lightning
        const bolt = Math.max(0, 1 - Math.abs(t - 10.2) * 7) + Math.max(0, 0.7 - Math.abs(t - 10.5) * 7) + Math.max(0, 0.6 - Math.abs(t - 19.6) * 7);
        if (bolt > 0) { let bx = 120, by = 0; ctx.fillStyle = `rgba(230,225,255,${bolt})`; while (by < 70) { ctx.fillRect(bx, by, 2, 6); bx += rand(-5, 5); by += 6; } }
        // ground + road
        a.rect(-20, G, SW + 40, 30, '#14261A'); a.rect(-20, G, SW + 40, 2, '#244A2A'); a.rect(-20, G + 8, SW + 40, 12, '#22222C');
        for (let x = -20; x < SW + 20; x += 18) a.rect(x + ((t * 0) % 18), G + 13, 8, 1, '#5A5A66');
        a.put('teaser', 'treehouse', 26, G, { frame });
        a.put('teaser', 'arcade', 240, G, { frame: flick > 0.5 ? frame : 0 });

        // shadow-vines creeping in from the edges
        const grow = fadeIn(10.5, 15) * (1 - fadeIn(22, 24));
        vines.forEach(v => { const n = Math.floor(v.length * grow); for (let i = 0; i < n; i++) { const [x, y, bud] = v[i]; a.rect(x, y, 2, 2, i % 6 ? '#140A20' : '#26163A'); if (bud) a.rect(x - 1, y - 1, 2, 2, `rgba(176,124,255,${0.5 + 0.5 * Math.sin(t * 3 + i)})`); } });

        // the rift
        const riftX = 180;
        const open = fadeIn(10.5, 11.6) * (1 - fadeIn(21.8, 22.4));
        const rift = (x, k, hMax) => {
          if (k <= 0) return;
          const h = hMax * k;
          const glow = ctx.createRadialGradient(x, G - h / 2, 0, x, G - h / 2, h * 1.2);
          glow.addColorStop(0, 'rgba(176,124,255,0.65)'); glow.addColorStop(1, 'rgba(111,240,216,0)');
          ctx.fillStyle = glow; ctx.fillRect(x - h * 1.2, G - h * 1.8, h * 2.4, h * 1.8);
          for (let y = 0; y < h; y++) {
            const half = Math.max(1, 5 * k * Math.sin((y / h) * Math.PI) + (Math.sin(y * 0.9 + t * 9) > 0.6 ? 1 : 0));
            a.rect(x - half - 1, G - y - 1, half * 2 + 2, 1, '#6FF0D8'); a.rect(x - half, G - y - 1, half * 2, 1, '#B07CFF'); a.rect(x - half + 1, G - y - 1, Math.max(0, half * 2 - 2), 1, '#0E0818');
          }
          if (Math.random() < 0.5) a.rect(x + rand(-8, 8), G - rand(0, h), 1, 1, Math.random() < 0.5 ? '#6FF0D8' : '#FFFFFF');
        };
        rift(riftX, open, 34);
        rift(232, fadeIn(22.6, 23.1) * (1 - fadeIn(24.2, 24.6)), 14);

        // the crew
        const fight = t >= 17.4 && t < 19.6, cheer = t >= 21.6 && t < 23;
        const hop = cheer ? -Math.abs(Math.sin(t * 9)) * 4 : 0;
        const walk = k => (t < 7.5 ? { pose: 'walk', frame } : {});
        const pos = (from, to) => lerp(from, to, seg(3, 7.5));
        const dashX = lerp(-30, 120, seg(3, 5.2));
        a.put('teaser', 'rider', dashX, G + hop, t < 5.2 ? { pose: 'walk', frame } : {});
        const scared = t > 14.6 && t < 17.4;
        const dogKnocked = t >= 17.8 && t < 19.2;
        if (dogKnocked) { a.put('teaser', 'dog', 52, G, { pose: 'sit', blink: true }); for (let k = 0; k < 3; k++) a.rect(52 + Math.cos(t * 5 + k * 2) * 6, G - 16 + Math.sin(t * 5 + k * 2) * 2, 2, 2, '#FFD84A'); }
        else a.put('teaser', 'dog', pos(-40, 52) + (scared ? Math.sin(t * 40) : 0), G + hop * 0.5, walk() .pose ? walk() : { pose: 'idle', frame: scared ? frame : 0 });
        a.put('teaser', 'radio', pos(-55, 68), G + hop, walk().pose ? walk() : { blink: frame && t % 3 < 0.2 });
        a.put('teaser', 'torch', pos(-70, 84), G + hop, fight ? { pose: 'aim', frame } : walk().pose ? walk() : {});
        a.put('teaser', 'sling', pos(-85, 100), G + hop, fight ? { pose: 'aim', frame } : walk().pose ? walk() : {});
        if (scared && Math.sin(t * 6) > 0) a.rect(60, G - 26, 2, 5, '#E04444');      // "!"

        // the monster
        let bx = riftX, by = G, pose = 'stalk', flip = true, show = t > 12.4 && t < 21.9;
        if (t < 14) by = G + lerp(36, 0, seg(12.4, 14));
        else if (t < 16.2) pose = 'roar';
        else if (t < 17) bx = lerp(riftX, 128, seg(16.2, 17));
        else if (t < 17.8) { pose = 'pounce'; bx = lerp(128, 70, seg(17, 17.8)); by = G - Math.sin(seg(17, 17.8) * Math.PI) * 24; }
        else if (t < 19.6) { pose = t < 18.6 ? 'stalk' : 'hurt'; bx = lerp(70, 112, seg(17.8, 18.6)) + (t > 18.6 ? Math.sin(t * 50) : 0); }
        else { pose = 'walk'; flip = false; bx = lerp(112, riftX, seg(19.8, 21)); by = G + lerp(0, 36, seg(21, 21.8)); }
        if (show) {
          ctx.save(); ctx.beginPath(); ctx.rect(-20, -20, SW + 40, G + 20); ctx.clip();
          a.put('teaser', 'boss', bx, by, { pose, frame, flip });
          ctx.restore();
        }
        // torch beam glow + slingshot pebbles + hits
        if (fight && t > 18) {
          const bg = ctx.createRadialGradient(bx, G - 16, 0, bx, G - 16, 24); bg.addColorStop(0, 'rgba(255,242,168,0.45)'); bg.addColorStop(1, 'rgba(255,242,168,0)');
          ctx.fillStyle = bg; ctx.fillRect(bx - 24, G - 40, 48, 48);
          for (let i = 0; i < 3; i++) { const k = (t * 1.8 + i / 3) % 1; a.rect(lerp(106, bx - 4, k), G - 12 - Math.sin(k * Math.PI) * 12, 2, 2, '#B8B0A0'); }
          if (Math.sin(t * 9) > 0.3) { a.rect(bx - 8, G - 28, 4, 4, '#FFD84A'); a.rect(bx - 5, G - 24, 2, 2, '#FFF6A0'); }
        }
        if (cheer) for (let i = 0; i < 16; i++) a.rect((i * 37 + t * 40) % SW, ((t * 50 + i * 23) % 90), 2, 2, ['#B07CFF', '#6FF0D8', '#FFD84A', '#FF6AC8'][i % 4]);
        // Gloop peeks out of the second rift
        if (t > 22.9 && t < 24.4) a.put('teaser', 'gloop', 232, G + lerp(14, 2, seg(22.9, 23.5)), { blink: t > 23.9 && t < 24 });
        // embers drifting up
        const emb = fadeIn(10.5, 12) * (1 - fadeIn(23, 24.6));
        if (emb > 0) embers.forEach(e => { const k = (e.s + t * e.v) % 1; a.rect(e.x + Math.sin(t + e.x) * 4, G - k * G, 1, 1, e.c); });
        // flicker blackout
        if (t > 8 && t < 10.3 && Math.sin(t * 23) > 0.75) { ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(-20, -20, SW + 40, SH + 40); }
      }
      ctx.restore();

      // ---- title card ----
      if (t >= 24.6) {
        const k = fadeIn(24.6, 25.4);
        ctx.fillStyle = '#05030C'; ctx.fillRect(0, 0, SW, SH);
        embers.forEach(e => { const q = (e.s + t * e.v) % 1; a.rect(e.x, SH - q * SH, 1, 1, e.c); });
        const g = ctx.createRadialGradient(SW / 2, SH / 2, 0, SW / 2, SH / 2, 110); g.addColorStop(0, `rgba(176,124,255,${0.28 * k})`); g.addColorStop(1, 'rgba(176,124,255,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, SW, SH);
        const on = t < 25.8 ? (Math.sin(t * 40) > -0.3 ? 1 : 0.25) : 1;
        a.text('SOMETHING IS COMING', SW / 2, 60, 18, `rgba(111,240,216,${k * on})`, '#B07CFF');
        a.text('A secret new pack for Bitty Buddies', SW / 2, 84, 8, `rgba(237,232,255,${fadeIn(25.6, 26.3)})`);
        a.text('STAY TUNED', SW / 2, 104, 10, `rgba(255,216,107,${fadeIn(26.3, 26.9)})`);
      }

      // ---- story captions ----
      const cap = (txt, x0, x1) => { if (t > x0 && t < x1 && t >= 3) a.rect(0, 129, SW, 13, `rgba(0,0,0,${0.6 * Math.min(fadeIn(x0, x0 + 0.5), 1 - fadeIn(x1 - 0.5, x1))})`); if (t > x0 && t < x1) a.text(txt, SW / 2, t < 3 ? SH / 2 + 3 : 136, t < 3 ? 10 : 8, `rgba(237,232,255,${Math.min(fadeIn(x0, x0 + 0.5), 1 - fadeIn(x1 - 0.5, x1))})`); };
      cap('1986. A quiet little town.', 0.3, 3);
      cap('Then the lights started to flicker...', 8, 10.6);
      cap('Something came through.', 14.4, 16.2);
      cap('So the crew fought back.', 17.2, 19.8);
      cap('...or did it?', 23, 24.5);

      // ---- letterbox + VHS overlay ----
      if (scenePart) { a.rect(0, 0, SW, 8, '#000'); a.rect(0, SH - 4, SW, 4, '#000'); }
      for (let y = 0; y < SH; y += 2) a.rect(0, y, SW, 1, 'rgba(0,0,0,0.16)');
      const tear = (t * 0.37) % 1; a.rect(0, tear * SH, SW, 2, 'rgba(255,255,255,0.05)');
      if (Math.floor(t * 1.4) % 2 === 0) a.text('▶ PLAY', 22, 16, 6, 'rgba(255,255,255,0.85)', null, 'left');
      const mm = Math.floor(t / 60), ss = Math.floor(t % 60);
      a.text(`SP  00:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`, SW - 8, SH - 7, 5, 'rgba(255,255,255,0.7)', null, 'right');
    }, { W: SW, H: SH });
  }

  // ---------- teaser section background: shadow-vines up both edges ----------
  const nightLayer = document.querySelector('.night-layer');
  if (nightLayer) {
    const strip = (flip) => {
      const c = document.createElement('canvas'); c.width = 24; c.height = 160;
      const x = c.getContext('2d');
      for (let v = 0; v < 3; v++) {
        let px = 2 + v * 5, bud = 0;
        for (let y = 160; y > 0; y--) {
          px = clamp(px + (Math.random() < 0.3 ? (Math.random() < 0.5 ? -1 : 1) : 0), 0, 20);
          x.fillStyle = y % 7 ? '#140A20' : '#26163A'; x.fillRect(flip ? 23 - px : px, y, 2, 1);
          if (++bud % 23 === 0) { x.fillStyle = '#7A4EC8'; x.fillRect((flip ? 23 - px : px) - 1, y, 2, 2); }
          if (y % 11 === 0) { x.fillStyle = '#26163A'; x.fillRect((flip ? 21 - px : px + 2), y, 2, 1); }
        }
      }
      return c.toDataURL();
    };
    nightLayer.style.setProperty('--vines-l', `url(${strip(false)})`);
    nightLayer.style.setProperty('--vines-r', `url(${strip(true)})`);
  }

  // ---------- Jolly Winter ----------
  const winterBox = document.querySelector('[data-trailer="winter"]');
  if (winterBox && PACKS.winter) {
    trailer(winterBox, 12, (a, t) => {
      const { ctx, W, H, frame, state } = a, G = 82;
      if (!state.flakes) { state.flakes = Array.from({ length: 70 }, () => ({ x: rand(0, W), y: rand(-H, H), v: rand(8, 16), s: Math.random() < 0.3 ? 2 : 1 })); state.drift = new Float32Array(W); }
      const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#2A4A78'); g.addColorStop(1, '#5A82B4');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      a.rect(0, G, W, 8, '#E8F0FA'); a.rect(0, G, W, 1, '#FFFFFF');
      a.put('winter', 'gingerhouse', 52, G, { frame });
      a.put('winter', 'tree', 188, G, { frame });
      // snow caps grow on the roof and tree
      const cap = clamp(t / 10, 0, 1);
      if (cap > 0.1) { for (let x = 42; x < 62; x++) a.rect(x, G - 21 + Math.abs(x - 52) - cap * 1.5, 1, cap * 1.5 + 0.5, '#FFFFFF'); }
      // buddies wander
      const elfX = 90 + ((t * 14) % 120), dir = 1;
      a.put('winter', 'elf', elfX, G, { pose: 'walk', frame });
      a.put('winter', 'reindeer', lerp(240, 120, span(t, 0, 7)), G, t < 7 ? { pose: 'walk', frame, flip: true } : { pose: 'idle', frame, flip: true });
      a.put('winter', 'snowman', 150, G - Math.abs(Math.sin(t * 3)) * 3, { pose: 'walk', frame });
      a.put('winter', 'bear', 20, G, t > 8 ? { pose: 'sleep', frame } : { pose: 'sit', frame });
      a.put('winter', 'ginger', lerp(-20, 110, span(t, 3, 9)), G - (t > 3 && t < 9 ? Math.abs(Math.sin(t * 8)) * 4 : 0), { pose: t > 3 && t < 9 ? 'walk' : 'idle', frame });
      // falling snow, piling up along the bottom
      for (const f of state.flakes) {
        f.y += f.v / 60; f.x += Math.sin(f.y * 0.2) * 0.15;
        const col = clamp(Math.floor(f.x), 0, W - 1);
        if (f.y > G - state.drift[col]) { state.drift[col] = Math.min(5, state.drift[col] + 0.25); f.y = rand(-20, 0); f.x = rand(0, W); }
        a.rect(f.x, f.y, f.s, f.s, '#FFFFFF');
      }
      for (let x = 0; x < W; x += 2) { const h = Math.round((state.drift[x] + (state.drift[x + 1] || 0)) / 2); if (h) a.rect(x, G - h, 2, h, '#F7FAFF'); }
    });
  }
})();
