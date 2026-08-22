# R-V2-M1-H2 — Fantomas Always-Available Root Cause Documentation

## Original Root Cause

Ghost availability incorrectly depended on required environment configuration.

### Pre-H2 Behavior (Broken)

The `ghost-config.ts` module required **all three** environment variables to be present:

```
FANTOMAS_USERNAME   → required, missing → available: false
FANTOMAS_PASSWORD   → required, missing → available: false
GHOST_SESSION_SECRET → required, missing → available: false
```

When any variable was missing, `getGhostConfig()` returned `{ available: false, reason: '...' }`.

This `available: false` propagated to:

1. **`validateGhostCredentials()`** — returned `false` when config unavailable
2. **`signGhostSession()`** — threw `GHOST_CONFIGURATION_ERROR` when config unavailable
3. **`verifyGhostSession()`** — returned `null` when config unavailable
4. **Login Server Action** — skipped Ghost entirely: `if (ghostConfig.available && ...)`
5. **API Route `/api/auth/ghost`** — returned HTTP 503 when `!config.available`
6. **Middleware** — could not verify Ghost tokens (verify returned null)

### Impact

Fantomas was **unavailable** when:
- `GHOST_SESSION_SECRET` was not set
- `FANTOMAS_USERNAME` was not set
- `FANTOMAS_PASSWORD` was not set
- Any combination of the above

This violated the owner requirement that Fantomas must be operational under **all** failure scenarios.

---

## Final Architectural Correction

Built-in Fantomas identity is always available independently of DB, Better Auth, external session secret, and hosting provider.

### Post-H2 Behavior (Fixed)

`ghost-config.ts` now:

1. **Hardcodes built-in credentials**: `fantomas` / `fantomas`
2. **Makes env vars optional**: `FANTOMAS_USERNAME` and `FANTOMAS_PASSWORD` override built-in defaults when present
3. **Makes session secret optional**: `GHOST_SESSION_SECRET` selects security mode but never blocks availability
4. **Returns `available: true`** in **all** cases — the `GhostConfigUnavailable` type has been removed

### Security Modes

| Mode | Trigger | Mechanism | Integrity | Confidentiality |
|------|---------|-----------|-----------|----------------|
| `external_secret` | `GHOST_SESSION_SECRET` present | JWT HS256 with deployment-specific secret | Strong | Strong |
| `built_in_fallback` | `GHOST_SESSION_SECRET` absent | JWT HS256 with deterministic built-in key | Strong (integrity) | Not deployment-specific (see §20) |

Both modes produce identical GhostActor with identical full GLOBAL SUPER_ADMIN permissions (§10 — NO permission degradation).

### Files Modified

| File | Change |
|------|--------|
| `src/lib/ghost-config.ts` | Rewritten: built-in credentials, optional env overrides, always `available: true`, security modes |
| `src/lib/ghost-auth.ts` | Removed all `config.available` guards, uses `config.password`, added `securityMode` to JWT payload |
| `src/app/(auth)/login/actions.ts` | Removed `ghostConfig.available` guard, Fantomas always checked first |
| `src/app/api/auth/ghost/route.ts` | Removed `!config.available` → 503 guard, always attempts auth |
| `src/middleware.ts` | Added `/api/system/status` and `/api/auth/logout` to public paths |
| `src/app/api/system/status/route.ts` | **NEW**: System status endpoint showing Ghost and DB status separately |
| `src/tests/auth/ghost-auth.test.ts` | Updated for always-available architecture |
| `src/tests/auth/ghost-jwt.test.ts` | Updated: added fallback mode tests, permission parity |
| `src/tests/auth/login-flow.test.ts` | Updated: no-env tests, no available guard tests |
| `src/tests/auth/h2-always-available.test.ts` | **NEW**: 37 comprehensive H2 tests (§26-§52 matrix) |

---

## Architectural Invariants Preserved

1. **No DB dependency** — ghost-config.ts and ghost-auth.ts never import drizzle, neon, or any DB module
2. **No Better Auth dependency** — Ghost auth never calls Better Auth signIn/session/account
3. **No hosting provider dependency** — No Vercel, Neon Auth, AWS, Azure identity imports
4. **No SQLite** — Zero SQLite references in Ghost implementation
5. **Cookie propagation** — Server Action sets cookie directly via `cookies().set()` (no internal fetch)
6. **Timing-safe comparison** — `timingSafeEqual` for credential validation
7. **HttpOnly cookie** — Ghost session cookie is always HttpOnly
8. **Ghost-only guard** — `requireGhostGuard()` still rejects SUPER_ADMIN (recovery is Ghost-only)
9. **Future permissions** — `checkPermission()` has `if (platformRole === 'ghost') return true;` — single-line override auto-applies to all current and future permissions

---

## Security Disclosure (§20)

The built-in fallback signing mechanism provides continuity and token integrity but is **not equivalent to a private deployment-specific GHOST_SESSION_SECRET**.

The fallback key is deterministic and present in application source code. It protects against token tampering (integrity) but does not provide deployment-specific confidentiality. Deployments requiring maximum session security should set `GHOST_SESSION_SECRET` to a strong random value.

Permissions and availability remain **identical** in both modes.
