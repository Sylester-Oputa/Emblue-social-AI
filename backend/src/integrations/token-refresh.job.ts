import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../database/prisma.service";
import { IntegrationsService } from "./integrations.service";
import { XAdapter } from "./adapters/x.adapter";
import { InstagramAdapter } from "./adapters/instagram.adapter";
import { FacebookAdapter } from "./adapters/facebook.adapter";
import { TiktokAdapter } from "./adapters/tiktok.adapter";
import { PlatformAdapter } from "./interfaces/platform-adapter.interface";
import { AuditService } from "../audit/audit.service";

@Injectable()
export class TokenRefreshJob {
  private readonly logger = new Logger(TokenRefreshJob.name);
  private readonly adapters: Map<string, PlatformAdapter>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly integrationsService: IntegrationsService,
    private readonly audit: AuditService,
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

  @Cron(CronExpression.EVERY_6_HOURS)
  async refreshExpiringTokens() {
    this.logger.log("Starting token refresh check...");

    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const expiringCredentials = await this.prisma.platformCredential.findMany({
      where: {
        expiresAt: { lte: sevenDaysFromNow },
        connection: { status: "ACTIVE" },
      },
      include: {
        connection: { include: { workspace: true } },
      },
    });

    this.logger.log(
      `Found ${expiringCredentials.length} credentials expiring within 7 days`,
    );

    for (const cred of expiringCredentials) {
      try {
        const adapter = this.adapters.get(cred.connection.platform);
        if (!adapter) continue;

        // Decrypt current credentials to get refresh token
        const decrypted =
          await this.integrationsService.getDecryptedCredentials(
            cred.connectionId,
          );
        if (!decrypted?.refreshToken) {
          this.logger.warn(
            `No refresh token for connection ${cred.connectionId}`,
          );
          continue;
        }

        // Refresh the token
        const newTokens = await adapter.refreshToken(decrypted.refreshToken);

        // Re-encrypt and store
        await this.integrationsService.connect(
          cred.connection.workspaceId,
          {
            platform: cred.connection.platform as any,
            accountId: cred.connection.accountId,
            accountName: cred.connection.accountName || "",
            scopes: (newTokens.scope || "").split(/[,\s]+/).filter(Boolean),
            accessToken: newTokens.accessToken,
            refreshToken: newTokens.refreshToken || decrypted.refreshToken,
          },
          { sub: "system", tenantId: cred.connection.workspace.tenantId },
        );

        await this.audit.log({
          tenantId: cred.connection.workspace.tenantId,
          actorId: "system",
          action: "token.refreshed",
          resourceType: "platform_credential",
          resourceId: cred.id,
          context: { platform: cred.connection.platform },
        });

        this.logger.log(
          `Refreshed token for ${cred.connection.platform} connection ${cred.connectionId}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to refresh token for connection ${cred.connectionId}: ${error.message}`,
        );
      }
    }

    this.logger.log("Token refresh check complete");
  }
}
