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

  /** Báo giá theo từng đêm, không giữ chỗ (public) */
  async quoteBooking(data: { room_id: string; check_in_date: string; check_out_date: string; num_guests?: number }) {
    const res = await apiClient<ApiResponse<BookingQuote>>('/bookings/quote', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
  },

  /** Tạo đơn và giữ chỗ 15 phút. Server tự tính tiền, không gửi giá lên. */
  async createBooking(data: {
    room_id: string;
    check_in_date: string;
    check_out_date: string;
    num_guests?: number;
    customer_note?: string;
  }) {
    const res = await apiClient<ApiResponse<CreatedBooking>>('/bookings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
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

