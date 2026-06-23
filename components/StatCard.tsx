'use client'
import { clsx } from 'clsx'
import { motion } from 'framer-motion'
import { Sparkline } from './Sparkline'
import { InfoTooltip } from './InfoTooltip'

export function StatCard({ label, value, delta, spark, accent, infoId, index = 0 }: {
  label: string; value: string; delta?: string; spark?: number[]; accent?: boolean; infoId?: string; index?: number
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: index * 0.04, ease: [0.22, 1, 0.36, 1] }}
      className={clsx('rounded-soft border bg-surface shadow-soft p-5 flex flex-col gap-2', accent ? 'border-accent/30 gradient-highlight' : 'border-border')}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs text-muted leading-tight">{label}{infoId && <InfoTooltip id={infoId} />}</div>
        {spark && <Sparkline data={spark} accent={accent} />}
      </div>
      <div className={clsx('font-display font-semibold tabular-nums leading-none tracking-tight text-3xl md:text-[2rem]', accent ? 'text-accent' : 'text-text')}>{value}</div>
      {delta && <div className="text-xs text-muted">{delta}</div>}
    </motion.div>
  )
}
