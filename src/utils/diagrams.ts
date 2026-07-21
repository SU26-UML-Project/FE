import type { DiagramDef } from "../types/diagram";
import type { FlowNodeData } from "../types/node";

const M = {
  arrow: "url(#m-arrow)",
  openArrow: "url(#m-arrow-open)",
  triangle: "url(#m-triangle)",
  diamondFilled: "url(#m-diamond-filled)",
  diamondOpen: "url(#m-diamond-open)",
  diamondFilledStart: "url(#m-diamond-filled-start)",
  diamondOpenStart: "url(#m-diamond-open-start)",
  none: "",
};

const P = (type: string, label: string, data: FlowNodeData, width: number, height: number) => ({ type, label, data, width, height });

export const getDiagram = (id: string): DiagramDef =>
    DIAGRAMS.find((d) => d.id === id) ?? DIAGRAMS[0];

export const getEdgeOption = (diagramId: string, optId: string) =>
    getDiagram(diagramId).edges.find((e) => e.id === optId) ?? getDiagram(diagramId).edges[0];

export const DIAGRAMS: DiagramDef[] = [
  {
    id: "activity", name: "Activity", hint: "Workflows, control & object flow", defaultEdge: "cf",
    nodes: [P("start", "Start", { label: "" }, 38, 38), P("final", "Final", { label: "" }, 40, 40), P("action", "Action", { label: "Action" }, 150, 54), P("decision", "Decision", { label: "" }, 48, 48), P("fork", "Fork / Join", { label: "" }, 130, 12), P("note", "Note", { label: "A note…" }, 170, 90)],
    edges: [{ id: "cf", label: "Control flow", markerEnd: M.arrow, dashed: false, path: "smoothstep", autoLabel: "" }, { id: "note", label: "Note link", markerEnd: M.none, dashed: true, path: "smoothstep", autoLabel: "" }],
  },
  {
    id: "state", name: "State Machine", hint: "States, transitions & guards", defaultEdge: "trans",
    nodes: [P("start", "Initial", { label: "" }, 38, 38), P("final", "Final", { label: "" }, 40, 40), P("action", "State", { label: "Idle" }, 150, 56), P("decision", "Choice", { label: "Guard?" }, 48, 48), P("note", "Note", { label: "Note…" }, 170, 80)],
    edges: [{ id: "trans", label: "Transition", markerEnd: M.arrow, dashed: false, path: "smoothstep", autoLabel: "" }, { id: "self", label: "Self / internal", markerEnd: M.arrow, dashed: true, path: "smoothstep", autoLabel: "" }],
  },
  {
    id: "class", name: "Class", hint: "Classes, interfaces & relationships", defaultEdge: "assoc",
    nodes: [P("cls", "Class", { label: "Animal", attributes: "- name: String\n- age: int", methods: "+ eat(): void\n+ sleep(): void" }, 210, 150), P("cls", "Interface", { label: "Comparable", stereotype: "«interface»", methods: "+ compareTo(o): int" }, 200, 104), P("package", "Package", { label: "model" }, 360, 240), P("note", "Note", { label: "Note…" }, 170, 80)],
    edges: [{ id: "inherit", label: "Inheritance", markerEnd: M.triangle, dashed: false, path: "smoothstep", autoLabel: "" }, { id: "realize", label: "Realization", markerEnd: M.triangle, dashed: true, path: "smoothstep", autoLabel: "" }, { id: "assoc", label: "Association", markerEnd: M.openArrow, dashed: false, path: "smoothstep", autoLabel: "" }, { id: "aggr", label: "Aggregation", markerStart: M.diamondOpenStart, markerEnd: "", dashed: false, path: "smoothstep", autoLabel: "" }, { id: "comp", label: "Composition", markerStart: M.diamondFilledStart, markerEnd: "", dashed: false, path: "smoothstep", autoLabel: "" }, { id: "depend", label: "Dependency", markerEnd: M.openArrow, dashed: true, path: "smoothstep", autoLabel: "" }],
  },
  {
    id: "usecase", name: "Use Case", hint: "Actors, use cases & system", defaultEdge: "assoc",
    nodes: [P("actor", "Actor", { label: "User" }, 76, 124), P("usecase", "Use Case", { label: "Use case" }, 170, 82), P("package", "System", { label: "System" }, 440, 320), P("note", "Note", { label: "Note…" }, 170, 80)],
    edges: [{ id: "inherit", label: "Generalization", markerEnd: M.triangle, dashed: false, path: "smoothstep", autoLabel: "" }, { id: "assoc", label: "Association", markerEnd: M.none, dashed: false, path: "smoothstep", autoLabel: "" }, { id: "include", label: "«include»", markerEnd: M.openArrow, dashed: true, path: "smoothstep", autoLabel: "«include»" }, { id: "extend", label: "«extend»", markerEnd: M.openArrow, dashed: true, path: "smoothstep", autoLabel: "«extend»" }],
  },
  {
    id: "component", name: "Component", hint: "Components, interfaces & wiring", defaultEdge: "depend",
    nodes: [P("component", "Component", { label: "Component" }, 180, 92), P("cls", "Interface", { label: "IService", stereotype: "«interface»", methods: "+ execute(): void" }, 160, 96), P("package", "Module", { label: "app" }, 380, 250), P("note", "Note", { label: "Note…" }, 170, 80)],
    edges: [{ id: "assoc", label: "Association", markerEnd: M.openArrow, dashed: false, path: "smoothstep", autoLabel: "" }, { id: "depend", label: "Dependency", markerEnd: M.openArrow, dashed: true, path: "smoothstep", autoLabel: "" }, { id: "realize", label: "Realization", markerEnd: M.triangle, dashed: true, path: "smoothstep", autoLabel: "" }, { id: "aggr", label: "Aggregation", markerStart: M.diamondOpenStart, markerEnd: "", dashed: false, path: "smoothstep", autoLabel: "" }, { id: "comp", label: "Composition", markerStart: M.diamondFilledStart, markerEnd: "", dashed: false, path: "smoothstep", autoLabel: "" }],
  },
];

const STEREOTYPES = ["«include»", "«extend»"];

export function patchFromOption(opt: any, prevLabel?: string): { marker: string; markerStart: string; type: string; dashed: boolean; label: string } {
  let label = prevLabel ?? "";
  if (opt.autoLabel) label = opt.autoLabel;
  else if (STEREOTYPES.includes(label)) label = "";
  return { marker: opt.markerEnd, markerStart: opt.markerStart ?? "", type: opt.path, dashed: opt.dashed, label };
}
