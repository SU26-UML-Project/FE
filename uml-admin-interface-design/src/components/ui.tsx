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
        "rounded-3xl border border-white/60 bg-surface shadow-soft",
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
        <h3 className="text-[15px] font-bold text-ink">{title}</h3>
        {desc && <p className="mt-0.5 text-[13px] text-gray-500">{desc}</p>}
      </div>
      {action}
    </div>
  );
}

/* ---------- Page header ---------- */
export function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-[13px] font-medium text-gray-500">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

/* ---------- Badge ---------- */
type Tone = "brand" | "emerald" | "amber" | "rose" | "sky" | "slate" | "violet" | "pink";

const toneMap: Record<Tone, string> = {
  brand: "bg-gold/20 text-[#8a5e08]",
  emerald: "bg-emerald-100/90 text-emerald-700",
  amber: "bg-amber-100/90 text-amber-700",
  rose: "bg-rose-100/90 text-rose-700",
  sky: "bg-sky-100/90 text-sky-700",
  slate: "bg-white/70 text-gray-600",
  violet: "bg-violet-100/90 text-violet-700",
  pink: "bg-pink-100/90 text-pink-700",
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
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ring-black/5",
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
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ring-2 ring-white",
        size
      )}
      style={{ backgroundColor: color }}
    >
      <span className="text-[11.5px]">{initials}</span>
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
        "inline-flex items-center gap-1.5 rounded-lg bg-white/70 px-2 py-1 font-mono text-[11px] ring-1 ring-inset ring-black/5",
        className
      )}
    >
      <span className={cn("font-bold", methodMap[method])}>{method}</span>
      <span className="text-gray-500">{path}</span>
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
    <div className="inline-flex rounded-full border border-white/60 bg-surface p-1 shadow-soft">
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium transition",
            value === o.id
              ? "bg-white text-ink shadow-sm"
              : "text-gray-500 hover:text-ink"
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
    primary: "bg-gold text-white shadow-soft hover:bg-golddk",
    secondary: "bg-white/80 text-ink ring-1 ring-inset ring-black/5 hover:bg-white",
    ghost: "text-gray-600 hover:bg-white/60",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-semibold transition",
        variants[variant],
        className
      )}
    >
      {children}
    </button>
  );
}

/* ---------- Input ---------- */
export const inputCls =
  "w-full rounded-xl border border-black/5 bg-white/70 px-3 py-2 text-[13px] text-ink outline-none transition focus:border-gold focus:bg-white focus:ring-4 focus:ring-gold/15";
