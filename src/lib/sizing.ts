import type { FlowNodeData } from "../types";

const MONO_CHAR_W = 7.6;
const SANS_CHAR_W = 8.2;

export function classMinSize(d: FlowNodeData): { w: number; h: number } {
  const label = d.label || "";
  const stereo = d.stereotype || "";
  const attrs = (d.attributes || "").split("\n");
  const methods = (d.methods || "").split("\n");
  const all = [label, stereo, ...attrs, ...methods];
  const maxLen = Math.max(6, ...all.map((l) => (l || "").length));
  const w = Math.min(380, Math.max(150, Math.ceil(maxLen * MONO_CHAR_W) + 34));
  const attrH = Math.max(22, attrs.length * 16 + 10);
  const methodH = Math.max(22, methods.length * 16 + 10);
  const headerH = stereo ? 42 : 32;
  const h = headerH + attrH + methodH;
  return { w, h };
}

export function actionMinSize(label: string): { w: number; h: number } {
  const lines = (label || "").split("\n");
  const maxLen = Math.max(4, ...lines.map((l) => (l || "").length));
  return {
    w: Math.max(90, Math.ceil(maxLen * SANS_CHAR_W) + 48),
    h: Math.max(40, lines.length * 18 + 20)
  };
}

export function noteMinSize(d: FlowNodeData): { w: number; h: number } {
  const lines = (d.label || "").split("\n");
  const maxLen = Math.max(4, ...lines.map((l) => (l || "").length));
  return {
    w: Math.max(120, Math.ceil(maxLen * SANS_CHAR_W) + 28),
    h: Math.max(60, lines.length * 17 + 24),
  };
}

export function componentMinSize(d: FlowNodeData): { w: number; h: number } {
  const label = d.label || "";
  const stereo = d.stereotype || "";
  const maxLen = Math.max(8, label.length, stereo.length);
  return {
    w: Math.min(320, Math.max(150, Math.ceil(maxLen * SANS_CHAR_W) + 56)),
    h: Math.max(74, stereo ? 78 : 64),
  };
}

/** Default size for an Activity swimlane (UML partition). Always horizontal.
 *  finalizeLayout / ELK will grow the lane to fit its child nodes. */
export function swimlaneMinSize(_d: FlowNodeData): { w: number; h: number } {
  return { w: 480, h: 130 };
}
