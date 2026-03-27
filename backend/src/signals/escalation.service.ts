import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { RiskEventCategory, RiskLevel, RiskEventStatus } from "@prisma/client";

interface EscalationParams {
  signalId: string;
  workspaceId: string;
  riskScore: number;
  blockedReasons: string[];
  responseText: string;
}

@Injectable()
export class EscalationService {
  private readonly logger = new Logger(EscalationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Auto-create RiskEvent when content is flagged as risky
   */
  async escalateContent(params: EscalationParams) {
    const { signalId, workspaceId, riskScore, blockedReasons, responseText } =
      params;

    this.logger.warn(
      `Escalating content for signal ${signalId}: ` +
        `riskScore=${riskScore}, reasons=${blockedReasons.length}`,
    );

    // Determine severity based on risk score
    const severity = this.getSeverityFromScore(riskScore);

    // Determine category from blocked reasons
    const category = this.getCategoryFromReasons(blockedReasons);

    // Create RiskEvent
    const riskEvent = await this.prisma.riskEvent.create({
      data: {
        signalId,
        workspaceId,
        category,
        severity,
        status: "OPEN" as RiskEventStatus,
        description: this.generateDescription(blockedReasons, riskScore),
        metadata: {
          riskScore,
          blockedReasons,
          responseText: responseText.substring(0, 500), // Truncate for storage
          escalatedAt: new Date().toISOString(),
        },
      },
    });

    this.logger.log(
      `Risk event created: ${riskEvent.id} for signal ${signalId}`,
    );

    return riskEvent;
  }

  /**
   * Determine severity from risk score
   */
  private getSeverityFromScore(riskScore: number): RiskLevel {
    if (riskScore >= 90) return "CRITICAL";
    if (riskScore >= 80) return "HIGH";
    if (riskScore >= 70) return "MEDIUM";
    return "LOW";
  }

  /**
   * Determine category from blocked reasons
   */
  private getCategoryFromReasons(blockedReasons: string[]): RiskEventCategory {
    const reasonsText = blockedReasons.join(" ").toLowerCase();

    // Priority order - most severe first
    if (reasonsText.includes("self-harm") || reasonsText.includes("suicide")) {
      return "SELF_HARM";
    }
    if (
      reasonsText.includes("hate speech") ||
      reasonsText.includes("racist") ||
      reasonsText.includes("discriminate")
    ) {
      return "HARASSMENT";
    }
    if (
      reasonsText.includes("fraud") ||
      reasonsText.includes("scam") ||
      reasonsText.includes("phishing")
    ) {
      return "FRAUD";
    }
    if (
      reasonsText.includes("legal threat") ||
      reasonsText.includes("lawsuit")
    ) {
      return "LEGAL_THREAT";
    }
    if (
      reasonsText.includes("personally identifiable") ||
      reasonsText.includes("pii")
    ) {
      return "PII_LEAK";
    }
    if (
      reasonsText.includes("profanity") ||
      reasonsText.includes("off-brand") ||
      reasonsText.includes("regulatory") ||
      reasonsText.includes("compliance")
    ) {
      return "OFF_BRAND";
    }

    // Default to OFF_BRAND for other violations
    return "OFF_BRAND";
  }

  /**
   * Generate human-readable description
   */
  private generateDescription(
    blockedReasons: string[],
    riskScore: number,
  ): string {
    if (blockedReasons.length === 0) {
      return `Content flagged with risk score ${riskScore}`;
    }

    const topReasons = blockedReasons.slice(0, 3);
    return `Risk score ${riskScore}. Issues: ${topReasons.join("; ")}`;
  }

  /**
   * Check if content should be escalated
   */
  shouldEscalate(riskScore: number, threshold: number = 70): boolean {
    return riskScore >= threshold;
  }

  /**
   * Link risk event to response draft
   */
  async linkToResponseDraft(riskEventId: string, responseDraftId: string) {
    // Update response draft to reference risk event in metadata
    await this.prisma.responseDraft.update({
      where: { id: responseDraftId },
      data: {
        metadata: {
          riskEventId,
          escalatedAt: new Date().toISOString(),
        },
      },
    });

    this.logger.log(
      `Linked risk event ${riskEventId} to response draft ${responseDraftId}`,
    );
  }
}
