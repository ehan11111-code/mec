'use client'
import { Link } from '@/i18n/navigation'
import { useLocale } from 'next-intl'
import { clsx } from 'clsx'
import type { Department } from '@/lib/mock/types'
import { Panel } from './Panel'
import { StatusPulse } from './StatusPulse'
export function DeptHeatStrip({ departments, title, subtitle }: { departments: Department[]; title?: string; subtitle?: string }) {
  const locale = useLocale() as 'en' | 'ar'
  return (
    <Panel title={title} subtitle={subtitle} showRefresh>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {departments.map(d => (
          <Link key={d.slug} href={`/departments/${d.slug}`}
            className={clsx('group rounded-soft border bg-surface-elev p-4 transition-all hover:shadow-card',
              d.status === 'exception' ? 'border-accent/40' : d.status === 'awaiting_approval' ? 'border-warn/40' : 'border-border')}>
            <div className="flex items-center justify-between gap-2">
              <StatusPulse status={d.status} showLabel={false} />
              <span className="text-xs text-muted tabular-nums">{d.openExceptions}</span>
            </div>
            <div className="mt-2 text-sm font-medium text-text leading-snug truncate group-hover:text-accent transition-colors">{d.name[locale]}</div>
            <div className="text-[11px] text-muted">{d.solutions.length} {locale === 'ar' ? 'وحدات' : 'modules'}</div>
          </Link>
        ))}
      </div>
    </Panel>
  )
}
