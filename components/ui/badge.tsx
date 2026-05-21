import * as React from "react";
import { clsx } from "clsx";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "success" | "warning" | "neutral";
}

export function Badge({ className, variant = "neutral", ...props }: BadgeProps) {
  return (
    <div
      className={clsx(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]",
        variant === "success" && "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-300/10",
        variant === "warning" && "bg-amber-500/15 text-amber-300 ring-1 ring-amber-300/10",
        variant === "neutral" && "bg-slate-500/15 text-slate-200 ring-1 ring-slate-500/15",
        className
      )}
      {...props}
    />
  );
}
