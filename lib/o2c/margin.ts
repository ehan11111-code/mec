// The margin gate — the heart of O2C auto-approval (PORTAL_AUDIT_AND_ROADMAP.md §6.3; CLAUDE.md §5).
//
// A salesman enters a sell price per line. The gate compares each line's gross margin to the product's
// TARGET margin (default = the category floor; finance/commercial can raise it per product) and to the
// hard FLOOR:
//   • margin ≥ target AND stock available → AUTO  (auto-approve → auto-invoice)
//   • margin ≥ floor but < target, or stock unconfirmed → WARN  (ask the salesman; on confirm → human queue)
//   • margin < floor → BLOCK  (human-only, never auto-sent — a manager exception)
//   • cost unknown → REVIEW  (can't decide → human)
// Pure + deterministic so the client preview and the server decision always agree.
import { minMarginFor } from '@/lib/data/dataset'

export type Verdict = 'auto' | 'warn' | 'block' | 'review'

export type LineInput = {
  item: string; category: string; sell: number; qty: number
  cost: number | null; onHand: number | null; confidence: 'high' | 'low' | 'none'
}
export type LineEval = {
  item: string; category: string; sell: number; qty: number; cost: number | null; onHand: number | null
  marginPct: number | null; floor: number; target: number; stockOk: boolean; lineTotal: number; verdict: Verdict
}
export type OrderEval = {
  lines: LineEval[]
  decision: 'auto_approve' | 'queue'   // queue = a human must approve (a warn, block or review is present)
  anyWarn: boolean; anyBlock: boolean; anyReview: boolean
  total: number                         // Σ sell × qty (pre-VAT)
}

// Gross margin on the sell price, one decimal — matches how the portal computes product marginPct.
export const marginPct = (sell: number, cost: number | null): number | null =>
  cost == null || !(sell > 0) ? null : Math.round(((sell - cost) / sell) * 1000) / 10

// The target a line must beat to auto-approve: an explicit per-product override, else the category floor.
export function targetMargin(category: string, item: string, overrides?: Record<string, number>): number {
  const o = overrides?.[item]
  return typeof o === 'number' && isFinite(o) ? o : minMarginFor(category, item)
}

export function evaluateLine(l: LineInput, overrides?: Record<string, number>): LineEval {
  const floor = minMarginFor(l.category, l.item)
  const target = targetMargin(l.category, l.item, overrides)
  const m = marginPct(l.sell, l.cost)
  const stockOk = l.onHand != null && l.qty > 0 && l.qty <= l.onHand
  let verdict: Verdict
  if (m == null) verdict = 'review'              // no matched cost → can't decide
  else if (m < floor) verdict = 'block'          // below the hard floor → manager-only
  else if (m >= target && stockOk) verdict = 'auto'
  else verdict = 'warn'                           // below target, or stock not confirmed
  return { item: l.item, category: l.category, sell: l.sell, qty: l.qty, cost: l.cost, onHand: l.onHand, marginPct: m, floor, target, stockOk, lineTotal: (l.sell || 0) * (l.qty || 0), verdict }
}

export function evaluateOrder(lines: LineInput[], overrides?: Record<string, number>): OrderEval {
  const evals = lines.map(l => evaluateLine(l, overrides))
  const anyWarn = evals.some(e => e.verdict === 'warn')
  const anyBlock = evals.some(e => e.verdict === 'block')
  const anyReview = evals.some(e => e.verdict === 'review')
  const allAuto = evals.length > 0 && evals.every(e => e.verdict === 'auto')
  return { lines: evals, decision: allAuto ? 'auto_approve' : 'queue', anyWarn, anyBlock, anyReview, total: evals.reduce((s, e) => s + e.lineTotal, 0) }
}
