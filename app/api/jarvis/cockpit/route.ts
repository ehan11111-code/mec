import { NextRequest, NextResponse } from 'next/server'
import { verifySession, SESSION_COOKIE } from '@/lib/auth/server'
import { getWhatsappIntake } from '@/lib/data/supply'
import { intakeStats } from '@/lib/data/reprocess'
import { getConcerns } from '@/lib/data/concerns'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/jarvis/cockpit — reliability + accuracy stats, the live "what's flowing through" feed (each item
// with JARVIS's read of it), and a short data-derived interpretation. Any logged-in user may read it.
export async function GET(req: NextRequest) {
  const s = verifySession(req.cookies.get(SESSION_COOKIE)?.value)
  if (!s) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const [stats, rows] = await Promise.all([intakeStats(), getWhatsappIntake(40)])
  const feed = rows.map(m => ({
    message_id: m.message_id,
    received_at: m.received_at,
    who: m.understanding?.who || m.client_name || m.salesperson || m.push_name || null,
    type: m.understanding?.type || (m.doc_type ? `doc:${m.doc_type}` : m.intent || 'chatter'),
    importance: m.understanding?.importance || 'low',
    action: m.understanding?.action || null,
    summary: m.understanding?.summary || (m.media_filename || m.body || '').slice(0, 100),
    doc_type: m.doc_type || null,
    intent: m.intent || null,
    media_status: m.media_status || null,
    extract_status: m.extract_status || null,
    understood: !!m.understanding,
  }))

  // Deterministic interpretation — reliable, no model call. Highlights what needs attention.
  const interp: string[] = []
  interp.push(`${stats.understood}/${stats.total} recent messages read (${stats.understandRate}%); ${stats.highImportance} high-importance.`)
  if (stats.mediaFailed > 0) interp.push(`⚠ ${stats.mediaFailed} media failed to fetch — the host may be throttled by WhatsApp's CDN; the local fallback worker will retry.`)
  if (stats.mediaPending > 0) interp.push(`${stats.mediaPending} document(s) awaiting extraction by the worker.`)
  if (stats.extractFailed > 0) interp.push(`⚠ ${stats.extractFailed} statement(s) failed OCR — check the file or re-run the worker.`)
  const concerns = getConcerns()
  if (concerns.length) interp.push(`${concerns.length} open data concern(s): ${concerns.slice(0, 2).map(c => c.title.en).join('; ')}.`)
  if (stats.mediaFailed === 0 && stats.mediaPending === 0 && stats.understandRate >= 90) interp.push('Intake is healthy — everything that arrived was read and processed.')

  return NextResponse.json({ stats, feed, interpretation: interp, at: new Date().toISOString() })
}
