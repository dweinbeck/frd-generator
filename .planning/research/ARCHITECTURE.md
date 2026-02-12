# Architecture Research

**Domain:** AI-powered document generation (FRD Generator)
**Researched:** 2026-02-11
**Confidence:** HIGH

## System Overview

```
+-----------------------------------------------------------------------+
|                         Client Layer (Browser)                         |
|                                                                        |
|  +------------------+  +-------------------+  +---------------------+  |
|  | Fast Mode UI     |  | Standard Mode UI  |  | Dashboard / History |  |
|  | (Brain Dump +    |  | (Guided Q&A       |  | (Project List,      |  |
|  |  Follow-ups)     |  |  Wizard Steps)    |  |  Version Compare)   |  |
|  +--------+---------+  +--------+----------+  +----------+----------+  |
|           |                     |                        |             |
|  +--------+---------------------+------------------------+----------+  |
|  |                    Shared Client Services                         |  |
|  |  SWR Cache | Input State Manager | Stream Consumer | Auth State  |  |
|  +---+----------------------------+--------------------+------------+  |
+------+----------------------------+--------------------+--------------+
       |                            |                    |
=======+============================+====================+===============
       |          Network Boundary (HTTP / SSE)          |
=======+============================+====================+===============
       |                            |                    |
+------+----------------------------+--------------------+--------------+
|                       Server Layer (Next.js)                           |
|                                                                        |
|  +------------------+  +-------------------+  +---------------------+  |
|  | Route Handlers   |  | Route Handlers    |  | Route Handlers      |  |
|  | /api/generate/*  |  | /api/projects/*   |  | /api/credits/*      |  |
|  +--------+---------+  +--------+----------+  +----------+----------+  |
|           |                     |                        |             |
|  +--------+---------------------+------------------------+----------+  |
|  |                    Server Services Layer                          |  |
|  |  Prompt Composer | Generation Engine | Credit Ledger | Auth      |  |
|  +--------+---------+--------+----------+----------+----+-----------+  |
|           |                  |                     |      |            |
|  +--------+---------+  +----+-------+  +-----------+--+  |            |
|  | Vercel AI SDK    |  | Firebase   |  | Stripe SDK |  |            |
|  | (@ai-sdk/google) |  | Admin SDK  |  |            |  |            |
|  +--------+---------+  +----+-------+  +-----+------+  |            |
+----------+-------------------+----------------+--------+--------------+
           |                   |                |
    +------+------+    +------+------+   +------+------+
    | Google AI   |    | Firestore   |   | Stripe API  |
    | (Gemini)    |    | Database    |   |             |
    +-------------+    +-------------+   +-------------+
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Fast Mode UI | Brain dump textarea, gap analysis display, follow-up Q&A, stream rendering | Client Component with `useCompletion` or custom stream hook |
| Standard Mode UI | Multi-step guided form wizard, input collection per section | Client Component with step state, React Context for cross-step data |
| Dashboard / History | Project CRUD, version list, version comparison, ratings | Client Component with SWR for data fetching |
| Input State Manager | Collects and validates all user inputs before generation | Zustand or React Context + Zod validation |
| Stream Consumer | Renders streaming Markdown output from SSE in real time | Custom hook wrapping Vercel AI SDK stream utilities |
| Prompt Composer | Assembles system prompt + user context into final LLM prompt | Server-only module, pure functions, testable in isolation |
| Generation Engine | Orchestrates streamText/generateText calls, manages model selection | Server-only module wrapping Vercel AI SDK |
| Credit Ledger | Tracks credit balance, validates before generation, deducts after | Server-only module with Firestore transactions |
| Auth | Firebase Auth verification, user context propagation | Middleware + server-side token verification |

## Recommended Project Structure

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx           # Login page
│   │   └── layout.tsx               # Auth layout (no sidebar)
│   ├── (dashboard)/
│   │   ├── layout.tsx               # Dashboard layout (sidebar, nav)
│   │   ├── page.tsx                 # Project list / home
│   │   ├── projects/
│   │   │   ├── [projectId]/
│   │   │   │   ├── page.tsx         # Project detail + version history
│   │   │   │   └── versions/
│   │   │   │       └── [versionId]/
│   │   │   │           └── page.tsx # Version view + comparison
│   │   │   └── new/
│   │   │       └── page.tsx         # New project entry point
│   │   ├── generate/
│   │   │   ├── fast/
│   │   │   │   └── page.tsx         # Fast mode: brain dump flow
│   │   │   └── standard/
│   │   │       └── page.tsx         # Standard mode: guided wizard
│   │   └── credits/
│   │       └── page.tsx             # Credit balance, purchase history
│   ├── api/
│   │   ├── generate/
│   │   │   ├── fast/
│   │   │   │   ├── analyze/route.ts # Gap detection (streaming)
│   │   │   │   └── create/route.ts  # FRD generation (streaming)
│   │   │   └── standard/
│   │   │       └── create/route.ts  # FRD generation (streaming)
│   │   ├── projects/
│   │   │   ├── route.ts             # List/create projects
│   │   │   └── [projectId]/
│   │   │       ├── route.ts         # Get/update/delete project
│   │   │       └── versions/
│   │   │           ├── route.ts     # List versions
│   │   │           └── [versionId]/
│   │   │               ├── route.ts # Get version
│   │   │               └── rate/
│   │   │                   └── route.ts # Rate a version
│   │   ├── credits/
│   │   │   ├── route.ts             # Get balance
│   │   │   └── purchase/route.ts    # Stripe checkout session
│   │   └── webhooks/
│   │       └── stripe/route.ts      # Stripe webhook handler
│   └── layout.tsx                   # Root layout
├── lib/
│   ├── ai/
│   │   ├── prompt-composer.ts       # Builds final prompts from inputs
│   │   ├── generation-engine.ts     # Wraps Vercel AI SDK calls
│   │   ├── models.ts                # Model configuration (Flash/Pro)
│   │   ├── templates/
│   │   │   ├── fast-mode.ts         # Fast mode prompt templates
│   │   │   ├── standard-mode.ts     # Standard mode prompt templates
│   │   │   ├── gap-analysis.ts      # Gap detection prompt template
│   │   │   └── system.ts            # Shared system prompt fragments
│   │   └── types.ts                 # AI-related TypeScript types
│   ├── db/
│   │   ├── admin.ts                 # Firebase Admin initialization
│   │   ├── projects.ts              # Project CRUD operations
│   │   ├── versions.ts              # Version CRUD operations
│   │   ├── prompts.ts               # Prompt storage (private)
│   │   ├── credits.ts               # Credit balance operations
│   │   └── types.ts                 # Firestore document types
│   ├── stripe/
│   │   ├── client.ts                # Stripe SDK initialization
│   │   ├── credits.ts               # Credit purchase logic
│   │   └── webhooks.ts              # Webhook event handlers
│   ├── auth/
│   │   ├── middleware.ts            # Auth verification helpers
│   │   └── context.ts              # User context utilities
│   └── validation/
│       ├── project.ts               # Project input schemas (Zod)
│       ├── generation.ts            # Generation request schemas (Zod)
│       └── common.ts                # Shared validation schemas
├── components/
│   ├── generation/
│   │   ├── fast-mode/
│   │   │   ├── brain-dump-input.tsx  # Textarea for brain dump
│   │   │   ├── gap-analysis.tsx      # Displays detected gaps
│   │   │   ├── follow-up-form.tsx    # Follow-up questions form
│   │   │   └── generation-view.tsx   # Streaming FRD output
│   │   ├── standard-mode/
│   │   │   ├── wizard-shell.tsx      # Step container + progress
│   │   │   ├── step-overview.tsx     # Project overview step
│   │   │   ├── step-users.tsx        # Users & personas step
│   │   │   ├── step-features.tsx     # Features step
│   │   │   ├── step-technical.tsx    # Technical constraints step
│   │   │   ├── step-review.tsx       # Review before generation
│   │   │   └── generation-view.tsx   # Streaming FRD output
│   │   └── shared/
│   │       ├── markdown-renderer.tsx # Renders streaming Markdown
│   │       ├── model-selector.tsx    # Flash vs Pro selector
│   │       └── credit-check.tsx      # Pre-generation credit gate
│   ├── projects/
│   │   ├── project-card.tsx
│   │   ├── project-list.tsx
│   │   └── version-diff.tsx          # Side-by-side version compare
│   ├── credits/
│   │   ├── balance-badge.tsx
│   │   └── purchase-button.tsx
│   └── ui/                           # Shared UI primitives (shadcn)
├── hooks/
│   ├── use-stream-generation.ts      # Custom hook for streaming FRD
│   ├── use-credit-balance.ts         # SWR hook for credits
│   ├── use-projects.ts              # SWR hook for project list
│   └── use-generation-state.ts       # State machine for gen flow
└── types/
    └── index.ts                      # Shared application types
```

### Structure Rationale

- **`app/(dashboard)/generate/fast/` and `standard/`:** Separate pages for each mode because they have fundamentally different UIs and user flows, but they share the same generation output components.
- **`lib/ai/`:** Server-only module. The prompt composer and generation engine are pure functions and SDK wrappers that never touch the client. This is the critical separation -- prompt logic is always server-side.
- **`lib/ai/templates/`:** Prompt templates are plain TypeScript functions that take structured inputs and return prompt strings. Keeping them as separate files per mode makes them independently testable and versionable.
- **`lib/db/`:** All Firestore operations go through Firebase Admin SDK. No client SDK. This matches the established deny-all client rules pattern.
- **`components/generation/shared/`:** The Markdown renderer and model selector are reused between fast and standard modes.
- **`hooks/`:** Custom hooks wrap SWR and Vercel AI SDK streaming to provide clean interfaces for components.

## Architectural Patterns

### Pattern 1: Two-Mode Input, Unified Prompt Composition

**What:** Both fast mode (brain dump) and standard mode (guided Q&A) collect different inputs but feed into the same prompt composition layer. The prompt composer accepts a normalized `GenerationInput` type regardless of how the data was collected.

**When to use:** Always. This is the core architectural decision.

**Trade-offs:** Slightly more abstraction up front, but prevents duplicating prompt logic and makes adding new input modes trivial.

```typescript
// lib/ai/types.ts
interface GenerationInput {
  projectName: string;
  projectDescription: string;     // from brain dump OR assembled from wizard
  targetUsers?: string;
  features?: string[];
  technicalConstraints?: string;
  additionalContext?: string;
  previousVersion?: {              // for iteration
    content: string;
    feedback: string;
  };
  mode: 'fast' | 'standard';
  modelTier: 'flash' | 'pro';
}

// lib/ai/prompt-composer.ts
export function composeGenerationPrompt(input: GenerationInput): {
  system: string;
  prompt: string;
} {
  const systemPrompt = buildSystemPrompt(input.mode);
  const userPrompt = buildUserPrompt(input);
  return { system: systemPrompt, prompt: userPrompt };
}

// Used identically by both mode route handlers:
// api/generate/fast/create/route.ts
// api/generate/standard/create/route.ts
```

### Pattern 2: Streaming Generation via Route Handlers (Not Server Actions)

**What:** All AI generation endpoints are Route Handlers (not Server Actions) because they return streaming SSE responses. Server Actions are POST-only and return serialized data -- they cannot stream. Route Handlers return `StreamTextResult.toTextStreamResponse()` which creates an SSE stream.

**When to use:** For every AI generation endpoint.

**Trade-offs:** Route Handlers lack the automatic type safety of Server Actions, so input validation with Zod at the handler boundary is essential. However, Route Handlers are the only viable option for streaming.

```typescript
// app/api/generate/fast/create/route.ts
import { streamText } from 'ai';
import { google } from '@ai-sdk/google';
import { composeGenerationPrompt } from '@/lib/ai/prompt-composer';
import { getModel } from '@/lib/ai/models';
import { GenerationRequestSchema } from '@/lib/validation/generation';
import { verifyAuth } from '@/lib/auth/middleware';
import { checkCredits, deductCredits } from '@/lib/db/credits';
import { saveVersion, savePrompt } from '@/lib/db/versions';

export async function POST(req: Request) {
  // 1. Auth
  const user = await verifyAuth(req);

  // 2. Validate input
  const body = await req.json();
  const input = GenerationRequestSchema.parse(body);

  // 3. Credit check (pre-generation)
  await checkCredits(user.uid, input.modelTier);

  // 4. Compose prompt
  const { system, prompt } = composeGenerationPrompt(input);

  // 5. Stream generation
  const result = streamText({
    model: getModel(input.modelTier),
    system,
    prompt,
    maxTokens: 8000,
    onFinish: async ({ text, usage }) => {
      // 6. Post-generation: save version, deduct credits, store prompt
      await Promise.all([
        saveVersion(input.projectId, { content: text, mode: 'fast' }),
        deductCredits(user.uid, usage.totalTokens, input.modelTier),
        savePrompt(user.uid, input.projectId, { system, prompt }),
      ]);
    },
  });

  return result.toTextStreamResponse();
}
```

### Pattern 3: Gap Detection as a Pre-Generation Analysis Step

**What:** In fast mode, the brain dump text is first sent to a lightweight LLM call (`generateText`, not streaming) that returns structured JSON identifying gaps, missing information, and suggested follow-up questions. This is a separate API call before the main generation, not part of the same stream.

**When to use:** Fast mode only, after user submits brain dump, before FRD generation.

**Trade-offs:** Extra LLM call adds latency (1-3 seconds with Flash), but produces dramatically better FRDs because users address gaps before generation.

```typescript
// app/api/generate/fast/analyze/route.ts
import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { buildGapAnalysisPrompt } from '@/lib/ai/templates/gap-analysis';

const GapAnalysisSchema = z.object({
  overallCompleteness: z.number().min(0).max(100),
  gaps: z.array(z.object({
    category: z.enum([
      'target_users', 'features', 'technical_constraints',
      'success_criteria', 'scope', 'integrations', 'non_functional'
    ]),
    description: z.string(),
    importance: z.enum(['critical', 'important', 'nice_to_have']),
    suggestedQuestion: z.string(),
  })),
  canProceed: z.boolean(), // true if enough info to generate something useful
});

export async function POST(req: Request) {
  const user = await verifyAuth(req);
  const { brainDump } = await req.json();

  const { object } = await generateObject({
    model: google('gemini-2.5-flash'),
    schema: GapAnalysisSchema,
    system: buildGapAnalysisPrompt(),
    prompt: brainDump,
  });

  return Response.json(object);
}
```

**Why LLM-based and not rule-based:** Rule-based gap detection (regex, keyword matching) cannot understand semantic completeness. A brain dump saying "build an app like Uber but for dog walking" contains no keywords for "authentication" or "payment processing" but an LLM understands these are implied requirements and can ask clarifying questions. The quality difference is enormous. Use `generateObject` with a Zod schema for type-safe structured output.

### Pattern 4: Iteration via Previous Version Context Injection

**What:** When a user iterates on an FRD (generates v2, v3, etc.), the previous version's content and the user's feedback are injected into the prompt as additional context. The prompt composer handles this as a conditional section.

**When to use:** Any generation where `previousVersion` is present in the input.

**Trade-offs:** Increases token usage (previous FRD content can be 3-5K tokens). Mitigate by summarizing very long previous versions or only including the sections the user wants changed.

```typescript
// lib/ai/prompt-composer.ts (iteration section)
function buildUserPrompt(input: GenerationInput): string {
  let prompt = `## Project: ${input.projectName}\n\n`;
  prompt += `## Description\n${input.projectDescription}\n\n`;

  // ... other sections ...

  if (input.previousVersion) {
    prompt += `## Previous FRD Version\n`;
    prompt += `The user has already generated a previous version of this FRD. `;
    prompt += `They want improvements based on their feedback.\n\n`;
    prompt += `### Previous Content\n${input.previousVersion.content}\n\n`;
    prompt += `### User Feedback\n${input.previousVersion.feedback}\n\n`;
    prompt += `IMPORTANT: Incorporate the feedback to improve the FRD. `;
    prompt += `Maintain sections that were good. Fix or expand sections `;
    prompt += `the user flagged. Do NOT start from scratch unless the `;
    prompt += `feedback requests a complete rewrite.\n`;
  }

  return prompt;
}
```

### Pattern 5: Credit Gate Middleware Pattern

**What:** Credit validation is a server-side gate that runs before any generation. It uses a Firestore transaction to atomically check balance and reserve credits. If the stream fails or is aborted, a compensation function releases the reserved credits.

**When to use:** Every generation endpoint.

**Trade-offs:** Slightly more complex than simple deduction, but prevents race conditions where a user could start multiple generations simultaneously and overdraw their balance.

```typescript
// lib/db/credits.ts
export async function reserveCredits(
  userId: string,
  estimatedCost: number
): Promise<{ reservationId: string; release: () => Promise<void> }> {
  return db.runTransaction(async (tx) => {
    const creditDoc = await tx.get(db.collection('credits').doc(userId));
    const balance = creditDoc.data()?.balance ?? 0;

    if (balance < estimatedCost) {
      throw new InsufficientCreditsError(balance, estimatedCost);
    }

    const reservationId = crypto.randomUUID();
    tx.update(creditDoc.ref, {
      balance: FieldValue.increment(-estimatedCost),
      reservations: FieldValue.arrayUnion({ id: reservationId, amount: estimatedCost }),
    });

    return {
      reservationId,
      release: async () => {
        // Refund on failure/abort
        await creditDoc.ref.update({
          balance: FieldValue.increment(estimatedCost),
          reservations: FieldValue.arrayRemove({ id: reservationId, amount: estimatedCost }),
        });
      },
    };
  });
}
```

## Data Flow

### Fast Mode: Complete Flow

```
User writes brain dump
    |
    v
[Client] POST /api/generate/fast/analyze
    |
    v
[Server] verifyAuth --> Zod validate --> buildGapAnalysisPrompt()
    |
    v
[Server] generateObject({ schema: GapAnalysisSchema })  (Gemini Flash, ~2s)
    |
    v
[Client] Display gaps + follow-up questions
    |
    v
User answers follow-up questions (optional)
    |
    v
[Client] POST /api/generate/fast/create  (with brain dump + follow-up answers)
    |
    v
[Server] verifyAuth --> Zod validate --> checkCredits()
    |
    v
[Server] composeGenerationPrompt(input) --> streamText()
    |                                           |
    v                                           v (SSE stream)
[Server] onFinish: saveVersion()          [Client] Renders Markdown
         + deductCredits()                        progressively
         + savePrompt()
    |
    v
[Client] Show final FRD + rating UI + iterate button
```

### Standard Mode: Complete Flow

```
User starts guided wizard
    |
    v
[Client] Step 1: Project overview (name, description, objectives)
    v
[Client] Step 2: Users & personas
    v
[Client] Step 3: Features & requirements
    v
[Client] Step 4: Technical constraints & integrations
    v
[Client] Step 5: Review all inputs
    |
    v
[Client] POST /api/generate/standard/create  (all wizard data)
    |
    v
[Server] verifyAuth --> Zod validate --> checkCredits()
    |
    v
[Server] composeGenerationPrompt(input) --> streamText()
    |                                           |
    v                                           v (SSE stream)
[Server] onFinish: saveVersion()          [Client] Renders Markdown
         + deductCredits()                        progressively
         + savePrompt()
    |
    v
[Client] Show final FRD + rating UI + iterate button
```

### Iteration Flow

```
User clicks "Iterate" on existing FRD version
    |
    v
[Client] Shows feedback textarea + previous FRD
    |
    v
User writes feedback ("Add more detail to auth section", etc.)
    |
    v
[Client] POST /api/generate/{mode}/create
    |     (includes previousVersion: { content, feedback })
    v
[Server] composeGenerationPrompt(input)
    |     (injects previous version + feedback into prompt)
    v
[Server] streamText() --> SSE stream --> [Client] renders v2
    |
    v
[Server] onFinish: saveVersion() with parentVersionId linkage
```

### Key Data Flows

1. **Input Collection --> Prompt Composition:** User inputs (brain dump text OR wizard step data) are normalized into `GenerationInput` type, then passed to `composeGenerationPrompt()` which returns `{ system, prompt }` strings for the AI SDK.

2. **Generation --> Storage:** The `onFinish` callback of `streamText` triggers parallel writes: version document to Firestore, credit deduction via transaction, and prompt archival to user-scoped private collection.

3. **Credit Lifecycle:** Purchase (Stripe webhook) --> Credit (Firestore balance increment) --> Reserve (pre-generation transaction) --> Deduct/Release (post-generation based on success/failure).

## Firestore Data Model

```
firestore/
├── users/{userId}
│   ├── email: string
│   ├── displayName: string
│   ├── createdAt: timestamp
│   └── settings: { defaultModel: 'flash' | 'pro' }
│
├── projects/{projectId}
│   ├── userId: string              # Owner (indexed for queries)
│   ├── name: string
│   ├── description: string
│   ├── mode: 'fast' | 'standard'
│   ├── latestVersionId: string     # Denormalized for quick access
│   ├── versionCount: number        # Denormalized counter
│   ├── createdAt: timestamp
│   ├── updatedAt: timestamp
│   │
│   └── versions/{versionId}        # Subcollection
│       ├── content: string          # Generated Markdown FRD
│       ├── versionNumber: number    # 1, 2, 3...
│       ├── parentVersionId?: string # Links to previous iteration
│       ├── model: string            # 'gemini-2.5-flash' etc.
│       ├── mode: 'fast' | 'standard'
│       ├── tokensUsed: number
│       ├── rating?: number          # 1-5 user rating
│       ├── ratingFeedback?: string  # Optional text feedback
│       ├── createdAt: timestamp
│       └── metadata: {
│             generationTimeMs: number
│             completionTokens: number
│             promptTokens: number
│           }
│
├── prompts/{promptId}               # Root collection, NOT subcollection
│   ├── userId: string               # Owner (indexed, privacy-critical)
│   ├── projectId: string            # Links to project
│   ├── versionId: string            # Links to version
│   ├── systemPrompt: string         # The system prompt used
│   ├── userPrompt: string           # The user prompt used
│   ├── createdAt: timestamp
│   └── inputSnapshot: map           # Frozen copy of GenerationInput
│
├── credits/{userId}                 # 1:1 with users
│   ├── balance: number              # Current credit balance
│   ├── totalPurchased: number       # Lifetime purchased
│   ├── totalUsed: number            # Lifetime used
│   ├── reservations: array          # Active reservations (in-flight)
│   └── updatedAt: timestamp
│
└── credit_transactions/{txId}       # Root collection for audit
    ├── userId: string
    ├── type: 'purchase' | 'usage' | 'refund' | 'promotional'
    ├── amount: number               # Positive for credits, negative for usage
    ├── balance_after: number        # Balance snapshot after transaction
    ├── projectId?: string           # For usage transactions
    ├── versionId?: string           # For usage transactions
    ├── stripePaymentIntentId?: string
    ├── createdAt: timestamp
    └── metadata: map
```

### Data Model Rationale

- **Versions as subcollections of projects:** Versions are always queried in the context of a project. You never need "all versions across all projects." Subcollections give natural scoping and security rules, plus they do not bloat the parent project document.

- **Prompts as a root collection (not subcollection of versions):** Prompts are privacy-sensitive and need their own access patterns. As a root collection, you can query `prompts where userId == X` for a user's prompt history, which you cannot do efficiently with deeply nested subcollections. The `userId` field enables Firestore security rules to restrict access to the owning user only.

- **Credits as a single document per user:** Credit balance is a hot-path read (checked before every generation). A single document makes this a single read. The `credit_transactions` root collection provides the audit trail without bloating the credit document.

- **Denormalized `latestVersionId` and `versionCount` on project:** Avoids querying the versions subcollection just to show project cards in the dashboard. Updated atomically via `FieldValue.increment()` and direct field set in the `onFinish` callback.

## Anti-Patterns

### Anti-Pattern 1: Client-Side Prompt Assembly

**What people do:** Build the LLM prompt in the browser and send the assembled prompt string to the API.

**Why it is wrong:** Exposes prompt engineering to users (they can see/modify system prompts in Network tab). Makes prompt injection trivial. Makes A/B testing prompts impossible without client deploys.

**Do this instead:** Client sends structured inputs (project name, description, features list). Server-side `composeGenerationPrompt()` assembles the actual prompt. The client never sees the system prompt or the composition logic.

### Anti-Pattern 2: Using Server Actions for Streaming

**What people do:** Try to use Next.js Server Actions for AI generation because they are simpler and type-safe.

**Why it is wrong:** Server Actions are POST-only RPC calls that return serialized values. They cannot return SSE streams. The generation would block until complete, then return the entire document at once -- destroying the streaming UX that makes AI generation feel responsive.

**Do this instead:** Use Route Handlers (`app/api/.../route.ts`) for all generation endpoints. Route Handlers can return `streamText(...).toTextStreamResponse()` which creates proper SSE streams. Use Server Actions only for non-streaming mutations (e.g., deleting a project, updating settings).

### Anti-Pattern 3: Storing Versions in the Project Document

**What people do:** Store version content as an array field or map within the project document.

**Why it is wrong:** Firestore documents have a 1MB size limit. Each FRD version is 5-15KB of Markdown. After ~50-70 versions you hit the limit. More importantly, every time you read the project document (for the dashboard list), you fetch ALL version content, wasting bandwidth and reads.

**Do this instead:** Use a `versions` subcollection under each project. Each version is its own document. Denormalize `latestVersionId` and `versionCount` on the project document for dashboard display.

### Anti-Pattern 4: Deducting Credits After Full Generation Without Reservation

**What people do:** Call `streamText`, wait for `onFinish`, then deduct credits from balance.

**Why it is wrong:** If a user opens two browser tabs and triggers generation simultaneously, both credit checks pass (both see full balance), but both generations run, potentially overdrawing the account. Race condition.

**Do this instead:** Reserve credits BEFORE starting generation using a Firestore transaction. Release (refund) if generation fails. Settle (confirm deduction) on `onFinish`. This prevents concurrent overdraw.

### Anti-Pattern 5: Passing Full Previous FRD Without Truncation

**What people do:** Always include the complete previous version (potentially 8K+ tokens) in the iteration prompt.

**Why it is wrong:** Burns excessive tokens on context that may not be relevant. For premium models billed per token, this unnecessarily inflates costs. Also risks hitting model context limits with complex FRDs.

**Do this instead:** For iterations, include the full previous version only if it is under a threshold (e.g., 4K tokens). For longer documents, include only the sections the user flagged for changes plus a summary of unchanged sections.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-1K users | Monolithic Next.js on Vercel. Single Firestore database. Direct Stripe integration. No caching layer needed. This architecture handles it fine. |
| 1K-100K users | Add rate limiting per user (middleware). Consider Firestore composite indexes for dashboard queries. Monitor Vercel function cold starts -- generation routes may need longer timeouts. Add Redis/Upstash for credit balance caching (reduce Firestore reads on hot path). |
| 100K+ users | Consider edge caching for static dashboard data. Split generation endpoints to dedicated Vercel functions with higher memory/timeout. Implement queue-based generation to prevent Vercel function limits from dropping requests. Move credit ledger to a dedicated service if transaction contention becomes an issue. |

### Scaling Priorities

1. **First bottleneck: Vercel function timeout.** Gemini generation can take 10-30 seconds for long FRDs. Vercel's default function timeout is 10 seconds on Hobby, 60 seconds on Pro. This MUST be configured early. Set `maxDuration` in route handler config.

2. **Second bottleneck: Firestore write contention on credits document.** If a single user triggers rapid-fire generations, the credit document becomes a hot write point. The reservation pattern mitigates this, but at extreme scale (unlikely for this product), consider sharding the credit balance.

3. **Third bottleneck: LLM cost.** Gemini Flash is cheap but at scale the costs add up. Track `tokensUsed` per generation to inform pricing decisions. The credit system inherently gates this.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Google AI (Gemini) | Vercel AI SDK `@ai-sdk/google` provider | Abstracts API details. Model selection via `google('gemini-2.5-flash')` or `google('gemini-3-pro')`. Streaming via `streamText()`, structured output via `generateObject()`. |
| Stripe | Server-side Stripe SDK + Webhook | Checkout Sessions for credit purchases. Webhook handler at `/api/webhooks/stripe` for payment confirmation. Never trust client-side payment confirmations. |
| Firebase Auth | Firebase Admin SDK (server-side token verification) | Client sends ID token in Authorization header. Server verifies with `admin.auth().verifyIdToken()`. No client-side Firestore access. |
| Firestore | Firebase Admin SDK (server-side only) | Deny-all client rules. All reads/writes through Route Handlers and Server Components. Admin SDK bypasses security rules (service account). |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Client Components <--> Route Handlers | HTTP (fetch/SWR) + SSE (streaming) | SWR for CRUD operations. Custom stream hooks for generation endpoints. |
| Route Handlers --> lib/ai/ | Direct function calls | Same process. No network boundary. Prompt composer is a pure function import. |
| Route Handlers --> lib/db/ | Direct function calls | Same process. Firebase Admin SDK handles Firestore connection. |
| Route Handlers --> lib/stripe/ | Direct function calls | Same process. Stripe SDK handles API connection. |
| Stripe --> Webhook Handler | HTTPS POST (inbound webhook) | Verify webhook signature. Idempotent handler (handle duplicate events). |

## Build Order (Dependencies)

The following build order reflects component dependencies -- each layer depends on the ones before it:

1. **Foundation:** Auth (Firebase Admin SDK setup, token verification middleware), Firestore schema (create collections, document types), basic project CRUD route handlers + SWR hooks. Everything else depends on auth and data access.

2. **Prompt Composition Layer:** Prompt templates, `composeGenerationPrompt()`, `GenerationInput` type, Zod validation schemas. This is pure logic with no dependencies beyond TypeScript -- build and test it in isolation before wiring up AI.

3. **Generation Engine:** Vercel AI SDK integration, model configuration, `streamText` route handlers, streaming client hooks. Depends on prompt composition and auth.

4. **Fast Mode:** Brain dump UI, gap analysis endpoint (`generateObject`), follow-up form, generation flow. Depends on generation engine.

5. **Standard Mode:** Wizard UI (steps), step validation, generation flow. Depends on generation engine. Can be built in parallel with fast mode.

6. **Versioning & Iteration:** Version storage, version list UI, version comparison, iteration flow (previous version context injection). Depends on generation working end-to-end.

7. **Credit System:** Stripe integration, credit balance, reservation pattern, purchase flow, webhook handler. Can be built in parallel with modes 4-5 but must be wired in before launch.

8. **Ratings & Analytics:** Rating UI on versions, rating storage, aggregate analytics. Low dependency, can be built last.

## Sources

- [Vercel AI SDK Documentation](https://ai-sdk.dev/docs/introduction) -- HIGH confidence
- [Vercel AI SDK streamText Reference](https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text) -- HIGH confidence
- [Vercel AI SDK Getting Started: Next.js App Router](https://ai-sdk.dev/docs/getting-started/nextjs-app-router) -- HIGH confidence
- [AI SDK 6 Announcement](https://vercel.com/blog/ai-sdk-6) -- HIGH confidence
- [Firestore Data Model](https://firebase.google.com/docs/firestore/data-model) -- HIGH confidence
- [Firestore Structure Data](https://firebase.google.com/docs/firestore/manage-data/structure-data) -- HIGH confidence
- [Stripe Credits-Based Pricing Model](https://docs.stripe.com/billing/subscriptions/usage-based/use-cases/credits-based-pricing-model) -- HIGH confidence
- [Server Actions vs Route Handlers](https://makerkit.dev/blog/tutorials/server-actions-vs-route-handlers) -- MEDIUM confidence
- [Next.js Architecture in 2026](https://www.yogijs.tech/blog/nextjs-project-architecture-app-router) -- MEDIUM confidence
- [LLM Prompt Knowledge Gaps Research](https://arxiv.org/html/2501.11709v1) -- MEDIUM confidence (academic research, validates gap detection approach)
- [Firestore Versioned Documents Pattern](https://gist.github.com/ydnar/8e4a51f7d1ce42e9bb4ae53ba049de4a) -- LOW confidence (community pattern, not official)

---
*Architecture research for: AI-powered FRD Generator*
*Researched: 2026-02-11*
