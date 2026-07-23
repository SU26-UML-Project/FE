import { useEffect, useState } from "react";
import {
  Activity,
  CalendarDays,
  DollarSign,
  FolderKanban,
  Gauge,
  Network,
  Send,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { Sparkline, AreaChart } from "../charts";
import { Avatar, Badge, Card, Skeleton } from "../ui";
import { useAuthStore } from "../../../auth/model/useAuthStore";
import {
  getDashboardUserStats,
  getDashboardProjectStats,
  getDashboardDiagramStats,
  getDashboardOverview,
  getRevenueTrend,
  getTopCostDrivers,
  getTopProjects,
  getAiModelStats,
  getAiErrorLogs,
  type StatCardData,
  type OverviewData,
  type RevenueTrendData,
  type TopCostDriver,
  type TopProject,
  type AiModelStats,
  type AiErrorLogEntry,
  type RangeKey,
} from "../../api/dashboardApi";
import { cn } from "../../../../shared/lib/cn";

function initialsOf(name: string) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const rangeOptions: { key: RangeKey; label: string }[] = [
  { key: "24h", label: "24h" },
  { key: "7d", label: "7 ngày" },
  { key: "30d", label: "30 ngày" },
  { key: "custom", label: "Tuỳ chỉnh" },
];

function StatCard({
  label,
  value,
  delta,
  trend,
  spark,
  icon: Icon,
  color,
  index,
}: {
  label: string;
  value: string;
  delta: string;
  trend: "up" | "down";
  spark: number[];
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  index: number;
}) {
  return (
    <Card
      className="animate-fade-up p-5 transition hover:border-slate-300"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-center justify-between">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
          <Icon className="h-[18px] w-[18px]" />
        </span>
        {delta && (
          <Badge tone={trend === "up" ? "emerald" : "rose"}>
            <TrendingUp className={`h-3 w-3 ${trend === "down" ? "rotate-180" : ""}`} />
            {delta}
          </Badge>
        )}
      </div>
      <p className="mt-4 text-[24px] font-semibold tracking-tight text-slate-900">{value}</p>
      <div className="mt-1 flex items-end justify-between">
        <p className="text-[13px] text-slate-500">{label}</p>
        {spark.length > 0 && <Sparkline data={spark} color={color} />}
      </div>
    </Card>
  );
}

function OverviewStat({ label, value, icon: Icon, color }: { label: string; value: string; icon: React.ComponentType<{ className?: string }>; color: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${color}18`, color }}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[13px] font-semibold text-slate-900">{value}</p>
        <p className="text-[10.5px] text-slate-400">{label}</p>
      </div>
    </div>
  );
}

const statColors = ["#1E40AF", "#3B82F6", "#D97706", "#DC2626"];

export default function Dashboard() {
  const user = useAuthStore((s) => s.user);
  const [range, setRange] = useState<RangeKey>("30d");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [userStat, setUserStat] = useState<StatCardData | null>(null);
  const [projectStat, setProjectStat] = useState<StatCardData | null>(null);
  const [diagramStat, setDiagramStat] = useState<StatCardData | null>(null);
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [topUsers, setTopUsers] = useState<TopCostDriver[]>([]);
  const [topProjects, setTopProjects] = useState<TopProject[]>([]);
  const [aiModelStats, setAiModelStats] = useState<AiModelStats[]>([]);
  const [revenueTrend, setRevenueTrend] = useState<RevenueTrendData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [errorModal, setErrorModal] = useState<{ provider: string; modelName: string } | null>(null);
  const [errorLogs, setErrorLogs] = useState<AiErrorLogEntry[]>([]);
  const [loadingErrors, setLoadingErrors] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    Promise.all([
      getDashboardUserStats(range, from || undefined, to || undefined).catch(() => null),
      getDashboardProjectStats(range, from || undefined, to || undefined).catch(() => null),
      getDashboardDiagramStats(range, from || undefined, to || undefined).catch(() => null),
      getDashboardOverview(range, from || undefined, to || undefined).catch(() => null),
      getAiModelStats(range, from || undefined, to || undefined).catch(() => null),
    ])
      .then(([u, p, d, o, ai]) => {
        setUserStat(u);
        setProjectStat(p);
        setDiagramStat(d);
        setOverview(o);
        setAiModelStats(ai ?? []);
        if (!u && !p && !d && !o) setError(true);
      })
      .finally(() => setLoading(false));
  }, [range, from, to]);

  // Top tables + revenue trend + AI model stats: all-time (BE chưa nhận range/limit) → fetch 1 lần.
  useEffect(() => {
    getTopCostDrivers(5).then(setTopUsers).catch(() => setTopUsers([]));
    getTopProjects(5).then(setTopProjects).catch(() => setTopProjects([]));
    getRevenueTrend().then((d) => setRevenueTrend(d ?? [])).catch(() => setRevenueTrend([]));
  }, []);

  const handleErrorModalOpen = async (provider: string, modelName: string) => {
    setErrorModal({ provider, modelName });
    setLoadingErrors(true);
    getAiErrorLogs(provider, modelName, 20)
      .then((d) => setErrorLogs(d ?? []))
      .catch(() => setErrorLogs([]))
      .finally(() => setLoadingErrors(false));
  };

  const handleErrorModalClose = () => {
    setErrorModal(null);
    setErrorLogs([]);
  };

  const fmtToday = () => new Date().toISOString().slice(0, 10);

  const handleRange = (key: RangeKey) => {
    setRange(key);
    if (key !== "custom") { setFrom(""); setTo(""); }
    else { setFrom(fmtToday()); setTo(fmtToday()); }
  };

  const fmtDelta = (d: number) => `${d > 0 ? "+" : ""}${d.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%`;

  const statCards = [
    { id: "users", label: "Tổng người dùng", icon: Users, data: userStat, color: statColors[0] },
    { id: "projects", label: "Dự án toàn hệ thống", icon: FolderKanban, data: projectStat, color: statColors[1] },
    { id: "diagrams", label: "Sơ đồ UML đã tạo", icon: Network, data: diagramStat, color: statColors[2] },
    {
      id: "latency",
      label: "Độ trễ AI trung bình",
      icon: Activity,
      color: statColors[3],
      data: overview?.ai
        ? { total: Math.round(overview.ai.avgLatencyMs), delta: 0, trend: "up" as const, sparkline: [] }
        : null,
      valueSuffix: "ms",
    },
  ];

  const totalProjects = projectStat?.total ?? 0;
  const totalUsers = overview?.users?.total ?? 0;

  if (loading && !userStat) {
    return (
      <div className="flex h-full flex-col gap-5 overflow-hidden">
        <div className="animate-pulse space-y-5">
          <Card className="flex flex-col gap-4 p-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-6 w-72" />
              <Skeleton className="h-4 w-96" />
            </div>
            <Skeleton className="h-10 w-64 rounded-lg" />
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-4 w-4" />
              <div className="flex gap-1">
                {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-8 w-14 rounded-md" />)}
              </div>
            </div>
          </Card>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="p-5">
                <Skeleton className="h-9 w-9 rounded-lg" />
                <Skeleton className="mt-4 h-7 w-24" />
                <Skeleton className="mt-2 h-4 w-36" />
              </Card>
            ))}
          </div>
          <div className="grid gap-4 xl:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="flex items-center gap-2.5 p-4">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-3.5 w-20" />
                  <Skeleton className="h-2.5 w-14" />
                </div>
              </Card>
            ))}
          </div>
      </div>

    </div>
  );
}

  return (
    <div className="flex h-full flex-col gap-5 overflow-hidden">
      <div className="flex-1 min-h-0 space-y-5 overflow-y-auto">
      {/* Welcome + AI prompt */}
      <Card className="flex flex-col gap-4 p-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Badge tone="brand" className="mb-2">
            <Sparkles className="h-3 w-3" /> Hệ thống UML · Trợ lý AI
          </Badge>
          <h2 className="text-[22px] font-semibold tracking-tight text-slate-900">Xin chào, {user?.fullName ?? "Admin"} 👋</h2>
          <p className="mt-1 max-w-lg text-[14px] leading-relaxed text-slate-500">
            Có{" "}
            <span className="font-semibold text-slate-700">
              {totalProjects.toLocaleString("vi-VN")} dự án
            </span>{" "}
            đang vận hành và{" "}
            <span className="font-semibold text-indigo-600">{totalUsers.toLocaleString("vi-VN")} người dùng</span>{" "}
            trên hệ thống.
          </p>
        </div>
        <div className="flex w-full max-w-md items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2 lg:w-auto">
          <input
            placeholder="Ví dụ: Class Diagram cho Core Banking…"
            className="flex-1 bg-transparent px-2 text-[13.5px] text-slate-700 outline-none placeholder:text-slate-400"
          />
          <button className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-[13px] font-medium text-white transition hover:bg-slate-700">
            <Send className="h-4 w-4" /> Sinh sơ đồ
          </button>
        </div>
      </Card>

      {/* Range filter */}
      <Card className="flex flex-wrap items-center gap-3 p-4">
        <CalendarDays className="h-4 w-4 text-slate-400" />
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
          {rangeOptions.map((opt) => (
            <button
              key={opt.key}
              onClick={() => handleRange(opt.key)}
              className={cn(
                "rounded-md px-3.5 py-1.5 text-[13px] font-medium transition",
                range === opt.key ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {range === "custom" && (
          <div className="flex items-center gap-2">
            <span className="text-[13px] text-slate-400">Từ</span>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[13px] outline-none"
            />
            <span className="text-[13px] text-slate-400">Đến</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[13px] outline-none"
            />
          </div>
        )}
        {loading && <span className="text-[12px] text-slate-400">Đang tải...</span>}
      </Card>

      {error ? (
        <Card className="flex flex-col items-center gap-4 p-10 text-center">
          <p className="text-[14px] text-slate-500">Không thể tải dữ liệu dashboard.</p>
        </Card>
      ) : (
        <>

      {/* === SECTION 1: Stat Cards (KPI cards) === */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((s, i) => (
          <StatCard
            key={s.id}
            label={s.label}
            value={s.data ? s.data.total.toLocaleString("vi-VN") + (s.id === "latency" ? "ms" : "") : "—"}
            delta={s.data ? fmtDelta(s.data.delta) : ""}
            trend={s.data?.trend ?? "up"}
            spark={s.data?.sparkline ?? []}
            icon={s.icon}
            color={s.color}
            index={i}
          />
        ))}
      </div>

      {/* === SECTION 2: System Health (compact metrics) === */}
      {overview && (
        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <Gauge className="h-4 w-4 text-slate-400" />
            <h3 className="text-[14px] font-semibold text-slate-900">Sức khoẻ hệ thống</h3>
            <span className="text-[12px] text-slate-400">· DAU/MAU · Doanh thu</span>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
            <OverviewStat icon={Users} label="Tổng người dùng" value={overview.users.total.toLocaleString("vi-VN")} color="#1E40AF" />
            <OverviewStat icon={Activity} label="DAU (24h)" value={overview.users.dau.toLocaleString("vi-VN")} color="#3B82F6" />
            <OverviewStat icon={Users} label="MAU (30d)" value={overview.users.mau.toLocaleString("vi-VN")} color="#D97706" />
            <OverviewStat icon={Zap} label={`Tỷ lệ DAU/MAU`} value={`${overview.users.mau > 0 ? ((overview.users.dau / overview.users.mau) * 100).toFixed(1) : 0}%`} color="#10b981" />
            <OverviewStat icon={DollarSign} label="MRR" value={`${overview.revenue.mrr.toLocaleString("vi-VN", { minimumFractionDigits: 2 })} ₫`} color="#1E40AF" />
            <OverviewStat icon={TrendingUp} label="ARPU" value={`${overview.revenue.arpu.toLocaleString("vi-VN", { minimumFractionDigits: 2 })} ₫`} color="#D97706" />
            <OverviewStat icon={Activity} label="Tỉ lệ rời bỏ" value={`${overview.revenue.churnRate}%`} color="#DC2626" />
          </div>
        </Card>
      )}

      {/* === SECTION 3: Revenue Trend (MRR Chart) + AI Model Stats (comparative grid) === */}
      <div className="grid gap-4 xl:grid-cols-2">
        {revenueTrend.length > 1 && (
          <Card className="p-5">
            <div className="mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-slate-400" />
              <h3 className="text-[14px] font-semibold text-slate-900">Xu hướng doanh thu</h3>
              <span className="text-[12px] text-slate-400">· MRR theo ngày</span>
            </div>
            <AreaChart
              data={revenueTrend.map((r) => ({ m: r.date.slice(5).replace("-", "/"), v: r.mrr }))}
              color="#1E40AF"
            />
          </Card>
        )}

        {aiModelStats.length > 0 && (
          <Card className="p-5">
            <div className="mb-3 flex items-center gap-2">
              <Zap className="h-4 w-4 text-slate-400" />
              <h3 className="text-[14px] font-semibold text-slate-900">Thống kê mô hình AI</h3>
              <span className="text-[12px] text-slate-400">· Nhà cung cấp / Mô hình</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-[11.5px] font-semibold uppercase tracking-wider text-slate-400">
                    <th className="pb-2 pr-4">Nhà cung cấp</th>
                    <th className="pb-2 pr-4">Mô hình</th>
                    <th className="pb-2 pr-4 text-right">Yêu cầu</th>
                    <th className="pb-2 pr-4 text-right">Lỗi</th>
                    <th className="pb-2 pr-4 text-right">Tỉ lệ</th>
                    <th className="pb-2 pr-4 text-right">Token</th>
                    <th className="pb-2 text-right">Chi phí</th>
                  </tr>
                </thead>
                <tbody>
                  {aiModelStats.map((m) => (
                    <tr key={`${m.provider}-${m.modelName}`} className="cursor-pointer border-b border-slate-100 last:border-0 transition hover:bg-blue-50" onClick={() => handleErrorModalOpen(m.provider, m.modelName)}>
                      <td className="py-2.5 pr-4 font-medium text-slate-900">{m.provider}</td>
                      <td className="py-2.5 pr-4 text-slate-700">{m.modelName}</td>
                      <td className="py-2.5 pr-4 text-right text-slate-900">{m.totalRequests.toLocaleString("vi-VN")}</td>
                      <td className="py-2.5 pr-4 text-right">
                        <span className={m.errorCount > 0 ? "text-rose-600 font-medium" : "text-slate-500"}>
                          {m.errorCount.toLocaleString("vi-VN")}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 text-right">
                        <span className={m.errorRate > 0 ? "text-rose-600 font-medium" : "text-slate-500"}>
                          {m.errorRate}%
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 text-right text-slate-900">{m.totalTokens.toLocaleString("vi-VN")}</td>
                      <td className="py-2.5 text-right text-slate-900">${m.totalCostUsd.toLocaleString("vi-VN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* === SECTION 4: Power-User Tables (2-column) === */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <Zap className="h-4 w-4 text-slate-400" />
            <h3 className="text-[14px] font-semibold text-slate-900">Top người dùng AI</h3>
            <span className="text-[12px] text-slate-400">· theo lượt truy vấn</span>
          </div>
          {topUsers.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-slate-400">Chưa có dữ liệu.</p>
          ) : (
            <div className="space-y-1">
              {topUsers.map((u, i) => (
                <div key={u.userId} className="flex items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-blue-50 hover:shadow-sm">
                  <span className="w-4 shrink-0 text-center text-[12px] font-semibold text-slate-400">{i + 1}</span>
                  <Avatar initials={initialsOf(u.fullName)} size="h-8 w-8" color={statColors[i % statColors.length]} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-slate-900">{u.fullName || "—"}</p>
                    <p className="truncate text-[11.5px] text-slate-400">{u.email}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[13px] font-semibold text-slate-900">{u.requestCount.toLocaleString("vi-VN")}</p>
                    <p className="text-[10.5px] text-slate-400">lượt AI</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <Network className="h-4 w-4 text-slate-400" />
            <h3 className="text-[14px] font-semibold text-slate-900">Top dự án</h3>
            <span className="text-[12px] text-slate-400">· theo số sơ đồ</span>
          </div>
          {topProjects.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-slate-400">Chưa có dữ liệu.</p>
          ) : (
            <div className="space-y-1">
              {topProjects.map((p, i) => (
                <div key={p.projectId} className="flex items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-blue-50 hover:shadow-sm">
                  <span className="w-4 shrink-0 text-center text-[12px] font-semibold text-slate-400">{i + 1}</span>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                    <FolderKanban className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-slate-900">{p.projectName || "—"}</p>
                    <p className="truncate text-[11.5px] text-slate-400">{p.ownerEmail}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[13px] font-semibold text-slate-900">{p.diagramCount.toLocaleString("vi-VN")}</p>
                    <p className="text-[10.5px] text-slate-400">sơ đồ</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      </>
      )}

      {/* Error log modal */}
      {errorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={handleErrorModalClose}>
          <div className="mx-4 w-full max-w-2xl rounded-xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h3 className="text-[15px] font-semibold text-slate-900">
                Lỗi AI — {errorModal.provider} / {errorModal.modelName}
              </h3>
              <button onClick={handleErrorModalClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="max-h-[60vh] min-h-[200px] overflow-y-auto p-5">
              {loadingErrors ? (
                <div className="flex items-center justify-center py-10">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
                </div>
              ) : errorLogs.length === 0 ? (
                <p className="py-10 text-center text-[14px] text-slate-400">Không có lỗi nào.</p>
              ) : (
                <div className="space-y-2">
                  {errorLogs.map((log, i) => (
                    <div key={i} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                      <p className="text-[12px] text-slate-400">{new Date(log.createdAt).toLocaleString("vi-VN")}</p>
                      <p className="mt-1 text-[13px] text-slate-700">{log.errorMessage}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="border-t border-slate-200 px-5 py-3 text-right text-[12px] text-slate-400">
              Hiện {errorLogs.length} bản ghi
            </div>
          </div>
        </div>
      )}

      </div>
    </div>
  );
}
