import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Req,
  Query,
  Res,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { Response } from "express";
import { IntegrationsService } from "./integrations.service";
import { ConnectIntegrationDto } from "./dto/connect-integration.dto";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { Public } from "../common/decorators/public.decorator";
import { XAdapter } from "./adapters/x.adapter";
import { InstagramAdapter } from "./adapters/instagram.adapter";
import { FacebookAdapter } from "./adapters/facebook.adapter";
import { TiktokAdapter } from "./adapters/tiktok.adapter";
import { PlatformAdapter } from "./interfaces/platform-adapter.interface";
import { ConfigService } from "@nestjs/config";
import * as crypto from "crypto";

@ApiTags("Integrations")
@ApiBearerAuth()
@Controller()
export class IntegrationsController {
  private readonly logger = new Logger(IntegrationsController.name);
  private readonly adapters: Map<string, PlatformAdapter>;

  constructor(
    private readonly integrationsService: IntegrationsService,
    private readonly config: ConfigService,
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

  // ── OAuth Flow ──

  @Get("workspaces/:workspaceId/integrations/connect/:platform")
  @Roles("WORKSPACE_ADMIN")
  @ApiOperation({ summary: "Get OAuth authorization URL for a platform" })
  async initiateOAuth(
    @Param("workspaceId") workspaceId: string,
    @Param("platform") platform: string,
    @CurrentUser() user: any,
  ) {
    const platformKey = platform.toUpperCase();
    const adapter = this.adapters.get(platformKey);
    if (!adapter) {
      throw new BadRequestException(`Unsupported platform: ${platform}`);
    }

    const baseUrl = this.config.get<string>(
      "APP_BASE_URL",
      "http://localhost:3005",
    );
    const redirectUri = `${baseUrl}/integrations/callback/${platformKey}`;

    // Create encrypted state with workspaceId + userId + nonce
    const statePayload = JSON.stringify({
      workspaceId,
      userId: user.sub,
      tenantId: user.tenantId,
      nonce: crypto.randomBytes(16).toString("hex"),
      ts: Date.now(),
    });
    const state = this.integrationsService.encryptState(statePayload);
    const authorizationUrl = adapter.getAuthorizationUrl(redirectUri, state);

    return { authorizationUrl, platform: platformKey };
  }

  @Get("integrations/callback/:platform")
  @Public()
  @ApiOperation({ summary: "OAuth callback endpoint (public)" })
  async oauthCallback(
    @Param("platform") platform: string,
    @Query("code") code: string,
    @Query("state") state: string,
    @Res() res: Response,
  ) {
    const frontendUrl = this.config.get<string>(
      "FRONTEND_URL",
      "http://localhost:3000",
    );
    try {
      if (!code || !state) {
        throw new BadRequestException("Missing code or state parameter");
      }

      const platformKey = platform.toUpperCase();
      const adapter = this.adapters.get(platformKey);
      if (!adapter) {
        throw new BadRequestException(`Unsupported platform: ${platform}`);
      }

      // Decrypt and validate state
      const statePayload = JSON.parse(
        this.integrationsService.decryptState(state),
      );
      const stateAge = Date.now() - statePayload.ts;
      if (stateAge > 10 * 60 * 1000) {
        // 10 minute max
        throw new BadRequestException("OAuth state expired");
      }

      const baseUrl = this.config.get<string>(
        "APP_BASE_URL",
        "http://localhost:3005",
      );
      const redirectUri = `${baseUrl}/integrations/callback/${platformKey}`;

      // Exchange code for tokens
      const tokens = await adapter.exchangeCodeForTokens(code, redirectUri);

      // Connect using existing service method
      const user = {
        sub: statePayload.userId,
        tenantId: statePayload.tenantId,
      };
      await this.integrationsService.connect(
        statePayload.workspaceId,
        {
          platform: platformKey as any,
          accountId: tokens.accountId,
          accountName: tokens.accountName,
          scopes: (tokens.scope || "").split(/[,\s]+/).filter(Boolean),
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken || "",
        },
        user,
      );

      this.logger.log(
        `OAuth callback success: ${platformKey} for workspace ${statePayload.workspaceId}`,
      );
      res.redirect(
        `${frontendUrl}/integrations?success=true&platform=${platformKey}`,
      );
    } catch (error) {
      this.logger.error(`OAuth callback failed: ${error.message}`);
      res.redirect(
        `${frontendUrl}/integrations?error=${encodeURIComponent(error.message)}`,
      );
    }
  }

  // ── Standard CRUD ──

  @Post("workspaces/:workspaceId/integrations")
  @Roles("WORKSPACE_ADMIN")
  @ApiOperation({ summary: "Connect a new platform integration" })
  async connect(
    @Param("workspaceId") workspaceId: string,
    @Body() dto: ConnectIntegrationDto,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    return this.integrationsService.connect(workspaceId, dto, user, req.ip);
  }

  @Get("workspaces/:workspaceId/integrations")
  @Roles(
    "VIEWER",
    "OPERATOR",
    "REVIEWER",
    "ANALYST",
    "WORKSPACE_ADMIN",
    "TENANT_ADMIN",
  )
  @ApiOperation({ summary: "List connected integrations for workspace" })
  async list(
    @Param("workspaceId") workspaceId: string,
    @CurrentUser() user: any,
  ) {
    return this.integrationsService.list(workspaceId, user);
  }

  @Delete("workspaces/:workspaceId/integrations/:connectionId")
  @Roles("WORKSPACE_ADMIN")
  @ApiOperation({ summary: "Disconnect an integration" })
  async disconnect(
    @Param("workspaceId") workspaceId: string,
    @Param("connectionId") connectionId: string,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    return this.integrationsService.disconnect(
      workspaceId,
      connectionId,
      user,
      req.ip,
    );
  }
}
