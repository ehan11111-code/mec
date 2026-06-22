'use client'
import { Link } from '@/i18n/navigation'
import { motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import type { Department } from '@/lib/mock/types'
import { StatusPulse } from './StatusPulse'
export function DepartmentCard({ dept, locale, index = 0 }: { dept: Department; locale: 'en' | 'ar'; index?: number }) {
  const kpi = dept.kpis[0]
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}>
      <Link href={`/departments/${dept.slug}`}
        className="group block rounded-soft border border-border bg-surface shadow-soft p-5 hover:shadow-card hover:border-border-strong transition-all">
        <div className="flex items-center justify-between gap-3">
          <StatusPulse status={dept.status} />
          <ChevronRight className="h-4 w-4 text-muted group-hover:text-accent flip-rtl transition-colors" strokeWidth={1.7} />
        </div>
        <h3 className="mt-3 text-base font-semibold text-text leading-snug">{dept.name[locale]}</h3>
        <p className="mt-1 text-xs text-muted leading-relaxed line-clamp-2">{dept.contextLine[locale]}</p>
        <div className="mt-4 flex items-end justify-between gap-3 border-t border-border pt-3">
          <div>
            <div className="text-lg font-display font-semibold tabular-nums text-text">{kpi.value}</div>
            <div className="text-[11px] text-muted leading-tight">{kpi.label[locale]}</div>
          </div>
          <div className="text-end">
            <div className="text-lg font-display font-semibold tabular-nums text-accent">{dept.solutions.length}</div>
            <div className="text-[11px] text-muted leading-tight">{locale === 'ar' ? 'وحدات' : 'modules'}</div>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
