'use client'
import { useEffect, useMemo, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { clsx } from 'clsx'
import { Search, Package, ChevronRight } from 'lucide-react'
import { useRouter } from '@/i18n/navigation'
import { PageShell } from '@/components/PageShell'
import { DisplayHeading } from '@/components/DisplayHeading'
import { Eyebrow } from '@/components/Eyebrow'
import { StatCard } from '@/components/StatCard'
import { Panel } from '@/components/Panel'
import { getProductList, categoryLabel, fmtSAR, fmtNum, profitSummary, type ProductListItem } from '@/lib/data/dataset'

function marginTone(m: number | null, below: boolean) { return m == null ? 'text-muted' : below ? 'text-accent' : m >= 12 ? 'text-success' : 'text-warn' }

export default function ProductsPage() {
  const tNav = useTranslations('nav'); const t = useTranslations('products'); const locale = useLocale() as 'en' | 'ar'
  const router = useRouter()
  const all = getProductList(); const ps = profitSummary()
  const cats = useMemo(() => [...new Set(all.map(p => p.category))], [all])
  const [q, setQ] = useState(''); const [cat, setCat] = useState('')
  // On-hand reconciled after open orders + Tarek's المخزون moved-out (live overlay, Products page only).
  type Recon = { base: number; committed: number; movedOut: number; reconciled: number; reconciledFlag: boolean }
  const [recon, setRecon] = useState<Record<string, Recon> | null>(null)
  useEffect(() => { fetch('/api/products/onhand', { cache: 'no-store' }).then(r => r.json()).then(d => setRecon(d.onhand || null)).catch(() => {}) }, [])
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    return all.filter(p => (!s || p.item.toLowerCase().includes(s)) && (!cat || p.category === cat))
  }, [q, cat, all])
  const rows = filtered.slice(0, 150)
  const open = (p: ProductListItem) => router.push(`/products/${encodeURIComponent(p.item)}`)
  const selCls = 'rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-text focus:border-accent transition-colors cursor-pointer'

  return (
    <PageShell requires="orders" breadcrumbs={[{ label: tNav('operations') }, { label: tNav('products') }]}>
      <header className="mb-8 max-w-3xl">
        <Eyebrow accent>{t('eyebrow')}</Eyebrow>
        <DisplayHeading size="lg" className="mt-3" locale={locale}>{t('headline')}</DisplayHeading>
        <p className="text-base text-text-soft mt-3 leading-relaxed">{t('subline')}</p>
      </header>

      <section className="mb-8 grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard label={t('kProducts')} value={String(all.length)} index={0} accent />
        <StatCard label={t('kRevenue')} value={fmtSAR(ps.revenue)} infoId="revenue" index={1} />
        <StatCard label={t('kGrossProfit')} value={fmtSAR(ps.grossProfit)} infoId="grossProfitActual" index={2} />
        <StatCard label={t('kBelowMin')} value={String(ps.belowMin)} infoId="belowMinCount" index={3} />
      </section>

      <Panel bodyClassName="px-0 pb-0"
        title={<span className="inline-flex items-center gap-2"><Package className="h-4 w-4 text-accent" strokeWidth={1.8} />{t('catalog')}</span>}
        subtitle={t('catalogSub')}
        action={
          <div className="flex items-center gap-2">
            <select value={cat} onChange={e => setCat(e.target.value)} className={selCls}>
              <option value="">{t('allCats')}</option>
              {cats.map(c => <option key={c} value={c}>{categoryLabel(c, locale)}</option>)}
            </select>
            <div className="relative">
              <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted" strokeWidth={1.7} />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder={t('searchPh')}
                className="w-40 md:w-56 rounded-full border border-border bg-surface ps-8 pe-3 py-1.5 text-xs text-text placeholder:text-muted focus:border-accent transition-colors" />
            </div>
          </div>
        }>
        <div className="overflow-x-auto scrollbar-soft">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted border-b border-border">
                <th className="text-start font-medium px-5 md:px-6 py-3">{t('colProduct')}</th>
                <th className="text-start font-medium px-4 py-3 hidden sm:table-cell">{t('colCategory')}</th>
                <th className="text-end font-medium px-4 py-3">{t('colUnits')}</th>
                <th className="text-end font-medium px-4 py-3 hidden md:table-cell">{t('colOrders')}</th>
                <th className="text-end font-medium px-4 py-3 hidden lg:table-cell">{t('colSell')}</th>
                <th className="text-end font-medium px-4 py-3 hidden lg:table-cell">{t('colCost')}</th>
                <th className="text-end font-medium px-4 py-3 hidden md:table-cell">{t('colOnHand')}</th>
                <th className="text-end font-medium px-4 py-3">{t('colRevenue')}</th>
                <th className="text-end font-medium px-5 md:px-6 py-3">{t('colMargin')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((p, i) => (
                <tr key={i} onClick={() => open(p)} tabIndex={0} onKeyDown={e => { if (e.key === 'Enter') open(p) }}
                  className="group hover:bg-surface-elev focus:bg-surface-elev outline-none transition-colors cursor-pointer">
                  <td className="px-5 md:px-6 py-3">
                    <div className="text-text leading-snug max-w-[300px] truncate group-hover:text-accent transition-colors">{p.item}</div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell"><span className="inline-flex items-center rounded-full bg-bg-soft px-2.5 py-0.5 text-[11px] text-text-soft">{categoryLabel(p.category, locale)}</span></td>
                  <td className="px-4 py-3 text-end tabular-nums text-text-soft">{fmtNum(p.units)}</td>
                  <td className="px-4 py-3 text-end tabular-nums text-text-soft hidden md:table-cell">{p.orders}</td>
                  <td className="px-4 py-3 text-end tabular-nums text-text-soft hidden lg:table-cell">{p.avgSell ? fmtSAR(p.avgSell) : '—'}</td>
                  <td className="px-4 py-3 text-end tabular-nums text-text-soft hidden lg:table-cell">{p.unitCost ? fmtSAR(p.unitCost) : '—'}</td>
                  <td className="px-4 py-3 text-end tabular-nums hidden md:table-cell">
                    {p.onHand == null ? <span className="text-muted">—</span>
                      : (() => {
                          const rc = recon?.[p.item]
                          const val = rc ? rc.reconciled : p.onHand
                          const adjusted = rc && (rc.committed > 0 || rc.movedOut > 0)
                          const title = rc && adjusted
                            ? t('onHandRecon', { base: fmtNum(rc.base), ordered: fmtNum(rc.committed), moved: fmtNum(rc.movedOut) })
                            : (p.whReconciled ? undefined : t('onHandUnrec'))
                          return <span className={clsx(!p.whReconciled ? 'text-warn' : adjusted ? 'text-accent' : 'text-text-soft')} title={title}>{fmtNum(val)}{!p.whReconciled && '*'}{adjusted && '†'}</span>
                        })()}
                  </td>
                  <td className="px-4 py-3 text-end tabular-nums text-text">{fmtSAR(p.revenue)}</td>
                  <td className={clsx('px-5 md:px-6 py-3 text-end tabular-nums font-medium', marginTone(p.marginPct, p.belowMin))}>{p.marginPct == null ? '—' : `${p.marginPct}%`}</td>
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
