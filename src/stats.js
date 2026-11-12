// Anonymous usage counting. No IDs or personal info are sent: the app just adds 1 to a
// shared counter once per day, week and month it's opened, and once when it's first
// installed. The tray menu's "Count me in the user stats" turns it off.
const pkg = require('../package.json');

const BASE = (pkg.bitty && pkg.bitty.statsApi) || 'https://abacus.jasoncameron.dev';
const NS = (pkg.bitty && pkg.bitty.statsNamespace) || 'bitty-buddies';

const pad = n => String(n).padStart(2, '0');
function isoWeek(d) {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const year = t.getUTCFullYear();
  const week = Math.ceil(((t - Date.UTC(year, 0, 1)) / 86400000 + 1) / 7);
  return `${year}-${pad(week)}`;
}
// Counter names for a given moment (UTC, so the app and the Key Maker agree on "today").
function periods(d = new Date()) {
  return {
    day: `d-${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`,
    week: `w-${isoWeek(d)}`,
    month: `m-${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}`
  };
}

async function hit(key) {
  const res = await fetch(`${BASE}/hit/${NS}/${key}`, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`stats ${res.status}`);
}

// `state` is the settings.stats object; it's updated in place and only after a count succeeds.
async function checkIn(state, { version, licensed }) {
  const now = periods();
  const todo = [];
  if (!state.installed) todo.push(['installed', true, 'installs']);
  if (state.day !== now.day) todo.push(['day', now.day, now.day]);
  if (state.week !== now.week) todo.push(['week', now.week, now.week]);
  if (state.month !== now.month) todo.push(['month', now.month, now.month]);
  // Separate counters for people with a pack unlocked.
  if (licensed && state.licensedDay !== now.day) todo.push(['licensedDay', now.day, `p${now.day}`]);
  if (licensed && state.licensedMonth !== now.month) todo.push(['licensedMonth', now.month, `p${now.month}`]);
  if (state.version !== version) todo.push(['version', version, `v-${version}`]);

  let changed = false;
  for (const [field, value, key] of todo) {
    try { await hit(key); state[field] = value; changed = true; } catch { /* offline: try again later */ }
  }
  return changed;
}

module.exports = { checkIn, periods };
