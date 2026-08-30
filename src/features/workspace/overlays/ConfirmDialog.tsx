import { useEffect } from "react";

/**
 * Lightweight confirmation modal.
 * `danger` (default) renders the destructive red variant — the icon chip and
 * confirm button turn red so the dialog reads as "this will remove something".
 * `danger={false}` renders the friendly primary-blue variant (restore, save…).
 */
export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = true,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  // Escape closes the dialog (backdrop click is handled below).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]"
      onClick={onCancel}
    >
      <div
        className="animate-pop w-full max-w-[380px] overflow-hidden rounded-2xl border border-admin-outline/40 bg-white shadow-[0_24px_70px_rgba(0,0,0,0.22)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon + copy, centered */}
        <div className="flex flex-col items-center px-6 pb-5 pt-7 text-center">
          <span
            className={`flex h-12 w-12 items-center justify-center rounded-2xl ring-1 ${
              danger
                ? "bg-red-50 text-red-600 ring-red-200/80"
                : "bg-uml-blue/10 text-uml-blue ring-uml-blue/20"
            }`}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              {danger ? (
                <>
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 20h16a2 2 0 0 0 1.73-2Z" />
                  <path d="M12 9v4" />
                  <path d="M12 17h.01" />
                </>
              ) : (
                <>
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v4" />
                  <path d="M12 16h.01" />
                </>
              )}
            </svg>
          </span>
          <h2 className="mt-4 text-[16px] font-bold tracking-tight text-admin-on-surface">{title}</h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-admin-secondary">{message}</p>
        </div>
        {/* Actions */}
        <div className="flex gap-2.5 px-6 pb-6">
          <button
            onClick={onCancel}
            className="h-10 flex-1 rounded-xl border border-admin-outline/50 bg-white text-[13px] font-bold text-admin-secondary transition-all hover:bg-admin-bg hover:text-admin-on-surface active:scale-[0.98]"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`h-10 flex-1 rounded-xl text-[13px] font-bold text-white transition-all active:scale-[0.98] ${
              danger
                ? "bg-red-600 shadow-[0_4px_14px_rgba(220,38,38,0.35)] hover:bg-red-500"
                : "bg-uml-blue shadow-[0_4px_14px_rgba(37,99,235,0.3)] hover:bg-blue-700"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
