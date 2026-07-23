import apiClient from '../../../shared/api/apiClient';
import type { ApiResponse } from '../../../types/api';
import type { AuditLogPage, AuditLogQuery } from "../types";

export const auditService = {
  // ADMIN: nhật ký thao tác — lọc động + phân trang
  getAuditLogs: (params: AuditLogQuery): Promise<AuditLogPage> =>
    apiClient
      .get<any, ApiResponse<AuditLogPage>>("/admin/audit-logs", { params })
      .then((r) => r.result),

  // ADMIN: danh sách action distinct trong DB (đổ dropdown, không hardcode)
  getAuditActions: (): Promise<string[]> =>
    apiClient
      .get<any, ApiResponse<string[]>>("/admin/audit-logs/actions")
      .then((r) => r.result),
};
