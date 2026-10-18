import type { UserProfile } from '../types/auth';

const ACCESS_KEY = 'access_token';
const REFRESH_KEY = 'refresh_token';
const USER_KEY = 'user_profile';

/**
 * "Ghi nhớ đăng nhập" → localStorage (giữ sau khi đóng trình duyệt),
 * ngược lại → sessionStorage (mất khi đóng tab).
 */
function activeStorage(): Storage | null {
  if (localStorage.getItem(REFRESH_KEY)) return localStorage;
  if (sessionStorage.getItem(REFRESH_KEY)) return sessionStorage;
  return null;
}

export const tokenStorage = {
  saveSession(accessToken: string, refreshToken: string, user: UserProfile, remember: boolean) {
    this.clear();
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem(ACCESS_KEY, accessToken);
    storage.setItem(REFRESH_KEY, refreshToken);
    storage.setItem(USER_KEY, JSON.stringify(user));
  },

  updateTokens(accessToken: string, refreshToken: string) {
    const storage = activeStorage();
    if (!storage) return;
    storage.setItem(ACCESS_KEY, accessToken);
    storage.setItem(REFRESH_KEY, refreshToken);
  },

  getAccessToken(): string | null {
    return activeStorage()?.getItem(ACCESS_KEY) ?? null;
  },

  getRefreshToken(): string | null {
    return activeStorage()?.getItem(REFRESH_KEY) ?? null;
  },

  getUser(): UserProfile | null {
    const raw = activeStorage()?.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as UserProfile;
    } catch {
      return null;
    }
  },

  setUser(user: UserProfile) {
    activeStorage()?.setItem(USER_KEY, JSON.stringify(user));
  },

  clear() {
    for (const storage of [localStorage, sessionStorage]) {
      storage.removeItem(ACCESS_KEY);
      storage.removeItem(REFRESH_KEY);
      storage.removeItem(USER_KEY);
    }
  },
};
