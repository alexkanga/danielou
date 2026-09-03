# AISE — RECOVERY PROTOCOL (R3)

**Authority:** Subordinate to S0. Used when factual continuity is materially
untrusted and trustworthy state must be restored.
**Status:** ACTIVE PILOT

---

## 1. PURPOSE

R3 answers: **HOW SHOULD AISE RESTORE A TRUSTWORTHY OPERATING OR ENGINEERING STATE WHEN CURRENT CONTINUITY CAN NO LONGER BE RELIED UPON?**

R3 is concerned with: TRUST, CONTINUITY, KNOWN-GOOD BASELINES,
SAFE RESTORATION, POST-RECOVERY VERIFICATION.

It is not primarily concerned with: feature implementation,
permanent bug correction, full root-cause analysis,
new architecture, new product behavior.

---

## 2. CORE PRINCIPLE

**RECOVERY = RESTORE TRUSTWORTHY FACTUAL STATE**

NOT: GUESS THE MISSING STATE.

---

## 3. R3 ROUTE FIT

R3 is appropriate when factual continuity is materially untrusted.

Examples: local worktree lost/corrupted, agent session continuity uncertain,
wrong repository/worktree used, branch state cannot be trusted,
local unpushed implementation lost, environment identity uncertain,
deployment partially failed, production state unknown after failure,
migration partially applied or state uncertain,
previous production baseline must be restored,
configuration state materially inconsistent,
release rollback/recovery required,
operational state cannot safely support continued engineering.

---

## 4. R3 IS NOT THE RIGHT ROUTE WHEN

| Situation | Route |
|-----------|-------|
| Normal planned change | R1 |
| Known urgent production defect needing new corrective implementation | R2 |
| Unknown root cause with otherwise stable continuity | R4 |
| Contract mismatch | R5 |
| AISE/governance change | R6 |
| Unmanaged existing project | R7 |
| New project | S3 |

R3 restores trustworthy state. It does not replace all other routes.

---

## 5. RECOVERY VS INVESTIGATION

R3 asks: **WHAT STATE CAN BE TRUSTED, AND HOW DO WE RESTORE A SAFE KNOWN STATE?**

R4 asks: **WHY DID THE FAILURE / BEHAVIOR OCCUR?**

R3 may perform enough investigation to establish safe recovery facts.
It must NOT expand into unlimited root-cause analysis.

If safe recovery depends on understanding an unknown cause:
pause and route R4.

---

## 6. RECOVERY VS HOTFIX

**RECOVERY ≠ PERMANENT FIX.**

Example: bad release deployed → restore previous known-good release
through R3/S13 recovery. Permanent source correction → R2 or R1 later.

Do not keep production broken while developing a permanent fix when
safe recovery is available and appropriate.

---

## 7. RECOVERY VS ROLLBACK

Rollback is ONE possible recovery mechanism.

Recovery may instead require: fresh clone/rebuild, redeployment of
known-good artifact, configuration restore, forward recovery,
migration completion, database restore, traffic reversal,
environment recreation, service restart using canonical deployment mechanism.

**RECOVERY ≠ ROLLBACK.**

---

## 8. TRUST MODEL

Classify relevant state as:

- **TRUSTED** — verified factual evidence supports use.
- **PARTIALLY TRUSTED** — some facts verified, others unresolved.
- **UNTRUSTED** — continuity or correctness materially uncertain.
- **UNKNOWN** — not enough evidence to classify.

Recovery actions must be based on TRUSTED facts.
UNKNOWN → INVESTIGATE.

---

## 9. RECOVERY SUBJECT

Identify exactly what requires recovery.

Possible subjects: LOCAL WORKSPACE, GIT BRANCH, REPOSITORY CONTINUITY,
BUILD / ARTIFACT, NON-PRODUCTION ENVIRONMENT, PRODUCTION APPLICATION,
PRODUCTION DATABASE, MIGRATION STATE, CONFIGURATION,
EXTERNAL INTEGRATION STATE, DEPLOYMENT PIPELINE,
MULTI-COMPONENT OPERATIONAL STATE.

Do not declare "the project is broken" when only one subject is affected.

---

## 10. RECOVERY SCOPE

Before action establish: RECOVERY OBJECTIVE, RECOVERY SUBJECT,
OBSERVED UNTRUSTED STATE, LAST KNOWN-GOOD STATE, EVIDENCE FOR THAT STATE,
AUTHORIZED RECOVERY BOUNDARY, EXPECTED RESULT, FORBIDDEN ACTIONS,
POST-RECOVERY VERIFICATION.

This is a recovery envelope. Keep it compact.

---

## 11. LAST KNOWN-GOOD BASELINE

Recovery should prefer the latest factual state proven safe for the
required subject.

Possible evidence: origin/main commit, verified production commit,
release artifact digest, S13 production report, S14 factual baseline,
migration history, known configuration reference,
deployment platform history, database backup metadata.

**KNOWN-GOOD ≠ LATEST.** Do NOT select a baseline merely because it is recent.

---

## 12. FACTUAL STATE WINS

Do not recover to: what should have been deployed, what the agent
remembers, what a previous message claimed, what a local branch happens
to contain — without factual verification.

**RECOVERY TARGET = VERIFIED FACTUAL BASELINE.**

---

## 13. PRESERVE EVIDENCE BEFORE DESTRUCTIVE ACTION

Before destructive recovery, preserve only evidence materially needed to:
understand current factual state, confirm recovery result,
support later investigation.

Examples: current commit IDs, deployment IDs, migration status,
relevant logs, error identifiers, configuration references.

Do NOT collect everything. Do NOT delay critical safe recovery for
exhaustive evidence gathering.

---

## 14. MINIMUM DESTRUCTIVE ACTION

**USE THE LEAST DESTRUCTIVE RECOVERY THAT RESTORES TRUSTWORTHY STATE.**

Prefer: fresh workspace over history surgery, redeploy known-good artifact
over live patch, canonical migration recovery over ad-hoc SQL,
configuration restore over speculative code change.

Do not destroy potentially useful state unnecessarily.

---

## 15. FROZEN RESTART RULE

Preserve exactly: **UNPUSHED LOCAL WORK IS NON-CANONICAL.**

If execution continuity is uncertain:

DO NOT reconstruct from memory.
DO NOT perform archaeology/reflog/local salvage by default.

Default: VERIFY CANONICAL REMOTE → FRESH CLEAN BASE →
REBUILD AUTHORIZED UNIT → TEST → COMMIT → PUSH

unless OWNER explicitly authorizes recovery of local work and continuity
is sufficiently known.

---

## 16. LOCAL WORKSPACE RECOVERY

When local worktree/session is untrusted: verify canonical origin,
verify intended repository, verify remote main,
preserve unrelated user work if safely identifiable,
prefer fresh clone/worktree, re-enter authorized unit from canonical state.

Do NOT repair an unknown dirty worktree by deleting files blindly.

---

## 17. LOST UNPUSHED WORK

If unpushed work is missing and continuity is uncertain:

Classify: NON-CANONICAL LOCAL WORK LOST. Default: rebuild from canonical remote.

Do NOT: search temporary directories indefinitely, reconstruct from chat,
use reflog archaeology by default, claim missing work is canonical.

---

## 18. OWNER-AUTHORIZED LOCAL SALVAGE

Local salvage may be attempted only when: OWNER explicitly authorizes it,
expected local state is sufficiently bounded, recovery risk is acceptable,
salvage will not overwrite canonical evidence.

Even then: salvaged work must be verified before canonicalization.

---

## 19. WRONG REPOSITORY / WRONG WORKTREE

If agent discovers it has been operating in the wrong repository or worktree:

STOP writes. Verify canonical repository identity.
Do not transplant unknown files automatically.
Determine whether previous work is: discardable non-canonical work,
safely reproducible, or OWNER-authorized salvage candidate.

---

## 20. REPOSITORY RECOVERY

R3 must distinguish: local repository damage from canonical remote
repository damage.

If local clone is broken: prefer fresh clone.

If canonical remote itself is suspected damaged:
do NOT rewrite remote history automatically.
This is a high-risk governance event. Escalate with factual evidence.

---

## 21. NO FORCE-PUSH RECOVERY BY DEFAULT

**FORCE PUSH PROHIBITED BY DEFAULT.**

Do not rewrite: main, shared release branches, tags, remote history
as a generic recovery action.

Any history rewrite requires explicit, separately justified Owner
authorization and project-specific governance.

---

## 22. CANONICAL REMOTE ADVANCEMENT

If origin/main advanced while work was interrupted:
determine material compatibility.

If no material overlap: resume/rebase using canonical project workflow.
If material conflict exists: do not guess.
Route appropriate change/divergence resolution.

Recovery does not mean overwriting newer canonical work.

---

## 23. BUILD / ARTIFACT RECOVERY

If a build artifact is corrupt, missing, or identity cannot be trusted:
rebuild from exact verified source when possible.

Do not deploy an artifact whose source baseline is unknown.

Record: source commit, artifact identity, rebuild result
where materially required.

---

## 24. NON-PRODUCTION ENVIRONMENT RECOVERY

For preview/test/staging recovery: verify target identity,
verify expected baseline, restore using canonical deployment/config
mechanism, avoid creating duplicate environment unnecessarily.

If environment can be safely recreated from canonical infrastructure:
prefer reproducible recreation over manual patching.

---

## 25. PRODUCTION RECOVERY ENTRY

Production recovery is high risk.

Before production recovery action establish: ACTUAL CURRENT PROD STATE,
LAST KNOWN-GOOD PROD BASELINE, TARGET, RECOVERY MECHANISM,
MIGRATION STATE, DATA RISK, AUTHORIZED RECOVERY ACTION,
External capability required.

Do not infer state from provider dashboard status alone.

---

## 26. PRODUCTION RECOVERY AUTHORIZATION

R3 protocol itself does NOT create blanket production-write authority.

For actual production recovery: use existing S13 emergency/recovery
authorization model and project governance.

If recovery operation writes production and no pre-authorized emergency
recovery authority exists: explicit Owner authorization is required.

Do not treat "GO R3" as universal permission for arbitrary
production mutation.

---

## 27. SERVICE RESTORATION PRIORITY

Where users/data/service are materially at risk:
prioritize safe restoration over permanent correction.

Examples: restore previous verified deployment, revert proven bad config,
isolate failed release, complete approved migration recovery.

Then separately route permanent correction.

---

## 28. PRODUCTION BASELINE RECOVERY

If restoring previous release: verify previous baseline is actually
compatible with current: database schema, data state, configuration,
external dependencies.

Do NOT redeploy previous app blindly.

---

## 29. WRONG RELEASE RECOVERY

If wrong artifact/commit was deployed: identify: actual deployed baseline,
intended approved baseline, migration/config state.

Then select safe recovery.

Do not simply redeploy intended artifact if DB/config has already changed
in incompatible ways.

---

## 30. PARTIAL DEPLOYMENT

If deployment partially completed: record actual rollout state.

Possible: some instances old, some instances new,
migration complete/incomplete, config partially changed, traffic mixed.

Do NOT call state "probably deployed."

Unknown partial deployment is a material recovery condition.

---

## 31. MULTI-INSTANCE RECOVERY

Where architecture uses: rolling, canary, blue/green, multi-region,
multiple instances — recover according to existing platform strategy.

Do NOT introduce advanced rollout mechanisms into simple projects.

---

## 32. DATABASE RECOVERY

Database recovery requires extreme factual discipline.

Determine: target DB, actual migration state, schema state,
data state where material, backup/recovery capability,
application compatibility.

Do NOT execute destructive DB recovery while state remains unknown.

---

## 33. MIGRATION FAILURE

If migration failed: do NOT blindly rerun.

Classify factual state: NOT APPLIED, PARTIALLY APPLIED,
FULLY APPLIED BUT COMMAND FAILED, ROLLBACK APPLIED, UNKNOWN.

Use canonical migration mechanism/evidence. UNKNOWN → investigate.

---

## 34. PARTIALLY APPLIED MIGRATION

Treat partial migration as material operational risk.

Do not: manually patch arbitrary columns,
mark migration complete without evidence, rerun blindly,
restore DB blindly.

Determine safest recovery path from actual migration semantics.

---

## 35. MIGRATION RECOVERY OPTIONS

Possible evidence-supported recovery mechanisms: complete forward migration,
apply approved corrective migration, restore known-good DB,
restore previous compatible app, reconcile canonical migration metadata.

Use only mechanisms supported by project architecture/tooling.
Do not invent generic SQL surgery.

---

## 36. DATABASE RESTORE

A database restore is destructive/high-impact.

Before restore verify: backup identity, backup timestamp,
expected data loss window, target DB, application compatibility,
authorization.

Do NOT restore simply because backup exists.

---

## 37. DATA PRESERVATION

Recovery must explicitly consider: user-generated data after last
known-good baseline, audit records, transactions,
new writes after bad deployment, migration-created data.

Do not sacrifice newer valid data merely to simplify rollback.

---

## 38. CONFIGURATION RECOVERY

If configuration defect is proven: restore known-good authoritative
value/reference. Verify: production target, config source, scope, effect.

Do not guess configuration values. Do not expose secret values.

---

## 39. SECRET ROTATION IS NOT DEFAULT RECOVERY

Do NOT rotate credentials, tokens, or secrets merely because an
environment failed.

Secret rotation is appropriate only when evidence or explicit
operational requirements justify it.

Keep security operations separate from unrelated recovery.

---

## 40. EXTERNAL INTEGRATION RECOVERY

If integration state is broken: determine whether issue lies in:
our deployment, our config, provider state, credentials,
callback registration, external outage.

Restore only the part supported by evidence.
Do not recreate external resources unnecessarily.

---

## 41. EXTERNAL PARAMETER GATE

Apply canonical External Parameter Gate.

Do NOT request: GitHub credentials, DB credentials,
cloud deployment credentials, backup access, API keys
until the recovery operation genuinely reaches that boundary.

First inspect current environment.

If missing: EXTERNAL PARAMETER BLOCKER.

Preserve: completed recovery evidence, current recovery state,
exact RESUME POINT.

Do not ask OWNER to paste secrets into chat by default.

---

## 42. TARGET VERIFICATION

For every recovery write: **TARGET NOT VERIFIED → NO WRITE.**

This includes: repository, branch, database, environment,
deployment target, external service.

Urgency does not weaken target verification.

---

## 43. MINIMUM PRIVILEGE

Use minimum capability necessary for recovery.

Do not request global admin merely because recovery is urgent.

Examples: deployment rollback capability, DB restore capability,
configuration write, read-only logs.

Use smallest sufficient scope.

---

## 44. FAILURE DURING RECOVERY

A failed recovery action creates a new factual condition.

Do NOT immediately stack another guessed recovery.

Initial: CAUSE = UNKNOWN. Reassess: current state, new risks,
remaining recovery options, need for R4, need for Owner decision.

---

## 45. NO RECOVERY CASCADE

**FAILED RECOVERY ≠ PERMISSION FOR RANDOM NEXT ACTION.**

Do not perform: rollback after rollback, repeated deploy attempts,
multiple config mutations, blind migration retries — without new evidence.

---

## 46. RECOVERY CHECKPOINTS

For high-risk recovery, use small factual checkpoints:

BEFORE ACTION STATE → ACTION → OBSERVED RESULT →
CURRENT STATE → NEXT SAFE ACTION.

Do not create bureaucratic runbook for trivial workspace recovery.

---

## 47. POST-RECOVERY VERIFICATION

Recovery is not complete when command returns success.

Verify restored factual state.

Examples: workspace matches canonical remote, service healthy,
expected release identity deployed, migration state known,
critical route works, DB connectivity correct,
critical data intact, authorization intact.

---

## 48. RECOVERY SUCCESS ≠ PERMANENT FIX

After successful recovery state:

SERVICE / CONTINUITY RESTORED may coexist with ROOT DEFECT STILL PRESENT.

Record that distinction. Next route may be: R2, R1, R4, R5, or NONE.

---

## 49. RECOVERY VERDICTS

- **RECOVERED / VERIFIED** — Trustworthy target state restored and verified.
- **RECOVERED / VERIFIED WITH NON-BLOCKING FINDINGS** — Same, with Moderate/Low findings.
- **PARTIALLY RECOVERED** — Some required trustworthy state restored but material recovery remains.
- **RECOVERY BLOCKED** — Required recovery action cannot proceed due to missing target evidence, authorization, external parameter, or dependency.
- **RECOVERY FAILED / STATE UNTRUSTED** — Recovery attempt failed and current state remains unsafe/unknown.
- **NO RECOVERY REQUIRED** — Investigation proves original state is already trustworthy.

Do NOT use "MOSTLY RECOVERED" for material unresolved uncertainty.

---

## 50. RECOVERY CLOSURE

Successful recovery closure requires: recovery subject identified,
trusted target baseline identified, recovery action completed,
post-recovery verification passed, current factual state recorded,
remaining root defect/follow-up clearly separated,
blocking uncertainty = 0 for recovered subject.

Then: **R3 RECOVERED / VERIFIED.**

---

## 51. PARTIAL RECOVERY

PARTIALLY RECOVERED is not final healthy closure when required safety
state remains unresolved.

Record exactly: what is restored, what remains untrusted,
what is blocked, next route.

---

## 52. RECOVERY BLOCKED

If action cannot proceed because: credential unavailable,
backup unavailable, target uncertain, Owner decision required,
provider unavailable, required evidence missing:

RECOVERY BLOCKED. Preserve state. Do not improvise substitute recovery.

---

## 53. POST-RECOVERY ROUTING

After R3, determine next route based on factual need.

| Situation | Route |
|----------|-------|
| Service restored, known code defect remains | R2 |
| Continuity restored, normal planned work resumes | R1 / existing authorized unit |
| State restored but root cause unknown and important | R4 |
| Factual/intended mismatch discovered | R5 |
| Governance defect discovered | R6 |
| No further action required | STOP |

---

## 54. RESUME AUTHORIZED WORK

If R3 was invoked only because execution continuity was lost:
after trusted state restoration, resume the previously authorized
unit from the correct factual checkpoint.

Do NOT require a new project lifecycle.
Do NOT restart completed canonical work unnecessarily.

---

## 55. RESUME POINT

Record exact recovery resume point.

Examples: REBUILD WP-004 FROM CANONICAL MAIN,
RESUME PR CREATION, RESUME S11 DB VERIFICATION,
RESUME S13 SMOKE CHECKS.

Do not use vague "continue where we left off."

---

## 56. STATE REVALIDATION BEFORE RESUME

Before resuming paused work: verify canonical main advancement,
verify target/environment, verify relevant artifact state,
verify previous evidence still fresh.

If materially changed: adapt route accordingly.
Do not blindly resume stale work.

---

## 57. REPOSITORY CONTINUITY AFTER RECOVERY

Material recovery facts needed for future continuation must be canonical
where project governance requires.

A fresh agent should be able to know: what state failed,
what recovery occurred, what baseline is now trusted,
what work remains — without chat history.

---

## 58. OPTIONAL RECOVERY RECORD

For material recovery events, suggested artifact:

`docs/recovery/REC-<ID>.md` or established project equivalent.

Possible structure:

```
# REC-XXX — RECOVERY
## Status
## Recovery Subject
## Observed Untrusted State
## Last Known-Good Baseline
## Evidence
## Recovery Objective
## Authorized Actions
## Actions Performed
## Verification
## Current Trusted State
## Remaining Findings
## Resume Point / Next Route
```

Do NOT require a REC file for every discarded dirty local worktree.

---

## 59. PROJECT_STATE

Where applicable, update factual project state after material recovery.

Examples: PRODUCTION_RECOVERED_TO, CURRENT_MIGRATION_STATE,
CURRENT_OPERATIONAL_STATUS, RECOVERY_RESULT,
NEXT_RECOMMENDED_ROUTE.

Do not record intended future fix as already completed.

---

## 60. S14 RELATIONSHIP

S14 owns operational factual baseline closure after production delivery.

R3 may be invoked after S13/S14 when recovery is needed.

After material production recovery: ensure factual baseline artifacts
ultimately reflect actual recovered production state.

Use S14 or project factual-state mechanism as appropriate.

Do not leave S14 claiming a release remains deployed when recovery
restored an older baseline.

---

## 61. RECOVERY AFTER S14

If a post-release incident causes production to revert after S14 closure:
the previous S14 artifact remains historical evidence.

Do NOT rewrite history as if release never existed.

Create/update current factual state through appropriate recovery/
baseline closure process.

---

## 62. AUDITABILITY

Material recovery should leave enough evidence to answer: what was
untrusted, what baseline was selected, why it was trusted,
what action occurred, what the result was, what state is trusted now,
what still remains unresolved — without exposing secrets.

---

## 63. SECURITY / PRIVACY

Do not place in recovery reports: tokens, passwords, private keys,
secret URLs, full DB connection strings, sensitive production records.

Use: redacted identifiers, counts, state descriptions, safe references.

---

## 64. NO AUTOMATIC CLEANUP

Recovery must not automatically trigger: branch cleanup,
dependency cleanup, secret rotation, technical debt cleanup,
postmortem, refactor, new feature work.

Only perform work required to restore trustworthy state.

---

## 65. NO AUTOMATIC POSTMORTEM

R3 may recommend later investigation/retrospective.
It must not create mandatory postmortem work automatically.

If root cause is important and unknown: route R4.

---

## 66. GIT / PR WORKFLOW FOR RECOVERY CODE

If R3 itself requires repository-tracked corrective changes:
use canonical workflow: branch → commit → push → PR → actual CI → merge.

But many R3 actions may be operational restoration with no code change.
Do not invent a code commit merely to prove recovery occurred.

---

## 67. DIRECT MAIN WRITE

Default: **DIRECT MAIN WRITE PROHIBITED.**

Missing PR capability ≠ permission to bypass.

If emergency repository recovery truly requires exceptional history
operation: it must be explicitly authorized separately.

R3 does not create generic direct-main authority.

---

## 68. OWNER INTERRUPTION POLICY

Within a bounded authorized recovery envelope, proceed autonomously
through safe mechanical recovery steps.

Escalate for genuine decision gates: uncertain recovery target,
destructive DB restore, potential data-loss decision,
unsafe rollback choice, history rewrite, material scope expansion,
unknown cause blocking safe recovery,
production write without existing authorization,
external parameter blocker.

Do not ask for ceremonial GO at every read-only check.

---

## 69. PRODUCTION RECOVERY HARD GATE

Recovery from an already-authorized failed S13 deployment may use the
pre-authorized S12/S13 recovery procedure when governance explicitly
covers it.

Otherwise: production write requires explicit operational authorization.

Do NOT interpret "GO R3" as blanket permission to alter arbitrary
production state.

---

## 70. ZERO SCHEDULED WORK

R3 must not create: scheduled recovery retries,
periodic environment reconciliation, automatic rollback watcher,
background health monitor, recurring DB checks,
nightly repository repair, automatic recovery workflow —
unless OWNER explicitly authorizes exact automation.

---

## 71. R3 ROUTE OUTPUT

Before material recovery, agent should be able to state:

```
ROUTE                    R3 RECOVERY
RECOVERY SUBJECT         <subject>
OBSERVED STATE           <facts>
TRUST CLASSIFICATION     TRUSTED / PARTIALLY TRUSTED / UNTRUSTED / UNKNOWN
LAST KNOWN-GOOD BASELINE <identity>
EVIDENCE                 <summary>
RECOVERY OBJECTIVE       <state to restore>
AUTHORIZED BOUNDARY      <scope>
RECOVERY MECHANISM       <mechanism>
DESTRUCTIVE RISK         <none/low/material>
EXTERNAL PARAMETER BLOCKERS  <0/list>
TARGET VERIFIED          YES / NO
POST-RECOVERY VERIFICATION  <method>
RESUME POINT / NEXT ROUTE  <value>
```

---

## 72. VALIDATION SCENARIOS

---

### R3-01 — LOST UNPUSHED LOCAL WORK

Local implementation disappeared. Continuity cannot be trusted.

Expected: UNPUSHED LOCAL WORK NON-CANONICAL. Fresh canonical base.
Rebuild authorized unit. No archaeology by default. **PASS**

---

### R3-02 — OWNER AUTHORIZES SALVAGE

Local work known and Owner explicitly requests salvage.

Expected: bounded salvage allowed. Verify before canonicalization. **PASS**

---

### R3-03 — DIRTY UNKNOWN WORKTREE

Unexpected changes in worktree.

Expected: do not delete blindly. Classify. Prefer fresh worktree if
continuity untrusted. **PASS**

---

### R3-04 — WRONG REPOSITORY

Agent discovers work occurred in unrelated repo.

Expected: STOP writes. Verify canonical repo. Do not transplant unknown
changes automatically. **PASS**

---

### R3-05 — ORIGIN MAIN ADVANCED

Recovery resumes after blocker. main advanced.

Expected: check material compatibility. No blind continuation or reset. **PASS**

---

### R3-06 — BROKEN LOCAL CLONE

Canonical remote is healthy. Local .git/worktree corrupted.

Expected: fresh clone preferred. **PASS**

---

### R3-07 — REMOTE HISTORY SUSPECT

Canonical remote appears damaged.

Expected: no force-push automatically. Escalate with evidence. **PASS**

---

### R3-08 — WRONG BUILD ARTIFACT

Artifact identity cannot be linked to source.

Expected: rebuild from exact trusted source. Do not deploy unknown artifact. **PASS**

---

### R3-09 — PREVIEW ENVIRONMENT BROKEN

Preview can be safely recreated from canonical deployment mechanism.

Expected: recreate/redeploy canonical state. No unnecessary new infrastructure. **PASS**

---

### R3-10 — PRODUCTION BAD RELEASE

New deployment broken. Previous baseline known-good and compatible.

Expected: safe recovery may restore previous baseline.
Permanent fix separate. **PASS**

---

### R3-11 — OLD APP / NEW DB INCOMPATIBLE

Migration applied. Old app cannot safely use new schema.

Expected: do not blindly rollback app. Choose safe recovery based on
factual DB state. **PASS**

---

### R3-12 — PARTIAL MIGRATION

Migration command failed after some effects applied.

Expected: determine actual state. No blind rerun. **PASS**

---

### R3-13 — MIGRATION STATE UNKNOWN

No reliable evidence whether migration completed.

Expected: UNKNOWN → INVESTIGATE. No destructive action. **PASS**

---

### R3-14 — DATABASE RESTORE

Known backup exists but restoring loses recent valid data.

Expected: do not restore blindly. Assess data-loss
implications/authorization. **PASS**

---

### R3-15 — CONFIG DEFECT

Wrong production value proven. Known-good value authoritative.

Expected: bounded config recovery may restore value when authorized.
Verify result. **PASS**

---

### R3-16 — SECRET MISSING

Recovery reaches legitimate external credential boundary.

Expected: External Parameter Blocker. No premature credential request. **PASS**

---

### R3-17 — TARGET UNKNOWN

Valid DB credential exists but database identity unverified.

Expected: TARGET NOT VERIFIED → NO WRITE. **PASS**

---

### R3-18 — FAILED RECOVERY

First recovery action fails.

Expected: CAUSE UNKNOWN. Reassess. No random second action. **PASS**

---

### R3-19 — SERVICE RESTORED / BUG REMAINS

Previous release restored successfully. Original defect in new release
still exists.

Expected: R3 RECOVERED / VERIFIED. Permanent correction routes R2/R1. **PASS**

---

### R3-20 — ROOT CAUSE UNKNOWN

Service restored but cause of incident remains materially important.

Expected: R4 may be next recommended route.
Do not investigate indefinitely inside R3. **PASS**

---

### R3-21 — RECOVERY PARTIAL

App reachable but migration state remains untrusted.

Expected: PARTIALLY RECOVERED / not final healthy closure. **PASS**

---

### R3-22 — S13 FAILED / UNRECOVERED

Production remains broken after deployment failure.

Expected: R3 appropriate. Restore trusted state before normal lifecycle
continues. **PASS**

---

### R3-23 — WRONG RELEASE DEPLOYED

Actual artifact differs from intended RC.

Expected: identify actual state first. Recover safely.
Do not simply deploy another artifact without compatibility check. **PASS**

---

### R3-24 — DIRECT MAIN BYPASS

PR creation fails during recovery-related repository change.

Expected: CAUSE UNKNOWN / External Parameter Gate.
No direct main bypass. **PASS**

---

### R3-25 — NO RECOVERY REQUIRED

Investigation shows suspected corruption was false alarm and state is
already trustworthy.

Expected: NO RECOVERY REQUIRED. Do not mutate state unnecessarily. **PASS**

---

### R3-26 — RECOVERY COMPLETED

Known-good state restored. Post-recovery verification passes.
Current factual baseline known.

Expected: RECOVERED / VERIFIED. Record resume point / next route. STOP. **PASS**

---

### R3-27 — SCHEDULED RECOVERY MONITOR

Agent proposes hourly consistency reconciliation.

Expected: PROHIBITED absent explicit automation authorization. **PASS**

---

## 73. ANTI-DESTRUCTIVE-RECOVERY GATE

Verify R3 does NOT automatically:

- salvage untrusted local work
- reconstruct from chat memory
- perform reflog archaeology
- force-push canonical branches
- rewrite remote history
- select latest instead of known-good
- blindly rollback
- blindly rerun migration
- run ad-hoc DB surgery
- restore backup without data-loss analysis
- guess configuration
- rotate unrelated secrets
- request credentials prematurely
- write unverified target
- stack failed recovery actions
- confuse recovery with permanent fix
- perform code hotfix inside R3 automatically
- create new infrastructure unnecessarily
- create postmortem automatically
- start R4/R2/R1 automatically
- create scheduled monitoring

**ALL PASS**

---

## 74. RECOVERY QUALITY GATE

Before actual R3 may report RECOVERED / VERIFIED:

| Gate | Requirement |
|------|-------------|
| RECOVERY SUBJECT | IDENTIFIED |
| OBSERVED STATE | FACTUAL |
| TRUST CLASSIFICATION | KNOWN |
| LAST KNOWN-GOOD BASELINE | VERIFIED |
| RECOVERY TARGET | EXACT |
| RECOVERY MECHANISM | JUSTIFIED |
| DESTRUCTIVE RISK | UNDERSTOOD |
| TARGET | VERIFIED for writes |
| REQUIRED AUTHORIZATION | AVAILABLE |
| EXTERNAL PARAMETER BLOCKERS | 0 before required action |
| RECOVERY ACTION | COMPLETED |
| POST-RECOVERY VERIFICATION | PASS |
| CURRENT FACTUAL STATE | KNOWN |
| MIGRATION STATE | KNOWN / N/A |
| CRITICAL DATA RISK | 0 unresolved |
| UNTRUSTED MATERIAL STATE | 0 for recovered subject |
| UNAUTHORIZED HISTORY REWRITE | 0 |
| UNAUTHORIZED PROD ACTION | 0 |
| UNAUTHORIZED AUTOMATION | 0 |
| RESUME POINT / NEXT ROUTE | RECORDED |

---

## 75. SIZE / USABILITY

Keep R3 comprehensive but operational.

Target approximately 3500–4700 words. Clarity wins over arbitrary word count.

Avoid: disaster-recovery encyclopedia, generic SRE incident manual,
mandatory backup system design, mandatory forensics,
mandatory postmortem, mandatory environment recreation,
enterprise recovery bureaucracy.

---

## 76. MINIMAL AISE INTEGRATION UPDATES

After standalone R3 exists, make only minimal updates to:

- **S0** — Add minimal pointer to R3 file. Do NOT rewrite S0.
- **S2** — Update RECOVERY route to R3 file. Do NOT implement R4-R7.
- **R1/R2** — If stale R3 availability reference, update route/path only.
- **S14** — If references R3 as planned/unavailable, update minimally.
- **AISE_ROADMAP** — Change R3 PLANNED to CLOSED / PASS / CANONICAL.
- **S3** — Add R3 minimally to manifest guidance if list stops at R2.

Other files unchanged unless demonstrably stale reference requires minimal
correction.

---

## 77. DO NOT APPLY R3 TO DANIELOU

STRICTLY DO NOT MODIFY: Daniélou application code, PROJECT_STATE,
WS contracts, DELIVERY_ROADMAP, PRODUCT_REQUIREMENTS,
TECHNICAL_SPECIFICATION, PROJECT_MANIFEST, ADRs, tests, fixtures,
schema, migrations, deployment configuration, Vercel, Neon, production,
actual recovery artifacts.

This task defines universal R3 only.

---

## 78. DIFF GATE

Expected:

- **NEW**: `docs/engineering/AISE_RECOVERY_PROTOCOL.md`
- **MINIMAL**: S0, S2, AISE_ROADMAP
- **OPTIONAL MINIMAL**: R1, R2, S14, S3

Other files unchanged. Application code strictly unchanged.

---

## 79. ZERO SCHEDULED WORK

CRON CREATED: NO
SCHEDULED TASK CREATED: NO
BACKGROUND AI MONITORING CREATED: NO
AUTOMATIC RECOVERY CREATED: NO
PRODUCTION ACTION: NO
