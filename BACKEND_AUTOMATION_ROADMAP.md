# Backend Automation Implementation Roadmap

## Executive Summary

The current backend implements a **manual approval workflow**. The PRD requires **full automation** where clean suggestions are auto-approved and auto-posted without human intervention.

This document provides a phased implementation plan to bridge the gap.

---

## Current State vs Target State

### Current Flow (Manual)
```
Webhook → RawEvent → NormalizedSignal → PolicyDecision → ApprovalRequest
                                                              ↓
                                                    [Wait for Human]
                                                              ↓
                                              Manual PATCH /approvals/:id/approve
                                                              ↓
                                              Manual POST /delivery/send
```

### Target Flow (Automated)
```
Webhook → RawEvent → NormalizedSignal → AI Generate → Policy Check
                                                            ↓
                                              ┌─────────────┴─────────────┐
                                              ↓                           ↓
                                    (Risk Score < 0.7)          (Risk Score >= 0.7)
                                              ↓                           ↓
                                        AUTO_APPROVED                 ESCALATED
                                              ↓                           ↓
                                         Auto-Post                  [Review UI]
                                              ↓                           ↓
                                           POSTED                   Override
                                                                          ↓
                                                                       POSTED
```

---

## Implementation Phases

### **Phase 1: Response Auto-Generation** ✅ (Mostly Complete)
**Status:** Implemented, needs minor enhancements  
**Timeline:** 1-2 days

**Current State:**
- ✅ POST /responses/generate/:signalId exists
- ⚠️ Requires manual trigger

**Required Changes:**
1. Add automatic response generation to PolicyProcessor
2. Create ResponseGenerationProcessor (BullMQ worker)

**Implementation:**

```typescript
// File: src/workers/response-generation.processor.ts
import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { ResponsesService } from '../responses/responses.service';

@Processor('response-generation')
export class ResponseGenerationProcessor {
  constructor(private readonly responsesService: ResponsesService) {}

  @Process('generate')
  async handleGeneration(job: Job) {
    const { signalId, workspaceId } = job.data;
    
    // Generate AI response
    const response = await this.responsesService.generateStubAIResponse(
      workspaceId,
      signalId,
      'SYSTEM_AUTO'
    );
    
    // Trigger policy evaluation
    await this.policyQueue.add('evaluate', {
      responseId: response.id,
      workspaceId
    });
    
    return response;
  }
}
```

**Update PolicyProcessor:**
```typescript
// File: src/workers/policy.processor.ts
async process(job: any): Promise<any> {
  const { signalId, workspaceId } = job.data;
  
  const signal = await this.prisma.normalizedSignal.findUnique({
    where: { id: signalId },
  });

  if (!signal) {
    throw new Error(`Signal not found: ${signalId}`);
  }

  // NEW: Auto-generate response
  await this.responseGenerationQueue.add('generate', {
    signalId,
    workspaceId
  });

  return { processed: true, signalId };
}
```

**Database Changes:** None required

**Testing:**
```bash
npx playwright test automation-pipeline.spec.ts -g "FR-15"
```

---

### **Phase 2: Auto-Approval Logic** 🔴 (Not Implemented)
**Status:** Critical - blocks full automation  
**Timeline:** 3-5 days

**Current State:**
- ❌ No auto-approval logic
- ❌ All responses require manual approval

**Required Changes:**
1. Add auto-approval logic to PolicyProcessor or create new AutoApprovalProcessor
2. Update ResponseDraft model to include status tracking
3. Implement risk-based decision tree

**Implementation:**

#### 2.1 Database Schema Changes
```prisma
// File: prisma/schema.prisma

model ResponseDraft {
  id                  String   @id @default(uuid())
  workspaceId         String
  normalizedSignalId  String
  text                String
  status              ResponseStatus @default(DRAFT)
  riskScore           Float?
  autoApproved        Boolean @default(false)
  autoApprovedAt      DateTime?
  escalated           Boolean @default(false)
  escalatedAt         DateTime?
  escalationReason    String?
  overrideApproved    Boolean @default(false)
  overrideApprovedBy  String?
  overrideReason      String?
  deliveredAt         DateTime?
  // ... existing fields
}

enum ResponseStatus {
  DRAFT
  GENERATED
  AUTO_APPROVED
  ESCALATED
  OVERRIDE_APPROVED
  POSTED
  FAILED
}
```

**Migration:**
```bash
npx prisma migrate dev --name add_auto_approval_fields
```

#### 2.2 Create AutoApprovalProcessor
```typescript
// File: src/workers/auto-approval.processor.ts
import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { PrismaService } from '../database/prisma.service';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Processor('auto-approval')
export class AutoApprovalProcessor {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('delivery') private deliveryQueue: Queue,
  ) {}

  @Process('evaluate')
  async handleAutoApproval(job: Job) {
    const { responseId, policyDecisionId } = job.data;
    
    // Get response and policy decision
    const response = await this.prisma.responseDraft.findUnique({
      where: { id: responseId },
      include: { normalizedSignal: true }
    });
    
    const decision = await this.prisma.policyDecision.findUnique({
      where: { id: policyDecisionId }
    });
    
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: response.workspaceId }
    });
    
    // Check if automation is enabled
    if (!workspace.automationEnabled) {
      this.logger.log(`Automation disabled for workspace ${workspace.id}`);
      return { skipped: true, reason: 'Automation disabled' };
    }
    
    // Auto-approval threshold (configurable per workspace)
    const AUTO_APPROVE_THRESHOLD = workspace.autoApproveRiskThreshold || 0.7;
    
    if (decision.riskScore < AUTO_APPROVE_THRESHOLD && !decision.requiresHumanApproval) {
      // AUTO-APPROVE: Clean content
      await this.prisma.responseDraft.update({
        where: { id: responseId },
        data: {
          status: 'AUTO_APPROVED',
          autoApproved: true,
          autoApprovedAt: new Date(),
          riskScore: decision.riskScore
        }
      });
      
      this.logger.log(`Auto-approved response ${responseId} (risk: ${decision.riskScore})`);
      
      // Trigger auto-posting
      await this.deliveryQueue.add('auto-post', {
        responseId,
        workspaceId: response.workspaceId
      });
      
      return { approved: true, riskScore: decision.riskScore };
      
    } else {
      // ESCALATE: Risky content
      await this.prisma.responseDraft.update({
        where: { id: responseId },
        data: {
          status: 'ESCALATED',
          escalated: true,
          escalatedAt: new Date(),
          escalationReason: `Risk score: ${decision.riskScore}`,
          riskScore: decision.riskScore
        }
      });
      
      this.logger.warn(`Escalated response ${responseId} (risk: ${decision.riskScore})`);
      
      // Create escalation notification
      await this.prisma.notification.create({
        data: {
          workspaceId: response.workspaceId,
          type: 'ESCALATION',
          title: 'High-risk response requires review',
          message: `Response for signal ${response.normalizedSignalId} was flagged`,
          metadata: { responseId, riskScore: decision.riskScore }
        }
      });
      
      return { escalated: true, riskScore: decision.riskScore };
    }
  }
}
```

#### 2.3 Update PolicyProcessor
```typescript
// File: src/workers/policy.processor.ts (UPDATE)
async process(job: any): Promise<any> {
  const { responseId, workspaceId } = job.data;

  const response = await this.prisma.responseDraft.findUnique({
    where: { id: responseId }
  });

  if (!response) {
    throw new Error(`Response not found: ${responseId}`);
  }

  // Evaluate policy
  const decision = await this.policiesService.evaluateResponse(
    responseId,
    workspaceId
  );

  // NEW: Trigger auto-approval evaluation
  await this.autoApprovalQueue.add('evaluate', {
    responseId,
    policyDecisionId: decision.id
  });

  return { processed: true, responseId };
}
```

**Testing:**
```bash
npx playwright test automation-pipeline.spec.ts -g "FR-16"
```

**Success Criteria:**
- ✅ Responses with risk score < 0.7 get status `AUTO_APPROVED`
- ✅ Responses with risk score >= 0.7 get status `ESCALATED`
- ✅ Auto-approved responses trigger delivery queue
- ✅ Escalated responses create notifications

---

### **Phase 3: Auto-Posting** 🔴 (Not Implemented)
**Status:** Critical - completes automation loop  
**Timeline:** 3-4 days

**Current State:**
- ✅ POST /delivery/send exists
- ❌ Requires manual trigger

**Required Changes:**
1. Create DeliveryProcessor (BullMQ worker)
2. Implement automatic posting after auto-approval
3. Add retry logic and error handling

**Implementation:**

```typescript
// File: src/workers/delivery.processor.ts
import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { DeliveryService } from '../delivery/delivery.service';
import { PrismaService } from '../database/prisma.service';

@Processor('delivery')
export class DeliveryProcessor {
  constructor(
    private readonly deliveryService: DeliveryService,
    private readonly prisma: PrismaService,
  ) {}

  @Process('auto-post')
  async handleAutoPost(job: Job) {
    const { responseId, workspaceId } = job.data;
    
    this.logger.log(`Auto-posting response ${responseId}`);
    
    try {
      // Generate idempotency key
      const idempotencyKey = `auto-${responseId}-${Date.now()}`;
      
      // Send response to platform
      const result = await this.deliveryService.sendResponse(
        workspaceId,
        responseId,
        idempotencyKey
      );
      
      // Update status
      await this.prisma.responseDraft.update({
        where: { id: responseId },
        data: {
          status: 'POSTED',
          deliveredAt: new Date(),
          deliveryMetadata: result
        }
      });
      
      this.logger.log(`Successfully posted response ${responseId}`);
      
      return { posted: true, responseId };
      
    } catch (error) {
      this.logger.error(`Failed to post response ${responseId}:`, error);
      
      // Update status to failed
      await this.prisma.responseDraft.update({
        where: { id: responseId },
        data: {
          status: 'FAILED',
          errorMessage: error.message
        }
      });
      
      // Retry logic (BullMQ handles this automatically with job options)
      throw error;
    }
  }
}
```

**Update DeliveryService:**
```typescript
// File: src/delivery/delivery.service.ts
async sendResponse(
  workspaceId: string,
  draftId: string,
  idempotencyKey: string
): Promise<any> {
  const draft = await this.prisma.responseDraft.findUnique({
    where: { id: draftId },
    include: {
      normalizedSignal: {
        include: { rawEvent: true }
      }
    }
  });

  if (!draft) {
    throw new NotFoundException('Response draft not found');
  }

  // Get platform integration
  const integration = await this.prisma.integration.findFirst({
    where: {
      workspaceId,
      platform: draft.normalizedSignal.platform,
      status: 'ACTIVE'
    }
  });

  if (!integration) {
    throw new NotFoundException('Platform integration not configured');
  }

  // Call platform adapter
  const adapter = this.platformAdapterFactory.getAdapter(
    draft.normalizedSignal.platform
  );

  const result = await adapter.postReply({
    messageId: draft.normalizedSignal.rawEvent.externalId,
    text: draft.text,
    credentials: integration.credentials
  });

  return result;
}
```

**Queue Configuration:**
```typescript
// File: src/workers/workers.module.ts
@Module({
  imports: [
    BullModule.registerQueue(
      { name: 'ingestion' },
      { name: 'normalization' },
      { name: 'response-generation' },
      { name: 'policy' },
      { name: 'auto-approval' },
      {
        name: 'delivery',
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000
          },
          removeOnComplete: true,
          removeOnFail: false
        }
      }
    ),
  ],
  providers: [
    IngestionProcessor,
    NormalizationProcessor,
    ResponseGenerationProcessor,
    PolicyProcessor,
    AutoApprovalProcessor,
    DeliveryProcessor
  ]
})
export class WorkersModule {}
```

**Testing:**
```bash
npx playwright test automation-pipeline.spec.ts -g "FR-17"
npx playwright test automation-pipeline.spec.ts -g "E2E"
```

**Success Criteria:**
- ✅ Auto-approved responses automatically post to platform
- ✅ Status updates to `POSTED` after successful delivery
- ✅ Failed deliveries retry 3 times with exponential backoff
- ✅ End-to-end flow completes without manual intervention

---

### **Phase 4: Automation Controls** 🟡 (Not Implemented)
**Status:** High priority - safety mechanism  
**Timeline:** 2-3 days

**Current State:**
- ❌ No pause/resume endpoints
- ❌ No automation status tracking

**Required Changes:**
1. Add automation control endpoints to WorkspacesController
2. Update Workspace model with automation settings
3. Implement pause/resume logic in processors

**Implementation:**

#### 4.1 Database Schema
```prisma
// File: prisma/schema.prisma

model Workspace {
  id                        String   @id @default(uuid())
  name                      String
  tenantId                  String
  automationEnabled         Boolean  @default(true)
  autoApproveRiskThreshold  Float    @default(0.7)
  // ... existing fields
}
```

**Migration:**
```bash
npx prisma migrate dev --name add_automation_controls
```

#### 4.2 Add Controller Endpoints
```typescript
// File: src/workspaces/workspaces.controller.ts

@Patch(':id/automation/pause')
@Roles('WORKSPACE_ADMIN', 'TENANT_ADMIN')
@ApiOperation({ summary: 'Pause automation for workspace' })
async pauseAutomation(
  @Param('id') id: string,
  @Request() req: any
) {
  return this.workspacesService.updateAutomation(id, false, req.user.userId);
}

@Patch(':id/automation/resume')
@Roles('WORKSPACE_ADMIN', 'TENANT_ADMIN')
@ApiOperation({ summary: 'Resume automation for workspace' })
async resumeAutomation(
  @Param('id') id: string,
  @Request() req: any
) {
  return this.workspacesService.updateAutomation(id, true, req.user.userId);
}

@Get(':id/automation/status')
@Roles('VIEWER', 'OPERATOR', 'REVIEWER', 'ANALYST', 'WORKSPACE_ADMIN', 'TENANT_ADMIN')
@ApiOperation({ summary: 'Get automation status' })
async getAutomationStatus(@Param('id') id: string) {
  return this.workspacesService.getAutomationStatus(id);
}
```

#### 4.3 Service Implementation
```typescript
// File: src/workspaces/workspaces.service.ts

async updateAutomation(
  workspaceId: string,
  enabled: boolean,
  userId: string
): Promise<any> {
  const workspace = await this.prisma.workspace.update({
    where: { id: workspaceId },
    data: { automationEnabled: enabled }
  });

  // Create audit log
  await this.prisma.auditLog.create({
    data: {
      workspaceId,
      userId,
      action: enabled ? 'AUTOMATION_RESUMED' : 'AUTOMATION_PAUSED',
      resourceType: 'WORKSPACE',
      resourceId: workspaceId,
      metadata: { automationEnabled: enabled }
    }
  });

  this.logger.log(
    `Automation ${enabled ? 'resumed' : 'paused'} for workspace ${workspaceId}`
  );

  return {
    success: true,
    data: {
      workspaceId,
      automationEnabled: enabled,
      updatedBy: userId,
      updatedAt: new Date()
    }
  };
}

async getAutomationStatus(workspaceId: string): Promise<any> {
  const workspace = await this.prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      automationEnabled: true,
      autoApproveRiskThreshold: true
    }
  });

  // Get automation metrics
  const metrics = await this.analyticsService.getAutomationMetrics(workspaceId);

  return {
    success: true,
    data: {
      enabled: workspace.automationEnabled,
      riskThreshold: workspace.autoApproveRiskThreshold,
      metrics
    }
  };
}
```

**Testing:**
```bash
npx playwright test automation-pipeline.spec.ts -g "FR-20"
```

**Success Criteria:**
- ✅ POST /workspaces/:id/automation/pause disables automation
- ✅ POST /workspaces/:id/automation/resume enables automation
- ✅ Processors check `automationEnabled` before auto-approving
- ✅ Audit logs track automation state changes

---

### **Phase 5: Override Flow** 🟡 (Not Implemented)
**Status:** High priority - manual escalation handling  
**Timeline:** 2-3 days

**Current State:**
- ❌ No override endpoints
- ❌ Escalated content has no manual approval path

**Required Changes:**
1. Add override endpoint to ResponsesController
2. Implement override approval logic
3. Update frontend to show override UI

**Implementation:**

```typescript
// File: src/responses/responses.controller.ts

@Post(':id/override')
@Roles('REVIEWER', 'WORKSPACE_ADMIN', 'TENANT_ADMIN')
@ApiOperation({ summary: 'Override escalation and approve response' })
async overrideEscalation(
  @Param('workspaceId') workspaceId: string,
  @Param('id') id: string,
  @Body('reason') reason: string,
  @Body('editedText') editedText: string,
  @Request() req: any,
) {
  return this.responsesService.overrideEscalation(
    id,
    workspaceId,
    reason,
    editedText,
    req.user.userId
  );
}
```

```typescript
// File: src/responses/responses.service.ts

async overrideEscalation(
  responseId: string,
  workspaceId: string,
  reason: string,
  editedText: string | null,
  userId: string
): Promise<any> {
  const response = await this.prisma.responseDraft.findUnique({
    where: { id: responseId }
  });

  if (!response) {
    throw new NotFoundException('Response not found');
  }

  if (response.status !== 'ESCALATED') {
    throw new BadRequestException('Only escalated responses can be overridden');
  }

  // Update response with override
  const updated = await this.prisma.responseDraft.update({
    where: { id: responseId },
    data: {
      status: 'OVERRIDE_APPROVED',
      overrideApproved: true,
      overrideApprovedBy: userId,
      overrideReason: reason,
      text: editedText || response.text
    }
  });

  // Trigger delivery
  await this.deliveryQueue.add('auto-post', {
    responseId,
    workspaceId
  });

  // Create audit log
  await this.prisma.auditLog.create({
    data: {
      workspaceId,
      userId,
      action: 'OVERRIDE_APPROVAL',
      resourceType: 'RESPONSE',
      resourceId: responseId,
      metadata: { reason, originalRiskScore: response.riskScore }
    }
  });

  return {
    success: true,
    data: updated
  };
}
```

**Testing:**
```bash
npx playwright test automation-pipeline.spec.ts -g "FR-19"
```

**Success Criteria:**
- ✅ POST /responses/:id/override approves escalated content
- ✅ Override reason is logged
- ✅ Overridden responses trigger delivery
- ✅ Audit trail captures override actions

---

### **Phase 6: Enhanced Analytics** 🟢 (Enhancement)
**Status:** Medium priority - monitoring  
**Timeline:** 2-3 days

**Implementation:**

```typescript
// File: src/analytics/analytics.service.ts

async getAutomationMetrics(workspaceId: string, period: string = '7d'): Promise<any> {
  const since = this.calculateSinceDate(period);
  
  const [
    totalResponses,
    autoApproved,
    escalated,
    posted,
    failed
  ] = await Promise.all([
    this.prisma.responseDraft.count({
      where: { workspaceId, createdAt: { gte: since } }
    }),
    this.prisma.responseDraft.count({
      where: { workspaceId, autoApproved: true, createdAt: { gte: since } }
    }),
    this.prisma.responseDraft.count({
      where: { workspaceId, escalated: true, createdAt: { gte: since } }
    }),
    this.prisma.responseDraft.count({
      where: { workspaceId, status: 'POSTED', createdAt: { gte: since } }
    }),
    this.prisma.responseDraft.count({
      where: { workspaceId, status: 'FAILED', createdAt: { gte: since } }
    })
  ]);
  
  // Calculate processing time
  const avgProcessingTime = await this.calculateAvgProcessingTime(workspaceId, since);
  
  return {
    period,
    totalResponses,
    autoApproved,
    autoApprovalRate: totalResponses > 0 ? (autoApproved / totalResponses) * 100 : 0,
    escalated,
    escalationRate: totalResponses > 0 ? (escalated / totalResponses) * 100 : 0,
    posted,
    postingRate: totalResponses > 0 ? (posted / totalResponses) * 100 : 0,
    failed,
    failureRate: totalResponses > 0 ? (failed / totalResponses) * 100 : 0,
    avgProcessingTimeMs: avgProcessingTime
  };
}
```

---

## Testing Strategy

### Unit Tests
```bash
# Create unit tests for each processor
npm run test -- auto-approval.processor.spec.ts
npm run test -- delivery.processor.spec.ts
```

### Integration Tests (Playwright)
```bash
# Run full automation test suite
npx playwright test automation-pipeline.spec.ts

# Run specific feature tests
npx playwright test -g "FR-16"  # Auto-approval
npx playwright test -g "FR-17"  # Auto-posting
npx playwright test -g "E2E"    # End-to-end
```

### Manual Validation
1. Enable automation for test workspace
2. Ingest test message via POST /ingestion/webhook/X
3. Wait 10-15 seconds
4. Verify response was auto-approved and posted
5. Check analytics for automation metrics

---

## Rollout Plan

### Week 1: Foundation
- ✅ Day 1-2: Phase 1 (Auto-generation)
- ✅ Day 3-5: Phase 2 (Auto-approval) - Part 1

### Week 2: Core Automation
- ✅ Day 1-2: Phase 2 (Auto-approval) - Part 2
- ✅ Day 3-5: Phase 3 (Auto-posting)

### Week 3: Controls & Safety
- ✅ Day 1-2: Phase 4 (Automation controls)
- ✅ Day 3-4: Phase 5 (Override flow)
- ✅ Day 5: Integration testing

### Week 4: Polish & Launch
- ✅ Day 1-2: Phase 6 (Analytics)
- ✅ Day 3-4: End-to-end testing
- ✅ Day 5: Production deployment

---

## Success Metrics

### Technical Metrics
- ✅ Auto-approval rate > 80% (for clean content)
- ✅ Escalation rate < 20%
- ✅ Avg processing time < 10 seconds (ingest to post)
- ✅ Posting success rate > 95%

### Business Metrics
- ✅ Response time (webhook to posted) < 30 seconds
- ✅ Zero manual interventions for clean content
- ✅ 100% of risky content escalated for review
- ✅ Override approval < 5 minutes (for escalated content)

---

## Risk Mitigation

### Risk: Auto-approval posts inappropriate content
**Mitigation:**
- Start with conservative risk threshold (0.5 instead of 0.7)
- Implement "shadow mode" where auto-approvals are marked but not posted
- Review escalation logs daily for first 2 weeks
- Add content safety checks (OpenAI Moderation API)

### Risk: Automation causes API rate limiting
**Mitigation:**
- Implement rate limiting in delivery processor
- Add exponential backoff for retries
- Monitor platform API usage metrics
- Set up alerts for rate limit approaching

### Risk: Processor failures cause message loss
**Mitigation:**
- Use BullMQ's at-least-once delivery guarantee
- Store all events in database before processing
- Implement dead letter queue for failed jobs
- Set up monitoring and alerts for queue depth

---

## Monitoring & Observability

### Metrics to Track
- Queue depth (each processor)
- Processing times (p50, p95, p99)
- Auto-approval rate
- Escalation rate
- Posting success rate
- API error rates

### Alerts
- Queue depth > 1000 (backlog building)
- Processing time > 30 seconds
- Posting failure rate > 5%
- Auto-approval rate < 50% (may indicate model issues)

### Dashboards
- Real-time automation status
- Hourly/daily automation metrics
- Escalation review queue
- Platform API health

---

## Development Commands

```bash
# Start development
npm run start:dev

# Run migrations
npx prisma migrate dev

# Generate Prisma client
npx prisma generate

# Run tests
npm run test
npx playwright test

# Check queue status
npm run queue:status

# Purge queues (development only)
npm run queue:purge
```

---

## Support & Documentation

- **PRD:** `/PRD.md`
- **Architecture:** `/TECHNICAL_ARCHITECTURE.md`
- **Test Suite:** `/backend/tests/automation-pipeline.spec.ts`
- **API Docs:** `http://localhost:3000/docs` (Swagger)

---

**Prepared By:** AI Backend Developer  
**Last Updated:** January 2025  
**Status:** Ready for Implementation
