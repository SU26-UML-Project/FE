import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Bell, BellDot, Check, CheckCheck, Info, Loader2, Trash2, X } from "lucide-react";
import { notificationService, type NotificationItem } from "../../services/notificationService";
import { cn } from "../../utils/cn";

const severityIcon: Record<string, React.ComponentType<{ className?: string }>> = {
  WARNING: AlertTriangle,
  ERROR: X,
  INFO: Info,
  SUCCESS: Check,
};

const severityColor: Record<string, string> = {
  WARNING: "text-amber-600 bg-amber-50 border-amber-200",
  ERROR: "text-rose-600 bg-rose-50 border-rose-200",
  INFO: "text-sky-600 bg-sky-50 border-sky-200",
  SUCCESS: "text-emerald-600 bg-emerald-50 border-emerald-200",
};

function relativeTime(iso?: string) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Vừa xong";
  if (mins < 60) return `${mins} phút trước`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} giờ trước`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} ngày trước`;
  return new Date(iso).toLocaleDateString("vi-VN");
}

export default function NotificationPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const sseRef = useRef<EventSource | null>(null);

  const fetchNotifications = async (p: number, append = false) => {
    if (!append) setLoading(true);
    else setLoadingMore(true);
    try {
      const res = await notificationService.getAll({ page: p, size: 20 });
      if (append) {
        setNotifications((prev) => [...prev, ...res.content]);
      } else {
        setNotifications(res.content);
      }
      setHasMore(!res.last);
      setUnreadCount(res.content.filter((n: NotificationItem) => !n.read).length);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (open) {
      setPage(0);
      fetchNotifications(0);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const baseUrl = import.meta.env.VITE_API_BASE_URL || "";
    const url = baseUrl.replace(/\/+$/, "") + "/admin/dashboard/events";
    const es = new EventSource(url, { withCredentials: true });
    sseRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const notif: NotificationItem = {
          id: data.id || crypto.randomUUID(),
          type: data.type || "info",
          title: data.title || "Cập nhật hệ thống",
          message: data.message || "",
          severity: data.severity || "INFO",
          read: false,
          createdAt: data.createdAt || new Date().toISOString(),
        };
        setNotifications((prev) => [notif, ...prev]);
        setUnreadCount((c) => c + 1);
      } catch {
        /* ignore malformed SSE data */
      }
    };

    es.onerror = () => {
      // SSE will auto-reconnect
    };

    return () => {
      es.close();
      sseRef.current = null;
    };
  }, [open]);

  const handleMarkAllRead = async () => {
    setActionLoading("all");
    try {
      await notificationService.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      /* ignore */
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkRead = async (id: string) => {
    setActionLoading(id);
    try {
      await notificationService.markRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      /* ignore */
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    setActionLoading(`del-${id}`);
    try {
      await notificationService.deleteNotification(id);
      setNotifications((prev) => {
        const removed = prev.find((n) => n.id === id);
        if (removed && !removed.read) setUnreadCount((c) => Math.max(0, c - 1));
        return prev.filter((n) => n.id !== id);
      });
    } catch {
      /* ignore */
    } finally {
      setActionLoading(null);
    }
  };

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchNotifications(next, true);
  };

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-50 bg-slate-900/20 backdrop-blur-sm transition-opacity",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-full max-w-[420px] flex-col border-l border-slate-200 bg-white shadow-2xl transition-transform duration-300",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-2">
            {unreadCount > 0 ? (
              <BellDot className="h-5 w-5 text-indigo-600" />
            ) : (
              <Bell className="h-5 w-5 text-slate-500" />
            )}
            <h2 className="text-[15px] font-semibold text-slate-900">Thông báo</h2>
            {unreadCount > 0 && (
              <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-indigo-600 px-1.5 text-[11px] font-semibold text-white">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={actionLoading === "all"}
                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-indigo-600 transition hover:bg-indigo-50 disabled:opacity-50"
              >
                {actionLoading === "all" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCheck className="h-3.5 w-3.5" />
                )}
                Đã đọc tất cả
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Bell className="h-10 w-10 mb-3 text-slate-200" />
              <p className="text-[13px] font-medium">Không có thông báo</p>
              <p className="text-[12px] mt-1">Các thông báo hệ thống sẽ hiển thị tại đây.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {notifications.map((n) => {
                const Icon = severityIcon[n.severity] || Bell;
                const colorClass = severityColor[n.severity] || severityColor.INFO;
                return (
                  <div
                    key={n.id}
                    className={cn(
                      "group relative px-5 py-3.5 transition hover:bg-slate-50",
                      !n.read && "bg-indigo-50/40"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={cn(
                          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
                          colorClass
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-[13px] font-medium text-slate-900">{n.title}</p>
                          {!n.read && (
                            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-indigo-500" />
                          )}
                        </div>
                        {n.message && (
                          <p className="mt-0.5 text-[12.5px] leading-relaxed text-slate-500 line-clamp-2">
                            {n.message}
                          </p>
                        )}
                        <div className="mt-1.5 flex items-center gap-3">
                          <span className="text-[11px] text-slate-400">
                            {relativeTime(n.createdAt)}
                          </span>
                          <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                            {n.type}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-end gap-1 opacity-0 transition group-hover:opacity-100">
                      {!n.read && (
                        <button
                          onClick={() => handleMarkRead(n.id)}
                          disabled={actionLoading === n.id}
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-indigo-600 transition hover:bg-indigo-50 disabled:opacity-50"
                        >
                          {actionLoading === n.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Check className="h-3 w-3" />
                          )}
                          Đã đọc
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(n.id)}
                        disabled={actionLoading === `del-${n.id}`}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
                      >
                        {actionLoading === `del-${n.id}` ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                        Xoá
                      </button>
                    </div>
                  </div>
                );
              })}
              {hasMore && (
                <div className="px-5 py-4 text-center">
                  <button
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="inline-flex items-center gap-1.5 text-[13px] font-medium text-indigo-600 transition hover:text-indigo-700 disabled:opacity-50"
                  >
                    {loadingMore ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Xem thêm"
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
