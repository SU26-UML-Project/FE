import { createContext, useContext } from "react";
import type { FlowNodeData } from "../../types";

export interface EdgePatch {
  label?: string;
  marker?: string;
  markerStart?: string;
  type?: string;
  dashed?: boolean;
  color?: string;
  flip?: boolean;
  markerSize?: number;
  multiplicitySource?: string;
  multiplicityTarget?: string;
  sourcePull?: number;
  targetPull?: number;
  bend?: { x: number; y: number };
}

interface EditorContextValue {
  updateNodeData: (id: string, patch: Partial<FlowNodeData>) => void;
  /** Update a connector's properties (style, marker, and manual geometry). */
  updateEdge: (id: string, patch: EdgePatch) => void;
  /** Grow a node so it never clips its text (auto-fit, not an undo step). */
  growNode: (id: string, minW: number, minH: number) => void;
}

export const EditorContext = createContext<EditorContextValue>({
  updateNodeData: () => {},
  updateEdge: () => {},
  growNode: () => {},
});

export const useEditor = () => useContext(EditorContext);
