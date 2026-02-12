# Feature Research

**Domain:** AI-powered Functional Requirements Document generation
**Researched:** 2026-02-11
**Confidence:** MEDIUM-HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Free-text input (brain dump) | Every AI writing tool accepts unstructured input; ChatPRD, WriteMyPrd, and ChatGPT all do this. Users will not fill in rigid forms. | LOW | Single textarea with generous character limit. Must handle messy, stream-of-consciousness input gracefully. |
| Structured output with clear sections | All PRD/FRD generators produce sectioned documents (overview, goals, requirements, user stories, constraints, etc.). Users expect professional structure from AI-generated docs. | MEDIUM | Use the proven FRD template. Markdown with H1/H2/H3 hierarchy, numbered requirements, and clear delineation between sections. |
| Markdown export (copy to clipboard) | Standard across AI writing tools. Users need to paste into Claude Code, Notion, GitHub, etc. One-click copy is expected. | LOW | Copy-to-clipboard with visual confirmation. Markdown is the native output format so no conversion needed. |
| Markdown export (file download) | Companion to clipboard copy. Users expect to save artifacts locally. ChatPRD, Notion, and most AI doc tools offer download. | LOW | Download as `.md` file with sensible filename (project-name-v1.md). |
| Loading / progress indication during generation | LLM generation takes 5-30 seconds. Users who see no feedback assume the app is broken. Every AI tool shows spinners, streaming text, or progress bars. | LOW | Streaming response display is ideal but a clear loading state with estimated time is the minimum. |
| Model selection / quality tier | Becoming standard in AI tools. ChatPRD offers model selection in Pro tier. Users expect control over quality vs. cost tradeoff. | LOW | Two-tier selection (Gemini 2.5 Flash default, Gemini 3 Pro premium). Simple toggle, not a complex configuration panel. |
| Version history | WriteMyPrd and ChatPRD both maintain document history. Users iterate on FRDs and need to access prior versions. Document generation without history feels disposable. | MEDIUM | Immutable version list per project. Each generation or iteration creates a new version. List view with timestamps. |
| Basic error handling and input validation | Users submit empty inputs, exceed token limits, or hit API failures. Every production AI tool handles these gracefully. | LOW | Clear error messages, token/character limit indicators, retry on transient failures. |
| Authentication and user isolation | Users enter proprietary product ideas. They expect their data is private and tied to their account. SOC 2 compliance is increasingly expected (ChatPRD highlights this). | MEDIUM | Firebase Auth integration. Server-side validation. User data scoped by UID. No cross-user data leakage. |
| Mobile-responsive layout | 40%+ of web traffic is mobile. Users expect to at least read and copy their FRDs on mobile, even if they prefer desktop for input. | MEDIUM | Responsive Tailwind layout. Input and output must be usable on mobile. Half-star rating must be touch-friendly. |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Dual-mode input (Fast + Standard)** | No competitor offers both brain-dump-with-gap-detection AND guided Q&A in the same tool. ChatPRD is conversational only; WriteMyPrd is form-only. Offering both lets users match workflow to their readiness level. | HIGH | Two distinct input flows sharing a common generation pipeline. Fast mode requires gap detection logic; Standard mode requires a question flow engine with skip capability. This is the product's primary differentiator. |
| **AI gap detection with targeted follow-ups** | Research confirms follow-up questions produce significantly better documents (arxiv 2407.12017). Most tools either generate from raw input or use rigid Q&A. Analyzing a brain dump, identifying what FRD sections are missing, and asking only the relevant follow-ups is a novel workflow that competitors lack. | HIGH | Requires an intermediate LLM call to analyze the brain dump against the FRD template structure, identify gaps, and generate targeted follow-up prompts. This is the core innovation. |
| **Output optimized for Claude Code consumption** | No AI document generator explicitly optimizes output for LLM consumption. The llms.txt movement and LLM-ready docs trend (GitBook, PixiJS) show this is an emerging need. FRDs structured for Claude Code to parse and act on -- with clear headings, unambiguous requirements, and machine-readable patterns -- is a unique value proposition. | MEDIUM | Applies to template design and prompt engineering rather than application code. The FRD template must use consistent heading structure, numbered requirements, clear scope boundaries, and markdown conventions that LLMs parse well. |
| **User-only prompt visibility (privacy-first design)** | ChatPRD advertises SOC 2 and "never trains on your data." But most tools still let admins see user content. Designing the system so the builder/admin literally cannot read user prompts (no admin endpoints, no logging of prompt content) is a stronger trust signal. | MEDIUM | Architecture constraint rather than a feature to build. Server-side API routes return prompt data only to the authenticated owner. No admin read paths. Structured logging excludes prompt content. |
| **Half-star rating system** | Most AI writing tools either have no feedback mechanism or use simple thumbs up/down. A 10-point scale (half-star on 5 stars) provides granular quality signal for improving prompts and measuring user satisfaction over time. This data is valuable for prompt iteration. | LOW | Well-documented pattern (CSS clip-path or SVG-based). React component with half-star precision. Store rating per version. |
| **Credit-based pricing with transparent costs** | The credit model is the dominant AI SaaS pricing trend (126% YoY growth per PricingSaaS 500 Index). 50 credits for generation / 25 for iteration is clear and predictable. Most PRD generators use opaque monthly subscriptions. Per-action credits let users understand exactly what they pay for. | MEDIUM | Requires Stripe integration, credit balance checking before generation, and transaction recording with metadata. The credit model itself is the differentiator -- not the Stripe plumbing. |
| **90-day auto-deletion with data retention transparency** | Privacy-conscious users (the target audience sharing proprietary ideas) care about data lifecycle. Explicit 90-day retention with automated cleanup is a trust feature that competitors rarely advertise. | MEDIUM | Firestore TTL or scheduled Cloud Run job to delete expired data. Must be communicated clearly in the UI and terms. |
| **Skippable sections in Standard mode** | Rigid Q&A forms cause abandonment. Letting users skip sections they don't know yet (or don't care about) reduces friction while still guiding completeness. The AI can still generate reasonable defaults for skipped sections. | LOW | Standard mode question flow with skip buttons. Skipped sections get AI-inferred defaults with "[AI-inferred -- review recommended]" markers. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Real-time collaborative editing** | "Teams write FRDs together." | Massive complexity (CRDT/OT, presence, conflict resolution). The FRD Generator is a single-user authoring tool -- collaboration happens downstream in Notion/Confluence/GitHub where the markdown is pasted. Building multiplayer adds months of work for a v1 feature nobody needs yet. | Single-user generation with copy/download export. Users paste into their team's collaboration tool of choice. |
| **Custom template editor** | "Let users create their own FRD templates." | Template design requires prompt engineering expertise. Bad templates produce bad FRDs. Supporting arbitrary templates means testing infinite prompt variations. One proven template that works with Claude Code is the product's strength. | One curated, battle-tested FRD template. Iterate on it based on aggregate rating data. Consider template variants (not full customization) in v2+ if ratings reveal patterns. |
| **Chat-based conversational interface** | "Let users refine the FRD through chat, like ChatGPT." | Chat UIs are expensive to build well (message threading, context management, streaming, history). The FRD workflow is structured (input -> generate -> iterate), not open-ended conversation. A chat interface would blur the workflow and increase token costs with unfocused exchanges. | Structured iteration: user provides additional input, system generates a new version. Clear input/output boundaries, not open-ended chat. |
| **PRD / BRD / technical spec generation** | "Why just FRDs? Add PRDs too." | Scope creep that dilutes the product's identity. Each document type needs different templates, different prompts, different quality criteria. Doing one thing excellently beats doing five things mediocrely. FRDs optimized for Claude Code is a sharp, defensible niche. | Stay focused on FRDs. The template and prompts are tuned for functional requirements, not market analysis or business cases. |
| **Jira / Linear / GitHub integration** | "Push requirements directly to my project management tool." | Integration maintenance burden is high. Each PM tool has different APIs, auth flows, and data models. Users already know how to copy markdown into these tools. Building integrations delays core value delivery. | Copy/download export. Users paste into their tools. Revisit integrations only if user research shows copy-paste is a genuine friction point (it rarely is for a generation tool). |
| **Streaming token-by-token output display** | "Show the FRD being written in real-time, like ChatGPT." | Looks cool but adds complexity (SSE/WebSocket handling, partial markdown rendering, error recovery mid-stream). For a structured document generator (not a chatbot), users care about the final result, not watching it appear. Streaming also makes it harder to apply post-processing or quality checks before display. | Show a clear loading state with progress indication. Display the complete, post-processed FRD when generation finishes. Consider streaming as a v2 UX enhancement if users report the wait feels too long. |
| **AI-powered competitive analysis / market research** | "While generating the FRD, also research competitors." | Out of scope for an FRD. Competitive analysis requires web search, different LLM capabilities, and a completely different output structure. Mixing concerns produces neither a good FRD nor good research. | Explicitly out of scope. The FRD captures what to build, not why to build it. Users do market research separately. |
| **Offline / local-first operation** | "Run without internet for security." | LLM inference requires API calls. A local-first architecture adds sync complexity and can't use Gemini API. The privacy concern is addressed through user-only prompt visibility and 90-day deletion, not local execution. | Server-side generation with strong privacy controls. Transparent data handling policy. |

## Feature Dependencies

```
[Firebase Auth Integration]
    |-- requires --> [User Data Isolation]
    |                   |-- requires --> [User-Only Prompt Visibility]
    |                   |-- enables  --> [Version History (per user)]
    |                   |-- enables  --> [Rating System (per user)]
    |
    |-- enables  --> [Credit System / Stripe Integration]
                        |-- gates   --> [Generation Endpoint]
                        |-- gates   --> [Iteration Endpoint]

[Brain Dump Input (Fast Mode)]
    |-- requires --> [FRD Template Structure]
    |-- requires --> [Gemini API Integration]
    |-- feeds    --> [Gap Detection Engine]
                        |-- produces --> [Targeted Follow-Up Prompts]
                        |-- feeds    --> [Final FRD Generation]

[Guided Q&A Input (Standard Mode)]
    |-- requires --> [FRD Template Structure]
    |-- requires --> [Gemini API Integration]
    |-- requires --> [Question Flow Engine]
    |-- feeds    --> [Final FRD Generation]

[Final FRD Generation]
    |-- produces --> [Immutable Version]
    |                   |-- enables  --> [Version History View]
    |                   |-- enables  --> [Copy to Clipboard]
    |                   |-- enables  --> [Download as .md File]
    |                   |-- enables  --> [Half-Star Rating]
    |
    |-- enables  --> [Iteration Flow]
                        |-- requires --> [Credit Deduction (25 credits)]
                        |-- produces --> [New Immutable Version]

[FRD Template Structure]
    (no dependencies -- this is a foundational artifact)

[Gemini API Integration]
    |-- requires --> [Vercel AI SDK Setup]
    |-- requires --> [API Key Management]
    |-- enables  --> [Model Tier Selection]
```

### Dependency Notes

- **FRD Template Structure has zero dependencies**: It's a markdown template + prompt engineering artifact. Must be finalized before any generation work begins. Everything depends on it.
- **Firebase Auth gates user-scoped features**: Version history, ratings, prompt visibility, and credit enforcement all require knowing who the user is. Auth can be stubbed for development but must be real before any data persistence.
- **Gap Detection requires two LLM calls**: First call analyzes the brain dump and identifies missing sections. Second call generates the FRD using brain dump + follow-up answers. This means Fast mode is architecturally more complex than Standard mode.
- **Credit System gates generation but doesn't block development**: The generation pipeline can be built and tested without credits. Credit enforcement wraps the generation endpoint -- it doesn't change how generation works.
- **Iteration is just generation with context**: Each iteration takes the prior version + new user input and generates a new version. The generation pipeline handles both initial and iteration requests -- the difference is whether prior context is included.

## MVP Definition

### Launch With (v1)

Minimum viable product -- what's needed to validate the concept.

- [ ] **FRD Template Structure** -- the foundational artifact everything depends on. Without a good template, nothing else matters.
- [ ] **Brain dump input (Fast mode)** -- the primary differentiator. Users paste their unstructured idea and get a structured FRD.
- [ ] **Gap detection with follow-up prompts** -- the core innovation. AI identifies what's missing and asks targeted questions.
- [ ] **FRD generation via Gemini** -- the core value delivery. Structured markdown output optimized for Claude Code.
- [ ] **Copy to clipboard** -- minimum viable export. Users need to get the FRD out of the app.
- [ ] **Download as .md file** -- secondary export. Low effort, high value.
- [ ] **Loading state during generation** -- prevents confusion during 5-30 second generation.
- [ ] **Basic error handling** -- graceful failures when API calls fail or input exceeds limits.
- [ ] **Version creation (immutable)** -- each generation creates a version. Even without full version history UI, the data model must support it.

### Add After Validation (v1.x)

Features to add once core is working.

- [ ] **Standard mode (guided Q&A)** -- add when user feedback indicates some users need more structure than brain dump provides
- [ ] **Version history view** -- add when users start iterating and need to compare versions
- [ ] **Iteration flow** -- add when users report wanting to refine their FRDs rather than regenerating from scratch
- [ ] **Half-star rating system** -- add when there's enough generation volume to make the feedback data meaningful
- [ ] **Model tier selection (Flash/Pro)** -- add when the generation pipeline is stable and you want to offer a premium tier
- [ ] **Firebase Auth integration** -- add when platform-infra auth is ready; stub auth during development
- [ ] **User-only prompt visibility** -- add with auth; requires server-side access control
- [ ] **Mobile-responsive layout** -- add after desktop UX is validated; responsive Tailwind from the start reduces retrofit cost

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] **Credit system / Stripe integration** -- defer until you have paying users or are ready to monetize. Free during validation phase.
- [ ] **90-day auto-deletion** -- defer until data volume justifies automated cleanup. Manual deletion is fine early on.
- [ ] **Analytics event tracking** -- defer until core flows are stable. Adding analytics to a changing UI wastes effort.
- [ ] **Rate limiting / abuse protection** -- defer until the app is public. During validation, low traffic doesn't need rate limiting.
- [ ] **Skippable sections in Standard mode** -- defer until Standard mode is built and users report friction with rigid Q&A
- [ ] **Version comparison (diff view)** -- defer until users explicitly request it; version list is sufficient for v1.x

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| FRD Template Structure | HIGH | LOW | P1 |
| Brain dump input (Fast mode) | HIGH | LOW | P1 |
| Gap detection + follow-ups | HIGH | HIGH | P1 |
| FRD generation (Gemini) | HIGH | MEDIUM | P1 |
| Copy to clipboard | HIGH | LOW | P1 |
| Download as .md | MEDIUM | LOW | P1 |
| Loading state | HIGH | LOW | P1 |
| Error handling | HIGH | LOW | P1 |
| Version creation (data model) | MEDIUM | MEDIUM | P1 |
| Standard mode (guided Q&A) | MEDIUM | HIGH | P2 |
| Version history view | MEDIUM | LOW | P2 |
| Iteration flow | MEDIUM | MEDIUM | P2 |
| Half-star rating | MEDIUM | LOW | P2 |
| Model tier selection | MEDIUM | LOW | P2 |
| Firebase Auth integration | HIGH | MEDIUM | P2 |
| User-only prompt visibility | HIGH | MEDIUM | P2 |
| Mobile-responsive layout | MEDIUM | MEDIUM | P2 |
| Credit system (Stripe) | MEDIUM | HIGH | P3 |
| 90-day auto-deletion | LOW | MEDIUM | P3 |
| Analytics tracking | LOW | MEDIUM | P3 |
| Rate limiting | LOW | LOW | P3 |
| Skippable sections | LOW | LOW | P3 |
| Version diff view | LOW | MEDIUM | P3 |

**Priority key:**
- P1: Must have for launch (core value delivery)
- P2: Should have, add when possible (completes the experience)
- P3: Nice to have, future consideration (polish and scale)

## Competitor Feature Analysis

| Feature | ChatPRD | WriteMyPrd | Gemini/ChatGPT (raw) | FRD Generator (Our Approach) |
|---------|---------|------------|----------------------|------------------------------|
| **Input method** | Conversational chat | Form-based Q&A | Free-text prompt | Dual: brain dump OR guided Q&A |
| **Gap detection** | Asks clarifying questions in chat flow | Guiding questions upfront | None -- user must prompt | AI analyzes brain dump, identifies missing FRD sections, generates targeted follow-ups |
| **Output format** | PRD (generic sections) | PRD (goals, stories, requirements) | Unstructured (whatever you ask for) | FRD-specific markdown optimized for Claude Code parsing |
| **Output audience** | Human stakeholders | Human stakeholders | Human reader | AI coding assistants (Claude Code) -- unique positioning |
| **Versioning** | Document history within platform | None (copy-paste only) | Chat history only | Immutable versions with full history per project |
| **Rating/feedback** | None visible | None | Thumbs up/down | Half-star (10-point scale) per version |
| **Export** | Copy, integrations (Jira, Linear, etc.) | Copy-paste only | Copy | Copy + .md file download |
| **Template control** | Multiple templates, custom templates (Pro) | Fixed structure | No template | One curated, battle-tested FRD template |
| **Privacy** | SOC 2, "never trains on data" | Unclear | Data used for training (varies) | User-only prompt visibility, no admin access, 90-day deletion |
| **Pricing** | $8-24/month subscription | Free | Free / subscription | Credit-based (50 gen / 25 iter) -- pay per use |
| **LLM model** | Multiple (Pro tier) | GPT-3 | Their own model | Gemini 2.5 Flash (default) / Gemini 3 Pro (premium) |
| **Target user** | Product managers | Product owners, startups | General | Developers/PMs who use Claude Code for implementation |

### Key Competitive Insights

1. **No tool generates FRDs specifically** -- the market is dominated by PRD generators. FRDs are a distinct document type focused on functional behavior, not market positioning. This is an open niche.

2. **No tool optimizes output for LLM consumption** -- every competitor targets human readers. Generating markdown structured for Claude Code to parse and act on is genuinely novel.

3. **Gap detection is rare and shallow** -- ChatPRD asks clarifying questions but within an open-ended chat. No tool analyzes structured input against a template schema to identify specific missing sections. The targeted follow-up approach is the strongest differentiator.

4. **Credit-based pricing is trending** -- 126% YoY growth in credit adoption among SaaS tools. Per-action credits (50/25) are transparent and align cost with value delivered.

5. **Privacy as a feature is underexploited** -- ChatPRD mentions SOC 2 but most tools are vague about data handling. Explicit "we literally cannot see your prompts" is a stronger trust signal, especially for users sharing proprietary product ideas.

## Sources

- [ChatPRD - AI Copilot for Product Managers](https://www.chatprd.ai/) -- MEDIUM confidence (official site)
- [ChatPRD Pricing](https://www.chatprd.ai/pricing) -- MEDIUM confidence (official site)
- [WriteMyPrd Review - ToolCentral](https://www.toolcentral.ai/news/n1765454893enfpvs/) -- MEDIUM confidence (review site)
- [WriteMyPrd](https://writemyprd.com/) -- MEDIUM confidence (official site)
- [5 Best AI Tools for Requirements Gathering - aqua-cloud.io](https://aqua-cloud.io/ai-tools-for-requirements-management/) -- MEDIUM confidence (comparison article, 2026)
- [15 Best AI Requirements Management Tools - The Digital Project Manager](https://thedigitalprojectmanager.com/tools/best-ai-requirements-management-tools/) -- MEDIUM confidence (comparison article, 2026)
- [20 Best AI PRD Generators - Oreate AI](https://www.oreateai.com/blog/ai-prd-generator/) -- MEDIUM confidence (comparison article)
- [Follow-Up Questions Improve Documents - arxiv 2407.12017](https://arxiv.org/abs/2407.12017) -- HIGH confidence (peer-reviewed research)
- [AI Detect Missing Sections - Legitt AI](https://legittai.com/blog/ai-detect-missing-sections-in-proposal) -- MEDIUM confidence (vendor blog)
- [Brain Dump to Strategy - Anchor Change](https://anchorchange.substack.com/p/how-to-turn-a-brain-dump-into-a-strategy) -- MEDIUM confidence (practitioner article)
- [I Tested 5 AI Tools to Write a PRD - Fireside PM](https://firesidepm.substack.com/p/i-tested-5-ai-tools-to-write-a-prdheres) -- MEDIUM confidence (hands-on comparison)
- [SaaS Credits System Guide 2026 - ColorWhistle](https://colorwhistle.com/saas-credits-system-guide/) -- MEDIUM confidence (industry guide)
- [FRD Validation Guide - DocsBot](https://docsbot.ai/prompts/business/frd-validation-guide) -- MEDIUM confidence (prompt template)
- [FRD Generator Prompt - DocsBot](https://docsbot.ai/prompts/business/functional-requirements-document-generator) -- MEDIUM confidence (prompt template)
- [LLM-Ready Docs - GitBook](https://gitbook.com/docs/publishing-documentation/llm-ready-docs) -- HIGH confidence (official docs)
- [Gemini Models Comparison - Appaca](https://www.appaca.ai/resources/llm-comparison/gemini-3-pro-vs-gemini-2.5-flash) -- MEDIUM confidence (comparison article, 2026)
- [Half Star Rating in React - LogRocket](https://blog.logrocket.com/build-a-half-star-rating-component-in-react-from-scratch/) -- HIGH confidence (technical tutorial)
- [Reviews and Ratings UX - Smart Interface Design Patterns](https://smart-interface-design-patterns.com/articles/reviews-and-ratings-ux/) -- HIGH confidence (UX reference)
- [PRD Template - Product School](https://productschool.com/blog/product-strategy/product-template-requirements-document-prd) -- MEDIUM confidence (industry standard)
- [AI Pricing Models 2026 - GetMonetizely](https://www.getmonetizely.com/blogs/the-2026-guide-to-saas-ai-and-agentic-pricing-models) -- MEDIUM confidence (industry report)

---
*Feature research for: AI-powered FRD generation*
*Researched: 2026-02-11*
