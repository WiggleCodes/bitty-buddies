const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('licence', {
  status: () => ipcRenderer.invoke('licence:status'),
  activate: key => ipcRenderer.invoke('licence:activate', key),
  remove: () => ipcRenderer.invoke('licence:remove'),
  close: () => ipcRenderer.send('licence:close')
});
