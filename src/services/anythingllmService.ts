/**
 * Chat Service — FE → BE → AnythingLLM

 * FE calls  : POST /api/v1/chat
 * BE proxies: AnythingLLM API
 *
 apiClient interceptor tự động:
   nwrap envelope → trả thẳng { reply }
  Đính kèm JWT Authorization header
   Tự refresh token khi hết hạn (401 → refresh → retry)
   Redirect về / nếu refresh thất bại
 */
import axios from 'axios';
import apiClient from './apiClient';
import type { ApiResponse } from '../types/api';
import type {
  ChatMessage,
  ChatSession,
  DiagramChatRequest,
  DiagramChatResponse
} from '../types/ai';

export const anythingllmService = {
  /**
   * Gửi tin nhắn đến Diagram AI.
   * Hỗ trợ sessionId để duy trì ngữ cảnh.
   */
  sendDiagramChat: async (data: DiagramChatRequest): Promise<ApiResponse<DiagramChatResponse>> => {
    return apiClient.post<any, ApiResponse<DiagramChatResponse>>('/diagram-ai/chat', data);
  },

  /**
   * Lấy danh sách tất cả các phiên chat của người dùng.
   */
  getChatSessions: async (): Promise<ApiResponse<ChatSession[]>> => {
    return apiClient.get<any, ApiResponse<ChatSession[]>>('/diagram-ai/chat/sessions');
  },

  /**
   * Tạo một phiên chat mới.
   */
  createChatSession: async (): Promise<ApiResponse<ChatSession>> => {
    return apiClient.post<any, ApiResponse<ChatSession>>('/diagram-ai/chat/sessions');
  },

  /**
   * Lấy lịch sử tin nhắn của một phiên chat.
   */
  getChatHistory: async (sessionId: string): Promise<ApiResponse<ChatMessage[]>> => {
    return apiClient.get<any, ApiResponse<ChatMessage[]>>(`/diagram-ai/chat/sessions/${sessionId}/messages`);
  },

  /**
   * Ping BE actuator để kiểm tra server online.
   */
  checkHealth: async (): Promise<boolean> => {
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL ?? '';
      await axios.get(`${baseUrl}/actuator/health`);
      return true;
    } catch (err: any) {
        return false;
      }
    },

    /**
     * [DEPRECATED] Gửi tin nhắn đến BE, BE proxy sang AnythingLLM.
     * Dùng sendDiagramChat thay thế để hỗ trợ session.
     */
    sendChatMessage: async (message: string): Promise<string> => {
      const response = await apiClient.post<any, ApiResponse<{ reply: string }>>(
        '/api/v1/chat',
        { message },
        { timeout: 420000 }
      );

      let reply = response.result?.reply ?? 'Không có phản hồi từ AI.';
      reply = reply.replace(/<think>[\s\S]*?<\/think>\n*/g, '').trim();
      return reply;
    },
  };
