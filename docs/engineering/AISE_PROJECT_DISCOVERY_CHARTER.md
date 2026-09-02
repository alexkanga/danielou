# AISE — PROJECT DISCOVERY / CHARTER (S4)

**Purpose:**
Transform an authorized OWNER idea into an approved PROJECT CHARTER
through structured, evidence-grounded discovery — without silently
converting assumptions into requirements.

**Authority:**
Subordinate to S0. If conflict, S0 wins.

**Invocation:** S2 routes NEW_PROJECT → S3 → S4. S3 delivers a
verified, AISE-governed, discovery-ready repository. S4 begins when
the OWNER issues a GO to proceed with discovery.

**Canonical Governance:**
S0 — `docs/engineering/AI_SOFTWARE_ENGINEERING_OS.md`

---

## 1. S4 BOUNDARY

S4 answers: **"What is this project and why does it exist?"**

S4 produces a PROJECT CHARTER — a shared, OWNER-approved document
defining project purpose, boundaries, stakeholders, and success
criteria at a level sufficient to begin product requirements (S5)
without further ambiguity about what the project IS.

S4 does NOT answer:
- "What are the detailed product requirements?" → S5
- "What technical architecture/stack should we use?" → S6
- "How should we implement it?" → later execution protocols

S4 MUST NOT create a full PRD, select technical architecture, design
database schemas, design APIs, define business rules at acceptance-
criteria granularity, or scaffold application code.

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

S4 must NOT pre-fill S5 content. A charter statement like "users can
manage their subscriptions" is a valid scope indicator. A detailed
subscription lifecycle with states, transitions, and business rules
belongs to S5.

---

## 3. INPUTS

S4 receives from S3/S1:

**A. OWNER REQUEST** — the idea, concept, or goal the OWNER
wants to realize. May range from a single sentence to a detailed
concept note.

**B. VERIFIED PROJECT STATE** — S3-delivered PROJECT_STATE.md
confirming the repository is AISE-governed and discovery-ready.

**C. OWNER-PRESENTED EVIDENCE** — any documents, links, references,
stakeholder statements, existing process descriptions, or prior
analysis the OWNER provides. S4 records these as inputs, not as
verified requirements.

**D. REPOSITORY CONTEXT** — any OWNER-provided constraints recorded
by S3: preferred stack mentions, organizational requirements,
regulatory constraints.

S4 must not invent requirements not grounded in OWNER-provided input
or reasonable inference explicitly labeled as such.

---

## 4. THREE-STATE EVIDENCE MODEL

Every factual claim in the PROJECT CHARTER must carry one of three
evidence states:

**CONFIRMED** — directly stated by OWNER, present in OWNER-provided
documentation, or verifiable from an authoritative source. The claim
has an evidentiary basis that does not depend on agent assumption.

**ASSUMPTION** — plausible and consistent with OWNER intent, but not
explicitly confirmed. The claim represents reasonable inference or
necessary simplification. Every ASSUMPTION must be explicitly labeled
and presented to the OWNER for review.

**OPEN QUESTION** — materially unresolved and potentially
decision-relevant. The claim cannot be responsibly classified as
CONFIRMED or ASSUMPTION. Every OPEN QUESTION must be presented to
the OWNER with enough context to enable a decision.

**Core rule: Never silently convert ASSUMPTION → REQUIREMENT.**

If a charter section relies on unverified claims, those claims remain
marked ASSUMPTION until the OWNER explicitly confirms or corrects
them. OPEN QUESTIONS are not resolved by writing more text around
them.

---

## 5. ADAPTIVE DISCOVERY

S4 adapts its discovery depth to what the OWNER has already provided.

**Minimal input (one-line idea):** S4 asks targeted, non-redundant
questions to fill the minimum charter structure. Questions are
prioritized by impact on scope and feasibility. S4 does NOT demand
a complete brief before starting.

**Rich input (concept note, existing documents):** S4 incorporates
provided material directly, classifies evidence state for each claim,
identifies gaps, and asks only for genuinely missing material.

**Over-specified input (detailed requirements already provided):** S4
extracts the charter-level elements, records the detailed material as
evidence for S5, and does NOT re-derive requirements that already
exist in OWNER-approved form.

At any discovery level, S4 MUST NOT:
- fabricate stakeholder personas from thin air;
- invent success metrics without OWNER input;
- assume organizational constraints not stated or provided;
- expand a simple tool request into an enterprise platform scope.

---

## 6. DISCOVERY PROCESS

1. **Ingest** OWNER request and all presented evidence. Record
everything as-is. Do not rephrase, summarize, or "improve" OWNER
statements during ingestion. If the OWNER provides a PDF, link, or
existing document, reference it exactly — do not paraphrase its
contents as if the paraphrase is the source.

2. **Classify** each factual element: CONFIRMED, ASSUMPTION, or
OPEN QUESTION. Apply the three-state model rigorously. If the
OWNER said "users should be able to export data," that is CONFIRMED
intent. If the agent infers "users probably want CSV export," that
is ASSUMPTION until confirmed. If the OWNER mentions "we have
existing users" but does not say how many or who, the existence
of users is CONFIRMED but their characteristics may be ASSUMPTION
or OPEN QUESTION.

3. **Identify gaps** against the minimum charter structure. Prioritize
gaps by materiality — a missing "who are the users" is more material
than a missing "project codename." Group gaps into: (a) gaps that
block charter stability and must be resolved before drafting, and
(b) gaps that can be filled with ASSUMPTION labels and reviewed.

4. **Ask** the OWNER only for genuinely required, non-redundant
information. Batch questions where possible. Explain why each
question matters for the charter. Do not ask questions whose
answers are already present in OWNER-provided evidence. Do not
ask questions that only serve S5-level detail.

5. **Draft** the PROJECT CHARTER. Every section uses the three-state
evidence model. Assumptions are labeled. Open questions are
surfaced, not buried. Each section's evidence state is transparent
to the OWNER during review.

6. **Present** the draft charter to the OWNER for review. Include
a summary of evidence states: how many claims are CONFIRMED,
how many are ASSUMPTION, how many OPEN QUESTIONS remain. This
summary gives the OWNER a clear view of the charter's reliability.

---

## 7. PROJECT CHARTER — MINIMUM SECTIONS

The canonical PROJECT CHARTER (`docs/planning/PROJECT_CHARTER.md`)
must contain at minimum these sections:

1. **Project Purpose** — why this project exists (1–3 sentences).
   Evidence state applies.

2. **Problem or Opportunity** — what pain, gap, or opportunity
   motivates the project. Grounded in OWNER-provided evidence.

3. **Users / Stakeholders** — who the project serves and who is
   affected by its outcomes. If the OWNER provides named individuals
   or roles, record them. Do not invent personas.

4. **Current State / Pain Points** — what exists today and why it
   is insufficient. Only include what the OWNER has confirmed or
   provided evidence for.

5. **Vision** — the desired end state after the project succeeds.
   Must be traceable to OWNER input, not agent aspiration.

6. **Objectives** — concrete, measurable outcomes the project must
   achieve. If the OWNER provides specific targets, record them.
   If not, record the direction and mark specificity as ASSUMPTION
   or OPEN QUESTION.

7. **High-Level Scope** — what the project will address. Functional
   areas, user capabilities, or business domains. Not feature lists.

8. **Out of Scope** — explicit boundaries of what the project will
   NOT address in this phase. As important as scope — prevents
   downstream ambiguity.

9. **Project Boundary** — where this project ends and adjacent
   systems or projects begin. Integration points and handoffs.

10. **Constraints** — technical, organizational, regulatory, or
    temporal limitations. Record each with evidence state.

11. **Assumptions** — all assumptions with evidence state ASSUMPTION,
    listed for OWNER review. This section is the explicit home for
    everything S4 could not confirm.

12. **Dependencies** — external systems, teams, approvals, or
    resources the project requires. Distinguish between hard
    dependencies (blockers) and soft dependencies (nice-to-haves).

13. **Success Definition** — how the project will be judged
    successful at completion. If the OWNER does not provide success
    criteria, this becomes an OPEN QUESTION.

14. **Material Risks** — identified risks that could prevent
    achieving objectives. Each risk should note: what could go
    wrong, likelihood if known, and potential impact.

15. **Open Questions / Decisions** — all OPEN QUESTION items
    requiring OWNER input before S5. If this section is empty and
    all claims are CONFIRMED, state that explicitly.

16. **Evidence Register** — summary of evidence states across all
    charter claims. A compact table or count: X CONFIRMED,
    Y ASSUMPTION, Z OPEN QUESTION.

---

## 8. OWNER APPROVAL GATE

The PROJECT CHARTER is NOT valid until the OWNER explicitly approves
it.

S4 presents the draft charter with a clear request for review. The
OWNER may:
- **Approve** — charter is frozen and S4 is complete.
- **Request changes** — S4 revises and re-presents.
- **Provide additional information** — S4 incorporates and re-classifies.
- **Expand scope** — S4 adds sections but does not begin S5 work.
- **Narrow scope** — S4 removes sections and updates Out of Scope.

S4 must NOT self-approve the charter. S4 must NOT proceed to S5
without OWNER approval. An OWNER's absence of objection is NOT
approval — explicit acknowledgment is required.

---

## 9. PROJECT_STATE TRANSITION

On OWNER approval, S4 updates `docs/planning/PROJECT_STATE.md`:

```
AISE PHASE:             S4 — PROJECT DISCOVERY / CHARTER
STATUS:                 CLOSED / PASS
CHARTER APPROVED:       YES
CHARTER PATH:           docs/planning/PROJECT_CHARTER.md
NEXT AUTHORIZED:        NONE until OWNER GO
NEXT RECOMMENDED:       S5 — Product Requirements / Cahier des Charges
```

If S4 cannot complete (e.g., critical open question that blocks
charter stability), it reports the blocker and does NOT transition
PROJECT_STATE to CLOSED.

---

## 10. EVIDENCE INTEGRITY RULES

**No silent promotion.** A claim classified as ASSUMPTION at draft
time must remain ASSUMPTION in the final charter unless the OWNER
explicitly confirms it. The agent must not upgrade evidence states
to make the charter look more complete. Example: if the OWNER says
"we need to process payments" and the agent assumes "via Stripe,"
the payment processor remains ASSUMPTION, not CONFIRMED.

**No manufactured consensus.** If two OWNER-provided sources
conflict, S4 records the conflict as an OPEN QUESTION and presents
both positions. S4 does not resolve the conflict by choosing one
side silently. Example: one document says "launch by Q2" and another
says "launch by end of year." Both are recorded; the timeline is
OPEN QUESTION until the OWNER resolves it.

**No scope creep through discovery.** Discovery questions must
serve the charter structure. S4 must not use "discovery" as a
mechanism to begin S5 requirements elicitation. Example: asking
"what should the export format be?" during S4 discovery exceeds
charter scope. That question belongs to S5.

**No premature specificity.** A charter statement should be precise
enough to bound S5 work but not so detailed that it pre-empts S5
decisions. "The system must handle user authentication" is a valid
charter scope element. "The system must use OAuth 2.0 with PKCE
flow and refresh token rotation" is S5/S6 territory.

**No evidence laundering.** Information the agent retrieves from
web search, general knowledge, or pattern matching is NOT OWNER-
provided evidence. If such information is used to support a charter
claim, it must be classified as ASSUMPTION with a note on its
source. It must never appear as CONFIRMED.

---

## 11. ANTI-OVERDISCOVERY

S4 must NOT:

- Conduct full stakeholder interviews when the OWNER has already
defined the stakeholders.
- Build a competitive analysis unless the OWNER requests one and
  provides sources.
- Create user personas, journey maps, or UX artifacts — those
  belong to S5 or dedicated design processes.
- Define acceptance criteria or test scenarios.
- Select or evaluate technical options.
- Produce more than one charter draft unless the OWNER requests
  revisions.
- Ask "just one more question" when the charter already meets
  the minimum structure and the OWNER has approved.
- Use the discovery phase to silently begin S5 work.

---

## 12. STACK REQUEST HANDLING

If the OWNER requests or mentions a specific technology stack during
S4 discovery:

1. Record it as a CONFIRMED constraint in the charter (if explicitly
   stated as a requirement) or as OWNER-PRESENTED INFORMATION.
2. Do NOT evaluate, validate, or begin technical specification.
3. Do NOT let the stack preference drive charter scope.
4. If the OWNER says "I want to use React" but does not say whether
   this is a hard requirement or a preference, ask for clarification
   and record accordingly.

Stack decisions are S6 territory. S4 records the preference as
input for S6. A stack mention in S4 is a constraint, not an
architecture decision.

---

## 13. STOP CONTRACT

When S4 achieves OWNER approval of the PROJECT CHARTER: **STOP.**

Do NOT automatically start S5 (Product Requirements), S6 (Technical
Specification), architecture decisions, or application scaffolding.

```
NEXT RECOMMENDED COMPONENT:  S5
NEXT ACTION:                 OWNER GO REQUIRED
```

---

## 14. DISCOVERY REPORT

End S4 with:

```
AISE S4 DISCOVERY REPORT

PROJECT:                    <name>
ROUTE:                      NEW_PROJECT → S3 → S4
CHARTER PATH:               docs/planning/PROJECT_CHARTER.md
OWNER APPROVED:             YES / NO / BLOCKED
EVIDENCE STATES:
  CONFIRMED:                <count>
  ASSUMPTION:               <count>
  OPEN QUESTION:            <count>
DISCOVERY ROUNDS:           <number of OWNER interactions>
PROJECT_STATE UPDATED:      YES / NO
SCHEDULED WORK CREATED:     NO
APPLICATION CODE CREATED:   NO
TECH STACK SELECTED:        NO
EXECUTION CONTINUED TO S5:  NO
STATUS:                     CHARTER_APPROVED / BLOCKED / PENDING_REVIEW
NEXT:                       S5 — Product Requirements / Cahier des Charges
```

---

## 15. FORWARD REFERENCES

- S5 — Product Requirements / Cahier des Charges
  (see `docs/engineering/AISE_PRODUCT_REQUIREMENTS.md`)
- S6 — Technical Specification (not yet implemented)

Routes whose detailed protocol does not yet exist as a standalone
component use the current S0 normative flow until implemented.

S4 does NOT invent S5+ contents prematurely.

---

## 16. ANTI-ANTI-PATTERNS

S4 must NOT reject a valid charter because it is short. A charter
for an internal tool may be 200 words. A charter for an enterprise
platform may be 2000. Depth should match project complexity, not a
word-count target.

S4 must NOT pad the charter with generic filler ("we will follow
agile best practices," "we prioritize user experience") to reach
an assumed minimum length.

S4 must NOT refuse to start because the OWNER's initial input is
brief. That is the normal entry condition for S4, not a blocker.

S4 must NOT treat every question the OWNER asks during discovery as
a scope change requiring a new discovery round. Clarifying questions
are part of normal discovery, not change requests.
