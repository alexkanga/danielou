# Daniélou — Roadmap

## WS-001 — AI SOFTWARE ENGINEERING OS ADOPTION

**STATUS**: CLOSED

**OBJECTIVE**

Make the repository self-describing enough for deterministic continuation
by another AI agent or human developer.

**STEPS**

| Step | Status |
|------|--------|
| D-OS-0 | CLOSED |
| D-OS-1A | CLOSED |
| D-OS-1B | CLOSED |

**FUNCTIONAL DEVELOPMENT**: NONE

---

## WS-002 — COMPOSITION & ANNUAL RESULTS

**STATUS**: ACTIVE — CONTRACT APPROVED

**CONTRACT**: docs/planning/WS-002_COMPOSITION_ANNUAL_RESULTS_CONTRACT.md

**POSITION**: NEXT FUNCTIONAL WORKSTREAM

**OBJECTIVE**

Implement/complete Composition, Passage and annual results behavior from
the CURRENT canonical repository using OWNER-approved business rules.

**DEPENDENCIES**

WS-001 CLOSED.

NO dependency on:

- V1→V2 role migration
- architecture hardening
- generic testing expansion
- lint cleanup
- historical Composition recovery

**MODULES**

| Module | Title | Status |
|--------|-------|--------|
| WS-002-M1 | Composition Calculation Core | CLOSED |
| WS-002-M2 | Composition Data Service | CLOSED |
| WS-002-M3 | Composition Workspace | READY / NEXT |
| WS-002-M4 | Annual Results & Decision | PLANNED |

**OUT OF SCOPE**

- old lost Composition implementation
- historical reconstruction
- unrelated refactoring
- unapproved architecture changes

**DEFINITION OF DONE**

Defined in the approved WS-002 contract.

---

## WS-003 — DEFERRED PRODUCT / TECHNICAL BACKLOG

**STATUS**: NON-BLOCKING

**PURPOSE**

Store genuine non-blocking observations from the canonical baseline.

Concise entries:

- school_membership V2 session loading completion;
- real XLSX export implementation;
- statistics depth verification;
- recovery tooling verification;
- Edge Runtime crypto warning;
- deprecated middleware convention;
- existing non-blocking lint warnings.

**IMPORTANT**

WS-003 IS NOT AN EXECUTION PLAN.

A backlog item becomes authorized work only when:

1. OWNER explicitly prioritizes it;
   or
2. it materially blocks an authorized functional module;
   or
3. an observed defect requires it.

---

## Release Principle

Release is a GATE.

It is not a generic workstream.

MODULE CLOSED ≠ PRODUCTION DEPLOYED

Production requires explicit OWNER GO.
