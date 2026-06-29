# MEC Extract Worker

Always-on worker that makes WhatsApp media **reliable**: it fetches + decrypts every captured
document/image, caches it to Supabase Storage, and OCR-extracts المخزون (inventory) / المديونية (credit)
statements straight into the database — so the portal updates **live, with no commit/push**.

This replaces the fragile inline decrypt inside the n8n workflow (which fails from a datacenter IP and
silently drops PDFs).

## How it works

1. n8n stores every message immediately with `media_status='pending'` (never dropped).
2. This worker polls `whatsapp_intake` for pending media, then per row:
   - fetch the encrypted bytes from WhatsApp's CDN (retry/backoff) → decrypt (HKDF + AES-256-CBC),
   - upload the real file to the private `wa-media` bucket → set `media_status='cached'`,
   - if it's a credit/inventory statement → Google Vision OCR → parse → write `extracted` +
     `extract_status='done'` (the live `/api/credit` & `/api/inventory-count` endpoints serve it instantly).
3. Writes a `worker_health` heartbeat each cycle (shown on the JARVIS cockpit + status report).

## Environment

```
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
GOOGLE_VISION_API_KEY=...
OPENAI_API_KEY=...
WORKER_ID=cloud        # optional; 'local' for the fallback
POLL_MS=10000          # optional
```

## Run

```bash
cd worker && npm install

# Spike test FIRST — can this host reach WhatsApp's CDN? (decrypts 3 recent files, writes nothing)
node index.js --spike

# If the spike passes, run it:
node index.js          # poll forever (cloud)
node index.js --once   # one pass then exit (local fallback / cron)
```

## Deploy (Railway — recommended)

1. Create a new Railway project → **Deploy from repo** → set **Root Directory** to `worker`.
2. Add the 4 env vars above (copy from `.env.local`).
3. Start command: `node index.js`.
4. **Run the spike test first** (`node index.js --spike` in the Railway shell, or locally). If Railway's IP
   is throttled by WhatsApp's CDN (0/3 reachable), don't rely on cloud — keep the **local fallback** running
   (`scripts/refresh-statements.ps1`, which now calls `node worker/index.js --once`). Same code, reachable IP.

> Risk: cloud hosts are datacenter IPs and *may* be throttled like Vercel/n8n. The spike test is the gate.
> The local fallback guarantees extraction either way; the cloud worker just makes it 24/7 and PC-independent.
