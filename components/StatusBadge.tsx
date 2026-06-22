'use client'
import { clsx } from 'clsx'
import { useTranslations } from 'next-intl'
import type { OrderStatus } from '@/lib/data/dataset'

const TONE: Record<OrderStatus, string> = {
  under_approval: 'bg-warn-soft text-warn',
  approved: 'bg-success-soft text-success',
  dispatched: 'bg-accent-soft text-accent',
  on_route: 'bg-accent-soft text-accent',
  delivered: 'bg-success-soft text-success',
  payment_pending: 'bg-warn-soft text-warn',
  overdue: 'bg-accent-soft text-accent',
  paid: 'bg-success-soft text-success',
  cancelled: 'bg-bg-soft text-muted'
}

export function StatusBadge({ status }: { status: OrderStatus }) {
  const t = useTranslations('orderStatus')
  return <span className={clsx('inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap', TONE[status])}>{t(status)}</span>
}
