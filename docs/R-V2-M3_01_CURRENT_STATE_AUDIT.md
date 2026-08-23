# R-V2-M3_01 — Current-State Audit (Phase B)

**Date:** 2026-08-23
**Branch:** v2/m3-pedagogy-configuration
**Baseline SHA:** 471c821
**Phase:** M3 — Pedagogy / Configuration

---

## B1 — Database Tables (Real State)

24 base tables exist in `public` schema:

```
__drizzle_migrations, academic_period, academic_year, account, assessment,
assessment_type, audit_log, classroom, classroom_assignment, config_component,
config_subject, enrollment, grade, level, pedagogical_config, report_card,
report_card_item, school, school_membership, session, student, subject,
subject_component, teacher_assignment, user
```

**Pedagogy-relevant tables (6):** `subject`, `subject_component`, `assessment_type`, `pedagogical_config`, `config_subject`, `config_component`.

All 6 pedagogy tables match the Drizzle schema definition in `src/lib/db/schema/index.ts` exactly — no unexpected columns, no missing columns.

---

## B2 — Column Inventory (Pedagogy Tables)

### subject (14 columns)

| Column | Type | Nullable | Default | FK | UNIQUE |
|--------|------|----------|---------|-----|--------|
| id | uuid | NO | gen_random_uuid() | — | PK |
| school_id | uuid | NO | — | school(id) | — |
| code | text | NO | — | — | (school_id, code) |
| name | text | NO | — | — | — |
| sort_order | integer | NO | 0 | — | — |
| coefficient | numeric(6,2) | NO | '1' | — | — |
| default_scale | integer | NO | 20 | — | — |
| is_active | boolean | NO | true | — | — |
| is_optional | boolean | NO | false | — | — |
| include_in_average | boolean | NO | true | — | — |
| include_in_ranking | boolean | NO | true | — | — |
| include_in_decision | boolean | NO | true | — | — |
| created_at | timestamptz | NO | now() | — | — |
| updated_at | timestamptz | NO | now() | — | — |

**Indexes:** PK(id), UNIQUE(school_id, code)
**Triggers:** trg_subject_updated_at (UPDATE → set_updated_at)
**CHECK constraints:** NONE

### subject_component (10 columns)

| Column | Type | Nullable | Default | FK | UNIQUE |
|--------|------|----------|---------|-----|--------|
| id | uuid | NO | gen_random_uuid() | — | PK |
| subject_id | uuid | NO | — | subject(id) CASCADE | — |
| name | text | NO | — | — | (subject_id, name) |
| sort_order | integer | NO | 0 | — | — |
| coefficient | numeric(6,2) | NO | '1' | — | — |
| scale | integer | NO | 20 | — | — |
| is_required | boolean | NO | true | — | — |
| is_active | boolean | NO | true | — | — |
| created_at | timestamptz | NO | now() | — | — |
| updated_at | timestamptz | NO | now() | — | — |

**Indexes:** PK(id), INDEX(subject_id), UNIQUE(subject_id, name)
**Triggers:** trg_subject_component_updated_at
**CHECK constraints:** NONE

### assessment_type (6 columns)

| Column | Type | Nullable | Default | FK | UNIQUE |
|--------|------|----------|---------|-----|--------|
| id | uuid | NO | gen_random_uuid() | — | PK |
| school_id | uuid | NO | — | school(id) | — |
| name | text | NO | — | — | — |
| description | text | YES | — | — | — |
| created_at | timestamptz | NO | now() | — | — |
| updated_at | timestamptz | NO | now() | — | — |

**Indexes:** PK(id) only
**Triggers:** trg_assessment_type_updated_at
**CHECK constraints:** NONE

### pedagogical_config (19 columns)

| Column | Type | Nullable | Default | FK | UNIQUE |
|--------|------|----------|---------|-----|--------|
| id | uuid | NO | gen_random_uuid() | — | PK |
| school_id | uuid | NO | — | school(id) | — |
| level_id | uuid | NO | — | level(id) | — |
| academic_year_id | uuid | NO | — | academic_year(id) | — |
| version | integer | NO | 1 | — | (level_id, academic_year_id, version) |
| status | config_status | NO | 'draft' | — | — |
| calculation_policy | calculation_policy | NO | 'simple_average' | — | — |
| rounding_strategy | rounding_strategy | NO | 'half_up' | — | — |
| subject_decimal_places | integer | NO | 2 | — | — |
| general_decimal_places | integer | NO | 2 | — | — |
| ranking_enabled | boolean | NO | true | — | — |
| conduct_enabled | boolean | NO | false | — | — |
| conduct_included_in_average | boolean | NO | false | — | — |
| conduct_coefficient | numeric(6,2) | YES | '0' | — | — |
| conduct_scale | integer | YES | 20 | — | — |
| description | text | YES | — | — | — |
| created_at | timestamptz | NO | now() | — | — |
| updated_at | timestamptz | NO | now() | — | — |

**Indexes:** PK(id), UNIQUE(level_id, academic_year_id, version)
**Triggers:** trg_pedagogical_config_updated_at
**CHECK constraints:** NONE

### config_subject (13 columns)

| Column | Type | Nullable | Default | FK | UNIQUE |
|--------|------|----------|---------|-----|--------|
| id | uuid | NO | gen_random_uuid() | — | PK |
| config_id | uuid | NO | — | pedagogical_config(id) CASCADE | — |
| subject_id | uuid | NO | — | subject(id) | (config_id, subject_id) |
| coefficient | numeric(6,2) | NO | — | — | — |
| scale | integer | NO | 20 | — | — |
| is_active | boolean | NO | true | — | — |
| include_in_average | boolean | NO | true | — | — |
| include_in_ranking | boolean | NO | true | — | — |
| include_in_decision | boolean | NO | true | — | — |
| sort_order | integer | NO | 0 | — | — |
| created_at | timestamptz | NO | now() | — | — |
| updated_at | timestamptz | NO | now() | — | — |

**Indexes:** PK(id), UNIQUE(config_id, subject_id)
**Triggers:** trg_config_subject_updated_at
**CHECK constraints:** NONE

### config_component (11 columns)

| Column | Type | Nullable | Default | FK | UNIQUE |
|--------|------|----------|---------|-----|--------|
| id | uuid | NO | gen_random_uuid() | — | PK |
| config_subject_id | uuid | NO | — | config_subject(id) CASCADE | — |
| subject_component_id | uuid | YES | — | subject_component(id) | — |
| name | text | NO | — | — | — |
| sort_order | integer | NO | 0 | — | — |
| coefficient | numeric(6,2) | NO | '1' | — | — |
| scale | integer | NO | 20 | — | — |
| is_required | boolean | NO | true | — | — |
| is_active | boolean | NO | true | — | — |
| created_at | timestamptz | NO | now() | — | — |
| updated_at | timestamptz | NO | now() | — | — |

**Indexes:** PK(id) only
**Triggers:** trg_config_component_updated_at
**CHECK constraints:** NONE

---

## B3 — Row Counts (Actual Data)

| Table | Row Count | Source |
|-------|-----------|--------|
| subject | 12 | seed.ts |
| subject_component | 0 | — |
| assessment_type | 4 | seed.ts |
| pedagogical_config | 0 | — |
| config_subject | 0 | — |
| config_component | 0 | — |
| assessment | 0 | — |
| grade | 0 | — |
| report_card | 0 | — |
| report_card_item | 0 | — |

All 12 subjects are active, non-optional, with coefficients ranging from 1.00 to 5.00. All use scale 20.

All 4 assessment types are seeded: Devoir, Examen, Contrôle, TP.

---

## B4 — Enums (13 total)

| Enum Name | Values |
|-----------|--------|
| academic_year_status | preparation, active, closed |
| app_role | admin, direction, teacher, reader |
| calculation_policy | simple_average, weighted_average, single_grade |
| classroom_assignment_status | active, transferred, completed, withdrawn, cancelled |
| config_status | draft, active, archived |
| enrollment_status | active, completed, transferred_out, withdrawn, cancelled |
| grade_status | graded, absent_excused, absent_unexcused, exempt, not_evaluated, pending |
| period_status | draft, open, closed |
| platform_role | super_admin, none |
| promotion_decision | proposed_admitted, proposed_repeat, decision_required, final_admitted, final_repeat |
| report_card_status | draft, ready, validated, published |
| rounding_strategy | half_up, half_even, truncate |
| school_membership_role | admin, direction, teacher, reader |

All enums match Drizzle schema definitions exactly. No legacy enums detected.

---

## B5 — Indexes on Pedagogy Tables

| Table | Index Name | Type | Columns |
|-------|-----------|------|---------|
| subject | subject_pkey | UNIQUE | (id) |
| subject | us_school_code | UNIQUE | (school_id, code) |
| subject_component | subject_component_pkey | UNIQUE | (id) |
| subject_component | sc_subject_idx | INDEX | (subject_id) |
| subject_component | uc_subject_name | UNIQUE | (subject_id, name) |
| assessment_type | assessment_type_pkey | UNIQUE | (id) |
| pedagogical_config | pedagogical_config_pkey | UNIQUE | (id) |
| pedagogical_config | upc_level_year_version | UNIQUE | (level_id, academic_year_id, version) |
| config_subject | config_subject_pkey | UNIQUE | (id) |
| config_subject | ucs_config_subject | UNIQUE | (config_id, subject_id) |
| config_component | config_component_pkey | UNIQUE | (id) |

**Partial indexes:** NONE on any pedagogy table.

---

## B6 — Triggers on Pedagogy Tables

All 6 pedagogy tables have exactly one trigger: `set_updated_at()` on UPDATE. This is the standard audit trail trigger applied to all 24 data tables.

No custom pedagogy-specific triggers exist.

---

## B7 — Legacy Pedagogy Fields

**Legacy fields detected: 0**

No deprecated columns, no legacy naming patterns, no `deprecated`/`legacy` flags found in any pedagogy table.

---

## B8 — Runtime References to Pedagogy Tables

### Schema Definition

- `src/lib/db/schema/index.ts` — Defines all 6 pedagogy tables, 13 enums, and all type exports.

### Seed Data

- `src/lib/db/seed.ts` — Hardcodes 12 subjects (FRA, MAT, ANG, ESP, HIS, SCI, PHY, EPS, ART, MUS, ECM, INF) and 4 assessment types (Devoir, Examen, Contrôle, TP). Uses `neon()` HTTP driver (read-only safe).

### Navigation / Permissions (permission strings only, no data queries)

- `src/lib/navigation.ts` — Defines nav items for Matières, Composantes, Types d'évaluation, Règles de calcul with permission gates (`school:subjects:read`, `school:components:read`, `school:assessment_types:read`, `school:pedagogical_config:read`, `school:pedagogical_config:manage`). No data queries.
- `src/lib/permissions.ts` — RBAC matrix maps 8 pedagogy permissions to school roles. No data queries.
- `src/lib/types/rbac.ts` — Defines pedagogy-related Permission type variants. No data queries.

### Runtime Queries (Cross-reference only)

- `src/app/api/classes/[id]/route.ts` — Imports `assessment` schema only to check for linked assessments before deleting a classroom (FK dependency guard). Does not query or mutate pedagogy tables.
- `src/app/(dashboard)/dashboard/page.tsx` — Imports `assessment` and `grade` to count rows for dashboard stats. No pedagogy config logic.
- `src/lib/teacher-scope.ts` — References `teacherAssignment.subjectId` for authorization scoping. Does not query subject table.

### API Routes for Pedagogy CRUD

**NONE exist.** No route handlers found under `src/app/api/` for subjects, subject components, assessment types, or pedagogical configurations. The navigation defines links (`/dashboard/matieres`, `/dashboard/composantes`, `/dashboard/types-evaluation`, `/dashboard/regles-calcul`) but no corresponding API endpoints or page components exist.

### Validation Schemas

**NONE exist for pedagogy.** `src/lib/validations/scolarite.ts` covers levels, academic years, classrooms, students, and assignments only.

---

## B9 — Hardcoded References

### Subject References

| File | Context | Assessment |
|------|---------|------------|
| `src/lib/db/seed.ts` | 12 subject codes/names/coefficients | Expected — seed data |

No runtime source files outside seed.ts reference specific subject codes or names.

### Level References

| File | Context | Assessment |
|------|---------|------------|
| `src/lib/db/seed.ts` | 13 level names (CP1–Tle) | Expected — seed data |
| `src/app/.../classes/page.tsx` | Placeholder `"Ex: 6ème A"` | UI hint only, not business logic |
| `src/app/.../niveaux/page.tsx` | Placeholder `"Ex: 6ème"` | UI hint only, not business logic |

No runtime logic depends on specific level names.

### Config/Policy References

**NONE.** No runtime code references `calculation_policy`, `rounding_strategy`, or specific config values outside schema definitions.

---

## Findings

### M3-F001 — MODERATE

| Field | Value |
|-------|-------|
| **SEVERITY** | MODERATE |
| **EVIDENCE** | No CHECK constraints on any pedagogy table. `subject.coefficient` accepts negative values and zero. `subject.default_scale`, `subject_component.scale`, `config_subject.scale`, `config_component.scale` accept values <= 0. `pedagogical_config.version` accepts values <= 0. `pedagogical_config.subject_decimal_places` and `general_decimal_places` accept negative values. |
| **IMPACT** | Invalid data can be inserted (e.g., coefficient=-1, scale=0, version=-3). Calculation engines built in Phase C would need to handle these edge cases or produce incorrect results. |
| **REQUIRED ACTION** | Add CHECK constraints in Phase C migration: coefficient > 0, scale >= 1, version >= 1, decimal_places >= 0. |
| **BLOCKING** | NO |

### M3-F002 — MODERATE

| Field | Value |
|-------|-------|
| **SEVERITY** | MODERATE |
| **EVIDENCE** | `src/lib/validations/scolarite.ts` contains zero Zod schemas for any pedagogy entity (subject, subject_component, assessment_type, pedagogical_config, config_subject, config_component). No server-side input validation exists for pedagogy CRUD. |
| **IMPACT** | Any future API routes for pedagogy will lack validation unless schemas are created as part of Phase C implementation. |
| **REQUIRED ACTION** | Create Zod validation schemas for all pedagogy entities as part of Phase C API route development. |
| **BLOCKING** | NO |

### M3-F003 — MODERATE

| Field | Value |
|-------|-------|
| **SEVERITY** | MODERATE |
| **EVIDENCE** | `assessment_type` table has no UNIQUE constraint on `(school_id, name)`. The Drizzle schema does not define one. Query confirmed: only PK index exists on assessment_type. |
| **IMPACT** | Duplicate assessment types with identical names can be created for the same school, causing confusion in UI dropdowns and potential data integrity issues. |
| **REQUIRED ACTION** | Add UNIQUE(school_id, name) index in Phase C migration. |
| **BLOCKING** | NO |

### M3-F004 — LOW

| Field | Value |
|-------|-------|
| **SEVERITY** | LOW |
| **EVIDENCE** | No API routes exist under `src/app/api/` for subjects, subject components, assessment types, or pedagogical configurations. Navigation links in `src/lib/navigation.ts` point to `/dashboard/matieres`, `/dashboard/composantes`, `/dashboard/types-evaluation`, `/dashboard/regles-calcul` but no corresponding page components or API handlers exist. |
| **IMPACT** | Navigation items will lead to 404 pages. Users cannot manage pedagogy data. |
| **REQUIRED ACTION** | Build CRUD API routes and page components in Phase C. |
| **BLOCKING** | NO |

### M3-F005 — LOW

| Field | Value |
|-------|-------|
| **SEVERITY** | LOW |
| **EVIDENCE** | `report_card.config_version_id` is a nullable UUID with no FK constraint and no index. 0 out of 0 report_card rows use it. The column is defined in Drizzle schema but not consumed by any runtime code. |
| **IMPACT** | Forward-looking column with no referential integrity. If used in Phase C, it should have a FK to `pedagogical_config.id`. |
| **REQUIRED ACTION** | Evaluate in Phase C: either add FK constraint or remove the column. |
| **BLOCKING** | NO |

### M3-F006 — LOW

| Field | Value |
|-------|-------|
| **SEVERITY** | LOW |
| **EVIDENCE** | `config_component` table has no UNIQUE constraint on `(config_subject_id, name)`. Multiple components with identical names can be added to the same config subject. |
| **IMPACT** | Potential for duplicate component names within a single config subject, causing UI confusion. |
| **REQUIRED ACTION** | Add UNIQUE(config_subject_id, name) index in Phase C migration. |
| **BLOCKING** | NO |

### M3-F007 — LOW

| Field | Value |
|-------|-------|
| **SEVERITY** | LOW |
| **EVIDENCE** | `src/lib/db/seed.ts` hardcodes 12 subjects with fixed codes (FRA, MAT, ANG, etc.), names, coefficients, and 4 assessment types. These are inserted with `onConflictDoNothing`. |
| **IMPACT** | Seed data is Ivorian-specific (French West African curriculum). Acceptable for this single-school deployment but not portable. |
| **REQUIRED ACTION** | No action needed for current deployment. Document that seed data is school-specific. |
| **BLOCKING** | NO |

### M3-F008 — INFO

| Field | Value |
|-------|-------|
| **SEVERITY** | INFO |
| **EVIDENCE** | `subject` table has `coefficient`, `default_scale`, `is_active`, `is_optional`, `include_in_average`, `include_in_ranking`, `include_in_decision` — 7 fields that are duplicated in `config_subject` (with `scale` replacing `default_scale`). The design intent is: subject = catalog defaults, config_subject = per-config overrides. |
| **IMPACT** | Dual-storage creates potential for confusion. When a config_subject row exists for a subject, its values should override the subject defaults. No runtime code currently implements this override logic. |
| **REQUIRED ACTION** | Document the override contract clearly in Phase C. Implement the fallback logic (config_subject values || subject defaults) in calculation engines. |
| **BLOCKING** | NO |

---

## Phase B Scorecard

| Metric | Value |
|--------|-------|
| **PHASE A SECURITY CLOSURE** | **PASS** |
| **TRACKED SECRET EXPOSURE** | **0** |
| **ACCIDENTAL ADD RISK** | **CLOSED** |
| **DB PEDAGOGY TABLES** | **6** (subject, subject_component, assessment_type, pedagogical_config, config_subject, config_component) |
| **DB PEDAGOGY ROW COUNTS** | **subject: 12, subject_component: 0, assessment_type: 4, pedagogical_config: 0, config_subject: 0, config_component: 0** |
| **ENUMS** | **13** (3 pedagogy-specific: calculation_policy, rounding_strategy, config_status) |
| **LEGACY FIELDS** | **0** |
| **RUNTIME LEGACY REFERENCES** | **0** |
| **HARDCODED LEVEL REFERENCES** | **0** (3 UI placeholder hints in page components) |
| **HARDCODED SUBJECT REFERENCES** | **1** (seed.ts — expected) |
| **CRITICAL FINDINGS** | **0** |
| **HIGH FINDINGS** | **0** |
| **MODERATE FINDINGS** | **3** (M3-F001, M3-F002, M3-F003) |
| **LOW FINDINGS** | **4** (M3-F004, M3-F005, M3-F006, M3-F007) |
| **INFO FINDINGS** | **1** (M3-F008) |
| **M3 READINESS FOR PHASE C** | **GO** |

---

## Conclusion

Phase B audit confirms the database is in a clean, well-structured state for Phase C implementation. All 6 pedagogy tables exist with correct columns, proper FK relationships, appropriate UNIQUE constraints (except two gaps), and updated_at triggers. 13 enums are defined and match the Drizzle schema exactly. No legacy fields or deprecated patterns exist.

The 3 MODERATE findings (missing CHECK constraints, missing validation schemas, missing UNIQUE on assessment_type) are all actionable within Phase C and none are blocking. The schema is structurally sound and ready for the target model freeze.