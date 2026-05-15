export type UserRole = 'admin' | 'operator' | 'viewer'

export interface User {
  id: string
  email: string
  full_name: string
  role: UserRole
  is_active: boolean
  created_at: string
}

export type DeviceStatus = 'online' | 'offline' | 'unknown' | 'revoked'
export type Platform = 'windows' | 'linux' | 'macos' | 'android'

export type LogLevel = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL'

export interface LogConfig {
  interval_sec: number
  levels: LogLevel[]
  sources: string[]
}

export interface Device {
  id: string
  device_id: string
  nom: string
  hostname: string
  plateforme: Platform
  os_version: string
  architecture: string
  statut: DeviceStatus
  version_agent: string
  derniere_connexion: string
  config_logs: LogConfig
  groupe_ids: string[]
  created_at: string
  metadata: Record<string, unknown>
  // Optional metrics from heartbeat
  cpu_percent?: number
  ram_percent?: number
  disk_percent?: number
  storage_percent?: number
  battery_level?: number
  battery_charging?: boolean
  network_type?: string
  uptime_sec?: number
  revoked?: boolean
}

export interface Log {
  id: string
  device_id: string
  timestamp: string
  level: LogLevel
  source: string
  message: string
  metadata: Record<string, unknown>
  received_at?: string
}

export type CommandStatus = 'pending' | 'sent' | 'acknowledged' | 'executing' | 'success' | 'failed'
export type CommandType = 'shell' | 'restart_service' | 'collect_now' | 'scan_network' | 'get_info' | 'agent_update'

export interface Command {
  id: string
  command_id: string
  device_id: string
  type: CommandType
  payload: Record<string, unknown>
  timeout_sec: number
  statut: CommandStatus
  resultat: string | null
  error_message: string | null
  exit_code: number | null
  cree_le: string
  envoye_le: string | null
  acquitte_le: string | null
  execute_le: string | null
  termine_le: string | null
  cree_par: string
}

export interface CommandCreate {
  type: CommandType
  payload: Record<string, unknown>
  timeout_sec?: number
}

export type ActionType = 'shell' | 'api' | 'script' | 'system'
export type ParameterType = 'string' | 'int' | 'bool' | 'enum'

export interface ActionParameter {
  nom: string
  type: ParameterType
  requis: boolean
  valeur_defaut: string
  description: string
  enum_values: string[]
}

export interface Action {
  id: string
  nom: string
  description: string
  type: ActionType
  script_template: string
  parametres: ActionParameter[]
  compatible_plateformes: Platform[]
  cree_le: string
}

export type StepCondition = 'always' | 'on_success' | 'on_failure'

export interface InstructionStep {
  ordre: number
  action_id: string
  parametres: Record<string, unknown>
  condition_continuer: StepCondition
  timeout_sec: number
}

export type TriggerType = 'manual' | 'alert' | 'schedule'

export interface Instruction {
  id: string
  nom: string
  description: string
  etapes: InstructionStep[]
  trigger: TriggerType
  schedule_cron?: string
  cree_le: string
  cree_par?: string
  is_active?: boolean
}

export interface Group {
  id: string
  nom: string
  description: string
  device_ids: string[]
  plateforme?: string
  cree_le: string
}

export type AlertScope = 'device' | 'group'
export type AlertConditionType = 'log_level' | 'inactivity' | 'metadata_threshold'
export type AlertConditionOperator = 'eq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains'

export interface AlertCondition {
  type: AlertConditionType
  valeur: string | number        // log_level → level string; inactivity → minutes; metadata → threshold
  operateur: AlertConditionOperator
  metadata_key?: string          // only for metadata_threshold
}

export interface AlertHistoryEntry {
  triggered_at: string           // backend field name
  device_id: string
  context: Record<string, unknown>
}

export interface Alert {
  id: string
  nom: string
  scope: AlertScope
  scope_id: string               // device.device_id for device scope, group._id for group scope
  condition: AlertCondition
  action_id: string | null
  webhook_url: string | null
  email_recipients: string[]     // list of email addresses to notify
  email_cooldown_minutes: number // min delay between two emails for the same alert (0 = no delay)
  email_last_sent_at?: string | null
  actif: boolean
  derniere_declenchee?: string | null
  historique: AlertHistoryEntry[]
  cree_le?: string
  cree_par?: string
}

export interface AgentVersion {
  id: string
  version: string
  plateforme: Platform
  url_download: string
  hash_sha256: string
  changelog: string
  date_release: string
  is_current: boolean
}

export interface AuditLog {
  id: string
  operateur_id: string
  operateur_email: string
  action_type: string
  device_id: string | null
  payload: Record<string, unknown>
  timestamp: string
  resultat: 'success' | 'failure'
  ip_address: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  skip: number
  limit: number
}

export interface Notification {
  id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  timestamp: string
  read: boolean
}

export interface HealthStatus {
  status: string
  version: string
  mqtt_connected: boolean
  db_connected: boolean
  ws_clients: number
}

export interface DeviceFilters {
  groupe_id?: string
  statut?: string
  plateforme?: string
  search?: string
  skip?: number
  limit?: number
}

export interface LogFilter {
  device_id?: string
  plateforme?: string
  level?: LogLevel
  source?: string
  search?: string
  start_date?: string
  end_date?: string
  skip?: number
  limit?: number
}
