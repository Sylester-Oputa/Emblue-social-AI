import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { BullModule } from "@nestjs/bullmq";
import { ScheduleModule } from "@nestjs/schedule";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";

// Config
import appConfig from "./config/app.config";
import databaseConfig from "./config/database.config";
import redisConfig from "./config/redis.config";
import authConfig from "./config/auth.config";
import platformConfig from "./config/platform.config";
import queueConfig from "./config/queue.config";

// Core modules
import { DatabaseModule } from "./database/database.module";
import { AuthModule } from "./auth/auth.module";
import { AuditModule } from "./audit/audit.module";

// Feature modules
import { TenantsModule } from "./tenants/tenants.module";
import { WorkspacesModule } from "./workspaces/workspaces.module";
import { UsersModule } from "./users/users.module";
import { IntegrationsModule } from "./integrations/integrations.module";
import { IngestionModule } from "./ingestion/ingestion.module";
import { SignalsModule } from "./signals/signals.module";
import { IntelligenceModule } from "./intelligence/intelligence.module";
import { PoliciesModule } from "./policies/policies.module";
import { ApprovalsModule } from "./approvals/approvals.module";
import { ResponsesModule } from "./responses/responses.module";
import { DeliveryModule } from "./delivery/delivery.module";
import { CampaignsModule } from "./campaigns/campaigns.module";
import { AnalyticsModule } from "./analytics/analytics.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { OpsModule } from "./ops/ops.module";
import { WorkersModule } from "./workers/workers.module";
import { EventsModule } from "./events/events.module";
import { ShortlinksModule } from "./shortlinks/shortlinks.module";
import { ReplyJobsModule } from "./reply-jobs/reply-jobs.module";

// Guards
import { JwtAuthGuard } from "./auth/guards/jwt-auth.guard";
import { RolesGuard } from "./common/guards/roles.guard";

// Controllers
import { AppController } from "./app.controller";

// Queue names
import { ALL_QUEUE_NAMES } from "./common/constants/queue-events";

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        appConfig,
        databaseConfig,
        redisConfig,
        authConfig,
        platformConfig,
        queueConfig,
      ],
      envFilePath: ".env",
    }),

    // Rate limiting: 60 requests per 60 seconds per IP
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 60,
      },
    ]),

    // Schedule (cron jobs)
    ScheduleModule.forRoot(),

    // Core
    DatabaseModule,
    AuthModule,
    AuditModule,

    // Feature modules
    TenantsModule,
    WorkspacesModule,
    UsersModule,
    IntegrationsModule,
    IngestionModule,
    SignalsModule,
    IntelligenceModule,
    PoliciesModule,
    ApprovalsModule,
    ResponsesModule,
    DeliveryModule,
    CampaignsModule,
    AnalyticsModule,
    NotificationsModule,
    OpsModule,
    WorkersModule,
    EventsModule,
    ShortlinksModule,
    ReplyJobsModule,
  ],
  controllers: [AppController],
  providers: [
    // Global rate limit guard
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // Global JWT guard — all routes are protected by default
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // Global roles guard
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
