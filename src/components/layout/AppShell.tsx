import React from 'react'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import useUIStore from '@/stores/uiStore'
import { cn } from '@/lib/utils'

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps): React.ReactElement {
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed)
  const theme = useUIStore((s) => s.theme)

  React.useEffect(() => {
    const root = document.documentElement
    root.classList.remove('dark', 'dimmed')
    if (theme === 'dark') {
      root.classList.add('dark')
    } else if (theme === 'dimmed') {
      root.classList.add('dark', 'dimmed')
    } else if (theme === 'light') {
      // already cleared above
    } else {
      // system
      const mql = window.matchMedia('(prefers-color-scheme: dark)')
      root.classList.toggle('dark', mql.matches)
      const onChange = (e: MediaQueryListEvent): void => {
        root.classList.remove('dark', 'dimmed')
        root.classList.toggle('dark', e.matches)
      }
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    }
    return undefined
  }, [theme])

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* Sidebar */}
      <Sidebar />

      {/* Main area */}
      <div
        className={cn(
          'flex flex-1 flex-col overflow-hidden transition-all duration-300',
          sidebarCollapsed ? 'ml-16' : 'ml-60',
        )}
      >
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
