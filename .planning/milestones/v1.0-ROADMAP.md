# Roadmap: FRD Generator

## Overview

This roadmap delivers an AI-powered web app that converts unstructured ideas into Claude Code-ready Functional Requirements Documents. The journey starts with a working "brain dump to FRD" pipeline (Phase 1), adds the dual-mode input differentiator and gap detection (Phase 2), builds out the full iteration and version history workflow (Phase 3), secures everything with Firebase Auth (Phase 4), and finishes with monetization, compliance, and production hardening (Phase 5). Auth is architecturally accommodated from Phase 1 but enforced in Phase 4, per the platform-infra dependency constraint.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation & Core Generation** - Brain dump to FRD pipeline with export, structured output, and responsive UI
- [x] **Phase 2: Dual-Mode Input & Gap Detection** - Fast mode gap detection, standard mode guided Q&A, and model tier selection
- [x] **Phase 3: Versioning, Iteration & Feedback** - Version history, FRD iteration workflow, version comparison, and rating system
- [x] **Phase 4: Authentication & Privacy** - Firebase Auth integration, server-side identity validation, data isolation, and prompt privacy
- [x] **Phase 5: Monetization, Compliance & Production Readiness** - Stripe credit system, 90-day data retention, observability, and rate limiting

## Phase Details

### Phase 1: Foundation & Core Generation
**Goal**: A user can go from a project name and brain dump to a generated FRD Markdown document, then copy or download it -- with streaming feedback, structured output, and a responsive layout.
**Depends on**: Nothing (first phase)
**Requirements**: PROJ-01, PROJ-02, FAST-01, GEN-01, GEN-02, GEN-04, GEN-05, GEN-06, EXPT-01, EXPT-02, VER-01, OBS-04
**Success Criteria** (what must be TRUE):
  1. User can create a new project by entering a name and see mode selection (Fast vs Standard) with descriptions
  2. User can type a freeform brain dump, submit it, and see a streaming progress indicator while the FRD generates
  3. Generated FRD is a well-structured Markdown document with consistent sections (enforced by Gemini structured output), and the system rejects or warns when input exceeds token/prompt size caps
  4. User can copy the FRD Markdown to clipboard with one click and download it as a .md file
  5. The app is mobile responsive with keyboard navigation and form labels, and each generation creates an immutable version record in the data store
**Plans**: 3 plans in 3 waves

Plans:
- [x] 01-01-PLAN.md -- Project bootstrap, tooling configuration, Firestore data layer, and validation schemas
- [x] 01-02-PLAN.md -- AI generation engine (FRD schema, prompt composer, Gemini structured output) and API route handlers
- [x] 01-03-PLAN.md -- Full UI (project creation, brain dump, generation flow, FRD display, export, responsiveness, accessibility)

### Phase 2: Dual-Mode Input & Gap Detection
**Goal**: Users can choose between two input modes -- Fast mode with AI-powered gap detection and targeted follow-ups, or Standard mode with guided Q&A -- and select their preferred Gemini model tier.
**Depends on**: Phase 1
**Requirements**: FAST-02, FAST-03, FAST-04, FAST-05, STND-01, STND-02, STND-03, GEN-03
**Success Criteria** (what must be TRUE):
  1. After submitting a brain dump, user sees a list of identified gaps (missing FRD sections) with targeted follow-up prompts, can answer or skip each, and the final FRD incorporates both the brain dump and follow-up answers
  2. User can select Standard mode and be guided through a structured sequence of questions covering FRD sections, skipping any question without breaking the flow, and generate an FRD from all collected answers
  3. User can toggle between Gemini 2.5 Flash (default) and Gemini 3 Pro before generation, with the selected model used for that generation
**Plans**: 2 plans in 2 waves

Plans:
- [x] 02-01-PLAN.md -- Fix critical bugs (model ID, validation schema) and enable Standard mode
- [x] 02-02-PLAN.md -- TDD tests for validation schemas, standard mode flow, and model selector

### Phase 3: Versioning, Iteration & Feedback
**Goal**: Users can iterate on generated FRDs with feedback, browse version history, compare versions, view the exact prompt used, and rate generation quality.
**Depends on**: Phase 2
**Requirements**: VER-02, VER-03, VER-04, VER-05, VER-06, RATE-01, RATE-02, RATE-03, AUTH-04
**Success Criteria** (what must be TRUE):
  1. User can view a timestamped list of all versions for a project and open any prior version to read its full content
  2. User can provide additional feedback on an existing version to generate an iteration, which creates a new version linked to its parent
  3. User can compare two versions side-by-side to see what changed across iterations
  4. After any generation completes, user can submit a half-star rating (0.5 to 5.0) and the rating is stored against that specific version
  5. User can view the exact composed prompt that was sent to Gemini for any version they own
**Plans**: 2 plans in 2 waves

Plans:
- [x] 03-01-PLAN.md -- Timestamp serialization, version list timestamps, diff-highlighted compare view, version picker, state-based iteration refresh
- [x] 03-02-PLAN.md -- TDD tests for validation schemas (rating, generation iteration) and version list API response shape

### Phase 4: Authentication & Privacy
**Goal**: Users securely access the app through Firebase Auth with server-side identity validation, complete data isolation between users, and guaranteed prompt privacy (no admin access to user prompts).
**Depends on**: Phase 3 (and platform-infra Firebase Auth availability)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-05, AUTH-06
**Success Criteria** (what must be TRUE):
  1. User can sign in via Firebase Auth (platform-infra integration) and all API requests validate identity server-side (not just client tokens)
  2. A user cannot see, access, or infer any other user's projects, versions, prompts, or ratings
  3. Prompt content (the exact text sent to Gemini) is visible only to the owning user -- no admin endpoints, no builder read paths expose it
  4. Prompt content is sanitized from all server logs, error messages, and analytics payloads (no prompt data appears in Cloud Logging)
**Plans**: 2 plans in 2 waves

Plans:
- [x] 04-01-PLAN.md -- Remove all auth bypasses across server requireAuth, client fetch hook, and page guards
- [x] 04-02-PLAN.md -- TDD tests for auth enforcement (401 on unauthenticated), token verification, and privacy audit

### Phase 5: Monetization, Compliance & Production Readiness
**Goal**: The app is production-ready with credit-based billing via Stripe, automated 90-day data retention, structured observability, rate limiting, and user consent for AI-generated content.
**Depends on**: Phase 4
**Requirements**: CRED-01, CRED-02, CRED-03, CRED-04, CRED-05, CRED-06, DATA-01, DATA-02, DATA-03, OBS-01, OBS-02, OBS-03
**Success Criteria** (what must be TRUE):
  1. User sees their credit balance and the cost (50 for initial, 25 for iteration) before generation; generation is blocked when credits are insufficient
  2. User can purchase credits via Stripe Checkout and see their balance update after successful payment
  3. All project data (projects, versions, prompts, ratings) is automatically deleted after 90 days with no orphaned subcollections remaining
  4. User sees and accepts terms/consent for AI-generated output and data retention before first use
  5. All key user actions are tracked via analytics events, structured logs include correlation IDs, and generation endpoints enforce rate limits that block abuse
**Plans**: 3 plans in 2 waves

Plans:
- [x] 05-01-PLAN.md -- Server-side credit charging activation, consent enforcement, refund on failure, webhook idempotency, retention batch chunking
- [x] 05-02-PLAN.md -- Client-side credit gating in GenerationFlow and IterationInput, 402/403 handling, credit cost display
- [x] 05-03-PLAN.md -- Comprehensive tests for credits, webhook idempotency, retention chunking, consent, and client credit gating

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Core Generation | 3/3 | Complete | 2026-02-12 |
| 2. Dual-Mode Input & Gap Detection | 2/2 | Complete | 2026-02-12 |
| 3. Versioning, Iteration & Feedback | 2/2 | Complete | 2026-02-12 |
| 4. Authentication & Privacy | 2/2 | Complete | 2026-02-12 |
| 5. Monetization, Compliance & Production Readiness | 3/3 | Complete | 2026-02-12 |
