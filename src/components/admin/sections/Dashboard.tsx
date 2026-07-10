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
import { Sparkline } from "../charts";
import { Badge, Card, Skeleton } from "../ui";
import { useAuthStore } from "../../../stores/useAuthStore";
import {
  getDashboardUserStats,
  getDashboardProjectStats,
  getDashboardDiagramStats,
  getDashboardOverview,
  getRevenueTrend,
  type StatCardData,
  type OverviewData,
  type RevenueTrendData,
  type RangeKey,
} from "../../../services/dashboardService";
import { cn } from "../../../utils/cn";

const statColors = ["#6366f1", "#0ea5e9", "#8b5cf6", "#f43f5e"];

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

export default function Dashboard() {
  const user = useAuthStore((s) => s.user);
  const [range, setRange] = useState<RangeKey>("30d");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [userStat, setUserStat] = useState<StatCardData | null>(null);
  const [projectStat, setProjectStat] = useState<StatCardData | null>(null);
  const [diagramStat, setDiagramStat] = useState<StatCardData | null>(null);
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    Promise.all([
      getDashboardUserStats(range, from || undefined, to || undefined).catch(() => null),
      getDashboardProjectStats(range, from || undefined, to || undefined).catch(() => null),
      getDashboardDiagramStats(range, from || undefined, to || undefined).catch(() => null),
      getDashboardOverview(range, from || undefined, to || undefined).catch(() => null),
    ])
      .then(([u, p, d, o]) => {
        setUserStat(u);
        setProjectStat(p);
        setDiagramStat(d);
        setOverview(o);
        if (!u && !p && !d && !o) setError(true);
      })
      .finally(() => setLoading(false));
  }, [range, from, to]);

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
            <Sparkles className="h-3 w-3" /> Hệ thống UML · AI Agent
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
      {/* Stat cards */}
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

      {/* System Health + Revenue overview */}
      {overview && (
        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <Gauge className="h-4 w-4 text-slate-400" />
            <h3 className="text-[14px] font-semibold text-slate-900">Sức khoẻ hệ thống</h3>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
            <OverviewStat icon={Users} label="Tổng người dùng" value={overview.users.total.toLocaleString("vi-VN")} color="#6366f1" />
            <OverviewStat icon={Activity} label="DAU (24h)" value={overview.users.dau.toLocaleString("vi-VN")} color="#0ea5e9" />
            <OverviewStat icon={Users} label="MAU (30d)" value={overview.users.mau.toLocaleString("vi-VN")} color="#8b5cf6" />
            <OverviewStat icon={Zap} label={`Tỷ lệ DAU/MAU`} value={`${overview.users.mau > 0 ? ((overview.users.dau / overview.users.mau) * 100).toFixed(1) : 0}%`} color="#10b981" />
            <OverviewStat icon={DollarSign} label="MRR" value={`${overview.revenue.mrr.toLocaleString("vi-VN", { minimumFractionDigits: 2 })} ₫`} color="#f59e0b" />
            <OverviewStat icon={TrendingUp} label="ARPU" value={`${overview.revenue.arpu.toLocaleString("vi-VN", { minimumFractionDigits: 2 })} ₫`} color="#06b6d4" />
            <OverviewStat icon={Activity} label="Churn rate" value={`${overview.revenue.churnRate}%`} color="#f43f5e" />
            <OverviewStat icon={DollarSign} label="SaaS Margin" value={`${overview.revenue.margin.toLocaleString("vi-VN", { minimumFractionDigits: 2 })} ₫`} color="#6366f1" />
          </div>
        </Card>
      )}

      </>
      )}
      </div>
    </div>
  );
}
