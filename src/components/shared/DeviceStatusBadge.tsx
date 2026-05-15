import React from 'react'
import type { DeviceStatus } from '@/types'
import { cn } from '@/lib/utils'

interface DeviceStatusBadgeProps {
  status: DeviceStatus
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const STATUS_CONFIG: Record<
  DeviceStatus,
  { dot: string; badge: string; label: string; pulse: boolean; strikethrough: boolean }
> = {
  online: {
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    label: 'Online',
    pulse: true,
    strikethrough: false,
  },
  offline: {
    dot: 'bg-red-500',
    badge: 'bg-red-50 text-red-700 ring-1 ring-red-200',
    label: 'Offline',
    pulse: false,
    strikethrough: false,
  },
  unknown: {
    dot: 'bg-slate-400',
    badge: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
    label: 'Unknown',
    pulse: false,
    strikethrough: false,
  },
  revoked: {
    dot: 'bg-red-700',
    badge: 'bg-red-50 text-red-800 ring-1 ring-red-300',
    label: 'Revoked',
    pulse: false,
    strikethrough: true,
  },
}

const SIZE_CONFIG = {
  sm: { dot: 'h-1.5 w-1.5', text: 'text-xs px-1.5 py-0.5', gap: 'gap-1' },
  md: { dot: 'h-2 w-2', text: 'text-xs px-2 py-1', gap: 'gap-1.5' },
  lg: { dot: 'h-2.5 w-2.5', text: 'text-sm px-2.5 py-1', gap: 'gap-2' },
}

export function DeviceStatusBadge({
  status,
  showLabel = true,
  size = 'md',
}: DeviceStatusBadgeProps): React.ReactElement {
  const config = STATUS_CONFIG[status]
  const sizeConfig = SIZE_CONFIG[size]

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        config.badge,
        sizeConfig.text,
        sizeConfig.gap,
      )}
    >
      <span className="relative flex shrink-0">
        {config.pulse && (
          <span
            className={cn(
              'absolute inline-flex h-full w-full animate-ping rounded-full opacity-75',
              config.dot,
            )}
          />
        )}
        <span className={cn('relative inline-flex rounded-full', config.dot, sizeConfig.dot)} />
      </span>
      {showLabel && (
        <span className={cn(config.strikethrough && 'line-through')}>{config.label}</span>
      )}
    </span>
  )
}
