import { useEffect, useRef, useState } from "react";
import type { DiagramDef, PaletteItem } from "../../../types";
import type { XYPosition } from "@xyflow/react";
import { ShapeGlyph } from "../panels/Sidebar";

/**
 * Excalidraw-style quick insert: shown when the user double-clicks an empty
 * area of the canvas. Picking a shape drops it exactly at the click point.
 */
export function QuickAdd({
  x,
  y,
  flowPos,
  diagram,
  onAdd,
  onClose,
}: {
  x: number;
  y: number;
  flowPos: XYPosition;
  diagram: DiagramDef;
  onAdd: (item: PaletteItem, pos: XYPosition) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const items = q
    ? diagram.nodes.filter((n) => `${n.label} ${n.type}`.toLowerCase().includes(q))
    : diagram.nodes;

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      // P0: number shortcuts 1-9 pick visible shape
      const n = Number(e.key);
      if (Number.isInteger(n) && n >= 1 && n <= Math.min(9, items.length)) {
        onAdd(items[n - 1], flowPos);
        onClose();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose, onAdd, flowPos, items]);

  const W = 188;
  // Estimate the real popup height from the number of palette rows so the
  // bottom-edge clamp stays accurate (7 shapes = 3 rows ≈ 210px, not 132px).
  // Row ≈ 55px (aspect-square cell in a 3-col grid) + 4px gap; header ≈ 44px.
  const rows = Math.ceil(diagram.nodes.length / 3);
  const H = 44 + rows * 59;
  const px = Math.min(x, window.innerWidth - W - 8);
  const py = Math.min(y, window.innerHeight - H - 8);

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Quick add shape. Press 1 to 9 to insert, Escape to close."
      className="animate-pop fixed z-50 w-[212px] rounded-xl border border-admin-outline/30 bg-white p-2 shadow-[0_8px_30px_rgba(0,0,0,0.16)]"
      style={{ left: px, top: py }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <p className="mb-1.5 px-1 text-[10px] font-bold uppercase tracking-[0.08em] text-admin-secondary/40">
        Add shape <span className="normal-case tracking-normal">· 1–{Math.min(9, items.length)}</span>
      </p>
      <input
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Type to filter…"
        aria-label="Filter shapes"
        className="mb-1.5 w-full rounded-lg border border-admin-outline/30 bg-white px-2 py-1 text-[12px] font-medium outline-none placeholder:text-admin-secondary/40 focus:border-admin-primary focus:ring-4 focus:ring-admin-primary/10"
      />
      {items.length === 0 ? (
        <p className="px-1 py-2 text-[12px] text-admin-secondary/60">No match.</p>
      ) : (
      <div className="grid max-h-[264px] grid-cols-3 gap-1 overflow-y-auto">
        {items.map((item, idx) => (
          <button
            key={item.type + item.label}
            onClick={() => {
              onAdd(item, flowPos);
              onClose();
            }}
            title={`${item.label}${idx < 9 ? ` (${idx + 1})` : ""}`}
            aria-label={`Add ${item.label}${idx < 9 ? `, shortcut ${idx + 1}` : ""}`}
            className="group flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-transparent text-admin-secondary transition-colors hover:border-admin-outline/30 hover:bg-admin-bg hover:text-admin-primary focus-visible:outline-2 focus-visible:outline-uml-blue"
          >
            <ShapeGlyph type={item.type} />
            <span className="max-w-full truncate px-0.5 text-[10px] font-bold leading-none">
              {item.label}
            </span>
          </button>
        ))}
      </div>
      )}
    </div>
  );
}
