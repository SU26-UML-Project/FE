/**
 * Utility for managing authentication cookies.
 * This is used as a workaround for flows where the backend doesn't automatically set cookies (e.g. Google OAuth URL params).
 */

export const COOKIE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
};

export const setAuthCookie = (key: string, value: string, maxAge: number = 604800) => {
  const cookieOptions = `; Path=/; Max-Age=${maxAge}; SameSite=None; Secure`;
  document.cookie = `${key}=${value}${cookieOptions}`;
};

export const getAuthCookie = (name: string): string | null => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
};

export const clearAuthCookies = () => {
  const expired = '; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=None; Secure';
  document.cookie = `${COOKIE_KEYS.ACCESS_TOKEN}=${expired}`;
  document.cookie = `${COOKIE_KEYS.REFRESH_TOKEN}=${expired}`;
  document.cookie = `JSESSIONID=${expired}`;
};
