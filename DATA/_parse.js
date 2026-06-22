const fs = require('fs')
const path = require('path')
const xml = fs.readFileSync(process.argv[2], 'utf8')

function colToNum(col) { let n = 0; for (const ch of col) n = n * 26 + (ch.charCodeAt(0) - 64); return n }
const rows = []
const rowRe = /<row[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g
let rm
while ((rm = rowRe.exec(xml))) {
  const cells = {}
  const cellRe = /<c[^>]*r="([A-Z]+)\d+"[^>]*>([\s\S]*?)<\/c>/g
  let cm
  while ((cm = cellRe.exec(rm[2]))) {
    const col = cm[1]
    const inner = cm[2]
    let val = ''
    const isM = inner.match(/<t[^>]*>([\s\S]*?)<\/t>/)
    const vM = inner.match(/<v>([\s\S]*?)<\/v>/)
    if (isM) val = isM[1]
    else if (vM) val = vM[1]
    val = val.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    cells[colToNum(col)] = val.trim()
  }
  rows.push({ r: parseInt(rm[1]), cells })
}

const headerRow = rows.find(r => r.r === 2)
const headers = headerRow ? headerRow.cells : {}
const out = []
for (const row of rows) {
  if (row.r <= 2) continue
  if (Object.keys(row.cells).length === 0) continue
  out.push(row.cells)
}
fs.writeFileSync(path.join(__dirname, '_clients.json'), JSON.stringify({ headers, count: out.length, rows: out }, null, 2), 'utf8')
console.log('headers:', JSON.stringify(headers))
console.log('client rows:', out.length)
console.log('sample row 3:', JSON.stringify(out[0]))
console.log('sample row 4:', JSON.stringify(out[1]))
