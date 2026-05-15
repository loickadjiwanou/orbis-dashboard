import React from 'react'
import { Check, X } from 'lucide-react'
import type { CommandStatus } from '@/types'
import { cn } from '@/lib/utils'

interface CommandLifecycleProps {
  statut: CommandStatus
  compact?: boolean
}

type Step = {
  key: CommandStatus | 'terminal'
  label: string
}

const STEPS: Step[] = [
  { key: 'pending', label: 'Pending' },
  { key: 'sent', label: 'Sent' },
  { key: 'acknowledged', label: 'Ack' },
  { key: 'executing', label: 'Executing' },
  { key: 'success', label: 'Done' },
]

const STATUS_ORDER: Record<CommandStatus, number> = {
  pending: 0,
  sent: 1,
  acknowledged: 2,
  executing: 3,
  success: 4,
  failed: 4,
}

export function CommandLifecycle({
  statut,
  compact = false,
}: CommandLifecycleProps): React.ReactElement {
  const currentIndex = STATUS_ORDER[statut]
  const isFailed = statut === 'failed'

  return (
    <div className={cn('flex items-center', compact ? 'gap-1' : 'gap-2')}>
      {STEPS.map((step, idx) => {
        // "success" means every step is done — include the final step as completed
        const isCompleted = idx < currentIndex || (statut === 'success' && idx === currentIndex)
        const isCurrent = idx === currentIndex && statut !== 'success'
        const isFinalFailed = isFailed && idx === currentIndex

        let dotClass = 'bg-gray-200 text-gray-400 border-gray-200'
        if (isCompleted) {
          dotClass = 'bg-green-500 text-white border-green-500'
        } else if (isCurrent && !isFailed) {
          dotClass = 'bg-orange-500 text-white border-orange-500 animate-pulse'
        } else if (isFinalFailed) {
          dotClass = 'bg-destructive text-white border-destructive'
        }

        return (
          <React.Fragment key={step.key}>
            {idx > 0 && (
              <div
                className={cn(
                  'h-px flex-1',
                  compact ? 'min-w-2' : 'min-w-4',
                  isCompleted ? 'bg-green-500' : 'bg-gray-200',
                )}
              />
            )}
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  'flex items-center justify-center rounded-full border-2 font-bold transition-colors',
                  compact ? 'h-5 w-5 text-[10px]' : 'h-6 w-6 text-xs',
                  dotClass,
                )}
                title={step.label}
              >
                {isCompleted ? (
                  <Check className={compact ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
                ) : isFinalFailed ? (
                  <X className={compact ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
                ) : (
                  <span>{idx + 1}</span>
                )}
              </div>
              {!compact && (
                <span
                  className={cn(
                    'text-[10px] font-medium whitespace-nowrap',
                    isCompleted && 'text-green-600',
                    isCurrent && !isFailed && 'text-orange-600',
                    isFinalFailed && 'text-destructive',
                    !isCompleted && !isCurrent && !isFinalFailed && 'text-muted-foreground',
                  )}
                >
                  {step.label}
                </span>
              )}
            </div>
          </React.Fragment>
        )
      })}
    </div>
  )
}
