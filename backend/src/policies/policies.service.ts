import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { PolicyDecisionStatus } from "@prisma/client";

@Injectable()
export class PoliciesService {
  private readonly logger = new Logger(PoliciesService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── Ruleset CRUD ──

  async findAllRules(tenantId: string) {
    return this.prisma.policyRule.findMany({
      where: { tenantId },
      orderBy: { priority: "desc" },
    });
  }

  async createRule(
    tenantId: string,
    data: {
      ruleKey: string;
      name: string;
      description?: string;
      priority?: number;
      config?: Record<string, any>;
    },
  ) {
    return this.prisma.policyRule.create({
      data: {
        tenantId,
        ruleKey: data.ruleKey,
        name: data.name,
        description: data.description,
        priority: data.priority ?? 0,
        config: data.config ?? {},
      },
    });
  }

  async updateRule(
    id: string,
    tenantId: string,
    data: {
      name?: string;
      description?: string;
      priority?: number;
      isActive?: boolean;
      config?: Record<string, any>;
    },
  ) {
    const rule = await this.prisma.policyRule.findFirst({
      where: { id, tenantId },
    });
    if (!rule) throw new NotFoundException("Policy rule not found");
    return this.prisma.policyRule.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && {
          description: data.description,
        }),
        ...(data.priority !== undefined && { priority: data.priority }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.config !== undefined && { config: data.config }),
      },
    });
  }

  async deleteRule(id: string, tenantId: string) {
    const rule = await this.prisma.policyRule.findFirst({
      where: { id, tenantId },
    });
    if (!rule) throw new NotFoundException("Policy rule not found");
    return this.prisma.policyRule.delete({ where: { id } });
  }

  // ── Signal evaluation with risk scoring ──

  async evaluateSignal(signalId: string, workspaceId: string) {
    this.logger.log(
      `Evaluating policies for signal ${signalId} in workspace ${workspaceId}`,
    );

    const signal = await this.prisma.normalizedSignal.findUnique({
      where: { id: signalId },
      include: {
        sentimentResult: true,
        intentResult: true,
        moderationResult: true,
        workspace: {
          include: {
            brandProfiles: true,
            platformConnections: { include: { scopes: true } },
          },
        },
      },
    });

    if (!signal) throw new Error(`Signal not found: ${signalId}`);

    const brand = signal.workspace.brandProfiles[0];
    const connection = signal.workspace.platformConnections.find(
      (c) => c.platform === signal.platform,
    );

    let finalStatus: PolicyDecisionStatus = "ALLOWED";
    const blockedReasons: string[] = [];
    const ruleIds: string[] = [];
    let requiresHumanApproval = false;

    // 1. moderation_block
    if (
      signal.moderationResult?.status === "BLOCKED" ||
      signal.moderationResult?.status === "FLAGGED"
    ) {
      finalStatus = "BLOCKED_MODERATION";
      blockedReasons.push("Content flagged by moderation");
      ruleIds.push("moderation_block");
    }

    // 2. missing_scope -- default to require write scope
    if (
      !connection ||
      !connection.scopes.some((s) => s.scope === "write" && s.isGranted)
    ) {
      if (finalStatus === "ALLOWED") finalStatus = "BLOCKED_MISSING_SCOPE";
      blockedReasons.push("Missing write scope for platform connection");
      ruleIds.push("missing_scope");
    }

    // 3. dm_permission
    if (signal.actionType === "DM") {
      requiresHumanApproval = true;
      ruleIds.push("dm_permission");
    }

    // 4. rate_limit
    const rateLimit = await this.prisma.rateLimitSnapshot.findFirst({
      where: { platform: signal.platform },
      orderBy: { capturedAt: "desc" },
    });
    if (rateLimit && rateLimit.remaining <= 0) {
      if (finalStatus === "ALLOWED") finalStatus = "BLOCKED_RATE_LIMIT";
      blockedReasons.push("Platform rate limit exceeded");
      ruleIds.push("rate_limit");
    }

    // 5. daily_budget
    if (brand && brand.budgetUsedToday >= brand.dailyBudget) {
      if (finalStatus === "ALLOWED") finalStatus = "BLOCKED_POLICY";
      blockedReasons.push("Daily budget exceeded");
      ruleIds.push("daily_budget");
    }

    // 6. negative_sentiment
    if (signal.sentimentResult?.label === "NEGATIVE") {
      requiresHumanApproval = true;
      ruleIds.push("negative_sentiment");
    }

    // 7. low_intent
    if (signal.intentResult && signal.intentResult.score < 0.5) {
      requiresHumanApproval = true;
      ruleIds.push("low_intent");
    }

    // 8. prohibited_terms
    if (brand && brand.prohibitedTerms.length > 0 && signal.content) {
      const lowerContent = signal.content.toLowerCase();
      if (
        brand.prohibitedTerms.some((term) =>
          lowerContent.includes(term.toLowerCase()),
        )
      ) {
        requiresHumanApproval = true;
        ruleIds.push("prohibited_terms");
      }
    }

    // 9. risk_tolerance
    if (
      brand &&
      brand.riskTolerance === "LOW" &&
      signal.sentimentResult?.label === "MIXED"
    ) {
      requiresHumanApproval = true;
      ruleIds.push("risk_tolerance");
    }

    // 10. tiktok_review
    if (signal.platform === "TIKTOK" && signal.actionType !== "LIKE") {
      requiresHumanApproval = true;
      ruleIds.push("tiktok_review");
    }

    // Evaluate final status
    if (finalStatus === "ALLOWED" && requiresHumanApproval) {
      finalStatus = "ALLOWED_WITH_REVIEW";
    }

    // ── Risk score computation (0-100) ──
    let riskScore = 0;
    if (ruleIds.includes("moderation_block")) riskScore += 40;
    if (ruleIds.includes("prohibited_terms")) riskScore += 25;
    if (ruleIds.includes("negative_sentiment")) riskScore += 15;
    if (ruleIds.includes("risk_tolerance")) riskScore += 10;
    if (ruleIds.includes("tiktok_review")) riskScore += 10;
    if (ruleIds.includes("low_intent")) riskScore += 5;
    if (ruleIds.includes("dm_permission")) riskScore += 15;
    if (ruleIds.includes("rate_limit")) riskScore += 20;
    if (ruleIds.includes("daily_budget")) riskScore += 20;
    if (ruleIds.includes("missing_scope")) riskScore += 30;
    riskScore = Math.min(riskScore, 100);

    // Persist decision
    const decision = await this.prisma.policyDecision.create({
      data: {
        signalId,
        status: finalStatus,
        requiresHumanApproval,
        riskScore,
        blockedReasons,
        ruleIds,
        explanation: `Evaluated ${ruleIds.length} rules. Risk score: ${riskScore}. Result: ${finalStatus}`,
      },
    });

    return decision;
  }
}
