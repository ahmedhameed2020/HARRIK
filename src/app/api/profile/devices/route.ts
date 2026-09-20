import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedSession } from "@/lib/supabase/auth-helpers";

/**
 * /api/profile/devices — device & session management for the signed-in member.
 *
 *  GET    → list the devices registered for push notifications on this account
 *  DELETE → remove one device (stops notifications to it)
 *  POST   → { action: "signout_others" } ends the session on every OTHER device
 *
 * The device list is derived from `push_subscriptions` (RLS: own rows only).
 */

function describeDevice(sub: any) {
  let host = "Push service";
  try {
    host = new URL(sub.endpoint).hostname;
  } catch {
    // keep default label
  }
  return {
    id: sub.id,
    host,
    userAgent: sub.user_agent || null,
    createdAt: sub.created_at || null,
    updatedAt: sub.updated_at || null,
  };
}

export async function GET() {
  try {
    const { session, error, status } = await getAuthenticatedSession();
    if (error || !session) {
      return NextResponse.json({ success: false, error }, { status });
    }

    const supabase = await createClient();
    const { data, error: listError } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, user_agent, created_at, updated_at")
      .eq("profile_id", session.profile.id)
      .order("created_at", { ascending: false });

    if (listError) {
      return NextResponse.json({ success: false, error: listError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      devices: (data || []).map(describeDevice),
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { session, error, status } = await getAuthenticatedSession();
    if (error || !session) {
      return NextResponse.json({ success: false, error }, { status });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, error: "Device id is required" }, { status: 400 });
    }

    const supabase = await createClient();
    // RLS restricts deletion to the caller's own subscriptions; the explicit
    // profile_id filter documents and enforces that intent.
    const { error: delError } = await supabase
      .from("push_subscriptions")
      .delete()
      .eq("id", id)
      .eq("profile_id", session.profile.id);

    if (delError) {
      return NextResponse.json({ success: false, error: delError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "تم إنهاء الجلسة على هذا الجهاز" });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { session, error, status } = await getAuthenticatedSession();
    if (error || !session) {
      return NextResponse.json({ success: false, error }, { status });
    }

    const body = await request.json().catch(() => ({}));
    const action = body?.action;

    if (action !== "signout_others") {
      return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
    }

    // Needs the caller's own access token: GoTrue admin signOut(jwt, scope).
    const supabase = await createClient();
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;

    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: "تعذّر قراءة الجلسة الحالية. يرجى إعادة تسجيل الدخول." },
        { status: 401 }
      );
    }

    const admin = createAdminClient();
    const { error: signOutError } = await admin.auth.admin.signOut(accessToken, "others");

    if (signOutError) {
      return NextResponse.json({ success: false, error: signOutError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "تم إنهاء الجلسات على كافة الأجهزة الأخرى",
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
