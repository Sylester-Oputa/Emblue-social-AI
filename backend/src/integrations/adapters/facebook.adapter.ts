import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import {
  PlatformAdapter,
  OAuthTokens,
  PublishResult,
} from "../interfaces/platform-adapter.interface";

@Injectable()
export class FacebookAdapter implements PlatformAdapter {
  platform = "FACEBOOK" as const;
  private readonly logger = new Logger(FacebookAdapter.name);
  private readonly isLive: boolean;
  private readonly clientId: string;
  private readonly clientSecret: string;

  constructor(private readonly config: ConfigService) {
    this.clientId = this.config.get<string>("FACEBOOK_CLIENT_ID", "");
    this.clientSecret = this.config.get<string>("FACEBOOK_CLIENT_SECRET", "");
    this.isLive = !!(
      this.clientId &&
      this.clientSecret &&
      !this.clientId.startsWith("demo")
    );
    this.logger.log(
      `Facebook adapter running in ${this.isLive ? "LIVE" : "MOCK"} mode`,
    );
  }

  getAuthorizationUrl(redirectUri: string, state: string): string {
    const id = this.clientId || "demo_fb_client_id";
    const scopes =
      "pages_manage_engagement,pages_read_engagement,pages_manage_posts";
    return `https://www.facebook.com/v18.0/dialog/oauth?client_id=${encodeURIComponent(id)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&state=${encodeURIComponent(state)}&response_type=code`;
  }

  async exchangeCodeForTokens(
    code: string,
    redirectUri: string,
  ): Promise<OAuthTokens> {
    if (!this.isLive) {
      this.logger.log(`[Mock] Exchanging Facebook OAuth code for tokens`);
      return {
        accessToken: `fb_access_${Date.now()}`,
        refreshToken: `fb_refresh_${Date.now()}`,
        expiresIn: 5184000,
        scope:
          "pages_manage_engagement,pages_read_engagement,pages_manage_posts",
        accountId: `fb_page_${Math.random().toString(36).substring(2, 10)}`,
        accountName: "Demo Facebook Page",
      };
    }

    const { data } = await axios.get(
      `https://graph.facebook.com/v18.0/oauth/access_token`,
      {
        params: {
          client_id: this.clientId,
          client_secret: this.clientSecret,
          redirect_uri: redirectUri,
          code,
        },
      },
    );

    const { data: me } = await axios.get(
      `https://graph.facebook.com/v18.0/me?access_token=${data.access_token}`,
    );

    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in,
      scope: "pages_manage_engagement,pages_read_engagement,pages_manage_posts",
      accountId: me.id,
      accountName: me.name,
    };
  }

  async refreshToken(refreshTokenStr: string): Promise<OAuthTokens> {
    if (!this.isLive) {
      this.logger.log(`[Mock] Refreshing Facebook token`);
      return {
        accessToken: `fb_access_${Date.now()}`,
        expiresIn: 5184000,
        accountId: "unchanged",
        accountName: "unchanged",
      };
    }

    const { data } = await axios.get(
      `https://graph.facebook.com/v18.0/oauth/access_token`,
      {
        params: {
          grant_type: "fb_exchange_token",
          client_id: this.clientId,
          client_secret: this.clientSecret,
          fb_exchange_token: refreshTokenStr,
        },
      },
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
        `https://graph.facebook.com/v18.0/me?access_token=${credentials.accessToken}`,
      );
      return true;
    } catch {
      return false;
    }
  }

  async getHealthStatus(credentials: any) {
    return {
      status: "ONLINE" as const,
      rateLimitRemaining: 500,
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
    if (!this.isLive) {
      this.logger.log(
        `[Mock] Publishing to Facebook: "${content.substring(0, 50)}..."`,
      );
      if (Math.random() < 0.05) {
        return { success: false, error: "Facebook API throttled (mock)" };
      }
      const postId = `fb_post_${Date.now()}`;
      return {
        success: true,
        platformPostId: postId,
        platformPostUrl: `https://www.facebook.com/posts/${postId}`,
        rateLimitRemaining: Math.floor(Math.random() * 500) + 50,
      };
    }

    try {
      const endpoint = replyToId
        ? `https://graph.facebook.com/v18.0/${replyToId}/comments`
        : `https://graph.facebook.com/v18.0/me/feed`;
      const { data } = await axios.post(endpoint, {
        message: content,
        access_token: credentials.accessToken,
      });
      return {
        success: true,
        platformPostId: data.id,
        platformPostUrl: `https://www.facebook.com/${data.id}`,
      };
    } catch (err: any) {
      this.logger.error(`Facebook publish failed: ${err.message}`);
      return {
        success: false,
        error: err.response?.data?.error?.message || err.message,
      };
    }
  }
}
