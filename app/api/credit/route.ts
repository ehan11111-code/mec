import { NextResponse } from 'next/server'
import { getLatestExtracted, statementAsOf } from '@/lib/data/supply'
import { parseCreditExtracted } from '@/lib/data/credit'

export const dynamic = 'force-dynamic'

// GET → the latest المديونية (credit) statement extracted from WhatsApp, as raw rows + as-of date.
// The Credit page overlays this over its built-in statement so a newer file refreshes it live. Returns
// { rows: [], asOf: null } when none has arrived (page keeps its bundled statement).
export async function GET() {
  const s = await getLatestExtracted('credit')
  if (!s) return NextResponse.json({ rows: [], asOf: null })
  const rows = parseCreditExtracted(s.extracted)
  return NextResponse.json({ rows, asOf: rows.length ? statementAsOf(s.body, s.received_at) : null, source: s.body || '' })
}
