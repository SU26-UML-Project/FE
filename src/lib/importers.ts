import { nanoid } from "nanoid";
import dagre from "dagre";
import type { DiagramType, FlowEdge, FlowEdgeData, FlowNode, FlowNodeData } from "../types";
import { classMinSize } from "./sizing";
import type { DiagramChatResponse, AiQuestionDto } from "../types/ai";
import { finalizeLayout, layoutActivityWithSwimlanes } from "./elkLayout";

/* Marker URL constants (must match src/lib/markers.tsx ids). */
const MARK = {
    arrow: "url(#m-arrow)",
    openArrow: "url(#m-arrow-open)",
    triangle: "url(#m-triangle)",
    diamondFilledStart: "url(#m-diamond-filled-start)",
    diamondOpenStart: "url(#m-diamond-open-start)",
    none: "",
};

const DEFAULT_SIZES: Record<string, [number, number]> = {
    action: [150, 54],
    decision: [150, 104],
    start: [38, 38],
    final: [40, 40],
    fork: [100, 8],
    actor: [76, 124],
    usecase: [170, 76],
    package: [300, 300],
    cls: [180, 120],
    interface: [180, 120],
};

export interface ParseResult {
    nodes: FlowNode[];
    edges: FlowEdge[];
    /** suggested diagram type to switch the palette to */
    type?: DiagramType;
    /** ambiguities the AI wants the user to resolve (human-in-the-loop) */
    questions?: ImportQuestion[];
    /** detected source format */
    format?: string;
    /** if true, the nodes already have a valid layout (skip PASS 1 ELK) */
    preLayouted?: boolean;
    /** layout direction: TB or LR */
    direction?: "TB" | "LR";
}

export interface QuestionOption {
    label: string;
    marker?: string;
    markerStart?: string;
    dashed?: boolean;
}

export interface ImportQuestion {
    id: string;
    /** which edge id the answer will patch (optional for general HITL) */
    edgeId?: string;
    prompt: string;
    detail?: string;
    /** single-select (pick 1) when false; multiple-select when true */
    multiple?: boolean;
    options: QuestionOption[];
}

/** A resolved answer.
 *  - option:  a single chosen option (single-select)
 *  - multiple: several chosen options + an optional free-text "Other"
 *  - other:   a free-text "Other" value (single-select) */
export type Answer =
    | { kind: "option"; option: QuestionOption }
    | { kind: "multiple"; options: QuestionOption[]; other?: string }
    | { kind: "other"; text: string };

/* Relationship options surfaced when a class relationship is ambiguous. */
const RELATION_OPTIONS: QuestionOption[] = [
    { label: "Association", marker: MARK.openArrow },
    { label: "Aggregation", markerStart: MARK.diamondOpenStart },
    { label: "Composition", markerStart: MARK.diamondFilledStart },
    { label: "Dependency", marker: MARK.openArrow, dashed: true },
    { label: "Inheritance", marker: MARK.triangle },
    { label: "Realization", marker: MARK.triangle, dashed: true },
];

/* ---------------- node / edge builders ---------------- */
export interface RelOpts {
    marker?: string;
    markerStart?: string;
    dashed?: boolean;
    label?: string;
    type?: FlowEdge["type"];
    ambiguous?: boolean;
    fromName?: string;
    toName?: string;
    color?: string;
    multiplicitySource?: string;
    multiplicityTarget?: string;
}

function mkNode(
    type: string, x: number, y: number,
    data: FlowNodeData, w: number, h: number,
    parentId?: string, id?: string
): FlowNode {
    return {
        id: id || nanoid(8),
        type,
        position: { x, y },
        data,
        width: w,
        height: h,
        style: { width: w, height: h },
        parentId,
        // extent: parentId ? "parent" : undefined,
    };
}

function mkEdge(s: string, t: string, o: RelOpts): FlowEdge {
    return {
        id: nanoid(8),
        source: s,
        target: t,
        type: o.type ?? "smoothstep",
        label: o.label ?? "",
        data: {
            marker: o.marker ?? "",
            markerStart: o.markerStart ?? "",
            dashed: !!o.dashed,
            ambiguous: o.ambiguous,
            fromName: o.fromName,
            toName: o.toName,
            color: o.color,
            multiplicitySource: o.multiplicitySource,
            multiplicityTarget: o.multiplicityTarget,
        },
    };
}

/* ---------------- layout helpers ---------------- */
function decodeMermaid(str: string): string {
    if (!str) return "";
    return str
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, "&")
        .replace(/&nbsp;/g, " ")
        .replace(/&#x2F;/g, "/")
        .replace(/&#123;/g, "{")
        .replace(/&#125;/g, "}")
        .replace(/<br\/?>/gi, "\n")
        .trim();
}

function layeredLayout(
    ids: string[],
    edges: { source: string; target: string; label?: string }[],
    direction: "TB" | "LR" = "TB",
    nodeSizes?: Map<string, { width: number; height: number }>
): Map<string, { x: number; y: number }> {
    const g = new dagre.graphlib.Graph();

    // LR mode needs very high nodesep (vertical gap) to create "corridors" for edges
    const isLR = direction === "LR";
    const nodesep = isLR ? 120 : 80;
    const ranksep = isLR ? 180 : 90;

    g.setGraph({
        rankdir: direction,
        nodesep,
        ranksep,
        marginx: 40,
        marginy: 40
    });
    g.setDefaultEdgeLabel(() => ({}));

    ids.forEach((id) => {
        const size = nodeSizes?.get(id) ?? { width: 200, height: 100 };
        g.setNode(id, { width: size.width, height: size.height });
    });

    edges.forEach((e) => {
        // Dagre can also take label dimensions
        const labelLen = e.label?.length ?? 0;
        g.setEdge(e.source, e.target, {
            width: labelLen * 8,
            height: 20
        });
    });

    dagre.layout(g);

    const pos = new Map<string, { x: number; y: number }>();
    ids.forEach((id) => {
        const node = g.node(id);
        pos.set(id, { x: node.x, y: node.y });
    });

    return pos;
}

/**
 * Finalize layout by calculating bounding boxes for packages/subgraphs
 * and converting child coordinates to relative.
 */
function clsSize(label: string, attrs: string[], methods: string[], stereo?: string) {
    const data = {
        label,
        stereotype: stereo,
        attributes: attrs.join("\n"),
        methods: methods.join("\n"),
    };
    return classMinSize(data);
}

/* ============================================================
   MERMAID
   ============================================================ */
export function parseMermaid(code: string): ParseResult {
    // 1. Pre-process: strip comments and YAML frontmatter
    let processed = code
        .replace(/%%[^\n]*/g, "") // Strip Mermaid comments
        .replace(/^\s*---[\s\S]*?---\s*/, ""); // Strip YAML frontmatter

    // 2. Filter lines: keep only those that define nodes or edges
    // NOTE: do NOT strip "direction" here — each sub-parser handles its own
    const lines = processed.split("\n").map(l => l.trim());
    const clean: string[] = [];

    for (const line of lines) {
        if (!line) continue;
        const low = line.toLowerCase();

        // Explicitly ignore non-structural lines
        if (low.startsWith("note ")) continue;
        if (low.startsWith("style ")) continue;
        if (low.startsWith("classdef ")) continue;
        if (low.startsWith("linkstyle ")) continue;
        if (low.startsWith("click ")) continue;
        if (low.startsWith("title ")) continue;
        if (low.startsWith("accTitle ")) continue;
        if (low.startsWith("accDescr ")) continue;

        clean.push(line);
    }

    if (clean.length === 0) return { nodes: [], edges: [], type: "activity" };

    const head = clean[0].toLowerCase();
    if (head.startsWith("classdiagram")) return parseClassLike(clean, false);
    if (head.startsWith("flowchart") || head.startsWith("graph"))
        return parseFlowchart(clean);
    if (head.startsWith("statediagram")) return parseState(clean);
    if (head.startsWith("usecasediagram") || head.startsWith("usecase")) return parseMermaidUseCase(clean);
    if (head.startsWith("componentdiagram") || head.startsWith("component")) return parseMermaidComponent(clean);

    // No header — guess.
    if (/\bclass\b|\}<\|--|\*--|o--/.test(processed)) return parseClassLike(clean, false);
    if (/\bactor\b|\busecase\b|\(\)/.test(processed)) return parseMermaidUseCase(clean);
    if (/\bcomponent\b|\[\[.*\]\]/.test(processed)) return parseMermaidComponent(clean);
    return parseFlowchart(clean);
}

/* ---- class diagram (mermaid + plantuml share this) ---- */
function parseClassLike(lines: string[], _plant: boolean): ParseResult {
    const classes = new Map<
        string,
        { label: string; stereotype?: string; attrs: string[]; methods: string[]; parentId?: string }
    >();
    const ensure = (id: string, label?: string) => {
        if (!classes.has(id))
            classes.set(id, { label: label ?? id, attrs: [], methods: [], parentId: undefined });
        else if (label) classes.get(id)!.label = label;
        return classes.get(id)!;
    };

    // Pass 1: class definitions + members.
    let i = 0;
    const nodes: FlowNode[] = [];
    let layoutDir: "TB" | "LR" = "TB";
    const classRe = /^(?:abstract\s+class|class|interface|enum)\s+([A-Za-z0-9_\-]+|`[^`]+`)\s*(\{)?/;
    const inlineMemberRe = /^([A-Za-z0-9_\-]+|`[^`]+`)\s*:\s*(.+)/;
    const parentStack: string[] = [];
    const parentMap = new Map<string, string>(); // namespace id -> uid

    while (i < lines.length) {
        const line = lines[i].trim();
        if (!line || line.startsWith("%%")) { i++; continue; }

        const low = line.toLowerCase();
        if (low.startsWith("classdiagram")) { i++; continue; }
        if (low.startsWith("direction")) {
            if (low.includes("lr")) layoutDir = "LR";
            if (low.includes("tb")) layoutDir = "TB";
            i++;
            continue;
        }

        // Namespace support
        const namespaceMatch = line.match(/^namespace\s+([A-Za-z0-9_]+|`[^`]+`)\s*\{/i);
        if (namespaceMatch) {
            const label = decodeMermaid(namespaceMatch[1].replace(/`/g, ""));
            const uid = nanoid(8);
            const parentId = parentStack.length > 0 ? parentMap.get(parentStack[parentStack.length - 1]) : undefined;
            parentMap.set(namespaceMatch[1], uid);

            // Create package node
            nodes.push(mkNode("package", 0, 0, { label }, 300, 300, parentId, uid));
            parentStack.push(namespaceMatch[1]);
            i++;
            continue;
        }
        if (line === "}" && parentStack.length > 0) {
            parentStack.pop();
            i++;
            continue;
        }

        if (low.startsWith("note")) {
            i++;
            continue;
        }

        const cd = line.match(classRe);
        if (cd) {
            const id = cd[1];
            const isInterface = /^interface\b/.test(line);
            const isAbstract = /^abstract\s+class\b/.test(line);
            const isEnum = /^enum\b/.test(line);
            const c = ensure(id, id.replace(/`/g, ""));
            c.parentId = parentStack.length > 0 ? parentMap.get(parentStack[parentStack.length - 1]) : undefined;

            if (isInterface) {
                c.stereotype = "«interface»";
            } else if (isAbstract) {
                c.stereotype = "«abstract»";
            } else if (isEnum) {
                c.stereotype = "«enumeration»";
            }
            if (cd[2]) {
                // block members until closing brace
                i++;
                let hasStereotype = false;
                while (i < lines.length && lines[i].trim() !== "}") {
                    const memberLine = lines[i].trim();
                    const memberLow = memberLine.toLowerCase();
                    if (memberLine && !memberLine.startsWith("%%") && !memberLow.startsWith("note")) {
                        // Check for stereotype inside class block like <<Entity>>
                        if (!hasStereotype && /^<<.*>>$/.test(memberLine)) {
                            let stereo = memberLine;
                            // Convert <<...>> to «...»
                            stereo = stereo.replace(/<</g, "«").replace(/>>/g, "»");
                            c.stereotype = stereo;
                            hasStereotype = true;
                        } else {
                            pushMember(c, memberLine);
                        }
                    }
                    i++;
                }
            }
        } else {
            const mm = line.match(inlineMemberRe);
            if (mm) {
                const target = ensure(mm[1]);
                pushMember(target, mm[2].trim());
            }
        }
        i++;
    }

    // Pass 2: relationships (also implicit class creation).
    const rels: {
        from: string;
        to: string;
        opts: Parameters<typeof mkEdge>[2];
    }[] = [];
    for (const ln of lines) {
        const r = parseRelLine(ln);
        if (r) {
            ensure(r.from);
            ensure(r.to);
            rels.push({ from: r.from, to: r.to, opts: r.opts });
        }
    }

    // Build nodes + edges.
    const idMap = new Map<string, string>();
    const ids = [...classes.keys()];

    // Estimate sizes for Dagre
    const nodeSizes = new Map<string, { width: number; height: number }>();
    for (const mid of ids) {
        const c = classes.get(mid)!;
        const { w, h } = clsSize(c.label, c.attrs, c.methods, c.stereotype);
        nodeSizes.set(mid, { width: w, height: h });
    }

    const pos = layeredLayout(
        ids,
        rels.map((r) => ({ source: r.from, target: r.to, label: r.opts.label })),
        layoutDir,
        nodeSizes
    );

    const clsNodes: FlowNode[] = [];
    for (const mid of ids) {
        const c = classes.get(mid)!;
        const sz = nodeSizes.get(mid)!;
        const p = pos.get(mid) ?? { x: 0, y: 0 };
        const uid = nanoid(8);
        idMap.set(mid, uid);
        clsNodes.push(
            mkNode(
                "cls",
                p.x - sz.width / 2, // Dagre returns center coordinates
                p.y - sz.height / 2,
                {
                    label: c.label,
                    stereotype: c.stereotype,
                    attributes: c.attrs.join("\n"),
                    methods: c.methods.join("\n"),
                },
                sz.width,
                sz.height,
                c.parentId,
                uid
            )
        );
    }

    const edges: FlowEdge[] = rels
        .map((r) => {
            const s = idMap.get(r.from);
            const t = idMap.get(r.to);
            if (!s || !t || s === t) return null;
            return mkEdge(s, t, r.opts);
        })
        .filter(Boolean) as FlowEdge[];

    const nodesOut = finalizeLayout([...nodes, ...clsNodes], edges);
    return { nodes: nodesOut, edges, type: "class", preLayouted: true };
}

function pushMember(c: { attrs: string[]; methods: string[] }, raw: string) {
    let line = raw.trim();
    if (!line) return;

    // Skip stereotype lines (e.g., <<Interface>>, <<Entity>>)
    if (/^<<.*>>$/.test(line)) {
        return;
    }

    // Handle {static}, {abstract}, {readonly} modifiers
    if (line.includes("{static}")) {
        line = line.replace("{static}", "").trim();
        line = "static " + line;
    }
    if (line.includes("{abstract}")) {
        line = line.replace("{abstract}", "").trim();
        line = "abstract " + line;
    }
    if (line.includes("{readonly}")) {
        line = line.replace("{readonly}", "").trim();
        line = "readonly " + line;
    }

    // Handle Mermaid generics: List~User~ -> List<User>
    line = line.replace(/~([^~]+)~/g, "<$1>");

    // Normalize visibility prefix spacing: "+name" -> "+ name"
    line = line.replace(/^([+\-#~])\s*/, "$1 ");

    // Handle methods (with parentheses) or attributes
    // Improved method detection: should have parentheses, may have return type
    if (/\(.*\)/.test(line)) {
        c.methods.push(line);
    } else {
        c.attrs.push(line);
    }
}

/* Parse a relationship line into from/to/edge-opts.
   Handles mermaid & plantuml arrow tokens.
   Supports multiplicity: ClassA "1" *-- "many" ClassB */
function parseRelLine(line: string):
    | { from: string; to: string; opts: RelOpts }
    | null {
    // Enhanced multiplicity regex: supports "1", "0..*", 1..n, etc. with quotes and spaces
    // Relaxed ID regex: supports letters, digits, underscores, hyphens, dots, and backtick-quoted
    const idRe = '[A-Za-z0-9_\\-](?:[A-Za-z0-9_\\-.]*[A-Za-z0-9_\\-])?|[A-Za-z0-9_\\-]|`[^`]+`';
    const m = line.match(
        new RegExp(`^\\s*(${idRe})\\s*(?:"([^"]+)"|([^\\s\\-\\.\\*o<>]+))?\\s*(<\\|--|--\\|>|\\.\\.\\|>|<\\|\\.\\.|\\*--|--\\*|o--|--o|-->|<--|\\.\\.>|<\\.\\.|---|--|<==|==>)\\s*(?:"([^"]+)"|([^\\s:]+))?\\s+(${idRe})(?:\\s*:\\s*(.*))?$`)
    );
    if (!m) return null;
    const [, leftId, leftM1, leftM2, token, rightM1, rightM2, rightId, labelRaw] = m;
    const leftMulti = leftM1 || leftM2;
    const rightMulti = rightM1 || rightM2;
    const label = decodeMermaid(labelRaw?.trim() ?? "");

    let leftFirst = true;
    let opts: Parameters<typeof mkEdge>[2] = {};
    switch (token) {
        case "<|--":
        case "--|>":
            opts = { marker: MARK.triangle };
            leftFirst = token === "--|>";
            break;
        case "..|>":
        case "<|..":
            opts = { marker: MARK.triangle, dashed: true };
            leftFirst = token === "..|>";
            break;
        case "<--":
        case "-->":
            opts = { marker: MARK.openArrow };
            leftFirst = token === "-->";
            break;
        case "<..":
        case "..>":
            opts = { marker: MARK.openArrow, dashed: true };
            leftFirst = token === "..>";
            break;
        case "--*":
        case "*--":
            opts = { markerStart: MARK.diamondFilledStart };
            leftFirst = token === "*--";
            break;
        case "--o":
        case "o--":
            opts = { markerStart: MARK.diamondOpenStart };
            leftFirst = token === "o--";
            break;
        case "==>":
        case "<==":
            opts = {};
            leftFirst = token === "==>";
            break;
        case "---":
        case "--":
            opts = { ambiguous: true };
            leftFirst = true;
            break;
        default:
            opts = { ambiguous: true };
            leftFirst = true;
    }

    // Multiplicities live in dedicated fields; the label keeps only the name.
    if (label) opts.label = label;
    const srcMulti = leftFirst ? leftMulti : rightMulti;
    const tgtMulti = leftFirst ? rightMulti : leftMulti;
    if (srcMulti) opts.multiplicitySource = srcMulti;
    if (tgtMulti) opts.multiplicityTarget = tgtMulti;
    const from = leftFirst ? leftId : rightId;
    const to = leftFirst ? rightId : leftId;

    if (opts.ambiguous) {
        opts.fromName = from;
        opts.toName = to;
    }
    return { from, to, opts };
}

/* Modifier options for a multiple-select question (bound to one edge). */
const MODIFIER_OPTIONS: QuestionOption[] = [
    { label: "Bidirectional" },
    { label: "Optional (0..1)" },
    { label: "Lazy-loaded" },
    { label: "Derived" },
];

/* Generate HITL questions from ambiguous edges. */
function buildQuestions(result: ParseResult): ImportQuestion[] {
    if (result.type !== "class" && result.type !== "component") return [];
    const seen = new Set<string>();
    const qs: ImportQuestion[] = [];
    let addedMulti = false;
    for (const e of result.edges) {
        const d = e.data as { ambiguous?: boolean; fromName?: string; toName?: string };
        if (!d?.ambiguous) continue;
        const a = d.fromName ?? e.source;
        const b = d.toName ?? e.target;
        const key = `${a}->${b}`;
        if (seen.has(key)) continue;
        seen.add(key);
        qs.push({
            id: nanoid(6),
            edgeId: e.id,
            prompt: `What is the relationship from "${a}" to "${b}"?`,
            detail: "plain line — no arrowhead detected",
            multiple: false,
            options: RELATION_OPTIONS.map((o) => ({ ...o })),
        });
        if (!addedMulti) {
            addedMulti = true;
            qs.push({
                id: nanoid(6),
                edgeId: e.id,
                prompt: `Which modifiers apply to "${a} → ${b}"?`,
                detail: "select any that apply — optional",
                multiple: true,
                options: MODIFIER_OPTIONS.map((o) => ({ ...o })),
            });
        }
        if (qs.length >= 9) break;
    }
    return qs;
}

/** Patch one edge with one answer. Returns the updated edge. */
function applyOne(edge: FlowEdge, ans: Answer): FlowEdge {
    const data: FlowEdgeData = { ...(edge.data as FlowEdgeData) };
    delete (data as any).ambiguous;
    let label = typeof edge.label === "string" ? edge.label : "";
    if (ans.kind === "option") {
        const o = ans.option;
        data.marker = o.marker ?? "";
        data.markerStart = o.markerStart ?? "";
        data.dashed = !!o.dashed;
        if (o.label && !label) label = o.label;
    } else if (ans.kind === "multiple") {
        const labels = ans.options.map((o) => o.label).filter(Boolean);
        if (ans.other?.trim()) labels.push(ans.other.trim());
        if (labels.length) label = [label, ...labels].filter(Boolean).join(", ");
    } else {
        const t = ans.text.toLowerCase();
        data.marker = "";
        data.markerStart = "";
        data.dashed = false;
        if (/inherit|extends|general|is-a/.test(t)) data.marker = MARK.triangle;
        else if (/compos/.test(t)) data.markerStart = MARK.diamondFilledStart;
        else if (/aggreg/.test(t)) data.markerStart = MARK.diamondOpenStart;
        else if (/depend/.test(t)) {
            data.marker = MARK.openArrow;
            data.dashed = true;
        } else if (/associat|uses|has/.test(t)) data.marker = MARK.openArrow;
        label = ans.text;
    }
    return { ...edge, label, data };
}

/**
 * Apply human-in-the-loop answers to a parse result.
 */
export function applyAnswers(
    result: ParseResult,
    answers: Record<string, Answer>
): ParseResult {
    const qs = result.questions ?? [];

    const edges = result.edges.map((e) => {
        const linked = qs.filter((q) => q.edgeId === e.id);
        if (!linked.length) return e;
        let next = e;
        for (const q of linked) {
            const ans = answers[q.id];
            if (ans) next = applyOne(next, ans);
        }
        return next;
    });

    return { ...result, edges };
}

/* ============================================================
   FLOWCHART — FIXED
   ============================================================

   Mermaid flowchart edge types supported:
     -->   arrow            ---   line
     -.->  dotted arrow     -.-   dotted line
     ==>   thick arrow      ===   thick line
     --o   circle end       --x   x end
     o--o  circle both      x--x  x both
     <-->  bidirectional    <->   bidirectional
     <--   reverse          <-    reverse simple
*/

// Edge regex — longest tokens first to avoid partial matches
const FLOW_EDGE_RE =
    /--+>+|<\.\.+|--+x|--+o|o--+|x--+|<--+>+|<--+|<\?--+|\?--+>+|<\.+>+|<\.->+|-\.->+|-\.+->+|-\.->+|==+>+|===+|---+|-+>+|-\.-|\.\.+>+|\.\.+/;

/**
 * Parse edge token and return style information (swap, marker, markerStart, dashed)
 *
 * Supported Mermaid flowchart edge decorations:
 *   -->   arrow            ---   line
 *   -.->  dotted arrow     -.-   dotted line
 *   ==>   thick arrow      ===   thick line
 *   --o   circle end       --x   x end
 *   o--   circle start     x--   x start
 *   o--o  circle both      x--x  x both
 *   <-->  bidirectional
 *   <--   reverse
 */
function parseEdgeStyle(token: string): {
    swap: boolean;
    marker?: string;
    markerStart?: string;
    dashed?: boolean;
} {
    let marker: string | undefined = MARK.arrow;
    let markerStart: string | undefined;
    let dashed = false;
    let swap = false;
    const t = token;

    // Direction: arrows point from source to target by default
    if (t.startsWith("<")) {
        swap = true;
        marker = MARK.arrow;
    }

    // Circle end (aggregation-like): --o or o--o
    if (t.endsWith("o") || t.endsWith("o--")) {
        marker = undefined; // no arrow, use circle
    }
    if (t.startsWith("o")) {
        markerStart = MARK.diamondOpenStart;
    }
    if (t.endsWith("o") && !t.includes("o--o")) {
        // circle at target end only — store as markerStart concept but on end
        // We default to openArrow for visual clarity; UML aggregation uses diamond
        marker = undefined;
    }
    // o both ends
    if (t.includes("o--o")) {
        marker = undefined;
        markerStart = MARK.diamondOpenStart;
    }

    // X end
    if (t.endsWith("x")) {
        marker = undefined; // cross not in marker defs — skip arrow
    }
    if (t.startsWith("x")) {
        markerStart = undefined;
    }

    // Check for dashed (dots)
    if (t.includes(".") || t.includes("-.")) {
        dashed = true;
    }

    // Check for just line (no arrow, no special end)
    if (!t.includes(">") && !t.includes("<") && !t.includes("o") && !t.includes("x")) {
        marker = undefined;
    }

    // Bidirectional
    if (t.includes("<") && t.includes(">")) {
        marker = MARK.arrow;
    }

    return { swap, marker, markerStart, dashed };
}

function parseFlowchart(lines: string[]): ParseResult {
    const defs = new Map<string, { label: string; type: string; stereotype?: string; parentId?: string }>();
    const rawEdges: {
        from: string;
        to: string;
        label?: string;
        marker?: string;
        markerStart?: string;
        dashed?: boolean;
    }[] = [];

    const parentStack: string[] = [];
    const parentMap = new Map<string, string>(); // id -> uid

    // 1. Detect direction from header (flowchart TD, flowchart LR, etc.)
    let layoutDir: "TB" | "LR" = "TB";
    const headerLine = lines.find(l => /^(flowchart|graph)\b/i.test(l))?.toLowerCase() || "";
    if (headerLine.includes("lr") || headerLine.includes("rl")) layoutDir = "LR";
    else if (headerLine.includes("td") || headerLine.includes("tb") || headerLine.includes("bt")) layoutDir = "TB";

    for (const ln of lines) {
        let trimmed = ln.trim();
        if (!trimmed) continue;

        // ── Skip header / directive lines ──
        const low = trimmed.toLowerCase();
        if (/^(flowchart(-elk|-beta)?|graph)\b/i.test(trimmed)) continue;
        if (low.startsWith("direction")) continue;
        if (low.startsWith("style")) continue;
        if (low.startsWith("classdef")) continue;
        if (low.startsWith("linkstyle")) continue;
        if (low.startsWith("click")) continue;
        if (low.startsWith("accTitle") || low.startsWith("accDescr")) continue;

        // ── Subgraph ──
        const subgraphMatch = trimmed.match(/^subgraph\s+([A-Za-z0-9_]+)(?:\s*\[(.+)\])?/i);
        if (subgraphMatch) {
            const id = subgraphMatch[1];
            const label = decodeMermaid(subgraphMatch[2] || id);
            const uid = nanoid(8);
            parentMap.set(id, uid);
            const parentId = parentStack.length > 0 ? parentMap.get(parentStack[parentStack.length - 1]) : undefined;
            defs.set(id, { label, type: "package", parentId });
            parentStack.push(id);
            continue;
        }
        if (low === "end") {
            parentStack.pop();
            continue;
        }

        // Explicitly ignore style/directive lines even if they were not caught by parseMermaid
        if (low.startsWith("style") || low.startsWith("classdef") || low.startsWith("linkstyle") || low.startsWith("click")) {
            continue;
        }

        const currentParentId = parentStack.length > 0 ? parentMap.get(parentStack[parentStack.length - 1]) : undefined;

        // ── Pre-process: Normalize edge labels from A -- label --> B to A -->|label| B ──
        trimmed = trimmed.replace(/--\s+([^->]+)\s+--+>/g, "-->|$1|");
        trimmed = trimmed.replace(/-\.\s+([^.>]+)\s+\.+->/g, "-.->|$1|");
        trimmed = trimmed.replace(/==\s+([^=>]+)\s+==+>/g, "==>|$1|");

        // ── No edge token → standalone node definition ──
        if (!FLOW_EDGE_RE.test(trimmed)) {
            const ref = parseRef(trimmed) as any;
            if (ref) {
                // Only set if not already defined OR if this ref provides a better label than just the ID
                const existing = defs.get(ref.id);
                if (!existing || (ref.label !== ref.id)) {
                    defs.set(ref.id, {
                        label: ref.label,
                        type: ref.type,
                        stereotype: ref.stereotype,
                        parentId: existing?.parentId ?? currentParentId
                    });
                }
            }
            continue;
        }

        // ── Edge line ──
        let work = trimmed;

        // --- Extract pipe labels: |text| ---
        const pipeLabels: string[] = [];
        work = work.replace(/\|([^|]*)\|/g, (_m, text) => {
            pipeLabels.push(decodeMermaid(text.trim()));
            return "";
        });

        // --- Find all edge tokens, filtering out false positives inside [...] ---
        const edgeTokens: { token: string; pos: number }[] = [];
        const re = new RegExp(FLOW_EDGE_RE.source, "g");
        let em: RegExpExecArray | null;
        while ((em = re.exec(work)) !== null) {
            // Skip false matches where edge token is inside brackets [====]
            // because FLOW_EDGE_RE mistakenly matches ==== inside [====]
            const before = work.slice(0, em.index);
            const after = work.slice(em.index + em[0].length);
            const openBrackets = (before.match(/\[/g) || []).length;
            const closeBrackets = (before.match(/\]/g) || []).length;
            if (openBrackets > closeBrackets) continue; // inside brackets → skip
            edgeTokens.push({ token: em[0], pos: em.index });
        }

        if (edgeTokens.length === 0) {
            // Standalone node definition already handled by the logic above
            continue;
        }

        const nodeParts: string[] = [];
        let cursor = 0;
        for (const et of edgeTokens) {
            nodeParts.push(work.slice(cursor, et.pos).trim());
            cursor = et.pos + et.token.length;
        }
        nodeParts.push(work.slice(cursor).trim());

        const validParts = nodeParts.filter(Boolean);
        const allLabels = pipeLabels; // only use pipe labels since we normalized -- label -->

        for (let k = 0; k < edgeTokens.length; k++) {
            const fromPart = validParts[k];
            const toPart = validParts[k + 1];
            if (!fromPart || !toPart) continue;

            const a = parseRef(fromPart) as any;
            const b = parseRef(toPart) as any;
            if (!a || !b) continue;

            if (!defs.has(a.id)) defs.set(a.id, { label: a.label, type: a.type, stereotype: a.stereotype, parentId: currentParentId });
            if (!defs.has(b.id)) defs.set(b.id, { label: b.label, type: b.type, stereotype: b.stereotype, parentId: currentParentId });

            const style = parseEdgeStyle(edgeTokens[k].token);
            const from = style.swap ? b.id : a.id;
            const to = style.swap ? a.id : b.id;

            // Use Case semantics detection in Flowchart
            let finalMarker = style.marker;
            let finalDashed = style.dashed;
            let finalLabel = allLabels[k] ?? "";

            const fromDef = defs.get(from);
            const toDef = defs.get(to);

            if ((fromDef?.type === "actor" && toDef?.type === "usecase") ||
                (fromDef?.type === "usecase" && toDef?.type === "actor")) {
                // Actor <-> UseCase association: No arrow in UML
                finalMarker = undefined;
            }

            // Handle special UML labels in Flowchart
            const lowLabel = finalLabel.toLowerCase();
            if (lowLabel.includes("include") || lowLabel.includes("extend")) {
                finalMarker = MARK.openArrow;
                finalDashed = true;
                finalLabel = lowLabel.includes("include") ? "«include»" : "«extend»";
            } else if (lowLabel.includes("generalization")) {
                finalMarker = MARK.triangle;
                finalDashed = false;
                finalLabel = "";
            }

            rawEdges.push({
                from,
                to,
                label: finalLabel,
                marker: finalMarker,
                markerStart: style.markerStart,
                dashed: finalDashed,
            });
        }
    }

    // ── Layout ──
    const ids = [...defs.keys()];
    // Only layout non-package nodes with dagre to get initial positions
    const layoutIds = ids.filter(id => defs.get(id)!.type !== "package");
    const layoutEdges = rawEdges.filter(e =>
        defs.get(e.from)!.type !== "package" && defs.get(e.to)!.type !== "package"
    );

    const nodeSizes = new Map<string, { width: number; height: number }>();
    layoutIds.forEach(id => {
        const d = defs.get(id)!;
        const [w, h] = DEFAULT_SIZES[d.type] ?? [150, 54];
        nodeSizes.set(id, { width: w, height: h });
    });

    const posMap = layeredLayout(
        layoutIds,
        layoutEdges.map((e) => ({ source: e.from, target: e.to, label: e.label })),
        layoutDir,
        nodeSizes
    );

    // Auto-detect if this flowchart represents a component diagram instead of an activity diagram
    let finalType: DiagramType = "activity";
    const hasCompIndicators = [...defs.values()].some(d => {
        const isDb = d.stereotype?.includes("database");
        const isComp = d.stereotype?.includes("subprocess") || d.stereotype?.includes("component");
        const hasBrackets = d.label.includes("[") && d.label.includes("]");
        return isDb || isComp || hasBrackets;
    });
    if (hasCompIndicators) {
        finalType = "component";
    }

    const nodeMap = new Map<string, string>(); // id -> uid
    const nodes: FlowNode[] = ids.map((id) => {
        const d = defs.get(id)!;
        const isPkg = d.type === "package";
        // For packages, we'll let finalizeLayout set the position later
        const p = posMap.get(id) ?? { x: 0, y: 0 };

        let nodeType = d.type;
        if (finalType === "component" && nodeType === "action") {
            nodeType = "component";
        }

        const [w, h] = DEFAULT_SIZES[nodeType] ?? (isPkg ? [300, 300] : [150, 54]);
        const uid = parentMap.get(id) || nanoid(8);
        nodeMap.set(id, uid);
        return mkNode(nodeType, p.x - w / 2, p.y - h / 2, { label: d.label, stereotype: d.stereotype }, w, h, d.parentId, uid);
    });

    // CRITICAL: Import flow must also use finalizeLayout to wrap packages correctly
    const finalNodes = finalizeLayout(nodes);

    const edges: FlowEdge[] = rawEdges.map((e) => {
        const s = nodeMap.get(e.from);
        const t = nodeMap.get(e.to);
        if (!s || !t || s === t) return null;
        return mkEdge(s, t, {
            marker: e.marker,
            markerStart: e.markerStart,
            dashed: e.dashed,
            label: e.label,
            type: (defs.get(e.from)?.type === "usecase" || defs.get(e.to)?.type === "usecase") ? "bezier" : "smoothstep"
        });
    })
        .filter(Boolean) as FlowEdge[];

    const nodesOut = finalizeLayout(finalNodes, edges);
    return { nodes: nodesOut, edges, type: finalType, preLayouted: true, direction: layoutDir };
}

/* ============================================================
   parseRef — FIXED: all Mermaid node shapes
   ============================================================ */
function parseRef(ref: string):
    | { id: string; label: string; type: string; stereotype?: string; parentId?: string }
    | null {
    const s = ref.trim();
    if (!s) return null;
    let m: RegExpMatchArray | null;

    const getLabelType = (label: string, defaultType: string) => {
        const decoded = decodeMermaid(label).trim();
        if (!decoded) return { label: "", type: defaultType };
        if (decoded.includes("👤") || decoded.toLowerCase().includes("actor")) {
            return { label: decoded, type: "actor" };
        }
        // Fork/Join detection
        if (/^={2,}$/.test(decoded)) {
            return { label: "", type: "fork" };
        }
        return { label: decoded, type: defaultType };
    };

    // Final node: A(((text))) or A((()))
    if ((m = s.match(/^([A-Za-z0-9_]+)\s*\(\(\(\s*(.*)\s*\)\)\)$/))) {
        const lt = getLabelType(m[2], "final");
        return { id: m[1], ...lt };
    }

    // Start node / Circle: A((text)) or A(())
    if ((m = s.match(/^([A-Za-z0-9_]+)\s*\(\(\s*(.*)\s*\)\)$/))) {
        const lt = getLabelType(m[2], m[2].trim() === "" ? "start" : "action");
        return { id: m[1], ...lt };
    }

    // Database / cylinder:  A[(text)]
    if ((m = s.match(/^([A-Za-z0-9_]+)\[\((.+)\)\]$/))) {
        const lt = getLabelType(m[2], "action");
        return { id: m[1], label: lt.label, type: lt.type, stereotype: "«database»" };
    }

    // Stadium / Use Case:  A([text])
    if ((m = s.match(/^([A-Za-z0-9_]+)\(\[(.+)\]\)$/))) {
        const lt = getLabelType(m[2], "usecase");
        // In activity diagram context, stadium is often just a rounded action
        return { id: m[1], ...lt };
    }

    // Subroutine:  A[[text]]
    if ((m = s.match(/^([A-Za-z0-9_]+)\[\[(.+)\]\]$/))) {
        const lt = getLabelType(m[2], "action");
        return { id: m[1], label: lt.label, type: lt.type, stereotype: "«subprocess»" };
    }

    // Hexagon:  A{{text}}
    if ((m = s.match(/^([A-Za-z0-9_]+)\{\{(.+)\}\}$/))) {
        const lt = getLabelType(m[2], "action");
        return { id: m[1], ...lt };
    }

    // Diamond / decision:  A{text}
    if ((m = s.match(/^([A-Za-z0-9_]+)\{(.+)\}$/))) {
        const lt = getLabelType(m[2], "decision");
        return { id: m[1], ...lt };
    }

    // Parallelogram:  A[/text/]
    if ((m = s.match(/^([A-Za-z0-9_]+)\[\/(.+)\/\]$/))) {
        const lt = getLabelType(m[2], "action");
        return { id: m[1], label: lt.label, type: lt.type, stereotype: "«input/output»" };
    }

    // Parallelogram alt:  A[\text\]
    if ((m = s.match(/^([A-Za-z0-9_]+)\[\\(.+)\\\]$/))) {
        const lt = getLabelType(m[2], "action");
        return { id: m[1], label: lt.label, type: lt.type, stereotype: "«input/output»" };
    }

    // Trapezoid:  A[/text\]
    if ((m = s.match(/^([A-Za-z0-9_]+)\[\/(.+)\\\]$/))) {
        const lt = getLabelType(m[2], "action");
        return { id: m[1], ...lt };
    }

    // Trapezoid alt:  A[\text/]
    if ((m = s.match(/^([A-Za-z0-9_]+)\[\\(.+)\/\]$/))) {
        const lt = getLabelType(m[2], "action");
        return { id: m[1], ...lt };
    }

    // Tag / flag:  A>text]
    if ((m = s.match(/^([A-Za-z0-9_]+)>(.+)\]$/))) {
        const lt = getLabelType(m[2], "action");
        return { id: m[1], ...lt };
    }

    // Rectangle with potential quotes/brackets: A["text"] or A[text]
    if ((m = s.match(/^([A-Za-z0-9_]+)\[(?:"(.*)"|(.*))\]$/))) {
        const label = m[2] !== undefined ? m[2] : m[3];
        const lt = getLabelType(label, "action");
        return { id: m[1], ...lt };
    }

    // Rounded:  A(text)
    if ((m = s.match(/^([A-Za-z0-9_]+)\((.+)\)$/))) {
        const lt = getLabelType(m[2], "action");
        return { id: m[1], ...lt };
    }

    // Bare ID:  A
    if ((m = s.match(/^([A-Za-z0-9_]+)$/)))
        return { id: m[1], label: m[1], type: "action" };

    return null;
}

/* ---- state (with composite state support) ---- */
function parseState(lines: string[]): ParseResult {
    const defs = new Map<string, string>();
    const rawEdges: { from: string; to: string; label?: string }[] = [];
    const stateStack: string[] = []; // for composite states: state "Label" { ... }
    const packages: FlowNode[] = [];

    for (let i = 0; i < lines.length; i++) {
        const clean = lines[i].trim();
        if (!clean) continue;

        if (/^statediagram(-v2)?\b/i.test(clean)) continue;

        // Composite state: state "Label" as id { ... }
        const compositeMatch = clean.match(/^state\s+(?:"([^"]+)"|([A-Za-z0-9_]+))(?:\\s+as\\s+([A-Za-z0-9_]+))?\s*\{/);
        if (compositeMatch) {
            const label = compositeMatch[1] || compositeMatch[2] || "State";
            const id = compositeMatch[3] || compositeMatch[2] || `state_${i}`;
            defs.set(id, label);
            stateStack.push(id);
            continue;
        }
        if (clean === "}" && stateStack.length > 0) {
            stateStack.pop();
            continue;
        }

        // Start/end to state: [*] --> State
        const startMatch = clean.match(/^\[\*\]\s*-->\s*(.+?)(?:\s*:\s*(.+))?$/);
        if (startMatch) {
            const to = startMatch[1].trim();
            const label = startMatch[2]?.trim();
            defs.set("__start__", "");
            defs.set(to, to);
            rawEdges.push({ from: "__start__", to, label });
            continue;
        }

        // State to end: State --> [*]
        const endMatch = clean.match(/^(.+?)\s*-->\s*\[\*\](?:\s*:\s*(.+))?$/);
        if (endMatch) {
            const from = endMatch[1].trim();
            const label = endMatch[2]?.trim();
            defs.set(from, from);
            defs.set("__end__", "");
            rawEdges.push({ from, to: "__end__", label });
            continue;
        }

        // State to state: State1 --> State2 : label
        const transitionMatch = clean.match(/^(.+?)\s*-->\s*(.+?)(?:\s*:\s*(.+))?$/);
        if (transitionMatch) {
            const from = transitionMatch[1].trim();
            const to = transitionMatch[2].trim();
            const label = transitionMatch[3]?.trim();
            defs.set(from, from);
            defs.set(to, to);
            rawEdges.push({ from, to, label });
            continue;
        }

        // State definition with description: State : Description
        const stateDefMatch = clean.match(/^([^\s:]+)\s*:\s*(.+)$/);
        if (stateDefMatch) {
            defs.set(stateDefMatch[1].trim(), stateDefMatch[2].trim());
            continue;
        }

        // Simple state definition: just state name
        if (!clean.includes("-->") && !clean.includes("[*]") && !clean.startsWith("state ")) {
            // Don't register "end" as a state
            if (clean !== "end") defs.set(clean, clean);
        }
    }

    // Create package nodes for composite states
    const pkgMap = new Map<string, string>();
    if (stateStack.length > 0) {
        for (const sid of stateStack) {
            const uid = nanoid(8);
            pkgMap.set(sid, uid);
            packages.push(mkNode("package", 0, 0, { label: defs.get(sid) || sid }, 300, 200, undefined, uid));
        }
    }

    const ids = [...defs.keys()];
    const nodeSizes = new Map<string, { width: number; height: number }>();
    ids.forEach(id => {
        if (id === "__start__" || id === "__end__") nodeSizes.set(id, { width: 40, height: 40 });
        else nodeSizes.set(id, { width: 150, height: 56 });
    });

    const pos = layeredLayout(
        ids,
        rawEdges.map((e) => ({ source: e.from, target: e.to })),
        "TB",
        nodeSizes
    );
    const nodes: FlowNode[] = ids.map((id) => {
        const p = pos.get(id) ?? { x: 0, y: 0 };
        if (id === "__start__")
            return mkNode("start", p.x + 20 - 19, p.y - 19, { label: "" }, 38, 38);
        if (id === "__end__")
            return mkNode("final", p.x + 20 - 20, p.y - 20, { label: "" }, 40, 40);
        const parentId = pkgMap.get(id);
        return mkNode("action", p.x - 75, p.y - 28, { label: defs.get(id) ?? id }, 150, 56, parentId);
    });
    const idToUid = new Map(nodes.map((n, i) => [ids[i], n.id]));
    const edges: FlowEdge[] = rawEdges
        .map((e) => {
            const s = idToUid.get(e.from);
            const t = idToUid.get(e.to);
            if (!s || !t) return null;
            return mkEdge(s, t, { marker: MARK.arrow, label: e.label });
        })
        .filter(Boolean) as FlowEdge[];

    const nodesOut = finalizeLayout([...nodes, ...packages], edges);
    return { nodes: nodesOut, edges, type: "state", preLayouted: true };
}

/* ---------------- usecase (Mermaid) ---------------- */
function parseMermaidUseCase(lines: string[]): ParseResult {
    const nodes: FlowNode[] = [];
    const rawEdges: {
        from: string;
        to: string;
        label?: string;
        marker?: string;
        markerStart?: string;
        dashed?: boolean;
        type?: string;
    }[] = [];
    const nodeMap = new Map<string, string>(); // id -> uid
    const parentStack: string[] = []; // for subgraphs (system boundaries)

    // Helper to ensure node exists and get its uid
    const ensureNode = (id: string, label: string, type: string, parentId?: string) => {
        if (!nodeMap.has(id)) {
            const uid = nanoid(8);
            nodeMap.set(id, uid);
            let w = 170, h = 76;
            if (type === "actor") { w = 76; h = 124; }
            else if (type === "package") { w = 300; h = 300; }
            else if (type === "note") { w = 150; h = 60; }
            nodes.push(mkNode(type, 0, 0, { label }, w, h, parentId, uid));
        }
        return nodeMap.get(id)!;
    };

    for (let i = 0; i < lines.length; i++) {
        const ln = lines[i].trim();
        if (!ln || ln.startsWith("%%")) continue;

        // Subgraph / System boundary
        const subgraphMatch = ln.match(/^(?:subgraph|rect)\s+(?:"([^"]+)"|([A-Za-z0-9_]+))(?:\s+as\s+([A-Za-z0-9_]+))?/i);
        if (subgraphMatch) {
            const label = subgraphMatch[1] || subgraphMatch[2];
            const id = subgraphMatch[3] || subgraphMatch[2] || label;
            const parentId = parentStack.length > 0 ? nodeMap.get(parentStack[parentStack.length - 1]) : undefined;
            ensureNode(id, label, "package", parentId);
            parentStack.push(id);
            continue;
        }
        if (ln.toLowerCase() === "end") {
            parentStack.pop();
            continue;
        }

        // Actor definition
        const actorMatch = ln.match(/^actor\s+(?:"([^"]+)"|([A-Za-z0-9_]+))(?:\s+as\s+([A-Za-z0-9_]+))?/i);
        if (actorMatch) {
            const label = actorMatch[1] || actorMatch[2];
            const id = actorMatch[3] || actorMatch[2];
            const parentId = parentStack.length > 0 ? nodeMap.get(parentStack[parentStack.length - 1]) : undefined;
            ensureNode(id, label, "actor", parentId);
            continue;
        }

        // Use case definition
        const usecaseMatch = ln.match(/^usecase\s+(?:"([^"]+)"|\(([^)]+)\))(?:\s+as\s+([A-Za-z0-9_]+))?/i);
        if (usecaseMatch) {
            const label = usecaseMatch[1] || usecaseMatch[2];
            const id = usecaseMatch[3] || label.replace(/\s+/g, "_");
            const parentId = parentStack.length > 0 ? nodeMap.get(parentStack[parentStack.length - 1]) : undefined;
            ensureNode(id, label, "usecase", parentId);
            continue;
        }

        // Simple use case: (Label)
        const simpleUsecaseMatch = ln.match(/^\(([^)]+)\)(?:\s+as\s+([A-Za-z0-9_]+))?$/);
        if (simpleUsecaseMatch) {
            const label = simpleUsecaseMatch[1];
            const id = simpleUsecaseMatch[2] || label.replace(/\s+/g, "_");
            const parentId = parentStack.length > 0 ? nodeMap.get(parentStack[parentStack.length - 1]) : undefined;
            ensureNode(id, label, "usecase", parentId);
            continue;
        }

        // Relationships
        // 1. Include/Extend: UC1 -- UC2 : <<include>>
        const incExtMatch = ln.match(/^([A-Za-z0-9_]+)\s*(?:--|-->|->)\s*([A-Za-z0-9_]+)\s*:\s*(<<include>>|<<extend>>)/i);
        if (incExtMatch) {
            const fromId = incExtMatch[1];
            const toId = incExtMatch[2];
            const relType = incExtMatch[3].toLowerCase();
            const label = relType === "<<include>>" ? "«include»" : "«extend»";

            ensureNode(fromId, fromId, nodeMap.has(fromId) ? "usecase" : "actor");
            ensureNode(toId, toId, nodeMap.has(toId) ? "usecase" : "actor");

            rawEdges.push({
                from: fromId,
                to: toId,
                label,
                marker: MARK.openArrow,
                dashed: true,
                type: "bezier"
            });
            continue;
        }

        // 2. Generalization: A <|-- B
        const genMatch = ln.match(/^([A-Za-z0-9_]+)\s*(?:<\|--|--\|>)\s*([A-Za-z0-9_]+)/);
        if (genMatch) {
            let fromId = genMatch[1];
            let toId = genMatch[2];
            if (ln.includes("<|--")) {
                // A <|-- B means B inherits from A. Our edge usually goes from Sub -> Super.
                // But for consistency with other diagrams, let's keep it based on arrow direction.
                [fromId, toId] = [toId, fromId];
            }
            ensureNode(fromId, fromId, nodeMap.has(fromId) ? "usecase" : "actor");
            ensureNode(toId, toId, nodeMap.has(toId) ? "usecase" : "actor");
            rawEdges.push({ from: fromId, to: toId, marker: MARK.triangle, type: "bezier" });
            continue;
        }

        // 3. Plain Association: A --> B
        const assocMatch = ln.match(/^([A-Za-z0-9_]+)\s*(?:-->|--|->)\s*([A-Za-z0-9_]+)(?:\s*:\s*(.+))?$/);
        if (assocMatch) {
            const fromId = assocMatch[1];
            const toId = assocMatch[2];
            const label = assocMatch[3];
            ensureNode(fromId, fromId, nodeMap.has(fromId) ? "usecase" : "actor");
            ensureNode(toId, toId, nodeMap.has(toId) ? "usecase" : "actor");

            // In Use Case diagrams, associations between actors and use cases should NOT have arrows.
            // We ignore the ">" in tokens like "-->" for Use Case associations to follow UML standards.
            rawEdges.push({
                from: fromId,
                to: toId,
                label,
                marker: undefined,
                type: "bezier"
            });
            continue;
        }
    }

    const idToUid = new Map(nodes.map((n) => {
        const entry = [...nodeMap.entries()].find(([, uid]) => uid === n.id);
        return [entry ? entry[0] : n.id, n.id];
    }));

    const edges = rawEdges
        .map((e) => {
            const s = idToUid.get(e.from);
            const t = idToUid.get(e.to);
            if (!s || !t || s === t) return null;
            return mkEdge(s, t, {
                marker: e.marker,
                markerStart: e.markerStart,
                dashed: e.dashed,
                label: e.label,
                type: e.type as FlowEdge["type"]
            });
        })
        .filter(Boolean) as FlowEdge[];

    // Apply layout
    const nonPkgNodes = nodes.filter(n => n.type !== "package");
    const nodeSizes = new Map<string, { width: number; height: number }>();
    nonPkgNodes.forEach(n => {
        nodeSizes.set(n.id, { width: n.width ?? 170, height: n.height ?? 76 });
    });

    const posMap = layeredLayout(
        nonPkgNodes.map(n => n.id),
        edges.map(e => ({ source: e.source, target: e.target })),
        "TB",
        nodeSizes
    );

    for (const n of nonPkgNodes) {
        const p = posMap.get(n.id) ?? { x: 0, y: 0 };
        n.position = { x: p.x - (n.width ?? 0) / 2, y: p.y - (n.height ?? 0) / 2 };
    }

    const nodesOut = finalizeLayout(nodes, edges);
    return { nodes: nodesOut, edges, type: "usecase", preLayouted: true };
}

/* ---------------- component (Mermaid) ---------------- */
function parseMermaidComponent(lines: string[]): ParseResult {
    const nodes: FlowNode[] = [];
    const rawEdges: {
        from: string;
        to: string;
        label?: string;
        marker?: string;
        markerStart?: string;
        dashed?: boolean;
    }[] = [];
    const nodeMap = new Map<string, string>(); // id -> uid
    const parentStack: string[] = []; // for subgraphs

    // Detect direction from lines
    let layoutDir: "TB" | "LR" = "TB";
    const headerLine = lines.find(l => /^(flowchart|graph|componentdiagram)\b/i.test(l))?.toLowerCase() || "";
    if (headerLine.includes("lr") || headerLine.includes("rl")) {
        layoutDir = "LR";
    } else if (headerLine.includes("td") || headerLine.includes("tb") || headerLine.includes("bt")) {
        layoutDir = "TB";
    }

    const dirLine = lines.find(l => /^\s*direction\s+(LR|RL|TD|TB)\b/i.test(l))?.toUpperCase() || "";
    if (dirLine.includes("LR") || dirLine.includes("RL")) {
        layoutDir = "LR";
    } else if (dirLine.includes("TD") || dirLine.includes("TB")) {
        layoutDir = "TB";
    }

    // Helper to ensure node exists
    const ensureNode = (id: string, label: string, type: string, stereo?: string, parentId?: string) => {
        if (!nodeMap.has(id)) {
            const uid = nanoid(8);
            nodeMap.set(id, uid);
            let w = 180, h = 92;
            if (type === "package") { w = 300; h = 300; }
            else if (type === "note") { w = 150; h = 60; }
            nodes.push(mkNode(type, 0, 0, { label, stereotype: stereo }, w, h, parentId, uid));
        }
        return nodeMap.get(id)!;
    };

    for (let i = 0; i < lines.length; i++) {
        const ln = lines[i].trim();
        if (!ln || ln.startsWith("%%")) continue;

        // Subgraph
        const subgraphMatch = ln.match(/^subgraph\s+(?:"([^"]+)"|([A-Za-z0-9_]+))(?:\s+as\s+([A-Za-z0-9_]+))?/i);
        if (subgraphMatch) {
            const label = subgraphMatch[1] || subgraphMatch[2];
            const id = subgraphMatch[3] || subgraphMatch[2] || label;
            const parentId = parentStack.length > 0 ? nodeMap.get(parentStack[parentStack.length - 1]) : undefined;
            ensureNode(id, label, "package", undefined, parentId);
            parentStack.push(id);
            continue;
        }
        if (ln.toLowerCase() === "end") {
            parentStack.pop();
            continue;
        }

        // Component: [Component], [["Component"]] or component "Label" as id
        const componentMatch = ln.match(/^component\s+(?:"([^"]+)"|([A-Za-z0-9_]+))(?:\s+as\s+([A-Za-z0-9_]+))?/i);
        const bracketMatch = ln.match(/^\[\[?([^\]]+)\]?\](?:\s+as\s+([A-Za-z0-9_]+))?$/);
        if (componentMatch || bracketMatch) {
            let label, id;
            if (componentMatch) {
                label = componentMatch[1] || componentMatch[2];
                id = componentMatch[3] || componentMatch[2] || label;
            } else {
                label = bracketMatch![1];
                id = bracketMatch![2] || label.replace(/\s+/g, "_");
            }
            const parentId = parentStack.length > 0 ? nodeMap.get(parentStack[parentStack.length - 1]) : undefined;
            ensureNode(id, label, "component", undefined, parentId);
            continue;
        }

        // Interface: () or interface "Label" as id
        const interfaceMatch = ln.match(/^interface\s+(?:"([^"]+)"|([A-Za-z0-9_]+))(?:\s+as\s+([A-Za-z0-9_]+))?/i);
        const circleMatch = ln.match(/^\(\)\s*([A-Za-z0-9_]+)?(?:\s+as\s+([A-Za-z0-9_]+))?$/);
        if (interfaceMatch || circleMatch) {
            let label, id;
            if (interfaceMatch) {
                label = interfaceMatch[1] || interfaceMatch[2];
                id = interfaceMatch[3] || interfaceMatch[2] || label;
            } else {
                label = circleMatch![1] || "Interface";
                id = circleMatch![2] || label.replace(/\s+/g, "_");
            }
            const parentId = parentStack.length > 0 ? nodeMap.get(parentStack[parentStack.length - 1]) : undefined;
            ensureNode(id, label, "cls", "«interface»", parentId);
            continue;
        }

        // Database: [(Database)] or database "Label" as id
        const dbMatch = ln.match(/^database\s+(?:"([^"]+)"|([A-Za-z0-9_]+))(?:\s+as\s+([A-Za-z0-9_]+))?/i);
        const dbBracketMatch = ln.match(/^\[\(([^)]+)\)\](?:\s+as\s+([A-Za-z0-9_]+))?$/);
        if (dbMatch || dbBracketMatch) {
            let label, id;
            if (dbMatch) {
                label = dbMatch[1] || dbMatch[2];
                id = dbMatch[3] || dbMatch[2] || label;
            } else {
                label = dbBracketMatch![1];
                id = dbBracketMatch![2] || label.replace(/\s+/g, "_");
            }
            const parentId = parentStack.length > 0 ? nodeMap.get(parentStack[parentStack.length - 1]) : undefined;
            ensureNode(id, label, "component", "«database»", parentId);
            continue;
        }

        // Relationships
        const relMatch = ln.match(/^([A-Za-z0-9_]+)\s*(-->|->|--|\.\.>|-\.->)\s*([A-Za-z0-9_]+)(?:\s*:\s*(.+))?$/);
        if (relMatch) {
            const fromId = relMatch[1];
            const arrow = relMatch[2];
            const toId = relMatch[3];
            const label = relMatch[4];

            ensureNode(fromId, fromId, "component");
            ensureNode(toId, toId, "component");

            rawEdges.push({
                from: fromId,
                to: toId,
                label,
                marker: arrow.includes(">") ? MARK.openArrow : undefined,
                dashed: arrow.includes(".")
            });
            continue;
        }
    }

    const idToUid = new Map(nodes.map((n) => {
        const entry = [...nodeMap.entries()].find(([, uid]) => uid === n.id);
        return [entry ? entry[0] : n.id, n.id];
    }));

    const edges = rawEdges
        .map((e) => {
            const s = idToUid.get(e.from);
            const t = idToUid.get(e.to);
            if (!s || !t || s === t) return null;
            return mkEdge(s, t, {
                marker: e.marker,
                markerStart: e.markerStart,
                dashed: e.dashed,
                label: e.label
            });
        })
        .filter(Boolean) as FlowEdge[];

    // Apply layout
    const nonPkgNodes = nodes.filter(n => n.type !== "package");
    const nodeSizes = new Map<string, { width: number; height: number }>();
    nonPkgNodes.forEach(n => {
        nodeSizes.set(n.id, { width: n.width ?? 180, height: n.height ?? 92 });
    });

    const posMap = layeredLayout(
        nonPkgNodes.map(n => n.id),
        edges.map(e => ({ source: e.source, target: e.target })),
        layoutDir,
        nodeSizes
    );

    for (const n of nonPkgNodes) {
        const p = posMap.get(n.id) ?? { x: 0, y: 0 };
        n.position = { x: p.x - (n.width ?? 0) / 2, y: p.y - (n.height ?? 0) / 2 };
    }

    const nodesOut = finalizeLayout(nodes, edges);
    return { nodes: nodesOut, edges, type: "component", preLayouted: true, direction: layoutDir };
}

/* ============================================================
   PLANTUML
   ============================================================ */
export function parsePlantUml(code: string): ParseResult {
    let inner = code;
    const start = inner.toLowerCase().indexOf("@startuml");
    const end = inner.toLowerCase().indexOf("@enduml");
    if (start >= 0 && end > start) inner = inner.slice(start + 9, end);
    else if (start >= 0) inner = inner.slice(start + 9);

    const hasComponent = /^\s*(?:component|database)\b|^\s*\[[^\]]+\]/m.test(inner);
    const hasUseCase = /^\s*usecase\b|^\s*actor\b/m.test(inner);
    const hasActivity = /^\s*:(.+);|^\s*start\b|^\s*stop\b/m.test(inner);

    const lines = inner
        .split("\n")
        .map((l) => l.replace(/'.*$/, "").trim())
        .filter(Boolean);

    if (hasActivity) return parsePlantActivity(lines);
    if (hasUseCase) return parsePlantUseCase(lines);
    if (hasComponent) return parsePlantComponent(lines);

    // Default to class diagram
    return parseClassLike(lines, true);
}

/** Auto-detect the UML type of a node from PlantUML source lines. */
function detectNodeType(id: string, lines: string[]): string {
    for (const ln of lines) {
        // Check explicit definitions: actor "Label" as A1 or actor A1
        if (new RegExp(`^actor\\s+(?:"[^"]+"|${id})(?:\\s+as\\s+${id})?`, 'i').test(ln)) return "actor";
        if (new RegExp(`^usecase\\s+(?:"[^"]+"|\\([^)]+\\))(?:\\s+as\\s+${id})?`, 'i').test(ln)) return "usecase";
    }
    // Default heuristic: if name looks like "Actor" → actor, else usecase
    return /^[A-Z][a-z]*(?:Actor|User|Admin|Customer|Client)/.test(id) ? "actor" : "usecase";
}

function parsePlantUseCase(lines: string[]): ParseResult {
    const nodes: FlowNode[] = [];
    const rawEdges: { from: string; to: string; label?: string; dashed?: boolean; marker?: string; type?: string }[] = [];
    const nodeMap = new Map<string, string>();
    const parentStack: string[] = [];

    const ensureNode = (id: string, label: string, type: string, parentId?: string) => {
        if (!nodeMap.has(id)) {
            const uid = nanoid(8);
            nodeMap.set(id, uid);
            let w = 170, h = 76;
            if (type === "actor") { w = 76; h = 124; }
            else if (type === "package") { w = 300; h = 300; }
            else if (type === "note") { w = 150; h = 60; }

            const cleanLabel = label.replace(/\\n/g, "\n");
            nodes.push(mkNode(type, 0, 0, { label: cleanLabel }, w, h, parentId, uid));
        }
    };

    for (let i = 0; i < lines.length; i++) {
        const ln = lines[i].trim();
        if (!ln || ln.startsWith("'") || ln.startsWith("skinparam") || ln.startsWith("left to right")) continue;

        // Notes: note "Label" as N1
        const noteMatch = ln.match(/^note\s+(?:"([^"]+)"|([A-Za-z0-9_]+))(?:\s+as\s+([A-Za-z0-9_]+))?$/);
        if (noteMatch) {
            const label = noteMatch[1] || noteMatch[2];
            const nid2 = noteMatch[3] || nanoid(6);
            ensureNode(nid2, label, "note");
            continue;
        }

        // note right of UC1 : Label
        const notePosMatch = ln.match(/^note\s+(right|left|top|bottom)\s+of\s+([A-Za-z0-9_]+)\s*:\s*(.+)$/);
        if (notePosMatch) {
            const targetId = notePosMatch[2];
            const content = notePosMatch[3];
            const noteId = nanoid(6);
            ensureNode(noteId, content, "note");
            const targetUid = nodeMap.get(targetId);
            if (targetUid) {
                rawEdges.push({ from: noteId, to: targetId, dashed: true, type: "bezier" });
            }
            continue;
        }

        // Boundary: rectangle "Label" as ID { ... }
        const b = ln.match(/^(rectangle|package)\s+(?:"([^"]+)"|([A-Za-z0-9_]+))(?:\s+as\s+([A-Za-z0-9_]+))?\s*\{/);
        if (b) {
            const label = b[2] || b[3];
            const id = b[4] || b[3] || label;
            const parentId = parentStack.length > 0 ? nodeMap.get(parentStack[parentStack.length - 1]) : undefined;
            ensureNode(id, label, "package", parentId);
            parentStack.push(id);
            continue;
        }

        if (ln === "}") {
            parentStack.pop();
            continue;
        }

        // Node definitions: usecase "Label" as UC1, actor "Label" as A1
        const n = ln.match(/^(usecase|actor)\s+(?:"([^"]+)"|([A-Za-z0-9_]+))(?:\s+as\s+([A-Za-z0-9_]+))?/);
        if (n) {
            const type = n[1];
            const label = n[2] || n[3];
            const id = n[4] || n[3] || label;
            const parentId = parentStack.length > 0 ? nodeMap.get(parentStack[parentStack.length - 1]) : undefined;
            ensureNode(id, label, type, parentId);
            continue;
        }

        // Relationships
        const r = ln.match(/^([A-Za-z0-9_]+)\s*([-.]+)(?:up|down|left|right)*([-.]*)>\s*([A-Za-z0-9_]+)(?:\s*:\s*(.+))?/);
        const rRev = ln.match(/^([A-Za-z0-9_]+)\s*<([-.]+)(?:up|down|left|right)*([-.]*)\s*([A-Za-z0-9_]+)(?:\s*:\s*(.+))?/);

        if (r || rRev) {
            const from = r ? r[1] : rRev![4];
            const to = r ? r[4] : rRev![1];
            const arrow = r ? r[2] + r[3] : rRev![2] + rRev![3];
            let label = (r ? r[5] : rRev![5])?.trim() || "";

            if (!label && ln.includes("<<include>>")) label = "«include»";
            if (!label && ln.includes("<<extend>>")) label = "«extend»";

            // Auto-detect type: look up if already defined, or infer from context
            const fromType = detectNodeType(from, lines);
            const toType = detectNodeType(to, lines);
            ensureNode(from, from, fromType);
            ensureNode(to, to, toType);

            const dashed = arrow.includes(".") || label.includes("include") || label.includes("extend");
            rawEdges.push({
                from,
                to,
                label,
                dashed,
                marker: MARK.openArrow,
                type: "bezier",
            });
        }
        // Generalization: A --|> B or A <|-- B
        const gen2 = ln.match(/^([A-Za-z0-9_]+)\s*(?:<\|--|--\|>)\s*([A-Za-z0-9_]+)/);
        if (gen2) {
            let gfrom = gen2[1], gto = gen2[2];
            if (ln.includes("<|--")) [gfrom, gto] = [gto, gfrom];
            ensureNode(gfrom, gfrom, detectNodeType(gfrom, lines));
            ensureNode(gto, gto, detectNodeType(gto, lines));
            rawEdges.push({ from: gfrom, to: gto, marker: MARK.triangle, type: "bezier" });
        }
    }

    const edges = rawEdges.map(e => {
        const s = nodeMap.get(e.from);
        const t = nodeMap.get(e.to);
        if (!s || !t) return null;
        return mkEdge(s, t, {
            marker: e.marker,
            dashed: e.dashed,
            label: e.label,
            type: e.type || "smoothstep",
        });
    }).filter(Boolean) as FlowEdge[];

    // Apply layout
    const nonPkgNodes = nodes.filter(n => n.type !== "package");
    const posMap = layeredLayout(
        nonPkgNodes.map(n => n.id),
        edges.map(e => ({ source: e.source, target: e.target })),
        "TB"
    );

    for (const n of nonPkgNodes) {
        const p = posMap.get(n.id) ?? { x: 0, y: 0 };
        n.position = { x: p.x - (n.width ?? 0) / 2, y: p.y - (n.height ?? 0) / 2 };
    }

    const nodesOut = finalizeLayout(nodes, edges);
    return { nodes: nodesOut, edges, type: "usecase", preLayouted: true };
}

function parsePlantActivity(lines: string[]): ParseResult {
    const nodes: FlowNode[] = [];
    const rawEdges: { from: string; to: string; label?: string }[] = [];
    const nodeMap = new Map<string, string>();

    let lastIds: string[] = [];
    let currentLaneId: string | null = null;
    const laneByLabel = new Map<string, string>();
    let laneIndex = 0; // Track declaration order for horizontal swimlane layout

    const ensureNode = (id: string, label: string, type: string, parentIdArg?: string, extraData?: Partial<FlowNodeData>) => {
        if (!nodeMap.has(id)) {
            const uid = nanoid(8);
            nodeMap.set(id, uid);
            let w = 150, h = 54;
            if (type === "start" || type === "final") { w = 40; h = 40; }
            else if (type === "decision") { w = 150; h = 92; }
            else if (type === "fork") { w = 100; h = 8; }
            else if (type === "swimlane") { w = 480; h = 130; }
            else if (type === "note") { w = 150; h = 60; }
            // Real nesting: an action/decision/… is parented to the active swimlane
            // (its `parentId` links to the lane's uid). Only nodes after a `|Lane|`
            // declaration get nested; the lane itself is never nested.
            const parentId = parentIdArg !== undefined
                ? parentIdArg
                : (currentLaneId && type !== "swimlane" ? nodeMap.get(currentLaneId) : undefined);
            nodes.push(mkNode(type, 0, 0, { label, ...extraData }, w, h, parentId, uid));
        }
        return nodeMap.get(id)!;
    };
    const forkStack: { forkId: string; branchEnds: string[] }[] = [];
    const ifStack: { decisionId: string; yesBranchEnds: string[]; laneId: string | null }[] = [];
    /** Stores label to apply to the NEXT sequential edge — used by "else" */
    let pendingEdgeLabel: string | null = null;

    for (let i = 0; i < lines.length; i++) {
        const ln = lines[i].trim();
        if (!ln || ln.startsWith("'")) continue;

        // Swimlane: |Lane Name| or |#Color|Lane Name|
        const laneMatch = ln.match(/^\|(?:#\w+\|)?([^|]+)\|$/);
        if (laneMatch) {
            const label = laneMatch[1].trim();
            let lid = laneByLabel.get(label);
            if (!lid) {
                lid = "lane-" + nanoid(6);
                laneByLabel.set(label, lid);
                // Track declaration order via laneIndex for horizontal sorting
                ensureNode(lid, label, "swimlane", undefined, { laneIndex });
                laneIndex++;
            }
            currentLaneId = lid;
            continue;
        }

        if (ln === "start") {
            const startId = ensureNode("start", "", "start");
            lastIds = [startId];
            continue;
        }
        if (ln === "stop" || ln === "end") {
            const id = ensureNode("final-" + nanoid(4), "", "final");
            lastIds.forEach(lId => {
                rawEdges.push({ from: lId, to: id, label: pendingEdgeLabel || undefined });
            });
            pendingEdgeLabel = null;
            lastIds = [];
            continue;
        }

        // Action: :label;
        if (ln.startsWith(":")) {
            let label = ln.slice(1);
            if (label.endsWith(";")) label = label.slice(0, -1);
            label = label.trim();

            const id = nanoid(6);
            ensureNode(id, label, "action");
            lastIds.forEach(lId => {
                rawEdges.push({ from: lId, to: id, label: pendingEdgeLabel || undefined });
            });
            pendingEdgeLabel = null;
            lastIds = [id];
            continue;
        }

        // If / Else / Endif
        if (ln.startsWith("if")) {
            const m = ln.match(/if\s*\(([^)]+)\)(?:\s+then\s*\(([^)]+)\))?/i);
            const cond = m ? m[1] : "";
            const id = ensureNode(nanoid(6), cond, "decision");
            lastIds.forEach(lId => {
                rawEdges.push({ from: lId, to: id, label: pendingEdgeLabel || undefined });
            });
            pendingEdgeLabel = null;
            ifStack.push({ decisionId: id, yesBranchEnds: [], laneId: currentLaneId });
            lastIds = [id];
            // Set pending label for YES branch (e.g. "yes" from "then (yes)")
            if (m && m[2]) pendingEdgeLabel = m[2].trim() || "yes";
            continue;
        }
        if (ln.startsWith("else") || ln.startsWith("elseif")) {
            const currentIf = ifStack[ifStack.length - 1];
            if (currentIf) {
                // Save the current YES/previous branch ends
                currentIf.yesBranchEnds = [...currentIf.yesBranchEnds, ...lastIds];

                // Restore the lane ID to what it was before the if block!
                currentLaneId = currentIf.laneId;

                const m = ln.match(/(?:else|elseif)\s*\(([^)]+)\)(?:\s+then\s*\(([^)]+)\))?/i);
                const label = m ? m[2] || m[1] : "No";

                if (ln.startsWith("elseif")) {
                    const elseifId = ensureNode(nanoid(6), m ? m[1] : "", "decision");
                    rawEdges.push({ from: currentIf.decisionId, to: elseifId, label });
                    // Update the decisionId to be the new elseifId for the next branch
                    currentIf.decisionId = elseifId;
                    lastIds = [elseifId];
                    // Propagate "then (label)" forward as YES branch label
                    if (m && m[2]) pendingEdgeLabel = m[2].trim() || "yes";
                } else {
                    // else: next action connects FROM decision WITH label
                    lastIds = [currentIf.decisionId];
                    pendingEdgeLabel = label;
                }
            }
            continue;
        }
        if (ln === "endif") {
            const currentIf = ifStack.pop();
            if (currentIf) {
                lastIds = [...currentIf.yesBranchEnds, ...lastIds];
                // Restore the lane ID to what it was before the if block!
                currentLaneId = currentIf.laneId;
            }
            pendingEdgeLabel = null;
            continue;
        }

        // Fork / Join
        if (ln === "fork") {
            const id = ensureNode(nanoid(6), "", "fork");
            lastIds.forEach(lId => {
                rawEdges.push({ from: lId, to: id });
            });
            forkStack.push({ forkId: id, branchEnds: [] });
            lastIds = [id];
            continue;
        }
        if (ln === "fork again") {
            const currentFork = forkStack[forkStack.length - 1];
            if (currentFork) {
                currentFork.branchEnds = [...currentFork.branchEnds, ...lastIds];
                lastIds = [currentFork.forkId];
            }
            continue;
        }
        if (ln === "end fork") {
            const joinId = ensureNode(nanoid(6), "", "fork");
            const currentFork = forkStack.pop();
            if (currentFork) {
                const allBranchEnds = [...currentFork.branchEnds, ...lastIds];
                allBranchEnds.forEach(bEnd => {
                    rawEdges.push({ from: bEnd, to: joinId });
                });
            }
            lastIds = [joinId];
            continue;
        }

        // Repeat / While
        if (ln === "repeat") {
            const id = ensureNode(nanoid(6), "Repeat", "action");
            lastIds.forEach(lId => {
                rawEdges.push({ from: lId, to: id });
            });
            lastIds = [id];
            continue;
        }
        if (ln.startsWith("repeat while")) {
            const cond = ln.match(/\((.+)\)/)?.[1] || "";
            const id = ensureNode(nanoid(6), cond, "decision");
            lastIds.forEach(lId => {
                rawEdges.push({ from: lId, to: id, label: "Loop" });
            });
            lastIds = [id];
            continue;
        }

        // Notes
        if (ln.startsWith("note")) {
            const content =
                ln.match(/note\s+(?:right|left|top|bottom)?\s*:\s*(.+)$/)?.[1] ||
                ln.match(/note\s+(?:right|left|top|bottom)?\s*(.+)$/)?.[1] ||
                "Note";
            const id = ensureNode(nanoid(6), content, "note");
            lastIds.forEach(lId => {
                rawEdges.push({ from: lId, to: id, label: "note" });
            });
            continue;
        }
    }

    const edges = rawEdges
        .map(e => {
            const s = nodeMap.get(e.from) || e.from;
            const t = nodeMap.get(e.to) || e.to;
            if (!s || !t || s === t) return null;
            return mkEdge(s, t, { marker: MARK.arrow, label: e.label });
        })
        .filter(Boolean) as FlowEdge[];

    // Band-aware layout: keep each lane's children inside its partition and
    // stack the lanes in a stable order (instead of one flat dagre pass that
    // interleaves every lane's nodes).
    const laid = layoutActivityWithSwimlanes(nodes, edges, "TB");
    const nodesOut = laid ? laid.nodes : finalizeLayout(nodes, edges);
    const edgesOut = laid ? laid.edges : edges;
    return { nodes: nodesOut, edges: edgesOut, type: "activity", preLayouted: true };
}

function parsePlantComponent(lines: string[]): ParseResult {
    const comps = new Map<string, { label: string; stereotype?: string; type: string; parentId?: string }>();
    const rawEdges: { from: string; to: string; opts: Parameters<typeof mkEdge>[2] }[] = [];
    const parentStack: string[] = [];
    const nodeMap = new Map<string, string>();

    // Detect direction from lines
    let layoutDir: "TB" | "LR" = "TB";
    const hasL2R = lines.some(l => /^\s*(?:left\s+to\s+right\s+direction|direction\s+LR)\b/i.test(l));
    if (hasL2R) layoutDir = "LR";

    const ensureComp = (id: string, label?: string, type: string = "component", stereo?: string) => {
        if (!comps.has(id)) {
            const parentId = parentStack.length > 0 ? nodeMap.get(parentStack[parentStack.length - 1]) : undefined;
            const uid = nodeMap.get(id) || nanoid(8);
            nodeMap.set(id, uid);
            comps.set(id, { label: label ?? id, stereotype: stereo, type, parentId });
        } else if (label) {
            comps.get(id)!.label = label;
        }
        return comps.get(id)!;
    };

    for (const ln of lines) {
        const clean = ln.trim();
        if (!clean || clean.startsWith("'")) continue;

        // Boundaries
        const b = clean.match(/^(package|node|cloud|database|frame|storage|rectangle)\s+(?:"([^"]+)"|([A-Za-z0-9_]+))(?:\s+as\s+([A-Za-z0-9_]+))?\s*\{/);
        if (b) {
            const type = b[1];
            const label = b[2] || b[3];
            const id = b[4] || b[3] || label;
            const uid = nanoid(8);
            nodeMap.set(id, uid);
            ensureComp(id, label, "package", `«${type}»`);
            parentStack.push(id);
            continue;
        }
        if (clean === "}") {
            parentStack.pop();
            continue;
        }

        // Explicit definitions
        const def = clean.match(/^(component|interface|node|database|cloud|storage)\s+(?:"([^"]+)"|([A-Za-z0-9_]+))(?:\s+as\s+([A-Za-z0-9_]+))?/);
        if (def) {
            const type = def[1] === "interface" ? "action" : "component";
            const stereo = def[1] === "interface" ? "«interface»" : `«${def[1]}»`;
            const label = def[2] || def[3];
            const id = def[4] || def[3] || label;
            ensureComp(id, label, type, stereo);
            continue;
        }

        // Shorthands: [Comp] or () Inter
        const compShorthand = clean.match(/^\[([^\]]+)\](?:\s+as\s+([A-Za-z0-9_]+))?/);
        if (compShorthand) {
            const label = compShorthand[1];
            const id = compShorthand[2] || label;
            ensureComp(id, label, "component");
            continue;
        }
        const interShorthand = clean.match(/^\(\)\s+(?:"([^"]+)"|([A-Za-z0-9_]+))(?:\s+as\s+([A-Za-z0-9_]+))?/);
        if (interShorthand) {
            const label = interShorthand[1] || interShorthand[2];
            const id = interShorthand[3] || label;
            ensureComp(id, label, "action", "«interface»");
            continue;
        }

        // Relationships
        const relMatch = clean.match(/^\s*(?:\[([^\]]+)\]|([A-Za-z0-9_]+))\s*([-.]+>)\s*(?:\[([^\]]+)\]|([A-Za-z0-9_]+)|(?:\(\)\s*(?:"([^"]+)"|([A-Za-z0-9_]+))))(?:\s*:\s*(.*))?$/);
        if (relMatch) {
            const fromRaw = relMatch[1] || relMatch[2];
            const arrow = relMatch[3];
            const toRaw = relMatch[4] || relMatch[5] || relMatch[6] || relMatch[7];
            const label = relMatch[8]?.trim();

            ensureComp(fromRaw);
            ensureComp(toRaw);
            rawEdges.push({
                from: fromRaw,
                to: toRaw,
                opts: {
                    marker: MARK.openArrow,
                    dashed: arrow.includes("."),
                    label,
                },
            });
            continue;
        }

        const r = parseRelLine(clean);
        if (r) {
            ensureComp(r.from);
            ensureComp(r.to);
            rawEdges.push({ from: r.from, to: r.to, opts: r.opts });
        }
    }

    const ids = [...comps.keys()];
    const nodeSizes = new Map<string, { width: number; height: number }>();
    ids.forEach(id => {
        const c = comps.get(id)!;
        let w = 180, h = 92;
        if (c.type === "package") { w = 300; h = 300; }
        nodeSizes.set(id, { width: w, height: h });
    });

    const posMap = layeredLayout(
        ids,
        rawEdges.map((e) => ({ source: e.from, target: e.to })),
        layoutDir,
        nodeSizes
    );

    const nodes: FlowNode[] = ids.map((id) => {
        const c = comps.get(id)!;
        const sz = nodeSizes.get(id)!;
        const p = posMap.get(id) ?? { x: 0, y: 0 };
        const uid = nodeMap.get(id) || nanoid(8);
        return mkNode(c.type, p.x - sz.width / 2, p.y - sz.height / 2, { label: c.label, stereotype: c.stereotype }, sz.width, sz.height, c.parentId, uid);
    });

    const idToUidMap = new Map(nodes.map((n, i) => [ids[i], n.id]));
    const edges: FlowEdge[] = rawEdges
        .map((e) => {
            const s = idToUidMap.get(e.from);
            const t = idToUidMap.get(e.to);
            if (!s || !t || s === t) return null;
            return mkEdge(s, t, e.opts);
        })
        .filter(Boolean) as FlowEdge[];

    const nodesOut = finalizeLayout(nodes, edges);
    return { nodes: nodesOut, edges, type: "component", preLayouted: true, direction: layoutDir };
}

/* ============================================================
   DISPATCHER — FIXED: auto-detect Mermaid vs PlantUML
   ============================================================ */
/**
 * Auto-detect whether the input is Mermaid or PlantUML and parse accordingly.
 *
 * Detection strategy:
 * 1. Check code-fence markers: ```mermaid vs ```plantuml
 * 2. Look for @startuml/@enduml → PlantUML
 * 3. Look for Mermaid keywords: classDiagram, flowchart, stateDiagram-v2, etc.
 * 4. If still ambiguous, try Mermaid first, fallback to PlantUML
 */
export function detectAndParse(text: string): ParseResult & { format: string } {
    // ── 1. Code-fence extraction ──────────────────────────────────
    const mermaidFence = text.match(/```(?:mermaid|mmd)?\s*\n([\s\S]*?)```/i);
    const plantFence = text.match(/```(?:plantuml|pu|puml)\s*\n([\s\S]*?)```/i);
    const anyFence = text.match(/```(?:\w+)?\s*\n([\s\S]*?)```/i);

    let code = text;

    // Prioritise explicit fence markers
    if (mermaidFence) {
        code = mermaidFence[1];
        const base = parseMermaid(code);
        const questions = buildQuestions(base);
        return { ...base, questions, format: "Mermaid" };
    }
    if (plantFence) {
        code = plantFence[1];
        const base = parsePlantUml(code);
        const questions = buildQuestions(base);
        return { ...base, questions, format: "PlantUML" };
    }
    if (anyFence) {
        code = anyFence[1];
    }

    // ── 2. Explicit PlantUML markers ──────────────────────────────
    const hasPlantUml =
        /@startuml/i.test(code) ||
        /@enduml/i.test(code) ||
        /^\s*'/m.test(code);

    // ── 3. Explicit Mermaid markers ───────────────────────────────
    const hasMermaid =
        // Direct diagram-type headers (strong signal)
        /\bclassDiagram\b/i.test(code) ||
        /\bflowchart\b/i.test(code) ||

        /\bstateDiagram(-v2)?\b/i.test(code) ||
        /\berDiagram\b/i.test(code) ||
        /\buseCaseDiagram\b/i.test(code) ||
        /\bcomponentDiagram\b/i.test(code) ||
        /\bgantt\b/i.test(code) ||
        /\bpie\b/i.test(code) ||
        /\bgraph\s+(TB|BT|LR|RL|TD)\b/i.test(code) ||
        /\bgit[Gg]raph\b/i.test(code) ||
        /\bjourney\b/i.test(code) ||
        /\bquadrantChart\b/i.test(code) ||
        /\brequirementDiagram\b/i.test(code) ||
        /\bmindmap\b/i.test(code) ||
        /\btimeline\b/i.test(code) ||
        /\bsankey-beta\b/i.test(code) ||
        // Mermaid-only syntax: %% comments
        /%%[^\n]*/m.test(code) ||
        // Mermaid-only syntax: class member inside braces
        /\{\s*\n\s*\+/.test(code) ||
        // Pipe labels: A -->|label| B (not found in PlantUML)
        /-->\s*\|[^|]+\|/.test(code);

    // ── 4. Dispatch ───────────────────────────────────────────────
    if (hasPlantUml && !hasMermaid) {
        const base = parsePlantUml(code);
        const questions = buildQuestions(base);
        return { ...base, questions, format: "PlantUML" };
    }

    if (hasMermaid && !hasPlantUml) {
        const base = parseMermaid(code);
        const questions = buildQuestions(base);
        return { ...base, questions, format: "Mermaid" };
    }

    // Ambiguous or plain: try Mermaid first
    try {
        const mermaidResult = parseMermaid(code);
        if (mermaidResult.nodes.length > 0) {
            const questions = buildQuestions(mermaidResult);
            return { ...mermaidResult, questions, format: "Mermaid" };
        }
    } catch {
        // fall through
    }

    // Fallback to PlantUML
    try {
        const plantResult = parsePlantUml(code);
        const questions = buildQuestions(plantResult);
        return { ...plantResult, questions, format: "PlantUML" };
    } catch {
        return { nodes: [], edges: [], questions: [], format: "PlantUML" };
    }
}

/* ============================================================
   AI RESPONSE CONVERSION
   ============================================================ */
import { aiNodeToFlow, aiEdgeToFlow } from "./aiToCanvas";
import { resolveRelation } from "./relationMapper";
import type { AINode, AIEdge, AINodeType, RelationKind } from "../types/aiContract";

export function aiResponseToCanvas(res: DiagramChatResponse, existingEdges?: FlowEdge[]): ParseResult {
    const dto = res as any; // widen for dynamic fields
    const nodes: FlowNode[] = (dto.nodes ?? []).map((n: any) => {
        // Defensive alias: AI/BE có thể trả "class" (đầy đủ) thay vì "cls" (alias
        // mà frontend registry dùng). Map về "cls" để React Flow tìm được component.
        const rawType = (n.type || "cls").toLowerCase();
        const normalizedType = rawType === "class" ? "cls" : rawType;
        // Convert DiagramChatResponse's node to AINode format
        const aiNode: AINode = {
            id: n.id,
            type: normalizedType as AINodeType,
            label: n.label,
            stereotype: n.stereotype,
            attributes: Array.isArray(n.attributes) ? n.attributes : typeof n.attributes === "string" ? n.attributes.split("\n") : undefined,
            methods: Array.isArray(n.methods) ? n.methods : typeof n.methods === "string" ? n.methods.split("\n") : undefined,
        };
        // Use our shared aiNodeToFlow function, then set parentId
        const flowNode = aiNodeToFlow(aiNode);
        return { ...flowNode, parentId: n.parentId, extent: n.parentId ? "parent" : undefined };
    });

    // E-06: validate node.type ngay tại FE để báo lỗi sớm (BE đã check ở Lô 2 nhưng
    // nếu response cache cũ / bypass BE thì FE vẫn phải tự bảo vệ).
    const VALID_NODE_TYPES = new Set<string>([
        "action", "decision", "start", "final", "fork",
        "cls", "component", "usecase", "actor", "note", "package",
    ]);
    for (const n of (dto.nodes ?? [])) {
        const t = (n?.type ?? "").toLowerCase();
        if (t && !VALID_NODE_TYPES.has(t)) {
            throw new Error(`Invalid node type from AI: "${n?.type}". Allowed: ${[...VALID_NODE_TYPES].join(", ")}`);
        }
    }

    // E-07 / E-09: Smart type detection ưu tiên diagramType từ AI. Trước đây code đoán
    // lại từ summary (vd "use case" trong text) đè cả khi AI đã trả diagramType rõ ràng →
    // bug khó chịu. Giờ chỉ fallback khi AI không trả diagramType.
    let detectedType = (dto.diagramType as DiagramType) || "";
    if (!detectedType) {
        const nodeTypes = new Set<string>((res.nodes ?? []).map((n: any) => (n.type ?? "").toLowerCase()));
        if (nodeTypes.has("start") || nodeTypes.has("final") || nodeTypes.has("decision") || nodeTypes.has("fork")) {
            detectedType = "activity";
        } else if (nodeTypes.has("actor") || nodeTypes.has("usecase")) {
            detectedType = "usecase";
        } else if (nodeTypes.has("component")) {
            detectedType = "component";
        } else {
            detectedType = "class";
        }
    }

    const edges: FlowEdge[] = (dto.edges ?? []).map((e: any) => {
        let edgeLabel = e.label;
        if (!edgeLabel && existingEdges) {
            const matched = existingEdges.find(ex => ex.id === e.id || (ex.source === e.source && ex.target === e.target));
            if (matched && matched.label) {
                edgeLabel = matched.label;
            }
        }

        const aiEdge: AIEdge = {
            id: e.id,
            source: e.source,
            target: e.target,
            relation: (e.relation || "association").toLowerCase() as RelationKind,
            label: edgeLabel,
        };
        const flowEdge = aiEdgeToFlow(aiEdge);

        // Map multiplicity (tách khỏi label) vào data của edge.
        // Frontend đã có sẵn 2 input riêng (multiplicitySource / multiplicityTarget)
        // lưu trong flowEdge.data và hiển thị ở form Inspector.
        if (e.multiplicitySource || e.multiplicityTarget) {
            flowEdge.data = {
                ...(flowEdge.data as object),
                multiplicitySource: e.multiplicitySource,
                multiplicityTarget: e.multiplicityTarget,
            };
        }

        // Use Case specific: remove arrows for associations between Actor and UseCase
        if (detectedType === "usecase" && aiEdge.relation === "association") {
            const sourceNode = nodes.find(n => n.id === flowEdge.source);
            const targetNode = nodes.find(n => n.id === flowEdge.target);
            if (sourceNode && targetNode) {
                if ((sourceNode.type === "actor" && targetNode.type === "usecase") ||
                    (sourceNode.type === "usecase" && targetNode.type === "actor")) {
                    flowEdge.data = { ...flowEdge.data, marker: "", dashed: !!(flowEdge.data as any)?.dashed };
                }
            }
        }

        return flowEdge;
    });

    const questions = dto.questions
        ? aiQuestionsToImportQuestions(dto.questions)
        : undefined;

    return { nodes, edges, questions, type: detectedType as DiagramType };
}

export function aiQuestionsToImportQuestions(questions: AiQuestionDto[]): ImportQuestion[] {
    return questions.map((q) => ({
        id: q.id,
        edgeId: q.edgeId,
        prompt: q.prompt,
        detail: q.detail,
        multiple: q.mode === "multiple",
        options: (q.options || []).map((o) => {
            const relation = (o.relation || "").toLowerCase() as RelationKind;
            const r = resolveRelation(relation);
            return {
                label: o.label,
                marker: r.marker,
                markerStart: r.markerStart,
                dashed: r.dashed
            };
        }),
    }));
}

/* ============================================================
   EXAMPLES
   ============================================================ */
export const EXAMPLES: Record<string, { title: string; code: string; format: "mermaid" | "plantuml" }> = {
    classMermaid: {
        title: "Class (Mermaid)",
        format: "mermaid",
        code: `classDiagram
class User {
  <<Entity>>
  +Long id
  +String username
  #String email
  -String password
  +login()
  +logout()
}
class Customer {
  <<Entity>>
  +Long id
  +String name
}
class Product {
  <<Entity>>
  +Long id
  +String name
  +BigDecimal price
}
class Order {
  <<Entity>>
  +Long id
  +Date orderDate
  +OrderStatus status
  +calculateTotal() BigDecimal
}
class OrderItem {
  +int quantity
  +BigDecimal price
}
class OrderStatus {
  <<Enumeration>>
  PENDING
  CONFIRMED
  SHIPPED
  DELIVERED
  CANCELLED
}
class PaymentService {
  <<Interface>>
  +processPayment(amount: BigDecimal) boolean
  +refund(transactionId: String) boolean
}
class PayPalPayment {
  <<Service>>
  +processPayment(amount: BigDecimal) boolean
  +refund(transactionId: String) boolean
}
User <|-- Customer
Customer "1" --> "0..*" Order : places
Order "1" *-- "1..*" OrderItem : contains
OrderItem --> Product : refers to
Order --> OrderStatus
PayPalPayment ..|> PaymentService`,
    },
    flowMermaid: {
        title: "Flowchart (Mermaid)",
        format: "mermaid",
        code: `flowchart TD
A([Start]) --> B{Logged in?}
B -->|Yes| C[Load dashboard]
B -->|No| D[Show login]
D --> E[Authenticate]
E --> C
C --> F([End])`,
    },
    classPlant: {
        title: "Class (PlantUML)",
        format: "plantuml",
        code: `@startuml
abstract class Shape {
  + draw(): void
}
class Circle {
  - radius: double
}
class Square {
  - side: double
}
Shape <|-- Circle
Shape <|-- Square
@enduml`,
    },
    relDemo: {
        title: "Relations demo",
        format: "mermaid",
        code: `classDiagram
class Order
class Customer
class Product
class Payment
class LineItem
Order -- Customer
Order -- LineItem
LineItem -- Product
Order -- Payment
Customer -- Payment`,
    },
};