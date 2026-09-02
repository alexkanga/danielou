# AISE — ROADMAP / MILESTONE DESIGN

**Authority:** Subordinate to S0 (AI Software Engineering OS).
Reads from S4 (Project Charter), S5 (Product Requirements),
S6 (Technical Specification), S7 (Project Manifest + ADR).

**Status:** ACTIVE PILOT

---

## 1. PURPOSE

S8 answers one question:

**IN WHAT VERIFIED ORDER SHOULD THE APPROVED PRODUCT BE DELIVERED?**

S8 transforms the approved upstream artifacts into an
OWNER-APPROVED DELIVERY ROADMAP composed of bounded milestones,
requirement coverage, technical dependencies, entry/exit conditions,
acceptance expectations, material risks, and delivery ordering.

S8 does NOT:

- write code, create migrations, or deploy
- create exact implementation contracts
- create detailed tickets or sprint plans
- start implementation (implementation begins at S10)

---

## 2. ENTRY PRECONDITIONS

Normal greenfield S8 entry requires:

```
PROJECT_CHARTER           APPROVED
PRODUCT_REQUIREMENTS      APPROVED
TECHNICAL_SPECIFICATION   APPROVED
PROJECT_MANIFEST          APPROVED
MATERIAL ADR SET          ACCEPTED
BLOCKING PRODUCT QUESTIONS       0
BLOCKING TECHNICAL DECISIONS     0
```

If this baseline is not coherent: **S8 PRECONDITION NOT MET.**

Do NOT invent missing decisions merely to produce a roadmap.

---

## 3. CANONICAL INPUTS

| Source | Provides |
|--------|----------|
| S4 | Project purpose, scope, boundaries, stakeholders |
| S5 | Requirements, business rules, release scope, acceptance semantics |
| S6 | Architecture, components, data design, interfaces, testing strategy, deployment constraints |
| S7 | Canonical stack, boundaries, accepted decisions, constraints, ADRs |

Do not use conversation memory as authoritative input.

---

## 4. ROADMAP PRINCIPLE

**ORDER BEFORE DATES.**

S8 determines WHAT MUST PRECEDE WHAT before attempting WHEN WILL
IT HAPPEN. Calendar dates or duration estimates are optional only
when the OWNER requests them or the project has sufficient evidence
to support them.

Never fabricate dates to make a roadmap look complete.

The roadmap is a delivery order model — not automatically a calendar,
sprint plan, Gantt chart, resource plan, ticket backlog, or release
schedule.

---

## 5. OUTCOME-ORIENTED MILESTONES

Prefer: *"A teacher can create and validate a grade entry workflow"*
over: *"Create database tables."*

A milestone must have a clear reason for existing. It may be
product-facing, technical-enabling, migration-focused,
integration-focused, or release-focused. Technical foundation
milestones are allowed when they are genuine prerequisites.

---

## 6. MILESTONE IDENTIFIERS

Use stable IDs:

```
MS-001, MS-002, MS-003, ...
```

Avoid `M1`, `M2` if project conventions already use M-prefixed
application phases. Stable IDs survive wording refinements.
Do NOT renumber approved IDs for cosmetic ordering.

---

## 7. MILESTONE CONTRACT

Each milestone contains:

```
MILESTONE ID
NAME
DELIVERY OUTCOME
WHY THIS MILESTONE EXISTS
REQUIREMENTS COVERED
TECHNICAL CAPABILITIES / DEPENDENCIES
ENTRY CONDITIONS
IN SCOPE
OUT OF SCOPE
EXIT CONDITIONS
ACCEPTANCE EXPECTATION
MATERIAL RISKS / BLOCKERS
DEPENDENCIES
STATUS
```

OPTIONAL: estimate and confidence only when evidence exists.

Do NOT define source files, exact implementation steps, or detailed
test cases — those belong downstream (S9/S11).

---

## 8. S8 VS S9 BOUNDARY

**S8** defines the delivery roadmap and milestone boundaries.

**S9** takes ONE approved milestone and produces the exact authorized
work package (routes, behavior subset, technical boundaries, acceptance
scenarios, files/domains likely affected, forbidden expansion).

**S8 MUST NOT become S9.**

---

## 9. S8 VS S10 BOUNDARY

S8 does NOT implement. No code, no packages, no schema, no migrations,
no tests, no fixtures, no infrastructure, no deployment.
Implementation begins at S10 only after S9 authorizes an exact work
package.

---

## 10. REQUIREMENT COVERAGE

S8 maps approved release-scope requirements to milestones.

Canonical traceability:

```
S5 REQUIREMENT → S8 MILESTONE → S9 WORK PACKAGE →
S10 IMPLEMENTATION → S11 VERIFICATION
```

Detect and reject:

- **UNASSIGNED RELEASE REQUIREMENT** — a release-scope requirement
  with no delivery milestone.
- **MILESTONE WITHOUT JUSTIFICATION** — a milestone with no
  requirement, technical prerequisite, migration need, or material
  risk justifying it.

A requirement may appear in multiple milestones when genuinely
cross-cutting. If so, distinguish which milestone introduces,
completes, verifies, or depends on the requirement. Do not duplicate
ownership ambiguously.

---

## 11. RELEASE SCOPE VS FUTURE SCOPE

S8 respects S5 release scope. Distinguish:

```
CURRENT DELIVERY BASELINE
DEFERRED REQUIREMENTS
FUTURE / OUT-OF-SCOPE CAPABILITIES
```

Do NOT automatically roadmap every future idea from S4/S5.
A deferred requirement remains deferred unless OWNER changes the
approved release baseline.

---

## 12. DEPENDENCY MODEL

Dependencies may arise from business behavior, data model, technical
architecture, integration prerequisites, migration needs,
security/auth foundations, external systems, or verification
requirements.

Classify only when useful:

```
HARD DEPENDENCY         Milestone B cannot coherently start or close without A.
SOFT DEPENDENCY         A first is preferable but not strictly mandatory.
EXTERNAL DEPENDENCY     Controlled outside current project/team.
OWNER DECISION          Requires explicit approved decision.
```

Avoid dependency graphs for trivial relationships.

---

## 13. DEPENDENCY DIRECTION

Derive order from actual dependencies. Do NOT assume generic
sequences (database → backend → frontend → tests) unless project
evidence genuinely requires that ordering.

Prefer vertical delivery when feasible:

```
minimum technical foundation
  → coherent product capability
  → verification
  → next capability
```

But do not force vertical slicing where a real infrastructure or
data foundation must exist first.

---

## 14. MINIMUM SUFFICIENT FOUNDATION

A foundation milestone is justified only if downstream work
materially depends on it (e.g., project runtime skeleton,
authentication baseline, canonical persistence foundation,
critical migration baseline, integration sandbox).

Foundation milestones must be: bounded, minimum sufficient, and
traceable to downstream requirements. Do NOT create vague
unlimited-scope foundation phases.

---

## 15. ARCHITECTURE PRESERVATION

S8 ordering must respect S6/S7 architecture. It may NOT silently
reorganize the system architecture.

If the roadmap requires violating an approved boundary:
**CONTRACT DIVERGENCE DETECTED.**

Use canonical Manifest/ADR facts to identify sequencing
constraints (e.g., authentication before privileged workflows,
schema baseline before dependent data flows, external provider
sandbox before integration verification).

S8 may sequence around those constraints. It may not redesign them.

---

## 16. MILESTONE GRANULARITY

A good milestone is large enough to produce meaningful progress
and small enough to understand, authorize, verify, close, and
recover from.

Avoid: ONE MILESTONE FOR THE ENTIRE PRODUCT, and ONE MILESTONE PER
BUTTON / TABLE / FILE. Milestone size depends on project complexity.

---

## 17. COHESION RULE

Each milestone should have one coherent delivery outcome. If a
milestone contains unrelated capabilities only because they share
the same technology: split it. If multiple technical changes are
inseparable parts of one product outcome: keep them together.

Organize around coherence, not arbitrary layer taxonomy.

---

## 18. VERTICAL SLICE PREFERENCE

When architecture and dependencies permit, prefer milestones that
prove an end-to-end capability (e.g., auth-authorized create/read
workflow rather than all-database, all-backend, all-frontend).

This is a **preference**, not frozen dogma. Evidence wins.

---

## 19. ENTRY AND EXIT CONDITIONS

**Entry conditions** state what must be true before authorization:
prior milestone PASS, required baseline approved, external sandbox
available, migration prerequisite complete, owner decision resolved.

**Exit conditions** state what must be proven before closure:
required functionality implemented, critical business rules verified,
required integration works, quality gates pass, no Critical blockers,
acceptance evidence available.

Do not use vague "everything ready" statements. S8 defines
milestone-level exit expectations; detailed scenario contracts
belong to S9/S11.

---

## 20. BLOCKER POLICY

Preserve AISE prioritization:

```
CRITICAL   blocks when material to the milestone/release.
HIGH       blocks when materially relevant.
MODERATE   does not automatically block.
LOW        does not automatically block.
```

Non-blocking findings belong in backlog/state tracking. Do NOT
turn every quality observation into a new milestone.

---

## 21. STATUS MODELS

**Milestone status:**

```
PLANNED → AUTHORIZED → IN_PROGRESS → BLOCKED →
CLOSED / PASS → DEFERRED → SUPERSEDED
```

Important: PLANNED ≠ AUTHORIZED ≠ IN_PROGRESS. LOCAL IMPLEMENTATION
≠ CLOSED. CLOSED requires downstream evidence.

**Roadmap status:**

```
DRAFT → OWNER_REVIEW → APPROVED → FROZEN → SUPERSEDED
```

S8 cannot self-approve. S8 CLOSED/PASS requires ROADMAP APPROVED
or equivalent project governance.

---

## 22. CRITICAL PATH, PARALLELISM, WORKSTREAMS

**Critical path:** Identify only when delay/blockage of those
milestones actually constrains delivery of the approved baseline.
No mandatory CPM/PERT calculations.

**Parallelism:** May mark milestones as potentially parallel when
dependencies, ownership, and worktree constraints permit. AISE's
ONE AGENT / ONE WORKTREE / ONE GIT WRITER remains authoritative.
Roadmap possibility ≠ execution authorization.

**Workstreams:** Optional for larger projects (core product,
integration, data migration, reporting, platform enablement). Do not
introduce them for small projects. Must not replace milestone-level
traceability.

---

## 23. RELEASES

S8 may group milestones into releases when release structure is
part of approved project intent. Do not invent multiple releases
if S5 defines one release baseline. Prefer `REL-01` labels if
ambiguity exists with AISE R1-R7 route protocols.

---

## 24. DATES AND ESTIMATES

By default, S8 is dependency-first and date-light. If estimates
are used: state basis, state confidence (LOW/MEDIUM/HIGH), state
assumptions.

No false precision (e.g., "3.25 days") without evidence. If no
credible basis exists: **ESTIMATE NOT ESTABLISHED.**

Do NOT block roadmap approval merely because dates are absent
unless OWNER explicitly requires scheduling.

AISE agent must not invent delivery deadlines. A deadline must
originate from OWNER, contract, regulatory constraint, external
dependency, or approved project commitment.

---

## 25. EXTERNAL DEPENDENCIES

For material external dependency, record:

```
DEPENDENCY, OWNER/PROVIDER, WHAT IS NEEDED,
MILESTONES AFFECTED, BLOCKING (YES/NO),
FALLBACK (only if already approved)
```

Do not invent workaround or fallback behavior.

---

## 26. DATA, MIGRATION, AND INTEGRATION MILESTONES

Data or migration work may be its own milestone when material
(e.g., legacy data import, schema transition, canonical data
reconciliation, migration rehearsal). Do not create dedicated
migration milestones for trivial schema evolution.

External integration may require a separate milestone when provider
dependency is substantial, certification is needed, or failure risk
is material. Otherwise, integrate into the coherent product milestone.

Do NOT automatically create a final "testing milestone" — verification
should accompany each milestone. A dedicated verification milestone
is justified only for formal certification, migration rehearsal,
performance qualification, security assessment, or release-wide
acceptance.

---

## 27. RELEASE READINESS BOUNDARY

S8 may identify a future release-readiness milestone if the project
structure requires it. But **S12 owns RELEASE READINESS.** S8 must
not execute or fully specify S12.

---

## 28. PROJECT ROADMAP CANONICAL OUTPUT

For an actual AISE-managed project, the default delivery roadmap
output path is:

```
docs/planning/DELIVERY_ROADMAP.md
```

Recommended structure:

```
1.  Roadmap Status
2.  Delivery Objective
3.  Planning Principles
4.  Release Scope
5.  Dependency Overview
6.  Milestone Summary
7.  Milestone Definitions (one section per milestone)
8.  Cross-Milestone Requirements
9.  External Dependencies
10. Material Delivery Risks
11. Requirement Coverage Matrix
12. Unassigned Requirements
13. Deferred / Future Work
14. S9 Handoff
15. Approval / Baseline Status
```

Adapt to project context. Do not create irrelevant empty bureaucracy.

---

## 29. MILESTONE SUMMARY TABLE

```
| ID | Milestone | Outcome | Requirements | Depends On | Status |
```

This is navigation — it does not replace detailed definitions.

---

## 30. REQUIREMENT COVERAGE MATRIX

```
| Requirement | Milestone | Coverage | Status |
```

Coverage roles: PRIMARY, COMPLETES, CROSS-CUTTING, VERIFICATION,
DEFERRED.

At S8 closure: **UNASSIGNED RELEASE REQUIREMENTS = 0** unless a
documented OWNER-approved exception exists.

---

## 31. CHANGE CONTROL

Once DELIVERY_ROADMAP is APPROVED/FROZEN, material changes (adding
or removing milestones, moving release-scope requirements, changing
dependency order, splitting or merging milestones) require evidence,
affected IDs, technical impact, Owner approval, roadmap update, and
downstream S9 impact review.

If implementation develops capability outside roadmap: determine
whether it is authorized change, legacy factual state, implementation
defect, missing roadmap update, or scope divergence. Do not rewrite
roadmap silently to fit current implementation.

A milestone may be SPLIT when evidence shows it is too large or
contains independent outcomes (e.g., MS-004 → MS-004A, MS-004B).
A milestone may be MERGED when separation provides no useful
boundary. A milestone may become DEFERRED with Owner approval —
requirements within it must then be reconciled with S5 release scope.

---

## 32. OWNER APPROVAL GATE

S8 cannot self-approve. Before approval, present:

- delivery objective
- milestone count and order
- critical dependencies
- release-scope coverage
- unassigned requirements
- deferred scope
- material delivery risks
- optional estimates/confidence
- recommended first milestone for S9

Owner may: APPROVE, REQUEST CHANGES, CHANGE SCOPE, or REORDER WITH
EVIDENCE. If Owner changes product scope materially, return affected
requirements to S5 governance as required.

---

## 33. DEFINITION OF READY FOR S9

```
S4/S5/S6/S7    APPROVED
DELIVERY ROADMAP coherent
RELEASE SCOPE   explicit
MILESTONES      bounded and outcome-oriented
MILESTONE DEPENDENCIES coherent
UNASSIGNED RELEASE REQUIREMENTS    0
MILESTONES WITHOUT JUSTIFICATION    0
BLOCKING ROADMAP AMBIGUITIES       0
KNOWN MATERIAL EXTERNAL DEPS       represented
CRITICAL/MATERIAL HIGH BLOCKERS    resolved or explicitly blocking
DEFERRED WORK                      explicit
S9 FIRST CANDIDATE                 identified
OWNER APPROVAL                     received
S9 NOT STARTED.
```

---

## 34. S9 HANDOFF

S8 hands off to S9 — MODULE CONTRACT / WORK PACKAGE:

```
APPROVED DELIVERY_ROADMAP
SELECTED NEXT MILESTONE
MILESTONE OUTCOME
REQUIREMENTS COVERED
TECHNICAL DEPENDENCIES
ENTRY CONDITIONS
EXIT EXPECTATIONS
MATERIAL RISKS
```

S9 then produces the precise authorized implementation contract.
**S8 MUST NOT implement S9.**

---

## 35. PROJECT STATE TRANSITION

At S8 closure:

```
AISE PHASE:                    S8 — CLOSED / PASS
PROJECT CHARTER:               APPROVED
PRODUCT REQUIREMENTS:          APPROVED
TECHNICAL SPECIFICATION:       APPROVED
PROJECT MANIFEST / ADR:        APPROVED / ACCEPTED
DELIVERY ROADMAP:              APPROVED
IMPLEMENTATION:                NOT STARTED
NEXT RECOMMENDED COMPONENT:    S9 — MODULE CONTRACT / WORK PACKAGE
NEXT AUTHORIZED COMPONENT:     NONE until OWNER GO
```

---

## 36. VALIDATION SCENARIOS

| ID | Scenario | Expected |
|----|----------|----------|
| S8-01 | Simple product with three related areas | Small coherent milestone set; do not manufacture ten milestones |
| S8-02 | Release-scope FR has no milestone | UNASSIGNED RELEASE REQUIREMENT — S8 cannot close |
| S8-03 | Agent creates "Add Redis" milestone with no justification | MILESTONE WITHOUT JUSTIFICATION — remove or justify |
| S8-04 | Auth is hard prerequisite for privileged workflows | Bounded auth foundation may precede dependent milestones |
| S8-05 | Agent proposes DB→Backend→Frontend→Tests despite vertical feasibility | Challenge decomposition; prefer outcome-oriented slices |
| S8-06 | Milestone B genuinely requires schema from A | A → B hard dependency |
| S8-07 | A first is convenient but B could proceed independently | Do not falsely classify as hard dependency |
| S8-08 | S5 explicitly marks capability as future/deferred | Do not place into current release milestones |
| S8-09 | No delivery date exists | No fabricated deadline |
| S8-10 | Owner provides contractual delivery date | Record mandate accurately; do not pretend agent selected it |
| S8-11 | Agent proposes precise durations with no basis | Reject false precision; use NOT ESTABLISHED |
| S8-12 | Auditability applies to multiple capabilities | Trace across relevant milestones without ambiguous primary ownership |
| S8-13 | Agent starts scaffolding first milestone | STOP — S8 does not implement |
| S8-14 | Agent defines exact files, fixtures, endpoint assertions for MS-001 | Too detailed — move to S9 |
| S8-15 | Roadmap requires violating accepted S7 boundary | CONTRACT DIVERGENCE — do not rewrite architecture silently |
| S8-16 | Milestone depends on third-party certification | Represent external dependency and blocking effect; no invented fallback |
| S8-17 | Moderate quality improvement identified | Backlog/non-blocking; no automatic blocking milestone |
| S8-18 | Roadmap coherent, requirements assigned, Owner approves | S8 CLOSED/PASS; STOP before S9 |
| S8-19 | Roadmap includes future checkpoints | No cron, no scheduled AI work, no background monitoring |

---

## 37. ANTI-OVERPLANNING

S8 must NOT automatically:

- create sprints, tickets, or implementation tasks
- create file-level change lists or test fixtures
- write application code, migrations, or deploy
- invent dates, staffing, or deadlines
- create a milestone per technical layer or per requirement
- create a separate final "testing phase" by default
- implement S9 or S10
- start S9 automatically

---

## 38. ROADMAP QUALITY GATE

Before S8 reaches OWNER_REVIEW:

```
S4/S5/S6/S7 APPROVED                         YES
CURRENT RELEASE SCOPE                          EXPLICIT
UNASSIGNED RELEASE REQUIREMENTS                0
MILESTONES WITHOUT JUSTIFICATION               0
MILESTONE OUTCOMES UNCLEAR                     0
HARD DEPENDENCY CONTRADICTIONS                 0
UNREPRESENTED MATERIAL EXTERNAL DEPS           0
ROADMAP / S6 ARCHITECTURE CONTRADICTIONS      0
ROADMAP / S7 BASELINE CONTRADICTIONS          0
BLOCKING ROADMAP AMBIGUITIES                  0
FABRICATED DEADLINES                           0
UNJUSTIFIED PRECISE ESTIMATES                 0
S9-LEVEL DETAIL LEAKAGE                       0
OWNER APPROVAL                                REQUIRED
```

---

## 39. ZERO SCHEDULED WORK

Roadmap dates or milestones do NOT authorize cron jobs, scheduled AI
work, background monitoring, recurring status checks, or automated
reminders. ZERO SCHEDULED WORK remains in force.

---

## 40. DIFF GATE

For this universal S8 protocol, expected diff:

```
NEW:  docs/engineering/AISE_ROADMAP_MILESTONE_DESIGN.md
MINIMAL: docs/engineering/AI_SOFTWARE_ENGINEERING_OS.md (S8 pointer)
MINIMAL: docs/engineering/AISE_PROJECT_MANIFEST_ADR.md (S8 handoff)
MINIMAL: docs/engineering/AISE_ROADMAP.md (S8 status)
OPTIONAL MINIMAL: docs/engineering/AISE_NEW_PROJECT_BOOTSTRAP.md (manifest guidance)
```

STRICTLY UNCHANGED: application code, application roadmap, application
milestones, WS contracts, PROJECT_STATE, schema, migrations, deployment
configuration, S9/S10+ implementation, R1-R7 implementation.

---

## 41. MILESTONE ACCEPTANCE EXPECTATION

S8 acceptance wording must remain outcome-level.

Good: "Authorized users can create and retrieve the record
with required business validation."

Too detailed for S8: "POST /api/foo returns 201, test file X uses
fixture Y, component Z contains button Q." That belongs to S9/S11.

S8 may reference S6/S7 modules involved (e.g., Identity, Enrollment,
Reporting) but must not list every file or implementation class.
S8 is roadmap design, not source-level task design.

---

## 42. MILESTONE TECHNICAL BOUNDARIES

S8 may reference S6/S7 technical areas involved in a milestone.
This helps S9 and S10 agents understand the architectural scope
without guessing. Example:

```
TECHNICAL AREAS: Identity, Enrollment API, Student domain model
```

Do not list every file, class, or implementation detail.

---

## 43. DELIVERY_ROADMAP TEMPLATE

For actual project execution, the DELIVERY_ROADMAP output follows
this template structure. Each section is present only when content
exists — do not create empty sections for bureaucracy.

### 1. Roadmap Status

Project name, current baseline, roadmap status (DRAFT / OWNER_REVIEW
/ APPROVED / FROZEN), OWNER approval reference, source documents
(S4 Charter, S5 Requirements, S6 Technical Specification, S7
Project Manifest / ADR baseline).

### 2. Delivery Objective

What approved product or release this roadmap delivers. One or two
sentences.

### 3. Planning Principles

Dependency-driven ordering, requirement traceability, minimum
sufficient milestones, verification per milestone. State the
principles actually used, not a generic list.

### 4. Release Scope

Included requirements, deferred requirements, out-of-scope items.
Directly references S5 release scope.

### 5–6. Dependencies and Milestone Summary

Material dependencies and the navigation table.

### 7. Milestone Definitions

One section per milestone with the full milestone contract.

### 8–15. Cross-Cutting, External, Risks, Coverage, Handoff

Present only when content exists.

---

## 44. QUALITY PRINCIPLE

A high-quality roadmap answers:

- What are we delivering?
- What are the major milestones and why does each exist?
- Which approved requirements does each cover?
- What must come first?
- What proves each milestone is complete at a high level?
- Which dependencies or risks can block it?
- What is explicitly deferred?
- What milestone should S9 contract next?

It should NOT answer: exact files, exact code changes, every test
scenario, every ticket, every sprint allocation. Those belong
downstream.
