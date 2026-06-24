'use client'
import { use, useMemo, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { notFound } from 'next/navigation'
import { clsx } from 'clsx'
import { ArrowLeft, Search, Phone, Hash, Building2, MapPin, User, CreditCard, Package, FileText, CalendarDays } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { PageShell } from '@/components/PageShell'
import { DisplayHeading } from '@/components/DisplayHeading'
import { Eyebrow } from '@/components/Eyebrow'
import { Panel } from '@/components/Panel'
import { StatCard } from '@/components/StatCard'
import { DonutStat } from '@/components/DonutStat'
import { LineChartPanel } from '@/components/LineChartPanel'
import { NoteCallout } from '@/components/NoteCallout'
import { InfoTooltip } from '@/components/InfoTooltip'
import { getClientDetail, clientName, categoryLabel, fmtSAR, fmtNum } from '@/lib/data/dataset'

function riskTone(r: number) { return r >= 60 ? 'text-accent' : r >= 35 ? 'text-warn' : 'text-success' }
const creditTone: Record<'ok' | 'high' | 'over', string> = { ok: 'bg-success', high: 'bg-warn', over: 'bg-accent' }

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const tNav = useTranslations('nav'); const t = useTranslations('clientDetail'); const tc = useTranslations('clients'); const locale = useLocale() as 'en' | 'ar'
  const detail = getClientDetail(decodeURIComponent(id))
  const [pq, setPq] = useState('')
  if (!detail) notFound()
  const { client, summary, credit, products, categories, monthly, invoices } = detail
  const name = clientName(client, locale)

  const shownProducts = useMemo(() => {
    const s = pq.trim().toLowerCase()
    return s ? products.filter(p => p.item.toLowerCase().includes(s)) : products
  }, [pq, products])
  const recentInvoices = invoices.slice(0, 60)
  const fmtDate = (d: string) => { if (!d) return '—'; try { return new Date(d).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) } catch { return d } }

  const profile: { icon: typeof Phone; label: string; value: string }[] = [
    { icon: User, label: t('rep'), value: locale === 'ar' ? client.salespersonAr : client.salespersonEn },
    { icon: MapPin, label: t('city'), value: (locale === 'ar' ? client.cityAr : client.cityEn) || '—' },
    { icon: Phone, label: t('mobile'), value: client.mobile || '—' },
    { icon: Hash, label: t('cr'), value: client.crNumber || '—' },
    { icon: CreditCard, label: t('account'), value: client.accountNumber || '—' },
    { icon: Building2, label: t('branch'), value: client.branch || (client.source === 'Sales' ? t('salesOnly') : '—') }
  ]

  return (
    <PageShell breadcrumbs={[{ label: tNav('operations') }, { label: tNav('clients') }, { label: name }]}>
      <header className="mb-7">
        <Link href="/clients" className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-accent transition-colors mb-4">
          <ArrowLeft className="h-3.5 w-3.5 flip-rtl" strokeWidth={1.7} />{t('back')}
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <Eyebrow accent>{tc('eyebrow')} · {client.id}</Eyebrow>
            <DisplayHeading size="lg" className="mt-3" locale={locale}>{name}</DisplayHeading>
            <p className="text-sm text-text-soft mt-2">{(locale === 'ar' ? client.cityAr : client.cityEn) || t('salesOnly')} · {locale === 'ar' ? client.salespersonAr : client.salespersonEn}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={clsx('inline-flex items-center rounded-full px-3 py-1 text-xs font-medium',
              client.status === 'active' ? 'bg-success-soft text-success' : client.status === 'lead' ? 'bg-warn-soft text-warn' : 'bg-bg-soft text-muted')}>
              {tc(`cStatus_${client.status}`)}
            </span>
            <span className={clsx('inline-flex items-center gap-1.5 rounded-full bg-surface border border-border px-3 py-1 text-xs font-medium', riskTone(client.riskScore))}>
              {t('risk')} {client.riskScore}%<InfoTooltip id="riskScore" />
            </span>
          </div>
        </div>
      </header>

      {/* headline KPIs */}
      <section className="mb-6 grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard label={t('kRevenue')} value={fmtSAR(summary.revenue)} infoId="revenue" index={0} accent />
        <StatCard label={t('kCollected')} value={fmtSAR(summary.collected)} delta={`${summary.collectedPct}% ${t('ofRevenue')}`} infoId="collected" index={1} />
        <StatCard label={t('kOutstanding')} value={fmtSAR(summary.outstanding)} infoId="outstanding" index={2} />
        <StatCard label={t('kOrders')} value={String(summary.invoices)} delta={`${t('avg')} ${fmtSAR(summary.avgInvoice)}`} infoId="invoices" index={3} />
      </section>
      <section className="mb-8 grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard label={t('kProducts')} value={String(summary.products)} infoId="productsBought" index={0} />
        <StatCard label={t('kUnits')} value={fmtNum(summary.units)} infoId="units" index={1} />
        <StatCard label={t('kFirst')} value={fmtDate(summary.firstDate)} index={2} />
        <StatCard label={t('kLast')} value={fmtDate(summary.lastDate)} index={3} />
      </section>

      {/* credit line + profile */}
      <section className="mb-8 grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6">
        <Panel title={<span className="inline-flex items-center gap-2"><CreditCard className="h-4 w-4 text-accent" strokeWidth={1.8} />{t('creditLine')}<InfoTooltip id="creditLimit" /></span>}>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div><div className="text-[11px] text-muted">{t('limit')}</div><div className="text-lg font-display font-semibold tabular-nums text-text mt-0.5">{fmtSAR(credit.limit)}</div></div>
            <div><div className="text-[11px] text-muted">{t('used')}</div><div className="text-lg font-display font-semibold tabular-nums text-warn mt-0.5">{fmtSAR(credit.used)}</div></div>
            <div><div className="text-[11px] text-muted">{t('available')}</div><div className="text-lg font-display font-semibold tabular-nums text-success mt-0.5">{fmtSAR(credit.available)}</div></div>
          </div>
          <div className="h-2.5 w-full rounded-full bg-bg-soft overflow-hidden">
            <div className={clsx('h-full rounded-full transition-all', creditTone[credit.status])} style={{ width: `${Math.min(100, credit.utilizationPct)}%` }} />
          </div>
          <div className="flex items-center justify-between mt-2 text-xs">
            <span className="text-muted">{t('utilization')}: <span className={clsx('font-medium tabular-nums', credit.status === 'over' ? 'text-accent' : credit.status === 'high' ? 'text-warn' : 'text-success')}>{credit.utilizationPct}%</span></span>
            <span className="text-muted">{t('terms')}: <span className="text-text font-medium tabular-nums">{credit.termsDays} {t('days')}</span></span>
          </div>
          <NoteCallout className="mt-4" title={t('creditIndicativeTitle')}>{t('creditIndicative')}</NoteCallout>
        </Panel>

        <Panel title={<span className="inline-flex items-center gap-2"><User className="h-4 w-4 text-accent" strokeWidth={1.8} />{t('profile')}</span>}>
          <dl className="grid grid-cols-2 gap-x-5 gap-y-4">
            {profile.map((p, i) => {
              const Icon = p.icon
              return (
                <div key={i} className="min-w-0">
                  <dt className="flex items-center gap-1.5 text-[11px] text-muted"><Icon className="h-3 w-3" strokeWidth={1.8} />{p.label}</dt>
                  <dd className="text-sm text-text mt-0.5 truncate">{p.value}</dd>
                </div>
              )
            })}
          </dl>
        </Panel>
      </section>

      {/* trend + category mix */}
      <section className="mb-8 grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6">
        {monthly.length > 0 ? (
          <LineChartPanel
            title={t('monthlyTrend')} subtitle={t('monthlyTrendSub')} locale={locale} height={240}
            data={monthly.map(m => ({ t: locale === 'ar' ? m.tAr : m.t, v: m.v }))}
            series={[{ key: 'v', label: t('kRevenue'), accent: true }]} />
        ) : (
          <Panel title={t('monthlyTrend')}><p className="py-12 text-center text-sm text-muted">{t('noData')}</p></Panel>
        )}
        <Panel title={<span className="inline-flex items-center gap-2"><Package className="h-4 w-4 text-accent" strokeWidth={1.8} />{t('categoryMix')}</span>}>
          {categories.length > 0 ? (
            <DonutStat
              centerValue={fmtNum(summary.units)} centerLabel={t('kUnits')}
              valueFmt={fmtSAR}
              segments={categories.map((c, i) => ({ label: categoryLabel(c.key, locale), value: c.v, accent: i === 0 }))} />
          ) : <p className="py-12 text-center text-sm text-muted">{t('noData')}</p>}
        </Panel>
      </section>

      {/* products bought */}
      <Panel className="mb-8" bodyClassName="px-0 pb-0"
        title={<span className="inline-flex items-center gap-2"><Package className="h-4 w-4 text-accent" strokeWidth={1.8} />{t('productsTitle')}<InfoTooltip id="productsBought" /></span>}
        subtitle={t('productsSub', { n: products.length })}
        action={
          <div className="relative">
            <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted" strokeWidth={1.7} />
            <input value={pq} onChange={e => setPq(e.target.value)} placeholder={t('searchProduct')}
              className="w-40 md:w-56 rounded-full border border-border bg-surface ps-8 pe-3 py-1.5 text-xs text-text placeholder:text-muted focus:border-accent transition-colors" />
          </div>
        }>
        <div className="overflow-x-auto scrollbar-soft">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted border-b border-border">
                <th className="text-start font-medium px-5 md:px-6 py-3">{t('pProduct')}</th>
                <th className="text-start font-medium px-4 py-3 hidden sm:table-cell">{t('pCategory')}</th>
                <th className="text-end font-medium px-4 py-3">{t('pQty')}</th>
                <th className="text-end font-medium px-4 py-3 hidden sm:table-cell">{t('pAvgPrice')}</th>
                <th className="text-end font-medium px-4 py-3 hidden md:table-cell">{t('pOrders')}</th>
                <th className="text-end font-medium px-4 py-3">{t('pRevenue')}</th>
                <th className="text-end font-medium px-5 md:px-6 py-3 hidden lg:table-cell">{t('pLast')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {shownProducts.map((p, i) => (
                <tr key={i} className="hover:bg-surface-elev transition-colors">
                  <td className="px-5 md:px-6 py-3 text-text max-w-[280px] truncate">{p.item}</td>
                  <td className="px-4 py-3 hidden sm:table-cell"><span className="inline-flex items-center rounded-full bg-bg-soft px-2.5 py-0.5 text-[11px] text-text-soft">{categoryLabel(p.category, locale)}</span></td>
                  <td className="px-4 py-3 text-end tabular-nums text-text-soft">{fmtNum(p.qty)}</td>
                  <td className="px-4 py-3 text-end tabular-nums text-text-soft hidden sm:table-cell">{p.avgPrice ? fmtSAR(p.avgPrice) : '—'}</td>
                  <td className="px-4 py-3 text-end tabular-nums text-text-soft hidden md:table-cell">{p.invoices}</td>
                  <td className="px-4 py-3 text-end tabular-nums text-text font-medium">{fmtSAR(p.revenue)}</td>
                  <td className="px-5 md:px-6 py-3 text-end tabular-nums text-muted hidden lg:table-cell">{fmtDate(p.lastDate)}</td>
                </tr>
              ))}
              {shownProducts.length === 0 && <tr><td colSpan={7} className="px-6 py-10 text-center text-sm text-muted">{t('noProducts')}</td></tr>}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* invoice history */}
      <Panel bodyClassName="px-0 pb-0"
        title={<span className="inline-flex items-center gap-2"><FileText className="h-4 w-4 text-accent" strokeWidth={1.8} />{t('invoicesTitle')}<InfoTooltip id="invoices" /></span>}
        subtitle={t('invoicesSub', { n: invoices.length })}>
        <div className="overflow-x-auto scrollbar-soft">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted border-b border-border">
                <th className="text-start font-medium px-5 md:px-6 py-3"><span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" strokeWidth={1.8} />{t('iDate')}</span></th>
                <th className="text-start font-medium px-4 py-3 hidden sm:table-cell">{t('iNumber')}</th>
                <th className="text-start font-medium px-4 py-3">{t('iItem')}</th>
                <th className="text-end font-medium px-4 py-3 hidden md:table-cell">{t('iQty')}</th>
                <th className="text-end font-medium px-4 py-3">{t('iAmount')}</th>
                <th className="text-center font-medium px-5 md:px-6 py-3">{t('iStatus')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recentInvoices.map(s => (
                <tr key={s.id} className="hover:bg-surface-elev transition-colors">
                  <td className="px-5 md:px-6 py-3 text-text-soft tabular-nums whitespace-nowrap">{fmtDate(s.date)}</td>
                  <td className="px-4 py-3 text-muted tabular-nums hidden sm:table-cell">{s.invoiceNo || '—'}</td>
                  <td className="px-4 py-3 text-text max-w-[260px] truncate">{s.item}</td>
                  <td className="px-4 py-3 text-end tabular-nums text-text-soft hidden md:table-cell">{fmtNum(s.qty)}</td>
                  <td className="px-4 py-3 text-end tabular-nums text-text">{fmtSAR(s.postVat)}</td>
                  <td className="px-5 md:px-6 py-3 text-center">
                    <span className={clsx('inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium', s.collected ? 'bg-success-soft text-success' : 'bg-warn-soft text-warn')}>
                      {s.collected ? t('collected') : t('pending')}
                    </span>
                  </td>
                </tr>
              ))}
              {recentInvoices.length === 0 && <tr><td colSpan={6} className="px-6 py-10 text-center text-sm text-muted">{t('noData')}</td></tr>}
            </tbody>
          </table>
        </div>
        {invoices.length > recentInvoices.length && <div className="px-5 md:px-6 py-3 border-t border-border text-xs text-muted">{t('showingInvoices', { n: recentInvoices.length, total: invoices.length })}</div>}
      </Panel>
    </PageShell>
  )
}
