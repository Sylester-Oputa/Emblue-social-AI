# Technical Architecture Document

## Social Emblue AI — MVP

**Version:** 1.0  
**Date:** 2026-03-24

---

## 1. System Overview

Social Emblue AI is a **fully automated**, stateless, API-driven backend that orchestrates social media message ingestion, AI-powered reply generation, autonomous ruleset enforcement, auto-approval, direct platform posting, and risk escalation — with no human intervention in the happy path. Humans configure rulesets, monitor KPIs, and handle escalated risk events. The architecture is designed for single-brand pilot deployment with a clear path to multi-tenant horizontal scaling.

```
┌─────────────┐     ┌─────────────────────────────────────────────────────┐
│  Platform    │     │               Social Emblue AI Backend              │
│  Connectors  │◄──►│                                                     │
│  (Inbound +  │     │  ┌──────────┐  ┌───────────┐  ┌────────────────┐  │
│   Outbound)  │     │  │ Auth MW  │─►│  Express   │─►│  Prisma ORM    │  │
└─────────────┘     │  │ (API Key)│  │  Router    │  │  (Query Layer) │  │
                    │  └──────────┘  └─────┬─────┘  └───────┬────────┘  │
┌─────────────┐     │                      │                │           │
│  Monitoring  │────►│            ┌─────────┼────────────────┘           │
│  Dashboard   │     │            ▼         ▼                            │
└─────────────┘     │  ┌──────────────────────────┐                     │
                    │  │      Service Layer        │                     │
                    │  │  ┌─────────┐ ┌──────────┐│                     │
                    │  │  │ Ingest  │ │Automation││                     │
                    │  │  │ Service │ │ Engine   ││                     │
                    │  │  ├─────────┤ ├──────────┤│                     │
                    │  │  │ Risk    │ │ KPI      ││                     │
                    │  │  │ Service │ │ Service  ││                     │
                    │  │  ├─────────┤ ├──────────┤│                     │
                    │  │  │ PII     │ │Shortlink ││                     │
                    │  │  │ Redact  │ │ Service  ││                     │
                    │  │  └─────────┘ └──────────┘│                     │
                    │  └──────────────────────────┘                     │
                    │            │                                       │
                    │            ▼                                       │
                    │  ┌──────────────────────────┐                     │
                    │  │   AI Agent Layer (LLM)    │                     │
                    │  │  Agent_Listening           │                     │
                    │  │  Agent_Reply_Assistant     │                     │
                    │  │  Agent_KPI_Analyst         │                     │
                    │  └──────────────────────────┘                     │
                    │            │                                       │
                    │            ▼                                       │
                    │  ┌──────────────────────────┐                     │
                    │  │ Platform Posting Service  │                     │
                    │  │  X | Instagram | Facebook │                     │
                    │  │  TikTok | YouTube | Reddit│                     │
                    │  └──────────────────────────┘                     │
                    └──────────────────────┬───────────────────────────┘
                                           │
                                           ▼
                                  ┌─────────────────┐
                                  │   PostgreSQL     │
                                  │   (Primary DB)   │
                                  └─────────────────┘
```

---

## 2. Technology Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Runtime** | Node.js (Express) | Lightweight, async I/O, fast prototyping for MVP |
| **ORM** | Prisma | Type-safe schema, auto-migrations, declarative data modeling |
| **Database** | PostgreSQL | ACID compliance, JSON support, robust indexing, battle-tested |
| **Auth** | API Key (X-API-Key header) | Simplest secure approach for machine-to-machine MVP; JWT path for future UI |
| **Rate Limiting** | express-rate-limit | Global 60 req/min; domain-level throttling via ThrottlingRule model |
| **Hashing** | Node.js crypto (SHA-256) | Fingerprinting, idempotency hashing, PII-safe author ID storage |
| **AI Agents** | LLM Integration (OpenAI / Anthropic) | Agent_Reply_Assistant, Agent_Listening, Agent_KPI_Analyst — live LLM calls with strict prompt contracts |
| **Platform Posting** | Platform APIs (X, Instagram, Facebook, TikTok, YouTube, Reddit) | Auto-post approved replies directly to source platforms via OAuth credentials |
| **Job Queue** | BullMQ + Redis | Async processing of the automation pipeline (generate → approve → post) |
| **Production Backend** | NestJS (TypeScript) | The full production system uses NestJS with module-based DI, Swagger, JWT auth, and scheduled jobs |

---

## 3. Architectural Patterns

### 3.1 Layered Architecture

The system follows a clean layered architecture:

```
┌─────────────────────────────┐
│   Transport Layer (HTTP)    │  Express routes, request parsing, response formatting
├─────────────────────────────┤
│   Middleware Layer           │  Authentication, rate limiting, request validation
├─────────────────────────────┤
│   Automation Engine          │  Orchestrates: ingest → generate → enforce → approve → post
├─────────────────────────────┤
│   Service / Business Layer  │  Ingestion, ruleset enforcement, KPI aggregation, risk events
├─────────────────────────────┤
│   AI Agent Layer             │  LLM prompt templates with strict input/output contracts
├─────────────────────────────┤
│   Platform Posting Layer    │  OAuth-authenticated API calls to X, Instagram, Facebook, etc.
├─────────────────────────────┤
│   Data Access Layer (Prisma)│  Database queries, migrations, model definitions
├─────────────────────────────┤
│   Persistence (PostgreSQL)  │  Tables, indexes, constraints, unique guards
└─────────────────────────────┘
```

### 3.2 Idempotent Ingestion Pattern

```
Client ──POST /ingest/messages──► API
                                    │
                          ┌─────────▼────────────┐
                          │ Lookup IngestBatch by │
                          │ (brandId, idempKey)   │
                          └─────────┬────────────┘
                               EXISTS?
                              /        \
                           YES          NO
                            │            │
                   ┌────────▼──┐   ┌─────▼──────────────┐
                   │ Compare   │   │ Process messages:   │
                   │ payload   │   │  1. Validate        │
                   │ hash      │   │  2. Redact PII      │
                   └─────┬─────┘   │  3. Fingerprint     │
                    MATCH? │        │  4. Deduplicate     │
                   /      \│       │  5. Insert          │
                YES       NO       │  6. Create batch    │
                 │         │        └─────────┬──────────┘
          Return      409                     │
          cached    Conflict          Return new response
          response
```

### 3.3 State Machine — Reply Job Lifecycle (Fully Automated)

```
              ┌──────────┐    Automation      ┌───────────┐
  Ingest      │          │    Engine           │           │
  triggers    │  DRAFT   │───────────────────►│ SUGGESTED │
  auto-create │          │                    │           │
              └──────────┘                    └─────┬─────┘
                                                    │
                                          ┌─────────┴─────────┐
                                          │                   │
                                    All clean?          Risk flagged?
                                          │                   │
                                          ▼                   ▼
                                   ┌──────────────┐    ┌───────────┐
                                   │              │    │           │
                                   │AUTO_APPROVED │    │ ESCALATED │
                                   │              │    │           │
                                   └──────┬───────┘    └─────┬─────┘
                                          │                   │
                                    Platform                  │
                                    Post API            Human override
                                          │                   │
                                          ▼                   ▼
                                   ┌──────────┐    ┌──────────────────┐
                                   │  POSTED  │    │OVERRIDE_APPROVED │──► POSTED
                                   └──────────┘    └──────────────────┘
                                                          │
                                                          ▼
                                                    ┌───────────┐
                                                    │ CANCELLED │
                                                    └───────────┘
```

**Key difference from manual workflow:** There is no human approval step in the happy path. The automation engine evaluates suggestions immediately after generation. If the top-ranked suggestion passes ruleset enforcement with no risk flags, it is auto-approved and posted to the platform API within seconds. Risk-flagged content is held in ESCALATED status for human review.

### 3.4 Automation Pipeline (End-to-End)

```
Message Ingested ──► Auto-create ReplyJob (DRAFT)
                            │
                            ▼
                    Call Agent_Reply_Assistant (LLM)
                    Generate 3 suggestions
                    Enforce ruleset on all 3
                    Record AgentRun audit
                            │
                            ▼
                    Evaluate risk flags
                     ┌──────┴──────┐
                     │             │
                  Clean         Risk-flagged
                     │             │
                     ▼             ▼
              Auto-approve    Create RiskEvent
              top variant     Set ESCALATED status
                     │        Hold for human override
                     ▼
              Platform Post API
              (X, IG, FB, TikTok...)
                     │
                     ▼
              Record post URL + timestamp
              Set POSTED status
              Log ThrottleEvent
```

This pipeline executes asynchronously via the job queue (BullMQ). Each step is idempotent and auditable.

### 3.5 Deduplication Strategy (Three-Tier)

| Tier | Mechanism | Scope | Behavior |
|---|---|---|---|
| **1. Idempotency** | IngestBatch (brandId + idempotencyKey + payload hash) | Request-level | Entire batch replay returns cached response |
| **2. External ID** | Unique constraint on (brandId, platform, externalMessageId) | Message-level | Exact match → skip, increment deduped_count |
| **3. Fingerprint** | SHA-256 of normalized text within 7-day window | Content-level | Near-duplicate detection across rephrased/re-posted content |

### 3.6 PII Redaction Pipeline

```
Raw Text ──► Phone Regex ──► Email Regex ──► Secret Keywords ──► Token URLs ──► Clean Text
              [REDACTED_      [REDACTED_      [REDACTED_          [REDACTED_
               PHONE]          EMAIL]          SECRET]             SECRET]
```

All redaction occurs **before** any database write. No raw PII reaches PostgreSQL.

---

## 4. Data Architecture

### 4.1 Entity Relationship Diagram

```
Brand (1) ──────┬──── (N) SocialMessage
                │           │ ↕ self-ref (parent/children)
                │           │
                ├──── (N) IngestBatch
                │
                ├──── (N) RuleSet
                │           │
                ├──── (N) ReplyJob ◄── (message + ruleset)
                │           │
                │           ├──── (3) ReplySuggestion
                │           ├──── (0-1) ApprovedReply (auto or manual override)
                │           ├──── (N) AgentRun
                │           └──── (N) RiskEvent
                │
                ├──── (N) RiskEvent (also links to message)
                │
                ├──── (N) ThrottlingRule
                │           └──── (N) ThrottleEvent
                │
                └──── (N) Shortlink
                            └──── (N) ShortlinkClick
```

### 4.2 Key Indexes & Constraints

| Table | Index / Constraint | Purpose |
|---|---|---|
| IngestBatch | `@@unique([brandId, idempotencyKey])` | Idempotency guard |
| SocialMessage | `@@unique([brandId, platform, externalMessageId])` | External ID dedupe |
| SocialMessage | `@@index([brandId, platform, textFingerprint])` | Fingerprint lookup |
| SocialMessage | `@@index([brandId, platform, capturedAt])` | Time-range queries |
| ReplyJob | `@@unique([messageId, ruleSetId])` | One job per message+ruleset |
| ReplyJob | `@@index([brandId, status, createdAt])` | Queue queries |
| ReplySuggestion | `@@unique([replyJobId, variantNo])` | Upsert safety |
| RiskEvent | `@@index([brandId, severity, status, createdAt])` | Risk dashboard queries |
| ThrottleEvent | `@@index([brandId, platform, action, occurredAt])` | Throttle window counts |

### 4.3 Database: PostgreSQL

- Single PostgreSQL instance for MVP
- Connection via `DATABASE_URL` environment variable
- Prisma manages migrations (`npx prisma migrate dev`)
- JSON columns for flexible metadata: `metrics`, `sourceMeta`, `utmJson`, `meta`

---

## 5. Security Architecture

### 5.1 Authentication

```
Client ──X-API-Key: <key>──► authMiddleware ──► Route Handler
                                  │
                          Validate against
                          VALID_API_KEYS env var
                          (comma-separated list)
```

- **MVP**: Static API key validation from environment variable
- **Production path**: JWT with tenant/workspace/user scoping (NestJS backend already supports this)

### 5.2 Authorization Model

- MVP operates in a flat model: API key grants full access to all endpoints
- Brand-scoping enforced at the data layer: each message, job, and rule is scoped to a `brandId`
- Cross-brand access impossible unless the client explicitly passes a different `brandId`

### 5.3 Data Protection

| Measure | Implementation |
|---|---|
| PII Redaction | Phone, email, secrets, auth tokens stripped before DB write |
| Author Identity | Stored as `authorIdHash` (pre-hashed by caller) — no raw handles required |
| No Sensitive Storage | Agents forbidden from requesting OTP, PIN, password, bank details |
| IP Hashing | Shortlink click IPs stored as hashed values only |

### 5.4 Threat Mitigations

| Threat | Mitigation |
|---|---|
| Brute-force API key | Global rate limit (60/min) via express-rate-limit |
| Replay attacks | Idempotency keys with payload hash mismatch detection |
| Content injection | Ruleset enforcement strips do_not_say phrases; risk flagging for harmful content |
| Over-posting | Per-brand/platform throttling for REPLY_INTENT and POST_INTENT actions |
| Data exfiltration | PII never stored; API key required for all reads |

---

## 6. AI Agent Architecture

### 6.1 Agent Design Pattern

Each agent follows a strict contract pattern:

```
┌─────────────────┐
│  System Prompt   │  Role + constraints + guardrails
├─────────────────┤
│  Input Schema    │  Typed JSON contract (validated before call)
├─────────────────┤
│  Process Rules   │  Step-by-step instructions
├─────────────────┤
│  Output Schema   │  Strict JSON response (validated after call)
├─────────────────┤
│  Guardrails      │  Hard constraints (never invent IDs, never request secrets)
└─────────────────┘
```

### 6.2 Agent Inventory

| Agent | Input | Output | Status |
|---|---|---|---|
| **Agent_Listening** | Raw social rows + brand context | Normalized rows (ACCEPT/REJECT + fingerprint hints) | Logic inlined in ingestion endpoint |
| **Agent_Reply_Assistant** | Message text + thread context + ruleset | 3 suggestion variants with risk flags | Live LLM integration; output auto-approved if clean |
| **Agent_KPI_Analyst** | Aggregated counts + date range | Computed metrics with rates | Computed via direct Prisma queries |

### 6.3 Audit Trail

Every agent invocation creates an `AgentRun` record:

```json
{
  "id": "uuid",
  "replyJobId": "uuid|null",
  "agentName": "Agent_Reply_Assistant",
  "inputJson": { /* full input payload */ },
  "outputJson": { /* full output payload */ },
  "status": "SUCCESS|ERROR",
  "errorMessage": null,
  "createdAt": "ISO8601"
}
```

---

## 7. API Design

### 7.1 Design Principles

- **RESTful**: Resource-oriented endpoints with standard HTTP methods
- **Idempotent**: POST /ingest/messages is idempotent by design
- **Cursor-based Pagination**: Queue endpoints use cursor + limit (no offset)
- **Structured Errors**: All errors return `{ code, message, details? }`
- **snake_case**: All JSON fields use snake_case

### 7.2 Error Codes

| Code | HTTP Status | Meaning |
|---|---|---|
| `UNAUTHORIZED` | 401 | Missing or invalid API key |
| `VALIDATION_ERROR` | 422 | Missing/invalid request fields |
| `IDEMPOTENCY_CONFLICT` | 409 | Same idempotency key with different payload |
| `DUPLICATE_JOB` | 409 | Reply job already exists for message+ruleset |
| `JOB_STATUS_INVALID` | 409 | Operation not valid in current job status |
| `NOT_FOUND` | 404 | Requested resource not found |
| `THROTTLED` | 429 | Brand/platform rate limit exceeded |
| `SERVER_ERROR` | 500 | Internal error |

### 7.3 Throttling Architecture

```
┌──────────────────┐     ┌─────────────────────┐     ┌────────────────┐
│ ThrottlingRule    │     │ Request arrives      │     │ ThrottleEvent  │
│ (brand+platform+ │────►│ Count events in      │────►│ Logged on      │
│  action+window+  │     │ window. If >= max,   │     │ every attempt  │
│  maxCount)       │     │ return 429.          │     │ (+ blocked     │
└──────────────────┘     └─────────────────────┘     │  metadata)     │
                                                      └────────────────┘
```

---

## 8. Deployment Architecture

### 8.1 MVP Deployment

```
┌─────────────────────────────────────┐
│           Single Server             │
│                                     │
│  ┌──────────────┐  ┌────────────┐  │
│  │  Node.js     │  │ PostgreSQL │  │
│  │  Express     │──│            │  │
│  │  (port 3000) │  │ (port 5432)│  │
│  └──────────────┘  └────────────┘  │
│                                     │
└─────────────────────────────────────┘
```

### 8.2 Production Scaling Path

```
                    ┌──────────────┐
                    │ Load Balancer│
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │ Node.js  │ │ Node.js  │ │ Node.js  │
        │ Instance │ │ Instance │ │ Instance │
        └─────┬────┘ └─────┬────┘ └─────┬────┘
              │             │             │
              └─────────────┼─────────────┘
                            ▼
                   ┌─────────────────┐
                   │  PostgreSQL     │
                   │  (Primary +     │
                   │   Read Replica) │
                   └─────────────────┘
                            │
                   ┌────────▼────────┐
                   │  Redis Cache    │
                   │  (sessions,     │
                   │   throttle      │
                   │   counters)     │
                   └─────────────────┘
```

### 8.3 Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `VALID_API_KEYS` | Comma-separated list of allowed API keys |
| `PORT` | Server port (default: 3000) |
| `OPENAI_API_KEY` | LLM provider API key for Agent_Reply_Assistant |
| `REDIS_URL` | Redis connection string for BullMQ job queue |
| `PLATFORM_X_API_KEY` | X (Twitter) API credentials for posting |
| `PLATFORM_IG_ACCESS_TOKEN` | Instagram Graph API access token |
| `PLATFORM_FB_ACCESS_TOKEN` | Facebook Page access token |
| `AUTOMATION_ENABLED` | Global automation toggle (true/false, default: true) |

---

## 9. Performance Considerations

### 9.1 Current Bottlenecks

| Area | Issue | Mitigation Path |
|---|---|---|
| **Sequential message processing** | Ingestion processes each message in a loop with individual DB calls | Batch inserts via `createMany`; parallel dedup checks |
| **Throttle counting via DB** | Every throttle check is a `COUNT` query | Move to Redis INCR with TTL for production |
| **N+1 in KPI** | Approved reply time calculation loads all rows | Use Prisma `aggregate` or raw SQL for AVG |
| **No connection pooling** | Single Prisma client | PgBouncer or Prisma connection pooling for production |

### 9.2 Scaling Recommendations

1. **Horizontal API scaling** — The Express server is stateless; replicate behind a load balancer
2. **Redis for throttling** — Replace DB-based throttle counts with Redis INCR + TTL
3. **Message queue for ingestion** — Move heavy ingestion to a background worker (Bull/BullMQ)
4. **Read replicas** — Route KPI and queue queries to PostgreSQL read replicas
5. **CDN for shortlinks** — Cache shortlink redirects at the edge

---

## 10. Observability

### 10.1 Current State

- `console.error` on all exception paths
- Request IDs planned (Week 4)
- AgentRun records serve as agent-level audit logs

### 10.2 Production Recommendations

| Signal | Tool | Implementation |
|---|---|---|
| **Structured Logging** | Pino / Winston | Request ID, brand ID, duration, status code per request |
| **Metrics** | Prometheus / Datadog | Request latency, ingestion throughput, throttle rates, error rates |
| **Tracing** | OpenTelemetry | End-to-end trace across ingestion → generation → auto-approval → platform post |
| **Alerting** | PagerDuty / Opsgenie | Risk events with CRITICAL severity, error rate spikes, throttle saturation |

---

## 11. Evolution Path

### Phase 1 (Current MVP)
- Express + Prisma + PostgreSQL
- API key auth, full automation pipeline
- LLM integration for reply generation
- Auto-approval + platform posting
- Single-brand pilot

### Phase 2 (Production Hardening)
- Migrate to NestJS (TypeScript, DI, Swagger, guards)
- JWT authentication with tenant/workspace/user scoping
- Circuit breaking and retry policies for LLM and platform APIs
- Redis-backed throttling and caching
- Background job processing (BullMQ)
- Platform connector framework with OAuth management

### Phase 3 (Multi-Tenant Scale)
- Multi-tenant data isolation (Row-Level Security or schema-per-tenant)
- Real-time WebSocket push for monitoring dashboard
- Advanced analytics pipeline (event streaming to data warehouse)
- Sentiment analysis and intent classification on ingested messages
- A/B testing of reply variants
- Multi-language reply generation
- Frontend monitoring dashboard (see Frontend Documentation)

---

## 12. Architecture Decision Records

### ADR-001: PostgreSQL as Single Database
**Decision:** Use PostgreSQL as the sole persistence layer.  
**Rationale:** ACID compliance, JSON column support for flexible metadata, mature ecosystem, and Prisma's excellent PostgreSQL support.  
**Trade-off:** No dedicated search engine (Elasticsearch) or cache (Redis) — acceptable for MVP scale.

### ADR-002: Idempotency via IngestBatch
**Decision:** Store a hash of the full request payload alongside the idempotency key.  
**Rationale:** Enables detection of payload mutation with the same key (409 Conflict) while allowing safe retries.  
**Trade-off:** Slightly larger storage per batch; negligible at MVP scale.

### ADR-003: PII Redaction Before Persistence
**Decision:** Apply regex-based PII stripping in the application layer before any DB write.  
**Rationale:** Defense-in-depth — even if a database dump is exposed, no raw PII is present.  
**Trade-off:** Regex patterns may miss edge cases; should be continuously updated.

### ADR-004: Fully Automated Pipeline (No Human-in-the-Loop)
**Decision:** Auto-approve and auto-post replies that pass ruleset enforcement with no risk flags. Escalate risk-flagged content.  
**Rationale:** The core product value is speed-at-scale. Manual approval creates bottlenecks that defeat the purpose of AI-powered operations. Rulesets provide the compliance guardrail; risk escalation provides the safety net.  
**Trade-off:** Higher compliance risk if rulesets are misconfigured. Mitigated by: audit logging of every AgentRun, risk event auto-creation, per-brand automation pause controls, and post-hoc monitoring dashboards.

### ADR-005: Platform Posting Service
**Decision:** Post replies directly to social platforms via their APIs (X, Instagram, Facebook, TikTok, YouTube, Reddit).  
**Rationale:** Full automation requires closing the loop — generating a reply is only valuable if it's published. Platform OAuth credentials are stored securely and used for outbound API calls.  
**Trade-off:** Requires OAuth token management, rate limit awareness per platform, and retry/circuit-breaking for failed posts. Justified by the core automation requirement.

### ADR-006: Cursor-Based Pagination
**Decision:** Use cursor-based pagination (last ID) instead of offset/limit.  
**Rationale:** Stable across concurrent inserts; no skipped/duplicated rows.  
**Trade-off:** Cannot jump to arbitrary page numbers (acceptable for queue UIs).
