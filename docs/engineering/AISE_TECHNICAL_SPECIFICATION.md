# AISE — TECHNICAL SPECIFICATION PROTOCOL (S6)

**Authority:** Subordinate to S0 (AI Software Engineering OS). Inputs from
approved S4 PROJECT_CHARTER and S5 PRODUCT_REQUIREMENTS.
**Scope:** Universal AISE protocol. Project-agnostic.
Technology-neutral at the protocol level. Usable by AI agents and human
engineers. Operable without chat memory.

---

## 1. PURPOSE

S6 transforms:

- APPROVED PROJECT_CHARTER
- APPROVED PRODUCT_REQUIREMENTS
- CONFIRMED TECHNICAL CONSTRAINTS

into an OWNER-APPROVED TECHNICAL SPECIFICATION that answers:

**HOW will the approved product requirements be technically realized?**

S6 does NOT produce implementation roadmaps, work packages, ADR
files, or application code. S6 defines the technical solution. S7
preserves the canonical technical decisions.

---

## 2. S4 / S5 / S6 / S7 BOUNDARIES

| Stage | Question           | Output                  |
|-------|--------------------|--------------------------|
| S4    | WHY / WHO / SCOPE  | PROJECT_CHARTER          |
| S5    | WHAT product does  | PRODUCT_REQUIREMENTS     |
| S6    | HOW technically    | TECHNICAL_SPECIFICATION  |
| S7    | WHY decisions made | PROJECT_MANIFEST + ADR   |

S6 MUST NOT write application code, install packages, scaffold
frameworks, create migrations, modify databases, deploy, create ADR
files, create delivery milestones, or start implementation.

---

## 3. ENTRY PRECONDITION

S6 execution requires:

- PROJECT_CHARTER: APPROVED
- PRODUCT_REQUIREMENTS: APPROVED
- BLOCKING PRODUCT QUESTIONS: 0

If product behavior remains materially ambiguous, S6 MUST NOT invent
product semantics. S6 returns "PRECONDITION NOT MET" or routes the
divergence according to S0/S2.

Technical ambiguity belongs inside S6 — S6 resolves it. Product
ambiguity belongs to S5 / OWNER decision.

---

## 3.1 EXECUTION FLOW

S6 execution follows a structured process:

1. **Verify preconditions** — Confirm PROJECT_CHARTER and
   PRODUCT_REQUIREMENTS are APPROVED. Confirm zero blocking product
   questions. If preconditions fail, route per S0/S2.

2. **Inventory S5 inputs** — Extract all requirements, constraints,
   NFRs, calculation contracts, PERM requirements, and S6 DECISION
   INPUTS flagged by S5.

3. **Inventory technical constraints** — Collect OWNER-mandated
   constraints, platform constraints, regulatory constraints, and
   infrastructure constraints from the charter.

4. **Establish architecture** — Apply requirement-driven architecture
   (§6). Select the simplest architecture satisfying all approved
   requirements and material risks. Assign TD-001.

5. **Resolve major technical decisions** — For each material
   decision area, evaluate options (§7), select, assign TD-NNN,
   record rationale and consequences.

6. **Define component boundaries** — Decompose the system into
   components where justified. Map each component to requirements
   served.

7. **Design data architecture** — Translate S5 logical data into
   physical design where relevant. Preserve all critical data
   semantics.

8. **Design interfaces and integrations** — Define technical contracts
   for APIs and external integrations where required.

9. **Design auth, security, and privacy** — Translate S5 PERM
   requirements into authorization model. Define authentication and
   material security realization.

10. **Design reliability, concurrency, and performance** — Where
    material, define failure handling, consistency, and NFR
    realization.

11. **Define testing architecture** — Establish risk-driven
    verification layers linked to S5 acceptance criteria.

12. **Build traceability matrix** — Map every critical S5 requirement
    to an S6 design realization and verification type.

13. **Run quality gate** — Verify all §34 criteria pass. Resolve
    failures.

14. **Identify ADR candidates** — Flag TD-NNN entries that warrant
    durable ADR treatment in S7.

15. **Request OWNER approval** — Present summary. S6 cannot
    self-approve.

---

## 4. TECHNICAL DECISION STATES

Every material technical decision carries one of five states:

**DECIDED** — Approved technical decision. OWNER or evidence-confirmed.

**PROVISIONAL** — Preferred direction requiring confirmation or
evidence. Must be resolved before OWNER_REVIEW.

**OPEN** — Material technical question unresolved. Must be resolved
before S6 can close.

**MANDATED** — OWNER or external constraint. Not an S6 optimization
choice. S6 documents the constraint and its implications.

**DEFERRED** — Not required for current baseline. Explicitly recorded
with rationale for deferral.

**Silent conversions are forbidden:**

- PREFERENCE must NOT become MANDATED.
- PROVISIONAL must NOT become DECIDED without evidence.
- UNKNOWN must NOT become WORKAROUND.

---

## 5. TECHNICAL DECISION IDS

Material technical decisions receive stable lightweight IDs:

```
TD-001  Architecture style
TD-002  Primary persistence mechanism
TD-003  Authentication architecture
TD-004  Deployment model
TD-005  Major integration mechanism
TD-006  Consistency model
TD-007  Major runtime choice
```

IDs are assigned only for structurally important decisions — not for
every implementation detail. Examples of TD-worthy decisions:
monolith vs distributed, SQL vs document store, session-based vs
token-based auth, serverless vs containerized deployment.

Each material TD may flag:

```
ADR CANDIDATE:  YES / NO
```

S6 identifies ADR candidates. S7 creates the durable ADR files.

---

## 6. REQUIREMENT-DRIVEN ARCHITECTURE

**Core principle:**

> NO ARCHITECTURE WITHOUT A REQUIREMENT, CONSTRAINT, OR MATERIAL RISK
> JUSTIFYING IT.

S6 prefers the simplest architecture that satisfies approved
requirements and material risks.

The following must NOT be introduced by default:

- microservices
- message broker
- Kubernetes
- service mesh
- CQRS
- event sourcing
- multiple databases
- distributed transactions
- cache layers
- complex asynchronous infrastructure

Such mechanisms require evidence — a specific approved requirement or
a material risk that justifies the complexity. "Industry best
practice" or "modern architecture" is not evidence.

---

## 7. MATERIAL OPTION EVALUATION

For important decisions with multiple viable options, S6 defines:

- DECISION AREA
- REQUIREMENTS / CONSTRAINTS driving the decision
- OPTIONS CONSIDERED (only credible candidates)
- MATERIAL TRADE-OFFS for each option
- SELECTED OPTION
- RATIONALE linking back to requirements/constraints
- CONSEQUENCES of the selection
- STATUS (DECIDED / PROVISIONAL / OPEN / MANDATED)

Fake comparison matrices are forbidden. Compare only candidates that
are genuinely viable for the project's requirements and constraints.

Example evaluation format for a material decision:

```
TD-002: Primary Persistence Mechanism

DECISION AREA:  Data persistence
REQUIREMENTS:   FR-012 structured queries, DR-003 ACID transactions,
                NFR-002 sub-100ms read latency
OPTIONS:        PostgreSQL, SQLite, MongoDB

PostgreSQL:     Meets all requirements. Mature. Strong ACID.
                Requires separate server or managed service.
SQLite:         Meets FR-012, DR-003. Single-file. No separate server.
                Concurrency limited to single-writer.
MongoDB:        Does not meet DR-003 ACID requirement at document level
                without additional configuration. Rejected.

SELECTED:       PostgreSQL (or SQLite if single-writer suffices)
RATIONALE:      DR-003 ACID is non-negotiable. Latency NFR met by
                both SQL options. Selection depends on deployment
                model (TD-004).
CONSEQUENCES:   Requires connection pooling. Backup strategy needed.
ADR CANDIDATE:  YES
STATUS:         DECIDED
```

---

## 8. ARCHITECTURE COVERAGE

S6 defines the following where materially relevant to the project:

**System Context** — Technical system boundary, actors (human and
system), external systems, trust boundaries.

**Architecture Style** — Selected architecture (monolith, modular
monolith, client-server, etc.), responsibility boundaries, dependency
direction rules, communication model (sync/async), state ownership.

**Component / Module Boundaries** — For each component: name,
responsibility, requirements served, what it owns, what it depends on,
what it must not own, and its interfaces.

**Technology Stack** — Selected technologies with requirement or
constraint rationale for each selection.

Sections that carry no material information for the project are
omitted. An internal tool with no external integrations does not
require an integration architecture section.

---

## 9. DATA ARCHITECTURE

S6 translates S5 logical data semantics into physical design where
relevant. This may include:

- Persistence model and system of record
- Data ownership and transaction boundaries
- Consistency expectations
- History and audit requirements
- Retention and deletion policies
- Concurrency and conflict handling
- Backup/recovery expectations

**Physical data design** may specify:

- Tables or collections with relationships
- Keys (primary, foreign, natural, surrogate)
- Constraints (unique, check, referential)
- Indexes for material query patterns
- Physical types, nullability, precision, scale
- Referential behavior (cascade, restrict, set null)

S6 does NOT create migration files or execute database writes.

---

## 10. CALCULATION REALIZATION

Where S5 contains calculation contracts, S6 defines safe technical
realization:

- Numeric representation (integer, decimal, float, big number)
- Precision and rounding implementation
- Calculation layer and ordering
- Determinism guarantees
- Date/time semantics and timezone handling
- Internal vs display value separation

**Critical invariant:** S5 defines business semantics. S6 defines
safe technical realization. S6 must NOT redefine a formula or
rounding rule because another implementation is easier.

For example: if S5 specifies "prices are rounded to two decimal
places using half-up rounding," S6 must implement exactly that.
S6 may choose whether rounding happens in application code, database
layer, or a dedicated calculation service — but the rounding rule
itself is immutable from S6's perspective.

---

## 11. APIs / INTERFACES

Where required, S6 defines technical contracts:

- Purpose and protocol (REST, GraphQL, gRPC, WebSocket, CLI, etc.)
- Request, response, and event structures
- Authentication and authorization model
- Input validation rules
- Error semantics (codes, messages, structure)
- Idempotency guarantees
- Versioning approach
- Pagination where applicable
- Compatibility expectations

Detailed API specifications are permitted where required as technical
contracts. S6 does NOT invent product behavior absent from S5.

---

## 12. EXTERNAL INTEGRATIONS

For material integrations, S6 defines:

- External provider or system
- Protocol and data format
- Authentication mechanism
- Data mapping between systems
- Trigger model (push, pull, event)
- Sync vs async behavior
- Timeout and retry semantics
- Idempotency and duplicate handling
- Failure behavior and degradation
- Consistency model across systems
- Observability (logging, error correlation)

S6 does NOT invent retries or fallbacks that alter approved business
semantics.

For example: if S5 specifies "payment submission is idempotent by
client-provided idempotency key," S6 designs the idempotency mechanism.
But if S5 does not specify idempotency for payment, S6 must NOT add
automatic retry logic that could submit a payment twice.

---

## 13. AUTHENTICATION / AUTHORIZATION

**Authentication design** may include: identity source, credential
and session model, flows (login, logout, password reset),
session/token lifecycle, recovery/bootstrap procedures, and external
identity provider integration.

**Authorization design** must translate S5 PERM requirements into:

- Principal model (user, service, system identities)
- Roles, permissions, and claims structure
- Server-side enforcement points
- Resource and context scoping
- Privileged principal handling
- Administrative boundaries
- Audit expectations

If Fantomas/Ghost exists in a project, preserve S0 FROZEN semantics
exactly: Fantomas inherits 100% SUPER_ADMIN capabilities plus
Fantomas-specific break-glass/bootstrap/recovery capabilities.

---

## 14. SECURITY / PRIVACY

S6 defines only material security and privacy realization:

- Trust boundaries between actors and systems
- Authentication and authorization enforcement
- Input validation and output encoding
- Data protection at rest and in transit
- Secret architecture (storage, rotation, access)
- Sensitive data boundaries and masking
- Audit trail requirements
- Session controls
- Privacy controls (consent, data subject rights)
- Retention and deletion realization

Security design must be proportional to actual requirements and risk.
S6 does NOT create a generic security encyclopedia.

---

## 15. RELIABILITY / FAILURE MODEL

Where material, S6 defines:

- Transaction failure handling
- Partial failure behavior
- External dependency failure modes
- Timeouts and circuit-breaking
- Retryability and idempotency
- Duplicate delivery handling
- Network interruption recovery
- Concurrency conflict resolution
- Restart and recovery behavior
- Degraded mode operation

S6 preserves S5 business and error semantics. Technical failure
handling must not silently redefine approved product behavior.

---

## 16. CONCURRENCY / CONSISTENCY

Where required, S6 defines:

- Consistency model (strong, eventual, causal)
- Transaction scope and isolation
- Locking strategy or optimistic concurrency
- Conflict detection and resolution
- Idempotency and duplicate prevention
- Ordering guarantees where needed

No distributed consistency machinery (saga, two-phase commit, etc.)
without evidence from approved requirements or material risk.

---

## 17. PERFORMANCE / CAPACITY

For approved performance NFRs, S6 maps:

- NFR → TECHNICAL REALIZATION → ASSUMPTIONS → VERIFICATION METHOD

S6 does NOT invent performance targets. S6 does NOT add caching by
default. For materially architecture-dependent unknown scale, S6
records an OPEN TECHNICAL QUESTION. S6 does not design for
hypothetical internet-scale traffic absent approved requirements.

Example NFR mapping:

```
NFR-003 | API response time p95 < 200ms |
  REALIZATION: Database query optimization, connection pooling,
              response caching only if evidence shows cache miss rate
              acceptable |
  ASSUMPTIONS: Single-region deployment, <1000 concurrent users |
  VERIFICATION: Load test with realistic data volume at target scale |
  STATUS: DECIDED
```

---

## 18. TESTING ARCHITECTURE

S6 defines risk-driven verification architecture. Possible layers:

- Unit tests — prove isolated component behavior
- Component tests — prove module-level contracts
- Integration tests — prove component interaction
- Real database integration — prove data layer correctness
- Contract tests — prove interface conformance
- End-to-end tests — prove critical user workflows
- Security tests — prove auth/authz and data protection
- Performance tests — prove NFR compliance
- Migration tests — prove data migration correctness
- Recovery tests — prove failure handling

For each relevant layer, S6 defines: what the layer proves, what may
be mocked, what must NOT be mocked (critical integration boundaries),
environment assumptions, and relationship to S5 acceptance criteria.

Critical boundaries must NOT be mocked away merely to manufacture
PASS. S6 does NOT mechanically enforce a testing pyramid — the
verification architecture serves the project's risk profile.

**Mocking discipline:** S6 explicitly declares which boundaries may
use test doubles and which must use real infrastructure. A payment
integration test must hit a real (or sandbox) payment API, not a
mock that returns success. A database query test must use a real
database engine, not an in-memory stand-in that silently accepts
invalid SQL.

**Testing architecture vs test plan:** S6 defines the architecture
(what layers, what boundaries, what must be real). S10 produces the
actual tests. S6 does not write test code.

---

## 18.1 CHANGE CONTROL DURING S6

If S6 discovers during execution that an approved S5 requirement
cannot be technically realized as specified, S6 MUST NOT silently
redefine the requirement. Instead:

1. Document the technical conflict.
2. Propose alternatives with trade-off analysis.
3. Route to OWNER for decision — this is a product change, not a
   technical optimization.
4. If OWNER approves the alternative, S5 is updated first (per S5
   change control), then S6 proceeds with the updated requirement.

S6 changes to approved S5 requirements without OWNER approval are
contract violations.

---

## 19. TRACEABILITY

S6 establishes:

```
S5 REQUIREMENT → S6 DESIGN REALIZATION → EXPECTED VERIFICATION TYPE
```

This compact traceability matrix detects:

- UNADDRESSED CRITICAL REQUIREMENT — an S5 requirement with no S6
  design realization.
- UNJUSTIFIED TECHNICAL COMPLEXITY — S6 design elements with no
  traced requirement, constraint, or material risk.

---

## 20. OBSERVABILITY

Where relevant, S6 defines:

- Structured logging and log levels
- Domain events and event structure
- Metrics (business, technical, SLI)
- Distributed traces where applicable
- Health indicators and readiness probes
- Audit signals
- Error correlation (request ID, trace ID)
- Diagnostic context propagation

Observability design is permitted. However, observability does NOT
equal scheduled AI work. ZERO SCHEDULED WORK remains in force.

---

## 21. ENVIRONMENT MODEL

Where relevant, S6 defines environments:

- Development
- Test
- Preview / staging
- Production

Including: configuration categories, environment-specific values,
secret references, feature flags (only when justified with evidence),
target identity verification, and write safeguards.

Mandatory invariant: TARGET NOT VERIFIED → NO WRITE. S6 never
includes real secrets.

---

## 22. DEPLOYMENT ARCHITECTURE

S6 designs deployment. S13 executes production deployment.

Where relevant, S6 defines:

- Runtime and hosting model
- Processes and services
- Network boundaries and ingress/egress
- Storage volumes and persistence
- Build artifacts and deployment units
- Health checks and startup probes
- Environment model references
- Migration execution concept (not files)
- Rollback capability
- Availability model

---

## 23. MIGRATION / EVOLUTION

Where applicable, S6 defines:

- Migration mechanism
- Compatibility requirements (forward, backward)
- Deployment ordering constraints
- Data transformation assumptions
- Rollback and recovery approach
- Legacy transition strategy
- Zero-downtime requirement only if approved by OWNER

S6 does NOT create or execute migration files.

---

## 24. BACKUP / RECOVERY

Where materially required, S6 defines:

- Backup scope and frequency
- Recovery expectations
- RPO/RTO only if approved by OWNER
- Restore verification
- Data-loss tolerance
- Operational ownership

S6 does NOT invent RPO/RTO numbers absent OWNER specification.

---

## 25. BUILD / DEPENDENCIES / SOURCE STRUCTURE

Where material, S6 defines:

- Language and runtime version
- Package manager and lockfile strategy
- Build mechanism and pipeline
- Supported platforms
- Dependency boundaries (production vs development)

S6 may define high-level repository or source structure when necessary
to express architecture. S6 does NOT design every class, file, or
folder.

---

## 26. TECHNICAL NFR MATRIX

S6 provides a lightweight mapping for material NFRs:

```
NFR ID | REQUIREMENT | TECHNICAL REALIZATION | VERIFICATION | STATUS
```

Only material NFRs. No boilerplate categories. No invented targets.

---

## 27. TECHNICAL RISKS

S6 maintains a compact risk register:

```
RISK | EVIDENCE | IMPACT | RESPONSE | OWNER IF RELEVANT
```

Possible responses: ACCEPT, MITIGATE, INVESTIGATE, OWNER DECISION.

Speculative risk catalogues are forbidden. Every risk must have
evidence or a concrete scenario. S6 does not pad the register with
generic concerns.

---

## 28. OPEN TECHNICAL DECISIONS

For unresolved technical questions, S6 records:

- QUESTION
- WHY IT MATTERS (requirement or risk link)
- OPTIONS / EVIDENCE
- BLOCKING: YES / NO
- RESOLUTION OWNER: S6 / OWNER / S7 / later

S6 cannot close with blocking architecture ambiguity. S6 does NOT
block on trivial implementation details that can be resolved during
S10 execution.

---

## 29. PROJECT ARTIFACT STRUCTURE

The default actual-project technical specification output:

```
docs/architecture/TECHNICAL_SPECIFICATION.md
```

Recommended structure (omit sections with no material content):

1. Document Status
2. Technical Context
3. System Context and Boundaries
4. Architecture Overview
5. Technical Decisions
6. Components / Modules
7. Technology Stack
8. Data Architecture
9. Physical Data Design
10. Interfaces / APIs
11. External Integrations
12. Authentication
13. Authorization
14. Security / Privacy
15. Reliability / Failure Model
16. Concurrency / Consistency
17. Performance / Capacity
18. Testing Architecture
19. Observability
20. Configuration / Environments
21. Deployment Architecture
22. Migration / Evolution
23. Backup / Recovery
24. Requirement-to-Design Traceability
25. Technical Risks
26. Open Technical Decisions
27. ADR Candidates for S7
28. S7 Handoff
29. Approval / Baseline Status

Empty sections with no material content must be omitted.

---

## 30. STATUS AND OWNER APPROVAL

S6 document status model:

**DRAFT** — Under development.

**OWNER_REVIEW** — Ready for OWNER review. Quality gate must pass.

**APPROVED** — OWNER has approved the technical specification.

**FROZEN** — Approved and locked. Changes require formal control.

**SUPERSEDED** — Replaced by a later approved version.

S6 cannot self-approve. S6 CLOSED / PASS requires at least APPROVED
status or repository-equivalent governance.

Before requesting OWNER approval, S6 summarizes: architecture,
major stack choices, data design, integration model, auth/security,
deployment, testing, critical NFR realization, material risks,
trade-offs, blocking questions, and ADR candidates.

---

## 31. CONTRACT PRESERVATION

**APPROVED S5 drives S6. APPROVED S6 drives downstream implementation.**

Implementation pressure must NOT silently redefine: requirements,
architecture, tests, fixtures, environment, or quality gates.

When approved behavior or design conflicts with factual
implementation: CONTRACT DIVERGENCE DETECTED → CLASSIFY FIRST →
UNKNOWN → INVESTIGATE → NEVER UNKNOWN → WORKAROUND.

---

## 32. DEFINITION OF READY FOR S7

S6 is ready for S7 handoff only when:

- PROJECT_CHARTER: APPROVED
- PRODUCT_REQUIREMENTS: APPROVED
- ARCHITECTURE: clear
- MAJOR COMPONENT BOUNDARIES: clear
- MAJOR TECHNOLOGY CHOICES: resolved
- DATA ARCHITECTURE: defined
- CRITICAL DATA SEMANTICS: preserved
- INTERFACE STRATEGY: clear
- AUTH / AUTHORIZATION: defined where required
- CRITICAL SECURITY / PRIVACY: realized
- CRITICAL NFRs: realized
- TESTING ARCHITECTURE: defined
- DEPLOYMENT MODEL: defined sufficiently
- BLOCKING TECHNICAL QUESTIONS: 0
- UNADDRESSED CRITICAL S5 REQUIREMENTS: 0
- UNJUSTIFIED MAJOR COMPLEXITY: 0
- ADR CANDIDATES: identified
- OWNER APPROVAL: received

---

## 33. S7 HANDOFF

S6 hands off to S7 (Project Manifest + ADR):

- APPROVED TECHNICAL SPECIFICATION
- TECHNICAL DECISION LIST (all TD-NNN entries)
- ADR CANDIDATES
- SELECTED STACK
- ARCHITECTURAL BOUNDARIES
- CANONICAL TECHNICAL CONSTRAINTS

S6 does NOT implement S7. S6 does NOT create ADR files.

---

## 34. QUALITY GATE

Required before S6 OWNER_REVIEW:

- BLOCKING PRODUCT AMBIGUITIES: 0
- BLOCKING TECHNICAL DECISIONS: 0
- UNADDRESSED CRITICAL S5 REQUIREMENTS: 0
- S6 DECISIONS CONTRADICTING S5: 0
- UNJUSTIFIED MAJOR TECHNICAL COMPLEXITY: 0
- MANDATED CONSTRAINTS IGNORED: 0
- CRITICAL NFRs WITHOUT REALIZATION: 0
- CRITICAL BOUNDARIES WITHOUT VERIFICATION STRATEGY: 0
- MAJOR DECISIONS WITHOUT RATIONALE: 0

Any quality gate failure prevents OWNER_REVIEW. The failure must be
resolved, re-classified, or routed through S0/S2 before proceeding.

---

## 35. FORWARD REFERENCES

- S7 — AISE Project Manifest + ADR → docs/engineering/AISE_PROJECT_MANIFEST_ADR.md

S6 does NOT invent S7 contents prematurely.

---

## 36. ANTI-OVERARCHITECTURE

S6 must NOT automatically:

- Select microservices without evidence
- Add event bus, message broker, or queue
- Add cache layer without an approved performance requirement
- Add multiple databases without evidence
- Add Kubernetes without evidence
- Add service mesh
- Add CQRS or event sourcing without evidence
- Add speculative scale infrastructure
- Create application code, migrations, or deployments
- Create S7 ADR files
- Create S8 roadmaps or S9 work packages
- Start S10 implementation

Every architectural mechanism must trace to an approved requirement,
constraint, or material risk.

---

## 37. ANTI-ANTI-PATTERNS

S6 must NOT reject a valid technical specification because it is
short. An internal tool may need five technical decisions. An
enterprise platform may need fifty. Depth must match project
complexity.

S6 must NOT pad the specification with generic consulting language
("we leverage cloud-native principles," "the system is designed for
high availability") to reach an assumed length.

S6 must NOT refuse to proceed because the technical landscape is
straightforward. A simple monolith with one database is a valid
architecture when it satisfies the requirements.

S6 must NOT treat every possible technology option as requiring a
full comparison matrix. If only one credible option satisfies the
constraints, select it and record the rationale.

S6 must NOT create architecture for hypothetical future requirements.
"We might need to scale to millions of users" is not a requirement
unless the OWNER approves it as one.
