const $ = id => document.getElementById(id);

function message(text, good) {
  $('msg').textContent = text || '';
  $('msg').className = 'msg ' + (good ? 'good' : 'err');
}

function render(status) {
  const list = $('list');
  list.textContent = '';
  for (const k of status.keys || []) {
    const li = document.createElement('li');
    const label = document.createElement('span');
    label.textContent = `✔ ${k.packNames.join(', ')}`;
    const btn = document.createElement('button');
    btn.className = 'alt';
    btn.textContent = 'Remove';
    btn.onclick = async () => {
      btn.disabled = true;
      render(await window.licence.remove(k.id));
      message('Key removed from this computer.', true);
    };
    li.append(label, btn);
    list.appendChild(li);
  }
}

$('activate').onclick = async () => {
  $('activate').disabled = true;
  message('Checking…', true);
  try {
    const r = await window.licence.activate($('key').value);
    if (r.error) return message(r.error);
    $('key').value = '';
    render(r);
    message(`Unlocked ${r.unlocked}! Find it in the Spawn and Build menus.`, true);
  } finally { $('activate').disabled = false; }
};
$('key').onkeydown = e => { if (e.key === 'Enter') $('activate').click(); };
$('close').onclick = () => window.licence.close();

window.licence.status().then(s => {
  render(s);
  if (!s.configured) message('Licence keys aren’t set up in this build yet.');
});
