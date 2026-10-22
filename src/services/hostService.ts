import { apiClient } from './apiClient';
import type {
  HostHomestay,
  PriceCalendarDay,
  PricingSuggestion,
  VerificationStatusResponse,
  HostBookingItem,
  HostBalanceInfo,
  HostDashboardStats,
  HostCoupon,
} from '../types/host';

export const hostService = {
  // 0. Dashboard Stats
  async getDashboardStats(): Promise<{ data: HostDashboardStats }> {
    return await apiClient('/host/dashboard/stats');
  },

  // 1. Homestays Management
  async getMyListings(): Promise<HostHomestay[]> {
    return await apiClient('/host/homestays/my-listings');
  },

  async getHomestayDetail(id: string): Promise<HostHomestay> {
    return await apiClient(`/host/homestays/${id}`);
  },

  async createHomestay(data: Partial<HostHomestay>): Promise<HostHomestay> {
    return await apiClient('/host/homestays', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateHomestay(id: string, data: Partial<HostHomestay>): Promise<HostHomestay> {
    return await apiClient(`/host/homestays/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteHomestay(id: string) {
    return await apiClient(`/host/homestays/${id}`, { method: 'DELETE' });
  },

  // 2. Rooms & Images
  async createRoom(
    homestayId: string,
    data: { room_name: string; capacity: number; base_price: number; images?: string[] },
  ) {
    return await apiClient(`/host/homestays/${homestayId}/rooms`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateRoom(
    roomId: string,
    data: { room_name?: string; capacity?: number; base_price?: number; images?: string[] },
  ) {
    return await apiClient(`/host/rooms/${roomId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteRoom(roomId: string) {
    return await apiClient(`/host/rooms/${roomId}`, { method: 'DELETE' });
  },

  async uploadRoomImage(roomId: string, data: { image_url: string; is_primary?: number; sort_order?: number }) {
    return await apiClient(`/host/rooms/${roomId}/images`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async batchAddRoomImages(roomId: string, images: string[]) {
    return await apiClient(`/host/rooms/${roomId}/images/batch`, {
      method: 'POST',
      body: JSON.stringify({ images }),
    });
  },

  async deleteRoomImage(imageId: string) {
    return await apiClient(`/host/rooms/images/${imageId}`, { method: 'DELETE' });
  },

  async getHomestayPhotosCount(homestayId: string): Promise<{ count: number; max: number; remaining: number }> {
    return await apiClient(`/host/homestays/${homestayId}/photos-count`);
  },

  /** Upload 1 ảnh lên Cloudinary CDN */
  async uploadImage(file: File): Promise<{ url: string; public_id: string }> {
    const formData = new FormData();
    formData.append('file', file);
    const res: any = await apiClient('/upload/image', {
      method: 'POST',
      body: formData,
    });
    return res?.data ?? res;
  },

  /** Upload nhiều ảnh cùng lúc lên Cloudinary CDN */
  async uploadMultipleImages(files: File[]): Promise<Array<{ url: string; public_id: string }>> {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    const res: any = await apiClient('/upload/images', {
      method: 'POST',
      body: formData,
    });
    return res?.data ?? res;
  },

  // 3. Calendar & Batch Update
  async getCalendar(roomId: string, fromDate?: string, toDate?: string): Promise<PriceCalendarDay[]> {
    return await apiClient(`/host/rooms/${roomId}/calendar`, {
      params: { from_date: fromDate, to_date: toDate },
    });
  },

  async updateCalendar(roomId: string, data: { date: string; price: number; is_available?: number }) {
    return await apiClient(`/host/rooms/${roomId}/calendar`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async batchUpdateCalendar(
    roomId: string,
    data: { from_date: string; to_date: string; price?: number; is_available?: number },
  ) {
    return await apiClient(`/host/rooms/${roomId}/calendar/batch`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // 4. Dynamic Pricing AI
  async getPricingSuggestions(homestayId: string, date: string, roomId?: string): Promise<{ data: PricingSuggestion }> {
    return await apiClient('/host/pricing/suggestions', {
      params: { homestay_id: homestayId, date, room_id: roomId },
    });
  },

  async applyPricing(data: { homestay_id: string; date: string; applied_price?: number; new_price?: number; room_id?: string }) {
    return await apiClient('/host/pricing/apply', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // 5. 4-Layer Verification
  async uploadCccdImage(file: File): Promise<{ data: { image_url: string; file_name: string } }> {
    const formData = new FormData();
    formData.append('file', file);
    const token = localStorage.getItem('stayai_access_token');
    const res = await fetch('http://localhost:3000/api/v1/host/verify/upload-cccd', {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Lỗi khi tải ảnh CCCD lên máy chủ');
    }
    return await res.json();
  },

  async verifyCccd(data: {
    homestay_id: string;
    front_image_url: string;
    back_image_url: string;
    cccd_number: string;
    full_name: string;
    bank_account_number: string;
    bank_name: string;
    bank_account_holder_name: string;
  }) {
    return await apiClient('/host/verify/cccd', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async sendOtp(homestayId: string, email?: string) {
    return await apiClient('/host/verify/send-otp', {
      method: 'POST',
      body: JSON.stringify({ homestay_id: homestayId, email }),
    });
  },

  async checkOtp(homestayId: string, otpCode: string) {
    return await apiClient('/host/verify/check-otp', {
      method: 'POST',
      body: JSON.stringify({ homestay_id: homestayId, otp_code: otpCode }),
    });
  },

  async verifyGps(homestayId: string, latitude: number, longitude: number) {
    return await apiClient('/host/verify/gps', {
      method: 'POST',
      body: JSON.stringify({ homestay_id: homestayId, latitude, longitude }),
    });
  },

  async verifyLiveImage(homestayId: string, liveImageUrl: string) {
    return await apiClient('/host/verify/live-image', {
      method: 'POST',
      body: JSON.stringify({ homestay_id: homestayId, live_image_url: liveImageUrl }),
    });
  },

  async getVerificationStatus(homestayId: string): Promise<{ data: VerificationStatusResponse }> {
    return await apiClient(`/host/verify/status/${homestayId}`);
  },

  // 6. Bookings & Check-in / Check-out
  async getBookings(params?: { homestay_id?: string; status?: string }): Promise<{ data: HostBookingItem[] }> {
    return await apiClient('/host/bookings', { params });
  },

  async checkIn(bookingId: string) {
    return await apiClient(`/host/bookings/${bookingId}/check-in`, { method: 'PUT' });
  },

  async checkOut(bookingId: string) {
    return await apiClient(`/host/bookings/${bookingId}/check-out`, { method: 'PUT' });
  },

  // 7. Payouts & Balance (Escrow & Settlement)
  async getBalance(): Promise<{ data: HostBalanceInfo }> {
    return await apiClient('/host/payouts/balance');
  },

  async requestPayout(bookingId?: string, note?: string) {
    return await apiClient('/host/payouts/request', {
      method: 'POST',
      body: JSON.stringify({ booking_id: bookingId, note }),
    });
  },

  async getPayoutHistory() {
    return await apiClient('/host/payouts/history');
  },

  // 8. Host Coupons
  async getCoupons(): Promise<{ data: HostCoupon[] }> {
    return await apiClient('/host/coupons');
  },

  async createCoupon(data: {
    code: string;
    discount_type: 'PERCENT' | 'FIXED_AMOUNT';
    discount_value: number;
    min_order_value?: number;
    start_date: string;
    end_date: string;
  }) {
    return await apiClient('/host/coupons', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async deleteCoupon(id: string) {
    return await apiClient(`/host/coupons/${id}`, { method: 'DELETE' });
  },
};
