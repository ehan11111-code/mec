'use client'
import { clsx } from 'clsx'

// Pure-SVG donut/progress ring with segments. Segments sum is normalised; first/accent segment leads.
export type DonutSegment = { label: string; value: number; accent?: boolean }
const TONES = ['var(--accent)', 'var(--success)', 'var(--warn)', 'var(--muted)', 'var(--border-strong)']

export function DonutStat({ segments, centerValue, centerLabel, size = 150, className }: {
  segments: DonutSegment[]; centerValue?: string; centerLabel?: string; size?: number; className?: string
}) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1
  const r = size / 2 - 10; const cx = size / 2; const cy = size / 2; const circ = 2 * Math.PI * r
  let offset = 0
  return (
    <div className={clsx('flex flex-col sm:flex-row items-center gap-5', className)}>
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" aria-hidden>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border)" strokeWidth={12} />
          {segments.map((seg, i) => {
            const frac = seg.value / total; const len = frac * circ
            const el = (
              <circle key={i} cx={cx} cy={cy} r={r} fill="none"
                stroke={seg.accent ? 'var(--accent)' : TONES[i % TONES.length]} strokeWidth={12}
                strokeDasharray={`${len} ${circ - len}`} strokeDashoffset={-offset} strokeLinecap="butt" />
            )
            offset += len; return el
          })}
        </svg>
        {(centerValue || centerLabel) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {centerValue && <span className="font-display font-semibold text-2xl tabular-nums text-text leading-none">{centerValue}</span>}
            {centerLabel && <span className="text-[11px] text-muted mt-1">{centerLabel}</span>}
          </div>
        )}
      </div>
      <ul className="space-y-1.5">
        {segments.map((seg, i) => (
          <li key={i} className="flex items-center gap-2 text-xs">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: seg.accent ? 'var(--accent)' : TONES[i % TONES.length] }} />
            <span className="text-text-soft">{seg.label}</span>
            <span className="text-muted tabular-nums">· {seg.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
