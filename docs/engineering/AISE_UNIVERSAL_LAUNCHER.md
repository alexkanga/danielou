# AISE — UNIVERSAL LAUNCHER

**Purpose:**
Start or resume one AISE engineering session from verified repository state.

**Authority:**
This launcher is subordinate to the canonical AI Software Engineering OS (S0).
If any conflict exists, S0 wins.

**Canonical Governance:**
S0 — `docs/engineering/AI_SOFTWARE_ENGINEERING_OS.md`

---

## 0. DOCTRINE

NEVER DEVELOP FROM MEMORY.
DEVELOP FROM VERIFIED STATE.

Conversation history provides context only. It is NOT factual repository proof.

---

## 1. ESTABLISH VERIFIED STATE

Before reading, planning, or modifying anything, verify:

```
REPOSITORY:         <branch / repo identity>
BRANCH:             <current>
LOCAL HEAD:         <sha>
REMOTE HEAD:        <sha if available>
LOCAL = REMOTE:     YES / NO / UNKNOWN
WORKTREE:           CLEAN / DIRTY
UNTRACKED:          <summary or NONE>
CANONICAL S0:       FOUND / MISSING at <path>
PROJECT STATE:      <path and status, if used>
AUTHORIZED REQUEST:  <one sentence>
```

If worktree is dirty and continuity is uncertain, apply the S0 Restart Rule
(§22): do not perform archaeology by default. Restart from verified remote.

---

## 2. LOAD INTENDED STATE

Read only the canonical documents relevant to the authorized unit:
product requirements, module contract, ADRs, schema, relevant tests.

Do NOT audit the entire repository before every change.
Doctrine: **read enough to execute correctly.**

---

## 3. TRUTH PLANES

**Factual State** = what the repository/runtime currently does.
**Intended State** = what OWNER-approved specification requires.

If they differ: **CONTRACT DIVERGENCE DETECTED.**
Do not silently choose one. Do not silently rewrite either side.

---

## 4. CONTRACT PRESERVATION (FROZEN)

Never adapt valid tests, fixtures, seeds, mocks, quality gates, or environment
configuration merely to make defective implementation behavior pass.

When factual behavior conflicts with OWNER-approved intended behavior:

1. Classify the divergence.
2. Prove whether implementation, test, fixture, environment, or specification
   is wrong.
3. Correct the proven cause.
4. Re-run the original evidence unchanged.

**UNKNOWN → INVESTIGATE.**
**NEVER UNKNOWN → WORKAROUND.**

---

## 5. ROUTE

Classify the requested work using S2 — AISE Task Router
(`docs/engineering/AISE_TASK_ROUTER.md`).

If **CONTRACT_DIVERGENCE**: classification MUST occur before corrective routing.

---

## 6. EXECUTE ONE AUTHORIZED UNIT

You may perform all necessary implementation, testing, and defect fixing inside
the current authorized unit. You may NOT automatically start the next major
unit, unrelated refactor, hardening campaign, or governance expansion.

**Execution loop:**

```
VERIFIED BASE
→ INSPECT / REUSE
→ MINIMUM SUFFICIENT CHANGE
→ TARGETED TESTS
→ FIX OBSERVED DEFECTS
→ QUALITY GATES
→ FUNCTIONAL VERIFY
→ DIFF REVIEW
→ COMMIT / PUSH IF AUTHORIZED
→ UPDATE STATE IF REQUIRED
→ STOP
```

---

## 7. HARD RULES

**Failed test** ≠ test is wrong. Failed test = cause unknown. Classify before
modifying test, code, data, or environment. Do not weaken a valid test.

**Database / schema**: never alter merely to make tests pass. Changes require
authorization, canonical migration, and verified target environment.
If target environment is not proven: **NO WRITE.**

**Zero scheduled work**: CRON = 0, SCHEDULED TASKS = 0, BACKGROUND MONITORING = 0
by default. Agent cannot self-authorize automation.

**Git**: one agent, one worktree, one git writer (S0 §12). Do not create
competing writers on the same worktree.

**Fantomas / Ghost**: if the project uses this principal, preserve the FROZEN S0
privilege semantics exactly. Do not redefine them inside a module task.

---

## 8. STOP

When the authorized unit is complete: **STOP.**

Do NOT automatically start another milestone, perform "while I am here"
cleanup, create scheduled monitoring, open another workstream, modify unrelated
governance, or merge if an OWNER gate is required.

OWNER approval is required when: intended-state contract must change; next
major unit would start; production write/deployment needs a gate; destructive
recovery is needed; scheduled automation would be created; a FROZEN rule
would be weakened; or an unresolved ambiguity materially changes behavior.

---

## 9. CLOSURE REPORT

End every launcher-driven unit with a compact factual report:

```
TASK:               <name>
ROUTE:              <type>
BASE HEAD:          <sha>
FINAL HEAD:         <sha or unchanged>
FILES MODIFIED:     <list>
TARGETED TESTS:     PASS / FAIL / N/A
QUALITY GATES:      PASS / FAIL / N/A
FUNCTIONAL VERIFY:  PASS / FAIL / N/A
DB/SCHEMA MODIFIED: YES / NO
PRODUCTION MODIFIED: YES / NO
SCHEDULED WORK:     NO / <authorized details>
WORKTREE:           CLEAN / DIRTY
STATUS:             PASS / FAIL / BLOCKED
NEXT:               STOP / OWNER DECISION REQUIRED
```
