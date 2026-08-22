# Daniélou — Agent Continuity Checkpoint

**Date:** 2026-08-23
**HEAD:** 07ac533 (main, pushed to origin)
**Phase:** Post PRE-M3 Closure — Pre M3

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

## Pending / Next

- M3 implementation — BLOCKED until explicit owner GO
- Tags `v2-pre-m3-final-pass` and `v2-pre-m3-pass` exist on remote

## Recovery

- Secrets file: `/home/z/my-project/download/DANIELOU_RECOVERY_SECRETS.txt` (outside repo, not tracked)
- Contains 4 REQUIRED secrets: GITHUB_TOKEN, DATABASE_URL, DIRECT_URL, BETTER_AUTH_SECRET
- A new agent with this file + repo clone can fully reconstruct the working environment

## Known Artifacts NOT in Git

- 7 scripts in `scripts/` containing hardcoded Neon prod credentials (intentionally untracked)
- `DANIELOU_RECOVERY_SECRETS.txt` (outside repo)
- `.env.local` (gitignored)

## Critical Operational Knowledge

- `@neondatabase/serverless` neon() HTTP driver does NOT persist DDL on Neon — use `pg` (node-postgres) TCP with unpooled connection for all migrations
- Drizzle migration journal hash convention: `{filename}_snapshot`
- `src/lib/env.ts` Zod validation is dead code — `getEnv()`/`validateEnv()` never called
- `AUTH_SECRET` in .env.example is unused — only `BETTER_AUTH_SECRET` matters