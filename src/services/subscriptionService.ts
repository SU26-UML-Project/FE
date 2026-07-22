import apiClient from '../shared/api/apiClient';
import type { ApiResponse } from '../types/api';
import type { MySubscription } from "../types/payment";

export const subscriptionService = {
  /** Subscription hiện tại. result = null → user đang ở gói Free. */
  getMySubscription: () =>
    apiClient
      .get<any, ApiResponse<MySubscription | null>>("/me/subscription")
      .then((r) => r.result),

  /** Hủy gói ở cuối kỳ — vẫn dùng tới endDate rồi về Free. */
  cancel: () =>
    apiClient
      .post<any, ApiResponse<MySubscription>>("/subscriptions/cancel")
      .then((r) => r.result),

  /** Hoàn tác hủy — gói tiếp tục gia hạn như cũ. */
  reactivate: () =>
    apiClient
      .post<any, ApiResponse<MySubscription>>("/subscriptions/reactivate")
      .then((r) => r.result),
};
