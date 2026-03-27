import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { PolicyProcessor } from "./policy.processor";
import { redactPii } from "../common/utils/pii-redactor";

@Injectable()
export class NormalizationProcessor {
  private readonly logger = new Logger(NormalizationProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly policyProcessor: PolicyProcessor,
  ) {}

  async process(job: any): Promise<any> {
    this.logger.log(`Normalizing signal for rawEvent ${job.data.rawEventId}`);
    const { rawEventId, platform } = job.data;

    const rawEvent = await this.prisma.rawEvent.findUnique({
      where: { id: rawEventId },
    });

    if (!rawEvent) {
      throw new Error(`RawEvent not found: ${rawEventId}`);
    }

    const payloadObj = rawEvent.payload as any;

    // Extract content from various platform payload formats
    const content = redactPii(
      payloadObj?.text ||
        payloadObj?.message?.text ||
        payloadObj?.comment?.text ||
        payloadObj?.caption ||
        (typeof payloadObj === "string"
          ? payloadObj
          : JSON.stringify(payloadObj)),
    );

    // Extract author info from payload fields
    const authorId =
      payloadObj?.author_id ||
      payloadObj?.user?.id ||
      payloadObj?.from?.id ||
      payloadObj?.author?.id ||
      `unknown_${Date.now()}`;

    const authorHandle =
      payloadObj?.author ||
      payloadObj?.user?.username ||
      payloadObj?.user?.screen_name ||
      payloadObj?.from?.username ||
      payloadObj?.author_handle ||
      `user_${authorId}`;

    // Determine action type from payload structure
    const actionType =
      payloadObj?.type === "message_create" || payloadObj?.type === "dm"
        ? "DM"
        : payloadObj?.type === "mention" || payloadObj?.in_reply_to_id
          ? "MENTION"
          : "REPLY";

    const normalizedSignal = await this.prisma.normalizedSignal.upsert({
      where: { rawEventId },
      update: {},
      create: {
        workspaceId: rawEvent.workspaceId,
        rawEventId,
        platform,
        actionType,
        authorId: String(authorId),
        authorHandle: String(authorHandle),
        content,
        occurredAt: payloadObj?.created_at
          ? new Date(payloadObj.created_at)
          : new Date(),
        status: "NORMALIZED",
      },
    });

    this.logger.log(
      `Signal ${normalizedSignal.id} normalized: author=@${authorHandle}, type=${actionType}`,
    );

    // Call PolicyProcessor directly (setTimeout avoids BullMQ Redis version issue)
    setTimeout(() => {
      this.policyProcessor
        .process({
          data: {
            signalId: normalizedSignal.id,
            workspaceId: rawEvent.workspaceId,
          },
        })
        .catch((err) =>
          this.logger.error(`Policy processing failed: ${err.message}`),
        );
    }, 100);

    return { processed: true, signalId: normalizedSignal.id };
  }
}
