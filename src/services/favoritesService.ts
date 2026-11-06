import { apiClient, type ApiResponse } from './apiClient';

export interface FavoriteHomestayItem {
  favorite_id: string;
  saved_at: string;
  homestay: {
    id: string;
    name: string;
    address: string;
    city: string;
    average_rating: number;
    total_reviews: number;
    status: string;
    cover_image: string | null;
    min_price: number;
    room_count: number;
  };
}

export interface ListFavoritesResponse {
  items: FavoriteHomestayItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ToggleFavoriteResponse {
  is_favorite: boolean;
  message: string;
}

export const favoritesService = {
  async toggleFavorite(homestayId: string): Promise<ToggleFavoriteResponse> {
    const res = await apiClient<ApiResponse<ToggleFavoriteResponse>>(
      `/favorites/${homestayId}/toggle`,
      { method: 'POST' },
    );
    return res.data;
  },

  async getFavoriteIds(): Promise<string[]> {
    const res = await apiClient<ApiResponse<string[]>>('/favorites/ids');
    return res.data ?? [];
  },

  async getFavorites(page = 1, limit = 12): Promise<ListFavoritesResponse> {
    const res = await apiClient<ApiResponse<ListFavoritesResponse>>(
      `/favorites?page=${page}&limit=${limit}`,
    );
    return res.data;
  },

  async removeFavorite(homestayId: string): Promise<void> {
    await apiClient(`/favorites/${homestayId}`, { method: 'DELETE' });
  },
};
