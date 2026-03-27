import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { NormalizationProcessor } from './normalization.processor';

@Injectable()
export class IngestionProcessor {
  private readonly logger = new Logger(IngestionProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly normalizationProcessor: NormalizationProcessor
  ) {}

  async process(job: any): Promise<any> {
    this.logger.log(`Processing SIGNAL_DETECTED stub job ${job.data.rawEventId}`);
    const { rawEventId, platform } = job.data;

    const rawEvent = await this.prisma.rawEvent.findUnique({
      where: { id: rawEventId },
    });

    if (!rawEvent) {
      throw new Error(`RawEvent not found: ${rawEventId}`);
    }

    // Call NormalizationProcessor directly to avoid BullMQ Redis version crash
    setTimeout(() => {
      this.normalizationProcessor.process({ data: { rawEventId, platform } }).catch(console.error);
    }, 100);

    return { processed: true, rawEventId };
  }
}
