import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { UserProfile, LoginDto, RegisterDto, UserRole } from '../types/auth';
import { authService, primaryRole } from '../services/authService';
import { AUTH_EXPIRED_EVENT } from '../services/apiClient';

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  /** Đang kiểm tra phiên đăng nhập khi tải trang */
  initializing: boolean;
  role: UserRole | null;
  login: (dto: LoginDto, remember?: boolean) => Promise<UserProfile>;
  register: (dto: RegisterDto) => Promise<UserProfile>;
  logout: () => Promise<void>;
  /** Cập nhật hồ sơ đang hiển thị (VD: sau khi đổi họ tên) */
  updateUser: (user: UserProfile) => void;
  switchRoleMock: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => authService.getCurrentUser());
  const [initializing, setInitializing] = useState(() => authService.hasSession());

  // Xác minh lại token với server khi tải trang (token có thể đã bị thu hồi)
  useEffect(() => {
    if (!authService.hasSession()) return;
    authService
      .fetchMe()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setInitializing(false));
  }, []);

  // apiClient báo phiên hết hạn (refresh token không còn dùng được)
  useEffect(() => {
    const onExpired = () => setUser(null);
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, []);

  const login = useCallback(async (dto: LoginDto, remember = true) => {
    const loggedIn = await authService.login(dto, remember);
    setUser(loggedIn);
    return loggedIn;
  }, []);

  /** Đăng ký xong tự đăng nhập luôn */
  const register = useCallback(
    async (dto: RegisterDto) => {
      await authService.register(dto);
      return login({ email: dto.email, password: dto.password });
    },
    [login],
  );

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  // Chỉ đổi vai trò hiển thị phía client để thử giao diện, không đổi quyền thật trên server
  const switchRoleMock = (role: UserRole) => {
    if (!user) return;
    setUser({ ...user, roles: [role] });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        initializing,
        role: user ? primaryRole(user.roles) : null,
        login,
        register,
        logout,
        updateUser: setUser,
        switchRoleMock,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};
