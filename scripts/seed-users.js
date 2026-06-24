#!/usr/bin/env node
/**
 * Seed the app_users table in Supabase with the MEC roster + scrypt-hashed default passwords.
 * Run AFTER applying supabase/schema.sql (which creates app_users).
 *   node scripts/seed-users.js
 * Idempotent: upserts on username. Passwords are stored ONLY as scrypt hashes.
 * Re-running re-hashes the default passwords (use this to reset everyone to defaults).
 */
const fs = require('fs')
const path = require('path')
const { scryptSync, randomBytes } = require('crypto')

function loadEnv() {
  const p = path.join(__dirname, '..', '.env.local')
  if (!fs.existsSync(p)) return
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim())
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
  }
}
function hash(pw) {
  const salt = randomBytes(16).toString('hex')
  return `scrypt$${salt}$${scryptSync(pw, salt, 64).toString('hex')}`
}

const ROSTER = [
  ['jarvis', 'Jarvis@MEC2026', 'admin', 'JARVIS Admin', 'مشرف جارفيس', 'Jarvis AI · System Administrator', 'جارفيس · مدير النظام', 'partners@jarvisksa.com', '#F36C34'],
  ['f.muzaiyen', 'Falcon-7392', 'ceo', 'Fauwaz Al-Muzaiyen', 'فواز المزين', 'Chief Executive Officer', 'الرئيس التنفيذي', 'fauwaz@mec.com.sa', '#C7882B'],
  ['t.saudi', 'Cedar-4815', 'commercial', 'Tarek Saudi', 'طارق سعودي', 'Commercial Manager', 'المدير التجاري', 'tarek.saudi@mec.com.sa', '#3B82A0'],
  ['a.alhatlani', 'Harbor-2659', 'warehouse', 'Abdullah Alhatlani', 'عبدالله الحطلاني', 'Warehouse & Logistics', 'المستودع واللوجستيات', 'abdullah.alhatlani@mec.com.sa', '#5A8F5A'],
  ['t.habash', 'Ledger-3074', 'finance', 'Tarek Habash', 'طارق حبش', 'Financial Manager', 'المدير المالي', 'tarek.habash@mec.com.sa', '#8A6FB0'],
  ['m.salamh', 'Summit-6128', 'sales', 'Mahmoud Salamh', 'محمود سلامة', 'Sales Team', 'فريق المبيعات', 'mahmoud.salamh@mec.com.sa', '#B0563F'],
  ['t.najar', 'Vertex-5043', 'sales', 'Tamer Najar', 'تامر نجار', 'Sales Team', 'فريق المبيعات', 'tamer.najar@mec.com.sa', '#4F7CAC']
]

async function main() {
  loadEnv()
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '')
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) { console.error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local'); process.exit(1) }

  const rows = ROSTER.map(([username, pw, role, nen, nar, ten, tar, email, color]) => ({
    username, role, name_en: nen, name_ar: nar, title_en: ten, title_ar: tar, email, color, password_hash: hash(pw)
  }))

  const r = await fetch(`${url}/rest/v1/app_users?on_conflict=username`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(rows)
  })
  if (!r.ok) { console.error('Seed failed:', r.status, await r.text()); process.exit(1) }
  console.log(`Seeded ${rows.length} app_users (passwords hashed with scrypt).`)
  console.log('Usernames:', rows.map(x => x.username).join(', '))
}
main().catch(e => { console.error(e); process.exit(1) })
