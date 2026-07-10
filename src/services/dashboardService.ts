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
