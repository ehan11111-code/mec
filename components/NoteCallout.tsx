'use client'
import { clsx } from 'clsx'
import { Info, Lightbulb, AlertTriangle } from 'lucide-react'

// Accent-tinted callout that makes important notes / requirements stand out (replaces plain muted text).
const TONE = {
  info: { icon: Info, cls: 'border-accent/30 bg-accent-soft text-text', ic: 'text-accent' },
  tip: { icon: Lightbulb, cls: 'border-success/30 bg-success-soft text-text', ic: 'text-success' },
  warn: { icon: AlertTriangle, cls: 'border-warn/40 bg-warn-soft text-text', ic: 'text-warn' }
}
export function NoteCallout({ children, title, tone = 'info', className }: {
  children: React.ReactNode; title?: string; tone?: 'info' | 'tip' | 'warn'; className?: string
}) {
  const t = TONE[tone]; const Icon = t.icon
  return (
    <div className={clsx('flex items-start gap-2.5 rounded-soft border px-4 py-3', t.cls, className)}>
      <Icon className={clsx('h-4 w-4 mt-0.5 shrink-0', t.ic)} strokeWidth={1.8} />
      <div className="min-w-0 text-xs leading-relaxed">
        {title && <span className="block font-semibold text-text mb-0.5">{title}</span>}
        <span className="text-text-soft">{children}</span>
      </div>
    </div>
  )
}
