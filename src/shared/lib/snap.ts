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

  // Instead of greedily taking the FIRST candidate inside the threshold (which
  // made edge-splints "pull" a node away while you were trying to eyeball the
  // center), we evaluate every candidate and keep the NEAREST one per axis —
  // Figma-style. When you are aiming for center, the center-to-center snap is
  // the closest match, so it wins and the node stays put instead of being
  // yanked onto some far edge guide.
  const xCands: Array<[number, number]> = [];
  const yCands: Array<[number, number]> = [];

  for (const o of others) {
    const oLeft = o.x;
    const oCx = o.x + o.w / 2;
    const oRight = o.x + o.w;
    const oTop = o.y;
    const oCy = o.y + o.h / 2;
    const oBottom = o.y + o.h;

    xCands.push(
      [dLeft, oLeft], [dLeft, oCx],
      [dCx, oCx], [dCx, oLeft], [dCx, oRight],
      [dRight, oRight], [dRight, oCx],
      [dLeft, oRight], [dRight, oLeft],
    );
    yCands.push(
      [dTop, oTop], [dTop, oCy],
      [dCy, oCy], [dCy, oTop], [dCy, oBottom],
      [dBottom, oBottom], [dBottom, oCy],
      [dTop, oBottom], [dBottom, oTop],
    );
  }

  // Snap to canvas center too (only center-to-center), still nearest-wins.
  if (viewCenter) {
    xCands.push([dCx, viewCenter.x]);
    yCands.push([dCy, viewCenter.y]);
  }

  const nearest = (
    cands: Array<[number, number]>
  ): { diff: number; guide: number } | null => {
    let best: { diff: number; guide: number } | null = null;
    for (const [candidate, target] of cands) {
      const diff = target - candidate;
      if (Math.abs(diff) > THRESHOLD) continue;
      if (!best || Math.abs(diff) < Math.abs(best.diff)) {
        best = { diff, guide: target };
      }
    }
    return best;
  };

  const nX = nearest(xCands);
  const nY = nearest(yCands);
  const dx = nX ? nX.diff : 0;
  const dy = nY ? nY.diff : 0;
  if (nX) guidesX.add(nX.guide);
  if (nY) guidesY.add(nY.guide);

  return {
    dx,
    dy,
    guidesX: [...guidesX],
    guidesY: [...guidesY],
  };
}

export const emptySnap = EMPTY;
