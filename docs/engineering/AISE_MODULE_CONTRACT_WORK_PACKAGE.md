# AISE — MODULE CONTRACT / WORK PACKAGE

**Authority:** Subordinate to S0 (AI Software Engineering OS).
Reads from S5 (Product Requirements), S6 (Technical Specification),
S7 (Project Manifest + ADR), S8 (Roadmap / Milestone Design).

**Status:** ACTIVE PILOT

---

## 1. PURPOSE

S9 answers one question:

**WHAT EXACTLY IS THE NEXT AUTHORIZED UNIT OF IMPLEMENTATION?**

S9 transforms the approved roadmap and a selected milestone into an
OWNER-APPROVED WORK PACKAGE CONTRACT that S10 can implement without
inventing scope.

Canonical chain:

```
S8 defines milestone order and outcome
S9 defines one exact authorized work package
S10 implements that work package
S11 verifies conformance
```

S9 does NOT: implement code, create migrations, deploy, or start S10.

---

## 2. ENTRY PRECONDITIONS

```
DELIVERY_ROADMAP           APPROVED
SELECTED MILESTONE          IDENTIFIED
MILESTONE ENTRY CONDITIONS SATISFIED (or explicitly BLOCKED)
REQUIREMENTS COVERED        KNOWN
TECHNICAL BASELINE          APPROVED
BLOCKING PRODUCT AMBIGUITIES    0
BLOCKING TECHNICAL AMBIGUITIES  0
```

If not met: **S9 PRECONDITION NOT MET.** Do NOT create an
implementation contract by guessing missing behavior.

---

## 3. CANONICAL INPUTS

| Source | Provides |
|--------|----------|
| S5 | Requirements, business rules, acceptance semantics |
| S6 | Architecture, components, data design, interfaces |
| S7 | Canonical stack, boundaries, accepted decisions, ADRs |
| S8 | Selected milestone, entry/exit conditions, dependency order |

Do not use conversation memory as authoritative input.

---

## 4. WORK PACKAGE IS A CONTRACT, NOT A TASK LIST

A Work Package is a **BOUNDED IMPLEMENTATION CONTRACT** — not a
ticket, todo list, sprint, checklist, milestone copy, coding prompt,
or vague feature description. It must define enough intended behavior
and boundaries that S10 can implement without scope invention.

---

## 5. ONE AUTHORIZED UNIT

```
ONE WORK PACKAGE = ONE COHERENT IMPLEMENTATION UNIT
```

A WP may contain multiple code changes when required to realize one
coherent outcome. Do NOT split mechanically by file, layer, database
table, frontend/backend, or individual test. Do NOT combine unrelated
outcomes to reduce paperwork.

---

## 6. WORK PACKAGE IDENTIFIERS

```
WP-001, WP-002, ...
```
or milestone-linked: `WP-MS003-01` when useful.

Do not require one universal style if project conventions exist.
Do not silently renumber historical IDs.

---

## 7. WORK PACKAGE STATUS MODEL

```
DRAFT → OWNER_REVIEW → APPROVED → AUTHORIZED →
IN_PROGRESS → BLOCKED → IMPLEMENTED →
VERIFICATION_PENDING → CLOSED / PASS → SUPERSEDED / DEFERRED
```

Important distinctions:
- APPROVED ≠ AUTHORIZED (authorized means implementation may begin)
- IMPLEMENTED ≠ CLOSED (closed requires S11 evidence)

---

## 8. PROJECT ARTIFACT OUTPUT

For actual projects, default to:

```
docs/planning/work-packages/WP-<id>.md
```

Existing conventions (e.g., WS-002, WS-003) may be preserved. Do NOT
force renaming of established canonical contracts.

---

## 9. WORK PACKAGE REQUIRED CONTENT

```
# WP-XXX — <Name>

1.  Contract Status (ID, status, source milestone, Owner auth,
    source baselines, canonical main SHA)
2.  Purpose (authorized implementation outcome)
3.  Requirements Covered (FR/BR/DR/PERM/INT/NFR IDs)
4.  Entry Conditions
5.  In Scope (authorized behavior/capability)
6.  Out of Scope (excluded adjacent behavior)
7.  Intended Behavior (precise product/business behavior)
8.  Business Rules (relevant authoritative rules)
9.  Data Semantics (entities, state, lifecycle, validation)
10. Permission / Actor Semantics
11. Technical Boundaries (S6/S7 architecture constraints)
12. Interfaces / Integration Boundaries (where relevant)
13. Error / Edge Semantics (non-happy paths)
14. Acceptance Contract (observable PASS/FAIL conditions)
15. Verification Expectations (evidence S11 requires)
16. Forbidden Expansion (what S10 must NOT add/change)
17. Known Risks / Blockers
18. Allowed Implementation Freedom
19. S10 Handoff (exact authorized unit)
20. Approval / Authorization (Owner decision)
```

Adapt to context. Do not require irrelevant empty sections.

---

## 10. REQUIREMENT TRACEABILITY

S9 preserves:

```
S5 REQUIREMENT → S8 MILESTONE → S9 WORK PACKAGE
```

Every material WP behavior must be justified by approved requirement,
business rule, technical prerequisite, migration need, verified
defect/change authorization, or material risk.

Detect and reject:
- **ORPHAN WORK-PACKAGE SCOPE** — authorized scope with no
canonical justification.

---

## 11. SELECTED REQUIREMENTS ONLY

S9 must NOT pull all milestone requirements into one WP. A milestone
may require multiple WPs. S9 must explicitly state:

```
REQUIREMENTS COVERED NOW: <list>
MILESTONE REQUIREMENTS NOT IN THIS WP: <list>
```

Do not falsely imply full milestone completion.

---

## 12. SCOPE BOUNDARY

Work-package scope must prevent "while I'm here" expansion:

```
IN SCOPE:          exactly what is authorized
OUT OF SCOPE:      explicitly excluded adjacent behavior
FORBIDDEN EXPANSION: unrelated refactors, new features,
  new infrastructure, unrequested redesigns, broad dependency
  upgrades, schema redesign, new auth model, new background jobs,
  premature performance optimization
```

Only include prohibitions relevant to the actual work package.

---

## 13. INTENDED BEHAVIOR

S9 translates selected S5/S8 intent into implementation-ready behavior.
Define when relevant: inputs, outputs, state transitions, validation,
missing/null data behavior, errors, permissions, calculations,
sorting/filtering, audit effect, external side effects.

Do NOT redesign approved behavior.

---

## 14. BUSINESS RULE PRESERVATION

S9 may restate only rules required for the unit. If defined in S5,
reference it precisely. If restatement changes meaning:
**CONTRACT DIVERGENCE DETECTED.**

---

## 15. CALCULATION CONTRACT PRESERVATION

Where calculations are involved, include: inputs, inclusion/exclusion,
formula, precision, rounding, ordering, thresholds, missing/incomplete
semantics, display vs internal values. Do not invent a different
formula. S5 remains authoritative for meaning; S6 for realization.

---

## 16. WORKFLOW / STATE TRANSITIONS

Where behavior changes state, define: allowed starting states, allowed
transitions, forbidden transitions, resulting state, side effects,
audit/history effect. Avoid vague "update status accordingly."

---

## 17. DATA CONTRACT

Where data changes are involved: entities affected, authoritative
ownership, required fields, uniqueness/integrity, historical behavior,
transactional expectations, migration need. S9 does NOT write
migrations — it only contracts what S10 may implement.

---

## 18. MIGRATION BOUNDARY

If implementation requires a migration:

```
MIGRATION REQUIRED: YES
purpose, affected data/schema, compatibility expectation,
data-preservation expectation, verification requirement
```

Do NOT generate migration files. If need is unknown, do not guess.
Classify whether this is blocking.

---

## 19. AUTHORIZATION CONTRACT

For permission-sensitive work: authorized actor/principal, required
scope/context, server-side enforcement expectation, forbidden actors,
privileged exceptions, audit effect. Preserve S5 PERM semantics
and S6/S7 enforcement architecture.

---

## 20. INTERFACE / API CONTRACT

Where implementation exposes or changes an interface: operation,
input/output behavior, validation, error semantics, authorization,
idempotency, compatibility, observable side effects. S9 may be exact
enough for deterministic implementation. Do not create speculative
APIs not required by S5/S6.

---

## 21. UI / UX CONTRACT

Where user-facing behavior is in scope: route/screen, visible states,
actions, permissions, loading/empty/error behavior, required terminology,
critical interaction rules. Do not turn S9 into a visual design
system unless the WP is specifically about that.

---

## 22. ERROR SEMANTICS

Explicitly define relevant non-happy paths: invalid input, missing
record, permission denied, conflict, dependency unavailable, incomplete
data, non-computable result, duplicate request. Avoid allowing S10
to invent business consequences for errors.

---

## 23. ACCEPTANCE CONTRACT

Acceptance criteria must be: observable, testable, traceable, specific
enough to determine PASS/FAIL.

Good: "Given an authorized user and valid data, when action X occurs,
the authoritative result Y is persisted and retrievable."

Bad: "Feature works correctly."

---

## 24. ACCEPTANCE DOES NOT EQUAL TEST IMPLEMENTATION

S9 defines WHAT must be proven. S10/S11 decide exact test mechanics.
S9 may identify necessary evidence types: unit, integration, real DB,
contract, E2E, manual/Owner verification. Do NOT prescribe every
test file/assertion unless materially necessary.

---

## 25. REPRODUCTION CONTRACT

For defect/change work: preserve the reproduction. Canonical:

```
SAME REPRODUCTION BEFORE FIX → FAIL (exposes defect)
SAME REPRODUCTION AFTER FIX  → PASS
```

Do not authorize replacing a difficult reproduction with an easier one.

---

## 26. ENVIRONMENT CONTRACT

```
TARGET NOT VERIFIED → NO WRITE.
```

When environment matters: required target, data baseline, write
permissions, external sandbox, configuration assumptions. Do not
authorize production changes without proper production gate.

---

## 27. FACTUAL BASELINE

Before S9 authorization, record: canonical branch, main SHA,
relevant migration state, existing routes/modules, known implementation
state, existing tests/evidence. Only evidence relevant to the unit.

---

## 28. EXISTING IMPLEMENTATION

If required behavior already exists, classify:

```
VERIFIED EXISTING / PARTIAL / MISSING / DIVERGENT / UNKNOWN
```

Do not authorize rewriting existing working behavior. Reuse preferred
when canonical and correct.

---

## 29. CONTRACT DIVERGENCE IN S9

If factual implementation conflicts with intended contract, DO NOT
adapt the WP to the defective implementation. Report:

```
CONTRACT DIVERGENCE DETECTED
Classification: IMPLEMENTATION DEFECT / TEST DEFECT /
  FIXTURE/DATA DEFECT / ENVIRONMENT DEFECT /
  SPECIFICATION AMBIGUITY / UNKNOWN

UNKNOWN → INVESTIGATE. NEVER UNKNOWN → WORKAROUND.
```

---

## 30. ALLOWED IMPLEMENTATION FREEDOM

S9 should avoid over-specifying choices that safely belong to S10:
local helper naming, internal refactoring within boundary, test-file
organization, equivalent implementation technique, minor component
decomposition — provided behavior remains correct, architecture
conformant, no scope expansion, quality gates intact.

---

## 31. FORBIDDEN IMPLEMENTATION FREEDOM

S10 may NOT independently change: product semantics, business rules,
permission semantics, approved architecture, data ownership, external
contracts, release scope, milestone scope, work-package scope.
Such changes require governance.

---

## 32. FILE-LEVEL SCOPE

S9 MAY identify likely technical areas or files when useful, but file
lists are not the primary contract. A file not listed is not
automatically forbidden if conformant change requires it. Conversely,
listing a file does not authorize arbitrary modifications. Behavior
and boundaries remain authoritative.

---

## 33. QUALITY-GATE CONTRACT

S9 should identify project-applicable gates: typecheck, lint, unit,
integration, DB, build, E2E, migration verification. Do not invent gates
not in the project. Do not weaken valid gates.

**Quality-gate evasion prohibited (S0):** broken seed → fix/remove
seed, NOT exclude from typecheck. Lint failure → fix cause, NOT
disable lint. Failing valid test → fix cause, NOT delete/relax test.

---

## 34. NO PREMATURE REFACTOR

S9 must not authorize generic cleanup such as "refactor architecture
while implementing." Refactor allowed only when necessary for the
authorized outcome or separately authorized. Prefer minimum
sufficient change.

---

## 35. NO SPECULATIVE PERFORMANCE WORK

Do not authorize cache, precomputation, index redesign, parallel
processing, queues, or distributed mechanisms unless required by
approved NFR, observed bottleneck, technical constraint, or material
risk. S6 architecture remains authoritative.

---

## 36. NO AUTOMATION / PRODUCTION AUTHORIZATION

A WP does NOT authorize: cron, scheduled jobs, recurring AI review,
background AI monitoring, scheduled summaries, periodic audits — unless
OWNER explicitly authorized that exact automation separately.

**ZERO SCHEDULED WORK** remains in force.

S9 authorization is implementation authorization — NOT production
deployment authorization. S12/S13 gates remain separate.

---

## 37. OWNER APPROVAL / AUTHORIZATION GATE

S9 cannot self-authorize. Before authorization present:

- WP ID and source milestone
- delivery outcome
- requirements covered
- in scope / out of scope
- critical business behavior
- technical boundaries
- migration impact
- acceptance criteria
- verification expectations
- material risks
- forbidden expansion

Owner may: APPROVE+AUTHORIZE, REQUEST CHANGES, SPLIT WP, DEFER,
REJECT. Only APPROVE+AUTHORIZE permits S10.

---

## 38. DEFINITION OF READY FOR S10

```
SOURCE MILESTONE              APPROVED
MILESTONE ENTRY CONDITIONS     SATISFIED
WORK PACKAGE                  BOUNDED
REQUIREMENTS COVERED          EXPLICIT
IN SCOPE                     EXPLICIT
OUT OF SCOPE                 EXPLICIT
INTENDED BEHAVIOR            PRECISE
BUSINESS RULES               UNAMBIGUOUS
DATA SEMANTICS               CLEAR where relevant
PERMISSION SEMANTICS          CLEAR where relevant
TECHNICAL BOUNDARIES         CONFORMANT WITH S6/S7
ACCEPTANCE CONTRACT           TESTABLE
VERIFICATION EXPECTATIONS    DEFINED
FORBIDDEN EXPANSION          DEFINED
BLOCKING AMBIGUITIES          0
CONTRACT DIVERGENCES          0 unresolved
ENVIRONMENT TARGET           KNOWN where writes required
OWNER                         APPROVED + AUTHORIZED
S10                           NOT STARTED
```

---

## 39. S10 HANDOFF

S9 hands off to S10:

```
WORK PACKAGE ID
AUTHORIZED PURPOSE
REQUIREMENTS COVERED
VERIFIED BASELINE
IN SCOPE / OUT OF SCOPE
INTENDED BEHAVIOR
BUSINESS RULES
DATA SEMANTICS
PERMISSION SEMANTICS
TECHNICAL CONSTRAINTS
ACCEPTANCE CONTRACT
VERIFICATION EXPECTATIONS
FORBIDDEN EXPANSION
```

S10 must implement only this bounded unit.

---

## 40. WP COMPLETION ≠ MILESTONE COMPLETION

A milestone may contain multiple WPs. WP CLOSED does NOT
automatically mean MILESTONE CLOSED. Milestone closure depends on
S8 exit conditions and complete required coverage. Do not manufacture
milestone PASS from partial WP completion.

---

## 41. CHANGE CONTROL

Before S10: approved WP changes require Owner-approved contract
revision (reason, affected scope, affected requirements, acceptance
impact, version/revision). Avoid bureaucratic versioning for trivial
wording corrections.

During S10: if a material requirement not in the WP is discovered,
STOP scope expansion. Classify: necessary clarification, contract
defect, new requirement, technical constraint, implementation issue.
Material expansion requires S9 update / Owner approval.

---

## 42. WORK PACKAGE SPLIT AND MERGE

Split when: multiple independent outcomes, scope too large,
different dependencies block portions, risk isolation improves
correctness. Preserve lineage (e.g., WP-004 → WP-004A, WP-004B).

Merge when: separation has no meaningful value, scope remains coherent,
Owner approves if already authorized.

---

## 43. PROJECT STATE TRANSITION

At S9 authorization:

```
AISE PHASE:              S9 — MODULE CONTRACT / WORK PACKAGE
SELECTED MILESTONE:      <MS-ID>
WORK PACKAGE:            APPROVED / AUTHORIZED
IMPLEMENTATION:          NOT STARTED
NEXT RECOMMENDED:        S10 — IMPLEMENTATION EXECUTION
NEXT AUTHORIZED:         S10 for THIS work package only
```

No other milestone/WP is implicitly authorized.

---

## 44. VALIDATION SCENARIOS

| ID | Scenario | Expected |
|----|----------|----------|
| S9-01 | Milestone too large for one WP | Contract one bounded slice or appropriately bounded WP |
| S9-02 | WP includes analytics not in requirements | ORPHAN WORK-PACKAGE SCOPE — remove or obtain governance approval |
| S9-03 | Business rule unclear | S9 PRECONDITION NOT MET — do not invent rule |
| S9-04 | Part of behavior already exists and verified | Preserve/reuse — do not automatically rewrite |
| S9-05 | Code contradicts approved rule | CONTRACT DIVERGENCE — do not change expected behavior to match code |
| S9-06 | Authorized behavior requires schema change | State migration requirement, no migration file created |
| S9-07 | Only privileged actor may execute | Actor/scope/enforcement explicit |
| S9-08 | S5 defines exact rounding semantics | Preserve exact contract, no formula simplification |
| S9-09 | Required record missing | Define intended outcome so S10 need not invent behavior |
| S9-10 | Valid test fails against implementation | Do not authorize weakening test; CAUSE UNKNOWN until proven |
| S9-11 | Typecheck fails on new file | Do not authorize exclusion from compiler |
| S9-12 | Agent proposes broad cleanup while implementing | OUT OF SCOPE unless required/authorized |
| S9-13 | WP requires DB write, environment unverified | TARGET NOT VERIFIED → NO WRITE |
| S9-14 | Agent proposes cron with no automation auth | PROHIBITED |
| S9-15 | Agent proposes immediate production deploy | NOT AUTHORIZED — production belongs later |
| S9-16 | Acceptance says "feature works" | Reject — require observable/testable conditions |
| S9-17 | Two equivalent implementations satisfy contract | S9 need not dictate one unless architecture requires it |
| S9-18 | Contract bounded, Owner approves | S9 CLOSED/PASS; S10 authorized for that WP only; STOP before S10 |
| S9-19 | WP references future monitoring without auth | CRON 0, SCHEDULED AI WORK 0, BACKGROUND AI MONITORING 0 |

---

## 45. ANTI-OVERSPECIFICATION

S9 must NOT automatically:

- define every file to edit or function/class
- write implementation code or create migrations/fixtures
- create exact test files or broad refactor tasks
- create performance work without evidence
- create deployment work, cron, or schedules
- create next milestone or next work package
- implement S10 or start S10 automatically

---

## 46. WORK PACKAGE QUALITY GATE

Before S9 reaches OWNER_REVIEW:

```
SOURCE MILESTONE               VALID
REQUIREMENT TRACEABILITY         COMPLETE
ORPHAN SCOPE                   0
BLOCKING PRODUCT AMBIGUITIES   0
BLOCKING TECHNICAL AMBIGUITIES 0
IN SCOPE                      EXPLICIT
OUT OF SCOPE                  EXPLICIT
INTENDED BEHAVIOR             UNAMBIGUOUS
BUSINESS RULE CONTRADICTIONS   0
S6/S7 ARCHITECTURE CONTRADICTIONS 0
ACCEPTANCE CRITERIA TOO VAGUE  0
FORBIDDEN EXPANSION           DEFINED
TARGET ENVIRONMENT AMBIGUITY  0 when writes required
UNAUTHORIZED AUTOMATION       0
UNAUTHORIZED PRODUCTION ACTION 0
OWNER APPROVAL + AUTHORIZATION REQUIRED
```

---

## 47. ZERO SCHEDULED WORK

Work packages do NOT authorize cron, scheduled AI work, background
monitoring, or recurring tasks. ZERO SCHEDULED WORK remains in force.

---

## 48. DIFF GATE

For this universal S9 protocol, expected diff:

```
NEW:  docs/engineering/AISE_MODULE_CONTRACT_WORK_PACKAGE.md
MINIMAL: docs/engineering/AI_SOFTWARE_ENGINEERING_OS.md (S9 pointer)
MINIMAL: docs/engineering/AISE_ROADMAP_MILESTONE_DESIGN.md (S9 handoff)
MINIMAL: docs/engineering/AISE_ROADMAP.md (S9 status)
OPTIONAL MINIMAL: docs/engineering/AISE_NEW_PROJECT_BOOTSTRAP.md (manifest)
```

STRICTLY UNCHANGED: application code, existing WS contracts,
application roadmap, PROJECT_STATE, schema, migrations, deployment,
S10/S11+ implementation, R1-R7 implementation.

---

## 49. WORK PACKAGE ARTIFACT CONVENTIONS

For actual project execution, each WP becomes a standalone document.
Recommended filename pattern: `docs/planning/work-packages/WP-<id>.md`.

The WP document must be self-contained enough that an S10 agent can
implement from it without chat history. This means:

- All authorized behavior is stated explicitly
- All referenced requirements are identified by ID
- Technical boundaries reference S6/S7 sections
- Factual baseline includes canonical main SHA
- Entry conditions are checkable

A WP document is NOT a prompt — it is a contract that survives
session boundaries.

---

## 50. CRITICAL AND HIGH BLOCKERS

Preserve AISE prioritization:

```
CRITICAL    blocks when material to the milestone/release.
HIGH        blocks when materially relevant to contract/release.
MODERATE    does not automatically block.
LOW         does not automatically block.
```

Do not create broad hardening workstreams from non-blocking
observations. Non-blocking findings belong in backlog/state tracking.

---

## 51. EMERGENCY DISCOVERY DURING IMPLEMENTATION

If S10 discovers a Critical issue directly preventing the authorized
outcome, S10 may investigate only enough to classify it. It does NOT
receive automatic authorization to redesign adjacent systems. Use
S2/R-route governance as appropriate.

---

## 52. QUALITY PRINCIPLE

A high-quality work package answers:

- What exactly is being implemented?
- What requirements justify it?
- What behavior is expected (happy and unhappy paths)?
- What business rules apply?
- What data changes and who owns them?
- Who is authorized and what enforcement is expected?
- What proves the implementation is correct?
- What must S10 NOT do?
- What may S10 choose freely?
- What is the verified starting point?

It should NOT answer: every file to edit, every function signature,
every test assertion, or every implementation command.
