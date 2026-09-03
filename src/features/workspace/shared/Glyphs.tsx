// Shared visual glyphs + palettes used by the Inspector (and sidebar) so the
// connector / marker previews mirror what is actually drawn on the canvas.
// P0: INK unified with Canvas/Nodes.tsx (#27272a) so previews match reality.

const INK = "#27272a";

export const COLOR_PALETTE: { label: string; value: string }[] = [
  { label: "Ink", value: "#18181b" },
  { label: "Slate", value: "#475569" },
  { label: "Red", value: "#dc2626" },
  { label: "Orange", value: "#ea580c" },
  { label: "Amber", value: "#d97706" },
  { label: "Green", value: "#16a34a" },
  { label: "Teal", value: "#0d9488" },
  { label: "Blue", value: "#004ac6" },
  { label: "Indigo", value: "#4f46e5" },
  { label: "Violet", value: "#7c3aed" },
  { label: "Pink", value: "#db2777" },
];

export interface MarkerShape {
  label: string;
  /** marker id used when placed at the target (end) */
  end: string;
  /** marker id used when placed at the source (start) */
  start: string;
}

/** Every marker style the user can place on either end of a connector. */
export const MARKER_SHAPES: MarkerShape[] = [
  { label: "None", end: "", start: "" },
  { label: "Arrow", end: "url(#m-arrow)", start: "url(#m-arrow)" },
  { label: "Open arrow", end: "url(#m-arrow-open)", start: "url(#m-arrow-open)" },
  { label: "Triangle", end: "url(#m-triangle)", start: "url(#m-triangle)" },
  {
    label: "Filled diamond",
    end: "url(#m-diamond-filled)",
    start: "url(#m-diamond-filled-start)",
  },
  {
    label: "Open diamond",
    end: "url(#m-diamond-open)",
    start: "url(#m-diamond-open-start)",
  },
];

/** Render a connector line preview with its markers + dash + colour. */
export function ConnectorGlyph({
  markerEnd,
  markerStart,
  dashed,
  color,
  width = 64,
}: {
  markerEnd?: string;
  markerStart?: string;
  dashed?: boolean;
  color?: string;
  width?: number;
}) {
  const h = 16;
  const pad = 6;
  return (
    <svg width={width} height={h} viewBox={`0 0 ${width} ${h}`}>
      <line
        x1={pad}
        y1={h / 2}
        x2={width - pad}
        y2={h / 2}
        stroke={color || INK}
        strokeWidth="1.6"
        strokeDasharray={dashed ? "5 4" : undefined}
        markerStart={markerStart || undefined}
        markerEnd={markerEnd || undefined}
      />
    </svg>
  );
}
