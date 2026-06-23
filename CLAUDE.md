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
explainable; never auto-approve orders; keep secrets out of the frontend; audit-log anything
important; never trust AI extraction without a confidence score + human review.

## 6. Self-development protocol

Run **`/mec-build`** to advance the project one safe increment. Each run: build-green-first → do the
next ledger item → re-build → update the ledger below → commit + push. See the skill for details.
`/mec-build new-skill <name>` scaffolds a new specialized sub-skill.

---

## Progress

> The `/mec-build` skill updates this section every run. Newest entry on top.

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
