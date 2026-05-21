import nodemailer from "nodemailer";
import { NextRequest, NextResponse } from "next/server";
import { otpStore } from "../otp-store";

const otpAttempts = new Map<string, number>(); // For rate limiting
const OTP_RATE_LIMIT = 60000; // 60 seconds between OTP requests
const OTP_EXPIRATION = 600000; // 10 minutes

const smtpHost = process.env.SMTP_HOST;
const smtpPort = parseInt(process.env.SMTP_PORT || "587", 10);
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const smtpFrom = process.env.SMTP_FROM;
const smtpSecure =
  process.env.SMTP_SECURE?.toLowerCase() === "true" || process.env.SMTP_PORT === "465";

const missingSmtpVars = [
  ["SMTP_HOST", smtpHost],
  ["SMTP_USER", smtpUser],
  ["SMTP_PASS", smtpPass],
  ["SMTP_FROM", smtpFrom],
].filter(([, value]) => !value).map(([name]) => name);

const hasSmtpConfig = missingSmtpVars.length === 0;
let smtpTransporter = hasSmtpConfig
  ? nodemailer.createTransport({
      host: smtpHost,
      port: Number.isNaN(smtpPort) ? 587 : smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    })
  : null;

async function createDevTransporter() {
  const testAccount = await nodemailer.createTestAccount();
  const fallback = nodemailer.createTransport({
    host: testAccount.smtp.host,
    port: testAccount.smtp.port,
    secure: testAccount.smtp.secure,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });

  console.log(
    `Using Ethereal SMTP test account for OTP email in development: ${testAccount.user}`
  );
  return fallback;
}

async function getTransporter() {
  if (smtpTransporter) {
    return smtpTransporter;
  }

  if (process.env.NODE_ENV !== "production") {
    smtpTransporter = await createDevTransporter();
    return smtpTransporter;
  }

  return null;
}

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

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
    const now = Date.now();

    // Check rate limit
    const lastAttemptTime = otpAttempts.get(normalizedEmail);
    if (lastAttemptTime && now - lastAttemptTime < OTP_RATE_LIMIT) {
      const secondsRemaining = Math.ceil((OTP_RATE_LIMIT - (now - lastAttemptTime)) / 1000);
      console.log(`Rate limit for ${normalizedEmail}: ${secondsRemaining}s remaining`);
      return NextResponse.json(
        {
          error: `Please wait ${secondsRemaining} seconds before requesting another OTP`,
          retryAfter: secondsRemaining,
        },
        { status: 429 }
      );
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = now + OTP_EXPIRATION;

    console.log(`Generated OTP for ${normalizedEmail}: ${otp}`);

    const transporter = await getTransporter();
    if (!transporter) {
      console.error(
        `OTP email sending disabled: missing SMTP vars: ${missingSmtpVars.join(", ")}`
      );
      return NextResponse.json(
        {
          error: `OTP email sending is not configured. Missing: ${missingSmtpVars.join(", ")}`,
        },
        { status: 500 }
      );
    }

    // Send email first, then persist OTP only on success
    try {
      const info = await transporter.sendMail({
        from: smtpFrom || smtpUser || "no-reply@example.com",
        to: normalizedEmail,
        subject: "Your Time Tracker Login Code",
        html: `
          <h2>Login Code</h2>
          <p>Your login code is:</p>
          <h1 style="font-size: 32px; letter-spacing: 2px; font-weight: bold;">${otp}</h1>
          <p>This code will expire in 10 minutes.</p>
          <p>If you didn't request this code, please ignore this email.</p>
        `,
      });

      if (process.env.NODE_ENV !== "production") {
        const previewUrl = nodemailer.getTestMessageUrl(info);
        if (previewUrl) {
          console.log(`OTP email preview URL: ${previewUrl}`);
        }
      }

      otpStore.set(normalizedEmail, { code: otp, expiresAt });
      otpAttempts.set(normalizedEmail, now);

      console.log(`OTP email sent to ${normalizedEmail}`);

      return NextResponse.json(
        { success: true, message: "OTP sent to email" },
        { status: 200 }
      );
    } catch (emailError) {
      console.error("Email sending error:", emailError);
      if (process.env.NODE_ENV !== "production") {
        try {
          smtpTransporter = await createDevTransporter();
          const info = await smtpTransporter.sendMail({
            from: smtpFrom || smtpUser || "no-reply@example.com",
            to: normalizedEmail,
            subject: "Your Time Tracker Login Code",
            html: `
              <h2>Login Code</h2>
              <p>Your login code is:</p>
              <h1 style="font-size: 32px; letter-spacing: 2px; font-weight: bold;">${otp}</h1>
              <p>This code will expire in 10 minutes.</p>
              <p>If you didn't request this code, please ignore this email.</p>
            `,
          });
          const previewUrl = nodemailer.getTestMessageUrl(info);
          if (previewUrl) {
            console.log(`Fallback OTP email preview URL: ${previewUrl}`);
          }

          otpStore.set(normalizedEmail, { code: otp, expiresAt });
          otpAttempts.set(normalizedEmail, now);

          return NextResponse.json(
            {
              success: true,
              message:
                "OTP sent via development fallback email transport. Check server logs for preview URL.",
            },
            { status: 200 }
          );
        } catch (fallbackError) {
          console.error("Fallback email transport error:", fallbackError);
        }
      }

      return NextResponse.json(
        {
          error:
            "Failed to send email. Please verify your SMTP credentials and settings.",
        },
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

// Cleanup expired OTPs every 5 minutes
setInterval(() => {
  const now = Date.now();
  otpStore.forEach((data, email) => {
    if (data.expiresAt < now) {
      otpStore.delete(email);
      console.log(`Cleaned up expired OTP for ${email}`);
    }
  });
}, 300000);
