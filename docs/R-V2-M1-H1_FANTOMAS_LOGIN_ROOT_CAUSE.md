# R-V2-M1-H1 — Fantomas Login Root Cause

## SYMPTOM

The Fantomas ghost login (`fantomas`/`fantomas`) did not work from the real login UI.
- Login form submission returned `Identifiants invalides.`
- No Ghost cookie was created.
- No dashboard access via Ghost.

## REPRODUCTION

1. Open `/login`
2. Enter `fantomas` / `fantomas`
3. Submit
4. Error: `Identifiants invalides.`

## ROOT CAUSE

**The three required Ghost environment variables were missing from `.env.local`:**

```
FANTOMAS_USERNAME: MISSING
FANTOMAS_PASSWORD: MISSING
GHOST_SESSION_SECRET: MISSING
```

The `getGhostConfig()` function in `src/lib/ghost-config.ts` returns `{ available: false, reason: 'GHOST_SESSION_SECRET is not set' }` when any of the three variables is absent.

The login Server Action in `src/app/(auth)/login/actions.ts` checks `ghostConfig.available` before attempting Ghost auth. Since it was `false`, the Ghost path was never entered, and the identifier fell through to the Better Auth path (which also failed since `fantomas` is not a DB user).

## WHY PREVIOUS TESTS MISSED IT

The existing `ghost-jwt.test.ts` and `ghost-auth.test.ts` used a **mocked approach**: they set `process.env.GHOST_SESSION_SECRET` directly to a test value and called `_resetGhostConfigCache()`. They never verified that the **actual runtime environment** (`.env.local`) contained the required variables.

This created a false confidence: unit tests passed, but the real app had no Ghost configuration.

## FIX

Added the three required environment variables to `.env.local` (which is gitignored):

```
FANTOMAS_USERNAME=fantomas
FANTOMAS_PASSWORD=fantomas
GHOST_SESSION_SECRET=<dedicated-secret->=32-chars>
```

No code changes were required. The auth logic, JWT signing, cookie handling, and middleware were all correct.

## TEST ADDED TO PREVENT REGRESSION

Created `src/tests/auth/ghost-integration.test.ts` (19 tests):

- **Config Integration** (5 tests): Verifies all 3 env vars are PRESENT, config returns `available: true`, no `NEXT_PUBLIC_` leakage.
- **Credential Validation** (7 tests): Valid credentials, wrong password, wrong username, empty credentials, case-insensitive username, case-sensitive password, whitespace trimming.
- **JWT Round-trip** (3 tests): Sign → verify, wrong secret rejection, tampered token rejection.
- **Cookie Configuration** (2 tests): Cookie name, options (httpOnly, secure, sameSite, path, maxAge).
- **DB Independence** (2 tests): No DB module imports, full flow works without DB.

These tests load `.env.local` directly and would fail immediately if the Ghost variables are missing again.

## SECURITY IMPACT

None. The missing variables meant Ghost auth was completely disabled (fail-closed). No security exposure occurred — the configuration absence prevented all Ghost authentication attempts.

## FILES CHANGED

- `.env.local` — Added FANTOMAS_USERNAME, FANTOMAS_PASSWORD, GHOST_SESSION_SECRET (not committed)
- `src/tests/auth/ghost-integration.test.ts` — New file, 19 integration tests (committed)