---
name: erp-sync
description: Generate and deploy scheduled data-fetch workflows for the MEC portal. Use when the user wants the system to pull data on a timer (every X hours) from the ERP or another source via n8n, classify it as an internal or external workflow, register it in the portal, and (when n8n credentials are present) create + run it through the n8n public API. Triggers: "/erp-sync", "fetch data every X", "scheduled sync", "pull from the ERP", "add an internal/external workflow".
---

# erp-sync — scheduled data-fetch workflow generator

Builds a **timed fetch workflow** (Schedule Trigger → fetch → normalise → Supabase) and wires it into
the portal. Read `CLAUDE.md` first. Honour the architecture rule: data flows through Supabase into the
`getFirmState/getDepartment/getSolution` boundary — the UI never knows the source changed.

## Arguments
- `/erp-sync <name> every <N> <hours|minutes> from <source>` — create a new scheduled workflow.
- `/erp-sync deploy <id>` — push an existing `n8n/*.json` workflow to n8n via the API and activate it.

## Internal vs external (classification rule)
- **internal** — operates on MEC's own data/operations and the system *uses* the output
  (ERP sync, approval, dispatch, finance, supplier planning, learning).
- **external** — output is pulled *from the outside world* (supply-market intelligence, email/WhatsApp
  intake, public feeds). Set `kind: 'external'` for these.

## Steps
1. **Self-debug gate** — `npm run build` must be green before changes (CLAUDE.md §4). Fix red first.
2. **Author the n8n workflow JSON** in `n8n/<id>.json`:
   - **Schedule Trigger** with the requested interval (`{ field: 'hours', hoursInterval: N }` or minutes).
   - **Fetch node(s)** — HTTP Request to the source (`$env.ERP_BASE_URL` + `$env.ERP_API_KEY` for ERP;
     RSS/Tavily for external). One node per source; keep auth in env, never inline.
   - **Code node** — normalise rows to the portal/Supabase table shape (mirror `lib/data/*` types).
   - **Supabase node** (or HTTP to the REST endpoint with the service-role key) — upsert into the table.
   - Optional **notify** node for alerts. Keep it idempotent (upsert on a stable key).
3. **Register it** in `lib/automations/registry.ts`: add an `Automation` entry with the right `kind`,
   bilingual `name`/`trigger`/`steps`, and a `webhookEnv`. Add the env var to `webhookUrls` and to
   `.env.example` (empty) — real values only in `.env.local`/Vercel.
4. **Deploy (only if `N8N_API_BASE_URL` + `N8N_API_KEY` are set in `.env.local`):**
   `node scripts/n8n-deploy.js <id>` — POSTs `n8n/<id>.json` to `{base}/api/v1/workflows` with header
   `X-N8N-API-KEY`, then PATCHes `active: true`. If the base URL is missing, STOP and ask the user for it
   (do not guess). Never commit the key.
5. **Verify** — `npm run build` green; if deployed, confirm the workflow id came back and a manual run
   returns 200.
6. **Ledger + ship** — prepend a `CLAUDE.md ## Progress` entry, then commit + push (green build only).
   `.env.local` is gitignored — confirm no secret is staged before pushing.

## Guardrails
- Secrets live in `.env.local` / Vercel / n8n env only — never in a committed file or the browser bundle
  (only `NEXT_PUBLIC_*` reaches the client; the `service_role`/n8n keys are server-side).
- Keep workflows idempotent and small. Add EN **and** AR strings for any new portal labels.
- For external intel: every claim must carry a real source + date; drop unsourced claims (see
  `SUPPLY_INTEL.md`). Never auto-approve orders from a forecast — recommend, a human decides.
