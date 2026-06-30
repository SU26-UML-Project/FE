import apiClient from "./apiClient";
import type { ApiResponse } from "../types/api";

export type RangeKey = "24h" | "7d" | "30d" | "custom";

export interface StatCardData {
  total: number;
  delta: number;
  trend: "up" | "down";
  sparkline: number[];
}

export const getDashboardUserStats = (range: RangeKey, from?: string, to?: string) =>
  apiClient
    .get<ApiResponse<StatCardData>>("/admin/dashboard/users", {
      params: { range, from, to },
    })
    .then((r) => r.result);

export const getDashboardProjectStats = (range: RangeKey, from?: string, to?: string) =>
  apiClient
    .get<ApiResponse<StatCardData>>("/admin/dashboard/projects", {
      params: { range, from, to },
    })
    .then((r) => r.result);

export const getDashboardDiagramStats = (range: RangeKey, from?: string, to?: string) =>
  apiClient
    .get<ApiResponse<StatCardData>>("/admin/dashboard/diagrams", {
      params: { range, from, to },
    })
    .then((r) => r.result);
