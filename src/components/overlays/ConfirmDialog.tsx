/** Lightweight confirmation modal with a destructive primary action. */
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
  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/30 p-4 backdrop-blur-[2px]"
      onClick={onCancel}
    >
      <div
        className="animate-pop w-full max-w-sm overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.25)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-5">
          <div className="flex items-start gap-3">
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${danger ? "bg-zinc-100 text-zinc-700" : "bg-zinc-100 text-zinc-700"}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
                <path d="M12 9v4" />
                <path d="M12 17h.01" />
              </svg>
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-[15px] font-semibold text-zinc-900">{title}</h2>
              <p className="mt-1 text-[13px] leading-relaxed text-zinc-500">{message}</p>
            </div>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2 border-t border-[var(--line)] bg-[var(--bg-soft)] px-5 py-3">
          <button onClick={onCancel} className="rounded-lg border border-[var(--line-strong)] bg-white px-3.5 py-1.5 text-[13px] font-medium text-zinc-600 transition-colors hover:bg-zinc-100">
            {cancelLabel}
          </button>
          <button onClick={onConfirm} className={`rounded-lg px-3.5 py-1.5 text-[13px] font-medium text-white transition-colors ${danger ? "bg-zinc-900 hover:bg-zinc-800" : "bg-zinc-700 hover:bg-zinc-600"}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
