const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("xiaoqingUpdater", {
  checkForUpdates: () => ipcRenderer.invoke("updater:check"),
  downloadUpdate: () => ipcRenderer.invoke("updater:download"),
  installUpdate: () => ipcRenderer.invoke("updater:install"),
  onStatus: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("updater:status", listener);
    return () => ipcRenderer.removeListener("updater:status", listener);
  }
});

window.addEventListener("DOMContentLoaded", () => {
  document.documentElement.dataset.desktop = "electron";
});
