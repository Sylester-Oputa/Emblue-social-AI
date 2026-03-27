import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { PolicyEnforcementService } from "../policies/policy-enforcement.service";
import { EscalationService } from "../signals/escalation.service";

interface AutoApprovalJobData {
  responseDraftId: string;
  signalId: string;
  workspaceId: string;
  responseText: string;
}

@Injectable()
export class AutoApprovalProcessor {
  private readonly logger = new Logger(AutoApprovalProcessor.name);

  private readonly RISK_THRESHOLD_AUTO_APPROVE = parseInt(
    process.env.RISK_THRESHOLD_AUTO_APPROVE || "70",
    10,
  );

  constructor(
    private readonly prisma: PrismaService,
    private readonly policyEnforcement: PolicyEnforcementService,
    private readonly escalation: EscalationService,
  ) {}

  /**
   * Main entry point for auto-approval processing
   */
  async process(job: AutoApprovalJobData): Promise<any> {
    const { responseDraftId, signalId, workspaceId, responseText } = job;

    this.logger.log(
      `Processing auto-approval for response ${responseDraftId}, signal ${signalId}`,
    );

    try {
      // 1. Evaluate content against policies
      const enforcementResult = await this.policyEnforcement.evaluateContent({
        signalId,
        workspaceId,
        responseText,
      });

      // 2. Create policy decision record
      const policyDecision = await this.policyEnforcement.createPolicyDecision({
        signalId,
        enforcementResult,
      });

      this.logger.log(
        `Policy evaluation complete: riskScore=${enforcementResult.riskScore}`,
      );

      // 3. Check if content should be auto-approved
      if (enforcementResult.riskScore < this.RISK_THRESHOLD_AUTO_APPROVE) {
        // AUTO-APPROVE: Low risk content
        await this.autoApproveResponse(
          responseDraftId,
          policyDecision.id,
          enforcementResult,
        );

        this.logger.log(
          `Response ${responseDraftId} AUTO-APPROVED (risk: ${enforcementResult.riskScore})`,
        );

        return {
          status: "AUTO_APPROVED",
          responseDraftId,
          riskScore: enforcementResult.riskScore,
        };
      } else {
        // ESCALATE: High risk content
        await this.escalateResponse(
          responseDraftId,
          signalId,
          workspaceId,
          policyDecision.id,
          enforcementResult,
        );

        this.logger.warn(
          `Response ${responseDraftId} ESCALATED (risk: ${enforcementResult.riskScore})`,
        );

        return {
          status: "ESCALATED",
          responseDraftId,
          riskScore: enforcementResult.riskScore,
        };
      }
    } catch (error) {
      this.logger.error(
        `Auto-approval failed for response ${responseDraftId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Auto-approve response and mark ready for delivery
   */
  private async autoApproveResponse(
    responseDraftId: string,
    policyDecisionId: string,
    enforcementResult: any,
  ) {
    // Get response draft details
    const responseDraft = await this.prisma.responseDraft.findUnique({
      where: { id: responseDraftId },
      include: {
        signal: {
          select: {
            id: true,
            workspaceId: true,
            platform: true,
          },
        },
      },
    });

    if (!responseDraft) {
      throw new Error(`Response draft ${responseDraftId} not found`);
    }

    // Update response draft status
    await this.prisma.responseDraft.update({
      where: { id: responseDraftId },
      data: {
        status: "AUTO_APPROVED",
        approvedBy: "SYSTEM_AUTO_APPROVAL",
        approvedAt: new Date(),
        metadata: {
          ...(typeof responseDraft.metadata === "object"
            ? responseDraft.metadata
            : {}),
          autoApproved: true,
          riskScore: enforcementResult.riskScore,
          policyDecisionId,
        },
      },
    });

    this.logger.log(
      `Response ${responseDraftId} auto-approved (risk score: ${enforcementResult.riskScore}). ` +
        `Ready for delivery to ${responseDraft.signal.platform}`,
    );

    // TODO: Trigger delivery via EventEmitter or queue
    // await this.eventEmitter.emit('delivery.requested', {
    //   responseDraftId,
    //   workspaceId: responseDraft.signal.workspaceId,
    //   signalId: responseDraft.signal.id,
    //   platform: responseDraft.signal.platform,
    // });
  }

  /**
   * Escalate response for manual review
   */
  private async escalateResponse(
    responseDraftId: string,
    signalId: string,
    workspaceId: string,
    policyDecisionId: string,
    enforcementResult: any,
  ) {
    // Get response draft for approval request
    const responseDraft = await this.prisma.responseDraft.findUnique({
      where: { id: responseDraftId },
      select: { content: true },
    });

    if (!responseDraft) {
      throw new Error(`Response draft ${responseDraftId} not found`);
    }

    // Create RiskEvent via EscalationService
    const riskEvent = await this.escalation.escalateContent({
      signalId,
      workspaceId,
      responseText: responseDraft?.content || "",
      riskScore: enforcementResult.riskScore,
      blockedReasons: enforcementResult.blockedReasons,
    });

    // Update response draft status to ESCALATED
    await this.prisma.responseDraft.update({
      where: { id: responseDraftId },
      data: {
        status: "ESCALATED",
        metadata: {
          escalated: true,
          escalatedAt: new Date().toISOString(),
          riskEventId: riskEvent.id,
          riskScore: enforcementResult.riskScore,
          policyDecisionId,
        },
      },
    });

    // Create ApprovalRequest for manual intervention
    // First, get or create default approval queue
    let approvalQueue = await this.prisma.approvalQueue.findFirst({
      where: { workspaceId },
    });

    if (!approvalQueue) {
      approvalQueue = await this.prisma.approvalQueue.create({
        data: {
          workspaceId,
          name: "Default Approval Queue",
        },
      });
    }

    await this.prisma.approvalRequest.create({
      data: {
        queueId: approvalQueue.id,
        policyDecisionId,
        signalId,
        draftId: responseDraftId,
        status: "PENDING",
        priority:
          enforcementResult.riskScore >= 90
            ? 1
            : enforcementResult.riskScore >= 80
              ? 2
              : 3,
      },
    });

    this.logger.warn(
      `Response ${responseDraftId} escalated for manual review ` +
        `(risk score: ${enforcementResult.riskScore}), ` +
        `RiskEvent ${riskEvent.id} created`,
    );
  }
}
