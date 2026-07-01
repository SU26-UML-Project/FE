import { useViewport } from "@xyflow/react";

export interface GuidesState {
  guidesX: number[];
  guidesY: number[];
}

/**
 * Thin alignment guides drawn while dragging nodes, in the same way Figma /
 * Excalidraw surface a faint line when edges or centers line up. Lines are
 * positioned in screen space using the live viewport transform.
 */
export function SmartGuides({ guides }: { guides: GuidesState }) {
  const vp = useViewport();
  const { x, y, zoom } = vp;
  const show = guides.guidesX.length > 0 || guides.guidesY.length > 0;
  if (!show) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-[15] overflow-hidden">
      {guides.guidesX.map((gx, i) => (
        <div
          key={`vx${i}`}
          className="absolute bottom-0 top-0 border-l border-dashed border-admin-primary/45"
          style={{ left: `${gx * zoom + x}px` }}
        />
      ))}
      {guides.guidesY.map((gy, i) => (
        <div
          key={`hy${i}`}
          className="absolute left-0 right-0 border-t border-dashed border-admin-primary/45"
          style={{ top: `${gy * zoom + y}px` }}
        />
      ))}
    </div>
  );
}
