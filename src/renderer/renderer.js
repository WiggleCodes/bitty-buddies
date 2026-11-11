// Bitty Buddies overlay: runs the pets and builds on a transparent full-screen canvas.
(() => {
  const PX = window.BBPixel;
  const api = window.bb;
  const canvas = document.getElementById('stage');
  const ctx = canvas.getContext('2d');

  const MAX_THINGS = 40;
  const REG = {};            // "pack/item" -> definition
  let things = [];
  let scale = 4, hidden = false, ready = false, uidSeq = 1;
  let ignoring = true, drag = null;
  const particles = [];
  const frames = new Map();

  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const W = () => innerWidth, H = () => innerHeight;

  // ---------- setup ----------
  function resize() {
    const d = devicePixelRatio || 1;
    canvas.width = Math.round(innerWidth * d);
    canvas.height = Math.round(innerHeight * d);
    canvas.style.width = innerWidth + 'px';
    canvas.style.height = innerHeight + 'px';
    ctx.setTransform(d, 0, 0, d, 0, 0);
    ctx.imageSmoothingEnabled = false;
    things.forEach(t => t.clamp());
  }
  addEventListener('resize', resize);

  function loadPacks(files) {
    return files.reduce((p, f) => p.then(() => new Promise(res => {
      const s = document.createElement('script');
      s.src = '../packs/' + f;
      s.onload = res;
      s.onerror = () => { console.error('Pack failed to load:', f); res(); };
      document.body.appendChild(s);
    })), Promise.resolve()).then(() => {
      for (const pack of window.BBPacks || [])
        for (const [key, item] of Object.entries(pack.items))
          REG[`${pack.id}/${key}`] = PX.withDefaults(item);
    });
  }

  function frameFor(t, st) {
    const key = [t.id, st.pose, st.frame, st.blink ? 1 : 0, t.dir].join('|');
    let f = frames.get(key);
    if (!f) {
      let g = PX.drawItem(t.def, st);
      if (t.dir < 0) g = g.map(row => row.slice().reverse());
      const oc = document.createElement('canvas');
      oc.width = t.def.w; oc.height = t.def.h;
      const o = oc.getContext('2d');
      g.forEach((row, y) => row.forEach((c, x) => { if (c) { o.fillStyle = c; o.fillRect(x, y, 1, 1); } }));
      f = { img: oc, grid: g };
      frames.set(key, f);
    }
    return f;
  }

  // ---------- things (pets + builds) ----------
  class Thing {
    constructor(id, opts = {}) {
      this.uid = uidSeq++;
      this.id = id;
      this.def = REG[id];
      this.isBuild = this.def.kind === 'build';
      this.dir = this.isBuild ? 1 : (Math.random() < 0.5 ? 1 : -1);
      const w = this.wpx();
      this.x = typeof opts.x === 'number' ? opts.x * (W() - w) : rand(20, Math.max(21, W() - w - 20));
      this.y = -rand(20, 200);           // y = feet position; spawn above the screen and drop in
      this.vx = 0; this.vy = 0;
      this.state = 'fall'; this.timer = 0;
      this.frame = 0; this.animT = rand(0, 0.3);
      this.blink = false; this.blinkT = rand(1, 5);
      this.hop = 0; this.zT = 0;
    }
    wpx() { return this.def.w * scale; }
    hpx() { return this.def.h * scale; }
    clamp() {
      this.x = clamp(this.x, 0, Math.max(0, W() - this.wpx()));
      if (this.state !== 'held' && this.y > H()) this.y = H();
    }
    hopOffset() {
      return this.def.move === 'hop' && this.state === 'walk' ? -Math.abs(Math.sin(this.hop * Math.PI)) * 5 * scale : 0;
    }
    top() { return this.y - this.def.feet * scale + this.hopOffset(); }
    spriteState() {
      if (this.isBuild) return { pose: 'idle', frame: this.frame, blink: false };
      let pose = this.state === 'walk' ? 'walk' : (this.state === 'sit' || this.state === 'sleep') ? this.state : 'idle';
      let frame = this.frame;
      if (this.def.move === 'hop' && this.state === 'walk') frame = Math.abs(Math.sin(this.hop * Math.PI)) < 0.25 ? 1 : 0;
      if (this.state === 'fall' || this.state === 'held') frame = 0;
      return { pose, frame, blink: this.blink };
    }
    set(state, dur) {
      this.state = state;
      this.timer = dur != null ? dur : rand(2, 6);
      if (state === 'walk' && Math.random() < 0.5) this.dir *= -1;
    }
    nearBuild() {
      const cx = this.x + this.wpx() / 2;
      return things.find(b => b.isBuild && Math.abs(b.x + b.wpx() / 2 - cx) < b.wpx() / 2 + 8 * scale);
    }
    next() {
      if (this.isBuild) { this.state = 'rest'; return; }
      const r = Math.random();
      if (this.nearBuild() && r < 0.55) return this.set(Math.random() < 0.5 ? 'sit' : 'sleep', rand(6, 14));
      if (r < 0.5) this.set('walk', rand(2, 7));
      else if (r < 0.75) this.set('idle', rand(2, 5));
      else if (r < 0.9) this.set('sit', rand(3, 8));
      else this.set('sleep', rand(8, 16));
    }
    update(dt) {
      this.animT += dt;
      const rate = this.isBuild ? 0.35 : this.state === 'walk' ? 0.18 : 0.5;
      if (this.animT > rate) { this.animT = 0; this.frame ^= 1; }
      if (!this.isBuild) {
        this.blinkT -= dt;
        if (this.blinkT <= 0) { this.blink = !this.blink; this.blinkT = this.blink ? 0.15 : rand(2, 6); }
      }
      const ground = H(), maxX = Math.max(0, W() - this.wpx());

      if (this.state === 'held') return;
      if (this.state === 'fall') {
        this.vy += 2200 * dt;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        if (this.x < 0) { this.x = 0; this.vx = -this.vx * 0.5; }
        if (this.x > maxX) { this.x = maxX; this.vx = -this.vx * 0.5; }
        if (this.y >= ground) {
          this.y = ground;
          if (this.vy > 700) { this.vy = -this.vy * 0.3; this.vx *= 0.6; }
          else { this.vy = 0; this.vx = 0; this.next(); }
        }
        return;
      }
      if (this.y < ground - 1) { this.vy = 0; this.state = 'fall'; return; } // screen got taller

      if (this.isBuild) return;
      if (this.state === 'walk') {
        if (this.def.move === 'hop') this.hop += dt * 2.2;
        this.x += this.dir * this.def.speed * (scale / 4) * dt;
        if (this.x <= 0) { this.x = 0; this.dir = 1; }
        else if (this.x >= maxX) { this.x = maxX; this.dir = -1; }
      } else if (this.state === 'sleep') {
        this.zT -= dt;
        if (this.zT <= 0) {
          this.zT = 1.3;
          particles.push({ kind: 'z', x: this.x + this.wpx() * (this.dir > 0 ? 0.65 : 0.35), y: this.top() + 2 * scale, vy: -18, t: 0, life: 2.2 });
        }
      }
      this.timer -= dt;
      if (this.timer <= 0) this.next();
    }
  }

  function heart(t) {
    particles.push({ kind: 'heart', x: t.x + t.wpx() / 2, y: t.top(), vy: -32, t: 0, life: 1.4 });
  }

  // Pets that bump into each other stop for a little hello.
  function socialise() {
    const walkers = things.filter(t => !t.isBuild && t.state === 'walk');
    for (let i = 0; i < walkers.length; i++)
      for (let j = i + 1; j < walkers.length; j++) {
        const a = walkers[i], b = walkers[j];
        if (Math.abs(a.x - b.x) < 10 * scale && Math.random() < 0.01) {
          a.dir = b.x > a.x ? 1 : -1; b.dir = -a.dir;
          a.set('idle', rand(2, 4)); b.set('idle', rand(2, 4));
          heart(a); heart(b);
        }
      }
  }

  function report() {
    api.thingsChanged(things.map(t => t.isBuild
      ? { id: t.id, x: t.x / Math.max(1, W() - t.wpx()) }
      : { id: t.id }));
  }

  // ---------- drawing ----------
  const HEART = ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'];
  const ZED = ['XXXX', '..X.', '.X..', 'XXXX'];

  function pattern(pat, cx, cy, px, colour) {
    const ox = cx - (pat[0].length * px) / 2;
    ctx.fillStyle = colour;
    pat.forEach((row, j) => [...row].forEach((ch, i) => {
      if (ch === 'X') ctx.fillRect(Math.round(ox + i * px), Math.round(cy + j * px), px, px);
    }));
  }

  const sorted = () => [...things].sort((a, b) =>
    a.isBuild === b.isBuild ? a.uid - b.uid : (a.isBuild ? -1 : 1));

  function draw(now) {
    ctx.clearRect(0, 0, W(), H());

    for (const t of things) {
      if (!t.isBuild || !t.def.glow) continue;
      const g = t.def.glow;
      const cx = t.x + g.x * scale, cy = t.top() + g.y * scale;
      const rad = g.r * scale * (1 + 0.05 * Math.sin(now / 280 + t.uid));
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
      grad.addColorStop(0, `rgba(${g.rgb},0.35)`);
      grad.addColorStop(1, `rgba(${g.rgb},0)`);
      ctx.fillStyle = grad;
      ctx.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
    }

    for (const t of sorted()) {
      if (!t.isBuild) {
        const lift = Math.max(0, H() - t.y - t.hopOffset());
        const k = Math.min(1, lift / (30 * scale));
        ctx.fillStyle = `rgba(0,0,0,${0.22 * (1 - k)})`;
        ctx.beginPath();
        ctx.ellipse(t.x + t.wpx() / 2, H() - scale * 0.6, t.wpx() * 0.32 * (1 - 0.4 * k), scale * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      const f = frameFor(t, t.spriteState());
      ctx.drawImage(f.img, Math.round(t.x), Math.round(t.top()), t.wpx(), t.hpx());
    }

    const px = Math.max(2, Math.round(scale / 2));
    for (const p of particles) {
      ctx.globalAlpha = 1 - p.t / p.life;
      if (p.kind === 'heart') pattern(HEART, p.x, p.y - 6 * px, px, '#FF4F7B');
      else pattern(ZED, p.x + Math.sin(p.t * 3) * 3 * px, p.y, px, '#8FA2FF');
    }
    ctx.globalAlpha = 1;
  }

  // ---------- mouse ----------
  function thingAt(mx, my) {
    const list = sorted();
    for (let i = list.length - 1; i >= 0; i--) {
      const t = list[i];
      const gx = Math.floor((mx - t.x) / scale), gy = Math.floor((my - t.top()) / scale);
      if (gx < -1 || gy < -1 || gx > t.def.w || gy > t.def.h) continue;
      const g = frameFor(t, t.spriteState()).grid;
      for (let dy = -1; dy <= 1; dy++)            // 1-pixel grace so thin bits are clickable
        for (let dx = -1; dx <= 1; dx++)
          if (g[gy + dy] && g[gy + dy][gx + dx]) return t;
    }
    return null;
  }

  function setInteractive(on) {
    if (on === !ignoring) return;
    ignoring = !on;
    api.setIgnore(!on);
  }

  addEventListener('mousemove', e => {
    if (drag) {
      const t = drag.t;
      if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 4) drag.moved = true;
      if (!drag.moved) return;
      t.state = 'held';
      const now = performance.now(), dtm = Math.max(1, now - drag.lt);
      drag.vx = drag.vx * 0.5 + ((e.clientX - drag.lx) / dtm) * 500;
      drag.vy = drag.vy * 0.5 + ((e.clientY - drag.ly) / dtm) * 500;
      if (!t.isBuild && Math.abs(e.clientX - drag.lx) > 1) t.dir = e.clientX > drag.lx ? 1 : -1;
      drag.lx = e.clientX; drag.ly = e.clientY; drag.lt = now;
      t.x = clamp(e.clientX - drag.ox, 0, Math.max(0, W() - t.wpx()));
      t.y = t.isBuild ? H() : Math.min(H(), e.clientY + drag.oy);
      return;
    }
    const t = hidden ? null : thingAt(e.clientX, e.clientY);
    setInteractive(!!t);
    document.body.style.cursor = t ? 'grab' : 'default';
  });

  addEventListener('mousedown', e => {
    if (e.button !== 0) return;
    const t = thingAt(e.clientX, e.clientY);
    if (!t) return;
    drag = { t, sx: e.clientX, sy: e.clientY, ox: e.clientX - t.x, oy: t.y - e.clientY,
      lx: e.clientX, ly: e.clientY, lt: performance.now(), vx: 0, vy: 0, moved: false };
    document.body.style.cursor = 'grabbing';
  });

  addEventListener('mouseup', () => {
    if (!drag) return;
    const t = drag.t;
    if (!drag.moved) {
      if (!t.isBuild) { t.vx = 0; t.vy = -650; t.state = 'fall'; }   // click = happy jump
      heart(t);
    } else {
      t.vx = t.isBuild ? 0 : clamp(drag.vx, -1500, 1500);
      t.vy = t.isBuild ? 0 : clamp(drag.vy, -1500, 1500);
      t.state = 'fall';
      report();
    }
    drag = null;
    document.body.style.cursor = 'grab';
  });

  addEventListener('contextmenu', e => {
    e.preventDefault();
    const t = thingAt(e.clientX, e.clientY);
    if (t) api.thingMenu(t.uid, t.id);
  });

  // ---------- messages from the tray ----------
  function setHidden(h) {
    hidden = !!h;
    canvas.style.display = hidden ? 'none' : 'block';
    if (hidden) setInteractive(false);
  }

  api.on('init', async d => {
    scale = d.scale || 4;
    await loadPacks(d.packFiles || []);
    resize();
    setHidden(d.hidden);
    things = (d.things || []).filter(s => REG[s.id]).map(s => new Thing(s.id, { x: s.x }));
    ready = true;
  });
  api.on('spawn', id => {
    if (!ready || !REG[id] || things.length >= MAX_THINGS) return;
    things.push(new Thing(id));
    if (hidden) setHidden(false);
    report();
  });
  api.on('clear', kind => {
    things = things.filter(t => kind === 'all' ? false : kind === 'build' ? !t.isBuild : t.isBuild);
    setInteractive(false);
    report();
  });
  api.on('set-scale', v => { scale = v; things.forEach(t => t.clamp()); });
  api.on('set-hidden', setHidden);
  api.on('thing-action', ({ uid, action }) => {
    const t = things.find(x => x.uid === uid);
    if (!t) return;
    if (action === 'remove') { things = things.filter(x => x !== t); setInteractive(false); report(); }
    else if (!t.isBuild && t.state !== 'fall') t.set(action, action === 'sleep' ? rand(10, 20) : action === 'sit' ? rand(6, 12) : rand(4, 8));
  });

  // ---------- loop (~40fps) ----------
  let last = performance.now();
  function loop(now) {
    requestAnimationFrame(loop);
    const elapsed = now - last;
    if (elapsed < 1000 / 40) return;
    last = now;
    if (!ready || hidden) return;
    const dt = Math.min(0.05, elapsed / 1000);
    things.forEach(t => t.update(dt));
    socialise();
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.t += dt; p.y += p.vy * dt;
      if (p.t >= p.life) particles.splice(i, 1);
    }
    draw(now);
  }
  resize();
  requestAnimationFrame(loop);
})();
