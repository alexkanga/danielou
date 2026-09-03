# AISE — R4 INVESTIGATION PROTOCOL

## Purpose

R4 is the universal AISE transverse protocol for reducing uncertainty with evidence when a failure, anomaly, or unexpected behavior exists but its cause is not yet sufficiently known to choose a safe corrective action.

## Core Principles

**INVESTIGATION = REDUCE UNCERTAINTY WITH EVIDENCE**

NOT: try random changes until something works.

**OBSERVATION ≠ CAUSE**

An observed symptom is not itself a proven cause. This distinction is mandatory.

## Route Fit

R4 is appropriate when:

- A failure exists but cause is unknown
- A test fails unexpectedly
- Production behavior is anomalous
- CI behavior is inconsistent
- A migration result is unexplained
- API behavior is unexpected
- An external integration behaves inconsistently
- A performance regression appears without proven cause
- Data output is wrong but source of error is uncertain
- Repository/API operation returns unexplained failure
- A recovery action failed and cause is unknown
- Multiple plausible explanations exist
- Evidence conflicts
- A suspected defect cannot yet be reproduced reliably

## When NOT to Use R4

Do NOT use R4 automatically for:

- Normal planned feature/change → R1
- Urgent production defect with cause already sufficiently proven → R2
- Untrusted/lost state requiring restoration → R3
- Proven factual/intended contract divergence → R5
- AISE/governance modification → R6
- Unmanaged existing project → R7
- New project → S3

Investigation should stop when another route is clearly justified.

## R4 vs R3

R3 asks: **WHAT STATE CAN BE TRUSTED AND HOW DO WE RESTORE SAFE CONTINUITY?**

R4 asks: **WHY IS THIS OBSERVATION OCCURRING / WHAT CAUSE IS SUPPORTED?**

Production state is unknown after partial deployment → R3 first.

Production state is stable but endpoint returns unexplained 500 → R4.

R3 may call R4 when safe recovery requires cause information. R4 may route R3 if investigation reveals state continuity is untrusted.

## R4 vs R2

R2 requires enough evidence to justify a safe urgent correction. R4 supplies that evidence when cause is not yet known. Once cause is sufficiently supported and urgent correction is required: STOP R4. Route R2. Do not continue investigating indefinitely after sufficient cause is established.

## R4 vs R1

If investigation identifies a known non-emergency implementation defect → route R1. If investigation identifies planned product/technical change rather than a defect → route R1. Do not implement normal correction inside R4 merely because the relevant file is already open.

## R4 vs R5

R4 may discover: FACTUAL STATE ≠ APPROVED INTENDED STATE. If this constitutes a genuine contract divergence: CONTRACT DIVERGENCE DETECTED. Route R5. Do NOT decide inside R4 whether implementation or approved intent should silently win.

## Initial Cause State

**UNEXPLAINED FAILURE → CAUSE = UNKNOWN.**

Do not initialize investigation with conclusions such as "probably auth", "likely cache", "token scope issue", "database issue", or "race condition" unless evidence already supports them. These may be hypotheses. They are not facts.

## Observation vs Interpretation

Record observations separately from interpretations.

**OBSERVATION:** HTTP POST returned 404.
**INTERPRETATION:** Token lacks repository scope.

The first is evidence. The second is a hypothesis until demonstrated. This distinction is mandatory.

## Fact / Hypothesis / Conclusion

R4 distinguishes:

- **FACT** — directly supported by reliable evidence
- **HYPOTHESIS** — plausible explanation not yet established
- **DISPROVEN HYPOTHESIS** — evidence materially contradicts explanation
- **SUPPORTED CONCLUSION** — evidence is sufficient to use explanation for routing/correction
- **UNKNOWN** — insufficient evidence

Do not promote hypothesis to fact through repetition.

## Investigation Question

Every R4 investigation should define a bounded question. Examples:

- Why does this test fail on canonical CI?
- Why does endpoint X return 500 for this input?
- Why does migration 0014 report failure?
- Why did PR creation return 404?

Avoid: "investigate the whole system."

## Investigation Envelope

Before substantive investigation capture:

1. INVESTIGATION QUESTION
2. OBSERVED BEHAVIOR
3. EXPECTED BEHAVIOR (if authoritative)
4. AFFECTED BASELINE
5. AFFECTED ENVIRONMENT
6. KNOWN FACTS
7. INITIAL UNKNOWN
8. AUTHORIZED INVESTIGATION BOUNDARY
9. SAFE EVIDENCE SOURCES
10. FORBIDDEN ACTIONS
11. EXPECTED EXIT CONDITION

Keep compact.

## Investigation Identifier

For material or multi-session investigations, use: INV-001, INV-002, ... or existing issue/incident identifier. Do not require a separate INV artifact when investigation is trivial, single-session, and existing artifact provides sufficient continuity. Avoid duplicate bureaucracy.

## Verify the Subject First

Before diagnosing, verify: repository, branch/commit, environment, dataset/database (where material), release, test command, endpoint, actor, configuration source, time window. Do not investigate the wrong target.

**TARGET NOT VERIFIED → NO WRITE.**

For read-only evidence, still verify enough identity to avoid drawing conclusions from the wrong environment.

## Expected Behavior Source

When investigation concerns correctness, identify authoritative expected behavior. Possible sources: S5, S6, S7, S9, accepted business contract, approved test contract, API contract, migration definition, provider specification (where applicable). Do not infer expected behavior from current implementation alone.

## Reproduction

Where practical, establish a deterministic or bounded reproduction. Capture: INPUT/PRECONDITION, ACTION, EXPECTED RESULT, OBSERVED RESULT, ENVIRONMENT, BASELINE, REPETITION CONDITIONS (where material). A reproduction may be: unit test, integration test, E2E test, API request, DB query, CLI command, manual deterministic workflow, or safe production read.

## Reproduction Status

Use explicit states: REPRODUCED | INTERMITTENTLY REPRODUCED | NOT REPRODUCED | UNSAFE TO REPRODUCE | BLOCKED FROM REPRODUCTION. Do NOT treat NOT REPRODUCED as DEFECT DOES NOT EXIST.

## Same Reproduction Principle

Preserve reproduction evidence. If later correction is implemented, the same valid reproduction should expose defect before fix and pass after fix where applicable. Do not quietly replace reproduction with a different easier case.

## Safe Production Investigation

Production investigation is read-only by default. Permitted (when authorized and safe): read logs, inspect release identity, read available metrics, safe read-only query, inspect config reference metadata, safe health endpoint. Do NOT: modify data, deploy debug patch, change configuration, restart services, replay destructive request — merely to investigate. Those require separate authorization/routes.

## Existing Observability First

Use existing evidence first: logs, traces, metrics, CI output, database state, provider deployment history, application errors, audit logs, tests, git history. Do NOT create new observability infrastructure automatically.

## Minimum Evidence Principle

Collect enough evidence to discriminate among plausible causes. Do not gather everything "just in case." Prefer high-information evidence: exact failing assertion, stack trace, specific diff, migration status, release identity, HTTP response metadata, targeted log line, known-good comparison.

## Evidence Quality

Assess whether evidence is: DIRECT (strongly tied to observation), INDIRECT (supports interpretation but not decisive), STALE (may no longer represent current baseline), CONFLICTING (contradicts other material evidence), UNVERIFIED (source or target uncertain). Do not give all evidence equal weight.

## Evidence Freshness

Before relying on old evidence, determine whether relevant state changed (main advanced, deployment changed, migration applied, config changed, provider incident ended, test fixture changed). Stale evidence must not silently support current conclusion.

## Hypothesis Generation

Generate a SMALL bounded set of plausible hypotheses. Prefer hypotheses explaining observed evidence. Example: H1 — request targets wrong repository; H2 — authentication unavailable; H3 — permission insufficient; H4 — API request malformed; H5 — transient provider/API failure. Do not generate twenty speculative causes for a simple problem.

## Hypothesis Prioritization

Prioritize using: existing evidence, likelihood given system design, impact, cost/risk of discriminating check. But do not label highest-ranked hypothesis as proven.

## Discriminating Tests

Prefer checks that distinguish hypotheses. Good investigation asks: **WHAT OBSERVATION WOULD DIFFER IF H1 VS H2 WERE TRUE?** Examples: repo GET succeeds with same credential → weakens authentication-unavailable hypothesis; same request succeeds after endpoint correction → supports request-defect hypothesis. Do not perform repetitive checks that cannot change conclusion.

## Change One Material Variable

Where possible, avoid simultaneously changing code, config, fixture, environment, dependency, and test expectations. If multiple things change and symptom disappears, causality remains unclear. This is a practical diagnostic rule, not absolute experimental dogma.

## Negative Evidence

Record meaningful evidence against hypotheses. Example: database state matches expected schema → weakens migration hypothesis. Do not preserve only evidence supporting favorite explanation.

## Falsification

Prefer attempting to disprove leading hypotheses. A hypothesis repeatedly surviving strong discriminating checks is more trustworthy than one merely consistent with observations. Do not seek confirmation only.

## Correlation ≠ Causation

Failure started after commit X ≠ commit X proven cause. Restart preceded recovery ≠ restart proven cause. Provider incident existed same day ≠ provider incident proven cause. Use evidence linking mechanism to observation.

## Retry Success ≠ Root Cause

If an operation fails and then succeeds on retry, do NOT automatically conclude "transient API defect." Possible accurate states: SYMPTOM NO LONGER REPRODUCES | TRANSIENT FAILURE SUSPECTED | CAUSE STILL UNKNOWN. Only classify transient provider/tool defect when evidence supports it.

## "Works on My Machine" Rule

Local success does not disprove CI/production defect. Compare environment, versions, configuration, data, platform, timing, dependencies before drawing conclusion.

## Baseline Comparison

Where useful, compare failing baseline vs known-good baseline. Differences: source commit, dependency version, migration set, config reference, environment, data shape, external dependency behavior. Do not assume every diff is causal.

## Git History Investigation

R4 may inspect canonical Git history read-only when relevant: identify regression range, confirm when line changed, compare known-good release, inspect merged PR. This does NOT override R3 Restart Rule. It must not perform archaeology of untrusted lost local work by default.

## Bisection

Git bisect or equivalent may be used when: regression range is meaningful, tests reliably discriminate good/bad, cost is reasonable. Do not use bisect automatically for trivial obvious defects. Do not deploy every bisected commit to production.

## Test Failure Investigation

When test fails, do not assume implementation is defective. Classify evidence among canonical categories: IMPLEMENTATION DEFECT | TEST DEFECT | FIXTURE/DATA DEFECT | ENVIRONMENT/INFRA DEFECT | SPECIFICATION AMBIGUITY | UNKNOWN.

## Implementation Defect

Classify IMPLEMENTATION DEFECT only when evidence shows: approved intended behavior is valid, test/evidence is valid, environment is sufficiently trustworthy, implementation violates intended behavior. Then route correction: R1 normally, R2 if urgent production hotfix.

## Test Defect

Classify TEST DEFECT only when evidence shows the test asserts behavior not required by approved contract, contains incorrect test logic, uses invalid setup, or otherwise fails to represent authoritative intended behavior. Do NOT classify test defective merely because code disagrees.

## Fixture / Data Defect

Classify fixture/data defect only when evidence proves: fixture is invalid, seed contradicts approved domain constraints, input dataset is malformed relative to test purpose, test data no longer represents contract. Do NOT change fixture simply to make implementation pass.

## Environment / Infra Defect

Examples: wrong target, dependency outage, database unavailable, runtime mismatch, provider API failure, CI runner issue, network failure, misconfigured environment. Prove enough environmental evidence before classification. If environment continuity is untrusted and restoration required → R3.

## Specification Ambiguity

Use SPECIFICATION AMBIGUITY when: multiple interpretations are genuinely compatible with approved text and implementation correctness cannot be determined without product/Owner decision. Do not let agent invent the missing rule. Route to appropriate upstream decision through R1/R5/S5 depending on actual condition.

## Unknown

UNKNOWN is a valid conclusion. Do not manufacture certainty because investigation took time. Possible outcome: CAUSE UNKNOWN / INVESTIGATION BLOCKED. State what evidence is missing.

## Sufficient Cause

R4 does not require philosophical "ultimate root cause." Investigation may close when there is SUFFICIENTLY SUPPORTED CAUSE to safely determine corrective route. Example: a specific authorization predicate introduced by commit X demonstrably rejects valid actor Y. It may be unnecessary to investigate why the developer originally wrote that predicate before fixing it.

## Proximate vs Systemic Cause

Where useful distinguish: PROXIMATE CAUSE (direct mechanism producing failure) vs SYSTEMIC CONTRIBUTOR (broader condition allowing defect). R4 only needs systemic investigation if materially necessary to safe correction or explicitly authorized. Do not automatically turn every bug into process retrospective.

## Investigation State Model

Practical states: OPEN | BASELINE_VERIFIED | REPRODUCTION_PENDING | REPRODUCED | HYPOTHESES_ACTIVE | EVIDENCE_INCOMPLETE | CAUSE_SUFFICIENTLY_SUPPORTED | CONTRACT_DIVERGENCE_DETECTED | RECOVERY_REQUIRED | BLOCKED | INCONCLUSIVE | REROUTED | CLOSED. Use only states useful to project.

## No Implementation Fix by Default

**R4 IS READ-ONLY TOWARD PRODUCT BEHAVIOR BY DEFAULT.**

Once corrective implementation is known → route R1/R2. Do not fix production source inside R4 simply because correction appears obvious after investigation. This preserves separation between DIAGNOSIS and AUTHORIZED DELIVERY.

## Safe Diagnostic Artifacts

R4 may create diagnostic artifacts when needed: temporary local script, reproduction test, read-only query, analysis output, minimal diagnostic branch — provided they: do not redefine product behavior, do not mutate production, do not weaken evidence, are clearly diagnostic, and are handled according to repository governance if canonicalized.

## Diagnostic Test vs Regression Test

A diagnostic test may later become a permanent regression test. But R4 itself should not silently expand scope into permanent product changes. If keeping test requires repository change beyond authorized investigation, include it in downstream R1/R2 work package or explicitly authorized investigation output.

## Temporary Instrumentation

If existing evidence is insufficient, temporary instrumentation may be considered only when: necessary, bounded, safe, non-production preferred, authorized, reversible, and does not change business semantics. Production instrumentation changes require appropriate project authorization. R4 does not create blanket permission.

## No Diagnostic Workaround

Do not make temporary code/config behavior change merely to see whether problem "goes away" when that change could itself become an accidental workaround. If an experiment requires mutation, state: DIAGNOSTIC EXPERIMENT, what hypothesis it tests, target, risk, rollback, and authorization. Prefer non-mutating evidence.

## Database Investigation

Database investigation should be read-only by default. Possible: schema inspection, migration status, safe SELECT, counts, constraints, query plans (where relevant). Do NOT: update rows, delete data, mark migration applied, repair schema — during R4 unless separately authorized through correct route.

## Production Data Privacy

Use minimum necessary production data. Prefer: counts, IDs (where non-sensitive), aggregates, redacted examples, safe metadata. Do not copy sensitive records into investigation documents.

## External Integration Investigation

For external systems distinguish: our request, our auth/config, network, provider response, provider outage, rate limit, contract/version change. Use provider evidence where available. Do not classify provider defect solely because our system received an error.

## External Parameter Gate

Apply canonical External Parameter Gate. Proceed until an actual evidence boundary requires external capability. If missing: EXTERNAL PARAMETER BLOCKER. Return exact: SYSTEM, BLOCKED INVESTIGATION OPERATION, REQUIRED CAPABILITY, PURPOSE, SECRET YES/NO, EXPECTED LOCATION, MINIMUM SCOPE, TARGET, COMPLETED EVIDENCE, RESUME POINT. Do not ask OWNER to paste secrets in chat by default.

## Target Verification

Credential available ≠ correct target. Before relying on environment-specific evidence, verify repository, DB, deployment, project, API account, environment. TARGET NOT VERIFIED → do not perform write. For read-only inspection, unresolved target identity means evidence must be classified UNVERIFIED and cannot support strong conclusion.

## Minimum Privilege

Investigation should generally require less privilege than correction. Prefer: read-only repository, read-only logs, read-only DB, read-only cloud metadata. Do not request write/admin access merely for diagnosis.

## Blind Retry Control

A retry may be useful as diagnostic evidence. But repeated blind retries are prohibited. One controlled retry may answer: reproducible vs transient symptom. If result changes, record observation. Do not keep retrying until success and then call problem fixed.

## Diagnostic Mutation Failure

If an authorized diagnostic experiment itself fails: CAUSE = UNKNOWN for that failure. Do not stack more mutations. Reassess evidence.

## Conflicting Evidence

If material sources conflict, do not choose preferred evidence silently. Record: SOURCE A, SOURCE B, WHY THEY CONFLICT, FRESHNESS, TARGET IDENTITY, WHAT WOULD RESOLVE CONFLICT. Conclusion remains limited until conflict resolved.

## False Alarm

Investigation may conclude: NO DEFECT / EXPECTED BEHAVIOR CONFIRMED when evidence proves observation resulted from misunderstanding, stale evidence, wrong target, expected behavior, or invalid reproduction. Do not implement unnecessary correction.

## Non-Reproducible Incident

If symptom cannot currently reproduce, do not automatically close as false alarm. Possible outcome: INCONCLUSIVE / SYMPTOM NOT CURRENTLY REPRODUCIBLE. Preserve useful evidence. Determine whether risk justifies additional evidence collection, R3, R2, or STOP. Do not create scheduled monitoring automatically.

## Transient Failure Classification

Classify TRANSIENT ENVIRONMENT/EXTERNAL FAILURE only when supported by evidence: provider incident, documented temporary outage, same request later succeeds with unchanged relevant inputs, target/auth/request verified, no local change explains success, and evidence is sufficient. Otherwise: CAUSE UNKNOWN / TRANSIENT SUSPECTED.

## Investigation Time / Scope Control

Do not let R4 become infinite research. Stop when: cause sufficiently supported, correct route determined, required evidence unavailable, investigation blocked, further work has poor decision value, or Owner-defined boundary reached. R4 optimizes: DECISION-RELEVANT CERTAINTY, not MAXIMUM POSSIBLE KNOWLEDGE.

## Investigation Findings

Possible findings: SUPPORTED CAUSE | PARTIALLY SUPPORTED CAUSE | DISPROVEN HYPOTHESIS | CONTRACT DIVERGENCE | RECOVERY REQUIRED | NO DEFECT | INCONCLUSIVE | EXTERNAL BLOCKER. Do not use vague "seems fixed."

## Causal Confidence Language

Prefer qualitative language: PROVEN BY DIRECT EVIDENCE | SUFFICIENTLY SUPPORTED | SUPPORTED BUT NOT EXCLUSIVE | SUSPECTED | DISPROVEN | UNKNOWN. Avoid invented numeric confidence percentages unless actual statistical analysis supports them.

## R4 Exit — Implementation Defect

If implementation defect sufficiently supported: determine urgency. Urgent production correction → R2. Normal correction → R1. R4 stops.

## R4 Exit — Test / Fixture Defect

If test or fixture defect sufficiently proven: route correction through appropriate R1/R2 authorized unit. Do not silently edit evidence inside R4 unless investigation scope explicitly authorized such diagnostic artifact update. Preserve original reproduction where useful.

## R4 Exit — Environment / Infra

If environment state must be restored → R3. If simple planned environment/config correction with trustworthy state → R1 may be appropriate. If urgent production correction → R2 may apply. R4 determines facts, not automatic route by label alone.

## R4 Exit — Specification Ambiguity

If correctness cannot be determined because intended contract is ambiguous: STOP implementation. Route to Owner/product-contract decision. Possible: R1 re-entry at S5; R5 if competing factual/intended contracts exist. Do not invent requirement.

## R4 Exit — Contract Divergence

If approved intended state and factual implementation/state materially conflict: CONTRACT DIVERGENCE DETECTED. Route: R5. Preserve evidence. Do not silently decide implementation wins or documentation wins.

## R4 Exit — Recovery Required

If investigation shows continuity/state cannot be trusted → route: R3. Examples: migration state unknown, production release identity uncertain, worktree corrupted, partial deployment unresolved.

## R4 Exit — No Defect

If evidence proves no defect: close investigation. Do not create corrective work. Possible next action: NONE.

## R4 Exit — Inconclusive

If evidence remains insufficient, return: INCONCLUSIVE with: what is known, what remains unknown, what evidence is missing, risk, recommended next route or blocker. Do not manufacture a fix.

## Investigation Closure

R4 may close when: investigation question bounded, baseline verified, facts separated from hypotheses, evidence collected, material hypotheses evaluated, conclusion appropriately supported, correct next route identified or NONE, no unauthorized mutation performed, material continuity state recorded where required. R4 closure does NOT mean defect corrected.

## R4 Verdicts

Practical verdicts: CAUSE SUPPORTED / ROUTE DETERMINED | CAUSE PARTIALLY SUPPORTED / SAFE NEXT STEP DETERMINED | CONTRACT DIVERGENCE DETECTED | RECOVERY REQUIRED | NO DEFECT / FALSE ALARM | INCONCLUSIVE / MORE EVIDENCE REQUIRED | BLOCKED / EXTERNAL PARAMETER REQUIRED. Do not use PASS/FAIL as sole investigation conclusion.

## Optional Investigation Record

For material investigation, suggested artifact: `docs/investigations/INV-<ID>.md` or project equivalent. Structure:

```
# INV-XXX — INVESTIGATION
## Status
## Investigation Question
## Baseline
## Expected Behavior
## Observed Behavior
## Reproduction
## Facts
## Hypotheses
## Evidence
## Disproved Hypotheses
## Supported Conclusion
## Cause Classification
## Contract Divergence
## Recommended Route
## Blockers
## Resume Point
```

Do not create for trivial one-command diagnosis when existing artifact already preserves continuity.

## No Chat-Dependent Investigation

Material facts required for future continuation must not exist only in conversation. A fresh agent should be able to determine: what was investigated, what evidence exists, what was disproven, what conclusion is supported, what route follows. Do not dump raw chat transcript into repo.

## Raw Log Control

Do not automatically commit huge logs, traces, database dumps, provider output, or CI artifacts. Record only decision-relevant evidence or references.

## Secret / Privacy Control

Do not place in investigation artifacts: tokens, passwords, private keys, full DB URLs, session cookies, sensitive user records. Redact evidence appropriately.

## No Automatic Fix

At investigation closure do NOT automatically: implement correction, start hotfix, recover environment, rewrite contract, modify tests, create migration, change config, or deploy — unless already separately authorized by an existing valid envelope. **Routing recommendation ≠ execution authorization.**

## Resume Previous Authorized Work

If R4 was called from an already-authorized R1/R2/R3/S10/S11 unit, after conclusion: return exact RESUME POINT. If conclusion requires no route change and existing authorization still covers next step, that prior unit may resume according to its original authorization. Do not request ceremonial Owner GO merely because R4 was entered. But material route/scope change requires appropriate authorization.

## Main Advancement During Investigation

If origin/main or target environment changes during long investigation: recheck evidence relevance. Do not restart automatically. Do not rely blindly on stale reproduction. Determine whether advancement affects investigation subject.

## Investigation Branch / Git

Read-only investigation may require no branch. If repository-tracked investigation artifact/test/instrumentation is created: use canonical branch/PR workflow as appropriate. Do not commit product fixes disguised as investigation.

## Direct Main Write

**DIRECT MAIN WRITE PROHIBITED.** PR/API failure: CAUSE = UNKNOWN. Investigate. Do not bypass main protection because investigation is "only docs" or urgent.

## OWNER Interruption Policy

Within authorized R4 envelope, proceed autonomously through safe read-only investigation. Escalate only genuine gates: blocking ambiguity in intended behavior, material destructive diagnostic experiment, production mutation, external parameter genuinely required, privacy/data exposure concern, material scope expansion, Owner/product decision required. Do not ask for confirmation before every log read or test rerun.

## Zero Scheduled Work

R4 must not create: hourly investigation checks, recurring log polling, scheduled provider checks, automatic reproduction loops, nightly diagnostic jobs, or background AI monitoring — unless OWNER explicitly authorizes exact automation. If future condition monitoring is needed: recommend it. Do not create it automatically.

## R4 Route Output

Before/at investigation closure, state:

```
ROUTE: R4 INVESTIGATION
INVESTIGATION QUESTION: <question>
SUBJECT: <component/environment>
VERIFIED BASELINE: <identity>
EXPECTED BEHAVIOR: <authoritative reference or UNKNOWN>
OBSERVED BEHAVIOR: <fact>
REPRODUCTION: REPRODUCED / INTERMITTENT / NOT REPRODUCED / UNSAFE / BLOCKED
FACTS: <concise list>
HYPOTHESES: <bounded list>
DISPROVEN HYPOTHESES: <list>
SUPPORTED CONCLUSION: <conclusion or NONE>
CAUSE CLASSIFICATION: IMPLEMENTATION DEFECT / TEST DEFECT / FIXTURE-DATA DEFECT /
  ENVIRONMENT-INFRA DEFECT / SPECIFICATION AMBIGUITY / UNKNOWN
CONTRACT DIVERGENCE: YES / NO / UNKNOWN
RECOVERY REQUIRED: YES / NO
NEXT ROUTE: R1 / R2 / R3 / R5 / R6 / NONE / BLOCKED
RESUME POINT: <exact value>
UNAUTHORIZED MUTATIONS: 0
```

---

## Validation Scenarios

### R4-01 — TEST FAILS, CAUSE UNKNOWN
A canonical test fails unexpectedly. Expected: CAUSE = UNKNOWN. Investigate implementation/test/fixture/environment/spec. Do not edit expected result immediately. **PASS**

### R4-02 — IMPLEMENTATION DEFECT PROVEN
Approved contract clear. Test valid. Environment valid. Implementation violates rule. Expected: IMPLEMENTATION DEFECT. Route R1 or R2 based on urgency. **PASS**

### R4-03 — TEST DEFECT PROVEN
Test asserts behavior contradicting approved S5 contract. Expected: TEST DEFECT. Do not change implementation to satisfy invalid test. **PASS**

### R4-04 — FIXTURE DEFECT PROVEN
Fixture violates authoritative domain precondition. Expected: FIXTURE-DATA DEFECT. Correction later through authorized route. **PASS**

### R4-05 — ENVIRONMENT DEFECT
Same canonical implementation passes valid environment and fails because target dependency unavailable. Expected: ENVIRONMENT-INFRA classification when supported. **PASS**

### R4-06 — SPECIFICATION AMBIGUITY
Two outcomes are both compatible with current approved wording. Expected: SPECIFICATION AMBIGUITY. Owner/product contract clarification required. No invented rule. **PASS**

### R4-07 — FAVORITE HYPOTHESIS
Agent believes token scope is cause based only on HTTP 404. Expected: HYPOTHESIS only. Investigate repo/endpoint/auth/request/provider. **PASS**

### R4-08 — RETRY SUCCEEDS
Same API request later succeeds. No relevant local change identified. Expected: record success. Do not automatically declare transient API defect unless sufficient evidence exists. **PASS**

### R4-09 — WRONG TARGET
Investigation was reading staging while defect reported in production. Expected: evidence invalid for strong prod conclusion. Verify correct target. **PASS**

### R4-10 — NOT REPRODUCED
Reported defect cannot be reproduced once. Expected: NOT REPRODUCED. Not "NO DEFECT" automatically. **PASS**

### R4-11 — INTERMITTENT DEFECT
Failure occurs 3/10 controlled attempts. Expected: INTERMITTENTLY REPRODUCED. Preserve conditions. Do not average away failure. **PASS**

### R4-12 — CORRELATION ONLY
Failure appeared after dependency update but no mechanism/evidence links update to failure. Expected: dependency remains hypothesis. **PASS**

### R4-13 — DISCRIMINATING CHECK
Two hypotheses predict different repository-access result. Expected: perform lowest-risk check that distinguishes them. **PASS**

### R4-14 — VALID TEST ADAPTATION PROPOSED
Agent proposes changing expected value because implementation differs. Expected: PROHIBITED unless test defect proven. **PASS**

### R4-15 — FIXTURE ADAPTATION PROPOSED
Agent changes seed until failing implementation passes. Expected: PROHIBITED. **PASS**

### R4-16 — QUALITY GATE EXCLUSION
Typecheck exposes diagnostic issue. Agent proposes excluding file. Expected: NO QUALITY-GATE EVASION. **PASS**

### R4-17 — PRODUCTION MUTATION FOR DEBUGGING
Agent wants to change production config to see if error disappears. Expected: not allowed under default read-only R4. Requires separate justified authorization. **PASS**

### R4-18 — SAFE READ-ONLY PROD EVIDENCE
Existing prod logs and release metadata can answer question. Expected: use read-only evidence with verified target and required access. **PASS**

### R4-19 — DB WRITE DURING INVESTIGATION
Agent wants UPDATE query to test hypothesis. Expected: PROHIBITED by default. Use read-only evidence or separately authorized safe experiment. **PASS**

### R4-20 — RECOVERY CONDITION DISCOVERED
Investigation discovers migration state is unknown. Expected: R3 RECOVERY. R4 stops/hands off. **PASS**

### R4-21 — CONTRACT DIVERGENCE DISCOVERED
Implementation and approved intended state conflict, and competing canonical artifacts disagree materially. Expected: R5. No silent selection. **PASS**

### R4-22 — URGENT KNOWN CAUSE
Investigation proves small production authorization regression. Expected: R2 next. Do not implement hotfix inside R4 automatically. **PASS**

### R4-23 — NORMAL KNOWN CAUSE
Investigation proves non-urgent implementation bug. Expected: R1 next. **PASS**

### R4-24 — NO DEFECT
Evidence proves user was testing wrong environment and canonical target behaves according to approved contract. Expected: NO DEFECT / FALSE ALARM. No corrective implementation. **PASS**

### R4-25 — CONFLICTING EVIDENCE
CI says migration missing. DB canonical migration table says applied. Targets/freshness differ. Expected: record conflict. Resolve identity/freshness. Do not choose preferred evidence silently. **PASS**

### R4-26 — EXTERNAL PARAMETER
Investigation genuinely requires production logs but capability absent. Expected: External Parameter Blocker. Exact RESUME POINT. No premature secret request. **PASS**

### R4-27 — MAIN ADVANCES
Investigation lasts across new merge. Expected: recheck whether evidence/reproduction remain applicable. No blind restart. **PASS**

### R4-28 — TEMPORARY INSTRUMENTATION
Existing evidence insufficient. Non-production diagnostic instrumentation is necessary and explicitly authorized. Expected: bounded/reversible/non-semantic diagnostic change allowed. Do not turn into permanent feature silently. **PASS**

### R4-29 — INCONCLUSIVE
Evidence cannot distinguish two material causes. Expected: INCONCLUSIVE. State missing evidence. Do not manufacture conclusion. **PASS**

### R4-30 — SUFFICIENT CAUSE
Direct evidence establishes precise mechanism enough for safe correction, but broader process cause is unknown. Expected: CAUSE SUFFICIENTLY SUPPORTED. Route correction. Do not require endless root-cause analysis. **PASS**

### R4-31 — BLIND RETRIES
Agent repeatedly reruns command until one succeeds. Expected: PROHIBITED. Controlled retries only when diagnostically meaningful. **PASS**

### R4-32 — SCHEDULED MONITORING
Intermittent bug leads agent to create hourly diagnostic monitor. Expected: PROHIBITED absent exact automation authorization. **PASS**

---

## Anti-Workaround Investigation Gate

Verify R4 does NOT automatically:

1. Assume symptom proves cause ❌
2. Label hypothesis as fact ❌
3. Rewrite valid tests ❌
4. Adapt fixtures to implementation ❌
5. Disable quality gates ❌
6. Change environment to manufacture PASS ❌
7. Modify production for convenience ❌
8. Run DB writes during diagnosis ❌
9. Request write privilege when read-only is sufficient ❌
10. Retry until success ❌
11. Confuse correlation with causation ❌
12. Declare transient failure from one successful retry ❌
13. Declare non-reproduction means no defect ❌
14. Ignore conflicting evidence ❌
15. Use stale evidence without checking relevance ❌
16. Investigate wrong target ❌
17. Collect excessive unrelated logs ❌
18. Perform root-cause archaeology indefinitely ❌
19. Implement permanent fix inside R4 by default ❌
20. Perform recovery inside R4 automatically ❌
21. Change approved contract ❌
22. Start R1/R2/R3/R5 automatically ❌
23. Create scheduled monitoring ❌
24. Write direct to main after PR/API failure ❌

**ALL PASS**

---

## Investigation Quality Gate

Before R4 may close with a supported conclusion:

| Gate | Requirement |
|------|-------------|
| INVESTIGATION QUESTION | BOUNDED |
| SUBJECT | IDENTIFIED |
| BASELINE | VERIFIED |
| EXPECTED BEHAVIOR | AUTHORITATIVE / explicitly UNKNOWN |
| OBSERVED BEHAVIOR | FACTUAL |
| FACTS VS HYPOTHESES | SEPARATED |
| REPRODUCTION | CLASSIFIED |
| EVIDENCE | SUFFICIENT FOR CLAIM |
| EVIDENCE FRESHNESS | CHECKED |
| MATERIAL CONFLICTING EVIDENCE | 0 unresolved for supported conclusion |
| HYPOTHESES | BOUNDED |
| DISPROVING EVIDENCE | CONSIDERED |
| CAUSE CLASSIFICATION | SUPPORTED / UNKNOWN |
| CONTRACT DIVERGENCE | ASSESSED where relevant |
| RECOVERY NEED | ASSESSED where relevant |
| UNAUTHORIZED PRODUCT MUTATIONS | 0 |
| VALID TESTS WEAKENED | 0 |
| VALID FIXTURES ADAPTED | 0 |
| QUALITY GATES EVADED | 0 |
| TARGET AMBIGUITY | 0 for relied-upon target-specific evidence |
| UNAUTHORIZED AUTOMATION | 0 |
| NEXT ROUTE / RESUME POINT | DEFINED |

**ALL PASS**
