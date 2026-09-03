# AISE — R7 EXISTING PROJECT / BROWNFIELD ADOPTION PROTOCOL

**Authority:**
Subordinate to S0 (AI Software Engineering OS). R7 is the transverse
route for bringing an existing project that does not yet have a
sufficiently trustworthy AISE baseline under AISE governance.

**Core Principle:**

BROWNFIELD ADOPTION = DISCOVER → VERIFY → ESTABLISH MINIMUM
TRUSTWORTHY BASELINE → GOVERN FORWARD

NOT: RECONSTRUCT A FICTIONAL AISE HISTORY.

**Second Core Principle:**

EXISTING IMPLEMENTATION = FACTUAL EVIDENCE

NOT: AUTOMATIC APPROVED INTENT.

**Third Core Principle:**

ADOPTION IS PROSPECTIVE.

AISE GOVERNS THE PROJECT FROM THE VERIFIED ADOPTION BASELINE FORWARD.

---

## 1. PURPOSE

R7 answers:

- WHAT ACTUALLY EXISTS TODAY?
- WHAT PARTS OF THE CURRENT STATE CAN BE TRUSTED?
- WHAT IS THE CURRENT INTENDED PRODUCT?
- WHAT EXISTING DOCUMENTS ARE AUTHORITATIVE?
- WHAT BEHAVIOR IS MERELY LEGACY FACT?
- WHAT IS UNKNOWN?
- WHAT MUST BE RECOVERED OR INVESTIGATED?
- WHAT MINIMUM AISE BASELINE IS REQUIRED TO GOVERN FUTURE WORK?
- WHAT HISTORICAL FACTS MUST NOT BE FABRICATED?
- WHEN CAN THE PROJECT BE CONSIDERED AISE-MANAGED?
- WHAT FUTURE ROUTE SHOULD BE USED AFTER ADOPTION?

---

## 2. R7 ROUTE FIT

Use R7 when an EXISTING project lacks a sufficiently trustworthy AISE
baseline. Examples: existing repo but no AISE governance, legacy
production app, project inherited from another team, prototype becoming
production, existing app with undocumented architecture, project with
scattered requirements, project with code but no formal product
contract, existing service with unknown deployment history, project
with docs that may be stale, existing platform where future work must
now use AISE, partially AISE-documented project whose baseline cannot
be trusted.

---

## 3. R7 IS NOT THE RIGHT ROUTE WHEN

| Situation | Route |
|---|---|
| New project from zero | S3 |
| Existing AISE-managed normal change | R1 |
| Urgent production defect | R2 |
| Lost/untrusted current state of already-managed project | R3 |
| Unknown cause | R4 |
| Contract divergence inside already-managed baseline | R5 |
| AISE governance change | R6 |

---

## 4. BROWNFIELD != NEW PROJECT

**Freeze:**

AN EXISTING PROJECT MUST NOT BE TREATED AS IF IT WERE CREATED TODAY.

R7 does not replay S3 as historical fiction. Existing
code/data/users/releases/architecture/technical
decisions/business behavior/incidents/migrations must be treated as
factual legacy evidence.

---

## 5. ADOPTION IS PROSPECTIVE

R7 establishes AISE ADOPTION BASELINE. AISE governance applies from
that verified point forward.

Do NOT claim old commits followed S10, past deployments followed S13,
old decisions had ADRs, historic requirements passed S5, or legacy
releases passed S12 — unless evidence shows they actually did.

---

## 6. NO RETROACTIVE COMPLIANCE

Do not manufacture historical work packages, historical Owner GO,
historical release readiness, historical verification reports,
historical production verification, or historical ADR rationale merely
to make the project look AISE-compliant. Historical absence remains
factual.

---

## 7. ADOPTION SUBJECT

Identify exactly what is being adopted: WHOLE PROJECT, ONE APPLICATION,
ONE SERVICE, ONE MODULE, ONE DEPLOYMENT LINE, ONE LEGACY SUBSYSTEM, or
MULTI-REPOSITORY PRODUCT.

Do not automatically adopt an entire enterprise because one repository
was inspected.

---

## 8. FULL VS SCOPED ADOPTION

R7 supports FULL PROJECT ADOPTION and BOUNDED/SCOPED ADOPTION.

If scoped: record exact ADOPTION BOUNDARY. Do NOT claim non-adopted
areas are AISE-managed.

---

## 9. ADOPTION BOUNDARY

Record: IN ADOPTION SCOPE, OUTSIDE ADOPTION SCOPE, SHARED
DEPENDENCIES, EXTERNAL SYSTEMS, PRODUCTION TARGETS IN SCOPE,
REPOSITORIES IN SCOPE.

---

## 10. ADOPTION MODES

Useful modes: REPOSITORY-ONLY, ACTIVE DEVELOPMENT SYSTEM, PRODUCTION
SYSTEM, SCOPED SUBSYSTEM, MULTI-REPOSITORY SYSTEM.

Do not create complex maturity model.

---

## 11. INITIAL ADOPTION ENVELOPE

Before substantial adoption work establish: ADOPTION OBJECTIVE,
ADOPTION SUBJECT, ADOPTION BOUNDARY, KNOWN REPOSITORIES, KNOWN
ENVIRONMENTS, KNOWN PRODUCTION STATUS, KNOWN DOCUMENTATION, KNOWN
RISKS, CURRENT OWNER/DECISION AUTHORITY, EXPECTED AISE GOVERNANCE
BOUNDARY, FORBIDDEN ACTIONS.

---

## 12. VERIFY REPOSITORY IDENTITY

For each repository verify: remote, default/canonical branch, HEAD,
worktree, repository purpose, relationship to production.

Wrong repo → R3.

---

## 13. MULTI-REPOSITORY PROJECT

If multiple repos: do not merge conceptually. Record repo identity,
responsibility, dependency, deployment relationship.

---

## 14. FACTUAL DISCOVERY

Discover current factual state from evidence: repository,
application structure, package manifests, database migrations,
deployment configuration, existing tests, CI configuration, runtime
metadata, existing documentation, release records, production
metadata, issue tracker where relevant.

Do not inventory every file.

---

## 15. DISCOVERY IS NOT AUDIT

R7 is NOT automatically: security audit, performance audit,
dependency audit, code-quality audit, test-coverage audit,
architecture review, technical-debt assessment.

Inspect only what is necessary to establish trustworthy governance
baseline.

---

## 16. TRUST CLASSIFICATION

Classify: VERIFIED (direct sufficient evidence), PARTIALLY VERIFIED,
UNVERIFIED, CONFLICTING, STALE, OUT OF ADOPTION SCOPE.

---

## 17. FACTUAL BASELINE

Build minimum factual baseline: repository/main, application version,
technology/runtime, database technology, migration mechanism, current
deployment mechanism, current production baseline, active
environments, critical integrations, auth/authz mechanism, current
project state.

---

## 18. MAIN != PRODUCTION

**Freeze:**

MAIN != PRODUCTION automatically.

For production project determine: deployed commit/artifact,
production target, migration state, configuration reference,
release identity.

If materially unknown: R3 or R4.

---

## 19. EXISTING DOCUMENT INVENTORY

Identify: README, requirements, business rules, design docs,
architecture docs, ADRs, tickets, wiki exports, runbooks, release
notes, API specifications.

Classify each as: AUTHORITATIVE CANDIDATE, SUPPORTING EVIDENCE,
HISTORICAL, STALE, CONFLICTING, UNKNOWN.

---

## 20. LEGACY DOCUMENT DOES NOT AUTOMATICALLY BECOME CANONICAL

A document being old or widely used does not prove authority.

Determine: who approved it, what scope it covers, whether current
system still follows it, whether superseded, whether it represents
intended or factual state.

---

## 21. IMPLEMENTATION IS FACTUAL EVIDENCE

**Freeze:**

CODE TELLS US WHAT THE SYSTEM DOES/ATTEMPTS TO DO.

CODE DOES NOT AUTOMATICALLY TELL US WHAT THE PRODUCT SHOULD DO.

Existing behavior may be: correct intended behavior, legacy behavior,
bug, temporary workaround, obsolete feature, unauthorized behavior,
unknown.

---

## 22. PRODUCTION BEHAVIOR IS FACTUAL EVIDENCE

Production usage proves operational facts. It does not automatically
convert behavior into approved product contract.

---

## 23. TESTS ARE EVIDENCE

Existing tests may reveal intended assumptions. They are not
automatically authoritative product contracts.

---

## 24. INTENDED-STATE DISCOVERY

Identify current intended product state from best available evidence:
approved requirements, Owner decisions, business manuals, accepted
contracts, API commitments, user-facing policies, existing validated
behavior.

Separate WHAT IS KNOWN INTENT from WHAT IS OBSERVED LEGACY BEHAVIOR.

---

## 25. UNKNOWN INTENT IS VALID

Do not fabricate requirements. Use INTENDED STATE UNKNOWN where
necessary.

---

## 26. OWNER BASELINE DECISION

Where existing factual behavior must become future intended baseline
but no authoritative prior contract exists: Owner must explicitly
approve adoption.

This is prospective. Do not claim historical authorization.

---

## 27. LEGACY BEHAVIOR ACCEPTANCE

When Owner accepts legacy factual behavior as future intent: record
ADOPTED CURRENT BEHAVIOR effective from adoption baseline.

Do not write historically required behavior unless evidence supports
it.

---

## 28. LEGACY BEHAVIOR REJECTION

Owner may determine current factual behavior is wrong. Then:

- do NOT correct it automatically during adoption
- record divergence
- route future correction through R1/R2/R3/R5

---

## 29. CONTRACT DIVERGENCE DURING ADOPTION

If factual state != approved intended state: use R5.

R7 may record the divergence but must not silently reconcile it.

---

## 30. UNKNOWN CAUSE DURING ADOPTION

If observed inconsistency exists but cause is unknown: R4.

Do not turn R7 into unlimited debugging.

---

## 31. UNTRUSTED STATE DURING ADOPTION

If repo identity/production baseline/migration state/environment
continuity is materially untrusted: R3.

Do not establish adoption baseline on uncertain facts.

---

## 32. URGENT PROD DEFECT DURING ADOPTION

If urgent production defect discovered: R2 may take priority. R7
adoption can pause and resume afterward.

---

## 33. ADOPTION MUST NOT FIX EVERYTHING

**Freeze:**

BROWNFIELD ADOPTION != CLEAN UP THE LEGACY SYSTEM.

Do NOT automatically refactor code, upgrade framework, replace
dependencies, normalize architecture, rewrite database, increase test
coverage, fix every bug, or remove technical debt.

Adoption creates governance baseline. Future improvements use R1/R2.

---

## 34. MINIMUM SUFFICIENT BASELINE

The objective is: ENOUGH TRUSTWORTHY CANONICAL STATE TO GOVERN THE NEXT
CHANGE CORRECTLY.

Can a fresh agent understand: what project is, current scope,
authoritative behavior, approved architecture, current factual state,
unknowns, future route?

---

## 35. S4 RELATIONSHIP

Brownfield adoption should establish a CURRENT project purpose/boundary.

Use S4 principles prospectively. Do NOT pretend current Charter existed
historically.

---

## 36. S5 RELATIONSHIP

Establish enough current product requirements/business contracts to
govern adopted scope.

Do NOT necessarily document every legacy feature. Prioritize:
critical business rules, permissions, calculations, data semantics,
externally committed behaviors, active workflows, areas likely to
change.

---

## 37. NO AUTOMATIC COMPLETE PRD RECONSTRUCTION

Do not attempt to reverse-engineer every UI button into S5.

Use minimum sufficient approved product baseline. Expand through R1 as
future changes touch additional areas.

---

## 38. S6 RELATIONSHIP

Establish current approved technical realization.

Start from verified factual architecture. Distinguish OBSERVED
ARCHITECTURE from APPROVED FUTURE TECHNICAL BASELINE.

---

## 39. NO ARCHITECTURE FICTION

Do not document intended architecture that does not exist as if it is
current factual architecture.

Keep factual/intended distinction.

---

## 40. S7 PROJECT MANIFEST

R7 should establish a concise current project manifest.

Do not make manifest a historical narrative.

---

## 41. ADR RULE FOR BROWNFIELD

Do NOT create fake historical ADRs.

Create ADR during adoption only for:

- current decision being explicitly confirmed
- new decision
- supersession
- future baseline adoption

Example: ADR-0001: "Adopt existing PostgreSQL persistence as current
baseline from AISE adoption."

Do not claim: "PostgreSQL was selected in 2018 because..." unless
evidence proves it.

---

## 42. S8 RELATIONSHIP

Brownfield adoption roadmap is FUTURE-ORIENTED. Do NOT reconstruct
fictional past milestones.

Capture: current outstanding delivery structure, future milestones,
known deferred work.

---

## 43. S9–S14 ARE NOT RETROACTIVELY REPLAYED

Do NOT create historical S9 work packages, S10 implementation
execution, S11 verification, S12 readiness, S13 deployments, or S14
closures for legacy work. Those protocols govern future delivery after
adoption.

---

## 44. INITIAL OPERATIONAL BASELINE

For a currently running system, R7 may establish an INITIAL ADOPTION
OPERATIONAL BASELINE.

This is NOT equivalent to claiming past S13/S14 compliance.

Record only verified current facts.

---

## 45. S14 PRINCIPLES MAY INFORM ADOPTION BASELINE

Reuse S14 factual-baseline principles: WHAT IS TRUE NOW, MAIN !=
PROD, no chat-dependent facts, migration state, configuration
references, findings, continuity. But label output as BROWNFIELD
ADOPTION BASELINE, not historical S14 release closure.

---

## 46. PROJECT_STATE

At successful adoption establish/update factual PROJECT_STATE.

Possible facts: AISE_ADOPTION_STATUS, AISE_ADOPTION_SCOPE,
CANONICAL_MAIN, CURRENT_PRODUCTION_BASELINE,
CURRENT_MIGRATION_STATE, CURRENT_RELEASE_STATE, KNOWN_BLOCKERS,
KNOWN_DIVERGENCES, CURRENT_ACTIVE_WORK, NEXT_RECOMMENDED_ROUTE.

---

## 47. NO INVENTED PROJECT_STATE

Do not record release verified, migration complete, production
baseline, Owner approval unless verified.

Use UNKNOWN explicitly where allowed.

---

## 48. CRITICAL BEHAVIOR BASELINE

For production/important systems identify only high-value contract
areas: authentication, authorization, critical calculations, data
ownership, destructive operations, billing/payment, primary user
journey, external contractual API.

---

## 49. EXISTING TEST BASELINE

Inventory relevant testing mechanisms.

Do not require high coverage percentage as adoption prerequisite.

---

## 50. TEST GAP

Missing tests are not automatically an adoption blocker.

A gap becomes blocking when it prevents trustworthy verification of a
material adopted contract.

---

## 51. CANONICAL VALIDATION PATH

For critical business behavior, verification must exercise actual
authoritative implementation path.

Do not create parallel implementation merely to prove expected output.

---

## 52. DATABASE BASELINE

Where project has database: DB technology, schema/migration mechanism,
current migration state, canonical migration location, critical
ownership/boundaries.

Do NOT redesign schema.

---

## 53. MIGRATION HISTORY

Legacy migration history may be imperfect. Do not rewrite old
migrations.

Determine what mechanism currently governs future migration.

If actual migration state materially untrusted: R3/R4.

---

## 54. NO DATABASE WRITE FOR ADOPTION

R7 discovery should be read-only by default. Do not repair rows,
apply migration, normalize data, change schema, or mark migrations
applied merely to establish adoption.

---

## 55. AUTHENTICATION / AUTHORIZATION BASELINE

Identify current auth mechanism where material. Determine: actors/roles,
server-side enforcement model, break-glass mechanisms, critical
privileges.

Do not conduct broad security audit automatically.

---

## 56. FANTOMAS / GHOST

Where project uses universal Fantomas/Ghost semantics: preserve
existing frozen AISE rule.

If brownfield project has a different break-glass mechanism: record
factual state.

Do NOT silently rename it Fantomas or grant new privileges.

---

## 57. EXTERNAL INTEGRATIONS

Map only material integrations: system, purpose, direction,
auth/config reference, failure dependency, owner where useful.

---

## 58. DEPLOYMENT BASELINE

Identify: platform, branch/artifact relationship, environment names,
production target, CI/CD mechanism, manual steps where factual.

Do not redesign deployment during adoption.

---

## 59. MANUAL DEPLOYMENT

A legacy manual deployment does not automatically block adoption.

Record it factually.

---

## 60. ENVIRONMENT BASELINE

Identify only materially relevant: local/development,
test/preview/staging, production. Do not create missing environments
automatically.

---

## 61. SECRETS / CONFIG

Record: configuration mechanisms, secret stores/references, required
environment categories.

Do not record secret values. Do not rotate credentials merely because
project is being adopted.

---

## 62. EXTERNAL PARAMETER GATE

Apply canonical External Parameter Gate during actual adoption.

If missing: EXTERNAL PARAMETER BLOCKER with exact resume point.

Do not ask Owner to paste secrets into chat by default.

---

## 63. TARGET VERIFICATION

Before any write:

TARGET NOT VERIFIED → NO WRITE.

---

## 64. MINIMUM PRIVILEGE

Brownfield discovery generally needs: repository read, existing docs,
read-only environment metadata, possibly read-only DB/schema
information.

---

## 65. EXISTING ACTIVE WORK

Brownfield adoption may encounter open branch, open PR, work in
progress, unreleased changes.

Do not delete or restart automatically.

Classify: TRUSTWORTHY/CONTINUABLE, OUT OF ADOPTION SCOPE,
UNTRUSTED → R3, CONTRACT UNCLEAR → R5/R4.

---

## 66. ACTIVE FEATURE DURING ADOPTION

If existing active work is sufficiently bounded and trustworthy:
adoption may establish baseline around it.

Do not require project to freeze unnecessarily.

---

## 67. DIRTY WORKTREE

Unexpected dirty worktree does not automatically mean adoption fails.

Determine whether changes belong to: user work, current authorized
unit, unknown state. If continuity untrusted: R3.

---

## 68. LEGACY BRANCHES

Do not clean/archive branches automatically.

Only identify branches needed to understand current canonical/release
state.

---

## 69. GIT HISTORY

Use history only where decision-relevant.

Do not perform exhaustive archaeology.

---

## 70. TECHNICAL DEBT

R7 may identify material debt affecting governability. Classify:
BLOCKING ADOPTION, NON-BLOCKING, UNKNOWN.

---

## 71. LEGACY FINDINGS

Classify: CRITICAL, HIGH, MODERATE, LOW. Normal closure requires
unresolved Critical = 0 and material High = 0. Moderate/Low may be
recorded.

---

## 72. LEGACY BUGS

Existing known bugs may remain after adoption.

Record where materially relevant. Future route: R1 or R2.

---

## 73. LEGACY DIVERGENCES

Existing factual/intended divergences may be carried explicitly when
non-blocking.

Each material divergence should have: known subject, status, risk,
next route.

---

## 74. UNKNOWN AREAS

Unknowns may remain if: outside current adoption boundary, low
materiality, not required for safe future work.

Record clearly.

---

## 75. ADOPTION COVERAGE

Use simple coverage statuses: VERIFIED, PARTIALLY VERIFIED, UNKNOWN,
OUT OF SCOPE.

Do NOT produce artificial percentages.

---

## 76. INCREMENTAL ADOPTION

A large project may be incrementally adopted.

Each boundary must be explicit. Do not claim entire project
AISE-managed after partial adoption.

---

## 77. ADOPTION EXPANSION

Expanding an existing AISE adoption boundary later routes through R7.

Do not use R1 alone for a subsystem that has never entered trustworthy
AISE baseline when baseline uncertainty is material.

---

## 78. MINIMUM CANONICAL ARTIFACT SET

Determine actual minimum needed. For typical full project: current
S4-style Charter, current S5 Product Requirements baseline, current
S6 Technical Specification baseline, S7 Project Manifest, ADRs only
where genuinely justified, future S8 Delivery Roadmap, factual
PROJECT_STATE, Brownfield Adoption Record.

Reuse existing canonical-equivalent artifacts when suitable.

---

## 79. BROWNFIELD ADOPTION RECORD

For material adoption, recommended:
`docs/engineering/BROWNFIELD_ADOPTION.md` with sections: Status,
Adoption Date/Effective Baseline, Adoption Scope, Repositories,
Factual Baseline, Production Baseline, Intended-State Sources, Trust
Classification, Canonical Artifacts Established, Legacy Divergences,
Known Unknowns, Findings, Deferred areas, Current Project State,
Future Governance, Next Route.

---

## 80. ADOPTION STATUS MODEL

Useful statuses: DISCOVERY, BASELINE_VERIFICATION,
INTENT_RECONSTRUCTION, OWNER_REVIEW, BASELINE_APPROVED,
CANONICALIZATION, ADOPTED/VERIFIED, ADOPTED/VERIFIED WITH
NON-BLOCKING FINDINGS, PARTIALLY ADOPTED, BLOCKED, REROUTED.

---

## 81. OWNER ROLE IN ADOPTION

Owner should approve material prospective baseline decisions.

Do not ask Owner to approve factual Git SHA or migration evidence that
can be objectively verified.

---

## 82. OWNER DOES NOT HAVE TO RE-DESIGN PROJECT

R7 should present concise unresolved decisions.

Agent performs evidence discovery. Owner decides only true
intent/authority questions.

---

## 83. INTENT RECONSTRUCTION

When current intended state is incomplete: combine evidence carefully.

Do not derive requirement solely from code because no document exists.

---

## 84. CURRENT TECHNICAL BASELINE APPROVAL

If no competing technical intent exists and Owner accepts observed
architecture as future baseline: record prospective approval.

Do not fabricate original rationale.

---

## 85. HISTORICAL DECISION UNKNOWN

Use: HISTORICAL RATIONALE UNKNOWN.

This is valid. Do not invent rationale.

---

## 86. CANONICALIZATION ORDER

VERIFY FACTUAL STATE → ESTABLISH PROJECT PURPOSE/BOUNDARY →
ESTABLISH CURRENT PRODUCT INTENT → ESTABLISH CURRENT TECHNICAL
BASELINE → RECORD CURRENT MANIFEST/DURABLE DECISIONS → ESTABLISH
FUTURE DELIVERY STRUCTURE IF NEEDED → RECORD FACTUAL PROJECT_STATE →
VERIFY ADOPTION BASELINE → CANONICALIZE → GOVERN FORWARD.

Do not mechanically replay S4–S14 as historical workflow.

---

## 87. FUTURE WORK AFTER ADOPTION

After successful adoption: normal planned change → R1, urgent defect
→ R2, lost/untrusted state → R3, unknown cause → R4, contract
divergence → R5, AISE governance change → R6, adoption-scope
expansion → R7.

---

## 88. EXISTING DEFECT AFTER ADOPTION

Adoption completion does not authorize fixing known findings.

NEXT RECOMMENDED != NEXT AUTHORIZED.

---

## 89. PROJECT IS NOT "CLEAN"

R7 verdict ADOPTED/VERIFIED does NOT mean bug-free, debt-free, fully
tested, fully documented, securely audited, or perfectly architected.

It means: sufficient trustworthy baseline exists for AISE-governed
future work.

---

## 90. BROWNFIELD BASELINE CLOSURE

Successful full adoption should establish: adoption scope known,
canonical repository known, current factual state sufficiently
verified, current intended baseline sufficiently approved, critical
divergences resolved/routed, current technical baseline known, future
governance entry routes known, factual project state recorded,
repository self-sufficient for continuation.

---

## 91. PARTIAL ADOPTION

PARTIALLY ADOPTED is valid only when boundary is explicit.

Do not call whole project canonical.

---

## 92. BLOCKED ADOPTION

R7 is BLOCKED when material baseline cannot be safely established.

Do not fabricate closure.

---

## 93. ADOPTION VERDICTS

ADOPTED/VERIFIED, ADOPTED/VERIFIED WITH NON-BLOCKING FINDINGS,
PARTIALLY ADOPTED/VERIFIED SCOPE, BLOCKED/BASELINE INCOMPLETE,
REROUTED/RECOVERY REQUIRED, REROUTED/INVESTIGATION REQUIRED,
REROUTED/CONTRACT DECISION REQUIRED, NO BROWNFIELD ADOPTION
REQUIRED.

---

## 94. NO BROWNFIELD ADOPTION REQUIRED

If project already has trustworthy AISE baseline: do not replay R7.

Route ordinary work through S2.

---

## 95. ADOPTION VERIFICATION

Before closure verify material baseline evidence.

Do not create giant verification campaign.

---

## 96. NO FALSE PASS FROM CI

CI PASS proves configured checks passed. It does NOT prove product
intent reconstructed, production baseline known, legacy contracts
correct, or migration state known.

---

## 97. REPOSITORY CONTINUITY

After adoption, a fresh agent must be able to clone canonical repo
and determine all governance facts WITHOUT CHAT.

---

## 98. NO CHAT-DEPENDENT BASELINE

Material adoption facts must be canonical. Do not leave Owner baseline
decision, adoption scope, critical unknown, production baseline, or
next governance route only in conversation.

---

## 99. RAW LEGACY MATERIAL CONTROL

Do not commit: huge log archives, database dumps, old chat exports,
entire ticket history, random screenshots, obsolete document
collections.

Store only decision-relevant canonical information.

---

## 100. SECURITY / PRIVACY

Do not copy into adoption artifacts: tokens, passwords, secret URLs,
private keys, full DB credentials, sensitive production records,
unnecessary personal data.

---

## 101. NO AUTOMATIC MODERNIZATION

R7 does NOT automatically modernize: framework, database, ORM,
deployment provider, auth provider, CSS framework, test framework,
CI.

---

## 102. NO AUTOMATIC REFACTOR

Do not refactor merely because existing code is ugly.

Only baseline it accurately.

---

## 103. NO AUTOMATIC TEST CAMPAIGN

Do not create tests for every module during R7.

---

## 104. NO AUTOMATIC DOCUMENTATION REWRITE

Do not rewrite every README/wiki/document.

Canonicalize only required current governance artifacts.

---

## 105. NO AUTOMATIC PROD ACTION

Brownfield adoption is read-only toward production by default.

---

## 106. NO AUTOMATIC SCHEDULED WORK

R7 must not create: nightly legacy audits, scheduled adoption scans,
periodic drift checks, background AI documentation, recurring
repository inventory, automatic technical-debt reviews — unless
OWNER explicitly authorizes exact automation.

---

## 107. ADOPTION RESUME POINT

If adoption blocks or pauses, record exact resume point.

---

## 108. MAIN ADVANCEMENT DURING ADOPTION

If origin/main advances during long adoption:

Determine material impact. Do not restart everything. Reverify affected
evidence only.

---

## 109. PRODUCTION CHANGE DURING ADOPTION

If production changes during adoption:

Previous evidence may become stale. Verify new factual baseline where
material.

---

## 110. ADOPTION AND RELEASE HISTORY

Preserve legacy release history where known.

Do not convert historical release notes into fake S12/S13 records.

---

## 111. ADOPTION AND ADR HISTORY

Preserve historical ADRs if they genuinely exist.

Do not recreate missing historical decisions.

---

## 112. BROWNFIELD TECHNICAL DEBT BACKLOG

A useful adoption result may identify future backlog.

But BACKLOG != AUTHORIZED WORK.

---

## 113. BROWNFIELD RISK ACCEPTANCE

If Owner accepts a known non-blocking legacy risk:

Record risk factually. Risk acceptance does not convert defect into
desired behavior.

---

## 114. ADOPTION EFFECTIVE POINT

A successful adoption must have an effective canonical point.

Default: AFTER ADOPTION ARTIFACTS ARE MERGED + ADOPTION VERIFICATION
PASSES.

No backdating.

---

## 115. GOVERNANCE FORWARD RULE

**Freeze:**

LEGACY HISTORY REMAINS LEGACY HISTORY.

FROM ADOPTION EFFECTIVE POINT FORWARD: AISE GOVERNANCE APPLIES.

Future agent cannot justify new non-compliance by saying "the old
project used to do it this way."

---

## 116. R7 ROUTE OUTPUT

For actual brownfield adoption, agent should be able to state:

```
ROUTE: R7 EXISTING PROJECT / BROWNFIELD ADOPTION
ADOPTION SUBJECT: <subject>
ADOPTION MODE: <mode>
ADOPTION SCOPE: <scope>
CANONICAL REPOSITORY: <repo>
CANONICAL MAIN: <branch>
PRODUCTION SYSTEM: YES / NO / UNKNOWN
PRODUCTION BASELINE: <baseline or UNKNOWN>
FACTUAL BASELINE: <summary>
TRUST CLASSIFICATION: <classification>
CURRENT INTENDED-STATE SOURCES: <sources>
INTENDED-STATE GAPS: <gaps>
CURRENT TECHNICAL BASELINE: <baseline>
MIGRATION STATE: <state>
LEGACY DIVERGENCES: <divergences>
KNOWN UNKNOWNS: <unknowns>
BLOCKING FINDINGS: <findings>
CANONICAL ARTIFACTS TO CREATE/UPDATE: <artifacts>
OWNER DECISIONS REQUIRED: <decisions>
ADOPTION VERDICT: <verdict>
EFFECTIVE POINT: <point>
NEXT ROUTE: <route>
```

---

## 117. VALIDATION SCENARIOS

Validate R7 deterministically.

---

### R7-01 — EXISTING REPO, NO AISE GOVERNANCE

Legacy repo with code but no AISE artifacts.

**Expected:** DISCOVERY → factual baseline → minimum canonical
artifacts → ADOPTED/VERIFIED.

**PASS**

---

### R7-02 — LEGACY PRODUCTION APP

Running production app with unknown deployment commit.

**Expected:** R7 establishes production baseline via evidence. If
unverifiable → R3.

**PASS**

---

### R7-03 — PROJECT INHERITED FROM ANOTHER TEAM

New team inherits repo with stale docs.

**Expected:** Factual state discovered. Stale docs classified STALE.
Baseline from evidence.

**PASS**

---

### R7-04 — PROTOTYPE BECOMING PRODUCTION

Prototype never AISE-governed. Now must go production.

**Expected:** R7 adoption. No S3 replay. Baseline from prototype
facts.

**PASS**

---

### R7-05 — EXISTING AISE-MANAGED PROJECT

Project already has trustworthy AISE baseline.

**Expected:** NO BROWNFIELD ADOPTION REQUIRED. Route through S2/R1.

**PASS**

---

### R7-06 — NEW PROJECT FROM ZERO

No existing code/repository.

**Expected:** R7 is wrong route. Use S3.

**PASS**

---

### R7-07 — URGENT PROD DEFECT DURING ADOPTION

Discovery reveals critical production bug.

**Expected:** R2 takes priority. R7 pauses with resume point.

**PASS**

---

### R7-08 — REPOSITORY IDENTITY UNVERIFIABLE

Remote, branch, HEAD cannot be trusted.

**Expected:** R3. No baseline on uncertain facts.

**PASS**

---

### R7-09 — MIGRATION STATE MATERIALLY UNKNOWN

DB migration state cannot be determined.

**Expected:** R3 or R4. No assumption of completeness.

**PASS**

---

### R7-10 — CONTRACT DIVERGENCE DISCOVERED

Factual behavior contradicts documented requirement.

**Expected:** R5. Record divergence. No silent reconciliation.

**PASS**

---

### R7-11 — UNKNOWN CAUSE OF INCONSISTENCY

Discrepancy observed but root cause unknown.

**Expected:** R4. R7 is not unlimited debugging.

**PASS**

---

### R7-12 — OWNER ACCEPTS LEGACY BEHAVIOR

Undocumented behavior. Owner confirms it should continue.

**Expected:** ADOPTED CURRENT BEHAVIOR from baseline. No historical
authorization claim.

**PASS**

---

### R7-13 — OWNER REJECTS LEGACY BEHAVIOR

Owner determines current factual behavior is wrong.

**Expected:** Record divergence. No fix during adoption. Route via
R1/R5 for future correction.

**PASS**

---

### R7-14 — RETROACTIVE ADR CREATION

Agent proposes ADR dated 2021 for pre-adoption decision.

**Expected:** PROHIBITED. No historical ADR without evidence.

**PASS**

---

### R7-15 — RETROACTIVE S9 WORK PACKAGE

Agent creates S9 work package for feature shipped before adoption.

**Expected:** PROHIBITED. S9–S14 govern future delivery only.

**PASS**

---

### R7-16 — RETROACTIVE RELEASE READINESS

Agent creates S12 for historical deployment.

**Expected:** PROHIBITED. No historical compliance claim.

**PASS**

---

### R7-17 — AUTOMATIC REFACTORING DURING ADOPTION

Agent refactors legacy code while establishing baseline.

**Expected:** PROHIBITED. R7 baselines, not rewrites. Route via R1.

**PASS**

---

### R7-18 — AUTOMATIC TEST CAMPAIGN

Agent creates tests for every module during R7.

**Expected:** PROHIBITED. Test gaps non-blocking unless they prevent
verification of material adopted contract.

**PASS**

---

### R7-19 — AUTOMATIC MODERNIZATION

Agent upgrades framework during R7 adoption.

**Expected:** PROHIBITED. R7 does not modernize. Route via R1.

**PASS**

---

### R7-20 — MAIN = PRODUCTION ASSUMED

Agent assumes main commit equals production deployment.

**Expected:** PROHIBITED. Verify production baseline independently.

**PASS**

---

### R7-21 — CI PASS FALSE CONFIDENCE

CI passes. Agent declares intent fully reconstructed.

**Expected:** PROHIBITED. CI pass ≠ intent reconstruction or
production baseline knowledge.

**PASS**

---

### R7-22 — CHAT-DEPENDENT BASELINE

Adoption scope recorded only in conversation.

**Expected:** PROHIBITED. Material facts must be canonical.

**PASS**

---

### R7-23 — SECRETS IN ADOPTION ARTIFACTS

Agent copies DB credentials into BROWNFIELD_ADOPTION.md.

**Expected:** PROHIBITED. References only, never values.

**PASS**

---

### R7-24 — SCHEDULED LEGACY AUDIT CREATED

Agent creates nightly drift-check cron during adoption.

**Expected:** PROHIBITED. No automatic scheduled work.

**PASS**

---

### R7-25 — DATABASE WRITE DURING DISCOVERY

Agent applies missing migrations to establish baseline.

**Expected:** PROHIBITED. R7 discovery is read-only toward DB.

**PASS**

---

### R7-26 — SCOPED ADOPTION BOUNDARY VIOLATION

Only API adopted. Agent claims entire platform AISE-managed.

**Expected:** PROHIBITED. Claim only within adoption boundary.

**PASS**

---

### R7-27 — PARTIAL ADOPTION WITHOUT BOUNDARY

Adoption stops midway without defining what is adopted.

**Expected:** PROHIBITED. Partial adoption requires explicit boundary.

**PASS**

---

### R7-28 — DIRTY WORKTREE

R7 encounters uncommitted changes.

**Expected:** Classify changes. If untrusted → R3. Not automatic
failure.

**PASS**

---

### R7-29 — ACTIVE PR DURING ADOPTION

Open PR on canonical branch.

**Expected:** Classify appropriately. Do not delete.

**PASS**

---

### R7-30 — MAIN ADVANCES DURING LONG ADOPTION

New commits merged to main during R7.

**Expected:** Reverify affected evidence only. No full restart.

**PASS**

---

### R7-31 — PRODUCTION CHANGES DURING ADOPTION

New deployment while R7 gathers production baseline.

**Expected:** Reverify where material.

**PASS**

---

### R7-32 — LEGACY DOCUMENT BECOMES CANONICAL

Widely-used wiki treated as authoritative S5.

**Expected:** Verify approval/following/supersession. Age ≠ authority.

**PASS**

---

### R7-33 — CODE TREATED AS PRODUCT INTENT

Agent derives requirements from code alone.

**Expected:** PROHIBITED. Code = factual behavior, not approved intent.

**PASS**

---

### R7-34 — INTENDED STATE UNKNOWN

No authoritative requirements for a module.

**Expected:** INTENDED STATE UNKNOWN. No fabricated requirements.

**PASS**

---

### R7-35 — HISTORICAL RATIONALE UNKNOWN

No evidence for why PostgreSQL was chosen.

**Expected:** HISTORICAL RATIONALE UNKNOWN. Do not invent rationale.

**PASS**

---

### R7-36 — BROWNFIELD ADOPTION AS CLEANUP

Agent proposes fixing all bugs/debt during R7.

**Expected:** PROHIBITED. Adoption = governance baseline. Cleanup
via R1/R2.

**PASS**

---

### R7-37 — FANTOMAS RENAME

Legacy uses "admin-override" break-glass. Agent renames it Fantomas.

**Expected:** PROHIBITED. Record factual mechanism. No silent rename.

**PASS**

---

### R7-38 — TARGET NOT VERIFIED

Agent writes to unverified repository.

**Expected:** PROHIBITED. TARGET NOT VERIFIED → NO WRITE.

**PASS**

---

### R7-39 — OWNER ASKED TO RE-DESIGN PROJECT

R7 presents 200 questions about every feature.

**Expected:** PROHIBITED. Owner decides only intent/authority
questions.

**PASS**

---

### R7-40 — BACKDATED ADOPTION EFFECTIVE POINT

Agent sets effective date to three months ago.

**Expected:** PROHIBITED. No backdating.

**PASS**

---

### R7-41 — ADOPTION EXPANSION VIA R1

Need to adopt adjacent worker with unknown baseline.

**Expected:** Route via R7, not R1 alone. Baseline uncertainty
material.

**PASS**

---

### R7-42 — ADOPTION RESUME POINT

R7 blocks at OWNER_REVIEW. Session ends.

**Expected:** Exact resume point recorded.

**PASS**

---

### R7-43 — NO AUTOMATIC DOCUMENTATION REWRITE

Agent rewrites all README/wiki/CONTRIBUTING during R7.

**Expected:** PROHIBITED. Canonicalize only governance artifacts.

**PASS**

---

### R7-44 — VERDICT DOES NOT MEAN CLEAN

ADOPTED/VERIFIED. Agent interprets as bug-free/debt-free.

**Expected:** PROHIBITED. ADOPTED/VERIFIED = sufficient governance
baseline, not perfection.

**PASS**

---

## 118. ANTI-RETROACTIVE-ADOPTION GATE

Verify R7 does NOT automatically:

1. treat existing project as if created today
2. replay S3 as historical fiction
3. claim old commits/deployments/decisions/releases followed AISE
4. manufacture historical work packages, Owner GO, or verification
5. create fake historical ADRs or rationale
6. backdate adoption effective point
7. derive product intent solely from code
8. treat legacy document/CI/tests as automatically canonical/authoritative
9. fabricate requirements or rationale where none exist
10. reconstruct fictional past milestones
11. claim non-adopted areas or partial adoption as full AISE-managed
12. leave material adoption facts only in chat
13. convert historical release notes into fake S12/S13 records
14. establish baseline on materially uncertain facts
15. treat NEXT RECOMMENDED as NEXT AUTHORIZED
16. justify future non-compliance by legacy precedent

**ALL PASS**

---

## 119. BROWNFIELD ADOPTION QUALITY GATE

Before material R7 may close ADOPTED/VERIFIED:

| Gate Item | Requirement |
|---|---|
| Adoption subject/scope/boundary | IDENTIFIED/EXPLICIT/RECORDED |
| Canonical repository/main | VERIFIED/KNOWN |
| Factual baseline | SUFFICIENT |
| Production system | YES/NO/KNOWN |
| Production baseline / migration state | KNOWN or UNKNOWN w/ justification |
| Intended-state sources/gaps | IDENTIFIED/RECORDED |
| Technical baseline | KNOWN or UNKNOWN w/ justification |
| Trust classification | ASSIGNED |
| Legacy divergences / known unknowns | RECORDED, routed where material |
| Blocking/Critical/Material-high findings | 0 |
| Owner decisions | AVAILABLE where required |
| Canonical artifacts | MINIMUM SUFFICIENT SET established |
| PROJECT_STATE | RECORDED factually |
| Chat-dependent baseline / retroactive claims / retroactive ADRs / backdating | 0 |
| Automatic modernization/refactor/test/doc-rewrite/prod/scheduled | 0 |
| Database writes during discovery / secrets in artifacts | 0 |
| Target verified | YES before any write |
| External parameter blockers | 0 before canonical operation |
| Repository self-sufficient | YES for continuation |
| Adoption effective point | DEFINED, not backdated |
| Future governance routes | KNOWN |

**ALL PASS**

---

## 120. PARTIAL ADOPTION QUALITY GATE

Before R7 may close PARTIALLY ADOPTED/VERIFIED SCOPE:

| Gate Item | Requirement |
|---|---|
| Partial boundary | EXPLICIT |
| What IS adopted | SPECIFIED |
| What is NOT adopted | SPECIFIED |
| Shared dependencies | IDENTIFIED |
| Claims limited to adopted scope | VERIFIED |
| Adopted scope meets full quality gate | YES for adopted scope only |
| Non-adopted areas | Not claimed as AISE-managed |
| Expansion path | IDENTIFIED |

**ALL PASS**

---

## 121. ADOPTION BLOCKED GATE

When R7 is BLOCKED:

| Gate Item | Requirement |
|---|---|
| Blocker | IDENTIFIED |
| Evidence | RECORDED |
| Resume point | EXPLICIT |
| Reroute | R3/R4/R5 if appropriate |
| No fabricated closure | VERIFIED |

**ALL PASS**

---

## 122. ADOPTION VERIFICATION GATE

Before final ADOPTED/VERIFIED closure:

| Gate Item | Requirement |
|---|---|
| Material baseline evidence / canonical artifacts merged | VERIFIED/YES |
| Post-merge repository state | CONSISTENT |
| Fresh-agent continuity | PASS (clone + determine governance w/o chat) |
| PROJECT_STATE | CURRENT and FACTUAL |
| No verification evasion | VERIFIED |

**ALL PASS**

---

## 123. LEGACY FINDINGS CLASSIFICATION GATE

| Severity | Adoption Requirement |
|---|---|
| CRITICAL | Must resolve before ADOPTED/VERIFIED |
| HIGH | Material High must resolve before ADOPTED/VERIFIED |
| MODERATE | May be recorded and deferred |
| LOW | May be recorded and deferred |

---

## 124. ADOPTION COVERAGE GATE

Do NOT produce artificial coverage percentages, compliance scorecards,
maturity level numbers, or progress percentages.

Use only: VERIFIED, PARTIALLY VERIFIED, UNKNOWN, OUT OF SCOPE.

---

## 125. SIZE / USABILITY

Keep R7 comprehensive but operational.

Target approximately: 4100–5300 words. Clarity wins over arbitrary
word count.

Avoid: enterprise adoption framework, mandatory maturity assessment,
mandatory full audit before governance, comprehensive test-coverage
prerequisite, architecture-review board, complete PRD reconstruction,
historical archaeology requirement, cleanup-everything mandate,
blanket modernization plan, automatic scheduled governance.
