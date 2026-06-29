import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

const sizeMap = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-3xl",
} as const;

export function Modal({
  open,
  onClose,
  title,
  desc,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  desc?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: keyof typeof sizeMap;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 animate-fade-in bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-3xl border border-white/60 bg-panel shadow-2xl animate-fade-up",
          sizeMap[size]
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-black/5 px-5 py-4">
          <div className="min-w-0">
            <h3 className="text-[15px] font-bold text-ink">{title}</h3>
            {desc && <p className="mt-0.5 text-[13px] text-gray-500">{desc}</p>}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-xl p-1.5 text-gray-400 transition hover:bg-white/70 hover:text-ink"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="scroll-slim flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-black/5 px-5 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
