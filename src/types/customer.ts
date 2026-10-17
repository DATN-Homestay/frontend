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
  amenities_json?: Record<string, any>;
  rooms?: RoomItem[];
}

export interface RoomItem {
  id: string;
  homestay_id: string;
  room_name: string;
  capacity: number;
  base_price: number;
  bed_info?: string;
  area_sqm?: number;
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
