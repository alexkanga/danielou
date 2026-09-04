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

**STATUS**: CLOSED

**CONTRACT**: docs/planning/WS-002_COMPOSITION_ANNUAL_RESULTS_CONTRACT.md

**OBJECTIVE**

Implement/complete Composition, Passage and annual results behavior from
the CURRENT canonical repository using OWNER-approved business rules.

**MODULES**

| Module | Title | Status |
|--------|-------|--------|
| WS-002-M1 | Composition Calculation Core | CLOSED |
| WS-002-M2 | Composition Data Service | CLOSED |
| WS-002-M3 | Composition Workspace | CLOSED |
| WS-002-M4 | Annual Results & Decision | CLOSED |

---

## WS-003 — RÉSULTATS PAR PÉRIODE

**STATUS**: P0 CLOSED / PASS / CANONICAL / PRODUCTION VERIFIED

**CONTRACT**: docs/planning/WS-003_PERIOD_RESULTS_CONTRACT.md

**CONTRACT STATUS**: FROZEN

**OBJECTIVE**

Period-scoped student results: general averages, ranks, status display,
read-only via /dashboard/resultats with Year→Class→Period selection.

**PHASES**

| Phase | Scope | Status |
|-------|-------|--------|
| P0 | Period results read flow | CLOSED / PASS / PRODUCTION VERIFIED |
| P1 | Future enhancement | NOT STARTED |
| P2 | Future enhancement | NOT STARTED |
| M5 | Report cards | NOT STARTED |

**PR #7**: MERGED (SHA 569b0ad3b9786c3362b80920eb1102ce3685a8c9)

**GHOST EDGE FIX**: CANONICAL — Edge-compatible session comparison in src/lib/ghost-auth.ts

**IMPORTANT**

P0 completion does NOT authorize P1, P2, or M5.
Each requires explicit OWNER GO.

---

## Technical Backlog

**STATUS**: NON-BLOCKING

Non-blocking observations from the canonical baseline:

- school_membership V2 session loading completion
- real XLSX export implementation
- statistics depth verification
- recovery tooling verification
- existing non-blocking lint warnings

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
