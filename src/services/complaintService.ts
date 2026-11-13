import { apiClient, type ApiResponse } from './apiClient';
import type { Complaint, ComplaintStatus, Paginated } from '../types/customer';

/** Khiếu nại phía admin (xử lý) và chủ nhà (chỉ xem) */
export const complaintService = {
  async listForAdmin(params: { status?: ComplaintStatus; page: number; limit: number }) {
    const res = await apiClient<ApiResponse<Paginated<Complaint>>>('/admin/complaints', { params });
    return res.data;
  },

  /** Admin chuyển trạng thái; đóng khiếu nại (RESOLVED / DISMISSED) cần ghi chú cho khách */
  async updateStatus(id: string, status: Exclude<ComplaintStatus, 'OPEN'>, resolutionNote?: string) {
    const res = await apiClient<ApiResponse<Complaint>>(`/admin/complaints/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(resolutionNote ? { status, resolution_note: resolutionNote } : { status }),
    });
    return res.data;
  },

  async listForHost(params: { status?: ComplaintStatus; page: number; limit: number }) {
    const res = await apiClient<ApiResponse<Paginated<Complaint>>>('/host/complaints', { params });
    return res.data;
  },
};
