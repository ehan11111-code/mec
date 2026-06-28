#!/usr/bin/env node
/**
 * Cache WhatsApp media into Supabase Storage so the portal can serve it reliably.
 *
 * WHY: /api/wa-file decrypts WhatsApp media on the fly, but Vercel's servers can't reliably fetch
 * WhatsApp's CDN (mmg.whatsapp.net throttles datacenter IPs) — so files fail to open in production.
 * This script runs on a machine that CAN reach the CDN (your laptop, like the refresh task), fetches +
 * decrypts each document/image, and uploads the real file to the private `wa-media` Storage bucket.
 * The portal then serves the cached copy from Supabase (which Vercel can always reach).
 *
 *   node scripts/cache-media.js        # cache any new media (idempotent — skips already-cached)
 *
 * Reads .env.local. Run on a timer (it's wired into scripts/refresh-statements.ps1).
 */
const crypto = require('crypto'); const fs = require('fs'); const path = require('path')
function loadEnv() {
  const p = path.join(__dirname, '..', '.env.local'); if (!fs.existsSync(p)) return
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) { const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim()); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '') }
}
const INFO = { image: 'WhatsApp Image Keys', document: 'WhatsApp Document Keys', video: 'WhatsApp Video Keys', audio: 'WhatsApp Audio Keys' }
const BUCKET = 'wa-media'

function findMedia(node) {
  if (!node || typeof node !== 'object') return null
  if (node.documentMessage) return { kind: 'document', m: node.documentMessage }
  if (node.imageMessage) return { kind: 'image', m: node.imageMessage }
  for (const k of Object.keys(node)) { const r = findMedia(node[k]); if (r) return r }
  return null
}
async function fetchEnc(u) {
  const headers = { 'User-Agent': 'WhatsApp/2.2412.50 A', 'Accept': '*/*', 'Accept-Encoding': 'identity' }
  for (let i = 0; i < 3; i++) {
    try { const res = await fetch(u, { headers, redirect: 'follow' }); if (res.ok) { const b = Buffer.from(await res.arrayBuffer()); if (b.length > 100) return b } } catch {}
    await new Promise(r => setTimeout(r, 300 * (i + 1)))
  }
  return null
}
function decrypt(enc, mediaKeyB64, kind) {
  const mk = Buffer.from(mediaKeyB64, 'base64')
  const exp = Buffer.from(crypto.hkdfSync('sha256', mk, new Uint8Array(0), Buffer.from(INFO[kind]), 112))
  const iv = Buffer.from(exp.subarray(0, 16)), ck = Buffer.from(exp.subarray(16, 48))
  const d = crypto.createDecipheriv('aes-256-cbc', ck, iv)
  return Buffer.concat([d.update(enc.subarray(0, enc.length - 10)), d.final()])
}
const valid = (b) => b && b.length >= 8 && (b.subarray(0, 4).toString('latin1').startsWith('%PDF') || (b[0] === 0xff && b[1] === 0xd8) || b.subarray(0, 4).toString('latin1').startsWith('\x89PNG') || b.length > 256)

async function main() {
  loadEnv()
  const SUPA = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, ''); const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!SUPA || !KEY) { console.error('Missing Supabase env in .env.local'); process.exit(1) }
  const H = { apikey: KEY, Authorization: `Bearer ${KEY}` }

  // 1. Ensure the private bucket exists (ignore "already exists").
  await fetch(`${SUPA}/storage/v1/bucket`, { method: 'POST', headers: { ...H, 'Content-Type': 'application/json' }, body: JSON.stringify({ id: BUCKET, name: BUCKET, public: false }) }).catch(() => {})

  // 2. What's already cached?
  const cached = new Set()
  try {
    const lr = await fetch(`${SUPA}/storage/v1/object/list/${BUCKET}`, { method: 'POST', headers: { ...H, 'Content-Type': 'application/json' }, body: JSON.stringify({ prefix: '', limit: 5000, offset: 0 }) })
    const lj = await lr.json(); if (Array.isArray(lj)) for (const o of lj) cached.add(o.name)
  } catch {}

  // 3. Media messages to consider — by message_type (document/image/video/audio) OR a classified
  //    doc_type. NOT by media_url: some document rows have media_url null but still carry the media node
  //    inside `raw`, and those are exactly the ones the live route fails on. findMedia decides per row.
  const filter = `or=(message_type.in.(document,image,video,audio),doc_type.in.(invoice,delivery_note,payment))`
  const r = await fetch(`${SUPA}/rest/v1/whatsapp_intake?${filter}&select=message_id,raw,doc_type,received_at&order=received_at.desc&limit=500`, { headers: H })
  const rows = await r.json()
  if (!Array.isArray(rows)) { console.error('intake read failed'); process.exit(1) }

  let cachedN = 0, skipN = 0, failN = 0
  for (const row of rows) {
    const id = row.message_id
    if (cached.has(id)) { skipN++; continue }
    const raw = row.raw
    const msg = raw?.data?.messages?.message || raw?.messages?.message || raw?.message || raw
    const f = findMedia(msg)
    if (!f || !f.m?.mediaKey || !(f.m.url || f.m.directPath)) { skipN++; continue }
    const urls = [f.m.url, f.m.directPath ? `https://mmg.whatsapp.net${f.m.directPath}` : null].filter(Boolean)
    let out = null
    for (const u of urls) { const enc = await fetchEnc(u); if (!enc) continue; try { const dec = decrypt(enc, f.m.mediaKey, f.kind); if (valid(dec)) { out = dec; break } } catch {} }
    if (!out) { failN++; continue }
    const mime = f.m.mimetype || (f.kind === 'image' ? 'image/jpeg' : 'application/octet-stream')
    const up = await fetch(`${SUPA}/storage/v1/object/${BUCKET}/${encodeURIComponent(id)}`, { method: 'POST', headers: { ...H, 'Content-Type': mime, 'x-upsert': 'true' }, body: out })
    if (up.ok) { cachedN++; process.stdout.write('.') } else { failN++ }
  }
  console.log(`\nCached ${cachedN} new file(s); ${skipN} already cached/no-media; ${failN} unavailable.`)
}
main().catch(e => { console.error(e); process.exit(1) })
