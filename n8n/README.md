# n8n workflows

Importable workflow definitions for MEC. See `../SUPPLY_INTEL.md` for the full design + cost.

| File | Kind | Schedule | What it does |
|---|---|---|---|
| `erp-scheduled-sync.json` | internal | every 6h | Pull MEC's data from the ERP → normalise → upsert into Supabase `sales`. |
| `supply-intelligence.json` | external | every 12h | Gather real news/advisory signals per supplier+country → GPT-mini synthesis (cited) → Supabase `supply_intel`. |

## Deploy
1. Create the tables: run `../supabase/schema.sql` in Supabase → SQL editor.
2. Set `N8N_API_BASE_URL` (+ the keys) in `.env.local`.
3. Push to n8n and activate:
   ```
   node ../scripts/n8n-deploy.js erp-scheduled-sync
   node ../scripts/n8n-deploy.js supply-intelligence
   ```
   (or import the JSON manually in n8n → Workflows → Import from File).

## Env the nodes expect (set in n8n → Settings → Variables, or the host env)
`ERP_BASE_URL`, `ERP_API_KEY`, `OPENAI_API_KEY`, `OPENAI_BATCH_MODEL`,
`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

> Before going live: confirm the ERP node's URL/fields against a real ERP response, and edit the
> supplier/country list in the **Suppliers + countries** node of `supply-intelligence.json`.
