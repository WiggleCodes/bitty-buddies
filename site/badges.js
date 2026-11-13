// Draws a member badge: emoji + name on the badge's colour, with readable text.
window.BBBadge = (badge, opts = {}) => {
  const el = document.createElement('span');
  el.className = 'badge-chip' + (opts.big ? ' big' : '');
  const hex = /^#[0-9a-f]{6}$/i.test(badge.color || '') ? badge.color : '#2E345C';
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  el.style.background = hex;
  el.style.color = (r * 299 + g * 587 + b * 114) / 1000 > 150 ? '#2E345C' : '#fff';
  el.textContent = `${badge.emoji || '🏅'} ${badge.label}`;
  if (badge.desc) el.title = badge.desc;
  return el;
};

// Profile pictures. Fills `box` with the Discord picture, or a chosen pixel buddy on a colour,
// or (if nothing's chosen) a critter picked from the username so it never changes.
(() => {
  const packs = () => Object.fromEntries((window.BBPacks || []).map(p => [p.id, p]));
  function petCanvas(id) {
    const [pack, key] = String(id || '').split('/');
    const item = (packs()[pack] || { items: {} }).items[key];
    if (!item || !window.BBPixel) return null;
    const grid = BBPixel.drawItem(BBPixel.withDefaults(item), { pose: 'idle', frame: 0, blink: false });
    const c = document.createElement('canvas'); c.width = grid[0].length; c.height = grid.length;
    const x = c.getContext('2d');
    grid.forEach((row, j) => row.forEach((col, i) => { if (col) { x.fillStyle = col; x.fillRect(i, j, 1, 1); } }));
    return c;
  }
  function fallbackPet(name) {
    const items = (packs().critters || { items: {} }).items;
    const keys = Object.keys(items).filter(k => (items[k].kind || 'pet') === 'pet');
    let h = 0; for (const ch of String(name || 'buddy')) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return keys.length ? `critters/${keys[h % keys.length]}` : null;
  }
  // m: { avatar, pet, bg, username }
  window.BBAvatar = (box, m) => {
    box.textContent = '';
    box.classList.remove('photo', 'chosen');
    box.style.background = '';
    if (m.avatar) {
      const img = document.createElement('img'); img.alt = ''; img.loading = 'lazy';
      img.onerror = () => window.BBAvatar(box, { ...m, avatar: null });
      img.src = m.avatar; box.appendChild(img); box.classList.add('photo');
      return;
    }
    const c = petCanvas(m.pet) || petCanvas(fallbackPet(m.username));
    if (m.pet && m.bg) { box.style.background = m.bg; box.classList.add('chosen'); }
    if (c) box.appendChild(c);
  };
  window.BBPetCanvas = petCanvas;
})();
