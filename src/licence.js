// Licence handling in the app's main process. No server needed.
// Keys are signed privately by WiggleCodes; the app checks
// the signature with the public key in licence-public.pem, so it works fully offline.
// Each key unlocks exactly one pack, and the app can hold several keys.
// On launch it also fetches revoked.json from GitHub; revoked keys are removed.
const { app } = require('electron');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const pkg = require('../package.json');

const REVOKED_URL = (pkg.bitty && pkg.bitty.revokedUrl) || '';

let publicKey = null;
try {
  const pem = fs.readFileSync(path.join(__dirname, 'licence-public.pem'), 'utf8');
  if (pem.includes('BEGIN PUBLIC KEY')) publicKey = crypto.createPublicKey(pem);
} catch { /* not set up yet */ }

const licenceFile = () => path.join(app.getPath('userData'), 'licence.json');

// Returns { id, pack } for a genuine single-pack key, or null.
function verify(rawKey) {
  if (!publicKey) return null;
  const m = String(rawKey || '').replace(/\s+/g, '').match(/^BITTY-([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/);
  if (!m) return null;
  try {
    const payload = Buffer.from(m[1], 'base64url');
    if (!crypto.verify(null, payload, publicKey, Buffer.from(m[2], 'base64url'))) return null;
    const [ver, id, pack] = payload.toString('utf8').split('|');
    if (ver !== '1' || !id) return null;
    if (!pack || pack.includes(',') || pack === '*') return null; // one key = one pack
    return { id, pack };
  } catch { return null; }
}

let keys = [];          // [{ key, id, pack }]
let revokedCache = [];

function load() {
  keys = [];
  try {
    const data = JSON.parse(fs.readFileSync(licenceFile(), 'utf8'));
    revokedCache = Array.isArray(data.revokedCache) ? data.revokedCache : [];
    const raw = Array.isArray(data.keys) ? data.keys : data.key ? [data.key] : [];
    for (const key of raw) {
      const v = verify(key);
      if (v && !revokedCache.includes(v.id) && !keys.some(k => k.id === v.id)) keys.push({ key, ...v });
    }
  } catch { /* no licences yet */ }
}

function save() {
  fs.writeFileSync(licenceFile(), JSON.stringify({ keys: keys.map(k => k.key), revokedCache }), { mode: 0o600 });
}

async function fetchRevoked() {
  if (!REVOKED_URL) return null;
  try {
    const res = await fetch(`${REVOKED_URL}?t=${Date.now()}`, { cache: 'no-store', signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data.revoked) ? data.revoked : null;
  } catch { return null; } // offline: keep the unlocks
}

module.exports = {
  load,
  configured: () => !!publicKey,
  status: () => ({ active: keys.length > 0, packs: keys.map(k => k.pack), keys: keys.map(k => ({ id: k.id, pack: k.pack })) }),
  isUnlocked: packId => keys.some(k => k.pack === packId),

  async activate(rawKey) {
    if (!publicKey) throw new Error('Licence keys aren’t set up in this build yet.');
    const key = String(rawKey || '').replace(/\s+/g, '');
    if (!key) throw new Error('Paste your licence key first.');
    const v = verify(key);
    if (!v) throw new Error('That licence key isn’t valid. Check you copied all of it.');
    if (keys.some(k => k.id === v.id)) throw new Error('That key is already active on this computer.');
    const revoked = await fetchRevoked();
    if (revoked) revokedCache = revoked;
    if (revokedCache.includes(v.id)) throw new Error('This licence key has been revoked.');
    keys.push({ key, ...v });
    save();
    return v.pack;
  },

  // Returns 'ok', 'none', 'offline' (kept) or 'revoked' (one or more keys removed).
  async revalidate() {
    if (!keys.length) return 'none';
    const revoked = await fetchRevoked();
    if (!revoked) return 'offline';
    revokedCache = revoked;
    const before = keys.length;
    keys = keys.filter(k => !revoked.includes(k.id));
    save();
    return keys.length < before ? 'revoked' : 'ok';
  },

  async remove(id) {
    keys = id ? keys.filter(k => k.id !== id) : [];
    save();
  }
};
