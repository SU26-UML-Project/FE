import { useId } from "react";

/* ---------- Sparkline ---------- */
export function Sparkline({
  data,
  color = "#e4a11b",
  width = 110,
  height = 34,
}: {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
}) {
  const gid = useId();
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);
  const pts = data.map((d, i) => [i * step, height - ((d - min) / range) * (height - 6) - 3]);
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L${width},${height} L0,${height} Z`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <linearGradient id={`sp-${gid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#sp-${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.6" fill={color} />
    </svg>
  );
}

/* ---------- Area chart ---------- */
export function AreaChart({
  data,
  color = "#e4a11b",
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
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
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
          stroke="rgba(35,53,25,0.1)"
          strokeDasharray="3 6"
        />
      ))}
      <path d={area} fill={`url(#ar-${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) =>
        i === pts.length - 1 ? (
          <g key={i}>
            <circle cx={p[0]} cy={p[1]} r="5" fill={color} opacity="0.2" />
            <circle cx={p[0]} cy={p[1]} r="3.4" fill="#fff" stroke={color} strokeWidth="2.4" />
          </g>
        ) : null
      )}
      {pts.map((p, i) => (
        <text key={`l${i}`} x={p[0]} y={H - 8} textAnchor="middle" className="fill-gray-400" fontSize="11">
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
        <circle cx="70" cy="70" r={r} fill="none" stroke="rgba(35,53,25,0.08)" strokeWidth="14" />
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
        <span className="text-xl font-bold text-ink">{total}%</span>
        <span className="text-[11px] text-gray-400">phân bố</span>
      </div>
    </div>
  );
}

/* ---------- Horizontal bar ---------- */
export function HBar({
  label,
  value,
  max,
  color = "#e4a11b",
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
      <span className="w-28 shrink-0 truncate text-[12.5px] text-gray-600">{label}</span>
      <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-mint/60">
        <span className="block h-full rounded-full" style={{ width: `${(value / max) * 100}%`, background: color }} />
      </span>
      <span className="w-14 shrink-0 text-right text-[12.5px] font-bold text-ink">
        {value}
        {suffix}
      </span>
    </div>
  );
}
