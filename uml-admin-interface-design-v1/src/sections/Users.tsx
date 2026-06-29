import { useMemo, useState } from "react";
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
import { users, type Role, type UserStatus } from "@/data/mock";
import { Avatar, Badge, Card } from "@/components/ui";
import { cn } from "@/utils/cn";

const roleTone: Record<Role, "violet" | "sky" | "slate" | "brand"> = {
  Admin: "violet",
  Manager: "sky",
  Member: "slate",
  Viewer: "brand",
};
const statusMap: Record<UserStatus, { tone: "emerald" | "amber" | "rose"; label: string; dot: string }> = {
  active: { tone: "emerald", label: "Hoạt động", dot: "bg-emerald-500" },
  pending: { tone: "amber", label: "Chờ duyệt", dot: "bg-amber-500" },
  suspended: { tone: "rose", label: "Đã khoá", dot: "bg-rose-500" },
};

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

export default function Users() {
  const [q, setQ] = useState("");
  const [role, setRole] = useState<"all" | Role>("all");

  const filtered = useMemo(
    () =>
      users.filter(
        (u) =>
          (role === "all" || u.role === role) &&
          (u.name.toLowerCase().includes(q.toLowerCase()) ||
            u.email.toLowerCase().includes(q.toLowerCase()))
      ),
    [q, role]
  );

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MiniStat icon={UsersIcon} label="Tổng người dùng" value="2.847" delta="+12,5%" />
        <MiniStat icon={UserCheck} label="Đang hoạt động" value="2.612" />
        <MiniStat icon={UserPlus} label="Chờ phê duyệt" value="18" />
        <MiniStat icon={UsersIcon} label="Quản trị viên" value="6" />
      </div>

      <Card className="p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {(["all", "Admin", "Manager", "Member", "Viewer"] as const).map((r) => (
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
            <button className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-[13px] font-medium text-white transition hover:bg-slate-700">
              <Plus className="h-4 w-4" /> Thêm người dùng
            </button>
          </div>
        </div>

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
                      <Avatar initials={u.initials} color={u.color} />
                      <div>
                        <p className="text-[13.5px] font-medium text-slate-900">{u.name}</p>
                        <p className="text-[12px] text-slate-400">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5"><Badge tone={roleTone[u.role]}>{u.role}</Badge></td>
                  <td className="px-3 py-2.5">
                    <Badge tone={statusMap[u.status].tone}>
                      <span className={cn("h-1.5 w-1.5 rounded-full", statusMap[u.status].dot)} />
                      {statusMap[u.status].label}
                    </Badge>
                  </td>
                  <td className="px-3 py-2.5 text-right text-[13.5px] font-semibold text-slate-900">{u.projects}</td>
                  <td className="px-3 py-2.5 text-right text-[13.5px] text-slate-600">{u.diagrams}</td>
                  <td className="px-3 py-2.5">
                    <span className={cn("text-[12.5px]", u.lastActive === "Đang hoạt động" ? "font-medium text-emerald-600" : "text-slate-500")}>
                      {u.lastActive}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-end gap-0.5 opacity-0 transition group-hover:opacity-100">
                      <button className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><Pencil className="h-4 w-4" /></button>
                      <button className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                      <button className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100"><MoreHorizontal className="h-4 w-4" /></button>
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
      </Card>
    </div>
  );
}
