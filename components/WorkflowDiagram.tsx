'use client'
import { useMemo } from 'react'
import { useLocale } from 'next-intl'
import { motion } from 'framer-motion'
import { Database, Cpu, Plug, CheckCheck } from 'lucide-react'
import type { Workflow } from '@/lib/mock/types'
import { Panel } from './Panel'
const COLS: Record<string, number> = { source: 0, agent: 1, integration: 2, output: 3 }
const COL_LABEL: Record<string, { en: string; ar: string }> = { source: { en: 'Sources', ar: 'المصادر' }, agent: { en: 'Agent', ar: 'الوكيل' }, integration: { en: 'Integrations', ar: 'التكامل' }, output: { en: 'Output', ar: 'الناتج' } }
const ICON: Record<string, typeof Database> = { source: Database, agent: Cpu, integration: Plug, output: CheckCheck }
export function WorkflowDiagram({ workflow, title, subtitle }: { workflow: Workflow; title?: string; subtitle?: string }) {
  const locale = (useLocale() as 'en' | 'ar') ?? 'en'
  const nodes = workflow.nodes
  const byCol = useMemo(() => { const cols: Record<number, typeof nodes> = { 0: [], 1: [], 2: [], 3: [] }; nodes.forEach(n => { cols[COLS[n.kind]].push(n) }); return cols }, [nodes])
  return (
    <Panel title={title} subtitle={subtitle} showRefresh>
      <div className="relative grid grid-cols-4 gap-3 md:gap-5 [direction:ltr]">
        {[0, 1, 2, 3].map((c, ci) => {
          const kind = Object.keys(COLS).find(k => COLS[k] === c)!; const Icon = ICON[kind]
          return (
            <div key={c} className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-xs text-muted"><Icon className="h-3.5 w-3.5" strokeWidth={1.6} /><span>{COL_LABEL[kind][locale]}</span></div>
              {byCol[c].map((n, ni) => (
                <motion.div key={n.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: ci * 0.1 + ni * 0.05, ease: [0.22, 1, 0.36, 1] }}
                  className={'relative rounded-soft border bg-surface-elev px-3.5 py-3 ' + (kind === 'agent' ? 'border-accent/40 shadow-card' : 'border-border shadow-soft')}>
                  <div className="text-xs md:text-sm text-text leading-snug" dir={locale === 'ar' ? 'rtl' : 'ltr'}>{n.label[locale]}</div>
                  {kind === 'agent' && <span className="absolute -top-1.5 -right-1.5 h-3 w-3 rounded-full bg-accent shadow-soft" aria-hidden />}
                </motion.div>
              ))}
            </div>
          )
        })}
      </div>
    </Panel>
  )
}
