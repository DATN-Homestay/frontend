import { apiClient } from './apiClient';
import type {
  HostHomestay,
  PriceCalendarDay,
  PricingSuggestion,
  VerificationStatusResponse,
  HostBookingItem,
  HostBalanceInfo,
} from '../types/host';

export const hostService = {
  // Homestays
  async getMyListings(): Promise<HostHomestay[]> {
    return await apiClient('/host/homestays/my-listings');
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

  // Rooms & Calendar
  async createRoom(homestayId: string, data: { room_name: string; capacity: number; base_price: number }) {
    return await apiClient(`/host/homestays/${homestayId}/rooms`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

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

  // Dynamic Pricing AI
  async getPricingSuggestions(homestayId: string, date: string, roomId?: string): Promise<{ data: PricingSuggestion }> {
    return await apiClient('/host/pricing/suggestions', {
      params: { homestay_id: homestayId, date, room_id: roomId },
    });
  },

  async applyPricing(data: { homestay_id: string; date: string; applied_price: number; room_id?: string }) {
    return await apiClient('/host/pricing/apply', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // 4-Layer Verification
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

  // Bookings & Check-in
  async getBookings(params?: { homestay_id?: string; status?: string }): Promise<{ data: HostBookingItem[] }> {
    return await apiClient('/host/bookings', { params });
  },

  async checkIn(bookingId: string) {
    return await apiClient(`/host/bookings/${bookingId}/check-in`, { method: 'PUT' });
  },

  async checkOut(bookingId: string) {
    return await apiClient(`/host/bookings/${bookingId}/check-out`, { method: 'PUT' });
  },

  // Payouts & Balance
  async getBalance(): Promise<{ data: HostBalanceInfo }> {
    return await apiClient('/host/payouts/balance');
  },

  async requestPayout(bookingId?: string) {
    return await apiClient('/host/payouts/request', {
      method: 'POST',
      body: JSON.stringify({ booking_id: bookingId }),
    });
  },

  async getPayoutHistory() {
    return await apiClient('/host/payouts/history');
  },
};
