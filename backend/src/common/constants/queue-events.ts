export const QUEUE_NAMES = {
  SIGNAL_DETECTED: "signal.detected",
  SIGNAL_NORMALIZED: "signal.normalized",
  INTENT_SCORED: "intent.scored",
  SENTIMENT_SCORED: "sentiment.scored",
  MODERATION_CHECKED: "moderation.checked",
  POLICY_EVALUATED: "policy.evaluated",
  APPROVAL_REQUESTED: "approval.requested",
  RESPONSE_DRAFTED: "response.drafted",
  DELIVERY_REQUESTED: "delivery.requested",
  DELIVERY_COMPLETED: "delivery.completed",
  DELIVERY_FAILED: "delivery.failed",
  RATE_LIMIT_HIT: "rate_limit.hit",
  INTEGRATION_AUTH_EXPIRING: "integration.auth_expiring",
  // Automation pipeline
  AUTO_GENERATE: "automation.generate",
  AUTO_APPROVE: "automation.approve",
  AUTO_POST: "automation.post",
} as const;

export const RISK_THRESHOLD = parseInt(process.env.RISK_THRESHOLD || "70", 10);

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export const ALL_QUEUE_NAMES = Object.values(QUEUE_NAMES);
