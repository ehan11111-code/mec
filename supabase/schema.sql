-- MEC portal — Supabase schema for scheduled ERP sync + supply intelligence.
-- Run in Supabase → SQL editor. Tables are written by n8n (service_role) and read by the portal.

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
  risks           jsonb default '[]'::jsonb,   -- [{type,severity,summary,citation:{source,url,date}}]
  generated_at    timestamptz default now()
);

-- Row Level Security: the portal reads supply_intel with the anon key; writes use service_role (bypasses RLS).
alter table public.supply_intel enable row level security;
create policy "read supply_intel (anon)" on public.supply_intel for select using (true);

-- sales stays service-role only (no anon policy) — the portal reads it server-side.
alter table public.sales enable row level security;
