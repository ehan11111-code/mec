-- MEC portal — Supabase schema. Run in Supabase → SQL editor. Safe to run more than once (idempotent):
-- tables use "if not exists"; policies are dropped-then-created (Postgres has no CREATE POLICY IF NOT EXISTS).
-- Tables are written by n8n (service_role) and read by the portal.

-- ERP sales mirror (matches the normalised shape in n8n/erp-scheduled-sync.json).
create table if not exists public.sales (
  invoice_no   text primary key,
  date         date,
  client       text,
  salesperson  text,
  product      text,
  qty          numeric,
  amount       numeric,
  collected    boolean default false,
  source       text default 'erp',
  updated_at   timestamptz default now()
);

-- Supply-market intelligence (one latest row per supplier; written every 12h).
create table if not exists public.supply_intel (
  supplier        text primary key,
  commodity       text,
  country         text,
  recommendation  text,
  forecast_window text,
  price_outlook   jsonb,                        -- {direction,change_pct,low_pct,high_pct,confidence,drivers:[{summary,citation}]}
  risks           jsonb default '[]'::jsonb,    -- [{type,severity,summary,citation:{source,url,date}}]
  generated_at    timestamptz default now()
);
-- If the table already existed from an earlier run, add the new column:
alter table public.supply_intel add column if not exists price_outlook jsonb;

-- WhatsApp intake (one row per inbound message; written by n8n/whatsapp-intake.json via WaSender).
create table if not exists public.whatsapp_intake (
  message_id    text primary key,
  phone         text,
  push_name     text,
  body          text,
  message_type  text,
  media_url     text,
  intent        text,            -- order | inquiry | complaint | other (classified by GPT)
  products      jsonb default '[]'::jsonb,
  raw           jsonb,
  verified      boolean default false,
  received_at   timestamptz default now()
);

-- Row Level Security ---------------------------------------------------------
-- supply_intel: portal reads it with the anon key.
alter table public.supply_intel enable row level security;
drop policy if exists "read supply_intel (anon)" on public.supply_intel;
create policy "read supply_intel (anon)" on public.supply_intel for select using (true);

-- sales + whatsapp_intake: service-role only (no anon policy) — the portal reads them server-side.
alter table public.sales enable row level security;
alter table public.whatsapp_intake enable row level security;
