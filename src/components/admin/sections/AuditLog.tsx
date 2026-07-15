import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  RefreshCw,
  ScrollText,
  ServerCog,
} from "lucide-react";
import { auditService } from "../../../services/auditService";
import type { AuditLog } from "../../../types/audit";
import { Avatar, Badge, Card, Skeleton } from "../ui";
import { Pagination } from "../Pagination";
import { cn } from "../../../utils/cn";

const PAGE_SIZE = 20;

/* ----------------------------- Nhãn & màu action ----------------------------- */
const actionLabels: Record<string, string> = {
  USER_LOCK: "Khóa tài khoản",
  USER_UNLOCK: "Mở khóa tài khoản",
  ADMIN_CREATE: "Tạo admin",
  AI_CONFIG_UPDATE: "Cập nhật cấu hình AI",
  AI_WORKSPACE_CREATE: "Tạo workspace AI",
  AI_WORKSPACE_UPDATE: "Cập nhật workspace AI",
  AI_WORKSPACE_DELETE: "Xóa workspace AI",
  AI_DOCUMENT_UPLOAD: "Tải tài liệu AI",
  AI_DOCUMENT_DELETE: "Xóa tài liệu AI",
  AI_DOCUMENT_REEMBED: "Nhúng lại tài liệu",
  ACCOUNT_AUTO_DELETE: "Tự động xóa tài khoản",
};

const targetLabels: Record<string, string> = {
  USER: "Người dùng",
  AI_CONFIG: "Cấu hình AI",
  AI_WORKSPACE: "Workspace AI",
  AI_DOCUMENT: "Tài liệu AI",
};

type Tone = "emerald" | "amber" | "rose" | "sky" | "slate" | "violet";

function actionTone(action: string): Tone {
  if (action === "USER_UNLOCK") return "sky";
  if (action.endsWith("_DELETE") || action === "USER_LOCK" || action === "ACCOUNT_AUTO_DELETE") return "rose";
  if (action.endsWith("_CREATE") || action.endsWith("_UPLOAD")) return "emerald";
  if (action.endsWith("_UPDATE") || action.endsWith("_REEMBED")) return "amber";
  return "slate";
}

const actionLabel = (a: string) => actionLabels[a] ?? a;
const targetLabel = (t: string) => targetLabels[t] ?? t;

/* ----------------------------- Helpers ----------------------------- */
function getInitials(name?: string | null) {
  if (!name) return "?";
  return name.split(" ").slice(-2).map((w) => w[0]).join("").toUpperCase();
}

function hashColor(name: string) {
  const colors = ["#6366f1", "#0ea5e9", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#14b8a6", "#64748b"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function fmtDateTime(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const isSystemRow = (l: AuditLog) => l.actorId == null && l.actorName != null;

function fmtValue(v: unknown): string {
  if (v == null) return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function renderDetail(detail: AuditLog["detail"]) {
  if (!detail || Object.keys(detail).length === 0) return "—";
  if ("before" in detail || "after" in detail) {
    return `${fmtValue(detail.before)} → ${fmtValue(detail.after)}`;
  }
  return Object.entries(detail).map(([k, v]) => `${k}: ${fmtValue(v)}`).join(" · ");
}

/* ----------------------------- Component ----------------------------- */
export default function AuditLog() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [actions, setActions] = useState<string[]>([]);
  const [action, setAction] = useState<string>("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Ngày không hợp lệ (from > to) → chặn trước, tránh dính 1092 INVALID_DATE_RANGE từ BE
  const dateError = useMemo(() => (from && to && from > to ? "Ngày bắt đầu phải trước ngày kết thúc" : null), [from, to]);

  useEffect(() => {
    auditService.getAuditActions().then(setActions).catch(() => setActions([]));
  }, []);

  useEffect(() => {
    if (dateError) return;
    let alive = true;
    setLoading(true);
    setError(null);
    auditService
      .getAuditLogs({
        action: action || undefined,
        from: from || undefined,
        to: to || undefined,
        page,
        size: PAGE_SIZE,
      })
      .then((res) => {
        if (!alive) return;
        setLogs(res.content);
        setTotalPages(res.totalPages);
        setTotalElements(res.totalElements);
      })
      .catch((e) => {
        if (!alive) return;
        setError(e?.message ?? "Không thể tải nhật ký");
      })
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [action, from, to, page, dateError]);

  const changeAction = (v: string) => { setAction(v); setPage(0); };
  const changeFrom = (v: string) => { setFrom(v); setPage(0); };
  const changeTo = (v: string) => { setTo(v); setPage(0); };
  const reload = () => {
    if (dateError) return;
    setLoading(true);
    auditService
      .getAuditLogs({ action: action || undefined, from: from || undefined, to: to || undefined, page, size: PAGE_SIZE })
      .then((res) => { setLogs(res.content); setTotalPages(res.totalPages); setTotalElements(res.totalElements); setError(null); })
      .catch((e) => setError(e?.message ?? "Không thể tải nhật ký"))
      .finally(() => setLoading(false));
  };

  const inputCls = "rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[13px] outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-100";

  return (
    <div className="flex h-full flex-col gap-5 overflow-hidden">
      <div className="flex-1 min-h-0 space-y-5 overflow-y-auto">
        <div>
          <h3 className="flex items-center gap-2 text-[15px] font-semibold text-slate-900">
            <ScrollText className="h-4 w-4 text-slate-500" /> Nhật ký hệ thống
          </h3>
          <p className="text-[13px] text-slate-500">Lịch sử thao tác quản trị — không thể chỉnh sửa hay xoá.</p>
        </div>

        <Card className="relative p-5">
          {/* Filter bar */}
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <select
                  value={action}
                  onChange={(e) => changeAction(e.target.value)}
                  className={cn(inputCls, "appearance-none pr-8")}
                >
                  <option value="">Tất cả hành động</option>
                  {actions.map((a) => (
                    <option key={a} value={a}>{actionLabel(a)}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[12.5px] text-slate-400">Từ</span>
                <input type="date" value={from} max={to || undefined} onChange={(e) => changeFrom(e.target.value)} className={inputCls} />
                <span className="text-[12.5px] text-slate-400">đến</span>
                <input type="date" value={to} min={from || undefined} onChange={(e) => changeTo(e.target.value)} className={inputCls} />
              </div>
              {(action || from || to) && (
                <button
                  onClick={() => { setAction(""); setFrom(""); setTo(""); setPage(0); }}
                  className="rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                >
                  Xoá lọc
                </button>
              )}
            </div>
            <button
              onClick={reload}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[13px] font-medium text-slate-600 transition hover:bg-slate-50"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} /> Làm mới
            </button>
          </div>

          {dateError ? (
            <p className="py-10 text-center text-[13px] text-amber-600">{dateError}</p>
          ) : loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="flex items-center gap-3 py-2">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-40" />
                    <Skeleton className="h-3 w-56" />
                  </div>
                  <Skeleton className="h-5 w-24 rounded-md" />
                  <Skeleton className="h-4 w-28" />
                </div>
              ))}
            </div>
          ) : error ? (
            <p className="py-10 text-center text-[13px] text-rose-500">{error}</p>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 py-16">
              <svg viewBox="0 0 120 120" className="h-28 w-28 text-slate-300" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="26" y="18" width="68" height="84" rx="8" strokeDasharray="4 3" />
                <path d="M40 40h40M40 56h40M40 72h26" />
              </svg>
              <p className="text-[15px] font-medium text-slate-400">Chưa có nhật ký nào</p>
              <p className="text-[13px] text-slate-400">Các thao tác quản trị sẽ được ghi lại và hiển thị tại đây.</p>
            </div>
          ) : (
            <div className="-mx-2 overflow-x-auto">
              <table className="w-full min-w-[820px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wide text-slate-400">
                    <th className="px-3 py-2 font-semibold">Thời gian</th>
                    <th className="px-3 py-2 font-semibold">Người thực hiện</th>
                    <th className="px-3 py-2 font-semibold">Hành động</th>
                    <th className="px-3 py-2 font-semibold">Đối tượng</th>
                    <th className="px-3 py-2 font-semibold">Chi tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map((l) => {
                    const system = isSystemRow(l);
                    return (
                      <tr key={l.id} className="align-top transition hover:bg-slate-50">
                        <td className="whitespace-nowrap px-3 py-2.5 text-[12.5px] text-slate-500">{fmtDateTime(l.createdAt)}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2.5">
                            {system ? (
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-800 text-white">
                                <ServerCog className="h-4 w-4" />
                              </span>
                            ) : (
                              <Avatar initials={getInitials(l.actorName)} color={hashColor(l.actorName ?? l.actorEmail ?? "?")} size="h-8 w-8" />
                            )}
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="truncate text-[13px] font-medium text-slate-900">{l.actorName ?? "—"}</p>
                                {system && <Badge tone="slate">Hệ thống</Badge>}
                              </div>
                              {l.actorEmail && <p className="truncate text-[12px] text-slate-400">{l.actorEmail}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <Badge tone={actionTone(l.action)}>{actionLabel(l.action)}</Badge>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="text-[13px] text-slate-700">{targetLabel(l.targetType)}</div>
                          {l.targetId && <div className="truncate font-mono text-[11.5px] text-slate-400">{l.targetId}</div>}
                        </td>
                        <td className="px-3 py-2.5 text-[12.5px] text-slate-600">
                          <span className="line-clamp-2 break-words">{renderDetail(l.detail)}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!dateError && !error && totalElements > 0 && (
            <Pagination page={page} totalPages={totalPages} totalElements={totalElements} onChange={setPage} />
          )}
        </Card>
      </div>
    </div>
  );
}
