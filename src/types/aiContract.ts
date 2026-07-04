export type AINodeType =
  | "action" | "decision" | "start" | "final" | "fork"
  | "cls" | "component" | "usecase" | "actor" | "note" | "package";

export interface AINode {
  id: string;
  type: AINodeType;
  label: string;
  stereotype?: string;
  attributes?: string[];
  methods?: string[];
  text?: string;
}

export type RelationKind =
  | "inheritance" | "realization" | "association" | "aggregation" | "composition"
  | "dependency" | "include" | "extend" | "control-flow" | "transition"
  | "note-link" | "self-transition";

export interface AIEdge {
  id: string;
  source: string;
  target: string;
  relation: RelationKind;
  label?: string;
}

export type AIResponse =
  | { kind: "reply"; text: string }
  | { kind: "diagram"; diagramType: "activity" | "state" | "class" | "usecase" | "component"; nodes: AINode[]; edges: AIEdge[]; summary?: string }
  | { kind: "questions"; summary: string; questions: AIQuestion[] };

export interface AIQuestion {
  id: string;
  prompt: string;
  detail?: string;
  edgeId?: string | null;
  mode: "single" | "multiple";
  options: Array<{ relation: RelationKind; label: string }>;
}
