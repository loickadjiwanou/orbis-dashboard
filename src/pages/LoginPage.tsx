import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Mail, Lock, AlertCircle, Loader2, Wifi, Monitor, Shield } from 'lucide-react'
import useAuthStore from '@/stores/authStore'
import { OrbisIcon } from '@/components/shared/OrbisIcon'
import { BackendUrlModal } from '@/components/shared/BackendUrlModal'
import { cn } from '@/lib/utils'

const FEATURES = [
  { icon: Monitor, text: 'Monitor all your devices in real time' },
  { icon: Wifi, text: 'Instant alerts and WebSocket live updates' },
  { icon: Shield, text: 'Role-based access for your whole team' },
]

export default function LoginPage(): React.ReactElement {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const login = useAuthStore((s) => s.login)
  const isLoading = useAuthStore((s) => s.isLoading)
  const error = useAuthStore((s) => s.error)
  const clearError = useAuthStore((s) => s.clearError)
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault()
    clearError()
    try {
      await login(email, password)
      navigate('/', { replace: true })
    } catch {
      // error already set in store
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* ── Left panel — brand ──────────────────────────────────── */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-slate-950 p-12 lg:flex lg:w-5/12">
        {/* Gradient orbs */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-32 -top-32 h-80 w-80 rounded-full bg-indigo-600/20 blur-3xl" />
          <div className="absolute -bottom-32 -right-16 h-72 w-72 rounded-full bg-blue-700/25 blur-3xl" />
          <div className="absolute left-1/3 top-1/2 h-56 w-56 -translate-y-1/2 rounded-full bg-indigo-800/20 blur-2xl" />
        </div>

        {/* Dot grid overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              'radial-gradient(circle, #ffffff 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1A237E] shadow-xl shadow-indigo-900/50">
            <OrbisIcon className="h-6 w-6" />
          </div>
          <span className="text-xl font-bold text-white">Orbis</span>
        </div>

        {/* Center copy */}
        <div className="relative z-10">
          <h1 className="text-4xl font-bold leading-tight text-white">
            Device monitoring
            <br />
            <span className="bg-gradient-to-r from-indigo-400 to-blue-400 bg-clip-text text-transparent">
              made simple.
            </span>
          </h1>
          <p className="mt-4 text-base text-slate-400">
            Centralized visibility and control for all your connected devices,
            from a single dashboard.
          </p>

          <ul className="mt-8 space-y-4">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600/20">
                  <Icon className="h-4 w-4 text-indigo-400" />
                </div>
                <span className="text-sm text-slate-300">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <p className="relative z-10 text-xs text-slate-700">
          Orbis © {new Date().getFullYear()} — All rights reserved
        </p>
      </div>

      {/* ── Right panel — form ──────────────────────────────────── */}
      <div className="flex flex-1 flex-col items-center justify-center bg-slate-50 px-6 py-12">
        {/* Mobile logo */}
        <div className="mb-8 flex items-center gap-2.5 lg:hidden">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1A237E] shadow-lg shadow-indigo-900/40">
            <OrbisIcon className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold text-slate-900">Orbis</span>
        </div>

        <div className="w-full max-w-sm">
          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900">Welcome back</h2>
            <p className="mt-1 text-sm text-slate-500">Sign in to your operator account</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Email address
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={cn(
                    'w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 shadow-sm',
                    'placeholder:text-slate-400',
                    'focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20',
                    'transition-colors duration-150',
                  )}
                  placeholder="admin@orbis.local"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={cn(
                    'w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 shadow-sm',
                    'placeholder:text-slate-400',
                    'focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20',
                    'transition-colors duration-150',
                  )}
                  placeholder="••••••••"
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
                'disabled:cursor-not-allowed disabled:opacity-60',
                'transition-all duration-200',
              )}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in…
                </span>
              ) : (
                'Sign in'
              )}
            </button>

            {/* Sign up link */}
            <p className="text-center text-sm text-slate-500">
              Don't have an account?{' '}
              <Link
                to="/signup"
                className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
              >
                Sign up
              </Link>
            </p>
          </form>
        </div>
      </div>

      <BackendUrlModal />
    </div>
  )
}
