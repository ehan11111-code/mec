import { NextRequest, NextResponse } from 'next/server'
import { verifySession, SESSION_COOKIE } from '@/lib/auth/server'
import { permissionsFor } from '@/lib/auth/users'
import { getWhatsappIntake, getEmailIntake, getSupplyIntel } from '@/lib/data/supply'

export const dynamic = 'force-dynamic'

// Friendly names for the known WhatsApp group JIDs (see the wasender identifiers memory). Anything else
// shows its raw JID so an un-mapped group is obvious (e.g. the docs group before MEC_DOCS_GROUP_JID is set).
const GROUPS: Record<string, string> = {
  '120363422104294606@g.us': 'Middle East Chef order',
  '120363404531223628@g.us': 'MEC Invoices & Collections'
}

export type DataItem = {
  id: string
  source: 'whatsapp' | 'email' | 'supply'
  when: string
  channel: string              // group name / "Direct message" / "Email" / "Supply intelligence"
  sender: string
  kind: string                 // intent / doc_type / "forecast"
  captured: boolean            // did it become a structured portal record (order / approval / document / forecast)?
  archived: boolean
  title: string
  body: string
  hint: 'possible_order' | null  // relevant-looking message that wasn't captured
}

// Does an un-captured WhatsApp message look like it actually carries an order (qty/price/quantity words)?
const ORDER_HINT = /(كرتون|صندوق|سعر|طلب|كيلو|طن|\bqty\b|\bprice\b)/i
const isNoise = (b: string) => !b || /^reacted\b/i.test(b.trim()) || /^@\d+$/.test(b.trim())

function waChannel(group_jid?: string | null, group_type?: string | null): string {
  if (group_jid) return GROUPS[group_jid] || `Group ${group_jid.replace(/@.*/, '').slice(0, 10)}…`
  if (group_type === 'dm') return 'Direct message'
  return group_type || '—'
}

// GET → the latest items fetched from every source, newest first, each flagged captured / not-captured.
// Admin/CEO only (manageData).
export async function GET(req: NextRequest) {
  const s = verifySession(req.cookies.get(SESSION_COOKIE)?.value)
  if (!s || !permissionsFor(s.r).includes('manageData')) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const [wa, emails, supply] = await Promise.all([
    getWhatsappIntake(80, true),   // include archived so the inspector shows everything
    getEmailIntake(40).catch(() => []),
    getSupplyIntel().catch(() => [])
  ])

  const items: DataItem[] = []

  for (const m of wa) {
    const captured = m.intent === 'order' || m.intent === 'approval' || !!m.doc_type
    const body = (m.body || '').replace(/\s+/g, ' ').trim()
    items.push({
      id: m.message_id, source: 'whatsapp', when: m.received_at,
      channel: waChannel(m.group_jid, m.group_type),
      sender: m.salesperson || m.push_name || m.phone || '—',
      kind: [m.intent, m.doc_type].filter(Boolean).join(' · ') || 'other',
      captured, archived: !!m.archived,
      title: m.order_no ? `#${m.order_no}` : (m.client_name || ''),
      body,
      hint: !captured && !isNoise(body) && ORDER_HINT.test(body) ? 'possible_order' : null
    })
  }

  for (const e of emails as any[]) {
    const captured = (e.intent && e.intent !== 'other') || !!e.doc_type
    items.push({
      id: e.message_id, source: 'email', when: e.received_at, channel: 'Email',
      sender: e.from_name || e.from_email || '—',
      kind: [e.intent, e.doc_type].filter(Boolean).join(' · ') || 'other',
      captured, archived: false,
      title: e.subject || '', body: (e.summary || e.body || '').replace(/\s+/g, ' ').trim().slice(0, 400),
      hint: null
    })
  }

  for (const sup of supply as any[]) {
    items.push({
      id: `${sup.supplier}-${sup.commodity}-${sup.generated_at}`, source: 'supply', when: sup.generated_at,
      channel: 'Supply intelligence', sender: `${sup.supplier || sup.commodity}${sup.country ? ' · ' + sup.country : ''}`,
      kind: 'forecast', captured: true, archived: false,
      title: `${sup.commodity || ''}${sup.country ? ' · ' + sup.country : ''}`,
      body: (sup.recommendation || '').replace(/\s+/g, ' ').trim().slice(0, 400), hint: null
    })
  }

  items.sort((a, b) => (a.when < b.when ? 1 : -1))

  const counts = {
    total: items.length,
    whatsapp: items.filter(i => i.source === 'whatsapp').length,
    email: items.filter(i => i.source === 'email').length,
    supply: items.filter(i => i.source === 'supply').length,
    captured: items.filter(i => i.captured).length,
    notCaptured: items.filter(i => !i.captured).length,
    possibleOrders: items.filter(i => i.hint === 'possible_order').length
  }
  return NextResponse.json({ items, counts })
}
