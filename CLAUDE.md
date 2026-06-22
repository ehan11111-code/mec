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

- **2026-06-22 — Phase 1 complete + shipped.** Built the full bilingual portal: config, engine,
  i18n, all components, all pages, MEC catalog (7 departments × 4 modules), savings module, EN/AR
  messages. `git init` → committed → pushed to `origin/main`
  (`https://github.com/ehan11111-code/mec.git`). Status: deterministic-mock demo of the whole surface,
  live on GitHub.
  - **Build:** `npm run build` passes with **zero type errors / zero warnings** (19 routes generated).
  - **Next:** connect the GitHub repo to Vercel (one-time, in vercel.com — no env vars needed), then
    begin **Phase 2 (Documents & Intake)** — start with the extracted-data review screen for the
    `documents` department. Run `/mec-build` to advance.
