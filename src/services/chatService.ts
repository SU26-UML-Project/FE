/**
 * AI Chat service — STUB (no backend yet).
 *
 * Implement these against your LLM backend. The FE calls `sendChat()` from
 * AIChat.tsx; the return shape must match the `ChatReply` union below so the
 * UI can route the response to the right place (reply text / diagram / HITL).
 *
 * See docs/SYSTEM_PROMPT.md for the system prompt + JSON contract.
 */
import type { ChatMsg, DiagramType, FlowEdge, FlowNode } from "../types";
import type { ImportQuestion } from "../lib/importers";

export type ChatReply =
  | { kind: "reply"; text: string }
  | {
      kind: "diagram";
      format: "mermaid" | "plantuml" | "raw";
      code?: string;
      nodes?: FlowNode[];
      edges?: FlowEdge[];
      type?: DiagramType;
      summary: string;
    }
  | { kind: "questions"; summary: string; questions: ImportQuestion[] };

export interface ChatRequest {
  message: string;
  diagramType: DiagramType;
  history: ChatMsg[];
}

// export async function sendChat(req: ChatRequest): Promise<ChatReply> {
//   const res = await fetch("/api/chat", {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify(req),
//   });
//   if (!res.ok) throw new Error("chat failed");
//   return (await res.json()) as ChatReply;
// }

/**
 * Streaming variant (preferred UX): the LLM streams partial text first, then a
 * final `ChatReply` JSON describing the diagram / questions. Uncomment once the
 * backend supports SSE.
 */
// export async function streamChat(
//   req: ChatRequest,
//   onToken: (t: string) => void
// ): Promise<ChatReply> { /* ... */ }

/**
 * Parse-only helper: ask the backend to parse source code into a ParseResult.
 * Until the backend exists, the FE falls back to the local parser
 * (`detectAndParse` in lib/importers.ts).
 */
// export async function parseSource(
//   code: string,
//   format: "mermaid" | "plantuml"
// ): Promise<ParseResult> { /* ... */ }

export {};
