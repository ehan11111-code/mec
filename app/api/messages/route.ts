import { NextRequest, NextResponse } from 'next/server'
import { getMessagesFor, sendMessage, markRead, messagingConfigured } from '@/lib/data/messages'
import { findUser } from '@/lib/auth/users'
import { verifySession, SESSION_COOKIE } from '@/lib/auth/server'

export const dynamic = 'force-dynamic'

function me(req: NextRequest) { return verifySession(req.cookies.get(SESSION_COOKIE)?.value) }

// GET /api/messages → messages involving the signed-in user (identity comes from the cookie, not a param).
export async function GET(req: NextRequest) {
  const s = me(req)
  if (!s) return NextResponse.json({ configured: messagingConfigured(), messages: [] }, { status: 401 })
  const messages = await getMessagesFor(s.u)
  return NextResponse.json({ configured: messagingConfigured(), messages })
}

// POST { to, body } → send from the signed-in user; or { markReadWith } → mark a thread read.
export async function POST(req: NextRequest) {
  const s = me(req)
  if (!s) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  let b: { to?: string; body?: string; markReadWith?: string }
  try { b = await req.json() } catch { return NextResponse.json({ error: 'bad_request' }, { status: 400 }) }

  if (b.markReadWith && findUser(b.markReadWith)) {
    await markRead(s.u, b.markReadWith)
    return NextResponse.json({ ok: true })
  }
  if (!b.to || !findUser(b.to) || !b.body?.trim()) return NextResponse.json({ error: 'invalid' }, { status: 400 })
  const row = await sendMessage(s.u, b.to, b.body.trim().slice(0, 4000))
  return row ? NextResponse.json({ ok: true, message: row }) : NextResponse.json({ error: 'send_failed' }, { status: 502 })
}
