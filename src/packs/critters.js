// Critters pack — original blocky animals.
// Sprites face RIGHT; the app mirrors them when walking left.
// state = { pose: 'walk'|'idle'|'sit'|'sleep', frame: 0|1, blink: bool }
(function (root, pack) {
  if (typeof module === 'object' && module.exports) module.exports = pack;
  else (root.BBPacks = root.BBPacks || []).push(pack);
})(typeof self !== 'undefined' ? self : this, {
  id: 'critters',
  name: 'Critters',
  items: {
    pup: {
      name: 'Pup', blurb: 'loyal blocky doggo', move: 'walk', speed: 45,
      draw(P, s) {
        const c = { body: '#9A6332', shade: '#71461F', muzzle: '#E2BE8E', ear: '#4E2F14', dark: '#1B1B1B', band: '#3C74E0', tongue: '#E8737E' };
        const low = s.pose === 'sit' || s.pose === 'sleep';
        const by = low ? 9 : 7, hy = low ? 3 : 2;
        const step = s.pose === 'walk' && s.frame === 1;
        P.r(1, by - (s.frame ? 2 : 1), 1, 2, c.shade);              // wagging tail
        P.r(2, by, 9, 4, c.body); P.r(2, by + 3, 9, 1, c.shade);     // body
        if (low) { P.r(2, 13, 3, 1, c.shade); P.r(9, 13, 3, 1, c.shade); }
        else { P.r(step ? 3 : 2, 11, 2, 3, c.shade); P.r(step ? 8 : 9, 11, 2, 3, c.shade); }
        P.r(9, hy, 6, 6, c.body);                                    // head
        P.r(12, hy + 3, 4, 3, c.muzzle);
        P.p(15, hy + 3, c.dark);                                     // nose
        P.r(9, hy, 2, 4, c.ear);                                     // floppy ear
        const closed = s.blink || s.pose === 'sleep';
        P.p(12, hy + 2, closed ? c.shade : c.dark);
        if (s.pose === 'idle' && s.frame) P.p(13, hy + 6, c.tongue);
        P.r(9, hy + 6, 3, 1, c.band); P.p(10, hy + 7, c.band);       // bandana
      }
    },

    kit: {
      name: 'Kit', blurb: 'stripy orange cat', move: 'walk', speed: 38,
      draw(P, s) {
        const c = { body: '#E58B32', shade: '#B9661C', stripe: '#A2521A', cream: '#F6E6C8', dark: '#1B1B1B', eye: '#52C46A', nose: '#E98A9A' };
        const low = s.pose === 'sit' || s.pose === 'sleep';
        const by = low ? 10 : 8, hy = low ? 5 : 3;
        const step = s.pose === 'walk' && s.frame === 1;
        if (low) P.r(0, 12, 3, 1, c.body);                           // tail curled on floor
        else { P.r(1, by - 3, 1, 4, c.body); P.p(1, by - 4 + s.frame, c.stripe); }
        P.r(2, by, 9, 3, c.body);
        P.p(4, by, c.stripe); P.p(6, by, c.stripe); P.p(8, by, c.stripe);
        P.r(4, by + 2, 5, 1, c.cream);
        if (low) { P.r(2, 13, 2, 1, c.shade); P.r(8, 13, 3, 1, c.cream); }
        else { P.r(step ? 3 : 2, 11, 2, 3, c.shade); P.r(step ? 8 : 9, 11, 2, 3, c.shade); }
        P.r(9, hy, 6, 5, c.body);                                    // head
        P.r(9, hy - 1, 2, 1, c.body); P.r(12, hy - 1, 2, 1, c.body); // pointy ears
        P.p(11, hy, c.stripe);
        P.r(12, hy + 3, 3, 2, c.cream); P.p(14, hy + 3, c.nose);
        if (s.blink || s.pose === 'sleep') P.r(12, hy + 2, 2, 1, c.shade);
        else { P.p(12, hy + 2, c.eye); P.p(13, hy + 2, c.dark); }
      }
    },

    bun: {
      name: 'Bun', blurb: 'hoppy fluff bunny', move: 'hop', speed: 35,
      draw(P, s) {
        const c = { fur: '#F4F1EC', shade: '#D3CEC6', pink: '#F2A5B8', dark: '#222222', tail: '#FFFFFF' };
        const sleep = s.pose === 'sleep';
        P.r(3, 9, 7, 4, c.fur); P.r(3, 12, 7, 1, c.shade);           // body
        P.r(2, 9, 2, 2, c.tail);                                     // puff tail
        if (s.pose === 'walk' && s.frame) P.r(1, 12, 3, 1, c.shade); // legs stretched mid-hop
        else P.r(3, 13, 4, 1, c.shade);
        P.r(9, 13, 2, 1, c.shade);
        P.r(9, 6, 5, 5, c.fur);                                      // head
        if (sleep) { P.r(5, 6, 4, 1, c.fur); P.r(5, 7, 4, 1, c.pink); } // ears flopped back
        else {
          P.r(9, 1, 2, 5, c.fur); P.r(10, 2, 1, 3, c.pink);
          P.r(12, 2, 2, 4, c.fur); P.r(12, 3, 1, 2, c.pink);
        }
        P.p(11, 8, s.blink || sleep ? c.shade : c.dark);
        P.p(13, 9, c.pink);
      }
    },

    mossling: {
      name: 'Mossling', blurb: 'mossy stone cube with a flower', move: 'hop', speed: 25,
      draw(P, s) {
        const c = { stone: '#7A8A68', light: '#93A47E', dark: '#55623F', moss: '#4E9A3C', mossD: '#3C7A2D', eye: '#1D2216', shine: '#E8F0D8', leaf: '#58C24A', petal: '#F07FB2', center: '#FFE066' };
        const squash = s.pose === 'walk' && s.frame === 1;
        const x0 = squash ? 2 : 3, w = squash ? 12 : 10, y0 = squash ? 6 : 5, h = 14 - y0;
        P.r(x0, y0, w, h, c.stone);
        P.r(x0, y0 + 1, 1, h - 2, c.light);
        P.r(x0, y0 + h - 1, w, 1, c.dark); P.r(x0 + w - 1, y0 + 1, 1, h - 1, c.dark);
        P.r(x0, y0, w, 2, c.moss);                                   // mossy top + drips
        P.p(x0 + 1, y0 + 2, c.moss); P.p(x0 + 4, y0 + 2, c.mossD);
        P.p(x0 + w - 3, y0 + 2, c.moss); P.p(x0 + w - 3, y0 + 3, c.moss);
        const cx = x0 + w / 2;
        if (s.pose !== 'sleep') {                                    // sprout + flower
          P.r(cx, y0 - 3, 1, 3, c.leaf);
          P.p(cx - 1, y0 - 2, c.leaf); P.p(cx + 1, y0 - 3, c.leaf);
          P.p(cx, y0 - 4, c.center);
          P.p(cx - 1, y0 - 4, c.petal); P.p(cx + 1, y0 - 4, c.petal); P.p(cx, y0 - 5, c.petal);
        } else { P.r(cx, y0 - 1, 1, 1, c.leaf); P.p(cx + 1, y0 - 2, c.petal); }
        const ey = y0 + 4;
        [x0 + 2, x0 + w - 4].forEach(ex => {
          if (s.blink || s.pose === 'sleep') P.r(ex, ey + 1, 2, 1, c.eye);
          else { P.r(ex, ey, 2, 2, c.eye); P.p(ex, ey, c.shine); }
        });
        P.r(cx - 1, ey + 3, 2, 1, c.dark);                           // mouth
      }
    },

    ember: {
      name: 'Ember', blurb: 'cosy little flame cube', move: 'hop', speed: 40,
      draw(P, s) {
        const c = { base: '#F0782A', light: '#FFB04A', dark: '#B4471C', eye: '#3A1608', f1: '#FFE27A', f2: '#FF9A2E', f3: '#FF5A1F' };
        const squash = s.pose === 'walk' && s.frame === 1;
        const x0 = squash ? 3 : 4, w = squash ? 10 : 8, y0 = squash ? 8 : 7, h = 14 - y0;
        P.r(x0, y0, w, h, c.base);
        P.r(x0, y0, w - 1, 1, c.light); P.r(x0, y0, 1, h - 1, c.light);
        P.r(x0 + 1, y0 + h - 1, w - 1, 1, c.dark); P.r(x0 + w - 1, y0 + 1, 1, h - 1, c.dark);
        const cx = x0 + w / 2;
        if (s.pose === 'sleep') P.r(cx - 1, y0 - 1, 2, 1, c.f2);
        else if (s.frame === 0) {
          P.r(cx - 2, y0 - 2, 4, 2, c.f3); P.r(cx - 1, y0 - 4, 2, 2, c.f2);
          P.p(cx - 1, y0 - 5, c.f1); P.p(cx + 2, y0 - 3, c.f2); P.r(cx - 1, y0 - 2, 2, 1, c.f1);
        } else {
          P.r(cx - 2, y0 - 2, 4, 2, c.f3); P.r(cx - 1, y0 - 3, 2, 1, c.f2);
          P.r(cx, y0 - 5, 1, 2, c.f2); P.p(cx, y0 - 6, c.f1); P.p(cx - 3, y0 - 3, c.f2);
          P.r(cx - 1, y0 - 2, 2, 1, c.f1);
        }
        const ey = y0 + 2;
        [x0 + 2, x0 + w - 3].forEach(ex => {
          if (s.blink || s.pose === 'sleep') P.p(ex, ey + 1, c.eye); else P.r(ex, ey, 1, 2, c.eye);
        });
        P.r(cx - 1, ey + 3, 2, 1, c.dark);
      }
    },

    pip: {
      name: 'Pip', blurb: 'waddly penguin', move: 'walk', speed: 22,
      draw(P, s) {
        const c = { black: '#23262E', grey: '#3B404C', white: '#F3F3F0', beak: '#F5A524', feet: '#F08A1C', eye: '#FFFFFF', blush: '#F2A0A8' };
        const low = s.pose === 'sit' || s.pose === 'sleep';
        const oy = low ? 1 : 0;
        P.r(5, 3 + oy, 6, 10 - oy, c.black);
        P.p(5, 3 + oy, null); P.p(10, 3 + oy, null);                 // rounded head
        P.r(8, 6 + oy, 3, 6 - oy, c.white);                          // belly
        P.r(11, 5 + oy, 2, 1, c.beak);
        P.p(9, 4 + oy, s.blink || s.pose === 'sleep' ? c.grey : c.eye);
        P.p(10, 6 + oy, c.blush);
        if (s.pose === 'walk' && s.frame) { P.r(6, 7, 1, 3, c.grey); P.p(5, 10, c.grey); }
        else P.r(6, 7 + oy, 1, 4, c.grey);                           // flipper
        if (s.pose === 'walk' && s.frame) { P.r(5, 13, 2, 1, c.feet); P.r(10, 13, 2, 1, c.feet); }
        else { P.r(6, 13, 2, 1, c.feet); P.r(9, 13, 2, 1, c.feet); }
      }
    }
  }
});
