import { NextRequest, NextResponse } from 'next/server'
import { reportError } from '@/lib/integrations/errors'

export const dynamic = 'force-dynamic'

// POST { source, message, context? } → WhatsApp-alert the team + log. Used by the client error boundary,
// n8n error handler, or any external monitor. Secret-gated via the WaSender webhook secret.
export async function POST(req: NextRequest) {
  const secret = process.env.WASENDER_WEBHOOK_SECRET || process.env.STATUS_API_SECRET
  const key = req.nextUrl.searchParams.get('key') || req.headers.get('x-jarvis-key')
  const trusted = !secret || key === secret
  let b: { source?: string; message?: string; context?: string }
  try { b = await req.json() } catch { return NextResponse.json({ error: 'bad_request' }, { status: 400 }) }
  // Untrusted callers (the client error boundary) can't hold the secret — accept them but force the
  // source so they can't spoof, and rely on reportError's per-message throttle to prevent spam.
  const source = trusted ? (b.source || 'unknown') : 'client-ui'
  await reportError(source, b.message || 'no message', b.context)
  return NextResponse.json({ ok: true })
}
