import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { TwitterApi } from "twitter-api-v2";
import {
  PlatformAdapter,
  OAuthTokens,
  PublishResult,
} from "../interfaces/platform-adapter.interface";

@Injectable()
export class XAdapter implements PlatformAdapter {
  platform = "X" as const;
  private readonly logger = new Logger(XAdapter.name);
  private readonly isLive: boolean;
  private readonly clientId: string;
  private readonly clientSecret: string;

  constructor(private readonly config: ConfigService) {
    this.clientId = this.config.get<string>("X_CLIENT_ID", "");
    this.clientSecret = this.config.get<string>("X_CLIENT_SECRET", "");
    this.isLive = !!(
      this.clientId &&
      this.clientSecret &&
      !this.clientId.startsWith("demo")
    );
    if (this.isLive) {
      this.logger.log("X adapter running in LIVE mode");
    } else {
      this.logger.warn(
        "X adapter running in MOCK mode — set X_CLIENT_ID & X_CLIENT_SECRET for live",
      );
    }
  }

  getAuthorizationUrl(redirectUri: string, state: string): string {
    const id = this.clientId || "demo_x_client_id";
    const scopes = "tweet.read tweet.write users.read offline.access";
    return `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${encodeURIComponent(id)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&state=${encodeURIComponent(state)}&code_challenge=challenge&code_challenge_method=plain`;
  }

  async exchangeCodeForTokens(
    code: string,
    redirectUri: string,
  ): Promise<OAuthTokens> {
    if (!this.isLive) {
      this.logger.log(`[Mock] Exchanging X OAuth code for tokens`);
      return {
        accessToken: `x_access_${Date.now()}`,
        refreshToken: `x_refresh_${Date.now()}`,
        expiresIn: 7200,
        scope: "tweet.read tweet.write users.read offline.access",
        accountId: `x_user_${Math.random().toString(36).substring(2, 10)}`,
        accountName: "Demo X Account",
      };
    }

    const client = new TwitterApi({
      clientId: this.clientId,
      clientSecret: this.clientSecret,
    });
    const { accessToken, refreshToken, expiresIn } =
      await client.loginWithOAuth2({
        code,
        redirectUri,
        codeVerifier: "challenge",
      });
    const me = await new TwitterApi(accessToken).v2.me();
    return {
      accessToken,
      refreshToken: refreshToken || undefined,
      expiresIn,
      scope: "tweet.read tweet.write users.read offline.access",
      accountId: me.data.id,
      accountName: me.data.username,
    };
  }

  async refreshToken(refreshTokenStr: string): Promise<OAuthTokens> {
    if (!this.isLive) {
      this.logger.log(`[Mock] Refreshing X token`);
      return {
        accessToken: `x_access_${Date.now()}`,
        refreshToken: `x_refresh_${Date.now()}`,
        expiresIn: 7200,
        accountId: "unchanged",
        accountName: "unchanged",
      };
    }

    const client = new TwitterApi({
      clientId: this.clientId,
      clientSecret: this.clientSecret,
    });
    const { accessToken, refreshToken, expiresIn } =
      await client.refreshOAuth2Token(refreshTokenStr);
    return {
      accessToken,
      refreshToken: refreshToken || undefined,
      expiresIn,
      accountId: "unchanged",
      accountName: "unchanged",
    };
  }

  async validateCredentials(credentials: any): Promise<boolean> {
    if (!this.isLive) return !!credentials?.accessToken;
    try {
      const client = new TwitterApi(credentials.accessToken);
      await client.v2.me();
      return true;
    } catch {
      return false;
    }
  }

  async getHealthStatus(credentials: any) {
    return {
      status: "ONLINE" as const,
      rateLimitRemaining: 100,
      rateLimitResetAt: new Date(Date.now() + 15 * 60 * 1000),
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
        `[Mock] Publishing to X: "${content.substring(0, 50)}..."`,
      );
      if (Math.random() < 0.05) {
        return { success: false, error: "Rate limit exceeded (mock)" };
      }
      const postId = `x_post_${Date.now()}`;
      return {
        success: true,
        platformPostId: postId,
        platformPostUrl: `https://x.com/i/status/${postId}`,
        rateLimitRemaining: Math.floor(Math.random() * 100) + 10,
      };
    }

    try {
      const client = new TwitterApi(credentials.accessToken);
      const params: any = { text: content };
      if (replyToId) {
        params.reply = { in_reply_to_tweet_id: replyToId };
      }
      const result = await client.v2.tweet(params);
      return {
        success: true,
        platformPostId: result.data.id,
        platformPostUrl: `https://x.com/i/status/${result.data.id}`,
      };
    } catch (err: any) {
      this.logger.error(`X publish failed: ${err.message}`);
      return { success: false, error: err.message };
    }
  }
}
