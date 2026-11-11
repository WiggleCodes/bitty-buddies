const { contextBridge, ipcRenderer } = require('electron');

const INCOMING = ['init', 'spawn', 'clear', 'set-scale', 'set-hidden', 'thing-action', 'play', 'set-mischief', 'cursor'];

contextBridge.exposeInMainWorld('bb', {
  setIgnore: ignore => ipcRenderer.send('set-ignore', !!ignore),
  thingMenu: (uid, id) => ipcRenderer.send('thing-menu', { uid, id }),
  thingsChanged: list => ipcRenderer.send('things-changed', list),
  grabWindow: () => ipcRenderer.invoke('grab-window'),
  moveWindow: dx => ipcRenderer.invoke('move-window', dx),
  releaseWindow: () => ipcRenderer.send('release-window'),
  on: (channel, fn) => {
    if (INCOMING.includes(channel)) ipcRenderer.on(channel, (_e, data) => fn(data));
  }
});
