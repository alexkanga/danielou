# R-V2-M2_01 — CURRENT STATE AUDIT

**Mission**: R-V2-M2 ENROLLMENT / CLASSROOM ASSIGNMENT
**Phase**: M2-01 AUDIT
**Date**: 2026-08-22
**Database**: PostgreSQL 18.6 on Neon (DEVELOPMENT)
**Status**: PASS

---

## 1. DATABASE CONNECTIVITY

| Connection | Result |
|---|---|
| POOLED (DATABASE_URL) | PASS |
| DIRECT (DIRECT_URL) | PASS |

Database: [REDACTED], User: [REDACTED], Schema: `public`

## 2. ENVIRONMENT CLASSIFICATION

**VERDICT: DEVELOPMENT**

Criteria: 0 business data rows, 1 school, 1 user, single database.
No production signals detected.

## 3. DRIZZLE MIGRATIONS TABLE

`__drizzle_migrations` did NOT exist at audit start.

Migrations were applied manually (outside drizzle-kit). Journal table was created
during M2-02 EXPAND and both 0000/0001 were recorded as applied.

## 4. TABLE INVENTORY (real PostgreSQL)

| Table | Rows |
|---|---|
| academic_period | 3 |
| academic_year | 1 |
| account | 0 |
| assessment | 0 |
| assessment_type | 4 |
| audit_log | 0 |
| classroom | 0 |
| classroom_assignment | **TABLE DOES NOT EXIST (pre-EXPAND)** |
| config_component | 0 |
| config_subject | 0 |
| enrollment | 0 |
| grade | 0 |
| level | 13 |
| pedagogical_config | 0 |
| report_card | 0 |
| report_card_item | 0 |
| school | 1 |
| school_membership | 0 |
| session | 0 |
| student | 0 |
| subject | 12 |
| subject_component | 0 |
| teacher_assignment | 0 |
| user | 1 |

**BUSINESS DATA CONFIRMED FROM POSTGRESQL:**

```
student = 0
enrollment = 0
classroom = 0
classroom_assignment = TABLE DOES NOT EXIST
```

## 5. PRE-EXPAND ENROLLMENT STRUCTURE (real PostgreSQL)

Columns found in DB (pre-EXPAND):

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NOT NULL | gen_random_uuid() |
| student_id | uuid | NOT NULL | — |
| classroom_id | uuid | **NOT NULL** | — |
| academic_year_id | uuid | NOT NULL | — |
| status | enrollment_status | NOT NULL | 'active' |
| created_at | timestamptz | NOT NULL | now() |
| updated_at | timestamptz | NOT NULL | now() |

**Columns MISSING from DB (added by EXPAND):**
- `school_id` (uuid, NOT NULL)
- `enrolled_at` (date, NULLABLE)
- `exited_at` (date, NULLABLE)

## 6. SCHEMA DRIFT (DB vs Drizzle Schema at Audit Time)

| Item | DB (pre-EXPAND) | Drizzle Schema | Drift |
|---|---|---|---|
| enrollment.classroom_id | uuid NOT NULL + FK | uuid (nullable, no FK) | YES — DB was NOT NULL with FK |
| enrollment.school_id | DOES NOT EXIST | uuid NOT NULL FK | YES — column missing |
| enrollment.enrolled_at | DOES NOT EXIST | date nullable | YES — column missing |
| enrollment.exited_at | DOES NOT EXIST | date nullable | YES — column missing |
| enrollment_status enum | [active, transferred, withdrawn] | [active, completed, transferred_out, withdrawn, cancelled] | YES — 2 values missing, 1 renamed |
| enrollment.student_id FK | ON DELETE CASCADE | ON DELETE restrict | YES |
| enrollment.academic_year_id FK | ON DELETE NO ACTION | ON DELETE restrict | MINOR |
| classroom_assignment | DOES NOT EXIST | full table defined | YES — table missing |
| rounding_strategy enum | [alf_up, half_even, truncate] | [half_up, half_even, truncate] | YES — typo 'alf_up' (pre-existing, non-M2) |

## 7. ENROLLMENT INTEGRITY

0 enrollment rows. No integrity issues to report.

All FKs verified:
- `student_id -> student.id (ON DELETE CASCADE)`
- `classroom_id -> classroom.id (ON DELETE NO ACTION)`
- `academic_year_id -> academic_year.id (ON DELETE NO ACTION)`

Indexes: `ue_student_year` (UNIQUE), `en_classroom_idx`

## 8. EXISTING MIGRATION FILES

| File | Content |
|---|---|
| 0000_empty_blindfold.sql | Initial schema (23 tables) — matches DB state |
| 0001_noisy_sway.sql | EXPAND: classroom_assignment, enrollment changes, CHECKs, partial unique |

0001 was NOT yet applied to DB at audit start.

## 9. CODE REFERENCE SCAN

### Runtime references to `enrollment.classroom_id` as data source:

**0 occurrences.** All 4 matches in `src/` are comments:

1. `classes/[id]/route.ts:148` — comment
2. `classes/route.ts:47` — comment
3. `eleves/route.ts:12` — comment
4. `eleves/route.ts:44` — comment

### Files already using `classroom_assignment` (V2):

- `src/lib/services/classroom-assignment.ts` — domain services
- `src/app/api/affectations/route.ts` — list + assign
- `src/app/api/affectations/[id]/route.ts` — history
- `src/app/api/affectations/[id]/close/route.ts` — close
- `src/app/api/affectations/transfer/route.ts` — transfer
- `src/app/api/eleves/route.ts` — list students via JOIN
- `src/app/api/eleves/[id]/route.ts` — student detail via JOIN
- `src/app/api/classes/route.ts` — student count subquery
- `src/app/api/classes/[id]/route.ts` — student count subquery + delete check

### Domain services implemented:

- `getCurrentClassroomAssignment(enrollmentId)`
- `getClassroomAssignmentHistory(enrollmentId)`
- `assignEnrollmentToClassroom(params)`
- `transferEnrollmentToClassroom(params)`
- `closeClassroomAssignment(params)`
- `checkNoOverlap(enrollmentId, startDate, endDate)`
- `getStudentWithCurrentAssignment(studentId, academicYearId?)`
- `listStudentsWithAssignments(params)`
- `getClassroomStudentCount(classroomId)`
- `hasActiveAssignmentsForClassroom(classroomId)`

## 10. DECISION: school_id NOT NULL

**CAS A applies: enrollment_count = 0.**

Direct `ADD COLUMN school_id uuid NOT NULL` is safe because:
- 0 existing rows
- No data to backfill
- No risk of constraint violation

## 11. KNOWN PRE-EXISTING ISSUES (non-M2)

1. **rounding_strategy enum typo**: DB has `alf_up` instead of `half_up`. Not M2-related. Not fixed.
2. **`__drizzle_migrations` absent**: Resolved during EXPAND by creating journal table.
3. **Build warning**: `crypto` module in ghost-auth.ts Edge Runtime (M1, pre-existing).

## 12. AUDIT CONCLUSION

- Environment: DEVELOPMENT — safe for migration
- Business data: **0 confirmed from PostgreSQL**
- Code switch: **already complete** — 0 runtime legacy refs
- Domain services: **already implemented**
- Migration 0001 (EXPAND): ready to apply
- Decision: proceed with EXPAND