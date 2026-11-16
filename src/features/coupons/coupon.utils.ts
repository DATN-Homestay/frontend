import type { Coupon, CouponStatus } from "./coupon.types";

export const formatMoney = (value: number | string) =>
  `${Number(value).toLocaleString("vi-VN")}đ`;

export function couponStatus(coupon: Coupon, now = Date.now()): CouponStatus {
  if (!coupon.is_active) return "inactive";
  if (new Date(coupon.end_date).getTime() < now) return "expired";
  if (coupon.usage_limit !== null && coupon.used_count >= coupon.usage_limit)
    return "exhausted";
  if (new Date(coupon.start_date).getTime() > now) return "scheduled";
  return "active";
}

/** Match the server's whole-VND discount and minimum VNPay payment. */
export function estimateDiscount(
  coupon: {
    discount_type: string;
    discount_value: number;
    max_discount: number | null;
  },
  subtotal: number,
): number {
  let discount =
    coupon.discount_type === "PERCENTAGE"
      ? Math.floor((subtotal * coupon.discount_value) / 100)
      : Math.round(coupon.discount_value);
  if (coupon.discount_type === "PERCENTAGE" && coupon.max_discount !== null) {
    discount = Math.min(discount, Math.round(coupon.max_discount));
  }
  return Math.max(0, Math.min(discount, subtotal - 10_000));
}
