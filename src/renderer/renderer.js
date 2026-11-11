// Bitty Buddies overlay: runs the pets and builds on a transparent full-screen canvas.
// Behaviours: wander, sit, nap, climb screen edges, chase + ride the mouse, battles,
// fetch a ball, eat treats, dance parties, conga lines, emote bubbles and petting.
(() => {
  const PX = window.BBPixel;
  const api = window.bb;
  const canvas = document.getElementById('stage');
  const ctx = canvas.getContext('2d');

  const MAX_THINGS = 40;
  const GRAVITY = 2200;
  const REG = {};            // "pack/item" -> definition
  let things = [];
  let scale = 4, hidden = false, ready = false, uidSeq = 1, mischief = true;
  let ignoring = true, drag = null, clock = 0;
  const particles = [], battles = [], treats = [], frames = new Map();
  let ball = null, partyUntil = 0, conga = null;
  const mouse = { x: -9999, y: -9999, vx: 0, vy: 0, t: -99, seen: false, lastT: 0 };
  const hover = { t: null, since: 0, nextHeart: 0 };

  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
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

  // ---------- particles ----------
  function puff(kind, x, y, extra = {}) {
    particles.push(Object.assign({ kind, x, y, vx: 0, vy: 0, g: 0, t: 0, life: 1 }, extra));
  }
  function heart(t) { puff('heart', t.x + t.wpx() / 2, t.top(), { vy: -32, life: 1.4 }); }
  function dust(x, y, n = 5) {
    for (let i = 0; i < n; i++) puff('dust', x, y, { vx: rand(-60, 60), vy: rand(-60, -10), life: rand(.35, .6) });
  }

  // States where a pet is doing its own thing and shouldn't be pulled into games.
  const LOCKED = ['held', 'ride', 'leap', 'climb', 'cling', 'battle', 'fall', 'dizzy', 'cheer', 'eat', 'carried', 'goGrab', 'haul'];
  const MOVERS = ['walk', 'chase', 'fetch', 'snack', 'conga', 'toWall', 'goGrab', 'haul'];

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
      this.hop = 0; this.zT = 0; this.crumbT = 0;
      this.bubble = null; this.target = null;
      this.side = 0; this.cy = 0; this.climbTo = 0;
      this.lunge = 0; this.knockT = 0; this.offX = 0;
      this.carry = null; this.goal = 0; this.carrier = null;
    }
    wpx() { return this.def.w * scale; }
    hpx() { return this.def.h * scale; }
    walkSpeed() { return this.def.speed * (scale / 4); }
    runSpeed() { return Math.max(70, this.def.speed * 2.4) * (scale / 4); }
    clamp() {
      if (['climb', 'cling', 'ride'].includes(this.state)) return;
      this.x = clamp(this.x, 0, Math.max(0, W() - this.wpx()));
      if (this.state !== 'held' && this.y > H()) this.y = H();
    }
    moving() { return MOVERS.includes(this.state); }
    bounce() {
      let b = 0;
      if (this.def.move === 'hop' && this.moving()) b = -Math.abs(Math.sin(this.hop * Math.PI)) * 5 * scale;
      if (this.state === 'dance') b = -Math.abs(Math.sin((clock + this.uid * 0.13) * Math.PI * 2)) * 3 * scale;
      if (this.state === 'cheer') b = -Math.abs(Math.sin(clock * Math.PI * 3)) * 5 * scale;
      if (this.knockT > 0) b -= Math.sin((this.knockT / 0.25) * Math.PI) * 3 * scale;
      return b;
    }
    top() { return this.y - this.def.feet * scale + this.bounce(); }
    spriteState() {
      if (this.isBuild) return { pose: 'idle', frame: this.frame, blink: false };
      let pose = 'idle', frame = this.frame, blink = this.blink;
      if (this.moving() || this.state === 'climb' || this.state === 'dance' || this.lunge > 0) pose = 'walk';
      if (['sit', 'eat', 'dizzy'].includes(this.state)) pose = 'sit';
      if (this.state === 'sleep') pose = 'sleep';
      if (this.state === 'dizzy') blink = true;
      if (this.def.move === 'hop' && this.moving()) frame = Math.abs(Math.sin(this.hop * Math.PI)) < 0.25 ? 1 : 0;
      if (['fall', 'held', 'ride', 'leap', 'cling'].includes(this.state)) frame = 0;
      if (this.lunge > 0) frame = 1;
      return { pose, frame, blink };
    }
    say(icon, dur = 1.6) { this.bubble = { icon, until: clock + dur }; }
    set(state, dur) {
      if (this.carry && state !== 'goGrab' && state !== 'haul') {   // interrupted mid-carry: let go
        const c = this.carry;
        this.carry = null;
        if (c.kind === 'treat' && c.obj.claimed === this) { c.obj.claimed = null; c.obj.carried = false; c.obj.landed = false; }
        if (c.kind === 'ball' && c.obj.carrier === this) c.obj.carrier = null;
      }
      if (this.target && this.target.claimed === this) this.target.claimed = null;
      this.target = null;
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
      // Treats and balls are irresistible.
      const tr = nearestTreat(this);
      if (tr && Math.random() < 0.85) { this.set('snack', 14); this.target = tr; tr.claimed = this; return; }
      if (ball && Math.random() < 0.6) return this.set('fetch', rand(5, 9));

      const r = Math.random();
      if (this.nearBuild() && r < 0.5) return this.set(Math.random() < 0.5 ? 'sit' : 'sleep', rand(6, 14));
      if (mischief) {
        if (r < 0.08 && mouse.seen && clock - mouse.t < 5) { this.say('!'); return this.set('chase', rand(5, 9)); }
        if (r < 0.13) { this.dir = this.x < W() / 2 ? -1 : 1; return this.set('toWall', 15); }
        if (r < 0.19 && startGrab(this)) return;
      }
      if (r < 0.5) this.set('walk', rand(2, 7));
      else if (r < 0.72) { this.set('idle', rand(2, 5)); if (Math.random() < 0.25) this.say(pick(['?', '♪', '❤'])); }
      else if (r < 0.88) this.set('sit', rand(3, 8));
      else this.set('sleep', rand(8, 16));
    }
    startClimb(side) {
      this.state = 'climb';
      this.side = side;                       // -1 left wall, 1 right wall
      this.dir = side < 0 ? -1 : 1;           // with the rotation below this faces "up" the wall
      this.cy = H() - this.wpx() / 2 - scale;
      this.climbTo = H() * rand(0.2, 0.6);
      this.say('!', 1);
    }
    update(dt) {
      this.animT += dt;
      const rate = this.isBuild ? 0.35 : this.state === 'chase' ? 0.11 : (this.moving() || this.state === 'climb' || this.state === 'dance') ? 0.18 : 0.5;
      if (this.animT > rate) { this.animT = 0; this.frame ^= 1; }
      if (!this.isBuild) {
        this.blinkT -= dt;
        if (this.blinkT <= 0) { this.blink = !this.blink; this.blinkT = this.blink ? 0.15 : rand(2, 6); }
      }
      if (this.bubble && clock > this.bubble.until) this.bubble = null;
      if (this.lunge > 0) this.lunge = Math.max(0, this.lunge - dt);
      if (this.knockT > 0) this.knockT = Math.max(0, this.knockT - dt);
      this.offX = this.lunge > 0 ? this.dir * Math.sin((1 - this.lunge / 0.3) * Math.PI) * 3 * scale : 0;

      const ground = H(), maxX = Math.max(0, W() - this.wpx());
      const S = this.state;

      if (S === 'carried') {
        const c = this.carrier;
        if (!c || !things.includes(c) || c.state !== 'haul' || !c.carry || c.carry.obj !== this) { this.carrier = null; this.vy = 0; this.vx = 0; this.state = 'fall'; }
        return;
      }
      if (S === 'held' || S === 'battle' || S === 'conga') return;

      if (S === 'ride') {                      // dangling from the mouse pointer
        this.x = mouse.x - this.wpx() / 2;
        this.y = mouse.y + scale + this.def.feet * scale;
        if (Math.abs(mouse.vx) > 40) this.dir = mouse.vx > 0 ? -1 : 1; // swings behind the cursor
        this.timer -= dt;
        const speed = Math.hypot(mouse.vx, mouse.vy);
        if (this.timer <= 0 || speed > 2600) {
          this.vx = clamp(mouse.vx * 0.5, -900, 900);
          this.vy = clamp(mouse.vy * 0.5, -800, 800);
          this.state = 'fall';
          this.say(speed > 2600 ? '!' : '❤', 1.2);
        }
        return;
      }

      if (S === 'fall' || S === 'leap') {
        this.vy += GRAVITY * dt;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        if (this.x < 0) { this.x = 0; this.vx = -this.vx * 0.5; }
        if (this.x > maxX) { this.x = maxX; this.vx = -this.vx * 0.5; }
        if (S === 'leap' && mouse.seen && !things.some(o => o.state === 'ride')) { // grab the cursor mid-air (one rider at a time)
          const d = Math.hypot(this.x + this.wpx() / 2 - mouse.x, this.top() + 2 * scale - mouse.y);
          if (d < 9 * scale) { this.state = 'ride'; this.timer = rand(3, 6); this.say('❤', 1.4); heart(this); return; }
        }
        if (this.y >= ground) {
          this.y = ground;
          if (this.vy > 700) { this.vy = -this.vy * 0.3; this.vx *= 0.6; }
          else {
            this.vy = 0; this.vx = 0;
            if (S === 'leap' && this.timer > 0) this.state = 'chase';
            else this.next();
          }
        }
        return;
      }

      if (S === 'climb') {
        this.cy -= this.walkSpeed() * 0.8 * dt;
        if (this.cy <= this.climbTo) { this.state = 'cling'; this.timer = rand(1.5, 3); this.say(pick(['!', '♪', '❤'])); }
        return;
      }
      if (S === 'cling') {
        this.timer -= dt;
        if (this.timer <= 0) {                // jump off the wall
          this.x = this.side < 0 ? 4 * scale : W() - this.wpx() - 4 * scale;
          this.y = this.cy + this.wpx() / 2;
          this.vx = -this.side * rand(250, 420);
          this.vy = -rand(150, 350);
          this.dir = -this.side;
          this.state = 'fall';
        }
        return;
      }

      if (this.y < ground - 1 && !this.isBuild) { this.vy = 0; this.state = 'fall'; return; } // screen got taller
      if (this.isBuild) return;

      if (S === 'walk') {
        this.x += this.dir * this.walkSpeed() * dt;
        if (this.x <= 0) { this.x = 0; this.dir = 1; } else if (this.x >= maxX) { this.x = maxX; this.dir = -1; }
      } else if (S === 'toWall') {
        this.x += this.dir * this.walkSpeed() * 1.6 * dt;
        if (this.x <= 0) return this.startClimb(-1);
        if (this.x >= maxX) return this.startClimb(1);
      } else if (S === 'chase') {
        if (!mouse.seen || clock - mouse.t > 6) return this.next();
        const dx = mouse.x - (this.x + this.wpx() / 2);
        if (Math.abs(dx) > 3 * scale) { this.dir = Math.sign(dx); this.x += this.dir * this.runSpeed() * dt; }
        const reachable = mouse.y < ground && ground - mouse.y < 34 * scale;
        if (Math.abs(dx) < 10 * scale && reachable && Math.random() < dt * 3) {
          // Aim so the pet's head peaks right at the pointer.
          const rise = Math.max(3 * scale, this.y - this.def.feet * scale - mouse.y + scale);
          this.vy = -Math.min(1400, Math.sqrt(2 * GRAVITY * rise));
          this.vx = dx / Math.max(0.12, -this.vy / GRAVITY);
          this.state = 'leap';
          dust(this.x + this.wpx() / 2, ground, 4);
        } else if (!reachable && Math.abs(dx) < 4 * scale && !this.bubble) this.say('?', 1.2);
      } else if (S === 'fetch') {
        if (!ball) return this.next();
        const dx = ball.x - (this.x + this.wpx() / 2);
        if (Math.abs(dx) > 2 * scale) { this.dir = Math.sign(dx); this.x += this.dir * this.runSpeed() * dt; }
        if (Math.abs(dx) < this.wpx() / 2 && ball.y > ground - 14 * scale) {
          ball.vx = this.dir * rand(350, 700);
          ball.vy = -rand(350, 750);
          dust(ball.x, ground, 3);
          if (Math.random() < 0.3) this.say('♪', 1);
        }
      } else if (S === 'snack') {
        const tr = this.target;
        if (!tr || !treats.includes(tr)) return this.next();
        const dx = tr.x - (this.x + this.wpx() / 2);
        if (Math.abs(dx) < 3 * scale && tr.landed) { this.state = 'eat'; this.timer = 1.8; this.dir = dx >= 0 ? 1 : -1; return; }
        if (Math.abs(dx) > scale) { this.dir = Math.sign(dx); this.x += this.dir * this.runSpeed() * 0.8 * dt; }
      } else if (S === 'eat') {
        this.crumbT -= dt;
        if (this.crumbT <= 0) {
          this.crumbT = 0.22;
          const tx = this.x + this.wpx() / 2 + this.dir * 4 * scale;
          puff('crumb', tx, ground - 3 * scale, { vx: rand(-80, 80), vy: rand(-220, -120), g: 1400, life: 0.5, col: pick(['#D9A35B', '#6B4423', '#F3E2C3']) });
        }
        this.timer -= dt;
        if (this.timer <= 0) {
          const tr = this.target;
          const i = treats.indexOf(tr);
          if (i >= 0) treats.splice(i, 1);
          heart(this); this.say('❤', 1.2);
          this.target = null;
          this.set('sit', rand(2, 4));
        }
        return;
      } else if (S === 'goGrab' || S === 'haul') {
        if (!carryStillValid(this)) { this.carry = null; return this.next(); }
        const tx = S === 'goGrab' ? carryX(this.carry) : this.goal + this.wpx() / 2;
        const dx = tx - (this.x + this.wpx() / 2);
        if (Math.abs(dx) > 2 * scale) {
          this.dir = Math.sign(dx);
          this.x += this.dir * (S === 'goGrab' ? this.runSpeed() : this.walkSpeed() * 1.2) * dt;
        }
        if (S === 'goGrab' && Math.abs(dx) < Math.max(3 * scale, this.wpx() / 4)) pickUp(this);
        else if (S === 'haul' && (Math.abs(dx) <= 2 * scale || this.timer < 0.1)) { putDown(this); return; }
      } else if (S === 'dance') {
        this.dir = (Math.floor(clock * 2) + this.uid) % 2 ? 1 : -1;
      } else if (S === 'sleep') {
        this.zT -= dt;
        if (this.zT <= 0) {
          this.zT = 1.3;
          puff('z', this.x + this.wpx() * (this.dir > 0 ? 0.65 : 0.35), this.top() + 2 * scale, { vy: -18, life: 2.2 });
        }
      }
      this.x = clamp(this.x, 0, maxX);
      this.timer -= dt;
      if (this.timer <= 0) this.next();
    }
  }

  // ---------- games ----------
  function pets(filterFree = true) {
    return things.filter(t => !t.isBuild && (!filterFree || !LOCKED.includes(t.state)));
  }

  function startBattle(a, b) {
    if (!a || !b || a === b || a.isBuild || b.isBuild) return false;
    if (LOCKED.includes(a.state) || LOCKED.includes(b.state)) return false;
    for (const t of [a, b]) { t.set('battle', 99); t.say('!', 1.2); }
    battles.push({ a, b, phase: 'approach', t: 0, hits: 0, max: 3 + Math.floor(Math.random() * 3), turn: Math.random() < 0.5 ? a : b, impact: null });
    return true;
  }

  function updateBattles(dt) {
    for (let i = battles.length - 1; i >= 0; i--) {
      const B = battles[i], { a, b } = B;
      if (!things.includes(a) || !things.includes(b) || a.state !== 'battle' || b.state !== 'battle') {
        for (const t of [a, b]) if (t.state === 'battle') t.next();
        battles.splice(i, 1);
        continue;
      }
      const ca = a.x + a.wpx() / 2, cb = b.x + b.wpx() / 2;
      a.dir = cb >= ca ? 1 : -1; b.dir = -a.dir;
      if (B.phase === 'approach') {
        const gap = (a.wpx() + b.wpx()) / 2 - 3 * scale;
        if (Math.abs(cb - ca) > gap) {
          for (const t of [a, b]) {
            t.x += t.dir * t.runSpeed() * 0.7 * dt;
            t.animT += dt; if (t.animT > 0.15) { t.animT = 0; t.frame ^= 1; }
          }
          B.t += dt;
          if (B.t > 12) { a.next(); b.next(); battles.splice(i, 1); }
        } else { B.phase = 'fight'; B.t = 0.35; }
      } else {
        B.t -= dt;
        if (B.t <= 0) {
          if (B.hits >= B.max) {
            const loser = Math.random() < 0.5 ? a : b, winner = loser === a ? b : a;
            loser.set('dizzy', 3.2);
            winner.set('cheer', 2.6);
            puff('crown', winner.x + winner.wpx() / 2, winner.top() - 2 * scale, { vy: -12, life: 2.4 });
            battles.splice(i, 1);
            continue;
          }
          const att = B.turn, def = att === a ? b : a;
          att.lunge = 0.3;
          B.impact = { t: 0.15, att, def };
          B.turn = def; B.hits++; B.t = 0.6;
        }
        if (B.impact) {
          B.impact.t -= dt;
          if (B.impact.t <= 0) {
            const { att, def } = B.impact;
            B.impact = null;
            const mx = (att.x + att.wpx() / 2 + def.x + def.wpx() / 2) / 2;
            puff('pow', mx, H() - def.hpx() * 0.55, { life: 0.35 });
            dust(def.x + def.wpx() / 2, H(), 4);
            def.x += att.dir * 2 * scale;
            def.knockT = 0.25;
          }
        }
      }
      for (const t of [a, b]) t.x = clamp(t.x, 0, Math.max(0, W() - t.wpx()));
    }
  }

  function throwBall() {
    ball = { x: rand(0.2, 0.8) * W(), y: -20, vx: rand(-200, 200), vy: 0, life: 45 };
    pets().forEach(p => { p.say('!', 1); p.set('fetch', rand(6, 10)); });
  }
  function updateBall(dt) {
    if (!ball) return;
    const r = 3 * scale, floor = H() - r;
    if (ball.held || ball.carrier) return;
    ball.vy += 1800 * dt; ball.x += ball.vx * dt; ball.y += ball.vy * dt;
    if (ball.y > floor) {
      ball.y = floor;
      if (ball.vy > 120) ball.vy = -ball.vy * 0.55; else ball.vy = 0;
      ball.vx *= Math.max(0, 1 - 2 * dt);
    }
    if (ball.x < r) { ball.x = r; ball.vx = -ball.vx * 0.7; }
    if (ball.x > W() - r) { ball.x = W() - r; ball.vx = -ball.vx * 0.7; }
    ball.life -= dt;
    if (ball.life <= 0) { dust(ball.x, ball.y, 8); ball = null; }
  }

  const TREATS = {
    cookie: { rows: ['.CCCC.', 'CCDCCC', 'CCCCDC', 'CDCCCC', 'CCCDCC', '.CCCC.'], cols: { C: '#D9A35B', D: '#6B4423' } },
    bone: { rows: ['WW....WW', 'WWWWWWWW', 'WWWWWWWW', 'WW....WW'], cols: { W: '#F3EFE6' } },
    fish: { rows: ['..BBB..B', '.BBBBBBB', 'BEBBBBB.', '.BBBBBBB', '..BBB..B'], cols: { B: '#5DA0E0', E: '#1B1B1B' } },
    berry: { rows: ['..G.', '.RR.', 'RRWR', 'RRRR', '.RR.'], cols: { R: '#E04466', W: '#FFC0D0', G: '#58C24A' } }
  };
  function dropTreats(n = 3) {
    for (let i = 0; i < n; i++) {
      const kind = pick(Object.keys(TREATS));
      treats.push({ kind, x: rand(0.1, 0.9) * W(), y: -rand(10, 260), vy: 0, landed: false, claimed: null, life: 60 });
    }
    pets().forEach(p => { if (['walk', 'idle', 'sit', 'sleep'].includes(p.state)) p.say('!', 1); });
  }
  function nearestTreat(p) {
    const cx = p.x + p.wpx() / 2;
    let best = null, bd = Infinity;
    for (const t of treats) if (!t.claimed) { const d = Math.abs(t.x - cx); if (d < bd) { bd = d; best = t; } }
    return best;
  }
  function updateTreats(dt) {
    for (let i = treats.length - 1; i >= 0; i--) {
      const t = treats[i];
      if (t.carried) continue;
      if (!t.landed) {
        t.vy += 1600 * dt; t.y += t.vy * dt;
        if (t.y >= H()) { t.y = H(); t.landed = true; dust(t.x, H(), 3); }
      }
      t.life -= dt;
      if (t.life <= 0 && !(t.claimed && t.claimed.state === 'eat')) treats.splice(i, 1);
    }
    // Free pets wander over to unclaimed treats.
    if (treats.some(t => !t.claimed)) {
      for (const p of pets()) {
        if (!['walk', 'idle', 'sit', 'sleep'].includes(p.state)) continue;
        const tr = nearestTreat(p);
        if (tr) { p.set('snack', 14); p.target = tr; tr.claimed = p; }
      }
    }
  }


  // ---------- carrying things around ----------
  // A carry is { kind: 'thing' | 'treat' | 'ball', obj }.
  function carryX(c) {
    if (c.kind === 'thing') return c.obj.x + c.obj.wpx() / 2;
    return c.obj.x;
  }
  function carryStillValid(p) {
    const c = p.carry;
    if (!c) return false;
    if (c.kind === 'thing') {
      if (!things.includes(c.obj)) return false;
      if (p.state === 'haul') return c.obj.state === 'carried' && c.obj.carrier === p;
      return !c.obj.carrier && !LOCKED.includes(c.obj.state);
    }
    if (c.kind === 'treat') return treats.includes(c.obj) && c.obj.claimed === p;
    if (c.kind === 'ball') return ball === c.obj && !ball.held && (p.state === 'goGrab' ? !ball.carrier : ball.carrier === p);
    return false;
  }
  function grabTargets(p) {
    const list = [];
    for (const t of things) {
      if (t === p || t.carrier || LOCKED.includes(t.state)) continue;
      if (things.some(o => o.carry && o.carry.obj === t)) continue;
      list.push({ kind: 'thing', obj: t });
    }
    for (const tr of treats) if (!tr.claimed && tr.landed) list.push({ kind: 'treat', obj: tr });
    if (ball && !ball.held && !ball.carrier && !things.some(o => o.carry && o.carry.obj === ball)) list.push({ kind: 'ball', obj: ball });
    return list;
  }
  function startGrab(p) {
    if (!p || p.isBuild || LOCKED.includes(p.state) || p.y < H() - 1) return false;
    const options = grabTargets(p);
    if (!options.length) return false;
    const c = pick(options);
    p.set('goGrab', 12);
    p.carry = c;
    if (c.kind === 'treat') c.obj.claimed = p;
    p.say('!', 1);
    return true;
  }
  function pickUp(p) {
    const c = p.carry;
    if (c.kind === 'thing') {
      const o = c.obj;
      if (o.state === 'battle' || o.state === 'conga') { p.carry = null; return p.next(); }
      o.set('carried', 99); o.carrier = p;
      if (!o.isBuild) o.say(pick(['!', '❤', '?']), 1.4);
    } else if (c.kind === 'treat') c.obj.carried = true;
    else if (c.kind === 'ball') c.obj.carrier = p;
    p.state = 'haul';
    p.timer = 14;
    let goal;
    for (let k = 0; k < 6; k++) { goal = rand(0, Math.max(0, W() - p.wpx())); if (Math.abs(goal - p.x) > 160) break; }
    p.goal = goal;
    p.say('♪', 1.2);
    dust(p.x + p.wpx() / 2, H(), 3);
  }
  function putDown(p) {
    const c = p.carry;
    p.carry = null;
    if (c && c.kind === 'thing' && things.includes(c.obj)) {
      const o = c.obj;
      o.carrier = null;
      o.vx = p.dir * rand(60, 160); o.vy = -rand(150, 300);
      o.state = 'fall';
      if (o.isBuild) setTimeout(report, 1500);
    } else if (c && c.kind === 'treat' && treats.includes(c.obj)) {
      c.obj.carried = false; c.obj.landed = false; c.obj.vy = -220; c.obj.claimed = null;
    } else if (c && c.kind === 'ball' && ball === c.obj) {
      ball.carrier = null; ball.vx = p.dir * 320; ball.vy = -420;
    }
    heart(p);
    p.set('idle', rand(1.5, 3));
  }
  function positionCarried() {
    for (const p of things) {
      if (p.state !== 'haul' || !p.carry) continue;
      const c = p.carry, cx = p.x + p.wpx() / 2, head = p.top() + scale;
      if (c.kind === 'thing' && c.obj.state === 'carried') {
        c.obj.x = cx - c.obj.wpx() / 2;
        c.obj.y = head;                               // its feet sit on the carrier's head
        if (!c.obj.isBuild) c.obj.dir = p.dir;
      } else if (c.kind === 'treat') { c.obj.x = cx; c.obj.y = head; }
      else if (c.kind === 'ball') { c.obj.x = cx; c.obj.y = head - 3 * scale; }
    }
  }

  function party() {
    partyUntil = clock + 9;
    pets().forEach(p => { if (p.y >= H() - 1) { p.set('dance', 9); p.say('♪', 1.5); } });
  }

  function startConga() {
    const line = pets().filter(p => p.y >= H() - 1).sort((a, b) => a.x - b.x);
    if (line.length < 2) return;
    const dir = Math.random() < 0.5 ? 1 : -1;
    if (dir > 0) line.reverse();               // leader is the one at the front
    conga = { line, until: clock + 14, dir };
    line.forEach(p => { p.set('conga', 99); p.say('♪', 1.5); });
  }
  function updateConga(dt) {
    if (!conga) return;
    conga.line = conga.line.filter(p => things.includes(p) && p.state === 'conga');
    if (clock > conga.until || conga.line.length < 2) {
      conga.line.forEach(p => p.next());
      conga = null;
      return;
    }
    const speed = 50 * (scale / 4);
    const L = conga.line[0];
    L.dir = conga.dir;
    L.x += conga.dir * speed * dt;
    if (L.x <= 0 || L.x >= W() - L.wpx()) { conga.dir *= -1; L.x = clamp(L.x, 0, W() - L.wpx()); }
    for (let i = 1; i < conga.line.length; i++) {
      const p = conga.line[i], prev = conga.line[i - 1];
      const target = conga.dir > 0 ? prev.x - p.wpx() - scale : prev.x + prev.wpx() + scale;
      const dx = target - p.x;
      if (Math.abs(dx) > 1) p.x += Math.sign(dx) * Math.min(Math.abs(dx), speed * 2 * dt);
      p.dir = Math.abs(dx) > 8 * scale ? Math.sign(dx) : conga.dir;
      p.x = clamp(p.x, 0, W() - p.wpx());
    }
    for (const p of conga.line) {
      p.hop += dt * 2.4;
      p.animT += dt; if (p.animT > 0.18) { p.animT = 0; p.frame ^= 1; }
      if (p.bubble && clock > p.bubble.until) p.bubble = null;
    }
    if (Math.random() < dt * 1.5) { const p = pick(conga.line); puff('note', p.x + p.wpx() / 2, p.top(), { vy: -30, vx: rand(-15, 15), life: 1.6 }); }
  }

  // Pets that bump into each other: say hi, or (with mischief on) start a scrap.
  function socialise() {
    const walkers = things.filter(t => !t.isBuild && t.state === 'walk');
    for (let i = 0; i < walkers.length; i++)
      for (let j = i + 1; j < walkers.length; j++) {
        const a = walkers[i], b = walkers[j];
        if (Math.abs(a.x - b.x) < 10 * scale && Math.random() < 0.01) {
          if (mischief && Math.random() < 0.35) { startBattle(a, b); continue; }
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
  const PATTERNS = {
    heart: ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'],
    z: ['XXXX', '..X.', '.X..', 'XXXX'],
    pow: ['X..X..X', '.X.X.X.', '..XXX..', 'XXXXXXX', '..XXX..', '.X.X.X.', 'X..X..X'],
    star: ['.X.', 'XXX', '.X.'],
    note: ['..XX', '..X.', '..X.', 'XXX.', 'XX..'],
    crown: ['X..X..X', 'XXXXXXX', 'XXXXXXX']
  };
  const ICONS = {
    '!': { rows: ['X', 'X', 'X', '.', 'X'], col: '#E04444' },
    '?': { rows: ['XXX', '..X', '.XX', '...', '.X.'], col: '#3C74E0' },
    '♪': { rows: ['..XX', '..X.', '..X.', 'XXX.', 'XX..'], col: '#8B5CF6' },
    '❤': { rows: ['.X.X.', 'XXXXX', 'XXXXX', '.XXX.', '..X..'], col: '#FF4F7B' }
  };
  const BALL = { rows: ['.RRRR.', 'RWRRRR', 'RRRRRR', 'RRYYRR', 'RRRRRD', '.RDDD.'], cols: { R: '#E0483A', W: '#FFFFFF', Y: '#FFD84A', D: '#A82E24' } };

  function pattern(rows, cx, y, px, colour) {
    const ox = cx - (rows[0].length * px) / 2;
    ctx.fillStyle = colour;
    rows.forEach((row, j) => [...row].forEach((ch, i) => {
      if (ch === 'X') ctx.fillRect(Math.round(ox + i * px), Math.round(y + j * px), px, px);
    }));
  }
  function patternC(art, x, y, px) {
    art.rows.forEach((row, j) => [...row].forEach((ch, i) => {
      const c = art.cols[ch];
      if (c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x + i * px), Math.round(y + j * px), px, px); }
    }));
  }

  function drawBubble(t) {
    const icon = ICONS[t.bubble.icon];
    if (!icon) return;
    const px = Math.max(2, Math.round(scale / 2));
    const bw = 9 * px, bh = 8 * px;
    const cx = t.x + t.offX + t.wpx() / 2;
    const bx = Math.round(cx - bw / 2), by = Math.round(t.top() - bh - 3 * px);
    ctx.fillStyle = '#2E345C';
    ctx.fillRect(bx - px, by - px, bw + 2 * px, bh + 2 * px);
    ctx.fillRect(Math.round(cx - px), by + bh, 2 * px, 2 * px);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillRect(Math.round(cx - px / 2), by + bh, px, px);
    pattern(icon.rows, cx, by + Math.round((bh - icon.rows.length * px) / 2), px, icon.col);
  }

  const sorted = () => [...things].sort((a, b) =>
    a.isBuild === b.isBuild ? a.uid - b.uid : (a.isBuild ? -1 : 1));

  function drawThing(t) {
    const f = frameFor(t, t.spriteState());
    if (t.state === 'climb' || t.state === 'cling') {
      // Feet on the wall: rotate the sprite so it climbs "up" the screen edge.
      ctx.save();
      ctx.translate(t.side < 0 ? 0 : W(), t.cy);
      ctx.rotate(t.side < 0 ? Math.PI / 2 : -Math.PI / 2);
      ctx.drawImage(f.img, -t.wpx() / 2, -t.def.feet * scale, t.wpx(), t.hpx());
      ctx.restore();
      return;
    }
    ctx.drawImage(f.img, Math.round(t.x + t.offX), Math.round(t.top()), t.wpx(), t.hpx());
  }

  function draw() {
    ctx.clearRect(0, 0, W(), H());

    for (const t of things) {
      if (!t.isBuild || !t.def.glow) continue;
      const g = t.def.glow;
      const cx = t.x + g.x * scale, cy = t.top() + g.y * scale;
      const rad = g.r * scale * (1 + 0.05 * Math.sin(clock * 3.5 + t.uid));
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
      grad.addColorStop(0, `rgba(${g.rgb},0.35)`);
      grad.addColorStop(1, `rgba(${g.rgb},0)`);
      ctx.fillStyle = grad;
      ctx.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
    }

    for (const tr of treats) {
      const art = TREATS[tr.kind];
      patternC(art, tr.x - (art.rows[0].length * scale) / 2, tr.y - art.rows.length * scale, scale);
    }

    const list = sorted();
    for (const t of list) {
      if (t.state === 'ride' || t.state === 'carried') continue; // drawn last, on top
      if (!t.isBuild && !['climb', 'cling'].includes(t.state)) {
        const lift = Math.max(0, H() - t.y - t.bounce());
        const k = Math.min(1, lift / (30 * scale));
        ctx.fillStyle = `rgba(0,0,0,${0.22 * (1 - k)})`;
        ctx.beginPath();
        ctx.ellipse(t.x + t.offX + t.wpx() / 2, H() - scale * 0.6, t.wpx() * 0.32 * (1 - 0.4 * k), scale * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      drawThing(t);
      if (t.state === 'dizzy') {
        const cx = t.x + t.wpx() / 2, px = Math.max(2, Math.round(scale / 2));
        for (let k = 0; k < 3; k++) {
          const a = clock * 4 + k * 2.09;
          pattern(PATTERNS.star, cx + Math.cos(a) * 5 * scale, t.top() - scale + Math.sin(a) * 1.5 * scale, px, '#FFD84A');
        }
      }
    }

    if (ball) {
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath(); ctx.ellipse(ball.x, H() - scale * 0.5, 2.5 * scale, scale * 0.6, 0, 0, Math.PI * 2); ctx.fill();
      patternC(BALL, ball.x - 3 * scale, ball.y - 3 * scale, scale);
    }

    for (const t of list) if (t.state === 'carried') drawThing(t);
    for (const t of list) if (t.state === 'ride') drawThing(t);

    const px = Math.max(2, Math.round(scale / 2));
    for (const p of particles) {
      const fade = 1 - p.t / p.life;
      ctx.globalAlpha = p.kind === 'confetti' ? 1 : Math.max(0, fade);
      switch (p.kind) {
        case 'heart': pattern(PATTERNS.heart, p.x, p.y - 6 * px, px, '#FF4F7B'); break;
        case 'z': pattern(PATTERNS.z, p.x + Math.sin(p.t * 3) * 3 * px, p.y, px, '#8FA2FF'); break;
        case 'note': pattern(PATTERNS.note, p.x + Math.sin(p.t * 4) * 2 * px, p.y, px, '#8B5CF6'); break;
        case 'crown': pattern(PATTERNS.crown, p.x, p.y - 3 * px, px, '#FFC93C'); break;
        case 'pow': {
          const s = Math.max(2, Math.round(scale * (0.8 + 0.6 * (p.t / p.life))));
          pattern(PATTERNS.pow, p.x, p.y - 3.5 * s, s, '#FFD84A');
          pattern(['X'], p.x, p.y - 0.5 * s, s, '#FF7A2E');
          break;
        }
        case 'dust': ctx.fillStyle = '#C9C2B8'; ctx.fillRect(Math.round(p.x), Math.round(p.y), px, px); break;
        case 'crumb': ctx.fillStyle = p.col; ctx.fillRect(Math.round(p.x), Math.round(p.y), px, px); break;
        case 'confetti':
          ctx.fillStyle = p.col;
          ctx.fillRect(Math.round(p.x + Math.sin(p.t * 3 + p.seed) * 6), Math.round(p.y), p.size, p.size * (Math.abs(Math.sin(p.t * 6 + p.seed)) + 0.3));
          break;
      }
    }
    ctx.globalAlpha = 1;

    for (const t of list) if (t.bubble && !['climb', 'cling'].includes(t.state)) drawBubble(t);
  }

  // ---------- mouse ----------
  function thingAt(mx, my) {
    const list = sorted();
    for (let i = list.length - 1; i >= 0; i--) {
      const t = list[i];
      if (['ride', 'climb', 'cling'].includes(t.state)) continue; // never block clicks under the pointer
      const gx = Math.floor((mx - t.x - t.offX) / scale), gy = Math.floor((my - t.top()) / scale);
      if (gx < -1 || gy < -1 || gx > t.def.w || gy > t.def.h) continue;
      const g = frameFor(t, t.spriteState()).grid;
      for (let dy = -1; dy <= 1; dy++)            // 1-pixel grace so thin bits are clickable
        for (let dx = -1; dx <= 1; dx++)
          if (g[gy + dy] && g[gy + dy][gx + dx]) return t;
    }
    return null;
  }
  const ballAt = (mx, my) => ball && Math.hypot(mx - ball.x, my - ball.y) < 4 * scale;

  function setInteractive(on) {
    if (on === !ignoring) return;
    ignoring = !on;
    api.setIgnore(!on);
  }

  addEventListener('mousemove', e => {
    const now = performance.now() / 1000;
    if (mouse.seen) {
      const dtm = Math.max(0.004, now - mouse.lastT);
      mouse.vx = mouse.vx * 0.5 + ((e.clientX - mouse.x) / dtm) * 0.5;
      mouse.vy = mouse.vy * 0.5 + ((e.clientY - mouse.y) / dtm) * 0.5;
    }
    mouse.x = e.clientX; mouse.y = e.clientY; mouse.t = clock; mouse.lastT = now; mouse.seen = true;

    if (drag) {
      const t = drag.t;
      if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 4) drag.moved = true;
      if (!drag.moved) return;
      const dtm = Math.max(1, performance.now() - drag.lt);
      drag.vx = drag.vx * 0.5 + ((e.clientX - drag.lx) / dtm) * 500;
      drag.vy = drag.vy * 0.5 + ((e.clientY - drag.ly) / dtm) * 500;
      drag.lx = e.clientX; drag.ly = e.clientY; drag.lt = performance.now();
      if (drag.ball) { ball.carrier = null; ball.held = true; ball.x = e.clientX; ball.y = Math.min(e.clientY, H() - 3 * scale); return; }
      t.state = 'held';
      if (!t.isBuild && Math.abs(drag.vx) > 20) t.dir = drag.vx > 0 ? 1 : -1;
      t.x = clamp(e.clientX - drag.ox, 0, Math.max(0, W() - t.wpx()));
      t.y = t.isBuild ? H() : Math.min(H(), e.clientY + drag.oy);
      return;
    }
    const t = hidden ? null : thingAt(e.clientX, e.clientY);
    const overBall = !hidden && ballAt(e.clientX, e.clientY);
    if (t !== hover.t) { hover.t = t; hover.since = clock; }
    setInteractive(!!t || overBall);
    document.body.style.cursor = t || overBall ? 'grab' : 'default';
  });

  addEventListener('mousedown', e => {
    if (e.button !== 0) return;
    if (ballAt(e.clientX, e.clientY)) {
      drag = { ball: true, sx: e.clientX, sy: e.clientY, lx: e.clientX, ly: e.clientY, lt: performance.now(), vx: 0, vy: 0, moved: false };
      return;
    }
    const t = thingAt(e.clientX, e.clientY);
    if (!t) return;
    drag = { t, sx: e.clientX, sy: e.clientY, ox: e.clientX - t.x, oy: t.y - e.clientY,
      lx: e.clientX, ly: e.clientY, lt: performance.now(), vx: 0, vy: 0, moved: false };
    document.body.style.cursor = 'grabbing';
  });

  addEventListener('mouseup', () => {
    if (!drag) return;
    if (drag.ball) {
      if (ball) {
        ball.held = false;
        if (drag.moved) { ball.vx = clamp(drag.vx, -1500, 1500); ball.vy = clamp(drag.vy, -1500, 1500); }
        else { ball.vy = -800; ball.vx = rand(-200, 200); }
        ball.life = Math.max(ball.life, 20);
      }
      drag = null;
      return;
    }
    const t = drag.t;
    if (!drag.moved) {
      if (!t.isBuild) {
        if (t.state === 'dizzy') t.say('?', 1);
        t.vx = 0; t.vy = -650; t.state = 'fall';   // click = happy jump
      }
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
    mischief = d.mischief !== false;
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
  api.on('set-mischief', v => { mischief = !!v; });
  api.on('play', action => {
    if (!ready) return;
    if (hidden) setHidden(false);
    if (action === 'battle') {
      const free = pets();
      if (free.length < 2) return;
      const a = pick(free);
      const b = free.filter(p => p !== a).sort((p, q) => Math.abs(p.x - a.x) - Math.abs(q.x - a.x))[0];
      startBattle(a, b);
    } else if (action === 'ball') throwBall();
    else if (action === 'treats') dropTreats(3);
    else if (action === 'party') party();
    else if (action === 'conga') startConga();
    else if (action === 'tidy') pets().forEach(p => startGrab(p));
  });
  api.on('thing-action', ({ uid, action }) => {
    const t = things.find(x => x.uid === uid);
    if (!t) return;
    if (action === 'remove') { things = things.filter(x => x !== t); setInteractive(false); report(); return; }
    if (t.isBuild || LOCKED.includes(t.state)) return;
    if (action === 'battle') {
      const other = pets().filter(p => p !== t).sort((p, q) => Math.abs(p.x - t.x) - Math.abs(q.x - t.x))[0];
      startBattle(t, other);
    } else if (action === 'chase') { t.say('!'); t.set('chase', rand(8, 12)); }
    else if (action === 'climb') { t.dir = t.x < W() / 2 ? -1 : 1; t.set('toWall', 15); }
    else if (action === 'grab') { if (!startGrab(t)) t.say('?', 1.2); }
    else t.set(action, action === 'sleep' ? rand(10, 20) : action === 'sit' ? rand(6, 12) : rand(4, 8));
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
    clock += dt;
    if (clock - mouse.t > 0.1) { mouse.vx *= 0.8; mouse.vy *= 0.8; }

    things.forEach(t => t.update(dt));
    updateBattles(dt);
    updateConga(dt);
    updateBall(dt);
    positionCarried();
    updateTreats(dt);
    socialise();

    // Hover over a pet for a moment to give it a pat.
    const ht = hover.t;
    if (ht && !drag && things.includes(ht) && !ht.isBuild && clock - hover.since > 1 && clock > hover.nextHeart &&
        ['idle', 'walk', 'sit', 'sleep'].includes(ht.state)) {
      heart(ht);
      hover.nextHeart = clock + 0.7;
      if (ht.state !== 'sit') ht.set('sit', rand(3, 6));
    }

    if (clock < partyUntil) {
      const colours = ['#FF4F7B', '#FFD84A', '#5DA0E0', '#58C24A', '#B67CF0', '#FF9A2E'];
      for (let k = 0; k < 2; k++)
        puff('confetti', rand(0, W()), -10, { vy: rand(90, 170), life: 8, col: pick(colours), size: rand(0.6, 1.1) * scale, seed: rand(0, 6) });
      if (Math.random() < dt * 2) {
        const dancers = things.filter(t => t.state === 'dance');
        if (dancers.length) { const p = pick(dancers); puff('note', p.x + p.wpx() / 2, p.top(), { vy: -30, life: 1.6 }); }
      }
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.t += dt;
      p.vy += p.g * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.t >= p.life || (p.kind === 'confetti' && p.y > H())) particles.splice(i, 1);
    }
    draw();
  }
  resize();
  requestAnimationFrame(loop);
})();
