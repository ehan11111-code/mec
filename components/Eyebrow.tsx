import { clsx } from 'clsx'
export function Eyebrow({ children, className, accent }: { children: React.ReactNode; className?: string; accent?: boolean }) {
  return <div className={clsx('text-xs font-medium', accent ? 'text-accent' : 'text-muted', className)}>{children}</div>
}
