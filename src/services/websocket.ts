import type { WSEventType, WSEventHandlers, WSEnvelope, SystemNotificationData } from '@/types/websocket'
import type {
  DeviceRegisteredData,
  DeviceStatusData,
  CommandUpdateData,
  DiscoveryUpdateData,
  AgentUpdateProgressData,
} from '@/types/websocket'
import type { Log, Alert } from '@/types'

type HandlerMap = {
  [K in WSEventType]: Set<(data: unknown) => void>
}

const INITIAL_DELAY = 1_000
const MAX_DELAY = 60_000

class WebSocketService {
  private socket: WebSocket | null = null
  private token: string | null = null
  private reconnectDelay = INITIAL_DELAY
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private shouldReconnect = false
  private connectionChangeListeners: Set<(connected: boolean) => void> = new Set()

  private handlers: HandlerMap = {
    device_registered: new Set(),
    device_status: new Set(),
    new_log: new Set(),
    command_update: new Set(),
    alert_triggered: new Set(),
    discovery_update: new Set(),
    agent_update_progress: new Set(),
    system_notification: new Set(),
  }

  connect(token: string): void {
    this.token = token
    this.shouldReconnect = true
    this.reconnectDelay = INITIAL_DELAY
    this.openSocket()
  }

  disconnect(): void {
    this.shouldReconnect = false
    this.clearReconnectTimer()
    if (this.socket) {
      this.socket.close(1000, 'Intentional disconnect')
      this.socket = null
    }
    this.notifyConnectionChange(false)
  }

  on<K extends WSEventType>(
    event: K,
    handler: (data: WSEventHandlers[K] extends ((data: infer D) => void) | undefined ? D : never) => void,
  ): () => void {
    const set = this.handlers[event]
    const wrapped = handler as (data: unknown) => void
    set.add(wrapped)
    return () => set.delete(wrapped)
  }

  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN
  }

  onConnectionChange(listener: (connected: boolean) => void): () => void {
    this.connectionChangeListeners.add(listener)
    return () => this.connectionChangeListeners.delete(listener)
  }

  private openSocket(): void {
    if (
      this.socket?.readyState === WebSocket.OPEN ||
      this.socket?.readyState === WebSocket.CONNECTING
    ) return

    const baseUrl = localStorage.getItem('orbis-api-url') ?? 'http://localhost:8000'
    const wsUrl = baseUrl.replace(/^http/, 'ws')
    const url = `${wsUrl}/ws/connect?token=${encodeURIComponent(this.token ?? '')}`

    try {
      this.socket = new WebSocket(url)
    } catch (err) {
      console.warn('[WS] Failed to create WebSocket:', err)
      this.scheduleReconnect()
      return
    }

    this.socket.onopen = () => {
      console.info('[WS] Connected')
      this.reconnectDelay = INITIAL_DELAY
      this.notifyConnectionChange(true)
    }

    this.socket.onclose = (event) => {
      console.info(`[WS] Closed (code=${event.code})`)
      this.notifyConnectionChange(false)
      if (this.shouldReconnect && event.code !== 1000) {
        this.scheduleReconnect()
      }
    }

    this.socket.onerror = () => {
      console.warn('[WS] Error occurred')
      // onclose will fire after onerror, triggering reconnect
    }

    this.socket.onmessage = (event: MessageEvent<string>) => {
      this.handleMessage(event.data)
    }
  }

  private handleMessage(raw: string): void {
    let envelope: WSEnvelope<unknown>
    try {
      envelope = JSON.parse(raw) as WSEnvelope<unknown>
    } catch {
      console.warn('[WS] Failed to parse message:', raw.slice(0, 200))
      return
    }

    const { event, data } = envelope
    if (!event || !(event in this.handlers)) {
      console.warn('[WS] Unknown event type:', event)
      return
    }

    this.dispatch(event, data)
  }

  private dispatch(event: WSEventType, data: unknown): void {
    const set = this.handlers[event]
    for (const handler of set) {
      try {
        handler(data)
      } catch (err) {
        console.error(`[WS] Handler error for event "${event}":`, err)
      }
    }
  }

  private scheduleReconnect(): void {
    this.clearReconnectTimer()
    const delay = this.reconnectDelay
    console.info(`[WS] Reconnecting in ${delay}ms…`)
    this.reconnectTimer = setTimeout(() => {
      this.reconnectDelay = Math.min(delay * 2, MAX_DELAY)
      this.openSocket()
    }, delay)
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  private notifyConnectionChange(connected: boolean): void {
    for (const listener of this.connectionChangeListeners) {
      listener(connected)
    }
  }
}

const wsService = new WebSocketService()
export default wsService

// Re-export types for convenience
export type {
  DeviceRegisteredData,
  DeviceStatusData,
  CommandUpdateData,
  DiscoveryUpdateData,
  AgentUpdateProgressData,
  SystemNotificationData,
  Log,
  Alert,
}
