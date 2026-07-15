import type { FlowNodeData } from "./node";

export type DiagramType =
  | "activity"
  | "state"
  | "class"
  | "usecase"
  | "component";

export interface PaletteItem {
  type: string;
  label: string;
  data: FlowNodeData;
  width: number;
  height: number;
}

export interface EdgeOption {
  id: string;
  label: string;
  /** "" for none, otherwise "url(#m-...)" — placed at the target end */
  markerEnd: string;
  /** "" for none, otherwise "url(#m-...)" — placed at the source end */
  markerStart?: string;
  dashed: boolean;
  path: "smoothstep" | "bezier" | "straight";
  /** optional stereotype label applied when this connector is chosen */
  autoLabel?: string;
}

export interface DiagramDef {
  id: DiagramType;
  name: string;
  hint: string;
  nodes: PaletteItem[];
  defaultEdge: string;
  edges: EdgeOption[];
}
