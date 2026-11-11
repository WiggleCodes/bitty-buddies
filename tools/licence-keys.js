#!/usr/bin/env node
// Bitty Buddies licence keys: made and signed on YOUR computer, checked offline by the app.
//
//   node tools/licence-keys.js init                         one-time: makes your signing keys
//   node tools/licence-keys.js create --packs fantasy [--note "Sam, PayPal"]
//   node tools/licence-keys.js create --packs '*'           every licensed pack, now and future
//   node tools/licence-keys.js list                         keys you've made
//   node tools/licence-keys.js revoke <id|key>              adds it to revoked.json (then commit + push)
//   node tools/licence-keys.js unrevoke <id|key>
//
// Your PRIVATE key lives outside the repo (default ~/.bitty-buddies-licence, or set
// BITTY_LICENCE_DIR). Never commit it or share it: anyone with it can make keys.
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const DIR = process.env.BITTY_LICENCE_DIR || path.join(os.homedir(), '.bitty-buddies-licence');
const PRIV = path.join(DIR, 'private.pem');
const LEDGER = path.join(DIR, 'issued.json');
const APP_PUB = path.join(ROOT, 'src', 'licence-public.pem');
const REVOKED = path.join(ROOT, 'revoked.json');

const [cmd, ...rest] = process.argv.slice(2);
const flags = {}; const args = [];
for (let i = 0; i < rest.length; i++) {
  if (rest[i].startsWith('--')) flags[rest[i].slice(2)] = rest[i + 1], i++;
  else args.push(rest[i]);
}

const readJSON = (f, fallback) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return fallback; } };
const writeJSON = (f, d) => fs.writeFileSync(f, JSON.stringify(d, null, 2) + '\n');
const die = msg => { console.error(msg); process.exit(1); };

// Key format: BITTY-<payload>.<signature>, both base64url. Payload: "1|<id>|<packs>|<yyyymmdd>"
function idFromKey(key) {
  const m = String(key).trim().match(/^BITTY-([A-Za-z0-9_-]+)\./);
  if (!m) return null;
  return Buffer.from(m[1], 'base64url').toString('utf8').split('|')[1] || null;
}
function resolveId(ref) {
  if (!ref) die('Give a licence id or key. Use "list" to see ids.');
  return idFromKey(ref) || ref;
}

switch (cmd) {
  case 'init': {
    if (fs.existsSync(PRIV)) die(`You already have signing keys in ${DIR}. Delete them first if you really want new ones (old keys would stop working).`);
    fs.mkdirSync(DIR, { recursive: true, mode: 0o700 });
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
    fs.writeFileSync(PRIV, privateKey.export({ type: 'pkcs8', format: 'pem' }), { mode: 0o600 });
    fs.writeFileSync(APP_PUB, publicKey.export({ type: 'spki', format: 'pem' }));
    if (!fs.existsSync(REVOKED)) writeJSON(REVOKED, { revoked: [] });
    console.log(`Private signing key saved to ${PRIV}`);
    console.log('  Keep it safe and back it up. Never put it in the repo.');
    console.log(`Public key written to src/licence-public.pem (commit this one).`);
    break;
  }

  case 'create': {
    if (!fs.existsSync(PRIV)) die('Run "init" first to make your signing keys.');
    if (!flags.packs) die('Usage: create --packs <pack-id[,pack-id]|*> [--note text]');
    const packs = flags.packs.split(',').map(s => s.trim()).filter(Boolean);
    if (packs.some(p => !/^[a-z0-9-]+$|^\*$/.test(p))) die('Pack ids are lowercase letters, numbers and dashes (or *).');
    const id = crypto.randomBytes(4).toString('hex');
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const payload = Buffer.from(`1|${id}|${packs.join(',')}|${date}`);
    const sig = crypto.sign(null, payload, crypto.createPrivateKey(fs.readFileSync(PRIV)));
    const key = `BITTY-${payload.toString('base64url')}.${sig.toString('base64url')}`;
    const ledger = readJSON(LEDGER, []);
    ledger.push({ id, packs, note: flags.note || '', created: new Date().toISOString() });
    writeJSON(LEDGER, ledger);
    console.log(`\nLicence ${id} for: ${packs.join(', ')}\n\n${key}\n`);
    break;
  }

  case 'list': {
    const ledger = readJSON(LEDGER, []);
    const revoked = new Set(readJSON(REVOKED, { revoked: [] }).revoked);
    if (!ledger.length) { console.log('No keys made yet.'); break; }
    for (const l of ledger)
      console.log(`${l.id}  ${revoked.has(l.id) ? 'REVOKED' : 'active '}  packs=${l.packs.join(',')}  ${l.created.slice(0, 10)}  ${l.note}`);
    break;
  }

  case 'revoke': case 'unrevoke': {
    const id = resolveId(args[0]);
    if (!/^[a-f0-9]{8}$/.test(id)) die(`"${args[0]}" isn't a licence id or key.`);
    const data = readJSON(REVOKED, { revoked: [] });
    const set = new Set(data.revoked);
    cmd === 'revoke' ? set.add(id) : set.delete(id);
    writeJSON(REVOKED, { revoked: [...set].sort() });
    console.log(`${id} ${cmd === 'revoke' ? 'revoked' : 'un-revoked'} in revoked.json.`);
    console.log('Commit and push it to GitHub. Apps pick it up next time they launch.');
    break;
  }

  default:
    console.log('Commands: init, create, list, revoke, unrevoke (see the top of tools/licence-keys.js)');
}
