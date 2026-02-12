# Pitfalls Research

**Domain:** AI-powered document generation (FRD Generator)
**Researched:** 2026-02-11
**Confidence:** HIGH (verified across official docs, multiple sources, and domain research)

---

## Critical Pitfalls

Mistakes that cause rewrites or major issues.

---

### Pitfall 1: Inconsistent LLM Output Structure Across Generations

**What goes wrong:**
The same prompt produces structurally different FRDs on each generation. Section headings vary ("Functional Requirements" vs "Feature Requirements" vs "Requirements Specification"). Nested bullet hierarchies shift depth. Some runs produce markdown tables, others produce prose. Users lose trust when regenerating a document produces a visibly different format than the original, making iteration workflows unusable because diffs between versions become meaningless noise.

**Why it happens:**
LLMs are stochastic -- temperature, top-p, and the non-deterministic nature of token sampling mean identical prompts yield different outputs. Prompt-only format enforcement (e.g., "output the document with these sections") is brittle. The model may rename fields, reorder sections, or hallucinate extra sections without warning. This worsens as the prompt grows longer, because the model attends less reliably to formatting instructions buried in long contexts (the "lost in the middle" effect documented in long-context research where 11/12 models dropped below 50% performance at 32k tokens).

**How to avoid:**
- Use Gemini's native structured output mode (`responseSchema` with JSON Schema enforcement) to guarantee structural compliance. Gemini guarantees schema compliance when `structuredOutputConfig` is used. This is the single most important architectural decision for this project.
- Define a canonical FRD schema as a TypeScript type/Zod schema that maps 1:1 to the Gemini response schema. The LLM outputs structured data; the frontend renders it into the document format.
- Separate content generation from formatting. The LLM generates structured content blocks; a deterministic renderer produces the final FRD markdown/PDF. This eliminates format drift entirely.
- Use temperature 0 or very low temperature (0.1) for FRD generation. Accept slightly less creative output in exchange for consistency.
- Include explicit negative instructions: "Do NOT add sections not in the schema. Do NOT rename section keys."

**Warning signs:**
- QA finds that regenerating the same FRD produces visually different documents
- Users report "the format changed" between versions
- Diff tools show structural changes when only content should have changed
- JSON parse errors in production logs (model broke out of schema)

**Phase to address:**
Phase 1 (Core Generation). This is foundational -- every downstream feature (versioning, iteration, gap detection) depends on structural consistency. Define the FRD schema and enforce it via Gemini structured output before building anything else.

**Confidence:** HIGH -- Gemini structured output enforcement is documented in official Firebase AI Logic docs and Vertex AI docs.

---

### Pitfall 2: Context Window Degradation During Document Iteration

**What goes wrong:**
The iteration workflow (user generates FRD v1, provides feedback, generates v2, etc.) requires passing the previous document version plus user feedback plus the system prompt into each subsequent call. By iteration 3-4, the combined prompt exceeds the point where the model performs reliably. Research shows performance drops significantly as context grows -- key information in the middle of long prompts is attended to less reliably. The model starts ignoring earlier feedback, dropping sections that were fine in v1, or hallucinating content that contradicts the user's original input.

**Why it happens:**
Context rarely shrinks. Each iteration adds: the full previous FRD (~2,000-8,000 tokens for a real FRD), user feedback (~200-1,000 tokens), and the system prompt (~500-2,000 tokens). By v4, you could be at 15,000-40,000 tokens of context before the model even starts generating. The "lost in the middle" phenomenon means instructions and content in the middle of the prompt get lower attention. Additionally, prompt bloat increases cost linearly -- every iteration is more expensive than the last.

**How to avoid:**
- Never pass the entire previous FRD as raw text. Instead, pass only the structured diff: which sections changed, what the user's feedback targets, and the current state of only the affected sections.
- Implement a "section-level iteration" architecture: when a user requests changes to "User Stories," only send that section plus its context (neighboring sections for coherence) rather than the entire document.
- Use Gemini context caching for the system prompt and FRD template schema. Gemini 2.5 models offer 90% discount on cached tokens, and implicit caching is enabled by default since May 2025. This means the ~2,000 token system prompt is cached after the first call.
- Set a hard iteration limit (suggest 10 versions) and warn users at iteration 7+ that they should start a new generation if the document has drifted significantly.
- Store each version's structured data independently in Firestore -- never reconstruct version history by chaining prompts.

**Warning signs:**
- Token counts per generation call increase monotonically across iterations
- Users report "it forgot what I said earlier" or "it changed a section I didn't ask about"
- Later iterations take noticeably longer (more tokens = more latency)
- Cost per generation increases with each iteration for the same user

**Phase to address:**
Phase 2 (Iteration Workflow). The section-level iteration architecture must be designed before implementing the "refine" feature. Phase 1 can use full-document regeneration for MVP, but the data model must anticipate section-level granularity from the start.

**Confidence:** HIGH -- context degradation is well-documented in academic research (NoLiMa study) and practical guides.

---

### Pitfall 3: Firestore 1 MiB Document Size Limit Exceeded by Large FRDs

**What goes wrong:**
Firestore has a hard 1 MiB (1,048,576 bytes) maximum document size. A comprehensive FRD with detailed user stories, acceptance criteria, data models, API specifications, and wireframe descriptions can easily reach 50-100KB of structured JSON. When you also store the prompt history, user inputs, generation metadata, and all version data in the same document, you hit the limit. The write silently fails or throws an error, and the user's generated document is lost.

**Why it happens:**
Developers naturally model an "FRD" as a single Firestore document containing all its data. This works for small documents but fails at scale. The problem compounds with the iteration workflow: storing 5-10 versions of a large FRD in one document, plus all associated prompts and feedback, can easily exceed 1 MiB. The maximum field value size is 1,048,487 bytes (1 MiB minus 89 bytes for overhead), so even a single text field cannot hold a very large document.

**How to avoid:**
- Design the data model with subcollections from day one:
  - `frdProjects/{projectId}` -- metadata, settings, current version pointer (small document, <10KB)
  - `frdProjects/{projectId}/versions/{versionId}` -- each version as its own document
  - `frdProjects/{projectId}/versions/{versionId}/sections/{sectionId}` -- individual sections if FRDs grow very large
  - `frdProjects/{projectId}/prompts/{promptId}` -- user inputs and prompt history
- Monitor document sizes in development. Add a pre-write check that logs a warning at 500KB and rejects at 900KB.
- Never store raw LLM responses (which include verbose metadata) alongside the parsed output. Parse and store only the structured content.
- For the rendered output (final markdown/PDF), store in Cloud Storage with a reference URL in Firestore, not inline.

**Warning signs:**
- Firestore write errors with code `INVALID_ARGUMENT` or "Document exceeds maximum size"
- Documents approaching 500KB in development (check with Firestore document size calculator)
- Data model has deeply nested maps instead of subcollections
- A single FRD document contains more than 2-3 versions inline

**Phase to address:**
Phase 1 (Data Model Design). The Firestore schema must be designed with subcollections before any data is written. Retrofitting a flat document model to subcollections requires a data migration, which is painful.

**Confidence:** HIGH -- 1 MiB limit is confirmed in official Firestore documentation (firebase.google.com/docs/firestore/quotas).

---

### Pitfall 4: TTL-Based Data Retention Creates Orphaned Subcollections

**What goes wrong:**
The 90-day data retention requirement seems straightforward: set a Firestore TTL policy on the `expireAt` field, and documents auto-delete after 90 days. But Firestore TTL does NOT cascade to subcollections. When the parent `frdProjects/{projectId}` document is deleted by TTL, all its subcollections (`versions/`, `prompts/`, `sections/`) remain as orphaned data. Users cannot access them (the parent reference is gone), but they still consume storage and billing. Over months, orphaned data accumulates and storage costs grow silently.

**Why it happens:**
Firestore's document model treats subcollections as independent -- deleting a parent document does not delete its children. TTL policies apply only to documents in the specified collection group, not their descendants. The official docs explicitly state: "Deleting an entity through TTL does not delete that entity's descendant entities." Additionally, TTL deletion is not instant -- data is typically deleted within 24 hours after expiration, but can take up to 72 hours.

**How to avoid:**
- Do NOT rely solely on TTL for the 90-day retention. Use TTL as the trigger, then cascade deletion via Cloud Functions:
  1. Set TTL on the parent `frdProjects/{projectId}` document
  2. Create an `onDelete` Cloud Function trigger on that collection
  3. The function recursively deletes all subcollections (`versions/`, `prompts/`, `sections/`)
  4. Use batched deletes (500 ops per batch) to handle large subcollection trees
- As a safety net, run a weekly Cloud Scheduler job that scans for orphaned subcollections (subcollection documents whose parent no longer exists) and deletes them.
- Log all TTL deletions and cascade completions for audit compliance.
- Account for the 24-72 hour TTL deletion delay in your privacy policy wording. Don't promise "deleted immediately at 90 days."

**Warning signs:**
- Storage costs increase over time despite stable user count
- Firestore document count grows but active project count is stable
- Querying a subcollection returns data for a project that no longer exists in the parent collection
- Users report seeing "ghost" data from deleted projects

**Phase to address:**
Phase 3 (Data Retention & Privacy). Implement the TTL + Cloud Function cascade together as a unit. Test with synthetic data: create a project, let it expire, verify all subcollections are cleaned up within 96 hours.

**Confidence:** HIGH -- confirmed in official Firestore TTL documentation that TTL does not cascade to descendants.

---

### Pitfall 5: Prompt Data Leaking Through Error Messages, Logs, and Analytics

**What goes wrong:**
The FRD Generator has a strict privacy requirement: user prompts (brain dump text, Q&A answers) should be visible only to the user. But in practice, prompt data leaks through multiple channels: error messages that include the full prompt in stack traces, application logs that capture request/response payloads, analytics events that include prompt snippets for "debugging," and Gemini API error responses that echo back the input. Users discover their business requirements (potentially containing trade secrets, product plans, competitive intelligence) are stored in plaintext in Cloud Logging, visible to anyone with log access.

**Why it happens:**
Default logging in production frameworks captures full request bodies. Next.js API routes log errors with full context by default. The Gemini SDK includes input prompts in error objects. Developers add `console.log(prompt)` during development and forget to remove it. Error monitoring tools (Sentry, etc.) capture the full error context including local variables. Analytics tracking captures page content that includes displayed prompts. OWASP ranks system prompt leakage as LLM07:2025.

**How to avoid:**
- Implement a `sanitizeForLogging()` utility that strips or hashes all user-generated content before any logging call. Apply it at the API boundary, not deep in business logic.
- Configure structured logging with explicit field allowlists. Never log raw request bodies for LLM endpoints.
- Wrap all Gemini API calls in a try/catch that sanitizes error objects before rethrowing or logging. The Gemini SDK error objects contain the full prompt -- strip it.
- Set up Cloud Logging exclusion filters for any log entries matching prompt content patterns.
- In error monitoring (Sentry/similar), configure `beforeSend` hooks to scrub prompt-related fields from error events.
- Never include user prompt text in analytics events. Use opaque IDs to correlate.
- Audit log access: limit Cloud Logging viewer access to a minimal set of team members.

**Warning signs:**
- Searching Cloud Logging for user-specific text (a known brain dump phrase) returns results
- Error monitoring dashboard shows prompt content in error details
- API error responses to the client include internal prompt details
- `console.log` or `console.error` calls in LLM-related code paths

**Phase to address:**
Phase 1 (API Layer). Establish the sanitization boundary from the first API route. It's much harder to audit and retrofit logging across an existing codebase than to build the boundary from day one.

**Confidence:** HIGH -- prompt leakage is OWASP LLM07:2025 and documented across multiple security sources.

---

### Pitfall 6: Runaway Token Costs Without Per-User or Per-Generation Budgets

**What goes wrong:**
Credit-based billing creates a false sense of cost control. A user with 10 credits might consume $0.50 worth of tokens on one generation and $15.00 on another, depending on input length and output verbosity. Without per-generation token budgets, a single user with a massive brain dump (10,000 words) requesting a comprehensive FRD can consume 50-100x the tokens of a typical generation. Google Cloud does not allow hard spending limits on the Gemini API -- you can only set budget alerts. A bug in the iteration loop, a prompt injection that triggers verbose output, or a batch of power users can cause a significant cost spike before alerts fire.

**Why it happens:**
Gemini pricing is per-token, not per-request. Two "identical" API calls can cost vastly different amounts depending on input size and output length. Developers set credit prices based on average token usage during testing with short prompts, but production usage has a long tail of expensive outliers. Context accumulation across iterations means cost per call increases over time. The Gemini 2.5 Pro model costs $2.00/$12.00 per 1M input/output tokens for standard context, doubling to $4.00/$18.00 beyond 200K tokens.

**How to avoid:**
- Implement hard `maxOutputTokens` on every Gemini API call. For FRD generation, cap at 8,192 output tokens (roughly 6,000 words -- more than enough for any single FRD section).
- Implement input token counting before sending to Gemini. Reject or truncate inputs that exceed a threshold (e.g., 4,000 input tokens for brain dump mode).
- Map credits to token budgets, not to "number of generations." One credit = X input tokens + Y output tokens. If a generation would exceed the budget, warn the user and require additional credits.
- Use Gemini 2.5 Flash (not Pro) as the default model. Flash is 10-20x cheaper than Pro and produces adequate quality for structured document generation. Reserve Pro for a "premium quality" tier.
- Implement per-user daily/monthly token caps as a circuit breaker, independent of credit balance.
- Use Gemini context caching for system prompts -- 90% discount on cached tokens for repeated prompts.
- Monitor token usage per generation in real-time. Alert on any single call exceeding 2x the rolling average.

**Warning signs:**
- Average cost per generation varies by more than 5x across users
- Monthly Gemini API bill exceeds projected cost by 2x+
- Individual users consuming disproportionate token budgets
- No `maxOutputTokens` set on API calls (model generates until it stops naturally)

**Phase to address:**
Phase 1 (Core Generation) for `maxOutputTokens` and input validation. Phase 2 (Credit System) for credit-to-token mapping and per-user budgets.

**Confidence:** HIGH -- Gemini pricing confirmed via official pricing docs (ai.google.dev/gemini-api/docs/pricing). Cost control strategies verified across multiple sources.

---

### Pitfall 7: Streaming UX Fails on Connection Loss Without Recovery

**What goes wrong:**
FRD generation takes 10-30 seconds. Streaming the response via SSE gives users real-time feedback as sections appear. But if the connection drops mid-stream (network hiccup, user switches tabs on mobile, laptop lid close), the entire generation is lost. The user sees a partial document with no way to recover the rest. Worse, the Gemini API call already consumed tokens and credits, so the user has paid for a generation they never received. On Cloud Run, the default request timeout is 300 seconds (5 minutes), which is sufficient, but if the Next.js route handler doesn't properly configure streaming headers, intermediate proxies or load balancers may buffer or timeout the response.

**Why it happens:**
Traditional SSE creates a persistent connection between client and server. If the connection breaks, the stream is gone. The server-side Gemini generation may still be running (and billing tokens), but the client has disconnected and cannot receive the remaining output. Next.js route handlers run as serverless-style functions with timeout constraints, and SSE requires careful header configuration (`Cache-Control: no-cache`, `Connection: keep-alive`, `Content-Type: text/event-stream`) to prevent proxy buffering.

**How to avoid:**
- Decouple generation from delivery. The architecture pattern is:
  1. Client triggers generation via API call, receives a `generationId`
  2. Server-side generation writes chunks to Firestore (or Redis) as they arrive from Gemini
  3. Client subscribes to Firestore real-time updates (or polls) for that `generationId`
  4. If client disconnects and reconnects, it reads all existing chunks and resumes from where it left off
- This pattern is critical because Firestore real-time listeners automatically handle reconnection and send missed updates.
- Set proper SSE headers in Next.js route handlers to prevent buffering.
- Implement a `generation_status` field: `pending` -> `streaming` -> `complete` -> `failed`. Client checks status on reconnect.
- Always persist the final complete output to Firestore, even if the client never received the stream. The user can reload the page and see their completed FRD.

**Warning signs:**
- Users report "blank page" or "incomplete document" after generation
- Token usage billing doesn't match the number of completed documents users see
- Mobile users have significantly worse completion rates than desktop
- No `generationId` pattern in the architecture (direct SSE coupling)

**Phase to address:**
Phase 1 (Core Generation). The generation-delivery decoupling must be designed into the initial architecture. Retrofitting stream persistence onto a direct SSE implementation is a rewrite.

**Confidence:** MEDIUM-HIGH -- pattern is well-documented (Upstash, Chrome DevRel), but specific Firestore-as-stream-store pattern is less commonly documented. Needs validation during implementation.

---

### Pitfall 8: Hallucinated Requirements in Generated FRDs

**What goes wrong:**
The LLM generates plausible-sounding but fabricated requirements that the user never mentioned. In a brain dump like "I want an e-commerce site that sells shoes," the model might hallucinate specific requirements like "The system shall support Bitcoin payments" or "Users shall be able to track orders via SMS" -- features the user never requested. Because the output looks professional and comprehensive, users may not catch these fabrications. They then build features based on hallucinated requirements, wasting development time and budget.

**Why it happens:**
LLMs are trained on vast amounts of requirements documents and tend to "fill in the gaps" with common patterns from their training data. When user input is vague or incomplete (which is the entire point of the brain dump mode), the model interpolates based on statistical patterns rather than the user's actual needs. This is hallucination by omission of attribution -- the model doesn't distinguish between "the user said this" and "documents like this usually contain this."

**How to avoid:**
- Implement explicit provenance tracking in the FRD schema. Each requirement should have a `source` field: `user_stated`, `llm_inferred`, or `template_default`. The UI should visually distinguish these (e.g., inferred requirements in a different color or with an "AI suggested" badge).
- In the system prompt, instruct the model to ONLY generate requirements directly traceable to user input, and to mark any inferred requirements explicitly: "If the user did not mention payment methods, write 'Payment method: [To be determined by stakeholder]' rather than assuming a specific method."
- For the guided Q&A mode, this is less of a problem because user intent is captured per-question. For brain dump mode, implement a post-generation "review" step where hallucinated requirements are flagged for user confirmation.
- Use Gemini's structured output to enforce a `confidence` field on each requirement (HIGH = user explicitly stated, MEDIUM = reasonably inferred, LOW = common in similar projects but not mentioned).
- Never auto-accept LLM output as the final FRD. The generated document should always land in a "draft" state requiring user review.

**Warning signs:**
- Users report "I didn't ask for that feature" after generation
- Generated FRDs contain specific technology choices the user never mentioned
- Requirements reference third-party services or integrations not in the user's input
- All requirements show equal confidence/certainty despite varying levels of user specificity

**Phase to address:**
Phase 1 (Core Generation) for the provenance-aware schema and system prompt design. Phase 2 (Review Workflow) for the UI that surfaces provenance to users.

**Confidence:** HIGH -- hallucination in document generation is well-documented in academic literature and practical LLM applications.

---

### Pitfall 9: Gap Detection Produces Noise (False Positives) That Erodes Trust

**What goes wrong:**
The gap detection feature analyzes a generated FRD and identifies "missing" sections or incomplete requirements. But it consistently flags things that are intentionally omitted (a simple internal tool doesn't need "Accessibility Compliance" or "Internationalization") or flags vague items as "gaps" when the user intentionally left them open ("Payment: TBD"). Users start ignoring gap detection alerts entirely, and then miss a genuinely critical gap (like missing error handling requirements or absent security considerations).

**Why it happens:**
Gap detection is essentially asking the LLM "what's missing from this document compared to a complete FRD?" The model compares against its training data of comprehensive enterprise FRDs and flags anything that a "typical" FRD would include. It has no understanding of the project's actual scope, complexity, or intentional simplifications. Research confirms that LLMs applied to completeness analysis tend to produce false positives by detecting items "not relevant to the class being considered."

**How to avoid:**
- Scope-aware gap detection: Before running gap analysis, capture the project's scope parameters (project type, complexity level, target audience, regulatory requirements). Use these to filter the gap detection prompt -- "This is a simple internal tool for 5 users. Do not flag enterprise-scale requirements like i18n, WCAG compliance, or horizontal scaling."
- Categorize gaps by severity: `critical` (will block development), `recommended` (best practice), `optional` (nice-to-have). Only auto-surface critical gaps.
- Allow users to dismiss gaps with a reason ("intentionally excluded") and remember those dismissals for future iterations of the same project.
- Use a two-pass approach: first pass generates the FRD, second pass reviews it against a scope-appropriate checklist (not against "all possible FRD sections").
- Track gap detection precision over time. If users dismiss >50% of flagged gaps, the detection prompt needs tuning.

**Warning signs:**
- Users consistently dismiss most gap detection suggestions
- Gap detection flags the same categories of "missing" sections across all project types
- No scope/complexity input feeds into the gap detection prompt
- Users skip the gap review step entirely

**Phase to address:**
Phase 2 or 3 (Gap Detection Feature). This is a feature that benefits from iteration -- ship a basic version, track dismissal rates, and refine the detection prompt based on real user behavior.

**Confidence:** MEDIUM -- gap detection accuracy is inherently prompt-dependent and will require empirical tuning. The prevention strategies are sound, but exact effectiveness needs validation.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Storing full FRD as single Firestore document | Simple data model, fast reads | Hits 1 MiB limit, no partial updates, expensive reads for metadata-only queries | Never -- design subcollections from day one |
| Using `console.log` for LLM debugging | Fast iteration during development | Prompt data in production logs, privacy violation, security risk | Only in local dev with explicit log filtering |
| Hardcoding credit-to-generation mapping (1 credit = 1 generation) | Simple billing logic | Cannot account for varying token costs, unprofitable on expensive generations | MVP only, must replace before scaling |
| Skipping input token counting before API calls | Faster implementation | No cost prediction, no user warning, runaway costs on large inputs | Never -- always count tokens pre-flight |
| Direct SSE streaming without persistence | Simpler architecture, less infrastructure | Lost generations on disconnect, wasted credits, poor mobile UX | Acceptable for MVP/demo, must replace before production |
| Using Gemini Pro as default model | Higher quality output | 10-20x higher costs than Flash, unsustainable margins | Only for premium tier, never as default |
| Relying solely on TTL for data deletion | Zero custom code for retention | Orphaned subcollections, growing storage costs, incomplete data cleanup | Never for this data model (subcollections require cascade) |

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Gemini API | Not setting `maxOutputTokens`, allowing unbounded generation | Always set `maxOutputTokens` on every call. 8,192 is a good ceiling for FRD sections |
| Gemini API | Using synchronous calls for generation, blocking the request | Use streaming API (`generateContentStream`) and persist chunks incrementally |
| Gemini API | Not handling model deprecation (Gemini 2.0 Flash retires March 31, 2026) | Abstract model selection behind a config. Monitor Google deprecation notices. Plan migration runway |
| Gemini API | Sending prompts without context caching enabled | Use explicit context caching for system prompts. 90% cost reduction on Gemini 2.5 models |
| Firestore | Writing large documents without checking size | Pre-calculate document size. Use subcollections for any document that could exceed 500KB |
| Firestore | Not handling TTL deletion delay (24-72 hours) | Account for delay in privacy policy. Run cleanup jobs for time-sensitive deletion |
| Firebase Auth | Not scoping Firestore security rules to `request.auth.uid` | Every document query must filter by owner. Security rules must enforce `resource.data.userId == request.auth.uid` |
| Cloud Run | Default 300s timeout insufficient for very long generations | Increase to 600s. But if generation takes >60s, the architecture (chunked generation) needs rethinking |
| Cloud Storage | Storing rendered PDFs in Firestore instead of Cloud Storage | Store only a GCS URL reference in Firestore. PDFs can be multi-MB |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Loading all FRD versions on project open | Slow page load, high Firestore reads | Lazy-load versions. Show only current version; load history on demand | >5 versions per project (~50% of active users) |
| No Gemini API rate limiting per user | Single user can exhaust rate quota for all users | Implement per-user rate limiting (e.g., max 5 generations/minute) | >50 concurrent users |
| Firestore listener on entire FRD collection | Read amplification: every write triggers all listeners | Scope listeners to specific documents/subcollections | >100 active projects |
| Storing prompt history as growing array in document | Document size grows unboundedly with iterations | Use a `prompts` subcollection with individual documents per prompt | >10 iterations per project |
| No pagination on project list queries | Loading all projects for a user in one query | Paginate with `limit()` and cursor-based pagination | >50 projects per user |
| Full FRD re-generation instead of section-level updates | Entire document regenerated for small changes, high token cost | Section-level generation architecture | >20% of generations are iterations |

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| System prompt exposed via prompt injection ("repeat your instructions") | Reveals generation logic, template structure, competitive advantage | Use Gemini safety settings. Validate output doesn't contain system prompt text. Use a post-processing filter |
| User A can view User B's FRD via direct Firestore path manipulation | Complete privacy breach. Business-critical requirements exposed | Firestore security rules must enforce `userId == request.auth.uid` on every collection and subcollection |
| Prompt data included in client-side error boundaries | User's business requirements visible in browser developer tools or error reporting | Sanitize all error objects before rendering. Never include prompt/response data in client-side state that isn't the current user's own view |
| Credit purchase/consumption not validated server-side | Users manipulate client to generate without credits | All credit checks in server-side API routes or Cloud Functions. Never trust client-reported credit balance |
| Generated FRD content not sanitized before rendering as HTML/markdown | XSS via LLM output (model can be prompted to generate malicious script tags) | Sanitize all LLM output before rendering. Use a markdown renderer with HTML disabled or sanitized |
| API routes not rate-limited | DoS via rapid generation requests, cost amplification attack | Rate limit all generation endpoints. Per-user and global limits |

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No progress indication during 10-30s generation | Users think the app is broken, abandon or refresh (losing the generation) | Stream sections as they generate. Show "Generating User Stories..." progress for each section |
| Showing raw markdown output without formatting | Non-technical users (PMs, stakeholders) cannot parse raw markdown | Render formatted document with proper headings, tables, and styling. Offer "Copy as Markdown" for technical users |
| Requiring too much input in guided Q&A mode | Users abandon the flow due to fatigue (>10 required questions) | Make most questions optional with smart defaults. 5 required questions max, rest optional |
| Brain dump mode accepting any length input without guidance | Very short inputs (1 sentence) produce thin FRDs; very long inputs (5000 words) exceed token limits | Show a quality meter: "Add more detail for a better FRD" for short inputs. Warn and summarize for very long inputs |
| No way to iterate on specific sections (only full regeneration) | Users must regenerate the entire document to fix one section, losing good content | Section-level "regenerate" and "edit" buttons. Preserve unchanged sections across iterations |
| Showing all gap detection results at once | Information overload, users ignore everything | Progressive disclosure: show critical gaps first, expandable sections for recommended and optional |
| No "undo" after accepting an iteration | Users accept a worse version and cannot revert | Maintain full version history. One-click revert to any previous version |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **FRD Generation:** Often missing output validation -- verify that every generated FRD passes schema validation before being shown to the user
- [ ] **Credit System:** Often missing cost variance handling -- verify that credits map to token budgets, not just "number of generations"
- [ ] **Data Retention:** Often missing cascade deletion -- verify that deleting a project removes ALL subcollections (versions, prompts, sections), not just the parent document
- [ ] **Streaming UI:** Often missing disconnect recovery -- verify that closing and reopening the browser during generation shows the completed (or in-progress) result, not a blank page
- [ ] **Privacy:** Often missing log sanitization -- verify that searching Cloud Logging for known prompt text returns zero results
- [ ] **Iteration Workflow:** Often missing version isolation -- verify that editing v3 does not modify v1 or v2 data
- [ ] **Gap Detection:** Often missing scope awareness -- verify that gap detection for a "simple internal tool" does not flag enterprise requirements
- [ ] **Auth/Authorization:** Often missing subcollection security rules -- verify that Firestore rules on `versions/{versionId}` check the parent project's `userId`, not just the version document
- [ ] **Error Handling:** Often missing user-facing error messages -- verify that a Gemini API failure shows "Generation failed, please retry" not a raw error dump
- [ ] **Model Deprecation:** Often missing migration plan -- verify there is a configuration-driven model selector, not hardcoded model IDs

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Inconsistent output structure | MEDIUM | Implement schema validation + migration script to normalize existing documents. Add structured output enforcement to all API calls |
| Context window degradation | LOW | Implement section-level iteration as a new feature. Existing full-doc iterations continue working, new feature improves quality |
| Firestore 1 MiB limit hit | HIGH | Data model migration required. Write a migration script to decompose existing documents into subcollections. Requires downtime or dual-write period |
| Orphaned subcollections | MEDIUM | Write a one-time cleanup Cloud Function that scans for orphaned subcollections. Deploy the cascade deletion trigger to prevent future orphans |
| Prompt data in logs | HIGH | Audit all log entries. Delete affected log buckets. Implement sanitization. Potentially requires security incident disclosure depending on jurisdiction/data |
| Runaway token costs | LOW-MEDIUM | Add `maxOutputTokens` immediately (one-line fix). Implement input validation. Retroactively reconcile credit consumption |
| Streaming failure on disconnect | MEDIUM | Implement generation persistence layer. Backfill any lost generations from Gemini API logs if available |
| Hallucinated requirements | LOW | Add provenance tracking to schema. UI change to flag inferred requirements. No data migration needed if schema was extensible |
| Noisy gap detection | LOW | Tune the gap detection prompt. Add scope parameters. Ship as prompt update, no code changes needed |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Inconsistent output structure | Phase 1: Core Generation | Regenerate the same FRD 10 times; verify identical structure (diff only content) |
| Context window degradation | Phase 1 (data model) + Phase 2 (iteration) | Generate v5 of a complex FRD; verify no section loss or contradiction with v1 input |
| Firestore 1 MiB limit | Phase 1: Data Model | Create a maximally complex FRD with 10 versions; verify no write failures |
| TTL orphaned subcollections | Phase 3: Data Retention | Set TTL to 1 minute in staging; verify all subcollections deleted within 2 hours |
| Prompt data leakage | Phase 1: API Layer | Search Cloud Logging for known test prompt text; verify zero results |
| Runaway token costs | Phase 1 (caps) + Phase 2 (billing) | Generate 100 FRDs with varying input sizes; verify max cost variance is <5x |
| Streaming disconnect recovery | Phase 1: Generation Architecture | Kill the browser tab mid-generation; reopen; verify document is complete or resumable |
| Hallucinated requirements | Phase 1 (schema) + Phase 2 (UI) | Generate FRD from minimal input; verify no specific technology/integration hallucinations without provenance flag |
| Noisy gap detection | Phase 2-3: Gap Detection | Run gap detection on 10 different project types; verify <30% dismissal rate |

## Sources

- [Firestore Usage and Limits](https://firebase.google.com/docs/firestore/quotas) -- official docs confirming 1 MiB document size limit
- [Firestore TTL Policies](https://firebase.google.com/docs/firestore/ttl) -- official docs on TTL behavior and limitations
- [Firestore Subcollection Deletion](https://firebase.google.com/docs/firestore/manage-data/delete-data) -- official docs confirming no cascade delete
- [Gemini API Pricing](https://ai.google.dev/gemini-api/docs/pricing) -- official pricing for token costs
- [Gemini Structured Output](https://ai.google.dev/gemini-api/docs/structured-output) -- official docs on JSON schema enforcement
- [Gemini Context Caching](https://ai.google.dev/gemini-api/docs/caching) -- official docs on caching and cost reduction
- [Firebase AI Logic Structured Output](https://firebase.google.com/docs/ai-logic/generate-structured-output) -- Firebase-specific Gemini integration
- [Cloud Run Request Timeout](https://docs.cloud.google.com/run/docs/configuring/request-timeout) -- official docs on Cloud Run timeout limits (up to 60 minutes)
- [OWASP LLM Top 10 2025](https://genai.owasp.org/llmrisk/llm01-prompt-injection/) -- prompt injection ranked #1 vulnerability
- [LLM Security Risks 2026](https://sombrainc.com/blog/llm-security-risks-2026) -- comprehensive security risk overview
- [Resumable LLM Streams](https://upstash.com/blog/resumable-llm-streams) -- architecture pattern for surviving disconnects
- [Context Window Overflow](https://redis.io/blog/context-window-overflow/) -- context window management strategies
- [Gemini Cost Per API Call](https://www.cloudzero.com/blog/gemini-cost-per-api-call/) -- cost control strategies for production
- [AI Pricing Field Report 2025](https://metronome.com/blog/ai-pricing-in-practice-2025-field-report-from-leading-saas-teams) -- credit-based billing challenges
- [SSE Streaming in Next.js](https://upstash.com/blog/sse-streaming-llm-responses) -- Next.js SSE implementation guide
- [LLM Hallucination Survey](https://arxiv.org/html/2510.06265v2) -- comprehensive hallucination research
- [Best Practices for Rendering Streamed LLM Responses](https://developer.chrome.com/docs/ai/render-llm-responses) -- Chrome DevRel streaming UX patterns

---
*Pitfalls research for: FRD Generator (AI-powered document generation)*
*Researched: 2026-02-11*
