'use client'
import { useState, useRef, useEffect } from 'react'
import { useLocale } from 'next-intl'
import { Info, FileText, Clock } from 'lucide-react'
import { clsx } from 'clsx'
import { getDef } from '@/lib/info/definitions'
import type { Bi } from '@/lib/info/definitions'

// (i) icon that defines a metric/node, cites its source reference, AND shows when it was last updated.
// Pass an `id` (looked up in the definitions registry) or explicit `def`/`source`/`updated` bilingual
// strings. `updated` may also be a plain string (e.g. a live timestamp) shown verbatim in both locales.
export function InfoTooltip({ id, def, source, updated, className }: { id?: string; def?: Bi; source?: Bi; updated?: Bi | string; className?: string }) {
  const locale = useLocale() as 'en' | 'ar'
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)
  const entry = id ? getDef(id) : undefined
  const d = def ?? entry?.def
  const s = source ?? entry?.source
  const u = updated ?? entry?.updated
  const uText = typeof u === 'string' ? u : u?.[locale]

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  if (!d && !s && !uText) return null

  return (
    <span ref={ref} className={clsx('relative inline-flex align-middle', className)}
      onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button type="button" aria-label="info" onClick={() => setOpen(o => !o)} onFocus={() => setOpen(true)} onBlur={() => setOpen(false)}
        className="inline-flex items-center justify-center h-3.5 w-3.5 rounded-full text-muted hover:text-accent transition-colors print:hidden">
        <Info className="h-3.5 w-3.5" strokeWidth={1.8} />
      </button>
      {open && (
        <span className="absolute z-50 bottom-full mb-1.5 start-1/2 -translate-x-1/2 w-64 max-w-[80vw] rounded-soft border border-border bg-surface shadow-float p-3 text-start animate-fade-in cursor-default">
          {d && <span className="block text-xs text-text leading-relaxed">{d[locale]}</span>}
          {s && (
            <span className="mt-2 flex items-start gap-1.5 border-t border-border pt-2 text-[11px] text-muted leading-relaxed">
              <FileText className="h-3 w-3 mt-0.5 shrink-0 text-accent" strokeWidth={1.8} />
              <span>{s[locale]}</span>
            </span>
          )}
          {uText && (
            <span className="mt-1.5 flex items-start gap-1.5 text-[11px] text-muted leading-relaxed">
              <Clock className="h-3 w-3 mt-0.5 shrink-0 text-accent" strokeWidth={1.8} />
              <span>{uText}</span>
            </span>
          )}
        </span>
      )}
    </span>
  )
}
