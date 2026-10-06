import { useState, useRef } from "react";
import { useLangStore, useT, type Lang } from "../../langue";
import { useClickOutside } from "../hooks/useClickOutside";
import { cn } from "../lib/cn";

const LANGS: { id: Lang; label: string; short: string }[] = [
  { id: "vi", label: "Tiếng Việt", short: "VI" },
  { id: "en", label: "English", short: "EN" },
];

function GlobeIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
    </svg>
  );
}

/**
 * VI ⇄ EN language switcher (globe icon). `compact` renders the smaller
 * admin-palette style used inside the editor Toolbar; the default style is
 * sized for the landing Navbar (next to UserMenu).
 */
export function LanguageSwitcher({
  compact = false,
  align = "right",
  className,
}: {
  compact?: boolean;
  align?: "left" | "right";
  className?: string;
}) {
  const lang = useLangStore((s) => s.lang);
  const setLang = useLangStore((s) => s.setLang);
  const t = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false));

  const current = LANGS.find((l) => l.id === lang) ?? LANGS[0];

  return (
    <div ref={ref} className={cn("relative shrink-0", className)}>
      <button
        onClick={() => setOpen((v) => !v)}
        title={`${t("lang.label")}: ${current.label}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("lang.label")}
        className={
          compact
            ? `flex h-8 shrink-0 items-center gap-1.5 rounded-lg border px-2 text-[12px] font-bold transition-colors ${
                open
                  ? "border-uml-blue/40 bg-uml-blue/5 text-uml-blue"
                  : "border-admin-outline/40 text-admin-secondary hover:border-uml-blue/40 hover:bg-uml-blue/5 hover:text-uml-blue"
              }`
            : `flex h-9 items-center gap-1.5 rounded-full border bg-white/70 px-3 text-[13px] font-semibold text-gray-700 transition-all hover:border-uml-blue/40 hover:bg-gray-50 hover:text-uml-blue ${
                open ? "border-uml-blue/40 text-uml-blue" : "border-gray-200"
              }`
        }
      >
        <GlobeIcon size={compact ? 14 : 16} />
        {current.short}
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={cn("opacity-60 transition-transform duration-200", open && "rotate-180")}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={t("lang.label")}
          className={cn(
            "animate-pop absolute top-full z-[200] mt-2 w-44 overflow-hidden rounded-xl border border-gray-200/80 bg-white py-1 shadow-[0_10px_36px_rgba(0,0,0,0.14)]",
            align === "right" ? "right-0" : "left-0"
          )}
        >
          {LANGS.map((l) => (
            <button
              key={l.id}
              role="option"
              aria-selected={l.id === lang}
              onClick={() => {
                setLang(l.id);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] font-semibold transition-colors",
                l.id === lang ? "bg-uml-blue/5 text-uml-blue" : "text-gray-700 hover:bg-gray-50 hover:text-uml-blue"
              )}
            >
              <span className="flex h-5 w-8 shrink-0 items-center justify-center rounded border border-gray-200 text-[9px] font-black uppercase tracking-wide text-gray-500">
                {l.short}
              </span>
              {l.label}
              {l.id === lang && (
                <svg className="ml-auto text-uml-blue" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default LanguageSwitcher;
