---
name: refactor
description: Safely refactor and organize the MEC portal codebase so future edits are small, cheap, and low-risk — extract duplicated logic into shared helpers, keep the catalog/data-boundary architecture intact, and never change behavior. Use when the user says "/refactor", "organize the code", "clean this up", "reduce duplication", "this is hard to edit", or before a big feature when the surrounding code is messy. Triggers: "/refactor [area]".
---

# refactor — safe, behavior-preserving code organization

Goal: make the codebase **cheap to edit**. A good refactor means the next feature touches one file, one
helper, one message-key block — not ten copy-pasted spots. **Behavior must not change** — same UI, same
numbers, same build output. Read `CLAUDE.md` first (architecture rule §2, build gate §4).

## Golden rules
1. **Build-green first, build-green after.** Run `npm run build` before you start (must pass) and after
   every refactor. Zero type errors, always. Never commit a red build.
2. **No behavior change.** Refactoring ≠ features. If a number, string, route, or pixel changes, it's not
   a refactor — split it into a separate, declared change.
3. **Preserve the data boundary.** Never break the return shapes of `getFirmState/getDepartment/
   getSolution` (`lib/mock/data.ts`) or the live `dataset.ts` aggregate signatures. Pages depend on them.
4. **EN/AR parity.** Any message-key move keeps `messages/en.json` and `messages/ar.json` in lockstep.
5. **One concern per pass.** Extract one helper, or rename one thing, or split one file — then rebuild.
   Small passes are reviewable and revertible.

## Where shared things live (use these before writing new ones)
- **Date/time formatting** → `lib/format/datetime.ts` (`fmtDate`, `fmtDateTime`, `fmtDayMonth`,
  `fmtStampUTC`, `fmtAgo`). Do NOT hand-roll `new Date(x).toLocaleString(...)` in a page — import these.
- **Money / numbers** → `fmtSAR`, `fmtNum` in `lib/data/dataset.ts`; the VAT toggle is `components/Money.tsx`.
- **Metric definitions + (i) tooltips** → `lib/info/definitions.ts` + `components/InfoTooltip.tsx`.
- **Live Supabase reads** → `lib/data/supply.ts` (service-role; server-only — never import in a client
  component). Mutations (`setOrderStatus`, `archiveWhatsapp`, `deleteWhatsapp`) live here too.
- **Auth / permissions** → `lib/auth/users.ts` (roster + `ROLE_PERMISSIONS` + `permissionsFor`),
  `lib/auth/server.ts` (session), `lib/auth/useCurrentUser.ts` (client `can(perm)`).
- **JARVIS notes / empty states / callouts** → `components/{JarvisNotes,EmptyState,NoteCallout}.tsx`.
- **Page chrome** → `components/{PageShell,Panel,StatCard,DisplayHeading,Eyebrow}.tsx`.

## Method (each pass)
1. **Find the duplication.** Grep for repeated patterns — e.g. inline `toLocaleString` date formatters,
   copy-pasted fetch+poll `useEffect` blocks, repeated table-row shapes, the same Supabase fetch headers.
2. **Name the seam.** Decide the one shared function/component and where it belongs (table above). Keep
   the signature minimal and pure where possible (locale in, string out).
3. **Extract + replace.** Create/extend the helper, then replace each call site. Delete the old local
   copies. Keep imports tidy.
4. **Rebuild + spot-check.** `npm run build`; if a page rendered `12/06` before, it renders `12/06` now.
5. **Repeat** for the next seam, or stop.

## High-value seams in this codebase (known duplication to collapse when touched)
- Inline date formatters in `app/[locale]/{orders,approvals,documents,inventory}/page.tsx` → already
  centralised in `lib/format/datetime.ts`; route remaining ad-hoc ones through it.
- The "fetch `/api/x` + `setInterval(20000)` + refresh-on-focus" block is repeated in every live page —
  candidate for a `useLivePoll(url)` hook in `lib/hooks/` if a 4th copy appears.
- Supabase REST headers (`apikey` + `Authorization` + `Prefer`) are repeated across API routes — the
  `read()` helper in `supply.ts` is the canonical reader; new routes should reuse it, not re-fetch raw.

## Guardrails
- Refactor only what you're asked / what you're about to build on. Don't sweep the whole repo unprompted
  — large diffs are risky and expensive to review.
- Never touch secrets, `.env.local`, deploy config, or workflow JSON as part of a "refactor".
- If a refactor would change behavior to be "more correct", STOP and raise it as a bug/feature decision —
  don't smuggle it into a refactor commit.
- Update `CLAUDE.md` Progress only with what materially changed (new shared helper, file split).
