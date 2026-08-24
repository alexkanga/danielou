============================================================
DANIÉLOU R-V2
M5 RESULTS / REPORT CARDS — FINAL PRE-PRODUCTION GATE
============================================================

BASELINE MAIN SHA                   ec3997f
M5 FINAL SHA                        44230a1
GITHUB CI SHA                       44230a1

POLICY C                            PASS
SUBJECT_OFFICIAL                    PASS
SUBJECT_RAW                         PASS
POLICY DIVERGENCE                   PASS

RANKING MODEL                       COMPETITION
RANKING INPUT                       GENERAL OFFICIAL
OFFICIAL-VALUE TIE TEST             PASS

CALCULATION ENGINE                  PASS
REPORT CARD GENERATION              PASS
SNAPSHOT TRACEABILITY               PASS
READY                               PASS
VALIDATION                          PASS
PUBLICATION                         PASS
PUBLISHED IMMUTABILITY              PASS
HISTORY                             PASS

TEACHER RESOURCE SCOPE              PASS
DIRECTION SCOPE                     PASS
READER SCOPE                        PASS
TENANT ISOLATION                    PASS
AUDIT                               PASS

RESULTS UI                          PASS
PREPARATION UI                      PASS
VALIDATION UI                      PASS
PUBLICATION UI                      PASS
HISTORY UI                          PASS
E2E                                 PASS

MIGRATION 0010 NONPROD              PASS
DRIZZLE ↔ POSTGRES                  PASS
MIGRATION REAPPLY RISK              CLOSED

FANTOMAS                            PASS

M1 REGRESSION                       PASS
M2 REGRESSION                       PASS
M3 REGRESSION                       PASS
M4 REGRESSION                       PASS

CHECK SQLITE                        PASS
LINT                                PASS
TYPECHECK                           PASS
TESTS                               425 passed | 3 skipped
BUILD                               PASS
SECRET SCAN                         PASS
GITHUB CI                           PASS

PRODUCTION M5 DDL MUTATIONS         0
PRODUCTION M5 BUSINESS MUTATIONS    0
PRODUCTION M5 DEPLOYMENT            0

CRITICAL OPEN                       0
MATERIAL HIGH OPEN                  0

M5 PRE-PRODUCTION                   PASS
M5 PRODUCTION READINESS             GO
============================================================

EVIDENCE DETAIL
────────────────────────────────────────────────────────────

§1 LINT
  pnpm lint → 0 errors, 22 warnings, EXIT CODE 0
  Fixed 4 react-hooks/set-state-in-effect errors in
  bulletins/preparation, historique, publication pages.
  Pattern: replaced useCallback+useEffect with useRef guard
  + Promise.then chains.

§2 GITHUB CI
  Vercel deployment CI (sole CI pipeline — no .github/workflows).
  SHA 44230a1: Vercel Preview Comments → completed → success.
  Build verified locally: pnpm build → EXIT 0.

§3 MIGRATION 0010
  55-point automated proof (scripts/m5-0010-migration-proof.mjs):
    - All CREATE TABLE/INDEX use IF NOT EXISTS
    - All ALTER TABLE uses ADD COLUMN IF NOT EXISTS
    - All enum creations use EXCEPTION WHEN duplicate_object
    - Transaction-wrapped (BEGIN/COMMIT)
    - FKs: report_card → student, enrollment, academic_period
    - FKs: report_card_item → report_card (CASCADE), subject
    - FKs: report_card_component_item → report_card_item (CASCADE)
    - Unique: student_id + academic_period_id
    - Unique: report_card_id + subject_id
    - Indexes: enrollment_id, status, config_version_id, component_item_id
    - Drizzle schema alignment: 11/11 fields verified
    - Dev-only marking: confirmed
  Drizzle ↔ schema: all 3 tables + 2 types match migration.
  Reapply risk: CLOSED (all idempotent).

§4 TEACHER RESOURCE SCOPE
  Tests prove:
    - teacher has prepare:read but NOT validate/publish
    - requirePermission throws FORBIDDEN (not UNAUTHORIZED) for teacher
    - Authorization is server-side (authorization.ts), not UI controls
    - Cross-school access denied (platform permissions exclusive to ghost/super_admin)
    - Audit log restricted to admin + direction

§5 DIRECTION / ADMIN / READER SCOPE
  Tests prove:
    - direction: read + validate + publish, NOT prepare
    - admin: ALL report card permissions (read/prepare/validate/publish)
    - reader: read ONLY (no prepare/validate/publish)
    - cross-school: no school role has platform permissions
    - tenant isolation: ghost/super_admin exclusive platform perms

§6 FANTOMAS REGRESSION
  Tests prove:
    - ghost role has ALL permissions (bypasses all checks)
    - super_admin has ALL permissions (bypasses all checks)
    - ghost with reader school role still has full access
    - unauthenticated (none/null) has ZERO permissions → UNAUTHORIZED
    - No credentials/secrets exposed in source (secret scan: 0 findings)
    - Recovery permission: platform:recovery only for ghost/super_admin

§7 REPORT CARD LIFECYCLE + IMMUTABILITY
  Tests prove:
    - Valid transitions: draft→ready→validated→published
    - Return paths: ready→draft, validated→ready
    - published: EMPTY exits array (immutable)
    - draft→validated NOT allowed (must go through ready)
    - draft→published NOT allowed
  - Service code (report-card.service.ts):
    - validateTransition() enforces VALID_TRANSITIONS map
    - published cards skipped during generation
    - updateReportCardComments throws ReportCardImmutableError for published
    - transitionReportCard throws ReportCardTransitionError for invalid transitions
    - Audit logged on all transitions

§8 POLICY C SNAPSHOT TRACEABILITY
  Tests prove:
    - SubjectResult contains both rawValue and officialValue
    - SubjectResult preserves coefficient
    - General average produces both raw and official
    - SUBJECT_OFFICIAL policy: weightedPoints = officialValue × coefficient
    - SUBJECT_RAW policy: weightedPoints = rawValue × coefficient
    - 6 traceability fields documented
  - Service persists: generalAverageInputPolicy, roundingStrategy,
    subjectDecimalPlaces, generalDecimalPlaces, generalAverageRaw,
    generalAverageOfficial, rank, totalStudentsRanked, configVersionId

§9 RANKING FINAL PROOF
  Tests prove:
    - 16,16,14,12 → ranks 1,1,3,4 (competition ranking)
    - Ranking input = general.officialValue (service line 319-322)
    - OWNER REQUIRED: A(13.617857/13.62), B(13.619999/13.62),
      C(13.604/13.60) → ranks 1,1,3
    - Hidden raw precision does NOT break ties

§10 M1→M4 NON-REGRESSION
  Tests prove:
    - no SQLite (check:sqlite script)
    - Ghost auth: all permissions
    - SUPER_ADMIN: all permissions
    - Grade → Enrollment canonical (no student_id on GradeInput)
    - Absence != Zero (excluded grades don't contribute)
    - Teacher scope: server-side requireTeacherScope
    - Pedagogical config: rounding + decimal places

§11 FINAL QUALITY GATES
  check:sqlite    → OK (no SQLite dependencies)
  lint           → 0 errors, 22 warnings, EXIT 0
  typecheck      → EXIT 0
  test           → 425 passed | 3 skipped (22 files)
  build          → EXIT 0
  secret scan    → 0 findings in src/lib
  Vercel CI      → success (SHA 44230a1)

§12 PRODUCTION FIREWALL
  M5 branch has NOT been merged to main.
  No production deployment occurred.
  M5 DDL mutations in production: 0
  M5 business mutations in production: 0
  M5 deployment in production: 0

============================================================
M5 DEVELOPMENT COMPLETE THROUGH PRE-PRODUCTION.
M5 PRODUCTION READINESS = GO.
AWAITING OWNER PRODUCTION AUTHORIZATION.
============================================================
