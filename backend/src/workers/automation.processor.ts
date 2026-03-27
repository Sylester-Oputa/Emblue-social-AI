import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { ResponsesService } from "../responses/responses.service";
import { DeliveryService } from "../delivery/delivery.service";
import { AuditService } from "../audit/audit.service";
import { RiskEventService } from "../signals/risk-event.service";
import { RISK_THRESHOLD } from "../common/constants/queue-events";
import { v4 as uuid } from "uuid";

@Injectable()
export class AutomationProcessor {
  private readonly logger = new Logger(AutomationProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly responsesService: ResponsesService,
    private readonly deliveryService: DeliveryService,
    private readonly auditService: AuditService,
    private readonly riskEventService: RiskEventService,
  ) {}

  /**
   * Full automation pipeline for a signal after policy evaluation.
   *
   * Flow:
   *   1. Check workspace automation is enabled
   *   2. Auto-generate AI reply draft
   *   3. Evaluate risk score from policy decision
   *   4. If clean (risk < threshold): auto-approve → auto-post
   *   5. If risky (risk >= threshold): escalate to dashboard
   */
  async processSignal(data: {
    signalId: string;
    workspaceId: string;
    policyDecisionId: string;
    riskScore: number;
    isBlocked: boolean;
    requiresHumanApproval: boolean;
  }): Promise<void> {
    const { signalId, workspaceId, policyDecisionId, riskScore, isBlocked } =
      data;

    this.logger.log(
      `Automation pipeline started for signal ${signalId} (risk: ${riskScore})`,
    );

    // 1. Stop if policy blocked the signal entirely
    if (isBlocked) {
      this.logger.log(
        `Signal ${signalId} blocked by policy — skipping automation`,
      );
      return;
    }

    // 2. Check workspace automation is enabled
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });
    if (!workspace) {
      this.logger.error(`Workspace ${workspaceId} not found`);
      return;
    }

    // 3. Auto-generate reply draft
    let draft;
    try {
      draft = await this.responsesService.generateStubAIResponse(
        workspaceId,
        signalId,
        "system",
      );
      this.logger.log(
        `Auto-generated draft ${draft.id} for signal ${signalId}`,
      );
    } catch (err) {
      this.logger.error(
        `Failed to auto-generate reply for signal ${signalId}: ${err.message}`,
      );
      return;
    }

    // 4. Attach risk score to the draft
    await this.prisma.responseDraft.update({
      where: { id: draft.id },
      data: { riskScore },
    });

    // 5. Risk-based decision
    if (riskScore >= RISK_THRESHOLD) {
      // ── ESCALATE ──
      await this.escalateDraft(
        draft.id,
        workspaceId,
        signalId,
        riskScore,
        policyDecisionId,
      );
    } else {
      // ── AUTO-APPROVE ──
      await this.autoApproveDraft(draft.id, workspaceId, signalId, riskScore);

      // 6. Auto-post if automation is enabled
      if (workspace.automationEnabled) {
        await this.autoPostDraft(draft.id, workspaceId);
      } else {
        this.logger.log(
          `Workspace automation paused — draft ${draft.id} stays AUTO_APPROVED`,
        );
      }
    }
  }

  private async autoApproveDraft(
    draftId: string,
    workspaceId: string,
    signalId: string,
    riskScore: number,
  ) {
    await this.prisma.responseDraft.update({
      where: { id: draftId },
      data: {
        status: "AUTO_APPROVED",
        approvedBy: "system",
        approvedAt: new Date(),
      },
    });

    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });
    if (workspace) {
      await this.auditService.log({
        tenantId: workspace.tenantId,
        actorType: "system",
        action: "DRAFT_AUTO_APPROVED",
        resourceType: "ResponseDraft",
        resourceId: draftId,
        context: { signalId, riskScore, threshold: RISK_THRESHOLD },
      });
    }

    this.logger.log(
      `Draft ${draftId} auto-approved (risk ${riskScore} < ${RISK_THRESHOLD})`,
    );
  }

  private async escalateDraft(
    draftId: string,
    workspaceId: string,
    signalId: string,
    riskScore: number,
    policyDecisionId: string,
  ) {
    await this.prisma.responseDraft.update({
      where: { id: draftId },
      data: { status: "ESCALATED" },
    });

    // Create an approval request so the dashboard can pick it up
    const queue = await this.prisma.approvalQueue.findFirst({
      where: { workspaceId, isDefault: true },
    });

    if (queue) {
      const slaDeadline = new Date();
      slaDeadline.setHours(slaDeadline.getHours() + queue.slaHours);

      await this.prisma.approvalRequest.create({
        data: {
          queueId: queue.id,
          policyDecisionId,
          signalId,
          draftId,
          status: "PENDING",
          priority: riskScore >= 90 ? 2 : 1,
          slaDeadline,
        },
      });
    }

    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });
    if (workspace) {
      await this.auditService.log({
        tenantId: workspace.tenantId,
        actorType: "system",
        action: "DRAFT_ESCALATED",
        resourceType: "ResponseDraft",
        resourceId: draftId,
        context: { signalId, riskScore, threshold: RISK_THRESHOLD },
      });
    }

    this.logger.log(
      `Draft ${draftId} escalated (risk ${riskScore} >= ${RISK_THRESHOLD})`,
    );

    // Create a RiskEvent for tracking
    await this.riskEventService.create({
      workspaceId,
      draftId,
      signalId,
      category: riskScore >= 90 ? "HARASSMENT" : "OFF_BRAND",
      severity:
        riskScore >= 90 ? "CRITICAL" : riskScore >= 80 ? "HIGH" : "MEDIUM",
      description: `Auto-escalated: risk score ${riskScore} exceeds threshold ${RISK_THRESHOLD}`,
      metadata: { riskScore, threshold: RISK_THRESHOLD, policyDecisionId },
    });
  }

  async autoPostDraft(draftId: string, workspaceId: string) {
    try {
      // Temporarily set status to APPROVED so the delivery service accepts it
      await this.prisma.responseDraft.update({
        where: { id: draftId },
        data: { status: "APPROVED" },
      });

      const idempotencyKey = `auto-${draftId}-${uuid()}`;
      await this.deliveryService.sendResponse(
        workspaceId,
        draftId,
        idempotencyKey,
      );

      this.logger.log(`Draft ${draftId} auto-posted to platform`);
    } catch (err) {
      this.logger.error(
        `Auto-post failed for draft ${draftId}: ${err.message}`,
      );
      // Revert status to AUTO_APPROVED if posting fails
      await this.prisma.responseDraft.update({
        where: { id: draftId },
        data: { status: "AUTO_APPROVED" },
      });
    }
  }
}
