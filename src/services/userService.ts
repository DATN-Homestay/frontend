import { apiClient, type ApiResponse } from './apiClient';
import { tokenStorage } from './tokenStorage';
import type { ChangePasswordDto, SessionInfo, UserProfile } from '../types/auth';

export const userService = {
  async getProfile(): Promise<UserProfile> {
    const res = await apiClient<ApiResponse<UserProfile>>('/users/me');
    return res.data;
  },

  /** Đồng bộ lại hồ sơ đã lưu để header hiện đúng tên mới sau khi tải lại trang */
  async updateProfile(full_name: string): Promise<UserProfile> {
    const res = await apiClient<ApiResponse<UserProfile>>('/users/me', {
      method: 'PATCH',
      body: JSON.stringify({ full_name }),
    });
    tokenStorage.setUser(res.data);
    return res.data;
  },

  async changePassword(dto: ChangePasswordDto): Promise<{ revoked_sessions: number }> {
    const res = await apiClient<ApiResponse<{ revoked_sessions: number }>>('/users/me/password', {
      method: 'PATCH',
      body: JSON.stringify(dto),
    });
    return res.data;
  },

  async listSessions(): Promise<SessionInfo[]> {
    const res = await apiClient<ApiResponse<SessionInfo[]>>('/users/me/sessions');
    return res.data;
  },

  async revokeSession(id: string): Promise<void> {
    await apiClient(`/users/me/sessions/${id}`, { method: 'DELETE' });
  },
};
