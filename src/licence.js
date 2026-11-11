// Licence handling in the app's main process. No server needed.
// Keys are signed privately by WiggleCodes; the app checks
// the signature with the public key in licence-public.pem, so it works fully offline.
// On launch it also fetches revoked.json from GitHub; a revoked key is removed.
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

// Returns { id, packs } for a genuine key, or null.
function verify(rawKey) {
  if (!publicKey) return null;
  const m = String(rawKey || '').replace(/\s+/g, '').match(/^BITTY-([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/);
  if (!m) return null;
  try {
    const payload = Buffer.from(m[1], 'base64url');
    if (!crypto.verify(null, payload, publicKey, Buffer.from(m[2], 'base64url'))) return null;
    const [ver, id, packs] = payload.toString('utf8').split('|');
    if (ver !== '1' || !id) return null;
    return { id, packs: packs ? packs.split(',') : [] };
  } catch { return null; }
}

let current = null; // { key, id, packs }

function load() {
  current = null;
  try {
    const { key, revokedCache } = JSON.parse(fs.readFileSync(licenceFile(), 'utf8'));
    const v = verify(key);
    if (v && !(revokedCache || []).includes(v.id)) current = { key, ...v };
  } catch { /* no licence */ }
}

function save(extra = {}) {
  fs.writeFileSync(licenceFile(), JSON.stringify({ key: current.key, ...extra }), { mode: 0o600 });
}

function clear() {
  current = null;
  try { fs.unlinkSync(licenceFile()); } catch { /* already gone */ }
}

async function fetchRevoked() {
  if (!REVOKED_URL) return null;
  try {
    const res = await fetch(REVOKED_URL, { cache: 'no-store', signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data.revoked) ? data.revoked : null;
  } catch { return null; } // offline: keep the unlock
}

module.exports = {
  load,
  configured: () => !!publicKey,
  status: () => current ? { active: true, packs: current.packs, keyHint: current.id } : { active: false, packs: [] },
  isUnlocked: packId => !!current && (current.packs.includes('*') || current.packs.includes(packId)),

  async activate(rawKey) {
    if (!publicKey) throw new Error('Licence keys aren’t set up in this build yet.');
    const key = String(rawKey || '').replace(/\s+/g, '');
    if (!key) throw new Error('Paste your licence key first.');
    const v = verify(key);
    if (!v) throw new Error('That licence key isn’t valid. Check you copied all of it.');
    const revoked = await fetchRevoked();
    if (revoked && revoked.includes(v.id)) throw new Error('This licence key has been revoked.');
    current = { key, ...v };
    save({ revokedCache: revoked || [] });
    return module.exports.status();
  },

  // Returns 'ok', 'none', 'offline' (kept) or 'revoked' (licence removed).
  async revalidate() {
    if (!current) return 'none';
    const revoked = await fetchRevoked();
    if (!revoked) return 'offline';
    if (revoked.includes(current.id)) { clear(); return 'revoked'; }
    save({ revokedCache: revoked });
    return 'ok';
  },

  async remove() { clear(); }
};
