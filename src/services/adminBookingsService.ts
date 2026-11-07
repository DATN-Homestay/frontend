import { apiClient, type ApiResponse } from './apiClient';
import type { BookingStatus } from '../types/customer';

interface BookingPerson { id: string; full_name: string; email: string; phone_number: string | null }
export interface AdminBookingItem {
  id: string;
  booking_code: string;
  status: BookingStatus;
  is_dropship: boolean;
  check_in_date: string;
  check_out_date: string;
  nights: number;
  num_guests: number;
  total_amount: number;
  created_at: string | null;
  customer: BookingPerson | null;
  host: BookingPerson | null;
  room: { id: string; room_name: string } | null;
  homestay: { id: string; name: string; city: string } | null;
  escrow_status: string | null;
}
export interface AdminBookingDetail extends AdminBookingItem {
  customer_note: string | null;
  room_subtotal: number;
  service_fee: number;
  discount_amount: number;
  payment_deadline: string | null;
  updated_at: string | null;
  address: string | null;
  cancellation_policy: string | null;
  escrow: { status: string; amount: number; release_due_at: string | null; released_at: string | null } | null;
  payments: { id: string; amount: number; method: string; status: string; transaction_code: string | null; created_at: string | null; paid_at: string | null }[];
  refunds: { id: string; amount: number; penalty_amount: number; status: string; reason: string | null; created_at: string | null }[];
  payout: { id: string; status: string; platform_commission: number; actual_payout_amount: number } | null;
}
export interface AdminBookingsQuery {
  page: number;
  limit: number;
  search?: string;
  status?: BookingStatus;
  source?: 'INTERNAL' | 'DROPSHIP';
  from_date?: string;
  to_date?: string;
}
export interface AdminBookingsResult {
  items: AdminBookingItem[];
  pagination: { page: number; limit: number; total: number; total_pages: number };
  summary: { total_amount: number; by_status: Partial<Record<BookingStatus, number>> };
}

export const adminBookingsService = {
  async list(query: AdminBookingsQuery): Promise<AdminBookingsResult> {
    const response = await apiClient<ApiResponse<AdminBookingsResult>>('/admin/bookings', {
      params: { ...query },
    });
    return response.data;
  },
  async detail(id: string): Promise<AdminBookingDetail> {
    const response = await apiClient<ApiResponse<AdminBookingDetail>>(`/admin/bookings/${id}`);
    return response.data;
  },
};
