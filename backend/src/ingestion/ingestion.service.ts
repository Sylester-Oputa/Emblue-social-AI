import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { IngestionProcessor } from "../workers/ingestion.processor";
import { PlatformType } from "@prisma/client";
import * as crypto from "crypto";
import { redactPiiDeep } from "../common/utils/pii-redactor";

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ingestionProcessor: IngestionProcessor,
  ) {}

  async handleWebhook(
    platform: PlatformType,
    payload: any,
    idempotencyKey?: string,
  ) {
    // Redact PII from the payload before any persistence
    const sanitizedPayload = redactPiiDeep(payload) as Record<string, any>;

    const checksum = this.generateHash(platform, sanitizedPayload);
    const payloadHash = checksum;
    const externalEventId =
      sanitizedPayload.id || sanitizedPayload.tweet_id || `evt_${Date.now()}`;

    // --- Workspace routing: look up via PlatformConnection ---
    const accountId =
      sanitizedPayload.account_id ||
      sanitizedPayload.for_user_id ||
      sanitizedPayload.recipient?.id;

    let workspace: { id: string } | null = null;

    if (accountId) {
      const connection = await this.prisma.platformConnection.findFirst({
        where: { platform, accountId: String(accountId), status: "ACTIVE" },
        include: { workspace: true },
      });
      if (connection) {
        workspace = connection.workspace;
        this.logger.debug(
          `Routed webhook to workspace ${workspace.id} via connection ${connection.id}`,
        );
      }
    }

    // Fallback: use most recent workspace if no connection match
    if (!workspace) {
      workspace = await this.prisma.workspace.findFirst({
        orderBy: { createdAt: "desc" },
      });
    }
    if (!workspace) throw new Error("No workspace configured for ingestion");

    // --- IngestBatch idempotency check ---
    if (idempotencyKey) {
      const existingBatch = await this.prisma.ingestBatch.findUnique({
        where: {
          workspaceId_idempotencyKey: {
            workspaceId: workspace.id,
            idempotencyKey,
          },
        },
      });
      if (existingBatch) {
        if (existingBatch.payloadHash === payloadHash) {
          this.logger.debug(
            `Idempotent replay for key ${idempotencyKey} — returning cached response`,
          );
          return existingBatch.response as any;
        }
        // Same key, different payload → conflict
        const { ConflictException } = await import("@nestjs/common");
        throw new ConflictException(
          `Idempotency key "${idempotencyKey}" already used with a different payload`,
        );
      }
    }

    // --- Dedup: check exact external ID first ---
    const existingEntry = await this.prisma.rawEvent.findUnique({
      where: { platform_externalEventId: { platform, externalEventId } },
    });

    if (existingEntry) {
      this.logger.debug(
        `Duplicate webhook blocked (exact ID): ${externalEventId}`,
      );
      return { success: true, isDuplicate: true };
    }

    // --- Dedup: 7-day text fingerprint window ---
    const textFingerprint = this.generateTextFingerprint(sanitizedPayload);
    if (textFingerprint) {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const fingerprintMatch = await this.prisma.rawEvent.findFirst({
        where: {
          platform,
          checksum: textFingerprint,
          createdAt: { gte: sevenDaysAgo },
        },
      });

      if (fingerprintMatch) {
        this.logger.debug(
          `Duplicate webhook blocked (fingerprint): ${externalEventId}`,
        );
        return { success: true, isDuplicate: true };
      }
    }

    const rawEvent = await this.prisma.rawEvent.create({
      data: {
        workspaceId: workspace.id,
        platform,
        externalEventId,
        eventType: "WEBHOOK",
        checksum: textFingerprint || checksum,
        payload: sanitizedPayload,
        ingestionMode: "WEBHOOK",
      },
    });

    // Call IngestionProcessor directly (setTimeout avoids BullMQ Redis version issue)
    setTimeout(() => {
      this.ingestionProcessor
        .process({ data: { rawEventId: rawEvent.id, platform } })
        .catch((err) =>
          this.logger.error(`Ingestion processing failed: ${err.message}`),
        );
    }, 100);

    this.logger.log(`Webhook accepted and processed: ${rawEvent.id}`);

    const result = { success: true, eventId: rawEvent.id, isDuplicate: false };

    // --- Record IngestBatch for idempotency ---
    if (idempotencyKey && workspace) {
      await this.prisma.ingestBatch.create({
        data: {
          workspaceId: workspace.id,
          idempotencyKey,
          payloadHash,
          insertedCount: 1,
          dedupedCount: 0,
          rejectedCount: 0,
          insertedIds: [rawEvent.id],
          response: result as any,
        },
      });
    }

    return result;
  }

  async pollPlatform(platform: PlatformType, connectionId: string) {
    this.logger.log(
      `Polling started for connection ${connectionId} on ${platform}`,
    );
    return { success: true, polled: 0 };
  }

  /**
   * Generate a normalized text fingerprint for dedup.
   * Lowercases, strips URLs, punctuation, and extra whitespace, then SHA-256.
   */
  private generateTextFingerprint(payload: Record<string, any>): string | null {
    const text =
      payload?.text ||
      payload?.message?.text ||
      payload?.comment?.text ||
      payload?.caption;

    if (!text || typeof text !== "string") return null;

    const normalized = text
      .toLowerCase()
      .replace(/https?:\/\/\S+/g, "") // strip URLs
      .replace(/[^a-z0-9\s]/g, "") // strip punctuation
      .replace(/\s+/g, " ") // collapse whitespace
      .trim();

    if (normalized.length === 0) return null;

    return crypto
      .createHash("sha256")
      .update(`${payload.platform || "unknown"}:${normalized}`)
      .digest("hex");
  }

  private generateHash(platform: PlatformType, payload: any): string {
    const dataString = JSON.stringify(payload);
    return crypto
      .createHash("sha256")
      .update(`${platform}:${dataString}`)
      .digest("hex");
  }
}
