import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { PolicyDecisionStatus } from "@prisma/client";

interface EnforcementResult {
  riskScore: number;
  decision: PolicyDecisionStatus;
  explanation: string;
  blockedReasons: string[];
  requiresHumanApproval: boolean;
  ruleIds: string[];
}

interface RuleConfig {
  keywords?: string[];
  patterns?: string[];
  maxRiskScore?: number;
  action?: "BLOCK" | "FLAG" | "ALLOW";
}

@Injectable()
export class PolicyEnforcementService {
  private readonly logger = new Logger(PolicyEnforcementService.name);

  // Risk scoring thresholds
  private readonly RISK_THRESHOLD_AUTO_APPROVE = parseInt(
    process.env.RISK_THRESHOLD_AUTO_APPROVE || "70",
    10,
  );
  private readonly RISK_THRESHOLD_CRITICAL = 90;
  private readonly RISK_THRESHOLD_HIGH = 80;
  private readonly RISK_THRESHOLD_MEDIUM = 70;

  // Risk score increments
  private readonly SCORE_HATE_SPEECH = 30;
  private readonly SCORE_PROFANITY = 25;
  private readonly SCORE_REGULATORY_VIOLATION = 20;
  private readonly SCORE_MISSING_DISCLAIMER = 15;
  private readonly SCORE_BRAND_VIOLATION = 10;
  private readonly SCORE_SELF_HARM = 35;
  private readonly SCORE_FRAUD = 30;
  private readonly SCORE_LEGAL_THREAT = 25;

  // Detection patterns
  private readonly HATE_SPEECH_KEYWORDS = [
    "hate",
    "racist",
    "sexist",
    "bigot",
    "discriminate",
    "offensive slur",
    "ethnic slur",
    "homophobic",
    "transphobic",
  ];

  private readonly PROFANITY_KEYWORDS = [
    "fuck",
    "shit",
    "damn",
    "hell",
    "ass",
    "bitch",
    "bastard",
    "crap",
    "piss",
    "cock",
    "dick",
  ];

  private readonly SELF_HARM_KEYWORDS = [
    "suicide",
    "kill myself",
    "end my life",
    "self harm",
    "cut myself",
    "want to die",
    "suicidal",
  ];

  private readonly FRAUD_KEYWORDS = [
    "send money",
    "wire transfer",
    "bank details",
    "credit card",
    "social security",
    "password",
    "account number",
    "routing number",
    "click here now",
    "verify account",
    "urgent action required",
  ];

  private readonly LEGAL_THREAT_KEYWORDS = [
    "sue you",
    "lawsuit",
    "legal action",
    "court",
    "lawyer",
    "attorney",
    "federal crime",
    "prosecute",
  ];

  private readonly REGULATORY_KEYWORDS = [
    "investment advice",
    "guaranteed returns",
    "risk-free",
    "medical advice",
    "diagnose",
    "prescription",
    "cure for",
    "insider information",
    "stock tip",
  ];

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Evaluate content against all active policy rules
   */
  async evaluateContent(params: {
    signalId: string;
    responseText: string;
    workspaceId: string;
  }): Promise<EnforcementResult> {
    const { signalId, responseText, workspaceId } = params;

    this.logger.log(`Evaluating content for signal ${signalId}`);

    // Get workspace and tenant info
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { tenantId: true },
    });

    if (!workspace) {
      throw new Error(`Workspace ${workspaceId} not found`);
    }

    // Load active rules for tenant
    const rules = await this.prisma.policyRule.findMany({
      where: {
        tenantId: workspace.tenantId,
        isActive: true,
      },
      orderBy: { priority: "desc" },
    });

    let totalRiskScore = 0;
    const blockedReasons: string[] = [];
    const triggeredRuleIds: string[] = [];

    const textLower = responseText.toLowerCase();

    // 1. Check for hate speech
    const hateSpeechDetected = this.detectKeywords(
      textLower,
      this.HATE_SPEECH_KEYWORDS,
    );
    if (hateSpeechDetected.detected) {
      totalRiskScore += this.SCORE_HATE_SPEECH;
      blockedReasons.push(
        `Hate speech detected: ${hateSpeechDetected.matches.join(", ")}`,
      );
      this.logger.warn(`Hate speech detected in signal ${signalId}`);
    }

    // 2. Check for profanity
    const profanityDetected = this.detectKeywords(
      textLower,
      this.PROFANITY_KEYWORDS,
    );
    if (profanityDetected.detected) {
      totalRiskScore += this.SCORE_PROFANITY;
      blockedReasons.push(
        `Profanity detected: ${profanityDetected.matches.join(", ")}`,
      );
    }

    // 3. Check for self-harm content
    const selfHarmDetected = this.detectKeywords(
      textLower,
      this.SELF_HARM_KEYWORDS,
    );
    if (selfHarmDetected.detected) {
      totalRiskScore += this.SCORE_SELF_HARM;
      blockedReasons.push(
        `Self-harm content detected: ${selfHarmDetected.matches.join(", ")}`,
      );
      this.logger.warn(`Self-harm content detected in signal ${signalId}`);
    }

    // 4. Check for fraud patterns
    const fraudDetected = this.detectKeywords(textLower, this.FRAUD_KEYWORDS);
    if (fraudDetected.detected) {
      totalRiskScore += this.SCORE_FRAUD;
      blockedReasons.push(
        `Fraud indicators detected: ${fraudDetected.matches.join(", ")}`,
      );
      this.logger.warn(`Fraud patterns detected in signal ${signalId}`);
    }

    // 5. Check for legal threats
    const legalThreatDetected = this.detectKeywords(
      textLower,
      this.LEGAL_THREAT_KEYWORDS,
    );
    if (legalThreatDetected.detected) {
      totalRiskScore += this.SCORE_LEGAL_THREAT;
      blockedReasons.push(
        `Legal threat language detected: ${legalThreatDetected.matches.join(", ")}`,
      );
    }

    // 6. Check for regulatory violations
    const regulatoryDetected = this.detectKeywords(
      textLower,
      this.REGULATORY_KEYWORDS,
    );
    if (regulatoryDetected.detected) {
      totalRiskScore += this.SCORE_REGULATORY_VIOLATION;
      blockedReasons.push(
        `Regulatory violation: ${regulatoryDetected.matches.join(", ")}`,
      );
    }

    // 7. Apply custom tenant rules
    for (const rule of rules) {
      const ruleConfig = rule.config as RuleConfig;

      if (ruleConfig.keywords && ruleConfig.keywords.length > 0) {
        const customDetected = this.detectKeywords(
          textLower,
          ruleConfig.keywords,
        );
        if (customDetected.detected) {
          const scoreToAdd =
            ruleConfig.maxRiskScore || this.SCORE_BRAND_VIOLATION;
          totalRiskScore += scoreToAdd;
          blockedReasons.push(`Custom rule violation: ${rule.name}`);
          triggeredRuleIds.push(rule.id);
        }
      }

      if (ruleConfig.patterns && ruleConfig.patterns.length > 0) {
        for (const pattern of ruleConfig.patterns) {
          try {
            const regex = new RegExp(pattern, "i");
            if (regex.test(responseText)) {
              const scoreToAdd =
                ruleConfig.maxRiskScore || this.SCORE_BRAND_VIOLATION;
              totalRiskScore += scoreToAdd;
              blockedReasons.push(`Pattern matched: ${rule.name}`);
              triggeredRuleIds.push(rule.id);
              break;
            }
          } catch (error) {
            this.logger.error(
              `Invalid regex pattern in rule ${rule.id}: ${pattern}`,
            );
          }
        }
      }
    }

    // Cap risk score at 100
    totalRiskScore = Math.min(totalRiskScore, 100);

    // Determine decision
    let decision: PolicyDecisionStatus;
    let explanation: string;
    let requiresHumanApproval: boolean;

    if (totalRiskScore === 0) {
      decision = "ALLOWED";
      explanation = "Content passed all policy checks";
      requiresHumanApproval = false;
    } else if (totalRiskScore < this.RISK_THRESHOLD_AUTO_APPROVE) {
      decision = "ALLOWED";
      explanation = `Low risk (score: ${totalRiskScore}). Auto-approved.`;
      requiresHumanApproval = false;
    } else if (totalRiskScore >= this.RISK_THRESHOLD_AUTO_APPROVE) {
      decision = "BLOCKED_POLICY";
      explanation = `High risk (score: ${totalRiskScore}). Requires review.`;
      requiresHumanApproval = true;
    } else {
      decision = "ALLOWED_WITH_REVIEW";
      explanation = `Medium risk (score: ${totalRiskScore}). Pending review.`;
      requiresHumanApproval = true;
    }

    this.logger.log(
      `Policy evaluation complete for signal ${signalId}: ` +
        `score=${totalRiskScore}, decision=${decision}, ` +
        `violations=${blockedReasons.length}`,
    );

    return {
      riskScore: totalRiskScore,
      decision,
      explanation,
      blockedReasons,
      requiresHumanApproval,
      ruleIds: triggeredRuleIds,
    };
  }

  /**
   * Create a PolicyDecision record
   */
  async createPolicyDecision(params: {
    signalId: string;
    enforcementResult: EnforcementResult;
  }) {
    const { signalId, enforcementResult } = params;

    return this.prisma.policyDecision.create({
      data: {
        signalId,
        status: enforcementResult.decision,
        explanation: enforcementResult.explanation,
        requiresHumanApproval: enforcementResult.requiresHumanApproval,
        riskScore: enforcementResult.riskScore,
        blockedReasons: enforcementResult.blockedReasons,
        allowedActions: enforcementResult.requiresHumanApproval
          ? ["MANUAL_REVIEW"]
          : ["AUTO_POST"],
        ruleIds: enforcementResult.ruleIds,
        evaluatedAt: new Date(),
      },
    });
  }

  /**
   * Enforce do-not-say rules (remove forbidden phrases)
   */
  enforceDoNotSay(text: string, forbiddenPhrases: string[]): string {
    let cleanedText = text;

    for (const phrase of forbiddenPhrases) {
      const regex = new RegExp(phrase, "gi");
      cleanedText = cleanedText.replace(regex, "[REDACTED]");
    }

    return cleanedText;
  }

  /**
   * Inject required phrases
   */
  injectRequiredPhrases(text: string, requiredPhrases: string[]): string {
    const missingPhrases = requiredPhrases.filter(
      (phrase) => !text.toLowerCase().includes(phrase.toLowerCase()),
    );

    if (missingPhrases.length > 0) {
      return `${text}\n\n${missingPhrases.join(" ")}`;
    }

    return text;
  }

  /**
   * Append required disclaimers
   */
  appendDisclaimers(text: string, disclaimers: string[]): string {
    if (disclaimers.length === 0) return text;

    return `${text}\n\n${disclaimers.join("\n")}`;
  }

  /**
   * Helper: Detect keywords in text
   */
  private detectKeywords(
    text: string,
    keywords: string[],
  ): { detected: boolean; matches: string[] } {
    const matches: string[] = [];

    for (const keyword of keywords) {
      if (text.includes(keyword.toLowerCase())) {
        matches.push(keyword);
      }
    }

    return {
      detected: matches.length > 0,
      matches,
    };
  }

  /**
   * Get risk severity level
   */
  getRiskSeverity(riskScore: number): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" {
    if (riskScore >= this.RISK_THRESHOLD_CRITICAL) return "CRITICAL";
    if (riskScore >= this.RISK_THRESHOLD_HIGH) return "HIGH";
    if (riskScore >= this.RISK_THRESHOLD_MEDIUM) return "MEDIUM";
    return "LOW";
  }
}
