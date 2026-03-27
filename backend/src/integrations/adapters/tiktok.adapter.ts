import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import {
  PlatformAdapter,
  OAuthTokens,
  PublishResult,
} from "../interfaces/platform-adapter.interface";

@Injectable()
export class TiktokAdapter implements PlatformAdapter {
  platform = "TIKTOK" as const;
  private readonly logger = new Logger(TiktokAdapter.name);
  private readonly isLive: boolean;
  private readonly clientKey: string;
  private readonly clientSecret: string;

  constructor(private readonly config: ConfigService) {
    this.clientKey = this.config.get<string>("TIKTOK_CLIENT_KEY", "");
    this.clientSecret = this.config.get<string>("TIKTOK_CLIENT_SECRET", "");
    this.isLive = !!(
      this.clientKey &&
      this.clientSecret &&
      !this.clientKey.startsWith("demo")
    );
    this.logger.log(
      `TikTok adapter running in ${this.isLive ? "LIVE" : "MOCK"} mode`,
    );
  }

  getAuthorizationUrl(redirectUri: string, state: string): string {
    const key = this.clientKey || "demo_tiktok_client_key";
    const scopes = "user.info.basic,video.list,video.upload";
    return `https://www.tiktok.com/v2/auth/authorize/?client_key=${encodeURIComponent(key)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&response_type=code&state=${encodeURIComponent(state)}`;
  }

  async exchangeCodeForTokens(
    code: string,
    redirectUri: string,
  ): Promise<OAuthTokens> {
    if (!this.isLive) {
      this.logger.log(`[Mock] Exchanging TikTok OAuth code for tokens`);
      return {
        accessToken: `tiktok_access_${Date.now()}`,
        refreshToken: `tiktok_refresh_${Date.now()}`,
        expiresIn: 86400,
        scope: "user.info.basic,video.list,video.upload",
        accountId: `tiktok_user_${Math.random().toString(36).substring(2, 10)}`,
        accountName: "Demo TikTok Account",
      };
    }

    const { data } = await axios.post(
      "https://open.tiktokapis.com/v2/oauth/token/",
      new URLSearchParams({
        client_key: this.clientKey,
        client_secret: this.clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    );

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      scope: data.scope,
      accountId: data.open_id,
      accountName: `tiktok_${data.open_id}`,
    };
  }

  async refreshToken(refreshTokenStr: string): Promise<OAuthTokens> {
    if (!this.isLive) {
      this.logger.log(`[Mock] Refreshing TikTok token`);
      return {
        accessToken: `tiktok_access_${Date.now()}`,
        refreshToken: `tiktok_refresh_${Date.now()}`,
        expiresIn: 86400,
        accountId: "unchanged",
        accountName: "unchanged",
      };
    }

    const { data } = await axios.post(
      "https://open.tiktokapis.com/v2/oauth/token/",
      new URLSearchParams({
        client_key: this.clientKey,
        client_secret: this.clientSecret,
        grant_type: "refresh_token",
        refresh_token: refreshTokenStr,
      }),
    );

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      accountId: "unchanged",
      accountName: "unchanged",
    };
  }

  async validateCredentials(credentials: any): Promise<boolean> {
    if (!this.isLive) return !!credentials?.accessToken;
    try {
      await axios.get("https://open.tiktokapis.com/v2/user/info/", {
        headers: { Authorization: `Bearer ${credentials.accessToken}` },
        params: { fields: "open_id,display_name" },
      });
      return true;
    } catch {
      return false;
    }
  }

  async getHealthStatus(credentials: any) {
    return {
      status: "ONLINE" as const,
      rateLimitRemaining: 150,
      rateLimitResetAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
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
    if (!this.isLive) {
      this.logger.log(
        `[Mock] Publishing to TikTok: "${content.substring(0, 50)}..."`,
      );
      if (Math.random() < 0.05) {
        return { success: false, error: "TikTok rate limit (mock)" };
      }
      const postId = `tiktok_post_${Date.now()}`;
      return {
        success: true,
        platformPostId: postId,
        platformPostUrl: `https://www.tiktok.com/@user/video/${postId}`,
        rateLimitRemaining: Math.floor(Math.random() * 150) + 10,
      };
    }

    try {
      const { data } = await axios.post(
        "https://open.tiktokapis.com/v2/comment/reply/",
        { comment_id: replyToId, text: content },
        { headers: { Authorization: `Bearer ${credentials.accessToken}` } },
      );
      return {
        success: true,
        platformPostId: data.data?.comment_id || `tiktok_${Date.now()}`,
      };
    } catch (err: any) {
      this.logger.error(`TikTok publish failed: ${err.message}`);
      return {
        success: false,
        error: err.response?.data?.error?.message || err.message,
      };
    }
  }
}
