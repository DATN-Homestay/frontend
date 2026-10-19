import { apiClient } from './apiClient';
import type { HomestayItem, CustomerBooking, ReviewSubmission } from '../types/customer';

export const customerService = {
  async getHomestays(city?: string, limit = 1000, offset = 0): Promise<{ items: HomestayItem[]; total: number }> {
    try {
      const res: any = await apiClient('/homestays', {
        params: {
          city: city && city !== 'Tất cả điểm đến' && city !== 'Tất cả' ? city : undefined,
          limit,
          offset,
        },
      });
      // Backend bọc response trong { statusCode, message, data: { items, total } }
      const data = res?.data ?? res;
      if (data && Array.isArray(data.items)) {
        return { items: data.items, total: data.total ?? data.items.length };
      }
      if (Array.isArray(data)) {
        return { items: data, total: data.length };
      }
      return { items: [], total: 0 };
    } catch (err) {
      console.warn('Lỗi khi gọi API /homestays:', err);
      return { items: [], total: 0 };
    }
  },

  async getHomestayDetail(id: string): Promise<HomestayItem> {
    const res: any = await apiClient(`/homestays/${id}`);
    return res?.data ?? res;
  },

  async createBooking(data: { room_id: string; check_in_date: string; check_out_date: string; customer_note?: string }) {
    const res: any = await apiClient('/bookings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res?.data ?? res;
  },

  async getMyTrips(): Promise<CustomerBooking[]> {
    const res: any = await apiClient('/customer/bookings');
    return res?.data ?? res;
  },

  async submitReview(data: ReviewSubmission) {
    const res: any = await apiClient(`/bookings/${data.booking_id}/reviews`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res?.data ?? res;
  },
};

