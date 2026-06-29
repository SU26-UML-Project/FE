export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  authenticated: boolean;
  refreshToken: string;
}

export interface RegisterRequest {
  password: string;
  fullName: string;
  email: string;
  phone?: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface VerifyOtpRequest {
  email: string;
  otpCode: string;
}

export interface ResetPasswordRequest {
  email: string;
  otpCode: string;
  newPassword: string;
  confirmPassword: string;
}

export interface User {
  id: string;
  username?: string;
  fullName?: string;
  email: string;
  phone?: string;
  dob?: string;          // ISO date (yyyy-MM-dd)
  avatarUrl?: string;
  status?: string;       // ACTIVE | LOCKED | PENDING_DELETE
  createdAt?: string;
  profileCompleted?: boolean; // false for Google users who haven't finished onboarding
  role: string | {
    id: string;
    roleName: string;
    description: string;
  };
}

export interface CompleteProfileRequest {
  fullName: string;
  phone: string;
  dob: string;           // yyyy-MM-dd
  password: string;
  confirmPassword: string;
}

export interface UpdateProfileRequest {
  fullName?: string;
  phone?: string;
  dob?: string;          // yyyy-MM-dd
  avatarUrl?: string;    // public URL trả về từ POST /files/avatar
}

export interface DeleteAccountResponse {
  status: string;
  deletionDate?: string;
  daysRemaining?: number;
  message: string;
}

export interface ChangePasswordInitRequest {
  currentPassword: string;
}

export interface ChangePasswordConfirmRequest {
  otpCode: string;
  newPassword: string;
  confirmPassword: string;
}

export interface AdminUserListItem {
  id: string;
  username?: string;
  fullName?: string;
  email: string;
  phone?: string;
  dob?: string;
  avatarUrl?: string;
  status?: string;       // ACTIVE | LOCKED | PENDING_DELETE
  createdAt?: string;
  lastActiveAt?: string;
  projectCount?: number;
  diagramCount?: number;
  profileCompleted?: boolean;
  role: string | {
    id: string;
    roleName: string;
    description: string;
  };
}
