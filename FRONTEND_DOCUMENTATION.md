# Frontend Documentation

## Social Emblue AI — Dashboard UI Specification

**Version:** 1.0  
**Date:** 2026-03-24  
**Status:** Specification (no frontend implemented yet — API-only MVP)

---

## 1. Overview

This document specifies the frontend application that will consume the Social Emblue AI backend API. The UI is a single-page application (SPA) serving as a **monitoring and oversight dashboard** for social media managers, compliance officers, and team leads. Since the backend is fully automated (ingest → generate → auto-approve → post), the frontend's primary role is **monitoring automation activity, managing rulesets, handling escalated risk events, and viewing KPIs** — not manual approval workflows. It is not yet implemented; the MVP is API-only.

---

## 2. Recommended Technology Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Framework** | React 18+ (or Next.js for SSR) | Component-driven, large ecosystem, proven at scale |
| **Language** | TypeScript | Type safety, contract alignment with OpenAPI schemas |
| **State Management** | TanStack Query (React Query) | Server-state caching, automatic refetch, optimistic updates |
| **UI Library** | shadcn/ui + Tailwind CSS | Accessible components, rapid prototyping, consistent design system |
| **Routing** | React Router v6 (or Next.js App Router) | Nested layouts, route guards |
| **Forms** | React Hook Form + Zod | Validation aligned with API contracts |
| **Charts** | Recharts or Tremor | KPI visualization |
| **HTTP Client** | Axios or native fetch | API communication with interceptors for auth |
| **Real-time** | WebSocket / SSE | Live automation feed — new posts, escalations, risk events |

---

## 3. Information Architecture

```
┌─────────────────────────────────────────────────┐
│                   App Shell                      │
│  ┌─────────┐  ┌─────────────────────────────┐   │
│  │ Sidebar  │  │       Content Area          │   │
│  │          │  │                             │   │
│  │ Dashboard│  │  ┌────────────────────────┐ │   │
│  │ Feed     │  │  │   Active View          │ │   │
│  │ Escalated│  │  │                        │ │   │
│  │ Rulesets │  │  │                        │ │   │
│  │ Risk     │  │  │                        │ │   │
│  │ KPIs     │  │  └────────────────────────┘ │   │
│  │ Settings │  │                             │   │
│  └─────────┘  └─────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

### Route Map

| Route | Page | API Endpoints Consumed |
|---|---|---|
| `/` | Dashboard (KPI overview + automation health) | `GET /kpis/summary` |
| `/feed` | Live automation feed (all auto-posted replies) | `GET /reply-jobs/queue` |
| `/escalated` | Escalated reply jobs requiring human review | `GET /reply-jobs/queue?status=ESCALATED`, `POST /replies/:id/override` |
| `/rulesets` | Ruleset management | CRUD on rulesets (future endpoints) |
| `/risk` | Risk events list | `GET /risk-events` (future), `POST /risk-events` |
| `/settings` | Brand config, API keys, throttle rules, automation controls | Brand + ThrottlingRule + automation pause/resume |

---

## 4. Page Specifications

### 4.1 Dashboard (`/`)

**Purpose:** At-a-glance automation health and operational metrics for the active brand.

**Layout:**
```
┌──────────────────────────────────────────────────────┐
│  Brand Selector (dropdown)          Date Range Picker │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐│
│  │ Messages │ │ Auto-    │ │Automation│ │  Risk   ││
│  │ Ingested │ │ Posted   │ │  Rate    │ │  Events ││
│  │   1,247  │ │    289   │ │   93%    │ │   4     ││
│  └──────────┘ └──────────┘ └──────────┘ └─────────┘│
│                                                      │
│  ┌─────────────────────────┐ ┌──────────────────────┐│
│  │ Escalated (needs review)│ │ Avg Time to Post     ││
│  │         23              │ │      12 sec           ││
│  └─────────────────────────┘ └──────────────────────┘│
│                                                      │
│  ┌──────────────────────────────────────────────────┐│
│  │       Automation Rate Trend (line chart)          ││
│  └──────────────────────────────────────────────────┘│
│                                                      │
│  ┌──────────────────────────────────────────────────┐│
│  │  Automation Status: ● ACTIVE  [Pause ⏸]          ││
│  └──────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────┘
```

**Data Source:** `GET /kpis/summary?brand_id={id}&from={date}&to={date}`

**Metric Cards:**
| Metric | Field | Display |
|---|---|---|
| Messages Ingested | `metrics.messages_ingested` | Count |
| Auto-Posted Replies | `metrics.replies_posted` | Count |
| Automation Rate | `metrics.automation_rate` | Percentage (or "N/A" if null) |
| Posting Rate | `metrics.posting_rate` | Percentage (or "N/A" if null) |
| Escalated Jobs | `metrics.replies_escalated` | Count (amber badge if > 0) |
| Risk Events Open | `metrics.risk_events_open` | Count (red badge if > 0) |
| Avg Time to Post | `metrics.avg_time_to_post_sec` | Human-readable duration |

---

### 4.2 Live Automation Feed (`/feed`)

**Purpose:** Real-time read-only feed of all automated activity (auto-posted replies, escalations).

**Layout:**
```
┌──────────────────────────────────────────────────┐
│  Filter: [All] [Auto-Posted] [Escalated]          │
├──────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────┐│
│  │ Activity Card                                ││
│  │ ┌─────────┐                                  ││
│  │ │ Platform│  @author_handle                   ││
│  │ │  Icon   │  "Original message preview..."    ││
│  │ │         │  ✓ Auto-posted | 12s ago          ││
│  │ │    X    │  Reply: "Thank you for..."        ││
│  │ └─────────┘  [View on Platform →]             ││
│  ├──────────────────────────────────────────────┤│
│  │ Activity Card                                ││
│  │ ┌─────────┐                                  ││
│  │ │ Platform│  @author_handle                   ││
│  │ │  Icon   │  "Message with risk content..."   ││
│  │ │   IG    │  ⚠ ESCALATED | 5m ago             ││
│  │ └─────────┘  [Review & Override →]            ││
│  └──────────────────────────────────────────────┘│
│                                                  │
│  [Load More]  (cursor-based pagination)          │
└──────────────────────────────────────────────────┘
```

**Data Source:** `GET /reply-jobs/queue?limit=20&cursor={nextCursor}`

**Interactions:**
- Filter toggles between all activity, auto-posted only, or escalated only
- "View on Platform" opens the posted reply URL in a new tab
- "Review & Override" navigates to `/escalated/:jobId`
- "Load More" → fetch next page using `next_cursor`

---

### 4.3 Escalation Review (`/escalated/:jobId`)

**Purpose:** Review risk-flagged content that was held from auto-posting. Human can override-approve, edit, or cancel.

**Layout:**
```
┌──────────────────────────────────────────────────────┐
│  ← Back to Escalated Queue                            │
├──────────────────────────────────────────────────────┤
│  ┌─────────────────────────┐  ┌─────────────────────┐│
│  │   Message Context       │  │   Escalation Panel  ││
│  │                         │  │                     ││
│  │  Platform: X            │  │  Status: ESCALATED  ││
│  │  Author: @handle        │  │                     ││
│  │  Text: "Full message"   │  │  ⚠ Risk Reasons:    ││
│  │                         │  │  - Fraud detected   ││
│  │  Thread:                │  │  - Legal threat      ││
│  │  ├─ Parent message      │  │                     ││
│  │  └─ 2 child replies     │  │  ┌───────────────┐  ││
│  │                         │  │  │ Suggestion 1  │  ││
│  │  Brand: Acme Corp       │  │  │ "Reply text"  │  ││
│  │  Ruleset: Default       │  │  │ ⚠ Risk flagged│  ││
│  │                         │  │  │ [Override ✓]  │  ││
│  └─────────────────────────┘  │  ├───────────────┤  ││
│                               │  │ Suggestion 2  │  ││
│                               │  │ "Reply text"  │  ││
│                               │  │ [Override ✓]  │  ││
│                               │  ├───────────────┤  ││
│                               │  │ Custom Reply  │  ││
│                               │  │ [textarea]    │  ││
│                               │  │ [Override ✓]  │  ││
│                               │  └───────────────┘  ││
│                               │                     ││
│                               │  [Cancel Job ✕]     ││
│                               └─────────────────────┘│
└──────────────────────────────────────────────────────┘
```

**API Calls:**
1. **On load:** `GET /messages/:id/context` — populate left panel
2. **Override approve:** `POST /replies/:id/override` with selected suggestion or custom text
3. **Cancel:** `POST /replies/:id/override` with cancel action

**Risk Indicators:**
- All suggestions on this page already have risk flags — shown prominently
- `risk_reasons` displayed inline (not hidden in tooltip)
- Override action requires explicit confirmation dialog

---

### 4.4 Risk Events (`/risk`)

**Purpose:** Monitor and triage flagged content.

**Layout:**
```
┌──────────────────────────────────────────────────┐
│  Filter: [All] [OPEN] [ACKNOWLEDGED] [RESOLVED]  │
│  Severity: [All] [CRITICAL] [HIGH] [MEDIUM] [LOW]│
├──────────────────────────────────────────────────┤
│  Severity │ Category  │ Details       │ Status   │
│  ──────── │ ───────── │ ────────────  │ ──────── │
│  🔴 HIGH  │ Fraud     │ "Attempted..." │ OPEN    │
│  🟡 MED   │ Harassment│ "Offensive..." │ OPEN    │
│  🟢 LOW   │ Legal     │ "Threaten..."  │ RESOLVED│
└──────────────────────────────────────────────────┘
```

---

### 4.5 Ruleset Management (`/rulesets`)

**Purpose:** Configure brand-specific content rules.

**Form Fields:**
| Field | Type | Description |
|---|---|---|
| Name | Text input | Unique name per brand |
| Platform | Select (optional) | Platform-specific rules or null for all |
| Tone | Text input | e.g., "professional", "friendly" |
| Do Not Say | Tag input (array) | Forbidden phrases |
| Required Phrases | Tag input (array) | Must-include phrases |
| Required Disclaimers | Tag input (array) | Appended to every reply |

---

## 5. Component Architecture

### 5.1 Component Tree

```
<App>
  <AuthProvider>                    // API key or JWT context
    <QueryClientProvider>           // TanStack Query
      <AppShell>
        <Sidebar />                 // Navigation
        <Routes>
          <DashboardPage>
            <MetricCard />          // Reusable KPI card
            <TrendChart />          // Recharts line chart
            <AutomationStatusBar /> // Pause/resume toggle
          </DashboardPage>
          <AutomationFeedPage>
            <FilterTabs />          // All / Auto-Posted / Escalated
            <ActivityCard />        // Repeating automation event card
            <LoadMoreButton />
          </AutomationFeedPage>
          <EscalationReviewPage>
            <MessageContext />      // Thread viewer
            <EscalationPanel>
              <RiskReasons />       // Inline risk details
              <SuggestionCard />    // Per-variant with Override button
              <CustomReplyForm />
            </EscalationPanel>
            <OverrideActions />     // Override approve / Cancel
          </EscalationReviewPage>
          <RiskEventsPage>
            <RiskTable />
          </RiskEventsPage>
          <RulesetsPage>
            <RulesetForm />
            <TagInput />            // For array fields
          </RulesetsPage>
          <SettingsPage>
            <AutomationControls /> // Per-brand pause/resume
            <ThrottleConfig />     // Throttle rule editor
          </SettingsPage>
        </Routes>
      </AppShell>
    </QueryClientProvider>
  </AuthProvider>
</App>
```

### 5.2 Shared Components

| Component | Props | Purpose |
|---|---|---|
| `<MetricCard>` | `title`, `value`, `trend?`, `alert?` | KPI display tile |
| `<StatusBadge>` | `status: ReplyJobStatus` | Color-coded status indicator (POSTED / ESCALATED / etc.) |
| `<PlatformIcon>` | `platform: Platform` | Icon for X, Instagram, etc. |
| `<RiskBadge>` | `severity: RiskSeverity` | Color-coded risk indicator |
| `<TagInput>` | `value: string[]`, `onChange` | Array editor for ruleset fields |
| `<ConfirmDialog>` | `title`, `message`, `onConfirm` | Confirmation modal for override/cancel actions |
| `<LoadMore>` | `cursor`, `onLoad`, `loading` | Cursor-based pagination trigger |
| `<AutomationToggle>` | `brandId`, `enabled`, `onToggle` | Pause/resume automation per brand |
| `<ActivityCard>` | `job`, `reply?`, `riskEvent?` | Feed card showing automated action |

---

## 6. API Integration Layer

### 6.1 API Client Configuration

```typescript
// api/client.ts
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach API key to every request
api.interceptors.request.use((config) => {
  const apiKey = import.meta.env.VITE_API_KEY;
  if (apiKey) {
    config.headers['X-API-Key'] = apiKey;
  }
  return config;
});

// Global error handler
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized
    }
    if (error.response?.status === 429) {
      // Handle throttling — show toast
    }
    return Promise.reject(error);
  }
);

export default api;
```

### 6.2 Query Hooks (TanStack Query)

```typescript
// hooks/useKPISummary.ts
import { useQuery } from '@tanstack/react-query';
import api from '../api/client';

interface KPIParams {
  brandId: string;
  from: string;
  to: string;
}

export function useKPISummary(params: KPIParams) {
  return useQuery({
    queryKey: ['kpi-summary', params],
    queryFn: () =>
      api.get('/kpis/summary', { params: {
        brand_id: params.brandId,
        from: params.from,
        to: params.to,
      }}).then(res => res.data),
    staleTime: 60_000, // 1 minute
  });
}
```

```typescript
// hooks/useReplyQueue.ts
import { useInfiniteQuery } from '@tanstack/react-query';
import api from '../api/client';

export function useReplyQueue(status?: string) {
  return useInfiniteQuery({
    queryKey: ['reply-queue', status],
    queryFn: ({ pageParam }) =>
      api.get('/reply-jobs/queue', { params: {
        status,
        limit: 20,
        cursor: pageParam,
      }}).then(res => res.data),
    getNextPageParam: (lastPage) => lastPage.next_cursor,
    initialPageParam: undefined,
    refetchInterval: 10_000, // Poll every 10s for live feed
  });
}
```

```typescript
// hooks/useOverrideReply.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';

export function useOverrideReply() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { replyId: string; action: 'approve' | 'cancel'; finalText?: string }) =>
      api.post(`/replies/${payload.replyId}/override`, payload).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reply-queue'] });
    },
  });
}
```

```typescript
// hooks/useAutomationControl.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';

export function usePauseAutomation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (brandId: string) =>
      api.post(`/brands/${brandId}/automation/pause`).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brand'] });
    },
  });
}

export function useResumeAutomation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (brandId: string) =>
      api.post(`/brands/${brandId}/automation/resume`).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brand'] });
    },
  });
}
```

### 6.3 TypeScript Contracts (Generated from OpenAPI)

The OpenAPI spec (`openapi.yaml`) should be used to auto-generate TypeScript types:

```bash
npx openapi-typescript openapi.yaml -o src/api/types.ts
```

This ensures frontend types always match the backend contract.

---

## 7. State Management Strategy

| State Type | Tool | Example |
|---|---|---|
| **Server state** | TanStack Query | KPI data, automation feed, message context, escalation queue |
| **Form state** | React Hook Form | Ruleset editor, override reply textarea |
| **UI state** | React useState/useReducer | Active tab, modal open, sidebar collapsed |
| **Auth state** | React Context | API key, brand selection |
| **URL state** | React Router params | Current escalation job ID, feed filters |

No global store (Redux/Zustand) is needed for MVP. TanStack Query handles caching, deduplication, and background refetch.

---

## 8. UX Patterns

### 8.1 Real-Time Feed
- Automation feed polls every 10 seconds (or uses WebSocket/SSE when available)
- New auto-posted replies appear at the top with a subtle animation
- Escalated items show a persistent badge on the sidebar

### 8.2 Toast Notifications
- Success: "Override approved — reply will be posted"
- Error: "Override failed — reason" 
- Warning: "Automation paused for Brand X"
- Info: "3 new escalations require review"

### 8.3 Loading States
- Skeleton loaders for feed cards and KPI tiles
- Spinner overlay for override actions
- Disabled buttons during pending mutations

### 8.4 Error Boundaries
- Per-page error boundaries with "Retry" buttons
- API errors displayed as structured toasts with error `code` and `message`

### 8.5 Responsive Design
- Sidebar collapses to icon-only on mobile
- Feed cards stack vertically
- Escalation review switches to tabbed layout (Context | Override) on small screens

---

## 9. Environment Configuration

```env
# .env.local
VITE_API_URL=http://localhost:3000
VITE_API_KEY=your-api-key-here
```

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend API base URL |
| `VITE_API_KEY` | API key for authentication (MVP; replaced by JWT flow in production) |

---

## 10. Accessibility Requirements

| Requirement | Implementation |
|---|---|
| Keyboard navigation | All interactive elements reachable via Tab; Enter/Space to activate |
| Screen reader | ARIA labels on icons, status badges, risk indicators |
| Color contrast | WCAG 2.1 AA minimum (4.5:1 for text, 3:1 for UI components) |
| Focus management | Focus moves to escalation panel when navigating from feed |
| Status announcements | `aria-live` region for toast notifications, new escalations, and automation status changes |

---

## 11. Testing Strategy

| Layer | Tool | Coverage |
|---|---|---|
| **Unit** | Vitest + React Testing Library | Components, hooks, utility functions |
| **Integration** | MSW (Mock Service Worker) | API integration with mocked backend responses |
| **E2E** | Playwright | Full workflow: view feed → open escalation → override approve → verify posted |
| **Visual** | Storybook + Chromatic | Component library visual regression |

---

## 12. Future Enhancements

| Feature | Description | Dependency |
|---|---|---|
| **Real-time Feed** | WebSocket/SSE push for instant automation event streaming | Backend WebSocket support |
| **Multi-brand Switcher** | Global brand selector affecting all views | Multi-tenant auth |
| **Bulk Escalation Actions** | Select multiple escalated jobs → bulk override/cancel | Batch API endpoints |
| **Analytics Dashboard** | Time-series charts: automation rate, response latency, escalation patterns | Analytics pipeline |
| **Platform Preview** | Show how the auto-posted reply looks on X/Instagram | Platform API integration |
| **Audit Log Viewer** | Browse AgentRun records, auto-approval decisions, and risk event history | Audit API endpoints |
| **A/B Variant Analytics** | Track which suggestion variant performs best per platform | Analytics pipeline |
| **Automation Rules Editor** | Visual editor for auto-approval confidence thresholds and escalation criteria | Advanced config API |
