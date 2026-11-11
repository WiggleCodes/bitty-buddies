// Builds pack — structures you place on the desktop. Pets like to rest near them.
// kind: 'build' items don't walk; they can be dragged along the ground.
// glow: optional soft light { x, y, r } in grid pixels plus an rgb colour.
(function (root, pack) {
  if (typeof module === 'object' && module.exports) module.exports = pack;
  else (root.BBPacks = root.BBPacks || []).push(pack);
})(typeof self !== 'undefined' ? self : this, {
  id: 'builds',
  name: 'Builds',
  items: {
    shrine: {
      name: 'Shrine', blurb: 'stone shrine with a glowing crystal',
      kind: 'build', move: 'none', w: 24, h: 24, feet: 24,
      glow: { x: 12, y: 11, r: 14, rgb: '170,120,255' },
      draw(P, s) {
        const c = { stone: '#8E8E8E', light: '#ABABAB', dark: '#666666', slate: '#5E6670', slateL: '#76808C', moss: '#4E9A3C', mossL: '#6CBF55', gem: '#9B6BFF', gemL: '#D9C6FF', gemD: '#6A3FD0', rune: '#7FE8FF', spark: '#EDE3FF' };
        P.r(1, 21, 22, 3, c.stone); P.r(1, 21, 22, 1, c.light); P.r(1, 23, 22, 1, c.dark);
        P.r(3, 19, 18, 2, c.stone); P.r(3, 19, 18, 1, c.light);
        [4, 17].forEach(x => { P.r(x, 7, 3, 12, c.stone); P.r(x, 7, 1, 12, c.light); P.r(x + 2, 7, 1, 12, c.dark); });
        P.r(2, 6, 20, 1, c.slate); P.r(3, 5, 18, 1, c.slateL); P.r(5, 4, 14, 1, c.slate);
        P.r(7, 3, 10, 1, c.slateL); P.r(9, 2, 6, 1, c.slate); P.r(11, 1, 2, 1, c.slateL);
        P.r(9, 15, 6, 4, c.stone); P.r(9, 15, 6, 1, c.light); P.r(14, 16, 1, 3, c.dark);
        P.p(11, 17, s.frame ? c.rune : c.gem); P.p(12, 17, s.frame ? c.gem : c.rune);
        P.r(11, 8, 2, 1, c.gemL); P.r(10, 9, 4, 5, c.gem); P.r(11, 14, 2, 1, c.gemD);
        P.r(10, 9, 1, 4, c.gemL); P.r(13, 10, 1, 4, c.gemD);
        if (s.frame) { P.p(8, 10, c.spark); P.p(15, 12, c.spark); }
        else { P.p(9, 7, c.spark); P.p(15, 9, c.spark); }
        P.p(2, 20, c.moss); P.p(3, 20, c.mossL); P.p(19, 20, c.moss); P.p(21, 20, c.moss);
        P.p(4, 12, c.moss); P.p(4, 13, c.mossL); P.p(19, 9, c.moss); P.p(19, 10, c.moss);
        P.r(5, 6, 2, 1, c.moss); P.p(16, 5, c.mossL);
      }
    },

    campfire: {
      name: 'Campfire', blurb: 'crackling fire for cosy naps',
      kind: 'build', move: 'none',
      glow: { x: 8, y: 9, r: 11, rgb: '255,150,60' },
      draw(P, s) {
        const c = { log: '#6B4423', logL: '#A0703A', rock: '#7D7D7D', rockL: '#9C9C9C', f1: '#FFE27A', f2: '#FF9A2E', f3: '#FF5A1F' };
        P.r(1, 12, 2, 2, c.rock); P.p(1, 12, c.rockL); P.r(13, 12, 2, 2, c.rock); P.p(13, 12, c.rockL);
        P.r(3, 12, 10, 2, c.log); P.p(3, 12, c.logL); P.p(12, 12, c.logL); P.r(5, 13, 6, 1, '#4E301A');
        if (s.frame === 0) {
          P.r(5, 9, 6, 3, c.f3); P.r(6, 7, 4, 2, c.f2); P.r(7, 5, 2, 2, c.f2); P.p(8, 4, c.f1);
          P.r(7, 9, 2, 2, c.f1); P.p(4, 10, c.f3); P.p(11, 8, c.f2);
        } else {
          P.r(5, 9, 6, 3, c.f3); P.r(6, 8, 4, 1, c.f2); P.r(6, 6, 3, 2, c.f2); P.p(6, 5, c.f1);
          P.r(7, 9, 3, 2, c.f1); P.p(11, 10, c.f3); P.p(4, 7, c.f2);
        }
      }
    },

    lantern: {
      name: 'Lantern Post', blurb: 'warm light on a wooden post',
      kind: 'build', move: 'none', w: 16, h: 24, feet: 24,
      glow: { x: 12, y: 9, r: 10, rgb: '255,215,110' },
      draw(P, s) {
        const c = { stone: '#8E8E8E', light: '#ABABAB', wood: '#4A3424', woodL: '#6B4E36', iron: '#2E2E2E', glass: '#FFD86B', glassL: '#FFF0A0' };
        P.r(5, 22, 6, 2, c.stone); P.r(5, 22, 6, 1, c.light);
        P.r(7, 4, 2, 18, c.wood); P.r(7, 4, 1, 18, c.woodL);
        P.r(6, 3, 4, 1, c.wood);
        P.r(9, 5, 4, 1, c.wood); P.p(12, 6, c.iron);
        P.r(11, 7, 3, 5, c.iron); P.r(10, 7, 5, 1, c.iron);
        P.r(12, 8, 1, 3, s.frame ? c.glassL : c.glass);
        P.p(11, 9, c.glass); P.p(13, 9, c.glass);
      }
    }
  }
});
