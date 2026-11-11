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
      }
    }
  };
})());
