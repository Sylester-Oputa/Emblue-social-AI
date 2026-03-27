/**
 * PII Redaction utility.
 * Masks emails, phone numbers, SSNs, OAuth tokens in URLs, and OTP codes
 * before content is persisted to the database.
 */

const EMAIL_REGEX = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

const PHONE_REGEX =
  /(?:\+?\d{1,3}[\s\-.]?)?\(?\d{2,4}\)?[\s\-.]?\d{3,4}[\s\-.]?\d{3,4}/g;

const SSN_REGEX = /\b\d{3}[\-\s]?\d{2}[\-\s]?\d{4}\b/g;

// OAuth tokens / bearer tokens in URLs: access_token=xxx, token=xxx, key=xxx
const URL_TOKEN_REGEX =
  /(?:access_token|token|api_key|apikey|key|secret|password|auth)=[^\s&]+/gi;

// OTP / verification codes (4-8 digit standalone numbers)
const OTP_REGEX = /\b(?:code|otp|pin|verification)[:\s]*\d{4,8}\b/gi;

export function redactPii(text: string): string {
  if (!text || typeof text !== "string") return text;

  return text
    .replace(EMAIL_REGEX, "[EMAIL_REDACTED]")
    .replace(SSN_REGEX, "[SSN_REDACTED]")
    .replace(URL_TOKEN_REGEX, (match) => {
      const key = match.split("=")[0];
      return `${key}=[TOKEN_REDACTED]`;
    })
    .replace(OTP_REGEX, "[OTP_REDACTED]")
    .replace(PHONE_REGEX, (match) => {
      // Avoid false positives: only redact if 7+ digits present
      const digits = match.replace(/\D/g, "");
      return digits.length >= 7 ? "[PHONE_REDACTED]" : match;
    });
}

/**
 * Deep-redact PII from a JSON-serializable object.
 * Recursively walks strings in objects/arrays.
 */
export function redactPiiDeep(obj: unknown): unknown {
  if (typeof obj === "string") return redactPii(obj);
  if (Array.isArray(obj)) return obj.map(redactPiiDeep);
  if (obj !== null && typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = redactPiiDeep(value);
    }
    return result;
  }
  return obj;
}
