import type { DiagramType } from "./diagram";
import type { FlowNode, FlowEdge } from "./node";

/** A single diagram page (multi-sheet model). */
export interface Sheet {
  id: string;
  name: string;
  diagramType: DiagramType;
  nodes: FlowNode[];
  edges: FlowEdge[];
  viewport?: { x: number; y: number; zoom: number };
  updatedAt: number;
}
