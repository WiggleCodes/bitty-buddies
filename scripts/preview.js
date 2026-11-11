// Renders every item in every pack (all poses) to preview.png so you can eyeball art.
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const { drawItem, withDefaults } = require('../src/shared/pixel');
const packFiles = require('../src/packs');

const SCALE = 6, PAD = 6;
const poses = [
  { pose: 'idle', frame: 0, blink: false }, { pose: 'walk', frame: 0, blink: false },
  { pose: 'walk', frame: 1, blink: false }, { pose: 'sit', frame: 0, blink: false },
  { pose: 'sleep', frame: 0, blink: true }, { pose: 'idle', frame: 1, blink: false }
];

const rows = [];
for (const f of packFiles) {
  const pack = require(path.join('../src/packs', f));
  for (const item of Object.values(pack.items)) rows.push(withDefaults(item));
}
const cellW = 32 * SCALE + PAD, cellH = 32 * SCALE + PAD;
const png = new PNG({ width: cellW * poses.length + PAD, height: cellH * rows.length + PAD });
for (let i = 0; i < png.data.length; i += 4) png.data.set([200, 214, 230, 255], i);

function hex(c) { const n = parseInt(c.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }

rows.forEach((def, r) => {
  poses.forEach((st, k) => {
    const g = drawItem(def, st);
    const ox = PAD + k * cellW + (32 - def.w) * SCALE / 2, oy = PAD + r * cellH + (32 - def.h) * SCALE;
    g.forEach((row, y) => row.forEach((col, x) => {
      if (!col) return;
      const [R, G, B] = hex(col);
      for (let j = 0; j < SCALE; j++) for (let i = 0; i < SCALE; i++) {
        const idx = ((oy + y * SCALE + j) * png.width + ox + x * SCALE + i) * 4;
        png.data.set([R, G, B, 255], idx);
      }
    }));
  });
});
const out = process.argv[2] || 'preview.png';
fs.writeFileSync(out, PNG.sync.write(png));
console.log('wrote', out, rows.length, 'items');
