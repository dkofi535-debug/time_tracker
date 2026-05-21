import * as React from "react";
import { clsx } from "clsx";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", ...props }, ref) => (
    <button
      ref={ref}
      className={clsx(
        "inline-flex items-center justify-center rounded-3xl px-5 py-3 text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-sky-400/30 disabled:cursor-not-allowed disabled:opacity-60",
        variant === "primary" && "bg-sky-500 text-slate-950 hover:bg-sky-400",
        variant === "secondary" && "border border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800",
        variant === "ghost" && "bg-transparent text-slate-200 hover:bg-slate-800/60",
        className
      )}
      {...props}
    />
  )
);
Button.displayName = "Button";
