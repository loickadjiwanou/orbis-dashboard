import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Activity, Mail, Lock, User, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import * as api from '@/services/api'
import useAuthStore from '@/stores/authStore'
import { cn } from '@/lib/utils'

const STEPS = ['Create admin account', 'Done']

export default function OnboardingPage(): React.ReactElement {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const setTokens = useAuthStore((s) => s.setTokens)
  const setUser = useAuthStore((s) => s.setUser)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault()
    setError(null)

    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setIsLoading(true)
    try {
      const result = await api.initialSetup({ email, password, full_name: fullName })
      setTokens(result.access_token, result.refresh_token)
      setUser(result.user)
      // Invalidate the setup-check cache so SetupGuard re-fetches fresh data on redirect
      void queryClient.invalidateQueries({ queryKey: ['setup-check'] })
      setDone(true)
      setTimeout(() => navigate('/', { replace: true }), 1500)
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Setup failed. Please try again.'
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* ── Left panel ─────────────────────────────────────────── */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-slate-950 p-12 lg:flex lg:w-5/12">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-32 -top-32 h-80 w-80 rounded-full bg-indigo-600/20 blur-3xl" />
          <div className="absolute -bottom-32 -right-16 h-72 w-72 rounded-full bg-blue-700/25 blur-3xl" />
        </div>
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 shadow-xl shadow-indigo-500/40">
            <Activity className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white">Orbis</span>
        </div>

        {/* Steps */}
        <div className="relative z-10">
          <p className="mb-6 text-xs font-semibold uppercase tracking-widest text-slate-500">
            Initial setup
          </p>
          <ol className="space-y-4">
            {STEPS.map((step, i) => {
              const isActive = i === 0 && !done
              const isComplete = i === 0 && done || i === 1 && done
              return (
                <li key={step} className="flex items-center gap-3">
                  <div
                    className={cn(
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition-colors',
                      isComplete
                        ? 'border-emerald-500 bg-emerald-500 text-white'
                        : isActive
                          ? 'border-indigo-500 bg-indigo-600 text-white'
                          : 'border-slate-700 bg-slate-900 text-slate-500',
                    )}
                  >
                    {isComplete ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                  </div>
                  <span
                    className={cn(
                      'text-sm font-medium',
                      isActive ? 'text-white' : isComplete ? 'text-emerald-400' : 'text-slate-600',
                    )}
                  >
                    {step}
                  </span>
                </li>
              )
            })}
          </ol>

          <div className="mt-10 rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs text-slate-400">
              This account will have full admin privileges. You can add more operators
              from Settings after setup.
            </p>
          </div>
        </div>

        <p className="relative z-10 text-xs text-slate-700">
          Orbis © {new Date().getFullYear()}
        </p>
      </div>

      {/* ── Right panel — form ──────────────────────────────────── */}
      <div className="flex flex-1 flex-col items-center justify-center bg-slate-50 px-6 py-12">
        {/* Mobile logo */}
        <div className="mb-8 flex items-center gap-2.5 lg:hidden">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 shadow-lg">
            <Activity className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-bold text-slate-900">Orbis</span>
        </div>

        <div className="w-full max-w-sm">
          {done ? (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Setup complete!</h2>
                <p className="mt-1 text-sm text-slate-500">Redirecting to dashboard…</p>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-slate-900">Create admin account</h2>
                <p className="mt-1 text-sm text-slate-500">
                  No administrator found. Set up yours to get started.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Full name */}
                <div>
                  <label htmlFor="fullName" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Full name
                  </label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      id="fullName"
                      type="text"
                      required
                      autoComplete="name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Alice Martin"
                      className={cn(
                        'w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 shadow-sm',
                        'placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors',
                      )}
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      id="email"
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@orbis.local"
                      className={cn(
                        'w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 shadow-sm',
                        'placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors',
                      )}
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Password <span className="text-slate-400">(min. 8 characters)</span>
                  </label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      id="password"
                      type="password"
                      required
                      minLength={8}
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className={cn(
                        'w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 shadow-sm',
                        'placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors',
                      )}
                    />
                  </div>
                </div>

                {/* Confirm password */}
                <div>
                  <label htmlFor="confirm" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Confirm password
                  </label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      id="confirm"
                      type="password"
                      required
                      autoComplete="new-password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      placeholder="••••••••"
                      className={cn(
                        'w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 shadow-sm',
                        'placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors',
                      )}
                    />
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className={cn(
                    'mt-1 w-full rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 px-4 py-2.5',
                    'text-sm font-semibold text-white shadow-md shadow-indigo-500/25',
                    'hover:from-indigo-500 hover:to-blue-500',
                    'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-50',
                    'disabled:cursor-not-allowed disabled:opacity-60 transition-all duration-200',
                  )}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating account…
                    </span>
                  ) : (
                    'Create admin account'
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
