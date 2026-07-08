import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Panel,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  ConnectionMode,
  SelectionMode,
  useReactFlow,
  type Connection,
  type NodeChange,
  type EdgeChange,
  type XYPosition,
} from "@xyflow/react";
import { toPng } from "html-to-image";
import { nanoid } from "nanoid";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { projectService, sheetService, type SheetResponse } from "../services";

import { nodeTypes } from "./canvas/Nodes";
import { edgeTypes } from "./canvas/Edges";
import { layoutElements } from "../lib/elkLayout";
import { MarkerDefs } from "./shared/MarkerDefs";
import { computeSnap, nodeBox } from "../lib/snap";
import { EditorContext } from "../lib/editorContext";
import { getDiagram, getEdgeOption, patchFromOption, sampleFor } from "../lib/diagrams";
import { detectAndParse } from "../lib/importers";
import type { DiagramType, FlowEdge, FlowNode, FlowNodeData, PaletteItem, Sheet } from "../types";
import { Toolbar } from "./panels/Toolbar";
import { Sidebar } from "./panels/Sidebar";
import { Inspector, type AlignMode } from "./panels/Inspector";
import { ContextMenu, CtxIcons, type CtxItem } from "./overlays/ContextMenu";
import { SmartGuides, type GuidesState } from "./canvas/SmartGuides";
import { QuickAdd } from "./canvas/QuickAdd";
import { RemoteCursors } from "./canvas/RemoteCursors";
import { ImportModal } from "./overlays/ImportModal";
import { HelpOverlay } from "./overlays/HelpOverlay";
import { AIChat } from "./panels/AIChat";
import { SheetBar } from "./panels/SheetBar";
import { ConfirmDialog } from "./overlays/ConfirmDialog";
import { TypeMenu } from "./overlays/TypeMenu";
import { loadSheets, saveSheets, saveActiveId, loadActiveId, createSheet } from "../store/sheetStore";
import { useCollab } from "../hooks/useCollab";
import type { CanvasChangeData } from "../services";
import { useAuthStore } from "../stores/useAuthStore";

type Snap = { nodes: FlowNode[]; edges: FlowEdge[] };
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

/** Convert a marker URL to its "start" (source) form. */
function endpointStart(id: string): string {
  if (!id) return "";
  if (id.includes("m-diamond-filled")) return "url(#m-diamond-filled-start)";
  if (id.includes("m-diamond-open")) return "url(#m-diamond-open-start)";
  return id; // arrow / open arrow / triangle use auto-start-reverse
}
/** Convert a marker URL to its "end" (target) form. */
function endpointEnd(id: string): string {
  if (!id) return "";
  if (id.includes("m-diamond-filled")) return "url(#m-diamond-filled)";
  if (id.includes("m-diamond-open")) return "url(#m-diamond-open)";
  return id;
}

function download(filename: string, content: string) {
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function Editor() {
  const rf = useReactFlow();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [diagramType, setDiagramType] = useState<DiagramType>("activity");
  const [nodes, setNodesState] = useState<FlowNode[]>([]);
  const [edges, setEdgesState] = useState<FlowEdge[]>([]);
  const [activeEdgeId, setActiveEdgeId] = useState<string>("cf");
  const [showGrid, setShowGrid] = useState(true);
  const [showMinimap, setShowMinimap] = useState(false);
  const [snap, setSnap] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [sel, setSel] = useState<{ nodes: FlowNode[]; edges: FlowEdge[] }>({
    nodes: [],
    edges: [],
  });
  const [hist, setHist] = useState({ undo: false, redo: false });
  const [saved, setSaved] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [inspectorManualOpen, setInspectorManualOpen] = useState(false);
  const [guides, setGuides] = useState<GuidesState>({ guidesX: [], guidesY: [] });
  const [ctxMenu, setCtxMenu] = useState<{
    x: number;
    y: number;
    items: CtxItem[];
  } | null>(null);
  const [quickAdd, setQuickAdd] = useState<{
    x: number;
    y: number;
    flowPos: XYPosition;
  } | null>(null);
  const [edgeEdit, setEdgeEdit] = useState<{
    x: number;
    y: number;
    id: string;
    value: string;
  } | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [typeMenu, setTypeMenu] = useState(false);
  const [aiOpen, setAiOpen] = useState(true);
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [activeSheetId, setActiveSheetId] = useState<string>("");
  const [projectName, setProjectName] = useState<string>("");
  const [projectOwner, setProjectOwner] = useState<string>("");
  const [publicAccess, setPublicAccess] = useState<boolean>(false);

  const sheetsRef = useRef<Sheet[]>([]);
  const projectNameRef = useRef<string>("");

  useEffect(() => {
    sheetsRef.current = sheets;
  }, [sheets]);

  useEffect(() => {
    projectNameRef.current = projectName;
  }, [projectName]);

  const nodesRef = useRef<FlowNode[]>([]);
  const edgesRef = useRef<FlowEdge[]>([]);
  const canvasRef = useRef<HTMLDivElement>(null);
  const past = useRef<Snap[]>([]);
  const future = useRef<Snap[]>([]);
  const burst = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipRec = useRef(false);
  const armed = useRef(false);
  const dragActiveRef = useRef(false);
  const clipboard = useRef<FlowNode[] | null>(null);
  const skipCollabEmit = useRef(false);

  /* ---------- collab ---------- */
  const onRemoteCanvasChange = useCallback((data: CanvasChangeData) => {
    skipCollabEmit.current = true;
    if (data.nodes) {
      setNodesState(data.nodes);
      nodesRef.current = data.nodes;
    }
    if (data.edges) {
      setEdgesState(data.edges);
      edgesRef.current = data.edges;
    }
    setTimeout(() => {
      skipCollabEmit.current = false;
    }, 10);
  }, []);

  const onCollabDisabled = useCallback(() => {
    // Only kick if not the owner
    if (user?.email !== projectOwner) {
      toast.error("Collaboration disabled by owner. Redirecting...");
      navigate("/dashboard");
    }
  }, [user?.email, projectOwner, navigate]);

  const {
    remoteCursors,
    remoteSelections,
    emitCursorMove,
    emitSelectionChange,
    emitCanvasChange,
    emitNodeMove,
  } = useCollab(activeSheetId, publicAccess, onRemoteCanvasChange, onCollabDisabled);

  /* ---------- state setters that keep refs in sync ---------- */
  const setNodes = useCallback(
    (updater: FlowNode[] | ((prev: FlowNode[]) => FlowNode[])) => {
      setNodesState((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        nodesRef.current = next;
        return next;
      });
    },
    []
  );
  const setEdges = useCallback(
    (updater: FlowEdge[] | ((prev: FlowEdge[]) => FlowEdge[])) => {
      setEdgesState((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        edgesRef.current = next;
        return next;
      });
    },
    []
  );

  /* ---------- history ---------- */
  const syncHist = useCallback(() => {
    setHist({ undo: past.current.length > 0, redo: future.current.length > 0 });
  }, []);

  const beginMutation = useCallback(() => {
    if (!armed.current || skipRec.current) return;
    if (!burst.current) {
      burst.current = true;
      past.current.push({
        nodes: clone(nodesRef.current),
        edges: clone(edgesRef.current),
      });
      if (past.current.length > 80) past.current.shift();
      future.current = [];
      syncHist();
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      burst.current = false;
    }, 450);
  }, [syncHist]);

  const undo = useCallback(() => {
    if (!past.current.length) return;
    const prev = past.current.pop()!;
    future.current.push({
      nodes: clone(nodesRef.current),
      edges: clone(edgesRef.current),
    });
    skipRec.current = true;
    setNodes(prev.nodes);
    setEdges(prev.edges);
    if (!skipCollabEmit.current) {
      emitCanvasChange({ nodes: prev.nodes, edges: prev.edges, type: "update" });
    }
    setSel({ nodes: [], edges: [] });
    skipRec.current = false;
    syncHist();
  }, [setNodes, setEdges, syncHist]);

  const redo = useCallback(() => {
    if (!future.current.length) return;
    const next = future.current.pop()!;
    past.current.push({
      nodes: clone(nodesRef.current),
      edges: clone(edgesRef.current),
    });
    skipRec.current = true;
    setNodes(next.nodes);
    setEdges(next.edges);
    if (!skipCollabEmit.current) {
      emitCanvasChange({ nodes: next.nodes, edges: next.edges, type: "update" });
    }
    setSel({ nodes: [], edges: [] });
    skipRec.current = false;
    syncHist();
  }, [setNodes, setEdges, syncHist]);

  /* ---------- node / edge ops ---------- */
  const onNodesChange = useCallback(
    (changes: NodeChange<FlowNode>[]) => {
      // Record history for structural / positional edits only.
      const meaningful = changes.some(
        (c) =>
          (c.type === "position" && c.dragging) ||
          c.type === "remove" ||
          c.type === "replace"
      );
      if (meaningful) beginMutation();

      // Smart alignment guides + snapping (disabled while grid-snap is on,
      // since the two would fight each other). Tracks the drag lifecycle so we
      // ALSO snap the terminal commit event (dragging:false) — otherwise React
      // Flow would land the node a few pixels off the guide on release.
      let nextChanges: NodeChange<FlowNode>[] = changes;
      const positionChanges = changes.filter((c) => c.type === "position");
      const anyActive = positionChanges.some((c) => c.dragging);
      const anyEnd = positionChanges.some((c) => c.dragging === false);
      if (anyActive) dragActiveRef.current = true;
      if (!snap && dragActiveRef.current && (anyActive || anyEnd)) {
        // candidate nodes to snap: those being dragged OR the terminal commit
        const snapNodes = positionChanges.filter(
          (c): c is Extract<NodeChange<FlowNode>, { type: "position" }> =>
            c.dragging || anyEnd
        );
        const first = snapNodes[0];
        const dragIds = new Set(snapNodes.map((d) => d.id));
        const others = nodesRef.current
          .filter((n) => !dragIds.has(n.id))
          .map(nodeBox);
        // ALWAYS probe from the change's proposed position — this is the
        // position React Flow is about to commit (raw pointer position,
        // including on the terminal release event). Computing the snap from
        // here and applying the delta lands the node exactly on the guide.
        const refNode = nodesRef.current.find((n) => n.id === first.id);
        const refBox = refNode ? nodeBox(refNode) : null;
        let dx = 0;
        let dy = 0;
        let guidesX: number[] = [];
        let guidesY: number[] = [];
        if (refBox && first.position) {
          const r = computeSnap(
            { ...refBox, x: first.position.x, y: first.position.y },
            others
          );
          dx = r.dx;
          dy = r.dy;
          guidesX = r.guidesX;
          guidesY = r.guidesY;
        }
        nextChanges = changes.map((c) => {
          if (c.type === "position" && dragIds.has(c.id) && c.position) {
            return {
              ...c,
              position: { x: c.position.x + dx, y: c.position.y + dy },
            };
          }
          return c;
        });
        setGuides({ guidesX: anyEnd ? [] : guidesX, guidesY: anyEnd ? [] : guidesY });
      } else if (dragActiveRef.current) {
        setGuides({ guidesX: [], guidesY: [] });
      }
      if (anyEnd) dragActiveRef.current = false;
      
      setNodes((prev) => {
        const nextNodesState = applyNodeChanges(nextChanges, prev);
        
        if (!skipCollabEmit.current) {
        if (positionChanges.some(c => c.dragging)) {
          emitNodeMove(nextNodesState);
        } else if (changes.some(c => c.type === 'remove')) {
          emitCanvasChange({ nodes: nextNodesState, type: "remove" });
        }
      }

        return nextNodesState;
      });
    },
    [beginMutation, setNodes, snap, emitNodeMove]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange<FlowEdge>[]) => {
      if (changes.some((c) => c.type === "remove")) beginMutation();
      setEdges((prev) => {
        const next = applyEdgeChanges(changes, prev);
        if (!skipCollabEmit.current && changes.some(c => c.type === 'remove')) {
          emitCanvasChange({ edges: next, type: "remove" });
        }
        return next;
      });
    },
    [beginMutation, setEdges, emitCanvasChange]
  );

  const onConnect = useCallback(
    (conn: Connection) => {
      beginMutation();
      const opt = getEdgeOption(diagramType, activeEdgeId);
      const p = patchFromOption(opt);
      const newEdge: FlowEdge = {
        id: nanoid(8),
        source: conn.source,
        target: conn.target,
        sourceHandle: conn.sourceHandle ?? undefined,
        targetHandle: conn.targetHandle ?? undefined,
        type: p.type,
        label: p.label,
        data: { marker: p.marker, markerStart: p.markerStart, dashed: p.dashed },
      };
      setEdges((prev) => {
        const next = addEdge(newEdge, prev);
        if (!skipCollabEmit.current) {
          emitCanvasChange({ edges: next, type: "add" });
        }
        return next;
      });
    },
    [beginMutation, diagramType, activeEdgeId, setEdges, emitCanvasChange]
  );

  const updateNodeData = useCallback(
    (id: string, patch: Partial<FlowNodeData>) => {
      beginMutation();
      setNodes((prev) => {
        const next = prev.map((n) =>
          n.id === id ? { ...n, data: { ...(n.data as FlowNodeData) as FlowNodeData, ...patch } } : n
        );
        if (!skipCollabEmit.current) {
          emitCanvasChange({ nodes: next, type: "update" });
        }
        return next;
      });
    },
    [beginMutation, setNodes, emitCanvasChange]
  );

  /** Enlarge a node so it never clips its text. Not recorded in history. */
  const growNode = useCallback(
    (id: string, minW: number, minH: number) => {
      setNodesState((prev) => {
        const n = prev.find((x) => x.id === id);
        if (!n) return prev;
        const cw = (n.measured?.width ?? n.width ?? 0) as number;
        const ch = (n.measured?.height ?? n.height ?? 0) as number;
        if (cw >= minW && ch >= minH) return prev;
        const w = Math.max(cw, minW);
        const h = Math.max(ch, minH);
        const idx = prev.indexOf(n);
        const next = prev.slice();
        next[idx] = {
          ...n,
          width: w,
          height: h,
          style: { ...(n.style as object), width: w, height: h },
        };
        nodesRef.current = next;
        return next;
      });
    },
    []
  );

  const updateEdge = useCallback(
    (
      id: string,
      patch: {
        label?: string;
        marker?: string;
        markerStart?: string;
        type?: string;
        dashed?: boolean;
        color?: string;
        flip?: boolean;
      }
    ) => {
      beginMutation();
      setEdges((prev) => {
        const next = prev.map((e) => {
          if (e.id !== id) return e;
          const nextEdge = { ...e };
          const data: Record<string, unknown> = { ...(e.data as object) };
          if (patch.label !== undefined) nextEdge.label = patch.label;
          if (patch.type !== undefined) nextEdge.type = patch.type as FlowEdge["type"];
          if (patch.marker !== undefined) data.marker = patch.marker;
          if (patch.markerStart !== undefined) data.markerStart = patch.markerStart;
          if (patch.dashed !== undefined) data.dashed = patch.dashed;
          if (patch.color !== undefined) {
            // "" clears the override → falls back to default ink
            data.color = patch.color || undefined;
          }
          if (patch.flip) {
            // swap the two caps to visually reverse the arrow direction
            const a = (data.marker as string) ?? "";
            const b = (data.markerStart as string) ?? "";
            data.marker = b ? endpointEnd(b) : "";
            data.markerStart = a ? endpointStart(a) : "";
          }
          nextEdge.data = data;
          return nextEdge;
        });
        if (!skipCollabEmit.current) {
          emitCanvasChange({ edges: next, type: "update" });
        }
        return next;
      });
    },
    [beginMutation, setEdges, emitCanvasChange]
  );

  const addNode = useCallback(
    (item: PaletteItem, pos?: XYPosition) => {
      beginMutation();
      let position = pos;
      if (!position) {
        const c = rf.screenToFlowPosition({
          x: window.innerWidth / 2,
          y: window.innerHeight / 2,
        });
        position = { x: c.x - (item.width || 120) / 2, y: c.y - (item.height || 40) / 2 };
      }
      const node: FlowNode = {
        id: nanoid(8),
        type: item.type,
        position,
        data: { 
          label: item.data?.label || "",
          attributes: item.data?.attributes || "",
          methods: item.data?.methods || "",
          stereotype: item.data?.stereotype || "",
          ...item.data 
        },
        width: item.width,
        height: item.height,
        style: { width: item.width, height: item.height },
      };
      setNodes((prev) => {
        const next = prev.concat(node);
        if (!skipCollabEmit.current) {
          emitCanvasChange({ nodes: next, type: "add" });
        }
        return next;
      });
    },
    [beginMutation, rf, setNodes, emitCanvasChange]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const raw = e.dataTransfer.getData("application/graphite");
      if (!raw) return;
      try {
        const item = JSON.parse(raw) as PaletteItem;
        const p = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY });
        addNode(item, { x: p.x - item.width / 2, y: p.y - item.height / 2 });
      } catch {
        /* ignore */
      }
    },
    [rf, addNode]
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const deleteSelected = useCallback(() => {
    const selNodes = nodesRef.current.filter((n) => n.selected);
    const selEdges = edgesRef.current.filter((e) => e.selected);
    if (!selNodes.length && !selEdges.length) return;
    beginMutation();
    const ids = new Set(selNodes.map((n) => n.id));
    setNodes((prev) => {
      const next = prev.filter((n) => !n.selected);
      if (!skipCollabEmit.current) {
        emitCanvasChange({ nodes: next, type: "remove" });
      }
      return next;
    });
    setEdges((prev) => {
      const next = prev.filter((e) => {
        if (e.selected) return false;
        if (ids.has(e.source) || ids.has(e.target)) return false;
        return true;
      });
      if (!skipCollabEmit.current) {
        emitCanvasChange({ edges: next, type: "remove" });
      }
      return next;
    });
    setSel({ nodes: [], edges: [] });
  }, [beginMutation, setNodes, setEdges, emitCanvasChange]);

  const duplicateSelected = useCallback(() => {
    const selNodes = nodesRef.current.filter((n) => n.selected);
    if (!selNodes.length) return;
    beginMutation();
    const clones: FlowNode[] = selNodes.map((n) => ({
      ...clone(n),
      id: nanoid(8),
      position: { x: n.position.x + 26, y: n.position.y + 26 },
      selected: true,
      data: { ...(n.data as FlowNodeData) },
    }));
    setNodes((prev) => {
      const next = prev.map((n) => (n.selected ? { ...n, selected: false } : n)).concat(clones);
      if (!skipCollabEmit.current) {
        emitCanvasChange({ nodes: next, type: "add" });
      }
      return next;
    });
  }, [beginMutation, setNodes, emitCanvasChange]);

  /**
   * Snap nodes into place at the moment of release. React Flow commits a final
   * position event (dragging:false) carrying the raw cursor position, which
   * would otherwise leave the node a few pixels off the guide line it snapped
   * to during the drag. Recomputing & applying the snap here guarantees the
   * dropped node lands exactly on the aligned position. Not an undo step.
   */
  const snapOnStop = useCallback(() => {
    setGuides({ guidesX: [], guidesY: [] });
    if (snap) return;
    const dragged = nodesRef.current.filter((n) => n.selected);
    if (!dragged.length) return;
    const dragIds = new Set(dragged.map((n) => n.id));
    const others = nodesRef.current
      .filter((n) => !dragIds.has(n.id))
      .map(nodeBox);
    const ref = nodeBox(dragged[0]);
    const r = computeSnap(ref, others);
    if (r.dx === 0 && r.dy === 0) return;
    setNodes((prev) => {
      const next = prev.map((n) =>
        dragIds.has(n.id)
          ? {
              ...n,
              position: { x: n.position.x + r.dx, y: n.position.y + r.dy },
            }
          : n
      );
      if (!skipCollabEmit.current) {
        emitCanvasChange({ nodes: next, type: "move" });
      }
      return next;
    });
  }, [snap, setNodes, emitCanvasChange]);

  const bringToFront = useCallback(() => {
    if (!nodesRef.current.some((n) => n.selected)) return;
    beginMutation();
    setNodes((prev) => {
      const sel = prev.filter((n) => n.selected);
      const rest = prev.filter((n) => !n.selected);
      const next = [...rest, ...sel];
      if (!skipCollabEmit.current) {
        emitCanvasChange({ nodes: next, type: "update" });
      }
      return next;
    });
  }, [beginMutation, setNodes, emitCanvasChange]);

  const sendToBack = useCallback(() => {
    if (!nodesRef.current.some((n) => n.selected)) return;
    beginMutation();
    setNodes((prev) => {
      const sel = prev.filter((n) => n.selected);
      const rest = prev.filter((n) => !n.selected);
      const next = [...sel, ...rest];
      if (!skipCollabEmit.current) {
        emitCanvasChange({ nodes: next, type: "update" });
      }
      return next;
    });
  }, [beginMutation, setNodes, emitCanvasChange]);

  const selectAll = useCallback(() => {
    setNodes((prev) => {
      const next = prev.map((n) => ({ ...n, selected: true }));
      // No emit for selection here? Actually we should emit selection change.
      return next;
    });
    setEdges((prev) => {
      const next = prev.map((e) => ({ ...e, selected: true }));
      return next;
    });
    // Selection emit is handled by onSelectionChange if React Flow triggers it.
    // If not, we should manually emit.
  }, [setNodes, setEdges]);

  const nudge = useCallback(
    (dx: number, dy: number) => {
      if (!nodesRef.current.some((n) => n.selected)) return;
      beginMutation();
      setNodes((prev) => {
        const next = prev.map((n) =>
          n.selected
            ? { ...n, position: { x: n.position.x + dx, y: n.position.y + dy } }
            : n
        );
        if (!skipCollabEmit.current) {
          emitCanvasChange({ nodes: next, type: "move" });
        }
        return next;
      });
    },
    [beginMutation, setNodes, emitCanvasChange]
  );

  const alignSelection = useCallback(
    (mode: AlignMode) => {
      beginMutation();
      setNodes((prev) => {
        const items = prev.filter((n) => n.selected);
        if (items.length < 2) return prev;
        const boxes = items.map((n) => {
          const w = n.measured?.width ?? n.width ?? 120;
          const h = n.measured?.height ?? n.height ?? 40;
          return { id: n.id, x: n.position.x, y: n.position.y, w, h };
        });
        const minL = Math.min(...boxes.map((b) => b.x));
        const maxR = Math.max(...boxes.map((b) => b.x + b.w));
        const minT = Math.min(...boxes.map((b) => b.y));
        const maxB = Math.max(...boxes.map((b) => b.y + b.h));
        const cX = (minL + maxR) / 2;
        const cY = (minT + maxB) / 2;
        const pos: Record<string, { x?: number; y?: number }> = {};
        const apply = (id: string, p: { x?: number; y?: number }) => {
          pos[id] = { ...(pos[id] ?? {}), ...p };
        };
        switch (mode) {
          case "left":
            boxes.forEach((b) => apply(b.id, { x: minL }));
            break;
          case "right":
            boxes.forEach((b) => apply(b.id, { x: maxR - b.w }));
            break;
          case "centerH":
            boxes.forEach((b) => apply(b.id, { x: cX - b.w / 2 }));
            break;
          case "top":
            boxes.forEach((b) => apply(b.id, { y: minT }));
            break;
          case "bottom":
            boxes.forEach((b) => apply(b.id, { y: maxB - b.h }));
            break;
          case "centerV":
            boxes.forEach((b) => apply(b.id, { y: cY - b.h / 2 }));
            break;
          case "distH": {
            const sorted = [...boxes].sort((a, b) => a.x - b.x);
            const sumW = sorted.reduce((s, b) => s + b.w, 0);
            const gap = (maxR - minL - sumW) / (sorted.length - 1);
            let cur = minL;
            sorted.forEach((b) => {
              apply(b.id, { x: cur });
              cur += b.w + gap;
            });
            break;
          }
          case "distV": {
            const sorted = [...boxes].sort((a, b) => a.y - b.y);
            const sumH = sorted.reduce((s, b) => s + b.h, 0);
            const gap = (maxB - minT - sumH) / (sorted.length - 1);
            let cur = minT;
            sorted.forEach((b) => {
              apply(b.id, { y: cur });
              cur += b.h + gap;
            });
            break;
          }
        }
        const next = prev.map((n) =>
          pos[n.id] ? { ...n, position: { ...n.position, ...pos[n.id] } } : n
        );
        if (!skipCollabEmit.current) {
          emitCanvasChange({ nodes: next, type: "move" });
        }
        return next;
      });
    },
    [beginMutation, setNodes, emitCanvasChange]
  );

  const copy = useCallback(() => {
    const selNodes = nodesRef.current.filter((n) => n.selected);
    if (selNodes.length) clipboard.current = clone(selNodes);
  }, []);

  const paste = useCallback(() => {
    if (!clipboard.current?.length) return;
    beginMutation();
    const clones: FlowNode[] = clipboard.current.map((n) => ({
      ...clone(n),
      id: nanoid(8),
      position: { x: n.position.x + 26, y: n.position.y + 26 },
      selected: true,
      data: { ...(n.data as FlowNodeData) },
    }));
    setNodes((prev) =>
      prev.map((n) => (n.selected ? { ...n, selected: false } : n)).concat(clones)
    );
  }, [beginMutation, setNodes]);

  /* ---------- context menus ---------- */
  const onNodeCtx = useCallback(
    (e: React.MouseEvent, _node: FlowNode) => {
      e.preventDefault();
      const node = _node as FlowNode;
      // Select just the right-clicked node if it isn't already selected, so
      // the menu actions act on a predictable set of nodes.
      if (!node.selected) {
        setNodes((prev) =>
          prev.map((n) => ({ ...n, selected: n.id === node.id }))
        );
      }
      const isMac =
        typeof navigator !== "undefined" &&
        /Mac|iPhone|iPad/.test(navigator.platform);
      const mod = isMac ? "⌘" : "Ctrl";
      const items: CtxItem[] = [
        { label: "Duplicate", shortcut: `${mod}+D`, icon: CtxIcons.duplicate, onClick: duplicateSelected },
        { label: "Copy", shortcut: `${mod}+C`, icon: CtxIcons.copy, onClick: copy },
        { divider: true, label: "" },
        { label: "Bring to front", icon: CtxIcons.front, onClick: bringToFront },
        { label: "Send to back", icon: CtxIcons.back, onClick: sendToBack },
        { divider: true, label: "" },
        { label: "Delete", shortcut: "Del", icon: CtxIcons.delete, danger: true, onClick: deleteSelected },
      ];
      setCtxMenu({ x: e.clientX, y: e.clientY, items });
    },
    [bringToFront, sendToBack, deleteSelected, duplicateSelected, copy, setNodes]
  );

  const onPaneCtx = useCallback(
    (e: MouseEvent | React.MouseEvent) => {
      if (!e) return;
      e.preventDefault();
      const isMac =
        typeof navigator !== "undefined" &&
        /Mac|iPhone|iPad/.test(navigator.platform);
      const mod = isMac ? "⌘" : "Ctrl";
      const canPaste = !!clipboard.current?.length;
      const items: CtxItem[] = [
        {
          label: "Add shape here",
          icon: CtxIcons.duplicate,
          onClick: () => {
            const d = getDiagram(diagramType);
            const primary = d.nodes.find((n) => n.type !== "note") ?? d.nodes[0];
            const p = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY });
            addNode(primary, { x: p.x - primary.width / 2, y: p.y - primary.height / 2 });
          },
        },
        { label: "Paste here", icon: CtxIcons.paste, shortcut: `${mod}+V`, disabled: !canPaste, onClick: paste },
        {
          label: "Select all",
          icon: CtxIcons.selectAll,
          shortcut: `${mod}+A`,
          onClick: selectAll,
        },
      ];
      setCtxMenu({ x: e.clientX, y: e.clientY, items });
    },
    [paste, selectAll, diagramType, rf, addNode]
  );

  const onEdgeDoubleClick = useCallback(
    (e: React.MouseEvent, edge: FlowEdge) => {
      e.stopPropagation();
      setEdgeEdit({
        x: e.clientX,
        y: e.clientY,
        id: edge.id,
        value: (edge.label as string) ?? "",
      });
    },
    []
  );

  const onCanvasDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      // Only trigger on empty canvas, not on nodes / edges / UI chrome.
      if (
        target.closest(".react-flow__node") ||
        target.closest(".react-flow__edge") ||
        target.closest(".react-flow__controls") ||
        target.closest(".react-flow__minimap") ||
        target.closest(".react-flow__panel")
      ) {
        return;
      }
      const flowPos = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY });
      setQuickAdd({ x: e.clientX, y: e.clientY, flowPos });
    },
    [rf]
  );

  const onSelectionChange = useCallback(
    ({ nodes: n, edges: edg }: { nodes: FlowNode[]; edges: FlowEdge[] }) => {
      setSel({ nodes: n, edges: edg });
      emitSelectionChange(n.map(x => x.id), edg.map(x => x.id));
      
      // Auto-open/close logic for Inspector
      if (n.length > 0 || edg.length > 0) {
        setInspectorOpen(true);
      } else if (!inspectorManualOpen) {
        setInspectorOpen(false);
      }
    },
    [inspectorManualOpen]
  );

  const layoutCanvas = useCallback(
    async (direction?: string) => {
      beginMutation();
      
      // Initial fade-out for smoother transition
      setNodes((prev) => prev.map((n) => ({ ...n, style: { ...n.style, opacity: 0 } })));
      setEdges((prev) => prev.map((e) => ({ ...e, style: { ...e.style, opacity: 0 } })));

      // PASS 1: layout with estimated sizes
      const { nodes: l1, edges: e1 } = await layoutElements(
        nodesRef.current,
        edgesRef.current,
        { diagramType }
      );
      setNodes(l1);
      setEdges(e1);

      // Wait for RF to measure real sizes
      await new Promise((r) => setTimeout(r, 100));
      await new Promise((r) => requestAnimationFrame(() => r(null)));

      // PASS 2: re-layout with correct sizes
      const { nodes: finalNodes, edges: finalEdges } = await layoutElements(
        nodesRef.current,
        edgesRef.current,
        { diagramType }
      );
      
      // Final nodes with fade-in
      setNodes(finalNodes.map(n => ({ ...n, style: { ...n.style, opacity: 1 } })));
      setEdges(finalEdges.map(e => ({ ...e, style: { ...e.style, opacity: 1 } })));

      setTimeout(() => rf.fitView({ padding: 0.25, duration: 450 }), 60);

      if (!skipCollabEmit.current) {
        emitCanvasChange({ nodes: finalNodes, edges: finalEdges, type: "layout" });
      }
    },
    [beginMutation, setNodes, setEdges, diagramType, emitCanvasChange, rf]
  );

  /** Replace the whole canvas (used by the AI assistant / importers). */
  const importCanvas = useCallback(
    async (inNodes: FlowNode[], inEdges: FlowEdge[], type?: DiagramType) => {
      beginMutation();
      const finalType = type || diagramType;
      if (type) {
        setDiagramType(type);
        setActiveEdgeId(getDiagram(type).defaultEdge);
      }
      
      // If the incoming state is empty, just clear everything and stop.
      if (inNodes.length === 0) {
        setNodes([]);
        setEdges([]);
        setSel({ nodes: [], edges: [] });
        if (!skipCollabEmit.current) {
          emitCanvasChange({ nodes: [], edges: [], type: "add" });
        }
        return;
      }

      // Map existing nodes by ID for position stability
      const existingNodesMap = new Map(nodesRef.current.map(n => [n.id, n.position]));
      // Map existing edges by ID for handle stability
      const existingEdgesMap = new Map(edgesRef.current.map(e => [e.id, { sh: e.sourceHandle, th: e.targetHandle }]));

      // Ensure opacity 0 for import (visual transition)
      const hiddenNodes = inNodes.map(n => ({ ...n, style: { ...n.style, opacity: 0 } }));
      const hiddenEdges = inEdges.map(e => {
        const old = existingEdgesMap.get(e.id);
        return { 
          ...e, 
          sourceHandle: old?.sh || e.sourceHandle, 
          targetHandle: old?.th || e.targetHandle,
          style: { ...e.style, opacity: 0 } 
        };
      });

      // PASS 1: layout with estimated sizes
      const { nodes: l1, edges: e1 } = await layoutElements(
        hiddenNodes,
        hiddenEdges,
        { diagramType: finalType }
      );

      // Restore positions for existing nodes to maintain stability
      const stabilizedL1 = l1.map(n => {
        const oldPos = existingNodesMap.get(n.id);
        if (oldPos) {
          return { ...n, position: oldPos };
        }
        return n;
      });

      setNodes(stabilizedL1);
      setEdges(e1);

      // Wait for RF to measure real sizes
      await new Promise((r) => setTimeout(r, 100));
      await new Promise((r) => requestAnimationFrame(() => r(null)));

      // PASS 2: re-layout with correct sizes
      const { nodes: finalNodes, edges: finalEdges } = await layoutElements(
        nodesRef.current,
        edgesRef.current,
        { diagramType: finalType }
      );

      // Restore positions and handles again for the final layout pass
      const stabilizedFinalNodes = finalNodes.map(n => {
        const oldPos = existingNodesMap.get(n.id);
        if (oldPos) {
          return { ...n, position: oldPos };
        }
        return n;
      });

      const stabilizedFinalEdges = finalEdges.map(e => {
        const old = existingEdgesMap.get(e.id);
        // Only restore handles if source and target are the same as before
        if (old && e.source === edgesRef.current.find(oe => oe.id === e.id)?.source && 
            e.target === edgesRef.current.find(oe => oe.id === e.id)?.target) {
          return { ...e, sourceHandle: old.sh, targetHandle: old.th };
        }
        return e;
      });

      const visibleNodes = stabilizedFinalNodes.map(n => ({ ...n, style: { ...n.style, opacity: 1 } }));
      const visibleEdges = stabilizedFinalEdges.map(e => ({ ...e, style: { ...e.style, opacity: 1 } }));

      setNodes(visibleNodes);
      setEdges(visibleEdges);
      setSel({ nodes: [], edges: [] });
      
      setTimeout(() => rf.fitView({ padding: 0.25, duration: 450 }), 60);

      if (!skipCollabEmit.current) {
        emitCanvasChange({ nodes: visibleNodes, edges: visibleEdges, type: "add" });
      }
    },
    [beginMutation, setNodes, setEdges, emitCanvasChange, diagramType, rf]
  );

  /* ---------- load / persist (multi-sheet) ---------- */
  useEffect(() => {
    if (!id) return;

    const initWorkspace = async () => {
      try {
        const [projectRes, sheetsRes] = await Promise.all([
          projectService.getProjectById(id),
          sheetService.getSheetsByProject(id)
        ]);

        setProjectName(projectRes.result.projectName);
        setProjectOwner(projectRes.result.ownerEmail || "");
        setPublicAccess(projectRes.result.publicAccess || false);
        
        let all: Sheet[] = [];
        if (sheetsRes.result && sheetsRes.result.length > 0) {
          all = sheetsRes.result.map(s => {
            let diagramData: any = { nodes: [], edges: [], diagramType: "activity" };
            try {
              const parsed = JSON.parse(s.diagramData);
              if (parsed && typeof parsed === 'object') {
                diagramData = parsed;
              }
              
              // Sanitize nodes to prevent WSoD from previous corrupted data
              if (Array.isArray(diagramData.nodes)) {
                diagramData.nodes = diagramData.nodes.map((node: any) => {
                  if (!node) return null;
                  const rawData = node.data || node || {};
                  const data = { 
                    ...rawData,
                    label: String(rawData.label || ""),
                    attributes: Array.isArray(rawData.attributes) ? rawData.attributes.join("\n") : String(rawData.attributes || ""),
                    methods: Array.isArray(rawData.methods) ? rawData.methods.join("\n") : String(rawData.methods || "")
                  };
                  return { 
                    ...node, 
                    id: String(node.id || `node-${Math.random()}`),
                    type: node.type || 'action',
                    position: node.position || { x: Number(node.x || 0), y: Number(node.y || 0) },
                    data 
                  };
                }).filter(Boolean);
              } else {
                diagramData.nodes = [];
              }

              if (!Array.isArray(diagramData.edges)) {
                diagramData.edges = [];
              }
            } catch (e) {
              console.error("Failed to parse sheet data", e);
            }
            return {
              id: s.id,
              name: s.name,
              diagramType: diagramData.diagramType || "activity",
              nodes: diagramData.nodes || [],
              edges: diagramData.edges || [],
              viewport: diagramData.viewport || { x: 0, y: 0, zoom: 1 },
              updatedAt: new Date(s.updatedAt).getTime()
            };
          });
        } else {
          // New project: start with a single empty sheet
          const firstSheet = createSheet([]);
          try {
            const newSheetRes = await sheetService.createSheet({
              name: firstSheet.name,
              orderIndex: 0,
              projectId: id,
              diagramData: JSON.stringify({
                nodes: firstSheet.nodes,
                edges: firstSheet.edges,
                diagramType: firstSheet.diagramType
              })
            });
            all = [{
              ...firstSheet,
              id: newSheetRes.result.id
            }];
          } catch (e) {
            console.error("Failed to create initial sheet on server", e);
            all = [firstSheet];
          }
        }

        const activeId = loadActiveId() && all.some((s) => s.id === loadActiveId())
          ? loadActiveId()!
          : all[0].id;
        const active = all.find((s) => s.id === activeId) ?? all[0];
        
        setSheets(all);
        setActiveSheetId(active.id);
        setDiagramType(active.diagramType);
        setActiveEdgeId(getDiagram(active.diagramType).defaultEdge);
        
        const nextNodes = active.nodes;
        const nextEdges = active.edges;
        nodesRef.current = nextNodes;
        edgesRef.current = nextEdges;
        setNodesState(nextNodes);
        setEdgesState(nextEdges);
        
        // Restore viewport
        if (active.viewport) {
          rf.setViewport(active.viewport);
        }

        setLoaded(true);
        setSaved(true);
        
        const raf = requestAnimationFrame(() => {
          armed.current = true;
          syncHist();
        });
        return () => cancelAnimationFrame(raf);
      } catch (error: any) {
        toast.error(error.message || "Failed to load project from server");
        navigate("/dashboard");
      }
    };

    initWorkspace();
  }, [id, syncHist, navigate]);

  // Persist the active sheet whenever its content changes.
  useEffect(() => {
    if (!loaded || !activeSheetId || !id) return;
    
    const t = setTimeout(async () => {
      const currentSheets = sheetsRef.current;
      const idx = currentSheets.findIndex(s => s.id === activeSheetId);
      const currentSheet = currentSheets[idx];
      if (!currentSheet) return;

      const updatedSheet = {
        ...currentSheet,
        diagramType,
        nodes: nodesRef.current.map((n) => ({ ...n, selected: false })),
        edges: edgesRef.current.map((e) => ({ ...e, selected: false })),
        viewport: rf.getViewport(),
        updatedAt: Date.now(),
      };

      setSheets(prev => prev.map(s => s.id === activeSheetId ? updatedSheet : s));
      
      try {
        await sheetService.updateSheet(activeSheetId, {
          name: updatedSheet.name,
          orderIndex: idx,
          projectId: id,
          diagramData: JSON.stringify({
            nodes: updatedSheet.nodes,
            edges: updatedSheet.edges,
            diagramType: updatedSheet.diagramType,
            viewport: updatedSheet.viewport
          })
        });
        setSaved(true);
      } catch (error: any) {
        console.error("Save failed", error);
        toast.error("Auto-save failed: " + (error.message || "Server error"));
      }
    }, 1000); // 1s debounce

    setSaved(false);
    return () => clearTimeout(t);
  }, [nodes, edges, diagramType, loaded, activeSheetId, id, rf]);

  const savedRef = useRef(saved);
  useEffect(() => {
    savedRef.current = saved;
  }, [saved]);

  // Prevent accidental exit if not saved
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!savedRef.current) {
        e.preventDefault();
        e.returnValue = "You have unsaved changes. Do you want to save before leaving?";
        return e.returnValue;
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  const saveImmediate = useCallback(async () => {
    if (saved || !id || !loaded || !activeSheetId) return;
    
    const currentSheets = sheetsRef.current;
    const idx = currentSheets.findIndex(s => s.id === activeSheetId);
    const currentSheet = currentSheets[idx];
    if (!currentSheet) return;

    const updatedSheet = {
      ...currentSheet,
      diagramType,
      nodes: nodesRef.current.map((n) => ({ ...n, selected: false })),
      edges: edgesRef.current.map((e) => ({ ...e, selected: false })),
      viewport: rf.getViewport(),
      updatedAt: Date.now(),
    };

    setSheets(prev => prev.map(s => s.id === activeSheetId ? updatedSheet : s));

    try {
      await sheetService.updateSheet(activeSheetId, {
        name: updatedSheet.name,
        orderIndex: idx,
        projectId: id,
        diagramData: JSON.stringify({
          nodes: updatedSheet.nodes,
          edges: updatedSheet.edges,
          diagramType: updatedSheet.diagramType,
          viewport: updatedSheet.viewport
        })
      });
      setSaved(true);
    } catch (error) {
      console.error("Immediate save failed", error);
    }
  }, [saved, id, loaded, activeSheetId, diagramType]);

  /* ---------- sheet CRUD ---------- */
  const switchSheet = useCallback(
    async (targetId: string) => {
      const sheet = sheets.find((s) => s.id === targetId);
      if (!sheet || targetId === activeSheetId) return;

      // 1. Save current sheet first
      if (!saved) {
        await saveImmediate();
      }

      // 2. Switch to target sheet
      saveActiveId(targetId);
      setActiveSheetId(targetId);
      setDiagramType(sheet.diagramType);
      setActiveEdgeId(getDiagram(sheet.diagramType).defaultEdge);
      skipRec.current = true;
      nodesRef.current = sheet.nodes;
      edgesRef.current = sheet.edges;
      setNodesState(sheet.nodes);
      setEdgesState(sheet.edges);
      
      // Restore viewport
      if (sheet.viewport) {
        rf.setViewport(sheet.viewport);
      }

      past.current = [];
      future.current = [];
      syncHist();
      setSel({ nodes: [], edges: [] });
      setTimeout(() => {
        skipRec.current = false;
        // rf.fitView({ padding: 0.3, duration: 400 }); // Disable auto-zoom
        setZoom(rf.getZoom());
      }, 30);
    },
    [sheets, activeSheetId, rf, syncHist, saved, saveImmediate]
  );

  const createNewSheet = useCallback(async () => {
    // 1. Save current sheet first
    if (!saved) {
      await saveImmediate();
    }

    // 2. Create local temp sheet to get initial values
    const tempSheet = createSheet(sheets);
    
    // 3. Create on server to get real UUID
    try {
      const response = await sheetService.createSheet({
        name: tempSheet.name,
        orderIndex: sheets.length,
        projectId: id!,
        diagramData: JSON.stringify({
          nodes: tempSheet.nodes,
          edges: tempSheet.edges,
          diagramType: tempSheet.diagramType,
          viewport: { x: 0, y: 0, zoom: 1 }
        })
      });

      const newSheet: Sheet = {
        ...tempSheet,
        id: response.result.id,
        viewport: { x: 0, y: 0, zoom: 1 },
        updatedAt: new Date(response.result.updatedAt).getTime()
      };

      const next = [...sheets, newSheet];
      setSheets(next);
      
      // 4. Switch to new sheet
      saveActiveId(newSheet.id);
      setActiveSheetId(newSheet.id);
      setDiagramType(newSheet.diagramType);
      setActiveEdgeId(getDiagram(newSheet.diagramType).defaultEdge);
      skipRec.current = true;
      nodesRef.current = newSheet.nodes;
      edgesRef.current = newSheet.edges;
      setNodesState(newSheet.nodes);
      setEdgesState(newSheet.edges);
      past.current = [];
      future.current = [];
      syncHist();
      setSel({ nodes: [], edges: [] });
      setTimeout(() => {
        skipRec.current = false;
        // rf.fitView({ padding: 0.3, duration: 400 }); // Disable auto-zoom
      }, 30);

      setSaved(true);
    } catch (e) {
      console.error("Failed to create new sheet on server", e);
      toast.error("Failed to create new sheet on server");
    }
  }, [sheets, rf, syncHist, saved, saveImmediate, id]);

  const renameSheet = useCallback(
    async (targetId: string, name: string) => {
      const idx = sheetsRef.current.findIndex(s => s.id === targetId);
      if (idx === -1) return;

      setSheets((prev) => {
        const next = prev.map((s) => (s.id === targetId ? { ...s, name } : s));
        return next;
      });

      try {
        await sheetService.updateSheet(targetId, { 
          name,
          orderIndex: idx,
          projectId: id!,
          diagramData: JSON.stringify({
            nodes: sheetsRef.current[idx].nodes,
            edges: sheetsRef.current[idx].edges,
            diagramType: sheetsRef.current[idx].diagramType,
            viewport: sheetsRef.current[idx].viewport
          })
        });
      } catch (e) {
        console.error("Failed to rename sheet on server", e);
        toast.error("Failed to rename sheet on server");
      }
    },
    [id]
  );

  const deleteSheet = useCallback(
    async (targetId: string) => {
      if (sheets.length <= 1) return;
      const idx = sheets.findIndex((s) => s.id === targetId);
      const next = sheets.filter((s) => s.id !== targetId);
      
      try {
        await sheetService.deleteSheet(targetId);
        setSheets(next);
        if (targetId === activeSheetId) {
          const target = next[Math.max(0, idx - 1)];
          switchSheet(target.id);
        }
      } catch (e) {
        console.error("Failed to delete sheet on server", e);
        toast.error("Failed to delete sheet on server");
      }
    },
    [sheets, activeSheetId, switchSheet]
  );

  useEffect(() => {
    if (loaded) {
      // fitView disabled
    }
  }, [loaded, rf]);

  /* ---------- toolbar actions ---------- */
  const onDiagramChange = useCallback((dt: DiagramType) => {
    setDiagramType(dt);
    setActiveEdgeId(getDiagram(dt).defaultEdge);
  }, []);

  const onPickTemplate = useCallback(
    (type: DiagramType) => {
      beginMutation();
      setDiagramType(type);
      setActiveEdgeId(getDiagram(type).defaultEdge);
      const s = sampleFor(type);
      setNodes(s.nodes);
      setEdges(s.edges);
      if (!skipCollabEmit.current) {
        emitCanvasChange({ nodes: s.nodes, edges: s.edges, type: "add" });
      }
      setSel({ nodes: [], edges: [] });
      // setTimeout(() => rf.fitView({ padding: 0.25, duration: 450 }), 60); // Disable auto-zoom
    },
    [beginMutation, rf, setNodes, setEdges]
  );

  const onClear = useCallback(() => {
    beginMutation();
    setNodes([]);
    setEdges([]);
    setSel({ nodes: [], edges: [] });
    if (!skipCollabEmit.current) {
      emitCanvasChange({ nodes: [], edges: [], type: "remove" });
    }
  }, [beginMutation, setNodes, setEdges, emitCanvasChange]);

  const exportPng = useCallback(async () => {
    const el = canvasRef.current;
    if (!el) return;
    rf.fitView({ padding: 0.25, duration: 0 });
    await new Promise((r) =>
      requestAnimationFrame(() => requestAnimationFrame(r))
    );
    try {
      const dataUrl = await toPng(el, {
        backgroundColor: "#ffffff",
        pixelRatio: 2,
        filter: (node) => {
          const n = node as HTMLElement;
          if (!n?.classList) return true;
          return ![
            "react-flow__controls",
            "react-flow__minimap",
            "react-flow__panel",
            "react-flow__attribution",
          ].some((c) => n.classList.contains(c));
        },
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `graphite-${diagramType}.png`;
      a.click();
    } catch (err) {
      console.error("export failed", err);
    }
  }, [rf, diagramType]);

  const exportJson = useCallback(() => {
    download(
      `graphite-${diagramType}.json`,
      JSON.stringify(
        { v: 1, diagramType, nodes: nodesRef.current, edges: edgesRef.current },
        null,
        2
      )
    );
  }, [diagramType]);

  const importJson = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(String(reader.result));
          if (!Array.isArray(data.nodes)) return;
          beginMutation();
          if (data.diagramType) {
            setDiagramType(data.diagramType);
            setActiveEdgeId(getDiagram(data.diagramType).defaultEdge);
          }
          setNodes(data.nodes);
          setEdges(data.edges ?? []);
          setSel({ nodes: [], edges: [] });
          if (!skipCollabEmit.current) {
            emitCanvasChange({ nodes: data.nodes, edges: data.edges ?? [], type: "add" });
          }
          // setTimeout(() => rf.fitView({ padding: 0.25, duration: 400 }), 60); // Disable auto-zoom
        } catch {
          /* ignore */
        }
      };
      reader.readAsText(file);
    },
    [beginMutation, rf, setNodes, setEdges, emitCanvasChange]
  );

  /** Import any supported file: Graphite JSON, or Mermaid / PlantUML source. */
  const importFile = useCallback(
    (file: File) => {
      const lower = file.name.toLowerCase();
      if (lower.endsWith(".json")) {
        importJson(file);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const content = String(reader.result ?? "");
        try {
          const res = detectAndParse(content);
          if (res.nodes.length) {
            importCanvas(res.nodes, res.edges, res.type);
          }
        } catch {
          /* ignore */
        }
      };
      reader.readAsText(file);
    },
    [importJson, importCanvas]
  );

  /* ---------- keyboard ---------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing =
        !!t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.isContentEditable);
      const meta = e.metaKey || e.ctrlKey;
      const k = e.key.toLowerCase();
      // "Q" toggles the diagram-type switcher. Functional update always reads
      // the latest state, so it opens when closed and closes when open.
      if (!meta && k === "q" && !typing) {
        e.preventDefault();
        setTypeMenu((v) => !v);
        return;
      }
      if (meta && k === "z") {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
      } else if (meta && k === "y") {
        e.preventDefault();
        redo();
      } else if (meta && k === "d") {
        e.preventDefault();
        duplicateSelected();
      } else if (meta && k === "c" && !typing) {
        copy();
      } else if (meta && k === "v" && !typing) {
        paste();
      } else if (meta && k === "a" && !typing) {
        e.preventDefault();
        selectAll();
      } else if ((k === "delete" || k === "backspace") && !typing) {
        e.preventDefault();
        deleteSelected();
      } else if (k.startsWith("arrow") && !typing) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        if (k === "arrowleft") nudge(-step, 0);
        else if (k === "arrowright") nudge(step, 0);
        else if (k === "arrowup") nudge(0, -step);
        else if (k === "arrowdown") nudge(0, step);
      } else if ((k === "?" || e.key === "F1") && !typing) {
        e.preventDefault();
        setHelpOpen((v) => !v);
      } else if (k === "escape") {
        setCtxMenu(null);
        setQuickAdd(null);
        setEdgeEdit(null);
        setTypeMenu(false);
        setSel({ nodes: [], edges: [] });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, duplicateSelected, copy, paste, selectAll, nudge, deleteSelected]);

  const diagram = useMemo(() => getDiagram(diagramType), [diagramType]);
  const activeConnectorName = getEdgeOption(diagramType, activeEdgeId).label;

  // Resolve the current selection against live state so the Inspector always
  // shows the latest data (not a stale snapshot from onSelectionChange).
  const selNodes = sel.nodes
    .map((s) => nodes.find((n) => n.id === s.id))
    .filter(Boolean) as FlowNode[];
  const selEdges = sel.edges
    .map((s) => edges.find((e) => e.id === s.id))
    .filter(Boolean) as FlowEdge[];

  return (
    <EditorContext.Provider value={{ updateNodeData, growNode }}>
      <div className="flex h-screen flex-col overflow-hidden bg-white text-admin-on-surface">
        <Toolbar
          diagramType={diagramType}
          sheetName={sheets.find((s) => s.id === activeSheetId)?.name ?? ""}
          onBackToDashboard={async () => {
            if (!saved) {
              setConfirmExit(true);
            } else {
              navigate("/dashboard");
            }
          }}
          onHelp={() => setHelpOpen(true)}
          onUndo={undo}
          onRedo={redo}
          canUndo={hist.undo}
          canRedo={hist.redo}
          onFit={() => rf.fitView({ padding: 0.25, duration: 400 })}
          onZoomIn={() => rf.zoomIn({ duration: 200 })}
          onZoomOut={() => rf.zoomOut({ duration: 200 })}
          onZoomReset={() => rf.zoomTo(1, { duration: 200 })}
          onLayout={() => layoutCanvas("TB")}
          zoom={zoom}
          showGrid={showGrid}
          onToggleGrid={() => setShowGrid((v) => !v)}
          showMinimap={showMinimap}
          onToggleMinimap={() => setShowMinimap((v) => !v)}
          snap={snap}
          onToggleSnap={() => setSnap((v) => !v)}
          inspectorOpen={inspectorOpen}
          onToggleInspector={() => {
            const next = !inspectorOpen;
            setInspectorOpen(next);
            setInspectorManualOpen(next);
          }}
          onPickTemplate={onPickTemplate}
          onClear={() => setConfirmClear(true)}
          onImportCode={() => setImportOpen(true)}
          onExportPng={exportPng}
          onExportJson={exportJson}
          onImportFile={importFile}
        saved={saved}
        projectId={id}
        isPublic={publicAccess}
        isOwner={user?.email === projectOwner}
        onTogglePublic={async () => {
          if (!id) return;
          try {
            const next = !publicAccess;
            await projectService.updateProject(id, { 
              publicAccess: next,
              projectName: projectName 
            });
            setPublicAccess(next);
            toast.success(next ? "Collaboration enabled & link copied!" : "Collaboration disabled.");
          } catch (e: any) {
            toast.error(e.message || "Failed to update project visibility");
          }
        }}
      />

        <div className="flex min-h-0 flex-1">
          <Sidebar
            diagram={diagram}
            diagramType={diagramType}
            onDiagramChange={onDiagramChange}
            activeEdgeId={activeEdgeId}
            onPickEdge={setActiveEdgeId}
            onAddNode={(item) => addNode(item)}
            open={sidebarOpen}
            onToggle={() => setSidebarOpen((v) => !v)}
          />

          <div
            ref={canvasRef}
            className="relative h-full min-w-0 flex-1"
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDoubleClick={onCanvasDoubleClick}
            onMouseMove={(e) => {
              const flowPos = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY });
              emitCursorMove(flowPos.x, flowPos.y);
            }}
            onContextMenu={(e) => e.preventDefault()}
          >
            <MarkerDefs />
            <SmartGuides guides={guides} />
            {nodes.length === 0 && (
              <div className="pointer-events-none absolute inset-0 z-[8] flex items-center justify-center">
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-dashed border-admin-outline/30 text-admin-outline/50">
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="7" height="7" rx="1.5" />
                      <rect x="14" y="14" width="7" height="7" rx="1.5" />
                      <path d="M10 6.5h4a3 3 0 0 1 3 3V14" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-[14px] font-bold text-admin-on-surface">
                      Your canvas is empty
                    </p>
                    <p className="mt-0.5 text-[12.5px] text-admin-secondary/60 font-medium">
                      Double-click anywhere to add a shape, or drag one from the
                      left.
                    </p>
                  </div>
                </div>
              </div>
            )}
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onSelectionChange={onSelectionChange}
              onSelectionDragStop={snapOnStop}
              onNodeContextMenu={onNodeCtx}
              onNodeDragStop={snapOnStop}
              onEdgeDoubleClick={onEdgeDoubleClick}
              onPaneContextMenu={onPaneCtx}
              onMove={(_, vp) => setZoom(vp.zoom)}
              connectionMode={ConnectionMode.Loose}
              deleteKeyCode={null}
              selectionOnDrag
              selectionMode={SelectionMode.Partial}
              panOnDrag={[1, 2]}
              panOnScroll
              zoomOnDoubleClick={false}
              minZoom={0.2}
              maxZoom={3}
              snapToGrid={snap}
              snapGrid={[16, 16]}
              defaultEdgeOptions={{ 
                type: "smoothstep",
                zIndex: 10 // Ensure new edges are above packages
              }}
              proOptions={{ hideAttribution: true }}
              onlyRenderVisibleElements={false}
              nodeDragThreshold={1.5}
              className="bg-white"
            >
              <RemoteCursors cursors={remoteCursors} />
              {showGrid && (
                <Background
                  variant={BackgroundVariant.Dots}
                  gap={18}
                  size={1.6}
                  color="#c3c6d7"
                />
              )}
              <Controls showInteractive={false} position="bottom-left" />
              {showMinimap && (
                <MiniMap
                  pannable
                  zoomable
                  position="bottom-right"
                  style={{ background: "#ffffff" }}
                  nodeColor={() => "#eceef0"}
                  nodeStrokeColor={() => "#c3c6d7"}
                  nodeBorderRadius={4}
                  maskColor="rgba(0,74,198,0.03)"
                />
              )}
              <Panel position="top-right" className="m-3">
                <div className="pointer-events-none flex items-center gap-1.5 rounded-lg border border-admin-outline/30 bg-white/90 px-2.5 py-1.5 shadow-[0_1px_2px_rgba(0,74,198,0.04)] backdrop-blur">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      saved ? "bg-admin-primary" : "animate-pulse bg-admin-outline/50"
                    }`}
                  />
                  <span className="text-[11.5px] font-bold text-admin-secondary">
                    {saved ? "Saved" : "Saving…"}
                  </span>
                </div>
              </Panel>
            </ReactFlow>

            {!inspectorOpen && (
              <button
                onClick={() => {
                  setInspectorOpen(true);
                  setInspectorManualOpen(true);
                }}
                title="Show properties"
                className="animate-fade-in absolute right-0 top-1/2 z-20 flex h-20 w-6 -translate-y-1/2 items-center justify-center rounded-l-lg border border-r-0 border-admin-outline/30 bg-white text-admin-secondary/40 shadow-[-4px_0_12px_rgba(0,74,198,0.06)] transition-colors hover:bg-admin-bg hover:text-admin-primary"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 6l-6 6 6 6" />
                </svg>
              </button>
            )}
          </div>

          {inspectorOpen && (
            <Inspector
              nodesLen={nodes.length}
              edgesLen={edges.length}
              activeConnectorName={activeConnectorName}
              selNodes={selNodes}
              selEdges={selEdges}
              diagramType={diagramType}
              onUpdateNode={updateNodeData}
              onUpdateEdge={updateEdge}
              onDelete={deleteSelected}
              onDuplicate={duplicateSelected}
              onAlign={alignSelection}
              onClose={() => {
                setInspectorOpen(false);
                setInspectorManualOpen(false);
              }}
            />
          )}

          <AIChat
            open={aiOpen}
            onToggle={() => setAiOpen((v) => !v)}
            diagramType={diagramType}
            activeSheetId={activeSheetId}
            currentNodes={nodes}
            currentEdges={edges}
            onImport={importCanvas}
          />
        </div>

        <SheetBar
          sheets={sheets}
          activeId={activeSheetId}
          onSelect={switchSheet}
          onCreate={createNewSheet}
          onRename={renameSheet}
          onDelete={deleteSheet}
        />
      </div>

      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          items={ctxMenu.items}
          onClose={() => setCtxMenu(null)}
        />
      )}

      {quickAdd && (
        <QuickAdd
          x={quickAdd.x}
          y={quickAdd.y}
          flowPos={quickAdd.flowPos}
          diagram={diagram}
          onAdd={(item, pos) =>
            addNode(item, {
              x: pos.x - item.width / 2,
              y: pos.y - item.height / 2,
            })
          }
          onClose={() => setQuickAdd(null)}
        />
      )}

      {helpOpen && <HelpOverlay onClose={() => setHelpOpen(false)} />}

      {typeMenu && (
        <TypeMenu
          current={diagramType}
          onPick={(id) => {
            onDiagramChange(id);
            setTypeMenu(false);
          }}
          onClose={() => setTypeMenu(false)}
        />
      )}

      {confirmClear && (
        <ConfirmDialog
          title="Clear this diagram?"
          message="All shapes and connectors on the current sheet will be removed. This can be undone with Ctrl+Z."
          confirmLabel="Clear"
          onConfirm={() => {
            onClear();
            setConfirmClear(false);
          }}
          onCancel={() => setConfirmClear(false)}
        />
      )}

      {confirmExit && (
        <ConfirmDialog
          title="Unsaved Changes"
          message="You have unsaved changes. Do you want to save them before leaving?"
          confirmLabel="Save & Leave"
          cancelLabel="Discard & Leave"
          danger={false}
          onConfirm={async () => {
            await saveImmediate();
            setConfirmExit(false);
            navigate("/dashboard");
          }}
          onCancel={() => {
            setConfirmExit(false);
            navigate("/dashboard");
          }}
        />
      )}

      {importOpen && (
        <ImportModal
          onClose={() => setImportOpen(false)}
          onImport={(nodes, edges, type) => importCanvas(nodes, edges, type)}
        />
      )}

      {edgeEdit && (
        <div
          className="animate-pop fixed z-50 -translate-x-1/2 -translate-y-1/2"
          style={{ left: edgeEdit.x, top: edgeEdit.y }}
        >
          <input
            autoFocus
            value={edgeEdit.value}
            placeholder="label / guard…"
            onChange={(e) =>
              setEdgeEdit((s) => (s ? { ...s, value: e.target.value } : s))
            }
            onBlur={() => {
              updateEdge(edgeEdit.id, { label: edgeEdit.value });
              setEdgeEdit(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                updateEdge(edgeEdit.id, { label: edgeEdit.value });
                setEdgeEdit(null);
              } else if (e.key === "Escape") {
                setEdgeEdit(null);
              }
            }}
            className="w-44 rounded-lg border border-zinc-900 bg-white px-2.5 py-1.5 text-center text-[12px] font-medium text-zinc-900 shadow-[0_4px_20px_rgba(0,0,0,0.16)] outline-none"
          />
        </div>
      )}
    </EditorContext.Provider>
  );
}
