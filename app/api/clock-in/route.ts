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
  const { data: activeSession, error: activeError } = await supabaseAdmin
    .from("work_sessions")
    .select("*")
    .eq("user_email", session.user.email)
    .is("clock_out_time", null)
    .limit(1)
    .maybeSingle();

    console.log("Error checking active session:", activeSession);
  if (activeError) {
    return NextResponse.json({ error: activeError.message }, { status: 500 });
  }

  if (activeSession) {
    return NextResponse.json({ error: "A session is already active." }, { status: 400 });
  }

  const { data: workSession, error } = await supabaseAdmin
    .from("work_sessions")
    .insert({
      user_email: session.user.email,
      clock_in_time: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error || !workSession) {
    return NextResponse.json({ error: error?.message ?? "Unable to create session." }, { status: 500 });
  }

  return NextResponse.json(workSession);
}
