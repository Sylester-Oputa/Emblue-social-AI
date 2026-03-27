import { Module } from "@nestjs/common";
import { IntegrationsController } from "./integrations.controller";
import { IntegrationsService } from "./integrations.service";
import { XAdapter } from "./adapters/x.adapter";
import { InstagramAdapter } from "./adapters/instagram.adapter";
import { FacebookAdapter } from "./adapters/facebook.adapter";
import { TiktokAdapter } from "./adapters/tiktok.adapter";
import { TokenRefreshJob } from "./token-refresh.job";

@Module({
  controllers: [IntegrationsController],
  providers: [
    IntegrationsService,
    XAdapter,
    InstagramAdapter,
    FacebookAdapter,
    TiktokAdapter,
    TokenRefreshJob,
  ],
  exports: [
    IntegrationsService,
    XAdapter,
    InstagramAdapter,
    FacebookAdapter,
    TiktokAdapter,
  ],
})
export class IntegrationsModule {}
