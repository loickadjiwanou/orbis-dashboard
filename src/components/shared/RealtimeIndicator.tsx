import React from 'react'
import { cn } from '@/lib/utils'

interface RealtimeIndicatorProps {
  active: boolean
  label?: string
}

export function RealtimeIndicator({
  active,
  label,
}: RealtimeIndicatorProps): React.ReactElement {
  return (
    <div className="flex items-center gap-2">
      <span className="relative flex h-2.5 w-2.5">
        {active && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
        )}
        <span
          className={cn(
            'relative inline-flex h-2.5 w-2.5 rounded-full',
            active ? 'bg-green-500' : 'bg-gray-400',
          )}
        />
      </span>
      {label && (
        <span
          className={cn(
            'text-xs font-medium',
            active ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground',
          )}
        >
          {label}
        </span>
      )}
    </div>
  )
}
