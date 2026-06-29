// Tiny Supabase REST + Storage helpers (service-role). No SDK — just fetch — so the worker stays light.
function env(k, d = '') { return process.env[k] || d }
const SUPA = () => env('NEXT_PUBLIC_SUPABASE_URL').replace(/\/+$/, '')
const KEY = () => env('SUPABASE_SERVICE_ROLE_KEY')
const BUCKET = 'wa-media'

function H() { const k = KEY(); return { apikey: k, Authorization: `Bearer ${k}` } }

async function rest(path, init = {}) {
  const r = await fetch(`${SUPA()}/rest/v1/${path}`, { ...init, headers: { ...H(), 'Content-Type': 'application/json', ...(init.headers || {}) }, cache: 'no-store' })
  return r
}

async function getRows(path) {
  try { const r = await rest(path); if (!r.ok) return []; const j = await r.json(); return Array.isArray(j) ? j : [] } catch { return [] }
}

async function patchRow(messageId, fields) {
  try {
    const r = await rest(`whatsapp_intake?message_id=eq.${encodeURIComponent(messageId)}`, {
      method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(fields)
    })
    return r.ok
  } catch { return false }
}

async function ensureBucket() {
  try { await fetch(`${SUPA()}/storage/v1/bucket`, { method: 'POST', headers: { ...H(), 'Content-Type': 'application/json' }, body: JSON.stringify({ id: BUCKET, name: BUCKET, public: false }) }) } catch {}
}

async function uploadMedia(messageId, buf, mime) {
  try {
    const r = await fetch(`${SUPA()}/storage/v1/object/${BUCKET}/${encodeURIComponent(messageId)}`, {
      method: 'POST', headers: { ...H(), 'Content-Type': mime || 'application/octet-stream', 'x-upsert': 'true' }, body: buf
    })
    return r.ok
  } catch { return false }
}

async function downloadMedia(messageId) {
  try {
    const r = await fetch(`${SUPA()}/storage/v1/object/${BUCKET}/${encodeURIComponent(messageId)}`, { headers: H() })
    if (!r.ok) return null
    return Buffer.from(await r.arrayBuffer())
  } catch { return null }
}

async function heartbeat(id, processed, failed, note) {
  try {
    await rest('worker_health', {
      method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ id, beat_at: new Date().toISOString(), processed, failed, note })
    })
  } catch {}
}

function configured() { return !!SUPA() && !!KEY() }

module.exports = { rest, getRows, patchRow, ensureBucket, uploadMedia, downloadMedia, heartbeat, configured, BUCKET, SUPA, KEY }
