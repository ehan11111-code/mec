'use client'
import { clsx } from 'clsx'
import { Inbox } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

// Clear placeholder for a not-yet-connected feature: says what it will show and where the data comes
// from — never a fake number, never a blank box.
export function EmptyState({ title, hint, source, icon: Icon = Inbox, className }: {
  title: string; hint?: string; source?: string; icon?: LucideIcon; className?: string
}) {
  return (
    <div className={clsx('flex flex-col items-center justify-center text-center gap-2 py-10 px-6', className)}>
      <span className="inline-flex items-center justify-center h-11 w-11 rounded-full bg-bg-soft text-muted mb-1"><Icon className="h-5 w-5" strokeWidth={1.6} /></span>
      <p className="text-sm font-medium text-text-soft">{title}</p>
      {hint && <p className="text-xs text-muted max-w-sm leading-relaxed">{hint}</p>}
      {source && <p className="text-[11px] text-accent/80 mt-1">{source}</p>}
    </div>
  )
}
