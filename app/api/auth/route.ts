import { NextRequest, NextResponse } from 'next/server'
import {
  verifyCredentials, meFor, changePassword, resetPassword, setAvatar,
  signSession, verifySession, cookieOptions, SESSION_COOKIE
} from '@/lib/auth/server'

export const dynamic = 'force-dynamic'

function sessionUser(req: NextRequest) {
  return verifySession(req.cookies.get(SESSION_COOKIE)?.value)
}

// GET /api/auth → the current user (from the signed cookie), or { user: null }.
export async function GET(req: NextRequest) {
  const s = sessionUser(req)
  if (!s) return NextResponse.json({ user: null })
  const user = await meFor(s.u)
  return NextResponse.json({ user })
}

// POST /api/auth { action: 'login'|'logout'|'password'|'reset'|'avatar', ... }
export async function POST(req: NextRequest) {
  let b: Record<string, string>
  try { b = await req.json() } catch { return NextResponse.json({ error: 'bad_request' }, { status: 400 }) }
  const action = b.action

  if (action === 'login') {
    const user = await verifyCredentials(String(b.username || ''), String(b.password || ''))
    if (!user) return NextResponse.json({ ok: false, error: 'invalid' }, { status: 401 })
    const res = NextResponse.json({ ok: true, user })
    res.cookies.set(SESSION_COOKIE, signSession(user.username, user.role), cookieOptions)
    return res
  }

  if (action === 'logout') {
    const res = NextResponse.json({ ok: true })
    res.cookies.set(SESSION_COOKIE, '', { ...cookieOptions, maxAge: 0 })
    return res
  }

  // everything below requires a valid session
  const s = sessionUser(req)
  if (!s) return NextResponse.json({ ok: false, error: 'unauthenticated' }, { status: 401 })

  if (action === 'password') {
    const r = await changePassword(s.u, String(b.current || ''), String(b.next || ''))
    return NextResponse.json(r, { status: r.ok ? 200 : 400 })
  }
  if (action === 'reset') {
    const r = await resetPassword(s.u)
    return NextResponse.json(r, { status: r.ok ? 200 : 400 })
  }
  if (action === 'avatar') {
    const ok = await setAvatar(s.u, String(b.dataUrl || ''))
    return NextResponse.json({ ok }, { status: ok ? 200 : 400 })
  }
  return NextResponse.json({ error: 'unknown_action' }, { status: 400 })
}
