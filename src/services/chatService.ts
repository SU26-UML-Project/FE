import apiClient from '../shared/api/apiClient';
import type { ApiResponse, PagedResponse } from '../types/api';
import type {
  DiagramChatRequest,
  DiagramChatResponse,
  ChatSession,
  ChatMessage,
} from "../types/ai";

export const chatService = {
  /**
   * Gửi tin nhắn chat tới AI
   */
  sendChat: async (req: DiagramChatRequest): Promise<ApiResponse<DiagramChatResponse>> => {
    return apiClient.post<any, ApiResponse<DiagramChatResponse>>("/diagram-ai/chat", req);
  },

  /**
   * Tạo phiên chat mới
   */
  createSession: async (): Promise<ApiResponse<ChatSession>> => {
    return apiClient.post<any, ApiResponse<ChatSession>>("/diagram-ai/chat/sessions");
  },

  /**
   * Lấy danh sách các phiên chat (phân trang, mới nhất trước)
   */
  getSessions: async (page = 0, size = 20): Promise<ApiResponse<PagedResponse<ChatSession>>> => {
    return apiClient.get<any, ApiResponse<PagedResponse<ChatSession>>>(
      `/diagram-ai/chat/sessions?page=${page}&size=${size}`,
    );
  },

  /**
   * Lấy lịch sử tin nhắn của một phiên chat (phân trang, cũ → mới)
   */
  getHistory: async (
    sessionId: string,
    page = 0,
    size = 50,
  ): Promise<ApiResponse<PagedResponse<ChatMessage>>> => {
    return apiClient.get<any, ApiResponse<PagedResponse<ChatMessage>>>(
      `/diagram-ai/chat/sessions/${sessionId}/messages?page=${page}&size=${size}`,
    );
  },
};
