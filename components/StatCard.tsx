'use client'
import { useState } from 'react'
import { clsx } from 'clsx'
import { motion } from 'framer-motion'
import { Calculator } from 'lucide-react'
import { Sparkline } from './Sparkline'
import { InfoTooltip } from './InfoTooltip'
import { Money } from './Money'
import { BreakdownModal, type BreakdownData } from './BreakdownModal'

// Pass `value` (pre-formatted string) for non-money figures, or `amount` (raw number) for money — the
// latter renders a tappable VAT-inclusive/exclusive toggle. `vatBase` says whether `amount` includes VAT.
// Pass `breakdown` to make the figure clickable → a modal showing exactly how it's calculated.
export function StatCard({ label, value, amount, vatBase = 'gross', delta, spark, accent, infoId, breakdown, index = 0 }: {
  label: string; value?: string; amount?: number; vatBase?: 'gross' | 'net'; delta?: string; spark?: number[]; accent?: boolean; infoId?: string; breakdown?: BreakdownData; index?: number
}) {
  const [open, setOpen] = useState(false)
  const valueCls = clsx('font-display font-semibold tabular-nums leading-none tracking-tight text-3xl md:text-[2rem]', accent ? 'text-accent' : 'text-text')
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: index * 0.04, ease: [0.22, 1, 0.36, 1] }}
      className={clsx('rounded-soft border bg-surface shadow-soft p-5 flex flex-col gap-2', accent ? 'border-accent/30 gradient-highlight' : 'border-border')}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs text-muted leading-tight">{label}{infoId && <InfoTooltip id={infoId} />}</div>
        {spark && <Sparkline data={spark} accent={accent} />}
      </div>
      {breakdown
        ? <button type="button" onClick={() => setOpen(true)} title={breakdown.title} className="group flex items-center gap-1.5 text-start">
            {amount != null ? <Money amount={amount} base={vatBase} valueClassName={valueCls} /> : <div className={valueCls}>{value}</div>}
            <Calculator className="h-3.5 w-3.5 text-accent/40 group-hover:text-accent transition-colors print:hidden shrink-0" strokeWidth={1.8} />
          </button>
        : amount != null
          ? <Money amount={amount} base={vatBase} valueClassName={valueCls} />
          : <div className={valueCls}>{value}</div>}
      {delta && <div className="text-xs text-muted">{delta}</div>}
      {open && breakdown && <BreakdownModal data={breakdown} onClose={() => setOpen(false)} />}
    </motion.div>
  )
}
