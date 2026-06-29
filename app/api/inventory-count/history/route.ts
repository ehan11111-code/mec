import { NextResponse } from 'next/server'
import { getInventoryStatements, statementAsOf } from '@/lib/data/supply'
import { parseInventoryExtracted } from '@/lib/data/inventory-count'

export const dynamic = 'force-dynamic'

// GET → every المخزون (inventory) statement Tarek has sent, newest first: its date, total cartons, the
// item lines, and whether the original PDF is openable (proof). Powers /inventory/on-hand.
export async function GET() {
  const rows = await getInventoryStatements()
  const statements = rows.map(r => {
    const items = parseInventoryExtracted(r.extracted)
    return {
      message_id: r.message_id,
      asOf: statementAsOf(r.body || '', r.received_at),
      received_at: r.received_at,
      total: items.reduce((s, i) => s + (i.cartons || 0), 0),
      items: items.map(i => ({ item: i.item, cartons: i.cartons })).sort((a, b) => b.cartons - a.cartons),
      hasFile: r.media_status === 'cached',
    }
  }).filter(s => s.items.length || s.total)
  return NextResponse.json({ statements })
}
