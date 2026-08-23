# Daniélou — Agent Continuity Checkpoint

**Date:** 2026-08-23
**HEAD:** M3 branch (v2/m3-pedagogy-configuration)
**Phase:** M3 — Phase C reconciled, awaiting Phase D GO

## Project State

- Repository: `https://github.com/alexkanga/danielou` (private)
- Stack: Next.js 16 + TypeScript + Tailwind + Drizzle ORM + Neon PostgreSQL + Better Auth
- Package manager: pnpm
- All PRE-M3 release gates: PASS
- DB PROD: 69 students, 24 updated_at triggers, 3 FK RESTRICT policies, 0 data integrity issues

## What Was Accomplished

| Milestone | Status |
|---|---|
| M0 Foundation | DONE |
| M1 Auth (Better Auth + Fantomas ghost) | DONE |
| M2 Data (PostgreSQL migration, 69 students) | DONE |
| PRE-M3 Release Gate | PASS — all 33 requirements verified |
| Migrations 0003 (triggers) + 0004 (FK RESTRICT) on PROD | APPLIED |
| Recovery secrets audit | DONE — 4 REQUIRED identified |
| M3 Phase A Preflight | PASS |
| M3 Phase A Security Closure | PASS — 7 credential scripts moved out, local git exclude protection |
| M3 Phase B Current-State Audit | PASS — 6 pedagogy tables, 0 legacy, 3 moderate/4 low findings, GO for Phase C |
| M3 Phase C Target Model & Invariants | PASS — 25/25 invariants frozen, 33 Phase D DB deltas + 1 service-only, 0 ambiguities |
| M3 Phase C Targeted Reconciliation | PASS — C-R01 REJECT_EMPTY, C-R02 3 CONTRACT_LATER, C-R03 not created, Phase I scope=3 DROPs |

## Pending / Next

- Phase D — EXPAND (migration 0005, 33 DB delta objects + 1 service-only delta) — BLOCKED until explicit owner GO
- Phase I CONTRACT — 3 DROP COLUMN (subject_component.coefficient, .scale, .is_required) + verification gate
- Tags `v2-pre-m3-final-pass` and `v2-pre-m3-pass` exist on remote
- M3 branch: `v2/m3-pedagogy-configuration`

## Recovery

- Secrets file: `/home/z/my-project/download/DANIELOU_RECOVERY_SECRETS.txt` (outside repo, not tracked)
- Contains 4 REQUIRED secrets: GITHUB_TOKEN, DATABASE_URL, DIRECT_URL, BETTER_AUTH_SECRET
- A new agent with this file + repo clone can fully reconstruct the working environment

## Known Artifacts NOT in Git

- `DANIELOU_RECOVERY_SECRETS.txt` (outside repo)
- `.env.local` (gitignored)
- Legacy one-off scripts moved to `/home/z/my-project/danielou-legacy-scripts/` (outside repo, contains 7 scripts with hardcoded DB credentials, no longer in workspace)
- Local `.git/info/exclude` patterns block future accidental adds of prod/closure scripts

## Critical Operational Knowledge

- `@neondatabase/serverless` neon() HTTP driver does NOT persist DDL on Neon — use `pg` (node-postgres) TCP with unpooled connection for all migrations
- Drizzle migration journal hash convention: `{filename}_snapshot`
- `src/lib/env.ts` Zod validation is dead code — `getEnv()`/`validateEnv()` never called
- `AUTH_SECRET` in .env.example is unused — only `BETTER_AUTH_SECRET` matters