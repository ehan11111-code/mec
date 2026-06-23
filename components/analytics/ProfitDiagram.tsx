'use client'
import { useLocale, useTranslations } from 'next-intl'
import { clsx } from 'clsx'
import { AlertTriangle, CheckCircle2, HelpCircle } from 'lucide-react'
import { Panel } from '@/components/Panel'
import { fmtSAR, categoryLabel, type ProductMargin } from '@/lib/data/dataset'

// Per-product gross-profit diagram: each product's sell price (per carton) is drawn as a bar split
// into COST (grey) and PROFIT (green = clears the min margin, amber = below min, red = sold at a loss).
// A dashed marker shows the minimum-margin floor so you instantly see which products breach it.
function Row({ p, locale, maxSell }: { p: ProductMargin; locale: 'en' | 'ar'; maxSell: number }) {
  const t = useTranslations('analytics')
  const sell = p.avgSell || 1
  const scale = sell / (maxSell || 1)                       // bar width relative to the priciest product
  const costFrac = p.unitCost != null ? Math.min(1, p.unitCost / sell) : 0
  const loss = p.marginPct != null && p.marginPct < 0
  const below = p.belowMin && !loss
  const profitTone = p.confidence === 'none' ? 'bg-border' : loss ? 'bg-accent' : below ? 'bg-warn' : 'bg-success'
  const floorMark = 1 - p.minMargin / 100                   // cost must stay left of this point
  return (
    <div className="px-5 md:px-6 py-3 flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-text truncate min-w-0">{p.item}</span>
        <span className="shrink-0 inline-flex items-center gap-2">
          {p.confidence === 'none'
            ? <span className="inline-flex items-center gap-1 text-[11px] text-muted"><HelpCircle className="h-3 w-3" />{t('costNa')}</span>
            : <>
              <span className={clsx('text-xs font-medium tabular-nums', loss ? 'text-accent' : below ? 'text-warn' : 'text-success')}>{p.marginPct}%</span>
              {loss ? <AlertTriangle className="h-3.5 w-3.5 text-accent" /> : below ? <AlertTriangle className="h-3.5 w-3.5 text-warn" /> : <CheckCircle2 className="h-3.5 w-3.5 text-success" />}
            </>}
        </span>
      </div>
      {/* the diagram bar */}
      <div className="relative h-5 rounded-full bg-bg-soft overflow-hidden" style={{ width: `${Math.max(12, scale * 100)}%` }}>
        {p.confidence !== 'none' && <>
          <div className="absolute inset-y-0 start-0 bg-border-strong" style={{ width: `${costFrac * 100}%` }} title={`${t('avgCost')} ${fmtSAR(p.unitCost ?? 0)}`} />
          <div className={clsx('absolute inset-y-0', profitTone)} style={{ insetInlineStart: `${costFrac * 100}%`, width: `${Math.max(0, (1 - costFrac)) * 100}%` }} />
          {/* min-margin floor marker */}
          <div className="absolute inset-y-0 w-px bg-text/60" style={{ insetInlineStart: `${Math.min(100, Math.max(0, floorMark * 100))}%` }} title={`${t('minMargin')} ${p.minMargin}%`} />
        </>}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-[11px] text-muted tabular-nums">
        <span>{categoryLabel(p.category, locale)}</span>
        <span>· {t('avgSell')} {fmtSAR(p.avgSell)}</span>
        {p.unitCost != null && <span>· {t('avgCost')} {fmtSAR(p.unitCost)}</span>}
        {p.unitProfit != null && <span className={p.unitProfit < 0 ? 'text-accent' : ''}>· {t('unitProfit')} {fmtSAR(p.unitProfit)}</span>}
        {p.grossProfit != null && <span className={clsx('font-medium', p.grossProfit < 0 ? 'text-accent' : 'text-text-soft')}>· {t('grossProfit')} {fmtSAR(p.grossProfit)}</span>}
        <span>· {p.units.toLocaleString('en-US')} {t('cartons')}</span>
      </div>
    </div>
  )
}

export function ProfitDiagram({ rows, title, subtitle }: { rows: ProductMargin[]; title: string; subtitle?: string }) {
  const locale = useLocale() as 'en' | 'ar'
  const t = useTranslations('analytics')
  const maxSell = Math.max(...rows.map(r => r.avgSell), 1)
  return (
    <Panel title={title} subtitle={subtitle} bodyClassName="px-0 pb-2">
      <div className="px-5 md:px-6 pb-2 flex flex-wrap items-center gap-4 text-[11px] text-muted">
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-3 rounded-sm bg-border-strong" />{t('legendCost')}</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-3 rounded-sm bg-success" />{t('legendProfit')}</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-3 rounded-sm bg-warn" />{t('legendBelow')}</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-3 rounded-sm bg-accent" />{t('legendLoss')}</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-px bg-text/60" />{t('legendFloor')}</span>
      </div>
      <div className="divide-y divide-border">
        {rows.map((p, i) => <Row key={i} p={p} locale={locale} maxSell={maxSell} />)}
      </div>
    </Panel>
  )
}
