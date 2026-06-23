'use client'
import { useEffect, useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Panel } from './Panel'
import { useTheme } from './ThemeProvider'

export type LineSeries = { key: string; label: string; accent?: boolean }
export type LineRow = { t: string } & Record<string, number | string>

export function LineChartPanel({ data, series, title, subtitle, height = 260, locale = 'en', action }: {
  data: LineRow[]; series: LineSeries[]; title?: string; subtitle?: string; height?: number; locale?: 'en' | 'ar'; action?: React.ReactNode
}) {
  const { theme } = useTheme(); const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const grid = theme === 'light' ? '#ECE9E1' : '#2A2722'
  const axis = '#8A8780'; const base = theme === 'light' ? '#B9B5AA' : '#6E6B63'
  const tipBg = theme === 'light' ? '#FFFFFF' : '#1A1A18'
  const colors = ['#F36C34', base, '#6BCC78', '#F2B868']
  return (
    <Panel title={title} subtitle={subtitle} showRefresh action={action}>
      <div style={{ height }}>
        {mounted && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 4" stroke={grid} vertical={false} />
              <XAxis dataKey="t" tick={{ fill: axis, fontSize: 11 }} axisLine={false} tickLine={false} reversed={locale === 'ar'} />
              <YAxis tick={{ fill: axis, fontSize: 11 }} axisLine={false} tickLine={false} orientation={locale === 'ar' ? 'right' : 'left'} />
              <Tooltip contentStyle={{ background: tipBg, border: `1px solid ${grid}`, borderRadius: 10, fontSize: 12, color: 'var(--text)' }} labelStyle={{ color: axis }} />
              {series.map((s, i) => (
                <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.accent ? '#F36C34' : colors[i % colors.length]}
                  strokeWidth={s.accent ? 2.4 : 1.8} dot={false} activeDot={{ r: 4 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
      {series.length > 1 && (
        <div className="flex flex-wrap items-center gap-4 mt-3">
          {series.map((s, i) => (
            <div key={s.key} className="inline-flex items-center gap-2">
              <span className="inline-block h-1.5 w-4 rounded-full" style={{ background: s.accent ? '#F36C34' : colors[i % colors.length] }} />
              <span className="text-xs text-muted">{s.label}</span>
            </div>
          ))}
        </div>
      )}
    </Panel>
  )
}
