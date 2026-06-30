import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useAuthStore } from "../../stores/useAuthStore";

export default function LogoutConfirmModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const logout = useAuthStore((s) => s.logout);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) confirmRef.current?.focus();
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 animate-fade-in bg-black/20 backdrop-blur-md"
        onClick={onClose}
      />
      <div className="relative w-full max-w-sm animate-fade-up rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
        <h3 className="text-[15px] font-semibold text-slate-900">Xác nhận đăng xuất</h3>
        <p className="mt-1.5 text-[13px] text-slate-500">
          Bạn có chắc muốn đăng xuất khỏi hệ thống?
        </p>
        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-[13px] font-medium text-slate-600 transition hover:bg-slate-100"
          >
            Hủy
          </button>
          <button
            ref={confirmRef}
            onClick={() => {
              onClose();
              logout();
            }}
            className="rounded-lg bg-red-600 px-4 py-2 text-[13px] font-medium text-white transition hover:bg-red-700"
          >
            Đăng xuất
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
