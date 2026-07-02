# MEC Operations Portal — Full Audit & Development Roadmap

> **Status:** planning document (report-first round). No production code changed by this report.
> **Author:** Jarvis AI Agency · **Date:** 2026-07-02 · **Scope:** the whole portal.
> **Purpose:** take the portal from a polished demo to a professional, global-grade, high-accuracy,
> high-reliability client portal — and design the **end-to-end Order-to-Cash (O2C) operational system**
> that makes the portal MEC's system of record and lets MEC leave WhatsApp groups gradually.
>
> Every claim below is tied to a concrete file/function so it can be checked. Every recommendation is
> phased and testable. This report is the **contract** for the build; each phase (A–F, §8) is a later
> `/mec-build` run.

---

## 0. Executive summary

**Where the portal is today.** A genuinely strong bilingual (EN/AR) demo with a *real* live-intake spine:
WhatsApp → n8n → Supabase `whatsapp_intake` → an out-of-band worker (decrypt/OCR/classify) →
`reprocess`/`understand` → the portal. Credit and inventory statements are read from real PDFs; orders,
approvals and documents are live. The analytics/CRM/forecast surface is real data from imported
spreadsheets. It looks and feels professional.

**Where it is fragile.** Three structural weaknesses hold it back from "global-grade":

1. **The data layer is a single 3,400-line hub (`lib/data/dataset.ts`) that everything imports**, with the
   same logic (product matching, client-name resolution, receivables attribution, margin floors)
   re-implemented in 2–3 places. A number can be right on one page and wrong on another because it is
   computed more than once. This is the direct cause of the kind of drift the documents bug shows.
2. **Data enters only through WhatsApp.** There is no in-portal way to *create* an order, PO, or invoice.
   WhatsApp is lossy and ambiguous (free text, CDN throttling, misclassification), which is the deepest
   root cause behind the documents mismatch and the accuracy complaints.
3. **JARVIS can't actually see the data.** It answers from a static ~14k-character text brief with one
   `gpt-4o` call and **no tools, no live data, no memory** — so it cannot answer a specific question
   ("what does client X owe, and which invoice is overdue?") accurately.

**Target end-state.** The portal becomes MEC's **Order-to-Cash system of record** — salesman order → PO on
the company template → margin-gated approval → ZATCA-compliant invoice → warehouse/dispatch → logistics →
analytics → ROP/expiry → cashflow — with **JARVIS as the brain** (a tool-using agent over one integrated
data layer), and WhatsApp demoted to a transitional feeder.

**The seven asks, and where each is answered in this report:**

| # | Ask | Section | One-line verdict |
|---|-----|---------|------------------|
| 1 | Invoice/delivery-note misalignment | §1 | **Fragile** — a real bug; fix is small and precise. |
| 2 | Refactor into linked single-source modules | §2 | **Highest-leverage** — do this first; everything else rides on it. |
| 3 | Reorganize scattered pages into 4 sections | §3 | **Solid to do** — mechanical, low-risk, high polish gain. |
| 4 | Make JARVIS actually intelligent | §5 | **Fragile today** — needs tools + live data, not a bigger prompt. |
| 5 | Interactive CRM per client | §4 | **Good bones** — components exist; needs a hub redesign. |
| 6 | End-to-end O2C system (+ leave WhatsApp) | §6 | **The centerpiece** — net-new; largest build; sub-phased D1–D5. |
| 7 | Full audit + reliability to global-grade | §7 | **This document** + a hardening phase (F). |

**Recommended order (see §8):** **A** Foundation (bug fix + module refactor + page reorg) → **B** CRM →
**C** JARVIS agent → **D** O2C spine (D1–D5) → **E** off-WhatsApp dual-run → **F** reliability hardening.

---

## 1. The documents bug — root cause & fix

### What the user sees
On the documentation pages, an invoice shows a **different client or different products** than the delivery
note for the "same" order. The data is simply wrong.

### Root cause (confirmed in code)
Two endpoints describe the *same* documents in **two contradictory ways**, and one of them overwrites the
document's real data:

- **`app/api/documents/route.ts`** (the order → documents checklist). It filters orders and documents from
  `whatsapp_intake`, then attaches each document to an order. When a document has **no `order_no`** it falls
  back to *"the most recent order at/before the document's timestamp, preferring the same group"*
  (`route.ts:39-44`). It then builds each row using the **order's** `client_name` and `products`
  (`route.ts:61-67`) — **the document's own `client_name`/`products` are discarded.** So if Client A ordered
  at 14:00 and Client B ordered at 14:30, an invoice with no order number arriving at 15:00 is stamped as
  **Client B's** — wrong client, wrong products.

- **`app/api/wa-docs/route.ts`** (the Invoices / Payments / Delivery-notes registries via
  `components/DocList.tsx`). It returns each document's **own** `client_name` and `order_no`
  (`wa-docs/route.ts:49-60`) with **no order matching at all.**

Because the checklist shows the *order's* fields and the registries show the *document's* fields, the two
views disagree for the very same file — exactly the "invoice ≠ delivery note" symptom.

### The deeper cause
A WhatsApp document's `client_name`/`products` are themselves only as good as the OCR/vision extraction,
and there is **no order number on the document to bind it reliably**. Temporal "nearest order" matching is a
guess. This ambiguity disappears once documents are *created in the portal against a real order* (§6).

### Fix design (Phase A)
1. **A document always shows its own extracted data.** In `app/api/documents/route.ts`, stop substituting
   the order's `client_name`/`products`. Keep the document's own fields for display.
2. **Link, never overwrite.** A document links to an order by `order_no` when present; otherwise by a
   **validated** best-match that must *share the client or at least one product* (reuse the one matcher from
   `lib/data/core/match.ts`, §2). If nothing validates, the document is **"unlinked"** — shown honestly, not
   forced onto a random order.
3. **Surface mismatches, don't hide them.** When a linked document's client/products disagree with the
   order, render a **mismatch flag** ("invoice client ≠ order client") so wrong data is visible and
   correctable, not silently displayed as truth.
4. **One matcher, two views agree.** Have `/api/documents` (checklist) and `/api/wa-docs` (registries) both
   use the same link/validate function, so the two pages can never contradict each other again.

**Verification:** on the documents pages, each invoice/delivery-note shows its own client + products; a
deliberately mismatched pair shows the mismatch flag; the checklist and the registry agree for every file.

---

## 2. Single-source-of-truth data architecture (the refactor)

### The problem, precisely
`lib/data/dataset.ts` is ~3,400 lines and is imported by nearly every page and API. Worse, the *same*
computation lives in several places:

| Logic | Duplicated in | Risk |
|-------|---------------|------|
| Token-Jaccard product matching (`tokens`/`jaccard`) | `dataset.ts`, `inventory-count.ts`, `reconcile-credit.ts` | 3 implementations drift apart |
| Client-name resolution (exact → contains → tokens) | `dataset.ts` (enrichClients), `reconcile-credit.ts` | same client resolves differently on different pages |
| Receivables attribution / "outstanding = statement" | `dataset.ts` (`creditForFilter`), `reconcile-credit.ts`, `control-center` | three ways to compute one number |
| Min-margin floors (meat 3% / chicken 5% / veg 6% / potatoes 10%) | `dataset.ts` (`minMarginFor`), `concerns.ts` | policy change must be synced by hand |

This is why "one number doesn't move everywhere": it is *calculated* in more than one place.

### The principle
**One module owns each domain. Pages and APIs import only that module. Each number is computed in exactly
one place.** Change the number once → every page that reads it moves together.

### Proposed modules (behavior-preserving)
Keep `dataset.ts` as a **slim re-export shim** during migration so nothing breaks (the `.claude/skills/refactor`
method): move a domain's logic into its module, have `dataset.ts` re-export it, verify green, repeat.

| Module | Owns | Replaces (moved out of `dataset.ts` / others) |
|--------|------|-----------------------------------------------|
| `lib/data/core/match.ts` | the **one** `tokens`/`jaccard`/`normalizeName`/`bestMatch` | 3 duplicate matchers |
| `lib/data/clients.module.ts` | client enrichment, risk, credit assignment, `getClientDetail` | `enrichClients`, `getClientStats`, `getClientDetail` |
| `lib/data/receivables.module.ts` | credit statement + confirmed adjustments + `creditForFilter` (one outstanding formula, one attribution rule) | credit logic in `dataset.ts` + `reconcile-credit.ts` |
| `lib/data/inventory.module.ts` | ledger + count + on-hand/expiry/ROP/reconciliation | `getInventory`, `warehouseStock`, `warehouseForProduct` |
| `lib/data/products.module.ts` | margins, cost match, warehouse match, product detail, **per-product target margin** (§6) | `productMargins`, `getProductDetail`, `minMarginFor` |
| `lib/data/sales.module.ts` | `SalesFilter` + all sales aggregations | `salesSummary`, `salesByMonth`, `salesBy*` |
| `lib/data/orders.module.ts` | **new** live O2C orders (portal-originated) | net-new |
| `lib/data/cashflow.module.ts` | **new** inflows/outflows, projected cash | net-new |
| `lib/data/forecast.module.ts` | keep `forecast.ts` methods, fed by the above | `forecast.ts` |

### Live-vs-static policy (stated once, per entity)
The two data layers (live Supabase intake vs static imported spreadsheets) must have an **explicit,
documented owner per number** so nobody re-derives it:

- **Receivables** = latest credit statement − confirmed adjustments (live overlay on static statement).
- **Inventory ledger** = static import is the truth; live **count** reconciles against it; **dispatch**
  (§6) deducts on-hand going forward.
- **Sales/revenue** = imported spreadsheets are the historical truth; **live O2C orders** overlay on top
  (already the pattern for the orders feed).
- **Products/margins** = derived once in `products.module.ts`.

**Verification:** `dataset.ts` shrinks to a shim; each module is imported directly by its pages; a grep
shows `tokens(`/`jaccard(` defined **once**; the build stays green after each module extraction; a small
reconciliation test asserts revenue = collected + outstanding and Σ(client revenue) = total.

---

## 3. Page reorganization (the 4 consolidated sections)

### Today (from `components/SidebarNav.tsx`)
Related pages are scattered: **Credit** sits under *Sales* (L38), **Documents** under *Intelligence* (L46),
**Inventory** under *Overview* (L31); there is **no Suppliers/Procurement** section; and `/jarvis` is listed
**twice** (L41 and L58).

### Proposed sidebar (permission-gated exactly as today)

| Section | Pages | Notes |
|---------|-------|-------|
| **Overview** | Control Center, Operations, **JARVIS cockpit** | keep top-level |
| **Sales** | **New Order** (O2C entry, §6), Orders, Approvals, Clients (CRM), Products | Credit *leaves* Sales |
| **Warehousing & Logistics** | Inventory, On-hand/Proof, Dispatch/Delivery-notes, Logistics status, ROP/Expiry | Inventory *leaves* Overview |
| **Suppliers & Procurement** | Procurement/Purchases, Supplier spend, Supply Intelligence, Supply/price Forecast | **new section** |
| **Financials, Cashflows & Credit** | **Cashflow** (new), Credit, Reconciliation, Invoices, Payments, Collections | Credit + Documents land here |
| **Intelligence** | Analytics, Demand Forecast, WhatsApp inbox | analytics stays |
| **Admin / Help** | Automations, Data console, Admin, Academy, Contact | dedupe the second `/jarvis` |

### Migration notes
- **Dedupe `/jarvis`** — keep one entry (Overview); drop the duplicate in `secAdmin` (perm stays gated).
- **Keep old URLs working** — the pages don't move on disk; only their *sidebar grouping* changes, so no
  redirects are strictly required, but any renamed route gets a redirect stub.
- **Document registries move** from Intelligence into Financials (they are financial documents).

**Verification:** every page appears under exactly one section; each of the 4 requested groupings exists;
no permission regressions (a `sales` user sees Sales, a `warehouse` user sees Warehousing, etc.); no
duplicate items.

---

## 4. CRM redesign — an interactive per-client hub

### Today
- `app/[locale]/clients/page.tsx` — a filterable **table** directory + KPIs + top-6 list.
- `app/[locale]/clients/[id]/page.tsx` — KPIs, an indicative credit line, profile, a monthly trend, a
  category donut, a products table, and a 60-row invoice **table**. It's informative but static — nothing is
  openable, there's no active/inactive signal, and risk is a bare number.

### Target (built on components that already exist)
Reuse `Panel`, `StatCard`, `Money`, `DocList`, `NoteCallout`, `BreakdownModal`, `DonutStat`,
`LineChartPanel`, `ClientLink`, `InfoTooltip`.

A per-client **hub**:
- **Header** — name, city, salesperson, an **Active / Inactive badge derived from last-order date**
  (e.g. no order in 60 days → "Dormant", 90 → "Inactive"), and a **risk breakdown** on click (why the score
  is what it is: overdue ÷ revenue, aging, concentration) via `BreakdownModal`.
- **KPI tiles** — revenue, collected %, outstanding, orders, units, avg invoice, first/last order.
- **Expandable, openable sections** (each opens the real file via `/api/wa-file`):
  - **Orders** — the client's orders with status + margin.
  - **Invoices** — openable, with paid/overdue state (reuse `DocList`).
  - **Delivery notes** — openable, with received/unconfirmed.
  - **Payments** — openable receipts/transfers.
  - **Products bought** — searchable, click-through to the product page.
  - **Credit line** — limit / used / available + utilization, from `receivables.module.ts`.
- **Directory** — keep the table, add an optional **card grid** (one card per client: KPIs, last-order,
  active/inactive, quick "open profile").

Every widget reads `clients.module.ts` (§2), so the CRM and the rest of the portal never disagree.

**Verification:** open any client → see their real orders/invoices/delivery-notes/payments, each openable;
the active/inactive badge matches the last-order date; risk breakdown explains the score.

---

## 5. Smarter JARVIS — a tool-using agent (not a bigger prompt)

### Why it's "not intelligent" today (confirmed in code)
- `lib/jarvis/engine.ts` is a **regex pattern matcher** over precomputed aggregates + a `buildContext()`
  that emits a **12-line static brief**.
- `app/api/jarvis/route.ts` makes **one `gpt-4o` call**, `temperature 0.4`, `max_tokens 900`, context
  **sliced to 14,000 chars**, **no tools, no live data, no message awareness, no conversation memory**.

So it literally cannot fetch "client X's overdue invoice" or run a calculation on demand — it only has the
blob it was handed.

### Target — an agent with tools over the integrated data layer
An OpenAI **function-calling loop**. JARVIS decides which tool(s) to call, reads the result, and reasons
across turns. Tools read the new single-source modules and the live intake:

| Tool | Reads | Returns |
|------|-------|---------|
| `getClient(name\|id)` | `clients.module.ts` | profile, orders, invoices, credit, risk |
| `getReceivables(filter)` | `receivables.module.ts` | statement, aging, per-client outstanding |
| `getInventoryOnHand(product?)` | `inventory.module.ts` | on-hand, expiry, ROP, reconciliation |
| `getOrders(filter)` | `orders.module.ts` | live O2C orders + status |
| `findDocuments(client\|order)` | documents matcher (§1) | invoices/delivery-notes/payments (openable) |
| `runReport(spec)` | `lib/report/builders.ts` | a permission-scoped report (JARVIS can now *print* one) |
| `searchMessages(query)` | `whatsapp_intake.understanding` | what JARVIS understood of each message |
| *(Phase D)* `checkMargin`, `createOrderDraft` | `products`/`orders` modules | margin math, a draft order |

**Guardrails:** tools are **permission-scoped** (a `sales` user's JARVIS can't read finance); **multi-turn
memory** for follow-ups; larger token budget; and a **graceful fallback** to today's local engine when
`OPENAI_API_KEY` is absent (so the demo never breaks). Reuses the existing OpenAI patterns (JSON mode,
gpt-4o) already used by `reprocess`/`worker`.

**Accuracy evaluation:** a fixed question set with **known answers** (e.g. "top debtor?", "on-hand of بوبي
فيل?", "which of client X's invoices is overdue?") run before/after, so "intelligent" is measured, not
claimed.

---

## 6. End-to-end Order-to-Cash (O2C) operational system — the spine

This is the centerpiece and the largest build. It turns the portal into MEC's operational system of record.
Every stage below is a portal capability with its own data model, UI, role, and guardrail. **Confirmed
decisions:** ZATCA invoice is **demo-grade now with a pluggable provider adapter** (go live later);
approval is a **target-margin + hard-floor** gate.

### The lifecycle

**1) Order entry (salesman).**
A guided in-portal form: pick client, pick products (each row shows **live price, target margin, and current
on-hand**), enter quantities. Creates `orders` + `order_lines` rows. This is the moment MEC stops needing
WhatsApp to place an order.

**2) PO on the company template.**
There is **no PO template yet** — I'll design one from MEC's **invoice branding/styling** (extracted from
`PO AND DOCS TEMPLATES/فاتورة شركة فخر الاطعمة رقم 409.pdf`). It's routed to the **commercial manager**
(the person-in-charge) and saved against the order. **Every JARVIS-generated document carries a
"JARVIS powered" footer with the JARVIS logo** (invoice, PO, delivery note — all of them).

**3) Margin gate (target + hard floor).**
The **sell price comes from the salesman, per order** — that's the moment the gate accepts or rejects the
price. **Cost comes from the procurement sheets/team** (they record what each product was bought for). The
**target margin defaults to the existing category floor** (meat 3% / chicken 5% / veg 6% / potatoes 10%,
from `minMarginFor`); **both the commercial and finance managers** can raise a per-product target above the
floor (role-gated — never the salesman). The floor stays absolute. On submit, per line:

| Condition | Outcome |
|-----------|---------|
| margin **≥ target** AND stock available | **Auto-approve** → trigger auto-invoice (stage 4) |
| margin **< target** but **≥ floor** | **Warn the salesman** ("below target X%, are you sure?") → on confirm, enter the **human-approval queue** |
| margin **< floor** | **Human-only** — never auto-sent, even if confirmed |

Every decision is **audit-logged and explainable** (show the margin math: sell − cost, %, vs target, vs
floor). *This revises the old "never auto-approve orders" guardrail into a margin-gated, logged,
explainable auto-approval — recorded in `CLAUDE.md` §5.*

**4) ZATCA-compliant invoice (demo-grade now, real link later).**
On approval, auto-generate the invoice with the fields ZATCA Phase 2 requires — **UBL 2.1** structure,
seller/buyer VAT numbers, line items, 15% VAT, UUID/hash placeholders, and the **ZATCA QR code** (TLV:
seller name, VAT number, timestamp, invoice total, VAT total → base64) — rendered on the company template.
**MEC's real invoice already carries this** (the #409 template has a top-left "E-invoicing service" QR + an
"External Link" QR), so I replicate that exact layout — including the seller identity extracted from it:
**شركة طاهي الشرق الأوسط (Middle East Chef)**, VAT **314172890300003**, CR **7051245491**, Jeddah 23436,
Al-Salama 6715, Sari sub-street 4186, phone 0533194000. Buyer block (name, VAT, CR, address, client no.,
city) comes from the client record. A **pluggable `lib/invoicing/provider.ts`** interface with a
`StubProvider` today and a real adapter later. **The ZATCA API key stays blank for now (MEC will provide
it later)** — going live = drop in the key + one adapter, no rework of the flow.

> **Compliance reality:** MEC's ~SAR 31M turnover puts it well past the ZATCA Phase 2 threshold, so *real*
> issuance legally requires cleared e-invoices (real-time **clearance** for B2B, **reporting** for B2C)
> through an accredited path. Candidate providers (all with APIs + Fatoora integration): **Wafeq**,
> **Mezan**, **Zoho Books KSA**, **Qoyod**. The stub lets us demo the full flow now; the adapter makes it
> legal when credentials exist.

**5) Warehouse & dispatch.**
On approval/invoice, create a **dispatch/picking** record, **deduct live on-hand** (JARVIS Count /
`inventory.module.ts`), and generate a **delivery note** — using MEC's real page-2 layout: same branding,
**no prices**, item/unit/qty, and signature lines for **السائق (driver) / أمين المخزن (warehouse keeper) /
المراجع (reviewer)**. The order form captures the **delivery address** and the **driver** (name + ID + car
plate number — optional — *or* attach the driver's ID card). Warehouse is a **third-party** MEC rents
6,000-carton space from (note: the "carton" unit can mean a count or a weight — 10 kg / 18 kg / other — to
be pinned down per SKU later). **Notifies the logistics manager, Abdullah** (role routing + in-portal
notification; WhatsApp/email during the dual-run).

**6) Logistics.**
Dispatch/driver status, **client delivery confirmation** via the **تم الاستلام / received** stamp-signature
(reuse the existing `received` proof concept; e-sign later), delivery-note proof stored against the order.

**7) Analytics loop.**
The live order feeds `sales.module.ts` + `orders.module.ts` → **graphs per salesman, per client, orders,
revenue, and realized margin** on the reorganized Sales/Analytics pages — now driven by live O2C data, not
only imported sheets.

**8) ROP + expiry.**
Dispatch deductions feed **reorder-point** and **expiry (R/Y/G)** planning in `inventory.module.ts`, closing
the replenishment loop the user asked for.

**9) Cashflow.**
Invoice (receivable) + payment (collection) feed a new **Cashflow** view under Financials — inflows/outflows,
receivables aging, projected cash — tying to `receivables.module.ts` + `cashflow.module.ts`.

### Leaving WhatsApp (gradual dual-run)
Because orders/documents now originate **in the portal**, WhatsApp intake becomes a **transitional feeder**:
existing WhatsApp orders normalize into the *same* O2C pipeline (reuse `reprocess`/`understand` + the
`worker` OCR). Plus an in-portal **document upload** (`POST /api/intake/upload` → an `employee-docs` Storage
bucket + an `employee_intake` table that mirrors `whatsapp_intake`, so JARVIS queries **one** path).

**Rollout (4 stages), with what's needed from staff and how we measure it:**

| Stage | What happens | What staff do | Success metric |
|-------|--------------|---------------|----------------|
| 1. Parallel | Portal + WhatsApp both live | Salesmen try the New Order form for a few orders/day | ≥1 portal order/salesman/day |
| 2. One team primary | One team places all orders in the portal | That team stops posting orders in the group | 100% of that team's orders in portal |
| 3. All teams | Every team on the portal; WhatsApp = documents only | All salesmen use the form; docs uploaded in-portal | <5% orders still via WhatsApp |
| 4. Read-only / off | WhatsApp intake read-only, then off | Everyone in the portal | 0 orders via WhatsApp for 2 weeks |

**Tools/platforms:** Supabase (DB + Storage), the existing worker (OCR/vision), Google Vision, n8n
(feeder during transition), a ZATCA provider (later), optional e-sign for delivery receipts.

**Onboarding:** **all staff become portal users — especially every salesman** (each salesman gets an
account; orders they place carry them as the salesperson, exactly as the invoice's `المندوب` field works
today).

### Confirmed inputs (2026-07-02) — the rules the O2C build follows
- **Margins:** target defaults to the existing category floors; commercial **and** finance can raise a
  per-product target above the floor; salesmen cannot.
- **Sell price:** entered by the salesman per order (the gate checks it). **Cost:** from procurement.
- **Approver / person-in-charge:** the **commercial manager**. **Logistics manager:** **Abdullah**.
  **Warehouse:** third-party rented 6,000-carton space (unit definition — count vs kg — TBD per SKU).
- **Credit terms:** default **~7 days**, or a **down/full payment**; **exceptions up to ~2 weeks require
  both the commercial and finance managers' approval** (ties to the same exception-approval flow as the
  margin gate). Feeds Cashflow (§6.9) and the CRM credit line (§4).
- **Client active/inactive:** a client with **no order in ~3 months** is flagged **Inactive** (used on the
  CRM header, §4).
- **Documents:** invoice = the #409 layout (with the existing ZATCA QRs); delivery note = the page-2 layout
  (no prices; driver/warehouse-keeper/reviewer + client `تم الاستلام`); PO = new, built from the invoice
  branding. **All three carry the "JARVIS powered" + logo footer.**
- **Still pending from MEC (non-blocking; demo works without):** the ZATCA API key (kept blank for now),
  and the exact warehouse "carton" unit definition.

---

## 7. Portal-wide reliability & accuracy audit (global-grade checklist)

Concrete gaps to close so the portal is "flawless with minimal errors." Each is severity-tagged and mapped
to a phase.

| # | Finding | Evidence | Fix | Phase |
|---|---------|----------|-----|-------|
| R1 | Numbers computed in multiple places can drift | §2 duplication table | single-source modules | A |
| R2 | No automated tests / CI gate; the only gate is a manual green build | `CLAUDE.md` §4 | add a light test suite + a reconciliation test + CI on push | F |
| R3 | Documents checklist vs registries disagree | §1 | one matcher, own-data display | A |
| R4 | JARVIS can't verify its own answers | §5 | tool-agent + eval set | C |
| R5 | Error monitoring exists but is thin | `error_log` + `app/[locale]/error.tsx` | extend coverage + a health surface | F |
| R6 | EN/AR parity is maintained by hand | `messages/en.json` + `ar.json` | a parity-check script in CI | F |
| R7 | `dataset.ts` loads a lot on every page | 3,400-line hub | modules + server components where possible | A/F |
| R8 | Auto-approval reverses a stated guardrail | `CLAUDE.md` §5 | margin gate + audit log + explainability | D1 |
| R9 | Loading/empty/error states are uneven | mixed across pages | standardize on `EmptyState`/skeletons | B/F |
| R10 | Audit-logging is partial | scattered | one audit table for O2C decisions + edits | D |
| R11 | Accessibility not yet reviewed | — | keyboard/contrast/RTL pass | F |
| R12 | Security: keys, RLS, session hardening review | `lib/auth/*`, RLS notes | periodic review; keep secrets server-side | F |

**Invariants to enforce (with tests):** revenue = collected + outstanding; Σ(client revenue) = total sales;
on-hand reconciles (net in − out, excluding flagged SKUs); every headline = the sum of its parts.

---

## 8. Phased build roadmap

Each phase is a later `/mec-build` run: build-green-first → do the phase → re-build → update the ledger →
commit + push → verify live.

- **Phase A — Foundation (highest leverage).** Documents-bug fix (§1) + `core/match.ts` + begin the
  single-source modules behavior-preservingly (§2) + reorganize the sidebar into the 4 sections (§3).
  *Ships when:* documents pages agree and show own-data; `tokens/jaccard` defined once; the 4 sections
  exist; build green.
- **Phase B — CRM redesign** on `clients.module.ts` (§4).
- **Phase C — JARVIS tool-agent** with the eval set (§5).
- **Phase D — O2C spine** (§6), sub-phased:
  - **D1** Order entry + PO template + per-product target margins + margin gate (auto-approve/warn/queue) + audit log.
  - **D2** ZATCA-shaped invoice generator + QR + pluggable provider stub.
  - **D3** Warehouse/dispatch + delivery note + on-hand deduction + logistics routing/notification.
  - **D4** Analytics wired to live O2C orders (per salesman/client) + ROP/expiry loop.
  - **D5** Cashflow page + receivables/payment integration.
- **Phase E — Off-WhatsApp dual-run.** In-portal upload + `employee_intake`, WhatsApp-as-feeder
  normalization, the 4-stage rollout, staff enablement.
- **Phase F — Reliability hardening.** Tests/CI, monitoring, i18n parity tooling, accessibility, security.

---

## 9. Requirements — status (confirmed 2026-07-02)

All the requirements I asked for have been answered. Nothing blocks Phase A; the O2C phases (D/E) now have
everything they need except two non-blocking items.

| # | Requirement | Status |
|---|-------------|--------|
| Margins | Target defaults to category floor; commercial **+** finance raise per-product targets | ✅ |
| Sell price / cost | Price from salesman per order; cost from procurement | ✅ |
| Approver | Commercial manager | ✅ |
| Logistics owner | Abdullah | ✅ |
| Warehouse | Third-party, 6,000-carton rented space | ✅ (unit def. TBD) |
| Credit terms | ~7 days / down payment / up to ~2 weeks by commercial+finance exception | ✅ |
| Active/Inactive | No order in ~3 months → Inactive | ✅ |
| Seller identity | Extracted from invoice #409 (name, VAT, CR, address, phone) | ✅ |
| Invoice template | #409 layout + existing ZATCA QRs | ✅ |
| Delivery-note template | Page-2 layout (no prices; driver/keeper/reviewer + `تم الاستلام`) | ✅ |
| PO template | None yet → I build one from the invoice branding | ✅ |
| Document branding | Every JARVIS document gets a "JARVIS powered" + logo footer | ✅ |
| Order form | Captures delivery address + driver (name/ID/plate optional, or ID-card attach) | ✅ |
| Onboarding | All staff — especially every salesman — become users | ✅ |
| **ZATCA API key** | **Pending — MEC will provide later; kept blank (stub works meanwhile)** | ⏳ |
| **Warehouse unit** | **Pending — "carton" = count or kg (10/18/…)? pin down per SKU later** | ⏳ |

**Assets in the repo:** `PO AND DOCS TEMPLATES/فاتورة شركة فخر الاطعمة رقم 409.pdf` (invoice + delivery-note
templates + seller identity). Still to obtain: the **JARVIS logo asset** for the document footer (if not
already in `components/BrandLogo`), and eventually the ZATCA API key.

---

*This report supersedes the previous plan file. It is the contract for Phases A–F; on approval, Phase A
begins with the documents-bug fix and the `core/match.ts` extraction.*
