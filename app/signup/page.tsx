"use client";

import { motion } from "framer-motion";
import { Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignUpPage() {
  const router = useRouter();

  const handleSignUpRedirect = () => {
    // Redirect to signin - Google will auto-create account on first login
    router.push("/signin?message=New%20users%20are%20created%20automatically%20on%20first%20sign-in");
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/80 p-10 shadow-2xl shadow-slate-950/40 backdrop-blur-xl"
      >
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-3xl bg-slate-800 text-sky-300 shadow-lg shadow-sky-300/10">
            <Mail className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">Get started with Time Tracker</h1>
          <p className="mt-3 text-sm text-slate-400">
            Your account will be created automatically when you sign in with Google for the first time.
          </p>
        </div>

        <button
          onClick={handleSignUpRedirect}
          className="inline-flex w-full items-center justify-center gap-3 rounded-3xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
        >
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Sign up with Google
        </button>

        <div className="mt-6 grid gap-3">
          <div className="rounded-3xl border border-slate-700/70 bg-slate-900/80 p-4 text-center">
            <p className="text-sm text-slate-400">Already have an account?</p>
            <Link
              href="/signin"
              className="mt-4 inline-flex w-full items-center justify-center rounded-3xl bg-slate-800 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:bg-slate-700"
            >
              Sign in
            </Link>
          </div>
        </div>
      </motion.div>
    </main>
  );
}
