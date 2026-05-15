import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, parseISO, isValid } from 'date-fns'

/**
 * Merges class names with Tailwind deduplication.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

/**
 * Formats an ISO 8601 date string into a human-readable local date/time.
 * Returns "—" for empty or invalid input.
 */
export function formatDate(isoString: string | null | undefined): string {
  if (!isoString) return '—'
  try {
    const date = parseISO(isoString)
    if (!isValid(date)) return '—'
    return format(date, 'dd MMM yyyy, HH:mm')
  } catch {
    return '—'
  }
}

/**
 * Formats an ISO 8601 date string as a relative time (e.g. "3 minutes ago").
 * Returns "—" for empty or invalid input.
 */
export function formatRelativeTime(isoString: string | null | undefined): string {
  if (!isoString) return '—'
  try {
    // MongoDB naive datetimes arrive without timezone suffix (e.g. "2026-05-09T23:11:14.837000").
    // Append 'Z' so the browser interprets them as UTC instead of local time.
    const normalized = /[Z+\-]\d{2}:?\d{2}$/.test(isoString) ? isoString : isoString + 'Z'
    const date = parseISO(normalized)
    if (!isValid(date)) return '—'
    return formatDistanceToNow(date, { addSuffix: true })
  } catch {
    return '—'
  }
}

/**
 * Truncates a string to `maxLength` characters, appending "…" if truncated.
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return `${str.slice(0, maxLength)}…`
}

/**
 * Returns a short display version of a UUID (first 8 characters).
 */
export function shortId(id: string): string {
  return id.slice(0, 8)
}

/**
 * Formats a file size in bytes to a human-readable string.
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}
