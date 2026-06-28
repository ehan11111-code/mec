import { NextRequest, NextResponse } from 'next/server'
import { getWhatsappDocs, patchWhatsapp } from '@/lib/data/supply'
import { verifySession, SESSION_COOKIE } from '@/lib/auth/server'
import { permissionsFor } from '@/lib/auth/users'

export const dynamic = 'force-dynamic'

const ALLOWED = ['invoice', 'payment', 'delivery_note'] as const

// Filename/text hints that a document was filed under the wrong type.
const INVOICE_HINT = /(فاتور|invoice|\bINV[-\s]?\d|tax\s*invoice)/i
const DELIVERY_HINT = /(تسليم|سند\s*تسليم|إشعار\s*تسليم|اشعار\s*تسليم|delivery\s*note|دليفري)/i
const PAYMENT_HINT = /(سند\s*قبض|إيصال|ايصال|تحويل|حوالة|receipt|payment|transfer)/i
// Text that proves a delivery was received (signature / stamp / "تم الاستلام").
const RECEIPT_HINT = /(تم\s*الاستلام|استلمت|تم\s*الاستلم|مستلم|استلام|received|signed|signature|توقيع|ختم|stamp)/i

// What type does the filename/body actually look like? (null = consistent with its current type)
function suggestType(current: string, text: string): string | null {
  const isInv = INVOICE_HINT.test(text), isDel = DELIVERY_HINT.test(text), isPay = PAYMENT_HINT.test(text)
  if (current === 'delivery_note' && isInv && !isDel) return 'invoice'
  if (current === 'invoice' && isDel && !isInv) return 'delivery_note'
  if (current === 'delivery_note' && isPay && !isDel && !isInv) return 'payment'
  return null
}

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
  suggestedType: string | null              // looks like it should be this type instead (misclassified)
  receiptConfirmed: boolean                 // delivery note: signature/stamp/تم الاستلام confirmed
}

// GET /api/wa-docs?type=invoice|payment|delivery_note → every WhatsApp document of that type.
export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get('type') || ''
  if (!(ALLOWED as readonly string[]).includes(type)) return NextResponse.json({ error: 'bad_type' }, { status: 400 })
  const rows = await getWhatsappDocs(type, 300)
  const docs: WaDoc[] = rows.map(m => {
    const text = `${m.body || ''} ${m.client_name || ''}`
    return {
      message_id: m.message_id, doc_type: m.doc_type || type,
      filename: (m.body || '').replace(/\s+/g, ' ').trim(),
      sender: m.salesperson || m.push_name || m.phone || '—', phone: m.phone || '',
      client_name: m.client_name || null, order_no: m.order_no || null,
      channel: channel(m.group_jid, m.group_type), received_at: m.received_at,
      hasFile: !!(m as any).media_url || /document|image/i.test(m.message_type || ''),
      suggestedType: suggestType(m.doc_type || type, text),
      receiptConfirmed: m.decision === 'received' || (type === 'delivery_note' && RECEIPT_HINT.test(text))
    }
  })
  return NextResponse.json({ docs, count: docs.length })
}

// POST → admin actions on a document (manageData): reclassify its type, or confirm receipt.
//   { message_id, doc_type }     reclassify (fixes a misfiled delivery note / invoice)
//   { message_id, received: true }  mark a delivery note as received (signed/stamped/تم الاستلام)
export async function POST(req: NextRequest) {
  const s = verifySession(req.cookies.get(SESSION_COOKIE)?.value)
  if (!s || !permissionsFor(s.r).includes('manageData')) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  let b: { message_id?: string; doc_type?: string; received?: boolean }
  try { b = await req.json() } catch { return NextResponse.json({ error: 'bad_request' }, { status: 400 }) }
  if (!b.message_id) return NextResponse.json({ error: 'invalid' }, { status: 400 })
  const patch: Record<string, unknown> = {}
  if (b.doc_type && (ALLOWED as readonly string[]).includes(b.doc_type)) patch.doc_type = b.doc_type
  if (b.received != null) patch.decision = b.received ? 'received' : null
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: 'nothing_to_do' }, { status: 400 })
  const ok = await patchWhatsapp(b.message_id, patch)
  return ok ? NextResponse.json({ ok: true, ...patch }) : NextResponse.json({ error: 'update_failed' }, { status: 502 })
}
