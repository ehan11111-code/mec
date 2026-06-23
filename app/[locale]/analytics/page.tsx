'use client'
import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { clsx } from 'clsx'
import { PageShell } from '@/components/PageShell'
import { DisplayHeading } from '@/components/DisplayHeading'
import { Eyebrow } from '@/components/Eyebrow'
import { SlicerBar } from '@/components/SlicerBar'
import { ExportBar } from '@/components/ExportBar'
import { BrandLogo } from '@/components/BrandLogo'
import { OverviewDashboard, SalesDashboard, ProcurementDashboard, MarginDashboard, CollectionsDashboard, ProductsDashboard } from '@/components/analytics/Dashboards'
import { salesByClientName, supplierSpend, productMargins, topProducts, type SalesFilter } from '@/lib/data/dataset'
import type { Row } from '@/lib/export/exporters'

type Tab = 'overview' | 'sales' | 'procurement' | 'margin' | 'collections' | 'products'
const TABS: Tab[] = ['overview', 'sales', 'procurement', 'margin', 'collections', 'products']

export default function AnalyticsPage() {
  const tNav = useTranslations('nav'); const t = useTranslations('analytics'); const locale = useLocale() as 'en' | 'ar'
  const [tab, setTab] = useState<Tab>('overview')
  const [filter, setFilter] = useState<SalesFilter>({})

  const exportRows = (): Row[] => {
    if (tab === 'procurement') return supplierSpend(50)
    if (tab === 'margin') return productMargins().map(p => ({ product: p.item, category: p.category, cartons: p.units, sellPerCarton: p.avgSell, costPerCarton: p.unitCost ?? '', grossProfit: p.grossProfit ?? '', marginPct: p.marginPct ?? '', minMargin: p.minMargin, belowMin: p.belowMin ? 'YES' : '', status: p.confidence === 'none' ? 'cost n/a' : p.marginPct != null && p.marginPct < 0 ? 'loss' : p.belowMin ? 'below min' : 'healthy' }))
    if (tab === 'products') return topProducts(filter, 50)
    return salesByClientName(filter).map(r => ({ client: r.name, invoices: r.invoices, revenue: r.revenue, collected: r.collected, outstanding: r.outstanding }))
  }

  return (
    <PageShell breadcrumbs={[{ label: tNav('operations') }, { label: tNav('analytics') }]}>
      <div data-print-header className="hidden items-center justify-between mb-6 border-b border-border pb-4">
        <BrandLogo size="md" />
        <div className="text-end"><div className="text-sm font-semibold text-text">{t('headline')}</div><div className="text-xs text-muted">MEC · {t(`tab_${tab}`)}</div></div>
      </div>

      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-3xl">
          <Eyebrow accent>{t('eyebrow')}</Eyebrow>
          <DisplayHeading size="lg" className="mt-3" locale={locale}>{t('headline')}</DisplayHeading>
          <p className="text-sm text-text-soft mt-2 leading-relaxed">{t('subline')}</p>
        </div>
        <ExportBar rows={exportRows} filename={`MEC-${tab}`} />
      </header>

      <div className="flex flex-wrap gap-1.5 mb-6 border-b border-border print:hidden">
        {TABS.map(tb => (
          <button key={tb} type="button" onClick={() => setTab(tb)}
            className={clsx('px-3.5 py-2 text-sm font-medium rounded-t-soft border-b-2 -mb-px transition-colors',
              tab === tb ? 'border-accent text-accent' : 'border-transparent text-text-soft hover:text-text')}>
            {t(`tab_${tb}`)}
          </button>
        ))}
      </div>

      {tab !== 'procurement' && tab !== 'margin' && <SlicerBar filter={filter} onChange={setFilter} />}

      {tab === 'overview' && <OverviewDashboard filter={filter} locale={locale} />}
      {tab === 'sales' && <SalesDashboard filter={filter} locale={locale} />}
      {tab === 'procurement' && <ProcurementDashboard filter={filter} locale={locale} />}
      {tab === 'margin' && <MarginDashboard filter={filter} locale={locale} />}
      {tab === 'collections' && <CollectionsDashboard filter={filter} locale={locale} />}
      {tab === 'products' && <ProductsDashboard filter={filter} locale={locale} />}
    </PageShell>
  )
}
