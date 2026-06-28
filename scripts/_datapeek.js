// One-off read-only probe: what has been fetched into Supabase, by source. NOT committed.
const fs = require('fs'), path = require('path')
const env = {}
for (const line of fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8').split(/\r?\n/)) { const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim()); if (m) env[m[1]] = m[2] }
const url = (env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, ''), key = env.SUPABASE_SERVICE_ROLE_KEY
const H = { apikey: key, Authorization: `Bearer ${key}` }
async function q(p) { try { const r = await fetch(`${url}/rest/v1/${p}`, { headers: H }); if (!r.ok) return { err: r.status }; return await r.json() } catch (e) { return { err: String(e) } } }
;(async () => {
  const wa = await q('whatsapp_intake?select=received_at,group_type,group_jid,intent,doc_type,archived,salesperson,push_name,phone,client_name,order_no,body&order=received_at.desc&limit=40')
  if (wa.err) { console.log('whatsapp_intake error', wa.err) } else {
    console.log('=== whatsapp_intake: ' + wa.length + ' recent rows ===')
    const byIntent = {}, byGroup = {}
    for (const r of wa) { byIntent[r.intent || 'null'] = (byIntent[r.intent || 'null'] || 0) + 1; byGroup[r.group_type || 'null'] = (byGroup[r.group_type || 'null'] || 0) + 1 }
    console.log('by intent:', byIntent)
    console.log('by group_type:', byGroup)
    console.log('--- latest 15 ---')
    for (const r of wa.slice(0, 15)) {
      const used = ['order', 'approval'].includes(r.intent) || r.doc_type ? 'IN-PORTAL' : 'not-used'
      console.log(`${(r.received_at || '').slice(0, 16)} | grp=${r.group_type || '-'} | intent=${r.intent || '-'} | doc=${r.doc_type || '-'} | ${r.archived ? 'ARCH ' : ''}${used} | ${(r.body || '').replace(/\s+/g, ' ').slice(0, 50)}`)
    }
  }
  for (const tbl of ['email_intake', 'supply_intel', 'contact_inquiries']) {
    const r = await q(`${tbl}?select=*&limit=5`)
    console.log(`=== ${tbl}: ` + (r.err ? `error ${r.err}` : `${r.length} rows (showing keys: ${r[0] ? Object.keys(r[0]).join(',') : 'empty'})`))
  }
})()
