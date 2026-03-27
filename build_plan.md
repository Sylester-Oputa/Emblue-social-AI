# Step‑by‑Step Build Plan

This plan outlines the phased development of the Social Emblue AI MVP. Each week delivers a functional increment towards the final system.

## Week 1 – Schema, Ingestion and Dedupe

* Set up the project repository, including Node/Express skeleton, Prisma and database migrations.
* Implement API key authentication middleware using the `X‑API‑Key` header.
* Build the `/ingest/messages` endpoint:
  * Validate and normalize payloads.
  * Redact PII from text fields.
  * Compute fingerprints for fallback deduplication.
  * Enforce unique constraints and the seven‑day dedupe window.
  * Implement idempotency using `IngestBatch` records keyed by brand and idempotency key.
* Write unit tests to ensure ingest idempotency and dedupe behaviour.

**Definition of Done:** You can ingest a batch of messages and repeat the same request with the same idempotency key without creating duplicates. Messages with matching IDs or fingerprints within a seven‑day window are not inserted.

## Week 2 – Reply Workflow, Generate and Approve

* Implement endpoints `/reply-jobs/create`, `/reply-jobs/queue` and `/messages/:id/context` to initiate and list reply jobs.
* Create `/replies/generate` endpoint:
  * Enforce throttling rules for reply generation.
  * Wrap calls to the LLM via `Agent_Reply_Assistant` and enforce ruleset (do‑not‑say, required phrases, required disclaimers).
  * Store suggestions and record an `AgentRun` audit.
  * Automatically create `RiskEvent` entries for flagged content.
* Implement `/replies/approve` endpoint to approve a suggestion or custom text, enforcing rules once more before storing the approved reply.
* Implement `/replies/:id/mark-posted` endpoint for manual posting confirmation, including throttling for posting intents.

**Definition of Done:** You can create a reply job, generate exactly three suggestions with proper enforcement, approve one suggestion (or custom text) and mark it as posted. Agent outputs are stored and auditable.

## Week 3 – KPI Summary and Shortlinks

* Implement `/kpis/summary` endpoint to aggregate counts for a given time window and brand. Compute approval and posting rates and average time to approve.
* Optionally implement Loop B (shortlinks): endpoints to create shortlinks, handle redirects and log clicks.

**Definition of Done:** KPI endpoint returns accurate metrics for the specified date range, and optional shortlink endpoints are functional.

## Week 4 – QA, Pilot and Hardening

* Add structured logging with request identifiers and brand identifiers.
* Improve error handling in ingestion and generation flows, providing per‑row error information.
* Perform load testing for ingestion and reply generation to validate performance targets.
* Review security posture: ensure PII is never persisted, throttling rules behave as expected, and rate limits cannot be bypassed.
* Create a pilot runbook for onboarding a brand and configuring rulesets.

**Definition of Done:** The system runs a pilot for one brand for a week without requiring schema changes. All basic flows (ingest → generate → approve → post) operate correctly under load.