import { nanoid } from "nanoid";
import type { DiagramType, FlowEdge, FlowNode, FlowNodeData } from "../types";
import { classMinSize } from "./sizing";
import type { DiagramChatResponse, AiQuestionDto } from "../types/ai";

/* Marker URL constants (must match src/lib/markers.tsx ids). */
const MARK = {
  arrow: "url(#m-arrow)",
  openArrow: "url(#m-arrow-open)",
  triangle: "url(#m-triangle)",
  diamondFilledStart: "url(#m-diamond-filled-start)",
  diamondOpenStart: "url(#m-diamond-open-start)",
  none: "",
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
    extent: parentId ? "parent" : undefined,
  };
}

function mkEdge(
    s: string, t: string,
    o: {
      marker?: string; markerStart?: string; dashed?: boolean;
      label?: string; type?: FlowEdge["type"];
    }
): FlowEdge {
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
    .replace(/&amp;/g, "&")
    .replace(/<br\/?>/gi, "\n")
    .trim();
}

function gridLayout(n: number) {
  const cols = Math.max(1, Math.ceil(Math.sqrt(n)));
  const gapX = 280;
  const gapY = 170;
  return (i: number) => ({ x: (i % cols) * gapX, y: Math.floor(i / cols) * gapY });
}

function layeredLayout(
    ids: string[],
    edges: { source: string; target: string }[]
): Map<string, { x: number; y: number }> {
  const level = new Map<string, number>();
  const incoming = new Map<string, number>();
  ids.forEach((id) => {
    incoming.set(id, 0);
    level.set(id, 0);
  });
  edges.forEach((e) => incoming.set(e.target, (incoming.get(e.target) ?? 0) + 1));
  
  // Find components using BFS/DFS to handle fragmented graphs
  const visited = new Set<string>();
  const components: string[][] = [];

  for (const id of ids) {
    if (!visited.has(id)) {
      const component: string[] = [];
      const q = [id];
      visited.add(id);
      while (q.length) {
        const curr = q.shift()!;
        component.push(curr);
        // Find neighbors (both source and target)
        const neighbors = [
          ...edges.filter(e => e.source === curr).map(e => e.target),
          ...edges.filter(e => e.target === curr).map(e => e.source)
        ];
        for (const n of neighbors) {
          if (!visited.has(n) && ids.includes(n)) {
            visited.add(n);
            q.push(n);
          }
        }
      }
      components.push(component);
    }
  }

  // Layout each component
  const pos = new Map<string, { x: number; y: number }>();
  let currentYOffset = 0;
  const colW = 280;
  const rowH = 160;

  for (const compIds of components) {
    const compEdges = edges.filter(e => compIds.includes(e.source) && compIds.includes(e.target));
    const compIncoming = new Map<string, number>();
    compIds.forEach(id => compIncoming.set(id, 0));
    compEdges.forEach(e => compIncoming.set(e.target, (compIncoming.get(e.target) ?? 0) + 1));
    
    const roots = compIds.filter(id => (compIncoming.get(id) ?? 0) === 0);
    const start = roots.length ? roots : compIds.slice(0, 1);

    const compLevel = new Map<string, number>();
    const q = start.map(id => ({ id, l: 0 }));
    const seen = new Set<string>();
    
    while (q.length) {
      const { id, l } = q.shift()!;
      if (seen.has(id)) continue;
      seen.add(id);
      compLevel.set(id, Math.max(compLevel.get(id) ?? 0, l));
      compEdges
        .filter(e => e.source === id)
        .forEach(e => q.push({ id: e.target, l: (compLevel.get(id) ?? 0) + 1 }));
    }
    compIds.forEach(id => compLevel.set(id, compLevel.get(id) ?? 0));

    const byLevel = new Map<number, string[]>();
    compIds.forEach(id => {
      const l = compLevel.get(id)!;
      if (!byLevel.has(l)) byLevel.set(l, []);
      byLevel.get(l)!.push(id);
    });

    let maxLevel = 0;
    for (const [l, group] of byLevel) {
      maxLevel = Math.max(maxLevel, l);
      group.forEach((id, i) => {
        pos.set(id, {
          x: i * colW - ((group.length - 1) * colW) / 2,
          y: currentYOffset + l * rowH,
        });
      });
    }
    currentYOffset += (maxLevel + 1) * rowH + 100; // Add space between components
  }

  return pos;
}

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
    if (low.startsWith("direction ")) continue;
    if (low.startsWith("title ")) continue;
    if (low.startsWith("accTitle ")) continue;
    if (low.startsWith("accDescr ")) continue;
    
    clean.push(line);
  }

  if (clean.length === 0) return { nodes: [], edges: [], type: "activity" };

  const head = clean[0].toLowerCase();
  if (head.startsWith("classdiagram")) return parseClassLike(clean, false);
  if (head.startsWith("sequencediagram")) return parseSequence(clean);
  if (head.startsWith("flowchart") || head.startsWith("graph"))
    return parseFlowchart(clean);
  if (head.startsWith("statediagram")) return parseState(clean);
  if (head.startsWith("usecasediagram") || head.startsWith("usecase")) return parseMermaidUseCase(clean);
  if (head.startsWith("componentdiagram") || head.startsWith("component")) return parseMermaidComponent(clean);

  // No header — guess.
  if (/\bclass\b|\}<\|--|\*--|o--/.test(processed)) return parseClassLike(clean, false);
  if (/-+>+|->>+|-->>/.test(processed)) return parseSequence(clean);
  if (/\bactor\b|\busecase\b|\(\)/.test(processed)) return parseMermaidUseCase(clean);
  if (/\bcomponent\b|\[\[.*\]\]/.test(processed)) return parseMermaidComponent(clean);
  return parseFlowchart(clean);
}

/* ---- class diagram (mermaid + plantuml share this) ---- */
function parseClassLike(lines: string[], _plant: boolean): ParseResult {
  const classes = new Map<
      string,
      { label: string; stereotype?: string; attrs: string[]; methods: string[] }
  >();
  const ensure = (id: string, label?: string) => {
    if (!classes.has(id))
      classes.set(id, { label: label ?? id, attrs: [], methods: [] });
    else if (label) classes.get(id)!.label = label;
    return classes.get(id)!;
  };

  // Pass 1: class definitions + members.
  let i = 0;
  const classRe =
      /^(?:abstract\s+class|class|interface|enum)\s+([A-Za-z0-9_]+)\s*(\{)?/;
  const inlineMemberRe = /^([A-Za-z0-9_]+)\s*:\s*(.+)/;
  
  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line || line.startsWith("%%")) { i++; continue; }
    
    const low = line.toLowerCase();
    if (low.startsWith("classdiagram")) { i++; continue; }
    if (low.startsWith("note")) {
      // If it's a block note, skip until closing brace if any, but Mermaid notes are usually one-line or block
      // Simplest is to skip the line
      i++;
      continue;
    }

    const cd = line.match(classRe);
    if (cd) {
      const id = cd[1];
      const isInterface = /^interface\b/.test(line);
      const isAbstract = /^abstract\s+class\b/.test(line);
      const isEnum = /^enum\b/.test(line);
      const c = ensure(id, id);
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
  const pos = gridLayout(classes.size);
  const nodes: FlowNode[] = [];
  let gi = 0;
  for (const [mid, c] of classes) {
    const { w, h } = clsSize(c.label, c.attrs, c.methods, c.stereotype);
    const uid = nanoid(8);
    idMap.set(mid, uid);
    nodes.push(
        mkNode(
            "cls",
            pos(gi).x,
            pos(gi).y,
            {
              label: c.label,
              stereotype: c.stereotype,
              attributes: c.attrs.join("\n"),
              methods: c.methods.join("\n"),
            },
            w,
            h
        )
    );
    gi++;
  }
  const edges: FlowEdge[] = rels
      .map((r) => {
        const s = idMap.get(r.from);
        const t = idMap.get(r.to);
        if (!s || !t || s === t) return null;
        return mkEdge(s, t, r.opts);
      })
      .filter(Boolean) as FlowEdge[];

  return { nodes, edges, type: "class" };
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

  // Normalize visibility prefix spacing: "+name" -> "+ name"
  line = line.replace(/^([+\-#~])\s*/, "$1 ");
  
  // Handle methods (with parentheses) or attributes
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
    | { from: string; to: string; opts: Parameters<typeof mkEdge>[2] }
    | null {
  // Enhanced multiplicity regex to handle spaces and quotes better
  const m = line.match(
      /^\s*([A-Za-z0-9_]+)\s*(?:"([^"]+)"\s*)?(<\|--|\.\.\|>|<\|\.\.|\*--|--\*|o--|--o|-->|<--|\.\.>|<\.\.|---|<==|==>|--|<\|)\s*(?:"([^"]+)"\s+)?([A-Za-z0-9_]+)(?:\s*:\s*(.*))?$/
  );
  if (!m) return null;
  const [, leftId, leftMulti, token, rightMulti, rightId, labelRaw] = m;
  const label = decodeMermaid(labelRaw?.trim() ?? "");

  // Combine multiplicity into the label if present
  let finalLabel = label;
  if (leftMulti || rightMulti) {
    const multiStr = `${leftMulti ? leftMulti + " " : ""}${rightMulti ? " " + rightMulti : ""}`.trim();
    finalLabel = label ? `${multiStr} : ${label}` : multiStr;
  }

  let leftFirst = true;
  let opts: Parameters<typeof mkEdge>[2] = {};
  switch (token) {
    case "<|--":
      opts = { marker: MARK.triangle };
      leftFirst = false;
      break;
    case "..|>":
    case "<|..":
      opts = { marker: MARK.triangle, dashed: true };
      leftFirst = false;
      break;
    case "<--":
      opts = { marker: MARK.openArrow };
      leftFirst = false;
      break;
    case "<..":
      opts = { marker: MARK.openArrow, dashed: true };
      leftFirst = false;
      break;
    case "--*":
      opts = { markerStart: MARK.diamondFilledStart };
      leftFirst = false;
      break;
    case "*--":
      opts = { markerStart: MARK.diamondFilledStart };
      leftFirst = true;
      break;
    case "--o":
      opts = { markerStart: MARK.diamondOpenStart };
      leftFirst = false;
      break;
    case "o--":
      opts = { markerStart: MARK.diamondOpenStart };
      leftFirst = true;
      break;
    case "-->":
      opts = { marker: MARK.openArrow };
      leftFirst = true;
      break;
    case "..>":
      opts = { marker: MARK.openArrow, dashed: true };
      leftFirst = true;
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
  }

  if (finalLabel) opts.label = finalLabel;
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
  const data = { ...(edge.data as object) } as Record<string, unknown>;
  delete data.ambiguous;
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

  if (token.includes("<")) {
    if (token.includes(">")) {
      // Bidirectional - we don't have a specific marker for both ends in this simple setup
      // but we can set markerEnd
      marker = MARK.arrow;
    } else {
      swap = true;
      marker = MARK.arrow;
    }
  }

  if (token.includes("o")) {
    // Mermaid circle end - not supported yet in MARK, fallback to arrow or none
  }

  if (token.includes("x")) {
    // Mermaid x end - not supported yet
  }

  // Check for dashed
  if (token.includes(".") || token.includes("-.")) {
    dashed = true;
  }

  // Check for just line (no arrow)
  if (!token.includes(">") && !token.includes("<")) {
    marker = undefined;
  }

  return { swap, marker, markerStart, dashed };
}

function parseFlowchart(lines: string[]): ParseResult {
  const defs = new Map<string, { label: string; type: string; parentId?: string }>();
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
      const ref = parseRef(trimmed);
      if (ref) {
        // Only set if not already defined OR if this ref provides a better label than just the ID
        const existing = defs.get(ref.id);
        if (!existing || (ref.label !== ref.id)) {
          defs.set(ref.id, { 
            label: ref.label, 
            type: ref.type, 
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

    // --- Find all edge tokens ---
    const edgeTokens: { token: string; pos: number }[] = [];
    const re = new RegExp(FLOW_EDGE_RE.source, "g");
    let em: RegExpExecArray | null;
    while ((em = re.exec(work)) !== null) {
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

      const a = parseRef(fromPart);
      const b = parseRef(toPart);
      if (!a || !b) continue;

      if (!defs.has(a.id)) defs.set(a.id, { label: a.label, type: a.type, parentId: currentParentId });
      if (!defs.has(b.id)) defs.set(b.id, { label: b.label, type: b.type, parentId: currentParentId });

      const style = parseEdgeStyle(edgeTokens[k].token);
      const from = style.swap ? b.id : a.id;
      const to = style.swap ? a.id : b.id;

      rawEdges.push({
        from,
        to,
        label: allLabels[k] ?? "",
        marker: style.marker,
        markerStart: style.markerStart,
        dashed: style.dashed,
      });
    }
  }

  // ── Layout ──
  const ids = [...defs.keys()];
  const posMap = layeredLayout(
      ids,
      rawEdges.map((e) => ({ source: e.from, target: e.to }))
  );

  const nodeMap = new Map<string, string>(); // id -> uid
  const nodes: FlowNode[] = ids.map((id) => {
    const d = defs.get(id)!;
    const p = posMap.get(id) ?? { x: 0, y: 0 };
    const sizes: Record<string, [number, number]> = {
      action: [150, 54],
      decision: [150, 104],
      start: [38, 38],
      final: [40, 40],
      fork: [100, 8],
      actor: [76, 124],
      usecase: [170, 76],
      package: [300, 300],
    };
    const [w, h] = sizes[d.type] ?? [150, 54];
    const uid = parentMap.get(id) || nanoid(8);
    nodeMap.set(id, uid);
    return mkNode(d.type, p.x, p.y, { label: d.label }, w, h, d.parentId, uid);
  });

  const edges: FlowEdge[] = rawEdges
      .map((e) => {
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

  return { nodes, edges, type: "activity" };
}

/* ============================================================
   parseRef — FIXED: all Mermaid node shapes
   ============================================================ */
function parseRef(ref: string):
    | { id: string; label: string; type: string }
    | null {
  const s = ref.trim();
  if (!s) return null;
  let m: RegExpMatchArray | null;

  const getLabelType = (label: string, defaultType: string) => {
    const decoded = decodeMermaid(label);
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
    return { id: m[1], ...lt };
  }

  // Stadium / Use Case:  A([text])
  if ((m = s.match(/^([A-Za-z0-9_]+)\(\[(.+)\]\)$/))) {
    const lt = getLabelType(m[2], "usecase");
    return { id: m[1], ...lt };
  }

  // Subroutine:  A[[text]]
  if ((m = s.match(/^([A-Za-z0-9_]+)\[\[(.+)\]\]$/))) {
    const lt = getLabelType(m[2], "action");
    return { id: m[1], ...lt };
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
    return { id: m[1], ...lt };
  }

  // Parallelogram alt:  A[\text\]
  if ((m = s.match(/^([A-Za-z0-9_]+)\[\\(.+)\\\]$/))) {
    const lt = getLabelType(m[2], "action");
    return { id: m[1], ...lt };
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

/* ---- sequence ---- */
function parseSequence(lines: string[]): ParseResult {
  const parts = new Map<string, { label: string; actor: boolean }>();
  const order: string[] = [];
  const msgs: {
    from: string;
    to: string;
    label?: string;
    dashed?: boolean;
  }[] = [];

  for (const ln of lines) {
    const p = ln.match(/^(?:participant|actor)\s+([A-Za-z0-9_]+)(?:\s+as\s+(.+))?/);
    if (p) {
      const id = p[1];
      if (!parts.has(id)) {
        parts.set(id, { label: p[2]?.trim() ?? id, actor: /^actor\b/.test(ln) });
        order.push(id);
      }
      continue;
    }
    const mm = ln.match(
        /^([A-Za-z0-9_]+)\s*(-+>+|-->>+|->|--x|-)\s*([A-Za-z0-9_]+)\s*:\s*(.*)$/
    );
    if (mm) {
      const [, from, arrow, to, label] = mm;
      [from, to].forEach((id) => {
        if (!parts.has(id)) {
          parts.set(id, { label: id, actor: false });
          order.push(id);
        }
      });
      msgs.push({
        from,
        to,
        label: label?.trim() || "",
        dashed: arrow.includes("-") && arrow.startsWith("--"),
      });
    }
  }

  const nodes: FlowNode[] = [];
  const idToUid = new Map<string, string>();
  order.forEach((id, idx) => {
    const p = parts.get(id)!;
    const uid = nanoid(8);
    idToUid.set(id, uid);
    const x = idx * 220;
    if (p.actor) {
      nodes.push(mkNode("actor", x, 30, { label: p.label }, 76, 124));
    } else {
      nodes.push(
          mkNode("lifeline", x, 20, { label: ": " + p.label }, 150, 320)
      );
    }
  });

  const edges: FlowEdge[] = msgs
      .map((m) => {
        const s = idToUid.get(m.from);
        const t = idToUid.get(m.to);
        if (!s || !t) return null;
        return mkEdge(s, t, {
          marker: m.dashed ? MARK.openArrow : MARK.arrow,
          dashed: m.dashed,
          label: m.label,
          type: "smoothstep",
        });
      })
      .filter(Boolean) as FlowEdge[];

  return { nodes, edges, type: "sequence" };
}

/* ---- state ---- */
function parseState(lines: string[]): ParseResult {
  const defs = new Map<string, string>();
  const rawEdges: { from: string; to: string; label?: string }[] = [];
  for (const ln of lines) {
    const clean = ln.trim();
    if (!clean) continue;
    if (/^statediagram(-v2)?\b/i.test(clean)) continue;

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
    if (!clean.includes("-->") && !clean.includes("[*]")) {
      defs.set(clean, clean);
    }
  }
  
  const ids = [...defs.keys()];
  const pos = layeredLayout(
      ids,
      rawEdges.map((e) => ({ source: e.from, target: e.to }))
  );
  const nodes: FlowNode[] = ids.map((id) => {
    const p = pos.get(id) ?? { x: 0, y: 0 };
    if (id === "__start__")
      return mkNode("start", p.x + 20, p.y, { label: "" }, 38, 38);
    if (id === "__end__")
      return mkNode("final", p.x + 20, p.y, { label: "" }, 40, 40);
    return mkNode("action", p.x, p.y, { label: defs.get(id) ?? id }, 150, 56);
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
  return { nodes, edges, type: "state" };
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

    // Subgraph (system boundary)
    const subgraphMatch = ln.match(/^subgraph\s+(?:"([^"]+)"|([A-Za-z0-9_]+))(?:\s+as\s+([A-Za-z0-9_]+))?/i);
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
      rawEdges.push({ 
        from: fromId, 
        to: toId, 
        label, 
        marker: ln.includes(">") ? MARK.openArrow : undefined,
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
      if (!s || !t) return null;
      return mkEdge(s, t, {
        marker: e.marker,
        markerStart: e.markerStart,
        dashed: e.dashed,
        label: e.label,
        type: e.type
      });
    })
    .filter(Boolean) as FlowEdge[];

  return { nodes, edges, type: "usecase" };
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

    // Component: [Component] or component "Label" as id
    const componentMatch = ln.match(/^component\s+(?:"([^"]+)"|([A-Za-z0-9_]+))(?:\s+as\s+([A-Za-z0-9_]+))?/i);
    const bracketMatch = ln.match(/^\[([^\]]+)\](?:\s+as\s+([A-Za-z0-9_]+))?$/);
    if (componentMatch || bracketMatch) {
      const match = componentMatch || bracketMatch!;
      let label, id;
      if (componentMatch) {
        label = componentMatch[1] || componentMatch[2];
        id = componentMatch[3] || componentMatch[2];
      } else {
        label = bracketMatch[1];
        id = bracketMatch[2] || label.replace(/\s+/g, "_");
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
        id = interfaceMatch[3] || interfaceMatch[2];
      } else {
        label = circleMatch[1] || "Interface";
        id = circleMatch[2] || label.replace(/\s+/g, "_");
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
        id = dbMatch[3] || dbMatch[2];
      } else {
        label = dbBracketMatch[1];
        id = dbBracketMatch[2] || label.replace(/\s+/g, "_");
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

  return { nodes, edges, type: "component" };
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

  const hasComponent = /^\s*component\s/m.test(inner);
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
      const id = noteMatch[3] || nanoid(6);
      ensureNode(id, label, "note");
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
      const id = b[4] || b[3];
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
      const id = n[4] || n[3];
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

      ensureNode(from, from, "actor");
      ensureNode(to, to, "usecase");

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

  return { nodes, edges, type: "usecase" };
}

function parsePlantActivity(lines: string[]): ParseResult {
  const nodes: FlowNode[] = [];
  const rawEdges: { from: string; to: string; label?: string }[] = [];
  const nodeMap = new Map<string, string>();

  const ensureNode = (id: string, label: string, type: string) => {
    if (!nodeMap.has(id)) {
      const uid = nanoid(8);
      nodeMap.set(id, uid);
      let w = 150, h = 54;
      if (type === "start" || type === "final") { w = 40; h = 40; }
      else if (type === "decision") { w = 60; h = 60; }
      else if (type === "fork") { w = 100; h = 8; }
      else if (type === "note") { w = 150; h = 60; }
      nodes.push(mkNode(type, 0, 0, { label }, w, h, undefined, uid));
    }
    return nodeMap.get(id)!;
  };

  let lastId: string | null = null;
  let currentLane: string | null = null;
  const forkStack: string[] = [];
  const decisionStack: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i].trim();
    if (!ln || ln.startsWith("'")) continue;

    // Swimlane: |Lane Name|
    const laneMatch = ln.match(/^\|([^|]+)\|$/);
    if (laneMatch) {
      currentLane = laneMatch[1].trim();
      continue;
    }

    if (ln === "start") {
      lastId = ensureNode("start", "", "start");
      continue;
    }
    if (ln === "stop" || ln === "end") {
      const id = ensureNode("final-" + nanoid(4), "", "final");
      if (lastId) rawEdges.push({ from: lastId, to: id });
      lastId = null;
      continue;
    }

    // Action: :label;
    if (ln.startsWith(":")) {
      let label = ln.slice(1);
      if (label.endsWith(";")) label = label.slice(0, -1);
      label = label.trim();
      if (currentLane) label = `[${currentLane}] ${label}`;

      const id = nanoid(6);
      ensureNode(id, label, "action");
      if (lastId) rawEdges.push({ from: lastId, to: id });
      lastId = id;
      continue;
    }

    // If / Else / Endif
    if (ln.startsWith("if")) {
      const m = ln.match(/if\s*\((.+)\)(?:\s+then\s*\((.+)\))?/i);
      const cond = m ? m[1] : "";
      const id = ensureNode(nanoid(6), cond, "decision");
      if (lastId) rawEdges.push({ from: lastId, to: id });
      decisionStack.push(id);
      lastId = id;
      continue;
    }
    if (ln.startsWith("else") || ln.startsWith("elseif")) {
      const parentDecision = decisionStack[decisionStack.length - 1];
      if (parentDecision) {
        const m = ln.match(/(?:else|elseif)\s*\((.+)\)(?:\s+then\s*\((.+)\))?/i);
        const label = m ? m[2] || m[1] : "No";
        const id = ln.startsWith("elseif")
            ? ensureNode(nanoid(6), m ? m[1] : "", "decision")
            : lastId;
        rawEdges.push({ from: parentDecision, to: id || "", label });
        if (ln.startsWith("elseif")) lastId = id;
      }
      continue;
    }
    if (ln === "endif") {
      decisionStack.pop();
      continue;
    }

    // Fork / Join
    if (ln === "fork") {
      const id = ensureNode(nanoid(6), "", "fork");
      if (lastId) rawEdges.push({ from: lastId, to: id });
      forkStack.push(id);
      lastId = id;
      continue;
    }
    if (ln === "fork again") {
      lastId = forkStack[forkStack.length - 1];
      continue;
    }
    if (ln === "end fork") {
      const joinId = ensureNode(nanoid(6), "", "fork");
      const currentFork = forkStack.pop();
      if (currentFork && lastId) rawEdges.push({ from: lastId, to: joinId });
      lastId = joinId;
      continue;
    }

    // Repeat / While
    if (ln === "repeat") {
      const id = ensureNode(nanoid(6), "Repeat", "action");
      if (lastId) rawEdges.push({ from: lastId, to: id });
      lastId = id;
      continue;
    }
    if (ln.startsWith("repeat while")) {
      const cond = ln.match(/\((.+)\)/)?.[1] || "";
      const id = ensureNode(nanoid(6), cond, "decision");
      if (lastId) rawEdges.push({ from: lastId, to: id, label: "Loop" });
      lastId = id;
      continue;
    }

    // Notes
    if (ln.startsWith("note")) {
      const content =
          ln.match(/note\s+(?:right|left|top|bottom)?\s*:\s*(.+)$/)?.[1] ||
          ln.match(/note\s+(?:right|left|top|bottom)?\s*(.+)$/)?.[1] ||
          "Note";
      const id = ensureNode(nanoid(6), content, "note");
      if (lastId) rawEdges.push({ from: lastId, to: id, label: "note" });
      continue;
    }
  }

  // Build edges (don't do layout here, let caller use layoutElements)
  const edges = rawEdges
      .map(e => {
        const s = nodeMap.get(e.from) || e.from;
        const t = nodeMap.get(e.to) || e.to;
        if (!s || !t) return null;
        return mkEdge(s, t, { marker: MARK.arrow, label: e.label });
      })
      .filter(Boolean) as FlowEdge[];

  return { nodes, edges, type: "activity" };
}

function parsePlantComponent(lines: string[]): ParseResult {
  const comps = new Map<string, { label: string; stereotype?: string; type: string; parentId?: string }>();
  const rawEdges: { from: string; to: string; opts: Parameters<typeof mkEdge>[2] }[] = [];
  const parentStack: string[] = [];
  const nodeMap = new Map<string, string>();

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
      const id = b[4] || b[3];
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
      const id = def[4] || def[3];
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
  const pos = gridLayout(ids.length);
  const nodes: FlowNode[] = ids.map((id, i) => {
    const c = comps.get(id)!;
    const uid = nodeMap.get(id) || nanoid(8);
    let w = 180, h = 92;
    if (c.type === "package") { w = 300; h = 300; }
    return mkNode(c.type, pos(i).x, pos(i).y, { label: c.label, stereotype: c.stereotype }, w, h, c.parentId, uid);
  });

  const idToUid = new Map(nodes.map((n, i) => [ids[i], n.id]));
  const edges: FlowEdge[] = rawEdges
      .map((e) => {
        const s = idToUid.get(e.from);
        const t = idToUid.get(e.to);
        if (!s || !t || s === t) return null;
        return mkEdge(s, t, e.opts);
      })
      .filter(Boolean) as FlowEdge[];

  return { nodes, edges, type: "component" };
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
 * 3. Look for Mermaid keywords: classDiagram, flowchart, sequenceDiagram, etc.
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
      /\bclassDiagram\b/i.test(code) ||
      /\bflowchart\b/i.test(code) ||
      /\bsequenceDiagram\b/i.test(code) ||
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
      /%%[^\n]*/m.test(code) ||
      /-->[\s\S]*\|/m.test(code);

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

export function aiResponseToCanvas(res: DiagramChatResponse): ParseResult {
  const nodes: FlowNode[] = (res.nodes ?? []).map((n) => {
    // Convert DiagramChatResponse's node to AINode format
    const aiNode: AINode = {
      id: n.id,
      type: (n.type || "cls").toLowerCase() as AINodeType,
      label: n.label,
      stereotype: n.stereotype,
      attributes: Array.isArray(n.attributes) ? n.attributes : n.attributes ? n.attributes.split("\n") : undefined,
      methods: Array.isArray(n.methods) ? n.methods : n.methods ? n.methods.split("\n") : undefined,
    };
    // Use our shared aiNodeToFlow function, then set parentId
    const flowNode = aiNodeToFlow(aiNode);
    return { ...flowNode, parentId: n.parentId, extent: n.parentId ? "parent" : undefined };
  });

  const edges: FlowEdge[] = (res.edges ?? []).map((e) => {
    const aiEdge: AIEdge = {
      id: e.id,
      source: e.source,
      target: e.target,
      relation: (e.relation || "association").toLowerCase() as RelationKind,
      label: e.label,
    };
    return aiEdgeToFlow(aiEdge);
  });

  const questions = res.questions
      ? aiQuestionsToImportQuestions(res.questions)
      : undefined;

  const detectedType =
      res.diagramType ||
      (res.summary?.toLowerCase().includes("use case") ? "usecase" : undefined);

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
  sequenceMermaid: {
    title: "Sequence (Mermaid)",
    format: "mermaid",
    code: `sequenceDiagram
actor User
participant App
participant API
User->>App: open()
App->>API: fetch()
API-->>App: data
App-->>User: render`,
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