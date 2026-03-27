# Product Requirements Document (PRD)

## Social Emblue AI — MVP

**Version:** 1.0  
**Date:** 2026-03-24  
**Status:** Draft

---

## 1. Product Overview

Social Emblue AI is a compliance-first, **fully automated** social media operations platform. It ingests social messages from multiple platforms, generates on-brand replies using LLM agents, enforces content rulesets, auto-approves compliant replies, posts them directly to platforms via API, and auto-escalates risky content — all without human intervention in the happy path. PII is never persisted and risky content is automatically flagged and held.

### 1.1 Problem Statement

Social media teams face three compounding challenges:

1. **Volume** — Brands receive thousands of mentions, comments, and DMs daily across X, Instagram, Facebook, TikTok, YouTube, and Reddit. Manual triage and manual approval cannot keep pace.
2. **Compliance risk** — Responding at speed introduces regulatory and brand-safety risk: leaked PII, off-brand language, forbidden disclosures, missing disclaimers. Manual review is error-prone under volume.
3. **Operational opacity** — Without centralized metrics, teams cannot measure automation rates, response times, or risk exposure.

### 1.2 Product Vision

Provide a single API-driven backend that **fully automates** the listen → triage → draft → enforce → post pipeline end-to-end. AI generates, rulesets enforce, and the system posts autonomously. Humans configure rulesets, monitor KPIs, and intervene only on escalated risk events.

---

## 2. Target Users

| Persona | Description | Primary Needs |
|---|---|---|
| **Social Media Manager** | Monitors automated reply activity, handles escalations | Real-time automation feed, escalation queue, override controls |
| **Brand Compliance Officer** | Owns rulesets (do-not-say, disclaimers, tone) | Ruleset management, risk event visibility, audit logs, pause controls |
| **Engineering / Integration Team** | Connects platform connectors and CRM systems | Clean REST API, idempotent ingestion, webhook-friendly, platform OAuth |
| **Head of Social** | Oversees automation performance and risk posture | KPI dashboard (automation rate, avg response time, risk events, escalation rate) |

---

## 3. Functional Requirements

### 3.1 Message Ingestion (Loop A — Listening)

| ID | Requirement | Priority |
|---|---|---|
| FR-01 | Accept bulk message ingestion via `POST /ingest/messages` with brand_id, idempotency_key, and an array of messages. | P0 |
| FR-02 | Validate required fields per message: platform, message_type, author_id_hash, text, captured_at. Reject rows with missing fields and return per-row errors. | P0 |
| FR-03 | Redact PII (phone numbers, emails, OTP/PIN/password keywords, auth tokens in URLs) before persisting. PII must never reach the database. | P0 |
| FR-04 | Compute a SHA-256 text fingerprint (lowercased, URL-stripped, punctuation-stripped, whitespace-collapsed) for fallback deduplication. | P0 |
| FR-05 | Deduplicate by external_message_id (exact match) first, then by text_fingerprint within a rolling 7-day window. | P0 |
| FR-06 | Enforce idempotency: a repeated request with the same brand_id + idempotency_key and identical payload hash returns the original response. A different payload with the same key returns 409 Conflict. | P0 |
| FR-07 | Return structured response: ingest_batch_id, inserted_count, deduped_count, rejected_count, inserted_message_ids, row_errors[]. | P0 |

### 3.2 Automated Reply Pipeline (Loop A — Generate, Enforce, Post)

| ID | Requirement | Priority |
|---|---|---|
| FR-10 | Automatically create reply jobs for every newly ingested message using the brand’s default ruleset. No manual trigger required. | P0 |
| FR-11 | List reply jobs via `GET /reply-jobs/queue` with cursor-based pagination, optional status filter, and max limit of 100 (monitoring only). | P0 |
| FR-12 | Retrieve message context (thread parent, children, brand, available rulesets) via `GET /messages/:id/context`. | P0 |
| FR-13 | Generate exactly 3 reply suggestions via the automation engine. Enforce throttling rules (configurable per brand/platform/action). Enforce rulesets (do_not_say removal, required_phrases injection, required_disclaimers append) on all variants. | P0 |
| FR-14 | Record an AgentRun audit entry for every generation call, capturing input JSON, output JSON, agent name, and status. | P0 |
| FR-15 | Automatically create RiskEvent entries when suggestions contain risk-flagged content (harassment, self-harm, fraud, legal threats). | P0 |
| FR-16 | **Auto-approve**: If the top-ranked suggestion passes ruleset enforcement with no risk flags, automatically approve it. No human step required. | P0 |
| FR-17 | **Auto-post**: After auto-approval, immediately post the reply to the source platform via the Platform Posting Service. Enforce posting-intent throttling before posting. Record platform post URL and timestamp. | P0 |
| FR-18 | **Auto-escalate**: If all 3 suggestions are risk-flagged or fail ruleset enforcement, set the reply job to ESCALATED status and create a RiskEvent. Do not post. Hold for human review. | P0 |
| FR-19 | **Manual override**: Expose `POST /replies/:id/override` for humans to manually approve, edit, or cancel an escalated reply job. | P1 |
| FR-20 | **Automation pause**: Expose `POST /brands/:id/automation/pause` and `/resume` to halt and restart the automation pipeline per brand. | P1 |

### 3.3 Risk Events

| ID | Requirement | Priority |
|---|---|---|
| FR-25 | Create risk events automatically when content is flagged during generation or enforcement. Also support manual creation via `POST /risk-events`. | P0 |
| FR-26 | Risk events default to OPEN status. Escalated reply jobs auto-link to their RiskEvent. | P0 |
| FR-27 | Risk events can be acknowledged and resolved by operators via the monitoring dashboard. | P1 |

### 3.4 KPI Summary

| ID | Requirement | Priority |
|---|---|---|
| FR-30 | Aggregate and return KPI metrics for a brand within a date range via `GET /kpis/summary`. Metrics: messages_ingested, reply_jobs_created, suggestions_generated, replies_auto_approved, replies_posted, replies_escalated, risk_events_open, avg_time_to_post_sec, automation_rate, posting_rate. | P0 |
| FR-31 | Return null for rate fields when the denominator is zero (never fabricate). | P0 |

### 3.5 Shortlinks (Loop B — Optional)

| ID | Requirement | Priority |
|---|---|---|
| FR-40 | Create branded shortlinks via `POST /shortlinks` with destination URL and UTM parameters. | P2 |
| FR-41 | Redirect shortlink hits via `GET /s/:code` (302 redirect) and log click metadata (hashed IP, user-agent, referrer). | P2 |

---

## 4. Non-Functional Requirements

| ID | Requirement | Target |
|---|---|---|
| NFR-01 | **Authentication**: All endpoints secured via `X-API-Key` header. Keys validated against a configurable allowlist. | — |
| NFR-02 | **Rate Limiting**: Global rate limit of 60 requests/minute per client. Per-brand/platform throttling for reply-intent and post-intent actions. | 60 req/min global |
| NFR-03 | **PII Compliance**: No raw PII stored in the database. Redaction applied before any persistence layer. | Zero PII at rest |
| NFR-04 | **Idempotency**: Ingestion endpoint is fully idempotent by (brand_id, idempotency_key) with payload-hash verification. | — |
| NFR-05 | **Auditability**: Every AI generation call produces an AgentRun record. Risk events auto-created for flagged content. | 100% audit coverage |
| NFR-06 | **Performance**: Ingestion endpoint handles batches of ≤500 messages. Reply generation completes within 5s (excluding LLM latency). | < 5s p95 |
| NFR-07 | **Data Integrity**: 7-day dedupe window prevents duplicate message insertion using both external IDs and text fingerprints. | — |
| NFR-08 | **Scalability**: Stateless API server; horizontal scaling via process replication behind a load balancer. PostgreSQL as sole persistence layer. | — |

---

## 5. Data Model Summary

### Core Entities

| Entity | Purpose |
|---|---|
| **Brand** | Top-level tenant. All resources scoped by brand. |
| **IngestBatch** | Idempotency record per ingestion request. Keyed by (brandId, idempotencyKey). |
| **SocialMessage** | Normalized social media message. Deduplicated by external ID and text fingerprint. |
| **RuleSet** | Brand-specific content rules: tone, do_not_say, required_phrases, required_disclaimers. |
| **ReplyJob** | Links a message to a ruleset. Tracks lifecycle: DRAFT → SUGGESTED → AUTO_APPROVED → POSTED (or ESCALATED). |
| **ReplySuggestion** | AI-generated reply variant (3 per job). Stores text, tone, risk flag. |
| **ApprovedReply** | Auto-approved or manually overridden final text with approval and posting timestamps. |
| **AgentRun** | Audit log of every LLM agent invocation (input, output, status, errors). |
| **RiskEvent** | Flagged content event with severity, category, and resolution status. |
| **ThrottlingRule / ThrottleEvent** | Configurable rate limits per brand/platform/action and event log. |
| **Shortlink / ShortlinkClick** | Optional branded URL shortener with click tracking. |

### State Machine — ReplyJob

```
                       ┌── (auto) ─────────────────────────┐
DRAFT ─► SUGGESTED ──┼── (auto, clean) ─► AUTO_APPROVED ─► POSTED
                       │
                       └── (risk-flagged) ─► ESCALATED ──► OVERRIDE_APPROVED ─► POSTED
                                             │
                                             └─► CANCELLED
```

---

## 6. AI Agents

### 6.1 Agent_Listening

- **Purpose:** Normalize raw social entries into the Unified Social Object Model.
- **Guardrails:** Never invent IDs. Mark rows as ACCEPT/REJECT with reasons. Set message_type to OTHER if ambiguous.
- **MVP Status:** Logic inlined in the ingestion endpoint; normalization is procedural.

### 6.2 Agent_Reply_Assistant

- **Purpose:** Generate 3 on-brand reply suggestions that comply with the brand ruleset.
- **Guardrails:** Never request OTP/PIN/password/bank details. Enforce do_not_say removal, required_phrases inclusion, required_disclaimers append. Variant 3 is escalation-safe when risk is detected.
- **Automation Role:** Output is fed directly into the auto-approval engine. If the top variant passes enforcement with no risk flag, it is auto-approved and posted without human review.

### 6.3 Agent_KPI_Analyst

- **Purpose:** Compute KPI metrics from aggregated counts. Return null for rates when denominator = 0.
- **Guardrails:** Never fabricate numbers.
- **MVP Status:** Computed directly in the KPI endpoint via Prisma aggregations.

---

## 7. API Surface

| Method | Path | Description |
|---|---|---|
| POST | `/ingest/messages` | Bulk message ingestion with dedup and PII redaction. Triggers automation pipeline. |
| GET | `/reply-jobs/queue` | Paginated list of reply jobs (monitoring) |
| GET | `/messages/:id/context` | Message thread context + brand + rulesets |
| POST | `/replies/generate` | Manually trigger reply generation (override / re-generate) |
| POST | `/replies/:id/override` | Manually approve, edit, or cancel an escalated reply job |
| POST | `/brands/:id/automation/pause` | Pause automation for a brand |
| POST | `/brands/:id/automation/resume` | Resume automation for a brand |
| POST | `/risk-events` | Create a risk event |
| GET | `/kpis/summary` | Aggregated KPI metrics for a brand + date range |
| POST | `/shortlinks` | Create a branded shortlink (optional) |
| GET | `/s/:code` | Redirect shortlink + log click (optional) |

---

## 8. Success Criteria

| Metric | Target |
|---|---|
| End-to-end automation | Ingested message → reply posted on platform with zero human intervention (happy path) |
| Idempotent ingestion | Repeat request with same key returns identical response, no duplicates |
| Deduplication | Messages with matching external ID or fingerprint (7-day window) are skipped |
| PII compliance | Zero PII in database (phone, email, secrets redacted before write) |
| Suggestion generation | Exactly 3 variants per job, all ruleset-enforced |
| Auto-approval rate | ≥90% of jobs auto-approved and posted without escalation (under normal content) |
| Risk escalation | 100% of risk-flagged content held from posting and escalated |
| Avg time to post | < 30 seconds from ingestion to platform post (excluding LLM latency) |
| KPI accuracy | Metrics match actual DB counts; null for zero-denominator rates |
| Pilot readiness | One brand runs fully automated for 7 days without manual intervention |

---

## 9. Out of Scope (MVP)

- Multi-tenant user authentication (single API key model)
- Frontend UI (API-only MVP; frontend monitoring dashboard spec provided separately)
- Webhook delivery to external systems (beyond platform posting)
- Advanced analytics / dashboards beyond KPI summary
- Sentiment analysis or intent classification on ingested messages
- Multi-language reply generation
