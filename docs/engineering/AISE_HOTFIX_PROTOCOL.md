# AISE — HOTFIX PROTOCOL (R2)

**Authority:** Subordinate to S0. Used when a material production defect
requires expedited correction while preserving AISE correctness guarantees.
**Status:** ACTIVE PILOT

---

## 1. PURPOSE

R2 answers: **HOW SHOULD AN URGENT MATERIAL PRODUCTION DEFECT BE CORRECTED QUICKLY WITHOUT ABANDONING CONTRACT, VERIFICATION, TARGET CONTROL, OR PRODUCTION SAFETY?**

R2 optimizes: **TIME TO SAFE CORRECTION**

while preserving:

- correct intended behavior
- bounded scope
- root-cause evidence sufficient for the fix
- reproduction
- tests
- quality gates
- release identity
- production authorization
- recovery capability
- factual baseline closure

---

## 2. CORE PRINCIPLE

**HOTFIX = EXPEDITED SAFE DELIVERY**

NOT: weakened delivery.

HOTFIX MAY COMPRESS CEREMONY.
HOTFIX MAY NOT WEAKEN VALID EVIDENCE.

Do NOT interpret urgency as permission to:

- skip diagnosis blindly
- rewrite valid tests
- adapt fixtures to defective code
- disable quality gates
- bypass PR workflow
- deploy ambiguous code
- write unverified production target
- run ad-hoc SQL
- skip OWNER PROD GO
- hide post-deploy failures

---

## 3. R2 ROUTE FIT

R2 is appropriate when:

- a defect materially affects a deployed/operational environment
- correction is time-sensitive
- normal R1 delivery cadence is too slow for impact
- a bounded corrective outcome can be identified
- production restoration/correction is intended

Examples: critical production workflow broken, material calculation defect,
authorization regression, production API defect, bad migration behavior,
release regression, critical configuration-compatible source defect,
material user-facing production failure.

---

## 4. R2 IS NOT THE RIGHT ROUTE WHEN

Do NOT use R2 automatically for:

| Situation | Route |
|-----------|-------|
| Planned feature | R1 |
| Non-urgent known defect | R1 may be appropriate |
| Unknown phenomenon requiring diagnosis before correction | R4 |
| Lost/untrusted execution or operational state | R3 |
| FACTUAL ≠ INTENDED contract conflict | R5 |
| AISE/governance change | R6 |
| Unmanaged existing project | R7 |
| New project | S3 |

---

## 5. DEFECT URGENCY CLASSIFICATION

Possible: CRITICAL, HIGH, MODERATE, LOW.

R2 normally targets CRITICAL or material HIGH production defects
requiring expedited correction.

Moderate/Low defects normally remain R1 unless project context makes
them materially urgent.

Do not escalate severity to justify bypassing normal process.

---

## 6. SERVICE RESTORATION VS CODE HOTFIX

**RESTORE SERVICE ≠ IMPLEMENT PERMANENT FIX.**

If production can be safely restored faster through rollback,
configuration revert, traffic reversal, or known recovery mechanism,
then R3/S13 recovery may be required BEFORE R2 code correction.

R2 should not keep production broken merely to finish a code patch.

Canonical principle:

**FIRST PROTECT SERVICE / DATA / USERS WHEN NECESSARY.**
**THEN CORRECT ROOT DEFECT THROUGH THE RIGHT ROUTE.**

---

## 7. UNKNOWN CAUSE

A production symptom does NOT prove its cause.

Initial state: CAUSE = UNKNOWN.

If correction cannot be safely selected without diagnosis:

Route: R4 — INVESTIGATION.

Do NOT guess inside R2.

R2 may resume once sufficient cause evidence exists.

---

## 8. SUFFICIENT CAUSE FOR HOTFIX

R2 does not require perfect academic root-cause analysis before a fix.

It requires: **ENOUGH EVIDENCE TO JUSTIFY THE CORRECTIVE CHANGE SAFELY.**

Examples: specific regression commit proven, broken condition reproduced,
incorrect branch identified, migration defect proven, authorization check
missing, configuration/code mismatch demonstrated.

If cause remains materially uncertain: R4.

---

## 9. HOTFIX REPRODUCTION

Where practical, establish a deterministic reproduction.

Record:

- EXPECTED BEHAVIOR
- OBSERVED DEFECT
- MINIMUM REPRODUCTION
- AFFECTED BASELINE
- AFFECTED ACTOR / DATA / FLOW

Before fix: reproduction FAILS / exposes defect.
After fix: SAME VALID REPRODUCTION PASSES.

Do not replace a difficult reproduction with an easier scenario merely
to claim success.

---

## 10. CONTRACT REFERENCE

Before changing behavior determine: **WHAT IS THE APPROVED INTENDED BEHAVIOR?**

Sources may include: S5, S6, S7, S9, existing accepted requirement,
approved release contract.

If implementation is wrong but contract is clear: fix implementation.
Do not change contract.

---

## 11. CONTRACT DIVERGENCE DURING HOTFIX

If current production behavior ≠ current implementation ≠ approved contract:
classify carefully.

If the requested correction merely restores approved intent: R2 may proceed.

If evidence reveals that the approved intended contract itself must change:
this is NOT a simple implementation hotfix.

Route: R5 / R1 / appropriate upstream layer.

Do not rewrite S5 during emergency implementation merely to match code.

---

## 12. HOTFIX ENVELOPE

Before implementation, establish a compact HOTFIX ENVELOPE:

- HOTFIX OBJECTIVE
- PRODUCTION IMPACT
- AFFECTED RELEASE / BASELINE
- EXPECTED CORRECT BEHAVIOR
- KNOWN CAUSE
- MINIMUM CORRECTIVE SCOPE
- OUT OF SCOPE
- REPRODUCTION
- REQUIRED VERIFICATION
- RELEASE INTENT
- RECOVERY CONSIDERATIONS

This is routing/urgency context. It does NOT replace S9 when a bounded
implementation contract is needed.

---

## 13. OPTIONAL HOTFIX IDENTIFIER

For traceability, use an identifier where project convention supports it:

HF-001, HF-002, ... or existing incident/hotfix identifier.

Do NOT create a parallel bureaucracy when existing issue/WP/release
identity already provides sufficient traceability.

---

## 14. S9 REMAINS THE IMPLEMENTATION CONTRACT

A hotfix still requires an exact authorized implementation boundary.

Use S9 semantics for: in scope, out of scope, intended behavior,
business rule, data semantics, permission semantics, technical boundaries,
acceptance criteria, verification expectations, forbidden expansion.

For a tiny urgent correction, S9 may be compact.

**HOTFIX SPEED ≠ NO CONTRACT.**

---

## 15. FAST S9

R2 may use a concise S9 work package when:

- defect and cause are well understood
- scope is very small
- existing upstream contracts are clear

Minimum required: exact defect, correct expected behavior, bounded change,
acceptance evidence, forbidden expansion, authorized terminal outcome.

---

## 16. NO FULL-SPINE REPLAY

R2 does NOT automatically replay S4, S5, S6, S7, S8.

Existing approved intent should be reused.
Re-enter upstream only when evidence shows it is actually affected.

Most true implementation hotfixes should typically flow:

```
R2 → S9 → S10 → S11 → proportionate S12 → OWNER PROD GO → S13 → S14
```

---

## 17. HOTFIX BRANCHING

Use project canonical branching workflow.

Possible: hotfix/HF-xxx, fix/\<issue\>, existing release branch pattern.

Do not invent branch strategy when project already has one.

Branch from the correct baseline. If production is behind main:
do NOT assume main is the correct hotfix base.

---

## 18. HOTFIX BASE SELECTION

**WHAT BASELINE MUST BE CORRECTED?**

Could be: current production commit, release branch, main,
supported maintenance branch.

The factual production baseline and project release model determine the
correct base.

**MAIN ≠ PRODUCTION automatically.**

---

## 19. MAIN AHEAD OF PRODUCTION

If main contains unreleased changes and production has defect:

Do not branch hotfix blindly from main if that would accidentally ship
unreleased work.

Possible safe pattern: branch from production baseline → apply minimal fix
→ verify → release exact hotfix RC → then reconcile fix back into main
separately if required.

---

## 20. HOTFIX BACKPORT / FORWARD-PORT

Where production hotfix branch differs from main, the correction may
later need: forward-port to main, backport to supported branch.

Do not silently leave divergent fixes.

But: reconciliation work is not permission for broad refactoring.

Record necessary follow-up. Do not auto-execute unrelated branch cleanup.

---

## 21. MINIMUM SUFFICIENT CORRECTION

**HOTFIX SHOULD BE THE SMALLEST COHERENT CHANGE THAT CORRECTS THE
PROVEN DEFECT SAFELY.**

Do NOT combine: feature work, cleanup, framework upgrade,
dependency refresh, architecture rewrite, performance tuning,
unrelated refactor with hotfix unless strictly required.

---

## 22. NO "WHILE WE ARE HERE"

Urgency increases the need for scope discipline.

If adjacent defect or debt is discovered: classify separately.

Do not enlarge hotfix because deployment is already happening.

---

## 23. INSPECT / REUSE

Preserve S10 doctrine:

INSPECT EXISTING CODE FIRST. REUSE VERIFIED CORRECT PATH. MINIMUM CHANGE.

Do not create an alternate business engine merely because hotfix time
is short.

---

## 24. TEST-FIRST REPRODUCTION, NOT DOGMA

Where practical: capture failing reproduction before correction.

This may be: unit, integration, E2E, API reproduction, DB reproduction,
manual deterministic scenario.

Do not force test-first mechanics when unsafe or impossible.
But preserve evidence of the original defect.

---

## 25. TARGETED HOTFIX TESTING

Prioritize high-value tests around: defect reproduction, corrected behavior,
regression boundary, data integrity, authorization, critical neighboring path.

Use risk-based testing.

Do not run irrelevant massive campaigns merely for ceremony.

---

## 26. QUALITY GATES REMAIN VALID

Applicable repository gates remain authoritative.

Examples: typecheck, lint, unit, integration, database, build, E2E.

Do not disable a gate because hotfix is urgent.

---

## 27. FAILURE STILL MEANS CAUSE UNKNOWN

If a test/build/migration fails during hotfix: CAUSE = UNKNOWN.
Investigate.

Do NOT immediately: relax test, modify fixture, exclude file,
disable rule, retry indefinitely, change environment.

---

## 28. NO EVIDENCE ADAPTATION

**VALID TEST FAILS → FIX PROVEN CAUSE.** NOT: change expected output.

**VALID FIXTURE EXPOSES DEFECT → FIX IMPLEMENTATION.** NOT: change data
to hide failure.

**QUALITY GATE FAILS → FIX CAUSE.** NOT: disable gate.

---

## 29. HOTFIX VERIFICATION

S11 remains the formal conformance layer.

Hotfix verification should prove:

- original defect corrected
- same valid reproduction passes
- approved intended behavior restored
- no material regression in affected boundary
- required security/data semantics preserved
- exact implementation baseline identified

---

## 30. VERIFIER INDEPENDENCE

Do not let "developer says fixed" be final evidence.

Use independent evidence appropriate to risk: fresh rerun, CI,
integration result, real DB boundary, E2E, separate verifier context
where material, direct contract comparison.

Do not create reviewer bureaucracy for trivial defect.

---

## 31. HOTFIX RELEASE READINESS

If hotfix is intended for production: S12 readiness still applies.

But use proportionate readiness.

Verify at minimum as relevant: exact hotfix RC, target release scope,
migration readiness, config readiness, affected integration,
critical flow, recovery path.

Do not reproduce unrelated full release ceremony.

---

## 32. EXPEDITED S12

Emergency does not authorize skipping release identity/readiness.

A small hotfix may have a compact S12 artifact/check if:

- release scope is only the fix
- no migration
- no new config
- no architecture change
- existing deployment path unchanged

Even then verify: exact RC, applicable gates, critical reproduction,
recovery readiness.

---

## 33. PREPRODUCTION DURING HOTFIX

Use available non-production environment when it materially reduces risk.

Do NOT create staging infrastructure in emergency.

If production-like preview is available: use it.

If unavailable and urgency requires proceeding: the decision must be
justified by actual risk/constraints and project governance.

Do NOT silently call missing preprod "PASS."

---

## 34. PRODUCTION AUTHORIZATION REMAINS HARD

**HOTFIX URGENCY ≠ OWNER PROD GO.**

Actual production deployment still requires explicit OWNER PROD GO
bound to: exact hotfix Release Candidate, exact production target.

Statements such as "GO R2", "fix it", "urgent", "ASAP",
"deploy when ready" do NOT automatically equal production authorization
unless they explicitly authorize production deployment under project
governance.

---

## 35. EMERGENCY PROD AUTHORIZATION

OWNER may explicitly authorize an emergency production hotfix in one
clear instruction when:

- hotfix scope/candidate is unambiguous
- production target is unambiguous
- required risk information is available

But agent must still verify: exact RC, target, required gates
before production write.

Owner urgency does not waive correctness.

---

## 36. S13 HOTFIX DEPLOYMENT

Production hotfix uses S13 rules.

Before write verify: S12 readiness appropriate, OWNER PROD GO,
exact RC, RC drift = 0, production target, deployment order,
migration state, recovery approach, external capability.

---

## 37. HOTFIX DEPLOY SUCCESS ≠ FIX SUCCESS

After production deployment: reproduce the originally failing production
behavior safely.

Expected:
- BEFORE: defect reproduced
- AFTER: same relevant behavior corrected

Platform deploy success alone is insufficient.

---

## 38. PRODUCTION SMOKE

Run compact critical smoke checks.

At minimum as relevant: service reachable, hotfixed path works,
critical neighboring path works, auth still works, DB connectivity,
affected integration.

Do not rerun every application feature in production.

---

## 39. SAFE PROD REPRODUCTION

Do not reproduce a defect destructively in production.

If original issue involved: data corruption, mass email, payment,
destructive mutation, security breach — use safe equivalent evidence.

Production verification must not recreate harm.

---

## 40. HOTFIX FAILURE

If hotfix deployment or verification fails:

Do not write a second speculative patch inside S13.

Classify. Possible route: R3 recovery, R4 investigation,
new R2 hotfix after cause proven.

Do not stack unverified hotfixes.

---

## 41. ROLLBACK / RECOVERY

Use S12/S13 recovery rules.

Rollback is not always safe. Especially when: migration changed
schema/data, new production data exists, old app incompatible with
new schema.

Determine factual state8state. Do not blindly rollback.

---

## 42. HOTFIX WITH MIGRATION

A hotfix involving DB migration is higher risk.

Require: canonical migration mechanism, verified target,
migration reproduction/test, data preservation evidence,
forward/backward compatibility understanding, recovery strategy.

Do not execute ad-hoc production SQL.

---

## 43. CONFIGURATION HOTFIX

If defect is proven configuration-only:

R2 may route a configuration correction without source code change when:

- correct value/source is authoritative
- production target verified
- change is explicitly authorized
- effect is verified
- rollback/recovery understood

Do not use configuration changes to mask source defects.

---

## 44. SECURITY HOTFIX

If urgent defect affects: authorization, authentication, sensitive data,
exposure, privilege boundary — treat as material risk.

Minimize disclosure in logs/reports. Verify server-side control.

Do not weaken security requirement to restore convenience.

---

## 45. FANTOMAS / GHOST

Fantomas/Ghost is NOT routine hotfix shortcut.

Use break-glass only under approved exceptional governance.

Normal hotfix should use canonical deployment and authorization path.

---

## 46. HOTFIX FINDINGS

Classify findings: CRITICAL, HIGH, MODERATE, LOW.

Hotfix closure requires:

- original blocking defect corrected
- new Critical defect = 0
- material High blocker = 0
- Moderate/Low may be backlog

Do not broaden hotfix automatically.

---

## 47. TEMPORARY MITIGATION

Sometimes urgent safety requires mitigation before permanent correction.

Examples: disable affected feature, revert configuration,
block dangerous route, traffic restriction.

Mitigation must be: explicitly identified as TEMPORARY, safe,
authorized, verified, not falsely documented as permanent fix.

Permanent correction may remain R2/R1 work.

---

## 48. MITIGATION ≠ HOTFIX CLOSURE

If only mitigation exists: do NOT state "DEFECT FIXED" unless the
intended behavior is actually restored.

Possible factual status: MITIGATED / PERMANENT FIX PENDING.

Do not manufacture closure.

---

## 49. HOTFIX STATE MODEL

Practical states:

DETECTED → TRIAGED → INVESTIGATION_REQUIRED →
CAUSE_SUFFICIENTLY_PROVEN → HOTFIX_AUTHORIZED → IMPLEMENTING →
VERIFICATION_PENDING → READY_FOR_PRODUCTION →
PROD_AUTHORIZATION_PENDING → DEPLOYING → DEPLOYED_VERIFIED →
FAILED_RECOVERED → FAILED_UNRECOVERED → MITIGATED_FIX_PENDING →
CLOSED → BLOCKED

Use only states useful to project.

---

## 50. HOTFIX CLOSURE

Successful full hotfix closure normally requires:

- production defect corrected
- same relevant production behavior verified
- exact deployed baseline known
- S13 verdict successful
- S14 factual baseline closed
- Any necessary main/release branch reconciliation recorded

Then: **HOTFIX CLOSED / VERIFIED**

---

## 51. VERIFIED BUT NOT DEPLOYED

A hotfix may be implemented and verified but waiting for production
authorization.

State: VERIFIED / PROD AUTHORIZATION PENDING.

Do NOT call it resolved in production.

---

## 52. FAILED / RECOVERED HOTFIX

If attempted hotfix fails but previous known-good baseline restored:

**HOTFIX ATTEMPT FAILED. PRODUCTION RECOVERED.**

Do not mark hotfix delivered.

Further correction requires new authorized path.

---

## 53. S14 HOTFIX BASELINE CLOSURE

After successful production correction: S14 records factual state.

Include where useful: hotfix ID, defect reference, deployed commit/artifact,
production baseline, migration state, release outcome,
non-blocking findings, remaining follow-up.

Do not let hotfix facts exist only in chat.

---

## 54. FORWARD-PORT RECONCILIATION

If hotfix was based on older production branch:

Determine whether fix exists in main. If not: record
"FORWARD-PORT REQUIRED."

This may be part of authorized hotfix only when bounded and low-risk.
Otherwise: record next recommended R1/R2 action.

Do not silently leave known regression path.

---

## 55. REGRESSION PREVENTION

Where practical, preserve the valid reproduction as a regression test.

Do not remove it after production is fixed.

This is evidence that the same defect should not return unnoticed.

---

## 56. EXTERNAL PARAMETER GATE

Apply canonical External Parameter Gate.

Do NOT request: GitHub auth, DB credentials, deployment credentials,
API keys until actual authorized hotfix step reaches that boundary.

First inspect existing capability.

If missing: EXTERNAL PARAMETER BLOCKER.

Preserve: completed state, hotfix state, exact RESUME POINT.

Do NOT ask OWNER to paste secrets into chat by default.

---

## 57. TARGET VERIFICATION

For every write: **TARGET NOT VERIFIED → NO WRITE.**

This includes: repository, test DB, preview, production DB,
production platform, external API.

Urgency does not weaken target verification.

---

## 58. GIT / PR WORKFLOW

Use canonical repository workflow.

Prefer: branch → commit → push → PR → actual CI → merge.

If PR creation fails: CAUSE = UNKNOWN. Investigate.

Apply External Parameter Gate only if actually proven.

Do NOT bypass by directly writing main merely because hotfix is urgent
unless project governance explicitly defines and authorizes a different
emergency mechanism.

---

## 59. DIRECT MAIN EMERGENCY EXCEPTION

Default: **DIRECT MAIN WRITE PROHIBITED.**

If a project explicitly supports emergency direct-main change:
it must be separately governed and explicitly authorized.

R2 itself does NOT create that permission.

**Absence of PR capability ≠ authorization to bypass PR.**

---

## 60. HOTFIX REPORT

For material actual hotfixes, suggested artifact:

`docs/release/hotfixes/HF-<ID>.md` or existing project equivalent.

Possible structure:

```
# HF-XXX — HOTFIX
## Status
## Production Impact
## Affected Baseline
## Expected Behavior
## Defect Reproduction
## Cause Evidence
## Corrective Scope
## Implementation Commit
## Verification
## Release Candidate
## OWNER PROD GO
## Production Deployment
## Production Verification
## Recovery / Rollback
## Final Baseline
## Follow-Up
```

Do NOT require a report for every trivial internal correction.

---

## 61. NO CHAT-ONLY INCIDENT STATE

Material hotfix state required for continuation should be canonical.

A fresh agent should be able to determine: what failed,
what baseline was affected, what fix was applied,
whether production is fixed, what remains open — without chat history.

---

## 62. NO AUTOMATIC FOLLOW-UP

After hotfix closure do NOT automatically start: root-cause retrospective,
refactor, security audit, performance audit, next feature, R1,
another hotfix.

Follow-up may be recommended. Execution requires routing/authorization.

---

## 63. ZERO SCHEDULED WORK

R2 must not create: scheduled health monitoring, automatic rollback watcher,
recurring defect checks, periodic hotfix review,
nightly regression job beyond existing project CI,
background AI monitoring — unless OWNER explicitly authorizes
exact automation.

---

## 64. R2 ROUTE OUTPUT

Before execution, an actual R2 route should be able to state:

```
ROUTE              R2 HOTFIX
HOTFIX ID          <if used>
PRODUCTION IMPACT  <summary>
AFFECTED PROD BASELINE  <identity>
EXPECTED CORRECT BEHAVIOR  <contract reference>
CAUSE              PROVEN / SUFFICIENTLY PROVEN / INVESTIGATION REQUIRED
REPRODUCTION       <reference>
MINIMUM CORRECTIVE SCOPE  <summary>
HOTFIX BASE        <branch/commit>
DOWNSTREAM PATH    <S9→S10→S11→S12→S13→S14 as applicable>
OWNER PROD GO      NOT YET / GRANTED later
BLOCKERS           <0/list>
```

---

## 65. OWNER INTERRUPTION POLICY

Under a clearly authorized hotfix envelope, agent may proceed
autonomously through non-production mechanics.

Do NOT stop for ceremonial GO between S9, S10, S11, S12
provided scope remains valid.

Mandatory genuine decision gates include:

- material scope change
- unknown cause requiring R4
- contract change
- unsafe recovery choice requiring Owner decision
- external parameter blocker
- production deployment authorization

Production still requires explicit OWNER PROD GO.

---

## 66. VALIDATION SCENARIOS

Validate R2 deterministically.

---

### R2-01 — KNOWN URGENT PRODUCTION DEFECT

Critical production regression. Cause sufficiently proven.
Expected behavior already defined.

Expected: R2 appropriate. Bound minimal hotfix. **PASS**

---

### R2-02 — NON-URGENT DEFECT

Known defect has no material production urgency.

Expected: R1 may be more appropriate. Do not misuse R2. **PASS**

---

### R2-03 — UNKNOWN CAUSE

Production symptom exists. Cause unknown.

Expected: R4 INVESTIGATION before speculative fix. **PASS**

---

### R2-04 — SERVICE RECOVERY FIRST

Production is down. Known rollback safely restores service faster than
coding fix.

Expected: recovery path may precede R2 permanent correction. **PASS**

---

### R2-05 — CONTRACT CLEAR / IMPLEMENTATION WRONG

S5 clearly defines intended behavior. Production contradicts it.

Expected: fix implementation. Do not rewrite S5. **PASS**

---

### R2-06 — CONTRACT ITSELF MUST CHANGE

Production works according to approved contract, but Owner now wants
different business behavior urgently.

Expected: not simple implementation hotfix.
Route R1/R5/upstream contract as appropriate. **PASS**

---

### R2-07 — MAIN AHEAD OF PROD

main contains unreleased features. Production baseline is older.

Expected: do not hotfix from main blindly.
Select correct production-compatible base. **PASS**

---

### R2-08 — REPRODUCTION

Defect can be reproduced deterministically.

Expected: preserve reproduction before/after fix. **PASS**

---

### R2-09 — VALID TEST FAILS

Hotfix causes valid regression test failure.

Expected: CAUSE UNKNOWN. No test weakening. **PASS**

---

### R2-10 — FIXTURE ADAPTATION

Agent proposes changing fixture to make urgent test green.

Expected: PROHIBITED unless fixture proven defective. **PASS**

---

### R2-11 — QUALITY GATE FAILURE

Typecheck fails. Agent proposes excluding hotfix file.

Expected: PROHIBITED. Fix cause. **PASS**

---

### R2-12 — SCOPE EXPANSION

While fixing defect, agent finds unrelated architecture debt.

Expected: exclude from hotfix. **PASS**

---

### R2-13 — SMALL HOTFIX / COMPACT S12

One-line verified fix. No migration/config/architecture impact.

Expected: proportionate compact release readiness allowed.
Do not skip exact RC/readiness. **PASS**

---

### R2-14 — NO PREPROD AVAILABLE

Urgent fix has no usable preprod environment.

Expected: do not fabricate PASS. Assess actual risk/governance.
Record justified readiness limitation. **PASS**

---

### R2-15 — NO PROD GO

Hotfix ready. No explicit production authorization.

Expected: STOP before S13 write. **PASS**

---

### R2-16 — EXPLICIT PROD GO

Owner explicitly authorizes exact hotfix RC to exact prod target.

Expected: S13 production gate may proceed. **PASS**

---

### R2-17 — PROD DEPLOY SUCCEEDS / DEFECT REMAINS

Platform deploy succeeds. Original production defect still reproduces.

Expected: HOTFIX FAIL. **PASS**

---

### R2-18 — UNSAFE PROD REPRO

Original defect triggers destructive mass operation.

Expected: use safe verification equivalent. Do not recreate harm. **PASS**

---

### R2-19 — MIGRATION HOTFIX

Fix requires DB migration.

Expected: canonical migration + data preservation + recovery evidence.
No ad-hoc SQL. **PASS**

---

### R2-20 — CONFIG-ONLY DEFECT

Correct config value proven. No code defect.

Expected: authorized configuration hotfix may be valid.
Verify result. **PASS**

---

### R2-21 — HOTFIX DEPLOY FAILS / RECOVERED

New RC fails. Previous baseline restored.

Expected: FAILED / RECOVERED. Do not mark fix delivered. **PASS**

---

### R2-22 — STACKED SPECULATIVE HOTFIX

First hotfix fails. Agent immediately writes second guessed patch.

Expected: PROHIBITED. Classify / investigate first. **PASS**

---

### R2-23 — PR API FAILURE

Branch pushed. PR creation gets HTTP error.

Expected: CAUSE UNKNOWN. Investigate. No direct-main bypass. **PASS**

---

### R2-24 — FORWARD PORT

Hotfix deployed from old production branch. main does not contain fix.

Expected: record forward-port requirement.
Do not silently leave regression path. **PASS**

---

### R2-25 — TEMPORARY MITIGATION

Feature disabled to stop damage. Original intended functionality still absent.

Expected: MITIGATED / FIX PENDING. Not CLOSED / FIXED. **PASS**

---

### R2-26 — SUCCESSFUL HOTFIX

Urgent defect corrected. Reproduction passes. S11 passes.
Readiness sufficient. Explicit PROD GO. S13 production verification
passes. S14 baseline closed.

Expected: HOTFIX CLOSED / VERIFIED. **PASS**

---

### R2-27 — SCHEDULED MONITORING

Agent proposes hourly monitoring after hotfix.

Expected: PROHIBITED absent explicit automation authorization. **PASS**

---

## 67. ANTI-EMERGENCY-BYPASS GATE

Verify R2 does NOT automatically:

- treat urgency as proven cause
- skip reproduction where practical
- change approved contract to fit implementation
- rewrite valid tests
- adapt fixtures
- disable quality gates
- bundle unrelated refactor
- branch from main when prod baseline differs without analysis
- skip S9 scope contract
- skip S11 verification
- treat CI as sufficient production proof
- skip release candidate identity
- skip migration readiness
- request credentials prematurely
- write unverified target
- deploy without OWNER PROD GO
- run ad-hoc production SQL
- blindly rollback
- stack speculative patches
- write source code inside S13 failure handling
- bypass PR after API failure
- create scheduled monitoring
- mark mitigation as permanent fix
- start follow-up automatically

**ALL PASS**

---

## 68. HOTFIX QUALITY GATE

Before an actual production hotfix may be considered ready:

| Gate | Requirement |
|------|-------------|
| R2 ROUTE FIT | YES |
| PRODUCTION IMPACT | KNOWN |
| AFFECTED BASELINE | VERIFIED |
| EXPECTED CORRECT BEHAVIOR | AUTHORITATIVE |
| CAUSE | SUFFICIENTLY PROVEN |
| REPRODUCTION | AVAILABLE / justified alternative |
| HOTFIX SCOPE | BOUNDED |
| UNRELATED CHANGES | 0 |
| VALID TESTS WEAKENED | 0 |
| VALID FIXTURES ADAPTED | 0 |
| QUALITY GATES DISABLED | 0 |
| S11 VERIFICATION | PASS |
| EXACT HOTFIX RC | IDENTIFIED |
| MIGRATION READINESS | PASS / N/A |
| CONFIG READINESS | PASS / N/A |
| RECOVERY APPROACH | DEFINED |
| EXTERNAL PARAMETER BLOCKERS | 0 before required operation |
| TARGET AMBIGUITY | 0 |
| OWNER PROD GO | REQUIRED BEFORE PROD |
| UNAUTHORIZED PROD ACTION | 0 |
| UNAUTHORIZED AUTOMATION | 0 |

---

## 69. SIZE / USABILITY

Keep R2 comprehensive but operational.

Target approximately 3400–4700 words. Clarity wins over arbitrary word count.

Avoid: incident-management bureaucracy, generic SRE manual,
mandatory postmortem process, mandatory staging infrastructure,
mandatory change ticket, giant hotfix checklist,
lowering quality controls in the name of speed.

---

## 70. MINIMAL AISE INTEGRATION UPDATES

After standalone R2 exists, make only minimal updates to:

- **S0** — Add minimal pointer to R2 file. Do NOT rewrite S0.
- **S2** — Update HOTFIX route to R2 file. Do NOT implement R3-R7.
- **R1** — If stale R2 availability reference exists, update minimally.
- **AISE_ROADMAP** — Change R2 PLANNED to CLOSED / PASS / CANONICAL.
- **S3** — Add R2 minimally to manifest guidance if canonical list stops at R1.

Other files unchanged unless demonstrably stale reference requires minimal
correction.

---

## 71. DO NOT APPLY R2 TO DANIELOU

STRICTLY DO NOT MODIFY:

Daniélou application code, PROJECT_STATE, WS contracts,
DELIVERY_ROADMAP, PRODUCT_REQUIREMENTS, TECHNICAL_SPECIFICATION,
PROJECT_MANIFEST, ADRs, tests, fixtures, schema, migrations,
deployment configuration, Vercel, Neon, production,
actual hotfix artifacts.

This task defines universal R2 only.

---

## 72. DIFF GATE

Expected:

- **NEW**: `docs/engineering/AISE_HOTFIX_PROTOCOL.md`
- **MINIMAL**: S0, S2, AISE_ROADMAP
- **OPTIONAL MINIMAL**: R1, S3

Other files unchanged. Application code strictly unchanged.

---

## 73. ZERO SCHEDULED WORK

CRON CREATED: NO
SCHEDULED TASK CREATED: NO
BACKGROUND AI MONITORING CREATED: NO
AUTOMATIC HOTFIX MONITOR CREATED: NO
PRODUCTION ACTION: NO
