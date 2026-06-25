// Physical inventory count (المخزون) — the stock snapshot Tarek sends the team on WhatsApp (docs group).
// Used to reconcile the warehouse LEDGER on-hand (lib/data/inventory.ts, net of recorded movements)
// against an actual physical count. Latest: 2026-06-25, from المخزون حتي تاريخ 25-06-2026.pdf.
import { inventory } from './inventory'

export const INVENTORY_COUNT_AS_OF = '2026-06-25'

export type CountRow = { item: string; cartons: number; supplier: string }

// Source: المخزون حتي تاريخ 25-06-2026.pdf (Tarek Habbash → docs group). Quantities in cartons.
export const INVENTORY_COUNT: CountRow[] = [
  { item: 'بوبي فيل الممتاز', cartons: 340, supplier: 'عاصمة الدجاج' },
  { item: 'فيليه عجل الممتاز', cartons: 5, supplier: 'عاصمة الدجاج' },
  { item: 'رامب ستيك رستم', cartons: 9, supplier: 'عاصمة الدجاج' },
  { item: 'توب سايد هندي الكامل', cartons: 14, supplier: 'عاصمة الدجاج' },
  { item: 'فور كوارتر هندي الكامل', cartons: 1500, supplier: '' },
  { item: 'شاورما دجاج لارا 2.5ك', cartons: 2298, supplier: 'عاصمة الدجاج' },
  { item: 'صدور دجاج برازيلي مجمد', cartons: 2685, supplier: '' },
]

const norm = (s: string) => String(s || '').replace(/[ـ]/g, '').replace(/[.،,0-9]/g, '').replace(/\s+/g, ' ').trim()
const tokens = (s: string) => new Set(norm(s).split(' ').filter(w => w.length > 1 && !['ك', 'كرتون', 'هندي', 'برازيلي'].includes(w)))

// Best-match a counted item to a ledger SKU by token overlap (Jaccard); null if no confident match.
function matchLedger(item: string): { matched: string; onHand: number } | null {
  const nt = tokens(item)
  let best: { matched: string; onHand: number; score: number } | null = null
  for (const r of inventory) {
    const rt = tokens(r.item); let overlap = 0
    for (const t of nt) if (rt.has(t)) overlap++
    const score = overlap / Math.max(1, nt.size + rt.size - overlap)   // Jaccard
    if (overlap >= 2 && (!best || score > best.score)) best = { matched: r.item, onHand: r.onHand, score }
  }
  return best ? { matched: best.matched, onHand: best.onHand } : null
}

export type CountCompare = CountRow & { matched: string | null; ledgerOnHand: number | null; variance: number | null }

export function getInventoryCount(): { asOf: string; total: number; rows: CountCompare[]; matchedCount: number } {
  const rows: CountCompare[] = INVENTORY_COUNT.map(r => {
    const m = matchLedger(r.item)
    return { ...r, matched: m?.matched ?? null, ledgerOnHand: m?.onHand ?? null, variance: m ? r.cartons - m.onHand : null }
  })
  return {
    asOf: INVENTORY_COUNT_AS_OF,
    total: INVENTORY_COUNT.reduce((s, r) => s + r.cartons, 0),
    rows,
    matchedCount: rows.filter(r => r.matched).length,
  }
}
