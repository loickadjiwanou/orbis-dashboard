import React, { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  RefreshCw,
  Terminal,
  Layers,
  Plus,
  Monitor,
  Smartphone,
  Globe,
  Apple,
  Calendar,
  Hash,
  Activity,
  Info,
  ScanLine,
  X,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/layout/PageHeader'
import { DeviceStatusBadge } from '@/components/shared/DeviceStatusBadge'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useDevices } from '@/hooks/useDevices'
import * as api from '@/services/api'
import { formatDate, formatRelativeTime, cn } from '@/lib/utils'
import type { Device, CommandCreate } from '@/types'

// ── Platform badge ────────────────────────────────────────────────────────────

function PlatformBadge({ plateforme }: { plateforme: string | undefined }): React.ReactElement {
  const cfg: Record<string, { label: string; className: string; icon: React.ElementType }> = {
    android: { label: 'Android', className: 'bg-green-500/10 text-green-500', icon: Smartphone },
    windows: { label: 'Windows', className: 'bg-blue-500/10 text-blue-400', icon: Monitor },
    linux:   { label: 'Linux',   className: 'bg-orange-500/10 text-orange-400', icon: Globe },
    macos:   { label: 'macOS',   className: 'bg-purple-500/10 text-purple-400', icon: Apple },
  }
  const key = plateforme?.toLowerCase() ?? ''
  const def = cfg[key] ?? { label: plateforme ?? 'Unknown', className: 'bg-muted text-muted-foreground', icon: Layers }
  const Icon = def.icon
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold', def.className)}>
      <Icon className="h-3.5 w-3.5" />
      {def.label}
    </span>
  )
}

// ── Add Devices Modal ─────────────────────────────────────────────────────────

interface AddDevicesModalProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  groupId: string
  groupPlateforme: string | undefined
  currentDeviceIds: string[]
  onAdded: () => void
}

function AddDevicesModal({
  open,
  onOpenChange,
  groupId,
  groupPlateforme,
  currentDeviceIds,
  onAdded,
}: AddDevicesModalProps): React.ReactElement {
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const { data: devicesData } = useDevices({
    plateforme: groupPlateforme,
    limit: 200,
  })

  const candidateDevices = (devicesData?.items ?? []).filter(
    (d) => !currentDeviceIds.includes(d.device_id),
  )

  const qc = useQueryClient()
  const addMutation = useMutation({
    mutationFn: () => api.addDevicesToGroup(groupId, selectedIds),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['group', groupId] })
      void qc.invalidateQueries({ queryKey: ['groups'] })
      setSelectedIds([])
      onAdded()
      onOpenChange(false)
    },
  })

  function toggleDevice(deviceId: string): void {
    setSelectedIds((prev) =>
      prev.includes(deviceId) ? prev.filter((id) => id !== deviceId) : [...prev, deviceId],
    )
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10">
                <Plus className="h-4 w-4 text-indigo-500" />
              </div>
              <div>
                <Dialog.Title className="text-sm font-semibold text-foreground">
                  Add Devices
                </Dialog.Title>
                <Dialog.Description className="text-[11px] text-muted-foreground capitalize">
                  Platform: {groupPlateforme ?? 'any'}
                </Dialog.Description>
              </div>
            </div>
            <Dialog.Close asChild>
              <button className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="max-h-[50vh] overflow-y-auto p-4">
            {candidateDevices.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No eligible devices to add.
              </p>
            ) : (
              <div className="space-y-1">
                {candidateDevices.map((device) => (
                  <label
                    key={device.device_id}
                    className="flex cursor-pointer items-center gap-3 rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5 hover:border-primary/40 hover:bg-primary/5"
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(device.device_id)}
                      onChange={() => toggleDevice(device.device_id)}
                      className="h-3.5 w-3.5 rounded border-input accent-primary"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{device.nom}</p>
                      <p className="truncate font-mono text-[10px] text-muted-foreground">{device.hostname}</p>
                    </div>
                    <DeviceStatusBadge status={device.statut} />
                  </label>
                ))}
              </div>
            )}
          </div>

          {addMutation.isError && (
            <p className="px-4 pb-2 text-xs text-destructive">
              {(addMutation.error as Error).message}
            </p>
          )}

          <div className="flex items-center justify-between border-t border-border px-5 py-4">
            <span className="text-xs text-muted-foreground">{selectedIds.length} selected</span>
            <div className="flex gap-2">
              <Dialog.Close asChild>
                <button className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-accent">
                  Cancel
                </button>
              </Dialog.Close>
              <button
                onClick={() => addMutation.mutate()}
                disabled={selectedIds.length === 0 || addMutation.isPending}
                className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {addMutation.isPending ? 'Adding…' : 'Add selected'}
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// ── Command panel ─────────────────────────────────────────────────────────────

type GroupCommandResult = { device_id: string; command_id?: string; status: string; error?: string }

interface CommandPanelProps {
  groupId: string
  plateforme: string | undefined
}

const ANDROID_QUICK_COMMANDS = [
  { label: 'Collect heartbeat now', type: 'collect_now', desc: 'Force immediate data collection' },
  { label: 'Scan network', type: 'scan_network', desc: 'Discover neighbours on local network' },
  { label: 'Get device info', type: 'get_info', desc: 'Return full device metadata' },
  { label: 'Restart agent service', type: 'restart_service', desc: 'Restart the Orbis agent' },
]

const SHELL_PRESETS: Record<string, Array<{ label: string; value: string }>> = {
  linux: [
    { label: 'System info', value: 'uname -a' },
    { label: 'Disk', value: 'df -h' },
    { label: 'Memory', value: 'free -h' },
    { label: 'Top processes', value: 'ps aux --sort=-%cpu | head -10' },
    { label: 'Network', value: 'ip addr show' },
    { label: 'Uptime', value: 'uptime' },
  ],
  macos: [
    { label: 'System info', value: 'uname -a' },
    { label: 'Disk', value: 'df -h' },
    { label: 'Memory', value: 'vm_stat' },
    { label: 'Top processes', value: 'ps aux -r | head -10' },
    { label: 'Network', value: 'ifconfig' },
    { label: 'Uptime', value: 'uptime' },
  ],
  windows: [
    { label: 'System info', value: 'systeminfo' },
    { label: 'Disk', value: 'wmic logicaldisk get size,freespace,caption' },
    { label: 'Processes', value: 'tasklist /fo csv' },
    { label: 'Network', value: 'ipconfig /all' },
    { label: 'Open ports', value: 'netstat -ano' },
  ],
}

function CommandPanel({ groupId, plateforme }: CommandPanelProps): React.ReactElement {
  const [shellCmd, setShellCmd] = useState('')
  const [results, setResults] = useState<GroupCommandResult[] | null>(null)

  const sendMutation = useMutation({
    mutationFn: (command: CommandCreate) => api.sendGroupCommand(groupId, command),
    onSuccess: (data) => setResults(data.results),
  })

  async function handleSendShell(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    if (!shellCmd.trim()) return
    setResults(null)
    await sendMutation.mutateAsync({ type: 'shell', payload: { command: shellCmd } })
    setShellCmd('')
  }

  async function handleAndroidCommand(type: string): Promise<void> {
    setResults(null)
    await sendMutation.mutateAsync({ type: type as CommandCreate['type'], payload: {} })
  }

  const presets = SHELL_PRESETS[plateforme?.toLowerCase() ?? 'linux'] ?? SHELL_PRESETS.linux
  const isAndroid = plateforme === 'android'

  return (
    <div className="relative overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-border">
      <div className="absolute top-0 h-0.5 w-full bg-gradient-to-r from-violet-500 to-pink-500" />
      <div className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/10">
            <Terminal className="h-3.5 w-3.5 text-violet-500" />
          </div>
          <h2 className="text-sm font-semibold text-foreground">Send Command to Group</h2>
        </div>

        {isAndroid ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Android does not support arbitrary shell commands. Use the actions below:
            </p>
            {ANDROID_QUICK_COMMANDS.map(({ label, type, desc }) => (
              <button
                key={type}
                type="button"
                disabled={sendMutation.isPending}
                onClick={() => void handleAndroidCommand(type)}
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
          </div>
        ) : (
          <form onSubmit={handleSendShell} className="space-y-3">
            <textarea
              value={shellCmd}
              onChange={(e) => setShellCmd(e.target.value)}
              placeholder="Enter shell command…"
              rows={4}
              className="w-full resize-none rounded-xl border border-input bg-muted/40 px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="submit"
              disabled={sendMutation.isPending || !shellCmd.trim()}
              className="w-full rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {sendMutation.isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  Sending…
                </span>
              ) : (
                'Execute on all devices'
              )}
            </button>

            {/* Quick presets */}
            <div className="border-t border-border/60 pt-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Quick Commands
              </p>
              <div className="flex flex-wrap gap-1.5">
                {presets.map(({ label, value }) => (
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
          </form>
        )}

        {/* Results */}
        {results && (
          <div className="mt-4 border-t border-border/60 pt-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Results ({results.length} device{results.length !== 1 ? 's' : ''})
            </p>
            <div className="space-y-1">
              {results.map((r) => (
                <div
                  key={r.device_id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2"
                >
                  <span className="truncate font-mono text-xs text-foreground">{r.device_id}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {r.status === 'sent' ? (
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-500">
                        <CheckCircle2 className="h-3 w-3" />
                        sent
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-destructive">
                        <XCircle className="h-3 w-3" />
                        {r.status}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Devices section ───────────────────────────────────────────────────────────

interface DevicesSectionProps {
  groupId: string
  deviceIds: string[]
  plateforme: string | undefined
}

function DevicesSection({ groupId, deviceIds, plateforme }: DevicesSectionProps): React.ReactElement {
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<Device | null>(null)

  const { data: devicesData } = useDevices({ limit: 500 })
  const qc = useQueryClient()

  const allDevices = devicesData?.items ?? []
  const groupDevices = allDevices.filter((d) => deviceIds.includes(d.device_id))

  const removeMutation = useMutation({
    mutationFn: (deviceId: string) => api.removeDevicesFromGroup(groupId, [deviceId]),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['group', groupId] })
      void qc.invalidateQueries({ queryKey: ['groups'] })
      setRemoveTarget(null)
    },
  })

  return (
    <div className="relative overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-border">
      <div className="absolute top-0 h-0.5 w-full bg-gradient-to-r from-blue-500 to-cyan-500" />
      <div className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10">
              <Layers className="h-3.5 w-3.5 text-blue-500" />
            </div>
            <h2 className="text-sm font-semibold text-foreground">
              Devices
              <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                {groupDevices.length}
              </span>
            </h2>
          </div>
          <button
            onClick={() => setAddModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
          >
            <Plus className="h-3.5 w-3.5" />
            Add devices
          </button>
        </div>

        {groupDevices.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <Layers className="h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No devices in this group yet.</p>
            <button
              onClick={() => setAddModalOpen(true)}
              className="mt-1 flex items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-1.5 text-xs text-muted-foreground hover:border-primary/40 hover:text-primary"
            >
              <Plus className="h-3.5 w-3.5" />
              Add devices
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {groupDevices.map((device) => (
              <div
                key={device.device_id}
                className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <Link
                    to={`/devices/${device.device_id}`}
                    className="truncate text-sm font-medium text-foreground hover:text-primary transition-colors"
                  >
                    {device.nom}
                  </Link>
                  <p className="truncate font-mono text-[10px] text-muted-foreground">{device.hostname}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <DeviceStatusBadge status={device.statut} />
                  <span className="text-[10px] text-muted-foreground">{formatRelativeTime(device.derniere_connexion)}</span>
                  <button
                    onClick={() => setRemoveTarget(device)}
                    className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                    aria-label="Remove from group"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AddDevicesModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        groupId={groupId}
        groupPlateforme={plateforme}
        currentDeviceIds={deviceIds}
        onAdded={() => void qc.invalidateQueries({ queryKey: ['group', groupId] })}
      />

      <ConfirmDialog
        open={removeTarget !== null}
        onOpenChange={(open) => { if (!open) setRemoveTarget(null) }}
        title="Remove Device"
        description={`Remove "${removeTarget?.nom ?? ''}" from this group? The device itself will not be deleted.`}
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={() => { if (removeTarget) removeMutation.mutate(removeTarget.device_id) }}
        isLoading={removeMutation.isPending}
      />
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function GroupDetailPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>()

  const { data: group, isLoading, error, refetch } = useQuery({
    queryKey: ['group', id],
    queryFn: () => api.getGroup(id ?? ''),
    enabled: Boolean(id),
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !group) {
    return (
      <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {error instanceof Error ? error.message : 'Group not found'}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <div>
        <Link
          to="/groups"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Groups
        </Link>
      </div>

      {/* Header */}
      <PageHeader
        title={group.nom}
        description={group.description || 'No description'}
        actions={
          <div className="flex items-center gap-2">
            {group.plateforme && <PlatformBadge plateforme={group.plateforme} />}
            <button
              onClick={() => void refetch()}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
          </div>
        }
      />

      {/* Info card */}
      <div className="relative overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-border">
        <div className="absolute top-0 h-0.5 w-full bg-gradient-to-r from-indigo-500 to-violet-500" />
        <div className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10">
              <Info className="h-3.5 w-3.5 text-indigo-500" />
            </div>
            <h2 className="text-sm font-semibold text-foreground">Group Info</h2>
          </div>
          <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Description</p>
              <p className="mt-1 text-sm text-foreground">{group.description || '—'}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Platform</p>
              <div className="mt-1">
                {group.plateforme ? <PlatformBadge plateforme={group.plateforme} /> : <span className="text-sm text-muted-foreground">—</span>}
              </div>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Devices</p>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-foreground">
                <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                {group.device_ids.length} device{group.device_ids.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Created</p>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-foreground">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                {formatDate(group.cree_le)}
              </p>
            </div>
          </div>

          {/* Device IDs preview */}
          {group.device_ids.length > 0 && (
            <div className="mt-4 border-t border-border/60 pt-4">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Device IDs</p>
              <div className="flex flex-wrap gap-1.5">
                {group.device_ids.map((did) => (
                  <span key={did} className="flex items-center gap-1 rounded-lg bg-muted/60 px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                    <Hash className="h-2.5 w-2.5" />
                    {did.slice(0, 12)}…
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Two-column: Devices + Command */}
      <div className="grid gap-5 lg:grid-cols-2">
        <DevicesSection
          groupId={group.id}
          deviceIds={group.device_ids}
          plateforme={group.plateforme}
        />
        <CommandPanel
          groupId={group.id}
          plateforme={group.plateforme}
        />
      </div>

      {/* Quick info bottom row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="relative overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-border p-5">
          <div className="absolute top-0 h-0.5 w-full bg-gradient-to-r from-teal-500 to-emerald-500" />
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-500/10">
              <Activity className="h-4 w-4 text-teal-500" />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Total Devices</p>
              <p className="text-2xl font-bold text-foreground">{group.device_ids.length}</p>
            </div>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-border p-5">
          <div className="absolute top-0 h-0.5 w-full bg-gradient-to-r from-blue-500 to-cyan-500" />
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10">
              <ScanLine className="h-4 w-4 text-blue-500" />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Platform</p>
              <p className="text-sm font-semibold capitalize text-foreground">{group.plateforme ?? '—'}</p>
            </div>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-border p-5">
          <div className="absolute top-0 h-0.5 w-full bg-gradient-to-r from-amber-400 to-orange-500" />
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10">
              <Clock className="h-4 w-4 text-amber-500" />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Created</p>
              <p className="text-sm font-semibold text-foreground">{formatRelativeTime(group.cree_le)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
