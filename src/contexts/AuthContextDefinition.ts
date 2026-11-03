import { createContext } from 'react';
import type { UserProfile, LoginDto, RegisterDto, UserRole } from '../types/auth';

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  /** Đang kiểm tra phiên đăng nhập khi tải trang */
  initializing: boolean;
  role: UserRole | null;
  isHost: boolean;
  isAdmin: boolean;
  isCustomer: boolean;
  hasRole: (role: UserRole) => boolean;
  login: (dto: LoginDto, remember?: boolean) => Promise<UserProfile>;
  register: (dto: RegisterDto) => Promise<UserProfile>;
  logout: () => Promise<void>;
  /** Cập nhật hồ sơ đang hiển thị (VD: sau khi đổi họ tên) */
  updateUser: (user: UserProfile) => void;
  switchRoleMock: (role: UserRole) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
