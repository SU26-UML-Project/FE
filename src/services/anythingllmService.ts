/**
 * anythingllmService — AI interaction layer (AnythingLLM / LLM backend).
 */
import type { ChatMsg, DiagramType } from "../types";
import apiClient from '../shared/api/apiClient';
import type { ApiResponse, PagedResponse } from '../types/api';
import type { DiagramChatRequest, DiagramChatResponse, ChatSession, ChatMessage } from '../types/ai';

export interface ChatRequest {
  message: string;
  diagramType: DiagramType;
  history: ChatMsg[];
}

export const anythingllmService = {
  // Gửi tin nhắn chat và nhận phản hồi (UML AI Chat)
  sendChat: async (data: DiagramChatRequest): Promise<ApiResponse<DiagramChatResponse>> => {
    return apiClient.post<any, ApiResponse<DiagramChatResponse>>('/diagram-ai/chat', data);
  },

  // Alias for sendChat to match GlobalAIChatSidebar
  sendDiagramChat: async (data: DiagramChatRequest): Promise<ApiResponse<DiagramChatResponse>> => {
    return apiClient.post<any, ApiResponse<DiagramChatResponse>>('/diagram-ai/chat', data);
  },

  // Lấy lịch sử chat của một session (phân trang, cũ → mới)
  getChatHistory: async (
    sessionId: string,
    page = 0,
    size = 50,
  ): Promise<ApiResponse<PagedResponse<ChatMessage>>> => {
    return apiClient.get<any, ApiResponse<PagedResponse<ChatMessage>>>(
      `/diagram-ai/chat/sessions/${sessionId}/messages?page=${page}&size=${size}`,
    );
  },

  // Tạo session chat mới
  createChatSession: async (): Promise<ApiResponse<ChatSession>> => {
    return apiClient.post<any, ApiResponse<ChatSession>>('/diagram-ai/chat/sessions');
  },

  // Lấy danh sách tất cả các sessions của user (phân trang, mới nhất trước)
  getChatSessions: async (page = 0, size = 20): Promise<ApiResponse<PagedResponse<ChatSession>>> => {
    return apiClient.get<any, ApiResponse<PagedResponse<ChatSession>>>(
      `/diagram-ai/chat/sessions?page=${page}&size=${size}`,
    );
  },
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
