import { NextResponse } from "next/server";
import { getAuthenticatedSession } from "@/lib/supabase/auth-helpers";

export async function GET() {
  const { session, error, status } = await getAuthenticatedSession();

  if (error || !session) {
    return NextResponse.json({ success: false, error }, { status });
  }

  return NextResponse.json({
    success: true,
    user: {
      id: session.user.id,
      email: session.user.email,
    },
    profile: session.profile,
    organizationId: session.organizationId,
    role: session.role,
  });
}
