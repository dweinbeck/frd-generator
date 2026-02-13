# Phase 3: Versioning, Iteration & Feedback - Research

**Researched:** 2026-02-12
**Domain:** Version management, text diffing, iteration workflows, rating UX
**Confidence:** HIGH

## Summary

Phase 3 builds the full version lifecycle: browsing version history with timestamps, iterating on FRDs via feedback, comparing versions side-by-side with actual diff highlighting, rating generations, and viewing the composed prompt. The critical finding is that **most of the backend infrastructure and UI components already exist** from Phases 1-2. The version list, iteration input, rating widget, version compare, and project view components are all already implemented. The API routes for listing versions, fetching individual versions, and submitting ratings are complete. The `composedPrompt` field is already stored and returned.

What remains is primarily **wiring, polish, and enhancement** work: adding timestamps to the version list display, enhancing the compare view with actual text diff highlighting (currently just side-by-side markdown rendering), improving the compare UX to allow selecting which two versions to compare, ensuring the iteration flow properly refreshes state instead of using `window.location.reload()`, and adding tests. The `react-diff-viewer-continued` library (v4.1.0+) supports React 19 and provides proper split-view diff highlighting out of the box.

**Primary recommendation:** Focus on enhancing existing components rather than rebuilding. The main new work is: (1) add `react-diff-viewer-continued` for real diff highlighting in compare view, (2) add formatted timestamps using `date-fns` (already installed), (3) fix the version compare UX to allow selecting any two versions, (4) replace `window.location.reload()` with proper state management after iteration, and (5) add comprehensive tests.

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `react` | 19.2.3 | UI framework | Already in project |
| `next` | 16.1.6 | App framework, routing, API routes | Already in project |
| `firebase-admin` | 13.6.1 | Firestore backend | Already in project |
| `date-fns` | 4.1.0 | Date formatting (`formatDistanceToNow`, `format`) | Already in project, tree-shakeable |
| `react-markdown` | 10.1.0 | Markdown rendering for FRD display | Already in project |
| `remark-gfm` | 4.0.1 | GitHub Flavored Markdown support | Already in project |
| `lucide-react` | 0.563.0 | Icons (Star, GitBranch, Clock, Eye, etc.) | Already in project |
| `clsx` | 2.1.1 | Conditional CSS classes | Already in project |
| `zod` | 4.3.6 | Request validation (via `zod/v4` import) | Already in project |

### New Dependencies
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `react-diff-viewer-continued` | ^4.1.2 | Side-by-side and unified text diff view | Version compare feature (VER-06) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `react-diff-viewer-continued` | Custom diff with `diff` npm package | More control but significant UI work for split view, line highlighting, word diff |
| `react-diff-viewer-continued` | Current side-by-side markdown render | No actual diff highlighting -- user has to visually scan for differences |
| `react-diff-viewer-continued` | `@alexbruf/react-diff-viewer` (3.1.5) | Also supports React 19, but less actively maintained |

**Installation:**
```bash
npm install react-diff-viewer-continued
```

## Architecture Patterns

### Existing Project Structure (Relevant Files)
```
src/
├── app/
│   ├── api/
│   │   ├── projects/
│   │   │   ├── route.ts                         # POST create project
│   │   │   └── [projectId]/
│   │   │       ├── route.ts                     # GET project + latest version
│   │   │       └── versions/
│   │   │           ├── route.ts                 # GET all versions (list)
│   │   │           └── [versionId]/
│   │   │               ├── route.ts             # GET single version
│   │   │               └── rating/
│   │   │                   └── route.ts         # POST rating
│   │   └── generate/
│   │       └── route.ts                         # POST generate FRD (initial + iteration)
│   └── projects/
│       └── [projectId]/
│           └── page.tsx                         # Project page (generation or project view)
├── components/
│   ├── generation/
│   │   ├── frd-display.tsx                      # Markdown display with copy/download
│   │   ├── generation-flow.tsx                  # Initial generation flow
│   │   └── generation-progress.tsx              # Loading indicator
│   └── version/
│       ├── iteration-input.tsx                  # Feedback textarea + submit
│       ├── project-view.tsx                     # Main version view with tabs
│       ├── rating-widget.tsx                    # Half-star rating (0.5-5.0)
│       ├── version-compare.tsx                  # Side-by-side view (NEEDS ENHANCEMENT)
│       └── version-list.tsx                     # Version history sidebar (NEEDS TIMESTAMPS)
├── hooks/
│   └── use-authed-fetch.ts                      # Auth-wrapped fetch
├── lib/
│   ├── ai/
│   │   ├── prompt-composer.ts                   # Handles iteration prompt composition
│   │   └── generation-engine.ts                 # AI generation
│   ├── db/
│   │   ├── projects.ts                          # CRUD + ownership check
│   │   └── versions.ts                          # save, get, getAll, getLatest, updateRating
│   └── validation/
│       ├── generation.ts                        # GenerationRequestSchema, RatingSchema
│       └── project.ts                           # CreateProjectSchema
└── types/
    └── index.ts                                 # Project, Version, GenerationInput types
```

### Pattern 1: Existing Version Data Flow
**What:** The version lifecycle is already wired end-to-end.
**How it works:**
1. `POST /api/generate` creates versions with `parentVersionId` and `composedPrompt`
2. `GET /api/projects/[id]/versions` returns all versions (composedPrompt stripped from list)
3. `GET /api/projects/[id]/versions/[vid]` returns full version including `composedPrompt`
4. `POST /api/projects/[id]/versions/[vid]/rating` saves rating
5. `ProjectView` component orchestrates view/iterate/compare/prompt modes

### Pattern 2: Iteration Flow (Already Implemented)
**What:** User provides feedback on an existing version, system generates new version linked to parent.
**How it works:**
1. `IterationInput` sends `parentVersionId` + `iterationFeedback` to `/api/generate`
2. `generate/route.ts` fetches parent version content, passes to prompt composer
3. `prompt-composer.ts` detects iteration mode and builds revision prompt
4. New version saved with `parentVersionId` field linking to parent
5. Project `versionCount` incremented, `latestVersionId` updated

### Pattern 3: State Management in ProjectView
**What:** `ProjectView` manages view modes (view/iterate/compare/prompt) via local state.
**Current issue:** After iteration completes, it calls `window.location.reload()` instead of updating state.
**Fix pattern:** After iteration, fetch the new version data and update state directly, then re-fetch the version list.

### Anti-Patterns to Avoid
- **Full page reload after state change:** The current `window.location.reload()` in `handleIterationComplete` should be replaced with state-based updates
- **Hardcoded compare target:** The current compare button always compares against `initialVersionId` instead of letting the user pick
- **Missing timestamp display:** Version list shows version number and model but no human-readable timestamp
- **Type `unknown` for createdAt:** The `StoredVersion` type uses `createdAt: unknown` which forces unsafe type assertions downstream

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Text diff with highlighting | Custom character/line diff renderer | `react-diff-viewer-continued` | Split view, word diff, line numbers, performance optimization all handled |
| Relative time display | Custom "X minutes ago" logic | `date-fns` `formatDistanceToNow` | Handles all edge cases, i18n-ready, already in project |
| Half-star rating | Custom SVG star rendering from scratch | Current `rating-widget.tsx` pattern | Already implemented with half-star hit areas; just needs minor polish |
| Version parent chain traversal | Recursive parent fetching | Single `getAllVersions` query with `parentVersionId` field | All versions are flat in subcollection, parent link is just a field |

**Key insight:** The existing codebase already handles 80%+ of Phase 3 requirements. The risk is over-building what already works rather than surgically enhancing the gaps.

## Common Pitfalls

### Pitfall 1: Firestore Timestamp Serialization
**What goes wrong:** `FieldValue.serverTimestamp()` returns a Firestore Timestamp object, not a JS Date. When serialized to JSON in API responses, it becomes `{_seconds: N, _nanoseconds: N}` instead of an ISO string.
**Why it happens:** The existing `StoredVersion` type uses `createdAt: unknown`, hiding the issue. The versions API returns raw Firestore data without converting timestamps.
**How to avoid:** Convert `createdAt` to ISO string in the API response: `createdAt: doc.data().createdAt?.toDate()?.toISOString()`. Update the `VersionSummary` interface in `version-list.tsx` to use `createdAt: string`.
**Warning signs:** Timestamps displaying as `[object Object]` or `NaN` in the UI.

### Pitfall 2: Compare Version Selection UX
**What goes wrong:** User can only compare the current version against the initial version (hardcoded `initialVersionId`).
**Why it happens:** The compare button in `ProjectView` calls `handleCompare(initialVersionId)` directly instead of offering a version picker.
**How to avoid:** Add a version selector dropdown within compare mode that lets the user pick which version to compare against the currently active version.
**Warning signs:** Users can only see diffs against v1, not between any two arbitrary versions.

### Pitfall 3: State Staleness After Iteration
**What goes wrong:** After generating a new iteration, the version list in the sidebar doesn't update, and the user sees stale data.
**Why it happens:** `window.location.reload()` is a blunt fix. If replaced with state updates but the version list isn't re-fetched, it becomes stale.
**How to avoid:** Use a refresh key/counter pattern: increment a `refreshKey` state variable after iteration completes, pass it as a dependency to the `VersionList` component's `useEffect`.
**Warning signs:** New version doesn't appear in sidebar until manual refresh.

### Pitfall 4: Rating Not Showing After Generation
**What goes wrong:** After initial generation, the `ProjectView` renders without the rating widget because the page flow transitions from `GenerationFlow` to `ProjectView` via page reload.
**Why it happens:** The `GenerationFlow` component shows the FRD result but doesn't include the rating widget. The `ProjectView` does include it but only after the project page is revisited.
**How to avoid:** Ensure that after generation completes (both initial and iteration), the rating widget is shown immediately. For initial generation, transition to `ProjectView` mode. For iteration, update the `ProjectView` state to show the new version with the rating widget.
**Warning signs:** User generates FRD and has no way to rate it until they navigate away and back.

### Pitfall 5: Diff Viewer SSR Issues
**What goes wrong:** `react-diff-viewer-continued` may fail during server-side rendering since it relies on DOM APIs.
**Why it happens:** Next.js renders components server-side by default in the App Router.
**How to avoid:** The `version-compare.tsx` component already has `"use client"` directive. Ensure the diff viewer import uses dynamic import with `ssr: false` if SSR issues occur:
```tsx
import dynamic from 'next/dynamic';
const ReactDiffViewer = dynamic(() => import('react-diff-viewer-continued'), { ssr: false });
```
**Warning signs:** Hydration mismatch errors or `window is not defined` errors.

### Pitfall 6: Large FRD Diff Performance
**What goes wrong:** Very large FRDs (5000+ lines) can cause the diff viewer to freeze.
**Why it happens:** Diff algorithms are O(n*m) in the worst case.
**How to avoid:** `react-diff-viewer-continued` supports `infiniteLoading` prop for virtualization. Enable it for large documents. Also consider setting a reasonable `maxEditLength` to abort extremely long diffs.
**Warning signs:** Compare view freezes for 5+ seconds when viewing diffs of large documents.

## Code Examples

### Timestamp Display in Version List
```typescript
// Using date-fns formatDistanceToNow (already installed as date-fns@4.1.0)
import { formatDistanceToNow } from "date-fns";

// In VersionList component, after fetching versions
function formatTimestamp(createdAt: string): string {
  return formatDistanceToNow(new Date(createdAt), { addSuffix: true });
}

// Display: "2 hours ago", "3 days ago", etc.
<span className="text-xs text-gray-400">
  {formatTimestamp(v.createdAt)}
</span>
```

### Enhanced Version Compare with Diff Viewer
```tsx
"use client";

import ReactDiffViewer, { DiffMethod } from "react-diff-viewer-continued";

interface VersionCompareProps {
  leftMarkdown: string;
  rightMarkdown: string;
  leftLabel: string;
  rightLabel: string;
}

export function VersionCompare({
  leftMarkdown,
  rightMarkdown,
  leftLabel,
  rightLabel,
}: VersionCompareProps) {
  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden">
      <div className="flex justify-between bg-gray-50 px-4 py-2 border-b text-sm font-medium text-gray-700">
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>
      <ReactDiffViewer
        oldValue={leftMarkdown}
        newValue={rightMarkdown}
        splitView={true}
        compareMethod={DiffMethod.WORDS}
        useDarkTheme={false}
      />
    </div>
  );
}
```

### Refresh Key Pattern for Version List Update
```tsx
// In ProjectView component
const [versionListKey, setVersionListKey] = useState(0);

function handleIterationComplete(newMarkdown: string, newVersionId: string) {
  setActiveVersionId(newVersionId);
  setMarkdown(newMarkdown);
  setRating(undefined);
  setViewMode("view");
  // Trigger version list re-fetch by changing key
  setVersionListKey((prev) => prev + 1);
}

// In JSX
<VersionList
  key={versionListKey}
  projectId={projectId}
  activeVersionId={activeVersionId}
  onSelect={handleVersionSelect}
/>
```

### Version Selector for Compare Mode
```tsx
// Add version picker to compare mode in ProjectView
const [versions, setVersions] = useState<VersionSummary[]>([]);
const [compareTargetId, setCompareTargetId] = useState<string>("");

// Fetch versions for the picker
useEffect(() => {
  async function fetchVersions() {
    const res = await authedFetch(`/api/projects/${projectId}/versions`);
    if (res.ok) {
      const data = await res.json();
      setVersions(data.versions);
    }
  }
  fetchVersions();
}, [projectId, authedFetch, versionListKey]);

// In compare view
<select
  value={compareTargetId}
  onChange={(e) => handleCompare(e.target.value)}
  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
>
  <option value="">Select version to compare...</option>
  {versions
    .filter((v) => v.id !== activeVersionId)
    .map((v) => (
      <option key={v.id} value={v.id}>v{v.versionNumber}</option>
    ))}
</select>
```

### API Response Timestamp Conversion
```typescript
// In versions API route - convert Firestore timestamps to ISO strings
const versions = await getAllVersions(projectId);
const sanitized = versions.map(({ composedPrompt: _prompt, createdAt, ...rest }) => ({
  ...rest,
  createdAt: createdAt && typeof createdAt === "object" && "toDate" in createdAt
    ? (createdAt as { toDate(): Date }).toDate().toISOString()
    : createdAt,
}));
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `react-diff-viewer` (unmaintained) | `react-diff-viewer-continued` v4.1.x | Feb 2026 (v4.1.0) | React 19 support, active maintenance |
| Class components for diff | Functional components + hooks | v4.x | Aligns with project's React 19 patterns |
| `@types/diff` for TS types | `diff` v8+ ships built-in types | 2025 | No separate @types package needed |

**Deprecated/outdated:**
- `react-diff-viewer` (original): Last published 6 years ago, does not support React 18 or 19
- `@types/diff`: No longer needed with `diff` v8+

## Existing Code Inventory (What Already Works)

This is critical for the planner. Below is an audit of each requirement against existing code.

### VER-02: Version list with timestamps
| What | Status | File |
|------|--------|------|
| API: GET all versions | DONE | `src/app/api/projects/[projectId]/versions/route.ts` |
| DB: getAllVersions query | DONE | `src/lib/db/versions.ts` |
| UI: Version list component | DONE (needs timestamps) | `src/components/version/version-list.tsx` |
| **Gap:** Timestamps not displayed | NEEDS WORK | Add `formatDistanceToNow` display |
| **Gap:** Timestamp may not serialize correctly | NEEDS VERIFICATION | Check Firestore timestamp JSON serialization |

### VER-03: Open and read any prior version
| What | Status | File |
|------|--------|------|
| API: GET single version | DONE | `src/app/api/projects/[projectId]/versions/[versionId]/route.ts` |
| DB: getVersion query | DONE | `src/lib/db/versions.ts` |
| UI: Version selection + display | DONE | `src/components/version/project-view.tsx` (`handleVersionSelect`) |
| UI: FRD display | DONE | `src/components/generation/frd-display.tsx` |

### VER-04: Provide feedback to iterate
| What | Status | File |
|------|--------|------|
| UI: Iteration feedback form | DONE | `src/components/version/iteration-input.tsx` |
| API: Generate with iteration | DONE | `src/app/api/generate/route.ts` (lines 44-90) |
| AI: Iteration prompt composition | DONE | `src/lib/ai/prompt-composer.ts` (lines 11-19) |
| Validation: parentVersionId + iterationFeedback | DONE | `src/lib/validation/generation.ts` |

### VER-05: New version linked to parent
| What | Status | File |
|------|--------|------|
| DB: parentVersionId field | DONE | `src/lib/db/versions.ts` (VersionData interface) |
| DB: Save with parentVersionId | DONE | `src/app/api/generate/route.ts` (line 120) |
| UI: Parent indicator in list | DONE | `src/components/version/version-list.tsx` (GitBranch icon) |
| **Gap:** State refresh after iteration | NEEDS FIX | Replace `window.location.reload()` |

### VER-06: Compare versions side-by-side
| What | Status | File |
|------|--------|------|
| UI: Compare view layout | DONE (basic) | `src/components/version/version-compare.tsx` |
| **Gap:** No diff highlighting | NEEDS ENHANCEMENT | Add `react-diff-viewer-continued` |
| **Gap:** Can only compare against initial version | NEEDS FIX | Add version picker for compare target |
| **Gap:** No compare mode button UX | PARTIAL | Button exists but compare target is hardcoded |

### RATE-01: Half-star rating (0.5 to 5.0)
| What | Status | File |
|------|--------|------|
| UI: Rating widget with half-star support | DONE | `src/components/version/rating-widget.tsx` |
| API: POST rating | DONE | `src/app/api/projects/[projectId]/versions/[versionId]/rating/route.ts` |
| DB: updateVersionRating | DONE | `src/lib/db/versions.ts` |
| Validation: RatingSchema (0.5-5.0, 0.5 step) | DONE | `src/lib/validation/generation.ts` |

### RATE-02: Rating prompt text
| What | Status | File |
|------|--------|------|
| UI: "How well did the generator help you produce an FRD?" | DONE | `src/components/version/rating-widget.tsx` (line 45) |

### RATE-03: Rating stored against specific version
| What | Status | File |
|------|--------|------|
| DB: rating field on version document | DONE | `src/lib/db/versions.ts` (StoredVersion) |
| API: Rating by project+version IDs | DONE | Rating route uses `[projectId]/versions/[versionId]/rating` |

### AUTH-04: Record composed prompt per version
| What | Status | File |
|------|--------|------|
| AI: Compose prompt before generation | DONE | `src/app/api/generate/route.ts` (line 105) |
| DB: composedPrompt field saved | DONE | `src/app/api/generate/route.ts` (line 121) |
| API: composedPrompt returned on single version GET | DONE | Version detail route returns full data |
| API: composedPrompt stripped from list | DONE | Versions list route strips it (line 22) |
| UI: Prompt view mode | DONE | `src/components/version/project-view.tsx` (prompt view) |

## Open Questions

1. **Firestore timestamp serialization status**
   - What we know: `createdAt` is stored via `FieldValue.serverTimestamp()` and typed as `unknown` in `StoredVersion`
   - What's unclear: Whether the current API responses serialize timestamps correctly for the frontend, or if they come through as raw Firestore Timestamp objects
   - Recommendation: Verify by testing the GET versions endpoint. If timestamps are not ISO strings, add conversion in the API response layer. This should be the first task in the plan.

2. **Test coverage expectations**
   - What we know: Phase 2 ended with plan 02-02 focused on TDD tests, but no test files exist in `src/`
   - What's unclear: Whether those tests were written and deleted, or never created
   - Recommendation: Include comprehensive test tasks in the plan covering: validation schemas, API routes (mock Firestore), component rendering

3. **Generation flow -> ProjectView transition**
   - What we know: After initial generation via `GenerationFlow`, the "Generate Another" button resets state but doesn't transition to `ProjectView`
   - What's unclear: Whether the page reloads automatically after initial generation to show `ProjectView`
   - Recommendation: Verify the transition behavior. The `ProjectPage` conditionally renders `GenerationFlow` vs `ProjectView` based on `hasExistingFRD`, so a re-fetch of project data after generation would naturally switch to `ProjectView`.

## Sources

### Primary (HIGH confidence)
- Codebase inspection: `src/lib/db/versions.ts` - Version data model and queries
- Codebase inspection: `src/app/api/generate/route.ts` - Full generation + iteration pipeline
- Codebase inspection: `src/components/version/*.tsx` - All version UI components
- Codebase inspection: `src/lib/ai/prompt-composer.ts` - Iteration prompt handling
- Codebase inspection: `src/lib/validation/generation.ts` - Request validation with RatingSchema
- GitHub Issue #63 (Aeolun/react-diff-viewer-continued) - React 19 support confirmed in v4.1.0

### Secondary (MEDIUM confidence)
- npm: `react-diff-viewer-continued` v4.1.2 - Latest version with React 19 support
- npm: `diff` v8.0.3 - Underlying diff library (used internally by react-diff-viewer-continued)
- date-fns official docs: `formatDistanceToNow` API

### Tertiary (LOW confidence)
- None. All findings verified against codebase or official sources.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed except `react-diff-viewer-continued` which was verified for React 19 compat
- Architecture: HIGH - Full codebase inspection of every relevant file
- Pitfalls: HIGH - Derived from actual code issues found during inspection (window.location.reload, hardcoded compare, missing timestamps)
- Existing code inventory: HIGH - Line-by-line audit of every requirement against source files

**Research date:** 2026-02-12
**Valid until:** 2026-03-12 (stable domain, existing codebase is primary source)
