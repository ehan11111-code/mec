import { NextRequest, NextResponse } from 'next/server'
import { getWhatsappDocs } from '@/lib/data/supply'

export const dynamic = 'force-dynamic'

const ALLOWED = ['invoice', 'payment', 'delivery_note'] as const

// Friendly names for the known WhatsApp group JIDs (see the wasender identifiers memory).
const GROUPS: Record<string, string> = {
  '120363422104294606@g.us': 'Middle East Chef order',
  '120363404531223628@g.us': 'MEC Invoices & Collections'
}
function channel(group_jid?: string | null, group_type?: string | null): string {
  if (group_jid) return GROUPS[group_jid] || `Group ${group_jid.replace(/@.*/, '').slice(0, 10)}…`
  if (group_type === 'dm') return 'Direct message'
  return group_type || '—'
}

export type WaDoc = {
  message_id: string; doc_type: string; filename: string; sender: string; phone: string
  client_name: string | null; order_no: string | null; channel: string; received_at: string; hasFile: boolean
}

// GET /api/wa-docs?type=invoice|payment|delivery_note → every WhatsApp document of that type.
export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get('type') || ''
  if (!(ALLOWED as readonly string[]).includes(type)) return NextResponse.json({ error: 'bad_type' }, { status: 400 })
  const rows = await getWhatsappDocs(type, 300)
  const docs: WaDoc[] = rows.map(m => ({
    message_id: m.message_id, doc_type: m.doc_type || type,
    filename: (m.body || '').replace(/\s+/g, ' ').trim(),
    sender: m.salesperson || m.push_name || m.phone || '—', phone: m.phone || '',
    client_name: m.client_name || null, order_no: m.order_no || null,
    channel: channel(m.group_jid, m.group_type), received_at: m.received_at,
    hasFile: !!(m as any).media_url || /document|image/i.test(m.message_type || '')
  }))
  return NextResponse.json({ docs, count: docs.length })
}
