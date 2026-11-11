// Fantasy Folk pack — original little adventurers.
(function (root, pack) {
  if (typeof module === 'object' && module.exports) module.exports = pack;
  else (root.BBPacks = root.BBPacks || []).push(pack);
})(typeof self !== 'undefined' ? self : this, (function () {
  const DARK = '#1B1B1B';

  // Shared blocky person. Returns layout numbers so each character can add gear.
  function humanoid(P, s, o) {
    const low = s.pose === 'sit' || s.pose === 'sleep';
    const dy = (o.stout ? 1 : 0) + (low ? 2 : 0);
    const hy = 2 + dy, by = hy + 5;
    const bx = o.stout ? 5 : 6, bw = o.stout ? 7 : 5;
    const bottom = low ? 11 : 10;
    const stride = s.pose === 'walk' && s.frame === 0;

    if (low) { P.r(bx, 12, 7, 1, o.legs); P.r(bx + 6, 12, 2, 2, o.boots); }
    else if (stride) { P.r(5, 11, 2, 2, o.legs); P.r(9, 11, 2, 2, o.legs); P.r(4, 13, 3, 1, o.boots); P.r(9, 13, 3, 1, o.boots); }
    else { P.r(6, 11, 2, 2, o.legs); P.r(8, 11, 2, 2, o.legs); P.r(6, 13, 2, 1, o.boots); P.r(8, 13, 3, 1, o.boots); }

    P.r(bx, by, bw, bottom - by + 1, o.top);
    P.r(bx, by, 1, bottom - by + 1, o.topShade);
    if (o.belt) P.r(bx, bottom, bw, 1, o.belt);

    P.r(6, hy, 5, 5, o.hair);
    P.r(8, hy + 1, 3, 4, o.skin);
    const closed = s.blink || s.pose === 'sleep';
    P.p(9, hy + 2, closed ? o.skinShade : DARK);

    const ax = stride ? 9 : 8;
    P.r(ax, by, 1, 3, o.topShade); P.p(ax, by + 3, o.skin);
    return { hy, by, bx, bw, low, ax };
  }

  return {
    id: 'fantasy',
    name: 'Fantasy Folk',
    licensed: true, // needs a licence key that covers 'fantasy'
    items: {
      wizard: {
        name: 'Wizard', blurb: 'starry-robed spell slinger', move: 'walk', speed: 26,
        draw(P, s) {
          const c = { robe: '#5B3FA8', shade: '#43307E', star: '#FFE066', skin: '#F0C8A0', skinS: '#C99C74', hair: '#E8E8E8', wood: '#7A4E2A', orb1: '#7FE8FF', orb2: '#C9F7FF' };
          const L = humanoid(P, s, { skin: c.skin, skinShade: c.skinS, hair: c.hair, top: c.robe, topShade: c.shade, legs: c.robe, boots: '#4A3020' });
          P.r(5, L.hy, 7, 1, c.robe);                       // hat brim
          P.r(6, L.hy - 1, 4, 1, c.robe); P.r(6, L.hy - 2, 2, 1, c.shade); P.p(5, L.hy - 2, c.shade);
          P.p(8, L.hy - 1, c.star);
          P.r(8, L.hy + 4, 3, 2, c.hair); P.p(9, L.hy + 6, c.hair); // beard
          P.p(L.bx + 2, L.by + 2, c.star); P.p(L.bx + 4, L.by + 1, c.star);
          P.r(11, L.hy + 1, 1, 13 - L.hy, c.wood);           // staff
          P.p(11, L.hy, s.frame ? c.orb2 : c.orb1);
          P.p(12, L.hy, c.orb1); P.p(11, L.hy - 1, s.frame ? c.orb1 : c.orb2);
        }
      },

      knight: {
        name: 'Knight', blurb: 'plumed armour, heart of gold', move: 'walk', speed: 30,
        draw(P, s) {
          const c = { steel: '#B8C0CC', steelS: '#8A93A3', dark: '#3E4450', tabard: '#2F5DB8', plume: '#D6392F', gold: '#E7B93C', shield: '#B8322A' };
          const L = humanoid(P, s, { skin: c.steel, skinShade: c.steelS, hair: c.steel, top: c.tabard, topShade: c.steelS, legs: c.steelS, boots: c.dark, belt: c.gold });
          P.r(8, L.hy + 2, 3, 1, c.dark);                    // visor slit
          P.r(6, L.hy - 1, 3, 1, c.plume); P.p(5, L.hy - 2, c.plume); P.p(6, L.hy - 2, c.plume);
          P.r(4, L.by, 2, 3, c.shield); P.p(4, L.by + 1, c.gold); // shield on back
          P.r(L.ax + 1, L.by + 2, 1, 3, c.steel);           // sword
          P.p(L.ax + 1, L.by + 1, c.gold);
        }
      },

      dwarf: {
        name: 'Dwarf', blurb: 'stout miner with a big beard', move: 'walk', speed: 24,
        draw(P, s) {
          const c = { skin: '#E8B48C', skinS: '#B98660', hair: '#C8642A', beard: '#D9772F', tunic: '#4C7A3A', tunicS: '#3A5E2C', belt: '#5A3A1E', buckle: '#E7B93C', iron: '#7D8590', wood: '#7A4E2A', steel: '#B8C0CC' };
          const L = humanoid(P, s, { stout: true, skin: c.skin, skinShade: c.skinS, hair: c.hair, top: c.tunic, topShade: c.tunicS, legs: '#5B4A3A', boots: '#3A2A1C', belt: c.belt });
          P.p(9, L.by + (L.low ? 2 : 2), c.buckle);
          P.r(6, L.hy, 5, 1, c.iron); P.r(7, L.hy - 1, 3, 1, c.iron); // iron cap
          P.r(8, L.hy + 3, 4, 3, c.beard); P.p(9, L.hy + 6, c.beard); P.p(10, L.hy + 6, c.beard);
          P.r(4, L.hy + 2, 1, 6, c.wood);                    // pickaxe on back
          P.r(3, L.hy + 1, 3, 1, c.steel); P.p(2, L.hy + 2, c.steel);
        }
      },

      ranger: {
        name: 'Ranger', blurb: 'hooded archer of the woods', move: 'walk', speed: 34,
        draw(P, s) {
          const c = { hood: '#3E7A3A', hoodS: '#2E5C2B', skin: '#E8C09A', skinS: '#B98E68', hair: '#6B4423', tunic: '#5E6B2E', leather: '#7A4E2A', wood: '#8B5A2B', string: '#E8E2D0', feather: '#E8E2D0', red: '#C8392F' };
          const L = humanoid(P, s, { skin: c.skin, skinShade: c.skinS, hair: c.hood, top: c.tunic, topShade: c.hoodS, legs: '#6B5236', boots: '#3E2A1A', belt: c.leather });
          P.p(5, L.hy + 1, c.hood); P.p(5, L.hy + 2, c.hoodS);   // hood point
          P.p(8, L.hy + 1, c.hair);
          P.r(4, L.by - 1, 2, 4, c.leather);                 // quiver
          P.p(4, L.by - 2, c.feather); P.p(5, L.by - 2, c.red);
          P.r(11, L.by - 1, 1, 4, c.wood);                   // bow
          P.p(10, L.by - 2, c.wood); P.p(10, L.by + 3, c.wood);
          P.r(10, L.by - 1, 1, 4, c.string);
        }
      },

      // ---------- fantasy builds ----------
      burrow: {
        name: 'Burrow Cottage', blurb: 'a cosy home dug into a grassy hill',
        kind: 'build', move: 'none', w: 24, h: 20, feet: 20,
        glow: { x: 12, y: 13, r: 9, rgb: '255,210,120' },
        draw(P, s) {
          const c = { grass: '#5DAA45', light: '#7CC45E', dark: '#4A8E37', wood: '#8B5A2B', woodD: '#6B4423', gold: '#E7B93C', glass: '#FFD86B', glassL: '#FFF0A0', stone: '#8E8E8E', stoneL: '#ABABAB', smoke: '#E2E2E2', pink: '#F07FB2', yellow: '#FFE066', path: '#B8A88A' };
          P.r(6, 6, 12, 1, c.light); P.r(4, 7, 16, 1, c.light); P.r(3, 8, 18, 1, c.grass); P.r(2, 9, 20, 11, c.grass);
          P.r(19, 10, 3, 10, c.dark); P.r(2, 18, 20, 2, c.dark);
          P.r(17, 1, 2, 6, c.stone); P.r(17, 1, 1, 6, c.stoneL);           // chimney
          if (s.frame) { P.p(18, 0, c.smoke); P.p(19, 0, c.smoke); } else { P.p(17, 0, c.smoke); P.p(16, 0, c.smoke); }
          for (const x of [5, 15]) {                                      // round windows
            P.r(x + 1, 11, 2, 1, c.wood); P.r(x, 12, 4, 2, c.wood); P.r(x + 1, 14, 2, 1, c.wood);
            P.r(x + 1, 12, 2, 2, s.frame ? c.glassL : c.glass);
          }
          P.r(10, 13, 4, 7, c.wood); P.r(11, 12, 2, 1, c.wood);             // arched door
          P.r(11, 14, 1, 5, c.woodD); P.p(13, 16, c.gold);
          P.r(9, 19, 6, 1, c.path);
          P.p(5, 9, c.pink); P.p(8, 7, c.yellow); P.p(14, 7, c.pink); P.p(20, 9, c.yellow); P.p(3, 11, c.light);
        }
      },

      tower: {
        name: "Wizard's Tower", blurb: 'starry stone tower with a glowing window',
        kind: 'build', move: 'none', w: 16, h: 32, feet: 32,
        glow: { x: 8, y: 15, r: 9, rgb: '170,120,255' },
        draw(P, s) {
          const c = { stone: '#9A9A9A', light: '#B8B8B8', dark: '#6E6E6E', roof: '#5B3FA8', roofD: '#43307E', star: '#FFE066', glass: '#C9A8FF', glassL: '#EBDCFF', wood: '#6B4423', pole: '#5A3A1E', flag: '#E7B93C' };
          P.r(3, 26, 10, 6, c.stone); P.r(3, 26, 10, 1, c.light); P.r(12, 27, 1, 5, c.dark);
          P.r(4, 10, 8, 16, c.stone); P.r(4, 10, 1, 16, c.light); P.r(11, 10, 1, 16, c.dark);
          [[6, 12], [9, 15], [5, 18], [8, 21], [10, 24], [6, 28], [10, 29]].forEach(([x, y]) => P.p(x, y, c.dark));
          P.r(7, 27, 2, 5, c.wood); P.p(7, 26, c.dark); P.p(8, 26, c.dark);
          P.r(7, 14, 2, 3, s.frame ? c.glassL : c.glass); P.r(8, 20, 1, 2, c.glass);
          const roof = [[1, 7, 2], [2, 7, 2], [3, 6, 4], [4, 6, 4], [5, 5, 6], [6, 5, 6], [7, 4, 8], [8, 4, 8], [9, 3, 10]];
          for (const [y, x, w] of roof) { P.r(x, y, w, 1, c.roof); P.p(x + w - 1, y, c.roofD); }
          P.p(6, 7, c.star); P.p(9, 5, c.star); P.p(5, 8, c.star);
          P.p(7, 0, c.pole);
          if (s.frame) P.r(8, 0, 3, 1, c.flag); else { P.r(8, 0, 2, 1, c.flag); P.p(10, 1, c.flag); }
        }
      },

      forge: {
        name: 'Dwarf Forge', blurb: 'roaring furnace, anvil and hammer',
        kind: 'build', move: 'none', w: 24, h: 18, feet: 18,
        glow: { x: 6, y: 13, r: 10, rgb: '255,140,50' },
        draw(P, s) {
          const c = { stone: '#7D7D7D', light: '#9C9C9C', dark: '#5E5E5E', mouth: '#2A2A2A', f1: '#FFE27A', f2: '#FF9A2E', f3: '#FF5A1F', iron: '#3A3D44', steel: '#8A93A3', steelL: '#B8C0CC', wood: '#7A4E2A', smoke: '#CFCFCF', spark: '#FFD84A' };
          P.r(4, 0, 4, 6, c.dark); P.r(4, 0, 4, 1, c.stone);               // chimney
          if (s.frame) P.p(6, 0, c.smoke); else P.p(5, 0, c.smoke);
          P.r(1, 6, 11, 12, c.stone); P.r(1, 6, 11, 1, c.light); P.r(11, 7, 1, 11, c.dark);
          [[3, 8], [8, 9], [2, 16], [9, 17]].forEach(([x, y]) => P.p(x, y, c.dark));
          P.r(3, 11, 6, 5, c.mouth); P.r(4, 10, 4, 1, c.mouth);
          P.r(3, 14, 6, 2, c.f3);
          if (s.frame) { P.r(4, 13, 4, 1, c.f2); P.r(5, 12, 2, 1, c.f1); }
          else { P.r(3, 13, 5, 1, c.f2); P.p(6, 12, c.f1); P.p(4, 12, c.f2); }
          P.r(15, 15, 4, 3, c.iron); P.r(16, 13, 2, 2, c.iron);            // anvil
          P.r(13, 11, 9, 2, c.steel); P.r(13, 11, 9, 1, c.steelL); P.p(12, 11, c.steel);
          P.r(22, 12, 1, 6, c.wood); P.r(21, 10, 3, 2, c.steel);           // hammer
          if (s.frame) { P.p(14, 9, c.spark); P.p(18, 8, c.spark); } else { P.p(16, 8, c.spark); P.p(20, 9, c.spark); }
        }
      },

      treehouse: {
        name: 'Treehouse', blurb: 'a little cabin up in the leaves',
        kind: 'build', move: 'none', w: 24, h: 32, feet: 32,
        glow: { x: 10, y: 10, r: 7, rgb: '255,215,110' },
        draw(P, s) {
          const c = { trunk: '#6B4423', trunkL: '#8B5A2B', leaf: '#4E9A3C', leafL: '#6CBE4E', leafD: '#3C7A2D', plank: '#A0703A', plankD: '#7A5228', wall: '#C28A50', roof: '#B8322A', roofD: '#8E2620', glass: '#FFD86B', glassL: '#FFF0A0', door: '#5A3A1E' };
          P.r(10, 14, 4, 18, c.trunk); P.r(10, 14, 1, 18, c.trunkL); P.r(8, 30, 8, 2, c.trunk);
          P.r(8, 0, 8, 1, c.leaf); P.r(5, 1, 14, 1, c.leaf); P.r(3, 2, 18, 4, c.leaf); P.r(5, 6, 14, 1, c.leaf);
          [[6, 2], [12, 1], [17, 3], [4, 4], [9, 3], [15, 5]].forEach(([x, y]) => P.p(x, y, c.leafL));
          [[7, 5], [14, 2], [19, 4], [11, 4]].forEach(([x, y]) => P.p(x, y, c.leafD));
          P.r(7, 6, 10, 1, c.roof); P.r(6, 7, 12, 1, c.roofD);             // roof
          P.r(7, 8, 10, 4, c.wall);
          P.r(9, 9, 2, 2, s.frame ? c.glassL : c.glass);
          P.r(13, 9, 2, 3, c.door);
          P.r(5, 12, 14, 1, c.plank); P.r(5, 13, 14, 1, c.plankD);           // platform
          P.r(16, 14, 1, 18, c.plankD); P.r(18, 14, 1, 18, c.plankD);       // ladder
          for (let y = 15; y < 31; y += 3) P.r(16, y, 3, 1, c.plank);
        }
      }
    }
  };
})());
