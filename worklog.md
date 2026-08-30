# Worklog

---
Task ID: 1
Agent: main
Task: M5 FINAL FUNCTIONAL CLOSURE — Audit Persistence Fix

Work Log:
- Diagnosed audit persistence failure: `audit_log.school_id` is UUID type in PostgreSQL; report-card service passed `schoolId: ''` (empty string), causing `invalid input syntax for type uuid: ""`; error swallowed in best-effort catch
- Confirmed root cause with direct SQL reproduction against SAFE_NONPROD PostgreSQL
- Fixed `PedagogyAuditParams.schoolId`: `string` → `string | null` in audit.ts
- Added defensive empty-string→null mapping in `logPedagogyAudit`
- Fixed 3 `schoolId: ''` → `schoolId: null` in report-card.service.ts
- Added missing `report_card_generated` audit to `generateReportCards`
- Changed `void logPedagogyAudit(...)` to `await` in bulk transition
- Ran 64-check integration proof: ALL PASS (including 24 new audit persistence checks)
- Verified audit rows exist for: GENERATION (2), RECALCULATION, READY (5), VALIDATION (5), PUBLICATION (5)
- Confirmed actor, entity, entityId, timestamp, context, no secrets in all audit rows
- Cleaned up 17 test audit rows + all fixtures, 0 orphans
- Regression: check:sqlite PASS, lint 0 errors, typecheck PASS, 425 tests PASS, build PASS, no secrets in source
- Committed b3cd383, pushed to PR #3, GitHub Actions Quality Gates PASS (run 32751316022)
- Preview Deployment failure is Vercel infra (Neon DB unreachable from Vercel build env), not M5

Stage Summary:
- Root cause: empty string passed to UUID column
- Fix: 2 files changed (audit.ts, report-card.service.ts), smallest responsible change
- 64/64 integration checks PASS, 425/425 tests PASS, CI PASS
- M5 PRE-PRODUCTION CLOSED, PRODUCTION READINESS = GO

---
Task ID: 2
Agent: main
Task: Role Display / RBAC Consistency Fix — ADMIN/TEACHER shown as Reader

Work Log:
- Traced role resolution end-to-end: DB user.role → Better Auth session.user → session.ts deriveSchoolRole → NavigationProvider → Sidebar/Topbar
- Identified root cause: `role` column exists in DB (pgEnum admin/direction/teacher/reader) but was NOT declared in Better Auth `additionalFields` in auth.ts
- BA 1.7.1 Drizzle adapter only exposes fields in its internal model + additionalFields; unlisted columns are silently dropped from session.user
- session.ts:75 `String(u.role ?? 'reader')` and actor.ts:83 `v1Role: String(u.role ?? 'reader')` — both fell back to 'reader' for ALL non-Ghost users
- Confirmed `deriveSchoolRole`, `SCHOOL_ROLE_LABELS`, `PLATFORM_ROLE_LABELS`, Sidebar, Topbar, NavigationProvider all correct — no READER fallback in any of those layers
- Found secondary issue: 'Super Admin' (English) displayed in topbar.tsx and utilisateurs page instead of canonical 'Super Administrateur'
- Applied 3-file fix: auth.ts (+role to additionalFields), topbar.tsx, utilisateurs/page.tsx (label consistency)
- Added 28 targeted tests in role-display-consistency.test.ts
- All gates: typecheck PASS, lint 0 errors, 453 tests PASS (28 new), build PASS, secret scan CLEAN, no-sqlite CLEAN

Stage Summary:
- VERDICT: DISPLAY BUG — caused by missing additionalField declaration, not RBAC logic defect
- RBAC authorization engine (permissions.ts, authorization.ts) was always correct; the session layer fed it wrong input
- Files changed: 3 source + 1 test, smallest responsible fix
- Commit 33c14a8, branch v2/m5-results-reportcards
- Stale session contributor: YES — existing sessions before this fix will still show 'reader' until re-login
- RELEASE READINESS: GO (awaiting owner push authorization)

---
Task ID: 2-a
Agent: explore
Task: Codebase Exploration for M4 Promotion Decision Implementation

Work Log:
- Read full schema at src/lib/db/schema/index.ts (605 lines, single-file schema)
- Read all M4 service files: annual-data.service.ts, annual-engine.ts, annual.types.ts, composition.types.ts
- Read M4 UI: src/app/(dashboard)/dashboard/resultats/annuelles/page.tsx
- Read M4 API: src/app/api/annual-results/route.ts
- Read pedagogical config service, UI (regles-calcul/page.tsx), and API routes
- Read all test files: annual-engine.test.ts (22 tests), composition-core.test.ts
- Read authorization: permissions.ts, authorization.ts, server-guards.ts, session.ts, rbac.ts
- Read audit: audit.ts (logPedagogyAudit, sessionToAuditActor, buildChangeLog)
- Read migration files: drizzle.config.ts, all 12 SQL migrations
- Read WS-002 contract document (633 lines)
- Read decimal.ts, calculation-engine.ts, composition-engine.ts
- Read validations/pedagogy.ts (Zod schemas)
- Read errors.ts, get-school.ts, actor.ts

Stage Summary:
- Exhaustive codebase exploration completed, all findings compiled below
- NO code changes made (research-only task)

========================================
EXPLORE FINDINGS — TASK 2-a
========================================

1. DRIZZLE SCHEMA (src/lib/db/schema/index.ts)

1.1 ENUMS (all pgEnum, 17 total):
File: /home/z/danielou-dos0/src/lib/db/schema/index.ts (lines 8-24)

- academicYearStatusEnum = pgEnum('academic_year_status', ['preparation', 'active', 'closed'])
- periodStatusEnum = pgEnum('period_status', ['draft', 'open', 'closed'])
- periodTypeEnum = pgEnum('period_type', ['trimester', 'semester', 'composition', 'passage', 'other'])
- enrollmentStatusEnum = pgEnum('enrollment_status', ['active', 'completed', 'transferred_out', 'withdrawn', 'cancelled'])
- classroomAssignmentStatusEnum = pgEnum('classroom_assignment_status', ['active', 'transferred', 'completed', 'withdrawn', 'cancelled'])
- gradeStatusEnum = pgEnum('grade_status', ['graded', 'absent_excused', 'absent_unexcused', 'exempt', 'not_evaluated', 'pending'])
- assessmentStatusEnum = pgEnum('assessment_status', ['draft', 'open', 'closed', 'cancelled'])
- reportCardStatusEnum = pgEnum('report_card_status', ['draft', 'ready', 'validated', 'published'])
- configStatusEnum = pgEnum('config_status', ['draft', 'active', 'archived'])
- calculationPolicyEnum = pgEnum('calculation_policy', ['simple_average', 'weighted_average', 'single_grade'])
- roundingStrategyEnum = pgEnum('rounding_strategy', ['half_up', 'half_even', 'truncate'])
- aggregationPolicyEnum = pgEnum('aggregation_policy', ['simple_average', 'weighted_average', 'single_grade'])
- promotionDecisionEnum = pgEnum('promotion_decision', ['proposed_admitted', 'proposed_repeat', 'decision_required', 'final_admitted', 'final_repeat'])
- generalAverageInputPolicyEnum = pgEnum('general_average_input_policy', ['subject_official', 'subject_raw'])
- roleEnum = pgEnum('app_role', ['admin', 'direction', 'teacher', 'reader'])
- platformRoleEnum = pgEnum('platform_role', ['super_admin', 'none'])
- schoolMembershipRoleEnum = pgEnum('school_membership_role', ['admin', 'direction', 'teacher', 'reader'])

ENUM convention: ALL use pgEnum() with snake_case DB name and snake_case values.

1.2 pedagogical_config TABLE (lines 377-404):
File: /home/z/danielou-dos0/src/lib/db/schema/index.ts
Fields:
  id: uuid('id').primaryKey().defaultRandom()
  schoolId: uuid('school_id').notNull().references(() => school.id)
  levelId: uuid('level_id').notNull().references(() => level.id)
  academicYearId: uuid('academic_year_id').notNull().references(() => academicYear.id)
  version: integer('version').notNull().default(1)
  status: configStatusEnum('status').notNull().default('draft')
  calculationPolicy: calculationPolicyEnum('calculation_policy').notNull().default('simple_average')
  roundingStrategy: roundingStrategyEnum('rounding_strategy').notNull().default('half_up')
  subjectDecimalPlaces: integer('subject_decimal_places').notNull().default(2)
  generalDecimalPlaces: integer('general_decimal_places').notNull().default(2)
  rankingEnabled: boolean('ranking_enabled').notNull().default(true)
  conductEnabled: boolean('conduct_enabled').notNull().default(false)
  conductIncludedInAverage: boolean('conduct_included_in_average').notNull().default(false)
  conductCoefficient: numeric('conduct_coefficient', { precision: 6, scale: 2 }).default('0')
  conductScale: integer('conduct_scale').default(20)
  generalAverageInputPolicy: generalAverageInputPolicyEnum('general_average_input_policy').notNull().default('subject_official')
  description: text('description')
  ...auditColumns (createdAt, updatedAt)

Constraints:
  uniqueIndex('upc_level_year_version').on(table.levelId, table.academicYearId, table.version)
  uniqueIndex('upc_level_year_active').on(table.levelId, table.academicYearId).where(sql`status = 'active'`)
  check('pedagogical_config_version_check', sql`version >= 1`)
  check('pedagogical_config_subject_decimals_check', sql`subject_decimal_places >= 0 AND subject_decimal_places <= 6`)
  check('pedagogical_config_general_decimals_check', sql`general_decimal_places >= 0 AND general_decimal_places <= 6`)
  check('pedagogical_config_conduct_coefficient_check', sql`conduct_coefficient IS NULL OR conduct_coefficient >= 0`)
  check('pedagogical_config_conduct_scale_check', sql`conduct_scale IS NULL OR conduct_scale >= 1`)

IMPORTANT: pedagogical_config does NOT have:
  - promotion_threshold field
  - annual_calculation_policy field
  - Any annual-specific configuration

The WS-002 contract (BR-WS002-14) says: "Threshold must NOT be hardcoded. Use approved/configurable pedagogical rule."

1.3 enrollment TABLE (lines 141-154):
  id: uuid PK
  schoolId: uuid FK → school.id (onDelete: restrict)
  studentId: uuid FK → student.id (onDelete: restrict)
  academicYearId: uuid FK → academic_year.id (onDelete: restrict)
  status: enrollmentStatusEnum (default 'active')
  enrolledAt: date
  exitedAt: date
  ...auditColumns

1.4 report_card TABLE (lines 295-329):
  id: uuid PK
  studentId: uuid FK → student.id
  enrollmentId: uuid FK → enrollment.id
  academicPeriodId: uuid FK → academic_period.id
  status: reportCardStatusEnum (draft/ready/validated/published)
  generalAverageRaw: numeric(12, 8)
  generalAverageOfficial: numeric(8, 4)
  generalAverageInputPolicy: generalAverageInputPolicyEnum
  roundingStrategy: roundingStrategyEnum
  subjectDecimalPlaces: integer
  generalDecimalPlaces: integer
  classAverage: numeric(8, 4)
  minClassAverage: numeric(8, 4)
  maxClassAverage: numeric(8, 4)
  rank: integer
  totalStudentsRanked: integer
  totalWeightedPoints: numeric(12, 4)
  totalEligibleCoefficient: numeric(8, 2)
  conductGrade: numeric(4, 2)
  conductComment: text
  teacherComment: text
  directorComment: text
  generalAppreciation: text (added in migration 0011)
  promotionDecision: promotionDecisionEnum('promotion_decision') — nullable, no default
  publishedAt: timestamp({ withTimezone: true })
  publishedBy: uuid
  configVersionId: uuid FK → pedagogical_config.id (nullable, no onDelete)
  ...auditColumns

NOTE: report_card is per-period, NOT per-year. There is NO annual_result or annual_decision table.
The promotionDecision column on report_card currently tracks per-period promotion decisions (used in M5/M6 report cards).

1.5 classroom TABLE (lines 108-117):
  id, levelId FK, academicYearId FK, name, ...auditColumns

1.6 level TABLE (lines 94-102):
  id, schoolId FK, name, sortOrder, ...auditColumns

1.7 audit_log TABLE (lines 518-533):
  id: uuid PK
  actorType: text (nullable)
  actorIdentifier: text (nullable)
  userId: uuid (nullable)
  schoolId: uuid (nullable) — FIXED: was causing errors with empty strings before M5 fix
  requestId: text (nullable)
  action: text NOT NULL
  entity: text NOT NULL
  entityId: uuid NOT NULL
  oldValue: text (nullable)
  newValue: text (nullable)
  context: text (nullable) — stores JSON.stringify(record)
  ipAddress: text (nullable)
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow()

NOTE: audit_log does NOT have updatedAt — only createdAt. No auditColumns mixin used.

1.8 EXISTING ANNUAL/DECISION TABLES:
  - NO annual_result table
  - NO annual_decision table
  - NO promotion_decision table (separate from report_card)
  - promotionDecisionEnum exists but is only used on report_card.promotion_decision

1.9 TIMESTAMP CONVENTION:
  - JS property names: camelCase (createdAt, updatedAt)
  - DB column names: snake_case (created_at, updated_at)
  - Defined via shared auditColumns mixin:
    const auditColumns = {
      createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
      updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    };
  - Timestamps use { withTimezone: true } everywhere
  - Migration 0003 sets updated_at triggers for auto-update

1.10 NUMERIC/DECIMAL CONVENTIONS:
  - Always use numeric() with explicit { precision: X, scale: Y }
  - Precision/scale patterns:
    - Raw values (high precision): numeric(12, 8) or numeric(12, 4)
    - Official/averages: numeric(8, 4)
    - Coefficients: numeric(6, 2)
    - Conduct: numeric(4, 2)
  - Numeric values are stored as STRINGS in Drizzle (PostgreSQL NUMERIC)
  - Domain calculations use decimal.js for full precision

1.11 FK NAMING CONVENTION:
  - Drizzle auto-generates FK names: table_column_fkey
  - No explicit FK name customization in the schema

1.12 configVersionId PATTERN:
  - On report_card: configVersionId: uuid('config_version_id').references(() => pedagogicalConfig.id)
  - Nullable (no NOT NULL) — indicates the config version used for calculation
  - No onDelete specified — means default RESTRICT behavior

2. M4 EXISTING CODE

2.1 annual-data.service.ts:
File: /home/z/danielou-dos0/src/lib/services/results/annual-data.service.ts
Exports:
  - AnnualClassParams { academicYearId: string; classroomId: string }
  - AnnualClassResultWithDetails { academicYearId, classroomId, classroomName, periods[], students[], classAverage, ranking }
  - getAnnualClassResults(params) → Promise<AnnualClassResultWithDetails>

Function logic:
  1. Validate classroom belongs to year
  2. Load all composition+passage periods for year
  3. Load eligible students (classroomAssignment + enrollment + student, active status)
  4. For each period: getCompositionClassResults() → build per-student map
  5. For each student: build periodResults[] → calculateAnnualStudent()
  6. calculateAnnualClassAverage()
  7. calculateAnnualRanking()

2.2 annual-engine.ts:
File: /home/z/danielou-dos0/src/lib/services/results/annual-engine.ts
Exports (3 pure functions):
  - calculateAnnualStudent(studentId, periodResults) → AnnualStudentResult
  - calculateAnnualClassAverage(studentResults) → AnnualClassResult
  - calculateAnnualRanking(studentResults) → AnnualRankingEntry[]

Algorithm:
  1. Separate regulars vs passages
  2. INCOMPLETE precedence checks
  3. DECISION_COUNCIL checks
  4. Build regularRaw = SUM(contributive.raw) / COUNT(contributive)
  5. Handle passage (first CALCULATED passage)
  6. annualRaw = (regularRaw + 2 * passageRaw) / 3
  7. annualOfficial = HALF_UP(annualRaw, 2)

CRITICAL GAP: Engine does NOT compute automatic promotion recommendation.
Returns: { studentId, status, regularRaw, passageRaw, annualRaw, annualOfficial }
Missing: automaticRecommendation field (BR-WS002-14), persistence, Council decision workflow

2.3 annual.types.ts:
File: /home/z/danielou-dos0/src/lib/services/results/annual.types.ts
Types:
  - AnnualResultStatus = 'CALCULATED' | 'INCOMPLETE' | 'DECISION_COUNCIL' (TS union, NOT pgEnum)
  - PeriodCompositionResult { periodId, periodName, periodType, status: CompositionResultStatus, raw, official }
  - AnnualStudentResult { studentId, status, regularRaw, passageRaw, annualRaw, annualOfficial }
  - AnnualClassResult { status, annualRaw, annualOfficial, studentCount }
  - AnnualRankingEntry { studentId, average, rank, tiedCount }
  - AnnualStudentRow { enrollmentId, studentId, studentFirstName, studentLastName, periodResults[], annual, annualRank }

2.4 API Route:
File: /home/z/danielou-dos0/src/app/api/annual-results/route.ts
  - GET only, params: academicYearId + classroomId
  - Auth: requireAuthorizedSession('school:grades:read')
  - School: getSchoolId()
  - Returns: AnnualClassResultWithDetails JSON
  - Error handling: pedagogyErrorToResponse(error)

2.5 Annual Results Page:
File: /home/z/danielou-dos0/src/app/(dashboard)/dashboard/resultats/annuelles/page.tsx (409 lines)
  - Client component, uses useState + useEffect + useCallback + useMemo
  - Uses AcademicContextSelector (year + classroom, showPeriod=false)
  - Fetches /api/annual-results?academicYearId=...&classroomId=... on context change
  - Displays: student table with per-period columns, annual average, rank, status badge
  - Status badges: CALCULATED (green), INCOMPLETE (amber), DECISION_COUNCIL (orange)
  - NO promotion decision column in current UI
  - NO Council decision workflow in current UI
  - NO save/persist annual results button

2.6 composition.types.ts:
File: /home/z/danielou-dos0/src/lib/services/results/composition.types.ts
  - CompositionResultStatus = 'CALCULATED' | 'INCOMPLETE' | 'NO_COMPUTABLE_RESULT' (TS union, not pgEnum)
  - CompositionAssessmentInput { assessmentId, maxPoints, status, rawValue }
  - CompositionStudentResult { studentId, status, raw, official }

3. PEDAGOGICAL CONFIGURATION UI

3.1 List Page:
File: /home/z/danielou-dos0/src/app/(dashboard)/dashboard/regles-calcul/page.tsx
  - Uses DataTable, FormDialog, DeleteDialog, StatusBadge from shared components
  - Uses Select components for level/year filters
  - Form fields: levelId, academicYearId, calculationPolicy, roundingStrategy, subjectDecimalPlaces, generalDecimalPlaces, rankingEnabled, conductEnabled, conductIncludedInAverage, conductCoefficient, conductScale, description
  - Validation: manual (levelId + academicYearId required)
  - Actions: Create (POST /api/regles-calcul), Activate, Clone, Delete
  - Pattern: local state → fetch on change → FormDialog for create

3.2 API Route:
File: /home/z/danielou-dos0/src/app/api/regles-calcul/route.ts
  - GET: requireAuthorizedSession('school:pedagogical_config:read') + listConfigs()
  - POST: requireAuthorizedSession('school:pedagogical_config:manage') + createConfig()
  - Uses Zod validation (createPedagogicalConfigSchema)
  - Error: pedagogyErrorToResponse

3.3 Config Service:
File: /home/z/danielou-dos0/src/lib/services/pedagogy/pedagogical-config.service.ts
  - listConfigs, getConfigById, createConfig, updateConfig, activateConfig, cloneConfig, deleteConfig
  - All mutations audit via logPedagogyAudit()
  - Actor pattern: { id, isGhost, platformRole } from sessionToAuditActor()

4. TEST FILES

4.1 M4 Annual Engine Tests:
File: /home/z/danielou-dos0/src/tests/m4/annual-engine.test.ts (263 lines, 22 tests)
  - M4-01 through M4-46
  - Helper functions: comp(id, status, raw, official), pass(id, status, raw, official)
  - ALL pure deterministic tests, no DB, no API

4.2 Composition Core Tests:
File: /home/z/danielou-dos0/src/tests/ws002/composition-core.test.ts (625 lines)
  - T1-T18 from WS-002-M1 contract

5. MIGRATION SETUP

5.1 drizzle.config.ts:
File: /home/z/danielou-dos0/drizzle.config.ts
  - schema: './src/lib/db/schema/index.ts'
  - out: './drizzle'
  - dialect: 'postgresql'
  - dbCredentials: { url: process.env.DATABASE_URL! }

5.2 Migration files (13 total, 0000-0012):
  Next migration number would be 0013
  - Uses BEGIN/COMMIT transactions
  - Enum creation: DO $$ BEGIN CREATE TYPE ... EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  - Naming: {number}_{descriptive_name}.sql (Drizzle auto-naming)

6. AUTHORIZATION/AUDIT

6.1 API Route Auth Pattern:
  - requireAuthorizedSession('permission') → returns AppSessionV2
  - getSchoolId() for single-tenant school resolution
  - pedagogyErrorToResponse(error) for error mapping

6.2 Permissions for annual results:
  - school:annual_results:read (admin, direction, teacher, reader)
  - school:annual_results:manage (admin, direction)
  - school:pedagogical_config:manage (admin only)

6.3 Audit Pattern:
  - logPedagogyAudit({ action, entity, entityId, schoolId: string | null, oldValue?, newValue?, actorId?, actorType?, actorIdentifier?, ipAddress?, context? })
  - sessionToAuditActor(session) → { actorId, actorType, actorIdentifier }
  - buildChangeLog(oldRecord, newValues, sensitiveKeys?) → { oldValue, newValue }
  - Best-effort catch — audit failure MUST NOT break main operation

7. KEY GAPS FOR M4 PROMOTION DECISION:

7.1 NO promotion_threshold on pedagogical_config
  WS-002 requires configurable threshold. Migration 0013 needed.

7.2 NO annual result persistence
  Results computed on-the-fly, no table stores them.

7.3 NO annual decision persistence
  report_card.promotion_decision is per-period. For annual decisions, no table exists.

7.4 Missing automaticRecommendation in engine
  annual-engine.ts does not compute or return promotion recommendation.

7.5 Missing Council decision workflow
  No API routes, UI, or service functions for Admin/Direction final decisions.

7.6 promotionDecisionEnum is ALREADY FIT
  Values: proposed_admitted, proposed_repeat, decision_required, final_admitted, final_repeat
  Maps directly to: auto-admitted, auto-repeat, DECISION_COUNCIL, Council-admitted, Council-repeat

These gaps require OWNER DECISION per WS-002 contract Section 12 and Stop Conditions.

---
Task ID: 8
Agent: m4-tests
Task: Write M4 threshold, persistence, decision, data-service, and UI tests

Work Log:
- Created threshold.test.ts (TH-01..TH-11)
- Created annual-persistence.test.ts (PD-01..PD-13)
- Created decision-workflow.test.ts (DW-01..DW-15)
- Created m4-data-service.test.ts (DS-01..DS-10)
- Created m4-ui.test.ts (UI-01..UI-11)
- Fixed Decimal.js method name bug: greaterThanOrEquals → greaterThanOrEqualTo in recommendation-engine.ts
- All 60 tests pass, no regressions in full suite (724 passed, 5 pre-existing DB-dependent failures)

Stage Summary:
- 60 new tests covering TH, PD, DW, DS, UI
- All use vitest + source-invariant or pure function patterns
- 1 source bug fix: recommendation-engine.ts line 68 (Decimal.js API typo)
- 5 test files: threshold.test.ts, annual-persistence.test.ts, decision-workflow.test.ts, m4-data-service.test.ts, m4-ui.test.ts
