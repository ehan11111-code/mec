// Server-only outbound notification helpers (WhatsApp via WaSender, email via Microsoft Graph).
// Never import into a client component — these read server secrets from the environment.

// Jarvis team — receives every contact-form inquiry. KSA numbers normalised to E.164 (966…).
export const JARVIS_TEAM = [
  { name: 'Ehan Munshi', phone: '966500900377' },
  { name: 'Moe Samman', phone: '966556732109' },
  { name: 'Abdulrahman Alhjehani', phone: '966540747300' }
]
export const JARVIS_EMAIL = 'partners@jarvisksa.com'

export type ChannelResult = { target: string; ok: boolean; error?: string }

// Normalise a Saudi number to WaSender's expected form (leading 0 → 966, strip non-digits).
export function toE164(phone: string): string {
  let p = String(phone).replace(/[^\d]/g, '')
  if (p.startsWith('00')) p = p.slice(2)
  if (p.startsWith('0')) p = '966' + p.slice(1)
  return p
}

export async function sendWhatsApp(to: string, text: string): Promise<ChannelResult> {
  const token = process.env.WASENDER_API_TOKEN
  if (!token) return { target: to, ok: false, error: 'no_token' }
  try {
    const r = await fetch('https://wasenderapi.com/api/send-message', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: toE164(to), text }), cache: 'no-store'
    })
    return { target: to, ok: r.ok, error: r.ok ? undefined : `http_${r.status}` }
  } catch (e) { return { target: to, ok: false, error: 'fetch_failed' } }
}

// App-only Microsoft Graph token (client-credentials). Needs Mail.Send application permission + consent.
async function graphToken(): Promise<string | null> {
  const tenant = process.env.MS_OUTLOOK_TENANT_ID
  const id = process.env.MS_OUTLOOK_CLIENT_ID
  const secret = process.env.MS_OUTLOOK_CLIENT_SECRET
  if (!tenant || !id || !secret) return null
  try {
    const r = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: id, client_secret: secret, scope: 'https://graph.microsoft.com/.default', grant_type: 'client_credentials' }),
      cache: 'no-store'
    })
    if (!r.ok) return null
    const j = await r.json()
    return j.access_token ?? null
  } catch { return null }
}

export async function sendEmail(subject: string, html: string, to = JARVIS_EMAIL): Promise<ChannelResult> {
  const token = await graphToken()
  if (!token) return { target: to, ok: false, error: 'no_graph_token' }
  const sender = process.env.MS_OUTLOOK_SENDER || JARVIS_EMAIL
  try {
    const r = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(sender)}/sendMail`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: { subject, body: { contentType: 'HTML', content: html }, toRecipients: [{ emailAddress: { address: to } }] },
        saveToSentItems: true
      }), cache: 'no-store'
    })
    return { target: to, ok: r.ok, error: r.ok ? undefined : `http_${r.status}` }
  } catch { return { target: to, ok: false, error: 'fetch_failed' } }
}
