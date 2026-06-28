import { NextRequest, NextResponse } from 'next/server'
import { sendWhatsApp, JARVIS_TEAM } from '@/lib/integrations/notify'
import { operationsSnapshot } from '@/lib/data/dataset'
import { getCredit } from '@/lib/data/credit'
import { getInventoryCount } from '@/lib/data/inventory-count'
import { getConcerns } from '@/lib/data/concerns'
import { getWhatsappIntake } from '@/lib/data/supply'
import { fmtStampUTC } from '@/lib/format/datetime'
import { automations } from '@/lib/automations/registry'

export const dynamic = 'force-dynamic'

type Check = { name: string; ok: boolean | null; detail: string }
const dot = (ok: boolean | null) => (ok === null ? '⚪' : ok ? '🟢' : '🔴')
const fmtSAR = (n: number) => `SAR ${Math.round(n).toLocaleString('en-US')}`

// run a check with a hard timeout so a hung platform can't stall the whole report
async function timed<T>(p: Promise<T>, ms = 6000): Promise<T | null> {
  return Promise.race([p, new Promise<null>(res => setTimeout(() => res(null), ms))])
}

async function checkSupabase(): Promise<Check & { activity?: any }> {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '')
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return { name: 'Supabase', ok: false, detail: 'not configured' }
  try {
    const r = await timed(fetch(`${url}/rest/v1/whatsapp_intake?select=message_id&archived=eq.false`, {
      headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: 'count=exact', Range: '0-0' }, cache: 'no-store'
    }))
    if (!r) return { name: 'Supabase', ok: false, detail: 'timeout' }
    const n = parseInt((r.headers.get('content-range') || '0/0').split('/')[1] || '0', 10)
    return { name: 'Supabase', ok: r.ok, detail: r.ok ? `${n} live messages` : `http ${r.status}` }
  } catch { return { name: 'Supabase', ok: false, detail: 'unreachable' } }
}

async function checkN8n(): Promise<{ check: Check; flows: { name: string; active: boolean }[] }> {
  const base = (process.env.N8N_API_BASE_URL || '').replace(/\/+$/, '')
  const key = process.env.N8N_API_KEY
  if (!base || !key) return { check: { name: 'n8n', ok: false, detail: 'not configured' }, flows: [] }
  try {
    const r = await timed(fetch(`${base}/api/v1/workflows?limit=100`, { headers: { 'X-N8N-API-KEY': key }, cache: 'no-store' }))
    if (!r || !r.ok) return { check: { name: 'n8n', ok: false, detail: r ? `http ${r.status}` : 'timeout' }, flows: [] }
    const j = await r.json()
    const flows = (j.data || []).map((w: any) => ({ name: w.name, active: !!w.active }))
    const active = flows.filter((f: any) => f.active).length
    return { check: { name: 'n8n', ok: true, detail: `${active}/${flows.length} workflows active` }, flows }
  } catch { return { check: { name: 'n8n', ok: false, detail: 'unreachable' }, flows: [] } }
}

async function checkWaSender(): Promise<Check> {
  const token = process.env.WASENDER_API_TOKEN
  if (!token) return { name: 'WaSender (WhatsApp)', ok: false, detail: 'no token' }
  // best-effort session probe; if the endpoint shape is unknown we still report token presence
  try {
    const r = await timed(fetch('https://wasenderapi.com/api/status', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }))
    if (r && r.ok) { try { const j = await r.json(); const s = j?.status || j?.data?.status; return { name: 'WaSender (WhatsApp)', ok: /connect|online|authenticated/i.test(String(s)), detail: String(s || 'connected') } } catch { return { name: 'WaSender (WhatsApp)', ok: true, detail: 'connected' } } }
    return { name: 'WaSender (WhatsApp)', ok: null, detail: 'token set (status unknown)' }
  } catch { return { name: 'WaSender (WhatsApp)', ok: null, detail: 'token set (status unknown)' } }
}

async function checkOpenAI(): Promise<Check> {
  const key = process.env.OPENAI_API_KEY
  if (!key) return { name: 'OpenAI', ok: false, detail: 'no key' }
  try {
    const r = await timed(fetch('https://api.openai.com/v1/models?limit=1', { headers: { Authorization: `Bearer ${key}` }, cache: 'no-store' }))
    return { name: 'OpenAI', ok: !!(r && r.ok), detail: r ? (r.ok ? 'key valid' : `http ${r.status}`) : 'timeout' }
  } catch { return { name: 'OpenAI', ok: false, detail: 'unreachable' } }
}

async function checkVercel(): Promise<Check> {
  const token = process.env.VERCEL_TOKEN; const pid = process.env.VERCEL_PROJECT_ID
  if (!token || !pid) return { name: 'Portal (Vercel)', ok: null, detail: 'no token' }
  try {
    const r = await timed(fetch(`https://api.vercel.com/v6/deployments?projectId=${pid}&limit=1&target=production`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }))
    if (!r || !r.ok) return { name: 'Portal (Vercel)', ok: null, detail: r ? `http ${r.status}` : 'timeout' }
    const j = await r.json(); const d = j.deployments?.[0]
    const state = d?.readyState || d?.state || 'unknown'
    return { name: 'Portal (Vercel)', ok: state === 'READY', detail: state }
  } catch { return { name: 'Portal (Vercel)', ok: null, detail: 'unreachable' } }
}

// Build the full WhatsApp status report.
async function buildReport(): Promise<string> {
  const [supa, n8n, wa, oai, vercel] = await Promise.all([checkSupabase(), checkN8n(), checkWaSender(), checkOpenAI(), checkVercel()])
  const platforms: Check[] = [vercel, supa, n8n.check, wa, oai]

  // automations: cross the registry's live ones with the actual n8n active state
  const liveAuto = automations.filter(a => a.status === 'live')
  const autoLines = liveAuto.map(a => {
    const match = n8n.flows.find(f => f.name.toLowerCase().includes(a.id.replace(/-/g, ' ').split(' ')[0]) || f.name.toLowerCase().includes('whatsapp') && a.id === 'whatsapp-intake')
    const active = match ? match.active : true
    return `${dot(active)} ${a.name.en}`
  })

  // Last updates — the EXACT date & time of the latest order / document / message (no vague "today"),
  // plus the as-of dates of the credit & inventory statements. Sourced from the live whatsapp_intake feed.
  let updates: string[] = []
  try {
    const live = await getWhatsappIntake(100)                       // newest-first
    const orders = live.filter(m => m.intent === 'order')
    const docs = live.filter(m => m.doc_type && ['invoice', 'delivery_note', 'payment'].includes(String(m.doc_type)))
    const lastOrder = orders[0]; const lastDoc = docs[0]; const lastMsg = live[0]
    const pending = orders.filter(o => (o.order_status || 'pending') === 'pending').length
    const snap = operationsSnapshot(); const credit = getCredit(); const cnt = getInventoryCount(); const concerns = getConcerns()
    const who = (m: typeof lastOrder) => m ? (m.client_name || m.salesperson || m.push_name || m.phone) : ''
    updates = [
      lastOrder ? `• Last order: ${fmtStampUTC(lastOrder.received_at)} — ${lastOrder.order_no ? '#' + lastOrder.order_no + ' ' : ''}${who(lastOrder)}` : '• Last order: none received yet',
      lastDoc ? `• Last document: ${fmtStampUTC(lastDoc.received_at)} — ${lastDoc.doc_type}` : '• Last document: none received yet',
      lastMsg ? `• Last WhatsApp message: ${fmtStampUTC(lastMsg.received_at)}` : '• Last WhatsApp message: none yet',
      `• Open approvals: ${pending} pending · payments due ${fmtSAR(snap.payments.due)}`,
      `• Receivables (المديونية): ${fmtSAR(credit.total)} · ${credit.overdueCount} overdue >30d · statement ${credit.asOf}`,
      `• Inventory count: ${cnt.rows.length} SKUs · count ${cnt.asOf} · on-hand ${snap.warehouse.onHand.toLocaleString('en-US')}/${snap.warehouse.capacity}`,
      `• Data concerns: ${concerns.length}${concerns.length ? ' — ' + concerns.slice(0, 2).map(c => c.title.en).join('; ') : ''}`,
    ]
  } catch (e) { updates = ['• (activity unavailable)'] }

  const now = new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC'
  const allOk = platforms.every(p => p.ok !== false)
  return [
    `🤖 *JARVIS — MEC Portal status*`,
    `${now}  ${allOk ? '— all systems nominal' : '— ⚠️ attention needed'}`,
    ``,
    `*Platforms*`,
    ...platforms.map(p => `${dot(p.ok)} ${p.name} — ${p.detail}`),
    ``,
    `*Automations (live)*`,
    ...(autoLines.length ? autoLines : ['• none live']),
    ``,
    `*Last updates (UTC — date & time)*`,
    ...updates,
    ``,
    `_Send "report" or "hi jarvis" anytime for this status._`,
  ].join('\n')
}

// GET /api/jarvis-status?key=<secret>[&send=1&to=9665...]
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const secret = process.env.WASENDER_WEBHOOK_SECRET || process.env.STATUS_API_SECRET
  if (secret && sp.get('key') !== secret) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const text = await buildReport()
  const sent: any[] = []
  if (sp.get('send') === '1') {
    const to = sp.get('to')
    const targets = to ? [to] : JARVIS_TEAM.map(t => t.phone)
    for (const t of targets) sent.push(await sendWhatsApp(t, text))
  }
  return NextResponse.json({ ok: true, text, sent })
}
