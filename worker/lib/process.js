// The core unit of work: take one captured-but-unprocessed media row, fetch+decrypt it, cache it to
// Supabase Storage, and — if it's a المخزون/المديونية statement — OCR + extract the table straight into
// `extracted` (no commit/push, no redeploy). This is what stops important PDFs being silently ignored.
const { decryptRowMedia } = require('./wa')
const { uploadMedia, patchRow, downloadMedia } = require('./supa')
const { extractStatement, classifyDoc, asOfFrom, statementKind } = require('./ocr')

// Rows the worker should pick up: ACTUAL media (a document/image message) that hasn't been cached yet.
// NOTE: filter on message_type only — NOT doc_type — so text payment/bank-transfer notes (doc_type=payment
// but no attachment) aren't repeatedly tried and marked failed.
const PENDING_FILTER =
  `or=(media_status.is.null,media_status.eq.pending,media_status.eq.failed)` +
  `&message_type=in.(document,image)` +
  `&archived=eq.false&select=message_id,raw,doc_type,body,media_filename,received_at&order=received_at.desc&limit=25`

async function processRow(row, keys) {
  const id = row.message_id
  const media = await decryptRowMedia(row)
  if (!media) { await patchRow(id, { media_status: 'failed' }); return { id, ok: false, reason: 'media_unavailable' } }

  const uploaded = await uploadMedia(id, media.buf, media.mime)
  if (!uploaded) { await patchRow(id, { media_status: 'failed' }); return { id, ok: false, reason: 'upload_failed' } }
  const filename = media.filename || row.media_filename || ''
  await patchRow(id, { media_status: 'cached', storage_path: id, media_mime: media.mime, media_filename: filename })

  // Is this a statement we should OCR-extract? Prefer the classified doc_type; else sniff the filename/caption.
  let kind = (row.doc_type === 'credit' || row.doc_type === 'inventory') ? row.doc_type : statementKind(filename + ' ' + (row.body || ''))
  if (!kind) { await patchRow(id, { extract_status: 'na' }); return { id, ok: true, kind: null } }

  if (!keys.VKEY || !keys.OKEY) { await patchRow(id, { extract_status: 'pending' }); return { id, ok: true, kind, reason: 'no_ocr_keys' } }
  try {
    const asOf = asOfFrom(filename + ' ' + (row.body || ''), row.received_at)
    const { rows } = await extractStatement(keys.VKEY, keys.OKEY, kind, media.buf, media.mime, asOf)
    if (rows && rows.length) {
      await patchRow(id, { extracted: rows, extract_status: 'done', doc_type: kind })
      return { id, ok: true, kind, count: rows.length }
    }
    await patchRow(id, { extract_status: 'failed' })
    return { id, ok: false, kind, reason: 'ocr_empty' }
  } catch (e) {
    await patchRow(id, { extract_status: 'failed' })
    return { id, ok: false, kind, reason: 'ocr_error', error: String(e).slice(0, 160) }
  }
}

// FINALIZE: cached document/image files still classified "other" (or none) — recover the missed ones by
// reading them with GPT-4o vision (invoice / delivery note / payment / statement). This is the "recap the
// ones it missed and finalize" pass.
const FINALIZE_FILTER =
  `media_status=eq.cached&or=(doc_type.is.null,doc_type.eq.other)` +
  `&message_type=in.(document,image)&archived=eq.false` +
  `&select=message_id,doc_type,media_mime,media_filename,body,received_at&order=received_at.desc&limit=40`

async function finalizeRow(row, keys) {
  const id = row.message_id
  if (!keys.OKEY) return { id, ok: false, reason: 'no_key' }
  const buf = await downloadMedia(id)
  if (!buf) return { id, ok: false, reason: 'no_cached_file' }
  let c
  try { c = await classifyDoc(keys.OKEY, buf, row.media_mime || 'application/pdf', row.media_filename || '') }
  catch (e) { return { id, ok: false, reason: 'classify_error' } }
  const dt = c.doc_type && c.doc_type !== 'other' ? c.doc_type : null
  if (!dt) { await patchRow(id, { doc_type: 'other' }); return { id, ok: true, kind: 'other', summary: c.summary || '' } }
  const patch = { doc_type: dt }
  if (c.client) patch.client_name = c.client
  if (c.order_no) patch.order_no = String(c.order_no)
  if (c.recipient) patch.recipient = c.recipient
  if (dt === 'delivery_note' && c.received_stamp) patch.decision = 'received'
  // If it's actually a statement, OCR-extract it now (we already have the bytes).
  if ((dt === 'credit' || dt === 'inventory') && keys.VKEY) {
    try {
      const asOf = asOfFrom((row.media_filename || '') + ' ' + (row.body || ''), row.received_at)
      const { rows } = await extractStatement(keys.VKEY, keys.OKEY, dt, buf, row.media_mime || 'application/pdf', asOf)
      if (rows && rows.length) { patch.extracted = rows; patch.extract_status = 'done' }
    } catch (e) { /* keep doc_type, extraction can retry */ }
  }
  await patchRow(id, patch)
  return { id, ok: true, kind: dt, summary: c.summary || '', client: c.client || null }
}

module.exports = { processRow, finalizeRow, PENDING_FILTER, FINALIZE_FILTER }
