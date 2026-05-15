import React, { useState, useMemo } from 'react'
import {
  ClipboardList, Download, RefreshCw, ChevronDown,
  ChevronLeft, ChevronRight, X,
} from 'lucide-react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import * as api from '@/services/api'
import { cn, formatDate } from '@/lib/utils'

// ─── Constants ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 25

const ACTION_TYPES = [
  'CREATE_DEVICE',
  'REVOKE_DEVICE',
  'UPDATE_DEVICE',
  'SEND_COMMAND',
  'TRIGGER_UPDATE',
  'CREATE_GROUP',
  'UPDATE_GROUP',
  'DELETE_GROUP',
  'GROUP_COMMAND',
  'CREATE_ACTION',
  'EXECUTE_ACTION',
  'CREATE_INSTRUCTION',
  'EXECUTE_INSTRUCTION',
  'CREATE_ALERT',
  'DELETE_ALERT',
  'UPLOAD_AGENT_VERSION',
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function SelectFilter({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  placeholder: string
}): React.ReactElement {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none rounded-md border border-input bg-background py-2 pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AuditPage(): React.ReactElement {
  // ── Filters ──────────────────────────────────────────────────────────────
  const [actionType, setActionType] = useState('')
  const [resultat, setResultat] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // ── Pagination ────────────────────────────────────────────────────────────
  const [page, setPage] = useState(0)

  // Reset to page 0 whenever filters change
  function setFilter<T>(setter: React.Dispatch<React.SetStateAction<T>>) {
    return (v: T) => {
      setter(v)
      setPage(0)
    }
  }

  const activeFilters = useMemo(() => ({
    action_type: actionType || undefined,
    resultat: resultat || undefined,
    start_date: startDate ? new Date(startDate).toISOString() : undefined,
    end_date: endDate ? new Date(endDate + 'T23:59:59').toISOString() : undefined,
  }), [actionType, resultat, startDate, endDate])

  const hasActiveFilters = !!(actionType || resultat || startDate || endDate)

  function clearFilters(): void {
    setActionType('')
    setResultat('')
    setStartDate('')
    setEndDate('')
    setPage(0)
  }

  // ── Query ─────────────────────────────────────────────────────────────────
  const { data: auditData, isLoading, refetch } = useQuery({
    queryKey: ['audit', activeFilters, page],
    queryFn: () => api.getAuditLogs({
      ...activeFilters,
      skip: page * PAGE_SIZE,
      limit: PAGE_SIZE,
    }),
    staleTime: 60_000,
  })

  const exportMutation = useMutation({
    mutationFn: () => api.exportAuditCsv(activeFilters),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `audit-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    },
  })

  const logs = auditData?.items ?? []
  const total = auditData?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const canPrev = page > 0
  const canNext = page < totalPages - 1

  return (
    <div>
      <PageHeader
        title="Audit Log"
        description={`${total} event${total !== 1 ? 's' : ''}${hasActiveFilters ? ' matching filters' : ''}`}
        actions={
          <div className="flex gap-2">
            <button
              onClick={() => void refetch()}
              className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent"
            >
              <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
              Refresh
            </button>
            <button
              onClick={() => exportMutation.mutate()}
              disabled={exportMutation.isPending}
              className="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              {exportMutation.isPending ? 'Exporting…' : 'Export CSV'}
            </button>
          </div>
        }
      />

      {/* ── Filters bar ─────────────────────────────────────────────────── */}
      <div className="mb-4 flex flex-wrap items-center gap-3">

        {/* Action type */}
        <SelectFilter
          value={actionType}
          onChange={setFilter(setActionType)}
          placeholder="All actions"
          options={ACTION_TYPES.map((a) => ({ value: a, label: a.replace(/_/g, ' ') }))}
        />

        {/* Result */}
        <SelectFilter
          value={resultat}
          onChange={setFilter(setResultat)}
          placeholder="All results"
          options={[
            { value: 'success', label: 'Success' },
            { value: 'failure', label: 'Failure' },
          ]}
        />

        {/* Start date */}
        <div className="relative">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setFilter(setStartDate)(e.target.value)}
            className="rounded-md border border-input bg-background py-2 pl-3 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            title="From date"
          />
        </div>

        {/* End date */}
        <div className="relative">
          <input
            type="date"
            value={endDate}
            onChange={(e) => setFilter(setEndDate)(e.target.value)}
            min={startDate || undefined}
            className="rounded-md border border-input bg-background py-2 pl-3 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            title="To date"
          />
        </div>

        {/* Clear filters */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </button>
        )}
      </div>

      {/* ── Loading ─────────────────────────────────────────────────────── */}
      {isLoading && (
        <div className="flex justify-center py-16">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* ── Empty ───────────────────────────────────────────────────────── */}
      {!isLoading && logs.length === 0 && (
        <EmptyState
          icon={<ClipboardList className="h-8 w-8" />}
          title="No audit events"
          description={hasActiveFilters ? 'No events match the current filters.' : 'Operator actions will appear here.'}
        />
      )}

      {/* ── Table ───────────────────────────────────────────────────────── */}
      {!isLoading && logs.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Timestamp</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Operator</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Action</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Result</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr
                  key={log.id}
                  className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                    {formatDate(log.timestamp)}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{log.operateur_email}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{log.action_type}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'rounded px-1.5 py-0.5 text-xs font-medium',
                        log.resultat === 'success'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                      )}
                    >
                      {log.resultat}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{log.ip_address ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* ── Pagination footer ──────────────────────────────────────── */}
          <div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
            <span>
              {total === 0
                ? 'No results'
                : `${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, total)} of ${total}`}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => p - 1)}
                disabled={!canPrev}
                className="flex h-7 w-7 items-center justify-center rounded border border-border hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="px-2">
                Page {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={!canNext}
                className="flex h-7 w-7 items-center justify-center rounded border border-border hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
