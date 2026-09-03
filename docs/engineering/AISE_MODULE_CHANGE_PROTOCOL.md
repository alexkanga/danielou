# AISE — MODULE / CHANGE PROTOCOL (R1)

**Authority:** Subordinate to S0. Used after S14 for changes to existing AISE-managed projects.
**Status:** ACTIVE PILOT

---

## 1. PURPOSE

R1 answers: **HOW SHOULD A NORMAL INTENTIONAL CHANGE TO AN EXISTING AISE-MANAGED PROJECT BE ROUTED AND DELIVERED WITHOUT REPLAYING THE ENTIRE PROJECT LIFECYCLE?**

R1 determines:
- What existing canonical state remains valid
- What canonical layer is first affected
- What must be updated
- What may be reused
- What delivery path is required
- Where the authorized change stops

---

## 2. R1 IS A ROUTE, NOT A NEW DELIVERY SPINE

**R1 does NOT replace S4–S14.** R1 orchestrates selective re-entry into the existing delivery spine.

Canonical principle:

**REUSE VALID BASELINE → ENTER AT EARLIEST ACTUALLY AFFECTED LAYER → CONTINUE ONLY AS FAR AS AUTHORIZED**

R1 is a routing protocol. It identifies where to enter the spine and how far to proceed. It does not construct a parallel delivery path.

---

## 3. DO NOT REPLAY S3→S14 BY DEFAULT

A change does NOT automatically require:
- New charter (S3/S4)
- New PRD (S5)
- New tech spec (S6)
- New manifest/ADR (S7)
- New roadmap (S8)
- New release (S12)
- New deployment (S13)

**Determine what is materially affected.** Enter only at the earliest affected layer. Proceed only through layers that require change.

---

## 4. R1 ROUTE FIT

R1 is appropriate when ALL of the following hold:
- Project has trustworthy baseline
- Change is intentional and planned
- Scope can be bounded
- Project identity remains the same
- No active unrecovered incident
- No unresolved unknown root cause
- No contract divergence requiring R5
- Not purely a governance change

---

## 5. R1 IS NOT THE RIGHT ROUTE WHEN

- **NEW PROJECT** → S3
- **Urgent production hotfix** → R2
- **Recovery** → R3
- **Unknown cause** → R4
- **Contract divergence** → R5
- **Governance** → R6
- **Brownfield** → R7

Select the correct route first. R1 applied to the wrong scenario produces wrong outcomes.

---

## 6. PLANNED BUG FIX VS HOTFIX

- **Known non-emergency defect** → R1 (planned fix within normal delivery)
- **Urgent production defect** → R2 (hotfix protocol)
- **Unknown cause** → R4 first (investigate), then route appropriately

Do not upgrade a planned fix to hotfix urgency. Do not downgrade a hotfix to planned pace.

---

## 7. VERIFIED CHANGE BASELINE

Before routing, verify relevant factual state from:
- Canonical repository / main HEAD
- PROJECT_STATE
- Production baseline
- Last release
- Current roadmap
- Existing requirements (S5)
- Tech spec (S6)
- Manifest / ADRs (S7)
- Existing implementation
- Active work packages
- Related open PRs

**Only inspect what is relevant.** Do not audit the entire project for every change.

---

## 8. CHANGE REQUEST NORMALIZATION

Translate the change request into concise change intent:
- **CHANGE OBJECTIVE** — what must be different after the change
- **EXPECTED OUTCOME** — what success looks like
- **AFFECTED USERS/ACTORS** — who is impacted
- **KNOWN BUSINESS RULE / DATA / PERMISSION / INTERFACE IMPACT** — what constraints shift
- **EXPECTED DELIVERY BOUNDARY** — how far this change is authorized to go

**Do NOT invent requirements.** Record only what the request actually states.

---

## 9. CHANGE ENVELOPE

A bounded context answering:
- What outcome is requested
- What is IN scope
- What is OUT of scope
- What existing canonical artifacts govern this change
- What must potentially change
- How far delivery is authorized

**Must NOT duplicate full S9 work package.** The envelope is a routing artifact, not an implementation contract.

---

## 10. OPTIONAL CHANGE IDENTIFIER

- For changes spanning multiple WPs / milestones / sessions: **CHG-001, CHG-002, …**
- For simple one-WP changes: **do NOT force a separate CHG artifact** when S9 provides sufficient traceability

The change identifier supports cross-session continuity. It is not a mandatory ceremony for trivial work.

---

## 11. IMPACT SCAN

Assess material impact across these dimensions:
- PROJECT / CHARTER
- PRODUCT REQUIREMENTS
- BUSINESS RULES
- TECHNICAL ARCHITECTURE
- DURABLE DECISIONS
- DATA MODEL / MIGRATIONS
- PERMISSIONS
- INTERFACES / API
- EXTERNAL INTEGRATIONS
- UI / USER FLOW
- NFR (non-functional requirements)
- ROADMAP / MILESTONES
- IMPLEMENTATION
- VERIFICATION
- RELEASE
- PRODUCTION

**Do not automatically modify every layer marked "possible."** Mark "affected" only when material change is required. "Possible" is not "required."

---

## 12. EARLIEST AFFECTED CANONICAL LAYER

**What is the earliest existing canonical layer that no longer fully represents the approved change?**

Begin there. Everything before that layer remains valid and is reused without modification.

This is the R1 entry point. It is determined by the impact scan, not by convention or habit.

---

## 13. ROUTING MATRIX

| Condition | Route |
|---|---|
| A. Project purpose / boundary changes | Re-enter S4 → S5 → downstream |
| B. Product behavior not yet approved | Re-enter S5 |
| C. Product contract already covers change | Do NOT rewrite S5 |
| D. Technical baseline changes | Re-enter S6 → S7/ADR |
| E. Technical baseline still valid | Do NOT rewrite architecture |
| F. Roadmap does not cover delivery | Re-enter S8 |
| G. Roadmap already covers change | Reuse milestone, proceed to S9 |
| H. Exact implementation unit | S9 mandatory before S10 unless valid WP exists |

Apply the matrix top-down. First matching condition determines entry point.

---

## 14. CHANGE ROUTE EXAMPLES

**Example 1 — Add filter to existing results page:**
S5 covers filtering. S6 unchanged. S8 milestone covers results module.
→ Route: S9 → S10 → S11

**Example 2 — New grading rule:**
S4 unchanged. S5 does not contain the rule.
→ Route: S5 → evaluate S6/S7 → S8 if needed → S9 → S10 → S11

**Example 3 — Replace database architecture:**
→ Route: S6 → S7/ADR → S8 if needed → S9 → downstream

---

## 15. PRESERVE VALID UPSTREAM ARTIFACTS

**NO CHANGE → NO REWRITE.**

Do NOT touch S4–S8 merely to make a change "look complete." If a layer is valid, it remains valid. Rewriting valid artifacts is waste and introduces risk.

---

## 16. NO CEREMONY TAX

Minimize process overhead. Do NOT:
- Create new charter for every feature
- Create new architecture spec for every endpoint
- Create new ADR for every helper function
- Create new milestone for every small UI change
- Create new change record for every WP
- Produce release documentation when no release is intended

Ceremony must be proportional to material impact.

---

## 17. S4 RE-ENTRY

**Exceptional.** Only when project discovery / charter materially changes:
- New primary target group
- Major mission expansion
- Fundamentally different product boundary

Do not re-enter S4 for feature additions, bug fixes, or technical changes within the existing project boundary.

---

## 18. S5 RE-ENTRY

When approved product intent changes:
- New requirement
- Changed business rule
- New permission semantics
- Changed calculation
- New user flow
- New integration behavior

**Update only affected requirements.** Do not rewrite the entire PRD.

---

## 19. S6 RE-ENTRY

When technical realization materially changes:
- New service boundary
- Persistence architecture change
- Queue architecture change
- Auth architecture change
- Data model strategy change
- Integration architecture change

**NOT for:** new function, new class, new file. These are S9/S10 implementation concerns.

---

## 20. S7 / ADR RE-ENTRY

When current approved technical baseline facts change:
- Create ADR for new material durable decisions
- Supersede ADR when a prior decision is reversed

**Do NOT rewrite accepted ADR history.** ADRs are append-only records of decisions, not living documents to be continuously revised.

---

## 21. S8 RE-ENTRY

When delivery structure changes materially:
- New milestone required
- Changed dependency ordering
- New release grouping
- Large change requiring decomposition

**Reuse existing milestone** if it supports the delivery unit. Do not create a milestone per ticket.

---

## 22. S9 IS THE IMPLEMENTATION CONTRACT

**R1 does NOT become the detailed implementation contract.** S9 owns:
- Exact scope
- In / out of scope
- Business rules
- Data / permission semantics
- Technical boundaries
- Acceptance contract
- Verification expectations
- Forbidden expansion

R1 routes to S9. S9 defines what implementation must deliver.

---

## 23. MULTIPLE WORK PACKAGES

One change may require multiple WPs.

- **Prefer one coherent verified WP at a time.**
- **Do NOT open every branch simultaneously.**
- Sequence: deliver WP1 → verify → close → proceed to WP2.

---

## 24. OWNER AUTHORIZATION ENVELOPE

Owner may authorize: one WP, one milestone, one bounded change.

Within clear authorization, agent may proceed autonomously through **NON-PRODUCTION work (S9–S12)** without ceremonial GO at every stage, provided:
- Scope unchanged
- No blocking divergence
- External capabilities available
- Quality gates pass

---

## 25. MATERIAL EXPANSION REQUIRES NEW DECISION

Existing authorization does NOT cover:
- Materially new feature
- New business rule
- New architecture decision
- New data ownership
- Permission expansion
- New external integration
- Scope expansion
- Production operation

**STOP and return to appropriate route.** Do not absorb expansion into current authorization.

---

## 26. PRODUCTION REMAINS A SEPARATE HARD GATE

**S13 production deployment requires EXPLICIT OWNER PROD GO** regardless of R1 authorization.

The following are **NOT sufficient** for production deployment:
- "GO R1"
- "continue"
- "complete the module"
- "finish autonomously"
- "S12 ready"
- "merge"

Only **OWNER PROD GO** authorizes S13.

---

## 27. R1 TERMINAL BOUNDARY

Not every R1 change must reach production. Valid terminal boundaries:
- **CONTRACT READY** — upstream artifacts updated, no implementation yet
- **IMPLEMENTED** — code delivered, not yet verified
- **VERIFIED** — tests pass, acceptance criteria met
- **READY FOR RELEASE** — S12 pre-release verification complete
- **PRODUCTION DEPLOYED** — S13 complete
- **BASELINE CLOSED** — S14 factual baseline updated

**R1 must not push farther than authorized.**

---

## 28. VERIFIED BUT NOT RELEASED

**Legitimate R1 outcome:** IMPLEMENTATION VERIFIED, RELEASE NOT REQUESTED / NOT AUTHORIZED.

Do not pretend verified code is production. Do not run S12/S13 without release authorization.

---

## 29. RELEASE-INTENDED CHANGE

If change is intended for release: S11 → S12.

S12 determines RC readiness. **Do not jump from code merge to production.** S12 exists for a reason.

---

## 30. PRODUCTION CHANGE

When S12 READY and OWNER PROD GO: **S13.**

After successful production: **S14 closes new factual baseline.**

---

## 31. R1 CLOSURE MODES

- ROUTED — entry point determined, not yet started
- AUTHORIZED — owner authorization received
- IN DELIVERY — downstream work in progress
- VERIFIED / NOT RELEASED — implementation verified, release not requested
- READY FOR RELEASE — S12 complete
- RELEASED / BASELINE CLOSED — S13/S14 complete
- BLOCKED — cannot proceed, blocker identified
- REROUTED — scenario mismatch, rerouted to R2–R7
- DEFERRED — authorized but not started

**Status must reflect factual progress.** Not aspiration, not plan.

---

## 32. CHANGE CLOSURE

Complete when:
- Requested outcome reached
- Downstream verification passed
- No blocking contract divergence
- State recorded
- **Next work NOT started automatically**

---

## 33. DATA / MIGRATION IMPACT

- Use existing S6/S9 semantics for data model changes
- Canonical migration process only
- Actual migration executed at appropriate implementation / release stage
- Do not ad-hoc database changes

---

## 34. PERMISSION IMPACT

- New / changed permission semantics → **require S5 coverage**
- Technical realization must be consistent with S6/S7
- **Do not treat UI hiding as authorization.** Visibility ≠ permission.

---

## 35. CALCULATION / BUSINESS RULE IMPACT

- **S5 must contain authoritative intended behavior before implementation.**
- R1 must NOT allow implementation output to redefine the rule.
- Preserve explicitly: inputs, inclusion/exclusion criteria, missing value semantics, precision, rounding rules, thresholds, ranking logic.

---

## 36. UI CHANGE IMPACT

UI-only implementation may enter at S9 when:
- Approved behavior already covers the UI change
- No new business rule
- No new permission rule
- No new architecture decision
- No new roadmap structure

---

## 37. API / INTEGRATION IMPACT

- **New external behavior** → S5 contract update
- **Technical integration architecture change** → S6/S7
- Distinguish: new product requirement vs. existing requirement implementation

---

## 38. NFR IMPACT

- Re-enter S5/S6 **only if** approved NFR changes OR change materially affects existing NFR contract
- **Measure before optimizing.** Do not optimize against an NFR that has not been measured and found deficient.

---

## 39. INSPECT / REUSE

Preserve S10 doctrine:
- **INSPECT EXISTING** — check what already works
- **REUSE VERIFIED CORRECT CODE** — do not duplicate
- **MINIMUM SUFFICIENT CHANGE** — smallest change that satisfies the requirement

**Do not create a duplicate module merely because "new change."**

---

## 40. TEST / EVIDENCE PRESERVATION

**FAILED TEST → CAUSE UNKNOWN → INVESTIGATE.**

Never:
- Adapt a valid expected test to match defective implementation
- Adapt fixtures to manufacture a pass
- Disable a quality gate
- Exclude failing source from test scope
- Change test environment to produce PASS

---

## 41. DEFECT DISCOVERED DURING R1

- **Inside authorized scope and correctable without material expansion** → fix within S10
- **Outside scope** → classify and route separately (may be R1, R2, or R4)

---

## 42. UNKNOWN CAUSE DURING R1

→ **R4 investigation.**

Do not force R1 to guess. R1 may pause and resume after investigation completes.

---

## 43. CONTRACT DIVERGENCE DURING R1

→ **R5.**

Do not silently rewrite intended documentation or implementation to eliminate divergence. Divergence is a signal, not an inconvenience.

---

## 44. HOTFIX ESCALATION

→ **R2.**

Do not transform a normal R1 into improvised emergency mode. If the situation requires hotfix protocol, reroute.

---

## 45. RECOVERY ESCALATION

→ **R3.**

**Preserve S0 Restart Rule.** Do not improvise recovery within R1.

---

## 46. GOVERNANCE CHANGE ESCALATION

→ **R6.**

R1 is for project/module change. Governance mutation is a different protocol.

---

## 47. BROWNFIELD BOUNDARY

**No trustworthy baseline → do NOT pretend R1 can operate safely → R7.**

R1 requires verified canonical state. Without it, R1 cannot determine valid entry point or reusable artifacts.

---

## 48. EXTERNAL PARAMETER GATE

- Apply canonical gate
- Proceed autonomously until actual required external boundary
- Inspect existing capability
- If absent: **EXTERNAL PARAMETER BLOCKER** with exact **RESUME POINT**

Do not halt at hypothetical boundaries. Halt only at actual required external dependencies.

---

## 49. ENVIRONMENT / TARGET CONTROL

**TARGET NOT VERIFIED → NO WRITE.**

Credential available ≠ target verified. Verify target state before any write operation.

---

## 50. BRANCH / WORKTREE DISCIPLINE

- **ONE agent, ONE worktree, ONE git writer**
- Start from verified authorized base
- Do not mix unrelated changes in one branch

---

## 51. CANONICAL MAIN ADVANCEMENT

If blocked and origin/main advances: **reverify material compatibility before resuming.**

Do not assume compatibility. Do not force-merge without verification.

---

## 52. PROJECT_STATE

Update factual state per actual progress. States:
- CHANGE AUTHORIZED
- WP IN DELIVERY
- VERIFIED / NOT RELEASED
- RELEASE READY
- PRODUCTION DEPLOYED
- BASELINE CLOSED

**Only record what is true.** Not what is planned, hoped, or aspirational.

---

## 53. NO CHAT-DEPENDENT CHANGE STATE

**Material routing decision must NOT exist only in conversation memory.**

Record in proper canonical artifact. If it matters for routing, it matters for the repository.

---

## 54. OPTIONAL CHANGE RECORD

For material multi-WP changes: `docs/planning/changes/CHG-<ID>.md`

**Do NOT create when it duplicates a single S9 WP.** One WP = one WP artifact, not WP + CHG.

---

## 55. R1 ROUTE DECISION OUTPUT

Before downstream work, state explicitly:
- **ROUTE** — R1 confirmed
- **CHANGE OBJECTIVE** — what is changing
- **VERIFIED BASELINE** — what was inspected
- **EARLIEST AFFECTED LAYER** — entry point
- **UPSTREAM ARTIFACTS REUSED** — what stays unchanged
- **ARTIFACTS REQUIRING UPDATE** — what must change
- **DOWNSTREAM PATH** — layers to traverse
- **AUTHORIZED TERMINAL BOUNDARY** — where delivery stops
- **PRODUCTION AUTHORIZATION** — NO unless OWNER PROD GO
- **BLOCKERS** — known impediments or NONE

---

## 56. OWNER INTERRUPTION POLICY

**Do NOT ask at every mechanical step.**

Escalate only for:
- Blocking ambiguity
- Material scope expansion
- Contract change
- Unauthorized architecture decision
- Risk exception
- Production authorization
- Unrecoverable state
- External parameter needed

---

## 57. NO AUTOMATIC FUTURE WORK

At closure, do NOT:
- Start another module / milestone
- Open backlog issue
- Run audit
- Perform refactor
- Start R2–R7

**New work returns through S1/S2.**

---

## 58. ZERO SCHEDULED WORK

No:
- Cron
- Scheduled development
- Recurring review
- Background monitoring
- Periodic audit
- Automatic backlog execution

Unless OWNER explicitly authorizes.

---

## 59. ACTUAL R1 QUALITY PRINCIPLE

R1 is successful when:
- Only necessary upstream contracts changed
- Authorized scope preserved
- Valid architecture reused
- Exact WP contract exists
- Implementation verified
- Release state factual
- Production separately authorized
- Repository continuity preserved

---

## 60. VALIDATION SCENARIOS

### R1-01: Existing requirement and milestone cover the change
**Scenario:** Change is covered by existing S5 requirement and S8 milestone.
**Expected:** Enter at S9. Do not rewrite S5, S6, or S8.
**Verdict:** PASS

### R1-02: New product requirement needed
**Scenario:** Change introduces behavior not in S5.
**Expected:** Re-enter S5. Then route downstream as needed.
**Verdict:** PASS

### R1-03: Charter expansion required
**Scenario:** Change expands project purpose or primary target group.
**Expected:** Re-enter S4.
**Verdict:** PASS

### R1-04: Architecture change required
**Scenario:** Change requires new service boundary or persistence strategy.
**Expected:** Re-enter S6 → S7/ADR.
**Verdict:** PASS

### R1-05: Technical baseline still valid
**Scenario:** Change is implementation-level; architecture is unaffected.
**Expected:** Do not rewrite S6 or S7.
**Verdict:** PASS

### R1-06: Roadmap gap
**Scenario:** No existing milestone covers the delivery unit.
**Expected:** Re-enter S8.
**Verdict:** PASS

### R1-07: Valid existing work package
**Scenario:** A WP already exists for this exact change.
**Expected:** Reuse WP. No duplicate WP artifact.
**Verdict:** PASS

### R1-08: Unknown bug discovered
**Scenario:** Defect found with unknown root cause.
**Expected:** Route to R4. Do not guess within R1.
**Verdict:** PASS

### R1-09: Urgent production defect
**Scenario:** Production is broken, fix needed immediately.
**Expected:** Route to R2.
**Verdict:** PASS

### R1-10: Contract divergence detected
**Scenario:** Implementation contradicts approved S5/S6.
**Expected:** Route to R5. Do not silently rewrite.
**Verdict:** PASS

### R1-11: Untrusted worktree
**Scenario:** Workspace state cannot be verified as consistent.
**Expected:** Route to R3 / S0 Restart Rule.
**Verdict:** PASS

### R1-12: Governance request
**Scenario:** Change is to AISE governance, not project module.
**Expected:** Route to R6.
**Verdict:** PASS

### R1-13: Unmanaged existing project
**Scenario:** Project exists but has no trustworthy AISE baseline.
**Expected:** Route to R7.
**Verdict:** PASS

### R1-14: External parameter needed
**Scenario:** Change requires external capability not currently available.
**Expected:** EXTERNAL PARAMETER BLOCKER with exact resume point.
**Verdict:** PASS

### R1-15: Valid test fails
**Scenario:** A test with correct expected behavior fails against implementation.
**Expected:** CAUSE UNKNOWN → investigate. No evidence adaptation.
**Verdict:** PASS

### R1-16: Adjacent refactor opportunity
**Scenario:** Nearby code could benefit from refactoring but is not required for the change.
**Expected:** OUT OF SCOPE unless explicitly required.
**Verdict:** PASS

### R1-17: Multi-WP change
**Scenario:** Change requires multiple work packages.
**Expected:** Sequential bounded S9 → S10 → S11 cycles. One WP at a time.
**Verdict:** PASS

### R1-18: Owner GO received
**Scenario:** Owner authorizes one bounded change.
**Expected:** Agent proceeds autonomously through S9–S12 (non-production) without further ceremony.
**Verdict:** PASS

### R1-19: No Prod GO
**Scenario:** Implementation is S12-ready but no OWNER PROD GO received.
**Expected:** STOP. No S13.
**Verdict:** PASS

### R1-20: Explicit Prod GO
**Scenario:** OWNER PROD GO received.
**Expected:** S13 eligible.
**Verdict:** PASS

### R1-21: Verified not released
**Scenario:** Implementation verified, release not requested.
**Expected:** R1 may close. Do not run S12/S13 automatically.
**Verdict:** PASS

### R1-22: Released change
**Scenario:** Change deployed to production successfully.
**Expected:** S14 closes new factual baseline.
**Verdict:** PASS

### R1-23: Main advances while blocked
**Scenario:** R1 is blocked; origin/main advances with new commits.
**Expected:** Recheck material compatibility before resuming.
**Verdict:** PASS

### R1-24: PR creation blocked
**Scenario:** CI or git infrastructure prevents PR creation.
**Expected:** Investigate / External Parameter Gate. Do NOT bypass.
**Verdict:** PASS

---

## 61. ANTI-OVERPROCESSING GATE

Verify R1 does NOT automatically:
- Recreate charter (S4)
- Rewrite PRD (S5)
- Rewrite tech spec (S6)
- Create ADR (S7)
- Create milestone (S8)
- Create separate change record (CHG)
- Create new WP when valid one exists
- Rebuild existing correct code
- Launch unrelated test campaign
- Start release when not requested
- Deploy production without OWNER PROD GO
- Start next module
- Start R2–R7
- Create cron
- Create monitoring

**If any of the above occurs without material justification, the R1 execution is defective.**

---

## 62. ROUTING QUALITY GATE

Before R1 proceeds, ALL must be true:
- PROJECT BASELINE VERIFIED
- REQUEST UNDERSTOOD
- R1 ROUTE FIT: YES
- EARLIEST AFFECTED LAYER IDENTIFIED
- UNCHANGED UPSTREAM ARTIFACTS PRESERVED
- MATERIAL CONTRACT DIVERGENCE: 0 (or rerouted to R5)
- BLOCKING UNKNOWN CAUSE: 0 (or rerouted to R4)
- SCOPE BOUNDED
- AUTHORIZED TERMINAL BOUNDARY KNOWN
- PRODUCTION AUTHORIZATION SEPARATE
- DUPLICATE GOVERNANCE ARTIFACTS: 0
- UNAUTHORIZED AUTOMATION: 0

---

## 63. SIZE / USABILITY

Target: approximately 3200–4600 words.

Avoid:
- Change-management bureaucracy
- ITIL-style process theatre
- Mandatory change tickets for every change
- Mandatory CHG artifact for trivial work
- Automatic architecture / security / performance review gates
- Replaying full AISE spine for every change

---

## 64. COMPATIBILITY

R1 is:
- **Project-agnostic** — no project-specific assumptions
- **Technology-neutral** — no framework or language constraints
- **Usable by AI agents and human engineers** — no implicit context required
- **Usable without chat history** — all routing decisions in canonical artifacts
- **Compatible with small and large changes** — ceremony scales with impact
- **Compatible with greenfield after bootstrap** and existing managed projects
- **Minimal in ceremony** — no step that does not serve a material purpose

---

## 65. MINIMAL AISE INTEGRATION UPDATES

- **A. S0:** Add pointer to R1 in routing section
- **B. S2:** Update MODULE/CHANGE route to R1
- **C. ROADMAP:** R1 PLANNED → CLOSED/PASS/CANONICAL. Preserve S0–S14 and R2–R7.
- **D. S3:** Add R1 to manifest
- **E. Other files:** Unchanged

---

## 66. DO NOT APPLY R1 TO DANIELOU

**STRICTLY DO NOT MODIFY** any of the following Daniélou artifacts:
- Application code
- WS contracts
- PROJECT_STATE
- DELIVERY_ROADMAP
- PRODUCT_REQUIREMENTS
- TECHNICAL_SPECIFICATION
- PROJECT_MANIFEST
- ADRs
- Tests / fixtures
- Schema / migrations
- Deployment config
- Vercel / Neon configuration
- Production
- Actual module/change artifacts

R1 defines the protocol. It does not execute it against the live project in this session.

---

## 67. DIFF GATE

**NEW:** R1 file
**MINIMAL:** S0, S2, ROADMAP
**OPTIONAL MINIMAL:** S3
**Strictly unchanged:** application code/state/contracts, tests, fixtures, schema, migrations, deployment, R2–R7

---

## 68. VALIDATE UNIVERSAL R1

- R1-01 → R1-24: all PASS
- ANTI-OVERPROCESSING GATE: verified
- ROUTING QUALITY GATE: verified

**All PASS.**

---

## 69. COMMIT

```
docs(aise): add module change protocol
```

---

## 70. PUSH / PR

Branch → PR → CI → MERGE.

**If PR fails:** CAUSE = UNKNOWN first. Investigate. **Do NOT bypass CI.**

---

## 71. CI CLASSIFICATION

Use **actual evidence** to classify CI results.

Do NOT:
- Infer docs-only = N/A without evidence
- Assume 0 checks = PASS without evidence
- Skip classification

---

## 72. MERGE AUTHORIZATION

**Through PR only.** No direct main bypass.

---

## 73. POST-MERGE CANONICAL VERIFICATION

Verify:
- S0–S14: CLOSED/PASS/CANONICAL
- R1: CLOSED/PASS/CANONICAL
- R2–R7: PLANNED
- R1 file: present
- S0 pointer: valid
- S2 route: valid
- S3: current

---

## 74. ZERO SCHEDULED WORK

No cron. No scheduled tasks. No monitoring. No auto execution. No production action.

---

## 75. FINAL VERDICT

**R1: CLOSED / PASS / CANONICAL**
**S0–S14: COMPLETE/CANONICAL**
**R2–R7: PLANNED**

---

## 76. NEXT

- **NEXT RECOMMENDED:** R2 Hotfix Protocol
- **NEXT AUTHORIZED:** NONE
- **NEXT ACTION:** STOP — WAIT FOR OWNER. **DO NOT START R2 AUTOMATICALLY.**
