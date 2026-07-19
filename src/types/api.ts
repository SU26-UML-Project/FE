export interface ApiResponse<T> {
  code: number;
  message: string;
  result: T;
}

export interface ApiError {
  code: number;
  message: string;
  result?: any;
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;   // current page (0-based)
  size: number;
  first: boolean;
  last: boolean;
}

/**
 * Envelope phân trang chuẩn của BE (dto.response.PagedResponse) — khác Page<T> của Spring:
 * dùng `page` (không phải `number`) và không có first/last.
 */
export interface PagedResponse<T> {
  content: T[];
  page: number;          // trang hiện tại (0-based)
  size: number;
  totalElements: number;
  totalPages: number;
}
