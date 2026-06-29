'use client'
import { useEffect, useMemo, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { clsx } from 'clsx'
import { motion } from 'framer-motion'
import { ShieldCheck, ClipboardList, ShoppingCart, X, Calculator, History } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { fmtNum, type InventorySku } from '@/lib/data/dataset'
import { InfoTooltip } from './InfoTooltip'

// One on-hand KPI box, switchable between THREE sources via the icons inside it, and CLICKABLE — tapping
// the number opens a full breakdown of exactly how that figure is calculated (every line that sums to it):
//  • jarvis — reconciled on-hand: Σ on-hand of balanced SKUs (excludes unbalanced ones, listed)
//  • tarek  — Tarek's physical المخزون count: Σ counted cartons per item
//  • orders — available: reconciled − units committed to open orders (each order listed)
type Mode = 'jarvis' | 'tarek' | 'orders'
const ICON: Record<Mode, typeof ShieldCheck> = { jarvis: ShieldCheck, tarek: ClipboardList, orders: ShoppingCart }
type OpenOrder = { label: string; units: number }
type Line = { label: string; value: number; muted?: boolean; strike?: boolean }

export function OnHandMetric({ reconciled, physical, excluded, asOf, skus, countRows, capacity, index = 0 }: {
  reconciled: number; physical: number; excluded: number; asOf: string
  skus: InventorySku[]; countRows: { item: string; cartons: number }[]; capacity: number; index?: number
}) {
  const t = useTranslations('inventory'); const locale = useLocale() as 'en' | 'ar'
  const [mode, setMode] = useState<Mode>('jarvis')
  const [open, setOpen] = useState(false)
  const [committed, setCommitted] = useState<number | null>(null)
  const [orders, setOrders] = useState<OpenOrder[]>([])

  useEffect(() => {
    fetch('/api/approvals', { cache: 'no-store' }).then(r => r.json()).then(d => {
      if (Array.isArray(d)) {
        const openO = d.filter((o: any) => ['pending', 'approved'].includes(o.order_status || 'pending'))
        setOrders(openO.map((o: any) => ({ label: o.order_no ? `#${o.order_no}` : (o.client_name || o.salesperson || o.push_name || o.phone || '—'), units: (o.products || []).reduce((a: number, p: any) => a + (Number(p.qty) || 0), 0) })))
        setCommitted(openO.reduce((s: number, o: any) => s + (o.products || []).reduce((a: number, p: any) => a + (Number(p.qty) || 0), 0), 0))
      }
    }).catch(() => setCommitted(0))
  }, [])

  const fmtDate = (d: string) => { try { return new Date(d).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-GB', { day: '2-digit', month: 'short' }) } catch { return d } }
  const ordersVal = Math.max(0, reconciled - (committed || 0))
  // Tarek's raw count exceeding the warehouse capacity is physically impossible — flag it loudly.
  const overCapacity = mode === 'tarek' && physical > capacity
  const data: Record<Mode, { value: number; sub: string }> = {
    jarvis: { value: reconciled, sub: t('onhand_jarvis_sub', { n: excluded }) },
    tarek: { value: physical, sub: overCapacity ? t('onhand_tarek_over', { cap: fmtNum(capacity) }) : t('onhand_tarek_sub', { date: fmtDate(asOf) }) },
    orders: { value: ordersVal, sub: committed == null ? t('onhand_orders_loading') : t('onhand_orders_sub', { units: fmtNum(committed), orders: orders.length }) }
  }
  const cur = data[mode]
  const modes: Mode[] = ['jarvis', 'tarek', 'orders']

  // Lines that make up the current figure (for the breakdown modal).
  const breakdown = useMemo(() => {
    if (mode === 'tarek') {
      const lines: Line[] = [...countRows].sort((a, b) => b.cartons - a.cartons).map(r => ({ label: r.item, value: r.cartons }))
      const formula = t('calc_tarek_formula') + (physical > capacity ? ' ' + t('calc_tarek_over', { cap: fmtNum(capacity) }) : '')
      return { formula, lines, total: physical }
    }
    if (mode === 'jarvis') {
      const inc = skus.filter(s => !s.unreconciled).sort((a, b) => b.onHand - a.onHand)
      const exc = skus.filter(s => s.unreconciled)
      const lines: Line[] = inc.map(s => ({ label: s.item, value: s.onHand }))
      exc.forEach(s => lines.push({ label: s.item, value: s.onHand, strike: true, muted: true }))
      return { formula: t('calc_jarvis_formula', { n: exc.length }), lines, total: reconciled }
    }
    const lines: Line[] = [{ label: t('calc_base_reconciled'), value: reconciled }]
    orders.forEach(o => lines.push({ label: o.label, value: -o.units, muted: true }))
    return { formula: t('calc_orders_formula'), lines, total: ordersVal }
  }, [mode, countRows, skus, orders, physical, reconciled, ordersVal, t])

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: index * 0.04, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-soft border border-accent/30 gradient-highlight bg-surface shadow-soft p-5 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs text-muted leading-tight">{t('kOnHand')}<InfoTooltip id="onHand" /></div>
          <div className="inline-flex rounded-full border border-border bg-surface p-0.5 print:hidden">
            {modes.map(m => {
              const Icon = ICON[m]; const on = mode === m
              return (
                <button key={m} type="button" onClick={() => setMode(m)} title={t(`onhand_${m}`)} aria-label={t(`onhand_${m}`)}
                  className={clsx('inline-flex items-center justify-center h-6 w-6 rounded-full transition-colors', on ? 'bg-accent text-white' : 'text-muted hover:text-text')}>
                  <Icon className="h-3.5 w-3.5" strokeWidth={1.8} />
                </button>
              )
            })}
          </div>
        </div>
        <button type="button" onClick={() => setOpen(true)} title={t('calc_open')}
          className="group flex items-baseline gap-1.5 text-start font-display font-semibold tabular-nums leading-none tracking-tight text-3xl md:text-[2rem] text-accent">
          {fmtNum(cur.value)}
          <Calculator className="h-3.5 w-3.5 text-accent/50 group-hover:text-accent transition-colors print:hidden" strokeWidth={1.8} />
        </button>
        <div className={clsx('text-xs leading-snug', overCapacity ? 'text-accent' : 'text-muted')}><span className={clsx('font-medium', overCapacity ? 'text-accent' : 'text-text-soft')}>{t(`onhand_${mode}`)}</span> · {cur.sub}</div>
        <Link href="/inventory/on-hand" className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-accent/80 hover:text-accent transition-colors print:hidden">
          <History className="h-3 w-3" strokeWidth={1.8} />{t('onhandHistLink')}
        </Link>
      </motion.div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-md max-h-[85vh] overflow-auto scrollbar-soft rounded-2xl border border-border bg-surface shadow-xl">
            <div className="sticky top-0 flex items-center justify-between gap-3 border-b border-border bg-surface px-5 py-3.5">
              <h3 className="text-sm font-semibold text-text inline-flex items-center gap-2"><Calculator className="h-4 w-4 text-accent" strokeWidth={1.8} />{t(`onhand_${mode}`)} · {fmtNum(cur.value)}</h3>
              <button type="button" onClick={() => setOpen(false)} className="text-muted hover:text-text transition-colors"><X className="h-4 w-4" strokeWidth={2} /></button>
            </div>
            <div className="px-5 py-4">
              <p className="text-xs text-text-soft leading-relaxed mb-3">{breakdown.formula}</p>
              <ul className="divide-y divide-border rounded-soft border border-border">
                {breakdown.lines.map((l, i) => (
                  <li key={i} className={clsx('flex items-center justify-between gap-3 px-3 py-2 text-xs', l.muted && 'bg-bg-soft/40')}>
                    <span className={clsx('truncate', l.muted ? 'text-muted' : 'text-text')} dir="auto">{l.label}</span>
                    <span className={clsx('shrink-0 tabular-nums font-medium', l.strike && 'line-through text-muted', l.value < 0 ? 'text-accent' : 'text-text')}>{l.value < 0 ? '−' : ''}{fmtNum(Math.abs(l.value))}</span>
                  </li>
                ))}
                <li className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm font-semibold bg-accent-soft/40">
                  <span className="text-text">{t('calc_total')}</span>
                  <span className="tabular-nums text-accent">{fmtNum(breakdown.total)} {t('cartons')}</span>
                </li>
              </ul>
              <p className="mt-3 text-[11px] text-muted leading-relaxed">{t('calc_note')}</p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
