'use client'
import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { useLocale } from 'next-intl'
import { clsx } from 'clsx'
export function RefreshAction({ onRefresh, className, variant = 'icon' }: { onRefresh?: () => void; className?: string; variant?: 'icon' | 'pill' }) {
  const locale = useLocale() as 'en' | 'ar'
  const [spinning, setSpinning] = useState(false)
  const [lastSync, setLastSync] = useState<string | null>(null)
  const label = locale === 'ar' ? 'تحديث' : 'Refresh'; const justNow = locale === 'ar' ? 'محدّث الآن' : 'Just refreshed'
  const handle = () => {
    if (spinning) return; setSpinning(true); try { onRefresh?.() } catch {}
    window.setTimeout(() => { setSpinning(false); setLastSync(justNow); window.setTimeout(() => setLastSync(null), 1800) }, 650)
  }
  if (variant === 'pill') return (
    <button type="button" onClick={handle} disabled={spinning} aria-label={label} title={label}
      className={clsx('inline-flex items-center gap-1.5 rounded-full border border-border bg-surface hover:bg-surface-elev text-text-soft hover:text-text px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-60', className)}>
      <RefreshCw className={clsx('h-3.5 w-3.5', spinning && 'animate-spin')} strokeWidth={1.7} aria-hidden />
      <span>{lastSync ?? label}</span>
    </button>
  )
  return (
    <button type="button" onClick={handle} disabled={spinning} aria-label={label} title={lastSync ?? label}
      className={clsx('inline-flex items-center justify-center h-8 w-8 rounded-full text-muted hover:text-accent hover:bg-bg-soft transition-colors disabled:opacity-60', className)}>
      <RefreshCw className={clsx('h-3.5 w-3.5', spinning && 'animate-spin')} strokeWidth={1.7} aria-hidden />
      <span className="sr-only">{label}</span>
    </button>
  )
}
