import { useEffect, useRef } from "react";
import type { DiagramDef, PaletteItem } from "../../types";
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

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const W = 188;
  const H = 132;
  const px = Math.min(x, window.innerWidth - W - 8);
  const py = Math.min(y, window.innerHeight - H - 8);

  return (
    <div
      ref={ref}
      className="animate-pop fixed z-50 w-[188px] rounded-xl border border-[var(--line)] bg-white p-2 shadow-[0_8px_30px_rgba(0,0,0,0.16)]"
      style={{ left: px, top: py }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-400">
        Add shape
      </p>
      <div className="grid grid-cols-3 gap-1">
        {diagram.nodes.map((item) => (
          <button
            key={item.type + item.label}
            onClick={() => {
              onAdd(item, flowPos);
              onClose();
            }}
            title={item.label}
            className="group flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-transparent text-zinc-500 transition-colors hover:border-[var(--line)] hover:bg-zinc-50 hover:text-zinc-900"
          >
            <ShapeGlyph type={item.type} />
            <span className="text-[9.5px] font-medium leading-none">
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
