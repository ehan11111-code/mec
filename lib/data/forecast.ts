// Forecasting engine for the MEC Forecast page. Real, standard methods applied to the live data:
//  • Linear regression (ordinary least squares) — trend + R² + residual std for confidence bands
//  • Holt's linear-trend exponential smoothing — level + trend, good for trended series
//  • Simple exponential smoothing (SES)
//  • CAGR (compound monthly growth) and MoM growth
//  • Inventory: days-of-cover, projected stockout, reorder timing (demand-over-lead-time + safety stock)
// Pure functions — UI passes the locale only for month labels.
import { salesByMonth, unitsByMonth, ordersByMonth, unitsByCategoryMonth, getInventory, warehouseStock } from './dataset'

export type Loc = 'en' | 'ar'

// ── core statistical methods ──
export function linreg(y: number[]) {
  const n = y.length
  const xm = (n - 1) / 2, ym = y.reduce((a, b) => a + b, 0) / n
  let num = 0, den = 0
  for (let i = 0; i < n; i++) { num += (i - xm) * (y[i] - ym); den += (i - xm) ** 2 }
  const slope = den ? num / den : 0, intercept = ym - slope * xm
  let ssRes = 0, ssTot = 0
  for (let i = 0; i < n; i++) { const f = intercept + slope * i; ssRes += (y[i] - f) ** 2; ssTot += (y[i] - ym) ** 2 }
  const r2 = ssTot ? 1 - ssRes / ssTot : 0
  const resStd = Math.sqrt(ssRes / Math.max(1, n - 2))
  return { slope, intercept, r2, resStd, predict: (x: number) => intercept + slope * x }
}
export function ses(y: number[], alpha = 0.3) { let s = y[0] ?? 0; for (let i = 1; i < y.length; i++) s = alpha * y[i] + (1 - alpha) * s; return s }
export function holt(y: number[], alpha = 0.4, beta = 0.3) {
  if (y.length < 2) return { level: y[0] ?? 0, trend: 0, forecast: (_h: number) => y[0] ?? 0 }
  let level = y[0], trend = y[1] - y[0]
  for (let i = 1; i < y.length; i++) { const pl = level; level = alpha * y[i] + (1 - alpha) * (level + trend); trend = beta * (level - pl) + (1 - beta) * trend }
  return { level, trend, forecast: (h: number) => level + h * trend }
}
export function cagr(first: number, last: number, periods: number) { if (first <= 0 || periods <= 0) return 0; return Math.pow(last / first, 1 / periods) - 1 }

// ── month label helpers (extend the series into the future) ──
function addMonth(key: string, n: number) { const [y, m] = key.split('-').map(Number); const d = new Date(Date.UTC(y, m - 1 + n, 1)); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}` }
function monLabel(key: string, l: Loc) { const [y, m] = key.split('-').map(Number); const d = new Date(Date.UTC(y, m - 1, 1)); try { return d.toLocaleDateString(l === 'ar' ? 'ar-SA' : 'en-GB', { month: 'short', year: '2-digit' }) } catch { return key } }

export type ForecastPoint = { label: string; actual: number | null; forecast: number | null; lo: number | null; hi: number | null }
export type SeriesForecast = { points: ForecastPoint[]; nextValue: number; horizonTotal: number; momGrowth: number; cagr: number; r2: number; trend: 'up' | 'down' | 'flat' }

// Blend linear regression + Holt (robust), with a 95% confidence band from regression residuals.
function seriesForecast(series: { key: string; v: number }[], horizon: number, l: Loc): SeriesForecast {
  const y = series.map(s => s.v)
  if (y.length < 2) return { points: series.map(s => ({ label: monLabel(s.key, l), actual: s.v, forecast: null, lo: null, hi: null })), nextValue: y[0] || 0, horizonTotal: 0, momGrowth: 0, cagr: 0, r2: 0, trend: 'flat' }
  const reg = linreg(y), h = holt(y)
  const lastKey = series[series.length - 1].key
  const band = 1.96 * reg.resStd
  const points: ForecastPoint[] = series.map(s => ({ label: monLabel(s.key, l), actual: s.v, forecast: null, lo: null, hi: null }))
  points[points.length - 1].forecast = y[y.length - 1]   // connect the lines
  const fc: number[] = []
  for (let hh = 1; hh <= horizon; hh++) {
    const val = Math.max(0, (reg.predict(y.length - 1 + hh) + h.forecast(hh)) / 2)
    fc.push(val)
    points.push({ label: monLabel(addMonth(lastKey, hh), l), actual: null, forecast: Math.round(val), lo: Math.max(0, Math.round(val - band)), hi: Math.round(val + band) })
  }
  const last = y[y.length - 1] || 0, nextValue = fc[0] || 0
  return {
    points, nextValue: Math.round(nextValue), horizonTotal: Math.round(fc.reduce((a, b) => a + b, 0)),
    momGrowth: last ? (nextValue - last) / last : 0, cagr: cagr(y[0] || 1, last || 1, Math.max(1, y.length - 1)),
    r2: reg.r2, trend: reg.slope > 0.001 * (last || 1) ? 'up' : reg.slope < -0.001 * (last || 1) ? 'down' : 'flat'
  }
}

export const revenueForecast = (horizon = 3, l: Loc = 'en') => seriesForecast(salesByMonth().map(m => ({ key: m.key, v: m.v })), horizon, l)
export const demandForecast = (horizon = 3, l: Loc = 'en') => seriesForecast(unitsByMonth().map(m => ({ key: m.key, v: m.v })), horizon, l)
export const ordersForecast = (horizon = 3, l: Loc = 'en') => seriesForecast(ordersByMonth().map(m => ({ key: m.key, v: m.v })), horizon, l)

// Per-category demand: recent run-rate (3-mo avg) vs next-month Holt forecast.
export function categoryDemandForecast() {
  return unitsByCategoryMonth().map(c => {
    const y = c.series.map(s => s.v)
    const next = Math.max(0, Math.round(holt(y).forecast(1)))
    const recent = Math.round(y.slice(-3).reduce((a, b) => a + b, 0) / Math.min(3, y.length))
    return { category: c.category, ar: c.ar, current: recent, next, change: recent ? (next - recent) / recent : 0 }
  }).filter(c => c.current > 0 || c.next > 0).sort((a, b) => b.current - a.current)
}

export type StockoutRow = { item: string; category: string; onHand: number; avgMonthlyOut: number; daysCover: number | null; reorderInDays: number | null; needsReorder: boolean; status: 'critical' | 'watch' | 'ok' | 'idle' }
// Inventory forecast: days-of-cover = on-hand ÷ avg daily demand; reorder-in = (on-hand − reorder point) ÷ daily demand.
export function inventoryForecast() {
  const inv = getInventory().filter(s => !s.unreconciled)
  const rows: StockoutRow[] = inv.map(s => {
    const dailyOut = (s.avgMonthlyOut || 0) / 30
    const daysCover = dailyOut > 0 ? Math.round(s.onHand / dailyOut) : null
    const reorderInDays = dailyOut > 0 ? Math.round((s.onHand - s.rop) / dailyOut) : null
    const status: StockoutRow['status'] = daysCover == null ? 'idle' : daysCover <= 14 ? 'critical' : daysCover <= 30 ? 'watch' : 'ok'
    return { item: s.item, category: s.category, onHand: s.onHand, avgMonthlyOut: s.avgMonthlyOut, daysCover, reorderInDays, needsReorder: s.needsReorder, status }
  }).sort((a, b) => (a.daysCover ?? 99999) - (b.daysCover ?? 99999))
  const ws = warehouseStock()
  const covered = rows.filter(r => r.daysCover != null)
  return {
    rows, critical: rows.filter(r => r.status === 'critical').length, watch: rows.filter(r => r.status === 'watch').length,
    capacity: ws.capacity, onHand: ws.onHand, utilization: ws.utilization,
    avgDaysCover: covered.length ? Math.round(covered.reduce((a, r) => a + (r.daysCover || 0), 0) / covered.length) : 0
  }
}
