import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AppShell } from '@/components/layout/AppShell'
import useAuthStore from '@/stores/authStore'
import useUIStore from '@/stores/uiStore'
import { useWebSocket } from '@/hooks/useWebSocket'
import * as api from '@/services/api'

// ─── Page imports ─────────────────────────────────────────────────────────────
import LoginPage from '@/pages/LoginPage'
import SignUpPage from '@/pages/SignUpPage'
import OnboardingPage from '@/pages/OnboardingPage'
import DashboardPage from '@/pages/DashboardPage'
import DevicesPage from '@/pages/DevicesPage'
import DeviceDetailPage from '@/pages/DeviceDetailPage'
import GroupsPage from '@/pages/GroupsPage'
import GroupDetailPage from '@/pages/GroupDetailPage'
import LogsPage from '@/pages/LogsPage'
import AgentLogsPage from '@/pages/AgentLogsPage'
import CommandsPage from '@/pages/CommandsPage'
import ActionsPage from '@/pages/ActionsPage'
import InstructionsPage from '@/pages/InstructionsPage'
import AlertsPage from '@/pages/AlertsPage'
import UpdatesPage from '@/pages/UpdatesPage'
import AuditPage from '@/pages/AuditPage'
import SettingsPage from '@/pages/SettingsPage'

// ─── Error Boundary ───────────────────────────────────────────────────────────

interface ErrorBoundaryState {
  error: Error | null
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('[ErrorBoundary] Uncaught error:', error, info)
  }

  render(): React.ReactNode {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
          <div className="w-full max-w-md rounded-xl border border-red-500/30 bg-red-950/40 p-6 text-center">
            <div className="mb-3 text-2xl">⚠️</div>
            <h2 className="mb-2 text-lg font-semibold text-red-300">Something went wrong</h2>
            <p className="mb-4 text-sm text-red-400/80">{this.state.error.message}</p>
            <pre className="mb-4 max-h-40 overflow-auto rounded bg-black/40 p-3 text-left text-xs text-red-300/70">
              {this.state.error.stack}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
            >
              Reload page
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// ─── Setup guard ─────────────────────────────────────────────────────────────
// Checks /auth/setup once. If no admin exists, redirects everything to /setup.

function SetupGuard({ children }: { children: React.ReactNode }): React.ReactElement {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['setup-check'],
    queryFn: api.checkSetup,
    staleTime: Infinity,
    retry: false,
  })

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          <p className="text-sm text-slate-500">Connecting to backend…</p>
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20">
            <span className="text-xl">⚠</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Cannot reach the backend</p>
            <p className="mt-1 text-xs text-slate-500">Make sure the backend is running on http://localhost:8000</p>
          </div>
          <button
            onClick={() => void refetch()}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  // Setup required and user not yet authenticated → force onboarding
  if (data?.setup_required && !isAuthenticated()) {
    return <Navigate to="/setup" replace />
  }

  return <>{children}</>
}

// ─── Protected Route ──────────────────────────────────────────────────────────

function ProtectedRoute({ children }: { children: React.ReactNode }): React.ReactElement {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}

// ─── Layout wrapper for protected pages ──────────────────────────────────────

function ProtectedLayout({ children }: { children: React.ReactNode }): React.ReactElement {
  useWebSocket()
  return (
    <ProtectedRoute>
      <AppShell>{children}</AppShell>
    </ProtectedRoute>
  )
}

// ─── Theme bootstrap ─────────────────────────────────────────────────────────

function ThemeBootstrap(): null {
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
      const mql = window.matchMedia('(prefers-color-scheme: dark)')
      root.classList.toggle('dark', mql.matches)
    }
  }, [theme])

  return null
}

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App(): React.ReactElement {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ThemeBootstrap />
        <Routes>
          {/* Onboarding — public, no guard needed */}
          <Route path="/setup" element={<OnboardingPage />} />

          {/* Login — guarded: redirect to /setup if no admin exists */}
          <Route
            path="/login"
            element={
              <SetupGuard>
                <LoginPage />
              </SetupGuard>
            }
          />

          {/* Signup — guarded: redirect to /setup if no admin exists */}
          <Route
            path="/signup"
            element={
              <SetupGuard>
                <SignUpPage />
              </SetupGuard>
            }
          />

          {/* Protected routes — guarded */}
          <Route
            path="/"
            element={
              <SetupGuard>
                <ProtectedLayout>
                  <DashboardPage />
                </ProtectedLayout>
              </SetupGuard>
            }
          />
          <Route
            path="/devices"
            element={
              <SetupGuard>
                <ProtectedLayout>
                  <DevicesPage />
                </ProtectedLayout>
              </SetupGuard>
            }
          />
          <Route
            path="/devices/:id"
            element={
              <SetupGuard>
                <ProtectedLayout>
                  <DeviceDetailPage />
                </ProtectedLayout>
              </SetupGuard>
            }
          />
          <Route
            path="/groups"
            element={
              <SetupGuard>
                <ProtectedLayout>
                  <GroupsPage />
                </ProtectedLayout>
              </SetupGuard>
            }
          />
          <Route
            path="/groups/:id"
            element={
              <SetupGuard>
                <ProtectedLayout>
                  <GroupDetailPage />
                </ProtectedLayout>
              </SetupGuard>
            }
          />
          <Route
            path="/logs"
            element={
              <SetupGuard>
                <ProtectedLayout>
                  <LogsPage />
                </ProtectedLayout>
              </SetupGuard>
            }
          />
          <Route
            path="/agent-logs"
            element={
              <SetupGuard>
                <ProtectedLayout>
                  <AgentLogsPage />
                </ProtectedLayout>
              </SetupGuard>
            }
          />
          <Route
            path="/commands"
            element={
              <SetupGuard>
                <ProtectedLayout>
                  <CommandsPage />
                </ProtectedLayout>
              </SetupGuard>
            }
          />
          <Route
            path="/actions"
            element={
              <SetupGuard>
                <ProtectedLayout>
                  <ActionsPage />
                </ProtectedLayout>
              </SetupGuard>
            }
          />
          <Route
            path="/instructions"
            element={
              <SetupGuard>
                <ProtectedLayout>
                  <InstructionsPage />
                </ProtectedLayout>
              </SetupGuard>
            }
          />
          <Route
            path="/alerts"
            element={
              <SetupGuard>
                <ProtectedLayout>
                  <AlertsPage />
                </ProtectedLayout>
              </SetupGuard>
            }
          />
          <Route
            path="/updates"
            element={
              <SetupGuard>
                <ProtectedLayout>
                  <UpdatesPage />
                </ProtectedLayout>
              </SetupGuard>
            }
          />
          <Route
            path="/audit"
            element={
              <SetupGuard>
                <ProtectedLayout>
                  <AuditPage />
                </ProtectedLayout>
              </SetupGuard>
            }
          />
          <Route
            path="/settings"
            element={
              <SetupGuard>
                <ProtectedLayout>
                  <SettingsPage />
                </ProtectedLayout>
              </SetupGuard>
            }
          />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
