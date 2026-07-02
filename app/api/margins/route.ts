import { NextRequest, NextResponse } from 'next/server'
import { verifySession, SESSION_COOKIE } from '@/lib/auth/server'
import { findUser, permissionsFor } from '@/lib/auth/users'
import { getProductList, minMarginFor } from '@/lib/data/dataset'
import { getTargetMargins, setTargetMargin } from '@/lib/data/margins-store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET → { overrides } (item → target margin %). Readable by anyone who can create orders, because the
// New Order preview needs the targets to show the right verdict.
export async function GET(req: NextRequest) {
  const s = verifySession(req.cookies.get(SESSION_COOKIE)?.value)
  if (!s || !permissionsFor(s.r).includes('orders')) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  return NextResponse.json({ overrides: await getTargetMargins() })
}

// POST { item, target } → set a product's target margin (permission 'pricing' — commercial/finance/managers).
// target=null clears the override (back to the category floor). A target below the floor is rejected — the
// floor is absolute.
export async function POST(req: NextRequest) {
  const s = verifySession(req.cookies.get(SESSION_COOKIE)?.value)
  if (!s || !permissionsFor(s.r).includes('pricing')) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  let body: { item?: string; target?: number | null }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad_request' }, { status: 400 }) }
  const item = (body.item || '').trim()
  if (!item) return NextResponse.json({ error: 'invalid' }, { status: 400 })
  const p = getProductList().find(x => x.item === item)
  if (!p) return NextResponse.json({ error: 'unknown_item' }, { status: 404 })

  let target = body.target
  if (target != null) {
    target = Number(target)
    const floor = minMarginFor(p.category, item)
    if (!isFinite(target)) return NextResponse.json({ error: 'invalid_target' }, { status: 400 })
    if (target < floor) return NextResponse.json({ error: 'below_floor', floor }, { status: 400 })
    if (target > 95) return NextResponse.json({ error: 'too_high' }, { status: 400 })
  }
  const user = findUser(s.u)?.name.en || s.u
  const ok = await setTargetMargin(item, target ?? null, user)
  return ok ? NextResponse.json({ ok: true, item, target: target ?? null }) : NextResponse.json({ error: 'save_failed' }, { status: 502 })
}
