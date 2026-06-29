import { ArrowUpRight, Send, Sparkles, TrendingUp, Zap } from "lucide-react";
import { projectsTrend, stats } from "@/data/mock";
import { AreaChart, Sparkline } from "@/components/charts";
import { Badge } from "@/components/ui";

const sparkColors = ["#5b8a48", "#7fae5f", "#e4a11b", "#ef4444"];

function StatCard({ s, i }: { s: (typeof stats)[number]; i: number }) {
  const Icon = s.icon;
  const up = s.trend === "up";
  return (
    <div
      className="animate-fade-up rounded-3xl border border-white/60 bg-surface p-5 shadow-soft transition hover-lift"
      style={{ animationDelay: `${i * 50}ms` }}
    >
      <h3 className="mb-3 text-[13px] font-semibold text-gray-600">{s.label}</h3>
      <div className="text-[28px] font-bold leading-none text-ink">{s.value}</div>
      <div className={`mt-2 text-[12px] font-bold ${up ? "text-emerald-600" : "text-rose-500"}`}>
        {s.delta}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/70 text-gray-500">
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <Sparkline data={s.spark} color={sparkColors[i % sparkColors.length]} />
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Badge tone="brand" className="mb-3">
            <Sparkles className="h-3 w-3" /> Hệ thống UML · AI Agent
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Xin chào, Minh Anh 👋
          </h1>
          <p className="mt-2 text-[14px] font-medium text-gray-500">
            Có <span className="font-bold text-ink">1.924 dự án</span> đang vận hành và{" "}
            <span className="font-bold text-golddk">4 mẫu workspace</span> sẵn sàng.
          </p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-full bg-gold px-6 py-3 text-[14px] font-bold text-white shadow-soft transition hover:bg-golddk">
          <Send className="h-4 w-4" /> Sinh sơ đồ
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s, i) => (
          <StatCard key={s.id} s={s} i={i} />
        ))}
      </div>

      {/* Chart + AI status */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* chart */}
        <div className="rounded-3xl border border-white/60 bg-surface p-6 shadow-soft lg:col-span-2">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-ink">Dự án tạo mới</h3>
              <p className="text-[12px] text-gray-500">12 tháng gần nhất</p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-emerald-700 shadow-sm ring-1 ring-inset ring-black/5">
              <ArrowUpRight className="h-3 w-3" /> +24% YoY
            </span>
          </div>
          <AreaChart data={projectsTrend} color="#e4a11b" />
        </div>

        {/* dark AI card */}
        <div className="relative flex flex-col justify-between overflow-hidden rounded-3xl bg-gradient-to-br from-forest to-forestdk p-6 text-white shadow-soft">
          <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white opacity-5" />
          <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-white opacity-5" />

          <div className="relative z-10 flex items-start justify-between">
            <div>
              <div className="mb-1 text-[11px] font-bold tracking-wider text-emerald-400">
                AI ENGINE STATUS
              </div>
              <h3 className="text-xl font-bold">Online &amp; Active</h3>
            </div>
            <span className="h-3 w-3 rounded-full bg-emerald-500 shadow-[0_0_12px_#22c55e] animate-soft-pulse" />
          </div>

          <div className="relative z-10 mt-auto space-y-4">
            <div>
              <div className="mb-1 text-[11px] text-gray-400">Endpoint</div>
              <div className="inline-block rounded-lg bg-black/30 px-3 py-1.5 font-mono text-[13px]">
                localhost:3001/api
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1 text-[12px] text-gray-300">
              <Zap className="h-3.5 w-3.5 text-gold" />
              AnythingLLM v1.8.5 · 36 workspace RAG
            </div>
            <div className="flex gap-3 pt-2">
              <button className="flex-1 rounded-xl bg-gold py-2.5 text-[13px] font-bold text-white transition hover:bg-golddk">
                Khởi động lại
              </button>
              <button className="flex-1 rounded-xl bg-white/10 py-2.5 text-[13px] font-semibold transition hover:bg-white/20">
                Cấu hình
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Activity + contributors (bonus, on-theme) */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-3xl border border-white/60 bg-surface p-6 shadow-soft lg:col-span-2">
          <h3 className="mb-4 font-bold text-ink">Hoạt động gần đây</h3>
          <div className="space-y-1">
            {[
              { who: "Nguyễn Minh Anh", a: "tạo sơ đồ Class mới trong", t: "Core Banking v3", time: "2 phút trước", c: "#6366f1", i: "NA" },
              { who: "AnythingLLM", a: "đồng bộ workspace", t: "banking-sdlc", time: "11 phút trước", c: "#10b981", i: "AI" },
              { who: "Trần Quốc Bảo", a: "clone mẫu workspace", t: "Hospital System", time: "2 giờ trước", c: "#0ea5e9", i: "TB" },
              { who: "Phạm Đức Hoàng", a: "tải tài liệu vào", t: "E-commerce", time: "34 phút trước", c: "#f59e0b", i: "PH" },
            ].map((x, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-white/50">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold text-white ring-2 ring-white" style={{ backgroundColor: x.c }}>
                  {x.i}
                </span>
                <p className="min-w-0 flex-1 truncate text-[13px] text-gray-600">
                  <span className="font-semibold text-ink">{x.who}</span> {x.a}{" "}
                  <span className="font-semibold text-golddk">{x.t}</span>
                </p>
                <span className="shrink-0 text-[12px] text-gray-400">{x.time}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-white/60 bg-surface p-6 shadow-soft">
          <h3 className="mb-4 font-bold text-ink">Top đóng góp</h3>
          <div className="space-y-3">
            {[
              { n: "Nguyễn Minh Anh", v: 412, c: "#6366f1", i: "NA" },
              { n: "Trần Quốc Bảo", v: 388, c: "#0ea5e9", i: "TB" },
              { n: "Lê Hoàng Yến", v: 301, c: "#8b5cf6", i: "LY" },
              { n: "Phạm Đức Hoàng", v: 274, c: "#10b981", i: "PH" },
              { n: "Võ Thanh Tùng", v: 219, c: "#f59e0b", i: "VT" },
            ].map((c, i) => (
              <div key={c.n} className="flex items-center gap-3">
                <span className="w-4 text-center text-[13px] font-bold text-gray-300">{i + 1}</span>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white ring-2 ring-white" style={{ backgroundColor: c.c }}>
                  {c.i}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-ink">{c.n}</p>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-mint/60">
                    <div className="h-full rounded-full" style={{ width: `${(c.v / 412) * 100}%`, background: c.c }} />
                  </div>
                </div>
                <span className="text-[13px] font-bold text-ink">{c.v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 pt-2 text-[12px] text-gray-400">
        <TrendingUp className="h-3.5 w-3.5" /> Dữ liệu cập nhật theo thời gian thực
      </div>
    </div>
  );
}
