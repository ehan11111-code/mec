import { NextRequest, NextResponse } from 'next/server'
import { verifySession, SESSION_COOKIE } from '@/lib/auth/server'
import { permissionsFor } from '@/lib/auth/users'
import { archiveWhatsapp } from '@/lib/data/supply'

export const dynamic = 'force-dynamic'

function cfg() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  return url && key ? { url: url.replace(/\/+$/, ''), key } : null
}
// Tables that hold test data the admin/CEO may clear before launch.
// - whatsapp: the orders/approvals/documents we ran as tests are ARCHIVED (hidden from the portal but
//   kept in the automation audit log) — not deleted. Counted as LIVE (non-archived) rows.
// - contact / messages: deleted outright. PostgREST refuses an unbounded write, so each carries a filter.
const TARGETS: Record<string, string> = {
  contact: 'contact_inquiries?id=gt.0',
  messages: 'internal_messages?id=gt.0'
}

async function count(c: { url: string; key: string }, path: string): Promise<number> {
  try {
    const r = await fetch(`${c.url}/rest/v1/${path}`, {
      headers: { apikey: c.key, Authorization: `Bearer ${c.key}`, Prefer: 'count=exact', Range: '0-0' }, cache: 'no-store'
    })
    const cr = r.headers.get('content-range') || '0/0'
    return parseInt(cr.split('/')[1] || '0', 10)
  } catch { return 0 }
}

// GET → counts per clearable table (for the admin console). WhatsApp counts only LIVE (non-archived) rows.
export async function GET(req: NextRequest) {
  const s = verifySession(req.cookies.get(SESSION_COOKIE)?.value)
  if (!s || !permissionsFor(s.r).includes('manageData')) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const c = cfg(); if (!c) return NextResponse.json({ configured: false, counts: {} })
  // `archived=eq.false` would 400 if the column hasn't been added yet; fall back to the total count.
  let whatsapp = await count(c, 'whatsapp_intake?select=message_id&archived=eq.false')
  if (whatsapp === 0) {
    const total = await count(c, 'whatsapp_intake?select=message_id')
    const archived = await count(c, 'whatsapp_intake?select=message_id&archived=eq.true')
    whatsapp = archived > 0 ? total - archived : total
  }
  const counts = { whatsapp, contact: await count(c, 'contact_inquiries?select=id'), messages: await count(c, 'internal_messages?select=id') }
  return NextResponse.json({ configured: true, counts })
}

// POST { target: 'whatsapp'|'contact'|'messages' } → clear that data (admin/CEO only).
export async function POST(req: NextRequest) {
  const s = verifySession(req.cookies.get(SESSION_COOKIE)?.value)
  if (!s || !permissionsFor(s.r).includes('manageData')) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  let b: { target?: string }
  try { b = await req.json() } catch { return NextResponse.json({ error: 'bad_request' }, { status: 400 }) }
  const c = cfg(); if (!c) return NextResponse.json({ error: 'store_unavailable' }, { status: 503 })

  // WhatsApp test data is archived (kept in the audit log), never deleted.
  if (b.target === 'whatsapp') {
    const ok = await archiveWhatsapp()
    return ok ? NextResponse.json({ ok: true, target: 'whatsapp', mode: 'archived' }) : NextResponse.json({ error: 'archive_failed' }, { status: 502 })
  }

  const path = b.target ? TARGETS[b.target] : undefined
  if (!path) return NextResponse.json({ error: 'invalid_target' }, { status: 400 })
  try {
    const r = await fetch(`${c.url}/rest/v1/${path}`, {
      method: 'DELETE',
      headers: { apikey: c.key, Authorization: `Bearer ${c.key}`, Prefer: 'return=minimal' }, cache: 'no-store'
    })
    return r.ok ? NextResponse.json({ ok: true, target: b.target }) : NextResponse.json({ error: `delete_failed_${r.status}` }, { status: 502 })
  } catch { return NextResponse.json({ error: 'delete_failed' }, { status: 502 }) }
}
