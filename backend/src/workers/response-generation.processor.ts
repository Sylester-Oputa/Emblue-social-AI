import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { IntelligenceService } from "../intelligence/intelligence.service";

interface ResponseGenerationJobData {
  signalId: string;
  workspaceId: string;
}

@Injectable()
export class ResponseGenerationProcessor {
  private readonly logger = new Logger(ResponseGenerationProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly intelligenceService: IntelligenceService,
  ) {}

  /**
   * Main entry point for response generation processing
   * Generates 3 AI-powered reply variants for a signal
   */
  async process(job: ResponseGenerationJobData): Promise<any> {
    const { signalId, workspaceId } = job;

    this.logger.log(
      `Processing response generation for signal ${signalId} in workspace ${workspaceId}`,
    );

    try {
      // 1. Check workspace automation is enabled
      const workspace = await this.prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: {
          automationEnabled: true,
          tenantId: true,
        },
      });

      if (!workspace?.automationEnabled) {
        this.logger.warn(
          `Automation disabled for workspace ${workspaceId}. Skipping response generation.`,
        );
        return {
          status: "SKIPPED",
          reason: "AUTOMATION_DISABLED",
        };
      }

      // 2. Generate 3 AI reply variants
      const replies = await this.intelligenceService.generateResponses(
        signalId,
        workspaceId,
      );

      this.logger.log(
        `Generated ${replies.length} reply variants for signal ${signalId}`,
      );

      // 3. Create ResponseDraft records for each variant
      const drafts = await Promise.all(
        replies.map(async (reply, index) => {
          const draft = await this.prisma.responseDraft.create({
            data: {
              signalId,
              workspaceId,
              content: reply.content,
              ctaText: reply.ctaText,
              status: "DRAFT",
              riskScore: reply.riskFlag ? 70 : 30,
              metadata: {
                tone: reply.tone,
                riskFlag: reply.riskFlag,
                riskReasons: reply.riskReasons,
                confidence: reply.confidence,
                strategy: reply.strategy,
                ranking: index + 1,
                generatedAt: new Date().toISOString(),
              },
            },
          });

          this.logger.log(
            `Created draft ${draft.id} (rank ${index + 1}) for signal ${signalId}`,
          );

          return draft;
        }),
      );

      // 4. Get the top-ranked draft (index 0) for auto-approval evaluation
      const topDraft = drafts[0];

      if (!topDraft) {
        throw new Error("No drafts generated");
      }

      this.logger.log(
        `Response generation complete for signal ${signalId}. ` +
          `Top draft: ${topDraft.id}, risk score: ${topDraft.riskScore}`,
      );

      return {
        status: "SUCCESS",
        signalId,
        draftsCreated: drafts.length,
        topDraftId: topDraft.id,
        topDraftRiskScore: topDraft.riskScore,
        drafts: drafts.map((d) => {
          const metadata =
            typeof d.metadata === "object" ? (d.metadata as any) : {};
          return {
            id: d.id,
            content: d.content,
            confidence: metadata.confidence || 0.8,
            ranking: metadata.ranking || 1,
          };
        }),
      };
    } catch (error) {
      this.logger.error(
        `Response generation failed for signal ${signalId}: ${error.message}`,
        error.stack,
      );

      throw error;
    }
  }

  /**
   * Trigger this processor from normalization completion
   * Call this method after a signal is normalized
   */
  static async triggerFromNormalization(
    signalId: string,
    workspaceId: string,
    processor: ResponseGenerationProcessor,
  ): Promise<void> {
    await processor.process({ signalId, workspaceId });
  }
}
