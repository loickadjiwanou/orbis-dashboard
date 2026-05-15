import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import wsService from '@/services/websocket'
import useAuthStore from '@/stores/authStore'
import useDeviceStore from '@/stores/deviceStore'
import useUIStore from '@/stores/uiStore'
import type { DeviceStatusData } from '@/types/websocket'
import type { Alert } from '@/types'

export function useWebSocket(): { isConnected: boolean } {
  const accessToken = useAuthStore((s) => s.accessToken)
  const wsConnected = useUIStore((s) => s.wsConnected)
  const setWsConnected = useUIStore((s) => s.setWsConnected)
  const updateDevice = useDeviceStore((s) => s.updateDevice)
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!accessToken) return

    // Connect WebSocket
    wsService.connect(accessToken)

    // Track connection state
    const unsubConnection = wsService.onConnectionChange((connected) => {
      setWsConnected(connected)
    })

    // Update device metrics on status events
    const unsubStatus = wsService.on('device_status', (data: DeviceStatusData) => {
      updateDevice(data)
    })

    // Show notification when a new device registers and refresh device list
    const unsubRegistered = wsService.on('device_registered', (data) => {
      useUIStore.getState().addNotification({
        title: 'New Device Registered',
        message: `${data.nom ?? data.device_id} (${data.plateforme}) connected`,
        type: 'info',
      })
      queryClient.invalidateQueries({ queryKey: ['devices'] })
    })

    // Show notification when alert triggers
    const unsubAlert = wsService.on('alert_triggered', (data: Alert) => {
      useUIStore.getState().addNotification({
        title: 'Alert Triggered',
        message: data.nom,
        type: 'warning',
      })
    })

    // System notifications pushed by the backend (e.g. SMTP check result)
    const unsubSystem = wsService.on('system_notification', (data) => {
      useUIStore.getState().addNotification({
        title: data.title,
        message: data.message,
        type: data.type,
      })
    })

    return () => {
      unsubConnection()
      unsubStatus()
      unsubRegistered()
      unsubAlert()
      unsubSystem()
    }
  }, [accessToken, setWsConnected, updateDevice, queryClient])

  return { isConnected: wsConnected }
}
