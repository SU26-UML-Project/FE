// Chuẩn hóa lỗi API → thông điệp tiếng Việt rõ ràng.
//
// Interceptor axios (services/apiClient.ts) reject về dạng { code, message }. Backend đã trả
// message tiếng Việt theo ErrorCode; util này là lớp fallback + đồng nhất, đặc biệt để KHÔNG bao
// giờ hiện "Uncategorized error" (code 9999) cho người dùng.

export interface ApiError {
  code?: number;
  message?: string;
}

// Các mã lỗi backend liên quan luồng Thùng rác / dự án (khớp ErrorCode.java).
export const ERROR_CODES = {
  UNCATEGORIZED: 9999,
  UNAUTHENTICATED: 401,
  UNAUTHORIZED: 403,
  PROJECT_NOT_FOUND: 1803,
  PROJECT_ACCESS_DENIED: 1804,
  PROJECT_IN_TRASH: 1805,
  PROJECT_NOT_IN_TRASH: 1806,
  PLAN_LIMIT_EXCEEDED: 2132,
  // Upgrade / Subscription errors
  UPGRADE_REQUIRES_ACTIVE_SUBSCRIPTION: 2141,
  UPGRADE_TARGET_NOT_HIGHER_TIER: 2142,
  PLAN_TIER_NOT_CONFIGURED: 2143,
  SUBSCRIPTION_ALREADY_ACTIVE: 2144,
  DOWNGRADE_NOT_ALLOWED_WHILE_ACTIVE: 2145,
  QUOTE_EXPIRED: 2146,
  PENDING_PAYMENT_EXISTS: 2147,
  NO_ACTIVE_SUBSCRIPTION: 2149,
  SUBSCRIPTION_ALREADY_CANCELLED: 2150,
  SUBSCRIPTION_NOT_CANCELLED: 2151,
} as const;

// Thông điệp ưu tiên theo code (ghi đè message thô từ server khi cần rõ nghĩa hơn).
const MESSAGE_BY_CODE: Record<number, string> = {
  [ERROR_CODES.UNCATEGORIZED]: 'Đã có lỗi xảy ra, vui lòng thử lại.',
  [ERROR_CODES.UNAUTHENTICATED]: 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.',
  [ERROR_CODES.UNAUTHORIZED]: 'Bạn không có quyền thực hiện thao tác này.',
  [ERROR_CODES.PROJECT_NOT_FOUND]: 'Không tìm thấy dự án.',
  [ERROR_CODES.PROJECT_ACCESS_DENIED]: 'Bạn không có quyền truy cập dự án này.',
  [ERROR_CODES.PROJECT_IN_TRASH]: 'Dự án đang ở trong thùng rác. Hãy khôi phục trước khi mở.',
  [ERROR_CODES.PROJECT_NOT_IN_TRASH]: 'Dự án không nằm trong thùng rác.',
  [ERROR_CODES.PLAN_LIMIT_EXCEEDED]: 'Bạn đã đạt giới hạn số dự án của gói. Hãy nâng gói để khôi phục thêm.',
  // Upgrade / Subscription messages
  [ERROR_CODES.UPGRADE_REQUIRES_ACTIVE_SUBSCRIPTION]: 'Bạn chưa có gói trả phí đang hiệu lực để nâng cấp.',
  [ERROR_CODES.UPGRADE_TARGET_NOT_HIGHER_TIER]: 'Chỉ có thể nâng lên gói bậc cao hơn.',
  [ERROR_CODES.PLAN_TIER_NOT_CONFIGURED]: 'Gói chưa được cấu hình bậc.',
  [ERROR_CODES.SUBSCRIPTION_ALREADY_ACTIVE]: 'Bạn đang sử dụng gói này.',
  [ERROR_CODES.DOWNGRADE_NOT_ALLOWED_WHILE_ACTIVE]: 'Không thể hạ gói khi gói hiện tại còn hiệu lực.',
  [ERROR_CODES.QUOTE_EXPIRED]: 'Báo giá đã hết hạn, vui lòng thử lại.',
  [ERROR_CODES.PENDING_PAYMENT_EXISTS]: 'Bạn đang có giao dịch chờ thanh toán. Vui lòng hoàn tất hoặc huỷ giao dịch trước.',
  [ERROR_CODES.NO_ACTIVE_SUBSCRIPTION]: 'Bạn chưa có gói trả phí đang hoạt động.',
  [ERROR_CODES.SUBSCRIPTION_ALREADY_CANCELLED]: 'Gói của bạn đã được hủy trước đó.',
  [ERROR_CODES.SUBSCRIPTION_NOT_CANCELLED]: 'Gói của bạn hiện không ở trạng thái đã hủy.',
};

/** Trả về code lỗi (nếu có) từ object lỗi đã reject bởi apiClient. */
export function getErrorCode(error: unknown): number | undefined {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as ApiError).code;
    return typeof code === 'number' ? code : undefined;
  }
  return undefined;
}

/** True nếu lỗi là "dự án đang trong thùng rác" (để bật popup khôi phục). */
export function isInTrashError(error: unknown): boolean {
  return getErrorCode(error) === ERROR_CODES.PROJECT_IN_TRASH;
}

/**
 * Thông điệp tiếng Việt cho một lỗi API.
 * @param fallback thông điệp mặc định khi không nhận diện được lỗi.
 */
export function getErrorMessage(error: unknown, fallback = 'Đã có lỗi xảy ra, vui lòng thử lại.'): string {
  const code = getErrorCode(error);

  // Ưu tiên map theo code cho các mã đã biết (kể cả 9999 để loại "Uncategorized error").
  if (code !== undefined && MESSAGE_BY_CODE[code]) {
    return MESSAGE_BY_CODE[code];
  }

  // Sau đó tới message từ server (đã tiếng Việt), trừ khi là chuỗi "Uncategorized error" thô.
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as ApiError).message;
    if (message && message !== 'Uncategorized error') {
      return message;
    }
  }
  if (error instanceof Error && error.message && error.message !== 'Uncategorized error') {
    return error.message;
  }

  return fallback;
}
