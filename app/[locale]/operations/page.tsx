'use client'
import { useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { clsx } from 'clsx'
import { ShoppingCart, ClipboardCheck, CheckCircle2, AlertTriangle, Wallet, Warehouse, PackageSearch, Printer } from 'lucide-react'
import { PageShell } from '@/components/PageShell'
import { DisplayHeading } from '@/components/DisplayHeading'
import { Eyebrow } from '@/components/Eyebrow'
import { Panel } from '@/components/Panel'
import { NoteCallout } from '@/components/NoteCallout'
import { StatusBadge } from '@/components/StatusBadge'
import { ConcernsBar } from '@/components/ConcernsBar'
import { ClientLink, ProductLink } from '@/components/EntityLink'
import { printReport } from '@/lib/export/exporters'
import { operationsSnapshot, categoryLabel, fmtSAR, fmtNum } from '@/lib/data/dataset'

export default function OperationsPage() {
  const tNav = useTranslations('nav'); const t = useTranslations('ops'); const locale = useLocale() as 'en' | 'ar'
  const snap = operationsSnapshot()
  const [pendingApprovals, setPendingApprovals] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/approvals').then(r => r.json()).then(d => {
      if (Array.isArray(d)) setPendingApprovals(d.filter((o: any) => (o.order_status || 'pending') === 'pending').length)
    }).catch(() => setPendingApprovals(0))
  }, [])

  const fmtDate = (d: string) => { if (!d) return '—'; try { return new Date(d).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-GB', { day: '2-digit', month: 'short' }) } catch { return d } }
  const w = snap.warehouse
  const turnTone = w.turnover >= 3 ? 'text-accent' : w.turnover >= 1.5 ? 'text-warn' : 'text-success'

  const tiles = [
    { icon: ShoppingCart, key: 'today', val: String(snap.todays.count), sub: fmtSAR(snap.todays.value), accent: true },
    { icon: ClipboardCheck, key: 'approvals', val: pendingApprovals == null ? '…' : String(pendingApprovals), sub: t('liveWhatsapp'), accent: (pendingApprovals ?? 0) > 0 },
    { icon: CheckCircle2, key: 'completed', val: String(snap.completed.count), sub: fmtSAR(snap.completed.value) },
    { icon: AlertTriangle, key: 'delayed', val: String(snap.delayed.count), sub: fmtSAR(snap.delayed.value), accent: snap.delayed.count > 0 },
    { icon: Wallet, key: 'payments', val: fmtSAR(snap.payments.due), sub: t('receivable') }
  ]

  return (
    <PageShell requires="dashboard" breadcrumbs={[{ label: tNav('operations') }, { label: t('headline') }]}>
      <div data-print-header className="hidden items-center justify-between mb-6 pb-4 border-b">
        <div><div className="text-lg font-bold">MEC · {t('headline')}</div><div className="text-xs">{t('printSub', { date: fmtDate(snap.latest) })}</div></div>
        <div className="text-xs">Jarvis AI</div>
      </div>

      <ConcernsBar />

      <header className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <Eyebrow accent>{t('eyebrow')}</Eyebrow>
          <DisplayHeading size="lg" className="mt-3" locale={locale}>{t('headline')}</DisplayHeading>
          <p className="text-base text-text-soft mt-3 leading-relaxed">{t('subline', { date: fmtDate(snap.latest) })}</p>
        </div>
        <button type="button" onClick={printReport} className="print:hidden inline-flex items-center gap-1.5 rounded-full border border-border bg-surface hover:bg-surface-elev px-3.5 py-2 text-xs font-medium text-text-soft transition-colors">
          <Printer className="h-3.5 w-3.5" strokeWidth={1.8} />{t('print')}
        </button>
      </header>

      {/* status tiles */}
      <section className="mb-6 grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-5">
        {tiles.map((tile, i) => {
          const Icon = tile.icon
          return (
            <div key={i} className={clsx('rounded-soft border bg-surface shadow-soft p-4 flex flex-col gap-2', tile.accent ? 'border-accent/30 gradient-highlight' : 'border-border')}>
              <span className={clsx('inline-flex items-center justify-center h-8 w-8 rounded-soft', tile.accent ? 'bg-accent/15 text-accent' : 'bg-bg-soft text-muted')}><Icon className="h-4 w-4" strokeWidth={1.7} /></span>
              <div className={clsx('font-display font-semibold tabular-nums text-2xl leading-none', tile.accent ? 'text-accent' : 'text-text')}>{tile.val}</div>
              <div className="text-xs text-text-soft leading-tight">{t(`tile_${tile.key}`)}</div>
              <div className="text-[11px] text-muted tabular-nums">{tile.sub}</div>
            </div>
          )
        })}
      </section>

      {/* warehouse + stock watch */}
      <section className="mb-6 grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6">
        <Panel title={<span className="inline-flex items-center gap-2"><Warehouse className="h-4 w-4 text-accent" strokeWidth={1.8} />{t('warehouse')}</span>} subtitle={t('warehouseSub')}>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div><div className="text-[11px] text-muted">{t('onHand')}</div><div className={clsx('text-lg font-display font-semibold tabular-nums mt-0.5', w.utilization >= 100 ? 'text-accent' : 'text-text')}>{fmtNum(w.onHand)}</div><div className="text-[10px] text-muted">{w.utilization}% {t('ofCapacity')}</div></div>
            <div><div className="text-[11px] text-muted">{t('throughput')}</div><div className="text-lg font-display font-semibold tabular-nums text-text mt-0.5">{fmtNum(w.throughput)}</div><div className="text-[10px] text-muted">{w.turnover}× {t('turnover')}</div></div>
            <div><div className="text-[11px] text-muted">{t('reorderSkus')}</div><div className={clsx('text-lg font-display font-semibold tabular-nums mt-0.5', w.reorder > 0 ? 'text-warn' : 'text-success')}>{w.reorder}</div><div className="text-[10px] text-muted">{w.skus} {t('skus')}</div></div>
          </div>
          <div className="h-2.5 w-full rounded-full bg-bg-soft overflow-hidden flex">
            {Array.from({ length: Math.min(6, Math.ceil(w.turnover)) }).map((_, i) => (
              <div key={i} className={clsx('h-full flex-1 me-0.5 rounded-full', i < Math.floor(w.turnover) ? 'bg-accent' : 'bg-accent/40')} />
            ))}
          </div>
          <NoteCallout className="mt-4" title={t('warehouseNoteTitle')}>{t('warehouseNote')}</NoteCallout>
        </Panel>

        <Panel bodyClassName="px-0 pb-0" title={<span className="inline-flex items-center gap-2"><PackageSearch className="h-4 w-4 text-accent" strokeWidth={1.8} />{t('stockWatch')}</span>} subtitle={t('stockWatchSub')}>
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-muted border-b border-border">
              <th className="text-start font-medium px-5 md:px-6 py-2.5">{t('product')}</th>
              <th className="text-start font-medium px-4 py-2.5 hidden sm:table-cell">{t('category')}</th>
              <th className="text-end font-medium px-5 md:px-6 py-2.5">{t('demand')}</th>
            </tr></thead>
            <tbody className="divide-y divide-border">
              {snap.movers.map((m, i) => (
                <tr key={i} className="hover:bg-surface-elev transition-colors">
                  <td className="px-5 md:px-6 py-2.5 text-text max-w-[260px] truncate"><ProductLink item={m.item} /></td>
                  <td className="px-4 py-2.5 hidden sm:table-cell"><span className="inline-flex items-center rounded-full bg-bg-soft px-2 py-0.5 text-[11px] text-text-soft">{categoryLabel(m.category, locale)}</span></td>
                  <td className="px-5 md:px-6 py-2.5 text-end tabular-nums text-text-soft">{fmtNum(m.qty)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </section>

      {/* delayed orders + payments due */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6">
        <Panel bodyClassName="px-0 pb-0" title={<span className="inline-flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-warn" strokeWidth={1.8} />{t('delayedOrders')}</span>} subtitle={t('delayedSub', { n: snap.delayed.count })}>
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-muted border-b border-border">
              <th className="text-start font-medium px-5 md:px-6 py-2.5">{t('order')}</th>
              <th className="text-start font-medium px-4 py-2.5">{t('client')}</th>
              <th className="text-end font-medium px-4 py-2.5">{t('amount')}</th>
              <th className="text-end font-medium px-5 md:px-6 py-2.5 hidden sm:table-cell">{t('due')}</th>
            </tr></thead>
            <tbody className="divide-y divide-border">
              {snap.delayedList.map(o => (
                <tr key={o.id} className="hover:bg-surface-elev transition-colors">
                  <td className="px-5 md:px-6 py-2.5 text-text tabular-nums whitespace-nowrap">{o.number}</td>
                  <td className="px-4 py-2.5 text-text-soft max-w-[160px] truncate"><ClientLink name={o.clientName} id={o.clientId || undefined} /></td>
                  <td className="px-4 py-2.5 text-end tabular-nums text-text">{fmtSAR(o.totalAmount)}</td>
                  <td className="px-5 md:px-6 py-2.5 text-end tabular-nums text-muted hidden sm:table-cell">{fmtDate(o.dueDate)}</td>
                </tr>
              ))}
              {snap.delayedList.length === 0 && <tr><td colSpan={4} className="px-6 py-8 text-center text-sm text-muted">{t('noDelayed')}</td></tr>}
            </tbody>
          </table>
        </Panel>

        <Panel bodyClassName="px-0 pb-0" title={<span className="inline-flex items-center gap-2"><Wallet className="h-4 w-4 text-accent" strokeWidth={1.8} />{t('paymentsDue')}</span>} subtitle={t('paymentsSub')}>
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-muted border-b border-border">
              <th className="text-start font-medium px-5 md:px-6 py-2.5">{t('client')}</th>
              <th className="text-end font-medium px-4 py-2.5 hidden sm:table-cell">{t('invoices')}</th>
              <th className="text-end font-medium px-5 md:px-6 py-2.5">{t('outstanding')}</th>
            </tr></thead>
            <tbody className="divide-y divide-border">
              {snap.payments.debtors.map((d, i) => (
                <tr key={i} className="hover:bg-surface-elev transition-colors">
                  <td className="px-5 md:px-6 py-2.5 text-text max-w-[200px] truncate"><ClientLink name={d.name} /></td>
                  <td className="px-4 py-2.5 text-end tabular-nums text-text-soft hidden sm:table-cell">{d.invoices}</td>
                  <td className="px-5 md:px-6 py-2.5 text-end tabular-nums text-warn font-medium">{fmtSAR(d.outstanding)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </section>
    </PageShell>
  )
}
