# FRD Generator

## What This Is

A web app that helps users go from a rough idea to a complete, high-quality Functional Requirements Document (FRD) in minutes. It offers two modes — a fast brain dump with gap detection, and a guided Q&A — then uses Gemini to generate a Markdown FRD specifically structured for consumption by Claude Code. It's one of several apps on dan-weinbeck.com, built as a separate service with shared auth infrastructure.

## Core Value

A user can go from an unstructured idea to a Claude Code-ready FRD in under 10 minutes, with the LLM filling gaps and enforcing completeness.

## Requirements

### Validated

- ✓ User can create a project session by entering a project name — v1.0
- ✓ User can select between Fast mode (brain dump + gap detection) and Standard mode (guided Q&A) — v1.0
- ✓ Fast mode: user submits freeform brain dump, system identifies missing FRD sections, presents targeted follow-up prompts — v1.0
- ✓ Standard mode: system guides user through structured questions to collect essential FRD inputs, user can skip any section — v1.0
- ✓ System generates a Markdown FRD using the proven template structure, optimized for Claude Code consumption — v1.0
- ✓ User can iterate on the FRD with additional input; each iteration creates a new immutable version — v1.0
- ✓ User can view prior versions and compare them (side-by-side diff with word-level highlighting) — v1.0
- ✓ Credits enforcement: 50 credits for initial generation, 25 credits per iteration — v1.0
- ✓ Credit balance fetched via Stripe-backed integration; charges recorded with metadata — v1.0
- ✓ User can copy FRD Markdown to clipboard — v1.0
- ✓ User can download FRD Markdown as a file — v1.0
- ✓ After generation, user can submit a half-star rating (0.5 to 5.0) — v1.0
- ✓ System records the exact composed prompt sent to Gemini per version, visible only to the end user — v1.0
- ✓ User selects Gemini model tier: Gemini 2.5 Flash (inexpensive) or Gemini 3 Pro (premium) — v1.0
- ✓ Auth integration with dan-weinbeck.com platform-infra (Firebase Auth) — v1.0
- ✓ Server-side identity validation on every API request — v1.0
- ✓ Rate limiting and abuse protection on generation endpoints — v1.0
- ✓ User-only prompt visibility enforced by design (application-level access controls) — v1.0
- ✓ 90-day data retention with automated deletion of all project artifacts — v1.0
- ✓ Structured logging with correlation IDs for key actions and errors — v1.0
- ✓ Analytics event tracking for all key user actions — v1.0
- ✓ Clear loading states during generation; app remains responsive — v1.0
- ✓ Token/prompt size caps with user feedback when limits exceeded — v1.0
- ✓ Mobile responsive; basic accessibility (keyboard navigation, labels) — v1.0
- ✓ Basic terms/consent for AI-generated output and data retention — v1.0

### Active

(None — next milestone requirements TBD via `/gsd:new-milestone`)

### Out of Scope

- PRD generation / market research / competitive analysis — not the tool's purpose; FRDs only
- Technical architecture / low-level design generation — FRD scope only
- PM tooling (roadmaps, sprints, tickets) — use dedicated PM tools
- Multi-user collaboration (comments, approvals) — single-user workflow
- Deep domain compliance (HIPAA/SOX) — compliance-lite only
- Template marketplace / fully custom templates — one proven template
- Real-time chat — not relevant to FRD generation workflow
- Mobile native app — web-first

## Context

- **Current state**: v1.0 shipped (2026-02-13). 4,376 LOC TypeScript, 2,324 LOC tests (112 tests), 58 commits across 5 phases.
- **Existing platform**: dan-weinbeck.com is a live Next.js 16 site on GCP Cloud Run with Firebase ecosystem (Auth, Firestore).
- **Proven patterns**: Firestore subcollection model (projects/{id}/versions/{id}), server-side-only Admin SDK, Zod validation, API route architecture — all established and working.
- **FRD template**: One proven template produces good results when fed into Claude Code. Not user-customizable.
- **LLM integration**: Gemini via AI SDK 6 with `Output.object()` structured output. Two tiers: Flash (default) and Pro (premium).
- **Privacy**: User prompt data is user-only accessible. Logger sanitizes sensitive fields. No admin read paths.
- **Known tech debt**: In-memory rate limiting, cron Bearer token auth, no client retry on 5xx, one stale TODO.

## Constraints

- **Tech stack**: Next.js 16 / React 19 / Firestore / Tailwind CSS v4 / TypeScript 5 / Biome / Vitest
- **LLM**: Gemini 2.5 Flash (default) and Gemini 3 Pro (premium) via AI SDK 6
- **Hosting**: GCP Cloud Run (Docker)
- **Auth**: Firebase Auth via platform-infra (fully integrated)
- **Billing**: Stripe credit system (fully integrated)
- **Privacy**: User prompt data must be user-only accessible — no admin endpoints or logging that expose prompt content
- **Data retention**: 90-day automatic deletion of all user data

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Separate repo/service from personal-brand | Each app is independently deployable; keeps repos focused | ✓ Good — clean separation, independent dev/deploy |
| Firestore with server-side Admin SDK only | Matches established pattern; deny-all client rules for security | ✓ Good — subcollection model works well, data isolation clean |
| Gemini 2.5 Flash as default model | Cost-effective for most users; Pro available for higher quality | ✓ Good — model selector in UI, easy tier switching |
| Auth deferred to Phase 4 | Platform-infra dependency; core generation built/tested independently | ✓ Good — 3-layer bypass pattern made re-enablement trivial |
| User-only prompt visibility via application-level controls | Server routes only return prompt data to authenticated owner | ✓ Good — composedPrompt stripped from lists, owner-only on GET |
| Proven FRD template (not user-customizable) | One template that works well with Claude Code | ✓ Good — consistent output, no template management complexity |
| AI SDK 6 structured output via Output.object() | Guarantees consistent FRD format across all generations | ✓ Good — Zod schema enforced, no format drift |
| Firestore transactions for credit operations | Prevents race conditions on balance checks | ✓ Good — atomic charge/refund, metadata tracking |
| In-memory rate limiting for MVP | Simple, no external dependency | ⚠️ Revisit — resets on restart, swap for Redis at scale |
| BATCH_LIMIT=499 for retention deletes | Leave room for project doc in final Firestore batch | ✓ Good — tested with 600-doc chunking |

## v2 Backlog (from v1.0 Audit)

Tech debt items identified during v1.0 milestone audit. Non-blocking, tracked for future work.

- **Persistent rate limiting** — In-memory sliding window resets on server restart; swap for Redis
- **Cron IAM auth** — Bearer token works but Cloud Scheduler IAM service account is tighter
- **Client retry logic** — No retry on 5xx errors; acceptable for MVP, improve for scale
- **Stale TODO cleanup** — One outdated TODO in `src/lib/db/projects.ts:7`

---
*Last updated: 2026-02-13 after v1.0 milestone completion*
