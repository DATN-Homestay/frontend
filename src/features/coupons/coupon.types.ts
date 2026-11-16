export type DiscountType = "PERCENTAGE" | "FIXED_AMOUNT";
export type CouponStatus =
  "active" | "scheduled" | "expired" | "exhausted" | "inactive";

export interface Coupon {
  id: string;
  code: string;
  name: string | null;
  created_by_role: "HOST" | "ADMIN";
  host_id: string | null;
  sponsor_by: "HOST" | "PLATFORM";
  discount_type: DiscountType;
  discount_value: number | string;
  min_order_value: number | string;
  max_discount: number | string | null;
  usage_limit: number | null;
  used_count: number;
  per_user_limit: number;
  is_active: number;
  target_audience: "ALL" | "LOYALTY";
  loyalty_condition_type: "OR" | "AND";
  min_completed_bookings: number | null;
  min_total_spent: number | string | null;
  start_date: string;
  end_date: string;
  created_at: string;
}

export interface CouponPayload {
  code: string;
  name?: string;
  discount_type: DiscountType;
  discount_value: number;
  min_order_value: number;
  max_discount?: number | null;
  usage_limit?: number | null;
  per_user_limit: number;
  start_date: string;
  end_date: string;
  target_audience: "ALL" | "LOYALTY";
  loyalty_condition_type: "OR" | "AND";
  min_completed_bookings?: number | null;
  min_total_spent?: number | null;
}

export type CouponUpdate = Partial<Omit<CouponPayload, "code">> & {
  is_active?: 0 | 1;
};
