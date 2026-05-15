import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Layers,
  Plus,
  Trash2,
  RefreshCw,
  Calendar,
  Monitor,
  Smartphone,
  Globe,
  Apple,
  ChevronRight,
  ChevronDown,
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useDevices } from '@/hooks/useDevices'
import * as api from '@/services/api'
import { formatDate, cn } from '@/lib/utils'
import type { Group, Platform } from '@/types'

// ── Platform config ───────────────────────────────────────────────────────────

const PLATFORM_OPTIONS: Array<{ value: Platform; label: string }> = [
  { value: 'android', label: 'Android' },
  { value: 'windows', label: 'Windows' },
  { value: 'linux', label: 'Linux' },
  { value: 'macos', label: 'macOS' },
]

function platformBadge(plateforme: string | undefined): React.ReactElement {
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
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold', def.className)}>
      <Icon className="h-3 w-3" />
      {def.label}
    </span>
  )
}

// ── Create Form ───────────────────────────────────────────────────────────────

interface CreateFormProps {
  onCancel: () => void
  onCreated: () => void
}

function CreateGroupForm({ onCancel, onCreated }: CreateFormProps): React.ReactElement {
  const [nom, setNom] = useState('')
  const [description, setDescription] = useState('')
  const [selectedPlateforme, setSelectedPlateforme] = useState<Platform>('android')
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<string[]>([])

  const { data: devicesData } = useDevices({ plateforme: selectedPlateforme, limit: 200 })
  const devices = devicesData?.items ?? []

  const qc = useQueryClient()
  const createMutation = useMutation({
    mutationFn: async () => {
      return api.createGroup({
        nom,
        description,
        device_ids: selectedDeviceIds,
        plateforme: selectedPlateforme,
      })
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['groups'] })
      onCreated()
    },
  })

  function toggleDevice(deviceId: string): void {
    setSelectedDeviceIds((prev) =>
      prev.includes(deviceId) ? prev.filter((id) => id !== deviceId) : [...prev, deviceId],
    )
  }

  // Reset device selection when platform changes
  function handlePlatformChange(p: Platform): void {
    setSelectedPlateforme(p)
    setSelectedDeviceIds([])
  }

  return (
    <div className="mb-6 relative overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-border">
      <div className="absolute top-0 h-0.5 w-full bg-gradient-to-r from-indigo-500 to-violet-500" />
      <div className="p-5">
        <h2 className="mb-4 text-sm font-semibold text-foreground">Create Group</h2>
        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Name *</label>
            <input
              type="text"
              placeholder="Group name"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Description (optional)</label>
            <input
              type="text"
              placeholder="A short description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Platform selector */}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Platform</label>
            <div className="relative">
              <select
                value={selectedPlateforme}
                onChange={(e) => handlePlatformChange(e.target.value as Platform)}
                className="w-full appearance-none rounded-lg border border-input bg-background py-2 pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {PLATFORM_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>

          {/* Device multi-select */}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Devices ({selectedPlateforme}) — {selectedDeviceIds.length} selected
            </label>
            {devices.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
                No {selectedPlateforme} devices found
              </p>
            ) : (
              <div className="max-h-48 overflow-y-auto rounded-lg border border-input divide-y divide-border/60">
                {devices.map((device) => (
                  <label
                    key={device.device_id}
                    className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-muted/40"
                  >
                    <input
                      type="checkbox"
                      checked={selectedDeviceIds.includes(device.device_id)}
                      onChange={() => toggleDevice(device.device_id)}
                      className="h-3.5 w-3.5 rounded border-input accent-primary"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-foreground">{device.nom}</p>
                      <p className="truncate text-[10px] text-muted-foreground font-mono">{device.hostname}</p>
                    </div>
                    <span className={cn(
                      'shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                      device.statut === 'online' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground',
                    )}>
                      {device.statut}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {createMutation.isError && (
            <p className="text-xs text-destructive">
              {(createMutation.error as Error).message}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => createMutation.mutate()}
              disabled={!nom.trim() || createMutation.isPending}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {createMutation.isPending ? 'Creating…' : 'Create Group'}
            </button>
            <button
              onClick={onCancel}
              className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Group Card ────────────────────────────────────────────────────────────────

function GroupCard({
  group,
  onDelete,
}: {
  group: Group
  onDelete: (group: Group) => void
}): React.ReactElement {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-border transition-shadow hover:shadow-md">
      <div className="absolute top-0 h-0.5 w-full bg-gradient-to-r from-indigo-500 to-violet-500" />
      <div className="p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <Link
              to={`/groups/${group.id}`}
              className="group flex items-center gap-1.5"
            >
              <h3 className="truncate font-semibold text-foreground group-hover:text-primary transition-colors">
                {group.nom}
              </h3>
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
            </Link>
            {group.description && (
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{group.description}</p>
            )}
          </div>
          <button
            onClick={() => onDelete(group)}
            className="ml-1 shrink-0 rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            aria-label="Delete group"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        {/* Platform badge */}
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          {group.plateforme && platformBadge(group.plateforme)}
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
            {group.device_ids.length} device{group.device_ids.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Calendar className="h-3 w-3" />
          {formatDate(group.cree_le)}
        </div>
      </div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function GroupsPage(): React.ReactElement {
  const qc = useQueryClient()
  const [deleteTarget, setDeleteTarget] = useState<Group | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  const { data: groups, isLoading } = useQuery<Group[], Error>({
    queryKey: ['groups'],
    queryFn: api.getGroups,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteGroup(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['groups'] })
      setDeleteTarget(null)
    },
  })

  return (
    <div>
      <PageHeader
        title="Groups"
        description="Organize devices into groups for bulk operations"
        actions={
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            New Group
          </button>
        }
      />

      {showCreate && (
        <CreateGroupForm
          onCancel={() => setShowCreate(false)}
          onCreated={() => setShowCreate(false)}
        />
      )}

      {isLoading && (
        <div className="flex justify-center py-16">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && (groups ?? []).length === 0 && (
        <EmptyState
          icon={<Layers className="h-8 w-8" />}
          title="No groups yet"
          description="Create your first group to organize devices."
          action={
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              <Plus className="h-4 w-4" />
              Create Group
            </button>
          }
        />
      )}

      {!isLoading && (groups ?? []).length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups?.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
        title="Delete Group"
        description={`Delete "${deleteTarget?.nom ?? ''}"? Devices in this group will not be deleted.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => { if (deleteTarget) deleteMutation.mutate(deleteTarget.id) }}
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}
