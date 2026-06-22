'use client'
// Lightweight inline SVG sparkline — no chart lib, cheap to render in KPI cards.
export function Sparkline({ data, width = 96, height = 28, accent = false }: { data: number[]; width?: number; height?: number; accent?: boolean }) {
  if (!data.length) return null
  const min = Math.min(...data); const max = Math.max(...data); const span = max - min || 1
  const step = data.length > 1 ? width / (data.length - 1) : width
  const pts = data.map((v, i) => `${(i * step).toFixed(1)},${(height - ((v - min) / span) * (height - 4) - 2).toFixed(1)}`)
  const stroke = accent ? 'var(--accent)' : 'var(--muted)'
  const fillId = `spark-${accent ? 'a' : 'm'}`
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible" aria-hidden>
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity={0.22} />
          <stop offset="100%" stopColor={stroke} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon points={`0,${height} ${pts.join(' ')} ${width},${height}`} fill={`url(#${fillId})`} />
      <polyline points={pts.join(' ')} fill="none" stroke={stroke} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
