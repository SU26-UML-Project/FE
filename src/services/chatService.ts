import apiClient from "./apiClient";
import type { ApiResponse } from "../types/api";
import type { 
  DiagramChatRequest, 
  DiagramChatResponse, 
  ChatSession, 
  DiagramChatHistoryResponse 
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
   * Lấy danh sách các phiên chat
   */
  getSessions: async (): Promise<ApiResponse<ChatSession[]>> => {
    return apiClient.get<any, ApiResponse<ChatSession[]>>("/diagram-ai/chat/sessions");
  },

  /**
   * Lấy lịch sử tin nhắn của một phiên chat
   */
  getHistory: async (sessionId: string): Promise<ApiResponse<DiagramChatHistoryResponse>> => {
    return apiClient.get<any, ApiResponse<DiagramChatHistoryResponse>>(`/diagram-ai/chat/sessions/${sessionId}/messages`);
  },
};
