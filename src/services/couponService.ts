import { apiClient, type ApiResponse } from "./apiClient";
import type {
  Coupon,
  CouponPayload,
  CouponUpdate,
} from "../features/coupons/coupon.types";

type CouponResponse<T> = ApiResponse<T | ApiResponse<T>>;

/** Coupon controllers already return an envelope; the global interceptor wraps it again. */
function readCouponData<T>(response: CouponResponse<T>): T {
  const data = response.data;
  if (
    data &&
    typeof data === "object" &&
    "statusCode" in data &&
    "data" in data
  ) {
    return (data as ApiResponse<T>).data;
  }
  return data as T;
}

const invalidResponse = () =>
  new Error("Dữ liệu mã giảm giá từ máy chủ không hợp lệ. Vui lòng thử lại.");

export const couponService = {
  async list(role: "host" | "admin"): Promise<Coupon[]> {
    if (role === "host") {
      const res = await apiClient<CouponResponse<Coupon[]>>("/host/coupons");
      const coupons = readCouponData(res);
      if (!Array.isArray(coupons)) throw invalidResponse();
      return coupons;
    }
    // Admin API is paginated; fetch every page so filters and counts stay accurate.
    const items: Coupon[] = [];
    let page = 1;
    let total: number;
    do {
      const res = await apiClient<
        CouponResponse<{ items: Coupon[]; total: number }>
      >("/admin/coupons", {
        params: { page, limit: 100 },
      });
      const data = readCouponData(res);
      if (
        !data ||
        !Array.isArray(data.items) ||
        !Number.isInteger(data.total) ||
        data.total < 0
      ) {
        throw invalidResponse();
      }
      items.push(...data.items);
      total = data.total;
      if (!data.items.length) break;
      page += 1;
    } while (items.length < total);
    return items;
  },

  async create(
    role: "host" | "admin",
    payload: CouponPayload,
  ): Promise<Coupon> {
    const res = await apiClient<CouponResponse<Coupon>>(`/${role}/coupons`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return readCouponData(res);
  },

  async update(
    role: "host" | "admin",
    id: string,
    payload: CouponUpdate,
  ): Promise<Coupon> {
    const res = await apiClient<CouponResponse<Coupon>>(
      `/${role}/coupons/${id}`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
    );
    return readCouponData(res);
  },

  async deactivate(id: string): Promise<void> {
    await apiClient(`/admin/coupons/${id}/deactivate`, { method: "POST" });
  },

  async remove(id: string): Promise<{ message: string; deactivated: boolean }> {
    const res = await apiClient<
      CouponResponse<{ message: string; deactivated: boolean }>
    >(`/host/coupons/${id}`, {
      method: "DELETE",
    });
    return readCouponData(res);
  },
};
