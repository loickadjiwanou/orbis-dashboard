import React, { useState, useCallback } from 'react'
import {
  GitBranch,
  Plus,
  Play,
  RefreshCw,
  Trash2,
  Pencil,
  Search,
  X,
  ChevronDown,
  ChevronUp,
  ArrowUp,
  ArrowDown,
  Clock,
  Zap,
  AlertTriangle,
  Calendar,
  Loader2,
  CheckCircle2,
  XCircle,
  PlusCircle,
  List,
  SkipForward,
} from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import * as api from '@/services/api'
import type { InstructionExecuteResult } from '@/services/api'
import { formatDate, cn } from '@/lib/utils'
import type {
  Instruction,
  TriggerType,
  StepCondition,
  Action,
  Device,
  Group,
} from '@/types'

// ─── Constants ───────────────────────────────────────────────────────────────

const TRIGGERS: TriggerType[] = ['manual', 'alert', 'schedule']

const TRIGGER_LABELS: Record<TriggerType, string> = {
  manual: 'Manual',
  alert: 'On Alert',
  schedule: 'Scheduled',
}

const TRIGGER_COLORS: Record<TriggerType, string> = {
  manual: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  alert:  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  schedule: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
}

const TRIGGER_ICONS: Record<TriggerType, React.ReactNode> = {
  manual:   <Zap className="h-3 w-3" />,
  alert:    <AlertTriangle className="h-3 w-3" />,
  schedule: <Calendar className="h-3 w-3" />,
}

const CONDITIONS: { value: StepCondition; label: string; desc: string }[] = [
  { value: 'always',     label: 'Always',     desc: 'Run regardless of previous step result' },
  { value: 'on_success', label: 'On success',  desc: 'Only run if previous step succeeded' },
  { value: 'on_failure', label: 'On failure',  desc: 'Only run if previous step failed' },
]

const CONDITION_COLORS: Record<StepCondition, string> = {
  always:     'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  on_success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  on_failure: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

// ─── Local form types ─────────────────────────────────────────────────────────

interface StepForm {
  action_id: string
  condition_continuer: StepCondition
  timeout_sec: number
  parametres: Record<string, string>
}

interface InstructionFormData {
  nom: string
  description: string
  trigger: TriggerType
  schedule_cron: string
  etapes: StepForm[]
}

function blankStep(): StepForm {
  return { action_id: '', condition_continuer: 'on_success', timeout_sec: 60, parametres: {} }
}

function blankForm(): InstructionFormData {
  return { nom: '', description: '', trigger: 'manual', schedule_cron: '', etapes: [blankStep()] }
}

function instructionToForm(instr: Instruction): InstructionFormData {
  return {
    nom: instr.nom,
    description: instr.description,
    trigger: instr.trigger,
    schedule_cron: instr.schedule_cron ?? '',
    etapes: instr.etapes.map((e) => ({
      action_id: e.action_id,
      condition_continuer: e.condition_continuer,
      timeout_sec: e.timeout_sec,
      parametres: Object.fromEntries(
        Object.entries(e.parametres).map(([k, v]) => [k, String(v)])
      ),
    })),
  }
}

// ─── Step Row component ───────────────────────────────────────────────────────

interface StepRowProps {
  index: number
  total: number
  step: StepForm
  actions: Action[]
  onChange: (updated: StepForm) => void
  onMoveUp: () => void
  onMoveDown: () => void
  onRemove: () => void
}

function StepRow({ index, total, step, actions, onChange, onMoveUp, onMoveDown, onRemove }: StepRowProps) {
  const selectedAction = actions.find((a) => a.id === step.action_id)

  const handleParamChange = useCallback((nom: string, value: string) => {
    onChange({ ...step, parametres: { ...step.parametres, [nom]: value } })
  }, [step, onChange])

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4">
      {/* Step header */}
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
          {index + 1}
        </span>
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Step {index + 1}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={index === 0}
            className="rounded p-1 text-muted-foreground hover:bg-accent disabled:opacity-30"
            title="Move up"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={index === total - 1}
            className="rounded p-1 text-muted-foreground hover:bg-accent disabled:opacity-30"
            title="Move down"
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="rounded p-1 text-destructive/70 hover:bg-destructive/10 hover:text-destructive"
            title="Remove step"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Action selector */}
      <div className="mb-3">
        <label className="mb-1 block text-xs font-medium text-muted-foreground">Action</label>
        <select
          value={step.action_id}
          onChange={(e) => onChange({ ...step, action_id: e.target.value, parametres: {} })}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="">— Select an action —</option>
          {actions.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nom} ({a.type})
            </option>
          ))}
        </select>
        {selectedAction && (
          <p className="mt-1 text-xs text-muted-foreground">{selectedAction.description}</p>
        )}
      </div>

      {/* Row: condition + timeout */}
      <div className="mb-3 grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Condition</label>
          <select
            value={step.condition_continuer}
            onChange={(e) => onChange({ ...step, condition_continuer: e.target.value as StepCondition })}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            {CONDITIONS.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Timeout (sec)</label>
          <input
            type="number"
            min={1}
            max={3600}
            value={step.timeout_sec}
            onChange={(e) => onChange({ ...step, timeout_sec: Number(e.target.value) })}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
      </div>

      {/* Parameters for selected action */}
      {selectedAction && selectedAction.parametres.length > 0 && (
        <div className="space-y-2 border-t border-border pt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Parameters</p>
          {selectedAction.parametres.map((param) => (
            <div key={param.nom}>
              <label className="mb-0.5 flex items-center gap-1 text-xs font-medium text-foreground">
                <span className="font-mono text-primary">{`{{${param.nom}}}`}</span>
                {param.requis && <span className="text-destructive">*</span>}
                {param.description && (
                  <span className="font-normal text-muted-foreground">— {param.description}</span>
                )}
              </label>
              {param.type === 'bool' ? (
                <select
                  value={step.parametres[param.nom] ?? param.valeur_defaut}
                  onChange={(e) => handleParamChange(param.nom, e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="true">true</option>
                  <option value="false">false</option>
                </select>
              ) : param.type === 'enum' && param.enum_values.length > 0 ? (
                <select
                  value={step.parametres[param.nom] ?? param.valeur_defaut}
                  onChange={(e) => handleParamChange(param.nom, e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">— choose —</option>
                  {param.enum_values.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              ) : (
                <input
                  type={param.type === 'int' ? 'number' : 'text'}
                  value={step.parametres[param.nom] ?? param.valeur_defaut}
                  placeholder={param.valeur_defaut || `Enter ${param.nom}`}
                  onChange={(e) => handleParamChange(param.nom, e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Script preview */}
      {selectedAction && (
        <div className="mt-3 rounded-md bg-slate-900 p-2">
          <p className="mb-1 text-xs text-slate-500">Script preview</p>
          <code className="whitespace-pre-wrap break-all text-xs text-emerald-400">
            {selectedAction.script_template.replace(
              /\{\{(\w+)\}\}/g,
              (_, k: string) => step.parametres[k] ? `\x1b${step.parametres[k]}\x1b` : `{{${k}}}`
            ).split('\x1b').map((part, i) =>
              i % 2 === 1
                ? <span key={i} className="text-amber-300">{part}</span>
                : <React.Fragment key={i}>{part}</React.Fragment>
            )}
          </code>
        </div>
      )}
    </div>
  )
}

// ─── Instruction Form Modal ───────────────────────────────────────────────────

interface InstructionFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing: Instruction | null
  actions: Action[]
  onSave: (data: InstructionFormData) => void
  isSaving: boolean
}

function InstructionFormModal({ open, onOpenChange, editing, actions, onSave, isSaving }: InstructionFormModalProps) {
  const [form, setForm] = useState<InstructionFormData>(blankForm)

  // Reset form when modal opens
  React.useEffect(() => {
    if (open) {
      setForm(editing ? instructionToForm(editing) : blankForm())
    }
  }, [open, editing])

  const setField = useCallback(<K extends keyof InstructionFormData>(key: K, value: InstructionFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }, [])

  const addStep = useCallback(() => {
    setForm((prev) => ({ ...prev, etapes: [...prev.etapes, blankStep()] }))
  }, [])

  const updateStep = useCallback((index: number, updated: StepForm) => {
    setForm((prev) => {
      const etapes = [...prev.etapes]
      etapes[index] = updated
      return { ...prev, etapes }
    })
  }, [])

  const removeStep = useCallback((index: number) => {
    setForm((prev) => ({ ...prev, etapes: prev.etapes.filter((_, i) => i !== index) }))
  }, [])

  const moveStep = useCallback((index: number, direction: -1 | 1) => {
    setForm((prev) => {
      const etapes = [...prev.etapes]
      const target = index + direction
      if (target < 0 || target >= etapes.length) return prev
      ;[etapes[index], etapes[target]] = [etapes[target], etapes[index]]
      return { ...prev, etapes }
    })
  }, [])

  const canSubmit = form.nom.trim().length > 0 &&
    form.etapes.length > 0 &&
    form.etapes.every((s) => s.action_id !== '') &&
    (form.trigger !== 'schedule' || form.schedule_cron.trim().length > 0)

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl border border-border bg-card shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4">
            <Dialog.Title className="text-lg font-semibold">
              {editing ? 'Edit Instruction' : 'New Instruction'}
            </Dialog.Title>
            <Dialog.Close className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {/* Name */}
            <div>
              <label className="mb-1.5 block text-sm font-medium">Name <span className="text-destructive">*</span></label>
              <input
                type="text"
                value={form.nom}
                onChange={(e) => setField('nom', e.target.value)}
                placeholder="e.g. Deploy & Restart"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            {/* Description */}
            <div>
              <label className="mb-1.5 block text-sm font-medium">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setField('description', e.target.value)}
                rows={2}
                placeholder="What does this instruction do?"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              />
            </div>

            {/* Trigger */}
            <div>
              <label className="mb-2 block text-sm font-medium">Trigger</label>
              <div className="flex gap-2">
                {TRIGGERS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setField('trigger', t)}
                    className={cn(
                      'flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors',
                      form.trigger === t
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-background text-muted-foreground hover:bg-accent'
                    )}
                  >
                    {TRIGGER_ICONS[t]}
                    {TRIGGER_LABELS[t]}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {form.trigger === 'manual' && 'Run this instruction on demand from the dashboard.'}
                {form.trigger === 'alert' && 'Run this instruction automatically when an alert is triggered.'}
                {form.trigger === 'schedule' && 'Run this instruction on a recurring cron schedule.'}
              </p>
            </div>

            {/* Cron expression (schedule only) */}
            {form.trigger === 'schedule' && (
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Cron expression <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={form.schedule_cron}
                  onChange={(e) => setField('schedule_cron', e.target.value)}
                  placeholder="e.g. 0 */6 * * *"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Standard 5-field cron: minute hour day month weekday.
                  Example: <span className="font-mono">0 */6 * * *</span> = every 6 hours.
                </p>
              </div>
            )}

            {/* Steps */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <label className="text-sm font-medium">
                  Steps <span className="text-destructive">*</span>
                  <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                    ({form.etapes.length} step{form.etapes.length !== 1 ? 's' : ''})
                  </span>
                </label>
                <button
                  type="button"
                  onClick={addStep}
                  className="flex items-center gap-1.5 rounded-md border border-dashed border-primary/50 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/5"
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  Add step
                </button>
              </div>

              {form.etapes.length === 0 && (
                <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  No steps yet. Add at least one step to build the instruction.
                </div>
              )}

              <div className="space-y-3">
                {form.etapes.map((step, idx) => (
                  <StepRow
                    key={idx}
                    index={idx}
                    total={form.etapes.length}
                    step={step}
                    actions={actions}
                    onChange={(updated) => updateStep(idx, updated)}
                    onMoveUp={() => moveStep(idx, -1)}
                    onMoveDown={() => moveStep(idx, 1)}
                    onRemove={() => removeStep(idx)}
                  />
                ))}
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
              {editing ? 'Save changes' : 'Create instruction'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// ─── Execute Modal ────────────────────────────────────────────────────────────

interface ExecuteModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  instruction: Instruction | null
  devices: Device[]
  groups: Group[]
  onExecute: (payload: { device_id?: string; group_id?: string }) => void
  isExecuting: boolean
  result: InstructionExecuteResult | null
}

function ExecuteModal({ open, onOpenChange, instruction, devices, groups, onExecute, isExecuting, result }: ExecuteModalProps) {
  const [targetType, setTargetType] = useState<'device' | 'group'>('device')
  const [targetId, setTargetId] = useState('')

  React.useEffect(() => {
    if (open) {
      setTargetType('device')
      setTargetId('')
    }
  }, [open, instruction])

  const handleExecute = () => {
    if (!targetId) return
    onExecute(targetType === 'device' ? { device_id: targetId } : { group_id: targetId })
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[85vh] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl border border-border bg-card shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4">
            <div>
              <Dialog.Title className="text-lg font-semibold">Execute Instruction</Dialog.Title>
              {instruction && (
                <p className="mt-0.5 text-sm text-muted-foreground">{instruction.nom}</p>
              )}
            </div>
            <Dialog.Close className="rounded-md p-1.5 text-muted-foreground hover:bg-accent">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {/* Target type */}
            <div>
              <label className="mb-2 block text-sm font-medium">Run on</label>
              <div className="flex gap-2">
                {(['device', 'group'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => { setTargetType(t); setTargetId('') }}
                    className={cn(
                      'rounded-md border px-4 py-2 text-sm font-medium capitalize transition-colors',
                      targetType === t
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-background text-muted-foreground hover:bg-accent'
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Target selector */}
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                {targetType === 'device' ? 'Device' : 'Group'}
              </label>
              <select
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">— Select {targetType} —</option>
                {targetType === 'device'
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
            </div>

            {/* Steps preview */}
            {instruction && instruction.etapes.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Sequence ({instruction.etapes.length} step{instruction.etapes.length !== 1 ? 's' : ''})
                </p>
                <div className="space-y-1">
                  {instruction.etapes
                    .slice()
                    .sort((a, b) => a.ordre - b.ordre)
                    .map((step, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {step.ordre}
                        </span>
                        <span className="font-mono text-xs text-muted-foreground truncate">
                          action:{step.action_id.slice(-6)}
                        </span>
                        <span className={cn('ml-auto shrink-0 rounded px-1.5 py-0.5 text-xs', CONDITION_COLORS[step.condition_continuer])}>
                          {step.condition_continuer.replace('_', ' ')}
                        </span>
                        <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />{step.timeout_sec}s
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Results */}
            {result && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Execution results
                </p>
                {Object.keys(result.devices).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No devices targeted.</p>
                ) : (
                  Object.entries(result.devices).map(([deviceId, steps]) => (
                    <div key={deviceId} className="mb-3 rounded-lg border border-border p-3">
                      <p className="mb-2 font-mono text-xs font-semibold text-foreground">{deviceId}</p>
                      <div className="space-y-1.5">
                        {steps.map((s, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            <span className="font-medium text-muted-foreground">Step {s.step}</span>
                            {s.status === 'sent' && (
                              <span className="flex items-center gap-1 text-emerald-600">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Sent
                              </span>
                            )}
                            {s.status === 'failed' && (
                              <span className="flex items-center gap-1 text-destructive">
                                <XCircle className="h-3.5 w-3.5" /> Failed
                                {s.error && <span className="text-muted-foreground">— {s.error}</span>}
                              </span>
                            )}
                            {s.status === 'skipped' && (
                              <span className="flex items-center gap-1 text-muted-foreground">
                                <SkipForward className="h-3.5 w-3.5" /> Skipped
                                {s.reason && <span>— {s.reason}</span>}
                              </span>
                            )}
                            {s.command_id && (
                              <span className="ml-auto font-mono text-muted-foreground">{s.command_id.slice(-8)}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="flex shrink-0 items-center justify-end gap-3 border-t border-border px-6 py-4">
            <Dialog.Close className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent">
              {result ? 'Close' : 'Cancel'}
            </Dialog.Close>
            {!result && (
              <button
                type="button"
                onClick={handleExecute}
                disabled={!targetId || isExecuting}
                className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {isExecuting ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Running…</>
                ) : (
                  <><Play className="h-4 w-4" /> Execute</>
                )}
              </button>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// ─── Instruction Card ─────────────────────────────────────────────────────────

interface InstructionCardProps {
  instruction: Instruction
  actions: Action[]
  onEdit: () => void
  onDelete: () => void
  onExecute: () => void
}

function InstructionCard({ instruction, actions, onEdit, onDelete, onExecute }: InstructionCardProps) {
  const [expanded, setExpanded] = useState(false)

  const sortedSteps = [...instruction.etapes].sort((a, b) => a.ordre - b.ordre)

  return (
    <div className="rounded-lg border border-border bg-card shadow-sm">
      {/* Main row */}
      <div className="flex items-start gap-4 p-5">
        {/* Icon */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <GitBranch className="h-5 w-5 text-primary" />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-foreground">{instruction.nom}</h3>
            {/* Trigger badge */}
            <span className={cn('flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', TRIGGER_COLORS[instruction.trigger])}>
              {TRIGGER_ICONS[instruction.trigger]}
              {TRIGGER_LABELS[instruction.trigger]}
            </span>
          </div>

          {instruction.description && (
            <p className="mt-0.5 text-sm text-muted-foreground">{instruction.description}</p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <List className="h-3.5 w-3.5" />
              {instruction.etapes.length} step{instruction.etapes.length !== 1 ? 's' : ''}
            </span>
            {instruction.schedule_cron && (
              <span className="flex items-center gap-1 font-mono">
                <Calendar className="h-3.5 w-3.5" />
                {instruction.schedule_cron}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {formatDate(instruction.cree_le)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="rounded-md border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-accent"
            title={expanded ? 'Hide steps' : 'Show steps'}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          <button
            onClick={onEdit}
            className="rounded-md border border-border p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            title="Edit"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            className="rounded-md border border-border p-1.5 text-destructive/70 hover:bg-destructive/10 hover:text-destructive"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <button
            onClick={onExecute}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Play className="h-3.5 w-3.5" />
            Run
          </button>
        </div>
      </div>

      {/* Expanded steps */}
      {expanded && (
        <div className="border-t border-border px-5 pb-4 pt-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Execution sequence
          </p>
          <div className="relative space-y-0">
            {sortedSteps.map((step, idx) => {
              const action = actions.find((a) => a.id === step.action_id)
              return (
                <div key={idx} className="flex gap-3">
                  {/* Connector line */}
                  <div className="flex flex-col items-center">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-primary/10 text-xs font-bold text-primary">
                      {step.ordre}
                    </div>
                    {idx < sortedSteps.length - 1 && (
                      <div className="w-0.5 flex-1 bg-border my-0.5" style={{ minHeight: '1.25rem' }} />
                    )}
                  </div>
                  {/* Step info */}
                  <div className={cn('pb-3 min-w-0', idx === sortedSteps.length - 1 && 'pb-0')}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm text-foreground">
                        {action ? action.nom : <span className="text-destructive">Unknown action</span>}
                      </span>
                      {action && (
                        <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground capitalize">
                          {action.type}
                        </span>
                      )}
                      <span className={cn('rounded px-1.5 py-0.5 text-xs', CONDITION_COLORS[step.condition_continuer])}>
                        {step.condition_continuer.replace('_', ' ')}
                      </span>
                      <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />{step.timeout_sec}s
                      </span>
                    </div>
                    {action && (
                      <p className="mt-0.5 font-mono text-xs text-muted-foreground truncate">
                        {action.script_template.slice(0, 80)}{action.script_template.length > 80 ? '…' : ''}
                      </p>
                    )}
                    {Object.keys(step.parametres).length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {Object.entries(step.parametres).map(([k, v]) => (
                          <span key={k} className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                            {k}={String(v)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function InstructionsPage(): React.ReactElement {
  const qc = useQueryClient()

  // UI state
  const [search, setSearch] = useState('')
  const [triggerFilter, setTriggerFilter] = useState<TriggerType | ''>('')
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Instruction | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Instruction | null>(null)
  const [executeTarget, setExecuteTarget] = useState<Instruction | null>(null)
  const [executeResult, setExecuteResult] = useState<InstructionExecuteResult | null>(null)

  // Queries
  const { data: instructions = [], isLoading } = useQuery<Instruction[]>({
    queryKey: ['instructions'],
    queryFn: api.getInstructions,
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

  const { data: groupsData } = useQuery({
    queryKey: ['groups'],
    queryFn: api.getGroups,
  })
  const groups: Group[] = Array.isArray(groupsData)
    ? groupsData
    : ((groupsData as unknown as { items?: Group[] })?.items ?? [])

  // Mutations
  const createMut = useMutation({
    mutationFn: (data: InstructionFormData) =>
      api.createInstruction({
        nom: data.nom,
        description: data.description,
        trigger: data.trigger,
        schedule_cron: data.schedule_cron || undefined,
        etapes: data.etapes.map((s, i) => ({
          ordre: i + 1,
          action_id: s.action_id,
          condition_continuer: s.condition_continuer,
          timeout_sec: s.timeout_sec,
          parametres: Object.fromEntries(
            Object.entries(s.parametres).map(([k, v]) => [k, v])
          ),
        })),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['instructions'] })
      setFormOpen(false)
    },
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: InstructionFormData }) =>
      api.updateInstruction(id, {
        nom: data.nom,
        description: data.description,
        trigger: data.trigger,
        schedule_cron: data.schedule_cron || undefined,
        etapes: data.etapes.map((s, i) => ({
          ordre: i + 1,
          action_id: s.action_id,
          condition_continuer: s.condition_continuer,
          timeout_sec: s.timeout_sec,
          parametres: Object.fromEntries(
            Object.entries(s.parametres).map(([k, v]) => [k, v])
          ),
        })),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['instructions'] })
      setFormOpen(false)
      setEditTarget(null)
    },
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.deleteInstruction(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['instructions'] })
      setDeleteTarget(null)
    },
  })

  const executeMut = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { device_id?: string; group_id?: string } }) =>
      api.executeInstruction(id, payload),
    onSuccess: (result) => {
      void qc.invalidateQueries({ queryKey: ['commands'] })
      setExecuteResult(result)
    },
  })

  // Handlers
  const openCreate = useCallback(() => {
    setEditTarget(null)
    setFormOpen(true)
  }, [])

  const openEdit = useCallback((instr: Instruction) => {
    setEditTarget(instr)
    setFormOpen(true)
  }, [])

  const handleSave = useCallback((data: InstructionFormData) => {
    if (editTarget) {
      updateMut.mutate({ id: editTarget.id, data })
    } else {
      createMut.mutate(data)
    }
  }, [editTarget, createMut, updateMut])

  const openExecute = useCallback((instr: Instruction) => {
    setExecuteTarget(instr)
    setExecuteResult(null)
  }, [])

  // Filtered list
  const filtered = instructions.filter((instr) => {
    const matchSearch = search === '' ||
      instr.nom.toLowerCase().includes(search.toLowerCase()) ||
      instr.description?.toLowerCase().includes(search.toLowerCase())
    const matchTrigger = triggerFilter === '' || instr.trigger === triggerFilter
    return matchSearch && matchTrigger
  })

  const isSaving = createMut.isPending || updateMut.isPending

  return (
    <div>
      <PageHeader
        title="Instructions"
        description="Multi-step automation sequences to run on devices or groups"
        actions={
          <button
            onClick={openCreate}
            className="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            New Instruction
          </button>
        }
      />

      {/* Filters */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search instructions…"
            className="h-9 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Trigger filter */}
        <div className="relative">
          <select
            value={triggerFilter}
            onChange={(e) => setTriggerFilter(e.target.value as TriggerType | '')}
            className="h-9 appearance-none rounded-md border border-border bg-background pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="">All triggers</option>
            {TRIGGERS.map((t) => (
              <option key={t} value={t}>{TRIGGER_LABELS[t]}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        </div>

        {/* Stats */}
        <span className="ml-auto text-sm text-muted-foreground">
          {filtered.length} / {instructions.length} instruction{instructions.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-16">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && instructions.length === 0 && (
        <EmptyState
          icon={<GitBranch className="h-8 w-8" />}
          title="No instructions yet"
          description="Build multi-step automation sequences to orchestrate actions across your devices."
          action={
            <button
              onClick={openCreate}
              className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              <Plus className="h-4 w-4" />
              Create instruction
            </button>
          }
        />
      )}

      {/* No results after filter */}
      {!isLoading && instructions.length > 0 && filtered.length === 0 && (
        <div className="py-12 text-center text-sm text-muted-foreground">
          No instructions match your filters.{' '}
          <button onClick={() => { setSearch(''); setTriggerFilter('') }} className="underline hover:text-foreground">
            Clear filters
          </button>
        </div>
      )}

      {/* List */}
      {!isLoading && filtered.length > 0 && (
        <div className="space-y-4">
          {filtered.map((instr) => (
            <InstructionCard
              key={instr.id}
              instruction={instr}
              actions={actions}
              onEdit={() => openEdit(instr)}
              onDelete={() => setDeleteTarget(instr)}
              onExecute={() => openExecute(instr)}
            />
          ))}
        </div>
      )}

      {/* Form modal (create / edit) */}
      <InstructionFormModal
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditTarget(null)
        }}
        editing={editTarget}
        actions={actions}
        onSave={handleSave}
        isSaving={isSaving}
      />

      {/* Execute modal */}
      <ExecuteModal
        open={executeTarget !== null}
        onOpenChange={(open) => { if (!open) { setExecuteTarget(null); setExecuteResult(null) } }}
        instruction={executeTarget}
        devices={devices}
        groups={groups}
        onExecute={(payload) => executeTarget && executeMut.mutate({ id: executeTarget.id, payload })}
        isExecuting={executeMut.isPending}
        result={executeResult}
      />

      {/* Delete confirm */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
        title="Delete instruction"
        description={`Are you sure you want to delete "${deleteTarget?.nom}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
        isLoading={deleteMut.isPending}
      />
    </div>
  )
}
