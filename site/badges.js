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
