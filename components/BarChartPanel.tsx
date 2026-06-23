'use client'
import { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Panel } from './Panel'
import { useTheme } from './ThemeProvider'
import { fmtSARcompact } from '@/lib/data/dataset'

export type BarDatum = { label: string; value: number; accent?: boolean }
export type ValueFormat = 'sar' | 'pct' | 'num'

const fmtFull = (v: number, f: ValueFormat) => f === 'sar' ? `SAR ${Math.round(v).toLocaleString('en-US')}` : f === 'pct' ? `${v}%` : Math.round(v).toLocaleString('en-US')
const fmtAxis = (v: number, f: ValueFormat) => f === 'sar' ? fmtSARcompact(v) : f === 'pct' ? `${v}%` : v >= 1000 ? `${Math.round(v / 1000)}K` : String(v)

export function BarChartPanel({ data, title, subtitle, height = 260, locale = 'en', valueFormat = 'num', valueLabel, action }: {
  data: BarDatum[]; title?: string; subtitle?: string; height?: number; locale?: 'en' | 'ar'; valueFormat?: ValueFormat; valueLabel?: string; action?: React.ReactNode
}) {
  const { theme } = useTheme(); const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const grid = theme === 'light' ? '#ECE9E1' : '#2A2722'
  const axis = '#8A8780'; const base = theme === 'light' ? '#C7C3B8' : '#5A574F'
  const tipBg = theme === 'light' ? '#FFFFFF' : '#1A1A18'
  const name = valueLabel ?? (locale === 'ar' ? 'القيمة' : 'Value')
  return (
    <Panel title={title} subtitle={subtitle} showRefresh action={action}>
      <div style={{ height }}>
        {mounted && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 12, left: 12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 4" stroke={grid} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: axis, fontSize: 11 }} axisLine={false} tickLine={false} interval={0} angle={data.length > 6 ? -25 : 0} textAnchor={data.length > 6 ? 'end' : 'middle'} height={data.length > 6 ? 56 : 28} reversed={locale === 'ar'} />
              <YAxis width={52} tick={{ fill: axis, fontSize: 11 }} axisLine={false} tickLine={false} orientation={locale === 'ar' ? 'right' : 'left'} tickFormatter={(v: number) => fmtAxis(v, valueFormat)} />
              <Tooltip cursor={{ fill: 'var(--accent-soft)' }} contentStyle={{ background: tipBg, border: `1px solid ${grid}`, borderRadius: 10, fontSize: 12, color: 'var(--text)' }}
                formatter={(v: number) => [fmtFull(v, valueFormat), name]} />
              <Bar dataKey="value" name={name} radius={[6, 6, 0, 0]} maxBarSize={48}>
                {data.map((d, i) => <Cell key={i} fill={d.accent ? '#F36C34' : base} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Panel>
  )
}
