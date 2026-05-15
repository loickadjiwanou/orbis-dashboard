import { app, BrowserWindow, Menu, shell, ipcMain, dialog } from 'electron'

// Suppress DevTools protocol warnings for unimplemented Autofill commands
app.commandLine.appendSwitch('disable-features', 'AutofillServerCommunication')
import path from 'path'

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

let mainWindow: BrowserWindow | null = null

function createMenu(win: BrowserWindow): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Quit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => app.quit(),
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
            const level = win.webContents.getZoomLevel()
            win.webContents.setZoomLevel(level + 0.5)
          },
        },
        {
          label: 'Zoom Out',
          accelerator: 'CmdOrCtrl+-',
          click: () => {
            const level = win.webContents.getZoomLevel()
            win.webContents.setZoomLevel(level - 0.5)
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
            await shell.openExternal('https://orbis.io')
          },
        },
        {
          label: `Version ${app.getVersion()}`,
          enabled: false,
        },
      ],
    },
  ]

  if (process.platform === 'darwin') {
    template.unshift({
      label: app.name,
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
    })
  }

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
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
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true,
    },
  })

  createMenu(mainWindow)

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173').catch((err: Error) => {
      console.error('Failed to load dev server:', err.message)
    })
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html')).catch((err: Error) => {
      console.error('Failed to load production build:', err.message)
    })
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  // Handle save dialog requests from the renderer via preload
  ipcMain.handle(
    'show-save-dialog',
    async (
      _event,
      options: { defaultPath: string; filters: Array<{ name: string; extensions: string[] }> },
    ) => {
      const win = BrowserWindow.getFocusedWindow()
      return win
        ? dialog.showSaveDialog(win, options)
        : dialog.showSaveDialog(options)
    },
  )

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
