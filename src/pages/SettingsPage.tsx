import React from 'react'
import { Settings, Monitor, Moon, Sun, User, SunMoon } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import useUIStore from '@/stores/uiStore'
import useAuthStore from '@/stores/authStore'
import { cn } from '@/lib/utils'

type Theme = 'light' | 'dark' | 'dimmed' | 'system'

const THEMES: Array<{ value: Theme; label: string; icon: React.ElementType; description: string }> = [
  { value: 'light',  label: 'Light',  icon: Sun,         description: 'Bright background, optimal in daylight' },
  { value: 'dark',   label: 'Dark',   icon: Moon,        description: 'Dark slate background, easier on the eyes' },
  { value: 'dimmed', label: 'Dimmed', icon: SunMoon,     description: 'Pure black background (#000000)' },
  { value: 'system', label: 'System', icon: Monitor,     description: 'Follows your OS preference automatically' },
]

// ─── Section wrapper ─────────────────────────────────────────────────────────

function Section({
  icon: Icon,
  title,
  children,
  className,
}: {
  icon: React.ElementType
  title: string
  children: React.ReactNode
  className?: string
}): React.ReactElement {
  return (
    <div className={cn('rounded-xl border border-border bg-card p-6 shadow-sm', className)}>
      <h2 className="mb-5 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="h-4 w-4" />
        {title}
      </h2>
      {children}
    </div>
  )
}

// ─── Row ─────────────────────────────────────────────────────────────────────

function Row({ label, children }: { label: string; children: React.ReactNode }): React.ReactElement {
  return (
    <div className="flex items-center justify-between gap-4 py-3 text-sm first:pt-0 last:pb-0 [&:not(:last-child)]:border-b [&:not(:last-child)]:border-border">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{children}</span>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage(): React.ReactElement {
  const theme = useUIStore((s) => s.theme)
  const setTheme = useUIStore((s) => s.setTheme)
  const user = useAuthStore((s) => s.user)

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Configure application preferences"
      />

      {/* ── Two-column grid ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">

          {/* Profile */}
          <Section icon={User} title="Profile" className="h-full">

            {user ? (
              <div>
                {/* Avatar row */}
                <div className="mb-5 flex items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
                    {user.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold">{user.full_name}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                <div className="divide-y divide-border">
                  <Row label="Role">
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary capitalize">
                      {user.role}
                    </span>
                  </Row>
                  <Row label="Account status">
                    <span className={cn(
                      'inline-flex items-center gap-1.5 text-xs font-medium',
                      user.is_active ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400',
                    )}>
                      <span className={cn(
                        'h-1.5 w-1.5 rounded-full',
                        user.is_active ? 'bg-green-500' : 'bg-red-500',
                      )} />
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </Row>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Not authenticated</p>
            )}
          </Section>

          {/* Appearance */}
          <Section icon={Settings} title="Appearance" className="h-full">
            <p className="mb-4 text-sm text-muted-foreground">
              Choose the interface theme. "Dimmed" uses a pure black (#000000) background.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {THEMES.map(({ value, label, icon: Icon, description }) => (
                <button
                  key={value}
                  onClick={() => setTheme(value)}
                  className={cn(
                    'flex flex-col gap-2 rounded-xl border-2 p-4 text-left transition-all',
                    theme === value
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-border/80 hover:bg-accent',
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-lg',
                      theme === value ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground',
                    )}>
                      <Icon className="h-4 w-4" />
                    </div>
                    {/* Selection dot */}
                    <span className={cn(
                      'h-2 w-2 rounded-full transition-colors',
                      theme === value ? 'bg-primary' : 'bg-border',
                    )} />
                  </div>
                  <div>
                    <p className={cn(
                      'text-sm font-semibold',
                      theme === value ? 'text-primary' : '',
                    )}>
                      {label}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground leading-snug">
                      {description}
                    </p>
                  </div>
                </button>
              ))}
            </div>

          </Section>

      </div>
    </div>
  )
}
