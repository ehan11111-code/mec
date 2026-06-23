'use client'
import { useMemo, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { clsx } from 'clsx'
import { Search } from 'lucide-react'
import { PageShell } from '@/components/PageShell'
import { DisplayHeading } from '@/components/DisplayHeading'
import { Eyebrow } from '@/components/Eyebrow'
import { StatCard } from '@/components/StatCard'
import { Panel } from '@/components/Panel'
import { DonutStat } from '@/components/DonutStat'
import { getClients, crmSummary, clientsByStatus, topClients, clientName, fmtSAR } from '@/lib/data/dataset'

function riskTone(r: number) { return r >= 60 ? 'text-accent' : r >= 35 ? 'text-warn' : 'text-success' }

export default function ClientsPage() {
  const tNav = useTranslations('nav'); const t = useTranslations('clients'); const locale = useLocale() as 'en' | 'ar'
  const all = getClients(); const sum = crmSummary(); const byStatus = clientsByStatus(); const top = topClients(6)
  const sorted = useMemo(() => [...all].sort((a, b) => b.totalRevenue - a.totalRevenue), [all])
  const [q, setQ] = useState('')
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return sorted
    return sorted.filter(c => c.nameAr.toLowerCase().includes(s) || c.nameEn.toLowerCase().includes(s) || c.id.includes(s) || c.cityEn.toLowerCase().includes(s) || c.cityAr.includes(s))
  }, [q, sorted])
  const rows = filtered.slice(0, 80)

  return (
    <PageShell breadcrumbs={[{ label: tNav('operations') }, { label: tNav('clients') }]}>
      <header className="mb-8 max-w-3xl">
        <Eyebrow accent>{t('eyebrow')}</Eyebrow>
        <DisplayHeading size="lg" className="mt-3" locale={locale}>{t('headline')}</DisplayHeading>
        <p className="text-base text-text-soft mt-3 leading-relaxed">{t('subline', { count: sum.total, erp: sum.erp, sales: sum.total - sum.erp })}</p>
      </header>

      <section className="mb-8 grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard label={t('kTotal')} value={String(sum.total)} infoId="clientsTotal" index={0} accent />
        <StatCard label={t('kRevenue')} value={fmtSAR(sum.revenue)} infoId="revenue" index={1} />
        <StatCard label={t('kOverdue')} value={fmtSAR(sum.overdue)} infoId="overdue" index={2} />
        <StatCard label={t('kAtRisk')} value={String(sum.atRisk)} delta={`avg risk ${sum.avgRisk}%`} infoId="atRisk" index={3} />
      </section>

      <section className="mb-8 grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6">
        <Panel title={t('byStatus')}>
          <DonutStat
            centerValue={String(byStatus.total)} centerLabel={t('kTotal')}
            segments={[
              { label: t('cStatus_active'), value: byStatus.active, accent: true },
              { label: t('cStatus_lead'), value: byStatus.lead },
              { label: t('cStatus_inactive'), value: byStatus.inactive }
            ]} />
        </Panel>
        <Panel title={t('topClients')} subtitle={t('topClientsSub')} bodyClassName="px-0 pb-0">
          <ul className="divide-y divide-border">
            {top.map((c, i) => (
              <li key={c.id} className="flex items-center gap-3 px-5 md:px-6 py-3">
                <span className="shrink-0 w-5 text-xs tabular-nums text-muted">{i + 1}</span>
                <span className="flex-1 min-w-0 text-sm text-text truncate">{clientName(c, locale)}</span>
                <span className="shrink-0 text-sm font-medium tabular-nums text-accent">{fmtSAR(c.totalRevenue)}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </section>

      <Panel bodyClassName="px-0 pb-0"
        title={tNav('clients')}
        action={
          <div className="relative">
            <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted" strokeWidth={1.7} />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder={t('searchPh')}
              className="w-48 md:w-64 rounded-full border border-border bg-surface ps-8 pe-3 py-1.5 text-xs text-text placeholder:text-muted focus:border-accent transition-colors" />
          </div>
        }>
        <div className="overflow-x-auto scrollbar-soft">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted border-b border-border">
                <th className="text-start font-medium px-5 md:px-6 py-3">{t('colName')}</th>
                <th className="text-start font-medium px-4 py-3">{t('colCity')}</th>
                <th className="text-start font-medium px-4 py-3 hidden md:table-cell">{t('colRep')}</th>
                <th className="text-start font-medium px-4 py-3">{t('colStatus')}</th>
                <th className="text-end font-medium px-4 py-3 hidden sm:table-cell">{t('colOrders')}</th>
                <th className="text-end font-medium px-4 py-3">{t('colRevenue')}</th>
                <th className="text-end font-medium px-5 md:px-6 py-3">{t('colRisk')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map(c => (
                <tr key={c.id} className="hover:bg-surface-elev transition-colors">
                  <td className="px-5 md:px-6 py-3">
                    <div className="text-text leading-snug max-w-[260px] truncate">{clientName(c, locale)}</div>
                    <div className="text-[11px] text-muted tabular-nums">{c.id}</div>
                  </td>
                  <td className="px-4 py-3 text-text-soft">{locale === 'ar' ? c.cityAr : c.cityEn}</td>
                  <td className="px-4 py-3 text-text-soft hidden md:table-cell">{locale === 'ar' ? c.salespersonAr : c.salespersonEn}</td>
                  <td className="px-4 py-3">
                    <span className={clsx('inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium',
                      c.status === 'active' ? 'bg-success-soft text-success' : c.status === 'lead' ? 'bg-warn-soft text-warn' : 'bg-bg-soft text-muted')}>
                      {t(`cStatus_${c.status}`)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-end tabular-nums text-text-soft hidden sm:table-cell">{c.totalOrders}</td>
                  <td className="px-4 py-3 text-end tabular-nums text-text">{fmtSAR(c.totalRevenue)}</td>
                  <td className={clsx('px-5 md:px-6 py-3 text-end tabular-nums font-medium', riskTone(c.riskScore))}>{c.riskScore}%</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={7} className="px-6 py-10 text-center text-sm text-muted">{t('empty')}</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="px-5 md:px-6 py-3 border-t border-border text-xs text-muted">{t('showing', { n: rows.length, total: filtered.length })}</div>
      </Panel>
    </PageShell>
  )
}
