# AISE — VERIFICATION & ACCEPTANCE

**Authority:** Subordinate to S0 (AI Software Engineering OS).
Reads from S5 (Product Requirements), S6 (Technical Specification),
S7 (Project Manifest + ADR), S8 (Roadmap / Milestone Design),
S9 (Module Contract / Work Package), S10 (Implementation Execution).

**Status:** ACTIVE PILOT

---

## 1. PURPOSE

S11 answers one question:

**DOES THE IMPLEMENTED WORK ACTUALLY CONFORM TO THE APPROVED CONTRACT?**

S11 consumes an authorized S9 work package, S10 implementation
evidence, implementation branch/commit/diff, applicable test/CI
evidence, and approved S5/S6/S7 intent — and produces a
VERIFICATION & ACCEPTANCE VERDICT supported by reproducible
evidence.

Canonical traceability:

```
S5 REQUIREMENT → S8 MILESTONE → S9 WORK PACKAGE →
S10 IMPLEMENTATION → S11 EVIDENCE → VERDICT
```

S11 does NOT: implement code, deploy production, modify requirements,
or start S12.

---

## 2. S10 VS S11

Freeze:

- **S10 IMPLEMENTS.**
- **S11 VERIFIES.**

S10 reports: IMPLEMENTED / VERIFICATION_PENDING.
S11 determines: CONFORMANT or NON-CONFORMANT or BLOCKED.

S10 test results are INPUT EVIDENCE. They are NOT automatically
the S11 verdict.

---

## 3. S11 VS S12

S11 asks: **IS THIS IMPLEMENTED UNIT CONFORMANT?**
S12 asks: **IS THE VERIFIED RELEASE BASELINE READY FOR RELEASE?**

Therefore: WP VERIFIED ≠ RELEASE READY.
Do NOT execute release-readiness logic inside S11.

---

## 4. REUSABLE DELIVERY LOOP

S11 is reusable for every authorized Work Package. Delivery may
follow S9 → S10 → S11 → next S9 → S10 → S11 until milestone
coverage is complete.

Therefore:

- WP PASS does NOT automatically mean MILESTONE CLOSED.
- WP PASS does NOT automatically start S12.

After S11, determine:

- More work remains → return to S9.
- Next milestone authorized → S9 for next WP.
- Release baseline complete → S12 becomes next recommended.

Roadmap and Owner authorization remain authoritative.

---

## 5. ENTRY PRECONDITIONS

| Precondition                | Required State                       |
|----------------------------|--------------------------------------|
| WORK PACKAGE                | APPROVED / AUTHORIZED                |
| S10 IMPLEMENTATION          | IMPLEMENTED / VERIFICATION_PENDING   |
| IMPLEMENTATION COMMIT       | IDENTIFIED                           |
| IMPLEMENTATION DIFF         | AVAILABLE                            |
| CONTRACT BASELINE           | IDENTIFIED                           |
| RELEVANT TEST EVIDENCE      | AVAILABLE or reproducible            |
| TARGET ENVIRONMENT          | VERIFIED (where required)            |
| BLOCKING EXTERNAL PARAMS    | 0 or explicitly reported              |

If the implementation being verified cannot be identified exactly:
**S11 PRECONDITION NOT MET.**

Do not verify "whatever is currently in the repository."

---

## 6. EXACT VERIFICATION BASELINE

S11 must identify the immutable subject being verified:

- WP ID and source milestone
- implementation branch, commit SHA, base commit
- diff range and migration identifiers
- artifact/build version where applicable
- preview/environment identity
- verification timestamp/baseline

**VERIFY A SPECIFIC IMPLEMENTATION BASELINE.**

Do not verify an ambiguous moving branch and then claim the later
branch is accepted.

---

## 7. EVIDENCE FRESHNESS

Evidence is valid only for the implementation baseline it actually
tested.

Material code/config/migration change after evidence was produced
→ relevant verification must be rerun.

Do NOT attach old PASS evidence to new code.

---

## 8. VERIFIER POSTURE

S11 is **READ-ONLY TOWARD PRODUCT IMPLEMENTATION BY DEFAULT.**

The verifier may: read code, inspect diff, run tests, run quality
gates, query approved environments, observe behavior, collect
evidence, produce verification documentation.

The verifier must NOT automatically: fix product code, refactor,
change requirements, rewrite S9 contract, rewrite fixtures,
change tests, create migrations, or deploy production.

If a defect is found: record evidence, classify, return verdict.
Then route corrective work separately.

---

## 9. INDEPENDENCE PRINCIPLE

**THE VERDICT MUST NOT DEPEND ONLY ON THE IMPLEMENTER SAYING IT
PASSED.**

Independence may be achieved through: fresh reproduction, independent
rerun, direct contract comparison, separate environment observation,
independent reviewer, or objective system evidence.

For material/high-risk changes, a fresh verifier context is preferred.
Do not create organizational bureaucracy for trivial work.

---

## 10. CONTRACT IS THE REFERENCE

The reference point is the **APPROVED S9 CONTRACT** plus its
authoritative upstream (S5/S6/S7/S8).

The implementation is NOT the source of expected behavior.

If implementation ≠ contract: do not alter the contract merely
because implementation already exists.

---

## 11. VERIFICATION MATRIX

For each material acceptance item establish:

| Contract Item | Source | Evidence | Method | Result | Verdict |

Use compact form for trivial behavior. Avoid enormous matrices
for simple changes.

---

## 12. VERDICTS

| Verdict                        | Meaning                                              |
|--------------------------------|------------------------------------------------------|
| **PASS**                       | All blocking contracted acceptance items verified     |
| **PASS WITH NON-BLOCKING**     | All pass; only Moderate/Low non-blocking findings     |
| **FAIL**                       | One or more contracted conditions not satisfied       |
| **BLOCKED**                    | Cannot complete — missing evidence/env/parameter      |
| **NOT APPLICABLE**             | Specifically identified item, with reason             |

Do NOT use PARTIAL PASS to conceal an unmet required criterion.

---

## 13. PASS MEANS CONTRACT CONFORMANCE

PASS does NOT mean: "tests are green", "build succeeds",
"PR merged", "looks correct", or "agent says complete".

PASS means: **THE CONTRACTED OUTCOME HAS SUFFICIENT EVIDENCE OF
CONFORMANCE.**

---

## 14. CI IS EVIDENCE, NOT THE VERDICT

CI may prove: build, typecheck, lint, unit/integration tests,
deployment preview, other configured checks.

But: **CI PASS ≠ S11 PASS** if required functional/business
behavior has not been verified.

Correct classification: checks executed + successful → CI PASS;
no applicable checks with evidence → CI N/A;
expected check missing → INVESTIGATE; failed → CI FAIL.

---

## 15. EVIDENCE HIERARCHY

Use the strongest practical evidence for the contracted risk:

- source/diff inspection
- unit results
- real database integration
- API/contract observation
- E2E
- rendered UI behavior
- migration execution in approved non-prod target
- data-state observation
- security/permission behavior
- external integration sandbox results
- Owner/manual deterministic observation

Use minimum sufficient trustworthy evidence. Do not maximize volume.

---

## 16. REAL BOUNDARY RULE

If the contract concerns a real technical boundary — verify that
boundary.

- Database transaction semantics → real DB evidence
- Authorization enforcement → server-side authorization path
- Migration correctness → canonical migration mechanism
- External API contract → sandbox/contract evidence

Do NOT replace the exact boundary with a mock and call it verified.

---

## 17. CANONICAL BUSINESS PATH

Where business logic is authoritative in a production code path,
verification should exercise that code path where practical.

Do NOT create a second calculation implementation inside verification
SQL, test script, fixture generator, or spreadsheet merely to
generate a matching result.

**Independent verification ≠ duplicate business engine.**

---

## 18. EXPECTED RESULTS

Expected outcomes must come from: approved contract, authoritative
specification, independently established fixture expectation, or
approved business rule.

Do NOT derive expected output from current implementation result.
That would be self-confirming verification.

---

## 19. TEST PRESERVATION

If a valid existing test fails: CAUSE = UNKNOWN.

Do NOT weaken expected value, assertion, coverage, fixture,
environment, or quality gate until evidence proves the evidence
artifact itself is wrong.

---

## 20. FAILURE CLASSIFICATION

Classify verification failures as one of:

- IMPLEMENTATION DEFECT
- TEST DEFECT
- FIXTURE / DATA DEFECT
- ENVIRONMENT / INFRA DEFECT
- SPECIFICATION AMBIGUITY
- EXTERNAL DEPENDENCY DEFECT
- EXTERNAL PARAMETER BLOCKER
- TOOLING DEFECT
- UNKNOWN

**UNKNOWN → INVESTIGATE. NEVER UNKNOWN → WORKAROUND.**

---

## 21. NO REPAIR DURING VERIFICATION

S11 must not silently change implementation and continue verification.

If product implementation defect is proven:

```
VERDICT: FAIL
CORRECTIVE ROUTE: S10 / HOTFIX / relevant S2 route
```

A new corrected baseline must be re-verified. This preserves
independence between IMPLEMENTATION and ACCEPTANCE.

---

## 22. VERIFICATION ARTIFACT DEFECT

If the verifier proves the verification artifact itself is defective
(invalid test, broken script, incorrect fixture): classify it
accurately. Do NOT label product implementation defective.

If correction materially changes evidence: rerun relevant
verification.

---

## 23. REPRODUCTION PRESERVATION

For defect verification, use the same valid reproduction where
possible.

Before correction: reproduction exposes defect.
After correction: same reproduction passes.

Do not replace difficult reproduction with an easier one.

---

## 24. REQUIREMENT COVERAGE

S11 must detect: **UNVERIFIED CONTRACT ITEM.**

At S11 closure: UNVERIFIED BLOCKING CONTRACT ITEMS = 0.

No "overall PASS" while required items remain untested.

---

## 25. CALCULATION VERIFICATION

Where calculations are in scope, verify against authoritative
S5/S9 contract: inputs, inclusion/exclusion, missing/incomplete
behavior, formula, precision, rounding, thresholds, ranking/order.

Do not infer expected values from implementation.

---

## 26. DATA / MIGRATION VERIFICATION

Where persistence is in scope, verify relevant: constraints,
relationships, uniqueness, nullability, history, audit behavior,
transaction behavior, concurrency semantics, data preservation. Only what the WP requires. Do not perform generic database audit beyond contracted scope. The goal is to verify the specific data semantics that the WP introduces or modifies, not to re-audit the entire database schema.

Where migration is part of the WP: verify canonical migration
mechanism, clean application, expected schema/data result, data
preservation, target identity.

Do NOT run unauthorized production migration.

---

## 27. AUTHORIZATION VERIFICATION

Where permissions are in scope: verify allowed principal succeeds,
forbidden principal is rejected, server-side enforcement exists,
resource/context scoping is respected, privileged exceptions match
approved design.

Do not infer authorization from hidden UI controls alone.

---

## 28. UI / API / INTEGRATION VERIFICATION

Where UI is in scope: verify material contracted states (correct
route, approved terminology, normal/loading/empty/error/incomplete
states, permission states, critical interactions). Do not turn S11
into cosmetic QA unless visual requirements are contracted.

Where APIs are in scope: verify input validation, output semantics,
errors, authorization, idempotency, compatibility, side effects.

Where integrations are in scope: verify correct provider, mapping,
trigger, timeout/failure behavior, observable result.

---

## 29. NFR VERIFICATION

Verify only NFRs relevant to the WP/release. Do not create generic
testing campaigns. If no approved metric exists: do not invent
one during S11.

---

## 30. ENVIRONMENT VERIFICATION

Before environment-dependent verification: verify target identity.

**CREDENTIAL AVAILABLE ≠ TARGET VERIFIED.**

Preserve: TARGET NOT VERIFIED → NO WRITE.

Record the verification target sufficiently for reproducibility.

---

## 31. EXTERNAL PARAMETER GATE

Apply canonical S0/S10 External Parameter Gate.

Do NOT request external credentials preemptively. When S11
genuinely reaches an external verification boundary: inspect
existing capability first.

If missing: EXTERNAL PARAMETER BLOCKER. Return the canonical
structured blocker report. After configuration: verify
capability, verify target, resume exact verification step.

Do not restart completed verification unnecessarily.

---

## 32. EVIDENCE STORAGE

Store durable verification evidence in an appropriate project
location. Default: `docs/verification/WP-<ID>_VERIFICATION.md`.

Do not commit secrets or sensitive runtime data.

---

## 33. FINDING SEVERITY

Use pragmatic severity: CRITICAL, HIGH, MODERATE, LOW.

Critical/material High may block. Moderate/Low do not
automatically block if all contracted acceptance criteria
remain satisfied.

---

## 34. PASS WITH NON-BLOCKING FINDINGS

Allowed only when ALL required acceptance criteria pass and
remaining observations do not violate contracted behavior.

Do NOT use this to hide: failed business rule, failed permission,
data-integrity defect, failed critical NFR, or missing evidence.

---

## 35. WAIVERS / EXCEPTIONS

S11 must NOT silently waive a failed contracted requirement.
If OWNER wants to accept a known deviation: that is a governance
decision requiring S9 revision, S5/S6 change, or risk acceptance.

Do not simply convert FAIL to PASS.

---

## 36. ACCEPTANCE AUTHORITY

**AUTOMATE OBJECTIVE VERIFICATION. ESCALATE ONLY GENUINE
DECISION GATES.**

Subjective/business acceptance requiring OWNER judgment must not
be self-approved by the agent.

---

## 37. AUTONOMOUS UNIT COMPATIBILITY

Within OWNER-authorized bounded milestone/WP: S10 implementation
+ S11 objective verification may proceed autonomously if governance
permits. Do NOT create unnecessary Owner interruptions.

OWNER decision is required only when: scope changes, contract
changes, material divergence exists, risk exception is requested,
or production authorization is required.

---

## 38. VERIFICATION OF NON-CHANGES

When S9 forbids expansion, S11 should inspect diff for: out-of-
scope files, unrelated features, architecture drift, disabled
gates, new cron/schedules, unapproved infrastructure, production
changes.

Contract compliance includes: **WHAT WAS NOT SUPPOSED TO CHANGE.**

---

## 39. ZERO SCHEDULED WORK VERIFICATION

Where relevant verify: no cron, scheduled AI tasks, background
monitoring, or unauthorized automation — unless OWNER-authorized.

S11 itself must not create recurring monitoring.

---

## 40. PRODUCTION BOUNDARY

S11 does NOT authorize production deployment. S11 must not:
deploy production, run production migration, or change production
config. S13 owns production with OWNER PROD GO.

---

## 41. SECURITY OF VERIFICATION

Verification must not expose secrets. Do not commit: credentials,
tokens, private keys, sensitive connection strings, or sensitive
customer data.

---

## 42. VERDICT STABILITY

A PASS applies to the exact implementation baseline verified.
If the branch/commit changes materially after PASS: the verdict
may become stale. Re-verify affected items.

Do not transfer PASS blindly across commits.

---

## 43. FAILED S11 LOOP

If S11 returns FAIL: record failed item, evidence, classification,
affected baseline, severity, recommended route. Then STOP.

Corrective work happens through S10 / HOTFIX / CONTRACT_DIVERGENCE
/ INVESTIGATION or other S2 route. New baseline → new S11.

---

## 44. BLOCKED S11 LOOP

If BLOCKED (external parameter, environment, test infrastructure):
preserve completed evidence, record exact RESUME POINT.

After blocker resolves: resume from that point. Do not restart
completed verification unless evidence became stale.

---

## 45. WP CLOSURE

S11 may close a WP when: all blocking contract items verified,
quality gates appropriate, functional behavior verified, required
migrations/data verified, permissions verified where required,
no unresolved Critical/material High blocker.

Then: WP CLOSED / PASS.
But: MILESTONE may remain IN_PROGRESS.

---

## 46. MILESTONE COVERAGE CHECK

After WP verification, consult S8:

- Requirements covered: complete / incomplete
- Exit conditions: satisfied / not satisfied

If incomplete: next route is another S9 Work Package.
Do NOT mark milestone closed prematurely.

---

## 47. MILESTONE CLOSURE

A milestone closes only when: required WPs closed, requirement
coverage complete, exit conditions satisfied, blocking findings
resolved.

Do not infer milestone closure from one WP PASS.

---

## 48. RELEASE COVERAGE CHECK

After milestone closure: determine whether the release baseline
has remaining milestones.

If yes: continue delivery lifecycle.
If no: S12 becomes candidate for RELEASE READINESS.

Do NOT start S12 automatically.

---

## 49. S12 HANDOFF

Only when release-baseline coverage is complete, S11 hands off:
verified WP set, implementation commits, verification reports,
quality-gate evidence, migration verification, known findings,
residual risks, release-scope coverage — to S12: docs/engineering/AISE_RELEASE_READINESS_PREPRODUCTION.md

---

## 50. VERIFICATION REPORT STRUCTURE

Recommended for actual project verification:

```
# WP-XXX VERIFICATION & ACCEPTANCE

## 1. Verification Status
   WP, milestone, commit, base, verifier, target environment

## 2. Contract Baseline
   S9, relevant S5/S6/S7 references

## 3. Implementation Subject
   Branch, commit, diff, migration/build artifact

## 4. Acceptance Matrix
   Contract item, evidence, method, result, verdict

## 5. Quality Gates
## 6. Functional Verification
## 7. Data / Migration Verification
## 8. Permission Verification
## 9. Integration Verification

## 10. Findings
   Blocking / non-blocking

## 11. Deviations
## 12. Final Verdict
## 13. Milestone Coverage Impact
## 14. Next Route
```

Adapt to project context. Do not manufacture bureaucracy for trivial verification; scale the report to the risk and complexity of the WP. Larger or higher-risk work packages warrant more detailed evidence. Smaller, lower-risk changes may use compact form. Key is that every required acceptance item has a traceable, reproducible verification result, and that the verdict is clearly supported by that evidence rather than by assertion.
verification.

---

## 51. VALIDATION SCENARIOS

S11-01 — IMPLEMENTER CLAIMS PASS
S10 reports all tests passed. Expected: S11 independently checks
evidence. Does not accept claim alone. → **PASS**

S11-02 — CI GREEN / BUSINESS WRONG
CI is green. Required business calculation incorrect. Expected:
S11 FAIL. CI PASS does not override functional failure. → **PASS**

S11-03 — CRITICAL DB BOUNDARY MOCKED
Contract requires real transaction behavior. Evidence uses only
mocked repository. Expected: INSUFFICIENT EVIDENCE. → **PASS**

S11-04 — IMPLEMENTATION DIFFERS FROM CONTRACT
Code returns behavior different from S9. Expected: FAIL /
CONTRACT DIVERGENCE. → **PASS**

S11-05 — VALID TEST FAILS
Existing valid expected test fails. Expected: CAUSE UNKNOWN;
no test weakening. → **PASS**

S11-06 — TEST PROVEN WRONG
Evidence proves test contradicts approved contract. Expected:
TEST DEFECT; correct artifact, then rerun. → **PASS**

S11-07 — FIXTURE ADAPTATION
Verifier proposes changing fixture to match implementation.
Expected: PROHIBITED unless fixture proven defective. → **PASS**

S11-08 — WRONG ENVIRONMENT
Verification requires DB write. Target unknown. Expected:
TARGET NOT VERIFIED → NO WRITE. → **PASS**

S11-09 — MIGRATION
WP contains authorized migration. Expected: verify canonical
mechanism; no production migration. → **PASS**

S11-10 — CALCULATION
Contract specifies exact formula/rounding. Expected: verify
against contract; not from implementation output. → **PASS**

S11-11 — AUTHORIZATION
UI hides action but server accepts unauthorized request.
Expected: FAIL. UI hiding ≠ authorization evidence. → **PASS**

S11-12 — EXTERNAL INTEGRATION
Integration contracted. Expected: verify real boundary/sandbox.
No fake local substitute for final evidence. → **PASS**

S11-13 — UI FLOW
Contract requires visible empty/error/incomplete states.
Expected: verify those material states. → **PASS**

S11-14 — MODERATE NON-BLOCKER
All acceptance criteria pass. One Moderate observation exists.
Expected: PASS WITH NON-BLOCKING valid. → **PASS**

S11-15 — CRITICAL DEFECT
Critical contracted behavior fails. Expected: FAIL; no waiver
by verifier. → **PASS**

S11-16 — PARTIAL COVERAGE
8 of 10 required items pass; 2 unverified. Expected: NO PASS;
unverified items remain. → **PASS**

S11-17 — STALE EVIDENCE
Evidence produced on commit A. Implementation changed to B.
Expected: affected evidence stale; reverify B. → **PASS**

S11-18 — EXTERNAL PARAMETER
Real integration verification reaches credential boundary.
Absent. Expected: canonical EXTERNAL PARAMETER BLOCKER. → **PASS**

S11-19 — VERIFIER FIXES CODE
Verifier finds defect and edits product code directly.
Expected: PROHIBITED; FAIL + corrective route. → **PASS**

S11-20 — WP PASS / MILESTONE INCOMPLETE
WP passes. Other milestone requirements remain. Expected:
WP CLOSED; milestone open; not S12. → **PASS**

S11-21 — RELEASE COVERAGE COMPLETE
All milestones verified. Release baseline complete.
Expected: S12 NEXT RECOMMENDED; do NOT start S12. → **PASS**

---

## 52. ANTI-SELF-CERTIFICATION GATE

Verify S11 does NOT:

- accept S10 claim without evidence
- equate CI PASS with contract PASS
- derive expected values from implementation output
- weaken tests or adapt fixtures
- mock away required critical boundary
- modify application code to fix discovered defect
- silently change S9 contract
- ignore stale evidence or verify wrong environment
- create production writes or cron/scheduled work
- mark milestone closed from partial WP coverage
- start S12 automatically

---

## 53. VERIFICATION QUALITY GATE

Before an actual WP may receive S11 PASS:

| Check                                   | Required State                        |
|-----------------------------------------|---------------------------------------|
| Exact implementation baseline           | IDENTIFIED                             |
| S9 contract                            | VALID                                  |
| Required acceptance items               | 100% ADDRESSED                          |
| Unverified blocking items               | 0                                      |
| Stale material evidence                 | 0                                      |
| Valid tests weakened                    | 0                                      |
| Valid fixtures adapted                  | 0                                      |
| Critical boundaries mocked away         | 0                                      |
| Target environment ambiguity            | 0 (where env evidence required)         |
| Contract/implementation contradictions   | 0                                      |
| Critical defects                        | 0                                      |
| Material High blockers                  | 0                                      |
| Applicable quality gates                | PASS / justified N/A                    |
| Functional verification                 | PASS                                   |
| Unauthorized production action          | 0                                      |
| Unauthorized automation                 | 0                                      |
| Verdict                                | SUPPORTED BY EVIDENCE                  |

---

## 54. RESPONSIBILITY BOUNDARY

- S9 owns work package authorization and contracting.
- S10 owns implementation execution.
- S11 owns verification and acceptance.
- S12 owns release readiness.
- S13 owns production deployment.
- S14 owns new canonical baseline.

S11 must NOT assume responsibilities of other stages.

---

## 55. SIZE AND CLARITY PRINCIPLE

Comprehensive but operational. Clarity wins over arbitrary word
count. Avoid: QA bureaucracy, duplicate testing doctrine, massive
evidence matrices, generic security/performance campaigns, and
manual-review theatre.

---

## 56. COMPATIBILITY

S11 is:

- project-agnostic
- technology-neutral at protocol level
- usable by AI agents and human reviewers
- usable without chat history
- evidence-driven, independently reproducible where practical
independently reproducible where practical
independently reproducible where practical
- independently reproducible where practical
