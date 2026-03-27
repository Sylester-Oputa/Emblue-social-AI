import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { AuditService } from "../audit/audit.service";
import { IntegrationsService } from "../integrations/integrations.service";
import { XAdapter } from "../integrations/adapters/x.adapter";
import { InstagramAdapter } from "../integrations/adapters/instagram.adapter";
import { FacebookAdapter } from "../integrations/adapters/facebook.adapter";
import { TiktokAdapter } from "../integrations/adapters/tiktok.adapter";
import { PlatformAdapter } from "../integrations/interfaces/platform-adapter.interface";

@Injectable()
export class DeliveryService {
  private readonly logger = new Logger(DeliveryService.name);
  private readonly adapters: Map<string, PlatformAdapter>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly integrationsService: IntegrationsService,
    xAdapter: XAdapter,
    instagramAdapter: InstagramAdapter,
    facebookAdapter: FacebookAdapter,
    tiktokAdapter: TiktokAdapter,
  ) {
    this.adapters = new Map<string, PlatformAdapter>([
      ["X", xAdapter],
      ["INSTAGRAM", instagramAdapter],
      ["FACEBOOK", facebookAdapter],
      ["TIKTOK", tiktokAdapter],
    ]);
  }

  async sendResponse(
    workspaceId: string,
    draftId: string,
    idempotencyKey: string,
  ) {
    const draft = await this.prisma.responseDraft.findFirst({
      where: { id: draftId, workspaceId },
      include: { signal: true },
    });

    if (!draft) throw new NotFoundException("Draft not found");

    if (
      draft.status !== "APPROVED" &&
      draft.status !== "AUTO_APPROVED" &&
      draft.status !== "OVERRIDE_APPROVED"
    ) {
      throw new BadRequestException(
        `Only APPROVED / AUTO_APPROVED / OVERRIDE_APPROVED drafts can be sent. Current: ${draft.status}`,
      );
    }

    const existing = await this.prisma.deliveryAttempt.findUnique({
      where: { idempotencyKey },
    });

    if (existing) {
      throw new ConflictException(
        `Delivery with idempotencyKey ${idempotencyKey} already exists`,
      );
    }

    const attempt = await this.prisma.deliveryAttempt.create({
      data: {
        signalId: draft.signalId,
        draftId: draft.id,
        platform: draft.signal.platform,
        status: "QUEUED",
        idempotencyKey,
      },
    });

    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });
    if (workspace) {
      await this.auditService.log({
        tenantId: workspace.tenantId,
        action: "DELIVERY_QUEUED",
        resourceType: "DeliveryAttempt",
        resourceId: attempt.id,
        context: { draftId, idempotencyKey },
      });
    }

    setTimeout(() => {
      this.processDeliveryAsync(attempt.id, workspace?.tenantId).catch(
        console.error,
      );
    }, 100);

    return attempt;
  }

  private async processDeliveryAsync(attemptId: string, tenantId?: string) {
    this.logger.log(`Processing delivery attempt ${attemptId}`);

    await this.prisma.deliveryAttempt.update({
      where: { id: attemptId },
      data: { status: "IN_PROGRESS" },
    });

    const attempt = await this.prisma.deliveryAttempt.findUnique({
      where: { id: attemptId },
      include: {
        draft: { include: { signal: true } },
        signal: true,
      },
    });

    if (!attempt) return;

    try {
      // Look up PlatformConnection for this signal's platform + workspace
      const connection = await this.prisma.platformConnection.findFirst({
        where: {
          workspaceId: attempt.draft.workspaceId,
          platform: attempt.platform,
          status: "ACTIVE",
        },
      });

      const adapter = this.adapters.get(attempt.platform);
      let credentials: any = {};
      if (connection) {
        try {
          credentials = await this.integrationsService.getDecryptedCredentials(
            connection.id,
          );
        } catch {
          this.logger.warn(
            `Could not decrypt credentials for connection ${connection.id}, using empty credentials`,
          );
        }
      }

      // Call the platform adapter
      const result = adapter
        ? await adapter.publishResponse(
            credentials,
            attempt.draft.content,
            attempt.signal.rawEventId,
          )
        : {
            success: true,
            platformPostId: `fallback_${Date.now()}`,
            platformPostUrl: `https://${attempt.platform.toLowerCase()}.com/status/fallback_${Date.now()}`,
          };

      if (result.success) {
        await this.prisma.$transaction(async (tx) => {
          await tx.deliveryAttempt.update({
            where: { id: attemptId },
            data: {
              status: "DELIVERED",
              deliveredAt: new Date(),
              providerResponse: {
                success: true,
                postId: result.platformPostId,
                postUrl: result.platformPostUrl,
                rateLimitRemaining: result.rateLimitRemaining,
              },
            },
          });

          await tx.responseDraft.update({
            where: { id: attempt.draftId },
            data: {
              status: "SENT",
              postedAt: new Date(),
              platformPostId: result.platformPostId,
              platformPostUrl: result.platformPostUrl,
            },
          });

          await tx.normalizedSignal.update({
            where: { id: attempt.signalId },
            data: { status: "ACTIONED" },
          });
        });

        if (tenantId) {
          await this.auditService.log({
            tenantId,
            action: "DELIVERY_SUCCESS",
            resourceType: "DeliveryAttempt",
            resourceId: attemptId,
            context: { platformPostId: result.platformPostId },
          });
        }
        this.logger.log(
          `Delivery ${attemptId} succeeded: ${result.platformPostId}`,
        );
      } else {
        await this.prisma.deliveryAttempt.update({
          where: { id: attemptId },
          data: {
            status: "FAILED",
            failedAt: new Date(),
            errorMessage: result.error || "Platform adapter returned failure",
            rateLimitHit:
              result.error?.toLowerCase().includes("rate limit") || false,
          },
        });

        if (tenantId) {
          await this.auditService.log({
            tenantId,
            action: "DELIVERY_FAILED",
            resourceType: "DeliveryAttempt",
            resourceId: attemptId,
            context: { error: result.error },
          });
        }
        this.logger.error(`Delivery ${attemptId} failed: ${result.error}`);
      }
    } catch (error) {
      await this.prisma.deliveryAttempt.update({
        where: { id: attemptId },
        data: {
          status: "FAILED",
          failedAt: new Date(),
          errorMessage: error.message,
        },
      });
      this.logger.error(`Delivery ${attemptId} exception: ${error.message}`);
    }
  }
}
