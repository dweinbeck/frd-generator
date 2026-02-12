# Phase 1: Foundation & Core Generation - Research

**Researched:** 2026-02-11
**Domain:** Next.js 16 full-stack app with AI-powered document generation (Gemini via Vercel AI SDK 6)
**Confidence:** HIGH

## Summary

Phase 1 delivers the foundation for the FRD Generator: a user enters a project name, selects a mode (Fast/Standard -- only Fast is functional in Phase 1), types a freeform brain dump, and receives a generated FRD Markdown document with structured sections. The user can copy the FRD to clipboard or download it as a `.md` file. The app must be mobile responsive with keyboard navigation and form labels, and each generation creates an immutable version record in Firestore.

The critical technical decisions for Phase 1 center on three areas: (1) how to generate structured FRDs using Gemini's structured output enforcement via AI SDK 6's `Output.object()` pattern, (2) how to present generation progress to the user while the LLM works, and (3) how to design the Firestore data model with subcollections from day one to avoid painful retrofitting.

**Primary recommendation:** Use `generateText` with `Output.object()` for FRD generation (not streaming markdown). Generate a structured JSON object matching a Zod FRD schema, then render that structured data into formatted markdown deterministically on the client. This separates content generation from formatting, guarantees structural consistency across all generations, and produces a clean markdown string for clipboard/download export. Show a progress indicator during the non-streaming generation call (5-15 seconds with Gemini 2.5 Flash). Reserve `streamText` for future phases where streaming partial text may improve perceived performance.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.x | Full-stack React framework | Latest stable. Turbopack is default bundler. `proxy.ts` replaces deprecated `middleware.ts`. Node.js 20.9+ required. TypeScript 5.1+ required. |
| React | 19.2 | UI library | Ships with Next.js 16. React Compiler 1.0 stable. View Transitions API available. |
| TypeScript | 5.9.x | Type safety | Latest stable (5.9.3). Required by Next.js 16 (minimum 5.1). |
| Tailwind CSS | 4.1.x | Utility-first styling | CSS-first configuration via `@import "tailwindcss"`. Zero-config. Ships with `create-next-app`. 5x faster builds vs v3. |
| @tailwindcss/postcss | 4.x | PostCSS integration | Required for Tailwind v4 with Next.js. Configure in `postcss.config.mjs`. |
| ai (Vercel AI SDK) | 6.x | AI abstraction layer | Unified `generateText`/`streamText` API. `Output.object()` for structured output. Deprecates `generateObject`/`streamObject`. |
| @ai-sdk/google | 3.0.x | Gemini provider | Supports Gemini 2.5 Flash, Gemini 3 Pro Preview. Structured output enabled by default. |
| @ai-sdk/react | latest | React hooks for AI SDK | `useCompletion` hook for streaming text. `useChat` for chat UIs. |
| zod | 4.x (>=4.0.4) | Schema validation | Native `z.toJSONSchema()` for Gemini compatibility. Used by AI SDK for structured output schemas. **Must use 4.0.4+ to fix AI SDK compatibility issue.** |
| firebase-admin | 13.x | Server-side Firestore + Auth | Server-only. Singleton initialization pattern. Bypasses Firestore security rules (service account). |
| react-markdown | 10.x | Markdown rendering | Renders generated FRD as formatted React components. Works with React 19 (may need `--legacy-peer-deps`). |
| remark-gfm | 4.x | GitHub Flavored Markdown | Tables, task lists, strikethrough, autolinks. Essential for FRD documents with tables and checklists. |
| Biome | 2.3.x | Linter + formatter | Replaces ESLint + Prettier. Next.js 16 removed `next lint`. Single `biome.json` config. |
| Vitest | 4.0.x | Testing framework | TypeScript built-in. Configure with `vitest.config.ts`. |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @tailwindcss/typography | 0.5.x | Prose styling for markdown | `prose` classes for rendered FRD output. Handles headings, lists, code blocks, tables. |
| clsx | 2.x | Conditional classnames | Composing Tailwind classes conditionally. |
| nanoid | 5.x | ID generation | Short, URL-friendly IDs for projects and versions. |
| date-fns | 4.x | Date formatting | Displaying "created 3 days ago" timestamps on versions. |
| lucide-react | latest | Icon library | Tree-shakeable SVG icons for UI elements (copy, download, etc.). |
| @testing-library/react | 16.x | Component testing | Standard React testing utilities with Vitest. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `generateText` + `Output.object()` | `streamText` (stream markdown directly) | Streaming shows text progressively but cannot guarantee structural consistency. Structured output generates a validated JSON object, then we render it to markdown deterministically. Structured output wins for FRD use case where format consistency is critical. |
| `generateText` + `Output.object()` | `streamText` + `Output.object()` (stream partial structured object) | Streaming structured output provides `partialOutputStream` but partial objects cannot be validated against the schema. For Phase 1, a non-streaming call with a progress indicator is simpler and produces validated output. Reserve streaming structured output for future phases if generation time becomes a UX issue. |
| react-markdown | MDXEditor | MDXEditor requires client-only rendering, adds Lexical bundle. Users read/copy FRDs, they don't edit markdown. react-markdown for rendering + textarea for raw editing is the right complexity. |
| Biome | ESLint + Prettier | Biome is 10-25x faster, single binary, recommended by Next.js 16 since `next lint` was removed. ESLint only if specific plugins (jsx-a11y) are needed. |
| nanoid | uuid | uuid is longer (36 chars vs 21). nanoid is faster, smaller, URL-safe by default. |

**Installation:**
```bash
# Core framework
npx create-next-app@latest frd-generator

# AI integration
npm install ai @ai-sdk/google @ai-sdk/react zod

# Firebase (server-side only)
npm install firebase-admin

# Markdown rendering
npm install react-markdown remark-gfm

# UI utilities
npm install @tailwindcss/typography clsx lucide-react nanoid date-fns

# Dev dependencies
npm install -D typescript @types/node @biomejs/biome vitest @testing-library/react @testing-library/jest-dom @vitejs/plugin-react tailwindcss @tailwindcss/postcss
```

## Architecture Patterns

### Recommended Project Structure (Phase 1 Scope)

```
src/
├── app/
│   ├── layout.tsx                   # Root layout with Tailwind globals
│   ├── page.tsx                     # Landing / project creation
│   ├── projects/
│   │   └── [projectId]/
│   │       └── page.tsx             # Project detail + generated FRD view
│   ├── generate/
│   │   └── page.tsx                 # Generation flow (brain dump -> result)
│   └── api/
│       ├── projects/
│       │   ├── route.ts             # POST: create project
│       │   └── [projectId]/
│       │       └── route.ts         # GET: get project with latest version
│       └── generate/
│           └── route.ts             # POST: generate FRD (structured output)
├── lib/
│   ├── ai/
│   │   ├── prompt-composer.ts       # Builds final prompts from inputs
│   │   ├── generation-engine.ts     # Wraps AI SDK generateText calls
│   │   ├── models.ts                # Model configuration (Flash/Pro)
│   │   ├── frd-schema.ts            # Zod schema for FRD structured output
│   │   ├── frd-renderer.ts          # Converts structured FRD JSON to markdown
│   │   └── templates/
│   │       └── system.ts            # System prompt for FRD generation
│   ├── db/
│   │   ├── admin.ts                 # Firebase Admin singleton initialization
│   │   ├── projects.ts              # Project CRUD operations
│   │   └── versions.ts              # Version CRUD operations
│   └── validation/
│       ├── project.ts               # Project input schemas (Zod)
│       └── generation.ts            # Generation request schemas (Zod)
├── components/
│   ├── generation/
│   │   ├── brain-dump-input.tsx      # Textarea for brain dump
│   │   ├── mode-selector.tsx         # Fast vs Standard mode selector
│   │   ├── generation-progress.tsx   # Progress indicator during generation
│   │   └── frd-display.tsx           # Rendered FRD with copy/download
│   ├── export/
│   │   ├── copy-button.tsx           # Copy FRD markdown to clipboard
│   │   └── download-button.tsx       # Download FRD as .md file
│   └── ui/
│       └── (shared primitives)       # Buttons, inputs, cards, etc.
├── hooks/
│   └── use-copy-to-clipboard.ts      # Custom hook for clipboard operations
└── types/
    └── index.ts                      # Shared application types
```

### Pattern 1: Structured Output Generation (Not Streaming)

**What:** Use `generateText` with `Output.object()` and a Zod schema to generate a structured FRD as a validated JSON object. Then render the JSON into markdown deterministically on the server or client.

**When to use:** Always for Phase 1 FRD generation.

**Why not streaming:** The project requirements (REQUIREMENTS.md) explicitly exclude "Streaming token-by-token display" from scope, stating: "Full document render on completion; streaming progress shown via sections." Structured output guarantees format consistency (requirement GEN-04) and produces validated data. A progress indicator satisfies the "streaming progress" requirement without actual token streaming.

**Example:**
```typescript
// Source: AI SDK 6 docs (ai-sdk.dev/docs/ai-sdk-core/generating-structured-data)
// lib/ai/generation-engine.ts
import { generateText, Output } from 'ai';
import { google } from '@ai-sdk/google';
import { FRDSchema } from './frd-schema';
import { composeGenerationPrompt } from './prompt-composer';

export async function generateFRD(input: GenerationInput) {
  const { system, prompt } = composeGenerationPrompt(input);

  const { output, usage } = await generateText({
    model: google('gemini-2.5-flash'),
    output: Output.object({ schema: FRDSchema }),
    system,
    prompt,
    maxTokens: 8192,
    temperature: 0.1, // Low temperature for consistency
  });

  if (!output) {
    throw new Error('FRD generation failed: no output produced');
  }

  return { frd: output, usage };
}
```

```typescript
// lib/ai/frd-schema.ts
import { z } from 'zod';

export const FRDSchema = z.object({
  projectName: z.string().describe('The name of the project'),
  overview: z.string().describe('A 2-3 paragraph project overview'),
  coreValue: z.string().describe('One-line core value proposition'),
  personas: z.array(z.object({
    name: z.string().describe('Persona name (e.g., "End User", "Admin")'),
    description: z.string().describe('Who this persona is'),
    goals: z.array(z.string()).describe('What this persona wants to achieve'),
  })).describe('Target user personas'),
  requirements: z.array(z.object({
    id: z.string().describe('Requirement ID (e.g., "REQ-01")'),
    category: z.string().describe('Category (e.g., "User Management", "Data")'),
    description: z.string().describe('What the system must do'),
    priority: z.enum(['must-have', 'should-have', 'nice-to-have']),
    acceptanceCriteria: z.array(z.string()).describe('How to verify this requirement is met'),
  })).describe('Functional requirements'),
  constraints: z.array(z.object({
    category: z.string().describe('Constraint type (e.g., "Technical", "Business")'),
    description: z.string().describe('The constraint'),
  })).describe('Technical and business constraints'),
  outOfScope: z.array(z.string()).describe('Explicitly excluded features or capabilities'),
  openQuestions: z.array(z.string()).describe('Questions that need answers before implementation'),
});

export type FRD = z.infer<typeof FRDSchema>;
```

```typescript
// lib/ai/frd-renderer.ts
import type { FRD } from './frd-schema';

export function renderFRDToMarkdown(frd: FRD): string {
  const sections: string[] = [];

  sections.push(`# ${frd.projectName}\n`);
  sections.push(`> ${frd.coreValue}\n`);
  sections.push(`## Overview\n\n${frd.overview}\n`);

  // Personas
  sections.push(`## Target Users\n`);
  for (const persona of frd.personas) {
    sections.push(`### ${persona.name}\n`);
    sections.push(`${persona.description}\n`);
    sections.push(`**Goals:**`);
    for (const goal of persona.goals) {
      sections.push(`- ${goal}`);
    }
    sections.push('');
  }

  // Requirements
  sections.push(`## Functional Requirements\n`);
  const categories = [...new Set(frd.requirements.map(r => r.category))];
  for (const category of categories) {
    sections.push(`### ${category}\n`);
    const categoryReqs = frd.requirements.filter(r => r.category === category);
    for (const req of categoryReqs) {
      sections.push(`#### ${req.id}: ${req.description}\n`);
      sections.push(`**Priority:** ${req.priority}\n`);
      sections.push(`**Acceptance Criteria:**`);
      for (const ac of req.acceptanceCriteria) {
        sections.push(`- [ ] ${ac}`);
      }
      sections.push('');
    }
  }

  // Constraints
  sections.push(`## Constraints\n`);
  for (const constraint of frd.constraints) {
    sections.push(`- **${constraint.category}:** ${constraint.description}`);
  }
  sections.push('');

  // Out of Scope
  sections.push(`## Out of Scope\n`);
  for (const item of frd.outOfScope) {
    sections.push(`- ${item}`);
  }
  sections.push('');

  // Open Questions
  if (frd.openQuestions.length > 0) {
    sections.push(`## Open Questions\n`);
    for (let i = 0; i < frd.openQuestions.length; i++) {
      sections.push(`${i + 1}. ${frd.openQuestions[i]}`);
    }
    sections.push('');
  }

  return sections.join('\n');
}
```

### Pattern 2: Route Handler for Generation (POST, Non-Streaming)

**What:** The generation API endpoint is a Next.js Route Handler that accepts the brain dump input, validates it with Zod, calls `generateText` with structured output, saves the version to Firestore, and returns the complete FRD JSON.

**When to use:** Phase 1 generation endpoint.

**Example:**
```typescript
// Source: AI SDK 6 docs + Firestore Admin SDK docs
// app/api/generate/route.ts
import { NextResponse } from 'next/server';
import { generateFRD } from '@/lib/ai/generation-engine';
import { renderFRDToMarkdown } from '@/lib/ai/frd-renderer';
import { GenerationRequestSchema } from '@/lib/validation/generation';
import { saveVersion } from '@/lib/db/versions';
import { updateProject } from '@/lib/db/projects';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const input = GenerationRequestSchema.parse(body);

    // Validate input size (GEN-05)
    if (input.brainDump.length > 15000) {
      return NextResponse.json(
        { error: 'Input exceeds maximum length of 15,000 characters' },
        { status: 400 }
      );
    }

    // Generate structured FRD
    const { frd, usage } = await generateFRD({
      projectName: input.projectName,
      brainDump: input.brainDump,
      mode: 'fast',
    });

    // Render to markdown
    const markdown = renderFRDToMarkdown(frd);

    // Save version to Firestore (VER-01)
    const version = await saveVersion(input.projectId, {
      content: markdown,
      structuredData: frd,
      mode: 'fast',
      model: 'gemini-2.5-flash',
      versionNumber: 1,
      tokensUsed: usage.totalTokens,
      metadata: {
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens,
        generationTimeMs: Date.now() - Date.now(), // track actual time
      },
    });

    // Update project with latest version (denormalized)
    await updateProject(input.projectId, {
      latestVersionId: version.id,
      versionCount: 1,
    });

    return NextResponse.json({
      versionId: version.id,
      markdown,
      structuredData: frd,
    });

  } catch (error) {
    // Sanitize error - never expose prompt data (Pitfall #5)
    console.error('Generation failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      // DO NOT log: input, prompt, brain dump content
    });

    return NextResponse.json(
      { error: 'FRD generation failed. Please try again.' },
      { status: 500 }
    );
  }
}
```

### Pattern 3: Firebase Admin Singleton Initialization

**What:** Initialize Firebase Admin SDK once per process using the singleton pattern. Import `server-only` to prevent leaking into client components.

**When to use:** Every server-side file that accesses Firestore.

**Example:**
```typescript
// Source: Firebase Admin SDK docs + MakerKit guide
// lib/db/admin.ts
import 'server-only';
import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

let app: App;
let db: Firestore;

function getAdminApp(): App {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  app = initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey,
    }),
  });

  return app;
}

export function getDb(): Firestore {
  if (!db) {
    const adminApp = getAdminApp();
    db = getFirestore(adminApp);
  }
  return db;
}
```

### Pattern 4: Client-Side Generation Flow with Progress Indicator

**What:** The client component collects brain dump input, sends it to the generation API, and shows a progress indicator while waiting for the response. On completion, it displays the rendered FRD with copy/download buttons.

**When to use:** The main generation page.

**Example:**
```typescript
// Source: Standard React + fetch pattern
// components/generation/generation-flow.tsx
'use client';

import { useState } from 'react';
import { FrdDisplay } from './frd-display';
import { GenerationProgress } from './generation-progress';
import { BrainDumpInput } from './brain-dump-input';

type GenerationState = 'input' | 'generating' | 'complete' | 'error';

export function GenerationFlow({ projectId, projectName }: Props) {
  const [state, setState] = useState<GenerationState>('input');
  const [markdown, setMarkdown] = useState<string>('');
  const [error, setError] = useState<string>('');

  async function handleGenerate(brainDump: string) {
    setState('generating');
    setError('');

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, projectName, brainDump }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Generation failed');
      }

      const data = await res.json();
      setMarkdown(data.markdown);
      setState('complete');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
      setState('error');
    }
  }

  if (state === 'input' || state === 'error') {
    return (
      <BrainDumpInput
        onSubmit={handleGenerate}
        error={error}
        maxLength={15000}
      />
    );
  }

  if (state === 'generating') {
    return <GenerationProgress />;
  }

  return <FrdDisplay markdown={markdown} projectName={projectName} />;
}
```

### Pattern 5: Copy to Clipboard and Download

**What:** Two export mechanisms: clipboard copy via `navigator.clipboard.writeText()` and file download via `Blob` + `URL.createObjectURL()`.

**When to use:** On the FRD display view after generation completes.

**Example:**
```typescript
// Source: MDN Clipboard API + Blob API
// hooks/use-copy-to-clipboard.ts
'use client';

import { useState, useCallback } from 'react';

export function useCopyToClipboard() {
  const [isCopied, setIsCopied] = useState(false);

  const copy = useCallback(async (text: string) => {
    if (!navigator.clipboard) {
      console.warn('Clipboard API not available');
      return false;
    }

    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
      return true;
    } catch (err) {
      console.error('Failed to copy:', err);
      setIsCopied(false);
      return false;
    }
  }, []);

  return { isCopied, copy };
}

// components/export/download-button.tsx
export function downloadMarkdown(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
```

### Anti-Patterns to Avoid

- **Client-side prompt assembly (GEN-06 violation):** Never build prompts in the browser. Client sends structured inputs (project name, brain dump text). Server-side `composeGenerationPrompt()` assembles the actual prompt. Client never sees system prompt or composition logic.
- **Using Server Actions for generation:** Server Actions cannot return streaming responses. Even for non-streaming generation, Route Handlers are clearer for API-style endpoints that return JSON. Server Actions are better for form mutations.
- **Storing versions inline in project document:** Firestore 1 MiB limit. Use `projects/{id}/versions/{id}` subcollection from day one.
- **Logging prompt data:** Never log brain dump content, system prompts, or LLM responses in production logs. Sanitize all error objects at the API boundary.
- **Streaming markdown without structural enforcement:** Without structured output, the same prompt produces different section headings, nesting depths, and formats across generations. Iteration becomes unusable because diffs are meaningless noise.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Markdown rendering | Custom HTML string builder from FRD JSON | react-markdown + remark-gfm | Handles edge cases in markdown parsing (nested lists, tables, code blocks). Well-tested. |
| Clipboard operations | Manual `document.execCommand('copy')` | `navigator.clipboard.writeText()` | execCommand is deprecated. Clipboard API is modern standard with async support. |
| File download | Server-side file generation endpoint | Client-side `Blob` + `URL.createObjectURL()` | No server round-trip needed. The markdown is already on the client. |
| ID generation | Custom UUID function | nanoid | Cryptographically secure, URL-safe, shorter than UUID. Battle-tested. |
| Date formatting | Manual date string manipulation | date-fns `formatDistanceToNow()` | Handles timezones, relative times, locales correctly. |
| Input validation | Manual `if` checks on request body | Zod `.parse()` at API boundary | Type-safe validation with automatic error messages. Used by AI SDK for schema definitions. |
| Linting + formatting | ESLint + Prettier configuration | Biome `biome check --write` | 10-25x faster. Single config file. Recommended by Next.js 16. |

**Key insight:** The FRD Generator's core innovation is in the prompt engineering and FRD schema design, not in infrastructure. Use established libraries for everything except the AI composition layer.

## Common Pitfalls

### Pitfall 1: Inconsistent FRD Output Structure Across Generations

**What goes wrong:** Same brain dump produces structurally different FRDs (different section headings, nesting, format). Users lose trust when regenerating produces visually different documents.
**Why it happens:** LLMs are stochastic. Prompt-only format enforcement is brittle, especially in long contexts.
**How to avoid:** Use `Output.object()` with a Zod FRD schema. Generate structured JSON, render to markdown deterministically. Temperature 0.1 for consistency. Include negative instructions: "Do NOT add sections not in the schema."
**Warning signs:** QA finds that regenerating the same FRD produces different document structures.

### Pitfall 2: Zod v4 + AI SDK Compatibility

**What goes wrong:** Zod v4 broke compatibility with `zod-to-json-schema` (used internally by AI SDK). Build failures with `ZodFirstPartyTypeKind` import error.
**Why it happens:** Zod v4 removed/renamed exports that the schema conversion library depended on.
**How to avoid:** Use Zod 4.0.4 or later. This version includes the fix. Verified: GitHub issue #7189 on vercel/ai was closed as fixed in Zod 4.0.4.
**Warning signs:** Build errors mentioning `ZodFirstPartyTypeKind` or `zod-to-json-schema`.

### Pitfall 3: Firebase Admin Re-initialization in Serverless Functions

**What goes wrong:** Each Route Handler invocation may attempt to re-initialize Firebase Admin, causing "app already initialized" errors.
**Why it happens:** Next.js Route Handlers run as serverless functions. Module-level state persists within a single process but not across cold starts.
**How to avoid:** Use the singleton pattern: check `getApps().length > 0` before calling `initializeApp()`. Store `db` instance in module-level variable. Import `server-only` to prevent client leakage.
**Warning signs:** "Firebase App named '[DEFAULT]' already exists" errors in production logs.

### Pitfall 4: Prompt Data Leaking Through Error Messages and Logs

**What goes wrong:** User's brain dump content (potentially containing proprietary ideas) appears in Cloud Logging, error monitoring, or client-side error boundaries.
**Why it happens:** Default logging captures full request bodies. Gemini SDK errors include the full prompt. Developers add `console.log(prompt)` during development.
**How to avoid:** Implement error sanitization at the API boundary. Never log raw request bodies for generation endpoints. Wrap Gemini calls in try/catch that strips prompt data from error objects. Never include prompt text in `NextResponse.json()` error responses.
**Warning signs:** Searching Cloud Logging for known brain dump text returns results.

### Pitfall 5: No maxTokens Cap on Generation

**What goes wrong:** Model generates unbounded output. A single generation could consume 50-100x typical token cost. Large brain dumps produce enormous prompts.
**Why it happens:** `generateText` without `maxTokens` lets the model generate until it stops naturally.
**How to avoid:** Set `maxTokens: 8192` on every `generateText` call. Validate input length before generation (reject brain dumps > 15,000 characters). Track `usage.totalTokens` per generation.
**Warning signs:** Token usage per generation varies by more than 5x across requests.

### Pitfall 6: Streaming Markdown Performance Degradation

**What goes wrong:** If streaming markdown (future phase), re-rendering the entire markdown on every token causes exponential performance degradation as the document grows.
**Why it happens:** react-markdown re-parses the entire string on every update. With streaming, this happens on every token (50-100ms intervals).
**How to avoid:** For Phase 1, this is avoided entirely by using `generateText` (non-streaming). For future streaming: use the memoization pattern from AI SDK cookbook -- split markdown into blocks via `marked.lexer()`, memoize each block, only re-render the active block. Use `experimental_throttle: 50` on `useCompletion`.
**Warning signs:** UI becomes sluggish during long FRD generation with streaming enabled.

### Pitfall 7: Firestore Document Size Limit

**What goes wrong:** FRD content + metadata stored in a single document approaches the 1 MiB (1,048,576 bytes) Firestore limit.
**Why it happens:** Developers naturally model a project as a single document containing all versions inline.
**How to avoid:** Use subcollections from day one: `projects/{projectId}/versions/{versionId}`. Never store version content in the parent project document. Denormalize `latestVersionId` and `versionCount` on the project document for dashboard queries.
**Warning signs:** Firestore write errors with `INVALID_ARGUMENT` or "Document exceeds maximum size."

## Code Examples

### Complete FRD Generation Flow (Server)

```typescript
// Source: Verified against AI SDK 6 docs + @ai-sdk/google provider docs
// lib/ai/generation-engine.ts
import 'server-only';
import { generateText, Output } from 'ai';
import { google, type GoogleLanguageModelOptions } from '@ai-sdk/google';
import { FRDSchema, type FRD } from './frd-schema';
import { composeGenerationPrompt } from './prompt-composer';
import type { GenerationInput } from './types';

export async function generateFRD(input: GenerationInput): Promise<{
  frd: FRD;
  usage: { promptTokens: number; completionTokens: number; totalTokens: number };
}> {
  const { system, prompt } = composeGenerationPrompt(input);

  const startTime = Date.now();

  const result = await generateText({
    model: google('gemini-2.5-flash'),
    output: Output.object({ schema: FRDSchema }),
    system,
    prompt,
    maxTokens: 8192,
    temperature: 0.1,
    providerOptions: {
      google: {
        thinkingConfig: {
          thinkingBudget: 2048,
        },
      } satisfies GoogleLanguageModelOptions,
    },
  });

  if (!result.output) {
    throw new Error('No structured output generated');
  }

  const generationTimeMs = Date.now() - startTime;

  return {
    frd: result.output,
    usage: {
      promptTokens: result.usage.promptTokens,
      completionTokens: result.usage.completionTokens,
      totalTokens: result.usage.totalTokens,
    },
  };
}
```

### Firestore Version Storage

```typescript
// Source: Firebase Admin SDK docs (firebase.google.com/docs/firestore)
// lib/db/versions.ts
import 'server-only';
import { getDb } from './admin';
import { FieldValue } from 'firebase-admin/firestore';
import { nanoid } from 'nanoid';

interface VersionData {
  content: string;           // Rendered markdown
  structuredData: object;    // Raw FRD JSON from Gemini
  mode: 'fast' | 'standard';
  model: string;
  versionNumber: number;
  tokensUsed: number;
  metadata: {
    promptTokens: number;
    completionTokens: number;
    generationTimeMs: number;
  };
}

export async function saveVersion(
  projectId: string,
  data: VersionData
) {
  const db = getDb();
  const versionId = nanoid();
  const versionRef = db
    .collection('projects')
    .doc(projectId)
    .collection('versions')
    .doc(versionId);

  await versionRef.set({
    ...data,
    createdAt: FieldValue.serverTimestamp(),
  });

  return { id: versionId };
}

export async function getLatestVersion(projectId: string) {
  const db = getDb();
  const versions = await db
    .collection('projects')
    .doc(projectId)
    .collection('versions')
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get();

  if (versions.empty) return null;

  const doc = versions.docs[0];
  return { id: doc.id, ...doc.data() };
}
```

### Tailwind CSS v4 Setup

```css
/* Source: Tailwind CSS v4 docs (tailwindcss.com/docs/installation/using-postcss)
   app/globals.css */
@import "tailwindcss";

@theme {
  --color-primary: #2563eb;
  --color-primary-dark: #1d4ed8;
  --font-sans: "Inter", system-ui, sans-serif;
}
```

```javascript
// postcss.config.mjs
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};
```

### Input Validation with Zod

```typescript
// Source: Zod 4 docs (zod.dev)
// lib/validation/generation.ts
import { z } from 'zod';

export const GenerationRequestSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  projectName: z.string().min(1, 'Project name is required').max(100),
  brainDump: z.string()
    .min(50, 'Please provide at least 50 characters to generate a meaningful FRD')
    .max(15000, 'Input exceeds maximum length of 15,000 characters'),
  mode: z.literal('fast'), // Only fast mode in Phase 1
});

export type GenerationRequest = z.infer<typeof GenerationRequestSchema>;
```

### Mobile Responsive FRD Display

```typescript
// Source: Tailwind CSS v4 responsive utilities
// components/generation/frd-display.tsx
'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CopyButton } from '@/components/export/copy-button';
import { DownloadButton } from '@/components/export/download-button';

interface FrdDisplayProps {
  markdown: string;
  projectName: string;
}

export function FrdDisplay({ markdown, projectName }: FrdDisplayProps) {
  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Export actions - stack on mobile, inline on desktop */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mb-6">
        <CopyButton text={markdown} />
        <DownloadButton
          content={markdown}
          filename={`${projectName.toLowerCase().replace(/\s+/g, '-')}-frd.md`}
        />
      </div>

      {/* Rendered FRD with prose styling */}
      <article
        className="prose prose-sm sm:prose-base lg:prose-lg max-w-none
                   prose-headings:scroll-mt-20
                   prose-table:overflow-x-auto"
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {markdown}
        </ReactMarkdown>
      </article>
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `generateObject()` / `streamObject()` (AI SDK 5) | `generateText()` / `streamText()` with `output: Output.object()` (AI SDK 6) | AI SDK 6.0 (2025) | Must use new API. Old functions deprecated and will be removed. |
| `middleware.ts` (Next.js 15) | `proxy.ts` (Next.js 16) | Next.js 16.0 (Oct 2025) | Rename file and export function. `middleware.ts` still works but deprecated. |
| `tailwind.config.js` (Tailwind v3) | CSS-first config with `@import "tailwindcss"` (Tailwind v4) | Tailwind 4.0 (Jan 2025) | JS config still works as legacy but CSS-first is the standard. |
| `zod-to-json-schema` (external) | `z.toJSONSchema()` (Zod v4 native) | Zod 4.0 (2025) | External library no longer maintained. Use native method. AI SDK handles this internally. |
| `next lint` CLI command | Biome or ESLint CLI directly | Next.js 16.0 | `next lint` removed. `next build` no longer runs linting. |
| `experimental.turbopack` config | Top-level `turbopack` config | Next.js 16.0 | Turbopack is default bundler. Config moved out of experimental. |
| Webpack (default bundler) | Turbopack (default bundler) | Next.js 16.0 | Use `--webpack` flag to opt back to Webpack if needed. |

**Deprecated/outdated:**
- `generateObject` / `streamObject`: Removed in AI SDK 6. Use `generateText`/`streamText` with `output`.
- `CoreMessage` type: Removed in AI SDK 6. Use `ModelMessage`.
- `middleware.ts`: Deprecated in Next.js 16. Rename to `proxy.ts`.
- `zod-to-json-schema`: Abandoned. Zod v4 has native JSON schema conversion.
- `next lint`: Removed from Next.js 16.

## Open Questions

1. **FRD Schema Design: How many sections and at what granularity?**
   - What we know: The proven FRD template exists (referenced in PROJECT.md). The schema must map 1:1 to this template's sections.
   - What's unclear: The exact template content has not been provided in the planning documents. The schema shown above is a reasonable default but may need adjustment to match the proven template.
   - Recommendation: Before implementing the Zod schema, obtain the proven FRD template and map its sections to schema fields. The schema design drives everything downstream (prompts, rendering, versioning).

2. **Generation Time with Structured Output: How long will `generateText` + `Output.object()` take?**
   - What we know: Gemini 2.5 Flash is fast (typically 2-10 seconds for moderate prompts). Structured output may add overhead compared to free-text generation. The FRD schema has ~7 top-level fields with nested arrays.
   - What's unclear: Exact latency for a full FRD generation with structured output. Whether the `thinkingBudget` configuration affects structured output quality or latency.
   - Recommendation: Implement the generation engine early and benchmark with real brain dump inputs. If generation consistently exceeds 15 seconds, consider: (a) reducing schema complexity, (b) switching to streaming structured output with `partialOutputStream`, or (c) splitting generation into multiple calls per section.

3. **Auth Stub for Phase 1: How to design for auth without implementing it?**
   - What we know: Auth is deferred to Phase 4. Architecture must accommodate auth from Phase 1. All Firestore documents will need a `userId` field.
   - What's unclear: Whether to use a hardcoded "anonymous" userId, a session-based temporary ID, or skip userId entirely in Phase 1.
   - Recommendation: Use a hardcoded anonymous userId constant (e.g., `'anonymous'`) for Phase 1. Add `userId` fields to all Firestore documents. Add `// TODO: Replace with authenticated userId` comments at every usage. This makes Phase 4 auth integration a find-and-replace operation rather than a data model migration.

4. **Gemini Structured Output Limitations: What Zod features are unsupported?**
   - What we know: Official @ai-sdk/google docs state that `z.union` and `z.record` are not supported with Google Generative AI structured output. Gemini requires top-level type to be OBJECT.
   - What's unclear: Whether other Zod features (discriminated unions, transforms, refinements) work. Whether `.describe()` annotations influence generation quality.
   - Recommendation: Stick to simple Zod types in the FRD schema: `z.string()`, `z.number()`, `z.boolean()`, `z.array()`, `z.object()`, `z.enum()`. Use `.describe()` on every field -- it maps to JSON Schema `description` which helps Gemini understand what to generate. Avoid unions, records, transforms, and refinements in the schema.

## Sources

### Primary (HIGH confidence)
- [AI SDK 6 Structured Data Generation](https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data) -- `Output.object()` API, streaming structured output, Zod schema usage
- [AI SDK 6 Output Reference](https://ai-sdk.dev/docs/reference/ai-sdk-core/output) -- Output types, partial streaming caveats, `NoObjectGeneratedError`
- [@ai-sdk/google Provider Docs](https://ai-sdk.dev/providers/ai-sdk-providers/google-generative-ai) -- Model IDs, structured output on by default, Zod limitations (`z.union`/`z.record` unsupported), thinking config, safety settings
- [AI SDK Getting Started: Next.js App Router](https://ai-sdk.dev/docs/getting-started/nextjs-app-router) -- Route Handler setup, `useCompletion` hook, streaming configuration
- [AI SDK useCompletion Reference](https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-completion) -- Hook parameters, `experimental_throttle`, abort control
- [AI SDK Markdown Chatbot with Memoization](https://ai-sdk.dev/cookbook/next/markdown-chatbot-with-memoization) -- Memoized markdown rendering for streaming, `marked.lexer()` block splitting
- [Gemini Structured Output Docs](https://ai.google.dev/gemini-api/docs/structured-output) -- responseSchema, JSON Schema support, streaming structured output, model compatibility
- [Gemini Structured Output Announcement](https://blog.google/innovation-and-ai/technology/developers-tools/gemini-api-structured-outputs/) -- JSON Schema keywords, property ordering, Zod/Pydantic support
- [Next.js 16 Blog Post](https://nextjs.org/blog/next-16) -- Turbopack default, proxy.ts, breaking changes
- [Next.js 16 Upgrade Guide](https://nextjs.org/docs/app/guides/upgrading/version-16) -- Migration steps, deprecated features
- [Tailwind CSS v4 PostCSS Installation](https://tailwindcss.com/docs/installation/using-postcss) -- PostCSS plugin setup, CSS-first config
- [Firestore Data Model](https://firebase.google.com/docs/firestore/data-model) -- Collections, subcollections, document limits
- [Firebase Admin SDK Initialization](https://makerkit.dev/blog/tutorials/initialize-firebase-admin-nextjs) -- Singleton pattern, `server-only` import, credential formatting
- [MDN Clipboard API](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API) -- `navigator.clipboard.writeText()`, browser support
- [MDN URL.createObjectURL()](https://developer.mozilla.org/en-US/docs/Web/API/URL/createObjectURL_static) -- Blob URL creation for file download

### Secondary (MEDIUM confidence)
- [Zod v4 + AI SDK Compatibility Issue #7189](https://github.com/vercel/ai/issues/7189) -- Fixed in Zod 4.0.4. Closed July 2025.
- [Zod v4 & Gemini Fix](https://www.buildwithmatija.com/blog/zod-v4-gemini-fix-structured-output-z-tojsonschema) -- `z.toJSONSchema()` replaces `zod-to-json-schema`
- [Implementing Copy to Clipboard in React](https://blog.logrocket.com/implementing-copy-clipboard-react-clipboard-api/) -- Clipboard API patterns, fallbacks
- [Migrating to Next.js 16 Production Guide](https://www.amillionmonkeys.co.uk/blog/migrating-to-nextjs-16-production-guide) -- Real-world migration pitfalls
- [AI SDK Stream Text Cookbook](https://ai-sdk.dev/cookbook/next/stream-text) -- `useCompletion` hook, `toUIMessageStreamResponse()`

### Tertiary (LOW confidence)
- [Next.js Singleton Issue #65350](https://github.com/vercel/next.js/issues/65350) -- Module-level singleton inconsistency in App Router (open issue, may affect Firebase Admin init)
- [Firebase Genkit + Next.js Issue #3371](https://github.com/firebase/genkit/issues/3371) -- Architectural challenges with Firebase Admin in Next.js App Router

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- All technologies verified against official docs. Version compatibility confirmed. AI SDK 6 + Zod v4 compatibility issue resolved in Zod 4.0.4.
- Architecture: HIGH -- Structured output pattern verified in AI SDK 6 docs. Route Handler pattern standard for Next.js. Firebase Admin singleton pattern well-documented.
- Pitfalls: HIGH -- Zod v4 compatibility verified via closed GitHub issue. Firestore limits from official docs. Structured output limitations from @ai-sdk/google docs.
- Open questions: MEDIUM -- FRD schema design depends on proven template (not yet provided). Generation latency needs benchmarking. Auth stub approach is a recommendation, not verified.

**Research date:** 2026-02-11
**Valid until:** 2026-03-11 (30 days -- stable stack, unlikely to change)
