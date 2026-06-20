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


export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  error?: boolean;
}

// API

/**
 * Gửi tin nhắn đến BE, BE proxy sang AnythingLLM.
 * apiClient interceptor đã unwrap { code, message, result } → trả { reply }.
 */
export async function sendChatMessage(message: string): Promise<string> {
  // apiClient interceptor trả về response.data = { code, message, result: { reply } }
  const data = await apiClient.post('/api/v1/chat', { message }, { timeout: 120000 }) as unknown as {
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
 * /actuator/health nằm trong PUBLIC_ENDPOINTS → không cần auth.
 */
export async function checkHealth(): Promise<boolean> {
  try {
    // Dùng axios thuần thay vì apiClient để tránh interceptor parse sai
    // cấu trúc JSON của /actuator/health (không có trường "code" theo envelope)
    const baseUrl = import.meta.env.VITE_API_BASE_URL ?? '';
    await axios.get(`${baseUrl}/actuator/health`);
    return true;
  } catch (err: any) {
    return false;
  }
}
