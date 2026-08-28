# WS-002 — COMPOSITION & ANNUAL RESULTS
# WORKSTREAM CONTRACT R2 — OWNER FINAL DRAFT

## 1. Objective

Implement Composition (C1–C6), Passage, Annual Results, and the required promotion-decision workflow for the Daniélou school management system using the CURRENT canonical repository, OWNER-approved business rules (including absence, catch-up, Council, and derogation policies), and the existing academic_period / assessment / grade data architecture.

## 2. Canonical Baseline

| Item | Value |
|------|-------|
| Repository | https://github.com/alexkanga/danielou.git |
| Branch | main |
| SHA | abfc3ece39c36be437165a2e4f873aa9b42e6368 |
| Migration head | 0012_r_periods_01.sql |
| Tests | 24 files, 474 passed, 3 skipped |
| Quality gates | SQLite blocker → lint → typecheck → tests → build |
| Methodology | AI SOFTWARE ENGINEERING OS PILOT ACTIVE |

## 3. Existing Components to Reuse

| Component | Location | Reuse Classification |
|-----------|----------|----------------------|
| Decimal utilities (`add`, `multiply`, `divide`, `round`, `rawSimpleAverage`) | `src/lib/decimal.ts` | REUSABLE |
| Competition ranking (`calculateRanking`) | `src/lib/services/results/calculation-engine.ts` | REUSABLE |
| Grade status types (`GradeStatus`, `GradeStatusBehavior`) | `src/lib/services/results/types.ts` | REUSABLE — extended behavior per OWNER policy |
| `periodTypeEnum` (includes `composition`, `passage`) | `src/lib/db/schema/index.ts` | REUSABLE |
| `academic_period`, `assessment`, `grade` tables | `src/lib/db/schema/index.ts` | REUSABLE |
| `promotionDecisionEnum` | `src/lib/db/schema/index.ts` | REUSABLE WHERE COMPATIBLE — M4 to inspect fitness |
| Assessment/grade services and API routes | `src/lib/services/pedagogy/`, `src/app/api/` | REUSABLE |
| AppShell / navigation / shared UI | `src/components/`, `src/app/(dashboard)/` | REUSABLE |
| Authorization (RBAC V2, `requireAuthorizedSession`) | `src/lib/authorization.ts`, `src/lib/server-guards.ts` | REUSABLE |
| TanStack Query, Zod validations | Client fetching, input validation | REUSABLE |
| Audit logging (`logPedagogyAudit`, `auditGhostAction`) | `src/lib/audit.ts` | REUSABLE for decision auditability |

| Component | Reuse Limitation |
|-----------|-----------------|
| `GRADE_STATUS_BEHAVIOR` map | PARTIAL — current mapping marks AI as EXCLUDED. R2 requires AI = penalizing zero (CONTRIBUTES with earned=0). AJ, EXEMPT, NE = NEUTRAL (EXCLUDED from both earned and max). PENDING = INCOMPLETE. M1 must implement the corrected Composition-specific behavior. |
| `calculateClassStatistics` (M5) | NOT REUSABLE — uses official averages. Composition class average MUST use student RAW averages. |
| `calculateGeneralAverage` (M5) | NOT REUSABLE — implements weighted/simple/subject-policy general average. Composition uses sum-earned / sum-max × 10. |
| Report card service | REUSE WHERE APPLICABLE — not a complete Composition engine. |

## 4. Authoritative Business Rules

### BR-WS002-01: Composition Model

A Composition is a GRADED academic period. The annual cycle requires C1, C2, C3, C4, C5, C6, and Passage. Passage is also a GRADED period, NOT a decision-only workflow. Composition and Passage use assessments/grades stored through the current canonical academic_period / assessment / grade architecture.

### BR-WS002-02: Evaluation Status Policy

The current canonical grade data model separates NUMERIC VALUE + GRADE STATUS. This architecture is preserved.

**GRADED** — earned = raw numeric grade, maximum = assessment scale. Both numerator and denominator contribute normally.

**ABSENT_UNEXCUSED (AI)** — Penalizing absence. Earned contribution = 0. Maximum contribution = full applicable assessment maximum. AI COUNTS AS ZERO. The semantic status `absent_unexcused` is preserved in storage; the calculation layer interprets AI as zero earned.

**ABSENT_EXCUSED (AJ)** — Justified neutral absence. Earned contribution = EXCLUDED. Maximum contribution = EXCLUDED. AJ does NOT artificially reduce the student's average. If a catch-up grade is later entered, status becomes `graded` with the catch-up value; calculation becomes standard.

**EXEMPT** — Assessment not applicable to the student. Earned contribution = EXCLUDED. Maximum contribution = EXCLUDED. Neutral.

**NOT_EVALUATED (NE)** — Explicitly non-evaluated/non-applicable. Earned contribution = EXCLUDED. Maximum contribution = EXCLUDED. Neutral.

**PENDING** — Applicable required result still expected. Must NOT be zero or neutralized. Makes the result INCOMPLETE.

**MISSING REQUIRED** — No grade/status record exists for an applicable required assessment when a result is expected. RESULT = INCOMPLETE. Never silently treated as 0, AJ, NE, or EXEMPT.

UI may display French labels (Saisie, AJ, AI, NE) but domain/storage preserves the canonical typed status model.

### BR-WS002-03: Composition Calculation

For one student and one Composition/Passage period:

```
studentRawAverage =
  (SUM(effective earned contributions) / SUM(effective maximum contributions)) × 10
```

Where effective contributions are determined by the status policy above.

Use Decimal arithmetic. Keep full internal precision. Do NOT hardcode denominators.

```
studentOfficialAverage = HALF_UP(studentRawAverage, 2)
```

### BR-WS002-04: Raw / Official Policy

- Assessment: RAW only.
- Intermediate calculation: retain Decimal precision.
- Composition result: RAW + OFFICIAL.
- Official Composition average: HALF_UP 2 decimals.
- Never destroy raw precision early.

### BR-WS002-05: Zero Effective Denominator

If after legitimate exclusions (all AJ/EXEMPT/NE), SUM(effective maximum contributions) = 0:

- Do NOT divide by zero.
- The Composition has no computable numeric average.
- Return explicit typed state: **NO_COMPUTABLE_RESULT**.
- Do not invent a numeric zero.
- For annual processing, this state is interpreted per BR-WS002-09.
- No database enum change in M1 to represent this pure domain state.

### BR-WS002-06: Class Average

- Class Composition average = mean(studentRawAverage) → HALF_UP2.
- NEVER = mean(studentOfficialAverage already rounded).
- Mandatory: avoids cumulative rounding errors.

### BR-WS002-07: Composition Ranking

- Competition ranking.
- Input: student OFFICIAL Composition average.
- rank = 1 + number of students with strictly higher official average.
- Equal official averages → equal rank.
- Reuse canonical `calculateRanking()`.

### BR-WS002-08: Passage Calculation

- Same raw/official Composition calculation principles: earned points / applicable maximum points × 10 → raw → HALF_UP2 official.
- Passage absence policy is SPECIAL (see BR-WS002-11).

### BR-WS002-09: Period-Level Regular Composition Policy

A regular Composition may produce: **CALCULATED**, **INCOMPLETE**, or **NO_COMPUTABLE_RESULT**.

- **CALCULATED** — Valid raw result exists (including AI resulting in 0). Contributes to regularRaw.
- **NO_COMPUTABLE_RESULT** — All applicable inputs are legitimate neutral states (AJ/EXEMPT/NE) with no computable result. The Composition is NEUTRAL for the regular annual average. Excluded from both SUM and COUNT of contributive regular Compositions. Justified absence does not become zero; the regular denominator adapts to actually contributive Compositions.
- **INCOMPLETE** — Required data is pending/missing. Annual result remains INCOMPLETE. Do NOT silently remove from annual denominator.

### BR-WS002-10: Dynamic Regular Annual Average

Let **CONTRIBUTIVE_REGULAR_PERIODS** = regular Compositions among C1–C6 having a numeric calculated raw result (including AI-zero but excluding NO_COMPUTABLE_RESULT).

```
regularRaw = SUM(raw averages of CONTRIBUTIVE_REGULAR_PERIODS) / COUNT(CONTRIBUTIVE_REGULAR_PERIODS)
```

Use Decimal arithmetic.

- If any required regular Composition is INCOMPLETE → ANNUAL RESULT = INCOMPLETE.
- If COUNT(CONTRIBUTIVE_REGULAR_PERIODS) = 0 → Route to **DECISION_COUNCIL**. Do NOT fabricate zero.

### BR-WS002-11: Passage Policy

- **CALCULATED** — Passage has valid numeric raw result (including AI interpreted as 0). `passageRaw` = calculated raw value. Annual calculation may proceed.
- **AI** — effective Passage result = 0. Passage remains present with full ×2 weight. `annualRaw = (regularRaw + (2 × 0)) / 3`. Automatic annual recommendation may proceed.
- **AJ without catch-up** — DO NOT calculate automatic final annual verdict. Status: **DECISION_COUNCIL**. Do NOT transform AJ Passage into zero. Do NOT neutralize Passage.
- **AJ then catch-up** — status becomes `graded`, raw value available. Recompute Passage normally; automatic annual calculation resumes.
- **PENDING / MISSING REQUIRED** — ANNUAL RESULT = **INCOMPLETE**. (Different from DECISION_COUNCIL: INCOMPLETE = required data still expected; DECISION_COUNCIL = system intentionally cannot issue automatic final decision.)
- **EXEMPT / NOT_EVALUATED** — No numeric Passage result → **DECISION_COUNCIL**. Do NOT fabricate a score.

### BR-WS002-12: Annual Formula

When regularRaw is available AND Passage has a valid numeric raw result (including AI=0):

```
annualRaw = (regularRaw + (2 × passageRaw)) / 3
```

MANDATORY PARENTHESES. Never write the ambiguous form `regularRaw + 2 × passageRaw / 3`.

```
annualOfficial = HALF_UP(annualRaw, 2)
```

Keep full Decimal precision before final rounding.

### BR-WS002-13: Annual Ranking

- Competition ranking.
- Input: annualOfficial.
- Equal annualOfficial → equal rank.
- Reuse canonical `calculateRanking()`.
- Students without computable annualOfficial (INCOMPLETE or DECISION_COUNCIL) must NOT receive a fabricated numeric rank. UI must display their state instead.

### BR-WS002-14: Automatic Promotion Recommendation

- Separate CALCULATED RESULT from PROMOTION DECISION.
- When annualOfficial is computable: compare with an applicable promotion threshold.
- Threshold must NOT be hardcoded as a universal constant. Use approved/configurable pedagogical rule. If current configuration lacks an appropriate threshold: M4 must identify this as a persistence/configuration gap before any migration decision.
- `annualOfficial >= threshold` → **PROPOSED_ADMITTED**
- `annualOfficial < threshold` → **PROPOSED_REPEAT**
- If automatic calculation is intentionally impossible (Passage AJ/NE/EXEMPT) → **DECISION_COUNCIL**
- Use existing `promotionDecisionEnum` where compatible.

### BR-WS002-15: Administrative / Council Decision

Authorized roles: **ADMIN**, **DIRECTION**. Ghost/Super Admin retain canonical privileged access. Teacher does NOT receive final administrative override authority.

- **DECISION_COUNCIL case**: Admin/Direction must issue final decision (ADMITTED or REPEAT) with mandatory comment/justification.
- **PROPOSED_REPEAT case**: Admin/Direction may confirm repeat or override by derogation (ADMITTED BY DEROGATION). Derogation requires mandatory justification.
- **PROPOSED_ADMITTED case**: Normal finalization according to workflow.

Never overwrite or falsify the mathematical annual average to match a Council decision. Preserve separately: annualRaw, annualOfficial, automatic recommendation, final administrative decision, decision justification, decision actor, decision timestamp/audit evidence.

### BR-WS002-16: Catch-Up (Rattrapage)

Catch-up is not a parallel calculation engine. Normal scenario:

- Before: status = `absent_excused`, raw = null
- After: status = `graded`, raw = actual catch-up value
- Canonical calculation automatically includes the new grade and its assessment maximum.
- Result recomputes normally.
- Preserve auditability through canonical mutation/audit patterns.

## 5. Functional Scope

- Composition periods C1–C6 and Passage as graded periods using canonical data model.
- Assessment creation/management for Composition and Passage periods.
- Grade entry/management with full status semantics: graded, AI, AJ, NE, exempt, pending.
- Per-student Composition raw/official results with OWNER-approved status policy.
- NO_COMPUTABLE_RESULT state when zero effective denominator.
- INCOMPLETE state when required information is missing or pending.
- Per-Composition class averages (from student RAW averages).
- Per-Composition rankings (competition ranking on official averages).
- Passage results with special absence policy.
- Dynamic denominator annual regular average.
- Annual raw/official results with Passage ×2 weighting.
- Annual ranking.
- INCOMPLETE and DECISION_COUNCIL states at annual level.
- Automatic promotion recommendation using configurable threshold.
- Admin/Direction final decision (confirm, derogate, Council decision).
- Mandatory decision justification where required.
- Decision auditability.
- UI integration into existing Daniélou dashboard architecture.
- Catch-up via canonical grade-edit workflow.

## 6. Out of Scope

- Old lost Composition implementation (ABANDONED).
- Historical reconstruction.
- New `annual_results` table, synthetic annual period, or new promotion table (unless proven necessary and separately authorized).
- Unrelated refactoring.
- New generic UI framework.
- V1→V2 role migration.
- Architecture hardening.
- Generic testing expansion.
- Modifying the mathematical annual average to represent a human decision.
- Teacher final administrative override authority.

## 7. Calculation Contracts

### 7.1 Composition/Passage Student Result

```
INPUT:  { assessments: [{earnedPoints?, maxPoints, status}] }

For each assessment, classify by status policy:
  graded           → earned=rawValue,      max=included
  absent_unexcused → earned=0,             max=included
  absent_excused   → earned=excluded,      max=excluded
  exempt           → earned=excluded,      max=excluded
  not_evaluated    → earned=excluded,      max=excluded
  pending          → RESULT = INCOMPLETE
  missing required → RESULT = INCOMPLETE

IF any pending/missing → RESULT STATUS = INCOMPLETE, no numeric result

effectiveMax = SUM(included maxPoints)
IF effectiveMax = 0 → NO_COMPUTABLE_RESULT, no numeric result

studentRawAverage = (SUM(effective earnedPoints) / effectiveMax) × 10
  [Decimal arithmetic, full precision]

studentOfficialAverage = HALF_UP(studentRawAverage, 2)

OUTPUT: {
  raw: string | null,           // null if INCOMPLETE or NO_COMPUTABLE_RESULT
  official: string | null,      // null if INCOMPLETE or NO_COMPUTABLE_RESULT
  status: CALCULATED | INCOMPLETE | NO_COMPUTABLE_RESULT
}
```

### 7.2 Composition/Passage Class Average

```
INPUT:  studentResults: { raw: string, status: CALCULATED }[]

eligibleRawAverages = students WHERE status = CALCULATED
IF eligibleRawAverages.length = 0 → NO_COMPUTABLE_RESULT for class

classRawAverage = mean(eligibleRawAverages)  [Decimal arithmetic]
classOfficialAverage = HALF_UP(classRawAverage, 2)

OUTPUT: { raw: string | null, official: string | null, status, studentCount }
```

### 7.3 Annual Result

```
INPUT:  {
  compositions: { periodKey, raw, status }[]   // C1–C6
  passage: { raw, status }
}

STEP 1: Regular processing
  FOR each composition:
    IF status = INCOMPLETE → annualStatus = INCOMPLETE
    IF status = CALCULATED (including AI-zero) → CONTRIBUTIVE
    IF status = NO_COMPUTABLE_RESULT (AJ/EXEMPT/NE neutral) → NEUTRAL (excluded)

  IF annualStatus = INCOMPLETE → OUTPUT { status: INCOMPLETE }

  IF COUNT(CONTRIBUTIVE) = 0 → annualStatus = DECISION_COUNCIL

  regularRaw = SUM(CONTRIBUTIVE.raw) / COUNT(CONTRIBUTIVE)
  [Decimal arithmetic]

STEP 2: Passage processing
  IF passage.status = INCOMPLETE/PENDING/MISSING → OUTPUT { status: INCOMPLETE }
  IF passage.status = NO_COMPUTABLE_RESULT (AJ/EXEMPT/NE) → annualStatus = DECISION_COUNCIL
  IF passage.status = CALCULATED → passageRaw = passage.raw (including AI=0)

  IF annualStatus = DECISION_COUNCIL → OUTPUT { status: DECISION_COUNCIL }

STEP 3: Annual formula
  annualRaw = (regularRaw + (2 × passageRaw)) / 3
  annualOfficial = HALF_UP(annualRaw, 2)

OUTPUT: {
  regularRaw: string,
  annualRaw: string,
  annualOfficial: string,
  status: CALCULATED | INCOMPLETE | DECISION_COUNCIL,
  automaticRecommendation: PROPOSED_ADMITTED | PROPOSED_REPEAT (when CALCULATED)
}
```

### 7.4 Annual Class Average

```
INPUT:  annualResults: { annualRaw: string, status: CALCULATED }[]

eligible = students WHERE status = CALCULATED
IF eligible.length = 0 → NO_COMPUTABLE_RESULT

classRaw = mean(eligible.annualRaw)
classOfficial = HALF_UP(classRaw, 2)

OUTPUT: { raw, official, status, studentCount }
```

## 8. Missing/Absence Semantics

See BR-WS002-02 and Section 7.1 above. Full matrix in Authoritative Status/Decision Matrix below.

## 9. Ranking Contracts

### Composition/Passage Ranking

- **Algorithm**: Competition ranking
- **Input**: student OFFICIAL average (status = CALCULATED only)
- **Implementation**: Reuse `calculateRanking()`
- Students with INCOMPLETE or NO_COMPUTABLE_RESULT excluded from ranking; UI displays their state.

### Annual Ranking

- **Algorithm**: Competition ranking
- **Input**: student annualOfficial (status = CALCULATED only)
- **Implementation**: Reuse `calculateRanking()`
- Students with INCOMPLETE or DECISION_COUNCIL excluded from ranking; UI displays their state.

No duplicate ranking logic.

## 10. Golden Regression Contract

### M1 Golden Tests

| Test Case | Input | Expected Raw | Expected Official |
|-----------|-------|-------------|-------------------|
| Basic Composition | 63 / 65 × 10 | 9.692307... | 9.69 |
| AI penalizing | all assessments AI (e.g. 3×20) | (0/60)×10 = 0 | 0.00 |
| AJ neutral | all assessments AJ | — | — (NO_COMPUTABLE_RESULT) |
| PENDING | one assessment pending | — | — (INCOMPLETE) |
| Missing required | no grade record | — | — (INCOMPLETE) |
| Mixed graded + AJ | 15/20 graded + 10/20 AJ | (15/20)×10 = 7.5 | 7.50 |
| Mixed graded + AI | 15/20 graded + 20 AI | (15/40)×10 = 3.75 | 3.75 |
| Class average (C3) | Golden dataset student raws | raw mean → HALF_UP2 | 8.88 |
| Class average WRONG | Same student officials rounded | — | 8.89 (REJECTED) |
| Ranking tie | two students 9.69 | — | rank 1, rank 1 |
| Passage same calc | same formula as Composition | same rules | same rules |

### M4 Golden Tests

| Test Case | Input | Expected |
|-----------|-------|----------|
| Annual basic | C1–C6=8, Passage=10 | regularRaw=8, annualRaw=9.333..., annualOfficial=9.33 |
| Regular AJ exclusion | C3=AJ (neutral), C1,C2,C4,C5,C6=8 | regularRaw=8, denominator=5 |
| Regular AI included | C3=AI (0), others=8 | regularRaw=(40+0)/6=6.666..., annualOfficial from this |
| Regular pending | C3=pending | annual INCOMPLETE |
| Passage AI | Passage=AI(0), regulars=8 | annualRaw=(8+0)/3=2.666..., annualOfficial=2.67 |
| Passage AJ | Passage=AJ, no catch-up | DECISION_COUNCIL |
| Passage pending | Passage=pending | annual INCOMPLETE |
| Annual ranking ties | two students 9.33 | rank 1, rank 1 |
| Derogation | auto=PROPOSED_REPEAT, Council=ADMITTED | math result unchanged, decision=ADMITTED |

### Reference Context

CP1 A — 2025-2026

### Golden Period Maximums (REFERENCE DATASET ONLY — NOT global constants)

C1: 60 | C2: 65 | C3: 80 | C4: 65 | C5: 80 | C6: 70 | Passage: 85

### Golden Class Averages

C1: 9.35 | C2: 8.41 | C3: 8.88 | C4: 8.55 | C5: 9.32 | C6: 9.10 | Passage: 9.05

### Golden Student Calculation

```
63 / 65 × 10 = 9.692307...
Official: 9.69 (HALF_UP2)
```

### Golden Class Average Regression

Class average MUST use student RAW averages before final rounding.

```
Expected C3 class value: 8.88
WRONG: 8.89 (caused by averaging already-rounded student official values)
```

### Golden Annual Calculation

```
C1–C6 = 8, Passage = 10
regularRaw = 8
annualRaw = (8 + (2 × 10)) / 3 = 9.333333...
annualOfficial = 9.33 (HALF_UP2)
```

## 11. Architecture Boundaries

### REUSE

- `src/lib/decimal.ts` — all arithmetic
- `calculateRanking()` — competition ranking
- Grade status types from `types.ts` — type foundation
- `periodTypeEnum` — `composition` and `passage`
- Canonical assessment/grade services, API routes
- AppShell, navigation, shared UI, TanStack Query
- Authorization, audit logging
- `promotionDecisionEnum` — where compatible for M4 decision persistence

### NEW CODE (minimum)

- M1: Composition calculation core (corrected status behavior, NO_COMPUTABLE_RESULT, class average from raw)
- M2: DB-to-calculation adapter service
- M3: Composition workspace UI
- M4: Annual aggregation, dynamic denominator, DECISION_COUNCIL, promotion recommendation, decision UI

### NOT DUPLICATED

- Ranking logic — reuse `calculateRanking`
- Decimal arithmetic — reuse `src/lib/decimal.ts`
- Assessment/grade CRUD — reuse canonical services
- Report card architecture — no forced use, no duplicate

### REPORT CARD RELATIONSHIP

REUSE WHERE APPLICABLE. Composition has its own explicit calculation contract.

### GRADE_STATUS_BEHAVIOR NOTE

The existing M5 `GRADE_STATUS_BEHAVIOR` map classifies AI as EXCLUDED. The Composition calculation implements its own corrected behavior: AI = earned 0, max included (penalizing). AJ, EXEMPT, NE = neutral (both excluded). PENDING/missing = INCOMPLETE. This is a Composition-specific interpretation; the M5 map is not modified.

## 12. Database Contract

**Initial position: DATABASE CHANGE NOT REQUIRED.**

WS-002 must use the CURRENT schema: `academic_period`, `assessment`, `grade`, existing pedagogical/configuration structures.

Annual results: prefer DERIVED COMPUTATION / READ MODEL from canonical data.

**M1–M3: NO DATABASE CHANGE.**

**M4**: REUSE FIRST. Must inspect whether existing canonical structures (`promotion_decision`, report-card fields, audit logging) can correctly persist: automatic recommendation, final decision, mandatory justification, decision actor/audit. If current schema cannot faithfully preserve OWNER-required decision semantics: STOP during M4, report exact persistence gap, request separately authorized migration. Do NOT create a new table for convenience.

**Prohibited**: `annual_results` table, synthetic annual period, new promotion table (unless proven necessary and separately authorized).

## 13. UI Target

- Integrate into existing Daniélou dashboard architecture.
- French-first UI consistent with existing application.
- Support all applicable grade states: numeric, AJ, AI, NE, exempt, pending/incomplete, NO_COMPUTABLE_RESULT.
- Catch-up: authorized user replaces AJ with numeric catch-up grade via canonical grade-edit workflow; results refresh.
- Display: raw/official result, INCOMPLETE, NO_COMPUTABLE_RESULT, DECISION_COUNCIL, class average, ranking.
- Annual results UI with automatic recommendation, Council decision, derogation (with mandatory justification).
- Loading, error, empty states.
- Admin/Direction decision workflow with mandatory justification fields.

## 14. Module Sequence M1–M4

| Module | Title | Depends On | DB Impact |
|--------|-------|-----------|-----------|
| M1 | Composition Calculation Core | None | NONE |
| M2 | Composition Data Service | M1 | NONE EXPECTED |
| M3 | Composition Workspace | M1, M2 | NONE EXPECTED |
| M4 | Annual Results & Decision | M1, M2 | REUSE FIRST; migration only if gap proven |

Each module: VERIFIED BASE → IMPLEMENT → TARGETED TESTS → FIX DEFECTS → QUALITY GATES → FUNCTIONAL VERIFY → REVIEW DIFF → COMMIT → PUSH → CLOSED → STOP

## 15. Global Definition of Done

1. C1–C6 and Passage work as graded periods.
2. Numeric, AI, AJ, NE, exempt, pending and missing-required semantics are correct.
3. AI is penalizing zero without destroying semantic status.
4. AJ is neutral and can be replaced by catch-up.
5. EXEMPT and NE are neutral (excluded from earned and max).
6. PENDING and missing-required produce INCOMPLETE.
7. Zero effective denominator produces NO_COMPUTABLE_RESULT.
8. Raw precision is preserved.
9. Official averages use HALF_UP2.
10. Class averages use raw student averages before final rounding.
11. Competition ranking uses official averages.
12. Dynamic regular annual denominator correctly handles AJ/EXEMPT/NE.
13. Passage AI is zero weighted ×2.
14. Passage AJ without catch-up routes to DECISION_COUNCIL.
15. Pending/missing data routes to INCOMPLETE.
16. Annual formula: `annualRaw = (regularRaw + (2 × passageRaw)) / 3`.
17. Annual ranking is correct.
18. Automatic promotion recommendation uses an approved threshold.
19. Admin/Direction can make required final Council decisions.
20. Derogation does NOT alter the mathematical result.
21. Mandatory decision justification enforced where required.
22. Decision is auditable.
23. All golden tests pass.
24. Existing 474 regressions remain PASS.
25. typecheck, lint, tests, build all PASS.
26. Required real user workflow verified.
27. No duplicate calculation/ranking architecture.
28. Any required DB migration separately justified and authorized.
29. Every module checkpoint committed and pushed.
30. PROJECT_STATE updated at closure.

## 16. Stop Conditions

- Per module: stop when module Definition of Done met and CLOSED.
- Between modules: STOP and await OWNER GO.
- If database change required: STOP, report, await OWNER authorization before migration.
- If defect in existing canonical code blocks WS-002: STOP, report, await OWNER decision.
- If golden regression tests cannot pass: STOP, report evidence, await OWNER decision.
- If M4 discovers persistence gap for decision semantics: STOP, report, await authorization.

## 17. Authoritative Status / Decision Matrix

### EVALUATION LEVEL

| Status | Earned contribution | Max contribution | Result effect |
|--------|--------------------|--------------------|---------------|
| `graded` | raw value | included | normal |
| `absent_unexcused` (AI) | 0 | included | penalizing |
| `absent_excused` (AJ) | excluded | excluded | neutral |
| `exempt` | excluded | excluded | neutral |
| `not_evaluated` (NE) | excluded | excluded | neutral |
| `pending` | none | none | INCOMPLETE |
| missing required | none | none | INCOMPLETE |

### REGULAR COMPOSITION / ANNUAL LEVEL

| Situation | Regular annual effect |
|-----------|----------------------|
| numeric Composition (CALCULATED) | contributes raw value to regularRaw |
| whole Composition AI (earned=0, max included) | contributes 0 to regularRaw |
| whole Composition AJ/EXEMPT/NE (NO_COMPUTABLE_RESULT) | excluded from regular denominator (neutral) |
| Composition PENDING/MISSING REQUIRED (INCOMPLETE) | annual INCOMPLETE |

### PASSAGE LEVEL

| Passage state | Annual effect |
|---------------|---------------|
| numeric (CALCULATED) | `passageRaw` weighted ×2 in annual formula |
| AI (penalizing zero) | 0 weighted ×2: `(regularRaw + 0) / 3` |
| AJ without catch-up | DECISION_COUNCIL |
| PENDING / MISSING REQUIRED | annual INCOMPLETE |
| EXEMPT / NE without numeric result | DECISION_COUNCIL |
| AJ then catch-up graded | recompute normally, automatic annual resumes |

### DECISION LEVEL

| Automatic state | Human action |
|-----------------|-------------|
| `proposed_admitted` | normal finalization according to workflow |
| `proposed_repeat` | may confirm repeat OR Admin/Direction may admit by derogation (mandatory justification) |
| `DECISION_COUNCIL` | Admin/Direction must decide admitted or repeat (mandatory justification) |
| override / derogation | mandatory justification |
| Council decision | mandatory justification |

## 18. Final Module Sequence

### WS-002-M1 — Composition Calculation Core

Pure deterministic domain functions: Composition/Passage student scoring (graded/AI/AJ/EXEMPT/NE/PENDING/missing-required), raw/official distinction, NO_COMPUTABLE_RESULT, class average from student RAW values, competition ranking reuse, M1 golden regressions (63/65→9.69, status matrix, AI penalizing, AJ neutral, pending→INCOMPLETE, zero-denominator→NO_COMPUTABLE_RESULT, C3 class=8.88). No DB, no API, no UI, no annual formula, no decision logic. Explicit typed domain results. No persistence changes.

### WS-002-M2 — Composition Data Service

Maps canonical PostgreSQL assessment/grade/status records into M1 pure domain calculation contract. Correctly classifies graded/AI/AJ/EXEMPT/NE/PENDING/missing-required. Derives maximums from canonical assessment data. No business formula duplication. No UI. No annual calculation. No schema change expected.

### WS-002-M3 — Composition Workspace

User-facing C1–C6 and Passage workspace in existing dashboard. Supports all grade states (numeric, AJ, AI, NE, exempt, pending/INCOMPLETE, NO_COMPUTABLE_RESULT). Catch-up via canonical grade-edit (replace AJ with numeric grade). Display: raw/official results, INCOMPLETE, NO_COMPUTABLE_RESULT, class average, ranking. No annual results. No decision workflow.

### WS-002-M4 — Annual Results & Decision

Dynamic regular denominator (AJ/EXEMPT/NE excluded, AI included as 0). Passage ×2 weighting. Annual formula: (regularRaw + 2×passageRaw)/3. INCOMPLETE and DECISION_COUNCIL states. Automatic promotion recommendation (configurable threshold). Admin/Direction final decision (confirm, derogation, Council). Mandatory justification. Auditability. Annual ranking. Annual UI. Golden tests (C1–C6=8, Passage=10 → 9.33; AJ exclusion; AI inclusion; Passage AJ → DECISION_COUNCIL; ranking ties; derogation). REUSE FIRST for persistence. Migration only if gap proven and separately authorized.

## 19. Deferred M4 Owner Binding

The promotion threshold policy is structurally defined by this contract,
but the concrete applicable threshold/value and its canonical
configuration source must be verified/frozen before WS-002-M4
implementation.

The threshold must:

- be configurable/approved;
- not be hardcoded as a universal constant;
- be associated with the applicable pedagogical context as required by
  the canonical project design.

This deferred binding:

- DOES NOT BLOCK WS-002-M1
- DOES NOT BLOCK WS-002-M2
- DOES NOT BLOCK WS-002-M3

It MUST be resolved before implementing the automatic promotion
recommendation in WS-002-M4.
