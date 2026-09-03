# AISE — NEW PROJECT BOOTSTRAP PROTOCOL (S3)

**Purpose:**
Transform an authorized greenfield project request into a verified,
canonical, AISE-governed, discovery-ready project repository.

**Authority:**
Subordinate to S0. If conflict, S0 wins.

**Invocation:** S2 routes NEW_PROJECT → S3.

**Canonical Governance:**
S0 — `docs/engineering/AI_SOFTWARE_ENGINEERING_OS.md`

---

## 1. S3 BOUNDARY

S3 answers: **"How do we establish the project correctly?"**

S3 does NOT answer:
- "What should the product do?" → S4/S5
- "Which technical stack should we use?" → S6
- "How should we implement it?" → later execution protocols

S3 MUST NOT automatically choose: React, Next.js, Django, PostgreSQL,
AWS, Vercel, Docker, Kubernetes, authentication technology, ORM,
testing framework, or CI platform — unless a choice was already explicitly
OWNER-approved before bootstrap and must simply be recorded.

No premature technical commitment.

---

## 2. INPUTS

S3 receives from S2/S1:

**A. OWNER REQUEST** — authorized creation of a new project.

**B. VERIFIED EXECUTION CONTEXT** — where bootstrap is executed.

**C. MINIMUM PROJECT IDENTITY:**
```
PROJECT NAME:           <known / required>
PROJECT PURPOSE:        <one concise sentence if supplied>
TARGET DIRECTORY:       <known / required>
REMOTE REPOSITORY:      <known / absent>
```

**D. CURRENT AISE SOURCE** — canonical repository and exact commit
containing the AISE components being installed.

S3 must not invent missing product requirements.

---

## 3. MINIMUM CLARIFICATION

Only block for information genuinely required to establish project
identity/canonicality. Examples requiring OWNER input:
- project has no usable canonical name;
- target directory/repository is ambiguous;
- multiple existing remotes could be canonical;
- destructive overwrite would be required;
- remote repository must be created but agent lacks authorization.

Do NOT ask for: full feature list, complete architecture, database
choice, hosting choice, UI details, or testing strategy.
Those belong to later stages.

---

## 4. GREENFIELD PRECONDITION

Before creating anything, inspect the target directory and classify:

**A. EMPTY DIRECTORY** — no .git, no meaningful files. Proceed.
Initialize a Git repository as part of bootstrap.

**B. EMPTY/PREINITIALIZED GIT REPOSITORY** — .git exists but content
is limited to: README only, .gitignore only, LICENSE only, or a single
initial placeholder commit. The repository structure exists but no
application implementation is present. Proceed — reuse the verified
repository, do not recreate or destructively reset Git.

**C. EXISTING IMPLEMENTED PROJECT** — contains source code, application
framework files, database schemas, build configurations, or other
evidence that a software project has already been implemented. **STOP.**

If C: do NOT overwrite. Return **ROUTE_REVIEW_REQUIRED**. S3 NEW_PROJECT
is the wrong route for this target. Possible future routes:
AISE adoption into existing project, MODULE, GOVERNANCE, or RECOVERY
according to evidence. The agent must report the classification and
wait for OWNER decision.

Do not force an existing project through greenfield bootstrap.
Do not attempt to "AISE-ify" an existing codebase inside S3.

---

## 5. VERIFIED TARGET STATE

Record before writes:

```
TARGET DIRECTORY:       <path>
GIT REPOSITORY EXISTS:   YES / NO
CURRENT BRANCH:         <branch / N/A>
LOCAL HEAD:             <sha / N/A>
REMOTE:                 <remote / NONE>
WORKTREE:               CLEAN / DIRTY / N/A
EXISTING IMPLEMENTATION: YES / NO
```

If unknown modifications make continuity unsafe: follow S0
Restart/Recovery doctrine. Do not overwrite.

---

## 6. CANONICAL REPOSITORY RULE

Preferred canonical primary branch: **main** — unless OWNER/repository
policy explicitly defines another branch. Do not rename an established
remote branch without authorization.

---

## 7. LOCAL-ONLY VS CANONICAL REMOTE

Distinguish two valid completion states:

**BOOTSTRAP_LOCAL_READY** — local bootstrap valid, remote intentionally
pending. All AISE components installed, PROJECT_STATE present, worktree
clean. The project is locally ready for S4 but cannot yet guarantee
remote continuity.

**BOOTSTRAP_CANONICAL_READY** — full verified repository including
canonical remote. Local head = remote head. All AISE components present.
This is the preferred outcome when a remote is available.

If a remote exists and OWNER authorizes push: push the bootstrap
commit and verify remote head matches local head before reporting
CANONICAL_READY.

If no remote exists and OWNER has not authorized creating one: do not
invent a remote. Return **REMOTE CANONICALIZATION REQUIRED**. The project
may be locally prepared but must not be falsely reported as fully
canonical.

---

## 8. AISE CONTROL PLANE

Every AISE-managed project must contain enough governance material
to be understandable without chat history, agent memory, or external
reference. The project repository must be self-contained for governance.

**Strategy: VENDORED CANONICAL SNAPSHOT.**

Copy required canonical AISE documents from ONE verified source
commit into the project repository. The agent must:

1. Verify the exact source commit SHA from the canonical AISE repository.
2. Copy all required documents from that single commit.
3. Preserve content exactly — no local modifications during install.
4. Record the source commit in the AISE Manifest.

Current minimum required set:

```
S0 — AI_SOFTWARE_ENGINEERING_OS.md
S1 — AISE_UNIVERSAL_LAUNCHER.md
S2 — AISE_TASK_ROUTER.md
S3 — AISE_NEW_PROJECT_BOOTSTRAP.md
S4 — AISE_PROJECT_DISCOVERY_CHARTER.md
S5 — AISE_PRODUCT_REQUIREMENTS.md
```

**Source consistency is mandatory.** All components must come from
the SAME verified source commit.

Prohibited:
- S0 from commit A, S1 from commit B.
- S2 reconstructed from chat memory or agent recollection.
- S3 from local unpushed work.
- Any AISE component "remembered" rather than copied from verified source.

If source consistency cannot be proven: **STOP**. Do not install
inconsistent governance material.

---

## 9. AISE MANIFEST

Create `docs/engineering/AISE_MANIFEST.md` to record provenance.
This is a project identity document, not bureaucracy.

```
AISE MANIFEST

INSTALLATION MODE:      VENDORED CANONICAL SNAPSHOT
SOURCE REPOSITORY:     <canonical source identity>
SOURCE COMMIT:         <full SHA>
INSTALLED COMPONENTS:  S0, S1, S2, S3, S4, S5, S6, S7, S8, S9, S10, S11, S12, S13, S14, R1, R2, R3, R4, R5, R6, R7
INSTALLATION DATE:     <date>
PROJECT AISE STATUS:   ACTIVE

S0 PATH:  docs/engineering/AI_SOFTWARE_ENGINEERING_OS.md
S1 PATH:  docs/engineering/AISE_UNIVERSAL_LAUNCHER.md
S2 PATH:  docs/engineering/AISE_TASK_ROUTER.md
S3 PATH:  docs/engineering/AISE_NEW_PROJECT_BOOTSTRAP.md
S4 PATH:  docs/engineering/AISE_PROJECT_DISCOVERY_CHARTER.md
S5 PATH:  docs/engineering/AISE_PRODUCT_REQUIREMENTS.md
S6 PATH:  docs/engineering/AISE_TECHNICAL_SPECIFICATION.md
S7 PATH:  docs/engineering/AISE_PROJECT_MANIFEST_ADR.md
S8 PATH:  docs/engineering/AISE_ROADMAP_MILESTONE_DESIGN.md
S9 PATH:  docs/engineering/AISE_MODULE_CONTRACT_WORK_PACKAGE.md
S10 PATH:  docs/engineering/AISE_IMPLEMENTATION_EXECUTION.md
S11 PATH:  docs/engineering/AISE_VERIFICATION_ACCEPTANCE.md
S12 PATH:  docs/engineering/AISE_RELEASE_READINESS_PREPRODUCTION.md
S13 PATH:  docs/engineering/AISE_PRODUCTION_DEPLOYMENT_VERIFICATION.md
S14 PATH:  docs/engineering/AISE_OPERATIONAL_HANDOVER_BASELINE_CLOSURE.md
R1 PATH:  docs/engineering/AISE_MODULE_CHANGE_PROTOCOL.md
R2 PATH:  docs/engineering/AISE_HOTFIX_PROTOCOL.md
R3 PATH:  docs/engineering/AISE_RECOVERY_PROTOCOL.md
R4 PATH:  docs/engineering/AISE_INVESTIGATION_PROTOCOL.md
R5 PATH:  docs/engineering/AISE_CONTRACT_DIVERGENCE_PROTOCOL.md
R6 PATH:  docs/engineering/AISE_GOVERNANCE_CHANGE_PROTOCOL.md
R7 PATH:  docs/engineering/AISE_BROWNFIELD_ADOPTION_PROTOCOL.md
```

**Why the manifest exists:** The target repository must be able to
answer "What AISE governance version is this project using?" without
chat memory, agent memory, guessing, or branch archaeology.

The manifest provides **provenance**. The vendored documents provide
**operational independence**. Together they ensure any future agent
or engineer can understand the project's governance basis.

Do NOT store secrets in the manifest.

---

## 10. MINIMUM PROJECT DOCUMENTS

Required:

**README.md** — if no meaningful README exists. Keep minimal:
project name, bootstrap status, AISE-managed statement, current phase
(BOOTSTRAP / PRE-DISCOVERY), S1 entry point, next protocol (S4).
Do NOT write marketing or product requirements from assumptions.
If a README already exists with useful content, preserve it and add
a governance reference section rather than replacing it.

**docs/planning/PROJECT_STATE.md** — initial factual state:

```
PROJECT:                <name>
AISE PHASE:             S3 — NEW PROJECT BOOTSTRAP
STATUS:                 BOOTSTRAP IN PROGRESS / CLOSED PASS
CANONICAL BRANCH:       <branch>
CANONICAL HEAD:         <sha after baseline>
REMOTE:                 <configured / missing>
AISE SOURCE COMMIT:     <sha>
COMPLETED COMPONENTS:   S0, S1, S2, S3 installed
PRODUCT DISCOVERY:      NOT STARTED
PRODUCT REQUIREMENTS:   NOT STARTED
TECHNICAL SPECIFICATION: NOT STARTED
IMPLEMENTATION:         NOT STARTED
NEXT AUTHORIZED:        NONE until OWNER GO
NEXT RECOMMENDED:       S4 — Project Discovery / Charter
```

Do NOT populate future specifications prematurely. Do NOT create
empty directories as governance theatre.

---

## 11. NO APPLICATION SCAFFOLDING

S3 MUST NOT run: create-next-app, npm init for application
architecture, django-admin startproject, nest new, rails new,
composer create-project, cargo project generation, or any
framework-specific scaffolding — unless a technical specification
already exists and OWNER explicitly authorizes an exception.

This applies to ALL technology domains: web, API, mobile, desktop,
data platform, CLI, AI/ML system, backend service.

Default: **NO APPLICATION CODE CREATED.**

If OWNER mentions a preferred stack but technical specification has
not been approved: record as input/constraint for later consideration.
Do not scaffold automatically. The record belongs in PROJECT_STATE
or as evidence for future S4/S6, not as operationalized infrastructure.

---

## 12. NO PREMATURE INFRASTRUCTURE

Do NOT create by default: database, cloud project, hosting project,
CI/CD pipeline, Docker infrastructure, Kubernetes configuration,
production environment, authentication provider, monitoring stack,
cron, or scheduled automation. Those require later technical
decisions or explicit authorization.

---

## 13. SECRET HANDLING

S3 must never require real secrets. Do NOT place passwords, API
tokens, database URLs, private keys, or production credentials in
repository documentation.

---

## 14. GIT BASELINE

After bootstrap files are prepared:

1. Review the complete diff against the pre-bootstrap state.
2. Verify every changed file is governance/bootstrap material.
3. Confirm zero application code, zero secrets, zero infrastructure
   configuration.
4. Create a focused bootstrap commit when authorized
   (e.g. `chore: initialize AISE project`).
5. If a canonical remote is configured and push is authorized:
   push and verify remote head.

Do not mix application implementation into the bootstrap commit.
Do not squash unrelated pre-existing commits.

---

## 15. OUTPUT STATES

**A. BOOTSTRAP_CANONICAL_READY** — full verified repository including
canonical remote. Local head = remote head. All AISE components present.

**B. BOOTSTRAP_LOCAL_READY** — local bootstrap valid but remote
canonicalization intentionally pending.

**C. BOOTSTRAP_BLOCKED** — required project identity/target/continuity
cannot be established.

**D. ROUTE_REVIEW_REQUIRED** — target is not actually greenfield.

Do not report PASS ambiguously.

---

## 16. NO PRODUCT DISCOVERY OR TECHNICAL SPECIFICATION

S3 may record a one-sentence OWNER-provided purpose. It must NOT
conduct: stakeholder analysis, problem analysis, personas, feature
discovery, scope definition, business rules, success metrics, or
acceptance criteria (S4/S5). It must NOT decide: architecture,
framework, database, ORM, auth, deployment, observability, test
framework, or API style (S6).

Technical decisions already explicitly approved by OWNER may be
recorded as constraints for future stages. Do not operationalize
them unless bootstrap requires it.

---

## 17. STOP CONTRACT

When S3 achieves its authorized output: **STOP.**

Do NOT automatically start S4 (Project Discovery), S5 (Product
Requirements), S6 (Technical Specification), application scaffolding,
or coding.

```
NEXT RECOMMENDED COMPONENT:  S4
NEXT ACTION:                 OWNER GO REQUIRED
```

---

## 18. BOOTSTRAP REPORT

End S3 with:

```
AISE S3 BOOTSTRAP REPORT

PROJECT:                    <name>
ROUTE:                      NEW_PROJECT
TARGET:                     <path/repository>
GREENFIELD VERIFIED:        YES / NO
AISE SOURCE COMMIT:         <sha>
AISE MANIFEST:              PRESENT / MISSING
S0/S1/S2/S3:               INSTALLED / MISSING
PROJECT_STATE:              PRESENT / MISSING
GIT:                        INITIALIZED / EXISTING
CANONICAL BRANCH:           <branch>
LOCAL HEAD:                 <sha>
REMOTE:                     <configured / missing>
REMOTE HEAD:                <sha / N/A>
LOCAL = REMOTE:             YES / NO / N/A
WORKTREE:                   CLEAN / DIRTY
APPLICATION CODE CREATED:   NO
TECH STACK SELECTED:        NO
DB/INFRA CREATED:           NO
SCHEDULED WORK CREATED:     NO
STATUS:                     BOOTSTRAP_CANONICAL_READY
                            / BOOTSTRAP_LOCAL_READY
                            / BOOTSTRAP_BLOCKED
                            / ROUTE_REVIEW_REQUIRED
NEXT:                       S4 — Project Discovery / Charter
EXECUTION CONTINUED TO S4:  NO
```

---

## 19. OWNER-PRESENTED INFORMATION

If OWNER provides information beyond minimum identity — such as
a preferred technology stack, a rough feature idea, or an existing
document — S3 should:

1. Record it as-is in the appropriate project document.
2. Preserve it as input evidence for later S4/S5/S6 stages.
3. NOT expand it into full specifications.
4. NOT begin implementation based on it.

The distinction: recording an OWNER statement is factual. Expanding
it into requirements, architecture, or code is premature execution.

---

## 20. FORWARD REFERENCES

- S4 — Project Discovery / Charter
  (see `docs/engineering/AISE_PROJECT_DISCOVERY_CHARTER.md`)
- S5 — Product Requirements / Cahier des Charges
  (see `docs/engineering/AISE_PRODUCT_REQUIREMENTS.md`)
- S6 — Technical Specification (not yet implemented)

Routes whose detailed protocol does not yet exist as a standalone
component use the current S0 normative flow until implemented.

S3 does NOT invent S4+ contents prematurely.
