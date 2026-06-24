import { NextRequest, NextResponse } from 'next/server'
import { getMessagesFor, sendMessage, markRead, messagingConfigured } from '@/lib/data/messages'
import { findUser } from '@/lib/auth/users'

export const dynamic = 'force-dynamic'

// GET /api/messages?user=<username>  → all messages involving that user (+ configured flag).
export async function GET(req: NextRequest) {
  const user = req.nextUrl.searchParams.get('user') || ''
  if (!findUser(user)) return NextResponse.json({ configured: messagingConfigured(), messages: [] })
  const messages = await getMessagesFor(user)
  return NextResponse.json({ configured: messagingConfigured(), messages })
}

// POST { from, to, body }  → send; or { from, markReadWith }  → mark a thread read.
export async function POST(req: NextRequest) {
  let b: { from?: string; to?: string; body?: string; markReadWith?: string }
  try { b = await req.json() } catch { return NextResponse.json({ error: 'bad_request' }, { status: 400 }) }
  if (!b.from || !findUser(b.from)) return NextResponse.json({ error: 'invalid_sender' }, { status: 400 })

  if (b.markReadWith && findUser(b.markReadWith)) {
    await markRead(b.from, b.markReadWith)
    return NextResponse.json({ ok: true })
  }
  if (!b.to || !findUser(b.to) || !b.body?.trim()) return NextResponse.json({ error: 'invalid' }, { status: 400 })
  const row = await sendMessage(b.from, b.to, b.body.trim().slice(0, 4000))
  return row ? NextResponse.json({ ok: true, message: row }) : NextResponse.json({ error: 'send_failed' }, { status: 502 })
}
