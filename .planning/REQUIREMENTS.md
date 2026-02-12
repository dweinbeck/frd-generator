# Requirements: FRD Generator

**Defined:** 2026-02-11
**Core Value:** A user can go from an unstructured idea to a Claude Code-ready FRD in under 10 minutes, with the LLM filling gaps and enforcing completeness.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Project & Session

- [ ] **PROJ-01**: User can create a project by entering a project name
- [ ] **PROJ-02**: User can select between Fast mode and Standard mode with descriptions and time estimates displayed

### Fast Mode

- [ ] **FAST-01**: User can submit a freeform brain dump text input
- [ ] **FAST-02**: System analyzes brain dump against FRD template structure and identifies missing sections/fields
- [ ] **FAST-03**: System presents targeted follow-up prompts for each identified gap
- [ ] **FAST-04**: User can answer follow-up prompts or skip them
- [ ] **FAST-05**: System generates FRD using brain dump content plus any follow-up answers provided

### Standard Mode

- [ ] **STND-01**: System guides user through a structured sequence of questions covering essential FRD sections
- [ ] **STND-02**: User can skip any section or question without breaking the flow
- [ ] **STND-03**: System generates FRD using all collected guided answers

### FRD Generation

- [ ] **GEN-01**: System generates a Markdown FRD using the proven template structure, optimized for Claude Code consumption
- [ ] **GEN-02**: System streams generation output with clear loading/progress indication (app remains responsive)
- [ ] **GEN-03**: User can select model tier: Gemini 2.5 Flash (default/inexpensive) or Gemini 3 Pro (premium)
- [ ] **GEN-04**: System enforces structured output via Gemini responseSchema for consistent format across all generations
- [ ] **GEN-05**: System enforces token/prompt size caps with clear user feedback when limits are exceeded
- [ ] **GEN-06**: System composes prompts server-side (client never sees system prompt or composition logic)

### Export

- [ ] **EXPT-01**: User can copy generated FRD Markdown to clipboard with one click
- [ ] **EXPT-02**: User can download generated FRD Markdown as a .md file

### Versioning & Iteration

- [ ] **VER-01**: Each generation creates a new immutable version linked to the project
- [ ] **VER-02**: User can view a list of all versions for a project with timestamps
- [ ] **VER-03**: User can open and read any prior version
- [ ] **VER-04**: User can provide additional feedback/input to iterate on an existing FRD version
- [ ] **VER-05**: Each iteration creates a new version linked to its parent version
- [ ] **VER-06**: User can compare versions at a basic level (at minimum: side-by-side view)

### Rating & Feedback

- [ ] **RATE-01**: After generation, user can submit a half-star rating (0.5 to 5.0 scale)
- [ ] **RATE-02**: Rating prompt displays: "How well did the generator help you produce an FRD?"
- [ ] **RATE-03**: Rating is stored against the specific generated version

### Authentication & Privacy

- [ ] **AUTH-01**: System integrates with Firebase Auth from platform-infra (dan-weinbeck.com)
- [ ] **AUTH-02**: System validates user identity server-side on every API request (do not trust client-only identifiers)
- [ ] **AUTH-03**: User data is isolated — no cross-user data leakage
- [ ] **AUTH-04**: System records the exact composed prompt sent to Gemini per version
- [ ] **AUTH-05**: Prompt text is visible only to the owning user (no builder/admin read paths)
- [ ] **AUTH-06**: System sanitizes prompt content from all logs, error messages, and analytics (no prompt data in Cloud Logging)

### Credits & Billing

- [ ] **CRED-01**: Initial FRD generation costs 50 credits
- [ ] **CRED-02**: Each iteration costs 25 credits
- [ ] **CRED-03**: System displays credit balance and generation cost before running
- [ ] **CRED-04**: System blocks generation/iteration when credits are insufficient
- [ ] **CRED-05**: User can purchase credits via Stripe Checkout
- [ ] **CRED-06**: System records credit charges with metadata (project_id, version_id, model, timestamp)

### Data Retention & Compliance

- [ ] **DATA-01**: All stored project data (projects, prompts, FRDs, versions, ratings) automatically deleted after 90 days
- [ ] **DATA-02**: Deletion cascades to all subcollections and related artifacts (no orphaned data)
- [ ] **DATA-03**: Basic terms/consent displayed for AI-generated output and data retention

### Observability & Scale

- [ ] **OBS-01**: Structured logging with correlation IDs for key actions and errors
- [ ] **OBS-02**: Analytics event tracking for all key user actions (project_created, mode_selected, frd_generation_started/succeeded/failed, credits_charged, iteration_started/completed, markdown_copied/downloaded, rating_submitted)
- [ ] **OBS-03**: Rate limiting and abuse protection on generation endpoints
- [ ] **OBS-04**: Mobile responsive layout with basic accessibility (keyboard navigation, labels)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

(None -- all identified features included in v1)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| PRD generation / market research / competitive analysis | Not the tool's purpose; FRDs only |
| Technical architecture / low-level design generation | FRD scope only |
| PM tooling (roadmaps, sprints, tickets) | Use dedicated PM tools |
| Multi-user collaboration (comments, approvals) | Single-user workflow |
| Deep domain compliance (HIPAA/SOX) | Compliance-lite only |
| Template marketplace / custom templates | One proven template; avoids complexity |
| Real-time collaborative editing | Massive CRDT/OT complexity; collaboration happens downstream |
| Chat-based conversational interface | Structured input/output is clearer; chat adds cost without focus |
| Jira/Linear/GitHub integration | Integration maintenance burden; users copy markdown |
| Mobile native app | Web-first |
| Streaming token-by-token display | Full document render on completion; streaming progress shown via sections |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| PROJ-01 | Phase 1 | Pending |
| PROJ-02 | Phase 1 | Pending |
| FAST-01 | Phase 1 | Pending |
| FAST-02 | Phase 2 | Pending |
| FAST-03 | Phase 2 | Pending |
| FAST-04 | Phase 2 | Pending |
| FAST-05 | Phase 2 | Pending |
| STND-01 | Phase 2 | Pending |
| STND-02 | Phase 2 | Pending |
| STND-03 | Phase 2 | Pending |
| GEN-01 | Phase 1 | Pending |
| GEN-02 | Phase 1 | Pending |
| GEN-03 | Phase 2 | Pending |
| GEN-04 | Phase 1 | Pending |
| GEN-05 | Phase 1 | Pending |
| GEN-06 | Phase 1 | Pending |
| EXPT-01 | Phase 1 | Pending |
| EXPT-02 | Phase 1 | Pending |
| VER-01 | Phase 1 | Pending |
| VER-02 | Phase 3 | Pending |
| VER-03 | Phase 3 | Pending |
| VER-04 | Phase 3 | Pending |
| VER-05 | Phase 3 | Pending |
| VER-06 | Phase 3 | Pending |
| RATE-01 | Phase 3 | Pending |
| RATE-02 | Phase 3 | Pending |
| RATE-03 | Phase 3 | Pending |
| AUTH-01 | Phase 4 | Pending |
| AUTH-02 | Phase 4 | Pending |
| AUTH-03 | Phase 4 | Pending |
| AUTH-04 | Phase 3 | Pending |
| AUTH-05 | Phase 4 | Pending |
| AUTH-06 | Phase 4 | Pending |
| CRED-01 | Phase 5 | Pending |
| CRED-02 | Phase 5 | Pending |
| CRED-03 | Phase 5 | Pending |
| CRED-04 | Phase 5 | Pending |
| CRED-05 | Phase 5 | Pending |
| CRED-06 | Phase 5 | Pending |
| DATA-01 | Phase 5 | Pending |
| DATA-02 | Phase 5 | Pending |
| DATA-03 | Phase 5 | Pending |
| OBS-01 | Phase 5 | Pending |
| OBS-02 | Phase 5 | Pending |
| OBS-03 | Phase 5 | Pending |
| OBS-04 | Phase 1 | Pending |

**Coverage:**
- v1 requirements: 46 total
- Mapped to phases: 46
- Unmapped: 0

---
*Requirements defined: 2026-02-11*
*Last updated: 2026-02-11 after roadmap creation*
