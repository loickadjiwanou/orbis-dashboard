import { contextBridge, ipcRenderer, shell } from 'electron'

export interface ElectronAPI {
  getAppVersion(): string
  getPlatform(): string
  openExternal(url: string): void
  showSaveDialog(options: {
    defaultPath: string
    filters: Array<{ name: string; extensions: string[] }>
  }): Promise<string | undefined>
}

contextBridge.exposeInMainWorld('electronAPI', {
  getAppVersion(): string {
    return process.env.npm_package_version ?? '1.0.0'
  },

  getPlatform(): string {
    return process.platform
  },

  openExternal(url: string): void {
    shell.openExternal(url).catch((err: Error) => {
      console.error('Failed to open external URL:', err.message)
    })
  },

  async showSaveDialog(options: {
    defaultPath: string
    filters: Array<{ name: string; extensions: string[] }>
  }): Promise<string | undefined> {
    const result = await ipcRenderer.invoke('show-save-dialog', options) as { canceled: boolean; filePath?: string }
    if (result.canceled) return undefined
    return result.filePath
  },
} satisfies ElectronAPI)

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
