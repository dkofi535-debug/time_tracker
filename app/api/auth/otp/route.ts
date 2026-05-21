import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase credentials");
}

const supabase = createClient(supabaseUrl, supabaseKey);

// In-memory store for rate limiting (email -> timestamp)
const otpAttempts = new Map<string, number>();
const OTP_RATE_LIMIT = 120000; // 2 minutes between attempts per email
const SUPABASE_COOLDOWN = 600000; // 10 minutes after Supabase returns 429

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase();
    const lastAttemptTime = otpAttempts.get(normalizedEmail);
    const now = Date.now();

    // Check if rate limit exceeded
    if (lastAttemptTime && now - lastAttemptTime < OTP_RATE_LIMIT) {
      const secondsRemaining = Math.ceil((OTP_RATE_LIMIT - (now - lastAttemptTime)) / 1000);
      console.log(`Rate limit for ${normalizedEmail}: ${secondsRemaining}s remaining`);
      return NextResponse.json(
        { 
          error: `Please wait ${secondsRemaining} seconds before requesting another OTP`,
          retryAfter: secondsRemaining
        },
        { status: 429 }
      );
    }

    console.log(`Attempting to send OTP to ${normalizedEmail}`);

    const { error, data } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard`,
      },
    });

    if (error) {
      console.error("Supabase OTP error:", {
        status: error.status,
        message: error.message,
        code: error.code,
      });
      
      if (error.status === 429) {
        console.log("Supabase returned 429, setting rate limit to 10 minutes");
        otpAttempts.set(normalizedEmail, now + SUPABASE_COOLDOWN);
        return NextResponse.json(
          { error: "Supabase is rate limiting. Please wait 10 minutes before trying again. Try a different email if available." },
          { status: 429 }
        );
      }

      return NextResponse.json(
        { error: error.message || "Failed to send OTP" },
        { status: error.status || 400 }
      );
    }

    // Update the attempt time only on success
    otpAttempts.set(normalizedEmail, now);
    console.log(`OTP sent successfully to ${normalizedEmail}`);

    return NextResponse.json(
      { success: true, message: "OTP sent to email" },
      { status: 200 }
    );
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json(
      { error: "Internal server error: " + String(err) },
      { status: 500 }
    );
  }
}
