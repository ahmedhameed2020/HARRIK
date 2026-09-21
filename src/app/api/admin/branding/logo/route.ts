import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedSession } from "@/lib/supabase/auth-helpers";
import {
  LOGO_BUCKET,
  validateLogo,
  logoObjectPath,
  MAX_LOGO_BYTES,
} from "@/lib/branding/logo";

/**
 * POST /api/admin/branding/logo — uploads the organization's logo.
 *
 * `organizations.logo_url` has existed since the initial schema and the
 * onboarding wizard was specified to accept a logo (§9.2), but there was
 * nowhere to put the file: the column could only hold a hand-typed URL.
 *
 * The upload goes through the caller's own session, so the storage policies in
 * migration 11 apply — an administrator can only write into their own
 * organization's folder. Validation runs here first so a rejection reads as a
 * sentence rather than a storage error code.
 *
 * Body: multipart/form-data with a single `file` field.
 */
export async function POST(request: NextRequest) {
  try {
    const { session, error: authError, status: authStatus } = await getAuthenticatedSession();
    if (authError || !session) {
      return NextResponse.json({ success: false, error: authError }, { status: authStatus });
    }

    if (!["admin", "super_admin"].includes(session.role)) {
      return NextResponse.json(
        { success: false, error: "غير مصرح لك بتعديل هوية المنشأة" },
        { status: 403 }
      );
    }

    const form = await request.formData().catch(() => null);
    const file = form?.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json(
        { success: false, error: "لم يتم استلام ملف الشعار" },
        { status: 400 }
      );
    }

    const validation = validateLogo({ type: file.type, size: file.size });
    if (!validation.ok) {
      return NextResponse.json({ success: false, error: validation.errorAr }, { status: 400 });
    }

    const supabase = await createClient();
    const path = logoObjectPath(session.organizationId, file.type);

    const { error: uploadError } = await supabase.storage
      .from(LOGO_BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false });

    if (uploadError) {
      // The most common cause by far is the bucket not existing yet, which is
      // a deployment step rather than a user error — say so instead of showing
      // a raw storage message.
      const missingBucket = /bucket/i.test(uploadError.message || "");
      return NextResponse.json(
        {
          success: false,
          error: missingBucket
            ? "مساحة تخزين الشعارات غير مهيأة بعد. طبّق migration 11 على قاعدة البيانات."
            : uploadError.message,
        },
        { status: missingBucket ? 503 : 500 }
      );
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(LOGO_BUCKET).getPublicUrl(path);

    const { error: updateError } = await supabase
      .from("organizations")
      .update({ logo_url: publicUrl, updated_at: new Date().toISOString() })
      .eq("id", session.organizationId);

    if (updateError) {
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
    }

    await supabase.from("audit_logs").insert({
      organization_id: session.organizationId,
      actor_id: session.profile.id,
      action: "UPDATE_ORGANIZATION_LOGO",
      entity_type: "organizations",
      entity_id: session.organizationId,
      change_summary: {
        event: "logo_uploaded",
        path,
        bytes: file.size,
        timestamp: new Date().toISOString(),
      },
    });

    return NextResponse.json({ success: true, logoUrl: publicUrl });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/** Limits the client can read, so the picker and the copy stay in step. */
export async function GET() {
  return NextResponse.json({ success: true, maxBytes: MAX_LOGO_BYTES });
}
