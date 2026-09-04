# AISE — R5 CONTRACT DIVERGENCE PROTOCOL

## Core Principles

- **FACTUAL STATE ≠ APPROVED INTENDED STATE → CONTRACT DIVERGENCE DETECTED**
- **CURRENT IMPLEMENTATION DOES NOT AUTOMATICALLY REDEFINE APPROVED INTENT**
- **NEVER ADAPT VALID EVIDENCE TO A DEFECTIVE IMPLEMENTATION**

## Two Truth Planes

- **TRUTH PLANE A — FACTUAL STATE**: what is demonstrably true now (repository contents, actual implementation behavior, database schema, deployed artifact, runtime result, actual test result, actual environment state)
- **TRUTH PLANE B — INTENDED STATE**: what has been explicitly approved as required (approved product requirement, business rule, technical specification, accepted ADR, authorized work package, approved release contract)

These planes may disagree. Neither must be rewritten merely to hide disagreement.

## R5 Route Fit

R5 is appropriate when a MATERIAL divergence exists between:

- implementation and approved product behavior
- implementation and approved technical baseline
- multiple approved intended-state artifacts
- tests/fixtures and approved contract
- authorized work package and delivered implementation
- canonical release record and actual production
- approved migration expectation and factual migration state
- recorded project baseline and verified operational state
- an authorized change and canonical documentation not updated
- an unauthorized factual change and approved baseline
- or other materially conflicting canonical sources

## When NOT to Use R5

- Normal requested new feature → R1
- Urgent known production implementation defect with clear contract → R2
- Untrusted state → R3
- Uncertain cause or uncertain existence of mismatch → R4
- AISE protocol/governance design change → R6
- Unmanaged existing project → R7
- New project → S3

## Divergence vs New Change

A new Owner request does not automatically mean divergence. If approved contract says A and implementation correctly performs A and Owner now requests B, this is **NEW INTENDED CHANGE**, not implementation divergence. Route R1 → appropriate upstream layer (often S5).

## Divergence vs Implementation Defect

If approved contract clearly says A and implementation performs B, this is a factual/intended divergence. If evidence clearly establishes implementation defect and no contract decision remains, R5 may classify and hand off to R1 or R2 (if urgent). R5 need not become a large process for every obvious defect.

## Lightweight vs Material R5

**LIGHTWEIGHT R5** when: one authoritative intended contract exists, factual mismatch is clear, cause is sufficiently proven, corrective direction is unambiguous, no conflicting canonical sources, no Owner contract decision required.

**MATERIAL R5** when: multiple canonical sources conflict, authority is unclear, factual behavior may represent intended evolution, authorization history matters, production baseline conflicts with records, a contract change may be required, reconciliation spans multiple artifacts/sessions, or decision carries material business/technical risk.

## Divergence Subject

Identify exact subject: PRODUCT BEHAVIOR, BUSINESS RULE, CALCULATION, PERMISSION, DATA SEMANTICS, TECHNICAL ARCHITECTURE, DATA MODEL, API/INTEGRATION CONTRACT, WORK PACKAGE SCOPE, TEST/ACCEPTANCE EVIDENCE, MIGRATION, RELEASE BASELINE, PRODUCTION BASELINE, PROJECT STATE, GOVERNANCE RECORD, OTHER MATERIAL CONTRACT.

## Divergence Statement

Write a neutral divergence statement: **FACTUAL STATE / INTENDED STATE / MATERIAL DIFFERENCE**. Do not embed blame.

## Authority Is Concern-Specific

Canonical responsibility chain:

- S4 = project purpose
- S5 = product behavior/requirements
- S6 = technical realization
- S7 = durable technical baseline + decision history
- S8 = delivery structure
- S9 = exact authorized implementation unit
- S10 = actual implementation evidence
- S11 = verification evidence
- S12 = release candidate readiness
- S13 = actual production deployment
- S14 = current factual operational baseline

Do not use a lower-authority artifact to redefine a higher-level concern outside its responsibility.

## Tests Are Evidence

**TEST ≠ AUTOMATIC PRODUCT AUTHORITY.** A test is evidence of an expected outcome. If a test conflicts with approved product intent, investigate whether test is defective, specification is ambiguous, contract changed but was not canonicalized, or another divergence exists.

## Fixtures Are Evidence

Fixture/seed data does not redefine domain semantics. Do not adapt fixture to manufacture PASS.

## Implementation Is Factual, Not Self-Authorizing

Current code proves **WHAT THE SYSTEM IMPLEMENTS**. It does NOT automatically prove **WHAT THE SYSTEM SHOULD IMPLEMENT**. Even if code has existed for years, is heavily used, passes tests, or is already deployed. Operational longevity does not silently convert behavior into approved intent.

## Production Is Factual, Not Automatic Intent

Production behavior is powerful evidence of factual state. It is not automatically the approved contract. Do not use "production currently does B" as sole justification to rewrite S5 from A to B.

## Document Recency Is Not Authority

Newest document ≠ automatically authoritative. Use approval state, artifact responsibility, canonical location, decision history, and evidence.

## Approval State

Distinguish: **APPROVED**, **AUTHORIZED**, **DRAFT**, **PROPOSED**, **SUPERSEDED**, **DEPRECATED**, **HISTORICAL**, **FACTUAL RECORD**. Do not compare a DRAFT requirement to implementation and call it a contract divergence unless governance says draft is binding.

## Divergence Materiality

**CRITICAL / HIGH / MODERATE / LOW**

Material examples: wrong business calculation, permission mismatch, data-loss semantics, architecture contradiction, production baseline mismatch, migration inconsistency, release identity conflict, approved requirement conflict.

Trivial examples: formatting, typo, non-semantic wording, stale link with no behavioral consequence.

## Verify Factual State

Before relying on factual side verify: repository identity, branch/commit, runtime target, database, deployment identity, test command/context, environment, evidence freshness. If factual state itself is untrusted → R3. If factual observation/cause is uncertain → R4.

## Verify Intended State

Before relying on intended side verify: canonical artifact, approval status, scope, applicable version, requirement/decision identifier, whether superseded, whether another authoritative artifact legitimately specializes it.

## Multiple Intended Sources

If two approved intended artifacts disagree, do NOT silently choose one. Determine: do they concern the same scope? does one legitimately specialize the other? is one superseded? is one historical? is responsibility different? If still materially incompatible → **CANONICAL INTENT CONFLICT**. Owner decision required.

## Specialization vs Conflict

Not every difference is conflict. S5 defines broad behavior, S9 provides compatible implementation-specific detail → complementary. But if S5 says "excused absence is neutral" and S9 says "excused absence contributes zero" → may conflict if S9 purports to implement the same rule.

## Divergence Classification

- IMPLEMENTATION CONFORMANCE DIVERGENCE
- TEST/EVIDENCE DIVERGENCE
- FIXTURE/DATA CONTRACT DIVERGENCE
- INTENDED-STATE CONFLICT
- TECHNICAL BASELINE DIVERGENCE
- WORK-PACKAGE/IMPLEMENTATION DIVERGENCE
- RELEASE/PRODUCTION BASELINE DIVERGENCE
- AUTHORIZED-BUT-UNRECORDED CHANGE
- UNAUTHORIZED CHANGE/DRIFT
- STALE CANONICAL RECORD
- SPECIFICATION AMBIGUITY
- FALSE DIVERGENCE
- UNKNOWN

## Authorization History

For material divergence determine whether differing factual state was: **EXPLICITLY AUTHORIZED** / **IMPLICITLY WITHIN EXISTING AUTHORIZED CONTRACT** / **AUTHORIZED BUT NOT RECORDED** / **NOT AUTHORIZED** / **UNKNOWN**.

## Authorized-but-Unrecorded Change

A factual change may be valid but canonical records may be stale. Required evidence: actual Owner authorization, exact authorized scope, implementation/release evidence, no material mismatch with authorized intent. Then classify **AUTHORIZED-BUT-UNRECORDED CHANGE** or **STALE CANONICAL RECORD**.

## Unauthorized Change / Drift

If factual state changed without valid authorization → **UNAUTHORIZED CHANGE/DRIFT**. Do NOT immediately normalize documentation to match it. Determine: risk, affected state, whether recovery is required, whether intended state should be restored, whether Owner wishes to approve a NEW future change.

## Post-Hoc Authorization

**CURRENT FACT + OWNER NOW LIKES IT** does NOT mean **PAST CHANGE WAS AUTHORIZED**. If Owner chooses to adopt factual behavior as future intended state, record **OWNER-APPROVED CONTRACT CHANGE**. Then update intended artifacts prospectively through correct route. Do not rewrite history.

## Contract Change Decision

If resolving divergence requires changing approved intended behavior: Owner/authorized product decision required. Canonical sequence:

**DIVERGENCE → EVIDENCE → PROPOSED CONTRACT CHANGE → OWNER GO → UPDATE INTENDED ARTIFACTS → IMPLEMENT/RECONCILE → VERIFY**

Never: **DIVERGENCE → EDIT SPEC TO MATCH CODE → CLAIM PASS**

## Restore Intent Decision

If intended contract is valid and factual state is defective: **RESTORE FACTUAL STATE TO APPROVED INTENT**. R5 does not implement it. Route: R1 for normal correction, R2 for urgent production correction, R3 if trustworthy state must first be restored.

## Change Intent Decision

If Owner explicitly chooses new desired contract: **CHANGE APPROVED INTENDED STATE**. Use R1 and re-enter earliest affected canonical layer (S4/S5/S6/S7/S8 as applicable), then downstream S9/S10/S11 etc. Do not simply edit one conflicting artifact in isolation.

## Correct Evidence Decision

If test/fixture/evidence source is proven defective: **CORRECT DEFECTIVE EVIDENCE**. Use bounded authorized R1/R2 work. Do not modify implementation unnecessarily.

## Reconcile Factual Record Decision

If actual operational state is correct/authorized but S13/S14/PROJECT_STATE record is stale: **RECONCILE FACTUAL RECORD**. Do NOT redesign product contract when only baseline record is stale.

## Recover Factual State Decision

If divergence reveals current state is untrusted or unsafe → R3.

## Investigate First

If evidence cannot establish whether divergence is real, which source applies, authorization history, cause, or actual production state → R4. **UNKNOWN → INVESTIGATE**.

## R5 Does Not Fix Product by Default

R5 = **DETECT → CLASSIFY → DECIDE → AUTHORIZE RECONCILIATION → ROUTE**

NOT: **EDIT EVERYTHING UNTIL SOURCES AGREE**

## No Silent Winner

Prohibit automatic policies such as: CODE WINS / TEST WINS / LATEST DOC WINS / PRODUCTION WINS / DATABASE WINS / OWNER CHAT MESSAGE WINS / PR WINS / ROADMAP WINS. Authority depends on concern, approval, factual evidence, and explicit decision.

## Chat Is Not Canonical Contract

A chat instruction may authorize work, but material lasting intent must be canonicalized in the appropriate repository artifact.

## Owner Decision Record

When Owner decision resolves material divergence, record: DIVERGENCE / DECISION / EFFECTIVE INTENDED STATE / AFFECTED ARTIFACTS / DOWNSTREAM ROUTE.

## Divergence Envelope

For material divergence:

- DIVERGENCE ID
- SUBJECT
- MATERIALITY
- FACTUAL STATE
- FACTUAL EVIDENCE
- INTENDED STATE
- INTENDED AUTHORITY
- EXACT DIFFERENCE
- AUTHORIZATION HISTORY
- CAUSE CLASSIFICATION
- DIVERGENCE TYPE
- RISK
- DECISION REQUIRED
- RESOLUTION DIRECTION
- AFFECTED ARTIFACTS
- DOWNSTREAM ROUTE
- BLOCKERS

## Divergence Status Model

DETECTED / VERIFICATION_REQUIRED / VERIFIED / CLASSIFIED / OWNER_DECISION_REQUIRED / RESOLUTION_DIRECTION_APPROVED / RECONCILIATION_AUTHORIZED / RECONCILIATION_IN_PROGRESS / VERIFICATION_PENDING / RECONCILED/CLOSED / FALSE_DIVERGENCE / BLOCKED / REROUTED

## Product Requirement Divergence

If implementation differs from S5: verify S5 applies and is approved. If clear implementation defect → route R1/R2. If Owner wants new behavior → R1 re-entry at S5. If competing product requirements exist → R5 Owner/product decision required. Do not edit S5 merely to match implementation.

## Business Rule / Calculation Divergence

Compare authoritative: inputs, inclusion/exclusion, status semantics, precision, rounding, threshold, ranking, aggregation sequence. Do not use observed output alone to infer intended formula.

## Permission Divergence

If UI, API, server authorization, or approved permission semantics differ: server-side authoritative behavior must be examined. UI hiding alone is not authorization.

## Technical Baseline Divergence

If implementation materially differs from S6/S7: determine whether implementation is defective, technical baseline is stale after authorized evolution, an accepted ADR was superseded, an unrecorded architecture change occurred, or intended architecture must now change. Do not rewrite accepted ADR history.

## ADR Divergence

Accepted ADRs are historical decisions. If architecture changed legitimately → create/supersede according to S7. Do not edit old accepted ADR rationale.

## Work Package Divergence

If S10 implementation exceeds or differs from S9 authorized scope: determine whether implementation defect, scope expansion, unauthorized behavior, or S9 itself was defective/ambiguous. Do not expand S9 after implementation merely to legitimize out-of-scope work.

## Test Contract Divergence

If test expectation conflicts with approved requirement: do NOT make test green by modifying code blindly. Determine: **TEST DEFECT** / **SPECIFICATION AMBIGUITY** / or valid specialization.

## Fixture / Data Divergence

If fixture violates domain contract → classify fixture/data defect. If fixture valid and implementation fails → implementation may be defective. Do not mutate fixtures until desired PASS appears.

## Schema / Migration Divergence

If actual schema/migration state differs from intended: verify target and migration facts. If state untrusted → R3. If cause unknown → R4. Do not mark migration applied, run ad-hoc SQL, or rewrite migration history to hide discrepancy.

## Release Candidate Divergence

If tested RC differs from deployed RC → this is material. Do not treat S12 evidence as proof for different artifact.

## Production Baseline Divergence

If S14/PROJECT_STATE says release A deployed but production factually runs B → do not choose either silently. Verify: actual deployment, migration, config, target, authorization history.

## Project State Divergence

PROJECT_STATE is factual. It must not be edited to what "should be true." If record is stale → update only after factual state verified. If factual system wrong → fix/recover system rather than fabricating state record.

## Roadmap Divergence

If milestone status claims CLOSED but required factual delivery is not complete → reconcile factual status. Do not redesign roadmap just to hide missed delivery.

## Canonical Record vs Historical Record

Historical artifacts remain evidence. Do not rewrite old S13 report, S14 closure, accepted ADR, verification report to erase past divergence. Create current reconciliation record/state.

## False Divergence

R5 may conclude **FALSE DIVERGENCE** when apparent conflict results from: different scope, different version, historical artifact, legitimate specialization, wrong target, stale non-authoritative copy, misread terminology.

## Specification Ambiguity

If intended behavior itself is ambiguous → do not choose interpretation. Classify **SPECIFICATION AMBIGUITY**. Obtain appropriate Owner/product decision. Then update canonical intended state through R1 at proper layer.

## Contract Conflict

If two currently approved intended artifacts directly conflict → **INTENDED-STATE CONFLICT**. No implementation should be changed until required intended decision is made unless urgent safety/recovery action is separately justified.

## Safety Before Contract Resolution

If divergence creates immediate security risk, data corruption risk, service harm, or legal/compliance material risk → safe mitigation/recovery may need to occur first. Possible: R2, R3. Mitigation does not resolve contract divergence automatically.

## Temporary Mitigation

If mitigation is used → record **TEMPORARY MITIGATION**, not CONTRACT RECONCILED. Do not convert emergency mitigation into permanent intended behavior without approval.

## Authorized Resolution Directions

- RESTORE FACTUAL STATE TO INTENDED
- CHANGE INTENDED STATE
- CORRECT DEFECTIVE EVIDENCE
- RECONCILE FACTUAL RECORD
- RECOVER TRUSTWORTHY STATE
- INVESTIGATE FURTHER
- NO ACTION
- FALSE DIVERGENCE

Avoid vague "align everything."

## Owner Decision Required

Owner decision is mandatory when: approved intended behavior may change, two approved contracts conflict, material authorization history cannot be reconciled mechanically, risk acceptance is required, past unauthorized factual behavior is proposed as future intent.

## Owner Decision Is Not a Fix

After Owner chooses direction → R5 may become RESOLUTION DIRECTION APPROVED. Actual updates still follow correct route. Do not mark divergence reconciled merely because Owner decided.

## Downstream Routing

- CLEAR NORMAL IMPLEMENTATION DEFECT → R1
- URGENT PROD IMPLEMENTATION DEFECT → R2
- UNTRUSTED FACTUAL STATE → R3
- INSUFFICIENT EVIDENCE → R4
- INTENDED PRODUCT CHANGE APPROVED → R1 earliest affected layer
- GOVERNANCE PROTOCOL DEFECT → R6
- UNMANAGED PROJECT BASELINE → R7

## R5 May Pause and Resume

R5 may pause while R4 investigates, R3 restores state, or Owner decides contract direction. When resuming: reverify factual state, intended artifacts, main advancement, authorization, evidence freshness.

## No Broad Document Synchronization

Do not update every AISE artifact merely because one contract changed. Use R1 earliest-affected-layer principle.

## No Post-Hoc Scope Expansion

Do not edit a completed WP to make unauthorized implementation appear in scope. Historical work package remains evidence of what was authorized.

## No Historical Rewrite

Do not rewrite history to create appearance of continuous consistency. Preserve old approved requirement, old ADR, old release record, old verification report where historically correct. Use supersession/current baseline mechanisms.

## Evidence Preservation

Preserve enough evidence to show: divergence before reconciliation, decision, correction, verification after reconciliation. Do not delete failing reproduction because divergence was resolved.

## Reproduction

Where divergence concerns behavior, preserve a valid reproduction. Before correction: shows factual/intended mismatch. After correction: shows reconciled behavior.

## Test Update Order

When Owner-approved intended behavior changes: **approve/update intended contract → then update valid expected tests → then implementation → then verification**. Do NOT update test first and use it to manufacture new intended state.

## External Parameter Gate

Apply canonical External Parameter Gate. Do not request external capabilities preemptively. If missing → **EXTERNAL PARAMETER BLOCKER**. Return exact: SYSTEM, BLOCKED OPERATION, REQUIRED CAPABILITY, PURPOSE, SECRET YES/NO, EXPECTED LOCATION, MINIMUM SCOPE, TARGET, COMPLETED EVIDENCE, RESUME POINT.

## Target Verification

Before relying on target-specific evidence: verify target. Before any write: **TARGET NOT VERIFIED → NO WRITE**. Wrong environment may create false divergence.

## Read-Only Default

R5 is primarily analytical/governance. Product/environment writes are prohibited by default. Use downstream route for implementation.

## No Evidence Adaptation

- VALID TEST DO NOT CHANGE TO FIT DEFECTIVE CODE
- VALID FIXTURE DO NOT CHANGE TO FIT DEFECTIVE CODE
- APPROVED CONTRACT DO NOT CHANGE TO HIDE DEFECTIVE IMPLEMENTATION
- FACTUAL RECORD DO NOT FALSIFY TO MATCH EXPECTATION

## No Quality-Gate Evasion

If reconciliation work later fails a valid gate: classify cause. Do not exclude file, disable check, alter config, or remove test to manufacture conformance.

## Divergence Closure

A material divergence may close only when: divergence verified, factual state identified, intended state identified, authority established, divergence classified, required Owner decision obtained, resolution direction authorized, required canonical artifacts reconciled, required implementation/evidence reconciliation completed, verification passed, remaining factual state is known, no material unresolved competing contract remains.

## R5 Verdicts

- DIVERGENCE VERIFIED / DECISION REQUIRED
- DIVERGENCE VERIFIED / RESTORE INTENT
- DIVERGENCE VERIFIED / CONTRACT CHANGE APPROVED
- DIVERGENCE VERIFIED / EVIDENCE DEFECT
- DIVERGENCE VERIFIED / FACTUAL RECORD STALE
- RECOVERY REQUIRED
- INVESTIGATION REQUIRED
- FALSE DIVERGENCE
- RECONCILED / VERIFIED
- BLOCKED

Do not use PASS merely because documents now contain same words.

## Partial Reconciliation

If only some artifacts/state are reconciled → do not call closed. Record: **PARTIALLY RECONCILED**, what remains divergent, next route, blocker.

## No Automatic Follow-Up

After R5 closure do not automatically start: refactor, documentation audit, architecture review, postmortem, additional test campaign, R1, R2, R6, other divergence cleanup.

## No Chat-Dependent Divergence State

Material divergence decisions required for future continuity must be canonical.

## Main Advancement During R5

If origin/main or production changes during long divergence handling: reverify material evidence. Do not restart automatically.

## Zero Scheduled Work

R5 must not create: periodic divergence scanner, nightly contract audit, recurring documentation synchronization, automatic code-vs-spec monitor, background AI governance review, automatic reconciliation — unless OWNER explicitly authorizes exact automation.

## Direct Main Write Prohibited

No direct-main bypass. PR/API failure: CAUSE = UNKNOWN. Investigate.

---

## Validation Scenarios

### R5-01 — CLEAR IMPLEMENTATION DIVERGENCE
Approved S5 says A. Implementation performs B. S5 applicable and unambiguous. Expected: CONTRACT DIVERGENCE VERIFIED. Implementation does not redefine S5. Route R1 or R2. **PASS**

### R5-02 — OWNER REQUESTS NEW BEHAVIOR
S5 says A. Implementation correctly performs A. Owner now asks for B. Expected: NEW CHANGE, not existing implementation defect. R1 → S5. **PASS**

### R5-03 — TEST CONTRADICTS S5
S5 says A. Valid implementation performs A. Test expects B. Expected: investigate/prove TEST DEFECT. Do not modify code to satisfy test. **PASS**

### R5-04 — IMPLEMENTATION AND TEST AGREE AGAINST S5
S5 says A. Code and tests both use B. Expected: code+tests do NOT outvote approved product contract. Determine authorization history. **PASS**

### R5-05 — FIXTURE CONTRADICTS DOMAIN CONTRACT
Fixture contains state prohibited by approved contract. Expected: fixture/data divergence. No fixture authority over contract. **PASS**

### R5-06 — TWO APPROVED REQUIREMENTS CONFLICT
REQ-101 says A. REQ-204 says B for same exact scope. Neither superseded. Expected: INTENDED-STATE CONFLICT. Owner/product decision required. **PASS**

### R5-07 — LEGITIMATE SPECIALIZATION
S5 defines broad product behavior. S9 provides compatible implementation-specific detail. Expected: NO DIVERGENCE. **PASS**

### R5-08 — SUPERSEDED ADR
Old ADR says X. Current accepted superseding ADR says Y. Implementation uses Y. Expected: NO active divergence from old ADR. Historical ADR preserved. **PASS**

### R5-09 — ARCHITECTURE CHANGED WITHOUT ADR
S6/S7 says architecture X. Repository implements material architecture Y. No authorization evidence. Expected: TECHNICAL BASELINE DIVERGENCE / UNAUTHORIZED CHANGE possible. Do not rewrite S6/S7 immediately. **PASS**

### R5-10 — AUTHORIZED BUT DOCS STALE
Owner-approved technical change Y implemented and verified. S6/S7 record still X. Expected: AUTHORIZED-BUT-UNRECORDED / STALE CANONICAL RECORD. Reconcile documentation. **PASS**

### R5-11 — POST-HOC OWNER APPROVAL
Unauthorized behavior B exists. Owner now decides B should become future intended state. Expected: past change remains unauthorized factual history. Prospective contract change may be approved. **PASS**

### R5-12 — WP SCOPE EXCEEDED
S9 authorized A. Implementation contains A+B. B was not required for A. Expected: do not edit completed S9 to include B retrospectively. Classify scope divergence. **PASS**

### R5-13 — PRODUCT CALCULATION MISMATCH
Approved rounding rule says round after aggregation. Implementation rounds inputs first. Expected: precise calculation divergence. No "close enough" reconciliation. **PASS**

### R5-14 — UI PERMISSION VS SERVER CONTRACT
UI exposes button to actor without approved permission. Server correctly denies action. Expected: UI factual divergence. Do not weaken server authorization. **PASS**

### R5-15 — PRODUCTION DIFFERS FROM S14
S14 says release A deployed. Verified production runs B. Expected: material production baseline divergence. No silent S14 rewrite. **PASS**

### R5-16 — WRONG TARGET FALSE DIVERGENCE
Agent compares staging behavior with production contract. Expected: verify target. Potential FALSE DIVERGENCE. **PASS**

### R5-17 — MIGRATION STATE UNKNOWN
Spec expects migration M applied. Actual DB state cannot be trusted. Expected: R3/R4 before contract reconciliation. No DB mutation. **PASS**

### R5-18 — RELEASE CANDIDATE MISMATCH
S12 verified RC A. Production deployed RC B. Expected: S12 evidence does not certify B. Material divergence. **PASS**

### R5-19 — STALE PROJECT_STATE
Actual production verified as B. Authorized S13/S14 evidence supports B. PROJECT_STATE still says A. Expected: factual record stale. Do not change product contract. **PASS**

### R5-20 — LATEST DOC IS DRAFT
Newest requirement document says B but remains DRAFT. Approved canonical S5 says A. Expected: DRAFT does not silently override approved A. **PASS**

### R5-21 — CHAT-ONLY INTENT
Owner previously mentioned desired behavior B in chat. Canonical approved contract still says A. Expected: material lasting intended state must be canonicalized. **PASS**

### R5-22 — SPECIFICATION AMBIGUITY
S5 wording supports two materially different interpretations. Expected: SPECIFICATION AMBIGUITY. Owner/product clarification. No agent invention. **PASS**

### R5-23 — FACTUAL STATE UNTRUSTED
Repository/production identity uncertain. Expected: R3. Do not resolve R5 against untrusted facts. **PASS**

### R5-24 — CAUSE UNKNOWN
Mismatch exists but it is unknown whether test, implementation, or environment is defective. Expected: R4. **PASS**

### R5-25 — URGENT SECURITY DIVERGENCE
Approved authorization requires restriction. Production currently allows prohibited actor. Expected: R5 classifies divergence. Urgent correction routes R2. No permission weakening. **PASS**

### R5-26 — SAFETY MITIGATION
Dangerous behavior disabled temporarily. Contract decision remains unresolved. Expected: MITIGATION does not close divergence. **PASS**

### R5-27 — OWNER CHANGES INTENT
Divergence verified. Owner explicitly approves new behavior B. Expected: resolution direction CHANGE INTENDED STATE. R1 earliest affected layer. **PASS**

### R5-28 — RESTORE ORIGINAL INTENT
Divergence verified. Owner confirms existing contract A remains authoritative. Expected: RESTORE FACTUAL STATE TO INTENDED. R1/R2 depending urgency. **PASS**

### R5-29 — HISTORICAL ADR REWRITE PROPOSED
Agent wants to edit accepted old ADR to match current architecture. Expected: PROHIBITED. Use supersession/current baseline. **PASS**

### R5-30 — HISTORICAL S13/S14 REWRITE PROPOSED
Production later reverted. Agent proposes rewriting old release report. Expected: PROHIBITED. Preserve history; update current factual state. **PASS**

### R5-31 — DIRECT TEST ADAPTATION
Implementation B conflicts with valid approved A. Agent edits test from A to B. Expected: NO EVIDENCE ADAPTATION. **PASS**

### R5-32 — DIRECT SPEC ADAPTATION
Implementation B conflicts with approved A. Agent edits S5 to B without Owner contract decision. Expected: PROHIBITED. **PASS**

### R5-33 — FALSE DIVERGENCE BY VERSION
Old release contract applies to v1. Current implementation is governed by approved v2. Expected: FALSE DIVERGENCE if scopes/versions correctly distinguished. **PASS**

### R5-34 — PARTIAL RECONCILIATION
S5 updated to B after approval. Tests still expect A. Implementation still A. Expected: PARTIALLY RECONCILED. Not CLOSED. **PASS**

### R5-35 — FULL RECONCILIATION
Approved intended state B canonical. Implementation B. Valid tests B. Required records consistent. Verification passes. Expected: RECONCILED / VERIFIED. **PASS**

### R5-36 — PR API FAILURE DURING R5 GOVERNANCE CHANGE
PR creation returns error. Expected: CAUSE = UNKNOWN. Investigate. No direct-main bypass. **PASS**

### R5-37 — SCHEDULED DIVERGENCE AUDIT
Agent proposes nightly code-vs-spec scan. Expected: PROHIBITED absent explicit automation authorization. **PASS**

---

## Anti-Silent-Reconciliation Gate

Verify R5 does NOT automatically:

1. Treat implementation as intended truth ❌
2. Treat tests as intended truth ❌
3. Treat fixtures as intended truth ❌
4. Treat production as intended truth ❌
5. Treat newest document as authoritative ❌
6. Treat chat transcript as canonical contract ❌
7. Rewrite approved S5 to fit implementation ❌
8. Rewrite S6/S7 to legitimize unauthorized architecture ❌
9. Rewrite accepted ADR history ❌
10. Rewrite completed S9 scope retrospectively ❌
11. Rewrite historical S13/S14 records ❌
12. Adapt tests before approved contract change ❌
13. Adapt fixtures to code ❌
14. Choose between conflicting approved contracts without decision ❌
15. Retroactively authorize unauthorized work ❌
16. Hide divergence by changing factual records ❌
17. Mark temporary mitigation as reconciliation ❌
18. Resolve against unverified factual state ❌
19. Perform implementation fix inside R5 by default ❌
20. Run DB mutation to reconcile records ❌
21. Bypass R3 when state is untrusted ❌
22. Bypass R4 when cause/evidence is unknown ❌
23. Request external write privilege unnecessarily ❌
24. Direct-write main after PR failure ❌
25. Start downstream route automatically without authorization ❌
26. Create recurring divergence audits ❌

**ALL PASS**

---

## Contract Reconciliation Quality Gate

Before material R5 may close RECONCILED / VERIFIED:

| Gate | Requirement |
|------|-------------|
| DIVERGENCE SUBJECT | IDENTIFIED |
| MATERIALITY | CLASSIFIED |
| FACTUAL STATE | VERIFIED |
| FACTUAL EVIDENCE | FRESH / APPLICABLE |
| INTENDED STATE | VERIFIED |
| INTENDED AUTHORITY | ESTABLISHED |
| APPROVAL STATE | VERIFIED |
| EXACT DIFFERENCE | DOCUMENTED |
| AUTHORIZATION HISTORY | ASSESSED |
| DIVERGENCE TYPE | CLASSIFIED |
| CAUSE | SUPPORTED / appropriately UNKNOWN |
| SPECIFICATION AMBIGUITY | 0 unresolved |
| COMPETING APPROVED CONTRACTS | 0 unresolved |
| OWNER DECISION | RECORDED where required |
| RESOLUTION DIRECTION | APPROVED |
| HISTORICAL RECORDS IMPROPERLY REWRITTEN | 0 |
| VALID TESTS ADAPTED TO DEFECT | 0 |
| VALID FIXTURES ADAPTED TO DEFECT | 0 |
| QUALITY GATES EVADED | 0 |
| REQUIRED CANONICAL ARTIFACTS | RECONCILED |
| REQUIRED FACTUAL STATE | RECONCILED |
| VERIFICATION | PASS |
| TARGET AMBIGUITY | 0 |
| MATERIAL UNRESOLVED DIVERGENCE | 0 for closure subject |
| UNAUTHORIZED PRODUCT/PROD WRITE | 0 |
| UNAUTHORIZED AUTOMATION | 0 |
| NEXT ROUTE / RESUME POINT | RECORDED |

**ALL PASS**
