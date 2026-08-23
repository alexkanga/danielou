# M3-C RECONCILIATION PASS

**Date:** 2026-08-23
**Branch:** v2/m3-pedagogy-configuration
**Previous M3-C SHA:** 6228c9b
**Reconciliation SHA:** 2449f75
**Phase:** M3 — Phase C Targeted Reconciliation

---

## Purpose

Targeted reconciliation of three structural decisions from Phase C
checkpoint 6228c9b, triggered by design review. No DB mutations, no
migration generation, no Phase D work.

---

## C-R01 — EMPTY CONFIG ACTIVATION

### Question
Existe-t-il un cas métier Daniélou légitime dans lequel une
PedagogicalConfig ACTIVE doit contenir ZERO ConfigSubject actif ?

### Answer
**NON.**

### Evidence
- DRAFT is mutable — ConfigSubjects are added BEFORE activation.
- ACTIVE is immutable — subjects can NEVER be added after activation.
- An ACTIVE config with 0 subjects produces 0 calculations, 0 rankings,
  0 report card data.
- No recovery path except clone→add→activate→archive, producing two
  empty archived configs.

### Decision
**C-R01 FINAL DECISION: REJECT_EMPTY_ACTIVE_CONFIG**

### Corrections Applied
| Location | Before | After |
|----------|--------|-------|
| §12 "0 Active Subjects Rule" | ALLOWED | REJECT — must have >= 1 active ConfigSubject |
| §16 Activation Validator | 19 checks, empty passes | 20 checks, check #20 = EMPTY_CONFIG rejection |
| §29 Checklist | Not mentioned | C-R01 resolved (REJECT) |
| §30 Scorecard | Not mentioned | ACTIVATION CONTRACT FROZEN (C-R01: REJECT_EMPTY) |

---

## C-R02 — SUBJECT_COMPONENT LEGACY FIELDS

### Question
Are `subject_component.coefficient`, `subject_component.scale`, and
`subject_component.is_required` legacy fields or target model redesign
removals?

### Evidence (verified at 6228c9b, PROD PostgreSQL)

| Column | Drizzle Schema | PROD PostgreSQL | Data | Runtime Reads | Runtime Writes |
|--------|---------------|-----------------|------|---------------|----------------|
| coefficient | PRESENT (line 198) | PRESENT (numeric, NOT NULL, default '1') | 0 rows | 0 | 0 |
| scale | PRESENT (line 199, `componentScale`) | PRESENT (integer, NOT NULL, default 20) | 0 rows | 0 | 0 |
| is_required | PRESENT (line 200, `isRequired`) | PRESENT (boolean, NOT NULL, default true) | 0 rows | 0 | 0 |

**Cas B: Columns PRESENT in current, ABSENT from target.**

### Phase B Legacy Field Conclusion
**CONFIRMED with clarification.** Phase B "Legacy fields = 0" is correct
under Phase B's definition (no pre-M3 deprecated columns). The 3 columns
are M3 redesign removals — they exist in current state but the target
model intentionally omits them.

### Internal Phase C Contradiction Found
§5 Target Columns table listed these 3 columns with types and CHECK
constraints, contradicting:
- §5 Purpose text ("No coefficient, scale, or required-flag")
- §24 Delta Matrix ("REMOVED / REMOVE_IN_CONTRACT")
- §27 ("dropped in Phase D migration 0005")

### Corrections Applied
| Location | Before | After |
|----------|--------|-------|
| §2 Phase B carry-forward | "Legacy fields: 0" | Split into "pre-M3 deprecated: 0" + "M3 redesign removals: 3" |
| §5 Target Columns table | 11 columns incl. coefficient/scale/is_required | 8 columns (removed 3) |
| §5 Rules | Listed `coefficient > 0, scale >= 1` | Explicitly states "No coefficient, scale, or is_required" |
| §24 Delta Matrix | 3x REMOVE_IN_CONTRACT / Phase D | 3x CONTRACT_LATER / Phase I |
| §25 Phase D Scope | 36 items (incl. 3 DROP COLUMN) | 33 items (DROP COLUMNs removed) |
| §27 Phase I Forecast | "VERIFICATION GATE ONLY" | 3 DROP COLUMN + verification gate |
| §29 Checklist | "36 delta objects" | "33 DB delta objects + 1 service-only delta" |
| §30 Scorecard | "PHASE I CONTRACT DROP SCOPE: VERIFICATION GATE ONLY" | "3 (subject_component cols)" |

---

## C-R03 — MIGRATION 0005 STATUS

### Evidence
- `drizzle/0005_*.sql`: **NOT EXISTS** (only 0000-0004 exist)
- `drizzle/meta/_journal.json`: **NOT EXISTS** (no Drizzle journal)
- §25 Phase D Scope: Correctly uses future tense ("Phase D must produce")

### Decision
Migration 0005 has NOT been created. §25 correctly describes it as a
planned future artifact. No correction needed for §25 framing.

---

## C-R05 — SUBJECT_COMPONENT_ID NULLABILITY

### Verification
C-CC-01 decision: `config_component.subject_component_id = NOT NULL`

Re-checked against:
- Catalogue obligation: Every ConfigComponent should reference a
  SubjectComponent — FROZEN, no new evidence contradicts
- Historical reproducibility: NOT NULL preserves traceability — CONFIRMED
- Tenant/subject consistency: NOT NULL enables INV-M3-08 enforcement — CONFIRMED
- Existing data: 0 config_component rows — safe to alter — CONFIRMED

### Decision
**NOT NULL — REMAINS FROZEN.** No change.

---

## Recalculated Delta Objects

### Phase D DB Delta Objects: 33

| # | Action | Count |
|---|--------|-------|
| ADD_CHECK | 18 |
| ADD_COLUMN | 7 |
| ADD_UNIQUE | 2 |
| ADD_PARTIAL_UNIQUE | 2 |
| ALTER_COLUMN | 1 |
| ADD_FK | 1 |
| CHANGE_DELETE_POLICY | 1 |
| ADD_ENUM_VALUE | 1 |
| **Total** | **33** |

### Phase D Service-Only Deltas: 1
- Activation validator check #20: EMPTY_CONFIG rejection

### Phase I CONTRACT Drop Scope: 3
| # | Table | Column | Precondition |
|---|-------|--------|-------------|
| 1 | subject_component | coefficient | READY (0 data, 0 reads, 0 writes) |
| 2 | subject_component | scale | READY (0 data, 0 reads, 0 writes) |
| 3 | subject_component | is_required | READY (0 data, 0 reads, 0 writes) |

---

## Acceptance

| Criterion | Status |
|-----------|--------|
| C-R01 EMPTY CONFIG ACTIVATION | **RESOLVED** — REJECT_EMPTY_ACTIVE_CONFIG |
| C-R02 LEGACY FIELD CONTRADICTION | **RESOLVED** — 3 CONTRACT_LATER / Phase I |
| C-R03 MIGRATION 0005 STATUS | **RESOLVED** — NOT CREATED, §25 correctly future tense |
| CURRENT→TARGET DELTA | **RECOMPUTED** — 33 DB + 1 service-only |
| PHASE D EXACT SCOPE | **FROZEN** — 33 DB delta objects |
| PHASE I CONTRACT SCOPE | **FROZEN** — 3 DROP COLUMN + verification gate |
| DESIGN AMBIGUITIES | **0** |
| CRITICAL OPEN | **0** |
| HIGH OPEN | **0** |

**RECONCILIATION STATUS: PASS**

---

## Final Scorecard

============================================================
M3 PHASE C — TARGETED RECONCILIATION
============================================================

EMPTY ACTIVE CONFIG:
REJECT

SUBJECT_COMPONENT.coefficient:
CURRENT=PRESENT / TARGET=ABSENT / DISPOSITION=CONTRACT_LATER Phase I

SUBJECT_COMPONENT.scale:
CURRENT=PRESENT / TARGET=ABSENT / DISPOSITION=CONTRACT_LATER Phase I

SUBJECT_COMPONENT.is_required:
CURRENT=PRESENT / TARGET=ABSENT / DISPOSITION=CONTRACT_LATER Phase I

PHASE B LEGACY FIELD CONCLUSION:
CONFIRMED (0 pre-M3 deprecated; 3 M3 redesign removals documented)

MIGRATION 0005 FILE:
NOT CREATED

MIGRATION 0005 APPLIED:
NO

PHASE D DB DELTA OBJECTS:
33

PHASE I CONTRACT DROP SCOPE:
3 (subject_component.coefficient, .scale, .is_required)

CONFIG_COMPONENT.subject_component_id:
NOT NULL (unchanged)

DESIGN AMBIGUITIES:
0

CRITICAL OPEN:
0

HIGH OPEN:
0

PHASE D READINESS:
GO

FINAL STATUS:
PASS
============================================================
