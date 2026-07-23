import apiClient from '../../../shared/api/apiClient';
import type { ApiResponse } from '../../../types/api';
import type { QuotePairResponse, PaymentResponse, PaymentStatusResponse, UpgradeMode } from "../types/payment";

export const paymentService = {
  getQuote: (targetPlanId: string) =>
    apiClient.post<any, ApiResponse<QuotePairResponse>>("/subscriptions/upgrade/quote", { targetPlanId })
      .then((r) => r.result),

  createPayment: (planId: string, returnUrl: string, cancelUrl: string, upgradeMode?: UpgradeMode) =>
    apiClient.post<any, ApiResponse<PaymentResponse>>("/payments/create", { planId, returnUrl, cancelUrl, upgradeMode })
      .then((r) => r.result),

  getPaymentStatus: (orderCode: number) =>
    apiClient.get<any, ApiResponse<PaymentStatusResponse>>(`/payments/status/${orderCode}`)
      .then((r) => r.result),
};
