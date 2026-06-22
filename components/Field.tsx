import { clsx } from 'clsx'
export function Field({ label, type = 'text', value, onChange, placeholder, autoComplete, className }: {
  label: string; type?: string; value: string; onChange: (v: string) => void; placeholder?: string; autoComplete?: string; className?: string
}) {
  return (
    <label className={clsx('block', className)}>
      <span className="block text-xs font-medium text-text-soft mb-1.5">{label}</span>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} autoComplete={autoComplete}
        className="w-full rounded-soft border border-border bg-surface px-3.5 py-2.5 text-sm text-text placeholder:text-muted focus:border-accent transition-colors" />
    </label>
  )
}
