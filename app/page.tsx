"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ClockApp } from "@/components/dashboard/clock-app";
import { WorkSession } from "@/types/work-session";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [sessions, setSessions] = useState<WorkSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/signin");
    }
  }, [status, router]);

  // Redirect if accessing /dashboard
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.pathname === "/dashboard") {
      router.push("/");
    }
  }, [router]);

  useEffect(() => {
    if (session?.user?.id) {
      fetchSessions();
    }
  }, [session]);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/sessions");

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data?.error || "Unable to load sessions.");
        return;
      }

      const data = await response.json();
      setSessions(data);
    } catch (err) {
      setError("Failed to load sessions");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const userName = session?.user?.name || session?.user?.email || "Team Member";
  const userImage = session?.user?.image;

  if (status === "loading") {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-10 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-3xl rounded-[2rem] border border-white/10 bg-slate-900/80 p-10 text-center shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
          <p className="text-lg text-slate-300">Loading…</p>
        </div>
      </main>
    );
  }

  if (status === "unauthenticated") {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100 sm:px-10">
        <div className="mx-auto flex max-w-3xl flex-col items-center justify-center rounded-[2rem] border border-white/10 bg-slate-900/80 p-10 text-center shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
          <h1 className="text-4xl font-semibold tracking-tight text-white">
            Sign in to access Time Tracker
          </h1>
          <p className="mt-4 max-w-xl text-slate-400">
            Use your Google account to securely access your clock-in dashboard.
          </p>
          <div className="mt-8 flex w-full flex-col gap-4 sm:flex-row">
            <Link
              href="/signin"
              className="inline-flex items-center justify-center rounded-3xl bg-sky-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
            >
              Sign in
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-[1600px]">
        <div className="mb-6 flex items-center justify-between rounded-[2rem] border border-white/10 bg-slate-900/80 p-4 shadow-2xl shadow-slate-950/40 backdrop-blur-xl sm:p-6">
          <div className="flex items-center gap-4">
            {userImage && (
              <img
                src={userImage}
                alt={userName}
                className="h-10 w-10 rounded-full"
              />
            )}
            <div>
              <p className="text-sm text-slate-400">Welcome back</p>
              <p className="text-lg font-semibold text-slate-100">{userName}</p>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/signin" })}
            className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-600"
          >
            Sign out
          </button>
        </div>

        <ClockApp initialSessions={sessions} userName={userName} />
      </div>
    </main>
  );
}
