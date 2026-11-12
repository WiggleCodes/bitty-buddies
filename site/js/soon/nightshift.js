// Night Shift '86 pack (draft for review) — an original 80s adventure crew and their slimy foe.
// Sprites face RIGHT; state = { pose: 'walk'|'idle'|'sit'|'sleep', frame: 0|1, blink: bool }
(function (root, pack) {
  if (typeof module === 'object' && module.exports) module.exports = pack;
  else (root.BBPacks = root.BBPacks || []).push(pack);
})(typeof self !== 'undefined' ? self : this, (function () {
  const DARK = '#1B1B1B';

  // Blocky kid shared by the crew (same proportions as the Fantasy Folk).
  function kid(P, s, o) {
    const low = s.pose === 'sit' || s.pose === 'sleep';
    const hy = low ? 4 : 2, by = hy + 5, bottom = low ? 11 : 10;
    const stride = s.pose === 'walk' && s.frame === 0;
    if (low) { P.r(6, 12, 6, 1, o.legs); P.r(11, 12, 2, 2, o.shoes); }
    else if (stride) { P.r(5, 11, 2, 2, o.legs); P.r(9, 11, 2, 2, o.legs); P.r(4, 13, 3, 1, o.shoes); P.r(9, 13, 3, 1, o.shoes); }
    else { P.r(6, 11, 2, 2, o.legs); P.r(8, 11, 2, 2, o.legs); P.r(6, 13, 2, 1, o.shoes); P.r(8, 13, 3, 1, o.shoes); }
    P.r(6, by, 5, bottom - by + 1, o.top); P.r(6, by, 1, bottom - by + 1, o.topS);
    P.r(6, hy, 5, 5, o.hair); P.r(8, hy + 1, 3, 4, o.skin);
    P.p(9, hy + 2, s.blink || s.pose === 'sleep' ? o.skinS : DARK);
    const ax = stride ? 9 : 8;
    P.r(ax, by, 1, 3, o.topS); P.p(ax, by + 3, o.skin);
    return { hy, by, low, ax };
  }

  return {
    id: 'nightshift',
    name: "Night Shift '86",
    licensed: true, // paid pack (£2.99)
    items: {
      rider: {
        name: 'Dash', blurb: 'BMX kid who is always first there', move: 'walk', speed: 60, w: 20, h: 17,
        draw(P0, s) {
          const P = { r: (x, y, w, h, c) => P0.r(x, y + 1, w, h, c), p: (x, y, c) => P0.p(x, y + 1, c) };
          const c = { skin: '#E8B48C', skinS: '#B98660', hair: '#5A3A1E', jacket: '#F08A2A', jacketS: '#C0661A', jeans: '#3C5A9C', helmet: '#D6392F', helmetL: '#F06A5A', frame: '#2FB8A8', tyre: '#2A2A30', hub: '#B8C0CC', seat: '#2A2A30' };
          if (s.pose === 'sit' || s.pose === 'sleep') {                 // off the bike, bike parked behind
            P.r(1, 11, 3, 3, c.tyre); P.p(2, 12, c.hub); P.r(3, 11, 4, 1, c.frame);
            const L = kid(P, s, { skin: c.skin, skinS: c.skinS, hair: c.hair, top: c.jacket, topS: c.jacketS, legs: c.jeans, shoes: '#E8E8E8' });
            P.r(6, L.hy - 1, 5, 2, c.helmet); P.r(7, L.hy - 1, 3, 1, c.helmetL);
            return;
          }
          const f = s.pose === 'walk' ? s.frame : 0;
          // wheels
          [[1, 10], [13, 10]].forEach(([x, y]) => { P.r(x + 1, y, 3, 1, c.tyre); P.r(x, y + 1, 1, 3, c.tyre); P.r(x + 4, y + 1, 1, 3, c.tyre); P.r(x + 1, y + 4, 3, 1, c.tyre); P.p(x + 2, y + 2, c.hub); P.p(x + (f ? 1 : 3), y + (f ? 1 : 3), c.hub); });
          P.r(3, 11, 6, 1, c.frame); P.r(8, 9, 1, 3, c.frame); P.r(9, 9, 6, 1, c.frame); P.r(14, 7, 1, 5, c.frame); P.r(14, 6, 2, 1, c.tyre); // frame + bars
          P.r(6, 8, 3, 1, c.seat);
          // rider leaning forward
          P.r(7, 3, 5, 5, c.jacket); P.r(7, 3, 1, 5, c.jacketS);
          P.r(8, f ? 8 : 9, 2, 2, c.jeans); P.p(f ? 7 : 10, 11, c.jeans); P.p(f ? 10 : 8, 10, c.jeans);
          P.r(11, 4, 3, 1, c.jacketS); P.p(14, 5, c.skin);                // arm to the bars
          P.r(10, 0, 4, 4, c.skin); P.p(12, 1, s.blink ? c.skinS : DARK); P.r(9, 0, 1, 3, c.hair);
          P.r(9, -1, 5, 2, c.helmet); P.r(10, -1, 3, 1, c.helmetL); P.p(14, 0, c.helmet);
        }
      },

      torch: {
        name: 'Rook', blurb: 'hoodie kid with a trusty torch', move: 'walk', speed: 30, w: 24, hero: 'torch', poses: ['aim'],
        draw(P, s) {
          const c = { skin: '#C08A60', skinS: '#946640', hair: '#2A1E14', hood: '#2E3E6C', hoodS: '#22305A', jeans: '#4A4A58', torch: '#8A93A3', beam: '#FFF2A8', beam2: '#FFF8D6' };
          const aim = s.pose === 'aim';
          const L = kid(P, aim ? { ...s, pose: 'idle' } : s, { skin: c.skin, skinS: c.skinS, hair: c.hood, top: c.hood, topS: c.hoodS, legs: c.jeans, shoes: '#D6392F' });
          P.p(8, L.hy + 1, c.hair); P.p(5, L.hy + 2, c.hood);            // hood shape
          if (s.pose === 'sleep') return;
          if (aim) {                                                     // torch held high, full blast
            P.r(9, L.by, 4, 1, c.skin); P.r(12, L.by - 1, 2, 2, c.torch);
            const on = s.frame ? c.beam : c.beam2;
            P.r(14, L.by - 2, 2, 4, on); P.r(16, L.by - 3, 3, 6, on); P.r(19, L.by - 4, 3, 8, on); P.r(22, L.by - 5, 2, 10, c.beam2);
            return;
          }
          P.r(L.ax + 1, L.by + 2, 2, 1, c.torch);                         // torch
          if (!L.low) {
            const on = s.frame ? c.beam : c.beam2;
            P.r(L.ax + 3, L.by + 1, 2, 3, on); P.r(L.ax + 5, L.by, 3, 5, on); P.r(L.ax + 8, L.by - 1, 2, 7, c.beam2);
          }
        }
      },

      radio: {
        name: 'Pixie', blurb: 'brains of the crew, never without her walkie', move: 'walk', speed: 32,
        draw(P, s) {
          const c = { skin: '#F0C8A0', skinS: '#C99C74', hair: '#B8502A', hairL: '#D8703A', jacket: '#8A4EC8', jacketS: '#6A3AA0', skirt: '#2FB8A8', glasses: '#2A2A30', walkie: '#3A3D44', ant: '#B8C0CC', led: '#FF5A5A' };
          const L = kid(P, s, { skin: c.skin, skinS: c.skinS, hair: c.hair, top: c.jacket, topS: c.jacketS, legs: c.skirt, shoes: '#F4F4F4' });
          P.r(5, L.hy, 1, 4, c.hair); P.p(5, L.hy + 4, c.hairL); P.p(6, L.hy - 1, c.hairL); P.p(8, L.hy - 1, c.hair); // curls
          P.r(8, L.hy + 2, 3, 1, c.glasses); P.p(9, L.hy + 2, s.blink || s.pose === 'sleep' ? c.skinS : '#9ADCFF');
          if (s.pose !== 'sleep') {
            P.r(L.ax + 1, L.by + 1, 2, 3, c.walkie); P.r(L.ax + 2, L.by - 2, 1, 3, c.ant);
            P.p(L.ax + 1, L.by + 1, s.frame ? c.led : c.walkie);
          }
        }
      },

      dog: {
        name: 'Biscuit', blurb: 'brave-ish beagle (mostly ish)', move: 'walk', speed: 44,
        draw(P, s) {
          const c = { white: '#F4F1EA', tan: '#C8823A', black: '#2A2420', nose: '#1B1B1B', ear: '#8A4E20', collar: '#2FB8A8', tag: '#E7B93C' };
          const low = s.pose === 'sit' || s.pose === 'sleep';
          const shiver = s.pose === 'idle' && s.frame ? 1 : 0;               // nervous shiver
          const by = (low ? 9 : 7), hy = (low ? 4 : 2), step = s.pose === 'walk' && s.frame === 1;
          const x = shiver;
          P.r(1 + x, by - 2, 1, 3, c.white); P.p(1 + x, by - 3, c.white);
          P.r(2 + x, by, 9, 4, c.white); P.r(4 + x, by, 5, 2, c.black); P.r(3 + x, by, 1, 3, c.tan);
          if (low) { P.r(2 + x, 13, 3, 1, c.white); P.r(9 + x, 13, 3, 1, c.white); }
          else { P.r((step ? 3 : 2) + x, 11, 2, 3, c.white); P.r((step ? 8 : 9) + x, 11, 2, 3, c.white); }
          P.r(9 + x, hy, 6, 6, c.tan); P.r(12 + x, hy + 3, 4, 3, c.white); P.p(15 + x, hy + 3, c.nose);
          P.r(9 + x, hy + 1, 2, 5, c.ear);
          P.p(12 + x, hy + 2, s.blink || s.pose === 'sleep' ? c.tan : c.nose);
          P.r(9 + x, hy + 6, 4, 1, c.collar); P.p(11 + x, hy + 7, c.tag);
          if (shiver) { P.p(16, hy - 1, '#9ADCFF'); }                    // sweat drop
        }
      },

      gloop: {
        name: 'Gloop', blurb: 'shadow slime that crawls out of rifts', move: 'hop', speed: 24, portal: true,
        draw(P, s) {
          const c = { body: '#3A2458', bodyL: '#5A3A88', shine: '#8A6AC0', bodyD: '#24163A', eye: '#7FFFD8', eyeG: '#C8FFF0', mouth: '#16101E', tooth: '#E8E2F0' };
          const sq = s.pose === 'walk' && s.frame === 1 ? 1 : 0, sleep = s.pose === 'sleep';
          const top = sleep ? 9 : 4 + sq * 2, wob = s.frame ? 1 : 0;
          // dome: each row gets wider towards the floor, like a melting gumdrop
          const rows = 14 - top;
          for (let i = 0; i < rows; i++) {
            const half = Math.min(6 + sq, 2 + Math.round(i * 1.6));
            P.r(8 - half + (i === 0 ? wob : 0), top + i, half * 2, 1, c.body);
          }
          P.r(2 - sq, 13, 12 + sq * 2, 1, c.bodyD); P.p(1 - sq, 13, c.body); P.p(14 + sq, 13, c.body);   // puddle edge
          P.r(6, top + 1, 3, 1, c.bodyL); P.p(5, top + 2, c.bodyL); P.p(6, top + 1, c.shine);
          if (!sleep) { P.p(12, top + 3 + wob, c.body); P.p(12, top + 4 + wob, c.bodyD); }               // drip
          if (sleep) { P.r(5, top + 2, 2, 1, c.eye); P.r(9, top + 2, 2, 1, c.eye); return; }
          [5, 9].forEach(ex => { if (s.blink) P.r(ex, top + 4, 2, 1, c.eye); else { P.r(ex, top + 3, 2, 2, c.eye); P.p(ex, top + 3, c.eyeG); } });
          P.r(6, top + 6, 4, 2, c.mouth); P.p(6, top + 6, c.tooth); P.p(9, top + 6, c.tooth);
        }
      },


      // ---------- the boss ----------
      grimlurk: {
        name: 'The Grimlurk', blurb: 'lanky shadow beast from the rift. The crew can drive it off!',
        move: 'walk', speed: 22, w: 26, h: 32, boss: true, portal: true,
        poses: ['stalk', 'pounce', 'roar', 'hurt'],
        draw(P, s) {
          const c = { skin: '#3A3346', skinL: '#5A5270', skinD: '#221E2C', crack: '#6FF0D8', crackD: '#2FB8A8', eye: '#FFB43C', eyeL: '#FFE7A0', horn: '#D8CFC0', hornD: '#A89E8E', mouth: '#120E18', tooth: '#F4EEE0', claw: '#E8E0D0' };
          const glow = s.frame ? c.crack : c.crackD;
          const pose = s.pose;

          // head: skull with horns, (x, y) = top-left of the 7x6 skull
          const head = (x, y, open, shut) => {
            P.r(x, y, 6, 5, c.skin); P.r(x + 6, y + 2, 2, 3, c.skin);             // skull + long snout
            P.r(x, y, 6, 1, c.skinL); P.r(x + 1, y + 5, 5, 1, c.skinD);
            P.p(x - 1, y - 1, c.horn); P.p(x - 2, y - 2, c.horn); P.p(x - 3, y - 2, c.hornD); P.p(x, y - 1, c.hornD);   // swept-back horns
            P.p(x + 2, y - 1, c.horn); P.p(x + 1, y - 2, c.horn); P.p(x + 1, y - 3, c.hornD);
            if (shut) P.r(x + 3, y + 2, 2, 1, c.skinD);
            else { P.r(x + 3, y + 1, 2, 2, c.eye); P.p(x + 4, y + 1, c.eyeL); }
            P.p(x + 7, y + 2, c.skinD);                                           // nostril
            if (open) {                                                           // jaw drops open
              P.r(x + 3, y + 5, 5, 3, c.mouth); P.r(x + 3, y + 8, 5, 1, c.skin);
              [x + 4, x + 6].forEach(t => P.p(t, y + 5, c.tooth)); [x + 5, x + 7].forEach(t => P.p(t, y + 7, c.tooth));
            } else { P.r(x + 3, y + 5, 5, 1, c.skin); P.p(x + 5, y + 5, c.tooth); P.p(x + 7, y + 4, c.tooth); }
          };
          const cracks = (x, y) => { P.p(x, y, glow); P.p(x + 1, y + 1, glow); P.p(x, y + 2, glow); P.p(x - 1, y + 3, glow); P.p(x + 1, y + 4, glow); };
          const spikes = (x, y) => { [0, 2, 4].forEach(i => { P.p(x, y + i * 2, c.skinD); P.p(x - 1, y + i * 2, c.hornD); }); };
          const claw = (x, y) => { P.p(x, y, c.claw); P.p(x + 1, y + 1, c.claw); P.p(x + 2, y, c.claw); };

          if (pose === 'pounce') {                                               // airborne, stretched out
            P.r(1, 18, 4, 2, c.skinD); P.r(0, 20, 3, 1, c.skinD); claw(0, 21);    // trailing legs
            P.r(4, 15, 4, 3, c.skin); P.r(3, 19, 3, 2, c.skin);
            P.r(6, 12, 12, 6, c.skin); P.r(6, 12, 12, 1, c.skinL); P.r(7, 17, 10, 1, c.skinD);
            spikes(7, 10); P.r(9, 10, 1, 1, c.skinD); P.r(11, 10, 1, 1, c.skinD);
            cracks(13, 12);
            P.r(17, 15, 6, 2, c.skin); claw(23, 15); P.r(16, 17, 6, 1, c.skinD); claw(22, 18);   // arms reaching
            head(17, 8, true);
            return;
          }

          const roar = pose === 'roar', hurt = pose === 'hurt';
          const low = pose === 'stalk' || pose === 'walk' ? 3 : pose === 'sit' || pose === 'sleep' ? 6 : 0;
          const lean = pose === 'stalk' ? 2 : hurt ? -2 : 0;
          const step = (pose === 'walk' || pose === 'stalk') && s.frame === 1;
          // legs (bent, digitigrade)
          const leg = (x, back) => {
            const col = back ? c.skinD : c.skin;
            P.r(x, 17 + low, 2, 5 - Math.min(low, 3), col); P.r(x + 1, 22, 2, 4, col); P.r(x + 1, 26, 4, 2, col); claw(x + 3, 28);
          };
          if (pose === 'sit' || pose === 'sleep') { P.r(5, 24, 12, 4, c.skinD); claw(16, 28); claw(4, 28); }
          else { leg(step ? 9 : 7, true); leg(step ? 11 : 13, false); }
          // back arm
          if (roar) { P.r(6, 4, 2, 9, c.skinD); claw(5, 2); }
          else { P.r(9 + lean, 11 + low, 2, 10, c.skinD); claw(9 + lean, 21 + low); }
          // hunched torso
          const ty = 9 + low;
          P.r(7 + lean, ty, 9, 9, c.skin); P.r(8 + lean, ty - 1, 7, 1, c.skin); P.r(7 + lean, ty, 9, 1, c.skinL);
          P.r(7 + lean, ty + 8, 9, 1, c.skinD);
          spikes(6 + lean, ty);
          cracks(13 + lean, ty + 2);
          // neck + head
          P.r(14 + lean, ty - 2, 3, 3, c.skin);
          if (roar) head(15, 1, true);
          else if (hurt) head(13 + lean, ty - 7, false, true);
          else head(15 + lean, ty - 6, s.pose === 'stalk' && s.frame === 1);
          // front arm: long, claws down at the knees; raised when roaring, shielding when hurt
          if (roar) { P.r(17, 7, 2, 8, c.skin); P.r(19, 3, 2, 5, c.skin); claw(20, 1); }
          else if (hurt) { P.r(16 + lean, ty + 1, 2, 4, c.skin); P.r(17 + lean, ty - 4, 4, 2, c.skin); claw(21 + lean, ty - 5); }
          else { P.r(14 + lean, ty + 1, 2, 9, c.skinL); P.p(14 + lean, ty + 1, c.skin); P.r(15 + lean, ty + 10, 2, 5 - Math.min(low, 2), c.skinL); claw(16 + lean, ty + 15 - Math.min(low, 2)); }
          if (pose === 'sleep') { P.r(15, 9 + low, 7, 6, c.skin); P.r(18, 11 + low, 2, 1, c.skinD); }
        }
      },

      sling: {
        name: 'Ace', blurb: 'never misses with the slingshot (well, hardly ever)', move: 'walk', speed: 36, hero: 'sling', poses: ['aim'],
        draw(P, s) {
          const c = { skin: '#E8B48C', skinS: '#B98660', hair: '#2A1E14', tee: '#F4F2EE', stripe: '#3C74E0', band: '#D6392F', jeans: '#4A5A8C', wood: '#8B5A2B', rubber: '#3A3D44', pebble: '#9A9488' };
          const L = kid(P, s.pose === 'aim' ? { ...s, pose: 'idle' } : s, { skin: c.skin, skinS: c.skinS, hair: c.hair, top: c.tee, topS: c.stripe, legs: c.jeans, shoes: '#2A2A30' });
          P.r(6, L.by + 1, 5, 1, c.stripe); P.r(6, L.by + 3, 5, 1, c.stripe);   // striped tee
          P.r(6, L.hy, 5, 1, c.band); P.p(5, L.hy + 1, c.band); P.p(5, L.hy + 2, c.band);  // headband with tails
          if (s.pose === 'aim') {                                               // arm out, band pulled back
            P.r(9, L.by + 1, 4, 1, c.skin); P.r(13, L.by - 1, 1, 4, c.wood); P.p(14, L.by - 2, c.wood); P.p(14, L.by + 2, c.wood);
            P.r(10, L.by, 3, 1, c.rubber); P.p(10, L.by + 1, c.pebble);
          } else if (s.pose !== 'sleep') {
            P.r(L.ax + 1, L.by + 2, 1, 2, c.wood); P.p(L.ax, L.by + 1, c.wood); P.p(L.ax + 2, L.by + 1, c.wood); // slingshot in hand
          }
        }
      },

      // ---------- builds ----------
      treehouse: {
        name: 'Treehouse HQ', blurb: 'secret club headquarters, password required',
        kind: 'build', move: 'none', w: 24, h: 32, feet: 32,
        glow: { x: 13, y: 11, r: 8, rgb: '255,200,110' },
        draw(P, s) {
          const c = { trunk: '#7A4E2A', trunkD: '#5A3A1E', leaf: '#3E8A3A', leafL: '#5DAA45', leafD: '#2E6A2B', plank: '#B07A40', plankD: '#8A5A2A', roof: '#8A3A2A', window: '#FFD86B', windowL: '#FFF0A0', rope: '#D8C090', sign: '#E8D8A8', signT: '#6A3A1A', flag: '#2FB8A8' };
          P.r(10, 18, 4, 14, c.trunk); P.r(13, 18, 1, 14, c.trunkD); P.r(8, 30, 8, 2, c.trunk); // trunk
          P.r(1, 2, 22, 9, c.leaf); P.r(3, 0, 18, 2, c.leaf); P.r(0, 5, 24, 4, c.leaf);
          [[3, 1], [8, 3], [15, 1], [19, 4], [5, 6], [12, 7], [20, 8]].forEach(([x, y]) => P.r(x, y, 2, 1, c.leafL));
          P.r(1, 10, 22, 1, c.leafD);
          P.r(5, 11, 15, 1, c.roof); P.r(6, 10, 13, 1, c.roof);           // hut
          P.r(6, 12, 13, 6, c.plank); for (let y = 13; y < 18; y += 2) P.r(6, y, 13, 1, c.plankD);
          P.r(4, 18, 17, 1, c.plankD);
          P.r(11, 13, 4, 3, s.frame ? c.windowL : c.window); P.r(12, 13, 1, 3, c.plankD);
          P.r(15, 20, 6, 3, c.sign); P.r(16, 21, 4, 1, c.signT); P.p(17, 23, c.plankD);  // "keep out" plank
          P.r(5, 19, 1, 11, c.rope); [21, 24, 27].forEach(y => P.r(4, y, 3, 1, c.plank));  // rope ladder
          P.r(19, 6, 1, 4, c.trunkD); P.r(20, 6, 3, 2, c.flag); P.p(22 + s.frame - 1, 8, c.flag);
        }
      },

      arcade: {
        name: 'Arcade Cabinet', blurb: 'high score machine that never sleeps',
        kind: 'build', move: 'none', w: 14, h: 24, feet: 24,
        glow: { x: 7, y: 8, r: 9, rgb: '120,220,255' },
        draw(P, s) {
          const c = { cab: '#2A2440', cabL: '#3E3660', side: '#E8394A', marquee: '#FFE066', screen: '#0E1A2A', s1: '#7FFFD8', s2: '#FF6AC8', s3: '#FFE066', panel: '#3E3660', stick: '#E8394A', btn: '#2FB8A8', btn2: '#FFE066' };
          P.r(2, 0, 10, 24, c.cab); P.r(2, 0, 1, 24, c.side); P.r(11, 0, 1, 24, c.side);
          P.r(3, 1, 8, 3, c.marquee); [4, 6, 8].forEach(x => P.p(x, 2, c.cab));
          P.r(3, 5, 8, 7, c.screen);
          if (s.frame) { P.p(5, 9, c.s1); P.r(4, 10, 3, 1, c.s1); P.p(8, 6, c.s2); P.r(7, 7, 3, 1, c.s2); P.p(9, 9, c.s3); }
          else { P.p(6, 9, c.s1); P.r(5, 10, 3, 1, c.s1); P.p(6, 6, c.s2); P.r(5, 7, 3, 1, c.s2); P.p(9, 8, c.s3); }
          P.r(1, 13, 12, 3, c.panel); P.r(1, 13, 12, 1, c.cabL);
          P.r(3, 12, 1, 2, c.stick); P.p(3, 11, c.stick); P.p(7, 14, c.btn); P.p(9, 14, c.btn2);
          P.r(4, 18, 6, 2, c.cabL); P.p(6, 19, c.marquee);                // coin slot
        }
      }
    }
  };
})());
