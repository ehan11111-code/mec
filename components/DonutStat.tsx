'use client'
import { clsx } from 'clsx'

// Pure-SVG donut/progress ring with segments. Segments sum is normalised; first/accent segment leads.
export type DonutSegment = { label: string; value: number; accent?: boolean }
const TONES = ['var(--accent)', 'var(--success)', 'var(--warn)', 'var(--muted)', 'var(--border-strong)', 'var(--accent-strong)']

export function DonutStat({ segments, centerValue, centerLabel, size = 168, valueFmt, className }: {
  segments: DonutSegment[]; centerValue?: string; centerLabel?: string; size?: number; valueFmt?: (n: number) => string; className?: string
}) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1
  const r = size / 2 - 11; const cx = size / 2; const cy = size / 2; const circ = 2 * Math.PI * r
  const fmt = valueFmt ?? ((n: number) => Math.round(n).toLocaleString('en-US'))
  let offset = 0
  return (
    <div className={clsx('flex flex-col sm:flex-row items-center justify-center gap-6 h-full py-2', className)}>
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" aria-hidden>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border)" strokeWidth={13} />
          {segments.map((seg, i) => {
            const frac = seg.value / total; const len = frac * circ
            const el = (
              <circle key={i} cx={cx} cy={cy} r={r} fill="none"
                stroke={seg.accent ? 'var(--accent)' : TONES[i % TONES.length]} strokeWidth={13}
                strokeDasharray={`${len} ${circ - len}`} strokeDashoffset={-offset} strokeLinecap="butt" />
            )
            offset += len; return el
          })}
        </svg>
        {(centerValue || centerLabel) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center px-2 text-center">
            {centerValue && <span className="font-display font-semibold text-lg md:text-xl tabular-nums text-text leading-tight">{centerValue}</span>}
            {centerLabel && <span className="text-[11px] text-muted mt-1">{centerLabel}</span>}
          </div>
        )}
      </div>
      <ul className="flex-1 min-w-0 space-y-2 w-full max-w-xs">
        {segments.map((seg, i) => (
          <li key={i} className="flex items-center justify-between gap-3 text-xs">
            <span className="inline-flex items-center gap-2 min-w-0">
              <span className="inline-block h-2.5 w-2.5 rounded-full shrink-0" style={{ background: seg.accent ? 'var(--accent)' : TONES[i % TONES.length] }} />
              <span className="text-text-soft truncate">{seg.label}</span>
            </span>
            <span className="tabular-nums font-medium text-text shrink-0">{fmt(seg.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
