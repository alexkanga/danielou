# AISE — PRODUCT REQUIREMENTS / CAHIER DES CHARGES (S5)

**Purpose:**
Transform an OWNER-approved Project Charter into a precise, testable,
traceable product requirements specification — the authoritative
contract defining exactly WHAT the product must do, for WHOM, under
which CONDITIONS, governed by which RULES.

**Authority:**
Subordinate to S0. If conflict, S0 wins. Inherits S0 Contract
Preservation: once the requirements baseline is APPROVED, it becomes
part of the project INTENDED STATE and must not be silently modified.

**Invocation:** S2 routes NEW_PROJECT → S3 → S4 → S5. S4 delivers
an OWNER-approved PROJECT CHARTER. S5 begins when the OWNER issues
a GO to proceed with requirements elaboration.

**Canonical Governance:**
S0 — `docs/engineering/AI_SOFTWARE_ENGINEERING_OS.md`

---

## 1. S5 BOUNDARY

S5 answers: **"Exactly what must the product do?"**

S5 defines: functional behavior, business rules, data semantics,
workflow states, permissions, integrations, error behavior, and
non-functional quality expectations — at a level precise enough
for downstream design, implementation, and verification.

S5 does NOT answer:
- "Which framework, language, or database?" → S6
- "How should the code be structured?" → S6
- "What is the deployment architecture?" → S6
- "What libraries or tools should we use?" → S6

S5 MUST NOT create database schemas, API endpoint definitions,
CI/CD pipelines, Dockerfiles, infrastructure-as-code, or application
scaffolding. Conceptual entities and workflows are allowed; physical
implementation is not.

S5 MUST NOT produce engineering milestones, sprints, implementation
tickets, migration plans, or deployment plans.

S5 MUST NOT write application code, modify runtime configuration,
change databases, run migrations, or deploy resources.

---

## 2. S4/S5/S6 BOUNDARIES

| Stage | Scope | Output |
|-------|-------|--------|
| **S4** | Project identity and purpose | PROJECT CHARTER |
| **S5** | Product requirements | CAHIER DES CHARGES / PRD |
| **S6** | Technical specification | ARCHITECTURE DECISION RECORDS |

S4 establishes **why** and **what boundaries**. S5 establishes
**what the product must do** within those boundaries. S6 establishes
**how to build it technically**.

S5 must NOT silently expand S4 out-of-scope areas. No requirement
may appear without traceability to an approved Charter objective,
OWNER decision, or authoritative source.

---

## 3. ENTRY PRECONDITION

S5 requires: **PROJECT CHARTER — APPROVED.**

If the Charter is in DRAFT, OWNER_REVIEW, or DISCOVERY_BLOCKED state,
S5 must NOT proceed. Return **S5 PRECONDITION NOT MET** unless the
OWNER explicitly authorizes requirements work on a provisional Charter.

If provisional work is authorized, all resulting requirements must
be labeled **PROVISIONAL** until the Charter is approved.

---

## 4. INPUT CONTRACT

S5 consumes:

**A. APPROVED PROJECT CHARTER** — purpose, problem, users/stakeholders,
objectives, scope, out-of-scope, constraints, assumptions,
dependencies, success definition.

**B. OWNER-PROVIDED DETAILED INFORMATION** — business rules, workflows,
forms, calculations, permissions, reports, existing procedures, screen
expectations, policies.

**C. VERIFIED SOURCE MATERIAL** — manuals, regulations, legacy
specifications, process documents, existing product behavior, datasets,
contracts, approved notes.

**D. CONFIRMED INPUT FROM S4** — any detailed rules already captured
during S4 discovery.

**E. KNOWN CONSTRAINTS** — only those already confirmed as CONFIRMED.

S5 must not use generic industry assumptions as project requirements
without identifying them as ASSUMPTION.

---

## 5. REQUIREMENT EVIDENCE STATES

Every material requirement carries one of four epistemic states:

**CONFIRMED** — supported by OWNER approval or authoritative project
evidence. The strongest claim.

**ASSUMPTION** — plausible and consistent with OWNER intent but not
explicitly approved. Must be labeled and presented for review.

**OPEN** — materially unresolved and potentially decision-relevant.
Cannot be silently converted to a requirement.

**DEFERRED** — explicitly moved outside current delivery scope by
OWNER decision.

**Core rule: Never silently promote ASSUMPTION → CONFIRMED.**
**Core rule: Never convert OPEN → requirement without evidence.**

---

## 6. REQUIREMENT IDENTIFIERS

S5 uses stable, lightweight identifiers:

```
FR-###    Functional Requirement
BR-###    Business Rule
DR-###    Data Requirement
PERM-###  Permission / Authorization Requirement
INT-###   Integration Requirement
NFR-###   Non-Functional Requirement
```

Additional categories only when materially useful. Do NOT create
dozens of taxonomies. IDs must be stable once the baseline is
APPROVED/FROZEN. Do not renumber for cosmetic ordering.

---

## 7. REQUIREMENT RECORD FORMAT

Each material requirement uses a compact structured record:

```
ID:            FR-001
TITLE:         <concise name>
REQUIREMENT:   The system shall...
ACTOR:         <actor / system / N/A>
RATIONALE:     <why this exists>
SOURCE:        Owner / Charter objective / policy / evidence reference
STATUS:        CONFIRMED / ASSUMPTION / OPEN / DEFERRED
PRIORITY:      MUST / SHOULD / COULD / DEFERRED
ACCEPTANCE:    <observable/testable conditions>
DEPENDENCIES:  <requirement IDs or external, if material>
```

Omit fields where they are meaningless. Do not force every field
for trivial requirements.

---

## 8. REQUIREMENT QUALITY RULES

**Atomic.** Prefer one independently testable behavior per
requirement. Bad: "The system shall manage users, generate reports,
and send emails." Good: separate FR-001, FR-002, FR-003.

**Testable.** Avoid vague wording: "user-friendly," "fast," "secure,"
"modern," "intuitive," "robust," "scalable," "easy." If a quality
attribute matters, specify an observable or measurable expectation.

If a numerical target is unknown, record: **TARGET TO BE DEFINED.**
Do not fabricate numbers.

**Not pathologically fragmented.** A requirement should represent one
meaningful behavior or rule, not a trivial implementation step.

---

## 9. FUNCTIONAL REQUIREMENTS

Functional requirements define user/system behavior. For each
meaningful capability, identify: trigger, actor, preconditions,
normal behavior, outcome, material alternative paths, and material
failure behavior.

Do NOT turn every requirement into an enormous use-case document.
Use enough precision for downstream implementation and testing.

Functional requirements express product behavior, not solution
design. "The system shall prevent duplicate invoice numbers within
a fiscal year" is a functional requirement. "Use a database unique
constraint on (invoice_number, fiscal_year)" is not.

Group related functional requirements by capability area or actor
for readability. Do not create a flat unstructured list when the
product has natural functional domains.

---

## 10. BUSINESS RULES

Business rules must be explicit, not buried in prose. Use BR-
identifiers. Examples: eligibility, calculation, approval, deadline,
validation, classification, ranking, threshold, status transition,
retention, uniqueness, ownership.

If formulas exist: record the exact formula.
If rounding exists: record exact rounding semantics.
If ordering exists: record order and tie behavior.
If timezone/date boundaries matter: record the business semantics.

Do NOT leave critical mathematical behavior implicit.

---

## 11. CALCULATION CONTRACTS

For products containing calculations, S5 must define:

- inputs and included/excluded values
- missing-value and null semantics
- error/incomplete input semantics
- formula and order of operations
- rounding and precision
- threshold behavior and tie behavior
- display value vs. internal value when materially distinct

Do NOT choose programming numeric types. Business precision belongs
to S5; type selection belongs to S6.

---

## 12. WORKFLOWS AND STATE MODELS

When the product contains meaningful workflows or lifecycle states,
S5 must describe them.

**Workflow structure:** name, actor, entry condition, business-level
step sequence, material alternative paths, failure/rejection paths,
exit state, related requirement IDs.

**State model:** for each state — business meaning, entry conditions,
allowed transitions, forbidden transitions (where material), who may
transition, business side effects.

Do not specify implementation calls, database operations, or event
names.

---

## 13. PERMISSIONS / AUTHORIZATION

S5 defines authorization semantics at product level: who may view,
create, edit, approve, publish, delete, restore, export, administer.
Use PERM-### identifiers.

Prefer a compact permission matrix when useful:
ACTION × ROLE/ACTOR → ALLOWED / DENIED / CONDITIONAL.

Do NOT choose the technical authorization framework or library.
Preserve any S0/Fantomas semantics when the project uses them.

---

## 14. DATA REQUIREMENTS

S5 defines logical product data, not physical database design. For
important entities:

- business name and purpose
- key attributes (business fields, not column types)
- identity / uniqueness rules
- ownership
- business lifecycle
- history / audit needs
- retention requirements
- data quality rules

Do NOT define SQL tables, indexes, foreign keys, ORM schemas, or
column types. Those belong to S6.

---

## 15. REQUIRED FIELD AND VALIDATION SEMANTICS

For important user/business inputs, specify: required vs. optional,
format semantics, allowed values, ranges, cross-field rules, duplicate
behavior, invalid input behavior, and missing input behavior.

Do not force specification of trivial UI-only fields unless
meaningful for correctness.

---

## 16. INTEGRATION REQUIREMENTS

When external systems exist, define: external actor/system, business
purpose, direction, information exchanged, trigger/frequency,
business-level success condition, failure expectation, ownership, and
known mandatory protocol constraint if externally imposed.

Use INT-### identifiers.

Example: "The product shall transmit approved payment instructions
to the authorized payment provider and record acceptance or rejection."
Not: "Implement POST /v1/payments using Axios."

---

## 17. REPORTING, SEARCH, AND EXPORT

**Reports/exports:** purpose, authorized audience, content, filters,
period/context, ordering, totals/calculations, format requirement if
business-mandated, snapshot vs. live semantics, historical behavior,
confidentiality.

**Search/filter/sort:** searchable business fields, filter semantics,
sort semantics, default ordering, scope, empty-result behavior,
pagination expectation if product-relevant, whether filtering changes
aggregate calculations.

Do not choose PDF libraries, table components, or search engines.

---

## 18. ERROR, EMPTY, AND INCOMPLETE STATES

S5 must specify important non-happy-path behavior. For material
workflows, consider: zero, one, many, duplicate, missing, partial,
invalid, boundary values, concurrent business action, cancelled/
deleted state, historical state, permission failure, external
dependency failure.

Avoid generic "show an error." Specify the intended product
consequence for each material case. Example: "When a payment
instruction is rejected by the provider, the system shall retain the
instruction in a FAILED state, notify the submitting actor, and
allow resubmission after correction."

Do not invent unrealistic edge cases. Focus on cases that materially
affect correctness, data integrity, or user trust.

---

## 19. AUDIT AND HISTORY REQUIREMENTS

Where traceability matters, define: what business actions require
audit, what before/after state must be preserved, who performed the
action, when, reason/comment if required, immutability expectations,
and who may view history.

Do not choose logging technology.

---

## 20. NON-FUNCTIONAL REQUIREMENTS

S5 includes only materially relevant product-quality requirements.
Potential categories: performance, availability, reliability,
security/privacy, accessibility, localization, compatibility,
auditability, data integrity, recoverability, maintainability when it
has product/operational consequence.

Do NOT create boilerplate NFRs for every possible category. Each NFR
must be material, testable where possible, and source-backed.

Security/privacy requirements at product level: authentication
requirements, role restrictions, confidential data access, session
expectations, audit of sensitive operations, data minimization,
consent, retention/deletion obligations. Do NOT prescribe specific
crypto libraries, IAM providers, or token formats unless externally
mandated.

---

## 21. CONTRADICTION DETECTION

If two requirements or sources conflict: **DO NOT silently reconcile.**

Return **CONTRACT DIVERGENCE DETECTED** and record: Requirement A,
Requirement B, Source A, Source B, impact, and classification.

If intended behavior itself is ambiguous:
**OWNER DECISION REQUIRED.**

Do not manufacture a compromise between conflicting sources.

---

## 22. TRACEABILITY TO S4

S5 maintains lightweight bidirectional traceability.

Every major S4 objective/scope area must be covered by one or more S5
requirements OR explicitly deferred/excluded.

Every material S5 requirement must trace to: Charter objective, Charter
scope, OWNER decision, authoritative source, or approved change.

**Detect ORPHAN REQUIREMENTS:** requirements with no approved
source or rationale. Do not silently add scope.

**Detect UNCOVERED CHARTER OBJECTIVES:** Charter commitments with no
requirement coverage. Do not silently drop scope.

A compact traceability table suffices. Do not create a heavyweight
requirements-management database.

---

## 23. REQUIREMENT CHANGE CONTROL

Once the Product Requirements baseline is APPROVED/FROZEN, it becomes
part of the project INTENDED STATE. Changes must not occur silently.

A material change requires: (1) evidence or reason, (2) affected
requirement IDs, (3) impact on scope and acceptance, (4) OWNER
approval when required, (5) baseline/document update, (6) downstream
impact review.

Do not rewrite historical intent to match current implementation.
This directly inherits S0 Contract Preservation.

---

## 24. DOCUMENT STATUS MODEL

```
DRAFT          — requirements being elaborated
OWNER_REVIEW   — coherent specification awaiting approval
APPROVED       — Owner accepts requirements baseline
FROZEN         — optional stronger baseline per project governance
SUPERSEDED    — previous approved baseline replaced by later version
```

S5 CLOSED / PASS requires at least APPROVED status.

---

## 25. OWNER APPROVAL GATE

S5 cannot self-approve. Absence of OWNER objection is NOT approval —
explicit acknowledgment is required.

Before approval, present the OWNER a concise summary: scope coverage,
actors, major workflows, critical business rules, permission model,
data concepts, integrations, critical NFRs, open assumptions, blocking
questions, and deferred scope.

Highlight any item requiring explicit decision. One baseline
approval may approve the coherent requirements set — do not demand
individual approval of hundreds of requirements unless materially
necessary.

The OWNER may: Approve (baseline frozen), request changes (S5 revises
and re-presents), provide additional information (S5 incorporates
and re-classifies), expand scope (S5 adds but does not begin S6),
or narrow scope (S5 removes and updates deferred list).

---

## 26. BLOCKING VS NON-BLOCKING OPEN QUESTIONS

**BLOCKING:** Without resolution, implementation semantics would be
materially ambiguous. S5 cannot close with blocking product-behavior
ambiguity.

**NON-BLOCKING:** Can safely be decided later without invalidating
S6 or current scope. Technical questions may be handed to S6 if
product behavior is already clear.

---

## 27. HANDOFF TO S6

S5 explicitly identifies technical decisions required next — labeled
as **S6 TECHNICAL DECISION INPUT**. Examples: data persistence
strategy, architecture, framework, API style, authentication
implementation, deployment target, queue/eventing, caching, physical
schema, observability, backup mechanics, technical performance design.

S5 does NOT decide these. S5 identifies them and hands them off.

---

## 28. DEFINITION OF READY FOR S6

S5 is ready for OWNER approval / S6 handoff when:

```
CHARTER                        APPROVED
SCOPE                          decomposed into requirements
ACTORS/ROLES                   clear
CRITICAL FUNCTIONAL BEHAVIOR   defined
CRITICAL BUSINESS RULES        explicit
CRITICAL CALCULATIONS          unambiguous
WORKFLOW STATES                defined where material
PERMISSIONS                    defined where material
DATA SEMANTICS                 sufficiently clear
INTEGRATIONS                   business expectations clear
ERROR/INCOMPLETE BEHAVIOR      defined where material
CRITICAL NFRs                  defined sufficiently
BLOCKING PRODUCT QUESTIONS     0
TRACEABILITY                   coherent
S6 DECISION INPUTS             identified
OWNER APPROVAL                received
```

Do not require technical architecture to close S5.

---

## 29. PROJECT_STATE TRANSITION

During S5 execution:

```
AISE PHASE:             S5 — PRODUCT REQUIREMENTS
PRODUCT REQUIREMENTS:    IN PROGRESS
```

At closure:

```
AISE PHASE:             S5 — CLOSED / PASS
PROJECT CHARTER:        APPROVED
PRODUCT REQUIREMENTS:   APPROVED
TECHNICAL SPECIFICATION: NOT STARTED
IMPLEMENTATION:         NOT STARTED
NEXT AUTHORIZED:        NONE until OWNER GO
NEXT RECOMMENDED:       S6 — Technical Specification
```

---

## 30. CANONICAL PRODUCT REQUIREMENTS STRUCTURE

The canonical project artifact is `docs/product/PRODUCT_REQUIREMENTS.md`
unless project conventions define an equivalent. Default: ONE canonical
specification. Do NOT split prematurely into dozens of files.

Recommended structure:

1.  **Document Status** — project, version/baseline, AISE stage,
    status, OWNER approval.
2.  **Source Charter** — path and approved baseline.
3.  **Product Scope Summary** — short restatement only.
4.  **Actors / Roles.**
5.  **Functional Requirements.**
6.  **Business Rules.**
7.  **Workflows / State Models.**
8.  **Permissions.**
9.  **Data Requirements.**
10. **Integration Requirements.**
11. **Reporting / Search / Export.**
12. **Error / Incomplete / Edge Behavior.**
13. **Non-Functional Requirements.**
14. **Constraints.**
15. **Assumptions.**
16. **Open Questions.**
17. **Deferred Requirements.**
18. **Traceability Matrix.**
19. **S6 Technical Decision Inputs.**
20. **Approval / Baseline Status.**

Do not include empty boilerplate sections unnecessarily.

---

## 31. REQUIREMENT QUALITY GATE

Before an S5 baseline may reach OWNER_REVIEW, verify:

```
AMBIGUOUS CRITICAL REQUIREMENTS                0
CONTRADICTORY UNRESOLVED CRITICAL REQUIREMENTS    0
BLOCKING PRODUCT OPEN QUESTIONS                  0
CRITICAL REQUIREMENTS WITHOUT ACCEPTANCE          0
ORPHAN MUST REQUIREMENTS                         0
UNCOVERED MUST CHARTER OBJECTIVES                 0
TECHNICAL IMPLEMENTATION AS REQUIREMENT           0
  (unless explicitly mandated external constraint)
```

Do not demand perfection for low-value details. Critical/material
requirements matter most.

---

## 32. STACK REQUEST HANDLING

If the OWNER mentions a technology preference: record as S6 input or
confirmed constraint. Do NOT evaluate, validate, or begin technical
specification. Do NOT turn the preference into an S5 product
requirement or physical schema. Stack decisions are S6 territory.

---

## 33. STOP CONTRACT

When S5 achieves OWNER approval of the Product Requirements baseline:
**STOP.**

Do NOT automatically start S6 (Technical Specification),
architecture decisions, or application scaffolding.

```
NEXT RECOMMENDED COMPONENT:  S6
NEXT ACTION:                 OWNER GO REQUIRED
```

---

## 34. REQUIREMENTS REPORT

End S5 with:

```
AISE S5 REQUIREMENTS REPORT

PROJECT:                    <name>
ROUTE:                      NEW_PROJECT → S3 → S4 → S5
REQUIREMENTS PATH:          docs/product/PRODUCT_REQUIREMENTS.md
OWNER APPROVED:             YES / NO / BLOCKED
EVIDENCE STATES:
  CONFIRMED:                <count>
  ASSUMPTION:               <count>
  OPEN:                     <count>
  DEFERRED:                 <count>
REQUIREMENT COUNTS:
  FR:                       <count>
  BR:                       <count>
  DR:                       <count>
  PERM:                     <count>
  INT:                      <count>
  NFR:                      <count>
BLOCKING QUESTIONS:        0 / <count>
ORPHAN REQUIREMENTS:       0 / <count>
UNCOVERED CHARTER ITEMS:   0 / <count>
PROJECT_STATE UPDATED:      YES / NO
SCHEDULED WORK CREATED:     NO
APPLICATION CODE CREATED:   NO
TECH STACK SELECTED:        NO
EXECUTION CONTINUED TO S6:  NO
STATUS:                     APPROVED / BLOCKED / PENDING_REVIEW
NEXT:                       S6 — Technical Specification
```

---

## 35. FORWARD REFERENCES

- S6 — Technical Specification (not yet implemented)

Routes whose detailed protocol does not yet exist as a standalone
component use the current S0 normative flow until implemented.

S5 does NOT invent S6 contents prematurely.

---

## 36. ACCEPTANCE CRITERIA

Every critical functional and business requirement must be verifiable.
Acceptance criteria express observable outcomes. Prefer concise
GIVEN / WHEN / THEN when it improves clarity:

```
GIVEN  an account is inactive
WHEN   valid credentials for that account are submitted
THEN   authentication is denied
AND    the account is not reactivated as a side effect
```

Do not mechanically force Gherkin for every requirement. Simple
requirements may have one-line acceptance statements. Complex
workflows benefit from structured criteria.

---

## 37. RELEASE / DELIVERY SCOPE

S5 may distinguish delivery priority when the OWNER provides it:

- **MUST FOR INITIAL RELEASE** — required before first deployment.
- **SHOULD** — strongly desired, plan to include.
- **COULD** — valuable but not critical.
- **DEFERRED** — explicitly outside current delivery scope.

Do not use priority labels merely for decoration. Priority must
reflect OWNER/product decisions. High-level scope from S4 must
decompose coherently into S5 requirements. No requirement may
silently expand an S4 out-of-scope area.

---

## 38. ANTI-ANTI-PATTERNS

S5 must NOT reject a valid requirements document because it is short.
An internal tool may need 20 requirements. An enterprise platform
may need 200. Depth must match project complexity.

S5 must NOT pad the specification with generic consulting language
("we follow industry best practices," "the system shall be designed
for scalability") to reach an assumed length.

S5 must NOT refuse to proceed because the OWNER's initial
detailed input is incomplete. That is the normal entry condition
for S5, not a blocker — S5's job includes eliciting and classifying
the remaining detail.

S5 must NOT treat every clarification question from the OWNER during
requirements review as a scope change requiring a new baseline cycle.
Clarifications are normal.

S5 must NOT allow a well-structured requirement to be rejected
because it doesn't fill every field in the record format. If
RATIONALE is obvious from context, omit it.

S5 must NOT create separate requirements for every possible
user interface element (button label, field placeholder, color)
unless those have material product significance. UI design belongs
to dedicated design processes, not the requirements specification.
