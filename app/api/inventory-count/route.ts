import { NextResponse } from 'next/server'
import { getLatestExtracted, statementAsOf } from '@/lib/data/supply'
import { parseInventoryExtracted } from '@/lib/data/inventory-count'

export const dynamic = 'force-dynamic'

// GET → the latest المخزون (physical count) extracted from WhatsApp, as raw rows + as-of date. The
// Inventory page overlays this over its built-in count so a newer file refreshes it live.
export async function GET() {
  const s = await getLatestExtracted('inventory')
  if (!s) return NextResponse.json({ rows: [], asOf: null })
  const rows = parseInventoryExtracted(s.extracted)
  return NextResponse.json({ rows, asOf: rows.length ? statementAsOf(s.body, s.received_at) : null, source: s.body || '' })
}
