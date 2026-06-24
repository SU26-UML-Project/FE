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
