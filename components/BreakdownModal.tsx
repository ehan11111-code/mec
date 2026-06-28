'use client'
import { useTranslations } from 'next-intl'
import { clsx } from 'clsx'
import { X, Calculator } from 'lucide-react'
import { fmtSAR, fmtNum } from '@/lib/data/dataset'

// A reusable "how is this number calculated" modal: a formula line + every line item that sums to the
// total. Any StatCard with a `breakdown` opens this when its value is clicked.
export type BreakdownLine = { label: string; value: number; muted?: boolean; strike?: boolean }
export type BreakdownData = { title: string; formula: string; lines: BreakdownLine[]; total: number; money?: boolean; unit?: string; note?: string }

export function BreakdownModal({ data, onClose }: { data: BreakdownData; onClose: () => void }) {
  const t = useTranslations('inventory')
  const fmt = (n: number) => data.money ? fmtSAR(Math.abs(n)) : fmtNum(Math.abs(n)) + (data.unit ? ` ${data.unit}` : '')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md max-h-[85vh] overflow-auto scrollbar-soft rounded-2xl border border-border bg-surface shadow-xl">
        <div className="sticky top-0 flex items-center justify-between gap-3 border-b border-border bg-surface px-5 py-3.5">
          <h3 className="text-sm font-semibold text-text inline-flex items-center gap-2 min-w-0"><Calculator className="h-4 w-4 text-accent shrink-0" strokeWidth={1.8} /><span className="truncate">{data.title}</span></h3>
          <button type="button" onClick={onClose} className="text-muted hover:text-text transition-colors shrink-0"><X className="h-4 w-4" strokeWidth={2} /></button>
        </div>
        <div className="px-5 py-4">
          <p className="text-xs text-text-soft leading-relaxed mb-3">{data.formula}</p>
          <ul className="divide-y divide-border rounded-soft border border-border">
            {data.lines.map((l, i) => (
              <li key={i} className={clsx('flex items-center justify-between gap-3 px-3 py-2 text-xs', l.muted && 'bg-bg-soft/40')}>
                <span className={clsx('truncate', l.muted ? 'text-muted' : 'text-text')} dir="auto">{l.label}</span>
                <span className={clsx('shrink-0 tabular-nums font-medium', l.strike && 'line-through text-muted', l.value < 0 ? 'text-accent' : 'text-text')}>{l.value < 0 ? '−' : ''}{fmt(l.value)}</span>
              </li>
            ))}
            <li className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm font-semibold bg-accent-soft/40">
              <span className="text-text">{t('calc_total')}</span>
              <span className="tabular-nums text-accent">{fmt(data.total)}</span>
            </li>
          </ul>
          {data.note && <p className="mt-3 text-[11px] text-accent leading-relaxed">{data.note}</p>}
          <p className="mt-2 text-[11px] text-muted leading-relaxed">{t('calc_note')}</p>
        </div>
      </div>
    </div>
  )
}
