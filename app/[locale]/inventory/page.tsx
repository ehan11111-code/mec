'use client'
import { useEffect, useMemo, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { clsx } from 'clsx'
import { Search, Boxes, Printer, AlertTriangle } from 'lucide-react'
import { PageShell } from '@/components/PageShell'
import { DisplayHeading } from '@/components/DisplayHeading'
import { Eyebrow } from '@/components/Eyebrow'
import { StatCard } from '@/components/StatCard'
import { Panel } from '@/components/Panel'
import { NoteCallout } from '@/components/NoteCallout'
import { JarvisNotes, type JarvisNote } from '@/components/JarvisNotes'
import { printReport } from '@/lib/export/exporters'
import { fmtDate } from '@/lib/format/datetime'
import { getInventory, warehouseStock, categoryLabel, fmtSAR, fmtNum, type InventorySku, type ExpiryStatus } from '@/lib/data/dataset'
import { getInventoryCount } from '@/lib/data/inventory-count'

const EXP_TONE: Record<ExpiryStatus, string> = {
  green: 'bg-success-soft text-success', yellow: 'bg-warn-soft text-warn', red: 'bg-accent-soft text-accent', unknown: 'bg-bg-soft text-muted'
}

export default function InventoryPage() {
  const tNav = useTranslations('nav'); const t = useTranslations('inventory'); const locale = useLocale() as 'en' | 'ar'
  const [now, setNow] = useState('2026-06-30')
  useEffect(() => { setNow(new Date().toISOString()) }, [])
  const inv = useMemo(() => getInventory(now), [now])
  const ws = useMemo(() => warehouseStock(now), [now])
  const cnt = useMemo(() => getInventoryCount(), [])
  const fmtCountDate = (d: string) => { try { return new Date(d).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-GB', { day: '2-digit', month: 'short' }) } catch { return d } }

  const cats = useMemo(() => [...new Set(inv.map(r => r.category))], [inv])
  const [q, setQ] = useState(''); const [cat, setCat] = useState(''); const [view, setView] = useState<'all' | 'reorder' | 'expiring' | 'gap'>('all')
  const flagged = (r: InventorySku) => r.unreconciled || r.dataGap
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    return inv.filter(r =>
      (!s || r.item.toLowerCase().includes(s) || (r.barcode && r.barcode.includes(s))) &&
      (!cat || r.category === cat) &&
      (view === 'all' || (view === 'reorder' && r.needsReorder) || (view === 'expiring' && (r.expiry === 'red' || r.expiry === 'yellow')) || (view === 'gap' && flagged(r))))
  }, [q, cat, view, inv])

  // The reconciled on-hand of the currently-shown rows — equals the headline (3,483) when unfiltered.
  // Flagged (unreconciled) rows are excluded so the table column always adds up to this figure.
  const shownReconciled = useMemo(() => rows.filter(r => !r.unreconciled).reduce((a, r) => a + r.onHand, 0), [rows])
  const shownExcluded = useMemo(() => rows.filter(r => r.unreconciled).length, [rows])

  const utilTone = ws.utilization >= 100 ? 'bg-accent' : ws.utilization >= 80 ? 'bg-warn' : 'bg-success'
  const selCls = 'rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-text focus:border-accent transition-colors cursor-pointer'
  const views: { v: typeof view; n: number }[] = [
    { v: 'all', n: inv.length }, { v: 'reorder', n: ws.reorder }, { v: 'expiring', n: ws.red + ws.yellow }, { v: 'gap', n: ws.unreconciled + ws.dataGaps }
  ]

  return (
    <PageShell requires="orders" breadcrumbs={[{ label: tNav('operations') }, { label: tNav('inventory') }]}>
      <div data-print-header className="hidden items-center justify-between mb-6 pb-4 border-b">
        <div><div className="text-lg font-bold">MEC · {t('headline')}</div><div className="text-xs">{t('printSub')}</div></div>
        <div className="text-xs">Jarvis AI</div>
      </div>

      <header className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <Eyebrow accent>{t('eyebrow')}</Eyebrow>
          <DisplayHeading size="lg" className="mt-3" locale={locale}>{t('headline')}</DisplayHeading>
          <p className="text-base text-text-soft mt-3 leading-relaxed">{t('subline')}</p>
        </div>
        <button type="button" onClick={printReport} className="print:hidden inline-flex items-center gap-1.5 rounded-full border border-border bg-surface hover:bg-surface-elev px-3.5 py-2 text-xs font-medium text-text-soft transition-colors">
          <Printer className="h-3.5 w-3.5" strokeWidth={1.8} />{t('print')}
        </button>
      </header>

      <section className="mb-6 grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard label={t('kSkus')} value={String(ws.skus)} index={0} accent />
        <StatCard label={t('kOnHand')} value={fmtNum(ws.onHand)} delta={t('reconciledNote')} index={1} />
        <StatCard label={t('kValue')} value={fmtSAR(ws.value)} index={2} />
        <StatCard label={t('kReorder')} value={String(ws.reorder)} delta={`${ws.red + ws.yellow} ${t('expiringSoon')}`} index={3} accent />
      </section>

      {/* capacity bar */}
      <Panel className="mb-6" title={<span className="inline-flex items-center gap-2"><Boxes className="h-4 w-4 text-accent" strokeWidth={1.8} />{t('capacityTitle')}</span>}>
        <div className="flex items-end justify-between mb-2">
          <div className="text-sm text-text-soft">{fmtNum(ws.onHand)} / {fmtNum(ws.capacity)} {t('cartons')}</div>
          <div className={clsx('text-lg font-display font-semibold tabular-nums', ws.utilization >= 100 ? 'text-accent' : 'text-text')}>{ws.utilization}%</div>
        </div>
        <div className="h-3 w-full rounded-full bg-bg-soft overflow-hidden">
          <div className={clsx('h-full rounded-full transition-all', utilTone)} style={{ width: `${Math.min(100, ws.utilization)}%` }} />
        </div>
        <p className="mt-2 text-[11px] text-muted">{t('recordedLine', { net: fmtNum(ws.netRecorded), raw: fmtNum(ws.rawOnHand), excluded: ws.unreconciled })}</p>
        <div className="mt-3 flex flex-wrap gap-4 text-xs">
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-success" />{t('expGreen')} {ws.green}</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-warn" />{t('expYellow')} {ws.yellow}</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-accent" />{t('expRed')} {ws.red}</span>
        </div>
        <NoteCallout className="mt-4" tone="warn" title={t('noteTitle')}>{t('note', { excluded: ws.unreconciled })}</NoteCallout>
      </Panel>

      {/* Physical count from Tarek (المخزون) vs the ledger on-hand */}
      <Panel className="mb-6" bodyClassName="px-0 pb-0" title={t('countTitle')} subtitle={t('countSub', { date: fmtCountDate(cnt.asOf), n: cnt.rows.length })}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-[11px] uppercase tracking-wide text-muted border-b border-border">
              <th className="text-start font-medium px-5 md:px-6 py-2.5">{t('colProduct')}</th>
              <th className="text-end font-medium px-3 py-2.5">{t('countCounted')}</th>
              <th className="text-end font-medium px-3 py-2.5">{t('countLedger')}</th>
              <th className="text-end font-medium px-5 md:px-6 py-2.5">{t('countVariance')}</th>
            </tr></thead>
            <tbody>
              {cnt.rows.map((r, i) => (
                <tr key={i} className="border-b border-border/60 hover:bg-surface-elev transition-colors">
                  <td className="px-5 md:px-6 py-2.5 font-medium text-text">{r.item}{r.matched && r.matched !== r.item && <span className="block text-[10px] text-muted">≈ {r.matched}</span>}</td>
                  <td className="px-3 py-2.5 text-end tabular-nums text-text">{fmtNum(r.cartons)}</td>
                  <td className="px-3 py-2.5 text-end tabular-nums text-text-soft">{r.ledgerOnHand != null ? fmtNum(r.ledgerOnHand) : <span className="text-muted">{t('countNoMatch')}</span>}</td>
                  <td className={clsx('px-5 md:px-6 py-2.5 text-end tabular-nums font-medium', r.variance == null ? 'text-muted' : Math.abs(r.variance) > Math.max(50, r.cartons * 0.15) ? 'text-accent' : 'text-success')}>
                    {r.variance == null ? '—' : `${r.variance > 0 ? '+' : ''}${fmtNum(r.variance)}`}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr className="font-semibold border-t-2 border-border">
              <td className="px-5 md:px-6 py-3">{t('countTotal')}</td>
              <td className="px-3 py-3 text-end tabular-nums">{fmtNum(cnt.total)}</td>
              <td colSpan={2} />
            </tr></tfoot>
          </table>
        </div>
        <div className="px-5 md:px-6 pb-4"><NoteCallout tone="info" title={t('countNoteTitle')}>{t('countNote')}</NoteCallout></div>
      </Panel>

      <Panel bodyClassName="px-0 pb-0"
        title={t('skuList')}
        action={
          <div className="flex items-center gap-2">
            <select value={cat} onChange={e => setCat(e.target.value)} className={selCls}>
              <option value="">{t('allCats')}</option>
              {cats.map(c => <option key={c} value={c}>{categoryLabel(c, locale)}</option>)}
            </select>
            <div className="relative">
              <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted" strokeWidth={1.7} />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder={t('searchPh')}
                className="w-36 md:w-52 rounded-full border border-border bg-surface ps-8 pe-3 py-1.5 text-xs text-text placeholder:text-muted focus:border-accent transition-colors" />
            </div>
          </div>
        }>
        <div className="px-5 md:px-6 py-3 flex flex-wrap gap-2 border-b border-border">
          {views.map(v => (
            <button key={v.v} type="button" onClick={() => setView(v.v)}
              className={clsx('rounded-full px-3 py-1 text-xs font-medium border transition-colors', view === v.v ? 'bg-accent text-white border-accent' : 'border-border bg-surface text-text-soft hover:bg-surface-elev')}>
              {t(`view_${v.v}`)}{v.n ? ` (${v.n})` : ''}
            </button>
          ))}
        </div>
        <div className="overflow-x-auto scrollbar-soft">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted border-b border-border">
                <th className="text-start font-medium px-5 md:px-6 py-3">{t('colProduct')}</th>
                <th className="text-start font-medium px-4 py-3 hidden md:table-cell">{t('colCategory')}</th>
                <th className="text-end font-medium px-4 py-3">{t('colOnHand')}</th>
                <th className="text-start font-medium px-4 py-3 hidden md:table-cell whitespace-nowrap">{t('colLastActivity')}</th>
                <th className="text-end font-medium px-4 py-3 hidden lg:table-cell">{t('colRop')}</th>
                <th className="text-center font-medium px-4 py-3">{t('colExpiry')}</th>
                <th className="text-end font-medium px-4 py-3 hidden sm:table-cell">{t('colValue')}</th>
                <th className="text-center font-medium px-5 md:px-6 py-3">{t('colStatus')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r, i) => (
                <tr key={i} className="hover:bg-surface-elev transition-colors">
                  <td className="px-5 md:px-6 py-3">
                    <div className="text-text leading-snug max-w-[300px] truncate">{r.item}</div>
                    {r.barcode && <div className="text-[11px] text-muted tabular-nums">{r.barcode}</div>}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell"><span className="inline-flex items-center rounded-full bg-bg-soft px-2.5 py-0.5 text-[11px] text-text-soft">{categoryLabel(r.category, locale)}</span></td>
                  <td className="px-4 py-3 text-end tabular-nums">
                    {r.unreconciled
                      ? <span className="text-muted line-through decoration-warn/60">{fmtNum(r.onHand)}</span>
                      : <span className="text-text">{fmtNum(r.onHand)}</span>}
                    {r.unreconciled && <span className="ms-1 text-[10px] font-medium text-warn">{t('excl')}</span>}
                    {(r.unreconciled || r.dataGap) && <div className="text-[10px] text-muted">{t('inOut', { in: fmtNum(r.inbound), out: fmtNum(r.outbound) })}</div>}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-xs tabular-nums whitespace-nowrap">
                    <span className="text-text-soft">{fmtDate(r.lastMove, locale)}</span>
                    {r.lastIn && <span className="block text-[10px] text-muted">{t('lastIn', { date: fmtDate(r.lastIn, locale) })}</span>}
                  </td>
                  <td className="px-4 py-3 text-end tabular-nums text-muted hidden lg:table-cell">{fmtNum(r.rop)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={clsx('inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium', EXP_TONE[r.expiry])}>
                      {r.expiry === 'unknown' ? t('exp_unknown') : r.daysToExpiry != null && r.daysToExpiry < 0 ? t('expired') : `${r.daysToExpiry}${t('daysShort')}`}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-end tabular-nums text-text-soft hidden sm:table-cell">{r.stockValue != null ? fmtSAR(r.stockValue) : '—'}</td>
                  <td className="px-5 md:px-6 py-3 text-center">
                    <div className="inline-flex items-center gap-1.5 justify-center flex-wrap">
                      {(r.unreconciled || r.dataGap) && <span className="inline-flex items-center gap-0.5 rounded-full bg-warn-soft text-warn px-2 py-0.5 text-[10px] font-medium"><AlertTriangle className="h-2.5 w-2.5" strokeWidth={2} />{t('unreconciled')}</span>}
                      {r.needsReorder && !r.unreconciled && <span className="inline-flex items-center rounded-full bg-accent-soft text-accent px-2 py-0.5 text-[10px] font-medium">{t('reorder')}</span>}
                      {!r.needsReorder && !r.unreconciled && !r.dataGap && <span className="text-[11px] text-success">{t('ok')}</span>}
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={8} className="px-6 py-10 text-center text-sm text-muted">{t('empty')}</td></tr>}
            </tbody>
            {rows.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-border bg-bg-soft/40">
                  <td colSpan={8} className="px-5 md:px-6 py-3 text-xs">
                    <span className="font-semibold text-text">{t('footLabel')}: {fmtNum(shownReconciled)} {t('cartons')}</span>
                    {shownExcluded > 0 && <span className="text-muted"> · {t('footNote', { excl: shownExcluded })}</span>}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <div className="px-5 md:px-6 py-3 border-t border-border text-xs text-muted">{t('showing', { n: rows.length, total: inv.length })}</div>
      </Panel>

      {(() => {
        const bigVar = cnt.rows.filter(r => r.variance != null && Math.abs(r.variance) > Math.max(50, r.cartons * 0.15))
        const worst = [...bigVar].sort((a, b) => Math.abs(b.variance!) - Math.abs(a.variance!))[0]
        const noMatch = cnt.rows.filter(r => !r.matched).length
        const notes: JarvisNote[] = []
        if (worst) notes.push({ tone: 'issue', title: t('n_var_t', { n: bigVar.length, item: worst.item, v: (worst.variance! > 0 ? '+' : '') + fmtNum(worst.variance!) }), body: t('n_var_b') })
        if (ws.unreconciled > 0) notes.push({ tone: 'issue', title: t('n_unrec_t', { n: ws.unreconciled }), body: t('n_unrec_b') })
        if (noMatch > 0) notes.push({ tone: 'tip', title: t('n_nomatch_t', { n: noMatch }), body: t('n_nomatch_b') })
        if (ws.reorder > 0) notes.push({ tone: 'tip', title: t('n_reorder_t', { n: ws.reorder }), body: t('n_reorder_b') })
        return <JarvisNotes title={t('jarvisTitle')} intro={t('jarvisIntro')} notes={notes} />
      })()}
    </PageShell>
  )
}
