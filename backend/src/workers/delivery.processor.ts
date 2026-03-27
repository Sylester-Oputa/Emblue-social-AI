import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { PlatformType } from "@prisma/client";

interface DeliveryJobData {
  responseDraftId: string;
  workspaceId: string;
  signalId: string;
  platform: string;
  idempotencyKey: string;
}

@Injectable()
export class DeliveryProcessor {
  private readonly logger = new Logger(DeliveryProcessor.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Main entry point for delivery processing
   */
  async process(job: DeliveryJobData): Promise<any> {
    const { responseDraftId, workspaceId, signalId, platform, idempotencyKey } =
      job;

    this.logger.log(
      `Processing delivery for response ${responseDraftId}, platform ${platform}`,
    );

    try {
      // 1. Check workspace automation is enabled
      const workspace = await this.prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { automationEnabled: true },
      });

      if (!workspace?.automationEnabled) {
        this.logger.warn(
          `Automation disabled for workspace ${workspaceId}. Skipping delivery.`,
        );
        return {
          status: "SKIPPED",
          reason: "AUTOMATION_DISABLED",
        };
      }

      // 2. Check idempotency - avoid duplicate posting
      const existingAttempt = await this.prisma.deliveryAttempt.findFirst({
        where: {
          signalId,
          idempotencyKey,
          status: "DELIVERED",
        },
      });

      if (existingAttempt) {
        this.logger.warn(
          `Duplicate delivery detected for signal ${signalId}. Skipping.`,
        );
        return {
          status: "DUPLICATE",
          deliveryAttemptId: existingAttempt.id,
        };
      }

      // 3. Get response draft with signal context
      const responseDraft = await this.prisma.responseDraft.findUnique({
        where: { id: responseDraftId },
        include: {
          signal: {
            include: {
              rawEvent: true,
            },
          },
        },
      });

      if (!responseDraft) {
        throw new Error(`Response draft ${responseDraftId} not found`);
      }

      // 4. Create delivery attempt
      const deliveryAttempt = await this.prisma.deliveryAttempt.create({
        data: {
          signalId,
          draftId: responseDraftId,
          platform: platform as PlatformType,
          idempotencyKey,
          status: "IN_PROGRESS",
          attemptNumber: 1,
        },
      });

      // 5. Call platform-specific posting service
      const platformResponse = await this.postToPlatform(
        platform as PlatformType,
        responseDraft.content,
        responseDraft.signal,
        workspaceId,
      );

      // 6. Update delivery attempt
      await this.prisma.deliveryAttempt.update({
        where: { id: deliveryAttempt.id },
        data: {
          status: "DELIVERED",
          deliveredAt: new Date(),
          providerResponse: {
            platformResponse,
            postId: platformResponse.postId,
            postUrl: platformResponse.postUrl,
          },
        },
      });

      // 7. Update response draft status
      await this.prisma.responseDraft.update({
        where: { id: responseDraftId },
        data: {
          status: "SENT",
          postedAt: new Date(),
          platformPostId: platformResponse.postId,
          platformPostUrl: platformResponse.postUrl,
          metadata: {
            ...(typeof responseDraft.metadata === "object"
              ? responseDraft.metadata
              : {}),
            deliveredAt: new Date().toISOString(),
            platformResponse,
            deliveryAttemptId: deliveryAttempt.id,
          },
        },
      });

      this.logger.log(
        `Successfully delivered response ${responseDraftId} to ${platform}`,
      );

      return {
        status: "DELIVERED",
        responseDraftId,
        deliveryAttemptId: deliveryAttempt.id,
        platformResponse,
      };
    } catch (error) {
      this.logger.error(
        `Delivery failed for response ${responseDraftId}: ${error.message}`,
        error.stack,
      );

      // Record failed attempt
      await this.recordFailedAttempt(
        signalId,
        responseDraftId,
        platform as PlatformType,
        idempotencyKey,
        error.message,
      );

      // Retry logic handled by Bull's retry configuration
      throw error;
    }
  }

  /**
   * Post to platform-specific API
   */
  private async postToPlatform(
    platform: PlatformType,
    content: string,
    signal: any,
    workspaceId: string,
  ): Promise<any> {
    // Get platform connection with credentials
    const connection = await this.prisma.platformConnection.findFirst({
      where: {
        workspaceId,
        platform: platform,
        status: "ACTIVE",
      },
      include: {
        credentials: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!connection) {
      throw new Error(
        `No active ${platform} connection for workspace ${workspaceId}`,
      );
    }

    // Route to platform-specific method
    switch (platform) {
      case "X":
        return this.postToTwitter(content, signal, connection);
      case "INSTAGRAM":
        return this.postToInstagram(content, signal, connection);
      case "FACEBOOK":
        return this.postToFacebook(content, signal, connection);
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  /**
   * Post to Twitter (X)
   */
  private async postToTwitter(
    content: string,
    signal: any,
    connection: any,
  ): Promise<any> {
    this.logger.log(`Posting to Twitter with connection ${connection.id}`);

    // TODO: Implement real Twitter API v2 integration
    // STUB: Return mock response
    return {
      postId: `tweet_${Date.now()}`,
      postUrl: `https://twitter.com/i/web/status/${Date.now()}`,
      stub: true,
    };
  }

  /**
   * Post to Instagram
   */
  private async postToInstagram(
    content: string,
    signal: any,
    connection: any,
  ): Promise<any> {
    this.logger.log(`Posting to Instagram with connection ${connection.id}`);

    // TODO: Implement real Instagram Graph API integration
    // STUB: Return mock response
    return {
      postId: `ig_${Date.now()}`,
      postUrl: `https://instagram.com/p/${Date.now()}`,
      stub: true,
    };
  }

  /**
   * Post to Facebook
   */
  private async postToFacebook(
    content: string,
    signal: any,
    connection: any,
  ): Promise<any> {
    this.logger.log(`Posting to Facebook with connection ${connection.id}`);

    // TODO: Implement real Facebook Graph API integration
    // STUB: Return mock response
    return {
      postId: `fb_${Date.now()}`,
      postUrl: `https://facebook.com/${Date.now()}`,
      stub: true,
    };
  }

  /**
   * Record failed delivery attempt
   */
  private async recordFailedAttempt(
    signalId: string,
    draftId: string,
    platform: PlatformType,
    idempotencyKey: string,
    errorMessage: string,
  ) {
    await this.prisma.deliveryAttempt.create({
      data: {
        signalId,
        draftId,
        platform: platform,
        idempotencyKey,
        status: "FAILED",
        attemptNumber: 1,
        failedAt: new Date(),
        errorMessage: errorMessage,
        providerResponse: {
          error: errorMessage,
          failedAt: new Date().toISOString(),
        },
      },
    });
  }
}
