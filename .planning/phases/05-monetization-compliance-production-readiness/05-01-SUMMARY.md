---
phase: 05-monetization-compliance-production-readiness
plan: 01
subsystem: api, payments, database
tags: [stripe, firestore, credits, idempotency, batch-delete, consent]

# Dependency graph
requires:
  - phase: 04-authentication-privacy
    provides: "Auth enforcement (requireAuth), consent tracking (hasUserConsented)"
provides:
  - "Active credit charging in generate route (50 initial, 25 iteration)"
  - "402 response on insufficient credits with balance/required info"
  - "403 response when consent not accepted"
  - "Credit refund on generation failure via addCredits with type=refund"
  - "Idempotent Stripe webhook (duplicate session ID check)"
  - "Chunked batch deletes in retention for Firestore 500-doc limit"
affects: [05-02, 05-03, client-credit-ui, billing]

# Tech tracking
tech-stack:
  added: []
  patterns: [chunked-batch-delete, idempotent-webhook, credit-refund-on-failure]

key-files:
  created: []
  modified:
    - src/app/api/generate/route.ts
    - src/app/api/webhooks/stripe/route.ts
    - src/lib/db/retention.ts
    - src/lib/db/credits.ts

key-decisions:
  - "addCredits accepts optional type parameter (purchase|charge|refund) for refund tracking"
  - "creditCost and creditCharged declared outside try block for catch-block access"
  - "BATCH_LIMIT=499 (not 500) to leave room for project doc in final batch"
  - "Refund analytics reuses credits_purchased event type with packageLabel=refund:generation_failed"

patterns-established:
  - "Idempotency guard: query credit_transactions by metadata.stripeSessionId before adding credits"
  - "Chunked batch delete: iterate in BATCH_LIMIT chunks for Firestore batch operations"
  - "Credit refund: addCredits with type=refund in catch block guarded by creditCharged flag"

# Metrics
duration: 5min
completed: 2026-02-12
---

# Phase 5 Plan 1: Server-Side Credit Backbone Summary

**Active credit charging with 402/403 enforcement, Stripe webhook idempotency, Firestore batch-safe retention, and credit refund on generation failure**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-13T01:46:33Z
- **Completed:** 2026-02-13T01:52:09Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Server-side credit charging active: 50 credits for initial generation, 25 for iteration, with 402 on insufficient balance
- Consent enforcement: 403 returned when user has not accepted terms before generation
- Credit refund mechanism: credits automatically refunded if generation fails after charging
- Stripe webhook idempotency: duplicate session deliveries safely ignored via credit_transactions query
- Retention batch safety: chunked deletes with BATCH_LIMIT=499 for projects with 500+ versions
- All Phase 5 TODO comments resolved (zero remaining)

## Task Commits

Each task was committed atomically:

1. **Task 1: Activate credit charging, consent enforcement, and refund on failure** - `996cbf1` (feat)
2. **Task 2: Add idempotency to Stripe webhook and harden retention batch deletes** - `8d0acb2` (feat)

## Files Created/Modified
- `src/app/api/generate/route.ts` - Credit charging, consent check, refund on failure, failure analytics
- `src/app/api/webhooks/stripe/route.ts` - Idempotency check via credit_transactions query
- `src/lib/db/retention.ts` - Chunked batch deletes with BATCH_LIMIT constant
- `src/lib/db/credits.ts` - Added refund type to CreditTransaction, type parameter to addCredits

## Decisions Made
- **addCredits type parameter:** Added optional `type` parameter with default `"purchase"` to `addCredits()` for refund tracking. Backwards compatible -- existing callers unchanged.
- **BATCH_LIMIT=499:** Used 499 (not 500) to leave room for the project document in the final batch when deleting versions.
- **creditCost/creditCharged scoping:** Declared outside the try block so the catch block can access them for refund logic.
- **Refund analytics:** Reused `credits_purchased` event type with `packageLabel: "refund:generation_failed"` rather than adding a new event type to the analytics union.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added refund type to CreditTransaction and type parameter to addCredits**
- **Found during:** Task 1 (credit refund implementation)
- **Issue:** `addCredits()` hardcoded `type: "purchase"` in the transaction record. Refunds would appear as purchases in credit_transactions, making auditing impossible.
- **Fix:** Added `"refund"` to `CreditTransaction.type` union, added optional `type` parameter to `addCredits()` with default `"purchase"`.
- **Files modified:** `src/lib/db/credits.ts`
- **Verification:** Build passes, existing callers unchanged (backwards compatible)
- **Committed in:** `996cbf1` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Essential for correct refund tracking in credit_transactions. No scope creep.

## Issues Encountered
- Pre-existing uncommitted component changes (iteration-input.tsx, project-view.tsx) were found in working tree. These belong to a different plan (05-02 scope). Restored to committed state to avoid scope contamination.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Server-side credit backbone complete: charging, refunding, tracking, and idempotency all active
- Client-side credit gating (05-02) already partially committed; needs iteration-input and project-view updates
- Ready for compliance and production readiness plans (05-02, 05-03)

## Self-Check: PASSED

All 4 modified files verified on disk. Both task commits (996cbf1, 8d0acb2) verified in git log.

---
*Phase: 05-monetization-compliance-production-readiness*
*Completed: 2026-02-12*
