---
name: mec-build
description: Self-development engine for the MEC Operations Portal. Use when the user wants the project to advance itself one safe increment — read the progress ledger, build-green-first, implement the next roadmap item, re-build, update the ledger, and commit + push to the mec GitHub remote so Vercel deploys. Also generates new specialized sub-skills via "new-skill <name>". Invoke for "/mec-build", "advance the project", "run the build loop", "keep developing MEC", or "make a new skill".
---

# mec-build — MEC Operations Portal self-development engine

This skill makes the MEC portal **develop, debug, and sustain itself with each run**. It has two
modes. Read `CLAUDE.md` (the constitution + ledger) before doing anything — it is the source of truth
for architecture rules, the roadmap, and what was done last.

## Arguments

- `/mec-build` or `/mec-build advance` → **Mode 1: advance** (default).
- `/mec-build new-skill <name>` → **Mode 2: skill generator**.

---

## Mode 1 — advance (default)

One self-contained, verifiable increment per run. Never leave the build red.

### Step 1 — Orient
- Read `CLAUDE.md`, especially **§5 Roadmap** and the **`## Progress`** ledger (newest entry on top).
- The "Next:" line of the latest ledger entry is your task. If it's vague, pick the smallest next
  item from the roadmap that moves the current phase forward.

### Step 2 — Self-debug gate (build-green-FIRST)
- Run `npm install` if `node_modules` is missing, then `npm run build`.
- **If the build fails, fixing it IS this run's work.** Do not add features on top of a red build.
  Common fixes (see CLAUDE.md §4): `Bi` indexed by locale (`x[locale]`), `params` is a Promise
  (`use(params)` / `await params`), a message key missing from `en.json` or `ar.json`, an incomplete
  `SolutionSeed`. Fix, re-build, then continue.

### Step 3 — Implement the next item
- Respect the **architecture rule** (CLAUDE.md §2): to change MEC content, edit `lib/mock/catalog.ts`,
  not the engine/components. Add real behaviour only behind the data boundary (`getFirmState` /
  `getDepartment` / `getSolution`) or as new pages/components when the roadmap calls for it.
- Keep scope to ONE increment (e.g. one new module, one secondary screen, one Arabic-string pass, one
  real-data swap). Honor the guardrails in CLAUDE.md §5 — never auto-approve, keep AI explainable,
  keep secrets server-side, audit-log important actions.
- Add EN **and** AR strings for any new keys.

### Step 4 — Verify (re-build + lint)
- Run `npm run build` again — it MUST pass with zero type errors. Then `npm run lint` and fix
  warnings you introduced.
- If you touched data or pages, sanity-check the change matches the deterministic-demo expectation
  (no empty states; KPIs/charts render).

### Step 5 — Update the ledger
- Prepend a new dated entry to `CLAUDE.md` `## Progress`: what you did, the build result, and a
  concrete **Next:** line. Tick any roadmap checkbox in §5 that is now complete.

### Step 6 — Commit + push (deploy gate)
- Only with a GREEN build:
  - `git add -A`
  - `git commit -m "<concise summary of this increment>"`
  - `git push` to the `mec` remote (`origin` → `https://github.com/ehan11111-code/mec.git`, branch
    `main`). Vercel auto-deploys.
- **First-run setup (do once if the repo isn't wired):** `git init` (if needed), set default branch
  `main`, `git remote add origin https://github.com/ehan11111-code/mec.git`. If the push is rejected
  for auth, STOP and tell the user to authenticate (`gh auth login` or a PAT) — do not block the run.

### Step 7 — Report
- Print a short report: **what changed**, **build status**, **commit/push result**, and **what's
  next**. Keep it scannable.

### Reliability rules (brief §14)
- Never commit or push a red build. Log the build status in the ledger every run. Make each increment
  small enough to verify. If a step is risky or ambiguous, prefer a ledger note over a half-done change.

---

## Mode 2 — new-skill <name>

Scaffold a new specialized sub-skill so the project can grow its own tooling. Use for repeatable jobs
tied to a MEC department or an n8n workflow from the brief §9 (e.g. `n8n-workflow-docs`,
`catalog-extend`, `arabic-pass`, `supabase-swap`).

1. Pick the slug from `<name>` (kebab-case). Create `.claude/skills/<name>/SKILL.md`.
2. Use this template, filled for the requested job:

```markdown
---
name: <name>
description: <when to use this skill — concrete triggers>
---

# <name>

## Goal
<one-paragraph purpose, tied to a MEC department or brief §9 workflow>

## Steps
1. Read CLAUDE.md for current state and rules.
2. Run `npm run build` (self-debug gate) — fix red before doing anything.
3. <the specific work for this skill>
4. Re-run `npm run build` (+ `npm run lint`); fix type errors.
5. Update the CLAUDE.md `## Progress` ledger.
6. Commit + push to the `mec` remote (green build only).

## Guardrails
- Edit `lib/mock/catalog.ts` for MEC content; keep the `getFirmState/getDepartment/getSolution`
  data-boundary shapes stable. Never auto-approve. Keep secrets server-side. EN+AR strings together.
```

3. Confirm the file was created and tell the user how to invoke it (`/<name>`). Do not run it
   automatically unless asked.

---

## Notes
- This skill is itself part of the repo, so it is versioned and can be improved by a future
  `/mec-build` run (e.g. when Phase 2 introduces real intake, refine Step 3's guidance here).
- Treat `CLAUDE.md` as the single source of truth. If reality and the ledger disagree, trust the code
  and correct the ledger.
