import { NextRequest, NextResponse } from 'next/server'
import { sendWhatsApp, sendEmail, JARVIS_TEAM } from '@/lib/integrations/notify'

export const dynamic = 'force-dynamic'

// Best-effort log of the inquiry to Supabase (so there's an audit trail even if a channel fails).
async function logInquiry(row: { name: string; email: string; phone: string; message: string }) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return
  try {
    await fetch(`${url.replace(/\/+$/, '')}/rest/v1/contact_inquiries`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ ...row, source: 'portal' }), cache: 'no-store'
    })
  } catch { /* ignore */ }
}

// POST { name, message, email?, phone? } → fan out to the Jarvis team on WhatsApp + email, log it.
export async function POST(req: NextRequest) {
  let b: { name?: string; message?: string; email?: string; phone?: string }
  try { b = await req.json() } catch { return NextResponse.json({ error: 'bad_request' }, { status: 400 }) }
  const name = (b.name || '').trim()
  const message = (b.message || '').trim()
  if (!name || !message) return NextResponse.json({ error: 'name + message required' }, { status: 400 })
  const email = (b.email || '').trim().slice(0, 200)
  const phone = (b.phone || '').trim().slice(0, 40)

  await logInquiry({ name, email, phone, message: message.slice(0, 4000) })

  const waText =
    `📨 *New MEC portal inquiry*\n\n` +
    `👤 ${name}\n` +
    (email ? `✉️ ${email}\n` : '') +
    (phone ? `📞 ${phone}\n` : '') +
    `\n💬 ${message}`

  const html =
    `<h3>New MEC portal inquiry</h3>` +
    `<p><b>Name:</b> ${escapeHtml(name)}</p>` +
    (email ? `<p><b>Email:</b> ${escapeHtml(email)}</p>` : '') +
    (phone ? `<p><b>Phone:</b> ${escapeHtml(phone)}</p>` : '') +
    `<p><b>Message:</b><br/>${escapeHtml(message).replace(/\n/g, '<br/>')}</p>`

  const [whatsapp, mail] = await Promise.all([
    Promise.all(JARVIS_TEAM.map(m => sendWhatsApp(m.phone, waText))),
    sendEmail('New MEC portal inquiry — ' + name, html)
  ])

  const anyChannel = mail.ok || whatsapp.some(w => w.ok)
  return NextResponse.json({ ok: anyChannel, whatsapp, email: mail })
}

function escapeHtml(s: string) { return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c)) }
