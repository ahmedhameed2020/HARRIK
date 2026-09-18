import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedSession } from "@/lib/supabase/auth-helpers";
import { sendWebPushNotification } from "@/lib/push/vapid";

export async function POST(request: NextRequest) {
  try {
    const { session, error: authError, status: authStatus } = await getAuthenticatedSession();
    if (authError || !session) {
      return NextResponse.json({ success: false, error: authError }, { status: authStatus });
    }

    // Role Guard: Only administrative and security personnel can broadcast direct push notifications
    if (session.role !== "admin" && session.role !== "super_admin" && session.role !== "security") {
      return NextResponse.json(
        { success: false, error: "غير مصرح لك بإرسال إشعارات مباشرة للمستخدمين" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { recipientProfileId, title, body: contentBody, url = "/inbox", tag = "harrik-alert" } = body;

    if (!recipientProfileId) {
      return NextResponse.json(
        { success: false, error: "recipientProfileId is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Fetch active subscriptions for recipient in this organization
    const { data: subscriptions, error } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("profile_id", recipientProfileId)
      .eq("organization_id", session.organizationId);

    if (error || !subscriptions || subscriptions.length === 0) {
      return NextResponse.json({
        success: true,
        sentCount: 0,
        message: "No active push subscriptions found for this user",
      });
    }

    let sentCount = 0;
    let failedCount = 0;
    const expiredEndpoints: string[] = [];

    const payload = {
      title: title || "تنبيه مواقف حَرِّك",
      body: contentBody || "لديك تنبيه جديد لتحريك سيارتك في المواقف",
      url,
      tag,
    };

    for (const sub of subscriptions) {
      try {
        await sendWebPushNotification(
          {
            endpoint: sub.endpoint,
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
          payload
        );
        sentCount++;
      } catch (err: any) {
        failedCount++;
        // 404 or 410 means subscription has expired or unsubscribed
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          expiredEndpoints.push(sub.endpoint);
        }
      }
    }

    // Clean up expired subscriptions
    if (expiredEndpoints.length > 0) {
      await supabase
        .from("push_subscriptions")
        .delete()
        .in("endpoint", expiredEndpoints);
    }

    return NextResponse.json({
      success: true,
      sentCount,
      failedCount,
      total: subscriptions.length,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
