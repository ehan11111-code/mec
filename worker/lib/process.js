// The core unit of work: take one captured-but-unprocessed media row, fetch+decrypt it, cache it to
// Supabase Storage, and — if it's a المخزون/المديونية statement — OCR + extract the table straight into
// `extracted` (no commit/push, no redeploy). This is what stops important PDFs being silently ignored.
const { decryptRowMedia } = require('./wa')
const { uploadMedia, patchRow } = require('./supa')
const { extractStatement, asOfFrom, statementKind } = require('./ocr')

// Rows the worker should pick up: media that hasn't been cached yet.
// (media_status null/pending, or a known statement doc_type whose extract hasn't run.)
const PENDING_FILTER =
  `or=(media_status.is.null,media_status.eq.pending,media_status.eq.failed)` +
  `&or=(message_type.in.(document,image),doc_type.in.(invoice,delivery_note,payment,credit,inventory))` +
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

module.exports = { processRow, PENDING_FILTER }
