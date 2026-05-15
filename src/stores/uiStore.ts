import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Notification } from '@/types'

type Theme = 'light' | 'dark' | 'dimmed' | 'system'

interface UIState {
  theme: Theme
  sidebarCollapsed: boolean
  notifications: Notification[]
  wsConnected: boolean

  setTheme(theme: Theme): void
  toggleSidebar(): void
  addNotification(notification: Omit<Notification, 'id' | 'timestamp' | 'read'>): void
  removeNotification(id: string): void
  markAllRead(): void
  setWsConnected(connected: boolean): void
}

function applyTheme(theme: Theme): void {
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
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    root.classList.toggle('dark', prefersDark)
  }
}

const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      sidebarCollapsed: false,
      notifications: [],
      wsConnected: false,

      setTheme(theme: Theme): void {
        set({ theme })
        applyTheme(theme)
      },

      toggleSidebar(): void {
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }))
      },

      addNotification(
        notification: Omit<Notification, 'id' | 'timestamp' | 'read'>,
      ): void {
        const newNotification: Notification = {
          ...notification,
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          read: false,
        }
        set((state) => ({
          notifications: [newNotification, ...state.notifications].slice(0, 100),
        }))
      },

      removeNotification(id: string): void {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        }))
      },

      markAllRead(): void {
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
        }))
      },

      setWsConnected(connected: boolean): void {
        set({ wsConnected: connected })
        if (connected) {
          get().addNotification({
            title: 'Connected',
            message: 'Real-time connection established',
            type: 'success',
          })
        }
      },
    }),
    {
      name: 'orbis-ui',
      partialize: (state) => ({
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyTheme(state.theme)
        }
      },
    },
  ),
)

export default useUIStore
