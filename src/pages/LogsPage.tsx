import React, { useState } from 'react'
import { ScrollText, Search, RefreshCw, ChevronDown } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/layout/PageHeader'
import { LogLevelBadge } from '@/components/shared/LogLevelBadge'
import { RealtimeIndicator } from '@/components/shared/RealtimeIndicator'
import { EmptyState } from '@/components/shared/EmptyState'
import useUIStore from '@/stores/uiStore'
import * as api from '@/services/api'
import { formatDate, cn } from '@/lib/utils'
import type { Device, LogLevel } from '@/types'

const LEVELS: LogLevel[] = ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL']

const PLATFORM_OPTIONS = [
  { value: '', label: 'All agents' },
  { value: 'android', label: 'Android' },
  { value: 'linux', label: 'Linux (desktop)' },
  { value: 'macos', label: 'macOS (desktop)' },
  { value: 'windows', label: 'Windows (desktop)' },
]

const LEVEL_COLORS: Record<string, string> = {
  DEBUG:    'text-slate-400',
  INFO:     'text-blue-400',
  WARNING:  'text-amber-400',
  ERROR:    'text-red-400',
  CRITICAL: 'text-red-600',
}

export default function LogsPage(): React.ReactElement {
  const wsConnected = useUIStore((s) => s.wsConnected)

  // Filters
  const [plateforme, setPlateforme] = useState('')
  const [deviceId, setDeviceId] = useState('')
  const [level, setLevel] = useState<LogLevel | ''>('')
  const [search, setSearch] = useState('')
  const [spinning, setSpinning] = useState(false)

  // Load all devices for the device picker (filtered by selected platform)
  const { data: devicesData } = useQuery({
    queryKey: ['devices', { plateforme: plateforme || undefined, limit: 500 }],
    queryFn: () => api.getDevices({ plateforme: plateforme || undefined, limit: 500 }),
    staleTime: 60_000,
  })
  const devices: Device[] = devicesData?.items ?? []

  // Logs query
  const { data: logsData, isLoading, refetch } = useQuery({
    queryKey: ['all-logs', { plateforme, deviceId, level, search }],
    queryFn: () => api.getAllLogs({
      plateforme: plateforme || undefined,
      device_id: deviceId || undefined,
      level: (level || undefined) as LogLevel | undefined,
      search: search || undefined,
      limit: 200,
    }),
    staleTime: 15_000,
  })

  const logs = logsData?.items ?? []

  async function handleRefresh(): Promise<void> {
    setSpinning(true)
    try {
      await refetch()
    } finally {
      setSpinning(false)
    }
  }

  // When platform changes, reset device selection
  function handlePlatformChange(val: string): void {
    setPlateforme(val)
    setDeviceId('')
  }

  return (
    <div>
      <PageHeader
        title="Logs"
        description={`${logsData?.total ?? 0} total entries`}
        actions={<RealtimeIndicator active={wsConnected} label="Live" />}
      />

      {/* Filters bar */}
      <div className="mb-4 flex flex-wrap gap-3">

        {/* Agent type (platform) */}
        <div className="relative">
          <select
            value={plateforme}
            onChange={(e) => handlePlatformChange(e.target.value)}
            className="appearance-none rounded-md border border-input bg-background py-2 pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {PLATFORM_OPTIONS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        </div>

        {/* Device picker */}
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

        {/* Level */}
        <div className="relative">
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value as LogLevel | '')}
            className="appearance-none rounded-md border border-input bg-background py-2 pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All levels</option>
            {LEVELS.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        </div>

        {/* Search */}
        <div className="relative min-w-52 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search messages…"
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
      {!isLoading && logs.length === 0 && (
        <EmptyState
          icon={<ScrollText className="h-8 w-8" />}
          title="No logs found"
          description="No log entries match the current filters."
        />
      )}

      {/* Table */}
      {!isLoading && logs.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Timestamp</th>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Level</th>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Device</th>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Source</th>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Message</th>
                </tr>
              </thead>
              <tbody className="font-mono divide-y divide-border/40">
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className={cn(
                      'hover:bg-muted/20 transition-colors',
                      (log.level === 'ERROR' || log.level === 'CRITICAL') && 'bg-destructive/[0.03]',
                    )}
                  >
                    <td className="px-4 py-2 whitespace-nowrap text-muted-foreground/70">
                      {formatDate(log.timestamp)}
                    </td>
                    <td className="px-4 py-2">
                      <LogLevelBadge level={log.level} size="sm" />
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <span className="text-muted-foreground/80">{log.device_id.slice(0, 8)}…</span>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <span className={cn('font-semibold', LEVEL_COLORS[log.level] ?? 'text-foreground')}>
                        [{log.source}]
                      </span>
                    </td>
                    <td className="px-4 py-2 break-all text-foreground">{log.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-border px-4 py-2 text-xs text-muted-foreground">
            <span>Showing {logs.length} of {logsData?.total ?? 0} entries</span>
            {(logsData?.total ?? 0) > 200 && (
              <span className="text-amber-500">Showing latest 200 — use filters to narrow results</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
