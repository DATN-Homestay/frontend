import type { HomestayItem, RoomItem } from '../types/customer';

export const DEFAULT_HOMESTAY_COVER =
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1000&auto=format&fit=crop&q=80';

/**
 * Lấy ảnh bìa đại diện duy nhất, nhất quán 100% giữa Homepage và HomestayDetail.
 * Quy tắc ưu tiên:
 * 1. amenities_json.main_image_url (nếu có từ crawler)
 * 2. Phòng có id nhỏ nhất (sắp xếp tăng dần theo ID) -> lấy ảnh có is_primary = 1 hoặc sort_order = 0
 * 3. Bất kỳ phòng nào có ảnh hợp lệ
 * 4. Fallback default cover
 */
export function getHomestayCoverImage(homestay?: HomestayItem | any): string {
  if (!homestay) return DEFAULT_HOMESTAY_COVER;

  // 1. Ảnh chính từ Booking.com được lưu trong amenities_json
  if (homestay.amenities_json?.main_image_url) {
    return homestay.amenities_json.main_image_url;
  }

  const rooms: RoomItem[] = homestay.rooms || [];
  if (rooms.length === 0) return DEFAULT_HOMESTAY_COVER;

  // Sắp xếp phòng theo ID tăng dần để đảm bảo kết quả luôn cố định tuyệt đối (deterministic)
  const sortedRooms = [...rooms].sort((a, b) => Number(a.id) - Number(b.id));

  // Tìm phòng đầu tiên có ảnh
  for (const r of sortedRooms) {
    if (r.images && r.images.length > 0) {
      // Sắp xếp ảnh: is_primary = 1 lên trước, sau đó sort_order ASC
      const sortedImgs = [...r.images].sort(
        (a, b) =>
          (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0) ||
          Number(a.sort_order || 0) - Number(b.sort_order || 0),
      );
      const url = sortedImgs[0]?.image_url;
      if (url && typeof url === 'string' && url.trim().length > 0) {
        return url;
      }
    }
  }

  return DEFAULT_HOMESTAY_COVER;
}

/**
 * Trích xuất toàn bộ danh sách ảnh thật của homestay từ tất cả các phòng
 * Luôn đưa ảnh bìa đại diện lên đầu tiên (index 0)
 */
export function getAllHomestayImages(homestay?: HomestayItem | any, activeCover?: string): string[] {
  const list: string[] = [];
  const cover = activeCover || getHomestayCoverImage(homestay);
  if (cover && !cover.includes('unsplash')) {
    list.push(cover);
  }

  if (
    homestay?.amenities_json?.property_images &&
    Array.isArray(homestay.amenities_json.property_images)
  ) {
    for (const img of homestay.amenities_json.property_images) {
      if (img && !list.includes(img)) {
        list.push(img);
      }
    }
  }

  const rooms: RoomItem[] = homestay?.rooms || [];
  const sortedRooms = [...rooms].sort((a, b) => Number(a.id) - Number(b.id));

  for (const r of sortedRooms) {
    if (r.images && r.images.length > 0) {
      const sortedImgs = [...r.images].sort(
        (a, b) =>
          (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0) ||
          Number(a.sort_order || 0) - Number(b.sort_order || 0),
      );
      for (const img of sortedImgs) {
        if (img.image_url && !list.includes(img.image_url)) {
          list.push(img.image_url);
        }
      }
    }
  }

  return list.length > 0 ? list : [cover];
}
