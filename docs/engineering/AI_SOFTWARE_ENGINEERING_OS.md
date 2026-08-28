AI SOFTWARE ENGINEERING OS
======================================================================

Version: 0.1 PILOT
Status: ACTIVE PILOT
Pilot Project: Daniélou

======================================================================
0. PURPOSE
======================================================================

AI SOFTWARE ENGINEERING OS defines HOW AI-assisted software engineering
must be executed.

It does NOT define the business requirements of a specific application.

Primary objective:

deterministic
maintainable
agent-independent
human-maintainable
minimum-complexity

software development.

Core principles:

NEVER DEVELOP FROM MEMORY.

DEVELOP FROM VERIFIED STATE.

ONE VERIFIED CHANGE AT A TIME.

DESIGN ENOUGH
→ IMPLEMENT
→ TEST
→ FIX OBSERVED DEFECTS
→ VERIFY
→ COMMIT
→ PUSH
→ CLOSE
→ CONTINUE ONLY AFTER OWNER GO.

======================================================================
1. TWO PLANES OF TRUTH
======================================================================

A. FACTUAL CURRENT STATE

Established from verified evidence such as:

canonical Git repository
branch
HEAD
current files
migrations
schema
executed tests
verified runtime/deployment state

B. INTENDED STATE

Established from:

OWNER-approved product requirements
accepted project manifest/technical specification
accepted architecture decisions
approved module/workstream contract

If factual state and intended state differ:

REPORT THE DIVERGENCE.

Do not silently rewrite either side.

Conversation history and AI memory are contextual aids only.

They are not sufficient project truth.

======================================================================
2. TASK ROUTER
======================================================================

Before work classify the primary task:

NEW_PROJECT
PROJECT_INTAKE
NEW_MODULE
FEATURE_CHANGE
HOTFIX
INVESTIGATION
MIGRATION
RECOVERY
RELEASE

Do not turn a small defect into an architecture project.

Do not treat INVESTIGATION as authorization to modify software.

======================================================================
3. MANDATORY RE-ENTRY GATE
======================================================================

Before every implementation unit verify at minimum:

repository root
origin
branch
HEAD
worktree
last known checkpoint
current authorized unit

If expected state != actual state:

STOP IMPLEMENTATION.

Resolve only the blocking divergence necessary to restore a known base.

Do not automatically perform historical archaeology.

If OWNER explicitly accepts a clean canonical GitHub baseline,
abandoned local work does not need to be reconstructed.

======================================================================
4. ONE AUTHORIZED UNIT AT A TIME
======================================================================

Only one functional unit may be IN_PROGRESS.

Each unit must define enough of:

OBJECTIVE
IN SCOPE
OUT OF SCOPE
DEPENDENCIES
BUSINESS RULES
ACCEPTANCE CRITERIA
REQUIRED TESTS
DEFINITION OF DONE

to implement it safely.

Completion of one unit does not authorize the next.

OWNER GO is required for the next major unit.

======================================================================
5. DEFAULT DEVELOPMENT LOOP
======================================================================

For every authorized implementation unit:

VERIFIED BASE
→ INSPECT RELEVANT EXISTING IMPLEMENTATION
→ REUSE CANONICAL COMPONENTS
→ IMPLEMENT MINIMUM SUFFICIENT CHANGE
→ TARGETED TESTS
→ FIX OBSERVED DEFECTS
→ REQUIRED QUALITY GATES
→ FUNCTIONAL VERIFICATION WHEN REQUIRED
→ REVIEW GIT DIFF
→ COMMIT
→ PUSH CHECKPOINT
→ UPDATE PROJECT STATE
→ CLOSED
→ STOP

Never automatically continue into the next module.

======================================================================
6. MAINTAINABLE CODE / NO SPAGHETTI
======================================================================

Future code must follow the canonical architecture already present unless
an approved architecture decision explicitly changes it.

Prefer:

cohesive modules
clear naming
explicit contracts
separation of responsibilities
canonical services
canonical data-access patterns
typed boundaries
reusable business logic
small understandable changes
testability

Keep appropriately separated:

BUSINESS LOGIC
DATA ACCESS
VALIDATION
AUTHORIZATION
PRESENTATION / UI

Avoid:

duplicated business logic
parallel service implementations
parallel API conventions
giant mixed-responsibility modules
UI containing hidden business rules
database access bypassing canonical conventions
speculative abstractions
unrelated refactoring
framework proliferation
magic business constants

A human developer must be able to maintain the application without
reading historical AI conversations.

======================================================================
7. INSPECT BEFORE CREATE
======================================================================

Before creating a:

service
API route
database table
migration
component
validator
calculation engine
state store
utility

search for the canonical existing implementation.

IF EXISTS:
reuse or extend it.

IF PARTIAL:
extend only the minimum necessary layer.

IF ABSENT:
create it according to current architecture.

Never create a parallel architecture simply because it is easier.

======================================================================
8. INVESTIGATION VS IMPLEMENTATION
======================================================================

INVESTIGATION is read-only by default.

Authorized investigation actions:

READ
SEARCH
TRACE
REPRODUCE
COMPARE
DIAGNOSE

Investigation does NOT automatically authorize:

code changes
database changes
migrations
dependency changes
commits
pushes

A defect investigation should establish:

SYMPTOM
EXPECTED
ACTUAL
ROOT CAUSE
MINIMAL FIX

Then implementation may proceed when authorized.

======================================================================
9. HOTFIX PROTOCOL
======================================================================

HOTFIX follows:

VERIFIED BASE
→ REPRODUCE DEFECT
→ IDENTIFY ROOT CAUSE
→ IMPLEMENT MINIMUM FIX
→ ADD/UPDATE REGRESSION TEST
→ TARGETED TESTS
→ REQUIRED QUALITY GATES
→ FUNCTIONAL VERIFICATION
→ REVIEW DIFF
→ COMMIT
→ PUSH
→ CLOSED
→ STOP

Do not broaden a hotfix into unrelated cleanup.

======================================================================
10. TEST DISCIPLINE
======================================================================

A failing test means:

CAUSE UNKNOWN.

It does not automatically mean:

CODE WRONG

or:

TEST WRONG.

Determine expected behavior first.

Fix the correct layer.

Never weaken a valid test merely to obtain PASS.

Use the smallest useful test level first:

PURE
→ SERVICE
→ INTEGRATION
→ API
→ UI
→ E2E

Use real E2E when the real user workflow itself is an acceptance
criterion.

Mocks do not replace required real integration evidence.

======================================================================
11. DATABASE / MIGRATION DISCIPLINE
======================================================================

Never modify database schema merely to make code or a test pass.

If code and database disagree, classify first:

WRONG ENVIRONMENT
WRONG DATABASE
MISSING MIGRATION
OUTDATED DATABASE
OUTDATED CODE
SCHEMA DRIFT
WRONG ASSUMPTION

Schema changes must use the project's canonical migration mechanism.

Never introduce a competing migration system.

Production DB writes require explicit authorization.

======================================================================
12. GIT DISCIPLINE
======================================================================

Default:

ONE AGENT
ONE WORKTREE
ONE GIT WRITER

Before implementation verify:

branch
HEAD
worktree

Before commit:

review git diff
review scope

Commit only files belonging to the authorized unit.

Do not include:

unrelated files
temporary files
debug files
secrets
future-module work

A meaningful CLOSED unit must receive a durable Git checkpoint.

Push the checkpoint to the canonical remote.

Completed work must not rely exclusively on local commits.

======================================================================
13. DEFECT / TECHNICAL DEBT POLICY
======================================================================

Fix observed defects that materially affect the authorized unit.

Do not create a repository-wide audit because one local defect appears.

Critical/material blockers prevent closure.

Non-blocking observations go to backlog.

A backlog item is not automatically authorized work.

Do not automatically create:

TECHNICAL DEBT PROJECT
ARCHITECTURE HARDENING PROJECT
TEST EXPANSION PROJECT
LINT CLEANUP PROJECT
GENERAL REFACTOR PROJECT

unless:

OWNER explicitly prioritizes it

or

it materially blocks authorized functionality

or

an observed production defect requires it.

======================================================================
14. BREAK-GLASS GHOST / FANTOMAS PRINCIPLE
======================================================================

Every future application governed by AI SOFTWARE ENGINEERING OS must
include a planned break-glass system principal concept, referred to
generically as:

GHOST / FANTOMAS.

PURPOSE:

bootstrap the first privileged administrator;

provide controlled emergency administrative access;

support recovery when ordinary authentication or its primary dependency
is unavailable;

provide the privileged capabilities necessary to restore/manage the
application during exceptional situations.

AUTHORIZATION:

Ghost/Fantomas is intentionally capable of full privileged access after
successful break-glass authentication.

The exact implementation is PROJECT-SPECIFIC.

The OS mandates the CAPABILITY.

It does NOT mandate Daniélou's exact implementation.

Where technically feasible, Ghost/Fantomas should not depend exclusively
on the same authentication/database path it is intended to recover.

The implementation still depends on the minimum application/runtime
infrastructure necessary for the application itself to execute.

Project implementation must define the controls necessary for:

authentication
access
secret/configuration handling
auditability
bootstrap/recovery behavior

according to the project's architecture.

======================================================================
15. ENVIRONMENTS
======================================================================

Before any mutation know the target environment.

DEV
TEST
PREVIEW
STAGING
PRODUCTION

are not interchangeable.

Production is not implicitly writable during development.

Production mutation requires explicit authorization.

======================================================================
16. RELEASE
======================================================================

MODULE COMPLETION and PRODUCTION RELEASE are separate gates.

Typical release:

REQUIRED MODULES CLOSED
→ FULL REQUIRED QUALITY GATES
→ PREVIEW/PREPROD WHEN APPLICABLE
→ OWNER PROD GO
→ PRODUCTION DEPLOY
→ SMOKE VERIFICATION
→ RELEASE CLOSED

Never infer Production authorization.

======================================================================
17. PROJECT STATE
======================================================================

The repository must maintain concise project continuity.

PROJECT_STATE should indicate at minimum:

canonical baseline/current checkpoint
last closed unit
current authorized work
next authorized action
migration head
blockers
deferred items

The repository carries continuity.

The AI conversation does not.

======================================================================
18. AGENT HANDOFF
======================================================================

A new competent agent should be able to continue development using:

GIT REPOSITORY
+
AI SOFTWARE ENGINEERING OS
+
PRODUCT REQUIREMENTS
+
PROJECT MANIFEST
+
ROADMAP
+
PROJECT STATE

A handoff should not require historical conversation reconstruction.

======================================================================
19. STOP CONDITIONS
======================================================================

STOP implementation when materially relevant:

wrong repository
wrong branch
unexpected HEAD
unexplained Git state
unknown destructive DB state
unapproved schema change
architecture conflict
required scope expansion beyond authorization

Do not improvise through material uncertainty.

======================================================================
20. MINIMUM COMPLEXITY
======================================================================

Governance exists to make development simpler and safer.

Avoid process theatre.

Use the smallest amount of:

documentation
analysis
testing
review
automation

that provides reliable evidence for the authorized change.

Do not turn methodology into a parallel software project.

Preferred rhythm:

DESIGN ENOUGH
→ IMPLEMENT
→ TEST
→ FIX OBSERVED DEFECTS
→ VERIFY
→ COMMIT
→ PUSH
→ CONTINUE AFTER OWNER GO.

======================================================================
END AI SOFTWARE ENGINEERING OS 0.1 PILOT
======================================================================
