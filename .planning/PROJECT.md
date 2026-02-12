# FRD Generator

## What This Is

A web app that helps users go from a rough idea to a complete, high-quality Functional Requirements Document (FRD) in minutes. It offers two modes — a fast brain dump with gap detection, and a guided Q&A — then uses Gemini to generate a Markdown FRD specifically structured for consumption by Claude Code. It's one of several apps on dan-weinbeck.com, built as a separate service with shared auth infrastructure.

## Core Value

A user can go from an unstructured idea to a Claude Code-ready FRD in under 10 minutes, with the LLM filling gaps and enforcing completeness.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] User can create a project session by entering a project name
- [ ] User can select between Fast mode (brain dump + gap detection) and Standard mode (guided Q&A)
- [ ] Fast mode: user submits freeform brain dump, system identifies missing FRD sections, presents targeted follow-up prompts
- [ ] Standard mode: system guides user through structured questions to collect essential FRD inputs, user can skip any section
- [ ] System generates a Markdown FRD using the proven template structure, optimized for Claude Code consumption
- [ ] User can iterate on the FRD with additional input; each iteration creates a new immutable version
- [ ] User can view prior versions and compare them (at minimum: list + open)
- [ ] Credits enforcement: 50 credits for initial generation, 25 credits per iteration
- [ ] Credit balance fetched via Stripe-backed integration; charges recorded with metadata
- [ ] User can copy FRD Markdown to clipboard
- [ ] User can download FRD Markdown as a file
- [ ] After generation, user can submit a half-star rating ("How well did the generator help you produce an FRD?")
- [ ] System records the exact composed prompt sent to Gemini per version, visible only to the end user (not builder/admin)
- [ ] User selects Gemini model tier: Gemini 2.5 Flash (inexpensive) or Gemini 3 Pro (premium)
- [ ] Auth integration with dan-weinbeck.com platform-infra (Firebase Auth)
- [ ] Server-side identity validation — do not trust client-only identifiers
- [ ] Rate limiting and abuse protection on generation endpoints
- [ ] User-only prompt visibility enforced by design (application-level access controls)
- [ ] 90-day data retention with automated deletion of all project artifacts
- [ ] Structured logging with correlation IDs for key actions and errors
- [ ] Analytics event tracking for all key user actions (project creation, mode selection, generation, rating, export, etc.)
- [ ] Clear loading states during generation; app remains responsive
- [ ] Token/prompt size caps with user feedback when limits exceeded
- [ ] Per-run spend caps / token limits per model tier
- [ ] Mobile responsive; basic accessibility (keyboard navigation, labels)
- [ ] Basic terms/consent for AI-generated output and data retention

### Out of Scope

- PRD generation / market research / competitive analysis — not the tool's purpose; FRDs only
- Technical architecture / low-level design generation — FRD scope only
- PM tooling (roadmaps, sprints, tickets) — use dedicated PM tools
- Multi-user collaboration (comments, approvals) — single-user workflow for v1
- Deep domain compliance (HIPAA/SOX) — compliance-lite only
- Template marketplace / fully custom templates — one proven template
- Real-time chat — not relevant to FRD generation workflow
- Mobile native app — web-first

## Context

- **Existing platform**: dan-weinbeck.com is a live Next.js 16 site on GCP Cloud Run with Firebase ecosystem (Auth, Firestore). Auth is being finalized in the platform-infra repo and will be ready shortly.
- **Proven patterns**: The dave-ramsey/Digital Envelopes app (same platform) establishes patterns for Firestore data modeling, server-side-only Admin SDK access, Zod validation, compute-on-read, and API route architecture. This project follows those same patterns.
- **FRD template**: A proven FRD template already exists and produces good results when fed into Claude Code. The LLM fills the template — it doesn't need to invent structure.
- **LLM integration**: Gemini is already integrated in the personal-brand site via Vercel AI SDK. Same pattern applies here.
- **Privacy priority**: Users' product ideas and prompts must never be visible to the builder/admin. This is a trust requirement — users won't share real ideas if they think someone is reading them.

## Constraints

- **Tech stack**: Next.js 16 / React 19 / Firestore / Tailwind CSS v4 / TypeScript 5 / Biome / Vitest — must match dan-weinbeck.com patterns
- **LLM**: Gemini 2.5 Flash (default/inexpensive) and Gemini 3 Pro (premium) via Vercel AI SDK
- **Hosting**: GCP Cloud Run (Docker), matching existing deployment pipeline
- **Auth dependency**: Firebase Auth via platform-infra; auth integration deferred to later phase but architecture must accommodate it from the start
- **Billing dependency**: Stripe credit system; integration deferred but data model must support it
- **Privacy**: User prompt data must be user-only accessible at the application layer — no admin endpoints or logging that expose prompt content
- **Data retention**: 90-day automatic deletion of all user data (projects, versions, prompts, ratings)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Separate repo/service from personal-brand | Each app is independently deployable; keeps repos focused | — Pending |
| Firestore with server-side Admin SDK only | Matches established pattern; deny-all client rules for security | — Pending |
| Gemini 2.5 Flash as default model | Cost-effective for most users; Pro available for those who want higher quality | — Pending |
| Auth deferred to later phase | Platform-infra dependency; core FRD generation can be built and tested independently | — Pending |
| User-only prompt visibility via application-level controls | Server API routes only return prompt data to authenticated owner; no admin read paths | — Pending |
| Proven FRD template (not user-customizable) | One template that works well with Claude Code; avoids template management complexity | — Pending |

---
*Last updated: 2026-02-11 after initialization*
