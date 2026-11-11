// Generates the app icon and tray icons from the Pup sprite.
//   build/icon.png            1024x1024 app icon (electron-builder makes .ico / .icns from it)
//   assets/tray.png / @2x     Windows tray icon
//   assets/trayTemplate*.png  macOS menu-bar icon (black silhouette, auto-tinted)
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const { drawItem } = require('../src/shared/pixel');
const critters = require('../src/packs/critters');

const root = path.join(__dirname, '..');
const grid = drawItem(critters.items.pup, { pose: 'idle', frame: 0, blink: false });
const hex = c => { const n = parseInt(c.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };

function render(size, { bg, template, pad }) {
  const png = new PNG({ width: size, height: size });
  png.data.fill(0);
  const radius = size * 0.22;
  if (bg) {
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const dx = Math.max(radius - x, 0, x - (size - 1 - radius));
      const dy = Math.max(radius - y, 0, y - (size - 1 - radius));
      if (dx * dx + dy * dy > radius * radius) continue;
      const grass = y > size * 0.74;
      const col = grass ? (y < size * 0.78 ? [94, 170, 70] : [121, 85, 58]) : [135 - y / size * 40, 196 - y / size * 40, 240];
      png.data.set([...col.map(Math.round), 255], (y * size + x) * 4);
    }
  }
  const px = Math.floor((size - pad * 2) / 16);
  const ox = Math.floor((size - px * 16) / 2);
  const oy = bg ? Math.round(size * 0.76 - 14 * px) : Math.floor((size - px * 16) / 2) + px;
  grid.forEach((row, y) => row.forEach((c, x) => {
    if (!c) return;
    const rgb = template ? [0, 0, 0] : hex(c);
    for (let j = 0; j < px; j++) for (let i = 0; i < px; i++) {
      const X = ox + x * px + i, Y = oy + y * px + j;
      if (X >= 0 && Y >= 0 && X < size && Y < size) png.data.set([...rgb, 255], (Y * size + X) * 4);
    }
  }));
  return PNG.sync.write(png);
}

fs.mkdirSync(path.join(root, 'build'), { recursive: true });
fs.mkdirSync(path.join(root, 'assets'), { recursive: true });
fs.writeFileSync(path.join(root, 'build', 'icon.png'), render(1024, { bg: true, pad: 120 }));
fs.writeFileSync(path.join(root, 'assets', 'tray.png'), render(16, { pad: 0 }));
fs.writeFileSync(path.join(root, 'assets', 'tray@2x.png'), render(32, { pad: 0 }));
fs.writeFileSync(path.join(root, 'assets', 'trayTemplate.png'), render(16, { template: true, pad: 0 }));
fs.writeFileSync(path.join(root, 'assets', 'trayTemplate@2x.png'), render(32, { template: true, pad: 0 }));
console.log('Icons written.');
