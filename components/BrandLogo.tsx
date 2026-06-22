import { clsx } from 'clsx'

// Jarvis AI wordmark + hex-circuit mark. The portal is delivered by Jarvis AI Agency for client MEC.
export function BrandLogo({ size = 'md', markOnly = false, variant = 'horizontal', className }: {
  size?: 'sm' | 'md' | 'lg'; markOnly?: boolean; variant?: 'horizontal' | 'stacked'; className?: string
}) {
  const dim = size === 'sm' ? 22 : size === 'lg' ? 40 : 30
  const textSize = size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-xl' : 'text-base'
  const mark = (
    <svg width={dim} height={dim} viewBox="0 0 32 32" fill="none" aria-hidden className="shrink-0">
      <path d="M16 2L28 9V23L16 30L4 23V9L16 2Z" stroke="var(--accent)" strokeWidth="1.6" />
      <path d="M16 9L22 12.5V19.5L16 23L10 19.5V12.5L16 9Z" fill="var(--accent-soft)" stroke="var(--accent)" strokeWidth="1.2" />
      <circle cx="16" cy="16" r="2.4" fill="var(--accent)" />
    </svg>
  )
  if (markOnly) return <span className={className}>{mark}</span>
  return (
    <span className={clsx('inline-flex items-center', variant === 'stacked' ? 'flex-col gap-1' : 'gap-2.5', className)}>
      {mark}
      <span className={clsx('font-display font-semibold tracking-tight leading-none', textSize)}>
        <span className="text-text">JARVIS </span><span className="text-accent">AI</span>
      </span>
    </span>
  )
}
