---
phase: 04-authentication-privacy
plan: 01
subsystem: auth
tags: [firebase-auth, auth-guards, bearer-token, redirect]

# Dependency graph
requires:
  - phase: 01-foundation-core-generation
    provides: "3-layer auth architecture (requireAuth, useAuthedFetch, page guards) with bypass stubs"
provides:
  - "Real auth enforcement at server layer (401 for unauthenticated API requests)"
  - "Real auth enforcement at fetch hook layer (synthetic 401 when no token)"
  - "Real auth enforcement at page guard layer (redirect to /sign-in)"
affects: [04-02, 05-credits-export]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "requireAuth returns NextResponse 401 (callers check instanceof NextResponse)"
    - "useAuthedFetch returns synthetic 401 Response (callers handle uniformly with server 401s)"
    - "Page auth guards: check authLoading first, then redirect if no user"

key-files:
  created: []
  modified:
    - src/lib/auth/require-auth.ts
    - src/hooks/use-authed-fetch.ts
    - src/app/page.tsx
    - src/app/projects/[projectId]/page.tsx

key-decisions:
  - "Synthetic 401 Response in useAuthedFetch (not throw) for uniform error handling with server 401s"
  - "Auth guard in home page renders null during redirect (not loading spinner)"

patterns-established:
  - "API routes: const auth = await requireAuth(req); if (auth instanceof NextResponse) return auth;"
  - "Client pages: check authLoading, then check user, then redirect to /sign-in"
  - "Client fetch: authedFetch returns 401 Response when no token; callers check res.status === 401"

# Metrics
duration: 3min
completed: 2026-02-13
---

# Phase 4 Plan 1: Remove Auth Bypasses Summary

**Activated 3-layer Firebase Auth enforcement: server requireAuth returns 401, client fetch hook returns synthetic 401, page guards redirect to /sign-in**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-13T01:05:17Z
- **Completed:** 2026-02-13T01:08:37Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Server `requireAuth()` now returns 401 NextResponse for unauthenticated requests (removed `{ userId: "anonymous" }` fallback)
- Client `useAuthedFetch()` now returns synthetic 401 Response when no token (removed raw fetch fallback)
- Home page uses `useAuth()` + `useAuthedFetch()`, redirects to /sign-in when unauthenticated, handles 401 on API calls
- Project page destructures `user` from `useAuth()`, has auth guard in useEffect, includes `user` in dependency array
- All 9 bypass locations across 5 files from Phase 1 research inventory resolved

## Task Commits

Each task was committed atomically:

1. **Task 1: Remove server and fetch hook auth bypasses** - `70f1405` (feat)
2. **Task 2: Restore auth guards on home page and project page** - `18d950a` (feat)

**Plan metadata:** `4346c41` (docs: complete plan)

## Files Created/Modified
- `src/lib/auth/require-auth.ts` - Server-side auth enforcement, returns 401 for unauthenticated requests
- `src/hooks/use-authed-fetch.ts` - Client fetch hook, returns synthetic 401 when no token available
- `src/app/page.tsx` - Home page with auth guard, useAuth, authedFetch, 401 handling
- `src/app/projects/[projectId]/page.tsx` - Project page with user destructuring, auth guard in useEffect, user in deps

## Decisions Made
- Synthetic 401 Response in useAuthedFetch (not throw Error) -- callers already handle 401 status codes uniformly, throwing would require try/catch at every call site
- Auth guard in home page renders `null` during redirect (consistent with project page pattern)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required. Firebase Auth was already configured in Phase 1.

## Next Phase Readiness
- All auth bypasses removed; real Firebase Auth enforced at every layer
- Ready for Phase 4 Plan 2 (data isolation and privacy enforcement)
- One remaining Phase 4 TODO in `src/lib/db/projects.ts` about userId parameter -- expected to be addressed in 04-02

## Self-Check: PASSED

All files exist, all commits verified, all content checks passed.

---
*Phase: 04-authentication-privacy*
*Completed: 2026-02-13*
