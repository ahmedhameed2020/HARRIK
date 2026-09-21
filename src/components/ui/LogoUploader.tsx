"use client";

import React, { useRef, useState } from "react";
import { ImagePlus, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";
import { triggerHaptic } from "@/lib/haptics";
import { validateLogo, MAX_LOGO_BYTES } from "@/lib/branding/logo";

interface LogoUploaderProps {
  /** Current logo, if the organization already has one. */
  logoUrl?: string | null;
  /** Receives the new public URL once the upload succeeds. */
  onUploaded?: (logoUrl: string) => void;
}

/**
 * حَرِّك | HARRIK — organization logo picker.
 *
 * Shared by the onboarding wizard (§9.2, where the step was specified and never
 * built) and the admin branding settings, so a logo can be set during setup or
 * changed later without two implementations drifting apart.
 *
 * The same validation runs here and on the server: locally so the person gets
 * an immediate, readable reason, and again in the route because a client check
 * is a convenience, not a control.
 */
export function LogoUploader({ logoUrl, onUploaded }: LogoUploaderProps) {
  const { lang } = useLocale();
  const L = (ar: string, en: string) => (lang === "ar" ? ar : en);
  const inputRef = useRef<HTMLInputElement>(null);

  const [preview, setPreview] = useState<string | null>(logoUrl || null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  const handleFile = async (file: File) => {
    setError(null);
    setJustSaved(false);

    const validation = validateLogo({ type: file.type, size: file.size });
    if (!validation.ok) {
      setError(L(validation.errorAr || "", validation.errorEn || ""));
      return;
    }

    triggerHaptic("medium");
    setIsUploading(true);

    // Show the chosen image immediately; it is replaced by the stored URL on
    // success, or rolled back if the upload is refused.
    const localPreview = URL.createObjectURL(file);
    const previousPreview = preview;
    setPreview(localPreview);

    try {
      const body = new FormData();
      body.append("file", file);

      const res = await fetch("/api/admin/branding/logo", { method: "POST", body });
      const json = await res.json();

      if (res.ok && json.success && json.logoUrl) {
        setPreview(json.logoUrl);
        setJustSaved(true);
        triggerHaptic("success");
        onUploaded?.(json.logoUrl);
      } else {
        setPreview(previousPreview);
        setError(json.error || L("تعذّر رفع الشعار", "Could not upload the logo"));
      }
    } catch {
      setPreview(previousPreview);
      setError(L("خطأ في الاتصال", "Connection error"));
    } finally {
      URL.revokeObjectURL(localPreview);
      setIsUploading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-card border border-line bg-surface-sunken/60">
          {preview ? (
            // The logo is an arbitrary tenant URL, so next/image would need a
            // remote pattern per tenant domain; a plain img is correct here.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt={L("شعار المنشأة", "Organization logo")} className="h-full w-full object-contain" />
          ) : (
            <ImagePlus className="h-7 w-7 text-slate-400" aria-hidden="true" />
          )}
        </div>

        <div className="min-w-0">
          <button
            type="button"
            onClick={() => {
              triggerHaptic("selection");
              inputRef.current?.click();
            }}
            disabled={isUploading}
            className="btn btn-secondary gap-2 text-xs disabled:opacity-50"
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <ImagePlus className="h-4 w-4" aria-hidden="true" />
            )}
            <span>
              {isUploading
                ? L("جارٍ الرفع...", "Uploading...")
                : preview
                ? L("تغيير الشعار", "Change logo")
                : L("رفع شعار المنشأة", "Upload logo")}
            </span>
          </button>

          <p className="mt-1.5 text-micro text-slate-500 dark:text-slate-400">
            {L(
              `PNG أو JPG أو WEBP أو SVG — حتى ${Math.round(MAX_LOGO_BYTES / 1024 / 1024)} ميجابايت`,
              `PNG, JPG, WEBP or SVG — up to ${Math.round(MAX_LOGO_BYTES / 1024 / 1024)} MB`
            )}
          </p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="sr-only"
        aria-label={L("اختيار ملف الشعار", "Choose a logo file")}
        onChange={(e) => {
          const file = e.target.files?.[0];
          // Reset so picking the same file twice still fires a change event.
          e.target.value = "";
          if (file) handleFile(file);
        }}
      />

      {error && (
        <p className="mt-2 flex items-center gap-1.5 text-caption font-bold text-rose-600 dark:text-rose-400">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}

      {justSaved && !error && (
        <p className="mt-2 flex items-center gap-1.5 text-caption font-bold text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{L("تم حفظ الشعار", "Logo saved")}</span>
        </p>
      )}
    </div>
  );
}
