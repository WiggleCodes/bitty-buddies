const { app, BrowserWindow, Tray, Menu, ipcMain, screen, nativeImage, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const pkg = require('../package.json');
const licence = require('./licence');

const IS_MAC = process.platform === 'darwin';
const MAX_THINGS = 40;

if (!app.requestSingleInstanceLock()) {
  app.quit();
  return;
}

// ---------- packs ----------
const PACK_FILES = require('./packs');
const PACKS = PACK_FILES.map(file => ({ file, ...require(path.join(__dirname, 'packs', file)) }));
const ITEMS = {};
for (const p of PACKS) {
  for (const [key, it] of Object.entries(p.items)) {
    ITEMS[`${p.id}/${key}`] = { id: `${p.id}/${key}`, pack: p, name: it.name, blurb: it.blurb || '', kind: it.kind || 'pet' };
  }
}

// Packs with `licensed: true` need a valid licence key that covers them.
const packUnlocked = p => !p.licensed || licence.isUnlocked(p.id);
const itemUnlocked = id => !!ITEMS[id] && packUnlocked(ITEMS[id].pack);
const unlockedPackFiles = () => PACKS.filter(packUnlocked).map(p => p.file);

// ---------- settings ----------
const DEFAULTS = { things: [{ id: 'critters/pup' }, { id: 'critters/kit' }], scale: 4, hidden: false, mischief: true };
let settings = { ...DEFAULTS };
const settingsFile = () => path.join(app.getPath('userData'), 'settings.json');

function loadSettings() {
  try {
    const s = JSON.parse(fs.readFileSync(settingsFile(), 'utf8'));
    settings = { ...DEFAULTS, ...s };
    settings.things = (settings.things || []).filter(t => t && ITEMS[t.id]);
  } catch { settings = { ...DEFAULTS }; }
}
function saveSettings() {
  try { fs.writeFileSync(settingsFile(), JSON.stringify(settings, null, 2)); } catch (e) { console.error(e); }
}

// ---------- overlay window ----------
let win = null;
let tray = null;

function fitToScreen() {
  if (!win) return;
  win.setBounds(screen.getPrimaryDisplay().workArea);
}

function createWindow() {
  const { workArea } = screen.getPrimaryDisplay();
  win = new BrowserWindow({
    ...workArea,
    transparent: true,
    frame: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    hasShadow: false,
    focusable: false,
    acceptFirstMouse: true,
    show: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false
    }
  });
  win.setAlwaysOnTop(true, 'screen-saver');
  if (IS_MAC) win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  win.setIgnoreMouseEvents(true, { forward: true });
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  win.webContents.on('did-finish-load', () => {
    send('init', {
      packFiles: unlockedPackFiles(),
      things: settings.things.filter(t => itemUnlocked(t.id)),
      scale: settings.scale,
      hidden: settings.hidden,
      mischief: settings.mischief
    });
    win.showInactive();
  });
  win.on('closed', () => { win = null; });

  screen.on('display-metrics-changed', fitToScreen);
  screen.on('display-added', fitToScreen);
  screen.on('display-removed', fitToScreen);
}

function send(channel, data) {
  if (win && !win.isDestroyed()) win.webContents.send(channel, data);
}

// ---------- IPC from the overlay ----------
ipcMain.on('set-ignore', (_e, ignore) => {
  if (!win) return;
  if (ignore) win.setIgnoreMouseEvents(true, { forward: true });
  else win.setIgnoreMouseEvents(false);
});

ipcMain.on('things-changed', (_e, things) => {
  if (!Array.isArray(things)) return;
  // The overlay only knows about unlocked packs, so keep any saved locked items as they were.
  const locked = settings.things.filter(t => ITEMS[t.id] && !itemUnlocked(t.id));
  const shown = things
    .filter(t => t && itemUnlocked(t.id))
    .map(t => (typeof t.x === 'number' ? { id: t.id, x: Math.max(0, Math.min(1, t.x)) } : { id: t.id }));
  settings.things = [...shown, ...locked].slice(0, MAX_THINGS);
  saveSettings();
});

// ---------- licence window ----------
let licenceWin = null;

function licenceStatus() {
  const s = licence.status();
  const names = PACKS.filter(p => p.licensed && licence.isUnlocked(p.id)).map(p => p.name);
  return { ...s, packNames: names, configured: licence.configured() };
}

function openLicenceWindow() {
  if (licenceWin) { licenceWin.show(); licenceWin.focus(); return; }
  licenceWin = new BrowserWindow({
    width: 440, height: 340, resizable: false, minimizable: false, maximizable: false,
    fullscreenable: false, title: 'Bitty Buddies licence', alwaysOnTop: true, show: false,
    autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'licence-window', 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  licenceWin.loadFile(path.join(__dirname, 'licence-window', 'licence.html'));
  licenceWin.once('ready-to-show', () => licenceWin.show());
  licenceWin.on('closed', () => { licenceWin = null; });
  if (IS_MAC) app.focus({ steal: true });
}

function refreshUnlocks() {
  buildTrayMenu();
  if (win && !win.isDestroyed()) win.reload(); // reloads with the newly unlocked (or locked) packs
}

ipcMain.handle('licence:status', () => licenceStatus());
ipcMain.handle('licence:activate', async (_e, key) => {
  try { await licence.activate(key); refreshUnlocks(); return licenceStatus(); }
  catch (e) { return { error: e.message }; }
});
ipcMain.handle('licence:remove', async () => { await licence.remove(); refreshUnlocks(); return licenceStatus(); });
ipcMain.on('licence:close', () => { if (licenceWin) licenceWin.close(); });

ipcMain.on('thing-menu', (_e, { uid, id }) => {
  const item = ITEMS[id];
  if (!item || !win) return;
  const tpl = [{ label: item.name, enabled: false }, { type: 'separator' }];
  if (item.kind === 'pet') {
    tpl.push({ label: 'Sit', click: () => send('thing-action', { uid, action: 'sit' }) });
    tpl.push({ label: 'Nap time', click: () => send('thing-action', { uid, action: 'sleep' }) });
    tpl.push({ label: 'Go for a walk', click: () => send('thing-action', { uid, action: 'walk' }) });
    tpl.push({ label: 'Chase the mouse', click: () => send('thing-action', { uid, action: 'chase' }) });
    tpl.push({ label: 'Climb the wall', click: () => send('thing-action', { uid, action: 'climb' }) });
    tpl.push({ label: 'Start a battle!', click: () => send('thing-action', { uid, action: 'battle' }) });
    tpl.push({ type: 'separator' });
  }
  tpl.push({ label: `Remove ${item.name}`, click: () => send('thing-action', { uid, action: 'remove' }) });
  Menu.buildFromTemplate(tpl).popup({ window: win });
});

// ---------- tray ----------
function spawnMenu(kind) {
  const packs = PACKS
    .map(p => ({ p, items: Object.values(ITEMS).filter(i => i.pack === p && i.kind === kind) }))
    .filter(g => g.items.length);
  const toEntry = i => ({ label: i.blurb ? `${i.name}  —  ${i.blurb}` : i.name, click: () => send('spawn', i.id) });
  const lockedEntries = g => [
    { label: `${g.items.map(i => i.name).join(', ')}`, enabled: false },
    { type: 'separator' },
    { label: 'Unlock with a licence key…', click: openLicenceWindow }
  ];
  const group = g => packUnlocked(g.p)
    ? { label: g.p.name, submenu: g.items.map(toEntry) }
    : { label: `🔒 ${g.p.name}`, submenu: lockedEntries(g) };
  if (packs.length === 1) return packUnlocked(packs[0].p) ? packs[0].items.map(toEntry) : lockedEntries(packs[0]);
  return packs.map(group);
}

function buildTrayMenu() {
  const sizes = [['Small', 3], ['Medium', 4], ['Large', 6], ['Huge', 8]];
  const menu = Menu.buildFromTemplate([
    { label: `Bitty Buddies v${app.getVersion()}`, enabled: false },
    { type: 'separator' },
    { label: 'Spawn', submenu: spawnMenu('pet') },
    { label: 'Build', submenu: spawnMenu('build') },
    {
      label: 'Play', submenu: [
        { label: 'Start a battle!', click: () => send('play', 'battle') },
        { label: 'Throw a ball', click: () => send('play', 'ball') },
        { label: 'Drop some treats', click: () => send('play', 'treats') },
        { label: 'Dance party!', click: () => send('play', 'party') },
        { label: 'Conga line!', click: () => send('play', 'conga') },
        { type: 'separator' },
        {
          label: 'Mischief (chasing, climbing, scraps)', type: 'checkbox', checked: settings.mischief,
          click: i => { settings.mischief = i.checked; saveSettings(); send('set-mischief', settings.mischief); }
        }
      ]
    },
    {
      label: 'Clear', submenu: [
        { label: 'Remove all pets', click: () => send('clear', 'pet') },
        { label: 'Remove all builds', click: () => send('clear', 'build') },
        { label: 'Remove everything', click: () => send('clear', 'all') }
      ]
    },
    { type: 'separator' },
    {
      label: 'Hide everything', type: 'checkbox', checked: settings.hidden,
      click: i => { settings.hidden = i.checked; saveSettings(); send('set-hidden', settings.hidden); }
    },
    {
      label: 'Size', submenu: sizes.map(([label, v]) => ({
        label, type: 'radio', checked: settings.scale === v,
        click: () => { settings.scale = v; saveSettings(); send('set-scale', v); }
      }))
    },
    {
      label: 'Start with computer', type: 'checkbox', checked: app.getLoginItemSettings().openAtLogin,
      click: i => app.setLoginItemSettings({ openAtLogin: i.checked })
    },
    { type: 'separator' },
    { label: licence.status().active ? 'Licence key (active)…' : 'Enter licence key…', click: openLicenceWindow },
    { label: 'Check for updates…', click: () => checkForUpdates(true) },
    { label: 'Quit', click: () => app.quit() }
  ]);
  tray.setContextMenu(menu);
}

function createTray() {
  const file = IS_MAC ? 'trayTemplate.png' : 'tray.png';
  const icon = nativeImage.createFromPath(path.join(__dirname, '..', 'assets', file));
  if (IS_MAC) icon.setTemplateImage(true);
  tray = new Tray(icon);
  tray.setToolTip('Bitty Buddies');
  buildTrayMenu();
  if (!IS_MAC) tray.on('click', () => tray.popUpContextMenu());
}

// ---------- auto-update (GitHub Releases) ----------
const pub = (pkg.build && pkg.build.publish && pkg.build.publish[0]) || {};
const RELEASES_URL = `https://github.com/${pub.owner}/${pub.repo}/releases/latest`;
let manualCheck = false;
let autoUpdater = null;

function setupUpdates() {
  if (!app.isPackaged) return;
  autoUpdater = require('electron-updater').autoUpdater; // loaded lazily: only the installed app needs it
  // macOS can only install updates silently when the app is code-signed.
  // Unsigned Mac builds get a "download the new version" prompt instead.
  autoUpdater.autoDownload = !IS_MAC;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-available', async info => {
    manualCheck = false;
    if (!IS_MAC) return; // Windows downloads in the background
    const r = await dialog.showMessageBox({
      type: 'info', buttons: ['Download', 'Later'], defaultId: 0,
      message: `Bitty Buddies ${info.version} is out!`,
      detail: 'Open the download page to grab the new version.'
    });
    if (r.response === 0) shell.openExternal(RELEASES_URL);
  });
  autoUpdater.on('update-not-available', () => {
    if (manualCheck) dialog.showMessageBox({ type: 'info', message: "You're on the latest version.", detail: `v${app.getVersion()}` });
    manualCheck = false;
  });
  autoUpdater.on('update-downloaded', async info => {
    const r = await dialog.showMessageBox({
      type: 'info', buttons: ['Restart now', 'Later'], defaultId: 0,
      message: `Bitty Buddies ${info.version} is ready`,
      detail: 'Restart to finish updating (or it will install next time you quit).'
    });
    if (r.response === 0) setImmediate(() => autoUpdater.quitAndInstall());
  });
  autoUpdater.on('error', err => {
    if (manualCheck) dialog.showErrorBox('Update check failed', String((err && err.message) || err));
    manualCheck = false;
  });

  checkForUpdates(false);
  setInterval(() => checkForUpdates(false), 4 * 60 * 60 * 1000);
}

function checkForUpdates(manual) {
  if (!app.isPackaged || !autoUpdater) {
    if (manual) dialog.showMessageBox({ type: 'info', message: 'Updates only work in the installed app.' });
    return;
  }
  manualCheck = manual;
  autoUpdater.checkForUpdates().catch(() => {});
}

// ---------- lifecycle ----------
app.whenReady().then(() => {
  if (IS_MAC && app.dock) app.dock.hide();
  loadSettings();
  licence.load();
  createWindow();
  createTray();
  setupUpdates();

  // Quietly re-check the licence with the server. Offline? Keep the cached unlock.
  const before = JSON.stringify(licence.status().packs);
  licence.revalidate().then(result => {
    if (result === 'revoked' || JSON.stringify(licence.status().packs) !== before) refreshUnlocks();
  });
});

app.on('second-instance', () => {
  if (tray && !IS_MAC) tray.popUpContextMenu();
});

app.on('window-all-closed', () => app.quit());
