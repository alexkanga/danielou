# AISE — TASK ROUTER (S2)

**Purpose:**
Classify an authorized engineering unit into exactly one AISE route.
S2 decides the route. S2 does NOT execute the route.

**Authority:**
Subordinate to S0 (AI Software Engineering OS). If conflict, S0 wins.
Operationalized from S0 §2 normative routing rules.

**Canonical Governance:**
S0 — `docs/engineering/AI_SOFTWARE_ENGINEERING_OS.md`

---

## 1. ROUTER INPUTS

S2 receives four inputs from S1:

**A. OWNER REQUEST** — what the Owner authorized.

**B. VERIFIED FACTUAL STATE** — repo, branch, HEAD, worktree, tests,
runtime, DB/deployment state when relevant.

**C. RELEVANT INTENDED STATE** — requirements, module contract, ADRs,
roadmap, frozen governance rule.

**D. OBSERVED EVIDENCE** — failing test, runtime defect, deployment
failure, missing project, contract divergence.

S2 must not route from chat memory alone.

---

## 2. ROUTE TAXONOMY

### NEW_PROJECT

Owner intends to create a new software project/product from zero.
No established project implementation workflow exists yet.
Next component: S3 New Project Bootstrap Protocol
(`docs/engineering/AISE_NEW_PROJECT_BOOTSTRAP.md`).

### MODULE

Authorized functional or technical unit inside an existing healthy
project. New feature, new module, planned milestone, authorized
enhancement. This is NOT for correcting a proven defect.

R1 protocol → docs/engineering/AISE_MODULE_CHANGE_PROTOCOL.md

### HOTFIX

Implementation defect is already proven AND intended behavior is clear
AND the request is to correct that defect with minimum sufficient change.
HOTFIX must NOT be selected merely because a test fails.

R2 protocol → docs/engineering/AISE_HOTFIX_PROTOCOL.md

### RECOVERY

Trusted continuity itself is compromised: canonical branch/head
uncertain, local work cannot be trusted, failed/partial operation,
repository or environment state inconsistent, authorized work must
restart from verified state. RECOVERY is NOT routine debugging.

### CONTRACT_DIVERGENCE

Factual State ≠ OWNER-approved Intended State, and cause has NOT yet
been safely classified. This route has precedence over automatic
HOTFIX. Must classify before corrective action (see §4).

### GOVERNANCE

Authorized modifications to AISE, engineering governance, process
contracts, or frozen methodology. Does NOT automatically authorize
weakening FROZEN rules — explicit Owner approval required.

### INVESTIGATION

Owner authorizes diagnosis/research and no corrective route can yet be
proven. Read-only by default. May produce evidence and classification.
May NOT silently become implementation work.

---

## 3. PRECEDENCE

When multiple signals are present, apply in this order:

1. **CONTRACT_DIVERGENCE** — if factual contradicts approved intent
   and cause is unclassified, classify first before any corrective route.
2. **RECOVERY** — if repository/environment continuity cannot be trusted,
   restore base before any implementation work.
3. **HOTFIX** — if implementation defect is already proven and intended
   state is clear.
4. **NEW_PROJECT** — if no project exists yet.
5. **GOVERNANCE** — if the work targets methodology/governance itself.
6. **MODULE** — planned unit in a healthy existing project.
7. **INVESTIGATION** — fallback when cause is genuinely unknown and
   no higher-precedence route applies.

Interpretation: do not jump directly to HOTFIX when divergence cause
is unclassified. Do not jump to RECOVERY when continuity is known.

---

## 4. CONTRACT_DIVERGENCE SUBROUTING

When CONTRACT_DIVERGENCE is selected, mandatory classification:

```
CLASSIFY
  IMPLEMENTATION DEFECT       → HOTFIX
  TEST DEFECT                → test correction (under authorized unit)
  FIXTURE/DATA DEFECT        → fixture/data correction
  ENVIRONMENT DEFECT         → RECOVERY or environment correction
  SPECIFICATION AMBIGUITY    → OWNER DECISION REQUIRED
  UNKNOWN                    → INVESTIGATION
```

**UNKNOWN → WORKAROUND is PROHIBITED.**

Do not allow UNKNOWN → HOTFIX without evidence.
Do not adapt valid evidence to match defective behavior.

---

## 5. KEY DISTINCTIONS

**NEW_PROJECT vs MODULE:**
New software product from zero → NEW_PROJECT.
Bounded unit inside existing project → MODULE.

**MODULE vs HOTFIX:**
Intended new capability → MODULE.
Correction of proven defect → HOTFIX (only after cause proven).

**RECOVERY vs HOTFIX:**
HOTFIX fixes defective behavior.
RECOVERY restores trusted state/continuity.

**Failed test:**
A failed test does NOT automatically mean HOTFIX.
Cause is unknown until proven. Route to CONTRACT_DIVERGENCE or
INVESTIGATION according to evidence, then classify.

**Environment target:**
If target environment is not verified (e.g., Preview expected but
local SQLite detected), NO WRITE. Route to CONTRACT_DIVERGENCE
or RECOVERY/environment.

---

## 6. OWNER AUTHORIZATION BOUNDARY

The route cannot expand Owner authorization.

Owner says "investigate why login fails" → INVESTIGATION.
Agent must NOT self-authorize HOTFIX, refactor, deployment, or migration.

After investigation proves implementation defect: report route
recommendation, then follow existing authorization semantics.
If the current Owner request already clearly authorizes correction,
S2 may continue without redundant permission theatre.

---

## 7. NO EXECUTION

S2 must NOT edit code, edit database, run migrations, create fixtures,
commit fixes, deploy, create scheduled work, or start other AISE
components. Read-only inspection for classification is allowed.

---

## 8. AMBIGUITY RULE

Do not ask Owner unnecessarily. If evidence clearly determines the
route, route automatically.

Ask Owner only when ambiguity is genuinely semantic or materially
changes intended behavior:
- two plausible business interpretations;
- contract itself must change;
- destructive recovery choice;
- new major scope.

Do NOT ask Owner for: normal implementation details inside an
authorized unit, which local test command to run, or classification
that evidence already resolves.

---

## 9. ROUTING TABLE

| Signal                                   | Primary Route        | Key Gate                          |
|------------------------------------------|----------------------|-----------------------------------|
| New project from zero                    | NEW_PROJECT          | bootstrap required                |
| Planned unit in existing project         | MODULE               | bounded scope                     |
| Proven implementation defect             | HOTFIX               | intended state clear              |
| Factual ≠ intended (cause unclassified)  | CONTRACT_DIVERGENCE  | classify first                    |
| Continuity/state untrusted               | RECOVERY             | restore verified base             |
| AISE/process/governance change           | GOVERNANCE           | frozen-rule gate                  |
| Cause not yet proven                     | INVESTIGATION        | read-only default                 |

---

## 10. OUTPUT CONTRACT

Every S2 decision produces:

```
AISE ROUTE DECISION

OWNER REQUEST:          <concise>
VERIFIED CONTEXT:       <concise>
PRIMARY ROUTE:          <route>
CLASSIFICATION:         <if applicable>
WHY:                    <1–5 concise bullets>
AUTHORIZED SCOPE:       <what current authorization covers>
BLOCKERS:               <NONE / list>
OWNER DECISION REQUIRED: YES / NO
NEXT PROTOCOL:          <AISE component or S0 normative flow>
EXECUTION STARTED:      NO
```

---

## 11. FORWARD REFERENCES

Routes whose detailed protocol does not yet exist as a standalone
component use the current S0 normative flow until a dedicated component
is created.

Known roadmap (see AISE_ROADMAP for full topology):
- S3 — New Project Bootstrap Protocol
  (see `docs/engineering/AISE_NEW_PROJECT_BOOTSTRAP.md`)

S2 does NOT invent S3+ contents prematurely.

---

## 12. ANTI-ANTI-PATTERNS

S2 must NOT route by size. A 1-line defect can be HOTFIX. A 3-file
planned capability can be MODULE. A large broken local state can be
RECOVERY. Route by intent and cause, not line-of-code count.

S2 must NOT route every discrepancy to HOTFIX. A failing test with
unknown cause requires classification, not assumption.

S2 must NOT route every dirty worktree to RECOVERY if continuity is
known and modifications belong to the authorized unit.

S2 must NOT route ordinary project documentation inside an authorized
MODULE to GOVERNANCE. GOVERNANCE is for methodology and governance
infrastructure itself.

There is NO route named or behaving like WORKAROUND,
TEMPORARY_FIX_TO_PASS, IGNORE, or BYPASS.
