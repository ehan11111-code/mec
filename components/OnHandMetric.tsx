'use client'
import { useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { clsx } from 'clsx'
import { motion } from 'framer-motion'
import { ShieldCheck, ClipboardList, ShoppingCart } from 'lucide-react'
import { fmtNum } from '@/lib/data/dataset'
import { InfoTooltip } from './InfoTooltip'

// One on-hand KPI box that the user switches between THREE sources via the icons inside it:
//  • jarvis  — reconciled on-hand (ledger, excludes unbalanced SKUs) = the system's best estimate
//  • tarek   — the physical المخزون count Tarek sends (raw truth, as of the last count)
//  • orders  — reconciled on-hand minus units committed to open orders = what's actually available
// The orders figure pulls live open orders from /api/approvals so it updates as orders come and go.
type Mode = 'jarvis' | 'tarek' | 'orders'
const ICON: Record<Mode, typeof ShieldCheck> = { jarvis: ShieldCheck, tarek: ClipboardList, orders: ShoppingCart }

export function OnHandMetric({ reconciled, physical, excluded, asOf, index = 0 }: {
  reconciled: number; physical: number; excluded: number; asOf: string; index?: number
}) {
  const t = useTranslations('inventory'); const locale = useLocale() as 'en' | 'ar'
  const [mode, setMode] = useState<Mode>('jarvis')
  const [committed, setCommitted] = useState<number | null>(null)
  const [openOrders, setOpenOrders] = useState(0)

  useEffect(() => {
    fetch('/api/approvals', { cache: 'no-store' }).then(r => r.json()).then(d => {
      if (Array.isArray(d)) {
        const open = d.filter((o: any) => ['pending', 'approved'].includes(o.order_status || 'pending'))
        setOpenOrders(open.length)
        setCommitted(open.reduce((s: number, o: any) => s + (o.products || []).reduce((a: number, p: any) => a + (Number(p.qty) || 0), 0), 0))
      }
    }).catch(() => setCommitted(0))
  }, [])

  const fmtDate = (d: string) => { try { return new Date(d).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-GB', { day: '2-digit', month: 'short' }) } catch { return d } }
  const ordersVal = Math.max(0, reconciled - (committed || 0))
  const data: Record<Mode, { value: number; sub: string }> = {
    jarvis: { value: reconciled, sub: t('onhand_jarvis_sub', { n: excluded }) },
    tarek: { value: physical, sub: t('onhand_tarek_sub', { date: fmtDate(asOf) }) },
    orders: { value: ordersVal, sub: committed == null ? t('onhand_orders_loading') : t('onhand_orders_sub', { units: fmtNum(committed), orders: openOrders }) }
  }
  const cur = data[mode]
  const modes: Mode[] = ['jarvis', 'tarek', 'orders']

  return (
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
      <div className="font-display font-semibold tabular-nums leading-none tracking-tight text-3xl md:text-[2rem] text-accent">{fmtNum(cur.value)}</div>
      <div className="text-xs text-muted leading-snug"><span className="text-text-soft font-medium">{t(`onhand_${mode}`)}</span> · {cur.sub}</div>
    </motion.div>
  )
}
