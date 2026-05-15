import React, { useState, useCallback } from 'react'
import {
  Bell,
  Plus,
  RefreshCw,
  Trash2,
  Pencil,
  Search,
  X,
  ChevronDown,
  ToggleLeft,
  ToggleRight,
  Loader2,
  Clock,
  Activity,
  Database,
  Webhook,
  Zap,
  History,
  Monitor,
  Users,
  Mail,
  PlusCircle,
  Info,
  Cpu,
  MemoryStick,
  HardDrive,
  Battery,
  Wifi,
  Timer,
} from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import * as api from '@/services/api'
import { formatDate, cn } from '@/lib/utils'
import type {
  Alert,
  AlertCondition,
  AlertConditionType,
  AlertConditionOperator,
  AlertScope,
  LogLevel,
  Action,
  Device,
  Group,
} from '@/types'

// ─── Constants ───────────────────────────────────────────────────────────────

const LOG_LEVELS: LogLevel[] = ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL']
const CONDITION_TYPES: AlertConditionType[] = ['log_level', 'inactivity', 'metadata_threshold']
const OPERATORS: { value: AlertConditionOperator; label: string }[] = [
  { value: 'eq',       label: '= equals' },
  { value: 'gt',       label: '> greater than' },
  { value: 'lt',       label: '< less than' },
  { value: 'gte',      label: '≥ greater or equal' },
  { value: 'lte',      label: '≤ less or equal' },
  { value: 'contains', label: '∋ contains' },
]

const CONDITION_META: Record<AlertConditionType, { label: string; icon: React.ReactNode; color: string; desc: string }> = {
  log_level: {
    label: 'Log Level',
    icon: <Activity className="h-4 w-4" />,
    color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
    desc: 'Fires when a log entry matches the specified severity level',
  },
  inactivity: {
    label: 'Inactivity',
    icon: <Clock className="h-4 w-4" />,
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    desc: 'Fires when a device stops sending heartbeats for a given duration',
  },
  metadata_threshold: {
    label: 'Metric Threshold',
    icon: <Database className="h-4 w-4" />,
    color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
    desc: 'Fires when a metadata value crosses a numeric or string threshold',
  },
}

const LOG_LEVEL_COLORS: Record<LogLevel, string> = {
  DEBUG:    'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  INFO:     'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  WARNING:  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  ERROR:    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  CRITICAL: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function conditionSummary(cond: AlertCondition): string {
  if (cond.type === 'log_level') {
    return `Log level = ${String(cond.valeur)}`
  }
  if (cond.type === 'inactivity') {
    return `Inactive for ${String(cond.valeur)} min`
  }
  if (cond.type === 'metadata_threshold') {
    const op = OPERATORS.find((o) => o.value === cond.operateur)?.label.split(' ')[0] ?? cond.operateur
    return `${cond.metadata_key ?? '?'} ${op} ${String(cond.valeur)}`
  }
  return String(cond.type)
}

function operatorSymbol(op: AlertConditionOperator): string {
  const map: Record<AlertConditionOperator, string> = {
    eq: '=', gt: '>', lt: '<', gte: '≥', lte: '≤', contains: '∋',
  }
  return map[op] ?? op
}

// ─── Platform metrics catalogue ──────────────────────────────────────────────

interface MetricInfo {
  key: string
  label: string
  description: string
  unit: string
  example: string
  icon: React.ReactNode
}

const DESKTOP_METRICS: MetricInfo[] = [
  { key: 'cpu_percent',    label: 'CPU Usage',        description: 'Overall CPU utilisation across all cores',            unit: '%',   example: '85.5',  icon: <Cpu className="h-4 w-4" /> },
  { key: 'ram_percent',    label: 'RAM Usage',         description: 'Physical memory used as a percentage of total RAM',  unit: '%',   example: '72.3',  icon: <MemoryStick className="h-4 w-4" /> },
  { key: 'disk_percent',   label: 'Disk Usage',        description: 'Primary disk partition used space percentage',        unit: '%',   example: '90.1',  icon: <HardDrive className="h-4 w-4" /> },
  { key: 'uptime_sec',     label: 'Uptime',            description: 'System uptime in seconds since last boot',           unit: 's',   example: '86400', icon: <Timer className="h-4 w-4" /> },
  { key: 'process_count',  label: 'Process Count',     description: 'Number of currently running processes',              unit: '',    example: '250',   icon: <Activity className="h-4 w-4" /> },
]

const ANDROID_METRICS: MetricInfo[] = [
  { key: 'cpu_percent',     label: 'CPU Usage',         description: 'Overall CPU utilisation percentage',                 unit: '%',   example: '60.0',  icon: <Cpu className="h-4 w-4" /> },
  { key: 'ram_percent',     label: 'RAM Usage',         description: 'Physical memory used as a percentage of total RAM',  unit: '%',   example: '55.2',  icon: <MemoryStick className="h-4 w-4" /> },
  { key: 'storage_percent', label: 'Storage Usage',     description: 'Internal storage used space percentage',             unit: '%',   example: '78.4',  icon: <HardDrive className="h-4 w-4" /> },
  { key: 'battery_level',   label: 'Battery Level',     description: 'Remaining battery charge percentage',                unit: '%',   example: '15',    icon: <Battery className="h-4 w-4" /> },
  { key: 'battery_charging',label: 'Battery Charging',  description: 'Whether the device is currently charging (true/false)', unit: '',  example: 'false', icon: <Battery className="h-4 w-4" /> },
  { key: 'network_type',    label: 'Network Type',      description: 'Active network connection type',                     unit: '',   example: 'wifi',  icon: <Wifi className="h-4 w-4" /> },
  { key: 'uptime_sec',      label: 'Uptime',            description: 'Device uptime in seconds since last reboot',        unit: 's',   example: '3600',  icon: <Timer className="h-4 w-4" /> },
]

const METRICS_BY_PLATFORM: Record<string, MetricInfo[]> = {
  linux:   DESKTOP_METRICS,
  macos:   DESKTOP_METRICS,
  windows: DESKTOP_METRICS,
  android: ANDROID_METRICS,
}

// ─── Metrics Info Modal ───────────────────────────────────────────────────────

interface MetricsInfoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  platforms: string[]          // platforms of the selected target
  onSelect: (key: string) => void
}

function MetricsInfoModal({ open, onOpenChange, platforms, onSelect }: MetricsInfoModalProps) {
  // Deduplicate metrics across platforms, keeping first occurrence
  const seen = new Set<string>()
  const metrics: (MetricInfo & { platforms: string[] })[] = []
  for (const platform of platforms) {
    for (const m of METRICS_BY_PLATFORM[platform] ?? []) {
      if (!seen.has(m.key)) {
        seen.add(m.key)
        metrics.push({ ...m, platforms: [platform] })
      } else {
        const existing = metrics.find((x) => x.key === m.key)
        if (existing && !existing.platforms.includes(platform)) {
          existing.platforms.push(platform)
        }
      }
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[70] bg-black/60 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[70] flex max-h-[80vh] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl border border-border bg-card shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
            <div>
              <Dialog.Title className="flex items-center gap-2 font-semibold">
                <Database className="h-4 w-4 text-primary" />
                Available Metric Keys
              </Dialog.Title>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Click a key to use it in the Metadata key field.
              </p>
            </div>
            <Dialog.Close className="rounded-md p-1.5 text-muted-foreground hover:bg-accent">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            {metrics.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No known metrics for this platform.
              </p>
            ) : (
              <div className="space-y-2">
                {metrics.map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => { onSelect(m.key); onOpenChange(false) }}
                    className="group w-full rounded-lg border border-border bg-background px-4 py-3 text-left transition-colors hover:border-primary/50 hover:bg-primary/5"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 shrink-0 text-muted-foreground group-hover:text-primary">
                        {m.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-sm font-semibold text-foreground group-hover:text-primary">
                            {m.key}
                          </span>
                          {m.unit && (
                            <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                              {m.unit}
                            </span>
                          )}
                          <div className="ml-auto flex gap-1">
                            {m.platforms.map((p) => (
                              <span key={p} className="rounded bg-muted px-1.5 py-0.5 text-[10px] capitalize text-muted-foreground">
                                {p}
                              </span>
                            ))}
                          </div>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">{m.description}</p>
                        <p className="mt-1 font-mono text-xs text-muted-foreground/60">
                          example: <span className="text-foreground">{m.example}</span>
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// ─── Form types ───────────────────────────────────────────────────────────────

interface AlertFormData {
  nom: string
  scope: AlertScope
  scope_id: string
  condition_type: AlertConditionType
  // log_level fields
  log_level: LogLevel
  // inactivity fields
  inactivity_minutes: number
  // metadata fields
  metadata_key: string
  metadata_operator: AlertConditionOperator
  metadata_value: string
  // automation
  action_id: string
  webhook_url: string
  // email notifications
  email_enabled: boolean
  email_recipients: string[]
  email_cooldown_minutes: number
}

function blankForm(): AlertFormData {
  return {
    nom: '',
    scope: 'device',
    scope_id: '',
    condition_type: 'log_level',
    log_level: 'ERROR',
    inactivity_minutes: 5,
    metadata_key: '',
    metadata_operator: 'gt',
    metadata_value: '',
    action_id: '',
    webhook_url: '',
    email_enabled: false,
    email_recipients: [],
    email_cooldown_minutes: 10,
  }
}

function alertToForm(alert: Alert): AlertFormData {
  const cond = alert.condition
  const recipients = alert.email_recipients ?? []
  return {
    nom: alert.nom,
    scope: alert.scope,
    scope_id: alert.scope_id,
    condition_type: cond.type,
    log_level: cond.type === 'log_level' ? (String(cond.valeur) as LogLevel) : 'ERROR',
    inactivity_minutes: cond.type === 'inactivity' ? Number(cond.valeur) : 5,
    metadata_key: cond.metadata_key ?? '',
    metadata_operator: cond.type === 'metadata_threshold' ? cond.operateur : 'gt',
    metadata_value: cond.type === 'metadata_threshold' ? String(cond.valeur) : '',
    action_id: alert.action_id ?? '',
    webhook_url: alert.webhook_url ?? '',
    email_enabled: recipients.length > 0,
    email_recipients: recipients,
    email_cooldown_minutes: alert.email_cooldown_minutes ?? 10,
  }
}

// ─── Email Recipients Modal ───────────────────────────────────────────────────

interface EmailRecipientsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  recipients: string[]
  onSave: (recipients: string[]) => void
}

function EmailRecipientsModal({ open, onOpenChange, recipients, onSave }: EmailRecipientsModalProps) {
  const [input, setInput] = useState('')
  const [list, setList] = useState<string[]>([])
  const [error, setError] = useState('')

  React.useEffect(() => {
    if (open) { setList(recipients); setInput(''); setError('') }
  }, [open, recipients])

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim())

  const addEmails = useCallback(() => {
    const parts = input.split(/[,;\s]+/).map((e) => e.trim()).filter(Boolean)
    const invalid = parts.filter((e) => !isValidEmail(e))
    if (invalid.length > 0) {
      setError(`Invalid address${invalid.length > 1 ? 'es' : ''}: ${invalid.join(', ')}`)
      return
    }
    const newOnes = parts.filter((e) => !list.includes(e))
    setList((prev) => [...prev, ...newOnes])
    setInput('')
    setError('')
  }, [input, list])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addEmails() }
  }

  const remove = (email: string) => setList((prev) => prev.filter((e) => e !== email))

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/60 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[60] flex max-h-[80vh] w-full max-w-md -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl border border-border bg-card shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
            <div>
              <Dialog.Title className="flex items-center gap-2 font-semibold">
                <Mail className="h-4 w-4 text-primary" /> Email Recipients
              </Dialog.Title>
              <p className="mt-0.5 text-xs text-muted-foreground">
                These addresses will receive an email each time this alert fires.
              </p>
            </div>
            <Dialog.Close className="rounded-md p-1.5 text-muted-foreground hover:bg-accent">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {/* Input */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-foreground">
                Add addresses <span className="font-normal text-muted-foreground">(comma or Enter to add)</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => { setInput(e.target.value); setError('') }}
                  onKeyDown={handleKeyDown}
                  placeholder="user@example.com, another@example.com"
                  className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <button
                  type="button"
                  onClick={addEmails}
                  disabled={!input.trim()}
                  className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  <PlusCircle className="h-4 w-4" />
                  Add
                </button>
              </div>
              {error && <p className="mt-1.5 text-xs text-destructive">{error}</p>}
            </div>

            {/* List */}
            {list.length > 0 ? (
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">{list.length} recipient{list.length !== 1 ? 's' : ''}</p>
                <div className="space-y-1.5">
                  {list.map((email) => (
                    <div key={email} className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 shrink-0 text-primary" />
                        <span className="text-sm">{email}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => remove(email)}
                        className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border py-8 text-center">
                <Mail className="mx-auto mb-2 h-6 w-6 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No recipients yet.</p>
                <p className="text-xs text-muted-foreground">Add email addresses above.</p>
              </div>
            )}
          </div>

          <div className="flex shrink-0 items-center justify-end gap-3 border-t border-border px-5 py-4">
            <Dialog.Close className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent">
              Cancel
            </Dialog.Close>
            <button
              type="button"
              onClick={() => { onSave(list); onOpenChange(false) }}
              className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Save recipients
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function formToCondition(form: AlertFormData): AlertCondition {
  if (form.condition_type === 'log_level') {
    return { type: 'log_level', valeur: form.log_level, operateur: 'eq' }
  }
  if (form.condition_type === 'inactivity') {
    return { type: 'inactivity', valeur: form.inactivity_minutes, operateur: 'eq' }
  }
  return {
    type: 'metadata_threshold',
    valeur: isNaN(Number(form.metadata_value)) ? form.metadata_value : Number(form.metadata_value),
    operateur: form.metadata_operator,
    metadata_key: form.metadata_key,
  }
}

// ─── Alert Form Modal ─────────────────────────────────────────────────────────

interface AlertFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing: Alert | null
  actions: Action[]
  devices: Device[]
  groups: Group[]
  onSave: (form: AlertFormData) => void
  isSaving: boolean
}

function AlertFormModal({ open, onOpenChange, editing, actions, devices, groups, onSave, isSaving }: AlertFormModalProps) {
  const [form, setForm] = useState<AlertFormData>(blankForm)

  React.useEffect(() => {
    if (open) setForm(editing ? alertToForm(editing) : blankForm())
  }, [open, editing])

  const [emailModalOpen, setEmailModalOpen] = useState(false)
  const [metricsModalOpen, setMetricsModalOpen] = useState(false)

  // Derive platform(s) from the currently selected target
  const selectedPlatforms: string[] = React.useMemo(() => {
    if (!form.scope_id) return []
    if (form.scope === 'device') {
      const d = devices.find((d) => d.device_id === form.scope_id)
      return d ? [d.plateforme] : []
    }
    // group: collect unique platforms of all member devices
    const g = groups.find((g) => g.id === form.scope_id)
    if (!g) return []
    const platforms = new Set<string>()
    for (const did of g.device_ids) {
      const d = devices.find((d) => d.id === did || d.device_id === did)
      if (d) platforms.add(d.plateforme)
    }
    return Array.from(platforms)
  }, [form.scope, form.scope_id, devices, groups])

  const set = useCallback(<K extends keyof AlertFormData>(key: K, value: AlertFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }, [])

  const canSubmit = form.nom.trim().length > 0 &&
    form.scope_id !== '' &&
    (form.condition_type !== 'metadata_threshold' ||
      (form.metadata_key.trim().length > 0 && form.metadata_value.trim().length > 0)) &&
    (!form.email_enabled || form.email_recipients.length > 0)

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] w-full max-w-xl -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl border border-border bg-card shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4">
            <Dialog.Title className="text-lg font-semibold">
              {editing ? 'Edit Alert' : 'New Alert'}
            </Dialog.Title>
            <Dialog.Close className="rounded-md p-1.5 text-muted-foreground hover:bg-accent">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

            {/* Name */}
            <div>
              <label className="mb-1.5 block text-sm font-medium">Name <span className="text-destructive">*</span></label>
              <input
                type="text"
                value={form.nom}
                onChange={(e) => set('nom', e.target.value)}
                placeholder="e.g. High CPU alert"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            {/* Scope */}
            <div>
              <label className="mb-2 block text-sm font-medium">Target scope <span className="text-destructive">*</span></label>
              <div className="flex gap-2 mb-3">
                {(['device', 'group'] as AlertScope[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => { set('scope', s); set('scope_id', '') }}
                    className={cn(
                      'flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium capitalize transition-colors',
                      form.scope === s
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-background text-muted-foreground hover:bg-accent'
                    )}
                  >
                    {s === 'device' ? <Monitor className="h-3.5 w-3.5" /> : <Users className="h-3.5 w-3.5" />}
                    {s}
                  </button>
                ))}
              </div>
              <div className="relative">
                <select
                  value={form.scope_id}
                  onChange={(e) => set('scope_id', e.target.value)}
                  className="h-9 w-full appearance-none rounded-md border border-border bg-background pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">— Select {form.scope} —</option>
                  {form.scope === 'device'
                    ? devices.map((d) => (
                        <option key={d.id} value={d.device_id}>
                          {d.nom} ({d.plateforme}) — {d.statut}
                        </option>
                      ))
                    : groups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.nom} ({g.device_ids.length} devices)
                        </option>
                      ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>

            {/* Condition type */}
            <div>
              <label className="mb-2 block text-sm font-medium">Condition type <span className="text-destructive">*</span></label>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {CONDITION_TYPES.map((ct) => {
                  const meta = CONDITION_META[ct]
                  return (
                    <button
                      key={ct}
                      type="button"
                      onClick={() => set('condition_type', ct)}
                      className={cn(
                        'flex flex-col items-center gap-1 rounded-lg border p-3 text-center text-xs font-medium transition-colors',
                        form.condition_type === ct
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-border bg-background text-muted-foreground hover:bg-accent'
                      )}
                    >
                      {meta.icon}
                      {meta.label}
                    </button>
                  )
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                {CONDITION_META[form.condition_type].desc}
              </p>
            </div>

            {/* Condition parameters */}
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Condition parameters</p>

              {form.condition_type === 'log_level' && (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-foreground">Fire when log level equals</label>
                  <div className="relative">
                    <select
                      value={form.log_level}
                      onChange={(e) => set('log_level', e.target.value as LogLevel)}
                      className="h-9 w-full appearance-none rounded-md border border-border bg-background pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      {LOG_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {LOG_LEVELS.map((l) => (
                      <button
                        key={l}
                        type="button"
                        onClick={() => set('log_level', l)}
                        className={cn(
                          'rounded px-2 py-0.5 text-xs font-medium transition-all',
                          form.log_level === l
                            ? LOG_LEVEL_COLORS[l] + ' ring-2 ring-offset-1 ring-current'
                            : LOG_LEVEL_COLORS[l] + ' opacity-50'
                        )}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {form.condition_type === 'inactivity' && (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-foreground">
                    Fire after inactivity of (minutes)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10080}
                    value={form.inactivity_minutes}
                    onChange={(e) => set('inactivity_minutes', Number(e.target.value))}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Checked every 60 seconds by the backend scheduler.
                  </p>
                </div>
              )}

              {form.condition_type === 'metadata_threshold' && (
                <div className="space-y-3">
                  <div>
                    <div className="mb-1.5 flex items-center gap-1.5">
                      <label className="text-xs font-medium text-foreground">Metadata key</label>
                      <button
                        type="button"
                        disabled={form.scope_id === ''}
                        onClick={() => setMetricsModalOpen(true)}
                        title={form.scope_id === '' ? 'Select a target first' : 'Browse available metric keys'}
                        className={cn(
                          'flex items-center justify-center rounded-full p-0.5 transition-colors',
                          form.scope_id === ''
                            ? 'cursor-not-allowed text-muted-foreground/30'
                            : 'text-primary/70 hover:bg-primary/10 hover:text-primary'
                        )}
                      >
                        <Info className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={form.metadata_key}
                      onChange={(e) => set('metadata_key', e.target.value)}
                      placeholder="e.g. cpu_percent, ram_percent"
                      className="w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-foreground">Operator</label>
                      <div className="relative">
                        <select
                          value={form.metadata_operator}
                          onChange={(e) => set('metadata_operator', e.target.value as AlertConditionOperator)}
                          className="h-9 w-full appearance-none rounded-md border border-border bg-background pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                        >
                          {OPERATORS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-foreground">Value</label>
                      <input
                        type="text"
                        value={form.metadata_value}
                        onChange={(e) => set('metadata_value', e.target.value)}
                        placeholder="e.g. 90"
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                  </div>
                  {form.metadata_key && form.metadata_value && (
                    <div className="rounded-md bg-muted px-3 py-2 text-xs">
                      Fires when{' '}
                      <span className="font-mono font-semibold text-foreground">{form.metadata_key}</span>
                      {' '}<span className="font-semibold text-primary">{operatorSymbol(form.metadata_operator)}</span>{' '}
                      <span className="font-mono font-semibold text-foreground">{form.metadata_value}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Automation (optional) */}
            <div>
              <p className="mb-3 text-sm font-medium">Automation <span className="text-xs font-normal text-muted-foreground">(optional)</span></p>

              {/* Action */}
              <div className="mb-3">
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-foreground">
                  <Zap className="h-3.5 w-3.5 text-primary" /> Auto-execute action
                </label>
                <div className="relative">
                  <select
                    value={form.action_id}
                    onChange={(e) => set('action_id', e.target.value)}
                    className="h-9 w-full appearance-none rounded-md border border-border bg-background pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="">— None —</option>
                    {actions.map((a) => (
                      <option key={a.id} value={a.id}>{a.nom} ({a.type})</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>

              {/* Webhook */}
              <div className="mb-3">
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-foreground">
                  <Webhook className="h-3.5 w-3.5 text-primary" /> Webhook URL
                </label>
                <input
                  type="url"
                  value={form.webhook_url}
                  onChange={(e) => set('webhook_url', e.target.value)}
                  placeholder="https://hooks.example.com/notify"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              {/* Email notifications */}
              <div className="rounded-lg border border-border bg-muted/20 p-4">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm font-medium cursor-pointer select-none">
                    <Mail className="h-4 w-4 text-primary" />
                    Send email alerts
                  </label>
                  {/* Toggle switch */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={form.email_enabled}
                    onClick={() => {
                      const next = !form.email_enabled
                      set('email_enabled', next)
                      if (next && form.email_recipients.length === 0) {
                        setEmailModalOpen(true)
                      }
                    }}
                    className={cn(
                      'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50',
                      form.email_enabled ? 'bg-primary' : 'bg-muted-foreground/30'
                    )}
                  >
                    <span className={cn(
                      'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform',
                      form.email_enabled ? 'translate-x-5' : 'translate-x-0'
                    )} />
                  </button>
                </div>

                {form.email_enabled && (
                  <div className="mt-3 space-y-3">
                    {/* Cooldown selector */}
                    <div>
                      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-foreground">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        Send interval
                      </label>
                      <div className="relative">
                        <select
                          value={form.email_cooldown_minutes}
                          onChange={(e) => set('email_cooldown_minutes', Number(e.target.value))}
                          className="h-8 w-full appearance-none rounded-md border border-border bg-background pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                        >
                          <option value={0}>No limit — send every time</option>
                          <option value={5}>At most every 5 minutes</option>
                          <option value={10}>At most every 10 minutes</option>
                          <option value={15}>At most every 15 minutes</option>
                          <option value={30}>At most every 30 minutes</option>
                          <option value={60}>At most every hour</option>
                          <option value={360}>At most every 6 hours</option>
                          <option value={1440}>At most once a day</option>
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                      </div>
                      {form.email_cooldown_minutes === 0 && (
                        <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                          ⚠ No limit: a rapidly-firing rule could send many emails.
                        </p>
                      )}
                    </div>

                    {form.email_recipients.length > 0 ? (
                      <div className="space-y-1">
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {form.email_recipients.map((email) => (
                            <span key={email} className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                              <Mail className="h-3 w-3" />
                              {email}
                              <button
                                type="button"
                                onClick={() => set('email_recipients', form.email_recipients.filter((e) => e !== email))}
                                className="ml-0.5 rounded-full text-primary/60 hover:text-primary"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => setEmailModalOpen(true)}
                          className="text-xs text-primary underline underline-offset-2 hover:no-underline"
                        >
                          + Edit recipients
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setEmailModalOpen(true)}
                        className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-primary/40 py-2.5 text-sm text-primary hover:bg-primary/5"
                      >
                        <PlusCircle className="h-4 w-4" />
                        Configure recipients
                      </button>
                    )}
                    {form.email_enabled && form.email_recipients.length === 0 && (
                      <p className="mt-1.5 text-xs text-destructive">Add at least one recipient to enable email alerts.</p>
                    )}
                  </div>
                  )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex shrink-0 items-center justify-end gap-3 border-t border-border px-6 py-4">
            <Dialog.Close className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent">
              Cancel
            </Dialog.Close>
            <button
              type="button"
              onClick={() => onSave(form)}
              disabled={!canSubmit || isSaving}
              className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? 'Save changes' : 'Create alert'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>

      {/* Email recipients sub-modal — z-[60] to sit above main modal z-50 */}
      <EmailRecipientsModal
        open={emailModalOpen}
        onOpenChange={(open) => {
          setEmailModalOpen(open)
          // If user closes without adding anyone, turn off the toggle
          if (!open && form.email_recipients.length === 0) {
            set('email_enabled', false)
          }
        }}
        recipients={form.email_recipients}
        onSave={(list) => set('email_recipients', list)}
      />

      {/* Metrics info sub-modal — z-[70] to sit above email modal z-[60] */}
      <MetricsInfoModal
        open={metricsModalOpen}
        onOpenChange={setMetricsModalOpen}
        platforms={selectedPlatforms}
        onSelect={(key) => set('metadata_key', key)}
      />
    </Dialog.Root>
  )
}

// ─── History Modal ────────────────────────────────────────────────────────────

interface HistoryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  alert: Alert | null
  devices: Device[]
}

function HistoryModal({ open, onOpenChange, alert, devices }: HistoryModalProps) {
  const deviceName = useCallback((device_id: string) => {
    const d = devices.find((d) => d.device_id === device_id)
    return d ? d.nom : device_id
  }, [devices])

  const entries = [...(alert?.historique ?? [])].sort(
    (a, b) => new Date(b.triggered_at).getTime() - new Date(a.triggered_at).getTime()
  )

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[80vh] w-full max-w-xl -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl border border-border bg-card shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4">
            <div>
              <Dialog.Title className="text-lg font-semibold">Trigger History</Dialog.Title>
              {alert && <p className="mt-0.5 text-sm text-muted-foreground">{alert.nom}</p>}
            </div>
            <Dialog.Close className="rounded-md p-1.5 text-muted-foreground hover:bg-accent">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            {entries.length === 0 ? (
              <div className="py-10 text-center">
                <History className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No triggers recorded yet.</p>
                <p className="mt-1 text-xs text-muted-foreground">History appears here once the alert fires.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="mb-3 text-xs text-muted-foreground">{entries.length} trigger{entries.length !== 1 ? 's' : ''} recorded</p>
                {entries.map((entry, i) => (
                  <div key={i} className="rounded-lg border border-border bg-muted/20 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">{deviceName(entry.device_id)}</p>
                        <p className="font-mono text-xs text-muted-foreground">{entry.device_id}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium text-foreground">{formatDate(entry.triggered_at)}</p>
                      </div>
                    </div>
                    {Object.keys(entry.context).length > 0 && (
                      <div className="mt-2 rounded-md bg-muted px-2 py-1.5">
                        <p className="mb-1 text-xs font-semibold text-muted-foreground">Context</p>
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(entry.context).map(([k, v]) => (
                            <span key={k} className="rounded bg-background px-1.5 py-0.5 font-mono text-xs">
                              {k}={String(v)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex shrink-0 justify-end border-t border-border px-6 py-4">
            <Dialog.Close className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent">
              Close
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// ─── Alert Card ───────────────────────────────────────────────────────────────

interface AlertCardProps {
  alert: Alert
  actions: Action[]
  devices: Device[]
  groups: Group[]
  onEdit: () => void
  onDelete: () => void
  onToggle: () => void
  onHistory: () => void
  isToggling: boolean
}

function AlertCard({ alert, actions, devices, groups, onEdit, onDelete, onToggle, onHistory, isToggling }: AlertCardProps) {
  const condMeta = CONDITION_META[alert.condition.type]

  const scopeLabel = alert.scope === 'device'
    ? devices.find((d) => d.device_id === alert.scope_id)?.nom ?? alert.scope_id
    : groups.find((g) => g.id === alert.scope_id)?.nom ?? alert.scope_id

  const actionName = alert.action_id
    ? actions.find((a) => a.id === alert.action_id)?.nom
    : null

  const lastTriggered = alert.derniere_declenchee
    ? formatDate(alert.derniere_declenchee)
    : alert.historique.length > 0
      ? formatDate(alert.historique[alert.historique.length - 1]?.triggered_at ?? '')
      : null

  return (
    <div className={cn(
      'rounded-lg border bg-card shadow-sm transition-colors',
      alert.actif ? 'border-border' : 'border-border/50 opacity-75'
    )}>
      <div className="flex items-start gap-4 p-5">
        {/* Condition type icon */}
        <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', condMeta.color)}>
          {condMeta.icon}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-foreground">{alert.nom}</h3>
            {/* Active badge */}
            <span className={cn(
              'rounded-full px-2 py-0.5 text-xs font-medium',
              alert.actif
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                : 'bg-muted text-muted-foreground'
            )}>
              {alert.actif ? 'Active' : 'Inactive'}
            </span>
            {/* Condition type badge */}
            <span className={cn('rounded px-1.5 py-0.5 text-xs font-medium', condMeta.color)}>
              {condMeta.label}
            </span>
          </div>

          {/* Condition summary */}
          <p className="mt-1 text-sm text-muted-foreground">
            {conditionSummary(alert.condition)}
          </p>

          {/* Scope + extras */}
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              {alert.scope === 'device' ? <Monitor className="h-3.5 w-3.5" /> : <Users className="h-3.5 w-3.5" />}
              <span className="capitalize">{alert.scope}:</span>
              <span className="font-medium text-foreground">{scopeLabel}</span>
            </span>
            {actionName && (
              <span className="flex items-center gap-1">
                <Zap className="h-3.5 w-3.5 text-primary" />
                <span className="text-primary">{actionName}</span>
              </span>
            )}
            {alert.webhook_url && (
              <span className="flex items-center gap-1">
                <Webhook className="h-3.5 w-3.5" />
                <span className="max-w-[160px] truncate">{alert.webhook_url}</span>
              </span>
            )}
            {(alert.email_recipients?.length ?? 0) > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                <Mail className="h-3 w-3" />
                {alert.email_recipients.length} email{alert.email_recipients.length !== 1 ? 's' : ''}
                {alert.email_cooldown_minutes > 0
                  ? ` · every ${alert.email_cooldown_minutes >= 60
                      ? `${alert.email_cooldown_minutes / 60}h`
                      : `${alert.email_cooldown_minutes}min`}`
                  : ' · no limit'}
              </span>
            )}
          </div>

          {/* Last triggered */}
          {lastTriggered && (
            <p className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              Last triggered: {lastTriggered}
              {alert.historique.length > 0 && (
                <span className="ml-1 rounded bg-muted px-1.5 py-0.5 text-xs">
                  {alert.historique.length}×
                </span>
              )}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex shrink-0 flex-col items-end gap-2">
          {/* Toggle */}
          <button
            onClick={onToggle}
            disabled={isToggling}
            className="text-muted-foreground hover:text-foreground disabled:opacity-50"
            title={alert.actif ? 'Disable alert' : 'Enable alert'}
          >
            {isToggling
              ? <Loader2 className="h-6 w-6 animate-spin" />
              : alert.actif
                ? <ToggleRight className="h-6 w-6 text-emerald-500" />
                : <ToggleLeft className="h-6 w-6" />}
          </button>

          {/* Buttons row */}
          <div className="flex items-center gap-1">
            <button
              onClick={onHistory}
              className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-accent"
              title="View history"
            >
              <History className="h-3.5 w-3.5" />
              {alert.historique.length > 0 && alert.historique.length}
            </button>
            <button
              onClick={onEdit}
              className="rounded-md border border-border p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
              title="Edit"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={onDelete}
              className="rounded-md border border-border p-1.5 text-destructive/70 hover:bg-destructive/10 hover:text-destructive"
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AlertsPage(): React.ReactElement {
  const qc = useQueryClient()

  // UI state
  const [search, setSearch]               = useState('')
  const [scopeFilter, setScopeFilter]     = useState<AlertScope | ''>('')
  const [typeFilter, setTypeFilter]       = useState<AlertConditionType | ''>('')
  const [activeFilter, setActiveFilter]   = useState<'all' | 'active' | 'inactive'>('all')
  const [formOpen, setFormOpen]           = useState(false)
  const [editTarget, setEditTarget]       = useState<Alert | null>(null)
  const [deleteTarget, setDeleteTarget]   = useState<Alert | null>(null)
  const [historyTarget, setHistoryTarget] = useState<Alert | null>(null)
  const [toggling, setToggling]           = useState<string | null>(null)

  // Queries
  const { data: alerts = [], isLoading, isFetching, refetch } = useQuery<Alert[]>({
    queryKey: ['alerts'],
    queryFn: api.getAlerts,
  })

  const { data: actions = [] } = useQuery<Action[]>({
    queryKey: ['actions'],
    queryFn: api.getActions,
  })

  const { data: devicesData } = useQuery({
    queryKey: ['devices'],
    queryFn: () => api.getDevices({}),
  })
  const devices: Device[] = devicesData?.items ?? []

  const { data: groupsRaw } = useQuery({
    queryKey: ['groups'],
    queryFn: api.getGroups,
  })
  const groups: Group[] = Array.isArray(groupsRaw)
    ? groupsRaw
    : ((groupsRaw as unknown as { items?: Group[] })?.items ?? [])

  // Mutations
  const createMut = useMutation({
    mutationFn: (form: AlertFormData) =>
      api.createAlert({
        nom: form.nom,
        scope: form.scope,
        scope_id: form.scope_id,
        condition: formToCondition(form),
        action_id: form.action_id || null,
        webhook_url: form.webhook_url || null,
        email_recipients: form.email_enabled ? form.email_recipients : [],
        email_cooldown_minutes: form.email_cooldown_minutes,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['alerts'] })
      setFormOpen(false)
    },
  })

  const updateMut = useMutation({
    mutationFn: ({ id, form }: { id: string; form: AlertFormData }) =>
      api.updateAlert(id, {
        nom: form.nom,
        condition: formToCondition(form),
        action_id: form.action_id || null,
        webhook_url: form.webhook_url || null,
        email_recipients: form.email_enabled ? form.email_recipients : [],
        email_cooldown_minutes: form.email_cooldown_minutes,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['alerts'] })
      setFormOpen(false)
      setEditTarget(null)
    },
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.deleteAlert(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['alerts'] })
      setDeleteTarget(null)
    },
  })

  const toggleMut = useMutation({
    mutationFn: (id: string) => api.toggleAlert(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['alerts'] })
      setToggling(null)
    },
    onError: () => setToggling(null),
  })

  // Handlers
  const openCreate = useCallback(() => { setEditTarget(null); setFormOpen(true) }, [])
  const openEdit = useCallback((alert: Alert) => { setEditTarget(alert); setFormOpen(true) }, [])

  const handleSave = useCallback((form: AlertFormData) => {
    if (editTarget) {
      updateMut.mutate({ id: editTarget.id, form })
    } else {
      createMut.mutate(form)
    }
  }, [editTarget, createMut, updateMut])

  const handleToggle = useCallback((alert: Alert) => {
    setToggling(alert.id)
    toggleMut.mutate(alert.id)
  }, [toggleMut])

  // Stats
  const totalActive = alerts.filter((a) => a.actif).length
  const totalInactive = alerts.length - totalActive
  const totalTriggered = alerts.reduce((acc, a) => acc + a.historique.length, 0)

  // Filtered
  const filtered = alerts.filter((a) => {
    if (search && !a.nom.toLowerCase().includes(search.toLowerCase())) return false
    if (scopeFilter && a.scope !== scopeFilter) return false
    if (typeFilter && a.condition.type !== typeFilter) return false
    if (activeFilter === 'active' && !a.actif) return false
    if (activeFilter === 'inactive' && a.actif) return false
    return true
  })

  const isSaving = createMut.isPending || updateMut.isPending

  return (
    <div>
      <PageHeader
        title="Alerts"
        description="Configure monitoring rules to detect anomalies and trigger automated responses"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => void refetch()}
              disabled={isFetching}
              title="Refresh alerts"
              className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent disabled:opacity-50"
            >
              <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
              Refresh
            </button>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              New Alert
            </button>
          </div>
        }
      />

      {/* Stats bar */}
      {alerts.length > 0 && (
        <div className="mb-5 grid grid-cols-3 gap-3">
          <div
            className={cn(
              'cursor-pointer rounded-lg border p-3 transition-colors',
              activeFilter === 'active' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10' : 'border-border bg-card hover:bg-accent'
            )}
            onClick={() => setActiveFilter(activeFilter === 'active' ? 'all' : 'active')}
          >
            <p className="text-lg font-bold text-emerald-600">{totalActive}</p>
            <p className="text-xs text-muted-foreground">Active</p>
          </div>
          <div
            className={cn(
              'cursor-pointer rounded-lg border p-3 transition-colors',
              activeFilter === 'inactive' ? 'border-slate-500 bg-slate-50 dark:bg-slate-900/10' : 'border-border bg-card hover:bg-accent'
            )}
            onClick={() => setActiveFilter(activeFilter === 'inactive' ? 'all' : 'inactive')}
          >
            <p className="text-lg font-bold text-muted-foreground">{totalInactive}</p>
            <p className="text-xs text-muted-foreground">Inactive</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-lg font-bold text-amber-600">{totalTriggered}</p>
            <p className="text-xs text-muted-foreground">Total triggers</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search alerts…"
            className="h-9 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Scope filter */}
        <div className="relative">
          <select
            value={scopeFilter}
            onChange={(e) => setScopeFilter(e.target.value as AlertScope | '')}
            className="h-9 appearance-none rounded-md border border-border bg-background pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="">All scopes</option>
            <option value="device">Device</option>
            <option value="group">Group</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        </div>

        {/* Type filter */}
        <div className="relative">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as AlertConditionType | '')}
            className="h-9 appearance-none rounded-md border border-border bg-background pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="">All types</option>
            {CONDITION_TYPES.map((t) => (
              <option key={t} value={t}>{CONDITION_META[t].label}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        </div>

        {/* Count */}
        <span className="ml-auto text-sm text-muted-foreground">
          {filtered.length} / {alerts.length} alert{alerts.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-16">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty */}
      {!isLoading && alerts.length === 0 && (
        <EmptyState
          icon={<Bell className="h-8 w-8" />}
          title="No alerts configured"
          description="Set up rules to detect anomalies and trigger automated responses when devices misbehave."
          action={
            <button
              onClick={openCreate}
              className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              <Plus className="h-4 w-4" />
              Create alert
            </button>
          }
        />
      )}

      {/* No filter results */}
      {!isLoading && alerts.length > 0 && filtered.length === 0 && (
        <div className="py-12 text-center text-sm text-muted-foreground">
          No alerts match your filters.{' '}
          <button
            onClick={() => { setSearch(''); setScopeFilter(''); setTypeFilter(''); setActiveFilter('all') }}
            className="underline hover:text-foreground"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Alert list */}
      {!isLoading && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              actions={actions}
              devices={devices}
              groups={groups}
              onEdit={() => openEdit(alert)}
              onDelete={() => setDeleteTarget(alert)}
              onToggle={() => handleToggle(alert)}
              onHistory={() => setHistoryTarget(alert)}
              isToggling={toggleMut.isPending && toggling === alert.id}
            />
          ))}
        </div>
      )}

      {/* Form modal */}
      <AlertFormModal
        open={formOpen}
        onOpenChange={(open) => { setFormOpen(open); if (!open) setEditTarget(null) }}
        editing={editTarget}
        actions={actions}
        devices={devices}
        groups={groups}
        onSave={handleSave}
        isSaving={isSaving}
      />

      {/* History modal */}
      <HistoryModal
        open={historyTarget !== null}
        onOpenChange={(open) => { if (!open) setHistoryTarget(null) }}
        alert={historyTarget}
        devices={devices}
      />

      {/* Delete confirm */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
        title="Delete alert"
        description={`Are you sure you want to delete "${deleteTarget?.nom}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
        isLoading={deleteMut.isPending}
      />
    </div>
  )
}
