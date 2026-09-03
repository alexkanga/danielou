# AISE — IMPLEMENTATION EXECUTION

**Authority:** Subordinate to S0 (AI Software Engineering OS).
Reads from S5 (Product Requirements), S6 (Technical Specification),
S7 (Project Manifest + ADR), S8 (Roadmap / Milestone Design),
S9 (Module Contract / Work Package).

**Status:** ACTIVE PILOT

---

## 1. PURPOSE

S10 answers one question:

**HOW IS ONE AUTHORIZED WORK PACKAGE IMPLEMENTED CORRECTLY?**

S10 transforms an authorized S9 work package and verified canonical
repository state into a verified implementation change that is bounded,
traceable, tested, quality-gated, functionally checked, committed, pushed,
and state-recorded — ready for S11 verification.

S10 does NOT:

- verify acceptance (S11 owns that)
- deploy production (S13 owns that)
- implement adjacent features or future milestones
- create scheduled or recurring automation
- modify approved requirements or contracts to fit implementation

---

## 2. CANONICAL EXECUTION LOOP

```
VERIFIED BASE
→ READ CONTRACT
→ INSPECT / REUSE
→ PLAN MINIMUM SUFFICIENT CHANGE
→ IMPLEMENT
→ TARGETED TESTS
→ CLASSIFY FAILURES
→ FIX OBSERVED DEFECTS
→ QUALITY GATES
→ FUNCTIONAL VERIFY
→ DIFF REVIEW
→ COMMIT
→ PUSH
→ UPDATE FACTUAL STATE
→ HANDOFF TO S11
→ STOP
```

---

## 3. ENTRY PRECONDITIONS

Normal S10 entry requires all of:

| Precondition             | Required State              |
|--------------------------|-----------------------------|
| WORK PACKAGE             | APPROVED + AUTHORIZED       |
| WORK PACKAGE STATUS      | AUTHORIZED                  |
| SOURCE MILESTONE         | VALID                       |
| BLOCKING PRODUCT AMBIGUITIES    | 0                    |
| BLOCKING TECHNICAL AMBIGUITIES  | 0 for this WP           |
| CANONICAL REPOSITORY     | VERIFIED                    |
| TARGET ENVIRONMENT       | VERIFIED (where writes required) |
| MATERIAL CONTRACT DIVERGENCES   | 0 unresolved          |

If any blocking precondition fails:

**S10 PRECONDITION NOT MET.** Do NOT implement by guessing.

---

## 4. IMPLEMENTATION AUTHORITY

S10 authorization is bounded by S9. It includes only:

- required technical changes
- required tests and evidence
- required schema/migration changes explicitly allowed by the WP
- required configuration changes explicitly allowed by the WP
- minimum necessary refactoring inside the authorized boundary

It does NOT authorize: adjacent features, architectural redesign,
new product requirements, future milestone work, broad cleanup,
general hardening, new background jobs, or production deployment.

---

## 5. EXECUTION STATES

| State              | Meaning                                    |
|--------------------|--------------------------------------------|
| READY              | Preconditions met, not yet started         |
| IN_PROGRESS        | Implementation underway                    |
| BLOCKED            | Cannot proceed without external resolution |
| IMPLEMENTED_LOCAL  | Changes committed locally                  |
| PUSHED             | Changes pushed to remote branch            |
| VERIFICATION_PENDING | Ready for S11                             |
| FAILED             | Implementation could not satisfy contract   |
| SUPERSEDED         | Work package replaced or cancelled          |

S10 does NOT mark CLOSED / PASS for the product work package.
S11 owns independent verification and acceptance closure.

Key distinctions:

- IMPLEMENTED ≠ VERIFIED
- PUSHED ≠ ACCEPTED
- CI PASS ≠ FUNCTIONALLY CORRECT

---

## 6. VERIFIED BASE

Before any edit, verify:

- repository origin
- branch and HEAD (must be origin/main or authorized base)
- worktree cleanliness
- untracked files
- relevant migration state
- relevant environment identity
- authorized WP identity
- source S5/S6/S7/S8/S9 references

Record only evidence needed for this unit. Do not inventory the
whole repository.

---

## 7. CLEAN WORKTREE RULE

**Start from a clean worktree.**

If unexpected local changes exist, do NOT overwrite them.
Classify as one of:

- AUTHORIZED CURRENT WORK
- UNRELATED USER WORK
- STALE LOCAL WORK
- UNKNOWN

If continuity is not trusted, apply the Restart Rule (§8).

---

## 8. RESTART RULE

**Unpushed local work is non-canonical.**

If execution continuity is uncertain:

1. DO NOT reconstruct from memory
2. DO NOT salvage unknown local history
3. DO NOT infer missing work from chat

Default: verify canonical remote → fresh clean base →
rebuild authorized unit → test → commit → push.

Unless OWNER explicitly authorizes recovery of local work.

---

## 9. READ THE WORK PACKAGE FIRST

Before implementation, read:

- WP purpose and requirements covered
- entry conditions, in scope, out of scope
- intended behavior and business rules
- data semantics and permission semantics
- technical boundaries
- acceptance contract and verification expectations
- forbidden expansion
- allowed implementation freedom

If the execution plan cannot be derived without inventing behavior:
**STOP.** Return to S9 / governance.

---

## 10. INSPECT BEFORE MODIFY

**INSPECT / REUSE BEFORE CREATE.**

Before editing any code, identify:

- existing implementation of the target capability
- reusable service, module, or function
- existing validation logic
- existing tests and test patterns
- existing migration mechanism
- established architectural patterns
- current authoritative code path

Do not create duplicate implementations merely because existing
code was not discovered first.

---

## 11. REUSE HIERARCHY

Prefer, in order:

1. VERIFIED EXISTING CORRECT CODE
2. MINIMAL EXTENSION of existing code
3. NEW IMPLEMENTATION (only when 1 and 2 cannot satisfy the contract)

Do NOT prefer rewrite — unless evidence shows the current
implementation cannot satisfy the contract cleanly.

---

## 12. MINIMUM SUFFICIENT CHANGE

**IMPLEMENT THE SMALLEST COHERENT CHANGE THAT SATISFIES THE
AUTHORIZED CONTRACT.**

Minimum does NOT mean: hack, shortcut, unsafe behavior, or missing
tests.

It means: no unrelated expansion, no speculative subsystem, no
premature generalization, no broad refactor, no architecture theatre.

---

## 13. PLAN BEFORE EDIT

For non-trivial work packages, derive a compact execution plan:

- existing code to reuse
- minimum required changes
- required tests
- required migration/config changes if authorized
- verification path
- known risks

The plan is execution guidance, not a new S8/S9 artifact.

---

## 14. IMPLEMENTATION ORDER

Choose implementation order based on the WP and architecture.
Do NOT enforce a generic order (e.g., "DB → backend → frontend →
tests" or "tests first always"). Evidence wins.

Prefer the order that: reduces risk, keeps intermediate states
understandable, enables targeted verification, and preserves
canonical architecture.

---

## 15. BUSINESS LOGIC AUTHORITY

Where product/business behavior exists, prefer one authoritative
implementation path.

Avoid duplicate business engines across: UI, API, tests, SQL,
fixtures, scripts.

Tests and seeds may exercise the authoritative engine. They must
not reproduce a second independent implementation merely to
manufacture expected results.

---

## 16. CANONICAL VALIDATION PATH

**Final verification should exercise authoritative business code.**

If production behavior is implemented in a domain service,
integration/fixture verification should call or flow through that
service when practical.

Do NOT reimplement the business algorithm inside seed, raw SQL,
test helper, or fixture generator to create an artificial PASS
independent of production behavior.

---

## 17. CONTRACT PRESERVATION DURING IMPLEMENTATION

Approved intent drives implementation. Current code does NOT
redefine approved intent.

If factual implementation ≠ approved contract:

**CONTRACT DIVERGENCE DETECTED.**

Do NOT change: requirements, expected tests, fixtures, environment,
or quality gates merely to make defective code pass.

---

## 18. FAILURE MEANS CAUSE UNKNOWN

**FAILED TEST ≠ IMPLEMENTATION DEFECT automatically.**
**FAILED BUILD ≠ CODE DEFECT automatically.**
**FAILED MIGRATION ≠ SCHEMA DEFECT automatically.**

Initial state: **CAUSE = UNKNOWN.** Then investigate enough to
classify.

---

## 19. FAILURE CLASSIFICATION

Classify failures as one of:

- IMPLEMENTATION DEFECT
- TEST DEFECT
- FIXTURE / DATA DEFECT
- ENVIRONMENT / INFRA DEFECT
- SPECIFICATION AMBIGUITY
- TOOLING / BUILD DEFECT
- EXTERNAL DEPENDENCY DEFECT
- UNKNOWN

Only act after evidence supports the classification.

---

## 20. UNKNOWN → INVESTIGATE

**UNKNOWN → INVESTIGATE** is mandatory.

NEVER:

- UNKNOWN → MODIFY EXPECTATION
- UNKNOWN → DISABLE CHECK
- UNKNOWN → EXCLUDE FILE
- UNKNOWN → SWITCH IMPLEMENTATION PATH
- UNKNOWN → "temporary" workaround

Unless the workaround itself is separately authorized.

---

## 21. TESTS ARE EVIDENCE

Tests are not tools for manufacturing PASS.

- Valid expected test fails → fix implementation.
- Test proven wrong → fix test.
- Fixture proven wrong → fix fixture.
- Environment wrong → fix/verify environment.

Do not assume the easiest artifact to change is the defective one.

---

## 22. REPRODUCTION PRESERVATION

For bugs and known failures, preserve the same reproduction.

- Before fix: reproduction exposes defect.
- After fix: same reproduction passes.

Do not replace it with an easier scenario to claim success.

---

## 23. TARGETED TESTING

After implementing a coherent change, run targeted tests first:

- unit for local logic
- DB integration for persistence semantics
- contract test for interface behavior
- focused E2E for critical flow

Targeted testing provides fast local evidence. It does NOT
replace final applicable quality gates.

---

## 24. TEST DEPTH FOLLOWS RISK

Use test depth proportional to risk:

- Pure helper → unit may suffice
- Transactional persistence → real DB integration often required
- Authorization boundary → server-side behavior evidence required
- Cross-layer critical workflow → integration/E2E may be required

Do not mock away the boundary being validated.

---

## 25. MOCKING RULE

Mocks are allowed when they isolate non-critical dependencies.

Do NOT mock the exact boundary whose correctness must be proven.

Examples:

- Testing database transaction semantics with mocked repository
  → **invalid evidence.**
- Testing authorization enforcement while bypassing authorization
  layer → **invalid evidence.**

---

## 26. FIX OBSERVED DEFECTS

S10 may fix defects discovered during implementation when:

- they are inside authorized scope, OR
- they directly block the authorized outcome,

AND the correction does not materially expand the contract.

If the defect is adjacent or materially broader: **STOP.** Route
according to S2. Do not silently absorb it.

---

## 27. INCIDENTAL FINDINGS

Classify observations: CRITICAL, HIGH, MODERATE, LOW.

Only Critical or material High may block when relevant.

Moderate/Low: record for backlog/state if useful. Do NOT create
automatic workstreams. Do NOT derail the WP to fix unrelated
technical debt.

---

## 28. QUALITY-GATE PRESERVATION

Applicable project gates may include: typecheck, lint, unit tests,
integration tests, database tests, build, E2E, migration
verification, security checks.

Use actual repository gates. Do not invent gates. Do not weaken
valid gates.

---

## 29. QUALITY-GATE EVASION PROHIBITED

Frozen examples:

- typecheck fails → **fix cause.** NOT: exclude directory.
- lint fails → **fix cause.** NOT: disable rule globally.
- valid test fails → **fix cause.** NOT: delete/relax test.
- broken seed fails build → **fix/remove seed.** NOT: exclude scripts
  from tsconfig.
- migration test fails → **investigate actual cause.** NOT: skip
  migration verification.

---

## 30. NO TEST ADAPTATION TO DEFECTIVE CODE

Never:

- change expected output merely because current code returns
  something else
- weaken assertion merely because test fails
- change fixture values merely to fit implementation
- change mock behavior to bypass defect
- change dataset so edge case disappears

This is **Evidence Adaptation — PROHIBITED** unless evidence proves
the evidence artifact itself is wrong.

---

## 31. NO CONFIGURATION WORKAROUND

Do not change: compiler config, lint config, test config, build
config, runtime config, or environment selection merely to bypass
a defect.

Configuration change requires its own technical justification and
must remain within the authorized WP.

---

## 32. MIGRATIONS

If the WP authorizes migration:

- use the canonical project migration mechanism
- do NOT manually mutate production DB
- do NOT create ad-hoc alternate migration processes
- do NOT modify schema outside the migration system
- do NOT change DB merely to make tests pass

Before write: **VERIFY TARGET. TARGET NOT VERIFIED → NO WRITE.**

---

## 33. DATA PRESERVATION

For data-affecting changes, preserve S9/S6 expectations:

- integrity
- history
- uniqueness
- transaction semantics
- compatibility
- precision
- audit trail

Do not silently delete or rewrite existing data merely because
migration is easier.

---

## 34. AUTHORIZATION / PRIVILEGE

Preserve the S5/S6/S7 permission model.

Do NOT relax authorization because testing is inconvenient.

Where role-specific break-glass semantics exist, preserve their
distinct identity separate from standard elevated privileges.

---

## 35. ENVIRONMENT IDENTITY

Before environment writes, verify:

- target name
- target endpoint/identity (where safely inspectable)
- environment, database, branch/project
- intended purpose

Never infer production/preview identity from variable name alone.

**TARGET NOT VERIFIED → NO WRITE.**

---

## 36. LOCAL VS REMOTE FACTUAL STATE

Distinguish these as non-interchangeable:

- LOCAL IMPLEMENTATION
- REMOTE BRANCH
- CANONICAL MAIN
- DEPLOYED ENVIRONMENT

- Local commit ≠ remote truth
- Remote branch ≠ main
- Main ≠ production

---

## 37. APPLICATION FUNCTIONAL VERIFY

After code-level gates, verify the user-visible or system-visible
behavior required by S9:

- workflow actually works
- calculation matches contract
- permission is enforced
- error state is correct
- persistence result is authoritative

Do not stop at "build passes."

---

## 38. FUNCTIONAL VERIFICATION EVIDENCE

Use the minimum evidence needed:

- automated integration/E2E
- manual deterministic reproduction
- API observation
- DB observation where appropriate
- rendered UI behavior
- log/event evidence where relevant

Evidence must correspond to the authorized acceptance contract.

---

## 39. UI IMPLEMENTATION

Where UI is in scope, preserve:

- approved terminology
- loading states, empty states, error states
- permission states, incomplete states
- responsive/interaction requirements where contracted

Do not redesign adjacent UI.

---

## 40. EXTERNAL INTEGRATIONS

Where external systems are involved, preserve S6/S9 contract for:

- timeouts
- idempotency
- retries
- data mapping
- authentication
- failure behavior

Do not invent fallback behavior that changes business semantics.

---

## 41. DEPENDENCY CHANGES

Add or change a dependency only when justified by the WP.

Before adding, check whether an existing dependency already solves
the need.

Avoid: broad upgrades, framework migrations, dependency refresh
campaigns — unless explicitly authorized.

---

## 42. REFACTORING

Refactoring inside S10 is allowed only when:

- required to implement safely, OR
- minimal to preserve maintainability inside the authorized boundary

Do NOT turn "implement feature" into "clean architecture rewrite."

---

## 43. PERFORMANCE CHANGES

Performance work requires: approved NFR, observed bottleneck,
material risk, or S9 authorization.

Do not add: cache, queue, parallelism, denormalization,
precomputation, or distributed processing speculatively.

---

## 44. SECURITY CHANGES

Implement material security requirements within scope.

Do not broaden into a generic hardening campaign unless required.
Do not relax valid controls.

Security findings outside scope follow the blocker/backlog policy
in §27.

---

## 45. ZERO SCHEDULED WORK

S10 must NOT create:

- cron jobs
- scheduled AI tasks
- background monitoring
- recurring reviews
- periodic audits
- automated reminders
- scheduled GitHub workflows
- Vercel Cron
- other recurring execution

Unless OWNER explicitly authorized that exact automation.

**Silence ≠ authorization.**
**"Continue autonomously" ≠ authorization.**

---

## 46. NO PRODUCTION DEPLOYMENT

S10 implementation authorization does NOT authorize production.

S10 MAY: implement, test, push, create/update PR, use approved
non-production verification environment where contract allows.

S10 MAY NOT: deploy production, run production migration, or
change production config — without S13 OWNER PROD GO.

---

## 47. PREVIEW / TEST ENVIRONMENT

Preview/test verification may be used when already part of project
workflow.

Still verify target before writes. Do not create new environments
unless required or authorized.

---

## 48. DIFF REVIEW

Before commit, inspect the full diff. Verify:

- every changed file serves the WP
- no unrelated changes
- no debug artifacts or temporary bypasses
- no disabled checks
- no secrets
- no generated junk
- no future-work implementation
- no accidental formatting churn

---

## 49. DIFF IS EVIDENCE

Use diff to confirm implementation stayed within S9 scope.

If diff reveals scope expansion: do not rationalize after the fact.
Remove the expansion, or route for contract revision.

---

## 50. COMMIT RULE

Commit only coherent verified change.

Commit message should describe the authorized outcome. Avoid mixing
unrelated fixes.

If the WP requires multiple commits for safe implementation, that
is allowed — but keep history understandable.

---

## 51. PUSH RULE

After local gates and diff review: push the authorized branch.

Verify remote branch reflects the expected commit.

If push fails: do not call work canonical. Classify the
authentication, network, or repository issue.

---

## 52. PR RULE

Where the project uses PRs: create or update one focused PR for
the WP.

PR description should summarize: WP ID, purpose, requirements, main
changes, verification evidence, known non-blocking items.

Do not turn the PR description into a duplicate S9 contract.

---

## 53. CI CLASSIFICATION

Correct classification:

| Condition                               | Classification  |
|-----------------------------------------|-----------------|
| Checks executed and successful          | PASS            |
| No applicable checks (with evidence)    | N/A             |
| Expected check missing                  | INVESTIGATE     |
| Failed check                            | FAIL            |
| Pending                                 | PENDING         |

**Never:** 0 checks → PASS without evidence.

---

## 54. CI FAILURE

When CI fails: **CAUSE UNKNOWN.** Inspect actual failure.

Do not immediately: change tests, disable checks, change config,
re-run indefinitely, or claim flaky.

Evidence first.

---

## 55. RETRY POLICY

A retry is justified when failure evidence supports transient
behavior.

Do not use repeated retries to hide deterministic failure.

If a run passes after unexplained failures: investigate whether
correctness confidence remains materially affected.

---

## 56. PROJECT STATE UPDATE

At the end of S10, update project factual state where governance
requires it. Record:

- WP ID
- implementation status
- branch/commit
- verification performed
- known blockers
- handoff to S11

Do NOT falsely mark WP CLOSED / PASS before S11.

---

## 57. S10 COMPLETION STATE

At successful S10 end:

```
WORK PACKAGE:           IMPLEMENTED / VERIFICATION_PENDING
IMPLEMENTATION:          COMPLETE FOR AUTHORIZED SCOPE
LOCAL/REMOTE EVIDENCE:  RECORDED
QUALITY GATES:          PASS / justified N/A
FUNCTIONAL CHECK:       PASS
S11:                    NOT STARTED
NEXT RECOMMENDED:       S11 — VERIFICATION & ACCEPTANCE
NEXT AUTHORIZED:        NONE until governance/Owner GO
```

---

## 58. S10 DOES NOT SELF-ACCEPT

S10 cannot conclude "feature is fully accepted" merely because
implementation tests pass.

S10 may say: **IMPLEMENTATION COMPLETE.**

S11 determines: **CONFORMANT / ACCEPTED.**

This separation protects against self-confirming implementation.

---

## 59. S11 HANDOFF

S10 hands off to S11:

```
WP ID
AUTHORIZED CONTRACT
IMPLEMENTATION BRANCH / COMMIT
DIFF
TESTS RUN
QUALITY GATES
FUNCTIONAL EVIDENCE
MIGRATION EVIDENCE (if applicable)
ENVIRONMENT USED
KNOWN NON-BLOCKING FINDINGS
KNOWN UNRESOLVED BLOCKERS
```

---

## 60. VALIDATION SCENARIOS

S10 must satisfy all deterministic validation scenarios:

| ID      | Scenario                              | Expected Behavior                                           |
|---------|---------------------------------------|-------------------------------------------------------------|
| S10-01  | Clean base, authorized WP             | Verify base before editing                                  |
| S10-02  | Dirty unknown worktree                | Do not overwrite; classify continuity; use Restart Rule     |
| S10-03  | Existing correct code found           | Reuse/extend with minimum sufficient change                 |
| S10-04  | Agent notices adjacent feature        | OUT OF SCOPE; do not absorb                                  |
| S10-05  | Valid test fails after change         | CAUSE UNKNOWN first; do not change expected to impl         |
| S10-06  | Test proven wrong by evidence         | Classify TEST DEFECT; correct test; do not alter impl       |
| S10-07  | Fixture proven wrong                  | FIXTURE/DATA DEFECT; correct fixture; do not weaken contract|
| S10-08  | DB write to unverified environment     | NO WRITE; verify target first                                |
| S10-09  | Typecheck fails; agent excludes dir   | PROHIBITED; fix root cause                                   |
| S10-10  | Broken seed breaks compilation        | Fix/remove seed; do not exclude scripts from compiler        |
| S10-11  | Separate calculation in seed/test SQL  | Reject independent production-rule duplication               |
| S10-12  | WP authorizes schema migration        | Use canonical mechanism; verify target; test migration      |
| S10-13  | Moderate technical debt discovered    | Record non-blocking; continue authorized WP                  |
| S10-14  | Critical adjacent defect blocks WP    | Stop enough to classify; route appropriately                |
| S10-15  | Remote CI fails                       | CAUSE UNKNOWN; inspect actual evidence                      |
| S10-16  | Build passes but behavior is wrong     | S10 not complete; functional verification required          |
| S10-17  | Agent proposes production deploy       | NOT AUTHORIZED; S13 later                                    |
| S10-18  | Agent proposes recurring monitoring   | PROHIBITED; requires Owner authorization                    |
| S10-19  | Complete implementation                | IMPLEMENTED / VERIFICATION_PENDING; STOP before S11          |
| S10-20  | Unpushed work lost, continuity broken  | Restart Rule; fresh canonical base; no archaeology          |

---

## 61. ANTI-EXPANSION GATE

Verify S10 does NOT automatically:

- implement adjacent features
- start next WP or next milestone
- rewrite architecture, requirements, or tests to fit defective code
- rewrite fixtures to fit defective code
- disable quality gates or exclude failing files
- create broad refactors, speculative performance work, or new infrastructure
- create background jobs, cron, or scheduled automation
- deploy production
- start S11 automatically

---

## 62. IMPLEMENTATION QUALITY GATE

Before S10 may report IMPLEMENTED / VERIFICATION_PENDING:

| Check                                   | Required State |
|-----------------------------------------|----------------|
| Authorized WP                           | VALID          |
| Canonical base                          | VERIFIED       |
| Worktree continuity                     | TRUSTED        |
| Scope expansion                         | 0              |
| Unresolved contract divergences         | 0              |
| Implementation contradicting S5/S6/S7/S9| 0              |
| Valid tests weakened                    | 0              |
| Valid fixtures adapted to defective code| 0              |
| Quality gates disabled                  | 0              |
| Target environment unverified           | 0 (for writes) |
| Targeted tests                          | PASS           |
| Applicable quality gates                | PASS / N/A     |
| Functional verification                 | PASS           |
| Diff outside WP                         | 0              |
| Debug/temp bypasses                     | 0              |
| Unauthorized automation                 | 0              |
| Unauthorized prod action                | 0              |
| Commit/push evidence                    | AVAILABLE      |

---

## 63. RESPONSIBILITY BOUNDARY

S10 is responsible for implementation execution only.

- S9 owns work package authorization and contracting.
- S11 owns verification and acceptance.
- S12 owns release readiness.
- S13 owns production deployment.
- S14 owns new canonical baseline.

S10 must NOT assume responsibilities of other stages.

---

## 64. SIZE AND CLARITY PRINCIPLE

A well-written S10 protocol is comprehensive but operational.

Clarity wins over arbitrary word count. Avoid: implementation
bureaucracy, command encyclopedias, framework-specific instructions,
process theatre, generic DevOps essays, testing dogma, or security
encyclopedias.

---

## 65. COMPATIBILITY

S10 is:

- project-agnostic
- technology-neutral at protocol level
- usable by AI agents and human engineers
- usable without chat memory
- applicable to greenfield and brownfield work
- compatible with MODULE / HOTFIX / RECOVERY-adjacent execution
  once routed correctly

---

## 66. EXTERNAL PARAMETER / CREDENTIAL GATE

This section implements the S0 §25 EXTERNAL PARAMETER GATE invariant.

### 66.1 JUST-IN-TIME REQUEST

REQUEST EXTERNAL PARAMETERS ONLY AT THE EXACT BOUNDARY WHERE THE
CURRENTLY AUTHORIZED OPERATION GENUINELY REQUIRES THEM.

Do NOT ask at project start for GitHub, Neon, Vercel, database, or
API credentials merely because they may eventually be required.

Example: public GitHub clone/fetch works anonymously → no credential
request. Push reached → authenticated write access is now required →
request at that point.

### 66.2 ENVIRONMENT-FIRST DISCOVERY

Before requesting any parameter from OWNER, inspect the current
authorized execution environment for an existing legitimate mechanism:

- environment variables
- credential helper
- authenticated CLI
- configured SSH identity
- platform secret injection
- connected service configuration

If a valid mechanism exists: verify capability and target, then
continue. Do NOT ask OWNER for the underlying secret.

### 66.3 PARAMETER CATEGORIES

**A. PROJECT PARAMETER** — Business/product configuration (school name,
academic year, thresholds, locale). May be requested from OWNER when
required by approved product intent.

**B. EXTERNAL NON-SECRET PARAMETER** — Repository URL, project name,
API base URL, environment name. Request the exact missing value when
cannot be discovered from canonical evidence.

**C. EXTERNAL SECRET / CREDENTIAL** — GitHub PAT, DATABASE_URL, API
key, OAuth secret, private key, deployment credential. The agent must
state: WHAT, WHY, WHY NOW, WHERE, WHAT SCOPE, WHAT TARGET. Prefer
configuration through the legitimate secret/authentication mechanism
of the execution environment rather than asking OWNER to paste secrets
into chat.

### 66.4 MINIMUM REQUIRED PRIVILEGE

Request only the minimum access/scope required for the authorized
operation. Do NOT request admin/full-access credentials when
read-only or limited scope is sufficient.

### 66.5 SECRET HANDLING

Do NOT store, echo, or expose secret values in: source code, repository
files, documentation, commits, PR descriptions, fixtures, test
snapshots, generated reports, logs, git remote URLs, debug output,
shell history.

### 66.6 TARGET VERIFICATION

**CREDENTIAL AVAILABLE ≠ TARGET VERIFIED.**

Before any external write operation, verify the actual target:
repository, service, project, environment, database, deployment target.

**TARGET NOT VERIFIED → NO WRITE.**

### 66.7 EXTERNAL PARAMETER BLOCKER

When a required external parameter/capability is unavailable:

1. Classify as **EXTERNAL PARAMETER BLOCKER** (not implementation defect).
2. Report structured blocker: SYSTEM, BLOCKED OPERATION, REQUIRED
   PARAMETER(S) with NAME / CATEGORY / PURPOSE / SECRET / EXPECTED
   LOCATION / EXPECTED FORMAT / REQUIRED SCOPE / TARGET / WHY REQUIRED
   NOW / CURRENT COMPLETED STATE / RESUME POINT / OWNER ACTION.
3. Preserve all completed work.
4. Record the exact RESUME POINT.
5. STOP at the boundary.

Do NOT change implementation, switch database, skip integration testing,
create fake responses, change target, or disable verification to avoid
the blocker.

### 66.8 RESUME AFTER CONFIGURATION

When the required capability is configured:

1. Verify the parameter now exists.
2. Verify required access/scope.
3. Verify target identity.
4. Before resuming delayed external work (push/deployment/DB write),
   verify whether canonical main materially advanced while blocked.
5. Resume from the exact RESUME POINT.
6. Do NOT repeat completed work (discovery, design, implementation,
   already-passed tests, commit creation) unless canonical state
   materially changed or evidence became invalid.

CONFIGURATION RECOVERY → RESUME, not RESTART.
