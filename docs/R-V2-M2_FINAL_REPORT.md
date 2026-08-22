# R-V2-M2 — FINAL REPORT

**Mission**: R-V2-M2 ENROLLMENT / CLASSROOM ASSIGNMENT
**Date**: 2026-08-22
**Branch**: `v2/m2-enrollment-classroom-assignment`
**Database**: PostgreSQL 18.6 on Neon (DEVELOPMENT)

---

## Verdict

R-V2-M2 — ENROLLMENT / CLASSROOM ASSIGNMENT

| Phase | Status |
|---|---|
| AUDIT | PASS |
| EXPAND | PASS |
| MIGRATE | PASS |
| VERIFY | PASS |
| DOMAIN SERVICES | PASS |
| SWITCH CODE | PASS |
| SWITCH UI | PASS |
| CONTRACT | PASS |
| DATA INTEGRITY GATE | PASS |
| SECURITY GATE | PASS |
| M1 REGRESSION | PASS |

| Check | Status |
|---|---|
| TYPECHECK | PASS (0 errors) |
| LINT | PASS (0 errors, 17 pre-existing warnings) |
| TESTS | PASS (166/166) |
| BUILD | PASS |
| NO SQLITE | PASS (0 in source) |

**FINAL STATUS: M2 — PASS**

**M3 ELIGIBILITY: GO**

---

## What Was Done

### M2-01 AUDIT
- Connected to real PostgreSQL (both pooled and direct)
- Classified environment as DEVELOPMENT (0 business data)
- Inventoried 23 tables, documented full schema drift
- Scanned all source files: 0 runtime references to enrollment.classroom_id
- Documented 9 domain services already implemented

### M2-02 EXPAND
- Applied migration 0001_noisy_sway.sql (28 statements, all OK)
- Created `classroom_assignment` table with FKs, CHECK, partial unique index
- Added `enrollment.school_id` (NOT NULL), `enrolled_at`, `exited_at`
- Updated `enrollment_status` enum to 5 values
- Changed `enrollment.student_id` FK from CASCADE to RESTRICT
- Made `enrollment.classroom_id` nullable
- Set up `__drizzle_migrations` journal
- Verified: 34/34 schema checks passed

### M2-03 MIGRATE DATA
- 0 source enrollments → 0 migrated, 0 errors, 0 manual reconciliation
- Reconciliation: BALANCED
- Status mapping defined for all 5 enrollment statuses

### M2-04 VERIFY
- 7/7 integrity queries passed on PostgreSQL
- 10/10 synthetic fixture tests passed (create, duplicate reject, transfer, rollback, cross-year, overlap)

### M2-05 DOMAIN SERVICES
- All services implemented and verified via PostgreSQL synthetic fixtures
- Business logic centralized in `src/lib/services/classroom-assignment.ts`
- No duplication in UI or multiple API routes

### M2-06 SWITCH CODE + UI
- 0 runtime references to enrollment.classroom_id
- All API routes use classroom_assignment as source of truth
- Eleves page: creates student → enrollment → assignment in transaction
- Affectations API: list, assign, history, close, transfer

### M2-07 CONTRACT
- Generated migration 0002_curious_mindworm.sql
- Applied: dropped index `en_classroom_idx`, dropped column `enrollment.classroom_id`
- Post-contract verification: typecheck, 166 tests, lint, build — all PASS

### M2-08 GATES
- Data Integrity Gate: 19/19 PASS
- Security Gate: 11/11 PASS
- M1 Regression: 166/166 tests PASS

## Key Files Changed

| File | Change |
|---|---|
| src/lib/db/schema/index.ts | Removed enrollment.classroomId, removed en_classroom_idx |
| drizzle/0001_noisy_sway.sql | EXPAND migration (pre-existing, applied) |
| drizzle/0002_curious_mindworm.sql | CONTRACT migration (generated + applied) |

## Database State (Post-EXPAND + CONTRACT)

- 24 tables in public schema
- `classroom_assignment` with 3 indexes + 1 partial unique + 1 CHECK
- `enrollment` with 7 columns (classroom_id removed), 3 indexes, 1 CHECK
- `enrollment_status` enum: [active, completed, transferred_out, withdrawn, cancelled]
- `classroom_assignment_status` enum: [active, transferred, completed, withdrawn, cancelled]

## Documents Produced

| Document | Status |
|---|---|
| docs/R-V2-M2_01_CURRENT_STATE_AUDIT.md | DONE |
| docs/R-V2-M2_02_DATA_MIGRATION_REPORT.md | DONE |
| docs/R-V2-M2_03_SWITCH_REPORT.md | DONE |
| docs/R-V2-M2_DATA_INTEGRITY_GATE.md | DONE |
| docs/R-V2-M2_SECURITY_GATE.md | DONE |
| docs/R-V2-M2_FINAL_REPORT.md | DONE (this document) |

## Notes for M3

1. `rounding_strategy` enum has a pre-existing typo (`alf_up` vs `half_up`) in the database. Not M2-related.
2. Role-based operation restrictions for affectations (teacher/reader cannot mutate) should be considered.
3. An overlap trigger at the DB level was not created; defense is application-level `checkNoOverlap()`.
4. The `__drizzle_migrations` journal was manually bootstrapped (entries for 0000, 0001, 0002).
5. M3 is explicitly NOT started. Awaiting owner authorization.
