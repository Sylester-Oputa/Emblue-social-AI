import {
  Controller,
  Post,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  Headers,
  BadRequestException,
  UsePipes,
  ValidationPipe,
} from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { IngestionService } from "./ingestion.service";
import { Public } from "../common/decorators/public.decorator";
import { PlatformType } from "@prisma/client";
import { WebhookPayloadDto } from "./dto/webhook-payload.dto";
import { Throttle } from "@nestjs/throttler";
import * as crypto from "crypto";

@ApiTags("Ingestion")
@Controller("ingestion")
export class IngestionController {
  constructor(private readonly ingestionService: IngestionService) {}

  @Public()
  @Post("webhook/:platform")
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @UsePipes(
    new ValidationPipe({
      whitelist: false,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  )
  @ApiOperation({ summary: "Receive webhook from platform" })
  async handleWebhook(
    @Param("platform") platform: PlatformType,
    @Body() payload: WebhookPayloadDto,
    @Headers("x-webhook-signature") signature?: string,
    @Headers("x-idempotency-key") idempotencyKey?: string,
  ) {
    // Validate platform enum
    const validPlatforms: string[] = Object.values(PlatformType);
    if (!validPlatforms.includes(platform)) {
      throw new BadRequestException(`Invalid platform: ${platform}`);
    }

    // Verify webhook signature if signing secret is configured
    const webhookSecret = process.env.WEBHOOK_SIGNING_SECRET;
    if (webhookSecret && signature) {
      const expectedSig = crypto
        .createHmac("sha256", webhookSecret)
        .update(JSON.stringify(payload))
        .digest("hex");
      const sigBuffer = Buffer.from(signature, "hex");
      const expectedBuffer = Buffer.from(expectedSig, "hex");
      if (
        sigBuffer.length !== expectedBuffer.length ||
        !crypto.timingSafeEqual(sigBuffer, expectedBuffer)
      ) {
        throw new BadRequestException("Invalid webhook signature");
      }
    }

    return this.ingestionService.handleWebhook(
      platform,
      payload,
      idempotencyKey,
    );
  }
}
