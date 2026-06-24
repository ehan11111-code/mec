'use client'
import { clsx } from 'clsx'
import { initials } from '@/lib/auth/users'

// Profile avatar — shows the uploaded picture if present, else initials on the user's tint.
export function Avatar({ name, src, color = '#F36C34', size = 36, className }: {
  name: string; src?: string | null; color?: string; size?: number; className?: string
}) {
  const style = { width: size, height: size }
  if (src) return <img src={src} alt={name} style={style} className={clsx('rounded-full object-cover border border-border', className)} />
  return (
    <span style={{ ...style, background: color }}
      className={clsx('inline-flex items-center justify-center rounded-full text-white font-semibold select-none', className)}>
      <span style={{ fontSize: size * 0.4 }}>{initials(name)}</span>
    </span>
  )
}
