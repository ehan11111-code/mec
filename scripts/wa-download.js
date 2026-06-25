#!/usr/bin/env node
/**
 * Download + decrypt a WhatsApp media file that arrived via WaSender, by message_id.
 * WhatsApp media is AES-256-CBC encrypted; the key derives from the message's mediaKey via HKDF-SHA256.
 *   node scripts/wa-download.js <message_id> [outPath]
 * Writes the decrypted file and prints its path + size + sniffed type. Reads .env.local. Node 18+.
 */
const fs = require('fs'); const path = require('path'); const crypto = require('crypto')
function loadEnv() {
  const p = path.join(__dirname, '..', '.env.local'); if (!fs.existsSync(p)) return
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) { const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim()); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '') }
}
const INFO = { image: 'WhatsApp Image Keys', document: 'WhatsApp Document Keys', video: 'WhatsApp Video Keys', audio: 'WhatsApp Audio Keys' }
function findMedia(node) {
  if (!node || typeof node !== 'object') return null
  if (node.documentMessage) return { kind: 'document', m: node.documentMessage }
  if (node.imageMessage) return { kind: 'image', m: node.imageMessage }
  for (const k of Object.keys(node)) { const r = findMedia(node[k]); if (r) return r }
  return null
}
async function main() {
  loadEnv()
  const SUPA = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, ''); const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  const id = process.argv[2]; if (!id) { console.error('usage: node scripts/wa-download.js <message_id> [out]'); process.exit(1) }
  const r = await fetch(`${SUPA}/rest/v1/whatsapp_intake?message_id=eq.${encodeURIComponent(id)}&select=raw,body`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } })
  const j = await r.json(); const row = Array.isArray(j) && j[0]
  if (!row) { console.error('message not found'); process.exit(1) }
  const msg = row.raw?.data?.messages?.message || row.raw?.messages?.message || row.raw?.message || row.raw
  const found = findMedia(msg)
  if (!found || !found.m?.url || !found.m?.mediaKey) { console.error('no downloadable media on this message'); process.exit(1) }
  const media = found.m
  const mediaKey = Buffer.from(media.mediaKey, 'base64')
  const expanded = Buffer.from(crypto.hkdfSync('sha256', mediaKey, Buffer.alloc(0), Buffer.from(INFO[found.kind]), 112))
  const iv = expanded.subarray(0, 16); const cipherKey = expanded.subarray(16, 48)
  const enc = Buffer.from(await (await fetch(media.url)).arrayBuffer())
  const decipher = crypto.createDecipheriv('aes-256-cbc', cipherKey, iv)
  const out = Buffer.concat([decipher.update(enc.subarray(0, enc.length - 10)), decipher.final()])
  const dir = path.join(__dirname, '..', 'DATA', 'inbox'); fs.mkdirSync(dir, { recursive: true })
  const name = (process.argv[3] || (media.fileName || media.title || `${id}.${found.kind === 'image' ? 'jpg' : 'pdf'}`)).replace(/[\\/:*?"<>|]/g, '_')
  const dest = process.argv[3] && process.argv[3].includes(path.sep) ? process.argv[3] : path.join(dir, name)
  fs.writeFileSync(dest, out)
  const sniff = out.subarray(0, 5).toString('latin1')
  console.log(`wrote ${dest} (${out.length} bytes) sniff=${JSON.stringify(sniff)}`)
}
main().catch(e => { console.error(e); process.exit(1) })
