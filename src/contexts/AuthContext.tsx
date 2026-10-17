import React, { createContext, useContext, useState, useEffect } from 'react';
import type { UserProfile, LoginDto } from '../types/auth';
import { authService } from '../services/authService';

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  role: 'CUSTOMER' | 'HOST' | 'ADMIN' | null;
  login: (dto: LoginDto) => Promise<void>;
  logout: () => void;
  switchRoleMock: (role: 'CUSTOMER' | 'HOST' | 'ADMIN') => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => authService.getCurrentUser());

  useEffect(() => {
    // If no user exists yet in storage, provide default demo user
    if (!user) {
      const demoUser: UserProfile = {
        id: '1',
        email: 'host@homestay.vn',
        full_name: 'Nguyễn Văn Chủ Nhà',
        roles: ['HOST'],
      };
      setUser(demoUser);
      localStorage.setItem('user_profile', JSON.stringify(demoUser));
    }
  }, [user]);

  const login = async (dto: LoginDto) => {
    const res = await authService.login(dto);
    setUser(res.user);
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const switchRoleMock = (role: 'CUSTOMER' | 'HOST' | 'ADMIN') => {
    if (!user) return;
    const updated = { ...user, roles: [role] };
    setUser(updated);
    localStorage.setItem('user_profile', JSON.stringify(updated));
  };

  const role = user?.roles?.[0] || 'CUSTOMER';

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        role,
        login,
        logout,
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
