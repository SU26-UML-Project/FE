import { useEffect, useState } from "react";
import { Activity, CalendarDays, FolderKanban, Network, Send, Sparkles, TrendingUp, Users } from "lucide-react";
import {
  activityFeed,
  subscriptionPlans,
  planUsage,
  topContributors,
  umlDistribution,
} from "../data";
import { ChartLegend, Donut, GroupedBarChart, Sparkline } from "../charts";
import { Avatar, Badge, Card, Skeleton } from "../ui";
import { useAuthStore } from "../../../stores/useAuthStore";
import {
  getDashboardUserStats,
  getDashboardProjectStats,
  getDashboardDiagramStats,
  type StatCardData,
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

const cardConfig: { id: string; label: string; icon: typeof Users; value: string; delta: string; trend: "up" | "down"; spark: number[] }[] = [
  { id: "users", label: "Tổng người dùng", icon: Users, value: "—", delta: "", trend: "up", spark: [] },
  { id: "projects", label: "Dự án toàn hệ thống", icon: FolderKanban, value: "—", delta: "", trend: "up", spark: [] },
  { id: "diagrams", label: "Sơ đồ UML đã tạo", icon: Network, value: "—", delta: "", trend: "up", spark: [] },
  { id: "latency", label: "Độ trễ AI trung bình", icon: Activity, value: "1,2s", delta: "-9,4%", trend: "down", spark: [32, 30, 28, 29, 26, 24, 25, 22, 21, 20, 19, 17] },
];

function StatCard({ s, i }: { s: (typeof cardConfig)[number]; i: number }) {
  const Icon = s.icon;
  const color = statColors[i % statColors.length];
  return (
    <Card
      className="animate-fade-up p-5 transition hover:border-slate-300"
      style={{ animationDelay: `${i * 50}ms` }}
    >
      <div className="flex items-center justify-between">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
          <Icon className="h-[18px] w-[18px]" />
        </span>
        {s.delta && (
          <Badge tone={s.trend === "up" ? "emerald" : "rose"}>
            <TrendingUp className={`h-3 w-3 ${s.trend === "down" ? "rotate-180" : ""}`} />
            {s.delta}
          </Badge>
        )}
      </div>
      <p className="mt-4 text-[24px] font-semibold tracking-tight text-slate-900">{s.value}</p>
      <div className="mt-1 flex items-end justify-between">
        <p className="text-[13px] text-slate-500">{s.label}</p>
        {s.spark.length > 0 && <Sparkline data={s.spark} color={color} />}
      </div>
    </Card>
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getDashboardUserStats(range, from || undefined, to || undefined).catch(() => null),
      getDashboardProjectStats(range, from || undefined, to || undefined).catch(() => null),
      getDashboardDiagramStats(range, from || undefined, to || undefined).catch(() => null),
    ])
      .then(([u, p, d]) => {
        setUserStat(u);
        setProjectStat(p);
        setDiagramStat(d);
      })
      .finally(() => setLoading(false));
  }, [range, from, to]);

  const fmtToday = () => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  };

  const handleRange = (key: RangeKey) => {
    setRange(key);
    if (key !== "custom") {
      setFrom("");
      setTo("");
    } else {
      setFrom(fmtToday());
      setTo(fmtToday());
    }
  };

  const usageSeries = planUsage.map((st) => {
    const plan = subscriptionPlans.find((p) => p.id === st.planId);
    return { label: plan?.name ?? "Unknown", color: plan?.color ?? "#94a3b8", values: st.values };
  });
  const months = ["T1","T2","T3","T4","T5","T6","T7","T8","T9","T10","T11","T12"];

  const resolvedStats = cardConfig.map((cfg) => {
    if (cfg.id === "users" && userStat) {
      return { ...cfg, value: userStat.total.toLocaleString("vi-VN"), delta: `${userStat.delta > 0 ? "+" : ""}${userStat.delta.toLocaleString("vi-VN")}%`, trend: userStat.trend, spark: userStat.sparkline };
    }
    if (cfg.id === "projects" && projectStat) {
      return { ...cfg, value: projectStat.total.toLocaleString("vi-VN"), delta: `${projectStat.delta > 0 ? "+" : ""}${projectStat.delta.toLocaleString("vi-VN")}%`, trend: projectStat.trend, spark: projectStat.sparkline };
    }
    if (cfg.id === "diagrams" && diagramStat) {
      return { ...cfg, value: diagramStat.total.toLocaleString("vi-VN"), delta: `${diagramStat.delta > 0 ? "+" : ""}${diagramStat.delta.toLocaleString("vi-VN")}%`, trend: diagramStat.trend, spark: diagramStat.sparkline };
    }
    return cfg;
  });

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
          <div className="grid gap-4 xl:grid-cols-3">
            <Card className="p-5 xl:col-span-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="mt-4 h-[200px] rounded-lg" />
            </Card>
            <Card className="p-5">
              <Skeleton className="h-4 w-32" />
              <div className="mt-4 space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Skeleton className="h-3 w-3" />
                    <Skeleton className="h-3 flex-1" />
                    <Skeleton className="h-3 w-8" />
                  </div>
                ))}
              </div>
            </Card>
          </div>
          <div className="grid gap-4 xl:grid-cols-3">
            <Card className="p-5 xl:col-span-2">
              <div className="mb-3 flex items-center justify-between">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-4 w-20" />
              </div>
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-3 flex-1" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                ))}
              </div>
            </Card>
            <Card className="p-5">
              <Skeleton className="mb-3 h-4 w-28" />
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-3 w-4" />
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="mt-1 h-2 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
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
            Có <span className="font-semibold text-slate-700">1.924 dự án</span> đang vận hành và{" "}
            <span className="font-semibold text-indigo-600">4 mẫu workspace</span> sẵn sàng. Yêu cầu AI phác thảo sơ đồ để bắt đầu.
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

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {resolvedStats.map((s, i) => (
          <StatCard key={s.id} s={s} i={i} />
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="flex flex-col gap-4 p-5 xl:col-span-2">
          <div>
            <h3 className="text-[14px] font-semibold text-slate-900">Lượt sử dụng theo gói</h3>
            <p className="text-[13px] text-slate-500">3–12 tháng (cuộn để zoom)</p>
          </div>
          <GroupedBarChart series={usageSeries} months={months} defaultVisible={6} />
          <ChartLegend series={usageSeries} />
        </Card>

        <Card className="p-5">
          <h3 className="text-[14px] font-semibold text-slate-900">Phân bố loại UML</h3>
          <p className="text-[13px] text-slate-500">Tỷ trọng sơ đồ</p>
          <div className="mt-2 flex flex-col items-center">
            <Donut data={umlDistribution} />
            <div className="mt-4 grid w-full grid-cols-2 gap-x-3 gap-y-2">
              {umlDistribution.map((d) => (
                <div key={d.label} className="flex items-center gap-2 text-[12px]">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ background: d.color }} />
                  <span className="flex-1 truncate text-slate-600">{d.label}</span>
                  <span className="font-medium text-slate-900">{d.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Activity + contributors */}
      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="p-5 xl:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[14px] font-semibold text-slate-900">Hoạt động gần đây</h3>
            <button className="text-[13px] font-medium text-indigo-600 hover:text-indigo-700">Xem tất cả</button>
          </div>
          <div className="space-y-1">
            {activityFeed.map((a) => (
              <div key={a.id} className="flex items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-slate-50">
                <Avatar initials={a.initials} color={a.id % 2 ? "#6366f1" : "#0ea5e9"} />
                <p className="min-w-0 flex-1 truncate text-[13px] text-slate-600">
                  <span className="font-medium text-slate-900">{a.who}</span> {a.action}{" "}
                  <span className="font-medium text-indigo-600">{a.target}</span>
                </p>
                <span className="shrink-0 text-[12px] text-slate-400">{a.time}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="mb-3 text-[14px] font-semibold text-slate-900">Top đóng góp</h3>
          <div className="space-y-3">
            {topContributors.map((c, i) => (
              <div key={c.name} className="flex items-center gap-3">
                <span className="w-4 text-center text-[13px] font-semibold text-slate-300">{i + 1}</span>
                <Avatar initials={c.initials} color={c.color} size="h-8 w-8" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-slate-800">{c.name}</p>
                  <div className="mt-1 h-1.5 w-full rounded-full bg-slate-100">
                    <div className="h-full rounded-full" style={{ width: `${(c.diagrams / 412) * 100}%`, background: c.color }} />
                  </div>
                </div>
                <span className="text-[13px] font-semibold text-slate-900">{c.diagrams}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
      </div>
    </div>
  );
}


