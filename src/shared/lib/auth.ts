/**
 * Utility for managing authentication cookies.
 * This is used as a workaround for flows where the backend doesn't automatically set cookies (e.g. Google OAuth URL params).
 */

export const COOKIE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
};

/**
 * Flags cookie tự động theo protocol:
 * - HTTPS: SameSite=None; Secure (cho phép cross-site, ví dụ FE Vercel + BE Render)
 * - HTTP (dev localhost / LAN IP): browser ÂM THẦM BỎ cookie có "Secure" trên host
 *   không phải localhost -> phải dùng SameSite=Lax không Secure để cookie được lưu.
 *   (Với Vite proxy thì request là same-origin nên Lax là đủ.)
 */
const isHttps = () =>
  typeof window !== 'undefined' && window.location.protocol === 'https:';

export const setAuthCookie = (key: string, value: string, maxAge: number = 604800) => {
  const cookieOptions = isHttps()
    ? `; Path=/; Max-Age=${maxAge}; SameSite=None; Secure`
    : `; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
  document.cookie = `${key}=${value}${cookieOptions}`;
};

export const getAuthCookie = (name: string): string | null => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    const cookieVal = parts.pop()?.split(';').shift();
    return cookieVal ? decodeURIComponent(cookieVal) : null;
  }
  return null;
};

export const clearAuthCookies = () => {
  // Xoá cả 2 biến thể (đã từng set SameSite=None; Secure và SameSite=Lax)
  // để dọn sạch cookie cũ trên mọi môi trường (https / http).
  const expiredHttp = '; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax';
  const expiredHttps = '; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=None; Secure';
  [COOKIE_KEYS.ACCESS_TOKEN, COOKIE_KEYS.REFRESH_TOKEN, 'JSESSIONID'].forEach((key) => {
    document.cookie = `${key}=${expiredHttp}`;
    document.cookie = `${key}=${expiredHttps}`;
  });
};