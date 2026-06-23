---
name: report
description: Generate a JARVIS-branded operations status report (PDF-ready) of everything running for MEC — internal & external n8n workflows with live state and last execution, Supabase data stores, and the portal / Vercel deployment. Use when the user types "/report", "status report", "what's running", "give me the JARVIS report", or asks for a PDF of current operations.
---

# report — JARVIS operations status report

Produces one branded HTML report (dark JARVIS theme, orange accent) that prints to a clean PDF, plus a
short inline summary in chat. Read `CLAUDE.md` first for context.

## Steps
1. **Generate it:** run `node scripts/jarvis-report.js`. The script reads `.env.local` and pulls **live**
   data:
   - **n8n** (`N8N_API_BASE_URL` + `N8N_API_KEY`): every `MEC ·` workflow — active state + last
     execution status/time, split into **external** (intake, market intelligence) and **internal**
     (ERP sync, approvals, finance, planning, learning).
   - **Supabase** (`NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`): row counts for `sales`,
     `supply_intel`, `whatsapp_intake` (flags any table not yet created).
   - **Vercel** (optional `VERCEL_TOKEN` + `VERCEL_PROJECT_ID`): latest deployment state + URL. Without a
     token it notes the repo auto-deploys on push.
   - **JARVIS**: live/data-engine state + model.
2. The report is written to `reports/jarvis-report-<stamp>.html` (gitignored). Tell the user the path.
3. **Deliver the PDF:** open the HTML and click **Save as PDF** (or Ctrl/Cmd+P → Save as PDF). If a
   headless Chrome is available you may render it directly:
   `npx -y puppeteer-core` is not assumed — default to the print-to-PDF instruction.
4. **Summarise in chat:** echo the script's console summary — how many workflows are active, last-run
   status of each, store row counts, and any blocker (e.g. "supply_intel table not created — run
   supabase/schema.sql"). Keep it scannable.

## Guardrails
- Read-only: this skill never changes workflows or data. Secrets stay in `.env.local`; the report
  contains status only (no keys). Do not commit anything under `reports/`.
- If `N8N_API_BASE_URL` is missing, still produce the report from whatever is configured and say what was
  skipped — never block on one missing source.
