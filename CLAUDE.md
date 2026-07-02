# CLAUDE.md — MEC Operations Portal

> This is the project constitution **and** the live progress ledger. It is loaded into context every
> session. Read it first, work to its rules, and update the `## Progress` section at the end of every
> run. The self-development engine is the **`/mec-build`** skill (`.claude/skills/mec-build/`).

---

## 1. Identity

- **Agency:** Jarvis AI Agency — builds AI operational-intelligence systems for corporates.
- **Client:** MEC — a food importer/distributor in Saudi Arabia (meat, chicken, vegetables, potatoes
  and other imported SKUs), selling to business clients through salespeople.
- **This repo:** the **MEC Operations Portal** — a bilingual (EN/AR) web client portal that acts as
  MEC's operational command center: orders, approvals, warehouse, logistics, finance and supplier
  planning. Full business spec: `MEC_Jarvis_Operations_Platform_Brief.md`. Engine spec:
  `CLIENT-PORTAL-STARTER-HANDOFF.md`.
- **Deploy target:** GitHub repo `https://github.com/ehan11111-code/mec.git` → Vercel (auto-deploy on
  push to `main`). No env vars needed today; all data is deterministic mock.

## 2. Architecture rule (read before editing)

This portal is **catalog-driven**. You almost never touch the engine or components.

- To change what the portal shows about MEC, edit **`lib/mock/catalog.ts`** — 7 departments, each
  with 4 "solutions" (modules). The generator (`lib/mock/data.ts`) builds the sidebar, department
  grid, every KPI, chart, decision feed, intervention queue and workflow diagram from that one file.
- The **data boundary** is `getFirmState()`, `getDepartment()`, `getSolution()` in
  `lib/mock/data.ts`. Keep their return shapes (`FirmState`/`Department`/`Solution`, see
  `lib/mock/types.ts`) stable. When real data (Supabase) arrives, swap the bodies of those three
  functions — every page keeps working unchanged. **Golden rule: the UI never knows the data is mock.**
- Total-Savings reads its own module `lib/mock/savings.ts`.

## 3. Stack & brand

- Next.js 15 (App Router, RSC) · React 18 · TypeScript strict · Tailwind 3.4 (CSS-variable tokens) ·
  next-intl (EN/AR + RTL) · Framer Motion · Recharts · lucide-react.
- **Accent:** `#F36C34` (Jarvis orange) — set once in `app/globals.css`. **Default theme: dark.**
- **Bilingual:** every user-facing string is a `Bi = { en, ar }` in the catalog, or a key in
  `messages/en.json` + `messages/ar.json`. Keep the two message files in sync — components reference
  keys exactly. `clientName: 'MEC'` lives in `getFirmState()`.

## 4. Build discipline (the deploy gate)

- **`npm run build` must pass with ZERO type errors before any commit.** Never commit or push a red
  build.
- Known gotchas (Next 15 + this codebase):
  - `Bi` values are indexed by locale: `x[locale]` where `locale: 'en' | 'ar'`. Don't render a `Bi`
    object directly.
  - Route `params` is a **Promise** in Next 15. In client pages use `const { dept } = use(params)`
    (`import { use } from 'react'`); in server components `await params`.
  - New `messages/*.json` keys must exist in **both** `en.json` and `ar.json`.
  - New catalog solutions must keep the full `SolutionSeed` shape (4 kpiSeeds, 5-node `baseWorkflow`,
    decision/intervention/activity templates with `{n}`/`{m}`/`{q}`).

## 5. Roadmap (the brief's 7 phases)

The skill walks these in order. Today the portal is a polished **deterministic-mock demo** of the
whole surface; later phases replace mock with real systems (Supabase, n8n, WhatsApp/email, OCR).

- [x] **Phase 1 — Foundation:** portal scaffold, auth gate (demo), 7 departments × 4 modules, control
  center, CRM/department/solution pages, document/notification/savings/academy/contact pages.
- [ ] **Phase 2 — Documents & Intake:** real email + WhatsApp intake, OCR parser, extracted-data
  review screen, document→order matching. (Catalog dept `documents` already models this.)
- [ ] **Phase 3 — Approval Assistant:** real margin/stock/payment-risk calc + AI approval report.
- [ ] **Phase 4 — Warehouse & Delivery:** batch assignment, dispatch, driver status, delivery notes.
- [ ] **Phase 5 — Finance & Accounting:** payment tracking, promissory notes, XLSX export.
- [ ] **Phase 6 — Supplier Planning:** demand analysis, reorder, superior approval, supplier POs.
- [ ] **Phase 7 — Optimization & Learning:** outcome tracking, risk-score learning, debug dashboard.

**Guardrails (brief §16):** don't overbuild; build phase by phase; keep AI recommendations
explainable; ~~never auto-approve orders~~ **auto-approve orders only when margin-gated** (see below);
keep secrets out of the frontend; audit-log anything important; never trust AI extraction without a
confidence score + human review.

> **Auto-approval (revised 2026-07-02, per `PORTAL_AUDIT_AND_ROADMAP.md`; implemented in Phase D1):** an
> order may auto-approve **only** when its price meets the product's **typed target margin** AND stock is
> available. Below target but above the category hard-floor (meat 3% / chicken 5% / veg 6% / potatoes 10%)
> → warn the salesman → human-approval queue on confirm. Below the floor → human-only, never auto-sent.
> Every decision is audit-logged and explainable (show the margin math). Until D1 ships, orders remain
> human-approved.

## 6. Self-development protocol

Run **`/mec-build`** to advance the project one safe increment. Each run: build-green-first → do the
next ledger item → re-build → update the ledger below → commit + push. See the skill for details.
`/mec-build new-skill <name>` scaffolds a new specialized sub-skill.

---

## Progress

> The `/mec-build` skill updates this section every run. Newest entry on top.

- **2026-07-02 — Phase D: Live order analytics (portal orders → per-salesperson / per-client / revenue) — completes the 3-item O2C batch.**
  Third of the batch the user asked for (target-margin editor → PO+invoice → analytics). New
  **`lib/data/live-orders.ts`** (server) aggregates live orders from `whatsapp_intake` — portal (O2C) orders
  carry a priced margin eval (`raw.margin.total`, pre-VAT) so revenue rolls up by **salesperson** and
  **client**; WhatsApp orders without prices count toward order VOLUME only. New **`/api/orders/live`**.
  New **`components/LiveOrdersAnalytics.tsx`** + page **`/orders/live`** (Sales → Live order analytics):
  KPIs (live orders, live revenue, auto-approved, awaiting approval), **revenue-by-salesperson** bar
  (reuses `BarChartPanel`), **status donut**, **top clients (live)**, and a **recent-orders** feed (portal
  orders flagged ⚡). Auto-refresh 20s. **Honest boundary preserved:** this is a LIVE overlay — the imported
  spreadsheets stay the historical accounting record (§2 live-vs-static); revenue here is priced portal
  orders only, labelled pre-VAT. Build green (72 routes), EN/AR parity.
  - **O2C batch status:** stages 1 (order entry) + 3 (margin gate) + 4 (ZATCA invoice, demo) + partial 7
    (analytics) shipped. Still to build for the full spine: **D3** warehouse/dispatch + delivery routing to
    Abdullah + on-hand deduction; **D5** cashflow; richer per-client live overlay on the CRM.
  - **Deploy (batched, not yet pushed):** D1 + margin editor + D2 + analytics. Needs on push: `package.json`
    (qrcode.react) + re-run `supabase/schema.sql` (product_margins).

- **2026-07-02 — Phase D2: PO + ZATCA-shaped invoice + delivery note (QR, JARVIS-powered footer, printable).**
  Every portal order can now produce its documents on MEC's real template. New **`lib/o2c/zatca.ts`** —
  the seller identity extracted from invoice #409 (شركة طاهي الشرق الأوسط · VAT 314172890300003 · CR
  7051245491 · Jeddah address), a **ZATCA Phase-1 QR** builder (TLV base64: seller name, VAT, timestamp,
  total, VAT total), and a line/VAT/total builder (15%; sell = pre-VAT unit price, matching #409). New
  **`/api/orders/[id]`** returns the document data — seller, buyer (matched from the client record; buyer
  VAT shown only when the CR is 15 digits), priced lines from the order's stored margin eval, totals, and
  the QR payload. New **`components/o2c/O2CDocument.tsx`** renders a white A4-style sheet (RTL, mimics #409):
  seller header + brand + QR (invoice only), buyer block, line table, totals, signatures (invoice: العميل/
  المستودع/الحسابات · PO: اعتماد المدير التجاري · delivery: السائق/أمين المخزن/المراجع), and the required
  **"JARVIS powered" footer** with the JARVIS mark on ALL documents. New **`/orders/[id]/document`** page —
  a kind toggle (Invoice / Purchase order / Delivery note) + **Print / Save PDF** (reuses the existing print
  CSS that hides the shell). Openable from the **New Order** result ("View invoice / PO") and every
  **Approvals** card (doc icon). ZATCA is **demo-grade** — correct shape + scannable QR; live clearance
  needs the provider adapter + MEC's API key (still blank). Added dependency **`qrcode.react`**. Build green
  (route `/orders/[id]/document` + `/api/orders/[id]`), EN/AR parity.
  - **Deploy note:** `package.json` gained `qrcode.react` — the next push must include it (Vercel installs).
  - **Next (the 3rd of the batch):** wire portal orders into the per-salesman / per-client analytics + revenue.

- **2026-07-02 — Phase A DEPLOYED (`20f6db3`) + Phase D1: New Order flow with the margin gate (auto-approve/warn/queue).**
  Pushed Phase A to origin → Vercel (documents fix + 4-section reorg). Then built the first O2C increment —
  the heart of the order-to-cash flow the user detailed. **Margin-gate engine** (`lib/o2c/margin.ts`, pure):
  per line, gross margin vs the product's **target** (default = category floor `minMarginFor`; finance/
  commercial can raise it per product later) and vs the hard **floor** → **auto** (≥ target + stock) /
  **warn** (below target or stock unconfirmed) / **block** (< floor, manager-only) / **review** (no matched
  cost). **New Order page** `app/[locale]/orders/new` (Sales → New order): pick client, add product lines
  (each shows live cost + on-hand + floor + target from `getProductList()`), enter sell price + qty, see a
  **live per-line verdict** and an order-level decision; a below-target order shows an "are you sure?"
  confirm before it queues. **`/api/orders/create`** re-evaluates the gate **server-side from live product
  data** (never trusts the client), then files the order into `whatsapp_intake` (intent=order,
  group_type=portal, `order_status` = approved when all-auto else pending, margin audit in `raw.margin`) so
  it flows into **Approvals / Orders / Documents** exactly like a WhatsApp order. New `insertWhatsapp()` in
  supply.ts. This realizes O2C stages 1 (order entry) + 3 (margin gate) and revises guardrail §5 in practice
  (auto-approve is now margin-gated + audited). Build green (68 routes), EN/AR parity.
  - **Pragmatic note:** the portal order reuses `whatsapp_intake` (one pipeline, instant integration); a
    dedicated `orders`/`order_lines` schema comes when D3/D5 need the richer fields (delivery address,
    driver, invoice link).
  - **Target-margin editor SHIPPED (the "typable per-product margin"):** new **`pricing`** permission
    (commercial + finance + ceo + admin); Supabase **`product_margins`** table + server store
    `lib/data/margins-store.ts`; **`/api/margins`** (GET readable by order-creators for the preview, POST
    `pricing`-gated, rejects a target below the category floor); new **`/margins`** page (Sales → Target
    margins) — per product: cost, realized margin, floor, and an editable **target** (save / reset-to-floor,
    "custom" badge). The gate now reads these overrides on BOTH the New Order live preview and the server
    `/api/orders/create` (fetched via `getTargetMargins()`), so target-margin changes drive auto-approval
    everywhere. Also fixed a latent bug: `findUser().name` is a `Bi` object, so the created order now stores
    `name.ar` as the salesperson. Build green (70 routes), EN/AR parity.
  - **User action:** re-run `supabase/schema.sql` once (adds `product_margins`) so saved targets persist;
    the editor + gate work with the floor defaults meanwhile.
  - **Next (batching, not deployed yet — user chose to batch):** PO on the company template (JARVIS-powered
    footer) → D2 ZATCA-shaped invoice + QR (seller identity from invoice #409; provider stub) → wire portal
    orders into the per-salesman / per-client analytics.

- **2026-07-02 — Phase A started: documents-bug FIXED + sidebar reorganized into 4 sections + O2C requirements locked.**
  Building the roadmap (`PORTAL_AUDIT_AND_ROADMAP.md`). **(A.1) Documents bug — the invoice/delivery-note
  misalignment — fixed at the root:** `app/api/documents/route.ts` used to discard each document's own
  `client_name`/`products` and stamp it with the *temporally-nearest* order's fields, so a doc showed the
  wrong client/items. Now each document **keeps its own client + products**, and links to an order only when
  **validated** (matching `order_no`, or a shared client/product via the new **`lib/data/core/match.ts`**
  canonical matcher); a doc that names a different client/items is attached but **flagged as a mismatch**
  (`link`/`mismatch` fields) — not counted as received, shown in amber. The documents page modal now shows
  **document client vs order client**, the doc's own items, and a mismatch warning; a page banner counts
  mismatches. **(A.3) Sidebar reorg** (`components/SidebarNav.tsx`) into the requested 4 sections —
  **Sales · Warehousing & Logistics · Suppliers & Procurement · Financials & Credit** (+ Overview /
  Intelligence / Workspace / Admin / Help); Credit moved out of Sales, Documents out of Intelligence,
  Inventory out of Overview, and the **duplicate `/jarvis`** removed (now once, under Overview). New nav
  section keys in EN/AR. The thin Warehouse/Procurement sections fill out as the O2C pages arrive.
  **(A.2) Matcher consolidation — assessed, not force-merged:** the "3 duplicate matchers" are actually
  **domain-tuned** (products strip `كجم/كرتون`; inventory-count strips origins `هندي/برازيلي` + needs
  overlap≥2; clients strip company suffixes), so merging them blindly would shift margins/inventory/credit
  numbers — a behavior change the `/refactor` skill forbids smuggling into a refactor. `core/match.ts` is
  the established seam (used by A.1); the per-domain merge lands with numeric before/after verification when
  the O2C/CRM phases build on it. **Requirements locked:** captured every confirmed O2C answer (seller
  identity from invoice #409 — شركة طاهي الشرق الأوسط, VAT 314172890300003, CR 7051245491; margins=floors,
  commercial+finance raise targets; commercial manager approves; Abdullah=logistics; 3rd-party 6,000-carton
  warehouse; credit ~7d/down/2wk-by-exception; inactive at 3mo; JARVIS-powered doc footer; all salesmen
  onboarded) into the roadmap §6/§9 + memory `o2c-requirements`. Build green (66 routes), EN/AR parity.
  Not yet committed/pushed (awaiting go-ahead).

- **2026-07-02 — Full audit & development roadmap delivered (report-first round; no code changes).**
  User made a 7-part request to take the portal to "professional, global-grade, flawless" — now including a
  **full end-to-end Order-to-Cash (O2C) operational system** as the centerpiece (salesman order → PO on the
  company template → margin-gated approval → ZATCA-compliant invoice → warehouse/dispatch → logistics →
  analytics per salesman/client → ROP/expiry → cashflow), plus: fix the invoice↔delivery-note misalignment,
  refactor the data into linked single-source modules, reorganize pages into 4 sections (Sales /
  Warehousing+Logistics / Suppliers+Procurement / Financials+Cashflows+Credit), a tool-using JARVIS,
  an interactive CRM, and the gradual move off WhatsApp. **Decisions (via AskUserQuestion):** report-first
  sequencing; JARVIS = tool-using agent (live data); migration = gradual dual-run; ZATCA = demo-grade
  invoice now (correct template/QR/UBL fields) + pluggable provider adapter (Wafeq/Mezan/Zoho/Qoyod) later;
  approval = **target-margin + hard-floor** gate. **Root causes re-verified in code before writing:**
  documents bug = `app/api/documents/route.ts` overwrites each doc's own client/products with the
  temporally-nearest order's (L39-44,61-67) while `/api/wa-docs` shows the doc's own fields (L49-60) → the
  two views disagree; `dataset.ts` is a 3,400-line hub with `tokens`/`jaccard`/client-resolution/
  min-margin duplicated 2-3×; JARVIS = regex matcher + one 900-token gpt-4o call, no tools/live-data/memory
  (`lib/jarvis/engine.ts`, `app/api/jarvis/route.ts`); `SidebarNav` scatters Credit/Documents/Inventory and
  lists `/jarvis` twice. **Deliverable:** new **`PORTAL_AUDIT_AND_ROADMAP.md`** (8 sections, all 7 asks
  mapped with file/line evidence + phased fixes; O2C lifecycle in §6; build roadmap Phases A–F; assets
  needed from MEC in §9). No production code changed this round (report-first). Build unaffected.
  - **Guardrail update (this report supersedes §5's "never auto-approve"):** auto-approval is now permitted
    **only** margin-gated — price ≥ the product's typed target margin AND stock available → auto-approve +
    auto-invoice; below target but ≥ category floor (meat 3%/chicken 5%/veg 6%/potatoes 10%) → warn salesman
    → human queue on confirm; below floor → human-only, never auto-sent. Every decision audit-logged and
    explainable. To be implemented in Phase D1.
  - **Next:** await approval, then **Phase A** — documents-bug fix + `lib/data/core/match.ts` extraction +
    begin single-source modules (behavior-preserving) + sidebar reorg into the 4 sections.

- **2026-07-02 — Fixed reaction-approval clobber (الأمل order) + approval/document timing everywhere.**
  User: the الأمل الحلقه order (30 كرتون بوبي فيل) was 👍-approved but showed pending — why + show WHEN it
  was approved + show, per order/document, how long (min→hrs) approval/documentation took. **Root cause
  (traced in live data):** the order arrived in the "unknown" group as `other`; the 👍 reaction (06:45,
  3 min later) correctly set it `approved`; then **smart-reprocess promotion reset order_status to
  `pending`**, clobbering it. **Fix:** promotion now preserves the existing status; new
  `reapplyDecisions()` re-applies the latest ✅/👍/reply decision per order (wired into the reprocess auto
  pass → self-healing). Ran it → the order is now **approved · 3m · via 👍 reaction** (verified live).
  **Timing:** `/api/approvals` returns `decidedAt` + `minutesToDecision` + `decisionVia`; `/api/documents`
  returns `minutesAfterOrder` per doc; new `fmtDuration()` in datetime.ts. Shown on the **approvals cards**
  ("✓ approved · 3m after the order · via 👍 reaction · <time>") and the **documents** view ("arrived Xh
  after the order"). Build green, EN/AR parity.

- **2026-07-02 — Products-page on-hand reconciled (after orders + Tarek moved-out) + status check fixes.**
  User: on the PRODUCTS page only, reconcile on-hand after open orders and after items Tarek's المخزون
  file shows as moved out. New **`/api/products/onhand`**: per product, reconciled = ledger on-hand −
  units on open orders (pending/approved) − cartons in the latest المخزون movement file, matched by the
  shared token-jaccard (0.5; exported `tokens`/`jaccard` from dataset). Overlaid on the Products **list**
  (on-hand column shows the reconciled value with a † + tooltip of the math) and the product **detail**
  warehouse panel (with a "ledger − ordered − moved out" line). Products page ONLY — Inventory/OnHandMetric
  untouched. **Verified live: 43/99 products reconcile down** (e.g. بوبي فيل 3,908 − 30 − 1,330 = 2,548).
  Also during a status check: fixed the worker false-failing text payment notes (filter on message_type,
  not doc_type) and caught JARVIS read coverage back to **321/321 = 100%**. Build green, EN/AR parity.
  - **Status snapshot (2026-07-02):** 320→321 live msgs · 79 documents (26 payment/24 invoice/12 credit/
    10 delivery/7 inventory) · 65 approved (85 ✅/👍 reactions) · 92/92 media cached · receivables statement
    SAR 759,771 (as of 01 Jul) with 0 confirmed reconciliations yet (26 payment notes await confirming).

- **2026-06-29 — Finalize: recovered misfiled documents + intake recap.** User: most messages are
  documentations (sent + approved) — recap what was missed and finalize. **Gap found:** when decryption
  moved off n8n, the GPT-vision doc-type classification went with it, so scanned invoices/delivery-notes/
  payments sent as PHOTOS (no filename) landed as `doc_type:'other'`. **Fix:** added `classifyDoc` (GPT-4o
  vision, the DOC_PROMPT) + a **finalize pass** to the worker (`worker/lib/{ocr,process}.js`, new
  `--finalize` flag, also folded into `--once`) that reads each cached "other" document and sets the real
  type (and OCRs it if it's actually a statement). **Ran it:** recovered **3 misfiled payment receipts**,
  re-cached all media (0 unrecoverable now). **Recap (181 live msgs):** 45 real documents — invoice 12 ·
  payment 18 · delivery_note 8 · credit 4 · inventory 3; **28 approved** (37 ✅/👍 reactions, mostly
  approvals) · 2 rejected · 3 pending; 57/57 media cached; 20 cached files correctly left `other`
  (logos/brand sheet/ChatGPT image/nameless photos). The "missed orders" were corrections/returns/notes,
  not new orders (handled by smart-reprocess). The finalize now runs every worker cycle, so future
  photo-documents self-classify. Build green.

- **2026-06-29 — Cockpit number-interpretation + JARVIS in Admin + Orders/Clients recency sort + reaction-approve confirmed.**
  Four asks. **(1) "Every number interpreted/proven":** new **"How these numbers are calculated"** panel on
  `/jarvis` — for each KPI it prints the **formula with the live inputs** and a plain-language meaning.
  Crucially it explains the confusing "60/175 read + 100% extraction": accuracy = 0.6×reading-coverage +
  0.4×extraction-reliability (so 60% is from 34% read × 0.6 + 100% extracted × 0.4), and clarifies that
  **"read" counts messages (NLP) while "extraction" counts FILES** — different populations, so both are
  true. **(2)** Added the **JARVIS cockpit to the Admin** sidebar section too (perm `manageData`), in
  addition to Intelligence. **(3) Orders & Clients recency sort:** Orders gets a **Newest/Oldest** toggle
  (by date); Clients gets a **Top value / Most recent / Oldest** sort (by `lastDate`). **(4) Reaction
  approval:** verified the n8n intake already maps **✅/✔/☑/👍/🆗 reactions → approve** (and ❌/👎 → reject)
  and patches the order — workflow confirmed **active**, logic deployed. Build green, EN/AR parity.

- **2026-06-29 — Corrected interpretation: Tarek's المخزون file is inventory MOVEMENT, not stock on hand.**
  User: "the Tarek file is the movement of inventory, not the stock on hand." Read the actual PDF end-to-end
  (`المخزون حتي تاريخ 28-06-2026.pdf`, cols **الصنف | الكمية بالكرتون | الكمية بالكجم** with per-item
  **الإجمالي** rows) — it lists **cartons MOVED per item up to a date (throughput)**, which is exactly why
  the ~8,258 total exceeds the 6,000 capacity. **Reinterpreted across the portal:** on-hand is now clearly
  the **JARVIS reconciled** ledger figure (net in−out, ~3,483); Tarek's file is relabeled **inventory
  movement** everywhere — the OnHandMetric "tarek" tab ("Movement (Tarek's file)", muted not red, capacity
  note reframed as expected-for-throughput), the count-vs-ledger section ("Inventory movement (المخزون) —
  Tarek's file", "Moved (cartons)", "vs on-hand (ref)", honest note that the difference is reference-only
  not a discrepancy), and the proof page (now **"Inventory movement — Tarek's files"**, capacity% framing
  dropped). Removed the misleading variance "issue" JARVIS-note and its error-coloring (movement vs on-hand
  isn't a variance). Updated the `onHand` (i) definition + `INV_UPDATED` source line. Labels-only / no
  schema change. Build green, EN/AR parity (34 inventory keys reworded each side).

- **2026-06-29 — P2 + P3: payment→credit reconciliation (propose→confirm) + on-hand proof/history page.**
  Built on the P1 reliability base. **P1 verified live first:** deployed the never-drop intake
  (`NzuuId3FYrcqaAkb`), ran the worker → it extracted the **inventory (8 items) + credit (13 rows)**
  statements straight into Supabase; `/api/credit` (SAR 510,742, as-of 28 Jun) + `/api/inventory-count`
  (8,258 cartons) now serve live with no redeploy; worker heartbeat shows in `/api/ingest/health`; a
  read-everything pass recorded **understanding for 60 messages**. **P2 — credit reconciliation:** new
  `lib/data/reconcile-credit.ts` reads payment/bank-transfer notes, extracts the amount, fuzzy-matches the
  client to the live statement, and **proposes** a reduced credit line; `/api/credit/reconcile` (finance/
  manageData-gated) GET=proposals+confirmed+effective, POST=confirm → writes a `credit_adjustments` row
  (human-in-the-loop, never silent). New **`/credit/reconcile`** page: each payment with its proof note
  (Open PDF), matched client, current→proposed line, confidence, Confirm; confirmed list; receivables =
  statement − Σ confirmed. Linked from the Credit header. **P3 — on-hand proof:** new
  **`/inventory/on-hand`** page (`/api/inventory-count/history` + `getInventoryStatements`): a timeline of
  **every Tarek المخزون PDF** — date, total cartons, % of capacity, expandable item list, **Open PDF as
  proof**, and a count-over-time sparkline. Tarek's count stays the truth; the on-hand box now links here
  ("Tarek's count — history & proof"); JARVIS Count (reconciled/available, with its math) stays beside it
  on the Inventory page. Schema adds `credit_adjustments`. Build green (new routes: /jarvis,
  /inventory/on-hand, /credit/reconcile + 3 APIs), EN/AR parity.
  - **User action:** re-run `supabase/schema.sql` once more (adds `credit_adjustments`) so confirming a
    payment persists; the reconcile/proof pages already render without it.
  - **Next:** wire effective receivables (statement − confirmed) into Control Center; richer payment
    amount/client extraction (GPT) if free-text notes need it; JARVIS Count receipts/dispatch deltas.

- **2026-06-29 — Universal Intake & Reliability (P1): nothing ignored + JARVIS reads every message + cockpit.**
  User: the WaSender fetch "ignores important PDFs and notes" (المخزون/المديونية, invoices, payments, bank
  notes). **Root cause (in code):** the n8n intake decrypts media inline by fetching WhatsApp's CDN from
  n8n Cloud — a datacenter IP WhatsApp throttles — so on failure it fell to `{intent:'other'}` and the PDF
  was **silently dropped**; accurate OCR only ran on the user's PC and needed a commit+push to deploy; and
  payment/bank notes were stored but never acted on. **P1 shipped (reliability first, phased):**
  **(1) Never-drop capture** — `scripts/patch-intake-neverdrop.js` rewired `n8n/whatsapp-intake.json` to
  STOP decrypting inline; it now stores every doc with a provisional `doc_type` + `media_status='pending'`
  + media key/mime/filename so nothing is lost. **(2) Cloud extract worker** — new self-contained
  **`worker/`** (Railway; `worker/lib/{wa,ocr,supa,process}.js`) fetches+decrypts media (HKDF+AES) → Supabase
  Storage, OCRs المخزون/المديونية via Google Vision → writes `extracted` **straight to Supabase (no
  redeploy)**; `--spike` self-tests CDN reachability, `--once` is the local fallback (wired into
  `scripts/refresh-statements.ps1`). **Spike verified 3/3 media fetched+decrypted from this host.**
  **(3) JARVIS reads EVERY message** — `lib/data/reprocess.ts` gains `understandIntake()` (records a typed
  `understanding` per message — type/who/importance/action — noise handled free, rest via gpt-4o-mini) +
  `intakeStats()`; wired into the reprocess auto path (real-time + daily). **(4) Server-truth** — Control
  Center receivables now overlays the live `/api/credit`. **(5) JARVIS Cockpit** (`/jarvis`, Intelligence) —
  new `app/[locale]/jarvis/page.tsx` + `/api/jarvis/cockpit`: accuracy score (formula shown), captured/read/
  acted %, extraction success, intake+worker health, JARVIS interpretation, and the live "what's flowing
  through" feed with JARVIS's read of each. **(6) Watchdog** `/api/ingest/health` reactivates the intake
  workflow if it goes OFF + WhatsApps the owner. Data page now shows "JARVIS read: …" per message. Schema:
  `whatsapp_intake` gains media_status/media_key/media_mime/media_filename/storage_path/extract_status/
  understanding; new `worker_health` table. Build green, EN/AR parity.
  - **User actions to go fully live (ordered):** (a) **run `supabase/schema.sql`** (adds the columns —
    REQUIRED before deploying the new n8n workflow, else inserts fail); (b) then deploy the new intake
    (`node scripts/n8n-deploy.js whatsapp-intake`); (c) deploy the worker to **Railway** (root dir `worker/`,
    the 4 env vars, `node index.js`) — run `node index.js --spike` there first; the local scheduled task is
    the guaranteed fallback. **Cloud-worker risk:** Railway IPs may be CDN-throttled like Vercel — the spike
    test is the gate; local fallback covers it either way.
  - **Next (P2/P3):** payment/bank-note → credit-line reconciliation (propose→confirm); on-hand proof/history
    page (every Tarek المخزون PDF over time) + JARVIS Count with its math + cited proofs.

- **2026-06-29 — Fixed the WaSender "HI JARVIS" chain (intake workflow was off) + accurate status report.**
  User reported the WaSender workflow "not working." **Diagnosis (probed live):** the WaSender *session*
  is healthy (`/api/status` → `connected`, outbound send `ok`), but the **`MEC · WhatsApp Intake
  (WaSender)` n8n workflow (`NzuuId3FYrcqaAkb`) was deactivated** — so its production webhook
  (`…/webhook/mec-wasender`) was dead and inbound "hi jarvis"/"report" got no reply. **Fix:** reactivated
  it via the n8n API (`POST /workflows/{id}/activate` → active=true). **Also fixed a false-red in the HI
  JARVIS report:** the automation→n8n status matcher used `Array.find` on a loose keyword, so the inactive
  personal workflow `jarvis/auto.reminder/email+messege` matched "email" *before* the real `MEC · Email
  Intake (Gmail)` (active) → reported 🔴. Now matches only `MEC ·`-prefixed flows by a distinctive keyword
  (`app/api/jarvis-status/route.ts`). Build green; deployed (`b2a18ee`). **Verified end-to-end:** triggered
  the production status endpoint → full report **delivered to owner 966500900377 via WaSender (`ok:true`)**,
  all platforms 🟢 (Vercel READY · Supabase 149 msgs · n8n 8/27 · WaSender connected · OpenAI valid) and all
  5 live automations 🟢.

- **2026-06-28 — Forecast page (Intelligence): revenue / demand / orders / warehouse, real methods +
  visuals.** New **`/forecast`** (sidebar: Intelligence → Forecast, perm `analytics`). New
  **`lib/data/forecast.ts`** — real, explainable methods: **OLS linear regression** (+ R² + residual std
  for a **95% confidence band**), **Holt's linear-trend exponential smoothing**, **SES**, **CAGR**/MoM,
  and inventory **days-of-cover** + reorder timing. Forecasts blend regression + Holt on the live monthly
  history. New data helpers `unitsByMonth` / `ordersByMonth` / `unitsByCategoryMonth` in dataset.ts.
  New **`components/forecast/ForecastChart.tsx`** (Recharts ComposedChart: solid actual + dashed forecast
  + shaded confidence band). The page shows: KPIs (next-month revenue + MoM/CAGR, demand, orders,
  stockout-risk SKUs), a 3-month **revenue forecast** chart (with model-fit R²), **demand** + **order-volume**
  forecast charts, **demand-by-category** (run-rate vs Holt next-month), a **warehouse/stockout** table
  (days-of-cover, reorder-in, critical/watch status, soonest-to-run-out first), and a **Supply & price
  outlook** section (`components/forecast/SupplyForecast.tsx`) that ties the supply-intelligence workflow's
  price outlook (direction + low/high range + lead time) to MEC's **real last purchase cost**
  (`baselineForCommodity`) → projected cost range per commodity — each with the method written out (no
  black box). Also: click-to-calculate on Control Center Revenue/Receivables KPIs, and Tarek's count
  flagged red when it exceeds the 6,000 capacity. Build green (58 routes), EN/AR parity.

- **2026-06-28 — Inventory count corrected via Google Vision OCR + click-to-see-calculation on the on-hand
  box.** User: "Tarek's ~8k is wrong… make all numbers correct and clickable to show how each is
  calculated." **Diagnosis:** the المخزون/المديونية PDFs use a **custom-encoded Arabic font**, so the n8n
  text extractor misread them (wrong item names, a missed row) — the "1500"s it saw were glyph codes.
  **Fix — Google Vision OCR:** new **`scripts/ocr-statement.js`** OCRs the cached PDF (positional, so the
  table's rows/columns are preserved), parses inventory **deterministically** (skips header + الإجمالي
  subtotals, strips the عاصمة الدجاج supplier prefix, quantity = trailing number) and credit via GPT on
  the clean OCR text. Result: inventory now **8 correctly-labelled items = 8,288 cartons** (the old 7,948
  had mislabels + missed بوبي فيل 340); credit confirmed **593,884** (its digits read fine). Wired into
  `scripts/refresh-statements.ps1` (cache-media → OCR → push) so new statements auto-OCR. **Honest finding:**
  8,288 is genuinely what Tarek's sheet says — it exceeds the 6,000 capacity (driven by فيل ليج 1500 +
  فور كوارتر 1500 + صدور 2685 + شاورما 2248), so the *source* likely carries cumulative/incoming figures,
  not pure current on-hand — flagged for the user, not an extraction error anymore. **Click-to-calculate:**
  the **OnHandMetric** value is now a button → a breakdown modal showing every line that sums to the figure
  for the active source (physical: per-item counts; reconciled: per-SKU on-hand with excluded SKUs struck
  through; orders: reconciled − each open order's units), with the formula. Build green (57 routes), EN/AR.

- **2026-06-28 — 3-source on-hand metric box + delivery-note accuracy (reclassify) & receipt verification.**
  Two requests. **(1) On-hand box, user-switchable by icons:** new **`components/OnHandMetric.tsx`** on the
  Inventory page replaces the On-hand KPI — one box, three sources toggled by the icons inside it:
  **JARVIS reconciled** (ledger net, excludes unbalanced SKUs), **Tarek's physical المخزون count** (live),
  and **Available after orders** (reconciled − units committed to live open orders, fetched from
  `/api/approvals`). (i) tooltip defines all three. **(2) Delivery notes — misclassification + proof of
  receipt:** user noted some delivery notes are actually invoices and none show a signature/stamp /
  تم الاستلام. `/api/wa-docs` now derives **`suggestedType`** (filename/text heuristics:
  فاتورة/INV → invoice, تسليم/سند تسليم → delivery note, حوالة/إيصال → payment) and **`receiptConfirmed`**
  (text proof تم الاستلام/استلام/received/توقيع/ختم, or an explicit confirm). New **POST `/api/wa-docs`**
  (manageData): **reclassify** a misfiled doc (moves it to the right list) and **mark received**. The
  delivery-notes page gains a **Receipt** column (Received ✓ / Unconfirmed + admin "Mark received"), a
  "Possibly misfiled" KPI + warning callout with an inline **Reclassify** button, and an honest note that
  auto-reading a stamp from the image is a later OCR step (`GOOGLE_VISION_API_KEY` earmarked). `decision`
  union widened with `'received'`. Build green (57 routes), EN/AR parity.

- **2026-06-28 — Reliable WhatsApp file viewing: fixed (Arabic-filename header) + Supabase Storage cache.**
  User: opening a delivery note / invoice gave "decrypt failed / no downloadable media." **TWO real
  causes, both fixed:** **(A) The actual user-facing bug — an Arabic filename in the `content-disposition`
  header.** HTTP headers are Latin-1 only, so `new Response(buf, {headers:{'content-disposition':
  'inline; filename="فاتورة…"'}})` threw *"Cannot convert to ByteString"*, which was caught and fell
  through to the failing live-decrypt → 500. That's why ASCII-named PDFs opened and Arabic-named ones
  didn't. Fixed with **RFC 5987** (`filename="ascii"; filename*=UTF-8''<pct-encoded>`). **Verified
  10/10 documents now open as valid PDFs in prod.** (Found via a temporary `debug=1` probe, since the
  decrypt worked locally — the throw only surfaced on Vercel's response construction.) **(B) Vercel can't
  reliably fetch WhatsApp's CDN** (`mmg.whatsapp.net` throttles datacenter IPs), so live-decrypt is
  unreliable in prod regardless. Fix: **`scripts/cache-media.js`** decrypts on a machine that *can* reach
  the CDN (the user's, like the refresh task) and uploads the real file to a private **`wa-media`** Supabase
  Storage bucket (ran → 43 cached); **`/api/wa-file` serves the cached copy first** (reliable on Vercel),
  live-decrypt as fallback; `runtime='nodejs'`. Wired `cache-media.js` into `scripts/refresh-statements.ps1`
  so new media auto-caches on the 30-min schedule. WaSender has no media API (probed, all 404). Build green
  (57 routes). **Supabase note:** fits the **free tier** (1 GB storage; PDFs ~100–300 KB) — Pro ($25/mo)
  worth it at real launch for no-auto-pause + daily backups, not now.

- **2026-06-28 — Document registries: Invoices, Payments & Delivery notes pages (all WhatsApp docs,
  file-openable).** User wanted a dedicated page for each: all payments received, all invoices, all
  delivery notes — listing everything fetched from WhatsApp. Built three pages under **Documents** —
  `/documents/invoices`, `/documents/payments`, `/documents/delivery-notes` — each a thin wrapper over one
  reusable **`components/DocList.tsx`** (KPIs: total / with-file / latest; search; "with file only"
  filter; table of filename, client, sender, channel/group, received time; **Open file** → decrypts the
  original via `/api/wa-file`). New **`/api/wa-docs?type=invoice|payment|delivery_note`** +
  `getWhatsappDocs()` in supply.ts return every non-archived `whatsapp_intake` row of that doc_type,
  newest first, with the group JID resolved to a friendly name. Sidebar (Intelligence): Invoices /
  Payments / Delivery notes (perm `documents`); auto-refresh every 30s. Build green (57 routes), EN/AR
  parity.

- **2026-06-28 — Credit & Inventory now auto-refresh from WhatsApp (live overlay + aligned static).**
  User: credit/inventory "not updated with the WhatsApp messages." **Diagnosis (probed live):** the
  workflow IS healthy — it classifies المديونية/المخزون PDFs and **extracts** their tables into
  `whatsapp_intake.extracted` (latest credit = **27 Jun**, 14 rows; inventory = **27 Jun**, 7 rows). The
  break was the **last mile**: the Credit/Inventory pages read static JSON baked at build, and
  `refresh-statements.js` was a *manual* commit+deploy step — so they showed the stale 25 Jun data. **Fix
  (two layers):** **(1) Live overlay** — refactored `credit.ts` + `inventory-count.ts` into pure builders
  (`buildCredit`, `buildInventoryCount`) + parsers for the extracted rows; new live endpoints
  **`/api/credit`** + **`/api/inventory-count`** (read the newest extracted statement via
  `getLatestExtracted()`); the **Credit** and **Inventory** pages now fetch them and overlay the latest
  statement instantly (with a **"Live · auto-updated"** badge), falling back to the built-in statement.
  As-of date is parsed from the filename (`…حتي تاريخ DD-MM-YYYY.pdf`) so live + static agree. **(2)
  Aligned static** — ran `refresh-statements.js` (now also filename-dated) → credit **SAR 593,884** /
  inventory, both **as of 27 Jun**, baked into the generated JSON so the **server-rendered figures**
  (Control Center receivables, CRM, Collections) move with the pages. New **`scripts/refresh-statements.ps1`**
  + **`refresh-install.ps1`** register a Windows task that re-runs the refresh + pushes when a new
  statement arrives, keeping the server figures auto-aligned. Build green (54 routes), EN/AR parity.
  - **User action (one, for full automation):** `powershell -ExecutionPolicy Bypass -File
    scripts/refresh-install.ps1` (every 30 min; `-IntervalMinutes N` / `-Remove`). The **pages are already
    live** without it — the scheduled task only keeps the server-rendered global receivables figure aligned
    between deploys. The credit total moved 601,297 → **593,884** because the 27 Jun statement superseded
    the 25 Jun one.

- **2026-06-28 — Smart self-correcting intake: missed-order recovery + correction messages applied live
  (the Data page acts).** User: the classifier missing relevant data is "a problem" — make it intelligent,
  understand correction messages, apply them to update all portal data, live, every day & every message,
  visible on the Data page. Built the engine. New **`lib/data/reprocess.ts`** (server-only): re-reads
  recent `whatsapp_intake`, sends the order-like + reply/correction candidates to **OpenAI (JSON mode,
  gpt-4o-mini)** and produces typed proposals — **`promote_order`** (a real order filed as `other` → set
  intent=order + parsed products, status pending) and **`correction`** (a message that fixes a prior
  order/invoice — change client, qty, price, or cancel; target resolved by order#, else the quoted reply,
  else most-recent prior order) — each with confidence + before→after. New **`patchWhatsapp()`** in
  supply.ts applies a change (PATCH the live row → whole portal self-corrects). New **`/api/admin/reprocess`**
  (manageData session OR cron secret): GET previews, POST applies one whitelisted change or auto-applies
  the high-confidence batch. **Data page** gains a **Smart review** panel — *Run smart reprocess* → list of
  proposals with confidence + before→after + one-click **Queue as order** / **Apply fix** (my offered
  "queue-as-order" suggestion, shipped). **Guardrails honoured:** a recovered order only enters the
  approvals queue as *pending* (never auto-approved); data-changing corrections auto-apply only at ≥0.85
  confidence with an explicit target, else they wait for human one-click apply. **Daily automation:** new
  **`n8n/smart-reprocess.json`** (Schedule 06:00 → POST `/api/admin/reprocess?key=…&auto=1`) so it
  self-corrects every day; registered in the automations registry (live, phase 7, with bilingual notes).
  Build green (52 routes), EN/AR parity.
  - **Still open / optional:** set `MEC_DOCS_GROUP_JID=120363404531223628@g.us` so the docs group stops
    showing as "unknown" on the Data page; and tighten the n8n first-pass classifier (the reprocess now
    backstops it, but catching orders on the first pass is cheaper). "Every message" (vs daily) = have the
    whatsapp-intake workflow also POST to `/api/admin/reprocess` after storing — easy to wire next.

- **2026-06-28 — Admin "Data" page: a cross-source data inspector (what was fetched, from which group,
  and whether it was captured).** User asked whether recent fetched data was relevant-but-not-added, and
  for a page under Admin to see the latest data from all sources in detail (which group, which message).
  Built it. New **`/api/admin/data`** (manageData-gated) aggregates the latest items from **whatsapp_intake
  (incl. archived), email_intake and supply_intel** into one normalized, newest-first feed — each tagged
  with **source, channel (group JID → friendly name: `Middle East Chef order` / `MEC Invoices &
  Collections`, else the raw JID so an unmapped group is obvious), sender, classification (intent/doc_type),
  captured?** (became a structured portal record), archived flag, and a **`possible_order` heuristic**
  (un-captured messages mentioning كرتون/سعر/طلب/qty/price). New **`/admin/data`** page (sidebar: Admin →
  **Data**, Database icon): KPIs (fetched / captured / not-captured / possible missed orders), source tabs
  (All/WhatsApp/Email/Supply), a "Not captured only" filter, a highlighted possible-missed-orders callout,
  and a detailed expandable feed. **Live findings (probed at build time):** of 40 recent WhatsApp rows, 37
  `other` / 1 order / 2 approval; **29 came from an unmapped "unknown" group** (= the docs group — set
  `MEC_DOCS_GROUP_JID=120363404531223628@g.us` to label it) and 11 from the orders group. **Relevant data
  the classifier missed**, e.g. `الأمل الحلقه 30كرتون بوبي فيل سعر 350` (a real order classified `other`,
  never queued) and the owner's `Reprt … every day … at 6:00` request. Documents (invoice/delivery/payment)
  ARE captured. Build green (51 routes), EN/AR parity.
  - **Next from this:** (a) set `MEC_DOCS_GROUP_JID` so the docs group stops showing as "unknown"; (b)
    tighten the order classifier (the 30-carton message proves orders in the docs/unknown group slip to
    `other`); (c) optional: a one-click "queue as order" action on `possible_order` rows.

- **2026-06-28 — Connected order system: jarvis-admin delete (propagates everywhere) + orders-by-date &
  live proofs + inventory last-activity + (i) shows source & last-update + HI JARVIS dated timeline +
  Refactor skill.** Big multi-part run, all driven by "it's a system — all numbers and pages should be
  integrated and connected." **(1) Delete orders (jarvis/admin):** new `deleteWhatsapp()` in
  `lib/data/supply.ts` (hard DELETE on `whatsapp_intake`); new **`DELETE /api/approvals`** gated by the
  `manageData` permission (jarvis/admin/CEO); a **Trash** button on every approval card AND in the new
  Latest-orders feed, shown only when `useCurrentUser().can('manageData')`. Because Approvals, Documents,
  the orders feed, the WhatsApp inbox and Notifications **all read the same live `whatsapp_intake` table**,
  one delete clears the order from every page on the next refresh (20s poll / focus) — the integration the
  user asked for. **(2) Orders by date + the latest ones + proofs:** new reusable
  **`components/LatestOrders.tsx`** — a live "Latest orders & proofs" feed (reads `/api/documents`, newest
  first, each with date+time, salesperson, status, and **proof chips** that open the actual invoice /
  delivery-note / payment file via `/api/wa-file`, plus admin delete) — dropped on the **Orders** page.
  The historical Orders table gains a **Date column** (already newest-first). **(3) Inventory last
  activity:** new **Last-activity column** per SKU (last movement `lastMove` + last received `lastIn`) so
  every transaction's recency is visible. **(4) (i) tooltip now shows source AND last update:** extended
  `lib/info/definitions.ts` (each metric infers a `updated` line — imported-workbook date, live, credit
  statement `CREDIT_AS_OF`, or inventory count `INVENTORY_COUNT_AS_OF`) and `components/InfoTooltip.tsx`
  (renders a clock "last update" row) — so **every number's (i) shows what it means + its source + when it
  was last updated**. **(5) HI JARVIS report = dated timeline, not "today":** rewrote the activity block in
  `/api/jarvis-status` to a **"Last updates (UTC — date & time)"** section: exact stamp of the last order
  (with #/client), last document, last WhatsApp message (from the live feed), plus open-approvals count and
  the credit/inventory statement dates. **(6) Refactor skill + shared helpers:** new **`/refactor`** skill
  (`.claude/skills/refactor/SKILL.md`) documenting the architecture, where shared helpers live, and a
  safe behavior-preserving method; first refactor shipped — new **`lib/format/datetime.ts`** (`fmtDate`,
  `fmtDateTime`, `fmtDayMonth`, `fmtStampUTC`, `fmtAgo`) replacing the date formatters duplicated across
  Orders/Approvals/Documents/Inventory. Build green (50 routes), EN/AR parity.
  - **(7) Unification (live orders → headline tiles):** `LatestOrders` now reports its live rows up via an
    `onData` callback; the **Orders** page folds them into the "Total orders" / "Open orders" KPIs (with a
    "+N live" delta) and the **Operations House** page gains an "Incoming (live)" tile + the embedded feed,
    with its pending-approvals tile driven from the same source. So deleting a live order updates those
    headline counts immediately — the connected behaviour, now reaching the analytics pages too.
  - **Honest boundary (remaining):** the *historical* revenue/margin/inventory aggregates are still the
    fixed accounting record from the imported spreadsheets (`lib/data/sales.ts` / `inventory.ts`) — a live
    WhatsApp delete doesn't rewrite the books, by design. Live orders are surfaced as an overlay (feeds +
    count tiles) on top. Folding live orders into stock movements / revenue would be the next step.
  - **Deployed:** pushed to `origin/main` → Vercel (commit `5f19a26` + the unification commit).

- **2026-06-25 — "HI JARVIS" WhatsApp status bot + automatic error alerts + auto-extract live.** Two new
  capabilities. **(1) Status bot:** new **`/api/jarvis-status`** health-checks every platform (Vercel,
  Supabase, n8n via its API, WaSender, OpenAI) + lists live automations + recent activity (orders,
  receivables, inventory, concerns) → a WhatsApp-formatted report; `?send=1&to=` delivers it. The
  whatsapp-intake workflow now detects a greeting/`report` DM from an **owner number** (966500900377 etc.)
  and calls the portal to send the report back via WaSender (PORTAL_BASE_URL injected at deploy).
  **Verified end-to-end** — live report sent to 966500900377 (WaSender ok), n8n shows 6/25 active, Vercel
  READY. **(2) Error alerts:** `lib/integrations/errors.reportError` WhatsApps the team + logs to Supabase
  `error_log` (throttled); **`/api/report-error`** endpoint; a client **error boundary** (`app/[locale]/
  error.tsx`) auto-reports UI crashes; wired into `/api/jarvis`; new **`n8n/error-alert.json`** (Error
  Trigger) is set as the **error workflow on all 4 active automations**, so any automation failure pings
  the team. **(3) Auto-extract proven:** backfilled the two existing statements' `extracted` data and ran
  `refresh-statements.js` → regenerates the credit/inventory JSON from Supabase (dates preserved; DOC_PROMPT
  now also extracts the invoice date). All portal env (n8n/Vercel/WaSender/Graph/PORTAL_BASE_URL) pushed to
  Vercel via `vercel-setup.js`. Build green (50 routes), EN/AR parity.
  - **How to use:** WhatsApp **"hi jarvis"** or **"report"** from your number → full status reply. Errors
    anywhere (UI, API, or any automation) now WhatsApp the team automatically. New credit/inventory files
    auto-extract → `node scripts/refresh-statements.js` → commit/push refreshes the whole portal.

- **2026-06-25 — Receivables aligned everywhere (no more zeros) + JARVIS notes in every report + credit/
  inventory made auto-refreshing.** Three fixes. **(1) Alignment:** Analytics/Collections passed an empty
  filter object `{}` (truthy) so receivables read **0** there while Control Center read 601k — fixed:
  receivables are now ALWAYS sourced from the credit statement via `creditForFilter()` (attributed by
  month/salesperson when a slice is active), so every default view shows **SAR 601,297** and the figure
  reconciles on every page (verified). VAT toggle also extended to the Analytics + Clients money KPIs.
  **(2) JARVIS notes:** new `components/JarvisNotes.tsx` renders data-derived **potential issues +
  suggestions** (print-visible, so every downloaded report carries them) — wired into Credit (overdue
  invoices, client concentration) and Inventory (variance vs ledger, unreconciled SKUs, reorder); the
  `/report` engine already adds AI suggestions per area. **(3) Auto-refresh:** credit/inventory data moved
  out of hardcoded TS into `lib/data/*.generated.json`; the n8n intake now **extracts the credit/inventory
  table into `whatsapp_intake.extracted`** (DOC_PROMPT updated, redeployed `NzuuId3FYrcqaAkb`), and
  `scripts/refresh-statements.js` rewrites those JSONs from the latest extracted statement — one run
  updates receivables + Credit page + Inventory count + all KPIs together, aligned. Orders/invoices/docs
  were already fully live (Supabase + client-fetch auto-refresh on every page). Build green (48 routes),
  EN/AR parity.
  - **User action:** re-run `supabase/schema.sql` (now also adds `extracted` + the earlier `archived`).
    Then each new المديونية/المخزون file auto-extracts; run `node scripts/refresh-statements.js` (or
    schedule it) → commit/push → the whole portal refreshes in alignment. Full zero-touch (no command) for
    the server-rendered global receivables would need the async data layer or a scheduled refresh+deploy —
    offered as a next step.

- **2026-06-25 — Tarek's WhatsApp files ingested: Credit (المديونية) as the receivables truth + Inventory
  (المخزون) count reconciliation + a portal-wide per-number VAT toggle + credit/inventory doc types.**
  Tarek sends two PDFs to the docs group; new `scripts/wa-download.js` decrypts WhatsApp media by
  message_id (HKDF+AES-256-CBC) so I can read them. **(1) Credit:** `lib/data/credit.ts` = the parsed
  المديونية statement (14 invoices, **SAR 601,296.55**, per-client + aging). Per the user, this is now the
  **source of truth** — `dataset.ts` no longer zeroes receivables; outstanding is driven by the statement,
  assigned to exactly one client each so **revenue (31,084,511) = collected + outstanding** still
  reconciles (verified) and Σ(client overdue) = the statement total. New **/credit** page (KPIs, aging
  buckets, by-client, by-invoice, printable, EN/AR). **(2) Inventory:** `lib/data/inventory-count.ts` =
  the المخزون physical count (7 SKUs), matched to the ledger by name similarity with a variance column on
  the Inventory page (e.g. شاورما لارا counted 2,298 vs ledger 4,731 → flagged). **(3) VAT toggle:**
  `components/Money.tsx` — every amount gets a tappable chip to switch VAT-inclusive ⇄ exclusive (15%);
  wired into `StatCard` + Control Center revenue/receivables, the whole Credit page, and the count panel
  (KPIs-first rollout; tables/charts next). **(4) Doc types:** `credit` + `inventory` added to the
  classifier — n8n DOC_PROMPT updated + redeployed (`NzuuId3FYrcqaAkb`); the two existing files
  reclassified in Supabase. Build green (48 routes), EN/AR parity. Decrypted PDFs are gitignored
  (`DATA/inbox/`) — real client financials, never committed.
  - **Next for VAT:** extend the per-number chip to the analytics MetricCards, CRM/orders/products tables
    and charts (currently on KPI StatCards + Credit + inventory-count). The credit/inventory data refresh
    when a newer file arrives — re-run `wa-download.js` on the new message and update `credit.ts` /
    `inventory-count.ts` (later: auto-extract in the workflow).

- **2026-06-25 — Test data archived (not deleted → kept in the automation log) + automated private-repo
  backup + cloud-drive backup-of-backup.** Two-part run. **(1) Clear test data, keep the audit trail:** the
  WhatsApp orders/approvals/documents we ran while testing now **archive** instead of delete. New
  `archived` boolean on `whatsapp_intake` (schema.sql, idempotent). Operational reads (`getWhatsappIntake`/
  `getWhatsappOrders`, filtered app-side so it's safe before the column exists) hide archived rows, so the
  **Approvals queue, Documents page, WhatsApp inbox, notifications** go clean — but the **automation log**
  (`/automations/whatsapp-intake`) calls `/api/whatsapp?all=1` and still shows every row with an
  **"archived · test"** chip for audit/debug. Admin console **Clear** for WhatsApp now calls
  `archiveWhatsapp()` (PATCH archived=true; contact/internal-messages still delete); its count shows only
  live rows. `scripts/archive-whatsapp-test.js` archives existing rows in one shot (`--restore` to undo).
  **(2) Backup:** new independent backup separate from the Vercel repo — `scripts/backup.ps1` auto-commits
  working changes, pushes to a **private `backup` GitHub remote** (never `origin`, so no accidental
  deploy), writes a full **`git bundle`** to a synced **cloud-drive** folder, copies `.env.local` to
  drive `/secrets` (never GitHub), and prunes old bundles. `scripts/backup-install.ps1` registers a
  **Windows Scheduled Task** so it runs automatically. Config `scripts/backup.config.json` (gitignored);
  full guide in `BACKUP.md`. **Backup is now LIVE:** wired the `backup` remote to the user's private repo
  `github.com/ehan11111-code/BackUP_MEC`, Google Drive for Desktop mounts at `G:\My Drive` (bundles +
  `secrets/.env.local` land in `G:\My Drive\MEC-Portal-Backup`), and the **Windows Scheduled Task "MEC
  Portal Backup" runs every 15 min** (verified: commits → pushes → bundles → copies secrets). One gotcha
  fixed along the way: the Write tool saved the `.ps1` files as **BOM-less UTF-8 with em-dashes**, which
  Windows PowerShell 5.1 misreads (it assumes Windows-1252) so only the script's last statement ran —
  re-saved ASCII-only **with a BOM**; also judge `git push` success by **exit code**, not stderr (git's
  normal output goes to stderr). Build green (47 routes), EN/AR parity.
  - **User action (one left):** re-run `supabase/schema.sql` (adds `archived`), then `node
    scripts/archive-whatsapp-test.js` (or click **Clear** in the admin console) to archive the existing
    WhatsApp test rows. After that the portal is clean and the automation log keeps the audit trail.
  - **Backup is hands-off now:** the scheduled task captures every change. To check it:
    `Get-Content backup.log -Tail 8`; to change cadence: `backup-install.ps1 -IntervalMinutes N`; to stop:
    `backup-install.ps1 -Remove`.

- **2026-06-25 — Receivables zeroed + margins made 100% consistent + WhatsApp TWO-group intake (orders +
  docs), sender→salesperson, reply threading, no auto-reply.** Three-part run. **(1) Zero receivables:**
  single source of truth `RECEIVABLES_ZEROED` in `dataset.ts` treats every historical invoice as collected
  → outstanding receivables read **0** everywhere (Control Center, Analytics→Collections, CRM balances/risk,
  Operations House payments-due, concerns). The "uncollected receivables" + "high-risk clients" concerns no
  longer fire. Verified revenue 31,084,511 = collected, outstanding 0. **(2) Margins correct & consistent:**
  purchase unit cost is now **quantity-weighted** (by cartons bought) in both the margin matcher and the
  inventory cost matcher; per-product avg sell = pre-VAT revenue ÷ units (realized, qty-weighted) not a mean
  of list prices; `marginByCategory` now **derives from the per-product gross profit** (revenue-weighted) so
  product/category/overall reconcile (category revenue stays post-VAT to match the Sales tab). Verified
  overall 7.8% on 105 priced products; Beef 10.8% / Poultry 5.1% / Lamb 7.1%. **(3) WhatsApp two groups:**
  the intake workflow used to DROP all group messages — rewritten (`n8n/whatsapp-intake.json`, redeployed
  `NzuuId3FYrcqaAkb`) to listen in **two groups** via `MEC_ORDERS_GROUP_JID` (orders + quantities; the
  **sender is the salesperson** — whoever sends it brought it; new orders open 'pending' in approvals) and
  `MEC_DOCS_GROUP_JID` (delivery notes/invoices/payments → doc_type). **Reply threading:** a reply that
  approves/rejects/adjusts quantities PATCHes the quoted order (order_status/products) so the portal queue
  updates itself. **No auto-reply** anywhere (groups or DMs) per user — JARVIS listens silently
  (`WASENDER_AUTO_REPLY=1` re-enables a DM-only ack, never in a group). Unknown groups are recorded as
  `group_type='unknown'` so their JID shows in the inbox for setup. Schema: whatsapp_intake gains
  `group_jid, group_type, salesperson, quoted_message_id, decision`. Approval card shows the salesperson.
  Build green, EN/AR parity, deployed.
  - **User actions:** (a) re-run `supabase/schema.sql` (adds the 5 columns); (b) once JARVIS is in the two
    groups, give me each group's JID (or read it from the inbox where unknown-group messages now show their
    `group_jid`) so I set `MEC_ORDERS_GROUP_JID` / `MEC_DOCS_GROUP_JID` in `.env.local` and redeploy — then
    orders/docs route correctly. Doc→order matching is by sender for now; richer matching (by invoice/order
    ref via OCR) is a later enhancement.

- **2026-06-24 — Stock-by-SKU now reconciles with the headline + live warehouse on-hand on every product
  page.** User: the SKU table and the overall on-hand "don't match" (summing the 45-row on-hand column gave
  14,888, headline was 3,483) — "no room for errors." Fix: the table adds up to the headline **by
  construction** — the 8 unreconciled SKUs' on-hand is rendered **struck-through + "excl."** (visibly not
  counted), and a **totals footer** prints the reconciled on-hand of the *shown* rows (= 3,483 / 58% of
  6,000 when unfiltered, and stays correct under any filter). New request also shipped: **every product
  page shows its live warehouse on-hand.** New `warehouseForProduct()` (token-jaccard maps a sold product →
  its warehouse SKU, threshold 0.5) feeds an **"In the warehouse now"** panel on `/products/[id]` (on-hand,
  expiry R/Y/G, reorder flag, matched SKU + in/out, unreconciled caveat) and an **On-hand column** on
  `/products` (unreconciled marked `*` + tooltip; unmatched products honestly show "—"). Audited the
  cross-page numbers (Explore agent): revenue = collected + receivables, Σ(client revenue) = total sales,
  and Operations House all read the same source functions and reconcile; the one nuance noted (profit
  summary is "on priced products") is already labelled. Build green (47 routes), EN/AR parity, deployed.

- **2026-06-24 — Inventory on-hand reconciled (fixed the impossible 14,888).** User flagged that 14,888
  cartons on hand can't be real vs the 6,000 capacity. Root cause: (1) a **clamp bug** — clamping each
  SKU's negative net to 0 then summing inflated 10,079 → 14,888; (2) **the ledger doesn't reconcile** — it
  records 141,885 cartons in vs 131,806 out (net +10,079), because **outbound is under-recorded for 8
  SKUs** (e.g. بوبي فيل الكامل: 4,083 in / 175 out). Fix: `getInventory` now flags **`unreconciled`** SKUs
  (out < 20% of in & net > 150, or one SKU's net > 40% of capacity); `warehouseStock` reports a
  **reconciled on-hand that excludes them = 3,483 cartons (58% of 6,000)** — plausible — plus `rawOnHand`
  / `netRecorded` for transparency. Inventory page headline is now the reconciled figure with an
  explanation, an "Unreconciled" filter, and per-SKU **in/out** shown for flagged rows. Operations House
  warehouse tile inherits the reconciled number. The `inbound-gap` **data concern** rewritten to this
  precise finding (+ evidence table of the unreconciled SKUs with in/out/net). Build green, EN/AR parity.

- **2026-06-24 — Missing-document alerts (order compliance) — final item of the big batch.** Every order
  needs its **PO → invoice → delivery note → payment proof**; the system tracks which have arrived and
  flags what's missing. The order/WhatsApp message is the PO; invoice/delivery/payment are matched from
  later document messages by the same sender. New **`/api/documents`** (builds per-order doc compliance)
  + **`/documents`** page — a checklist per order (✓/✗ per doc), filters (Needs documents / All), KPIs
  (orders, missing, complete, **invoice missing**), auto-refresh. **`/api/notifications` now pushes a
  "Missing invoice" alert** for any order whose invoice hasn't arrived (the PO-uploaded-invoice-missing
  case), opening the order. Schema + `WhatsappMsg` gain **`doc_type`**; the **n8n WhatsApp intake now
  classifies document type** (po/invoice/delivery_note/payment) and stores it (redeployed
  `NzuuId3FYrcqaAkb`). `documents` permission added to every role (BASE) so all ops staff see compliance.
  Sidebar: Documents (Intelligence). Build green (47 routes), EN/AR parity. **This completes the batch.**
  - **User actions:** re-run `supabase/schema.sql` (adds `doc_type`). Real document classification fills
    in once **JARVIS is added to the MEC WhatsApp group** (the page + alerts are ready for that feed);
    until then orders show PO ✓ with invoice/delivery/payment pending. OCR-grade doc typing (Vision) is a
    later enhancement.

- **2026-06-24 — Openable notification messages + AI reports (overview report + JARVIS prints any report).**
  **(A) Notifications open into a full message** (`/notifications/[id]`): concerns show the data
  demonstration (debtors/loss-makers/at-risk tables, inbound-gap figures) + the "Likely cause"
  justification (`concerns.getConcernEvidence`); WhatsApp orders show line items + Approve/Reject; supply
  alerts show outlook + sourced risks. Bell + feed now route to it. Login username placeholder is generic
  ("username"). **(B) Report engine** — `lib/report/builders.ts`: 10 permission-tagged, time-aware
  builders (executive, revenue by month/salesperson/category, top clients, collections, product margins,
  inventory status, delayed payments, concerns). New **`/api/report`** (session-gated): maps a free-text
  request → builder ids + timeframe (e.g. "last 30 days") deterministically, runs only the **permitted**
  builders, and adds **AI-written improvement suggestions per area** (OpenAI, graceful without a key).
  New printable **`/report`** viewer. **Control Center** has a **Company report** button (full overview +
  AI suggestions). **JARVIS prints any report**: ask "print me a report of the last 30 days of revenue per
  salesperson" → it builds it (honouring your role) and shows an **Open report** button. Verified: overview
  = 10 sections; 30-day salesperson report returns Mahmoud SAR 1.27M / Tamer / Unassigned. Build green (45
  routes), EN/AR parity. **Last queued item:** missing-document alerts (WhatsApp group).

- **2026-06-24 — Inventory feed: warehouse ledger → on-hand + expiry (R/Y/G) + reorder points vs 6,000.**
  Parsed the real warehouse ledger. New **`DATA/_inventorygen.js`** reads **`المخزون 2026.xlsx`** (a proper
  in/out movement ledger — positive = received, negative w/ client = issued) and nets each product column
  to **cartons on hand**, joining **`تقارير الاصناف.xlsx`** for unit/barcode (its prices are inaccurate,
  so ignored — **cost always from procurement**). Writes **`lib/data/inventory.ts`** (45 SKUs). New
  inventory model in `dataset.ts`: `getInventory()` + `warehouseStock()` — per-SKU **on-hand**, **stock
  value** (procurement cost × on-hand, 44/45 priced), **indicative expiry R/Y/G** (last receipt + category
  frozen shelf-life), **reorder point** (1.5× monthly demand over lead time) + reorder flag, and a
  **data-gap** flag (negative net = issues recorded without their receipt). New **`/inventory`** page —
  KPIs, **capacity bar vs 6,000** (utilization), green/yellow/red expiry legend, filters (All / Reorder /
  Expiring / Data gaps), search, **printable**. **Operations House warehouse tile now shows real on-hand**
  (+ utilization, reorder count) alongside turnover. Sidebar: Inventory (Overview). On-hand total ≈ 14,888
  cartons (248% of capacity — inflated by 19 data-gap SKUs, surfaced honestly + ties to the inbound
  concern). Build green (43 routes), EN/AR parity.
  - **Honest caveats:** absolute on-hand is indicative (unrecorded issues inflate it); expiry is shelf-life
    estimated until real batch dates exist. Both are labelled in-app. Regenerate: `node DATA/_inventorygen.js`.
  - **Still queued:** Overview AI review PDF + JARVIS arbitrary report printing; missing-document alerts.

- **2026-06-24 — Data-integrity concerns: notification bar + concern notifications.** New
  `lib/data/concerns.ts` (`getConcerns`) scans the real dataset for contradictions / things that don't
  reconcile and reports each as a short message (numbers + what to do). Currently surfaces **6**: high —
  **80% of revenue uncollected**, **products sold below cost**; medium — **inbound stock under-recorded**
  (procurement 96k vs sales 135k cartons → on-hand can't reconcile vs the 6,000 capacity), **products
  below min-margin floor**, **high-risk clients**; low — **products with unknown margin** (no matched
  cost). New **`ConcernsBar`** (dismissible notification bar) on Control Center + Operations House, and a
  new **`concern`** notification type (AlertOctagon) merged into the **bell + notifications feed** (with a
  Concerns filter). Each concern's full report is the notification message. Build green (42 routes), EN/AR
  parity. **Next:** inventory feed (true on-hand + expiry R/Y/G + ROP) which also resolves the inbound-gap
  concern.

- **2026-06-24 — Adjustable trend timelines + Admin clear-test-data console + Operations House
  (increment 2 of the big batch).** **(1) Adjustable chart timelines** — `LineChartPanel` gained an
  `enableTimeframe` prop (All / 6M / 3M selector that slices the trend); enabled on the Analytics revenue
  trends. **(2) Admin console** (`/admin`) — CEO + admin only (new **`manageData`** permission) to wipe
  **test data before launch**: WhatsApp inbox/orders, contact inquiries, internal messages. New
  **`/api/admin/clear`** (GET counts + POST delete, session-role-gated server-side via `permissionsFor`).
  **(3) Operations House** (`/operations`) — today's operational snapshot from real data: orders today,
  **live pending approvals** (WhatsApp), completed, **delayed payments**, **payments due** + top debtors,
  **warehouse status vs the 6,000-carton capacity** (throughput + turnover ×; latest month 17,643 cartons
  ≈ 2.9× turns), and a fast-movers stock-watch — **printable**. `WAREHOUSE_CAPACITY = 6000` +
  `operationsSnapshot()` in `dataset.ts`. Sidebar: Operations House (Overview) + Admin console (Admin).
  Build green (42 routes), EN/AR parity.
  - **Note on warehouse:** the procurement sheet under-captures inbound (bought 96k < sold 135k cartons),
    so point-in-time on-hand isn't reliable yet — Ops House shows honest **throughput/turnover** vs 6,000.
    True on-hand + per-SKU expiry/ROP come with the inventory-feed increment (next), from `المخزون
    2025/2026.xlsx`.
  - **Still queued:** inventory master + expiry (R/Y/G) + ROP; Overview AI review PDF + JARVIS arbitrary
    report printing; missing-document alerts (WhatsApp group).

- **2026-06-24 — Clickable entities + Product pages + JARVIS typing + PDF pie fix (increment 1 of a big
  batch).** First slice of a large multi-feature request. **(1) Clickable client + product names
  everywhere** — new `components/EntityLink.tsx` (`ClientLink`/`ProductLink`); `dataset.clientIdByName()`
  resolves a sales name → client id. Wired into Orders (client + new product column), client-file product
  table, product top-buyers. **(2) Product pages** — new `/products` (catalog: search + category filter,
  units/orders/sell/cost/margin, click-through) and `/products/[id]` (per-product page: demand-over-time,
  **sold-vs-bought price** trend, window-scoped margin with **All/6m/3m timeframe selector**, top buyers).
  Data: `getProductList()`, `getProductDetail()`, `productSalesIndex()` in `dataset.ts` (reuse
  `productMargins` + procurement cost). **(3) Product “Market alerts” tab** — pulls live supply-intel and
  filters to the product’s commodity (daily-refreshed, sourced). **(4) JARVIS interactivity** — animated
  typing dots + cycling status (“Thinking… / Gathering data… / Analysing… / Composing…”). **(5) PDF pie
  fix** — donut centre price now shrinks for long values + a `print:` rule so it isn’t oversized on paper.
  Products added to the sidebar (Sales & clients, `orders` perm). Build green (39 routes), EN/AR parity.
  - **Still queued from this batch:** adjustable chart timelines (global); CEO/admin clear-test-data
    (WhatsApp/orders); Today’s Operations House (+printable); Overview AI review PDF + JARVIS arbitrary
    report printing; inventory master merge from `المخزون 2025/2026.xlsx` + `تقارير الاصناف.xlsx` (prices
    from procurement) → inventory page with per-SKU expiry R/Y/G + ROP; missing-document alerts (WhatsApp
    group). Building these in the next increments.

- **2026-06-24 — Secure server-side auth (Supabase + hashed passwords + signed cookie).** Replaced the
  client-side demo auth with real server auth. **Passwords are no longer in the browser bundle** — they
  live only in Supabase `app_users` as **scrypt hashes** (`scrypt$salt$hash`, dependency-free), verified
  server-side in **`/api/auth`**. Session is a **signed, httpOnly cookie** (HMAC-SHA256 with `AUTH_SECRET`,
  7-day, `secure`+`sameSite=lax`) the client JS can't read or forge. New `lib/auth/server.ts`
  (hash/verify, sign/verify session, Supabase reads, `verifyCredentials/changePassword/resetPassword/
  setAvatar`); `lib/auth/users.ts` is now a **client-safe roster (no passwords)** + the permission map.
  Client `lib/auth.ts` is thin async wrappers (`login/logout/getMe/changePassword/resetPassword/
  uploadAvatar`). Rewired AuthGate, login, ProfileMenu, `useCurrentUser`, root index, messages page.
  **`/api/messages` now derives identity from the cookie** (no impersonation via params). Avatars persist
  to `app_users.avatar_url`. `app_users` table added to `schema.sql` (RLS service-role only). New
  `scripts/seed-users.js` upserts the roster with hashed defaults. `AUTH_SECRET` generated + added to
  `.env.local` and Vercel. **Pre-seed fallback:** until the table is seeded, login verifies against a
  server-only default-password map, so login works immediately (password changes need the table). Build
  green (37 routes).
  - **User action:** re-run `supabase/schema.sql` (adds `app_users`), then I run `node scripts/seed-users.js`
    to hash + store the passwords (after that, password change/reset/avatar persist). WaSender is now
    logged in, so contact/order WhatsApp alerts deliver.

- **2026-06-24 — Roles & accounts, profile menu, JARVIS inbox, sidebar reorg, admin automations, contact
  workflow.** Big multi-part run. **(1) Auth/roles:** new `lib/auth/users.ts` — 7 accounts (6 MEC staff +
  `jarvis` super-admin) with **per-role permissions** (`ROLE_PERMISSIONS`: admin/ceo/commercial/warehouse/
  finance/sales). Rewrote `lib/auth.ts` (username sessions, password overrides + `generatePassword`,
  base64 avatars, `authenticate`/`can`). Login is **username+password** now. **(2) Profile menu** in the
  TopBar (`ProfileMenu` + `Avatar`): change/upload photo, change password, **forgot→generate new**, JARVIS
  inbox link, sign out. **(3) Sidebar reorg** into permission-filtered sections (Overview / Sales & clients
  / Intelligence / Workspace / Admin / Help + Departments) — resolves the two scattered "approvals" (order-
  approvals under Sales; the Approvals *department* under Departments). Non-permitted items hidden;
  `PermissionGate` blocks direct-URL access. **(4) JARVIS inbox** — staff messaging: `/messages` page,
  `/api/messages`, `lib/data/messages.ts`, Supabase `internal_messages` table. **(5) Automations** is now
  **admin-only**, **no Run button** — per-workflow **cadence editor** (schedule) / event label, enable
  toggle, live/planned status + brief phase; curated list (12 brief workflows + new contact one, each
  mapped to its phase). **(6) Academy** marked **Beta · under maintenance**. **(7) Contact workflow** —
  `/api/contact` + `lib/integrations/notify.ts` fan out every inquiry to the **Jarvis team on WhatsApp
  (WaSender → 3 numbers)** + **email (MS Graph → partners@jarvisksa.com)** + logs to Supabase; new n8n
  **`contact-inquiry`** workflow deployed + active (`feBtsUD1FGyZaVmt`, webhook `…/webhook/mec-contact`).
  Schema adds `internal_messages` + `contact_inquiries`. Build green (37 routes); EN/AR keys in parity.
  - **User actions:** (a) re-run `supabase/schema.sql` (adds the two new tables); (b) for contact **email**
    to send, grant the Azure app **Mail.Send (Application)** + admin consent; (c) WhatsApp alerts need the
    **WaSender session reconnected** (still `logged_out`). **Credentials handed to the user in chat.**
  - **Security note:** demo auth checks credentials client-side, so passwords ship in the bundle — fine for
    the demo, but move to real server auth (Supabase Auth) before production, and rotate the shared keys.

- **2026-06-24 — Professional CRM: per-client file + product/value/size filters + drill-through.**
  Rebuilt the Clients (CRM) page into a real directory and added a **per-client detail page**
  (`/clients/[id]`). New data layer in `lib/data/dataset.ts`: `clientSalesIndex()` buckets **every sales
  invoice to its client** (shares the name→id resolver with `enrichClients`, so SC-* sales-only clients
  resolve too), `getClientStats()` (units, distinct-product count, collected/outstanding, top product,
  product+category lists), `allProducts()` (powers the product filter), and `getClientDetail()`
  (summary, products bought, category mix, monthly trend, full invoice history, **indicative credit
  line** = peak-month buying ×2, used = real uncollected balance). **CRM list** now filters by
  **product · order value tier · order size tier · status** + search, shows products/units/outstanding
  columns, and **every row clicks through** to the client file. **Detail page**: KPI cards, a credit-line
  panel (limit/used/available + utilization bar + payment terms, flagged ok/high/over), client profile,
  revenue-over-time line, category donut, searchable products-purchased table, and order-history table —
  all bilingual EN/AR with (i) definitions (`creditLimit`, `productsBought`, `units` added). Verified
  the join live (116 clients with sales; top client → 13 products / 21 invoices / credit util 118%).
  Build green (35 routes).

- **2026-06-23 — WhatsApp orders → approval queue (approve/reject) + order notifications.** WhatsApp
  messages classified as `order` now surface as **approvable orders**. New **`/approvals`** page (Pending/
  Approved/Rejected tabs): each order shows sender, **parsed line items**, the message, and **Approve /
  Reject** buttons. New `/api/approvals` (GET order-intent rows + POST decision → PATCH `order_status`).
  Added `order_status` column to `whatsapp_intake` (schema, idempotent). **Pending orders also push an
  "approval" notification** into the bell (`/api/notifications` now reads WhatsApp orders too). Sidebar +
  EN/AR messages added. **Tested the WhatsApp pipeline live** (simulated AR order → parsed دجاج×50/لحم×20,
  intent=order; fixed a boolean bug on `verified` + hardened the auto-reply with `continueOnFail`). Build
  green. **User action:** re-run `supabase/schema.sql` to add `order_status` (enables approve/reject
  persistence; the queue lists without it).

- **2026-06-23 — JARVIS now reasons (analyst, not parrot).** Rewrote the `/api/jarvis` system prompt: a
  senior ops/finance analyst that **thinks step by step** (does the math, connects figures, reasons about
  cause/risk/implication) and leads with a bottom line + why + recommendation; may compute/estimate (with
  stated assumptions) and must never dodge a hard question with "not in the data". Bumped temp 0.2→0.4,
  max_tokens 900, context cap 6k→14k. Enriched `buildContext`: actual gross profit + margin% + COGS +
  below-min/loss counts, collections, biggest debtors, client amounts owed, min-margin floors, and the
  procurement≠COGS note. Build green.

- **2026-06-23 — Supply intel tabs + recommendations + live notifications.** Reorganized
  `/supply-intelligence` into **3 tabs**: **Forecasts** (charts + per-card Sources list of every reference
  link), **Recommendations** (actionable per product — secure/order/hold/monitor + "order ~N weeks ahead"
  from lead time + real→forecast price + cited sources), **Crises & risks** (all risks flattened, sorted by
  severity, each with source link). New **`/api/notifications`** derives alerts from `supply_intel` (price
  ↑ + high/medium crises); **NotificationBell + notifications page now fetch them live** (bilingual, link to
  the page). Re-seeded (lead-time/pressure/history filled). Stored Azure/Outlook creds in `.env.local`.
  Build green.

- **2026-06-23 — Supply Intelligence "wow" dashboard (charts, per product×country, lead-time, pressure).**
  Rebuilt `/supply-intelligence` into a real analytics dashboard. New `components/supply/SupplyPriceChart.tsx`
  (Recharts ComposedChart): **real ~9-month purchase-cost history** (from `priceBaseline`) + a **forecast
  cone** (low–high projected from the outlook) — actual data anchored to a sourced forecast. Each
  product×country card now shows: flag + supplier, recommendation, a **stat strip** (price direction %,
  transport **lead time**, risk count), a **supply-pressure index** bar (0–100), the price chart, and
  cited drivers + cited risks. KPI row adds **avg lead time**. Added `lead_time_days` + `price_index` to
  the GPT schema/workflow/seed + a `supply_intel_history` append table (workflow + seed write a snapshot
  each run → future time-series). Explained to the user why **gross margin ≈ 2M is correct** despite
  sales≈procurement≈31M (procurement ≠ COGS; the gap is inventory/unmatched + VAT). Build green.
  - **User action:** re-run the updated `supabase/schema.sql` (idempotent — adds `lead_time_days`,
    `price_index`, `supply_intel_history`), then `node scripts/seed-supply-intel.js` to fill them.
  - **Next:** Outlook email-intake workflow (awaiting Azure client id/secret/tenant); price-jump alerts.

- **2026-06-23 — Supply intel LIVE (seeded) + Vision key + Gmail OAuth URL.** User ran `schema.sql`, so
  the tables exist. New `scripts/seed-supply-intel.js` runs the pipeline once locally (Google+Bing News +
  FX + gpt-4o-mini → Supabase) — **ran it, supply_intel now populated** (Brazil beef **+10%**, chicken
  **+5%**, others stable; each with dated, cited drivers + risks). Verified the stored row shape. The
  `/supply-intelligence` page now shows real forecasts (anchored to real purchase costs). Apify token
  validated (HTTP 201, actor runs) but `apidojo~tweet-scraper` returned `noResults` for these queries —
  workflow filters empties gracefully; X input needs tuning (didn't burn more free credit). Stored
  **`GOOGLE_VISION_API_KEY`** in `.env.local` for OCR (to wire into the Gmail/WhatsApp document intake
  next). Gave the user the **n8n Gmail OAuth redirect URI**:
  `https://hone21.app.n8n.cloud/rest/oauth2-credential/callback` (goes in Google Cloud Console →
  Credentials → OAuth client → Authorized redirect URIs).
  - **Refresh supply intel anytime:** `node scripts/seed-supply-intel.js` (or wait for the 12h cron).
  - **Next:** tune the Apify X actor input; wire Vision OCR into the WhatsApp/email intake (image+PDF →
    text → classify); build the Gmail email-intake workflow once OAuth is connected.

- **2026-06-23 — Apify scraping enabled (web + X) on the supply feed.** Added the Apify token to
  `.env.local` (validated: `/users/me` 200, **plan FREE = $5/mo credit**). Workflow gather now scrapes via
  Apify actors: `apify~rag-web-browser` (→ cited web articles) + `apidojo~tweet-scraper` (X). **TikTok +
  Instagram actors left blank by default to protect the $5 credit** (4 actors × 5 targets × 2/day would
  exhaust it in days) — set `APIFY_TIKTOK_ACTOR`/`APIFY_INSTAGRAM_ACTOR` to enable, ideally after upgrading
  Apify. Each actor is `this.helpers.httpRequest` → `run-sync-get-dataset-items`, wrapped in try/catch so a
  bad schema just yields empty. Redeployed (`Z7TPXWnlplp61VE7`). The Apify **MCP** server (`claude mcp add
  apify …`) must be run by the user in their own terminal — the workflow itself doesn't need it.

- **2026-06-23 — Supply intel upgraded: market price forecast vs real/historical cost + Apify scraping.**
  Turned the supply feed into a **price-forecast engine**. New `lib/data/priceBaseline.ts` derives each
  commodity's **real** cost baseline + monthly trend from `purchases.ts` (weighted avg per dominant unit).
  Rebuilt `n8n/supply-intelligence.json` gather step: multi-source **news RSS (Google+Bing) + FX
  (open.er-api.com) + X/LinkedIn via Apify actors** (one `this.helpers.httpRequest` Code node; Apify is
  **key-gated** — runs free until `APIFY_TOKEN` is set, then `run-sync-get-dataset-items` per actor).
  GPT now returns a **`price_outlook`** (direction, change_pct, low/high %, confidence, cited drivers)
  alongside risks; unsourced drivers/risks are dropped. Supabase `supply_intel` gains a `price_outlook`
  jsonb column (schema `add column if not exists`). The portal card now shows **"your last real cost →
  forecast range"** with a direction arrow + %, a **real historical-cost sparkline**, and cited drivers —
  the forecast is compared against MEC's actual purchase history. Deploy script injects missing/optional
  env as `""` so Cloud never hits a blocked `$env`. Workflow redeployed (`Z7TPXWnlplp61VE7`). Build green
  (34 routes).
  - **To enable X/LinkedIn scraping:** paste an **Apify token** into `.env.local` (`APIFY_TOKEN`, optional
    `APIFY_LINKEDIN_ACTOR`) → redeploy. Free RSS+FX path needs nothing. LinkedIn still discouraged (ToS).
  - **Next:** add the Apify token when provided; surface the FX rate on the card; alert when a high-severity
    risk or a >X% price jump appears (Supabase → notifications).

- **2026-06-23 — Portal Supply-Intelligence + WhatsApp inbox pages (live Supabase).** Built the two
  read-views for the new workflows. New `lib/data/supply.ts` (server-only Supabase reads via service-role,
  falls back to `[]` when tables/env are absent) + API routes `app/api/supply-intel` & `app/api/whatsapp`
  (`force-dynamic`). New pages: **`/supply-intelligence`** (per-supplier forecast + recommendation pill +
  cited risk cards — severity badge, type, summary, clickable **source · date** link; KPIs suppliers/
  risks/high-severity/last-updated) and **`/whatsapp`** (inbox of inbound messages — sender, intent badge,
  parsed products, verified tick, time). Both are client components that fetch the API at runtime so data
  is **always fresh** (the `[locale]` layout pins server pages to SSG, so `force-dynamic`/`headers()` were
  overridden — client-fetch is the robust fix and matches every other page). Added to the sidebar, full
  EN/AR messages, and (i) source definitions for each metric. Empty states explain the one setup step
  (run `supabase/schema.sql`). Build green (34 routes).
  - **Next:** matched WhatsApp orders → draft order in the approval queue; a Supabase-backed
    notifications feed; wire ERP sync when its API arrives.

- **2026-06-23 — Workflows deployed live + WhatsApp intake + `/report` engine.** Wired the live stack to
  n8n Cloud (`https://hone21.app.n8n.cloud`). `scripts/n8n-deploy.js` now **injects secrets from
  `.env.local` at push time** (n8n Cloud blocks `$env`) and is idempotent (update-by-name). **Deployed +
  activated two workflows:** Supply-Market Intelligence (`Z7TPXWnlplp61VE7`, every 12h) and **WhatsApp
  Intake via WaSender** (`NzuuId3FYrcqaAkb`, webhook `…/webhook/mec-wasender`) — new
  `n8n/whatsapp-intake.json`: WaSender webhook → verify+extract → GPT-mini intent/product classification →
  Supabase `whatsapp_intake` → auto-acknowledge reply. Supabase `schema.sql` made idempotent
  (drop-then-create policy) + added `whatsapp_intake` table. New **`/report` skill** + branded
  `scripts/jarvis-report.js` → JARVIS-themed HTML/PDF of every MEC workflow (internal/external, live state
  + last run), Supabase row counts, and Vercel/JARVIS status. Keys for OpenAI/n8n/Supabase/WaSender live in
  gitignored `.env.local` (validated: OpenAI 200, n8n 200, Supabase reachable). Build green.
  - **One click left for the user:** run `supabase/schema.sql` in the Supabase SQL editor so the workflows
    can store (tables currently 404). Optional: add `VERCEL_TOKEN` for live deploy insights in `/report`.
  - **Next:** build the portal **Supply Intelligence** page (reads Supabase `supply_intel`) + a WhatsApp
    intake inbox view; wire the live ERP when its API arrives (`/erp-sync deploy erp-scheduled-sync`).

- **2026-06-23 — Scheduled ERP sync + Supply-Market Intelligence (n8n + OpenAI + Supabase).** Added the
  data-fetch/automation layer: new **`/erp-sync` skill** (`.claude/skills/erp-sync/`) that generates a
  timed fetch workflow (Schedule → fetch → normalise → Supabase) and deploys it to n8n via the public
  API. Two importable **n8n workflows** in `n8n/`: **`erp-scheduled-sync.json`** (internal, every 6h —
  pull ERP → `sales` table) and **`supply-intelligence.json`** (external, every 12h — gather real
  Google-News/advisory RSS signals per supplier+country → gpt-4o-mini synthesis → **drop any unsourced
  claim** → `supply_intel` table; every risk carries source+date+link). `scripts/n8n-deploy.js` (no deps)
  pushes+activates a workflow from `.env.local`. `supabase/schema.sql` defines both tables. Automations
  registry now carries **`kind: internal | external`** and the page groups them; 2 new entries added.
  Full design + **tool/cost breakdown** in **`SUPPLY_INTEL.md`** (realistic ~$3–20/mo; RSS-only path
  <$3/mo). Keys (OpenAI, n8n JWT, Supabase) stored in **gitignored `.env.local`** only; `.env.example`
  documents the new vars. Build green (28 routes).
  - **Blocked on user:** n8n instance base URL (`N8N_API_BASE_URL`) + ERP connection method to actually
    deploy+run; supplier/country list confirmation; RSS-vs-Tavily search-tier choice.
  - **Next:** when the n8n URL + ERP access arrive, run `node scripts/n8n-deploy.js …`, then build the
    portal **Supply Intelligence** page reading Supabase `supply_intel`.

- **2026-06-23 — Number reconciliation (no contradictions) + per-product gross profit.** Fixed
  contradicting figures flagged in review: revenue/receivables/clients now use **one canonical value
  everywhere** (Control Center = Analytics = CRM). **Every sale is attributed to a client** (ERP +
  sales-only rows incl. "Cash / unspecified") so CRM totals reconcile exactly: Revenue **31,084,511** =
  Collected **6,024,714** + Receivables **25,059,797** (verified). Removed the misleading "revenue −
  procurement" gross-profit estimate. Added **actual per-product gross profit** (`productMargins`):
  each product's sell price vs its **matched purchase cost per carton** (Jaccard name match, 105/120
  priced), pre-VAT, with **minimum-margin floors** (meat 3% · chicken 5% · vegetables 6% · potatoes 10%)
  → flags below-min and loss-making products. New **ProfitDiagram** (per-product cost/profit bars +
  floor marker) on the Margin tab. Total gross profit ≈ SAR 1.99M (8.3% on priced products). Build green.

- **2026-06-23 — Data correctness, clarity (info+source icons), no-mock, comma numbers, polish.**
  Fixed issues found in the live review: (1) removed **SAR 32.3M of spreadsheet subtotal/total rows**
  from import → revenue corrects to **SAR 31,084,511**; (2) eliminated the **"Other"** category by
  expanding `lib/data/categorize.ts` (beef cuts/lamb/dairy) — **0 items uncategorised**; (3) labelled
  blank clients as "Cash / unspecified" and dropped returns/`عام` from the salesperson breakdown;
  (4) **comma number formatting everywhere** (`fmtSAR` → `SAR 31,084,511`, full numbers), chart tooltips
  labelled + comma-formatted, Y-axis no longer clipped (`fmtSARcompact` ticks + width); (5) donut legend
  commas + centred layout. **Erased all fabricated mock data** (`lib/mock/data.ts` now returns empty/
  `planned`) — Departments/modules/Total-Savings/Control-Center show **requirements + empty states**, not
  fake numbers (real Analytics/Orders/Clients unchanged). Added **(i) InfoTooltip** with a **definition +
  SOURCE reference** on every metric (`lib/info/definitions.ts`) and every workflow node; new
  `EmptyState`, `NoteCallout`. Visual polish: gradient utilities in `globals.css` (highlight cards,
  heroes, accent note callouts). Build green (28 routes). Regenerate data: `node DATA/_salesgen.js`.

- **2026-06-23 — Analytics suite + action platform + JARVIS.** Imported 3 quarterly workbooks
  (`DATA/مبيعات*.xlsx`) via self-contained `DATA/_salesgen.js` → `lib/data/sales.ts` (927 invoices,
  SAR 64.5M) + `lib/data/purchases.ts` (193 lines, SAR 31.3M); `lib/data/categorize.ts` for Arabic
  product categories. Extended `lib/data/dataset.ts` with real aggregates and a **sales→CRM join** —
  client revenue/risk and the Orders page are now **real** (synthetic order generator retired).
  Built **/analytics** (Power-BI style: Overview/Sales/Procurement/Margin/Collections/Products, shared
  slicer bar, LineChartPanel), **report export** (`ExportBar`: print-to-PDF + CSV + Excel, print CSS),
  **/automations** hub (10 n8n workflows, Run → configurable webhooks), and **JARVIS** (`lib/jarvis/
  engine.ts` data-engine + `components/JarvisPanel.tsx` + `app/api/jarvis/route.ts` OpenAI/ChatGPT,
  activates on `OPENAI_API_KEY`). Build green (analytics/automations/api routes); all routes 200; API
  returns 503→data-engine fallback without a key. See `.env.example` + `DATA.md`.
  - **Data caveats:** supplier payables & warehouse dwell-time were blank in the source (dropped from
    Procurement); ~19% of items fall in an "Other" category (categorizer can be extended); ~71% of
    sales client names matched the CRM (unmatched still appear in Sales analytics by name).
  - **Next:** when n8n webhooks/`OPENAI_API_KEY` are provided, paste into Vercel env to go live; extend
    the Arabic product categoriser to shrink "Other"; import new monthly sheets via `_salesgen.js`.

- **2026-06-22 — Real client data + inbox + visual upgrade.** Imported **112 real MEC clients** from
  `DATA/بيانات العملاء.xlsx` → `lib/data/clients.ts` (regen via `node DATA/_gen.js`). Added a
  **dataset layer** (`lib/data/dataset.ts`: clients, SKUs, deterministic orders/payments + aggregates),
  two new pages **Orders** and **Clients (CRM)** with search/filter, tables and charts, an inbox
  **NotificationBell** dropdown in the TopBar (unread badge), and new visual components (Sparkline,
  BarChartPanel, DonutStat, StatusBadge, StatCard). Enriched the Control Center with real business
  KPIs + orders-by-status + top-clients. Wrote **`DATA.md`** intake contract. Build green (23 routes).
  - **Note:** client revenue/risk/orders/city are deterministic placeholders until a real orders/sales
    export arrives — see `DATA.md`. Sending orders data makes them real automatically.
  - **Next:** import an orders/SKU sheet when provided; then Phase 2 (Documents & Intake).

- **2026-06-22 — Hotfix: added `middleware.ts`.** The next-intl scaffold was missing the required
  root `middleware.ts`, so `/` returned a 404 (no route matched — only `/en` and `/ar` existed).
  Added it; `/` now redirects to a locale and all routes return 200. Build green. Pushed.
  - **Note for future runs:** `middleware.ts` is mandatory for next-intl locale routing — never delete it.

- **2026-06-22 — Phase 1 complete + shipped.** Built the full bilingual portal: config, engine,
  i18n, all components, all pages, MEC catalog (7 departments × 4 modules), savings module, EN/AR
  messages. `git init` → committed → pushed to `origin/main`
  (`https://github.com/ehan11111-code/mec.git`). Status: deterministic-mock demo of the whole surface,
  live on GitHub.
  - **Build:** `npm run build` passes with **zero type errors / zero warnings** (19 routes generated).
  - **Next:** connect the GitHub repo to Vercel (one-time, in vercel.com — no env vars needed), then
    begin **Phase 2 (Documents & Intake)** — start with the extracted-data review screen for the
    `documents` department. Run `/mec-build` to advance.
