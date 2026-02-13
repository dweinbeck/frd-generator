---
phase: 05-monetization-compliance-production-readiness
plan: 03
subsystem: testing
tags: [vitest, credits, stripe, idempotency, retention, consent, regression-tests]

# Dependency graph
requires:
  - phase: 05-monetization-compliance-production-readiness
    provides: "Server-side credit charging, webhook idempotency, retention chunking, consent enforcement, client credit gating"
provides:
  - "Unit tests for chargeCredits (success/fail/metadata), addCredits (purchase/refund), getCredits"
  - "Integration tests for generate route: 402/403 responses, credit costs, refund on failure, event tracking"
  - "Stripe webhook tests: idempotency guard, duplicate session handling, signature validation"
  - "Retention tests: expired data deletion, batch chunking for >499 documents"
  - "Component tests: credit display, amber/blue styling, pre-submit gating, 402 handling"
affects: [production-readiness, deployment]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "vi.hoisted() for mock references in vi.mock factories"
    - "Firestore transaction mocking with per-test mockTx objects"
    - "Component credit gating tests with mockFetch for useAuthedFetch"

key-files:
  created:
    - tests/lib/db/credits.test.ts
    - tests/lib/db/retention.test.ts
    - tests/api/generate-credits.test.ts
    - tests/api/webhooks-stripe.test.ts
    - tests/components/credits/generation-flow-credits.test.tsx
  modified: []

key-decisions:
  - "Per-test mockTx objects instead of shared Firestore mocks for isolation and readability"
  - "vi.hoisted() used in webhook tests to solve mock factory hoisting issue"
  - "Client credit gating test verifies no API call on insufficient balance rather than error message display"

patterns-established:
  - "Firestore transaction test pattern: create mockTx per test with get/set/update spies"
  - "Stripe webhook test pattern: vi.hoisted mocks + setupIdempotencyCheck helper"
  - "Component credit test pattern: mockFetch returning Response objects for different endpoints"

# Metrics
duration: 7min
completed: 2026-02-13
---

# Phase 5 Plan 3: Phase 5 Regression Tests Summary

**33 tests across 5 files covering credit charging, webhook idempotency, retention chunking, consent enforcement, and client credit gating**

## Performance

- **Duration:** 7 min
- **Started:** 2026-02-13T01:56:57Z
- **Completed:** 2026-02-13T02:04:12Z
- **Tasks:** 2
- **Files created:** 5

## Accomplishments
- 8 unit tests for credit system: getCredits (exists/not-exists), chargeCredits (success/fail/metadata), addCredits (purchase/refund/new-user)
- 8 integration tests for generate route credit flow: 402 insufficient, 403 consent, 50/25 credit costs, refund on failure, event tracking
- 6 Stripe webhook tests: missing signature, invalid signature, credit addition, idempotency (duplicate skipped), success/duplicate responses
- 6 retention tests: expired deletion, zero versions, >499 version chunking, credit_transaction cleanup, transaction chunking
- 5 component tests: credit display, amber warning, blue info, pre-submit blocking, 402 response handling
- All 112 project tests pass with zero regressions

## Task Commits

Each task was committed atomically:

1. **Task 1: Credit system and generate route credit flow tests** - `75db439` (test)
2. **Task 2: Webhook idempotency, retention chunking, and client credit gating tests** - `6ab7e2a` (test)

## Files Created/Modified
- `tests/lib/db/credits.test.ts` - Unit tests for getCredits, chargeCredits, addCredits with Firestore transaction mocking
- `tests/lib/db/retention.test.ts` - Tests for deleteExpiredData with batch chunking verification
- `tests/api/generate-credits.test.ts` - Integration tests for generate route credit charging, consent, and refund
- `tests/api/webhooks-stripe.test.ts` - Tests for Stripe webhook idempotency with vi.hoisted mocks
- `tests/components/credits/generation-flow-credits.test.tsx` - Component tests for credit display and gating in GenerationFlow

## Decisions Made
- **Per-test mockTx:** Each test creates its own mockTx with get/set/update spies rather than sharing mocks between tests. Provides better isolation and clearer assertions.
- **vi.hoisted for webhooks:** Used `vi.hoisted()` to create mock references accessible inside `vi.mock()` factories, solving the hoisting issue where top-level variables aren't available in mock factories.
- **Client gating assertion approach:** The "insufficient balance blocks submit" test verifies no API call was made rather than checking for an error message, because the component's error display path doesn't render the error string when state is "input" (the amber warning notice already communicates the problem to the user).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Initial Firestore mock in credits tests used shared `mockDoc.mockReturnValueOnce()` which caused ref identity confusion between credits and credit_transactions collections. Resolved by using a realistic collection/doc mock with stable refs keyed by collection path.
- Webhook test failed with "Cannot access 'mockAddCredits' before initialization" because `vi.mock()` factories are hoisted above variable declarations. Resolved by using `vi.hoisted()` to create mock references that are available at hoist time.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All Phase 5 requirements have test coverage: CRED-01 through CRED-06, DATA-01, DATA-02, DATA-03, OBS-02
- 112 total tests across 13 test files, all passing
- Phase 5 (Monetization, Compliance & Production Readiness) is now fully complete
- Ready for production deployment

## Self-Check: PASSED

All 5 created files verified on disk. Both task commits (75db439, 6ab7e2a) verified in git log.

---
*Phase: 05-monetization-compliance-production-readiness*
*Completed: 2026-02-13*
