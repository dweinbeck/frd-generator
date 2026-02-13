# Phase 4: Authentication & Privacy - Research

**Researched:** 2026-02-12
**Domain:** Firebase Auth integration, server-side token verification, data isolation, prompt privacy
**Confidence:** HIGH

## Summary

Phase 4 activates the authentication infrastructure that has been scaffolded but bypassed since Phase 1. The codebase already contains a comprehensive auth skeleton: `verifyAuth()` for server-side token verification, `requireAuth()` with an anonymous fallback, `AuthProvider` context with `useAuth()` hook, `useAuthedFetch()` for attaching Bearer tokens, and a complete Google sign-in page. The primary work is **removing bypasses** and **enforcing auth at every layer**, not building new auth infrastructure.

The architecture is deliberately layered with three bypass points (client guard, fetch hook, server requireAuth) that all need simultaneous activation. The data isolation pattern (`getProjectForUser()`) and prompt privacy (logger sanitization, analytics type safety) are already implemented. The main risks are (1) missing a bypass point during activation, (2) breaking the UX flow when auth is enforced, and (3) ensuring the platform-infra Firebase Auth config (dan-weinbeck.com) works correctly with Google sign-in popup.

**Primary recommendation:** Treat this as an activation/hardening phase, not a build phase. Systematically remove each bypass, add proper 401 handling on the client, write tests that verify auth enforcement, and audit every data path for prompt leakage.

## Standard Stack

### Core (Already Installed)

| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| `firebase` | 12.9.0 | Client-side Auth (signInWithPopup, onAuthStateChanged, getIdToken) | Installed, configured |
| `firebase-admin` | 13.6.1 | Server-side token verification (verifyIdToken) | Installed, configured |
| `next` | 16.1.6 | App Router, API routes | Installed |

### Supporting (Already Installed)

| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| `server-only` | 0.0.1 | Prevents server code from leaking to client bundles | Installed, used in auth modules |

### Not Needed

| Library | Why Not |
|---------|---------|
| `next-firebase-auth-edge` | Adds complexity for cookie-based SSR auth; this app uses Bearer token API routes which is simpler and already scaffolded. Also has edge/proxy runtime compatibility concerns with Next.js 16. |
| `next-auth` / `auth.js` | Adds an abstraction layer over Firebase Auth; direct Firebase SDK integration is already complete and simpler for single-provider (Google) auth. |

**No new dependencies required for this phase.**

## Architecture Patterns

### Existing Auth Architecture (3-Layer Bypass)

The codebase implements a deliberate 3-layer auth architecture where each layer was bypassed for pre-auth development:

```
Layer 1: Client Guard (page-level)
  - src/app/page.tsx: useAuth() check, redirect to /sign-in
  - src/app/projects/[projectId]/page.tsx: useAuth() check, redirect to /sign-in
  STATUS: Commented out (TODO: Phase 4)

Layer 2: Fetch Hook (request-level)
  - src/hooks/use-authed-fetch.ts: Attaches Bearer token to requests
  STATUS: Falls back to unauthenticated fetch when no token (TODO: Phase 4)

Layer 3: Server Auth (API-level)
  - src/lib/auth/require-auth.ts: Verifies token, returns userId
  STATUS: Returns { userId: "anonymous" } when no valid token (TODO: Phase 4)
```

### Pattern 1: Server-Side Auth Enforcement (requireAuth)

**What:** Every API route calls `requireAuth(req)` which verifies the Firebase ID token and extracts the userId.
**When to use:** Every API route handler (already done).
**Current bypass:** Returns `{ userId: "anonymous" }` instead of 401.
**Fix pattern:**

```typescript
// src/lib/auth/require-auth.ts - AFTER Phase 4
export async function requireAuth(req: Request) {
  const auth = await verifyAuth(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return auth;
}
```

**Source:** Existing codebase pattern, verified against Firebase Admin SDK docs.

### Pattern 2: Client-Side Auth Guard

**What:** Pages check `useAuth()` state and redirect to `/sign-in` if not authenticated.
**When to use:** Every authenticated page.
**Current bypass:** Auth check is commented out.
**Fix pattern:**

```typescript
// In page components
const { user, loading } = useAuth();

if (loading) return <LoadingSpinner />;
if (!user) {
  router.push("/sign-in");
  return null;
}
```

**Source:** Existing commented-out code in `src/app/page.tsx` and `src/app/projects/[projectId]/page.tsx`.

### Pattern 3: Authenticated Fetch Hook

**What:** `useAuthedFetch()` wraps fetch with the Firebase ID token in the Authorization header.
**When to use:** Every client-side API call (already used everywhere except `src/app/page.tsx`).
**Current bypass:** Falls back to unauthenticated fetch when no token.
**Fix pattern:**

```typescript
// src/hooks/use-authed-fetch.ts - AFTER Phase 4
const authedFetch = useCallback(
  async (url: string, options?: RequestInit): Promise<Response> => {
    const token = await getIdToken();
    if (!token) {
      throw new Error("Not authenticated");
    }
    const headers = new Headers(options?.headers);
    headers.set("Authorization", `Bearer ${token}`);
    return fetch(url, { ...options, headers });
  },
  [getIdToken],
);
```

**Source:** Existing codebase `src/hooks/use-authed-fetch.ts`.

### Pattern 4: Data Isolation via Ownership Check

**What:** `getProjectForUser(projectId, userId)` fetches a project only if `project.userId === userId`.
**When to use:** Every API route that accesses project data (already done).
**No changes needed** -- this pattern is already correctly implemented.

```typescript
// src/lib/db/projects.ts - already correct
export async function getProjectForUser(
  projectId: string,
  userId: string,
): Promise<Project | null> {
  const project = await getProject(projectId);
  if (!project || project.userId !== userId) {
    return null;  // Returns null for non-owners, route returns 404
  }
  return project;
}
```

**Source:** Existing codebase `src/lib/db/projects.ts`.

### Pattern 5: Prompt Privacy via Log Sanitization

**What:** The logger strips sensitive fields (`brainDump`, `prompt`, `content`, `composedPrompt`) from all log metadata before writing to console/Cloud Logging.
**When to use:** Automatically applied to all log calls.
**No changes needed** -- already implemented.

**Source:** Existing codebase `src/lib/logger.ts`, lines 36-47.

### Existing File Structure (No New Directories)

```
src/
├── lib/
│   ├── auth/
│   │   ├── verify-token.ts    # verifyAuth() - server-side token verification
│   │   └── require-auth.ts    # requireAuth() - API route auth helper (HAS BYPASS)
│   └── firebase/
│       ├── config.ts          # Client-side Firebase app/auth initialization
│       └── auth-context.tsx   # AuthProvider, useAuth() hook
├── hooks/
│   └── use-authed-fetch.ts    # useAuthedFetch() hook (HAS BYPASS)
├── app/
│   ├── sign-in/
│   │   └── page.tsx           # Google sign-in page (COMPLETE)
│   ├── page.tsx               # Home page (HAS BYPASSES)
│   └── projects/
│       └── [projectId]/
│           └── page.tsx       # Project page (HAS BYPASSES)
└── components/
    └── layout/
        └── app-header.tsx     # Shows user email, sign-out button (COMPLETE)
```

### Anti-Patterns to Avoid

- **Do NOT use Next.js proxy.ts (formerly middleware.ts) for auth:** The app uses API routes with Bearer tokens, not cookies. Adding a proxy layer would require cookie-based auth management which is a significant architectural change for no benefit. The current Bearer token pattern is correct and simpler.
- **Do NOT add session cookies:** Firebase ID tokens are automatically refreshed by the client SDK. Bearer token pattern avoids CSRF, cookie management, and Edge/Node runtime issues.
- **Do NOT create admin/builder endpoints that expose prompt data:** AUTH-05 requires prompt content to only be visible to the owning user. No admin read paths.
- **Do NOT add `checkRevoked: true` to verifyIdToken by default:** Adds a Firestore lookup per request. Only use if token revocation is specifically required.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Token verification | Custom JWT parsing | `getAuth().verifyIdToken(token)` (firebase-admin) | Handles key rotation, signature verification, claim validation, expiration |
| Token refresh | Manual token refresh logic | `user.getIdToken()` (firebase client SDK) | Automatically returns cached token or refreshes if expired |
| Auth state management | Custom auth state tracking | `onAuthStateChanged()` via AuthProvider | Handles all auth state transitions, persistence, tab sync |
| Data isolation | Custom SQL/Firestore queries with WHERE | `getProjectForUser()` pattern (already built) | Centralizes the ownership check in one function |
| Log sanitization | Per-log-call field filtering | Centralized logger sanitization (already built) | Single point of control, impossible to forget |

**Key insight:** The entire auth infrastructure is already built. The phase is about removing bypasses and verifying correctness, not building new systems.

## Common Pitfalls

### Pitfall 1: Missing a Bypass Point

**What goes wrong:** One of the three bypass layers (client guard, fetch hook, server requireAuth) is not updated, leaving a hole.
**Why it happens:** The bypasses are spread across 5+ files with commented-out code and TODO markers.
**How to avoid:** Use the comprehensive bypass inventory below. Verify each one is removed with tests.
**Warning signs:** Any remaining `"anonymous"` userId in the codebase, any TODO mentioning Phase 4.

**Complete bypass inventory (9 locations in 5 files):**

| File | Line | Bypass | Fix |
|------|------|--------|-----|
| `src/lib/auth/require-auth.ts` | 13 | Returns `{ userId: "anonymous" }` | Return 401 NextResponse |
| `src/hooks/use-authed-fetch.ts` | 17-18 | Falls back to unauthenticated fetch | Throw error or redirect |
| `src/app/page.tsx` | 6-8 | Imports commented out | Uncomment |
| `src/app/page.tsx` | 14 | `authLoading = false` hardcoded | Use `useAuth()` |
| `src/app/page.tsx` | 28-32 | Auth guard commented out | Uncomment |
| `src/app/page.tsx` | 46 | Raw `fetch()` instead of `authedFetch()` | Use `authedFetch()` |
| `src/app/projects/[projectId]/page.tsx` | 29 | User not destructured from useAuth | Destructure `user` |
| `src/app/projects/[projectId]/page.tsx` | 39-43 | Auth guard commented out | Uncomment |
| `src/app/projects/[projectId]/page.tsx` | 67 | User not in dependency array | Add `user` |

### Pitfall 2: Client-Side 401 Handling

**What goes wrong:** After enabling server auth, unauthenticated requests return 401 but the client doesn't handle it gracefully. Users see "Failed to create project" instead of being redirected to sign-in.
**Why it happens:** The client currently never receives 401 because the server always returns `{ userId: "anonymous" }`.
**How to avoid:** Add 401 response handling in `useAuthedFetch()` or at the component level. The project page already handles 401 (line 52: `if (res.status === 401) { router.push("/sign-in"); }`).
**Warning signs:** Error messages showing "Failed to..." when user is not signed in.

### Pitfall 3: Token Expiration During Long Sessions

**What goes wrong:** Firebase ID tokens expire after 1 hour. If a user stays on the page without navigating, `getIdToken()` returns a cached expired token, API calls fail with 401.
**Why it happens:** `user.getIdToken()` in the Firebase client SDK automatically refreshes expired tokens, but only if the refresh token is still valid and network is available.
**How to avoid:** The current implementation already handles this correctly. `user.getIdToken()` is called per-request in `useAuthedFetch`, and Firebase SDK handles refresh automatically. No action needed.
**Warning signs:** Intermittent 401 errors after ~1 hour of inactivity.

### Pitfall 4: Home Page Uses Raw fetch() Instead of authedFetch()

**What goes wrong:** `src/app/page.tsx` line 46 uses `fetch("/api/projects", ...)` directly instead of the `useAuthedFetch()` hook. When auth is enforced, project creation will fail with 401.
**Why it happens:** The imports for `useAuthedFetch` and `useAuth` were commented out as part of the Phase 4 bypass.
**How to avoid:** Uncomment the imports and switch to `authedFetch()`.
**Warning signs:** Project creation fails with "Unauthorized" after enabling auth.

### Pitfall 5: analyze-gaps Route Missing Project Ownership Check

**What goes wrong:** The `/api/analyze-gaps` route uses `requireAuth` for identity but does NOT verify project ownership (no `getProjectForUser` call). It takes `projectName` and `brainDump` directly from the request body.
**Why it happens:** Gap analysis doesn't reference a specific project ID in its current design -- it operates on raw input.
**How to avoid:** This is acceptable as-is because the route only processes input the user provides. There is no data access from another user's data. The auth requirement ensures rate limiting is tied to a real user.
**Warning signs:** None -- this is by design.

### Pitfall 6: Platform-Infra Firebase Config

**What goes wrong:** The sign-in page uses `signInWithPopup` with Google Auth, which requires the Firebase project's `authDomain` to be correctly configured. If the platform-infra shared auth domain (dan-weinbeck.com) is not properly set up, sign-in will fail with popup errors.
**Why it happens:** Firebase Auth needs the `authDomain` to match a domain that is authorized for OAuth redirects in the Google Cloud Console.
**How to avoid:** Verify that `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` is set correctly in environment variables, and that the domain is authorized in Firebase Console > Authentication > Settings > Authorized Domains.
**Warning signs:** Popup errors, "auth/unauthorized-domain" errors, blank popup windows.

## Code Examples

### Example 1: requireAuth() After Bypass Removal

```typescript
// src/lib/auth/require-auth.ts
import "server-only";
import { NextResponse } from "next/server";
import { verifyAuth } from "./verify-token";

export async function requireAuth(req: Request) {
  const auth = await verifyAuth(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return auth;
}
```

**Source:** Direct modification of existing `src/lib/auth/require-auth.ts`.

### Example 2: useAuthedFetch() After Bypass Removal

```typescript
// src/hooks/use-authed-fetch.ts
"use client";

import { useCallback } from "react";
import { useAuth } from "@/lib/firebase/auth-context";

export function useAuthedFetch() {
  const { getIdToken } = useAuth();

  const authedFetch = useCallback(
    async (url: string, options?: RequestInit): Promise<Response> => {
      const token = await getIdToken();
      if (!token) {
        // Return a synthetic 401 response so callers handle it uniformly
        return new Response(JSON.stringify({ error: "Not authenticated" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      const headers = new Headers(options?.headers);
      headers.set("Authorization", `Bearer ${token}`);
      return fetch(url, { ...options, headers });
    },
    [getIdToken],
  );

  return authedFetch;
}
```

**Source:** Direct modification of existing `src/hooks/use-authed-fetch.ts`.

### Example 3: Home Page After Bypass Removal

```typescript
// src/app/page.tsx (key changes)
import { useAuthedFetch } from "@/hooks/use-authed-fetch";
import { useAuth } from "@/lib/firebase/auth-context";

export default function Home() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const authedFetch = useAuthedFetch();
  // ... state

  if (authLoading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    router.push("/sign-in");
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    // ... validation
    const res = await authedFetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), mode }),
    });
    // ... handle response including 401
  }
}
```

**Source:** Uncommented and restored from existing `src/app/page.tsx`.

### Example 4: Test Pattern for Auth Enforcement

```typescript
// Test that API routes reject unauthenticated requests
import { describe, it, expect, vi } from "vitest";

describe("requireAuth", () => {
  it("returns 401 when no Authorization header present", async () => {
    const req = new Request("http://localhost/api/projects", {
      method: "POST",
    });
    const result = await requireAuth(req);
    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(401);
  });

  it("returns 401 for invalid token", async () => {
    const req = new Request("http://localhost/api/projects", {
      method: "POST",
      headers: { Authorization: "Bearer invalid-token" },
    });
    const result = await requireAuth(req);
    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(401);
  });

  it("returns userId for valid token", async () => {
    // Mock verifyIdToken to return a decoded token
    vi.spyOn(firebaseAuth, "verifyIdToken").mockResolvedValue({
      uid: "user-123",
    } as any);

    const req = new Request("http://localhost/api/projects", {
      method: "POST",
      headers: { Authorization: "Bearer valid-token" },
    });
    const result = await requireAuth(req);
    expect(result).toEqual({ userId: "user-123" });
  });
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `middleware.ts` for route protection | `proxy.ts` (Next.js 16) | Next.js 16 (2026) | If we were using middleware, would need rename. Not applicable -- we use API route auth. |
| Edge runtime middleware | Node.js-only proxy runtime | Next.js 16 (2026) | next-firebase-auth-edge library may have issues. Not applicable -- we don't use it. |
| `firebase.auth()` compat SDK | Modular `getAuth()` from `firebase/auth` | Firebase SDK 9+ (2021) | Already using modular SDK. No action needed. |

**Deprecated/outdated:**
- Next.js `middleware.ts` is now `proxy.ts` in Next.js 16. Not relevant to this phase since we use API route-level auth, not middleware-level auth.

## Comprehensive Change Audit

### Files That Need Changes

| File | Change Type | Complexity |
|------|-------------|------------|
| `src/lib/auth/require-auth.ts` | Remove anonymous fallback, return 401 | Trivial |
| `src/hooks/use-authed-fetch.ts` | Remove unauthenticated fallback | Low |
| `src/app/page.tsx` | Uncomment auth imports/guards, switch to authedFetch | Low |
| `src/app/projects/[projectId]/page.tsx` | Uncomment auth guards, add user to deps | Low |

### Files That Are Already Correct (Verify Only)

| File | What to Verify |
|------|----------------|
| `src/lib/auth/verify-token.ts` | Server-side verifyIdToken works correctly |
| `src/lib/firebase/config.ts` | Client Firebase config is correct |
| `src/lib/firebase/auth-context.tsx` | AuthProvider, useAuth, getIdToken work |
| `src/app/sign-in/page.tsx` | Google sign-in flow works end-to-end |
| `src/components/layout/app-header.tsx` | Shows user email, sign-out works |
| `src/lib/db/projects.ts` | getProjectForUser() enforces ownership (AUTH-03) |
| `src/lib/logger.ts` | Sanitizes prompt content from logs (AUTH-06) |
| `src/lib/analytics.ts` | No prompt content in analytics events (AUTH-06) |
| All API routes | Use requireAuth + getProjectForUser correctly |

### Routes That Don't Use Firebase Auth (Correct)

| Route | Auth Mechanism | Why Different |
|-------|---------------|---------------|
| `/api/cron/cleanup` | CRON_SECRET Bearer token | Automated job, no user context |
| `/api/webhooks/stripe` | Stripe signature verification | Webhook, no user context |

## Open Questions

1. **Platform-infra Firebase project configuration**
   - What we know: The app uses env vars (`NEXT_PUBLIC_FIREBASE_*` and `FIREBASE_*`) for both client and admin SDK config. The sign-in page uses Google auth via `signInWithPopup`.
   - What's unclear: Whether the Firebase project associated with dan-weinbeck.com platform-infra has Google sign-in enabled, and whether the authorized domains include the FRD Generator's deployment URL.
   - Recommendation: Verify Firebase Console configuration before testing. This is an infrastructure concern, not a code concern.

2. **Existing "anonymous" user data migration**
   - What we know: During Phases 1-3, all projects were created with `userId: "anonymous"`. These documents exist in Firestore.
   - What's unclear: Whether existing test data should be migrated, deleted, or left as orphaned data.
   - Recommendation: Since this is pre-production, simply leave existing test data. It will be inaccessible (no user has userId "anonymous" in Firebase Auth) and will be cleaned up by the 90-day retention policy in Phase 5.

3. **signInWithPopup vs signInWithRedirect**
   - What we know: The sign-in page uses `signInWithPopup`. Firebase recommends popup for desktop, redirect for mobile.
   - What's unclear: Whether `signInWithPopup` works reliably on all target mobile browsers.
   - Recommendation: Start with popup (already implemented). If mobile issues arise, add redirect fallback later. This is out of scope for Phase 4 core requirements.

## Sources

### Primary (HIGH confidence)
- Existing codebase analysis: All auth files, all API routes, all client components (read in full)
- [Firebase Auth Admin: Verify ID Tokens](https://firebase.google.com/docs/auth/admin/verify-id-tokens) - verifyIdToken API
- [Firebase Auth Web: Google Sign-In](https://firebase.google.com/docs/auth/web/google-signin) - signInWithPopup pattern
- [Firebase Auth: Manage Sessions](https://firebase.google.com/docs/auth/admin/manage-sessions) - Token expiration (1 hour), automatic refresh

### Secondary (MEDIUM confidence)
- [Next.js 16: Middleware to Proxy rename](https://nextjs.org/docs/messages/middleware-to-proxy) - Confirmed proxy.ts replaces middleware.ts
- [Next.js 16 Release Blog](https://nextjs.org/blog/next-16) - proxy runtime is Node.js only
- [Next.js 16 Upgrade Guide](https://nextjs.org/docs/app/guides/upgrading/version-16) - Migration details

### Tertiary (LOW confidence)
- None -- all findings verified against codebase and official docs.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed and configured, versions verified
- Architecture: HIGH - All patterns already implemented in codebase, just need bypass removal
- Pitfalls: HIGH - Complete bypass inventory from actual codebase analysis, all 9 locations identified
- Data isolation: HIGH - `getProjectForUser()` pattern verified in every relevant API route
- Prompt privacy: HIGH - Logger sanitization and analytics type safety verified in source

**Research date:** 2026-02-12
**Valid until:** 2026-03-14 (stable -- no moving targets, all libs already pinned)
