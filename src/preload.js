const { contextBridge, ipcRenderer } = require('electron');

const INCOMING = ['init', 'spawn', 'clear', 'set-scale', 'set-hidden', 'thing-action', 'play', 'set-mischief'];

contextBridge.exposeInMainWorld('bb', {
  setIgnore: ignore => ipcRenderer.send('set-ignore', !!ignore),
  thingMenu: (uid, id) => ipcRenderer.send('thing-menu', { uid, id }),
  thingsChanged: list => ipcRenderer.send('things-changed', list),
  on: (channel, fn) => {
    if (INCOMING.includes(channel)) ipcRenderer.on(channel, (_e, data) => fn(data));
  }
});
