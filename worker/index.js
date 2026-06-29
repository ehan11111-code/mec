#!/usr/bin/env node
/**
 * MEC Extract Worker — always-on media fetch + OCR.
 *
 * WHY: the n8n intake can't reliably fetch+decrypt WhatsApp media from a datacenter IP, so PDFs were
 * silently dropped. This worker runs where the CDN is reachable, decrypts every captured document/image,
 * caches it to Supabase Storage, and OCR-extracts المخزون/المديونية statements straight into the database —
 * so the portal updates live, with no commit/push.
 *
 *   node worker/index.js            # poll forever (cloud: Railway/Render)
 *   node worker/index.js --once     # one pass then exit (local fallback / cron)
 *   node worker/index.js --spike    # spike test: can THIS host reach WhatsApp's CDN? (decrypt 3, report)
 *
 * Env (Railway vars, or .env.local locally): NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 * GOOGLE_VISION_API_KEY, OPENAI_API_KEY. WORKER_ID (default 'cloud'), POLL_MS (default 10000).
 */
const fs = require('fs'); const path = require('path')
function loadEnv() {
  const p = path.join(__dirname, '..', '.env.local'); if (!fs.existsSync(p)) return
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) { const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim()); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '') }
}
loadEnv()

const { getRows, ensureBucket, heartbeat, configured } = require('./lib/supa')
const { processRow, finalizeRow, PENDING_FILTER, FINALIZE_FILTER } = require('./lib/process')
const { decryptRowMedia } = require('./lib/wa')

const WORKER_ID = process.env.WORKER_ID || (process.argv.includes('--once') ? 'local' : 'cloud')
const POLL_MS = Number(process.env.POLL_MS || 10000)
const keys = () => ({ VKEY: process.env.GOOGLE_VISION_API_KEY, OKEY: process.env.OPENAI_API_KEY })

// Recover misfiled documents: read cached "other" docs with vision and set the real doc_type.
async function finalize() {
  const rows = await getRows(`whatsapp_intake?${FINALIZE_FILTER}`)
  let fixed = 0; const recap = {}
  for (const row of rows) {
    const res = await finalizeRow(row, keys())
    if (res.ok && res.kind && res.kind !== 'other') { fixed++; recap[res.kind] = (recap[res.kind] || 0) + 1; process.stdout.write(`[${res.kind}]`) }
    else process.stdout.write(res.ok ? '·' : 'x')
  }
  if (rows.length) console.log(`\nfinalize: ${fixed} reclassified of ${rows.length} — ${JSON.stringify(recap)}`)
  return { fixed, seen: rows.length, recap }
}

async function pass() {
  const rows = await getRows(`whatsapp_intake?${PENDING_FILTER}`)
  let processed = 0, failed = 0
  for (const row of rows) {
    const res = await processRow(row, keys())
    if (res.ok) { processed++; process.stdout.write(res.kind ? `[${res.kind}:${res.count ?? '·'}]` : '.') }
    else { failed++; process.stdout.write('x') }
  }
  // After caching new media, finalize any cached-but-unclassified documents (recover the missed ones).
  const f = await finalize()
  if (rows.length) console.log(`\n${new Date().toISOString()} — ${processed} ok, ${failed} failed`)
  await heartbeat(WORKER_ID, processed + f.fixed, failed, `${rows.length} pending · ${f.fixed} reclassified`)
  return { processed, failed, seen: rows.length, finalized: f.fixed }
}

// Can this host actually reach WhatsApp's CDN? Decrypts up to 3 recent media without writing anything.
async function spike() {
  const rows = await getRows(`whatsapp_intake?or=(message_type.in.(document,image),doc_type.in.(invoice,delivery_note,payment,credit,inventory))&select=message_id,raw,doc_type,received_at&order=received_at.desc&limit=3`)
  if (!rows.length) { console.log('spike: no media rows to test'); return }
  let ok = 0
  for (const row of rows) { const m = await decryptRowMedia(row); console.log(`  ${row.message_id.slice(0, 16)}… → ${m ? 'FETCHED+DECRYPTED ✓ (' + m.buf.length + ' bytes)' : 'unreachable ✗'}`); if (m) ok++ }
  console.log(`\nspike: ${ok}/${rows.length} reachable from this host (${WORKER_ID}).` + (ok === 0 ? ' → this host is throttled; use the local fallback.' : ' → this host can run the worker.'))
}

async function main() {
  if (!configured()) { console.error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY'); process.exit(1) }
  await ensureBucket()
  if (process.argv.includes('--spike')) return spike()
  if (process.argv.includes('--finalize')) { const r = await finalize(); console.log(`done — ${r.fixed} reclassified.`); return }
  if (process.argv.includes('--once')) { const r = await pass(); console.log(`done (${r.processed}/${r.seen}, +${r.finalized} reclassified).`); return }
  console.log(`MEC extract worker '${WORKER_ID}' polling every ${POLL_MS}ms…`)
  // eslint-disable-next-line no-constant-condition
  while (true) { try { await pass() } catch (e) { console.error('pass error:', String(e).slice(0, 200)) } await new Promise(r => setTimeout(r, POLL_MS)) }
}
main().catch(e => { console.error(e); process.exit(1) })
