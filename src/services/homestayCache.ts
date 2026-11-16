import { customerService } from './customerService';
import type { HomestayItem } from '../types/customer';

const TTL_MS = 60_000;
let cached: { items: HomestayItem[]; at: number } | null = null;
let inflight: Promise<HomestayItem[]> | null = null;

/**
 * Toàn bộ homestay (trang chủ và trang kết quả lọc trên trình duyệt).
 * Giữ trong bộ nhớ 60 giây để đi Trang chủ → Tìm kiếm không tải lại; gọi trùng lúc dùng chung một request.
 */
export function loadAllHomestays(): Promise<HomestayItem[]> {
  if (cached && Date.now() - cached.at < TTL_MS) return Promise.resolve(cached.items);
  if (!inflight) {
    inflight = customerService
      .getHomestays()
      .then((res) => {
        const items = res.items ?? [];
        // Không lưu kết quả rỗng: getHomestays trả rỗng khi lỗi mạng, lần sau cần thử lại
        cached = items.length ? { items, at: Date.now() } : null;
        return items;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}
