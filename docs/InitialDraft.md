# Product Requirements & Execution Plan
## AI-Powered Google Review Management SaaS

**Document version:** 1.0  
**Status:** Product planning  
**Product type:** Multi-tenant SaaS  
**Primary goal:** Help businesses manage Google reviews through AI-generated replies, human approval, and a structured feedback-learning system.

---

## 1. Product Vision

Build a simple platform where a business owner signs in using Google, connects the Google Business Profile locations they are authorized to manage, views customer reviews, and receives AI-generated reply suggestions.

Initially, **every AI-generated reply must be approved by a human before publishing**.

Users should be able to:
- View customer reviews and star ratings.
- See the proposed AI reply beside the original review.
- Edit, approve, reject, or regenerate a reply.
- Explain what was wrong with a generated reply.
- Teach the AI their preferred tone, wording, and business-specific rules.
- Publish approved replies to Google.
- Track publication status and errors.
- Manage multiple business locations under one account.

### Product principle

**AI proposes. Humans decide. The system learns from corrections. Google receives only explicitly approved replies.**

## 2. Goals and Non-goals

### MVP goals

1. Secure Google OAuth authentication and account connection.
2. Discover accessible business accounts and locations.
3. Fetch and display reviews.
4. Generate contextual reply drafts.
5. Require explicit human approval for every draft.
6. Capture feedback and corrected replies.
7. Improve future drafts using approved preferences and examples.
8. Publish approved replies reliably.
9. Support multiple customers, organizations, users, and locations.
10. Maintain an audit trail and protect customer data.

### Not in the initial MVP

- Automatic publishing without human approval.
- AI modifying its own production system prompt.
- Fine-tuning a model on every individual correction.
- Review solicitation or manipulation of star ratings.
- Unsupported review-platform integrations.
- Complex analytics, billing, white-labeling, and agency features beyond the minimum required for onboarding.

---

## 3. Target Users and Roles

### Business owner
Connects Google, selects locations, configures reply preferences, and approves drafts.

### Reviewer / staff member
Reviews customer feedback, edits drafts, and submits replies for approval or publication according to permissions.

### Organization administrator
Manages team members, locations, preferences, and access.

### SaaS platform administrator
Manages operational health, integration status, support, model configuration, and abuse prevention. Access to customer content must be restricted and audited.

Every organization is a separate tenant. A user can belong to multiple organizations, and each organization can manage multiple authorized locations.

---

## 4. Core User Journey

1. User creates a platform account or signs in.
2. User connects Google through OAuth with the required permissions.
3. Platform discovers accessible Business Profile accounts and locations.
4. User explicitly selects the locations to manage and confirms authorization.
5. Platform synchronizes eligible reviews.
6. AI generates a draft using the review, location-specific context, and approved writing preferences.
7. Draft appears in the review inbox.
8. Human reviews the original review and proposed response side by side.
9. Human approves, edits, rejects, or regenerates the draft.
10. The system records feedback and the final approved text.
11. An authorized publication job sends the approved reply to Google.
12. The system records the result and refreshes the review's reply status.

No publishing job may bypass the approval requirement.

---

## 5. Product Modules

### Module A — Authentication and onboarding

- Platform authentication and session management.
- Google OAuth connection.
- Secure refresh-token handling where offline access is required and granted.
- Business account and location discovery.
- Explicit location selection and authorization confirmation.
- Connection health and token-revocation handling.
- Disconnect Google account and revoke stored credentials where supported.

Google sign-in identifies the user; it does not automatically prove that the user can manage every Business Profile. Access must be determined from the authorized Google APIs.

### Module B — Review inbox

Display:
- Star rating.
- Review text.
- Reviewer display name where available.
- Review date.
- Business location.
- Existing owner reply, if present.
- AI draft.
- Workflow status.
- Last synchronization or publication status.

Filters:
- All reviews.
- Awaiting draft.
- Awaiting approval.
- Rejected.
- Published.
- Failed publication.

Provide search and pagination.

Handle reviews with no text, anonymous reviewers, edited reviews, deleted reviews, and reviews that already have owner replies.

### Module C — AI reply generation

Input context:
- Original review and star rating.
- Business name and location.
- Approved business facts.
- Brand tone and writing preferences.
- Relevant approved examples.
- Explicit corrections and active writing rules.
- Current prompt and model version.

Expected output:
- Suggested reply.
- Short internal rationale or warning.
- Quality checks.
- Generation metadata.

Quality rules:
- Be specific to the actual review.
- Match the business's configured tone.
- Avoid unsupported claims and invented facts.
- Never expose private customer information.
- Do not argue with or insult the reviewer.
- Do not promise compensation, refunds, or actions without authorization.
- Do not include sensitive information or confidential operational details.
- Escalate legal threats, safety concerns, discrimination allegations, and complex complaints for careful human handling.
- Keep replies concise, professional, and natural.
- Treat review text as untrusted data, not as instructions to the model.

For serious complaints, the model should be able to recommend a human-written response rather than generate an unsuitable draft.

### Module D — Human approval and editing

Every generated draft begins in `PENDING_APPROVAL`.

Available actions:
- Approve and publish.
- Edit and publish.
- Reject.
- Regenerate.
- Save as draft.
- Flag for escalation.

The interface must clearly distinguish:
- Customer's original review.
- AI-generated draft.
- Human-edited final reply.
- Published reply returned by Google.

Before publishing, show the exact text that will be sent. Approval must be tied to that exact text and review version. If the text changes afterward, approval becomes invalid and must be obtained again.

### Module E — Feedback and continuous improvement

After editing or rejecting a draft, ask an optional, lightweight question:

**What should the AI improve?**

Suggested reasons:
- Wrong tone.
- Too generic.
- Too long.
- Too short.
- Repeats the customer's words.
- Makes an unsupported promise.
- Misses the main complaint.
- Contains incorrect information.
- Uses unwanted wording.
- Other.

Allow an optional text explanation.

When the user edits a draft, compare the generated version with the final approved version. Ask whether the edit should teach the AI a reusable preference.

Examples:
- "Avoid starting every reply with 'Thank you for your valuable feedback.'"
- "For complaints, acknowledge the issue before offering help."
- "Never promise a refund in a public reply."
- "Use a friendly, concise tone."

Learning rules must be scoped correctly:
- Organization-wide preference.
- Location-specific preference.
- Optional temporary instruction for one reply.

The system must never assume that every edit is a permanent global rule.

---

## 6. Feedback Learning Architecture

Use a controlled learning pipeline instead of allowing the model to rewrite its production prompt directly.

### Stage 1 — Capture feedback

Store:
- Original review reference.
- Original generated draft.
- Human-edited final text.
- Feedback category and explanation.
- User and organization IDs.
- Model, prompt, and policy versions.
- Timestamp and approval result.

### Stage 2 — Classify feedback

Use deterministic rules where possible and an LLM classifier when needed.

Produce structured data:
- Feedback category.
- Proposed preference.
- Scope.
- Confidence.
- Whether the suggestion conflicts with existing rules.
- Whether human confirmation is required.

### Stage 3 — Convert feedback into a candidate rule

Example:

**Repeated feedback:** Replies are too long.

**Candidate rule:** Keep ordinary review replies to two or three concise sentences unless the complaint requires additional explanation.

The system should identify repeated patterns rather than turn every one-off edit into a permanent instruction.

### Stage 4 — Validate the rule

Check:
- Does it conflict with existing rules?
- Could it encourage misleading or inappropriate responses?
- Is it specific enough to be useful?
- Does it conflict with Google policies?
- Does it apply to one location or the whole organization?

For the MVP, require user confirmation before activating learned rules. Users must be able to inspect, edit, disable, and delete them.

### Stage 5 — Version and evaluate

Create a new configuration version rather than overwriting the previous one.

Run a representative test set against the old and new configurations. Compare:
- Factual accuracy.
- Tone compliance.
- Conciseness.
- Unsupported promises.
- Repetition.
- Policy compliance.
- Human edit rate and approval rate.

Reject or roll back changes that regress important quality metrics.

### Stage 6 — Apply approved preferences

Future generations use the active approved rules and a small set of relevant examples.

**Important:** This is preference retrieval and controlled prompt/configuration improvement, not automatic model training. Fine-tuning can be considered later if there is enough high-quality, permissioned data.

---

## 7. Recommended Technical Architecture

### Frontend
- Next.js App Router.
- TypeScript.
- Tailwind CSS.
- Accessible, responsive components.
- Server-side authorization checks for protected data.

### Backend
- Node.js.
- Fastify REST API.
- Zod for request validation.
- Centralized authentication, tenant authorization, and policy enforcement.

### Data and background processing
- PostgreSQL as the source of truth.
- Prisma ORM and migrations.
- Redis + BullMQ for background jobs, retries, and scheduling.
- Transactional outbox pattern for reliable job dispatch.

### AI integration
Create a provider-independent `AIProvider` interface.

Responsibilities:
- Generate reply drafts.
- Classify feedback.
- Extract candidate preferences.
- Evaluate reply quality.
- Run regression tests.

Provider options can include OpenAI, Anthropic, Google Gemini, or self-hosted models, subject to quality, cost, data-processing terms, and availability.

Use structured output schemas, strict application validation, and provider-specific adapters. Keep model selection configurable by environment or organization policy.

### Google integration
Create a dedicated Google Business Profile adapter responsible for:
- OAuth and token refresh.
- Account and location discovery.
- Review synchronization.
- Reply publication.
- API error mapping.
- Rate-limit handling.

Keep Google API code separate from business logic and AI generation.

### Deployment
A reasonable starting setup:
- Next.js frontend.
- Fastify API.
- Separate Node.js worker process.
- Managed PostgreSQL.
- Managed Redis.
- Secret manager.
- Centralized logging, metrics, and alerts.

Deploy API and worker independently so background processing does not block interactive requests.

---

## 8. Architecture and Request Flow

```text
Next.js Web App
      |
      v
Fastify REST API
      |
      +---- Authentication and tenant authorization
      |
      +---- PostgreSQL
      |       Organizations, users, reviews,
      |       drafts, approvals, feedback, audit
      |
      +---- Transactional Outbox
                  |
                  v
             Redis / BullMQ
                  |
                  v
             Node.js Worker
                  |
           +------+------+
           |             |
           v             v
      AI Provider    Google Business
      Adapter        Profile Adapter
           |             |
           v             v
      Draft and      Reviews and
      Quality Checks Published Replies
```

### Generation flow

1. API validates the request and tenant access.
2. Database confirms the review is eligible for generation.
3. A generation job is queued.
4. Worker builds context from active approved preferences.
5. AI generates a structured draft.
6. Server-side checks validate the draft.
7. Draft is saved with model and prompt versions.
8. UI displays the draft for human review.

### Publishing flow

1. Authorized human approves the exact draft.
2. API records approval transactionally.
3. Publication job is queued.
4. Worker verifies approval, review version, connection status, and location authorization.
5. Worker calls the Google reply endpoint.
6. Result is recorded, including external reply status where available.
7. Failures enter a retry or manual-reconciliation workflow.

---

## 9. Database Design

Every tenant-owned record must have an organization scope. Use foreign keys and composite constraints where appropriate.

### Core tables

**users**
- `id`
- `email`
- `display_name`
- `created_at`
- `updated_at`

**organizations**
- `id`
- `name`
- `created_at`
- `updated_at`

**organization_members**
- `id`
- `organization_id`
- `user_id`
- `role`
- `status`
- `created_at`

**google_connections**
- `id`
- `organization_id`
- `google_subject_id`
- `encrypted_refresh_token`
- `granted_scopes`
- `connection_status`
- `token_expires_at`
- `created_at`
- `updated_at`

**business_locations**
- `id`
- `organization_id`
- `google_connection_id`
- `google_account_resource_name`
- `google_location_resource_name`
- `display_name`
- `timezone`
- `connection_status`
- `last_sync_at`

**reviews**
- `id`
- `organization_id`
- `business_location_id`
- `google_review_resource_name`
- `rating`
- `review_text`
- `reviewer_display_name`
- `review_created_at`
- `google_updated_at`
- `owner_reply_text`
- `workflow_status`
- `last_synced_at`

**reply_drafts**
- `id`
- `organization_id`
- `review_id`
- `generated_text`
- `final_text`
- `model_provider`
- `model_name`
- `prompt_version`
- `preference_version`
- `quality_status`
- `created_by`
- `created_at`
- `updated_at`

**reply_approvals**
- `id`
- `organization_id`
- `reply_draft_id`
- `approved_by`
- `approved_text_hash`
- `approved_at`
- `revoked_at`

**review_feedback**
- `id`
- `organization_id`
- `reply_draft_id`
- `feedback_category`
- `feedback_text`
- `generated_text_snapshot`
- `corrected_text`
- `scope`
- `created_by`
- `created_at`

**ai_preferences**
- `id`
- `organization_id`
- `business_location_id` (nullable for organization-wide preferences)
- `rule_text`
- `rule_category`
- `source_feedback_id`
- `status`
- `created_by`
- `approved_by`
- `version`
- `created_at`
- `updated_at`

**prompt_versions**
- `id`
- `organization_id` (nullable for global defaults)
- `version`
- `configuration_json`
- `status`
- `created_at`
- `created_by`

**publication_jobs**
- `id`
- `organization_id`
- `reply_draft_id`
- `status`
- `idempotency_key`
- `attempt_count`
- `last_error_code`
- `last_error_message`
- `published_at`
- `created_at`
- `updated_at`

**audit_logs**
- `id`
- `organization_id`
- `actor_user_id`
- `action`
- `resource_type`
- `resource_id`
- `metadata_json`
- `created_at`

**Important implementation details**
- Use UUIDs for internal IDs.
- Enforce uniqueness on the Google review resource name within its location or connection scope.
- Add indexes for organization, location, workflow status, review timestamps, and pending publication jobs.
- Use database transactions for approval and job creation.
- Keep immutable generation snapshots for audit purposes, subject to the applicable data-retention policy.
- Define and implement deletion, retention, and redaction rules before production.
- Google API content has specific storage restrictions; the retention design must comply with Google's current policies. Do not assume every review field can be retained indefinitely.

---

## 10. API Endpoint Plan

All endpoints require authentication unless explicitly designated public. All organization-owned resources require server-side tenant authorization.

### Authentication and onboarding
- `GET /api/v1/auth/google` — start Google OAuth.
- `GET /api/v1/auth/google/callback` — process OAuth callback.
- `GET /api/v1/google/accounts` — list accessible accounts.
- `GET /api/v1/google/locations` — list accessible locations.
- `POST /api/v1/locations/connect` — connect selected locations.
- `DELETE /api/v1/google/connections/:id` — disconnect a Google connection.

### Reviews
- `GET /api/v1/reviews` — paginated, filtered review inbox.
- `GET /api/v1/reviews/:id` — review details.
- `POST /api/v1/reviews/:id/generate` — request a draft.
- `POST /api/v1/reviews/:id/regenerate` — generate another draft.
- `POST /api/v1/reviews/:id/feedback` — submit draft feedback.

### Drafts and approvals
- `GET /api/v1/reply-drafts/:id` — fetch draft details.
- `PATCH /api/v1/reply-drafts/:id` — edit draft.
- `POST /api/v1/reply-drafts/:id/approve` — approve exact text and enqueue publishing.
- `POST /api/v1/reply-drafts/:id/reject` — reject a draft.
- `POST /api/v1/reply-drafts/:id/publish` — publish only if valid approval exists.

The approve endpoint should be the normal user path for approval and publication. Do not permit an unapproved draft to be published through an alternate endpoint.

### Preferences and learning
- `GET /api/v1/preferences` — list active and proposed preferences.
- `POST /api/v1/preferences` — create a manual preference.
- `PATCH /api/v1/preferences/:id` — update a preference.
- `POST /api/v1/preferences/:id/approve` — activate a candidate rule.
- `POST /api/v1/preferences/:id/disable` — disable a rule.
- `GET /api/v1/ai/quality` — organization-scoped quality summary.

### Operations
- `GET /api/v1/jobs/:id` — check job status.
- `POST /api/v1/sync` — request a permitted synchronization.
- `GET /api/v1/audit-logs` — retrieve authorized audit events.
- `GET /health` — health check.
- `GET /ready` — readiness check.

Use consistent pagination, error codes, request IDs, validation, and rate limiting.

---

## 11. Review and Reply State Machines

### Review workflow

```text
SYNCED
  |
  v
DRAFT_PENDING
  |
  v
PENDING_APPROVAL
  |        |         |
  v        v         v
APPROVED  REJECTED  REGENERATING
  |
  v
PUBLISH_QUEUED
  |
  +----> PUBLISHED
  |
  +----> PUBLISH_FAILED
```

Use explicit transitions and server-side guards. An edited draft must invalidate an earlier approval if the approved content changes.

A failed publication must not automatically turn into an unapproved retry of different content.

### Preference workflow

```text
FEEDBACK_CAPTURED
        |
        v
CANDIDATE_RULE
        |
        v
VALIDATION
        |
        +----> REJECTED
        |
        v
AWAITING_CONFIRMATION
        |
        v
ACTIVE_VERSION
        |
        v
EVALUATED / ROLLBACK
```

---

## 12. Security Requirements

### Google OAuth
- Request only the scopes required for the supported functionality.
- Use state validation and PKCE where applicable.
- Validate OAuth callback parameters and redirect destinations.
- Encrypt refresh tokens using a managed key or equivalent secure encryption system.
- Never expose tokens to the browser or logs.
- Support token revocation, expiry, and reauthorization.
- Confirm Google API project eligibility and any verification or review requirements before production.

### Multi-tenant isolation
- Every database query must be tenant-scoped.
- Derive organization access from the authenticated membership, not from a client-supplied organization ID alone.
- Enforce role permissions on every sensitive operation.
- Test cross-tenant access using automated security tests.
- Consider PostgreSQL row-level security as an additional defense, not a substitute for correct application authorization.

### AI security
- Treat review text and feedback as untrusted input.
- Prevent prompt injection from changing system rules or triggering tools.
- Do not provide models with direct Google publishing credentials or unrestricted publishing tools.
- Keep approval, policy enforcement, and publication authorization in deterministic backend code.
- Validate output for unsupported facts, sensitive disclosures, and prohibited content.
- Do not log secrets or send unnecessary personal information to model providers.

### Operational security
- Use HTTPS.
- Store secrets in a managed secret store.
- Apply API rate limits and abuse controls.
- Maintain immutable security-relevant audit events.
- Define backups, disaster recovery, incident response, and data-deletion procedures.
- Review vendor retention and data-processing terms for every AI provider.

---

## 13. UI and UX Specification

### Design direction
Minimal, clean, fast, and focused on the review task. Avoid a crowded analytics dashboard in the MVP.

### Main layout
- Left navigation: Reviews, Locations, AI Preferences, Team, Settings.
- Top bar: Current organization, location selector, account menu.
- Main area: Review inbox.
- Detail panel: Original review and reply editor.

### Review card

**Customer review**
- Star rating.
- Reviewer name, if available.
- Date.
- Original review text.

**AI reply**
- Generated text in an editable field.
- Clear AI-generated label.
- Regenerate action.
- Edit and approve action.
- Reject action.
- Feedback shortcut.

**Publication status**
- Awaiting approval.
- Publishing.
- Published.
- Failed — retry or reconnect.

For desktop, use a two-column layout showing the original review and AI reply side by side. On mobile, stack them vertically.

### Feedback interaction

After a user edits or rejects a draft, show a compact optional feedback area rather than a long questionnaire.

Example:

**What should improve?**

[Too generic] [Wrong tone] [Too long] [Incorrect information] [Other]

Optional text field: "Tell the AI what to do differently."

Buttons: **Save feedback** and **Skip**.

Show the active preferences separately so users can understand what the AI has learned and change them whenever needed.

### Accessibility
- Keyboard-accessible actions.
- Visible focus states.
- Adequate contrast.
- Screen-reader labels.
- Confirmation for publishing and destructive actions.
- Clear loading, empty, error, and offline states.

---

## 14. Testing and Acceptance Criteria

### OAuth and permissions
- A user can connect an authorized Google account.
- Locations are limited to those accessible through the granted permissions.
- Revoked or expired access is handled safely.
- Unauthorized users cannot access another organization's data.

### Review synchronization
- Pagination works correctly.
- Duplicate reviews are not created.
- Updates and existing replies are reconciled.
- API errors and rate limits do not cause uncontrolled retries.
- Data retention and deletion policies are enforced.

### AI generation
- The output matches the defined schema.
- Drafts do not contain invented business facts.
- Negative or sensitive reviews are handled cautiously.
- Feedback is saved with the correct tenant and draft.
- Candidate preferences cannot activate without the required approval.
- Regression tests detect repeated phrases and known mistakes.

### Approval and publishing
- Every draft requires explicit approval.
- Editing a draft after approval invalidates the approval.
- Only authorized members can approve and publish.
- Duplicate jobs do not create duplicate side effects where preventable.
- Timeouts and uncertain publication results are reconciled before retrying.
- A successful Google response is recorded accurately.

### MVP definition of done
The MVP is complete only when a real authorized user can connect a permitted location, retrieve a review, generate a draft, give feedback, edit and approve the exact reply, publish it successfully, and inspect the resulting status — without being able to cross tenant boundaries or bypass approval.

---

## 15. Phased Development Roadmap

### Phase 0 — Feasibility and compliance
- Verify Google Business Profile API access and project eligibility.
- Confirm the applicable API terms, review data retention, and third-party SaaS rules.
- Validate OAuth and access to test business locations.
- Confirm the required APIs and reply operations are available.
- Document unresolved compliance risks.

**Exit criterion:** A validated integration plan and successful authorized API proof of concept.

### Phase 1 — Foundation
- Set up repository structure and development environments.
- Configure Next.js, Fastify, PostgreSQL, Prisma, Redis, and BullMQ.
- Implement authentication, organization membership, and role authorization.
- Add migrations, validation, logging, and automated tests.

**Exit criterion:** A user can create an organization and access only its resources.

### Phase 2 — Google integration
- Implement OAuth and secure token storage.
- Discover accounts and locations.
- Synchronize reviews and existing replies.
- Add rate-limit handling, retry policies, and retention controls.

**Exit criterion:** An authorized location's reviews appear correctly in the inbox.

### Phase 3 — Review inbox and approval
- Build review cards and detail views.
- Implement editing, approval, rejection, and status transitions.
- Add transactional job creation and worker processing.
- Implement publication reconciliation.

**Exit criterion:** Approved replies publish successfully, and unapproved drafts cannot be published.

### Phase 4 — AI reply generation
- Implement provider abstraction.
- Define prompts and structured output schemas.
- Add business tone settings and safety checks.
- Record model and prompt versions.
- Build the human approval interface.

**Exit criterion:** Generated drafts are useful, validated, and always require human approval.

### Phase 5 — Feedback learning
- Capture edits, rejection reasons, and optional explanations.
- Generate candidate preference rules.
- Add confirmation, versioning, evaluation, and rollback.
- Build a preference-management UI.

**Exit criterion:** Approved preferences improve future drafts without silently changing production rules.

### Phase 6 — Hardening and beta
- Test tenant isolation and OAuth failure scenarios.
- Add monitoring, alerts, backup recovery, and operational dashboards.
- Test model failures, duplicate jobs, and uncertain Google API outcomes.
- Run a limited beta with authorized customers.
- Validate cost per review and human approval quality.

**Exit criterion:** Stable, policy-compliant beta with documented operational procedures.

### Phase 7 — Production evolution
- Add billing and subscription limits.
- Improve reporting and team collaboration.
- Add configurable policies and additional model providers.
- Consider optional automation only after explicit authorization, risk controls, and compliance review.

---

## 16. Project Tracking Rules

Maintain a task board with these statuses:

- `BACKLOG`
- `READY`
- `IN_PROGRESS`
- `BLOCKED`
- `IN_REVIEW`
- `DONE`

Every task must include:
- Feature or phase.
- Description and expected result.
- Dependencies.
- Acceptance criteria.
- Tests required.
- Documentation affected.
- Security or compliance impact.
- Owner and status.

Create a decision log for architecture changes, a risk register for unresolved blockers, and a changelog for released features.

**Definition of done for every feature:** Code implemented, tests passing, security reviewed where applicable, API behavior documented, user-facing behavior checked, and acceptance criteria satisfied.

## 17. Immediate Next Actions

1. Resolve Google API eligibility and SaaS policy questions.
2. Prove OAuth, account discovery, review retrieval, and reply publication against an authorized test location.
3. Finalize the MVP scope and state machines.
4. Create the repository and database migrations.
5. Build tenant isolation before adding customer data.
6. Implement the review inbox and human approval workflow.
7. Add the AI generation adapter.
8. Add feedback capture and controlled preference learning.
9. Test the entire workflow end to end.
10. Run a limited beta before considering automatic publishing.

**Project rule:** Do not start the next phase until the previous phase's exit criteria are met or an explicitly documented decision accepts the remaining risk.
