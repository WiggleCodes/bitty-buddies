// Renders the README banner (.github/banner.png) from the real pack sprites.
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const { drawItem, withDefaults } = require('../src/shared/pixel');

const W = 1280, H = 320, S = 5, GROUND = 276;
const packs = {};
for (const f of require('../src/packs')) { const p = require(`../src/packs/${f}`); packs[p.id] = p; }

const png = new PNG({ width: W, height: H });
const hex = c => { const n = parseInt(c.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
function put(x, y, [r, g, b], a = 1) {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 4, d = png.data;
  d[i] = d[i] * (1 - a) + r * a; d[i + 1] = d[i + 1] * (1 - a) + g * a; d[i + 2] = d[i + 2] * (1 - a) + b * a; d[i + 3] = 255;
}
function rect(x, y, w, h, c, a = 1) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) put(x + i, y + j, c, a); }

// sky (stepped gradient for a pixel look)
for (let y = 0; y < GROUND; y += 8) {
  const t = y / GROUND;
  rect(0, y, W, 8, [Math.round(118 + 70 * t), Math.round(190 + 40 * t), Math.round(240 + 10 * t)]);
}
// pixel clouds
[[90, 40, 7], [330, 120, 5], [1010, 30, 8], [1150, 120, 5], [760, 140, 4]].forEach(([x, y, n]) => {
  const c = [255, 255, 255];
  rect(x, y + 8, n * 16, 16, c, 0.9); rect(x + 16, y, (n - 2) * 16, 8, c, 0.9); rect(x + 8, y + 24, (n - 1) * 16, 8, c, 0.9);
});
// ground
rect(0, GROUND, W, 8, [108, 190, 78]); rect(0, GROUND + 8, W, 8, [84, 160, 60]);
for (let y = GROUND + 16; y < H; y += 8)
  for (let x = 0; x < W; x += 8) {
    const n = (x * 7 + y * 13) % 5;
    rect(x, y, 8, 8, n === 0 ? [110, 76, 50] : n === 1 ? [138, 98, 66] : [124, 87, 58]);
  }
for (let x = 4; x < W; x += 24) rect(x + ((x * 3) % 11), GROUND - 4, 4, 4, [108, 190, 78]); // grass tufts

// title in a chunky 5x7 pixel font
const FONT = {
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000']
};
function text(str, cx, y, px, fill, shadow) {
  const w = str.length * 6 * px - px;
  const x0 = Math.round(cx - w / 2);
  [...str].forEach((ch, k) => FONT[ch].forEach((row, j) => [...row].forEach((b, i) => {
    if (b !== '1') return;
    const x = x0 + (k * 6 + i) * px, yy = y + j * px;
    rect(x + px / 2, yy + px / 2, px, px, shadow);
    rect(x, yy, px, px, fill);
  })));
}
text('BITTY BUDDIES', W / 2, 34, 10, [255, 255, 255], [46, 52, 92]);

// the cast
const cast = [
  ['builds/lantern'], ['critters/pip', 'walk', 0, 1], ['critters/kit', 'sit', 0, 1], ['critters/pup', 'idle', 1, 1],
  ['fantasy/wizard', 'idle', 0, 1], ['fantasy/knight', 'walk', 0, 1], ['builds/shrine'],
  ['fantasy/dwarf', 'walk', 1, -1], ['fantasy/ranger', 'idle', 0, -1], ['builds/campfire'],
  ['critters/bun', 'idle', 0, -1], ['critters/mossling', 'idle', 0, -1], ['critters/ember', 'idle', 1, -1]
].map(([id, pose = 'idle', frame = 0, dir = 1]) => {
  const [p, k] = id.split('/');
  return { def: withDefaults(packs[p].items[k]), st: { pose, frame, blink: false }, dir };
});
const total = cast.reduce((s, c) => s + c.def.w * S, 0);
const gap = (W - 40 - total) / (cast.length - 1);
let x = 20;
for (const c of cast) {
  const w = c.def.w * S, top = GROUND - c.def.feet * S;
  if (c.def.glow) {                                    // soft light around builds
    const g = c.def.glow, gx = x + g.x * S, gy = top + g.y * S, r = g.r * S;
    const rgb = g.rgb.split(',').map(Number);
    for (let yy = gy - r; yy < gy + r; yy++) for (let xx = gx - r; xx < gx + r; xx++) {
      const d = Math.hypot(xx - gx, yy - gy) / r;
      if (d < 1 && yy < GROUND) put(xx, yy, rgb, 0.35 * (1 - d));
    }
  } else {                                             // shadow under pets
    for (let i = -w * 0.32; i < w * 0.32; i++) rect(x + w / 2 + i, GROUND - 2, 1, 4, [0, 0, 0], 0.18);
  }
  let grid = drawItem(c.def, c.st);
  if (c.dir < 0) grid = grid.map(r => r.slice().reverse());
  grid.forEach((row, j) => row.forEach((col, i) => { if (col) rect(x + i * S, top + j * S, S, S, hex(col)); }));
  x += w + gap;
}

const out = path.join(__dirname, '..', '.github', 'banner.png');
fs.writeFileSync(out, PNG.sync.write(png));
console.log('wrote', out);
