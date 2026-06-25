'use client'
import { useEffect } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'

// Global error boundary for the portal. Any render/runtime error in a page lands here, gets auto-reported
// to the team (WhatsApp via /api/report-error), and shows a recovery action.
export default function PortalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    const path = typeof window !== 'undefined' ? window.location.pathname : ''
    fetch('/api/report-error', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'portal-ui', message: `${error.message}${error.digest ? ` (digest ${error.digest})` : ''}`, context: path }),
      keepalive: true,
    }).catch(() => {})
  }, [error])

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md text-center">
        <span className="inline-flex items-center justify-center h-12 w-12 rounded-soft bg-accent-soft text-accent mb-4"><AlertTriangle className="h-6 w-6" strokeWidth={1.8} /></span>
        <h1 className="text-lg font-semibold text-text">Something went wrong</h1>
        <p className="text-sm text-text-soft mt-2">JARVIS has alerted the team automatically. You can try again.</p>
        <button type="button" onClick={() => reset()} className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-accent text-white px-4 py-2 text-sm font-medium hover:bg-accent-strong transition-colors">
          <RotateCcw className="h-4 w-4" strokeWidth={2} />Try again
        </button>
      </div>
    </div>
  )
}
