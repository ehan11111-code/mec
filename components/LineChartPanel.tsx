'use client'
import { useEffect, useState } from 'react'
import { clsx } from 'clsx'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Panel } from './Panel'
import { useTheme } from './ThemeProvider'
import { fmtSARcompact } from '@/lib/data/dataset'

export type LineSeries = { key: string; label: string; accent?: boolean }
export type LineRow = { t: string } & Record<string, number | string>

// Timeframe options for the trend selector (months of tail to show; 0 = all).
const WINDOWS: { v: number; k: string }[] = [{ v: 0, k: 'all' }, { v: 6, k: '6m' }, { v: 3, k: '3m' }]
const WIN_LABEL: Record<string, { en: string; ar: string }> = {
  all: { en: 'All', ar: 'الكل' }, '6m': { en: '6M', ar: '6 أشهر' }, '3m': { en: '3M', ar: '3 أشهر' }
}

export function LineChartPanel({ data, series, title, subtitle, height = 260, locale = 'en', valueFormat = 'sar', action, enableTimeframe }: {
  data: LineRow[]; series: LineSeries[]; title?: string; subtitle?: string; height?: number; locale?: 'en' | 'ar'; valueFormat?: 'sar' | 'num'; action?: React.ReactNode; enableTimeframe?: boolean
}) {
  const { theme } = useTheme(); const [mounted, setMounted] = useState(false)
  const [win, setWin] = useState(0)
  useEffect(() => setMounted(true), [])
  const shown = enableTimeframe && win > 0 ? data.slice(-win) : data
  const timeframeSelector = enableTimeframe ? (
    <div className="inline-flex rounded-full border border-border bg-bg-soft p-0.5 print:hidden">
      {WINDOWS.map(w => (
        <button key={w.k} type="button" onClick={() => setWin(w.v)}
          className={clsx('px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-colors', win === w.v ? 'bg-accent text-white' : 'text-text-soft hover:text-text')}>
          {WIN_LABEL[w.k][locale]}
        </button>
      ))}
    </div>
  ) : null
  const grid = theme === 'light' ? '#ECE9E1' : '#2A2722'
  const axis = '#8A8780'; const base = theme === 'light' ? '#B9B5AA' : '#6E6B63'
  const tipBg = theme === 'light' ? '#FFFFFF' : '#1A1A18'
  const colors = ['#F36C34', base, '#6BCC78', '#F2B868']
  const fmtFull = (v: number) => valueFormat === 'sar' ? `SAR ${Math.round(v).toLocaleString('en-US')}` : Math.round(v).toLocaleString('en-US')
  const fmtAxis = (v: number) => valueFormat === 'sar' ? fmtSARcompact(v) : (v >= 1000 ? `${Math.round(v / 1000)}K` : String(v))
  return (
    <Panel title={title} subtitle={subtitle} showRefresh action={<>{timeframeSelector}{action}</>}>
      <div style={{ height }}>
        {mounted && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={shown} margin={{ top: 8, right: 12, left: 12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 4" stroke={grid} vertical={false} />
              <XAxis dataKey="t" tick={{ fill: axis, fontSize: 11 }} axisLine={false} tickLine={false} reversed={locale === 'ar'} />
              <YAxis width={52} tick={{ fill: axis, fontSize: 11 }} axisLine={false} tickLine={false} orientation={locale === 'ar' ? 'right' : 'left'} tickFormatter={fmtAxis} />
              <Tooltip contentStyle={{ background: tipBg, border: `1px solid ${grid}`, borderRadius: 10, fontSize: 12, color: 'var(--text)' }} labelStyle={{ color: axis }} formatter={(v: number, n: string) => [fmtFull(v), n]} />
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
