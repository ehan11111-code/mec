'use client'
import { useState } from 'react'
import { clsx } from 'clsx'
import { useTranslations } from 'next-intl'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Pencil, XCircle, AlertCircle } from 'lucide-react'
import type { Intervention } from '@/lib/mock/types'
import { Panel } from './Panel'
const SEV_TONE: Record<string, { icon: string; bg: string }> = { high: { icon: 'text-accent', bg: 'bg-accent-soft' }, medium: { icon: 'text-warn', bg: 'bg-warn-soft' }, low: { icon: 'text-muted', bg: 'bg-bg-soft' } }
export function InterventionQueue({ interventions, locale, title, subtitle }: { interventions: Intervention[]; locale: 'en' | 'ar'; title?: string; subtitle?: string }) {
  const t = useTranslations('common'); const tSol = useTranslations('solution'); const tCtrl = useTranslations('control')
  const [resolved, setResolved] = useState<Record<string, 'approved' | 'override' | 'rejected'>>({})
  const [toast, setToast] = useState<string | null>(null)
  const act = (id: string, kind: 'approved' | 'override' | 'rejected') => { setResolved(r => ({ ...r, [id]: kind })); setToast(tSol('actionApplied')); setTimeout(() => setToast(null), 2400) }
  return (
    <Panel title={title} subtitle={subtitle} bodyClassName="px-0 pb-0" showRefresh>
      {interventions.length === 0 && <p className="px-5 md:px-6 py-8 text-sm text-muted text-center">{tCtrl('noInterventions')}</p>}
      <ul className="divide-y divide-border">
        {interventions.map((iv) => {
          const done = resolved[iv.id]; const tone = SEV_TONE[iv.severity]
          return (
            <li key={iv.id} className="px-5 md:px-6 py-4 flex flex-col gap-3 md:flex-row md:items-start md:gap-4">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <span className={clsx('shrink-0 inline-flex items-center justify-center h-8 w-8 rounded-full', tone.bg)}><AlertCircle className={clsx('h-4 w-4', tone.icon)} strokeWidth={1.6} /></span>
                <div className="min-w-0"><p className="text-sm text-text leading-snug">{iv.text[locale]}</p><p className="text-xs text-muted mt-1">{iv.id}</p></div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {done ? <span className="inline-flex items-center text-xs font-medium text-success bg-success-soft rounded-full px-3 py-1">{done}</span> : (<>
                  <ActionBtn label={t('approve')} onClick={() => act(iv.id, 'approved')} icon={CheckCircle2} primary />
                  <ActionBtn label={t('override')} onClick={() => act(iv.id, 'override')} icon={Pencil} />
                  <ActionBtn label={t('reject')} onClick={() => act(iv.id, 'rejected')} icon={XCircle} />
                </>)}
              </div>
            </li>
          )
        })}
      </ul>
      <AnimatePresence>{toast && <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="px-5 md:px-6 py-3 border-t border-border text-xs text-success bg-success-soft">{toast}</motion.div>}</AnimatePresence>
    </Panel>
  )
}
function ActionBtn({ label, onClick, icon: Icon, primary }: { label: string; onClick: () => void; icon: typeof CheckCircle2; primary?: boolean }) {
  return <button type="button" onClick={onClick} className={clsx('inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all', primary ? 'bg-accent text-white hover:bg-accent-strong shadow-soft' : 'border border-border bg-surface text-text-soft hover:bg-surface-elev hover:text-text')}><Icon className="h-3.5 w-3.5" strokeWidth={1.6} />{label}</button>
}
