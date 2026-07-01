import type { DiagramType } from "./diagram";
import type { FlowNode, FlowEdge } from "./node";

/** A single diagram page (multi-sheet model). */
export interface Sheet {
  id: string;
  name: string;
  diagramType: DiagramType;
  nodes: FlowNode[];
  edges: FlowEdge[];
  updatedAt: number;
}
