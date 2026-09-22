/**
 * حَرِّك | HARRIK — organization logo upload rules.
 *
 * Kept out of the route handler so the validation can be tested without a
 * request, a session or a storage backend. The bucket enforces its own size
 * and MIME limits (migration 11); these run first so a rejection is an Arabic
 * sentence in the UI rather than a storage error code.
 */

export const LOGO_BUCKET = "org-logos";

/** 2 MiB — matches `file_size_limit` on the bucket. */
export const MAX_LOGO_BYTES = 2 * 1024 * 1024;

/** Matches `allowed_mime_types` on the bucket. */
export const ALLOWED_LOGO_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
] as const;

const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

export interface LogoValidationResult {
  ok: boolean;
  /** Arabic message, ready to show. Only set when `ok` is false. */
  errorAr?: string;
  errorEn?: string;
}

export function validateLogo(file: { type: string; size: number }): LogoValidationResult {
  if (!file.type || !ALLOWED_LOGO_TYPES.includes(file.type as any)) {
    return {
      ok: false,
      errorAr: "صيغة الملف غير مدعومة. استخدم PNG أو JPG أو WEBP أو SVG.",
      errorEn: "Unsupported file type. Use PNG, JPG, WEBP or SVG.",
    };
  }
  if (!Number.isFinite(file.size) || file.size <= 0) {
    return {
      ok: false,
      errorAr: "الملف فارغ أو تالف.",
      errorEn: "The file is empty or unreadable.",
    };
  }
  if (file.size > MAX_LOGO_BYTES) {
    return {
      ok: false,
      errorAr: "حجم الشعار يتجاوز 2 ميجابايت.",
      errorEn: "The logo exceeds 2 MB.",
    };
  }
  return { ok: true };
}

/**
 * Where the file goes: one folder per tenant, which is exactly what the storage
 * policies authorise against. The timestamp busts the CDN cache for the public
 * URL — a logo replaced under the same name would otherwise keep serving the
 * old image on the permit sticker.
 */
export function logoObjectPath(organizationId: string, mimeType: string, now: Date = new Date()): string {
  const extension = EXTENSION_BY_TYPE[mimeType] || "png";
  return `${organizationId}/logo-${now.getTime()}.${extension}`;
}
