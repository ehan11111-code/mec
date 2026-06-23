'use client'
import { useMemo } from 'react'
import { useLocale } from 'next-intl'
import { motion } from 'framer-motion'
import { Database, Cpu, Plug, CheckCheck } from 'lucide-react'
import type { Workflow, NodeKind } from '@/lib/mock/types'
import { Panel } from './Panel'
import { InfoTooltip } from './InfoTooltip'
const COLS: Record<string, number> = { source: 0, agent: 1, integration: 2, output: 3 }
const COL_LABEL: Record<string, { en: string; ar: string }> = { source: { en: 'Sources', ar: 'المصادر' }, agent: { en: 'Agent', ar: 'الوكيل' }, integration: { en: 'Integrations', ar: 'التكامل' }, output: { en: 'Output', ar: 'الناتج' } }
const ICON: Record<string, typeof Database> = { source: Database, agent: Cpu, integration: Plug, output: CheckCheck }
// Generic definition for each workflow-node kind (every node gets an explanatory (i)).
const NODE_DEF: Record<NodeKind, { en: string; ar: string }> = {
  source: { en: 'Source — where this step gets its data or trigger from (e.g. WhatsApp, email, ERP).', ar: 'المصدر — من أين تحصل هذه الخطوة على بياناتها أو مُحفّزها (مثل واتساب، البريد، ERP).' },
  agent: { en: 'Agent — the AI step that reads, extracts, validates or decides.', ar: 'الوكيل — خطوة الذكاء الاصطناعي التي تقرأ وتستخرج وتتحقق أو تقرّر.' },
  integration: { en: 'Integration — the system this step writes the result into.', ar: 'التكامل — النظام الذي تكتب فيه هذه الخطوة النتيجة.' },
  output: { en: 'Output — the final result this workflow produces.', ar: 'الناتج — النتيجة النهائية التي ينتجها هذا التدفّق.' }
}
const NODE_SRC = { en: 'Planned automation — built as an n8n workflow (see Automations).', ar: 'أتمتة مخطّطة — تُبنى كتدفّق n8n (انظر الأتمتة).' }
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
                  <div className="flex items-start justify-between gap-1.5">
                    <div className="text-xs md:text-sm text-text leading-snug" dir={locale === 'ar' ? 'rtl' : 'ltr'}>{n.label[locale]}</div>
                    <InfoTooltip def={NODE_DEF[n.kind]} source={NODE_SRC} className="mt-0.5" />
                  </div>
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
