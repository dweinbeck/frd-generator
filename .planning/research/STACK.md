# Stack Research

**Domain:** AI-powered document generation web app (FRD Generator)
**Researched:** 2026-02-11
**Confidence:** HIGH (core stack decided, supporting libraries verified against current sources)

## Recommended Stack

### Core Technologies (Pre-Decided)

These are locked in to match the existing dan-weinbeck.com platform.

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js | 16.x | Full-stack React framework | Latest stable with Turbopack default, Cache Components, proxy.ts replacing middleware, React 19.2 support. Minimum Node.js 20.9+. Released Oct 2025. |
| React | 19.2 | UI library | Ships with Next.js 16 App Router. Includes View Transitions, useEffectEvent, Activity component. React Compiler 1.0 stable. |
| TypeScript | 5.9.x | Type safety | Latest stable (5.9.3). Next.js 16 requires TS 5.1+. TS 6.0 beta exists but is too early for production. |
| Tailwind CSS | 4.1.x | Utility-first styling | Latest stable (4.1.18). 5x faster full builds vs v3, zero-config, CSS-first configuration via `@import "tailwindcss"`. Ships with `create-next-app`. |
| Firestore | via firebase-admin 13.x | NoSQL database | firebase-admin 13.6.1 is latest. Server-side only access via Admin SDK bypasses security rules (appropriate for Next.js server components/actions). |
| Biome | 2.3.x | Linter + formatter | Single binary replacing ESLint + Prettier. 10-25x faster, 97% Prettier compatibility, 423+ lint rules. Next.js 16 removed `next lint` -- recommends Biome or ESLint directly. |
| Vitest | 4.0.x | Testing framework | Latest stable (4.0.18). TypeScript built-in, no @types needed. Standard for Vite-era testing. |
| GCP Cloud Run | N/A | Container hosting | Matches existing platform deployment target. |

### AI Integration

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Vercel AI SDK | 6.x (`ai` package) | AI abstraction layer | Major version with unified generateText/streamText API, structured output via Output.object(), tool calling, streaming. Deprecates generateObject/streamObject. |
| @ai-sdk/google | 3.0.x | Gemini provider | Latest 3.0.23. Supports Gemini 3 Pro Preview, Gemini 2.5 Flash/Pro, structured output, streaming, tool calling, reasoning modes, grounding tools. |
| Zod | 4.x | Schema validation | Latest 4.3.6. Used by AI SDK for structured output schemas (Output.object({ schema: z.object({...}) })). Also validates API inputs, form data. Zod 4 is faster and slimmer than v3. |

### Authentication

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Firebase Auth (client) | via firebase 11.x | Client-side auth (Google Sign-In) | Native integration with Firebase ecosystem. Handles OAuth flows, provides ID tokens for session creation. |
| firebase-admin | 13.6.x | Server-side auth verification | createSessionCookie() + verifySessionCookie() pattern for secure server-side sessions. Admin SDK bypasses Firestore rules -- appropriate for server-only access. |
| next-firebase-auth-edge | 1.x | Edge-compatible auth helpers | Handles Firebase auth token verification without Node.js crypto dependency. Works with Next.js proxy.ts (formerly middleware.ts) for route protection. |

**Why NOT next-auth/Auth.js v5:** Still in beta (5.0.0-beta.30 as of Feb 2026, never reached stable). The project already uses Firebase Auth for the dan-weinbeck.com platform. Adding next-auth introduces an unnecessary abstraction layer between Firebase Auth and your app. Direct Firebase Auth + session cookies is simpler, faster, and more reliable for a Firebase-native stack.

### Payments

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| stripe (Node.js) | 20.x | Server-side Stripe API | Latest 20.3.1. API version 2026-01-28.clover. Used in Server Actions and Route Handlers for Checkout Sessions and webhook verification. |
| @stripe/stripe-js | 8.x | Client-side Stripe loader | Latest 8.7.0. Loads Stripe.js for redirect to Checkout. Lightweight -- only needed for the payment redirect, not embedded Elements. |

**Why NOT @stripe/react-stripe-js:** For a credit-pack purchase flow, Stripe Checkout (hosted page) is simpler and more secure than embedded Stripe Elements. Users click "Buy 10 Credits" and get redirected to Stripe's hosted checkout. No need to build custom payment forms, handle PCI compliance, or embed Stripe Elements.

### Markdown Rendering

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| react-markdown | 10.x | Markdown-to-React rendering | Latest 10.1.0. Renders generated FRD markdown safely as React components. Extensible via remark/rehype plugins. Works with React 19 (peer dep warnings can be overridden with --legacy-peer-deps if needed). |
| remark-gfm | 4.x | GitHub Flavored Markdown | Adds tables, task lists, strikethrough, autolinks. Essential for FRD documents that use tables and checklists. |
| rehype-pretty-code | 0.14.x | Syntax highlighting | Powered by shiki. Server-side highlighting (zero runtime JS). Beautiful code blocks for technical FRD content. Works at build-time and SSR. |
| remark-math + rehype-katex | latest | Math rendering | Optional. Only if FRDs contain mathematical notation. Defer unless needed. |

**Why NOT MDXEditor:** MDXEditor requires client-side-only rendering (`dynamic({ ssr: false })`), adds significant bundle size via Lexical framework, and the FRD Generator produces markdown output (read/copy) -- it does not need a WYSIWYG editor. Users iterate via AI prompts, not manual editing. react-markdown for rendering + a textarea for raw editing is the right complexity level.

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @tailwindcss/typography | 0.5.x | Prose styling for rendered markdown | Apply to FRD output display. `prose` classes handle headings, lists, code blocks, tables beautifully with zero custom CSS. |
| @tailwindcss/postcss | 4.x | PostCSS integration | Required for Tailwind v4 with Next.js. Added to postcss.config.mjs. |
| lucide-react | latest | Icon library | Tree-shakeable SVG icons. Lighter than heroicons, consistent with modern React apps. |
| nanoid | 5.x | ID generation | Short, URL-friendly unique IDs for documents, versions. Faster and smaller than uuid. |
| date-fns | 4.x | Date formatting | Lightweight date utility. Tree-shakeable. For displaying "created 3 days ago" timestamps. |
| clsx | 2.x | Conditional classnames | Tiny utility for conditional Tailwind class composition. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Biome 2.3.x | Lint + format | Single `biome.json` config. Run `biome check --write` to fix. Replaces ESLint + Prettier entirely. |
| Vitest 4.0.x | Unit/integration tests | Configure with `vitest.config.ts`. Use `@testing-library/react` for component tests. |
| @testing-library/react | 16.x | Component testing | Standard React testing utilities. Works with Vitest. |
| Turbopack | Built into Next.js 16 | Dev/build bundler | Default in Next.js 16. No configuration needed. 2-5x faster builds, 10x faster HMR. |

## Installation

```bash
# Core framework (Next.js 16 includes React 19.2)
npm install next@latest react@latest react-dom@latest

# AI integration
npm install ai @ai-sdk/google zod

# Firebase
npm install firebase firebase-admin next-firebase-auth-edge

# Payments
npm install stripe @stripe/stripe-js

# Markdown rendering
npm install react-markdown remark-gfm rehype-pretty-code shiki

# UI utilities
npm install @tailwindcss/typography clsx lucide-react nanoid date-fns

# Dev dependencies
npm install -D typescript @types/node @biomejs/biome vitest @testing-library/react @testing-library/jest-dom @vitejs/plugin-react tailwindcss @tailwindcss/postcss
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Firebase Auth + session cookies | next-auth v5 (beta) | Only if you need multiple OAuth providers beyond Google (GitHub, Apple, etc.) and want adapter-based session management. Not worth it for Firebase-native stacks. |
| Stripe Checkout (hosted) | Stripe Elements (embedded) | Only if you need a fully embedded payment form within your UI (e.g., inline credit card entry). Checkout is simpler and handles PCI compliance automatically. |
| react-markdown | MDXEditor | Only if users need WYSIWYG editing of the FRD content. The FRD Generator produces AI output -- users read/copy it, they don't manually edit markdown. |
| react-markdown | @next/mdx | Only for static MDX content in your codebase (docs, blog posts). Not suitable for rendering dynamic AI-generated markdown at runtime. |
| rehype-pretty-code (shiki) | rehype-highlight (highlight.js) | rehype-highlight is simpler but produces lower-quality highlighting. rehype-pretty-code with shiki offers VS Code-quality themes and zero-runtime-JS server rendering. |
| Firestore (direct Admin SDK) | Prisma + PostgreSQL | If you need complex relational queries, JOINs, or ACID transactions across many tables. Firestore is simpler for document-oriented data like FRDs/versions and matches the existing platform. |
| Zod 4 | Valibot | Valibot is smaller bundle-wise, but Zod has deeper AI SDK integration and larger ecosystem. Zod 4 closes the size gap. |
| nanoid | uuid | uuid is standard but longer (36 chars vs 21). nanoid is faster, smaller, URL-safe by default. |
| Biome | ESLint + Prettier | If you need ESLint plugins not yet supported by Biome (e.g., accessibility plugins like jsx-a11y). Biome covers 423+ rules and is actively adding more. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| generateObject / streamObject (AI SDK) | Deprecated in AI SDK 6. Will be removed in future versions. | generateText / streamText with `output: Output.object({ schema })` |
| next-auth v4 (4.24.13) | Does not support Next.js 16 App Router patterns well. v5 is the only option if using next-auth, and it is still beta. | Firebase Auth + session cookies |
| middleware.ts | Deprecated in Next.js 16. Still works but will be removed. | proxy.ts (same logic, renamed) |
| Tailwind CSS v3 config | tailwind.config.js is replaced by CSS-first config in v4. The old JS config still works but is legacy. | `@import "tailwindcss"` in CSS with `@theme` blocks |
| experimental.ppr / experimental.dynamicIO | Removed in Next.js 16. | `cacheComponents: true` in next.config.ts |
| CoreMessage type (AI SDK) | Removed in AI SDK 6. | ModelMessage type |
| next lint | Removed from Next.js 16. `next build` no longer runs linting. | Biome (`biome check`) or ESLint CLI directly |
| Moment.js | Massive bundle, mutable API, abandoned. | date-fns (tree-shakeable, immutable) |
| styled-components / CSS Modules | Unnecessary complexity when using Tailwind. Additional build overhead. | Tailwind CSS v4 utility classes |

## Stack Patterns by Variant

**If adding real-time collaboration (future):**
- Use Firestore real-time listeners (`onSnapshot`) on the client
- May need `firebase` client SDK alongside `firebase-admin`
- Consider Yjs or Liveblocks for true collaborative editing

**If switching to Gemini 3 Pro for premium tier:**
- Same `@ai-sdk/google` provider, just change model string
- `google('gemini-3-pro-preview')` vs `google('gemini-2.5-flash')`
- No code changes needed beyond model selection logic

**If credit system needs subscription tiers (future):**
- Add Stripe Billing with `mode: 'subscription'` alongside `mode: 'payment'`
- Use Stripe's built-in billing credits API (`/v1/billing/credit_grants`) for subscription-granted credits
- Keep Firestore credit balance as source of truth, sync via webhooks

**If needing Edge Runtime for proxy.ts:**
- next-firebase-auth-edge handles token verification without Node.js crypto
- Avoid firebase-admin in proxy.ts (requires Node.js runtime)
- Use next-firebase-auth-edge for lightweight token checks in the proxy layer

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| Next.js 16.x | React 19.2, Node.js 20.9+ | Turbopack is default bundler. TypeScript 5.1+ required. |
| AI SDK 6.x (ai) | @ai-sdk/google 3.x | Must use matching major versions. AI SDK 6 requires v3 Language Model Spec providers. |
| @ai-sdk/google 3.x | Zod 4.x | Zod schemas used for structured output. Zod 3.x also works but 4.x is recommended. |
| Tailwind CSS 4.1.x | @tailwindcss/postcss 4.x | Requires PostCSS plugin, not the old tailwindcss CLI. |
| react-markdown 10.x | React 19 | May show peer dependency warnings. Use `--legacy-peer-deps` if npm complains. Functionally works. |
| firebase-admin 13.x | Node.js 18+ | Uses @google-cloud/firestore v7 internally. |
| stripe 20.x | API version 2026-01-28 | Auto-uses latest API version. Pin if needed via `apiVersion` option. |
| Vitest 4.x | @testing-library/react 16.x | Use `@vitejs/plugin-react` for JSX transform in tests. |
| Biome 2.3.x | TypeScript 5.9 | Full TS 5.9 syntax support including `import defer`. |

## Key Integration Patterns

### AI SDK 6 + Gemini Structured Output (Server Action)

```typescript
'use server';

import { generateText, Output } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';

const FRDSchema = z.object({
  title: z.string().describe('Project title'),
  overview: z.string().describe('Project overview paragraph'),
  personas: z.array(z.object({
    name: z.string(),
    description: z.string(),
    goals: z.array(z.string()),
  })),
  features: z.array(z.object({
    name: z.string(),
    description: z.string(),
    priority: z.enum(['must-have', 'should-have', 'nice-to-have']),
    acceptanceCriteria: z.array(z.string()),
  })),
});

export async function generateFRD(prompt: string, model: 'flash' | 'pro') {
  const modelId = model === 'pro'
    ? 'gemini-3-pro-preview'
    : 'gemini-2.5-flash';

  const { output } = await generateText({
    model: google(modelId),
    output: Output.object({ schema: FRDSchema }),
    prompt,
  });

  return output;
}
```

### AI SDK 6 + Streaming Text (for Markdown FRD output)

```typescript
'use server';

import { streamText } from 'ai';
import { google } from '@ai-sdk/google';

export async function streamFRDMarkdown(prompt: string) {
  const result = streamText({
    model: google('gemini-2.5-flash'),
    system: 'You are an FRD generator. Output valid Markdown...',
    prompt,
  });

  return result.toDataStreamResponse();
}
```

### Firestore Credit Deduction (Atomic)

```typescript
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const db = getFirestore();

export async function deductCredits(userId: string, amount: number) {
  const userRef = db.collection('users').doc(userId);

  return db.runTransaction(async (tx) => {
    const doc = await tx.get(userRef);
    const currentCredits = doc.data()?.credits ?? 0;

    if (currentCredits < amount) {
      throw new Error('Insufficient credits');
    }

    tx.update(userRef, {
      credits: FieldValue.increment(-amount),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return currentCredits - amount;
  });
}
```

### Stripe Checkout for Credit Purchase

```typescript
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function createCreditCheckout(
  userId: string,
  creditPackage: { credits: number; priceInCents: number }
) {
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: { name: `${creditPackage.credits} FRD Credits` },
        unit_amount: creditPackage.priceInCents,
      },
      quantity: 1,
    }],
    metadata: { userId, credits: String(creditPackage.credits) },
    success_url: `${process.env.NEXT_PUBLIC_URL}/credits?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_URL}/credits?canceled=true`,
  });

  return session.url;
}
```

## Sources

- [Next.js 16 Blog Post](https://nextjs.org/blog/next-16) -- Official release notes (HIGH confidence)
- [AI SDK 6 Migration Guide](https://ai-sdk.dev/docs/migration-guides/migration-guide-6-0) -- Breaking changes (HIGH confidence)
- [AI SDK Google Provider Docs](https://ai-sdk.dev/providers/ai-sdk-providers/google-generative-ai) -- Model support, features (HIGH confidence)
- [AI SDK Structured Data Generation](https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data) -- Output.object pattern (HIGH confidence)
- [Stripe Billing Credits Docs](https://docs.stripe.com/billing/subscriptions/usage-based/billing-credits/implementation-guide) -- Credit grant API (HIGH confidence)
- [Stripe Credit Balance Transactions API](https://docs.stripe.com/api/billing/credit-balance-transaction) -- Ledger transactions (HIGH confidence)
- [Pre-Paid Credit Billing Pattern](https://www.pedroalonso.net/blog/stripe-usage-credit-billing/) -- Architecture patterns (MEDIUM confidence)
- [Firebase Firestore Best Practices](https://firebase.google.com/docs/firestore/best-practices) -- Data modeling (HIGH confidence)
- [Firebase Transactions Docs](https://firebase.google.com/docs/firestore/manage-data/transactions) -- Atomic operations (HIGH confidence)
- [Firebase Auth + Next.js Session Cookies](https://firebase.google.com/codelabs/firebase-nextjs) -- Auth pattern (HIGH confidence)
- [next-firebase-auth-edge npm](https://www.npmjs.com/package/next-firebase-auth-edge) -- Edge auth support (MEDIUM confidence)
- [react-markdown GitHub](https://github.com/remarkjs/react-markdown) -- Markdown rendering (HIGH confidence)
- [rehype-pretty-code docs](https://rehype-pretty.pages.dev/) -- Syntax highlighting (MEDIUM confidence)
- [Tailwind CSS v4 Blog](https://tailwindcss.com/blog/tailwindcss-v4) -- v4 features (HIGH confidence)
- [Biome Migration Guide](https://biomejs.dev/guides/migrate-eslint-prettier/) -- ESLint/Prettier replacement (HIGH confidence)
- [Vitest 4 Blog](https://vitest.dev/blog/vitest-4) -- Latest features (HIGH confidence)
- [Zod npm](https://www.npmjs.com/package/zod) -- Version 4.3.6 (HIGH confidence)
- npm dist-tags check: next-auth latest=4.24.13, beta=5.0.0-beta.30 -- (HIGH confidence, verified via npm CLI)

---
*Stack research for: FRD Generator (AI-powered document generation)*
*Researched: 2026-02-11*
