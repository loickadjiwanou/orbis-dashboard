import React, { useState, useEffect } from 'react'
import {
  Download, Star, RefreshCw, Plus, Trash2, Rocket,
  Copy, Check, X, Loader2, ChevronDown, Info,
  Monitor, Smartphone, Server, AlertTriangle, CheckCircle2,
  ArrowRight, ShieldCheck, Zap, RotateCcw, Users, Clock,
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as Dialog from '@radix-ui/react-dialog'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import * as api from '@/services/api'
import { cn, formatDate } from '@/lib/utils'
import type { AgentVersion, Device, Group } from '@/types'
import type { AgentUpdateProgressData } from '@/types/websocket'
import wsService from '@/services/websocket'

// ── Platform config ───────────────────────────────────────────────────────────

const PLATFORMS = [
  { id: 'all',     label: 'All Platforms' },
  { id: 'linux',   label: 'Linux' },
  { id: 'macos',   label: 'macOS' },
  { id: 'windows', label: 'Windows' },
  { id: 'android', label: 'Android' },
] as const

type PlatformId = typeof PLATFORMS[number]['id']

const PLATFORM_BADGE: Record<string, string> = {
  linux:   'bg-orange-500/10 text-orange-400 border-orange-500/20',
  macos:   'bg-sky-500/10 text-sky-400 border-sky-500/20',
  windows: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  android: 'bg-green-500/10 text-green-400 border-green-500/20',
}

const STEP_LABELS: Record<string, string> = {
  downloading: 'Downloading binary…',
  verifying:   'Verifying SHA-256…',
  replacing:   'Replacing executable…',
  restarting:  'Restarting agent…',
  success:     'Update successful',
  rollback:    'Rollback triggered',
}

const STEP_ICON: Record<string, React.ReactElement> = {
  downloading: <RefreshCw className="h-3.5 w-3.5 animate-spin text-blue-400" />,
  verifying:   <RefreshCw className="h-3.5 w-3.5 animate-spin text-violet-400" />,
  replacing:   <RefreshCw className="h-3.5 w-3.5 animate-spin text-amber-400" />,
  restarting:  <RefreshCw className="h-3.5 w-3.5 animate-spin text-teal-400" />,
  success:     <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />,
  rollback:    <AlertTriangle className="h-3.5 w-3.5 text-destructive" />,
}

// ── Upload Version Modal ──────────────────────────────────────────────────────

const EMPTY_FORM = {
  version: '',
  plateforme: 'linux' as string,
  url_download: '',
  hash_sha256: '',
  changelog: '',
}

function UploadVersionModal({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onCreated: () => void
}): React.ReactElement {
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState<string | null>(null)

  const createMut = useMutation({
    mutationFn: api.createAgentVersion,
    onSuccess: () => {
      setForm(EMPTY_FORM)
      setError(null)
      onOpenChange(false)
      onCreated()
    },
    onError: (err: Error) => setError(err.message),
  })

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault()
    if (!form.version.trim() || !form.url_download.trim() || !form.hash_sha256.trim()) {
      setError('Version, URL, and SHA-256 are required.')
      return
    }
    setError(null)
    createMut.mutate(form)
  }

  return (
    <Dialog.Root open={open} onOpenChange={(v) => { if (!v) setForm(EMPTY_FORM); onOpenChange(v) }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Plus className="h-4 w-4 text-primary" />
              </div>
              <div>
                <Dialog.Title className="text-sm font-semibold">Add Agent Version</Dialog.Title>
                <Dialog.Description className="text-[11px] text-muted-foreground">
                  Register a new version for OTA deployment
                </Dialog.Description>
              </div>
            </div>
            <Dialog.Close asChild>
              <button className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 p-5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-foreground">
                  Version <span className="text-destructive">*</span>
                </label>
                <input
                  value={form.version}
                  onChange={(e) => setForm((f) => ({ ...f, version: e.target.value }))}
                  placeholder="e.g. 1.2.3"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-foreground">Platform <span className="text-destructive">*</span></label>
                <div className="relative">
                  <select
                    value={form.plateforme}
                    onChange={(e) => setForm((f) => ({ ...f, plateforme: e.target.value }))}
                    className="w-full appearance-none rounded-lg border border-input bg-background py-2 pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="linux">Linux</option>
                    <option value="macos">macOS</option>
                    <option value="windows">Windows</option>
                    <option value="android">Android</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-foreground">
                Download URL <span className="text-destructive">*</span>
              </label>
              <input
                value={form.url_download}
                onChange={(e) => setForm((f) => ({ ...f, url_download: e.target.value }))}
                placeholder="https://example.com/orbis-agent-1.2.3-linux"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-foreground">
                SHA-256 Hash <span className="text-destructive">*</span>
              </label>
              <input
                value={form.hash_sha256}
                onChange={(e) => setForm((f) => ({ ...f, hash_sha256: e.target.value }))}
                placeholder="e3b0c44298fc1c149afb…"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-foreground">Changelog</label>
              <textarea
                value={form.changelog}
                onChange={(e) => setForm((f) => ({ ...f, changelog: e.target.value }))}
                placeholder="What's new in this version…"
                rows={3}
                className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {error && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>
            )}

            <div className="flex justify-end gap-3 pt-1">
              <Dialog.Close asChild>
                <button type="button" className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent">
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="submit"
                disabled={createMut.isPending}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {createMut.isPending
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
                  : <><Plus className="h-4 w-4" /> Add Version</>}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// ── Deploy Result ─────────────────────────────────────────────────────────────

interface DeployResult {
  device_id: string
  command_id?: string
  status: 'sent' | 'failed'
  error?: string
}

// ── Deploy Modal ──────────────────────────────────────────────────────────────

function DeployModal({
  version,
  devices,
  groups,
  open,
  onOpenChange,
  liveProgress,
}: {
  version: AgentVersion | null
  devices: Device[]
  groups: Group[]
  open: boolean
  onOpenChange: (v: boolean) => void
  liveProgress: Record<string, AgentUpdateProgressData>
}): React.ReactElement {
  const [targetType, setTargetType] = useState<'device' | 'group'>('device')
  const [targetId, setTargetId] = useState('')
  const [results, setResults] = useState<DeployResult[]>([])
  const [deployed, setDeployed] = useState(false)

  // Reset when closed
  useEffect(() => {
    if (!open) {
      setTargetId('')
      setResults([])
      setDeployed(false)
    }
  }, [open])

  const deployDeviceMut = useMutation({
    mutationFn: ({ deviceId, versionId }: { deviceId: string; versionId: string }) =>
      api.triggerUpdate(deviceId, versionId),
    onSuccess: (cmd) => {
      setResults([{ device_id: cmd.device_id, command_id: cmd.command_id, status: 'sent' }])
      setDeployed(true)
    },
    onError: (err: Error) => {
      setResults([{ device_id: targetId, status: 'failed', error: err.message }])
      setDeployed(true)
    },
  })

  const deployGroupMut = useMutation({
    mutationFn: ({ groupId, versionId }: { groupId: string; versionId: string }) =>
      api.triggerGroupUpdate(groupId, versionId),
    onSuccess: (data) => {
      setResults(data.results as DeployResult[])
      setDeployed(true)
    },
    onError: (err: Error) => {
      setResults([{ device_id: targetId, status: 'failed', error: err.message }])
      setDeployed(true)
    },
  })

  const isPending = deployDeviceMut.isPending || deployGroupMut.isPending

  // Filter devices to match version platform
  const compatibleDevices = version
    ? devices.filter((d) => d.plateforme === version.plateforme && d.statut !== 'revoked')
    : []
  const compatibleGroups = version
    ? groups.filter((g) => !g.plateforme || g.plateforme === version.plateforme)
    : []

  function handleDeploy(): void {
    if (!version || !targetId) return
    if (targetType === 'device') {
      deployDeviceMut.mutate({ deviceId: targetId, versionId: version.id })
    } else {
      deployGroupMut.mutate({ groupId: targetId, versionId: version.id })
    }
  }

  if (!version) return <></>

  const sentCount = results.filter((r) => r.status === 'sent').length
  const failedCount = results.filter((r) => r.status === 'failed').length

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10">
                <Rocket className="h-4 w-4 text-violet-500" />
              </div>
              <div>
                <Dialog.Title className="text-sm font-semibold">Deploy Agent Update</Dialog.Title>
                <Dialog.Description className="text-[11px] text-muted-foreground">
                  v{version.version} · {version.plateforme}
                </Dialog.Description>
              </div>
            </div>
            <Dialog.Close asChild>
              <button className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="space-y-4 p-5">
            {!deployed ? (
              <>
                {/* Target type toggle */}
                <div>
                  <p className="mb-2 text-xs font-medium text-foreground">Deploy to</p>
                  <div className="grid grid-cols-2 gap-2">
                    {(['device', 'group'] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => { setTargetType(type); setTargetId('') }}
                        className={cn(
                          'flex items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-medium transition-colors',
                          targetType === type
                            ? 'border-primary/60 bg-primary/10 text-primary'
                            : 'border-border bg-muted/30 text-muted-foreground hover:border-border hover:bg-muted/60',
                        )}
                      >
                        {type === 'device'
                          ? <Monitor className="h-4 w-4" />
                          : <Server className="h-4 w-4" />}
                        {type === 'device' ? 'Single Device' : 'Group'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Target picker */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-foreground">
                    {targetType === 'device' ? 'Device' : 'Group'} <span className="text-destructive">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={targetId}
                      onChange={(e) => setTargetId(e.target.value)}
                      className="w-full appearance-none rounded-lg border border-input bg-background py-2 pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">Select a {targetType}…</option>
                      {targetType === 'device'
                        ? compatibleDevices.map((d) => (
                            <option key={d.device_id} value={d.device_id}>
                              {d.nom} ({d.hostname}) — {d.statut}
                            </option>
                          ))
                        : compatibleGroups.map((g) => (
                            <option key={g.id} value={g.id}>
                              {g.nom} — {g.device_ids.length} device{g.device_ids.length !== 1 ? 's' : ''}
                            </option>
                          ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  </div>
                  {targetType === 'device' && compatibleDevices.length === 0 && (
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      No {version.plateforme} devices available.
                    </p>
                  )}
                  {targetType === 'group' && compatibleGroups.length === 0 && (
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      No compatible groups found.
                    </p>
                  )}
                </div>

                {/* Warning */}
                <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3.5 py-3">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
                  <p className="text-xs text-muted-foreground">
                    The agent will be updated immediately. The device will briefly go offline during the restart phase.
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-1">
                  <Dialog.Close asChild>
                    <button type="button" className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent">
                      Cancel
                    </button>
                  </Dialog.Close>
                  <button
                    type="button"
                    disabled={isPending || !targetId}
                    onClick={handleDeploy}
                    className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
                  >
                    {isPending
                      ? <><Loader2 className="h-4 w-4 animate-spin" /> Deploying…</>
                      : <><Rocket className="h-4 w-4" /> Deploy</>}
                  </button>
                </div>
              </>
            ) : (
              /* Results view */
              <>
                {/* Summary */}
                <div className="flex items-center gap-3">
                  {failedCount === 0
                    ? <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                    : <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />}
                  <p className="text-sm font-medium">
                    {sentCount} command{sentCount !== 1 ? 's' : ''} sent
                    {failedCount > 0 && `, ${failedCount} failed`}
                  </p>
                </div>

                {/* Per-device results */}
                <div className="max-h-52 space-y-1.5 overflow-y-auto">
                  {results.map((r) => {
                    const progress = r.command_id ? liveProgress[r.command_id] : undefined
                    return (
                      <div
                        key={r.device_id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="font-mono text-xs text-foreground truncate">{r.device_id.slice(0, 20)}…</p>
                          {progress && (
                            <div className="mt-0.5 flex items-center gap-1.5">
                              {STEP_ICON[progress.step] ?? <RefreshCw className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                              <span className="text-[11px] text-muted-foreground">
                                {STEP_LABELS[progress.step] ?? progress.step}
                              </span>
                            </div>
                          )}
                          {r.error && (
                            <p className="mt-0.5 text-[11px] text-destructive">{r.error}</p>
                          )}
                        </div>
                        <span className={cn(
                          'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                          r.status === 'sent'
                            ? progress?.step === 'success'
                              ? 'bg-emerald-500/10 text-emerald-500'
                              : progress?.step === 'rollback'
                              ? 'bg-destructive/10 text-destructive'
                              : 'bg-blue-500/10 text-blue-400'
                            : 'bg-destructive/10 text-destructive',
                        )}>
                          {r.status === 'failed' ? 'Failed' : progress?.step === 'success' ? 'Done' : 'Sent'}
                        </span>
                      </div>
                    )
                  })}
                </div>

                <div className="flex justify-end pt-1">
                  <Dialog.Close asChild>
                    <button className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                      Close
                    </button>
                  </Dialog.Close>
                </div>
              </>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// ── Live Progress Panel ───────────────────────────────────────────────────────

function LiveProgressPanel({
  progress,
  onDismiss,
}: {
  progress: Record<string, AgentUpdateProgressData>
  onDismiss: () => void
}): React.ReactElement {
  const entries = Object.values(progress)
  const active = entries.filter((e) => e.step !== 'success' && e.step !== 'rollback')
  const done = entries.filter((e) => e.step === 'success' || e.step === 'rollback')

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="absolute top-0 h-0.5 w-full bg-gradient-to-r from-violet-500 to-blue-500" />
      <div className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet-500/10">
              <Rocket className="h-3.5 w-3.5 text-violet-500" />
            </div>
            <p className="text-sm font-semibold text-foreground">
              Live Update Progress
              {active.length > 0 && (
                <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-medium text-blue-400">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400" />
                  {active.length} in progress
                </span>
              )}
            </p>
          </div>
          <button
            onClick={onDismiss}
            className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {entries.map((p) => (
            <div
              key={p.command_id}
              className={cn(
                'flex items-center gap-3 rounded-xl border px-3 py-2.5',
                p.step === 'success'  ? 'border-emerald-500/30 bg-emerald-500/5' :
                p.step === 'rollback' ? 'border-destructive/30 bg-destructive/5' :
                                        'border-border/60 bg-muted/20',
              )}
            >
              <div className="shrink-0">
                {STEP_ICON[p.step] ?? <RefreshCw className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-mono text-xs font-medium text-foreground truncate">
                  {p.device_id.slice(0, 24)}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {STEP_LABELS[p.step] ?? p.step}
                  {p.error && <span className="ml-1 text-destructive">— {p.error}</span>}
                </p>
              </div>
            </div>
          ))}
        </div>

        {done.length > 0 && active.length === 0 && (
          <p className="mt-3 text-center text-xs text-muted-foreground">
            All updates finished. You can dismiss this panel.
          </p>
        )}
      </div>
    </div>
  )
}

// ── Adoption helpers ──────────────────────────────────────────────────────────

interface AdoptionStats {
  total: number
  upToDate: number
  percent: number | null
  pending: Device[]
  offline: Device[]
}

function getAdoptionStats(version: AgentVersion, allDevices: Device[]): AdoptionStats {
  const platformDevices = allDevices.filter(
    (d) => d.plateforme === version.plateforme && d.statut !== 'revoked',
  )
  const upToDate = platformDevices.filter((d) => d.version_agent === version.version)
  const pending  = platformDevices.filter((d) => d.version_agent !== version.version)
  const offline  = pending.filter((d) => d.statut === 'offline')
  const percent  = platformDevices.length > 0
    ? Math.round((upToDate.length / platformDevices.length) * 100)
    : null
  return { total: platformDevices.length, upToDate: upToDate.length, percent, pending, offline }
}

function adoptionColor(percent: number): string {
  if (percent >= 90) return 'text-emerald-500'
  if (percent >= 50) return 'text-amber-500'
  return 'text-destructive'
}

function adoptionBarColor(percent: number): string {
  if (percent >= 90) return 'bg-emerald-500'
  if (percent >= 50) return 'bg-amber-500'
  return 'bg-destructive'
}

// ── Adoption Modal ────────────────────────────────────────────────────────────

function AdoptionModal({
  version,
  devices,
  open,
  onOpenChange,
  onDeployOutdated,
}: {
  version: AgentVersion | null
  devices: Device[]
  open: boolean
  onOpenChange: (v: boolean) => void
  onDeployOutdated: (version: AgentVersion) => void
}): React.ReactElement {
  if (!version) return <></>

  const stats = getAdoptionStats(version, devices)
  const platformDevices = devices.filter(
    (d) => d.plateforme === version.plateforme && d.statut !== 'revoked',
  )

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          <div className="flex max-h-[80vh] flex-col overflow-hidden rounded-2xl border border-border bg-card">

            {/* Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
                  <Users className="h-4 w-4 text-blue-500" />
                </div>
                <div>
                  <Dialog.Title className="text-sm font-semibold">
                    Adoption — v{version.version} · {version.plateforme}
                  </Dialog.Title>
                  <Dialog.Description className="text-[11px] text-muted-foreground">
                    {stats.upToDate} of {stats.total} device{stats.total !== 1 ? 's' : ''} on this version
                  </Dialog.Description>
                </div>
              </div>
              <Dialog.Close asChild>
                <button className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </Dialog.Close>
            </div>

            {/* Stats summary */}
            {stats.total > 0 && (
              <div className="shrink-0 border-b border-border px-5 py-3">
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className={cn('font-semibold', stats.percent !== null ? adoptionColor(stats.percent) : 'text-muted-foreground')}>
                    {stats.percent !== null ? `${stats.percent}% up to date` : 'No data'}
                  </span>
                  <span className="text-muted-foreground">
                    {stats.upToDate}/{stats.total} devices
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn('h-full rounded-full transition-all', stats.percent !== null ? adoptionBarColor(stats.percent) : 'bg-muted-foreground')}
                    style={{ width: `${stats.percent ?? 0}%` }}
                  />
                </div>
              </div>
            )}

            {/* Device list */}
            <div className="min-h-0 flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
              {platformDevices.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Users className="mb-3 h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No {version.plateforme} devices registered</p>
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {platformDevices
                    .sort((a, b) => {
                      // up-to-date first, then by name
                      const aOk = a.version_agent === version.version
                      const bOk = b.version_agent === version.version
                      if (aOk !== bOk) return aOk ? -1 : 1
                      return a.nom.localeCompare(b.nom)
                    })
                    .map((device) => {
                      const isUpToDate = device.version_agent === version.version
                      return (
                        <div
                          key={device.device_id}
                          className="flex items-center gap-3 px-5 py-3"
                        >
                          {/* Status indicator */}
                          <div className={cn(
                            'h-2 w-2 shrink-0 rounded-full',
                            isUpToDate
                              ? 'bg-emerald-500'
                              : device.statut === 'online'
                              ? 'bg-amber-500'
                              : 'bg-muted-foreground/40',
                          )} />

                          {/* Device info */}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">{device.nom}</p>
                            <p className="truncate text-[11px] text-muted-foreground">{device.hostname}</p>
                          </div>

                          {/* Version badge */}
                          <div className="flex shrink-0 items-center gap-2">
                            <span className={cn(
                              'rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold',
                              isUpToDate
                                ? 'bg-emerald-500/10 text-emerald-500'
                                : 'bg-amber-500/10 text-amber-500',
                            )}>
                              v{device.version_agent}
                            </span>
                            {isUpToDate
                              ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                              : device.statut === 'online'
                              ? <Clock className="h-3.5 w-3.5 text-amber-500" />
                              : <span className="text-[10px] text-muted-foreground">offline</span>}
                          </div>
                        </div>
                      )
                    })}
                </div>
              )}
            </div>

            {/* Footer */}
            {stats.pending.length > 0 && (
              <div className="shrink-0 border-t border-border px-5 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">
                    <span className="font-semibold text-amber-500">{stats.pending.length}</span> device{stats.pending.length !== 1 ? 's' : ''} not yet on v{version.version}
                    {stats.offline.length > 0 && (
                      <span className="ml-1 text-muted-foreground/60">
                        ({stats.offline.length} offline)
                      </span>
                    )}
                  </p>
                  <button
                    onClick={() => { onOpenChange(false); onDeployOutdated(version) }}
                    className="flex shrink-0 items-center gap-1.5 rounded-lg bg-violet-600/10 px-3 py-1.5 text-xs font-medium text-violet-500 transition-colors hover:bg-violet-600/20"
                  >
                    <Rocket className="h-3.5 w-3.5" />
                    Deploy to outdated
                  </button>
                </div>
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// ── SHA-256 Copy Button ───────────────────────────────────────────────────────

function CopyHash({ hash }: { hash: string }): React.ReactElement {
  const [copied, setCopied] = useState(false)
  function handleCopy(): void {
    void navigator.clipboard.writeText(hash)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button
      onClick={handleCopy}
      title="Copy full SHA-256"
      className="ml-1 inline-flex items-center gap-1 rounded px-1 py-0.5 text-muted-foreground/60 transition-colors hover:text-muted-foreground"
    >
      {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
    </button>
  )
}

// ── Version Card ──────────────────────────────────────────────────────────────

function VersionCard({
  version,
  devices,
  onSetCurrent,
  onDeploy,
  onDelete,
  onViewAdoption,
  settingCurrent,
}: {
  version: AgentVersion
  devices: Device[]
  onSetCurrent: (id: string) => void
  onDeploy: (v: AgentVersion) => void
  onDelete: (v: AgentVersion) => void
  onViewAdoption: (v: AgentVersion) => void
  settingCurrent: boolean
}): React.ReactElement {
  const [expanded, setExpanded] = useState(false)
  const stats = getAdoptionStats(version, devices)

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border bg-card shadow-sm transition-shadow hover:shadow-md',
        version.is_current ? 'border-primary/40' : 'border-border',
      )}
    >
      {/* Top accent */}
      {version.is_current && (
        <div className="absolute top-0 h-0.5 w-full bg-gradient-to-r from-primary to-violet-500" />
      )}

      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          {/* Left: info */}
          <div className="min-w-0 flex-1">
            {/* Badges row */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-mono text-base font-bold text-foreground">
                v{version.version}
              </span>
              {version.is_current && (
                <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  <Star className="h-2.5 w-2.5 fill-primary" />
                  Current
                </span>
              )}
              <span className={cn(
                'rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize',
                PLATFORM_BADGE[version.plateforme] ?? 'bg-muted text-muted-foreground border-border',
              )}>
                {version.plateforme}
              </span>
            </div>

            {/* Changelog */}
            {version.changelog && (
              <div className="mt-2">
                <p className={cn(
                  'text-sm text-muted-foreground',
                  !expanded && 'line-clamp-2',
                )}>
                  {version.changelog}
                </p>
                {version.changelog.length > 100 && (
                  <button
                    onClick={() => setExpanded((v) => !v)}
                    className="mt-0.5 flex items-center gap-0.5 text-[11px] text-primary hover:underline"
                  >
                    {expanded ? 'Show less' : 'Show more'}
                    <ChevronDown className={cn('h-3 w-3 transition-transform', expanded && 'rotate-180')} />
                  </button>
                )}
              </div>
            )}

            {/* Adoption bar */}
            {stats.total > 0 && (
              <button
                onClick={() => onViewAdoption(version)}
                className="mt-3 w-full text-left"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Users className="h-3 w-3" />
                    {stats.upToDate}/{stats.total} devices on this version
                  </span>
                  <span className={cn('font-semibold', stats.percent !== null ? adoptionColor(stats.percent) : '')}>
                    {stats.percent !== null ? `${stats.percent}%` : '—'}
                    {stats.pending.length > 0 && (
                      <span className="ml-1 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-500">
                        {stats.pending.length} pending
                      </span>
                    )}
                  </span>
                </div>
                <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn('h-full rounded-full transition-all', stats.percent !== null ? adoptionBarColor(stats.percent) : 'bg-muted-foreground')}
                    style={{ width: `${stats.percent ?? 0}%` }}
                  />
                </div>
              </button>
            )}

            {/* Meta */}
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span>Released {formatDate(version.date_release)}</span>
              <span className="inline-flex items-center font-mono">
                SHA-256: {version.hash_sha256.slice(0, 16)}…
                <CopyHash hash={version.hash_sha256} />
              </span>
            </div>
          </div>

          {/* Right: actions */}
          <div className="flex shrink-0 flex-col gap-2">
            <a
              href={version.url_download}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </a>
            <button
              onClick={() => onDeploy(version)}
              className="flex items-center gap-1.5 rounded-lg bg-violet-600/10 px-3 py-1.5 text-xs font-medium text-violet-500 transition-colors hover:bg-violet-600/20"
            >
              <Rocket className="h-3.5 w-3.5" />
              Deploy
            </button>
            {!version.is_current && (
              <button
                onClick={() => onSetCurrent(version.id)}
                disabled={settingCurrent}
                className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
              >
                {settingCurrent
                  ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Setting…</>
                  : <><Star className="h-3.5 w-3.5" /> Set Current</>}
              </button>
            )}
            <button
              onClick={() => onDelete(version)}
              className="flex items-center gap-1.5 rounded-lg border border-destructive/30 px-3 py-1.5 text-xs text-destructive/70 transition-colors hover:border-destructive/60 hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Updates Info Modal ────────────────────────────────────────────────────────

function UpdatesInfoModal({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}): React.ReactElement {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        {/*
          Dialog.Content : positionnement uniquement — pas d'overflow, pas de flex.
          Le transform (-translate) crée un contexte de rendu GPU ; y mettre
          overflow-hidden provoque le clipping incohérent des enfants au scroll.
        */}
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-2xl shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          {/*
            Wrapper intérieur : c'est lui qui contrainte la hauteur, gère le flex
            et clippe les coins arrondis — sans transform, donc sans artefacts.
          */}
          <div className="flex max-h-[88vh] flex-col overflow-hidden rounded-2xl border border-border bg-card">

            {/* Header statique */}
            <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10">
                  <Info className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <Dialog.Title className="text-sm font-semibold text-foreground">
                    How Agent Updates Work
                  </Dialog.Title>
                  <Dialog.Description className="text-[11px] text-muted-foreground">
                    Complete guide — from registering a version to live deployment
                  </Dialog.Description>
                </div>
              </div>
              <Dialog.Close asChild>
                <button className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </Dialog.Close>
            </div>

            {/* Zone de scroll — scrollbar masquée (elle était figée) */}
            <div
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
              style={{ scrollbarWidth: 'none' }}
            >
          <div className="space-y-5 p-6">

            {/* ── Overall flow ── */}
            <section>
              <h3 className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <Zap className="h-3.5 w-3.5" />
                Overall update flow
              </h3>
              <ol className="space-y-2">
                {[
                  { step: '1', label: 'Add Version', desc: 'Register the binary URL, SHA-256 hash and changelog in the dashboard.' },
                  { step: '2', label: 'Set Current', desc: 'Mark that version as the active reference for its platform.' },
                  { step: '3', label: 'Deploy', desc: 'Trigger the update on a specific device or on every device of a group.' },
                  { step: '4', label: 'Agent updates', desc: 'The agent downloads, verifies, replaces the binary and restarts.' },
                  { step: '5', label: 'Live status', desc: 'Each step is published by the agent and relayed to the dashboard in real time.' },
                ].map((item) => (
                  <li key={item.step} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                      {item.step}
                    </span>
                    <div className="min-w-0">
                      <span className="text-xs font-semibold text-foreground">{item.label} — </span>
                      <span className="text-xs text-muted-foreground">{item.desc}</span>
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            {/* ── Step 1: Add a version ── */}
            <section className="rounded-xl border border-border bg-muted/20 p-4">
              <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold text-foreground">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">1</span>
                Add a version
              </h3>
              <p className="mb-3 text-xs text-muted-foreground">
                Click <strong className="text-foreground">Add Version</strong> and fill in the form. No binary is uploaded to Orbis — only a reference is stored:
              </p>
              <div className="space-y-2">
                {[
                  { field: 'Version', desc: 'Semantic version string (e.g. 1.2.3). Used for display and agent-side verification.' },
                  { field: 'Platform', desc: 'linux / macos / windows / android. A version is scoped to one platform — it can only be deployed to matching devices.' },
                  { field: 'Download URL', desc: 'Public HTTPS URL to the agent binary (.elf, .exe, .apk…). The agent fetches it directly at update time.' },
                  { field: 'SHA-256', desc: 'Full hex digest of the binary. The agent recomputes it after download and aborts if it does not match.' },
                  { field: 'Changelog', desc: 'Optional release notes — displayed in the dashboard and included in the command payload sent to the agent.' },
                ].map((item) => (
                  <div key={item.field} className="flex gap-3">
                    <span className="mt-px w-24 shrink-0 font-mono text-[11px] font-semibold text-foreground">{item.field}</span>
                    <span className="text-[11px] text-muted-foreground">{item.desc}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* ── Step 2: Set Current ── */}
            <section className="rounded-xl border border-border bg-muted/20 p-4">
              <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold text-foreground">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">2</span>
                Set a version as Current
              </h3>
              <p className="text-xs text-muted-foreground">
                The <strong className="text-foreground">Current</strong> badge marks the canonical release for a platform.
                Only one version per platform can be current — promoting a new one automatically demotes the previous.
                It does not push anything to devices: deployment is always a deliberate, explicit action.
              </p>
            </section>

            {/* ── Step 3: Deploy ── */}
            <section className="rounded-xl border border-border bg-muted/20 p-4">
              <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold text-foreground">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">3</span>
                Deploy to a device or group
              </h3>
              <p className="mb-3 text-xs text-muted-foreground">
                Click <strong className="text-foreground">Deploy</strong> on a version card and pick a target:
              </p>
              <div className="space-y-2">
                <div className="flex gap-3">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center">
                    <Monitor className="h-3.5 w-3.5 text-blue-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-foreground">Single Device</p>
                    <p className="text-[11px] text-muted-foreground">
                      Sends one <span className="font-mono text-[10px] text-foreground/80">agent_update</span> command to that device via MQTT.
                      Only devices matching the version's platform are shown.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center">
                    <Server className="h-3.5 w-3.5 text-violet-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-foreground">Group</p>
                    <p className="text-[11px] text-muted-foreground">
                      Sends the command to every device in the group in parallel.
                      Per-device results (sent / failed) appear immediately after dispatch.
                    </p>
                  </div>
                </div>
              </div>
              <p className="mt-3 text-[11px] text-muted-foreground">
                Each dispatch creates a persistent Command record containing the version number, download URL, SHA-256 hash, and changelog.
                The command is published simultaneously to{' '}
                <span className="font-mono text-[10px] text-foreground/80">devices/&#123;id&#125;/commands</span>{' '}
                and the alias topic{' '}
                <span className="font-mono text-[10px] text-foreground/80">devices/&#123;id&#125;/update</span>.
              </p>
            </section>

            {/* ── Platform-specific update process ── */}
            <section>
              <h3 className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <Monitor className="h-3.5 w-3.5" />
                Update process per platform
              </h3>
              <div className="space-y-3">

                {/* Linux / macOS */}
                <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold', PLATFORM_BADGE['linux'])}>Linux</span>
                    <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold', PLATFORM_BADGE['macos'])}>macOS</span>
                  </div>
                  <ol className="space-y-2">
                    {[
                      ['Receive', 'Agent receives the agent_update command via MQTT.'],
                      ['Download', 'Binary is downloaded using libcurl into a temp file.'],
                      ['Verify', 'SHA-256 is recomputed with OpenSSL EVP and compared. Mismatch → abort.'],
                      ['Backup', 'Current executable is copied to orbis-agent.bak.'],
                      ['Replace', 'New binary atomically replaces the old one using rename() (POSIX) — zero-gap swap.'],
                      ['Restart', 'Agent service restarts via systemctl restart (Linux) or launchctl (macOS).'],
                      ['Report', 'Each step is published to devices/{id}/update_progress.'],
                    ].map(([label, desc]) => (
                      <li key={label} className="flex gap-3 text-[11px]">
                        <span className="w-14 shrink-0 font-semibold text-foreground/90">{label}</span>
                        <span className="text-muted-foreground">{desc}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                {/* Windows */}
                <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
                  <div className="mb-3">
                    <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold', PLATFORM_BADGE['windows'])}>Windows</span>
                  </div>
                  <ol className="space-y-2">
                    {[
                      ['Receive / Download / Verify', 'Identical to Linux — libcurl download + OpenSSL SHA-256 check.'],
                      ['Backup', 'Current executable is copied to orbis-agent.exe.bak.'],
                      ['Replace', 'Uses MoveFileEx with the MOVEFILE_REPLACE_EXISTING flag — handles file-in-use constraints specific to Windows.'],
                      ['Restart', 'Agent service restarts through the Windows Service Control Manager (SCM).'],
                      ['Report', 'Each step is published to the update_progress MQTT topic.'],
                    ].map(([label, desc]) => (
                      <li key={label} className="flex gap-3 text-[11px]">
                        <span className="w-14 shrink-0 font-semibold text-foreground/90 leading-snug">{label}</span>
                        <span className="text-muted-foreground">{desc}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                {/* Android */}
                <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4">
                  <div className="mb-3">
                    <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold', PLATFORM_BADGE['android'])}>Android</span>
                  </div>
                  <ol className="space-y-2">
                    {[
                      ['Receive', 'Agent receives the agent_update command (timeout 300 s).'],
                      ['Download', 'APK is downloaded via OkHttp (120 s read timeout) into app-private cache storage.'],
                      ['Verify', 'SHA-256 is recomputed and compared. Mismatch → abort and report error.'],
                      ['Install', 'An installation intent is launched via FileProvider with a scoped URI. The Android system displays the install prompt — requires user approval or MDM pre-authorisation.'],
                      ['Restart', 'PackageReceiver intercepts ACTION_MY_PACKAGE_REPLACED after successful install and automatically restarts OrbisService.'],
                      ['Note', 'Silent background updates are not possible on Android — the OS always requires explicit approval for APK installation outside the Play Store.'],
                    ].map(([label, desc]) => (
                      <li key={label} className="flex gap-3 text-[11px]">
                        <span className="w-14 shrink-0 font-semibold text-foreground/90 leading-snug">{label}</span>
                        <span className="text-muted-foreground">{desc}</span>
                      </li>
                    ))}
                  </ol>
                </div>

              </div>
            </section>

            {/* ── Live progress tracking ── */}
            <section className="rounded-xl border border-border bg-muted/20 p-4">
              <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold text-foreground">
                <Zap className="h-4 w-4 text-violet-400" />
                Live progress tracking
              </h3>
              <p className="mb-3 text-xs text-muted-foreground">
                During an update, the agent publishes each step to{' '}
                <span className="font-mono text-[10px] text-foreground/80">devices/&#123;device_id&#125;/update_progress</span>.
                The backend relays these events to the dashboard via WebSocket — the <strong className="text-foreground">Live Update Progress</strong> panel appears automatically.
              </p>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                {[
                  { step: 'downloading', label: 'Downloading', color: 'bg-blue-400' },
                  { step: 'verifying',   label: 'Verifying SHA-256', color: 'bg-violet-400' },
                  { step: 'replacing',   label: 'Replacing binary', color: 'bg-amber-400' },
                  { step: 'restarting',  label: 'Restarting agent', color: 'bg-teal-400' },
                  { step: 'success',     label: 'Update successful', color: 'bg-emerald-500' },
                  { step: 'rollback',    label: 'Rollback triggered', color: 'bg-destructive' },
                ].map((s) => (
                  <div key={s.step} className="flex items-center gap-2 rounded-lg border border-border/60 bg-background/50 px-2.5 py-2">
                    <span className={cn('h-2 w-2 shrink-0 rounded-full', s.color)} />
                    <p className="text-[11px] text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* ── Rollback ── */}
            <section className="rounded-xl border border-border bg-muted/20 p-4">
              <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold text-foreground">
                <RotateCcw className="h-4 w-4 text-amber-400" />
                Automatic rollback (desktop only)
              </h3>
              <p className="text-xs text-muted-foreground">
                On Linux, macOS, and Windows, if any step fails after the backup is created (checksum mismatch, download error, replace failure),
                the agent automatically restores{' '}
                <span className="font-mono text-[10px] text-foreground/80">orbis-agent.bak</span>{' '}
                and reports a <span className="font-mono text-[10px] text-foreground/80">rollback</span> step.
                The device stays operational on the previous version.
                Android has no automatic rollback — if the install prompt is dismissed, the previous APK remains installed and the service keeps running normally.
              </p>
            </section>

            {/* ── Security ── */}
            <section className="rounded-xl border border-border bg-muted/20 p-4">
              <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold text-foreground">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                Security guarantees
              </h3>
              <div className="space-y-2">
                {[
                  'The SHA-256 hash is always verified by the agent before any file is replaced — a corrupted or tampered binary is rejected.',
                  'Download URLs must be HTTPS. The agent validates the TLS certificate.',
                  'The update command is delivered over MQTT with QoS 1, authenticated with the device\'s unique per-device token — only authorised Orbis operators can trigger a deployment.',
                  'On Android, the APK is stored in app-private cache (not world-readable) and served to the system installer via FileProvider with a scoped, one-time URI.',
                ].map((text, i) => (
                  <div key={i} className="flex gap-2.5 text-[11px] text-muted-foreground">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500/70" />
                    <span>{text}</span>
                  </div>
                ))}
              </div>
            </section>

          </div>
            </div>{/* fin zone scroll */}
          </div>{/* fin wrapper intérieur */}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function UpdatesPage(): React.ReactElement {
  const qc = useQueryClient()

  // UI state
  const [platformFilter, setPlatformFilter] = useState<PlatformId>('all')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)
  const [deployVersion, setDeployVersion] = useState<AgentVersion | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AgentVersion | null>(null)
  const [adoptionVersion, setAdoptionVersion] = useState<AgentVersion | null>(null)
  const [settingCurrentId, setSettingCurrentId] = useState<string | null>(null)

  // Live update progress from WebSocket
  const [liveProgress, setLiveProgress] = useState<Record<string, AgentUpdateProgressData>>({})
  const [showProgress, setShowProgress] = useState(false)

  // Subscribe to update progress events
  useEffect(() => {
    const unsub = wsService.on('agent_update_progress', (data) => {
      setLiveProgress((prev) => ({ ...prev, [data.command_id]: data }))
      setShowProgress(true)
    })
    return unsub
  }, [])

  // Queries
  const { data: versions = [], isFetching, refetch } = useQuery<AgentVersion[], Error>({
    queryKey: ['agent-versions'],
    queryFn: () => api.getAgentVersions(),
    staleTime: 30_000,
  })

  const { data: devicesData } = useQuery({
    queryKey: ['devices', { limit: 1000 }],
    queryFn: () => api.getDevices({ limit: 1000 }),
    staleTime: 60_000,
  })
  const devices: Device[] = devicesData?.items ?? []

  const { data: groups = [] } = useQuery({
    queryKey: ['groups'],
    queryFn: api.getGroups,
    staleTime: 60_000,
  })

  // Mutations
  const setCurrentMut = useMutation({
    mutationFn: api.setCurrentVersion,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['agent-versions'] })
      setSettingCurrentId(null)
    },
    onSettled: () => setSettingCurrentId(null),
  })

  const deleteMut = useMutation({
    mutationFn: api.deleteAgentVersion,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['agent-versions'] })
      setDeleteTarget(null)
    },
  })

  // Filtered versions
  const filteredVersions = platformFilter === 'all'
    ? versions
    : versions.filter((v) => v.plateforme === platformFilter)

  // Platform counts
  const countByPlatform = PLATFORMS.reduce<Record<string, number>>((acc, p) => {
    acc[p.id] = p.id === 'all'
      ? versions.length
      : versions.filter((v) => v.plateforme === p.id).length
    return acc
  }, {})

  // Current version per platform (for adoption % on tabs)
  const currentByPlatform = versions.reduce<Record<string, AgentVersion>>((acc, v) => {
    if (v.is_current) acc[v.plateforme] = v
    return acc
  }, {})

  // Adoption % per platform tab (based on current version)
  const platformAdoption = PLATFORMS.reduce<Record<string, number | null>>((acc, p) => {
    if (p.id === 'all') {
      acc[p.id] = null
      return acc
    }
    const current = currentByPlatform[p.id]
    if (!current) { acc[p.id] = null; return acc }
    const stats = getAdoptionStats(current, devices)
    acc[p.id] = stats.percent
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agent Updates"
        description="Manage OTA agent releases and deploy updates to your fleet"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setInfoOpen(true)}
              title="How agent updates work"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Info className="h-4 w-4" />
            </button>
            <button
              onClick={() => void refetch()}
              disabled={isFetching}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
            >
              <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
              Refresh
            </button>
            <button
              onClick={() => setUploadOpen(true)}
              className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Add Version
            </button>
          </div>
        }
      />

      {/* Platform filter tabs */}
      <div className="flex gap-0.5 overflow-x-auto rounded-xl border border-border bg-muted/40 p-1">
        {PLATFORMS.map((p) => {
          const adoption = platformAdoption[p.id]
          return (
            <button
              key={p.id}
              onClick={() => setPlatformFilter(p.id)}
              className={cn(
                'flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                platformFilter === p.id
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {p.id === 'android' ? (
                <Smartphone className="h-3.5 w-3.5" />
              ) : p.id === 'all' ? (
                <Server className="h-3.5 w-3.5" />
              ) : (
                <Monitor className="h-3.5 w-3.5" />
              )}
              {p.label}
              {countByPlatform[p.id] > 0 && (
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] tabular-nums">
                  {countByPlatform[p.id]}
                </span>
              )}
              {adoption !== null && (
                <span className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums',
                  adoptionColor(adoption),
                  adoption >= 90 ? 'bg-emerald-500/10' : adoption >= 50 ? 'bg-amber-500/10' : 'bg-destructive/10',
                )}>
                  {adoption}%
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Live progress panel */}
      {showProgress && Object.keys(liveProgress).length > 0 && (
        <LiveProgressPanel
          progress={liveProgress}
          onDismiss={() => { setShowProgress(false); setLiveProgress({}) }}
        />
      )}

      {/* Loading */}
      {isFetching && versions.length === 0 && (
        <div className="flex justify-center py-16">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty state */}
      {!isFetching && filteredVersions.length === 0 && (
        <EmptyState
          icon={<Download className="h-8 w-8" />}
          title={platformFilter === 'all' ? 'No agent versions yet' : `No ${platformFilter} versions`}
          description={
            platformFilter === 'all'
              ? 'Add a version to enable over-the-air updates for your fleet.'
              : `No versions registered for the ${platformFilter} platform yet.`
          }
        />
      )}

      {/* Version cards */}
      {filteredVersions.length > 0 && (
        <div className="space-y-3">
          {filteredVersions.map((version) => (
            <VersionCard
              key={version.id}
              version={version}
              devices={devices}
              onSetCurrent={(id) => { setSettingCurrentId(id); setCurrentMut.mutate(id) }}
              onDeploy={setDeployVersion}
              onDelete={setDeleteTarget}
              onViewAdoption={setAdoptionVersion}
              settingCurrent={setCurrentMut.isPending && settingCurrentId === version.id}
            />
          ))}
        </div>
      )}

      {/* Info modal */}
      <UpdatesInfoModal open={infoOpen} onOpenChange={setInfoOpen} />

      {/* Adoption modal */}
      <AdoptionModal
        version={adoptionVersion}
        devices={devices}
        open={adoptionVersion !== null}
        onOpenChange={(v) => { if (!v) setAdoptionVersion(null) }}
        onDeployOutdated={(v) => { setAdoptionVersion(null); setDeployVersion(v) }}
      />

      {/* Upload modal */}
      <UploadVersionModal
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onCreated={() => void qc.invalidateQueries({ queryKey: ['agent-versions'] })}
      />

      {/* Deploy modal */}
      <DeployModal
        version={deployVersion}
        devices={devices}
        groups={groups}
        open={deployVersion !== null}
        onOpenChange={(v) => { if (!v) setDeployVersion(null) }}
        liveProgress={liveProgress}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(v) => { if (!v) setDeleteTarget(null) }}
        title="Delete Version"
        description={
          deleteTarget
            ? `Permanently delete v${deleteTarget.version} (${deleteTarget.plateforme})? Devices currently on this version won't be affected, but you won't be able to redeploy it.`
            : ''
        }
        confirmLabel="Delete Version"
        variant="destructive"
        onConfirm={() => { if (deleteTarget) deleteMut.mutate(deleteTarget.id) }}
        isLoading={deleteMut.isPending}
      />
    </div>
  )
}
