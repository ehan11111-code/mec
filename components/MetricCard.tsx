'use client'
import { clsx } from 'clsx'
import { motion } from 'framer-motion'
import type { KPI } from '@/lib/mock/types'
export function MetricCard({ kpi, locale, compact, index = 0 }: { kpi: KPI; locale: 'en' | 'ar'; compact?: boolean; index?: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: index * 0.04, ease: [0.22, 1, 0.36, 1] }}
      className={clsx('rounded-soft border bg-surface shadow-soft flex flex-col gap-2 transition-shadow hover:shadow-card', kpi.highlight ? 'border-accent/30 gradient-highlight' : 'border-border', compact ? 'p-4' : 'p-5')}>
      <div className="text-xs text-muted leading-tight">{kpi.label[locale]}</div>
      <div className={clsx('font-display font-semibold tabular-nums leading-none tracking-tight', kpi.highlight ? 'text-accent' : 'text-text', compact ? 'text-2xl' : 'text-3xl md:text-[2rem]')}>{kpi.value}</div>
      {kpi.delta && <div className="text-xs text-muted">{kpi.delta}</div>}
    </motion.div>
  )
}
export function MetricRow({ kpis, locale, compact }: { kpis: KPI[]; locale: 'en' | 'ar'; compact?: boolean }) {
  return (
    <div className={clsx('grid gap-3 md:gap-4', kpis.length >= 6 ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6' : 'grid-cols-2 md:grid-cols-4')}>
      {kpis.map((kpi, i) => <MetricCard key={i} kpi={kpi} locale={locale} compact={compact} index={i} />)}
    </div>
  )
}
