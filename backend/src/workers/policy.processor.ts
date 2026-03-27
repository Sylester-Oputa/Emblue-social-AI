import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { PoliciesService } from "../policies/policies.service";
import { ApprovalsService } from "../approvals/approvals.service";
import { AutomationProcessor } from "./automation.processor";
import { PolicyDecisionStatus } from "@prisma/client";

const BLOCKED_STATUSES: PolicyDecisionStatus[] = [
  "BLOCKED_MODERATION",
  "BLOCKED_MISSING_SCOPE",
  "BLOCKED_PERMISSION",
  "BLOCKED_RATE_LIMIT",
  "BLOCKED_POLICY",
];

@Injectable()
export class PolicyProcessor {
  private readonly logger = new Logger(PolicyProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly policiesService: PoliciesService,
    private readonly approvalsService: ApprovalsService,
    private readonly automationProcessor: AutomationProcessor,
  ) {}

  async process(job: any): Promise<any> {
    this.logger.log(
      `Processing POLICY_EVALUATED for signal ${job.data.signalId}`,
    );
    const { signalId, workspaceId } = job.data;

    const signal = await this.prisma.normalizedSignal.findUnique({
      where: { id: signalId },
    });

    if (!signal) {
      throw new Error(`Signal not found: ${signalId}`);
    }

    const decision = await this.policiesService.evaluateSignal(
      signalId,
      workspaceId,
    );

    const isBlocked = BLOCKED_STATUSES.includes(decision.status);

    // Hand off to automation pipeline
    setTimeout(() => {
      this.automationProcessor
        .processSignal({
          signalId,
          workspaceId,
          policyDecisionId: decision.id,
          riskScore: decision.riskScore,
          isBlocked,
          requiresHumanApproval: decision.requiresHumanApproval,
        })
        .catch((err) =>
          this.logger.error(
            `Automation failed for signal ${signalId}: ${err.message}`,
          ),
        );
    }, 100);

    return { processed: true, signalId, riskScore: decision.riskScore };
  }
}
