// Jolly Winter pack (draft for review) — original festive buddies.
// Sprites face RIGHT; state = { pose: 'walk'|'idle'|'sit'|'sleep', frame: 0|1, blink: bool }
(function (root, pack) {
  if (typeof module === 'object' && module.exports) module.exports = pack;
  else (root.BBPacks = root.BBPacks || []).push(pack);
})(typeof self !== 'undefined' ? self : this, (function () {
  const DARK = '#1B1B1B';

  return {
    id: 'winter',
    name: 'Jolly Winter',
    items: {
      elf: {
        name: 'Jingle', blurb: 'workshop elf with a bell hat', move: 'walk', speed: 34,
        draw(P, s) {
          const c = { tunic: '#2E9A4A', tunicS: '#22743A', skin: '#F2C9A2', skinS: '#C99C74', hat: '#D6392F', hatS: '#A82A22', fur: '#F6F6F2', bell: '#E7B93C', belt: '#3A2A1C', buckle: '#E7B93C', legs: '#D6392F', boots: '#2E5C2B', cheek: '#F09AA0' };
          const low = s.pose === 'sit' || s.pose === 'sleep';
          const hy = low ? 5 : 3, by = hy + 5, step = s.pose === 'walk' && s.frame === 0;
          if (low) { P.r(6, 12, 6, 1, c.legs); P.r(11, 11, 2, 2, c.boots); P.p(13, 11, c.boots); }
          else if (step) { P.r(5, 11, 2, 2, c.legs); P.r(9, 11, 2, 2, c.legs); P.r(4, 13, 3, 1, c.boots); P.r(9, 13, 3, 1, c.boots); P.p(12, 12, c.boots); }
          else { P.r(6, 11, 2, 2, c.legs); P.r(8, 11, 2, 2, c.legs); P.r(6, 13, 2, 1, c.boots); P.r(8, 13, 3, 1, c.boots); P.p(11, 12, c.boots); }
          P.r(6, by, 5, (low ? 12 : 11) - by, c.tunic); P.r(6, by, 1, (low ? 12 : 11) - by, c.tunicS);
          P.r(5, by + 2, 7, 1, c.tunic);                               // flared tunic
          P.r(6, by + 1, 5, 1, c.belt); P.p(8, by + 1, c.buckle);
          P.r(7, hy, 4, 5, c.skin); P.p(7, hy + 1, c.skinS);
          P.p(11, hy + 2, c.skin); P.p(12, hy + 1, c.skin);            // pointy ear
          P.p(10, hy + 3, c.cheek);
          P.p(9, hy + 2, s.blink || s.pose === 'sleep' ? c.skinS : DARK);
          P.r(6, hy, 6, 1, c.fur);                                     // hat brim
          P.r(6, hy - 1, 5, 1, c.hat); P.r(5, hy - 2, 4, 1, c.hat); P.r(4, hy - 3, 2, 1, c.hatS);
          P.p(3, hy - 2 + (s.frame ? 1 : 0), c.bell);                  // swinging bell
          P.r(8, by, 1, 3, c.tunicS); P.p(8, by + 3, c.skin);
        }
      },

      reindeer: {
        name: 'Tinsel', blurb: 'reindeer with fairy-light antlers', move: 'walk', speed: 40, h: 17,
        draw(P0, s) {
          const P = { r: (x, y, w, h, c) => P0.r(x, y + 1, w, h, c), p: (x, y, c) => P0.p(x, y + 1, c) };
          const c = { fur: '#8B5A2B', furS: '#6B4423', belly: '#D9B48A', antler: '#C8A26A', nose: '#2A1A10', hoof: '#3A2A1C', collar: '#D6392F', bell: '#E7B93C', l1: '#FF5A5A', l2: '#5AD06A', l3: '#5AA8FF', l4: '#FFE066' };
          const low = s.pose === 'sit' || s.pose === 'sleep';
          const by = low ? 9 : 7, hy = low ? 4 : 2, step = s.pose === 'walk' && s.frame === 1;
          P.p(1, by, c.belly); P.p(1, by + 1, c.fur);                  // tail
          P.r(2, by, 9, 4, c.fur); P.r(4, by + 3, 6, 1, c.belly); P.r(2, by, 9, 1, c.furS);
          if (low) { P.r(2, 13, 3, 1, c.hoof); P.r(8, 13, 3, 1, c.hoof); }
          else {
            P.r(step ? 3 : 2, 11, 1, 2, c.fur); P.r(step ? 5 : 4, 11, 1, 2, c.fur);
            P.r(step ? 8 : 9, 11, 1, 2, c.fur); P.r(10, 11, 1, 2, c.fur);
            [step ? 3 : 2, step ? 5 : 4, step ? 8 : 9, 10].forEach(x => P.p(x, 13, c.hoof));
          }
          P.r(10, hy + 2, 3, 4, c.fur);                               // neck
          P.r(11, hy + 1, 4, 4, c.fur); P.r(14, hy + 3, 2, 2, c.belly); P.p(15, hy + 3, c.nose);
          P.p(13, hy + 2, s.blink || s.pose === 'sleep' ? c.furS : DARK);
          P.p(11, hy + 1, c.furS);                                     // ear
          P.r(10, hy + 5, 3, 1, c.collar); P.p(12, hy + 6, c.bell);
          // antlers with twinkly lights
          P.r(12, hy - 2, 1, 3, c.antler); P.p(11, hy - 2, c.antler); P.p(13, hy - 3, c.antler);
          P.r(10, hy - 1, 1, 2, c.antler); P.p(9, hy - 2, c.antler);
          const on = s.frame ? [c.l1, c.l2, c.l3] : [c.l4, c.l1, c.l2];
          P.p(11, hy - 3, on[0]); P.p(14, hy - 3, on[1]); P.p(9, hy - 3, on[2]);
        }
      },

      snowman: {
        name: 'Flake', blurb: 'snowman who rebuilds himself', move: 'hop', speed: 18, h: 18,
        draw(P0, s) {
          const P = { r: (x, y, w, h, c) => P0.r(x, y + 2, w, h, c), p: (x, y, c) => P0.p(x, y + 2, c) };
          const c = { snow: '#F7FAFF', snowS: '#CAD6E8', coal: '#2A2A30', carrot: '#F08A1C', scarf: '#3C74E0', scarfS: '#2A55AC', hat: '#2A2A30', band: '#D6392F', stick: '#7A4E2A' };
          const melt = s.pose === 'sleep';                            // sleeps as a slumped heap
          if (melt) {
            P.r(2, 11, 12, 3, c.snow); P.r(3, 10, 10, 1, c.snow); P.r(2, 13, 12, 1, c.snowS);
            P.r(6, 8, 4, 2, c.snow); P.p(7, 9, c.coal); P.p(9, 9, c.coal); P.p(10, 9, c.carrot);
            P.r(5, 7, 5, 1, c.hat); P.r(6, 6, 3, 1, c.hat); P.r(1, 12, 3, 1, c.scarf);
            return;
          }
          const sq = s.pose === 'walk' && s.frame === 1 ? 1 : 0;
          P.r(3, 9 + sq, 10, 5 - sq, c.snow); P.r(4, 8 + sq, 8, 1, c.snow); P.r(3, 13, 10, 1, c.snowS);
          P.r(4, 5 + sq, 7, 4, c.snow); P.r(5, 4 + sq, 5, 1, c.snow); P.r(10, 6 + sq, 1, 3, c.snowS);
          P.r(5, 1 + sq, 5, 3, c.snow); P.r(9, 2 + sq, 1, 2, c.snowS);
          P.p(7, 9 + sq, c.coal); P.p(7, 11 + sq, c.coal); P.p(7, 6 + sq, c.coal);
          P.p(8, 2 + sq, s.blink ? c.snowS : c.coal); P.r(10, 3 + sq, 2, 1, c.carrot);
          P.r(4, 4 + sq, 7, 1, c.scarf); P.r(4, 5 + sq, 2, 3, c.scarfS);
          P.r(4, 0 + sq, 7, 1, c.hat); P.r(5, -2 + sq, 5, 2, c.hat); P.r(5, -1 + sq, 5, 1, c.band);
          P.r(11, 6 + sq - s.frame, 3, 1, c.stick); P.p(14, 5 + sq - s.frame, c.stick); // waving arm
        }
      },

      bear: {
        name: 'Nook', blurb: 'polar bear cub in a bobble hat', move: 'walk', speed: 30,
        draw(P, s) {
          const c = { fur: '#F4F6F8', furS: '#D2DAE4', line: '#9AA6B8', nose: '#2A2A30', hat: '#3CA0C8', hatS: '#2A7A9C', bobble: '#F6F6F2', pad: '#7A8696' };
          const low = s.pose === 'sit' || s.pose === 'sleep';
          const by = low ? 9 : 7, hy = low ? 5 : 3, step = s.pose === 'walk' && s.frame === 1;
          P.r(2, by - 1, 8, 1, c.line); P.r(1, by, 1, 4, c.line);                  // outline
          P.r(2, by, 9, 5, c.fur); P.r(2, by + 4, 9, 1, c.furS); P.r(2, by, 9, 1, '#FFFFFF');
          if (low) { P.r(2, 13, 4, 1, c.line); P.r(8, 13, 4, 1, c.line); }
          else { P.r(step ? 3 : 2, 12, 3, 2, c.fur); P.r(step ? 8 : 9, 12, 3, 2, c.fur); P.r(step ? 3 : 2, 13, 3, 1, c.line); P.r(step ? 8 : 9, 13, 3, 1, c.line); }
          P.r(9, hy, 6, 6, c.fur); P.r(13, hy + 3, 3, 2, c.fur); P.p(15, hy + 3, c.nose);
          P.r(9, hy + 5, 5, 1, c.furS); P.r(15, hy + 4, 1, 1, c.line); P.r(14, hy + 5, 1, 1, c.line);
          P.r(8, hy + 1, 1, 4, c.line);
          P.p(9, hy, c.furS);
          P.p(12, hy + 2, s.blink || s.pose === 'sleep' ? c.line : c.nose);
          P.r(9, hy - 1, 6, 2, c.hat); P.r(9, hy, 6, 1, c.hatS); P.p(11, hy - 2, c.hat);
          P.r(11, hy - 3, 2, 1, c.bobble); P.p(12, hy - 4 + (s.frame ? 1 : 0), c.bobble);
        }
      },

      ginger: {
        name: 'Snap', blurb: 'gingerbread pup with icing', move: 'hop', speed: 36,
        draw(P, s) {
          const c = { dough: '#C27A3A', doughS: '#9A5A26', icing: '#FFFFFF', gum: '#E8394A', gum2: '#3CB04A', dark: '#3A1E0A' };
          const low = s.pose === 'sit' || s.pose === 'sleep';
          const by = low ? 9 : 7, hy = low ? 4 : 2, step = s.pose === 'walk' && s.frame === 1;
          P.r(1, by - 1, 1, 2, c.dough);
          P.r(2, by, 9, 4, c.dough); P.r(2, by + 3, 9, 1, c.doughS);
          for (let x = 3; x < 10; x += 2) P.p(x, by + 1, c.icing);      // icing zigzag
          for (let x = 4; x < 10; x += 2) P.p(x, by + 2, c.icing);
          if (low) { P.r(2, 13, 3, 1, c.doughS); P.r(9, 13, 3, 1, c.doughS); }
          else { P.r(step ? 3 : 2, 11, 2, 3, c.dough); P.r(step ? 8 : 9, 11, 2, 3, c.dough); P.r(step ? 3 : 2, 13, 2, 1, c.icing); P.r(step ? 8 : 9, 13, 2, 1, c.icing); }
          P.r(9, hy, 6, 6, c.dough); P.r(9, hy + 5, 6, 1, c.doughS);
          P.r(9, hy, 2, 3, c.doughS);                                  // ear
          P.p(15, hy + 3, c.dark);
          P.p(12, hy + 2, s.blink || s.pose === 'sleep' ? c.doughS : c.dark);
          P.r(12, hy + 4, 3, 1, c.icing);                              // icing smile
          P.p(5, by + 1, c.gum); P.p(7, by + 2, c.gum2);              // gumdrop buttons
        }
      },

      // ---------- builds ----------
      tree: {
        name: 'Twinkle Tree', blurb: 'decorated tree with a glowing star',
        kind: 'build', move: 'none', w: 20, h: 28, feet: 28,
        glow: { x: 10, y: 3, r: 10, rgb: '255,220,120' },
        draw(P, s) {
          const c = { g1: '#2E8A3E', g2: '#3FAE4E', g3: '#226A30', trunk: '#7A4E2A', pot: '#B8322A', potL: '#D6392F', star: '#FFE066', starL: '#FFF6C0', snow: '#F7FAFF', lights: ['#FF5A5A', '#5AA8FF', '#FFE066', '#C77DFF', '#5AD06A'] };
          P.r(7, 24, 6, 4, c.pot); P.r(7, 24, 6, 1, c.potL); P.r(9, 22, 2, 2, c.trunk);
          const tiers = [[9, 3, 2], [8, 5, 4], [7, 7, 6], [6, 9, 8], [5, 11, 10], [6, 13, 8], [4, 14, 12], [3, 16, 14], [4, 18, 12], [2, 19, 16], [1, 21, 18]];
          tiers.forEach(([x, y, w]) => { P.r(x, y, w, 2, c.g1); P.r(x, y + 1, w, 1, c.g3); P.r(x + 1, y, Math.max(1, w / 3), 1, c.g2); });
          P.r(9, 1, 2, 2, c.star); P.p(8, 2, c.star); P.p(11, 2, c.star); P.p(9, 0, c.star); P.p(10, 1, c.starL);
          const spots = [[9, 6], [11, 8], [7, 10], [12, 12], [8, 14], [5, 17], [13, 16], [10, 18], [4, 20], [15, 20], [8, 21], [12, 21]];
          spots.forEach(([x, y], i) => P.p(x, y, c.lights[(i + (s.frame ? 2 : 0)) % c.lights.length]));
          P.r(5, 12, 3, 1, c.snow); P.r(13, 17, 3, 1, c.snow); P.r(2, 21, 3, 1, c.snow);
        }
      },

      gingerhouse: {
        name: 'Gingerbread House', blurb: 'sweet little cottage with a candy door',
        kind: 'build', move: 'none', w: 24, h: 20, feet: 20,
        glow: { x: 12, y: 13, r: 9, rgb: '255,200,120' },
        draw(P, s) {
          const c = { dough: '#C27A3A', doughS: '#9A5A26', icing: '#FFFFFF', red: '#E8394A', green: '#3CB04A', door: '#6B3A1A', glass: '#FFD86B', glassL: '#FFF0A0', cane: '#FFFFFF' };
          P.r(3, 9, 18, 11, c.dough); P.r(3, 19, 18, 1, c.doughS); P.r(20, 9, 1, 11, c.doughS);
          for (let i = 0; i < 9; i++) { P.r(2 + i, 9 - i, 20 - i * 2, 1, c.icing); }
          for (let i = 0; i < 8; i++) P.r(3 + i, 9 - i, 18 - i * 2, 1, i % 2 ? c.dough : c.doughS);
          P.r(2, 9, 20, 1, c.icing);
          [[6, 7], [12, 4], [17, 7], [9, 6], [14, 6]].forEach(([x, y], i) => P.p(x, y, i % 2 ? c.green : c.red));
          P.r(10, 13, 4, 7, c.door); P.r(10, 13, 4, 1, c.icing); P.p(13, 16, c.glass);
          [4, 16].forEach(x => { P.r(x, 12, 4, 3, s.frame ? c.glassL : c.glass); P.r(x, 12, 4, 1, c.icing); P.r(x + 1, 12, 1, 3, c.icing); });
          P.r(1, 12, 1, 8, c.cane); [13, 15, 17, 19].forEach(y => P.p(1, y, c.red)); P.p(2, 12, c.red); P.p(2, 11, c.cane);
          P.r(22, 12, 1, 8, c.cane); [12, 14, 16, 18].forEach(y => P.p(22, y, c.red)); P.p(21, 12, c.red); P.p(21, 11, c.cane);
          P.r(4, 19, 2, 1, c.green); P.r(17, 19, 3, 1, c.red);
        }
      }
    }
  };
})());
