import React from 'react'
import { useLocation, Link } from 'react-router-dom'
import { Bell, LogOut, Settings, Check, ChevronRight, X } from 'lucide-react'
import * as Popover from '@radix-ui/react-popover'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import * as Avatar from '@radix-ui/react-avatar'
import useAuthStore from '@/stores/authStore'
import useUIStore from '@/stores/uiStore'
import { cn, formatRelativeTime } from '@/lib/utils'

// ─── Route metadata ───────────────────────────────────────────────────────────

const ROUTES: Record<string, { label: string; parent?: string }> = {
  '/':            { label: 'Dashboard' },
  '/devices':     { label: 'Devices' },
  '/groups':      { label: 'Groups' },
  '/logs':        { label: 'Logs' },
  '/commands':    { label: 'Commands' },
  '/actions':     { label: 'Actions' },
  '/instructions':{ label: 'Instructions' },
  '/alerts':      { label: 'Alerts' },
  '/updates':     { label: 'Updates' },
  '/audit':       { label: 'Audit' },
  '/settings':    { label: 'Settings' },
}

interface BreadcrumbItem {
  label: string
  href?: string   // undefined = current page (not clickable)
}

function buildBreadcrumb(pathname: string): BreadcrumbItem[] {
  // Exact match (top-level routes)
  if (ROUTES[pathname]) {
    return [{ label: ROUTES[pathname].label }]
  }

  // Sub-routes e.g. /devices/abc-123
  const segments = pathname.split('/').filter(Boolean)
  const crumbs: BreadcrumbItem[] = []

  for (let i = 0; i < segments.length; i++) {
    const path = '/' + segments.slice(0, i + 1).join('/')
    const route = ROUTES[path]
    const isLast = i === segments.length - 1

    if (route) {
      crumbs.push({ label: route.label, href: isLast ? undefined : path })
    } else {
      // Unknown segment (e.g. device UUID) → show generic label
      crumbs.push({ label: 'Detail' })
    }
  }

  return crumbs
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

const ROLE_CONFIG: Record<string, { label: string; className: string }> = {
  admin:    { label: 'Admin',    className: 'bg-violet-500/20 text-violet-300' },
  operator: { label: 'Operator', className: 'bg-indigo-500/20 text-indigo-300' },
  viewer:   { label: 'Viewer',   className: 'bg-slate-500/20 text-slate-400' },
}

const NOTIF_DOT: Record<string, string> = {
  error:   'bg-red-500',
  warning: 'bg-amber-500',
  success: 'bg-emerald-500',
  info:    'bg-blue-500',
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TopBar(): React.ReactElement {
  const location = useLocation()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const notifications = useUIStore((s) => s.notifications)
  const markAllRead = useUIStore((s) => s.markAllRead)
  const removeNotification = useUIStore((s) => s.removeNotification)

  const unreadCount = notifications.filter((n) => !n.read).length
  const crumbs = buildBreadcrumb(location.pathname)
  const pageTitle = crumbs[crumbs.length - 1]?.label ?? 'Dashboard'
  const roleConfig = user ? (ROLE_CONFIG[user.role] ?? ROLE_CONFIG.viewer) : null

  return (
    <header className="flex h-16 shrink-0 items-center border-b border-border bg-card px-6">
      {/* ── Left: breadcrumb + page title ───────────────────────── */}
      <div className="flex flex-1 flex-col justify-center gap-0.5 min-w-0">
        {/* Breadcrumb — only shown for nested pages */}
        {crumbs.length > 1 && (
          <nav className="flex items-center gap-1" aria-label="Breadcrumb">
            {crumbs.slice(0, -1).map((crumb, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && (
                  <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/50" />
                )}
                {crumb.href ? (
                  <Link
                    to={crumb.href}
                    className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-xs text-muted-foreground">{crumb.label}</span>
                )}
              </React.Fragment>
            ))}
            <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/50" />
          </nav>
        )}

        {/* Page title */}
        <h1 className="truncate text-[15px] font-semibold leading-none text-foreground">
          {pageTitle}
        </h1>
      </div>

      {/* ── Right: notifications + user ─────────────────────────── */}
      <div className="flex items-center gap-1.5">

        {/* Notification bell */}
        <Popover.Root>
          <Popover.Trigger asChild>
            <button
              className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Notifications"
            >
              <Bell className="h-[18px] w-[18px]" />
              {unreadCount > 0 && (
                <span className="absolute right-1.5 top-1.5 flex h-[7px] w-[7px] items-center justify-center rounded-full bg-red-500 ring-2 ring-card" />
              )}
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              className="z-50 w-80 overflow-hidden rounded-xl border border-border bg-card shadow-xl shadow-black/10"
              align="end"
              sideOffset={8}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-semibold text-foreground">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                      {unreadCount}
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    <Check className="h-3 w-3" />
                    Mark all read
                  </button>
                )}
              </div>

              {/* List */}
              <div className="max-h-72 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-8 text-center">
                    <Bell className="h-8 w-8 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">No notifications</p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={cn(
                        'group flex items-start gap-3 border-b border-border/50 px-4 py-3 last:border-0',
                        !n.read && 'bg-primary/[0.04]',
                      )}
                    >
                      <span
                        className={cn(
                          'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                          NOTIF_DOT[n.type] ?? 'bg-muted-foreground',
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground leading-tight">{n.title}</p>
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                          {n.message}
                        </p>
                        <p className="mt-1 text-[10px] text-muted-foreground/70">
                          {formatRelativeTime(n.timestamp)}
                        </p>
                      </div>
                      <button
                        onClick={() => removeNotification(n.id)}
                        className="mt-0.5 shrink-0 rounded p-0.5 text-muted-foreground/50 opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
                        aria-label="Dismiss"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>

        {/* Divider */}
        <div className="mx-1 h-6 w-px bg-border" />

        {/* User dropdown */}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted">
              {/* Avatar */}
              <Avatar.Root className="h-8 w-8 shrink-0 rounded-lg">
                <Avatar.Fallback className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-bold text-white">
                  {user ? getInitials(user.full_name) : '?'}
                </Avatar.Fallback>
              </Avatar.Root>
              {/* Name + role — hidden on small screens */}
              {user && (
                <div className="hidden flex-col md:flex">
                  <span className="text-[13px] font-semibold leading-none text-foreground">
                    {user.full_name.split(' ')[0]}
                  </span>
                  {roleConfig && (
                    <span className={cn('mt-0.5 text-[10px] font-medium capitalize leading-none', roleConfig.className)}>
                      {roleConfig.label}
                    </span>
                  )}
                </div>
              )}
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className="z-50 min-w-52 overflow-hidden rounded-xl border border-border bg-card shadow-xl shadow-black/10"
              align="end"
              sideOffset={8}
            >
              {/* User info header */}
              {user && (
                <div className="border-b border-border px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600">
                      <span className="text-sm font-bold text-white">{getInitials(user.full_name)}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{user.full_name}</p>
                      <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  {roleConfig && (
                    <span className={cn('mt-2 inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium', roleConfig.className)}>
                      {roleConfig.label}
                    </span>
                  )}
                </div>
              )}

              <div className="p-1">
                <DropdownMenu.Item asChild>
                  <Link
                    to="/settings"
                    className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted focus:outline-none"
                  >
                    <Settings className="h-4 w-4 text-muted-foreground" />
                    Settings
                  </Link>
                </DropdownMenu.Item>

                <DropdownMenu.Separator className="my-1 h-px bg-border" />

                <DropdownMenu.Item asChild>
                  <button
                    onClick={logout}
                    className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10 focus:outline-none"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </DropdownMenu.Item>
              </div>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </header>
  )
}
