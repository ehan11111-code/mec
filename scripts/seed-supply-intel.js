#!/usr/bin/env node
/**
 * Run the supply-intelligence pipeline ONCE, now, and write to Supabase supply_intel — so the portal
 * page populates without waiting for the 12h n8n cron. Uses the free sources (Google+Bing News RSS + FX)
 * and gpt-4o-mini; Apify is left to the scheduled workflow. Reads .env.local. Node 18+.
 *   node scripts/seed-supply-intel.js
 */
const fs = require('fs'); const path = require('path')
function loadEnv() {
  const p = path.join(__dirname, '..', '.env.local'); if (!fs.existsSync(p)) return
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) { const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim()); if (m && !process.env[m[1]]) process.env[m[1]] = m[2] }
}
const targets = [
  { supplier: 'Brazil beef suppliers', commodity: 'beef', country: 'Brazil', cur: 'BRL', q: 'Brazil beef export OR cattle price OR meatpacking' },
  { supplier: 'India buffalo meat', commodity: 'beef', country: 'India', cur: 'INR', q: 'India buffalo meat export price OR ban' },
  { supplier: 'Brazil chicken', commodity: 'chicken', country: 'Brazil', cur: 'BRL', q: 'Brazil chicken poultry export avian flu price' },
  { supplier: 'Egypt potatoes', commodity: 'potato', country: 'Egypt', cur: 'EGP', q: 'Egypt potato export price OR weather OR crop' },
  { supplier: 'KSA import logistics', commodity: 'all', country: 'Saudi Arabia', cur: 'USD', q: 'Saudi Arabia port Jeddah Dammam shipping delay customs food import' }
]
function parseRss(xml, n) {
  const items = []; const re = /<item>([\s\S]*?)<\/item>/g; let m
  const pick = (s, t) => { const r = new RegExp('<' + t + '>([\\s\\S]*?)<\\/' + t + '>').exec(s); return r ? r[1].replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]+>/g, '').trim() : '' }
  while ((m = re.exec(xml)) && items.length < n) { const b = m[1]; items.push({ title: pick(b, 'title'), url: pick(b, 'link'), source: pick(b, 'source') || 'News', date: pick(b, 'pubDate') }) }
  return items
}
const SYS = 'You are MEC\'s supply-risk + price analyst for food imports into Saudi Arabia (beef, chicken, potato). You receive a supplier/country plus recent ARTICLES and an FX rate (exporter currency vs SAR). Output STRICT JSON. Every risk AND every price driver MUST cite a real source via {source,url,date}; drop anything you cannot cite. Base price direction on cited signals + FX; if no signal use direction "stable", change_pct 0, empty arrays. Never invent. Echo supplier/commodity/country. Schema: {"supplier":string,"commodity":string,"country":string,"recommendation":string,"forecast_window":string,"lead_time_days":number,"price_index":number,"price_outlook":{"direction":"up|down|stable","change_pct":number,"low_pct":number,"high_pct":number,"confidence":"low|medium|high","drivers":[{"summary":string,"citation":{"source":string,"url":string,"date":string}}]},"risks":[{"type":"transport|weather|price|disease|policy|other","severity":"low|medium|high","summary":string,"citation":{"source":string,"url":string,"date":string}}]}. lead_time_days = estimated sea-freight lead time from that country to a Saudi port (Brazil~28, India~18, Egypt~7, KSA-domestic~2; raise it if articles mention port delays). price_index = 0-100 supply-pressure index (50 neutral; higher = more upward price pressure). change_pct/low_pct/high_pct are % changes in import cost over the window.'

async function main() {
  loadEnv()
  const SUPA = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, ''); const SKEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  const OAI = process.env.OPENAI_API_KEY; const MODEL = process.env.OPENAI_BATCH_MODEL || 'gpt-4o-mini'
  if (!SUPA || !SKEY) { console.error('Supabase env missing'); process.exit(1) }
  if (!OAI) { console.error('OPENAI_API_KEY missing'); process.exit(1) }

  for (const t of targets) {
    let articles = []
    for (const url of [
      `https://news.google.com/rss/search?q=${encodeURIComponent(t.q)}+when:3d&hl=en-US&gl=US&ceid=US:en`,
      `https://www.bing.com/news/search?q=${encodeURIComponent(t.q)}&format=rss`
    ]) { try { const r = await fetch(url); articles = articles.concat(parseRss(await r.text(), 5)) } catch {} }
    let fx = null
    try { const r = await (await fetch(`https://open.er-api.com/v6/latest/${t.cur}`)).json(); if (r && r.rates && r.rates.SAR) fx = { pair: `${t.cur}/SAR`, rate: r.rates.SAR } } catch {}

    let outlook
    try {
      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST', headers: { Authorization: `Bearer ${OAI}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: MODEL, temperature: 0.2, response_format: { type: 'json_object' }, messages: [
          { role: 'system', content: SYS },
          { role: 'user', content: JSON.stringify({ supplier: t.supplier, commodity: t.commodity, country: t.country, fx, articles }) }
        ] })
      })
      const j = await resp.json(); outlook = JSON.parse(j.choices[0].message.content)
    } catch (e) { console.error(`${t.supplier}: GPT failed`, e.message); continue }

    outlook.risks = (outlook.risks || []).filter(r => r && r.citation && r.citation.url && r.citation.source)
    if (outlook.price_outlook) outlook.price_outlook.drivers = (outlook.price_outlook.drivers || []).filter(d => d && d.citation && d.citation.url && d.citation.source)
    const now = new Date().toISOString()
    const row = { supplier: outlook.supplier || t.supplier, commodity: outlook.commodity || t.commodity, country: outlook.country || t.country, recommendation: outlook.recommendation || '', forecast_window: outlook.forecast_window || '', price_outlook: outlook.price_outlook || null, risks: outlook.risks || [], lead_time_days: outlook.lead_time_days ?? null, price_index: outlook.price_index ?? null, generated_at: now }

    const up = await fetch(`${SUPA}/rest/v1/supply_intel?on_conflict=supplier`, {
      method: 'POST', headers: { apikey: SKEY, Authorization: `Bearer ${SKEY}`, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify(row)
    })
    // append a history snapshot for the time-series charts
    await fetch(`${SUPA}/rest/v1/supply_intel_history`, {
      method: 'POST', headers: { apikey: SKEY, Authorization: `Bearer ${SKEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ supplier: row.supplier, commodity: row.commodity, country: row.country, change_pct: row.price_outlook?.change_pct ?? 0, price_index: row.price_index, lead_time_days: row.lead_time_days, risk_count: row.risks.length, high_risk: row.risks.filter(r => r.severity === 'high').length, generated_at: now })
    }).catch(() => {})
    const po = row.price_outlook
    console.log(`${up.ok ? 'OK ' : 'ERR'} ${row.supplier} · ${row.risks.length} risks · ${po ? `${po.direction} ${po.change_pct > 0 ? '+' : ''}${po.change_pct}% (${po.drivers.length} drivers)` : 'no outlook'}${up.ok ? '' : ' · ' + up.status}`)
  }
  console.log('Done. Open /supply-intelligence to see it.')
}
main().catch(e => { console.error(e); process.exit(1) })
