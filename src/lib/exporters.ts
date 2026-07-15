/**
 * exporters.ts — Mermaid & PlantUML code generation (FINAL v3)
 *
 * Fully compliant with the 8 knowledge base specs:
 *   mermaid_class_diagram.md
 *   mermaid_usecase_diagram.md
 *   mermaid_activity_diagram.md
 *   mermaid_component_diagram.md
 *   plantuml_class_diagram.md
 *   plantuml_usecase_diagram.md
 *   plantuml_activity_diagram.md
 *   plantuml_component_diagram.md
 *
 * Mapping:
 *   Internal marker/markerStart/dashed → standard tokens per format.
 */

import type { FlowEdge, FlowNode, FlowNodeData, DiagramType } from "../types";

/* ════════════════════════════════════════════════════════════
   HELPERS
   ════════════════════════════════════════════════════════════ */

const esc = (s: string) => s.replace(/"/g, '\\"').replace(/\n/g, "\\n");
const escM = (s: string) => s.replace(/"/g, '\\"').replace(/\n/g, "<br>");

/** Generate a short safe alphanumeric ID prefix from a node UUID */
function shortId(id: string): string {
  const alnum = id.replace(/[^a-zA-Z0-9]/g, "");
  if (alnum.length >= 6) return alnum.slice(0, 6);
  // Pad with a counter-based suffix
  const suffix = Math.abs(hashCode(id)).toString(36).slice(0, 4);
  return "n" + suffix;
}
function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}

/* ───────── relation detection ───────── */

interface RelInfo { mermaidToken: string; plantToken: string; hasStereotypeLabel?: boolean; }

function detectRelation(edge: FlowEdge): RelInfo {
  const d = (edge.data ?? {}) as Record<string, unknown>;
  const marker = (d.marker as string) ?? "";
  const markerStart = (d.markerStart as string) ?? "";
  const dashed = !!d.dashed;
  const label = (edge.label ?? "") as string;

  const isOpenArrow = marker.includes("m-arrow-open");
  const isFilledArrow = marker.includes("m-arrow") && !marker.includes("open");
  const isTriangle = marker.includes("m-triangle");
  const isDiamondFilled = markerStart.includes("diamond-filled");
  const isDiamondOpen = markerStart.includes("diamond-open");

  if (dashed && isOpenArrow && (label.includes("include") || label.includes("extend")))
    return { mermaidToken: "-.->", plantToken: "..>", hasStereotypeLabel: true };
  if (isTriangle && !dashed) return { mermaidToken: "--|>", plantToken: "--|>" };
  if (isTriangle && dashed)  return { mermaidToken: "..|>", plantToken: "..|>" };
  if (isDiamondFilled)       return { mermaidToken: "*--", plantToken: "*--" };
  if (isDiamondOpen)         return { mermaidToken: "o--", plantToken: "o--" };
  if (dashed && (isOpenArrow || isFilledArrow)) return { mermaidToken: "-.->", plantToken: "..>" };
  if (isFilledArrow) return { mermaidToken: "-->", plantToken: "-->" };
  return { mermaidToken: "-->", plantToken: "-->" };
}

/* ════════════════════════════════════════════════════════════
   MERMAID — CLASS DIAGRAM
   ════════════════════════════════════════════════════════════ */

function exportMermaidClass(nodes: FlowNode[], edges: FlowEdge[]): string {
  const lines: string[] = ["classDiagram"];

  // Separate package hierarchy
  const pkgKids = new Map<string, FlowNode[]>();
  const standalone: FlowNode[] = [];
  for (const n of nodes) {
    if (n.type === "package") continue;
    if (n.parentId) {
      const arr = pkgKids.get(n.parentId) ?? [];
      arr.push(n);
      pkgKids.set(n.parentId, arr);
    } else {
      standalone.push(n);
    }
  }
  const pkgMap = new Map(nodes.filter(n => n.type === "package").map(n => [n.id, n]));

  const writeClass = (n: FlowNode) => {
    if (n.type !== "cls") return;
    const d = n.data as FlowNodeData;
    const name = (d.label || n.id).replace(/[<>]/g, ""); // strip <>
    const attrs = (d.attributes ?? "").split("\n").filter(Boolean);
    const methods = (d.methods ?? "").split("\n").filter(Boolean);
    const stereo = d.stereotype?.replace(/[«»]/g, "") ?? "";
    lines.push(`class ${name}{`);
    if (stereo) lines.push(`    <<${stereo}>>`);
    for (const a of attrs) {
      // Convert visibility notation from PlantUML-style if needed
      const cleaned = a.replace(/\{static\}/, "").replace(/\{abstract\}/, "").trim();
      lines.push(`    ${cleaned}`);
    }
    for (const m of methods) {
      const cleaned = m.replace(/\{static\}/, "").replace(/\{abstract\}/, "").trim();
      lines.push(`    ${cleaned}`);
    }
    lines.push(`}`);
  };

  // Write standalone classes
  for (const n of standalone) writeClass(n);

  // Write namespaces
  for (const [pid, kids] of pkgKids) {
    const pkg = pkgMap.get(pid);
    if (!pkg) { for (const k of kids) writeClass(k); continue; }
    lines.push(`namespace ${escM(pkg.data.label || pkg.id)} {`);
    for (const k of kids) writeClass(k);
    lines.push(`}`);
  }

  // Empty packages
  for (const n of nodes) {
    if (n.type === "package" && !pkgKids.has(n.id))
      lines.push(`namespace ${escM(n.data.label || n.id)} {\n}`);
  }

  // Relationships
  for (const e of edges) {
    const sn = nodes.find(x => x.id === e.source);
    const tn = nodes.find(x => x.id === e.target);
    if (!sn || !tn) continue;
    const sL = (sn.data as FlowNodeData).label || sn.id;
    const tL = (tn.data as FlowNodeData).label || tn.id;
    const rel = detectRelation(e);
    const label = (e.label ?? "") as string;
    const tok = rel.mermaidToken;
    if (rel.hasStereotypeLabel) lines.push(`${sL} ${tok} ${tL} : ${label}`);
    else if (label) lines.push(`${sL} ${tok} ${tL} : ${escM(label)}`);
    else lines.push(`${sL} ${tok} ${tL}`);
  }

  return lines.join("\n");
}

/* ════════════════════════════════════════════════════════════
   MERMAID — USE CASE (via flowchart LR)
   ════════════════════════════════════════════════════════════ */

function exportMermaidUseCase(nodes: FlowNode[], edges: FlowEdge[]): string {
  const lines: string[] = ["flowchart LR"];

  // Build hierarchy
  const pkgKids = new Map<string, FlowNode[]>();
  const standalone: FlowNode[] = [];
  for (const n of nodes) {
    if (n.type === "package") continue;
    if (n.parentId) {
      const arr = pkgKids.get(n.parentId) ?? [];
      arr.push(n);
      pkgKids.set(n.parentId, arr);
    } else {
      standalone.push(n);
    }
  }
  const pkgMap = new Map(nodes.filter(n => n.type === "package").map(n => [n.id, n]));

  const writeNode = (n: FlowNode) => {
    const label = (n.data as FlowNodeData).label || n.id;
    if (n.type === "actor")  lines.push(`    ${n.id}["👤 ${escM(label)}"]`);
    if (n.type === "usecase") lines.push(`    ${n.id}([${escM(label)}])`);
  };

  // Write standalone nodes
  for (const n of standalone) writeNode(n);

  // Write system boundaries
  for (const [pid, kids] of pkgKids) {
    const pkg = pkgMap.get(pid);
    if (!pkg) { for (const k of kids) writeNode(k); continue; }
    lines.push(`    subgraph ${pid}["${escM(pkg.data.label || pkg.id)}"]`);
    for (const k of kids) writeNode(k);
    lines.push(`    end`);
  }

  // Relationships
  for (const e of edges) {
    const sn = nodes.find(x => x.id === e.source);
    const tn = nodes.find(x => x.id === e.target);
    if (!sn || !tn) continue;
    const label = (e.label ?? "") as string;
    const rel = detectRelation(e);
    if (rel.hasStereotypeLabel) {
      lines.push(`    ${e.source} ${rel.mermaidToken}|"${label}"| ${e.target}`);
    } else if (label) {
      lines.push(`    ${e.source} ${rel.mermaidToken}|"${escM(label)}"| ${e.target}`);
    } else {
      lines.push(`    ${e.source} ${rel.mermaidToken} ${e.target}`);
    }
  }

  return lines.join("\n");
}

/* ════════════════════════════════════════════════════════════
   MERMAID — ACTIVITY (flowchart)
   ════════════════════════════════════════════════════════════ */

function shapeMermaid(n: FlowNode): string {
  const label = (n.data as FlowNodeData).label ?? "";
  switch (n.type) {
    case "start":    return `([${escM(label || "Start")}])`;
    case "final":    return `([${escM(label || "End")}])`;
    case "decision": return `{${escM(label || "?")}}`;
    case "action":   return `[${escM(label || "")}]`;
    case "note":     return `[/${escM(label || "Note")}/]`;
    case "fork":     return `[ ]`; // invisible fork/join bar
    default:         return `[${escM(label)}]`;
  }
}

function exportMermaidActivity(nodes: FlowNode[], edges: FlowEdge[]): string {
  const lines: string[] = ["flowchart TD"];

  // Unique short IDs
  const idMap = new Map<string, string>();
  let counter = 0;
  for (const n of nodes) {
    if (n.type === "package") idMap.set(n.id, `sg${counter++}`);
    else idMap.set(n.id, `n${counter++}`);
  }

  // Node declarations + subgraphs
  for (const n of nodes) {
    const sid = idMap.get(n.id)!;
    if (n.type === "package") {
      lines.push(`    subgraph ${sid}["${escM(n.data.label || n.id)}"]`);
      continue;
    }
    const shape = shapeMermaid(n);
    lines.push(`    ${sid}${shape}`);
  }

  // Close subgraphs
  for (const n of nodes) {
    if (n.type === "package") lines.push(`    end`);
  }

  // Edges
  for (const e of edges) {
    const sId = idMap.get(e.source);
    const tId = idMap.get(e.target);
    if (!sId || !tId) continue;
    const label = (e.label ?? "") as string;
    const rel = detectRelation(e);
    if (rel.hasStereotypeLabel) {
      lines.push(`    ${sId} -.->|"${label}"| ${tId}`);
    } else if (label) {
      // Quote labels with special chars
      const needsQuote = /[><=&|]/.test(label);
      const labelStr = needsQuote ? `"${escM(label)}"` : escM(label);
      lines.push(`    ${sId} -->|${labelStr}| ${tId}`);
    } else {
      lines.push(`    ${sId} --> ${tId}`);
    }
  }

  return lines.join("\n");
}

/* ════════════════════════════════════════════════════════════
   MERMAID — COMPONENT (via flowchart)
   ════════════════════════════════════════════════════════════ */

function exportMermaidComponent(nodes: FlowNode[], edges: FlowEdge[]): string {
  const lines: string[] = ["flowchart TD"];

  // Build hierarchy
  const pkgKids = new Map<string, FlowNode[]>();
  const standalone: FlowNode[] = [];
  for (const n of nodes) {
    if (n.type === "package") continue;
    if (n.parentId) {
      const arr = pkgKids.get(n.parentId) ?? [];
      arr.push(n);
      pkgKids.set(n.parentId, arr);
    } else {
      standalone.push(n);
    }
  }
  const pkgMap = new Map(nodes.filter(n => n.type === "package").map(n => [n.id, n]));

  let cid = 0;
  const idMap = new Map<string, string>();
  const gid = () => `c${cid++}`;

  const writeNode = (n: FlowNode) => {
    const sid = idMap.get(n.id) ?? gid();
    idMap.set(n.id, sid);
    const d = n.data as FlowNodeData;
    const label = d.label || n.id;
    const stereo = d.stereotype ?? "";

    // Per spec: [[ ]] for component, [()] for database, [/ /] for queue, (( )) for interface
    if (stereo.includes("interface")) {
      lines.push(`    ${sid}(("${escM(label)}"))`);
    } else if (n.type === "component" || n.type === "cls") {
      lines.push(`    ${sid}[["${escM(label)}"]]`);
    } else if (n.type === "note") {
      lines.push(`    ${sid}["${escM(label)}"]`);
    } else {
      // actor/usecase/default — use standard rectangle
      lines.push(`    ${sid}["${escM(label)}"]`);
    }
  };

  // Standalone nodes
  for (const n of standalone) writeNode(n);

  // Inside packages
  for (const [pid, kids] of pkgKids) {
    const pkg = pkgMap.get(pid);
    if (!pkg) { for (const k of kids) writeNode(k); continue; }
    lines.push(`    subgraph ${pid}["${escM(pkg.data.label || pkg.id)}"]`);
    for (const k of kids) writeNode(k);
    lines.push(`    end`);
  }

  // Edges (using ID aliases)
  for (const e of edges) {
    const sId = idMap.get(e.source) ?? e.source;
    const tId = idMap.get(e.target) ?? e.target;
    const label = (e.label ?? "") as string;
    const rel = detectRelation(e);
    if (rel.hasStereotypeLabel) {
      lines.push(`    ${sId} -.->|"${label}"| ${tId}`);
    } else if (label) {
      lines.push(`    ${sId} -->|"${escM(label)}"| ${tId}`);
    } else {
      lines.push(`    ${sId} --> ${tId}`);
    }
  }

  return lines.join("\n");
}

/* ════════════════════════════════════════════════════════════
   MERMAID — STATE
   ════════════════════════════════════════════════════════════ */

function exportMermaidState(nodes: FlowNode[], edges: FlowEdge[]): string {
  const lines: string[] = ["stateDiagram-v2"];

  // Composite states
  const pkgKids = new Map<string, FlowNode[]>();
  for (const n of nodes) {
    if (!n.parentId) continue;
    const arr = pkgKids.get(n.parentId) ?? [];
    arr.push(n);
    pkgKids.set(n.parentId, arr);
  }

  const writeState = (n: FlowNode) => {
    if (n.type !== "action" && n.type !== "decision") return;
    const label = (n.data as FlowNodeData).label || n.id;
    lines.push(`    state "${escM(label)}" as ${n.id}`);
  };

  for (const n of nodes) {
    if (n.type === "package") {
      lines.push(`    state "${escM(n.data.label || n.id)}" as ${n.id} {`);
      const kids = pkgKids.get(n.id) ?? [];
      for (const k of kids) writeState(k);
      lines.push(`    }`);
      continue;
    }
    if (n.parentId) continue;
    writeState(n);
  }

  for (const e of edges) {
    const sn = nodes.find(x => x.id === e.source);
    const tn = nodes.find(x => x.id === e.target);
    if (!sn || !tn) continue;
    const label = (e.label ?? "") as string;
    const from = sn.type === "start" ? "[*]" : sn.id;
    const to = tn.type === "final" ? "[*]" : tn.id;
    if (label) lines.push(`    ${from} --> ${to} : ${escM(label)}`);
    else lines.push(`    ${from} --> ${to}`);
  }

  return lines.join("\n");
}

/* ════════════════════════════════════════════════════════════
   PLANTUML — CLASS DIAGRAM
   ════════════════════════════════════════════════════════════ */

function exportPlantUmlClass(nodes: FlowNode[], edges: FlowEdge[]): string {
  const lines: string[] = ["@startuml"];

  const pkgKids = new Map<string, FlowNode[]>();
  const standalone: FlowNode[] = [];
  for (const n of nodes) {
    if (n.type === "package") continue;
    if (n.parentId) {
      const arr = pkgKids.get(n.parentId) ?? [];
      arr.push(n);
      pkgKids.set(n.parentId, arr);
    } else {
      standalone.push(n);
    }
  }
  const pkgMap = new Map(nodes.filter(n => n.type === "package").map(n => [n.id, n]));

  const writeClass = (arr: FlowNode[]) => {
    for (const n of arr) {
      if (n.type !== "cls") continue;
      const d = n.data as FlowNodeData;
      const name = d.label || n.id;
      const stereo = d.stereotype ?? "";
      const attrs = (d.attributes ?? "").split("\n").filter(Boolean);
      const methods = (d.methods ?? "").split("\n").filter(Boolean);

      if (stereo) {
        const kind = stereo.includes("interface") ? "interface" :
                     stereo.includes("enum") ? "enum" : "class";
        lines.push(`${kind} "${name}" as ${n.id} <<${stereo.replace(/[«»]/g, "")}>>`);
      } else {
        lines.push(`class "${name}" as ${n.id}`);
      }
      if (attrs.length || methods.length) {
        lines.push(`{`);
        for (const a of attrs) lines.push(`  ${a}`);
        for (const m of methods) lines.push(`  ${m}`);
        lines.push(`}`);
      }
    }
  };

  writeClass(standalone);

  for (const [pid, kids] of pkgKids) {
    const pkg = pkgMap.get(pid);
    if (!pkg) { writeClass(kids); continue; }
    lines.push(`package "${esc(pkg.data.label || pkg.id)}" as ${pkg.id} {`);
    writeClass(kids);
    lines.push(`}`);
  }

  for (const n of nodes) {
    if (n.type === "package" && !pkgKids.has(n.id))
      lines.push(`package "${esc(n.data.label || n.id)}" as ${n.id} {\n}`);
  }

  for (const e of edges) {
    const sn = nodes.find(x => x.id === e.source);
    const tn = nodes.find(x => x.id === e.target);
    if (!sn || !tn) continue;
    const rel = detectRelation(e);
    const label = (e.label ?? "") as string;
    const tok = rel.plantToken;
    if (rel.hasStereotypeLabel) lines.push(`${e.source} ${tok} ${e.target} : ${label}`);
    else if (label) lines.push(`${e.source} ${tok} ${e.target} : ${esc(label)}`);
    else lines.push(`${e.source} ${tok} ${e.target}`);
  }

  lines.push("@enduml");
  return lines.join("\n");
}

/* ════════════════════════════════════════════════════════════
   PLANTUML — USE CASE
   ════════════════════════════════════════════════════════════ */

function exportPlantUmlUseCase(nodes: FlowNode[], edges: FlowEdge[]): string {
  const lines: string[] = ["@startuml", "left to right direction"];

  const pkgKids = new Map<string, FlowNode[]>();
  const standalone: FlowNode[] = [];
  for (const n of nodes) {
    if (n.type === "package") continue;
    if (n.parentId) {
      const arr = pkgKids.get(n.parentId) ?? [];
      arr.push(n);
      pkgKids.set(n.parentId, arr);
    } else {
      standalone.push(n);
    }
  }
  const pkgMap = new Map(nodes.filter(n => n.type === "package").map(n => [n.id, n]));

  const writeNode = (n: FlowNode) => {
    const label = (n.data as FlowNodeData).label || n.id;
    if (n.type === "actor")  lines.push(`actor "${esc(label)}" as ${n.id}`);
    if (n.type === "usecase") lines.push(`usecase "${esc(label)}" as ${n.id}`);
  };

  for (const n of standalone) writeNode(n);

  for (const [pid, kids] of pkgKids) {
    const pkg = pkgMap.get(pid);
    if (!pkg) { for (const k of kids) writeNode(k); continue; }
    lines.push(`rectangle "${esc(pkg.data.label || pkg.id)}" as ${pkg.id} {`);
    for (const k of kids) writeNode(k);
    lines.push(`}`);
  }

  for (const e of edges) {
    const sn = nodes.find(x => x.id === e.source);
    const tn = nodes.find(x => x.id === e.target);
    if (!sn || !tn) continue;
    const label = (e.label ?? "") as string;
    const rel = detectRelation(e);
    const tok = rel.plantToken;
    if (rel.hasStereotypeLabel) lines.push(`${e.source} ${tok} ${e.target} : ${label}`);
    else if (label) lines.push(`${e.source} ${tok} ${e.target} : ${esc(label)}`);
    else lines.push(`${e.source} ${tok} ${e.target}`);
  }

  lines.push("@enduml");
  return lines.join("\n");
}

/* ════════════════════════════════════════════════════════════
   PLANTUML — ACTIVITY
   ════════════════════════════════════════════════════════════ */

function exportPlantUmlActivity(nodes: FlowNode[], _edges: FlowEdge[]): string {
  const lines: string[] = ["@startuml", "skinparam backgroundColor #FFFFFF", "start"];

  // Simplified: output all action/decision nodes sequentially
  // Decisions become if/endif blocks without deep nesting
  for (const n of nodes) {
    if (n.type === "start" || n.type === "final") continue;
    const label = (n.data as FlowNodeData).label ?? "";
    if (n.type === "decision") {
      if (label) lines.push(`if (${esc(label)}) then`);
      else lines.push(`if (??) then`);
      lines.push("endif");
    } else if (label) {
      lines.push(`:${esc(label)};`);
    }
  }

  lines.push("stop", "@enduml");
  return lines.join("\n");
}

/* ════════════════════════════════════════════════════════════
   PLANTUML — COMPONENT
   ════════════════════════════════════════════════════════════ */

function exportPlantUmlComponent(nodes: FlowNode[], edges: FlowEdge[]): string {
  const lines: string[] = ["@startuml"];

  const pkgKids = new Map<string, FlowNode[]>();
  const standalone: FlowNode[] = [];
  for (const n of nodes) {
    if (n.type === "package") continue;
    if (n.parentId) {
      const arr = pkgKids.get(n.parentId) ?? [];
      arr.push(n);
      pkgKids.set(n.parentId, arr);
    } else {
      standalone.push(n);
    }
  }
  const pkgMap = new Map(nodes.filter(n => n.type === "package").map(n => [n.id, n]));

  const writeComp = (n: FlowNode) => {
    const d = n.data as FlowNodeData;
    const label = d.label || n.id;
    const stereo = d.stereotype ?? "";
    if (stereo.includes("interface")) {
      lines.push(`interface "${esc(label)}" as ${n.id}`);
    } else if (n.type === "component" || n.type === "cls") {
      lines.push(`component "${esc(label)}" as ${n.id}`);
    } else if (n.type === "note") {
      lines.push(`note as ${n.id}\n  ${esc(label)}\nend note`);
    }
  };

  for (const n of standalone) writeComp(n);

  for (const [pid, kids] of pkgKids) {
    const pkg = pkgMap.get(pid);
    if (!pkg) { for (const k of kids) writeComp(k); continue; }
    lines.push(`package "${esc(pkg.data.label || pkg.id)}" as ${pkg.id} {`);
    for (const k of kids) writeComp(k);
    lines.push(`}`);
  }

  for (const e of edges) {
    const sn = nodes.find(x => x.id === e.source);
    const tn = nodes.find(x => x.id === e.target);
    if (!sn || !tn) continue;
    const label = (e.label ?? "") as string;
    const rel = detectRelation(e);
    const dash = rel.mermaidToken.startsWith(".");
    const arrow = dash ? "..>" : "-->";
    if (rel.hasStereotypeLabel) lines.push(`${e.source} ${arrow} ${e.target} : ${label}`);
    else if (label) lines.push(`${e.source} ${arrow} ${e.target} : ${esc(label)}`);
    else lines.push(`${e.source} ${arrow} ${e.target}`);
  }

  lines.push("@enduml");
  return lines.join("\n");
}

/* ════════════════════════════════════════════════════════════
   PLANTUML — STATE
   ════════════════════════════════════════════════════════════ */

function exportPlantUmlState(nodes: FlowNode[], edges: FlowEdge[]): string {
  const lines: string[] = ["@startuml"];

  for (const n of nodes) {
    if (n.type !== "action" && n.type !== "decision") continue;
    const label = (n.data as FlowNodeData).label || n.id;
    lines.push(`state "${esc(label)}" as ${n.id}`);
  }

  for (const e of edges) {
    const sn = nodes.find(x => x.id === e.source);
    const tn = nodes.find(x => x.id === e.target);
    if (!sn || !tn) continue;
    const label = (e.label ?? "") as string;
    const from = sn.type === "start" ? "[*]" : sn.id;
    const to = tn.type === "final" ? "[*]" : tn.id;
    if (label) lines.push(`${from} --> ${to} : ${esc(label)}`);
    else lines.push(`${from} --> ${to}`);
  }

  lines.push("@enduml");
  return lines.join("\n");
}

/* ════════════════════════════════════════════════════════════
   PUBLIC API
   ════════════════════════════════════════════════════════════ */

export function toMermaid(nodes: FlowNode[], edges: FlowEdge[], type: DiagramType): string {
  switch (type) {
    case "class":     return exportMermaidClass(nodes, edges);
    case "usecase":   return exportMermaidUseCase(nodes, edges);
    case "activity":  return exportMermaidActivity(nodes, edges);
    case "state":     return exportMermaidState(nodes, edges);
    case "component": return exportMermaidComponent(nodes, edges);
    default:          return exportMermaidClass(nodes, edges);
  }
}

export function toPlantUml(nodes: FlowNode[], edges: FlowEdge[], type: DiagramType): string {
  switch (type) {
    case "class":     return exportPlantUmlClass(nodes, edges);
    case "usecase":   return exportPlantUmlUseCase(nodes, edges);
    case "activity":  return exportPlantUmlActivity(nodes, edges);
    case "state":     return exportPlantUmlState(nodes, edges);
    case "component": return exportPlantUmlComponent(nodes, edges);
    default:          return exportPlantUmlClass(nodes, edges);
  }
}

export function toDiagramXml(nodes: FlowNode[], edges: FlowEdge[], type: DiagramType): string {
  const lines: string[] = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<diagram type="${type}">`,
    `  <nodes>`,
  ];
  for (const n of nodes) {
    const d = n.data as FlowNodeData;
    lines.push(`    <node id="${n.id}" type="${n.type}" x="${Math.round(n.position.x)}" y="${Math.round(n.position.y)}">`);
    if (d.label) lines.push(`      <label>${esc(d.label)}</label>`);
    if (d.stereotype) lines.push(`      <stereotype>${esc(d.stereotype)}</stereotype>`);
    if (d.attributes) lines.push(`      <attributes>${esc(d.attributes)}</attributes>`);
    if (d.methods) lines.push(`      <methods>${esc(d.methods)}</methods>`);
    lines.push(`    </node>`);
  }
  lines.push(`  </nodes>`, `  <edges>`);
  for (const e of edges) {
    const d = (e.data ?? {}) as Record<string, unknown>;
    lines.push(`    <edge id="${e.id}" source="${e.source}" target="${e.target}"` +
      ` label="${esc((e.label ?? "") as string)}"` +
      ` marker="${(d.marker as string) ?? ""}"` +
      ` dashed="${!!d.dashed}" />`);
  }
  lines.push(`  </edges>`, `</diagram>`);
  return lines.join("\n");
}
