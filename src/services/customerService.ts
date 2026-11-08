import { apiClient } from './apiClient';
import type { ApiResponse } from './apiClient';
import type {
  HomestayItem,
  ReviewSubmission,
  BookingQuote,
  CreatedBooking,
  PaymentLink,
  PaymentStatusInfo,
  MyBookingItem,
  Paginated,
  BookingDetail,
  BookingStatus,
  CancellationQuote,
  CancelResult,
} from '../types/customer';

export interface HomestayCatalogFilters { district?: string; guests?: number; rooms?: number }
interface HomestayCatalog { items: HomestayItem[]; total: number }
// Public catalog only: coalesce StrictMode/concurrent reads and reuse pages for five seconds.
const catalogRequests = new Map<string, { promise: Promise<HomestayCatalog>; expiresAt: number }>();

export const customerService = {
  getHomestays(city?: string, limit = 24, offset = 0, filters: HomestayCatalogFilters = {}): Promise<HomestayCatalog> {
    const params = {
      city: city && !city.startsWith('Tất cả') ? city : undefined,
      limit, offset, district: filters.district, guests: filters.guests, rooms: filters.rooms,
    };
    const key = JSON.stringify(params);
    const cached = catalogRequests.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.promise;
    for (const [entryKey, entry] of catalogRequests) if (entry.expiresAt <= Date.now()) catalogRequests.delete(entryKey);
    if (catalogRequests.size >= 100) catalogRequests.delete(catalogRequests.keys().next().value!);
    const promise = apiClient<ApiResponse<HomestayCatalog>>('/homestays', { params, signal: AbortSignal.timeout(15000) }).then((res) => {
      const data = res.data;
      if (!data || !Array.isArray(data.items) || !Number.isFinite(data.total)) throw new Error('Dữ liệu danh sách homestay không hợp lệ.');
      const entry = catalogRequests.get(key);
      if (entry?.promise === promise) entry.expiresAt = Date.now() + 5000;
      return data;
    }).catch((error: unknown) => {
      if (catalogRequests.get(key)?.promise === promise) catalogRequests.delete(key);
      throw error;
    });
    catalogRequests.set(key, { promise, expiresAt: Infinity });
    return promise;
  },

  async getHomestayDetail(id: string): Promise<HomestayItem> {
    const res: any = await apiClient(`/homestays/${id}`);
    return res?.data ?? res;
  },

  /** Báo giá theo từng đêm, không giữ chỗ (public) */
  async quoteBooking(data: { room_id: string | number; check_in_date: string; check_out_date: string; num_guests?: number }) {
    const res = await apiClient<ApiResponse<BookingQuote>>('/bookings/quote', {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        room_id: String(data.room_id),
      }),
    });
    return res?.data ?? res;
  },

  /** Tạo đơn và giữ chỗ 15 phút. Server tự tính tiền, không gửi giá lên. */
  async createBooking(data: {
    room_id: string | number;
    check_in_date: string;
    check_out_date: string;
    num_guests?: number;
    customer_note?: string;
  }) {
    const res = await apiClient<ApiResponse<CreatedBooking>>('/bookings', {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        room_id: String(data.room_id),
      }),
    });
    return res?.data ?? res;
  },

  /** URL thanh toán VNPay đã ký của một đơn đang chờ thanh toán */
  async createPaymentUrl(bookingId: string) {
    const res = await apiClient<ApiResponse<PaymentLink>>(`/bookings/${bookingId}/payment-url`, {
      method: 'POST',
    });
    return res.data;
  },

  /** Trạng thái thật của giao dịch (do IPN VNPay ghi), dùng để polling sau khi VNPay chuyển về */
  async getPayment(paymentId: string) {
    const res = await apiClient<ApiResponse<PaymentStatusInfo>>(`/payments/${paymentId}`);
    return res.data;
  },

  async getMyBookings(params: { page: number; limit: number; status?: BookingStatus }) {
    const res = await apiClient<ApiResponse<Paginated<MyBookingItem>>>('/users/me/bookings', { params });
    return res.data;
  },

  /** Xem trước số tiền được hoàn nếu hủy đơn ngay bây giờ */
  async getCancellationQuote(bookingId: string) {
    const res = await apiClient<ApiResponse<CancellationQuote>>(`/bookings/${bookingId}/cancellation-quote`);
    return res.data;
  },

  /** Hủy đơn. expected_refund_amount là số tiền khách đã thấy; server từ chối (409) nếu khác kết quả tính lại. */
  async cancelBooking(bookingId: string, data: { reason: string; expected_refund_amount?: number }) {
    const res = await apiClient<ApiResponse<CancelResult>>(`/bookings/${bookingId}/cancel`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
  },

  async getBookingDetail(id: string) {
    const res = await apiClient<ApiResponse<BookingDetail>>(`/bookings/${id}`);
    return res.data;
  },

  async submitReview(data: ReviewSubmission) {
    const res: any = await apiClient(`/bookings/${data.booking_id}/reviews`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res?.data ?? res;
  },
};

