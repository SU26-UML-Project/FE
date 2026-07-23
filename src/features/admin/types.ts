// Audit log (nhật ký thao tác admin) — khớp contract BE /admin/audit-logs.
// Lưu ý: actorId / actorEmail có thể null (dòng hệ thống, vd ACCOUNT_AUTO_DELETE);
// dòng hệ thống nhận biết bằng: actorId == null && actorName != null.

export interface AuditLog {
  id: number;
  actorId: string | null;      // UUID; null với actor hệ thống
  actorName: string | null;    // vd "UMLAdminSystem" cho dòng hệ thống
  actorEmail: string | null;
  action: string;              // USER_LOCK, AI_CONFIG_UPDATE, ACCOUNT_AUTO_DELETE...
  targetType: string;          // USER / AI_CONFIG / AI_WORKSPACE / AI_DOCUMENT
  targetId: string | null;
  detail: Record<string, unknown> | null;
  createdAt: string;           // ISO-8601 UTC (hậu tố Z)
}

// PagedResponse của dự án: trang hiện tại là `page` (KHÔNG phải `number`).
export interface AuditLogPage {
  content: AuditLog[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface AuditLogQuery {
  action?: string;
  actorId?: string;    // UUID string
  from?: string;       // yyyy-MM-dd
  to?: string;         // yyyy-MM-dd
  page?: number;
  size?: number;
}
