import type { RelationKind } from "../types/aiContract";

const M = {
  arrow: "url(#m-arrow)",
  openArrow: "url(#m-arrow-open)",
  triangle: "url(#m-triangle)",
  diamondFilledStart: "url(#m-diamond-filled-start)",
  diamondOpenStart: "url(#m-diamond-open-start)",
  none: "",
} as const;

export interface ResolvedRelation {
  marker: string;
  markerStart: string;
  dashed: boolean;
  autoLabel?: string;
  pathType: "smoothstep" | "bezier" | "straight";
}

const MAP: Record<RelationKind, ResolvedRelation> = {
  inheritance: { marker: M.triangle, markerStart: "", dashed: false, pathType: "smoothstep" },
  realization: { marker: M.triangle, markerStart: "", dashed: true, pathType: "smoothstep" },
  association: { marker: M.openArrow, markerStart: "", dashed: false, pathType: "smoothstep" },
  aggregation: { marker: "", markerStart: M.diamondOpenStart, dashed: false, pathType: "smoothstep" },
  composition: { marker: "", markerStart: M.diamondFilledStart, dashed: false, pathType: "smoothstep" },
  dependency: { marker: M.openArrow, markerStart: "", dashed: true, pathType: "smoothstep" },
  include: { marker: M.openArrow, markerStart: "", dashed: true, autoLabel: "«include»", pathType: "bezier" },
  extend: { marker: M.openArrow, markerStart: "", dashed: true, autoLabel: "«extend»", pathType: "bezier" },
  "control-flow": { marker: M.arrow, markerStart: "", dashed: false, pathType: "smoothstep" },
  transition: { marker: M.arrow, markerStart: "", dashed: false, pathType: "smoothstep" },
  "self-transition": { marker: M.arrow, markerStart: "", dashed: false, pathType: "bezier" },
  "note-link": { marker: "", markerStart: "", dashed: true, pathType: "bezier" },
};

export function resolveRelation(kind: RelationKind): ResolvedRelation {
  return MAP[kind] ?? MAP.association;
}
