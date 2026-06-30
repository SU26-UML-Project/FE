import type { Node, Edge } from "@xyflow/react";

/** Data payload carried by every node (API/backend-oriented model). */
export interface FlowNodeData {
  label: string;
  stereotype?: string; // «interface», «entity»…
  attributes?: string; // multiline — one attribute per line (class)
  methods?: string; // multiline — one method per line (class)
  variant?: "horizontal" | "vertical";
  /** border / stroke colour override */
  color?: string;
  /** fill colour override */
  fill?: string;
  [key: string]: unknown;
}

export type FlowNode = Node<FlowNodeData, string>;
export type FlowEdge = Edge;
