'use client'
import { clsx } from 'clsx'
import { useTranslations } from 'next-intl'
import type { Status } from '@/lib/mock/types'
const STATUS_TONES: Record<Status, { dot: string; ring: string; label: string }> = {
  running: { dot: 'bg-success', ring: 'text-success', label: 'text-success' },
  awaiting_approval: { dot: 'bg-warn', ring: 'text-warn', label: 'text-warn' },
  exception: { dot: 'bg-accent', ring: 'text-accent', label: 'text-accent' },
  blocked: { dot: 'bg-muted', ring: 'text-muted', label: 'text-muted' }
}
export function StatusPulse({ status, showLabel = true, className }: { status: Status; showLabel?: boolean; className?: string }) {
  const t = useTranslations('status'); const tone = STATUS_TONES[status]
  return (
    <span className={clsx('inline-flex items-center gap-2', className)}>
      <span className={clsx('relative inline-flex items-center justify-center', tone.ring)}>
        <span className={clsx('inline-block h-2 w-2 rounded-full', tone.dot)} aria-hidden />
        {status === 'running' && <span className="absolute inset-0 pulse-ring rounded-full" aria-hidden />}
      </span>
      {showLabel && <span className={clsx('text-xs font-medium', tone.label)}>{t(status)}</span>}
    </span>
  )
}
