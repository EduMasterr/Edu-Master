const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('eduAPI', {
    closeApp: () => ipcRenderer.send('app-exit-final'),
    forceBackup: (data) => ipcRenderer.invoke('force-fixed-backup', data),
    onAppClose: (callback) => ipcRenderer.on('app-close-request', () => callback())
});
