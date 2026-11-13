const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('report', {
  details: () => ipcRenderer.invoke('report:details'),
  send: data => ipcRenderer.invoke('report:send', data),
  close: () => ipcRenderer.send('report:close')
});
