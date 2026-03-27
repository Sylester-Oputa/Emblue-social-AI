import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import {
  PlatformAdapter,
  OAuthTokens,
  PublishResult,
} from "../interfaces/platform-adapter.interface";

@Injectable()
export class InstagramAdapter implements PlatformAdapter {
  platform = "INSTAGRAM" as const;
  private readonly logger = new Logger(InstagramAdapter.name);
  private readonly isLive: boolean;
  private readonly clientId: string;
  private readonly clientSecret: string;

  constructor(private readonly config: ConfigService) {
    this.clientId = this.config.get<string>("INSTAGRAM_CLIENT_ID", "");
    this.clientSecret = this.config.get<string>("INSTAGRAM_CLIENT_SECRET", "");
    this.isLive = !!(
      this.clientId &&
      this.clientSecret &&
      !this.clientId.startsWith("demo")
    );
    this.logger.log(
      `Instagram adapter running in ${this.isLive ? "LIVE" : "MOCK"} mode`,
    );
  }

  getAuthorizationUrl(redirectUri: string, state: string): string {
    const id = this.clientId || "demo_ig_client_id";
    const scopes = "instagram_basic,instagram_manage_comments";
    return `https://api.instagram.com/oauth/authorize?client_id=${encodeURIComponent(id)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&response_type=code&state=${encodeURIComponent(state)}`;
  }

  async exchangeCodeForTokens(
    code: string,
    redirectUri: string,
  ): Promise<OAuthTokens> {
    if (!this.isLive) {
      this.logger.log(`[Mock] Exchanging Instagram OAuth code for tokens`);
      return {
        accessToken: `ig_access_${Date.now()}`,
        refreshToken: `ig_refresh_${Date.now()}`,
        expiresIn: 3600,
        scope: "instagram_basic,instagram_manage_comments",
        accountId: `ig_user_${Math.random().toString(36).substring(2, 10)}`,
        accountName: "Demo Instagram Account",
      };
    }

    const { data: shortLived } = await axios.post(
      "https://api.instagram.com/oauth/access_token",
      new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
        code,
      }),
    );

    const { data: longLived } = await axios.get(
      `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${this.clientSecret}&access_token=${shortLived.access_token}`,
    );

    return {
      accessToken: longLived.access_token,
      expiresIn: longLived.expires_in,
      scope: "instagram_basic,instagram_manage_comments",
      accountId: String(shortLived.user_id),
      accountName: `ig_${shortLived.user_id}`,
    };
  }

  async refreshToken(refreshTokenStr: string): Promise<OAuthTokens> {
    if (!this.isLive) {
      this.logger.log(`[Mock] Refreshing Instagram token`);
      return {
        accessToken: `ig_access_${Date.now()}`,
        expiresIn: 3600,
        accountId: "unchanged",
        accountName: "unchanged",
      };
    }

    const { data } = await axios.get(
      `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${refreshTokenStr}`,
    );
    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in,
      accountId: "unchanged",
      accountName: "unchanged",
    };
  }

  async validateCredentials(credentials: any): Promise<boolean> {
    if (!this.isLive) return !!credentials?.accessToken;
    try {
      await axios.get(
        `https://graph.instagram.com/me?access_token=${credentials.accessToken}`,
      );
      return true;
    } catch {
      return false;
    }
  }

  async getHealthStatus(credentials: any) {
    return {
      status: "ONLINE" as const,
      rateLimitRemaining: 200,
      rateLimitResetAt: new Date(Date.now() + 60 * 60 * 1000),
    };
  }

  async fetchRecentSignals(credentials: any, since?: Date): Promise<any[]> {
    return [];
  }

  async publishResponse(
    credentials: any,
    content: string,
    replyToId?: string,
  ): Promise<PublishResult> {
    if (!this.isLive || !replyToId) {
      this.logger.log(
        `[Mock] Publishing to Instagram: "${content.substring(0, 50)}..."`,
      );
      if (Math.random() < 0.05) {
        return { success: false, error: "Instagram API error (mock)" };
      }
      const postId = `ig_post_${Date.now()}`;
      return {
        success: true,
        platformPostId: postId,
        platformPostUrl: `https://www.instagram.com/p/${postId}`,
        rateLimitRemaining: Math.floor(Math.random() * 200) + 20,
      };
    }

    try {
      const { data } = await axios.post(
        `https://graph.facebook.com/v18.0/${replyToId}/replies`,
        { message: content, access_token: credentials.accessToken },
      );
      return {
        success: true,
        platformPostId: data.id,
        platformPostUrl: `https://www.instagram.com/p/${data.id}`,
      };
    } catch (err: any) {
      this.logger.error(`Instagram publish failed: ${err.message}`);
      return {
        success: false,
        error: err.response?.data?.error?.message || err.message,
      };
    }
  }
}
