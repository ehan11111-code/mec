'use client'
// Client-side CSV / Excel export + print. No backend — works on Vercel as-is. UTF-8 BOM keeps Arabic
// intact when the file opens in Excel.
export type Row = Record<string, string | number | boolean | null | undefined>

function download(filename: string, content: string, mime: string) {
  const blob = new Blob(['﻿' + content], { type: mime + ';charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function cell(v: unknown) { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }

export function exportCsv(rows: Row[], filename: string) {
  if (!rows.length) return
  const cols = Object.keys(rows[0])
  const lines = [cols.join(','), ...rows.map(r => cols.map(c => cell(r[c])).join(','))]
  download(filename.endsWith('.csv') ? filename : filename + '.csv', lines.join('\n'), 'text/csv')
}

export function exportExcel(rows: Row[], filename: string, sheetName = 'MEC') {
  if (!rows.length) return
  const cols = Object.keys(rows[0])
  const esc = (v: unknown) => String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const head = `<tr>${cols.map(c => `<th style="background:#F36C34;color:#fff;text-align:start">${esc(c)}</th>`).join('')}</tr>`
  const body = rows.map(r => `<tr>${cols.map(c => `<td>${esc(r[c])}</td>`).join('')}</tr>`).join('')
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>${esc(sheetName)}</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body><table border="1">${head}${body}</table></body></html>`
  download(filename.endsWith('.xls') ? filename : filename + '.xls', html, 'application/vnd.ms-excel')
}

export function printReport() { if (typeof window !== 'undefined') window.print() }
