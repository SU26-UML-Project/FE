import { create } from "zustand";
import type { DiagramType, FlowEdge, FlowNode, FlowNodeData } from "../types";

/**
 * canvasStore — Zustand store for the CURRENTLY OPEN SHEET.
 *
 * Workspace Data Flow (step 2):
 *   nodes/edges of the active sheet live here; the Editor (WorkspacePage
 *   equivalent) reads from the store and persists changes back (auto-save).
 *
 * This keeps node/edge mutation logic in ONE place instead of scattered refs
 * inside the component, which is what the target architecture calls for.
 */

interface CanvasState {
  nodes: FlowNode[];
  edges: FlowEdge[];
  /** transient selection mirrors — the source of truth is React Flow's store,
   *  but we keep a derived snapshot for the Inspector. */
  selectedNodes: FlowNode[];
  selectedEdges: FlowEdge[];

  setNodes: (nodes: FlowNode[]) => void;
  patchNodes: (updater: (prev: FlowNode[]) => FlowNode[]) => void;
  setEdges: (edges: FlowEdge[]) => void;
  patchEdges: (updater: (prev: FlowEdge[]) => FlowEdge[]) => void;
  /** Replace the whole canvas (used when switching sheets / AI import). */
  load: (nodes: FlowNode[], edges: FlowEdge[]) => void;
  /** Snapshot the live selection for the Inspector (resolved against store). */
  setSelection: (nodes: FlowNode[], edges: FlowEdge[]) => void;
  updateNodeData: (id: string, patch: Partial<FlowNodeData>) => void;
  clear: () => void;
  /** Flag so the workspace auto-save effect knows it should persist. */
  dirty: boolean;
  markSaved: () => void;
}

// DiagramType re-exported for callers wiring the AI flow (kept for clarity).
export type { DiagramType };

export const useCanvasStore = create<CanvasState>((set) => ({
  nodes: [],
  edges: [],
  selectedNodes: [],
  selectedEdges: [],

  setNodes: (nodes) => set({ nodes, dirty: true }),
  patchNodes: (updater) => set((s) => ({ nodes: updater(s.nodes), dirty: true })),
  setEdges: (edges) => set({ edges, dirty: true }),
  patchEdges: (updater) => set((s) => ({ edges: updater(s.edges), dirty: true })),
  load: (nodes, edges) =>
    set({ nodes, edges, selectedNodes: [], selectedEdges: [], dirty: true }),
  setSelection: (nodes, edges) => set({ selectedNodes: nodes, selectedEdges: edges }),
  updateNodeData: (id, patch) =>
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === id ? { ...n, data: { ...(n.data as FlowNodeData), ...patch } } : n
      ),
      dirty: true,
    })),
  clear: () => set({ nodes: [], edges: [], selectedNodes: [], selectedEdges: [], dirty: true }),
  dirty: false,
  markSaved: () => set({ dirty: false }),
}));
