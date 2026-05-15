"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// Suppress DevTools protocol warnings for unimplemented Autofill commands
electron_1.app.commandLine.appendSwitch('disable-features', 'AutofillServerCommunication');
const path_1 = __importDefault(require("path"));
const isDev = process.env.NODE_ENV === 'development' || !electron_1.app.isPackaged;
let mainWindow = null;
function createMenu(win) {
    const template = [
        {
            label: 'File',
            submenu: [
                {
                    label: 'Quit',
                    accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
                    click: () => electron_1.app.quit(),
                },
            ],
        },
        {
            label: 'View',
            submenu: [
                {
                    label: 'Reload',
                    accelerator: 'CmdOrCtrl+R',
                    click: () => win.reload(),
                },
                {
                    label: 'Toggle DevTools',
                    accelerator: process.platform === 'darwin' ? 'Alt+Cmd+I' : 'Ctrl+Shift+I',
                    click: () => win.webContents.toggleDevTools(),
                },
                { type: 'separator' },
                {
                    label: 'Actual Size',
                    accelerator: 'CmdOrCtrl+0',
                    click: () => win.webContents.setZoomLevel(0),
                },
                {
                    label: 'Zoom In',
                    accelerator: 'CmdOrCtrl+Plus',
                    click: () => {
                        const level = win.webContents.getZoomLevel();
                        win.webContents.setZoomLevel(level + 0.5);
                    },
                },
                {
                    label: 'Zoom Out',
                    accelerator: 'CmdOrCtrl+-',
                    click: () => {
                        const level = win.webContents.getZoomLevel();
                        win.webContents.setZoomLevel(level - 0.5);
                    },
                },
            ],
        },
        {
            label: 'Help',
            submenu: [
                {
                    label: 'About Orbis Dashboard',
                    click: async () => {
                        await electron_1.shell.openExternal('https://orbis.io');
                    },
                },
                {
                    label: `Version ${electron_1.app.getVersion()}`,
                    enabled: false,
                },
            ],
        },
    ];
    if (process.platform === 'darwin') {
        template.unshift({
            label: electron_1.app.name,
            submenu: [
                { role: 'about' },
                { type: 'separator' },
                { role: 'services' },
                { type: 'separator' },
                { role: 'hide' },
                { role: 'hideOthers' },
                { role: 'unhide' },
                { type: 'separator' },
                { role: 'quit' },
            ],
        });
    }
    const menu = electron_1.Menu.buildFromTemplate(template);
    electron_1.Menu.setApplicationMenu(menu);
}
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 1024,
        minHeight: 600,
        title: 'Orbis Dashboard',
        show: false,
        backgroundColor: '#ffffff',
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            preload: path_1.default.join(__dirname, 'preload.js'),
            webSecurity: true,
        },
    });
    createMenu(mainWindow);
    if (isDev) {
        mainWindow.loadURL('http://localhost:5173').catch((err) => {
            console.error('Failed to load dev server:', err.message);
        });
        mainWindow.webContents.openDevTools();
    }
    else {
        mainWindow.loadFile(path_1.default.join(__dirname, '..', 'dist', 'index.html')).catch((err) => {
            console.error('Failed to load production build:', err.message);
        });
    }
    mainWindow.once('ready-to-show', () => {
        mainWindow?.show();
    });
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}
electron_1.app.whenReady().then(() => {
    // Handle save dialog requests from the renderer via preload
    electron_1.ipcMain.handle('show-save-dialog', async (_event, options) => {
        const win = electron_1.BrowserWindow.getFocusedWindow();
        return win
            ? electron_1.dialog.showSaveDialog(win, options)
            : electron_1.dialog.showSaveDialog(options);
    });
    createWindow();
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
