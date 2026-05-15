import { create } from 'zustand'
import type { Device } from '@/types'
import type { DeviceStatusData } from '@/types/websocket'

interface DeviceState {
  devices: Map<string, Device>
  setDevices(devices: Device[]): void
  updateDevice(update: DeviceStatusData): void
  getOnlineCount(): number
  getOfflineCount(): number
  getDevice(deviceId: string): Device | undefined
}

const useDeviceStore = create<DeviceState>()((set, get) => ({
  devices: new Map<string, Device>(),

  setDevices(devices: Device[]): void {
    const map = new Map<string, Device>()
    for (const device of devices) {
      map.set(device.device_id, device)
    }
    set({ devices: map })
  },

  updateDevice(update: DeviceStatusData): void {
    set((state) => {
      const existing = state.devices.get(update.device_id)
      if (!existing) return state

      const updated: Device = {
        ...existing,
        statut: update.statut as Device['statut'],
        version_agent: update.version ?? existing.version_agent,
        derniere_connexion: update.derniere_connexion ?? existing.derniere_connexion,
        cpu_percent: update.cpu_percent ?? existing.cpu_percent,
        ram_percent: update.ram_percent ?? existing.ram_percent,
      }

      const next = new Map(state.devices)
      next.set(update.device_id, updated)
      return { devices: next }
    })
  },

  getOnlineCount(): number {
    let count = 0
    for (const device of get().devices.values()) {
      if (device.statut === 'online') count++
    }
    return count
  },

  getOfflineCount(): number {
    let count = 0
    for (const device of get().devices.values()) {
      if (device.statut === 'offline') count++
    }
    return count
  },

  getDevice(deviceId: string): Device | undefined {
    return get().devices.get(deviceId)
  },
}))

export default useDeviceStore
