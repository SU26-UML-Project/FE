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
import { ApiResponse } from './authService';

export interface ChatQuestion {
  title: string;
  type: 'single_select' | 'multi_select' | null;
  options: string[];
}

export interface ChatMessage {
  role: 'ai' | 'user';
  content: string;
  timestamp: string;
  questions?: ChatQuestion[];
}

export interface ChatSession {
  id: string;
  title?: string;
  updatedAt: string;
}

export interface DiagramChatRequest {
  message: string;
  sessionId?: string;
}

export interface DiagramChatResponse {
  answer: string;
  sessionId: string;
  questions: ChatQuestion[];
}

/**
 * Gửi tin nhắn đến Diagram AI.
 * Hỗ trợ sessionId để duy trì ngữ cảnh.
 */
export async function sendDiagramChat(data: DiagramChatRequest): Promise<ApiResponse<DiagramChatResponse>> {
  return apiClient.post('/diagram-ai/chat', data);
}

/**
 * Lấy danh sách tất cả các phiên chat của người dùng.
 */
export async function getChatSessions(): Promise<ApiResponse<ChatSession[]>> {
  return apiClient.get('/diagram-ai/chat/sessions');
}

/**
 * Tạo một phiên chat mới.
 */
export async function createChatSession(): Promise<ApiResponse<ChatSession>> {
  return apiClient.post('/diagram-ai/chat/sessions');
}

/**
 * Lấy lịch sử tin nhắn của một phiên chat.
 */
export async function getChatHistory(sessionId: string): Promise<ApiResponse<ChatMessage[]>> {
  return apiClient.get(`/diagram-ai/chat/sessions/${sessionId}/messages`);
}

/**
 * [DEPRECATED] Gửi tin nhắn đến BE, BE proxy sang AnythingLLM.
 * Dùng sendDiagramChat thay thế để hỗ trợ session.
 */
export async function sendChatMessage(message: string): Promise<string> {
  const data = await apiClient.post('/api/v1/chat', { message }, { timeout: 420000 }) as unknown as {
    code: number;
    message: string;
    result: { reply: string };
  };

  let reply = data.result?.reply ?? 'Không có phản hồi từ AI.';
  reply = reply.replace(/<think>[\s\S]*?<\/think>\n*/g, '').trim();
  return reply;
}

/**
 * Ping BE actuator để kiểm tra server online.
 */
export async function checkHealth(): Promise<boolean> {
  try {
    const baseUrl = import.meta.env.VITE_API_BASE_URL ?? '';
    await axios.get(`${baseUrl}/actuator/health`);
    return true;
  } catch (err: any) {
    return false;
  }
}
