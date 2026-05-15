import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, UserRole } from '@/types'
import * as api from '@/services/api'
import wsService from '@/services/websocket'

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isLoading: boolean
  error: string | null

  login(email: string, password: string): Promise<void>
  register(email: string, password: string, fullName: string): Promise<void>
  logout(): void
  setTokens(access: string, refresh: string): void
  setUser(user: User): void
  isAuthenticated(): boolean
  hasRole(role: UserRole): boolean
  clearError(): void
}

const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,
      error: null,

      async login(email: string, password: string): Promise<void> {
        set({ isLoading: true, error: null })
        try {
          const result = await api.login(email, password)
          set({
            accessToken: result.access_token,
            refreshToken: result.refresh_token,
            user: result.user,
            isLoading: false,
            error: null,
          })
          wsService.connect(result.access_token)
        } catch (err: unknown) {
          const message =
            err instanceof Error ? err.message : 'Login failed'
          set({ isLoading: false, error: message, accessToken: null, refreshToken: null, user: null })
          throw err
        }
      },

      async register(email: string, password: string, fullName: string): Promise<void> {
        set({ isLoading: true, error: null })
        try {
          const result = await api.register({ email, password, full_name: fullName })
          set({
            accessToken: result.access_token,
            refreshToken: result.refresh_token,
            user: result.user,
            isLoading: false,
            error: null,
          })
          wsService.connect(result.access_token)
        } catch (err: unknown) {
          const message =
            err instanceof Error ? err.message : 'Registration failed'
          set({ isLoading: false, error: message, accessToken: null, refreshToken: null, user: null })
          throw err
        }
      },

      logout(): void {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isLoading: false,
          error: null,
        })
        wsService.disconnect()
        window.location.href = '/login'
      },

      setTokens(access: string, refresh: string): void {
        set({ accessToken: access, refreshToken: refresh })
      },

      setUser(user: User): void {
        set({ user })
      },

      isAuthenticated(): boolean {
        return get().accessToken !== null && get().user !== null
      },

      hasRole(role: UserRole): boolean {
        const user = get().user
        if (!user) return false
        const hierarchy: UserRole[] = ['viewer', 'operator', 'admin']
        return hierarchy.indexOf(user.role) >= hierarchy.indexOf(role)
      },

      clearError(): void {
        set({ error: null })
      },
    }),
    {
      name: 'orbis-auth',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
      }),
    },
  ),
)

// Wire up API interceptors to avoid circular deps
api.configureApiAuth(
  () => useAuthStore.getState().accessToken,
  () => useAuthStore.getState().logout(),
)

export default useAuthStore
