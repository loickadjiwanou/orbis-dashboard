import React, { useState, useEffect, useRef } from 'react'
import { Database, X, Save, Wifi, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

type TestStatus = 'idle' | 'testing' | 'ok' | 'error'

export function BackendUrlModal(): React.ReactElement {
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState(() => localStorage.getItem('orbis-api-url') ?? 'http://localhost:8000')
  const [saved, setSaved] = useState(false)
  const [testStatus, setTestStatus] = useState<TestStatus>('idle')
  const [testMessage, setTestMessage] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input when modal opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setTestStatus('idle')
      setTestMessage('')
      setSaved(false)
    }
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open])

  function handleSave(): void {
    const trimmed = url.trim()
    if (!trimmed) return
    localStorage.setItem('orbis-api-url', trimmed)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleTest(): Promise<void> {
    const trimmed = url.trim()
    if (!trimmed) return
    setTestStatus('testing')
    setTestMessage('')
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 5000)
      const res = await fetch(`${trimmed.replace(/\/$/, '')}/health`, {
        signal: controller.signal,
      })
      clearTimeout(timeout)
      if (res.ok) {
        setTestStatus('ok')
        setTestMessage('Backend reachable')
      } else {
        setTestStatus('error')
        setTestMessage(`HTTP ${res.status}`)
      }
    } catch (err) {
      setTestStatus('error')
      setTestMessage(err instanceof Error && err.name === 'AbortError' ? 'Timeout after 5s' : 'Connection refused')
    }
  }

  return (
    <>
      {/* ── Trigger button — fixed bottom-right ──────────────────── */}
      <button
        onClick={() => setOpen(true)}
        title="Configure backend URL"
        className={cn(
          'fixed bottom-5 right-5 z-50',
          'flex h-10 w-10 items-center justify-center rounded-full',
          'bg-slate-800/80 text-slate-400 shadow-lg backdrop-blur-sm',
          'border border-white/10',
          'hover:bg-slate-700 hover:text-slate-200 hover:scale-105',
          'transition-all duration-150',
        )}
      >
        <Database className="h-4 w-4" />
      </button>

      {/* ── Backdrop ─────────────────────────────────────────────── */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          {/* Dim overlay */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

          {/* ── Modal ────────────────────────────────────────────── */}
          <div className="relative z-10 w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">

            {/* Header */}
            <div className="mb-5 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600/20">
                  <Database className="h-4 w-4 text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-white">Backend URL</h2>
                  <p className="text-xs text-slate-500">API server address</p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 text-slate-500 hover:bg-white/10 hover:text-slate-300 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Input */}
            <div className="mb-4">
              <label htmlFor="backend-url" className="mb-1.5 block text-xs font-medium text-slate-400">
                URL
              </label>
              <input
                ref={inputRef}
                id="backend-url"
                type="url"
                value={url}
                onChange={(e) => { setUrl(e.target.value); setTestStatus('idle') }}
                placeholder="http://localhost:8000"
                className={cn(
                  'w-full rounded-lg border bg-slate-800 px-3 py-2.5 text-sm text-white placeholder:text-slate-600',
                  'focus:outline-none focus:ring-2 focus:ring-indigo-500/60',
                  'transition-colors',
                  testStatus === 'ok' ? 'border-green-500/50' : testStatus === 'error' ? 'border-red-500/50' : 'border-white/10',
                )}
              />
            </div>

            {/* Test result */}
            {testStatus !== 'idle' && (
              <div className={cn(
                'mb-4 flex items-center gap-2 rounded-lg px-3 py-2 text-xs',
                testStatus === 'testing' && 'bg-slate-800 text-slate-400',
                testStatus === 'ok' && 'bg-green-900/30 text-green-400',
                testStatus === 'error' && 'bg-red-900/30 text-red-400',
              )}>
                {testStatus === 'testing' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {testStatus === 'ok' && <CheckCircle2 className="h-3.5 w-3.5" />}
                {testStatus === 'error' && <XCircle className="h-3.5 w-3.5" />}
                <span>
                  {testStatus === 'testing' ? 'Testing connection…' : testMessage}
                </span>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void handleTest()}
                disabled={testStatus === 'testing'}
                className={cn(
                  'flex flex-1 items-center justify-center gap-2 rounded-lg border border-white/10 px-3 py-2.5 text-sm font-medium',
                  'text-slate-300 hover:bg-white/10 hover:text-white',
                  'disabled:cursor-not-allowed disabled:opacity-50',
                  'transition-colors',
                )}
              >
                {testStatus === 'testing' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Wifi className="h-3.5 w-3.5" />
                )}
                Test
              </button>

              <button
                type="button"
                onClick={handleSave}
                className={cn(
                  'flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium',
                  'transition-colors',
                  saved
                    ? 'bg-green-600 text-white'
                    : 'bg-indigo-600 text-white hover:bg-indigo-500',
                )}
              >
                {saved ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                {saved ? 'Saved!' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
