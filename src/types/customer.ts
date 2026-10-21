export interface HomestayItem {
  id: string;
  name: string;
  city: string;
  district?: string;
  address: string;
  latitude: number;
  longitude: number;
  average_rating: number;
  total_reviews: number;
  is_claimed: number;
  cancellation_policy: string;
  source_url?: string;
  amenities_json?: Record<string, any>;
  rooms?: RoomItem[];
}

export interface RoomDetailsJson {
  badges?: string[];
  bed_rating_text?: string;
  bathroom_amenities?: string[];
  views?: string[];
  room_amenities?: string[];
  smoking_policy?: string;
  facilities_grouped?: Record<string, string[]>;
}

export interface RoomItem {
  id: string;
  homestay_id: string;
  room_name: string;
  capacity: number;
  base_price: number;
  bed_info?: string;
  area_sqm?: number;
  description?: string;
  room_details_json?: RoomDetailsJson;
  amenities?: string[];
  images?: RoomImageItem[];
}

export interface RoomImageItem {
  id: string;
  image_url: string;
  is_primary: number;
  sort_order: number;
}

export interface CustomerBooking {
  id: string;
  booking_code: string;
  room_name: string;
  homestay_name: string;
  check_in_date: string;
  check_out_date: string;
  num_guests: number;
  total_amount: number;
  status: 'PENDING_PAYMENT' | 'PAID_ESCROW' | 'CHECKED_IN' | 'COMPLETED' | 'CANCELLED';
  vnpay_url?: string;
  created_at: string;
}

export interface ReviewSubmission {
  booking_id: string;
  rating_overall: number;
  cleanliness_rating: number;
  service_rating: number;
  location_rating: number;
  comment: string;
  photos?: string[];
}

// =========================================================
// ĐẶT PHÒNG & THANH TOÁN (khớp API backend /bookings, /payments)
// =========================================================

export type BookingStatus =
  | 'PENDING_PAYMENT'
  | 'PAID_ESCROW'
  | 'CHECKED_IN'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'DISPUTED'
  | 'EXPIRED';

/** data của POST /bookings/quote */
export interface BookingQuote {
  available: boolean;
  unavailable_dates: string[];
  room_id: string;
  room_name: string;
  homestay: { id: string; name: string };
  check_in_date: string;
  check_out_date: string;
  nights: number;
  num_guests: number;
  nightly_prices: { date: string; price: number }[];
  room_subtotal: number;
  discount_amount: number;
  total_amount: number;
  cancellation_policy: string;
  is_dropship: boolean;
}

/** data của POST /bookings */
export interface CreatedBooking {
  id: string;
  booking_code: string;
  status: BookingStatus;
  room_name: string;
  homestay_name: string;
  check_in_date: string;
  check_out_date: string;
  nights: number;
  num_guests: number;
  total_amount: number;
  is_dropship: boolean;
  payment_deadline: string;
}

/** data của POST /bookings/:id/payment-url */
export interface PaymentLink {
  payment_id: string;
  booking_code: string;
  amount: number;
  payment_deadline: string;
  payment_url: string;
}

export interface OtaFulfillmentInfo {
  provider: 'BOOKING_COM';
  mode: 'SANDBOX' | 'PRODUCTION';
  api_spec: string;
  ota_booking_code: string;
  pnr_code: string;
  pin_code: string;
  status: 'CONFIRMED' | 'PENDING' | 'FAILED';
  hotel_name: string;
  hotel_address: string;
  hotel_source_url?: string | null;
  room_name: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  check_in_date: string;
  check_out_date: string;
  num_guests: number;
  payment_method_b2b: string;
  vcc_card_last4: string;
  retail_amount: number;
  wholesale_amount: number;
  profit_margin: number;
  fulfilled_at: string;
  notes: string;
}

/** data của GET /payments/:id */
export interface PaymentStatusInfo {
  id: string;
  booking_id: string;
  booking_code: string;
  booking_status: BookingStatus;
  amount: number;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  paid_at: string | null;
  is_dropship?: boolean;
  ota_fulfillment?: OtaFulfillmentInfo | null;
}

/** Một dòng của GET /users/me/bookings */
export interface MyBookingItem {
  id: string;
  booking_code: string;
  status: BookingStatus;
  is_dropship?: boolean;
  ota_fulfillment?: OtaFulfillmentInfo | null;
  homestay: { id: string; name: string; city: string };
  room: { id: string; room_name: string };
  check_in_date: string;
  check_out_date: string;
  total_amount: number;
  /** Hạn thanh toán, chỉ có khi đơn đang PENDING_PAYMENT */
  expires_at: string | null;
  created_at: string;
}

export interface Paginated<T> {
  items: T[];
  meta: { page: number; limit: number; total: number; total_pages: number };
}

/** data của GET /bookings/:id */
export interface BookingDetail {
  id: string;
  booking_code: string;
  status: BookingStatus;
  is_dropship: boolean;
  ota_fulfillment?: OtaFulfillmentInfo | null;
  homestay: { id: string; name: string; address: string; city: string; cancellation_policy: string };
  room: { id: string; room_name: string };
  check_in_date: string;
  check_out_date: string;
  nights: number;
  num_guests: number;
  customer_note: string | null;
  room_subtotal: number;
  discount_amount: number;
  total_amount: number;
  payment_deadline: string | null;
  payments: { id: string; amount: number; method: string; status: string; transaction_code: string | null; created_at: string }[];
  escrow_status: string | null;
  created_at: string;
}
