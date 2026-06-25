#!/usr/bin/env node
/**
 * Archive the WhatsApp test data (orders / approvals / documents we ran while testing) so it disappears
 * from the portal but stays in the automation audit log. Sets whatsapp_intake.archived = true on every
 * existing row. Run this ONCE, before joining the real groups, so the launch starts clean.
 *
 *   node scripts/archive-whatsapp-test.js            # archive all current rows
 *   node scripts/archive-whatsapp-test.js --restore  # un-archive everything (undo)
 *   node scripts/archive-whatsapp-test.js --before 2026-06-25T00:00:00Z   # archive up to a cutoff only
 *
 * Requires the `archived` column (run supabase/schema.sql first). Reads .env.local. Node 18+.
 */
const fs = require('fs'); const path = require('path')
function loadEnv() {
  const p = path.join(__dirname, '..', '.env.local'); if (!fs.existsSync(p)) return
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) { const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim()); if (m && !process.env[m[1]]) process.env[m[1]] = m[2] }
}

async function main() {
  loadEnv()
  const SUPA = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '')
  const SKEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!SUPA || !SKEY) { console.error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local'); process.exit(1) }

  const args = process.argv.slice(2)
  const restore = args.includes('--restore')
  const beforeIdx = args.indexOf('--before')
  const before = beforeIdx >= 0 ? args[beforeIdx + 1] : null
  const where = before ? `received_at=lte.${encodeURIComponent(before)}` : 'message_id=neq.__none__'
  const headers = { apikey: SKEY, Authorization: `Bearer ${SKEY}`, 'Content-Type': 'application/json' }

  // Count first (so we report what we touched).
  const cr = await fetch(`${SUPA}/rest/v1/whatsapp_intake?select=message_id&${where}`, { headers: { ...headers, Prefer: 'count=exact', Range: '0-0' } })
  const total = parseInt((cr.headers.get('content-range') || '0/0').split('/')[1] || '0', 10)

  const r = await fetch(`${SUPA}/rest/v1/whatsapp_intake?${where}`, {
    method: 'PATCH', headers: { ...headers, Prefer: 'return=minimal' },
    body: JSON.stringify({ archived: !restore })
  })
  if (!r.ok) {
    const body = await r.text()
    if (/column .*archived.* does not exist/i.test(body) || r.status === 400) {
      console.error('\n✗ The `archived` column is missing. Run supabase/schema.sql in the Supabase SQL editor first, then re-run this.\n')
    }
    console.error(`Failed (${r.status}): ${body}`); process.exit(1)
  }
  console.log(`\n✓ ${restore ? 'Restored (un-archived)' : 'Archived'} ${total} WhatsApp row(s). They are ${restore ? 'visible in the portal again' : 'hidden from the portal but kept in the automation log'}.\n`)
}
main().catch(e => { console.error(e); process.exit(1) })
