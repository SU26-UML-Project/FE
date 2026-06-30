/**
 * anythingllmService — AI interaction layer (AnythingLLM / LLM backend).
 *
 * AI Interaction Flow (steps 2–4):
 *   1. User types in AIChatPanel → sendChat() forwards to the LLM.
 *   2. Response comes back as one of:
 *        - reply   (plain text)
 *        - diagram (Mermaid / PlantUML / raw nodes) → parsed → drawn on canvas
 *        - questions (HITL) → QuestionBox shown
 *
 * Until the backend exists, this is a STUB. The FE currently parses Mermaid/
 * PlantUML locally (lib/importers.ts) and keyword-matches prompts (panels/
 * AIChat.tsx). Replace `sendChat` with a real fetch when the API is ready.
 *
 * See docs/SYSTEM_PROMPT.md for the JSON contract the backend must return.
 */
import type { ChatMsg, DiagramType, FlowEdge, FlowNode } from "../types";
import type { ImportQuestion } from "../lib/importers";
import apiClient from './apiClient';
import type { ApiResponse } from '../types/api';
import type { DiagramChatRequest, DiagramChatResponse, ChatSession } from '../types/ai';

/** Discriminated union the backend MUST return (matches docs/SYSTEM_PROMPT.md). */
export type AIResponse =
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

export const anythingllmService = {
  // Gửi tin nhắn chat và nhận phản hồi (UML AI Chat)
  sendChat: async (data: DiagramChatRequest): Promise<ApiResponse<DiagramChatResponse>> => {
    return apiClient.post<any, ApiResponse<DiagramChatResponse>>('/ai/chat', data);
  },

  // Alias for sendChat to match GlobalAIChatSidebar
  sendDiagramChat: async (data: DiagramChatRequest): Promise<ApiResponse<DiagramChatResponse>> => {
    return apiClient.post<any, ApiResponse<DiagramChatResponse>>('/ai/chat', data);
  },

  // Lấy lịch sử chat của một session
  getChatHistory: async (sessionId: string): Promise<ApiResponse<any[]>> => {
    return apiClient.get<any, ApiResponse<any[]>>(`/ai/sessions/${sessionId}/history`);
  },

  // Tạo session chat mới
  createChatSession: async (): Promise<ApiResponse<ChatSession>> => {
    return apiClient.post<any, ApiResponse<ChatSession>>('/ai/sessions');
  },

  // Lấy danh sách tất cả các sessions của user
  getChatSessions: async (): Promise<ApiResponse<ChatSession[]>> => {
    return apiClient.get<any, ApiResponse<ChatSession[]>>('/ai/sessions');
  },

  // Xóa một session chat
  deleteChatSession: async (sessionId: string): Promise<ApiResponse<void>> => {
    return apiClient.delete<any, ApiResponse<void>>(`/ai/sessions/${sessionId}`);
  }
};

/**
 * Streaming variant (preferred UX): the LLM streams tokens, then sends a final
 * AIResponse JSON describing the diagram / questions. Uncomment when the
 * backend supports Server-Sent Events.
 */
// export async function streamChat(
//   req: ChatRequest,
//   onToken: (t: string) => void
// ): Promise<AIResponse> { /* SSE ... */ }

export {};
