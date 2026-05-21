import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.toLowerCase().trim() : "";

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
    }

    const name = email.split("@")[0];
    const supabaseAdmin = getSupabaseAdmin();

    const { data, error } = await supabaseAdmin
      .from("users")
      .upsert({ email, name }, { onConflict: "email" })
      .select("id, email, name")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? "Unable to register user." }, { status: 500 });
    }

    return NextResponse.json({ user: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown server error" }, { status: 500 });
  }
}
