export interface UpgradeQuoteResponse {
  targetPlanId: string;
  currentTierOrder: number;
  targetTierOrder: number;
  currency: string;
  oldPrice: number;
  newPrice: number;
  priceDifference: number;
  billingRemainingRatio: number;
  quotaRemainingRatio: number;
  billingRemainingDays: number;
  billingTotalDays: number;
  amountToPay: number;
  oldNominalQuota: number;
  newNominalQuota: number;
  quotaDelta: number;
  newEffectiveLimit: number;
  availableAfterUpgrade: number;
  quoteExpiresAt: string;
}

export interface PaymentResponse {
  checkoutUrl: string;
  orderCode: number;
  qrCode: string;
  amount?: number;
  transactionType?: 'NEW_SUBSCRIPTION' | 'UPGRADE';
}

export interface PaymentStatusResponse {
  orderCode: number;
  status: string;
  planName: string;
}

/**
 * Subscription hiện tại của user (GET /me/subscription).
 * result = null → user đang ở gói Free (chưa/không có subscription trả phí).
 */
export interface MySubscription {
  planId: string;
  planName: string;
  status: string;              // ACTIVE | CANCELLED | ...
  startDate: string;           // ISO
  endDate: string;             // ISO — mốc hết hạn / gia hạn
  cancelAtPeriodEnd: boolean;  // true → đã hủy nhưng còn dùng tới endDate
  price?: number;
  currency?: string;
}
