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
        className="animate-pop w-full max-w-sm overflow-hidden rounded-2xl border border-admin-outline/30 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.25)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-5">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-admin-bg text-admin-primary">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
                <path d="M12 9v4" />
                <path d="M12 17h.01" />
              </svg>
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-[15px] font-bold text-admin-on-surface">{title}</h2>
              <p className="mt-1 text-[13px] leading-relaxed text-admin-secondary/80">{message}</p>
            </div>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2 border-t border-admin-outline/30 bg-admin-bg/30 px-5 py-3">
          <button onClick={onCancel} className="rounded-lg border border-admin-outline/30 bg-white px-3.5 py-1.5 text-[13px] font-bold text-admin-secondary transition-colors hover:bg-admin-bg hover:text-admin-on-surface">
            {cancelLabel}
          </button>
          <button onClick={onConfirm} className={`rounded-lg px-4 py-2 text-[13px] font-bold text-white transition-colors ${danger ? "bg-admin-primary hover:bg-blue-700" : "bg-admin-on-surface hover:bg-zinc-800"} shadow-sm shadow-admin-primary/10`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
