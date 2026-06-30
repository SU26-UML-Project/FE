/**
 * Template service — STUB (no backend yet).
 *
 * The FE currently uses the hardcoded `EXAMPLES` (lib/importers.ts) for the AI
 * chat chips + the 6 built-in samples in `sampleFor()`. Implement these to
 * serve a richer template gallery from the backend.
 */
import type { DiagramType } from "../types";

export interface DiagramTemplate {
  id: string;
  title: string;
  type: DiagramType;
  format: "mermaid" | "plantuml";
  code: string;
}

// const BASE = "/api/templates";

// export async function listTemplates(): Promise<DiagramTemplate[]> {
//   const res = await fetch(BASE);
//   return res.json();
// }

// export async function getTemplatesByType(type: DiagramType): Promise<DiagramTemplate[]> {
//   const res = await fetch(`${BASE}?type=${type}`);
//   return res.json();
// }

export {};
