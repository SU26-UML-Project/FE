import { useState, useRef, useEffect } from "react";
import { cn } from "../../utils/cn";
import { Search, X, Check, ChevronDown } from "lucide-react";

export type SelectOption = { value: string; label: string };

type SmartSelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: (string | SelectOption)[];
  placeholder?: string;
  searchable?: boolean;
  className?: string;
  size?: "sm" | "md";
};

function toOptions(list: (string | SelectOption)[]): SelectOption[] {
  return list.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
}

export default function SmartSelect({
  value,
  onChange,
  options,
  placeholder = "Chọn...",
  searchable = false,
  className,
  size = "md",
}: SmartSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const items = toOptions(options);
  const filtered =
    searchable && search
      ? items.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
      : items;
  const selected = items.find((o) => o.value === value);

  useEffect(() => {
    if (open && searchable && searchRef.current) searchRef.current.focus();
  }, [open]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

  const szCls = size === "sm" ? "px-2 py-1 text-[12px]" : "px-3 py-2 text-[13px]";

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white text-left transition",
          szCls,
          open && "border-indigo-300 ring-4 ring-indigo-100",
          !open && "hover:border-slate-300",
        )}
      >
        <span className={cn("min-w-0 truncate", selected ? "text-slate-800" : "text-slate-400")}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-slate-400 transition", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-50 mt-1.5 animate-fade-in rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
          {searchable && (
            <div className="relative mb-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                ref={searchRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm kiếm..."
                className="w-full rounded-lg border border-slate-100 bg-slate-50 py-1.5 pl-8 pr-7 text-[12px] outline-none focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-700"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
          <div className="max-h-48 space-y-0.5 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-2 py-4 text-center text-[12px] text-slate-400">Không tìm thấy</p>
            ) : (
              filtered.map((o) => {
                const sel = o.value === value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => { onChange(o.value); setOpen(false); }}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] transition",
                      sel ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:bg-slate-50",
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate">{o.label}</span>
                    {sel && <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
