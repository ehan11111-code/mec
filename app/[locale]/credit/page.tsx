'use client'
import { useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { clsx } from 'clsx'
import { Wallet, Users, AlertTriangle, CalendarClock, Printer, Wifi } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { PageShell } from '@/components/PageShell'
import { DisplayHeading } from '@/components/DisplayHeading'
import { Eyebrow } from '@/components/Eyebrow'
import { Panel } from '@/components/Panel'
import { NoteCallout } from '@/components/NoteCallout'
import { Money } from '@/components/Money'
import { JarvisNotes, type JarvisNote } from '@/components/JarvisNotes'
import { ClientLink } from '@/components/EntityLink'
import { printReport } from '@/lib/export/exporters'
import { fmtSAR } from '@/lib/data/dataset'
import { getCredit, buildCredit } from '@/lib/data/credit'

export default function CreditPage() {
  const tNav = useTranslations('nav'); const t = useTranslations('credit'); const locale = useLocale() as 'en' | 'ar'
  // Live overlay: if a newer المديونية statement has arrived via WhatsApp, use it; else the built-in one.
  const [live, setLive] = useState<ReturnType<typeof getCredit> | null>(null)
  useEffect(() => {
    fetch('/api/credit', { cache: 'no-store' }).then(r => r.json()).then(d => {
      if (Array.isArray(d.rows) && d.rows.length && d.asOf) setLive(buildCredit(d.rows, d.asOf))
    }).catch(() => { /* keep built-in */ })
  }, [])
  const c = live ?? getCredit()
  const isLive = !!live
  const fmtDate = (d: string) => { try { return new Date(d).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) } catch { return d } }
  const pct = (n: number) => `${Math.round(n * 100)}%`

  const tiles = [
    { icon: Wallet, key: 'total', amount: c.total, accent: true },
    { icon: Users, key: 'clients', val: String(c.clientCount) },
    { icon: AlertTriangle, key: 'overdue', amount: c.overdueAmount, accent: c.overdueCount > 0, sub: t('overdueSub', { n: c.overdueCount }) },
    { icon: CalendarClock, key: 'avgAge', val: t('days', { n: c.avgAge }) },
  ]
  const buckets = [
    { key: 'current', v: c.buckets.current, tone: 'bg-success' },
    { key: 'd8_30', v: c.buckets.d8_30, tone: 'bg-warn' },
    { key: 'd31_60', v: c.buckets.d31_60, tone: 'bg-accent' },
    { key: 'over60', v: c.buckets.over60, tone: 'bg-accent' },
  ].filter(b => b.v > 0)
  const ageTone = (d: number) => d > 30 ? 'text-accent' : d > 7 ? 'text-warn' : 'text-muted'

  // JARVIS — potential issues + suggestions, derived from the statement.
  const top = c.byClient[0]
  const notes: JarvisNote[] = []
  if (c.overdueCount > 0) notes.push({ tone: 'issue', title: t('n_overdue_t', { n: c.overdueCount, amt: fmtSAR(c.overdueAmount) }), body: t('n_overdue_b') })
  if (top && top.pct >= 0.25) notes.push({ tone: 'issue', title: t('n_conc_t', { client: top.client, pct: Math.round(top.pct * 100) }), body: t('n_conc_b') })
  notes.push({ tone: 'tip', title: t('n_tip_t'), body: t('n_tip_b') })

  return (
    <PageShell requires="finance" breadcrumbs={[{ label: tNav('credit') }]}>
      <div data-print-header className="hidden items-center justify-between mb-6 pb-4 border-b">
        <div><div className="text-lg font-bold">MEC · {t('headline')}</div><div className="text-xs">{t('asOf', { date: fmtDate(c.asOf) })}</div></div>
        <div className="text-xs">Jarvis AI</div>
      </div>

      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <Eyebrow accent>{t('eyebrow')}</Eyebrow>
          <DisplayHeading size="lg" className="mt-3" locale={locale}>{t('headline')}</DisplayHeading>
          <p className="text-sm text-text-soft mt-2 leading-relaxed">{t('subline')}</p>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          {isLive && <span className="inline-flex items-center gap-1 rounded-full bg-success-soft text-success px-2.5 py-1 text-[11px] font-medium"><Wifi className="h-3 w-3" strokeWidth={2} />{t('liveBadge')}</span>}
          <Link href="/credit/reconcile" className="inline-flex items-center gap-1.5 rounded-full bg-accent text-white hover:bg-accent-strong px-3.5 py-2 text-xs font-medium transition-colors">
            <Wallet className="h-3.5 w-3.5" strokeWidth={1.8} />{t('reconLink')}
          </Link>
          <button type="button" onClick={() => printReport()} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface hover:bg-surface-elev px-3.5 py-2 text-xs font-medium text-text-soft transition-colors">
            <Printer className="h-3.5 w-3.5" strokeWidth={1.8} />{t('print')}
          </button>
        </div>
      </header>

      <NoteCallout className="mb-6" title={t('sourceTitle')}>{t('sourceBody', { date: fmtDate(c.asOf) })}</NoteCallout>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
        {tiles.map(({ icon: Icon, key, val, amount, accent, sub }) => (
          <Panel key={key} className={clsx(accent && 'border-accent/30 gradient-highlight')}>
            <div className="flex items-center gap-2 text-xs text-muted"><Icon className="h-4 w-4 text-accent" strokeWidth={1.8} />{t(`k_${key}`)}</div>
            <div className={clsx('mt-2 font-display font-semibold tabular-nums leading-none', accent ? 'text-accent' : 'text-text', 'text-2xl md:text-[1.7rem]')}>
              {amount != null ? <Money amount={amount} valueClassName="" /> : val}
            </div>
            {sub && <div className="text-[11px] text-muted mt-1">{sub}</div>}
          </Panel>
        ))}
      </div>

      {/* aging buckets */}
      <Panel className="mb-6" title={t('agingTitle')} subtitle={t('agingSub')}>
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-bg-soft">
          {buckets.map(b => <div key={b.key} className={b.tone} style={{ width: `${(b.v / c.total) * 100}%` }} title={`${t(`b_${b.key}`)}`} />)}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[11px]">
          {buckets.map(b => (
            <span key={b.key} className="inline-flex items-center gap-1.5 text-text-soft">
              <span className={clsx('h-2 w-2 rounded-full', b.tone)} />{t(`b_${b.key}`)} · <Money amount={b.v} valueClassName="font-medium text-text" /> · {pct(b.v / c.total)}
            </span>
          ))}
        </div>
      </Panel>

      {/* by client */}
      <Panel className="mb-6" bodyClassName="px-0 pb-0" title={t('byClientTitle')} subtitle={t('byClientSub')}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-[11px] uppercase tracking-wide text-muted border-b border-border">
              <th className="text-start font-medium px-5 md:px-6 py-2.5">{t('colClient')}</th>
              <th className="text-start font-medium px-3 py-2.5">{t('colSalesperson')}</th>
              <th className="text-end font-medium px-3 py-2.5">{t('colInvoices')}</th>
              <th className="text-end font-medium px-3 py-2.5">{t('colMaxAge')}</th>
              <th className="text-end font-medium px-3 py-2.5">{t('colShare')}</th>
              <th className="text-end font-medium px-5 md:px-6 py-2.5">{t('colOutstanding')}</th>
            </tr></thead>
            <tbody>
              {c.byClient.map((row, i) => (
                <tr key={i} className="border-b border-border/60 hover:bg-surface-elev transition-colors">
                  <td className="px-5 md:px-6 py-2.5 font-medium text-text"><ClientLink name={row.client} className="hover:text-accent transition-colors" /></td>
                  <td className="px-3 py-2.5 text-text-soft">{locale === 'ar' ? row.salespersonAr : row.salespersonEn}</td>
                  <td className="px-3 py-2.5 text-end tabular-nums text-text-soft">{row.invoices}</td>
                  <td className={clsx('px-3 py-2.5 text-end tabular-nums', ageTone(row.maxAge))}>{t('days', { n: row.maxAge })}</td>
                  <td className="px-3 py-2.5 text-end tabular-nums text-text-soft">{pct(row.pct)}</td>
                  <td className="px-5 md:px-6 py-2.5 text-end"><Money amount={row.amount} valueClassName="font-semibold text-text" /></td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr className="font-semibold border-t-2 border-border">
              <td className="px-5 md:px-6 py-3" colSpan={5}>{t('total')}</td>
              <td className="px-5 md:px-6 py-3 text-end"><Money amount={c.total} valueClassName="text-accent font-bold" /></td>
            </tr></tfoot>
          </table>
        </div>
      </Panel>

      {/* by invoice */}
      <Panel bodyClassName="px-0 pb-0" title={t('byInvoiceTitle')} subtitle={t('byInvoiceSub')}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-[11px] uppercase tracking-wide text-muted border-b border-border">
              <th className="text-start font-medium px-5 md:px-6 py-2.5">{t('colInvoice')}</th>
              <th className="text-start font-medium px-3 py-2.5">{t('colDate')}</th>
              <th className="text-start font-medium px-3 py-2.5">{t('colClient')}</th>
              <th className="text-start font-medium px-3 py-2.5">{t('colSalesperson')}</th>
              <th className="text-end font-medium px-3 py-2.5">{t('colAge')}</th>
              <th className="text-end font-medium px-5 md:px-6 py-2.5">{t('colOutstanding')}</th>
            </tr></thead>
            <tbody>
              {c.rows.map((row, i) => (
                <tr key={i} className="border-b border-border/60 hover:bg-surface-elev transition-colors">
                  <td className="px-5 md:px-6 py-2.5 font-medium text-text tabular-nums">#{row.invoiceNo}</td>
                  <td className="px-3 py-2.5 text-text-soft tabular-nums">{fmtDate(row.date)}</td>
                  <td className="px-3 py-2.5 text-text-soft"><ClientLink name={row.client} className="hover:text-accent transition-colors" /></td>
                  <td className="px-3 py-2.5 text-text-soft">{locale === 'ar' ? row.salespersonAr : row.salespersonEn}</td>
                  <td className={clsx('px-3 py-2.5 text-end tabular-nums', ageTone(row.ageDays))}>{t('days', { n: row.ageDays })}</td>
                  <td className="px-5 md:px-6 py-2.5 text-end"><Money amount={row.amount} valueClassName="font-semibold text-text" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <JarvisNotes title={t('jarvisTitle')} intro={t('jarvisIntro')} notes={notes} />
    </PageShell>
  )
}
