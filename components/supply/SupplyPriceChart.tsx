'use client'
import { useEffect, useState } from 'react'
import { Area, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts'
import { useTheme } from '../ThemeProvider'
import type { PriceBaseline } from '@/lib/data/priceBaseline'
import type { PriceOutlook } from '@/lib/data/supply'

// Real monthly purchase-cost history (from MEC's own data) + a forecast cone (low..high) projected
// from the market outlook. The "wow" chart: actual history anchored to a sourced forecast.
export function SupplyPriceChart({ baseline, outlook, height = 200, locale = 'en' }: {
  baseline: PriceBaseline; outlook?: PriceOutlook | null; height?: number; locale?: 'en' | 'ar'
}) {
  const { theme } = useTheme(); const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const grid = theme === 'light' ? '#ECE9E1' : '#2A2722'
  const axis = '#8A8780'; const tipBg = theme === 'light' ? '#FFFFFF' : '#1A1A18'
  const actual = theme === 'light' ? '#3E3A33' : '#D8D4CC'

  const last = baseline.latest
  const mid = outlook ? Math.round(last * (1 + outlook.change_pct / 100)) : null
  const lo = outlook ? Math.round(last * (1 + outlook.low_pct / 100)) : null
  const hi = outlook ? Math.round(last * (1 + outlook.high_pct / 100)) : null

  const rows: any[] = baseline.series.map((s, i) => {
    const isLast = i === baseline.series.length - 1
    return { t: s.month.slice(2), cost: s.cost, fc: isLast ? s.cost : null, range: isLast && outlook ? [s.cost, s.cost] : null }
  })
  if (outlook) rows.push({ t: locale === 'ar' ? 'توقّع' : 'F’cast', cost: null, fc: mid, range: [lo, hi] })

  const fmt = (v: number) => `SAR ${Math.round(v).toLocaleString('en-US')}`
  return (
    <div style={{ height }}>
      {mounted && (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 8, right: 10, left: 6, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 4" stroke={grid} vertical={false} />
            <XAxis dataKey="t" tick={{ fill: axis, fontSize: 10 }} axisLine={false} tickLine={false} reversed={locale === 'ar'} interval="preserveStartEnd" />
            <YAxis width={46} tick={{ fill: axis, fontSize: 10 }} axisLine={false} tickLine={false} orientation={locale === 'ar' ? 'right' : 'left'}
              domain={['dataMin - 15', 'dataMax + 15']} tickFormatter={(v: number) => Math.round(v).toLocaleString('en-US')} />
            <Tooltip contentStyle={{ background: tipBg, border: `1px solid ${grid}`, borderRadius: 10, fontSize: 12 }} labelStyle={{ color: axis }}
              formatter={(v: any, n: string) => { if (Array.isArray(v)) return [`${fmt(v[0])} – ${fmt(v[1])}`, 'Forecast range']; return [fmt(v), n === 'cost' ? 'Actual cost' : 'Forecast'] }} />
            <Area dataKey="range" stroke="none" fill="#F36C34" fillOpacity={0.16} isAnimationActive={false} connectNulls />
            <Line dataKey="cost" name="cost" type="monotone" stroke={actual} strokeWidth={2} dot={false} isAnimationActive={false} connectNulls />
            <Line dataKey="fc" name="fc" type="monotone" stroke="#F36C34" strokeWidth={2.2} strokeDasharray="5 4" dot={{ r: 3, fill: '#F36C34' }} isAnimationActive={false} connectNulls />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
