'use client'
import { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Panel } from './Panel'
import { useTheme } from './ThemeProvider'

export type BarDatum = { label: string; value: number; accent?: boolean }

export function BarChartPanel({ data, title, subtitle, height = 260, locale = 'en' }: {
  data: BarDatum[]; title?: string; subtitle?: string; height?: number; locale?: 'en' | 'ar'
}) {
  const { theme } = useTheme(); const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const grid = theme === 'light' ? '#ECE9E1' : '#2A2722'
  const axis = '#8A8780'; const base = theme === 'light' ? '#C7C3B8' : '#5A574F'
  const tipBg = theme === 'light' ? '#FFFFFF' : '#1A1A18'
  return (
    <Panel title={title} subtitle={subtitle} showRefresh>
      <div style={{ height }}>
        {mounted && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 4" stroke={grid} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: axis, fontSize: 11 }} axisLine={false} tickLine={false} interval={0} angle={data.length > 6 ? -25 : 0} textAnchor={data.length > 6 ? 'end' : 'middle'} height={data.length > 6 ? 56 : 28} reversed={locale === 'ar'} />
              <YAxis tick={{ fill: axis, fontSize: 11 }} axisLine={false} tickLine={false} orientation={locale === 'ar' ? 'right' : 'left'} />
              <Tooltip cursor={{ fill: 'var(--accent-soft)' }} contentStyle={{ background: tipBg, border: `1px solid ${grid}`, borderRadius: 10, fontSize: 12, color: 'var(--text)' }} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={48}>
                {data.map((d, i) => <Cell key={i} fill={d.accent ? '#F36C34' : base} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Panel>
  )
}
