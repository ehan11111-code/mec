import type { ActivityEvent } from '@/lib/mock/types'
import { Panel } from './Panel'
import { StatusPulse } from './StatusPulse'
function formatTs(ts: string) { const d = new Date(ts); return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}` }
export function ActivityTrail({ events, locale, title, subtitle, showDept = false, maxHeight }: {
  events: ActivityEvent[]; locale: 'en' | 'ar'; title?: string; subtitle?: string; showDept?: boolean; maxHeight?: number
}) {
  return (
    <Panel title={title} subtitle={subtitle} bodyClassName="px-0 pb-0" showRefresh>
      <ul className="divide-y divide-border overflow-y-auto scrollbar-soft" style={maxHeight ? { maxHeight } : undefined}>
        {events.map((e, i) => (
          <li key={i} className="px-5 md:px-6 py-3 flex items-start gap-4">
            <span className="shrink-0 text-xs tabular-nums text-muted mt-0.5 w-12">{formatTs(e.ts)}</span>
            {e.status && <StatusPulse status={e.status} showLabel={false} className="mt-1.5" />}
            <div className="flex-1 min-w-0"><p className="text-sm text-text leading-snug">{e.text[locale]}</p>{showDept && e.dept && <p className="text-xs text-muted mt-0.5">{e.dept}</p>}</div>
          </li>
        ))}
      </ul>
    </Panel>
  )
}
