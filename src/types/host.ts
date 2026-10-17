import type { HomestayItem, RoomItem } from './customer';

export interface HostHomestay extends HomestayItem {
  host_id: string;
  status: 'DRAFT' | 'PENDING_VERIFICATION' | 'ACTIVE' | 'BANNED';
  created_at: string;
}

export interface PriceCalendarDay {
  id?: string;
  room_id: string;
  date: string;
  price: number;
  is_available: number;
  ai_suggested_price?: number;
  comp_set_avg_price?: number;
  comp_set_occupancy_rate?: number;
  is_ai_applied?: number;
  locked_until?: string | null;
}

export interface PricingSuggestion {
  homestay_id: number;
  date: string;
  base_price: number;
  suggested_price: number;
  change_percentage: number;
  comp_set_stats: {
    compset_size: number;
    market_avg_price: number;
    occupancy_rate: number;
  };
  ai_explanation: string;
  cache_status: 'CACHE_HIT' | 'CACHE_MISS';
}

export interface VerificationStatusResponse {
  has_started: boolean;
  claim_id?: string;
  homestay_id?: string;
  total_score: number;
  status: 'SUBMITTED' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'NOT_STARTED';
  rejection_reason?: string;
  steps: {
    cccd: { verified: boolean; score: number; bank_name?: string };
    otp: { verified: boolean; score: number };
    gps: { verified: boolean; score: number; distance_meters?: number };
    live_image: { verified: boolean; score: number; cosine_similarity?: number; photo_url?: string };
  };
}

export interface HostBookingItem {
  id: string;
  booking_code: string;
  customer?: { id: string; full_name: string; email: string; phone_number?: string };
  room?: RoomItem & { homestay?: HomestayItem };
  check_in_date: string;
  check_out_date: string;
  num_guests: number;
  total_amount: number;
  status: 'PENDING_PAYMENT' | 'PAID_ESCROW' | 'CHECKED_IN' | 'COMPLETED' | 'CANCELLED';
  escrow?: { release_due_at: string; status: string };
  created_at: string;
}

export interface HostBalanceInfo {
  available_gross: number;
  commission_rate: number;
  platform_commission: number;
  available_net_payout: number;
  pending_payout_amount: number;
  total_paid_out: number;
  eligible_bookings_count: number;
  eligible_bookings: Array<{
    id: string;
    booking_code: string;
    room_name: string;
    homestay_name: string;
    total_amount: number;
    check_out_date: string;
  }>;
}
