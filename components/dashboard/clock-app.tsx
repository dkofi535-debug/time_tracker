"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, Clock3, FileText, Moon, Sun, Timer, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/hooks/useTheme";
import { WorkSession } from "@/types/work-session";

interface ClockAppProps {
  initialSessions: WorkSession[];
  userName: string;
}

function toDate(value: string | null): Date | null {
  return value ? new Date(value) : null;
}

function toISOString(value: string | Date | null): string | null {
  if (!value) return null;
  // If already an ISO string, return as-is
  if (typeof value === "string") {
    return value;
  }
  // If it's a Date, convert to ISO string
  return (value as Date).toISOString();
}

function formatClock(date: Date | null) {
  if (!date) return "—";
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

function formatDuration(milliseconds: number) {
  const hours = Math.floor(milliseconds / 3600000);
  const minutes = Math.floor((milliseconds % 3600000) / 60000);
  const seconds = Math.floor((milliseconds % 60000) / 1000);

  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

function buildCsv(sessions: WorkSession[]) {
  const headers = ["Date", "Clock In", "Clock Out", "Total Hours"];
  const rows = sessions.map((session) => [
    new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(session.clockInTime)),
    formatClock(new Date(session.clockInTime)),
    session.clockOutTime ? formatClock(new Date(session.clockOutTime)) : "In progress",
    session.totalHours ? session.totalHours.toFixed(2) : "-",
  ]);

  return [headers, ...rows].map((row) => row.join(",")).join("\n");
}

export function ClockApp({ initialSessions, userName }: ClockAppProps): import("react/jsx-runtime").JSX.Element {
  const { theme, toggleTheme } = useTheme();
  const [sessions, setSessions] = useState<WorkSession[]>(initialSessions);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const activeSession = useMemo(
    () => sessions.find((session) => !session.clockOutTime) ?? null,
    [sessions]
  );

  const statusLabel = activeSession ? "Currently Working" : "Not Working";
  const statusVariant = activeSession ? "success" : "warning";

  const liveDuration = activeSession
    ? formatDuration(now.getTime() - new Date(activeSession.clockInTime).getTime())
    : "00:00:00";

  const weeklySessions = useMemo(() => {
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - 6);

    return sessions
      .filter((session) => session.clockOutTime)
      .filter((session) => new Date(session.clockInTime) >= cutoff)
      .map((session) => ({
        date: new Date(session.clockInTime),
        hours: session.totalHours ?? 0,
      }));
  }, [sessions, now]);

  const weekStats = useMemo(() => {
    const totalHours = weeklySessions.reduce((sum, item) => sum + item.hours, 0);
    const averageHours = weeklySessions.length ? totalHours / weeklySessions.length : 0;
    return {
      totalSessions: weeklySessions.length,
      totalHours,
      averageHours,
    };
  }, [weeklySessions]);

  const chartDays = useMemo(() => {
    const days = Array.from({ length: 7 }).map((_, index) => {
      const date = new Date(now);
      date.setDate(date.getDate() - (6 - index));
      const label = new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(date);
      const hours = weeklySessions
        .filter((item) => item.date.toDateString() === date.toDateString())
        .reduce((sum, item) => sum + item.hours, 0);
      return { label, hours };
    });

    const maxHours = Math.max(...days.map((day) => day.hours), 1);
    return days.map((day) => ({ ...day, ratio: day.hours / maxHours }));
  }, [weeklySessions, now]);

  const handleSignOut = async () => {
    const supabase = getBrowserSupabase();
    await supabase.auth.signOut();
    window.location.href = "/signin";
  };



  const handleExport = () => {
    const csv = buildCsv(sessions);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "work-sessions.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8 pb-16">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-sky-400/80">Time Tracker</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-50 md:text-5xl">
            Welcome back, {userName}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">
            Track your sessions, review weekly progress, and export accurate time records with live analytics.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <Button variant="secondary" onClick={toggleTheme}>
            {theme === "dark" ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
            {theme === "dark" ? "Light Mode" : "Dark Mode"}
          </Button>
          <Button variant="secondary" onClick={handleSignOut}>
            <ArrowUpRight className="mr-2 h-4 w-4" />
            Sign out
          </Button>
          <Button variant="ghost" onClick={handleExport}>
            <FileText className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_38%),radial-gradient(circle_at_bottom_right,_rgba(168,85,247,0.14),_transparent_32%)]" />
          <div className="relative grid gap-6 lg:grid-cols-[1fr_0.9fr] lg:gap-8">
            <div className="space-y-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Live clock</p>
                  <p className="mt-3 text-5xl font-semibold text-slate-50">
                    {new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true }).format(now)}
                  </p>
                  <p className="mt-2 text-sm text-slate-400">
                    {new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" }).format(now)}
                  </p>
                </div>
                <Badge variant={statusVariant}>{statusLabel}</Badge>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl bg-slate-900/70 p-5">
                  <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Live duration</p>
                  <p className="mt-4 text-4xl font-semibold text-slate-50">{liveDuration}</p>
                  <p className="mt-2 text-sm text-slate-500">Auto-updating while clocked in.</p>
                </div>
                <div className="rounded-3xl bg-slate-900/70 p-5">
                  <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Today's streak</p>
                  <p className="mt-4 text-4xl font-semibold text-slate-50">
                    {sessions.filter((session) => new Date(session.clockInTime).toDateString() === new Date().toDateString()).length}
                  </p>
                  <p className="mt-2 text-sm text-slate-500">Sessions completed today.</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4 rounded-3xl border border-slate-700/60 bg-slate-950/80 p-6 shadow-lg shadow-slate-950/10">
              <div className="flex items-center gap-3 text-slate-300">
                <Timer className="h-5 w-5 text-sky-400" />
                <p className="text-sm font-medium">Quick actions</p>
              </div>
              <div className="flex flex-col gap-4 sm:flex-row">
                <Button
                  className="flex-1"
                  onClick={async () => {
                    setIsLoading(true);
                    setError(null);

                    try {
                      const response = await fetch("/api/clock-in", {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                        },
                      });

                      const data = await response.json();
                      if (!response.ok) {
                        throw new Error(data?.error || "Could not clock in.");
                      }

                      setSessions((prev) => [
                        {
                          ...data,
                          clockInTime: toISOString(data.clock_in_time),
                          clockOutTime: null,
                          totalHours: null,
                          createdAt: toISOString(data.created_at),
                        },
                        ...prev,
                      ]);
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "Server error");
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                  disabled={Boolean(activeSession) || isLoading}
                >
                  <ArrowUpRight className="mr-2 h-4 w-4" />
                  Clock In
                </Button>
                <Button
                  className="flex-1"
                  variant="secondary"
                  onClick={async () => {
                    setIsLoading(true);
                    setError(null);

                    try {
                      const response = await fetch("/api/clock-out", {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                        },
                        body: JSON.stringify({ sessionId: activeSession?.id }),
                      });

                      const data = await response.json();
                      if (!response.ok) {
                        throw new Error(data?.error || "Could not clock out.");
                      }

                      setSessions((prev) => prev.map((session) => session.id === data.id
                        ? {
                          ...session,
                          clockOutTime: data.clock_out_time,
                          totalHours: data.total_hours,
                        }
                        : session
                      ));
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "Server error");
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                  disabled={!activeSession || isLoading}
                >
                  <ArrowDownRight className="mr-2 h-4 w-4" />
                  Clock Out
                </Button>
              </div>
              <p className="text-sm leading-6 text-slate-400">
                Clock in to start tracking. Clock out when your session is complete to finalize the total.
              </p>
              {error ? (
                <div className="rounded-3xl bg-red-500/10 p-4 text-sm text-red-200 ring-1 ring-red-500/20">
                  {error}
                </div>
              ) : null}
            </div>
          </div>
        </Card>

        <div className="grid gap-6">
          <Card className="grid gap-4 p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Weekly summary</p>
                <h2 className="mt-3 text-2xl font-semibold text-slate-50">Hours this week</h2>
              </div>
              <div className="rounded-3xl bg-slate-900/80 px-4 py-2 text-sm text-slate-300">
                {new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(now))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-3xl bg-slate-900/80 p-4 text-slate-200">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Total hours</p>
                <p className="mt-3 text-3xl font-semibold text-slate-50">{weekStats.totalHours.toFixed(1)}</p>
              </div>
              <div className="rounded-3xl bg-slate-900/80 p-4 text-slate-200">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Sessions</p>
                <p className="mt-3 text-3xl font-semibold text-slate-50">{weekStats.totalSessions}</p>
              </div>
              <div className="rounded-3xl bg-slate-900/80 p-4 text-slate-200">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Avg / day</p>
                <p className="mt-3 text-3xl font-semibold text-slate-50">{weekStats.averageHours.toFixed(2)}</p>
              </div>
            </div>

            <div className="mt-4 rounded-3xl bg-slate-900/80 p-4">
              <div className="flex items-center justify-between gap-4 pb-4">
                <p className="text-sm font-medium text-slate-200">Weekly chart</p>
                <Zap className="h-4 w-4 text-sky-400" />
              </div>
              <div className="space-y-3">
                {chartDays.map((day) => (
                  <div key={day.label} className="space-y-2">
                    <div className="flex items-center justify-between text-[0.78rem] text-slate-400">
                      <span>{day.label}</span>
                      <span>{day.hours.toFixed(1)}h</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full bg-sky-500 transition-all duration-300"
                        style={{ width: `${Math.max(day.ratio * 100, 6)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card className="rounded-3xl p-6">
            <div className="flex items-center justify-between gap-4 pb-4">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Insights</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-50">Productivity at a glance</h2>
              </div>
            </div>
            <div className="grid gap-4">
              <div className="rounded-3xl border border-slate-700/50 bg-slate-900/80 p-4">
                <p className="text-sm text-slate-400">Longest session</p>
                <p className="mt-3 text-3xl font-semibold text-slate-50">
                  {sessions
                    .filter((session) => session.totalHours)
                    .reduce((max, session) => Math.max(max, session.totalHours ?? 0), 0)
                    .toFixed(2)}
                  h
                </p>
              </div>
              <div className="rounded-3xl border border-slate-700/50 bg-slate-900/80 p-4">
                <p className="text-sm text-slate-400">Recent session</p>
                <p className="mt-3 text-3xl font-semibold text-slate-50">
                  {activeSession ? "Active now" : sessions.length ? formatClock(new Date(sessions[0].clockInTime)) : "No sessions"}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-white/10 bg-slate-950/90 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Session history</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-50">Recent work sessions</h2>
          </div>
          <p className="text-sm text-slate-400">Keep track of every clock in and clock out record.</p>
        </div>

        {sessions.length === 0 ? (
          <div className="p-10 text-center text-slate-400">
            <p className="text-lg font-semibold text-slate-100">No sessions yet</p>
            <p className="mt-2 text-sm">Use the Clock In button to start tracking your first work session.</p>
          </div>
        ) : (
          <div className="overflow-x-auto p-6">
            <table className="w-full border-separate border-spacing-y-3 text-left text-sm">
              <thead>
                <tr className="text-slate-400">
                  <th className="pb-3 pr-6">Date</th>
                  <th className="pb-3 pr-6">Clock In</th>
                  <th className="pb-3 pr-6">Clock Out</th>
                  <th className="pb-3 pr-6">Total Hours</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <motion.tr
                    key={session.id}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className="group"
                  >
                    <td className="rounded-3xl bg-slate-900/80 px-4 py-4 text-slate-200">
                      {new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(session.clockInTime))}
                    </td>
                    <td className="rounded-3xl bg-slate-900/80 px-4 py-4 text-slate-200">
                      {formatClock(new Date(session.clockInTime))}
                    </td>
                    <td className="rounded-3xl bg-slate-900/80 px-4 py-4 text-slate-200">
                      {session.clockOutTime ? formatClock(new Date(session.clockOutTime)) : "In progress"}
                    </td>
                    <td className="rounded-3xl bg-slate-900/80 px-4 py-4 text-slate-200">
                      {session.totalHours ? `${session.totalHours.toFixed(2)} h` : "—"}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-6">
          <div className="flex items-center gap-3 text-slate-300">
            <Clock3 className="h-4 w-4 text-sky-400" />
            <span className="text-sm font-medium">Fast actions</span>
          </div>
          <p className="mt-4 text-slate-400">Use the dashboard buttons to quickly clock in and out. The app saves timestamps in your secure session history.</p>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-3 text-slate-300">
            <ArrowUpRight className="h-4 w-4 text-emerald-400" />
            <span className="text-sm font-medium">Clock-in logic</span>
          </div>
          <p className="mt-4 text-slate-400">Clock in creates a new active session, disables the clock-in button, and starts the live timer immediately.</p>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-3 text-slate-300">
            <ArrowDownRight className="h-4 w-4 text-amber-400" />
            <span className="text-sm font-medium">Clock-out logic</span>
          </div>
          <p className="mt-4 text-slate-400">Clock out finalizes the session, stores the total hours, and keeps your full history available for export.</p>
        </Card>
      </div>
    </div>
  );
}
