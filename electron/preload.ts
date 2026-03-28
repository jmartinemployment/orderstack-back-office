import { contextBridge, ipcRenderer } from 'electron';

// exposeInMainWorld must be called synchronously — expose a function, not a value
contextBridge.exposeInMainWorld('electronAPI', {
  getDeviceInfo: () => ipcRenderer.invoke('get-device-info'),
});
