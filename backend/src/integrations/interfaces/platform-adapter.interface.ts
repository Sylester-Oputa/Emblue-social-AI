import { PlatformType } from "@prisma/client";

export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number; // seconds
  scope?: string;
  accountId: string;
  accountName: string;
}

export interface PublishResult {
  success: boolean;
  platformPostId?: string;
  platformPostUrl?: string;
  rateLimitRemaining?: number;
  error?: string;
}

export interface PlatformAdapter {
  platform: PlatformType;

  /** Generate the OAuth authorization URL for this platform */
  getAuthorizationUrl(redirectUri: string, state: string): string;

  /** Exchange an authorization code for tokens */
  exchangeCodeForTokens(
    code: string,
    redirectUri: string,
  ): Promise<OAuthTokens>;

  /** Refresh an expired access token */
  refreshToken(refreshToken: string): Promise<OAuthTokens>;

  validateCredentials(credentials: any): Promise<boolean>;

  getHealthStatus(credentials: any): Promise<{
    status: "ONLINE" | "DEGRADED" | "OFFLINE";
    rateLimitRemaining?: number;
    rateLimitResetAt?: Date;
  }>;

  fetchRecentSignals(credentials: any, since?: Date): Promise<any[]>;

  publishResponse(
    credentials: any,
    content: string,
    replyToId?: string,
  ): Promise<PublishResult>;
}
