import { apiClient, type ApiResponse } from './apiClient';
import type { Paginated, RefundStatus } from '../types/customer';

/** Một dòng của GET /admin/refunds */
export interface AdminRefund {
  id: string;
  booking_id: string;
  booking_code: string | null;
  source: 'CUSTOMER_CANCEL' | 'HOST_CANCEL' | 'ADMIN_CANCEL' | 'LATE_PAYMENT' | 'OTHER';
  refund_amount: number;
  penalty_amount: number;
  status: RefundStatus;
  attempts: number;
  reason: string | null;
  last_error: string | null;
  vnp_transaction_no: string | null;
  processed_at: string | null;
  created_at: string;
}

export const refundAdminService = {
  async list(params: { status?: RefundStatus; page: number; limit: number }) {
    const res = await apiClient<ApiResponse<Paginated<AdminRefund>>>('/admin/refunds', { params });
    return res.data;
  },

  /** Gửi lại yêu cầu hoàn tiền đã thất bại sang VNPay */
  async retry(id: string) {
    const res = await apiClient<ApiResponse<AdminRefund>>(`/admin/refunds/${id}/retry`, { method: 'POST' });
    return res.data;
  },

  /** Ghi nhận Admin đã hoàn tiền ngoài hệ thống (chuyển khoản tay hoặc trên Merchant Admin) */
  async markManual(id: string, note: string) {
    const res = await apiClient<ApiResponse<AdminRefund>>(`/admin/refunds/${id}/manual`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    });
    return res.data;
  },
};
