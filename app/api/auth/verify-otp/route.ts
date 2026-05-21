import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { otpStore } from "../otp-store";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase credentials");
}

const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json();

    if (!email || !code) {
      return NextResponse.json(
        { error: "Email and code are required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase();
    const now = Date.now();

    // Verify OTP
    const storedOTP = otpStore.get(normalizedEmail);

    if (!storedOTP) {
      return NextResponse.json(
        { error: "No OTP found for this email. Please request a new one." },
        { status: 400 }
      );
    }

    if (storedOTP.expiresAt < now) {
      otpStore.delete(normalizedEmail);
      return NextResponse.json(
        { error: "OTP has expired. Please request a new one." },
        { status: 400 }
      );
    }

    if (storedOTP.code !== code.trim()) {
      return NextResponse.json(
        { error: "Invalid OTP code. Please try again." },
        { status: 400 }
      );
    }

    // OTP is valid, delete it
    otpStore.delete(normalizedEmail);

    // Now handle Supabase user creation/retrieval
    try {
      // Try to sign in or create the user
      const { data, error } = await supabase.auth.admin.createUser({
        email: normalizedEmail,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          created_at: new Date().toISOString(),
        },
      });

      if (error && !error.message.includes("already exists")) {
        console.error("Supabase user creation error:", error);
        return NextResponse.json(
          { error: "Failed to create user account" },
          { status: 500 }
        );
      }

      // If user already exists, that's fine. Get or create session
      // Get the user
      const { data: userData, error: getUserError } = await supabase.auth.admin.getUserById(
        data?.user?.id || (await getExistingUserId(normalizedEmail)) || ""
      );

      if (getUserError || !userData?.user) {
        return NextResponse.json(
          { error: "Failed to retrieve user" },
          { status: 500 }
        );
      }

      // Generate a session
      const { data: sessionData, error: sessionError } =
        await supabase.auth.admin.createSession({
          user_email: userData.user.email,
          expires_in: 3600, // 1 hour
        });

      if (sessionError || !sessionData?.session) {
        console.error("Session creation error:", sessionError);
        return NextResponse.json(
          { error: "Failed to create session" },
          { status: 500 }
        );
      }

      console.log(`User ${normalizedEmail} verified and logged in`);

      return NextResponse.json(
        {
          success: true,
          session: {
            access_token: sessionData.session.access_token,
            refresh_token: sessionData.session.refresh_token,
            expires_in: sessionData.session.expires_in,
            user_id: userData.user.id,
          },
        },
        { status: 200 }
      );
    } catch (supabaseError) {
      console.error("Supabase error:", supabaseError);
      return NextResponse.json(
        { error: "Authentication failed" },
        { status: 500 }
      );
    }
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function getExistingUserId(email: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.auth.admin.listUsers();
    if (error) return null;
    
    const user = data?.users?.find((u) => u.email === email);
    return user?.id || null;
  } catch {
    return null;
  }
}
