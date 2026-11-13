// Bitty Buddies accounts: sign in or sign up (username + password, or Discord), then see
// and copy the licence keys an admin has added to the account. Talks to the Bitty Admin server.
(() => {
  const API = 'https://bitty-admin.reece-feetenby.workers.dev';
  const $ = id => document.getElementById(id);
  let token = null;
  let current = null;

  // The sign-in is remembered in this browser only. If storage is blocked, it lasts until the tab closes.
  const store = {
    get() { try { return localStorage.getItem('bb-account'); } catch { return null; } },
    set(v) { try { v ? localStorage.setItem('bb-account', v) : localStorage.removeItem('bb-account'); } catch { /* memory only */ } }
  };

  function say(text, good) {
    const m = $('msg');
    m.textContent = text || '';
    m.className = 'account-msg' + (good ? ' good' : '');
    m.hidden = !text;
  }

  async function call(path, method = 'GET', body) {
    const headers = { 'content-type': 'application/json' };
    if (token) headers.authorization = `Bearer ${token}`;
    let res;
    try { res = await fetch(API + path, { method, headers, body: body ? JSON.stringify(body) : undefined }); }
    catch { throw new Error("Couldn't reach the account server. Check you're online, or see the Status page."); }
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && token) { signOutLocal(); }
    if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
    return data;
  }

  const busy = async (btn, fn) => {
    btn.disabled = true;
    try { await fn(); } catch (e) { say(e.message); } finally { btn.disabled = false; }
  };

  // ---------- views ----------
  function showSignedOut() {
    current = null;
    $('signed-in').hidden = true;
    $('signed-out').hidden = false;
    $('account-lede').hidden = false;
  }

  function render(data) {
    current = data;
    const u = data.user;
    $('signed-out').hidden = true;
    $('signed-in').hidden = false;
    $('account-lede').hidden = true;
    $('must-change').hidden = !u.mustChange;

    $('p-name').textContent = u.discord ? u.discord.name : u.username;
    $('p-sub').textContent = `@${u.username}` + (u.created ? ` · joined ${new Date(u.created).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}` : '');
    BBAvatar($('p-avatar'), lookOf(u));

    const pb = $('p-badges');
    pb.textContent = '';
    for (const id of u.shownBadges || []) { const b = (data.badges || []).find(x => x.id === id); if (b) pb.appendChild(BBBadge(b)); }
    $('show-me').checked = !u.hidden;

    const list = $('keys');
    list.textContent = '';
    $('no-keys').hidden = data.keys.length > 0;
    for (const k of data.keys) {
      const li = document.createElement('li');
      li.className = 'key-item' + (k.revoked ? ' revoked' : '');
      const top = document.createElement('div');
      top.className = 'key-top';
      const name = document.createElement('strong');
      name.textContent = k.packNames.join(', ');
      const state = document.createElement('span');
      state.className = 'key-state';
      state.textContent = k.revoked ? 'Cancelled' : 'Active';
      top.append(name, state);
      const row = document.createElement('div');
      row.className = 'key-row';
      const field = document.createElement('input');
      field.readOnly = true; field.value = k.key; field.setAttribute('aria-label', `Licence key for ${k.packNames.join(', ')}`);
      field.addEventListener('focus', () => field.select());
      const copy = document.createElement('button');
      copy.type = 'button'; copy.className = 'btn grass small'; copy.textContent = 'Copy';
      copy.addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(k.key); } catch { field.select(); document.execCommand('copy'); }
        copy.textContent = 'Copied'; setTimeout(() => { copy.textContent = 'Copy'; }, 1800);
      });
      row.append(field, copy);
      const meta = document.createElement('p');
      meta.className = 'key-meta';
      meta.textContent = `Key ${k.id}` + (k.created ? ` · added ${new Date(k.created).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}` : '') +
        (k.revoked ? ' · This key has been cancelled. Ask on the Discord if you think that’s a mistake.' : '');
      li.append(top, row, meta);
      list.appendChild(li);
    }

    $('discord-state').textContent = u.discord ? `Linked as @${u.discord.username}` : 'Not linked. Link it to sign in with one click.';
    $('discord-link').hidden = !!u.discord;
    $('discord-unlink').hidden = !u.discord;
    $('pw-title').textContent = u.mustChange ? 'Set a new password' : u.hasPassword ? 'Change password' : 'Add a password';
    document.querySelector('.pw-current').hidden = !u.hasPassword;
    $('pw-current').required = !!u.hasPassword;
    document.querySelector('.pw-current').firstChild.textContent = u.mustChange ? 'Temporary password ' : 'Current password ';
  }

  // ---------- picture picker ----------
  const BGS = ['#8FCBF0', '#6CBE4E', '#F2A93B', '#E0518E', '#8E5BD8', '#2E345C', '#C8392F', '#EEF3F7', '#2FA58B', '#7C573A'];
  const PAID = { fantasy: 'fantasy' };   // pack -> licence pack needed
  const lookOf = (u, look = u.look || {}) => ({
    username: u.username, pet: look.pet || null, bg: look.bg || null,
    avatar: u.discord && u.discord.avatar && look.useDiscord !== false ? u.discord.avatar : null
  });
  let draft = null;
  function openPicker() {
    const u = current.user;
    const owned = new Set(current.keys.filter(k => !k.revoked).flatMap(k => k.packs));
    draft = { pet: (u.look && u.look.pet) || null, bg: (u.look && u.look.bg) || BGS[0], useDiscord: !!(u.discord && u.discord.avatar) && !(u.look && u.look.useDiscord === false) };
    $('pk-discord-row').hidden = !(u.discord && u.discord.avatar);
    $('pk-discord').checked = draft.useDiscord;
    const pets = $('pk-pets'); pets.textContent = '';
    let anyLocked = false;
    for (const pack of window.BBPacks || []) {
      if (!['critters', 'fantasy'].includes(pack.id)) continue;
      for (const [key, item] of Object.entries(pack.items)) {
        if ((item.kind || 'pet') !== 'pet') continue;
        const id = `${pack.id}/${key}`;
        const locked = PAID[pack.id] && !owned.has(PAID[pack.id]);
        anyLocked = anyLocked || locked;
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'pet-pick' + (locked ? ' locked' : ''); b.setAttribute('role', 'radio');
        b.setAttribute('aria-label', item.name + (locked ? ' (comes with a paid pack)' : ''));
        b.title = locked ? `${item.name} comes with ${pack.name}` : item.name;
        b.disabled = locked;
        const c = BBPetCanvas(id); if (c) b.appendChild(c);
        if (locked) { const l = document.createElement('span'); l.className = 'lock-tag'; l.textContent = '🔒'; b.appendChild(l); }
        b.onclick = () => { draft.pet = id; draft.useDiscord = false; $('pk-discord').checked = false; sync(); };
        b.dataset.id = id;
        pets.appendChild(b);
      }
    }
    $('pk-locked-note').hidden = !anyLocked;
    const sw = $('pk-bgs'); sw.textContent = '';
    for (const bg of BGS) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'swatch'; b.style.background = bg; b.setAttribute('role', 'radio'); b.setAttribute('aria-label', `Background ${bg}`); b.dataset.bg = bg;
      b.onclick = () => { draft.bg = bg; if (!draft.pet) draft.pet = 'critters/pup'; draft.useDiscord = false; $('pk-discord').checked = false; sync(); };
      sw.appendChild(b);
    }
    $('picker').hidden = false;
    sync();
    $('picker').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function sync() {
    const u = current.user;
    BBAvatar($('pk-preview'), lookOf(u, draft.pet || draft.useDiscord ? draft : { ...draft, pet: null }));
    for (const b of $('pk-pets').children) b.setAttribute('aria-checked', String(b.dataset.id === draft.pet && !draft.useDiscord));
    for (const b of $('pk-bgs').children) b.setAttribute('aria-checked', String(b.dataset.bg === draft.bg && !draft.useDiscord));
  }
  $('pic-open').addEventListener('click', openPicker);
  $('pk-cancel').addEventListener('click', () => { $('picker').hidden = true; });
  $('pk-discord').addEventListener('change', e => { draft.useDiscord = e.currentTarget.checked; sync(); });
  $('pk-save').addEventListener('click', e => busy(e.currentTarget, async () => {
    const d = await call('/account/look', 'POST', { pet: draft.pet || undefined, bg: draft.bg, useDiscord: draft.useDiscord });
    $('picker').hidden = true; render(d); say(d.message, true);
  }));

  function signOutLocal() { token = null; store.set(null); showSignedOut(); }

  // ---------- sign in / sign up ----------
  const tabs = { in: [$('tab-in'), $('form-in')], up: [$('tab-up'), $('form-up')] };
  const pick = which => {
    for (const [k, [tab, form]] of Object.entries(tabs)) { tab.setAttribute('aria-selected', String(k === which)); form.hidden = k !== which; }
    say('');
  };
  $('tab-in').addEventListener('click', () => pick('in'));
  $('tab-up').addEventListener('click', () => pick('up'));
  $('discord-signin').href = `${API}/account/discord?for=web`;

  $('form-in').addEventListener('submit', e => {
    e.preventDefault();
    busy(e.submitter || $('form-in').querySelector('button'), async () => {
      const d = await call('/account/login', 'POST', { username: $('in-user').value, password: $('in-pass').value });
      token = d.token; store.set(token); $('in-pass').value = ''; say(''); render(d);
    });
  });
  $('form-up').addEventListener('submit', e => {
    e.preventDefault();
    busy(e.submitter || $('form-up').querySelector('button'), async () => {
      const d = await call('/account/signup', 'POST', { username: $('up-user').value, password: $('up-pass').value });
      token = d.token; store.set(token); $('up-pass').value = ''; say('Account created. Welcome!', true); render(d);
    });
  });

  // ---------- signed-in actions ----------
  $('sign-out').addEventListener('click', e => busy(e.currentTarget, async () => {
    try { await call('/account/logout', 'POST'); } catch { /* sign out locally anyway */ }
    signOutLocal(); say('Signed out.', true);
  }));
  $('discord-link').addEventListener('click', e => busy(e.currentTarget, async () => {
    const d = await call('/account/discord/link', 'POST');
    location.href = d.url;
  }));
  $('show-me').addEventListener('change', e => {
    const box = e.currentTarget;
    busy(box, async () => { const d = await call('/account/visibility', 'POST', { hidden: !box.checked }); render(d); say(d.message, true); });
  });
  $('discord-unlink').addEventListener('click', e => busy(e.currentTarget, async () => {
    const d = await call('/account/discord/unlink', 'POST');
    render(d); say(d.message, true);
  }));
  $('pw-form').addEventListener('submit', e => {
    e.preventDefault();
    busy(e.submitter || $('pw-form').querySelector('button'), async () => {
      const d = await call('/account/password', 'POST', { current: $('pw-current').value, next: $('pw-next').value });
      $('pw-current').value = ''; $('pw-next').value = '';
      render(d); say(d.message, true);
    });
  });
  $('del-form').addEventListener('submit', e => {
    e.preventDefault();
    busy(e.submitter || $('del-form').querySelector('button'), async () => {
      const d = await call('/account/delete', 'POST', { confirm: $('del-confirm').value });
      signOutLocal(); say(d.message, true);
    });
  });

  // ---------- start ----------
  // Coming back from Discord: the server puts the sign-in (or an error) after the # in the address.
  const hash = new URLSearchParams(location.hash.slice(1));
  if (hash.has('token') || hash.has('error')) history.replaceState(null, '', location.pathname);
  if (hash.get('error')) say(hash.get('error'));
  token = hash.get('token') || store.get();
  if (hash.get('token')) store.set(token);

  if (!token) { showSignedOut(); return; }
  call('/account/me').then(render).catch(e => { if (token) say(e.message); else showSignedOut(); });
})();
