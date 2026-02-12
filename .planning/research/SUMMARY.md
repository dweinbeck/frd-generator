# Project Research Summary

**Project:** FRD Generator
**Domain:** AI-powered document generation (Functional Requirements Documents)
**Researched:** 2026-02-11
**Confidence:** HIGH

## Executive Summary

The FRD Generator is an AI-powered web application that converts unstructured product ideas into structured Functional Requirements Documents optimized for Claude Code consumption. Research confirms that this is a viable niche — existing tools generate generic PRDs for human stakeholders, but no tool specifically targets AI coding assistants as the downstream consumer. The recommended approach uses a dual-mode input strategy: fast mode (brain dump with AI gap detection) for users who know what they want, and standard mode (guided Q&A) for users who need more structure. Both modes feed into a unified prompt composition layer that leverages Gemini's structured output to guarantee consistent FRD format across iterations.

The technical foundation is Next.js 16 with React 19, Firebase (Auth + Firestore), Vercel AI SDK 6 with Gemini 2.5 Flash as the default model, and a credit-based billing system via Stripe. The architecture centers on server-side prompt composition, streaming generation with persistence-backed recovery, and subcollection-based Firestore data modeling to avoid the 1 MiB document size limit. The most critical architectural decision is using Gemini's structured output enforcement from day one — without this, output format inconsistency across iterations will destroy the iteration workflow and erode user trust.

Key risks include context window degradation during iteration (mitigated by section-level updates and context caching), runaway token costs (mitigated by hard maxOutputTokens caps and Flash-first model selection), and prompt data leakage through logs and error messages (mitigated by sanitization at the API boundary). The research identifies 9 critical pitfalls that must be addressed during specific roadmap phases — particularly inconsistent LLM output structure (Phase 1), TTL-based deletion not cascading to subcollections (Phase 3), and hallucinated requirements without provenance tracking (Phase 1 schema, Phase 2 UI).

## Key Findings

### Recommended Stack

The stack is locked to match the existing dan-weinbeck.com platform: Next.js 16 (with Turbopack default), React 19.2, TypeScript 5.9, Tailwind CSS 4.1, and Firebase (Firestore + Auth). AI integration uses Vercel AI SDK 6 with @ai-sdk/google 3.x for Gemini access, Zod 4 for schema validation, and structured output enforcement via `Output.object()`. Payments are handled via Stripe Checkout (not embedded Elements) for simplicity. Markdown rendering uses react-markdown 10.x with remark-gfm for tables and rehype-pretty-code for syntax highlighting. Next.js 16's removal of `next lint` means Biome 2.3.x is the standard linter/formatter (10-25x faster than ESLint + Prettier).

**Core technologies:**
- **Next.js 16 + React 19:** Full-stack framework with App Router, Turbopack default bundler, and React Compiler 1.0 stable
- **Vercel AI SDK 6 + @ai-sdk/google:** Unified generateText/streamText API with structured output via `Output.object()` — deprecates generateObject/streamObject
- **Firestore (via firebase-admin 13.x):** NoSQL database, server-side only access, deny-all client rules pattern
- **Gemini 2.5 Flash + Gemini 3 Pro:** Default and premium model tiers — Flash is 10-20x cheaper, Pro for quality-sensitive users
- **Stripe Checkout:** Hosted payment flow for credit purchases — simpler than embedded Elements, handles PCI compliance
- **Biome 2.3.x:** Single binary replacing ESLint + Prettier — Next.js 16 removed `next lint`, recommends Biome or ESLint CLI

**Critical version notes:**
- AI SDK 6 removes `generateObject/streamObject` (use `generateText/streamText` with `output: Output.object()`)
- Next.js 16 deprecated `middleware.ts` (rename to `proxy.ts`)
- Tailwind CSS v4 uses CSS-first config (`@import "tailwindcss"`) instead of JS config
- next-auth v5 still in beta (5.0.0-beta.30) — stick with Firebase Auth + session cookies pattern

### Expected Features

Research identifies a clear division between table stakes (expected by all users), differentiators (competitive advantages), and anti-features (commonly requested but problematic). The dual-mode input strategy — brain dump with AI gap detection AND guided Q&A — is the product's primary differentiator. No competitor offers both. ChatPRD uses conversational chat only; WriteMyPrd uses rigid forms only. Gap detection powered by LLM analysis (not rules) is the second key differentiator, validated by research showing follow-up questions improve document quality significantly.

**Must have (table stakes):**
- Free-text brain dump input — every AI writing tool accepts unstructured input; rigid forms cause abandonment
- Structured output with clear sections — users expect professional FRD structure (overview, users, features, constraints)
- Markdown export (copy + download) — standard across AI tools; users paste into Notion, GitHub, Claude Code
- Loading/progress indication — generation takes 5-30 seconds; no feedback = users assume app is broken
- Version history — WriteMyPrd and ChatPRD maintain history; users iterate on FRDs and need prior versions
- Authentication + user isolation — users enter proprietary ideas; they expect privacy and no cross-user leakage

**Should have (competitive):**
- Dual-mode input (Fast + Standard) — matches workflow to user's readiness level; no competitor offers both
- AI gap detection with targeted follow-ups — analyze brain dump against FRD template, ask only relevant questions
- Output optimized for Claude Code consumption — consistent heading structure, numbered requirements, machine-readable patterns
- User-only prompt visibility — admin cannot read prompts; stronger privacy than competitors' "we don't train on your data"
- Half-star rating system (10-point scale) — granular quality feedback for prompt iteration vs. simple thumbs up/down
- Credit-based pricing — 50 credits per generation, 25 for iteration; transparent per-action costs vs. opaque subscriptions

**Defer (v2+):**
- Real-time collaborative editing — massive complexity (CRDT/OT), collaboration happens downstream in Notion/Confluence
- Custom template editor — bad templates produce bad FRDs; one curated template is the product's strength
- Chat-based conversational interface — structured input/output is clearer than open-ended chat; chat adds cost without focus
- Jira/Linear/GitHub integration — integration maintenance burden high; users already know how to copy markdown

### Architecture Approach

The architecture uses a two-mode input, unified prompt composition pattern. Fast mode (brain dump) and standard mode (guided Q&A) collect different inputs but both normalize to a `GenerationInput` type, which feeds into a server-side prompt composer that returns `{ system, prompt }` strings for the AI SDK. This prevents duplicating prompt logic and makes adding new input modes trivial. All AI generation endpoints are Route Handlers (not Server Actions) because streaming requires SSE, which Server Actions cannot return. The generation-delivery decoupling pattern is critical: client triggers generation and receives a `generationId`, server writes chunks to Firestore as they arrive from Gemini, client subscribes to Firestore real-time updates. If the client disconnects and reconnects, it reads all existing chunks and resumes — this survives network hiccups and mobile tab switches.

**Major components:**
1. **Prompt Composer (lib/ai/)** — Server-only module that assembles system prompt + user context into final LLM prompt; pure functions, testable in isolation
2. **Generation Engine (lib/ai/)** — Wraps Vercel AI SDK calls, manages model selection, enforces maxOutputTokens, handles onFinish callbacks for version saving and credit deduction
3. **Credit Ledger (lib/db/credits.ts)** — Firestore transaction-based reservation pattern: reserve credits before generation, release on failure, settle on success; prevents concurrent overdraw
4. **Version Storage (Firestore subcollections)** — `projects/{projectId}/versions/{versionId}` — each version is its own document, avoids 1 MiB parent document limit
5. **Gap Detection (fast mode only)** — Separate LLM call using `generateObject` with structured schema; analyzes brain dump, identifies missing FRD sections, generates targeted follow-up questions

**Critical architectural patterns:**
- **Structured output enforcement:** Use Gemini `responseSchema` with JSON Schema to guarantee format consistency across all generations
- **Section-level iteration:** For iteration v2+, include only changed sections + context, not the full previous FRD (prevents context window degradation)
- **Context caching:** Gemini 2.5 models offer 90% discount on cached tokens; cache system prompts for massive cost savings
- **Firestore subcollections:** Versions as subcollections of projects (not arrays in parent), prompts as root collection with userId index for privacy
- **Credit reservation pattern:** Reserve credits in transaction before generation, release if stream fails, prevent race conditions

### Critical Pitfalls

Research identifies 9 critical pitfalls and multiple technical debt patterns. The top 5 pitfalls that will cause rewrites if not addressed correctly:

1. **Inconsistent LLM output structure** — Same prompt produces different section headings, nesting depths, and formats across generations; iteration workflow becomes unusable because diffs are meaningless noise. **Avoid:** Use Gemini structured output (`responseSchema`) to guarantee schema compliance; separate content generation from formatting; temperature 0 or 0.1 for consistency.

2. **Context window degradation during iteration** — By iteration 3-4, combined prompt (previous FRD + feedback + system prompt) exceeds reliable performance threshold; model ignores earlier feedback, drops sections, hallucinates contradictions. **Avoid:** Never pass full previous FRD; use section-level iteration (only send changed sections); implement Gemini context caching for system prompts (90% cost reduction); hard limit of 10 iterations per project.

3. **Firestore 1 MiB document size limit** — Comprehensive FRD with 5-10 versions stored inline exceeds Firestore's hard 1,048,576 byte limit; write fails silently or throws error, user's generated document is lost. **Avoid:** Design subcollections from day one (`projects/{id}/versions/{id}`, not versions array in parent); monitor document sizes in dev; never store raw LLM responses inline.

4. **TTL-based deletion does not cascade to subcollections** — 90-day retention TTL deletes parent `projects/{id}` document but leaves all `versions/` and `prompts/` subcollections as orphans; storage costs grow silently over months. **Avoid:** Use TTL as trigger + Cloud Function onDelete to recursively delete subcollections; run weekly cleanup job for orphans; account for 24-72 hour TTL delay in privacy policy.

5. **Prompt data leaking through logs and errors** — Default logging captures full request bodies; Gemini SDK errors include full prompt; user's proprietary business requirements visible in Cloud Logging to anyone with log access; OWASP LLM07:2025 risk. **Avoid:** Implement `sanitizeForLogging()` at API boundary; configure structured logging with field allowlists; wrap Gemini calls in try/catch that strips prompts from error objects; Cloud Logging exclusion filters.

**Additional critical pitfalls:**
- **Runaway token costs:** No maxOutputTokens = unbounded generation; large brain dumps = 50-100x typical token cost; must cap at 8,192 output tokens and count input tokens pre-flight
- **Streaming UX fails on disconnect:** Direct SSE coupling = lost generation if connection drops; must decouple generation from delivery (Firestore-backed chunks)
- **Hallucinated requirements:** LLM fabricates plausible features user never mentioned; must implement provenance tracking (user_stated vs llm_inferred vs template_default)
- **Gap detection noise (false positives):** Model flags enterprise requirements for simple internal tools; users ignore all alerts; must implement scope-aware gap detection with severity levels

## Implications for Roadmap

Based on research, the roadmap should follow a dependency-driven phase structure that addresses architectural foundations first, then builds user-facing flows, then adds polish and scale features. The research reveals clear dependency chains: authentication gates all user-scoped features, prompt composition is a pure logic layer that must be tested in isolation before AI wiring, and gap detection requires two-phase LLM calls (analyze then generate).

### Phase 1: Foundation & Core Generation

**Rationale:** Everything depends on auth, data model, and basic generation working. The FRD template structure is the foundational artifact — without a good template, nothing else matters. Gemini structured output enforcement must be designed in from day one (retrofitting it after launch requires migrating all existing prompts and data). Firestore subcollection data model is also a day-one decision — migrating from flat documents to subcollections requires painful data migration and downtime.

**Delivers:**
- Firebase Auth integration (token verification middleware, user context)
- Firestore schema with subcollections (`projects/{id}/versions/{id}`, `prompts/{id}`)
- FRD template structure (markdown template + system prompt)
- Prompt composition layer (`composeGenerationPrompt()`, `GenerationInput` type, Zod schemas)
- Basic generation endpoint (Route Handler with `streamText`, Gemini Flash)
- Structured output enforcement (Gemini `responseSchema`, schema validation)
- Generation-delivery decoupling (Firestore chunk persistence, real-time listener resumption)
- Version creation (immutable version documents with metadata)
- Basic UI (project creation, generation trigger, markdown rendering)

**Addresses:**
- Pitfall #1 (inconsistent output) — structured output from day one
- Pitfall #3 (1 MiB limit) — subcollection data model from day one
- Pitfall #5 (prompt leakage) — sanitization at API boundary from day one
- Pitfall #6 (runaway costs) — maxOutputTokens and input validation from day one
- Pitfall #7 (streaming disconnect) — Firestore-backed persistence from day one

**Must have features:**
- Free-text brain dump input (simple textarea, no gap detection yet)
- FRD generation via Gemini (structured output, streaming)
- Copy to clipboard + download as .md
- Loading state during generation
- Error handling (API failures, input validation)

**Research flag:** Low research needs — stack is decided, patterns are standard Next.js + AI SDK. Primary risk is Gemini structured output nuances, which will surface during implementation testing.

---

### Phase 2: Dual-Mode Input & Iteration

**Rationale:** With core generation working, add the primary differentiator (dual-mode input with gap detection) and the iteration workflow. Gap detection is architecturally more complex than standard mode because it requires two LLM calls (analyze then generate). Iteration depends on version storage working correctly (from Phase 1) and requires section-level context injection to avoid context window degradation.

**Delivers:**
- Gap detection endpoint (`generateObject` with structured schema, brain dump analysis)
- Fast mode UI (brain dump → gap analysis display → follow-up form → generation)
- Standard mode UI (multi-step wizard with skip capability)
- Iteration flow (previous version context injection, section-level updates)
- Version history view (list versions, compare side-by-side)
- Model tier selection (Flash vs Pro toggle)
- Half-star rating system (10-point scale per version)

**Addresses:**
- Pitfall #2 (context degradation) — section-level iteration from Phase 2 start
- Pitfall #8 (hallucinated requirements) — provenance tracking in schema (Phase 1), UI flags in Phase 2

**Must have features:**
- Brain dump with gap detection (the core differentiator)
- Guided Q&A (standard mode for structured users)
- Iteration (refine existing FRD with feedback)
- Version history (list and compare)

**Research flag:** Medium research needs for gap detection prompt engineering. The `GapAnalysisSchema` design and prompt template will need empirical tuning based on real user inputs to minimize false positives (Pitfall #9). Plan to iterate on the gap detection prompt in-phase.

---

### Phase 3: Credit System & Data Retention

**Rationale:** Phase 1-2 can operate with free/unlimited generation for validation. Phase 3 adds monetization (Stripe integration, credit enforcement) and privacy compliance (90-day TTL with cascade deletion). Credit system is complex (reservation pattern, webhook handling, transaction audit trail) but can be built in parallel with Phase 2. Data retention is deferred because it's a privacy/compliance feature, not a core value delivery feature.

**Delivers:**
- Stripe Checkout integration (credit purchase flow)
- Credit balance enforcement (reservation pattern with Firestore transactions)
- Stripe webhook handler (payment confirmation, credit grants)
- Credit transaction audit trail (root collection for ledger)
- 90-day TTL with cascade deletion (TTL trigger + Cloud Function recursive delete)
- Cleanup job for orphaned subcollections (weekly Cloud Scheduler)
- Credit purchase UI (balance display, package selection)

**Addresses:**
- Pitfall #4 (TTL orphans) — Cloud Function cascade deletion
- Pitfall #6 (runaway costs) — credit-to-token mapping, per-user budgets

**Must have features:**
- Credit purchase (Stripe Checkout)
- Credit enforcement (gate generation endpoints)
- 90-day auto-deletion (TTL + cascade)

**Research flag:** Low research needs — Stripe patterns are well-documented, Firestore TTL is official. Primary risk is testing the cascade deletion Cloud Function with realistic data volumes.

---

### Phase 4: Polish & Scale

**Rationale:** With core value delivered and monetization working, add analytics, rate limiting, mobile-responsive refinements, and performance optimizations. These are important for production readiness but don't block validation or revenue.

**Delivers:**
- Analytics event tracking (generation volume, iteration rate, model tier usage)
- Rate limiting (per-user generation caps, global API rate limits)
- Mobile-responsive layout refinements (touch-friendly rating, optimized input)
- Performance optimizations (SWR caching, lazy-load version history, pagination)
- Admin dashboard (aggregate metrics, cost monitoring)

**Addresses:**
- Pitfall #6 (runaway costs) — admin dashboard for cost monitoring
- Performance traps identified in research (pagination, scoped listeners)

**Must have features:**
- Rate limiting (protect against abuse)
- Mobile-responsive (40%+ of traffic is mobile)

**Research flag:** Low research needs — standard patterns for all features.

---

### Phase Ordering Rationale

**Why this order:**
- Phase 1 must come first because it establishes the data model, auth, and generation engine that everything else depends on. The three "day one decisions" (subcollection data model, structured output enforcement, prompt sanitization) cannot be retrofitted without rewrites.
- Phase 2 builds on Phase 1's version storage to add iteration, and on Phase 1's generation engine to add dual-mode input. Gap detection is architecturally independent of iteration, so they can be built in parallel within Phase 2.
- Phase 3 is deferred because credit enforcement is a wrapper around generation (doesn't change how generation works), and data retention is compliance-driven, not value-driven.
- Phase 4 is polish that doesn't block launch or revenue.

**Dependency chains addressed:**
- Auth → user-scoped features (versions, ratings, prompt visibility)
- FRD template → all generation
- Prompt composition → gap detection, iteration, all modes
- Version storage → iteration, history, comparison
- Generation engine → dual-mode input, iteration

**Pitfall avoidance embedded:**
- Phase 1 addresses 5 of 9 critical pitfalls (inconsistent output, 1 MiB limit, prompt leakage, runaway costs, streaming disconnect)
- Phase 2 addresses context degradation and hallucinated requirements
- Phase 3 addresses TTL orphans
- Phase 4 addresses performance traps

### Research Flags

**Phases likely needing deeper research during planning:**
- **Phase 2 (Gap Detection):** The `GapAnalysisSchema` design and prompt engineering for minimizing false positives (Pitfall #9) will need empirical tuning. Research confirmed the concept (follow-up questions improve documents), but the exact schema, severity categories, and scope awareness prompt require iteration based on real user inputs.
- **Phase 2 (Section-Level Iteration):** The section-level context injection pattern (how to extract only changed sections from previous FRD and inject with minimal context) is not well-documented. Will need to experiment with different chunking strategies and token budgets.

**Phases with standard patterns (skip research-phase):**
- **Phase 1:** Next.js + AI SDK + Firestore patterns are well-documented. Stack research already covered integration patterns.
- **Phase 3:** Stripe Checkout and Firestore TTL are official, well-documented patterns.
- **Phase 4:** Analytics, rate limiting, pagination are standard web app patterns.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All technologies verified against official docs. Version compatibility confirmed. Next.js 16, AI SDK 6, Gemini 2.5 models are current stable releases. |
| Features | MEDIUM-HIGH | Competitive analysis solid (ChatPRD, WriteMyPrd verified). Table stakes validated across multiple sources. Gap detection value confirmed by research (arxiv 2407.12017). Dual-mode input is novel (not validated by existing products). |
| Architecture | HIGH | Patterns verified across official Vercel AI SDK docs, Firestore docs, and multiple implementation guides. Subcollection pattern, streaming recovery, credit reservation are all documented with examples. |
| Pitfalls | HIGH | All 9 critical pitfalls confirmed via official docs (Firestore limits, TTL behavior, Gemini pricing) or security standards (OWASP LLM07:2025). Recovery strategies validated against documented migration patterns. |

**Overall confidence:** HIGH

The stack, architecture patterns, and pitfalls are verified against official documentation and current best practices. Feature research is slightly lower confidence because the dual-mode input strategy is novel (no direct competitive validation), but the underlying components (brain dump input, guided Q&A, gap detection) are each individually validated. The biggest uncertainty is gap detection prompt engineering — the concept is sound, but the execution (schema design, false positive rate) will require in-phase iteration.

### Gaps to Address

**Gap 1: Gap detection prompt effectiveness**
Research confirms that follow-up questions improve document quality, and that LLMs can detect missing sections. However, the exact `GapAnalysisSchema` design, severity categorization, and scope awareness prompt are not validated. The false positive rate (Pitfall #9) is a known risk that requires empirical tuning.

**How to handle:** Build gap detection in Phase 2 as an iterative feature. Ship a basic version with critical-only gaps surfaced, track dismissal rates via analytics, and refine the prompt based on real user behavior. Accept that the first version will be noisy and plan for 2-3 prompt iterations.

**Gap 2: Section-level iteration context injection strategy**
Research identifies context window degradation as a critical pitfall and recommends section-level iteration (only send changed sections). However, the exact chunking strategy (how to extract sections, how much context to include, how to handle cross-section dependencies) is not documented in existing sources.

**How to handle:** Prototype section-level iteration during Phase 2 planning. Test with real FRD examples: measure token counts for full-doc vs section-only prompts, validate that section-only updates produce coherent output. May need to fall back to full-doc iteration for Phase 2 MVP and defer true section-level updates to a later phase if complexity is high.

**Gap 3: Gemini structured output edge cases**
Gemini's `responseSchema` enforcement is documented, but edge case behavior (what happens when the model tries to break the schema? how are validation errors surfaced? does it retry or fail?) is not fully detailed in current research.

**How to handle:** During Phase 1 implementation, test Gemini structured output with adversarial prompts (try to get it to add extra fields, skip required fields, change types). Document observed behavior and add client-side validation as a safety net. Monitor generation error logs for schema validation failures.

## Sources

### Primary (HIGH confidence)
- [Next.js 16 Blog Post](https://nextjs.org/blog/next-16) — official release notes, features, breaking changes
- [AI SDK 6 Migration Guide](https://ai-sdk.dev/docs/migration-guides/migration-guide-6-0) — breaking changes, Output.object pattern
- [Gemini API Pricing](https://ai.google.dev/gemini-api/docs/pricing) — token costs, context caching discount
- [Gemini Structured Output](https://ai.google.dev/gemini-api/docs/structured-output) — JSON schema enforcement, responseSchema
- [Firestore Usage and Limits](https://firebase.google.com/docs/firestore/quotas) — 1 MiB document size limit
- [Firestore TTL Policies](https://firebase.google.com/docs/firestore/ttl) — TTL behavior, no cascade delete
- [Vercel AI SDK streamText Reference](https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text) — streaming API
- [OWASP LLM Top 10 2025](https://genai.owasp.org/llmrisk/llm01-prompt-injection/) — prompt injection, system prompt leakage

### Secondary (MEDIUM confidence)
- [ChatPRD - AI Copilot for Product Managers](https://www.chatprd.ai/) — competitor features, pricing
- [WriteMyPrd](https://writemyprd.com/) — competitor features
- [Follow-Up Questions Improve Documents - arxiv 2407.12017](https://arxiv.org/abs/2407.12017) — validates gap detection concept
- [Resumable LLM Streams](https://upstash.com/blog/resumable-llm-streams) — streaming recovery pattern
- [Context Window Overflow](https://redis.io/blog/context-window-overflow/) — context management strategies
- [SaaS Credits System Guide 2026 - ColorWhistle](https://colorwhistle.com/saas-credits-system-guide/) — credit-based pricing patterns
- [Server Actions vs Route Handlers](https://makerkit.dev/blog/tutorials/server-actions-vs-route-handlers) — when to use each

### Tertiary (LOW confidence)
- [Firestore Versioned Documents Pattern](https://gist.github.com/ydnar/8e4a51f7d1ce42e9bb4ae53ba049de4a) — community pattern, not official
- [LLM Prompt Knowledge Gaps Research](https://arxiv.org/html/2501.11709v1) — academic research, validates gap detection approach

---
*Research completed: 2026-02-11*
*Ready for roadmap: yes*
