import { apiClient, type ApiResponse } from './apiClient';
import { tokenStorage } from './tokenStorage';
import type { AuthResponse, LoginDto, RegisterDto, RegisterResult, UserProfile, UserRole } from '../types/auth';

/** Vai trò chính để điều hướng: Host đăng ký có cả CUSTOMER và HOST nên không lấy roles[0] */
export function primaryRole(roles: UserRole[] | undefined): UserRole {
  if (roles?.includes('ADMIN')) return 'ADMIN';
  if (roles?.includes('HOST')) return 'HOST';
  return 'CUSTOMER';
}

const HOME_BY_ROLE: Record<UserRole, string> = {
  ADMIN: '/admin',
  HOST: '/host',
  CUSTOMER: '/',
};

/** Trang đích sau khi đăng nhập: quay lại trang trước đó nếu có, không thì về trang chủ theo vai trò */
export function postLoginPath(roles: UserRole[] | undefined, from?: string): string {
  return from ?? HOME_BY_ROLE[primaryRole(roles)];
}

export const authService = {
  async login(dto: LoginDto, remember: boolean): Promise<UserProfile> {
    const res = await apiClient<ApiResponse<AuthResponse>>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(dto),
      skipAuthRefresh: true,
    });
    const { access_token, refresh_token, user } = res.data;
    tokenStorage.saveSession(access_token, refresh_token, user, remember);
    return user;
  },

  async register(dto: RegisterDto): Promise<RegisterResult> {
    const body: RegisterDto = { ...dto };
    if (!body.phone_number) delete body.phone_number;

    const res = await apiClient<ApiResponse<RegisterResult>>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
      skipAuthRefresh: true,
    });
    return res.data;
  },

  /** Gửi mã OTP về email trước khi đăng ký */
  async sendRegisterOtp(email: string, full_name?: string): Promise<{ success: boolean; message: string; email: string }> {
    const res = await apiClient<ApiResponse<{ success: boolean; message: string; email: string }>>('/auth/send-register-otp', {
      method: 'POST',
      body: JSON.stringify({ email, full_name }),
      skipAuthRefresh: true,
    });
    return res.data;
  },

  /** Kiểm tra tính đúng đắn của mã OTP email đăng ký */
  async verifyRegisterOtp(email: string, otp_code: string): Promise<{ success: boolean; message: string; verified: boolean }> {
    const res = await apiClient<ApiResponse<{ success: boolean; message: string; verified: boolean }>>('/auth/verify-register-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp_code }),
      skipAuthRefresh: true,
    });
    return res.data;
  },

  /** Lấy lại hồ sơ từ server (kiểm tra token còn hiệu lực khi tải trang) */
  async fetchMe(): Promise<UserProfile> {
    const res = await apiClient<ApiResponse<UserProfile>>('/auth/me');
    tokenStorage.setUser(res.data);
    return res.data;
  },

  getCurrentUser(): UserProfile | null {
    return tokenStorage.getUser();
  },

  hasSession(): boolean {
    return !!tokenStorage.getRefreshToken();
  },

  async logout(): Promise<void> {
    try {
      if (tokenStorage.getAccessToken()) {
        await apiClient('/auth/logout', { method: 'POST' });
      }
    } catch {
      // Phiên đã hết hạn phía server thì vẫn xóa token phía client
    } finally {
      tokenStorage.clear();
    }
  },
};
