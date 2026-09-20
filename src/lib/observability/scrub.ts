/**
 * حَرِّك | HARRIK — PII scrubbing for error reporting.
 *
 * Pure, isomorphic helpers shared by the server sink and the browser reporter
 * so no personal data leaves the process unredacted.
 */

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
/** Any run of 4+ digits (plates, phone tails, IDs) → masked. */
const DIGIT_RUN_RE = /\d{4,}/g;
/** Bearer/JWT-ish or long opaque secrets. */
const SECRET_RE = /\b(?:eyJ[\w-]{10,}|[A-Za-z0-9_-]{32,})\b/g;
const PHONE_RE = /\+?\d[\d\s()-]{7,}\d/g;

/** Redacts common PII patterns from a string. */
export function scrubText(input: unknown): string {
  if (input === null || input === undefined) return "";
  let s = typeof input === "string" ? input : String(input);
  s = s.replace(EMAIL_RE, "[email]");
  s = s.replace(PHONE_RE, "[phone]");
  s = s.replace(DIGIT_RUN_RE, (m) => `${m.slice(0, 2)}${"*".repeat(Math.max(0, m.length - 2))}`);
  s = s.replace(SECRET_RE, "[redacted]");
  return s.slice(0, 2000);
}

/** Scrubs nested context objects (one level deep is enough for our payloads). */
export function scrubExtra(
  extra?: Record<string, unknown>
): Record<string, unknown> | undefined {
  if (!extra) return undefined;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(extra)) {
    out[k] = typeof v === "string" ? scrubText(v) : v;
  }
  return out;
}
