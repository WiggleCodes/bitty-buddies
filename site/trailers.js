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

  function trailer(canvas, length, scene) {
    const ctx = canvas.getContext('2d');
    const W = 240, H = 90;                      // scene size in sprite pixels
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
      rect(x, y, w, h, col) { ctx.fillStyle = col; ctx.fillRect(Math.round(x), Math.round(y), w, h); }
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

  // ---------- Night Shift '86 ----------
  const nightBox = document.querySelector('[data-trailer="nightshift"]');
  if (nightBox && PACKS.nightshift) {
    const stars = Array.from({ length: 40 }, () => [rand(0, 240), rand(0, 55), Math.random()]);
    trailer(nightBox, 14, (a, t) => {
      const { ctx, W, H, frame, state } = a, G = 82;
      // sky, stars, moon
      const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#120C2A'); g.addColorStop(1, '#2C1E4A');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      stars.forEach(([x, y, k]) => a.rect(x, y, 1, 1, `rgba(255,255,255,${0.4 + 0.5 * Math.abs(Math.sin(t * 2 + k * 9))})`));
      a.rect(200, 10, 10, 10, '#E8E2D0'); a.rect(198, 12, 2, 6, '#E8E2D0'); a.rect(210, 12, 2, 6, '#E8E2D0'); a.rect(203, 13, 2, 2, '#CFC6B4');
      // lightning flash when the rift tears open
      const flash = Math.max(0, 1 - Math.abs(t - 3) * 6) + Math.max(0, 0.6 - Math.abs(t - 3.3) * 6);
      if (flash > 0) { ctx.fillStyle = `rgba(220,210,255,${0.35 * flash})`; ctx.fillRect(0, 0, W, H); }
      // ground
      a.rect(0, G, W, 8, '#1E3A22'); a.rect(0, G, W, 2, '#2E5C2B');
      a.put('nightshift', 'treehouse', 22, G, { frame });
      a.put('nightshift', 'arcade', 222, G, { frame });
      // the rift
      const riftX = 160, open = clamp(span(t, 2.6, 3.4), 0, 1) * (1 - clamp(span(t, 10.4, 11), 0, 1));
      if (open > 0) {
        const h = 26 * open;
        const glow = ctx.createRadialGradient(riftX, G - h / 2, 0, riftX, G - h / 2, h);
        glow.addColorStop(0, 'rgba(176,124,255,0.6)'); glow.addColorStop(1, 'rgba(111,240,216,0)');
        ctx.fillStyle = glow; ctx.fillRect(riftX - h, G - h * 1.6, h * 2, h * 1.6);
        for (let y = 0; y < h; y++) {
          const half = Math.max(1, 4 * open * Math.sin((y / h) * Math.PI) + (Math.sin(y * 0.9 + t * 9) > 0.6 ? 1 : 0));
          a.rect(riftX - half - 1, G - y - 1, half * 2 + 2, 1, '#6FF0D8');
          a.rect(riftX - half, G - y - 1, half * 2, 1, '#B07CFF');
          a.rect(riftX - half + 1, G - y - 1, Math.max(0, half * 2 - 2), 1, '#0E0818');
        }
      }
      // the crew walks in, then fights
      const fight = t > 6 && t < 10.6, cheer = t > 11.2;
      const hop = cheer ? -Math.abs(Math.sin(t * 9)) * 4 : 0;
      const crewX = lerp(-30, 70, span(t, 0, 2.5));
      const walk = t < 2.5 ? { pose: 'walk', frame } : null;
      a.put('nightshift', 'dog', crewX - 26, G + hop * 0.5, walk || { pose: t > 4.5 && t < 6 ? 'idle' : 'idle', frame: t > 4.5 && t < 6 ? frame : 0 });
      a.put('nightshift', 'torch', crewX, G + hop, fight ? { pose: 'aim', frame } : walk || {});
      a.put('nightshift', 'sling', crewX + 18, G + hop, fight ? { pose: 'aim', frame } : walk || {});
      a.put('nightshift', 'radio', crewX - 12, G + hop, walk || { frame: 0, blink: frame && t % 3 < 0.2 });
      // the Grimlurk
      let bx = riftX, by = G, pose = 'stalk', flip = true, show = t > 3.4 && t < 11;
      if (t < 5) by = G + lerp(34, 0, span(t, 3.4, 5));                                  // rising out
      else if (t < 6.4) pose = 'roar';
      else if (t < 7.6) { bx = lerp(riftX, 120, span(t, 6.4, 7.6)); }                   // stalking
      else if (t < 8.4) { pose = 'pounce'; bx = lerp(120, 104, span(t, 7.6, 8.4)); by = G - Math.sin(span(t, 7.6, 8.4) * Math.PI) * 18; }
      else if (t < 9.2) { pose = 'hurt'; bx = 104 + Math.sin(t * 50); }
      else { pose = 'walk'; flip = false; bx = lerp(104, riftX, span(t, 9.2, 10)); by = G + lerp(0, 34, span(t, 10, 10.9)); }
      if (show) {
        ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, G); ctx.clip();
        a.put('nightshift', 'grimlurk', bx, by, { pose, frame, flip });
        ctx.restore();
        if (t > 5 && t < 6.4) ctx.translate(Math.sin(t * 80), 0);
      }
      // torch beam and slingshot pebbles hitting it
      if (fight && t > 7.6 && t < 9.2) {
        for (let i = 0; i < 3; i++) { const k = ((t * 1.6 + i / 3) % 1); a.rect(lerp(crewX + 24, bx - 6, k), G - 14 - Math.sin(k * Math.PI) * 10, 1.5, 1.5, '#9A9488'); }
      }
      if (t > 8.4 && t < 9.2) { a.rect(bx - 8, G - 26, 3, 3, '#FFD84A'); a.rect(bx - 6, G - 22, 2, 2, '#FFF6A0'); }
      // gloop peeks out at the very end
      if (t > 12) a.put('nightshift', 'gloop', 186, G + lerp(14, 0, span(t, 12, 12.8)), { blink: frame === 1 && t > 13.5 });
      // embers
      for (let i = 0; i < 14; i++) { const k = (t * 0.12 + i / 14) % 1; a.rect((i * 53) % W + Math.sin(t + i) * 4, G - k * G, 1, 1, i % 3 ? '#FF8A3C' : '#FFC46A'); }
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
