import axios, { type AxiosInstance, type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios'
import type {
  User,
  Device,
  Log,
  Command,
  CommandCreate,
  Group,
  Action,
  Instruction,
  Alert,
  AgentVersion,
  AuditLog,
  PaginatedResponse,
  HealthStatus,
  DeviceFilters,
  LogFilter,
} from '@/types'

// Token getter avoids circular import with authStore
let _getToken: (() => string | null) | null = null
let _onUnauthorized: (() => void) | null = null

export function configureApiAuth(
  getToken: () => string | null,
  onUnauthorized: () => void,
): void {
  _getToken = getToken
  _onUnauthorized = onUnauthorized
}

function getBaseUrl(): string {
  return localStorage.getItem('orbis-api-url') ?? 'http://localhost:8000'
}

const api: AxiosInstance = axios.create({
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
})

// Request interceptor — attach Bearer token
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  config.baseURL = getBaseUrl()
  const token = _getToken?.()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Track ongoing refresh to avoid duplicate calls
let refreshPromise: Promise<string> | null = null

async function doRefresh(): Promise<string> {
  const stored = localStorage.getItem('orbis-auth')
  if (!stored) throw new Error('No auth state')
  const parsed = JSON.parse(stored) as { state?: { refreshToken?: string } }
  const rt = parsed?.state?.refreshToken
  if (!rt) throw new Error('No refresh token')

  const baseUrl = getBaseUrl()
  const response = await axios.post<{ access_token: string }>(
    `${baseUrl}/auth/refresh`,
    { refresh_token: rt },
  )
  return response.data.access_token
}

// Response interceptor — handle 401 with token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    const axiosError = error as { response?: { status: number }; config?: AxiosRequestConfig & { _retry?: boolean } }
    const status = axiosError.response?.status
    const config = axiosError.config

    if (status === 401 && config && !config._retry) {
      config._retry = true
      try {
        if (!refreshPromise) {
          refreshPromise = doRefresh().finally(() => { refreshPromise = null })
        }
        const newToken = await refreshPromise

        // Update stored token
        const stored = localStorage.getItem('orbis-auth')
        if (stored) {
          const parsed = JSON.parse(stored) as { state?: Record<string, unknown> }
          if (parsed.state) {
            parsed.state.accessToken = newToken
            localStorage.setItem('orbis-auth', JSON.stringify(parsed))
          }
        }

        if (config.headers) {
          (config.headers as Record<string, string>).Authorization = `Bearer ${newToken}`
        }
        return api(config)
      } catch {
        _onUnauthorized?.()
        return Promise.reject(error)
      }
    }

    return Promise.reject(error)
  },
)

// ─── Auth ───────────────────────────────────────────────────────────────────

export async function checkSetup(): Promise<{ setup_required: boolean }> {
  const { data } = await api.get<{ setup_required: boolean }>('/auth/setup')
  return data
}

export async function initialSetup(payload: {
  email: string
  password: string
  full_name: string
}): Promise<{ access_token: string; refresh_token: string; user: User }> {
  const { data } = await api.post<{ access_token: string; refresh_token: string; user: User }>(
    '/auth/setup',
    payload,
  )
  return data
}

export async function login(
  email: string,
  password: string,
): Promise<{ access_token: string; refresh_token: string; user: User }> {
  const { data } = await api.post<{ access_token: string; refresh_token: string; user: User }>(
    '/auth/login',
    { email, password },
  )
  return data
}

export async function register(payload: {
  email: string
  password: string
  full_name: string
}): Promise<{ access_token: string; refresh_token: string; user: User }> {
  const { data } = await api.post<{ access_token: string; refresh_token: string; user: User }>(
    '/auth/register',
    payload,
  )
  return data
}

export async function refresh(refreshToken: string): Promise<{ access_token: string }> {
  const { data } = await api.post<{ access_token: string }>('/auth/refresh', {
    refresh_token: refreshToken,
  })
  return data
}

export async function getMe(): Promise<User> {
  const { data } = await api.get<User>('/auth/me')
  return data
}

// ─── Devices ────────────────────────────────────────────────────────────────

export async function getDevices(params?: DeviceFilters): Promise<PaginatedResponse<Device>> {
  const { data } = await api.get<PaginatedResponse<Device>>('/devices', { params })
  return data
}

export async function getDevice(id: string): Promise<Device> {
  const { data } = await api.get<Device>(`/devices/${id}`)
  return data
}

export async function updateDevice(
  id: string,
  payload: Partial<Pick<Device, 'nom'>>,
): Promise<Device> {
  const { data } = await api.patch<Device>(`/devices/${id}`, payload)
  return data
}

export async function revokeDevice(id: string): Promise<{ message: string }> {
  const { data } = await api.delete<{ message: string }>(`/devices/${id}`)
  return data
}

export async function deleteDevice(id: string): Promise<{ message: string }> {
  const { data } = await api.delete<{ message: string }>(`/devices/${id}/hard`)
  return data
}

export async function sendCommand(deviceId: string, command: CommandCreate): Promise<Command> {
  const { data } = await api.post<Command>(`/devices/${deviceId}/command`, command)
  return data
}

export async function triggerUpdate(deviceId: string, versionId: string): Promise<Command> {
  const { data } = await api.post<Command>(`/devices/${deviceId}/update`, {
    version_id: versionId,
  })
  return data
}

export async function getDeviceLogs(
  deviceId: string,
  params?: LogFilter,
): Promise<PaginatedResponse<Log>> {
  const { data } = await api.get<PaginatedResponse<Log>>(`/devices/${deviceId}/logs`, {
    params,
  })
  return data
}

export async function getAllLogs(params?: LogFilter): Promise<PaginatedResponse<Log>> {
  const { data } = await api.get<PaginatedResponse<Log>>('/logs', { params })
  return data
}

export async function getAllAgentLogs(params?: LogFilter): Promise<PaginatedResponse<Log>> {
  const { data } = await api.get<PaginatedResponse<Log>>('/agent-logs', { params })
  return data
}

export async function getDeviceCommands(
  deviceId: string,
  params?: { statut?: string; skip?: number; limit?: number },
): Promise<PaginatedResponse<Command>> {
  const { data } = await api.get<PaginatedResponse<Command>>(
    `/devices/${deviceId}/commands`,
    { params },
  )
  return data
}

export async function getAllCommands(params?: {
  device_id?: string
  statut?: string
  type?: string
  skip?: number
  limit?: number
}): Promise<PaginatedResponse<Command>> {
  const { data } = await api.get<PaginatedResponse<Command>>('/commands', { params })
  return data
}

// ─── Groups ─────────────────────────────────────────────────────────────────

// FastAPI serializes Pydantic models with by_alias=True, so MongoDB _id comes
// back as "_id". Normalize it to "id" so the frontend Group interface works.
function normalizeGroup(raw: Record<string, unknown>): Group {
  const id = (raw['_id'] ?? raw['id'] ?? '') as string
  return { ...raw, id } as Group
}

export async function getGroups(): Promise<Group[]> {
  const { data } = await api.get<{ items: Record<string, unknown>[]; total: number } | Record<string, unknown>[]>('/groups')
  const items = Array.isArray(data) ? data : data.items
  return items.map(normalizeGroup)
}

export async function getGroup(id: string): Promise<Group> {
  const { data } = await api.get<Record<string, unknown>>(`/groups/${id}`)
  return normalizeGroup(data)
}

export async function createGroup(payload: {
  nom: string
  description: string
  device_ids: string[]
  plateforme?: string
}): Promise<Group> {
  const { data } = await api.post<Record<string, unknown>>('/groups', payload)
  return normalizeGroup(data)
}

export async function updateGroup(id: string, payload: Partial<Group>): Promise<Group> {
  const { data } = await api.patch<Record<string, unknown>>(`/groups/${id}`, payload)
  return normalizeGroup(data)
}

export async function deleteGroup(id: string): Promise<{ message: string }> {
  const { data } = await api.delete<{ message: string }>(`/groups/${id}`)
  return data
}

export async function addDevicesToGroup(
  groupId: string,
  deviceIds: string[],
): Promise<Group> {
  const { data } = await api.post<Record<string, unknown>>(`/groups/${groupId}/devices`, { device_ids: deviceIds })
  return normalizeGroup(data)
}

export async function removeDevicesFromGroup(
  groupId: string,
  deviceIds: string[],
): Promise<Group> {
  const { data } = await api.delete<Record<string, unknown>>(`/groups/${groupId}/devices`, {
    data: { device_ids: deviceIds },
  })
  return normalizeGroup(data)
}

export async function sendGroupCommand(
  groupId: string,
  command: CommandCreate,
): Promise<{ results: Array<{ device_id: string; command_id?: string; status: string; error?: string }> }> {
  const { data } = await api.post<{ results: Array<{ device_id: string; command_id?: string; status: string; error?: string }> }>(`/groups/${groupId}/command`, command)
  return data
}

export async function triggerGroupUpdate(
  groupId: string,
  versionId: string,
): Promise<{ results: Array<{ device_id: string; command_id?: string; status: string; error?: string }>; version: string }> {
  const { data } = await api.post<{ results: Array<{ device_id: string; command_id?: string; status: string; error?: string }>; version: string }>(
    `/groups/${groupId}/update`,
    { version_id: versionId },
  )
  return data
}

// ─── Actions ────────────────────────────────────────────────────────────────

// FastAPI serializes _id alias → normalize to id, same pattern as groups
function normalizeAction(raw: Record<string, unknown>): Action {
  const id = (raw['_id'] ?? raw['id'] ?? '') as string
  return { ...raw, id } as Action
}

export async function getActions(): Promise<Action[]> {
  const { data } = await api.get<{ items: Record<string, unknown>[]; total: number } | Record<string, unknown>[]>('/actions')
  const items = Array.isArray(data) ? data : data.items
  return items.map(normalizeAction)
}

export async function createAction(payload: Omit<Action, 'id' | 'cree_le'>): Promise<Action> {
  const { data } = await api.post<Record<string, unknown>>('/actions', payload)
  return normalizeAction(data)
}

export async function updateAction(id: string, payload: Partial<Action>): Promise<Action> {
  const { data } = await api.patch<Record<string, unknown>>(`/actions/${id}`, payload)
  return normalizeAction(data)
}

export async function deleteAction(id: string): Promise<{ message: string }> {
  const { data } = await api.delete<{ message: string }>(`/actions/${id}`)
  return data
}

export interface ActionExecuteResult {
  action_id: string
  results: Array<{ device_id: string; command_id?: string; status: string; error?: string }>
}

export async function executeAction(
  id: string,
  payload: {
    device_id?: string
    group_id?: string
    parametres?: Record<string, unknown>
  },
): Promise<ActionExecuteResult> {
  const { data } = await api.post<ActionExecuteResult>(`/actions/${id}/execute`, payload)
  return data
}

// ─── Instructions ────────────────────────────────────────────────────────────

export interface InstructionExecuteResult {
  instruction_id: string
  devices: Record<string, Array<{
    step: number
    command_id?: string
    status: 'sent' | 'failed' | 'skipped'
    error?: string
    reason?: string
  }>>
}

function normalizeInstruction(raw: Record<string, unknown>): Instruction {
  const id = (raw['_id'] ?? raw['id'] ?? '') as string
  return { ...raw, id } as Instruction
}

export async function getInstructions(): Promise<Instruction[]> {
  const { data } = await api.get<{ items: Record<string, unknown>[]; total: number } | Record<string, unknown>[]>('/instructions')
  const items = Array.isArray(data) ? data : data.items
  return items.map(normalizeInstruction)
}

export async function createInstruction(
  payload: Omit<Instruction, 'id' | 'cree_le' | 'cree_par' | 'is_active'>,
): Promise<Instruction> {
  const { data } = await api.post<Record<string, unknown>>('/instructions', payload)
  return normalizeInstruction(data)
}

export async function updateInstruction(
  id: string,
  payload: Partial<Omit<Instruction, 'id' | 'cree_le' | 'cree_par'>>,
): Promise<Instruction> {
  const { data } = await api.patch<Record<string, unknown>>(`/instructions/${id}`, payload)
  return normalizeInstruction(data)
}

export async function deleteInstruction(id: string): Promise<void> {
  await api.delete(`/instructions/${id}`)
}

export async function executeInstruction(
  id: string,
  payload: { device_id?: string; group_id?: string },
): Promise<InstructionExecuteResult> {
  const { data } = await api.post<InstructionExecuteResult>(`/instructions/${id}/execute`, payload)
  return data
}

// ─── Alerts ─────────────────────────────────────────────────────────────────

function normalizeAlert(raw: Record<string, unknown>): Alert {
  const id = (raw['_id'] ?? raw['id'] ?? '') as string
  return { ...raw, id } as Alert
}

export async function getAlerts(): Promise<Alert[]> {
  const { data } = await api.get<{ items: Record<string, unknown>[]; total: number } | Record<string, unknown>[]>('/alerts')
  const items = Array.isArray(data) ? data : data.items
  return items.map(normalizeAlert)
}

export async function createAlert(
  payload: Pick<Alert, 'nom' | 'scope' | 'scope_id' | 'condition' | 'action_id' | 'webhook_url' | 'email_recipients' | 'email_cooldown_minutes'>,
): Promise<Alert> {
  const { data } = await api.post<Record<string, unknown>>('/alerts', payload)
  return normalizeAlert(data)
}

export async function updateAlert(id: string, payload: Partial<Pick<Alert, 'nom' | 'condition' | 'action_id' | 'webhook_url' | 'email_recipients' | 'email_cooldown_minutes' | 'actif'>>): Promise<Alert> {
  const { data } = await api.patch<Record<string, unknown>>(`/alerts/${id}`, payload)
  return normalizeAlert(data)
}

export async function deleteAlert(id: string): Promise<void> {
  await api.delete(`/alerts/${id}`)
}

export async function toggleAlert(id: string): Promise<Alert> {
  const { data } = await api.post<Record<string, unknown>>(`/alerts/${id}/toggle`)
  return normalizeAlert(data)
}

// ─── Agent Versions ──────────────────────────────────────────────────────────

export async function getAgentVersions(plateforme?: string): Promise<AgentVersion[]> {
  const { data } = await api.get<{ items: AgentVersion[]; total: number } | AgentVersion[]>(
    '/agent-versions',
    { params: plateforme ? { plateforme } : undefined },
  )
  return Array.isArray(data) ? data : data.items
}

export async function createAgentVersion(payload: {
  version: string
  plateforme: string
  url_download: string
  hash_sha256: string
  changelog: string
  date_release?: string
}): Promise<AgentVersion> {
  const { data } = await api.post<AgentVersion>('/agent-versions', payload)
  return data
}

export async function setCurrentVersion(id: string): Promise<AgentVersion> {
  const { data } = await api.patch<AgentVersion>(`/agent-versions/${id}/set-current`)
  return data
}

export async function deleteAgentVersion(id: string): Promise<void> {
  await api.delete(`/agent-versions/${id}`)
}

// ─── Audit ───────────────────────────────────────────────────────────────────

export interface AuditFilters {
  action_type?: string
  resultat?: string
  device_id?: string
  operateur_id?: string
  start_date?: string
  end_date?: string
  skip?: number
  limit?: number
}

export async function getAuditLogs(params?: AuditFilters): Promise<PaginatedResponse<AuditLog>> {
  const { data } = await api.get<PaginatedResponse<AuditLog>>('/audit', { params })
  return data
}

export async function exportAuditCsv(params?: Omit<AuditFilters, 'skip' | 'limit'>): Promise<Blob> {
  const { data } = await api.get<Blob>('/audit/export', {
    responseType: 'blob',
    params,
  })
  return data
}

// ─── Health ──────────────────────────────────────────────────────────────────

export async function getHealth(): Promise<HealthStatus> {
  const { data } = await api.get<HealthStatus>('/health')
  return data
}

export default api
