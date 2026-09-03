# AISE — RELEASE READINESS / PREPRODUCTION (S12)

**Authority:** Subordinate to S0 (AI Software Engineering OS).
Reads from S5 (Product Requirements), S6 (Technical Specification),
S7 (Project Manifest + ADR), S8 (Roadmap / Milestone Design),
S9 (Module Contract / Work Package), S10 (Implementation Execution),
S11 (Verification & Acceptance).

**Status:** ACTIVE PILOT

---

## 1. PURPOSE

S12 answers:

**IS THE VERIFIED RELEASE BASELINE READY TO BECOME THE PRODUCTION
CANDIDATE?**

S12 consumes:

- VERIFIED S11 WORK PACKAGES
- CLOSED REQUIRED MILESTONES
- APPROVED RELEASE SCOPE
- EXACT IMPLEMENTATION BASELINE
- MIGRATION STATE
- CONFIGURATION REQUIREMENTS
- EXTERNAL DEPENDENCY READINESS
- PREPRODUCTION EVIDENCE (where applicable)
- KNOWN FINDINGS / RISKS

and produces:

- AN EXACT RELEASE CANDIDATE
- A RELEASE READINESS VERDICT
- A CONTROLLED S13 HANDOFF

---

## 2. S11 VS S12

Freeze:

- **S11 asks:** DOES THE IMPLEMENTED UNIT CONFORM TO ITS CONTRACT?
- **S12 asks:** IS THE COMPLETE VERIFIED RELEASE BASELINE OPERATIONALLY
  READY FOR RELEASE?

Therefore: **WP CLOSED / PASS ≠ RELEASE READY.**

All individual features may pass while release readiness still fails
because of: missing migration readiness, wrong configuration,
incomplete milestone coverage, unavailable dependency, unverified
preproduction target, incompatible components, missing recovery
strategy, or release baseline drift.

---

## 3. S12 VS S13

Freeze:

- **S12 PREPARES AND PROVES READINESS.**
- **S13 PERFORMS PRODUCTION DEPLOYMENT AND PRODUCTION VERIFICATION.**

S12 MUST NOT: deploy production, run production migrations, change
production configuration, publish production DNS/routing, or
authorize production implicitly.

Canonical rule: **S12 PASS ≠ PRODUCTION AUTHORIZED.**

S13 requires explicit: **OWNER PROD GO.**

---

## 4. RELEASE CANDIDATE CONCEPT

**RELEASE CANDIDATE = THE EXACT VERIFIED BASELINE PROPOSED FOR
PRODUCTION.**

Identify it using the strongest applicable immutable identity:
commit SHA, release branch + immutable commit, tag + commit,
build artifact digest, container digest, deployment artifact version,
migration set.

Do not rely only on: "latest main", "current branch", "latest
build", or "the code we tested."

---

## 5. RELEASE CANDIDATE IMMUTABILITY

A S12 PASS applies only to the exact Release Candidate evaluated.

If code, dependency lockfile, migration, runtime config contract, or
release artifact changes materially after S12 PASS:

**READINESS MAY BE STALE.** Determine affected verification.
Required path may be: S10 correction → S11 affected verification →
S12 readiness again.

Do NOT transfer S12 PASS blindly to another commit/artifact.

---

## 6. ENTRY PRECONDITION

Normal S12 entry requires:

- RELEASE SCOPE: IDENTIFIED
- REQUIRED S8 MILESTONES: IDENTIFIED
- REQUIRED WORK PACKAGES: CLOSED / PASS under S11
- RELEASE BLOCKING S11 FINDINGS: 0 unresolved
- IMPLEMENTATION BASELINE: IDENTIFIED
- RELEVANT MIGRATION SET: IDENTIFIED
- DEPLOYMENT TARGET CLASS: KNOWN
- BLOCKING PRODUCT AMBIGUITIES: 0
- BLOCKING TECHNICAL AMBIGUITIES: 0

If required milestone/release coverage is incomplete:
**S12 PRECONDITION NOT MET.** Return to delivery cycle.
Do NOT manufacture a smaller release scope unless OWNER/project
governance explicitly authorizes that scope change.

---

## 7. RELEASE SCOPE

S12 must establish exactly WHAT belongs to this release. Record where
applicable: release ID, release objective, requirements included,
milestones included, work packages included, deferred requirements,
known exclusions, database migrations, configuration changes,
external integration changes, deployment artifacts.

Do not infer release scope from every file changed since last
release.

---

## 8. RELEASE TRACEABILITY

Provide compact traceability:

```
S5 requirement → S8 milestone → S9 WP → S11 verdict → Release Candidate
```

Detect: UNVERIFIED RELEASE ITEM, RELEASE ITEM WITHOUT SOURCE,
REQUIRED MILESTONE NOT CLOSED.

Do not create huge matrices when a compact mapping is sufficient.

---

## 9. RELEASE COMPLETENESS

Before readiness PASS verify:

- all release-blocking requirements covered
- all required milestones closed
- all required WPs S11 PASS
- all required migrations identified
- all required config identified
- all required external dependencies identified
- all known blockers classified

No silent "we will finish after deployment."

---

## 10. RELEASE BASELINE VERIFICATION

Record exact factual baseline: canonical repository, base/main SHA,
Release Candidate SHA/artifact, dependency lock state, migration
identifiers, build identity, target environment identity, relevant
external service versions/config assumptions.

Only record what is materially needed. Do not inventory the universe.

---

## 11. BUILD / ARTIFACT READINESS

Where the project produces a build artifact verify:

- build succeeds
- artifact corresponds to Release Candidate
- artifact is reproducible enough for project needs
- artifact identity is known
- no stale artifact from different commit is used

If deployment platform builds from source: verify deployment source
points to exact intended baseline.

---

## 12. QUALITY GATE AGGREGATION

S12 consumes evidence from S11/CI. Verify that applicable
release-level gates are satisfied.

Possible gates: typecheck, lint, unit tests, integration tests, DB
tests, build, E2E, migration verification, contract tests, security
checks already required by project.

Do NOT invent generic gates. Do NOT rerun everything merely for
ritual. Rerun when: evidence is stale, release aggregation changes
relevant interactions, or environment-level behavior must be proven.

---

## 13. CROSS-WORK-PACKAGE INTEGRATION

Individual WPs may pass independently but conflict when combined.
S12 must verify material release-level integration risks.

Examples: schema and application version compatibility, shared
permission behavior, navigation/routing, configuration collisions,
dependency incompatibility, feature interactions.

Do not create exhaustive integration campaign without evidence.
Verify material seams.

---

## 14. PREPRODUCTION PURPOSE

Preproduction is used to prove that the Release Candidate can operate
in a production-like NON-PRODUCTION environment where the project
supports one.

S12 may include: deploy to approved preview/staging/preproduction,
apply approved non-production migration, verify runtime configuration,
exercise critical flows, verify integration boundaries, observe
startup/runtime failures.

**It is still NOT production.**

---

## 15. PREPRODUCTION OPTIONALITY

Do not require a dedicated staging environment universally. For small
projects, an existing isolated Preview/Test environment may serve as
the preproduction verification target when sufficient.

Canonical principle: **USE THE SIMPLEST EXISTING NON-PRODUCTION
ENVIRONMENT THAT CAN PROVIDE TRUSTWORTHY RELEASE EVIDENCE.**

Do NOT create new infrastructure merely because S12 exists.

---

## 16. PREPRODUCTION TARGET VERIFICATION

Before any non-production write/deployment verify: environment
identity, project/service identity, database identity, deployment
target, branch/artifact source, intended purpose.

Preserve: **TARGET NOT VERIFIED → NO WRITE.**

A credential existing ≠ target verified.

---

## 17. EXTERNAL PARAMETER GATE

Apply canonical External Parameter Gate (S0 §25).

Do NOT request: GitHub credentials, Vercel credentials, Neon
credentials, API keys, or other service secrets — until an
authorized S12 operation actually reaches that external boundary.

First inspect whether valid capability already exists.

If missing: **EXTERNAL PARAMETER BLOCKER.** Return canonical
structured blocker report with: SYSTEM, BLOCKED OPERATION,
PARAMETER/CAPABILITY, CATEGORY, PURPOSE, SECRET YES/NO, EXPECTED
LOCATION, REQUIRED SCOPE, TARGET, WHY REQUIRED NOW, CURRENT
COMPLETED STATE, RESUME POINT, OWNER ACTION.

Do NOT request secret pasted into chat by default.

---

## 18. CONFIGURATION READINESS

Identify configuration required by the Release Candidate. Classify
materially relevant values: required, optional, environment-specific,
secret, non-secret, runtime, build-time.

Do NOT document secret values. Verify: required key exists where
needed, wrong/default value is not silently accepted,
environment-specific config targets correct service.

Do not create giant environment-variable inventory.

---

## 19. CONFIGURATION CONTRACT

Where configuration materially changes behavior, treat it as part of
the release.

Examples: feature toggle required for feature, auth callback URL,
database connection target, external API endpoint, runtime mode,
business-critical threshold if deployment-managed.

S12 must ensure the deployed candidate will receive the intended
configuration.

---

## 20. DATABASE MIGRATION READINESS

Where release includes database change verify:

- canonical migration files exist
- migration order known
- migration corresponds to intended schema
- migration has been tested in approved non-production DB where
  required
- data-preservation expectations verified
- application/migration compatibility known
- required migration mechanism known

No manual ad-hoc schema edits.

---

## 21. MIGRATION FORWARD COMPATIBILITY

Where deployment ordering matters determine: migration-before-code,
code-before-migration, compatible rolling sequence, single atomic
deployment, or other approved sequence.

Do not invent zero-downtime complexity unless required. The release
procedure must not leave a known incompatible intermediate state.

---

## 22. DATA PRESERVATION READINESS

For data-affecting releases verify relevant: existing data preserved,
required backfill behavior, new nullability/constraints safe, critical
historical records retained, audit semantics preserved.

Only what the release materially affects. Do not turn S12 into
generic data audit.

---

## 23. BACKUP / RECOVERY READINESS

Before production deployment, S12 must know what happens if S13 fails.
Use proportionate recovery strategy.

Possible examples: platform rollback to previous deployment,
application version rollback, forward-fix, database restore
capability, migration-specific recovery, feature disablement if
contractually available.

Do NOT promise rollback where migration/data semantics make rollback
unsafe.

---

## 24. ROLLBACK VS RECOVERY

Freeze distinction:

- **ROLLBACK** = return to previous deployable state.
- **RECOVERY** = restore service/correctness through the safest
  approved mechanism.

Some releases cannot safely perform full DB rollback. In such cases
S12 must document the actual recovery approach rather than inventing a
fake rollback plan.

---

## 25. RECOVERY TRIGGER

Define material S13 failure triggers where applicable.

Examples: application fails startup, critical route unavailable,
database migration fails, critical calculation corrupt, authorization
boundary broken, major integration unusable.

Do not create an enormous incident playbook. S12 only needs enough
release-specific recovery guidance for S13.

---

## 26. EXTERNAL DEPENDENCY READINESS

For external systems required by release verify relevant:
provider/system identified, environment identified,
credentials/capability available or known blocker, endpoint/configuration
correct, required sandbox/preprod behavior verified, known breaking
change absent.

Do not audit unrelated providers.

---

## 27. THIRD-PARTY AVAILABILITY

S12 does NOT guarantee an external provider will never fail. It
verifies: the release dependency is intentionally configured, required
contract is understood, critical expected behavior was verified where
practical, failure semantics are known where contracted.

Do not create unnecessary monitoring systems.

---

## 28. AUTHENTICATION / AUTHORIZATION READINESS

Where release changes access control verify release-level coherence:
critical roles still work, forbidden paths remain forbidden,
bootstrap/break-glass semantics remain correct, deployment/config does
not bypass authorization.

For projects with Fantomas/Ghost: preserve frozen semantics exactly.
No generic security audit required unless release risk requires it.

---

## 29. FANTOMAS / GHOST READINESS

Where applicable verify:

- Fantomas remains highest privileged principal
- inherits 100% SUPER_ADMIN capabilities
- Fantomas-specific break-glass/bootstrap/recovery remains intact
- hasSuperAdminCapabilities(principal) remains distinct from
  isFantomas(principal)

Do not alter these semantics during release preparation.

---

## 30. CRITICAL USER JOURNEY READINESS

In preproduction verify only critical release-relevant journeys.

Examples: authentication, primary business workflow, critical
calculation, write/read persistence, key authorization path,
important export/integration.

Do not re-test every UI screen if S11 already provided adequate
evidence.

---

## 31. SMOKE TEST CONTRACT

S12 should define the production smoke checks S13 will execute.
**S12 DOES NOT execute them in production.**

Define a small set of high-value checks: service reachable,
authentication works, critical route works, database connectivity
works, critical read works, critical safe write works if production
verification policy allows, key integration reachable where essential.

These become part of S13 handoff.

---

## 32. OBSERVABILITY READINESS

S12 verifies that material release failures can be detected using the
project's existing mechanisms.

Examples: deployment status, application error logs, platform logs,
health endpoint, existing dashboards, DB migration result.

Do NOT create new observability infrastructure automatically. If the
current release has no way to determine success/failure for a critical
operation: classify material readiness gap.

---

## 33. KNOWN FINDINGS

Aggregate known release-relevant findings from S11. Classify:
CRITICAL, HIGH, MODERATE, LOW.

Critical/material High blockers: must be resolved or governed before
readiness PASS. Moderate/Low: may remain non-blocking if they do not
violate approved release requirements.

Do not reopen unrelated backlog.

---

## 34. RESIDUAL RISK

S12 may record material residual risk. Examples: provider limitation,
non-blocking performance concern, known cosmetic issue, manual
operational constraint.

Residual risk documentation does NOT override failed requirements.
No silent waiver.

---

## 35. WAIVER / EXCEPTION

S12 must not convert a failed requirement into readiness PASS itself.
If release authority accepts a material exception: record explicit
governance decision. Determine whether it requires: scope change,
contract change, risk acceptance, deferment, release exclusion, or
OWNER decision.

Do not silently redefine PASS.

---

## 36. RELEASE READINESS VERDICTS

Define:

- **READY** — All release-blocking readiness conditions satisfied.
- **READY WITH NON-BLOCKING FINDINGS** — All release-blocking
  conditions satisfied. Only Moderate/Low non-blocking observations
  remain.
- **NOT READY** — One or more required readiness conditions fail.
- **BLOCKED** — Readiness evaluation cannot complete because required
  environment, artifact, dependency, external parameter, or evidence
  is unavailable.

Do NOT use vague: "MOSTLY READY."

---

## 37. READINESS DOES NOT AUTHORIZE PROD

Even if verdict is READY or READY WITH NON-BLOCKING FINDINGS:
**S13 remains NOT AUTHORIZED until OWNER PROD GO.**

Required wording:

```
RELEASE READY
PRODUCTION NOT AUTHORIZED
```

---

## 38. RELEASE READINESS MATRIX

Use a compact matrix where useful:

| Area | Required State | Evidence | Result | Blocking? |
|------|---------------|----------|--------|-----------|

Potential rows: scope, milestones, S11 verification, build/artifact,
database/migrations, configuration, external dependencies,
preproduction, critical journeys, recovery, known findings.

Do not create matrix rows for irrelevant categories.

---

## 39. PREPRODUCTION EVIDENCE

Where preproduction execution is applicable record: target
environment, Release Candidate identity, deployment result, migration
result, configuration verification, critical flows, integration
evidence, runtime observations, known discrepancies.

Do not copy sensitive logs into documentation.

---

## 40. PREPRODUCTION FAILURE

If Release Candidate fails preproduction: **READINESS NOT READY** or
**BLOCKED** depending cause.

Classify: IMPLEMENTATION DEFECT, CONFIGURATION DEFECT, MIGRATION
DEFECT, ENVIRONMENT / INFRA DEFECT, EXTERNAL DEPENDENCY DEFECT,
EXTERNAL PARAMETER BLOCKER, SPECIFICATION AMBIGUITY, UNKNOWN.

UNKNOWN → INVESTIGATE. Do not patch production path directly.

---

## 41. NO REPAIR INSIDE READINESS BY DEFAULT

S12 evaluates release readiness. It must not silently modify
application implementation to obtain READY.

If implementation defect found: route corrective work. Typical: S10
correction → S11 verification → S12 readiness again.

Configuration-only correction may be allowed within S12 when:
configuration is part of S12 scope, target is non-production,
contract remains unchanged, the correction is not hiding
implementation defect.

---

## 42. EVIDENCE FRESHNESS

Release evidence must correspond to the current Release Candidate.
If candidate changes materially: determine affected evidence. Re-run
only what became stale. Do NOT restart entire release process
mechanically.

---

## 43. RELEASE CANDIDATE DRIFT

Detect **RC DRIFT** when candidate tested in S12 differs from
candidate proposed to S13.

Examples: new commit, new migration, lockfile change, build artifact
change, environment-critical configuration change.

If material: **S12 READY status is no longer automatically valid.**

---

## 44. CHANGE FREEZE SEMANTICS

S12 does NOT require bureaucratic global development freeze. It
requires: **THE RELEASE CANDIDATE ITSELF REMAINS IDENTIFIABLE.**

Other development may continue elsewhere if project workflow supports
it. Do not confuse release candidate immutability with entire
repository development freeze.

---

## 45. PREPRODUCTION DATA

Use test/preproduction data appropriate to verify the release. Do NOT
copy sensitive production data casually. If representative data is
required: use approved anonymized/synthetic/test data or legitimate
project mechanism. Do not turn this into a generic privacy program.

---

## 46. PRODUCTION CONFIG PRECHECK

S12 may verify production configuration REQUIREMENTS without changing
production. Examples: required variable names known, production target
known, required provider linkage known, migration requirements known,
deployment permission requirement known.

Do NOT retrieve/display secret values unnecessarily. Do NOT write
production config.

---

## 47. PRODUCTION TARGET PRECHECK

S12 may identify the intended production target. It may verify
non-destructive identity where project workflow allows. But:
**PRODUCTION WRITE — NO.** S13 performs write/deploy after OWNER
PROD GO.

---

## 48. RELEASE PROCEDURE

S12 should produce the minimum sufficient S13 procedure.

Example:

1. verify production target
2. verify exact RC
3. verify OWNER PROD GO
4. apply required deployment order
5. execute migration if authorized
6. deploy exact RC
7. run smoke checks
8. run critical production verification
9. assess result
10. PASS or initiate recovery

Do not write a 100-step runbook for simple deployment.

---

## 49. DEPLOYMENT ORDER

If order matters, record it explicitly. Examples: migration → app,
app → migration, config → app, external service setup → app.

No assumption. Approved architecture and tested preproduction sequence
win.

---

## 50. RECOVERY PROCEDURE

S12 handoff should state: what previous known-good state is, what
failure conditions trigger recovery, what recovery mechanism is valid,
whether DB rollback is safe, what evidence is needed after recovery,
when S13 must stop and route R3 Recovery.

Do not invent impossible rollback.

---

## 51. RELEASE READINESS ARTIFACT

For actual projects, default durable artifact:

```
docs/release/RC-<ID>_READINESS.md
```

or established project equivalent.

Recommended structure:

```
# RELEASE READINESS — RC-XXX

## 1. Status
   Release ID, Readiness verdict, Candidate commit/artifact,
   Target class, Date/context

## 2. Release Scope
## 3. Requirement / Milestone Coverage
## 4. Verified Work Packages
## 5. Candidate Baseline
## 6. Quality Gates
## 7. Build / Artifact
## 8. Configuration Readiness
## 9. Database / Migration Readiness
## 10. External Dependencies
## 11. Preproduction Verification
## 12. Critical Journeys
## 13. Known Findings / Residual Risk
## 14. Recovery Readiness
## 15. Production Preconditions
## 16. S13 Procedure
## 17. Final Readiness Verdict
## 18. OWNER PROD GO Status
```

At S12 closure: **OWNER PROD GO — NOT YET GIVEN** unless separately
provided for S13.

---

## 52. S12 PROJECT_STATE IMPACT

For actual project execution, factual project state may record:
release candidate ID, candidate commit/artifact, S12 verdict,
preproduction environment used, migration readiness, known blockers,
next route.

Do NOT record: PRODUCTION DEPLOYED before S13.

---

## 53. S12 SUCCESS STATE

At successful actual S12:

- RELEASE CANDIDATE: IDENTIFIED / IMMUTABLE ENOUGH
- RELEASE COVERAGE: COMPLETE
- S11 BLOCKING ITEMS: 0
- APPLICABLE RELEASE GATES: PASS
- MIGRATION READINESS: PASS / N/A
- CONFIGURATION READINESS: PASS
- EXTERNAL DEPENDENCY READINESS: PASS / justified N/A
- PREPRODUCTION: PASS / justified N/A
- RECOVERY READINESS: DEFINED
- PRODUCTION SMOKE CONTRACT: DEFINED
- READINESS: READY or READY WITH NON-BLOCKING FINDINGS
- PRODUCTION: NOT AUTHORIZED

---

## 54. S13 ENTRY CONTRACT

S13 may become eligible only when:

- S12: READY / READY WITH NON-BLOCKING FINDINGS
- EXACT RC: IDENTIFIED
- PRODUCTION TARGET: IDENTIFIED
- DEPLOYMENT PROCEDURE: DEFINED
- RECOVERY PROCEDURE: DEFINED
- PRODUCTION SMOKE CHECKS: DEFINED
- BLOCKING FINDINGS: 0

Then: S13 NEXT RECOMMENDED COMPONENT. But still:
**OWNER PROD GO REQUIRED.**

---

## 55. OWNER PROD GO

Freeze: **OWNER PROD GO must be explicit.**

Examples that ARE NOT PROD GO: "continue", "go", "merge", "looks
good", "CI passed", "S12 passed", "proceed autonomously", "finish the
project" — unless the project governance has an explicit exact
phrase/authorization contract proving production authorization.

Preferred explicit authorization: **OWNER PROD GO** or clearly
equivalent statement specifically authorizing production deployment of
the identified Release Candidate.

---

## 56. S13 HANDOFF

S12 hands off: Release Candidate ID, exact commit/artifact, release
scope, verified milestone/WP set, S11 evidence references, quality
gates, preproduction evidence, migration sequence, configuration
requirements, external dependency state, production target identity,
deployment order, smoke checks, recovery procedure, known
non-blocking findings, residual risks, OWNER PROD GO status — to:

**S13 — PRODUCTION DEPLOYMENT & VERIFICATION**

---

## 57. ZERO SCHEDULED WORK

S12 must NOT create: cron, scheduled release checks, scheduled
deployment, background AI monitoring, periodic readiness audits,
automatic production promotion, GitHub scheduled deployment, Vercel
Cron — unless OWNER explicitly authorizes the exact automation.

Readiness automation ≠ authorization for recurring work.

---

## 58. NO AUTOMATIC PROMOTION

Freeze: **PREPRODUCTION PASS MUST NOT AUTOMATICALLY PROMOTE TO
PRODUCTION.**

Do not configure: auto-promote, scheduled production release,
merge-to-production side effect, automatic DB migration to production
— unless explicitly authorized as project architecture/governance.

---

## 59. VALIDATION SCENARIOS

Validate S12 deterministically.

**S12-01 — ALL WPS PASS, MILESTONE INCOMPLETE**
All current WPs pass S11. One required milestone item remains.
→ S12 PRECONDITION NOT MET. Return to delivery. **PASS**

**S12-02 — RELEASE SCOPE AMBIGUOUS**
No exact release scope identified.
→ NOT READY / precondition failure. Do not assume all current main
changes belong to release. **PASS**

**S12-03 — STALE BUILD**
S11 verified commit A. Deployment artifact was built from commit B.
→ NOT READY. Exact RC mismatch. **PASS**

**S12-04 — CI GREEN / MIGRATION UNVERIFIED**
All CI checks green. Release contains migration never tested on
representative non-prod DB.
→ NOT READY where migration verification is required. CI does not
override migration readiness. **PASS**

**S12-05 — PREPROD TARGET UNKNOWN**
Deployment credential exists. Actual preproduction target identity
unknown.
→ TARGET NOT VERIFIED → NO WRITE. **PASS**

**S12-06 — EXTERNAL PARAMETER MISSING**
Preproduction deployment reaches Vercel/DB/API credential boundary.
→ EXTERNAL PARAMETER BLOCKER. Preserve completed readiness work and
RESUME POINT. **PASS**

**S12-07 — SECRET ALREADY CONFIGURED**
Valid authenticated mechanism exists.
→ verify target/scope and continue. Do not ask OWNER for underlying
secret. **PASS**

**S12-08 — INDIVIDUAL WPS PASS / INTEGRATION FAILS**
Two verified WPs conflict when combined.
→ NOT READY. Route corrective work. **PASS**

**S12-09 — CONFIGURATION MISSING**
Release requires runtime variable. Candidate code is correct.
Preproduction lacks required config.
→ CONFIGURATION DEFECT / NOT READY or BLOCKED as appropriate. Do not
modify code to hide missing config. **PASS**

**S12-10 — UNSAFE DATABASE ROLLBACK**
Migration removes/changes data in a way that cannot safely be
reversed.
→ do NOT promise rollback. Define truthful recovery/forward-fix
strategy. **PASS**

**S12-11 — MODERATE FINDING**
All readiness requirements pass. One Moderate non-contractual issue
exists.
→ READY WITH NON-BLOCKING FINDINGS may be valid. **PASS**

**S12-12 — MATERIAL HIGH BLOCKER**
Critical provider or data-integrity readiness issue remains.
→ NOT READY. No automatic waiver. **PASS**

**S12-13 — PREPRODUCTION PASS**
Exact RC deployed to verified non-prod target. Critical flows pass.
→ readiness evidence accepted. Still: PRODUCTION NOT AUTHORIZED.
**PASS**

**S12-14 — RC CHANGED AFTER PASS**
S12 READY on commit A. New commit B added.
→ determine stale evidence. Do not transfer READY blindly. **PASS**

**S12-15 — PRODUCTION CONFIG CHANGE**
Agent proposes fixing production env variable during S12.
→ PROHIBITED. S12 may document production config requirement.
S13/authorized operational route performs production write. **PASS**

**S12-16 — AUTO PROMOTION**
Agent proposes deploying production immediately after preprod PASS.
→ PROHIBITED. OWNER PROD GO required. **PASS**

**S12-17 — NO DEDICATED STAGING**
Small project has isolated Preview environment sufficient for release
evidence.
→ Preview may serve S12. Do not create staging infrastructure
unnecessarily. **PASS**

**S12-18 — UNRELATED BACKLOG**
Low-priority technical debt exists.
→ record if relevant. Do not block release automatically. **PASS**

**S12-19 — WRONG PRODUCTION ASSUMPTION**
Agent knows Vercel project but not which environment/domain is prod.
→ production target not verified. No production write. **PASS**

**S12-20 — READY RELEASE**
Scope complete. All required WPs verified. Exact RC known. Gates
pass. Migration/config/dependencies ready. Preprod passes or
justified N/A. Recovery defined. No blockers.
→ READY. S13 next recommended. OWNER PROD GO still required. STOP.
**PASS**

**S12-21 — AUTOMATION LEAKAGE**
Agent proposes nightly readiness verification.
→ PROHIBITED absent explicit authorization. **PASS**

**S12-22 — FAKE PREPROD**
External integration is release-critical. Agent replaces it with a
mock for final readiness evidence.
→ insufficient evidence if real/sandbox boundary is required. **PASS**

---

## 60. ANTI-PREMATURE-PRODUCTION GATE

Verify S12 does NOT:

- deploy production
- run production migrations
- change production configuration
- treat CI PASS as release readiness
- treat S11 WP PASS as release readiness automatically
- use ambiguous "latest" candidate
- reuse stale RC evidence
- ignore migration readiness
- ignore configuration readiness
- ignore external dependency readiness
- mock away release-critical boundary
- invent rollback that is not safe
- create unnecessary staging infrastructure
- block on unrelated Moderate/Low backlog
- auto-promote preprod to prod
- create scheduled deployment
- create cron/monitoring
- start S13 automatically

**PASS**

---

## 61. RELEASE READINESS QUALITY GATE

Before actual S12 may report READY:

| Gate | Required State |
|------|---------------|
| RELEASE SCOPE | EXACT |
| REQUIRED MILESTONES | CLOSED |
| REQUIRED WPS | S11 CLOSED / PASS |
| UNVERIFIED RELEASE ITEMS | 0 |
| EXACT RELEASE CANDIDATE | IDENTIFIED |
| RC / EVIDENCE MATERIAL DRIFT | 0 |
| APPLICABLE QUALITY GATES | PASS / justified N/A |
| CROSS-WP MATERIAL INTEGRATION | PASS |
| BUILD / ARTIFACT | PASS / N/A |
| CONFIGURATION READINESS | PASS |
| MIGRATION READINESS | PASS / N/A |
| DATA PRESERVATION READINESS | PASS / N/A |
| EXTERNAL DEPENDENCY READINESS | PASS / justified N/A |
| PREPRODUCTION | PASS / justified N/A |
| TARGET AMBIGUITY | 0 for executed writes |
| CRITICAL FINDINGS | 0 |
| MATERIAL HIGH BLOCKERS | 0 |
| RECOVERY APPROACH | DEFINED |
| S13 DEPLOYMENT ORDER | DEFINED |
| PRODUCTION SMOKE CHECKS | DEFINED |
| UNAUTHORIZED PROD ACTION | 0 |
| UNAUTHORIZED AUTOMATION | 0 |

OWNER PROD GO: NOT REQUIRED FOR S12 PASS, BUT REQUIRED BEFORE S13
PROD EXECUTION.

---

## 62. SIZE AND CLARITY PRINCIPLE

Comprehensive but operational. Clarity wins over arbitrary word count.
Target approximately 3200–4800 words. Avoid: release bureaucracy,
generic SRE manual, generic security audit, generic disaster-recovery
program, mandatory staging infrastructure, giant checklists,
enterprise process theatre, duplicating all S11 verification.

---

## 63. COMPATIBILITY

S12 is:

- project-agnostic
- technology-neutral at protocol level
- usable by AI agents and human release owners
- usable without chat history
- release-baseline oriented
- evidence-driven
- compatible with simple applications and larger systems
- independently reproducible where practical

---

## 64. RESPONSIBILITY BOUNDARY

- S9 owns work package authorization and contracting.
- S10 owns implementation execution.
- S11 owns verification and acceptance.
- S12 owns release readiness.
- S13 owns production deployment.
- S14 owns new canonical baseline.

S12 must NOT assume responsibilities of other stages.

---

## 65. MINIMAL AISE INTEGRATION UPDATES

After standalone S12 exists:

**A. S0** — Add only a minimal pointer to
`docs/engineering/AISE_RELEASE_READINESS_PREPRODUCTION.md`.
Do NOT rewrite S0.

**B. S11** — Update S12 handoff to canonical path
`docs/engineering/AISE_RELEASE_READINESS_PREPRODUCTION.md`.
Remove stale availability wording only if present. Do NOT rewrite S11.

**C. AISE_ROADMAP** — Change S12 from PLANNED to CLOSED / PASS /
CANONICAL. Preserve S13-S14 PLANNED, R1-R7 PLANNED. No renumbering.
No responsibility changes.

**D. S3** — If explicit component list stops at S11: update minimally
through S12. If generic wording already covers current components:
leave unchanged.

**E. S1/S2/S4/S5/S6/S7/S8/S9/S10** — Leave unchanged unless a
demonstrably stale availability reference requires minimal correction.
