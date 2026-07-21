import type { DiagramDef, EdgeOption, FlowEdge, FlowNode, FlowNodeData } from "../types";

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

/* ---------------- palette helpers ---------------- */
const P = (
    type: string,
    label: string,
    data: FlowNodeData,
    width: number,
    height: number
) => ({ type, label, data, width, height });

/* ---------------- diagram catalogue ---------------- */
export const DIAGRAMS: DiagramDef[] = [
  {
    id: "activity",
    name: "Activity",
    hint: "Workflows, control & object flow",
    defaultEdge: "cf",
    nodes: [
      P("start", "Start", { label: "" }, 38, 38),
      P("final", "Final", { label: "" }, 40, 40),
      P("action", "Action", { label: "Action" }, 150, 54),
      P("decision", "Decision", { label: "" }, 150, 104),
      P("fork", "Fork / Join", { label: "" }, 130, 12),
      P("swimlane", "Swimlane", { label: "Lane", variant: "horizontal" }, 480, 130),
      P("note", "Note", { label: "A note…" }, 170, 90),
    ],
    edges: [
      { id: "cf", label: "Control flow", markerEnd: M.arrow, dashed: false, path: "smoothstep" },
      { id: "note", label: "Note link", markerEnd: M.none, dashed: true, path: "smoothstep" },
    ],
  },
  {
    id: "state",
    name: "State Machine",
    hint: "States, transitions & guards",
    defaultEdge: "trans",
    nodes: [
      P("start", "Initial", { label: "" }, 38, 38),
      P("final", "Final", { label: "" }, 40, 40),
      P("state", "State", { label: "Idle" }, 150, 56),
      P("decision", "Choice", { label: "Guard?" }, 150, 104),
      P("note", "Note", { label: "Note…" }, 170, 80),
    ],
    edges: [
      { id: "trans", label: "Transition", markerEnd: M.arrow, dashed: false, path: "smoothstep" },
      { id: "self", label: "Self / internal", markerEnd: M.arrow, dashed: true, path: "smoothstep" },
    ],
  },
  {
    id: "class",
    name: "Class",
    hint: "Classes, interfaces & relationships",
    defaultEdge: "assoc",
    nodes: [
      P("cls", "Class", { label: "Animal", attributes: "- name: String\n- age: int", methods: "+ eat(): void\n+ sleep(): void" }, 210, 150),
      P("cls", "Interface", { label: "Comparable", stereotype: "«interface»", methods: "+ compareTo(o): int" }, 200, 104),
      P("package", "Package", { label: "model" }, 360, 240),
      P("note", "Note", { label: "Note…" }, 170, 80),
    ],
    edges: [
      { id: "inherit", label: "Inheritance", markerEnd: M.triangle, dashed: false, path: "smoothstep" },
      { id: "realize", label: "Realization", markerEnd: M.triangle, dashed: true, path: "smoothstep" },
      { id: "assoc", label: "Association", markerEnd: M.none, dashed: false, path: "smoothstep" },
      { id: "aggr", label: "Aggregation", markerStart: M.diamondOpenStart, markerEnd: "", dashed: false, path: "smoothstep" },
      { id: "comp", label: "Composition", markerStart: M.diamondFilledStart, markerEnd: "", dashed: false, path: "smoothstep" },
      { id: "depend", label: "Dependency", markerEnd: M.openArrow, dashed: true, path: "smoothstep" },
    ],
  },
  {
    id: "usecase",
    name: "Use Case",
    hint: "Actors, use cases & system",
    defaultEdge: "assoc",
    nodes: [
      P("actor", "Actor", { label: "User" }, 76, 124),
      P("usecase", "Use Case", { label: "Use case" }, 170, 82),
      P("boundary", "System Boundary", { label: "System" }, 440, 320),
      P("note", "Note", { label: "Note…" }, 170, 80),
    ],
    edges: [
      { id: "assoc", label: "Association", markerEnd: M.none, dashed: false, path: "smoothstep" },
      { id: "include", label: "«include»", markerEnd: M.openArrow, dashed: true, path: "smoothstep", autoLabel: "«include»" },
      { id: "extend", label: "«extend»", markerEnd: M.openArrow, dashed: true, path: "smoothstep", autoLabel: "«extend»" },
    ],
  },
  {
    id: "component",
    name: "Component",
    hint: "Components, interfaces & wiring",
    defaultEdge: "depend",
    nodes: [
      P("component", "Component", { label: "Component" }, 180, 92),
      P("cls", "Interface", { label: "IService", stereotype: "«interface»", methods: "+ execute(): void" }, 160, 96),
      P("package", "Module", { label: "app" }, 380, 250),
      P("note", "Note", { label: "Note…" }, 170, 80),
    ],
    edges: [
      { id: "assoc", label: "Association", markerEnd: M.none, dashed: false, path: "smoothstep" },
      { id: "depend", label: "Dependency", markerEnd: M.openArrow, dashed: true, path: "smoothstep" },
      { id: "realize", label: "Realization", markerEnd: M.triangle, dashed: true, path: "smoothstep" },
      { id: "aggr", label: "Aggregation", markerStart: M.diamondOpenStart, markerEnd: "", dashed: false, path: "smoothstep" },
      { id: "comp", label: "Composition", markerStart: M.diamondFilledStart, markerEnd: "", dashed: false, path: "smoothstep" },
    ],
  },
];

export const getDiagram = (id: string): DiagramDef =>
    DIAGRAMS.find((d) => d.id === id) ?? DIAGRAMS[0];

export const getEdgeOption = (diagramId: string, optId: string) =>
    getDiagram(diagramId).edges.find((e) => e.id === optId) ??
    getDiagram(diagramId).edges[0];

/** Stereotype labels that connectors may stamp automatically. */
const STEREOTYPES = ["«include»", "«extend»"];

/**
 * Build the edge mutation patch for a chosen connector option.
 * Stereotype connectors («include» / «extend») stamp their label; choosing a
 * non-stereotype connector clears a leftover stereotype label so we never end
 * up with a misleading «include» on, say, an association line.
 */
export function patchFromOption(
    opt: EdgeOption,
    prevLabel?: string
): {
  marker: string;
  markerStart: string;
  type: string;
  dashed: boolean;
  label: string;
} {
  let label = prevLabel ?? "";
  if (opt.autoLabel) {
    label = opt.autoLabel;
  } else if (STEREOTYPES.includes(label)) {
    label = "";
  }
  return {
    marker: opt.markerEnd,
    markerStart: opt.markerStart ?? "",
    type: opt.path,
    dashed: opt.dashed,
    label,
  };
}

/* ---------------- sample builders ---------------- */
let c = 0;
const uid = (p: string) => `${p}-${++c}-${Math.random().toString(36).slice(2, 6)}`;

function node(
    type: string,
    x: number,
    y: number,
    data: FlowNodeData,
    w: number,
    h: number,
    id?: string,
    parentId?: string
): FlowNode {
  return {
    id: id ?? uid(type),
    type,
    position: { x, y },
    data,
    width: w,
    height: h,
    parentId,
    extent: parentId ? "parent" : undefined,
    style: { width: w, height: h },
  };
}

function edge(
    s: string,
    t: string,
    o: {
      marker?: string;
      markerStart?: string;
      dashed?: boolean;
      label?: string;
      type?: string;
      sh?: string;
      th?: string;
    }
): FlowEdge {
  return {
    id: uid("e"),
    source: s,
    target: t,
    sourceHandle: o.sh,
    targetHandle: o.th,
    type: o.type ?? "smoothstep",
    label: o.label ?? "",
    data: {
      marker: o.marker ?? "",
      markerStart: o.markerStart ?? "",
      dashed: !!o.dashed,
    },
  };
}

export function sampleFor(id: string): { nodes: FlowNode[]; edges: FlowEdge[] } {
  switch (id) {
    case "activity":
      return act();
    case "state":
      return st();
    case "class":
      return cls();
    case "usecase":
      return uc();
    case "component":
      return comp();
    default:
      return act();
  }
}

function act() {
  const start = node("start", 40, 170, { label: "" }, 38, 38, "s");
  const a1 = node("action", 130, 162, { label: "Open app" }, 150, 54, "a1");
  const dec = node("decision", 350, 150, { label: "Signed in?" }, 150, 110, "dec");
  const a2 = node("action", 570, 50, { label: "Show feed" }, 150, 54, "a2");
  const a3 = node("action", 570, 290, { label: "Show login" }, 150, 54, "a3");
  const fin = node("final", 800, 67, { label: "" }, 40, 40, "f");
  const note = node("note", 800, 250, { label: "Retry on failure" }, 160, 70, "n");
  // Demonstrate a UML swimlane (partition) with a nested action.
  const lane = node("swimlane", 40, 420, { label: "Customer", variant: "horizontal" }, 520, 130, "lane");
  const laneAct = node("action", 90, 452, { label: "Browse products" }, 170, 54, "la", "lane");
  return {
    nodes: [start, a1, dec, a2, a3, fin, note, lane, laneAct],
    edges: [
      edge("s", "a1", { marker: M.arrow }),
      edge("a1", "dec", { marker: M.arrow }),
      edge("dec", "a2", { marker: M.arrow, label: "yes", sh: "t", th: "l" }),
      edge("dec", "a3", { marker: M.arrow, label: "no" }),
      edge("a2", "f", { marker: M.arrow }),
      edge("a3", "dec", { marker: M.arrow, label: "retry", type: "bezier" }),
      edge("n", "a3", { marker: M.none, dashed: true, type: "bezier" }),
    ],
  };
}

function st() {
  const init = node("start", 40, 150, { label: "" }, 38, 38, "i");
  const idle = node("state", 130, 142, { label: "Idle" }, 150, 56, "idle");
  const run = node("state", 350, 142, { label: "Running" }, 150, 56, "run");
  const dec = node("decision", 570, 130, { label: "Done?" }, 150, 110, "dec");
  const done = node("state", 790, 142, { label: "Finished" }, 150, 56, "done");
  const fin = node("final", 990, 150, { label: "" }, 40, 40, "f");
  return {
    nodes: [init, idle, run, dec, done, fin],
    edges: [
      edge("i", "idle", { marker: M.arrow }),
      edge("idle", "run", { marker: M.arrow, label: "start" }),
      edge("run", "dec", { marker: M.arrow }),
      edge("dec", "done", { marker: M.arrow, label: "yes" }),
      edge("dec", "run", { marker: M.arrow, dashed: true, label: "no", type: "bezier" }),
      edge("done", "fin", { marker: M.arrow, label: "stop" }),
    ],
  };
}

function cls() {
  const animal = node("cls", 320, 30, { label: "Animal", attributes: "- name: String\n- age: int", methods: "+ eat(): void\n+ sleep(): void" }, 210, 150, "animal");
  const dog = node("cls", 70, 280, { label: "Dog", attributes: "- breed: String", methods: "+ bark(): void" }, 180, 116, "dog");
  const cat = node("cls", 560, 280, { label: "Cat", attributes: "- indoor: bool", methods: "+ meow(): void" }, 180, 116, "cat");
  const comp = node("cls", 330, 300, { label: "Comparable", stereotype: "«interface»", methods: "+ compareTo(o): int" }, 200, 96, "cmp");
  const note = node("note", 800, 40, { label: "Hierarchy example" }, 160, 64, "n");
  return {
    nodes: [animal, dog, cat, comp, note],
    edges: [
      edge("dog", "animal", { marker: M.triangle }),
      edge("cat", "animal", { marker: M.triangle }),
      edge("animal", "cmp", { marker: M.triangle, dashed: true }),
      edge("n", "animal", { marker: M.none, dashed: true, type: "bezier" }),
    ],
  };
}

function uc() {
  const user = node("actor", 30, 150, { label: "User" }, 76, 124, "user");
  const sys = node("boundary", 150, 20, { label: "System" }, 460, 340, "sys");
  const login = node("usecase", 200, 80, { label: "Log in" }, 160, 76, "login");
  const search = node("usecase", 200, 210, { label: "Search" }, 160, 76, "search");
  const twofa = node("usecase", 420, 60, { label: "2FA verify" }, 160, 76, "2fa");
  const buy = node("usecase", 420, 210, { label: "Checkout" }, 160, 76, "buy");
  return {
    nodes: [user, sys, login, search, twofa, buy],
    edges: [
      edge("user", "login", { marker: M.none, type: "bezier", sh: "r", th: "l" }),
      edge("user", "search", { marker: M.none, type: "bezier", sh: "r", th: "l" }),
      edge("login", "twofa", { marker: M.openArrow, dashed: true, label: "«include»" }),
      edge("search", "buy", { marker: M.openArrow, dashed: true, label: "«extend»" }),
    ],
  };
}

function comp() {
  const web = node("component", 40, 250, { label: "Web UI" }, 170, 90, "web");
  const auth = node("component", 300, 60, { label: "Auth" }, 170, 90, "auth");
  const db = node("component", 560, 250, { label: "Database" }, 170, 90, "db");
  const iface = node("cls", 320, 300, { label: "IAccount", stereotype: "«interface»", methods: "+ verify(): bool" }, 170, 96, "iface");
  return {
    nodes: [web, auth, db, iface],
    edges: [
      edge("web", "auth", { marker: M.openArrow, dashed: true }),
      edge("auth", "db", { marker: M.openArrow, dashed: true }),
      edge("auth", "iface", { marker: M.triangle, dashed: true }),
      edge("web", "iface", { marker: M.openArrow }),
    ],
  };
}
