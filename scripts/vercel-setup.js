#!/usr/bin/env node
/**
 * Add the portal's env vars to the Vercel project (Production+Preview+Development) via the Vercel API.
 *   node scripts/vercel-setup.js <VERCEL_TOKEN>
 * Reads the secret values from .env.local. Does NOT print secret values. Node 18+.
 */
const fs = require('fs'); const path = require('path')
function loadEnv() {
  const p = path.join(__dirname, '..', '.env.local'); const env = {}
  if (fs.existsSync(p)) for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) { const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim()); if (m) env[m[1]] = m[2] }
  return env
}
async function main() {
  const env = loadEnv()
  const token = process.argv[2] || env.VERCEL_TOKEN
  if (!token) { console.error('Usage: node scripts/vercel-setup.js <VERCEL_TOKEN>'); process.exit(1) }
  const H = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  // Find the project (prefer one linked to the mec repo, else named mec).
  const pr = await (await fetch('https://api.vercel.com/v9/projects?limit=100', { headers: H })).json()
  if (pr.error) { console.error('Token/projects error:', pr.error.message); process.exit(1) }
  const projects = pr.projects || []
  let proj = projects.find(p => (p.link && /(^|\/)mec$/i.test(p.link.repo || '')) ) || projects.find(p => /mec/i.test(p.name))
  if (!proj) { console.error('Could not find a "mec" project. Projects:', projects.map(p => p.name).join(', ')); process.exit(1) }
  console.log('Project:', proj.name, '· id', proj.id)

  const wanted = [
    'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY',
    'OPENAI_API_KEY', 'OPENAI_MODEL', 'OPENAI_BATCH_MODEL', 'AUTH_SECRET',
    'WASENDER_API_TOKEN', 'WASENDER_WEBHOOK_SECRET',
    'N8N_API_KEY', 'N8N_API_BASE_URL',
    'VERCEL_TOKEN', 'VERCEL_PROJECT_ID', 'PORTAL_BASE_URL',
    'MS_OUTLOOK_TENANT_ID', 'MS_OUTLOOK_CLIENT_ID', 'MS_OUTLOOK_CLIENT_SECRET', 'MS_OUTLOOK_SENDER', 'GOOGLE_VISION_API_KEY'
  ]
  for (const key of wanted) {
    const value = env[key]
    if (!value) { console.log(`skip ${key} (not in .env.local)`); continue }
    const r = await fetch(`https://api.vercel.com/v10/projects/${proj.id}/env?upsert=true`, {
      method: 'POST', headers: H,
      body: JSON.stringify({ key, value, type: 'encrypted', target: ['production', 'preview', 'development'] })
    })
    const j = await r.json()
    console.log(`${r.ok ? 'set ' : 'ERR '} ${key}${r.ok ? '' : ' :: ' + JSON.stringify(j.error || j)}`)
  }
  console.log('PROJECT_ID=' + proj.id)
}
main().catch(e => { console.error(e); process.exit(1) })
