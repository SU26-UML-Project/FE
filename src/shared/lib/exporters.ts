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

import type { FlowEdge, FlowNode, FlowNodeData, DiagramType } from "../../types";
import { resolveEdgeMultiplicity } from './edgeMultiplicity';

/* ════════════════════════════════════════════════════════════
   HELPERS
   ════════════════════════════════════════════════════════════ */

const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, '\\"').replace(/\n/g, "\\n");
const escM = (s: string) => s.replace(/"/g, "&quot;").replace(/\n/g, "<br>");
// classDiagram has no quoted-namespace syntax and rejects HTML entities; use a
// backtick-quoted identifier for namespaces and \" for quotes inside relation labels.
const escClassNs = (s: string): string => mermaidClassName(s.replace(/"/g, ""));
const escClassRel = (s: string): string => s.replace(/"/g, '\\"');


function safeId(id: string): string {
    const sanitized = id.replace(/[^a-zA-Z0-9_]/g, "_");
    if (/^[a-zA-Z]/.test(sanitized)) return sanitized;
    return "id_" + sanitized;
}

function mermaidClassName(label: string): string {
    const clean = label.replace(/[<>]/g, "").trim();
    if (clean.includes(" ") || clean.includes("-")) return `\`${clean}\``;
    return clean;
}

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

/**
 * Map a relation to a Mermaid FLOWCHART-valid edge token.
 *
 * Flowchart syntax does not understand class-diagram markers such as
 * `o--` (aggregation), `*--` (composition) or `--|>` (inheritance). Those
 * tokens legitimately crash `mermaid.parse`. For the flowchart-based exporters
 * (usecase / activity / component) we therefore degrade them to a plain arrow
 * while still preserving the dotted style for dashed relations.
 */
function flowToken(rel: RelInfo): string {
    return rel.mermaidToken.includes(".") ? "-.->" : "-->";
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
        const name = mermaidClassName(d.label || n.id);
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
        lines.push(`namespace ${escClassNs(pkg.data.label || pkg.id)} {`);
        for (const k of kids) writeClass(k);
        lines.push(`}`);
    }

    // Empty packages: Mermaid classDiagram has no valid empty `namespace { }`
    // syntax (it throws a parse error), so skip packages that contain no classes.
    // Flowchart-based diagrams use `subgraph … end`, which is valid when empty.

    // Relationships
    for (const e of edges) {
        const sn = nodes.find(x => x.id === e.source);
        const tn = nodes.find(x => x.id === e.target);
        if (!sn || !tn) continue;
        // classDiagram relations connect classes; skip edges bound to package containers
        if (sn.type === "package" || tn.type === "package") continue;
        const sL = mermaidClassName((sn.data as FlowNodeData).label || sn.id);
        const tL = mermaidClassName((tn.data as FlowNodeData).label || tn.id);
        const rel = detectRelation(e);
        const { name: finalLabel, source: leftMulti, target: rightMulti } = resolveEdgeMultiplicity(e.data, e.label);
        // classDiagram has no '-.->' token; dependency/dotted relation must be '..>'
        const tok = rel.mermaidToken === "-.->" ? "..>" : rel.mermaidToken;

        if (leftMulti || rightMulti) {
            if (finalLabel) {
                lines.push(`${sL} "${leftMulti}" ${tok} "${rightMulti}" ${tL} : ${escClassRel(finalLabel)}`);
            } else {
                lines.push(`${sL} "${leftMulti}" ${tok} "${rightMulti}" ${tL}`);
            }
        } else {
            if (rel.hasStereotypeLabel) lines.push(`${sL} ${tok} ${tL} : ${finalLabel}`);
            else if (finalLabel) lines.push(`${sL} ${tok} ${tL} : ${escClassRel(finalLabel)}`);
            else lines.push(`${sL} ${tok} ${tL}`);
        }
    }

    return lines.join("\n");
}

/* ════════════════════════════════════════════════════════════
   MERMAID — USE CASE (via flowchart LR)
   ════════════════════════════════════════════════════════════ */

function exportMermaidUseCase(nodes: FlowNode[], edges: FlowEdge[]): string {
    const lines: string[] = ["flowchart LR"];

    // Safe, Mermaid-valid aliases for node ids (nanoid ids may start with a digit).
    const idMap = new Map<string, string>();
    const mid = (id: string): string => {
        if (!idMap.has(id)) idMap.set(id, safeId(id));
        return idMap.get(id)!;
    };

    // Build hierarchy (use-case system boundaries are stored as `boundary`)
    const pkgKids = new Map<string, FlowNode[]>();
    const standalone: FlowNode[] = [];
    for (const n of nodes) {
        if (n.type === "package" || n.type === "boundary") continue;
        if (n.parentId) {
            const arr = pkgKids.get(n.parentId) ?? [];
            arr.push(n);
            pkgKids.set(n.parentId, arr);
        } else {
            standalone.push(n);
        }
    }
    const pkgMap = new Map(nodes.filter(n => n.type === "package" || n.type === "boundary").map(n => [n.id, n]));

    const writeNode = (n: FlowNode) => {
        const label = (n.data as FlowNodeData).label || n.id;
        if (n.type === "actor")  lines.push(`    ${mid(n.id)}["👤 ${escM(label)}"]`);
        if (n.type === "usecase") lines.push(`    ${mid(n.id)}([${escM(label)}])`);
    };

    // Write standalone nodes
    for (const n of standalone) writeNode(n);

    // Write system boundaries
    for (const [pid, kids] of pkgKids) {
        const pkg = pkgMap.get(pid);
        if (!pkg) { for (const k of kids) writeNode(k); continue; }
        lines.push(`    subgraph ${mid(pid)}["${escM(pkg.data.label || pkg.id)}"]`);
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
        const tok = flowToken(rel);
        if (rel.hasStereotypeLabel) {
            lines.push(`    ${mid(e.source)} ${tok}|"${label}"| ${mid(e.target)}`);
        } else if (label) {
            lines.push(`    ${mid(e.source)} ${tok}|"${escM(label)}"| ${mid(e.target)}`);
        } else {
            lines.push(`    ${mid(e.source)} ${tok} ${mid(e.target)}`);
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
        if (n.type === "package" || n.type === "swimlane") idMap.set(n.id, `sg${counter++}`);
        else idMap.set(n.id, `n${counter++}`);
    }

    // Build hierarchy (swimlanes are Activity partitions / containers)
    const pkgKids = new Map<string, FlowNode[]>();
    const standalone: FlowNode[] = [];
    for (const n of nodes) {
        if (n.type === "package" || n.type === "swimlane") continue;
        if (n.parentId) {
            const arr = pkgKids.get(n.parentId) ?? [];
            arr.push(n);
            pkgKids.set(n.parentId, arr);
        } else {
            standalone.push(n);
        }
    }
    const pkgMap = new Map(nodes.filter(n => n.type === "package" || n.type === "swimlane").map(n => [n.id, n]));

    const writeNode = (n: FlowNode) => {
        const sid = idMap.get(n.id)!;
        const shape = shapeMermaid(n);
        lines.push(`    ${sid}${shape}`);
    };

    // Write standalone nodes
    for (const n of standalone) writeNode(n);

    // Inside packages
    for (const [pid, kids] of pkgKids) {
        const pkg = pkgMap.get(pid);
        const sid = idMap.get(pid)!;
        if (!pkg) { for (const k of kids) writeNode(k); continue; }
        lines.push(`    subgraph ${sid}["${escM(pkg.data.label || pkg.id)}"]`);
        for (const k of kids) writeNode(k);
        lines.push(`    end`);
    }

    // Empty packages / swimlanes
    for (const n of nodes) {
        if ((n.type === "package" || n.type === "swimlane") && !pkgKids.has(n.id)) {
            const sid = idMap.get(n.id)!;
            lines.push(`    subgraph ${sid}["${escM(n.data.label || n.id)}"]\n    end`);
        }
    }

    // Edges
    for (const e of edges) {
        const sId = idMap.get(e.source);
        const tId = idMap.get(e.target);
        if (!sId || !tId) continue;
        const label = (e.label ?? "") as string;
        const rel = detectRelation(e);
        const tok = flowToken(rel);
        if (rel.hasStereotypeLabel) {
            lines.push(`    ${sId} -.->|"${label}"| ${tId}`);
        } else if (label) {
            // Quote labels with special chars
            const needsQuote = /[><=&|]/.test(label);
            const labelStr = needsQuote ? `"${escM(label)}"` : escM(label);
            lines.push(`    ${sId} ${tok}|${labelStr}| ${tId}`);
        } else {
            lines.push(`    ${sId} ${tok} ${tId}`);
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
        const stereoLower = stereo.toLowerCase();

        // Per spec: [[ ]] for component, [()] for database, (( )) for interface, {{ }} for cloud, ["🖥️ "] for node
        if (stereoLower.includes("interface")) {
            lines.push(`    ${sid}(("${escM(label)}"))`);
        } else if (stereoLower.includes("database")) {
            lines.push(`    ${sid}[("${escM(label)}")]`); // DATABASE cylinder shape!
        } else if (stereoLower.includes("node")) {
            lines.push(`    ${sid}["🖥️ ${escM(label)}"]`); // Node shape with computer emoji
        } else if (stereoLower.includes("cloud")) {
            lines.push(`    ${sid}{{"${escM(label)}"}}`); // Cloud-like hexagon shape!
        } else if (stereoLower.includes("storage")) {
            lines.push(`    ${sid}[("${escM(label)}")]`); // Use database cylinder for storage
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
        const tok = flowToken(rel);
        if (rel.hasStereotypeLabel) {
            lines.push(`    ${sId} -.->|"${label}"| ${tId}`);
        } else if (label) {
            lines.push(`    ${sId} ${tok}|"${escM(label)}"| ${tId}`);
        } else {
            lines.push(`    ${sId} ${tok} ${tId}`);
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
        if (n.type !== "state" && n.type !== "action" && n.type !== "decision") return;
        const label = (n.data as FlowNodeData).label || n.id;
        lines.push(`    state "${escM(label)}" as ${safeId(n.id)}`);
    };

    for (const n of nodes) {
        if (n.type === "package") {
            lines.push(`    state "${escM(n.data.label || n.id)}" as ${safeId(n.id)} {`);
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
        const from = sn.type === "start" ? "[*]" : safeId(sn.id);
        const to = tn.type === "final" ? "[*]" : safeId(tn.id);
        if (label) lines.push(`    ${from} --> ${to} : ${escM(label)}`);
        else lines.push(`    ${from} --> ${to}`);
    }

    return lines.join("\n");
}

/* ════════════════════════════════════════════════════════════
   PLANTUML — CLASS DIAGRAM
   ════════════════════════════════════════════════════════════ */

function exportPlantUmlClass(nodes: FlowNode[], edges: FlowEdge[]): string {
    const lines: string[] = ["@startuml", "skinparam classAttributeIconSize 0"];

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
            const sId = safeId(n.id);

            if (stereo) {
                const kind = stereo.includes("interface") ? "interface" :
                    stereo.includes("enum") ? "enum" : "class";
                lines.push(`${kind} "${name}" as ${sId} <<${stereo.replace(/[«»]/g, "")}>>`);
            } else {
                lines.push(`class "${name}" as ${sId}`);
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
        lines.push(`package "${esc(pkg.data.label || pkg.id)}" as ${safeId(pkg.id)} {`);
        writeClass(kids);
        lines.push(`}`);
    }

    for (const n of nodes) {
        if (n.type === "package" && !pkgKids.has(n.id))
            lines.push(`package "${esc(n.data.label || n.id)}" as ${safeId(n.id)} {\n}`);
    }

    for (const e of edges) {
        const sn = nodes.find(x => x.id === e.source);
        const tn = nodes.find(x => x.id === e.target);
        if (!sn || !tn) continue;
        const sId = safeId(e.source);
        const tId = safeId(e.target);
        const rel = detectRelation(e);
        const { name: finalLabel, source: leftMulti, target: rightMulti } = resolveEdgeMultiplicity(e.data, e.label);
        const tok = rel.plantToken;

        if (leftMulti || rightMulti) {
            if (finalLabel) {
                lines.push(`${sId} "${leftMulti}" ${tok} "${rightMulti}" ${tId} : ${esc(finalLabel)}`);
            } else {
                lines.push(`${sId} "${leftMulti}" ${tok} "${rightMulti}" ${tId}`);
            }
        } else {
            if (rel.hasStereotypeLabel) lines.push(`${sId} ${tok} ${tId} : ${finalLabel}`);
            else if (finalLabel) lines.push(`${sId} ${tok} ${tId} : ${esc(finalLabel)}`);
            else lines.push(`${sId} ${tok} ${tId}`);
        }
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
        if (n.type === "package" || n.type === "boundary") continue;
        if (n.parentId) {
            const arr = pkgKids.get(n.parentId) ?? [];
            arr.push(n);
            pkgKids.set(n.parentId, arr);
        } else {
            standalone.push(n);
        }
    }
    const pkgMap = new Map(nodes.filter(n => n.type === "package" || n.type === "boundary").map(n => [n.id, n]));

    const writeNode = (n: FlowNode) => {
        const label = (n.data as FlowNodeData).label || n.id;
        const sId = safeId(n.id);
        if (n.type === "actor")  lines.push(`actor "${esc(label)}" as ${sId}`);
        if (n.type === "usecase") lines.push(`usecase "${esc(label)}" as ${sId}`);
    };

    for (const n of standalone) writeNode(n);

    for (const [pid, kids] of pkgKids) {
        const pkg = pkgMap.get(pid);
        if (!pkg) { for (const k of kids) writeNode(k); continue; }
        lines.push(`rectangle "${esc(pkg.data.label || pkg.id)}" as ${safeId(pkg.id)} {`);
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
        const sId = safeId(e.source);
        const tId = safeId(e.target);
        if (rel.hasStereotypeLabel) lines.push(`${sId} ${tok} ${tId} : ${label}`);
        else if (label) lines.push(`${sId} ${tok} ${tId} : ${esc(label)}`);
        else lines.push(`${sId} ${tok} ${tId}`);
    }

    lines.push("@enduml");
    return lines.join("\n");
}

/* ════════════════════════════════════════════════════════════
   PLANTUML — ACTIVITY
   ════════════════════════════════════════════════════════════ */

function exportPlantUmlActivity(nodes: FlowNode[], edges: FlowEdge[]): string {
    const lines: string[] = ["@startuml", "skinparam backgroundColor #FFFFFF"];

    const byId = new Map(nodes.map((n) => [n.id, n]));
    const outgoing = (id: string) => edges.filter((ed) => ed.source === id);
    const incomingCount = (id: string) => edges.filter((ed) => ed.target === id).length;
    const isMerge = (id: string) => incomingCount(id) > 1;
    const visited = new Set<string>();
    let activeLaneId: string | null = null;

    const laneSwitch = (n: FlowNode): string[] => {
        if (n.parentId && n.parentId !== activeLaneId) {
            const lane = byId.get(n.parentId);
            if (lane && lane.type === "swimlane") {
                activeLaneId = n.parentId;
                return [`|${lane.data.label || lane.id}|`];
            }
        }
        return [];
    };

    // Merge (reconvergence) nodes reachable from `startId`, BFS order.
    const reachableMerges = (startId: string): string[] => {
        const seen = new Set<string>([startId]);
        const q: string[] = [startId];
        const merges: string[] = [];
        while (q.length) {
            const cur = q.shift()!;
            if (isMerge(cur)) merges.push(cur);
            for (const ed of outgoing(cur)) {
                if (!seen.has(ed.target)) {
                    seen.add(ed.target);
                    q.push(ed.target);
                }
            }
        }
        return merges;
    };

    // The merge node where all outgoing branches of `nodeId` reconverge.
    const mergeAfter = (nodeId: string): string | null => {
        const outs = outgoing(nodeId);
        if (outs.length < 2) return null;
        let common = reachableMerges(outs[0].target);
        for (let i = 1; i < outs.length; i++) {
            const rm = reachableMerges(outs[i].target);
            common = common.filter((m) => rm.includes(m));
        }
        return common[0] ?? null;
    };

    const walk = (nodeId: string, stopAtMerge: boolean = false): string[] => {
        if (visited.has(nodeId)) return [];
        if (stopAtMerge && isMerge(nodeId)) return [];
        visited.add(nodeId);
        const n = byId.get(nodeId);
        if (!n) return [];

        const res: string[] = [];
        res.push(...laneSwitch(n));

        if (n.type === "start") {
            res.push("start");
            const out = outgoing(nodeId);
            if (out.length) res.push(...walk(out[0].target, stopAtMerge));
        } else if (n.type === "final") {
            res.push("stop");
        } else if (n.type === "action") {
            res.push(`:${esc(n.data.label || "")};`);
            const out = outgoing(nodeId);
            if (out.length) res.push(...walk(out[0].target, stopAtMerge));
        } else if (n.type === "note") {
            res.push(`note right\n  ${esc(n.data.label || "")}\nend note`);
            const out = outgoing(nodeId);
            if (out.length) res.push(...walk(out[0].target, stopAtMerge));
        } else if (n.type === "decision") {
            const cond = n.data.label || "Condition?";
            const out = outgoing(nodeId);
            if (out.length >= 2) {
                // First outgoing edge = "then" branch, second = "else" (predictable,
                // follows the edge order the user drew instead of guessing keywords).
                const yes = out[0];
                const no = out[1];
                // Use `||` (not `??`) so an EMPTY-STRING label also falls back to
                // "Đúng"/"Sai" — `??` would leave a blank `then ()` / `else ()` branch.
                const yesLbl = String(yes.label || "Đúng");
                const noLbl = String(no.label || "Sai");
                res.push(`if (${esc(cond)}) then (${esc(yesLbl)})`);
                res.push(...walk(yes.target, true));
                res.push(`else (${esc(noLbl)})`);
                res.push(...walk(no.target, true));
                res.push(`endif`);
                const m = mergeAfter(nodeId);
                if (m && !visited.has(m)) res.push(...walk(m, false));
            } else if (out.length === 1) {
                res.push(`if (${esc(cond)}) then`);
                res.push(...walk(out[0].target, true));
                res.push(`endif`);
                const m = mergeAfter(nodeId);
                if (m && !visited.has(m)) res.push(...walk(m, false));
            }
        } else if (n.type === "fork") {
            const inc = incomingCount(nodeId);
            if (inc > 1) {
                // Join node: just continue to its (single) target.
                const out = outgoing(nodeId);
                if (out.length) res.push(...walk(out[0].target, stopAtMerge));
            } else {
                const out = outgoing(nodeId);
                if (out.length > 1) {
                    res.push("fork");
                    out.forEach((ed, i) => {
                        if (i > 0) res.push("fork again");
                        res.push(...walk(ed.target, true));
                    });
                    res.push("end fork");
                    const m = mergeAfter(nodeId);
                    if (m && !visited.has(m)) res.push(...walk(m, false));
                } else if (out.length === 1) {
                    res.push(...walk(out[0].target, stopAtMerge));
                }
            }
        }

        return res;
    };

    const startNode = nodes.find((n) => n.type === "start") || nodes[0];
    if (startNode) lines.push(...walk(startNode.id));

    // Fallback for disconnected / unvisited nodes.
    for (const n of nodes) {
        if (!visited.has(n.id) && n.type !== "swimlane") {
            lines.push(...laneSwitch(n));
            if (n.type === "action") lines.push(`:${esc(n.data.label || "")};`);
            else if (n.type === "decision") lines.push(`if (${esc(n.data.label || "Condition?")}) then\nendif`);
            else if (n.type === "note") lines.push(`note right\n  ${esc(n.data.label || "")}\nend note`);
            else if (n.type === "final") lines.push("stop");
        }
    }

    lines.push("@enduml");
    return lines.join("\n");
}

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
        const stereoLower = stereo.toLowerCase();
        const sId = safeId(n.id);
        if (stereoLower.includes("interface")) {
            lines.push(`interface "${esc(label)}" as ${sId}`);
        } else if (stereoLower.includes("database")) {
            lines.push(`database "${esc(label)}" as ${sId}`);
        } else if (stereoLower.includes("node")) {
            lines.push(`node "${esc(label)}" as ${sId}`);
        } else if (stereoLower.includes("cloud")) {
            lines.push(`cloud "${esc(label)}" as ${sId}`);
        } else if (stereoLower.includes("storage")) {
            lines.push(`storage "${esc(label)}" as ${sId}`);
        } else if (n.type === "component" || n.type === "cls") {
            lines.push(`component "${esc(label)}" as ${sId}`);
        } else if (n.type === "note") {
            lines.push(`note as ${sId}\n  ${esc(label)}\nend note`);
        }
    };

    for (const n of standalone) writeComp(n);

    for (const [pid, kids] of pkgKids) {
        const pkg = pkgMap.get(pid);
        if (!pkg) { for (const k of kids) writeComp(k); continue; }
        lines.push(`package "${esc(pkg.data.label || pkg.id)}" as ${safeId(pkg.id)} {`);
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
        const sId = safeId(e.source);
        const tId = safeId(e.target);
        if (rel.hasStereotypeLabel) lines.push(`${sId} ${arrow} ${tId} : ${label}`);
        else if (label) lines.push(`${sId} ${arrow} ${tId} : ${esc(label)}`);
        else lines.push(`${sId} ${arrow} ${tId}`);
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
        if (n.type !== "state" && n.type !== "action" && n.type !== "decision") continue;
        const label = (n.data as FlowNodeData).label || n.id;
        lines.push(`state "${esc(label)}" as ${safeId(n.id)}`);
    }

    for (const e of edges) {
        const sn = nodes.find(x => x.id === e.source);
        const tn = nodes.find(x => x.id === e.target);
        if (!sn || !tn) continue;
        const label = (e.label ?? "") as string;
        const from = sn.type === "start" ? "[*]" : safeId(sn.id);
        const to = tn.type === "final" ? "[*]" : safeId(tn.id);
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
