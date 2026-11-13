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
    const box = document.querySelector('.profile-avatar');
    const img = box.querySelector('img');
    if (u.discord && u.discord.avatar) {
      img.onload = () => { img.hidden = false; box.classList.add('photo'); };
      img.alt = `${u.discord.name}'s Discord picture`;
      img.src = u.discord.avatar;
    } else { img.hidden = true; box.classList.remove('photo'); }

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
