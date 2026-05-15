"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    getAppVersion() {
        return process.env.npm_package_version ?? '1.0.0';
    },
    getPlatform() {
        return process.platform;
    },
    openExternal(url) {
        electron_1.shell.openExternal(url).catch((err) => {
            console.error('Failed to open external URL:', err.message);
        });
    },
    async showSaveDialog(options) {
        const result = await electron_1.ipcRenderer.invoke('show-save-dialog', options);
        if (result.canceled)
            return undefined;
        return result.filePath;
    },
});
