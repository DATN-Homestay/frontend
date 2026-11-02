import React, { useState, useEffect, useCallback } from 'react';
import type { UserProfile, LoginDto, RegisterDto, UserRole } from '../types/auth';
import { authService, primaryRole } from '../services/authService';
import { AuthContext } from './AuthContextDefinition';
import { AUTH_EXPIRED_EVENT } from '../services/apiClient';

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

  const isHost = Boolean(user?.roles?.includes('HOST'));
  const isAdmin = Boolean(user?.roles?.includes('ADMIN'));
  const isCustomer = Boolean(user?.roles?.includes('CUSTOMER'));
  const hasRole = (r: UserRole) => Boolean(user?.roles?.includes(r));

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        initializing,
        role: user ? primaryRole(user.roles) : null,
        isHost,
        isAdmin,
        isCustomer,
        hasRole,
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
