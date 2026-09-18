import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedSession } from "@/lib/supabase/auth-helpers";
import { VAPID_PUBLIC_KEY } from "@/lib/push/vapid";

export async function GET(request: NextRequest) {
  try {
    const { session, error: authError, status: authStatus } = await getAuthenticatedSession();
    if (authError || !session) {
      return NextResponse.json({ success: false, error: authError }, { status: authStatus });
    }

    const supabase = await createClient();
    const { data: subscriptions } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, created_at, user_agent")
      .eq("profile_id", session.profile.id);

    return NextResponse.json({
      success: true,
      publicKey: VAPID_PUBLIC_KEY,
      isSubscribed: Boolean(subscriptions && subscriptions.length > 0),
      count: subscriptions?.length || 0,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { session, error: authError, status: authStatus } = await getAuthenticatedSession();
    if (authError || !session) {
      return NextResponse.json({ success: false, error: authError }, { status: authStatus });
    }

    const body = await request.json();
    const { subscription, userAgent } = body;

    if (!subscription || !subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
      return NextResponse.json(
        { success: false, error: "Invalid push subscription object" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Upsert subscription
    const { data, error } = await supabase
      .from("push_subscriptions")
      .upsert(
        {
          organization_id: session.organizationId,
          profile_id: session.profile.id,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          user_agent: userAgent || request.headers.get("user-agent") || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "endpoint" }
      )
      .select("id, endpoint, created_at")
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "تم تفعيل إشعارات شاشة القفل بنجاح",
      subscription: data,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { session, error: authError, status: authStatus } = await getAuthenticatedSession();
    if (authError || !session) {
      return NextResponse.json({ success: false, error: authError }, { status: authStatus });
    }

    const body = await request.json();
    const { endpoint } = body;

    if (!endpoint) {
      return NextResponse.json({ success: false, error: "endpoint is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from("push_subscriptions")
      .delete()
      .eq("endpoint", endpoint)
      .eq("profile_id", session.profile.id);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "تم إلغاء الاشتراك في إشعارات الخلفية",
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
