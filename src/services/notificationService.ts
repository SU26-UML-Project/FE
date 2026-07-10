import apiClient from "./apiClient";
import type { ApiResponse, Page } from "../types/api";

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  severity: string;
  read: boolean;
  createdAt: string;
}

export const notificationService = {
  getAll: (params?: { page?: number; size?: number; read?: boolean }) =>
    apiClient
      .get<any, ApiResponse<Page<NotificationItem>>>("/admin/notifications", { params })
      .then((r) => r.result),

  getById: (id: string) =>
    apiClient
      .get<any, ApiResponse<NotificationItem>>(`/admin/notifications/${id}`)
      .then((r) => r.result),

  markRead: (id: string) =>
    apiClient
      .patch<any, ApiResponse<void>>(`/admin/notifications/${id}/read`)
      .then((r) => r.result),

  markAllRead: () =>
    apiClient
      .patch<any, ApiResponse<void>>("/admin/notifications/read-all")
      .then((r) => r.result),

  deleteNotification: (id: string) =>
    apiClient
      .delete<any, ApiResponse<void>>(`/admin/notifications/${id}`)
      .then((r) => r.result),
};
