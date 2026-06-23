#!/usr/bin/env node
/**
 * /report engine — builds a JARVIS-branded status report (HTML, print-to-PDF) of everything running:
 * internal + external n8n workflows (live state + last execution), Supabase data stores, and the
 * portal / Vercel deployment. Reads secrets from .env.local. Node 18+ (global fetch).
 *
 *   node scripts/jarvis-report.js     →  writes reports/jarvis-report-<stamp>.html  + prints a summary
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
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const fmtTime = t => { try { return new Date(t).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) } catch { return '—' } }

async function n8nWorkflows(base, key) {
  const headers = { 'X-N8N-API-KEY': key, accept: 'application/json' }
  const list = await (await fetch(`${base}/api/v1/workflows?limit=250`, { headers })).json()
  const mec = (list.data || []).filter(w => /^MEC ·/.test(w.name))
  for (const w of mec) {
    try {
      const ex = await (await fetch(`${base}/api/v1/executions?workflowId=${w.id}&limit=1&includeData=false`, { headers })).json()
      const last = (ex.data || [])[0]
      w._last = last ? { status: last.status || (last.finished ? 'success' : 'running'), at: last.stoppedAt || last.startedAt } : null
    } catch { w._last = null }
  }
  return mec
}

async function supaCount(url, key, table) {
  try {
    const r = await fetch(`${url}/rest/v1/${table}?select=*`, { method: 'GET', headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: 'count=exact', Range: '0-0' } })
    if (r.status === 404 || r.status === 400) return { ok: false, note: 'table not created — run supabase/schema.sql' }
    const cr = r.headers.get('content-range') || ''
    return { ok: true, count: cr.includes('/') ? cr.split('/')[1] : '0' }
  } catch (e) { return { ok: false, note: 'unreachable' } }
}

async function vercel(token, project) {
  if (!token || !project) return null
  try {
    const r = await fetch(`https://api.vercel.com/v6/deployments?projectId=${project}&limit=1`, { headers: { Authorization: `Bearer ${token}` } })
    const j = await r.json()
    const d = (j.deployments || [])[0]
    return d ? { state: d.state || d.readyState, url: d.url, at: d.created } : null
  } catch { return null }
}

function badge(status) {
  const s = String(status || '').toLowerCase()
  const cls = s === 'success' ? 'ok' : s === 'error' ? 'err' : s === 'running' ? 'run' : 'idle'
  return `<span class="b ${cls}">${esc(status || 'no runs yet')}</span>`
}

function wfRows(list) {
  if (!list.length) return `<tr><td colspan="4" class="muted">No MEC workflows deployed yet.</td></tr>`
  return list.map(w => `<tr>
    <td><strong>${esc(w.name.replace(/^MEC · /, ''))}</strong><div class="muted mono">${esc(w.id)}</div></td>
    <td>${w.active ? '<span class="b ok">Active</span>' : '<span class="b idle">Inactive</span>'}</td>
    <td>${w._last ? badge(w._last.status) : badge(null)}</td>
    <td class="muted">${w._last ? fmtTime(w._last.at) : '—'}</td></tr>`).join('')
}

async function main() {
  loadEnv()
  const base = (process.env.N8N_API_BASE_URL || '').replace(/\/+$/, '')
  const stamp = new Date()
  let workflows = []
  if (base && process.env.N8N_API_KEY) { try { workflows = await n8nWorkflows(base, process.env.N8N_API_KEY) } catch (e) { console.error('n8n:', e.message) } }
  const internal = workflows.filter(w => /Sync|Approval|Dispatch|Planning|Finance|Export|Learning/i.test(w.name))
  const external = workflows.filter(w => !internal.includes(w))

  const surl = process.env.NEXT_PUBLIC_SUPABASE_URL, skey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const stores = {}
  if (surl && skey) for (const t of ['sales', 'supply_intel', 'whatsapp_intake']) stores[t] = await supaCount(surl, skey, t)

  const vc = await vercel(process.env.VERCEL_TOKEN, process.env.VERCEL_PROJECT_ID)

  const storeRows = Object.keys(stores).length
    ? Object.entries(stores).map(([t, v]) => `<tr><td class="mono">${t}</td><td>${v.ok ? `<span class="b ok">${v.count} rows</span>` : `<span class="b err">${esc(v.note)}</span>`}</td></tr>`).join('')
    : `<tr><td colspan="2" class="muted">Supabase not configured.</td></tr>`

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>JARVIS · MEC Operations Status</title>
<style>
:root{--bg:#0b0b0d;--card:#141417;--bd:#26262b;--tx:#ECECEE;--mut:#8A8A93;--acc:#F36C34;--ok:#3DD68C;--err:#F2545B;--run:#5B8DEF}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--tx);font:14px/1.55 ui-sans-serif,system-ui,Segoe UI,Roboto,Arial}
.wrap{max-width:900px;margin:0 auto;padding:40px 32px}
.hero{background:linear-gradient(135deg,rgba(243,108,52,.18),rgba(243,108,52,.02));border:1px solid var(--bd);border-radius:16px;padding:28px 30px;margin-bottom:24px}
.ey{color:var(--acc);font-weight:600;letter-spacing:.14em;text-transform:uppercase;font-size:11px}
h1{margin:8px 0 4px;font-size:26px;letter-spacing:-.02em}h2{font-size:15px;margin:26px 0 10px;display:flex;align-items:center;gap:8px}
.dot{width:8px;height:8px;border-radius:50%;background:var(--acc)}
.card{background:var(--card);border:1px solid var(--bd);border-radius:14px;overflow:hidden}
table{width:100%;border-collapse:collapse}td,th{text-align:left;padding:11px 16px;border-bottom:1px solid var(--bd);vertical-align:top}
th{color:var(--mut);font-weight:500;font-size:11px;text-transform:uppercase;letter-spacing:.06em}tr:last-child td{border-bottom:0}
.muted{color:var(--mut)}.mono{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11px}
.b{display:inline-block;padding:2px 9px;border-radius:20px;font-size:11px;font-weight:600}
.b.ok{background:rgba(61,214,140,.14);color:var(--ok)}.b.err{background:rgba(242,84,91,.14);color:var(--err)}
.b.run{background:rgba(91,141,239,.14);color:var(--run)}.b.idle{background:rgba(138,138,147,.14);color:var(--mut)}
.foot{color:var(--mut);font-size:12px;margin-top:26px;display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px}
.btn{position:fixed;top:18px;right:18px;background:var(--acc);color:#fff;border:0;border-radius:20px;padding:9px 16px;font-weight:600;cursor:pointer}
@media print{.btn{display:none}body{background:#fff;color:#111}.card,.hero{border-color:#ddd}.hero{background:#faf2ee}.muted{color:#666}}
</style></head><body>
<button class="btn" onclick="window.print()">Save as PDF</button>
<div class="wrap">
  <div class="hero">
    <div class="ey">JARVIS · Jarvis AI Agency</div>
    <h1>MEC Operations — Live Status Report</h1>
    <div class="muted">Generated ${esc(fmtTime(stamp))} · n8n: ${base ? esc(base.replace(/^https?:\/\//, '')) : 'not configured'}</div>
  </div>

  <h2><span class="dot"></span>External workflows <span class="muted" style="font-weight:400">· pull data from the outside world</span></h2>
  <div class="card"><table><thead><tr><th>Workflow</th><th>State</th><th>Last run</th><th>When</th></tr></thead><tbody>${wfRows(external)}</tbody></table></div>

  <h2><span class="dot"></span>Internal workflows <span class="muted" style="font-weight:400">· run on MEC's own data &amp; operations</span></h2>
  <div class="card"><table><thead><tr><th>Workflow</th><th>State</th><th>Last run</th><th>When</th></tr></thead><tbody>${wfRows(internal)}</tbody></table></div>

  <h2><span class="dot"></span>Data stores <span class="muted" style="font-weight:400">· Supabase</span></h2>
  <div class="card"><table><thead><tr><th>Table</th><th>Status</th></tr></thead><tbody>${storeRows}</tbody></table></div>

  <h2><span class="dot"></span>Portal &amp; deployment</h2>
  <div class="card"><table><tbody>
    <tr><td>Repository</td><td class="mono">github.com/ehan11111-code/mec</td></tr>
    <tr><td>Vercel</td><td>${vc ? `<span class="b ok">${esc(vc.state)}</span> <span class="mono">${esc(vc.url)}</span> · ${esc(fmtTime(vc.at))}` : '<span class="muted">Add VERCEL_TOKEN + VERCEL_PROJECT_ID to .env.local for live deploy insights. Auto-deploys on push to main.</span>'}</td></tr>
    <tr><td>JARVIS assistant</td><td>${process.env.OPENAI_API_KEY ? `<span class="b ok">live</span> · model ${esc(process.env.OPENAI_MODEL || 'gpt-4o')}` : '<span class="b idle">data-engine only</span>'}</td></tr>
  </tbody></table></div>

  <div class="foot"><span>JARVIS automated report · confidential — MEC &amp; Jarvis AI Agency</span><span class="mono">${esc(stamp.toISOString())}</span></div>
</div></body></html>`

  const dir = path.join(__dirname, '..', 'reports')
  fs.mkdirSync(dir, { recursive: true })
  const file = path.join(dir, `jarvis-report-${stamp.toISOString().slice(0, 16).replace(/[:T]/g, '-')}.html`)
  fs.writeFileSync(file, html)

  console.log('JARVIS report written:', file)
  console.log(`Workflows: ${workflows.length} MEC (${external.length} external, ${internal.length} internal) · active: ${workflows.filter(w => w.active).length}`)
  for (const w of workflows) console.log(` - ${w.name.replace(/^MEC · /, '')} [${w.active ? 'active' : 'off'}] last=${w._last ? w._last.status : 'none'}`)
  for (const [t, v] of Object.entries(stores)) console.log(` store ${t}: ${v.ok ? v.count + ' rows' : v.note}`)
  console.log('Open the HTML and click "Save as PDF" (or Ctrl+P → Save as PDF).')
}
main().catch(e => { console.error(e); process.exit(1) })
