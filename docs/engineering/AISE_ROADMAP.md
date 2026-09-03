# AISE — CANONICAL ROADMAP

**Authority:**
Subordinate to S0 (AI Software Engineering OS). S0 remains the
constitutional authority. This roadmap defines component topology,
sequence, responsibility boundaries, implementation status, planned
components, and transverse route protocols.

**Invariants:**
- PLANNED ≠ AUTHORIZED ≠ IMPLEMENTED ≠ CANONICAL.
- ROADMAP presence does NOT authorize execution. OWNER GO is required.
- Once canonical, component numbering, renaming, merging, or deletion
  requires GOVERNANCE route, evidence, impact analysis, and OWNER
  approval.
- The next component does NOT automatically start when the previous
  one closes.

**Pilot:** Daniélou
**Status:** ACTIVE

---

## COMPONENT STATUS MODEL

```
PLANNED               Defined but not yet implemented
AUTHORIZED             OWNER has issued GO for implementation
IN_PROGRESS            Implementation under way
CLOSED / PASS / CANONICAL  Implemented and integrated on canonical main
SUPERSEDED             Replaced by a later canonical version
BLOCKED                Cannot proceed until a precondition is resolved
```

---

## CONTROL PLANE

### S0 — AI SOFTWARE ENGINEERING OS

**File:** `docs/engineering/AI_SOFTWARE_ENGINEERING_OS.md`
**Question:** How must AISE-managed engineering behave?
**Role:** Constitutional governance and universal invariants.
**Status:** CLOSED / PASS / CANONICAL

---

### S1 — UNIVERSAL LAUNCHER

**File:** `docs/engineering/AISE_UNIVERSAL_LAUNCHER.md`
**Question:** How do we safely enter a session?
**Role:** Start/resume one engineering session from verified state.
**Status:** CLOSED / PASS / CANONICAL

---

### S2 — TASK ROUTER

**File:** `docs/engineering/AISE_TASK_ROUTER.md`
**Question:** What kind of work is this?
**Role:** Classify the authorized engineering unit and choose the
correct route.
**Status:** CLOSED / PASS / CANONICAL

---

## DELIVERY SPINE

Sequential lifecycle for greenfield product delivery.

---

### S3 — NEW PROJECT BOOTSTRAP PROTOCOL

**File:** `docs/engineering/AISE_NEW_PROJECT_BOOTSTRAP.md`
**Question:** How do we establish a new AISE-governed project?
**Role:** Create a verified, canonical, AISE-governed,
discovery-ready project repository.
**Primary Outputs:** canonical repository, AISE control plane,
AISE_MANIFEST, PROJECT_STATE.
**Status:** CLOSED / PASS / CANONICAL

---

### S4 — PROJECT DISCOVERY / CHARTER

**File:** `docs/engineering/AISE_PROJECT_DISCOVERY_CHARTER.md`
**Question:** Why are we building this, for whom, and within what
boundary?
**Role:** Transform an OWNER idea into an approved PROJECT CHARTER.
**Primary Output:** PROJECT_CHARTER.
**Status:** CLOSED / PASS / CANONICAL

---

### S5 — PRODUCT REQUIREMENTS / CAHIER DES CHARGES

**File:** `docs/engineering/AISE_PRODUCT_REQUIREMENTS.md`
**Question:** Exactly WHAT must the product do?
**Role:** Transform an approved Charter into a precise, testable,
traceable product requirements specification.
**Primary Output:** PRODUCT_REQUIREMENTS.
**Status:** CLOSED / PASS / CANONICAL

---

### S6 — TECHNICAL SPECIFICATION

**File:** `docs/engineering/AISE_TECHNICAL_SPECIFICATION.md`
**Question:** HOW will the approved product requirements be technically
realized?
**Role:** Define the technical solution that realizes the approved
product requirements.
**Primary Concerns:** architecture, technology selection,
data architecture, interfaces, security design, testing strategy,
deployment design, technical NFR realization, integration design.
**Primary Output:** TECHNICAL_SPECIFICATION.
**Status:** CLOSED / PASS / CANONICAL

S6 does NOT produce the implementation roadmap.

---

### S7 — PROJECT MANIFEST + ADR

**File:** `docs/engineering/AISE_PROJECT_MANIFEST_ADR.md`
**Question:** What technical decisions and structural facts must remain
canonical throughout the project's life?
**Role:** Convert approved S6 design into durable technical memory.
**Primary Outputs:** PROJECT_MANIFEST, Architecture Decision Records
(ADRs).
**Expected Contents:** selected stack, architecture style, major
boundaries, canonical infrastructure choices, data/storage decisions,
auth/security decisions, deployment model, important rejected
alternatives, decision rationale, consequences, immutable/frozen
technical constraints where applicable.
**Status:** CLOSED / PASS / CANONICAL

S7 is NOT another Technical Specification. S6 describes the
technical solution. S7 preserves the canonical technical decisions
and rationale needed for continuity.

---

### S8 — ROADMAP / MILESTONE DESIGN

**Question:** In what verified order should the approved product be
delivered?
**Inputs:** S5, S6, S7.
**Primary Outputs:** delivery roadmap, milestones, dependency
ordering, major workstreams, entry/exit conditions, requirement
coverage at milestone level.
**Status:** CLOSED / PASS / CANONICAL

S8 does NOT implement.

---

### S9 — MODULE CONTRACT / WORK PACKAGE

**Question:** What exactly is the next authorized unit of
implementation?
**Role:** Turn one S8 milestone/module slice into a bounded
executable contract.
**Primary Output:** MODULE_CONTRACT / WORK_PACKAGE.
**Expected Concepts:** purpose, requirements covered, in scope,
out of scope, business behavior, technical boundaries, acceptance
evidence, forbidden expansion, entry conditions, exit conditions.
**Status:** CLOSED / PASS / CANONICAL

---

### S10 — IMPLEMENTATION EXECUTION PROTOCOL

**Question:** How is one authorized work package implemented
correctly?
**Role:** Execute one authorized work package. This is where
application implementation occurs.
**Core Loop:**
```
VERIFIED BASE
→ INSPECT / REUSE
→ MINIMUM SUFFICIENT CHANGE
→ TARGETED TESTS
→ FIX OBSERVED DEFECTS
→ QUALITY GATES
→ FUNCTIONAL VERIFY
→ DIFF
→ COMMIT / PUSH
→ UPDATE STATE
→ STOP
```
**Status:** CLOSED / PASS / CANONICAL

---

### S11 — VERIFICATION & ACCEPTANCE

**Question:** Does the implemented unit actually conform to its
approved contracts?
**Role:** Prove conformance through evidence, not assertion.
**Traceability:**
```
S5 REQUIREMENT → S8 MILESTONE → S9 WORK PACKAGE →
IMPLEMENTATION → TEST / EVIDENCE → PASS / FAIL
```
**Primary Output:** VERIFICATION / ACCEPTANCE EVIDENCE.
**Status:** CLOSED / PASS / CANONICAL

No manufactured PASS.

---

### S12 — RELEASE READINESS / PREPRODUCTION

**Question:** Is the verified change actually ready to be released?
**Primary Concerns:** critical requirements PASS, preproduction
verification, migration readiness, rollback readiness where relevant,
configuration readiness, known issues, release candidate integrity,
material blockers.
**Primary Output:** RELEASE_READINESS_REPORT.
**Status:** CLOSED / PASS / CANONICAL

Critical/material HIGH issues may block.
Moderate/LOW observations do not automatically become blocking
workstreams.

---

### S13 — PRODUCTION DEPLOYMENT & VERIFICATION

**Question:** Can the approved release be deployed to production safely
and verified there?
**Required Principle:** PREPRODUCTION PASS ≠ PRODUCTION PASS.
**Primary Flow:**
```
OWNER PROD GO → VERIFY TARGET → DEPLOY →
MIGRATION IF AUTHORIZED → SMOKE / CRITICAL FUNCTIONAL VERIFY →
OBSERVE ACTUAL RESULT → PASS OR RECOVERY
```
**Primary Output:** PRODUCTION_VERIFICATION_REPORT.
**Status:** CLOSED / PASS / CANONICAL

Explicit OWNER production gate required.

---

### S14 — OPERATIONAL HANDOVER / BASELINE CLOSURE

**Question:** What is the new canonical project truth after delivery?
**Role:** Close the feedback loop between intended state and verified
production state.
**Updates:** PROJECT_STATE, canonical main HEAD, production version,
delivered requirements, migration state, known backlog, operational/
runbook pointers, release status, next authorized unit.
**Primary Output:** NEW CANONICAL BASELINE.
**Status:** CLOSED / PASS / CANONICAL

Canonical cycle: INTENDED STATE → IMPLEMENTATION → VERIFICATION
→ PRODUCTION → NEW VERIFIED FACTUAL STATE.

---
CORE DELIVERY SPINE S0-S14: COMPLETE / CANONICAL

TRANSVERSE PROTOCOLS R1-R7: PLANNED

## TRANSVERSE ROUTE PROTOCOLS

These are NOT sequential lifecycle stages. They handle work types
that operate outside the S3-S14 delivery spine. Until an R-protocol
exists, current S0/S2 normative behavior remains authoritative.

---

### R1 — MODULE / CHANGE PROTOCOL

**Purpose:** Handle a bounded change inside an existing project
without replaying the full greenfield lifecycle.
**Status:** CLOSED / PASS / CANONICAL

---

### R2 — HOTFIX PROTOCOL

**Purpose:** Correct a PROVEN implementation defect relative to
clear approved intent.
**Status:** CLOSED / PASS / CANONICAL

---

### R3 — RECOVERY PROTOCOL

**Purpose:** Restore trusted continuity/state from canonical evidence.
Formalizes the recovery behavior already governed by S0.
**Status:** CLOSED / PASS / CANONICAL

---

### R4 — INVESTIGATION PROTOCOL

**Purpose:** Diagnose an unknown cause without silently becoming
implementation. Default: READ-ONLY.
**File:** `docs/engineering/AISE_INVESTIGATION_PROTOCOL.md`
**Status:** CLOSED / PASS / CANONICAL

---

### R5 — CONTRACT DIVERGENCE PROTOCOL

**Purpose:** Operationalize FACTUAL STATE ≠ INTENDED STATE.
**Classification:** implementation, test, fixture/data, environment,
specification, unknown.
**Invariants:** UNKNOWN → INVESTIGATE. NEVER UNKNOWN → WORKAROUND.
**File:** `docs/engineering/AISE_CONTRACT_DIVERGENCE_PROTOCOL.md`
**Status:** CLOSED / PASS / CANONICAL

---

### R6 — GOVERNANCE CHANGE PROTOCOL

**Purpose:** Modify AISE/project governance without silently
weakening frozen invariants.
**File:** `docs/engineering/AISE_GOVERNANCE_CHANGE_PROTOCOL.md`
**Status:** CLOSED / PASS / CANONICAL

---

### R7 — EXISTING PROJECT / BROWNFIELD ADOPTION

**Purpose:** Bring an already implemented project under AISE
governance.
**Typical Flow:**
```
VERIFY EXISTING REPOSITORY → INVENTORY FACTUAL STATE →
RECOVER / ESTABLISH INTENDED STATE → INSTALL AISE CONTROL PLANE →
CREATE AISE_MANIFEST → ESTABLISH PROJECT_STATE →
BASELINE EXISTING SYSTEM → OWNER-APPROVED ADOPTION
```
Must NOT pretend existing software is a greenfield S3 bootstrap.
**Status:** PLANNED

---

## ROUTE-TO-PROTOCOL RELATIONSHIP

| S2 Route               | Protocol          |
|------------------------|-------------------|
| NEW_PROJECT            | S3 delivery spine |
| MODULE                 | R1 → S8/S9/S10+   |
| HOTFIX                 | R2                |
| RECOVERY               | R3                |
| INVESTIGATION          | R4                |
| CONTRACT_DIVERGENCE    | R5                |
| GOVERNANCE             | R6                |
| EXISTING PROJECT       | R7                |

Until an R-protocol exists, S0/S2 normative behavior remains
authoritative.

---

## COMPONENT RESPONSIBILITY MAP

| Stage | Responsibility                                      |
|-------|-----------------------------------------------------|
| S4    | WHY / WHO / PROJECT BOUNDARY                       |
| S5    | WHAT PRODUCT BEHAVIOR                              |
| S6    | HOW TECHNICALLY                                    |
| S7    | CANONICAL TECHNICAL MEMORY / WHY DECISIONS MADE   |
| S8    | DELIVERY ORDER                                     |
| S9    | EXACT AUTHORIZED WORK UNIT                         |
| S10   | IMPLEMENTATION                                     |
| S11   | CONFORMANCE PROOF                                  |
| S12   | RELEASE READINESS                                  |
| S13   | PRODUCTION                                        |
| S14   | NEW CANONICAL BASELINE                            |

This separation is FROZEN as the roadmap architecture once
approved, subject only to explicit OWNER governance change.

---

## FUTURE — PRODUCTIZATION

After S0-S14 and required R-protocols are mature, AISE may later
enter a productization/consolidation phase. Possible outputs:

- Independent AISE repository
- Canonical templates (manifest, PROJECT_STATE, Charter,
  Requirements, Technical Specification, Module Contract)
- Manifest schema
- Conformance checks
- Versioning/distribution model

**Status:** FUTURE / NOT AUTHORIZED

No S15 is assigned. No packaging is implemented. Daniélou remains
the current pilot/reference environment.