import { NextResponse } from 'next/server'
import { getLatestExtracted, statementAsOf } from '@/lib/data/supply'
import { parseCreditExtracted } from '@/lib/data/credit'
import { confirmedAdjustmentsTotal } from '@/lib/data/reconcile-credit'

export const dynamic = 'force-dynamic'

// GET → the latest المديونية (credit) statement extracted from WhatsApp, as raw rows + as-of date, plus the
// total of confirmed payment reconciliations so far. The Credit page + Control Center show the live credit
// line = statement − confirmedTotal. Returns { rows: [], asOf: null } when no statement has arrived.
export async function GET() {
  const [s, confirmedTotal] = await Promise.all([getLatestExtracted('credit'), confirmedAdjustmentsTotal().catch(() => 0)])
  if (!s) return NextResponse.json({ rows: [], asOf: null, confirmedTotal })
  const rows = parseCreditExtracted(s.extracted)
  return NextResponse.json({ rows, asOf: rows.length ? statementAsOf(s.body, s.received_at) : null, source: s.body || '', confirmedTotal })
}
