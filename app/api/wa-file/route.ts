import crypto from 'crypto'

export const dynamic = 'force-dynamic'

// Serve a WhatsApp document/image that arrived via WaSender. WhatsApp media is AES-256-CBC encrypted;
// the key is derived from the message's mediaKey via HKDF-SHA256 with a media-type-specific info string.
// We look up the stored raw payload, download the .enc file, decrypt it, and stream it back inline.

const INFO: Record<string, string> = {
  image: 'WhatsApp Image Keys', document: 'WhatsApp Document Keys',
  video: 'WhatsApp Video Keys', audio: 'WhatsApp Audio Keys'
}

// Recursively find the first imageMessage / documentMessage node inside the WhatsApp message envelope.
function findMedia(node: any): { kind: 'image' | 'document'; m: any } | null {
  if (!node || typeof node !== 'object') return null
  if (node.documentMessage) return { kind: 'document', m: node.documentMessage }
  if (node.imageMessage) return { kind: 'image', m: node.imageMessage }
  for (const k of Object.keys(node)) {
    const r = findMedia(node[k])
    if (r) return r
  }
  return null
}

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return new Response('missing id', { status: 400 })
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '')
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!base || !key) return new Response('not configured', { status: 500 })

  // fetch the stored raw payload for this message
  let raw: any
  try {
    const r = await fetch(`${base}/rest/v1/whatsapp_intake?message_id=eq.${encodeURIComponent(id)}&select=raw,body`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: 'no-store'
    })
    const j = await r.json()
    raw = Array.isArray(j) && j[0] ? j[0].raw : null
  } catch { return new Response('lookup failed', { status: 502 }) }
  if (!raw) return new Response('message not found', { status: 404 })

  const msg = raw?.data?.messages?.message || raw?.messages?.message || raw?.message || raw
  const found = findMedia(msg)
  if (!found || !found.m?.url || !found.m?.mediaKey) return new Response('no downloadable media on this message', { status: 404 })
  const media = found.m

  try {
    const mediaKey = Buffer.from(media.mediaKey, 'base64')
    const expanded = Buffer.from(crypto.hkdfSync('sha256', mediaKey, Buffer.alloc(0), Buffer.from(INFO[found.kind]), 112))
    const iv = expanded.subarray(0, 16)
    const cipherKey = expanded.subarray(16, 48)

    const encRes = await fetch(media.url)
    if (!encRes.ok) return new Response('media fetch failed', { status: 502 })
    const enc = Buffer.from(await encRes.arrayBuffer())
    const ciphertext = enc.subarray(0, enc.length - 10)   // last 10 bytes are the MAC

    const decipher = crypto.createDecipheriv('aes-256-cbc', cipherKey, iv)
    const out = Buffer.concat([decipher.update(ciphertext), decipher.final()])

    const mime = media.mimetype || (found.kind === 'image' ? 'image/jpeg' : 'application/octet-stream')
    const fname = (media.fileName || media.title || `${found.kind}`).replace(/"/g, '')
    return new Response(out, {
      headers: {
        'content-type': mime,
        'content-disposition': `inline; filename="${fname}"`,
        'cache-control': 'private, max-age=300'
      }
    })
  } catch (e) {
    return new Response('decrypt failed', { status: 500 })
  }
}
