import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient, User } from "@supabase/supabase-js";

let supabaseAdmin: SupabaseClient | null = null;

export function getSupabaseAdmin() {
  if (supabaseAdmin) {
    return supabaseAdmin;
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.");
  }

  supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
    },
  });

  return supabaseAdmin;
}

export async function ensureAuthUserExists(user: User) {
  const supabaseAdmin = getSupabaseAdmin();
  const email = user.email ?? "";
  const name = (user.user_metadata?.full_name as string) || email.split("@")[0];

  const { data, error } = await supabaseAdmin
    .from("users")
    .upsert({ id: user.id, email, name }, { onConflict: "id" })
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  return data;
}
