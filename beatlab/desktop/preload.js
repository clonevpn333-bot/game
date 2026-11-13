// Bridges the BeatLab page to the Mac app: menu commands, native Save dialogs, window title, Finder file opens.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('beatlabNative', {
  platform: process.platform,
  onMenu: (cb) => ipcRenderer.on('menu', (_e, cmd) => cb(cmd)),
  onOpenFile: (cb) => ipcRenderer.on('open-file', (_e, file) => cb(file)),
  saveFile: (name, bytes) => ipcRenderer.invoke('save-file', { name, bytes }),
  setTitle: (title) => ipcRenderer.send('set-title', title),
});
