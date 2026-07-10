import apiClient from "./apiClient";
import type { ApiResponse } from "../types/api";

export type PlanStatus = "ACTIVE" | "DRAFT" | "ARCHIVED";

/** -1 = không giới hạn; null = chưa set. */
export interface PlanLimits {
  projects: number | null;
  diagrams: number | null;
  aiQueries: number | null;
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
  limits?: PlanLimits;
  enabledFeatureIds?: string[]; // chỉ id feature được bật
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
};
