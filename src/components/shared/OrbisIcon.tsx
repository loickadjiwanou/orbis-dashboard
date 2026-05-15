import React from 'react'
import { cn } from '@/lib/utils'

/**
 * Orbis ring icon — matches the Android app launcher icon exactly.
 * White donut (outer r=34, inner r=24) on a deep-indigo rounded square.
 * Pass `className` to control size (e.g. "h-5 w-5").
 */
export function OrbisIcon({ className }: { className?: string }): React.ReactElement {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 108 108"
      className={cn('shrink-0', className)}
      aria-hidden="true"
    >
      <path
        fill="white"
        fillRule="evenodd"
        d="M54,20 C35.2,20 20,35.2 20,54 C20,72.8 35.2,88 54,88 C72.8,88 88,72.8 88,54 C88,35.2 72.8,20 54,20z M54,30 C67.3,30 78,40.7 78,54 C78,67.3 67.3,78 54,78 C40.7,78 30,67.3 30,54 C30,40.7 40.7,30 54,30z"
      />
    </svg>
  )
}
