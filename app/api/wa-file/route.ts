import crypto from 'crypto'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// WhatsApp's CDN (mmg.whatsapp.net) is picky about who fetches the encrypted media — a plain server
// request can come back throttled/short, which corrupts the ciphertext. Fetch with browser-ish headers,
// follow redirects, and retry a couple of times.
async function fetchEnc(u: string): Promise<Buffer | null> {
  const headers = { 'User-Agent': 'WhatsApp/2.2412.50 A', 'Accept': '*/*', 'Accept-Encoding': 'identity' }
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(u, { headers, redirect: 'follow', cache: 'no-store' })
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer())
        if (buf.length > 100) return buf
      }
    } catch { /* retry */ }
    await new Promise(r => setTimeout(r, 250 * (i + 1)))
  }
  return null
}

// Does the decrypted output look like a real file (PDF / JPEG / PNG / generic)? Guards against serving
// garbage from a corrupted fetch.
function looksValid(buf: Buffer): boolean {
  if (buf.length < 8) return false
  const h = buf.subarray(0, 4).toString('latin1')
  return h.startsWith('%PDF') || buf[0] === 0xff && buf[1] === 0xd8 /* jpeg */ || h.startsWith('\x89PNG') || buf.length > 256
}

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
  const media = found?.m
  const fname = ((media?.fileName || media?.title || found?.kind || 'file') as string).replace(/[\r\n"]/g, '')
  const mime = media?.mimetype || (found?.kind === 'image' ? 'image/jpeg' : 'application/octet-stream')

  // 1. Prefer the cached copy in Supabase Storage (decrypted by scripts/cache-media.js on a machine that
  //    can reach WhatsApp's CDN). Vercel can always reach Supabase, so this path is reliable.
  let dbg = ''
  try {
    const cacheRes = await fetch(`${base}/storage/v1/object/wa-media/${encodeURIComponent(id)}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: 'no-store'
    })
    dbg = `storage:${cacheRes.status}`
    if (cacheRes.ok) {
      const buf = Buffer.from(await cacheRes.arrayBuffer())
      if (buf.length > 8) return new Response(buf, {
        headers: { 'content-type': cacheRes.headers.get('content-type') || mime, 'content-disposition': `inline; filename="${fname}"`, 'cache-control': 'private, max-age=3600' }
      })
      dbg += `:bytes${buf.length}`
    }
  } catch (e) { dbg = 'storage:throw:' + String(e instanceof Error ? e.message : e).slice(0, 60) }
  if (req.url.includes('debug=1')) return new Response(`dbg=${dbg} base=${base.slice(0, 40)} keylen=${(key || '').length}`, { status: 200 })

  // 2. Fallback: decrypt live from WhatsApp's CDN (works when the server can reach it).
  if (!found || !media?.mediaKey || !(media.url || media.directPath)) return new Response('no downloadable media on this message', { status: 404 })

  // Candidate URLs: the message url, then a host+directPath reconstruction (the url can expire).
  const urls: string[] = []
  if (media.url) urls.push(media.url)
  if (media.directPath) urls.push(`https://mmg.whatsapp.net${media.directPath}`)

  try {
    const mediaKey = Buffer.from(media.mediaKey, 'base64')
    const expanded = Buffer.from(crypto.hkdfSync('sha256', mediaKey, new Uint8Array(0), Buffer.from(INFO[found.kind]), 112))
    const iv = Buffer.from(expanded.subarray(0, 16))         // copy out of the hkdf buffer (avoids view issues)
    const cipherKey = Buffer.from(expanded.subarray(16, 48))

    let out: Buffer | null = null
    let lastStatus = ''
    for (const u of urls) {
      const enc = await fetchEnc(u)
      if (!enc) { lastStatus = 'fetch'; continue }
      try {
        const decipher = crypto.createDecipheriv('aes-256-cbc', cipherKey, iv)
        const dec = Buffer.concat([decipher.update(enc.subarray(0, enc.length - 10)), decipher.final()])
        if (looksValid(dec)) { out = dec; break }
        lastStatus = 'invalid'
      } catch { lastStatus = 'decrypt' }
    }
    if (!out) return new Response(`media unavailable (${lastStatus || 'fetch'}) — the file may have expired on WhatsApp's servers`, { status: 502 })

    return new Response(out, {
      headers: {
        'content-type': mime,
        'content-disposition': `inline; filename="${fname}"`,
        'cache-control': 'private, max-age=600'
      }
    })
  } catch (e) {
    return new Response('decrypt failed', { status: 500 })
  }
}
