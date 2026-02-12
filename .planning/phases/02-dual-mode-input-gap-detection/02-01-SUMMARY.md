---
phase: 02-dual-mode-input-gap-detection
plan: 01
subsystem: ui, api, ai
tags: [gemini, zod, validation, mode-selector, gap-detection, standard-mode]

# Dependency graph
requires:
  - phase: 01-foundation-core-generation
    provides: "Core generation flow, mode selector, model selector, validation schemas, gap detection pipeline"
provides:
  - "Corrected Gemini 3 Pro model ID (gemini-3-pro-preview) across all layers"
  - "Standard mode enabled and selectable in UI"
  - "Conditional brainDump validation (min 50 for fast mode only)"
  - "Required-question enforcement and minimum-answer warning in StandardModeFlow"
  - "Verified end-to-end gap detection pipeline (FAST-02 through FAST-05)"
affects: [02-dual-mode-input-gap-detection, 03-iteration-version-management]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Conditional Zod validation via .refine() for mode-dependent field constraints"
    - "Non-blocking warning pattern with force-submit escape hatch"

key-files:
  created: []
  modified:
    - src/lib/ai/models.ts
    - src/lib/validation/generation.ts
    - src/components/generation/mode-selector.tsx
    - src/components/generation/model-selector.tsx
    - src/components/generation/standard-mode-flow.tsx

key-decisions:
  - "Used .refine() for conditional brainDump validation since schema validates API input, not Gemini structured output"
  - "Minimum-answer warning is non-blocking with escape hatch to preserve user autonomy (STND-02)"

patterns-established:
  - "Conditional Zod: use .refine() on the object level for cross-field validation depending on mode"
  - "Non-blocking warnings: show warning + force-submit button instead of hard-blocking the user"

# Metrics
duration: 4min
completed: 2026-02-12
---

# Phase 2 Plan 1: Fix Model ID, Enable Standard Mode, Verify Gap Detection Summary

**Corrected Gemini 3 Pro model ID to gemini-3-pro-preview, enabled Standard mode with required-question enforcement, and verified gap detection pipeline end-to-end**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-12T16:33:25Z
- **Completed:** 2026-02-12T16:37:09Z
- **Tasks:** 3 (2 code changes + 1 verification)
- **Files modified:** 5

## Accomplishments
- Fixed Gemini 3 Pro model ID from `gemini-3-pro` to `gemini-3-pro-preview` across server config, client selector, and both validation schemas
- Enabled Standard mode in the mode selector (removed disabled state and Coming Soon badge)
- Made brainDump validation conditional: min 50 chars for fast mode only, empty allowed for standard mode
- Added required-question enforcement in StandardModeFlow (cannot advance past required questions without answering)
- Added non-blocking minimum-answer warning when fewer than 2 questions answered, with "Generate anyway" escape hatch
- Verified gap detection pipeline is correctly wired end-to-end (FAST-02 through FAST-05): brain dump -> analyze-gaps API -> gap detection engine (structured output) -> gap follow-ups UI -> skip or answer -> follow-up answers merged into generation prompt

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix Gemini 3 Pro model ID and enable Standard mode** - `2d47d50` (fix)
2. **Task 2: Fix validation schemas and standard mode UX** - `1c04f0e` (fix)
3. **Task 3: Verify gap detection pipeline** - No commit (verification-only, no files modified)

## Files Created/Modified
- `src/lib/ai/models.ts` - Changed model key/id from gemini-3-pro to gemini-3-pro-preview
- `src/lib/validation/generation.ts` - Conditional brainDump validation via .refine(), updated both modelId enums
- `src/components/generation/mode-selector.tsx` - Enabled Standard mode (disabled: false, badge: null)
- `src/components/generation/model-selector.tsx` - Updated model ID to gemini-3-pro-preview
- `src/components/generation/standard-mode-flow.tsx` - Required-question enforcement and minimum-answer warning

## Decisions Made
- Used `.refine()` on the GenerationRequestSchema object for conditional brainDump validation (safe because this validates API input, not Gemini structured output where .refine() is forbidden)
- Minimum-answer warning is non-blocking with "Generate anyway" escape hatch, preserving user autonomy per STND-02

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Both Fast and Standard modes are now selectable and functional
- Both Gemini 2.5 Flash and Gemini 3 Pro (preview) selectable with correct model IDs
- Gap detection pipeline verified end-to-end, ready for Phase 2 Plan 2 work
- Pre-existing lint warnings (unused imports in generate route and require-auth) exist from Phase 1 auth/credits bypass -- will be resolved in Phase 4

---
*Phase: 02-dual-mode-input-gap-detection*
*Completed: 2026-02-12*
