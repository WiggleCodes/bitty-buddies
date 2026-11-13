// Fills the team cards with the live Discord profile (picture, name, @username, banner).
// The Bitty Admin server keeps a copy that refreshes whenever Wiggly signs in to the Admin Tool.
// If anything fails, the card keeps its pixel pup and the name already on the page.
(async () => {
  let data;
  try {
    const r = await fetch('https://bitty-admin.reece-feetenby.workers.dev/team');
    if (!r.ok) return;
    data = await r.json();
  } catch { return; }
  const m = (data.members || [])[0];
  const card = document.getElementById('wiggly');
  if (!m || !card) return;
  if (m.name) card.querySelectorAll('.member-name').forEach(el => { el.textContent = m.name; });
  if (m.username) { const h = card.querySelector('.member-handle'); h.textContent = '@' + m.username; h.hidden = false; }
  if (m.profile) card.querySelector('.member-profile').href = m.profile;
  const banner = card.querySelector('.member-banner');
  if (m.banner) banner.style.backgroundImage = `url("${m.banner}")`;
  else if (m.accent) banner.style.background = m.accent;
  if (m.avatar) {
    const img = card.querySelector('.member-avatar img');
    img.onload = () => { img.hidden = false; card.querySelector('.member-avatar').classList.add('photo'); };
    img.alt = `${m.name}'s Discord picture`;
    img.src = m.avatar;
  }
})();
