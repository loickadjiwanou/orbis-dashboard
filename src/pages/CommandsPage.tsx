import React, { useState, useMemo } from 'react'
import { Terminal, RefreshCw, ChevronDown, ChevronRight, CheckCircle2, XCircle, Loader2, Search } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/layout/PageHeader'
import { CommandLifecycle } from '@/components/shared/CommandLifecycle'
import { RealtimeIndicator } from '@/components/shared/RealtimeIndicator'
import { EmptyState } from '@/components/shared/EmptyState'
import useUIStore from '@/stores/uiStore'
import * as api from '@/services/api'
import { formatDate, formatRelativeTime, cn } from '@/lib/utils'
import type { Device, CommandStatus, Command } from '@/types'

const STATUSES: Array<{ value: CommandStatus | ''; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'sent', label: 'Sent' },
  { value: 'acknowledged', label: 'Acknowledged' },
  { value: 'executing', label: 'Executing' },
  { value: 'success', label: 'Success' },
  { value: 'failed', label: 'Failed' },
]

const STATUS_COLORS: Record<CommandStatus, string> = {
  pending:      'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  sent:         'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  acknowledged: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  executing:    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  success:      'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  failed:       'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

const TYPE_ICONS: Record<string, string> = {
  shell:           '$',
  restart_service: '↺',
  collect_now:     '⇣',
  scan_network:    '⬡',
  get_info:        'i',
  agent_update:    '↑',
}

/** Returns the searchable text for a command (type + shell command if applicable). */
function commandSearchText(cmd: Command): string {
  const base = cmd.type.toLowerCase()
  if (cmd.type === 'shell' && cmd.payload?.command) {
    return base + ' ' + String(cmd.payload.command).toLowerCase()
  }
  return base
}

function CommandCard({ cmd, devices }: { cmd: Command; devices: Device[] }): React.ReactElement {
  const [expanded, setExpanded] = useState(false)

  const device = devices.find((d) => d.device_id === cmd.device_id)
  const deviceLabel = device ? `${device.nom} (${device.hostname})` : cmd.device_id.slice(0, 12) + '…'

  const hasPayload = cmd.payload && Object.keys(cmd.payload).length > 0
  const payloadStr = hasPayload ? JSON.stringify(cmd.payload, null, 2) : null

  return (
    <div
      className={cn(
        'rounded-xl border bg-card shadow-sm transition-all',
        cmd.statut === 'failed' ? 'border-destructive/30' : 'border-border',
      )}
    >
      {/* Header row */}
      <div className="flex items-start gap-3 p-4">
        {/* Type icon */}
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted font-mono text-sm font-bold text-muted-foreground select-none">
          {TYPE_ICONS[cmd.type] ?? '?'}
        </div>

        {/* Main info */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-semibold">{cmd.type}</span>
            <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', STATUS_COLORS[cmd.statut])}>
              {cmd.statut}
            </span>
            {cmd.exit_code !== null && cmd.exit_code !== undefined && (
              <span className={cn(
                'rounded-full px-2 py-0.5 text-[11px] font-mono font-medium',
                cmd.exit_code === 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700',
              )}>
                exit {cmd.exit_code}
              </span>
            )}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            <span className="font-medium text-foreground/70">{deviceLabel}</span>
            <span>{formatRelativeTime(cmd.cree_le)}</span>
            <span>by {cmd.cree_par}</span>
          </div>

          {/* Inline payload preview for shell */}
          {cmd.type === 'shell' && cmd.payload?.command && (
            <p className="mt-1.5 truncate rounded bg-muted/60 px-2 py-1 font-mono text-xs text-foreground/80">
              {String(cmd.payload.command)}
            </p>
          )}
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-0.5 shrink-0 rounded p-1 hover:bg-muted"
          title={expanded ? 'Collapse' : 'Expand details'}
        >
          <ChevronRight className={cn('h-4 w-4 text-muted-foreground transition-transform', expanded && 'rotate-90')} />
        </button>
      </div>

      {/* Lifecycle bar */}
      <div className="border-t border-border/50 px-4 py-3">
        <CommandLifecycle statut={cmd.statut} compact={false} />
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-border/50 p-4 space-y-3">
          {/* Timing grid */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-3 lg:grid-cols-5">
            {(
              [
                { label: 'Created', val: cmd.cree_le },
                { label: 'Sent', val: cmd.envoye_le },
                { label: 'Ack', val: cmd.acquitte_le },
                { label: 'Started', val: cmd.execute_le },
                { label: 'Done', val: cmd.termine_le },
              ] as { label: string; val: string | null | undefined }[]
            ).map(({ label, val }) => (
              <div key={label}>
                <p className="text-muted-foreground">{label}</p>
                <p className="font-mono text-[11px] text-foreground/80">{val ? formatDate(val) : '—'}</p>
              </div>
            ))}
          </div>

          {/* Full payload */}
          {hasPayload && (
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Payload</p>
              <pre className="max-h-40 overflow-y-auto rounded-lg bg-muted px-3 py-2 font-mono text-xs">
                {payloadStr}
              </pre>
            </div>
          )}

          {/* Output */}
          {cmd.resultat && (
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Output</p>
              <pre className="max-h-48 overflow-y-auto rounded-lg bg-muted px-3 py-2 font-mono text-xs text-foreground/90">
                {cmd.resultat}
              </pre>
            </div>
          )}

          {/* Error */}
          {cmd.error_message && (
            <div>
              <p className="mb-1 text-xs font-medium text-destructive">Error</p>
              <pre className="max-h-32 overflow-y-auto rounded-lg bg-destructive/10 px-3 py-2 font-mono text-xs text-destructive">
                {cmd.error_message}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function CommandsPage(): React.ReactElement {
  const wsConnected = useUIStore((s) => s.wsConnected)

  const [deviceId, setDeviceId] = useState('')
  const [statut, setStatut] = useState<CommandStatus | ''>('')
  const [search, setSearch] = useState('')
  const [spinning, setSpinning] = useState(false)

  const { data: devicesData } = useQuery({
    queryKey: ['devices', { limit: 500 }],
    queryFn: () => api.getDevices({ limit: 500 }),
    staleTime: 60_000,
  })
  const devices: Device[] = devicesData?.items ?? []

  // ── Stats query — only filter by device, never by status/type ──────────────
  // This ensures the stat cards always reflect reality, regardless of active filters.
  const { data: statsData } = useQuery({
    queryKey: ['commands-stats', deviceId],
    queryFn: () => api.getAllCommands({
      device_id: deviceId || undefined,
      limit: 200,
    }),
    refetchInterval: 5_000,
    staleTime: 3_000,
  })

  // ── Filtered list query — device + status filter (server-side) ─────────────
  const { data: commandsData, isLoading, refetch } = useQuery({
    queryKey: ['commands-list', deviceId, statut],
    queryFn: () => api.getAllCommands({
      device_id: deviceId || undefined,
      statut: statut || undefined,
      limit: 100,
    }),
    refetchInterval: 5_000,
    staleTime: 3_000,
  })

  // ── Client-side search filter ──────────────────────────────────────────────
  const allCommands = commandsData?.items ?? []
  const commands = useMemo(() => {
    if (!search.trim()) return allCommands
    const q = search.trim().toLowerCase()
    return allCommands.filter((cmd) => commandSearchText(cmd).includes(q))
  }, [allCommands, search])

  // Stats always from the unfiltered (by status) query
  const statsItems = statsData?.items ?? []
  const statsTotal = statsData?.total ?? 0
  const statsByStatus = {
    pending:      statsItems.filter((c) => c.statut === 'pending').length,
    sent:         statsItems.filter((c) => c.statut === 'sent').length,
    acknowledged: statsItems.filter((c) => c.statut === 'acknowledged').length,
    executing:    statsItems.filter((c) => c.statut === 'executing').length,
    success:      statsItems.filter((c) => c.statut === 'success').length,
    failed:       statsItems.filter((c) => c.statut === 'failed').length,
  }

  async function handleRefresh(): Promise<void> {
    setSpinning(true)
    try { await refetch() } finally { setSpinning(false) }
  }

  return (
    <div>
      <PageHeader
        title="Commands"
        description={`${statsTotal} total commands`}
        actions={<RealtimeIndicator active={wsConnected} label="Live" />}
      />

      {/* Stats — always global (filtered by device only). Clickable to apply status filter. */}
      <div className="mb-5 grid grid-cols-3 gap-3 sm:grid-cols-6">
        {/* Total — clears all filters */}
        <button
          onClick={() => setStatut('')}
          className={cn(
            'rounded-xl border p-3 text-left shadow-sm transition-all hover:ring-2 hover:ring-ring',
            statut === '' ? 'border-foreground/30 ring-2 ring-ring' : 'border-border bg-card',
          )}
        >
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="mt-1 text-xl font-bold">{statsTotal}</p>
        </button>

        {/* Executing */}
        <button
          onClick={() => setStatut('executing')}
          className={cn(
            'rounded-xl border p-3 text-left shadow-sm transition-all hover:ring-2 hover:ring-amber-400',
            statut === 'executing'
              ? 'border-amber-400 ring-2 ring-amber-400 bg-amber-50 dark:bg-amber-900/10'
              : 'border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-900/10',
          )}
        >
          <p className="text-xs text-amber-600 dark:text-amber-400">Executing</p>
          <div className="mt-1 flex items-center gap-1.5">
            <p className="text-xl font-bold text-amber-700 dark:text-amber-400">{statsByStatus.executing}</p>
            {statsByStatus.executing > 0 && <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-500" />}
          </div>
        </button>

        {/* Sent */}
        <button
          onClick={() => setStatut('sent')}
          className={cn(
            'rounded-xl border p-3 text-left shadow-sm transition-all hover:ring-2 hover:ring-blue-400',
            statut === 'sent'
              ? 'border-blue-400 ring-2 ring-blue-400 bg-blue-50 dark:bg-blue-900/10'
              : 'border-blue-200 bg-blue-50 dark:border-blue-900/40 dark:bg-blue-900/10',
          )}
        >
          <p className="text-xs text-blue-600 dark:text-blue-400">Sent</p>
          <p className="mt-1 text-xl font-bold text-blue-700 dark:text-blue-400">{statsByStatus.sent}</p>
        </button>

        {/* Pending */}
        <button
          onClick={() => setStatut('pending')}
          className={cn(
            'rounded-xl border p-3 text-left shadow-sm transition-all hover:ring-2 hover:ring-slate-400',
            statut === 'pending'
              ? 'border-slate-400 ring-2 ring-slate-400 bg-slate-100 dark:bg-slate-800'
              : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/30',
          )}
        >
          <p className="text-xs text-slate-500 dark:text-slate-400">Pending</p>
          <p className="mt-1 text-xl font-bold text-slate-700 dark:text-slate-300">{statsByStatus.pending}</p>
        </button>

        {/* Succeeded */}
        <button
          onClick={() => setStatut('success')}
          className={cn(
            'rounded-xl border p-3 text-left shadow-sm transition-all hover:ring-2 hover:ring-green-400',
            statut === 'success'
              ? 'border-green-400 ring-2 ring-green-400 bg-green-50 dark:bg-green-900/10'
              : 'border-green-200 bg-green-50 dark:border-green-900/40 dark:bg-green-900/10',
          )}
        >
          <p className="text-xs text-green-600 dark:text-green-400">Succeeded</p>
          <div className="mt-1 flex items-center gap-1.5">
            <p className="text-xl font-bold text-green-700 dark:text-green-400">{statsByStatus.success}</p>
            {statsByStatus.success > 0 && <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />}
          </div>
        </button>

        {/* Failed */}
        <button
          onClick={() => setStatut('failed')}
          className={cn(
            'rounded-xl border p-3 text-left shadow-sm transition-all hover:ring-2 hover:ring-red-400',
            statut === 'failed'
              ? 'border-red-400 ring-2 ring-red-400 bg-red-50 dark:bg-red-900/10'
              : 'border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-900/10',
          )}
        >
          <p className="text-xs text-red-600 dark:text-red-400">Failed</p>
          <div className="mt-1 flex items-center gap-1.5">
            <p className="text-xl font-bold text-red-700 dark:text-red-400">{statsByStatus.failed}</p>
            {statsByStatus.failed > 0 && <XCircle className="h-3.5 w-3.5 text-red-500" />}
          </div>
        </button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        {/* Device */}
        <div className="relative">
          <select
            value={deviceId}
            onChange={(e) => setDeviceId(e.target.value)}
            className="appearance-none rounded-md border border-input bg-background py-2 pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All devices</option>
            {devices.map((d) => (
              <option key={d.device_id} value={d.device_id}>
                {d.nom} ({d.hostname})
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        </div>

        {/* Status */}
        <div className="relative">
          <select
            value={statut}
            onChange={(e) => setStatut(e.target.value as CommandStatus | '')}
            className="appearance-none rounded-md border border-input bg-background py-2 pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        </div>

        {/* Search */}
        <div className="relative min-w-52 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search type or shell command…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Refresh */}
        <button
          onClick={() => void handleRefresh()}
          disabled={spinning || isLoading}
          className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent disabled:opacity-60"
        >
          <RefreshCw className={cn('h-4 w-4', (spinning || isLoading) && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-16">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty */}
      {!isLoading && commands.length === 0 && (
        <EmptyState
          icon={<Terminal className="h-8 w-8" />}
          title="No commands found"
          description="No commands match the current filters."
        />
      )}

      {/* Command list */}
      {!isLoading && commands.length > 0 && (
        <div className="space-y-3">
          {commands.map((cmd) => (
            <CommandCard key={cmd.id} cmd={cmd} devices={devices} />
          ))}
          <p className="py-2 text-center text-xs text-muted-foreground">
            Showing {commands.length} of {commandsData?.total ?? 0} commands
            {(commandsData?.total ?? 0) > 100 && ' — use filters to narrow results'}
          </p>
        </div>
      )}
    </div>
  )
}
