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
  /** Arrow-head scale factor for both ends (1 = default; e.g. 1.5 for 150%). */
  markerSize?: number;
  /** Human-in-the-Loop: flag for ambiguous relations */
  ambiguous?: boolean;
  /** Metadata for ambiguous relation resolution */
  fromName?: string;
  toName?: string;
  /** UML class association multiplicity at the source (start) end, e.g. "1", "0..*" */
  multiplicitySource?: string;
  /** UML class association multiplicity at the target end */
  multiplicityTarget?: string;
  /**
   * Manual connector adjustments (set by dragging the edge handles on canvas).
   * `sourcePull` / `targetPull` move the line's end away from (positive) or into
   * (negative) its node, letting the user pick how long/short each end of the
   * wire is. `bend` is a flow-space point the middle of the wire is routed
   * through, so the connector can be dragged to a different spot.
   */
  sourcePull?: number;
  targetPull?: number;
  bend?: { x: number; y: number };
  [key: string]: unknown;
}

export type FlowNode = Node<FlowNodeData, string>;
export type FlowEdge = Edge<FlowEdgeData>;
