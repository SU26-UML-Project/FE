import type { Node, Edge } from "@xyflow/react";

/** Data payload carried by every node (API/backend-oriented model). */
export interface FlowNodeData {
  label: string;
  stereotype?: string; // «interface», «entity»…
  attributes?: string; // multiline — one attribute per line (class)
  methods?: string; // multiline — one method per line (class)
  /** order index of swimlane (UML Activity partition) - set during PlantUML parse */
  laneIndex?: number;
  /** border / stroke colour override */
  color?: string;
  /** fill colour override */
  fill?: string;
  [key: string]: unknown;
}

export interface FlowEdgeData {
  marker: string;
  markerStart?: string;
  dashed: boolean;
  color?: string;
  /** Human-in-the-Loop: flag for ambiguous relations */
  ambiguous?: boolean;
  /** Metadata for ambiguous relation resolution */
  fromName?: string;
  toName?: string;
  /** UML class association multiplicity at the source (start) end, e.g. "1", "0..*" */
  multiplicitySource?: string;
  /** UML class association multiplicity at the target end */
  multiplicityTarget?: string;
  [key: string]: unknown;
}

export type FlowNode = Node<FlowNodeData, string>;
export type FlowEdge = Edge<FlowEdgeData>;
