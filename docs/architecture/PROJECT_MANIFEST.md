# Daniélou — Project Manifest

## 1. Project Identity

Project: Daniélou Abidjan
Repository: https://github.com/alexkanga/danielou.git
Canonical branch: main
Baseline SHA: 57972464e445456bbaf9a6d15600f5b9fece6db0
Runtime: Node.js 22 (`.nvmrc`)
Package manager: pnpm 11.22.0

## 2. Architecture

Next.js 16 App Router with Turbopack. Route groups: `(auth)` for login, `(dashboard)` for the main application with sidebar navigation. All dashboard routes share a common layout that resolves the session and renders an `AppShell` component.

API routes are standard Next.js Route Handlers (`route.ts`). Server Components load data directly. Client components use TanStack Query for client-side data fetching. Server actions exist in `login/actions.ts` but are not the dominant pattern.

The middleware intercepts all requests to enforce authentication (Ghost JWT cookie or Better Auth session cookie) and injects user headers.

## 3. Application Stack

| Layer | Technology |
|-------|----------|
| Language | TypeScript 5.9.3 |
| Framework | Next.js 16.3.1 (Turbopack) |
| UI Components | shadcn/ui (New York style, zinc base color, RSC) |
| Styling | Tailwind CSS 4 |
| Icons | Lucide React |
| Validation | Zod 4.4.3 |
| Client State | TanStack Query 5.102.2 |
| Server State | Direct Drizzle ORM queries |
| Forms | React Hook Form 7.85.0 |
| Notifications | Sonner 2.0.8 |
| PDF Generation | PDFKit 0.20.1 |
| Decimal Math | decimal.js 10.6.0 |
| Auth | Better Auth 1.7.1 + custom Ghost (jose JWT) |

## 4. Database

| Aspect | Detail |
|--------|--------|
| Provider | Neon (serverless PostgreSQL) |
| Database | PostgreSQL |
| ORM | Drizzle ORM 0.45.2 |
| Schema location | `src/lib/db/schema/index.ts` (single file) |
| Migration mechanism | Drizzle Kit 0.31.10 |
| Migration location | `drizzle/` (13 SQL files, 0000–0012) |
| Migration head | `0012_r_periods_01.sql` |
| Connection | `@neondatabase/serverless` (HTTP) |
| Schema model | `drizzle-orm/neon-http` |
| DB client | Lazy singleton via `getDb()`, also exported as `db` Proxy |

## 5. Authentication

**Dual authentication system:**

1. **Better Auth** (`src/lib/auth.ts`): Email+password with username plugin. Drizzle adapter to PostgreSQL. Session tokens in cookies. 7-day session expiry.

2. **Ghost / Fantomas** (`src/lib/ghost-auth.ts`, `src/lib/ghost-config.ts`): Ghost/Fantomas is a break-glass system principal designed to remain usable when PostgreSQL and the ordinary Better Auth path are unavailable, provided the application runtime and required secure configuration remain available. JWT signed with HS256. Two security modes (external secret or built-in fallback). Rate limited: 10 attempts per 15 minutes per IP.

Session resolution order: Ghost cookie → Better Auth session → null (redirect to /login).

## 6. Authorization

**RBAC V2 Dual Role System** (`src/lib/types/rbac.ts`, `src/lib/permissions.ts`, `src/lib/authorization.ts`):

- **Platform roles**: `ghost` | `super_admin` | `none`
- **School roles**: `admin` | `direction` | `teacher` | `reader`
- **Permission model**: Dot-separated identifiers (30 defined permissions).
- **Permission matrix**: `SCHOOL_ROLE_PERMISSIONS` (read-only Set per role). Ghost and super_admin bypass all checks.
- **Teacher scope**: Resource-level check via `teacher_assignment` table.
- **Server guards**: `requireAuthorizedSession()`, `requireAssessmentScope()` in `server-guards.ts`.
- **SUPER_ADMIN capability**: `hasSuperAdminCapabilities()` returns true for `super_admin` and `ghost`. `requireSuperAdminCapability()` enforces this. `isFantomas()` narrows to ghost-only. Fantomas inherits all SUPER_ADMIN capabilities (AISE invariant).
- **V1 compatibility**: V1 role on `user.role` used as fallback. `school_membership` table exists but is not queried in session resolution (deferred technical item).

## 7. Server/Data Access

- **API pattern**: Standard Next.js Route Handlers (GET/POST/PUT/DELETE per file).
- **Authorization in routes**: `requireAuthorizedSession(permission)` at top of handlers.
- **School scoping**: `getSchoolId()` (single-tenant, cached) in all school-scoped routes.
- **Error handling**: Domain services throw typed errors, caught by route-level handlers.
- **Pagination**: `parsePagination()` utility.
- **Audit**: Inspected mutation paths call `logPedagogyAudit()` or `auditGhostAction()`.

## 8. Frontend Architecture

- **Layout**: `AppShell` with sidebar and topbar. Navigation filtered by role permissions.
- **Route groups**: `(auth)/login` and `(dashboard)/dashboard/*`.
- **Dashboard pages**: ~20 pages organized by domain.
- **Role-specific dashboards**: Separate components for each role on the main dashboard page.
- **Shared components**: `DataTable`, `FormDialog`, `DeleteDialog`, `StatusBadge`, `PageHeader`.
- **UI primitives**: shadcn/ui components in `components/ui/`.
- **Providers**: `QueryProvider` (TanStack Query), `NavigationProvider`.

## 9. Validation and Error Handling

- **Input validation**: Zod schemas in `src/lib/validations/`. French error messages.
- **DB constraints**: CHECK constraints on numeric fields, UNIQUE constraints, FK restrictions.
- **Error types**: `AuthorizationError`, `NotFoundError`, `AssessmentLifecycleError`, `GradeEligibilityError`.
- **API error responses**: Consistent JSON `{ error: string, details?: object }` with HTTP status codes.

## 10. Testing

| Aspect | Detail |
|--------|--------|
| Framework | Vitest 4.1.11 |
| Location | `src/tests/` |
| Types | Unit and integration (no UI/E2E tests) |
| Families | auth (14 files), m4/grades (5), m5/calculations (3), m6/dashboard (1), import (1) |
| Quality commands | `pnpm test`, `pnpm test:unit`, `pnpm test:watch` |
| Total | 40 files, 540+ passed (242 M4 tests including 46 cancellation tests) |

## 11. CI/CD

**CI** (`.github/workflows/ci.yml`):
- Triggers: push to main, PRs to main.
- Gates: SQLite blocker → Lint → Typecheck → Tests → Build.
- Node from `.nvmrc`, pnpm `--frozen-lockfile`.

**Deploy Preview** (`.github/workflows/deploy-preview.yml`):
- Triggers: PR open/sync/reopen.
- Builds with preview-specific secrets.

**Production**: Vercel configuration present. Exact production deployment trigger: NOT VERIFIED FROM REPOSITORY.

## 12. Deployment

| Aspect | Detail |
|--------|--------|
| Platform | Vercel (configuration present) |
| Config | `vercel.json` (pnpm commands, git deployment enabled) |
| Build | `pnpm build` (Next.js 16 + Turbopack) |
| Database | Neon (serverless PostgreSQL) |

## 13. Environments

Environment variables documented in `.env.example`:
- `DATABASE_URL`, `DIRECT_URL` — PostgreSQL (Neon)
- `AUTH_SECRET`, `BETTER_AUTH_SECRET` — Min 32 chars
- `BETTER_AUTH_URL` — Application URL
- `NODE_ENV` — development/production/test
- `TZ` — Africa/Abidjan
- `GHOST_SESSION_SECRET` — Optional Ghost JWT signing key
- `FANTOMAS_USERNAME`, `FANTOMAS_PASSWORD` — Optional Ghost credential overrides

CI uses placeholder values. Preview uses `-PREVIEW` suffixed secrets.

## 14. Core Domain Model

school
  └── academic_year [preparation → active → closed]
        ├── academic_period [draft → open → closed]
        │     (type: trimester / semester / composition / passage / other)
        ├── level
        │     └── classroom
        │           ├── enrollment [active / completed / transferred_out / withdrawn / cancelled]
        │           │     └── classroom_assignment [active / transferred / completed / withdrawn / cancelled]
        │           ├── assessment [draft → open → closed / cancelled]
        │           │     └── grade [graded / absent_excused / absent_unexcused / exempt / not_evaluated / pending]
        │           └── teacher_assignment (user × classroom × subject × year)
        ├── student
        ├── subject
        │     └── subject_component
        ├── assessment_type
        └── pedagogical_config [draft → active → archived] (versioned per level+year)
              ├── config_subject → config_component

report_card [draft → ready → validated → published]
  └── report_card_item → report_card_component_item

user [role, platform_role, is_super_admin]
  ├── account (Better Auth)
  ├── session (Better Auth)
  └── school_membership [role per school]

audit_log

## 15. Key Repository Structure

src/
  app/(auth)/login/
  app/(dashboard)/dashboard/
  app/(dashboard)/forbidden/
  app/(dashboard)/db-unavailable/
  app/api/
  lib/auth.ts
  lib/ghost-auth.ts
  lib/ghost-config.ts
  lib/actor.ts
  lib/session.ts
  lib/authorization.ts
  lib/permissions.ts
  lib/server-guards.ts
  lib/teacher-scope.ts
  lib/rate-limit.ts
  lib/bootstrap.ts
  lib/audit.ts
  lib/db-health.ts
  lib/env.ts
  lib/db/index.ts
  lib/db/schema/index.ts
  lib/navigation.ts
  lib/types/rbac.ts
  lib/validations/
  lib/data-access/
  lib/services/pedagogy/
  lib/services/results/
  lib/services/m6/
  components/
  tests/
drizzle/
scripts/
.github/workflows/

## 16. Existing Observations (Non-Prescriptive)

- Schema is in a single file (~605 lines, 20+ tables).
- `getAuth()` returns `any` due to Better Auth typing.
- 36 lint warnings exist (unused variables, missing deps — non-blocking).
- `ghost-auth.ts` imports Node.js `crypto` which is not Edge Runtime compatible (known non-blocking build warning).
- Middleware uses the Next.js `middleware` file convention (Next.js 16 deprecation warning to `proxy`).
- `session.ts` uses V1 `user.role` fallback; `school_membership` not queried (deferred technical item).
- In-memory rate limiting (not persistent across serverless instances).

## 17. Source-of-Truth Rules

1. The canonical GitHub repository (`https://github.com/alexkanga/danielou.git`, branch `main`) is the factual source of the current project state.
2. Accepted requirements documents govern intended functionality.
3. Accepted architectural decisions govern intended architecture.
4. Divergence between actual code and documented intention must be reported, never silently reconciled.
5. Conversation history is not a project source of truth.
6. Future code must follow the canonical architecture already present in the repository unless an approved architectural decision explicitly changes it.
7. For each future module: inspect existing implementation → reuse canonical components → implement minimum sufficient change → keep business/data/validation/UI responsibilities cohesive → test observed/required behavior → fix observed defects → quality gates → commit → push → close → stop.
