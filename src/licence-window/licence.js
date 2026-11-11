const $ = id => document.getElementById(id);

function show(status, message, good) {
  $('inactive').classList.toggle('hidden', status.active);
  $('active').classList.toggle('hidden', !status.active);
  if (status.active) {
    const packs = status.packs.includes('*') ? 'every pack' : status.packNames.join(', ');
    $('summary').textContent = `Licence ${status.keyHint} is active. Unlocked: ${packs}.`;
  }
  $('msg').textContent = message || '';
  $('msg').className = 'msg ' + (good ? 'good' : 'err');
}

async function busy(btn, fn) {
  btn.disabled = true;
  try { await fn(); } finally { btn.disabled = false; }
}

$('activate').onclick = () => busy($('activate'), async () => {
  $('msg').textContent = 'Checking…'; $('msg').className = 'msg';
  const r = await window.licence.activate($('key').value);
  if (r.error) show({ active: false }, r.error);
  else show(r, 'Unlocked! Your new pets are in the Spawn menu.', true);
});
$('key').onkeydown = e => { if (e.key === 'Enter') $('activate').click(); };
$('remove').onclick = () => busy($('remove'), async () => show(await window.licence.remove(), 'Key removed from this computer.', true));
$('close1').onclick = $('close2').onclick = () => window.licence.close();

window.licence.status().then(s => show(s, s.configured ? '' : 'Licensing isn’t set up in this build yet.'));
