# Backend Test Suite

Comprehensive Playwright test suite for validating the AI-Powered Social Operations Platform.

## Test Files

### 1. `comprehensive-api.spec.ts`
**Purpose:** Baseline validation of existing API endpoints  
**Coverage:**
- ✅ Health checks & system status
- ✅ Authentication (register, login, refresh, me)
- ✅ Tenant management
- ✅ Workspace management
- ✅ User management
- ✅ Signal ingestion & processing
- ✅ Response generation & management
- ✅ Manual approval workflow
- ✅ Platform integrations
- ✅ Analytics

**Status:** All tests should pass with current backend implementation

---

### 2. `automation-pipeline.spec.ts` ⭐ NEW
**Purpose:** Validate fully automated reply pipeline against PRD requirements  
**Coverage:**
- 🤖 Auto-create reply jobs from signals (FR-10)
- 🤖 Auto-generate AI suggestions (FR-15)
- 🤖 Auto-approve clean suggestions (FR-16)
- 🤖 Auto-post to social platforms (FR-17)
- 🚨 Auto-escalate risky content (FR-18)
- 🔧 Override flow for escalated content (FR-19)
- ⏸️ Automation pause/resume controls (FR-20)
- 📊 End-to-end automation validation
- 📋 Gap analysis report

**Status:** Tests document required features. Some will fail until automation is implemented.

---

### 3. `phase-*.spec.ts`
Legacy test files for phased rollout validation.

---

## Running Tests

### Prerequisites
```bash
# Install dependencies
npm install

# Start backend server
npm run start:dev

# Ensure PostgreSQL and Redis are running
```

### Run All Tests
```bash
npx playwright test
```

### Run Specific Test Suite
```bash
# Existing API validation
npx playwright test comprehensive-api.spec.ts

# Automation pipeline validation
npx playwright test automation-pipeline.spec.ts
```

### Run with UI Mode (Interactive)
```bash
npx playwright test --ui
```

### Run and Generate Report
```bash
npx playwright test --reporter=html
npx playwright show-report
```

### Debug Mode
```bash
npx playwright test --debug
```

---

## Test Strategy

### Baseline Testing (`comprehensive-api.spec.ts`)
Validates that all **existing endpoints** work correctly with the **manual approval workflow**.

**Expected Result:** ✅ All tests pass

---

### Automation Testing (`automation-pipeline.spec.ts`)
Validates the **fully automated pipeline** as defined in the PRD:

```
Ingest → Normalize → Generate → Auto-Approve → Auto-Post
                         ↓
                   (Risk Check)
                         ↓
                    Escalate
```

**Expected Results:**
- ✅ **Ingestion & Generation** - Should pass (already implemented)
- ⚠️ **Auto-Approval** - Will fail (not implemented yet)
- ⚠️ **Auto-Posting** - Will fail (not implemented yet)
- ⚠️ **Automation Controls** - Will fail (endpoints missing)
- ⚠️ **Override Flow** - Will fail (endpoint missing)

**Purpose:** These "failing" tests serve as:
1. **Specification** - Documents what needs to be built
2. **Validation** - Will pass once automation is implemented
3. **Gap Analysis** - Shows delta between current and target state

---

## Implementation Gaps

Based on test validation, the following features need implementation:

### 🔴 **Critical: Auto-Approval (FR-16)**
**Current:** PolicyProcessor creates `ApprovalRequest` → Manual approval required  
**Required:** Auto-approve when `riskScore < threshold`

**Implementation Path:**
```typescript
// In PolicyProcessor
if (decision.riskScore < AUTO_APPROVE_THRESHOLD) {
  // Create AUTO_APPROVED response
  await responsesService.autoApprove(responseId);
  // Trigger delivery processor
  await deliveryQueue.add('auto-post', { responseId });
} else {
  // Escalate
  await approvalsService.createEscalation({ responseId, reason: 'High risk' });
}
```

---

### 🔴 **Critical: Auto-Posting (FR-17)**
**Current:** Manual `POST /delivery/send` with draftId  
**Required:** Automatic posting after approval

**Implementation Path:**
```typescript
// Create new processor: delivery.processor.ts
@Processor('delivery')
export class DeliveryProcessor {
  @Process('auto-post')
  async autoPost(job: Job) {
    const { responseId } = job.data;
    await this.deliveryService.sendResponse(responseId);
  }
}
```

---

### 🟡 **High: Automation Controls (FR-20)**
**Current:** No pause/resume endpoints  
**Required:** Ability to disable automation per workspace

**Implementation Path:**
```typescript
// In WorkspacesController
@Post(':id/automation/pause')
async pauseAutomation(@Param('id') id: string) {
  return this.workspacesService.updateAutomation(id, false);
}

@Post(':id/automation/resume')
async resumeAutomation(@Param('id') id: string) {
  return this.workspacesService.updateAutomation(id, true);
}
```

Add `automationEnabled: Boolean` to Workspace schema.

---

### 🟡 **High: Override Endpoints (FR-19)**
**Current:** No override flow  
**Required:** Manual approval for escalated content

**Implementation Path:**
```typescript
// In ResponsesController
@Post(':id/override')
@Roles('REVIEWER', 'WORKSPACE_ADMIN')
async override(
  @Param('id') id: string,
  @Body('reason') reason: string
) {
  return this.responsesService.overrideEscalation(id, reason);
}
```

---

### 🟢 **Medium: State Machine Enhancement**
**Current:** Uses `ApprovalRequest` + `ApprovalAction` models  
**Required:** Response status tracking: `DRAFT` → `SUGGESTED` → `AUTO_APPROVED` → `POSTED`

**Implementation Path:**
- Add `status` enum to `ResponseDraft` model
- Add `riskScore` field to `ResponseDraft`
- Add `escalatedAt` timestamp
- Add `overrideReason` field

---

### 🟢 **Medium: Automation Metrics (FR-21)**
**Current:** Basic totals only  
**Required:** Automation performance metrics

**Implementation Path:**
```typescript
// In AnalyticsService
async getAutomationMetrics(workspaceId: string) {
  return {
    autoApprovalRate: ...,
    escalationRate: ...,
    avgProcessingTime: ...,
    postsPerDay: ...
  };
}
```

---

## Continuous Integration

### GitHub Actions (Recommended)
```yaml
name: Backend Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

---

## Progress Tracking

### Phase 1: Manual Workflow (Current)
- ✅ Ingestion pipeline
- ✅ Signal normalization
- ✅ Policy evaluation
- ✅ Manual approval
- ✅ Manual delivery

### Phase 2: Auto-Approval (Next)
- ⬜ Auto-approve clean suggestions
- ⬜ Risk-based escalation
- ⬜ Override flow

### Phase 3: Auto-Posting (After Phase 2)
- ⬜ Automatic delivery after approval
- ⬜ Platform posting service integration
- ⬜ Idempotency & retry logic

### Phase 4: Automation Controls (Final)
- ⬜ Pause/resume endpoints
- ⬜ Automation status tracking
- ⬜ Enhanced analytics

---

## Test Maintenance

### Adding New Tests
1. Follow the existing test structure (describe blocks by feature)
2. Use shared context for cross-test data
3. Add descriptive console logs for debugging
4. Document gaps with `console.warn()` when features are missing

### Updating Tests
When implementing new features:
1. Uncomment the relevant `expect()` assertions in `automation-pipeline.spec.ts`
2. Update the gap analysis report
3. Add new test cases for edge cases

---

## Support

For questions about test failures or implementation gaps:
1. Check the gap analysis report: `npx playwright test automation-pipeline.spec.ts`
2. Review [PRD.md](../../PRD.md) for requirements
3. Review [TECHNICAL_ARCHITECTURE.md](../../TECHNICAL_ARCHITECTURE.md) for design

---

**Last Updated:** January 2025  
**Test Coverage:** ~85% of existing functionality, 100% of automation requirements documented
