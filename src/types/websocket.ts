import type { Log, Alert } from './index'

export interface WSEnvelope<T> {
  event: WSEventType
  data: T
  timestamp: string
}

export type WSEventType =
  | 'device_registered'
  | 'device_status'
  | 'new_log'
  | 'command_update'
  | 'alert_triggered'
  | 'discovery_update'
  | 'agent_update_progress'
  | 'system_notification'

export interface SystemNotificationData {
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
}

export interface DeviceRegisteredData {
  device_id: string
  nom: string
  plateforme: string
  version: string
  statut: string
}

export interface DeviceStatusData {
  device_id: string
  statut: string
  version: string
  derniere_connexion: string
  cpu_percent: number | null
  ram_percent: number | null
}

export interface CommandUpdateData {
  command_id: string
  device_id: string
  statut: string
  output: string | null
  error: string | null
  exit_code: number | null
  termine_le: string | null
}

export interface DiscoveryUpdateData {
  device_id: string
  neighbors_count: number
  network: string
}

export interface AgentUpdateProgressData {
  command_id: string
  device_id: string
  statut: string
  step: 'downloading' | 'verifying' | 'replacing' | 'restarting' | 'success' | 'rollback'
  output: string | null
  error: string | null
}

export type WSEventHandlers = {
  device_registered?: (data: DeviceRegisteredData) => void
  device_status?: (data: DeviceStatusData) => void
  new_log?: (data: Log) => void
  command_update?: (data: CommandUpdateData) => void
  alert_triggered?: (data: Alert) => void
  discovery_update?: (data: DiscoveryUpdateData) => void
  agent_update_progress?: (data: AgentUpdateProgressData) => void
  system_notification?: (data: SystemNotificationData) => void
}
