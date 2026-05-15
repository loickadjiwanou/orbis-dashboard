import React, { useState, useEffect, useCallback } from 'react'
import {
  Zap,
  Plus,
  Trash2,
  RefreshCw,
  Play,
  Pencil,
  Search,
  ChevronDown,
  X,
  PlusCircle,
  Code2,
  Layers,
  CheckCircle2,
  XCircle,
  Loader2,
  Monitor,
  Smartphone,
  Apple,
  Globe,
  Terminal,
} from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import * as api from '@/services/api'
import type { ActionExecuteResult } from '@/services/api'
import { formatDate, cn } from '@/lib/utils'
import type { Action, ActionParameter, ActionType, ParameterType, Platform, Device, Group } from '@/types'

// ─── Constants ───────────────────────────────────────────────────────────────

const ACTION_TYPES: ActionType[] = ['shell', 'script', 'system', 'api']
const PARAM_TYPES: ParameterType[] = ['string', 'int', 'bool', 'enum']
const ALL_PLATFORMS: Platform[] = ['linux', 'macos', 'windows', 'android']

const PLATFORM_ICONS: Record<Platform, React.ReactNode> = {
  linux:   <Globe className="h-3 w-3" />,
  macos:   <Apple className="h-3 w-3" />,
  windows: <Monitor className="h-3 w-3" />,
  android: <Smartphone className="h-3 w-3" />,
}

const PLATFORM_COLORS: Record<Platform, string> = {
  linux:   'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  macos:   'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  windows: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  android: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
}

const TYPE_COLORS: Record<ActionType, string> = {
  shell:  'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  script: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  system: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  api:    'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ParamRow {
  nom: string
  type: ParameterType
  requis: boolean
  valeur_defaut: string
  description: string
  enum_values: string  // comma-separated
}

function blankParam(): ParamRow {
  return { nom: '', type: 'string', requis: true, valeur_defaut: '', description: '', enum_values: '' }
}

interface FormData {
  nom: string
  description: string
  type: ActionType
  script_template: string
  compatible_plateformes: Platform[]
  parametres: ParamRow[]
}

function blankForm(): FormData {
  return {
    nom: '',
    description: '',
    type: 'shell',
    script_template: '',
    compatible_plateformes: ['linux', 'macos', 'windows', 'android'],
    parametres: [],
  }
}

function actionToForm(a: Action): FormData {
  return {
    nom: a.nom,
    description: a.description,
    type: a.type,
    script_template: a.script_template,
    compatible_plateformes: [...a.compatible_plateformes],
    parametres: a.parametres.map((p) => ({
      nom: p.nom,
      type: p.type,
      requis: p.requis,
      valeur_defaut: p.valeur_defaut ?? '',
      description: p.description,
      enum_values: (p.enum_values ?? []).join(', '),
    })),
  }
}

function formToPayload(f: FormData) {
  return {
    nom: f.nom.trim(),
    description: f.description.trim(),
    type: f.type,
    script_template: f.script_template,
    compatible_plateformes: f.compatible_plateformes,
    parametres: f.parametres.map((p) => ({
      nom: p.nom.trim(),
      type: p.type,
      requis: p.requis,
      valeur_defaut: p.valeur_defaut,
      description: p.description.trim(),
      enum_values: p.enum_values
        ? p.enum_values.split(',').map((s) => s.trim()).filter(Boolean)
        : [],
    })),
  }
}

// ─── Shared dialog overlay + content shell ────────────────────────────────────

function ModalOverlay(): React.ReactElement {
  return (
    <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
  )
}

// ─── Action Form Modal ────────────────────────────────────────────────────────

interface ActionFormModalProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  action?: Action  // undefined = create
  onSave: (payload: ReturnType<typeof formToPayload>, id?: string) => void
  isSaving: boolean
}

function ActionFormModal({ open, onOpenChange, action, onSave, isSaving }: ActionFormModalProps): React.ReactElement {
  const [form, setForm] = useState<FormData>(blankForm)

  useEffect(() => {
    if (open) setForm(action ? actionToForm(action) : blankForm())
  }, [open, action])

  const set = useCallback(<K extends keyof FormData>(k: K, v: FormData[K]) => {
    setForm((f) => ({ ...f, [k]: v }))
  }, [])

  function togglePlatform(p: Platform): void {
    setForm((f) => {
      const has = f.compatible_plateformes.includes(p)
      return {
        ...f,
        compatible_plateformes: has
          ? f.compatible_plateformes.filter((x) => x !== p)
          : [...f.compatible_plateformes, p],
      }
    })
  }

  function addParam(): void {
    setForm((f) => ({ ...f, parametres: [...f.parametres, blankParam()] }))
  }

  function removeParam(idx: number): void {
    setForm((f) => ({ ...f, parametres: f.parametres.filter((_, i) => i !== idx) }))
  }

  function setParam<K extends keyof ParamRow>(idx: number, k: K, v: ParamRow[K]): void {
    setForm((f) => {
      const p = [...f.parametres]
      p[idx] = { ...p[idx], [k]: v }
      return { ...f, parametres: p }
    })
  }

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault()
    onSave(formToPayload(form), action?.id)
  }

  const isValid = form.nom.trim().length > 0 && form.script_template.trim().length > 0 && form.compatible_plateformes.length > 0

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <ModalOverlay />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-2xl max-h-[90vh] overflow-y-auto -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-card shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]">
          <form onSubmit={handleSubmit}>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <Dialog.Title className="text-lg font-semibold">
                {action ? 'Edit Action' : 'New Action'}
              </Dialog.Title>
              <Dialog.Close asChild>
                <button type="button" className="rounded p-1 hover:bg-muted">
                  <X className="h-4 w-4" />
                </button>
              </Dialog.Close>
            </div>

            <div className="space-y-5 px-6 py-5">
              {/* Name + Type */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Name *</label>
                  <input
                    value={form.nom}
                    onChange={(e) => set('nom', e.target.value)}
                    placeholder="Restart nginx"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Type *</label>
                  <div className="relative">
                    <select
                      value={form.type}
                      onChange={(e) => set('type', e.target.value as ActionType)}
                      className="w-full appearance-none rounded-md border border-input bg-background py-2 pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      {ACTION_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Description</label>
                <input
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                  placeholder="Brief description of what this action does"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {/* Compatible platforms */}
              <div>
                <label className="mb-2 block text-xs font-medium text-muted-foreground">Compatible platforms *</label>
                <div className="flex flex-wrap gap-2">
                  {ALL_PLATFORMS.map((p) => {
                    const active = form.compatible_plateformes.includes(p)
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => togglePlatform(p)}
                        className={cn(
                          'flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all',
                          active
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border bg-background text-muted-foreground hover:border-primary/50',
                        )}
                      >
                        {PLATFORM_ICONS[p]}
                        {p}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Script template */}
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Script template *
                  <span className="ml-2 font-normal text-muted-foreground/60">Use {'{{param_name}}'} for parameters</span>
                </label>
                <textarea
                  value={form.script_template}
                  onChange={(e) => set('script_template', e.target.value)}
                  rows={5}
                  placeholder={'systemctl restart {{service_name}}'}
                  spellCheck={false}
                  className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                {/* Detected placeholders */}
                {(() => {
                  const matches = [...form.script_template.matchAll(/\{\{(\w+)\}\}/g)]
                  const names = [...new Set(matches.map((m) => m[1]))]
                  if (names.length === 0) return null
                  return (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {names.map((n) => (
                        <span key={n} className="rounded bg-violet-100 px-1.5 py-0.5 font-mono text-[10px] text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
                          {'{{'}{n}{'}}'}
                        </span>
                      ))}
                    </div>
                  )
                })()}
              </div>

              {/* Parameters */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-xs font-medium text-muted-foreground">Parameters</label>
                  <button
                    type="button"
                    onClick={addParam}
                    className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-accent"
                  >
                    <PlusCircle className="h-3 w-3" />
                    Add param
                  </button>
                </div>

                {form.parametres.length === 0 && (
                  <p className="rounded-lg border border-dashed border-border py-4 text-center text-xs text-muted-foreground">
                    No parameters — add one if the script uses {'{{placeholders}}'}
                  </p>
                )}

                <div className="space-y-3">
                  {form.parametres.map((param, idx) => (
                    <div key={idx} className="rounded-lg border border-border bg-muted/20 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted-foreground">Param #{idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => removeParam(idx)}
                          className="rounded p-0.5 text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <div className="col-span-2 sm:col-span-1">
                          <label className="mb-0.5 block text-[10px] text-muted-foreground">Name *</label>
                          <input
                            value={param.nom}
                            onChange={(e) => setParam(idx, 'nom', e.target.value)}
                            placeholder="service_name"
                            className="w-full rounded border border-input bg-background px-2 py-1 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                          />
                        </div>
                        <div>
                          <label className="mb-0.5 block text-[10px] text-muted-foreground">Type</label>
                          <div className="relative">
                            <select
                              value={param.type}
                              onChange={(e) => setParam(idx, 'type', e.target.value as ParameterType)}
                              className="w-full appearance-none rounded border border-input bg-background py-1 pl-2 pr-6 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                            >
                              {PARAM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                          </div>
                        </div>
                        <div>
                          <label className="mb-0.5 block text-[10px] text-muted-foreground">Default</label>
                          <input
                            value={param.valeur_defaut}
                            onChange={(e) => setParam(idx, 'valeur_defaut', e.target.value)}
                            placeholder="nginx"
                            className="w-full rounded border border-input bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                          />
                        </div>
                        <div className="flex items-end gap-2">
                          <label className="flex cursor-pointer items-center gap-1.5 text-xs">
                            <input
                              type="checkbox"
                              checked={param.requis}
                              onChange={(e) => setParam(idx, 'requis', e.target.checked)}
                              className="h-3.5 w-3.5 rounded border-gray-300"
                            />
                            Required
                          </label>
                        </div>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <div>
                          <label className="mb-0.5 block text-[10px] text-muted-foreground">Description</label>
                          <input
                            value={param.description}
                            onChange={(e) => setParam(idx, 'description', e.target.value)}
                            placeholder="Service name to restart"
                            className="w-full rounded border border-input bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                          />
                        </div>
                        {param.type === 'enum' && (
                          <div>
                            <label className="mb-0.5 block text-[10px] text-muted-foreground">Enum values (comma-sep)</label>
                            <input
                              value={param.enum_values}
                              onChange={(e) => setParam(idx, 'enum_values', e.target.value)}
                              placeholder="start, stop, restart"
                              className="w-full rounded border border-input bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
              <Dialog.Close asChild>
                <button type="button" className="rounded-md border border-border px-4 py-2 text-sm hover:bg-accent">
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="submit"
                disabled={!isValid || isSaving}
                className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                {action ? 'Save changes' : 'Create action'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// ─── Execute Modal ────────────────────────────────────────────────────────────

interface ExecuteModalProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  action: Action | null
  devices: Device[]
  groups: Group[]
}

function ExecuteModal({ open, onOpenChange, action, devices, groups }: ExecuteModalProps): React.ReactElement {
  const [target, setTarget] = useState<'device' | 'group'>('device')
  const [deviceId, setDeviceId] = useState('')
  const [groupId, setGroupId] = useState('')
  const [params, setParams] = useState<Record<string, string>>({})
  const [result, setResult] = useState<ActionExecuteResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open && action) {
      setTarget('device')
      setDeviceId('')
      setGroupId('')
      setResult(null)
      setError(null)
      // Pre-fill param defaults
      const defaults: Record<string, string> = {}
      action.parametres.forEach((p) => { defaults[p.nom] = p.valeur_defaut ?? '' })
      setParams(defaults)
    }
  }, [open, action])

  const executeMut = useMutation({
    mutationFn: (payload: Parameters<typeof api.executeAction>[1]) =>
      api.executeAction(action!.id, payload),
    onSuccess: (data) => { setResult(data); setError(null) },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Execution failed'
      setError(msg)
    },
  })

  if (!action) return <></>

  // Filter devices/groups by compatible platforms
  const compatibleDevices = devices.filter((d) =>
    action.compatible_plateformes.includes(d.plateforme as Platform),
  )
  const compatibleGroups = groups.filter((g) =>
    !g.plateforme || action.compatible_plateformes.includes(g.plateforme as Platform),
  )

  function handleExecute(): void {
    const builtParams: Record<string, unknown> = {}
    action!.parametres.forEach((p) => { builtParams[p.nom] = params[p.nom] ?? p.valeur_defaut ?? '' })

    executeMut.mutate({
      device_id: target === 'device' ? deviceId || undefined : undefined,
      group_id: target === 'group' ? groupId || undefined : undefined,
      parametres: builtParams,
    })
  }

  const canExecute = (target === 'device' ? !!deviceId : !!groupId) && !executeMut.isPending

  const missingRequired = action.parametres
    .filter((p) => p.requis && !(params[p.nom]?.trim()))
    .map((p) => p.nom)

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <ModalOverlay />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg max-h-[90vh] overflow-y-auto -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-card shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-border px-6 py-4">
            <div>
              <Dialog.Title className="font-semibold">Execute action</Dialog.Title>
              <p className="mt-0.5 text-sm text-muted-foreground">{action.nom}</p>
            </div>
            <Dialog.Close asChild>
              <button className="rounded p-1 hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="space-y-5 px-6 py-5">
            {/* Script preview */}
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Script template</p>
              <pre className="rounded-lg bg-muted px-3 py-2 font-mono text-xs text-foreground/80 overflow-x-auto">
                {action.script_template}
              </pre>
            </div>

            {/* Target selection */}
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">Target</p>
              <div className="flex gap-2">
                {(['device', 'group'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTarget(t)}
                    className={cn(
                      'flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all capitalize',
                      target === t
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:border-primary/50',
                    )}
                  >
                    {t === 'device' ? <Terminal className="h-3 w-3" /> : <Layers className="h-3 w-3" />}
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Device selector */}
            {target === 'device' && (
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Device
                  <span className="ml-1 text-muted-foreground/60">({compatibleDevices.length} compatible)</span>
                </label>
                <div className="relative">
                  <select
                    value={deviceId}
                    onChange={(e) => setDeviceId(e.target.value)}
                    className="w-full appearance-none rounded-md border border-input bg-background py-2 pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Select a device…</option>
                    {compatibleDevices.map((d) => (
                      <option key={d.device_id} value={d.device_id}>
                        {d.nom} ({d.hostname}) — {d.plateforme}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>
            )}

            {/* Group selector */}
            {target === 'group' && (
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Group
                  <span className="ml-1 text-muted-foreground/60">({compatibleGroups.length} compatible)</span>
                </label>
                <div className="relative">
                  <select
                    value={groupId}
                    onChange={(e) => setGroupId(e.target.value)}
                    className="w-full appearance-none rounded-md border border-input bg-background py-2 pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Select a group…</option>
                    {compatibleGroups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.nom} ({g.device_ids?.length ?? 0} devices)
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>
            )}

            {/* Parameter inputs */}
            {action.parametres.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">Parameters</p>
                <div className="space-y-3">
                  {action.parametres.map((p) => (
                    <div key={p.nom}>
                      <label className="mb-1 flex items-center gap-1.5 text-xs font-medium">
                        <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">{p.nom}</code>
                        {p.requis && <span className="text-destructive">*</span>}
                        {p.description && <span className="font-normal text-muted-foreground">— {p.description}</span>}
                      </label>

                      {p.type === 'bool' ? (
                        <div className="flex gap-3">
                          {['true', 'false'].map((v) => (
                            <label key={v} className="flex cursor-pointer items-center gap-1.5 text-sm">
                              <input
                                type="radio"
                                name={`param-${p.nom}`}
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
                            {p.enum_values.map((v) => <option key={v} value={v}>{v}</option>)}
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                        </div>
                      ) : (
                        <input
                          type={p.type === 'int' ? 'number' : 'text'}
                          value={params[p.nom] ?? ''}
                          onChange={(e) => setParams((prev) => ({ ...prev, [p.nom]: e.target.value }))}
                          placeholder={p.valeur_defaut || `Enter ${p.nom}…`}
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Preview of resolved script */}
            {action.parametres.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">Preview</p>
                <pre className="rounded-lg bg-muted px-3 py-2 font-mono text-xs text-foreground/80 overflow-x-auto">
                  {action.script_template.replace(/\{\{(\w+)\}\}/g, (_, k) => params[k] || `{{${k}}}`)}
                </pre>
              </div>
            )}

            {/* Error */}
            {error && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
            )}

            {/* Results */}
            {result && (
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  Results — {result.results.filter((r) => r.status === 'sent').length} sent,{' '}
                  {result.results.filter((r) => r.status === 'failed').length} failed
                </p>
                <div className="space-y-1.5">
                  {result.results.map((r) => (
                    <div
                      key={r.device_id}
                      className={cn(
                        'flex items-center justify-between rounded-lg px-3 py-2 text-xs',
                        r.status === 'sent'
                          ? 'bg-green-50 dark:bg-green-900/10'
                          : 'bg-red-50 dark:bg-red-900/10',
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {r.status === 'sent'
                          ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                          : <XCircle className="h-3.5 w-3.5 text-red-500" />}
                        <span className="font-mono">{r.device_id.slice(0, 12)}…</span>
                      </div>
                      <div className="text-right">
                        <span className={r.status === 'sent' ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}>
                          {r.status}
                        </span>
                        {r.command_id && (
                          <span className="ml-2 font-mono text-muted-foreground">{r.command_id.slice(0, 8)}</span>
                        )}
                        {r.error && <p className="text-destructive">{r.error}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
            <Dialog.Close asChild>
              <button className="rounded-md border border-border px-4 py-2 text-sm hover:bg-accent">
                {result ? 'Close' : 'Cancel'}
              </button>
            </Dialog.Close>
            {!result && (
              <button
                onClick={handleExecute}
                disabled={!canExecute || missingRequired.length > 0}
                title={missingRequired.length > 0 ? `Missing required: ${missingRequired.join(', ')}` : undefined}
                className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {executeMut.isPending
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Executing…</>
                  : <><Play className="h-4 w-4" /> Execute</>}
              </button>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// ─── Action Card ──────────────────────────────────────────────────────────────

interface ActionCardProps {
  action: Action
  onEdit: (a: Action) => void
  onExecute: (a: Action) => void
  onDelete: (a: Action) => void
}

function ActionCard({ action, onEdit, onExecute, onDelete }: ActionCardProps): React.ReactElement {
  const [showScript, setShowScript] = useState(false)

  return (
    <div className="flex flex-col rounded-xl border border-border bg-card shadow-sm transition-all hover:shadow-md">
      {/* Card header */}
      <div className="flex items-start justify-between gap-2 p-5 pb-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-semibold">{action.nom}</h3>
            <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium capitalize', TYPE_COLORS[action.type])}>
              {action.type}
            </span>
          </div>
          {action.description && (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{action.description}</p>
          )}
        </div>
        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={() => onExecute(action)}
            className="rounded p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary"
            title="Execute"
          >
            <Play className="h-4 w-4" />
          </button>
          <button
            onClick={() => onEdit(action)}
            className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            title="Edit"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onDelete(action)}
            className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Platforms */}
      <div className="flex flex-wrap gap-1 px-5">
        {action.compatible_plateformes.map((p) => (
          <span
            key={p}
            className={cn('flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium capitalize', PLATFORM_COLORS[p as Platform])}
          >
            {PLATFORM_ICONS[p as Platform]}
            {p}
          </span>
        ))}
      </div>

      {/* Parameters */}
      {action.parametres.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1 px-5">
          {action.parametres.map((p) => (
            <span
              key={p.nom}
              className={cn(
                'rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]',
                p.requis ? 'text-foreground/80' : 'text-muted-foreground',
              )}
              title={`${p.type}${p.requis ? ' · required' : ' · optional'}${p.description ? ` · ${p.description}` : ''}`}
            >
              {'{{'}{p.nom}{'}}'}
            </span>
          ))}
        </div>
      )}

      {/* Script toggle */}
      <button
        type="button"
        onClick={() => setShowScript((v) => !v)}
        className="mt-3 flex items-center gap-1.5 px-5 text-xs text-muted-foreground hover:text-foreground"
      >
        <Code2 className="h-3 w-3" />
        {showScript ? 'Hide script' : 'Show script'}
      </button>

      {showScript && (
        <pre className="mx-5 mt-2 max-h-32 overflow-y-auto rounded-lg bg-muted px-3 py-2 font-mono text-[11px] text-foreground/80">
          {action.script_template}
        </pre>
      )}

      {/* Footer */}
      <div className="mt-auto border-t border-border/50 px-5 py-3">
        <p className="text-[10px] text-muted-foreground">Created {formatDate(action.cree_le)}</p>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ActionsPage(): React.ReactElement {
  const qc = useQueryClient()

  // Filters
  const [search, setSearch] = useState('')
  const [platformFilter, setPlatformFilter] = useState<Platform | ''>('')
  const [typeFilter, setTypeFilter] = useState<ActionType | ''>('')

  // Modals
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Action | undefined>(undefined)
  const [executeTarget, setExecuteTarget] = useState<Action | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Action | null>(null)

  // Queries
  const { data: actions = [], isLoading } = useQuery<Action[]>({
    queryKey: ['actions'],
    queryFn: api.getActions,
    staleTime: 30_000,
  })

  const { data: devicesData } = useQuery({
    queryKey: ['devices', { limit: 500 }],
    queryFn: () => api.getDevices({ limit: 500 }),
    staleTime: 60_000,
  })
  const devices: Device[] = devicesData?.items ?? []

  const { data: groups = [] } = useQuery<Group[]>({
    queryKey: ['groups'],
    queryFn: api.getGroups,
    staleTime: 60_000,
  })

  // Mutations
  const invalidate = () => void qc.invalidateQueries({ queryKey: ['actions'] })

  const createMutation = useMutation({
    mutationFn: (payload: Parameters<typeof api.createAction>[0]) => api.createAction(payload),
    onSuccess: () => { invalidate(); setFormOpen(false) },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof api.updateAction>[1] }) =>
      api.updateAction(id, payload),
    onSuccess: () => { invalidate(); setFormOpen(false); setEditTarget(undefined) },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteAction(id),
    onSuccess: () => { invalidate(); setDeleteTarget(null) },
  })

  function handleSave(payload: ReturnType<typeof formToPayload>, id?: string): void {
    if (id) {
      updateMutation.mutate({ id, payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  function openCreate(): void {
    setEditTarget(undefined)
    setFormOpen(true)
  }

  function openEdit(a: Action): void {
    setEditTarget(a)
    setFormOpen(true)
  }

  // Filtered actions
  const filtered = actions.filter((a) => {
    if (platformFilter && !a.compatible_plateformes.includes(platformFilter as Platform)) return false
    if (typeFilter && a.type !== typeFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        a.nom.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.script_template.toLowerCase().includes(q)
      )
    }
    return true
  })

  const isSaving = createMutation.isPending || updateMutation.isPending

  return (
    <div>
      <PageHeader
        title="Actions"
        description={`${actions.length} action${actions.length !== 1 ? 's' : ''} defined`}
        actions={
          <button
            onClick={openCreate}
            className="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            New Action
          </button>
        }
      />

      {/* Filters */}
      <div className="mb-5 flex flex-wrap gap-3">
        {/* Search */}
        <div className="relative min-w-52 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search actions…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Platform filter */}
        <div className="relative">
          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value as Platform | '')}
            className="appearance-none rounded-md border border-input bg-background py-2 pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All platforms</option>
            {ALL_PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        </div>

        {/* Type filter */}
        <div className="relative">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as ActionType | '')}
            className="appearance-none rounded-md border border-input bg-background py-2 pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All types</option>
            {ACTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-16">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty — no actions at all */}
      {!isLoading && actions.length === 0 && (
        <EmptyState
          icon={<Zap className="h-8 w-8" />}
          title="No actions defined"
          description="Create reusable action templates with parameters to automate device management."
          action={
            <button
              onClick={openCreate}
              className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Create your first action
            </button>
          }
        />
      )}

      {/* Empty — no results from filter */}
      {!isLoading && actions.length > 0 && filtered.length === 0 && (
        <EmptyState
          icon={<Search className="h-8 w-8" />}
          title="No actions match"
          description="Try adjusting your search or filter criteria."
        />
      )}

      {/* Grid */}
      {!isLoading && filtered.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 items-start">
          {filtered.map((a) => (
            <ActionCard
              key={a.id}
              action={a}
              onEdit={openEdit}
              onExecute={(action) => setExecuteTarget(action)}
              onDelete={(action) => setDeleteTarget(action)}
            />
          ))}
        </div>
      )}

      {/* Create / Edit modal */}
      <ActionFormModal
        open={formOpen}
        onOpenChange={(v) => { setFormOpen(v); if (!v) setEditTarget(undefined) }}
        action={editTarget}
        onSave={handleSave}
        isSaving={isSaving}
      />

      {/* Execute modal */}
      <ExecuteModal
        open={executeTarget !== null}
        onOpenChange={(v) => { if (!v) setExecuteTarget(null) }}
        action={executeTarget}
        devices={devices}
        groups={groups}
      />

      {/* Delete confirm */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
        title="Delete Action"
        description={`Delete action "${deleteTarget?.nom ?? ''}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => { if (deleteTarget) deleteMutation.mutate(deleteTarget.id) }}
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}
