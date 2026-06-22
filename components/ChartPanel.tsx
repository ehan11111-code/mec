'use client'
import { useEffect, useState } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Chart } from '@/lib/mock/types'
import { Panel } from './Panel'
import { useTheme } from './ThemeProvider'
function paletteFor(theme: 'light' | 'dark') {
  return {
    grid: theme === 'light' ? '#ECE9E1' : '#2A2722', axis: '#8A8780', base: theme === 'light' ? '#B9B5AA' : '#6E6B63',
    accent: '#F36C34', tooltipBg: theme === 'light' ? '#FFFFFF' : '#1A1A18', tooltipBorder: theme === 'light' ? '#E8E5DC' : '#2A2722', tooltipText: theme === 'light' ? '#1E1E1C' : '#F2F0EA'
  }
}
export function ChartPanel({ chart, locale, height = 240, title }: { chart: Chart; locale: 'en' | 'ar'; height?: number; title?: string }) {
  const { theme } = useTheme(); const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), []); const p = paletteFor(theme)
  const data = chart.series[0].data.map((pt, i) => { const row: Record<string, number | string> = { t: pt.t }; chart.series.forEach(s => { row[s.key] = s.data[i]?.v ?? 0 }); return row })
  return (
    <Panel title={title ?? chart.title[locale]} showRefresh>
      <div style={{ height }}>
        {mounted && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <defs>{chart.series.map(s => (
                <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={s.highlight ? p.accent : p.base} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={s.highlight ? p.accent : p.base} stopOpacity={0} />
                </linearGradient>))}
              </defs>
              <CartesianGrid strokeDasharray="3 4" stroke={p.grid} vertical={false} />
              <XAxis dataKey="t" tick={{ fill: p.axis, fontSize: 11 }} axisLine={false} tickLine={false} reversed={locale === 'ar'} />
              <YAxis tick={{ fill: p.axis, fontSize: 11 }} axisLine={false} tickLine={false} orientation={locale === 'ar' ? 'right' : 'left'} />
              <Tooltip cursor={{ stroke: p.accent, strokeWidth: 1, strokeDasharray: '4 4' }}
                contentStyle={{ background: p.tooltipBg, border: `1px solid ${p.tooltipBorder}`, borderRadius: 10, fontSize: 12, color: p.tooltipText }}
                labelStyle={{ color: p.axis, fontWeight: 500 }} />
              {chart.series.map(s => (
                <Area key={s.key} type="monotone" dataKey={s.key} stroke={s.highlight ? p.accent : p.base} strokeWidth={s.highlight ? 2.4 : 1.6}
                  fill={`url(#grad-${s.key})`} name={s.label[locale]} activeDot={{ r: 4, fill: s.highlight ? p.accent : p.base, stroke: p.tooltipBg, strokeWidth: 2 }} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
      <div className="flex items-center gap-5 mt-3">
        {chart.series.map(s => (<div key={s.key} className="inline-flex items-center gap-2">
          <span className="inline-block h-1.5 w-4 rounded-full" style={{ background: s.highlight ? p.accent : p.base }} aria-hidden />
          <span className="text-xs text-muted">{s.label[locale]}</span></div>))}
      </div>
    </Panel>
  )
}
