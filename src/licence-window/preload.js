const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('licence', {
  status: () => ipcRenderer.invoke('licence:status'),
  activate: key => ipcRenderer.invoke('licence:activate', key),
  remove: id => ipcRenderer.invoke('licence:remove', id),
  close: () => ipcRenderer.send('licence:close')
});
