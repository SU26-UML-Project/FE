import apiClient from "./apiClient";
import type { ApiResponse } from "../types/api";

export type RangeKey = "24h" | "7d" | "30d" | "custom";

export interface StatCardData {
  total: number;
  delta: number;
  trend: "up" | "down";
  sparkline: number[];
}

export interface OverviewData {
  users: { total: number; dau: number; mau: number };
  revenue: { mrr: number; churnRate: number; arpu: number; margin: number };
  ai: { requests: number; costUsd: number; errorRate: number; avgLatencyMs: number; totalTokens: number };
}

export interface RevenueTrendData {
  date: string;
  mrr: number;
}

export interface TopCostDriver {
  userId: string;
  fullName: string;
  email: string;
  /** AI local: tiền không còn ý nghĩa, dùng để tham khảo — FE hiển thị theo requestCount. */
  totalCostUsd: number;
  requestCount: number;
  /** BE sẽ bổ sung sau (Task đổi ranking) — optional cho tới khi có. */
  totalTokens?: number;
}

export interface AiErrorLogEntry {
  createdAt: string;
  errorMessage: string;
}

export interface AiModelStats {
  provider: string;
  modelName: string;
  totalRequests: number;
  errorCount: number;
  /** Error rate (%) = errorCount / totalRequests × 100 */
  errorRate: number;
  totalCostUsd: number;
  totalTokens: number;
}

export interface TopProject {
  projectId: string;
  projectName: string;
  ownerEmail: string;
  diagramCount: number;
}

export const getDashboardUserStats = (range: RangeKey, from?: string, to?: string) =>
  apiClient
    .get<any, ApiResponse<StatCardData>>("/admin/dashboard/users", {
      params: { range, from, to },
    })
    .then((r) => r.result);

export const getDashboardProjectStats = (range: RangeKey, from?: string, to?: string) =>
  apiClient
    .get<any, ApiResponse<StatCardData>>("/admin/dashboard/projects", {
      params: { range, from, to },
    })
    .then((r) => r.result);

export const getDashboardDiagramStats = (range: RangeKey, from?: string, to?: string) =>
  apiClient
    .get<any, ApiResponse<StatCardData>>("/admin/dashboard/diagrams", {
      params: { range, from, to },
    })
    .then((r) => r.result);

export const getDashboardOverview = (range: RangeKey, from?: string, to?: string) =>
  apiClient
    .get<any, ApiResponse<OverviewData>>("/admin/dashboard/overview", {
      params: { range, from, to },
    })
    .then((r) => r.result);

export const getRevenueTrend = () =>
  apiClient
    .get<any, ApiResponse<RevenueTrendData[]>>("/admin/dashboard/revenue-trend")
    .then((r) => r.result);

export const getTopCostDrivers = (limit?: number) =>
  apiClient
    .get<any, ApiResponse<TopCostDriver[]>>("/admin/dashboard/top-cost-drivers", {
      params: limit ? { limit } : undefined,
    })
    .then((r) => r.result);

export const getTopProjects = (limit?: number) =>
  apiClient
    .get<any, ApiResponse<TopProject[]>>("/admin/dashboard/top-projects", {
      params: limit ? { limit } : undefined,
    })
    .then((r) => r.result);

export const getAiModelStats = (range: RangeKey, from?: string, to?: string) =>
  apiClient
    .get<any, ApiResponse<AiModelStats[]>>("/admin/dashboard/ai-model-stats", {
      params: { range, from, to },
    })
    .then((r) => r.result);

export const getAiErrorLogs = (provider: string, modelName: string, limit?: number) =>
  apiClient
    .get<any, ApiResponse<AiErrorLogEntry[]>>("/admin/dashboard/ai-error-logs", {
      params: { provider, modelName, ...(limit ? { limit } : {}) },
    })
    .then((r) => r.result);
