'use client'
import { useEffect, useState } from 'react'
import { Area, ComposedChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Panel } from '../Panel'
import { useTheme } from '../ThemeProvider'
import { fmtSARcompact } from '@/lib/data/dataset'
import type { ForecastPoint } from '@/lib/data/forecast'

// Actual (solid) + forecast (dashed) + 95% confidence band (shaded), from lib/data/forecast.
export function ForecastChart({ points, title, subtitle, valueFormat = 'num', height = 260, locale = 'en', action, actualLabel, forecastLabel }: {
  points: ForecastPoint[]; title?: string; subtitle?: string; valueFormat?: 'sar' | 'num'; height?: number; locale?: 'en' | 'ar'; action?: React.ReactNode; actualLabel: string; forecastLabel: string
}) {
  const { theme } = useTheme(); const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const grid = theme === 'light' ? '#ECE9E1' : '#2A2722'
  const axis = '#8A8780'; const tipBg = theme === 'light' ? '#FFFFFF' : '#1A1A18'
  const fmtFull = (v: number) => valueFormat === 'sar' ? `SAR ${Math.round(v).toLocaleString('en-US')}` : Math.round(v).toLocaleString('en-US')
  const fmtAxis = (v: number) => valueFormat === 'sar' ? fmtSARcompact(v) : (v >= 1000 ? `${Math.round(v / 1000)}K` : String(v))
  const data = points.map(p => ({ ...p, band: p.lo != null && p.hi != null ? [p.lo, p.hi] : null }))
  return (
    <Panel title={title} subtitle={subtitle} action={action}>
      <div style={{ height }}>
        {mounted && (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 8, right: 12, left: 12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 4" stroke={grid} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: axis, fontSize: 11 }} axisLine={false} tickLine={false} reversed={locale === 'ar'} />
              <YAxis width={52} tick={{ fill: axis, fontSize: 11 }} axisLine={false} tickLine={false} orientation={locale === 'ar' ? 'right' : 'left'} tickFormatter={fmtAxis} />
              <Tooltip contentStyle={{ background: tipBg, border: `1px solid ${grid}`, borderRadius: 10, fontSize: 12, color: 'var(--text)' }} labelStyle={{ color: axis }}
                formatter={(v: any, n: string) => { if (n === 'band' || v == null) return [null, null] as any; return [fmtFull(v), n === 'actual' ? actualLabel : forecastLabel] }} />
              <Area dataKey="band" stroke="none" fill="#F36C34" fillOpacity={0.12} isAnimationActive={false} connectNulls />
              <Line dataKey="actual" name="actual" type="monotone" stroke="#F36C34" strokeWidth={2.4} dot={false} activeDot={{ r: 4 }} connectNulls />
              <Line dataKey="forecast" name="forecast" type="monotone" stroke="#F36C34" strokeWidth={2} strokeDasharray="5 5" dot={false} activeDot={{ r: 4 }} connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-4 mt-3">
        <div className="inline-flex items-center gap-2"><span className="inline-block h-1.5 w-4 rounded-full bg-accent" /><span className="text-xs text-muted">{actualLabel}</span></div>
        <div className="inline-flex items-center gap-2"><span className="inline-block h-1.5 w-4 rounded-full border-t-2 border-dashed border-accent" /><span className="text-xs text-muted">{forecastLabel}</span></div>
        <div className="inline-flex items-center gap-2"><span className="inline-block h-2.5 w-4 rounded bg-accent/15" /><span className="text-xs text-muted">{locale === 'ar' ? 'نطاق ثقة 95%' : '95% confidence'}</span></div>
      </div>
    </Panel>
  )
}
