'use client'
import { Link } from '@/i18n/navigation'
import { motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import type { Solution } from '@/lib/mock/types'
import { StatusPulse } from './StatusPulse'
export function SolutionStatusCard({ solution, deptSlug, locale, index = 0 }: { solution: Solution; deptSlug: string; locale: 'en' | 'ar'; index?: number }) {
  const kpi = solution.kpis.find(k => k.highlight) ?? solution.kpis[0]
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}>
      <Link href={`/departments/${deptSlug}/${solution.slug}`}
        className="group block rounded-soft border border-border bg-surface shadow-soft p-5 hover:shadow-card hover:border-border-strong transition-all">
        <div className="flex items-center justify-between gap-3">
          <StatusPulse status={solution.status} />
          <ChevronRight className="h-4 w-4 text-muted group-hover:text-accent flip-rtl transition-colors" strokeWidth={1.7} />
        </div>
        <h3 className="mt-3 text-base font-semibold text-text leading-snug">{solution.name[locale]}</h3>
        <p className="mt-1 text-xs text-muted leading-relaxed line-clamp-2">{solution.context[locale]}</p>
        <div className="mt-4 flex items-end justify-between gap-3 border-t border-border pt-3">
          <div>
            <div className="text-lg font-display font-semibold tabular-nums text-accent">{kpi.value}</div>
            <div className="text-[11px] text-muted leading-tight">{kpi.label[locale]}</div>
          </div>
          <div className="flex flex-wrap gap-1 justify-end max-w-[55%]">
            {solution.integratedSystems.slice(0, 3).map(s => (
              <span key={s} className="inline-flex items-center rounded-full border border-border bg-bg-soft px-2 py-0.5 text-[10px] text-muted">{s}</span>
            ))}
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
