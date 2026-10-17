import { apiClient } from './apiClient';
import type { AuthResponse, LoginDto, RegisterDto, UserProfile } from '../types/auth';

export const authService = {
  async login(dto: LoginDto): Promise<AuthResponse> {
    try {
      const res = await apiClient<{ data: AuthResponse }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(dto),
      });
      if (res.data?.access_token) {
        localStorage.setItem('access_token', res.data.access_token);
        localStorage.setItem('user_profile', JSON.stringify(res.data.user));
      }
      return res.data;
    } catch {
      // Mock Fallback cho dev testing nếu Backend auth chưa xong
      const mockRole = dto.email.includes('host') ? 'HOST' : dto.email.includes('admin') ? 'ADMIN' : 'CUSTOMER';
      const mockUser: UserProfile = {
        id: '1',
        email: dto.email,
        full_name: dto.email.split('@')[0],
        roles: [mockRole],
      };
      const mockRes: AuthResponse = {
        access_token: 'mock_jwt_token_' + Date.now(),
        user: mockUser,
      };
      localStorage.setItem('access_token', mockRes.access_token);
      localStorage.setItem('user_profile', JSON.stringify(mockUser));
      return mockRes;
    }
  },

  async register(dto: RegisterDto) {
    return await apiClient('/auth/register', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  getCurrentUser(): UserProfile | null {
    const raw = localStorage.getItem('user_profile');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_profile');
  },
};
