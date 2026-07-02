import { NextResponse } from 'next/server'
import { getProductList, tokens, jaccard } from '@/lib/data/dataset'
import { getInventoryCount, parseInventoryExtracted } from '@/lib/data/inventory-count'
import { getWhatsappOrders, getLatestExtracted, type WhatsappMsg } from '@/lib/data/supply'

export const dynamic = 'force-dynamic'

// Per-product reconciled on-hand FOR THE PRODUCTS PAGE:
//   reconciled = ledger on-hand − units committed to open orders − cartons Tarek's المخزون file shows as moved out.
// Matching uses the same token-jaccard as the rest of the product↔warehouse mapping (threshold 0.5).
export async function GET() {
  const products = getProductList().filter(p => p.onHand != null)

  // 1. Open orders (pending/approved) → committed units per product name.
  let orderItems: { tok: string[]; qty: number }[] = []
  try {
    const orders = await getWhatsappOrders(300)
    const open = orders.filter((o: WhatsappMsg) => ['pending', 'approved'].includes(o.order_status || 'pending'))
    orderItems = open.flatMap(o => (o.products || []).map(p => ({ tok: tokens(p.name || ''), qty: Number(p.qty) || 0 }))).filter(x => x.tok.length && x.qty > 0)
  } catch { /* live orders optional */ }

  // 2. Tarek's latest المخزون MOVEMENT file → cartons moved out per item (live if present, else built-in).
  let movedRows: { tok: string[]; cartons: number }[] = []
  try {
    const live = await getLatestExtracted('inventory')
    const rows = live ? parseInventoryExtracted(live.extracted) : getInventoryCount().rows
    movedRows = rows.map((r: any) => ({ tok: tokens(r.item || ''), cartons: Number(r.cartons) || 0 })).filter(x => x.tok.length && x.cartons > 0)
  } catch { /* movement optional */ }

  const onhand: Record<string, { base: number; committed: number; movedOut: number; reconciled: number; reconciledFlag: boolean }> = {}
  for (const p of products) {
    const tk = tokens(p.item)
    let committed = 0
    for (const oi of orderItems) if (jaccard(tk, oi.tok) >= 0.5) committed += oi.qty
    let movedOut = 0
    for (const m of movedRows) if (jaccard(tk, m.tok) >= 0.5) movedOut += m.cartons
    const base = p.onHand as number
    onhand[p.item] = { base, committed, movedOut, reconciled: Math.max(0, base - committed - movedOut), reconciledFlag: p.whReconciled }
  }
  return NextResponse.json({ onhand })
}
