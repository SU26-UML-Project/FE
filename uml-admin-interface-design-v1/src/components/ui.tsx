import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

/* ---------- Card ---------- */
export function Card({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={style}
      className={cn(
        "rounded-xl border border-slate-200 bg-white shadow-soft",
        className
      )}
    >
      {children}
    </div>
  );
}

export function SectionHead({
  title,
  desc,
  action,
}: {
  title: string;
  desc?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div>
        <h3 className="text-[14px] font-semibold text-slate-900">{title}</h3>
        {desc && <p className="mt-0.5 text-[13px] text-slate-500">{desc}</p>}
      </div>
      {action}
    </div>
  );
}

/* ---------- Badge ---------- */
type Tone = "brand" | "emerald" | "amber" | "rose" | "sky" | "slate" | "violet" | "pink";

const toneMap: Record<Tone, string> = {
  brand: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  rose: "bg-rose-50 text-rose-700 ring-rose-200",
  sky: "bg-sky-50 text-sky-700 ring-sky-200",
  slate: "bg-slate-100 text-slate-600 ring-slate-200",
  violet: "bg-violet-50 text-violet-700 ring-violet-200",
  pink: "bg-pink-50 text-pink-700 ring-pink-200",
};

export function Badge({
  children,
  tone = "slate",
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
        toneMap[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

/* ---------- Avatar ---------- */
export function Avatar({
  initials,
  color = "#6366f1",
  size = "h-9 w-9",
}: {
  initials: string;
  color?: string;
  size?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full text-white",
        size
      )}
      style={{ backgroundColor: color }}
    >
      <span className="text-[11.5px] font-semibold">{initials}</span>
    </span>
  );
}

/* ---------- AnythingLLM endpoint badge ---------- */
type Method = "GET" | "POST" | "PUT" | "DELETE";
const methodMap: Record<Method, string> = {
  GET: "text-emerald-700",
  POST: "text-sky-700",
  PUT: "text-amber-700",
  DELETE: "text-rose-700",
};

export function EndpointBadge({
  method,
  path,
  className,
}: {
  method: Method;
  path: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md bg-slate-50 px-2 py-1 font-mono text-[11px] ring-1 ring-inset ring-slate-200",
        className
      )}
    >
      <span className={cn("font-bold", methodMap[method])}>{method}</span>
      <span className="text-slate-500">{path}</span>
    </span>
  );
}

/* ---------- Segmented control ---------- */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string; icon?: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition",
            value === o.id
              ? "bg-slate-900 text-white"
              : "text-slate-500 hover:text-slate-900"
          )}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- Button ---------- */
export function Button({
  children,
  variant = "primary",
  className,
  onClick,
  type = "button",
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
  onClick?: () => void;
  type?: "button" | "submit";
}) {
  const variants = {
    primary: "bg-slate-900 text-white hover:bg-slate-700",
    secondary: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
    ghost: "text-slate-500 hover:bg-slate-100 hover:text-slate-900",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-medium transition",
        variants[variant],
        className
      )}
    >
      {children}
    </button>
  );
}
