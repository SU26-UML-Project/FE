import { useId, useState } from "react";

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

/* ---------- Sparkline ---------- */
export function Sparkline({
  data,
  color = "#6366f1",
  width = 110,
  height = 34,
}: {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
}) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);
  const gid = useId();
  const pts = data.map((d, i) => [i * step, height - ((d - min) / range) * (height - 6) - 3]);
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L${width},${height} L0,${height} Z`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <linearGradient id={`sp-${gid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#sp-${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.4" fill={color} />
    </svg>
  );
}

/* ---------- Area chart ---------- */
export function AreaChart({
  data,
  color = "#6366f1",
}: {
  data: { m: string; v: number }[];
  color?: string;
}) {
  const id = useId();
  const W = 720;
  const H = 220;
  const pad = { l: 8, r: 8, t: 14, b: 26 };
  const max = Math.max(...data.map((d) => d.v)) * 1.15;
  const step = (W - pad.l - pad.r) / (data.length - 1);
  const pts = data.map((d, i) => [pad.l + i * step, H - pad.b - (d.v / max) * (H - pad.t - pad.b)]);
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L${pts[pts.length - 1][0]},${H - pad.b} L${pts[0][0]},${H - pad.b} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: "auto" }}>
      <defs>
        <linearGradient id={`ar-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.16" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75, 1].map((g) => (
        <line
          key={g}
          x1={pad.l}
          x2={W - pad.r}
          y1={pad.t + g * (H - pad.t - pad.b)}
          y2={pad.t + g * (H - pad.t - pad.b)}
          stroke="#e2e8f0"
          strokeDasharray="3 5"
        />
      ))}
      <path d={area} fill={`url(#ar-${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) =>
        i === pts.length - 1 ? (
          <g key={i}>
            <circle cx={p[0]} cy={p[1]} r="3.2" fill="#fff" stroke={color} strokeWidth="2" />
          </g>
        ) : null
      )}
      {pts.map((p, i) => (
        <text key={`l${i}`} x={p[0]} y={H - 8} textAnchor="middle" className="fill-slate-400" fontSize="11">
          {data[i].m}
        </text>
      ))}
    </svg>
  );
}

/* ---------- Donut ---------- */
export function Donut({
  data,
  size = 156,
}: {
  data: { label: string; value: number; color: string }[];
  size?: number;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = 52;
  const c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 140 140" className="-rotate-90">
        <circle cx="70" cy="70" r={r} fill="none" stroke="#f1f5f9" strokeWidth="14" />
        {data.map((d, i) => {
          const len = (d.value / total) * c;
          const seg = (
            <circle
              key={i}
              cx="70"
              cy="70"
              r={r}
              fill="none"
              stroke={d.color}
              strokeWidth="14"
              strokeDasharray={`${len - 3} ${c - len + 3}`}
              strokeDashoffset={-acc}
            />
          );
          acc += len;
          return seg;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold text-slate-900">{total}%</span>
        <span className="text-[11px] text-slate-400">phân bố</span>
      </div>
    </div>
  );
}

/* ---------- Grouped bar chart (dynamic, zoom+pan) ---------- */
export function GroupedBarChart({
  series,
  months,
  defaultVisible = 6,
}: {
  series: { label: string; color: string; values: number[] }[];
  months: string[];
  defaultVisible?: number;
}) {
  const [visibleCount, setVisibleCount] = useState(clamp(defaultVisible, 3, 12));
  const [offset, setOffset] = useState(0);
  const [hovered, setHovered] = useState<{ si: number; mi: number } | null>(null);
  const W = 720;
  const H = 220;
  const pad = { l: 8, r: 8, t: 14, b: 26 };
  const chartW = W - pad.l - pad.r;
  const maxOffset = 12 - visibleCount;

  const clampedOffset = clamp(offset, 0, maxOffset);
  const visibleMonths = months.slice(clampedOffset, clampedOffset + visibleCount);
  const visibleValues = series.map((s) => s.values.slice(clampedOffset, clampedOffset + visibleCount));
  const allV = visibleValues.flat();
  const yMax = Math.max(...allV) * 1.15 || 1;
  const groupW = chartW / visibleCount;
  const barGap = 2;
  const groupPadding = 20;
  const barTotalW = groupW - groupPadding - barGap;
  const barW = barTotalW / series.length;

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -1 : 1;
    setVisibleCount((prev) => {
      const next = clamp(prev + delta, 3, 12);
      setOffset((o) => Math.min(o, 12 - next));
      return next;
    });
  };

  let tooltipStyle: React.CSSProperties | undefined;
  let tooltipData: { label: string; color: string; month: string; value: number } | undefined;
  if (hovered) {
    const localMi = hovered.mi - clampedOffset;
    const groupX = pad.l + localMi * groupW;
    const s = series[hovered.si];
    const v = s.values[hovered.mi];
    const barH = (v / yMax) * (H - pad.t - pad.b);
    const barY = H - pad.b - barH;
    const barCenterX = groupX + hovered.si * barW + (barW - 1) / 2;
    tooltipStyle = {
      left: `${(barCenterX / W) * 100}%`,
      top: `${(barY / H) * 100}%`,
      transform: "translate(-50%, calc(-100% - 6px))",
    };
    tooltipData = {
      label: s.label,
      color: s.color,
      month: months[hovered.mi],
      value: v,
    };
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[12px] text-slate-400">
          {visibleMonths[0]} – {visibleMonths[visibleMonths.length - 1]}
          {visibleCount < 12 && (
            <span className="ml-2 text-slate-300">(cuộn để zoom • kéo để xem thêm)</span>
          )}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setOffset((o) => clamp(o - 1, 0, maxOffset))}
            disabled={clampedOffset <= 0}
            className="flex h-6 w-6 items-center justify-center rounded text-[13px] text-slate-500 transition hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none"
          >
            ◀
          </button>
          <button
            onClick={() => setOffset((o) => clamp(o + 1, 0, maxOffset))}
            disabled={clampedOffset >= maxOffset}
            className="flex h-6 w-6 items-center justify-center rounded text-[13px] text-slate-500 transition hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none"
          >
            ▶
          </button>
        </div>
      </div>
      <div className="relative" onWheel={handleWheel}>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: "auto" }}>
          {[0, 0.25, 0.5, 0.75, 1].map((g) => (
            <line
              key={g}
              x1={pad.l} x2={W - pad.r}
              y1={pad.t + g * (H - pad.t - pad.b)}
              y2={pad.t + g * (H - pad.t - pad.b)}
              stroke="#e2e8f0" strokeDasharray="3 5"
            />
          ))}
          {visibleMonths.map((m, mi) => {
            const groupX = pad.l + mi * groupW;
            return (
              <g key={m}>
                {series.map((s, si) => {
                  const v = s.values[clampedOffset + mi];
                  const barH = (v / yMax) * (H - pad.t - pad.b);
                  const x = groupX + si * barW;
                  const y = H - pad.b - barH;
                  return (
                    <rect
                      key={s.label}
                      x={x}
                      y={y}
                      width={barW - 1}
                      height={barH}
                      rx={3}
                      fill={s.color}
                      className="cursor-pointer"
                      onMouseEnter={() => setHovered({ si, mi: clampedOffset + mi })}
                      onMouseLeave={() => setHovered(null)}
                    />
                  );
                })}
                <text
                  x={groupX + groupW / 2}
                  y={H - 8}
                  textAnchor="middle"
                  className="fill-slate-400"
                  fontSize="11"
                >
                  {m}
                </text>
              </g>
            );
          })}
        </svg>
        {tooltipData && tooltipStyle && (
          <div
            className="absolute z-10 pointer-events-none whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] shadow-lg"
            style={tooltipStyle}
          >
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: tooltipData.color }} />
              <span className="font-medium text-slate-900">{tooltipData.label}</span>
              <span className="text-slate-400">·</span>
              <span className="text-slate-500">{tooltipData.month}</span>
            </div>
            <p className="mt-0.5 text-slate-700">
              <span className="font-semibold">{tooltipData.value.toLocaleString("vi-VN")}</span> lượt
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export function ChartLegend({ series }: { series: { label: string; color: string }[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1">
      {series.map((s) => (
        <div key={s.label} className="flex items-center gap-1.5 text-[12px] text-slate-600">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
          {s.label}
        </div>
      ))}
    </div>
  );
}

/* ---------- Horizontal bar ---------- */
export function HBar({
  label,
  value,
  max,
  color = "#6366f1",
  suffix,
}: {
  label: string;
  value: number;
  max: number;
  color?: string;
  suffix?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-32 shrink-0 truncate text-[12.5px] text-slate-600">{label}</span>
      <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
        <span className="block h-full rounded-full" style={{ width: `${(value / max) * 100}%`, background: color }} />
      </span>
      <span className="w-14 shrink-0 text-right text-[12.5px] font-semibold text-slate-900">
        {value}
        {suffix}
      </span>
    </div>
  );
}
