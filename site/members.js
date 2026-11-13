// Members page: a grid of everyone who's signed up (and not hidden), with badges. Signed-in members only.
(() => {
  const API = 'https://bitty-admin.reece-feetenby.workers.dev';
  const $ = id => document.getElementById(id);
  let token = null;
  try { token = localStorage.getItem('bb-account'); } catch { /* none */ }
  let all = [], badges = [], filter = null;
  const PX = window.BBPixel, PETS = ((window.BBPacks || []).find(p => p.id === 'critters') || { items: {} }).items;
  const petKeys = Object.keys(PETS).filter(k => (PETS[k].kind || 'pet') === 'pet');

  // People without a Discord picture get a pixel critter, picked from their name so it never changes.
  function critter(name) {
    let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    const item = PETS[petKeys[h % petKeys.length]];
    const grid = PX.drawItem(PX.withDefaults(item), { pose: 'idle', frame: 0, blink: false });
    const c = document.createElement('canvas'); c.width = grid[0].length; c.height = grid.length;
    const x = c.getContext('2d');
    grid.forEach((row, j) => row.forEach((col, i) => { if (col) { x.fillStyle = col; x.fillRect(i, j, 1, 1); } }));
    return c;
  }

  const say = t => { $('msg').textContent = t; $('msg').hidden = !t; };

  function draw() {
    const q = $('m-search').value.trim().toLowerCase();
    const shown = all.filter(m => (!filter || m.badges.includes(filter)) && (!q || `${m.name} ${m.username} ${m.discord || ''}`.toLowerCase().includes(q)));
    $('m-count').textContent = `${shown.length} member${shown.length === 1 ? '' : 's'}` + (shown.length !== all.length ? ` of ${all.length}` : '');
    const grid = $('m-grid');
    grid.textContent = '';
    for (const m of shown) {
      const li = document.createElement('li');
      li.className = 'member-tile';
      const av = document.createElement('div');
      av.className = 'member-pic';
      if (m.avatar) { const img = document.createElement('img'); img.src = m.avatar; img.alt = ''; img.loading = 'lazy'; img.onerror = () => { img.replaceWith(critter(m.username)); }; av.appendChild(img); }
      else av.appendChild(critter(m.username));
      const name = document.createElement('strong'); name.className = 'member-tile-name'; name.textContent = m.name;
      const handle = document.createElement('span'); handle.className = 'member-tile-handle'; handle.textContent = '@' + m.username;
      const chips = document.createElement('div'); chips.className = 'member-badges';
      for (const id of m.badges) { const b = badges.find(x => x.id === id); if (b) chips.appendChild(BBBadge(b)); }
      const joined = document.createElement('span'); joined.className = 'member-tile-joined';
      joined.textContent = m.joined ? `Joined ${new Date(m.joined).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}` : '';
      li.append(av, name, handle, chips, joined);
      grid.appendChild(li);
    }
    if (!shown.length) { const li = document.createElement('li'); li.className = 'member-empty'; li.textContent = 'No members match.'; grid.appendChild(li); }
  }

  function setup() {
    const f = $('m-filter');
    const used = badges.filter(b => all.some(m => m.badges.includes(b.id)));
    const allBtn = document.createElement('button');
    allBtn.type = 'button'; allBtn.textContent = 'Everyone'; allBtn.setAttribute('aria-pressed', 'true');
    f.appendChild(allBtn);
    const buttons = [allBtn];
    allBtn.onclick = () => { filter = null; buttons.forEach(x => x.setAttribute('aria-pressed', String(x === allBtn))); draw(); };
    for (const b of used) {
      const btn = document.createElement('button'); btn.type = 'button'; btn.setAttribute('aria-pressed', 'false');
      btn.appendChild(BBBadge(b));
      btn.onclick = () => { filter = b.id; buttons.forEach(x => x.setAttribute('aria-pressed', String(x === btn))); draw(); };
      f.appendChild(btn); buttons.push(btn);
    }
    const legend = $('m-legend');
    for (const b of badges) { const li = document.createElement('li'); li.appendChild(BBBadge(b)); li.append(` ${b.desc || ''}`); legend.appendChild(li); }
    $('m-search').addEventListener('input', draw);
  }

  if (!token) { $('gate').hidden = false; return; }
  fetch(API + '/account/members', { headers: { authorization: `Bearer ${token}` } })
    .then(async r => { const d = await r.json().catch(() => ({})); if (r.status === 401) throw Object.assign(new Error(), { gate: true }); if (!r.ok) throw new Error(d.error || 'Couldn’t load members.'); return d; })
    .then(d => { all = d.members || []; badges = d.badges || []; $('members').hidden = false; setup(); draw(); })
    .catch(e => { if (e.gate) { try { localStorage.removeItem('bb-account'); } catch { /* */ } $('gate').hidden = false; } else say(e.message || "Couldn't reach the server. See the Status page."); });
})();
