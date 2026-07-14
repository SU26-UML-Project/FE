import type { AINode, AIEdge, AIResponse } from "../types/aiContract";
import type { DiagramType, FlowEdge, FlowNode, FlowNodeData } from "../types";
import { resolveRelation } from "./relationMapper";

export function aiNodeToFlow(ai: AINode): FlowNode {
  const data: FlowNodeData = {
    label: ai.label,
    stereotype: ai.stereotype,
    attributes: ai.attributes?.join("\n") || "",
    methods: ai.methods?.join("\n") || "",
  };

  const sizes: Record<string, [number, number]> = {
    action: [150, 54], decision: [150, 104], start: [38, 38], final: [40, 40],
    fork: [130, 12], cls: [210, 150], component: [180, 92],
    usecase: [170, 76], actor: [76, 124], note: [170, 80], package: [400, 300],
  };
  const [w, h] = sizes[ai.type] ?? [150, 60];

  return {
    id: ai.id,
    type: ai.type,
    position: { x: 0, y: 0 },
    data,
    width: w,
    height: h,
    style: { width: w, height: h },
    parentId: ai.parentId,
    extent: ai.parentId ? "parent" : undefined,
  } as FlowNode;
}

export function aiEdgeToFlow(ai: AIEdge): FlowEdge {
  const r = resolveRelation(ai.relation);
  return {
    id: ai.id,
    source: ai.source,
    target: ai.target,
    type: r.pathType,
    label: ai.label ?? r.autoLabel ?? "",
    data: { marker: r.marker, markerStart: r.markerStart, dashed: r.dashed },
  } as FlowEdge;
}

export function aiResponseToCanvas(
  res: Extract<AIResponse, { kind: "diagram" }>
): { nodes: FlowNode[]; edges: FlowEdge[]; diagramType: DiagramType } {
  return {
    nodes: (res.nodes || []).map(aiNodeToFlow),
    edges: (res.edges || []).map(aiEdgeToFlow),
    diagramType: res.diagramType as DiagramType,
  };
}
