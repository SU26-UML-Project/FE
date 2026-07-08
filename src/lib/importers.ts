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
  type: string,
  x: number,
  y: number,
  data: FlowNodeData,
  w: number,
  h: number,
  parentId?: string,
  id?: string
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
  s: string,
  t: string,
  o: {
    marker?: string;
    markerStart?: string;
    dashed?: boolean;
    label?: string;
    type?: FlowEdge["type"];
    /** marks an ambiguous relationship the AI wants the user to confirm */
    ambiguous?: boolean;
    fromName?: string;
    toName?: string;
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
      ambiguous: !!o.ambiguous,
      fromName: o.fromName,
      toName: o.toName,
    },
  };
}

/* ---------------- layout helpers ---------------- */
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
  const incoming = new Map<string, number>();
  ids.forEach((id) => incoming.set(id, 0));
  edges.forEach((e) => incoming.set(e.target, (incoming.get(e.target) ?? 0) + 1));
  const roots = ids.filter((id) => (incoming.get(id) ?? 0) === 0);
  const start = roots.length ? roots : ids.slice(0, 1);

  const level = new Map<string, number>();
  const queue = start.map((id) => ({ id, l: 0 }));
  const seen = new Set<string>();
  while (queue.length) {
    const { id, l } = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    level.set(id, Math.max(level.get(id) ?? l, l));
    edges
      .filter((e) => e.source === id)
      .forEach((e) =>
        queue.push({ id: e.target, l: (level.get(id) ?? 0) + 1 })
      );
  }
  // any node not reached → level 0
  ids.forEach((id) => level.set(id, level.get(id) ?? 0));

  const byLevel = new Map<number, string[]>();
  ids.forEach((id) => {
    const l = level.get(id)!;
    if (!byLevel.has(l)) byLevel.set(l, []);
    byLevel.get(l)!.push(id);
  });
  const pos = new Map<string, { x: number; y: number }>();
  const colW = 240;
  const rowH = 150;
  for (const [l, group] of byLevel) {
    group.forEach((id, i) => {
      pos.set(id, {
        x: l * colW,
        y: i * rowH - ((group.length - 1) * rowH) / 2,
      });
    });
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
  const clean = code
    .replace(/%%[^\n]*/g, "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (!clean.length) return { nodes: [], edges: [] };

  const head = clean[0].toLowerCase();
  if (head.startsWith("classdiagram")) return parseClassLike(clean, false);
  if (head.startsWith("sequencediagram")) return parseSequence(clean);
  if (head.startsWith("flowchart") || head.startsWith("graph"))
    return parseFlowchart(clean);
  if (head.startsWith("statediagram")) return parseState(clean);
  // No header — guess.
  if (/\bclass\b|\}<\|--|\*--|o--/.test(code)) return parseClassLike(clean, false);
  if (/-+>+|->>+|-->>/.test(code)) return parseSequence(clean);
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
  while (i < lines.length) {
    const line = lines[i];
    const cd = line.match(classRe);
    if (cd) {
      const id = cd[1];
      const isInterface = /^interface\b/.test(line);
      const c = ensure(id, id);
      if (isInterface) c.stereotype = "«interface»";
      if (cd[2]) {
        // block members until closing brace
        i++;
        while (i < lines.length && lines[i] !== "}") {
          pushMember(c, lines[i]);
          i++;
        }
      } else {
        // plantuml inline members:  Foo : +bar()
        i++;
        while (
          i < lines.length &&
          /^([A-Za-z0-9_]+)\s*:\s*(.+)/.test(lines[i]) &&
          !lines[i].includes("--")
        ) {
          const mm = lines[i].match(/^([A-Za-z0-9_]+)\s*:\s*(.+)/);
          if (mm) {
            const target = ensure(mm[1]);
            pushMember(target, mm[2].trim());
          }
          i++;
        }
        continue;
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

  // Handle {static} and {abstract}
  if (line.includes("{static}")) {
    line = line.replace("{static}", "").trim();
    line = "static " + line; // Or we could use a special marker if we had one
  }
  if (line.includes("{abstract}")) {
    line = line.replace("{abstract}", "").trim();
    line = "abstract " + line;
  }

  // normalise visibility prefix spacing: "+name" -> "+ name"
  line = line.replace(/^([+\-#~])\s*/, "$1 ");
  if (/\(.*\)/.test(line)) c.methods.push(line);
  else c.attrs.push(line);
}

/* Parse a relationship line into from/to/edge-opts.
   Handles mermaid & plantuml arrow tokens.
   Supports multiplicity: ClassA "1" *-- "many" ClassB */
function parseRelLine(line: string):
  | { from: string; to: string; opts: Parameters<typeof mkEdge>[2] }
  | null {
  // Regex to support optional multiplicity in quotes: ClassA "1" *-- "many" ClassB
  const m = line.match(
    /^\s*([A-Za-z0-9_]+)(?:\s+"([^"]+)")?\s*(<\|--|\.\.\|>|<\|\.\.|\*--|--\*|o--|--o|-->|<--|\.\.>|<\.\.|---|<==|==>|--|<\|)\s*(?:"([^"]+)"\s+)?([A-Za-z0-9_]+)(?:\s*:\s*(.*))?$/
  );
  if (!m) return null;
  const [, leftId, leftMulti, token, rightMulti, rightId, labelRaw] = m;
  const label = labelRaw?.trim() ?? "";
  
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
      leftFirst = false; // child(on right) -> parent(on left)
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
      // plain association — genuinely ambiguous in a class context
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

/* Generate HITL questions from ambiguous edges (class / component only).
   Dedupes by the (from,to) pair. Each relationship is a single-select
   question; to demonstrate multiple-select, the first one also gets a
   "modifiers" question bound to the same edge. */
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
      prompt: `What is the relationship from “${a}” to “${b}”?`,
      detail: "plain line — no arrowhead detected",
      multiple: false,
      options: RELATION_OPTIONS.map((o) => ({ ...o })),
    });
    if (!addedMulti) {
      addedMulti = true;
      qs.push({
        id: nanoid(6),
        edgeId: e.id,
        prompt: `Which modifiers apply to “${a} → ${b}”?`,
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
    // Other (single-select): custom text → keyword → marker, else label.
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
 * Apply human-in-the-loop answers to a parse result. An edge may have several
 * linked questions (e.g. a relationship + its modifiers); each is applied in
 * order. Single-select "Other" answers map to a marker by keyword when possible.
 */
export function applyAnswers(
  result: ParseResult,
  answers: Record<string, Answer>
): ParseResult {
  const qs = result.questions ?? [];
  
  // 1. Patch edges if questions are linked to edges
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

  // 2. We could also patch nodes or diagram type here if needed
  // For now, we just return the updated edges and the same nodes
  return { ...result, edges };
}

/* ---- flowchart ---- */
function parseFlowchart(lines: string[]): ParseResult {
  const defs = new Map<string, { label: string; type: string }>();
  const rawEdges: { from: string; to: string; label?: string }[] = [];

  for (const ln of lines) {
    if (/^(flowchart|graph)\b/i.test(ln)) continue;
    if (!ln.includes("-")) {
      // standalone node def
      const ref = parseRef(ln);
      if (ref) defs.set(ref.id, { label: ref.label, type: ref.type });
      continue;
    }
    // edge line — extract |label|
    let label = "";
    let work = ln;
    const lab = work.match(/\|([^|]*)\|/);
    if (lab) {
      label = lab[1].trim();
      work = work.replace(/\|[^|]*\|/, "");
    }
    const mid = work.match(/--\s+([^-<>]+?)\s+--?>/);
    if (mid && !label) label = mid[1].trim();
    const segs = work
      .split(/--?>|<--?|---|\.\.>|==>/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (segs.length >= 2) {
      for (let k = 0; k < segs.length - 1; k++) {
        const a = parseRef(segs[k]);
        const b = parseRef(segs[k + 1]);
        if (a && b) {
          defs.set(a.id, { label: a.label, type: a.type });
          defs.set(b.id, { label: b.label, type: b.type });
          rawEdges.push({ from: a.id, to: b.id, label });
        }
      }
    } else {
      const ref = parseRef(ln);
      if (ref) defs.set(ref.id, { label: ref.label, type: ref.type });
    }
  }

  const ids = [...defs.keys()];
  const pos = layeredLayout(
    ids,
    rawEdges.map((e) => ({ source: e.from, target: e.to }))
  );
  const nodes: FlowNode[] = ids.map((id) => {
    const d = defs.get(id)!;
    const p = pos.get(id) ?? { x: 0, y: 0 };
    const sizes: Record<string, [number, number]> = {
      action: [150, 54],
      decision: [150, 104],
      start: [38, 38],
      final: [40, 40],
    };
    const [w, h] = sizes[d.type] ?? [150, 54];
    return mkNode(d.type, p.x, p.y, { label: d.label }, w, h);
  });
  const idToUid = new Map(nodes.map((n, i) => [ids[i], n.id]));
  const edges: FlowEdge[] = rawEdges
    .map((e) => {
      const s = idToUid.get(e.from);
      const t = idToUid.get(e.to);
      if (!s || !t || s === t) return null;
      return mkEdge(s, t, { marker: MARK.arrow, label: e.label });
    })
    .filter(Boolean) as FlowEdge[];

  return { nodes, edges, type: "activity" };
}

function parseRef(ref: string):
  | { id: string; label: string; type: string }
  | null {
  const s = ref.trim();
  if (!s) return null;
  let m: RegExpMatchArray | null;
  if ((m = s.match(/^([A-Za-z0-9_]+)\(\((.+)\)\)$/)))
    return { id: m[1], label: m[2], type: "action" };
  if ((m = s.match(/^([A-Za-z0-9_]+)\(\[(.+)\]\)$/)))
    return { id: m[1], label: m[2], type: "action" };
  if ((m = s.match(/^([A-Za-z0-9_]+)\[\[(.+)\]\]$/)))
    return { id: m[1], label: m[2], type: "action" };
  if ((m = s.match(/^([A-Za-z0-9_]+)\{\{(.+)\}\}$/)))
    return { id: m[1], label: m[2], type: "action" };
  if ((m = s.match(/^([A-Za-z0-9_]+)\{(.+)\}$/)))
    return { id: m[1], label: m[2], type: "decision" };
  if ((m = s.match(/^([A-Za-z0-9_]+)\((.+)\)$/)))
    return { id: m[1], label: m[2], type: "action" };
  if ((m = s.match(/^([A-Za-z0-9_]+)\[(.+)\]$/)))
    return { id: m[1], label: m[2], type: "action" };
  if ((m = s.match(/^([A-Za-z0-9_]+)$/)))
    return { id: m[1], label: m[1], type: "action" };
  const id = s.match(/^([A-Za-z0-9_]+)/)?.[1] ?? nanoid(4);
  return {
    id,
    label: s.replace(/[^\w\s]/g, "").trim() || id,
    type: "action",
  };
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
        mkNode("lifeline", x, 20, { label: ": " + p.label }, 150, 320, )
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
    if (/^statediagram\b/i.test(ln)) continue;
    const t = ln.match(/^\[\*\]\s*-->\s*(.+)/);
    if (t) {
      defs.set("__start__", "");
      rawEdges.push({ from: "__start__", to: t[1].trim() });
      continue;
    }
    const m = ln.match(/^([^\s:>-]+)\s*-->\s*([^\s:]+)(?:\s*:\s*(.+))?/);
    if (m) {
      defs.set(m[1], m[1]);
      defs.set(m[2], m[2]);
      rawEdges.push({ from: m[1], to: m[2], label: m[3]?.trim() });
    } else {
      const r = parseRef(ln);
      if (r) defs.set(r.id, r.label);
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
  const rawEdges: { from: string; to: string; label?: string; dashed?: boolean; marker?: string }[] = [];
  const nodeMap = new Map<string, string>();
  const parentStack: string[] = [];

  const ensureNode = (id: string, label: string, type: string, parentId?: string) => {
    if (!nodeMap.has(id)) {
      const uid = nanoid(8);
      nodeMap.set(id, uid);
      let w = 140, h = 70;
      if (type === "actor") { w = 76; h = 124; }
      else if (type === "package" || type === "package") { w = 300; h = 300; }
      else if (type === "note") { w = 150; h = 60; }
      
      const cleanLabel = label.replace(/\\n/g, "\n");
      nodes.push(mkNode(type, 0, 0, { label: cleanLabel }, w, h, parentId, uid));
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i].trim();
    if (!ln || ln.startsWith("'") || ln.startsWith("skinparam") || ln.startsWith("left to right")) continue;

    // Notes: note "Label" as N1 OR note right of UC1 : Label
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
        rawEdges.push({ from: noteId, to: targetId, dashed: true });
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

    // Relationships: A1 --> UC1 : label, UC1 ..> UC2 : <<include>>
    // Supports: -->, ..>, <-->, <.., etc.
    const r = ln.match(/^([A-Za-z0-9_]+)\s*([-.]+)(?:up|down|left|right)*([-.]*)>\s*([A-Za-z0-9_]+)(?:\s*:\s*(.+))?/);
    const rRev = ln.match(/^([A-Za-z0-9_]+)\s*<([-.]+)(?:up|down|left|right)*([-.]*)\s*([A-Za-z0-9_]+)(?:\s*:\s*(.+))?/);
    
    if (r || rRev) {
      const from = r ? r[1] : rRev![4];
      const to = r ? r[4] : rRev![1];
      const arrow = r ? r[2] + r[3] : rRev![2] + rRev![3];
      let label = (r ? r[5] : rRev![5])?.trim() || "";
      
      // Auto-label for include/extend if found in line but not as explicit label
      if (!label && ln.includes("<<include>>")) label = "<<include>>";
      if (!label && ln.includes("<<extend>>")) label = "<<extend>>";

      ensureNode(from, from, "actor"); 
      ensureNode(to, to, "usecase");
      
      const dashed = arrow.includes(".") || label.includes("include") || label.includes("extend");
      rawEdges.push({ 
        from, 
        to, 
        label, 
        dashed, 
        marker: MARK.openArrow 
      });
    }
  }

  // Layout
  const pos = gridLayout(nodes.length);
  nodes.forEach((n, i) => {
    if (!n.position.x && !n.position.y) {
      n.position = pos(i);
    }
  });

  const edges = rawEdges.map(e => {
    const s = nodeMap.get(e.from);
    const t = nodeMap.get(e.to);
    if (!s || !t) return null;
    return mkEdge(s, t, { 
      marker: e.marker, 
      dashed: e.dashed, 
      label: e.label 
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

    // Start / Stop
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
      const label = m ? m[2] : "Yes";
      const id = ensureNode(nanoid(6), cond, "decision");
      if (lastId) rawEdges.push({ from: lastId, to: id });
      decisionStack.push(id);
      lastId = id;
      // Note: we'll use 'label' for the NEXT edge
      continue;
    }
    if (ln.startsWith("else") || ln.startsWith("elseif")) {
      const parentDecision = decisionStack[decisionStack.length - 1];
      if (parentDecision) {
        const m = ln.match(/(?:else|elseif)\s*\((.+)\)(?:\s+then\s*\((.+)\))?/i);
        const label = m ? m[2] || m[1] : "No";
        const id = ln.startsWith("elseif") ? ensureNode(nanoid(6), m ? m[1] : "", "decision") : lastId;
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
      const content = ln.match(/note\s+(?:right|left|top|bottom)?\s*:\s*(.+)$/)?.[1] || 
                      ln.match(/note\s+(?:right|left|top|bottom)?\s*(.+)$/)?.[1] || "Note";
      const id = ensureNode(nanoid(6), content, "note");
      if (lastId) rawEdges.push({ from: lastId, to: id, label: "note" });
      continue;
    }
  }

  // Layout: Use layeredLayout for activity diagrams
  const ids = nodes.map(n => n.id);
  const posMap = layeredLayout(ids, rawEdges.map(e => ({ source: e.from, target: e.to })));
  
  nodes.forEach(n => {
    const p = posMap.get(n.id);
    if (p) {
      n.position = p;
    }
  });

  const edges = rawEdges.map(e => {
    const s = nodeMap.get(e.from) || e.from;
    const t = nodeMap.get(e.to) || e.to;
    return mkEdge(s, t, { marker: MARK.arrow, label: e.label });
  });

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
    // Support shorthands in relationships: [A] -> () B
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
          label 
        } 
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
   DISPATCHER
   ============================================================ */
export function detectAndParse(text: string): ParseResult & { format: string } {
  const fence = text.match(/```(?:plantuml|pu|puml)?\n([\s\S]*?)```/i);
  const code = fence ? fence[1] : text;
  
  const base = parsePlantUml(code);
  const format = "PlantUML";
  const questions = buildQuestions(base);
  return { ...base, format, questions };
}

/* ============================================================
   AI RESPONSE CONVERSION
   ============================================================ */
export function aiResponseToCanvas(res: DiagramChatResponse): ParseResult {
  const nodes: FlowNode[] = (res.nodes ?? []).map((n) => {
    const data: FlowNodeData = {
      label: n.label,
      stereotype: n.stereotype,
      attributes: Array.isArray(n.attributes) ? n.attributes.join("\n") : "",
      methods: Array.isArray(n.methods) ? n.methods.join("\n") : "",
    };
    
    // Default sizes based on type
    let w = 150;
    let h = 60;
    const type = (n.type || 'cls').toLowerCase();
    if (type === 'actor') { w = 76; h = 124; }
    else if (type === 'package' || type === 'rectangle') { w = 300; h = 300; }
    else if (type === 'usecase') { w = 140; h = 70; }
    else if (type === 'decision') { w = 150; h = 104; }
    else if (type === 'start' || type === 'final') { w = 40; h = 40; }
    
    return mkNode(n.type, 0, 0, data, w, h, n.parentId, n.id);
  });

  const edges: FlowEdge[] = (res.edges ?? []).map((e) => {
    const relation = (e.relation || "").toLowerCase();
    let marker = MARK.none;
    let markerStart = MARK.none;
    let dashed = false;

    // Robust mapping for various relation keywords
    if (/inherit|extend|general|is-a/.test(relation)) {
      marker = MARK.triangle;
    } else if (/realiz|implement/.test(relation)) {
      marker = MARK.triangle;
      dashed = true;
    } else if (/compos/.test(relation)) {
      markerStart = MARK.diamondFilledStart;
    } else if (/aggreg/.test(relation)) {
      markerStart = MARK.diamondOpenStart;
    } else if (/associat|use|has|include|link/.test(relation)) {
      marker = MARK.openArrow;
    } else if (/depend/.test(relation)) {
      marker = MARK.openArrow;
      dashed = true;
    } else if (/flow|transition|step|next/.test(relation)) {
      marker = MARK.arrow;
    }

    if (relation === "include" || relation === "extend" || /include|extend/.test(e.label || "")) {
      dashed = true;
    }

    return mkEdge(e.source, e.target, {
      marker,
      markerStart,
      dashed,
      label: e.label || (relation === "include" ? "«include»" : relation === "extend" ? "«extend»" : ""),
    });
  });

  const questions = res.questions ? aiQuestionsToImportQuestions(res.questions) : undefined;
  
  // Use diagramType from AI if provided, else fallback to summary detection
  const detectedType = res.diagramType || (res.summary?.toLowerCase().includes("use case") ? "usecase" : undefined);

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
      // Map relation to markers for QuestionCard logic
      const relation = (o.relation || "").toLowerCase();
      let marker = MARK.none;
      let markerStart = MARK.none;
      let dashed = false;
      
      if (relation === "inheritance") marker = MARK.triangle;
      else if (relation === "realization") { marker = MARK.triangle; dashed = true; }
      else if (relation === "composition") markerStart = MARK.diamondFilledStart;
      else if (relation === "aggregation") markerStart = MARK.diamondOpenStart;
      else if (relation === "association") marker = MARK.openArrow;
      else if (relation === "dependency") { marker = MARK.openArrow; dashed = true; }

      return {
        label: o.label,
        marker,
        markerStart,
        dashed
      };
    })
  }));
}

/* ============================================================
   EXAMPLES (for quick-action chips)
   ============================================================ */
export const EXAMPLES: Record<string, { title: string; code: string; format: "mermaid" | "plantuml" }> = {
  classMermaid: {
    title: "Class (Mermaid)",
    format: "mermaid",
    code: `classDiagram
class Vehicle {
  +String brand
  +int speed
  +start() void
  +stop() void
}
class Engine {
  +int horsepower
  +ignite() void
}
class Car {
  +String model
  +drive() void
}
Vehicle <|-- Car
Vehicle *-- Engine`,
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
  // Plain associations (no arrowheads) → triggers the QuestionBox flow.
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
