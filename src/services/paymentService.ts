import apiClient from "./apiClient";
import type { ApiResponse } from "../types/api";
import type { UpgradeQuoteResponse, PaymentResponse, PaymentStatusResponse } from "../types/payment";

export const paymentService = {
  getQuote: (targetPlanId: string) =>
    apiClient.post<any, ApiResponse<UpgradeQuoteResponse>>("/subscriptions/upgrade/quote", { targetPlanId })
      .then((r) => r.result),

  createPayment: (planId: string, returnUrl: string, cancelUrl: string) =>
    apiClient.post<any, ApiResponse<PaymentResponse>>("/payments/create", { planId, returnUrl, cancelUrl })
      .then((r) => r.result),

  getPaymentStatus: (orderCode: number) =>
    apiClient.get<any, ApiResponse<PaymentStatusResponse>>(`/payments/status/${orderCode}`)
      .then((r) => r.result),
};
