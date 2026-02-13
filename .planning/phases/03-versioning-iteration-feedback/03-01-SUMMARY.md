---
phase: 03-versioning-iteration-feedback
plan: 01
subsystem: ui
tags: [react, date-fns, react-diff-viewer-continued, firestore, timestamps, diff]

# Dependency graph
requires:
  - phase: 01-foundation-core-generation
    provides: version CRUD, Firestore subcollection model, project-view component
  - phase: 02-dual-mode-input-gap-detection
    provides: iteration flow with feedback input
provides:
  - Formatted relative timestamps in version list (date-fns formatDistanceToNow)
  - Word-level diff highlighting in compare view (react-diff-viewer-continued)
  - Version picker dropdown for flexible comparison target selection
  - State-based iteration refresh (no page reload)
  - Firestore Timestamp-to-ISO-string serialization in version APIs
affects: [04-auth-credits-consent, 05-export-polish-launch]

# Tech tracking
tech-stack:
  added: [react-diff-viewer-continued@4.1.2]
  patterns: [versionListKey state for triggering re-fetch, dynamic import with ssr:false for client-only components, Firestore Timestamp serialization in API layer]

key-files:
  created: []
  modified:
    - src/lib/db/versions.ts
    - src/app/api/projects/[projectId]/versions/route.ts
    - src/app/api/projects/[projectId]/versions/[versionId]/route.ts
    - src/components/version/version-list.tsx
    - src/components/version/version-compare.tsx
    - src/components/version/project-view.tsx

key-decisions:
  - "Used versionListKey state + React key prop for VersionList re-mount instead of callback-based refresh"
  - "Dynamic import for react-diff-viewer-continued with ssr:false to avoid hydration issues"
  - "Biome ignore for useExhaustiveDependencies on versionListKey (intentional re-fetch trigger)"
  - "Typed StoredVersion.createdAt as Timestamp | null for proper Firestore typing"

patterns-established:
  - "Firestore Timestamp serialization: Convert in API layer before sending to client, not in DB layer"
  - "Client-only heavy components: Use next/dynamic with ssr:false and loading fallback"
  - "State-based refresh: Use key prop + counter state to force re-mount and re-fetch"

# Metrics
duration: 4min
completed: 2026-02-12
---

# Phase 3 Plan 1: Version Management UI Enhancement Summary

**Timestamps with date-fns, word-level diff via react-diff-viewer-continued, version picker dropdown, and state-based iteration refresh replacing window.location.reload()**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-13T00:32:01Z
- **Completed:** 2026-02-13T00:36:21Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Version list now shows human-readable relative timestamps (e.g. "2 hours ago") next to each version
- Compare view renders word-level diffs with green/red highlighting using react-diff-viewer-continued
- Version picker dropdown lets users select any version for comparison (not hardcoded to initial)
- Iteration creates new version that appears in sidebar immediately without full page reload
- StoredVersion.createdAt properly typed as Firestore Timestamp instead of unknown

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix timestamp serialization and add formatted timestamps to version list** - `6efba0b` (feat)
2. **Task 2: Replace page reload with state-based refresh, add diff viewer and version picker** - `de8dcd2` (feat)

## Files Created/Modified
- `src/lib/db/versions.ts` - Typed createdAt as Timestamp | null, imported Timestamp from firebase-admin
- `src/app/api/projects/[projectId]/versions/route.ts` - Convert Firestore Timestamps to ISO strings in list API
- `src/app/api/projects/[projectId]/versions/[versionId]/route.ts` - Convert Firestore Timestamp to ISO string in single version API
- `src/components/version/version-list.tsx` - Added formatDistanceToNow display, typed createdAt as string | null
- `src/components/version/version-compare.tsx` - Replaced dual ReactMarkdown columns with ReactDiffViewer (dynamic import, word-level diff)
- `src/components/version/project-view.tsx` - State-based refresh, version picker, compare mode with dropdown
- `package.json` - Added react-diff-viewer-continued dependency
- `package-lock.json` - Lock file updated

## Decisions Made
- Used versionListKey counter + React key prop to trigger VersionList re-mount for refresh (simpler than callback-based approach, guarantees clean state)
- Dynamic import for react-diff-viewer-continued with ssr:false (class component not compatible with SSR)
- Added biome-ignore for useExhaustiveDependencies on versionListKey since it's an intentional re-fetch trigger
- Typed StoredVersion.createdAt as Timestamp | null (Biome auto-fixed to `type Timestamp` import)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Biome flagged versionListKey in useEffect dependencies as "more dependencies than necessary" since it's not used inside the effect body. Added biome-ignore comment since the dependency is intentional (triggers re-fetch on iteration complete).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All Phase 3 Plan 1 requirements met: timestamps, diff highlighting, version picker, state-based refresh
- Ready for 03-02 (remaining Phase 3 features if any)
- All existing functionality (view, iterate, prompt, rating) continues to work
- Build, lint, and all 36 tests pass

## Self-Check: PASSED

All 7 source/planning files verified present. Both task commits (6efba0b, de8dcd2) confirmed in git log.

---
*Phase: 03-versioning-iteration-feedback*
*Completed: 2026-02-12*
