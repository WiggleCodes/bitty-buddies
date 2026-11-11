// Tiny pixel-art helpers shared by the app, the packs and the icon script.
// Works in the browser (window.BBPixel) and in Node (require).
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.BBPixel = api;
})(typeof self !== 'undefined' ? self : this, function () {
  function makeGrid(w, h) {
    return Array.from({ length: h }, () => Array(w).fill(null));
  }

  // P.r(x, y, w, h, colour) fills a rectangle; P.p(x, y, colour) sets one pixel.
  // A colour of null erases.
  function painter(grid) {
    const H = grid.length, W = grid[0].length;
    const r = (x, y, w, h, c) => {
      for (let j = y; j < y + h; j++)
        for (let i = x; i < x + w; i++)
          if (i >= 0 && i < W && j >= 0 && j < H) grid[j][i] = c;
    };
    return { r, p: (x, y, c) => r(x, y, 1, 1, c), w: W, h: H };
  }

  // Normalise an item definition so every item has size info.
  function withDefaults(item) {
    const w = item.w || 16, h = item.h || 16;
    return Object.assign({ kind: 'pet', move: 'walk', speed: 30, w, h, feet: h - 2 }, item);
  }

  function drawItem(item, state) {
    const def = withDefaults(item);
    const g = makeGrid(def.w, def.h);
    def.draw(painter(g), state);
    return g;
  }

  return { makeGrid, painter, withDefaults, drawItem };
});
