# AISE — R6 GOVERNANCE CHANGE PROTOCOL

**Authority:**
Subordinate to S0 (AI Software Engineering OS). R6 is the transverse
route governing intentional changes to AISE itself: its constitution,
protocols, routing rules, lifecycle semantics, governance invariants,
canonical references, and universal engineering rules.

**Core Principle:**

GOVERNANCE CHANGE = EXPLICITLY AUTHORIZED CHANGE TO THE RULES OF AISE

NOT: change the rules because the current task is difficult.

**Second Core Principle:**

CURRENT GOVERNANCE REMAINS BINDING UNTIL THE NEW GOVERNANCE CHANGE IS
APPROVED, CANONICALIZED, AND EFFECTIVE.

**Third Core Principle:**

GOVERNANCE CHANGE MUST NOT RETROACTIVELY LEGITIMIZE PAST
NON-CONFORMANCE.

---

## 1. PURPOSE

R6 answers:

- WHAT COUNTS AS AN AISE GOVERNANCE CHANGE?
- WHAT EXISTING RULE IS BEING CHANGED?
- WHY IS CHANGE NEEDED?
- IS IT EDITORIAL OR SEMANTIC?
- WHAT PROTOCOLS / INVARIANTS ARE AFFECTED?
- WHO MUST APPROVE IT?
- WHEN DOES THE NEW RULE BECOME EFFECTIVE?
- WHAT CURRENT AND HISTORICAL RULES MUST REMAIN PRESERVED?
- WHAT CROSS-PROTOCOL UPDATES ARE ACTUALLY REQUIRED?
- HOW IS THE CHANGE VERIFIED AND CANONICALIZED?

R6 prevents opportunistic self-modification.

---

## 2. R6 ROUTE FIT

Use R6 when intentionally modifying universal AISE governance such as:

- S0 constitution/invariants
- S1 launcher semantics
- S2 routing rules
- S3 bootstrap governance
- S4–S14 universal protocol rules
- R1–R7 transverse protocol rules
- AISE master roadmap/topology
- universal Owner gates
- External Parameter Gate
- Restart Rule
- Zero Scheduled Work Rule
- OWNER PROD GO semantics
- Contract Preservation doctrine
- Fantomas/Ghost universal governance semantics
- canonical AISE paths/names
- universal lifecycle states
- protocol handoffs
- governance validation requirements

---

## 3. R6 IS NOT THE RIGHT ROUTE WHEN

| Situation | Route |
|---|---|
| Normal project/product change | R1 |
| Urgent production application fix | R2 |
| Untrusted execution/repository/environment state | R3 |
| Unknown cause | R4 |
| Project contractual divergence | R5 |
| Existing unmanaged project adoption | R7 |
| New project | S3 |

---

## 4. R6 VS R5

Freeze distinction:

**R5 answers:** WHAT CONTRACT / FACTUAL STATE DIVERGES, AND WHAT
RECONCILIATION DIRECTION IS REQUIRED?

**R6 answers:** HOW DO WE INTENTIONALLY CHANGE AISE GOVERNANCE ITSELF?

Example: S0 and R2 accidentally conflict.
→ R5 may establish governance divergence.
→ Owner decides R2 governance must change.
→ R6 implements approved governance change.

R5 detects/reconciles disagreement. R6 changes governance prospectively.

---

## 5. GOVERNANCE CHANGE CLASSIFICATION

| Class | Name | Description |
|---|---|---|
| G0 | EDITORIAL / NON-SEMANTIC | Spelling, grammar, formatting, non-semantic wording |
| G1 | REFERENTIAL / CANONICAL MAINTENANCE | Path, link, filename, status pointer, stale reference |
| G2 | SEMANTIC LOCAL | Changes behavior inside one protocol |
| G3 | STRUCTURAL / CROSS-PROTOCOL | Changes protocol responsibilities, topology, lifecycle, handoffs |
| G4 | CONSTITUTIONAL / SYSTEM-WIDE | Changes frozen/system-wide invariants or Owner control boundaries |

Examples:

- typo → G0
- renamed protocol path → G1
- change one R1 routing rule → G2
- change S9→S10 authorization model → G3
- weaken OWNER PROD GO → G4

Do not inflate simple changes.

---

## 6. MATERIALITY

Separately classify impact: **LOW**, **MODERATE**, **HIGH**, **CRITICAL**.

Governance class and materiality are related but not identical.

- A small wording correction may be G0/LOW.
- A one-line change removing production authorization may be G4/CRITICAL.

Line count does not determine governance risk.

---

## 7. GOVERNANCE CHANGE REQUEST

Normalize requested change into:

- **CHANGE OBJECTIVE**
- **CURRENT RULE**
- **PROPOSED RULE**
- **REASON**
- **EXPECTED BENEFIT**
- **KNOWN IMPACT**
- **OUT OF SCOPE**

This is not yet authorization to implement new semantics.

---

## 8. GOVERNANCE CHANGE ENVELOPE

For material governance changes capture:

- GOVERNANCE CHANGE ID (optional)
- CLASS: G0–G4
- MATERIALITY
- CURRENT GOVERNANCE
- PROPOSED GOVERNANCE
- RATIONALE
- AFFECTED PROTOCOLS
- AFFECTED INVARIANTS
- BACKWARD-COMPATIBILITY IMPACT
- MIGRATION / ADOPTION IMPACT
- OWNER DECISION
- AUTHORIZED SCOPE
- VALIDATION PLAN
- EFFECTIVE POINT

Keep minimum sufficient.

---

## 9. GOVERNANCE CHANGE ID

For material/multi-session governance changes:

GOV-001, GOV-002, ...

Do NOT require a GOV artifact for every typo/path correction.

---

## 10. GOVERNANCE CHANGE RECORD

For material G2–G4 changes, suggested:

`docs/engineering/governance-changes/GOV-<ID>.md`

Template:

```
# GOV-XXX — GOVERNANCE CHANGE

## Status
## Classification
## Current Rule
## Proposed Rule
## Rationale
## Impact Analysis
## Owner Decision
## Affected Protocols
## Validation
## Effective Baseline
## Superseded Guidance
```

Do not duplicate entire protocol contents.

---

## 11. CURRENT GOVERNANCE REMAINS BINDING

**Freeze:**

PROPOSED GOVERNANCE IS NOT ACTIVE GOVERNANCE.

Until canonicalization completes, CURRENT CANONICAL GOVERNANCE REMAINS
BINDING.

An agent may not operate according to a proposed future rule before it
becomes effective.

---

## 12. NO SAME-RUN SELF-EXEMPTION

**Critical rule:**

An agent MUST NOT change governance to remove a constraint that is
blocking the CURRENT execution and then immediately claim the previous
action is compliant.

Example:

- PR required.
- PR creation fails.
- Agent changes AISE to allow direct-main writes.
- Agent pushes main.

**PROHIBITED.**

The blocking event occurred under the previous rule. Resolve the event
under the rule that was effective at that time.

---

## 13. NO RETROACTIVE LEGITIMIZATION

Governance changes are prospective unless governance explicitly records
another lawful effective model.

Do not rewrite past facts.

Example: past direct-main write violated governance. Later R6 allows an
emergency direct-main mechanism. The historical event remains
non-conformant under the governance that was effective then. Do not erase
the divergence.

---

## 14. EFFECTIVE POINT

Every semantic/material governance change must have a clear effective
point.

Default: AFTER CANONICAL MERGE + POST-MERGE VERIFICATION.

Possible factual reference: effective from main commit `<sha>`.

Do not backdate effectiveness.

---

## 15. NO SELF-AUTHORIZATION

AI agent cannot authorize governance change.

Owner authorization is required for semantic/structural/constitutional
change.

Agent **may**: identify issue, analyze impact, propose options,
implement an already-authorized governance unit.

Agent **may NOT**: approve its own proposal.

---

## 16. OWNER AUTHORIZATION

For G2–G4 require explicit Owner authorization of the actual governance
direction.

Authorization should be bounded to: what rule changes, what does not
change, expected effect, affected protocols where known.

Do not require Owner to approve mechanical reference updates after the
semantic direction has already been clearly authorized.

---

## 17. G0 EDITORIAL CHANGE

G0 may include: typo, grammar, formatting, non-semantic clarification.

Requirements: prove semantics unchanged, minimal diff, normal canonical
Git workflow.

Do not manufacture a GOV record unnecessarily.

---

## 18. G1 REFERENTIAL CHANGE

Examples: protocol path changed, renamed file, planned → canonical
pointer, broken internal reference, component list update.

Verify all materially affected references. Do not rewrite protocol
semantics.

---

## 19. G2 SEMANTIC LOCAL CHANGE

Changes behavior inside one protocol without materially changing AISE
topology.

Example: modify R1 terminal-boundary semantics.

Requires: current vs proposed rule, impact scan, Owner approval,
affected validation updates, cross-reference check, canonicalization.

---

## 20. G3 STRUCTURAL CHANGE

Examples: change handoff between stages, change mandatory S9 behavior,
change Task Router structure, add/remove route, change lifecycle
topology, change responsibility between S5/S6/S7.

Requires broader impact scan. Do not update every protocol automatically;
update only actual dependencies.

---

## 21. G4 CONSTITUTIONAL CHANGE

Examples: change Contract Preservation, change Restart Rule, change
OWNER PROD GO, change External Parameter Gate, change Zero Scheduled
Work, change fundamental factual/intended truth model, change
agent/Owner authority, change universal Fantomas/Ghost privilege
semantics.

G4 requires explicit Owner decision and strong cross-protocol consistency
verification. Do not treat constitutional change as a one-line
documentation edit.

---

## 22. FROZEN RULES ARE CHANGEABLE ONLY THROUGH R6

"Frozen" means: not modifiable opportunistically by another route.

It does NOT mean: eternally impossible to change.

A frozen invariant may change only through deliberate R6 governance
change with explicit Owner authorization appropriate to materiality.

---

## 23. GOVERNANCE INTENT VS CURRENT IMPLEMENTATION

The fact that agents repeatedly behave differently from governance does
NOT automatically mean governance is wrong.

Possible causes: implementation/tool defect, agent defect, environment
constraint, governance ambiguity, governance defect, training/compliance
issue.

Investigate before changing governance where cause is uncertain.

---

## 24. OBSERVED FRICTION IS EVIDENCE, NOT DECISION

"Agents often fail this step" / "this gate slows work" / "this prompt
is long" / "provider API is unreliable" — these are useful inputs. They
do not automatically justify weakening the rule.

Assess: purpose of current rule, risk protected, alternative mechanism,
actual evidence.

---

## 25. GOVERNANCE DEFECT

A governance rule may legitimately be defective when it:

- contradicts another canonical invariant
- cannot be executed as written
- creates unsafe incentives
- causes systematic false state
- duplicates responsibility materially
- requires impossible evidence
- creates unnecessary process with no protected requirement/risk

Do not classify inconvenience alone as defect.

---

## 26. SPECIFICATION AMBIGUITY IN GOVERNANCE

If canonical governance permits materially different interpretations:

classify: GOVERNANCE SPECIFICATION AMBIGUITY.

Use R4/R5 as needed to establish evidence/conflict. R6 implements the
approved clarification.

Do not let agent select preferred interpretation silently.

---

## 27. GOVERNANCE DIVERGENCE

If two canonical AISE protocols conflict:

R5 may classify: CONTRACT / GOVERNANCE DIVERGENCE.

Once resolution direction is approved: R6 implements reconciliation.

Do not silently edit whichever file is easier.

---

## 28. GOVERNANCE SOURCE RESPONSIBILITY

Preserve hierarchy/responsibility:

| Source | Responsibility |
|---|---|
| S0 | System-wide constitution/invariants |
| S2 | Routing |
| S5–S14 | Specific lifecycle responsibilities |
| R1–R7 | Transverse operational routes |
| AISE_ROADMAP | Component topology/status |

A specialized protocol may detail S0 without contradicting it. Do not
interpret detail as conflict automatically.

---

## 29. CONSTITUTIONAL PRECEDENCE

Where a lower-level protocol conflicts with an active S0 invariant:

do not silently make lower-level behavior authoritative.

Classify divergence. Unless Owner explicitly approves constitutional
change: S0 remains governing intended rule.

---

## 30. IMPACT SCAN

For semantic changes inspect only relevant dimensions:

- S0 invariant impact
- S1 launcher impact
- S2 routing impact
- S3 bootstrap/install impact
- S4–S14 lifecycle impact
- R1–R7 transverse impact
- project adoption impact
- Owner authorization impact
- production safety impact
- external parameter impact
- automation impact
- repository continuity impact
- validation/scenario impact

Do not inspect irrelevant application code.

---

## 31. AFFECTED-PROTOCOL MAP

For G2–G4 state:

- PRIMARY PROTOCOL: `<file>`
- DIRECT DEPENDENCIES: `<list>`
- INDIRECT REFERENCES: `<list>`
- UNAFFECTED PROTOCOLS: `<list or category>`

This prevents both under-update and broad synchronization theatre.

---

## 32. MINIMUM SUFFICIENT GOVERNANCE DIFF

**Freeze:**

CHANGE ONLY WHAT THE APPROVED GOVERNANCE DECISION REQUIRES.

Do not use R6 to: rewrite style, rename unrelated concepts, clean
historical wording, restructure every protocol — unless necessary for
correctness.

---

## 33. NO GOVERNANCE REFACTOR "WHILE HERE"

If another governance improvement is noticed: record/recommend
separately. Do not bundle it automatically.

One verified governance change at a time.

---

## 34. CROSS-PROTOCOL CONSISTENCY

After semantic change verify directly affected protocols.

Examples:

- change route semantics → S2 + route protocol + roadmap/reference
  surfaces.
- change production authorization → S0 + S12/S13/R1/R2/R3 where
  actually dependent.

Do not assume one edited file makes governance coherent.

---

## 35. NO DUPLICATE GOVERNANCE SOURCE

Do not solve difficult governance changes by creating another document
that independently restates all AISE rules.

Avoid: second constitution, second router, second project-state system,
second roadmap, shadow governance.

Update canonical owners.

---

## 36. GOVERNANCE CONTRACT PRESERVATION

**Freeze:**

CURRENT VALID GOVERNANCE TEST/SCENARIO DOES NOT CHANGE TO FIT AN
UNAPPROVED GOVERNANCE IMPLEMENTATION.

If intended governance legitimately changes: Owner approves new rule
first. Then: update canonical governance, update affected validation
expectation, verify.

---

## 37. VALIDATION SCENARIOS ARE EVIDENCE

AISE scenario expectations are evidence of current intended governance.
They are not eternal if governance changes legitimately. But expected
outcome may change only after approved semantic decision.

Do not edit scenario first to make new rule appear valid.

---

## 38. VALIDATION UPDATE ORDER

For approved semantic governance change:

1. establish current rule
2. establish approved proposed rule
3. identify affected validations
4. modify governance
5. update affected validation expectations
6. run full relevant validation
7. canonicalize

Avoid test-first redefinition of governance intent.

---

## 39. EXISTING HISTORY

Do not rewrite historical AISE implementation reports to pretend new
governance always existed.

Past reports remain factual evidence. Current governance records may
supersede prior rules prospectively.

---

## 40. GOVERNANCE SUPERSESSION

Where governance decision/history artifact exists, preserve history.

Use: SUPERSEDED BY, EFFECTIVE FROM, or established mechanism.

Do not rewrite historical rationale.

---

## 41. ROADMAP TOPOLOGY CHANGE

If adding/removing/renaming a stage or route: this is structural
governance.

Update: AISE_ROADMAP, S2 if routing changes, S3 install guidance, other
direct references.

Do not create S15 casually. Topology change requires explicit Owner
direction.

---

## 42. NO AUTOMATIC NEW PROTOCOL

A gap does not automatically justify another S/R component.

Before adding protocol ask:

- does an existing protocol already own responsibility?
- would a new protocol reduce ambiguity materially?
- does it create duplicate governance?

Owner approval required for structural addition.

---

## 43. ROUTE RENAMING

Renaming R2 → Emergency Fix or similar is not merely editorial if
routing semantics/identity are affected.

Classify G1/G3 according to actual impact. Preserve stable identifiers
when possible.

---

## 44. STABLE IDENTIFIERS

Prefer preserving: S0–S14, R1–R7, requirement IDs, scenario IDs,
governance IDs — unless changing identifier itself is explicitly
authorized.

Stable IDs preserve continuity.

---

## 45. BACKWARD COMPATIBILITY

For material governance changes assess existing project artifacts.

Questions: Will old WP remain interpretable? Will existing S14 closure
remain valid? Will old project manifests need migration? Will prior
Owner GO semantics change?

Do not invalidate historical artifacts unnecessarily.

---

## 46. EXISTING PROJECT ADOPTION

Changing universal AISE governance does NOT automatically mutate every
existing project state.

Where a project records AISE governance version/baseline: adoption may
require factual update. Do not mass-edit unrelated project repositories
automatically.

---

## 47. GOVERNANCE VERSIONING

Do not invent a complex versioning system unless needed. At minimum
canonical Git history + effective commit may provide sufficient
governance identity.

If project already uses protocol/version identifiers: preserve actual
convention. Avoid semantic-version bureaucracy without need.

---

## 48. EFFECT ON ACTIVE WORK

When governance changes while another work unit is active:

determine whether new rule applies prospectively to remaining steps.

Default: already-completed steps are judged under governance effective
when performed. Future actions after new governance effective point
follow current canonical governance unless an explicit compatibility
rule says otherwise.

Do not retroactively rejudge facts incorrectly.

---

## 49. ACTIVE WORK COMPATIBILITY

Before forcing active work to restart because governance changed:

determine material impact.

If new rule irrelevant: continue. If materially affects remaining
contract: reconcile before continuation.

Do not restart everything automatically.

---

## 50. GOVERNANCE CHANGE DURING INCIDENT

Do not modify governance as an emergency workaround for: failed CI,
production incident, missing credential, failed PR, migration problem —
unless the governance rule itself has independently been established as
defective and Owner explicitly authorizes change.

Resolve incident under current governance first when safe.

---

## 51. PRODUCTION AUTHORIZATION RULE CHANGE

Any change to OWNER PROD GO is G4.

Changing R6 does NOT itself grant production authorization.

Even after new governance canonicalization: actual production deployment
follows the newly effective rule and requires whatever authorization that
rule defines.

No retroactive production permission.

---

## 52. EXTERNAL PARAMETER GATE CHANGE

Any material weakening/expansion of the External Parameter Gate is G4 or
material G3.

Do not modify it because an external credential is currently missing.
Current blocker must be handled under current rule.

---

## 53. RESTART RULE CHANGE

Changing canonical recovery semantics is G4/G3 depending impact.

Do not weaken Restart Rule merely to salvage current uncertain local
work. Current untrusted-state event follows currently effective R3/S0
rules.

---

## 54. ZERO SCHEDULED WORK CHANGE

Changing default automation authority is G4.

Do not enable monitoring globally because one task would benefit from
polling. Specific automation remains Owner-authorized unless canonical
governance is explicitly changed prospectively.

---

## 55. CONTRACT PRESERVATION CHANGE

Changing: NEVER ADAPT VALID EVIDENCE TO DEFECTIVE IMPLEMENTATION or
FACTUAL != INTENDED — is G4/CRITICAL.

Requires explicit Owner approval and extensive impact validation. Do not
alter simply because tests or implementation disagree.

---

## 56. FANTOMAS / GHOST CHANGE

Any universal privilege/inheritance change to Fantomas/Ghost is material
governance. Preserve frozen semantics unless Owner explicitly authorizes
change.

Do not modify break-glass model as incidental cleanup.

---

## 57. OWNER CONTROL CHANGE

Changing: who may authorize work, scope of Owner GO, production gate,
governance approval — is constitutional.

Agent cannot reduce Owner authority over its own execution.

---

## 58. GOVERNANCE SAFETY INVARIANT

**Freeze:**

AN AGENT MAY NOT USE R6 TO INCREASE ITS OWN AUTHORITY FOR THE CURRENT
UNIT OF WORK.

Any such proposal requires explicit prospective Owner decision and cannot
legitimize current execution.

---

## 59. SECURITY / PRIVACY

Governance artifacts must not contain: tokens, passwords, private keys,
DB URLs, user secrets, sensitive operational values.

Governance change should describe capability semantics, not secrets.

---

## 60. EXTERNAL PARAMETER GATE

Apply existing canonical External Parameter Gate while implementing R6.

Do not request GitHub capability until actual boundary. Inspect existing
capability first.

If missing: EXTERNAL PARAMETER BLOCKER.

Do not weaken External Parameter Gate to solve its own blocker. That
would be circular self-exemption.

---

## 61. TARGET VERIFICATION

For repository write: canonical target must be verified.

TARGET NOT VERIFIED → NO WRITE.

The R4 sandbox incident demonstrates why this is mandatory. Do not
create governance in a convenient but non-canonical repository.

---

## 62. MINIMUM PRIVILEGE

Use minimum access required. R6 governance authoring generally needs:
repository read/write through normal branch workflow.

It does not require: production DB write, Vercel production control,
Neon admin, application secrets.

---

## 63. READ-ONLY ANALYSIS DEFAULT

Before approved semantic direction: impact analysis is read-only.

Do not preemptively change multiple protocols while still deciding what
the rule should be.

---

## 64. PROPOSAL VS IMPLEMENTATION

Distinguish:

- PROPOSED GOVERNANCE CHANGE
- OWNER-APPROVED GOVERNANCE CHANGE
- IMPLEMENTED GOVERNANCE CHANGE
- CANONICAL GOVERNANCE CHANGE

A proposal is not implementation. Implementation is not canonical until
merged/verified.

---

## 65. GOVERNANCE STATUS MODEL

Possible useful states: PROPOSED, IMPACT_ANALYSIS,
OWNER_DECISION_REQUIRED, APPROVED, AUTHORIZED, IMPLEMENTING,
VERIFICATION_PENDING, CANONICAL, REJECTED, SUPERSEDED, BLOCKED,
REROUTED.

Do not require all states for trivial G0/G1 changes.

---

## 66. GOVERNANCE CHANGE VERDICTS

Possible: CANONICAL / VERIFIED, CANONICAL / VERIFIED WITH NON-BLOCKING
FINDINGS, OWNER DECISION REQUIRED, BLOCKED, REJECTED, REROUTED, NO
GOVERNANCE CHANGE REQUIRED.

---

## 67. FALSE GOVERNANCE PROBLEM

R6 may conclude: NO GOVERNANCE CHANGE REQUIRED — if issue is actually:
agent noncompliance, project-specific defect, environment problem,
misread protocol, stale noncanonical copy, wrong repository,
implementation bug.

Do not modify AISE to accommodate every execution failure.

---

## 68. GOVERNANCE AMBIGUITY RESOLUTION

If issue is purely wording ambiguity but intended behavior is already
objectively established: clarification may be G0/G2 depending semantics.

Clarification must not secretly change behavior. If behavior meaning
changes: classify semantic.

---

## 69. PROPORTIONAL REVIEW

| Class | Review Level |
|---|---|
| G0/G1 | Minimal review |
| G2 | Affected-protocol review |
| G3 | Cross-protocol structural review |
| G4 | Constitutional consistency review |

Do not run full S0–R7 line-by-line audit for typo.

---

## 70. NON-BLOCKING FINDINGS

Moderate/Low unrelated governance observations: record if useful, do not
expand authorized R6 unit.

Critical/material High related inconsistency: must resolve before
canonicalizing affected governance.

---

## 71. NO PROCESS THEATRE

R6 must avoid: change advisory boards, mandatory meetings, mandatory
governance tickets, mandatory version bump, mandatory full-document
rewrite, mandatory retrospective, mandatory all-protocol audit — unless
actual change needs them.

---

## 72. GOVERNANCE CHANGE PLAN

For material G2–G4 state:

- CURRENT RULE
- APPROVED NEW RULE
- FILES TO CHANGE
- FILES TO PRESERVE
- VALIDATIONS TO UPDATE
- EXPECTED EFFECTIVE POINT
- ROLLBACK / REVERSION CONSIDERATION if material

Keep concise.

---

## 73. REVERSION OF GOVERNANCE CHANGE

If newly canonical governance proves defective: do NOT rewrite history.

Create another R6 change restoring/superseding rule. A Git revert may be
appropriate if technically clean, but governance history remains factual.

---

## 74. GOVERNANCE CHANGE FAILURE

If R6 implementation fails validation: CAUSE = UNKNOWN. Investigate.

Do not weaken validation to make governance change pass.

If intended governance itself is contradictory: R5/R4 may be required.

---

## 75. NO VALIDATION EVASION

Do not: delete scenario, change expected outcome without approved rule,
exclude protocol from checks, rename failing condition, declare N/A
without evidence — to canonicalize R6.

---

## 76. CANONICAL GIT WORKFLOW

For R6:

verified canonical base → dedicated branch → minimum governance diff →
validations → commit → push → PR → actual CI → merge → post-merge
canonical verification.

No direct-main bypass.

---

## 77. PR FAILURE

If PR/API operation fails: CAUSE = UNKNOWN. Investigate.

Do NOT immediately assume: token scope, provider failure, wrong
permissions. Do NOT write main. Apply External Parameter Gate only if
proven.

---

## 78. CI CLASSIFICATION

Use actual repository evidence:

| Evidence | Classification |
|---|---|
| Executed + successful | PASS |
| No applicable checks with evidence | N/A |
| Expected missing | INVESTIGATE |
| Pending required | PENDING |
| Failed | FAIL |

Do NOT infer docs-only = N/A.

---

## 79. NO DIRECT MAIN EXCEPTION CREATED BY R6

R6 itself does NOT create emergency authority to bypass PR.

Any future direct-main mechanism would require explicit G4/G3 governance
change and would only become effective prospectively.

Current R6 implementation still follows current canonical PR rule.

---

## 80. NO PRODUCT SIDE EFFECT

Universal R6 construction must not modify: application code, schema,
migration, test fixture, business contract, Daniélou project state,
deployment, production.

Only universal AISE governance.

---

## 81. NO CHAT-DEPENDENT GOVERNANCE

Material lasting governance must exist canonically in repository.

Chat may provide Owner authorization. Do not leave effective AISE rule
only in conversation.

---

## 82. OWNER DECISION RECORDING

For material future governance change record enough to know: what was
approved, why, scope, effective point.

Do not copy entire chat.

---

## 83. R6 ROUTE OUTPUT

For future material governance change, agent should be able to state:

```
ROUTE
  R6 GOVERNANCE CHANGE

CHANGE ID
  <id or N/A>

GOVERNANCE CLASS
  G0 / G1 / G2 / G3 / G4

MATERIALITY
  LOW / MODERATE / HIGH / CRITICAL

CURRENT RULE
  <rule>

PROPOSED RULE
  <rule>

RATIONALE
  <reason>

AFFECTED PROTOCOLS
  <list>

AFFECTED INVARIANTS
  <list>

OWNER DECISION REQUIRED
  YES / NO

OWNER DECISION
  <approved / pending>

FILES TO CHANGE
  <list>

FILES TO PRESERVE
  <list>

VALIDATION IMPACT
  <list>

EFFECTIVE POINT
  <pending / canonical commit>

CURRENT TASK RETROACTIVELY AFFECTED
  NO

BLOCKERS
  <list>
```

---

## 84. VALIDATION SCENARIOS

Validate R6 deterministically.

---

### R6-01 — TYPO ONLY

A spelling error exists in R3 with no semantic effect.

**Expected:** G0 editorial. Minimal correction. No constitutional
review.

**PASS**

---

### R6-02 — BROKEN PATH

S2 points to old R4 filename.

**Expected:** G1 referential correction. Update direct references only.

**PASS**

---

### R6-03 — LOCAL SEMANTIC CHANGE

Owner wants R1 verified-not-released terminology changed semantically.

**Expected:** G2. Impact relevant R1 references/validations.

**PASS**

---

### R6-04 — ROUTER STRUCTURAL CHANGE

Owner adds a new top-level route.

**Expected:** G3. Update S2 + roadmap/bootstrap/direct dependencies.
Explicit approval.

**PASS**

---

### R6-05 — OWNER PROD GO WEAKENING

Proposal removes explicit production authorization.

**Expected:** G4 / CRITICAL. Explicit Owner decision and constitutional
impact review.

**PASS**

---

### R6-06 — CURRENT PR FAILURE

PR creation fails. Agent proposes changing AISE to allow direct-main
write and then using new rule immediately.

**Expected:** PROHIBITED SAME-RUN SELF-EXEMPTION. Handle current blocker
under current governance.

**PASS**

---

### R6-07 — CURRENT CREDENTIAL BLOCKER

External Parameter Gate blocks current operation. Agent proposes deleting
the gate.

**Expected:** PROHIBITED opportunistic self-modification.

**PASS**

---

### R6-08 — RETROACTIVE COMPLIANCE

Past direct-main merge violated governance. Later Owner authorizes
optional direct-main emergency mode.

**Expected:** Past event remains historical non-conformance. New rule
prospective.

**PASS**

---

### R6-09 — PROPOSAL NOT EFFECTIVE

Draft R6 branch contains new rule.

**Expected:** Current canonical rule remains binding until merge +
verification.

**PASS**

---

### R6-10 — AGENT SELF-APPROVES

Agent proposes G3 change and approves it itself.

**Expected:** PROHIBITED. Owner authorization required.

**PASS**

---

### R6-11 — FROZEN RULE CHANGE

Owner explicitly wants to revise Restart Rule.

**Expected:** R6 may change frozen rule prospectively. Classify G4/G3
appropriately.

**PASS**

---

### R6-12 — INCONVENIENT RULE ONLY

Agent says PR workflow is annoying but no defect/risk evidence exists.

**Expected:** Friction is evidence, not sufficient decision. Do not
change automatically.

**PASS**

---

### R6-13 — GOVERNANCE DEFECT PROVEN

Two canonical rules make compliant execution impossible.

**Expected:** R5/R4 evidence may support R6 correction. Owner approves
direction.

**PASS**

---

### R6-14 — LOWER PROTOCOL CONFLICTS WITH S0

R2 contradicts active S0 invariant.

**Expected:** Do not silently let R2 win. Classify divergence. Preserve
constitutional precedence pending Owner change.

**PASS**

---

### R6-15 — VALIDATION EXPECTATION CONFLICTS WITH PROPOSED RULE

Owner has not yet approved semantic change.

**Expected:** Do not modify validation first.

**PASS**

---

### R6-16 — APPROVED RULE CHANGES VALIDATION

Owner approves new semantic behavior.

**Expected:** Update affected governance + affected validation expectation
afterward.

**PASS**

---

### R6-17 — BROAD REWRITE PROPOSED

One R2 sentence changes. Agent rewrites R1–R5 for style consistency.

**Expected:** PROHIBITED scope expansion.

**PASS**

---

### R6-18 — DUPLICATE CONSTITUTION

Agent creates AISE_OS_V2.md while leaving S0 as separate active truth.

**Expected:** PROHIBITED duplicate governance source unless explicit
migration plan makes one canonical.

**PASS**

---

### R6-19 — NEW PROTOCOL FOR EXISTING RESPONSIBILITY

Agent proposes R8 for functionality already fully owned by R4.

**Expected:** NO automatic new protocol. Reuse current owner unless
material gap proven and Owner approves.

**PASS**

---

### R6-20 — TOPOLOGY CHANGE

Owner explicitly approves new route/protocol.

**Expected:** G3 structural change. Update actual topology surfaces only.

**PASS**

---

### R6-21 — ACTIVE WORK UNAFFECTED

Governance typo fixed while application WP active.

**Expected:** No need to restart WP.

**PASS**

---

### R6-22 — ACTIVE WORK MATERIALLY AFFECTED

New governance changes remaining verification requirement for active WP.

**Expected:** Reconcile remaining work prospectively. Do not falsify
completed history.

**PASS**

---

### R6-23 — HISTORICAL REPORT

Old S13 report used previous governance.

**Expected:** Do not rewrite historical report merely because governance
changed.

**PASS**

---

### R6-24 — GOVERNANCE REVERSION

New rule later proves defective.

**Expected:** New R6 superseding/reversion change. No history rewrite.

**PASS**

---

### R6-25 — WRONG REPOSITORY

AISE-like files exist in sandbox with no canonical remote.

**Expected:** R3. No governance write.

**PASS**

---

### R6-26 — PR API FAILURE

R6 branch pushed; PR returns HTTP error.

**Expected:** CAUSE UNKNOWN. Investigate. No direct-main bypass.

**PASS**

---

### R6-27 — CI FAILS

Governance PR fails valid Quality Gate.

**Expected:** Investigate cause. Do not disable gate.

**PASS**

---

### R6-28 — EXTERNAL PARAMETER REQUIRED

PR creation genuinely requires unavailable capability.

**Expected:** External Parameter Blocker with exact resume point. Do not
weaken gate.

**PASS**

---

### R6-29 — ZERO SCHEDULED WORK CHANGE

Agent wants recurring governance audits by default.

**Expected:** G4 semantic change requiring explicit Owner authorization.
No automatic schedule.

**PASS**

---

### R6-30 — FANTOMAS GOVERNANCE CHANGE

Universal Fantomas inheritance semantics proposed to change.

**Expected:** Material G4/G3 governance decision. No incidental change.

**PASS**

---

### R6-31 — PROJECT-SPECIFIC RULE

Owner wants Daniélou grading rule changed.

**Expected:** R1, not R6.

**PASS**

---

### R6-32 — GOVERNANCE DIVERGENCE

S0 says explicit Owner Prod Go. A lower protocol says deployment may
auto-start.

**Expected:** R5 identifies divergence. R6 implements approved governance
reconciliation.

**PASS**

---

### R6-33 — NO GOVERNANCE CHANGE NEEDED

Investigation proves agent was simply using wrong branch.

**Expected:** NO GOVERNANCE CHANGE REQUIRED. R3/R1 as appropriate.

**PASS**

---

### R6-34 — PROSPECTIVE EFFECTIVE POINT

G2 change merges at commit X.

**Expected:** New rule effective from canonicalized governance baseline X.
No backdating.

**PASS**

---

### R6-35 — SCHEDULED GOVERNANCE SCANNER

Agent creates nightly protocol consistency scan without explicit
automation authorization.

**Expected:** PROHIBITED.

**PASS**

---

## 85. ANTI-SELF-AMENDMENT GATE

Verify R6 does NOT automatically:

1. change rule because current task is blocked
2. increase agent authority for current execution
3. remove Owner gate
4. remove production gate
5. remove External Parameter Gate
6. weaken Restart Rule to salvage current work
7. weaken Contract Preservation
8. rewrite validation to fit unapproved rule
9. make proposal effective before merge
10. backdate governance effectiveness
11. retroactively legalize past non-conformance
12. self-approve governance direction
13. treat frozen as unchangeable forever
14. treat inconvenience as governance defect
15. rewrite unrelated protocols
16. create duplicate constitution
17. create duplicate router
18. create new route unnecessarily
19. rewrite historical reports
20. change application/project artifacts
21. request production privilege
22. direct-write main after PR failure
23. create recurring governance monitoring
24. start R7 automatically

**ALL PASS**

---

## 86. GOVERNANCE CHANGE QUALITY GATE

Before material R6 may close CANONICAL / VERIFIED:

| Gate Item | Requirement |
|---|---|
| Canonical repository | VERIFIED |
| Current governance | IDENTIFIED |
| Proposed governance | EXPLICIT |
| Change class | KNOWN |
| Materiality | KNOWN |
| Rationale | DOCUMENTED |
| Owner decision | AVAILABLE where required |
| Affected protocols | IDENTIFIED |
| Affected invariants | IDENTIFIED |
| Unrelated protocol rewrites | 0 |
| Duplicate governance sources | 0 |
| Current task self-exemption | 0 |
| Retroactive legitimization | 0 |
| Effective point | DEFINED |
| Affected validations | UPDATED only after approved semantics |
| Cross-protocol consistency | PASS |
| Contract preservation | PRESERVED unless explicitly approved G4 change |
| Owner control | PRESERVED unless explicitly approved G4 change |
| Target | VERIFIED |
| External parameter blockers | 0 before required canonical operation |
| CI | PASS / justified N/A |
| Direct main bypass | 0 |
| Unauthorized product change | 0 |
| Unauthorized prod action | 0 |
| Unauthorized automation | 0 |
| Canonical post-merge state | VERIFIED |

**ALL PASS**

---

## 87. SIZE / USABILITY

Keep R6 comprehensive but operational.

Target approximately: 3700–4900 words. Clarity wins over arbitrary word
count.

Avoid: enterprise change-management bureaucracy, CAB-style process,
mandatory governance ticket for typo, automatic version bump, full AISE
rewrite, constitutional review for grammar, mandatory impact analysis
beyond actual dependencies.
