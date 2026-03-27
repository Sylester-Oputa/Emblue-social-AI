# Missing Components Checklist
## Complete Task List for PRD Compliance

**Current Status:** 70% Complete  
**Goal:** 100% PRD Compliance - Fully Automated Pipeline  
**Last Updated:** March 26, 2026

---

## 🔴 CRITICAL - Must Implement (Blockers)

### 1. Auto-Approval Engine (FR-16)
- [ ] Create `AutoApprovalProcessor` in `backend/src/workers/auto-approval.processor.ts`
- [ ] Listen to `policy-evaluation` BullMQ queue
- [ ] Implement risk-based decision logic:
  - If `riskScore < 70` → Set status to `AUTO_APPROVED`
  - If `riskScore >= 70` → Set status to `ESCALATED`
- [ ] Trigger delivery queue on auto-approval
- [ ] Add audit logging for auto-approval decisions
- [ ] Add unit tests for approval logic

**Files to Create:**
```
backend/src/workers/auto-approval.processor.ts
backend/src/workers/auto-approval.processor.spec.ts
```

**Files to Modify:**
```
backend/src/workers/workers.module.ts (register processor)
backend/src/app.module.ts (import workers module if not already)
```

---

### 2. Auto-Posting Processor (FR-17)
- [ ] Create `DeliveryProcessor` in `backend/src/workers/delivery.processor.ts`
- [ ] Listen to `delivery` BullMQ queue
- [ ] Implement platform posting logic:
  - For Twitter/X: Use Twitter API v2
  - For Instagram: Use Instagram Graph API
  - For Facebook: Use Facebook Graph API
- [ ] Update ResponseDraft status to `POSTED` after successful delivery
- [ ] Record `deliveredAt` timestamp
- [ ] Record platform response URL
- [ ] Implement retry logic (3 attempts with exponential backoff)
- [ ] Add error handling for API failures
- [ ] Add idempotency checks (don't post twice)
- [ ] Add unit tests for delivery logic

**Files to Create:**
```
backend/src/workers/delivery.processor.ts
backend/src/workers/delivery.processor.spec.ts
backend/src/delivery/platforms/twitter.service.ts
backend/src/delivery/platforms/instagram.service.ts
backend/src/delivery/platforms/facebook.service.ts
```

**Files to Modify:**
```
backend/src/workers/workers.module.ts (register processor)
backend/src/delivery/delivery.service.ts (integrate platform services)
```

---

### 3. Auto-Escalation Logic (FR-18)
- [ ] Create `EscalationService` in `backend/src/risk-events/escalation.service.ts`
- [ ] Auto-create RiskEvent when `riskScore >= 70`
- [ ] Link RiskEvent to ResponseDraft via `signalId`
- [ ] Set RiskEvent status to `OPEN`
- [ ] Set RiskEvent severity based on risk score:
  - 70-79: `MEDIUM`
  - 80-89: `HIGH`
  - 90-100: `CRITICAL`
- [ ] Set RiskEvent category based on policy violations:
  - Hate speech → `HARASSMENT`
  - Self-harm keywords → `SELF_HARM`
  - Fraud patterns → `FRAUD`
  - Legal threats → `LEGAL_THREAT`
- [ ] Add notification webhook for escalated content (optional)
- [ ] Add unit tests

**Files to Create:**
```
backend/src/risk-events/escalation.service.ts
backend/src/risk-events/escalation.service.spec.ts
```

**Files to Modify:**
```
backend/src/workers/auto-approval.processor.ts (call escalation service)
backend/src/risk-events/risk-events.module.ts (export escalation service)
```

---

### 4. Policy Enforcement Engine (FR-14, FR-15)
- [ ] Create `PolicyEnforcementService` in `backend/src/policies/policy-enforcement.service.ts`
- [ ] Implement rule matching logic:
  - Keyword detection (exact + fuzzy matching)
  - Regex pattern matching
  - Hate speech detection (ML classifier or keyword list)
  - Profanity filter
  - Regulatory terms detection (financial disclaimers, legal terms)
- [ ] Implement risk scoring algorithm (0-100 scale):
  - Base score = 0
  - +30 for hate speech keywords
  - +25 for profanity
  - +20 for regulatory violations
  - +15 for missing required disclaimers
  - +10 for brand guideline violations
- [ ] Implement do-not-say enforcement (remove forbidden phrases)
- [ ] Implement required_phrases injection
- [ ] Implement required_disclaimers append
- [ ] Store PolicyDecision record
- [ ] Add unit tests for each rule type

**Files to Create:**
```
backend/src/policies/policy-enforcement.service.ts
backend/src/policies/policy-enforcement.service.spec.ts
backend/src/policies/rules/hate-speech.detector.ts
backend/src/policies/rules/profanity.detector.ts
backend/src/policies/rules/regulatory.detector.ts
```

**Files to Modify:**
```
backend/src/workers/policy.processor.ts (call enforcement service)
backend/src/policies/policies.module.ts (export enforcement service)
```

---

### 5. OpenAI Integration (FR-13)
- [ ] Remove stub implementation from `IntelligenceService`
- [ ] Implement GPT-4 API call in `generateReply()` method
- [ ] Design prompt template for reply generation:
  - Include brand voice/tone
  - Include conversation context
  - Include platform constraints (character limits)
  - Include do-not-say list
  - Include required phrases
- [ ] Generate exactly 3 reply variants per call
- [ ] Implement retry logic with exponential backoff
- [ ] Add timeout handling (30s max)
- [ ] Add fallback to stub if API fails
- [ ] Add cost tracking (token usage)
- [ ] Add unit tests + integration tests

**Files to Modify:**
```
backend/src/intelligence/intelligence.service.ts
backend/src/intelligence/intelligence.service.spec.ts
```

**Environment Variables to Add:**
```
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4-turbo-preview
OPENAI_MAX_TOKENS=500
OPENAI_TEMPERATURE=0.7
```

---

### 6. Reply Job Queue Management (FR-10, FR-11)
- [ ] Create `ReplyJobController` in `backend/src/reply-jobs/reply-job.controller.ts`
- [ ] Implement `GET /reply-jobs/queue` endpoint:
  - Return paginated list of reply jobs
  - Support status filter (DRAFT, SUGGESTED, AUTO_APPROVED, ESCALATED, POSTED)
  - Support workspace filter
  - Include signal summary
  - Include response draft preview
- [ ] Implement `GET /reply-jobs/:jobId` endpoint:
  - Return job details
  - Include all 3 reply suggestions
  - Include policy decision
  - Include risk score
- [ ] Create `ReplyJobService` for business logic
- [ ] Add DTO validation
- [ ] Add authorization guards (workspace access)
- [ ] Add E2E tests

**Files to Create:**
```
backend/src/reply-jobs/reply-job.controller.ts
backend/src/reply-jobs/reply-job.service.ts
backend/src/reply-jobs/dto/reply-job-query.dto.ts
backend/src/reply-jobs/reply-job.module.ts
backend/src/reply-jobs/reply-job.controller.spec.ts
backend/src/reply-jobs/reply-job.service.spec.ts
```

**Files to Modify:**
```
backend/src/app.module.ts (import ReplyJobModule)
```

---

### 7. Message Context Endpoint (FR-12)
- [ ] Create `GET /messages/:id/context` endpoint in SignalsController
- [ ] Return message thread parent (if reply)
- [ ] Return message children (replies to this message)
- [ ] Return workspace/brand details
- [ ] Return available rulesets
- [ ] Return platform details
- [ ] Add DTO for response structure
- [ ] Add unit tests

**Files to Modify:**
```
backend/src/signals/signals.controller.ts
backend/src/signals/signals.service.ts
backend/src/signals/dto/signal-context.dto.ts (create)
```

---

### 8. Override Endpoint (FR-19)
- [ ] Create `POST /replies/:id/override` endpoint in ResponsesController
- [ ] Accept override actions:
  - `approve` - Manually approve escalated content
  - `edit` - Edit text and approve
  - `cancel` - Reject and do not post
- [ ] Validate user has REVIEWER or higher role
- [ ] Update ResponseDraft status to `OVERRIDE_APPROVED`
- [ ] Trigger delivery queue if approved
- [ ] Create audit log entry
- [ ] Add DTO validation
- [ ] Add E2E tests

**Files to Create:**
```
backend/src/responses/dto/override-response.dto.ts
```

**Files to Modify:**
```
backend/src/responses/responses.controller.ts
backend/src/responses/responses.service.ts
```

---

### 9. Automation Control Routes (FR-20)
- [ ] Add `POST /workspaces/:id/automation/pause` route to WorkspacesController
- [ ] Add `POST /workspaces/:id/automation/resume` route to WorkspacesController
- [ ] Add `GET /workspaces/:id/automation/status` route to WorkspacesController
- [ ] Connect to existing service methods (already implemented)
- [ ] Add DTO for pause reason
- [ ] Add authorization check (WORKSPACE_ADMIN or higher)
- [ ] Add E2E tests

**Files to Modify:**
```
backend/src/workspaces/workspaces.controller.ts
backend/src/workspaces/dto/automation-control.dto.ts (create)
```

---

### 10. Auto-Generate Trigger (FR-10)
- [ ] Modify `PolicyProcessor` to auto-trigger response generation
- [ ] After signal normalization, add job to `response-generation` queue
- [ ] Pass signalId and workspaceId to generation job
- [ ] Ensure idempotency (don't generate twice for same signal)
- [ ] Add logging for generation triggers

**Files to Modify:**
```
backend/src/workers/policy.processor.ts
```

---

## 🟡 HIGH PRIORITY - Data Integrity

### 11. Idempotency Mechanism (FR-06)
- [ ] Create `IngestBatch` model in Prisma schema:
  ```prisma
  model IngestBatch {
    id            String   @id @default(uuid())
    brandId       String   // or workspaceId
    idempotencyKey String
    payloadHash   String
    response      Json
    createdAt     DateTime @default(now())
    
    @@unique([brandId, idempotencyKey])
    @@index([brandId, createdAt])
  }
  ```
- [ ] Generate migration
- [ ] Implement idempotency check in `IngestionService`:
  - Compute SHA-256 hash of request payload
  - Check for existing batch with (brandId, idempotencyKey)
  - If hash matches → Return cached response (200 OK)
  - If hash differs → Return 409 Conflict
  - If new → Proceed with ingestion
- [ ] Add unit tests

**Files to Modify:**
```
backend/prisma/schema.prisma
backend/src/ingestion/ingestion.service.ts
```

**Migration to Create:**
```
npx prisma migrate dev --name add_ingest_batch_idempotency
```

---

### 12. PII Redaction Validation (FR-03)
- [ ] Audit existing PII redaction logic in `IngestionService`
- [ ] Implement/verify redaction for:
  - Phone numbers (all formats): `(555) 123-4567` → `[PHONE_REDACTED]`
  - Emails: `user@example.com` → `[EMAIL_REDACTED]`
  - OTP/PIN keywords: "my code is 123456" → `[OTP_REDACTED]`
  - Password keywords: "my password is xyz" → `[PASSWORD_REDACTED]`
  - Auth tokens in URLs: `?token=abc123` → `?token=[TOKEN_REDACTED]`
  - Credit card numbers: `4111-1111-1111-1111` → `[CARD_REDACTED]`
  - SSN: `123-45-6789` → `[SSN_REDACTED]`
- [ ] Create comprehensive test suite
- [ ] Add E2E test that ingests PII and verifies database has no raw PII

**Files to Modify:**
```
backend/src/ingestion/ingestion.service.ts
backend/src/ingestion/pii-redaction.service.ts (create)
backend/src/ingestion/ingestion.service.spec.ts
```

---

### 13. 7-Day Deduplication Window (FR-05)
- [ ] Add `createdAt` filter to deduplication query
- [ ] Dedupe logic:
  - Check for existing signal with same `externalId` in last 7 days
  - If found → Skip insertion, increment `deduped_count`
  - If not found → Check for same `text_fingerprint` in last 7 days
  - If found → Skip insertion, increment `deduped_count`
  - If not found → Insert new signal
- [ ] Add unit tests
- [ ] Add E2E test that ingests same message after 7 days (should be accepted)

**Files to Modify:**
```
backend/src/ingestion/ingestion.service.ts
backend/src/workers/normalization.processor.ts
```

---

### 14. Text Fingerprint Computation (FR-04)
- [ ] Implement fingerprint generation function:
  - Lowercase text
  - Strip URLs
  - Remove punctuation
  - Collapse whitespace
  - Compute SHA-256 hash
- [ ] Store in `NormalizedSignal.textFingerprint` field (add column if missing)
- [ ] Use in deduplication logic
- [ ] Add unit tests

**Files to Modify:**
```
backend/prisma/schema.prisma (add textFingerprint column)
backend/src/ingestion/fingerprint.service.ts (create)
backend/src/workers/normalization.processor.ts
```

**Migration to Create:**
```
npx prisma migrate dev --name add_text_fingerprint
```

---

### 15. Structured Ingestion Response (FR-07)
- [ ] Change ingestion response from `202 Accepted` to synchronous response
- [ ] Return structured response:
  ```json
  {
    "ingest_batch_id": "uuid",
    "inserted_count": 15,
    "deduped_count": 3,
    "rejected_count": 2,
    "inserted_message_ids": ["id1", "id2", ...],
    "row_errors": [
      { "row": 5, "error": "Missing required field: platform" }
    ]
  }
  ```
- [ ] Process ingestion synchronously (move out of queue for initial batch)
- [ ] Add timeout handling (30s max)
- [ ] Add E2E tests

**Files to Modify:**
```
backend/src/ingestion/ingestion.controller.ts
backend/src/ingestion/ingestion.service.ts
backend/src/ingestion/dto/ingestion-response.dto.ts (create)
```

---

## 🟢 MEDIUM PRIORITY - Missing Features

### 16. Policy CRUD Endpoints
- [ ] Implement `GET /policies/rulesets` - List all rulesets
- [ ] Implement `POST /policies/rulesets` - Create ruleset
- [ ] Implement `GET /policies/rulesets/:id` - Get ruleset details
- [ ] Implement `PATCH /policies/rulesets/:id` - Update ruleset
- [ ] Implement `DELETE /policies/rulesets/:id` - Delete ruleset
- [ ] Add DTO validation for ruleset structure:
  ```typescript
  {
    name: string;
    workspaceId: string;
    tone: 'professional' | 'friendly' | 'casual';
    do_not_say: string[];
    required_phrases: string[];
    required_disclaimers: string[];
    keywords_to_flag: string[];
    risk_threshold: number; // 0-100
  }
  ```
- [ ] Add authorization guards
- [ ] Add E2E tests

**Files to Modify:**
```
backend/src/policies/policies.controller.ts
backend/src/policies/policies.service.ts
backend/src/policies/dto/ruleset.dto.ts (create)
```

---

### 17. AgentRun Audit Creation (FR-14)
- [ ] Modify `IntelligenceService.generateReply()` to create AgentRun record
- [ ] Store input JSON (signal context + prompt)
- [ ] Store output JSON (generated suggestions)
- [ ] Store agent name (e.g., "openai:gpt-4-turbo")
- [ ] Store status (SUCCESS, FAILED, TIMEOUT)
- [ ] Store error message if failed
- [ ] Store token usage (for cost tracking)
- [ ] Add index on (signalId, createdAt) for audit queries

**Files to Modify:**
```
backend/src/intelligence/intelligence.service.ts
backend/prisma/schema.prisma (verify AgentRun model has all fields)
```

---

### 18. Throttling Rule Management
- [ ] Create `ThrottlingRule` model in Prisma (if not exists):
  ```prisma
  model ThrottlingRule {
    id          String  @id @default(uuid())
    workspaceId String
    platform    String  // 'X', 'INSTAGRAM', 'FACEBOOK'
    action      String  // 'REPLY_INTENT', 'POST_INTENT'
    limit       Int     // Max actions
    windowSec   Int     // Time window in seconds
    createdAt   DateTime @default(now())
    
    @@unique([workspaceId, platform, action])
  }
  ```
- [ ] Create CRUD endpoints for throttling rules
- [ ] Implement throttling check in DeliveryProcessor
- [ ] Create `ThrottleEvent` log table for tracking
- [ ] Add E2E tests

**Files to Create:**
```
backend/src/throttling/throttling.controller.ts
backend/src/throttling/throttling.service.ts
backend/src/throttling/throttling.module.ts
```

**Files to Modify:**
```
backend/prisma/schema.prisma
backend/src/workers/delivery.processor.ts (add throttling check)
```

---

### 19. Campaign Management Implementation
- [ ] Create Campaign model (if not exists)
- [ ] Implement `POST /campaigns` - Create campaign
- [ ] Implement `GET /campaigns` - List campaigns
- [ ] Implement `GET /campaigns/:id` - Get campaign details
- [ ] Implement `PATCH /campaigns/:id` - Update campaign
- [ ] Implement `DELETE /campaigns/:id` - Delete campaign
- [ ] Link signals to campaigns via `campaignId` foreign key
- [ ] Add campaign analytics (signal count, response rate, sentiment)

**Files to Modify:**
```
backend/src/campaigns/campaigns.controller.ts
backend/src/campaigns/campaigns.service.ts
backend/prisma/schema.prisma (add Campaign model if missing)
```

---

### 20. Operations/Admin Endpoints
- [ ] Implement `GET /ops/health` - Deep health check (DB, Redis, BullMQ)
- [ ] Implement `GET /ops/metrics` - System metrics (queue sizes, processing rates)
- [ ] Implement `GET /ops/jobs` - List all jobs with status
- [ ] Implement `POST /ops/jobs/:id/retry` - Retry failed job
- [ ] Implement `DELETE /ops/jobs/:id` - Cancel job
- [ ] Add SUPER_ADMIN authorization

**Files to Modify:**
```
backend/src/ops/ops.controller.ts
backend/src/ops/ops.service.ts
```

---

## 📊 TESTING & VALIDATION

### 21. Unit Tests
- [ ] ResponseGenerationProcessor unit tests
- [ ] AutoApprovalProcessor unit tests
- [ ] DeliveryProcessor unit tests
- [ ] PolicyEnforcementService unit tests
- [ ] EscalationService unit tests
- [ ] IntelligenceService (OpenAI) integration tests
- [ ] PII redaction unit tests
- [ ] Fingerprint generation unit tests
- [ ] Idempotency unit tests

**Target Coverage:** 80% line coverage

---

### 22. E2E Tests
- [ ] Full automation pipeline E2E test (clean content)
- [ ] Full automation pipeline E2E test (risky content)
- [ ] Idempotency E2E test
- [ ] PII redaction E2E test
- [ ] Deduplication E2E test
- [ ] Override workflow E2E test
- [ ] Pause/resume automation E2E test
- [ ] Multi-tenant isolation E2E test

**Files to Modify:**
```
backend/tests/automation-pipeline.spec.ts (uncomment assertions)
backend/tests/data-integrity.spec.ts (create)
```

---

### 23. Load Testing
- [ ] Install k6 or Artillery
- [ ] Create load test for ingestion endpoint:
  - Target: 500 concurrent requests
  - Batch size: 500 messages
  - Success criteria: p95 < 5s
- [ ] Create load test for generation endpoint:
  - Target: 100 concurrent requests
  - Success criteria: p95 < 5s (excluding OpenAI latency)
- [ ] Create load test for end-to-end pipeline:
  - Target: 1000 messages ingested
  - Success criteria: All posted within 30s average
- [ ] Document results in performance report

**Files to Create:**
```
backend/tests/load/ingestion.test.js
backend/tests/load/generation.test.js
backend/tests/load/e2e-pipeline.test.js
```

---

### 24. Performance Optimization
- [ ] Add Redis caching for:
  - Policy rules (cache for 5 minutes)
  - Workspace settings (cache for 10 minutes)
  - Brand profiles (cache for 10 minutes)
- [ ] Add database query optimization:
  - Review slow query log
  - Add missing indexes
  - Optimize N+1 queries
- [ ] Add response compression (gzip)
- [ ] Add connection pooling optimization
- [ ] Document optimization results

---

## 🎨 DATABASE SCHEMA GAPS

### 25. Missing Database Fields
- [ ] Add `textFingerprint` to NormalizedSignal model
- [ ] Add `riskScore` to ResponseDraft model (if missing)
- [ ] Add `autoApproved` to ResponseDraft model (if missing)
- [ ] Add `policyDecisionId` to ResponseDraft model
- [ ] Add `platformResponseUrl` to ResponseDraft model
- [ ] Add `tokenUsage` to AgentRun model (for cost tracking)
- [ ] Add `payloadHash` to RawEvent model (for idempotency)
- [ ] Verify all foreign keys have proper indexes

**Migration to Create:**
```
npx prisma migrate dev --name add_missing_automation_fields
```

---

### 26. State Enum Updates
- [ ] Update ResponseDraft status enum to include:
  - `AUTO_APPROVED` (PRD requirement)
  - `ESCALATED` (PRD requirement)
  - `OVERRIDE_APPROVED` (PRD requirement)
  - `POSTED` (PRD requirement, may already exist as DELIVERED)

**Files to Modify:**
```
backend/prisma/schema.prisma
```

**Migration to Create:**
```
npx prisma migrate dev --name update_response_status_enum
```

---

## 📚 DOCUMENTATION

### 27. API Documentation Updates
- [ ] Update Swagger documentation with:
  - All new endpoints
  - Request/response examples
  - Error codes
  - Rate limits
- [ ] Add OpenAPI tags for endpoint grouping
- [ ] Add security schemes documentation
- [ ] Add webhook documentation

**Files to Modify:**
```
backend/src/main.ts (Swagger config)
All controller files (add @ApiOperation, @ApiResponse decorators)
```

---

### 28. Architecture Documentation
- [ ] Document auto-approval algorithm
- [ ] Document risk scoring algorithm
- [ ] Document policy enforcement flow
- [ ] Document state machine transitions
- [ ] Create sequence diagrams for:
  - Full automation pipeline
  - Escalation workflow
  - Override workflow
- [ ] Update technical architecture document

**Files to Create:**
```
docs/AUTO_APPROVAL_ALGORITHM.md
docs/RISK_SCORING.md
docs/POLICY_ENFORCEMENT.md
docs/SEQUENCE_DIAGRAMS.md
```

---

### 29. Runbook Creation
- [ ] Create pilot runbook for onboarding new workspace
- [ ] Document how to configure rulesets
- [ ] Document how to connect social platforms
- [ ] Document how to monitor automation pipeline
- [ ] Document how to handle escalations
- [ ] Document how to pause/resume automation
- [ ] Create troubleshooting guide

**Files to Create:**
```
docs/PILOT_RUNBOOK.md
docs/PLATFORM_INTEGRATION_GUIDE.md
docs/MONITORING_GUIDE.md
docs/TROUBLESHOOTING.md
```

---

### 30. Migration Guide
- [ ] Document manual → automated migration path
- [ ] List breaking changes
- [ ] List required environment variables
- [ ] List database migrations to run
- [ ] List configuration changes
- [ ] Provide rollback procedure

**Files to Create:**
```
docs/MIGRATION_GUIDE.md
```

---

## 🔧 ENVIRONMENT & CONFIGURATION

### 31. Missing Environment Variables
Add to `.env.example` and document:

```bash
# OpenAI Configuration
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4-turbo-preview
OPENAI_MAX_TOKENS=500
OPENAI_TEMPERATURE=0.7
OPENAI_TIMEOUT_MS=30000

# Risk Scoring
RISK_THRESHOLD_AUTO_APPROVE=70
RISK_THRESHOLD_ESCALATE=70

# Automation Controls
AUTO_APPROVAL_ENABLED=true
AUTO_POSTING_ENABLED=true

# Platform API Keys (for posting)
TWITTER_API_KEY=...
TWITTER_API_SECRET=...
TWITTER_BEARER_TOKEN=...
INSTAGRAM_ACCESS_TOKEN=...
FACEBOOK_ACCESS_TOKEN=...

# Throttling Defaults
DEFAULT_REPLY_RATE_LIMIT=10
DEFAULT_POST_RATE_LIMIT=5
DEFAULT_RATE_WINDOW_SEC=60

# Feature Flags
ENABLE_PII_REDACTION=true
ENABLE_FINGERPRINT_DEDUP=true
ENABLE_IDEMPOTENCY_CHECK=true
```

---

### 32. Frontend Implementation Gaps

**Note:** The PRD focuses on backend API. Frontend is out of scope but listed here for completeness.

- [ ] Dashboard for monitoring automation pipeline
- [ ] Escalation queue UI for reviewing risky content
- [ ] Override modal for manual approval
- [ ] Real-time signal feed
- [ ] Policy ruleset management UI
- [ ] Analytics dashboard
- [ ] Automation controls (pause/resume buttons)
- [ ] Platform connection wizard

---

## 📈 SUMMARY

### Total Items: 32 Major Components

**Critical (Must Fix):** 10 items  
**High Priority:** 9 items  
**Medium Priority:** 5 items  
**Testing:** 4 items  
**Database:** 2 items  
**Documentation:** 5 items  
**Configuration:** 2 items  

### Estimated Effort

| Category | Items | Estimated Days |
|----------|-------|----------------|
| Critical Automation | 10 | 20-25 days |
| Data Integrity | 5 | 5-7 days |
| Missing Features | 5 | 5-7 days |
| Testing | 4 | 5-7 days |
| Database Updates | 2 | 2-3 days |
| Documentation | 5 | 3-5 days |
| **TOTAL** | **31** | **40-54 days (8-11 weeks)** |

### Prioritized Implementation Order

**Week 1-2:** Critical Automation Core
1. Policy Enforcement Engine (#4)
2. OpenAI Integration (#5)
3. Auto-Approval Engine (#1)

**Week 3-4:** Automation Pipeline Complete
4. Auto-Posting Processor (#2)
5. Auto-Escalation Logic (#3)
6. Auto-Generate Trigger (#10)

**Week 5-6:** Data Integrity & Endpoints
7. Idempotency Mechanism (#11)
8. PII Redaction Validation (#12)
9. Reply Job Queue Management (#6)
10. Message Context Endpoint (#7)
11. Override Endpoint (#8)
12. Automation Control Routes (#9)

**Week 7-8:** Missing Features & Testing
13. Policy CRUD Endpoints (#16)
14. AgentRun Audit Creation (#17)
15. Unit Tests (#21)
16. E2E Tests (#22)

**Week 9-10:** Performance & Documentation
17. Load Testing (#23)
18. Performance Optimization (#24)
19. API Documentation (#27)
20. Runbooks (#29)

**Week 11:** Polish & Validation
21. Final E2E testing
22. Performance validation
23. Security audit
24. PRD compliance verification

---

## 🎯 Definition of Done

The project is **100% complete** when:

- ✅ All 31 critical/high/medium items implemented
- ✅ End-to-end automation test passes (clean content: ingest → auto-approve → auto-post)
- ✅ End-to-end escalation test passes (risky content: ingest → escalate → hold)
- ✅ All E2E tests pass (0 failures)
- ✅ Unit test coverage ≥ 80%
- ✅ Load test passes (p95 < 5s for ingestion)
- ✅ PII compliance test passes (0 PII in database)
- ✅ Idempotency test passes
- ✅ 7-day dedupe test passes
- ✅ OpenAI integration working (generates 3 variants)
- ✅ Platform posting working (Twitter, Instagram, Facebook)
- ✅ Swagger docs updated with all endpoints
- ✅ Pilot runbook completed
- ✅ PRD alignment audit shows 100% compliance

---

**Last Updated:** March 26, 2026  
**Auditor:** GitHub Copilot  
**Status:** Ready for Implementation
