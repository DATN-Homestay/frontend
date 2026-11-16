import { apiClient, type ApiResponse } from './apiClient';

export type SettingsGroup = 'booking' | 'reviews' | 'ai';
export interface SystemSetting {
  key: string;
  group: SettingsGroup;
  label: string;
  description: string;
  unit: string;
  defaultValue: number;
  min: number;
  max: number;
  value: number;
}
export interface SystemSettingsData {
  revision: number;
  updated_at: string;
  items: SystemSetting[];
  policies: { key: string; label: string; value: string; description: string }[];
}
export interface SettingHistory {
  id: string;
  revision: number;
  setting_key: string;
  label: string;
  unit: string;
  old_value: number;
  new_value: number;
  actor_name: string;
  actor_id: string;
  reason: string;
  created_at: string;
}

export const systemSettingsService = {
  async get() {
    return (await apiClient<ApiResponse<SystemSettingsData>>('/admin/configs')).data;
  },
  async update(revision: number, changes: { key: string; value: number }[], reason: string) {
    return (await apiClient<ApiResponse<SystemSettingsData>>('/admin/configs', {
      method: 'PATCH', body: JSON.stringify({ revision, changes, reason }),
    })).data;
  },
  async history(page = 1) {
    return (await apiClient<ApiResponse<{ items: SettingHistory[]; meta: { page: number; limit: number; total: number } }>>('/admin/configs/history', {
      params: { page, limit: 10 },
    })).data;
  },
};
