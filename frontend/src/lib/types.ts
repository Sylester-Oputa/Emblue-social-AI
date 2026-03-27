// User & Auth Types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "SUPER_ADMIN" | "ADMIN" | "ANALYST" | "VIEWER";
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  companyName: string;
}

// Workspace Types
export interface Workspace {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

// Signal Types
export type Platform = "X" | "INSTAGRAM" | "FACEBOOK" | "TIKTOK";
export type SignalType = "MENTION" | "COMMENT" | "DIRECT_MESSAGE" | "POST";
export type SignalStatus =
  | "NEW"
  | "PROCESSING"
  | "RESPONDED"
  | "ESCALATED"
  | "IGNORED";

export interface Signal {
  id: string;
  workspaceId: string;
  platform: Platform;
  type: SignalType;
  status: SignalStatus;
  externalEventId: string;
  author: string;
  authorId: string;
  content: string;
  rawPayload: any;
  receivedAt: string;
  processed: boolean;
  processedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Response Types
export type ResponseStatus =
  | "DRAFT"
  | "APPROVED"
  | "POSTED"
  | "FAILED"
  | "ESCALATED";

export interface Response {
  id: string;
  signalId: string;
  workspaceId: string;
  status: ResponseStatus;
  generatedText: string;
  confidence: number;
  reasons: string[];
  approvedBy?: string;
  approvedAt?: string;
  overriddenBy?: string;
  overriddenAt?: string;
  postedAt?: string;
  externalPostId?: string;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
  signal?: Signal;
}

// Campaign Types
export type CampaignStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "COMPLETED";

export interface Campaign {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  status: CampaignStatus;
  startDate: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
}

// Integration Types
export interface Integration {
  id: string;
  workspaceId: string;
  platform: Platform;
  accountName?: string;
  accountId?: string;
  scopes: string[];
  active: boolean;
  lastSyncAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Notification Types
export type NotificationType = "ESCALATION" | "CAMPAIGN" | "SYSTEM" | "ALERT";

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: any;
  read: boolean;
  readAt?: string;
  createdAt: string;
}

// SSE Event Types
export type PipelineEventType =
  | "signal.created"
  | "draft.approved"
  | "delivery.success"
  | "delivery.failed";

export interface PipelineEvent {
  id: string;
  workspaceId: string;
  eventType: PipelineEventType;
  signalId?: string;
  responseId?: string;
  metadata?: any;
  createdAt: string;
}

// API Response Wrapper
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: any[];
}

// Pagination
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Risk Event Types
export type RiskEventCategory =
  | "HARASSMENT"
  | "SELF_HARM"
  | "FRAUD"
  | "LEGAL_THREAT"
  | "PII_LEAK"
  | "OFF_BRAND";
export type RiskEventStatus = "OPEN" | "ACKNOWLEDGED" | "RESOLVED";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface RiskEvent {
  id: string;
  workspaceId: string;
  signalId?: string;
  draftId?: string;
  category: RiskEventCategory;
  severity: RiskLevel;
  status: RiskEventStatus;
  description: string;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Agent Run Types
export type AgentRunStatus = "SUCCESS" | "FAILED" | "TIMEOUT";

export interface AgentRun {
  id: string;
  workspaceId: string;
  agentName: string;
  inputJson: any;
  outputJson: any;
  status: AgentRunStatus;
  modelName?: string;
  tokenCount?: number;
  latencyMs?: number;
  errorMessage?: string;
  createdAt: string;
}

export interface AgentRunStats {
  total: number;
  successCount: number;
  failedCount: number;
  successRate: number;
  avgLatencyMs: number;
}

// Shortlink Types
export interface Shortlink {
  id: string;
  workspaceId: string;
  code: string;
  destinationUrl: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  clickCount: number;
  createdAt: string;
}

// Brand Profile Types
export interface BrandProfile {
  id: string;
  workspaceId: string;
  companyName?: string;
  tone?: string;
  prohibitedTerms: string[];
  requiredPhrases: string[];
  requiredDisclaimers: string[];
  createdAt: string;
  updatedAt: string;
}

// Analytics Types (extended)
export interface AnalyticsSummary {
  totalSignals: number;
  actionedSignals: number;
  pendingApprovals: number;
  totalDelivered: number;
  messagesIngested: number;
  suggestionsGenerated: number;
  autoApprovedCount: number;
  escalatedCount: number;
  riskEventsOpen: number;
  failedDeliveries: number;
  signalsByPlatform: Record<Platform, number>;
  resolutionRate: number;
  automationRate: number;
  postingRate: number;
  avgResponseTimeMs: number;
  agentRunsTotal: number;
  agentRunsSuccess: number;
  agentSuccessRate: number | null;
  shortlinksTotal: number;
  shortlinkClicks: number;
}
