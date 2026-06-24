'use client'
import { useMemo, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { clsx } from 'clsx'
import { Search, SlidersHorizontal, X, ChevronRight } from 'lucide-react'
import { useRouter, Link } from '@/i18n/navigation'
import { PageShell } from '@/components/PageShell'
import { DisplayHeading } from '@/components/DisplayHeading'
import { Eyebrow } from '@/components/Eyebrow'
import { StatCard } from '@/components/StatCard'
import { Panel } from '@/components/Panel'
import { DonutStat } from '@/components/DonutStat'
import { getClientStats, crmSummary, clientsByStatus, topClients, clientName, allProducts, fmtSAR, fmtNum, type ClientStats } from '@/lib/data/dataset'

function riskTone(r: number) { return r >= 60 ? 'text-accent' : r >= 35 ? 'text-warn' : 'text-success' }

// Order-value tiers (client lifetime revenue, incl. VAT) and order-size tiers (total cartons/units).
const VALUE_TIERS: Record<string, [number, number]> = { v1: [1_000_000, Infinity], v2: [250_000, 1_000_000], v3: [50_000, 250_000], v4: [0, 50_000] }
const SIZE_TIERS: Record<string, [number, number]> = { s1: [1000, Infinity], s2: [250, 1000], s3: [0, 250] }

export default function ClientsPage() {
  const tNav = useTranslations('nav'); const t = useTranslations('clients'); const locale = useLocale() as 'en' | 'ar'
  const router = useRouter()
  const all = getClientStats(); const sum = crmSummary(); const byStatus = clientsByStatus(); const top = topClients(6)
  const products = useMemo(() => allProducts(), [])
  const sorted = useMemo(() => [...all].sort((a, b) => b.totalRevenue - a.totalRevenue), [all])

  const [q, setQ] = useState('')
  const [status, setStatus] = useState<'all' | 'active' | 'lead' | 'inactive'>('all')
  const [product, setProduct] = useState('')
  const [valueTier, setValueTier] = useState('')
  const [sizeTier, setSizeTier] = useState('')

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    const [vMin, vMax] = VALUE_TIERS[valueTier] ?? [0, Infinity]
    const [zMin, zMax] = SIZE_TIERS[sizeTier] ?? [0, Infinity]
    return sorted.filter(c => {
      if (s && !(c.nameAr.toLowerCase().includes(s) || c.nameEn.toLowerCase().includes(s) || c.id.toLowerCase().includes(s) || c.cityEn.toLowerCase().includes(s) || c.cityAr.includes(s))) return false
      if (status !== 'all' && c.status !== status) return false
      if (product && !c.products.includes(product)) return false
      if (c.totalRevenue < vMin || c.totalRevenue >= vMax) return false
      if (c.units < zMin || c.units >= zMax) return false
      return true
    })
  }, [q, status, product, valueTier, sizeTier, sorted])
  const rows = filtered.slice(0, 120)
  const activeFilters = (status !== 'all' ? 1 : 0) + (product ? 1 : 0) + (valueTier ? 1 : 0) + (sizeTier ? 1 : 0)
  const clearAll = () => { setStatus('all'); setProduct(''); setValueTier(''); setSizeTier(''); setQ('') }
  const open = (c: ClientStats) => router.push(`/clients/${c.id}`)

  const selCls = 'rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-text focus:border-accent transition-colors cursor-pointer'

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
              <li key={c.id}>
                <Link href={`/clients/${c.id}`} className="flex items-center gap-3 px-5 md:px-6 py-3 hover:bg-surface-elev transition-colors">
                  <span className="shrink-0 w-5 text-xs tabular-nums text-muted">{i + 1}</span>
                  <span className="flex-1 min-w-0 text-sm text-text truncate">{clientName(c, locale)}</span>
                  <span className="shrink-0 text-sm font-medium tabular-nums text-accent">{fmtSAR(c.totalRevenue)}</span>
                  <ChevronRight className="h-3.5 w-3.5 text-muted flip-rtl shrink-0" strokeWidth={1.8} />
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      </section>

      <Panel bodyClassName="px-0 pb-0"
        title={
          <span className="inline-flex items-center gap-2"><SlidersHorizontal className="h-4 w-4 text-accent" strokeWidth={1.8} />{t('directory')}</span>
        }
        subtitle={t('directorySub')}
        action={
          <div className="relative">
            <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted" strokeWidth={1.7} />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder={t('searchPh')}
              className="w-44 md:w-60 rounded-full border border-border bg-surface ps-8 pe-3 py-1.5 text-xs text-text placeholder:text-muted focus:border-accent transition-colors" />
          </div>
        }>
        {/* filter bar */}
        <div className="flex flex-wrap items-center gap-2.5 px-5 md:px-6 py-3.5 border-b border-border">
          <span className="text-[11px] font-medium text-muted uppercase tracking-wide me-1">{t('filterBy')}</span>
          <select value={status} onChange={e => setStatus(e.target.value as typeof status)} className={selCls}>
            <option value="all">{t('fStatusAll')}</option>
            <option value="active">{t('cStatus_active')}</option>
            <option value="lead">{t('cStatus_lead')}</option>
            <option value="inactive">{t('cStatus_inactive')}</option>
          </select>
          <select value={product} onChange={e => setProduct(e.target.value)} className={clsx(selCls, 'max-w-[200px]')}>
            <option value="">{t('fProductAll')}</option>
            {products.map(p => <option key={p.item} value={p.item}>{p.item}</option>)}
          </select>
          <select value={valueTier} onChange={e => setValueTier(e.target.value)} className={selCls}>
            <option value="">{t('fValueAll')}</option>
            <option value="v1">{t('fValue_v1')}</option>
            <option value="v2">{t('fValue_v2')}</option>
            <option value="v3">{t('fValue_v3')}</option>
            <option value="v4">{t('fValue_v4')}</option>
          </select>
          <select value={sizeTier} onChange={e => setSizeTier(e.target.value)} className={selCls}>
            <option value="">{t('fSizeAll')}</option>
            <option value="s1">{t('fSize_s1')}</option>
            <option value="s2">{t('fSize_s2')}</option>
            <option value="s3">{t('fSize_s3')}</option>
          </select>
          {activeFilters > 0 && (
            <button type="button" onClick={clearAll} className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs text-text-soft hover:bg-surface-elev transition-colors">
              <X className="h-3 w-3" strokeWidth={2} />{t('clear')}
            </button>
          )}
        </div>

        <div className="overflow-x-auto scrollbar-soft">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted border-b border-border">
                <th className="text-start font-medium px-5 md:px-6 py-3">{t('colName')}</th>
                <th className="text-start font-medium px-4 py-3 hidden lg:table-cell">{t('colCity')}</th>
                <th className="text-start font-medium px-4 py-3 hidden xl:table-cell">{t('colRep')}</th>
                <th className="text-end font-medium px-4 py-3 hidden md:table-cell">{t('colProducts')}</th>
                <th className="text-end font-medium px-4 py-3 hidden sm:table-cell">{t('colUnits')}</th>
                <th className="text-end font-medium px-4 py-3 hidden sm:table-cell">{t('colOrders')}</th>
                <th className="text-end font-medium px-4 py-3">{t('colRevenue')}</th>
                <th className="text-end font-medium px-4 py-3 hidden md:table-cell">{t('colOutstanding')}</th>
                <th className="text-end font-medium px-5 md:px-6 py-3">{t('colRisk')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map(c => (
                <tr key={c.id} onClick={() => open(c)} tabIndex={0}
                  onKeyDown={e => { if (e.key === 'Enter') open(c) }}
                  className="group hover:bg-surface-elev focus:bg-surface-elev outline-none transition-colors cursor-pointer">
                  <td className="px-5 md:px-6 py-3">
                    <div className="flex items-center gap-2">
                      <div className="min-w-0">
                        <div className="text-text leading-snug max-w-[260px] truncate group-hover:text-accent transition-colors">{clientName(c, locale)}</div>
                        <div className="text-[11px] text-muted tabular-nums">{c.id}{c.topProduct ? ` · ${c.topProduct}` : ''}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-text-soft hidden lg:table-cell">{locale === 'ar' ? c.cityAr : c.cityEn || '—'}</td>
                  <td className="px-4 py-3 text-text-soft hidden xl:table-cell">{locale === 'ar' ? c.salespersonAr : c.salespersonEn}</td>
                  <td className="px-4 py-3 text-end tabular-nums text-text-soft hidden md:table-cell">{c.productCount}</td>
                  <td className="px-4 py-3 text-end tabular-nums text-text-soft hidden sm:table-cell">{fmtNum(c.units)}</td>
                  <td className="px-4 py-3 text-end tabular-nums text-text-soft hidden sm:table-cell">{c.totalOrders}</td>
                  <td className="px-4 py-3 text-end tabular-nums text-text">{fmtSAR(c.totalRevenue)}</td>
                  <td className="px-4 py-3 text-end tabular-nums text-warn hidden md:table-cell">{c.outstanding > 0 ? fmtSAR(c.outstanding) : '—'}</td>
                  <td className={clsx('px-5 md:px-6 py-3 text-end tabular-nums font-medium', riskTone(c.riskScore))}>{c.riskScore}%</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={9} className="px-6 py-10 text-center text-sm text-muted">{t('empty')}</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="px-5 md:px-6 py-3 border-t border-border text-xs text-muted">{t('showing', { n: rows.length, total: filtered.length })}</div>
      </Panel>
    </PageShell>
  )
}
