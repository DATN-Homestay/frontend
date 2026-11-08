import { apiClient, type ApiResponse } from '../../services/apiClient';
import type { HomestayItem } from '../../types/customer';

export interface HomestayRecommendationsResult {
  mode: 'PERSONALIZED' | 'POPULAR';
  signals: { viewed_homestays: number; bookings: number; favorites: number; searches: number };
  items: { homestay: HomestayItem; reasons: string[] }[];
}

export interface HomestaySearch { city?: string; district?: string; guests?: number; rooms?: number }

export const recommendationsService = {
  async get(personalized: boolean): Promise<HomestayRecommendationsResult> {
    const response = await apiClient<ApiResponse<HomestayRecommendationsResult>>(
      personalized ? '/recommendations' : '/recommendations/popular',
    );
    return response.data;
  },
  async recordView(homestayId: string): Promise<void> {
    await apiClient('/recommendations/views', {
      method: 'POST', body: JSON.stringify({ homestay_id: homestayId }),
    });
  },
  async recordSearch(search: HomestaySearch): Promise<void> {
    await apiClient('/recommendations/searches', { method: 'POST', body: JSON.stringify(search) });
  },
};
