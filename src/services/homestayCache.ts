import { customerService } from './customerService';
import type { HomestayItem } from '../types/customer';

const TTL_MS = 60_000;
const CATALOG_PAGE_SIZE = 100;
const PAGE_CONCURRENCY = 4;
let cached: { items: HomestayItem[]; at: number } | null = null;
let inflight: Promise<HomestayItem[]> | null = null;

/**
 * Danh sách tìm kiếm đầy đủ, kèm dữ liệu tiện nghi. Trang chủ dùng catalog phân trang riêng.
 * Giữ trong bộ nhớ 60 giây; các lần gọi đồng thời dùng chung một lượt tải.
 */
export function loadAllHomestays(): Promise<HomestayItem[]> {
  if (cached && Date.now() - cached.at < TTL_MS) return Promise.resolve(cached.items);
  if (!inflight) {
    inflight = (async () => {
      const fetchPage = (offset: number) => customerService.getHomestays(undefined, CATALOG_PAGE_SIZE, offset, { view: 'search' });
      const first = await fetchPage(0);
      const items = [...first.items];
      // Keep requests bounded while loading every page before computing filter counts.
      for (let offset = CATALOG_PAGE_SIZE; offset < first.total; offset += CATALOG_PAGE_SIZE * PAGE_CONCURRENCY) {
        const offsets = Array.from({ length: PAGE_CONCURRENCY }, (_, index) => offset + index * CATALOG_PAGE_SIZE)
          .filter((pageOffset) => pageOffset < first.total);
        const pages = await Promise.all(offsets.map(fetchPage));
        for (const page of pages) items.push(...page.items);
      }
      const uniqueItems = [...new Map(items.map((item) => [item.id, item])).values()];
      cached = uniqueItems.length ? { items: uniqueItems, at: Date.now() } : null;
      return uniqueItems;
    })()
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}
