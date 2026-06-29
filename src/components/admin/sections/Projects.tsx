import { useEffect, useState } from "react";
import { FolderKanban, LayoutGrid, List, Plus } from "lucide-react";
import { projectService } from "../../../services/projectService";
import type { ProjectResponse } from "../../../types/project";
import { Avatar, Badge, Card, Segmented } from "../ui";
import LoadingOverlay from "../../ui/LoadingOverlay";

const statusMeta: Record<string, { tone: "emerald" | "amber" | "slate"; label: string }> = {
  "on-track": { tone: "emerald", label: "Đúng tiến độ" },
  "at-risk": { tone: "amber", label: "Cần chú ý" },
  draft: { tone: "slate", label: "Bản nháp" },
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

function projectStatus(p: ProjectResponse): "on-track" | "draft" {
  return p.isDraft ? "draft" : "on-track";
}

function StatCard({ label, value, delta }: { label: string; value: string; delta?: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-slate-500">{label}</p>
        {delta && <Badge tone="emerald">{delta}</Badge>}
      </div>
      <p className="mt-2 text-[22px] font-semibold tracking-tight text-slate-900">{value}</p>
    </Card>
  );
}

export default function Projects() {
  const [view, setView] = useState<"grid" | "table">("grid");
  const [projects, setProjects] = useState<ProjectResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await projectService.getAllProjectsForAdmin();
        setProjects(res.result);
      } catch {
        setError("Không thể tải danh sách dự án");
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const onTrack = projects.filter((p) => !p.isDraft).length;
  const draftCount = projects.filter((p) => p.isDraft).length;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Tổng dự án" value={projects.length.toLocaleString("vi-VN")} />
        <StatCard label="Đúng tiến độ" value={onTrack.toLocaleString("vi-VN")} />
        <StatCard label="Cần chú ý" value="0" />
        <StatCard label="Bản nháp" value={draftCount.toLocaleString("vi-VN")} />
      </div>

      <Card className="relative p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-[14px] font-semibold text-slate-900">Tất cả dự án</p>
          <div className="flex items-center gap-2">
            <Segmented
              value={view}
              onChange={setView}
              options={[
                { id: "grid", label: "", icon: <LayoutGrid className="h-4 w-4" /> },
                { id: "table", label: "", icon: <List className="h-4 w-4" /> },
              ]}
            />
            <button className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-[13px] font-medium text-white transition hover:bg-slate-700">
              <Plus className="h-4 w-4" /> Tạo dự án
            </button>
          </div>
        </div>

        {loading ? (
          <LoadingOverlay message="Đang tải..." />
        ) : error ? (
          <p className="py-10 text-center text-[13px] text-rose-500">{error}</p>
        ) : view === "grid" ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {projects.map((p) => (
              <div key={p.id} className="group rounded-xl border border-slate-200 bg-white p-4 shadow-soft hover-lift hover:border-slate-300">
                <div className="flex items-start justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                    <FolderKanban className="h-5 w-5" />
                  </span>
                  <Badge tone={statusMeta[projectStatus(p)].tone}>{statusMeta[projectStatus(p)].label}</Badge>
                </div>
                <h4 className="mt-3 text-[14.5px] font-semibold text-slate-900">{p.projectName}</h4>
                <p className="text-[12px] text-slate-400">{p.description ?? "—"}</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-slate-50 p-2">
                    <p className="text-[11px] text-slate-400">Sơ đồ</p>
                    <p className="text-[15px] font-semibold text-slate-900">{p.diagramCount ?? "—"}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2">
                    <p className="text-[11px] text-slate-400">Thành viên</p>
                    <p className="text-[15px] font-semibold text-slate-900">—</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                  <div className="flex items-center gap-2">
                    {p.ownerName ? (
                      <>
                        <Avatar initials={getInitials(p.ownerName)} color={hashColor(p.ownerName)} size="h-6 w-6" />
                        <span className="text-[12px] text-slate-500">{p.ownerName}</span>
                      </>
                    ) : (
                      <span className="text-[12px] text-slate-400">—</span>
                    )}
                  </div>
                  <span className="text-[11.5px] text-slate-400">{relativeTime(p.updatedAt)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="-mx-2 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wide text-slate-400">
                  <th className="px-3 py-2 font-semibold">Dự án</th>
                  <th className="px-3 py-2 font-semibold">Chủ sở hữu</th>
                  <th className="px-3 py-2 text-right font-semibold">Sơ đồ</th>
                  <th className="px-3 py-2 text-right font-semibold">Thành viên</th>
                  <th className="px-3 py-2 font-semibold">Trạng thái</th>
                  <th className="px-3 py-2 font-semibold">Cập nhật</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {projects.map((p) => (
                  <tr key={p.id} className="transition hover:bg-slate-50">
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500"><FolderKanban className="h-4 w-4" /></span>
                        <div>
                          <p className="text-[13px] font-medium text-slate-900">{p.projectName}</p>
                          <p className="text-[11.5px] text-slate-400">{p.description ?? "—"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      {p.ownerName ? (
                        <div className="flex items-center gap-2">
                          <Avatar initials={getInitials(p.ownerName)} color={hashColor(p.ownerName)} size="h-6 w-6" />
                          <span className="text-[12.5px] text-slate-600">{p.ownerName}</span>
                        </div>
                      ) : (
                        <span className="text-[12.5px] text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right text-[13px] font-semibold text-slate-900">{p.diagramCount ?? "—"}</td>
                    <td className="px-3 py-2.5 text-right text-[13px] text-slate-600">—</td>
                    <td className="px-3 py-2.5"><Badge tone={statusMeta[projectStatus(p)].tone}>{statusMeta[projectStatus(p)].label}</Badge></td>
                    <td className="px-3 py-2.5 text-[12px] text-slate-400">{relativeTime(p.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
