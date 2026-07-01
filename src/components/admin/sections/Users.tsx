import { useEffect, useMemo, useState } from "react";
import {
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserCheck,
  UserPlus,
  Users as UsersIcon,
} from "lucide-react";
import { authService } from "../../../services/authService";
import type { AdminUserListItem } from "../../../types/auth";
import { Avatar, Badge, Card, Skeleton } from "../ui";
import { Modal } from "../Modal";
import { cn } from "../../../utils/cn";

type RoleDisplay = "Admin" | "User";

const roleTone: Record<RoleDisplay, "violet" | "sky" | "slate" | "brand"> = {
  Admin: "violet",
  User: "slate",
};

const statusMap: Record<string, { tone: "emerald" | "amber" | "rose"; label: string; dot: string }> = {
  ACTIVE: { tone: "emerald", label: "Hoạt động", dot: "bg-emerald-500" },
  PENDING_DELETE: { tone: "amber", label: "Chờ xoá", dot: "bg-amber-500" },
  LOCKED: { tone: "rose", label: "Đã khoá", dot: "bg-rose-500" },
};

function getInitials(name?: string) {
  if (!name) return "?";
  return name.split(" ").slice(-2).map((w) => w[0]).join("").toUpperCase();
}

function hashColor(name: string) {
  const colors = ["#6366f1", "#0ea5e9", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#14b8a6", "#64748b"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function relativeTime(iso?: string) {
  if (!iso) return "—";
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

function MiniStat({
  icon: Icon,
  label,
  value,
  delta,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  delta?: string;
}) {
  return (
    <Card className="flex items-center gap-3 p-4">
      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="text-[12px] text-slate-500">{label}</p>
        <p className="text-[19px] font-semibold leading-tight text-slate-900">{value}</p>
      </div>
      {delta && <Badge tone="emerald" className="ml-auto">{delta}</Badge>}
    </Card>
  );
}

function roleDisplay(role: AdminUserListItem["role"]): RoleDisplay {
  if (typeof role === "string") return role as RoleDisplay;
  return role.roleName === "ADMIN" ? "Admin" : "User";
}

export default function Users() {
  const [q, setQ] = useState("");
  const [role, setRole] = useState<"all" | RoleDisplay>("all");
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modal, setModal] = useState<"create" | "detail" | null>(null);
  const [selectedUser, setSelectedUser] = useState<AdminUserListItem | null>(null);
  const [form, setForm] = useState({ fullName: "", email: "", password: "" });

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authService.getAllUsers({ page: 0, size: 999 });
      setUsers(res.result.content);
    } catch {
      setError("Không thể tải danh sách người dùng");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const filtered = useMemo(
    () =>
      users.filter(
        (u) =>
          (role === "all" || roleDisplay(u.role) === role) &&
          ((u.fullName ?? "").toLowerCase().includes(q.toLowerCase()) ||
            u.email.toLowerCase().includes(q.toLowerCase()))
      ),
    [q, role, users]
  );

  const activeCount = users.filter((u) => u.status === "ACTIVE").length;
  const pendingCount = users.filter((u) => u.status === "PENDING_DELETE").length;
  const adminCount = users.filter((u) => {
    const r = typeof u.role === "string" ? u.role : u.role.roleName;
    return r === "ADMIN";
  }).length;

  const handleCreate = async () => {
    try {
      await authService.registerAdmin(form);
      setModal(null);
      setForm({ fullName: "", email: "", password: "" });
      await fetchUsers();
    } catch {
      // toast handled by interceptor
    }
  };

  const handleToggleStatus = async (userId: string) => {
    try {
      await authService.toggleUserStatus(userId);
      await fetchUsers();
    } catch {
      // toast handled by interceptor
    }
  };

  const handleEdit = async (userId: string) => {
    try {
      const res = await authService.getUserById(userId);
      setSelectedUser(res.result);
      setModal("detail");
    } catch {
      // toast handled by interceptor
    }
  };

  return (
    <div className="flex h-full flex-col gap-5 overflow-hidden">
      {loading ? (
        <div className="animate-pulse space-y-5">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="flex items-center gap-3 p-4">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-5 w-20" />
                </div>
              </Card>
            ))}
          </div>
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex gap-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-8 w-16 rounded-lg" />)}
              </div>
              <Skeleton className="h-9 w-48 rounded-lg" />
            </div>
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3 py-2">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-3.5 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-5 w-16" />
                </div>
              ))}
            </div>
          </Card>
        </div>
      ) : (
        <div className="flex-1 min-h-0 space-y-5 overflow-y-auto">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MiniStat icon={UsersIcon} label="Tổng người dùng" value={users.length.toLocaleString("vi-VN")} />
        <MiniStat icon={UserCheck} label="Đang hoạt động" value={activeCount.toLocaleString("vi-VN")} />
        <MiniStat icon={UserPlus} label="Chờ xoá" value={pendingCount.toLocaleString("vi-VN")} />
        <MiniStat icon={UsersIcon} label="Quản trị viên" value={adminCount.toLocaleString("vi-VN")} />
      </div>

      <Card className="relative p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {(["all", "Admin", "User"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition",
                  role === r ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                {r === "all" ? "Tất cả" : r}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <label className="relative flex items-center">
              <Search className="pointer-events-none absolute left-3 h-4 w-4 text-slate-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Tìm theo tên / email…"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-[13px] outline-none focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-100 sm:w-56"
              />
            </label>
            <button
              onClick={() => { setForm({ fullName: "", email: "", password: "" }); setModal("create"); }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-[13px] font-medium text-white transition hover:bg-slate-700"
            >
              <Plus className="h-4 w-4" /> Thêm người dùng
            </button>
          </div>
        </div>

        {error ? (
          <p className="py-10 text-center text-[13px] text-rose-500">{error}</p>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-16">
            <svg viewBox="0 0 120 120" className="h-28 w-28 text-slate-300" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="60" cy="45" r="18" strokeDasharray="4 3" />
              <path d="M28 97c0-18 14-32 32-32s32 14 32 32" strokeDasharray="4 3" />
              <path d="M60 32a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
              <path d="M52 40a6 6 0 0 1 16 0" />
            </svg>
            <p className="text-[15px] font-medium text-slate-400">Không có người dùng nào</p>
            <p className="text-[13px] text-slate-400">Danh sách người dùng sẽ hiển thị tại đây khi có dữ liệu.</p>
          </div>
        ) : (
          <div className="-mx-2 overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wide text-slate-400">
                  <th className="px-3 py-2 font-semibold">Thành viên</th>
                  <th className="px-3 py-2 font-semibold">Vai trò</th>
                  <th className="px-3 py-2 font-semibold">Trạng thái</th>
                  <th className="px-3 py-2 text-right font-semibold">Dự án</th>
                  <th className="px-3 py-2 text-right font-semibold">Sơ đồ</th>
                  <th className="px-3 py-2 font-semibold">Hoạt động cuối</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((u) => (
                  <tr key={u.id} className="group transition hover:bg-slate-50">
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-3">
                        {u.avatarUrl ? (
                          <img src={u.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
                        ) : (
                          <Avatar initials={getInitials(u.fullName)} color={hashColor(u.fullName ?? u.email)} />
                        )}
                        <div>
                          <p className="text-[13.5px] font-medium text-slate-900">{u.fullName ?? "—"}</p>
                          <p className="text-[12px] text-slate-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge tone={roleTone[roleDisplay(u.role)]}>{roleDisplay(u.role)}</Badge>
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge tone={statusMap[u.status ?? "ACTIVE"]?.tone ?? "emerald"}>
                        <span className={cn("mr-1 inline-block h-1.5 w-1.5 rounded-full", statusMap[u.status ?? "ACTIVE"]?.dot ?? "bg-emerald-500")} />
                        {statusMap[u.status ?? "ACTIVE"]?.label ?? "Hoạt động"}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5 text-right text-[13.5px] font-semibold text-slate-900">
                      {u.projectCount ?? "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right text-[13.5px] text-slate-600">
                      {u.diagramCount ?? "—"}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={cn(
                        "text-[12.5px]",
                        u.lastActiveAt ? "text-slate-500" : "text-slate-400"
                      )}>
                        {relativeTime(u.lastActiveAt)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-end gap-0.5 opacity-0 transition group-hover:opacity-100">
                        <button onClick={() => handleEdit(u.id)} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleToggleStatus(u.id)} className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600">
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <button className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100">
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <p className="py-10 text-center text-[13px] text-slate-400">Không tìm thấy người dùng phù hợp.</p>
            )}
          </div>
        )}
      </Card>

      {/* Create user modal */}
      <Modal open={modal === "create"} onClose={() => setModal(null)} title="Thêm người dùng" size="sm">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-[12.5px] font-medium text-slate-700">Họ và tên</label>
            <input
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-[12.5px] font-medium text-slate-700">Email</label>
            <input
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-[12.5px] font-medium text-slate-700">Mật khẩu</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setModal(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-[13px] font-medium text-slate-600 hover:bg-slate-50">
              Huỷ
            </button>
            <button
              onClick={handleCreate}
              disabled={!form.fullName || !form.email || !form.password}
              className="rounded-lg bg-slate-900 px-4 py-2 text-[13px] font-medium text-white transition hover:bg-slate-700 disabled:opacity-50"
            >
              Tạo
            </button>
          </div>
        </div>
      </Modal>

      {/* User detail modal */}
      <Modal open={modal === "detail"} onClose={() => setModal(null)} title="Chi tiết người dùng" size="sm">
        {selectedUser && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              {selectedUser.avatarUrl ? (
                <img src={selectedUser.avatarUrl} alt="" className="h-12 w-12 rounded-full object-cover" />
              ) : (
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white">
                  {getInitials(selectedUser.fullName)}
                </span>
              )}
              <div>
                <p className="text-[15px] font-semibold text-slate-900">{selectedUser.fullName}</p>
                <p className="text-[13px] text-slate-400">{selectedUser.email}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-[13px]">
              <div><span className="text-slate-400">Vai trò:</span> <span className="font-medium text-slate-700">{roleDisplay(selectedUser.role)}</span></div>
              <div><span className="text-slate-400">Trạng thái:</span> <span className="font-medium text-slate-700">{statusMap[selectedUser.status ?? "ACTIVE"]?.label ?? "Hoạt động"}</span></div>
              <div><span className="text-slate-400">Dự án:</span> <span className="font-medium text-slate-700">{selectedUser.projectCount ?? "—"}</span></div>
              <div><span className="text-slate-400">Sơ đồ:</span> <span className="font-medium text-slate-700">{selectedUser.diagramCount ?? "—"}</span></div>
              <div className="col-span-2"><span className="text-slate-400">Hoạt động cuối:</span> <span className="font-medium text-slate-700">{relativeTime(selectedUser.lastActiveAt)}</span></div>
            </div>
          </div>
        )}
      </Modal>
      </div>
      )}
    </div>
  );
}
