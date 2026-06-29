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
  doc_type      text,            -- po | invoice | delivery_note | payment | other (for document/image messages)
  received_at   timestamptz default now()
);
alter table public.whatsapp_intake add column if not exists order_status text;
alter table public.whatsapp_intake add column if not exists doc_type text;
-- Two-group intake (orders group + documents group), sender→salesperson attribution, reply threading.
alter table public.whatsapp_intake add column if not exists group_jid text;          -- which WhatsApp group
alter table public.whatsapp_intake add column if not exists group_type text;         -- orders | docs | dm
alter table public.whatsapp_intake add column if not exists salesperson text;         -- sender name = who brought the order
alter table public.whatsapp_intake add column if not exists quoted_message_id text;   -- reply target (threads approve/reject/adjust)
alter table public.whatsapp_intake add column if not exists decision text;            -- approve | reject | adjust (on a reply)
alter table public.whatsapp_intake add column if not exists order_no text;            -- order / invoice / reference number
alter table public.whatsapp_intake add column if not exists client_name text;         -- client/company named on the order or document
alter table public.whatsapp_intake add column if not exists recipient text;           -- receiver / driver (المستلم) on a delivery note
alter table public.whatsapp_intake add column if not exists archived boolean not null default false; -- test/cleared rows: hidden from the portal, kept in the automation audit log
alter table public.whatsapp_intake add column if not exists extracted jsonb;     -- structured rows extracted from a credit/inventory statement (table → JSON), refreshes the portal
-- Universal intake reliability (the extract worker): media is captured RAW and never dropped; the worker
-- (or the local fallback) fetches+decrypts+OCRs it OUT OF BAND and writes the results back here. This is
-- what stops important PDFs/notes being silently ignored when the inline n8n decrypt fails.
alter table public.whatsapp_intake add column if not exists media_key text;        -- WhatsApp mediaKey (base64) so the worker can decrypt later
alter table public.whatsapp_intake add column if not exists media_mime text;       -- mimetype of the document/image
alter table public.whatsapp_intake add column if not exists media_filename text;    -- original file name / title (best signal of doc type)
alter table public.whatsapp_intake add column if not exists media_status text;      -- none | pending | cached | ocr | failed  (lifecycle of the media fetch)
alter table public.whatsapp_intake add column if not exists storage_path text;      -- path in the wa-media Supabase Storage bucket once cached
alter table public.whatsapp_intake add column if not exists extract_status text;    -- na | pending | done | failed  (OCR/extract lifecycle for statements)
alter table public.whatsapp_intake add column if not exists understanding jsonb;    -- JARVIS's recorded read of EVERY message (type, who, importance, action) — "keeps everything in mind"

-- Worker heartbeat — the always-on extract worker (and the local fallback) write a row here each cycle so
-- the JARVIS cockpit / status report can show it is alive and how much it has processed.
create table if not exists public.worker_health (
  id           text primary key,              -- worker id (e.g. 'cloud' | 'local')
  beat_at      timestamptz default now(),
  processed    int default 0,                 -- media items processed in the last cycle
  failed       int default 0,
  note         text
);
alter table public.worker_health enable row level security;  -- service-role only

-- Error log — every reported portal/automation error (written by lib/integrations/errors.ts + n8n).
create table if not exists public.error_log (
  id          bigint generated always as identity primary key,
  source      text not null,
  message     text,
  context     text,
  created_at  timestamptz not null default now()
);
alter table public.error_log enable row level security;

-- Email intake (one row per inbound company email; written by n8n/email-intake.json via the Gmail node).
create table if not exists public.email_intake (
  message_id     text primary key,            -- Gmail message id
  thread_id      text,
  from_email     text,
  from_name      text,
  subject        text,
  body           text,
  intent         text,            -- order | inquiry | complaint | supplier | payment | other (GPT)
  products       jsonb default '[]'::jsonb,
  doc_type       text,            -- po | invoice | delivery_note | payment | quote | other (if a document)
  has_attachment boolean default false,
  attachments    jsonb default '[]'::jsonb,   -- attachment file names
  summary        text,
  received_at    timestamptz default now()
);
alter table public.email_intake enable row level security;  -- service-role only (no anon policy)

-- App users (secure auth). Passwords are stored ONLY as a scrypt hash (scrypt$salt$hash) — never
-- plaintext, never sent to the browser. Read/written server-side via /api/auth (service-role).
create table if not exists public.app_users (
  username      text primary key,
  name_en       text,
  name_ar       text,
  role          text not null,                 -- admin | ceo | commercial | warehouse | finance | sales
  title_en      text,
  title_ar      text,
  email         text,
  color         text,
  password_hash text not null,                 -- scrypt$<salt>$<hash>
  avatar_url    text,                          -- profile picture (data URL or storage link)
  updated_at    timestamptz default now()
);
alter table public.app_users enable row level security;  -- service-role only (no anon policy)

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
