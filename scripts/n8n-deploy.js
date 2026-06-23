#!/usr/bin/env node
/**
 * Deploy a workflow in n8n/<id>.json to the n8n instance via its public API, then activate it.
 * Usage:  node scripts/n8n-deploy.js supply-intelligence
 *
 * - Reads N8N_API_BASE_URL + N8N_API_KEY (+ all secrets) from .env.local (never committed).
 * - n8n Cloud blocks $env in nodes, so we INJECT the real secret values from .env.local into the
 *   workflow JSON at push time. The git copy keeps {{ $env.VAR }} placeholders (no secrets in git).
 * - Idempotent: if a workflow with the same name exists, it is UPDATED (PUT) instead of duplicated.
 * Node 18+ (global fetch).
 */
const fs = require('fs')
const path = require('path')

function loadEnv() {
  const p = path.join(__dirname, '..', '.env.local')
  if (!fs.existsSync(p)) return
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim())
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
  }
}

// Deep-replace $env.VAR inside every string value with a JS string literal of the value.
// Valid both inside n8n {{ }} expressions and inside Code-node JS. Runs on the PARSED object so the
// injected quotes never collide with JSON delimiters.
function injectSecrets(node) {
  if (typeof node === 'string') {
    return node.replace(/\$env\.([A-Za-z0-9_]+)/g, (full, name) => {
      const v = process.env[name]
      return v === undefined ? full : JSON.stringify(v)
    })
  }
  if (Array.isArray(node)) return node.map(injectSecrets)
  if (node && typeof node === 'object') {
    const out = {}
    for (const k of Object.keys(node)) out[k] = injectSecrets(node[k])
    return out
  }
  return node
}

async function main() {
  loadEnv()
  const id = process.argv[2]
  if (!id) { console.error('Usage: node scripts/n8n-deploy.js <workflow-id>'); process.exit(1) }
  const base = (process.env.N8N_API_BASE_URL || '').replace(/\/+$/, '')
  const key = process.env.N8N_API_KEY
  if (!base) { console.error('N8N_API_BASE_URL is not set in .env.local.'); process.exit(1) }
  if (!key) { console.error('N8N_API_KEY is not set in .env.local.'); process.exit(1) }
  const headers = { 'X-N8N-API-KEY': key, 'Content-Type': 'application/json', accept: 'application/json' }

  const raw = fs.readFileSync(path.join(__dirname, '..', 'n8n', `${id}.json`), 'utf8')
  const wf = injectSecrets(JSON.parse(raw))
  const body = { name: wf.name, nodes: wf.nodes, connections: wf.connections, settings: wf.settings || { executionOrder: 'v1' } }

  // Find an existing workflow with the same name (idempotent re-deploy).
  const list = await (await fetch(`${base}/api/v1/workflows?limit=250`, { headers })).json()
  const existing = (list.data || []).find(w => w.name === wf.name)

  let wfId
  if (existing) {
    const r = await fetch(`${base}/api/v1/workflows/${existing.id}`, { method: 'PUT', headers, body: JSON.stringify(body) })
    const j = await r.json()
    if (!r.ok) { console.error('Update failed:', r.status, JSON.stringify(j)); process.exit(1) }
    wfId = existing.id; console.log('Updated workflow:', wfId, '·', wf.name)
  } else {
    const r = await fetch(`${base}/api/v1/workflows`, { method: 'POST', headers, body: JSON.stringify(body) })
    const j = await r.json()
    if (!r.ok) { console.error('Create failed:', r.status, JSON.stringify(j)); process.exit(1) }
    wfId = j.id; console.log('Created workflow:', wfId, '·', wf.name)
  }

  const act = await fetch(`${base}/api/v1/workflows/${wfId}/activate`, { method: 'POST', headers })
  console.log(act.ok ? 'Activated.' : `Activate returned ${act.status} (open it in n8n and toggle Active).`)

  // Surface the production webhook URL for any Webhook trigger node.
  const hook = (wf.nodes || []).find(n => n.type === 'n8n-nodes-base.webhook')
  if (hook && hook.parameters && hook.parameters.path) {
    console.log('Webhook URL:', `${base}/webhook/${hook.parameters.path}`)
  }
  console.log('Open:', `${base}/workflow/${wfId}`)
}

main().catch(e => { console.error(e); process.exit(1) })
