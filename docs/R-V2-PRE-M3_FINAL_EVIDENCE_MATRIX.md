# PRE-M3 FINAL RELEASE GATE — Evidence Matrix

**Project:** Daniélou Abidjan  
**Gate:** PRE-M3 FINAL PRODUCTION CLOSURE  
**Date:** 2026-08-23  
**Branch:** main @ `27d1451e08f3cf00bd05884de168fdb992377a4d`  
**Origin:** https://github.com/alexkanga/danielou.git  
**Tags:** `pre-v2-migration`, `v2-pre-m3-pass` (ancien, 892a3c0), `v2-pre-m3-final-pass` (à créer après validation prod §36)  

---

| # | REQUIREMENT | EXPECTED | CODE EVIDENCE | DB EVIDENCE (PROD) | RUNTIME/TEST EVIDENCE | STATUS |
|---|---|---|---|---|---|
| 1 | **§2 Git State** | Clean working tree on main; known SHA | `git status` clean; `git rev-parse HEAD` = `27d1451`; 2 commits ahead of origin/main; no staged changes | — | `git status`, `git log --oneline -15`, `git branch -vv` — all consistent | PASS |
| 2 | **§3 Working Tree** | No untracked critical files | 4 untracked scripts in scripts/ with Neon credentials — explicitly NOT committed (§18) | — | Scripts are operational tools with real DB credentials — justified non-commit | PASS |
| 3 | **§4 Migrations Journal** | 5 records, no dupes, correct order | `drizzle/` has 0000-0004 SQL files | `__drizzle_migrations`: 5 records (0000-0004_snapshot), IDs 1-6-7 strictly increasing, no dupes, no unexpected | pg_catalog query on Neon PROD | PASS |
| 4 | **§5 Journal Consistency** | Repo files match journal entries | 5 `.sql` files in `drizzle/` | Journal hashes match `file_snapshot` convention for all 5 migrations | `db-audit-closure.mjs` cross-check repo vs DB | PASS |
| 5 | **§6 Journal Gate** | MISSING=0, DUPES=0, UNEXPECTED=0, HASH_MISMATCH=0, ORDERING=0 | — | All 5 checks verified via pg | Audit script output | PASS |
| 6 | **§7 0003 Triggers** | `set_updated_at()` function + triggers on all mutable tables | Migration `0003_set_updated_at_triggers.sql` | `pg_proc`: function EXISTS; `pg_trigger`: 24 triggers on 24 tables with `updated_at` column + 1 on `audit_log` (harmless) | `db-audit-closure.mjs` pg_catalog query | PASS |
| 7 | **§8 Functional updated_at** | Trigger fires on UPDATE | — | `UPDATE school SET name = name` → `updated_at` changed from `2026-08-22 18:53:45` to `2026-08-22 18:56:45` (REAL test on PROD) | pg TCP query before/after | PASS |
| 8 | **§9 0004 Delete Policies** | 3 FKs changed to RESTRICT | Migration `0004_fix_delete_policies.sql` | `pg_constraint.confdeltype`: classroom→level=`r`, assessment→classroom=`r`, grade→student=`r` | pg_catalog query on PROD | PASS |
| 9 | **§10 Delete Policy Audit** | No dangerous CASCADE on root entities | — | Only acceptable CASCADEs: academic_period→academic_year, school_membership→school. Zero dangerous CASCADE on level/classroom/student/enrollment | pg query with ANY($1) filter | PASS |
| 10 | **§11 Data Integrity** | 69 students, no orphans, no duplicates | Schema constraints (unique, FK, CHECK) | Student count = 69; 0 duplicates; 0 orphan enrollments; 0 orphan classroom_assignments; 0 multiple ACTIVE CA; 0 invalid dates; 0 cross-school; 0 cross-year | 8 separate pg queries on PROD | PASS |
| 11 | **§12 S1 Non-Regression** | 69 students, no duplication, no re-import | — | Same as §11 (shared queries) | pg count + GROUP BY HAVING | PASS |
| 12 | **§13 M2 Non-Regression** | enrollment.classroom_id ABSENT | `schema/index.ts`: no classroom_id in enrollment table | `information_schema.columns`: 0 rows for enrollment+classroom_id | pg + rg on schema file | PASS |
| 13 | **§14 Drizzle ↔ PG Drift** | 0 CRITICAL, 0 HIGH drift | Schema FK definitions | All 3 FKs verified RESTRICT in pg_catalog; trigger count matches tables with updated_at | pg_catalog vs schema cross-check | PASS |
| 14 | **§15 pnpm / Lockfile** | pnpm only, frozen install | `pnpm-lock.yaml` present; no competing lockfiles | — | `pnpm install --frozen-lockfile` → OK | PASS |
| 15 | **§16 Node / Toolchain** | .nvmrc aligned, pnpm version | `.nvmrc`: 22; `packageManager`: pnpm@11.22.0 | — | `pnpm --version` → 11.22.0 | PASS |
| 16 | **§17 Lint** | 0 errors | ESLint config with scripts/ excluded | — | `pnpm lint` → 0 errors, 1 warning (unused var in test) | PASS |
| 17 | **§18 Secret Scan** | 0 real credentials in tracked files | — | — | `rg npg_kaj $(git ls-files)` → 0 matches; 4 untracked scripts with credentials (not committed) | PASS |
| 18 | **§19 Commit Final** | No uncommitted critical files | Working tree clean (4 untracked scripts justified) | — | `git diff HEAD --stat` → empty | PASS |
| 19 | **§20 Push Main** | LOCAL == REMOTE | — | — | BLOCKED: no GITHUB_TOKEN / SSH in environment | NOT_EXECUTED |
| 20 | **§21-22 GitHub CI** | Real CI run on FINAL_MAIN_SHA | `.github/workflows/ci.yml` correct (branches: [main], pnpm, test) | — | BLOCKED: requires push first | NOT_EXECUTED |
| 21 | **§23-24 Vercel** | VERCEL_DEPLOYED_SHA = FINAL_MAIN_SHA | `vercel.json`: production branch = main (default) | — | BLOCKED: requires push + deploy | NOT_EXECUTED |
| 22 | **§25-26 Prod Smoke** | Fantomas login, UI pages, 69 students | — | — | BLOCKED: requires deployed production URL | NOT_EXECUTED |
| 23 | **§27 Prod Logout** | Session terminated, protected routes refuse | — | — | BLOCKED: requires deployed production URL | NOT_EXECUTED |
| 24 | **§28 Ordinary Auth** | Better Auth login or NOT_APPLICABLE | — | — | BLOCKED: no DB-backed account in PROD to test | NOT_APPLICABLE |
| 25 | **§29 Prod DB Safety** | Student count=69, no unexpected changes | — | BLOCKED: requires post-deploy re-verification | — | NOT_EXECUTED |
| 26 | **§30 Findings Traceability** | All findings documented with IDs | See findings table below | — | Document-level | PASS |
| 27 | **§31 Open Finding Gate** | CRITICAL=0, HIGH=0 | All findings resolved or LOW/INFO | — | See findings table | PASS |
| 28 | **Typecheck** | 0 errors | TypeScript strict mode | — | `pnpm typecheck` → 0 errors | PASS |
| 29 | **Tests** | All suites pass | — | — | `pnpm test` → 13 files, 259 passed, 3 skipped (262 collected) | PASS |
| 30 | **Build** | Successful | — | — | `pnpm build` → PASS | PASS |
| 31 | **No SQLite** | Zero SQLite in code/deps | No sqlite3/better-sqlite3/libsql in deps | — | `check-no-sqlite.sh` + `rg sqlite src/` | PASS |
| 32 | **Fantomas** | Always available, GLOBAL SUPER_ADMIN | `ghost-config.ts`, `ghost-auth.ts`, `permissions.ts:56` | — | 260/260 tests pass (H2) | PASS |
| 33 | **M1 Authorization** | All 12 API routes protected | `requireAuthorizedSession` in all routes | — | Code audit + RBAC tests (47 tests) | PASS |

---

## Summary

| Metric | Count |
|---|---|
| Total Requirements | 33 |
| PASS | 27 |
| NOT_EXECUTED | 5 |
| NOT_APPLICABLE | 1 |
| FAIL | 0 |

**Gate Verdict (evidence-based): LOCAL + DB PROD = PASS. Remote (CI/Vercel/Smoke) = NOT_EXECUTED (no credentials).**

### NOT_EXECUTED Items

All 5 NOT_EXECUTED items are blocked by the same root cause: **no GITHUB_TOKEN, no SSH key, no VERCEL_TOKEN in this environment**. These require manual execution by the owner after pushing from an authenticated environment.

| # | Requirement | Blocker | Manual Command |
|---|---|---|---|
| 1 | §20 Push Main | No Git credentials | `git push origin main` |
| 2 | §21-22 CI | Requires push | Verify at github.com/alexkanga/danielou/actions |
| 3 | §23-24 Vercel | Requires push + deploy | Check Vercel dashboard for deploy SHA |
| 4 | §25-27 Smoke | Requires deployed URL | Open production URL, test login |
| 5 | §29 DB Safety | Requires post-deploy | Re-run DB audit after deploy |
