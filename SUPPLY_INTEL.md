# Supply Intelligence + Scheduled Data Sync — design, references & cost

This document covers two new capabilities for the MEC portal:

1. **Scheduled ERP data sync** (an *internal* workflow) — pull MEC's own data from their ERP on a
   timer (every X hours) via n8n, normalise it, and store it so the portal reads live numbers instead
   of the static spreadsheets.
2. **Supply-Market Intelligence** (an *external* workflow) — every 12 hours, gather real-world signals
   about MEC's suppliers and sourcing countries, have GPT synthesise a **forecast + crisis/alert list**
   for each supplier, where **every claim is backed by a real, dated source** (a news item, an official
   advisory, a weather/port alert). Output lands in Supabase and renders in the portal.

> Internal vs external (your definition): **internal** = workflows the system *runs and uses* on MEC's
> own operations/data (ERP sync, approval, dispatch, finance…). **external** = workflows whose **output
> comes from the outside world** and is pulled *in* (supply-market intel, email/WhatsApp intake).

---

## 1. Scheduled ERP sync (internal)

**Workflow:** `n8n/erp-scheduled-sync.json`

```
Schedule Trigger (every X h)  →  HTTP Request (ERP API)  →  Code (normalise to portal shape)
   →  Supabase upsert (sales / purchases / clients / inventory)  →  (optional) notify portal
```

- The interval is set in the Schedule Trigger node (default every 6 h; change to 1/3/12/24 h).
- The ERP call is a single HTTP Request node with `ERP_BASE_URL` + `ERP_API_KEY`. **What I need from
  you:** how your ERP exposes data — REST API (preferred), direct DB connection, or a scheduled file
  export (CSV/XLSX) we read. That decides this one node; everything downstream is built.
- Normalised rows are upserted into Supabase tables that mirror today's `lib/data/*` shapes, so the
  portal's `dataset.ts` swaps from the static files to Supabase with **no UI change** (CLAUDE.md §2
  golden rule).

**Cost:** runs on your existing n8n instance + Supabase free tier → **$0 incremental.**

---

## 2. Supply-Market Intelligence (external, every 12 h)

**Workflow:** `n8n/supply-intelligence.json`

```
Schedule Trigger (every 12 h)
  → Set: supplier + sourcing-country list (meat=Brazil/India, chicken=Brazil/Ukraine, potato=Egypt…)
  → HTTP: gather real signals per item/country
        • Google News RSS  (commodity + country, last 48h)      — free
        • GDACS disaster alerts RSS (floods/storms/port impact)  — free
        • Gov travel/trade advisories RSS                        — free
        • (optional) Tavily search for deeper web context        — cheap
  → Code: dedupe + keep each item's {title, url, source, publishedAt}
  → OpenAI (gpt-4o-mini): synthesise per supplier →
        { supplier, commodity, country, recommendation (order now / hold / pre-buy),
          forecastWindow, risks[], each risk { type, severity, summary, citation{source,url,date} } }
  → Code: drop any claim without a citation (no source = dropped)   ← accuracy guard
  → Supabase upsert: supply_intel (latest snapshot per supplier)
  → (optional) notify: alert if any severity = high
```

### How accuracy + "referenced by a real event" is enforced
- The model is given **only the gathered articles** (titles, sources, dates, links) and is **instructed
  to cite the exact source+date for every risk/forecast** and to **say "no signal" rather than invent**.
- A post-step **deletes any risk or claim that has no citation**, so nothing unsourced reaches the UI.
- Each card in the portal shows the **source name + date + link** — click through to the real event.
- Temperature 0.2 + a strict JSON schema keep it specific and non-hallucinatory.

### Why it's cheap
- All the *gathering* uses **free RSS/advisory feeds** (no paid search needed). Tavily is optional and
  only if you want deeper coverage — its free tier (1,000 credits/mo) covers ~25 runs/mo.
- The *only* paid part is one **gpt-4o-mini** synthesis call per run. ~30k input + ~5k output tokens ≈
  **< $0.01 per run**.

---

## 3. Tools & cost breakdown (you asked — budget view)

| Tool | What it's for | Cost per run | ~Monthly (2 runs/day intel + ERP sync) |
|---|---|---|---|
| **n8n** (you have it) | runs all workflows on a timer | $0 | **$0** if self-hosted · ~$24 if n8n Cloud Starter |
| **OpenAI gpt-4o-mini** | supply-intel synthesis (batch) | < $0.01 | **~$0.50–1.50** (60 runs) |
| **OpenAI gpt-4o** | JARVIS Q&A (on demand) | ~$0.01–0.04 / question | **~$2–15** depending on usage |
| **Supabase** (you have it) | store ERP data + intel output | $0 | **$0** (free tier: 500MB DB) |
| **Google News / GDACS / advisory RSS** | real-world signals + citations | $0 | **$0** |
| **Tavily** (optional) | deeper web search for intel | ~$0.008/credit | **$0** on free tier (~25 runs), then ~$3–8 |

**Realistic total: roughly $3–20 / month** (the spread is almost entirely JARVIS usage + whether you
add Tavily). If you keep JARVIS on `gpt-4o-mini` too and skip Tavily, the whole thing runs for **under
$3/month** on top of your existing n8n + Supabase.

**No other paid tools are required.** I deliberately avoided NewsAPI business ($449/mo) and SerpAPI
($75/mo) — RSS feeds give the same "dated real event" citations for free.

---

## 4. What I still need from you to switch these from "ready" to "running"

1. **n8n instance URL** (`N8N_API_BASE_URL`) — e.g. `https://<you>.app.n8n.cloud`. The API key you gave
   needs the base URL to create/trigger workflows.
2. **ERP access** — REST API base URL + key, OR a DB connection, OR a sample export file. (Just for the
   internal sync's one source node.)
3. **Supplier + sourcing-country list** — which suppliers, and which country each commodity comes from.
   I seeded sensible defaults (meat→Brazil/India, chicken→Brazil/Ukraine, potato→Egypt/KSA) you can edit.
4. **Search tier choice** — RSS-only (free) vs add Tavily (broader, ~free→cheap). See the question I'll ask.

Once (1)+(2) arrive I import both workflows into your n8n via the API and trigger a first run.

## 5. Security note
The API keys you pasted in chat are stored only in `.env.local` (gitignored — never committed) and go
into Vercel/n8n env. Because they were shared in plaintext, **rotate the OpenAI, n8n, and Supabase
`service_role`/`secret` keys** once we're live (Supabase → Settings → API; OpenAI → API keys; n8n →
Settings → API). The `service_role` key especially bypasses all row security — keep it server-side only.
