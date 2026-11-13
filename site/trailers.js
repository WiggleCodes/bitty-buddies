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
        const t = Math.max(0, (now - start) / 1000) % length;   // rAF time can be a hair before start
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
    const SW = 256, SH = 144, G = 122, LEN = 32;
    const stars = Array.from({ length: 70 }, () => [rand(0, SW), rand(0, 80), Math.random()]);
    const vine = (x, y, dx, dy, n) => {
      const pts = []; let px = x, py = y;
      for (let i = 0; i < n; i++) { pts.push([px, py, Math.random() < 0.15]); px += dx + (dy ? (Math.random() < 0.4 ? (Math.random() < 0.5 ? -1 : 1) : 0) : 0); py += dy + (dx ? (Math.random() < 0.4 ? (Math.random() < 0.5 ? -1 : 1) : 0) : 0); }
      return pts;
    };
    const vines = [vine(0, G, 0, -1, 70), vine(3, G, 0, -1, 45), vine(SW - 1, G, 0, -1, 75), vine(SW - 4, G, 0, -1, 50),
      vine(0, 30, 1, 0, 26), vine(SW - 1, 50, -1, 0, 30), vine(60, 0, 0, 1, 22), vine(190, 0, 0, 1, 28)];
    const embers = Array.from({ length: 30 }, (_, i) => ({ x: rand(0, SW), s: rand(0, 1), v: rand(0.05, 0.12), c: i % 3 ? '#FF8A3C' : '#FFC46A' }));

    // ---- the Hollow: the world on the other side of the rift (drawn in screen space) ----
    const islands = Array.from({ length: 9 }, (_, i) => ({ x: rand(0, SW), y: rand(10, 110), w: rand(10, 30), s: rand(2, 6), spires: Math.floor(rand(1, 4)), d: 0.4 + (i % 3) * 0.3 }));
    const eyes = Array.from({ length: 16 }, () => ({ x: rand(10, SW - 10), y: rand(70, 126), p: rand(0, 6), r: rand(2, 5) }));
    const motes = Array.from({ length: 50 }, () => ({ x: rand(0, SW), s: rand(0, 1), v: rand(0.03, 0.09), c: Math.random() < 0.5 ? '#6FF0D8' : '#B07CFF' }));
    let colossus = null;                                         // a huge dark silhouette of the beast
    function silhouette() {
      if (colossus) return colossus;
      const def = PX.withDefaults(PACKS.teaser.items.boss);
      const g = PX.drawItem(def, { pose: 'stalk', frame: 0, blink: false });
      const c = document.createElement('canvas'); c.width = def.w; c.height = def.h;
      const x = c.getContext('2d');
      g.forEach((row, y) => row.forEach((col, i) => { if (col) { x.fillStyle = col === '#FFB43C' || col === '#FFE7A0' ? '#FFB43C' : '#07030E'; x.fillRect(i, y, 1, 1); } }));
      colossus = c; return c;
    }
    function drawHollow(a, t, depth = 1) {
      const { ctx } = a;
      const sky = ctx.createLinearGradient(0, 0, 0, SH);
      sky.addColorStop(0, '#16052A'); sky.addColorStop(0.55, '#3A0F4A'); sky.addColorStop(0.8, '#1C5A5E'); sky.addColorStop(1, '#04110F');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, SW, SH);
      // cracked teal moon
      const mx = 180 - t * 0.6 * depth, my = 34;
      const mg = ctx.createRadialGradient(mx, my, 0, mx, my, 40); mg.addColorStop(0, 'rgba(111,240,216,0.35)'); mg.addColorStop(1, 'rgba(111,240,216,0)');
      ctx.fillStyle = mg; ctx.fillRect(mx - 40, my - 40, 80, 80);
      a.rect(mx - 10, my - 10, 20, 20, '#9FF6E4'); a.rect(mx - 12, my - 6, 24, 12, '#9FF6E4'); a.rect(mx - 6, my - 12, 12, 24, '#9FF6E4');
      [[-4, -8], [-3, -6], [-1, -5], [0, -3], [2, -2], [3, 0], [1, 2], [2, 4], [4, 5]].forEach(([dx, dy]) => a.rect(mx + dx, my + dy, 1, 1, '#2E6A66'));
      // distant spires on the horizon
      for (let x = 0; x < SW; x += 9) { const h = 8 + ((x * 37) % 23); a.rect(x - (t * 2 * depth) % 9, 104 - h, 5, h + 40, '#0C0618'); a.rect(x - (t * 2 * depth) % 9 + 2, 104 - h - 4, 1, 4, '#0C0618'); }
      // the colossus walking along the horizon
      const sil = silhouette(), cs = 3.2;
      const cx = ((t * 7) % (SW + 140)) - 70;
      ctx.drawImage(sil, Math.round(cx), Math.round(108 - sil.height * cs + Math.abs(Math.sin(t * 2)) * 2), sil.width * cs, sil.height * cs);
      // floating islands with crystals, drifting UP
      islands.forEach(il => {
        const y = ((il.y - t * il.s * depth) % 130 + 130) % 130 - 10, x = il.x + Math.sin(t * 0.5 + il.y) * 3;
        a.rect(x, y, il.w, 3, '#1A1030'); a.rect(x + 2, y + 3, il.w - 4, 3, '#140A26'); a.rect(x + il.w / 3, y + 6, il.w / 3, 3, '#0E061C');
        for (let k = 0; k < il.spires; k++) { const sx = x + 3 + k * (il.w / il.spires); a.rect(sx, y - 5, 2, 5, k % 2 ? '#B07CFF' : '#6FF0D8'); a.rect(sx, y - 6, 1, 1, '#FFFFFF'); }
      });
      // ground of jagged crystal
      a.rect(0, 118, SW, 30, '#05020A');
      for (let x = 0; x < SW; x += 6) { const h = 3 + ((x * 13) % 9); a.rect(x, 118 - h, 3, h, '#0A0414'); if (x % 18 === 0) a.rect(x + 1, 118 - h - 2, 1, 2, '#6FF0D8'); }
      // glowing eyes blinking in the dark
      eyes.forEach(e => { const open = Math.sin(t * 1.3 + e.p) > -0.4; if (open) { a.rect(e.x, e.y, 2, 1, '#FFB43C'); a.rect(e.x + e.r + 2, e.y, 2, 1, '#FFB43C'); } });
      // motes falling upwards
      motes.forEach(m => { const k = (m.s + t * m.v) % 1; a.rect(m.x + Math.sin(t + m.x) * 3, SH - k * SH, 1, 1, m.c); });
    }

    // portal outline in world space: a jagged vertical tear
    function riftPath(ctx, x, h, wmax) {
      ctx.beginPath();
      for (let y = 0; y <= h; y++) { const half = Math.max(0.5, wmax * Math.sin((y / h) * Math.PI)) + (Math.sin(y * 0.9 + 3) > 0.7 ? 1 : 0); ctx.lineTo(x + half, G - y); }
      for (let y = h; y >= 0; y--) { const half = Math.max(0.5, wmax * Math.sin((y / h) * Math.PI)) + (Math.sin(y * 1.3) > 0.7 ? 1 : 0); ctx.lineTo(x - half, G - y); }
      ctx.closePath();
    }
    function drawRift(a, t, x, k, hMax, wMax, showHollow) {
      if (k <= 0) return;
      const { ctx } = a, h = hMax * k, w = wMax * k;
      const glow = ctx.createRadialGradient(x, G - h / 2, 0, x, G - h / 2, h * 1.2);
      glow.addColorStop(0, 'rgba(176,124,255,0.7)'); glow.addColorStop(1, 'rgba(111,240,216,0)');
      ctx.fillStyle = glow; ctx.fillRect(x - h * 1.2, G - h * 1.9, h * 2.4, h * 1.9);
      ctx.save(); riftPath(ctx, x, h, w); ctx.clip();
      if (showHollow) { const sc = Math.max(h, 20) / 95; ctx.save(); ctx.translate(x, G - h / 2); ctx.scale(sc, sc); ctx.translate(-175, -76); drawHollow(a, t, 0.6); ctx.restore(); }   // a window onto the Hollow, its moon right behind the tear
      else { ctx.fillStyle = '#0E0818'; ctx.fillRect(x - w - 2, G - h - 2, w * 2 + 4, h + 4); }
      ctx.restore();
      ctx.save(); riftPath(ctx, x, h, w); ctx.strokeStyle = '#6FF0D8'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.strokeStyle = 'rgba(176,124,255,0.9)'; ctx.lineWidth = 0.7; ctx.stroke(); ctx.restore();
      for (let i = 0; i < 3; i++) a.rect(x + rand(-w - 3, w + 3), G - rand(0, h), 1, 1, Math.random() < 0.5 ? '#6FF0D8' : '#FFFFFF');
    }

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

    trailer(nightBox, LEN, (a, t) => {
      const { ctx, frame } = a;
      lastTeaserT = t;
      if (window.TeaserAudio) TeaserAudio.update(t);
      a.base = ctx.getTransform();
      const seg = (x, y) => span(t, x, y);
      const fadeIn = (x, y) => clamp(seg(x, y), 0, 1);
      const inHollow = t >= 11.6 && t < 14.2;
      const town = t >= 2.6 && t < 26 && !inHollow;
      const riftX = 176;

      // ---- camera ----
      let zoom = 1, cx = SW / 2, cy = SH / 2, shake = 0;
      if (t < 6.5) cx = lerp(104, 128, seg(2.6, 6.5));
      if (t >= 10 && t < 11.6) { const k = ease(seg(10, 11.6)); zoom = 1 + k * k * 9; cx = lerp(128, riftX, k); cy = lerp(72, G - 26, k); }   // dolly into the rift
      if (t >= 14.2 && t < 16.8) { const k = t < 16.2 ? ease(seg(14.9, 15.4)) : 1 - ease(seg(16.2, 16.8)); zoom = 1 + 1.5 * k; cx = lerp(128, riftX - 4, k); cy = lerp(72, 90, k); }
      if (t > 8.4 && t < 9.6) shake = 1.2;
      if (t > 14.2 && t < 16.2) shake = 2.5;
      if (t > 18.2 && t < 18.5) shake = 2;
      if (t > 21.7 && t < 22.4) shake = 3;

      ctx.save();
      ctx.fillStyle = '#05030C'; ctx.fillRect(0, 0, SW, SH);

      if (inHollow) {
        // ---- inside the Hollow ----
        const tt = t - 11.6;
        ctx.save(); ctx.translate(SW / 2, SH / 2); ctx.scale(1.15 - tt * 0.04, 1.15 - tt * 0.04); ctx.translate(-SW / 2, -SH / 2);
        drawHollow(a, t, 1);
        ctx.restore();
        // a giant eye opens right in front of us
        if (tt > 1.5) {
          const op = clamp((tt - 1.5) / 0.5, 0, 1);
          const ex = SW / 2, ey = SH / 2 + 4;
          a.rect(ex - 40, ey - 14, 80, 28, 'rgba(7,3,14,0.92)');
          a.rect(ex - 32, ey - 10 * op, 64, 20 * op, '#FFB43C'); a.rect(ex - 24, ey - 10 * op, 48, 20 * op, '#FFD27A');
          a.rect(ex - 3, ey - 9 * op, 6, 18 * op, '#120808');                     // slit pupil
          a.rect(ex - 20, ey - 6 * op, 4, 2 * op, '#FFF4D0');
          for (let i = -40; i < 40; i += 4) { a.rect(ex + i, ey - 14 - Math.abs(i) * 0.1, 3, 3, '#1A1030'); }
        }
        if (tt > 2.4) { ctx.fillStyle = `rgba(255,255,255,${(tt - 2.4) * 4})`; ctx.fillRect(0, 0, SW, SH); }
      } else if (town) {
        ctx.translate(SW / 2 + rand(-1, 1) * shake, SH / 2 + rand(-1, 1) * shake * 0.6); ctx.scale(zoom, zoom); ctx.translate(-cx, -cy);
        const storm = fadeIn(8, 10);
        const sky = ctx.createLinearGradient(0, 0, 0, SH);
        sky.addColorStop(0, storm ? `rgb(${18 + 22 * storm},12,${42 + 12 * storm})` : '#120C2A'); sky.addColorStop(1, '#2C1E4A');
        ctx.fillStyle = sky; ctx.fillRect(-20, -20, SW + 40, SH + 40);
        stars.forEach(([x, y, k]) => a.rect(x, y, 1, 1, `rgba(255,255,255,${(0.35 + 0.5 * Math.abs(Math.sin(t * 1.5 + k * 9))) * (1 - storm * 0.7)})`));
        if (storm > 0) for (let i = 0; i < 7; i++) { const x = ((i * 47 + t * 6) % (SW + 60)) - 30; a.rect(x, 6 + (i % 3) * 7, 40, 6, `rgba(40,28,64,${0.85 * storm})`); a.rect(x + 6, 3 + (i % 3) * 7, 26, 4, `rgba(52,38,80,${0.85 * storm})`); }
        a.rect(214, 14, 12, 12, `rgba(232,226,208,${1 - storm * 0.8})`);
        const flick = t > 6.5 && t < 8.4 ? (Math.sin(t * 37) > 0.2 ? 1 : 0.15) : t >= 8.4 && t < 22.5 ? 0.25 : 1;
        [[8, 28, 22], [40, 34, 18], [196, 30, 24], [226, 36, 22]].forEach(([x, w, h]) => {
          a.rect(x, G - h, w, h, '#1A1230'); a.rect(x - 2, G - h - 3, w + 4, 3, '#140E26');
          for (let wx = x + 4; wx < x + w - 4; wx += 8) a.rect(wx, G - h + 6, 4, 4, `rgba(255,216,107,${0.85 * flick})`);
        });
        a.rect(150, G - 34, 2, 34, '#2A2440'); a.rect(146, G - 36, 8, 3, '#2A2440');
        if (flick > 0.5) { const lg = ctx.createRadialGradient(150, G - 30, 0, 150, G - 30, 40); lg.addColorStop(0, 'rgba(255,220,140,0.35)'); lg.addColorStop(1, 'rgba(255,220,140,0)'); ctx.fillStyle = lg; ctx.fillRect(110, G - 70, 80, 80); a.rect(147, G - 33, 6, 2, '#FFE7A0'); }
        const bolt = Math.max(0, 1 - Math.abs(t - 8.5) * 7) + Math.max(0, 0.7 - Math.abs(t - 8.8) * 7) + Math.max(0, 0.6 - Math.abs(t - 20.4) * 7);
        if (bolt > 0) { let bx = 120, by = 0; ctx.fillStyle = `rgba(230,225,255,${bolt})`; while (by < 70) { ctx.fillRect(bx, by, 2, 6); bx += rand(-5, 5); by += 6; } }
        a.rect(-20, G, SW + 40, 30, '#14261A'); a.rect(-20, G, SW + 40, 2, '#244A2A'); a.rect(-20, G + 8, SW + 40, 12, '#22222C');
        for (let x = -20; x < SW + 20; x += 18) a.rect(x, G + 13, 8, 1, '#5A5A66');
        a.put('teaser', 'treehouse', 26, G, { frame });
        // the arcade sparks and dies when the lights go
        a.put('teaser', 'arcade', 240, G, { frame: flick > 0.5 ? frame : 0 });
        if (t > 6.6 && t < 8.4 && Math.sin(t * 29) > 0.6) for (let i = 0; i < 4; i++) a.rect(240 + rand(-5, 5), G - rand(10, 24), 1, 1, '#FFF6A0');

        const grow = fadeIn(8.8, 13) * (1 - fadeIn(23, 25.5));
        vines.forEach(v => { const n = Math.floor(v.length * grow); for (let i = 0; i < n; i++) { const [x, y, bud] = v[i]; a.rect(x, y, 2, 2, i % 6 ? '#140A20' : '#26163A'); if (bud) a.rect(x - 1, y - 1, 2, 2, `rgba(176,124,255,${0.5 + 0.5 * Math.sin(t * 3 + i)})`); } });

        // the rift, with the Hollow visible through it
        const open = fadeIn(8.8, 9.8) * (1 - fadeIn(21.6, 22.1));
        drawRift(a, t, riftX, open, 56, 15, true);
        // shockwave when it slams shut
        if (t > 21.9 && t < 22.9) { const r = (t - 21.9) * 150; ctx.strokeStyle = `rgba(111,240,216,${1 - (t - 21.9)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(riftX, G - 10, r, r * 0.35, 0, 0, Math.PI * 2); ctx.stroke(); }
        // the second rift full of eyes
        const open2 = fadeIn(23.4, 23.9) * (1 - fadeIn(25.3, 25.9));
        drawRift(a, t, 222, open2, 34, 10, true);

        // the crew
        const fight = t >= 17.9 && t < 21.3, cheer = t >= 22.3 && t < 23.4;
        const hop = cheer ? -Math.abs(Math.sin(t * 9)) * 4 : 0;
        const walk = t < 6.4 ? { pose: 'walk', frame } : null;
        const pos = (from, to) => lerp(from, to, seg(2.6, 6.4));
        // Dash: skids in, then later jumps his BMX clean over the beast
        let dashX = lerp(-30, 124, seg(2.6, 4.4)), dashY = G, dashSt = t < 4.4 ? { pose: 'walk', frame } : {};
        if (t > 4.2 && t < 4.6) for (let i = 0; i < 3; i++) a.rect(dashX - 10 - i * 3, G - 2 - i, 2, 2, '#6A6070');
        if (t >= 19.2 && t < 20.4) { const k = seg(19.2, 20.4); dashX = lerp(-20, 200, k); dashY = G - Math.sin(Math.max(0, (k - 0.3) / 0.45) * Math.PI) * 30 * (k > 0.3 && k < 0.75 ? 1 : 0); dashSt = { pose: 'walk', frame }; }
        else if (t >= 20.4 && t < 22) dashX = lerp(200, 124, seg(20.4, 22));
        if (t >= 18.6 && t < 19.2) dashX = lerp(124, -20, seg(18.6, 19.2));
        a.put('teaser', 'rider', dashX, dashY + hop, t >= 18.6 && t < 22 ? { pose: 'walk', frame, flip: t < 19.2 } : dashSt);
        const scared = t > 14.2 && t < 17.9;
        const dogKnocked = t >= 18.3 && t < 19.6;
        if (dogKnocked) { a.put('teaser', 'dog', 52, G, { pose: 'sit', blink: true }); for (let k = 0; k < 3; k++) a.rect(52 + Math.cos(t * 5 + k * 2) * 6, G - 16 + Math.sin(t * 5 + k * 2) * 2, 2, 2, '#FFD84A'); }
        else a.put('teaser', 'dog', pos(-40, 52) + (scared ? Math.sin(t * 40) : 0), G + hop * 0.5, walk || { pose: 'idle', frame: scared ? frame : 0 });
        a.put('teaser', 'radio', pos(-55, 68), G + hop, walk || { blink: frame && t % 3 < 0.2 });
        a.put('teaser', 'torch', pos(-70, 84), G + hop, fight ? { pose: 'aim', frame } : walk || {});
        a.put('teaser', 'sling', pos(-85, 100), G + hop, fight ? { pose: 'aim', frame } : walk || {});
        if (scared && Math.sin(t * 6) > 0) a.rect(60, G - 26, 2, 5, '#E04444');

        // the beast
        let bx = riftX, by = G, pose = 'stalk', flip = true, show = t > 14.2 && t < 22;
        if (t < 14.9) { by = G + lerp(36, 0, seg(14.2, 14.9)); pose = 'roar'; }      // bursts out
        else if (t < 16.6) pose = 'roar';
        else if (t < 17.4) bx = lerp(riftX, 128, seg(16.6, 17.4));
        else if (t < 18.3) { pose = 'pounce'; bx = lerp(128, 70, seg(17.4, 18.3)); by = G - Math.sin(seg(17.4, 18.3) * Math.PI) * 24; }
        else if (t < 21) { pose = t < 19.6 ? 'stalk' : 'hurt'; bx = lerp(70, 112, seg(18.3, 19)) + (t > 19.6 ? Math.sin(t * 50) : 0); }
        else { pose = 'hurt'; flip = false; bx = lerp(112, riftX, seg(21, 21.5)); by = G + lerp(0, 40, seg(21.3, 21.7)); }   // dragged back in
        if (fight && t > 18.5) {                                   // torchlight on the beast
          const bg = ctx.createRadialGradient(bx, G - 16, 0, bx, G - 16, 24); bg.addColorStop(0, 'rgba(255,242,168,0.22)'); bg.addColorStop(1, 'rgba(255,242,168,0)');
          ctx.fillStyle = bg; ctx.fillRect(bx - 24, G - 40, 48, 48);
        }
        if (show) {
          ctx.save(); ctx.beginPath(); ctx.rect(-40, -40, SW + 80, G + 40); ctx.clip();
          a.put('teaser', 'boss', bx, by, { pose, frame, flip });
          ctx.restore();
          if (t >= 21 && t < 21.7) for (let i = 0; i < 4; i++) { ctx.strokeStyle = '#140A20'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(riftX, G - 10 - i * 5); ctx.quadraticCurveTo((riftX + bx) / 2, G - 30 - i * 4, bx, by - 20 - i * 3); ctx.stroke(); }
        }
        if (fight && t > 18.5) {                                   // pebbles and torch sparks
          for (let i = 0; i < 3; i++) { const k = (t * 1.8 + i / 3) % 1; a.rect(lerp(106, bx - 4, k), G - 12 - Math.sin(k * Math.PI) * 12, 2, 2, '#B8B0A0'); }
          if (Math.sin(t * 9) > 0.3) { a.rect(bx - 8, G - 28, 4, 4, '#FFD84A'); a.rect(bx - 5, G - 24, 2, 2, '#FFF6A0'); }
        }
        if (cheer) for (let i = 0; i < 16; i++) a.rect((i * 37 + t * 40) % SW, ((t * 50 + i * 23) % 90), 2, 2, ['#B07CFF', '#6FF0D8', '#FFD84A', '#FF6AC8'][i % 4]);
        if (t > 24 && t < 25.6) a.put('teaser', 'gloop', 222, G + lerp(14, 2, seg(24, 24.5)), { blink: t > 25 && t < 25.1 });
        const emb = fadeIn(8.8, 10) * (1 - fadeIn(24, 26));
        if (emb > 0) embers.forEach(e => { const k = (e.s + t * e.v) % 1; a.rect(e.x + Math.sin(t + e.x) * 4, G - k * G, 1, 1, e.c); });
        if (t > 6.5 && t < 8.4 && Math.sin(t * 23) > 0.75) { ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(-20, -20, SW + 40, SH + 40); }
        // white flash coming back out of the Hollow
        if (t >= 14.2 && t < 14.6) { ctx.fillStyle = `rgba(255,255,255,${1 - (t - 14.2) / 0.4})`; ctx.fillRect(-40, -40, SW + 80, SH + 80); }
      }
      ctx.restore();

      // ---- title card, with a glitchy RGB split ----
      if (t >= 26) {
        const k = fadeIn(26, 26.6);
        ctx.fillStyle = '#05030C'; ctx.fillRect(0, 0, SW, SH);
        embers.forEach(e => { const q = (e.s + t * e.v) % 1; a.rect(e.x, SH - q * SH, 1, 1, e.c); });
        // the rift behind the title
        const g = ctx.createRadialGradient(SW / 2, 66, 0, SW / 2, 66, 100); g.addColorStop(0, `rgba(176,124,255,${0.35 * k})`); g.addColorStop(1, 'rgba(176,124,255,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, SW, SH);
        const glitch = t < 27.4 || (t % 2.3 < 0.12);
        const off = glitch ? rand(-2, 2) : 0.6;
        a.text('SOMETHING IS COMING', SW / 2 - off, 58, 18, `rgba(176,124,255,${0.7 * k})`);
        a.text('SOMETHING IS COMING', SW / 2 + off, 58 + (glitch ? rand(-1, 1) : 0), 18, `rgba(111,240,216,${0.7 * k})`);
        a.text('SOMETHING IS COMING', SW / 2, 58, 18, `rgba(237,255,250,${k * (glitch && Math.random() < 0.3 ? 0.3 : 1)})`, '#6FF0D8');
        if (glitch) for (let i = 0; i < 3; i++) a.rect(0, rand(40, 76), SW, 1, 'rgba(111,240,216,0.35)');
        a.text('A secret new pack for Bitty Buddies', SW / 2, 84, 8, `rgba(237,232,255,${fadeIn(27.2, 27.9)})`);
        a.text('STAY TUNED', SW / 2, 104, 10, `rgba(255,216,107,${fadeIn(28, 28.6)})`);
      }

      // ---- captions ----
      const cap = (txt, x0, x1, top) => {
        const al = Math.min(fadeIn(x0, x0 + 0.5), 1 - fadeIn(x1 - 0.5, x1));
        if (t <= x0 || t >= x1) return;
        if (t >= 2.6) a.rect(0, 129, SW, 13, `rgba(0,0,0,${0.6 * al})`);
        a.text(txt, SW / 2, t < 2.6 ? SH / 2 + 3 : 136, t < 2.6 ? 10 : 8, `rgba(237,232,255,${al})`);
      };
      cap('1986. A quiet little town.', 0.3, 2.6);
      cap('Then the lights started to flicker...', 6.5, 8.8);
      cap('And something opened up.', 9.2, 11.4);
      cap('On the other side...', 11.8, 13.4);
      cap('...something was watching.', 15, 16.8);
      cap('So the crew fought back.', 17.7, 20.2);
      cap("...it's not over.", 24.2, 25.8);

      // ---- letterbox + VHS ----
      if (t >= 2.6 && t < 26) { a.rect(0, 0, SW, 8, '#000'); a.rect(0, SH - 4, SW, 4, '#000'); }
      for (let y = 0; y < SH; y += 2) a.rect(0, y, SW, 1, 'rgba(0,0,0,0.16)');
      const tear = (t * 0.37) % 1; a.rect(0, tear * SH, SW, 2, 'rgba(255,255,255,0.05)');
      if (inHollow) for (let i = 0; i < 4; i++) a.rect(0, rand(0, SH), SW, rand(1, 3), 'rgba(111,240,216,0.12)');
      if (Math.floor(t * 1.4) % 2 === 0) a.text('▶ PLAY', 22, 16, 6, 'rgba(255,255,255,0.85)', null, 'left');
      const ss = Math.floor(t % 60);
      a.text(`SP  00:00:${String(ss).padStart(2, '0')}`, SW - 8, SH - 7, 5, 'rgba(255,255,255,0.7)', null, 'right');
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

  // Soft round light behind a build (campfire, lantern, shrine crystal).
  function glow(a, x, y, r, rgb, k = 1) {
    const g = a.ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${rgb},${0.45 * k})`); g.addColorStop(1, `rgba(${rgb},0)`);
    a.ctx.fillStyle = g; a.ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const has = (pack, key) => PACKS[pack] && PACKS[pack].items[key];

  // ---------- Critters: a sunny day in the meadow ----------
  const crittersBox = document.querySelector('[data-trailer="critters"]');
  if (crittersBox && PACKS.critters) {
    trailer(crittersBox, 12, (a, t) => {
      const { ctx, W, H, frame, state } = a, G = 80;
      if (!state.clouds) {
        state.clouds = Array.from({ length: 4 }, (_, i) => ({ x: i * 70 + rand(0, 30), y: rand(6, 26), w: rand(16, 30), v: rand(3, 6) }));
        state.flowers = Array.from({ length: 22 }, () => ({ x: rand(0, W), y: G + rand(2, 8), c: ['#FFFFFF', '#FFD84A', '#FF7FB0', '#B07CFF'][Math.floor(rand(0, 4))] }));
        state.flies = Array.from({ length: 3 }, (_, i) => ({ p: i * 2.1, y: rand(30, 60), c: ['#FFD84A', '#7FD8FF', '#FF9AD0'][i] }));
        state.hearts = [];
      }
      const sky = ctx.createLinearGradient(0, 0, 0, G); sky.addColorStop(0, '#6FB8EC'); sky.addColorStop(1, '#BFE6FA');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, G);
      a.rect(208, 10, 12, 12, '#FFE97A'); a.rect(206, 12, 16, 8, '#FFE97A'); a.rect(210, 8, 8, 16, '#FFE97A');   // sun
      for (const c of state.clouds) {
        const x = ((c.x + t * c.v) % (W + 40)) - 30;
        a.rect(x, c.y, c.w, 4, '#FFFFFF'); a.rect(x + 4, c.y - 3, c.w - 10, 3, '#FFFFFF'); a.rect(x + 2, c.y + 4, c.w - 4, 2, '#EAF6FF');
      }
      for (let x = 0; x < W; x += 16) a.rect(x, G - 10 - (x * 7) % 6, 16, 10 + (x * 7) % 6, '#8FCB6A');                  // far hills
      a.rect(0, G, W, H - G, '#6CBE4E'); a.rect(0, G, W, 2, '#54A03C'); a.rect(0, G + 6, W, H - G - 6, '#5DAE45');
      for (const f of state.flowers) { a.rect(f.x, f.y, 2, 2, f.c); a.rect(f.x, f.y + 2, 1, 2, '#3E8A3A'); }
      // a ball bouncing across, with the pup chasing it
      const bx = ((t * 34) % (W + 60)) - 30, by = G - 3 - Math.abs(Math.sin(t * 5)) * 16;
      a.put('critters', 'pup', bx - 22, G, { pose: 'walk', frame });
      a.rect(bx - 2, by - 2, 5, 5, '#E8394A'); a.rect(bx - 1, by - 1, 2, 2, '#FFB0B0');
      a.put('critters', 'kit', 40 + Math.sin(t * 0.6) * 18, G, { pose: t % 6 < 4 ? 'walk' : 'sit', frame, flip: Math.cos(t * 0.6) < 0 });
      if (has('critters', 'bun')) a.put('critters', 'bun', 150 + Math.sin(t * 0.9) * 30, G - Math.abs(Math.sin(t * 6)) * 6, { pose: 'walk', frame, flip: Math.cos(t * 0.9) < 0 });
      if (has('critters', 'mossling')) a.put('critters', 'mossling', 104, G - Math.abs(Math.sin(t * 4 + 1)) * 4, { pose: 'idle', frame });
      if (has('critters', 'ember')) a.put('critters', 'ember', 200, G - Math.abs(Math.sin(t * 5 + 2)) * 5, { pose: 'idle', frame });
      if (has('critters', 'pip')) a.put('critters', 'pip', lerp(230, 175, span(t, 2, 10)), G, { pose: t > 2 && t < 10 ? 'walk' : 'idle', frame, flip: true });
      // butterflies
      for (const b of state.flies) { const x = ((t * 18 + b.p * 60) % (W + 20)) - 10, y = b.y + Math.sin(t * 3 + b.p) * 6, wing = Math.floor(t * 8 + b.p) % 2; a.rect(x, y, 1, 2, '#3A2A1A'); a.rect(x - 2, y - wing, 2, 2, b.c); a.rect(x + 1, y - wing, 2, 2, b.c); }
      // the odd heart pops up when someone gets a pat
      if (Math.floor(t * 2) !== state.lastBeat) { state.lastBeat = Math.floor(t * 2); if (Math.random() < 0.35) state.hearts.push({ x: rand(30, 210), y: G - 18, life: 0 }); }
      state.hearts = state.hearts.filter(h => (h.life += 1 / 60) < 1.2);
      for (const h of state.hearts) { const y = h.y - h.life * 14; a.rect(h.x, y, 2, 1, '#FF5A8A'); a.rect(h.x + 3, y, 2, 1, '#FF5A8A'); a.rect(h.x - 1, y + 1, 7, 2, '#FF5A8A'); a.rect(h.x, y + 3, 5, 1, '#FF5A8A'); a.rect(h.x + 1, y + 4, 3, 1, '#FF5A8A'); a.rect(h.x + 2, y + 5, 1, 1, '#FF5A8A'); }
    });
  }

  // ---------- Builds: the camp from sunset to starlight ----------
  const buildsBox = document.querySelector('[data-trailer="builds"]');
  if (buildsBox && PACKS.builds) {
    trailer(buildsBox, 14, (a, t) => {
      const { ctx, W, H, frame, state } = a, G = 80;
      const night = clamp(span(t, 2, 8), 0, 1) * (1 - clamp(span(t, 12.5, 14), 0, 1));
      if (!state.stars) {
        state.stars = Array.from({ length: 50 }, () => [rand(0, W), rand(0, 55), rand(0, 6)]);
        state.flies = Array.from({ length: 12 }, () => ({ x: rand(0, W), y: rand(40, 76), p: rand(0, 6) }));
        state.sparks = [];
      }
      const mix = (c1, c2, k) => { const p = s => [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16)); const A = p(c1), B = p(c2); return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * k)).join(',')})`; };
      const sky = ctx.createLinearGradient(0, 0, 0, G);
      sky.addColorStop(0, mix('#F2A06A', '#120C2A', night)); sky.addColorStop(1, mix('#FFD9A0', '#2C1E4A', night));
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, G);
      const sunY = 30 + night * 50; a.rect(36, sunY, 14, 10, '#FFE7A0'); a.rect(34, sunY + 2, 18, 6, '#FFE7A0');
      for (const [x, y, k] of state.stars) a.rect(x, y, 1, 1, `rgba(255,255,255,${night * (0.4 + 0.5 * Math.abs(Math.sin(t * 1.4 + k)))})`);
      if (night > 0.5) { const mc = `rgba(232,226,208,${(night - 0.5) * 2})`; a.rect(170, 12, 10, 10, mc); a.rect(168, 14, 14, 6, mc); a.rect(172, 10, 6, 14, mc); }
      for (let x = 0; x < W; x += 12) a.rect(x, G - 14 - (x * 5) % 9, 12, 14 + (x * 5) % 9, mix('#7A8A4A', '#14182A', night));  // tree line
      a.rect(0, G, W, H - G, mix('#6CBE4E', '#1E3A24', night)); a.rect(0, G, W, 2, mix('#54A03C', '#16301C', night));
      // the builds, glowing brighter as it gets dark
      glow(a, 120, G - 9, 30, '255,150,60', 0.4 + night * (0.9 + Math.sin(t * 9) * 0.1));
      glow(a, 46, G - 14, 26, '170,120,255', 0.3 + night * 0.8);
      glow(a, 196, G - 14, 22, '255,215,110', 0.3 + night * 0.8);
      a.put('builds', 'shrine', 46, G, { frame });
      a.put('builds', 'campfire', 120, G, { frame });
      a.put('builds', 'lantern', 196, G, { frame });
      // sparks rising from the fire
      if (Math.random() < 0.3) state.sparks.push({ x: 120 + rand(-3, 3), y: G - 12, v: rand(10, 20), life: 0 });
      state.sparks = state.sparks.filter(s => (s.life += 1 / 60) < 1.4);
      for (const s of state.sparks) a.rect(s.x + Math.sin(s.life * 6) * 2, s.y - s.life * s.v, 1, 1, s.life < 0.7 ? '#FFD84A' : '#FF8A3C');
      // pets wander in and curl up by the fire as night falls
      const settle = (from, to, t0, t1) => lerp(from, to, span(t, t0, t1));
      const walking = (t0, t1) => t > t0 && t < t1;
      a.put('critters', 'pup', settle(-20, 98, 1, 6), G, walking(1, 6) ? { pose: 'walk', frame } : t >= 6 ? { pose: night > 0.8 ? 'sleep' : 'sit', frame } : { pose: 'idle', frame });
      a.put('critters', 'kit', settle(260, 142, 2, 7), G, walking(2, 7) ? { pose: 'walk', frame, flip: true } : t >= 7 ? { pose: night > 0.8 ? 'sleep' : 'sit', frame, flip: true } : { pose: 'idle', frame, flip: true });
      if (has('critters', 'pip')) a.put('critters', 'pip', settle(-30, 70, 4, 9), G, walking(4, 9) ? { pose: 'walk', frame } : t >= 9 ? { pose: 'sit', frame } : { pose: 'idle', frame });
      // fireflies come out at night
      for (const f of state.flies) { const on = Math.sin(t * 2 + f.p) > 0.2; if (on && night > 0.4) a.rect(f.x + Math.sin(t + f.p) * 8, f.y + Math.cos(t * 1.3 + f.p) * 4, 1, 1, `rgba(220,255,140,${night})`); }
    });
  }

  // ---------- Fantasy Folk: twilight in the wizard's village ----------
  const fantasyBox = document.querySelector('[data-trailer="fantasy"]');
  if (fantasyBox && PACKS.fantasy) {
    trailer(fantasyBox, 12, (a, t) => {
      const { ctx, W, H, frame, state } = a, G = 80;
      if (!state.motes) {
        state.motes = Array.from({ length: 26 }, () => ({ x: rand(0, W), s: rand(0, 1), v: rand(0.04, 0.09), c: Math.random() < 0.5 ? '#B07CFF' : '#7FE8FF' }));
        state.stars = Array.from({ length: 30 }, () => [rand(0, W), rand(0, 40), rand(0, 6)]);
        state.sparks = []; state.magic = [];
      }
      const sky = ctx.createLinearGradient(0, 0, 0, G); sky.addColorStop(0, '#2A1E5A'); sky.addColorStop(0.7, '#6A4A9A'); sky.addColorStop(1, '#E89A8A');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, G);
      for (const [x, y, k] of state.stars) a.rect(x, y, 1, 1, `rgba(255,255,255,${0.3 + 0.5 * Math.abs(Math.sin(t * 1.3 + k))})`);
      a.rect(30, 10, 10, 10, '#F4EED8'); a.rect(33, 10, 7, 10, '#2A1E5A'); a.rect(33, 12, 6, 6, '#2A1E5A');           // crescent moon
      for (let x = 0; x < W; x += 10) { const h = 18 + (x * 13) % 12; a.rect(x + 3, G - h, 4, h, '#3A2A5E'); a.rect(x + 1, G - h + 4, 8, h - 4, '#3A2A5E'); }   // pine silhouettes
      a.rect(0, G, W, H - G, '#3E6A3A'); a.rect(0, G, W, 2, '#2E5A2E');
      for (let x = 70; x < 170; x += 6) a.rect(x, G + 3, 4, 2, '#8A7A66');                                             // path stones
      glow(a, 196, G - 26, 24, '176,124,255', 0.6 + Math.sin(t * 2) * 0.15);
      a.put('fantasy', 'tower', 196, G, { frame });
      a.put('fantasy', 'burrow', 34, G, { frame });
      if (has('fantasy', 'forge')) { glow(a, 128, G - 8, 18, '255,140,60', 0.7 + Math.sin(t * 10) * 0.15); a.put('fantasy', 'forge', 128, G, { frame }); }
      // dwarf hammering at the forge, sparks flying
      if (has('fantasy', 'dwarf')) {
        a.put('fantasy', 'dwarf', 110, G, { pose: 'idle', frame });
        if (frame && Math.random() < 0.5) for (let i = 0; i < 3; i++) state.sparks.push({ x: 116, y: G - 8, vx: rand(-14, 14), vy: rand(-26, -12), life: 0 });
      }
      state.sparks = state.sparks.filter(s => (s.life += 1 / 60) < 0.6);
      for (const s of state.sparks) a.rect(s.x + s.vx * s.life, s.y + s.vy * s.life + 40 * s.life * s.life, 1, 1, '#FFD84A');
      // the knight patrols, the ranger strolls, the wizard casts
      const kx = 60 + Math.sin(t * 0.5) * 40;
      a.put('fantasy', 'knight', kx, G, { pose: 'walk', frame, flip: Math.cos(t * 0.5) < 0 });
      a.put('fantasy', 'ranger', lerp(-20, 80, span(t, 1, 7)), G, t > 1 && t < 7 ? { pose: 'walk', frame } : { pose: 'idle', frame });
      a.put('fantasy', 'wizard', 168, G, { pose: 'idle', frame, flip: true });
      if (t % 3 < 0.05 && state.lastCast !== Math.floor(t / 3)) { state.lastCast = Math.floor(t / 3); for (let i = 0; i < 14; i++) state.magic.push({ a: rand(0, Math.PI * 2), r: 0, v: rand(10, 22), life: 0 }); }
      state.magic = state.magic.filter(m => (m.life += 1 / 60) < 1.1);
      for (const m of state.magic) { const r = m.v * m.life; a.rect(166 + Math.cos(m.a) * r, G - 22 + Math.sin(m.a) * r, 1, 1, m.life < 0.5 ? '#FFFFFF' : '#B07CFF'); }
      // drifting magic motes
      for (const m of state.motes) { const k = (m.s + t * m.v) % 1; a.rect(m.x + Math.sin(t + m.x) * 4, G - k * G, 1, 1, m.c); }
    });
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
