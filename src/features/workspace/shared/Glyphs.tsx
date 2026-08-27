// Shared visual glyphs + palettes used by the Inspector (and sidebar) so the
// connector / marker previews mirror what is actually drawn on the canvas.

const INK = "#3f3f46";

export const COLOR_PALETTE: { label: string; value: string }[] = [
  { label: "Ink", value: "#18181b" },
  { label: "Slate", value: "#475569" },
  { label: "Red", value: "#dc2626" },
  { label: "Orange", value: "#ea580c" },
  { label: "Amber", value: "#d97706" },
  { label: "Green", value: "#16a34a" },
  { label: "Teal", value: "#0d9488" },
  { label: "Blue", value: "#2563eb" },
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

/**
 * Arrow-head size options (multipliers applied to the base marker). `size === 1`
 * is the default and keeps the legacy marker ids, so already-saved diagrams
 * render identically. Other sizes map a marker id to a scaled variant:
 * `m-arrow` → `m-arrow-s150` for 1.5×.
 */
export const MARKER_SIZES: { key: string; size: number }[] = [
  { key: "", size: 1 },
  { key: "s60", size: 0.6 },
  { key: "s80", size: 0.8 },
  { key: "s120", size: 1.2 },
  { key: "s150", size: 1.5 },
  { key: "s200", size: 2 },
];

/** Base marker id → scaled id for a given size (unchanged when size === 1). */
export function sizedMarkerId(baseId: string, size: number): string {
  if (size === 1) return baseId;
  const found = MARKER_SIZES.find((s) => s.size === size);
  return found ? `${baseId}-${found.key}` : baseId;
}

/**
 * Given a marker string (`""` or `url(#id)`) and a size factor, return the
 * marker string that points to the matching scaled marker definition.
 */
export function sizedMarker(marker: string, size: number): string {
  if (!marker || size === 1) return marker;
  const m = /url\(#([^)]+)\)/.exec(marker);
  if (!m) return marker;
  return `url(#${sizedMarkerId(m[1], size)})`;
}

/** Render a connector line preview with its markers + dash + colour. */
export function ConnectorGlyph({
  markerEnd,
  markerStart,
  dashed,
  color,
  size = 1,
  width = 64,
}: {
  markerEnd?: string;
  markerStart?: string;
  dashed?: boolean;
  color?: string;
  size?: number;
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
        markerStart={markerStart ? sizedMarker(markerStart, size) : undefined}
        markerEnd={markerEnd ? sizedMarker(markerEnd, size) : undefined}
      />
    </svg>
  );
}
