import { ArrowUpRight, Send, Sparkles, TrendingUp } from "lucide-react";
import {
  activityFeed,
  projectsTrend,
  stats,
  topContributors,
  umlDistribution,
} from "../data";
import { AreaChart, Donut, Sparkline } from "../charts";
import { Avatar, Badge, Card } from "../ui";
import { useAuthStore } from "../../../stores/useAuthStore";

const statColors = ["#6366f1", "#0ea5e9", "#8b5cf6", "#f43f5e"];

function StatCard({ s, i }: { s: (typeof stats)[number]; i: number }) {
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
        <Badge tone={s.trend === "up" ? "emerald" : "rose"}>
          <TrendingUp className={`h-3 w-3 ${s.trend === "down" ? "rotate-180" : ""}`} />
          {s.delta}
        </Badge>
      </div>
      <p className="mt-4 text-[24px] font-semibold tracking-tight text-slate-900">{s.value}</p>
      <div className="mt-1 flex items-end justify-between">
        <p className="text-[13px] text-slate-500">{s.label}</p>
        <Sparkline data={s.spark} color={color} />
      </div>
    </Card>
  );
}

export default function Dashboard() {
  const user = useAuthStore((s) => s.user);
  return (
    <div className="space-y-5">
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

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s, i) => (
          <StatCard key={s.id} s={s} i={i} />
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="p-5 xl:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-[14px] font-semibold text-slate-900">Dự án tạo mới</h3>
              <p className="text-[13px] text-slate-500">12 tháng gần nhất</p>
            </div>
            <Badge tone="emerald">
              <ArrowUpRight className="h-3 w-3" /> +24% YoY
            </Badge>
          </div>
          <AreaChart data={projectsTrend} />
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
  );
}
