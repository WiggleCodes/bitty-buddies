// Bitty Buddies site: the meadow in the hero, pixel textures for the underground, and the inventory.
(() => {
  const PX = window.BBPixel;
  const PACKS = {};
  for (const p of window.BBPacks || []) PACKS[p.id] = p;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rand = (a, b) => a + Math.random() * (b - a);

  function gridToCanvas(grid, flip) {
    const c = document.createElement('canvas');
    c.width = grid[0].length; c.height = grid.length;
    const x = c.getContext('2d');
    grid.forEach((row, j) => row.forEach((col, i) => {
      if (!col) return;
      x.fillStyle = col; x.fillRect(flip ? row.length - 1 - i : i, j, 1, 1);
    }));
    return c;
  }

  // ---------- underground textures (8px blocks of noise, the odd ore in the stone) ----------
  // A 192px tile so the repeat isn't obvious, with a few scattered ore specks.
  function texture(base, shades, ores) {
    const N = 48, B = 4;
    const c = document.createElement('canvas'); c.width = c.height = N * B;
    const x = c.getContext('2d');
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      x.fillStyle = Math.random() < 0.55 ? base : shades[Math.floor(Math.random() * shades.length)];
      x.fillRect(i * B, j * B, B, B);
    }
    for (let k = 0; ores && k < 3; k++) {
      const ox = Math.floor(rand(1, N - 3)) * B, oy = Math.floor(rand(1, N - 3)) * B;
      x.fillStyle = ores[k % ores.length];
      x.fillRect(ox, oy, B, B); x.fillRect(ox + B, oy + B, B, B); x.fillRect(ox + 2 * B, oy, B, B);
    }
    return `url(${c.toDataURL()})`;
  }
  const tex = {
    '.layer.dirt': texture('#7C573A', ['#6E4D33', '#8A6242', '#755237']),
    '.layer.deep-dirt': texture('#5E422C', ['#533A27', '#694A31', '#4C3524']),
    '.layer.pricing-layer': texture('#4C3524', ['#433022', '#563C29', '#3E2C1F']),
    '.layer.stone-layer': texture('#6B7078', ['#62666E', '#757A82', '#5D6168'], ['#E7B93C', '#7FE8FF', '#C8392F']),
    '.bedrock': texture('#2F3238', ['#26292E', '#3A3D44', '#1F2125'])
  };
  for (const [sel, img] of Object.entries(tex)) document.querySelectorAll(sel).forEach(el => { el.style.backgroundImage = img; });

  // ---------- clouds ----------
  const cloudBox = document.querySelector('.clouds');
  for (let k = 0; k < 6; k++) {
    const w = Math.floor(rand(5, 10));
    const c = document.createElement('canvas'); c.width = w + 2; c.height = 3;
    const x = c.getContext('2d'); x.fillStyle = '#fff';
    x.fillRect(1, 0, w - 1, 1); x.fillRect(0, 1, w + 2, 1); x.fillRect(1, 2, w, 1);
    c.className = 'cloud';
    const size = rand(10, 18);
    c.style.width = (w + 2) * size + 'px';
    c.style.top = rand(4, 45) + '%';
    const dur = rand(70, 140);
    c.style.animationDuration = dur + 's';
    c.style.animationDelay = -rand(0, dur) + 's';
    if (reduced) c.style.transform = `translateX(${rand(0, 90)}vw)`;
    cloudBox.appendChild(c);
  }

  // ---------- inventory ----------
  const detail = document.getElementById('detail');
  document.querySelectorAll('.inventory').forEach(box => {
    const pack = PACKS[box.dataset.pack];
    if (!pack) return;
    for (const item of Object.values(pack.items)) {
      const def = PX.withDefaults(item);
      const b = document.createElement('button');
      b.className = 'slot';
      b.setAttribute('aria-label', `${def.name}: ${def.blurb}`);
      b.appendChild(gridToCanvas(PX.drawItem(def, { pose: 'idle', frame: 0, blink: false })));
      const say = () => {
        document.querySelectorAll('.slot.on').forEach(s => s.classList.remove('on'));
        b.classList.add('on');
        detail.textContent = `${def.name}: ${def.blurb}${pack.licensed ? ' (licence key)' : ''}`;
      };
      b.addEventListener('mouseenter', say); b.addEventListener('focus', say); b.addEventListener('click', say);
      box.appendChild(b);
    }
  });

  // ---------- the meadow ----------
  const canvas = document.getElementById('meadow');
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, S = 4, GROUND = 0;
  const things = [], particles = [];
  const frames = new Map();

  function resize() {
    const d = devicePixelRatio || 1;
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = Math.round(W * d); canvas.height = Math.round(H * d);
    ctx.setTransform(d, 0, 0, d, 0, 0); ctx.imageSmoothingEnabled = false;
    S = W < 640 ? 3 : W < 1100 ? 4 : 5;
    GROUND = H - 16 * S;
    things.forEach(t => { t.x = Math.min(t.x, W - t.def.w * S); if (t.state !== 'held') t.y = GROUND; });
  }

  class Thing {
    constructor(packId, key, x) {
      this.def = PX.withDefaults(PACKS[packId].items[key]);
      this.key = packId + '/' + key;
      this.build = this.def.kind === 'build';
      this.x = x; this.y = -rand(40, 400);
      this.vx = 0; this.vy = 0; this.dir = this.build || Math.random() < 0.5 ? 1 : -1;
      this.state = 'fall'; this.timer = 0; this.frame = 0; this.anim = rand(0, .3);
      this.blink = false; this.blinkT = rand(1, 5); this.hop = 0; this.zT = 0;
    }
    w() { return this.def.w * S; }
    hopY() { return this.def.move === 'hop' && this.state === 'walk' ? -Math.abs(Math.sin(this.hop * Math.PI)) * 5 * S : 0; }
    top() { return this.y - this.def.feet * S + this.hopY(); }
    sprite() {
      if (this.build) return { pose: 'idle', frame: this.frame, blink: false };
      const pose = this.state === 'walk' ? 'walk' : this.state === 'sit' || this.state === 'sleep' ? this.state : 'idle';
      let frame = this.frame;
      if (this.def.move === 'hop' && this.state === 'walk') frame = Math.abs(Math.sin(this.hop * Math.PI)) < .25 ? 1 : 0;
      if (this.state === 'fall' || this.state === 'held') frame = 0;
      return { pose, frame, blink: this.blink };
    }
    set(state, dur) { this.state = state; this.timer = dur ?? rand(2, 6); if (state === 'walk' && Math.random() < .5) this.dir *= -1; }
    next() {
      if (this.build) { this.state = 'rest'; return; }
      const cx = this.x + this.w() / 2;
      const near = things.some(b => b.build && Math.abs(b.x + b.w() / 2 - cx) < b.w() / 2 + 8 * S);
      const r = Math.random();
      if (near && r < .55) return this.set(Math.random() < .5 ? 'sit' : 'sleep', rand(6, 12));
      if (reduced) return this.set(r < .6 ? 'idle' : 'sit', rand(4, 8));
      if (r < .5) this.set('walk', rand(2, 7)); else if (r < .75) this.set('idle', rand(2, 5));
      else if (r < .9) this.set('sit', rand(3, 8)); else this.set('sleep', rand(6, 12));
    }
    update(dt) {
      this.anim += dt;
      if (this.anim > (this.build ? .35 : this.state === 'walk' ? .18 : .5)) { this.anim = 0; this.frame ^= 1; }
      if (!this.build) { this.blinkT -= dt; if (this.blinkT <= 0) { this.blink = !this.blink; this.blinkT = this.blink ? .15 : rand(2, 6); } }
      const maxX = W - this.w();
      if (this.state === 'held') return;
      if (this.state === 'fall') {
        this.vy += 2200 * dt; this.x += this.vx * dt; this.y += this.vy * dt;
        if (this.x < 0) { this.x = 0; this.vx *= -.5; } if (this.x > maxX) { this.x = maxX; this.vx *= -.5; }
        if (this.y >= GROUND) { this.y = GROUND; if (this.vy > 700) { this.vy *= -.3; this.vx *= .6; } else { this.vy = this.vx = 0; this.next(); } }
        return;
      }
      if (this.build) return;
      if (this.state === 'walk') {
        if (this.def.move === 'hop') this.hop += dt * 2.2;
        this.x += this.dir * this.def.speed * (S / 4) * dt;
        if (this.x <= 0) { this.x = 0; this.dir = 1; } else if (this.x >= maxX) { this.x = maxX; this.dir = -1; }
      } else if (this.state === 'sleep' && (this.zT -= dt) <= 0) {
        this.zT = 1.3; particles.push({ z: true, x: this.x + this.w() * (this.dir > 0 ? .65 : .35), y: this.top() + 2 * S, t: 0, life: 2.2 });
      }
      if ((this.timer -= dt) <= 0) this.next();
    }
  }

  function frameFor(t) {
    const s = t.sprite();
    const k = [t.key, s.pose, s.frame, s.blink ? 1 : 0, t.dir].join('|');
    if (!frames.has(k)) {
      const g = PX.drawItem(t.def, s);
      frames.set(k, { img: gridToCanvas(g, t.dir < 0), grid: t.dir < 0 ? g.map(r => r.slice().reverse()) : g });
    }
    return frames.get(k);
  }

  const HEART = ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'];
  const ZED = ['XXXX', '..X.', '.X..', 'XXXX'];
  function pattern(p, cx, y, px, col) {
    ctx.fillStyle = col;
    const ox = cx - p[0].length * px / 2;
    p.forEach((row, j) => [...row].forEach((ch, i) => { if (ch === 'X') ctx.fillRect(Math.round(ox + i * px), Math.round(y + j * px), px, px); }));
  }

  function drawGround() {
    for (let x = 0; x < W; x += S * 4) {
      const n = (x / (S * 4)) * 7 % 5;
      ctx.fillStyle = '#6CBE4E'; ctx.fillRect(x, GROUND, S * 4, S * 2);
      ctx.fillStyle = '#54A03C'; ctx.fillRect(x, GROUND + S * 2, S * 4, S * 2);
      if (n < 1) { ctx.fillStyle = '#6CBE4E'; ctx.fillRect(x + S, GROUND - S, S, S); }
      for (let y = GROUND + S * 4; y < H; y += S * 4) {
        const m = (x * 3 + y * 7) % 5;
        ctx.fillStyle = m === 0 ? '#6E4D33' : m === 1 ? '#8A6242' : '#7C573A';
        ctx.fillRect(x, y, S * 4, S * 4);
      }
    }
  }

  function draw(now) {
    ctx.clearRect(0, 0, W, H);
    for (const t of things) if (t.build && t.def.glow) {
      const g = t.def.glow, cx = t.x + g.x * S, cy = t.top() + g.y * S, r = g.r * S * (1 + .05 * Math.sin(now / 280));
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      grad.addColorStop(0, `rgba(${g.rgb},.35)`); grad.addColorStop(1, `rgba(${g.rgb},0)`);
      ctx.fillStyle = grad; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    }
    drawGround();
    const order = [...things].sort((a, b) => (a.build === b.build ? 0 : a.build ? -1 : 1));
    for (const t of order) {
      if (!t.build) {
        const k = Math.min(1, Math.max(0, GROUND - t.y - t.hopY()) / (30 * S));
        ctx.fillStyle = `rgba(0,0,0,${.22 * (1 - k)})`;
        ctx.beginPath(); ctx.ellipse(t.x + t.w() / 2, GROUND - S * .6, t.w() * .32 * (1 - .4 * k), S * .7, 0, 0, 7); ctx.fill();
      }
      ctx.drawImage(frameFor(t).img, Math.round(t.x), Math.round(t.top()), t.w(), t.def.h * S);
    }
    const px = Math.max(2, Math.round(S / 2));
    for (const p of particles) {
      ctx.globalAlpha = 1 - p.t / p.life;
      if (p.z) pattern(ZED, p.x + Math.sin(p.t * 3) * 3 * px, p.y, px, '#5C6FD6');
      else pattern(HEART, p.x, p.y - 6 * px, px, '#FF4F7B');
    }
    ctx.globalAlpha = 1;
  }

  // pointer: click to jump, drag to throw
  let drag = null;
  function thingAt(mx, my) {
    for (let i = things.length - 1; i >= 0; i--) {
      const t = things[i];
      const gx = Math.floor((mx - t.x) / S), gy = Math.floor((my - t.top()) / S);
      const g = frameFor(t).grid;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++)
        if (g[gy + dy] && g[gy + dy][gx + dx]) return t;
    }
    return null;
  }
  const pos = e => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  canvas.addEventListener('pointermove', e => {
    const [mx, my] = pos(e);
    if (!drag) { canvas.style.cursor = thingAt(mx, my) ? 'grab' : 'default'; return; }
    if (!drag.moved && Math.hypot(mx - drag.sx, my - drag.sy) > 4) drag.moved = true;
    if (!drag.moved) return;
    const t = drag.t, now = performance.now(), dt = Math.max(1, now - drag.lt);
    t.state = 'held';
    drag.vx = drag.vx * .5 + (mx - drag.lx) / dt * 500; drag.vy = drag.vy * .5 + (my - drag.ly) / dt * 500;
    if (!t.build && Math.abs(mx - drag.lx) > 1) t.dir = mx > drag.lx ? 1 : -1;
    drag.lx = mx; drag.ly = my; drag.lt = now;
    t.x = Math.max(0, Math.min(W - t.w(), mx - drag.ox));
    t.y = t.build ? GROUND : Math.min(GROUND, my + drag.oy);
  });
  canvas.addEventListener('pointerdown', e => {
    const [mx, my] = pos(e);
    const t = thingAt(mx, my);
    if (!t) return;
    e.preventDefault(); canvas.setPointerCapture(e.pointerId);
    things.splice(things.indexOf(t), 1); things.push(t);
    drag = { t, sx: mx, sy: my, lx: mx, ly: my, lt: performance.now(), ox: mx - t.x, oy: t.y - my, vx: 0, vy: 0, moved: false };
    canvas.style.cursor = 'grabbing';
  });
  const release = () => {
    if (!drag) return;
    const t = drag.t;
    if (!drag.moved) { if (!t.build) { t.vx = 0; t.vy = -650; t.state = 'fall'; } particles.push({ x: t.x + t.w() / 2, y: t.top(), t: 0, life: 1.4 }); }
    else { t.vx = t.build ? 0 : Math.max(-1500, Math.min(1500, drag.vx)); t.vy = t.build ? 0 : Math.max(-1500, Math.min(1500, drag.vy)); t.state = 'fall'; }
    drag = null; canvas.style.cursor = 'grab';
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);

  // cast
  resize();
  new ResizeObserver(resize).observe(canvas); // the hero can change height (mobile toolbars, fonts loading)
  const cast = W < 640
    ? [['builds', 'campfire', .55], ['critters', 'pup', .1], ['critters', 'mossling', .3], ['fantasy', 'wizard', .75], ['critters', 'kit', .85]]
    : [['builds', 'shrine', .62], ['builds', 'campfire', .2], ['builds', 'lantern', .92],
       ['critters', 'pup', .05], ['critters', 'kit', .15], ['critters', 'bun', .28], ['critters', 'mossling', .38], ['critters', 'ember', .46],
       ['critters', 'pip', .54], ['fantasy', 'wizard', .7], ['fantasy', 'knight', .76], ['fantasy', 'dwarf', .82], ['fantasy', 'ranger', .88]];
  for (const [p, k, f] of cast) if (PACKS[p]) things.push(new Thing(p, k, f * (W - 100)));

  let last = performance.now(), visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(canvas);
  function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    if (!visible) return;
    things.forEach(t => t.update(dt));
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]; p.t += dt; p.y += (p.z ? -18 : -32) * dt;
      if (p.t >= p.life) particles.splice(i, 1);
    }
    draw(now);
  }
  requestAnimationFrame(loop);
})();
