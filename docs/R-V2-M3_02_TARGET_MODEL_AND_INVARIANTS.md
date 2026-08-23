# R-V2-M3_02 — Target Model & Invariants Freeze (Phase C)

**Date:** 2026-08-23
**Branch:** v2/m3-pedagogy-configuration
**Phase B Checkpoint SHA:** baa52e8
**Phase C Checkpoint SHA:** 6228c9b
**Reconciliation SHA:** 2449f75
**Phase:** M3 — Pedagogy / Configuration — Target Freeze (Reconciled)

---

## 1. Purpose / Baseline

This document freezes the M3 target data model and all associated invariants.
It transforms the audited current state (R-V2-M3_01) into an immutable
target contract that Phase D and beyond must implement.

**Source hierarchy (order of authority):**
1. PostgreSQL PROD real state (Phase B audit)
2. Drizzle schema in `src/lib/db/schema/index.ts`
3. M3 invariants INV-M3-01..25
4. Daniélou architecture (single-school, French West African curriculum)
5. Phase B findings M3-F001..F008

**Scope:** M3 covers catalogues, versioned pedagogical configuration,
policies, scales, activation, clone, RBAC, and audit for the 6 pedagogy
tables. Grade calculation engines, report card generation, and
assessment workflow belong to M4+.

---

## 2. Phase B Facts Carried Forward

| Fact | Value |
|------|-------|
| DB pedagogy tables | 6 |
| Legacy fields (pre-M3 deprecated) | 0 |
| M3 redesign removals (current→target) | 3 (subject_component.coefficient, .scale, .is_required) |
| Runtime legacy references | 0 |
| Critical findings | 0 |
| High findings | 0 |
| Subject rows | 12 (seeded) |
| Assessment type rows | 4 (seeded) |
| Config/config_subject/config_component rows | 0 |
| All 6 tables match Drizzle schema | Exactly |
| Enums | 13 (3 pedagogy-specific) |
| updated_at triggers | 6 (set_updated_at) |
| CHECK constraints | 0 |
| Partial indexes | 0 |

---

## 3. Target Architecture

```
School (1)
 └── Subject (catalog)          ← pure reference, no calculation rules
 │    └── SubjectComponent (catalog)  ← pure reference
 ├── AssessmentType (template)   ← defaults only, not historical truth
 ├── Level (org)
 │    └── AcademicYear (org)
 │         └── AcademicPeriod
 └── PedagogicalConfig (versioned config)
      ├── ConfigSubject (per-subject rules)  ← source of truth for calculations
      │    └── ConfigComponent (per-component rules)
      └── policy fields (calculation, rounding, ranking, conduct)

Override contract:
  ConfigSubject fields override Subject defaults when present.
  ConfigComponent fields are the definitive values for M4 calculation.
```

**M4 Firewall:** M3 owns catalogues, configuration versioning, policies,
and CRUD. M4 owns grade calculation engines, report card generation,
assessment workflow, absence handling, and the `grade`/`report_card`/`report_card_item` mutation services.

---

## 4. Subject — Target Contract

### Purpose
Pure pedagogical catalogue. Provides default values that ConfigSubject may
override. Subject itself carries no calculation logic and no per-config
variation.

### Target Columns

| Column | Type | Nullable | Default | FK | Constraint |
|--------|------|----------|---------|-----|------------|
| id | uuid | NO | gen_random_uuid() | — | PK |
| school_id | uuid | NO | — | school(id) | — |
| code | text | NO | — | — | UNIQUE(school_id, code) |
| name | text | NO | — | — | — |
| sort_order | integer | NO | 0 | — | CHECK >= 0 |
| coefficient | numeric(6,2) | NO | '1' | — | CHECK > 0 |
| default_scale | integer | NO | 20 | — | CHECK >= 1 |
| is_active | boolean | NO | true | — | — |
| is_optional | boolean | NO | false | — | — |
| include_in_average | boolean | NO | true | — | — |
| include_in_ranking | boolean | NO | true | — | — |
| include_in_decision | boolean | NO | true | — | — |
| created_at | timestamptz | NO | now() | — | — |
| updated_at | timestamptz | NO | now() | — | — |

### Rules
- Tenant-scoped by `school_id`.
- `code` + `school_id` UNIQUE.
- `coefficient > 0`, `default_scale >= 1`, `sort_order >= 0`.
- ON DELETE: No FK references this from config_subject with CASCADE;
  instead, config_subject has its own FK to subject. Deleting a subject
  with existing config_subject rows must be RESTRICT or BLOCKED at service
  level to preserve historical config interpretability (INV-M3-14).
- `is_active` is a soft flag; inactivation does not delete.
- updated_at: trigger `set_updated_at()` on UPDATE. MUTABLE: YES.

---

## 5. SubjectComponent — Target Contract

### Purpose
Pure catalogue of sub-parts of a subject (e.g., "Oral", "Written", "TP").
Provides reference entries that ConfigComponent may link to.
No coefficient, scale, or required-flag as global source of truth — those
belong to ConfigComponent.

### Target Columns

| Column | Type | Nullable | Default | FK | Constraint |
|--------|------|----------|---------|-----|------------|
| id | uuid | NO | gen_random_uuid() | — | PK |
| subject_id | uuid | NO | — | subject(id) | — |
| code | text | YES | — | — | PARTIAL UNIQUE(subject_id, code) WHERE code IS NOT NULL |
| name | text | NO | — | — | UNIQUE(subject_id, name) |
| sort_order | integer | NO | 0 | — | CHECK >= 0 |
| is_active | boolean | NO | true | — | — |
| created_at | timestamptz | NO | now() | — | — |
| updated_at | timestamptz | NO | now() | — | — |

> **C-R02 RECONCILIATION (Targeted Reconciliation):** The previous version of
> this table erroneously listed `coefficient`, `scale`, and `is_required` as
> target columns with CHECK constraints. This contradicted the section purpose
> ("No coefficient, scale, or required-flag as global source of truth — those
> belong to ConfigComponent") and the Delta Matrix (§24). The correct target
> omits these 3 columns. They exist in current PROD (verified at 6228c9b) but
> are redesign removals deferred to Phase I CONTRACT (0 data, 0 runtime reads,
> 0 runtime writes).

### Rules
- `code` is OPTIONAL. When provided, UNIQUE(subject_id, code) via partial unique.
- `name` is NOT NULL and UNIQUE within subject.
- `sort_order >= 0`.
- **No coefficient, scale, or is_required.** These belong to ConfigComponent.
- ON DELETE subject: CASCADE (components are strict children of their subject).
  This is safe because historical configs link to components via
  config_component.subject_component_id, and subject deletion should
  only be blocked when config_component references exist (enforced by
  service layer / FK on config_component).
- Updated_at trigger: YES. MUTABLE: YES.

### Design Decision: code field
Current state has no `code` column. TARGET adds `code text NULLABLE`.
Rationale: Some Ivorian curricula use sub-component codes (e.g., "ORAL",
"ECRIT"). Making it nullable avoids forcing codes on schools that don't
use them.

---

## 6. AssessmentType — Target Contract

### Purpose
Template for assessment instances. Provides default values that
individual Assessment rows may override. AssessmentType is NOT the
historical source of truth for any given assessment — the Assessment row
itself is.

### Target Columns

| Column | Type | Nullable | Default | FK | Constraint |
|--------|------|----------|---------|-----|------------|
| id | uuid | NO | gen_random_uuid() | — | PK |
| school_id | uuid | NO | — | school(id) | — |
| name | text | NO | — | — | UNIQUE(school_id, name) |
| description | text | YES | — | — | — |
| default_coefficient | numeric(6,2) | YES | — | — | CHECK > 0 WHEN NOT NULL |
| default_scale | integer | YES | — | — | CHECK >= 1 WHEN NOT NULL |
| is_active | boolean | NO | true | — | — |
| created_at | timestamptz | NO | now() | — | — |
| updated_at | timestamptz | NO | now() | — | — |

### Rules
- UNIQUE(school_id, name) — prevents duplicate type names per school.
- `default_coefficient` and `default_scale` are nullable template values.
  When NULL, the Assessment row must provide its own value.
- `default_coefficient > 0` when present, `default_scale >= 1` when present.
- ON DELETE: RESTRICT if any Assessment references this type (to be enforced
  at service level; Assessment.assessment_type_id FK already exists).
- updated_at trigger: YES. MUTABLE: YES.

### Template vs. Historical Truth
`AssessmentType.default_coefficient` is a suggested value for new
assessments. Once an Assessment is created, its own `coefficient` is the
historical truth. Changing AssessmentType defaults does NOT retroactively
alter existing assessments.

---

## 7. PedagogicalConfig — Target Contract

### Purpose
Versioned pedagogical configuration binding a school, level, and academic
year. Contains global policies (rounding, ranking, conduct) and references
ConfigSubject entries for per-subject rules.

### Target Columns

| Column | Type | Nullable | Default | FK | Constraint |
|--------|------|----------|---------|-----|------------|
| id | uuid | NO | gen_random_uuid() | — | PK |
| school_id | uuid | NO | — | school(id) | — |
| level_id | uuid | NO | — | level(id) | — |
| academic_year_id | uuid | NO | — | academic_year(id) | — |
| version | integer | NO | 1 | — | CHECK >= 1, UNIQUE(level_id, academic_year_id, version) |
| status | config_status | NO | 'draft' | — | — |
| calculation_policy | calculation_policy | NO | 'simple_average' | — | — |
| rounding_strategy | rounding_strategy | NO | 'half_up' | — | — |
| subject_decimal_places | integer | NO | 2 | — | CHECK >= 0 AND <= 6 |
| general_decimal_places | integer | NO | 2 | — | CHECK >= 0 AND <= 6 |
| ranking_enabled | boolean | NO | true | — | — |
| conduct_enabled | boolean | NO | false | — | — |
| conduct_included_in_average | boolean | NO | false | — | — |
| conduct_coefficient | numeric(6,2) | YES | '0' | — | CHECK >= 0 WHEN NOT NULL |
| conduct_scale | integer | YES | 20 | — | CHECK >= 1 WHEN NOT NULL |
| description | text | YES | — | — | — |
| created_at | timestamptz | NO | now() | — | — |
| updated_at | timestamptz | NO | now() | — | — |

### Rules
- UNIQUE(level_id, academic_year_id, version).
- `version >= 1`.
- `subject_decimal_places` and `general_decimal_places` in [0, 6].
- `conduct_coefficient >= 0` when not null.
- `conduct_scale >= 1` when not null.
- **MAXIMUM ONE ACTIVE per (level_id, academic_year_id).** Enforced by
  service layer and activation transaction (INV-M3-01, INV-M3-15, INV-M3-18).
  DB enforcement: partial unique index
  `UNIQUE(level_id, academic_year_id) WHERE status = 'active'`.
- Tenant consistency: `school_id` must match `level.school_id` and
  `academic_year.school_id`. Enforced by service validation (INV-M3-07).
- Status lifecycle: DRAFT (mutable) → ACTIVE (immutable) → ARCHIVED (immutable).
  Only DRAFT can be mutated. Transition DRAFT→ACTIVE is the activation
  transaction. ACTIVE→ARCHIVED happens when a new config is activated.
- ON DELETE: RESTRICT from level and academic_year. CASCADE to
  config_subject (child lifecycle).
- updated_at trigger: ACTIVE ONLY on DRAFT status.
  Implementation: the trigger always fires, but service layer rejects
  UPDATE on ACTIVE/ARCHIVED configs, so the trigger is a safety net only.

---

## 8. ConfigSubject — Target Contract

### Purpose
Source of truth for per-subject rules within a specific pedagogical
config version. ConfigSubject values OVERRIDE Subject defaults.

### Target Columns

| Column | Type | Nullable | Default | FK | Constraint |
|--------|------|----------|---------|-----|------------|
| id | uuid | NO | gen_random_uuid() | — | PK |
| config_id | uuid | NO | — | pedagogical_config(id) CASCADE | — |
| subject_id | uuid | NO | — | subject(id) | UNIQUE(config_id, subject_id) |
| coefficient | numeric(6,2) | NO | — | — | CHECK > 0 |
| scale | integer | NO | 20 | — | CHECK >= 1 |
| is_optional | boolean | NO | false | — | — |
| is_active | boolean | NO | true | — | — |
| include_in_average | boolean | NO | true | — | — |
| include_in_ranking | boolean | NO | true | — | — |
| include_in_decision | boolean | NO | true | — | — |
| assessment_aggregation | aggregation_policy | NO | 'weighted_average' | — | — |
| component_aggregation | aggregation_policy | NO | 'weighted_average' | — | — |
| sort_order | integer | NO | 0 | — | CHECK >= 0 |
| created_at | timestamptz | NO | now() | — | — |
| updated_at | timestamptz | NO | now() | — | — |

### Required vs. Nullable vs. Defaulted
- `coefficient`: REQUIRED, NO DEFAULT — must be explicitly set.
- `scale`: REQUIRED, DEFAULT 20.
- `is_optional`, `is_active`, `include_in_*`: REQUIRED, DEFAULTED.
- `assessment_aggregation`, `component_aggregation`: REQUIRED, DEFAULT 'weighted_average'.
- `sort_order`: REQUIRED, DEFAULT 0.

### Rules
- UNIQUE(config_id, subject_id) — one config subject entry per config per subject.
- `coefficient > 0`, `scale >= 1`, `sort_order >= 0`.
- Tenant invariant: `subject.school_id` must equal `pedagogical_config.school_id`
  (INV-M3-06). Enforced by service validation.
- ON DELETE config: CASCADE (strict child). ON DELETE subject: RESTRICT
  (preserve historical interpretability, INV-M3-14).
- updated_at trigger: YES. MUTABLE only when parent config is DRAFT.

### Override Contract
When a ConfigSubject row exists for a subject, its `coefficient`, `scale`,
`is_optional`, `is_active`, `include_in_average`, `include_in_ranking`,
`include_in_decision` are the authoritative values for M4 calculation.
Subject-level defaults are used ONLY when no ConfigSubject row exists
(which should not occur for an active config — enforced by activation validator).

---

## 9. ConfigComponent — Target Contract

### Purpose
Per-component rules within a ConfigSubject. The definitive values for
M4 calculation at the component level.

### Decision C-CC-01: `subject_component_id` nullability

**Decision: NOT NULL.**

**Rationale:** In the Daniélou model, every ConfigComponent must correspond
to a catalog SubjectComponent. The component catalogue (SubjectComponent) is
the single source of truth for what components exist for a subject. Allowing
ad-hoc components only in ConfigComponent would create orphaned components
with no catalogue reference, breaking the traceability chain. If a school
needs a new component, it should first create it in the SubjectComponent
catalogue, then reference it in ConfigComponent.

**Historical Impact:** Current data has 0 rows in both subject_component and
config_component. No migration needed for this decision.

**Validation Rule:** `subject_component_id` is NOT NULL. FK to
`subject_component(id)` with no ON DELETE (RESTRICT at service level to
preserve historical config interpretability).

### Target Columns

| Column | Type | Nullable | Default | FK | Constraint |
|--------|------|----------|---------|-----|------------|
| id | uuid | NO | gen_random_uuid() | — | PK |
| config_subject_id | uuid | NO | — | config_subject(id) CASCADE | — |
| subject_component_id | uuid | NO | — | subject_component(id) RESTRICT | — |
| name | text | NO | — | — | UNIQUE(config_subject_id, name) |
| sort_order | integer | NO | 0 | — | CHECK >= 0 |
| coefficient | numeric(6,2) | NO | '1' | — | CHECK > 0 |
| scale | integer | NO | 20 | — | CHECK >= 1 |
| is_required | boolean | NO | true | — | — |
| is_active | boolean | NO | true | — | — |
| assessment_aggregation | aggregation_policy | NO | 'weighted_average' | — | — |
| created_at | timestamptz | NO | now() | — | — |
| updated_at | timestamptz | NO | now() | — | — |

### Rules
- `subject_component_id` NOT NULL — must reference a catalogue entry.
- UNIQUE(config_subject_id, name) — no duplicate component names per config subject.
- Tenant invariant: `subject_component.subject_id` must equal
  `config_subject.subject_id` (INV-M3-08). Enforced by service validation.
- `coefficient > 0`, `scale >= 1`, `sort_order >= 0`.
- ON DELETE config_subject: CASCADE (strict child).
- ON DELETE subject_component: RESTRICT (preserve historical configs).
- updated_at trigger: YES. MUTABLE only when ancestor config is DRAFT.

---

## 10. Numeric Policy

All monetary/grading numeric fields use PostgreSQL `numeric` (exact decimal).
No FLOAT/REAL/DOUBLE PRECISION for business values.

| Field Family | PostgreSQL Type | Min | Max | Precision | Scale | Rationale |
|--------------|-----------------|-----|-----|-----------|-------|----------|
| coefficient (all tables) | numeric(6,2) | 0.01 | 9999.99 | 6 | 2 | Ivorian primary-school coefficients range 1-5; 6,2 allows headroom for edge cases. CHECK > 0. |
| scale (all tables) | integer | 1 | 999 | — | — | Grading scales are small integers (20, 10, 100). CHECK >= 1. |
| sort_order | integer | 0 | 999999 | — | — | Ordering only. CHECK >= 0. |
| version | integer | 1 | 999999 | — | — | Config versioning. CHECK >= 1. |
| subject_decimal_places | integer | 0 | 6 | — | — | Decimal precision for subject averages. CHECK >= 0 AND <= 6. |
| general_decimal_places | integer | 0 | 6 | — | — | Decimal precision for general averages. CHECK >= 0 AND <= 6. |
| conduct_coefficient | numeric(6,2) | 0.00 | 9999.99 | 6 | 2 | Conduct can be zero-weighted. CHECK >= 0 when not null. |
| conduct_scale | integer | 1 | 999 | — | — | Same as scale. CHECK >= 1 when not null. |
| raw_value (grade — M4) | numeric(8,4) | — | — | 8 | 4 | Already defined in M2. M3 does not alter. |
| average (report_card_item — M4) | numeric(8,4) | — | — | 8 | 4 | Already defined in M2. M3 does not alter. |
| general_average (report_card — M4) | numeric(8,4) | — | — | 8 | 4 | Already defined in M2. M3 does not alter. |

Precision rationale: numeric(6,2) for coefficients is deterministic, sufficient
for primary-school grading (where coefficients are typically integers or simple
decimals like 0.5, 1.5), and compatible with a future M4 calculation engine.
Precision 8,4 for averages is already established in M2 and provides 4 decimal
places of precision — sufficient for any rounding strategy.

---

## 11. Rounding Contract

### Supported Strategies

| Strategy | Enum Value | Definition |
|----------|-------------|------------|
| Half Up | `half_up` | 0.5 rounds up to next integer. Standard school rounding. |
| Half Even | `half_even` | Banker's rounding. 0.5 rounds to nearest even. Reduces cumulative bias. |
| Truncate | `truncate` | Discard decimal places. Always rounds toward zero. |

### Decimal Places

- `subject_decimal_places`: number of decimal places in the subject average.
  Range: [0, 6]. Default: 2.
- `general_decimal_places`: number of decimal places in the general average.
  Range: [0, 6]. Default: 2.

### Contract
These fields define the output precision for the M4 calculation engine.
M3 defines the contract; M4 implements the actual rounding function.
The rounding function must be deterministic: identical inputs produce
identical outputs regardless of PostgreSQL version.

---

## 12. Aggregation Semantics

### Enum: `aggregation_policy`

Values: `simple_average`, `weighted_average`, `single_grade`.

### Application Points

| Location | Field | What Is Aggregated | Weight Source |
|----------|-------|--------------------|---------------|
| ConfigSubject | `assessment_aggregation` | Assessment grades within a subject for a period | Assessment.coefficient (or AssessmentType.default_coefficient) |
| ConfigSubject | `component_aggregation` | Component averages within a subject | ConfigComponent.coefficient |
| PedagogicalConfig | `calculation_policy` | Subject averages into general average | ConfigSubject.coefficient |

### Semantics by Value

| Value | Meaning | Weight Source | No Eligible Values |
|-------|---------|---------------|-------------------|
| `simple_average` | Arithmetic mean of all eligible values. | None (equal weight). | Result is NULL (no average). |
| `weighted_average` | Sum of (value × weight) / sum of weights. | `coefficient` field of the child entity. | Result is NULL (no average). |
| `single_grade` | Only one value is expected. No averaging. | None. | If 0 values: NULL. If >1 values: SERVICE ERROR — `single_grade` policy requires exactly one eligible value. |

### Decision: Active Config Must Have Subjects (C-R01)

**C-R01 FINAL DECISION: REJECT_EMPTY_ACTIVE_CONFIG**

> **C-R01 RECONCILIATION (Targeted Reconciliation):** The previous version
> ALLOWED empty config activation with the rationale "no chicken-and-egg
> problem." This was flawed: DRAFT is mutable, so ConfigSubjects are added
> BEFORE activation. An ACTIVE config is immutable — subjects can never be
> added after activation. Activating empty creates a permanently useless
> immutable artifact (0 calculations, 0 rankings, 0 report card subjects).
> No legitimate Daniélou business case exists for an ACTIVE config with 0
> active ConfigSubjects.

A pedagogical configuration MUST have at least 1 active ConfigSubject to be activated.

Rationale: DRAFT is the mutable state where ConfigSubjects are added. There is
no chicken-and-egg problem because the admin adds subjects to the DRAFT config
first, then activates. An ACTIVE config is immutable — it cannot receive new
ConfigSubjects after activation. An ACTIVE config with 0 subjects produces
no subject averages, no rankings, and no report card data — it serves no
operational purpose and would require clone→add→activate→archive to recover
from, producing two empty archived configs.

---

## 13. Config Lifecycle

### Status Machine

```
DRAFT  ──(activate)──>  ACTIVE  ──(supersede)──>  ARCHIVED
  ^                      │
  └──── (clone) ─────────┘ (from ACTIVE, creates new DRAFT)
```

### Status Rules

| Status | Mutable? | Description |
|--------|-----------|-------------|
| DRAFT | YES | Fully editable. Can be modified, have subjects/components added/removed. |
| ACTIVE | NO | Immutable. No field changes, no subject/component additions or removals. |
| ARCHIVED | NO | Immutable. Historical record only. |

### Transitions

| From | To | Trigger | Atomic? |
|------|----|---------|----------|
| DRAFT | ACTIVE | Activation transaction | YES (INV-M3-15) |
| ACTIVE | ARCHIVED | Superseded by new activation | YES (within activation tx) |
| DRAFT | DRAFT | Clone (creates new DRAFT version) | YES (INV-M3-16) |

### Forbidden Transitions
- ACTIVE → DRAFT (never go backward)
- ARCHIVED → anything (never reactivate)
- DRAFT → ARCHIVED (archive only via supersession)
- Any status edit in place on ACTIVE or ARCHIVED

---

## 14. Clone Transaction Contract

### Purpose
Create a new DRAFT version of an existing config, copying all
ConfigSubject and ConfigComponent rows.

### Transaction

```
BEGIN

1. Lock source config row (SELECT ... FOR UPDATE)
2. Verify source status is ACTIVE or DRAFT
3. Allocate new version number (see §17)
4. INSERT new PedagogicalConfig row:
   - All policy fields COPIED from source
   - version = new_version
   - status = 'draft'
   - description = NULL (not copied)
5. For each ConfigSubject of source:
   INSERT new ConfigSubject with:
     - config_id = new config id
     - All other fields COPIED
     - NEW UUIDs
6. For each ConfigComponent of source ConfigSubjects:
   INSERT new ConfigComponent with:
     - config_subject_id = new config_subject id
     - subject_component_id = COPIED (same catalogue reference)
     - All other fields COPIED
     - NEW UUIDs
7. COMMIT
```

### Copy Semantics
- UUIDs: always NEW (gen_random_uuid()).
- `version`: new allocation (§17).
- `description`: NOT copied (reset to NULL for fresh draft).
- `status`: always 'draft'.
- All policy fields (calculation_policy, rounding_strategy, decimals, etc.): COPIED.
- All ConfigSubject fields: COPIED.
- All ConfigComponent fields: COPIED.
- `created_at`/`updated_at`: auto-generated (now()).

---

## 15. Activation Transaction Contract

### Purpose
Atomically transition a DRAFT config to ACTIVE, ensuring exactly one
ACTIVE config per (level, academic_year).

### Transaction

```
BEGIN

1. Lock target config row (SELECT ... FOR UPDATE)
2. Validate target: status must be 'draft'
3. Validate target: school/level/year consistency (INV-M3-07)
4. Validate all ConfigSubject tenant consistency (INV-M3-06)
5. Validate all ConfigComponent catalogue consistency (INV-M3-08)
6. Validate activation rules (§16)

7. Find current ACTIVE config for same (level_id, academic_year_id):
   SELECT ... FROM pedagogical_config
   WHERE level_id = ? AND academic_year_id = ? AND status = 'active'
   FOR UPDATE

8. If current active exists:
   UPDATE ... SET status = 'archived' WHERE id = current_active.id

9. Activate target:
   UPDATE ... SET status = 'active' WHERE id = target.id

10. Verify one-active invariant:
    SELECT count(*) FROM pedagogical_config
    WHERE level_id = ? AND academic_year_id = ? AND status = 'active'
    ASSERT count == 1

11. Audit mutation via audit_log

COMMIT
```

### Concurrency Strategy
- `SELECT ... FOR UPDATE` on the target config row provides row-level locking.
- The partial unique index `UNIQUE(level_id, academic_year_id) WHERE status = 'active'`
  is the DB-level last line of defense against >1 ACTIVE (INV-M3-18).
- If two concurrent activations race, one will hit the partial unique constraint
  violation and must retry (or fail with a clear conflict error).

---

## 16. Activation Validator Contract

### Function Signature
`validateConfigForActivation(configId: string, actor: SessionUser): ValidationResult`

### Validation Checks (in order)

| # | Check | Error on Failure |
|---|-------|-------------------|
| 1 | Config exists | CONFIG_NOT_FOUND |
| 2 | Config status == 'draft' | CONFIG_NOT_DRAFT |
| 3 | Config school == actor's active school | SCHOOL_MISMATCH |
| 4 | Config level belongs to config school | LEVEL_SCHOOL_MISMATCH |
| 5 | Config academic_year belongs to config school | YEAR_SCHOOL_MISMATCH |
| 6 | Config version >= 1 | INVALID_VERSION |
| 7 | No duplicate subjects in ConfigSubject | DUPLICATE_SUBJECT |
| 8 | All ConfigSubject.coefficient > 0 | INVALID_COEFFICIENT |
| 9 | All ConfigSubject.scale >= 1 | INVALID_SCALE |
| 10 | All ConfigSubject.sort_order >= 0 | INVALID_SORT_ORDER |
| 11 | Config subject_decimal_places in [0,6] | INVALID_DECIMALS |
| 12 | Config general_decimal_places in [0,6] | INVALID_DECIMALS |
| 13 | All ConfigSubject.assessment_aggregation is valid enum value | INVALID_AGGREGATION_POLICY |
| 14 | All ConfigSubject.component_aggregation is valid enum value | INVALID_AGGREGATION_POLICY |
| 15 | All ConfigComponent reference a SubjectComponent whose subject matches the ConfigSubject's subject (INV-M3-08) | COMPONENT_SUBJECT_MISMATCH |
| 16 | All ConfigComponent.coefficient > 0 | INVALID_COEFFICIENT |
| 17 | All ConfigComponent.scale >= 1 | INVALID_SCALE |
| 18 | All ConfigComponent.sort_order >= 0 | INVALID_SORT_ORDER |
| 19 | ConfigComponent UNIQUE(config_subject_id, name) not violated | DUPLICATE_COMPONENT_NAME |
| 20 | Active ConfigSubject count >= 1 | EMPTY_CONFIG |

> **C-R01 RECONCILIATION:** Check #20 replaces the previous "Empty Config
> Rule" which allowed 0 ConfigSubjects. See §12 for rationale.

---

## 17. Version Generation

### Strategy
`SELECT COALESCE(MAX(version), 0) + 1 FROM pedagogical_config
WHERE level_id = ? AND academic_year_id = ? FOR UPDATE`

### Concurrency Safety
- The `FOR UPDATE` lock on the target config row (obtained in clone or
  activation transaction) serializes concurrent version allocations for
  the same (level_id, academic_year_id) pair.
- The UNIQUE(level_id, academic_year_id, version) constraint is the DB-level
  last line of defense. If two transactions concurrently allocate the
  same version, one will fail on the unique constraint.
- On unique constraint violation, the transaction must be retried with
  a fresh version allocation.

### INV-M3-17 Testing
- Unit test: concurrent clone transactions on the same (level, year)
  produce distinct version numbers.
- Unit test: version numbers are monotonically increasing.
- Unit test: version 1 is used when no prior config exists.

---

## 18. Tenant / Cross-Row Invariants

### INV-M3-06: ConfigSubject subject school == Config school

**Enforcement:** SERVICE validation in clone and activation.
Query: `SELECT s.school_id FROM subject s JOIN config_subject cs ON cs.subject_id = s.id WHERE cs.config_id = ?`
Verify all results equal `config.school_id`.

No DB-level composite FK exists (would require a multi-hop path:
config_subject → subject → school). Service validation is the
appropriate mechanism.

### INV-M3-07: Config school == level school AND config school == academic_year school

**Enforcement:** SERVICE validation on every config mutation.
Query level: `SELECT school_id FROM level WHERE id = config.level_id`
Query year: `SELECT school_id FROM academic_year WHERE id = config.academic_year_id`
Verify both equal `config.school_id`.

Alternative future enhancement: composite FK trigger. Current decision:
service validation (sufficient for single-school Daniélou deployment).

### INV-M3-08: ConfigComponent component subject == ConfigSubject subject

**Enforcement:** SERVICE validation on every config_component mutation.
Query: `SELECT sc.subject_id FROM subject_component sc WHERE sc.id = ?`
Verify equals parent ConfigSubject.subject_id.

---

## 19. Delete / Historical Policy

| Table | ON DELETE FK Policy | Archive/Inactivate | Historical Impact |
|-------|---------------------|--------------------|--------------------|
| Subject | No FK from config_subject with CASCADE. Service: RESTRICT if any config_subject references exist. | Use `is_active = false` for soft inactivation. | INV-M3-14: deleting a subject must not destroy historical config interpretability. |
| SubjectComponent | CASCADE from subject. RESTRICT at service level if any config_component references exist. | Use `is_active = false`. | Same as subject. |
| AssessmentType | Service: RESTRICT if any Assessment references this type. | Use `is_active = false`. | Template deletion must not break existing assessments. |
| PedagogicalConfig | RESTRICT from level, academic_year. CASCADE to config_subject. | DRAFT: can be deleted. ACTIVE/ARCHIVED: service RESTRICT. | Active/archived configs are historical evidence. |
| ConfigSubject | CASCADE from pedagogical_config. RESTRICT from subject. | Cannot be independently archived — lifecycle follows parent config. | Child of config lifecycle. |
| ConfigComponent | CASCADE from config_subject. RESTRICT from subject_component. | Cannot be independently archived. | Child of config lifecycle. |

**Principle:** CASCADE only for strict child lifecycle (config →
config_subject → config_component). RESTRICT or service-level blocking
for catalogue roots (subject, subject_component, assessment_type) to
preserve historical config interpretability (INV-M3-14).

---

## 20. updated_at Policy

The existing `set_updated_at()` trigger function and trigger mechanism is
the canonical approach for all M3 tables.

| Table | Mutable? | updated_at? | Trigger Required? | Current? | Target Delta? |
|-------|-----------|-------------|-------------------|----------|---------------|
| subject | YES | YES | YES | YES | NO_CHANGE |
| subject_component | YES | YES | YES | YES | NO_CHANGE |
| assessment_type | YES | YES | YES | YES | NO_CHANGE |
| pedagogical_config | DRAFT only | YES | YES (fires always, service blocks ACTIVE/ARCHIVED mutations) | YES | SERVICE_INVARIANT |
| config_subject | DRAFT parent only | YES | YES (same pattern) | YES | SERVICE_INVARIANT |
| config_component | DRAFT ancestor only | YES | YES (same pattern) | YES | SERVICE_INVARIANT |

No second concurrent mechanism. The existing trigger is retained.
For ACTIVE/ARCHIVED configs, mutability is enforced at the service layer,
not by modifying the trigger.

---

## 21. INV-M3-01..25 — Frozen Registry

| ID | Invariant | Target Status | Implementation Status |
|----|-----------|---------------|----------------------|
| INV-M3-01 | Maximum 1 active config per level + academic year | FROZEN | PHASE_D |
| INV-M3-02 | Active config immutable | FROZEN | PHASE_D |
| INV-M3-03 | Archived config immutable | FROZEN | PHASE_D |
| INV-M3-04 | Only draft config mutable | FROZEN | PHASE_D |
| INV-M3-05 | New revision uses clone → draft | FROZEN | PHASE_D |
| INV-M3-06 | ConfigSubject.subject.school == PedagogicalConfig.school | FROZEN | PHASE_F |
| INV-M3-07 | Level / academic year / config school compatibility | FROZEN | PHASE_F |
| INV-M3-08 | ConfigComponent catalogue component belongs to ConfigSubject subject | FROZEN | PHASE_F |
| INV-M3-09 | Coefficient >= 0 (strictly > 0 for config values) | FROZEN | PHASE_D |
| INV-M3-10 | Scale > 0 (>= 1) | FROZEN | PHASE_D |
| INV-M3-11 | sort_order >= 0 | FROZEN | PHASE_D |
| INV-M3-12 | subject_average_decimals in [0,6] | FROZEN | PHASE_D |
| INV-M3-13 | general_average_decimals in [0,6] | FROZEN | PHASE_D |
| INV-M3-14 | Deleting catalog entries cannot destroy historical config evidence | FROZEN | PHASE_F |
| INV-M3-15 | Activation atomic | FROZEN | PHASE_D |
| INV-M3-16 | Clone atomic | FROZEN | PHASE_D |
| INV-M3-17 | Version generation concurrency-safe | FROZEN | PHASE_D |
| INV-M3-18 | Concurrent activation never yields >1 active config | FROZEN | PHASE_D |
| INV-M3-19 | M3 performs no Student mutations | FROZEN | CURRENT |
| INV-M3-20 | M3 performs no Enrollment mutations | FROZEN | CURRENT |
| INV-M3-21 | M3 performs no ClassroomAssignment mutations | FROZEN | CURRENT |
| INV-M3-22 | No hardcoded levels | FROZEN | CURRENT |
| INV-M3-23 | No hardcoded subjects | FROZEN | CURRENT |
| INV-M3-24 | All M3 mutations require server-side authorization | FROZEN | PHASE_F |
| INV-M3-25 | Fantomas permissions >= DB SUPER_ADMIN permissions | FROZEN | PHASE_G |

---

## 22. Invariant Enforcement Matrix

| INV | DB | Service | Transaction | Authorization | Test | E2E | Impl Phase |
|-----|-----|---------|-------------|---------------|------|-----|------------|
| INV-M3-01 | PRIMARY (partial unique) | SECONDARY | PRIMARY | — | PRIMARY | PRIMARY | D |
| INV-M3-02 | — | PRIMARY | — | PRIMARY | PRIMARY | PRIMARY | D |
| INV-M3-03 | — | PRIMARY | — | PRIMARY | PRIMARY | PRIMARY | D |
| INV-M3-04 | — | PRIMARY | — | PRIMARY | PRIMARY | PRIMARY | D |
| INV-M3-05 | — | PRIMARY | PRIMARY | PRIMARY | PRIMARY | PRIMARY | D |
| INV-M3-06 | — | PRIMARY | — | — | PRIMARY | — | F |
| INV-M3-07 | — | PRIMARY | — | — | PRIMARY | — | F |
| INV-M3-08 | — | PRIMARY | — | — | PRIMARY | — | F |
| INV-M3-09 | PRIMARY (CHECK) | SECONDARY | — | — | PRIMARY | — | D |
| INV-M3-10 | PRIMARY (CHECK) | SECONDARY | — | — | PRIMARY | — | D |
| INV-M3-11 | PRIMARY (CHECK) | SECONDARY | — | — | PRIMARY | — | D |
| INV-M3-12 | PRIMARY (CHECK) | SECONDARY | — | — | PRIMARY | — | D |
| INV-M3-13 | PRIMARY (CHECK) | SECONDARY | — | — | PRIMARY | — | D |
| INV-M3-14 | — | PRIMARY | — | — | PRIMARY | — | F |
| INV-M3-15 | SECONDARY | PRIMARY | PRIMARY | PRIMARY | PRIMARY | PRIMARY | D |
| INV-M3-16 | — | PRIMARY | PRIMARY | PRIMARY | PRIMARY | — | D |
| INV-M3-17 | PRIMARY (UNIQUE) | SECONDARY | PRIMARY | — | PRIMARY | — | D |
| INV-M3-18 | PRIMARY (partial unique) | SECONDARY | PRIMARY | — | PRIMARY | PRIMARY | D |
| INV-M3-19 | NOT_APPLICABLE | PRIMARY | NOT_APPLICABLE | NOT_APPLICABLE | PRIMARY | NOT_APPLICABLE | CURRENT |
| INV-M3-20 | NOT_APPLICABLE | PRIMARY | NOT_APPLICABLE | NOT_APPLICABLE | PRIMARY | NOT_APPLICABLE | CURRENT |
| INV-M3-21 | NOT_APPLICABLE | PRIMARY | NOT_APPLICABLE | NOT_APPLICABLE | PRIMARY | NOT_APPLICABLE | CURRENT |
| INV-M3-22 | NOT_APPLICABLE | NOT_APPLICABLE | NOT_APPLICABLE | NOT_APPLICABLE | PRIMARY | PRIMARY | CURRENT |
| INV-M3-23 | NOT_APPLICABLE | NOT_APPLICABLE | NOT_APPLICABLE | NOT_APPLICABLE | PRIMARY | PRIMARY | CURRENT |
| INV-M3-24 | NOT_APPLICABLE | PRIMARY | NOT_APPLICABLE | PRIMARY | PRIMARY | PRIMARY | F |
| INV-M3-25 | NOT_APPLICABLE | PRIMARY | NOT_APPLICABLE | PRIMARY | PRIMARY | PRIMARY | G |

---

## 23. Phase B Finding Disposition

| Finding | Severity | Status at End of C | Target Decision | Implementation Phase | Acceptance Test |
|---------|----------|-------------------|-----------------|-------------------|----------------|
| M3-F001 | MODERATE | RESOLVED_BY_DESIGN | CHECK constraints defined in target contract (§4-9, §10). Will be added as Phase D migration. | PHASE_D | Migration creates CHECK constraints; unit tests verify reject on invalid values. |
| M3-F002 | MODERATE | PLANNED_PHASE_E | Zod validation schemas will be created as part of API route development. | PHASE_E | All pedagogy API routes reject invalid input per Zod schemas. |
| M3-F003 | MODERATE | RESOLVED_BY_DESIGN | UNIQUE(school_id, name) on assessment_type defined in target (§6). Phase D migration. | PHASE_D | Migration adds unique index; test verifies duplicate rejection. |
| M3-F004 | LOW | PLANNED_PHASE_E | CRUD API routes and page components are Phase E deliverables. | PHASE_E | Navigation links resolve to functional pages; CRUD operations succeed. |
| M3-F005 | LOW | PLANNED_PHASE_D | `report_card.config_version_id` gets FK to `pedagogical_config(id)` in Phase D migration. | PHASE_D | Migration adds FK; test verifies referential integrity. |
| M3-F006 | LOW | RESOLVED_BY_DESIGN | UNIQUE(config_subject_id, name) on config_component defined in target (§9). Phase D migration. | PHASE_D | Migration adds unique index; test verifies duplicate rejection. |
| M3-F007 | LOW | ACCEPTED_NON_BLOCKING | Seed data is school-specific and acceptable for current single-school deployment. No action. | N/A | Seed file remains as-is; documented as school-specific. |
| M3-F008 | INFO | RESOLVED_BY_DESIGN | Override contract explicitly documented in §8. M4 calculation engine will use ConfigSubject values || Subject defaults. | PHASE_F | Unit test verifies override logic for each field. |

---

## 24. Current → Target Delta Matrix

### Subject

| Aspect | Current | Target | Delta | Rationale | Enforcement | Impl Phase |
|--------|---------|--------|------|-----------|-------------|------------|
| Columns (14) | All 14 present | Same 14 | NO_CHANGE | Schema is correct | — | — |
| CHECK coefficient | NONE | CHECK > 0 | ADD_CHECK | Prevent invalid values (M3-F001) | DB | D |
| CHECK default_scale | NONE | CHECK >= 1 | ADD_CHECK | Prevent zero/negative scale | DB | D |
| CHECK sort_order | NONE | CHECK >= 0 | ADD_CHECK | Prevent negative ordering | DB | D |
| ON DELETE policy | FK from config_subject, no ON DELETE | Service RESTRICT | SERVICE_INVARIANT | Preserve historical configs (INV-M3-14) | Service | F |

### SubjectComponent

| Aspect | Current | Target | Delta | Rationale | Enforcement | Impl Phase |
|--------|---------|--------|------|-----------|-------------|------------|
| Column: code | MISSING | `code text NULLABLE` | ADD_COLUMN | Support sub-component codes where used | — | D |
| Column: coefficient | present, NOT NULL, default '1' | ABSENT | CONTRACT_LATER | Coefficient belongs to ConfigComponent, not catalogue. 0 data, 0 runtime reads, 0 runtime writes in PROD (verified 6228c9b). | — | I |
| Column: scale | present, NOT NULL, default 20 | ABSENT | CONTRACT_LATER | Scale belongs to ConfigComponent, not catalogue. 0 data, 0 runtime reads, 0 runtime writes in PROD (verified 6228c9b). | — | I |
| Column: is_required | present, NOT NULL, default true | ABSENT | CONTRACT_LATER | Required-ness belongs to ConfigComponent, not catalogue. 0 data, 0 runtime reads, 0 runtime writes in PROD (verified 6228c9b). | — | I |
| PARTIAL UNIQUE code | NONE | UNIQUE(subject_id, code) WHERE code IS NOT NULL | ADD_PARTIAL_UNIQUE | Prevent duplicate codes when present | DB | D |
| CHECK sort_order | NONE | CHECK >= 0 | ADD_CHECK | Prevent negative ordering | DB | D |
| ON DELETE subject | CASCADE | CASCADE | NO_CHANGE | Components are strict children | DB | — |
| ON DELETE from config_component | FK exists, no ON DELETE | Service RESTRICT | SERVICE_INVARIANT | Preserve historical configs | Service | F |

> **C-R02 RECONCILIATION:** The 3 columns (coefficient, scale, is_required)
> were previously classified as REMOVE_IN_CONTRACT / Phase D. This was
> corrected: these are current-state columns (PRESENT in PROD) that are
> absent from the target model. They are redesign removals, not legacy
> fields. Per process purity (EXPAND adds, CONTRACT removes), their DROP
> is deferred to Phase I CONTRACT. Phase B "Legacy fields = 0" remains
> correct under its definition (no pre-M3 deprecated columns).

### AssessmentType

| Aspect | Current | Target | Delta | Rationale | Enforcement | Impl Phase |
|--------|---------|--------|------|-----------|-------------|------------|
| Column: default_coefficient | MISSING | `numeric(6,2) NULLABLE` | ADD_COLUMN | Template default for new assessments | — | D |
| Column: default_scale | MISSING | `integer NULLABLE` | ADD_COLUMN | Template default for new assessments | — | D |
| Column: is_active | MISSING | `boolean NOT NULL DEFAULT true` | ADD_COLUMN | Soft inactivation support | — | D |
| UNIQUE school/name | NONE | UNIQUE(school_id, name) | ADD_UNIQUE | Prevent duplicate types (M3-F003) | DB | D |
| CHECK default_coefficient | N/A | CHECK > 0 WHEN NOT NULL | ADD_CHECK | Validate when present | DB | D |
| CHECK default_scale | N/A | CHECK >= 1 WHEN NOT NULL | ADD_CHECK | Validate when present | DB | D |

### PedagogicalConfig

| Aspect | Current | Target | Delta | Rationale | Enforcement | Impl Phase |
|--------|---------|--------|------|-----------|-------------|------------|
| Columns (19) | All 19 present | Same 19 | NO_CHANGE | Schema is correct | — | — |
| PARTIAL UNIQUE active | NONE | UNIQUE(level_id, academic_year_id) WHERE status = 'active' | ADD_PARTIAL_UNIQUE | DB-level INV-M3-01 enforcement | DB | D |
| CHECK version | NONE | CHECK >= 1 | ADD_CHECK | Prevent invalid versions | DB | D |
| CHECK subject_decimal_places | NONE | CHECK >= 0 AND <= 6 | ADD_CHECK | INV-M3-12 | DB | D |
| CHECK general_decimal_places | NONE | CHECK >= 0 AND <= 6 | ADD_CHECK | INV-M3-13 | DB | D |
| CHECK conduct_coefficient | NONE | CHECK >= 0 WHEN NOT NULL | ADD_CHECK | Validate when present | DB | D |
| CHECK conduct_scale | NONE | CHECK >= 1 WHEN NOT NULL | ADD_CHECK | Validate when present | DB | D |
| DRAFT-only mutability | N/A | Service enforcement | SERVICE_INVARIANT | INV-M3-02, INV-M3-03, INV-M3-04 | Service | D |

### ConfigSubject

| Aspect | Current | Target | Delta | Rationale | Enforcement | Impl Phase |
|--------|---------|--------|------|-----------|-------------|------------|
| Column: is_optional | MISSING | `boolean NOT NULL DEFAULT false` | ADD_COLUMN | Per-config optionality override | — | D |
| Column: assessment_aggregation | MISSING | `aggregation_policy NOT NULL DEFAULT 'weighted_average'` | ADD_COLUMN | Per-subject assessment aggregation policy | — | D |
| Column: component_aggregation | MISSING | `aggregation_policy NOT NULL DEFAULT 'weighted_average'` | ADD_COLUMN | Per-subject component aggregation policy | — | D |
| CHECK coefficient | NONE | CHECK > 0 | ADD_CHECK | INV-M3-09 | DB | D |
| CHECK scale | NONE | CHECK >= 1 | ADD_CHECK | INV-M3-10 | DB | D |
| CHECK sort_order | NONE | CHECK >= 0 | ADD_CHECK | INV-M3-11 | DB | D |
| DRAFT-only mutability | N/A | Service enforcement (parent config status) | SERVICE_INVARIANT | Config immutability cascade | Service | D |

### ConfigComponent

| Aspect | Current | Target | Delta | Rationale | Enforcement | Impl Phase |
|--------|---------|--------|------|-----------|-------------|------------|
| Column: subject_component_id | `uuid NULLABLE` | `uuid NOT NULL` (C-CC-01) | ALTER_COLUMN | Must reference catalogue entry | DB + Service | D |
| Column: assessment_aggregation | MISSING | `aggregation_policy NOT NULL DEFAULT 'weighted_average'` | ADD_COLUMN | Per-component aggregation policy | — | D |
| UNIQUE config_subject_id, name | NONE | UNIQUE(config_subject_id, name) | ADD_UNIQUE | Prevent duplicate names (M3-F006) | DB | D |
| ON DELETE subject_component | FK exists, no ON DELETE | RESTRICT | CHANGE_DELETE_POLICY | Preserve historical configs | DB | D |
| CHECK coefficient | NONE | CHECK > 0 | ADD_CHECK | INV-M3-09 | DB | D |
| CHECK scale | NONE | CHECK >= 1 | ADD_CHECK | INV-M3-10 | DB | D |
| CHECK sort_order | NONE | CHECK >= 0 | ADD_CHECK | INV-M3-11 | DB | D |
| DRAFT-only mutability | N/A | Service enforcement (ancestor config status) | SERVICE_INVARIANT | Config immutability cascade | Service | D |

### report_card.config_version_id (cross-table)

| Aspect | Current | Target | Delta | Rationale | Enforcement | Impl Phase |
|--------|---------|--------|------|-----------|-------------|------------|
| FK to pedagogical_config | NONE | FK(pedagogical_config.id) | ADD_FK | Referential integrity (M3-F005) | DB | D |

---

## 25. Exact Phase D Scope

Phase D must produce a single Drizzle migration (0005) that applies the
following DB deltas:

| # | Table/Object | Action | Details |
|---|-------------|--------|---------|
| 1 | subject | ADD_CHECK | coefficient > 0 |
| 2 | subject | ADD_CHECK | default_scale >= 1 |
| 3 | subject | ADD_CHECK | sort_order >= 0 |
| 4 | subject_component | ADD_COLUMN | code text NULLABLE |
| 5 | subject_component | ADD_PARTIAL_UNIQUE | UNIQUE(subject_id, code) WHERE code IS NOT NULL |
| 6 | subject_component | ADD_CHECK | sort_order >= 0 |
| 7 | assessment_type | ADD_COLUMN | default_coefficient numeric(6,2) NULLABLE |
| 8 | assessment_type | ADD_COLUMN | default_scale integer NULLABLE |
| 9 | assessment_type | ADD_COLUMN | is_active boolean NOT NULL DEFAULT true |
| 10 | assessment_type | ADD_UNIQUE | UNIQUE(school_id, name) |
| 11 | assessment_type | ADD_CHECK | default_coefficient > 0 WHEN NOT NULL |
| 12 | assessment_type | ADD_CHECK | default_scale >= 1 WHEN NOT NULL |
| 13 | pedagogical_config | ADD_PARTIAL_UNIQUE | UNIQUE(level_id, academic_year_id) WHERE status = 'active' |
| 14 | pedagogical_config | ADD_CHECK | version >= 1 |
| 15 | pedagogical_config | ADD_CHECK | subject_decimal_places >= 0 AND <= 6 |
| 16 | pedagogical_config | ADD_CHECK | general_decimal_places >= 0 AND <= 6 |
| 17 | pedagogical_config | ADD_CHECK | conduct_coefficient >= 0 WHEN NOT NULL |
| 18 | pedagogical_config | ADD_CHECK | conduct_scale >= 1 WHEN NOT NULL |
| 19 | config_subject | ADD_COLUMN | is_optional boolean NOT NULL DEFAULT false |
| 20 | config_subject | ADD_COLUMN | assessment_aggregation aggregation_policy NOT NULL DEFAULT 'weighted_average' |
| 21 | config_subject | ADD_COLUMN | component_aggregation aggregation_policy NOT NULL DEFAULT 'weighted_average' |
| 22 | config_subject | ADD_CHECK | coefficient > 0 |
| 23 | config_subject | ADD_CHECK | scale >= 1 |
| 24 | config_subject | ADD_CHECK | sort_order >= 0 |
| 25 | config_component | ALTER_COLUMN | subject_component_id: NULLABLE → NOT NULL (C-CC-01) |
| 26 | config_component | ADD_COLUMN | assessment_aggregation aggregation_policy NOT NULL DEFAULT 'weighted_average' |
| 27 | config_component | ADD_UNIQUE | UNIQUE(config_subject_id, name) |
| 28 | config_component | ADD_CHECK | coefficient > 0 |
| 29 | config_component | ADD_CHECK | scale >= 1 |
| 30 | config_component | ADD_CHECK | sort_order >= 0 |
| 31 | config_component | CHANGE_DELETE_POLICY | subject_component_id FK: add ON DELETE RESTRICT |
| 32 | report_card | ADD_FK | config_version_id → pedagogical_config(id) |
| 33 | enum | ADD_ENUM_VALUE | aggregation_policy: simple_average, weighted_average, single_grade |

> **C-R02 RECONCILIATION:** Items 5-7 (DROP COLUMN coefficient, scale,
> is_required from subject_component) were removed from Phase D scope.
> These are redesign removals deferred to Phase I CONTRACT per process
> purity (EXPAND adds, CONTRACT removes). See §24 SubjectComponent
> section and §27.

**New enum required:** `aggregation_policy` with values `simple_average`,
`weighted_average`, `single_grade`. This enum is used by ConfigSubject
and ConfigComponent.

**Total DB delta objects: 33**

**Service-only deltas for Phase D:**
- Activation validator: add check #20 (active ConfigSubject count >= 1 → EMPTY_CONFIG rejection)

---

## 26. Forecast Phase E

Phase E will build the CRUD API routes and page components for all 6
pedagogy entities:

- `POST/GET/PUT/DELETE /api/matieres` (Subject)
- `POST/GET/PUT/DELETE /api/composantes` (SubjectComponent)
- `POST/GET/PUT/DELETE /api/types-evaluation` (AssessmentType)
- `POST/GET /api/regles-calcul` (PedagogicalConfig — create + list; update only DRAFT)
- Activation endpoint: `POST /api/regles-calcul/[id]/activate`
- Clone endpoint: `POST /api/regles-calcul/[id]/clone`
- ConfigSubject and ConfigComponent managed as sub-resources of PedagogicalConfig

Zod validation schemas for all entities (M3-F002).
Page components for navigation targets already defined in `navigation.ts`.

---

## 27. Forecast Phase I CONTRACT Scope

**M3 CONTRACT DB DROP SCOPE = 3 objects.**

The 3 columns dropped from `subject_component` are current-state columns
(absent from the M3 target model) that are redesign removals, not legacy
fields. They are:

| # | Table | Action | Column | Precondition Status |
|---|-------|--------|--------|---------------------|
| 1 | subject_component | DROP COLUMN | coefficient | 0 data, 0 runtime reads, 0 runtime writes — READY |
| 2 | subject_component | DROP COLUMN | scale | 0 data, 0 runtime reads, 0 runtime writes — READY |
| 3 | subject_component | DROP COLUMN | is_required | 0 data, 0 runtime reads, 0 runtime writes — READY |

> **C-R02 RECONCILIATION:** The previous version stated "VERIFICATION GATE
> ONLY" and "Phase I CONTRACT will be a CONTRACT READINESS VERIFICATION GATE."
> This was corrected: Phase I CONTRACT now includes 3 DROP COLUMN operations.
> The columns exist in PROD (verified at 6228c9b) but are absent from the
> target model. Per process purity (EXPAND adds, CONTRACT removes), they
> are dropped in Phase I, not Phase D. All preconditions (runtime reads = 0,
> runtime writes = 0) are already met.

Phase I CONTRACT will also include a VERIFICATION GATE that confirms:
- No M3 legacy structures remain.
- All Phase D deltas were applied correctly.
- No orphaned columns, constraints, or enums from pre-M3 state.
- The 3 dropped columns no longer exist in the schema.

**Rationale for Phase I vs Phase D:** Phase D is EXPAND (add new structures).
Phase I is CONTRACT (remove old structures, verify clean state). The 3
subject_component columns are current-state structures that the target
model removes. The Drizzle schema will be updated in Phase D to not define
them, but the physical DB columns persist until Phase I CONTRACT drops
them. This is consistent with the M2 precedent.

---

## 28. M4 Firewall

### M3 Owns
- Subject catalogue (CRUD, no calculation)
- SubjectComponent catalogue (CRUD, no calculation)
- AssessmentType templates (CRUD, no calculation)
- PedagogicalConfig versioning (create, clone, activate, archive)
- ConfigSubject per-config rules (CRUD within DRAFT)
- ConfigComponent per-component rules (CRUD within DRAFT)
- All M3 CHECK constraints, UNIQUE constraints, partial unique indexes
- Activation/clone transaction services
- RBAC for M3 entities
- Audit logging for M3 mutations

### M4+ Owns (NOT M3)
- Grade final model changes
- grade.student_id → enrollment_id migration
- grade.original_scale removal
- Full Assessment migration (if any changes needed)
- Calculation engine (subject average, general average, ranking)
- Absence handling implementation
- ReportCard calculation and generation
- Bulletins workflow

### Verification
No M3 migration, service, or test may implement M4 calculation logic.
No M3 document may define calculation algorithms beyond the policy
contracts (rounding, aggregation, decimal places) needed for
reproducibility.

---

## 29. Phase C Acceptance Decision

### Checklist

| Criterion | Status |
|-----------|--------|
| TARGET TABLE CONTRACTS | **FROZEN** — 6 entities defined in §4-9 |
| NUMERIC PRECISION | **FROZEN** — §10, all types specified |
| NULLABILITY DECISIONS | **FROZEN** — each column tagged REQUIRED/NULLABLE/DEFAULTED |
| AGGREGATION SEMANTICS | **FROZEN** — §12, 3 policies defined with semantics |
| ROUNDING CONTRACT | **FROZEN** — §11, 3 strategies + decimal ranges |
| CONFIG LIFECYCLE | **FROZEN** — §13, DRAFT/ACTIVE/ARCHIVED |
| CLONE TRANSACTION | **FROZEN** — §14, full transaction spec |
| ACTIVATION TRANSACTION | **FROZEN** — §15, full transaction spec |
| VERSION CONCURRENCY | **FROZEN** — §17, FOR UPDATE + UNIQUE fallback |
| ACTIVATION VALIDATOR | **FROZEN** — §16, 19 validation checks |
| TENANT INVARIANTS | **FROZEN** — §18, 3 cross-row invariants |
| DELETE POLICY | **FROZEN** — §19, full matrix |
| UPDATED_AT POLICY | **FROZEN** — §20, reuse existing trigger |
| INV-M3-01..25 | **FROZEN** — §21, 25/25 |
| ENFORCEMENT MATRIX | **COMPLETE** — §22, 25/25 |
| PHASE B FINDINGS | **DISPOSITIONED** — §23, 8/8 |
| CURRENT→TARGET DELTA | **COMPLETE** — §24, full matrix |
| PHASE D EXACT SCOPE | **KNOWN** — §25, 33 DB delta objects + 1 service-only delta |
| PHASE I CONTRACT FORECAST | **KNOWN** — §27, 3 DROP COLUMN + verification gate |
| M4 FIREWALL | **PASS** — §28 |
| DESIGN AMBIGUITIES | **0** — C-CC-01 resolved (NOT NULL), C-R01 resolved (REJECT), C-R02 resolved (CONTRACT_LATER) |
| CRITICAL OPEN | **0** |
| HIGH OPEN | **0** |

**FINAL PHASE C STATUS: PASS**

---

## 30. Scorecard

```
============================================================
DANIÉLOU R-V2
M3 PHASE C — TARGET MODEL & INVARIANTS FREEZE (RECONCILED)
============================================================

M3-B CHECKPOINT SHA             baa52e8
M3-C CHECKPOINT SHA             6228c9b
RECONCILIATION SHA              2449f75
RECOVERY STATUS                READY_TO_CONTINUE

SUBJECT CONTRACT               FROZEN
SUBJECT COMPONENT CONTRACT     FROZEN (C-R02 reconciled)
ASSESSMENT TYPE CONTRACT       FROZEN
PEDAGOGICAL CONFIG CONTRACT    FROZEN
CONFIG SUBJECT CONTRACT        FROZEN
CONFIG COMPONENT CONTRACT      FROZEN

CONFIG_COMPONENT FK DECISION   NOT NULL (C-CC-01)

NUMERIC POLICY                 FROZEN
ROUNDING POLICY                FROZEN
AGGREGATION SEMANTICS          FROZEN

DRAFT MUTABILITY               FROZEN
ACTIVE IMMUTABILITY            FROZEN
ARCHIVED IMMUTABILITY          FROZEN

CLONE CONTRACT                 FROZEN
ACTIVATION CONTRACT            FROZEN (C-R01: REJECT_EMPTY)
VERSION CONCURRENCY            FROZEN
ACTIVATION VALIDATOR           FROZEN (20 checks)

TENANT INVARIANTS              FROZEN
DELETE POLICY                  FROZEN
UPDATED_AT POLICY              FROZEN

INV-M3 REGISTRY                25/25 FROZEN
ENFORCEMENT MATRIX             25/25 COMPLETE

PHASE B FINDINGS:
RESOLVED_BY_DESIGN             4
PLANNED_PHASE_D                2
PLANNED_PHASE_E                1
PLANNED_PHASE_F                0
PLANNED_PHASE_G                0
ACCEPTED/DEFERRED              1

PHASE D DB DELTA OBJECTS       33
PHASE D SERVICE-ONLY DELTAS    1 (EMPTY_CONFIG check)
PHASE E DATA MIGRATION NEED    NONE
PHASE I CONTRACT DROP SCOPE    3 (subject_component cols)

M4 FIREWALL                    PASS

DESIGN AMBIGUITIES             0
CRITICAL OPEN                  0
HIGH OPEN                      0

PHASE D READINESS              GO

FINAL PHASE C STATUS           PASS
============================================================
```
