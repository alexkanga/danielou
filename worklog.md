# Worklog

---
Task ID: 1
Agent: main
Task: M5 FINAL FUNCTIONAL CLOSURE — Audit Persistence Fix

Work Log:
- Diagnosed audit persistence failure: `audit_log.school_id` is UUID type in PostgreSQL; report-card service passed `schoolId: ''` (empty string), causing `invalid input syntax for type uuid: ""`; error swallowed in best-effort catch
- Confirmed root cause with direct SQL reproduction against SAFE_NONPROD PostgreSQL
- Fixed `PedagogyAuditParams.schoolId`: `string` → `string | null` in audit.ts
- Added defensive empty-string→null mapping in `logPedagogyAudit`
- Fixed 3 `schoolId: ''` → `schoolId: null` in report-card.service.ts
- Added missing `report_card_generated` audit to `generateReportCards`
- Changed `void logPedagogyAudit(...)` to `await` in bulk transition
- Ran 64-check integration proof: ALL PASS (including 24 new audit persistence checks)
- Verified audit rows exist for: GENERATION (2), RECALCULATION, READY (5), VALIDATION (5), PUBLICATION (5)
- Confirmed actor, entity, entityId, timestamp, context, no secrets in all audit rows
- Cleaned up 17 test audit rows + all fixtures, 0 orphans
- Regression: check:sqlite PASS, lint 0 errors, typecheck PASS, 425 tests PASS, build PASS, no secrets in source
- Committed b3cd383, pushed to PR #3, GitHub Actions Quality Gates PASS (run 32751316022)
- Preview Deployment failure is Vercel infra (Neon DB unreachable from Vercel build env), not M5

Stage Summary:
- Root cause: empty string passed to UUID column
- Fix: 2 files changed (audit.ts, report-card.service.ts), smallest responsible change
- 64/64 integration checks PASS, 425/425 tests PASS, CI PASS
- M5 PRE-PRODUCTION CLOSED, PRODUCTION READINESS = GO

---
Task ID: 2
Agent: main
Task: Role Display / RBAC Consistency Fix — ADMIN/TEACHER shown as Reader

Work Log:
- Traced role resolution end-to-end: DB user.role → Better Auth session.user → session.ts deriveSchoolRole → NavigationProvider → Sidebar/Topbar
- Identified root cause: `role` column exists in DB (pgEnum admin/direction/teacher/reader) but was NOT declared in Better Auth `additionalFields` in auth.ts
- BA 1.7.1 Drizzle adapter only exposes fields in its internal model + additionalFields; unlisted columns are silently dropped from session.user
- session.ts:75 `String(u.role ?? 'reader')` and actor.ts:83 `v1Role: String(u.role ?? 'reader')` — both fell back to 'reader' for ALL non-Ghost users
- Confirmed `deriveSchoolRole`, `SCHOOL_ROLE_LABELS`, `PLATFORM_ROLE_LABELS`, Sidebar, Topbar, NavigationProvider all correct — no READER fallback in any of those layers
- Found secondary issue: 'Super Admin' (English) displayed in topbar.tsx and utilisateurs page instead of canonical 'Super Administrateur'
- Applied 3-file fix: auth.ts (+role to additionalFields), topbar.tsx, utilisateurs/page.tsx (label consistency)
- Added 28 targeted tests in role-display-consistency.test.ts
- All gates: typecheck PASS, lint 0 errors, 453 tests PASS (28 new), build PASS, secret scan CLEAN, no-sqlite CLEAN

Stage Summary:
- VERDICT: DISPLAY BUG — caused by missing additionalField declaration, not RBAC logic defect
- RBAC authorization engine (permissions.ts, authorization.ts) was always correct; the session layer fed it wrong input
- Files changed: 3 source + 1 test, smallest responsible fix
- Commit 33c14a8, branch v2/m5-results-reportcards
- Stale session contributor: YES — existing sessions before this fix will still show 'reader' until re-login
- RELEASE READINESS: GO (awaiting owner push authorization)
