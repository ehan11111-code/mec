// WhatsApp media: find the media node in a stored webhook payload, fetch the encrypted bytes from the CDN,
// decrypt (HKDF-SHA256 + AES-256-CBC), and validate. Shared by the cloud worker AND the local fallback so
// there is ONE implementation of the tricky crypto. (Mirrors scripts/cache-media.js, which predates this.)
const crypto = require('crypto')

const INFO = { image: 'WhatsApp Image Keys', document: 'WhatsApp Document Keys', video: 'WhatsApp Video Keys', audio: 'WhatsApp Audio Keys' }

// Walk the (deeply nested) message object to find the first document/image media node.
function findMedia(node) {
  if (!node || typeof node !== 'object') return null
  if (node.documentMessage) return { kind: 'document', m: node.documentMessage }
  if (node.imageMessage) return { kind: 'image', m: node.imageMessage }
  for (const k of Object.keys(node)) { const r = findMedia(node[k]); if (r) return r }
  return null
}

// Pull the message object out of whatever envelope the webhook used.
function messageOf(raw) {
  return raw?.data?.messages?.message || raw?.messages?.message || raw?.message || raw
}

// Fetch encrypted media with a WhatsApp-like UA + retry/backoff. Returns Buffer or null.
async function fetchEnc(u, tries = 4) {
  const headers = { 'User-Agent': 'WhatsApp/2.2412.50 A', 'Accept': '*/*', 'Accept-Encoding': 'identity' }
  for (let i = 0; i < tries; i++) {
    try { const res = await fetch(u, { headers, redirect: 'follow' }); if (res.ok) { const b = Buffer.from(await res.arrayBuffer()); if (b.length > 100) return b } } catch {}
    await new Promise(r => setTimeout(r, 400 * (i + 1)))
  }
  return null
}

function decrypt(enc, mediaKeyB64, kind) {
  const mk = Buffer.from(mediaKeyB64, 'base64')
  const exp = Buffer.from(crypto.hkdfSync('sha256', mk, new Uint8Array(0), Buffer.from(INFO[kind] || INFO.document), 112))
  const iv = Buffer.from(exp.subarray(0, 16)), ck = Buffer.from(exp.subarray(16, 48))
  const d = crypto.createDecipheriv('aes-256-cbc', ck, iv)
  return Buffer.concat([d.update(enc.subarray(0, enc.length - 10)), d.final()])
}

const looksValid = (b) => b && b.length >= 8 && (
  b.subarray(0, 4).toString('latin1').startsWith('%PDF') ||
  (b[0] === 0xff && b[1] === 0xd8) ||
  b.subarray(0, 4).toString('latin1').startsWith('\x89PNG') ||
  b.length > 256
)

// Given a stored intake row, return the decrypted file bytes + meta, or null if unavailable.
async function decryptRowMedia(row) {
  const f = findMedia(messageOf(row.raw))
  if (!f || !f.m?.mediaKey || !(f.m.url || f.m.directPath)) return null
  const urls = [f.m.url, f.m.directPath ? `https://mmg.whatsapp.net${f.m.directPath}` : null].filter(Boolean)
  for (const u of urls) {
    const enc = await fetchEnc(u)
    if (!enc) continue
    try { const dec = decrypt(enc, f.m.mediaKey, f.kind); if (looksValid(dec)) return { buf: dec, kind: f.kind, mime: f.m.mimetype || (f.kind === 'image' ? 'image/jpeg' : 'application/pdf'), filename: f.m.fileName || f.m.title || '' } } catch {}
  }
  return null
}

module.exports = { findMedia, messageOf, fetchEnc, decrypt, looksValid, decryptRowMedia, INFO }
