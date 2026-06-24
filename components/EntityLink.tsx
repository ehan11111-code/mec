'use client'
import { clsx } from 'clsx'
import { Link } from '@/i18n/navigation'
import { clientIdByName } from '@/lib/data/dataset'

// Clickable client name → opens the client profile. Resolves the name to a client id; if it can't be
// matched, it renders plain text (no dead link).
export function ClientLink({ name, id: idProp, display, className }: { name: string; id?: string; display?: string; className?: string }) {
  const id = idProp || clientIdByName(name)
  const label = display ?? name
  if (!id) return <span className={className}>{label}</span>
  return (
    <Link href={`/clients/${id}`} onClick={e => e.stopPropagation()}
      className={clsx('hover:text-accent hover:underline underline-offset-2 transition-colors', className)}>{label}</Link>
  )
}

// Clickable product name → opens the product page.
export function ProductLink({ item, display, className }: { item: string; display?: string; className?: string }) {
  if (!item) return <span className={className}>{display ?? ''}</span>
  return (
    <Link href={`/products/${encodeURIComponent(item)}`} onClick={e => e.stopPropagation()}
      className={clsx('hover:text-accent hover:underline underline-offset-2 transition-colors', className)}>{display ?? item}</Link>
  )
}
