import apiClient from '../../../shared/api/apiClient';
import type { ApiResponse } from '../../../types/api';

export interface QuotaInfo {
  used: number;
  limit: number; // -1 = không giới hạn
  resetAt: string;
}

/** Hạn mức AI Request của user trong kỳ hiện tại (đã áp lazy reset). */
export const getMyQuota = () =>
  apiClient.get<any, ApiResponse<QuotaInfo>>("/me/quota").then((r) => r.result);
