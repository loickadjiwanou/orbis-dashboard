import React, { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  RefreshCw,
  Terminal,
  Trash2,
  ShieldOff,
  Cpu,
  MemoryStick,
  HardDrive,
  Battery,
  Wifi,
  Monitor,
  Clock,
  Calendar,
  Hash,
  Layers,
  GitBranch,
  Activity,
  AlertTriangle,
  Info,
  Download,
  ScanLine,
  Play,
  ChevronRight,
  X,
  LayoutList,
  Zap,
  ChevronDown,
  Loader2,
} from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import { useQuery, useMutation } from '@tanstack/react-query'
import { PageHeader } from '@/components/layout/PageHeader'
import { DeviceStatusBadge } from '@/components/shared/DeviceStatusBadge'
import { CommandLifecycle } from '@/components/shared/CommandLifecycle'
import { LogLevelBadge } from '@/components/shared/LogLevelBadge'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useDevice, useSendCommand, useRevokeDevice, useDeleteDevice } from '@/hooks/useDevices'
import { useDeviceCommands } from '@/hooks/useCommands'
import { useDeviceLogs } from '@/hooks/useLogs'
import * as api from '@/services/api'
import { formatDate, formatRelativeTime, cn } from '@/lib/utils'
import type { Command, Platform, Action, ActionParameter } from '@/types'
import useAuthStore from '@/stores/authStore'

// ── Command catalog ───────────────────────────────────────────────────────────

interface CatalogEntry {
  type: string
  label: string
  description: string
  icon: React.ElementType
  color: string
  bg: string
  requiresInput?: boolean
  inputPlaceholder?: string
  presets?: Array<{ label: string; value: string }>
}

const CATALOG_DESKTOP_COMMON: CatalogEntry[] = [
  {
    type: 'get_info',
    label: 'Get Device Info',
    description: 'Return full device metadata: version, platform, hardware.',
    icon: Info,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
  },
  {
    type: 'collect_now',
    label: 'Collect Now',
    description: 'Force an immediate log and metrics collection cycle.',
    icon: Activity,
    color: 'text-teal-400',
    bg: 'bg-teal-500/10',
  },
  {
    type: 'scan_network',
    label: 'Scan Network',
    description: 'Discover neighbouring hosts and open ports on the local network.',
    icon: ScanLine,
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
  },
  {
    type: 'restart_service',
    label: 'Restart Agent',
    description: 'Restart the Orbis agent service on the device.',
    icon: RefreshCw,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
  },
  {
    type: 'agent_update',
    label: 'Update Agent',
    description: 'Deploy a new version of the Orbis agent (managed via Updates page).',
    icon: Download,
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
  },
]

const CATALOG_SHELL_LINUX: CatalogEntry = {
  type: 'shell',
  label: 'Shell Command',
  description: 'Execute any arbitrary shell command on the device.',
  icon: Terminal,
  color: 'text-emerald-400',
  bg: 'bg-emerald-500/10',
  requiresInput: true,
  inputPlaceholder: 'e.g. df -h',
  presets: [
    { label: 'System info', value: 'uname -a' },
    { label: 'Disk', value: 'df -h' },
    { label: 'Memory', value: 'free -h' },
    { label: 'Top processes', value: 'ps aux --sort=-%cpu | head -10' },
    { label: 'Network', value: 'ip addr show' },
    { label: 'Uptime', value: 'uptime' },
    { label: 'CPU info', value: 'lscpu' },
    { label: 'Open ports', value: 'ss -tlnp' },
  ],
}

const CATALOG_SHELL_MACOS: CatalogEntry = {
  type: 'shell',
  label: 'Shell Command',
  description: 'Execute any arbitrary shell command on the device.',
  icon: Terminal,
  color: 'text-emerald-400',
  bg: 'bg-emerald-500/10',
  requiresInput: true,
  inputPlaceholder: 'e.g. vm_stat',
  presets: [
    { label: 'System info', value: 'uname -a' },
    { label: 'Disk', value: 'df -h' },
    { label: 'Memory', value: 'vm_stat' },
    { label: 'Top processes', value: 'ps aux -r | head -10' },
    { label: 'Network', value: 'ifconfig' },
    { label: 'Uptime', value: 'uptime' },
    { label: 'CPU info', value: 'sysctl -n machdep.cpu.brand_string' },
    { label: 'Open ports', value: 'netstat -an | grep LISTEN' },
  ],
}

const CATALOG_SHELL_WINDOWS: CatalogEntry = {
  type: 'shell',
  label: 'Shell Command',
  description: 'Execute any command via cmd.exe on the device.',
  icon: Terminal,
  color: 'text-emerald-400',
  bg: 'bg-emerald-500/10',
  requiresInput: true,
  inputPlaceholder: 'e.g. systeminfo',
  presets: [
    { label: 'System info', value: 'systeminfo' },
    { label: 'Disk', value: 'wmic logicaldisk get size,freespace,caption' },
    { label: 'Processes', value: 'tasklist /fo csv' },
    { label: 'Network', value: 'ipconfig /all' },
    { label: 'Open ports', value: 'netstat -ano' },
    { label: 'Services', value: 'sc query state= all' },
  ],
}

const CATALOG_ANDROID: CatalogEntry[] = [
  {
    type: 'collect_now',
    label: 'Collect Heartbeat',
    description: 'Force an immediate heartbeat: CPU, RAM, battery, network type.',
    icon: Activity,
    color: 'text-teal-400',
    bg: 'bg-teal-500/10',
  },
  {
    type: 'scan_network',
    label: 'Scan Network',
    description: 'Discover reachable hosts and open ports on the local Wi-Fi network.',
    icon: ScanLine,
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
  },
  {
    type: 'get_info',
    label: 'Get Device Info',
    description: 'Return full device metadata: model, OS, battery, network, agent version.',
    icon: Info,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
  },
  {
    type: 'restart_service',
    label: 'Restart Agent Service',
    description: 'Stop and restart the OrbisService foreground service.',
    icon: RefreshCw,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
  },
  {
    type: 'agent_update',
    label: 'Update Agent (APK)',
    description: 'Download and launch the APK install prompt (managed via Updates page).',
    icon: Download,
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
  },
]

function getCatalog(platform: Platform | string): CatalogEntry[] {
  if (platform === 'android') return CATALOG_ANDROID
  if (platform === 'windows') return [CATALOG_SHELL_WINDOWS, ...CATALOG_DESKTOP_COMMON]
  if (platform === 'macos') return [CATALOG_SHELL_MACOS, ...CATALOG_DESKTOP_COMMON]
  return [CATALOG_SHELL_LINUX, ...CATALOG_DESKTOP_COMMON]
}

// ── All Commands Modal ────────────────────────────────────────────────────────

function AllCommandsModal({
  open,
  onOpenChange,
  platform,
  onSend,
  isPending,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  platform: Platform | string
  onSend: (type: string, payload?: Record<string, unknown>) => void
  isPending: boolean
}): React.ReactElement {
  const catalog = getCatalog(platform)
  const [inputs, setInputs] = useState<Record<string, string>>({})

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10">
                <LayoutList className="h-4 w-4 text-violet-500" />
              </div>
              <div>
                <Dialog.Title className="text-sm font-semibold text-foreground">
                  All Supported Commands
                </Dialog.Title>
                <Dialog.Description className="text-[11px] text-muted-foreground capitalize">
                  Platform: {platform}
                </Dialog.Description>
              </div>
            </div>
            <Dialog.Close asChild>
              <button className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          {/* Command list */}
          <div className="max-h-[60vh] overflow-y-auto p-4 space-y-2">
            {catalog.map((entry) => {
              const Icon = entry.icon
              const inputVal = inputs[entry.type] ?? ''
              return (
                <div
                  key={entry.type}
                  className="rounded-xl border border-border/60 bg-muted/20 p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', entry.bg)}>
                      <Icon className={cn('h-4 w-4', entry.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-foreground">{entry.label}</p>
                        <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                          {entry.type}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">{entry.description}</p>

                      {/* Shell input */}
                      {entry.requiresInput && (
                        <div className="mt-3 space-y-2">
                          {entry.presets && (
                            <div className="flex flex-wrap gap-1">
                              {entry.presets.map((p) => (
                                <button
                                  key={p.label}
                                  type="button"
                                  onClick={() => setInputs((prev) => ({ ...prev, [entry.type]: p.value }))}
                                  className="rounded-md border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
                                >
                                  {p.label}
                                </button>
                              ))}
                            </div>
                          )}
                          <textarea
                            value={inputVal}
                            onChange={(e) => setInputs((prev) => ({ ...prev, [entry.type]: e.target.value }))}
                            placeholder={entry.inputPlaceholder}
                            rows={2}
                            className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                        </div>
                      )}

                      {/* Execute button */}
                      <button
                        type="button"
                        disabled={isPending || (entry.requiresInput && !inputVal.trim())}
                        onClick={() => {
                          const payload = entry.requiresInput ? { command: inputVal } : {}
                          onSend(entry.type, payload)
                        }}
                        className={cn(
                          'mt-3 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50',
                          entry.type === 'restart_service' || entry.type === 'agent_update'
                            ? 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20'
                            : 'bg-primary/10 text-primary hover:bg-primary/20',
                        )}
                      >
                        <Play className="h-3 w-3" />
                        {isPending ? 'Sending…' : 'Execute'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// ── Action Run Modal ──────────────────────────────────────────────────────────

function ActionRunModal({
  open,
  onOpenChange,
  action,
  onExecute,
  isPending,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  action: Action | null
  onExecute: (params: Record<string, string>) => void
  isPending: boolean
}): React.ReactElement {
  const [params, setParams] = useState<Record<string, string>>({})

  useEffect(() => {
    if (open && action) {
      const defaults: Record<string, string> = {}
      action.parametres.forEach((p: ActionParameter) => {
        defaults[p.nom] = String(p.valeur_defaut ?? '')
      })
      setParams(defaults)
    }
  }, [open, action])

  if (!action) return <></>

  const missingRequired = action.parametres
    .filter((p: ActionParameter) => p.requis && !(params[p.nom]?.trim()))
    .map((p: ActionParameter) => p.nom)

  const previewScript = action.script_template.replace(
    /\{\{(\w+)\}\}/g,
    (_, k) => params[k] || `{{${k}}}`,
  )

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md max-h-[90vh] overflow-y-auto -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-border px-5 py-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10">
                <Zap className="h-4 w-4 text-violet-500" />
              </div>
              <div>
                <Dialog.Title className="text-sm font-semibold">{action.nom}</Dialog.Title>
                {action.description && (
                  <Dialog.Description className="text-[11px] text-muted-foreground">
                    {action.description}
                  </Dialog.Description>
                )}
              </div>
            </div>
            <Dialog.Close asChild>
              <button className="rounded p-1 hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="space-y-4 px-5 py-4">
            {/* Script preview (static) */}
            <div>
              <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Script</p>
              <pre className="rounded-lg bg-muted px-3 py-2 font-mono text-xs text-foreground/80 overflow-x-auto">
                {action.script_template}
              </pre>
            </div>

            {/* Parameters */}
            {action.parametres.map((p: ActionParameter) => (
              <div key={p.nom}>
                <label className="mb-1 flex items-center gap-1.5 text-xs font-medium">
                  <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">{p.nom}</code>
                  {p.requis && <span className="text-destructive">*</span>}
                  {p.description && (
                    <span className="font-normal text-muted-foreground">— {p.description}</span>
                  )}
                </label>

                {p.type === 'bool' ? (
                  <div className="flex gap-4">
                    {['true', 'false'].map((v) => (
                      <label key={v} className="flex cursor-pointer items-center gap-1.5 text-sm">
                        <input
                          type="radio"
                          name={`apr-${p.nom}`}
                          value={v}
                          checked={params[p.nom] === v}
                          onChange={() => setParams((prev) => ({ ...prev, [p.nom]: v }))}
                        />
                        {v}
                      </label>
                    ))}
                  </div>
                ) : p.type === 'enum' && p.enum_values?.length ? (
                  <div className="relative">
                    <select
                      value={params[p.nom] ?? ''}
                      onChange={(e) => setParams((prev) => ({ ...prev, [p.nom]: e.target.value }))}
                      className="w-full appearance-none rounded-md border border-input bg-background py-2 pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">Select…</option>
                      {p.enum_values.map((v: string) => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  </div>
                ) : (
                  <input
                    type={p.type === 'int' ? 'number' : 'text'}
                    value={params[p.nom] ?? ''}
                    onChange={(e) => setParams((prev) => ({ ...prev, [p.nom]: e.target.value }))}
                    placeholder={String(p.valeur_defaut || `Enter ${p.nom}…`)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                )}
              </div>
            ))}

            {/* Live preview */}
            {action.parametres.length > 0 && (
              <div>
                <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Preview</p>
                <pre className="rounded-lg bg-muted px-3 py-2 font-mono text-xs text-foreground/80 overflow-x-auto">
                  {previewScript}
                </pre>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 border-t border-border px-5 py-4">
            <Dialog.Close asChild>
              <button className="rounded-md border border-border px-4 py-2 text-sm hover:bg-accent">Cancel</button>
            </Dialog.Close>
            <button
              onClick={() => onExecute(params)}
              disabled={isPending || missingRequired.length > 0}
              title={missingRequired.length > 0 ? `Missing: ${missingRequired.join(', ')}` : undefined}
              className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isPending
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Executing…</>
                : <><Play className="h-4 w-4" /> Execute</>}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatUptime(sec: number): string {
  const d = Math.floor(sec / 86400)
  const h = Math.floor((sec % 86400) / 3600)
  const m = Math.floor((sec % 3600) / 60)
  if (d > 0) return `${d}d ${h}h ${m}m`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

// ── Metric bar ────────────────────────────────────────────────────────────────

function MetricBar({
  label,
  value,
  icon,
  unit = '%',
}: {
  label: string
  value?: number | null
  icon: React.ReactNode
  unit?: string
}): React.ReactElement {
  const pct = typeof value === 'number' ? Math.min(Math.max(value, 0), 100) : 0
  const hasValue = typeof value === 'number'

  const barColor = pct > 90
    ? 'bg-destructive'
    : pct > 70
    ? 'bg-amber-500'
    : 'bg-emerald-500'

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          {icon}
          {label}
        </span>
        <span className={cn('font-semibold tabular-nums', hasValue ? 'text-foreground' : 'text-muted-foreground/50')}>
          {hasValue ? `${pct.toFixed(1)}${unit}` : 'N/A'}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full rounded-full transition-all duration-500', hasValue ? barColor : 'bg-muted-foreground/20')}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// ── Info row ──────────────────────────────────────────────────────────────────

function InfoRow({
  label,
  value,
  icon,
  mono = false,
}: {
  label: string
  value: string | undefined | null
  icon?: React.ReactNode
  mono?: boolean
}): React.ReactElement {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <span className="flex items-center gap-1.5 text-sm text-muted-foreground shrink-0">
        {icon}
        {label}
      </span>
      <span
        className={cn(
          'truncate text-right text-sm text-foreground max-w-[200px]',
          mono && 'font-mono text-xs',
        )}
        title={value ?? '—'}
      >
        {value ?? '—'}
      </span>
    </div>
  )
}

// ── Command status badge ───────────────────────────────────────────────────────

function CmdStatusBadge({ statut }: { statut: Command['statut'] }): React.ReactElement {
  const cfg: Record<Command['statut'], { label: string; className: string }> = {
    pending:      { label: 'Pending',     className: 'bg-slate-500/10 text-slate-400' },
    sent:         { label: 'Sent',        className: 'bg-blue-500/10 text-blue-400' },
    acknowledged: { label: 'Ack',         className: 'bg-indigo-500/10 text-indigo-400' },
    executing:    { label: 'Executing',   className: 'bg-amber-500/10 text-amber-400' },
    success:      { label: 'Success',     className: 'bg-emerald-500/10 text-emerald-500' },
    failed:       { label: 'Failed',      className: 'bg-destructive/10 text-destructive' },
  }
  const { label, className } = cfg[statut] ?? cfg.pending
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', className)}>
      {label}
    </span>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function DeviceDetailPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [revokeOpen, setRevokeOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [cmdModalOpen, setCmdModalOpen] = useState(false)
  const [shellCmd, setShellCmd] = useState('')
  const [cmdsSpinning, setCmdsSpinning] = useState(false)
  const [logsSpinning, setLogsSpinning] = useState(false)
  const [actionRunTarget, setActionRunTarget] = useState<Action | null>(null)

  const currentUser = useAuthStore((s) => s.user)

  const { data: device, isLoading, error, refetch } = useDevice(id ?? '')
  const { data: commandsData, refetch: refetchCommands, isFetching: cmdsFetching } = useDeviceCommands(id ?? '', { limit: 10 })
  const { data: logsData, refetch: refetchLogs, isFetching: logsFetching } = useDeviceLogs(id ?? '', { limit: 30 })
  const sendCommand = useSendCommand()
  const revokeDevice = useRevokeDevice()
  const deleteDevice = useDeleteDevice()

  const { data: allActions = [] } = useQuery<Action[]>({
    queryKey: ['actions'],
    queryFn: api.getActions,
    staleTime: 60_000,
  })

  const executeActionMut = useMutation({
    mutationFn: ({ actionId, params }: { actionId: string; params: Record<string, unknown> }) =>
      api.executeAction(actionId, { device_id: id, parametres: params }),
    onSuccess: () => setActionRunTarget(null),
  })

  // Actions compatible with this device's platform
  const compatibleActions = allActions.filter((a) =>
    device ? a.compatible_plateformes.includes(device.plateforme as Platform) : false,
  )

  function handleRunAction(action: Action): void {
    const isAndroid = device?.plateforme === 'android'
    if (action.parametres.length === 0) {
      if (isAndroid) {
        // Android: no textarea, execute directly via API
        executeActionMut.mutate({ actionId: action.id, params: {} })
      } else {
        // Desktop: fill the shell textarea with the script
        setShellCmd(action.script_template)
      }
    } else {
      // Has params → open modal to fill them first
      setActionRunTarget(action)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !device) {
    return (
      <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {error?.message ?? 'Device not found'}
      </div>
    )
  }

  async function handleShellCommand(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    if (!shellCmd.trim() || !id) return
    await sendCommand.mutateAsync({
      deviceId: id,
      // Desktop agent expects key "command" (not "cmd") — Session 0 contract
      command: { type: 'shell', payload: { command: shellCmd } },
    })
    setShellCmd('')
  }

  async function handleQuickCommand(type: string, payload: Record<string, unknown> = {}): Promise<void> {
    if (!id) return
    await sendCommand.mutateAsync({ deviceId: id, command: { type: type as never, payload } })
  }

  async function handleRefreshCommands(): Promise<void> {
    setCmdsSpinning(true)
    try {
      await refetchCommands()
    } finally {
      setCmdsSpinning(false)
    }
  }

  async function handleRefreshLogs(): Promise<void> {
    setLogsSpinning(true)
    try {
      await refetchLogs()
    } finally {
      setLogsSpinning(false)
    }
  }

  async function handleRevoke(): Promise<void> {
    if (!id) return
    await revokeDevice.mutateAsync(id)
    setRevokeOpen(false)
    void refetch()
  }

  async function handleDelete(): Promise<void> {
    if (!id) return
    await deleteDevice.mutateAsync(id)
    setDeleteOpen(false)
    navigate('/devices')
  }

  const commands = commandsData?.items ?? []
  const logs = logsData?.items ?? []
  const isOnline = device.statut === 'online'
  const isRevoked = device.statut === 'revoked'

  return (
    <div className="space-y-6">
      {/* Back link */}
      <div>
        <Link
          to="/devices"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Devices
        </Link>
      </div>

      {/* Header */}
      <PageHeader
        title={device.nom}
        description={`${device.hostname} · ${device.plateforme} · ${device.os_version}`}
        actions={
          <div className="flex items-center gap-2">
            <DeviceStatusBadge status={device.statut} />
            {!isRevoked && (
              <button
                onClick={() => setRevokeOpen(true)}
                className="flex items-center gap-2 rounded-md border border-amber-500/40 px-3 py-2 text-sm text-amber-600 hover:bg-amber-500/10 dark:text-amber-400"
              >
                <ShieldOff className="h-4 w-4" />
                Revoke
              </button>
            )}
            <button
              onClick={() => setDeleteOpen(true)}
              className="flex items-center gap-2 rounded-md border border-destructive/40 px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </div>
        }
      />

      {/* Revoked banner */}
      {isRevoked && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" />
          <div>
            <p className="text-sm font-medium text-destructive">Device revoked</p>
            <p className="text-xs text-muted-foreground">This device has been permanently revoked and cannot reconnect.</p>
          </div>
        </div>
      )}

      {/* Top grid: Info + Metrics + Command */}
      <div className="grid gap-5 lg:grid-cols-3">

        {/* Device Info */}
        <div className="relative overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-border">
          <div className="absolute top-0 h-0.5 w-full bg-gradient-to-r from-indigo-500 to-violet-500" />
          <div className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10">
                <Info className="h-3.5 w-3.5 text-indigo-500" />
              </div>
              <h2 className="text-sm font-semibold text-foreground">Device Info</h2>
            </div>
            <div className="divide-y divide-border/60">
              <InfoRow label="Device ID"   value={device.device_id}     icon={<Hash className="h-3.5 w-3.5" />}      mono />
              <InfoRow label="Hostname"    value={device.hostname}      icon={<Monitor className="h-3.5 w-3.5" />}   mono />
              <InfoRow label="Platform"    value={device.plateforme}    icon={<Layers className="h-3.5 w-3.5" />} />
              <InfoRow label="OS"          value={device.os_version}    icon={<GitBranch className="h-3.5 w-3.5" />} />
              <InfoRow label="Arch"        value={device.architecture}  icon={<Cpu className="h-3.5 w-3.5" />} />
              <InfoRow label="Agent"       value={`v${device.version_agent}`} icon={<Activity className="h-3.5 w-3.5" />} mono />
              <InfoRow label="Last seen"   value={formatRelativeTime(device.derniere_connexion)} icon={<Clock className="h-3.5 w-3.5" />} />
              <InfoRow label="Registered"  value={formatDate(device.created_at)} icon={<Calendar className="h-3.5 w-3.5" />} />
              {device.network_type && (
                <InfoRow label="Network" value={device.network_type} icon={<Wifi className="h-3.5 w-3.5" />} />
              )}
            </div>
          </div>
        </div>

        {/* Metrics */}
        <div className="relative overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-border">
          <div className="absolute top-0 h-0.5 w-full bg-gradient-to-r from-teal-500 to-emerald-500" />
          <div className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-500/10">
                  <Activity className="h-3.5 w-3.5 text-teal-500" />
                </div>
                <h2 className="text-sm font-semibold text-foreground">Metrics</h2>
              </div>
              {isOnline && (
                <span className="flex items-center gap-1.5 text-[10px] font-medium text-emerald-500">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                  Live
                </span>
              )}
            </div>

            {!isOnline && !device.ram_percent && !device.disk_percent && (device.plateforme === 'android' || !device.cpu_percent) ? (
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <Activity className="h-8 w-8 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground">
                  Metrics are pushed via heartbeat.<br />
                  Connect the device to see live data.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {device.plateforme !== 'android' && (
                  <MetricBar
                    label="CPU"
                    value={device.cpu_percent}
                    icon={<Cpu className="h-3.5 w-3.5" />}
                  />
                )}
                <MetricBar
                  label="RAM"
                  value={device.ram_percent}
                  icon={<MemoryStick className="h-3.5 w-3.5" />}
                />
                <MetricBar
                  label="Disk"
                  value={device.disk_percent ?? device.storage_percent}
                  icon={<HardDrive className="h-3.5 w-3.5" />}
                />
                {typeof device.battery_level === 'number' && (
                  <MetricBar
                    label={`Battery${device.battery_charging ? ' ⚡' : ''}`}
                    value={device.battery_level}
                    icon={<Battery className="h-3.5 w-3.5" />}
                  />
                )}

                {/* Uptime + Network — séparés des barres */}
                {(device.uptime_sec != null || device.network_type) && (
                  <div className="border-t border-border/60 pt-3 space-y-2">
                    {device.uptime_sec != null && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          Uptime
                        </span>
                        <span className="font-semibold tabular-nums text-foreground">
                          {formatUptime(device.uptime_sec)}
                        </span>
                      </div>
                    )}
                    {device.network_type && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <Wifi className="h-3.5 w-3.5" />
                          Network
                        </span>
                        <span className={cn(
                          'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                          device.network_type === 'WIFI'     ? 'bg-blue-500/10 text-blue-400' :
                          device.network_type === 'MOBILE'   ? 'bg-violet-500/10 text-violet-400' :
                          device.network_type === 'ETHERNET' ? 'bg-emerald-500/10 text-emerald-500' :
                                                               'bg-muted text-muted-foreground',
                        )}>
                          {device.network_type}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Metadata extras */}
            {Object.keys(device.metadata).length > 0 && (
              <div className="mt-4 border-t border-border/60 pt-4">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Metadata
                </p>
                <div className="space-y-1">
                  {Object.entries(device.metadata).map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-2 text-xs">
                      <span className="text-muted-foreground truncate">{k}</span>
                      <span className="font-mono text-foreground truncate max-w-[120px]">
                        {String(v)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Send Command */}
        <div className="relative overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-border">
          <div className="absolute top-0 h-0.5 w-full bg-gradient-to-r from-violet-500 to-pink-500" />
          <div className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/10">
                <Terminal className="h-3.5 w-3.5 text-violet-500" />
              </div>
              <h2 className="text-sm font-semibold text-foreground">Send Command</h2>
            </div>

            {isRevoked ? (
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <ShieldOff className="h-8 w-8 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground">Commands unavailable — device revoked.</p>
              </div>
            ) : device.plateforme === 'android' ? (
              /* ── Android: no shell, only typed commands ── */
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Android does not support arbitrary shell commands. Use the actions below:
                </p>
                {[
                  { label: 'Collect heartbeat now', type: 'collect_now', desc: 'Force an immediate data collection' },
                  { label: 'Scan network', type: 'scan_network', desc: 'Discover neighbours on the local network' },
                  { label: 'Get device info', type: 'get_info', desc: 'Return full device metadata' },
                  { label: 'Restart service', type: 'restart_service', desc: 'Restart the Orbis agent service' },
                ].map(({ label, type, desc }) => (
                  <button
                    key={type}
                    type="button"
                    disabled={sendCommand.isPending}
                    onClick={() => void handleQuickCommand(type)}
                    className="flex w-full items-start gap-3 rounded-xl border border-border/60 bg-muted/30 px-3 py-2.5 text-left transition-colors hover:border-primary/40 hover:bg-primary/5 disabled:opacity-50"
                  >
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 mt-0.5">
                      <Terminal className="h-3 w-3 text-violet-500" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-foreground">{label}</p>
                      <p className="text-[10px] text-muted-foreground">{desc}</p>
                    </div>
                  </button>
                ))}
                {sendCommand.isPending && (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <RefreshCw className="h-3 w-3 animate-spin" /> Sending…
                  </p>
                )}

                {/* Saved Actions */}
                {compatibleActions.length > 0 && (
                  <div className="border-t border-border/60 pt-3">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Zap className="h-3 w-3 text-violet-400" />
                      Saved Actions
                    </p>
                    <div className="space-y-1.5">
                      {compatibleActions.map((action) => (
                        <button
                          key={action.id}
                          type="button"
                          disabled={executeActionMut.isPending || sendCommand.isPending}
                          onClick={() => handleRunAction(action)}
                          className="flex w-full items-center gap-2 rounded-xl border border-border/60 bg-muted/30 px-3 py-2 text-left transition-colors hover:border-violet-400/40 hover:bg-violet-500/5 disabled:opacity-50"
                        >
                          <Zap className="h-3.5 w-3.5 shrink-0 text-violet-400" />
                          <span className="flex-1 min-w-0 truncate text-xs font-medium">{action.nom}</span>
                          {action.parametres.length > 0 && (
                            <span className="shrink-0 text-[10px] text-muted-foreground">
                              {action.parametres.length} param{action.parametres.length > 1 ? 's' : ''}
                            </span>
                          )}
                          <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setCmdModalOpen(true)}
                  className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-2 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                >
                  <LayoutList className="h-3.5 w-3.5" />
                  See all commands
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            ) : (
              /* ── Desktop (Linux / macOS / Windows): full shell ── */
              <form onSubmit={handleShellCommand} className="space-y-3">
                <textarea
                  value={shellCmd}
                  onChange={(e) => setShellCmd(e.target.value)}
                  placeholder="Enter shell command…"
                  rows={4}
                  className="w-full resize-none rounded-xl border border-input bg-muted/40 px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  type="submit"
                  disabled={sendCommand.isPending || !shellCmd.trim()}
                  className="w-full rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {sendCommand.isPending ? (
                    <span className="flex items-center justify-center gap-2">
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      Sending…
                    </span>
                  ) : (
                    'Execute'
                  )}
                </button>
                {!isOnline && (
                  <p className="text-center text-xs text-muted-foreground">
                    Device offline — command will queue until reconnection.
                  </p>
                )}

                {/* Quick commands — driven by the platform catalog */}
                {(() => {
                  const shellEntry = getCatalog(device.plateforme).find((e) => e.type === 'shell')
                  if (!shellEntry?.presets) return null
                  return (
                    <div className="border-t border-border/60 pt-3">
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Quick Commands
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {shellEntry.presets.map(({ label, value }) => (
                          <button
                            key={label}
                            type="button"
                            onClick={() => setShellCmd(value)}
                            className="rounded-lg border border-border px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })()}
                {/* Saved Actions */}
                {compatibleActions.length > 0 && (
                  <div className="border-t border-border/60 pt-3">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Zap className="h-3 w-3 text-violet-400" />
                      Saved Actions
                    </p>
                    <div className="flex flex-col gap-1.5">
                      {compatibleActions.map((action) => (
                        <button
                          key={action.id}
                          type="button"
                          disabled={executeActionMut.isPending || sendCommand.isPending}
                          onClick={() => handleRunAction(action)}
                          className="flex w-full items-center gap-2 rounded-xl border border-border/60 bg-muted/30 px-3 py-2 text-left transition-colors hover:border-violet-400/40 hover:bg-violet-500/5 disabled:opacity-50"
                        >
                          <Zap className="h-3.5 w-3.5 shrink-0 text-violet-400" />
                          <span className="flex-1 min-w-0 truncate text-xs font-medium">{action.nom}</span>
                          {action.parametres.length > 0 && (
                            <span className="shrink-0 text-[10px] text-muted-foreground">
                              {action.parametres.length} param{action.parametres.length > 1 ? 's' : ''}
                            </span>
                          )}
                          <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setCmdModalOpen(true)}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-2 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                >
                  <LayoutList className="h-3.5 w-3.5" />
                  See all commands
                  <ChevronRight className="h-3 w-3" />
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Groups */}
      {device.groupe_ids.length > 0 && (
        <div className="relative overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-border">
          <div className="absolute top-0 h-0.5 w-full bg-gradient-to-r from-blue-500 to-cyan-500" />
          <div className="p-5">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10">
                <Layers className="h-3.5 w-3.5 text-blue-500" />
              </div>
              <h2 className="text-sm font-semibold text-foreground">
                Groups <span className="ml-1 text-muted-foreground">({device.groupe_ids.length})</span>
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {device.groupe_ids.map((gid) => (
                <Link
                  key={gid}
                  to="/groups"
                  className="rounded-lg border border-border bg-muted/40 px-3 py-1 font-mono text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                >
                  {gid}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recent Commands */}
      <div className="relative overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-border">
        <div className="absolute top-0 h-0.5 w-full bg-gradient-to-r from-slate-400 to-slate-600" />
        <div className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-500/10">
                <Terminal className="h-3.5 w-3.5 text-slate-400" />
              </div>
              <h2 className="text-sm font-semibold text-foreground">
                Recent Commands
                {commands.length > 0 && (
                  <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    {commands.length}
                  </span>
                )}
              </h2>
            </div>
            <button
              onClick={() => void handleRefreshCommands()}
              disabled={cmdsSpinning || cmdsFetching}
              className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', (cmdsSpinning || cmdsFetching) && 'animate-spin')} />
              Refresh
            </button>
          </div>

          {commands.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <Terminal className="h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No commands sent yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {commands.map((cmd) => (
                <div
                  key={cmd.id}
                  className="rounded-xl border border-border/60 bg-muted/20 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium text-foreground">{cmd.type}</span>
                        <CmdStatusBadge statut={cmd.statut} />
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatRelativeTime(cmd.envoye_le ?? cmd.cree_le)}
                        {' · by '}
                        {currentUser?.id === cmd.cree_par
                          ? (currentUser.full_name || currentUser.email)
                          : cmd.cree_par.slice(0, 8) + '…'}
                      </p>
                      {cmd.payload && Object.keys(cmd.payload).length > 0 && (
                        <p className="mt-1 font-mono text-[11px] text-muted-foreground truncate">
                          {JSON.stringify(cmd.payload)}
                        </p>
                      )}
                      {cmd.resultat && (
                        <pre className="mt-2 max-h-20 overflow-y-auto rounded-lg bg-muted px-3 py-2 text-xs leading-relaxed text-foreground">
                          {cmd.resultat}
                        </pre>
                      )}
                      {cmd.error_message && (
                        <p className="mt-1 text-xs text-destructive">{cmd.error_message}</p>
                      )}
                    </div>
                    <div className="shrink-0 pt-0.5">
                      <CommandLifecycle statut={cmd.statut} compact />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Logs */}
      <div className="relative overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-border">
        <div className="absolute top-0 h-0.5 w-full bg-gradient-to-r from-amber-400 to-orange-500" />
        <div className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10">
                <Activity className="h-3.5 w-3.5 text-amber-500" />
              </div>
              <h2 className="text-sm font-semibold text-foreground">
                Recent Logs
                {logs.length > 0 && (
                  <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    {logs.length}
                  </span>
                )}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => void handleRefreshLogs()}
                disabled={logsSpinning || logsFetching}
                className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
              >
                <RefreshCw className={cn('h-3.5 w-3.5', (logsSpinning || logsFetching) && 'animate-spin')} />
                Refresh
              </button>
              {/* Log level summary */}
              {logs.length > 0 && (
                <>
                  {(['ERROR', 'WARNING', 'INFO'] as const).map((level) => {
                    const count = logs.filter((l) => l.level === level).length
                    if (count === 0) return null
                    const colors = {
                      ERROR:   'bg-destructive/10 text-destructive',
                      WARNING: 'bg-amber-500/10 text-amber-500',
                      INFO:    'bg-blue-500/10 text-blue-400',
                    }
                    return (
                      <span
                        key={level}
                        className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', colors[level])}
                      >
                        {count} {level}
                      </span>
                    )
                  })}
                </>
              )}
            </div>
          </div>

          {logs.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <Activity className="h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No logs yet.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border/60">
              <div className="max-h-80 overflow-y-auto">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className={cn(
                      'flex items-start gap-3 border-b border-border/40 px-3 py-2 font-mono text-xs last:border-0 hover:bg-muted/30',
                      log.level === 'ERROR' || log.level === 'CRITICAL' ? 'bg-destructive/[0.03]' : '',
                    )}
                  >
                    <span className="shrink-0 text-muted-foreground/60 whitespace-nowrap">
                      {formatDate(log.timestamp)}
                    </span>
                    <LogLevelBadge level={log.level} size="sm" />
                    <span className="shrink-0 text-muted-foreground/70">[{log.source}]</span>
                    <span className="break-all text-foreground">{log.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* All Commands Modal */}
      <AllCommandsModal
        open={cmdModalOpen}
        onOpenChange={setCmdModalOpen}
        platform={device.plateforme}
        onSend={handleQuickCommand}
        isPending={sendCommand.isPending}
      />

      {/* Action Run Modal */}
      <ActionRunModal
        open={actionRunTarget !== null}
        onOpenChange={(v) => { if (!v) setActionRunTarget(null) }}
        action={actionRunTarget}
        isPending={executeActionMut.isPending}
        onExecute={(params) => {
          if (!actionRunTarget) return
          if (device?.plateforme === 'android') {
            // Android: execute directly via API
            executeActionMut.mutate({ actionId: actionRunTarget.id, params })
          } else {
            // Desktop: resolve placeholders and paste into the shell textarea
            let script = actionRunTarget.script_template
            Object.entries(params).forEach(([k, v]) => {
              script = script.replaceAll(`{{${k}}}`, v)
            })
            setShellCmd(script)
            setActionRunTarget(null)
          }
        }}
      />

      {/* Confirm: Revoke */}
      <ConfirmDialog
        open={revokeOpen}
        onOpenChange={setRevokeOpen}
        title="Revoke Device"
        description={`Revoking "${device.nom}" will immediately disconnect it from MQTT and prevent it from reconnecting. This action cannot be undone.`}
        confirmLabel="Revoke Device"
        variant="destructive"
        onConfirm={() => void handleRevoke()}
        isLoading={revokeDevice.isPending}
      />

      {/* Confirm: Delete */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Device"
        description={`Permanently delete "${device.nom}"? This will remove the device from the database entirely, disconnect it from MQTT, and delete its MQTT account. All associated commands and logs will remain in the audit trail.`}
        confirmLabel="Delete Permanently"
        variant="destructive"
        onConfirm={() => void handleDelete()}
        isLoading={deleteDevice.isPending}
      />
    </div>
  )
}
