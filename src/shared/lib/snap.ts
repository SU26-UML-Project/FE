import type { FlowNode } from "../../types";

export interface Box {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SnapResult {
  /** delta to apply to the dragged node's x (0 if none) */
  dx: number;
  /** delta to apply to the dragged node's y (0 if none) */
  dy: number;
  /** vertical guide line x-coordinates (flow space) */
  guidesX: number[];
  /** horizontal guide line y-coordinates (flow space) */
  guidesY: number[];
}

const EMPTY: SnapResult = { dx: 0, dy: 0, guidesX: [], guidesY: [] };

const THRESHOLD = 6;

export function nodeBox(n: FlowNode): Box {
  const w = (n.measured?.width ?? n.width ?? 120) as number;
  const h = (n.measured?.height ?? n.height ?? 40) as number;
  return { id: n.id, x: n.position.x, y: n.position.y, w, h };
}

/**
 * Compute snap deltas + guide lines for a dragged node against all other nodes.
 * Aligns left / center / right edges and top / center / bottom edges, and
 * also snaps the node's center to the canvas midpoint for easy centering.
 */
export function computeSnap(
  dragged: Box,
  others: Box[],
  viewCenter?: { x: number; y: number }
): SnapResult {
  const guidesX = new Set<number>();
  const guidesY = new Set<number>();

  const dLeft = dragged.x;
  const dCx = dragged.x + dragged.w / 2;
  const dRight = dragged.x + dragged.w;
  const dTop = dragged.y;
  const dCy = dragged.y + dragged.h / 2;
  const dBottom = dragged.y + dragged.h;

  let dx = 0;
  let dy = 0;

  const tryX = (candidate: number, target: number) => {
    if (dx !== 0) return;
    const diff = target - candidate;
    if (Math.abs(diff) <= THRESHOLD) {
      dx = diff;
      guidesX.add(target);
    }
  };
  const tryY = (candidate: number, target: number) => {
    if (dy !== 0) return;
    const diff = target - candidate;
    if (Math.abs(diff) <= THRESHOLD) {
      dy = diff;
      guidesY.add(target);
    }
  };

  for (const o of others) {
    const oLeft = o.x;
    const oCx = o.x + o.w / 2;
    const oRight = o.x + o.w;
    const oTop = o.y;
    const oCy = o.y + o.h / 2;
    const oBottom = o.y + o.h;

    tryX(dLeft, oLeft);
    tryX(dLeft, oCx);
    tryX(dCx, oCx);
    tryX(dCx, oLeft);
    tryX(dCx, oRight);
    tryX(dRight, oRight);
    tryX(dRight, oCx);
    tryX(dLeft, oRight);
    tryX(dRight, oLeft);

    tryY(dTop, oTop);
    tryY(dTop, oCy);
    tryY(dCy, oCy);
    tryY(dCy, oTop);
    tryY(dCy, oBottom);
    tryY(dBottom, oBottom);
    tryY(dBottom, oCy);
    tryY(dTop, oBottom);
    tryY(dBottom, oTop);
  }

  // Snap to canvas center too (only center-to-center).
  if (viewCenter) {
    if (dx === 0) {
      const diff = viewCenter.x - dCx;
      if (Math.abs(diff) <= THRESHOLD) {
        dx = diff;
        guidesX.add(viewCenter.x);
      }
    }
    if (dy === 0) {
      const diff = viewCenter.y - dCy;
      if (Math.abs(diff) <= THRESHOLD) {
        dy = diff;
        guidesY.add(viewCenter.y);
      }
    }
  }

  return {
    dx,
    dy,
    guidesX: [...guidesX],
    guidesY: [...guidesY],
  };
}

export const emptySnap = EMPTY;
