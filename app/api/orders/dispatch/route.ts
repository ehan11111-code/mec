import { NextRequest, NextResponse } from 'next/server'
import { verifySession, SESSION_COOKIE } from '@/lib/auth/server'
import { permissionsFor } from '@/lib/auth/users'
import { getWhatsappIntake, patchWhatsapp } from '@/lib/data/supply'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Warehouse/logistics only (Abdullah's role has 'warehouse' + 'logistics').
const canDispatch = (perms: string[]) => perms.includes('logistics') || perms.includes('warehouse') || perms.includes('manageData')

// POST { message_id, driver?, driverId?, plate?, address?, status? } → record dispatch details on the order.
// Stored in raw.dispatch (read-merge-write so the order's margin eval in raw.margin is preserved). When the
// status becomes 'delivered' the order's decision is set to 'received' (feeds the documents/receipt view).
// On-hand needs no separate deduction: an approved order already reduces available stock in the products
// on-hand reconciliation, and a dispatched/delivered order stays approved, so the deduction holds.
export async function POST(req: NextRequest) {
  const s = verifySession(req.cookies.get(SESSION_COOKIE)?.value)
  if (!s || !canDispatch(permissionsFor(s.r))) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  let b: { message_id?: string; driver?: string; driverId?: string; plate?: string; address?: string; status?: string }
  try { b = await req.json() } catch { return NextResponse.json({ error: 'bad_request' }, { status: 400 }) }
  const id = b.message_id
  if (!id) return NextResponse.json({ error: 'invalid' }, { status: 400 })

  const order = (await getWhatsappIntake(400)).find(m => m.message_id === id && m.intent === 'order')
  if (!order) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const prevRaw = ((order as any).raw && typeof (order as any).raw === 'object') ? (order as any).raw : {}
  const prev = prevRaw.dispatch || {}
  const status = ['ready', 'dispatched', 'delivered'].includes(b.status || '') ? b.status : (prev.status || 'ready')
  const dispatch = {
    driver: b.driver ?? prev.driver ?? '', driverId: b.driverId ?? prev.driverId ?? '',
    plate: b.plate ?? prev.plate ?? '', address: b.address ?? prev.address ?? '',
    status, at: new Date().toISOString(), by: s.u
  }
  const fields: Record<string, unknown> = { raw: { ...prevRaw, dispatch } }
  if (status === 'delivered') fields.decision = 'received'
  const ok = await patchWhatsapp(id, fields)
  return ok ? NextResponse.json({ ok: true, dispatch }) : NextResponse.json({ error: 'save_failed' }, { status: 502 })
}
