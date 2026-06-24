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
  lead_time_days  numeric,                       -- estimated transport/shipping lead time to KSA
  price_index     numeric,                       -- 0-100 supply-pressure index (higher = more upward price pressure)
  generated_at    timestamptz default now()
);
-- If the table already existed from an earlier run, add the new columns:
alter table public.supply_intel add column if not exists price_outlook jsonb;
alter table public.supply_intel add column if not exists lead_time_days numeric;
alter table public.supply_intel add column if not exists price_index numeric;

-- Append-only history so the portal can chart price pressure / lead time / crises over time.
create table if not exists public.supply_intel_history (
  id             bigint generated always as identity primary key,
  supplier       text,
  commodity      text,
  country        text,
  change_pct     numeric,
  price_index    numeric,
  lead_time_days numeric,
  risk_count     int,
  high_risk      int,
  generated_at   timestamptz default now()
);
alter table public.supply_intel_history enable row level security;
drop policy if exists "read supply_intel_history (anon)" on public.supply_intel_history;
create policy "read supply_intel_history (anon)" on public.supply_intel_history for select using (true);

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
  order_status  text,            -- pending | approved | rejected (for messages classified as orders)
  received_at   timestamptz default now()
);
alter table public.whatsapp_intake add column if not exists order_status text;

-- Internal staff messaging (JARVIS inbox) — employees message each other; read/written server-side
-- via the portal's /api/messages route (service-role).
create table if not exists public.internal_messages (
  id          bigint generated always as identity primary key,
  from_user   text not null,          -- sender username
  to_user     text not null,          -- recipient username
  body        text not null,
  read        boolean default false,
  created_at  timestamptz default now()
);
create index if not exists internal_messages_pair_idx on public.internal_messages (from_user, to_user, created_at);
alter table public.internal_messages enable row level security;  -- service-role only (no anon policy)

-- Contact / inquiry log — every portal contact-form submission (also fans out to WhatsApp + email).
create table if not exists public.contact_inquiries (
  id          bigint generated always as identity primary key,
  name        text,
  email       text,
  phone       text,
  message     text,
  source      text default 'portal',
  created_at  timestamptz default now()
);
alter table public.contact_inquiries enable row level security;  -- service-role only

-- Row Level Security ---------------------------------------------------------
-- supply_intel: portal reads it with the anon key.
alter table public.supply_intel enable row level security;
drop policy if exists "read supply_intel (anon)" on public.supply_intel;
create policy "read supply_intel (anon)" on public.supply_intel for select using (true);

-- sales + whatsapp_intake: service-role only (no anon policy) — the portal reads them server-side.
alter table public.sales enable row level security;
alter table public.whatsapp_intake enable row level security;
