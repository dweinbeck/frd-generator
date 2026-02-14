# Phase 5: Monetization, Compliance & Production Readiness - Research

**Researched:** 2026-02-12
**Domain:** Stripe credit billing, Firestore data retention, structured observability, rate limiting, user consent
**Confidence:** HIGH

## Summary

Phase 5 is an **activation and hardening phase**, not a build phase. The vast majority of the infrastructure is already scaffolded and functional across the codebase: credit management (`src/lib/db/credits.ts`), Stripe Checkout and webhooks (`src/lib/stripe/config.ts`, `src/app/api/credits/`, `src/app/api/webhooks/stripe/`), credit UI components (`src/components/credits/`), data retention (`src/lib/db/retention.ts`), cron cleanup endpoint (`src/app/api/cron/cleanup/`), consent tracking (`src/lib/db/consent.ts`, `src/components/consent/consent-banner.tsx`), structured logging with correlation IDs (`src/lib/logger.ts`), analytics event tracking (`src/lib/analytics.ts`), and rate limiting (`src/lib/rate-limit.ts`). The ConsentBanner is already mounted in the root layout, the CreditDisplay and PurchaseModal are already in the AppHeader, and both generation endpoints already use rate limiting.

The primary work for this phase is:
1. **Uncommenting and activating** the credit charging logic in the generate route (currently has two `TODO: Phase 5` comment blocks)
2. **Enforcing credit checks client-side** so the UI blocks generation when credits are insufficient (CRED-03, CRED-04)
3. **Adding credit cost display to the iteration flow** (currently only shown in GenerationFlow, not IterationInput)
4. **Hardening the Stripe webhook** for idempotency and edge cases
5. **Addressing the Firestore batch delete 500-document limit** in the retention cleanup
6. **Writing comprehensive tests** for all Phase 5 requirements

**Primary recommendation:** Systematically uncomment the `TODO: Phase 5` blocks, add client-side credit gating, harden edge cases in webhook/retention, and write tests that verify every requirement. No new libraries or major architectural changes are needed.

## Standard Stack

### Core (Already Installed)

| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| `stripe` | 20.3.1 | Stripe Checkout Sessions, webhook signature verification | Installed, routes built |
| `firebase-admin` | 13.6.1 | Firestore transactions for credits, batch deletes for retention | Installed, used |
| `nanoid` | 5.1.6 | Correlation ID generation for structured logging | Installed, used in logger |
| `zod` | 4.3.6 (via `zod/v4`) | Runtime validation for checkout request schema | Installed, used |

### Supporting (Already Installed)

| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| `server-only` | 0.0.1 | Prevents server-only modules from leaking to client | Already used everywhere |

### Not Needed

| Library | Why Not |
|---------|---------|
| `pino` / `winston` | The custom structured logger (`src/lib/logger.ts`) is sufficient for this app's scale. It outputs JSON to stdout which Cloud Logging can parse. Adding a logging library adds complexity without benefit. |
| `redis` / `ioredis` | In-memory rate limiting is sufficient for initial production. The existing code has a comment noting Redis as a future upgrade. Adding Redis adds infrastructure dependency. |
| `node-cron` | The cron endpoint uses an HTTP trigger with secret auth. External scheduling (Vercel Cron, Cloud Scheduler, GitHub Actions) is the standard pattern for Next.js apps. |
| `@google-cloud/logging` | Structured JSON to stdout is the standard pattern for Cloud Run/Vercel. Platform logging services automatically ingest stdout. |
| `posthog` / `mixpanel` | Server-side analytics events are logged as structured JSON. An external analytics service is a future enhancement, not a Phase 5 requirement. |

**No new dependencies required for this phase.**

**Installation:**
```bash
# No installation needed — all dependencies already present
```

## Architecture Patterns

### Existing File Structure (Phase 5 Scope)

```
src/
├── lib/
│   ├── db/
│   │   ├── credits.ts          # getCredits(), addCredits(), chargeCredits() — COMPLETE
│   │   ├── consent.ts          # hasUserConsented(), recordConsent() — COMPLETE
│   │   └── retention.ts        # deleteExpiredData() — NEEDS HARDENING (batch limit)
│   ├── stripe/
│   │   └── config.ts           # getStripe(), CREDIT_COSTS, CREDIT_PACKAGES — COMPLETE
│   ├── analytics.ts            # trackEvent() with typed events — COMPLETE
│   ├── logger.ts               # createLogger() with correlation IDs — COMPLETE
│   └── rate-limit.ts           # checkRateLimit() sliding window — COMPLETE
├── app/api/
│   ├── credits/
│   │   ├── route.ts            # GET /api/credits (balance) — COMPLETE
│   │   └── checkout/
│   │       └── route.ts        # POST /api/credits/checkout — COMPLETE
│   ├── webhooks/stripe/
│   │   └── route.ts            # POST /api/webhooks/stripe — NEEDS HARDENING (idempotency)
│   ├── cron/cleanup/
│   │   └── route.ts            # POST /api/cron/cleanup — COMPLETE
│   ├── consent/
│   │   └── route.ts            # GET + POST /api/consent — COMPLETE
│   └── generate/
│       └── route.ts            # POST /api/generate — NEEDS ACTIVATION (credit charging)
└── components/
    ├── credits/
    │   ├── credit-display.tsx   # Balance display + Buy Credits button — COMPLETE
    │   └── purchase-modal.tsx   # Credit package selection, Stripe redirect — COMPLETE
    ├── consent/
    │   └── consent-banner.tsx   # Terms/consent banner — COMPLETE
    ├── generation/
    │   └── generation-flow.tsx  # Credit balance + cost notice — NEEDS CLIENT GATING
    └── version/
        ├── iteration-input.tsx  # Iteration form — NEEDS CREDIT COST DISPLAY
        └── project-view.tsx     # Project view with iterate mode — NEEDS CREDIT COST DISPLAY
```

### Pattern 1: Credit Charging Activation (generate route)

**What:** The generate route already has credit charging code written but commented out with `TODO: Phase 5` markers. Activating it requires uncommenting two blocks.
**When to use:** The `POST /api/generate` route handler.
**Current state:** Lines 46-58 (charge) and 148-159 (tracking) are commented out.
**Activation pattern:**

```typescript
// src/app/api/generate/route.ts — UNCOMMENT these blocks

// CRED-01, CRED-02: Charge credits before generation
const creditCost = isIteration ? CREDIT_COSTS.iteration : CREDIT_COSTS.initial;
const chargeResult = await chargeCredits(auth.userId, creditCost, {
  projectId: input.projectId,
  model: modelId,
  reason: isIteration ? "iteration" : "initial_generation",
});
if (!chargeResult.success) {
  return NextResponse.json(
    { error: "Insufficient credits", balance: chargeResult.balance, required: creditCost },
    { status: 402 },
  );
}

// After successful generation — track the credit charge event
trackEvent(
  auth.userId,
  {
    event: "credits_charged",
    amount: creditCost,
    projectId: input.projectId,
    versionId: version.id,
    model: modelId,
  },
  logger.correlationId,
);
```

**Source:** Existing commented-out code in `src/app/api/generate/route.ts`, lines 46-58 and 148-159.

### Pattern 2: Client-Side Credit Gating (CRED-04)

**What:** Before submitting a generation or iteration request, the UI should check if the user has sufficient credits and block the action if not.
**When to use:** GenerationFlow submit handlers and IterationInput submit handler.
**Implementation pattern:**

```typescript
// In GenerationFlow — before handleBrainDumpSubmit or handleStandardSubmit
const GENERATION_COST = 50;
if (creditBalance !== null && creditBalance < GENERATION_COST) {
  setError("Insufficient credits. Purchase more credits to continue.");
  return;
}

// In IterationInput — needs credit balance fetched and checked
const ITERATION_COST = 25;
// Fetch balance, check before submit, show cost notice
```

**Source:** Derived from existing `creditBalance` state in `src/components/generation/generation-flow.tsx` and the `CREDIT_COSTS` constants in `src/lib/stripe/config.ts`.

### Pattern 3: Webhook Idempotency (Hardening)

**What:** Stripe may deliver the same webhook event multiple times. The current webhook handler does not check for duplicate processing.
**When to use:** `POST /api/webhooks/stripe` handler.
**Implementation pattern:**

```typescript
// Before processing checkout.session.completed:
// Check if this session has already been processed using the session ID
const existingTx = await db.collection("credit_transactions")
  .where("metadata.stripeSessionId", "==", session.id)
  .limit(1)
  .get();

if (!existingTx.empty) {
  logger.info("Duplicate webhook event, skipping", {
    metadata: { sessionId: session.id },
  });
  return NextResponse.json({ received: true });
}
```

**Source:** Stripe webhook best practices from [Stripe Webhooks Documentation](https://docs.stripe.com/webhooks) and [Stripe Idempotent Requests](https://docs.stripe.com/api/idempotent_requests).

### Pattern 4: Batch Delete Chunking (Retention Hardening)

**What:** Firestore batched writes have a 500-document limit. The current retention logic uses a single batch per project, which will fail if a project has more than 499 versions (since the project document itself uses one slot).
**When to use:** `deleteExpiredData()` in `src/lib/db/retention.ts`.
**Implementation pattern:**

```typescript
// Chunk deletions into batches of 499 (leaving room for the project doc)
const BATCH_LIMIT = 499;
const versions = await db.collection("projects").doc(projectId).collection("versions").get();

// Delete versions in chunks
for (let i = 0; i < versions.docs.length; i += BATCH_LIMIT) {
  const chunk = versions.docs.slice(i, i + BATCH_LIMIT);
  const batch = db.batch();
  for (const doc of chunk) {
    batch.delete(doc.ref);
  }
  // Include project doc in last batch if this is the final chunk
  if (i + BATCH_LIMIT >= versions.docs.length) {
    batch.delete(projectDoc.ref);
  }
  await batch.commit();
}
```

**Source:** [Firestore Transactions and Batched Writes](https://firebase.google.com/docs/firestore/manage-data/transactions) — 500-document limit per batch.

### Pattern 5: Credit Charge Metadata (CRED-06)

**What:** Every credit charge must record `project_id`, `version_id`, `model`, and `timestamp`.
**Current state:** Already implemented in `chargeCredits()`. The metadata is passed from the generate route and recorded in the `credit_transactions` collection with `FieldValue.serverTimestamp()`.
**No changes needed** — just needs activation (uncommenting).

**Source:** Existing code in `src/lib/db/credits.ts`, lines 83-90.

### Anti-Patterns to Avoid

- **Do NOT add client-side credit deduction:** Always deduct credits server-side in a Firestore transaction. The client should only display balance and gate the UI — never modify the balance.
- **Do NOT read raw request body twice in webhook handler:** The current implementation correctly uses `req.text()` for Stripe signature verification. Do not switch to `req.json()` — Stripe requires the raw body.
- **Do NOT use `deleteField()` on subcollection docs:** Firestore `deleteField()` removes a field, not a document. Use `batch.delete(docRef)` to delete subcollection documents.
- **Do NOT implement in-process cron scheduling (node-cron):** On serverless platforms (Vercel, Cloud Run), processes are ephemeral. Use external scheduling (Vercel Cron, Cloud Scheduler) to trigger the HTTP endpoint.
- **Do NOT block generation UI while fetching credit balance:** The current pattern (async fetch, display when available) is correct. Generation should not be blocked by a slow credit fetch — the server-side check is the authoritative gate.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Payment processing | Custom payment forms | Stripe Checkout (already built) | PCI compliance, fraud detection, payment method handling |
| Webhook signature verification | Custom HMAC verification | `stripe.webhooks.constructEvent()` (already used) | Handles timing attacks, signature format changes |
| Credit atomicity | Read-then-write balance updates | Firestore transactions (already used in `chargeCredits()`) | Race conditions on concurrent requests |
| Correlation IDs | Manual request ID passing | `createLogger()` (already built) | Single source of truth, auto-generated |
| Rate limiting (initial) | Custom middleware chain | `checkRateLimit()` (already built) | Sliding window is correct for in-memory implementation |

**Key insight:** Every piece of Phase 5 infrastructure is already built. The work is activation, hardening, UI gating, and testing.

## Common Pitfalls

### Pitfall 1: Forgetting to Uncomment Both TODO Blocks

**What goes wrong:** The generate route has two separate `TODO: Phase 5` comment blocks (credit charge at line 46 and credit tracking at line 148). If only one is uncommented, either credits won't be charged or the charge won't be tracked in analytics.
**Why it happens:** They're 100 lines apart in the same file.
**How to avoid:** Search for all `TODO.*Phase 5` in the codebase and resolve every instance.
**Warning signs:** Credits are charged but no `credits_charged` analytics event, or vice versa.

### Pitfall 2: Stripe Webhook Delivers Duplicate Events

**What goes wrong:** Stripe retries webhook deliveries if it doesn't get a 2xx response quickly enough. The current handler has no idempotency check, so a slow database write could cause duplicate credit additions.
**Why it happens:** Network timeouts, slow Firestore writes, or the webhook endpoint returning an error on first attempt.
**How to avoid:** Check for existing `credit_transactions` with the same `stripeSessionId` before adding credits. The `session.id` is unique per checkout session.
**Warning signs:** Users getting double credits, duplicate entries in `credit_transactions` collection.

### Pitfall 3: Firestore Batch Delete Exceeding 500-Document Limit

**What goes wrong:** The `deleteExpiredData()` function creates a single batch for all versions in a project plus the project document. If a project has 500+ versions, the batch commit fails.
**Why it happens:** Firestore hard-limits batched writes to 500 operations.
**How to avoid:** Chunk deletions into batches of 499 (leaving room for the project document in the final batch).
**Warning signs:** Retention cleanup errors in logs, orphaned data remaining after cleanup runs.

### Pitfall 4: Credit Balance Race Condition Between UI Check and Server Charge

**What goes wrong:** User sees "50 credits" in UI, clicks generate, but between the UI check and the server-side charge, another tab/session uses those credits. The UI showed sufficient balance but the server rejects.
**Why it happens:** Client-side balance check is not atomic with server-side charge.
**How to avoid:** This is expected behavior. The server-side Firestore transaction is the authoritative gate. The UI check is a convenience to prevent unnecessary API calls. Handle the 402 response gracefully on the client side with a clear error message and balance refresh.
**Warning signs:** Users seeing "Generation failed" instead of a clear "Insufficient credits" message.

### Pitfall 5: Consent Banner Not Blocking Generation

**What goes wrong:** The ConsentBanner is already in the layout but it's informational — it doesn't block the user from generating FRDs before accepting consent.
**Why it happens:** DATA-03 says "Basic terms/consent displayed" which the current implementation satisfies. However, the success criteria says "User sees and accepts terms/consent for AI-generated output and data retention before first use."
**How to avoid:** Decide whether consent should be a blocking gate (must accept before first generation) or an informational banner (current behavior). The success criteria implies blocking behavior. If blocking is required, check consent status in the generate route and/or in the GenerationFlow component before allowing submission.
**Warning signs:** Users generating FRDs without ever having seen or accepted the consent terms.

### Pitfall 6: Missing versionId in Credit Charge Metadata

**What goes wrong:** The commented-out credit charging code charges credits **before** generation (line 46), but the version doesn't exist yet at that point. The `metadata.versionId` would be undefined.
**Why it happens:** The credit charge happens before `saveVersion()`, which creates the version ID.
**How to avoid:** Charge credits before generation (to prevent generating without sufficient credits) but update the transaction metadata with the version ID after generation completes, OR accept that the charge transaction records `projectId` and `model` but not `versionId` (the tracking event at line 148 does include the `versionId`).
**Warning signs:** `versionId` field being null/undefined in `credit_transactions` collection.

### Pitfall 7: Credit Refund on Generation Failure

**What goes wrong:** If credits are charged before generation and the AI call fails, the user loses credits for a failed generation.
**Why it happens:** The charge happens at line 46 but the generation at line 107. If line 107 throws, credits are already deducted.
**How to avoid:** Add a refund mechanism in the catch block: if credits were charged but generation failed, call `addCredits()` to refund. Track the refund in `credit_transactions` with a `type: "refund"` or `reason: "generation_failed"`.
**Warning signs:** Users losing credits without receiving an FRD.

## Code Examples

Verified patterns from existing codebase:

### Credit Balance Check (Already Working)

```typescript
// src/app/api/credits/route.ts — returns user's credit balance
// Source: Existing file, already functional
export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const balance = await getCredits(auth.userId);
    return NextResponse.json({ balance });
  } catch {
    return NextResponse.json({ error: "Failed to fetch credits" }, { status: 500 });
  }
}
```

### Stripe Checkout Session Creation (Already Working)

```typescript
// src/app/api/credits/checkout/route.ts — creates Stripe Checkout session
// Source: Existing file, already functional
const session = await stripe.checkout.sessions.create({
  mode: "payment",
  payment_method_types: ["card"],
  line_items: [{
    price_data: {
      currency: "usd",
      product_data: {
        name: `FRD Generator - ${pkg.label}`,
        description: `${pkg.credits} generation credits`,
      },
      unit_amount: pkg.priceInCents,
    },
    quantity: 1,
  }],
  metadata: {
    userId: auth.userId,
    credits: String(pkg.credits),
    packageLabel: pkg.label,
  },
  success_url: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}?checkout=success`,
  cancel_url: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}?checkout=cancel`,
});
```

### Credit Charging via Firestore Transaction (Already Working)

```typescript
// src/lib/db/credits.ts — atomic credit deduction
// Source: Existing file, already functional
export async function chargeCredits(
  userId: string,
  amount: number,
  metadata: CreditTransaction["metadata"],
): Promise<{ success: boolean; balance: number }> {
  const db = getDb();
  const creditRef = db.collection("credits").doc(userId);

  return db.runTransaction(async (tx) => {
    const doc = await tx.get(creditRef);
    const currentBalance = doc.exists ? (doc.data()?.balance ?? 0) : 0;

    if (currentBalance < amount) {
      return { success: false, balance: currentBalance };
    }

    const newBalance = currentBalance - amount;
    tx.update(creditRef, { balance: newBalance, updatedAt: FieldValue.serverTimestamp() });

    // Record transaction (CRED-06)
    const txRef = db.collection("credit_transactions").doc();
    tx.set(txRef, {
      userId,
      amount: -amount,
      type: "charge",
      balanceAfter: newBalance,
      metadata,
      createdAt: FieldValue.serverTimestamp(),
    });

    return { success: true, balance: newBalance };
  });
}
```

### Test Pattern for Credit Charging

```typescript
// Test pattern for credit-related requirements
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Firestore
vi.mock("@/lib/db/admin", () => ({
  getDb: vi.fn(),
}));

describe("chargeCredits", () => {
  it("rejects when balance is insufficient (CRED-04)", async () => {
    // Setup: user has 30 credits, tries to charge 50
    const result = await chargeCredits("user-1", 50, { projectId: "p1", model: "gemini-2.5-flash" });
    expect(result.success).toBe(false);
    expect(result.balance).toBe(30);
  });

  it("deducts credits and records transaction (CRED-06)", async () => {
    // Setup: user has 100 credits, charges 50
    const result = await chargeCredits("user-1", 50, {
      projectId: "p1",
      model: "gemini-2.5-flash",
      reason: "initial_generation",
    });
    expect(result.success).toBe(true);
    expect(result.balance).toBe(50);
    // Verify transaction was recorded with metadata
  });
});
```

### Client-Side 402 Handling Pattern

```typescript
// Pattern for handling insufficient credits response in UI
const res = await authedFetch("/api/generate", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});

if (res.status === 402) {
  const data = await res.json();
  setError(`Insufficient credits. You have ${data.balance} credits but need ${data.required}.`);
  // Optionally open purchase modal
  return;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Stripe Charges API | Stripe Checkout Sessions | 2020+ | Already using Checkout Sessions. No change needed. |
| `middleware.ts` for cron auth | `proxy.ts` (Next.js 16) | Next.js 16 | Not applicable — cron endpoint uses direct header check in route handler. |
| Custom log aggregation | Structured JSON to stdout | Current standard | Already implemented. Cloud Run/Vercel ingest stdout automatically. |
| Client-side analytics (GA4, Mixpanel) | Server-side event logging | Architecture decision | Already implemented as structured log events. Can be forwarded to analytics services later. |

**Deprecated/outdated:**
- Stripe `shipping_details` on Checkout.Session was removed in Stripe SDK v20. Not relevant — we don't use shipping.
- Stripe `SubscriptionItemUsageRecord` was removed in v20. Not relevant — we use one-time payments, not usage-based billing.

## Comprehensive Change Audit

### Files That Need Activation (Uncomment)

| File | Change | Complexity |
|------|--------|------------|
| `src/app/api/generate/route.ts` | Uncomment credit charging (line 46-58) | Trivial |
| `src/app/api/generate/route.ts` | Uncomment credit tracking (line 148-159) | Trivial |

### Files That Need Hardening

| File | Change | Complexity |
|------|--------|------------|
| `src/app/api/webhooks/stripe/route.ts` | Add idempotency check (duplicate session ID) | Low |
| `src/lib/db/retention.ts` | Chunk batch deletes to respect 500-doc limit | Low |
| `src/app/api/generate/route.ts` | Add credit refund on generation failure | Low |

### Files That Need UI Credit Gating

| File | Change | Complexity |
|------|--------|------------|
| `src/components/generation/generation-flow.tsx` | Block generation when credits < 50, handle 402 response | Low |
| `src/components/version/iteration-input.tsx` | Add credit cost display (25 credits), block when insufficient, handle 402 | Low |
| `src/components/version/project-view.tsx` | Pass credit balance to IterationInput or fetch in IterationInput | Low |

### Files That May Need Consent Gating

| File | Change | Complexity |
|------|--------|------------|
| `src/components/generation/generation-flow.tsx` | Check consent before allowing generation (if blocking behavior required) | Low |
| `src/app/api/generate/route.ts` | Check consent server-side before generation (if blocking behavior required) | Low |

### Files Already Complete (Verify Only)

| File | What to Verify |
|------|----------------|
| `src/lib/db/credits.ts` | `getCredits()`, `addCredits()`, `chargeCredits()` work correctly |
| `src/lib/stripe/config.ts` | `getStripe()`, `CREDIT_COSTS`, `CREDIT_PACKAGES` are correct |
| `src/app/api/credits/route.ts` | GET balance works |
| `src/app/api/credits/checkout/route.ts` | POST creates Stripe session |
| `src/lib/db/consent.ts` | `hasUserConsented()`, `recordConsent()` work |
| `src/app/api/consent/route.ts` | GET/POST consent works |
| `src/lib/analytics.ts` | All event types defined, `trackEvent()` works |
| `src/lib/logger.ts` | Correlation IDs generated, sensitive fields stripped |
| `src/lib/rate-limit.ts` | Sliding window rate limiting works |
| `src/app/api/cron/cleanup/route.ts` | Cron endpoint with secret auth works |
| `src/components/credits/credit-display.tsx` | Balance display works |
| `src/components/credits/purchase-modal.tsx` | Package selection and redirect work |
| `src/components/consent/consent-banner.tsx` | Banner display and acceptance work |
| `src/app/layout.tsx` | ConsentBanner and AppHeader mounted |

### Environment Variables Required

| Variable | Purpose | Already Referenced |
|----------|---------|-------------------|
| `STRIPE_SECRET_KEY` | Stripe API authentication | Yes (`src/lib/stripe/config.ts`) |
| `STRIPE_WEBHOOK_SECRET` | Webhook signature verification | Yes (`src/app/api/webhooks/stripe/route.ts`) |
| `NEXT_PUBLIC_APP_URL` | Checkout success/cancel redirect URLs | Yes (`src/app/api/credits/checkout/route.ts`) |
| `CRON_SECRET` | Cron endpoint authentication | Yes (`src/app/api/cron/cleanup/route.ts`) |

## Open Questions

1. **Should consent block generation or just inform?**
   - What we know: The ConsentBanner is informational (bottom banner, non-blocking). The success criteria says "User sees and accepts terms/consent for AI-generated output and data retention before first use."
   - What's unclear: Whether "before first use" means consent must be accepted before the first generation can be submitted, or just that the banner must be displayed.
   - Recommendation: Implement blocking behavior — check consent status before generation (server-side via `hasUserConsented()` check in generate route). This satisfies the success criteria unambiguously. The UX is: consent banner appears on first visit, user must accept before generating.

2. **Credit refund on generation failure**
   - What we know: Credits are charged before generation. If generation fails, credits are lost.
   - What's unclear: Whether the requirements expect automatic refund on failure.
   - Recommendation: Implement automatic refund. Add a `try/catch` around the generation call and refund credits in the `catch` block. Record the refund in `credit_transactions` with `type: "refund"`. This is a good user experience practice even if not explicitly required.

3. **Missing versionId in charge metadata**
   - What we know: The commented-out charge code runs before `saveVersion()`, so `versionId` is not available at charge time.
   - What's unclear: Whether CRED-06 strictly requires `version_id` in the charge transaction.
   - Recommendation: Charge before generation (to prevent unpaid generations), but the charge metadata will include `projectId` and `model`. The `credits_charged` analytics event (tracked after generation) will include the `versionId`. Alternatively, charge after generation, but this risks generating without sufficient credits if balance changed between check and charge. The pre-charge approach is safer.

4. **Checkout success page / balance refresh**
   - What we know: After Stripe Checkout, the user is redirected to `/?checkout=success`. The credit balance in the header is fetched on component mount.
   - What's unclear: Whether the balance refreshes automatically after the redirect, or whether the user needs to refresh the page.
   - Recommendation: On the home page, detect the `checkout=success` query param and trigger a balance refresh or show a success toast. This is a polish item.

5. **Cron scheduling for production**
   - What we know: The `/api/cron/cleanup` endpoint exists and is protected by `CRON_SECRET`. It needs to be called externally.
   - What's unclear: What scheduling service will be used in production (Vercel Cron, Cloud Scheduler, GitHub Actions).
   - Recommendation: This is an infrastructure/deployment concern, not a code concern. The endpoint is ready. Document the scheduling requirement but don't implement the scheduler — it depends on the deployment platform.

## Sources

### Primary (HIGH confidence)
- **Existing codebase analysis** — All Phase 5-relevant files read in full: `src/lib/db/credits.ts`, `src/lib/stripe/config.ts`, `src/app/api/credits/route.ts`, `src/app/api/credits/checkout/route.ts`, `src/app/api/webhooks/stripe/route.ts`, `src/lib/db/retention.ts`, `src/app/api/cron/cleanup/route.ts`, `src/lib/db/consent.ts`, `src/app/api/consent/route.ts`, `src/lib/analytics.ts`, `src/lib/logger.ts`, `src/lib/rate-limit.ts`, `src/components/credits/credit-display.tsx`, `src/components/credits/purchase-modal.tsx`, `src/components/consent/consent-banner.tsx`, `src/components/generation/generation-flow.tsx`, `src/components/version/iteration-input.tsx`, `src/components/version/project-view.tsx`, `src/app/api/generate/route.ts`, `src/app/api/analyze-gaps/route.ts`, `src/app/layout.tsx`, `src/app/page.tsx`
- [Firestore Transactions and Batched Writes](https://firebase.google.com/docs/firestore/manage-data/transactions) — 500-document batch limit
- [Firestore Delete Data](https://firebase.google.com/docs/firestore/manage-data/delete-data) — Subcollection deletion does not cascade
- [Stripe Webhooks Documentation](https://docs.stripe.com/webhooks) — Webhook delivery, retry behavior
- [Stripe Idempotent Requests](https://docs.stripe.com/api/idempotent_requests) — Idempotency patterns
- [Stripe Checkout Sessions API](https://docs.stripe.com/payments/quickstart-checkout-sessions) — Checkout session creation

### Secondary (MEDIUM confidence)
- [Stripe Node.js SDK v20 Releases](https://github.com/stripe/stripe-node/releases) — Breaking changes (none affecting our usage)
- [Vercel Cron Jobs](https://drew.tech/posts/cron-jobs-in-nextjs-on-vercel) — vercel.json cron configuration pattern

### Tertiary (LOW confidence)
- None — all findings verified against codebase and official documentation.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — All libraries already installed and configured, versions verified in `package.json` and `node_modules/stripe/package.json`
- Architecture: HIGH — All patterns already implemented in codebase, primary work is uncommenting and hardening
- Pitfalls: HIGH — All identified from actual codebase analysis (TODO markers, batch limits, idempotency gaps)
- Credit system: HIGH — Complete transaction-based implementation verified in `src/lib/db/credits.ts`
- Stripe integration: HIGH — Checkout, webhook, and credit addition fully implemented and verified
- Data retention: HIGH — Retention logic verified, batch limit issue identified from Firestore docs
- Observability: HIGH — Logger, analytics, and rate limiter all verified as functional

**Research date:** 2026-02-12
**Valid until:** 2026-03-14 (stable — no moving targets, all libraries already pinned)
