"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALL_QUEUE_NAMES = exports.QUEUE_NAMES = void 0;
exports.QUEUE_NAMES = {
    SIGNAL_DETECTED: 'signal.detected',
    SIGNAL_NORMALIZED: 'signal.normalized',
    INTENT_SCORED: 'intent.scored',
    SENTIMENT_SCORED: 'sentiment.scored',
    MODERATION_CHECKED: 'moderation.checked',
    POLICY_EVALUATED: 'policy.evaluated',
    APPROVAL_REQUESTED: 'approval.requested',
    RESPONSE_DRAFTED: 'response.drafted',
    DELIVERY_REQUESTED: 'delivery.requested',
    DELIVERY_COMPLETED: 'delivery.completed',
    DELIVERY_FAILED: 'delivery.failed',
    RATE_LIMIT_HIT: 'rate_limit.hit',
    INTEGRATION_AUTH_EXPIRING: 'integration.auth_expiring',
};
exports.ALL_QUEUE_NAMES = Object.values(exports.QUEUE_NAMES);
