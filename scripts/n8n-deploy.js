#!/usr/bin/env node
/**
 * Deploy a workflow in n8n/<id>.json to the n8n instance via its public API, then activate it.
 * Usage:  node scripts/n8n-deploy.js supply-intelligence
 * Reads N8N_API_BASE_URL + N8N_API_KEY from .env.local (never committed). Node 18+ (global fetch).
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

async function main() {
  loadEnv()
  const id = process.argv[2]
  if (!id) { console.error('Usage: node scripts/n8n-deploy.js <workflow-id>'); process.exit(1) }
  const base = (process.env.N8N_API_BASE_URL || '').replace(/\/+$/, '')
  const key = process.env.N8N_API_KEY
  if (!base) { console.error('N8N_API_BASE_URL is not set in .env.local — add your n8n instance URL.'); process.exit(1) }
  if (!key) { console.error('N8N_API_KEY is not set in .env.local.'); process.exit(1) }

  const file = path.join(__dirname, '..', 'n8n', `${id}.json`)
  const wf = JSON.parse(fs.readFileSync(file, 'utf8'))
  const body = { name: wf.name, nodes: wf.nodes, connections: wf.connections, settings: wf.settings || { executionOrder: 'v1' } }
  const headers = { 'X-N8N-API-KEY': key, 'Content-Type': 'application/json', accept: 'application/json' }

  const create = await fetch(`${base}/api/v1/workflows`, { method: 'POST', headers, body: JSON.stringify(body) })
  const created = await create.json()
  if (!create.ok) { console.error('Create failed:', create.status, JSON.stringify(created)); process.exit(1) }
  console.log('Created workflow:', created.id, '·', created.name)

  const activate = await fetch(`${base}/api/v1/workflows/${created.id}/activate`, { method: 'POST', headers })
  console.log(activate.ok ? 'Activated (schedule live).' : `Activate returned ${activate.status} — open it in n8n and toggle Active.`)
}

main().catch(e => { console.error(e); process.exit(1) })
