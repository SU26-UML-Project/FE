import { Modal } from "./Modal";

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Xác nhận",
  confirmTone = "red",
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  confirmTone?: "red" | "slate";
  loading?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm"
      footer={
        <>
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-[13px] font-medium text-slate-600 transition hover:bg-slate-100">
            Huỷ
          </button>
          <button onClick={onConfirm} disabled={loading}
            className={`rounded-lg px-4 py-2 text-[13px] font-medium text-white transition ${
              confirmTone === "red"
                ? "bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300"
                : "bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400"
            }`}>
            {loading ? "Đang xử lý..." : confirmLabel}
          </button>
        </>
      }>
      <p className="text-[14px] leading-relaxed text-slate-600">{message}</p>
    </Modal>
  );
}
