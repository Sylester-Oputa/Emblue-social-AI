# AI-Powered Social Operations — Backend

## Overview

NestJS backend for an AI-powered social media operations platform. Automates the ingestion, analysis, response generation, approval, and delivery pipeline for social media signals across X (Twitter), Instagram, Facebook, and TikTok.

## Architecture

```
Webhook/API → Ingestion → Normalization → Intelligence → Policy Engine → Approval → Delivery
                 ↓              ↓              ↓             ↓            ↓          ↓
              RawEvent    NormalizedSignal  ResponseDraft  PolicyDecision  Queue   Platform API
```

### Key Components

| Module | Purpose |
|--------|---------|
| **Ingestion** | Receives webhooks, PII redaction, 7-day dedup, workspace routing |
| **Workers** | Normalization, sentiment/intent analysis, automation pipeline |
| **Intelligence** | Template-based AI response generation (3 variants per signal) |
| **Policies** | 10-rule policy engine (risk scoring, budget, rate limits) |
| **Approvals** | Auto-approve / escalate workflow with SLA tracking |
| **Delivery** | Platform adapter routing, idempotent posting |
| **Integrations** | OAuth flow, encrypted token storage, scheduled refresh |
| **Analytics** | 15+ KPIs: resolution rate, automation rate, response time |
| **Notifications** | In-app notifications for escalations, approvals, failures |
| **Ops** | System health, queue stats, pipeline metrics |
| **Events** | SSE real-time stream for workspace pipeline events |
| **Campaigns** | Campaign CRUD with draft association |

## Prerequisites

- **Node.js** >= 18
- **PostgreSQL** >= 14
- **Redis** >= 6 (for BullMQ — optional, falls back to setTimeout)
- **npm** >= 9

## Setup

### 1. Install dependencies

```bash
cd backend
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env` (or use the existing `.env`):

```env
DATABASE_URL=postgresql://user:password@localhost:5000/social_ops
PORT=3005
JWT_SECRET=<64-char-hex>
JWT_REFRESH_SECRET=<64-char-hex>
ENCRYPTION_KEY=<64-char-hex>
WEBHOOK_SIGNING_SECRET=<64-char-hex>
FRONTEND_URL=http://localhost:3000
APP_BASE_URL=http://localhost:3005
```

Generate secrets:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Database setup

```bash
npx prisma migrate dev
npx prisma generate
```

### 4. Seed demo data

```bash
npx prisma db seed
```

This creates:
- Demo tenant → workspace → admin user (`admin@demo.emblue.dev` / `DemoP@ss123`)
- 10 policy rules, brand profile
- 15 demo signals across all 4 platforms with sentiment/intent analysis
- 10 response drafts in various statuses
- Platform connections for X and Instagram

## Running

```bash
# Development
npm run start:dev

# Production build
npm run build
npm run start:prod
```

The server starts on port **3005** (configurable via `PORT` env).

## API Documentation

Swagger UI is available at:

```
http://localhost:3005/api
```

### Key Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/auth/login` | JWT login |
| `POST` | `/auth/register` | Register user |
| `POST` | `/ingestion/webhook/:platform` | Receive platform webhooks |
| `GET` | `/workspaces/:id/integrations/connect/:platform` | Start OAuth flow |
| `GET` | `/integrations/callback/:platform` | OAuth callback (public) |
| `GET` | `/workspaces/:id/signals` | List signals |
| `GET` | `/workspaces/:id/responses` | List response drafts |
| `POST` | `/workspaces/:id/delivery` | Send approved response |
| `GET` | `/workspaces/:id/analytics/summary` | Dashboard KPIs |
| `GET` | `/workspaces/:id/campaigns` | Campaign list |
| `GET` | `/notifications` | User notifications |
| `GET` | `/ops/health` | System health check |
| `GET` | `/workspaces/:id/events/stream` | SSE event stream |
| `POST` | `/workspaces/:id/automation/pause` | Pause automation |
| `POST` | `/workspaces/:id/automation/resume` | Resume automation |

## Security

- **Helmet** for HTTP headers
- **CORS** whitelist
- **Rate limiting** (60 req/min global, tighter on auth endpoints)
- **AES-256-GCM** encrypted token storage
- **HMAC** webhook signature verification
- **bcrypt(12)** password hashing
- **JWT** with refresh tokens (no PII in payload)
- **Tenant isolation** on all queries
- **PII redaction** before persistence (emails, phones, SSNs, tokens)

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Type check
npx tsc --noEmit
```

## Demo Credentials

| Email | Password | Role |
|-------|----------|------|
| `admin@demo.emblue.dev` | `DemoP@ss123` | TENANT_ADMIN |
