# AISE — PROJECT MANIFEST + ADR PROTOCOL (S7)

**Authority:** Subordinate to S0 (AI Software Engineering OS). Consumes
approved S6 TECHNICAL_SPECIFICATION as primary input.
**Scope:** Universal AISE protocol. Project-agnostic.
Usable by AI agents and human engineers. Operable without chat memory.

---

## 1. PURPOSE

S7 converts an approved Technical Specification into durable canonical
technical memory that survives agent sessions, team changes, and
implementation phases.

S7 produces two complementary artifacts:

**PROJECT_MANIFEST** — A concise canonical technical reference
answering: *What is the current approved technical baseline of this
project?*

**ADRs** (Architecture Decision Records) — Durable records answering:
*Why was this structural decision made?*

These artifacts are complementary. They MUST NOT be merged into one
giant governance document.

S7 does NOT design, implement, create delivery roadmaps, or start S8.

---

## 2. S6 / S7 / S8 BOUNDARIES

| Stage | Question | Output |
|-------|----------|--------|
| S6 | HOW technically | TECHNICAL_SPECIFICATION |
| S7 | WHY decisions made | PROJECT_MANIFEST + ADR |
| S8 | IN WHAT ORDER delivered | Delivery roadmap |

S7 MUST NOT redesign S6, create delivery plans, define work packages,
write application code, or start S8.

---

## 3. ENTRY PRECONDITION

S7 execution requires:

- TECHNICAL_SPECIFICATION: APPROVED
- S6 quality gate: PASSED
- Definition of Ready for S7: SATISFIED

If S6 has unresolved blocking decisions or contradictions, S7 MUST
NOT proceed. Route per S0/S2.

---

## 4. PROJECT MANIFEST PRINCIPLE

PROJECT_MANIFEST is a CONCISE CANONICAL TECHNICAL REFERENCE.

It is NOT: the full Technical Specification, an ADR collection, a
requirements document, an implementation plan, or a code inventory.

It must allow a capable new engineer or agent to quickly answer:

- What architecture is approved?
- What runtime/language is canonical?
- What persistence strategy is canonical?
- What are the major module boundaries?
- How is auth/authz conceptually implemented?
- What is the deployment model?
- Which ADRs explain the important decisions?
- Where is the full Technical Specification?

Do NOT copy S6 verbatim.

Example compression: if S6 contains a 200-word data architecture section
with table definitions, column types, and constraints, the manifest
records: "Primary persistence: PostgreSQL 16. Schema defined in S6 §9.
Transaction model: ACID. Audit: append-only log table per S6 §9."
and references S6 for detail.

---

## 5. INTENDED VS IMPLEMENTED STATE

S7 occurs before implementation in the greenfield delivery spine.
PROJECT_MANIFEST must NOT falsely claim that approved design is
already implemented.

Distinguish explicitly:

- **APPROVED TECHNICAL BASELINE** — intended state from S6/S7.
- **VERIFIED IMPLEMENTATION STATE** — what currently exists.

At initial S7 closure, implementation is typically: **NOT STARTED**.

Do not convert intended architecture into false factual claims. Later
lifecycle stages may update verified implementation references.

---

## 6. MANIFEST COMPRESSION RULE

Canonical principle:

- **DETAIL** lives in S6.
- **RATIONALE** lives in ADR.
- **CURRENT TECHNICAL BASELINE** lives in PROJECT_MANIFEST.

If a manifest section starts reproducing multiple pages from S6,
replace the detail with a concise canonical statement plus a
reference to the S6 section, TD, or ADR. The manifest is a navigation
and technical-truth artifact, not a duplicate encyclopedia.

---

## 7. MANIFEST OUTPUT STRUCTURE

The default actual-project output is `docs/architecture/PROJECT_MANIFEST.md`.

Recommended sections (omit those with no material content):

1. **Manifest Status** — project, version, status, source commit
2. **Architecture Baseline** — style, system shape, primary boundaries
3. **Canonical Technology Stack** — language, framework, persistence
4. **System / Module Boundaries** — modules, ownership, dependencies
5. **Data / Persistence Baseline** — system of record, consistency model
6. **Identity / Authorization Baseline** — auth model, privilege constraints
7. **Interface / Integration Baseline** — interface style, integrations
8. **Runtime / Environment Baseline** — dev, test, staging, production
9. **Deployment Baseline** — deployment unit, hosting, migration
10. **Build / Verification Baseline** — tooling, test categories, boundaries
11. **Technical Constraints** — MANDATED or FROZEN constraints
12. **ADR Index** — ID, title, status, source TD, supersession links
13. **Known Non-Blocking Technical Items** — material unresolved details
14. **Canonical References** — S5, S6, PROJECT_STATE, AISE_MANIFEST, ADRs
15. **Implementation Status** — NOT STARTED / PARTIAL / VERIFIED

---

## 8. TECHNICAL FACT STATUS

Allow manifest technical facts to carry status where useful:

- **MANDATED** — OWNER or external constraint
- **APPROVED** — S6-approved technical baseline
- **PROVISIONAL** — preferred but unconfirmed
- **DEPRECATED** — no longer recommended
- **SUPERSEDED** — replaced by newer decision
- **VERIFIED_IMPLEMENTED** — confirmed in runtime

Do not over-label every sentence. Use status when ambiguity between
approved design, implemented fact, and historical decision would matter.

---

## 9. ADR PURPOSE AND CRITERIA

An ADR preserves: a material technical decision, the context that
required it, alternatives considered, the selected choice, rationale,
consequences, and relationship to requirements.

Create an ADR when a decision is sufficiently structural that a future
engineer could ask: *"Why was this chosen instead of another serious
option?"*

Typical ADR candidates: architecture style, primary persistence model,
major database choice, authentication architecture, authorization model,
deployment topology, major integration mechanism, consistency model,
material security boundary, significant build/runtime model.

Do NOT create an ADR for: every package, every library, every UI
component, every lint rule, every folder, every test helper, every
patch-level dependency, or every implementation detail.

---

## 10. ADR SOURCE

S7 consumes S6 TD entries flagged `ADR CANDIDATE: YES` as primary
candidates. But `ADR CANDIDATE` does NOT mean blindly generate ADR.
Verify each candidate is: approved, material, structural, and worth
preserving independently.

Conversely, if a clearly material approved S6 decision lacks
`ADR CANDIDATE` marking, flag: **MISSING ADR CANDIDATE**. Do not
silently ignore a major structural decision.

---

## 11. ADR IDENTIFIERS AND STRUCTURE

Define stable identifiers: `ADR-0001`, `ADR-0002`, etc. Once assigned
and accepted, ADR IDs are stable. Do NOT renumber for cosmetic ordering.

File names may include a descriptive slug:
`ADR-0007-relational-primary-persistence.md`

Recommended ADR format:

```
# ADR-XXXX — <Decision Title>

STATUS:           PROPOSED / ACCEPTED / SUPERSEDED / DEPRECATED
DATE:             <decision date>
DECISION OWNERS:  <OWNER / architecture authority>
SOURCE TD:        TD-###
RELATED REQ IDS:  FR/BR/DR/PERM/INT/NFR where material

CONTEXT:
What problem/constraint required a decision?

DECISION:
What was selected?

ALTERNATIVES CONSIDERED:
Only credible alternatives actually evaluated.

RATIONALE:
Why was this choice preferred?

CONSEQUENCES:
Positive, negative, constraints introduced.

VERIFICATION / IMPLICATIONS:
What must downstream preserve?

SUPERSEDES:       <ADR / NONE>
SUPERSEDED BY:    <ADR / NONE>
REFERENCES:       S6 section, source evidence
```

Do not force fields that are meaningless. One coherent structural
decision per ADR. Do not fragment one decision into micro-ADRs or
bundle unrelated decisions.

Example ADR:

```
ADR-0001 — Modular Monolith Architecture

STATUS:           ACCEPTED
DATE:             2025-01-15
SOURCE TD:        TD-001
RELATED REQ IDS:  NFR-001, BR-003

CONTEXT:
S6 must satisfy NFR-001 (single-deployment-unit simplicity) and
BR-003 (independent module testability). The project has no approved requirement for independent scaling of
subsystems. S6 §6 (requirement-driven architecture) prohibits
introducing distributed complexity without evidence.

DECISION:
Modular monolith with enforced internal module boundaries.

ALTERNATIVES CONSIDERED:
Microservices — rejected: no approved scaling requirement to
justify distributed complexity (S6 anti-overarchitecture rule).
Layered monolith — considered but rejected: does not enforce
module-level encapsulation required by BR-003.

RATIONALE:
Simplest architecture satisfying all approved requirements.
Single deployment unit. Module boundaries enforced at code level
via dependency rules, not network boundaries.

CONSEQUENCES:
+ Simpler deployment, debugging, and testing.
+ Single process simplifies transaction management.
- No independent subsystem scaling without architecture change.
- Module boundary violations possible without runtime enforcement.

VERIFICATION:
Implementation must enforce module dependency rules.
S11 must verify boundary constraints.

SUPERSEDES:       NONE
SUPERSEDED BY:    NONE
```

---

## 12. ADR STATUS MODEL

- **PROPOSED** — Prepared but not yet accepted.
- **ACCEPTED** — Canonical technical decision.
- **SUPERSEDED** — Historically valid, replaced by newer accepted ADR.
- **DEPRECATED** — No longer recommended, no direct replacement needed.

Avoid status proliferation. Project-equivalent states may exist but
should be minimal.

Status transitions: PROPOSED → ACCEPTED (requires approval). ACCEPTED
→ SUPERSEDED (requires new accepted ADR). ACCEPTED → DEPRECATED
(requires governance decision). PROPOSED may be withdrawn without
trace if never accepted.

---

## 13. ACCEPTED ADR IMMUTABILITY

Once an ADR is ACCEPTED, do NOT rewrite its historical rationale to
make later implementation look consistent. Material decision change
requires a NEW ADR that records `SUPERSEDES` the prior one.

Historical decisions remain intelligible. Trivial non-semantic
corrections (typo, broken link, formatting) do not require a new
ADR. Do not use "typo correction" as pretext to rewrite rationale.

Supersession chain example:

```
ADR-0003 ACCEPTED  "Use PostgreSQL for all persistence"
ADR-0012 ACCEPTED  "Use document store for session cache"
  SUPERseeds ADR-0003 for session-cache scope only
  ADR-0003 remains ACCEPTED for primary application data
```

The superseding ADR must clearly delimit scope. Future readers must
understand what changed and what did not.

---

## 14. S6 → MANIFEST → ADR TRACEABILITY

Establish lightweight traceability:

```
S6 TD → PROJECT_MANIFEST FACT → ADR (when material)
```

Detect and prevent:

- **ORPHAN MANIFEST FACT** — structural fact without approved S6,
  mandate, ADR, or verified canonical source.
- **UNRECORDED MATERIAL DECISION** — approved S6 structural decision
  without manifest/ADR representation where required.

Material ADRs should retain traceability to S5 requirements when the
decision was driven by them: `NFR-003 → TD-004 → ADR-0004`.

Concrete traceability example:

```
S5: NFR-003 (ACID transactions required)
 → S6: TD-002 (Primary Persistence — relational, DECIDED, ADR CANDIDATE: YES)
 → S7 Manifest: "Primary persistence: relational database"
 → S7 ADR-0002: Full rationale for relational selection
```

If TD-002 existed but no manifest fact and no ADR referenced it:
UNRECORDED MATERIAL DECISION.

If the manifest states "Primary persistence: document store" but
S6 TD-002 says relational: S6/MANIFEST CONTRADICTION.

---

## 15. S6 / S7 CONSISTENCY AND CONTRACT PRESERVATION

S7 MUST NOT silently change S6. If S7 drafting reveals a manifest
statement or ADR that contradicts approved S6: **CONTRACT DIVERGENCE
DETECTED**. Determine whether S6 is outdated, S7 transcription is
wrong, a new approved decision exists, or source evidence is
inconsistent. Do not silently choose.

Canonical invariant: **NO DUAL TECHNICAL TRUTH.** If an approved
technical change affects S6, PROJECT_MANIFEST, or accepted ADRs, the
change process must identify and update all affected artifacts.

If factual implementation state differs from approved intent:
`FACTUAL != INTENDED → CONTRACT DIVERGENCE`, not silent manifest
rewrite.

---

## 16. OWNER-MANDATED DECISIONS

If a decision is MANDATED by OWNER or external constraint, ADR may
still be valuable when structural. The ADR must accurately record
`DECISION SOURCE: MANDATED` and the rationale (mandate existence,
consequence) when known. Do NOT pretend S6 selected it through
optimization if it was mandated.

---

## 17. REJECTED ALTERNATIVES

ADR should record only serious alternatives actually considered. Do
NOT fabricate alternatives to make an ADR look rigorous. If only
options A and B were credible, listing A and B is sufficient.

---

## 18. MANIFEST UPDATE POLICY

PROJECT_MANIFEST is a living canonical summary. Unlike accepted ADR
history, it may be updated as the approved baseline evolves. Every
material update must remain traceable to: approved S6 change,
accepted/superseding ADR, mandated constraint, or verified
implementation baseline.

Do not update Manifest merely because current code happens to differ.
That is a contract divergence, not a manifest rewrite.

Implementation status in manifest must not blur design and
implementation. At initial greenfield S7, the manifest records:
APPROVED TECHNICAL BASELINE = YES, IMPLEMENTATION = NOT STARTED.

Example of honest status:

```
Architecture: APPROVED (modular monolith)
Implementation Status: NOT STARTED
Primary Persistence: APPROVED (PostgreSQL)
Implementation Status: NOT STARTED
Authentication: APPROVED (JWT, stateless)
Implementation Status: NOT STARTED
```

Do not state "System uses modular monolith" as a factual runtime
claim before implementation exists.

---

## 19. ENVIRONMENT, DEPLOYMENT, AND COMMAND MEMORY

Manifest may preserve concise canonical facts: environments, runtime
target, deployment unit, hosting model, storage, migration mechanism.

When useful, Manifest may record canonical commands (build, test,
migration, start) — only when already approved/implemented facts.
Manifest may preserve high-level source structure when it represents
an architectural boundary (e.g., `apps/`, `packages/`, `modules/`).
Do NOT inventory every folder.

---

## 20. SECURITY-SENSITIVE DOCUMENTATION

Architecture memory must be useful without exposing operational secrets.

Allowed: authentication model, authorization model, trust boundaries,
secret-management mechanism, deployment topology at appropriate level.

Prohibited in Manifest and ADRs: real secret values, tokens,
passwords, private keys, sensitive connection strings, private URLs.

If a Manifest references external services (e.g., "Auth0 for identity
provider" or "Stripe for payments"), it records the integration
architecture — not API keys or webhook secrets.

---

## 21. FANTOMAS / PRIVILEGED PRINCIPALS

When a project uses Fantomas/Ghost, PROJECT_MANIFEST may reference
the privileged-principal architecture but MUST preserve the FROZEN
S0 semantic: Fantomas inherits 100% SUPER_ADMIN capabilities plus
Fantomas-specific break-glass/bootstrap/recovery capabilities.

When a project does not use Fantomas/Ghost, this section may be
omitted entirely. Do not create a privileged-principal section
merely to fill a template.

---

## 22. NO NEW TECHNICAL DESIGN IN S7

S7 MUST NOT become a second architecture-design phase. If a new
material technical decision is needed during S7, do not invent it
inside an ADR merely to complete S7. Return **TECHNICAL DECISION
REQUIRED** and route/update S6 according to governance. S7 records
approved decisions. S7 does not manufacture them. If S7
discovers a gap — an area where S6 is ambiguous — S7 flags
it and routes back. S7 does not fill gaps with its own design.

---

## 23. MANIFEST APPROVAL AND OWNER GATE

Manifest status model: **DRAFT** → **OWNER_REVIEW** → **APPROVED**
→ **FROZEN** → **SUPERSEDED**.

S7 cannot self-approve the project manifest baseline. Initial S7
closure requires PROJECT_MANIFEST: APPROVED and material ADR set:
ACCEPTED.

Before closure, present a concise summary: architecture baseline,
canonical stack, system boundaries, persistence, auth, deployment,
material constraints, ADR set, supersession relationships, and
non-blocking items. OWNER may APPROVE or REQUEST CHANGES.

---

## 24. S8 BOUNDARY

S7 MUST NOT create: delivery milestones, implementation roadmaps,
workstreams, release phases, sprints, work packages, tickets, or
dependency schedules. S8 answers: *In what order should the approved
product be delivered?* S7 may preserve technical dependency facts
but must NOT turn them into a delivery plan.

---

## 25. S9 / S10 BOUNDARY

S7 must not define the next implementation work package. S7 must not
implement. Work packages belong to S9. Implementation belongs to S10.

---

## 26. PROJECT_STATE TRANSITION

During actual S7 execution: AISE PHASE = S7, PROJECT MANIFEST = IN
PROGRESS, ADR BASELINE = IN PROGRESS.

At closure: CHARTER = APPROVED, REQUIREMENTS = APPROVED,
TECHNICAL SPECIFICATION = APPROVED, PROJECT MANIFEST = APPROVED,
MATERIAL ADRs = ACCEPTED, DELIVERY ROADMAP = NOT STARTED,
IMPLEMENTATION = NOT STARTED.

NEXT RECOMMENDED: S8 — Roadmap / Milestone Design.
NEXT AUTHORIZED: NONE until OWNER GO.

---

## 27. DEFINITION OF READY FOR S8

S7 is ready for OWNER approval / S8 handoff when:

- S6: APPROVED
- PROJECT_MANIFEST: coherent and concise
- ARCHITECTURE, TECHNOLOGY, SYSTEM BOUNDARIES, DATA/PERSISTENCE,
  AUTH/AUTHORIZATION, DEPLOYMENT baselines: represented
- ALL MATERIAL S6 ADR CANDIDATES: resolved (ADR created or explicit
  not-ADR-worthy rationale)
- ORPHAN MANIFEST FACTS: 0
- UNRECORDED MATERIAL DECISIONS: 0
- S6/MANIFEST CONTRADICTIONS: 0
- S6/ADR CONTRADICTIONS: 0
- BLOCKING TECHNICAL DECISIONS: 0
- OWNER APPROVAL: received

---

## 28. S8 HANDOFF

S7 hands off to S8 (Roadmap / Milestone Design):

- APPROVED PROJECT_MANIFEST
- ACCEPTED ADR SET
- ARCHITECTURAL BOUNDARIES
- TECHNICAL DEPENDENCY FACTS
- KNOWN NON-BLOCKING ITEMS

S7 does NOT implement S8.

S7 may identify that a technical dependency between modules suggests
a natural ordering (e.g., "authentication module must be verified
before authorization-dependent features"). Recording such facts
is fine. Converting them into milestone dates, sprint plans, or
ticket breakdowns is S8 territory.

---

## 29. QUALITY GATE

Before S7 OWNER_REVIEW:

- S6 APPROVED: YES
- PROJECT_MANIFEST CONCISE: YES
- S6 → MANIFEST STRUCTURAL COVERAGE: COMPLETE
- MATERIAL ADR CANDIDATES RESOLVED: YES
- ORPHAN STRUCTURAL MANIFEST FACTS: 0
- UNRECORDED MATERIAL TECHNICAL DECISIONS: 0
- S6 / MANIFEST CONTRADICTIONS: 0
- S6 / ADR CONTRADICTIONS: 0
- ACCEPTED ADRs WITH UNAPPROVED DECISIONS: 0
- SECRETS IN TECHNICAL MEMORY: 0
- FALSE IMPLEMENTATION CLAIMS: 0
- BLOCKING TECHNICAL QUESTIONS: 0
- OWNER APPROVAL: REQUIRED

---

## 30. FORWARD REFERENCES

- S8 — Roadmap / Milestone Design: docs/engineering/AISE_ROADMAP_MILESTONE_DESIGN.md

S7 does NOT invent S8 contents prematurely.

---

## 31. ANTI-OVERDOCUMENTATION

S7 must NOT: copy S6 wholesale into PROJECT_MANIFEST, create ADR for
every package, create ADR for trivial code decisions, fabricate
alternatives, rewrite accepted ADR history, invent new technical
design, modify application PROJECT_MANIFEST during this protocol
task, modify existing application ADRs, create delivery roadmaps,
create milestones or work packages, write code, create migrations,
deploy, or start S8.

---

## 32. ANTI-ANTI-PATTERNS

S7 must NOT reject a valid manifest because it is short. An internal
tool may have a ten-line manifest. S7 must NOT pad the manifest with
generic consulting language. S7 must NOT refuse to proceed because
the ADR set is empty — some projects have straightforward technical
baselines with no genuinely contested structural decisions. S7 must
NOT create ADRs merely to demonstrate process compliance.

---

## 33. ZERO SCHEDULED WORK

Observability documentation does NOT equal scheduled AI work.
ZERO SCHEDULED WORK remains in force. No cron jobs, no background
monitoring, no automated tasks created by S7. Observability
documentation describes what should be logged and monitored — it
does not authorize creating scheduled AI work to perform that
monitoring. The distinction between documenting operational
practices and scheduling automated AI labor must be preserved.