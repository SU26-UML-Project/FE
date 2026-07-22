import apiClient from "./apiClient";
import type { ApiResponse } from "../types/api";

export type PlanStatus = "ACTIVE" | "DRAFT" | "ARCHIVED";
export type PlanBillingCycle = "MONTHLY" | "YEARLY";

/** -1 = không giới hạn; null = chưa set. */
export interface PlanLimits {
  projects: number | null;
  diagrams: number | null;
  aiQueries: number | null;
  exportPdf: number | null;
  collaborators: number | null;
}

/** Catalog + cờ bật/tắt cho từng gói. */
export interface PlanFeatureFlag {
  id: string; // UUID feature trong catalog
  label: string;
  included: boolean;
}

export interface PlanResponse {
  id: string;
  name: string;
  description: string;
  price: number; // VND
  currency: string; // "VND"
  status: PlanStatus;
  popular: boolean;
  color: string;
  yearlyBilling: boolean;
  yearlyDiscount: number; // %
  durationDays: number;
  subscribers: number; // COUNT subscription ACTIVE (read-only)
  contactSales: boolean; // true → "Liên hệ báo giá", bỏ qua price khi hiển thị
  rateLimitPer10s: number | null; // chỉ có ở /admin/plans; null ở public
  rateLimitPerMin: number | null;
  tierOrder: number; // BE tự tính theo giá (0 = rẻ nhất), read-only
  isBasePlan: boolean; // gói cơ bản (chỉ 1 gói)
  billingCycle: PlanBillingCycle;
  quotaPeriodDays: number | null; // số ngày 1 kỳ quota
  limits: PlanLimits;
  features: PlanFeatureFlag[]; // đủ catalog, included=true/false
}

export interface PlanRequest {
  name: string; // bắt buộc
  price: number; // bắt buộc, >= 0
  description?: string;
  currency?: string;
  status?: PlanStatus;
  popular?: boolean;
  color?: string;
  yearlyBilling?: boolean;
  yearlyDiscount?: number;
  durationDays?: number;
  contactSales?: boolean;
  rateLimitPer10s?: number | null;
  rateLimitPerMin?: number | null;
  isBasePlan?: boolean;
  billingCycle?: PlanBillingCycle;
  quotaPeriodDays?: number | null;
  limits?: PlanLimits;
  enabledFeatureIds?: string[]; // chỉ id feature được bật
  // KHÔNG gửi tierOrder — BE tự tính theo giá.
}

export const planService = {
  /** PUBLIC — Pricing page: chỉ ACTIVE, sort giá tăng dần. */
  getPublicPlans: () =>
    apiClient.get<any, ApiResponse<PlanResponse[]>>("/plans").then((r) => r.result),

  /** ADMIN — mọi status, kèm subscribers count. */
  getAdminPlans: () =>
    apiClient.get<any, ApiResponse<PlanResponse[]>>("/admin/plans").then((r) => r.result),

  getPlan: (id: string) =>
    apiClient.get<any, ApiResponse<PlanResponse>>(`/admin/plans/${id}`).then((r) => r.result),

  createPlan: (body: PlanRequest) =>
    apiClient.post<any, ApiResponse<PlanResponse>>("/admin/plans", body).then((r) => r.result),

  /** Full update — name + price bắt buộc. limits/features chỉ đổi khi có mặt trong body. */
  updatePlan: (id: string, body: PlanRequest) =>
    apiClient.put<any, ApiResponse<PlanResponse>>(`/admin/plans/${id}`, body).then((r) => r.result),

  /** Chặn (code 2114) nếu còn subscriber ACTIVE. */
  deletePlan: (id: string) =>
    apiClient.delete<any, ApiResponse<void>>(`/admin/plans/${id}`).then((r) => r.result),

  /** Renumber tierOrder theo giá — không body, trả list đã sắp xếp lại. */
  reorderPlans: () =>
    apiClient.post<any, ApiResponse<PlanResponse[]>>("/admin/plans/reorder").then((r) => r.result),
};
