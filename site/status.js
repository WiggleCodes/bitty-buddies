// Live service status. Asks the Bitty Admin server about its services, and GitHub
// directly about downloads and updates. Nothing is sent about the visitor.
(() => {
  const SERVER = 'https://bitty-admin.reece-feetenby.workers.dev/status';
  const RELEASES = 'https://api.github.com/repos/WiggleCodes/bitty-buddies/releases/latest';
  const ROWS = [
    { id: 'website', name: 'Website', what: 'This site and the download page.' },
    { id: 'updates', name: 'Downloads and updates', what: 'The installer and the app’s automatic updates.' },
    { id: 'keys', name: 'Licence keys', what: 'Making and unlocking keys for paid packs.' },
    { id: 'revocations', name: 'Key revocation list', what: 'How the app learns about cancelled keys.' },
    { id: 'reports', name: 'Problem reports', what: '“Report a problem…” in the tray menu.' }
  ];
  const $ = id => document.getElementById(id);
  const list = $('list');
  const items = {};
  for (const r of ROWS) {
    const li = document.createElement('li');
    li.className = 'svc checking';
    li.innerHTML = '<span class="lamp" aria-hidden="true"></span><span class="svc-name"></span><span class="svc-what"></span><span class="svc-state">Checking…</span>';
    li.querySelector('.svc-name').textContent = r.name;
    li.querySelector('.svc-what').textContent = r.what;
    list.appendChild(li);
    items[r.id] = li;
  }
  const set = (id, ok) => {
    const li = items[id];
    li.className = 'svc ' + (ok === null ? 'unknown' : ok ? 'up' : 'down');
    li.querySelector('.svc-state').textContent = ok === null ? 'Can’t check' : ok ? 'Working' : 'Having problems';
  };
  const timeout = (p, ms) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error('timeout')), ms))]);

  async function run() {
    set('website', true);
    const [server, gh] = await Promise.allSettled([
      timeout(fetch(SERVER, { cache: 'no-store' }).then(r => r.ok ? r.json() : Promise.reject(r.status)), 10000),
      timeout(fetch(RELEASES, { headers: { Accept: 'application/vnd.github+json' } }), 10000)
    ]);
    if (server.status === 'fulfilled') {
      const by = Object.fromEntries((server.value.services || []).map(s => [s.id, s.ok]));
      for (const id of ['keys', 'revocations', 'reports']) set(id, id in by ? by[id] : null);
    } else for (const id of ['keys', 'revocations', 'reports']) set(id, false);
    if (gh.status === 'fulfilled') {
      const r = gh.value;
      if (r.status === 403 || r.status === 429) set('updates', null);   // GitHub's per-visitor limit, not an outage
      else set('updates', r.ok && ((await r.json()).assets || []).some(a => /\.exe$/i.test(a.name)));
    } else set('updates', false);

    const states = Object.values(items).map(li => li.className);
    const down = states.filter(c => c.includes('down')).length;
    const banner = $('banner');
    banner.className = 'status-banner ' + (down ? 'down' : 'up');
    $('banner-text').textContent = down === 0 ? 'Everything is working.' : down === 1 ? 'One service is having problems.' : `${down} services are having problems.`;
    $('checked').textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  run();
  setInterval(() => { if (document.visibilityState === 'visible') run(); }, 60000);
})();
