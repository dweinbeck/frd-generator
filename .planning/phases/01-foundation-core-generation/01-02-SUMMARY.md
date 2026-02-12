---
phase: 01-foundation-core-generation
plan: 02
subsystem: ai
tags: [ai-sdk-6, gemini, zod, structured-output, generateText, Output.object, prompt-engineering, markdown-renderer]

# Dependency graph
requires:
  - phase: 01-01
    provides: "Firestore CRUD (projects, versions), Zod validation schemas, shared TypeScript types"
provides:
  - "FRD Zod schema with simple types for Gemini structured output (FRDSchema, FRD type)"
  - "System prompt template for FRD generation (SYSTEM_PROMPT)"
  - "Server-side prompt composer (composeGenerationPrompt) with no client-side leakage"
  - "Core generation engine using generateText + Output.object() with maxOutputTokens cap"
  - "Deterministic FRD-to-Markdown renderer (renderFRDToMarkdown)"
  - "Model configuration constants for gemini-2.5-flash and gemini-3-pro"
  - "POST /api/projects endpoint for project creation"
  - "GET /api/projects/[projectId] endpoint for project retrieval with latest version"
  - "POST /api/generate endpoint for FRD generation with version saving"
affects: [01-03-PLAN, all-subsequent-phases]

# Tech tracking
tech-stack:
  added: []
  patterns: [structured-output-via-Output.object, generateText-not-streamText, maxOutputTokens-8192-cap, temperature-0.1-consistency, server-only-ai-imports, sanitized-error-responses]

key-files:
  created: []
  modified: []
  verified:
    - src/lib/ai/frd-schema.ts
    - src/lib/ai/prompt-composer.ts
    - src/lib/ai/generation-engine.ts
    - src/lib/ai/frd-renderer.ts
    - src/lib/ai/models.ts
    - src/lib/ai/templates/system.ts
    - src/app/api/projects/route.ts
    - src/app/api/projects/[projectId]/route.ts
    - src/app/api/generate/route.ts

key-decisions:
  - "Accepted pre-existing AI engine and API routes from first commit; verified all meet plan requirements"
  - "AI SDK 6 uses maxOutputTokens (not maxTokens as plan specifies); existing code correctly uses maxOutputTokens: 8192"
  - "AI SDK 6 usage fields are inputTokens/outputTokens; engine correctly maps to promptTokens/completionTokens"
  - "API routes include pre-wired auth/credits/rate-limiting from later phases; does not conflict with plan scope"
  - "composedPrompt stored in version record for auditability (AUTH-04); not exposed in API responses"

patterns-established:
  - "Structured output: generateText + Output.object({ schema: FRDSchema }) for guaranteed schema compliance"
  - "Server-only AI code: Every file in src/lib/ai/ imports 'server-only' to prevent client-side leakage"
  - "Prompt composition: System prompt is static, user prompt is composed from inputs; never mixed"
  - "Sanitized errors: Error responses in /api/generate never contain brain dump, prompt, or FRD content"
  - "Deterministic rendering: renderFRDToMarkdown is pure function, same FRD JSON always produces same markdown"
  - "Gemini-safe Zod: Schema uses only simple types (string, number, boolean, array, object, enum) with .describe()"

# Metrics
duration: 3min
completed: 2026-02-12
---

# Phase 1 Plan 2: AI Generation Engine & API Routes Summary

**Gemini structured output engine with Output.object() FRD schema, server-side prompt composer, deterministic markdown renderer, and project/generation API routes**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-12T12:54:15Z
- **Completed:** 2026-02-12T12:57:38Z
- **Tasks:** 2
- **Files modified:** 0 (all 9 files verified from pre-existing scaffolding)

## Accomplishments
- Verified FRD Zod schema uses only Gemini-compatible types (no union/record/transform/refine) with .describe() on all fields
- Verified generation engine enforces maxOutputTokens: 8192 and temperature: 0.1 for consistent output
- Verified all 6 AI engine files and 3 API route files import server-only to prevent client-side leakage
- Verified POST /api/generate saves immutable version to Firestore subcollection on every successful generation
- Verified error responses in /api/generate contain no brain dump, prompt, or FRD content (GEN-06 compliance)
- Verified deterministic markdown renderer produces consistent output with checkbox acceptance criteria

## Task Commits

Each task was committed atomically:

1. **Task 1: AI generation engine (schema, prompt, engine, renderer, models)** - `535ed82` (pre-existing; all 6 files verified correct)
2. **Task 2: API route handlers (projects, generate)** - `d12bfad` (pre-existing; all 3 routes verified correct)

## Files Created/Modified
- `src/lib/ai/models.ts` - MODELS constant with gemini-2.5-flash/gemini-3-pro, getModel() provider factory
- `src/lib/ai/frd-schema.ts` - Zod FRD schema with projectName, coreValue, overview, personas, requirements, constraints, outOfScope, assumptions, openQuestions
- `src/lib/ai/templates/system.ts` - SYSTEM_PROMPT instructing Gemini to act as senior product analyst
- `src/lib/ai/prompt-composer.ts` - composeGenerationPrompt() assembling system + user prompt server-side
- `src/lib/ai/generation-engine.ts` - generateFRD() using generateText + Output.object({ schema: FRDSchema })
- `src/lib/ai/frd-renderer.ts` - renderFRDToMarkdown() with heading hierarchy, checkboxes, numbered lists
- `src/app/api/projects/route.ts` - POST handler creating projects with CreateProjectSchema validation
- `src/app/api/projects/[projectId]/route.ts` - GET handler returning project + latest version
- `src/app/api/generate/route.ts` - POST handler orchestrating generation, rendering, version saving

## Decisions Made
- **Accepted pre-existing scaffolding:** All 9 files were already present from the initial commit with full implementations that meet or exceed plan requirements. Verified rather than rewritten.
- **maxOutputTokens vs maxTokens:** Plan specifies `maxTokens: 8192` but AI SDK 6 renamed this to `maxOutputTokens`. Existing code correctly uses `maxOutputTokens: 8192`.
- **Usage field mapping:** AI SDK 6 returns `inputTokens`/`outputTokens`, not `promptTokens`/`completionTokens`. Engine correctly maps between naming conventions.
- **Pre-wired auth/credits/rate-limiting:** API routes include auth via `requireAuth`, credit charging via `chargeCredits`, and rate limiting -- features from later phases. These are functional and do not conflict with Phase 1 scope.
- **composedPrompt in version record:** The generate route stores the composed prompt in the version document for auditability (AUTH-04). This is stored server-side only, never exposed in API responses.

## Deviations from Plan

None - plan requirements were fully satisfied by existing code. All verification criteria passed:

1. `npm run build` exits 0
2. `npm run lint:check` exits 0
3. All `src/lib/ai/*.ts` files contain `import 'server-only'` (9/9 files)
4. FRD schema uses only simple Zod types (grep confirms no union/record/transform/refine)
5. Generation route saves version to Firestore subcollection on every successful generation
6. Error responses in `/api/generate` contain no user content (brain dump, prompts)
7. `maxOutputTokens: 8192` is set in the generateText call
8. Temperature is 0.1 in the generateText call

## Issues Encountered
None - pre-existing scaffolding was comprehensive and correct for all plan requirements.

## User Setup Required
None - no external service configuration required for this plan. GOOGLE_GENERATIVE_AI_API_KEY is needed at runtime but was configured during project setup.

## Next Phase Readiness
- AI generation engine ready for UI integration (Plan 01-03)
- API routes ready to accept requests from client components
- Structured FRD output guaranteed via Gemini's responseSchema enforcement
- Markdown rendering ready for clipboard/download export

## Self-Check: PASSED

All 9 plan files verified present on disk. Both commit hashes (535ed82, d12bfad) verified in git log. SUMMARY.md exists at expected path.

---
*Phase: 01-foundation-core-generation*
*Completed: 2026-02-12*
