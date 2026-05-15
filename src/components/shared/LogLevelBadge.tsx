import React from 'react'
import type { LogLevel } from '@/types'
import { cn } from '@/lib/utils'

interface LogLevelBadgeProps {
  level: LogLevel
  size?: 'sm' | 'md'
}

const LEVEL_CONFIG: Record<LogLevel, { badge: string; label: string }> = {
  DEBUG: {
    badge: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700',
    label: 'DEBUG',
  },
  INFO: {
    badge: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
    label: 'INFO',
  },
  WARNING: {
    badge: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
    label: 'WARN',
  },
  ERROR: {
    badge: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
    label: 'ERROR',
  },
  CRITICAL: {
    badge: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800',
    label: 'CRIT',
  },
}

const SIZE_CONFIG = {
  sm: 'text-[10px] px-1 py-0.5',
  md: 'text-xs px-1.5 py-0.5',
}

export function LogLevelBadge({ level, size = 'md' }: LogLevelBadgeProps): React.ReactElement {
  const config = LEVEL_CONFIG[level]
  return (
    <span
      className={cn(
        'inline-flex items-center rounded border font-mono font-semibold tracking-wide',
        config.badge,
        SIZE_CONFIG[size],
      )}
    >
      {config.label}
    </span>
  )
}
