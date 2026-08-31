import { useEffect, useState } from "react";
import { ChevronRight, FolderKanban, LayoutGrid, List, Loader2 } from "lucide-react";
import { projectService } from "../../../projects/api/projectApi";
import type { OwnerGroup, ProjectResponse, ProjectStats } from "../../../projects/types";
import { Avatar, Badge, Card, Segmented, Skeleton } from "../ui";
import { Pagination } from "../Pagination";
import { cn } from "../../../../shared/lib/cn";

const OWNERS_PAGE_SIZE = 10;
const PROJECTS_PAGE_SIZE = 5;

// State phân trang TẦNG TRONG cho từng owner (lazy-load + load-more, cộng dồn).
interface OwnerProjectsState {
  items: ProjectResponse[];
  page: number;
  totalPages: number;
  totalElements: number;
  loading: boolean;
}

const EMPTY_OWNER_STATE: OwnerProjectsState = { items: [], page: 0, totalPages: 1, totalElements: 0, loading: false };

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

// Thẻ dự án (grid). showOwner=true để hiện chủ sở hữu ở chế độ "Tất cả dự án".
function ProjectCard({ p, showOwner = false }: { p: ProjectResponse; showOwner?: boolean }) {
  return (
    <div className="group rounded-xl border border-slate-200 bg-white p-4 shadow-soft hover-lift hover:border-slate-300">
      <div className="flex items-start justify-between">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
          <FolderKanban className="h-5 w-5" />
        </span>
        {p.isDraft && <Badge tone="slate">Bản nháp</Badge>}
      </div>
      <h4 className="mt-3 text-[14.5px] font-semibold text-slate-900">{p.projectName}</h4>
      <p className="text-[12px] text-slate-400">{p.description ?? "—"}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-slate-50 p-2">
          <p className="text-[11px] text-slate-400">Sơ đồ</p>
          <p className="text-[15px] font-semibold text-slate-900">{p.diagramCount ?? "—"}</p>
        </div>
        <div className="rounded-lg bg-slate-50 p-2">
          <p className="text-[11px] text-slate-400">Cập nhật</p>
          <p className="text-[12.5px] font-medium text-slate-600">{relativeTime(p.updatedAt)}</p>
        </div>
      </div>
      {showOwner && (
        <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
          {p.ownerName ? (
            <>
              <Avatar initials={getInitials(p.ownerName)} color={hashColor(p.ownerName)} size="h-6 w-6" />
              <span className="text-[12px] text-slate-500">{p.ownerName}</span>
            </>
          ) : (
            <span className="text-[12px] text-slate-400">—</span>
          )}
        </div>
      )}
    </div>
  );
}

export default function Projects() {
  // Toggle grid/table cạnh nút "Tạo dự án" điều khiển 2 chế độ:
  //   grid  = danh sách phẳng TẤT CẢ dự án
  //   table = gom nhóm theo chủ sở hữu (phân trang 2 tầng)
  const [view, setView] = useState<"grid" | "table">("table");

  // 1) Stats toàn hệ thống (độc lập phân trang)
  const [stats, setStats] = useState<ProjectStats | null>(null);

  // Chế độ "Tất cả dự án" — danh sách phẳng phân trang (endpoint /projects/admin/all)
  const [allProjects, setAllProjects] = useState<ProjectResponse[]>([]);
  const [allPage, setAllPage] = useState(0);
  const [allTotalPages, setAllTotalPages] = useState(1);
  const [allTotalElements, setAllTotalElements] = useState(0);
  const [allLoading, setAllLoading] = useState(false);

  // 2) Owners — phân trang TẦNG NGOÀI
  const [owners, setOwners] = useState<OwnerGroup[]>([]);
  const [ownersPage, setOwnersPage] = useState(0);
  const [ownersTotalPages, setOwnersTotalPages] = useState(1);
  const [ownersTotalElements, setOwnersTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 3) Projects theo owner — phân trang TẦNG TRONG (lazy per owner)
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [ownerData, setOwnerData] = useState<Record<string, OwnerProjectsState>>({});

  useEffect(() => {
    projectService.getAdminProjectStats().then((r) => setStats(r.result)).catch(() => {});
  }, []);

  // Nạp danh sách phẳng khi ở chế độ "Tất cả dự án" (view = grid)
  useEffect(() => {
    if (view !== "grid") return;
    let cancelled = false;
    setAllLoading(true);
    projectService
      .getAllProjectsForAdmin(allPage, 12)
      .then((r) => {
        if (cancelled) return;
        setAllProjects(r.result.content);
        setAllTotalPages(r.result.totalPages);
        setAllTotalElements(r.result.totalElements);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setAllLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [view, allPage]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    projectService
      .getAdminProjectOwners(ownersPage, OWNERS_PAGE_SIZE)
      .then((r) => {
        if (cancelled) return;
        setOwners(r.result.content);
        setOwnersTotalPages(r.result.totalPages);
        setOwnersTotalElements(r.result.totalElements);
      })
      .catch(() => {
        if (!cancelled) setError("Không thể tải danh sách dự án");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ownersPage]);

  const loadOwnerProjects = async (ownerId: string, page: number) => {
    setOwnerData((prev) => ({
      ...prev,
      [ownerId]: { ...(prev[ownerId] ?? EMPTY_OWNER_STATE), loading: true },
    }));
    try {
      const r = await projectService.getAdminProjectsByOwner(ownerId, page, PROJECTS_PAGE_SIZE);
      setOwnerData((prev) => {
        const existing = prev[ownerId]?.items ?? [];
        const items = page === 0 ? r.result.content : [...existing, ...r.result.content];
        return {
          ...prev,
          [ownerId]: {
            items,
            page: r.result.page,
            totalPages: r.result.totalPages,
            totalElements: r.result.totalElements,
            loading: false,
          },
        };
      });
    } catch {
      setOwnerData((prev) => ({
        ...prev,
        [ownerId]: { ...(prev[ownerId] ?? EMPTY_OWNER_STATE), loading: false },
      }));
    }
  };

  const toggleOwner = (ownerId: string) => {
    const isOpen = expanded.has(ownerId);
    setExpanded((prev) => {
      const next = new Set(prev);
      if (isOpen) next.delete(ownerId);
      else next.add(ownerId);
      return next;
    });
    // Lazy-load trang đầu khi mở lần đầu
    if (!isOpen && !ownerData[ownerId]) loadOwnerProjects(ownerId, 0);
  };

  return (
    <div className="flex h-full flex-col gap-5 overflow-hidden">
      {loading ? (
        <div className="animate-pulse space-y-5">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="p-4">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="mt-2 h-6 w-16" />
              </Card>
            ))}
          </div>
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-9 w-32 rounded-lg" />
            </div>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full rounded-xl" />
              ))}
            </div>
          </Card>
        </div>
      ) : (
        <div className="flex-1 min-h-0 space-y-5 overflow-y-auto">
          <StatCard label="Tổng dự án" value={(stats?.total ?? 0).toLocaleString("vi-VN")} />

          <Card className="relative p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[14px] font-semibold text-slate-900">
                {view === "grid" ? "Tất cả dự án" : "Dự án theo chủ sở hữu"}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Segmented
                  value={view}
                  onChange={setView}
                  options={[
                    { id: "grid", label: "", icon: <LayoutGrid className="h-4 w-4" /> },
                    { id: "table", label: "", icon: <List className="h-4 w-4" /> },
                  ]}
                />

              </div>
            </div>

            {view === "grid" ? (
              allLoading && allProjects.length === 0 ? (
                <div aria-hidden className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <Skeleton className="h-3.5 w-3/4" />
                          <Skeleton className="h-3 w-1/2" />
                        </div>
                      </div>
                      <div className="mt-4 space-y-2">
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-5/6" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : allProjects.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-4 py-16">
                  <p className="text-[15px] font-medium text-slate-400">Không có dự án nào</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {allProjects.map((p) => (
                    <ProjectCard key={p.id} p={p} showOwner />
                  ))}
                </div>
              )
            ) : error ? (
              <p className="py-10 text-center text-[13px] text-rose-500">{error}</p>
            ) : owners.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-4 py-16">
                <svg viewBox="0 0 120 120" className="h-28 w-28 text-slate-300" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 30h38l8 12h42v52H16z" strokeDasharray="4 3" />
                  <path d="M36 60h48M36 74h36" />
                  <circle cx="90" cy="44" r="3" />
                </svg>
                <p className="text-[15px] font-medium text-slate-400">Không có dự án nào</p>
                <p className="text-[13px] text-slate-400">Danh sách dự án sẽ hiển thị tại đây khi có dữ liệu.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {owners.map((owner) => {
                  const name = owner.ownerName ?? owner.ownerEmail ?? "Không rõ";
                  const isOpen = expanded.has(owner.ownerId);
                  const data = ownerData[owner.ownerId];
                  const remaining = data ? data.totalElements - data.items.length : owner.projectCount;
                  return (
                    <div key={owner.ownerId} className="overflow-hidden rounded-xl border border-slate-200">
                      <button
                        onClick={() => toggleOwner(owner.ownerId)}
                        className="flex w-full items-center gap-2.5 bg-slate-50/60 px-4 py-3 text-left transition hover:bg-slate-100/70"
                      >
                        <ChevronRight className={cn("h-4 w-4 shrink-0 text-slate-400 transition-transform", isOpen && "rotate-90")} />
                        <Avatar initials={getInitials(name)} color={hashColor(name)} size="h-7 w-7" />
                        <span className="text-[13px] font-semibold text-slate-900">{name}</span>
                        {owner.ownerEmail && owner.ownerName && (
                          <span className="text-[11.5px] text-slate-400">{owner.ownerEmail}</span>
                        )}
                        <Badge tone="slate">{owner.projectCount} dự án</Badge>
                      </button>

                      {isOpen && (
                        <div className="border-t border-slate-100 p-4">
                          {data?.loading && data.items.length === 0 ? (
                            <div aria-hidden className="space-y-2 py-2">
                              {Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="flex items-center gap-3 px-3 py-1.5">
                                  <Skeleton className="h-3.5 flex-1" />
                                  <Skeleton className="h-3.5 w-10" />
                                  <Skeleton className="h-3.5 w-24" />
                                </div>
                              ))}
                            </div>
                          ) : (
                            // Xem theo cá nhân: dự án bên trong luôn là bảng gọn (không dùng card bự)
                            <div className="-mx-2 overflow-x-auto">
                              <table className="w-full min-w-[560px] border-collapse text-left">
                                <thead>
                                  <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wide text-slate-400">
                                    <th className="px-3 py-2 font-semibold">Dự án</th>
                                    <th className="px-3 py-2 text-right font-semibold">Sơ đồ</th>
                                    <th className="px-3 py-2 font-semibold">Cập nhật</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(data?.items ?? []).map((p) => (
                                    <tr key={p.id} className="border-b border-slate-50 transition hover:bg-slate-50">
                                      <td className="px-3 py-2.5">
                                        <div className="flex items-center gap-2.5">
                                          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500"><FolderKanban className="h-4 w-4" /></span>
                                          <div>
                                            <p className="text-[13px] font-medium text-slate-900">{p.projectName}</p>
                                            <p className="text-[11.5px] text-slate-400">{p.description ?? "—"}</p>
                                          </div>
                                        </div>
                                      </td>
                                      <td className="px-3 py-2.5 text-right text-[13px] font-semibold text-slate-900">{p.diagramCount ?? "—"}</td>
                                      <td className="px-3 py-2.5 text-[12px] text-slate-400">{relativeTime(p.updatedAt)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}

                          {data && remaining > 0 && (
                            <div className="mt-3 flex justify-center">
                              <button
                                onClick={() => loadOwnerProjects(owner.ownerId, data.page + 1)}
                                disabled={data.loading}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-1.5 text-[13px] font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                              >
                                {data.loading && <Loader2 className="h-4 w-4 animate-spin" />}
                                Tải thêm (còn {remaining})
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {view === "grid"
              ? allTotalPages > 1 && (
                  <Pagination page={allPage} totalPages={allTotalPages} totalElements={allTotalElements} onChange={setAllPage} />
                )
              : !error && ownersTotalPages > 1 && (
                  <Pagination page={ownersPage} totalPages={ownersTotalPages} totalElements={ownersTotalElements} onChange={setOwnersPage} />
                )}
          </Card>
        </div>
      )}
    </div>
  );
}
