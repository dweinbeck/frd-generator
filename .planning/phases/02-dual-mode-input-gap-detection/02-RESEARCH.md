# Phase 2: Dual-Mode Input & Gap Detection - Research

**Researched:** 2026-02-12
**Domain:** AI-powered gap detection, multi-step guided input flows, model tier selection in a Next.js 16 + Gemini structured output application
**Confidence:** HIGH

## Summary

Phase 2 takes the working Fast mode pipeline from Phase 1 and adds three capabilities: (1) gap detection that analyzes a brain dump against the FRD template and presents targeted follow-up questions, (2) Standard mode with guided Q&A flow, and (3) model tier selection between Gemini 2.5 Flash and Gemini 3 Pro.

The critical finding from this research is that **nearly all Phase 2 code already exists in the codebase from Phase 1 forward-building**. The gap detection engine (`gap-detection-engine.ts`), gap detection schema (`gap-detection-schema.ts`), gap detection prompt (`templates/gap-detection.ts`), follow-up UI (`gap-follow-ups.tsx`), standard mode flow (`standard-mode-flow.tsx`), standard mode questions (`standard-mode-questions.ts`), model selector (`model-selector.tsx`), mode selector (`mode-selector.tsx`), and the `analyze-gaps` API route all exist with substantive implementations. The prompt composer already handles both fast mode (with follow-up answers) and standard mode (with guided answers). The generation flow state machine already orchestrates the gap detection -> follow-ups -> generation pipeline.

The work for Phase 2 is therefore primarily about **fixing bugs, enabling disabled features, and verifying the end-to-end flow** rather than building from scratch. There are several concrete issues that must be addressed.

**Primary recommendation:** Audit and fix the existing Phase 2 code (model ID bug, validation schema bug, disabled standard mode), enable Standard mode in the mode selector, add integration tests, and verify the full end-to-end flow for both modes. No new libraries or architectural changes needed.

## Standard Stack

### Core

All libraries are already installed from Phase 1. No new dependencies required.

| Library | Version | Purpose | Already Installed |
|---------|---------|---------|-------------------|
| ai (AI SDK 6) | ^6.0.81 | `generateText` + `Output.object()` for gap detection and FRD generation | Yes |
| @ai-sdk/google | ^3.0.26 | Gemini provider for both model tiers | Yes |
| zod | ^4.3.6 | Validation schemas for gap detection request, generation request | Yes |
| react | 19.2.3 | UI components for gap follow-ups, standard mode flow, model selector | Yes |
| next | 16.1.6 | API routes for analyze-gaps and generate endpoints | Yes |

### Supporting

No new supporting libraries needed. All UI utility libraries (clsx, lucide-react) are already installed.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Single gap detection call | Multi-call per-section gap analysis | More granular but adds latency (3-7 serial API calls vs 1). Single call with structured output is sufficient for 3-7 gaps. |
| Static standard mode questions | AI-generated adaptive questions | Dynamic questions would require an extra API call and add unpredictability. Static questions are predictable, testable, and sufficient for the guided experience. |
| Radio buttons for model selection | Dropdown select | Radio buttons (current implementation) are better UX when there are only 2 options -- both visible at once, no extra click. |

**Installation:**
```bash
# No new packages needed
```

## Architecture Patterns

### Existing Project Structure (Phase 2 Files)

All files below already exist in the codebase with substantive implementations:

```
src/
├── app/
│   └── api/
│       ├── analyze-gaps/
│       │   └── route.ts              # POST: gap detection (EXISTS)
│       └── generate/
│           └── route.ts              # POST: FRD generation with both modes (EXISTS)
├── lib/
│   ├── ai/
│   │   ├── gap-detection-engine.ts   # analyzeGaps() with structured output (EXISTS)
│   │   ├── gap-detection-schema.ts   # GapSchema with section, description, followUpPrompt, importance (EXISTS)
│   │   ├── prompt-composer.ts        # Handles fast + standard mode prompt assembly (EXISTS)
│   │   ├── models.ts                 # Model config with MODELS object (EXISTS - NEEDS FIX)
│   │   └── templates/
│   │       └── gap-detection.ts      # Gap detection system prompt (EXISTS)
│   ├── standard-mode-questions.ts    # 8 guided questions covering FRD sections (EXISTS)
│   └── validation/
│       └── generation.ts             # GenerationRequestSchema (EXISTS - NEEDS FIX)
├── components/
│   └── generation/
│       ├── gap-follow-ups.tsx        # Follow-up question UI with answer/skip (EXISTS)
│       ├── standard-mode-flow.tsx    # Step-by-step guided Q&A wizard (EXISTS)
│       ├── mode-selector.tsx         # Fast/Standard mode toggle (EXISTS - NEEDS CHANGE)
│       ├── model-selector.tsx        # Gemini Flash/Pro selector (EXISTS)
│       └── generation-flow.tsx       # State machine orchestrating all flows (EXISTS)
└── types/
    └── index.ts                      # FollowUpAnswer, GuidedAnswer, StandardModeQuestion types (EXISTS)
```

### Pattern 1: Gap Detection Pipeline (Already Implemented)

**What:** Brain dump is sent to a gap detection AI call that returns structured gap objects, each with a section name, description, follow-up prompt, and importance level. The UI renders these as expandable cards with textarea inputs.

**How it works today:**
1. User submits brain dump -> `GenerationFlow` calls `POST /api/analyze-gaps`
2. API validates with `GapDetectionRequestSchema`, calls `analyzeGaps()`
3. `analyzeGaps()` uses `generateText` + `Output.object({ schema: GapSchema })` with `GAP_DETECTION_PROMPT`
4. Returns `{ gaps: [{ section, description, followUpPrompt, importance }] }`
5. If gaps found, `GenerationFlow` transitions to `follow-ups` state, renders `GapFollowUps`
6. User answers/skips -> answers collected as `FollowUpAnswer[]`
7. Generation called with brain dump + follow-up answers
8. `composeGenerationPrompt()` assembles brain dump + follow-up answers into prompt

**Status:** Fully implemented and wired. Needs testing with real Gemini calls.

### Pattern 2: Standard Mode Guided Flow (Already Implemented)

**What:** A step-by-step wizard that guides users through 8 predefined questions covering FRD sections (Overview, Personas, Requirements, Constraints, Out of Scope). Users navigate forward/back, can skip non-required questions, and submit all answers for generation.

**How it works today:**
1. User selects Standard mode on home page -> project created with `mode: "standard"`
2. `ProjectPage` renders `GenerationFlow` with `mode="standard"`
3. `GenerationFlow` renders `StandardModeFlow` instead of `BrainDumpInput`
4. `StandardModeFlow` presents questions one at a time with progress bar
5. User answers -> advances; skips -> advances without saving
6. On finish -> `GuidedAnswer[]` passed to `handleStandardSubmit()`
7. API call to `POST /api/generate` with `mode: "standard"` and `guidedAnswers`
8. `composeGenerationPrompt()` assembles guided answers into prompt sections

**Status:** Fully implemented but **disabled** via `ModeSelector` (Standard mode has `disabled: true` and "Coming Soon" badge). The underlying pipeline is wired and ready.

### Pattern 3: Model Tier Selection (Already Implemented)

**What:** A toggle between Gemini 2.5 Flash (default) and Gemini 3 Pro that controls which model is used for both gap detection and FRD generation.

**How it works today:**
1. `ModelSelector` renders two buttons with model info and badges
2. Selected model ID stored in `GenerationFlow` state as `modelId`
3. `modelId` passed to both `/api/analyze-gaps` and `/api/generate` API calls
4. Server-side: `getModel()` in `models.ts` maps model ID to `google()` provider call
5. Both `analyzeGaps()` and `generateFRD()` accept `modelId` parameter

**Status:** Fully implemented but has a **critical bug** -- model ID for Gemini 3 Pro.

### Anti-Patterns to Avoid

- **Sending brain dump text for standard mode:** Standard mode should NOT require a brain dump. The current `GenerationRequestSchema` has `brainDump` with `.min(50)` which will reject standard mode requests that send `brainDump: ""`. The schema must be updated to allow empty/missing brainDump when mode is "standard".
- **Using incorrect Gemini model IDs:** `gemini-3-pro` is not a valid model identifier. The correct ID is `gemini-3-pro-preview`. The `@ai-sdk/google` provider will fail silently or throw at API call time.
- **Skipping validation schema updates when enabling standard mode:** The validation schema must match the actual request shape for standard mode (brainDump optional, guidedAnswers required).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Gap detection AI call | Custom HTTP client for Gemini API | `generateText` + `Output.object()` via AI SDK | Already implemented in `gap-detection-engine.ts`. Schema enforcement guarantees structured gap output. |
| Follow-up question UI | Custom accordion component | The existing `GapFollowUps` component | Already built with expand/collapse, importance badges, answer tracking, and submit/skip actions. |
| Guided Q&A wizard | Custom multi-step form library | The existing `StandardModeFlow` component | Already built with forward/back navigation, progress bar, skip support, and answer collection. |
| Model selection UI | Dropdown or custom select | The existing `ModelSelector` component | Already built with two-option toggle, badge labels, and visual state. |

**Key insight:** Phase 2 is almost entirely about enabling and fixing existing code, not building new features. The Phase 1 team forward-built the entire Phase 2 feature set. The planner should focus tasks on bug fixes, validation changes, testing, and enablement rather than creating new files.

## Common Pitfalls

### Pitfall 1: Gemini 3 Pro Model ID is Wrong

**What goes wrong:** The codebase uses `gemini-3-pro` as the model ID, but Google's API requires `gemini-3-pro-preview`. API calls to generate with the premium model will fail.
**Why it happens:** The model was likely referenced from outdated documentation or assumed naming convention.
**How to avoid:** Update `src/lib/ai/models.ts` to use `gemini-3-pro-preview` as the `id` field. Update `src/lib/validation/generation.ts` to accept `gemini-3-pro-preview` in the enum. Update `src/components/generation/model-selector.tsx` to use the corrected ID.
**Warning signs:** 404 or "model not found" errors when selecting Gemini 3 Pro for generation. Errors may be opaque since they come from the Google API.
**Confidence:** HIGH -- verified against official Google AI docs (ai.google.dev/gemini-api/docs/models) and AI SDK provider docs (ai-sdk.dev/providers/ai-sdk-providers/google-generative-ai).

### Pitfall 2: Standard Mode Blocked by brainDump Validation

**What goes wrong:** Standard mode sends `brainDump: ""` but `GenerationRequestSchema` requires `.min(50)` on brainDump. The API returns a 400 validation error.
**Why it happens:** The schema was designed for Fast mode in Phase 1. Standard mode was intentionally disabled, so the validation mismatch was never triggered.
**How to avoid:** Make `brainDump` validation conditional on mode. When `mode === "standard"`, brainDump should allow empty strings or be optional. When `mode === "fast"`, maintain the `.min(50)` requirement. Zod's `.superRefine()` or `.refine()` could handle this, but those are NOT compatible with Gemini structured output. Since this schema is only used for API input validation (not AI generation), using `.refine()` here is safe.
**Warning signs:** Standard mode submissions immediately returning 400 errors with "Please provide at least 50 characters" message.
**Confidence:** HIGH -- verified by reading `GenerationRequestSchema` and `generation-flow.tsx` `handleStandardSubmit()`.

### Pitfall 3: Standard Mode Missing Required Answer Validation

**What goes wrong:** Standard mode questions have some marked as `required: true` (project-overview, problem, users, key-features), but the `StandardModeFlow` component does not enforce this -- a user can skip required questions and submit with zero answers.
**Why it happens:** The skip/next flow treats all questions the same regardless of `required` flag. The skip button is hidden for required questions, but the "Next" button still advances without checking for an answer.
**How to avoid:** Either enforce that required questions must have answers before advancing (add validation in `handleNext()`), or make all questions optional (remove `required` flag). The latter is simpler and matches the requirement STND-02 ("User can skip any section or question without breaking the flow"). However, generating a useful FRD with zero answers is unlikely, so a minimum answer count before submit may be appropriate.
**Warning signs:** Users submitting standard mode with zero answers, producing a very generic or empty FRD.
**Confidence:** HIGH -- verified by reading `standard-mode-flow.tsx` and `standard-mode-questions.ts`.

### Pitfall 4: Gap Detection Prompt Quality

**What goes wrong:** Gap detection identifies too many or too few gaps. Trivial gaps clutter the experience; missing critical gaps defeat the purpose.
**Why it happens:** The gap detection prompt is a first draft that has not been tested with real brain dumps.
**How to avoid:** The existing prompt is well-structured with clear guidelines (3-7 gaps, importance levels, sort by importance). Test with 3-5 real brain dumps of varying quality (sparse, moderate, detailed) and verify the gaps are actionable and correctly prioritized. Adjust the prompt based on results.
**Warning signs:** Consistently returning 0 gaps for sparse brain dumps or 10+ gaps for detailed ones.
**Confidence:** MEDIUM -- the prompt structure looks sound but needs empirical validation.

### Pitfall 5: Model Selector Not Showing Cost Difference

**What goes wrong:** Users don't understand the cost implication of choosing Gemini 3 Pro over Flash. In Phase 5, Pro will cost more credits.
**Why it happens:** The model selector shows "Default" vs "Premium" badges but no cost information.
**How to avoid:** For Phase 2, this is acceptable since credits are disabled. Ensure the "Premium" badge clearly communicates that this is the more expensive option. Cost information will be added in Phase 5.
**Warning signs:** Users consistently selecting Pro when Flash would suffice, leading to higher costs in Phase 5.
**Confidence:** MEDIUM -- UX concern, not a bug.

### Pitfall 6: Standard Mode Generates Low-Quality FRD with Minimal Answers

**What goes wrong:** If a user skips most questions and only answers 1-2, the generated FRD is thin and unhelpful.
**Why it happens:** The prompt composer simply concatenates the answered questions. With 1-2 short answers, there's very little context for the AI to work with.
**How to avoid:** Consider a minimum threshold before allowing generation (e.g., at least 2 required questions answered). Display a warning when few questions are answered: "For best results, try to answer at least the required questions." The current `handleFinish()` collects all non-empty answers and submits regardless of count.
**Warning signs:** Standard mode FRDs that are consistently rated lower than Fast mode FRDs.
**Confidence:** MEDIUM -- UX concern, testable empirically.

## Code Examples

### Fix 1: Corrected Model Configuration

```typescript
// src/lib/ai/models.ts - CURRENT (BROKEN)
"gemini-3-pro": {
    id: "gemini-3-pro",
    ...
}

// src/lib/ai/models.ts - FIXED
"gemini-3-pro-preview": {
    id: "gemini-3-pro-preview",
    name: "Gemini 3 Pro",
    description: "Premium model for complex requirements and deeper analysis.",
    maxOutputTokens: 16384,
}
```

This change cascades to:
- `src/lib/validation/generation.ts`: Update `modelId` enum from `"gemini-3-pro"` to `"gemini-3-pro-preview"`
- `src/components/generation/model-selector.tsx`: Update the `id` field in the models array
- `src/components/generation/generation-flow.tsx`: No change needed (stores model ID from selector)
- `src/lib/ai/gap-detection-engine.ts`: No change needed (receives model ID from caller)
- `src/lib/ai/generation-engine.ts`: No change needed (receives model ID from caller)

### Fix 2: Validation Schema for Standard Mode

```typescript
// src/lib/validation/generation.ts - CURRENT (BROKEN for standard mode)
brainDump: z.string()
    .min(50, "Please provide at least 50 characters...")
    .max(15000, "Input exceeds maximum length..."),

// src/lib/validation/generation.ts - FIXED (conditional validation)
// Option A: Use superRefine for cross-field validation
export const GenerationRequestSchema = z.object({
    projectId: z.string().min(1, "Project ID is required"),
    projectName: z.string().min(1, "Project name is required").max(100),
    brainDump: z.string().max(15000, "Input exceeds maximum length of 15,000 characters"),
    mode: z.enum(["fast", "standard"]),
    followUpAnswers: z.array(FollowUpAnswerSchema).optional(),
    guidedAnswers: z.array(GuidedAnswerSchema).optional(),
    modelId: z.enum(["gemini-2.5-flash", "gemini-3-pro-preview"]).optional(),
    parentVersionId: z.string().optional(),
    iterationFeedback: z.string().max(10000).optional(),
}).refine(
    (data) => {
        if (data.mode === "fast") {
            return data.brainDump.length >= 50;
        }
        return true;
    },
    {
        message: "Please provide at least 50 characters to generate a meaningful FRD",
        path: ["brainDump"],
    },
);
```

**Note:** `.refine()` is safe here because this schema is used only for API request validation, NOT for Gemini structured output. The Gemini-facing schemas (`FRDSchema`, `GapSchema`) remain simple types without refine/transform.

### Fix 3: Enable Standard Mode in Mode Selector

```typescript
// src/components/generation/mode-selector.tsx - CURRENT (DISABLED)
{
    id: "standard" as const,
    name: "Standard Mode",
    description: "Guided questions to build a comprehensive FRD",
    timeEstimate: "~5 minutes",
    icon: ClipboardList,
    disabled: true,
    badge: "Coming Soon" as string | null,
},

// src/components/generation/mode-selector.tsx - FIXED (ENABLED)
{
    id: "standard" as const,
    name: "Standard Mode",
    description: "Guided questions to build a comprehensive FRD",
    timeEstimate: "~5 minutes",
    icon: ClipboardList,
    disabled: false,
    badge: null,
},
```

### Existing Pattern: Gap Detection Flow (No Changes Needed)

The gap detection flow in `generation-flow.tsx` is correctly implemented:

```typescript
// State machine: input -> analyzing-gaps -> follow-ups -> generating -> complete
// This already works. The state transitions are:
// 1. handleBrainDumpSubmit() -> "analyzing-gaps" -> POST /api/analyze-gaps
// 2. If gaps found -> "follow-ups" -> render GapFollowUps
// 3. If no gaps -> generateWithInput(text, []) -> "generating"
// 4. User submits answers or skips -> generateWithInput(brainDump, answers) -> "generating"
// 5. Generation complete -> "complete" -> render FrdDisplay
```

### Existing Pattern: Standard Mode Prompt Composition (No Changes Needed)

The prompt composer already handles standard mode:

```typescript
// src/lib/ai/prompt-composer.ts - lines 34-42
// Already correctly assembles guided answers into prompt:
} else if (input.mode === "standard") {
    sections.push("\n--- Guided Input ---");
    if (input.guidedAnswers && input.guidedAnswers.length > 0) {
        for (const answer of input.guidedAnswers) {
            sections.push(`\n[${answer.section}] ${answer.question}`);
            sections.push(`Answer: ${answer.answer}`);
        }
    }
}
```

## Identified Issues Summary

| # | Issue | Severity | File(s) | Fix Complexity |
|---|-------|----------|---------|----------------|
| 1 | Model ID `gemini-3-pro` is invalid; should be `gemini-3-pro-preview` | **CRITICAL** | `models.ts`, `generation.ts`, `model-selector.tsx` | Low (string rename) |
| 2 | `GenerationRequestSchema.brainDump` requires `.min(50)` which blocks standard mode | **CRITICAL** | `validation/generation.ts` | Low (add `.refine()` conditional) |
| 3 | Standard mode is disabled in `ModeSelector` with "Coming Soon" badge | **Blocking** | `mode-selector.tsx` | Trivial (flip boolean, remove badge) |
| 4 | Standard mode `handleNext()` doesn't enforce required questions | **Medium** | `standard-mode-flow.tsx` | Low (add validation check) |
| 5 | No minimum answer threshold for standard mode submission | **Low** | `standard-mode-flow.tsx` | Low (add warning or gate) |
| 6 | Gap detection prompt needs empirical testing | **Medium** | `templates/gap-detection.ts` | Medium (requires testing with real inputs) |
| 7 | `GapDetectionRequestSchema` modelId enum also uses wrong `gemini-3-pro` | **CRITICAL** | `validation/generation.ts` | Low (same fix as #1) |
| 8 | No tests exist for any Phase 2 code | **Medium** | New test files | Medium (write tests for gap detection, standard mode, model selection) |

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `gemini-3-pro` model ID | `gemini-3-pro-preview` model ID | Gemini 3 launch (2026) | All Gemini 3 models are preview-only. Must use `-preview` suffix. |
| Gemini 2.5 Pro as premium tier | Gemini 3 Pro as premium tier | Gemini 3 launch (2026) | Gemini 3 Pro offers stronger reasoning. Both support structured output. |

**Note on Gemini 3 GA:** As of February 2026, Gemini 3 Pro remains in preview (`gemini-3-pro-preview`). When it reaches GA, the model ID may change to `gemini-3-pro`. The planner should note this for future updates, but for now, the `-preview` suffix is required.

## Open Questions

1. **Should standard mode enforce minimum required answers before allowing generation?**
   - What we know: STND-02 says "User can skip any section or question without breaking the flow." The `StandardModeFlow` component currently allows submitting with zero answers.
   - What's unclear: Whether "skip any question" means "skip ALL questions." A zero-answer FRD generation is technically possible but produces poor results.
   - Recommendation: Allow skipping individual questions (per STND-02) but show a non-blocking warning when fewer than 2 questions are answered. Do not hard-block submission -- let the user decide.

2. **Should gap detection use the same model as FRD generation, or always use Flash?**
   - What we know: Currently, `modelId` is passed to both gap detection and FRD generation. If user selects Pro, both calls use Pro (more expensive).
   - What's unclear: Whether gap detection quality significantly benefits from Pro vs Flash.
   - Recommendation: Keep current behavior (same model for both) for simplicity. Gap detection is a lightweight analysis task -- Flash is likely sufficient. But changing this adds complexity without clear user benefit. Users who select Pro expect premium quality throughout.

3. **When Gemini 3 Pro reaches GA, will the model ID change?**
   - What we know: Currently `gemini-3-pro-preview`. GA models typically drop the `-preview` suffix (e.g., `gemini-2.5-flash` has no suffix).
   - What's unclear: Google's timeline for GA and whether they'll maintain backward compatibility with the preview ID.
   - Recommendation: Use `gemini-3-pro-preview` now. Add a comment noting the ID may change at GA. The `MODELS` config object in `models.ts` makes this a single-line change when GA happens.

## Sources

### Primary (HIGH confidence)
- [Google AI Gemini Models Documentation](https://ai.google.dev/gemini-api/docs/models) -- Model IDs, `gemini-3-pro-preview` confirmed as correct ID
- [AI SDK Google Provider Documentation](https://ai-sdk.dev/providers/ai-sdk-providers/google-generative-ai) -- Supported model IDs, no `gemini-3-pro` in list
- [Google AI Structured Output Documentation](https://ai.google.dev/gemini-api/docs/structured-output) -- Gemini 3 Pro Preview supports structured output
- [Gemini 3 Developer Guide](https://ai.google.dev/gemini-api/docs/gemini-3) -- Gemini 3 Pro capabilities, structured output + tools support
- Existing codebase analysis (all files listed in Architecture Patterns section) -- Direct code reading of implemented features

### Secondary (MEDIUM confidence)
- [Google Developers Blog - Gemini 3 API Updates](https://developers.googleblog.com/new-gemini-api-updates-for-gemini-3/) -- Gemini 3 model capabilities
- [Google AI Studio Models](https://www.datastudios.org/post/google-ai-studio-all-models-available-gemini-3-general-availability-gemini-2-5-production-tiers-a) -- Model availability status

### Tertiary (LOW confidence)
- None. All findings verified against primary sources.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- No new libraries needed. All Phase 2 code already exists in the codebase.
- Architecture: HIGH -- All patterns already implemented. Research focused on identifying bugs and gaps in existing implementations.
- Pitfalls: HIGH -- Model ID bug verified against official Google docs. Validation bug verified by reading source code. Standard mode disabled state verified in code.
- Bug identification: HIGH -- All bugs found by direct code analysis with cross-referencing against requirements and API documentation.

**Research date:** 2026-02-12
**Valid until:** 2026-03-12 (30 days -- stable stack, Gemini 3 Pro preview status may change)
