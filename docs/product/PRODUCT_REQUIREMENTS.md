# Daniélou — Product Requirements

## 1. Document Status

Status: DRAFT — R1 OWNER CORRECTED

Baseline SHA:
57972464e445456bbaf9a6d15600f5b9fece6db0

This document captures the existing canonical project state at the verified GitHub baseline. It will govern future functional development once finalized by the OWNER. It is a factual extraction from repository evidence, not a specification of intended future behavior.

## 2. Product Purpose

Daniélou Abidjan is a school management system currently operated as a single-school application. It covers the principal school management domains currently implemented in the repository: organizational setup, pedagogical configuration, grade entry and assessment management, report card generation with configurable calculation policies, and data export.

Daniélou is French-first for its user interface and validation experience.

**Scope**: Single-school. The schema retains `school_id` on most tables for structural consistency, but the data-access layer operates as single-tenant.

## 3. Users and Roles

### Platform Roles (global, on `user` table)
- **Ghost (Fantomas)**: Built-in break-glass system principal. Ghost/Fantomas is a break-glass system principal designed to remain usable when PostgreSQL and the ordinary Better Auth path are unavailable, provided the application runtime and required secure configuration remain available. Has all permissions. Used for initial bootstrap and emergency recovery.
- **Super Admin**: Platform-level administrator. Can manage users and bootstrap the system. Has all school-role permissions plus platform permissions.
- **None**: Regular authenticated user with no platform-level privileges; rights derive from school membership or V1 role fallback.

### School Roles (on `school_membership` table; V1 fallback on `user.role`)
- **Admin**: Full manage access to all school-scoped domains.
- **Direction**: Read-only on organization/pedagogy; can validate and publish report cards; can manage annual results.
- **Teacher**: Read organization data; manage assessments and grades within assigned classroom+subject scope (enforced via `teacher_assignment` table); can prepare report cards.
- **Reader**: Read-only access across all school-scoped domains.

### Deferred Technical Item
The `school_membership` table exists and the V2 dual-role type system is defined, but session resolution currently uses the V1 `user.role` column as fallback. This is a deferred non-blocking technical item. No functional defect has been identified in the current V1 behavior.

## 4. Core Functional Domains

**Organisation** — CONFIRMED
Academic year, period, level, classroom, student, enrollment, classroom assignment CRUD with lifecycle states.

**Pedagogy Configuration** — CONFIRMED
Subjects, subject components, assessment types, pedagogical configs (versioned per level+year), config subjects, config components. All calculation parameters (rounding, aggregation, coefficients, decimal places) are configurable.

**Assessment Management** — CONFIRMED
Assessment CRUD with lifecycle (draft → open → closed/cancelled), status-based guards on grade entry.

**Grade Entry** — CONFIRMED
Single and bulk grade setting with status semantics (graded, absent_excused, absent_unexcused, exempt, not_evaluated, pending). Teacher scope enforcement via `teacher_assignment`.

**Report Cards** — CONFIRMED
Full lifecycle (draft → ready → validated → published) with calculation engine (decimal.js), configurable policies, competition ranking, class statistics, component-level detail. PDF generation service exists; visual output fidelity is NOT VERIFIED.

**Data Export** — CONFIRMED
CSV export for students, enrollments, classrooms, and published results.

**Dashboard** — CONFIRMED
Role-specific dashboards (admin, direction, teacher, reader, super_admin) with KPI data and alert panels.

**Statistics** — PARTIAL
Navigation entry, API route, and service file exist. Depth of statistical features not fully verified.

**User Management** — CONFIRMED
Super admin and Ghost can create/promote users. Ghost-only bootstrap flow for first super admin.

**Audit Logging** — CONFIRMED
The inspected mutation paths in service files and API routes use audit logging (pedagogy audit and ghost audit). Exhaustive coverage of all possible mutation paths is not proven.

**System Recovery** — PARTIAL
Navigation entry and page exist (Ghost-only). Actual recovery capabilities not verified from code inspection.

## 5. Confirmed Functional Requirements

- **FR-001**: The system shall support dual authentication: Better Auth (email/password + username) and Ghost (break-glass principal) authenticated independently of database availability.
- **FR-002**: The system shall enforce role-based access control with a dual-role model (platform role + school role) and granular permissions.
- **FR-003**: Teachers shall only access assessments, grades, and report cards for their assigned classroom+subject combinations within the correct academic year.
- **FR-004**: Academic years shall support preparation → active → closed lifecycle.
- **FR-005**: Periods shall support draft → open → closed lifecycle and may be scoped to a level.
- **FR-006**: Assessments shall follow draft → open → closed/cancelled lifecycle. Grades can only be entered on open assessments.
- **FR-007**: Grades shall enforce status semantics: graded requires a non-null raw value ≤ assessment scale; non-grade statuses must not have numeric values.
- **FR-008**: One grade per (assessment, enrollment) pair (database-enforced unique constraint).
- **FR-009**: Report cards shall follow draft → ready → validated → published lifecycle with immutable snapshots at publication.
- **FR-010**: The calculation engine shall use decimal.js for all arithmetic (no floating-point), with configurable rounding and decimal places.
- **FR-011**: Pedagogical configs shall be versioned per (level, academic year) with at most one active config at a time (database-enforced).
- **FR-012**: Classroom assignments shall support active → transferred → completed/withdrawn/cancelled lifecycle with transfer capability.

## 6. Confirmed Business Rules

- **BR-001**: Grade raw value must be ≥ 0 (DB constraint) and ≤ assessment scale (application-level check).
- **BR-002**: Subject coefficient must be > 0 (DB constraint).
- **BR-003**: General average input policy (`subject_official` vs `subject_raw`) determines whether rounded or raw subject values enter the general average calculation.
- **BR-004**: Ranking uses competition ranking: rank = 1 + count of strictly higher averages.
- **BR-005**: Subjects can be marked optional, excluded from average, excluded from ranking, or excluded from decision.
- **BR-006**: `report_card.promotion_decision` supports proposed_admitted, proposed_repeat, decision_required, final_admitted, final_repeat. The rules governing who sets proposed vs final status, and under what conditions, will be specified in the Composition & Annual Results workstream contract.

## 7. Main User Workflows

**Admin manages academic year lifecycle**
→ Admin navigates to Années Scolaires
→ Creates academic year with dates and status
→ System validates and persists with school_id
→ Academic year appears in dropdowns across the app

**Teacher enters grades**
→ Teacher navigates to Saisie des notes
→ Selects an open assessment
→ System verifies teacher is assigned to this classroom+subject+year
→ Teacher enters/modifies grades (single or bulk)
→ System validates grade status semantics and scale bounds
→ Grades persisted with audit trail

**Direction validates report cards**
→ Direction navigates to Bulletins → Validation
→ Selects a period and classroom
→ System generates report cards with calculation engine (draft → ready)
→ Direction reviews and validates
→ Report cards move to validated state

**Ghost boots a new deployment**
→ Ghost authenticates (no DB required)
→ Navigates to System → Recovery
→ Creates first super admin via bootstrap flow
→ Super admin can then create regular users

**Admin transfers a student between classes**
→ Admin navigates to Affectations
→ Selects student, chooses transfer action
→ Provides effective date and new classroom
→ System closes old assignment (status: transferred), creates new active assignment

## 8. Non-Functional Requirements

- **PostgreSQL-only**: SQLite is formally prohibited (enforced by CI gate).
- **TypeScript**: TypeScript 5.9.3 with typecheck as CI gate.
- **Vitest testing**: 474 tests across 24 test files as CI gate.
- **Lint enforcement**: ESLint with Next.js config as CI gate.
- **Audit logging**: Inspected mutation paths use audit logging.
- **Break-glass authentication**: Ghost/Fantomas is a break-glass system principal designed to remain usable when PostgreSQL and the ordinary Better Auth path are unavailable, provided the application runtime and required secure configuration remain available.
- **Decimal precision**: All grade calculations use decimal.js. No floating-point arithmetic in the calculation engine.
- **Vercel configuration**: Present. Exact production deployment trigger not verified from repository.
- **Responsive interface**: shadcn/ui with Tailwind CSS.

## 9. Known Functional Gaps / Partial Areas

- **Statistics page**: API route and service exist but depth of statistical features is unclear.
- **System recovery page**: Exists in navigation (Ghost-only) but actual recovery tooling is unverified.
- **PDF report card**: Service and route exist; visual output fidelity is NOT VERIFIED.
- **XLSX export**: Declared as a format option but falls back to CSV in implementation.

## 10. Owner Validations Required

1. What are the exact rules for Composition period type (vs regular trimester/semester)?
2. What are the exact rules for Passage period type?
3. What are the exact promotion decision rules (who sets proposed vs final, under what conditions)?
4. What are the annual results aggregation rules?

These will be provided and validated in the Composition & Annual Results workstream contract before implementation.

## 11. Unknown / Not Verified

- PDF report card visual output quality.
- Statistics dashboard actual data depth.
- System recovery page actual capabilities.
- Whether `RECOVER_PROJECT.md` contains actionable current instructions or is historical.
