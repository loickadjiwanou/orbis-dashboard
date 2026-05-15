import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Monitor, Search, RefreshCw, ChevronDown } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { DeviceStatusBadge } from '@/components/shared/DeviceStatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { useDevices } from '@/hooks/useDevices'
import { formatRelativeTime, cn } from '@/lib/utils'
import type { DeviceFilters, Platform, DeviceStatus } from '@/types'

const PLATFORMS: Array<{ value: Platform | ''; label: string }> = [
  { value: '', label: 'All Platforms' },
  { value: 'windows', label: 'Windows' },
  { value: 'linux', label: 'Linux' },
  { value: 'macos', label: 'macOS' },
  { value: 'android', label: 'Android' },
]

const STATUSES: Array<{ value: DeviceStatus | ''; label: string }> = [
  { value: '', label: 'All Statuses' },
  { value: 'online', label: 'Online' },
  { value: 'offline', label: 'Offline' },
  { value: 'unknown', label: 'Unknown' },
  { value: 'revoked', label: 'Revoked' },
]

export default function DevicesPage(): React.ReactElement {
  const [search, setSearch] = useState('')
  const [plateforme, setPlateforme] = useState<Platform | ''>('')
  const [statut, setStatut] = useState<DeviceStatus | ''>('')
  const [spinning, setSpinning] = useState(false)

  const filters: DeviceFilters = {
    search: search || undefined,
    plateforme: plateforme || undefined,
    statut: statut || undefined,
    limit: 50,
  }

  const { data, isLoading, error, refetch } = useDevices(filters)
  const devices = data?.items ?? []

  async function handleRefresh(): Promise<void> {
    setSpinning(true)
    try {
      await refetch()
    } finally {
      setSpinning(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Devices"
        description={`${data?.total ?? 0} total devices`}
        actions={
          <button
            onClick={() => void handleRefresh()}
            disabled={spinning}
            className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent disabled:opacity-60"
          >
            <RefreshCw className={cn('h-4 w-4', spinning && 'animate-spin')} />
            Refresh
          </button>
        }
      />

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        {/* Search */}
        <div className="relative min-w-48 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name or hostname…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Platform select */}
        <div className="relative">
          <select
            value={plateforme}
            onChange={(e) => setPlateforme(e.target.value as Platform | '')}
            className="appearance-none rounded-md border border-input bg-background py-2 pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {PLATFORMS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        </div>

        {/* Status select */}
        <div className="relative">
          <select
            value={statut}
            onChange={(e) => setStatut(e.target.value as DeviceStatus | '')}
            className="appearance-none rounded-md border border-input bg-background py-2 pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        </div>
      </div>

      {/* Table */}
      {isLoading && (
        <div className="flex justify-center py-16">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Failed to load devices: {error.message}
        </div>
      )}

      {!isLoading && !error && devices.length === 0 && (
        <EmptyState
          icon={<Monitor className="h-8 w-8" />}
          title="No devices found"
          description="No devices match your current filters."
        />
      )}

      {!isLoading && devices.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Hostname</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Platform</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Agent</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Last Seen</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((device) => (
                <tr
                  key={device.device_id}
                  className="border-b border-border last:border-0 transition-colors hover:bg-muted/20"
                >
                  <td className="px-4 py-3">
                    <Link
                      to={`/devices/${device.device_id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {device.nom}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {device.hostname}
                  </td>
                  <td className="px-4 py-3 capitalize text-muted-foreground">
                    {device.plateforme}
                  </td>
                  <td className="px-4 py-3">
                    <DeviceStatusBadge status={device.statut} size="sm" />
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    v{device.version_agent}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {formatRelativeTime(device.derniere_connexion)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
