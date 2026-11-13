// The site's header (tabs + live status light) and footer, shared by every page.
// To add a page: make the .html file with <body data-page="yourid">, then add one line to TABS.
(() => {
  const DISCORD = 'https://discord.gg/aCHyjABJG7';
  const KOFI = 'https://ko-fi.com/bittybuddies';
  const DOWNLOAD = 'https://github.com/WiggleCodes/bitty-buddies/releases/latest/download/Bitty-Buddies-Setup.exe';
  const STATUS_API = 'https://bitty-admin.reece-feetenby.workers.dev/status';

  const TABS = [
    { id: 'home', label: 'Home', href: './' },
    { id: 'packs', label: 'Packs', href: 'packs.html' },
    { id: 'team', label: 'Team', href: 'team.html' },
    { id: 'status', label: 'Status', href: 'status.html' }
    // { id: 'faq', label: 'FAQ', href: 'faq.html' },
  ];
  const ELSEWHERE = [
    { label: 'Discord', href: DISCORD },
    { label: 'Ko-fi', href: KOFI }
  ];

  const page = document.body.dataset.page || '';
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const tab = t => `<a href="${t.href}"${t.id === page ? ' aria-current="page"' : ''}>${esc(t.label)}</a>`;
  const out = l => `<a href="${l.href}" rel="noopener">${esc(l.label)}</a>`;

  // ---------- header ----------
  const head = document.getElementById('site-header');
  if (head) {
    head.className = 'site-header';
    head.innerHTML = `
      <div class="bar">
        <a class="brand" href="./"><img src="icon.png" alt="" width="28" height="28">Bitty Buddies</a>
        <nav class="tabs" aria-label="Main">${TABS.map(tab).join('')}${ELSEWHERE.slice(0, 1).map(out).join('')}</nav>
        <a class="status-pill checking" href="status.html" title="Live service status">
          <span class="lamp" aria-hidden="true"></span><span class="status-pill-text">Checking…</span>
        </a>
        <a class="btn grass small head-download" href="${DOWNLOAD}" data-download>Download</a>
        <button class="menu-btn" type="button" aria-expanded="false" aria-controls="menu-panel">Menu</button>
      </div>
      <nav class="menu-panel" id="menu-panel" aria-label="Main" hidden>
        ${TABS.map(tab).join('')}${ELSEWHERE.map(out).join('')}
        <a class="btn grass" href="${DOWNLOAD}" data-download>Download for Windows</a>
      </nav>`;
    const btn = head.querySelector('.menu-btn');
    const panel = head.querySelector('.menu-panel');
    const close = () => { panel.hidden = true; btn.setAttribute('aria-expanded', 'false'); };
    btn.addEventListener('click', () => { const open = panel.hidden; panel.hidden = !open; btn.setAttribute('aria-expanded', String(open)); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden) { close(); btn.focus(); } });
    matchMedia('(min-width: 861px)').addEventListener('change', e => { if (e.matches) close(); });
  }

  // ---------- live status light ----------
  // One quick check per visit (kept for two minutes across pages) so browsing doesn't hammer the server.
  const pill = head && head.querySelector('.status-pill');
  const show = st => {
    if (!pill) return;
    const bad = (st.services || []).filter(s => !s.ok).length;
    pill.className = 'status-pill ' + (st.unreachable ? 'down' : bad ? 'down' : 'up');
    pill.querySelector('.status-pill-text').textContent = st.unreachable ? 'Status unknown' : bad ? 'Some issues' : 'All systems go';
  };
  if (pill) {
    let cached = null;
    try { cached = JSON.parse(sessionStorage.getItem('bb-status') || 'null'); } catch { /* storage off */ }
    if (cached && Date.now() - cached.at < 120000) show(cached.st);
    else fetch(STATUS_API, { cache: 'no-store' })
      .then(r => r.ok ? r.json() : Promise.reject())
      .catch(() => ({ unreachable: true }))
      .then(st => { show(st); try { sessionStorage.setItem('bb-status', JSON.stringify({ at: Date.now(), st })); } catch { /* fine */ } });
  }

  // ---------- footer ----------
  // The header script runs at the top of the page, before the footer exists, so wait for it.
  const footer = () => {
    const foot = document.getElementById('site-footer');
    if (!foot || foot.dataset.done) return;
    foot.dataset.done = '1';
    foot.classList.add('bedrock', 'site-footer');
    foot.innerHTML = `
      <div class="wrap foot-grid">
        <div class="foot-about">
          <a class="brand" href="./"><img src="icon.png" alt="" width="24" height="24">Bitty Buddies</a>
          <p>Tiny pixel pets for your Windows desktop. Free to download, with extra packs to unlock.</p>
        </div>
        <nav class="foot-col" aria-label="Pages"><h2>Pages</h2>${TABS.map(tab).join('')}</nav>
        <nav class="foot-col" aria-label="Community"><h2>Community</h2>${ELSEWHERE.map(out).join('')}</nav>
        <div class="foot-legal">
          <p>© 2026 WiggleCodes. All rights reserved. The code is public to read, not to copy or re-upload.</p>
          <p>Privacy: the app sends an anonymous "+1" once a day so we can count users. No name, ID or files are sent, and you can turn it off in the tray menu. If you use “Report a problem…”, we only get what you type and, if you leave it ticked, basic app details like the version and your Windows version.</p>
        </div>
      </div>`;
  };
  footer();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', footer);
})();
