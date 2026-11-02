/**
 * adminService.ts
 * Gọi trực tiếp API backend thật tại http://localhost:3000/api/v1/admin/*
 * Sử dụng apiClient (có tự refresh token + interceptor).
 *
 * Để dùng mock data (khi backend chưa chạy), import từ adminMock.ts thay thế.
 */
import { apiClient, type ApiResponse } from './apiClient';

// ====================== TYPES BACKEND RESPONSE ======================

export interface DashboardStats {
  users: { total: number };
  homestays: { total: number };
  bookings: {
    total: number;
    by_status: Record<string, number>;
  };
  revenue: {
    total_confirmed_vnd: number;
    platform_commission_vnd: number;
  };
  pending_actions: {
    payouts_waiting: number;
    claims_waiting: number;
  };
}

export interface PendingPayout {
  payout_id: string;
  host_id: string;
  host_name: string;
  total_booking_amount: number;
  platform_commission: number;
  actual_payout_amount: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  bank_account_number_decrypted: string | null;
  bank_account_name: string | null;
  bank_name: string | null;
  cccd_name_match: boolean;
  booking_id: string;
  created_at: string;
}

export interface PendingClaim {
  claim_id: string;
  host_id: string;
  host_name: string;
  homestay_id: string;
  homestay_name: string;
  trust_score: number;
  cccd_score: number;
  phone_otp_score: number;
  gps_score: number;
  live_vision_score: number;
  haversine_distance_m: number | null;
  vision_similarity: number | null;
  live_photo_url: string | null;
  submitted_at: string;
}

// ====================== DROPSHIP ORDER TYPE ======================

export interface DropshipOrder {
  booking_id: string;
  customer_name: string | null;
  homestay_name: string | null;
  check_in: string;
  check_out: string;
  total_amount: number;
  b2b_status: string;
  b2b_provider_booking_id: string | null;
  b2b_error_message: string | null;
  b2b_last_attempt_at: string | null;
  created_at: string;
}

// ====================== USER MANAGEMENT TYPES ======================

export interface AdminUserItem {
  id: string;
  email: string;
  full_name: string;
  phone_number: string | null;
  avatar_url: string | null;
  status: string;
  roles: string[];
  created_at: string;
}

export interface AdminUserDetail extends AdminUserItem {
  homestays_count: number;
  bookings_count: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface AdminListUsersQuery {
  page?: number;
  limit?: number;
  search?: string;
  sort_by?: string;
  sort_order?: 'ASC' | 'DESC';
  status?: string;
  role?: string;
}

export interface AdminCreateUserPayload {
  email: string;
  password: string;
  full_name: string;
  phone_number?: string;
  roles?: string[];
}

// ====================== HOST MANAGEMENT TYPES ======================

export interface AdminHostItem extends AdminUserItem {
  homestays_count: number;
  verification_status: string | null;
  verification_score: number | null;
}

export interface AdminHostDetail extends AdminUserItem {
  verification: {
    status: string;
    score: number;
    bank_name: string;
    bank_holder: string;
  } | null;
  homestays: {
    id: string;
    name: string;
    city: string;
    address: string;
    status: string;
    is_claimed: number;
    average_rating: number;
    total_reviews: number;
    rooms_count: number;
  }[];
  stats: {
    total_homestays: number;
    total_bookings: number;
    bookings_by_status: Record<string, number>;
    total_revenue_vnd: number;
  };
}

// ====================== HOMESTAY MANAGEMENT TYPES ======================

export interface AdminHomestayItem {
  id: string;
  name: string;
  address: string;
  city: string;
  status: string;
  is_claimed: number;
  average_rating: number;
  total_reviews: number;
  host_id: string | null;
  host_name: string | null;
  rooms_count: number;
  cover_image: string | null;
  created_at: string;
}

export interface AdminHomestayDetail {
  id: string;
  name: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  crawled_phone: string | null;
  source_url: string | null;
  is_claimed: number;
  status: string;
  cancellation_policy: string | null;
  average_rating: number;
  total_reviews: number;
  amenities_json: Record<string, any> | null;
  rules_json: Record<string, any> | null;
  host: {
    id: string;
    full_name: string;
    email: string;
    phone_number: string | null;
  } | null;
  rooms: {
    id: string;
    room_name: string;
    capacity: number;
    base_price: number;
    area_sqm: number;
    bed_info: string;
    images_count: number;
  }[];
  reviews_count: number;
  created_at: string;
  updated_at: string;
}

export interface AdminListHomestaysQuery {
  page?: number;
  limit?: number;
  search?: string;
  sort_by?: string;
  sort_order?: 'ASC' | 'DESC';
  status?: string;
  city?: string;
  is_claimed?: number;
  host_id?: string;
}

// ====================== ADMIN API FUNCTIONS (THẬT) ======================

export const adminService = {
  /** GET /admin/dashboard/stats — Số liệu tổng quan */
  getDashboardStats: () =>
    apiClient<ApiResponse<DashboardStats>>('/admin/dashboard/stats').then((r) => r.data),

  /** GET /admin/payouts/pending — Danh sách giải ngân chờ duyệt */
  getPendingPayouts: () =>
    apiClient<ApiResponse<PendingPayout[]>>('/admin/payouts/pending').then((r) => r.data),

  /** POST /admin/payouts/:id/approve */
  approvePayout: (payoutId: string, receiptImageUrl: string) =>
    apiClient<ApiResponse<any>>(`/admin/payouts/${payoutId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ receipt_image_url: receiptImageUrl }),
    }).then((r) => r.data),

  /** POST /admin/payouts/:id/reject */
  rejectPayout: (payoutId: string, reason: string) =>
    apiClient<ApiResponse<any>>(`/admin/payouts/${payoutId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }).then((r) => r.data),

  /** GET /admin/claims/pending — Danh sách KYC chờ Admin duyệt thủ công */
  getPendingClaims: () =>
    apiClient<ApiResponse<PendingClaim[]>>('/admin/claims/pending').then((r) => r.data),

  /** POST /admin/claims/:id/approve */
  approveClaim: (claimId: string) =>
    apiClient<ApiResponse<any>>(`/admin/claims/${claimId}/approve`, {
      method: 'POST',
    }).then((r) => r.data),

  /** POST /admin/claims/:id/reject */
  rejectClaim: (claimId: string, rejectionReason: string) =>
    apiClient<ApiResponse<any>>(`/admin/claims/${claimId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ rejection_reason: rejectionReason }),
    }).then((r) => r.data),

  /** POST /admin/sync/rapidapi-market-data */
  syncMarketData: (city: string, forecastDays: number = 14) =>
    apiClient<ApiResponse<any>>('/admin/sync/rapidapi-market-data', {
      method: 'POST',
      body: JSON.stringify({ city, forecast_days: forecastDays }),
    }).then((r) => r.data),

  /** POST /admin/sync/crawl-booking-homestays */
  crawlBookingHomestays: (city: string, limit: number = 10) =>
    apiClient<ApiResponse<any>>('/admin/sync/crawl-booking-homestays', {
      method: 'POST',
      body: JSON.stringify({ city, limit }),
    }).then((r) => r.data),

  /** GET /admin/dropship/orders — Danh sách đơn dropship B2B */
  getDropshipOrders: () =>
    apiClient<ApiResponse<DropshipOrder[]>>('/admin/dropship/orders').then((r) => r.data),

  /** POST /admin/dropship/retry/:id — Thử lại đặt phòng B2B */
  retryDropshipOrder: (bookingId: string) =>
    apiClient<ApiResponse<any>>(`/admin/dropship/retry/${bookingId}`, {
      method: 'POST',
    }).then((r) => r.data),

  // ====================== USER MANAGEMENT ======================

  /** GET /admin/users — Danh sách người dùng */
  listUsers: (query: AdminListUsersQuery = {}) =>
    apiClient<ApiResponse<PaginatedResponse<AdminUserItem>>>('/admin/users', {
      params: query as Record<string, string | number | undefined>,
    }).then((r) => r.data),

  /** GET /admin/users/:id — Chi tiết người dùng */
  getUserDetail: (userId: string) =>
    apiClient<ApiResponse<AdminUserDetail>>(`/admin/users/${userId}`).then((r) => r.data),

  /** POST /admin/users — Tạo user mới */
  createUser: (payload: AdminCreateUserPayload) =>
    apiClient<ApiResponse<AdminUserItem>>('/admin/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    }).then((r) => r.data),

  /** PATCH /admin/users/:id/status — Cập nhật trạng thái user */
  updateUserStatus: (userId: string, status: string, reason?: string) =>
    apiClient<ApiResponse<any>>(`/admin/users/${userId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, reason }),
    }).then((r) => r.data),

  /** PATCH /admin/users/:id/roles — Cập nhật role user */
  updateUserRoles: (userId: string, roles: string[]) =>
    apiClient<ApiResponse<any>>(`/admin/users/${userId}/roles`, {
      method: 'PATCH',
      body: JSON.stringify({ roles }),
    }).then((r) => r.data),

  /** DELETE /admin/users/:id — Xóa user */
  deleteUser: (userId: string) =>
    apiClient<ApiResponse<any>>(`/admin/users/${userId}`, {
      method: 'DELETE',
    }).then((r) => r.data),

  // ====================== HOST MANAGEMENT ======================

  /** GET /admin/hosts — Danh sách host */
  listHosts: (query: AdminListUsersQuery = {}) =>
    apiClient<ApiResponse<PaginatedResponse<AdminHostItem>>>('/admin/hosts', {
      params: query as Record<string, string | number | undefined>,
    }).then((r) => r.data),

  /** GET /admin/hosts/:id — Chi tiết host */
  getHostDetail: (hostId: string) =>
    apiClient<ApiResponse<AdminHostDetail>>(`/admin/hosts/${hostId}`).then((r) => r.data),

  // ====================== HOMESTAY MANAGEMENT ======================

  /** GET /admin/homestays — Danh sách homestay */
  listHomestays: (query: AdminListHomestaysQuery = {}) =>
    apiClient<ApiResponse<PaginatedResponse<AdminHomestayItem>>>('/admin/homestays', {
      params: query as Record<string, string | number | undefined>,
    }).then((r) => r.data),

  /** GET /admin/homestays/:id — Chi tiết homestay */
  getHomestayDetail: (homestayId: string) =>
    apiClient<ApiResponse<AdminHomestayDetail>>(`/admin/homestays/${homestayId}`).then((r) => r.data),

  /** PATCH /admin/homestays/:id/status — Cập nhật trạng thái */
  updateHomestayStatus: (homestayId: string, status: string, reason?: string) =>
    apiClient<ApiResponse<any>>(`/admin/homestays/${homestayId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, reason }),
    }).then((r) => r.data),

  /** PATCH /admin/homestays/:id — Cập nhật thông tin */
  updateHomestay: (homestayId: string, payload: Record<string, any>) =>
    apiClient<ApiResponse<any>>(`/admin/homestays/${homestayId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }).then((r) => r.data),

  /** POST /admin/homestays/:id/assign-host — Gán host */
  assignHostToHomestay: (homestayId: string, hostId: string) =>
    apiClient<ApiResponse<any>>(`/admin/homestays/${homestayId}/assign-host`, {
      method: 'POST',
      body: JSON.stringify({ host_id: hostId }),
    }).then((r) => r.data),

  /** DELETE /admin/homestays/:id — Xóa homestay */
  deleteHomestay: (homestayId: string) =>
    apiClient<ApiResponse<any>>(`/admin/homestays/${homestayId}`, {
      method: 'DELETE',
    }).then((r) => r.data),
};
