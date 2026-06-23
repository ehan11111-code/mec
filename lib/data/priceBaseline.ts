// Per-commodity price baseline + historical trend, computed from MEC's REAL purchase lines
// (lib/data/purchases.ts). This is the anchor the supply-intelligence forecast is compared against —
// "your last real cost → forecast range". Pure function (no secrets) so it runs client- or server-side.
import { purchases } from './purchases'

export type PriceBaseline = {
  category: string; categoryAr: string; unit: string
  latest: number          // weighted-avg cost in the most recent month
  avg: number             // weighted-avg cost across the whole history
  min: number; max: number
  lastDate: string
  series: { month: string; cost: number }[]   // monthly weighted-avg cost, oldest→newest
}

function dominantUnit(rows: typeof purchases): string {
  const c: Record<string, number> = {}
  for (const r of rows) c[r.unit] = (c[r.unit] || 0) + 1
  return Object.entries(c).sort((a, b) => b[1] - a[1])[0]?.[0] || 'كرتون'
}

export function priceBaselines(): PriceBaseline[] {
  const byCat = new Map<string, typeof purchases>()
  for (const r of purchases) {
    if (!r.unitCost || !r.cartons || !r.date) continue
    if (!byCat.has(r.category)) byCat.set(r.category, [])
    byCat.get(r.category)!.push(r)
  }

  const out: PriceBaseline[] = []
  for (const [category, rows] of byCat) {
    const unit = dominantUnit(rows)
    const use = rows.filter(r => r.unit === unit)
    if (!use.length) continue

    // monthly weighted-average cost
    const months = new Map<string, { num: number; den: number }>()
    for (const r of use) {
      const m = r.date.slice(0, 7)
      const acc = months.get(m) || { num: 0, den: 0 }
      acc.num += r.unitCost * r.cartons; acc.den += r.cartons
      months.set(m, acc)
    }
    const series = [...months.entries()].sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, v]) => ({ month, cost: Math.round((v.num / v.den) * 100) / 100 }))
    if (!series.length) continue

    const totalNum = use.reduce((s, r) => s + r.unitCost * r.cartons, 0)
    const totalDen = use.reduce((s, r) => s + r.cartons, 0)
    const costs = series.map(s => s.cost)
    out.push({
      category, categoryAr: rows[0].categoryAr, unit,
      latest: series[series.length - 1].cost,
      avg: Math.round((totalNum / totalDen) * 100) / 100,
      min: Math.min(...costs), max: Math.max(...costs),
      lastDate: use.map(r => r.date).sort().at(-1) || '',
      series
    })
  }
  return out.sort((a, b) => b.avg - a.avg)
}

// Map a workflow "commodity" string to a baseline category.
const COMMODITY_TO_CAT: Record<string, string> = {
  beef: 'Beef', meat: 'Beef', lamb: 'Lamb',
  chicken: 'Poultry', poultry: 'Poultry',
  potato: 'Vegetables', vegetable: 'Vegetables', vegetables: 'Vegetables',
  processed: 'Processed', dairy: 'Dairy'
}
export function baselineForCommodity(commodity: string): PriceBaseline | undefined {
  const cat = COMMODITY_TO_CAT[(commodity || '').toLowerCase()] || commodity
  return priceBaselines().find(b => b.category.toLowerCase() === String(cat).toLowerCase())
}
