const $ = id => document.getElementById(id);

function message(text, good) {
  $('msg').textContent = text || '';
  $('msg').className = 'msg ' + (good ? 'good' : 'err');
}

$('message').addEventListener('input', () => { $('count').textContent = $('message').value.length; message(''); });

window.report.details().then(d => {
  $('preview').textContent = Object.entries(d).map(([k, v]) => `${k}: ${v}`).join('\n');
});

window.report.status().then(st => {
  const reports = st && st.services && st.services.find(x => x.id === 'reports');
  const up = !!(reports && reports.ok);
  $('status').className = 'status ' + (up ? 'up' : 'down');
  $('status-text').textContent = up
    ? 'Report service is online.'
    : st && st.offline ? "You look to be offline. Reports need the internet." : 'The report service is having problems right now. Please try later, or ask in the Discord.';
});

$('send').onclick = async () => {
  const text = $('message').value.trim();
  if (text.length < 10) { message('Describe the problem in a few more words.'); $('message').focus(); return; }
  $('send').disabled = true;
  message('Sending…', true);
  const r = await window.report.send({ message: text, contact: $('contact').value.trim(), include: $('include').checked });
  $('send').disabled = false;
  if (r && r.ok) { $('form').classList.add('hidden'); $('thanks').classList.remove('hidden'); }
  else message((r && r.error) || "Couldn't send the report. Check you're online and try again.");
};
$('close').onclick = () => window.report.close();
$('done').onclick = () => window.report.close();
document.addEventListener('keydown', e => { if (e.key === 'Escape') window.report.close(); });
