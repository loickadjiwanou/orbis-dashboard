import React from 'react'
import { Link } from 'react-router-dom'
import {
  Monitor,
  Wifi,
  WifiOff,
  Bell,
  Activity,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Terminal,
  Clock,
  Layers,
  ShieldAlert,
  Download,
  Settings,
  LogIn,
  Zap,
  AlertCircle,
  RefreshCw,
  TrendingUp,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/layout/PageHeader'
import { RealtimeIndicator } from '@/components/shared/RealtimeIndicator'
import { DeviceStatusBadge } from '@/components/shared/DeviceStatusBadge'
import * as api from '@/services/api'
import useUIStore from '@/stores/uiStore'
import { formatRelativeTime, cn } from '@/lib/utils'
import type { Device, AuditLog, Alert, Platform } from '@/types'

// ── Platform config ──────────────────────────────────────────────────────────

const PLATFORM_CONFIG: Record<string, { label: string; bar: string; dot: string }> = {
  windows: { label: 'Windows', bar: 'bg-blue-500',    dot: 'bg-blue-500' },
  linux:   { label: 'Linux',   bar: 'bg-orange-500',  dot: 'bg-orange-500' },
  macos:   { label: 'macOS',   bar: 'bg-slate-400',   dot: 'bg-slate-400' },
  android: { label: 'Android', bar: 'bg-emerald-500', dot: 'bg-emerald-500' },
}

// ── Audit action meta ────────────────────────────────────────────────────────

type ActionMeta = { label: string; Icon: React.ElementType; color: string; bg: string }

function getActionMeta(actionType: string): ActionMeta {
  if (actionType.includes('command') || actionType.includes('cmd')) {
    return { label: 'Command sent',    Icon: Terminal,    color: 'text-indigo-400',  bg: 'bg-indigo-500/10' }
  }
  if (actionType.includes('revoke')) {
    return { label: 'Device revoked',  Icon: ShieldAlert, color: 'text-red-400',     bg: 'bg-red-500/10' }
  }
  if (actionType.includes('update') || actionType.includes('version')) {
    return { label: 'Update deployed', Icon: Download,    color: 'text-blue-400',    bg: 'bg-blue-500/10' }
  }
  if (actionType.includes('alert')) {
    return { label: 'Alert event',     Icon: Bell,        color: 'text-amber-400',   bg: 'bg-amber-500/10' }
  }
  if (actionType.includes('group')) {
    return { label: 'Group action',    Icon: Layers,      color: 'text-violet-400',  bg: 'bg-violet-500/10' }
  }
  if (actionType.includes('action')) {
    return { label: 'Action executed', Icon: Zap,         color: 'text-pink-400',    bg: 'bg-pink-500/10' }
  }
  if (actionType.includes('login') || actionType.includes('auth')) {
    return { label: 'User login',      Icon: LogIn,       color: 'text-emerald-400', bg: 'bg-emerald-500/10' }
  }
  if (actionType.includes('setup')) {
    return { label: 'System setup',   Icon: Settings,    color: 'text-primary',     bg: 'bg-primary/10' }
  }
  return { label: actionType,          Icon: Activity,    color: 'text-muted-foreground', bg: 'bg-muted' }
}

// ── Alert condition label ────────────────────────────────────────────────────

function describeCondition(alert: Alert): string {
  const c = alert.condition
  if (c.type === 'log_level')          return `Log level = ${String(c.valeur)}`
  if (c.type === 'inactivity')         return `Inactive for ${String(c.valeur)} min`
  if (c.type === 'metadata_threshold') return `${c.metadata_key ?? '?'} ${c.operateur} ${String(c.valeur)}`
  return c.type
}

// ── Section wrapper ──────────────────────────────────────────────────────────

function Card({
  className,
  children,
  accent,
}: {
  className?: string
  children: React.ReactNode
  accent?: string
}): React.ReactElement {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-border',
        className,
      )}
    >
      {accent && (
        <div className={cn('absolute left-0 top-0 h-0.5 w-full', accent)} />
      )}
      {children}
    </div>
  )
}

function SectionHeader({
  icon: Icon,
  title,
  href,
  extra,
}: {
  icon: React.ElementType
  title: string
  href?: string
  extra?: React.ReactNode
}): React.ReactElement {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-3.5 w-3.5 text-primary" />
        </div>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      </div>
      <div className="flex items-center gap-3">
        {extra}
        {href && (
          <Link
            to={href}
            className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80"
          >
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>
    </div>
  )
}

// ── KPI Card ────────────────────────────────────────────────────────────────

interface KpiProps {
  title: string
  value: number | string
  sub: string
  icon: React.ElementType
  iconGradient: string
  valueColor?: string
  badge?: React.ReactNode
  href?: string
  accent: string
}

function KpiCard({
  title,
  value,
  sub,
  icon: Icon,
  iconGradient,
  valueColor = 'text-foreground',
  badge,
  href,
  accent,
}: KpiProps): React.ReactElement {
  const inner = (
    <Card accent={accent} className="group p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {title}
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <p className={cn('text-3xl font-bold tabular-nums leading-none', valueColor)}>
              {value}
            </p>
            {badge}
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">{sub}</p>
        </div>
        <div
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-md',
            iconGradient,
          )}
        >
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
      {href && (
        <div className="mt-4 flex items-center gap-1 text-[11px] font-medium text-muted-foreground transition-colors group-hover:text-primary">
          View details <ArrowRight className="h-3 w-3" />
        </div>
      )}
    </Card>
  )

  return href ? <Link to={href} className="block">{inner}</Link> : inner
}

// ── Platform bar ─────────────────────────────────────────────────────────────

function PlatformBar({
  platform,
  count,
  total,
}: {
  platform: string
  count: number
  total: number
}): React.ReactElement {
  const cfg = PLATFORM_CONFIG[platform] ?? { label: platform, bar: 'bg-muted-foreground', dot: 'bg-muted-foreground' }
  const pct = total > 0 ? (count / total) * 100 : 0

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <span className={cn('h-2 w-2 rounded-full', cfg.dot)} />
          <span className="font-medium text-foreground capitalize">{cfg.label}</span>
        </div>
        <span className="tabular-nums text-muted-foreground">
          {count} <span className="text-muted-foreground/60">({Math.round(pct)}%)</span>
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full rounded-full transition-all duration-500', cfg.bar)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// ── Activity row ─────────────────────────────────────────────────────────────

function ActivityRow({ log }: { log: AuditLog }): React.ReactElement {
  const meta = getActionMeta(log.action_type)
  const { Icon } = meta

  return (
    <div className="flex items-start gap-3 py-3">
      <div className={cn('mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg', meta.bg)}>
        <Icon className={cn('h-3.5 w-3.5', meta.color)} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-foreground">{meta.label}</p>
          <span className="shrink-0 text-[10px] text-muted-foreground/70">
            {formatRelativeTime(log.timestamp)}
          </span>
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {log.operateur_email}
          {log.device_id && (
            <> · <Link to={`/devices/${log.device_id}`} className="text-primary hover:underline">device</Link></>
          )}
        </p>
        <span
          className={cn(
            'mt-1 inline-flex rounded px-1.5 py-px text-[10px] font-semibold',
            log.resultat === 'success'
              ? 'bg-emerald-500/10 text-emerald-500'
              : 'bg-destructive/10 text-destructive',
          )}
        >
          {log.resultat}
        </span>
      </div>
    </div>
  )
}

// ── Health row ───────────────────────────────────────────────────────────────

function HealthRow({
  label,
  ok,
  value,
}: {
  label: string
  ok: boolean
  value?: string | number
}): React.ReactElement {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-foreground">{label}</span>
      <div className="flex items-center gap-2">
        {value !== undefined && (
          <span className="font-mono text-xs text-muted-foreground">{value}</span>
        )}
        {ok ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        ) : (
          <XCircle className="h-4 w-4 text-destructive" />
        )}
      </div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage(): React.ReactElement {
  const wsConnected = useUIStore((s) => s.wsConnected)

  const { data: devicesData, isLoading: devicesLoading } = useQuery({
    queryKey: ['devices', {}],
    queryFn: () => api.getDevices({ limit: 100 }),
    staleTime: 30_000,
  })

  const { data: alerts } = useQuery({
    queryKey: ['alerts'],
    queryFn: api.getAlerts,
    staleTime: 60_000,
  })

  const { data: health } = useQuery({
    queryKey: ['health'],
    queryFn: api.getHealth,
    refetchInterval: 30_000,
  })

  const { data: auditData, isLoading: auditLoading } = useQuery({
    queryKey: ['audit-recent'],
    queryFn: () => api.getAuditLogs({ limit: 12 }),
    staleTime: 30_000,
    refetchInterval: 60_000,
  })

  const { data: groups } = useQuery({
    queryKey: ['groups'],
    queryFn: api.getGroups,
    staleTime: 60_000,
  })

  // Derived stats
  const devices     = devicesData?.items ?? []
  const onlineCount  = devices.filter((d: Device) => d.statut === 'online').length
  const offlineCount = devices.filter((d: Device) => d.statut === 'offline').length
  const activeAlerts = (alerts ?? []).filter((a) => a.actif)
  const recentDevices = [...devices]
    .sort((a, b) => new Date(b.derniere_connexion).getTime() - new Date(a.derniere_connexion).getTime())
    .slice(0, 6)
  const auditLogs    = auditData?.items ?? []

  // Platform distribution
  const platforms: Platform[] = ['windows', 'linux', 'macos', 'android']
  const platformCounts = platforms.map((p) => ({
    platform: p,
    count: devices.filter((d: Device) => d.plateforme === p).length,
  }))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Real-time overview of your Orbis infrastructure"
        actions={<RealtimeIndicator active={wsConnected} label="Live" />}
      />

      {/* ── KPI Row ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiCard
          title="Total Devices"
          value={devicesData?.total ?? 0}
          sub="Registered agents"
          icon={Monitor}
          iconGradient="bg-gradient-to-br from-indigo-500 to-indigo-700"
          accent="bg-gradient-to-r from-indigo-500 to-violet-500"
          href="/devices"
        />
        <KpiCard
          title="Online"
          value={onlineCount}
          sub="Currently connected"
          icon={Wifi}
          iconGradient="bg-gradient-to-br from-emerald-400 to-emerald-600"
          valueColor="text-emerald-500"
          accent="bg-gradient-to-r from-emerald-400 to-teal-500"
          badge={
            onlineCount > 0 ? (
              <span className="flex h-2 w-2 rounded-full bg-emerald-500">
                <span className="h-2 w-2 animate-ping rounded-full bg-emerald-400 opacity-75" />
              </span>
            ) : undefined
          }
          href="/devices"
        />
        <KpiCard
          title="Offline"
          value={offlineCount}
          sub="Not responding"
          icon={WifiOff}
          iconGradient={offlineCount > 0
            ? 'bg-gradient-to-br from-red-400 to-red-600'
            : 'bg-gradient-to-br from-slate-300 to-slate-500'}
          valueColor={offlineCount > 0 ? 'text-destructive' : 'text-foreground'}
          accent={offlineCount > 0
            ? 'bg-gradient-to-r from-red-500 to-rose-500'
            : 'bg-border'}
          href="/devices"
        />
        <KpiCard
          title="Active Alerts"
          value={activeAlerts.length}
          sub="Alert rules enabled"
          icon={Bell}
          iconGradient={activeAlerts.length > 0
            ? 'bg-gradient-to-br from-amber-400 to-orange-500'
            : 'bg-gradient-to-br from-slate-300 to-slate-500'}
          valueColor={activeAlerts.length > 0 ? 'text-amber-500' : 'text-foreground'}
          accent={activeAlerts.length > 0
            ? 'bg-gradient-to-r from-amber-400 to-orange-500'
            : 'bg-border'}
          href="/alerts"
        />
      </div>

      {/* ── Secondary Stats ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">

        {/* Groups */}
        <Card accent="bg-gradient-to-r from-violet-500 to-purple-500" className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-md">
                <Layers className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Groups</p>
                <p className="text-2xl font-bold tabular-nums text-foreground">{groups?.length ?? 0}</p>
              </div>
            </div>
            <Link
              to="/groups"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Device groups configured</p>
        </Card>

        {/* Platform distribution */}
        <Card accent="bg-gradient-to-r from-blue-500 to-cyan-500" className="p-5 xl:col-span-2">
          <SectionHeader icon={TrendingUp} title="Platform Distribution" />
          <div className="mt-4 space-y-3">
            {devicesLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Loading…
              </div>
            ) : devices.length === 0 ? (
              <p className="text-sm text-muted-foreground">No devices registered yet.</p>
            ) : (
              platformCounts.map(({ platform, count }) => (
                <PlatformBar
                  key={platform}
                  platform={platform}
                  count={count}
                  total={devices.length}
                />
              ))
            )}
          </div>
        </Card>
      </div>

      {/* ── Activity + Health ────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">

        {/* Recent activity feed */}
        <Card accent="bg-gradient-to-r from-slate-400 to-slate-600" className="p-5 xl:col-span-2">
          <SectionHeader icon={Activity} title="Recent Activity" href="/audit" />
          <div className="mt-3 divide-y divide-border/60">
            {auditLoading ? (
              <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Loading activity…
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <Activity className="h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
              </div>
            ) : (
              auditLogs.map((log) => <ActivityRow key={log.id} log={log} />)
            )}
          </div>
        </Card>

        {/* Recent devices */}
        <Card accent="bg-gradient-to-r from-indigo-500 to-violet-500" className="p-5">
          <SectionHeader icon={Monitor} title="Recent Devices" href="/devices" />
          <div className="mt-3">
            {recentDevices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Monitor className="mb-2 h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No devices registered yet.</p>
              </div>
            ) : (
              <ul className="space-y-1">
                {recentDevices.map((device: Device) => (
                  <li key={device.device_id}>
                    <Link
                      to={`/devices/${device.device_id}`}
                      className="group flex items-center justify-between rounded-xl px-3 py-2.5 transition-colors hover:bg-muted/60"
                    >
                      {/* Left: icon + name + hostname */}
                      <div className="flex min-w-0 items-center gap-3">
                        <div
                          className={cn(
                            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                            device.statut === 'online' ? 'bg-emerald-500/10' : 'bg-muted',
                          )}
                        >
                          <Monitor
                            className={cn(
                              'h-3.5 w-3.5',
                              device.statut === 'online' ? 'text-emerald-500' : 'text-muted-foreground',
                            )}
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground group-hover:text-primary">
                            {device.nom}
                          </p>
                          <p className="truncate text-[11px] text-muted-foreground capitalize">
                            {device.plateforme} · {device.hostname}
                          </p>
                        </div>
                      </div>

                      {/* Right: status + last seen */}
                      <div className="ml-4 flex shrink-0 flex-col items-end gap-1">
                        <DeviceStatusBadge status={device.statut} size="sm" />
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Clock className="h-2.5 w-2.5" />
                          {formatRelativeTime(device.derniere_connexion)}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>

      {/* ── Health + Alerts ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* Backend health */}
        <Card accent="bg-gradient-to-r from-teal-500 to-emerald-500" className="p-5">
          <SectionHeader icon={Activity} title="Backend Health" />

          {health ? (
            <div className="mt-3 divide-y divide-border/60">
              <HealthRow label="API Status" ok={health.status === 'ok'} value={health.status} />
              <HealthRow label="MQTT Broker" ok={Boolean(health.mqtt_connected)} />
              <HealthRow label="Database" ok={Boolean(health.db_connected)} />
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-foreground">WebSocket clients</span>
                <span className="flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-primary/10 px-2 text-xs font-semibold text-primary">
                  {health.ws_clients}
                </span>
              </div>
              {health.version && (
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-foreground">Version</span>
                  <span className="font-mono text-xs text-muted-foreground">{health.version}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-3 flex items-center gap-2 py-4 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              Loading health data…
            </div>
          )}

          {/* WS live indicator */}
          <div
            className={cn(
              'mt-4 flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-medium',
              wsConnected
                ? 'bg-emerald-500/10 text-emerald-500'
                : 'bg-destructive/10 text-destructive',
            )}
          >
            <span
              className={cn(
                'h-2 w-2 rounded-full',
                wsConnected ? 'animate-pulse bg-emerald-500' : 'bg-destructive',
              )}
            />
            {wsConnected ? 'Real-time connected' : 'WebSocket disconnected'}
          </div>
        </Card>

        {/* Active alert rules */}
        <Card accent="bg-gradient-to-r from-amber-400 to-orange-500" className="p-5">
          <SectionHeader
            icon={Bell}
            title="Active Alert Rules"
            href="/alerts"
            extra={
              activeAlerts.length > 0 ? (
                <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-amber-500/20 px-1.5 text-[10px] font-bold text-amber-500">
                  {activeAlerts.length}
                </span>
              ) : undefined
            }
          />
          <div className="mt-3">
            {activeAlerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Bell className="mb-2 h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No active alert rules.</p>
                <Link
                  to="/alerts"
                  className="mt-2 text-xs font-medium text-primary hover:text-primary/80"
                >
                  Configure alerts →
                </Link>
              </div>
            ) : (
              <ul className="space-y-2">
                {activeAlerts.slice(0, 6).map((alert) => (
                  <li key={alert.id}>
                    <div className="flex items-start gap-3 rounded-xl bg-muted/40 px-3 py-2.5">
                      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
                        <Bell className="h-3 w-3 text-amber-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{alert.nom}</p>
                        <p className="text-xs text-muted-foreground">
                          {describeCondition(alert)}
                        </p>
                      </div>
                      <span className="mt-0.5 shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-500">
                        active
                      </span>
                    </div>
                  </li>
                ))}
                {activeAlerts.length > 6 && (
                  <li className="pt-1 text-center">
                    <Link to="/alerts" className="text-xs text-primary hover:underline">
                      +{activeAlerts.length - 6} more
                    </Link>
                  </li>
                )}
              </ul>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
