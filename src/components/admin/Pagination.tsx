import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../../utils/cn";

export function Pagination({
  page,
  totalPages,
  totalElements,
  onChange,
}: {
  page: number;
  totalPages: number;
  totalElements: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  const pages: (number | "...")[] = [];
  for (let i = 0; i < totalPages; i++) {
    if (i === 0 || i === totalPages - 1 || Math.abs(i - page) <= 1) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "...") {
      pages.push("...");
    }
  }

  return (
    <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3">
      <p className="text-[12px] text-slate-400">
        {totalElements.toLocaleString("vi-VN")} bản ghi · Trang {page + 1}/{totalPages}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page <= 0}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`dot-${i}`} className="px-1 text-[12px] text-slate-300">...</span>
          ) : (
            <button
              key={p}
              onClick={() => onChange(p)}
              className={cn(
                "flex h-8 min-w-[32px] items-center justify-center rounded-lg px-2 text-[13px] font-medium transition",
                p === page
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              )}
            >
              {p + 1}
            </button>
          )
        )}
        <button
          onClick={() => onChange(page + 1)}
          disabled={page + 1 >= totalPages}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 disabled:opacity-30"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
