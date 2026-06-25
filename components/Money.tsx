'use client'
import { useState } from 'react'
import { clsx } from 'clsx'
import { useLocale } from 'next-intl'

// Saudi VAT. Every money figure can be shown VAT-inclusive or VAT-exclusive via a small tappable chip.
export const VAT_RATE = 0.15

// A money amount with a VAT toggle chip. `base` says whether the passed number already includes VAT:
//   base="gross" (default) → the number is VAT-inclusive; tap shows it WITHOUT VAT, tap again restores.
//   base="net"             → the number excludes VAT;     tap shows it WITH VAT (+15%), tap again restores.
// State is per-number (each chip toggles its own figure). Used across KPIs, tables and totals.
export function Money({
  amount, base = 'gross', currency = 'SAR', className, valueClassName,
}: {
  amount: number; base?: 'gross' | 'net'; currency?: string; className?: string; valueClassName?: string
}) {
  const locale = useLocale() as 'en' | 'ar'
  const [incl, setIncl] = useState(base === 'gross') // true = show VAT-inclusive
  const net = base === 'gross' ? amount / (1 + VAT_RATE) : amount
  const gross = base === 'gross' ? amount : amount * (1 + VAT_RATE)
  const shown = incl ? gross : net
  const fmt = `${currency} ${Math.round(shown).toLocaleString('en-US')}`
  const tip = locale === 'ar'
    ? (incl ? 'شامل الضريبة ١٥٪ — اضغط لإظهار بدون ضريبة' : 'بدون الضريبة — اضغط لإظهار شامل ١٥٪')
    : (incl ? 'Incl. VAT 15% — tap for ex-VAT' : 'Ex-VAT — tap for incl. VAT 15%')
  const tag = locale === 'ar' ? (incl ? 'شامل' : 'صافي') : (incl ? '+VAT' : 'net')

  return (
    <span className={clsx('inline-flex items-baseline gap-1 whitespace-nowrap', className)}>
      <span className={valueClassName}>{fmt}</span>
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIncl(v => !v) }}
        title={tip}
        aria-label={tip}
        className={clsx(
          'shrink-0 select-none rounded px-1 py-px text-[9px] font-semibold leading-none align-super transition-colors print:hidden',
          incl ? 'bg-accent-soft text-accent hover:bg-accent/20' : 'bg-bg-soft text-muted hover:bg-border'
        )}
      >
        {tag}
      </button>
    </span>
  )
}
