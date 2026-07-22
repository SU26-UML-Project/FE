import { nanoid } from "nanoid";
import type { DiagramType, FlowEdge, FlowNode, Sheet } from "../types";
import { sampleFor } from "../shared/lib/diagrams";
import { STORAGE_KEYS } from "../shared/config";

const { sheets: SHEETS_KEY, activeSheet: ACTIVE_KEY, legacyDiagram: LEGACY_KEY } =
  STORAGE_KEYS;

function isFlowNode(n: unknown): n is FlowNode {
  return !!n && typeof n === "object" && "id" in n && "position" in n;
}

function isFlowNodeArray(n: unknown): n is FlowNode[] {
  return Array.isArray(n) && n.length > 0 && isFlowNode(n[0]);
}

/** Load all sheets, migrating from the legacy single-diagram format once. */
export function loadSheets(): Sheet[] {
  try {
    const raw = localStorage.getItem(SHEETS_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        const sheets = arr
          .filter((s) => s && isFlowNodeArray(s.nodes))
          .map((s: Record<string, unknown>) => s as unknown as Sheet);
        if (sheets.length) return sheets;
      }
    }
  } catch {
    /* ignore */
  }
  try {
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const data = JSON.parse(legacy);
      if (isFlowNodeArray(data.nodes)) {
        const sample: Sheet = {
          id: nanoid(8),
          name: "Diagram",
          diagramType: (data.diagramType as DiagramType) ?? "activity",
          nodes: data.nodes,
          edges: (data.edges as FlowEdge[]) ?? [],
          updatedAt: Date.now(),
        };
        saveSheets([sample]);
        saveActiveId(sample.id);
        localStorage.removeItem(LEGACY_KEY);
        return [sample];
      }
    }
  } catch {
    /* ignore */
  }
  const s = sampleFor("activity");
  const seed: Sheet = {
    id: nanoid(8),
    name: "Activity",
    diagramType: "activity",
    nodes: s.nodes,
    edges: s.edges,
    updatedAt: Date.now(),
  };
  saveSheets([seed]);
  saveActiveId(seed.id);
  return [seed];
}

export function saveSheets(sheets: Sheet[]) {
  localStorage.setItem(SHEETS_KEY, JSON.stringify(sheets));
}

export function loadActiveId(): string | null {
  return localStorage.getItem(ACTIVE_KEY);
}

export function saveActiveId(id: string) {
  localStorage.setItem(ACTIVE_KEY, id);
}

export function nextSheetName(sheets: Sheet[]): string {
  let i = sheets.length + 1;
  const taken = new Set(sheets.map((s) => s.name));
  while (taken.has(`Diagram ${i}`)) i++;
  return `Diagram ${i}`;
}

export function createSheet(sheets: Sheet[]): Sheet {
  return {
    id: nanoid(8),
    name: nextSheetName(sheets),
    diagramType: "activity",
    nodes: [],
    edges: [],
    updatedAt: Date.now(),
  };
}
