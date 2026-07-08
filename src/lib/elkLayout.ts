import ELK from "elkjs/lib/elk.bundled.js";
import type { FlowEdge, FlowNode, FlowNodeData, DiagramType } from "../types";
import {
  classMinSize, actionMinSize, noteMinSize, componentMinSize,
} from "./sizing";

const elk = new ELK();

/* ============================================================
   NODE SIZE ESTIMATION
   ============================================================ */
function estimateSize(node: FlowNode): { width: number; height: number } {
  const measured = (node as Record<string, unknown>).measured as { width?: number; height?: number } | undefined;
  const w = measured?.width ?? node.width;
  const h = measured?.height ?? node.height;
  if (w && h && w > 1 && h > 1) return { width: w, height: h };

  const d = node.data as FlowNodeData;
  switch (node.type) {
    case "cls": { const s = classMinSize(d); return { width: s.w, height: s.h }; }
    case "action": { const s = actionMinSize(d.label ?? ""); return { width: s.w, height: s.h }; }
    case "note": { const s = noteMinSize(d); return { width: s.w, height: s.h }; }
    case "component": { const s = componentMinSize(d); return { width: s.w, height: s.h }; }
    case "usecase": return { width: 170, height: 76 };
    case "actor": return { width: 76, height: 124 };
    case "start":
    case "final": return { width: 40, height: 40 };
    case "decision": return { width: 150, height: 104 };
    case "fork": return { width: 130, height: 14 };
    case "package": return { width: 400, height: 300 };
    case "lifeline": return { width: 150, height: 340 };
    default: return { width: 150, height: 60 };
  }
}

/* ============================================================
   HANDLE ASSIGNMENT — multi-point (25/50/75) per side
   ============================================================ */
function assignHandles(nodes: FlowNode[], edges: FlowEdge[]): FlowEdge[] {
  const posMap = new Map<string, { x: number; y: number; w: number; h: number; cx: number; cy: number }>();
  for (const n of nodes) {
    const sz = estimateSize(n);
    posMap.set(n.id, {
      x: n.position.x, y: n.position.y,
      w: sz.width, h: sz.height,
      cx: n.position.x + sz.width / 2,
      cy: n.position.y + sz.height / 2,
    });
  }

  const handleUsage = new Map<string, Set<number>>();
  const POINTS = [25, 50, 75];

  const pickPercent = (nodeId: string, side: string, ideal: number, isTarget = false): string => {
    const key = `${nodeId}-${side}`;
    const used = handleUsage.get(key) ?? new Set<number>();
    const available = POINTS.filter((p) => !used.has(p));
    const pool = available.length ? available : POINTS;
    const best = pool.reduce((b, p) => (Math.abs(p - ideal) < Math.abs(b - ideal) ? p : b), pool[0]);
    used.add(best);
    handleUsage.set(key, used);
    return `${side}-${best}${isTarget ? "-t" : ""}`;
  };

  const clamp = (v: number) => Math.max(0, Math.min(100, v));

  return edges.map((e) => {
    const s = posMap.get(e.source);
    const t = posMap.get(e.target);
    if (!s || !t) return e;

    const dx = t.cx - s.cx;
    const dy = t.cy - s.cy;
    // Check both label and marker data for special relations (include/extend)
    const isIncludeExtend = 
      (e.label as string)?.includes("«") || 
      (e.data as { marker?: string })?.marker?.includes("open");

    const horizontalRatio = Math.abs(dx) / (Math.abs(dx) + Math.abs(dy) || 1);

    // Fallback for nodes without multi-handles (like package)
    const isPackage = nodes.find(n => n.id === e.source)?.type === "package" || nodes.find(n => n.id === e.target)?.type === "package";
    if (isPackage) {
      if (horizontalRatio > 0.6 || isIncludeExtend) {
        return { 
          ...e, 
          sourceHandle: dx >= 0 ? "r" : "l", 
          targetHandle: dx >= 0 ? "l-t" : "r-t" 
        };
      }
      return { 
        ...e, 
        sourceHandle: dy >= 0 ? "b" : "t", 
        targetHandle: dy >= 0 ? "t-t" : "b-t" 
      };
    }

    if (horizontalRatio > 0.6 || isIncludeExtend) {
      const ss = dx >= 0 ? "r" : "l";
      const ts = dx >= 0 ? "l" : "r";
      const sIdeal = clamp(((t.cy - s.y) / s.h) * 100);
      const tIdeal = clamp(((s.cy - t.y) / t.h) * 100);
      return {
        ...e,
        sourceHandle: pickPercent(e.source, ss, sIdeal),
        targetHandle: pickPercent(e.target, ts, tIdeal, true),
      };
    }
    const ss = dy >= 0 ? "b" : "t";
    const ts = dy >= 0 ? "t" : "b";
    const sIdeal = clamp(((t.cx - s.x) / s.w) * 100);
    const tIdeal = clamp(((s.cx - t.x) / t.w) * 100);
    return {
      ...e,
      sourceHandle: pickPercent(e.source, ss, sIdeal),
      targetHandle: pickPercent(e.target, ts, tIdeal, true),
    };
  });
}

/* ============================================================
   ELK LAYERED (Activity / State / Class / Component)
   ============================================================ */
function elkOptions(type?: DiagramType): Record<string, string> {
  const base = {
    "elk.algorithm": "layered",
    "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
    "elk.layered.nodePlacement.bk.fixedAlignment": "BALANCED",
    "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
    "elk.layered.cycleBreaking.strategy": "GREEDY",
    "elk.layered.edgeRouting": "ORTHOGONAL",
    "elk.layered.unnecessaryBendpoints": "false",
    "elk.layered.spacing.edgeNode": "40",
    "elk.layered.spacing.edgeNodeBetweenLayers": "40",
    "elk.layered.spacing.edgeEdge": "20",
    "elk.spacing.edgeEdge": "20",
  };

  switch (type) {
    case "activity":
    case "state":
      return { ...base, "elk.direction": "DOWN",
        "elk.layered.spacing.nodeNodeBetweenLayers": "80", "elk.spacing.nodeNode": "50" };
    case "class":
      return { ...base, "elk.direction": "RIGHT",
        "elk.layered.spacing.nodeNodeBetweenLayers": "100", "elk.spacing.nodeNode": "55" };
    case "component":
      return { ...base, "elk.direction": "RIGHT",
        "elk.layered.spacing.nodeNodeBetweenLayers": "90", "elk.spacing.nodeNode": "50" };
    default:
      return { ...base, "elk.direction": "DOWN",
        "elk.layered.spacing.nodeNodeBetweenLayers": "80", "elk.spacing.nodeNode": "50" };
  }
}

async function elkLayout(
  nodes: FlowNode[], edges: FlowEdge[], type?: DiagramType
): Promise<{ nodes: FlowNode[]; edges: FlowEdge[] }> {
  if (!nodes.length) return { nodes, edges };
  const layoutNodes = nodes.filter((n) => n.type !== "package");
  const pkgNodes = nodes.filter((n) => n.type === "package");

  const graph = {
    id: "root",
    layoutOptions: elkOptions(type),
    children: layoutNodes.map((n) => {
      const sz = estimateSize(n);
      return { id: n.id, width: sz.width, height: sz.height };
    }),
    edges: edges.map((e) => ({ id: e.id, sources: [e.source], targets: [e.target] })),
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await elk.layout(graph as any);
  const posMap = new Map<string, { x: number; y: number }>();
  for (const c of result.children ?? []) {
    posMap.set(c.id, { x: c.x ?? 0, y: c.y ?? 0 });
  }

  const layoutedNodes = layoutNodes.map((n) => {
    const pos = posMap.get(n.id);
    if (!pos) return n;
    const sz = estimateSize(n);
    return { ...n, position: { x: pos.x, y: pos.y }, width: sz.width, height: sz.height,
      style: { ...(n.style as object), width: sz.width, height: sz.height } };
  });

  const allNodes = [...layoutedNodes, ...pkgNodes];
  const layoutedEdges = assignHandles(allNodes, edges);
  return { nodes: allNodes, edges: layoutedEdges };
}

/* ============================================================
   USE CASE LAYOUT — COMPLETE REWRITE
   Key changes:
   1. Actors positioned at AVERAGE Y of their connected UCs
   2. Edges set to "bezier" (smooth curves, NOT orthogonal L-bends)
   3. Generous spacing to prevent overlap
   4. Boundary wraps UCs tightly
   ============================================================ */
const UC_W = 170, UC_H = 76;
const UC_GAP_X = 60, UC_GAP_Y = 40;
const ACTOR_W = 76, ACTOR_H = 124;
const ACTOR_MIN_GAP = 45;
const BOUNDARY_PAD = 40;
const ACTOR_UC_GAP = 120;
const GROUP_GAP = 70;

function ucGroupMetrics(count: number) {
  const cols = count <= 2 ? 1 : Math.min(2, Math.ceil(count / 2));
  const rows = Math.ceil(count / cols);
  return {
    cols, rows,
    width: cols * UC_W + (cols - 1) * UC_GAP_X,
    height: rows * UC_H + (rows - 1) * UC_GAP_Y,
  };
}

function resolveOverlaps<T extends { idealY: number }>(
  items: T[], itemHeight: number, minGap: number
): T[] {
  const sorted = [...items].sort((a, b) => a.idealY - b.idealY);
  for (let i = 1; i < sorted.length; i++) {
    const minBottom = sorted[i - 1].idealY + itemHeight + minGap;
    if (sorted[i].idealY < minBottom) sorted[i].idealY = minBottom;
  }
  return sorted;
}

function layoutUseCase(
  nodes: FlowNode[], edges: FlowEdge[]
): { nodes: FlowNode[]; edges: FlowEdge[] } {
  const actors = nodes.filter((n) => n.type === "actor");
  const useCases = nodes.filter((n) => n.type === "usecase");
  const packages = nodes.filter((n) => n.type === "package");
  const others = nodes.filter((n) => n.type !== "actor" && n.type !== "usecase" && n.type !== "package");

  if (!useCases.length && !actors.length) {
    return { nodes, edges: assignHandles(nodes, edges) };
  }

  // 1. Build adjacency
  const actorToUCs = new Map<string, string[]>();
  const ucToActors = new Map<string, string[]>();
  for (const a of actors) actorToUCs.set(a.id, []);
  for (const uc of useCases) ucToActors.set(uc.id, []);

  for (const e of edges) {
    const sActor = actors.find((a) => a.id === e.source);
    const tUC = useCases.find((u) => u.id === e.target);
    const tActor = actors.find((a) => a.id === e.target);
    const sUC = useCases.find((u) => u.id === e.source);
    if (sActor && tUC) {
      actorToUCs.get(sActor.id)?.push(tUC.id);
      ucToActors.get(tUC.id)?.push(sActor.id);
    } else if (tActor && sUC) {
      actorToUCs.get(tActor.id)?.push(sUC.id);
      ucToActors.get(sUC.id)?.push(tActor.id);
    }
  }

  // 2. Assign primary actor + split
  const ucPrimaryActor = new Map<string, string>();
  for (const uc of useCases) {
    const connected = ucToActors.get(uc.id) ?? [];
    if (!connected.length) continue;
    let best = connected[0], bestCount = Infinity;
    for (const aId of connected) {
      const count = (actorToUCs.get(aId) ?? []).length;
      if (count < bestCount) { bestCount = count; best = aId; }
    }
    ucPrimaryActor.set(uc.id, best);
  }

  const sortedActors = [...actors].sort(
    (a, b) => (actorToUCs.get(b.id)?.length ?? 0) - (actorToUCs.get(a.id)?.length ?? 0)
  );
  const leftActorIds = new Set<string>();
  const rightActorIds = new Set<string>();
  sortedActors.forEach((a, i) => (i % 2 === 0 ? leftActorIds : rightActorIds).add(a.id));

  // 3. Group UCs
  const leftUCs: string[] = [];
  const rightUCs: string[] = [];
  const centerUCs: string[] = [];
  for (const uc of useCases) {
    const primary = ucPrimaryActor.get(uc.id);
    const connected = ucToActors.get(uc.id) ?? [];
    const hasLeft = connected.some((id) => leftActorIds.has(id));
    const hasRight = connected.some((id) => rightActorIds.has(id));
    if (hasLeft && hasRight) centerUCs.push(uc.id);
    else if (primary && leftActorIds.has(primary)) leftUCs.push(uc.id);
    else if (primary && rightActorIds.has(primary)) rightUCs.push(uc.id);
    else centerUCs.push(uc.id);
  }

  // 4. Layout geometry
  const leftM = ucGroupMetrics(leftUCs.length);
  const centerM = ucGroupMetrics(centerUCs.length);
  const rightM = ucGroupMetrics(rightUCs.length);

  const ucMaxH = Math.max(leftM.height, centerM.height, rightM.height, 120);
  let boundaryH = ucMaxH + BOUNDARY_PAD * 2;

  let cursorX = 0;
  const leftActorX = cursorX;
  cursorX += ACTOR_W + ACTOR_UC_GAP;

  const leftUCStartX = cursorX;
  cursorX += leftM.width + (leftM.width > 0 ? GROUP_GAP : 0);

  const centerUCStartX = cursorX;
  cursorX += centerM.width + (centerM.width > 0 ? GROUP_GAP : 0);

  const rightUCStartX = cursorX;
  cursorX += rightM.width + (rightM.width > 0 ? ACTOR_UC_GAP : 0);

  const rightActorX = cursorX;

  // 5. Position actors
  const positionActorsEvenly = (ids: Set<string>) => {
    const list = sortedActors.filter((a) => ids.has(a.id));
    if (!list.length) return [];
    const n = list.length;
    const actorBlockH = n * ACTOR_H + (n - 1) * ACTOR_MIN_GAP;
    if (actorBlockH + BOUNDARY_PAD * 2 > boundaryH) {
      boundaryH = actorBlockH + BOUNDARY_PAD * 2;
    }
    return list;
  };
  const leftActorList = positionActorsEvenly(leftActorIds);
  const rightActorList = positionActorsEvenly(rightActorIds);

  const finalCenterY = boundaryH / 2;

  const placeActors = (list: FlowNode[], x: number): FlowNode[] => {
    const n = list.length;
    if (!n) return [];
    const blockH = n * ACTOR_H + (n - 1) * ACTOR_MIN_GAP;
    const startY = finalCenterY - blockH / 2;
    return list.map((a, i) => ({
      ...a,
      position: { x, y: startY + i * (ACTOR_H + ACTOR_MIN_GAP) },
      width: ACTOR_W, height: ACTOR_H,
      style: { ...(a.style as object), width: ACTOR_W, height: ACTOR_H },
      zIndex: 5,
    }));
  };
  const posLeftActors = placeActors(leftActorList, leftActorX);
  const posRightActors = placeActors(rightActorList, rightActorX);

  const actorCenterY = new Map<string, number>();
  for (const a of [...posLeftActors, ...posRightActors]) {
    actorCenterY.set(a.id, a.position.y + ACTOR_H / 2);
  }

  // 6. Position UCs by actor Y
  const positionUCsByActor = (
    ucIds: string[], startX: number, sideActors: Set<string>
  ): FlowNode[] => {
    if (!ucIds.length) return [];
    const { cols } = ucGroupMetrics(ucIds.length);

    const items = ucIds.map((ucId) => {
      const connected = (ucToActors.get(ucId) ?? []).filter((id) => sideActors.has(id));
      let idealY: number;
      if (connected.length) {
        const ys = connected
          .map((id) => actorCenterY.get(id))
          .filter((y): y is number => y !== undefined);
        idealY = ys.length ? ys.reduce((s, y) => s + y, 0) / ys.length - UC_H / 2 : finalCenterY - UC_H / 2;
      } else {
        idealY = finalCenterY - UC_H / 2;
      }
      return { ucId, idealY };
    });

    const resolved = resolveOverlaps(items, UC_H, UC_GAP_Y);

    return resolved.map((item, i) => {
      const col = i % cols;
      const node = useCases.find((u) => u.id === item.ucId)!;
      return {
        ...node,
        position: { x: startX + col * (UC_W + UC_GAP_X), y: item.idealY },
        width: UC_W, height: UC_H,
        style: { ...(node.style as object), width: UC_W, height: UC_H },
        zIndex: 5,
      };
    });
  };

  const posLeftUCs = positionUCsByActor(leftUCs, leftUCStartX, leftActorIds);
  const posRightUCs = positionUCsByActor(rightUCs, rightUCStartX, rightActorIds);

  const posCenterUCs = (() => {
    if (!centerUCs.length) return [];
    const { cols, height } = ucGroupMetrics(centerUCs.length);
    const startY = finalCenterY - height / 2;
    return centerUCs.map((ucId, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const node = useCases.find((u) => u.id === ucId)!;
      return {
        ...node,
        position: { x: centerUCStartX + col * (UC_W + UC_GAP_X), y: startY + row * (UC_H + UC_GAP_Y) },
        width: UC_W, height: UC_H,
        style: { ...(node.style as object), width: UC_W, height: UC_H },
        zIndex: 5,
      };
    });
  })();

  const allUCNodes = [...posLeftUCs, ...posCenterUCs, ...posRightUCs];

  // Boundary - Recalculate based on ACTUAL positions after resolveOverlaps
  let ucMinX = Infinity, ucMaxX = -Infinity;
  let ucMinY = Infinity, ucMaxY = -Infinity;
  for (const uc of allUCNodes) {
    ucMinX = Math.min(ucMinX, uc.position.x);
    ucMaxX = Math.max(ucMaxX, uc.position.x + UC_W);
    ucMinY = Math.min(ucMinY, uc.position.y);
    ucMaxY = Math.max(ucMaxY, uc.position.y + UC_H);
  }

  const boundaryX = (isFinite(ucMinX) ? ucMinX : 0) - BOUNDARY_PAD;
  const boundaryY = (isFinite(ucMinY) ? ucMinY : 0) - BOUNDARY_PAD;
  const boundaryW = (isFinite(ucMaxX) ? ucMaxX - ucMinX : 200) + BOUNDARY_PAD * 2;
  const boundaryHeight = (isFinite(ucMaxY) ? ucMaxY - ucMinY : 200) + BOUNDARY_PAD * 2;

  const positionedPkgs = packages.map((p) => ({
    ...p,
    position: { x: boundaryX, y: boundaryY },
    width: boundaryW, height: boundaryHeight, zIndex: -1,
    style: { 
      ...(p.style as object), 
      width: boundaryW, 
      height: boundaryHeight,
      pointerEvents: "none" // Crucial: allow clicks to pass through node wrapper
    },
  }));

  const positionedOthers = others.map((o, i) => {
    const sz = estimateSize(o);
    return { ...o, position: { x: boundaryX + 20 + i * 180, y: boundaryY + boundaryHeight + BOUNDARY_PAD },
      width: sz.width, height: sz.height, zIndex: 5 };
  });

  const allNodes = [
    ...positionedPkgs,
    ...posLeftActors.map((n) => ({ ...n, zIndex: 5 })),
    ...posRightActors.map((n) => ({ ...n, zIndex: 5 })),
    ...allUCNodes.map((n) => ({ ...n, zIndex: 5 })),
    ...positionedOthers,
  ];

  const layoutedEdges = assignHandles(allNodes, edges).map((e) => ({
    ...e,
    type: "bezier",
    zIndex: 10,
  }));

  return { nodes: allNodes, edges: layoutedEdges as FlowEdge[] };
}

/* ============================================================
   PUBLIC API
   ============================================================ */
export async function layoutElements(
  nodes: FlowNode[], edges: FlowEdge[],
  options: { diagramType?: DiagramType } = {}
): Promise<{ nodes: FlowNode[]; edges: FlowEdge[] }> {
  if (!nodes.length) return { nodes, edges };

  const hasActors = nodes.some((n) => n.type === "actor");
  const hasUseCases = nodes.some((n) => n.type === "usecase");
  if (options.diagramType === "usecase" || (hasActors && hasUseCases)) {
    return layoutUseCase(nodes, edges);
  }
  return elkLayout(nodes, edges, options.diagramType);
}
