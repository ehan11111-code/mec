// One-shot patch: rewrite the WhatsApp-intake classify node to NEVER decrypt media inline (that fetch from
// n8n Cloud is throttled and was silently dropping PDFs). Instead capture the media + a provisional doc_type
// and mark media_status='pending' so the always-on extract worker fetches+decrypts+OCRs it out of band.
const fs = require('fs'); const path = require('path')
const file = path.join(__dirname, '..', 'n8n', 'whatsapp-intake.json')
const wf = JSON.parse(fs.readFileSync(file, 'utf8'))

const classify = wf.nodes.find(n => n.name === 'Classify (read content)')
const build = wf.nodes.find(n => n.name === 'Build row')
if (!classify || !build) { console.error('nodes not found'); process.exit(1) }

// --- 1. Replace the inline-decrypt isFile branch with never-drop capture -----------------------------
const newFileBranch = `} else if (isFile) {
  // NEVER decrypt inline — fetching WhatsApp's CDN from n8n Cloud (a datacenter IP) is throttled and was
  // silently dropping PDFs. Capture the media (key/mime/name) + a PROVISIONAL doc_type from the
  // filename/caption, mark media_status='pending', and let the always-on extract worker fetch+decrypt+OCR
  // it out of band. Nothing is ignored.
  const raw = src.raw || {};
  const root = (raw.data && raw.data.messages && raw.data.messages.message) || (raw.messages && raw.messages.message) || raw.message || raw;
  let media = null, kind = null;
  const find = (n) => { if (!n || typeof n !== 'object' || media) return; if (n.documentMessage) { media = n.documentMessage; kind = 'document'; return; } if (n.imageMessage) { media = n.imageMessage; kind = 'image'; return; } for (const k of Object.keys(n)) find(n[k]); };
  find(root);
  const fname = (media && (media.fileName || media.title)) || '';
  const cap = (fname + ' ' + String(src.body || '')).toLowerCase();
  let dt = 'other';
  if (/مخزون|inventory|stock|جرد/.test(cap)) dt = 'inventory';
  else if (/مديوني|receivable|ذمم|كشف حساب/.test(cap)) dt = 'credit';
  else if (/فاتورة|فاتوره|invoice/.test(cap)) dt = 'invoice';
  else if (/تسليم|سند تسليم|delivery|استلام/.test(cap)) dt = 'delivery_note';
  else if (/حوال|تحويل|ايداع|إيداع|سند قبض|payment|receipt|اشعار/.test(cap)) dt = 'payment';
  else if (/امر شراء|أمر شراء|purchase order/.test(cap)) dt = 'po';
  cls = {
    intent: 'other',
    doc_type: dt,
    media_status: (media && media.mediaKey) ? 'pending' : 'failed',
    media_key: (media && media.mediaKey) ? media.mediaKey : null,
    media_mime: (media && media.mimetype) || (kind === 'image' ? 'image/jpeg' : 'application/pdf'),
    media_filename: fname,
    summary: fname ? ('Document: ' + fname) : 'Document received (pending extraction)'
  };
} else {`

const startMarker = '} else if (isFile) {'
const endMarker = '\n} else {'
const code = classify.parameters.jsCode
const sIdx = code.indexOf(startMarker)
const eIdx = code.indexOf(endMarker, sIdx)
if (sIdx < 0 || eIdx < 0) { console.error('isFile branch markers not found'); process.exit(1) }
classify.parameters.jsCode = code.slice(0, sIdx) + newFileBranch + code.slice(eIdx + endMarker.length)

// --- 2. Pass the media fields through Build row ------------------------------------------------------
const bcode = build.parameters.jsCode
if (!bcode.includes('media_status: cls.media_status')) {
  build.parameters.jsCode = bcode.replace(
    'media_url: src.media_url,',
    `media_url: src.media_url,
  media_status: cls.media_status || null,
  media_key: cls.media_key || null,
  media_mime: cls.media_mime || null,
  media_filename: cls.media_filename || null,`
  )
}

fs.writeFileSync(file, JSON.stringify(wf, null, 2) + '\n')
console.log('Patched. classify isFile branch + Build row media passthrough updated.')
console.log('isFile branch now never-drops:', classify.parameters.jsCode.includes("media_status: (media && media.mediaKey) ? 'pending'"))
console.log('Build row passes media:', build.parameters.jsCode.includes('media_status: cls.media_status'))
