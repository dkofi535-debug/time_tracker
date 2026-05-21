import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseAdmin = getSupabaseAdmin();
  const body = await req.json().catch(() => ({}));
  const sessionId = typeof body.sessionId === "string" ? body.sessionId : undefined;

  const { data: activeSession, error: fetchError } = sessionId
    ? await supabaseAdmin
        .from("work_sessions")
        .select("*")
        .eq("id", sessionId)
        .eq("user_email", session.user.email)
        .single()
    : await supabaseAdmin
        .from("work_sessions")
        .select("*")
        .eq("user_email", session.user.email)
        .is("clock_out_time", null)
        .limit(1)
        .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!activeSession || activeSession.clock_out_time) {
    return NextResponse.json({ error: "No active session found." }, { status: 404 });
  }

  const clockOutTime = new Date().toISOString();
  const totalHours = Number(
    ((new Date(clockOutTime).getTime() - new Date(activeSession.clock_in_time).getTime()) / 36e5).toFixed(2)
  );

  const { data: updatedSession, error } = await supabaseAdmin
    .from("work_sessions")
    .update({ clock_out_time: clockOutTime, total_hours: totalHours })
    .eq("id", activeSession.id)
    .select("*")
    .single();

  if (error || !updatedSession) {
    return NextResponse.json({ error: error?.message ?? "Unable to update session." }, { status: 500 });
  }

  return NextResponse.json(updatedSession);
}
