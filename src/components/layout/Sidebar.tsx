import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Monitor,
  Layers,
  ScrollText,
  Terminal,
  Cpu,
  Zap,
  GitBranch,
  Bell,
  Download,
  ClipboardList,
  Settings,
  ChevronLeft,
  ChevronRight,
  Wifi,
  WifiOff,
} from 'lucide-react'
import { OrbisIcon } from '@/components/shared/OrbisIcon'
import { useQuery } from '@tanstack/react-query'
import * as api from '@/services/api'
import useUIStore from '@/stores/uiStore'
import { cn } from '@/lib/utils'
import type { Alert } from '@/types'

interface NavItem {
  label: string
  icon: React.ElementType
  to: string
  badge?: () => number
}

interface NavGroup {
  label: string
  items: NavItem[]
}

export function Sidebar(): React.ReactElement {
  const collapsed = useUIStore((s) => s.sidebarCollapsed)
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)
  const wsConnected = useUIStore((s) => s.wsConnected)
  const location = useLocation()

  const { data: alerts } = useQuery<Alert[], Error>({
    queryKey: ['alerts'],
    queryFn: api.getAlerts,
    staleTime: 60_000,
  })
  const activeAlertCount = alerts?.filter((a) => a.actif).length ?? 0

  const NAV_GROUPS: NavGroup[] = [
    {
      label: 'Monitoring',
      items: [
        { label: 'Dashboard', icon: LayoutDashboard, to: '/' },
        { label: 'Devices', icon: Monitor, to: '/devices' },
        { label: 'Groups', icon: Layers, to: '/groups' },
        { label: 'Logs', icon: ScrollText, to: '/logs' },
        { label: 'Agent Logs', icon: Cpu, to: '/agent-logs' },
      ],
    },
    {
      label: 'Automation',
      items: [
        { label: 'Commands', icon: Terminal, to: '/commands' },
        { label: 'Actions', icon: Zap, to: '/actions' },
        { label: 'Instructions', icon: GitBranch, to: '/instructions' },
        {
          label: 'Alerts',
          icon: Bell,
          to: '/alerts',
          badge: () => activeAlertCount,
        },
        { label: 'Updates', icon: Download, to: '/updates' },
      ],
    },
    {
      label: 'System',
      items: [
        { label: 'Audit', icon: ClipboardList, to: '/audit' },
        { label: 'Settings', icon: Settings, to: '/settings' },
      ],
    },
  ]

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 flex h-full flex-col transition-all duration-300',
        'bg-[hsl(var(--sidebar-bg))]',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      {/* ── Logo ─────────────────────────────────────────────────── */}
      <div
        className={cn(
          'flex h-16 shrink-0 items-center border-b border-white/[0.06] px-4',
          collapsed ? 'justify-center px-0' : 'gap-3',
        )}
      >
        {/* Icon box */}
        <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#1A237E] shadow-lg shadow-indigo-900/50">
          <OrbisIcon className="h-5 w-5" />
        </div>

        {!collapsed && (
          <div className="min-w-0">
            <span className="block text-[15px] font-bold tracking-wide text-white">Orbis</span>
            <span className="block text-[10px] font-medium uppercase tracking-widest text-indigo-400/70">
              Dashboard
            </span>
          </div>
        )}
      </div>

      {/* ── Navigation ───────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-3">
        <div className={cn('space-y-6', collapsed ? 'px-2' : 'px-3')}>
          {NAV_GROUPS.map((group) => {
            const isActive = (to: string) =>
              to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)

            return (
              <div key={group.label}>
                {/* Group label */}
                {!collapsed ? (
                  <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    {group.label}
                  </p>
                ) : (
                  <div className="mb-1 h-px bg-white/[0.06]" />
                )}

                <ul className="space-y-0.5">
                  {group.items.map((item) => {
                    const active = isActive(item.to)
                    const Icon = item.icon
                    const badgeCount = item.badge?.() ?? 0

                    return (
                      <li key={item.to}>
                        <NavLink
                          to={item.to}
                          title={collapsed ? item.label : undefined}
                          className={cn(
                            'group relative flex items-center rounded-lg transition-all duration-150',
                            collapsed
                              ? 'h-10 w-10 justify-center'
                              : 'gap-3 px-3 py-2.5',
                            active
                              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                              : 'text-slate-400 hover:bg-white/[0.06] hover:text-slate-100',
                          )}
                        >
                          {/* Active indicator bar */}
                          {active && !collapsed && (
                            <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-white/60" />
                          )}

                          {/* Icon */}
                          <span className="relative shrink-0">
                            <Icon
                              className={cn(
                                'h-[18px] w-[18px] transition-colors',
                                active ? 'text-white' : 'text-slate-400 group-hover:text-slate-200',
                              )}
                            />
                            {/* Collapsed badge dot */}
                            {collapsed && badgeCount > 0 && (
                              <span className="absolute -right-1 -top-1 flex h-2 w-2 items-center justify-center rounded-full bg-red-500 ring-1 ring-[hsl(var(--sidebar-bg))]" />
                            )}
                          </span>

                          {/* Label + badge (expanded) */}
                          {!collapsed && (
                            <>
                              <span className="flex-1 text-sm font-medium leading-none">
                                {item.label}
                              </span>
                              {badgeCount > 0 && (
                                <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white tabular-nums">
                                  {badgeCount > 9 ? '9+' : badgeCount}
                                </span>
                              )}
                            </>
                          )}
                        </NavLink>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}
        </div>
      </nav>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-white/[0.06] p-3">
        {/* WS status row */}
        <div
          className={cn(
            'mb-2 flex items-center gap-2 rounded-lg px-2 py-1.5',
            wsConnected ? 'bg-emerald-500/10' : 'bg-red-500/10',
          )}
          title={wsConnected ? 'Real-time connected' : 'Disconnected'}
        >
          {wsConnected ? (
            <Wifi className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
          ) : (
            <WifiOff className="h-3.5 w-3.5 shrink-0 text-red-400" />
          )}
          {!collapsed && (
            <span
              className={cn(
                'text-xs font-medium',
                wsConnected ? 'text-emerald-400' : 'text-red-400',
              )}
            >
              {wsConnected ? 'Live' : 'Offline'}
            </span>
          )}
          {!collapsed && wsConnected && (
            <span className="ml-auto h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          )}
        </div>

        {/* Collapse toggle */}
        <button
          onClick={toggleSidebar}
          className={cn(
            'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:bg-white/[0.06] hover:text-slate-300',
            collapsed && 'justify-center',
          )}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
