import { useEffect, useMemo, useRef, useState } from "react";
import {
  Ban,
  Camera,
  Lock,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  Unlock,
  UserCheck,
  UserPlus,
  Users as UsersIcon,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { authService } from "../../../services/authService";
import type { AdminUserListItem } from "../../../types/auth";
import { useAuthStore } from "../../../stores/useAuthStore";
import { Badge, Card, Skeleton } from "../ui";
import { ConfirmModal } from "../ConfirmModal";
import { Pagination } from "../Pagination";
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

function roleDisplay(role: AdminUserListItem["role"]): RoleDisplay {
  if (typeof role === "string") return role as RoleDisplay;
  return role.roleName === "ADMIN" ? "Admin" : "User";
}

function roleName(role: AdminUserListItem["role"]): "USER" | "ADMIN" {
  const r = typeof role === "string" ? role : role.roleName;
  return r === "ADMIN" ? "ADMIN" : "USER";
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9]{10,11}$/;
// Khớp yêu cầu backend: tối thiểu 6 ký tự, có ít nhất 1 chữ cái và 1 số.
const passwordValid = (pw: string) => pw.length >= 6 && /[A-Za-z]/.test(pw) && /\d/.test(pw);

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_AVATAR_SIZE = 2 * 1024 * 1024; // 2 MB

/** Kiểm tra file ảnh; trả về thông báo lỗi hoặc null nếu hợp lệ. */
function validateImage(file: File): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) return "Chỉ chấp nhận ảnh JPG, PNG hoặc WEBP";
  if (file.size > MAX_AVATAR_SIZE) return "Ảnh vượt quá 2MB";
  return null;
}

/** Avatar hiển thị ảnh thật của user, tự fallback về chữ cái đầu nếu null hoặc ảnh lỗi. */
function UserAvatar({
  url,
  name,
  email,
  className = "h-8 w-8",
}: {
  url?: string;
  name?: string;
  email: string;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  useEffect(() => { setBroken(false); }, [url]);
  if (url && !broken) {
    return (
      <img
        src={url}
        alt={name ?? email}
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
        className={cn("shrink-0 rounded-full object-cover", className)}
      />
    );
  }
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full text-white", className)}
      style={{ backgroundColor: hashColor(name ?? email) }}
    >
      <span className="text-[11.5px] font-semibold">{getInitials(name ?? email)}</span>
    </span>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
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
    </Card>
  );
}

type CreateForm = {
  fullName: string;
  email: string;
  password: string;
  phone: string;
  dob: string;
  role: "USER" | "ADMIN";
};
type EditForm = {
  fullName: string;
  phone: string;
  dob: string;
  roleName: "USER" | "ADMIN";
  status: "ACTIVE" | "LOCKED";
};

const emptyCreate: CreateForm = { fullName: "", email: "", password: "", phone: "", dob: "", role: "USER" };
const emptyEdit: EditForm = { fullName: "", phone: "", dob: "", roleName: "USER", status: "ACTIVE" };

export default function Users() {
  const currentUserId = useAuthStore((s) => s.user?.id);

  const [q, setQ] = useState("");
  const [role, setRole] = useState<"all" | RoleDisplay>("all");
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [selectedUser, setSelectedUser] = useState<AdminUserListItem | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [lockTarget, setLockTarget] = useState<AdminUserListItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUserListItem | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<AdminUserListItem | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);

  const [page, setPage] = useState(0);
  const PAGE_SIZE = 10;

  const [createForm, setCreateForm] = useState<CreateForm>(emptyCreate);
  const [editForm, setEditForm] = useState<EditForm>(emptyEdit);
  const [initialEdit, setInitialEdit] = useState<EditForm>(emptyEdit);
  const [editPassword, setEditPassword] = useState("");

  // Avatar (tạo + sửa): file đã chọn + preview blob URL.
  const [createAvatar, setCreateAvatar] = useState<{ file: File; preview: string } | null>(null);
  const [editAvatar, setEditAvatar] = useState<{ file: File; preview: string } | null>(null);

  const firstFieldRef = useRef<HTMLInputElement>(null);

  // Dọn blob URL preview khi đổi/huỷ để tránh rò rỉ bộ nhớ.
  useEffect(() => () => { if (createAvatar) URL.revokeObjectURL(createAvatar.preview); }, [createAvatar]);
  useEffect(() => () => { if (editAvatar) URL.revokeObjectURL(editAvatar.preview); }, [editAvatar]);

  const pickCreateAvatar = (file: File) => {
    const err = validateImage(file);
    if (err) { toast.error(err); return; }
    if (createAvatar) URL.revokeObjectURL(createAvatar.preview);
    setCreateAvatar({ file, preview: URL.createObjectURL(file) });
  };
  const pickEditAvatar = (file: File) => {
    const err = validateImage(file);
    if (err) { toast.error(err); return; }
    if (editAvatar) URL.revokeObjectURL(editAvatar.preview);
    setEditAvatar({ file, preview: URL.createObjectURL(file) });
  };

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authService.getAllUsers({ page: 0, size: 200 });
      setUsers(res.result.content);
    } catch (e: any) {
      // USER_LIST_EMPTY (1018) là "không có user", không phải lỗi kết nối.
      if (e?.code === 1018) setUsers([]);
      else setError(e?.message || "Không thể tải danh sách người dùng");
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
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  useEffect(() => { setPage(0); }, [q, role]);
  const safePage = Math.min(page, totalPages - 1);
  const pageUsers = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const activeCount = users.filter((u) => u.status === "ACTIVE").length;
  const pendingCount = users.filter((u) => u.status === "PENDING_DELETE").length;
  const adminCount = users.filter((u) => roleName(u.role) === "ADMIN").length;
  const userCount = users.length - adminCount;

  const openCreate = () => {
    setCreateForm(emptyCreate);
    if (createAvatar) URL.revokeObjectURL(createAvatar.preview);
    setCreateAvatar(null);
    setModal("create");
  };

  // ---------- CREATE ----------
  const createErrors = {
    fullName: createForm.fullName.trim().length === 0,
    email: !EMAIL_RE.test(createForm.email),
    password: !passwordValid(createForm.password),
    phone: createForm.phone.trim().length > 0 && !PHONE_RE.test(createForm.phone.trim()),
  };
  const createInvalid = createErrors.fullName || createErrors.email || createErrors.password || createErrors.phone;

  const handleCreate = async () => {
    if (createInvalid || submitting) return;
    setSubmitting(true);
    try {
      const payload = {
        fullName: createForm.fullName.trim(),
        email: createForm.email.trim(),
        password: createForm.password,
        ...(createForm.phone.trim() ? { phone: createForm.phone.trim() } : {}),
      };
      // 1) Tạo user (register: USER, registerAdmin: ADMIN) → lấy id vừa tạo.
      const res = createForm.role === "ADMIN"
        ? await authService.registerAdmin(payload)
        : await authService.register(payload);
      const newId = res.result?.id;

      // 2) Các field register không nhận (dob) + avatar → cập nhật theo id mới.
      if (newId && createForm.dob) {
        await authService.adminUpdateUser(newId, { dob: createForm.dob });
      }
      if (newId && createAvatar) {
        await authService.adminUploadAvatar(newId, createAvatar.file);
      }

      toast.success(createForm.role === "ADMIN" ? "Đã tạo tài khoản Quản trị viên" : "Đã tạo người dùng mới");
      setModal(null);
      setCreateForm(emptyCreate);
      if (createAvatar) URL.revokeObjectURL(createAvatar.preview);
      setCreateAvatar(null);
      await fetchUsers();
    } catch (e: any) {
      toast.error(e?.message || "Không thể tạo người dùng");
    } finally {
      setSubmitting(false);
    }
  };

  // ---------- EDIT ----------
  const openEdit = (u: AdminUserListItem) => {
    setSelectedUser(u);
    const init: EditForm = {
      fullName: u.fullName ?? "",
      phone: u.phone ?? "",
      dob: u.dob ?? "",
      roleName: roleName(u.role),
      status: u.status === "LOCKED" ? "LOCKED" : "ACTIVE",
    };
    setEditForm(init);
    setInitialEdit(init);
    setEditPassword("");
    if (editAvatar) URL.revokeObjectURL(editAvatar.preview);
    setEditAvatar(null);
    setModal("edit");
    setMenuFor(null);
  };

  const isEditingSelf = selectedUser?.id === currentUserId;
  const editPhoneInvalid = editForm.phone.trim().length > 0 && !PHONE_RE.test(editForm.phone.trim());
  const editPasswordInvalid = editPassword.length > 0 && !passwordValid(editPassword);

  const handleSaveEdit = async () => {
    if (!selectedUser || submitting) return;
    if (editPhoneInvalid) { toast.error("Số điện thoại phải có 10-11 chữ số"); return; }
    if (editPasswordInvalid) { toast.error("Mật khẩu tối thiểu 6 ký tự, gồm chữ và số"); return; }

    // So sánh với snapshot ban đầu → chỉ gửi field thực sự thay đổi.
    // (Với user đang chờ xoá, không tự động khôi phục khi chỉ sửa tên — dùng hành động Khôi phục.)
    const data: { fullName?: string; phone?: string; dob?: string; roleName?: "USER" | "ADMIN"; status?: "ACTIVE" | "LOCKED" } = {};
    if (editForm.fullName.trim() && editForm.fullName.trim() !== initialEdit.fullName.trim()) {
      data.fullName = editForm.fullName.trim();
    }
    // Chỉ gửi khi có giá trị (BE bỏ qua chuỗi rỗng; "" cũng làm hỏng validate @Pattern/LocalDate).
    if (editForm.phone.trim() && editForm.phone.trim() !== initialEdit.phone.trim()) data.phone = editForm.phone.trim();
    if (editForm.dob && editForm.dob !== initialEdit.dob) data.dob = editForm.dob;
    if (!isEditingSelf) {
      if (editForm.roleName !== initialEdit.roleName) data.roleName = editForm.roleName;
      if (editForm.status !== initialEdit.status) data.status = editForm.status;
    }

    const hasScalar = Object.keys(data).length > 0;
    if (!hasScalar && !editPassword && !editAvatar) {
      toast("Không có thay đổi nào để lưu", { icon: "ℹ️" });
      setModal(null);
      return;
    }

    setSubmitting(true);
    try {
      if (hasScalar) await authService.adminUpdateUser(selectedUser.id, data);
      if (editPassword) await authService.adminSetPassword(selectedUser.id, editPassword);
      if (editAvatar) await authService.adminUploadAvatar(selectedUser.id, editAvatar.file);
      toast.success("Đã cập nhật người dùng");
      setModal(null);
      setEditPassword("");
      if (editAvatar) URL.revokeObjectURL(editAvatar.preview);
      setEditAvatar(null);
      await fetchUsers();
    } catch (e: any) {
      toast.error(e?.message || "Không thể cập nhật người dùng");
    } finally {
      setSubmitting(false);
    }
  };

  // ---------- STATUS / DELETE / RESTORE ----------
  const confirmLock = async () => {
    if (!lockTarget) return;
    const target = lockTarget;
    setSubmitting(true);
    try {
      await authService.toggleUserStatus(target.id);
      toast.success(target.status === "LOCKED" ? "Đã mở khoá tài khoản" : "Đã khoá tài khoản");
      setLockTarget(null);
      await fetchUsers();
    } catch (e: any) {
      toast.error(e?.message || "Thao tác thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setSubmitting(true);
    try {
      await authService.adminSoftDeleteUser(target.id);
      toast.success("Đã chuyển tài khoản sang trạng thái chờ xoá");
      setDeleteTarget(null);
      await fetchUsers();
    } catch (e: any) {
      toast.error(e?.message || "Không thể xoá người dùng");
    } finally {
      setSubmitting(false);
    }
  };

  const confirmRestore = async () => {
    if (!restoreTarget) return;
    const target = restoreTarget;
    setSubmitting(true);
    try {
      await authService.adminRestoreUser(target.id);
      toast.success("Đã khôi phục tài khoản");
      setRestoreTarget(null);
      await fetchUsers();
    } catch (e: any) {
      toast.error(e?.message || "Không thể khôi phục tài khoản");
    } finally {
      setSubmitting(false);
    }
  };

  // ---------- render ----------
  if (loading) {
    return (
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
    );
  }

  return (
    <div className="flex h-full flex-col gap-5 overflow-hidden">
      <div className="flex-1 min-h-0 space-y-5 overflow-y-auto">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <MiniStat icon={UsersIcon} label="Tổng người dùng" value={userCount.toLocaleString("vi-VN")} />
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
                onClick={openCreate}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-[13px] font-medium text-white transition hover:bg-slate-700"
              >
                <Plus className="h-4 w-4" /> Thêm người dùng
              </button>
            </div>
          </div>

          {error ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <p className="text-[13px] text-rose-500">{error}</p>
              <button onClick={fetchUsers} className="rounded-lg border border-slate-200 px-3 py-1.5 text-[13px] font-medium text-slate-600 hover:bg-slate-50">
                Thử lại
              </button>
            </div>
          ) : users.length === 0 ? (
            <EmptyState
              title="Chưa có người dùng nào"
              desc="Danh sách người dùng sẽ hiển thị tại đây khi có dữ liệu."
            />
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
                  {pageUsers.map((u, idx) => {
                    const isSelf = u.id === currentUserId;
                    const isAdmin = roleName(u.role) === "ADMIN";
                    const isPending = u.status === "PENDING_DELETE";
                    const isLocked = u.status === "LOCKED";
                    const canLock = !isSelf && !isAdmin;
                    const canDelete = !isSelf && !isAdmin && !isPending;
                    // Mở menu lên trên với các hàng cuối để tránh bị cắt bởi vùng cuộn.
                    const openUp = pageUsers.length > 3 && idx >= pageUsers.length - 2;
                    return (
                      <tr key={u.id} className="group transition hover:bg-slate-50">
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-3">
                            <UserAvatar url={u.avatarUrl} name={u.fullName} email={u.email} />
                            <div>
                              <p className="text-[13.5px] font-medium text-slate-900">
                                {u.fullName ?? "—"}
                                {isSelf && <span className="ml-1.5 text-[11px] font-normal text-slate-400">(Bạn)</span>}
                              </p>
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
                          <span className={cn("text-[12.5px]", u.lastActiveAt ? "text-slate-500" : "text-slate-400")}>
                            {relativeTime(u.lastActiveAt)}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center justify-end gap-0.5">
                            <button
                              onClick={() => openEdit(u)}
                              title="Xem / Sửa"
                              className="rounded-md p-1.5 text-slate-400 opacity-0 transition hover:bg-slate-100 hover:text-slate-700 group-hover:opacity-100"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            {canLock && (
                              <button
                                onClick={() => setLockTarget(u)}
                                title={isLocked ? "Mở khoá tài khoản" : "Khoá tài khoản"}
                                className="rounded-md p-1.5 text-slate-400 opacity-0 transition hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100"
                              >
                                {isLocked ? <Unlock className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                              </button>
                            )}
                            <div className="relative">
                              <button
                                onClick={() => setMenuFor(menuFor === u.id ? null : u.id)}
                                title="Thao tác khác"
                                className={cn(
                                  "rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700",
                                  menuFor === u.id ? "bg-slate-100 text-slate-700 opacity-100" : "opacity-0 group-hover:opacity-100"
                                )}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </button>
                              {menuFor === u.id && (
                                <>
                                  <div className="fixed inset-0 z-10" onClick={() => setMenuFor(null)} />
                                  <div className={cn(
                                    "absolute right-0 z-20 w-44 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg",
                                    openUp ? "bottom-full mb-1" : "mt-1"
                                  )}>
                                    <MenuItem icon={Pencil} label="Xem / Sửa" onClick={() => openEdit(u)} />
                                    {canLock && (
                                      <MenuItem
                                        icon={isLocked ? Unlock : Lock}
                                        label={isLocked ? "Mở khoá" : "Khoá tài khoản"}
                                        onClick={() => { setMenuFor(null); setLockTarget(u); }}
                                      />
                                    )}
                                    {isPending ? (
                                      <MenuItem
                                        icon={RotateCcw}
                                        label="Khôi phục"
                                        onClick={() => { setMenuFor(null); setRestoreTarget(u); }}
                                      />
                                    ) : (
                                      canDelete && (
                                        <MenuItem
                                          icon={Trash2}
                                          label="Chuyển chờ xoá"
                                          danger
                                          onClick={() => { setMenuFor(null); setDeleteTarget(u); }}
                                        />
                                      )
                                    )}
                                    {(isSelf || isAdmin) && !isPending && (
                                      <p className="px-3 py-1.5 text-[11px] leading-snug text-slate-400">
                                        {isSelf ? "Không thể tự khoá/xoá chính mình" : "Không thể xoá quản trị viên khác"}
                                      </p>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filtered.length > PAGE_SIZE && (
                <Pagination page={safePage} totalPages={totalPages} totalElements={filtered.length} onChange={setPage} />
              )}
              {filtered.length === 0 && (
                <EmptyState
                  title="Không tìm thấy người dùng phù hợp"
                  desc="Thử đổi từ khoá tìm kiếm hoặc bộ lọc vai trò."
                />
              )}
            </div>
          )}
        </Card>
      </div>

      {/* Create user modal */}
      <Modal
        open={modal === "create"}
        onClose={() => !submitting && setModal(null)}
        title="Thêm người dùng"
        desc="Tạo tài khoản mới và chọn vai trò."
        size="sm"
        footer={
          <>
            <button
              onClick={() => setModal(null)}
              disabled={submitting}
              className="rounded-lg px-4 py-2 text-[13px] font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
            >
              Huỷ
            </button>
            <button
              onClick={handleCreate}
              disabled={createInvalid || submitting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-[13px] font-medium text-white transition hover:bg-slate-700 disabled:opacity-50"
            >
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Tạo tài khoản
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <AvatarPicker
            previewUrl={createAvatar?.preview}
            name={createForm.fullName}
            email={createForm.email || "?"}
            onPick={pickCreateAvatar}
            disabled={submitting}
          />
          <Field label="Họ và tên" error={createForm.fullName.length > 0 && createErrors.fullName ? "Vui lòng nhập họ tên" : undefined}>
            <input
              ref={firstFieldRef}
              value={createForm.fullName}
              onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
              className={inputCls(createForm.fullName.length > 0 && createErrors.fullName)}
              placeholder="Ví dụ: Nguyễn Văn A"
            />
          </Field>
          <Field label="Email" error={createForm.email.length > 0 && createErrors.email ? "Email không hợp lệ" : undefined}>
            <input
              type="email"
              value={createForm.email}
              onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
              className={inputCls(createForm.email.length > 0 && createErrors.email)}
              placeholder="ten@email.com"
            />
          </Field>
          <Field label="Mật khẩu" error={createForm.password.length > 0 && createErrors.password ? "Tối thiểu 6 ký tự, gồm chữ và số" : undefined}>
            <input
              type="password"
              value={createForm.password}
              onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
              className={inputCls(createForm.password.length > 0 && createErrors.password)}
              placeholder="••••••••"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Số điện thoại" error={createErrors.phone ? "Phải có 10-11 chữ số" : undefined}>
              <input
                value={createForm.phone}
                onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                className={inputCls(createErrors.phone)}
                placeholder="0901234567"
              />
            </Field>
            <Field label="Ngày sinh">
              <input
                type="date"
                value={createForm.dob}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setCreateForm({ ...createForm, dob: e.target.value })}
                className={inputCls(false)}
              />
            </Field>
          </div>
          <Field label="Vai trò">
            <div className="flex gap-2">
              {(["USER", "ADMIN"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setCreateForm({ ...createForm, role: r })}
                  className={cn(
                    "flex-1 rounded-lg border px-3 py-2 text-[13px] font-medium transition",
                    createForm.role === r
                      ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  )}
                >
                  {r === "USER" ? "Người dùng" : "Quản trị viên"}
                </button>
              ))}
            </div>
          </Field>
        </div>
      </Modal>

      {/* Edit / detail modal */}
      <Modal
        open={modal === "edit"}
        onClose={() => !submitting && setModal(null)}
        title="Chi tiết người dùng"
        desc="Xem thông tin và cập nhật họ tên, vai trò, trạng thái."
        size="sm"
        footer={
          <>
            <button
              onClick={() => setModal(null)}
              disabled={submitting}
              className="rounded-lg px-4 py-2 text-[13px] font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
            >
              Đóng
            </button>
            <button
              onClick={handleSaveEdit}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-[13px] font-medium text-white transition hover:bg-slate-700 disabled:opacity-50"
            >
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Lưu thay đổi
            </button>
          </>
        }
      >
        {selectedUser && (
          <div className="space-y-4">
            <AvatarPicker
              previewUrl={editAvatar?.preview ?? selectedUser.avatarUrl}
              name={editForm.fullName || selectedUser.fullName}
              email={selectedUser.email}
              onPick={pickEditAvatar}
              disabled={submitting}
            />

            <div className="grid grid-cols-3 gap-2 rounded-lg bg-slate-50 p-3 text-center">
              <Stat label="Dự án" value={String(selectedUser.projectCount ?? "—")} />
              <Stat label="Sơ đồ" value={String(selectedUser.diagramCount ?? "—")} />
              <Stat label="Hoạt động cuối" value={relativeTime(selectedUser.lastActiveAt)} />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-[12.5px]">
              <span className="text-slate-400">Ngày tạo</span>
              <span className="font-medium text-slate-700">
                {selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleString("vi-VN") : "—"}
              </span>
            </div>

            <Field label="Họ và tên">
              <input
                value={editForm.fullName}
                onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                className={inputCls(false)}
              />
            </Field>

            <Field label="Email">
              <input
                value={selectedUser.email}
                disabled
                title="Email là định danh đăng nhập, không thể sửa"
                className={cn(inputCls(false), "cursor-not-allowed bg-slate-50 text-slate-400")}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Số điện thoại" error={editPhoneInvalid ? "Phải có 10-11 chữ số" : undefined}>
                <input
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className={inputCls(editPhoneInvalid)}
                  placeholder="0901234567"
                />
              </Field>
              <Field label="Ngày sinh">
                <input
                  type="date"
                  value={editForm.dob}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setEditForm({ ...editForm, dob: e.target.value })}
                  className={inputCls(false)}
                />
              </Field>
            </div>

            <Field
              label="Đặt lại mật khẩu"
              error={editPasswordInvalid ? "Tối thiểu 6 ký tự, gồm chữ và số" : undefined}
            >
              <input
                type="password"
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
                className={inputCls(editPasswordInvalid)}
                placeholder="Để trống nếu không đổi mật khẩu"
                autoComplete="new-password"
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Vai trò">
                <select
                  value={editForm.roleName}
                  disabled={isEditingSelf}
                  onChange={(e) => setEditForm({ ...editForm, roleName: e.target.value as "USER" | "ADMIN" })}
                  className={cn(selectCls, isEditingSelf && "cursor-not-allowed bg-slate-50 text-slate-400")}
                >
                  <option value="USER">Người dùng</option>
                  <option value="ADMIN">Quản trị viên</option>
                </select>
              </Field>
              <Field label="Trạng thái">
                <select
                  value={editForm.status}
                  disabled={isEditingSelf}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value as "ACTIVE" | "LOCKED" })}
                  className={cn(selectCls, isEditingSelf && "cursor-not-allowed bg-slate-50 text-slate-400")}
                >
                  <option value="ACTIVE">Hoạt động</option>
                  <option value="LOCKED">Đã khoá</option>
                </select>
              </Field>
            </div>

            {isEditingSelf && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-[12px] text-amber-700">
                Bạn không thể thay đổi vai trò hoặc trạng thái của chính mình.
              </p>
            )}
            {selectedUser.status === "PENDING_DELETE" && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-[12px] text-amber-700">
                Tài khoản đang chờ xoá. Đặt trạng thái về “Hoạt động” và lưu để khôi phục.
              </p>
            )}
          </div>
        )}
      </Modal>

      {/* Lock / unlock confirm */}
      <ConfirmModal
        open={!!lockTarget}
        onClose={() => setLockTarget(null)}
        loading={submitting}
        title={lockTarget?.status === "LOCKED" ? "Mở khoá tài khoản?" : "Khoá tài khoản?"}
        message={`Bạn có muốn ${lockTarget?.status === "LOCKED" ? "mở khoá" : "khoá"} tài khoản ${lockTarget?.fullName ?? lockTarget?.email} không?${lockTarget?.status !== "LOCKED" ? " Người dùng sẽ không thể đăng nhập cho tới khi được mở khoá lại." : ""}`}
        confirmLabel={lockTarget?.status === "LOCKED" ? "Mở khoá" : "Khoá tài khoản"}
        confirmTone={lockTarget?.status === "LOCKED" ? "slate" : "red"}
        onConfirm={confirmLock}
      />

      {/* Soft-delete confirm */}
      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        loading={submitting}
        title="Chuyển sang chờ xoá?"
        message={`Tài khoản ${deleteTarget?.fullName ?? deleteTarget?.email} sẽ được đánh dấu chờ xoá và bị xoá vĩnh viễn sau 30 ngày. Bạn có thể khôi phục trước thời hạn này.`}
        confirmLabel="Chuyển chờ xoá"
        confirmTone="red"
        onConfirm={confirmDelete}
      />

      {/* Restore confirm */}
      <ConfirmModal
        open={!!restoreTarget}
        onClose={() => setRestoreTarget(null)}
        loading={submitting}
        title="Khôi phục tài khoản?"
        message={`Khôi phục tài khoản ${restoreTarget?.fullName ?? restoreTarget?.email} về trạng thái hoạt động bình thường?`}
        confirmLabel="Khôi phục"
        confirmTone="slate"
        onConfirm={confirmRestore}
      />
    </div>
  );
}

/* ---------- small local helpers ---------- */

const inputCls = (invalid: boolean) =>
  cn(
    "w-full rounded-lg border px-3 py-2 text-[13px] outline-none transition focus:ring-4",
    invalid
      ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100"
      : "border-slate-200 focus:border-indigo-300 focus:ring-indigo-100"
  );

const selectCls =
  "w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100";

function AvatarPicker({
  previewUrl,
  name,
  email,
  onPick,
  disabled,
}: {
  previewUrl?: string;
  name?: string;
  email: string;
  onPick: (file: File) => void;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="flex items-center gap-4">
      <UserAvatar url={previewUrl} name={name} email={email} className="h-16 w-16" />
      <div>
        <button
          type="button"
          disabled={disabled}
          onClick={() => ref.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-[13px] font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        >
          <Camera className="h-4 w-4" /> {previewUrl ? "Đổi ảnh" : "Chọn ảnh"}
        </button>
        <p className="mt-1.5 text-[11px] text-slate-400">JPG, PNG, WEBP · tối đa 2MB</p>
      </div>
      <input
        ref={ref}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPick(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[12.5px] font-medium text-slate-700">{label}</label>
      {children}
      {error && <p className="mt-1 text-[12px] text-rose-500">{error}</p>}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[13px] font-semibold text-slate-900">{value}</p>
      <p className="mt-0.5 text-[11px] text-slate-400">{label}</p>
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] transition",
        danger ? "text-rose-600 hover:bg-rose-50" : "text-slate-600 hover:bg-slate-50"
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function EmptyState({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16">
      <svg viewBox="0 0 120 120" className="h-24 w-24 text-slate-300" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="60" cy="45" r="18" strokeDasharray="4 3" />
        <path d="M28 97c0-18 14-32 32-32s32 14 32 32" strokeDasharray="4 3" />
        <path d="M52 40a6 6 0 0 1 16 0" />
      </svg>
      <p className="text-[15px] font-medium text-slate-400">{title}</p>
      <p className="text-[13px] text-slate-400">{desc}</p>
    </div>
  );
}
